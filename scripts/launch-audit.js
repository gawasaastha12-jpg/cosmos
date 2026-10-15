// Drop-in replacement for the audit step in build-public.js.
//   const { runLaunchAudit } = require('./launch-audit');  runLaunchAudit(distDir, policy);
const fs = require('fs'), path = require('path');

const FORBIDDEN = ['users.json', 'api.js', 'serve.js', 'login.html', '/api/auth'];
const SECRETS = ['service_role', 'SUPABASE_SERVICE', 'your-domain.org', 'cosmic-ar-explorer.app', 'localhost:8000', '127.0.0.1'];
const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.json', '.css', '.csv', '.txt', '.svg', '.xml', '.webmanifest']);
const EXCLUDED_TRADS = ['poly', 'ind', 'amer'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

function runLaunchAudit(distDir, policy = {}) {
  const errors = [];
  for (const file of walk(distDir)) {
    const rel = path.relative(distDir, file).replace(/\\/g, '/');
    for (const bad of FORBIDDEN) {
      if (rel.toLowerCase().includes(bad.toLowerCase())) {
        errors.push(`forbidden path: ${rel}`);
      }
    }
    if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
    const txt = fs.readFileSync(file, 'utf8');
    for (const bad of [...FORBIDDEN, ...SECRETS]) {
      if (txt.includes(bad)) {
        errors.push(`forbidden string "${bad}" in ${rel}`);
      }
    }

    if (policy.excludePendingCommunityReview && /\.(html|js)$/.test(file)) {
      // quiz/card/inline references to excluded traditions, e.g. trad:'poly' or data-trad="ind"
      const re = new RegExp(`(trad(ition)?|data-trad)\\s*[:=]\\s*['"](${EXCLUDED_TRADS.join('|')})['"]`, 'g');
      for (const m of txt.matchAll(re)) {
        errors.push(`excluded tradition reference ${m[0]} in ${rel}`);
      }
    }
  }

  if (policy.excludePendingCommunityReview) {
    const f = path.join(distDir, 'data', 'myth.public.json');
    if (!fs.existsSync(f)) {
      errors.push('missing data/myth.public.json');
    } else {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (j.traditions) {
        for (const tradKey of Object.keys(j.traditions)) {
          if (EXCLUDED_TRADS.includes(tradKey)) {
            errors.push(`excluded tradition block in public data: ${tradKey}`);
          }
        }
      }
      const stories = Array.isArray(j) ? j : (j.stories || (j.traditions ? Object.values(j.traditions).flatMap(t => t.stories || []) : []));
      for (const s of stories) {
        if (EXCLUDED_TRADS.includes(s.trad || s.tradition)) {
          errors.push(`excluded story in public data: ${s.id}`);
        }
      }
      const expectedCount = policy.expectedPublicCount || 109;
      if (stories.length !== expectedCount) {
        errors.push(`public story count ${stories.length} != expected ${expectedCount}`);
      }
    }
  }

  if (errors.length) {
    console.error('LAUNCH AUDIT FAILED:\n - ' + errors.join('\n - '));
    process.exit(1);
  }
  console.log('Launch audit passed.');
}

module.exports = { runLaunchAudit };
