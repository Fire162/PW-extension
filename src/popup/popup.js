/**
 * Extension Popup Dashboard JavaScript
 */
(function () {
  'use strict';

  let currentTabUrl = '';

  function formatTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function init() {
    // Load preferences
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['autoTimerOnPause', 'autoSkipSilence'], result => {
        const toggleTimer = document.getElementById('auto-timer-toggle');
        if (toggleTimer) toggleTimer.checked = !!result.autoTimerOnPause;

        const toggleSilence = document.getElementById('auto-silence-toggle');
        if (toggleSilence) toggleSilence.checked = !!result.autoSkipSilence;
      });
    }

    // Handle Toggle Switches
    document.getElementById('auto-timer-toggle')?.addEventListener('change', e => {
      const isChecked = e.target.checked;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ autoTimerOnPause: isChecked });
      }
    });

    document.getElementById('auto-silence-toggle')?.addEventListener('change', e => {
      const isChecked = e.target.checked;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ autoSkipSilence: isChecked });
      }
    });

    // Get Active Tab URL and Load Stats
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs && tabs[0] && tabs[0].url) {
          currentTabUrl = tabs[0].url.split('#')[0];
        }
        loadAllSessions();
      });
    } else {
      currentTabUrl = window.location.href.split('#')[0];
      loadAllSessions();
    }

    // Button Events
    document.getElementById('btn-copy-stats')?.addEventListener('click', copyCurrentStats);
    document.getElementById('btn-clear-current')?.addEventListener('click', clearCurrentSession);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
  }

  function loadAllSessions() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(null, items => {
      const sessions = [];
      let activeSession = null;

      Object.keys(items).forEach(key => {
        if (key.startsWith('qt_log_')) {
          const data = items[key];
          if (data && data.url) {
            sessions.push(data);
            const cleanDataUrl = data.url.split('#')[0];
            if (currentTabUrl && cleanDataUrl === currentTabUrl) {
              activeSession = data;
            }
          }
        }
      });

      // Update Current Session Stats
      if (activeSession) {
        const logs = activeSession.logs || [];
        const qCount = logs.length + (activeSession.elapsedTime > 0 || activeSession.isRunning ? 1 : 0);
        let totalSec = logs.reduce((acc, l) => acc + l.durationSec, 0);
        if (activeSession.elapsedTime) totalSec += Math.floor(activeSession.elapsedTime / 1000);

        document.getElementById('stat-qcount').innerText = qCount;
        document.getElementById('stat-totaltime').innerText = formatTime(totalSec);
      } else {
        document.getElementById('stat-qcount').innerText = '0';
        document.getElementById('stat-totaltime').innerText = '00:00';
      }

      // Populate Session History List
      const historyContainer = document.getElementById('history-list');
      if (!historyContainer) return;

      if (sessions.length === 0) {
        historyContainer.innerHTML = `<div style="text-align: center; color: #94A3B8; font-size: 11px; padding: 12px;">No recorded video sessions yet.</div>`;
        return;
      }

      sessions.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

      historyContainer.innerHTML = sessions
        .map(s => {
          const logs = s.logs || [];
          let totalSec = logs.reduce((acc, l) => acc + l.durationSec, 0);
          if (s.elapsedTime) totalSec += Math.floor(s.elapsedTime / 1000);

          let displayUrl = s.url;
          try {
            const parsed = new URL(s.url);
            displayUrl = parsed.hostname + parsed.pathname;
          } catch (e) {}

          return `
          <div class="history-item">
            <span class="history-url" title="${s.url}">${displayUrl}</span>
            <div class="history-meta">
              <span>${logs.length} Questions Logged</span>
              <strong>${formatTime(totalSec)}</strong>
            </div>
          </div>
        `;
        })
        .join('');
    });
  }

  function copyCurrentStats() {
    if (!currentTabUrl) return;
    const key = 'qt_log_' + encodeURIComponent(currentTabUrl);

    chrome.storage.local.get([key], result => {
      const s = result[key];
      if (!s) {
        alert('No question logs recorded for current page yet.');
        return;
      }

      const logs = s.logs || [];
      const currentSec = Math.floor((s.elapsedTime || 0) / 1000);
      const totalSec = logs.reduce((acc, l) => acc + l.durationSec, 0) + currentSec;

      let lines = [`📋 Question Time Summary (${s.url})`];
      logs.forEach(l => {
        lines.push(`Question ${l.qNum}: ${l.timeFormatted}`);
      });
      if (currentSec > 0 || s.isRunning) {
        lines.push(`Question ${s.currentQuestionNum || (logs.length + 1)} (Current): ${formatTime(currentSec)}`);
      }
      lines.push(`Total Time: ${formatTime(totalSec)}`);

      navigator.clipboard.writeText(lines.join('\n')).then(() => {
        const btn = document.getElementById('btn-copy-stats');
        if (btn) {
          const orig = btn.innerText;
          btn.innerText = '✅ Copied!';
          setTimeout(() => { btn.innerText = orig; }, 1500);
        }
      });
    });
  }

  function clearCurrentSession() {
    if (!currentTabUrl) return;
    const key = 'qt_log_' + encodeURIComponent(currentTabUrl);

    if (confirm('Are you sure you want to clear logs for the current video?')) {
      chrome.storage.local.remove([key], () => {
        loadAllSessions();
      });
    }
  }

  function exportCSV() {
    chrome.storage.local.get(null, items => {
      const rows = [['Video URL', 'Question Number', 'Duration (Seconds)', 'Formatted Time', 'Last Updated']];

      Object.keys(items).forEach(key => {
        if (key.startsWith('qt_log_')) {
          const s = items[key];
          if (s && s.logs) {
            const dateStr = s.lastUpdated ? new Date(s.lastUpdated).toISOString() : '';
            s.logs.forEach(l => {
              rows.push([
                `"${s.url}"`,
                l.qNum,
                l.durationSec,
                `"${l.timeFormatted}"`,
                `"${dateStr}"`
              ]);
            });
          }
        }
      });

      if (rows.length === 1) {
        alert('No study session history available to export.');
        return;
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `question_study_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
