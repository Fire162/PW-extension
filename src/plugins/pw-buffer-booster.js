/**
 * PhysicsWallah Forward Buffer Booster
 * Runs natively in the MAIN execution world to directly configure Video.js / VHS loaders.
 */
(function () {
  'use strict';

  // Default forward buffer goal: 2 minutes (120 seconds)
  let targetBufferSec = 120;

  function updateTargetFromValue(sec) {
    const parsed = Number(sec);
    if (!isNaN(parsed) && parsed > 0 && parsed !== targetBufferSec) {
      targetBufferSec = parsed;
      console.log(`[PW Extension] Updated forward buffer target: ${targetBufferSec}s`);
      applyBooster();
    }
  }

  function checkDatasetTarget() {
    if (document.documentElement && document.documentElement.dataset.pwBufferSec) {
      updateTargetFromValue(document.documentElement.dataset.pwBufferSec);
    }
  }

  // Initial check from DOM attribute
  checkDatasetTarget();

  // Listen for buffer target updates from isolated content script via window and document
  const handleBufferEvent = (e) => {
    if (e.detail && e.detail.bufferSec) {
      updateTargetFromValue(e.detail.bufferSec);
    }
  };
  window.addEventListener('pw-set-buffer-target', handleBufferEvent);
  document.addEventListener('pw-set-buffer-target', handleBufferEvent);

  function applyBooster() {
    checkDatasetTarget();

    const player = window.player || document.querySelector('.video-js')?.player || document.querySelector('video')?.parentElement?.player;
    const vhs = player?.tech_?.vhs;
    // In modern Video.js VHS, playlist controller is named playlistController_
    const pc = vhs?.playlistController_ || vhs?.masterPlaylistController_;
    if (!pc) return;

    // 1. Update Video.js VHS global constants
    if (window.videojs?.Vhs) {
      try {
        window.videojs.Vhs.GOAL_BUFFER_LENGTH = targetBufferSec;
        window.videojs.Vhs.MAX_GOAL_BUFFER_LENGTH = targetBufferSec;
      } catch (e) {}
    }
    if (vhs.constructor) {
      try {
        if (vhs.constructor.GOAL_BUFFER_LENGTH !== undefined) vhs.constructor.GOAL_BUFFER_LENGTH = targetBufferSec;
        if (vhs.constructor.MAX_GOAL_BUFFER_LENGTH !== undefined) vhs.constructor.MAX_GOAL_BUFFER_LENGTH = targetBufferSec;
      } catch (e) {}
    }

    // 2. Override PlaylistController buffer target & hasPlayed state
    pc.goalBufferLength = () => targetBufferSec;
    pc.hasPlayed_ = true;

    // 3. Configure both segment loaders directly
    const mainLoader = pc.mainSegmentLoader_;
    const audioLoader = pc.audioSegmentLoader_;

    [mainLoader, audioLoader].forEach(loader => {
      if (!loader) return;

      loader.goalBufferLength_ = () => targetBufferSec;
      loader.hasPlayed_ = () => true;

      // Keep continuous monitor tick loop alive
      if (typeof loader.monitorBuffer_ === 'function' && loader.paused && loader.paused()) {
        loader.monitorBuffer_();
      }

      // If loader is in READY state, immediately trigger segment request
      if (loader.state === 'READY' && typeof loader.fillBuffer_ === 'function') {
        loader.fillBuffer_();
      }
    });
  }

  // Periodic sync loop to maintain buffer goal across seeks & quality shifts
  if (window.__pwBoosterInterval) clearInterval(window.__pwBoosterInterval);
  window.__pwBoosterInterval = setInterval(applyBooster, 1200);

  // Hook window.player setter if defined later by React
  let playerInstance = window.player;
  try {
    Object.defineProperty(window, 'player', {
      configurable: true,
      enumerable: true,
      get: () => playerInstance,
      set: (val) => {
        playerInstance = val;
        setTimeout(applyBooster, 100);
        setTimeout(applyBooster, 1000);
      }
    });
  } catch (e) {}

  applyBooster();
  console.log(`[PW Extension] Buffer booster initialized in MAIN world (target: ${targetBufferSec}s)`);
})();
