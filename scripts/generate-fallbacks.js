/**
 * generate-fallbacks.js
 * 
 * Automatically generates and synchronizes the embedded fallback datasets
 * in index.html directly from data/myth.json and data/audio-stories.json.
 * 
 * Ensures single source of truth without manual duplication.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const MYTH_PATH = path.join(__dirname, '..', 'data', 'myth.json');
const AUDIO_PATH = path.join(__dirname, '..', 'data', 'audio-stories.json');

function run() {
  console.log('--- Generating Embedded Fallback Data from data/*.json ---');

  if (!fs.existsSync(HTML_PATH) || !fs.existsSync(MYTH_PATH) || !fs.existsSync(AUDIO_PATH)) {
    console.error('Error: Required data or HTML files missing.');
    process.exit(1);
  }

  const mythData = JSON.parse(fs.readFileSync(MYTH_PATH, 'utf-8'));
  const audioData = JSON.parse(fs.readFileSync(AUDIO_PATH, 'utf-8'));
  let html = fs.readFileSync(HTML_PATH, 'utf-8');

  // 1. Build Fallback Audio Stories (initial featured set for offline fallback)
  const featuredAudio = audioData.slice(0, 3);
  const audioFallbackCode = `/* --- BEGIN EMBEDDED AUDIO FALLBACK DATA --- */
    if (!this.stories || this.stories.length === 0) {
      this.stories = ${JSON.stringify(featuredAudio, null, 2)};
    }
    /* --- END EMBEDDED AUDIO FALLBACK DATA --- */`;

  // 2. Build Fallback Myth Traditions (core traditions for offline fallback)
  const mythFallbackEntries = {};
  const introFallback = {};
  for (const [k, t] of Object.entries(mythData.traditions)) {
    mythFallbackEntries[k] = [
      t.name,
      t.stories.slice(0, 4).map(s => [
        s.title, s.subtitle, s.glyph, s.constellationKey, s.story, s
      ])
    ];
    introFallback[k] = t.intro;
  }

  const mythFallbackCode = `/* --- BEGIN EMBEDDED MYTH FALLBACK DATA --- */
const MY = ${JSON.stringify(mythFallbackEntries)};
const INTRO = ${JSON.stringify(introFallback)};
/* --- END EMBEDDED MYTH FALLBACK DATA --- */`;

  // Replace or inject Audio Fallback
  const audioPattern = /\/\* --- BEGIN EMBEDDED AUDIO FALLBACK DATA --- \*\/[\s\S]*?\/\* --- END EMBEDDED AUDIO FALLBACK DATA --- \*\//;
  if (audioPattern.test(html)) {
    html = html.replace(audioPattern, audioFallbackCode);
  } else {
    // Look for legacy inline audio fallback
    const legacyAudioPattern = /if \(!this\.stories \|\| this\.stories\.length === 0\) \{[\s\S]*?this\.stories = \[\s*\{[\s\S]*?\}\s*\];\s*\}/;
    if (legacyAudioPattern.test(html)) {
      html = html.replace(legacyAudioPattern, audioFallbackCode);
    }
  }

  // Replace or inject Myth Fallback
  const mythPattern = /\/\* --- BEGIN EMBEDDED MYTH FALLBACK DATA --- \*\/[\s\S]*?\/\* --- END EMBEDDED MYTH FALLBACK DATA --- \*\//;
  if (mythPattern.test(html)) {
    html = html.replace(mythPattern, mythFallbackCode);
  } else {
    // Look for legacy inline MY declaration
    const legacyMythPattern = /const MY=\{nak:\['Nakshatras',[\s\S]*?const INTRO=\{nak:[\s\S]*?\};/;
    if (legacyMythPattern.test(html)) {
      html = html.replace(legacyMythPattern, mythFallbackCode);
    }
  }

  fs.writeFileSync(HTML_PATH, html, 'utf-8');
  console.log('Successfully synchronized embedded fallback data in index.html from data/*.json!');
}

run();
