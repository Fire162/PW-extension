/**
 * QuickNotes - Adds a small glass liquid button at the top-left corner
 * to quickly open lecture notes from localStorage.PDF.
 *
 * Configurable from the dashboard settings.
 */
(function () {
  'use strict';

  let isEnabled = false;
  let btnEl = null;

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
      chrome.storage.local.get(['quickNotesEnabled'], result => {
        if (!isContextValid()) return;
        isEnabled = !!result.quickNotesEnabled;
        updateButtonVisibility();
      });

      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (!isContextValid()) return;
        if (namespace === 'local' && changes.quickNotesEnabled !== undefined) {
          isEnabled = !!changes.quickNotesEnabled.newValue;
          updateButtonVisibility();
        }
      });
    } catch (e) {}
  }

  function createButton() {
    if (btnEl) return btnEl;

    btnEl = document.createElement('button');
    btnEl.id = 'quick-notes-btn';
    btnEl.innerHTML = '📋 Notes';
    btnEl.title = 'Open lecture notes PDF instantly';
    
    btnEl.addEventListener('click', () => {
      try {
        const pdfDataStr = document.documentElement.getAttribute('data-pdf-info');
        if (pdfDataStr) {
          const pdfData = JSON.parse(pdfDataStr);
          if (pdfData && pdfData.src) {
            window.open(pdfData.src, '_blank');
          } else {
            alert('No valid PDF notes source found.');
          }
        } else {
          alert('Notes not loaded yet or unavailable for this video.');
        }
      } catch (e) {
        console.error('QuickNotes: Error opening PDF', e);
      }
    });

    document.body.appendChild(btnEl);
    return btnEl;
  }

  function updateButtonVisibility() {
    const pdfDataStr = document.documentElement.getAttribute('data-pdf-info');

    if (isEnabled && pdfDataStr) {
      createButton();
      if (btnEl) btnEl.style.display = 'inline-flex';
    } else {
      if (btnEl) {
        btnEl.style.display = 'none';
      }
    }
  }

  // Run the initialization
  loadSettings();

  // Monitor the data-pdf-info attribute for changes
  const observer = new MutationObserver(() => {
    updateButtonVisibility();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-pdf-info']
  });

  // Periodically check in case of SPA page changes
  setInterval(updateButtonVisibility, 1500);

})();
