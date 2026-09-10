// Footer copyright year
document.getElementById("year").textContent = new Date().getFullYear();

// Shared feature/preference detection used by several effects below.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Shared by initSiteSearch (result titles/subtitles) and initFaqContent
// (question/answer text from content/faq.json) — anywhere plain-data
// strings get written into innerHTML rather than assigned to
// .textContent, so a stray &, <, or " in the source data can't break the
// surrounding markup.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Shared by initBlogContent (building each teaser card's link) and
// initBlogPostContent (blog-post.html, matching its ?slug= against every
// post) — Stage 2b. Deliberately not a stored field: a slug computed from
// the title can never drift out of sync with it the way a hand-entered
// one could. Tradeoff, not a bug: editing a published post's title
// changes its URL. Two posts that slugify to the exact same string would
// only make the first one reachable by link — acceptable for a chapter
// blog's post volume.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
// Canonical chapter event data — the single source of truth for every key
// date in this cycle. Through Stage 10a this was a hardcoded array right
// here; Stage 2b (Admin CMS extension) moved it into CMS-managed
// content/timeline.json instead, fetched once by initTimelineContent
// (below) and sorted there by date before being assigned here — so this
// starts empty and is only ever populated (never re-declared) once that
// fetch resolves. initEventTimelinePositions (the Timeline page's day-
// count/completed/"Next Up" state) and initCountdownWidget (the Home +
// Timeline countdown widget) both still read this exact same array, so a
// date changed once in the CMS stays in sync everywhere it's used — this
// stage changes WHERE the array is populated from, not that guarantee
// itself. No `id` field is needed any more: previously each
// timeline.html .timeline-event carried a data-event-id to match itself
// back to its entry here, because the two were authored separately; now
// initTimelineContent renders every .timeline-event FROM this exact
// (sorted) array in the same pass, so DOM order and array order are
// guaranteed identical and can just be zipped by index.
// ---------------------------------------------------------------------------
let HULT_EVENTS = [];

