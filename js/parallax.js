(function () {
  'use strict';

  /* ══════════════════════════════════════════
     PARALLAX — صورتان ثابتتان
     أولى: انتريور — في أول الصفحة
     ثانية: جرافيك — في آخر الصفحة
     بتتغيرا كل ساعة
  ══════════════════════════════════════════ */

  const HOUR = 60 * 60 * 1000;

  const elInterior = document.getElementById('parallax-img-interior');
  const elGraphic  = document.getElementById('parallax-img-graphic');
  if (!elInterior && !elGraphic) return;

  function getCovers(discipline) {
    const all = window.projectsData || window.PROJECTS_FALLBACK || [];
    return all.filter(p => p.discipline === discipline).map(p => p.cover).filter(Boolean);
  }

  function pickByHour(arr, offset) {
    if (!arr.length) return null;
    const slot = Math.floor(Date.now() / HOUR) + (offset || 0);
    return arr[slot % arr.length];
  }

  function loadImg(el, src, fade) {
    if (!el || !src) return;
    const img = new Image();
    img.onload = () => {
      if (fade) {
        el.style.transition = 'opacity 1.5s ease-in-out';
        el.style.opacity = '0';
        setTimeout(() => {
          el.style.backgroundImage = `url('${src}')`;
          el.style.opacity = '1';
        }, 600);
      } else {
        el.style.backgroundImage = `url('${src}')`;
      }
    };
    img.src = src;
  }

  function apply(fade) {
    const interior = getCovers('interior');
    const graphic  = getCovers('graphic');
    loadImg(elInterior, pickByHour(interior, 0),  fade);
    loadImg(elGraphic,  pickByHour(graphic,  3),  fade);
  }

  /* Lazy load via IntersectionObserver */
  function observe(el, discipline, offset) {
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadImg(el, pickByHour(getCovers(discipline), offset), false);
        obs.disconnect();
      }
    }, { threshold: 0.05 });
    obs.observe(el.closest('.parallax-banner') || el);
  }

  function init() {
    observe(elInterior, 'interior', 0);
    observe(elGraphic,  'graphic',  3);
    setInterval(() => apply(true), HOUR);
  }

  function tryInit() {
    if (window.projectsData || window.PROJECTS_FALLBACK) {
      init();
    } else {
      setTimeout(tryInit, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }

})();
