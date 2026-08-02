function renderProjects(filter = 'all', containerAttr = '[data-work-grid]') {
    const container = document.querySelector(containerAttr);
    if (!container) return;

    const discipline = container.hasAttribute('data-featured') ? 'featured' : container.getAttribute('data-work-grid');
    let filtered = projectsData;

    if (discipline !== 'featured') {
        filtered = projectsData.filter(p => p.discipline === discipline);
    } else {
        const marked = projectsData.filter(p => p.featured);
        filtered = marked.length ? marked : projectsData.slice(0, 6);
    }

    container.innerHTML = filtered.map((p, i) => `
        <a href="project.html?id=${p.id}"
           class="project-card reveal"
           style="animation-delay: ${(i % 6) * 70}ms">
            <div class="project-card-media">
                <img src="${p.cover}"
                     class="project-img"
                     alt="${p.title}"
                     loading="${i < 4 ? 'eager' : 'lazy'}"
                     decoding="async"
                     onerror="this.closest('.project-card-media').innerHTML='<div style=\'height:200px;display:flex;align-items:center;justify-content:center;color:var(--ink-softer);font-size:13px;\'>لا توجد صورة</div>'">
                ${p.category ? `<span class="project-category-badge">${p.category}</span>` : ''}
                <span class="project-card-cta">عرض المشروع ←</span>
            </div>
            <div class="project-info">
                ${p.category ? `<p>${p.category}</p>` : ''}
                <h3>${p.title}</h3>
            </div>
        </a>
    `).join('');

    // Notify video system that cards are ready
    document.dispatchEvent(new CustomEvent('rk:projects-rendered', { bubbles: true }));
}

// تنفيذ العرض عند التحميل
renderProjects('all', '[data-work-grid="interior"]');
renderProjects('all', '[data-work-grid="exterior"]');
renderProjects('all', '[data-work-grid="graphic"]');
// للصفحة الرئيسية
renderProjects('all', '[data-featured]');

