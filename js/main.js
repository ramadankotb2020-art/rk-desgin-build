(function () {
    'use strict';

    /* ─── Page Loader ─── */
    const loader = document.getElementById('page-loader');
    if (loader) {
        const hideLoader = () => loader.classList.add('loaded');
        if (document.readyState === 'complete') {
            setTimeout(hideLoader, 200);
        } else {
            window.addEventListener('load', () => setTimeout(hideLoader, 200));
            setTimeout(hideLoader, 500); // max 500ms
        }
    }

    document.addEventListener('DOMContentLoaded', () => {

        /* ─── Year ─── */
        document.querySelectorAll('[data-year]').forEach(el => {
            el.textContent = new Date().getFullYear();
        });

        /* ─── Mobile Nav ─── */
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks  = document.getElementById('nav-links');
        if (navToggle && navLinks) {
            navToggle.addEventListener('click', () => {
                const isOpen = navLinks.classList.toggle('is-open');
                navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                document.body.style.overflow = isOpen ? 'hidden' : '';
            });
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('is-open');
                    navToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                });
            });
            // Close on outside click
            document.addEventListener('click', e => {
                if (navLinks.classList.contains('is-open') &&
                    !navLinks.contains(e.target) && e.target !== navToggle) {
                    navLinks.classList.remove('is-open');
                    navToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            });
        }

        /* ─── Scroll Progress Bar ─── */
        const progressBar = document.createElement('div');
        progressBar.id = 'scroll-progress';
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-hidden', 'true');
        document.body.prepend(progressBar);

        /* ─── Back To Top ─── */
        const btt = document.createElement('button');
        btt.id = 'back-to-top';
        btt.setAttribute('aria-label', 'العودة للأعلى');
        btt.innerHTML = '↑';
        document.body.appendChild(btt);
        btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        /* ─── Scroll Handler (single listener) ─── */
        const onScroll = () => {
            const scrollTop    = window.scrollY;
            const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
            const scrollFrac   = docHeight > 0 ? scrollTop / docHeight : 0;

            // Progress bar
            progressBar.style.transform = `scaleX(${scrollFrac})`;

            // Back to top visibility
            btt.classList.toggle('visible', scrollTop > 400);

            // Reveal on scroll
            document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
                if (el.getBoundingClientRect().top < window.innerHeight - 80) {
                    el.classList.add('is-visible');
                }
            });
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll(); // run once on load

        /* ─── Counter Animation ─── */
        const counters = document.querySelectorAll('[data-counter]');
        if (counters.length) {
            const counterObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const el     = entry.target;
                    const target = +el.getAttribute('data-counter');
                    const step   = Math.ceil(target / 60);
                    let current  = 0;
                    const tick   = () => {
                        current = Math.min(current + step, target);
                        el.textContent = current + '+';
                        if (current < target) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                    counterObserver.unobserve(el);
                });
            }, { threshold: 0.5 });
            counters.forEach(c => counterObserver.observe(c));
        }

        /* ─── Search Overlay ─── */
        const searchTrigger = document.querySelector('[data-search-trigger]');
        if (searchTrigger) {
            const overlay = document.createElement('div');
            overlay.id = 'search-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'البحث');
            overlay.style.cssText = [
                'display:none', 'position:fixed', 'inset:0',
                'background:rgba(0,0,0,0.92)', 'z-index:9999',
                'align-items:flex-start', 'justify-content:center',
                'padding-top:120px', 'backdrop-filter:blur(8px)'
            ].join(';');
            overlay.innerHTML = `
                <div style="width:100%;max-width:640px;padding:0 24px;">
                    <div style="position:relative;">
                        <input id="search-input" type="search" placeholder="ابحث عن مشروع أو خدمة..."
                            aria-label="البحث في المشاريع"
                            style="width:100%;padding:20px 56px 20px 20px;background:#161616;
                            border:1px solid rgba(197,160,89,0.4);color:#fff;font-size:18px;
                            font-family:Cairo,sans-serif;outline:none;direction:rtl;border-radius:2px;">
                        <button id="search-close" aria-label="إغلاق البحث"
                            style="position:absolute;left:16px;top:50%;transform:translateY(-50%);
                            background:none;border:none;color:#aaa;font-size:22px;cursor:pointer;
                            padding:8px;line-height:1;">✕</button>
                    </div>
                    <div id="search-results" style="margin-top:20px;" aria-live="polite"></div>
                </div>`;
            document.body.appendChild(overlay);

            const openSearch  = () => { overlay.style.display = 'flex'; document.getElementById('search-input').focus(); };
            const closeSearch = () => { overlay.style.display = 'none'; };

            searchTrigger.addEventListener('click', openSearch);
            document.getElementById('search-close').addEventListener('click', closeSearch);
            overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') closeSearch();
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
            });

            document.getElementById('search-input').addEventListener('input', function () {
                const q = this.value.trim().toLowerCase();
                const results = document.getElementById('search-results');
                if (!q || typeof projectsData === 'undefined') { results.innerHTML = ''; return; }
                const found = projectsData.filter(p =>
                    (p.title || '').toLowerCase().includes(q) ||
                    (p.category || '').toLowerCase().includes(q)
                ).slice(0, 6);
                results.innerHTML = found.length
                    ? found.map(p => `
                        <a href="project.html?id=${p.id}"
                            onclick="document.getElementById('search-overlay').style.display='none'"
                            style="display:flex;align-items:center;gap:16px;padding:14px 16px;
                            margin-bottom:8px;background:#161616;border:1px solid rgba(255,255,255,0.08);
                            color:#e0e0e0;text-decoration:none;font-family:Cairo,sans-serif;
                            direction:rtl;transition:border-color 0.2s;border-radius:2px;"
                            onmouseover="this.style.borderColor='#c5a059'"
                            onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
                            <span style="color:#c5a059;font-size:11px;font-weight:700;white-space:nowrap;">${p.category || ''}</span>
                            <span style="font-size:15px;">${p.title}</span>
                        </a>`).join('')
                    : '<p style="color:#aaa;font-family:Cairo,sans-serif;padding:16px 0;">لا توجد نتائج</p>';
            });
        }

    });

})();
