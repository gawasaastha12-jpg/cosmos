const fs = require('fs');
const path = require('path');

function removeSpine(relPath) {
  const filePath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Match the .book-spread::before rule
  const target = `    /* Central Book Spine Divider */
    .book-spread::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: calc(100% / 2.25);
      width: 24px;
      transform: translateX(-50%);
      background: linear-gradient(90deg, 
        rgba(0, 0, 0, 0.35) 0%, 
        rgba(0, 0, 0, 0.6) 45%, 
        rgba(255, 255, 255, 0.05) 50%, 
        rgba(0, 0, 0, 0.6) 55%, 
        rgba(0, 0, 0, 0.35) 100%);
      pointer-events: none;
      z-index: 10;
    }`;

  if (content.includes(target)) {
    content = content.replace(target, '    /* Central Book Spine Divider Removed */\n    .book-spread::before { display: none !important; }');
    console.log(`✔ Successfully removed central book spine divider from ${relPath}`);
  } else {
    // Regex fallback
    content = content.replace(/\.book-spread::before\s*\{[\s\S]*?z-index:\s*10;\s*\}/, '.book-spread::before { display: none !important; }');
    console.log(`✔ Applied regex removal to ${relPath}`);
  }

  // Soften the boundary border between left and right pages so it's a seamless clean division
  content = content.replace(
    'border-right: 1px solid rgba(255, 255, 255, 0.06);',
    'border-right: 1px solid rgba(150, 168, 255, 0.12);'
  );

  fs.writeFileSync(filePath, content, 'utf-8');
}

removeSpine('audio.html');
removeSpine('dist/audio.html');
