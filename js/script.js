// Footer copyright year
document.getElementById("year").textContent = new Date().getFullYear();

// Shared feature/preference detection used by several effects below.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------------------------------------------------------------------------
// Hero illustration line-draw
// ---------------------------------------------------------------------------
// Sets stroke-dasharray/dashoffset from each path's real length, then
// transitions the offset to 0. Under reduced motion, skips straight to the
// fully-drawn state instead.
function initHeroLineDraw() {
  const paths = document.querySelectorAll(".hero-illustration .draw-path");

  paths.forEach((path, i) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);

    if (prefersReducedMotion) {
      path.style.strokeDashoffset = "0";
      return;
    }

    path.style.strokeDashoffset = String(length);
    path.style.transition = `stroke-dashoffset 1s ease ${(0.15 + i * 0.08).toFixed(2)}s`;

    // Double rAF so the browser paints the initial (fully hidden) offset
    // before the transition to 0 starts.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        path.style.strokeDashoffset = "0";
      });
    });

    // Safety net: if the page loaded in a background/inactive tab, paint can
    // be deferred long enough that the transition never visibly runs. Force
    // the drawn end-state after a few seconds so the illustration can never
    // get stuck invisible.
    setTimeout(() => {
      path.style.transition = "none";
      path.style.strokeDashoffset = "0";
    }, 3000);
  });
}

// ---------------------------------------------------------------------------
// Animated impact counters (count up once, when scrolled into view)
// ---------------------------------------------------------------------------
function initImpactCounters() {
  const counters = document.querySelectorAll(".counter");
  if (!counters.length) return;

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

  // Pause the loop while the tab is hidden.
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

initHeroLineDraw();
initImpactCounters();
initMagneticButtons();
initCustomCursor();
