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

**Also not Picsum photography:** `leadership/member-1.jpg` through
`member-6.jpg` (used on the Team/Leadership page, Stage 3a) are generated
graphics, not stock photos — a solid color card matching each entry's accent
plus a generic silhouette icon and a "PHOTO PLACEHOLDER / Real photo coming
soon" label baked directly into the image. A stock photo of an actual
stranger was deliberately avoided here: unlike the general-tone photography
above, these stand in for specific named/titled roster entries, so an
unlabeled real face would risk being mistaken for a real person rather than
just reading as generic placeholder texture.

## Replacing before launch

Swap in real event photography using the **same filenames and roughly the
same aspect ratios** listed below, and no code changes are needed:

- `story-photo.jpg` — 1200×1500 (portrait), used in the Our Story section.
- `cta-photo.jpg` — 1400×1000 (landscape), used as the Get Involved band's
  background.
- `leadership/member-1.jpg` … `member-6.jpg` — 600×600 (square), used on the
  Team/Leadership page for each exec board entry, in roster order (1 =
  Campus Director … 6 = Treasurer per team.html). Replace the bracketed
  "[Name Placeholder]" text and "Bio coming soon." copy in team.html at the
  same time as swapping in each photo.

Good real replacements: pitch presentations, teams collaborating, the
OnCampus competition, judges/audience, campus recruiting events.
