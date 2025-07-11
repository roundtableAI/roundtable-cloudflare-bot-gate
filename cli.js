#!/usr/bin/env node
// Roundtable × Cloudflare Bot‑Gate — CLI initialiser
// Usage:   npx roundtable-cloudflare-bot-gate init [--force]
// -----------------------------------------------------------
// • Copies the gate functions into the caller’s repo
// • Patches wrangler.jsonc (creates kv binding & secret key)
// • Generates a 64‑char RT_WEBHOOK_TOKEN and prints next steps
//
// Exits non‑zero if a conflicting _middleware.js exists and
// the user did not supply --force.
// -----------------------------------------------------------

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const [, , cmd, ...flags] = process.argv;
if (cmd !== 'init') {
  console.error('Usage: npx roundtable-cloudflare-bot-gate init [--force]');
  process.exit(1);
}

const FORCE = flags.includes('--force');
const CWD = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_FN_DIR = path.join(__dirname, 'functions');
const DEST_FN_DIR = path.join(CWD, 'functions');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/* ---------------------------------------------------------
 * 1 · Guard: prevent clobbering existing middleware
 * -------------------------------------------------------*/
const MW_DEST = path.join(DEST_FN_DIR, '_middleware.js');
if (await exists(MW_DEST) && !FORCE) {
  console.error(
    '⚠  functions/_middleware.js already exists.\n' +
    '   Run again with --force to overwrite or edit it manually.'
  );
  process.exit(1);
}

/* ---------------------------------------------------------
 * 2 · Copy gate function files
 * -------------------------------------------------------*/
async function copyFunctions() {
  await fs.mkdir(DEST_FN_DIR, { recursive: true });
  for (const file of ['_middleware.js', 'rt-block.js']) {
    const src = path.join(SRC_FN_DIR, file);
    const dest = path.join(DEST_FN_DIR, file);
    const already = await exists(dest);

    if (already && file === 'rt-block.js') {
      console.log(`✓  ${file} already present — skipped`);
      continue;
    }

    await fs.copyFile(src, dest);
    console.log(`${already ? '✔' : '➕'}  ${file} ${already ? 'overwritten' : 'added'}`);
  }
}

/* ---------------------------------------------------------
 * 3 · Patch wrangler.jsonc (JSON with comments)
 * -------------------------------------------------------*/
function stripComments(str) {
  return str.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
}

async function patchWrangler() {
  const wranglerPath = path.join(CWD, 'wrangler.jsonc');
  if (!(await exists(wranglerPath))) {
    console.warn('⚠  wrangler.jsonc not found — please add KV binding & secret manually.');
    return;
  }

  const raw = await fs.readFile(wranglerPath, 'utf8');
  const cfg = JSON.parse(stripComments(raw));

  // Ensure KV namespace binding
  cfg.kv_namespaces = cfg.kv_namespaces || [];
  if (!cfg.kv_namespaces.some(n => n.binding === 'RT_BLOCKED')) {
    cfg.kv_namespaces.push({ binding: 'RT_BLOCKED', id: '', preview_id: '' });
    console.log('➕  Added RT_BLOCKED KV binding');
  }

  await fs.writeFile(wranglerPath, JSON.stringify(cfg, null, 2));
  console.log('✔  wrangler.jsonc updated');
}

/* ---------------------------------------------------------
 * 4 · Generate webhook token & guide
 * -------------------------------------------------------*/
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function printNextSteps(token) {
  console.log(`\nGenerated RT_WEBHOOK_TOKEN:\n\n  ${token}\n`);
  console.log('Next steps:');
  console.log('  1. Store the secret:');
  console.log('     wrangler secret put RT_WEBHOOK_TOKEN');
  console.log('  2. Create KV namespaces if IDs are blank:');
  console.log('     wrangler kv:namespace create RT_BLOCKED');
  console.log('     wrangler kv:namespace create RT_BLOCKED --preview');
  console.log('  3. Deploy:');
  console.log('     wrangler pages deploy\n');
}

/* ---------------------------------------------------------
 * 5 · Run all steps
 * -------------------------------------------------------*/
(async () => {
  try {
    await copyFunctions();
    await patchWrangler();

    const token = generateToken();

    // Attempt to save secret automatically (will still prompt for confirmation)
    const wrangler = spawnSync(
      'wrangler',
      ['secret', 'put', 'RT_WEBHOOK_TOKEN'],
      { input: token + '\n', stdio: ['pipe', 'inherit', 'inherit'] }
    );
    if (wrangler.status !== 0) {
      console.warn('⚠  Could not set secret automatically. Paste it manually.');
    }

    printNextSteps(token);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();