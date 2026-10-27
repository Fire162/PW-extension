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

  function isSubjectTopicsPage() {
    return (
      window.location.pathname.includes('/subject-topics') ||
      window.location.href.includes('subject-topics')
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
      chapterId: json.data.chapterId || json.data.topicId || '',
      dppScheduleId: json.data.dppScheduleId || '',
      homeworkIds: json.data.homeworkIds || [],
      exerciseIds: json.data.exerciseIds || [],
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

  function syncBufferTarget(bufferMin) {
    const min = Number(bufferMin) || 2;
    const bufferSec = Math.round(min * 60);
    document.documentElement.dataset.pwBufferSec = String(bufferSec);
    window.dispatchEvent(new CustomEvent('pw-set-buffer-target', { detail: { bufferSec, min } }));
  }

  function loadBufferSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['pwBufferMinutes'], result => {
          const min = result.pwBufferMinutes !== undefined ? Number(result.pwBufferMinutes) : 2;
          syncBufferTarget(min);
        });
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local' && changes.pwBufferMinutes !== undefined) {
            syncBufferTarget(changes.pwBufferMinutes.newValue);
          }
        });
      }
    } catch (e) {}
  }
  loadBufferSettings();

  // Chapter Lectures & Recommendations Cache
  let chapterCache = null; // { scheduleId, chapterId, lectures: [], currentLecture: null, nextLecture: null, dppScheduleId: '' }
  let playlistDrawerOpen = false;
  let endNudgeDismissed = false;

  async function fetchChapterLectures(params) {
    if (chapterCache && chapterCache.scheduleId === params.scheduleId) {
      return chapterCache;
    }

    let slidesData = slidesCache;
    if (!slidesData || slidesData.scheduleId !== params.scheduleId) {
      try {
        slidesData = await fetchSlides(params);
      } catch (e) {
        console.warn('[PW Extension] Slides preload failed:', e);
      }
    }

    const chapterId = slidesData?.chapterId || '';
    const token = localStorage.getItem('token') || '';

    let lectures = [];
    if (chapterId && token) {
      try {
        const url = `https://api.penpencil.co/v3/batch-service/v3/batch-subject-schedules/${params.batchId}/subject/${params.subjectId}/contents?page=1&limit=50&contentType=LECTURES&tagId=${chapterId}&isPlaylist=true`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `BEARER ${token}`,
            'Accept': 'application/json'
          }
        });
        if (res.ok) {
          const json = await res.json();
          const dataArr = Array.isArray(json.data) ? json.data : (json.data?.contents || []);
          lectures = dataArr
            .filter(item => (item.type === 'LECTURE' || item.contentType === 'LECTURES' || item.scheduleType === 'RECORDED' || item.scheduleType === 'LIVE') && (item._id || item.id))
            .map(item => {
              const raw = item.data || item;
              return {
                _id: raw._id || item._id,
                topic: raw.topic || item.topic || 'Lecture',
                startTime: raw.startTime || item.startTime || 0,
                dppScheduleId: raw.dppScheduleId || item.dppScheduleId || '',
                homeworkIds: raw.homeworkIds || item.homeworkIds || [],
                exerciseIds: raw.exerciseIds || item.exerciseIds || [],
                status: raw.status || item.status || ''
              };
            })
            .sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
        }
      } catch (e) {
        console.warn('[PW Extension] PenPencil lectures fetch error:', e);
      }
    }

    const curIdx = lectures.findIndex(l => l._id === params.scheduleId);
    const currentLecture = curIdx >= 0 ? lectures[curIdx] : null;
    const nextLecture = (curIdx >= 0 && curIdx < lectures.length - 1) ? lectures[curIdx + 1] : null;
    const dppScheduleId = currentLecture?.dppScheduleId || slidesData?.dppScheduleId || '';

    chapterCache = {
      scheduleId: params.scheduleId,
      chapterId,
      lectures,
      currentLecture,
      nextLecture,
      dppScheduleId
    };

    updateActionButtonsState();
    return chapterCache;
  }

  function playNextLecture(nextItem) {
    if (!nextItem || !nextItem._id) {
      if (window.HUDManager) window.HUDManager.show('⚠️ No next lecture available in this chapter');
      return;
    }
    if (window.HUDManager) {
      window.HUDManager.show(`⏩ Playing Next: ${nextItem.topic}`);
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('scheduleId', nextItem._id);
    nextUrl.searchParams.set('childId', nextItem._id);
    nextUrl.searchParams.set('entryPoint', `SCHEDULED_CLASS_VIDEOS_${nextItem._id}`);
    window.location.href = nextUrl.toString();
  }

  function triggerNextLecture() {
    if (chapterCache?.nextLecture) {
      playNextLecture(chapterCache.nextLecture);
      return;
    }
    const params = getWatchParams();
    if (!params) return;
    fetchChapterLectures(params).then(data => {
      if (data.nextLecture) {
        playNextLecture(data.nextLecture);
      } else {
        if (window.HUDManager) window.HUDManager.show('ℹ️ This is the latest lecture in the chapter');
      }
    });
  }

  function openDpp(dppScheduleId, params) {
    if (dppScheduleId) {
      const url = `https://www.pw.live/study-v2/test/${dppScheduleId}/instructions`;
      window.open(url, '_blank');
      if (window.HUDManager) window.HUDManager.show('📝 Opening DPP Practice Test');
    } else if (params && params.batchId && params.subjectId) {
      const chapterId = chapterCache?.chapterId || slidesCache?.chapterId || '';
      const url = `https://www.pw.live/study-v2/batches/${params.batchId}/subject/${params.subjectId}/topics${chapterId ? `?topicId=${chapterId}&tab=dpp` : ''}`;
      window.open(url, '_blank');
      if (window.HUDManager) window.HUDManager.show('📝 Opening Batch DPP Section');
    } else {
      if (window.HUDManager) window.HUDManager.show('⚠️ No DPP linked to this lecture');
    }
  }

  function updateActionButtonsState() {
    const nextBtn = document.getElementById('pw-next-btn');
    if (nextBtn && chapterCache?.nextLecture) {
      nextBtn.title = `Next: ${chapterCache.nextLecture.topic} (Shift+N)`;
      nextBtn.classList.add('has-next');
    }
    const dppBtn = document.getElementById('pw-dpp-btn');
    if (dppBtn) {
      const dppId = chapterCache?.dppScheduleId || slidesCache?.dppScheduleId;
      if (dppId) {
        dppBtn.style.display = 'inline-flex';
        dppBtn.title = 'Attempt Lecture DPP';
      } else {
        dppBtn.style.display = 'none';
      }
    }
  }

  // Actions Bar Buttons (Slides, Playlist, Next Lecture, DPP)
  function ensureActionBarButtons() {
    if (!isWatchPage()) {
      const bar = document.getElementById('pw-actions-bar');
      if (bar) bar.remove();
      return;
    }

    const params = getWatchParams();
    if (!params) return;

    const bar = ensureActionsBar();

    // 1. Slides Button
    if (pwSlidesEnabled) {
      let slidesBtn = document.getElementById('pw-slides-btn');
      if (!slidesBtn) {
        slidesBtn = document.createElement('button');
        slidesBtn.id = 'pw-slides-btn';
        slidesBtn.className = 'pw-action-pill';
        slidesBtn.innerHTML = '🖼️ Slides';
        slidesBtn.title = 'Open lecture slides & timeline (D)';
        slidesBtn.addEventListener('click', () => toggleSlidesDrawer());
        bar.appendChild(slidesBtn);
      }
    } else {
      document.getElementById('pw-slides-btn')?.remove();
    }

    // 2. Playlist Button
    let playlistBtn = document.getElementById('pw-playlist-btn');
    if (!playlistBtn) {
      playlistBtn = document.createElement('button');
      playlistBtn.id = 'pw-playlist-btn';
      playlistBtn.className = 'pw-action-pill';
      playlistBtn.innerHTML = '📋 Playlist';
      playlistBtn.title = 'Open Chapter Playlist (P)';
      playlistBtn.addEventListener('click', () => togglePlaylistDrawer());
      bar.appendChild(playlistBtn);
    }

    // 3. Next Lecture Button
    let nextBtn = document.getElementById('pw-next-btn');
    if (!nextBtn) {
      nextBtn = document.createElement('button');
      nextBtn.id = 'pw-next-btn';
      nextBtn.className = 'pw-action-pill';
      nextBtn.innerHTML = '⏭️ Next';
      nextBtn.title = 'Jump to Next Lecture (Shift+N)';
      nextBtn.addEventListener('click', () => triggerNextLecture());
      bar.appendChild(nextBtn);
    }

    // 4. DPP Button
    let dppBtn = document.getElementById('pw-dpp-btn');
    if (!dppBtn) {
      dppBtn = document.createElement('button');
      dppBtn.id = 'pw-dpp-btn';
      dppBtn.className = 'pw-action-pill';
      dppBtn.innerHTML = '📝 DPP';
      dppBtn.title = 'Attempt Associated DPP';
      dppBtn.addEventListener('click', () => {
        const dppId = chapterCache?.dppScheduleId || slidesCache?.dppScheduleId;
        openDpp(dppId, params);
      });
      bar.appendChild(dppBtn);
    }

    updateActionButtonsState();
  }

  function ensureSlidesButton() {
    ensureActionBarButtons();
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

    if (playlistDrawerOpen) {
      closePlaylistDrawer();
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

  // Playlist Drawer
  function renderPlaylistDrawer(data) {
    let drawer = document.getElementById('pw-playlist-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'pw-playlist-drawer';
      document.body.appendChild(drawer);
    }

    const lectures = data.lectures || [];
    const countText = `${lectures.length} Lecture${lectures.length === 1 ? '' : 's'}`;
    const topic = slidesCache?.topic || 'Chapter Playlist';
    const curScheduleId = getWatchParams()?.scheduleId;

    drawer.innerHTML = `
      <div class="pws-header">
        <div class="pws-title-row">
          <div class="pws-title-wrap">
            <span class="pws-title">📋 Chapter Playlist</span>
            <span class="pws-badge" id="pwp-count-badge">${countText}</span>
          </div>
          <button class="pws-close-btn" id="pwp-drawer-close" title="Close (P or Esc)">✕</button>
        </div>
        <div class="pws-subtitle" title="${topic}">${topic}</div>
        <div class="pws-search-bar">
          <span class="pws-search-icon">🔍</span>
          <input type="text" class="pws-search-input" id="pwp-search" placeholder="Search lectures (e.g. 5, Part 02)..." />
        </div>
      </div>
      <div class="pws-body" id="pwp-cards-container"></div>
    `;

    drawer.querySelector('#pwp-drawer-close').addEventListener('click', () => {
      closePlaylistDrawer();
    });

    const searchInput = drawer.querySelector('#pwp-search');
    searchInput.addEventListener('input', e => {
      filterPlaylistCards(e.target.value.toLowerCase().trim());
    });

    populatePlaylistCards(lectures, curScheduleId);
  }

  function populatePlaylistCards(lectures, curScheduleId) {
    const container = document.getElementById('pwp-cards-container');
    if (!container) return;
    container.innerHTML = '';

    if (!lectures || lectures.length === 0) {
      container.innerHTML = '<div class="pws-empty-msg">No playlist lectures found in this chapter.</div>';
      return;
    }

    let activeCardEl = null;

    lectures.forEach((lec, index) => {
      const card = document.createElement('div');
      card.className = 'pwp-lecture-card';
      const isCurrent = lec._id === curScheduleId;
      if (isCurrent) card.classList.add('active-lecture');

      card.dataset.idx = index;
      card.dataset.id = lec._id;
      card.dataset.name = (lec.topic || '').toLowerCase();

      const lecNum = String(index + 1).padStart(2, '0');
      const displayName = lec.topic || `Lecture ${lecNum}`;

      card.innerHTML = `
        <div class="pwp-card-left">
          <span class="pwp-num-badge">${lecNum}</span>
        </div>
        <div class="pwp-card-center">
          <div class="pwp-card-title" title="${displayName}">${displayName}</div>
          <div class="pwp-card-meta">
            ${isCurrent ? '<span class="pwp-badge-current">▶ Playing Now</span>' : '<span class="pwp-badge-lecture">Lecture</span>'}
            ${lec.dppScheduleId ? '<span class="pwp-badge-dpp" title="Attempt DPP">📝 DPP</span>' : ''}
          </div>
        </div>
        <div class="pwp-card-right">
          ${isCurrent ? '' : '<button class="pwp-play-btn" title="Watch Lecture">▶</button>'}
        </div>
      `;

      card.addEventListener('click', e => {
        if (e.target.closest('.pwp-badge-dpp')) {
          e.stopPropagation();
          openDpp(lec.dppScheduleId, getWatchParams());
          return;
        }
        if (!isCurrent) {
          playNextLecture(lec);
        }
      });

      if (isCurrent) activeCardEl = card;
      container.appendChild(card);
    });

    if (activeCardEl) {
      setTimeout(() => {
        activeCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }

  function filterPlaylistCards(query) {
    const cards = document.querySelectorAll('.pwp-lecture-card');
    let visibleCount = 0;
    cards.forEach(card => {
      const name = card.dataset.name || '';
      const idx = String(Number(card.dataset.idx || 0) + 1);
      const match = !query || name.includes(query) || idx === query || idx.includes(query);
      card.style.display = match ? 'flex' : 'none';
      if (match) visibleCount++;
    });

    let emptyMsg = document.getElementById('pwp-empty-search');
    if (visibleCount === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.id = 'pwp-empty-search';
        emptyMsg.className = 'pws-empty-msg';
        emptyMsg.textContent = 'No lectures matched your search.';
        document.getElementById('pwp-cards-container')?.appendChild(emptyMsg);
      }
    } else if (emptyMsg) {
      emptyMsg.remove();
    }
  }

  async function togglePlaylistDrawer() {
    const drawer = document.getElementById('pw-playlist-drawer');
    if (drawer && drawer.classList.contains('open')) {
      closePlaylistDrawer();
      return;
    }

    if (drawerOpen) {
      closeSlidesDrawer();
    }

    const params = getWatchParams();
    if (!params) {
      if (window.HUDManager) window.HUDManager.show('⚠️ Not on a lecture watch page');
      return;
    }

    const btn = document.getElementById('pw-playlist-btn');
    if (btn) {
      btn.classList.add('loading');
      btn.innerHTML = '⏳ Loading...';
    }

    try {
      const data = await fetchChapterLectures(params);
      renderPlaylistDrawer(data);
      const d = document.getElementById('pw-playlist-drawer');
      if (d) {
        d.classList.add('open');
        playlistDrawerOpen = true;
      }
    } catch (err) {
      console.error('[PW Extension] Error loading playlist:', err);
      if (window.HUDManager) {
        window.HUDManager.show('❌ Failed to load playlist: ' + (err.message || 'Error'));
      }
    } finally {
      if (btn) {
        btn.classList.remove('loading');
        btn.innerHTML = '📋 Playlist';
      }
    }
  }

  function closePlaylistDrawer() {
    const drawer = document.getElementById('pw-playlist-drawer');
    if (drawer) drawer.classList.remove('open');
    playlistDrawerOpen = false;
  }

  // End-of-Lecture Smart Recommendation Nudge
  function checkEndNudge(video) {
    if (endNudgeDismissed || !video || !video.duration) return;
    const progress = video.currentTime / video.duration;

    if (progress >= 0.90 || video.ended) {
      showEndNudge();
    }
  }

  function showEndNudge() {
    if (endNudgeDismissed || document.getElementById('pw-end-nudge')) return;

    const next = chapterCache?.nextLecture;
    const dppId = chapterCache?.dppScheduleId || slidesCache?.dppScheduleId;

    if (!next && !dppId) return;

    const nudge = document.createElement('div');
    nudge.id = 'pw-end-nudge';
    nudge.className = 'pw-end-nudge';

    const nextTitle = next ? (next.topic.length > 36 ? next.topic.slice(0, 36) + '...' : next.topic) : '';

    nudge.innerHTML = `
      <div class="pw-nudge-glow"></div>
      <div class="pw-nudge-header">
        <div class="pw-nudge-title-wrap">
          <span class="pw-nudge-icon">✨</span>
          <span class="pw-nudge-label">RECOMMENDED NEXT</span>
        </div>
        <button class="pw-nudge-close" id="pw-nudge-close" title="Dismiss (Esc)">✕</button>
      </div>
      <div class="pw-nudge-actions">
        ${next ? `
          <button class="pw-nudge-btn pw-nudge-primary" id="pw-nudge-next-btn" title="${next.topic}">
            <span class="pw-nudge-btn-icon">⏭️</span>
            <div class="pw-nudge-btn-text">
              <span class="pw-nudge-btn-main">Next Lecture</span>
              <span class="pw-nudge-btn-sub">${nextTitle}</span>
            </div>
          </button>
        ` : ''}
        ${dppId ? `
          <button class="pw-nudge-btn pw-nudge-secondary" id="pw-nudge-dpp-btn">
            <span class="pw-nudge-btn-icon">📝</span>
            <div class="pw-nudge-btn-text">
              <span class="pw-nudge-btn-main">Attempt DPP</span>
              <span class="pw-nudge-btn-sub">Daily Practice Problem</span>
            </div>
          </button>
        ` : ''}
      </div>
    `;

    document.body.appendChild(nudge);

    nudge.querySelector('#pw-nudge-close').addEventListener('click', () => {
      dismissEndNudge();
    });

    if (next) {
      nudge.querySelector('#pw-nudge-next-btn')?.addEventListener('click', () => {
        playNextLecture(next);
      });
    }

    if (dppId) {
      nudge.querySelector('#pw-nudge-dpp-btn')?.addEventListener('click', () => {
        openDpp(dppId, getWatchParams());
      });
    }

    requestAnimationFrame(() => {
      nudge.classList.add('visible');
    });
  }

  function dismissEndNudge() {
    endNudgeDismissed = true;
    const nudge = document.getElementById('pw-end-nudge');
    if (nudge) {
      nudge.classList.remove('visible');
      setTimeout(() => nudge.remove(), 250);
    }
  }

  function hookVideoTimeUpdates() {
    const video = document.querySelector('video');
    if (video && !video.dataset.pwHooked) {
      video.dataset.pwHooked = 'true';
      video.addEventListener('timeupdate', () => {
        highlightCurrentSlide(video.currentTime);
        checkEndNudge(video);
      });
      video.addEventListener('ended', () => {
        showEndNudge();
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

  // --- Study Material Priority Tiers Configuration ---
  const STUDY_MATERIAL_TIERS = [
    {
      tierClass: 'pw-tier-kpp',
      badgeClass: 'pw-badge-kpp',
      keywords: ['kpp', 'jee mains', 'jee replica'],
      badgeText: '⭐ PRIORITY 1'
    },
    {
      tierClass: 'pw-tier-skc',
      badgeClass: 'pw-badge-skc',
      keywords: ['skc pdf', 'skc'],
      badgeText: '📌 SKC PDF'
    },
    {
      tierClass: 'pw-tier-revision',
      badgeClass: 'pw-badge-revision',
      keywords: ['revision in 2 hours', 'revision'],
      badgeText: '⚡ REVISION'
    },
    {
      tierClass: 'pw-tier-summary',
      badgeClass: 'pw-badge-summary',
      keywords: ['summary lecture', 'summary notes', 'summary'],
      badgeText: '📝 SUMMARY'
    }
  ];

  function runSubjectTopicsEnhancements() {
    const cards = document.querySelectorAll('.topicCardContainer-fPGJwe');
    if (!cards || cards.length === 0) return;

    cards.forEach(c => {
      const text = c.innerText.toLowerCase();
      let matched = false;

      for (const tier of STUDY_MATERIAL_TIERS) {
        if (tier.keywords.some(kw => text.includes(kw))) {
          matched = true;
          STUDY_MATERIAL_TIERS.forEach(t => {
            if (t.tierClass !== tier.tierClass) c.classList.remove(t.tierClass);
          });
          c.classList.add(tier.tierClass);

          let badge = c.querySelector('.pw-tier-badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = `pw-tier-badge ${tier.badgeClass}`;
            badge.innerHTML = tier.badgeText;
            c.appendChild(badge);
          } else if (badge.innerHTML !== tier.badgeText) {
            badge.className = `pw-tier-badge ${tier.badgeClass}`;
            badge.innerHTML = tier.badgeText;
          }
          break;
        }
      }

      if (!matched) {
        STUDY_MATERIAL_TIERS.forEach(t => c.classList.remove(t.tierClass));
        c.querySelector('.pw-tier-badge')?.remove();
      }
    });
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

  // --- Video.js Seekbar Hover Preview & Slide Thumbnail ---
  function getSlideForTime(time) {
    if (!slidesCache || !slidesCache.slides || !slidesCache.slides.length) return null;
    const slides = slidesCache.slides;
    let match = null;
    for (let i = 0; i < slides.length; i++) {
      const ts = Number(slides[i].timeStamp || 0);
      if (ts <= time) {
        match = slides[i];
      } else {
        break;
      }
    }
    return match || slides[0];
  }

  function initSeekbarPreview() {
    const progressControl = document.querySelector('.vjs-progress-control');
    const progressHolder = document.querySelector('.vjs-progress-holder');
    const video = document.querySelector('video');
    if (!progressControl || !progressHolder || !video) return;

    if (progressHolder.dataset.pwPreviewHooked) return;
    progressHolder.dataset.pwPreviewHooked = 'true';

    let preview = document.getElementById('pw-seek-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'pw-seek-preview';
      preview.className = 'pw-seek-preview';
      preview.innerHTML = `
        <div class="pw-seek-preview-media" id="pw-seek-preview-media">
          <img class="pw-seek-preview-thumb" id="pw-seek-preview-thumb" alt="Slide Preview" />
          <div class="pw-seek-preview-title" id="pw-seek-preview-title"></div>
        </div>
        <div class="pw-seek-preview-time" id="pw-seek-preview-time">00:00</div>
      `;
      progressControl.appendChild(preview);
    }

    const mediaWrap = preview.querySelector('#pw-seek-preview-media');
    const thumbImg = preview.querySelector('#pw-seek-preview-thumb');
    const titleEl = preview.querySelector('#pw-seek-preview-title');
    const timeEl = preview.querySelector('#pw-seek-preview-time');

    let currentThumbUrl = '';

    function handleSeekHover(e) {
      const rect = progressHolder.getBoundingClientRect();
      if (!rect.width || !video.duration) return;

      const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const hoverRatio = offsetX / rect.width;
      const hoverTime = hoverRatio * video.duration;

      // Formatted timestamp
      timeEl.textContent = formatTime(hoverTime);

      // Match corresponding lecture slide
      const slide = getSlideForTime(hoverTime);
      if (slide) {
        const imgUrl = getSlideImageUrl(slide);
        if (imgUrl && imgUrl !== currentThumbUrl) {
          currentThumbUrl = imgUrl;
          thumbImg.src = imgUrl;
        }
        titleEl.textContent = slide.name || `Slide ${slide.serialNumber || ''}`;
        mediaWrap.style.display = 'block';
        preview.classList.remove('no-media');
      } else {
        mediaWrap.style.display = 'none';
        preview.classList.add('no-media');
      }

      // Horizontally clamp preview tooltip inside progressControl
      const previewWidth = preview.offsetWidth || 170;
      const minCenter = previewWidth / 2 + 4;
      const maxCenter = rect.width - previewWidth / 2 - 4;
      const clampedX = Math.max(minCenter, Math.min(offsetX, maxCenter));

      preview.style.left = `${clampedX}px`;
      preview.classList.add('visible');
    }

    function handleSeekLeave() {
      preview.classList.remove('visible');
    }

    progressHolder.addEventListener('mousemove', handleSeekHover);
    progressHolder.addEventListener('mouseenter', handleSeekHover);
    progressHolder.addEventListener('mouseleave', handleSeekLeave);
    progressControl.addEventListener('mouseleave', handleSeekLeave);
  }

  function runWatchEnhancements() {
    ensureActionBarButtons();
    hookVideoTimeUpdates();
    updatePageTopicTitle();
    initSeekbarPreview();

    // Preload slides and chapter contents for instant buttons & preview
    const params = getWatchParams();
    if (params && !slidesCache) {
      fetchSlides(params)
        .then(() => fetchChapterLectures(params))
        .catch(() => {});
    }
  }

  function runEnhancements() {
    if (isOverviewPage()) {
      runOverviewEnhancements();
    }
    if (isSubjectTopicsPage()) {
      runSubjectTopicsEnhancements();
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
    // Escape -> Close Drawer, Lightbox, or End Nudge (works even if typing in search)
    if (e.key === 'Escape') {
      const lb = document.getElementById('pws-lightbox');
      if (lb && lb.classList.contains('open')) {
        lb.classList.remove('open');
        return;
      }
      if (playlistDrawerOpen) {
        closePlaylistDrawer();
        return;
      }
      if (drawerOpen) {
        closeSlidesDrawer();
        return;
      }
      const nudge = document.getElementById('pw-end-nudge');
      if (nudge) {
        dismissEndNudge();
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

    // 'p' or 'P' -> Toggle Chapter Playlist Drawer
    if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      togglePlaylistDrawer();
      return;
    }

    // Shift + 'N' or 'n' -> Jump to Next Lecture
    if (e.shiftKey && (e.key === 'N' || e.key === 'n') && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      triggerNextLecture();
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
      chapterCache = null;
      endNudgeDismissed = false;
      closeSlidesDrawer();
      closePlaylistDrawer();
      dismissEndNudge();
      const existingPreview = document.getElementById('pw-seek-preview');
      if (existingPreview) existingPreview.remove();
      const ph = document.querySelector('.vjs-progress-holder');
      if (ph) delete ph.dataset.pwPreviewHooked;
      if (!checkPdfRedirect()) {
        setTimeout(runEnhancements, 800);
      }
    }
  }, 1000);

  console.log('✅ PW Enhancements Plugin active');
})();
