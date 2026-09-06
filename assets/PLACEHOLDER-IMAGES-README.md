# Placeholder images

Most images in this folder are **placeholders**, not real Hult Prize @ UC Davis
event photography. They were sourced from [Lorem Picsum](https://picsum.photos),
a free-to-use image service built on openly licensed photography, explicitly
intended for exactly this kind of development/placeholder use. None of them
depict Hult Prize or UC Davis — they were chosen for general photographic
tone (varied light, motion, texture) and are styled with a brand color
treatment in CSS to feel intentional rather than random. They are NOT sourced
from the Hult Prize Foundation's own website or promotional materials, which
are the Foundation's copyrighted photography.

**Exceptions — real photos, not placeholders:**
- `top-teams/*.jpg`: real event photos supplied by the site owner (the
  1st/2nd/3rd place reveal moments).
- `impact-photos/photo-1.jpg` … `photo-8.jpg`: real competition photos
  supplied by the site owner (pitches, judges, and the two winning-team
  trophy moments), replacing the original Picsum placeholders in this same
  gallery-order sequence. Resized to 1600px wide / ~82% JPEG quality to keep
  the gallery's page weight reasonable; native aspect ratio preserved per
  photo (they range roughly 3:2 to 16:9) — the gallery's own
  `object-fit: cover` already handles that variation without distortion in
  both the static grid and the pinned full-bleed backdrop, so no CSS
  changes were needed for this swap.
- `cta-photo.jpg`: a real event photo supplied by the site owner (the 2024
  Hult Prize Global Finals stage), behind the Get Involved band's "Ready to
  build something that matters?" heading. Resized to 1600px wide / ~82%
  JPEG quality; `.cta-photo`'s `object-fit: cover` already handles its
  native ~1.8:1 aspect ratio without distortion, so this was a pure content
  swap with no CSS changes. (Replaced the two-winners-on-stage photo that
  had briefly been here before this one.)

**Also not Picsum photography:** `leadership/member-1.jpg` through
`member-6.jpg` (used on the Team/Leadership page, Stage 3a) and
`pitch-videos/*-thumbnail.jpg` (used on the Pitch Videos page, Stage 4a) are
generated graphics, not stock photos — a solid color card matching each
entry's accent plus a "PLACEHOLDER" label baked directly into the image (a
silhouette icon for the leadership headshots, a play-triangle watermark for
the video thumbnails). A stock photo of an actual stranger was deliberately
avoided here: unlike the general-tone photography above, these stand in for
specific named/titled entries, so an unlabeled real face (or, for the
thumbnails, what could look like a real video preview frame) would risk
being mistaken for the real thing rather than reading as generic placeholder
texture.

**Pitch video thumbnails carry a stronger consent requirement than a name
alone.** Once real pitch videos exist, each one needs its own team's
explicit consent to publish — separate from, and a higher bar than, the
name-only consent that already covers listing a team on Top Teams. A video
reveals far more about a team's actual venture (pitch content, founders'
faces and voices, business details) than a name and a placement do. See the
comment in pitch-videos.html for the full note; not something to act on now
since the content there is still mock.

## Replacing before launch

Swap in real event photography using the **same filenames and roughly the
same aspect ratios** listed below, and no code changes are needed:

- `story-photo.jpg` — 1200×1500 (portrait), used in the Our Story section.
- `leadership/member-1.jpg` … `member-6.jpg` — 600×600 (square), used on the
  Team/Leadership page for each exec board entry, in roster order (1 =
  Campus Director … 6 = Treasurer per team.html). Replace the bracketed
  "[Name Placeholder]" text and "Bio coming soon." copy in team.html at the
  same time as swapping in each photo.
- `pitch-videos/dozey-thumbnail.jpg`, `sumeru-quantum-thumbnail.jpg`,
  `squellet-thumbnail.jpg` — 960×540 (16:9), the 3 real-placement cards on
  the Pitch Videos page. Swapping in a real thumbnail alone doesn't make the
  video playable — that also needs replacing the `<button>`'s placeholder
  behavior in pitch-videos.html/js/script.js (initPitchVideoPlaceholders)
  with an actual embed, at which point remember the consent requirement
  noted above.
- `pitch-videos/placeholder-4-thumbnail.jpg` … `placeholder-6-thumbnail.jpg`
  — 960×540 (16:9), the 3 generic slots on the same page. Replace the
  "[Team Placeholder]" copy in pitch-videos.html at the same time.

Good real replacements: pitch presentations, teams collaborating, the
OnCampus competition, judges/audience, campus recruiting events.