// "YYYY-MM-DD" -> local Date at midnight. Explicit numeric Date() args, not
// new Date("YYYY-MM-DD") (which parses as UTC midnight and shifts a day
// early anywhere west of UTC) — same fix already established for the
// Timeline's own date math.
function parseHultEventDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Returns { event, date, index } for the first HULT_EVENTS entry whose date
// is today or later, or null if every event has already passed. `today`
// must already be normalized to local midnight. Shared by
// initEventTimelinePositions (which day-count-labels every event, "Next
// Up" included) and initCountdownWidget, so "which event is next" is
// computed exactly once, in exactly one place.
function getNextUpHultEvent(today) {
  for (let i = 0; i < HULT_EVENTS.length; i++) {
    const date = parseHultEventDate(HULT_EVENTS[i].date);
    if (date.getTime() >= today.getTime()) {
      return { event: HULT_EVENTS[i], date, index: i };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Site-wide Search (Stage 11a) — the search index.
//
// IMPORTANT: this array is hand-maintained, NOT generated from the page
// content. Add/remove/edit an entry here whenever a blog post, FAQ item,
// or team bio is added, removed, or changed on its actual page — nothing
// keeps this automatically in sync. Each entry's `url` is a plain
// page.html#id link; the id must match a real id on the destination page
// (a .blog-card/.leadership-card <li>, or an existing .faq-question
// button's id) for the highlight/expand behavior in
// initSearchResultHighlight below to find it.
//
// `accent` names one of the site's existing secondary accent colors
// (teal/sky/orange/gold) and is looked up as --{accent} against :root in
// CSS — see .search-result-teal etc. in css/styles.css. Team entries
// reuse each member's existing .leadership-card-* accent; Blog/FAQ
// entries reuse their existing category -> accent mapping (Recap/
// General = teal, Announcement/Getting Started = sky, Behind the Scenes/
// Competition = orange, Tips = gold) rather than inventing a new palette.
// ---------------------------------------------------------------------------
const SEARCH_INDEX = [
  // Blog posts (blog.html) — title/excerpt/category copied from each
  // .blog-card; accent follows that card's existing category color.
  {
    type: "blog",
    id: "blog-post-1",
    title: "OnCampus 2025 Recap: DOZEY Takes First Place",
    subtitle:
      "DOZEY took first place at this year's OnCampus Competition, with Sumeru Quantum Inc. and SQUELLET rounding out the podium.",
    meta: "Recap",
    accent: "teal",
    url: "blog.html#blog-post-1",
  },
  {
    type: "blog",
    id: "blog-post-2",
    title: "Meet Our Executive Board",
    subtitle: "Meet the students leading Hult Prize @ UC Davis this year.",
    meta: "Announcement",
    accent: "sky",
    url: "blog.html#blog-post-2",
  },
  {
    type: "blog",
    id: "blog-post-3",
    title: "Why We Partnered with ENG 108",
    subtitle: "Bringing structured ideation techniques to our teams this year through a new partnership.",
    meta: "Behind the Scenes",
    accent: "orange",
    url: "blog.html#blog-post-3",
  },
  {
    type: "blog",
    id: "blog-post-4",
    title: "5 Tips for Your Hult Prize Pitch",
    subtitle: "Practical tips from past judges and mentors to help your team stand out on competition day.",
    meta: "Tips",
    accent: "gold",
    url: "blog.html#blog-post-4",
  },
  {
    type: "blog",
    id: "blog-post-5",
    title: "Two Teams Advance to Nationals",
    subtitle: "Two teams have officially advanced to the Hult Prize National Competition after strong showings at OnCampus.",
    meta: "Recap",
    accent: "teal",
    url: "blog.html#blog-post-5",
  },
  {
    type: "blog",
    id: "blog-post-6",
    title: "Chapter Kickoff: What to Expect This Year",
    subtitle: "What to expect this cycle, from the info session to team formation, plus key dates.",
    meta: "Announcement",
    accent: "sky",
    url: "blog.html#blog-post-6",
  },

  // FAQ entries (faq.html) — question/answer-snippet/category copied from
  // each .faq-item; accent follows that item's existing category color.
  // url points straight at the question button's own existing id.
  {
    type: "faq",
    id: "faq-question-1",
    title: "What is the Hult Prize?",
    subtitle: "A global student entrepreneurship competition where teams design for-profit ventures addressing social and environmental challenges.",
    meta: "General",
    accent: "teal",
    url: "faq.html#faq-question-1",
  },
  {
    type: "faq",
    id: "faq-question-2",
    title: "Do I need a business background to participate?",
    subtitle: "No — no business background is required to participate.",
    meta: "Getting Started",
    accent: "sky",
    url: "faq.html#faq-question-2",
  },
  {
    type: "faq",
    id: "faq-question-3",
    title: "How does judging work?",
    subtitle: "Judges are recruited from academia and industry to evaluate teams at the OnCampus competition.",
    meta: "Competition",
    accent: "orange",
    url: "faq.html#faq-question-3",
  },
  {
    type: "faq",
    id: "faq-question-4",
    title: "How can I get involved?",
    subtitle: "Join a team, apply for the executive board, or attend the OnCampus competition.",
    meta: "Getting Started",
    accent: "sky",
    url: "faq.html#faq-question-4",
  },
  {
    type: "faq",
    id: "faq-question-5",
    title: "How can I stay updated on events and news?",
    subtitle: "Check the Event Timeline page for key dates, and the Blog & Newsletter page for announcements and recaps.",
    meta: "General",
    accent: "teal",
    url: "faq.html#faq-question-5",
  },
  {
    type: "faq",
    id: "faq-question-6",
    title: "What are the competition stages?",
    subtitle: "Teams compete at the chapter's OnCampus level first, with top teams advancing toward the Hult Prize National Competition.",
    meta: "Competition",
    accent: "orange",
    url: "faq.html#faq-question-6",
  },
  {
    type: "faq",
    id: "faq-question-7",
    title: "Do I need a full team already, or can I join solo?",
    subtitle: "[Answer TBD — site owner to confirm]",
    meta: "Getting Started",
    accent: "sky",
    url: "faq.html#faq-question-7",
  },
  {
    type: "faq",
    id: "faq-question-8",
    title: "Is there a cost to participate?",
    subtitle: "[Answer TBD — site owner to confirm]",
    meta: "General",
    accent: "teal",
    url: "faq.html#faq-question-8",
  },

  // Team bios (team.html) — name/role copied from each .leadership-card;
  // accent follows that card's existing color. Every name below is
  // currently the same placeholder ("[Name Placeholder]" — see
  // team.html); role is the field actually worth searching/distinguishing
  // by until the real roster replaces it, so results show role as the
  // primary label and name as the secondary line, not the other way
  // around.
  {
    type: "team",
    id: "leadership-member-1",
    title: "Campus Director",
    subtitle: "[Name Placeholder]",
    meta: "",
    accent: "teal",
    url: "team.html#leadership-member-1",
  },
  {
    type: "team",
    id: "leadership-member-2",
    title: "VP of Operations",
    subtitle: "[Name Placeholder]",
    meta: "",
    accent: "sky",
    url: "team.html#leadership-member-2",
  },
  {
    type: "team",
    id: "leadership-member-3",
    title: "VP of Marketing",
    subtitle: "[Name Placeholder]",
    meta: "",
    accent: "orange",
    url: "team.html#leadership-member-3",
  },
  {
    type: "team",
    id: "leadership-member-4",
    title: "VP of Partnerships",
    subtitle: "[Name Placeholder]",
    meta: "",
    accent: "gold",
    url: "team.html#leadership-member-4",
  },
  {
    type: "team",
    id: "leadership-member-5",
    title: "Events Director",
    subtitle: "[Name Placeholder]",
    meta: "",
    accent: "teal",
    url: "team.html#leadership-member-5",
  },
  {
    type: "team",
    id: "leadership-member-6",
    title: "Treasurer",
    subtitle: "[Name Placeholder]",
    meta: "",
    accent: "sky",
    url: "team.html#leadership-member-6",
  },
];

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
// Leadership page: content (Stage 2a, Admin CMS extension). Fetches
// content/team.json — the file the /admin CMS's Team collection actually
// edits — and builds the exact same <li class="leadership-card">...</li>
// markup that used to be hardcoded directly in team.html (same classes,
// same leadership-member-N id scheme), same as initFaqContent did for FAQ
// in Stage 1.
//
// Card size (featured/wide/plain) and accent color are assigned by
// POSITION in the fetched list, not read from the JSON — the masonry grid
// (css/styles.css, the min-width: 1000px grid-template-areas rule keyed
// off :nth-child) and the teal/sky/orange/gold rotation are both a
// designed-for-6-cards arrangement the page itself owns, matching exactly
// what was hardcoded per-card before this stage. Reordering the list in
// the CMS reorders the page and reassigns sizes/colors by the new
// positions — there's no per-member "size" or "color" field to keep in
// sync, deliberately: the brief's own field list was Name/Role/Bio/Photo
// only, and a stray field the CMS doesn't manage risks being dropped on
// save (see the same reasoning on isFaqAnswerTbd above).
//
// initLeadershipReveal, below, is only called from inside this fetch's
// success handler (previously called unconditionally at the bottom of
// this file) — same reasoning as Stage 1's initFaqContent.
// ---------------------------------------------------------------------------
function initTeamContent() {
  const grid = document.getElementById("leadership-grid");
  if (!grid) return; // not the Leadership page

  fetch("content/team.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/team.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const members = Array.isArray(data.members) ? data.members : [];
      if (!members.length) throw new Error("content/team.json has no members");
      renderTeamMembers(grid, members);
      initLeadershipReveal();
      // See the matching comment in initFaqContent (Stage 1): the
      // bottom-of-file initSearchResultHighlight() call already ran once,
      // synchronously, before this fetch resolved — necessarily a no-op
      // on this page since the .leadership-card it was looking for didn't
      // exist yet. Retry now that the real content is in the DOM, for a
      // visitor who arrived via a search result or any other
      // #leadership-member-N deep link.
      if (location.hash) highlightSearchTarget(location.hash.slice(1));
    })
    .catch((err) => {
      console.error("Team content failed to load:", err);
      grid.innerHTML =
        '<li class="leadership-load-error">Something went wrong loading the team roster. Please refresh, or reach out directly at ' +
        '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</li>';
    });
}

// Tuned for exactly 6 cards, matching the CSS grid-template-areas rule
// this page has always used (a/b/c/d/e/f, keyed off :nth-child) — a 7th
// member falls back to the browser's own default grid auto-placement
// (still functional, just not part of the designed arrangement); ACCENTS
// cycles safely for any length so color never runs out.
const TEAM_CARD_SIZE_BY_INDEX = ["featured", "wide", "", "", "wide", "wide"];
const TEAM_CARD_ACCENTS = ["teal", "sky", "orange", "gold"];

function renderTeamMembers(gridEl, members) {
  gridEl.innerHTML = members
    .map((member, i) => {
      const n = i + 1;
      const size = TEAM_CARD_SIZE_BY_INDEX[i] || "";
      const accent = TEAM_CARD_ACCENTS[i % TEAM_CARD_ACCENTS.length];
      const sizeClass = size ? ` leadership-card-${size}` : "";
      // Raw markdown is HTML-escaped BEFORE marked ever sees it: any
      // literal "<" a bio happens to contain renders as inert text, not
      // markup — the only real HTML that ever reaches the page is what
      // marked itself generates from actual markdown syntax (**bold**,
      // [text](url), none of which use HTML-special characters). Falls
      // back to plain escaped text (no formatting) if the marked CDN
      // failed to load.
      const bioHtml =
        typeof marked !== "undefined" ? marked.parse(escapeHtml(member.bio || "")) : `<p>${escapeHtml(member.bio || "")}</p>`;
      return `
        <li id="leadership-member-${n}" class="leadership-card leadership-card-${accent}${sizeClass}">
          <figure class="leadership-card-photo">
            <img src="${escapeHtml(member.photo)}" alt="${escapeHtml(member.name)}, ${escapeHtml(member.role)}">
          </figure>
          <div class="leadership-card-body">
            <p class="leadership-card-role">${escapeHtml(member.role)}</p>
            <h3 class="leadership-card-name">${escapeHtml(member.name)}</h3>
            <div class="leadership-card-bio">${bioHtml}</div>
          </div>
        </li>`;
    })
    .join("");
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

// Generic (unplaced) pitch slide accent cycling — teal, sky, orange,
// repeating — same position-based reasoning as Team's card accents and
// Timeline's TIMELINE_ACCENTS: computed from a counter incremented only
// for "None"-placement entries as they're encountered, so the schema
// stays exactly Team Name/Placement/Video/Thumbnail and isn't storing a
// color a re-ordering could leave stale. Placed entries (1st/2nd/3rd) use
// the fixed gold/silver/bronze accents instead, matching the existing
// Top Teams badge convention.
const PITCH_GENERIC_ACCENTS = ["teal", "sky", "orange"];

// Accepts either a bare 11-character YouTube video id (what every mock
// entry used pre-CMS) or a full URL in any of the forms an editor might
// actually paste — youtube.com/watch?v=, youtu.be/, youtube.com/embed/,
// youtube.com/shorts/, and the -nocookie domain this site's own embed
// already uses — and returns just the id, which is all
// initPitchVideoPlayback's embed-src template needs. Falls back to
// returning the trimmed input as-is if nothing matches, so a bare id
// (or any already-correct value) passes through unchanged.
function extractYouTubeId(input) {
  const str = String(input || "").trim();
  const patterns = [/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/, /youtu\.be\/([\w-]{11})/];
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) return match[1];
  }
  return str;
}

// Builds every .swiper-slide from the fetched (CMS-ordered — order here IS
// display order, unlike Timeline's date-sort) videos array — the exact
// same markup that used to be hand-authored once per slide directly in
// pitch-videos.html. initPitchVideoCarousel/initPitchVideoPlayback/
// initPitchVideoEntrance, all called right after this from
// initPitchVideoContent, then wire up Swiper, click-to-play, and the
// entrance animation against these exact elements.
function renderPitchVideoSlides(wrapperEl, videos) {
  let genericIndex = 0;
  wrapperEl.innerHTML = videos
    .map((video) => {
      const teamName = video.teamName || "";
      let accent;
      let badgeHtml = "";
      if (video.placement === "1st") {
        accent = "gold";
        badgeHtml = '<p class="team-card-badge team-card-badge-gold">1st place</p>';
      } else if (video.placement === "2nd") {
        accent = "silver";
        badgeHtml = '<p class="team-card-badge team-card-badge-silver">2nd place</p>';
      } else if (video.placement === "3rd") {
        accent = "bronze";
        badgeHtml = '<p class="team-card-badge team-card-badge-bronze">3rd place</p>';
      } else {
        accent = PITCH_GENERIC_ACCENTS[genericIndex % PITCH_GENERIC_ACCENTS.length];
        genericIndex++;
      }
      const videoId = extractYouTubeId(video.videoUrl);
      return `
        <div class="swiper-slide">
          <article class="pitch-slide-card pitch-slide-${accent}">
            <div class="pitch-slide-thumb" data-video-id="${escapeHtml(videoId)}" data-video-title="${escapeHtml(teamName)} pitch video">
              <img src="${escapeHtml(video.thumbnail || "")}" alt="" loading="lazy">
              <button type="button" class="pitch-play-button" aria-label="Play ${escapeHtml(teamName)}'s pitch video">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
              </button>
            </div>
            <div class="pitch-slide-body">
              ${badgeHtml}
              <h3 class="pitch-slide-name">${escapeHtml(teamName)}</h3>
            </div>
          </article>
        </div>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Pitch Videos data (Stage 2d, Admin CMS extension) — fetches content/
// pitch-videos.json (the file the /admin CMS's Pitch Videos collection
// edits), renders the carousel's slides from it, and only then wires up
// the carousel/playback/entrance behaviors below — all three read the
// real rendered DOM (Swiper needs real .swiper-slide elements to measure
// and position; the entrance animation needs real .pitch-slide-card
// elements to fade/scale in), so none of them can safely run before this
// fetch resolves. Unlike Timeline's collection, entry ORDER here IS
// display order (there's nothing to sort by) — an editor reordering this
// CMS list reorders the carousel, by design.
// ---------------------------------------------------------------------------
function initPitchVideoContent() {
  const wrapper = document.querySelector(".pitch-swiper .swiper-wrapper");
  if (!wrapper) return; // not the Pitch Videos page

  fetch("content/pitch-videos.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/pitch-videos.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const videos = Array.isArray(data.videos) ? data.videos : [];
      if (!videos.length) throw new Error("content/pitch-videos.json has no videos");
      renderPitchVideoSlides(wrapper, videos);
      initPitchVideoCarousel();
      initPitchVideoPlayback();
      initPitchVideoEntrance();
    })
    .catch((err) => {
      console.error("Pitch video content failed to load:", err);
      wrapper.innerHTML =
        '<div class="swiper-slide"><p class="pitch-video-load-error">Something went wrong loading these videos. Please refresh, or reach out directly at ' +
        '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</p></div>';
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
//
// Only ever called from initPitchVideoContent (Stage 2d), once the real
// slides have been rendered from content/pitch-videos.json.
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

// Position-based accent cycling for .timeline-event cards (teal, sky,
// orange, gold, repeating) — same reasoning as Team's card accents and
// Blog's category-independent featured/banner slots: computed from the
// rendered array INDEX at render time rather than stored as a CMS field,
// so the schema stays exactly Title/Date/Time/Location/Description and a
// re-sort (adding an event that lands earlier than existing ones) can
// never leave a stored color assignment stale.
const TIMELINE_ACCENTS = ["teal", "sky", "orange", "gold"];

// Builds every .timeline-event <li> from a (already date-sorted) events
// array — the exact same markup that used to be hand-authored once per
// event directly in timeline.html (Stage 5a/5c), including the completed-
// icon/next-up-badge/close-button chrome every card carries regardless of
// its current state (initEventTimelinePositions and initEventDetailModal,
// both called right after this from initTimelineContent, toggle their
// visibility/behavior — this function only ever builds the static shell).
// Description is rendered as markdown via marked, escaped first exactly
// like Team's bios and Blog's post bodies, so literal HTML in a
// CMS-authored description can never inject markup — only marked's own
// generated tags from real markdown syntax reach the page.
function renderTimelineEvents(listEl, events) {
  listEl.innerHTML = events
    .map((event, i) => {
      const accent = TIMELINE_ACCENTS[i % TIMELINE_ACCENTS.length];
      const dateLabel = formatIsoDateLong(event.date);
      const descriptionHtml =
        typeof marked !== "undefined"
          ? marked.parse(escapeHtml(event.description || ""))
          : `<p>${escapeHtml(event.description || "")}</p>`;
      return `
        <li class="timeline-event timeline-event-${accent}">
          <div class="timeline-node" aria-hidden="true"></div>
          <article class="timeline-card" tabindex="0" role="button">
            <span class="timeline-card-completed-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="timeline-next-up-badge">Next Up</span>
            <button class="timeline-card-close" type="button" aria-label="Close event details">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <p class="timeline-card-date">${escapeHtml(dateLabel)}</p>
            <h3 class="timeline-card-name">${escapeHtml(event.title)}</h3>
            <p class="timeline-card-status"></p>
            <div class="timeline-card-detail">
              <p class="timeline-card-detail-meta">
                <span class="timeline-card-detail-time"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ${escapeHtml(event.time)}</span>
                <span class="timeline-card-detail-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/></svg> ${escapeHtml(event.location)}</span>
              </p>
              <div class="timeline-card-detail-description">${descriptionHtml}</div>
            </div>
          </article>
        </li>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Timeline data (Stage 2c, Admin CMS extension) — fetches content/
// timeline.json (the file the /admin CMS's Timeline collection edits),
// sorts it by date, and only THEN populates HULT_EVENTS and renders the
// Timeline page's event list (if present on this page) — so an editor can
// add a new event anywhere in the CMS list, in any order, and it still
// lands in the correct chronological slot everywhere: the rendered cards,
// the "You Are Here" marker math, the "Next Up" highlight, and the
// Countdown widget on both this page and the Home page (which has no
// .timeline-events list at all, only the widget — this function still
// needs to run there, just skipping the render step).
//
// Called unconditionally from the bottom-of-file init list, same as every
// other fetch-driven content page — internally a no-op if neither a
// .timeline-events list nor a countdown widget exists on the current page.
// ---------------------------------------------------------------------------
function initTimelineContent() {
  const list = document.querySelector(".timeline-events");
  const countdownWidgets = document.querySelectorAll("[data-countdown-widget]");
  if (!list && !countdownWidgets.length) return; // neither this page's track nor a countdown widget

  fetch("content/timeline.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/timeline.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const events = Array.isArray(data.events) ? data.events : [];
      if (!events.length) throw new Error("content/timeline.json has no events");

      // The sort this whole stage exists for: entry order in the CMS list
      // must never matter. Every downstream consumer (the rendered cards
      // below, initEventTimelinePositions, initCountdownWidget) assumes
      // HULT_EVENTS is already in chronological order and does no sorting
      // of its own.
      events.sort((a, b) => parseHultEventDate(a.date).getTime() - parseHultEventDate(b.date).getTime());
      HULT_EVENTS = events;

      if (list) {
        renderTimelineEvents(list, events);
        initEventTimelinePositions();
        initEventTimelineReveal();
        initEventDetailModal();
      }
      initCountdownWidget();
    })
    .catch((err) => {
      console.error("Timeline content failed to load:", err);
      if (list) {
        list.innerHTML =
          '<li class="timeline-load-error">Something went wrong loading these events. Please refresh, or reach out directly at ' +
          '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</li>';
      }
      countdownWidgets.forEach((widget) => {
        const inner = widget.querySelector(".countdown-inner");
        if (inner) {
          inner.innerHTML =
            '<p class="countdown-load-error">Something went wrong loading the countdown. Please refresh, or reach out directly at ' +
            '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</p>';
        }
      });
    });
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

  // This function only ever runs (from initTimelineContent, below) after
  // that same fetch has already rendered these exact `items` FROM
  // HULT_EVENTS in the same (sorted-by-date) order, so zipping by index is
  // safe — no per-element matching needed. parseHultEventDate (js/script.js)
  // parses via explicit numeric new Date(year, monthIndex, day) args, never
  // new Date("YYYY-MM-DD") — the string form parses as UTC midnight, which
  // shifts to the previous day once displayed/compared in any timezone west
  // of UTC (i.e. most of North America); using the numeric constructor for
  // both this and "today" below keeps both sides of every subtraction in
  // the same (local) time reference, which is what actually avoids the
  // off-by-one bug rather than any particular rounding choice.
  const events = Array.from(items).map((el, i) => ({ el, date: parseHultEventDate(HULT_EVENTS[i].date) }));
  if (!events.length) return;

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
// Live Countdown widget (Stage 10a) — Home + Timeline. Targets whichever
// HULT_EVENTS entry getNextUpHultEvent() (above) currently calls "Next Up,"
// so the target date is never a second hardcoded value that could drift
// from the Timeline page's own "Next Up" badge. Only ever called from
// initTimelineContent (Stage 2c), once HULT_EVENTS is populated from
// content/timeline.json — this widget has no data source of its own, by
// design, on either page it appears on.
//
// Split-flap digits and the radial ring are driven with plain CSS
// transitions/classes rather than GSAP: this is a self-contained ticking
// clock (one setInterval, not a scroll-driven or one-shot effect), so a
// tween library buys nothing here that a CSS transition doesn't already
// do more cheaply. GSAP's role on this page is unchanged (the track's
// scroll-reveal); the widget card itself gets its entrance for free by
// reusing the site's existing generic .reveal-on-scroll fade + rise
// (initScrollReveal) rather than inventing a new one.
//
// Progressive enhancement, same tiering as every other effect on the
// site: every DOM/text update below (which digits show, the ring's
// dashoffset, the milestone markers' lit state, the aria-live sentence,
// the "It's happening now!" swap) happens unconditionally on every tick,
// regardless of motion preference. Only the flip transition itself, the
// ring's dashoffset transition, the background pulse, and the mouse
// parallax are skipped under prefers-reduced-motion — see the
// `animate` flag threaded through below.
// ---------------------------------------------------------------------------
function initCountdownWidget() {
  const widgets = document.querySelectorAll("[data-countdown-widget]");
  if (!widgets.length) return;

  const animate = !prefersReducedMotion;

  // "Next Up" is computed exactly the way initEventTimelinePositions
  // computes it for the Timeline's own badge: the first HULT_EVENTS entry
  // whose date is today (local midnight) or later. If every event has
  // already passed, fall back to the last one — already in the past, so
  // the widget below immediately renders its "happening now" state rather
  // than a negative countdown, per the brief's edge-case requirement.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextUp = getNextUpHultEvent(today);
  const targetIndex = nextUp ? nextUp.index : HULT_EVENTS.length - 1;
  const targetEvent = HULT_EVENTS[targetIndex];
  const targetDate = nextUp ? nextUp.date : parseHultEventDate(targetEvent.date);
  const targetTime = targetDate.getTime();

  // Progress-ring reference point: the previous event on the calendar (the
  // last milestone the chapter actually cleared), so the ring reads as
  // "how far through the gap to the next date are we." With no previous
  // event (the very first event is still Next Up), fall back to the
  // moment the widget loaded — the ring simply starts full and counts
  // down normally rather than needing an arbitrary hardcoded window.
  const previousEvent = targetIndex > 0 ? HULT_EVENTS[targetIndex - 1] : null;
  const startTime = previousEvent ? parseHultEventDate(previousEvent.date).getTime() : Date.now();
  const totalSpan = Math.max(targetTime - startTime, 1); // guard against /0

  widgets.forEach((widget) => initOneCountdownWidget(widget, targetEvent, targetTime, startTime, totalSpan, animate));
}

function initOneCountdownWidget(widget, targetEvent, targetTime, startTime, totalSpan, animate) {
  const nameEl = widget.querySelector(".countdown-event-name");
  const flapsEl = widget.querySelector(".countdown-flaps");
  const completeEl = widget.querySelector(".countdown-complete");
  const srTextEl = widget.querySelector(".countdown-sr-text");
  const glowEl = widget.querySelector(".countdown-glow");
  const displayEl = widget.querySelector(".countdown-display");
  const trackCircle = widget.querySelector(".countdown-ring-track");
  const progressCircle = widget.querySelector(".countdown-ring-progress");
  const milestoneEls = widget.querySelectorAll(".countdown-ring-milestone");
  if (!flapsEl || !completeEl || !trackCircle || !progressCircle) return;

  if (nameEl) nameEl.textContent = targetEvent.title;

  // Build each unit's digit cells once, up front — see the brief's "only
  // re-flip the other digit groups when their value actually changes"
  // requirement: every tick below diffs against each individual digit
  // cell's current character and leaves untouched cells alone entirely,
  // never rebuilding or re-rendering a whole group.
  const UNITS = [
    { key: "days", digits: 3 },
    { key: "hours", digits: 2 },
    { key: "minutes", digits: 2 },
    { key: "seconds", digits: 2 },
  ];
  const digitCells = {}; // key -> array of { cellEl, innerEl } per position
  UNITS.forEach(({ key, digits }) => {
    const container = flapsEl.querySelector(`.cd-group[data-unit="${key}"] .cd-digits`);
    if (!container) return;
    const cells = [];
    for (let i = 0; i < digits; i++) {
      const cell = document.createElement("div");
      cell.className = "cd-digit";
      const inner = document.createElement("span");
      inner.className = "cd-digit-inner";
      inner.textContent = "0";
      cell.appendChild(inner);
      container.appendChild(cell);
      cells.push({ cellEl: cell, innerEl: inner });
    }
    digitCells[key] = cells;
  });

  function setDigitCell(cell, char) {
    if (cell.innerEl.textContent === char) return; // unchanged: no flip, no re-render
    if (!animate) {
      cell.innerEl.textContent = char;
      return;
    }
    cell.cellEl.classList.add("is-animating", "is-out");
    window.setTimeout(() => {
      cell.innerEl.textContent = char;
      cell.cellEl.classList.remove("is-out");
      cell.cellEl.classList.add("is-in-start");
      requestAnimationFrame(() => {
        cell.cellEl.classList.remove("is-in-start");
      });
      window.setTimeout(() => {
        cell.cellEl.classList.remove("is-animating");
      }, 170);
    }, 150);
  }

  function setUnit(key, value, digits) {
    const cells = digitCells[key];
    if (!cells) return;
    const padded = String(Math.max(0, value)).padStart(digits, "0").slice(-digits);
    for (let i = 0; i < digits; i++) {
      setDigitCell(cells[i], padded[i]);
    }
  }

  // Ring geometry, read from the track circle's own SVG attributes rather
  // than duplicating its radius/center as separate magic numbers here.
  const RING_R = trackCircle.r.baseVal.value;
  const RING_CX = trackCircle.cx.baseVal.value;
  const RING_CY = trackCircle.cy.baseVal.value;
  const CIRCUMFERENCE = 2 * Math.PI * RING_R;
  [trackCircle, progressCircle].forEach((c) => {
    c.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  });
  progressCircle.style.strokeDashoffset = "0";

  // Milestone markers sit at fixed angles around the ring — the point
  // where the drawn/undrawn boundary will be exactly when that fraction
  // of time remains — computed once from the same geometry, not
  // hand-placed. 0deg is 12 o'clock, increasing clockwise, matching the
  // progress circle's own -90deg CSS rotation (see css/styles.css).
  const MILESTONE_R = 5;
  milestoneEls.forEach((m) => {
    const threshold = Number(m.dataset.milestone) / 100;
    const angle = threshold * Math.PI * 2;
    m.setAttribute("cx", RING_CX + RING_R * Math.sin(angle));
    m.setAttribute("cy", RING_CY - RING_R * Math.cos(angle));
    m.setAttribute("r", MILESTONE_R);
  });

  let confettiFired = false;
  let completeShown = false;
  let lastAnnouncedMinute = null; // throttles the aria-live text (see below)
  let intervalId = null;

  function renderComplete() {
    if (completeShown) return;
    completeShown = true;
    flapsEl.hidden = true;
    completeEl.hidden = false;
    if (progressCircle) progressCircle.style.strokeDashoffset = String(CIRCUMFERENCE);
    milestoneEls.forEach((m) => m.classList.add("is-reached"));
    if (srTextEl) srTextEl.textContent = `${targetEvent.title} is happening now!`;
    if (glowEl) glowEl.classList.remove("is-pulsing");
    if (!confettiFired) {
      confettiFired = true;
      triggerConfetti(completeEl);
    }
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function tick() {
    const now = Date.now();
    const remainingMs = targetTime - now;

    if (remainingMs <= 0) {
      renderComplete();
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setUnit("days", days, 3);
    setUnit("hours", hours, 2);
    setUnit("minutes", minutes, 2);
    setUnit("seconds", seconds, 2);

    // Radial ring: fraction of the [previous event -> target] span still
    // remaining, clamped in case an unusual clock skew ever pushes it
    // outside [0, 1].
    const fractionRemaining = Math.max(0, Math.min(1, (targetTime - now) / totalSpan));
    progressCircle.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fractionRemaining));
    milestoneEls.forEach((m) => {
      const threshold = Number(m.dataset.milestone) / 100;
      m.classList.toggle("is-reached", fractionRemaining <= threshold);
    });

    // Background pulse intensifies/speeds up as the target nears — driven
    // entirely by CSS custom properties so the actual animation stays in
    // CSS; skipped outright under reduced motion (no properties to read,
    // no .is-pulsing class ever added).
    if (animate && glowEl) {
      const urgency = 1 - fractionRemaining; // 0 far away -> 1 imminent
      glowEl.classList.add("is-pulsing");
      glowEl.style.setProperty("--cd-pulse-duration", `${(3.2 - urgency * 2.2).toFixed(2)}s`);
      glowEl.style.setProperty("--cd-pulse-min", String((0.18 + urgency * 0.12).toFixed(2)));
      glowEl.style.setProperty("--cd-pulse-max", String((0.4 + urgency * 0.35).toFixed(2)));
    }

    // Screen readers get a full plain-text sentence, but only re-announced
    // once a minute (on the seconds rollover) rather than every second —
    // the visual digits already update every second for sighted users,
    // and re-announcing on every tick would make the live region
    // unusable noise for assistive tech.
    if (srTextEl && minutes !== lastAnnouncedMinute) {
      lastAnnouncedMinute = minutes;
      const parts = [];
      if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
      if (days > 0 || hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
      parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
      srTextEl.textContent = `${parts.join(", ")} remaining until ${targetEvent.title}.`;
    }
  }

  tick();
  intervalId = window.setInterval(tick, 1000);

  // Subtle mouse-parallax tilt on the ring/digit cluster, desktop only —
  // same inline-transform + transition-on-leave pattern as
  // initMagneticButtons above, just applied to the countdown's own
  // display rather than a button.
  if (animate && supportsFinePointer && displayEl) {
    const maxOffset = 8;
    widget.addEventListener("mousemove", (e) => {
      const rect = widget.getBoundingClientRect();
      const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const x = Math.max(-maxOffset, Math.min(maxOffset, relX * maxOffset));
      const y = Math.max(-maxOffset, Math.min(maxOffset, relY * maxOffset));
      displayEl.style.transition = "transform 0.08s linear";
      displayEl.style.transform = `translate(${x}px, ${y}px) rotateX(${-y * 0.6}deg) rotateY(${x * 0.6}deg)`;
    });
    widget.addEventListener("mouseleave", () => {
      displayEl.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
      displayEl.style.transform = "translate(0, 0) rotateX(0) rotateY(0)";
    });
  }
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

// Category -> accent color (Stage 6a's own established taxonomy — see the
// matching --card-accent CSS comment). Shared by initBlogContent (grid)
// and initBlogPostContent (the post's own page) so both read the same
// mapping.
const BLOG_CATEGORY_ACCENT = {
  Recap: "teal",
  Announcement: "sky",
  "Behind the Scenes": "orange",
  Tips: "gold",
};

// ---------------------------------------------------------------------------
// Blog page: content (Stage 2b, Admin CMS extension). Fetches
// content/blog.json — the file the /admin CMS's Blog collection edits —
// and builds the exact same <li class="blog-card">...</li> markup that
// used to be hardcoded directly in blog.html (same classes, same
// blog-post-N id scheme, same category -> accent mapping), same pattern
// as initFaqContent/initTeamContent in Stages 1/2a.
//
// Card 1 gets .blog-card-featured and card 6 gets .blog-card-banner by
// POSITION in the fetched list (matching exactly what was hardcoded
// before this stage), not read from the JSON — same reasoning as the
// Leadership page's Stage 2a masonry sizing: the bento shape is a fixed-
// for-6-posts arrangement the page itself owns.
//
// initBlogGridLayout/initBlogGridReveal (below) are only called from
// inside this fetch's success handler — before this stage they could
// assume .blog-grid's cards already existed synchronously; now they
// can't. initBlogEntrance (the hero) and the Newsletter section's own
// init calls are untouched and still run unconditionally at the bottom
// of this file, same as always — this stage doesn't touch the
// Newsletter at all.
// ---------------------------------------------------------------------------
function initBlogContent() {
  const grid = document.getElementById("blog-grid");
  if (!grid) return; // not the Blog page

  fetch("content/blog.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/blog.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const posts = Array.isArray(data.posts) ? data.posts : [];
      if (!posts.length) throw new Error("content/blog.json has no posts");
      renderBlogCards(grid, posts);
      initBlogGridLayout();
      initBlogGridReveal();
      // See the matching comment in initFaqContent/initTeamContent
      // (Stages 1/2a): the bottom-of-file initSearchResultHighlight()
      // call already ran once, synchronously, before this fetch
      // resolved — necessarily a no-op on this page since the
      // .blog-card it was looking for didn't exist yet. Retry now that
      // the real content is in the DOM, for a visitor who arrived via a
      // search result or any other #blog-post-N deep link.
      if (location.hash) highlightSearchTarget(location.hash.slice(1));
    })
    .catch((err) => {
      console.error("Blog content failed to load:", err);
      grid.innerHTML =
        '<li class="blog-load-error">Something went wrong loading these posts. Please refresh, or reach out directly at ' +
        '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</li>';
    });
}

function renderBlogCards(gridEl, posts) {
  gridEl.innerHTML = posts
    .map((post, i) => {
      const n = i + 1;
      const accent = BLOG_CATEGORY_ACCENT[post.category] || "teal";
      const sizeClass = i === 0 ? " blog-card-featured" : i === posts.length - 1 ? " blog-card-banner" : "";
      const dateLabel = formatIsoDateLong(post.date);
      const href = `blog-post.html?slug=${encodeURIComponent(slugify(post.title))}`;
      return `
        <li id="blog-post-${n}" class="blog-card blog-card-${accent}${sizeClass}">
          <a class="blog-card-link" href="${escapeHtml(href)}" aria-label="Read: ${escapeHtml(post.title)}"></a>
          <figure class="blog-card-thumb">
            <img src="${escapeHtml(post.thumbnail)}" alt="" loading="lazy">
          </figure>
          <div class="blog-card-body">
            <p class="blog-card-category">${escapeHtml(post.category)}</p>
            <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
            <p class="blog-card-date">${escapeHtml(dateLabel)}</p>
            <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
          </div>
        </li>`;
    })
    .join("");
}

// "YYYY-MM-DD" (Decap's date widget format, admin/config.yml) -> "March 2,
// 2025". Reuses parseHultEventDate's exact same local-midnight parsing
// (the Timeline's own date field is in this same format) rather than a
// second copy of the same UTC-shift fix.
function formatIsoDateLong(iso) {
  return parseHultEventDate(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Blog post page (Stage 2b, Admin CMS extension): blog-post.html is a
// single template for every post, not one file per post — a static site
// with no build step can't generate individual pages at deploy time.
// This reads ?slug=... off the page's own URL, fetches content/blog.json
// (the same file the Blog page's teaser grid reads — initBlogContent
// above), finds the post whose slugified title matches, and fills in the
// #blog-post-article template. No match (a bad/stale link, or the fetch
// itself failing) shows #blog-post-not-found instead, with a link back
// to the Blog page rather than a blank page.
// ---------------------------------------------------------------------------
function initBlogPostContent() {
  const article = document.getElementById("blog-post-article");
  const notFound = document.getElementById("blog-post-not-found");
  if (!article || !notFound) return; // not the blog post page

  function showNotFound() {
    notFound.hidden = false;
  }

  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) {
    showNotFound();
    return;
  }

  fetch("content/blog.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/blog.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const posts = Array.isArray(data.posts) ? data.posts : [];
      const post = posts.find((p) => slugify(p.title) === slug);
      if (!post) {
        showNotFound();
        return;
      }

      const accent = BLOG_CATEGORY_ACCENT[post.category] || "teal";
      article.style.setProperty("--card-accent", `var(--${accent})`);

      document.title = `${post.title} | Hult Prize @ UC Davis`;
      const descriptionMeta = document.querySelector('meta[name="description"]');
      if (descriptionMeta) descriptionMeta.setAttribute("content", post.excerpt);

      document.getElementById("blog-post-category").textContent = post.category;
      document.getElementById("blog-post-title").textContent = post.title;
      document.getElementById("blog-post-date").textContent = formatIsoDateLong(post.date);

      const thumbImg = document.getElementById("blog-post-thumb-img");
      thumbImg.src = post.thumbnail;
      thumbImg.alt = post.title;

      const bodyEl = document.getElementById("blog-post-body");
      // Same escape-before-marked safety as the Leadership page's bios
      // (Stage 2a) — see that function's comment for why.
      bodyEl.innerHTML =
        typeof marked !== "undefined" ? marked.parse(escapeHtml(post.body || "")) : `<p>${escapeHtml(post.body || "")}</p>`;

      article.hidden = false;
    })
    .catch((err) => {
      console.error("Blog post content failed to load:", err);
      showNotFound();
    });
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
  if (!grid || !cards.length) return;

  const desktopQuery = window.matchMedia("(min-width: 1000px)");
  // One featured tile spanning the first two columns and both rows, four
  // regular tiles filling the rest of that 2x2 block's neighboring cells,
  // and a full-width banner tile along the bottom — see the blog-grid-
  // section comment in blog.html for why this shape (rather than
  // Leadership's own bento) was chosen. This fixed 6-slot arrangement only
  // maps cleanly onto exactly 6 cards; since Stage 2b made post count
  // CMS-editable (an editor can add or remove posts from /admin), a count
  // other than 6 falls back to the plain stylesheet-driven layout below
  // instead of indexing past the end of this array — confirmed live: an
  // unguarded placements[i] on a 7th card threw and broke the entire
  // teaser grid's render, not just its layout.
  const placements = [
    { col: "1 / 3", row: "1 / 3" },
    { col: "3 / 4", row: "1 / 2" },
    { col: "4 / 5", row: "1 / 2" },
    { col: "3 / 4", row: "2 / 3" },
    { col: "4 / 5", row: "2 / 3" },
    { col: "1 / 5", row: "3 / 4" },
  ];

  function apply() {
    if (desktopQuery.matches && cards.length === placements.length) {
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

// Position-based accent cycling for .gallery-tile cards (teal, sky,
// orange, gold, repeating) — same reasoning as Team/Blog/Timeline/Pitch
// Videos' card accents: computed from the rendered array index at render
// time, not stored as a CMS field.
const GALLERY_ACCENTS = ["teal", "sky", "orange", "gold"];

// Position-based tile SIZE cycling (Stage 2e) — the whole point of this
// stage's "no size field" requirement: a repeating 6-slot pattern
// (large, regular, wide, regular, tall, regular) assigns each tile's
// bento shape purely from its rendered index, so the grid stays visually
// varied — one large, one wide, one tall spread out among three
// regular-sized tiles every 6 photos — no matter how many photos exist
// or what order they were added in. This exact 1:1:1:3 ratio matches the
// original 12 hardcoded tiles' overall size distribution (2 large/2 wide/
// 2 tall/6 regular), just computed continuously instead of once per
// hardcoded category block, so the grid keeps the same visual density as
// more photos are added rather than trending toward "all regular."
const GALLERY_SIZES = ["large", "regular", "wide", "regular", "tall", "regular"];

// Builds every .gallery-tile <li> from the fetched photos array (CMS
// entry order IS grid order, same as Pitch Videos — there's nothing to
// sort by) — the exact same markup that used to be hand-authored once
// per photo directly in gallery.html, including the close/prev/next
// lightbox button chrome every tile carries regardless of whether it's
// currently the open lightbox (initGalleryLightbox, called right after
// this from initGalleryContent, wires up and toggles that). Caption
// doubles as both the <img> alt text and the lightbox's visible caption
// — per the brief, it exists primarily for accessibility, not as a
// prominently-styled headline, so one plain string serves both.
function renderGalleryTiles(gridEl, photos) {
  gridEl.innerHTML = photos
    .map((photo, i) => {
      const accent = GALLERY_ACCENTS[i % GALLERY_ACCENTS.length];
      const size = GALLERY_SIZES[i % GALLERY_SIZES.length];
      const caption = photo.caption || "";
      return `
        <li class="gallery-tile gallery-tile-${accent}" data-category="${escapeHtml(photo.category)}" data-size="${size}">
          <div class="gallery-tile-button" tabindex="0" role="button" aria-label="View photo: ${escapeHtml(caption)}">
            <img src="${escapeHtml(photo.photo || "")}" alt="${escapeHtml(caption)}" loading="lazy">
            <button type="button" class="gallery-lightbox-close" aria-label="Close photo viewer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <button type="button" class="gallery-lightbox-prev" aria-label="Previous photo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button type="button" class="gallery-lightbox-next" aria-label="Next photo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <p class="gallery-lightbox-caption">${escapeHtml(caption)}</p>
          </div>
        </li>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Gallery data (Stage 2e, Admin CMS extension) — fetches content/
// gallery.json (the file the /admin CMS's Gallery collection edits),
// renders the bento grid's tiles from it, and only then wires up the
// layout/reveal/filter/lightbox behaviors below — all four need the real
// rendered .gallery-tile DOM to work against (initGalleryLayout measures
// and positions actual tiles; initGalleryReveal/initGalleryFilter/
// initGalleryLightbox all query .gallery-tile/.gallery-tile-button at
// call time), so none of them can safely run before this fetch resolves.
// Unlike Timeline, entry order here IS grid order before size/accent
// cycling is applied — there's nothing to sort by, same as Pitch Videos.
// Deliberately no upper bound anywhere in this pipeline on how many
// photos it renders: this collection is meant to keep growing, and nothing
// here (or in the four functions it calls) assumes a fixed count of 12.
// ---------------------------------------------------------------------------
function initGalleryContent() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return; // not the Gallery page

  fetch("content/gallery.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/gallery.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const photos = Array.isArray(data.photos) ? data.photos : [];
      if (!photos.length) throw new Error("content/gallery.json has no photos");
      renderGalleryTiles(grid, photos);
      initGalleryLayout();
      initGalleryReveal();
      initGalleryFilter();
      initGalleryLightbox();
    })
    .catch((err) => {
      console.error("Gallery content failed to load:", err);
      grid.innerHTML =
        '<li class="gallery-load-error">Something went wrong loading these photos. Please refresh, or reach out directly at ' +
        '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</li>';
    });
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
//
// Only ever called from initGalleryContent (Stage 2e), once the real
// tiles have been rendered from content/gallery.json.
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

// Position-based accent cycling for .about-value-card pillars (magenta,
// teal, sky, orange, gold) — same reasoning as Team/Blog/Timeline/Pitch
// Videos/Gallery's card accents: computed from the rendered array index at
// render time, not stored as a CMS field.
const ABOUT_VALUE_ACCENTS = ["magenta", "teal", "sky", "orange", "gold"];

// Exactly the 5 icons this page has always used, in their original order —
// lifted verbatim from the old hardcoded markup into a parallel array so
// they keep cycling by rendered POSITION alongside ABOUT_VALUE_ACCENTS
// (i % length, same convention as GALLERY_SIZES/TEAM_CARD_ACCENTS): adding,
// removing, or reordering a value pillar in the CMS only ever asks for a
// Name and a Description, never a layout/styling decision.
const ABOUT_VALUE_ICONS = [
  '<svg viewBox="0 0 24 24"><path d="M13 3s5 2 5 8-5 10-5 10-5-4-5-10 5-8 5-8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 16l-3 5M18 16l3 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="9.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 21h6M12 16v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 5.5v4l2.5 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.5c-1.8 1.6-1.8 4 0 5.6 1.8-1.6 1.8-4 0-5.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="9" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 13.3c2.6.4 4.5 2.6 4.5 5.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
];

// Splits arbitrary CMS-authored title text into the same per-word overflow-
// hidden-mask spans (.ab-reveal-word > .ab-reveal-word-inner) the hero
// markup used to hardcode one-per-word, so initAboutEntrance — which
// queries ".about-hero .ab-reveal-word-inner" generically — keeps working
// unchanged no matter what the title text actually is. Whitespace-split
// only (no markdown/HTML), the same trust level as every other plain
// "text" CMS field on this site.
function renderAboutHeroTitle(h1El, title) {
  const words = String(title || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  h1El.innerHTML = words
    .map(
      (word) =>
        `<span class="ab-reveal-word"><span class="ab-reveal-word-inner">${escapeHtml(word)}</span></span>`
    )
    .join(" ");
}

// Builds every .about-value-card <li> from the fetched values array — icon
// and accent color both come from ABOUT_VALUE_ICONS/ABOUT_VALUE_ACCENTS
// indexed by rendered position (i % length), never stored in the CMS (see
// the comment on those two arrays above).
function renderAboutValues(gridEl, values) {
  gridEl.innerHTML = values
    .map((value, i) => {
      const accent = ABOUT_VALUE_ACCENTS[i % ABOUT_VALUE_ACCENTS.length];
      const icon = ABOUT_VALUE_ICONS[i % ABOUT_VALUE_ICONS.length];
      return `
        <li class="about-value-card about-value-${accent}">
          <span class="about-value-icon" aria-hidden="true">${icon}</span>
          <h3>${escapeHtml(value.name || "")}</h3>
          <p>${escapeHtml(value.description || "")}</p>
        </li>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// About page data (Stage 2f, Admin CMS extension) — fetches content/
// about.json (the single document the /admin CMS's About Page collection
// edits) and renders the header title, founding story, value pillars, ENG
// 108 section, and Built to Last section from it. Unlike every other CMS
// collection on this site (FAQ/Team/Blog/Timeline/Pitch Videos/Gallery —
// all repeatable `list`s), About is a `files`-type single document: one
// page, not many entries.
//
// initAboutEntrance is NOT gated behind this fetch: the hero flourish and
// lede are fixed UI, not CMS content, and the H1 already carries this
// page's real title as static fallback markup in about.html, so the
// entrance animation plays immediately either way — renderAboutHeroTitle
// only swaps in different text if/once the fetch succeeds. initAboutReveal
// IS gated behind it, since the value-pillar cards it needs to animate
// don't exist until renderAboutValues runs. On failure, the four
// CMS-driven sections are hidden and replaced by one plain-text error
// message with a mailto contact — the hero (title/lede) is left showing
// its static fallback rather than also being hidden, since it never
// depended on this fetch to begin with.
// ---------------------------------------------------------------------------
function initAboutContent() {
  const hero = document.querySelector(".about-hero");
  if (!hero) return; // not the About page

  const titleEl = document.getElementById("about-hero-title");
  const storyBody = document.getElementById("about-story-body");
  const valuesGrid = document.getElementById("about-values-grid");
  const partnershipBody = document.getElementById("about-partnership-body");
  const legacyBody = document.getElementById("about-legacy-body");
  const errorEl = document.getElementById("about-content-error");
  const sections = document.querySelectorAll(".about-story, .about-values, .about-partnership, .about-legacy");

  // Same escape-then-parse safety pattern as renderTeamMembers/
  // renderBlogPost/renderTimelineEvents: raw markdown is HTML-escaped
  // BEFORE marked ever sees it, so a literal "<" in a CMS field renders as
  // inert text, never markup — the only real HTML that reaches the page is
  // what marked itself generates from actual markdown syntax. Falls back
  // to plain escaped text if the marked CDN failed to load.
  const renderMarkdown = (text) =>
    typeof marked !== "undefined" ? marked.parse(escapeHtml(text || "")) : `<p>${escapeHtml(text || "")}</p>`;

  fetch("content/about.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/about.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const values = Array.isArray(data.values) ? data.values : [];
      if (!values.length) throw new Error("content/about.json has no values");

      if (titleEl && data.headerTitle) renderAboutHeroTitle(titleEl, data.headerTitle);
      if (storyBody) storyBody.innerHTML = renderMarkdown(data.foundingStory);
      if (valuesGrid) renderAboutValues(valuesGrid, values);
      if (partnershipBody) partnershipBody.innerHTML = renderMarkdown(data.eng108Section);
      if (legacyBody) legacyBody.innerHTML = renderMarkdown(data.legacySection);

      initAboutReveal();
    })
    .catch((err) => {
      console.error("About content failed to load:", err);
      sections.forEach((section) => {
        section.hidden = true;
      });
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.innerHTML =
          "Something went wrong loading this page's content. Please refresh, or reach out directly at " +
          '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.';
      }
    });
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
// FAQ page: content (Stage 12a, Admin CMS pilot). Fetches content/faq.json
// — the one file the /admin CMS pilot actually edits — and builds the
// exact same <li class="faq-item">...</li> markup that used to be
// hardcoded directly in faq.html (same classes, same faq-question-N/
// faq-answer-N id scheme so nothing downstream needs to change: not
// initFaqAccordion, not initFaqFilter, not the FAQ entries in
// SEARCH_INDEX/highlightSearchTarget, all of which only ever cared about
// the rendered DOM, never how it got there).
//
// initFaqReveal/initFaqAccordion/initFaqFilter (below) and, if this page
// was reached via a #faq-question-N deep link, highlightSearchTarget are
// only called from inside this fetch's success handler — the bottom-of-
// file call list below calls initFaqContent() once instead of calling
// those three directly, since before this stage they could assume
// #faq-list's items already existed synchronously; now they can't.
//
// This is the one page on the site where content genuinely doesn't exist
// without JS running (every other page's content is plain HTML, with
// only animation gated behind JS/motion checks) — a deliberate, scoped
// tradeoff of this pilot; see the final report.
// ---------------------------------------------------------------------------
function initFaqContent() {
  const list = document.getElementById("faq-list");
  if (!list) return; // not the FAQ page

  fetch("content/faq.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/faq.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const items = Array.isArray(data.questions) ? data.questions : [];
      if (!items.length) throw new Error("content/faq.json has no questions");
      renderFaqItems(list, items);
      initFaqReveal();
      initFaqAccordion();
      initFaqFilter();
      // initSearchResultHighlight (bottom of this file) already ran once
      // for every page, synchronously, before this fetch resolved — for
      // this page specifically that was necessarily a no-op (the
      // .faq-item it was looking for didn't exist yet). Retry now that
      // the real content is in the DOM, for a visitor who arrived via a
      // search result or any other #faq-question-N deep link.
      if (location.hash) highlightSearchTarget(location.hash.slice(1));
    })
    .catch((err) => {
      console.error("FAQ content failed to load:", err);
      list.innerHTML =
        '<li class="faq-load-error">Something went wrong loading these questions. Please refresh, or reach out directly at ' +
        '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</li>';
    });
}

// A TBD placeholder answer gets the same dimmed/italic .faq-answer-tbd
// treatment it always has — detected from the text itself (content/
// faq.json only carries question/answer/category, matching exactly what
// the CMS pilot's config.yml exposes) rather than a 4th JSON field, since
// a field the CMS doesn't know about risks being silently dropped the
// next time a real edit is saved through it.
function isFaqAnswerTbd(answer) {
  const trimmed = answer.trim();
  return trimmed.startsWith("[") && /TBD/i.test(trimmed);
}

function renderFaqItems(listEl, items) {
  listEl.innerHTML = items
    .map((item, i) => {
      const n = i + 1;
      const pClass = isFaqAnswerTbd(item.answer) ? ' class="faq-answer-tbd"' : "";
      return `
        <li class="faq-item faq-item-${escapeHtml(item.category)}" data-category="${escapeHtml(item.category)}">
          <h3 class="faq-question-heading">
            <button type="button" class="faq-question" aria-expanded="false" aria-controls="faq-answer-${n}" id="faq-question-${n}">
              <span class="faq-question-text">${escapeHtml(item.question)}</span>
              <span class="faq-toggle-icon" aria-hidden="true"><span></span><span></span></span>
            </button>
          </h3>
          <div class="faq-answer" id="faq-answer-${n}" role="region" aria-labelledby="faq-question-${n}" aria-hidden="true">
            <p${pClass}>${escapeHtml(item.answer)}</p>
          </div>
        </li>`;
    })
    .join("");
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

// Splits arbitrary CMS-authored headline text into the same per-word
// overflow-hidden-mask spans (.reveal-word > .reveal-word-inner) the hero
// markup used to hardcode one-per-word — including the inline `--i` custom
// property each span needs, since (unlike every other page's word-reveal)
// this one is driven by a plain CSS keyframe animation
// (`animation-delay: calc(0.05s * var(--i, 0))`, see css/styles.css) rather
// than a GSAP stagger, so the index has to travel with the markup itself.
function renderHeroHeadline(h1El, text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  h1El.innerHTML = words
    .map(
      (word, i) =>
        `<span class="reveal-word" style="--i:${i}"><span class="reveal-word-inner">${escapeHtml(word)}</span></span>`
    )
    .join(" ");
}

// Hero redesign (Claude Design export integration) — the "Scroll to
// explore" button just nudges the scroll position down by roughly one
// viewport. See the HTML comment on .hero-scroll-affordance for why this
// is a plain scroll nudge rather than an anchor-link jump. Not gated by
// prefersReducedMotion/GSAP the way initPinSequence itself is — this is
// just a click handler, and `behavior: "smooth"` already respects reduced
// motion on its own.
function initHeroScrollAffordance() {
  const btn = document.getElementById("hero-scroll-affordance");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
}

// Home only (gated on #pin-sequence, same as every other Home-specific
// init here) — actively blocks the trackpad/mouse-wheel gesture that
// causes the browser's own elastic overscroll bounce at the very top of
// the page, rather than just trying to recolor what shows through it
// (the `overscroll-behavior-y: none` rule in css/styles.css, which
// suppresses the bounce in Chrome/Edge but isn't reliably honored by
// every browser — confirmed still visible after that CSS-only fix).
// Scrolling up while already at scrollY 0 is the ONLY thing this
// prevents; every other scroll direction/position is untouched, so this
// can't interfere with the pinned sequence, normal scrolling, or
// scrollTo/scrollBy anywhere.
function initHeroOverscrollGuard() {
  const sequence = document.getElementById("pin-sequence");
  if (!sequence) return;

  window.addEventListener(
    "wheel",
    (e) => {
      if (window.scrollY <= 0 && e.deltaY < 0) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

// ---------------------------------------------------------------------------
// Home hero: one-time on-load entrance choreography (Hero On-Load Entrance
// Choreography build). This is ONLY the automatic reveal that plays once,
// immediately on load — a single coordinated GSAP timeline giving each kind
// of element its own distinct treatment instead of one generic fade-and-
// slide-up repeated eight times. It is completely separate from
// initPinSequence above: that's the scroll-triggered pin/release behavior
// that only starts once the visitor actually scrolls into the Explainer
// section. Neither touches the other's targets, timeline, or ScrollTrigger,
// and this one never touches scroll position at all, so scrolling away
// mid-entrance can't break or stall either system.
//
// Called from initHomeContent()'s .finally() (below), same as
// initPinSequence/initTopTeamsAnimation/initStoryEntranceFade next to it —
// deliberately, not from a plain DOMContentLoaded hook the way every other
// page's own hero entrance is. renderHeroHeadline (above) fully replaces
// #hero-heading's innerHTML with fresh spans when the CMS fetch succeeds;
// capturing references to the OLD spans any earlier would risk animating
// nodes the fetch then rips out from under this timeline. content/home.json
// is a small same-origin static file (fast in practice, and initPinSequence
// et al. already accept the same dependency for this exact page), so
// deferring the whole entrance to there costs nothing perceptible.
//
// Gated exactly like every other page's hero entrance (About/Blog/Gallery/
// etc.): prefersReducedMotion or no GSAP means this does nothing at all, and
// every element is left exactly as the static HTML/CSS already renders it —
// fully visible in its final resting state, corner-tag underline included
// at full width, no scroll-cue pulse loop. That IS the full reduced-motion
// fallback; there's no separate "instant reveal" code path to maintain,
// same as those other pages.
// ---------------------------------------------------------------------------
function initHeroEntrance() {
  const hero = document.querySelector(".scene-hero");
  if (!hero) return;
  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const header = document.querySelector(".site-header");
  const navLinks = document.querySelectorAll(".header-inner nav a");
  // .pin-bg is the shared network/globe motif behind ALL THREE pinned
  // scenes (Hero/Explainer/Impact) — normally fully covered while Hero is
  // showing, since .scene-hero stacks above it (z-index 1 > 0) and its own
  // photo/placeholder is fully opaque. It can't be removed (Explainer/
  // Impact both rely on it as their backdrop) — but bgLayers' own fade-in
  // below now means the hero photo briefly turns translucent on load,
  // exposing this always-static, never-animated layer showing through
  // underneath (reported: "something behind the background image... the
  // background effect when you scroll down"). Rather than leave it as a
  // mismatched, jarring flash, it gets the EXACT same entry treatment as
  // the photo/placeholder (same gsap.set/tl.to calls below, not a separate
  // copy) so the two settle in together as one coordinated reveal instead
  // of one appearing to sit behind, and briefly clash with, the other.
  // Only ever affects this initial load moment — once both reach opacity 1,
  // the hero photo fully re-covers it exactly as before, and this has no
  // effect on the separate scroll-scrubbed rotate/scale initPinSequence
  // already runs on .pinbg-lines/.pinbg-nodes (different targets, same
  // element tree, no property overlap).
  const bgLayers = [
    document.getElementById("hero-photo-placeholder"),
    document.getElementById("hero-photo-img"),
    document.querySelector(".pin-bg"),
  ].filter((el) => el && !el.hidden);
  const overlay = document.querySelector(".hero-photo-overlay");
  const eyebrow = document.querySelector(".hero-eyebrow");
  // Paired up front (not two parallel arrays built later) so wordInners[i]
  // and its line index always refer to the same word, regardless of when
  // each is used below.
  const wordEntries = Array.from(document.querySelectorAll("#hero-heading .reveal-word"))
    .map((wrapper) => ({ wrapper, inner: wrapper.querySelector(".reveal-word-inner") }))
    .filter((entry) => entry.inner);
  const wordInners = wordEntries.map((entry) => entry.inner);
  const lede = document.querySelector(".hero-lede");
  const ctaButtons = document.querySelectorAll(".hero-actions .btn");
  const cornerTagText = document.querySelector(".hero-corner-tag-text");
  const cornerTagUnderline = document.querySelector(".hero-corner-tag-underline");
  const scrollAffordance = document.getElementById("hero-scroll-affordance");
  const scrollCircle = document.querySelector(".hero-scroll-circle");

  // --- Initial ("hidden") states — set SYNCHRONOUSLY, right now, not
  // deferred behind the document.fonts.ready wait below. Getting from
  // "visible" to "hidden" must never itself be visible: this runs in the
  // same tick initHomeContent reveals the real photo/headline/etc., so if
  // hiding waited on a webfont fetch too, a visitor on a slow font load
  // would see everything flash fully in, THEN vanish, THEN animate back in
  // — confirmed exactly this way once .pin-bg (above) was added to
  // bgLayers, which made an existing-but-subtle version of this flash
  // obvious (the network motif's dots/lines briefly visible over an
  // already-fully-bright photo before either was hidden). Only the actual
  // reveal below needs accurate post-font layout for the headline; hiding
  // never does. A reduced-motion visitor never reaches any of this code at
  // all, so the static markup just stays visible exactly as-is. ---
  if (bgLayers.length) gsap.set(bgLayers, { scale: 1.08, opacity: 0, transformOrigin: "50% 50%" });
  if (overlay) gsap.set(overlay, { opacity: 0 });
  if (header) gsap.set(header, { y: -16, opacity: 0 });
  if (navLinks.length) gsap.set(navLinks, { opacity: 0, y: -6 });
  if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 12 });
  if (wordInners.length) gsap.set(wordInners, { yPercent: 115, opacity: 0 });
  if (lede) gsap.set(lede, { opacity: 0, y: 18 });
  if (ctaButtons.length) gsap.set(ctaButtons, { opacity: 0, scale: 0.92 });
  if (cornerTagText) gsap.set(cornerTagText, { opacity: 0, y: 8 });
  if (cornerTagUnderline) gsap.set(cornerTagUnderline, { scaleX: 0, transformOrigin: "left center" });
  if (scrollAffordance) gsap.set(scrollAffordance, { opacity: 0 });

  const run = () => {
    // Group the headline's word spans into their actual rendered lines
    // (measured now, post-layout/post-fonts) so the cascade steps line-by-
    // line rather than word-by-word — a 3-line headline gets 3 stagger
    // steps, not eleven. lineIndexByPos[i] lines up with wordInners[i]
    // (built above from the same wordEntries, in the same order).
    const lineIndexByPos = [];
    let lastTop = null;
    let line = -1;
    wordEntries.forEach((entry) => {
      const top = Math.round(entry.wrapper.getBoundingClientRect().top);
      if (lastTop === null || Math.abs(top - lastTop) > 4) {
        line += 1;
        lastTop = top;
      }
      lineIndexByPos.push(line);
    });

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // 1. Background settles from a slightly zoomed-in state (a subtle Ken
    //    Burns-style settle) — bgLayers includes the photo/placeholder AND
    //    .pin-bg (see its own comment above), so the shared motif settles
    //    in as one layer together with the photo, not a mismatched flash
    //    behind it — with the legibility overlay (the three stacked
    //    gradients that make up .hero-photo-overlay) fading in alongside.
    if (bgLayers.length) tl.to(bgLayers, { scale: 1, opacity: 1, duration: 1.3, ease: "power2.out" }, 0);
    if (overlay) tl.to(overlay, { opacity: 1, duration: 0.9, ease: "power1.out" }, 0);

    // 2. Nav bar slides down into place while fading in — overlapping the
    //    background's own settle, not waiting for it. Its links only start
    //    staggering in left-to-right once the bar itself has visibly
    //    settled, not simultaneously with the bar's own entrance.
    if (header) tl.to(header, { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }, 0.05);
    if (navLinks.length) {
      tl.to(
        navLinks,
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.04, ease: "power2.out" },
        0.5
      );
    }

    // 3. Small uppercase eyebrow label.
    if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.4 }, 0.3);

    // 4. Headline cascades in line-by-line (not word-by-word) — each line
    //    slides up and fades in with a short delay before the next line.
    if (wordInners.length) {
      tl.to(
        wordInners,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
          stagger: (i) => (lineIndexByPos[i] || 0) * 0.11,
        },
        0.45
      );
    }

    // 5. Subtext, shortly after the headline's cascade finishes.
    if (lede) tl.to(lede, { opacity: 1, y: 0, duration: 0.45 }, 1.15);

    // 6. CTA buttons scale up while fading in, primary a beat before ghost.
    if (ctaButtons.length) {
      tl.to(
        ctaButtons,
        { opacity: 1, scale: 1, duration: 0.35, stagger: 0.1, ease: "back.out(1.6)" },
        1.45
      );
    }

    // 7. Corner tagline: text fades in first, then its underline draws
    //    itself left-to-right (scaleX 0 -> 1, anchored at its own left edge)
    //    only once the text has settled.
    if (cornerTagText) tl.to(cornerTagText, { opacity: 1, y: 0, duration: 0.4 }, 1.2);
    if (cornerTagUnderline) tl.to(cornerTagUnderline, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, 1.6);

    // 8. Scroll-to-explore affordance fades in last, after everything else
    //    has settled (~2.3s total from first element to last).
    if (scrollAffordance) tl.to(scrollAffordance, { opacity: 1, duration: 0.35 }, 1.95);

    // Once the one-time entrance completes, give the scroll-cue a subtle,
    // continuous bounce to draw the eye — a separate, independent tween
    // (not part of the entrance timeline itself) so it can be killed on its
    // own if reduced motion turns on mid-session, without touching anything
    // above. Kept small/slow on purpose: understated, not distracting.
    if (scrollCircle) {
      tl.call(() => {
        const pulse = gsap.to(scrollCircle, {
          y: 6,
          duration: 1.1,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        window
          .matchMedia("(prefers-reduced-motion: reduce)")
          .addEventListener("change", (e) => {
            if (!e.matches) return;
            pulse.kill();
            gsap.set(scrollCircle, { clearProps: "y" });
          });
      });
    }
  };

  // Only run() — the line measurement + actual reveal timeline — waits on
  // this; everything is already hidden above regardless of how long it
  // takes. Headline line-grouping needs real, post-font layout to measure
  // correctly — Archivo loads via a swapped webfont link, so measuring
  // before it's actually in use risks grouping words by the fallback font's
  // (different) line breaks. document.fonts.ready resolves once whatever
  // fonts the page actually used have finished loading (immediately, if
  // none were pending) — if it's unsupported or never resolves for some
  // reason, the reveal just never starts, which still fails safely: the
  // elements stay in the hidden state already set above rather than
  // getting stuck fully visible or vanishing later, though as a real (if
  // unlikely) downside they'd stay hidden. That tradeoff is deliberately
  // preferred over the flash this replaced.
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(run);
  } else {
    run();
  }
}

// "20+" -> { target: 20, suffix: "+" }; "2" -> { target: 2, suffix: "" }.
// animateCounter (above) needs the two split apart on data-target/
// data-suffix; the visually-hidden screen-reader text next to each counter
// just gets the original raw string back, unparsed.
function parseImpactStatNumber(raw) {
  const str = String(raw || "").trim();
  const match = str.match(/^(\d+)(.*)$/);
  if (!match) return { target: 0, suffix: str };
  return { target: parseInt(match[1], 10), suffix: match[2] };
}

// Updates one .impact-figure-primary/-secondary block in place: splits the
// CMS's plain "20+"/"2"-style stat string into animateCounter's
// data-target/data-suffix, refreshes the paired visually-hidden text (so
// assistive tech reads the same number the animation counts up to), and
// renders the markdown description into .impact-label. Never rebuilds the
// figure itself — animateCounter/initPinSequence both already query these
// exact elements by class/data-attribute, so overwriting them in place is
// what lets those keep working unmodified.
function renderImpactStat(figureEl, rawNumber, rawDescription) {
  const counterEl = figureEl.querySelector(".counter");
  const srEl = figureEl.querySelector(".visually-hidden");
  const labelEl = figureEl.querySelector(".impact-label");
  const { target, suffix } = parseImpactStatNumber(rawNumber);
  if (counterEl) {
    counterEl.dataset.target = target;
    counterEl.dataset.suffix = suffix;
    counterEl.textContent = "0";
  }
  if (srEl) srEl.textContent = String(rawNumber || "");
  if (labelEl) {
    labelEl.innerHTML =
      typeof marked !== "undefined" ? marked.parse(escapeHtml(rawDescription || "")) : `<p>${escapeHtml(rawDescription || "")}</p>`;
  }
}

// Rebuilds the "Learn more" link's contents while preserving its arrow
// span — this is a plain text CMS field (only the label is editable; the
// href stays fixed/programmatic per the brief), so the anchor element
// itself is never replaced, just its inner markup.
function renderLearnMoreLink(anchorEl, label) {
  anchorEl.innerHTML = `${escapeHtml(label || "Learn more")} <span aria-hidden="true">→</span>`;
}

// Placement (never list position) decides which of the three fixed podium
// slots — and which card class/badge accent — each CMS entry becomes, so a
// reordered list, or a "1st" entry anywhere in it, still produces a
// correct podium: initTopTeamsPinSequence/initTopTeamsSimpleReveal/
// triggerConfetti all locate the winner via .team-card-first, which this
// always assigns to whichever entry actually has Placement "1st".
const TOP_TEAM_PLACEMENT_INFO = {
  "1st": { cardClass: "team-card-first", badgeClass: "team-card-badge-gold" },
  "2nd": { cardClass: "team-card-second", badgeClass: "team-card-badge-silver" },
  "3rd": { cardClass: "team-card-third", badgeClass: "team-card-badge-bronze" },
};
const TOP_TEAM_PLACEMENT_ORDER = ["1st", "2nd", "3rd"];

// Builds the exact markup the three podium <article>s used to hardcode
// (same classes, same .team-card-glow on the winner only, same badge/name/
// year/photo shape) — but looked up by Placement, and always written to
// the DOM in 1st/2nd/3rd order regardless of the CMS list's own order, per
// the existing "DOM order is placement order" comment on .podium in
// css/styles.css (that order matters for tab/reading order; CSS `order`
// handles the visual 2nd-1st-3rd rearrangement separately). Throws if the
// three placements aren't each present exactly once — this section's
// entire pinned/podium/confetti sequence assumes exactly one 1st, one 2nd,
// and one 3rd, so a malformed list is treated as a content-load failure
// rather than rendered into a broken or partial podium.
function renderTopTeamsPodium(podiumEl, teams) {
  const byPlacement = {};
  teams.forEach((team) => {
    byPlacement[team.placement] = team;
  });

  const missing = TOP_TEAM_PLACEMENT_ORDER.filter((placement) => !byPlacement[placement]);
  if (missing.length) {
    throw new Error("content/home.json's topTeams is missing placement(s): " + missing.join(", "));
  }

  podiumEl.innerHTML = TOP_TEAM_PLACEMENT_ORDER.map((placement) => {
    const team = byPlacement[placement];
    const info = TOP_TEAM_PLACEMENT_INFO[placement];
    const glow = placement === "1st" ? '<div class="team-card-glow" aria-hidden="true"></div>' : "";
    const altText = `${team.teamName || ""} accepting ${placement} place at the ${team.year || ""} Hult Prize @ UC Davis OnCampus competition.`;
    return `
      <article class="team-card ${info.cardClass}">
        ${glow}
        <figure class="team-card-photo">
          <img src="${escapeHtml(team.photo || "")}" alt="${escapeHtml(altText)}" loading="lazy">
        </figure>
        <p class="team-card-badge ${info.badgeClass}">${escapeHtml(placement)} place</p>
        <h3 class="team-card-name">${escapeHtml(team.teamName || "")}</h3>
        <p class="team-card-year">${escapeHtml(team.year || "")}</p>
      </article>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Home page data (Stage 2g, Admin CMS extension) — fetches content/
// home.json (the single document the /admin CMS's Home Page collection
// edits) and updates the hero/explainer/impact/story/top-teams/CTA markup
// ALREADY in index.html, in place — unlike Gallery/Team/Blog/etc., this
// does not rebuild those sections' DOM from a template. Home's behavior is
// built on several interlocking pinned/scroll-scrubbed GSAP systems
// (initPinSequence, initTopTeamsAnimation, initStoryEntranceFade,
// initImpactCounters) that are all wired directly to specific existing
// classes/ids/data-attributes; rebuilding those subtrees from scratch would
// risk subtly breaking one of them. Every element this function touches
// (other than the Top Teams podium, see below) already carries the site's
// real current content as static fallback markup in index.html — exactly
// mirroring content/home.json — so a fetch failure still shows correct,
// real content, just not CMS-editable content.
//
// Top Teams is the one exception: like every other CMS *list* field on this
// site, its podium starts EMPTY in index.html and is fully rendered from
// this fetch (see renderTopTeamsPodium above) — showing a load-error
// message on failure, the same pattern as Gallery/Team/Blog/etc.
//
// initImpactCounters, initPinSequence, initTopTeamsAnimation, and
// initStoryEntranceFade — all previously called unconditionally at the
// bottom of this file — are called from here instead, in a `.finally()` so
// they still run even if this fetch fails (against the static fallback
// content, or an empty/error-state podium, both of which every one of
// those functions already handles safely via its own null/empty checks).
// This guarantees none of them can ever run against half-updated
// data-attributes or a podium mid-render. The relative order of the pin-
// sequence calls is preserved exactly as it was: initStoryEntranceFade
// measures #story's position, which is only correct once both pinned
// sequences' ScrollTrigger spacers already exist above it on the page.
// ---------------------------------------------------------------------------
function initHomeContent() {
  const sequence = document.getElementById("pin-sequence");
  if (!sequence) return; // not the Home page

  const renderMarkdown = (text) =>
    typeof marked !== "undefined" ? marked.parse(escapeHtml(text || "")) : `<p>${escapeHtml(text || "")}</p>`;

  const heroHeadingEl = document.getElementById("hero-heading");
  const heroLedeEl = document.querySelector(".hero-lede");
  const heroPrimaryBtnEl = document.getElementById("hero-primary-cta");
  const heroCornerTagEl = document.querySelector("#hero-corner-tagline .hero-corner-tag-text");
  const heroPhotoPlaceholderEl = document.getElementById("hero-photo-placeholder");
  const heroPhotoImgEl = document.getElementById("hero-photo-img");
  const explainerHeadingEl = document.getElementById("explainer-heading");
  const explainerBodyEl = document.querySelector(".scene-explainer .scene-body");
  const impactPrimaryEl = document.querySelector(".impact-figure-primary");
  const impactSecondaryEl = document.querySelector(".impact-figure-secondary");
  const storyHeadingEl = document.getElementById("story-heading");
  const storyBodyEl = document.querySelector(".story-intro-body");
  const storyPhotoImgEl = document.querySelector(".story-photo img");
  const storyLearnMoreEl = document.getElementById("story-learn-more-link");
  const topTeamsTitleEl = document.getElementById("top-teams-heading");
  const podiumEl = document.querySelector(".podium");
  const ctaHeadingEl = document.getElementById("cta-heading");
  const ctaBodyEl = document.querySelector(".cta-inner-body");
  const ctaPhotoImgEl = document.querySelector(".cta-photo");
  const ctaBtnEl = document.getElementById("cta-band-button");

  fetch("content/home.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/home.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const teams = Array.isArray(data.topTeams) ? data.topTeams : [];
      if (!teams.length) throw new Error("content/home.json has no topTeams");

      if (heroHeadingEl && data.heroHeadline) renderHeroHeadline(heroHeadingEl, data.heroHeadline);
      if (heroLedeEl) heroLedeEl.innerHTML = renderMarkdown(data.heroSubtext);
      if (heroPrimaryBtnEl && data.heroCtaLabel) heroPrimaryBtnEl.textContent = data.heroCtaLabel;
      if (heroCornerTagEl && data.heroCornerTagline) heroCornerTagEl.textContent = data.heroCornerTagline;
      if (heroPhotoImgEl && heroPhotoPlaceholderEl && data.heroBackgroundImage) {
        heroPhotoImgEl.src = data.heroBackgroundImage;
        heroPhotoImgEl.hidden = false;
        heroPhotoPlaceholderEl.hidden = true;
      }

      if (explainerHeadingEl && data.explainerHeading) explainerHeadingEl.textContent = data.explainerHeading;
      if (explainerBodyEl) explainerBodyEl.innerHTML = renderMarkdown(data.explainerBody);

      if (impactPrimaryEl) renderImpactStat(impactPrimaryEl, data.impactStat1Number, data.impactStat1Description);
      if (impactSecondaryEl) renderImpactStat(impactSecondaryEl, data.impactStat2Number, data.impactStat2Description);

      if (storyHeadingEl && data.storyHeading) storyHeadingEl.textContent = data.storyHeading;
      if (storyBodyEl) storyBodyEl.innerHTML = renderMarkdown(data.storyBody);
      if (storyPhotoImgEl && data.storyPhoto) storyPhotoImgEl.src = data.storyPhoto;
      if (storyLearnMoreEl) renderLearnMoreLink(storyLearnMoreEl, data.storyLearnMoreLabel);

      if (topTeamsTitleEl && data.topTeamsSectionTitle) topTeamsTitleEl.textContent = data.topTeamsSectionTitle;
      if (podiumEl) renderTopTeamsPodium(podiumEl, teams);

      if (ctaHeadingEl && data.ctaHeading) ctaHeadingEl.textContent = data.ctaHeading;
      if (ctaBodyEl) ctaBodyEl.innerHTML = renderMarkdown(data.ctaBody);
      if (ctaPhotoImgEl && data.ctaPhoto) ctaPhotoImgEl.src = data.ctaPhoto;
      if (ctaBtnEl && data.ctaButtonLabel) ctaBtnEl.textContent = data.ctaButtonLabel;
    })
    .catch((err) => {
      console.error("Home content failed to load:", err);
      // Everything above (other than Top Teams) already carries the site's
      // real current content as static fallback markup and needs no
      // further handling here. Top Teams starts empty like every other CMS
      // list on this site — show the same load-error treatment used there.
      if (podiumEl && !podiumEl.children.length) {
        podiumEl.innerHTML =
          '<p class="top-teams-load-error">Something went wrong loading this year\'s Top Teams. Please refresh, or reach out directly at ' +
          '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</p>';
      }
    })
    .finally(() => {
      initImpactCounters();
      initPinSequence();
      initTopTeamsAnimation();
      initStoryEntranceFade();
      // Hero redesign (Claude Design export integration) — safe to run
      // even on a fetch failure, same reasoning as the four calls above:
      // both only wire up event listeners, unrelated to any fetched
      // content.
      initHeroScrollAffordance();
      initHeroOverscrollGuard();
      // Hero On-Load Entrance Choreography build — deliberately last and
      // deliberately still inside this same .finally(), not a separate
      // DOMContentLoaded hook. See initHeroEntrance's own comment for why:
      // in short, the headline's word spans need to be in their final,
      // CMS-resolved form (renderHeroHeadline above already ran, whether
      // the fetch succeeded or failed) before anything measures or animates
      // them.
      initHeroEntrance();
    });
}

// ---------------------------------------------------------------------------
// Site Settings (Stage 2g, Admin CMS extension) — a single shared CMS
// document, content/site-settings.json, for the two values repeated in
// multiple places across the site (the footer's email/Instagram links on
// EVERY page, plus the Home hero's secondary "Follow us on Instagram"
// button): editing either value here updates every place it appears,
// instead of the same edit needing to be made separately in each spot.
// Runs unconditionally on every page (like initHomeLogoReset) rather than
// being gated to Home. Every link this touches already carries the site's
// real current value as its href/text, so a fetch failure just leaves
// those links exactly as they were — this is standing site-wide UI chrome,
// not page content, so (unlike FAQ/Team/Blog/etc.) it fails silently
// instead of showing a load-error message.
// ---------------------------------------------------------------------------
function initSiteSettings() {
  const emailLink = document.querySelector(".footer-links a[href^='mailto:']");
  const instagramLink = document.querySelector(".footer-links a[href*='instagram.com']");
  const heroInstagramLink = document.querySelector(".hero-actions .btn-ghost[href*='instagram.com']");
  if (!emailLink && !instagramLink && !heroInstagramLink) return;

  fetch("content/site-settings.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/site-settings.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (data.contactEmail && emailLink) {
        emailLink.href = "mailto:" + data.contactEmail;
        emailLink.textContent = data.contactEmail;
      }
      if (data.instagramUrl) {
        const handleMatch = String(data.instagramUrl).match(/instagram\.com\/([^/?#]+)/i);
        const handle = handleMatch ? "@" + handleMatch[1] : data.instagramUrl;
        if (instagramLink) {
          instagramLink.href = data.instagramUrl;
          instagramLink.textContent = handle;
        }
        if (heroInstagramLink) heroInstagramLink.href = data.instagramUrl;
      }
    })
    .catch((err) => {
      console.error("Site settings failed to load:", err);
    });
}

// ---------------------------------------------------------------------------
// How It Works page: one-time hero entrance (Stage 2h) — the same
// background-flourish + staggered-title + staggered-lede pattern as every
// other page's own entrance function, reused rather than inventing a new
// entry style. Independently named (.hiw-reveal-word/-inner) so this page's
// word-reveal spans can't collide with the others'.
// ---------------------------------------------------------------------------
function initHowItWorksEntrance() {
  const hero = document.querySelector(".hiw-hero");
  if (!hero) return;

  if (prefersReducedMotion || typeof gsap === "undefined") return;

  const flourish = document.querySelector(".hiw-hero-flourish");
  const words = document.querySelectorAll(".hiw-hero .hiw-reveal-word-inner");
  const lede = document.querySelector(".hiw-hero-lede");

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

// Position-based accent cycling, reused across every list on this page
// (Evaluation Criteria cards, SDG tiles, Resource Link cards) — same
// reasoning as every other card accent on this site: computed from the
// rendered array index at render time, never stored as a CMS field.
const HIW_ACCENTS = ["magenta", "teal", "sky", "orange", "gold"];

// Builds every .hiw-stage-item from the fetched `stages` list, plus a
// numbered node next to each one. Items stack in plain normal flow (flex
// column); the connecting SVG path is a single straight line absolutely
// positioned to span the whole list's height behind the nodes (see
// initStageJourney) — a straight line naturally runs alongside evenly
// stacked items with no per-item coordinate math needed, regardless of how
// many stages there are or how tall each card renders.
function renderStages(listEl, stages) {
  const pathEl = listEl.querySelector(".hiw-stage-path");
  const items = stages
    .map((stage, i) => {
      const accent = HIW_ACCENTS[i % HIW_ACCENTS.length];
      return `
        <div class="hiw-stage-item hiw-stage-item-${accent}">
          <span class="hiw-stage-node" aria-hidden="true">${i + 1}</span>
          <article class="hiw-stage-card">
            <p class="hiw-stage-date">${escapeHtml(stage.dateRange || "")}</p>
            <h3 class="hiw-stage-name">${escapeHtml(stage.name || "")}</h3>
            <p class="hiw-stage-description">${escapeHtml(stage.description || "")}</p>
          </article>
        </div>`;
    })
    .join("");
  listEl.innerHTML = (pathEl ? pathEl.outerHTML : "") + items;
}

// ---------------------------------------------------------------------------
// How It Works page: the stage journey's connecting line draws itself in as
// the user scrolls, via a scroll-SCRUBBED (never pinned) GSAP tween on the
// SVG path's stroke-dashoffset — deliberately not a ScrollTrigger pin:true
// sequence like Home's Hero/Explainer/Impact or Top Teams sections: the
// site's own cross-device compatibility audit identified GSAP's pin
// mechanism specifically as the recurring source of touch/mobile-Safari
// trouble elsewhere on the site, so this effect is built the same safer way
// as Our Story's fade-in (initStoryEntranceFade) instead — tied to normal
// document scroll, never taking it over, which behaves identically on
// touch and fine-pointer devices alike. Falls back to the path already
// fully drawn (its base markup has no stroke-dasharray/-dashoffset at all
// — those are only ever set here, via GSAP, once GSAP/ScrollTrigger are
// confirmed present and motion isn't reduced) if the CDN fails to load or
// the user prefers reduced motion.
//
// The stage cards themselves reveal via the same ScrollTrigger.batch
// stagger used everywhere else on this site (About/Gallery/Leadership/
// Blog/FAQ/Get Involved) — each card pops in quickly, individually, as it
// crosses into view, rather than waiting on the line's own progress.
//
// The line's scrub range is deliberately short (one screenful, not the
// whole — potentially several-thousand-pixel-tall — 5-card list): tying it
// to the full container height originally left the line only a small
// fraction drawn while a card was already fully visible and read (a real
// bug, caught live — the line's blunt round-capped end sat stranded mid-
// card instead of extending past it). Finishing the draw quickly, as the
// section first scrolls into view, means the line is already complete by
// the time there's any stage content to read — scrub still holds it at
// "fully drawn" for the remaining scroll through the list, it just never
// visibly lags behind the cards again.
// ---------------------------------------------------------------------------
function initStageJourney() {
  const container = document.getElementById("hiw-stages-list");
  const path = container ? container.querySelector(".hiw-stage-path path") : null;
  const cards = document.querySelectorAll(".hiw-stage-card");
  if (!container || !cards.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (path) {
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    gsap.to(path, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 15%",
        scrub: 0.4,
      },
    });
  }

  gsap.set(cards, { opacity: 0, y: 28 });
  ScrollTrigger.batch(cards, {
    start: "top 85%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" }),
  });
}

// Plain requirement strings -> <li> items with a checkmark, matching the
// site's established icon-plus-text list treatment (e.g. FAQ's category
// chips) rather than a bare bullet list.
function renderEligibility(listEl, items) {
  listEl.innerHTML = items
    .map(
      (item) => `
        <li class="hiw-eligibility-item">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>${escapeHtml(item)}</span>
        </li>`
    )
    .join("");
}

function renderEvaluationCriteria(gridEl, criteria) {
  gridEl.innerHTML = criteria
    .map((criterion, i) => {
      const accent = HIW_ACCENTS[i % HIW_ACCENTS.length];
      return `
        <li class="hiw-evaluation-card hiw-evaluation-card-${accent}">
          <span class="hiw-evaluation-number" aria-hidden="true">${i + 1}</span>
          <h3>${escapeHtml(criterion.name || "")}</h3>
          <p>${escapeHtml(criterion.description || "")}</p>
        </li>`;
    })
    .join("");
}

// Builds every .sdg-card <li> from the fetched `sdgs` list. Example is an
// OPTIONAL field (per the brief, not every SDG has an illustrative
// example) — the detail view's example block only renders at all when one
// is present. Icon/accent both come from HIW_ACCENTS cycling by rendered
// position, same convention as every other card grid on this site, and are
// deliberately plain colored numerals/shapes — NOT the UN's actual SDG
// icon set or official per-goal color coding, which is a UN-owned asset
// with usage restrictions (same reasoning already applied to other
// real-world assets on this site).
function renderSdgGrid(gridEl, sdgs) {
  gridEl.innerHTML = sdgs
    .map((sdg, i) => {
      const accent = HIW_ACCENTS[i % HIW_ACCENTS.length];
      const descriptionHtml =
        typeof marked !== "undefined" ? marked.parse(escapeHtml(sdg.description || "")) : `<p>${escapeHtml(sdg.description || "")}</p>`;
      const hasExample = sdg.example && String(sdg.example).trim();
      const exampleHtml = hasExample
        ? `<div class="sdg-card-detail-example">${
            typeof marked !== "undefined" ? marked.parse(escapeHtml(sdg.example)) : `<p>${escapeHtml(sdg.example)}</p>`
          }</div>`
        : "";
      return `
        <li class="sdg-tile sdg-tile-${accent}">
          <article class="sdg-card" tabindex="0" role="button" aria-haspopup="dialog">
            <button class="sdg-card-close" type="button" aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <span class="sdg-card-number" aria-hidden="true">${escapeHtml(String(sdg.number || i + 1))}</span>
            <h3 class="sdg-card-name">${escapeHtml(sdg.name || "")}</h3>
            <div class="sdg-card-detail">
              <div class="sdg-card-detail-description">${descriptionHtml}</div>
              ${exampleHtml}
            </div>
          </article>
        </li>`;
    })
    .join("");
}

function renderResourceLinks(gridEl, links) {
  gridEl.innerHTML = links
    .map((link, i) => {
      const accent = HIW_ACCENTS[i % HIW_ACCENTS.length];
      const url = (link.url || "").trim();
      const label = escapeHtml(link.label || "");
      const body = url
        ? `<a class="hiw-resource-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`
        : `<p class="hiw-resource-tbd">[Link TBD — site owner to add from official Hult Prize campus director resources]</p>`;
      return `
        <li class="hiw-resource-card hiw-resource-card-${accent}">
          <h3>${label}</h3>
          ${body}
        </li>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// How It Works page: Flip-driven click-to-expand for the SDG grid (Stage
// 2h) — reuses the exact Flip technique already built for the Event
// Timeline's detail modal (initEventDetailModal) rather than inventing a
// third expand mechanism, per the brief. Structurally identical: the
// clicked .sdg-card is reparented to a direct child of <body> (so
// .is-modal-open's position: fixed centers on the viewport rather than an
// ancestor a scroll-reveal may have left transformed — same reasoning as
// initEventDetailModal/initGalleryLightbox), Flip.from morphs it from its
// grid position/size into the centered dialog, and a focus trap +
// Escape/backdrop-click closing round it out.
// ---------------------------------------------------------------------------
function initSdgModal() {
  const cards = document.querySelectorAll(".sdg-card");
  const overlay = document.getElementById("sdg-modal-overlay");
  if (!cards.length || !overlay) return;

  const canFlip = !prefersReducedMotion && typeof gsap !== "undefined" && typeof Flip !== "undefined";
  if (canFlip) gsap.registerPlugin(Flip);

  let activeCard = null;
  let cardOriginalParent = null;
  let cardOriginalNextSibling = null;
  let scrollLockPaddingRight = "";

  function lockBodyScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    scrollLockPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + "px";
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll() {
    document.body.style.overflow = "";
    document.body.style.paddingRight = scrollLockPaddingRight;
  }

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

    const tile = card.closest(".sdg-tile");
    const accent = tile ? getComputedStyle(tile).getPropertyValue("--card-accent") : "";
    if (accent) card.style.setProperty("--card-accent", accent.trim());

    const state = canFlip ? Flip.getState(card, { props: "borderRadius" }) : null;
    const detail = card.querySelector(".sdg-card-detail");

    cardOriginalParent = card.parentElement;
    cardOriginalNextSibling = card.nextElementSibling;
    document.body.appendChild(card);

    card.classList.add("is-modal-open");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    const titleEl = card.querySelector(".sdg-card-name");
    if (titleEl) card.setAttribute("aria-labelledby", titleEl.id);
    card.setAttribute("tabindex", "-1");

    overlay.hidden = false;
    lockBodyScroll();

    if (canFlip) {
      if (detail) gsap.set(detail, { opacity: 0, y: 10 });
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
      card.style.transition = "none";
      Flip.from(state, {
        duration: 0.5,
        ease: "power2.inOut",
        absolute: true,
        onComplete: () => {
          if (detail) gsap.to(detail, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
        },
      });
    }

    const closeBtn = card.querySelector(".sdg-card-close");
    if (closeBtn) closeBtn.focus();
    document.addEventListener("keydown", onKeydown, true);
  }

  function closeCard() {
    const card = activeCard;
    if (!card) return;
    activeCard = null;

    const state = canFlip ? Flip.getState(card, { props: "borderRadius" }) : null;

    card.classList.remove("is-modal-open");
    card.setAttribute("role", "button");
    card.removeAttribute("aria-modal");
    card.setAttribute("tabindex", "0");

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
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.25,
        ease: "power1.in",
        onComplete: () => {
          overlay.hidden = true;
        },
      });
      Flip.from(state, {
        duration: 0.45,
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
    const titleEl = card.querySelector(".sdg-card-name");
    if (titleEl && !titleEl.id) titleEl.id = `sdg-card-title-${i}`;

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

    const closeBtn = card.querySelector(".sdg-card-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeCard();
      });
    }
  });
}

// Scroll-revealed stagger for the Evaluation Criteria cards and SDG tiles
// (Stage 2h) — same ScrollTrigger.batch approach as
// initAboutReveal/initGalleryReveal/initInvolvedReveal, run as two
// independent batches since a visitor can scroll to either section
// separately. This is the tiles' initial appearance only — the SDG click-
// to-expand itself is handled entirely by initSdgModal above.
function initHowItWorksReveal() {
  const evalCards = document.querySelectorAll(".hiw-evaluation-card");
  const sdgTiles = document.querySelectorAll(".sdg-tile");
  if (!evalCards.length && !sdgTiles.length) return;

  if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (evalCards.length) {
    gsap.set(evalCards, { opacity: 0, y: 28 });
    ScrollTrigger.batch(evalCards, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }),
    });
  }

  if (sdgTiles.length) {
    gsap.set(sdgTiles, { opacity: 0, y: 24 });
    ScrollTrigger.batch(sdgTiles, {
      start: "top 92%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "power2.out" }),
    });
  }
}

// ---------------------------------------------------------------------------
// How It Works page data (Stage 2h, Admin CMS extension) — fetches
// content/how-it-works.json (the single document the /admin CMS's How It
// Works collection edits) and renders the Intro/Stages/Eligibility/
// Evaluation Criteria/SDGs/Resource Links sections from it. Every list on
// this page starts EMPTY in how-it-works.html and is fully rendered here,
// same pattern as every other CMS list on this site (Gallery/Team/Blog/
// Timeline/Pitch Videos/About Values/Home Top Teams) — showing a
// load-error message on failure rather than stale or partial content.
// initStageJourney/initHowItWorksReveal/initSdgModal are all deferred until
// after this fetch resolves, so none of them can ever run against an
// empty/mid-render section.
// ---------------------------------------------------------------------------
function initHowItWorksContent() {
  const introBodyEl = document.querySelector(".hiw-intro-body");
  const stagesListEl = document.getElementById("hiw-stages-list");
  const eligibilityListEl = document.getElementById("hiw-eligibility-list");
  const evaluationGridEl = document.getElementById("hiw-evaluation-grid");
  const sdgGridEl = document.getElementById("hiw-sdg-grid");
  const resourcesGridEl = document.getElementById("hiw-resources-grid");
  if (!stagesListEl) return; // not the How It Works page

  const renderMarkdown = (text) =>
    typeof marked !== "undefined" ? marked.parse(escapeHtml(text || "")) : `<p>${escapeHtml(text || "")}</p>`;

  fetch("content/how-it-works.json")
    .then((response) => {
      if (!response.ok) throw new Error(`content/how-it-works.json responded ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const stages = Array.isArray(data.stages) ? data.stages : [];
      const eligibility = Array.isArray(data.eligibility) ? data.eligibility : [];
      const evaluationCriteria = Array.isArray(data.evaluationCriteria) ? data.evaluationCriteria : [];
      const sdgs = Array.isArray(data.sdgs) ? data.sdgs : [];
      const resourceLinks = Array.isArray(data.resourceLinks) ? data.resourceLinks : [];
      if (!stages.length || !sdgs.length) {
        throw new Error("content/how-it-works.json is missing stages or sdgs");
      }

      if (introBodyEl) introBodyEl.innerHTML = renderMarkdown(data.introText);
      renderStages(stagesListEl, stages);
      if (eligibilityListEl) renderEligibility(eligibilityListEl, eligibility);
      if (evaluationGridEl) renderEvaluationCriteria(evaluationGridEl, evaluationCriteria);
      if (sdgGridEl) renderSdgGrid(sdgGridEl, sdgs);
      if (resourcesGridEl) renderResourceLinks(resourcesGridEl, resourceLinks);

      initStageJourney();
      initHowItWorksReveal();
      initSdgModal();
    })
    .catch((err) => {
      console.error("How It Works content failed to load:", err);
      if (stagesListEl) {
        stagesListEl.innerHTML =
          '<p class="hiw-load-error">Something went wrong loading this page\'s content. Please refresh, or reach out directly at ' +
          '<a class="text-link" href="mailto:hultprize.ucdavis@example.com">hultprize.ucdavis@example.com</a>.</p>';
      }
    });
}

// ---------------------------------------------------------------------------
// Site-wide Search (Stage 11a) — nav trigger, keyboard shortcuts (`/` and
// Cmd/Ctrl+K), and the fuzzy-search overlay itself. Runs on every page: the
// trigger button and overlay markup are both built here in JS (not
// hardcoded per page), the same way initCustomCursor builds its cursor
// elements, rather than duplicating the same markup block across all 9
// HTML files. If the Fuse.js CDN failed to load, this bails out entirely
// before creating anything — no half-working search button left behind,
// same progressive-enhancement contract as everywhere else on the site.
//
// Fuse.js itself is only used for the actual fuzzy string matching; the
// overlay's open/close, keyboard nav, and focus handling are all plain JS
// so none of that depends on the library being present once loaded (it
// either loaded, in which case everything works, or it didn't, in which
// case nothing here runs at all).
// ---------------------------------------------------------------------------
function initSiteSearch() {
  if (typeof Fuse === "undefined") return;

  const headerInner = document.querySelector(".site-header .header-inner");
  if (!headerInner) return;

  const fuse = new Fuse(SEARCH_INDEX, {
    keys: [
      { name: "title", weight: 0.6 },
      { name: "subtitle", weight: 0.3 },
      { name: "meta", weight: 0.1 },
    ],
    threshold: 0.36,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });

  const GROUPS = [
    { type: "blog", label: "Blog" },
    { type: "faq", label: "FAQ" },
    { type: "team", label: "Team" },
  ];

  // --- Build the trigger button (inserted right after the primary nav) ---
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "search-trigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-controls", "site-search-overlay");
  trigger.setAttribute("aria-label", "Search the site");
  trigger.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16.3" y1="16.3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '<span class="search-trigger-hint" aria-hidden="true">Search</span>';
  // Inserted right after the wordmark (before nav), not after nav: on a
  // narrow viewport the nav's own link row already has no collapse/wrap
  // behavior and can overflow past the right edge on its own (a
  // pre-existing layout gap, not something this feature introduces) — a
  // trigger placed after nav would be pushed off-screen along with it.
  // Placed here instead, it stays reachable regardless. See the paired
  // `.header-inner nav { margin-left: auto }` in css/styles.css, which
  // keeps nav hugging the right edge the same way `justify-content:
  // space-between` did before this became a 3-item flex row instead of 2.
  const wordmark = headerInner.querySelector(".wordmark");
  if (wordmark) wordmark.insertAdjacentElement("afterend", trigger);
  else headerInner.appendChild(trigger);

  // --- Build the overlay (appended to <body>, one per page) ---
  const overlay = document.createElement("div");
  overlay.className = "search-overlay";
  overlay.id = "site-search-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="search-overlay-backdrop"></div>
    <div class="search-panel" role="dialog" aria-modal="true" aria-label="Search the site">
      <div class="search-input-row">
        <svg class="search-input-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16.3" y1="16.3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input
          type="text"
          class="search-input"
          id="site-search-input"
          role="combobox"
          aria-expanded="false"
          aria-controls="site-search-listbox"
          aria-autocomplete="list"
          autocomplete="off"
          spellcheck="false"
          placeholder="Search blog posts, FAQ, team…"
        >
        <button type="button" class="search-close-btn" aria-label="Close search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="search-results" id="site-search-listbox" role="listbox" aria-label="Search results"></div>
      <p class="search-hint">
        <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span>
        <span><kbd>Enter</kbd> select</span>
        <span><kbd>Esc</kbd> close</span>
      </p>
    </div>
  `;
  document.body.appendChild(overlay);

  const backdropEl = overlay.querySelector(".search-overlay-backdrop");
  const panelEl = overlay.querySelector(".search-panel");
  const inputEl = overlay.querySelector(".search-input");
  const closeBtn = overlay.querySelector(".search-close-btn");
  const resultsEl = overlay.querySelector(".search-results");

  let isOpen = false;
  let activeIndex = -1;
  let flatResults = [];
  let debounceTimer = null;
  let scrollLockPaddingRight = "";

  // Same scrollbar-compensated body-scroll lock as the Timeline event
  // modal and Gallery lightbox (js/script.js) — kept as its own local
  // copy here rather than a shared helper, consistent with how each of
  // those already duplicates it rather than introducing a new shared
  // utility for three call sites.
  function lockBodyScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    scrollLockPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + "px";
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll() {
    document.body.style.overflow = "";
    document.body.style.paddingRight = scrollLockPaddingRight;
  }

  function updateActiveDescendant() {
    const optionEls = resultsEl.querySelectorAll(".search-result");
    optionEls.forEach((el, i) => {
      const isActive = i === activeIndex;
      el.classList.toggle("is-active", isActive);
      el.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    const activeEl = optionEls[activeIndex];
    if (activeEl) {
      inputEl.setAttribute("aria-activedescendant", activeEl.id);
      // "auto" would inherit this site's global `html { scroll-behavior:
      // smooth }` (css/styles.css) rather than mean instant — explicit
      // "instant" is what actually bypasses it, same fix as
      // highlightSearchTarget below.
      activeEl.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion ? "instant" : "smooth" });
    } else {
      inputEl.removeAttribute("aria-activedescendant");
    }
  }

  function moveActive(delta) {
    if (!flatResults.length) return;
    activeIndex = (activeIndex + delta + flatResults.length) % flatResults.length;
    updateActiveDescendant();
  }

  // Renders items already grouped Blog -> FAQ -> Team (fixed order,
  // regardless of Fuse's own score-ranked order) and rebuilds flatResults
  // in that same rendered order, so keyboard-nav indices always line up
  // with what's actually on screen.
  function renderResults(items) {
    const query = inputEl.value.trim();
    flatResults = [];
    activeIndex = -1;
    inputEl.removeAttribute("aria-activedescendant");

    if (!query) {
      inputEl.setAttribute("aria-expanded", "false");
      resultsEl.innerHTML = '<p class="search-empty-state">Start typing to search blog posts, FAQ, and team bios.</p>';
      return;
    }

    if (!items.length) {
      inputEl.setAttribute("aria-expanded", "false");
      resultsEl.innerHTML = `<p class="search-empty-state">No results found for &ldquo;${escapeHtml(query)}&rdquo;.</p>`;
      return;
    }

    inputEl.setAttribute("aria-expanded", "true");

    let html = "";
    GROUPS.forEach((group) => {
      const groupItems = items.filter((item) => item.type === group.type);
      if (!groupItems.length) return;
      const labelId = `search-group-${group.type}-label`;
      html += `<div class="search-group" role="group" aria-labelledby="${labelId}">`;
      html += `<p class="search-group-label" id="${labelId}">${group.label}</p>`;
      groupItems.forEach((item) => {
        const i = flatResults.length;
        flatResults.push(item);
        html += `<a href="${escapeHtml(item.url)}" class="search-result search-result-${item.accent}" role="option" id="search-result-${i}" data-index="${i}" aria-selected="false" tabindex="-1">
          <span class="search-result-title">${escapeHtml(item.title)}</span>
          <span class="search-result-subtitle">${escapeHtml(item.subtitle)}</span>
          ${item.meta ? `<span class="search-result-meta">${escapeHtml(item.meta)}</span>` : ""}
        </a>`;
      });
      html += `</div>`;
    });
    resultsEl.innerHTML = html;

    // Staggered fade-in for the freshly rendered options — purely
    // decorative; skipped under reduced motion, where the results (already
    // written above regardless) are just present immediately with nothing
    // animating in.
    if (!prefersReducedMotion && typeof gsap !== "undefined") {
      const optionEls = resultsEl.querySelectorAll(".search-result, .search-group-label");
      gsap.fromTo(optionEls, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.02, ease: "power1.out" });
    }
  }

  // Fuse's constructor `threshold` gates whether each individual field
  // fuzzy-matches at all, but with multiple weighted keys the combined
  // `score` it reports for an included result can land well above that
  // same number (a short, incidental fuzzy hit in one low-weight field is
  // enough to include an item, even if its other fields don't match at
  // all) — observed in testing: a typo like "juding" correctly surfaces
  // "How does judging work?" around a 0.53 score, but also drags in
  // unrelated posts scoring 0.90+ on the strength of one loosely-matched
  // word. SCORE_CUTOFF re-filters on that final combined score (Fuse's
  // own `threshold` doesn't), trimming that long noisy tail while keeping
  // every genuine typo match seen in testing (worst case ~0.75, e.g.
  // "nashunals" -> "Two Teams Advance to Nationals").
  const SCORE_CUTOFF = 0.8;

  function runSearch() {
    const query = inputEl.value.trim();
    if (!query) {
      renderResults([]);
      return;
    }
    const matches = fuse
      .search(query, { limit: 30 })
      .filter((r) => r.score <= SCORE_CUTOFF)
      .map((r) => r.item);
    renderResults(matches);
  }

  function selectResult(item) {
    const [targetPage, targetHash] = item.url.split("#");
    const currentPage = location.pathname.split("/").pop() || "index.html";
    closeOverlay();
    if (targetPage === currentPage) {
      // Already on the destination page: no navigation needed (and a
      // location.href round-trip to the same document wouldn't re-run
      // this script anyway) — just update the URL for a shareable link
      // and run the exact same highlight/expand logic a fresh load of
      // that link would run.
      history.pushState(null, "", "#" + targetHash);
      highlightSearchTarget(targetHash);
    } else {
      window.location.href = item.url;
    }
  }

  function openOverlay() {
    if (isOpen) return;
    isOpen = true;
    overlay.hidden = false;
    lockBodyScroll();
    inputEl.value = "";
    renderResults([]);

    if (!prefersReducedMotion && typeof gsap !== "undefined") {
      gsap.set(panelEl, { opacity: 0, scale: 0.94 });
      gsap.set(backdropEl, { opacity: 0 });
      gsap.to(backdropEl, { opacity: 1, duration: 0.2, ease: "power1.out" });
      gsap.to(panelEl, { opacity: 1, scale: 1, duration: 0.28, ease: "power2.out" });
    }

    // Plain synchronous focus — no reason to defer this behind a
    // requestAnimationFrame (removing `hidden` doesn't need a paint to
    // happen first for focus() to work), and rAF callbacks specifically
    // can end up throttled/starved in some environments (a backgrounded
    // tab), which would needlessly delay something that has no actual
    // dependency on it.
    inputEl.focus();
  }

  function closeOverlay() {
    if (!isOpen) return;
    isOpen = false;

    function finish() {
      overlay.hidden = true;
      unlockBodyScroll();
      trigger.focus();
    }

    if (!prefersReducedMotion && typeof gsap !== "undefined") {
      gsap.to(panelEl, { opacity: 0, scale: 0.96, duration: 0.16, ease: "power1.in" });
      gsap.to(backdropEl, { opacity: 0, duration: 0.16, ease: "power1.in", onComplete: finish });
    } else {
      finish();
    }
  }

  trigger.addEventListener("click", openOverlay);
  closeBtn.addEventListener("click", closeOverlay);
  backdropEl.addEventListener("click", closeOverlay);

  inputEl.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(runSearch, 150);
  });

  // aria-activedescendant combobox pattern: DOM focus never leaves the
  // input while the overlay is open — arrow keys move a virtual selection
  // (tracked via aria-activedescendant + the .is-active class) instead of
  // real focus, so typing keeps working the instant a result is
  // highlighted. Result links themselves carry tabindex="-1" (CSS/markup
  // above) for the same reason: Tab only ever needs to move between the
  // input and the close button.
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeOverlay();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === "Enter") {
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        e.preventDefault();
        selectResult(flatResults[activeIndex]);
      }
      return;
    }
    if (e.key === "Tab") {
      // Only two real focus stops while open: the input and the close
      // button — trap Tab/Shift+Tab between them.
      if (e.shiftKey) {
        if (document.activeElement === inputEl) {
          e.preventDefault();
          closeBtn.focus();
        }
      } else if (document.activeElement === closeBtn) {
        e.preventDefault();
        inputEl.focus();
      }
    }
  });

  resultsEl.addEventListener("click", (e) => {
    const link = e.target.closest(".search-result");
    if (!link) return;
    e.preventDefault();
    const item = flatResults[Number(link.dataset.index)];
    if (item) selectResult(item);
  });

  function isTypingTarget(el) {
    if (!el) return false;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
  }

  // Global shortcuts: `/` (only when not already typing somewhere else on
  // the page — the newsletter email field, say) and Cmd/Ctrl+K (always,
  // the more deliberate chord doesn't need that guard).
  document.addEventListener("keydown", (e) => {
    if (isOpen) return; // overlay's own handler above owns keys while open
    const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
    if (isModK) {
      e.preventDefault();
      openOverlay();
      return;
    }
    if (e.key === "/" && !isTypingTarget(e.target)) {
      e.preventDefault();
      openOverlay();
    }
  });
}

