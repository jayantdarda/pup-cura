/* =================================================================
   PUP CURA — app.js
   Preloader · Menu · Smooth scroll · Reveal · Film grain · Progress
 ================================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------------
     1. PRELOADER — counter 0 → 99 then curtain unwind
  --------------------------------------------------------------- */
  (function preloader() {
    const loader = document.getElementById("pageLoader");
    const numEl = document.getElementById("loaderNum");
    if (!loader || !numEl) return;

    let shown = 0;
    const start = performance.now();
    const DURATION = 2000;

    // Stepped schedule — eases rather than counting linearly.
    const schedule = (t) => {
      if (t < 0.25) return 70 * (t / 0.25);
      if (t < 0.45) return 70;
      if (t < 0.6)  return 70 + 10 * ((t - 0.45) / 0.15);
      if (t < 0.75) return 80;
      if (t < 0.9)  return 80 + 10 * ((t - 0.75) / 0.15);
      return 90 + 9 * ((t - 0.9) / 0.1); // reaches 99 at t=1
    };

    const ease = (n, target) => n + 0.09 * (target - n);

    function finish() {
      if (loader.dataset.finished === "1") return;
      loader.dataset.finished = "1";
      numEl.textContent = "100";
      loader.classList.add("is-done");
      document.body.classList.add("is-loaded");
      setTimeout(() => {
        loader.setAttribute("aria-hidden", "true");
        loader.style.visibility = "hidden";
        loader.style.pointerEvents = "none";
      }, 1200);
    }

    function tick(now) {
      if (loader.dataset.finished === "1") return;
      const t = Math.min((now - start) / DURATION, 1);
      const target = schedule(t);
      shown = ease(shown, Math.min(target, 99));
      const displayed = Math.round(shown);
      numEl.textContent = displayed;
      if (displayed < 99) requestAnimationFrame(tick);
      else setTimeout(finish, 250);
    }

    const startTick = () => requestAnimationFrame(tick);
    if (document.readyState === "complete") startTick();
    else window.addEventListener("load", startTick, { once: true });

    // Safety net — never let the curtain sit longer than 4s.
    setTimeout(finish, 4000);
  })();

  /* ---------------------------------------------------------------
     2. MENU OVERLAY — hamburger / full-screen slide-up
  --------------------------------------------------------------- */
  (function menu() {
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("menu");
    if (!toggle || !menu) return;

    const closeMenu = () => {
      menu.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("is-locked", "is-menu-open");
    };

    const openMenu = () => {
      menu.classList.add("is-open");
      toggle.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.classList.add("is-locked", "is-menu-open");
    };

    toggle.addEventListener("click", () => {
      menu.classList.contains("is-open") ? closeMenu() : openMenu();
    });

    menu.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", closeMenu),
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) closeMenu();
    });
  })();

  /* ---------------------------------------------------------------
     3. SMOOTH SCROLL for in-page anchors
  --------------------------------------------------------------- */
  (function smoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const id = this.getAttribute("href");
        if (id === "#" || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      });
    });
  })();

  /* ---------------------------------------------------------------
     4. SCROLL PROGRESS INDICATOR — "0% → 100%" fixed corner
  --------------------------------------------------------------- */
  (function progress() {
    const el = document.querySelector(".progress");
    if (!el) return;
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      el.textContent = pct + "%";
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true },
    );
    update();
  })();

  /* ---------------------------------------------------------------
     5. IMAGE REVEALS — clip-path wipe as each image enters view
        (Fallback for browsers without animation-timeline: view())
  --------------------------------------------------------------- */
  (function imageReveal() {
    const wraps = document.querySelectorAll(".img-wrap, .guide-card");
    if (!wraps.length) return;

    if (!("IntersectionObserver" in window)) {
      wraps.forEach((w) => w.classList.add("is-revealed"));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    wraps.forEach((w) => obs.observe(w));
  })();

  /* ---------------------------------------------------------------
     6. SECTION REVEALS — fade-up on .reveal / .section-anim
        (Fallback for browsers without animation-timeline: view())
  --------------------------------------------------------------- */
  (function sectionReveal() {
    const els = document.querySelectorAll(".reveal, .section-anim");
    if (!els.length) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
  })();

  /* ---------------------------------------------------------------
     7. FILM GRAIN — canvas noise overlay (podium.global signature)
        ~20fps, mix-blend-mode: overlay handled in CSS.
  --------------------------------------------------------------- */
  (function filmGrain() {
    const canvas = document.querySelector("canvas.grain");
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const resize = () => {
      // Quarter resolution keeps the grain soft & saves CPU.
      canvas.width = Math.floor(window.innerWidth / 2);
      canvas.height = Math.floor(window.innerHeight / 2);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    let frame = 0;
    const render = () => {
      if (frame++ % 3 === 0) {
        const id = ctx.createImageData(canvas.width, canvas.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 18; // soft alpha
        }
        ctx.putImageData(id, 0, 0);
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  })();

  /* ---------------------------------------------------------------
     8. HERO PARALLAX — subtle scroll-driven translate on hero image
        Used as a JS fallback where animation-timeline: scroll(root)
        is not supported (Firefox/Safari <26).
  --------------------------------------------------------------- */
  (function heroParallax() {
    const hero = document.querySelector(".hero__media");
    if (!hero) return;

    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      const y = Math.min(window.scrollY, vh);
      const p = y / vh; // 0 → 1 across first viewport
      hero.style.transform = `translate3d(0, ${p * 18}vh, 0) scale(${1 + p * 0.06})`;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true },
    );
    update();
  })();

  /* ---------------------------------------------------------------
     9. STATS COUNT-UP — animate the stats strip when it enters view
        Respects prefers-reduced-motion (jumps to final value).
  --------------------------------------------------------------- */
  (function statsCountUp() {
    const stats = document.querySelectorAll(".stat__num");
    if (!stats.length) return;

    const reduceMo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const format = (n) => n.toLocaleString("en-US");

    const run = (el) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      const suffix = el.dataset.suffix || "";
      if (reduceMo) {
        el.textContent = format(target) + suffix;
        return;
      }
      const DURATION = 1800;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / DURATION, 1);
        // ease-out cubic — feels calmer than linear
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.round(eased * target);
        el.textContent = format(value) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      stats.forEach(run);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 },
    );
    stats.forEach((el) => obs.observe(el));
  })();

  /* ---------------------------------------------------------------
     10. MAGNETIC HOVER — elements with [data-magnetic] get pulled
         toward the cursor. Disabled on touch devices.
  --------------------------------------------------------------- */
  (function magnetic() {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const els = document.querySelectorAll("[data-magnetic]");
    if (!els.length) return;

    els.forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.4;
      let raf = 0;
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * strength;
        const dy = (e.clientY - cy) * strength;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        });
      };
      const reset = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = "";
        });
      };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", reset);
    });
  })();

  /* ---------------------------------------------------------------
     11. CURSOR FOLLOWER — small inverted dot, grows over magnetic
         elements. Disabled on touch devices and reduce-motion.
  --------------------------------------------------------------- */
  (function cursorDot() {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);

    let x = window.innerWidth / 2,
      y = window.innerHeight / 2;
    let tx = x,
      ty = y;
    let visible = false;

    window.addEventListener(
      "mousemove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!visible) {
          visible = true;
          dot.style.opacity = "0.85";
        }
      },
      { passive: true },
    );

    // Lerp toward target — gentle lag keeps it feeling organic.
    const render = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    // Grow near magnetic / interactive elements
    document.querySelectorAll("[data-magnetic], .menu__chip, .footer__link").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        dot.style.width = "40px";
        dot.style.height = "40px";
        dot.style.opacity = "0.5";
      });
      el.addEventListener("mouseleave", () => {
        dot.style.width = "8px";
        dot.style.height = "8px";
        dot.style.opacity = "0.85";
      });
    });
  })();

  /* ---------------------------------------------------------------
     12. SECTION OPENER TEXT-MASK REVEAL
         Each .section-opener .section-title-lg rises out of its own
         clip mask when the opener enters view. Mirrors the letsplayfight
         nav text-slide hover effect, applied on scroll.
  --------------------------------------------------------------- */
  (function sectionOpenerReveal() {
    const openers = document.querySelectorAll(".section-opener");
    if (!openers.length) return;
    if (!("IntersectionObserver" in window)) {
      openers.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            // Also un-hide any nested .section-title-lg via clone trick
            const title = entry.target.querySelector(".section-title-lg");
            if (title && !title.dataset.text) {
              title.dataset.text = title.textContent;
            }
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -15% 0px" },
    );
    openers.forEach((el) => obs.observe(el));
  })();
})();
