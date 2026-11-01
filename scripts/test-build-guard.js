/**
 * test-build-guard.js
 * 
 * Verifies that the public build guard prevents regressions:
 * 1. Builds into a temporary directory with SITE_URL set.
 * 2. Asserts dist/ has exactly 7 traditions and 109 stories.
 * 3. Asserts no reference to the poly, ind, or amer traditions remains in index.html, audio.html, or data/*.json.
 * 4. Asserts that scripts/launch-audit.js passes.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_SITE_URL = process.env.SITE_URL || 'https://cosmos-one-opal.vercel.app';
const EXCLUDED_TRADS = ['poly', 'ind', 'amer'];
const POLICY_PATH = path.join(ROOT_DIR, 'data', 'policy.json');
const RAW_MYTH_PATH = path.join(ROOT_DIR, 'data', 'myth.json');

console.log('====================================================');
console.log('       COSMIC AR EXPLORER — BUILD GUARD TEST        ');
console.log('====================================================\n');

const tempDist = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmos-dist-test-'));

function cleanup() {
  try {
    if (fs.existsSync(tempDist)) {
      fs.rmSync(tempDist, { recursive: true, force: true });
    }
  } catch (e) {
    // ignore cleanup errors on temp dir
  }
}

try {
  console.log(`1. Running public build into temporary directory:\n   ${tempDist}\n`);
  execSync(`node scripts/build-public.js`, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      SITE_URL: TEST_SITE_URL,
      DIST_DIR: tempDist
    }
  });

  console.log('\n2. Verifying public story and tradition counts in temporary dist...');
  const mythPublicPath = path.join(tempDist, 'data', 'myth.public.json');
  if (!fs.existsSync(mythPublicPath)) {
    throw new Error('Missing data/myth.public.json in built dist');
  }

  const mythData = JSON.parse(fs.readFileSync(mythPublicPath, 'utf-8'));
  const traditions = Object.keys(mythData.traditions || {});
  const stories = Object.values(mythData.traditions || {}).flatMap(t => t.stories || []);

  console.log(`   - Found ${traditions.length} traditions (expected 7)`);
  console.log(`   - Found ${stories.length} stories (expected 109)`);

  if (traditions.length !== 7) {
    throw new Error(`Traditions count mismatch: got ${traditions.length}, expected 7`);
  }
  if (stories.length !== 109) {
    throw new Error(`Stories count mismatch: got ${stories.length}, expected 109`);
  }

  for (const excluded of EXCLUDED_TRADS) {
    if (traditions.includes(excluded)) {
      throw new Error(`Found excluded tradition "${excluded}" in myth.public.json traditions`);
    }
  }

  for (const s of stories) {
    if (EXCLUDED_TRADS.includes(s.trad || s.tradition)) {
      throw new Error(`Found story "${s.id}" belonging to excluded tradition "${s.trad || s.tradition}"`);
    }
  }
  console.log('   ✔ Tradition and story counts strictly verified.');

  console.log('\n3. Verifying no excluded heritage references in dist HTML and data...');

  // Collect all excluded story IDs from raw myth.json
  const rawMyth = JSON.parse(fs.readFileSync(RAW_MYTH_PATH, 'utf-8'));
  const excludedStoryIds = new Set();
  for (const tradKey of EXCLUDED_TRADS) {
    if (rawMyth.traditions && rawMyth.traditions[tradKey]) {
      for (const s of rawMyth.traditions[tradKey].stories || []) {
        excludedStoryIds.add(s.id);
      }
    }
  }

  // A. Check index.html and audio.html
  for (const htmlFile of ['index.html', 'audio.html']) {
    const filePath = path.join(tempDist, htmlFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing built HTML file: ${htmlFile}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check tradition attributes / assignments
    const tradRe = new RegExp(`(trad(ition)?|data-trad)\\s*[:=]\\s*['"](${EXCLUDED_TRADS.join('|')})['"]`, 'i');
    const tradMatch = content.match(tradRe);
    if (tradMatch) {
      throw new Error(`Found excluded tradition assignment "${tradMatch[0]}" in ${htmlFile}`);
    }

    // Check excluded story IDs
    for (const storyId of excludedStoryIds) {
      if (content.includes(`"${storyId}"`) || content.includes(`'${storyId}'`)) {
        throw new Error(`Found excluded story ID "${storyId}" in ${htmlFile}`);
      }
    }
  }
  console.log('   ✔ index.html and audio.html free of excluded traditions and stories.');

  // B. Check all JSON files in data/
  const dataDir = path.join(tempDist, 'data');
  const jsonFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  for (const jf of jsonFiles) {
    const content = fs.readFileSync(path.join(dataDir, jf), 'utf-8');
    const tradRe = new RegExp(`(trad(ition)?|data-trad)\\s*[:=]\\s*['"](${EXCLUDED_TRADS.join('|')})['"]`, 'i');
    const tradMatch = content.match(tradRe);
    if (tradMatch) {
      throw new Error(`Found excluded tradition assignment "${tradMatch[0]}" in data/${jf}`);
    }

    for (const storyId of excludedStoryIds) {
      if (content.includes(`"${storyId}"`)) {
        throw new Error(`Found excluded story ID "${storyId}" in data/${jf}`);
      }
    }
  }
  console.log(`   ✔ All ${jsonFiles.length} JSON data files free of excluded traditions.`);

  console.log('\n4. Running launch-audit against temporary dist directory...');
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8'));
  const { runLaunchAudit } = require('./launch-audit');
  runLaunchAudit(tempDist, policy);

  console.log('\n====================================================');
  console.log('✔ ALL BUILD GUARD ASSERTIONS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
} catch (err) {
  console.error('\n✖ BUILD GUARD TEST FAILED:\n', err.message);
  process.exit(1);
} finally {
  cleanup();
}
