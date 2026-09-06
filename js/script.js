// Footer copyright year
document.getElementById("year").textContent = new Date().getFullYear();

// Shared feature/preference detection used by several effects below.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Shared with initImpactCounters below (see the comment there on why it
// needs to know this ahead of time) — kept as a single source of truth so
// the two never drift apart and silently disagree about which tier is
// active.
const PIN_SEQUENCE_MIN_WIDTH = 900;
function canRunPinSequence() {
  return (
    typeof gsap !== "undefined" &&
    typeof ScrollTrigger !== "undefined" &&
    supportsFinePointer &&
    !prefersReducedMotion &&
    window.innerWidth >= PIN_SEQUENCE_MIN_WIDTH
  );
}

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

  // On the tier-3 desktop path, initPinSequence (which runs after this,
  // later in the same synchronous init pass) stacks every scene at the
  // same absolute inset:0 box the moment it runs. By the time this
  // observer's callback actually fires (IntersectionObserver always
  // reports asynchronously, on a later frame), that's already true — so
  // .scene-impact's counters read as "in view" immediately, and finish
  // counting up silently behind the still-opaque Hero scene before the
  // visitor has scrolled anywhere near Impact. initPinSequence already
  // re-triggers these same counters explicitly, in sync with its own
  // timeline, once Impact's scene has actually faded in (see the .call()
  // there) — so on this tier, skip observing them here entirely. Besides
  // the invisible pre-completion, leaving the observer active here too
  // risks a second, overlapping rAF loop racing that retrigger if a fast
  // scroll reaches Impact before the first loop has finished.
  const impactHandledByPinSequence = canRunPinSequence();

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

  counters.forEach((el) => {
    if (impactHandledByPinSequence && el.closest(".scene-impact")) return;
    observer.observe(el);
  });
}

// ---------------------------------------------------------------------------
// Scroll-reveal for the Story and CTA photos (fade + rise once, in view)
// ---------------------------------------------------------------------------
function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal-on-scroll");
  if (!targets.length) return;

  if (prefersReducedMotion) {
    // Base CSS already renders these fully visible with no query — nothing
    // to do; just make sure no leftover class affects anything.
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  targets.forEach((el) => observer.observe(el));
}

// ---------------------------------------------------------------------------
// Leadership page: cards animate in progressively as the grid scrolls into
// view (Stage 3a). No-op on any page without a .leadership-card (i.e. every
// page but team.html). Unlike the Home page's pinned sequences, this isn't
// gated to a wide/fine-pointer tier — it's a plain non-pinned scroll-in,
// cheap enough to run on every device, same as initScrollReveal above.
// ---------------------------------------------------------------------------
function initLeadershipReveal() {
  const cards = document.querySelectorAll(".leadership-card");
  if (!cards.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    // Base CSS already renders the cards fully visible in their final
    // position with no query — nothing to do.
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.set(cards, { opacity: 0, y: 36 });

  // .batch groups cards that scroll into view together (e.g. a whole row at
  // once on desktop) and staggers just that group, rather than staggering
  // the full 6-card sequence from the moment the first one appears.
  ScrollTrigger.batch(cards, {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
      }),
  });
}

