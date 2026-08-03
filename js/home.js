(function () {
  'use strict';

  /* ─── Hero Slider Data ─── */
  const slides = [
    {
      tag:     'التصميم الداخلي والديكور',
      title:   'أحوّل مساحتك<br>إلى <em>تحفة معمارية</em>',
      sub:     'تصميم داخلي سكني وتجاري — رندر 3D ومخططات تنفيذية بأعلى دقة',
      btnHref: 'interior-design.html',
      btnText: 'تصفح أعمال الديكور'
    },
    {
      tag:     'الجرافيك والهوية البصرية',
      title:   'أبني هويتك<br>التجارية من <em>الصفر</em>',
      sub:     'شعارات، هويات بصرية، مطبوعات، وحملات سوشيال ميديا متكاملة',
      btnHref: 'graphic-design.html',
      btnText: 'تصفح أعمال الجرافيك'
    },
    {
      tag:     'التصميم الخارجي واللاندسكيب',
      title:   'واجهات معمارية<br>وحدائق <em>فاخرة</em>',
      sub:     'تصميم واجهات معمارية وتنسيق حدائق ولاندسكيب بأحدث الأساليب',
      btnHref: 'exterior-design.html',
      btnText: 'تصفح أعمال الخارجي'
    }
  ];

  let current = 0;
  let timer   = null;

  const slidesEls = document.querySelectorAll('.hero-slide');
  const dots      = document.querySelectorAll('.hero-dot');
  const tagEl     = document.getElementById('hero-tag');
  const titleEl   = document.getElementById('hero-title');
  const subEl     = document.getElementById('hero-sub');
  const btnEl     = document.getElementById('hero-btn-primary');

  if (!slidesEls.length) return;

  /* Fade content, switch, fade in */
  function goTo(idx, dir) {
    if (idx === current) return;

    /* Fade out content */
    [tagEl, titleEl, subEl, btnEl].forEach(el => {
      if (!el) return;
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
    });

    /* Switch slide image */
    slidesEls[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    dots[current]?.setAttribute('aria-selected', 'false');

    current = (idx + slides.length) % slides.length;

    slidesEls[current].classList.add('active');
    dots[current]?.classList.add('active');
    dots[current]?.setAttribute('aria-selected', 'true');

    /* Update content after small delay */
    setTimeout(() => {
      const d = slides[current];
      if (tagEl)   tagEl.textContent = d.tag;
      if (titleEl) titleEl.innerHTML  = d.title;
      if (subEl)   subEl.textContent  = d.sub;
      if (btnEl) {
        btnEl.href        = d.btnHref;
        btnEl.textContent = d.btnText;
      }

      [tagEl, titleEl, subEl, btnEl].forEach(el => {
        if (!el) return;
        el.style.transition = 'opacity 0.5s, transform 0.5s';
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
      });
    }, 350);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(next, 5500);
  }

  /* Arrow buttons */
  document.querySelector('.hero-arrow.next')?.addEventListener('click', () => { next(); startTimer(); });
  document.querySelector('.hero-arrow.prev')?.addEventListener('click', () => { prev(); startTimer(); });

  /* Dot buttons */
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startTimer(); });
  });

  /* Touch swipe */
  let touchStartX = 0;
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    heroEl.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    heroEl.addEventListener('touchend', e => {
      const dx = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 50) { dx > 0 ? next() : prev(); startTimer(); }
    }, { passive: true });
  }

  /* Pause on hover */
  heroEl?.addEventListener('mouseenter', () => clearInterval(timer));
  heroEl?.addEventListener('mouseleave', startTimer);

  /* Keyboard */
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { prev(); startTimer(); }
    if (e.key === 'ArrowRight') { next(); startTimer(); }
  });

  /* Respect prefers-reduced-motion */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    startTimer();
  }

})();
