// api/callback.js — Decap CMS "self-hosted OAuth provider," step 2 of 2.
//
// GitHub redirects here (see the callback URL registered on the GitHub
// OAuth App) with a one-time `code` and the `state` api/auth.js handed
// it. This step exchanges that code server-side for a real access token
// — the only step that touches OAUTH_CLIENT_SECRET, which never reaches
// the browser at any point — then hands the token back to the Decap CMS
// admin UI (running in the window that opened this popup) via the exact
// postMessage handshake Decap/Netlify CMS's `github` backend expects:
//
//   1. This popup, once loaded, pings the opener with "authorizing:github".
//   2. The opener's listener (inside decap-cms-backend-github's own
//      authenticate()) echoes that same message straight back — this is
//      how the popup confirms the opener's listener is actually attached
//      before it sends anything sensitive.
//   3. Only on receiving that echo does this popup send the real
//      "authorization:github:success:{...token...}" (or ":error:...")
//      payload and let decap-cms-backend-github pick it up.
//
// This is the same protocol every self-hosted Decap/Netlify CMS OAuth
// provider implements (netlify-cms-github-oauth-provider and its various
// serverless ports included) — written fresh here, dependency-free, to
// match it exactly rather than vendoring a third-party package into a
// repo that otherwise has zero build tooling.
//
// Required Vercel environment variables (Project Settings -> Environment
// Variables — never committed to this repo):
//   OAUTH_CLIENT_ID     — the GitHub OAuth App's Client ID
//   OAUTH_CLIENT_SECRET — the GitHub OAuth App's Client Secret
//
// Written against plain Node.js http primitives, not Vercel-specific
// req.query/req.cookies/res.status() helpers — see api/auth.js.

module.exports = async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieState = parseCookies(req.headers.cookie).decap_oauth_state;

  // Clear the state cookie on every response from here on — it's single-use
  // regardless of whether this attempt succeeds.
  res.setHeader("Set-Cookie", "decap_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");

  if (!code || !state || !cookieState || state !== cookieState) {
    sendResult(res, 400, "error", { message: "Invalid or missing OAuth state. Please close this window and try logging in again." });
    return;
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    sendResult(res, 500, "error", { message: "Server misconfigured: OAUTH_CLIENT_ID/OAUTH_CLIENT_SECRET are not set in this deployment's environment variables." });
    return;
  }

  let token;
  let errorMessage;
  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await tokenResponse.json();
    token = data.access_token;
    errorMessage = data.error_description || data.error;
  } catch (e) {
    errorMessage = e && e.message;
  }

  if (!token) {
    sendResult(res, 400, "error", { message: errorMessage || "GitHub did not return an access token." });
    return;
  }

  sendResult(res, 200, "success", { token, provider: "github" });
};

function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((part) => {
    const eq = part.indexOf("=");
    if (eq === -1) return;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function sendResult(res, statusCode, status, payload) {
  // JSON.stringify'd once, then embedded as a JS string literal in the
  // response HTML below — `</script>` defensively broken up in case a
  // future payload value ever contained it (today's token/message values
  // never would, but costs nothing to guard).
  const messageString = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const messageLiteral = JSON.stringify(messageString).replace(/<\/script/gi, "<\\/script");

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Authorizing…</title></head>
<body>
<p>Completing sign-in — this window should close automatically.</p>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(${messageLiteral}, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;

  res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}
