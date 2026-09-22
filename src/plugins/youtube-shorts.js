/**
 * YouTube Shorts & Playables Remover Plugin
 * Scoped content script for YouTube.
 * Dynamically hides/unhides Shorts and Playables based on extension settings.
 */
(function () {
  'use strict';

  const HIDDEN_CLASS = 'ysr-console-hidden';
  let isEnabled = false;
  let observer = null;
  let scheduled = false;

  const tag = el => el?.classList.add(HIDDEN_CLASS);

  // Inject hide style
  function injectStyle() {
    if (!document.getElementById('ysr-console-style')) {
      const style = document.createElement('style');
      style.id = 'ysr-console-style';
      style.textContent = `
        .${HIDDEN_CLASS} {
          display: none !important;
        }
      `;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(style);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          (document.head || document.documentElement)?.appendChild(style);
        }, { once: true });
      }
    }
  }

  function markShortsAndPlayables() {
    if (!isEnabled) return;

    // Shorts in sidebar (expanded and collapsed mini-guide)
    document.querySelectorAll("a#endpoint[title='Shorts'], ytd-mini-guide-entry-renderer[aria-label='Shorts'], ytd-guide-entry-renderer a[title='Shorts']").forEach(el => {
      tag(el.closest("ytd-guide-entry-renderer") || el.closest("ytd-mini-guide-entry-renderer") || el);
    });

    // Shorts shelves — aria-label
    document.querySelectorAll("ytd-rich-shelf-renderer").forEach(shelf => {
      const btn = shelf.querySelector("button[aria-label*='Shorts']");
      if (btn) tag(shelf.closest("div#dismissible") || shelf);
    });

    // Shorts shelves — title
    document.querySelectorAll("ytd-rich-shelf-renderer").forEach(shelf => {
      const title = shelf.querySelector("#title");
      if (title && title.textContent.trim() === "Shorts") {
        tag(shelf.closest("div#dismissible") || shelf);
      }
    });

    // YouTube Playables
    document.querySelectorAll("ytd-rich-section-renderer").forEach(section => {
      const title = section.querySelector("#title");
      if (title && title.textContent.includes("YouTube Playables")) {
        tag(section);
      }
    });

    // Shorts remixing shelf on watch pages
    document.querySelectorAll("ytd-reel-shelf-renderer").forEach(shelf => {
      const title = shelf.querySelector("#title");
      if (title && title.textContent.includes("Shorts")) {
        tag(shelf);
      }
    });

    // Shorts search filter tab
    document.querySelectorAll("button[role='tab']").forEach(tab => {
      const label = tab.querySelector("div");
      if (label && label.textContent.trim() === "Shorts") {
        tag(tab);
      }
    });

    // Shorts shelf in search results
    document.querySelectorAll("grid-shelf-view-model").forEach(shelf => {
      const header = shelf.querySelector("span");
      if (header && header.textContent.trim() === "Shorts") {
        tag(shelf);
      }
    });
  }

  function schedule() {
    if (!isEnabled || scheduled) return;

    scheduled = true;

    setTimeout(() => {
      scheduled = false;
      if (isEnabled) {
        markShortsAndPlayables();
      }
    }, 50);
  }

  function onVisibilityChange() {
    if (!document.hidden && isEnabled) schedule();
  }

  function startObserver() {
    if (!observer) {
      observer = new MutationObserver(schedule);
    }
    const root = document.documentElement;
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (isEnabled && observer && document.documentElement) {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
          markShortsAndPlayables();
        }
      }, { once: true });
    }
  }

  function enableRemover() {
    if (isEnabled) return;
    isEnabled = true;

    injectStyle();
    markShortsAndPlayables();
    startObserver();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('yt-navigate-finish', schedule);

    // Store references so user/developer can disable or rescan from devtools
    window.__ysr = {
      observer,
      cleanup: disableRemover,
      rescan: markShortsAndPlayables
    };

    console.log('YouTube Shorts & Playables remover enabled.');
  }

  function disableRemover() {
    if (!isEnabled && !window.__ysr) return;
    isEnabled = false;

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('yt-navigate-finish', schedule);

    document
      .querySelectorAll('.' + HIDDEN_CLASS)
      .forEach(el => el.classList.remove(HIDDEN_CLASS));

    document.getElementById('ysr-console-style')?.remove();

    delete window.__ysr;
    console.log('YouTube Shorts & Playables remover disabled.');
  }

  // Load state from chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['hideYouTubeShorts'], result => {
      if (result.hideYouTubeShorts) {
        enableRemover();
      }
    });

    // Real-time toggle listener across all open YouTube tabs
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.hideYouTubeShorts !== undefined) {
        if (changes.hideYouTubeShorts.newValue) {
          enableRemover();
        } else {
          disableRemover();
        }
      }
    });
  }

  // Direct runtime messaging fallback
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request && request.action === 'TOGGLE_YT_SHORTS') {
        if (request.enabled) {
          enableRemover();
        } else {
          disableRemover();
        }
        sendResponse({ success: true, enabled: isEnabled });
      }
    });
  }
})();
