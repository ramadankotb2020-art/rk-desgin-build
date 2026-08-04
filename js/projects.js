'use strict';

/* ─── Fallback to PROJECTS_FALLBACK if no projectsData global ─── */
if (typeof projectsData === 'undefined' && typeof PROJECTS_FALLBACK !== 'undefined') {
  window.projectsData = PROJECTS_FALLBACK;
} else if (typeof projectsData !== 'undefined') {
  window.projectsData = projectsData;
}

/* ─── Render projects into a grid container ─── */
function renderProjects(filter, containerAttr) {
  const container = document.querySelector(containerAttr);
  if (!container) return;

  const discipline = container.hasAttribute('data-featured')
    ? 'featured'
    : container.getAttribute('data-work-grid');

  let filtered = window.projectsData || [];

  if (discipline === 'featured') {
    const marked = filtered.filter(p => p.featured);
    filtered = marked.length ? marked : filtered.slice(0, 6);
  } else if (discipline) {
    filtered = filtered.filter(p => p.discipline === discipline);
  }

  if (filter && filter !== 'all') {
    filtered = filtered.filter(p =>
      (p.category || '').toLowerCase().includes(filter.toLowerCase())
    );
  }

  if (!filtered.length) {
    container.innerHTML = '<p style="color:var(--ink-3);text-align:center;padding:48px 0;font-size:15px;">لا توجد مشاريع في هذا التصنيف حتى الآن.</p>';
    return;
  }

  container.innerHTML = filtered.map((p, i) => {
    /* ─── Cover: video if cover.mp4 exists beside cover image ─── */
    const dir        = p.cover ? p.cover.substring(0, p.cover.lastIndexOf('/') + 1) : '';
    const coverVideo = dir + 'cover.mp4';

    const mediaHTML = p.cover ? `
      <video
        src="${coverVideo}"
        class="project-img"
        autoplay muted loop playsinline
        poster="${p.cover}"
        style="width:100%;height:100%;object-fit:cover;display:block;"
        onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<img src=\"${p.cover}\" class=\"project-img\" alt=\"${p.title}\" loading=\"lazy\" decoding=\"async\">')">
      </video>` : '';

    return `
    <a href="project.html?id=${encodeURIComponent(p.id)}"
       class="project-card reveal"
       style="animation-delay:${(i % 6) * 60}ms">
      <div class="project-card-media">
        ${mediaHTML}
        ${p.category ? `<span class="project-category-badge">${p.category}</span>` : ''}
        <span class="project-card-cta">عرض المشروع ←</span>
      </div>
      <div class="project-info">
        ${p.category ? `<p>${p.category}</p>` : ''}
        <h3>${p.title}</h3>
      </div>
    </a>`;
  }).join('');

  /* Trigger reveal for newly injected cards */
  requestAnimationFrame(() => {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 60) {
        el.classList.add('is-visible');
      }
    });
  });

  document.dispatchEvent(new CustomEvent('rk:projects-rendered', { bubbles: true }));
}

/* ─── Build filter bar ─── */
function buildFilterBar(discipline) {
  const bars = document.querySelectorAll('[data-filter-bar]');
  if (!bars.length) return;

  const projects = (window.projectsData || []).filter(p =>
    discipline ? p.discipline === discipline : true
  );

  /* Collect unique categories */
  const cats = [...new Set(projects.map(p => p.category).filter(Boolean))];

  bars.forEach(bar => {
    const gridEl = bar.closest('.container')?.querySelector('[data-work-grid]');
    const disc   = gridEl ? gridEl.getAttribute('data-work-grid') : null;

    const items = [{ label: 'الكل', val: 'all' }, ...cats.map(c => ({ label: c, val: c }))];

    bar.innerHTML = items.map((item, i) => `
      <button class="${i === 0 ? 'active' : ''}"
        data-filter="${item.val}"
        aria-pressed="${i === 0 ? 'true' : 'false'}">
        ${item.label}
      </button>
    `).join('');

    bar.addEventListener('click', e => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      bar.querySelectorAll('button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const filterVal = btn.getAttribute('data-filter');
      const attr = disc ? `[data-work-grid="${disc}"]` : '[data-work-grid]';
      renderProjects(filterVal === 'all' ? null : filterVal, attr);
    });
  });
}

/* ─── Initial render ─── */
renderProjects(null, '[data-work-grid="interior"]');
renderProjects(null, '[data-work-grid="exterior"]');
renderProjects(null, '[data-work-grid="graphic"]');
renderProjects(null, '[data-featured]');

/* ─── Build filter bars ─── */
buildFilterBar(null);

