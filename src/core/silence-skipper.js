/**
 * SilenceSkipper - Auto-Skip Silence & Dead Air in Video Lectures
 *
 * Uses Web Audio API AnalyserNode to detect silent pauses (when teacher is writing/erasing board)
 * and gradually ramps up playback speed (starting at 2.0x, +0.1x every second up to max 4.0x),
 * then instantly restores normal playback speed when speech resumes.
 *
 * Controls:
 * - Alt + S: Toggle Auto-Skip Silence ON / OFF
 */
(function () {
  'use strict';

  let isEnabled = false;
  let isSkippingSilence = false;
  let normalSpeed = 1.0;

  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;

  const SILENCE_THRESHOLD = 0.02; // RMS volume threshold
  const SILENCE_DURATION_MS = 600; // Require 600ms of silence before speeding up
  const START_SPEED = 2.0;
  const MAX_SPEED = 4.0;
  const RAMP_INCREMENT = 0.1;

  let currentSilenceSpeed = START_SPEED;
  let silenceStartTime = 0;
  let checkInterval = null;
  let rampInterval = null;

  function isContextValid() {
    try {
      return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  function loadSettings() {
    if (!isContextValid()) return;
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['autoSkipSilence'], result => {
          if (!isContextValid()) return;
          isEnabled = !!result.autoSkipSilence;
        });

        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (!isContextValid()) return;
          if (namespace === 'local' && changes.autoSkipSilence) {
            isEnabled = !!changes.autoSkipSilence.newValue;
            if (window.HUDManager) {
              window.HUDManager.show(
                `⏩ Auto-Skip Silence: ${isEnabled ? 'ENABLED' : 'DISABLED'}`
              );
            }
            if (!isEnabled) stopSkipping();
          }
        });
      }
    } catch (e) {}
  }

  function initAudioAnalysis(video) {
    if (sourceNode || !video) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;

      // Connect video audio to analyser
      sourceNode = audioCtx.createMediaElementSource(video);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);

      startMonitoring(video);
      console.log('✅ SilenceSkipper: Web Audio API analyser connected');
    } catch (e) {
      // CORS or already connected error fallback
      console.warn('SilenceSkipper: AudioContext initialization note', e.message);
    }
  }

  function calculateRMS(dataArray) {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  function startMonitoring(video) {
    if (checkInterval) clearInterval(checkInterval);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    checkInterval = setInterval(() => {
      if (!isContextValid()) {
        clearInterval(checkInterval);
        return;
      }

      if (!isEnabled || video.paused || video.ended) {
        if (isSkippingSilence) stopSkipping(video);
        return;
      }

      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      analyser.getByteTimeDomainData(dataArray);
      const rms = calculateRMS(dataArray);

      const now = Date.now();

      if (rms < SILENCE_THRESHOLD) {
        if (silenceStartTime === 0) {
          silenceStartTime = now;
        } else if (now - silenceStartTime >= SILENCE_DURATION_MS) {
          if (!isSkippingSilence) {
            startSkipping(video);
          }
        }
      } else {
        silenceStartTime = 0;
        if (isSkippingSilence) {
          stopSkipping(video);
        }
      }
    }, 100);
  }

  function startSkipping(video) {
    isSkippingSilence = true;
    normalSpeed = video.playbackRate;
    if (normalSpeed >= MAX_SPEED) return;

    currentSilenceSpeed = Math.max(START_SPEED, normalSpeed);
    video.playbackRate = currentSilenceSpeed;

    if (window.HUDManager) {
      window.HUDManager.show(`⏩ Auto-Skipping Silence (${currentSilenceSpeed.toFixed(1)}x Ramping...)`, 800);
    }

    clearInterval(rampInterval);
    rampInterval = setInterval(() => {
      if (!isSkippingSilence || !isEnabled || video.paused || video.ended) {
        clearInterval(rampInterval);
        return;
      }

      if (currentSilenceSpeed < MAX_SPEED) {
        currentSilenceSpeed = Math.min(MAX_SPEED, Math.round((currentSilenceSpeed + RAMP_INCREMENT) * 10) / 10);
        video.playbackRate = currentSilenceSpeed;
        if (window.HUDManager) {
          window.HUDManager.show(`⏩ Auto-Skipping Silence (${currentSilenceSpeed.toFixed(1)}x)`, 600);
        }
      } else {
        clearInterval(rampInterval);
      }
    }, 1000);
  }

  function stopSkipping(video) {
    isSkippingSilence = false;
    silenceStartTime = 0;
    currentSilenceSpeed = START_SPEED;
    clearInterval(rampInterval);

    const v = video || document.querySelector('video');
    if (v && normalSpeed) {
      v.playbackRate = normalSpeed;
      if (window.HUDManager) {
        window.HUDManager.show(`🗣️ Speech Resumed (${normalSpeed.toFixed(2)}x)`, 800);
      }
    }
  }

  function toggleAutoSkip() {
    isEnabled = !isEnabled;
    if (isContextValid() && chrome.storage && chrome.storage.local) {
      try { chrome.storage.local.set({ autoSkipSilence: isEnabled }); } catch (e) {}
    }
    if (window.HUDManager) {
      window.HUDManager.show(`⏩ Auto-Skip Silence: ${isEnabled ? 'ON' : 'OFF'}`);
    }
    if (!isEnabled) stopSkipping();
  }

  // Keyboard Shortcut: Alt + S
  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    if (
      ['INPUT', 'TEXTAREA'].includes(active?.tagName) ||
      active?.isContentEditable
    ) {
      return;
    }

    if (e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      toggleAutoSkip();
    }
  });

  // Attach to video
  function attach() {
    const video = document.querySelector('video');
    if (video) {
      video.addEventListener('play', () => {
        initAudioAnalysis(video);
      }, { once: true });

      if (!video.paused) {
        initAudioAnalysis(video);
      }
    }
  }

  loadSettings();
  const attachInterval = setInterval(() => {
    if (!isContextValid()) {
      clearInterval(attachInterval);
      return;
    }
    attach();
  }, 1000);
})();
