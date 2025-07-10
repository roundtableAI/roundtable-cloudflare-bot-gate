# Roundtable × Cloudflare Pages — Bot‑Gate Drop‑In (Beta)

Adds Roundtable’s behavioral‑biometric **auto‑block** gate to any existing Cloudflare Pages project. The block‑list lives in Cloudflare KV, so a hot lookup adds only ~1 ms of latency.

---

### 1 · Embed the Roundtable tracker

```html
<script
  src="https://cdn.roundtable.ai/v1/rt.js"
  data-site-key="YOUR_SITE_KEY"
  data-auto-block="true"   <!-- **required** so the gate can call /rt-block -->
  data-user-id="OPTIONAL_USER_ID">
</script>
```
Get `YOUR_SITE_KEY` at <https://accounts.roundtable.ai/account/keys>. The full tracker docs are available at <https://docs.roundtable.ai>.

### 2 · Install & initialise

```bash
# Add dev dependency
npm i -D roundtable-cloudflare-bot-gate

# Scaffold functions and config
npx roundtable-cloudflare-bot-gate init
```
`init` does three things:
1. Adds `functions/_middleware.js` and `functions/rt-block.js`.
2. Patches `wrangler.jsonc` (or `.toml`) to insert a `RT_BLOCKED` KV binding with blank `id` / `preview_id`.
3. Generates a 64‑char `RT_WEBHOOK_TOKEN` and prints it.


### 3 · Create the KV namespaces

Run once, copy the IDs Wrangler prints, and paste them into your config:

```bash
wrangler kv:namespace create RT_BLOCKED            # production ID
wrangler kv:namespace create RT_BLOCKED --preview  # preview ID for wrangler pages dev
```
After pasting, your config should look like:

```jsonc
"kv_namespaces": [
  {
    "binding": "RT_BLOCKED",
    "id": "abcd1234...",        // prod
    "preview_id": "wxyz5678..."  // dev/preview
  }
]
```

### 4 · Email your token + webhook URL (beta step)

Send the token printed in step 2 and your webhook endpoint to <support@roundtable.ai> so we can enable blocking for your site.

```
Endpoint:  https://<your‑domain>/rt-block
Token:     <RT_WEBHOOK_TOKEN>
```

### 5 · Deploy

```bash
wrangler pages deploy
```
Roundtable will now write `sid:<id>` into `RT_BLOCKED` when it detects fraud; the middleware returns 403 on the very next request.

---

### Need help?

Email <support@roundtable.ai> or open an issue.