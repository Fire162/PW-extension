/**
 * Macro Recorder & Runner Module
 * Injected on all pages to record user clicks/navigation and replay saved macros.
 * Displays a 10-second floating launcher prompt on site load for matching saved macros.
 */
(function () {
  'use strict';

  let isRecording = false;
  let recordedSteps = [];
  let recordStartTime = 0;
  let recordingIndicatorEl = null;

  // Generate robust CSS selector for an element
  function getElementSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';

    // If element has a valid id that doesn't look auto-generated
    if (el.id && !/^[0-9]|^:/.test(el.id) && !el.id.includes(':')) {
      try {
        if (document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
          return '#' + CSS.escape(el.id);
        }
      } catch (e) {}
    }

    // Check data attributes
    const testAttrs = ['data-testid', 'data-id', 'name', 'role', 'aria-label'];
    for (const attr of testAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const sel = `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"]`;
        try {
          if (document.querySelectorAll(sel).length === 1) return sel;
        } catch (e) {}
      }
    }

    // Build hierarchical path
    const path = [];
    let cur = el;
    while (cur && cur.nodeType === Node.ELEMENT_NODE && cur !== document.body && cur !== document.documentElement) {
      let selector = cur.tagName.toLowerCase();
      if (cur.id && !/^[0-9]|^:/.test(cur.id) && !cur.id.includes(':')) {
        selector += '#' + CSS.escape(cur.id);
        path.unshift(selector);
        break;
      } else {
        let sibling = cur;
        let nth = 1;
        while ((sibling = sibling.previousElementSibling)) {
          if (sibling.tagName.toLowerCase() === cur.tagName.toLowerCase()) nth++;
        }
        if (nth > 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      cur = cur.parentElement;
    }

    return path.join(' > ');
  }

  // Get trimmed text content of element for fallback matching
  function getElementText(el) {
    if (!el) return '';
    const text = (el.innerText || el.textContent || '').trim();
    return text.length > 50 ? text.substring(0, 50) : text;
  }

  // Find best matching element for a step during replay
  function findTargetElement(step) {
    // 1. Try exact selector
    if (step.selector) {
      try {
        const el = document.querySelector(step.selector);
        if (el && isElementVisible(el)) return el;
      } catch (e) {}
    }

    // 2. Try text matching with tagName
    if (step.tagName && step.text) {
      const candidates = document.getElementsByTagName(step.tagName);
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (isElementVisible(c)) {
          const cText = (c.innerText || c.textContent || '').trim();
          if (cText === step.text || cText.includes(step.text)) {
            return c;
          }
        }
      }
    }

    // 3. Try any clickable element with matching text
    if (step.text) {
      const clickables = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], div, span');
      for (let i = 0; i < clickables.length; i++) {
        const c = clickables[i];
        if (isElementVisible(c)) {
          const cText = (c.innerText || c.textContent || '').trim();
          if (cText === step.text) {
            return c;
          }
        }
      }
    }

    return null;
  }

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // Global click recorder listener
  function handleClickCapture(e) {
    if (!isRecording) return;
    const target = e.target;
    // Don't record clicks on recording indicator or macro launcher
    if (target.closest && (target.closest('#macro-record-indicator') || target.closest('#macro-quick-launcher'))) {
      return;
    }

    const now = Date.now();
    const delay = recordedSteps.length === 0 ? 0 : Math.min(Math.max(now - recordStartTime, 100), 5000);
    recordStartTime = now;

    const selector = getElementSelector(target);
    const text = getElementText(target);
    const tagName = target.tagName;
    const href = target.href || target.closest('a')?.href || null;

    const step = {
      type: 'click',
      selector: selector,
      text: text,
      tagName: tagName,
      href: href,
      delay: delay
    };

    recordedSteps.push(step);
    updateRecordingIndicatorBadge();
    console.log('[Macro Recorder] Captured step:', step);
  }

  function showRecordingIndicator() {
    if (recordingIndicatorEl) return;
    recordingIndicatorEl = document.createElement('div');
    recordingIndicatorEl.id = 'macro-record-indicator';
    recordingIndicatorEl.innerHTML = `
      <span class="mri-dot"></span>
      <span class="mri-title">Recording Macro...</span>
      <span class="mri-count" id="mri-step-count">0 steps</span>
      <button class="mri-btn mri-stop-btn" id="mri-stop" title="Stop & Save Macro">⏹ Save</button>
      <button class="mri-btn mri-cancel-btn" id="mri-cancel" title="Cancel Recording">✕</button>
    `;

    recordingIndicatorEl.querySelector('#mri-stop').addEventListener('click', (e) => {
      e.stopPropagation();
      stopRecordingAndPromptSave();
    });

    recordingIndicatorEl.querySelector('#mri-cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      cancelRecording();
    });

    document.body.appendChild(recordingIndicatorEl);
  }

  function updateRecordingIndicatorBadge() {
    const countEl = document.getElementById('mri-step-count');
    if (countEl) {
      countEl.textContent = `${recordedSteps.length} step${recordedSteps.length === 1 ? '' : 's'}`;
    }
  }

  function hideRecordingIndicator() {
    if (recordingIndicatorEl) {
      recordingIndicatorEl.remove();
      recordingIndicatorEl = null;
    }
  }

  let recordingOriginUrl = '';

  function startRecording() {
    isRecording = true;
    recordedSteps = [];
    recordStartTime = Date.now();
    // Save the exact clean parent URL where recording was started
    recordingOriginUrl = window.location.href.split('#')[0];
    showRecordingIndicator();
    if (window.HUDManager) {
      window.HUDManager.show('🔴 Macro recording started. Click elements to record actions!');
    }
  }

  function cancelRecording() {
    isRecording = false;
    recordedSteps = [];
    recordingOriginUrl = '';
    hideRecordingIndicator();
    if (window.HUDManager) {
      window.HUDManager.show('⚪ Macro recording cancelled.');
    }
  }

  function stopRecordingAndPromptSave() {
    if (!isRecording) return;
    isRecording = false;
    hideRecordingIndicator();

    if (recordedSteps.length === 0) {
      if (window.HUDManager) window.HUDManager.show('⚠️ No steps recorded.');
      return;
    }

    const defaultName = `Macro ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const macroName = prompt('Enter a name for this Macro:', defaultName);
    if (!macroName) {
      if (window.HUDManager) window.HUDManager.show('⚪ Macro not saved.');
      return;
    }

    saveMacro(macroName.trim(), recordedSteps, recordingOriginUrl || window.location.href.split('#')[0]);
  }

  function saveMacro(name, steps, originUrl) {
    const domain = window.location.hostname;
    const cleanOriginUrl = originUrl.split('#')[0];

    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['siteMacros'], (result) => {
      const allMacros = result.siteMacros || [];
      const newMacro = {
        id: 'macro_' + Date.now(),
        name: name,
        domain: domain,
        originUrl: cleanOriginUrl,
        createdAt: Date.now(),
        steps: steps
      };

      allMacros.push(newMacro);
      chrome.storage.local.set({ siteMacros: allMacros }, () => {
        console.log('[Macro] Saved macro:', newMacro);
        if (window.HUDManager) {
          window.HUDManager.show(`✅ Saved Macro: "${name}" (${steps.length} steps)`);
        }
      });
    });
  }

  // Execute a macro step-by-step
  async function replayMacro(macro) {
    if (!macro || !macro.steps || macro.steps.length === 0) {
      if (window.HUDManager) window.HUDManager.show('⚠️ Macro has no recorded steps.');
      return;
    }

    if (window.HUDManager) {
      window.HUDManager.show(`⚡ Running Macro: "${macro.name}"...`);
    }

    for (let i = 0; i < macro.steps.length; i++) {
      const step = macro.steps[i];
      // Delay before step
      const waitMs = Math.max(step.delay || 400, 300);
      await new Promise((r) => setTimeout(r, waitMs));

      // Attempt to find element, with retry for up to 3 seconds
      let el = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        el = findTargetElement(step);
        if (el) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      if (el) {
        // Highlight element briefly
        const prevOutline = el.style.outline;
        el.style.outline = '2px solid #38BDF8';
        setTimeout(() => {
          try { el.style.outline = prevOutline; } catch (e) {}
        }, 500);

        // Click element
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.click();
          console.log(`[Macro] Step ${i + 1}/${macro.steps.length} clicked:`, el);
        } catch (e) {
          console.warn(`[Macro] Error clicking element at step ${i + 1}:`, e);
        }
      } else if (step.href) {
        console.log(`[Macro] Step ${i + 1}: Element not found, navigating to:`, step.href);
        window.location.href = step.href;
        return;
      } else {
        console.warn(`[Macro] Step ${i + 1}/${macro.steps.length} element not found:`, step);
      }
    }

    if (window.HUDManager) {
      window.HUDManager.show(`🎉 Finished Macro: "${macro.name}"`);
    }
  }

  // Normalize URL by removing hash, trailing slashes, and irrelevant tracking parameters
  function normalizeUrl(url) {
    try {
      const u = new URL(url);
      return (u.origin + u.pathname).replace(/\/+$/, '').toLowerCase();
    } catch (e) {
      return (url || '').split('#')[0].replace(/\/+$/, '').toLowerCase();
    }
  }

  // 10-Second Quick Launch Floating Prompt on Site Load
  function checkAndShowMacroLauncher() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['siteMacros'], (result) => {
      const allMacros = result.siteMacros || [];
      const currentNormalized = normalizeUrl(window.location.href);

      // Only show macros whose parent start URL strictly matches the current URL
      const matchingMacros = allMacros.filter((m) => {
        const macroOrigin = normalizeUrl(m.originUrl || m.urlPattern || '');
        return macroOrigin === currentNormalized;
      });

      // If no matching macros for this page, ensure launcher is dismissed
      if (matchingMacros.length === 0) {
        const existing = document.getElementById('macro-quick-launcher');
        if (existing) existing.remove();
        return;
      }

      renderMacroLauncher(matchingMacros);
    });
  }

  function renderMacroLauncher(macros) {
    if (document.getElementById('macro-quick-launcher')) return;

    const launcher = document.createElement('div');
    launcher.id = 'macro-quick-launcher';
    launcher.className = 'macro-launcher-enter';

    let secondsLeft = 10;
    let timerId = null;

    let buttonsHtml = macros
      .map(
        (m) => `
        <button class="mql-macro-btn" data-macro-id="${m.id}" title="Run ${m.name} (${m.steps.length} steps)">
          ▶ ${m.name}
        </button>
      `
      )
      .join('');

    launcher.innerHTML = `
      <div class="mql-header">
        <span class="mql-icon">⚡</span>
        <span class="mql-label">Macros (<span id="mql-timer">${secondsLeft}s</span>)</span>
        <button class="mql-close-btn" id="mql-close" title="Dismiss">✕</button>
      </div>
      <div class="mql-body">
        ${buttonsHtml}
      </div>
    `;

    launcher.querySelectorAll('.mql-macro-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mId = btn.dataset.macroId;
        const macro = macros.find((m) => m.id === mId);
        dismissLauncher();
        if (macro) {
          replayMacro(macro);
        }
      });
    });

    function dismissLauncher() {
      if (timerId) clearInterval(timerId);
      launcher.classList.remove('macro-launcher-enter');
      launcher.classList.add('macro-launcher-leave');
      setTimeout(() => {
        launcher.remove();
      }, 300);
    }

    launcher.querySelector('#mql-close').addEventListener('click', (e) => {
      e.stopPropagation();
      dismissLauncher();
    });

    document.body.appendChild(launcher);

    timerId = setInterval(() => {
      secondsLeft--;
      const timerSpan = launcher.querySelector('#mql-timer');
      if (timerSpan) timerSpan.textContent = `${secondsLeft}s`;

      if (secondsLeft <= 0) {
        dismissLauncher();
      }
    }, 1000);
  }

  // Listen for messages from popup dashboard
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'START_MACRO_RECORDING') {
        startRecording();
        sendResponse({ success: true });
      } else if (msg.action === 'STOP_MACRO_RECORDING') {
        stopRecordingAndPromptSave();
        sendResponse({ success: true });
      } else if (msg.action === 'CANCEL_MACRO_RECORDING') {
        cancelRecording();
        sendResponse({ success: true });
      } else if (msg.action === 'RUN_MACRO') {
        if (msg.macro) {
          replayMacro(msg.macro);
          sendResponse({ success: true });
        }
      } else if (msg.action === 'GET_RECORDING_STATUS') {
        sendResponse({ isRecording: isRecording, count: recordedSteps.length });
      }
      return true;
    });
  }

  // Attach global click event listener for recording
  document.addEventListener('click', handleClickCapture, true);

  // Run initial check for 10-second prompt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShowMacroLauncher);
  } else {
    checkAndShowMacroLauncher();
  }

  // Support SPA navigation URL changes
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      checkAndShowMacroLauncher();
    }
  }, 1500);

})();
