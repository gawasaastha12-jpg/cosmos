/**
 * build-public.js
 * 
 * Launch Hardening Production Public Build Script (Brief 10):
 * 1. Reads SITE_URL strictly from environment variable ONLY.
 *    Fails if missing or equals cosmic-ar-explorer.app.
 * 2. Sweeps and sanitizes public build for excluded traditions based on data/policy.json:
 *    - Constellation-info text (CI)
 *    - Quiz questions (QZ, QCt)
 *    - Match-pair items
 *    - Collection-card and chapter trail lore
 *    - Audio stories & manifests
 * 3. Applies performance optimizations for public build:
 *    - Removes legacy Earth texture and LAND polygons
 *    - Paints celestial-sphere texture after first paint with requestIdleCallback (1024x512 on < 768px)
 *    - Starts Three.js scene after first paint
 *    - Makes hero headline and subtitle visible immediately (transform-only, no opacity:0 start)
 *    - Moves large inline myth data into lazy-loaded JSON
 *    - Removes dead window.R.clear() call
 * 4. Retains full root files for local developer auditing.
 * 5. Fails loudly with exit code 1 if any expected replacement matches nothing.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(ROOT_DIR, 'dist');
const AUDIT_PATH = path.join(ROOT_DIR, 'data', 'citation-audit.csv');
const MYTH_PATH = path.join(ROOT_DIR, 'data', 'myth.json');
const AUDIO_PATH = path.join(ROOT_DIR, 'data', 'audio-stories.json');
const POLICY_PATH = path.join(ROOT_DIR, 'data', 'policy.json');
const CONFIG_PATH = path.join(ROOT_DIR, 'data', 'config.json');
const OUT_MYTH_PUBLIC = path.join(ROOT_DIR, 'data', 'myth.public.json');
const OUT_AUDIO_PUBLIC = path.join(ROOT_DIR, 'data', 'audio-stories.public.json');

// 1. SITE_URL: Read strictly from environment variable ONLY (with Vercel automatic fallback)
let rawSiteUrl = (process.env.SITE_URL || '').trim();
if (!rawSiteUrl && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  rawSiteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
} else if (!rawSiteUrl && process.env.VERCEL_URL) {
  rawSiteUrl = `https://${process.env.VERCEL_URL}`;
}

if (!rawSiteUrl) {
  console.error('FATAL ERROR: SITE_URL environment variable is missing.');
  console.error('Usage: SITE_URL=https://your-domain.org node scripts/build-public.js');
  process.exit(1);
}

const siteDomain = rawSiteUrl.replace(/^https?:\/\//i, '').replace(/[\/:?#].*$/, '').toLowerCase();
if (siteDomain === 'cosmic-ar-explorer.app') {
  console.error('FATAL ERROR: SITE_URL cannot equal prohibited placeholder domain "cosmic-ar-explorer.app".');
  process.exit(1);
}

const SITE_URL = rawSiteUrl.replace(/\/+$/, '');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    let isDir = entry.isDirectory();
    if (entry.isSymbolicLink()) {
      try {
        isDir = fs.statSync(srcPath).isDirectory();
      } catch (e) {}
    }
    if (isDir) {
      copyDirRecursive(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        if (err.code !== 'EPERM' && err.code !== 'EBUSY') {
          throw err;
        }
      }
    }
  }
}

// Guard helper: asserts that pattern matches content, otherwise fails loudly naming the transform
function applyExpectedTransform(content, pattern, replacement, transformName) {
  let matched = false;
  if (typeof pattern === 'string') {
    matched = content.includes(pattern);
  } else if (pattern instanceof RegExp) {
    matched = pattern.test(content);
    if (pattern.global) pattern.lastIndex = 0;
  }
  if (!matched) {
    console.error(`FATAL BUILD ERROR: Required transform "${transformName}" failed to match any content.`);
    process.exit(1);
  }
  return content.replace(pattern, replacement);
}

function run() {
  console.log('====================================================');
  console.log('   COSMIC AR EXPLORER — PRODUCTION PUBLIC BUILD     ');
  console.log('====================================================');
  console.log(`Configured SITE_URL: ${SITE_URL}\n`);

  // 1. Read Policy Config
  let policy = {
    excludePendingCommunityReview: true,
    hideUnverified: true,
    pendingReviewTraditions: ["ind", "poly", "amer"]
  };

  if (fs.existsSync(POLICY_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8'));
      policy = Object.assign(policy, parsed);
      console.log('Loaded data/policy.json:');
      console.log(`  - Exclude Pending Review: ${policy.excludePendingCommunityReview}`);
      console.log(`  - Pending Review Traditions: [${policy.pendingReviewTraditions.join(', ')}]`);
    } catch (e) {
      console.warn('Failed to parse data/policy.json, using defaults:', e);
    }
  }

  const pendingTraditions = policy.pendingReviewTraditions || ["ind", "poly", "amer"];
  const excludePoly = policy.excludePendingCommunityReview && pendingTraditions.includes('poly');
  const excludeInd = policy.excludePendingCommunityReview && pendingTraditions.includes('ind');
  const excludeAmer = policy.excludePendingCommunityReview && pendingTraditions.includes('amer');

  // 2. Read Citation Audit CSV for Verified/Probable/Unverified mapping
  const unverifiedStoryIds = new Set();
  const citationMap = new Map();
  if (fs.existsSync(AUDIT_PATH)) {
    const lines = fs.readFileSync(AUDIT_PATH, 'utf-8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      const id = parts[0];
      const status = parts[parts.length - 2]?.trim();
      citationMap.set(id, status);
      if (status === 'unverified') {
        unverifiedStoryIds.add(id);
      }
    }
    console.log(`Citation Audit: ${unverifiedStoryIds.size} unverified, ${citationMap.size - unverifiedStoryIds.size} verified/probable stories.\n`);
  }

  // 3. Process Myth JSON
  const rawMythData = JSON.parse(fs.readFileSync(MYTH_PATH, 'utf-8'));
  const publicTraditions = {};
  const reportRows = [];
  let totalPublicStories = 0;
  let totalRawStories = 0;

  for (const [tradKey, trad] of Object.entries(rawMythData.traditions)) {
    const rawCount = trad.stories.length;
    totalRawStories += rawCount;

    if (policy.excludePendingCommunityReview && policy.pendingReviewTraditions.includes(tradKey)) {
      reportRows.push({
        key: tradKey,
        name: trad.name,
        raw: rawCount,
        public: 0,
        status: 'Excluded (pending community review in policy.json)'
      });
      continue;
    }

    const filteredStories = trad.stories.filter(s => {
      const status = citationMap.get(s.id) || s.citationStatus || 'probable';
      if (policy.hideUnverified && status === 'unverified') {
        return false;
      }
      return true;
    }).map(s => {
      if (excludePoly && s.id === 'nak_krittika' && s.audio === 'matariki') {
        return { ...s, audio: null };
      }
      return s;
    });

    publicTraditions[tradKey] = {
      ...trad,
      stories: filteredStories
    };

    totalPublicStories += filteredStories.length;
    reportRows.push({
      key: tradKey,
      name: trad.name,
      raw: rawCount,
      public: filteredStories.length,
      status: filteredStories.length === rawCount ? 'Fully public (all verified/probable)' : `Public (${rawCount - filteredStories.length} unverified omitted)`
    });
  }

  const publicMythData = {
    ...rawMythData,
    metadata: {
      ...rawMythData.metadata,
      totalStories: totalPublicStories
    },
    traditions: publicTraditions
  };
  fs.writeFileSync(OUT_MYTH_PUBLIC, JSON.stringify(publicMythData, null, 2), 'utf-8');
  console.log(`Wrote root ${path.relative(ROOT_DIR, OUT_MYTH_PUBLIC)} (${totalPublicStories} stories)`);

  // 4. Filter Audio Stories (Strict Public Subset per data/policy.json)
  const rawAudio = JSON.parse(fs.readFileSync(AUDIO_PATH, 'utf-8'));
  const excludedAudioPatterns = [];
  if (excludePoly) excludedAudioPatterns.push(/poly|hawai|maori|wayfind|hokulea|te punga|matariki/i);
  if (excludeInd) excludedAudioPatterns.push(/aborigin|indigenous australian|emu|songline|djulpan|tagai/i);
  if (excludeAmer) excludedAudioPatterns.push(/americas|maya|navajo|inca|quechua|lakota|pawnee|cherokee|ojibwe/i);

  const publicAudioStories = rawAudio.filter(s => {
    if (policy.excludePendingCommunityReview) {
      const hay = `${s.id} ${s.title} ${s.tradition}`;
      for (const pat of excludedAudioPatterns) {
        if (pat.test(hay)) return false;
      }
    }
    return true;
  });

  // Sanitize any remaining excluded-tradition references inside audio-stories text (e.g. Matariki in Krittika)
  if (excludePoly) {
    publicAudioStories.forEach(s => {
      if (s.languages) {
        for (const langObj of Object.values(s.languages)) {
          if (langObj.sentences) {
            langObj.sentences.forEach(line => {
              if (line.text && /matariki/i.test(line.text)) {
                line.text = "Across the ancient world, starry clusters heralded the new harvest and remembrance of ancestors.";
              }
            });
          }
        }
      }
    });
  }

  // Sanitize nak_krittika audio pointer in publicMythData
  if (excludePoly && publicTraditions.nak && publicTraditions.nak.stories) {
    publicTraditions.nak.stories.forEach(s => {
      if (s.id === 'nak_krittika' && s.audio === 'matariki') {
        s.audio = null;
      }
    });
  }

  fs.writeFileSync(OUT_AUDIO_PUBLIC, JSON.stringify(publicAudioStories, null, 2), 'utf-8');
  console.log(`Wrote root ${path.relative(ROOT_DIR, OUT_AUDIO_PUBLIC)} (${publicAudioStories.length} audio stories)\n`);

  // 5. Clean & Create dist/
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true });

  // 6. Generate robots.txt and sitemap.xml with SITE_URL
  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8');
  fs.writeFileSync(path.join(ROOT_DIR, 'robots.txt'), robotsTxt, 'utf-8');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/audio.html</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about.html</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy.html</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>\n`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');

  // Copy LICENSES.md
  if (fs.existsSync(path.join(ROOT_DIR, 'LICENSES.md'))) {
    fs.copyFileSync(path.join(ROOT_DIR, 'LICENSES.md'), path.join(DIST_DIR, 'LICENSES.md'));
  }

  // Copy Assets, Vendor, Audio, JS
  copyDirRecursive(path.join(ROOT_DIR, 'assets'), path.join(DIST_DIR, 'assets'));
  copyDirRecursive(path.join(ROOT_DIR, 'vendor'), path.join(DIST_DIR, 'vendor'));
  copyDirRecursive(path.join(ROOT_DIR, 'audio'), path.join(DIST_DIR, 'audio'));
  copyDirRecursive(path.join(ROOT_DIR, 'js'), path.join(DIST_DIR, 'js'));

  // Sanitize dist/audio/manifest.json if poly is excluded
  const distManifestPath = path.join(DIST_DIR, 'audio', 'manifest.json');
  if (fs.existsSync(distManifestPath) && excludePoly) {
    let manifestStr = fs.readFileSync(distManifestPath, 'utf-8');
    manifestStr = applyExpectedTransform(manifestStr, /Star of Gladness Hokulea/g, 'Star of Gladness Arcturus', 'audio-manifest: hokulea-to-arcturus');
    fs.writeFileSync(distManifestPath, manifestStr, 'utf-8');
  }

  // Optimize font-display in dist/assets/fonts/fonts.css to eliminate layout shifts (CLS = 0)
  const distFontsCss = path.join(DIST_DIR, 'assets', 'fonts', 'fonts.css');
  if (fs.existsSync(distFontsCss)) {
    let fontsCssStr = fs.readFileSync(distFontsCss, 'utf-8');
    fontsCssStr = applyExpectedTransform(fontsCssStr, /font-display:\s*swap;/g, 'font-display: optional;', 'fonts-css: optional-font-display');
    fs.writeFileSync(distFontsCss, fontsCssStr, 'utf-8');
  }

  // Copy ONLY public data sets into dist/data/
  fs.copyFileSync(OUT_MYTH_PUBLIC, path.join(DIST_DIR, 'data', 'myth.public.json'));
  fs.copyFileSync(OUT_AUDIO_PUBLIC, path.join(DIST_DIR, 'data', 'audio-stories.public.json'));
  fs.copyFileSync(OUT_AUDIO_PUBLIC, path.join(DIST_DIR, 'data', 'audio-stories.json'));
  fs.copyFileSync(POLICY_PATH, path.join(DIST_DIR, 'data', 'policy.json'));
  fs.writeFileSync(path.join(DIST_DIR, 'data', 'config.json'), JSON.stringify({ siteUrl: SITE_URL }, null, 2), 'utf-8');
  console.log('Copied assets, vendor, audio, licenses, and ONLY public data files to dist/');

  // Helper to resolve og:url and absolute og:image in HTML
  function postProcessHtml(html, pagePath = '', filename = 'HTML') {
    if (filename === '404.html') return html;

    const pageUrl = pagePath ? `${SITE_URL}/${pagePath}` : `${SITE_URL}/`;
    const ogImageUrl = `${SITE_URL}/assets/og-image.jpg`;

    html = applyExpectedTransform(html, /https:\/\/cosmic-ar-explorer\.app/g, SITE_URL, `${filename}: site-url-domain`);
    html = applyExpectedTransform(html, /<meta property="og:image" content="[^"]*">/g, `<meta property="og:image" content="${ogImageUrl}">`, `${filename}: og-image`);
    html = applyExpectedTransform(html, /<meta name="twitter:image" content="[^"]*">/g, `<meta name="twitter:image" content="${ogImageUrl}">`, `${filename}: twitter-image`);

    if (html.includes('<meta property="og:url"')) {
      html = applyExpectedTransform(html, /<meta property="og:url" content="[^"]*">/g, `<meta property="og:url" content="${pageUrl}">`, `${filename}: og-url`);
    } else {
      html = applyExpectedTransform(html, /<meta property="og:type" content="[^"]*">/, `$&<meta property="og:url" content="${pageUrl}">`, `${filename}: og-url-inject`);
    }

    return html;
  }

  // 7. Copy and Post-process HTML Pages
  const staticHtmlFiles = [
    { file: 'about.html', path: 'about.html' },
    { file: 'privacy.html', path: 'privacy.html' },
    { file: '404.html', path: '404.html' },
    { file: 'audio.html', path: 'audio.html' }
  ];

  for (const item of staticHtmlFiles) {
    const src = path.join(ROOT_DIR, item.file);
    if (fs.existsSync(src)) {
      let content = fs.readFileSync(src, 'utf-8');
      content = postProcessHtml(content, item.path, item.file);
      fs.writeFileSync(path.join(DIST_DIR, item.file), content, 'utf-8');
    }
  }

  // 8. Transform and write dist/index.html
  let indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

  // --- REQUIREMENT 3: PERFORMANCE - MOVE LARGE INLINE DATA INTO LAZY-LOADED JSON ---
  // Replace the 42KB inline MY/INTRO fallback block with minimal empty object.
  // Myth data is lazy-loaded asynchronously via data/myth.public.json on idle or navigation.
  const publicFallbackSnippet = `/* --- BEGIN EMBEDDED MYTH FALLBACK DATA --- */