/* ═══════════════════════════════════════════════
   PROJECT DETAIL PAGE
═══════════════════════════════════════════════ */
(function renderProjectDetail() {
  const page = document.querySelector('[data-project-page]');
  if (!page) return;

  const id      = new URLSearchParams(window.location.search).get('id');
  const project = (window.projectsData || []).find(p => String(p.id) === String(id));
  if (!project) return;

  const disciplineLabels = {
    interior: 'تصميم داخلي',
    exterior: 'تصميم خارجي ولاندسكيب',
    graphic:  'تصميم جرافيك'
  };

  /* Update page title */
  document.title = `${project.title} — رمضان قطب | RK Design Studio`;

  /* Eyebrow */
  const eyebrow = page.querySelector('[data-p-eyebrow]');
  if (eyebrow) eyebrow.textContent = project.category || disciplineLabels[project.discipline] || '';

  /* Title */
  const titleEl = page.querySelector('[data-p-title]');
  if (titleEl) titleEl.textContent = project.title || '';

  /* Description */
  const descEl = page.querySelector('[data-p-desc]');
  if (descEl) descEl.textContent = project.description || project.excerpt || '';

  /* Meta */
  const metaEl = page.querySelector('[data-p-meta]');
  if (metaEl) {
    const metaItems = [
      ['التصنيف', project.category || disciplineLabels[project.discipline]],
      ['الموقع',  project.location],
      ['السنة',   project.year],
      ['المساحة', project.area]
    ].filter(([, v]) => v);

    metaEl.innerHTML = metaItems.map(([label, value]) => `
      <div>
        <div style="color:var(--ink-3);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">${label}</div>
        <div style="color:var(--white);font-weight:700;font-size:17px;">${value}</div>
      </div>
    `).join('');
  }

  /* Cover */
  const coverEl = page.querySelector('[data-p-cover]');
  if (coverEl && project.cover) {
    coverEl.innerHTML = `
      <img src="${project.cover}" alt="${project.title}"
        style="width:100%;display:block;max-height:70vh;object-fit:cover;"
        loading="eager">`;
  }

  /* Idea */
  const ideaEl = page.querySelector('[data-p-idea]');
  if (ideaEl) ideaEl.textContent = project.idea || project.description || project.excerpt || '';

  /* Gallery */
  const galleryEl = page.querySelector('[data-p-gallery]');
  if (galleryEl) {
    const rawItems = project.gallery?.length ? project.gallery : (project.cover ? [project.cover] : []);

    /* ─── Detect videos by extension ─── */
    function isVideo(src) {
      return /\.(mp4|webm|ogg)(\?.*)?$/i.test(src);
    }

    /* ─── Build cover video path from cover image path ─── */
    /* e.g. images/.../01-cover.jpg  →  images/.../cover.mp4  */
    function getCoverVideo(coverSrc) {
      if (!coverSrc) return null;
      const dir = coverSrc.substring(0, coverSrc.lastIndexOf('/') + 1);
      return dir + 'cover.mp4';
    }

    /* ─── Merge: images + any video files in gallery ─── */
    /* Also check if cover.mp4 exists by trying to load it */
    const allItems = [...rawItems];

    /* Add cover.mp4 at the start if not already in list */
    const coverVideoPath = getCoverVideo(project.cover);
    if (coverVideoPath && !allItems.some(s => isVideo(s))) {
      allItems.unshift(coverVideoPath);
    }

    /* Separate into images and videos, keep original order */
    /* Videos go at their natural position (cover.mp4 first, numbered videos in place) */
    const items = allItems; /* keep order as-is */

    /* Only images go into lightbox */
    const imageItems = items.filter(s => !isVideo(s));

    galleryEl.style.cssText = 'columns:2;column-gap:16px;';

    let imageIdx = 0; /* track index within images only for lightbox */

    galleryEl.innerHTML = items.map((src, i) => {
      if (isVideo(src)) {
        return `
          <div style="break-inside:avoid;margin-bottom:16px;overflow:hidden;
            border:1px solid var(--line);border-radius:8px;background:var(--bg-3);">
            <video
              src="${src}"
              style="width:100%;height:auto;display:block;"
              autoplay muted loop playsinline
              onerror="this.closest('div').style.display='none'">
            </video>
          </div>`;
      } else {
        const lbIndex = imageItems.indexOf(src);
        return `
          <div style="break-inside:avoid;margin-bottom:16px;overflow:hidden;
            border:1px solid var(--line);border-radius:8px;background:var(--bg-3);
            transition:border-color 0.3s;cursor:zoom-in;"
            onmouseenter="this.style.borderColor='var(--gold)'"
            onmouseleave="this.style.borderColor='var(--line)'"
            onclick="window.__openLightbox && window.__openLightbox(${lbIndex})">
            <img src="${src}" alt="${project.title} — ${i + 1}"
              loading="${i < 4 ? 'eager' : 'lazy'}"
              style="width:100%;height:auto;display:block;
                transition:transform 0.5s,filter 0.35s;filter:brightness(0.88);"
              onload="this.style.filter='brightness(1)'"
              onerror="this.closest('div').style.display='none'"
              onmouseenter="this.style.transform='scale(1.03)'"
              onmouseleave="this.style.transform='scale(1)'">
          </div>`;
      }
    }).join('');

    /* Responsive columns */
    const updateCols = () => { galleryEl.style.columns = window.innerWidth < 640 ? '1' : '2'; };
    updateCols();
    window.addEventListener('resize', updateCols, { passive: true });

    /* Gallery count badge — images only */
    const countBadge = document.getElementById('gallery-count');
    if (countBadge) countBadge.textContent = `${imageItems.length} صورة`;

    /* ─── Lightbox — images only ─── */
    const images = imageItems;
    window.__galleryImages = images;
    let lbIdx = 0;

    window.__openLightbox = (idx) => {
      lbIdx = idx;
      const lb = document.getElementById('rk-lightbox') || _createLightbox();
      lb.querySelector('#lb-img').src = images[idx];
      lb.querySelector('#lb-count').textContent = `${idx + 1} / ${images.length}`;
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };

    function _lbNav(dir) {
      lbIdx = (lbIdx + dir + images.length) % images.length;
      const lb = document.getElementById('rk-lightbox');
      const img = lb?.querySelector('#lb-img');
      if (img) {
        img.style.opacity = '0';
        img.style.transform = 'scale(0.94)';
        setTimeout(() => {
          img.src = images[lbIdx];
          img.style.opacity = '1';
          img.style.transform = 'scale(1)';
          lb.querySelector('#lb-count').textContent = `${lbIdx + 1} / ${images.length}`;
        }, 180);
      }
    }

    function _createLightbox() {
      const lb = document.createElement('div');
      lb.id = 'rk-lightbox';
      lb.style.cssText = `
        display:none;position:fixed;inset:0;z-index:9999;
        background:rgba(0,0,0,0.97);
        align-items:center;justify-content:center;
        flex-direction:column;gap:16px;padding:24px;
      `;
      lb.innerHTML = `
        <button onclick="document.getElementById('rk-lightbox').style.display='none';document.body.style.overflow='';"
          style="position:absolute;top:20px;left:20px;background:none;border:none;color:rgba(255,255,255,0.7);
          font-size:28px;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;
          border-radius:50%;border:1px solid rgba(255,255,255,0.15);transition:all 0.2s;"
          onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'"
          onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='rgba(255,255,255,0.7)'">✕</button>

        <button onclick="window._lbNav && window._lbNav(-1)"
          style="position:absolute;right:20px;top:50%;transform:translateY(-50%);
          background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
          color:#fff;width:52px;height:52px;border-radius:50%;font-size:24px;cursor:pointer;
          transition:all 0.2s;display:flex;align-items:center;justify-content:center;"
          onmouseover="this.style.background='rgba(197,160,89,0.2)';this.style.borderColor='var(--gold)'"
          onmouseout="this.style.background='rgba(255,255,255,0.07)';this.style.borderColor='rgba(255,255,255,0.15)'">‹</button>

        <img id="lb-img" src="" alt=""
          style="max-width:92vw;max-height:82vh;object-fit:contain;display:block;
          border-radius:8px;transition:opacity 0.2s,transform 0.2s;">

        <button onclick="window._lbNav && window._lbNav(1)"
          style="position:absolute;left:20px;top:50%;transform:translateY(-50%);
          background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
          color:#fff;width:52px;height:52px;border-radius:50%;font-size:24px;cursor:pointer;
          transition:all 0.2s;display:flex;align-items:center;justify-content:center;"
          onmouseover="this.style.background='rgba(197,160,89,0.2)';this.style.borderColor='var(--gold)'"
          onmouseout="this.style.background='rgba(255,255,255,0.07)';this.style.borderColor='rgba(255,255,255,0.15)'">›</button>

        <div id="lb-count" style="color:rgba(255,255,255,0.45);font-size:13px;font-family:Cairo,sans-serif;"></div>
      `;
      lb.addEventListener('click', e => {
        if (e.target === lb) { lb.style.display = 'none'; document.body.style.overflow = ''; }
      });
      document.body.appendChild(lb);
      return lb;
    }

    window._lbNav = _lbNav;

    document.addEventListener('keydown', e => {
      const lb = document.getElementById('rk-lightbox');
      if (!lb || lb.style.display === 'none') return;
      if (e.key === 'Escape')      { lb.style.display = 'none'; document.body.style.overflow = ''; }
      if (e.key === 'ArrowRight')  _lbNav(-1);
      if (e.key === 'ArrowLeft')   _lbNav(1);
    });
  }

})();
