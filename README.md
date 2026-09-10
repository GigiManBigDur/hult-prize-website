# Hult Prize Website

Static site for Hult Prize @ UC Davis, plus a small GitHub OAuth proxy (`api/`) for the `/admin` Decap CMS pilot.

## Overview

- Hand-written HTML pages at the repo root, sharing `css/styles.css` and `js/script.js`.
- Page copy lives as JSON in `content/*.json` and is rendered client-side by `js/script.js`.
- `/admin` is a Decap CMS interface (`admin/config.yml`) for editing that content; changes commit to `main` and redeploy.
- Deployed on Vercel. No build step — `package.json` has no dependencies or scripts.

## Working with this repo

- Work happens on `main` unless a feature branch is called for.
- Commit early and often with clear, descriptive messages so we always have a safe point to revert to.
- Push to GitHub after each meaningful commit to keep the remote in sync.
