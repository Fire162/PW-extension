/**
 * HUDManager - Clean, encapsulated Heads-Up Display notification system
 */
(function () {
  'use strict';

  class HUD {
    constructor() {
      this.el = null;
      this.hideTimer = null;
    }

    init() {
      if (this.el) return;

      this.el = document.createElement('div');
      this.el.id = 'speed-hud-overlay';
      document.body.appendChild(this.el);
    }

    /**
     * Show a HUD toast message for a duration (default 1.2s)
     * @param {string} text Message string or HTML
     * @param {number} durationMs Duration in ms
     */
    show(text, durationMs = 1200) {
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
})();