// ---------------------------------------------------------------------------
// Pitch Videos page: coverflow carousel (Stage 4b — replaced the original
// scroll-stagger grid entirely, see git history for that version). No-op on
// any page without a .pitch-swiper (i.e. every page but pitch-videos.html),
// and if the Swiper CDN fails: Swiper's own CSS (loaded via a separate
// <link>, so it can succeed independently of the JS) still lays the slides
// out in a plain flex row, just without the coverflow transform/JS-driven
// navigation — degraded, not broken.
//
// Reduced motion here doesn't disable the carousel (per the brief: it must
// stay fully navigable), only its transition animation — speed: 0 makes
// slide changes instant while keeping the coverflow arrangement, dragging,
// keyboard nav, and pagination all working exactly the same.
// ---------------------------------------------------------------------------
function initPitchVideoCarousel() {
  const el = document.querySelector(".pitch-swiper");
  if (!el || typeof Swiper === "undefined") return;

  new Swiper(el, {
    effect: "coverflow",
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: "auto",
    loop: false,
    coverflowEffect: {
      rotate: 30,
      stretch: 0,
      depth: 150,
      modifier: 1,
      slideShadows: true,
    },
    keyboard: { enabled: true },
    // Trackpad two-finger swipe (Stage 4d) sends wheel events, not touch
    // events, so it doesn't reach Swiper's existing drag handling at all
    // without this. forceToAxis: true is what keeps this additive rather
    // than disruptive: Swiper only acts on (and calls preventDefault for)
    // wheel events whose horizontal delta dominates, matching this
    // carousel's own horizontal axis — a vertical two-finger scroll, even
    // with the cursor sitting right over the carousel, is left alone and
    // falls through to the page as normal scroll. thresholdDelta/
    // thresholdTime debounce the many rapid wheel events one continuous
    // swipe fires into a single slide change rather than skipping several.
    mousewheel: {
      forceToAxis: true,
      sensitivity: 1,
      thresholdDelta: 30,
      thresholdTime: 400,
      releaseOnEdges: true,
    },
    // Explicit autoplay:false isn't a real Swiper option (it's just absent
    // by default) — the comment is here so nobody adds one later: these are
    // videos a visitor may be mid-watch on, so navigation must stay
    // user-driven only, never automatic.
    pagination: { el: ".pitch-swiper .swiper-pagination", clickable: true },
    navigation: {
      nextEl: ".pitch-swiper .swiper-button-next",
      prevEl: ".pitch-swiper .swiper-button-prev",
    },
    speed: prefersReducedMotion ? 0 : 600,
  });
}

// ---------------------------------------------------------------------------
// Pitch Videos page: clicking a slide's play button lazily builds and
// inserts the YouTube embed for that slide only — nothing loads or plays
// until clicked, so all 6 slides never load 6 iframes at once. Plain click
// interaction, not gated by reduced-motion or Swiper/GSAP: this isn't a
// motion effect and must work even if a CDN fails.
// ---------------------------------------------------------------------------
function initPitchVideoPlayback() {
  const thumbs = document.querySelectorAll(".pitch-slide-thumb");
  if (!thumbs.length) return;

  thumbs.forEach((thumb) => {
    const button = thumb.querySelector(".pitch-play-button");
    const videoId = thumb.dataset.videoId;
    if (!button || !videoId) return;

    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
      iframe.title = thumb.dataset.videoTitle || "Pitch video";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.loading = "lazy";
      thumb.replaceChildren(iframe);
    });
  });
}

// ---------------------------------------------------------------------------
// Pitch Videos page: one-time entrance sequence on page load (Stage 4c) —
// background flourish, then the title staggers in word by word (same
// overflow-hidden-mask technique as Home's hero, driven by GSAP here
// instead of Home's CSS keyframes so the whole sequence can be timed
// against one master timeline), then the subtitle/consent note, then the
// carousel's cards settle into place starting from the center one. Must
// run AFTER initPitchVideoCarousel so Swiper has already positioned the
// slides before anything here starts adjusting their inner .pitch-slide-
// card's opacity/scale — this never touches .swiper-slide itself, so it
// can't fight Swiper's own coverflow transform.
//
// Reduced motion skips the whole thing per the brief: no gsap.set() ever
// runs, so nothing gets hidden in the first place — base CSS already
// renders the flourish at opacity: 0 (permanently, for that visitor) and
// every word/paragraph/card at full opacity in its normal position. A
// GSAP CDN failure degrades the exact same way.
// ---------------------------------------------------------------------------
function initPitchVideoEntrance() {
  const hero = document.querySelector(".pitch-videos-hero");
  if (!hero) return;

  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const flourish = document.querySelector(".pitch-videos-flourish");
  const words = document.querySelectorAll(".pitch-videos-hero .pv-reveal-word-inner");
  const lede = document.querySelector(".pitch-videos-hero-lede");
  const consentNote = document.querySelector(".pitch-videos-placeholder-note");
  const cards = document.querySelectorAll(".pitch-slide-card");
  const fadeUpTargets = [lede, consentNote].filter(Boolean);

  if (flourish) gsap.set(flourish, { opacity: 0, scale: 0.85, rotate: -8 });
  if (words.length) gsap.set(words, { yPercent: 115 });
  if (fadeUpTargets.length) gsap.set(fadeUpTargets, { opacity: 0, y: 18 });
  if (cards.length) gsap.set(cards, { opacity: 0, y: 20, scale: 0.85 });

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  if (flourish) {
    tl.to(flourish, { opacity: 0.4, scale: 1, rotate: 0, duration: 0.35 }, 0).to(
      flourish,
      { opacity: 0, duration: 0.35 },
      0.35
    );
  }

  if (words.length) {
    tl.to(
      words,
      { yPercent: 0, duration: 0.45, stagger: 0.045, ease: "power3.out" },
      0.15
    );
  }

  if (fadeUpTargets.length) {
    tl.to(fadeUpTargets, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, 0.55);
  }

  if (cards.length) {
    // from: "center" starts with the active/centered slide, then works
    // outward to the ones angled off to each side — matching the brief's
    // "center slide scales/fades up first, side slides shortly after."
    tl.to(
      cards,
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: { each: 0.08, from: "center" } },
      0.75
    );
  }
}

