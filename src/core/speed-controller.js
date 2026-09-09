/**
 * SpeedController - Generic HTML5 Video Speed & Brightness Controller
 *
 * Controls:
 * - Alt + Scroll: Adjust playback speed (0.25x - 4.0x)
 * - Alt + Right/Left Arrow: Speed up / Slow down (with smooth hold repeat)
 * - Alt + Up/Down Arrow: Adjust video brightness (0.5x - 2.0x)
 * - Hold Space: Fast forward 2.0x (returns to original speed on release)
 * - Tap Space: Play / Pause toggle
 * - S: Toggle 2x speed (press again to restore previous speed)
 * - Ctrl + /: Toggle Speed Ramp progression
 */
(function () {
  'use strict';

  let holdInterval = null;
  let brightness = 1.0;
  const brightnessStep = 0.1;
  const speedStep = 0.05;

  // Spacebar Hold State
  let spaceTimer = null;
  let originalSpeed = null;
  let isHoldingSpace = false;

  // Shift Key Hold State (1.5x Fast Forward)
  let shiftTimer = null;
  let originalShiftSpeed = null;
  let isHoldingShift = false;

  // Alt Key Hold State (1.0x Normal Speed)
  let altTimer = null;
  let originalAltSpeed = null;
  let isHoldingAlt = false;

  // Speed Ramp State
  let rampTimeout = null;
  let isRampRunning = false;

  // S-key 2x Toggle State
  let isSToggled = false;
  let preToggleSpeed = null;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function formatNum(val) {
    return parseFloat(val.toFixed(2));
  }

  function showHUD(msg) {
    if (window.HUDManager) {
      window.HUDManager.show(msg);
    }
  }

  function clearRampProgression() {
    if (rampTimeout) clearTimeout(rampTimeout);
    rampTimeout = null;
    isRampRunning = false;
  }

  function toggleRampProgression(video) {
    if (isRampRunning) {
      clearRampProgression();
      showHUD(`🛑 Speed Ramp Stopped at ${formatNum(video.playbackRate)}x`);
      return;
    }

    isRampRunning = true;

    function planNextStep() {
      const currentSpeed = formatNum(video.playbackRate);

      if (currentSpeed >= 2.5) {
        showHUD(`⚡ Max Target Reached: 2.5x`);
        clearRampProgression();
        return;
      }

      let currentStep = Math.round((currentSpeed - 1.0) * 10) + 1;
      if (currentStep < 1) currentStep = 1;
      let waitTime = currentStep * 20000; // 20s step interval

      showHUD(`📈 Ramp Active: ${formatNum(currentSpeed)}x (Next boost in ${currentStep * 20}s)`);

      rampTimeout = setTimeout(() => {
        if (!isRampRunning) return;
        video.playbackRate = formatNum(clamp(video.playbackRate + 0.1, 1.0, 2.5));
        planNextStep();
      }, waitTime);
    }

    planNextStep();
  }

  // --- Wheel Listener (Alt + Scroll) ---
  document.addEventListener(
    'wheel',
    e => {
      const video = document.querySelector('video');
      if (!video || !e.altKey) return;

      e.preventDefault();

      // Cancel Alt-hold timer and active state so Alt+Scroll does NOT rollback to 1x or original speed
      clearTimeout(altTimer);
      altTimer = null;
      isHoldingAlt = false;
      originalAltSpeed = null;

      if (isRampRunning) {
        clearRampProgression();
        showHUD(`🛑 Ramp Interrupted`);
      }

      let change = e.deltaY < 0 ? speedStep : -speedStep;
      video.playbackRate = formatNum(clamp(video.playbackRate + change, 0.25, 4.0));
      showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
    },
    { passive: false }
  );

  // Helper to detect if user is typing in any form control or editable element
  function isTyping(e) {
    const active = document.activeElement;
    const target = e?.target;

    if (e && typeof e.composedPath === 'function') {
      const path = e.composedPath();
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        if (el && el.nodeType === 1) {
          const tag = el.tagName;
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
          if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
          const role = el.getAttribute('role');
          if (['textbox', 'searchbox', 'combobox'].includes(role)) return true;
        }
      }
    }

    let cur = active;
    while (cur && cur.shadowRoot && cur.shadowRoot.activeElement) {
      cur = cur.shadowRoot.activeElement;
    }
    if (cur) {
      const tag = cur.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
      if (cur.isContentEditable || cur.getAttribute('contenteditable') === 'true') return true;
      const role = cur.getAttribute('role');
      if (['textbox', 'searchbox', 'combobox'].includes(role)) return true;
    }

    if (target && target.nodeType === 1) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
      if (target.isContentEditable || (target.closest && target.closest('[contenteditable="true"], input, textarea, select, [role="textbox"], [role="searchbox"]'))) {
        return true;
      }
    }

    return false;
  }

  // --- Keydown Listener ---
  document.addEventListener(
    'keydown',
    e => {
      if (isTyping(e)) {
        return;
      }

      const video = document.querySelector('video');
      if (!video) return;

      // Ctrl + / -> Toggle Ramp
      if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && (e.key === '/' || e.code === 'Slash')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleRampProgression(video);
        return;
      }

      // Spacebar hold fast forward
      if ((e.key === ' ' || e.code === 'Space') && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (isHoldingSpace) return;

        if (!spaceTimer) {
          originalSpeed = video.playbackRate;

          spaceTimer = setTimeout(() => {
            isHoldingSpace = true;
            video.playbackRate = 2.0;
            showHUD(`⚡ 2.0x (Hold Space)`);
            if (video.paused) video.play();
          }, 250);
        }
        return;
      }

      // Shift key hold fast forward (1.5x)
      if ((e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isHoldingShift) return;

        if (!shiftTimer) {
          originalShiftSpeed = video.playbackRate;

          shiftTimer = setTimeout(() => {
            isHoldingShift = true;
            video.playbackRate = 1.5;
            showHUD(`⚡ 1.5x (Hold Shift)`);
            if (video.paused) video.play();
          }, 250);
        }
        return;
      }

      // Alt key hold normal speed (1.0x)
      if ((e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (isHoldingAlt) return;

        if (!altTimer) {
          originalAltSpeed = video.playbackRate;

          altTimer = setTimeout(() => {
            isHoldingAlt = true;
            video.playbackRate = 1.0;
            showHUD(`⚡ 1.0x Normal (Hold Alt)`);
            if (video.paused) video.play();
          }, 250);
        }
        return;
      }

      // If any other key is pressed with Alt, cancel Alt hold timer completely so combos never rollback
      if (e.altKey && e.key !== 'Alt') {
        clearTimeout(altTimer);
        altTimer = null;
        isHoldingAlt = false;
        originalAltSpeed = null;
      }

      // S key -> Toggle 2x speed
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (isSToggled) {
          // Restore previous speed
          video.playbackRate = formatNum(preToggleSpeed ?? 1.0);
          isSToggled = false;
          preToggleSpeed = null;
          showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x (S toggle OFF)`);
        } else {
          // Save current speed and jump to 2x
          preToggleSpeed = video.playbackRate;
          isSToggled = true;
          video.playbackRate = 2.0;
          showHUD(`🚀 2x Speed ON (press S to restore)`);
        }
        return;
      }

      // Alt + Arrows
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      let action = null;
      if (e.key === 'ArrowRight') action = 'speedUp';
      if (e.key === 'ArrowLeft') action = 'speedDown';
      if (e.key === 'ArrowUp') action = 'brightUp';
      if (e.key === 'ArrowDown') action = 'brightDown';

      if (!action) return;

      e.preventDefault();

      if (['speedUp', 'speedDown'].includes(action) && isRampRunning) {
        clearRampProgression();
        showHUD(`🛑 Ramp Interrupted`);
      }

      function apply() {
        if (action === 'speedUp') {
          video.playbackRate = formatNum(clamp(video.playbackRate + speedStep, 0.25, 4.0));
          showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
        }

        if (action === 'speedDown') {
          video.playbackRate = formatNum(clamp(video.playbackRate - speedStep, 0.25, 4.0));
          showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
        }

        if (action === 'brightUp') {
          brightness = formatNum(clamp(brightness + brightnessStep, 0.3, 2.5));
          video.style.filter = `brightness(${brightness})`;
          showHUD(`☀️ Brightness: ${formatNum(brightness)}x`);
        }

        if (action === 'brightDown') {
          brightness = formatNum(clamp(brightness - brightnessStep, 0.3, 2.5));
          video.style.filter = `brightness(${brightness})`;
          showHUD(`☀️ Brightness: ${formatNum(brightness)}x`);
        }
      }

      if (!holdInterval) {
        apply();
        holdInterval = setInterval(apply, 120);
      }
    },
    true
  );

  // --- Keyup Listener ---
  document.addEventListener(
    'keyup',
    e => {
      if (isTyping(e)) {
        return;
      }

      const video = document.querySelector('video');

      if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
      }

      if (e.key === ' ' || e.code === 'Space') {
        clearTimeout(spaceTimer);
        spaceTimer = null;

        if (isHoldingSpace) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (video && originalSpeed !== null) {
            video.playbackRate = formatNum(originalSpeed);
            showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
          }
          isHoldingSpace = false;
        } else if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (video) {
            if (video.paused) video.play();
            else video.pause();
          }
        }
      }

      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        clearTimeout(shiftTimer);
        shiftTimer = null;

        if (isHoldingShift) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (video && originalShiftSpeed !== null) {
            video.playbackRate = formatNum(originalShiftSpeed);
            showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
          }
          isHoldingShift = false;
          originalShiftSpeed = null;
        }
      }

      if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
        clearTimeout(altTimer);
        altTimer = null;

        if (isHoldingAlt) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (video && originalAltSpeed !== null) {
            video.playbackRate = formatNum(originalAltSpeed);
            showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
          }
          isHoldingAlt = false;
          originalAltSpeed = null;
        }
      }
    },
    true
  );

  window.addEventListener('blur', () => {
    const video = document.querySelector('video');
    if (isHoldingSpace && video && originalSpeed !== null) {
      video.playbackRate = formatNum(originalSpeed);
      isHoldingSpace = false;
    }
    if (isHoldingShift && video && originalShiftSpeed !== null) {
      video.playbackRate = formatNum(originalShiftSpeed);
      isHoldingShift = false;
      originalShiftSpeed = null;
    }
    if (isHoldingAlt && video && originalAltSpeed !== null) {
      video.playbackRate = formatNum(originalAltSpeed);
      isHoldingAlt = false;
      originalAltSpeed = null;
    }
    clearTimeout(spaceTimer);
    spaceTimer = null;
    clearTimeout(shiftTimer);
    shiftTimer = null;
    clearTimeout(altTimer);
    altTimer = null;
  });

  console.log('✅ Video Speed Controller initialized');
})();
