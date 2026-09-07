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

  function formatHoursMinutes(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '0h 0m';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }

  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function updateBenchmarkButtons(targetSec) {
    document.querySelectorAll('.bm-btn').forEach(btn => {
      if (Number(btn.dataset.sec) === targetSec) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateGoalButtons(goalHours) {
    document.querySelectorAll('.goal-btn').forEach(btn => {
      if (Number(btn.dataset.goal) === goalHours) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function formatMinutesSeconds(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '0m 0s';
    if (totalSeconds >= 3600) {
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      return `${hrs}h ${mins}m`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}m ${secs}s`;
  }

  function loadStudyTrackerData() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['studyTrackerData', 'totalSilenceTimeSavedSec'], result => {
      const trackerData = result.studyTrackerData || { dailyGoalHours: 6.0, streakDays: 0, history: {} };
      const today = getTodayString();
      const dayData = (trackerData.history && trackerData.history[today]) || { realSec: 0, coverageSec: 0 };

      const goalHours = trackerData.dailyGoalHours || 6.0;
      updateGoalButtons(goalHours);

      const realHours = dayData.realSec / 3600;
      const coverageHours = dayData.coverageSec / 3600;
      const percent = Math.min(100, Math.round((realHours / goalHours) * 100));

      const silenceSavedSec = result.totalSilenceTimeSavedSec || trackerData.totalSilenceTimeSavedSec || 0;

      document.getElementById('stat-real-time').innerText = formatHoursMinutes(dayData.realSec);
      document.getElementById('stat-coverage-time').innerText = formatHoursMinutes(dayData.coverageSec);

      const silenceEl = document.getElementById('stat-silence-saved');
      if (silenceEl) silenceEl.innerText = formatMinutesSeconds(silenceSavedSec);

      document.getElementById('study-progress-text').innerText = `${realHours.toFixed(1)} / ${goalHours.toFixed(1)} hrs Today (${percent}%)`;

      const fillEl = document.getElementById('study-progress-fill');
      if (fillEl) fillEl.style.width = `${percent}%`;

      const streakEl = document.getElementById('streak-badge');
      if (streakEl) streakEl.innerText = `🔥 ${trackerData.streakDays || 0}-Day Streak`;
    });
  }

  function init() {
    // Load preferences
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['autoTimerOnPause', 'autoSkipSilence', 'targetBenchmarkSec', 'focusMode', 'quickNotesEnabled'], result => {
        const toggleTimer = document.getElementById('auto-timer-toggle');
        if (toggleTimer) toggleTimer.checked = !!result.autoTimerOnPause;

        const toggleSilence = document.getElementById('auto-silence-toggle');
        if (toggleSilence) toggleSilence.checked = !!result.autoSkipSilence;

        const toggleFocus = document.getElementById('focus-mode-toggle');
        if (toggleFocus) toggleFocus.checked = !!result.focusMode;

        const toggleNotes = document.getElementById('quick-notes-toggle');
        if (toggleNotes) toggleNotes.checked = !!result.quickNotesEnabled;

        const targetSec = Number(result.targetBenchmarkSec) || 0;
        updateBenchmarkButtons(targetSec);
      });
    }

    // Benchmark Buttons Event Listeners
    document.querySelectorAll('.bm-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const sec = Number(e.target.dataset.sec) || 0;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ targetBenchmarkSec: sec }, () => {
            updateBenchmarkButtons(sec);
          });
        }
      });
    });

    // Goal Buttons Event Listeners
    document.querySelectorAll('.goal-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const goalHours = Number(e.target.dataset.goal) || 6.0;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['studyTrackerData'], result => {
            const trackerData = result.studyTrackerData || {};
            trackerData.dailyGoalHours = goalHours;
            chrome.storage.local.set({ studyTrackerData: trackerData }, () => {
              loadStudyTrackerData();
            });
          });
        }
      });
    });

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

    document.getElementById('focus-mode-toggle')?.addEventListener('change', e => {
      const isChecked = e.target.checked;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ focusMode: isChecked });
      }
    });

    document.getElementById('quick-notes-toggle')?.addEventListener('change', e => {
      const isChecked = e.target.checked;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ quickNotesEnabled: isChecked });
      }
    });

    // Get Active Tab URL and Load Stats
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs && tabs[0] && tabs[0].url) {
          currentTabUrl = tabs[0].url.split('#')[0];
        }
        loadAllSessions();
        loadStudyTrackerData();
      });
    } else {
      currentTabUrl = window.location.href.split('#')[0];
      loadAllSessions();
      loadStudyTrackerData();
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

  function isNewerVersion(remote, local) {
    const r = (remote || '').split('.').map(n => parseInt(n, 10) || 0);
    const l = (local || '').split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(r.length, l.length);
    for (let i = 0; i < len; i++) {
      const numR = r[i] || 0;
      const numL = l[i] || 0;
      if (numR > numL) return true;
      if (numR < numL) return false;
    }
    return false;
  }

  function checkExtensionUpdates(manual = false) {
    const currentVer = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '2.1.5';
    const verEl = document.getElementById('current-version');
    if (verEl) verEl.innerText = `v${currentVer}`;

    const updateBanner = document.getElementById('update-banner');
    const updateVerTag = document.getElementById('update-version');

    if (manual && verEl) {
      verEl.innerText = 'Checking...';
    }

    fetch('https://raw.githubusercontent.com/Fire162/PW-extension/main/manifest.json', { cache: 'no-cache' })
      .then(res => {
        if (!res.ok) throw new Error('Network error fetching manifest');
        return res.json();
      })
      .then(remoteManifest => {
        const remoteVer = remoteManifest?.version;
        if (remoteVer && isNewerVersion(remoteVer, currentVer)) {
          if (updateBanner) updateBanner.style.display = 'flex';
          if (updateVerTag) updateVerTag.innerText = `v${remoteVer}`;
          if (verEl) {
            verEl.innerText = `v${currentVer} (Update: v${remoteVer})`;
            verEl.style.borderColor = '#38BDF8';
            verEl.style.color = '#38BDF8';
          }
        } else {
          if (updateBanner) updateBanner.style.display = 'none';
          if (verEl) verEl.innerText = `v${currentVer}`;
          if (manual) {
            alert(`You are up to date! (v${currentVer})`);
          }
        }
      })
      .catch(err => {
        console.warn('Update check failed:', err);
        if (verEl) verEl.innerText = `v${currentVer}`;
        if (manual) {
          alert('Could not connect to GitHub to check updates. Please check your internet connection.');
        }
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    checkExtensionUpdates(false);

    document.getElementById('current-version')?.addEventListener('click', () => {
      checkExtensionUpdates(true);
    });

    document.getElementById('btn-dismiss-update')?.addEventListener('click', () => {
      const banner = document.getElementById('update-banner');
      if (banner) banner.style.display = 'none';
    });
  });
})();