// ---------------------------------------------------------------------------
// Our Story's entrance fade (Stage 2g, half of the Top Teams -> Story
// bridge). Story sits in plain normal document flow regardless of which
// Top Teams tier ran before it, so this is a lightweight, non-pinned scrub
// on the section's own opacity as it scrolls into view — cheap enough to
// run on every device (same gating as initScrollReveal's photo fades, no
// width/pointer check needed). Pairs with Top Teams' .tt-pin-exit-fade on
// desktop (tier 3); on tiers 1-2, where nothing pins or fades on the way
// out, this fade-in alone still softens the boundary rather than an
// instant pop, which is the "simplified" treatment the brief allows for
// when a device doesn't get the full pinned handoff.
// ---------------------------------------------------------------------------
function initStoryEntranceFade() {
  const story = document.getElementById("story");
  if (!story) return;
  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.set(story, { opacity: 0 });

  gsap.to(story, {
    opacity: 1,
    ease: "none",
    scrollTrigger: {
      trigger: story,
      start: "top bottom",
      end: "top 55%",
      scrub: 0.3,
    },
  });
}

// ---------------------------------------------------------------------------
// Top Teams podium — three tiers, same shape as the Hero/Explainer/Impact
// sequence's own gating:
//   1. Reduced motion, or no GSAP/ScrollTrigger: do nothing here at all.
//      Plain CSS already shows the title and all three cards together in
//      their final podium arrangement, normal document scroll, no confetti.
//   2. Motion OK, but touch/coarse-pointer or a narrow (<900px) viewport:
//      initTopTeamsSimpleReveal — a non-pinned scrub tied to normal scroll
//      (no pin:true), safe on touch scrolling.
//   3. Motion OK, fine pointer, wide viewport: initTopTeamsPinSequence —
//      pins the section and drives four phases (title alone -> 3rd -> 2nd
//      -> 1st + confetti -> release), using the exact pin mechanism as the
//      Hero sequence.
// In every tier, confetti is a plain one-shot flag check, never scrubbed —
// a fire-and-forget burst can't sensibly reverse or replay without looking
// broken, so it always fires exactly once and never again regardless of
// scrolling back and forth past that point afterward.
// ---------------------------------------------------------------------------
function triggerConfetti(targetEl) {
  if (typeof confetti === "undefined") return; // CDN failure: skip quietly

  const rect = targetEl.getBoundingClientRect();
  const originX = (rect.left + rect.width / 2) / window.innerWidth;
  const originY = Math.max(rect.top / window.innerHeight, 0.1);
  const isSmallScreen = window.innerWidth < 700;

  confetti({
    particleCount: isSmallScreen ? 35 : 70,
    spread: 65,
    startVelocity: 32,
    ticks: 160,
    scalar: 0.9,
    origin: { x: originX, y: originY },
    colors: ["#FFBF00", "#EC2088", "#3AA9E0", "#2BBBA0"],
  });
}

function initTopTeamsAnimation() {
  const section = document.getElementById("top-teams");
  if (!section) return;

  // Reduced motion, or a CDN failure: leave everything exactly as plain CSS
  // already renders it — fully visible, no confetti, no exceptions.
  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  const MIN_WIDTH = 900;
  const canPin = supportsFinePointer && window.innerWidth >= MIN_WIDTH;

  if (canPin) {
    initTopTeamsPinSequence(section);
  } else {
    initTopTeamsSimpleReveal(section);
  }
}

