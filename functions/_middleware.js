// Roundtable bot-gate for Cloudflare Pages
// Mirrors Netlify rt-turnstile behaviour.

const DAY_SEC = 60 * 60 * 24;
// Paste your full GOOD_BOTS regex here
const GOOD_BOTS = /google(?:bot|other|-extended|favicon|storebot|apis?)|adsbot-google|mediapartners-google|bingbot|duckduckbot|(?:baidu|sogou)spider|yandex(?:bot)?|slurp|exabot|qwantify|seznambot|petalbot|facebot|facebookexternalhit|twitterbot|pinterest|linkedin(?:bot)?|telegrambot|slackbot|discordbot|whatsapp|skypeuripreview|embedly|gptbot|google-extended|bytespider|perplexitybot|anthropic-ai|claudebot|applebot|amazonbot|ia_archiver|ahrefsbot|semrushbot|mj12bot|dotbot|blexbot|pingdom|uptimerobot|statuscake|site24x7|newrelicpinger/i;

/* ---------- tiny helpers ---------- */
function parseCookies(header = '') {
  return Object.fromEntries((header || '').split(/;\s*/).filter(Boolean).map(c => c.split('=')));
}


function basicHeaderChecks(ua) {
  if (GOOD_BOTS.test(ua)) return true;          // allow known crawlers
  if (/HeadlessChrome|HeadlessFirefox/i.test(ua)) return false;
  if (/\b(bot|crawler|spider)\b/i.test(ua)) return false;
  return true;
}

/* ---------- Pages middleware ---------- */
export const onRequest = async (ctx) => {
  const { request, env, next } = ctx;

  // pass CORS pre-flights / HEAD probes
  if (request.method === 'OPTIONS' || request.method === 'HEAD') {
    return next();
  }

  const cookies = parseCookies(request.headers.get('cookie') || '');
  const sid       = cookies.rt_sid;
  const hasPass   = cookies.rt_pass !== undefined;

  /* 1 — instant block if SID is in KV */
  if (sid && await env.RT_BLOCKED.get(`sid:${sid}`) !== null) {
    return new Response(null, {
      status: 403,
      headers: { 'Set-Cookie': 'rt_pass=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax' }
    });
  }

  /* 2 — fast-pass */
  if (hasPass) return next();

  /* 3 — quick UA heuristic */
  const ua = request.headers.get('user-agent') || '';
  if (!basicHeaderChecks(ua)) return new Response(null, { status: 403 });

  /* 4 — passed → issue 24 h fast-pass */
  const res = await next();
  res.headers.append(
    'Set-Cookie',
    `rt_pass=1; Max-Age=${DAY_SEC}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );
  return res;
};