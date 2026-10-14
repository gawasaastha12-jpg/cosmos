const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.join(__dirname, '..');
const AUDIO_HTML_PATH = path.join(ROOT_DIR, 'audio.html');
const STORIES_JSON_PATH = path.join(ROOT_DIR, 'data', 'audio-stories.json');
const AUDIO_JS_PATH = path.join(__dirname, 'audio-storybook.js');

const storiesData = JSON.parse(fs.readFileSync(STORIES_JSON_PATH, 'utf-8'));
const sampleStories = [storiesData[0], storiesData[1]];

// Read head part of audio.html before <script>
const originalHtml = fs.readFileSync(AUDIO_HTML_PATH, 'utf-8');
const scriptStartIdx = originalHtml.indexOf('<script>');
if (scriptStartIdx === -1) {
  console.error('Could not find <script> tag in audio.html');
  process.exit(1);
}

let headPart = originalHtml.slice(0, scriptStartIdx);

// Update font stack in headPart to support Indic typography
headPart = headPart.replace(
  "--sans: 'Space Grotesk', system-ui, sans-serif;",
  "--sans: 'Space Grotesk', 'Nirmala UI', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Kartika', system-ui, sans-serif;"
);

let scriptSource = fs.readFileSync(AUDIO_JS_PATH, 'utf-8');
const fallbackStoriesCode = 'const FALLBACK_STORIES = ' + JSON.stringify(sampleStories, null, 2) + ';';
scriptSource = scriptSource.replace('/* __FALLBACK_STORIES_INJECTION__ */', fallbackStoriesCode);

// Validate script syntax with Node's VM compiler
try {
  new vm.Script(scriptSource, { filename: 'audio.html.js' });
  console.log('✔ JavaScript syntax validated with zero errors!');
} catch (e) {
  console.error('Syntax error in generated script:', e);
  process.exit(1);
}

const finalHtml = headPart + '<script>\n' + scriptSource + '\n  </script>\n</body>\n</html>\n';
fs.writeFileSync(AUDIO_HTML_PATH, finalHtml, 'utf-8');
console.log('✔ Successfully regenerated and wrote clean ' + AUDIO_HTML_PATH);
