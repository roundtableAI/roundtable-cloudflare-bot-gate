# Roundtable × Cloudflare Pages — Bot‑Gate Drop‑In (Beta)

This package adds Roundtable's auto‑block gate to any existing Cloudflare Pages project. The auto-block gate automatically blocks obvious (bad) bots before serving any content, while letting good bots and humans through. As Roundtable updates risk scores, the gate maintains a block list to instantly reject subsequent requests from confirmed bad actors. This block‑list lives in Cloudflare KV so lookups add only ~1 ms of latency, meaning real users never experience any additional friction or delays.

---

### 1. Embed the Roundtable tracker

Add the Roundtable tracker to index.html or pages you want to track. Note that you **must** set `data-auto-block="true"` to enable the auto-block gate.

```html
<script
  src="https://cdn.roundtable.ai/v1/rt.js"
  data-site-key="YOUR_SITE_KEY"
  data-auto-block="true"   <!-- **required** so the gate can call /rt-block -->
  data-user-id="OPTIONAL_USER_ID">
</script>
```
Get `YOUR_SITE_KEY` at <https://accounts.roundtable.ai/account/keys>. The full tracker docs are available at <https://docs.roundtable.ai>.

### 2. Install & initialize

```bash
# Add dev dependency
npm i -D roundtable-cloudflare-bot-gate

# Scaffold functions and generate token
npx roundtable-cloudflare-bot-gate init
```
`init` does two things:
1. Adds `functions/_middleware.js` and `functions/rt-block.js`.
2. Generates a 64‑char `RT_WEBHOOK_TOKEN` and prints it.

### 3. Store the secret in Cloudflare

```bash
echo <RT_WEBHOOK_TOKEN> | wrangler secret put RT_WEBHOOK_TOKEN
```

Use the token printed by `init`.

### 4. Create KV namespaces & add binding

Create the namespaces and copy the generated IDs:

```bash
wrangler kv namespace create RT_BLOCKED            # copy the production ID
wrangler kv namespace create RT_BLOCKED --preview  # copy the preview ID
```

Then add the binding to your Wrangler config:

**For `wrangler.jsonc`:**
```jsonc
{
  "kv_namespaces": [
    {
      "binding": "RT_BLOCKED",
      "id": "abcd1234...",        // paste production ID here
      "preview_id": "wxyz5678..."  // paste preview ID here
    }
  ]
}
```

**For `wrangler.toml`:**
```toml
[[kv_namespaces]]
binding = "RT_BLOCKED"
id = "abcd1234..."        # paste production ID here
preview_id = "wxyz5678..."  # paste preview ID here
```

### 5. Email your token + webhook URL (beta step)

Send the token printed in step 2 and your webhook endpoint to <support@roundtable.ai> so we can enable blocking for your site.

```
Endpoint:  https://<your‑domain>/rt-block
Token:     <RT_WEBHOOK_TOKEN>
```

### 6. Deploy

```bash
wrangler pages deploy
```
Roundtable will now write `sid:<id>` into `RT_BLOCKED` when it detects fraud; the middleware returns 403 on the very next request.

---

### Need help?

Email <support@roundtable.ai> or open an issue.