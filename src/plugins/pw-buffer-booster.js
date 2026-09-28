/**
 * PhysicsWallah Forward Buffer Booster
 * Runs natively in the MAIN execution world to directly configure Video.js / VHS loaders.
 */
(function () {
  'use strict';

  const TARGET_BUFFER_SEC = 600; // 10 minutes

  function applyBooster() {
    const player = window.player;
    const vhs = player?.tech_?.vhs;
    const mpc = vhs?.masterPlaylistController_;
    const mainLoader = mpc?.mainSegmentLoader_;
    const audioLoader = mpc?.audioSegmentLoader_;

    [mainLoader, audioLoader].forEach(loader => {
      if (!loader) return;

      // Bypass pause gating so forward caching proceeds even while paused
      loader.paused = () => false;
      loader.hasPlayed_ = () => true;
      loader.pause = function () {};

      if (typeof loader.goalBufferLength_ !== 'function' || loader.goalBufferLength_() !== TARGET_BUFFER_SEC) {
        loader.goalBufferLength_ = () => TARGET_BUFFER_SEC;
        if (typeof loader.monitorBuffer_ === 'function') loader.monitorBuffer_();
      }

      const proto = Object.getPrototypeOf(loader);
      if (proto && proto.goalBufferLength_ !== loader.goalBufferLength_) {
        proto.goalBufferLength_ = () => TARGET_BUFFER_SEC;
        proto.paused = () => false;
        proto.hasPlayed_ = () => true;
        proto.pause = function () {};
      }

      // If loader is ready and has more chunks pending, actively fetch
      if (loader.state_ === 'READY' && typeof loader.fillBuffer_ === 'function' && loader.chooseNextRequest_ && loader.chooseNextRequest_()) {
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
  console.log('[PW Extension] Buffer booster initialized in MAIN world (10m forward buffer)');
})();
