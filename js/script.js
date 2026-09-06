// Footer copyright year
document.getElementById("year").textContent = new Date().getFullYear();

// Shared feature/preference detection used by several effects below.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------------------------------------------------------------------------
// Animated impact counters (count up once, when scrolled into view)
// ---------------------------------------------------------------------------
// Exposed at module scope (not nested in initImpactCounters) because
// initPinSequence also needs to re-trigger it — see the comment below on why.
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10) || 0;
  const suffix = el.dataset.suffix || "";

  if (prefersReducedMotion) {
    el.textContent = target + suffix;
    return;
  }

  const duration = 1400;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function initImpactCounters() {
  const counters = document.querySelectorAll(".counter");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((el) => observer.observe(el));
}

// ---------------------------------------------------------------------------
// Magnetic hover on primary CTA buttons (desktop, fine-pointer only)
// ---------------------------------------------------------------------------
function initMagneticButtons() {
  if (!supportsFinePointer || prefersReducedMotion) return;

  const strength = 0.3;
  const maxOffset = 10;
  const buttons = document.querySelectorAll(".btn-primary, .btn-ghost");

  buttons.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      const x = Math.max(-maxOffset, Math.min(maxOffset, relX * strength));
      const y = Math.max(-maxOffset, Math.min(maxOffset, relY * strength));
      btn.style.transition = "transform 0.05s linear";
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
      btn.style.transform = "translate(0, 0)";
    });
  });
}

// ---------------------------------------------------------------------------
// Custom cursor (desktop, fine-pointer only — never on touch devices)
// ---------------------------------------------------------------------------
function initCustomCursor() {
  if (!supportsFinePointer || prefersReducedMotion) return;

  document.documentElement.classList.add("has-custom-cursor");

  const dot = document.createElement("div");
  dot.className = "custom-cursor-dot";
  dot.setAttribute("aria-hidden", "true");

  const ring = document.createElement("div");
  ring.className = "custom-cursor-ring";
  ring.setAttribute("aria-hidden", "true");

  document.body.append(dot, ring);

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let rafId = null;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  function loop() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(loop);
    }
  });

  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      dot.classList.add("is-active");
      ring.classList.add("is-active");
    });
    el.addEventListener("mouseleave", () => {
      dot.classList.remove("is-active");
      ring.classList.remove("is-active");
    });
  });
}

// ---------------------------------------------------------------------------
// Pinned scroll sequence (Hero / Explainer / Impact)
// ---------------------------------------------------------------------------
// Progressive enhancement ONLY: the page already looks and works correctly
// without this (see the `.pin-*` rules in css/styles.css — a plain sticky
// background behind normally-stacked, normally-scrolling sections). This
// function upgrades that into a true pinned, scroll-scrubbed cross-fade, but
// only when every one of these is true:
//   - GSAP + ScrollTrigger both loaded (a CDN failure just skips this)
//   - the viewport is wide enough to be a real "desktop" layout
//   - the pointer is fine (not a touch/coarse-pointer device)
//   - the user has not requested reduced motion
// If the user's OS-level reduced-motion setting changes to "reduce" after
// this has already run, it tears itself down and reverts to the CSS fallback
// rather than continuing to scroll-jack.
function initPinSequence() {
  const sequence = document.getElementById("pin-sequence");
  if (!sequence) return;

  const MIN_WIDTH = 900;
  const canEnhance =
    typeof gsap !== "undefined" &&
    typeof ScrollTrigger !== "undefined" &&
    supportsFinePointer &&
    !prefersReducedMotion &&
    window.innerWidth >= MIN_WIDTH;

  if (!canEnhance) return;

  gsap.registerPlugin(ScrollTrigger);

  const heroScene = document.querySelector(".scene-hero");
  const explainerScene = document.querySelector(".scene-explainer");
  const impactScene = document.querySelector(".scene-impact");
  if (!heroScene || !explainerScene || !impactScene) return;

  gsap.set(heroScene, { opacity: 1, y: 0, pointerEvents: "auto" });
  gsap.set([explainerScene, impactScene], { opacity: 0, y: 40, pointerEvents: "none" });

  // Fractions (0–1) of the pinned scroll distance where each scene is fully
  // settled — reused below to let the "Impact" nav link jump straight there
  // instead of landing on an invisible, mid-fade copy of the scene.
  const sceneProgress = { hero: 0.02, explainer: 0.5, impact: 0.92 };

  const tl = gsap.timeline({ defaults: { ease: "none" } });

  tl.to(heroScene, { opacity: 0, y: -30, duration: 0.14 }, 0.18)
    .set(heroScene, { pointerEvents: "none" }, 0.32)
    .set(explainerScene, { pointerEvents: "auto" }, 0.24)
    .to(explainerScene, { opacity: 1, y: 0, duration: 0.16 }, 0.24)
    .to(explainerScene, { opacity: 0, y: -30, duration: 0.14 }, 0.6)
    .set(explainerScene, { pointerEvents: "none" }, 0.74)
    .set(impactScene, { pointerEvents: "auto" }, 0.66)
    .to(impactScene, { opacity: 1, y: 0, duration: 0.16 }, 0.66)
    // Background motif drifts subtly across the whole sequence — tied to
    // the actual network/brand motif, not a decorative glow.
    .to(".pinbg-lines", { rotate: 6, transformOrigin: "50% 50%", duration: 1 }, 0)
    .to(".pinbg-nodes", { scale: 1.08, transformOrigin: "50% 50%", duration: 1 }, 0)
    // All three scenes share one bounding box (position: absolute; inset: 0)
    // for the whole pinned sequence, so the impact counters' own
    // IntersectionObserver sees them as "in view" from the very start and
    // finishes counting invisibly before opacity ever reaches 1. Re-trigger
    // it explicitly at the moment the Impact scene actually finishes fading
    // in, so what the viewer sees still counts up.
    .call(
      () => {
        document.querySelectorAll(".scene-impact .counter").forEach(animateCounter);
      },
      [],
      0.82
    );

  const st = ScrollTrigger.create({
    trigger: sequence,
    start: "top top",
    end: () => "+=" + window.innerHeight * 2.2,
    pin: true,
    scrub: 0.3,
    animation: tl,
    invalidateOnRefresh: true,
  });

  sequence.classList.add("pin-active");

  window.addEventListener("load", () => ScrollTrigger.refresh());

  // "Impact" in the nav points at #impact, which now lives inside the pinned
  // sequence rather than at its own normal-flow position. Jump to the point
  // in the pinned scroll range where that scene is fully visible instead of
  // relying on the browser's default anchor-scroll (which would just land at
  // the top of the whole pinned section).
  const impactLink = document.querySelector('[data-scene-link="impact"]');
  if (impactLink) {
    impactLink.addEventListener("click", (e) => {
      e.preventDefault();
      const target = st.start + sceneProgress.impact * (st.end - st.start);
      window.scrollTo({ top: target, behavior: "smooth" });
    });
  }

  function teardown() {
    st.kill();
    tl.kill();
    sequence.classList.remove("pin-active");
    gsap.set([heroScene, explainerScene, impactScene], { clearProps: "all" });
  }

  // If the user turns on reduced motion mid-session, stop scroll-jacking
  // immediately rather than waiting for a reload.
  window
    .matchMedia("(prefers-reduced-motion: reduce)")
    .addEventListener("change", (e) => {
      if (e.matches) teardown();
    });
}

initImpactCounters();
initMagneticButtons();
initCustomCursor();
initPinSequence();
