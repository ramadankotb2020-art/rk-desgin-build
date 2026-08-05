(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     HOME HERO ENGINE — متعدّلش هنا
     الكلام والصور والفيديوهات كلها في js/slides.js
  ══════════════════════════════════════════════════════════════ */

  const heroEl = document.querySelector('.hero');
  if (!heroEl) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData      = navigator.connection?.saveData === true;
  const skipVideo     = reducedMotion || saveData;

  const mediaWrap = heroEl.querySelector('.hero-media-wrap');
  const dotsBar   = heroEl.querySelector('.hero-dots-bar');
  const arrows    = heroEl.querySelectorAll('.hero-arrow');
  const tagEl     = heroEl.querySelector('#hero-tag');
  const titleEl   = heroEl.querySelector('#hero-title');
  const subEl     = heroEl.querySelector('#hero-sub');
  const btnEl     = heroEl.querySelector('#hero-btn-primary');

  /* ─── Load slides from slides.js ─── */
  const RAW = window.HERO_SLIDES || [];
  const SLIDES = RAW.filter(s => s.type === 'image' || !skipVideo);
  if (!SLIDES.length) return;

  let current = 0;
  let timer   = null;

  /* ─── Build image slide element ─── */
  function buildImageEl(s) {
    const wrap = document.createElement('div');
    wrap.className = 'hero-slide';
    const img = document.createElement('div');
    img.className = 'hero-slide-img';
    img.style.backgroundImage = `url('${s.image}')`;
    wrap.appendChild(img);
    return wrap;
  }

  /* ─── Build video slide element ─── */
  function buildVideoEl(s) {
    const wrap = document.createElement('div');
    wrap.className = 'hero-slide';
    const vid = document.createElement('video');
    vid.className   = 'hero-video';
    vid.muted       = true;
    vid.playsInline = true;
    vid.preload     = 'none';
    vid.poster      = s.poster || 'images/homepage/hero-slide-1-interior.jpg';
    vid.setAttribute('disablepictureinpicture', '');
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
      </button>`
    ).join('');
    dotsBar.addEventListener('click', e => {
      const btn = e.target.closest('[data-idx]');
      if (btn) goTo(parseInt(btn.dataset.idx));
    });
  }

  function allEls() { return heroEl.querySelectorAll('.hero-slide'); }

  /* ─── Update text ─── */
  function updateContent(s) {
    if (tagEl)   tagEl.textContent = s.tag   || '';
    if (titleEl) titleEl.innerHTML  = s.title || '';
    if (subEl)   subEl.textContent  = s.sub   || '';
    if (btnEl) {
      btnEl.textContent = s.btn_text || 'تصفح الأعمال';
      btnEl.href        = s.btn_href || '#';
    }
  }

  /* ─── Update dots ─── */
  function updateDots(idx) {
    dotsBar?.querySelectorAll('.hero-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
      d.setAttribute('aria-selected', i === idx);
    });
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
    els[prev]?.querySelector('video')?.pause();

    updateContent(s);
    updateDots(current);

    if (s.type === 'video') {
      const vid = els[current]?.querySelector('video');
      if (vid) {
        vid.currentTime = 0;
        vid.load();
        vid.play().catch(() => {});
        vid.onended = () => goTo(current + 1);
        timer = setTimeout(() => goTo(current + 1), 30000);
      } else {
        timer = setTimeout(() => goTo(current + 1), 1000);
      }
    } else {
      timer = setTimeout(() => goTo(current + 1), (s.dur || 6) * 1000);
    }
  }

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
      if (SLIDES[current]?.type === 'video' && vid?.paused) vid.play().catch(() => {});
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
        vid.play().catch(() => {});
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
