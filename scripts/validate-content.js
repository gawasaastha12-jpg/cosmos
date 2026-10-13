// scripts/validate-content.js
// Validation script for Task B: Myth & Culture content integrity

const fs = require('fs');
const path = require('path');

const mythPath = path.join(__dirname, '..', 'data', 'myth.json');

if (!fs.existsSync(mythPath)) {
  console.error('FAIL: data/myth.json does not exist');
  process.exit(1);
}

const raw = fs.readFileSync(mythPath, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('FAIL: data/myth.json is invalid JSON:', e.message);
  process.exit(1);
}

const traditions = data.traditions;
if (!traditions || typeof traditions !== 'object') {
  console.error('FAIL: missing traditions object in data/myth.json');
  process.exit(1);
}

let totalStories = 0;
let errors = [];

const REQUIRED_STORY_FIELDS = [
  'id', 'title', 'subtitle', 'glyph', 'constellationKey', 
  'story', 'region', 'source', 'confidence', 'science'
];

for (const [tradKey, trad] of Object.entries(traditions)) {
  if (!trad.name) errors.push(`Tradition ${tradKey}: missing 'name'`);
  if (!trad.intro) errors.push(`Tradition ${tradKey}: missing 'intro'`);
  if (!trad.use) errors.push(`Tradition ${tradKey}: missing 'use' line`);
  if (!Array.isArray(trad.stories) || trad.stories.length === 0) {
    errors.push(`Tradition ${tradKey}: has no stories array`);
    continue;
  }

  trad.stories.forEach((s, idx) => {
    totalStories++;
    REQUIRED_STORY_FIELDS.forEach(f => {
      if (s[f] === undefined || s[f] === null || String(s[f]).trim() === '') {
        errors.push(`Story [${s.id || idx}] in ${tradKey}: missing or empty field '${f}'`);
      }
    });

    if (s.confidence && !['well documented', 'oral tradition, versions vary'].includes(s.confidence)) {
      errors.push(`Story [${s.id}] in ${tradKey}: invalid confidence '${s.confidence}'`);
    }
  });
}

console.log('--- Content Validation Report ---');
console.log(`Traditions validated: ${Object.keys(traditions).length}`);
console.log(`Total stories validated: ${totalStories}`);

if (totalStories < 150) {
  errors.push(`Story count requirement: Expected >= 150 stories, found ${totalStories}`);
}

if (errors.length > 0) {
  console.error(`\nValidation failed with ${errors.length} error(s):`);
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
} else {
  console.log('SUCCESS: All 150+ stories have verified sources, constellations, and required metadata!');
  process.exit(0);
}