// ==================================================================
// عرض تفاصيل مشروع واحد في project.html (كان ناقص، بيقرا من نفس projectsData)
// ==================================================================
(function renderProjectDetail() {
    const page = document.querySelector('[data-project-page]');
    if (!page) return;

    const id = new URLSearchParams(window.location.search).get('id');
    const project = projectsData.find(p => String(p.id) === String(id));
    if (!project) return;

    const disciplineLabels = { interior: 'تصميم داخلي', exterior: 'تصميم خارجي ولاندسكيب', graphic: 'تصميم جرافيك' };

    const eyebrow = page.querySelector('[data-p-eyebrow]');
    if (eyebrow) eyebrow.textContent = project.category || disciplineLabels[project.discipline] || '';

    const titleEl = page.querySelector('[data-p-title]');
    if (titleEl) titleEl.textContent = project.title || '';

    const descEl = page.querySelector('[data-p-desc]');
    if (descEl) descEl.textContent = project.description || project.excerpt || '';

    const metaEl = page.querySelector('[data-p-meta]');
    if (metaEl) {
        const metaItems = [
            ['الموقع', project.location],
            ['السنة', project.year],
            ['المساحة', project.area],
            ['التصنيف', project.category]
        ].filter(([, value]) => value);
        metaEl.innerHTML = metaItems.map(([label, value]) => `
            <div>
                <div style="color: var(--ink-soft); font-size: 12px; margin-bottom: 6px;">${label}</div>
                <div style="color: var(--white); font-weight: 700; font-size: 16px;">${value}</div>
            </div>
        `).join('');
    }

    const coverEl = page.querySelector('[data-p-cover]');
    if (coverEl && project.cover) {
        coverEl.innerHTML = `<img src="${project.cover}" alt="${project.title}" style="width:100%; display:block;">`;
    }

    const ideaEl = page.querySelector('[data-p-idea]');
    if (ideaEl) ideaEl.textContent = project.idea || project.description || '';

    const galleryEl = page.querySelector('[data-p-gallery]');
    if (galleryEl) {
        const images = project.gallery && project.gallery.length ? project.gallery : (project.cover ? [project.cover] : []);

        // Style the gallery container as CSS columns masonry
        galleryEl.style.cssText = `
            columns: 2;
            column-gap: 16px;
        `;

        galleryEl.innerHTML = images.map((src, i) => `
            <div style="
                break-inside: avoid;
                margin-bottom: 16px;
                overflow: hidden;
                border: 1px solid var(--line);
                background: var(--bg-panel);
                transition: border-color 0.3s ease, transform 0.4s ease;
                cursor: zoom-in;
            "
            onmouseenter="this.style.borderColor='var(--gold-light)'; this.querySelector('img').style.transform='scale(1.03)'"
            onmouseleave="this.style.borderColor='var(--line)'; this.querySelector('img').style.transform='scale(1)'"
            onclick="window.__openLightbox && window.__openLightbox(${i})"
            >
                <img
                    src="${src}"
                    alt="${project.title} — ${i + 1}"
                    loading="${i < 4 ? 'eager' : 'lazy'}"
                    style="
                        width: 100%;
                        height: auto;
                        display: block;
                        transition: transform 0.5s ease;
                        filter: brightness(0.92);
                    "
                    onload="this.style.filter='brightness(1)'"
                    onerror="this.closest('div').style.display='none'"
                >
            </div>
        `).join('');

        // Responsive: on mobile use single column
        const updateColumns = () => {
            galleryEl.style.columns = window.innerWidth < 640 ? '1' : '2';
        };
        updateColumns();
        window.addEventListener('resize', updateColumns, { passive: true });

        // Simple Lightbox
        window.__galleryImages = images;
        window.__galleryTitle  = project.title;
        let lightboxIndex = 0;

        window.__openLightbox = (idx) => {
            lightboxIndex = idx;
            const lb = document.getElementById('rk-lightbox') || createLightbox();
            lb.querySelector('#lb-img').src = images[idx];
            lb.querySelector('#lb-count').textContent = `${idx + 1} / ${images.length}`;
            lb.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };

        function createLightbox() {
            const lb = document.createElement('div');
            lb.id = 'rk-lightbox';
            lb.style.cssText = `
                display: none;
                position: fixed;
                inset: 0;
                z-index: 9999;
                background: rgba(0,0,0,0.96);
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 16px;
                padding: 24px;
            `;
            lb.innerHTML = `
                <button onclick="document.getElementById('rk-lightbox').style.display='none'; document.body.style.overflow='';"
                    style="position:absolute; top:20px; left:20px; background:none; border:none; color:#fff; font-size:28px; cursor:pointer; z-index:2; opacity:0.7; transition:opacity 0.2s"
                    onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.7'">✕</button>

                <button onclick="
                    lightboxIndex = (lightboxIndex - 1 + window.__galleryImages.length) % window.__galleryImages.length;
                    document.getElementById('lb-img').src = window.__galleryImages[lightboxIndex];
                    document.getElementById('lb-count').textContent = (lightboxIndex+1) + ' / ' + window.__galleryImages.length;
                " style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.3); color:#fff; width:48px; height:48px; border-radius:50%; font-size:20px; cursor:pointer; transition:all 0.2s"
                   onmouseenter="this.style.background='rgba(212,175,55,0.3)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'">‹</button>

                <img id="lb-img" src="" alt="" style="max-width:92vw; max-height:82vh; object-fit:contain; display:block; border:1px solid rgba(255,255,255,0.1);">

                <button onclick="
                    lightboxIndex = (lightboxIndex + 1) % window.__galleryImages.length;
                    document.getElementById('lb-img').src = window.__galleryImages[lightboxIndex];
                    document.getElementById('lb-count').textContent = (lightboxIndex+1) + ' / ' + window.__galleryImages.length;
                " style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.3); color:#fff; width:48px; height:48px; border-radius:50%; font-size:20px; cursor:pointer; transition:all 0.2s"
                   onmouseenter="this.style.background='rgba(212,175,55,0.3)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'">›</button>

                <div id="lb-count" style="color:rgba(255,255,255,0.5); font-size:13px; font-family:'Cairo',sans-serif;"></div>
            `;

            lb.addEventListener('click', (e) => {
                if (e.target === lb) {
                    lb.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });

            document.addEventListener('keydown', (e) => {
                if (lb.style.display === 'none') return;
                if (e.key === 'Escape') { lb.style.display='none'; document.body.style.overflow=''; }
                if (e.key === 'ArrowRight') {
                    lightboxIndex = (lightboxIndex - 1 + window.__galleryImages.length) % window.__galleryImages.length;
                    lb.querySelector('#lb-img').src = window.__galleryImages[lightboxIndex];
                    lb.querySelector('#lb-count').textContent = (lightboxIndex+1) + ' / ' + window.__galleryImages.length;
                }
                if (e.key === 'ArrowLeft') {
                    lightboxIndex = (lightboxIndex + 1) % window.__galleryImages.length;
                    lb.querySelector('#lb-img').src = window.__galleryImages[lightboxIndex];
                    lb.querySelector('#lb-count').textContent = (lightboxIndex+1) + ' / ' + window.__galleryImages.length;
                }
            });

            document.body.appendChild(lb);
            return lb;
        }
    }

    document.title = project.title + ' — رمضان قطب';
})();