/**
 * QuestionTimer - Interactive Time Watcher / Stopwatch for tracking time spent on questions.
 * Features:
 * - Frosted Liquid Glass Water Styling
 * - Draggable HUD position
 * - Minimizable & Hideable HUD
 * - Click-Through Mode (passes click events directly to underlying video content)
 * - Persistent per-URL storage
 *
 * Controls:
 * - T: Toggle Start / Pause / Resume timer
 * - Shift + T: Log current question & start timer for next question (Lap)
 * - Alt + T: Open / Close Question Log Summary Modal
 * - Alt + C: Toggle Click-Through Mode (clicks pass to video behind)
 * - Shift + H: Toggle Minimize/Expand Stopwatch Overlay
 * - Alt + Shift + T: Reset stopwatch & clear question history for current URL
 */
(function () {
  'use strict';

  let isRunning = false;
  let startTime = 0;
  let elapsedTime = 0;
  let timerInterval = null;
  let currentQuestionNum = 1;
  let logs = []; // [{ qNum: 1, durationSec: 165, timeFormatted: "02:45" }]

  // UI state
  let isMinimized = false;
  let isHidden = false;
  let isClickThrough = false;
  let posLeft = null;
  let posTop = null;

  let hudEl = null;
  let modalEl = null;

  function getStorageKey() {
    const cleanUrl = window.location.href.split('#')[0];
    return 'qt_log_' + encodeURIComponent(cleanUrl);
  }

  function saveToStorage() {
    const key = getStorageKey();
    const data = {
      url: window.location.href,
      currentQuestionNum,
      elapsedTime,
      isRunning,
      startTime,
      logs,
      isMinimized,
      isHidden,
      isClickThrough,
      posLeft,
      posTop,
      lastUpdated: Date.now()
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: data });
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn('QuestionTimer: Storage save failed', e);
      }
    }
  }

  function loadFromStorage(callback) {
    const key = getStorageKey();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([key], result => {
        if (result && result[key]) {
          restoreState(result[key]);
        }
        if (callback) callback();
      });
    } else {
      try {
        const raw = localStorage.getItem(key);
        if (raw) restoreState(JSON.parse(raw));
      } catch (e) {
        console.warn('QuestionTimer: Storage load failed', e);
      }
      if (callback) callback();
    }
  }

  function restoreState(saved) {
    if (!saved) return;

    logs = saved.logs || [];
    currentQuestionNum = saved.currentQuestionNum || (logs.length + 1);
    elapsedTime = saved.elapsedTime || 0;
    isRunning = saved.isRunning || false;
    startTime = saved.startTime || 0;
    isMinimized = saved.isMinimized || false;
    isHidden = saved.isHidden || false;
    isClickThrough = saved.isClickThrough || false;
    posLeft = saved.posLeft || null;
    posTop = saved.posTop || null;

    if (isRunning && startTime > 0) {
      elapsedTime += Date.now() - startTime;
      startTime = Date.now();
    }

    if (logs.length > 0 || elapsedTime > 0 || isRunning) {
      createHUD();
      if (isHidden) hudEl.style.display = 'none';
      else hudEl.style.display = 'flex';

      applyHUDState();
      updateHUDDisplay();

      if (isRunning) {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          updateHUDDisplay();
          saveToStorage();
        }, 1000);
      }
    }
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getActiveSeconds() {
    if (!isRunning) return Math.floor(elapsedTime / 1000);
    return Math.floor((elapsedTime + (Date.now() - startTime)) / 1000);
  }

  function makeDraggable(el, handle) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    handle.addEventListener('mousedown', e => {
      if (e.target.classList.contains('qt-action-btn')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = el.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      el.style.bottom = 'auto';
      el.style.right = 'auto';
      el.style.left = `${initialLeft}px`;
      el.style.top = `${initialTop}px`;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      posLeft = `${Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, initialLeft + dx))}px`;
      posTop = `${Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 10, initialTop + dy))}px`;

      el.style.left = posLeft;
      el.style.top = posTop;
    }

    function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      saveToStorage();
    }
  }

  function createHUD() {
    if (hudEl) return;

    hudEl = document.createElement('div');
    hudEl.id = 'question-timer-hud';
    hudEl.style.display = 'none';

    hudEl.innerHTML = `
      <div class="qt-header" id="qt-drag-handle">
        <span id="qt-qname">⏱️ Q1</span>
        <div class="qt-header-actions">
          <button class="qt-action-btn" id="qt-clickthrough-btn" title="Toggle Click-Through Mode (pass clicks to video)">🎯</button>
          <button class="qt-action-btn" id="qt-min-btn" title="Minimize / Expand">_</button>
          <button class="qt-action-btn" id="qt-hide-btn" title="Hide Overlay (Shift+H)">✕</button>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
        <div class="qt-time-display" id="qt-time-text">00:00</div>
        <span id="qt-status-badge" style="font-size:10px; font-weight:700;">RUNNING</span>
      </div>
      <div class="qt-controls-hint">
        [T] Pause/Resume &nbsp;|&nbsp; [Shift+T] Next Q &nbsp;|&nbsp; [Alt+T] Logs
      </div>
    `;

    document.body.appendChild(hudEl);

    const dragHandle = hudEl.querySelector('#qt-drag-handle');
    makeDraggable(hudEl, dragHandle);

    hudEl.querySelector('#qt-min-btn')?.addEventListener('click', () => {
      toggleMinimize();
    });

    hudEl.querySelector('#qt-hide-btn')?.addEventListener('click', () => {
      toggleHide();
    });

    hudEl.querySelector('#qt-clickthrough-btn')?.addEventListener('click', () => {
      toggleClickThrough();
    });
  }

  function applyHUDState() {
    if (!hudEl) return;

    if (posLeft && posTop) {
      hudEl.style.bottom = 'auto';
      hudEl.style.right = 'auto';
      hudEl.style.left = posLeft;
      hudEl.style.top = posTop;
    }

    if (isMinimized) hudEl.classList.add('qt-minimized');
    else hudEl.classList.remove('qt-minimized');

    if (isClickThrough) hudEl.classList.add('qt-clickthrough');
    else hudEl.classList.remove('qt-clickthrough');
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    applyHUDState();
    saveToStorage();
    if (window.HUDManager) {
      window.HUDManager.show(`⏱️ Stopwatch Overlay: ${isMinimized ? 'Minimized' : 'Expanded'}`);
    }
  }

  function toggleHide() {
    isHidden = !isHidden;
    if (hudEl) hudEl.style.display = isHidden ? 'none' : 'flex';
    saveToStorage();
    if (window.HUDManager) {
      window.HUDManager.show(`👁️ Stopwatch Overlay: ${isHidden ? 'Hidden (Press Shift+H to show)' : 'Visible'}`);
    }
  }

  function toggleClickThrough() {
    isClickThrough = !isClickThrough;
    applyHUDState();
    saveToStorage();
    if (window.HUDManager) {
      window.HUDManager.show(
        isClickThrough
          ? `🎯 Click-Through Mode: ON (Clicks pass to video behind. Press Alt+C to unlock)`
          : `🖱️ Click-Through Mode: OFF (Normal interaction)`
      );
    }
  }

  function updateHUDDisplay() {
    if (!hudEl) return;

    const timeText = hudEl.querySelector('#qt-time-text');
    const statusBadge = hudEl.querySelector('#qt-status-badge');
    const qName = hudEl.querySelector('#qt-qname');

    if (qName) qName.innerText = `⏱️ Q${currentQuestionNum}`;
    if (timeText) timeText.innerText = formatTime(getActiveSeconds());

    if (statusBadge) {
      statusBadge.innerText = isRunning ? 'RUNNING' : 'PAUSED';
      statusBadge.style.color = isRunning ? '#34D399' : '#FBBF24';
    }

    if (isRunning) {
      hudEl.classList.remove('timer-paused');
    } else {
      hudEl.classList.add('timer-paused');
    }
  }

  function startTimer() {
    if (isRunning) return;
    createHUD();
    isHidden = false;
    hudEl.style.display = 'flex';
    applyHUDState();

    isRunning = true;
    startTime = Date.now();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      updateHUDDisplay();
      saveToStorage();
    }, 1000);
    updateHUDDisplay();
    saveToStorage();

    if (window.HUDManager) {
      window.HUDManager.show(`⏱️ Question ${currentQuestionNum} Stopwatch Started`);
    }
  }

  function pauseTimer() {
    if (!isRunning) return;

    isRunning = false;
    elapsedTime += Date.now() - startTime;
    startTime = 0;
    clearInterval(timerInterval);
    updateHUDDisplay();
    saveToStorage();

    if (window.HUDManager) {
      window.HUDManager.show(`⏸️ Question ${currentQuestionNum} Timer Paused (${formatTime(getActiveSeconds())})`);
    }
  }

  function toggleStartPause() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function lapNextQuestion() {
    const sec = getActiveSeconds();
    if (sec === 0 && !isRunning) {
      if (window.HUDManager) window.HUDManager.show(`⚠️ Timer not started yet! Press [T] to start.`);
      return;
    }

    logs.push({
      qNum: currentQuestionNum,
      durationSec: sec,
      timeFormatted: formatTime(sec)
    });

    if (window.HUDManager) {
      window.HUDManager.show(`✅ Q${currentQuestionNum} Saved: ${formatTime(sec)}! Starting Q${currentQuestionNum + 1}...`);
    }

    currentQuestionNum += 1;
    elapsedTime = 0;
    startTime = Date.now();
    isRunning = true;

    createHUD();
    isHidden = false;
    hudEl.style.display = 'flex';
    applyHUDState();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      updateHUDDisplay();
      saveToStorage();
    }, 1000);
    updateHUDDisplay();
    saveToStorage();
  }

  function resetTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    elapsedTime = 0;
    startTime = 0;
    currentQuestionNum = 1;
    logs = [];
    isMinimized = false;
    isHidden = false;
    isClickThrough = false;

    const key = getStorageKey();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove([key]);
    } else {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    }

    if (hudEl) {
      hudEl.style.display = 'none';
    }

    if (modalEl) {
      modalEl.remove();
      modalEl = null;
    }

    if (window.HUDManager) {
      window.HUDManager.show(`🔄 Question Stopwatch Reset & Cleared`);
    }
  }

  function copyStatsToClipboard() {
    const currentSec = getActiveSeconds();
    const totalSec = logs.reduce((acc, l) => acc + l.durationSec, 0) + currentSec;

    let lines = [`📋 Question Time Summary (${document.title || window.location.href})`];
    logs.forEach(l => {
      lines.push(`Question ${l.qNum}: ${l.timeFormatted}`);
    });
    if (currentSec > 0 || isRunning) {
      lines.push(`Question ${currentQuestionNum} (Current): ${formatTime(currentSec)}`);
    }
    lines.push(`Total Time: ${formatTime(totalSec)}`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      if (window.HUDManager) window.HUDManager.show(`📋 Copied summary to clipboard!`);
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  }

  function showSummaryModal() {
    if (modalEl) {
      modalEl.remove();
      modalEl = null;
      return;
    }

    modalEl = document.createElement('div');
    modalEl.id = 'question-log-modal';

    const currentSec = getActiveSeconds();
    const totalSec = logs.reduce((acc, l) => acc + l.durationSec, 0) + currentSec;

    let itemsHTML = logs
      .map(
        l => `
      <div class="qlm-item">
        <span>Question ${l.qNum}</span>
        <strong>${l.timeFormatted}</strong>
      </div>`
      )
      .join('');

    if (currentSec > 0 || isRunning) {
      itemsHTML += `
      <div class="qlm-item" style="color: #38BDF8;">
        <span>Question ${currentQuestionNum} (Current)</span>
        <strong>${formatTime(currentSec)}</strong>
      </div>`;
    }

    if (!itemsHTML) {
      itemsHTML = `<div style="text-align:center; color:#94A3B8; padding:20px 0;">No question logs recorded yet.<br><small>Press [T] to start timing!</small></div>`;
    }

    modalEl.innerHTML = `
      <div class="qlm-header">
        <span class="qlm-title">📋 Question Time Summary</span>
        <button class="qlm-close-btn" id="qlm-close">&times;</button>
      </div>
      <div class="qlm-body">
        ${itemsHTML}
        <div class="qlm-total">
          <span>Total Time Elapsed</span>
          <span>${formatTime(totalSec)}</span>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button id="qlm-copy-btn" style="flex:1; background:#4F46E5; color:#FFF; border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:600;">📋 Copy Stats</button>
          <button id="qlm-reset-btn" style="flex:1; background:#EF4444; color:#FFF; border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:600;">🗑️ Clear Logs</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    document.getElementById('qlm-close')?.addEventListener('click', () => {
      modalEl?.remove();
      modalEl = null;
    });

    document.getElementById('qlm-copy-btn')?.addEventListener('click', () => {
      copyStatsToClipboard();
    });

    document.getElementById('qlm-reset-btn')?.addEventListener('click', () => {
      resetTimer();
    });
  }

  // Keyboard shortcut listener
  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    if (
      ['INPUT', 'TEXTAREA'].includes(active?.tagName) ||
      active?.isContentEditable
    ) {
      return;
    }

    const key = e.key.toLowerCase();

    // Alt + C -> Toggle Click-Through Mode
    if (e.altKey && key === 'c') {
      e.preventDefault();
      toggleClickThrough();
      return;
    }

    // Shift + H -> Toggle Hide/Show Overlay
    if (e.shiftKey && key === 'h') {
      e.preventDefault();
      toggleHide();
      return;
    }

    // Alt + Shift + T -> Reset
    if (e.altKey && e.shiftKey && key === 't') {
      e.preventDefault();
      resetTimer();
      return;
    }

    // Alt + T -> Summary modal toggle
    if (e.altKey && key === 't') {
      e.preventDefault();
      showSummaryModal();
      return;
    }

    // Shift + T -> Next Question (Lap)
    if (e.shiftKey && key === 't') {
      e.preventDefault();
      lapNextQuestion();
      return;
    }

    // Plain 'T' -> Start / Pause / Resume
    if (key === 't' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      toggleStartPause();
      return;
    }
  });

  // Handle SPA navigation
  let currentUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      isRunning = false;
      clearInterval(timerInterval);
      if (hudEl) hudEl.style.display = 'none';
      if (modalEl) { modalEl.remove(); modalEl = null; }
      loadFromStorage();
    }
  }, 1000);

  // Initialize storage load
  loadFromStorage(() => {
    console.log('✅ Question Timer loaded with Draggable & Liquid Glass Overlay');
  });
})();