// Tier 2: non-pinned scrub, tied to normal scroll through the section as it
// sits in plain document flow (see css/styles.css — no `.tt-pin-active`
// rules apply here, so this is just the section's ordinary layout).
function initTopTeamsSimpleReveal(section) {
  const thirdCard = section.querySelector(".team-card-third");
  const secondCard = section.querySelector(".team-card-second");
  const firstCard = section.querySelector(".team-card-first");
  if (!thirdCard || !secondCard || !firstCard) return;

  gsap.set([thirdCard, secondCard, firstCard], { opacity: 0, y: 40 });

  // Fractions (0–1) of the scrubbed range. 1st place finishing at 0.95 (not
  // 1.0) leaves a small settled buffer before the trigger's end, so the
  // confetti moment doesn't land exactly at the very edge of the range.
  const tl = gsap.timeline({ defaults: { ease: "none" } });
  tl.to(thirdCard, { opacity: 1, y: 0, duration: 0.33 }, 0)
    .to(secondCard, { opacity: 1, y: 0, duration: 0.33 }, 0.3)
    .to(firstCard, { opacity: 1, y: 0, duration: 0.35 }, 0.6);

  const FIRST_PLACE_DONE = 0.95;
  let confettiFired = false;

  ScrollTrigger.create({
    trigger: section,
    start: "top 80%",
    end: () => "+=" + window.innerHeight * 2,
    scrub: 0.4,
    animation: tl,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      if (!confettiFired && self.progress >= FIRST_PLACE_DONE) {
        confettiFired = true;
        triggerConfetti(firstCard);
      }
    },
  });
}

