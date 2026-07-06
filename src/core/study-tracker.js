/**
 * StudyTracker - Auto Study Hour Calculator
 * Tracks real study time, speed-adjusted lecture coverage, problem solving time,
 * daily goals, study streaks, and platform breakdowns.
 */
(function () {
  'use strict';

  function isContextValid() {
    try {
      return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDomainName() {
    try {
      const host = window.location.hostname;
      if (host.includes('pw.live')) return 'PhysicsWallah';
      if (host.includes('youtube.com')) return 'YouTube';
      if (host.includes('coursera.org')) return 'Coursera';
      if (host.includes('udemy.com')) return 'Udemy';
      return host.replace('www.', '');
    } catch (e) {
      return 'Other';
    }
  }

  let trackerData = {
    dailyGoalHours: 6.0,
    streakDays: 0,
    lastActiveDate: '',
    history: {} // { 'YYYY-MM-DD': { realSec: 0, coverageSec: 0, questionSec: 0, platforms: {} } }
  };

  let lastTrackTime = Date.now();
  let isIdle = false;
  let idleTimer = null;

  function resetIdleTimer() {
    isIdle = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      isIdle = true;
    }, 5 * 60 * 1000); // 5 mins idle timeout
  }

  // Activity listeners to detect user presence
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  function loadData(callback) {
    if (!isContextValid()) return;
    try {
      chrome.storage.local.get(['studyTrackerData'], result => {
        if (!isContextValid()) return;
        if (result && result.studyTrackerData) {
          trackerData = Object.assign(trackerData, result.studyTrackerData);
        }
        updateStreak();
        if (callback) callback();
      });
    } catch (e) {}
  }

  function saveData() {
    if (!isContextValid()) return;
    try {
      chrome.storage.local.set({ studyTrackerData: trackerData });
    } catch (e) {}
  }

  function updateStreak() {
    const today = getTodayString();
    if (!trackerData.history) trackerData.history = {};

    if (!trackerData.lastActiveDate) {
      if (trackerData.history[today] && trackerData.history[today].realSec > 300) {
        trackerData.streakDays = 1;
        trackerData.lastActiveDate = today;
      }
      return;
    }

    if (trackerData.lastActiveDate === today) return;

    const lastDate = new Date(trackerData.lastActiveDate);
    const currDate = new Date(today);
    const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      if (trackerData.history[today] && trackerData.history[today].realSec > 300) {
        trackerData.streakDays += 1;
        trackerData.lastActiveDate = today;
      }
    } else if (diffDays > 1) {
      // Streak broken
      if (trackerData.history[today] && trackerData.history[today].realSec > 300) {
        trackerData.streakDays = 1;
        trackerData.lastActiveDate = today;
      } else {
        trackerData.streakDays = 0;
      }
    }
  }

  function trackActiveTime() {
    if (!isContextValid()) return;

    const video = document.querySelector('video');
    if (!video || video.paused || video.ended || isIdle) {
      lastTrackTime = Date.now();
      return;
    }

    const now = Date.now();
    const elapsedSec = (now - lastTrackTime) / 1000;
    lastTrackTime = now;

    if (elapsedSec <= 0 || elapsedSec > 10) return; // Ignore tab sleep jumps

    const today = getTodayString();
    if (!trackerData.history[today]) {
      trackerData.history[today] = {
        realSec: 0,
        coverageSec: 0,
        questionSec: 0,
        platforms: {}
      };
    }

    const dayData = trackerData.history[today];
    const rate = video.playbackRate || 1.0;

    dayData.realSec += elapsedSec;
    dayData.coverageSec += elapsedSec * rate;

    const domain = getDomainName();
    if (!dayData.platforms[domain]) dayData.platforms[domain] = 0;
    dayData.platforms[domain] += elapsedSec;

    updateStreak();
    saveData();
  }

  // Poll tracking every 3 seconds
  loadData(() => {
    resetIdleTimer();
    setInterval(trackActiveTime, 3000);
    console.log('✅ Auto Study Hour Calculator active');
  });
})();
