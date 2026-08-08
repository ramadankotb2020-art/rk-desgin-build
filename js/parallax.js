(function () {
  'use strict';

  /* ══════════════════════════════════════════
     PARALLAX — صورتان ثابتتان
     ديسكتوب: background-attachment fixed
     موبايل: JavaScript transform parallax
     بتتغيرا كل ساعة
  ══════════════════════════════════════════ */

  const HOUR     = 60 * 60 * 1000;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                || window.innerWidth <= 768;

  const elInterior = document.getElementById('parallax-img-interior');
  const elGraphic  = document.getElementById('parallax-img-graphic');
  if (!elInterior && !elGraphic) return;

  /* ─── Image helpers ─── */
  function getCovers(discipline) {
    const all = window.projectsData || window.PROJECTS_FALLBACK || [];
    return all.filter(p => p.discipline === discipline).map(p => p.cover).filter(Boolean);
  }

  function pickByHour(arr, offset) {
    if (!arr.length) return null;
    return arr[(Math.floor(Date.now() / HOUR) + (offset || 0)) % arr.length];
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
    loadImg(elInterior, pickByHour(getCovers('interior'), 0), fade);
    loadImg(elGraphic,  pickByHour(getCovers('graphic'),  3), fade);
  }

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

  /* ─── Mobile JS Parallax ─── */
  function initMobileParallax() {
    if (!isMobile) return;

    const banners = [
      { img: elInterior, banner: elInterior?.closest('.parallax-banner') },
      { img: elGraphic,  banner: elGraphic?.closest('.parallax-banner')  }
    ].filter(b => b.img && b.banner);

    if (!banners.length) return;

    let ticking = false;

    function updateParallax() {
      banners.forEach(({ img, banner }) => {
        const rect     = banner.getBoundingClientRect();
        const viewH    = window.innerHeight;

        /* Only update when banner is visible */
        if (rect.bottom < 0 || rect.top > viewH) return;

        /* Progress: 0 when top enters bottom of viewport, 1 when bottom exits top */
        const progress = 1 - (rect.bottom / (viewH + rect.height));
        /* Move image by ±15% of banner height */
        const move     = (progress - 0.5) * banner.offsetHeight * 0.3;
        img.style.transform = `translateY(${move}px)`;
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    /* Initial call */
    updateParallax();
  }

  /* ─── Init ─── */
  function init() {
    observe(elInterior, 'interior', 0);
    observe(elGraphic,  'graphic',  3);
    initMobileParallax();
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
