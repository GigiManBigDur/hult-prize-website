# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git & GitHub workflow

This project's history is the safety net — treat committing and pushing as part of doing the work, not an afterthought.

- Commit locally after each meaningful change, with a clean, descriptive commit message (what changed and why, not just "update").
- Push to `origin/main` right after committing — don't let local commits pile up unpushed. The GitHub remote should always reflect the latest saved state.
- Commit often enough that any change can be cleanly reverted without losing unrelated work.
- Remote: `origin` → https://github.com/GigiManBigDur/hult-prize-website (public).

## Architecture

Static site, no build step (`package.json` has no dependencies or scripts). Deployed on Vercel.

- **Pages**: hand-written `*.html` at the repo root, sharing `css/styles.css` and `js/script.js`.
- **Content**: page copy lives as JSON in `content/*.json`; `js/script.js` fetches and renders it into the pages (see functions like `initTimelineContent`, and `GALLERY_SIZES` for the gallery's auto-assigned bento shapes).
- **Admin CMS**: `/admin` runs Decap CMS (`admin/config.yml`) so exec board members edit the `content/*.json` files through a UI; edits commit straight back to `main` and redeploy.
- **`api/`**: `auth.js` + `callback.js` are a small GitHub OAuth proxy (Vercel functions) that authenticate the Decap CMS login flow.
