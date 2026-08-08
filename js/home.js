(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     HOME HERO ENGINE — Mobile First
     الكلام والصور والفيديوهات كلها في js/slides.js
  ══════════════════════════════════════════════════════════════ */

  const heroEl = document.querySelector('.hero');
  if (!heroEl) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData      = navigator.connection?.saveData === true;
  const isMobile      = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const mediaWrap = heroEl.querySelector('.hero-media-wrap');
  const dotsBar   = heroEl.querySelector('.hero-dots-bar');
  const arrows    = heroEl.querySelectorAll('.hero-arrow');
  const tagEl     = heroEl.querySelector('#hero-tag');
  const titleEl   = heroEl.querySelector('#hero-title');
  const subEl     = heroEl.querySelector('#hero-sub');
  const btnEl     = heroEl.querySelector('#hero-btn-primary');

  const RAW    = window.HERO_SLIDES || [];
  const SLIDES = RAW.filter(s => {
    if (s.type === 'image') return true;
    if (reducedMotion || saveData) return false;
    return true; /* فيديو يشتغل على الموبايل برضو */
  });
  if (!SLIDES.length) return;

  let current = 0;
  let timer   = null;

  /* ─── Build image slide ─── */
  function buildImageEl(s) {
    const wrap = document.createElement('div');
    wrap.className = 'hero-slide';
    const img = document.createElement('div');
    img.className = 'hero-slide-img';
    img.style.backgroundImage = `url('${s.image}')`;
    wrap.appendChild(img);
    return wrap;
  }

  /* ─── Build video slide — mobile compatible ─── */
  function buildVideoEl(s) {
    const wrap = document.createElement('div');
    wrap.className = 'hero-slide hero-slide-video';

    const vid = document.createElement('video');
    vid.className  = 'hero-video';
    vid.muted      = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.setAttribute('x5-playsinline', '');
    vid.setAttribute('disablepictureinpicture', '');
    vid.preload    = 'none';
    vid.loop       = false;
    vid.poster     = s.poster || 'images/homepage/hero-slide-1-interior.jpg';

    /* Poster div as fallback behind video */
    const poster = document.createElement('div');
    poster.className = 'hero-slide-img hero-video-poster';
    poster.style.backgroundImage = `url('${s.poster || 'images/homepage/hero-slide-1-interior.jpg'}')`;
    wrap.appendChild(poster);

    const src = document.createElement('source');
    src.src  = s.src;
    src.type = 'video/mp4';
    vid.appendChild(src);
    wrap.appendChild(vid);
    return wrap;
  }

  /* ─── Build dots ─── */
  function buildDots() {
    if (!dotsBar) return;
    dotsBar.innerHTML = SLIDES.map((_, i) => `
      <button class="hero-dot${i === 0 ? ' active' : ''}"
        role="tab" aria-selected="${i === 0}"
        data-idx="${i}" aria-label="الشريحة ${i + 1}">
      </button>`).join('');
    dotsBar.addEventListener('click', e => {
      const btn = e.target.closest('[data-idx]');
      if (btn) goTo(parseInt(btn.dataset.idx));
    });
  }

  function allEls() { return heroEl.querySelectorAll('.hero-slide'); }

  function updateContent(s) {
    if (tagEl)   tagEl.textContent = s.tag   || '';
    if (titleEl) titleEl.innerHTML  = s.title || '';
    if (subEl)   subEl.textContent  = s.sub   || '';
    if (btnEl) {
      btnEl.textContent = s.btn_text || 'تصفح الأعمال';
      btnEl.href        = s.btn_href || '#';
    }
  }

  function updateDots(idx) {
    dotsBar?.querySelectorAll('.hero-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
      d.setAttribute('aria-selected', i === idx);
    });
  }

  /* ─── Play video safely — handles mobile restrictions ─── */
  function playVideo(vid) {
    if (!vid) return Promise.resolve();
    vid.muted = true; /* ensure muted for autoplay policy */
    const p = vid.play();
    if (p && typeof p.catch === 'function') {
      return p.catch(() => {
        /* Autoplay blocked — poster already showing, skip */
      });
    }
    return Promise.resolve();
  }

  /* ─── Go to slide ─── */
  function goTo(idx) {
    clearTimeout(timer); timer = null;
    const els  = allEls();
    const prev = current;
    current    = ((idx % SLIDES.length) + SLIDES.length) % SLIDES.length;
    const s    = SLIDES[current];

    els[prev]?.classList.remove('active');
    els[current]?.classList.add('active');
    const prevVid = els[prev]?.querySelector('video');
    if (prevVid) { prevVid.pause(); prevVid.currentTime = 0; }

    updateContent(s);
    updateDots(current);

    if (s.type === 'video') {
      const vid = els[current]?.querySelector('video');
      if (vid) {
        vid.currentTime = 0;
        vid.load();
        playVideo(vid);
        vid.onended = () => goTo(current + 1);
        /* Safety: max 30s */
        timer = setTimeout(() => goTo(current + 1), 30000);
      } else {
        timer = setTimeout(() => goTo(current + 1), 8000);
      }
    } else {
      timer = setTimeout(() => goTo(current + 1), (s.dur || 6) * 1000);
    }
  }

  /* ─── Touch swipe support for mobile ─── */
  let touchStartX = 0;
  heroEl.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  heroEl.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      clearTimeout(timer);
      goTo(diff > 0 ? current + 1 : current - 1);
    }
  }, { passive: true });

  /* ─── Arrows ─── */
  arrows.forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.classList.contains('prev') ? 1 : -1;
      goTo(current + dir);
    });
  });

  /* ─── IntersectionObserver ─── */
  const observer = new IntersectionObserver(entries => {
    const els = allEls();
    if (entries[0].isIntersecting) {
      const vid = els[current]?.querySelector('video');
      if (SLIDES[current]?.type === 'video' && vid?.paused) playVideo(vid);
      if (!timer) goTo(current);
    } else {
      clearTimeout(timer); timer = null;
      els[current]?.querySelector('video')?.pause();
    }
  }, { threshold: 0.1 });

  /* ─── Tab visibility ─── */
  document.addEventListener('visibilitychange', () => {
    const els = allEls();
    const vid = els[current]?.querySelector('video');
    if (document.hidden) {
      clearTimeout(timer); timer = null;
      vid?.pause();
    } else {
      if (SLIDES[current]?.type === 'video' && vid) {
        playVideo(vid);
        vid.onended = () => goTo(current + 1);
        timer = setTimeout(() => goTo(current + 1), 30000);
      } else {
        timer = setTimeout(() => goTo(current + 1), (SLIDES[current]?.dur || 6) * 1000);
      }
    }
  }, { passive: true });

  /* ─── Init ─── */
  const overlay = mediaWrap?.querySelector('.hero-media-overlay');
  SLIDES.forEach(s => {
    const el = s.type === 'image' ? buildImageEl(s) : buildVideoEl(s);
    overlay ? mediaWrap.insertBefore(el, overlay) : mediaWrap?.appendChild(el);
  });

  buildDots();

  const els = allEls();
  els[0]?.classList.add('active');
  const firstImg = els[0]?.querySelector('.hero-slide-img');
  if (firstImg) firstImg.style.transform = 'scale(1)';

  updateContent(SLIDES[0]);
  updateDots(0);
  observer.observe(heroEl);
  timer = setTimeout(() => goTo(1), (SLIDES[0].dur || 6) * 1000);

})();
