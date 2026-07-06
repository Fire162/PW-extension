/**
 * HUDManager - Clean, encapsulated Heads-Up Display notification system
 * Supports Focus Mode: suppresses floating toast popups while keeping Question Stopwatch intact.
 */
(function () {
  'use strict';

  let focusMode = false;

  function isContextValid() {
    try {
      return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  function loadFocusSettings() {
    if (!isContextValid()) return;
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['focusMode'], result => {
          if (!isContextValid()) return;
          focusMode = !!result.focusMode;
        });

        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (!isContextValid()) return;
          if (namespace === 'local' && changes.focusMode !== undefined) {
            focusMode = !!changes.focusMode.newValue;
          }
        });
      }
    } catch (e) {}
  }

  class HUD {
    constructor() {
      this.el = null;
      this.hideTimer = null;
    }

    init() {
      if (this.el) return this.el;

      this.el = document.createElement('div');
      this.el.id = 'speed-hud-overlay';
      document.body.appendChild(this.el);
      return this.el;
    }

    /**
     * Show a HUD toast message for a duration (default 1.2s)
     * Suppressed if Focus Mode is enabled
     * @param {string} text Message string or HTML
     * @param {number} durationMs Duration in ms
     */
    show(text, durationMs = 1200) {
      if (focusMode) return; // Mute floating popups in Focus Mode!

      this.init();

      this.el.innerHTML = text;
      this.el.classList.add('hud-visible');

      clearTimeout(this.hideTimer);

      this.hideTimer = setTimeout(() => {
        this.el.classList.remove('hud-visible');
      }, durationMs);
    }
  }

  window.HUDManager = new HUD();
  loadFocusSettings();

  // Keyboard Shortcut: Alt + F -> Toggle Focus Mode
  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    if (
      ['INPUT', 'TEXTAREA'].includes(active?.tagName) ||
      active?.isContentEditable
    ) {
      return;
    }

    if (e.altKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      focusMode = !focusMode;
      if (isContextValid() && chrome.storage && chrome.storage.local) {
        try { chrome.storage.local.set({ focusMode }); } catch (e) {}
      }
      const el = window.HUDManager.init();
      if (el) {
        el.innerHTML = focusMode ? '🧘 Focus Mode: ON (Toast Popups Muted)' : '🔔 Focus Mode: OFF (Toast Popups Active)';
        el.classList.add('hud-visible');
        clearTimeout(window.HUDManager.hideTimer);
        window.HUDManager.hideTimer = setTimeout(() => {
          el.classList.remove('hud-visible');
        }, 1400);
      }
    }
  });
})();
