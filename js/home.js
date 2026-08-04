(function () {
  'use strict';

  /* ══════════════════════════════════════════
     HOME HERO — Cinematic Video Background
     preload="none" → IntersectionObserver triggers load
     Pauses automatically when hero leaves viewport
  ══════════════════════════════════════════ */

  const video  = document.getElementById('hero-video');
  const heroEl = document.querySelector('.hero');

  if (!video || !heroEl) return;

  /* ─── Respect user preferences ─── */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData      = navigator.connection?.saveData === true;

  if (reducedMotion || saveData) {
    /* Keep poster image, remove video element entirely */
    video.remove();
    return;
  }

  /* ─── Only load & play when hero is visible ─── */
  let loaded = false;

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting) {
      if (!loaded) {
        loaded = true;
        /* Trigger browser to fetch sources (preload="none" defers this) */
        video.load();
      }
      video.play().catch(() => { /* Autoplay blocked — poster stays */ });
    } else {
      if (!video.paused) video.pause();
    }
  }, { threshold: 0.1 });

  observer.observe(heroEl);

  /* ─── Pause when tab is hidden, resume when visible ─── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!video.paused) video.pause();
    } else {
      if (loaded) video.play().catch(() => {});
    }
  }, { passive: true });

  /* ─── Hide arrows (no slider to navigate) ─── */
  document.querySelectorAll('.hero-arrow').forEach(el => {
    el.style.display = 'none';
  });

  /* ─── Keep first dot active (visual indicator only) ─── */
  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === 0);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  });

})();