const MY = {};
const INTRO = {};
/* --- END EMBEDDED MYTH FALLBACK DATA --- */`;

  const fallbackPattern = /\/\* --- BEGIN EMBEDDED MYTH FALLBACK DATA --- \*\/[\s\S]*?\/\* --- END EMBEDDED MYTH FALLBACK DATA --- \*\//;
  indexHtml = applyExpectedTransform(indexHtml, fallbackPattern, publicFallbackSnippet, 'index: embedded-myth-fallback');

  // Ensure vendor/three.min.js does not block HTML parsing and first paint
  indexHtml = applyExpectedTransform(indexHtml, /<script src="vendor\/three\.min\.js"><\/script>/, '<script src="vendor/three.min.js" defer></script>', 'index: defer-three-script');

  // --- REQUIREMENT 3: REMOVE DEAD window.R.clear() CALL ---
  indexHtml = applyExpectedTransform(indexHtml, /if\(lbs&&n!=='home'\)lbs\.style\.display='none';\s*if\(n!=='home'&&window\.R\)R\.clear\(\);/g, "if(lbs&&n!=='home')lbs.style.display='none';", 'index: remove-dead-R-clear');

  // --- REQUIREMENT 3: HERO HEADLINE AND SUBTITLE VISIBLE IMMEDIATELY (TRANSFORM-ONLY, NO OPACITY:0 START) ---
  indexHtml = applyExpectedTransform(indexHtml, /\.w\{display:inline-block;opacity:0;transform:translateY\(\.5em\) rotateX\(40deg\);filter:blur\(10px\);animation:rise 1\.1s cubic-bezier\(\.2,\.7,\.2,1\) forwards;animation-delay:calc\(var\(--i\)\*\.16s \+ \.2s\)\}/,
    '.w{display:inline-block;opacity:1;transform:translateY(.35em);animation:rise .6s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:calc(var(--i)*.08s)}', 'index: hero-headline-w');
  indexHtml = applyExpectedTransform(indexHtml, /@keyframes rise\{to\{opacity:1;transform:none;filter:none\}\}/,
    '@keyframes rise{to{transform:none}}', 'index: hero-rise-keyframes');
  indexHtml = applyExpectedTransform(indexHtml, /\.sub,\.hint\{opacity:0;animation:fade 1\.2s 1\.1s forwards\}@keyframes fade\{to\{opacity:1\}\}/,
    '.sub,.hint{opacity:1}', 'index: hero-sub-hint');

  // --- REQUIREMENT 3: REMOVE LEGACY EARTH TEXTURE AND LAND POLYGONS ---
  // Remove LAND array definition and earthTex() function entirely from dist/
  indexHtml = applyExpectedTransform(indexHtml, /const LAND=\[\[\[-168,66\][\s\S]*?\]\]\];\s*function earthTex\(\)\{[\s\S]*?return new THREE\.CanvasTexture\(c\)\}/, '/* Legacy LAND & earthTex removed for performance */', 'index: remove-land-polygons-and-earthTex');
  // Update globe creation to use a lightweight basic material without heavy canvas texturing
  indexHtml = applyExpectedTransform(indexHtml, /globe\.add\(new THREE\.Mesh\(new THREE\.SphereGeometry\(1\.98, 64, 48\), new THREE\.MeshBasicMaterial\(\{map: earthTex\(\)\}\)\)\);/,
    'globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.98, 32, 24), new THREE.MeshBasicMaterial({color: 0x0a1a4a})));', 'index: globe-material-no-earthTex');

  // --- REQUIREMENT 3: PAINT CELESTIAL-SPHERE TEXTURE AFTER FIRST PAINT WITH requestIdleCallback (1024x512 on < 768px) ---
  indexHtml = applyExpectedTransform(indexHtml, /sky\.add\(new THREE\.Mesh\(new THREE\.SphereGeometry\(3\.3, 64, 48\), new THREE\.MeshBasicMaterial\(\{map: skyTex\(\)\}\)\)\);/,
    `const skyMat = new THREE.MeshBasicMaterial({color: 0x040818});
  sky.add(new THREE.Mesh(new THREE.SphereGeometry(3.3, 48, 32), skyMat));
  const scheduleSkyTex = () => {
    const tex = skyTex();
    skyMat.map = tex;
    skyMat.color.setHex(0xffffff);
    skyMat.needsUpdate = true;
  };
  if (window.requestIdleCallback) {
    requestIdleCallback(scheduleSkyTex, { timeout: 2500 });
  } else {
    setTimeout(scheduleSkyTex, 100);
  }`, 'index: sky-texture-idle-schedule');

  // In skyTex(), ensure screens under 768px use 1024x512
  indexHtml = applyExpectedTransform(indexHtml, /function skyTex\(\)\{const w=innerWidth<768\?1024:2048,h=w\/2,c=document\.createElement\('canvas'\);/,
    'function skyTex(){const w=window.innerWidth<768?1024:2048,h=w/2,c=document.createElement(\'canvas\');', 'index: skyTex-responsive-width');

  // --- REQUIREMENT 3: START THREE.JS SCENE AFTER FIRST PAINT ---
  indexHtml = applyExpectedTransform(indexHtml, /function tryInit3D\(\)\s*\{\s*if\s*\(page === 'home' && !sceneInitialized && window\.THREE\)\s*\{\s*init3D\(\);\s*\}\s*\}\s*if\s*\(document\.readyState === 'loading'\)\s*\{\s*window\.addEventListener\('DOMContentLoaded', tryInit3D\);\s*\}\s*else\s*\{\s*tryInit3D\(\);\s*\}/,
    `function tryInit3D() {
  if (page === 'home' && !sceneInitialized) {
    if (window.THREE) {
      init3D();
    } else {
      setTimeout(tryInit3D, 40);
    }
  }
}`, 'index: tryInit3D-definition');

  indexHtml = applyExpectedTransform(indexHtml, /updateHUD\(\);\s*renderTrail\(\);/,
    `if (window.requestIdleCallback) { requestIdleCallback(() => { updateHUD(); renderTrail(); }); } else { setTimeout(() => { updateHUD(); renderTrail(); }, 150); }`, 'index: updateHUD-renderTrail-idle');

  indexHtml = applyExpectedTransform(indexHtml, /game1\(\);game2\(\);renderFM\(\);/,
    `if (window.requestIdleCallback) { requestIdleCallback(() => { game1(); game2(); renderFM(); }); } else { setTimeout(() => { game1(); game2(); renderFM(); }, 200); }`, 'index: game1-game2-idle');

  indexHtml = applyExpectedTransform(indexHtml, /tryInit3D\(\);fit\(\);renderMyth\(\);renderQ\(\);setLang\('en'\);[\s\S]*?requestAnimationFrame\(frame\);/,
    `fit(); setLang('en');
    const curH = location.hash.slice(1);
    if (curH === 'signin') {
      setTimeout(() => { if (typeof openSignInModal === 'function') openSignInModal(); }, 350);
    } else if (curH === 'welcome') {
      setTimeout(() => { if (typeof checkOnboarding === 'function') { page = 'play'; SAVE.onboarded = false; checkOnboarding(); } }, 350);
    } else if (['sci','myth','play'].includes(curH)) {
      tryInit3D();
      renderMyth();
      renderQ();
      go(curH);
      requestAnimationFrame(frame);
    } else {
      // Start Three.js scene & animation loop strictly AFTER first paint
      const startAfterFirstPaint = () => {
        tryInit3D();
        fit();
        renderMyth();
        renderQ();
        requestAnimationFrame(frame);
      };
      if (window.requestAnimationFrame) {
        requestAnimationFrame(() => {
          setTimeout(startAfterFirstPaint, 30);
        });
      } else {
        setTimeout(startAfterFirstPaint, 60);
      }
    }`, 'index: start-after-first-paint');

  // --- REQUIREMENT 1: REMOVE OR HIDE EXCLUDED-TRADITION CONTENT (DRIVEN BY policy.json) ---
  if (policy.excludePendingCommunityReview) {
    // A. Constellation Info (CI)
    if (excludePoly) {
      // Scorpius: remove Māui's fishhook
      indexHtml = applyExpectedTransform(indexHtml, /Vrishchika · Jyeshtha is Antares · Māui’s fishhook/, 'Vrishchika · Jyeshtha is Antares', 'heritage: ci-scorpius-maui');
      // Bootes: remove zenith star of Hawaiʻi / Hōkūleʻa
      indexHtml = applyExpectedTransform(indexHtml, /Arcturus is the brightest star of the northern sky and the zenith star of Hawaiʻi, called Hōkūleʻa\. Follow the handle of the Big Dipper to find it\./,
        'Arcturus is the brightest star of the northern sky and the jewel of Bootes. Follow the handle of the Big Dipper to find it.', 'heritage: ci-bootes-hokulea');
      // Taurus: remove Matariki
      indexHtml = applyExpectedTransform(indexHtml, /Krittika and Matariki \(Pleiades\)/, 'Krittika (Pleiades)', 'heritage: ci-taurus-matariki');
    }
    if (excludePoly || excludeInd) {
      // Crux: remove Te Punga and Emu's head
      indexHtml = applyExpectedTransform(indexHtml, /Trishanku · Te Punga · the Emu’s head/, 'Trishanku · The Southern Cross', 'heritage: ci-crux-te-punga-emu');
    }

    // B. Quiz Questions (QZ & QCt)
    if (excludePoly) {
      // Q[2]: Navigator's Anchor (Te Punga / Māori) -> Southern Cross
      indexHtml = applyExpectedTransform(indexHtml, /\['Navigator\\'s Anchor',40,'Which pattern is Te Punga, the Māori anchor\?',\['Scorpius','Cassiopeia','Southern Cross'\],2,'Crux points south, so it anchors voyages\.'\],/,
        "['Southern Cross',40,'Which constellation acts as a celestial compass in the southern hemisphere?',['Scorpius','Cassiopeia','Southern Cross'],2,'Crux points south, guiding navigators across the southern oceans.'],", 'heritage: quiz-navigator-anchor');
      // Q[8]: Zenith Star (Hōkūleʻa / Hawaiʻi) -> Zenith Star Arcturus
      indexHtml = applyExpectedTransform(indexHtml, /\['Zenith Star',40,'Which star is Hōkūleʻa, the zenith star of Hawaiʻi\?',\['Arcturus','Vega','Sirius'\],0,'Follow the arc of the Big Dipper handle to Arcturus\.'\],/,
        "['Zenith Star',40,'Which bright orange giant star can you locate by following the arc of the Big Dipper?',['Arcturus','Vega','Sirius'],0,'Follow the arc of the Big Dipper handle to Arcturus.'],", 'heritage: quiz-zenith-star-hokulea');
      // Q[28]: Krittika explanation (Matariki)
      indexHtml = applyExpectedTransform(indexHtml, /'Krittika is the Pleiades, also called Matariki and Subaru\.'/,
        "'Krittika is the Pleiades open cluster, also known as the flame-bearers and Subaru.'", 'heritage: quiz-krittika-explanation');
      // Q[30]: Matariki question -> Subaru Cluster
      indexHtml = applyExpectedTransform(indexHtml, /\['Matariki',40,'Matariki marks the Māori new year\. Which cluster is it\?',\['Pleiades','Hyades','Beehive'\],0,'The Pleiades rise before dawn in midwinter\.'\],/,
        "['Subaru Cluster',40,'In East Asian sky tradition, the Pleiades cluster is known as…',['Subaru','Krittika','Shen'],0,'Subaru signifies unity and gathering in Japanese tradition.'],", 'heritage: quiz-matariki-cluster');

      // QCt category mapping keys
      indexHtml = applyExpectedTransform(indexHtml, /'Navigator\\'s Anchor':('Culture'|'Sky navigation')/, "'Southern Cross':$1", 'heritage: qct-navigator-anchor');
      indexHtml = applyExpectedTransform(indexHtml, /'Matariki':('Culture'|'Myth and lore')/, "'Subaru Cluster':$1", 'heritage: qct-matariki');
    }

    // C. Match-pair Items
    if (excludePoly || excludeInd) {
      // Replace excluded Te Punga & Emu in Sky with East Asian and Arabic astronomy
      const oldPairsRegex = /pairs\s*=\s*\[\s*\['Ardra',\s*'Nakshatras'\],\s*\['Callisto the Bear',\s*'Greco-Roman'\],\s*\['Te Punga',\s*'Polynesian'\],\s*\['Emu in Sky',\s*'Indigenous lore'\]\s*\];/;
      const newPairsCode = `pairs = [
      ['Ardra', 'Nakshatras'],
      ['Callisto the Bear', 'Greco-Roman'],
      ['Weaver Girl', 'East Asian'],
      ['Al-Sufi', 'Arabic astronomy']
    ];`;
      indexHtml = applyExpectedTransform(indexHtml, oldPairsRegex, newPairsCode, 'heritage: match-pairs-excluded-traditions');
    }

    // D. Collection-card lore & Companions
    if (excludeInd) {
      // COMPANIONS.fox quote: remove Emu
      indexHtml = applyExpectedTransform(indexHtml, /'The dark dust lanes in the Milky Way form the great celestial Emu!'/,
        "'Ancient skywatchers wove timeless lore across constellations and stars!'", 'heritage: fox-lore-milky-way-emu');
    }
    if (excludePoly) {
      // CHAPTER_MASCOTS.ch3 quote: remove Polynesian wayfinders
      indexHtml = applyExpectedTransform(indexHtml, /"Polynesian wayfinders read ocean swells and rising stars!"/,
        '"Ancient skywatchers tracked constellations to keep time across seasons!"', 'heritage: ch3-mascot-polynesian-wayfinders');
    }

    // E. Chapter 3 Header and Trail Nodes
    if (excludePoly || excludeInd) {
      // Chapter 3 description
      indexHtml = applyExpectedTransform(indexHtml, /desc: 'Nakshatras, Polynesian wayfinding, and Aboriginal Australian songlines\.'/,
        "desc: 'Nakshatras, classical constellations, and ancient celestial traditions.'", 'heritage: ch3-trail-description');
      // Node c3_1: Navigator Anchor -> Southern Cross
      indexHtml = applyExpectedTransform(indexHtml, /\{ id: 'c3_1', name: 'Navigator Anchor', type: 'quiz', qIdx: 2, desc: 'Te Punga and Polynesian wayfinding' \}/,
        "{ id: 'c3_1', name: 'Southern Cross', type: 'quiz', qIdx: 2, desc: 'Crux as a celestial compass' }", 'heritage: trail-node-c3_1');
      // Node c3_4: Zenith Star Hōkūleʻa -> Zenith Star Arcturus
      indexHtml = applyExpectedTransform(indexHtml, /\{ id: 'c3_4', name: 'Zenith Star Hōkūleʻa', type: 'quiz', qIdx: 8, desc: 'Arcturus and voyage to Hawaiʻi' \}/,
        "{ id: 'c3_4', name: 'Zenith Star Arcturus', type: 'quiz', qIdx: 8, desc: 'Follow the arc to Arcturus' }", 'heritage: trail-node-c3_4');
      // Node c3_6: Emu in the Sky -> Weaver Girl (Qixi)
      indexHtml = applyExpectedTransform(indexHtml, /\{ id: 'c3_6', name: 'Listen: Emu in the Sky', type: 'listen', taleKey: 'emu', desc: 'Dark dust lanes in the Milky Way' \}/,
        "{ id: 'c3_6', name: 'Listen: Weaver Girl', type: 'listen', taleKey: 'qixi', desc: 'The celestial bridge of magpies' }", 'heritage: trail-node-c3_6');
      // Node c5_3: Krittika and Matariki -> Krittika and the Pleiades cluster
      indexHtml = applyExpectedTransform(indexHtml, /\{ id: 'c5_3', name: 'Find the Pleiades', type: 'field', fmIdx: 2, desc: 'Krittika and Matariki cluster' \}/,
        "{ id: 'c5_3', name: 'Find the Pleiades', type: 'field', fmIdx: 2, desc: 'Krittika and the Pleiades cluster' }", 'heritage: trail-node-c5_3');
      // FM[2] Field Mission: Pleiades description
      indexHtml = applyExpectedTransform(indexHtml, /A tiny dipper-shaped cluster: Krittika, Matariki, Subaru\./,
        "A tiny dipper-shaped cluster: Krittika and Subaru in Taurus.", 'heritage: fm2-field-mission-pleiades');
      // Search keyword tokens
      indexHtml = applyExpectedTransform(indexHtml, /\|\| t\.includes\('punga'\) \|\| t\.includes\('anchor'\) \|\| t\.includes\('boat'\) \|\| t\.includes\('navigat'\) \|\| t\.includes\('wayfind'\)/,
        "|| t.includes('anchor') || t.includes('boat') || t.includes('navigat')", 'heritage: search-token-punga-wayfind');
      indexHtml = applyExpectedTransform(indexHtml, /\|\| t\.includes\('emu'\) /, "", 'heritage: search-token-emu');
      indexHtml = applyExpectedTransform(indexHtml, /\|\| t\.includes\('djulpan'\)/, "", 'heritage: search-token-djulpan');

      // UNVERIFIED_STORIES cleanup for excluded traditions
      indexHtml = applyExpectedTransform(indexHtml, /"poly_ka_lupe",\s*"poly_tamarereti",\s*"poly_aa_sirius",\s*"poly_manaiakalani",\s*/g, '', 'heritage: unverified-stories-poly');
      indexHtml = applyExpectedTransform(indexHtml, /"ind_tagai",\s*"ind_bunjil",\s*"ind_waiyungari",\s*"ind_kulkun",\s*"ind_yowie",\s*/g, '', 'heritage: unverified-stories-ind');
      indexHtml = applyExpectedTransform(indexHtml, /"am_navajo_nahookos",\s*"am_lakota_race",\s*"am_ojibwe_fisher",\s*"am_inca_machacuay",\s*"am_pawnee_morning_star",\s*/g, '', 'heritage: unverified-stories-amer');
    }

    // F. TALES Audio Player entries
    if (excludePoly) {
      indexHtml = applyExpectedTransform(indexHtml, /matariki:\['Matariki',\{en:\['Matariki is the Pleiades, a cluster that rises just before dawn in midwinter\.','For the Māori it marks the new year, a time to remember those who passed, celebrate the harvest and plan ahead\.'\]\}\],/, '', 'heritage: tales-matariki');
      indexHtml = applyExpectedTransform(indexHtml, /wayfinders:\['Star navigators',\{en:\['Before compasses, Polynesian navigators memorised where stars rise and set along the horizon\.','Steering by a chain of rising stars, they crossed thousands of kilometres of open ocean\.'\]\}\],/, '', 'heritage: tales-wayfinders');
    }
    if (excludeInd) {
      indexHtml = applyExpectedTransform(indexHtml, /,emu:\['Emu in the Sky',\{en:\['Look for the dark shapes in the Milky Way, not only the bright stars\.','Many Aboriginal peoples see an emu there, with its head in the Coalsack beside the Southern Cross\.','Its changing posture through the year tells when to collect emu eggs\.'\]\}\]/, '', 'heritage: tales-emu');
    }
  }

  // B. Remove "?all=1" footer link from dist
  indexHtml = applyExpectedTransform(indexHtml, /<a\s+href="[^"]*\?all=1"[^>]*>[\s\S]*?<\/a>/gi, '', 'dist: footer-dev-all1-link');

  // C. Remove Dev Mode toggle button from dist
  indexHtml = applyExpectedTransform(indexHtml, /<button[^>]*id="btn-public-toggle"[^>]*>[\s\S]*?<\/button>/gi, '', 'dist: btn-public-toggle');

  // D. Force isPublicBuild to true unconditionally in dist
  indexHtml = applyExpectedTransform(indexHtml, /let\s+isPublicBuild\s*=\s*urlParams\.get\('all'\)\s*!==\s*'1';/g, 'let isPublicBuild = true;', 'dist: isPublicBuild-force-true');

  // E. Post-process absolute OG tags
  indexHtml = postProcessHtml(indexHtml, '', 'index.html');

  // F. Backend URL & Account UI configuration
  const BACKEND_URL = process.env.BACKEND_URL ? process.env.BACKEND_URL.trim() : '';
  const hasSupabase = indexHtml.includes('COSMOS_SUPABASE_CONFIG') || !!process.env.SUPABASE_URL;
  if (BACKEND_URL) {
    indexHtml = indexHtml.replace(/<head>/, `<head><script>window.BACKEND_URL = "${BACKEND_URL}";</script>`);
  } else if (!hasSupabase) {
    // Hide all login/account UI in public build if neither custom backend nor Supabase is configured
    indexHtml = indexHtml.replace(/<a\s+href="[^"]*"[^>]*id="nav-user-chip"[^>]*>[\s\S]*?<\/a>/gi, '');
    indexHtml = indexHtml.replace(/<a\s+href="[^"]*"[^>]*id="footer-account-link"[^>]*>[\s\S]*?<\/a>/gi, '');
    indexHtml = indexHtml.replace(/id="nav-user-chip"/g, 'id="nav-user-chip" style="display:none"');
    indexHtml = indexHtml.replace(/id="footer-account-link"/g, 'id="footer-account-link" style="display:none"');
  }
  // Ensure no login.html links or api/auth calls remain in dist/index.html (defensive sanitization)
  if (/href="login\.html"/i.test(indexHtml)) {
    indexHtml = indexHtml.replace(/href="login\.html"/gi, 'href="#" style="display:none"');
  }
  if (/'login\.html[^']*'/i.test(indexHtml)) {
    indexHtml = indexHtml.replace(/'login\.html[^']*'/gi, "'#'");
  }
  if (/"login\.html[^"]*"/i.test(indexHtml)) {
    indexHtml = indexHtml.replace(/"login\.html[^"]*"/gi, '"#"');
  }
  if (/\/api\/auth/i.test(indexHtml)) {
    indexHtml = indexHtml.replace(/\/api\/auth[^\s'"`]*/gi, '');
  }

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log('Generated dist/index.html with all Brief 10 sanitizations and performance enhancements.\n');

  // 9. Output Report Table for User
  console.log('-----------------------------------------------------------------------------------------------------');
  console.log('| Tradition Code | Tradition Name                         | Raw Total | Public Default | Status     |');
  console.log('-----------------------------------------------------------------------------------------------------');
  for (const r of reportRows) {
    const keyStr = r.key.padEnd(14);
    const nameStr = r.name.padEnd(38);
    const rawStr = String(r.raw).padStart(9);
    const pubStr = String(r.public).padStart(14);
    console.log(`| ${keyStr} | ${nameStr} | ${rawStr} | ${pubStr} | ${r.status}`);
  }
  console.log('-----------------------------------------------------------------------------------------------------');
  console.log(`| TOTAL          | Across all traditions                  | ${String(totalRawStories).padStart(9)} | ${String(totalPublicStories).padStart(14)} |            |`);
  console.log('-----------------------------------------------------------------------------------------------------\n');
  console.log(`✔ Public build successfully written to dist/\n`);

  // 10. Launch Hardening Audit Check: Verify dist/ integrity per policy
  const { runLaunchAudit } = require('./launch-audit');
  runLaunchAudit(DIST_DIR, policy);
}

run();
