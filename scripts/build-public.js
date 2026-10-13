/**
 * build-public.js
 * 
 * Generates a public-facing build that strictly hides all unverified stories.
 * Reads data/citation-audit.csv and data/myth.json, filters out any stories
 * with status === 'unverified', and writes a public version of myth.json.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_PATH = path.join(__dirname, '..', 'data', 'citation-audit.csv');
const MYTH_PATH = path.join(__dirname, '..', 'data', 'myth.json');
const OUT_MYTH_PATH = path.join(__dirname, '..', 'data', 'myth.public.json');

function run() {
  console.log('--- Generating Public Build (Hiding Unverified Stories) ---');

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

  console.log(`Identified ${unverifiedIds.size} unverified stories to exclude.`);

  const mythData = JSON.parse(fs.readFileSync(MYTH_PATH, 'utf-8'));
  let totalRetained = 0;
  let totalExcluded = 0;

  for (const [tradKey, trad] of Object.entries(mythData.traditions)) {
    const beforeCount = trad.stories.length;
    trad.stories = trad.stories.filter(s => {
      const isUnverified = unverifiedIds.has(s.id);
      if (isUnverified) {
        totalExcluded++;
        return false;
      }
      totalRetained++;
      return true;
    });
    console.log(`Tradition [${tradKey}]: retained ${trad.stories.length}/${beforeCount} stories`);
  }

  fs.writeFileSync(OUT_MYTH_PATH, JSON.stringify(mythData, null, 2), 'utf-8');
  console.log(`\nPublic build complete!`);
  console.log(`Retained stories: ${totalRetained}`);
  console.log(`Excluded unverified stories: ${totalExcluded}`);
  console.log(`Output: ${OUT_MYTH_PATH}`);
}

run();