// Tier 3: pins the section (same ScrollTrigger pin:true mechanism as
// initPinSequence for the Hero) and scrubs through four phases:
//   Phase 0  0.00–0.14  title alone, holding
//   (fade)   0.14–0.22  title fades out
//   Phase 1  0.18–0.34  3rd place arrives
//   Phase 2  0.42–0.58  2nd place arrives (3rd stays)
//   Phase 3  0.66–0.82  1st place arrives; confetti fires right at 0.82
//   Phase 4  0.82–1.00  hold on the full podium before the pin releases
function initTopTeamsPinSequence(section) {
  const stage = section.querySelector(".top-teams-pin-stage");
  const titleEl = section.querySelector(".top-teams-title");
  const thirdCard = section.querySelector(".team-card-third");
  const secondCard = section.querySelector(".team-card-second");
  const firstCard = section.querySelector(".team-card-first");
  const entryFade = section.querySelector(".tt-pin-entry-fade");
  const exitFade = section.querySelector(".tt-pin-exit-fade");
  if (!stage || !titleEl || !thirdCard || !secondCard || !firstCard) return;

  gsap.set(titleEl, { opacity: 1, y: 0 });
  gsap.set([thirdCard, secondCard, firstCard], { opacity: 0, y: 40 });
  // Entry fade starts fully opaque (the same solid color Impact's exit fade
  // just settled on) and clears during Phase 0's opening moment; exit fade
  // starts clear and covers the podium again during the tail of Phase 4 —
  // see the Stage 2g comment on .pin-exit-fade in css/styles.css.
  if (entryFade) gsap.set(entryFade, { opacity: 1 });
  if (exitFade) gsap.set(exitFade, { opacity: 0 });

  const tl = gsap.timeline({ defaults: { ease: "none" } });
  tl.to(titleEl, { opacity: 0, y: -20, duration: 0.08 }, 0.14)
    .to(thirdCard, { opacity: 1, y: 0, duration: 0.16 }, 0.18)
    .to(secondCard, { opacity: 1, y: 0, duration: 0.16 }, 0.42)
    .to(firstCard, { opacity: 1, y: 0, duration: 0.16 }, 0.66)
    // Background motif drifts continuously across the whole sequence —
    // present from Phase 0 and still moving through the final hold, per
    // the brief, tied to the actual brand motif rather than a decorative
    // loop running independently of scroll.
    .to(".tt-pinbg-lines", { rotate: 8, transformOrigin: "50% 50%", duration: 1 }, 0)
    .to(".tt-pinbg-nodes", { scale: 1.1, transformOrigin: "50% 50%", duration: 1 }, 0);

  if (entryFade) tl.to(entryFade, { opacity: 0, duration: 0.08 }, 0);
  if (exitFade) tl.to(exitFade, { opacity: 1, duration: 0.08 }, 0.92);

  const FIRST_PLACE_DONE = 0.82;
  let confettiFired = false;

  // Add the class BEFORE creating the ScrollTrigger, not after: unlike the
  // Hero sequence (whose fallback .scene already carries an unconditional
  // min-height: 100vh, so its pin dimensions happen to be correct either
  // way), this section's fallback layout is a compact normal-flow block.
  // Measuring before switching to the pin-ready 100vh layout would freeze
  // the pin/spacer at that much shorter height.
  section.classList.add("tt-pin-active");

  const st = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: () => "+=" + window.innerHeight * 3,
    pin: true,
    scrub: 0.4,
    animation: tl,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      if (!confettiFired && self.progress >= FIRST_PLACE_DONE) {
        confettiFired = true;
        triggerConfetti(firstCard);
      }
    },
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());

  function teardown() {
    st.kill();
    tl.kill();
    section.classList.remove("tt-pin-active");
    gsap.set([titleEl, thirdCard, secondCard, firstCard], { clearProps: "all" });
    if (entryFade) gsap.set(entryFade, { clearProps: "all" });
    if (exitFade) gsap.set(exitFade, { clearProps: "all" });
  }

  // Same live safeguard as the Hero sequence: stop pinning immediately if
  // the user turns on reduced motion mid-session, rather than waiting for
  // a reload.
  window
    .matchMedia("(prefers-reduced-motion: reduce)")
    .addEventListener("change", (e) => {
      if (e.matches) teardown();
    });
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
// Impact photo gallery: text stays fixed, 8 images cross-fade with a Ken
// Burns pan/zoom as the timeline scrubs through [start, end]. Called from
// initPinSequence, which already knows the enhancement is safe to run.
// ---------------------------------------------------------------------------
function initImpactGallery(tl, start, end) {
  const images = document.querySelectorAll(".impact-gallery-img");
  if (!images.length) return;

  // Eight distinct pan/zoom treatments so the sequence reads as deliberate
  // rather than the same effect repeated on every photo.
  const kenBurnsVariants = [
    { from: { scale: 1, xPercent: 0, yPercent: 0 }, to: { scale: 1.14, xPercent: 0, yPercent: 0 } }, // zoom in
    { from: { scale: 1.1, xPercent: -3, yPercent: 0 }, to: { scale: 1.1, xPercent: 3, yPercent: 0 } }, // pan left -> right
    { from: { scale: 1.14, xPercent: 0, yPercent: 0 }, to: { scale: 1, xPercent: 0, yPercent: 0 } }, // zoom out
    { from: { scale: 1.1, xPercent: 0, yPercent: -3 }, to: { scale: 1.1, xPercent: 0, yPercent: 3 } }, // pan top -> bottom
    { from: { scale: 1.1, xPercent: 3, yPercent: 0 }, to: { scale: 1.1, xPercent: -3, yPercent: 0 } }, // pan right -> left
    { from: { scale: 1, xPercent: -2, yPercent: -2 }, to: { scale: 1.14, xPercent: 2, yPercent: 2 } }, // zoom in, diagonal
    { from: { scale: 1.1, xPercent: 0, yPercent: 3 }, to: { scale: 1.1, xPercent: 0, yPercent: -3 } }, // pan bottom -> top
    { from: { scale: 1.14, xPercent: 2, yPercent: -2 }, to: { scale: 1, xPercent: -2, yPercent: 2 } }, // zoom out, diagonal
  ];

  const slot = (end - start) / images.length;
  const fadeDuration = slot * 0.3;

  images.forEach((img, i) => {
    const variant = kenBurnsVariants[i % kenBurnsVariants.length];
    const slotStart = start + i * slot;

    gsap.set(img, { ...variant.from, opacity: 0 });

    // Pan/zoom runs across the whole slot so motion is already under way
    // when the cross-fade edges hit, instead of starting from a standstill.
    tl.fromTo(img, variant.from, { ...variant.to, duration: slot }, slotStart);
    tl.to(img, { opacity: 1, duration: fadeDuration }, slotStart);

    if (i < images.length - 1) {
      tl.to(img, { opacity: 0, duration: fadeDuration }, slotStart + slot - fadeDuration);
    }
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

  if (!canRunPinSequence()) return;

  gsap.registerPlugin(ScrollTrigger);

  const heroScene = document.querySelector(".scene-hero");
  const explainerScene = document.querySelector(".scene-explainer");
  const impactScene = document.querySelector(".scene-impact");
  const pinExitFade = document.querySelector(".pin-exit-fade");
  if (!heroScene || !explainerScene || !impactScene) return;

  gsap.set(heroScene, { opacity: 1, y: 0, pointerEvents: "auto" });
  gsap.set([explainerScene, impactScene], { opacity: 0, y: 40, pointerEvents: "none" });
  // Starts fully clear; fades to solid charcoal-deep during the tail of
  // Impact's hold, handing off to Top Teams' matching entry fade — see the
  // Stage 2g comment on .pin-exit-fade in css/styles.css.
  if (pinExitFade) gsap.set(pinExitFade, { opacity: 0 });

  // Fractions (0–1) of the pinned scroll distance where each scene is fully
  // settled — reused below to let the "Impact" nav link jump straight there
  // instead of landing on an invisible, mid-fade copy of the scene. "impact"
  // lands mid-gallery, once the stats are fully visible and cycling.
  const sceneProgress = { hero: 0.02, explainer: 0.24, impact: 0.55 };

  // Guards the counter retrigger below (see its comment) so it only ever
  // fires once, no matter how many times the visitor scrolls back and
  // forth across GALLERY_START afterward.
  let impactCountersTriggered = false;

  // Impact's photo gallery gets the bulk of the sequence (0.42–0.94) — text
  // stays fixed there while 8 images cross-fade with a Ken Burns pan/zoom.
  const GALLERY_START = 0.42;
  const GALLERY_END = 0.94;

  const tl = gsap.timeline({ defaults: { ease: "none" } });

  tl.to(heroScene, { opacity: 0, y: -30, duration: 0.06 }, 0.07)
    .set(heroScene, { pointerEvents: "none" }, 0.13)
    .set(explainerScene, { pointerEvents: "auto" }, 0.11)
    .to(explainerScene, { opacity: 1, y: 0, duration: 0.08 }, 0.11)
    .to(explainerScene, { opacity: 0, y: -30, duration: 0.06 }, 0.3)
    .set(explainerScene, { pointerEvents: "none" }, 0.36)
    .set(impactScene, { pointerEvents: "auto" }, 0.34)
    .to(impactScene, { opacity: 1, y: 0, duration: 0.08 }, 0.34)
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
    //
    // GSAP fires a `.call()` every time the scrubbed playhead crosses its
    // position, in either direction — so without a guard, scrolling past
    // this point, back up over it, then back down again re-runs
    // animateCounter on every crossing. Each call starts its own
    // requestAnimationFrame loop with no way to cancel the previous one, so
    // repeated crossings pile up overlapping loops racing to write the same
    // element's textContent; whichever happens to finish last wins, and in
    // practice the counters just end up looking pre-completed again instead
    // of visibly counting up. animateCounter is meant to run once per
    // element (that's why the plain IntersectionObserver path unobserves
    // after its first fire) — mirror that here with a one-shot guard so
    // this retrigger only ever fires the first time, regardless of how much
    // the visitor scrolls back and forth over the boundary afterward.
    .call(
      () => {
        if (impactCountersTriggered) return;
        impactCountersTriggered = true;
        document.querySelectorAll(".scene-impact .counter").forEach(animateCounter);
      },
      [],
      GALLERY_START
    );

  if (pinExitFade) tl.to(pinExitFade, { opacity: 1, duration: 0.08 }, 0.92);

  initImpactGallery(tl, GALLERY_START, GALLERY_END);

  const galleryScrollHeights = 3.5; // roughly how many viewport-heights the gallery itself deserves
  const st = ScrollTrigger.create({
    trigger: sequence,
    start: "top top",
    end: () => "+=" + window.innerHeight * (2.2 + galleryScrollHeights),
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
    gsap.set(document.querySelectorAll(".impact-gallery-img"), { clearProps: "all" });
    if (pinExitFade) gsap.set(pinExitFade, { clearProps: "all" });
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
initScrollReveal();
initLeadershipReveal();
initPitchVideoCarousel();
initPitchVideoPlayback();
// Must run after initPitchVideoCarousel: it animates each slide's own
// .pitch-slide-card, which needs Swiper to have already applied its
// coverflow positioning to the parent .swiper-slide first.
initPitchVideoEntrance();
initMagneticButtons();
initCustomCursor();
// Both pin sequences must run first: each adds a large ScrollTrigger
// spacer that pushes everything after it (including #story) much further
// down the page. initStoryEntranceFade measures #story's position when it
// runs — creating it before those spacers exist would capture the wrong
// (pre-pin) position and the fade would trigger at the wrong scroll point.
initPinSequence();
initTopTeamsAnimation();
initStoryEntranceFade();
