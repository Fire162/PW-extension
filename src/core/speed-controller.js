/**
 * SpeedController - Generic HTML5 Video Speed & Brightness Controller
 *
 * Controls:
 * - Alt + Scroll: Adjust playback speed (1.0x - 3.5x)
 * - Alt + Right/Left Arrow: Speed up / Slow down (with smooth hold repeat)
 * - Alt + Up/Down Arrow: Adjust video brightness (0.5x - 2.0x)
 * - Hold Space: Fast forward 2.0x (returns to original speed on release)
 * - Tap Space: Play / Pause toggle
 * - Ctrl + /: Toggle Speed Ramp progression
 */
(function () {
  'use strict';

  let holdInterval = null;
  let brightness = 1.0;
  const brightnessStep = 0.1;

  // Spacebar Hold State
  let spaceTimer = null;
  let originalSpeed = null;
  let isHoldingSpace = false;

  // Speed Ramp State
  let rampTimeout = null;
  let isRampRunning = false;

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

      if (isRampRunning) {
        clearRampProgression();
        showHUD(`🛑 Ramp Interrupted`);
      }

      let change = e.deltaY < 0 ? 0.1 : -0.1;
      video.playbackRate = formatNum(clamp(video.playbackRate + change, 0.25, 4.0));
      showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
    },
    { passive: false }
  );

  // --- Keydown Listener ---
  document.addEventListener(
    'keydown',
    e => {
      const active = document.activeElement;
      if (
        ['INPUT', 'TEXTAREA'].includes(active?.tagName) ||
        active?.isContentEditable
      ) {
        return;
      }

      const video = document.querySelector('video');
      if (!video) return;

      // Ctrl + / -> Toggle Ramp
      if (e.ctrlKey && (e.key === '/' || e.code === 'Slash')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleRampProgression(video);
        return;
      }

      // Spacebar hold fast forward
      if (e.key === ' ' || e.code === 'Space') {
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

      // Alt + Arrows
      if (!e.altKey) return;

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
          video.playbackRate = formatNum(clamp(video.playbackRate + 0.1, 0.25, 4.0));
          showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
        }

        if (action === 'speedDown') {
          video.playbackRate = formatNum(clamp(video.playbackRate - 0.1, 0.25, 4.0));
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
      const active = document.activeElement;
      if (
        ['INPUT', 'TEXTAREA'].includes(active?.tagName) ||
        active?.isContentEditable
      ) {
        return;
      }

      const video = document.querySelector('video');

      if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopImmediatePropagation();

        clearTimeout(spaceTimer);
        spaceTimer = null;

        if (isHoldingSpace) {
          if (video && originalSpeed !== null) {
            video.playbackRate = formatNum(originalSpeed);
            showHUD(`⚡ Speed: ${formatNum(video.playbackRate)}x`);
          }
          isHoldingSpace = false;
        } else {
          if (video) {
            if (video.paused) video.play();
            else video.pause();
          }
        }
      }
    },
    true
  );

  console.log('✅ Video Speed Controller initialized');
})();
