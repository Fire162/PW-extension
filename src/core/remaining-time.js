/**
 * Universal Video Remaining Time Display
 * Shows actual remaining time + playback-adjusted remaining time.
 * Supports VideoJS players (.vjs-duration) and standard HTML5 <video> elements.
 * Shortcut: Press 'R' to toggle remaining time badge.
 */
(function () {
  'use strict';

  let showBadge = true;
  let remainingBadge = null;

  function formatTime(sec) {
    if (isNaN(sec) || sec < 0) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);

    return [
      h > 0 ? String(h).padStart(2, '0') : null,
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ]
      .filter(Boolean)
      .join(':');
  }

  function getOrCreateBadge(video) {
    if (remainingBadge && document.contains(remainingBadge)) {
      return remainingBadge;
    }

    // Try VideoJS duration container first
    const vjsDuration = document.querySelector('.vjs-duration');
    remainingBadge = document.createElement('span');
    remainingBadge.id = 'remaining-time-badge';

    if (vjsDuration) {
      vjsDuration.appendChild(remainingBadge);
    } else if (video.parentElement) {
      // Fallback: attach near video container
      remainingBadge.style.position = 'absolute';
      remainingBadge.style.bottom = '12px';
      remainingBadge.style.right = '12px';
      remainingBadge.style.background = 'rgba(15, 23, 42, 0.85)';
      remainingBadge.style.padding = '4px 8px';
      remainingBadge.style.borderRadius = '6px';
      remainingBadge.style.zIndex = '9999';
      video.parentElement.style.position = 'relative';
      video.parentElement.appendChild(remainingBadge);
    }

    return remainingBadge;
  }

  function updateRemainingTime() {
    const video = document.querySelector('video');
    if (!video) return;

    const badge = getOrCreateBadge(video);
    if (!badge) return;

    if (!showBadge) {
      badge.style.display = 'none';
      return;
    }

    const duration = video.duration;
    const current = video.currentTime;

    if (!duration || isNaN(duration)) {
      badge.style.display = 'none';
      return;
    }

    badge.style.display = 'inline-block';

    const remaining = Math.max(0, duration - current);
    const speed = video.playbackRate || 1;
    const adjusted = remaining / speed;

    badge.innerText = `(-${formatTime(remaining)} | ${formatTime(adjusted)})`;
  }

  function init() {
    const checkInterval = setInterval(() => {
      const video = document.querySelector('video');
      if (video) {
        clearInterval(checkInterval);

        video.removeEventListener('timeupdate', updateRemainingTime);
        video.addEventListener('timeupdate', updateRemainingTime);
        video.addEventListener('ratechange', updateRemainingTime);

        updateRemainingTime();
        console.log('✅ Universal Remaining Time Tracker active (Press R to toggle)');
      }
    }, 1000);
  }

  // Keyboard toggle 'R'
  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    if (
      ['INPUT', 'TEXTAREA'].includes(active?.tagName) ||
      active?.isContentEditable
    ) {
      return;
    }

    if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      showBadge = !showBadge;
      updateRemainingTime();

      if (window.HUDManager) {
        window.HUDManager.show(`⏱️ Remaining Time: ${showBadge ? 'ON' : 'OFF'}`);
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
