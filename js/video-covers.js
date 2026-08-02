/**
 * RK Design Studio — Video Cover System
 * Lazy-loads, plays/pauses by viewport, respects autoplay policy.
 * Zero layout shift. Identical card dimensions preserved.
 */
(function () {
    'use strict';

    /* ── Detect reduced-motion / save-data preference ── */
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    const slowNet  = navigator.connection && ['slow-2g','2g'].includes(navigator.connection.effectiveType);
    const skipVideo = prefersReducedMotion || saveData || slowNet;

    /* ── Helper: build <video> element ── */
    function buildVideo(mp4, webm, poster, title) {
        const vid = document.createElement('video');
        vid.setAttribute('data-rk-video', '');
        vid.className      = 'project-video';
        vid.muted          = true;
        vid.loop           = true;
        vid.playsInline    = true;
        vid.preload        = 'none';          // never preload until visible
        vid.setAttribute('aria-hidden', 'true');
        vid.setAttribute('tabindex', '-1');
        if (poster) vid.poster = poster;
        if (title)  vid.setAttribute('aria-label', title);

        // Prefer WebM, fallback MP4
        if (webm) {
            const s = document.createElement('source');
            s.src  = webm;
            s.type = 'video/webm';
            vid.appendChild(s);
        }
        if (mp4) {
            const s = document.createElement('source');
            s.src  = mp4;
            s.type = 'video/mp4';
            vid.appendChild(s);
        }

        return vid;
    }

    /* ── IntersectionObserver: play/pause by viewport ── */
    const playObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const vid = entry.target;
            if (entry.isIntersecting) {
                // Start loading if not yet started
                if (vid.preload === 'none') {
                    vid.preload = 'metadata';
                    vid.load();
                }
                const playPromise = vid.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        // Autoplay blocked — poster stays visible, no error
                    });
                }
            } else {
                if (!vid.paused) vid.pause();
            }
        });
    }, {
        threshold: 0.15,         // start playing when 15% visible
        rootMargin: '100px 0px'  // start loading slightly before entering viewport
    });

    /* ── Attach video to a card's media wrapper ── */
    function attachVideo(mediaEl, project) {
        const mp4    = project.video_mp4  || project.video || null;
        const webm   = project.video_webm || null;
        const poster = project.cover      || null;

        if (!mp4 && !webm) return;  // no video defined

        // Build video element
        const vid = buildVideo(mp4, webm, poster, project.title);

        // Show video once it can play
        vid.addEventListener('canplay', () => {
            vid.classList.add('rk-video-ready');
        }, { once: true });

        // Fallback: if video errors, keep poster image visible
        vid.addEventListener('error', () => {
            vid.remove();
        });

        // Insert video BEFORE the existing img (same layer)
        // Image stays as fallback underneath
        const existingImg = mediaEl.querySelector('.project-img');
        if (existingImg) {
            mediaEl.insertBefore(vid, existingImg);
            // Hide img once video is playing to save memory
            vid.addEventListener('playing', () => {
                if (existingImg) existingImg.style.opacity = '0';
            }, { once: true });
        } else {
            mediaEl.prepend(vid);
        }

        // Add ▶ badge
        const badge = document.createElement('span');
        badge.className = 'project-video-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = '▶ فيديو';
        mediaEl.appendChild(badge);

        // Register with observer
        playObserver.observe(vid);
    }

    /* ── Main: scan all rendered cards ── */
    function initVideoCovers() {
        if (skipVideo) return;  // respect user/device preferences

        // Find all project cards in the DOM
        document.querySelectorAll('.project-card').forEach(card => {
            const mediaEl = card.querySelector('.project-card-media');
            if (!mediaEl) return;

            // Get project id from the card's href
            const href = card.getAttribute('href') || '';
            const idMatch = href.match(/[?&]id=([^&]+)/);
            if (!idMatch) return;
            const pid = decodeURIComponent(idMatch[1]);

            // Look up in projectsData
            if (typeof projectsData === 'undefined') return;
            const project = projectsData.find(p => String(p.id) === pid);
            if (!project) return;

            // Only attach if video field exists
            if (project.video || project.video_mp4 || project.video_webm) {
                attachVideo(mediaEl, project);
            }
        });
    }

    /* ── Run after projects are rendered ── */
    // projects.js renders cards synchronously on DOMContentLoaded
    // so we wait for it then scan
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVideoCovers);
    } else {
        // DOM already ready (deferred scripts)
        initVideoCovers();
    }

    // Re-run if projects are dynamically re-rendered (filter clicks etc.)
    document.addEventListener('rk:projects-rendered', initVideoCovers);

    /* ── Expose for manual trigger ── */
    window.rkInitVideoCovers = initVideoCovers;

})();
