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
// Site-wide: the nav wordmark ("Hult Prize @ UC Davis") doubles as a Home
// button that always does a genuine full page reload — never a manual
// reset of hero-entrance/pin-sequence/ScrollTrigger state, which would be
// fragile and easy to leave something out of. A real reload naturally
// resets scroll position and re-runs every script from scratch, which is
// what actually guarantees "everything resets," not custom logic.
//
// From any OTHER page, the wordmark's plain index.html#top href already
// forces a real cross-page navigation on click — no JS needed, that's just
// how browsers handle a link to a different document. The one case that
// needs help is clicking it while already ON the Home page: index.html's
// own copy of this link is a bare #top same-page anchor, which browsers
// only scroll to (and, if already sitting at that hash, may not even do
// that) rather than reload. This detects that case specifically and forces
// location.reload() instead — clearing any other in-page hash first (e.g.
// left over from an earlier click on "Our Story") so the reload can't land
// somewhere other than the top.
// ---------------------------------------------------------------------------
function initHomeLogoReset() {
  const logo = document.querySelector(".wordmark");
  if (!logo) return;

  const path = location.pathname.split("/").pop();
  const onHomePage = path === "" || path === "index.html";
  if (!onHomePage) return;

  logo.addEventListener("click", (e) => {
    e.preventDefault();
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    location.reload();
  });
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
// Timeline page: the "You Are Here" marker position and every event's day-
// count/completed/next-up state (Stage 5a). Deliberately NOT gated by
// prefersReducedMotion or GSAP availability — per the brief, this is the
// page's actual content (which point in the timeline is "now," how many
// days until each event), not a motion effect, and must stay correct
// regardless of motion preference or a GSAP CDN failure. Only
// initEventTimelineReveal below (the scroll-triggered entrance) and the
// track/marker pulse (CSS, gated in styles.css) are motion-gated.
// ---------------------------------------------------------------------------
function initEventTimelinePositions() {
  const track = document.querySelector(".timeline-track");
  const items = document.querySelectorAll(".timeline-event");
  if (!track || !items.length) return;

  // Every date below comes from each .timeline-event's data-event-date
  // ("YYYY-MM-DD") in timeline.html — ALL of them are illustrative
  // PLACEHOLDERS for this page's build (Stage 5a), not confirmed real
  // dates; the site owner must replace both the attribute and the visible
  // .timeline-card-date text for each event before launch.
  //
  // Parsed via new Date(year, monthIndex, day) — explicit numeric args,
  // never new Date("YYYY-MM-DD") — because the string form parses as UTC
  // midnight, which shifts to the previous day once displayed/compared in
  // any timezone west of UTC (i.e. most of North America). Using the
  // numeric constructor for both this and "today" below keeps both sides
  // of every subtraction in the same (local) time reference, which is what
  // actually avoids the off-by-one bug rather than any particular rounding
  // choice.
  function parseLocalDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const events = Array.from(items).map((el) => ({
    el,
    date: parseLocalDate(el.dataset.eventDate),
  }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // Rounds rather than truncates: two local midnights are normally an
  // exact multiple of 24h apart, but a DST transition between them can
  // make that a 23h or 25h "day" in elapsed-ms terms — rounding guarantees
  // the correct whole-day count survives that either way.
  function dayDiff(a, b) {
    return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
  }

  const firstDate = events[0].date;
  const lastDate = events[events.length - 1].date;
  const totalSpanDays = dayDiff(lastDate, firstDate);
  const todayOffsetDays = dayDiff(today, firstDate);
  const pct =
    totalSpanDays > 0 ? Math.max(0, Math.min(100, (todayOffsetDays / totalSpanDays) * 100)) : 0;

  const marker = document.querySelector(".timeline-you-are-here");
  if (marker) {
    marker.style.top = pct + "%";
    const dateLabel = marker.querySelector(".timeline-you-are-here-date");
    if (dateLabel) {
      dateLabel.textContent = today.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    // Stage 5b fix: the label must sit on the side OPPOSITE whichever
    // event card is nearest to "today" on the track, so it never overlaps
    // that card. The desktop layout (styles.css, min-width: 680px) puts
    // :nth-child(odd) event cards on the right and :nth-child(even) on the
    // left; find the nearest event by minimum |day difference| (past or
    // future) and flip the label to the opposite side of THAT event's
    // card. This is computed fresh every load from the real "today" vs.
    // the mock event dates, not hardcoded to one side, since which event
    // ends up nearest changes as the placeholder dates (or the real ones
    // that replace them) are approached and passed.
    let nearestIndex = 0;
    let nearestAbsDiff = Infinity;
    events.forEach(({ date }, i) => {
      const absDiff = Math.abs(dayDiff(date, today));
      if (absDiff < nearestAbsDiff) {
        nearestAbsDiff = absDiff;
        nearestIndex = i;
      }
    });
    // nearestIndex is 0-based; the matching :nth-child() is 1-based, so an
    // even index (0, 2, 4…) is an odd nth-child — i.e. a right-side card.
    const nearestCardIsRight = nearestIndex % 2 === 0;
    marker.classList.toggle("label-left", nearestCardIsRight);
  }

  let nextUpAssigned = false;
  events.forEach(({ el, date }) => {
    const diff = dayDiff(date, today);
    const statusEl = el.querySelector(".timeline-card-status");

    el.classList.remove("is-completed", "is-next-up");

    if (diff < 0) {
      el.classList.add("is-completed");
      const days = Math.abs(diff);
      if (statusEl) statusEl.textContent = `${days} day${days === 1 ? "" : "s"} ago`;
    } else {
      if (statusEl) {
        statusEl.textContent = diff === 0 ? "Today" : `${diff} day${diff === 1 ? "" : "s"} until`;
      }
      if (!nextUpAssigned) {
        el.classList.add("is-next-up");
        nextUpAssigned = true;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Timeline page: each event animates in as the visitor scrolls down to it
// (Stage 5a) — an individual ScrollTrigger per event rather than
// ScrollTrigger.batch (used on Leadership/Pitch Videos), since these enter
// one at a time down a vertical page rather than in simultaneous rows/
// batches. Alternates the slide-in direction to match the CSS's alternating
// left/right layout, purely cosmetic so it's skipped along with everything
// else under reduced motion or a GSAP/ScrollTrigger CDN failure — the
// events are already fully visible in their final position from
// initEventTimelinePositions above regardless.
// ---------------------------------------------------------------------------
function initEventTimelineReveal() {
  const items = document.querySelectorAll(".timeline-event");
  if (!items.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  items.forEach((el, i) => {
    const fromLeft = i % 2 === 0;
    gsap.set(el, { opacity: 0, x: fromLeft ? -40 : 40 });
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Timeline page: clicking or tapping an event card expands it into a full
// detail view (Stage 5c) — this replaces Stage 5a's simpler "click toggles
// a highlight" behavior, which was only ever a stand-in for this until
// there was real detail content to show (see the removed initTimelineCardFocus
// and its comment in git history). The card itself becomes the modal via
// GSAP's Flip plugin: it's the SAME element, given position: fixed and a
// larger size/layout by the .is-modal-open class (styles.css), so it visibly
// grows from its spot on the timeline into the detail view rather than a
// separate popup appearing unrelated to what was clicked. Closing reverses
// that: the class comes off and Flip animates it back down into place.
//
// Every actual state change here — adding/removing .is-modal-open, showing
// the overlay, revealing the detail content and close button, focus and
// ARIA attribute changes — happens unconditionally in plain JS, so the
// modal opens, closes, and reads correctly even if GSAP/Flip never loads.
// Only the morph animation itself (Flip.from) and the staggered title ->
// meta -> description reveal are gated behind GSAP/Flip being available
// AND !prefersReducedMotion; skipping them just means the content appears
// instantly instead of growing/staggering in, per the brief's explicit
// "instant or basic fade... is fine" fallback allowance.
// ---------------------------------------------------------------------------
function initEventDetailModal() {
  const cards = document.querySelectorAll(".timeline-card");
  const overlay = document.getElementById("timeline-modal-overlay");
  if (!cards.length || !overlay) return;

  const canFlip = !prefersReducedMotion && typeof gsap !== "undefined" && typeof Flip !== "undefined";
  if (canFlip) gsap.registerPlugin(Flip);

  let activeCard = null;
  let cardOriginalParent = null;
  let cardOriginalNextSibling = null;
  let scrollLockPaddingRight = "";

  // Compensates for the scrollbar disappearing when body scroll locks below
  // — without this the page content (and the fixed header) shifts sideways
  // by the scrollbar's width for as long as the modal is open.
  function lockBodyScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    scrollLockPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + "px";
    }
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll() {
    document.body.style.overflow = "";
    document.body.style.paddingRight = scrollLockPaddingRight;
  }

  // The only focusable descendants a card ever has are its close button
  // (always) — description/date/time/location are plain text. Queried
  // fresh each time rather than assumed, so the trap still holds if that
  // ever changes.
  function getFocusable(card) {
    return Array.from(
      card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
  }

  function onKeydown(e) {
    if (!activeCard) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeCard();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = getFocusable(activeCard);
    if (!focusable.length) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const outside = !activeCard.contains(document.activeElement);
    if (e.shiftKey) {
      if (outside || document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (outside || document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openCard(card) {
    if (activeCard) return;
    activeCard = card;

    // --card-accent is normally inherited from the .timeline-event-{color}
    // <li> this card sits inside. Freezing the resolved value as an inline
    // custom property on the card itself — while it's still in its normal
    // position and inheriting correctly — keeps the right accent color once
    // it's moved out of that ancestor below.
    const accent = getComputedStyle(card).getPropertyValue("--card-accent");
    if (accent) card.style.setProperty("--card-accent", accent.trim());

    const state = canFlip ? Flip.getState(card, { props: "borderRadius" }) : null;
    const detailGroups = card.querySelectorAll(".timeline-card-detail-meta, .timeline-card-detail-description");

    // Moved to a direct child of <body> rather than left inside its
    // .timeline-event <li> for .is-modal-open's position: fixed centering
    // to actually work: initEventTimelineReveal (Stage 5a) leaves a
    // (harmless, at-rest) inline transform on that li once its scroll-in
    // animation finishes, and CSS says ANY transform on an ancestor turns
    // it into the containing block for a fixed-position descendant — so
    // without this move, the "fixed" card would center itself inside that
    // li's box instead of the viewport. Restored to its exact original
    // spot (originalParent/originalNextSibling) on close.
    cardOriginalParent = card.parentElement;
    cardOriginalNextSibling = card.nextElementSibling;
    document.body.appendChild(card);

    card.classList.add("is-modal-open");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    const titleEl = card.querySelector(".timeline-card-name");
    const descEl = card.querySelector(".timeline-card-detail-description");
    if (titleEl) card.setAttribute("aria-labelledby", titleEl.id);
    if (descEl) card.setAttribute("aria-describedby", descEl.id);
    card.setAttribute("tabindex", "-1");

    overlay.hidden = false;
    lockBodyScroll();

    if (canFlip) {
      gsap.set(detailGroups, { opacity: 0, y: 10 });
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
      // .timeline-card has its own CSS transition on transform/box-shadow
      // (for the plain hover lift, under prefers-reduced-motion:no-
      // preference) — left on, it would fight Flip's own per-frame
      // transform writes here. Suspended for the duration of the Flip-
      // driven open/close and restored once closeCard's Flip finishes.
      card.style.transition = "none";
      Flip.from(state, {
        duration: 0.55,
        ease: "power2.inOut",
        absolute: true,
        onComplete: () => {
          gsap.to(detailGroups, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.15 });
        },
      });
    }

    const closeBtn = card.querySelector(".timeline-card-close");
    if (closeBtn) closeBtn.focus();
    document.addEventListener("keydown", onKeydown, true);
  }

  function closeCard() {
    const card = activeCard;
    if (!card) return;
    activeCard = null;

    const state = canFlip ? Flip.getState(card, { props: "borderRadius" }) : null;
    const detailGroups = card.querySelectorAll(".timeline-card-detail-meta, .timeline-card-detail-description");

    card.classList.remove("is-modal-open");
    card.setAttribute("role", "button");
    card.removeAttribute("aria-modal");
    card.removeAttribute("aria-describedby");
    card.setAttribute("tabindex", "0");

    // Move back to its exact original spot in the .timeline-event <li>
    // (captured in openCard) before animating — Flip.from below needs the
    // real, restored DOM position to animate TO, the same way it needed
    // the real original position to animate FROM when opening.
    if (cardOriginalParent) {
      if (cardOriginalNextSibling && cardOriginalNextSibling.parentElement === cardOriginalParent) {
        cardOriginalParent.insertBefore(card, cardOriginalNextSibling);
      } else {
        cardOriginalParent.appendChild(card);
      }
    }
    cardOriginalParent = null;
    cardOriginalNextSibling = null;

    unlockBodyScroll();
    document.removeEventListener("keydown", onKeydown, true);

    if (canFlip) {
      gsap.set(detailGroups, { opacity: 0, y: 0 });
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.25,
        ease: "power1.in",
        onComplete: () => {
          overlay.hidden = true;
        },
      });
      Flip.from(state, {
        duration: 0.5,
        ease: "power2.inOut",
        absolute: true,
        onComplete: () => {
          card.style.transition = "";
        },
      });
    } else {
      overlay.hidden = true;
    }

    card.focus();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCard();
  });

  cards.forEach((card, i) => {
    // Assigned once here (rather than hardcoded in timeline.html) so every
    // card gets a unique id for aria-labelledby/aria-describedby without
    // repeating that bookkeeping across all 8 markup blocks.
    const titleEl = card.querySelector(".timeline-card-name");
    const descEl = card.querySelector(".timeline-card-detail-description");
    if (titleEl && !titleEl.id) titleEl.id = `timeline-card-title-${i}`;
    if (descEl && !descEl.id) descEl.id = `timeline-card-desc-${i}`;

    card.setAttribute("aria-haspopup", "dialog");

    card.addEventListener("click", () => {
      if (!card.classList.contains("is-modal-open")) openCard(card);
    });
    card.addEventListener("keydown", (e) => {
      if (card.classList.contains("is-modal-open")) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCard(card);
      }
    });

    const closeBtn = card.querySelector(".timeline-card-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeCard();
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Blog page: one-time hero entrance (Stage 6a) — the same background-
// flourish + staggered-title + staggered-content pattern as Pitch Videos'
// initPitchVideoEntrance, reused rather than inventing a new entry style
// (per the brief). Independently named (.bl-reveal-word/-inner vs.
// .pv-reveal-word/-inner) so the two pages' word-reveal spans can't collide,
// but the timeline construction below mirrors that function almost exactly.
// ---------------------------------------------------------------------------
function initBlogEntrance() {
  const hero = document.querySelector(".blog-hero");
  if (!hero) return;

  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const flourish = document.querySelector(".blog-hero-flourish");
  const words = document.querySelectorAll(".blog-hero .bl-reveal-word-inner");
  const lede = document.querySelector(".blog-hero-lede");
  const note = document.querySelector(".blog-placeholder-note");
  const fadeUpTargets = [lede, note].filter(Boolean);

  if (flourish) gsap.set(flourish, { opacity: 0, scale: 0.85, rotate: -8 });
  if (words.length) gsap.set(words, { yPercent: 115 });
  if (fadeUpTargets.length) gsap.set(fadeUpTargets, { opacity: 0, y: 18 });

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  if (flourish) {
    tl.to(flourish, { opacity: 0.4, scale: 1, rotate: 0, duration: 0.35 }, 0).to(
      flourish,
      { opacity: 0, duration: 0.35 },
      0.35
    );
  }

  if (words.length) {
    tl.to(words, { yPercent: 0, duration: 0.45, stagger: 0.045, ease: "power3.out" }, 0.15);
  }

  if (fadeUpTargets.length) {
    tl.to(fadeUpTargets, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, 0.55);
  }
}

// ---------------------------------------------------------------------------
// Blog page: desktop bento grid placement (Stage 6a) — the four-column,
// 2x2-featured-tile layout is applied here via inline styles rather than a
// min-width: 1000px stylesheet rule. During this stage's testing, a
// stylesheet rule placing .blog-grid's columns and each .blog-card's
// grid-column/grid-row at that breakpoint reliably collapsed the two
// columns the 2x2 featured tile alone touches down to 0px wide (confirmed
// repeatedly via getComputedStyle: "0px 0px Npx Npx" instead of four equal
// columns) — reproduced with fr units, percentages, minmax(0, 1fr), and
// both named grid-template-areas and explicit grid-column/grid-row lines,
// including on a genuinely fresh reload of the changed CSS file (so not a
// stylesheet-edit-caching artifact). The IDENTICAL placement applied as
// inline styles on the actual elements sized correctly every time, which
// is what this function does instead. Not gated by reduced-motion or
// GSAP: this is layout correctness, not a motion effect, and must be
// right regardless of either.
// ---------------------------------------------------------------------------
function initBlogGridLayout() {
  const grid = document.querySelector(".blog-grid");
  const cards = document.querySelectorAll(".blog-card");
  if (!grid || cards.length < 6) return;

  const desktopQuery = window.matchMedia("(min-width: 1000px)");
  // One featured tile spanning the first two columns and both rows, four
  // regular tiles filling the rest of that 2x2 block's neighboring cells,
  // and a full-width banner tile along the bottom — see the blog-grid-
  // section comment in blog.html for why this shape (rather than
  // Leadership's own bento) was chosen.
  const placements = [
    { col: "1 / 3", row: "1 / 3" },
    { col: "3 / 4", row: "1 / 2" },
    { col: "4 / 5", row: "1 / 2" },
    { col: "3 / 4", row: "2 / 3" },
    { col: "4 / 5", row: "2 / 3" },
    { col: "1 / 5", row: "3 / 4" },
  ];

  function apply() {
    if (desktopQuery.matches) {
      grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
      cards.forEach((card, i) => {
        card.style.gridColumn = placements[i].col;
        card.style.gridRow = placements[i].row;
      });
    } else {
      // Below 1000px, styles.css's own min-width: 640px rule (2 columns,
      // featured/banner spanning both) or the base single-column layout
      // takes back over.
      grid.style.gridTemplateColumns = "";
      cards.forEach((card) => {
        card.style.gridColumn = "";
        card.style.gridRow = "";
      });
    }
  }

  apply();
  // Reruns if the viewport crosses the breakpoint after load (a window
  // resize, or a device rotation), not just once at page load.
  desktopQuery.addEventListener("change", apply);
}

// ---------------------------------------------------------------------------
// Blog page: scroll-triggered stagger reveal for the post grid and,
// separately, the newsletter archive (Stage 6a) — same ScrollTrigger.batch
// approach as initLeadershipReveal, just run twice against two different
// card sets, since a visitor can scroll to either section independently and
// each should reveal on its own arrival rather than both waiting on the
// first one to be scrolled to.
// ---------------------------------------------------------------------------
function initBlogGridReveal() {
  const cards = document.querySelectorAll(".blog-card");
  if (!cards.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.set(cards, { opacity: 0, y: 36 });

  ScrollTrigger.batch(cards, {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" }),
  });
}

function initNewsletterReveal() {
  const cards = document.querySelectorAll(".newsletter-card");
  if (!cards.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.set(cards, { opacity: 0, y: 28 });

  ScrollTrigger.batch(cards, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }),
  });
}

// ---------------------------------------------------------------------------
// Blog page: newsletter signup (Stage 6a) — no email service (Mailchimp,
// Buttondown, etc.) is connected yet, so submitting only ever swaps the
// form for a static confirmation message; nothing is sent or stored
// anywhere. Plain submit handling, not gated by reduced-motion or GSAP:
// this is a state change, not a motion effect, and must work even if a CDN
// fails.
// ---------------------------------------------------------------------------
function initNewsletterSignup() {
  const form = document.getElementById("newsletter-form");
  const confirmation = document.querySelector(".newsletter-confirmation");
  if (!form || !confirmation) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.hidden = true;
    confirmation.hidden = false;
  });
}

// ---------------------------------------------------------------------------
// Gallery page: one-time hero entrance (Stage 7a) — the same background-
// flourish + staggered-title + staggered-content pattern as Pitch Videos'/
// Blog's initPitchVideoEntrance/initBlogEntrance, reused rather than
// inventing a new entry style. Independently named (.gl-reveal-word/-inner)
// so this page's word-reveal spans can't collide with either of theirs.
// ---------------------------------------------------------------------------
function initGalleryEntrance() {
  const hero = document.querySelector(".gallery-hero");
  if (!hero) return;

  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const flourish = document.querySelector(".gallery-hero-flourish");
  const words = document.querySelectorAll(".gallery-hero .gl-reveal-word-inner");
  const lede = document.querySelector(".gallery-hero-lede");
  const note = document.querySelector(".gallery-placeholder-note");
  const fadeUpTargets = [lede, note].filter(Boolean);

  if (flourish) gsap.set(flourish, { opacity: 0, scale: 0.85, rotate: -8 });
  if (words.length) gsap.set(words, { yPercent: 115 });
  if (fadeUpTargets.length) gsap.set(fadeUpTargets, { opacity: 0, y: 18 });

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  if (flourish) {
    tl.to(flourish, { opacity: 0.4, scale: 1, rotate: 0, duration: 0.35 }, 0).to(
      flourish,
      { opacity: 0, duration: 0.35 },
      0.35
    );
  }

  if (words.length) {
    tl.to(words, { yPercent: 0, duration: 0.45, stagger: 0.045, ease: "power3.out" }, 0.15);
  }

  if (fadeUpTargets.length) {
    tl.to(fadeUpTargets, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, 0.55);
  }
}

// ---------------------------------------------------------------------------
// Gallery page: bento masonry grid placement (Stage 7a) — grid-template-
// columns and each tile's grid-column/grid-row are applied here as inline
// styles rather than via a stylesheet rule, exactly like Blog's
// initBlogGridLayout and for the identical reason: a stylesheet-based
// version of this kind of grid (multi-track-spanning tiles in a
// repeat()-column grid) was confirmed during that stage's testing to
// collapse columns to 0px, while the identical placement applied inline
// always sized correctly. Not gated by reduced-motion/GSAP: this is
// layout correctness, not a motion effect.
// ---------------------------------------------------------------------------
function initGalleryLayout() {
  const grid = document.getElementById("gallery-grid");
  const tiles = document.querySelectorAll(".gallery-tile");
  if (!grid || !tiles.length) return;

  const desktopQuery = window.matchMedia("(min-width: 1000px)");
  const tabletQuery = window.matchMedia("(min-width: 640px)");

  // grid-auto-flow: dense (rather than named grid-template-areas, like
  // Blog's fixed 6-tile bento) so the layout re-packs itself sensibly
  // whichever tiles the active filter leaves visible, instead of assuming
  // a fixed set of 12.
  function spanFor(size, columns) {
    switch (size) {
      case "large":
        return { col: Math.min(2, columns), row: 2 };
      case "wide":
        return { col: Math.min(2, columns), row: 1 };
      case "tall":
        return { col: 1, row: 2 };
      default:
        return { col: 1, row: 1 };
    }
  }

  function apply() {
    let columns = 1;
    if (desktopQuery.matches) columns = 4;
    else if (tabletQuery.matches) columns = 2;

    if (columns === 1) {
      grid.style.gridTemplateColumns = "";
      grid.style.gridAutoFlow = "";
      tiles.forEach((tile) => {
        tile.style.gridColumn = "";
        tile.style.gridRow = "";
      });
      return;
    }

    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    grid.style.gridAutoFlow = "dense";
    tiles.forEach((tile) => {
      const { col, row } = spanFor(tile.dataset.size, columns);
      tile.style.gridColumn = `span ${col}`;
      tile.style.gridRow = `span ${row}`;
    });
  }

  apply();
  desktopQuery.addEventListener("change", apply);
  tabletQuery.addEventListener("change", apply);
}

// ---------------------------------------------------------------------------
// Gallery page: scroll-triggered stagger reveal (Stage 7a) — same
// ScrollTrigger.batch approach as initLeadershipReveal/initBlogGridReveal.
// ---------------------------------------------------------------------------
function initGalleryReveal() {
  const tiles = document.querySelectorAll(".gallery-tile");
  if (!tiles.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.set(tiles, { opacity: 0, y: 36 });

  ScrollTrigger.batch(tiles, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }),
  });
}

// ---------------------------------------------------------------------------
// Shared category-filter-pill behavior (Stage 7a, generalized in Stage 8b)
// — every actual visibility change ([hidden] on non-matching items) happens
// unconditionally in plain JS; only the transition is gated behind GSAP/
// Flip + !prefersReducedMotion, in which case filtering is an instant swap
// instead — still fully correct, per each page's brief's fallback
// allowance.
//
// The animated case is three things happening together: items leaving the
// filter fade out first (still in their original slot); Flip then animates
// every item that stays visible in both the old and new filter sliding
// into its newly-repacked position, since hiding some items changes where
// the rest land; and items newly entering the filter fade in once that
// reflow lands. Flip can't itself animate an element being hidden via
// [hidden] (display: none can't be transitioned through), which is why the
// leaving items get a plain opacity/scale tween first rather than being
// folded into the Flip call.
//
// Originally built for the Gallery page's photo grid (initGalleryFilter);
// factored out here rather than duplicated a second time for the FAQ
// page's question list (initFaqFilter), per that page's brief calling for
// reusing this exact interaction instead of a new filtering mechanism.
// Works on any flat list of items with a data-category attribute — a CSS
// grid of tiles and a plain vertical list of cards both just need Flip to
// animate whatever layout change hiding/showing items produces, which
// isn't specific to either shape.
//
// buttons/items: NodeLists (or arrays) — each button needs a data-filter
// attribute ("all" or a category value), each item a data-category
// attribute. onBeforeFilter, if given, runs before anything else changes
// (the FAQ page uses this to close whichever accordion item is open,
// since a filtered-out-but-still-open item would be an odd state to
// animate back into later).
// ---------------------------------------------------------------------------
function initFilterGroup(buttons, items, { onBeforeFilter } = {}) {
  if (!buttons.length || !items.length) return;

  const canFlip = !prefersReducedMotion && typeof gsap !== "undefined" && typeof Flip !== "undefined";
  if (canFlip) gsap.registerPlugin(Flip);

  function applyFilter(value) {
    if (onBeforeFilter) onBeforeFilter();

    const allItems = Array.from(items);
    const willShow = allItems.filter((el) => value === "all" || el.dataset.category === value);
    const currentlyVisible = allItems.filter((el) => !el.hidden);

    if (!canFlip) {
      allItems.forEach((el) => {
        el.hidden = !willShow.includes(el);
      });
      return;
    }

    const leaving = currentlyVisible.filter((el) => !willShow.includes(el));
    const staying = currentlyVisible.filter((el) => willShow.includes(el));
    const entering = willShow.filter((el) => !currentlyVisible.includes(el));

    const tl = gsap.timeline();
    if (leaving.length) {
      tl.to(leaving, { opacity: 0, scale: 0.85, duration: 0.22, ease: "power1.in", stagger: 0.02 });
    }
    tl.add(() => {
      const state = Flip.getState(staying);
      allItems.forEach((el) => {
        el.hidden = !willShow.includes(el);
      });
      // Reset leaving items' inline opacity/scale now that they're
      // [hidden] — otherwise they'd reappear still faded out next time
      // this same filter shows them again.
      gsap.set(leaving, { opacity: 1, scale: 1 });
      if (entering.length) gsap.set(entering, { opacity: 0, scale: 0.85 });

      Flip.from(state, { duration: 0.5, ease: "power2.inOut", absolute: true });

      if (entering.length) {
        gsap.to(entering, {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          delay: 0.12,
          stagger: 0.05,
          ease: "power2.out",
        });
      }
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      applyFilter(btn.dataset.filter);
    });
  });
}

function initGalleryFilter() {
  initFilterGroup(document.querySelectorAll(".gallery-filter-btn"), document.querySelectorAll(".gallery-tile"));
}

// ---------------------------------------------------------------------------
// Gallery page: Flip lightbox (Stage 7a) — reuses the exact "the clicked
// element becomes the dialog" technique from the Event Timeline's
// initEventDetailModal (same Flip-driven expand/collapse, same reparent-
// to-<body> fix for the ScrollTrigger-reveal containing-block issue, same
// focus-trap/ARIA approach), applied to .gallery-tile-button instead of
// .timeline-card. See that function's own comments for the reasoning
// behind each piece; only what's different for a photo lightbox is called
// out below.
// ---------------------------------------------------------------------------
function initGalleryLightbox() {
  const buttons = document.querySelectorAll(".gallery-tile-button");
  const overlay = document.getElementById("gallery-lightbox-overlay");
  if (!buttons.length || !overlay) return;

  const canFlip = !prefersReducedMotion && typeof gsap !== "undefined" && typeof Flip !== "undefined";
  if (canFlip) gsap.registerPlugin(Flip);

  let activeButton = null;
  let originalParent = null;
  let originalNextSibling = null;
  let scrollLockPaddingRight = "";
  let wheelCooldown = false;
  let touchStartX = null;
  let touchStartY = null;

  function lockBodyScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    scrollLockPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + "px";
    }
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll() {
    document.body.style.overflow = "";
    document.body.style.paddingRight = scrollLockPaddingRight;
  }

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
  }

  // Only the tiles the active filter currently leaves visible — prev/next
  // steps within this set only, so a photo hidden by the filter is never
  // landed on.
  function visibleButtons() {
    return Array.from(buttons).filter((btn) => {
      // The active button is currently reparented to <body> (see
      // expandToLightbox below), so it has no .gallery-tile ancestor to
      // check — it's obviously "visible" regardless, being the one
      // literally on screen right now.
      if (btn === activeButton) return true;
      const tile = btn.closest(".gallery-tile");
      return tile && !tile.hidden;
    });
  }

  // Moves `button` back into its original .gallery-tile <li>, reversing
  // expandToLightbox below. Used by both closeTile (the final close) and
  // step (moving off this photo to an adjacent one).
  function restoreToGrid(button) {
    const state = canFlip ? Flip.getState(button, { props: "borderRadius" }) : null;

    button.classList.remove("is-lightbox-open");
    button.setAttribute("role", "button");
    button.removeAttribute("aria-modal");
    button.removeAttribute("aria-describedby");
    button.setAttribute("tabindex", "0");

    if (originalParent) {
      if (originalNextSibling && originalNextSibling.parentElement === originalParent) {
        originalParent.insertBefore(button, originalNextSibling);
      } else {
        originalParent.appendChild(button);
      }
    }
    originalParent = null;
    originalNextSibling = null;

    if (canFlip) {
      button.style.transition = "none";
      Flip.from(state, {
        duration: 0.42,
        ease: "power2.inOut",
        absolute: true,
        onComplete: () => {
          button.style.transition = "";
        },
      });
    }
  }

  // Moves `button` out to <body> and expands it into the lightbox. Used by
  // both openTile (the initial open) and step (landing on an adjacent
  // photo) — see initEventDetailModal's comment for why the move to
  // <body> is necessary, not just tidy (a transformed ancestor left by
  // initGalleryReveal would otherwise become the containing block for
  // this button's position: fixed).
  function expandToLightbox(button) {
    const tile = button.closest(".gallery-tile");
    const accent = getComputedStyle(tile).getPropertyValue("--card-accent");
    if (accent) button.style.setProperty("--card-accent", accent.trim());

    const state = canFlip ? Flip.getState(button, { props: "borderRadius" }) : null;

    originalParent = button.parentElement;
    originalNextSibling = button.nextElementSibling;
    document.body.appendChild(button);

    button.classList.add("is-lightbox-open");
    button.setAttribute("role", "dialog");
    button.setAttribute("aria-modal", "true");
    const caption = button.querySelector(".gallery-lightbox-caption");
    if (caption) button.setAttribute("aria-describedby", caption.id);
    button.setAttribute("tabindex", "-1");

    if (canFlip) {
      button.style.transition = "none";
      Flip.from(state, {
        duration: 0.42,
        ease: "power2.inOut",
        absolute: true,
        onComplete: () => {
          button.style.transition = "";
        },
      });
    }

    const closeBtn = button.querySelector(".gallery-lightbox-close");
    if (closeBtn) closeBtn.focus();
  }

  function openTile(button) {
    if (activeButton) return;
    activeButton = button;

    overlay.hidden = false;
    lockBodyScroll();
    expandToLightbox(button);

    if (canFlip) {
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
    }

    document.addEventListener("keydown", onKeydown, true);
  }

  function closeTile() {
    const button = activeButton;
    if (!button) return;
    activeButton = null;

    restoreToGrid(button);
    unlockBodyScroll();
    document.removeEventListener("keydown", onKeydown, true);

    if (canFlip) {
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.25,
        ease: "power1.in",
        onComplete: () => {
          overlay.hidden = true;
        },
      });
    } else {
      overlay.hidden = true;
    }

    button.focus();
  }

  // Prev/next: closes the current photo and opens the adjacent one via
  // the exact same restoreToGrid/expandToLightbox pair used for the
  // regular open/close, run back to back — deliberately not a separate
  // cross-fade/carousel mechanism, per the brief's "reuse this existing
  // pattern." The overlay, body scroll lock, and keydown trap are left
  // untouched here since the lightbox never actually closes between
  // photos, only which tile is expanded changes.
  function step(direction) {
    if (!activeButton) return;
    const list = visibleButtons();
    if (list.length < 2) return;
    const currentIndex = list.indexOf(activeButton);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + direction + list.length) % list.length;
    const nextButton = list[nextIndex];
    if (nextButton === activeButton) return;

    const current = activeButton;
    activeButton = nextButton;
    restoreToGrid(current);
    expandToLightbox(nextButton);
  }

  function onKeydown(e) {
    if (!activeButton) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeTile();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = getFocusable(activeButton);
    if (!focusable.length) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const outside = !activeButton.contains(document.activeElement);
    if (e.shiftKey) {
      if (outside || document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (outside || document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeTile();
  });

  // Trackpad horizontal swipe — same forceToAxis idea as the Pitch Videos
  // carousel's Swiper mousewheel config (only act on wheel events whose
  // horizontal delta dominates, so an ordinary vertical scroll gesture is
  // never hijacked), reimplemented by hand here since there's no Swiper
  // instance on this page. thresholdTime-style cooldown (400ms, matching
  // that same config) collapses one continuous trackpad swipe into a
  // single step rather than several.
  document.addEventListener(
    "wheel",
    (e) => {
      if (!activeButton) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelCooldown) return;
      wheelCooldown = true;
      step(e.deltaX > 0 ? 1 : -1);
      setTimeout(() => {
        wheelCooldown = false;
      }, 400);
    },
    { passive: false }
  );

  // Touch swipe. Listeners live on document (rather than the lightbox
  // button itself) since which element that is changes on every step.
  document.addEventListener(
    "touchstart",
    (e) => {
      if (!activeButton) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    (e) => {
      if (!activeButton || touchStartX === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
      step(dx < 0 ? 1 : -1);
    },
    { passive: true }
  );

  buttons.forEach((button, i) => {
    const caption = button.querySelector(".gallery-lightbox-caption");
    if (caption && !caption.id) caption.id = `gallery-caption-${i}`;

    button.setAttribute("aria-haspopup", "dialog");

    button.addEventListener("click", () => {
      if (!button.classList.contains("is-lightbox-open")) openTile(button);
    });
    button.addEventListener("keydown", (e) => {
      if (button.classList.contains("is-lightbox-open")) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openTile(button);
      }
    });

    const closeBtn = button.querySelector(".gallery-lightbox-close");
    const prevBtn = button.querySelector(".gallery-lightbox-prev");
    const nextBtn = button.querySelector(".gallery-lightbox-next");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTile();
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        step(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        step(1);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// About page: one-time hero entrance (Stage 8a) — the same background-
// flourish + staggered-title + staggered-content pattern as Pitch Videos'/
// Blog's/Gallery's own entrance functions, reused rather than inventing a
// new entry style. Independently named (.ab-reveal-word/-inner) so this
// page's word-reveal spans can't collide with the others'.
// ---------------------------------------------------------------------------
function initAboutEntrance() {
  const hero = document.querySelector(".about-hero");
  if (!hero) return;

  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const flourish = document.querySelector(".about-hero-flourish");
  const words = document.querySelectorAll(".about-hero .ab-reveal-word-inner");
  const lede = document.querySelector(".about-hero-lede");

  if (flourish) gsap.set(flourish, { opacity: 0, scale: 0.85, rotate: -8 });
  if (words.length) gsap.set(words, { yPercent: 115 });
  if (lede) gsap.set(lede, { opacity: 0, y: 18 });

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  if (flourish) {
    tl.to(flourish, { opacity: 0.4, scale: 1, rotate: 0, duration: 0.35 }, 0).to(
      flourish,
      { opacity: 0, duration: 0.35 },
      0.35
    );
  }

  if (words.length) {
    tl.to(words, { yPercent: 0, duration: 0.45, stagger: 0.045, ease: "power3.out" }, 0.15);
  }

  if (lede) {
    tl.to(lede, { opacity: 1, y: 0, duration: 0.4 }, 0.55);
  }
}

// ---------------------------------------------------------------------------
// About page: scroll-triggered stagger reveal for the mission/values
// pillars and the cross-link cards (Stage 8a) — same ScrollTrigger.batch
// approach as initLeadershipReveal/initBlogGridReveal/initGalleryReveal,
// run separately against each set since a visitor can scroll to either
// independently.
// ---------------------------------------------------------------------------
function initAboutReveal() {
  const values = document.querySelectorAll(".about-value-card");
  const links = document.querySelectorAll(".about-link-card");
  if (!values.length && !links.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (values.length) {
    gsap.set(values, { opacity: 0, y: 32 });
    ScrollTrigger.batch(values, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: "power2.out" }),
    });
  }

  if (links.length) {
    gsap.set(links, { opacity: 0, y: 24 });
    ScrollTrigger.batch(links, {
      start: "top 92%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }),
    });
  }
}

// ---------------------------------------------------------------------------
// FAQ page: one-time hero entrance (Stage 8b) — the same background-
// flourish + staggered-title + staggered-content pattern as the other
// pages' own entrance functions, reused rather than inventing a new entry
// style. Independently named (.fq-reveal-word/-inner) so this page's
// word-reveal spans can't collide with the others'.
// ---------------------------------------------------------------------------
function initFaqEntrance() {
  const hero = document.querySelector(".faq-hero");
  if (!hero) return;

  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const flourish = document.querySelector(".faq-hero-flourish");
  const words = document.querySelectorAll(".faq-hero .fq-reveal-word-inner");
  const lede = document.querySelector(".faq-hero-lede");

  if (flourish) gsap.set(flourish, { opacity: 0, scale: 0.85, rotate: -8 });
  if (words.length) gsap.set(words, { yPercent: 115 });
  if (lede) gsap.set(lede, { opacity: 0, y: 18 });

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  if (flourish) {
    tl.to(flourish, { opacity: 0.4, scale: 1, rotate: 0, duration: 0.35 }, 0).to(
      flourish,
      { opacity: 0, duration: 0.35 },
      0.35
    );
  }

  if (words.length) {
    tl.to(words, { yPercent: 0, duration: 0.45, stagger: 0.045, ease: "power3.out" }, 0.15);
  }

  if (lede) {
    tl.to(lede, { opacity: 1, y: 0, duration: 0.4 }, 0.55);
  }
}

// ---------------------------------------------------------------------------
// FAQ page: scroll-triggered stagger reveal (Stage 8b) — same
// ScrollTrigger.batch approach as initLeadershipReveal/initBlogGridReveal/
// initGalleryReveal/initAboutReveal.
// ---------------------------------------------------------------------------
function initFaqReveal() {
  const items = document.querySelectorAll(".faq-item");
  if (!items.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.set(items, { opacity: 0, y: 28 });

  ScrollTrigger.batch(items, {
    start: "top 92%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }),
  });
}

// ---------------------------------------------------------------------------
// FAQ page: category filter pills (Stage 8b) — thin wrapper around the
// shared initFilterGroup (see that function's comment), reusing the exact
// Gallery filter interaction rather than a new mechanism, per the brief.
// The one FAQ-specific addition is onBeforeFilter: close whichever
// accordion item is currently open before the filter changes, since an
// item that's mid-filtered-out shouldn't stay open underneath.
// ---------------------------------------------------------------------------
function initFaqFilter() {
  initFilterGroup(document.querySelectorAll(".faq-filter-btn"), document.querySelectorAll(".faq-item"), {
    onBeforeFilter: () => {
      if (typeof window.__closeOpenFaqItem === "function") window.__closeOpenFaqItem();
    },
  });
}

// ---------------------------------------------------------------------------
// FAQ page: accordion (Stage 8b). Every actual state change — aria-
// expanded/aria-hidden, which item (if any) is open — happens
// unconditionally in plain JS; only the height/opacity transition is
// gated behind GSAP + !prefersReducedMotion, in which case opening/
// closing is instant instead, per the brief's fallback allowance.
//
// Single-open by default: opening one item closes whichever other is
// currently open (closeOpenItem, below, also exposed on window so
// initFaqFilter can call it when the active filter changes). Height is
// animated from/to a measured pixel value (scrollHeight) rather than
// animating to/from "auto" directly, since browsers can't tween a CSS
// keyword — settling on height: auto once fully open keeps it correct
// across reflows (e.g. a resize rewrapping the answer text).
//
// The answer's own padding lives on the <p> inside .faq-answer, not on
// .faq-answer itself: with box-sizing: border-box, padding directly on
// the height: 0 element would still force it to render at that padding's
// height instead of truly collapsing.
// ---------------------------------------------------------------------------
function initFaqAccordion() {
  const items = document.querySelectorAll(".faq-item");
  if (!items.length) return;

  const canAnimate = !prefersReducedMotion && typeof gsap !== "undefined";

  let openItem = null;

  function closeItem(item) {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    question.setAttribute("aria-expanded", "false");
    answer.setAttribute("aria-hidden", "true");

    if (canAnimate) {
      const currentHeight = answer.getBoundingClientRect().height;
      gsap.set(answer, { height: currentHeight });
      gsap.to(answer, { height: 0, opacity: 0, duration: 0.3, ease: "power2.inOut" });
    } else {
      answer.style.height = "0";
      answer.style.opacity = "0";
    }

    if (openItem === item) openItem = null;
  }

  function openItemFn(item) {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    question.setAttribute("aria-expanded", "true");
    answer.setAttribute("aria-hidden", "false");

    if (canAnimate) {
      gsap.set(answer, { height: "auto", opacity: 1 });
      const targetHeight = answer.getBoundingClientRect().height;
      gsap.fromTo(
        answer,
        { height: 0, opacity: 0 },
        {
          height: targetHeight,
          opacity: 1,
          duration: 0.35,
          ease: "power2.out",
          onComplete: () => {
            // Locks in "auto" once the tween lands so the answer isn't
            // stuck at a stale pixel height if its content later
            // reflows (a window resize rewrapping the text, say).
            gsap.set(answer, { height: "auto" });
          },
        }
      );
    } else {
      answer.style.height = "auto";
      answer.style.opacity = "1";
    }

    openItem = item;
  }

  function toggleItem(item) {
    const isOpen = item.querySelector(".faq-question").getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeItem(item);
      return;
    }
    if (openItem && openItem !== item) closeItem(openItem);
    openItemFn(item);
  }

  // Exposed for initFaqFilter to call when the active category changes —
  // see that function's comment.
  window.__closeOpenFaqItem = () => {
    if (openItem) closeItem(openItem);
  };

  items.forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => toggleItem(item));
  });
}

// ---------------------------------------------------------------------------
// Get Involved page: one-time hero entrance (Stage 9a) — the same
// background-flourish + staggered-title + staggered-content pattern as
// the other pages' own entrance functions, reused rather than inventing a
// new entry style. Independently named (.iv-reveal-word/-inner) so this
// page's word-reveal spans can't collide with the others'.
// ---------------------------------------------------------------------------
function initInvolvedEntrance() {
  const hero = document.querySelector(".involved-hero");
  if (!hero) return;

  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const flourish = document.querySelector(".involved-hero-flourish");
  const words = document.querySelectorAll(".involved-hero .iv-reveal-word-inner");
  const lede = document.querySelector(".involved-hero-lede");

  if (flourish) gsap.set(flourish, { opacity: 0, scale: 0.85, rotate: -8 });
  if (words.length) gsap.set(words, { yPercent: 115 });
  if (lede) gsap.set(lede, { opacity: 0, y: 18 });

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  if (flourish) {
    tl.to(flourish, { opacity: 0.4, scale: 1, rotate: 0, duration: 0.35 }, 0).to(
      flourish,
      { opacity: 0, duration: 0.35 },
      0.35
    );
  }

  if (words.length) {
    tl.to(words, { yPercent: 0, duration: 0.45, stagger: 0.045, ease: "power3.out" }, 0.15);
  }

  if (lede) {
    tl.to(lede, { opacity: 1, y: 0, duration: 0.4 }, 0.55);
  }
}

// ---------------------------------------------------------------------------
// Get Involved page: scroll-triggered stagger reveal for the three
// pathway cards (Stage 9a) — same ScrollTrigger.batch approach as
// initLeadershipReveal/initBlogGridReveal/initGalleryReveal/
// initAboutReveal/initFaqReveal.
// ---------------------------------------------------------------------------
function initInvolvedReveal() {
  const cards = document.querySelectorAll(".involved-card");
  if (!cards.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.set(cards, { opacity: 0, y: 32 });

  ScrollTrigger.batch(cards, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: "power2.out" }),
  });
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

initHomeLogoReset();
initImpactCounters();
initScrollReveal();
initLeadershipReveal();
initPitchVideoCarousel();
initPitchVideoPlayback();
// Must run after initPitchVideoCarousel: it animates each slide's own
// .pitch-slide-card, which needs Swiper to have already applied its
// coverflow positioning to the parent .swiper-slide first.
initPitchVideoEntrance();
initEventTimelinePositions();
initEventTimelineReveal();
initEventDetailModal();
initBlogEntrance();
initBlogGridLayout();
initBlogGridReveal();
initNewsletterReveal();
initNewsletterSignup();
initGalleryEntrance();
initGalleryLayout();
initGalleryReveal();
initGalleryFilter();
initGalleryLightbox();
initAboutEntrance();
initAboutReveal();
initFaqEntrance();
initFaqReveal();
initFaqAccordion();
initFaqFilter();
initInvolvedEntrance();
initInvolvedReveal();
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
