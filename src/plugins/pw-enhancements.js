/**
 * PhysicsWallah Platform Enhancements Plugin
 * Scoped script for *.pw.live domains.
 */
(function () {
  'use strict';

  // Configurable teacher names to filter out
  const removeTeachers = [
    'rahul yadav',
    'sachin jakhar',
    'vijay kumar tripathi',
    'ashutosh gautam',
    'amitabh sharma',
    'pankaj sijariya'
  ];

  function isTargetPage() {
    return (
      window.location.href.includes('batch-overview') &&
      window.location.href.includes('#Subjects_2')
    );
  }

  function runEnhancements() {
    if (!isTargetPage()) return;

    // Remove unwanted teacher cards
    document.querySelectorAll('.subjectCard-Ytcdxf').forEach(el => {
      const text = el.innerText.toLowerCase();
      if (removeTeachers.some(name => text.includes(name))) {
        el.remove();
      }
    });

    // Inject custom Rohit Agrawal card
    const grid = document.querySelector('.subjectGrid-xLWQXl');

    if (grid && !document.getElementById('rohit-card')) {
      const newCard = document.createElement('div');
      newCard.id = 'rohit-card';
      newCard.className = 'subjectCard-Ytcdxf';
      newCard.style.cursor = 'pointer';

      newCard.innerHTML = `
        <div class="subjectContent-YDbOw6">
          <div class="subjectIcon-w538he">Or</div>
          <div class="_root_3yr8m_1 _subHeading_3yr8m_54 _semi-bold_3yr8m_21 _none_3yr8m_14 subjectText-BV4W9g">
            Organic Chemistry By Rohit Agrawal
          </div>
        </div>
      `;

      newCard.onclick = () => {
        window.location.href =
          'https://www.pw.live/study-v2/batches/6779345c20fa0756e4a7fd08/khazana/62cd3a81c521a200190acaca/62cd3aa091598500118968bf/69c27194597749a9ded81368/khazana-topics?chapterName=Organic+Chemistry+(2026)&isPurchased=true&categoryName=Complete+Chemistry+-+12th&teacherId=637cc360a3039607af5e2524&year=2026';
      };

      grid.appendChild(newCard);
      grid.style.gridTemplateColumns = '1fr';
      grid.style.rowGap = '12px';
    }
  }

  // PW Platform specific shortcuts
  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    if (
      ['INPUT', 'TEXTAREA'].includes(active?.tagName) ||
      active?.isContentEditable
    ) {
      return;
    }

    // '\' -> Trigger Poll SVG
    if (e.key === '\\') {
      e.preventDefault();
      e.stopImmediatePropagation();
      document
        .querySelector('path[d^="M10.2993 28.3004"]')
        ?.closest('svg')
        ?.parentElement?.click();
      return;
    }

    // "'" -> Trigger Chat SVG
    if (e.key === "'") {
      e.preventDefault();
      e.stopImmediatePropagation();
      document
        .querySelector('path[d^="M26.982 21.097"]')
        ?.closest('svg')
        ?.parentElement?.click();
      return;
    }

    // '/' -> Trigger Poll Icon element
    if (e.key === '/' && !e.ctrlKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      document.getElementById('poll-icon')?.click();
      return;
    }
  });

  // Dynamic DOM Observer for SPA navigation
  const observer = new MutationObserver(() => {
    runEnhancements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  runEnhancements();

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(runEnhancements, 1000);
    }
  }, 1000);

  console.log('✅ PW Enhancements Plugin active');
})();
