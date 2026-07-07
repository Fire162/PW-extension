/**
 * QuickNotes Main World Bridge
 * Runs directly in the host webpage's context (world: "MAIN") to safely
 * read the page's localStorage without violating Content Security Policy (CSP).
 */
(function () {
  'use strict';

  function checkPDF() {
    try {
      const pdfData = localStorage.getItem('PDF');
      if (pdfData) {
        document.documentElement.setAttribute('data-pdf-info', pdfData);
      } else {
        document.documentElement.removeAttribute('data-pdf-info');
      }
    } catch (e) {}
  }

  // Initial check
  checkPDF();

  // Listen for storage events (if PDF changes in other scripts/tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === 'PDF') {
      checkPDF();
    }
  });

  // Periodically check in case of SPA page navigations that modify localStorage locally
  setInterval(checkPDF, 1500);
})();
