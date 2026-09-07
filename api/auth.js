// api/auth.js — Decap CMS "self-hosted OAuth provider," step 1 of 2.
//
// Decap CMS's `github` backend (admin/config.yml) opens a popup pointed
// at `<base_url>/<auth_endpoint>` — configured there as this exact
// route, /api/auth — to start login. This handler just redirects that
// popup on to GitHub's own authorize screen; GitHub then redirects back
// to /api/callback (same folder) with a one-time authorization code.
// This is the same two-route protocol used by every other self-hosted
// Decap/Netlify CMS OAuth provider (e.g. netlify-cms-github-oauth-
// provider and its various serverless ports) — written fresh here,
// dependency-free, to match that documented protocol exactly rather
// than vendoring a third-party package into a repo that otherwise has
// zero build tooling.
//
// Required Vercel environment variables (Project Settings -> Environment
// Variables — never committed to this repo):
//   OAUTH_CLIENT_ID     — the GitHub OAuth App's Client ID
//   OAUTH_CLIENT_SECRET — the GitHub OAuth App's Client Secret (read by
//                         api/callback.js, not here, but both must be
//                         set together for login to work at all)
//
// The GitHub OAuth App itself (github.com -> Settings -> Developer
// settings -> OAuth Apps) must have its "Authorization callback URL"
// set to exactly this deployment's origin + /api/callback — e.g.
// https://YOUR-SITE-DOMAIN/api/callback. See the final report for the
// exact value for this project's actual domain.
//
// Written against plain Node.js http primitives (req.headers, req.url,
// res.writeHead/res.end) rather than any Vercel-specific req.query/
// req.cookies/res.status() convenience helpers, so it doesn't depend on
// exactly which of those this deployment's runtime happens to provide.

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server misconfigured: OAUTH_CLIENT_ID is not set in this deployment's environment variables.");
    return;
  }

  // Built from the incoming request rather than hardcoded, so this same
  // code works unchanged on the production domain, on Vercel preview
  // deployments, and after a custom domain is attached — whatever it
  // resolves to just has to match what's registered as the GitHub OAuth
  // App's callback URL for THAT deployment to log in successfully.
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/callback`;

  // Lightweight CSRF guard: a random value GitHub round-trips back
  // unchanged in api/callback.js, checked there against this same value
  // stored in a short-lived, httpOnly cookie (never exposed to page JS).
  const state = randomState();
  res.setHeader("Set-Cookie", `decap_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo,user",
    state,
  });

  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
};

function randomState() {
  // No external uuid/crypto-random dependency needed for a value that
  // only has to be unguessable for the ~10 minutes it's valid, not
  // cryptographically unique forever.
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
