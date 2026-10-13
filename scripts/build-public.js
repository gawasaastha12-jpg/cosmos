/**
 * build-public.js
 * 
 * Generates a public-facing build that:
 * 1. Strictly hides all unverified stories (retains verified and probable only).
 * 2. Excludes traditions/stories marked "pending community review" per data/policy.json.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_PATH = path.join(__dirname, '..', 'data', 'citation-audit.csv');
const MYTH_PATH = path.join(__dirname, '..', 'data', 'myth.json');
const POLICY_PATH = path.join(__dirname, '..', 'data', 'policy.json');
const OUT_MYTH_PATH = path.join(__dirname, '..', 'data', 'myth.public.json');

function run() {
  console.log('--- Generating Public Build (Default Public Mode) ---');

  // Read policy configuration
  let policy = { excludePendingCommunityReview: true, hideUnverified: true };
  if (fs.existsSync(POLICY_PATH)) {
    try {
      policy = Object.assign(policy, JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8')));
      console.log('Loaded data/policy.json:', policy);
    } catch (e) {
      console.warn('Could not parse data/policy.json, using defaults.');
    }
  }

  // Read citation audit
  const auditContent = fs.readFileSync(AUDIT_PATH, 'utf-8');
  const lines = auditContent.trim().split('\n');
  const unverifiedIds = new Set();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const id = parts[0];
    const status = parts[5];
    if (status === 'unverified') {
      unverifiedIds.add(id);
    }
  }

  console.log(`Identified ${unverifiedIds.size} unverified stories.`);

  const mythData = JSON.parse(fs.readFileSync(MYTH_PATH, 'utf-8'));
  let totalRetained = 0;
  let totalExcluded = 0;
  let excludedTraditions = 0;

  const publicTraditions = {};

  for (const [tradKey, trad] of Object.entries(mythData.traditions)) {
    const isPendingReview = trad.reviewStatus === 'pending community review';
    if (policy.excludePendingCommunityReview && isPendingReview) {
      console.log(`Excluding tradition [${tradKey}]: marked "${trad.reviewStatus}" per policy.json`);
      excludedTraditions++;
      totalExcluded += trad.stories.length;
      continue;
    }

    const beforeCount = trad.stories.length;
    const filteredStories = trad.stories.filter(s => {
      if (policy.hideUnverified && unverifiedIds.has(s.id)) {
        totalExcluded++;
        return false;
      }
      totalRetained++;
      return true;
    });

    publicTraditions[tradKey] = {
      ...trad,
      stories: filteredStories
    };
    console.log(`Tradition [${tradKey}]: retained ${filteredStories.length}/${beforeCount} stories`);
  }

  mythData.traditions = publicTraditions;

  fs.writeFileSync(OUT_MYTH_PATH, JSON.stringify(mythData, null, 2), 'utf-8');
  console.log(`\nPublic build complete!`);
  console.log(`Retained stories: ${totalRetained}`);
  console.log(`Excluded stories: ${totalExcluded} (across ${excludedTraditions} pending-review traditions & unverified items)`);
  console.log(`Output: ${OUT_MYTH_PATH}`);
}

run();
