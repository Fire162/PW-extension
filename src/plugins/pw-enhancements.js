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

  function isOverviewPage() {
    return (
      window.location.href.includes('batch-overview') &&
      window.location.href.includes('#Subjects_2')
    );
  }

  function isWatchPage() {
    return (
      window.location.pathname.includes('/watch') ||
      (window.location.search.includes('scheduleId=') && (window.location.search.includes('parentId=') || window.location.search.includes('batchId=')))
    );
  }

  function getWatchParams() {
    try {
      const sp = new URLSearchParams(window.location.search);
      const batchId = sp.get('parentId') || sp.get('batchId');
      const subjectId = sp.get('batchSubjectId') || sp.get('subjectSlug') || sp.get('subjectId');
      const scheduleId = sp.get('scheduleId') || sp.get('childId');
      if (batchId && subjectId && scheduleId) {
        return { batchId, subjectId, scheduleId };
      }
    } catch (e) {}
    return null;
  }

  function formatTime(sec) {
    const s = Math.floor(Number(sec) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
    }
    return `${m}:${String(sc).padStart(2, '0')}`;
  }

  function getSlideImageUrl(slide) {
    if (slide.img && slide.img.baseUrl && slide.img.key) {
      return slide.img.baseUrl + slide.img.key;
    }
    if (slide.imageUrl) {
      if (slide.imageUrl.startsWith('http://') || slide.imageUrl.startsWith('https://')) {
        return slide.imageUrl;
      }
      return 'https://static.pw.live/' + slide.imageUrl.replace(/^\/+/, '');
    }
    return '';
  }

  // Slides State Cache
  let slidesCache = null; // { scheduleId, topic, slides: [...] }
  let drawerOpen = false;
  let currentActiveSlideIdx = -1;

  async function fetchSlides(params) {
    if (slidesCache && slidesCache.scheduleId === params.scheduleId) {
      return slidesCache;
    }

    const apiUrl = `https://pw.abhinav.eu.cc/api/pw/v1/batches/${params.batchId}/subject/${params.subjectId}/schedule/${params.scheduleId}/slides`;
    console.log('[PW Extension] Fetching slides from:', apiUrl);

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch slides (HTTP ${res.status})`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.message || 'Invalid slides data response');
    }

    slidesCache = {
      scheduleId: params.scheduleId,
      topic: json.data.topic || '',
      slides: json.data.slides || []
    };

    if (slidesCache.topic) {
      document.title = slidesCache.topic;
    }

    return slidesCache;
  }

  // Top-Left Actions Bar
  function ensureActionsBar() {
    let bar = document.getElementById('pw-actions-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pw-actions-bar';
      document.body.appendChild(bar);
    }
    return bar;
  }

  let pwSlidesEnabled = true;

  function loadSlidesSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['pwSlidesEnabled'], result => {
          pwSlidesEnabled = result.pwSlidesEnabled !== false;
          ensureSlidesButton();
        });
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local' && changes.pwSlidesEnabled !== undefined) {
            pwSlidesEnabled = changes.pwSlidesEnabled.newValue !== false;
            ensureSlidesButton();
          }
        });
      }
    } catch (e) {}
  }
  loadSlidesSettings();

  // Slides Button
  function ensureSlidesButton() {
    if (!isWatchPage() || !pwSlidesEnabled) {
      const btn = document.getElementById('pw-slides-btn');
      if (btn) btn.remove();
      return;
    }

    const params = getWatchParams();
    if (!params) return;

    const bar = ensureActionsBar();
    let btn = document.getElementById('pw-slides-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'pw-slides-btn';
      btn.innerHTML = '🖼️ Slides';
      btn.title = 'Open lecture slides & timeline (D)';
      btn.addEventListener('click', () => toggleSlidesDrawer());
      bar.appendChild(btn);
    }
  }

  // Lightbox Zoom Viewer
  function openLightbox(imgUrl) {
    let lb = document.getElementById('pws-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'pws-lightbox';
      lb.innerHTML = `
        <button class="pws-lightbox-close" title="Close (Esc)">✕</button>
        <img id="pws-lightbox-img" src="" alt="Slide Zoom" />
      `;
      lb.querySelector('.pws-lightbox-close').addEventListener('click', () => {
        lb.classList.remove('open');
      });
      lb.addEventListener('click', e => {
        if (e.target === lb) lb.classList.remove('open');
      });
      document.body.appendChild(lb);
    }
    const img = lb.querySelector('#pws-lightbox-img');
    img.src = imgUrl;
    lb.classList.add('open');
  }

  // Slides Drawer
  function renderSlidesDrawer(data) {
    let drawer = document.getElementById('pw-slides-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'pw-slides-drawer';
      document.body.appendChild(drawer);
    }

    const slides = data.slides || [];
    const countText = `${slides.length} Slide${slides.length === 1 ? '' : 's'}`;
    const topic = data.topic || 'Lecture Slides';

    drawer.innerHTML = `
      <div class="pws-header">
        <div class="pws-title-row">
          <div class="pws-title-wrap">
            <span class="pws-title">🖼️ Lecture Slides</span>
            <span class="pws-badge" id="pws-count-badge">${countText}</span>
          </div>
          <button class="pws-close-btn" id="pws-drawer-close" title="Close (D or Esc)">✕</button>
        </div>
        <div class="pws-subtitle" title="${topic}">${topic}</div>
        <div class="pws-search-bar">
          <span class="pws-search-icon">🔍</span>
          <input type="text" class="pws-search-input" id="pws-search" placeholder="Search slides (e.g. 5, Question)..." />
        </div>
      </div>
      <div class="pws-body" id="pws-cards-container"></div>
    `;

    drawer.querySelector('#pws-drawer-close').addEventListener('click', () => {
      closeSlidesDrawer();
    });

    const searchInput = drawer.querySelector('#pws-search');
    searchInput.addEventListener('input', e => {
      filterSlideCards(e.target.value.toLowerCase().trim());
    });

    populateSlideCards(slides);
  }

  function populateSlideCards(slides) {
    const container = document.getElementById('pws-cards-container');
    if (!container) return;
    container.innerHTML = '';

    if (!slides || slides.length === 0) {
      container.innerHTML = '<div class="pws-empty-msg">No slides available for this lecture.</div>';
      return;
    }

    slides.forEach((slide, index) => {
      const card = document.createElement('div');
      card.className = 'pws-slide-card';
      card.dataset.idx = index;
      card.dataset.timestamp = slide.timeStamp || 0;
      card.dataset.name = (slide.name || `slide ${slide.serialNumber || index + 1}`).toLowerCase();

      const imgUrl = getSlideImageUrl(slide);
      const timeStr = formatTime(slide.timeStamp);
      const displayName = slide.name || `Slide ${slide.serialNumber || index + 1}`;

      card.innerHTML = `
        <span class="pws-slide-cur-badge">▶ Current</span>
        <img class="pws-slide-img" src="${imgUrl}" alt="${displayName}" loading="lazy" onerror="this.style.background='#161e2e'" />
        <div class="pws-slide-overlay">
          <span class="pws-slide-title" title="${displayName}">${displayName}</span>
          <div class="pws-slide-actions">
            <span class="pws-slide-time">▶ ${timeStr}</span>
            <button class="pws-slide-open-btn" title="Open High-Res in New Tab">↗</button>
          </div>
        </div>
      `;

      // Jump video on card click
      card.addEventListener('click', e => {
        if (e.target.closest('.pws-slide-open-btn')) {
          e.stopPropagation();
          if (imgUrl) window.open(imgUrl, '_blank');
          return;
        }

        const video = document.querySelector('video');
        if (video) {
          video.currentTime = Number(slide.timeStamp || 0);
          if (video.paused) video.play();
          if (window.HUDManager) {
            window.HUDManager.show(`⏩ Jumped to ${displayName} (${timeStr})`);
          }
          highlightCurrentSlide(video.currentTime);
        }
      });

      container.appendChild(card);
    });

    const video = document.querySelector('video');
    if (video) {
      highlightCurrentSlide(video.currentTime);
    }
  }

  function filterSlideCards(query) {
    const cards = document.querySelectorAll('.pws-slide-card');
    let visibleCount = 0;
    cards.forEach(card => {
      const name = card.dataset.name || '';
      const idx = String(Number(card.dataset.idx || 0) + 1);
      const match = !query || name.includes(query) || idx === query || idx.includes(query);
      card.style.display = match ? 'block' : 'none';
      if (match) visibleCount++;
    });

    let emptyMsg = document.getElementById('pws-empty-search');
    if (visibleCount === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.id = 'pws-empty-search';
        emptyMsg.className = 'pws-empty-msg';
        emptyMsg.textContent = 'No slides matched your search.';
        document.getElementById('pws-cards-container')?.appendChild(emptyMsg);
      }
    } else if (emptyMsg) {
      emptyMsg.remove();
    }
  }

  function highlightCurrentSlide(currentTime, scrollToCenter = false) {
    if (!slidesCache || !slidesCache.slides || !slidesCache.slides.length) return;
    const slides = slidesCache.slides;

    let activeIdx = -1;
    for (let i = 0; i < slides.length; i++) {
      const ts = Number(slides[i].timeStamp || 0);
      if (ts <= currentTime) {
        activeIdx = i;
      } else {
        break;
      }
    }

    // Fallback: If currentTime is before the first slide, choose slide 0
    if (activeIdx === -1 && slides.length > 0) {
      activeIdx = 0;
    }

    const changed = activeIdx !== currentActiveSlideIdx;
    currentActiveSlideIdx = activeIdx;

    const cards = document.querySelectorAll('.pws-slide-card');
    cards.forEach((card, i) => {
      if (i === activeIdx) {
        card.classList.add('active-slide');
        if (drawerOpen && (changed || scrollToCenter)) {
          // Scroll and keep the active slide in the middle of the drawer
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        card.classList.remove('active-slide');
      }
    });
  }

  async function toggleSlidesDrawer() {
    const drawer = document.getElementById('pw-slides-drawer');
    if (drawer && drawer.classList.contains('open')) {
      closeSlidesDrawer();
      return;
    }

    const params = getWatchParams();
    if (!params) {
      if (window.HUDManager) window.HUDManager.show('⚠️ Not on a lecture watch page');
      return;
    }

    const btn = document.getElementById('pw-slides-btn');
    if (btn) {
      btn.classList.add('loading');
      btn.innerHTML = '⏳ Loading...';
    }

    try {
      const data = await fetchSlides(params);
      renderSlidesDrawer(data);
      const d = document.getElementById('pw-slides-drawer');
      if (d) {
        d.classList.add('open');
        drawerOpen = true;

        // Automatically scroll to the closest active slide and place it in the center
        const video = document.querySelector('video');
        const curTime = video ? video.currentTime : 0;
        setTimeout(() => {
          highlightCurrentSlide(curTime, true);
        }, 120);
      }
    } catch (err) {
      console.error('[PW Extension] Error loading slides:', err);
      if (window.HUDManager) {
        window.HUDManager.show('❌ Failed to load slides: ' + (err.message || 'Error'));
      }
    } finally {
      if (btn) {
        btn.classList.remove('loading');
        btn.innerHTML = '🖼️ Slides';
      }
    }
  }

  function closeSlidesDrawer() {
    const drawer = document.getElementById('pw-slides-drawer');
    if (drawer) drawer.classList.remove('open');
    drawerOpen = false;
  }

  function hookVideoTimeUpdates() {
    const video = document.querySelector('video');
    if (video && !video.dataset.pwSlidesHooked) {
      video.dataset.pwSlidesHooked = 'true';
      video.addEventListener('timeupdate', () => {
        highlightCurrentSlide(video.currentTime);
      });
    }
  }

  function runOverviewEnhancements() {
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

  async function updatePageTopicTitle() {
    const params = getWatchParams();
    if (!params) return;

    if (slidesCache && slidesCache.topic) {
      if (document.title !== slidesCache.topic) {
        document.title = slidesCache.topic;
      }
      return;
    }

    try {
      const data = await fetchSlides(params);
      if (data && data.topic) {
        document.title = data.topic;
      }
    } catch (e) {
      // Quietly ignore if API is unavailable or challenged
    }
  }

  function runWatchEnhancements() {
    ensureSlidesButton();
    hookVideoTimeUpdates();
    updatePageTopicTitle();
  }

  function runEnhancements() {
    if (isOverviewPage()) {
      runOverviewEnhancements();
    }
    if (isWatchPage()) {
      runWatchEnhancements();
    }
  }

  // Helper to detect if user is typing in any form control or editable element
  function isTyping(e) {
    const active = document.activeElement;
    const target = e?.target;

    if (e && typeof e.composedPath === 'function') {
      const path = e.composedPath();
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        if (el && el.nodeType === 1) {
          const tag = el.tagName;
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
          if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
          const role = el.getAttribute('role');
          if (['textbox', 'searchbox', 'combobox'].includes(role)) return true;
        }
      }
    }

    let cur = active;
    while (cur && cur.shadowRoot && cur.shadowRoot.activeElement) {
      cur = cur.shadowRoot.activeElement;
    }
    if (cur) {
      const tag = cur.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
      if (cur.isContentEditable || cur.getAttribute('contenteditable') === 'true') return true;
      const role = cur.getAttribute('role');
      if (['textbox', 'searchbox', 'combobox'].includes(role)) return true;
    }

    if (target && target.nodeType === 1) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
      if (target.isContentEditable || (target.closest && target.closest('[contenteditable="true"], input, textarea, select, [role="textbox"], [role="searchbox"]'))) {
        return true;
      }
    }

    return false;
  }

  // PW Platform specific shortcuts
  document.addEventListener('keydown', e => {
    // Escape -> Close Drawer or Lightbox (works even if typing in search)
    if (e.key === 'Escape') {
      const lb = document.getElementById('pws-lightbox');
      if (lb && lb.classList.contains('open')) {
        lb.classList.remove('open');
        return;
      }
      if (drawerOpen) {
        closeSlidesDrawer();
        return;
      }
    }

    if (isTyping(e)) {
      return;
    }

    // 'd' or 'D' (or Shift + S) -> Toggle Slides Drawer
    if (
      ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.altKey && !e.metaKey) ||
      (e.shiftKey && (e.key === 'S' || e.key === 's') && !e.ctrlKey && !e.altKey && !e.metaKey)
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      toggleSlidesDrawer();
      return;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) {
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
    if (e.key === '/') {
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

  function checkPdfRedirect() {
    if (location.href.includes('/study-v2/notes?pdf=')) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const pdfUrl = urlParams.get('pdf');
        if (pdfUrl) {
          window.location.replace(pdfUrl);
          return true;
        }
      } catch (e) {
        console.error('Error parsing PDF URL', e);
      }
    }
    return false;
  }

  checkPdfRedirect();

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      slidesCache = null;
      closeSlidesDrawer();
      if (!checkPdfRedirect()) {
        setTimeout(runEnhancements, 800);
      }
    }
  }, 1000);

  console.log('✅ PW Enhancements Plugin active');
})();