// ---------------------------------------------------------------------------
// Site-wide Search (Stage 11a) — landing on a search result. Shared by
// initSearchResultHighlight (a fresh page load with a #hash already in the
// URL) and initSiteSearch's selectResult (choosing a result for the page
// you're already on, which never navigates/reloads) so both paths land the
// visitor on the matched item the same way: scrolled into view, briefly
// highlighted, and — for an FAQ match specifically — with its accordion
// already open rather than just a highlighted collapsed question.
// ---------------------------------------------------------------------------
function highlightSearchTarget(id) {
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;

  let highlightEl = target;
  if (target.classList.contains("faq-question")) {
    if (target.getAttribute("aria-expanded") !== "true") target.click();
    highlightEl = target.closest(".faq-item") || target;
  }

  // "auto" would inherit this site's global `html { scroll-behavior:
  // smooth }` (css/styles.css) rather than mean instant — explicit
  // "instant" is what actually bypasses it.
  highlightEl.scrollIntoView({ behavior: prefersReducedMotion ? "instant" : "smooth", block: "center" });
  highlightEl.classList.add("search-target-highlight");
  window.setTimeout(() => highlightEl.classList.remove("search-target-highlight"), 2200);
}

// Runs once per page load; a no-op unless the URL already carries a
// #hash (i.e. arriving via a search result, or any other deep link into
// a blog post/FAQ item/team bio). Placed last in the init call list below
// so every page-specific accordion/listener it might need to trigger
// (initFaqAccordion, specifically) is already wired up first.
function initSearchResultHighlight() {
  if (!location.hash) return;
  highlightSearchTarget(location.hash.slice(1));
}

initHomeLogoReset();
initSiteSettings();
initScrollReveal();
initTeamContent();
initPitchVideoContent();
initTimelineContent();
initBlogEntrance();
initBlogContent();
initNewsletterReveal();
initNewsletterSignup();
initBlogPostContent();
initGalleryEntrance();
initGalleryContent();
initAboutEntrance();
initAboutContent();
initFaqEntrance();
initFaqContent();
initInvolvedEntrance();
initInvolvedReveal();
initHowItWorksEntrance();
initHowItWorksContent();
initMagneticButtons();
initCustomCursor();
// Stage 2g: initImpactCounters/initPinSequence/initTopTeamsAnimation/
// initStoryEntranceFade used to be called unconditionally right here —
// they now run from inside initHomeContent's fetch (in this exact relative
// order, for the same reason: both pin sequences must run before
// initStoryEntranceFade measures #story's position, which is only correct
// once their ScrollTrigger spacers already exist above it on the page),
// so none of them can ever run against stale data-attributes or an
// empty/mid-render Top Teams podium.
initHomeContent();
initSiteSearch();
// Last: may click a .faq-question button to expand it (if the incoming
// #hash is a search result on this same page), which needs
// initFaqAccordion's click listener already attached above.
initSearchResultHighlight();
