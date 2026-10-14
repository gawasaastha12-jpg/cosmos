const fs = require('fs');
const path = require('path');

const terms = [
  'Hōkūleʻa', 'Hokulea', 'Te Punga', 'Matariki', 'Emu', 'Yolngu', 'Djulpan',
  'Māui', 'Maui', 'Maori', 'Māori', 'Aboriginal', 'Navajo', 'Lakota',
  'Ojibwe', "Mi'kmaq", 'Mikmaq', 'Quechua', 'Maya', 'Aztec', 'Seven Sisters'
];

function scanDir(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(scanDir(full));
    } else if (item.endsWith('.html') || item.endsWith('.json') || item.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = scanDir('dist');
console.log('Scanning files in dist:', allFiles.length);

const hits = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const term of terms) {
      // Use regex with word boundary
      const cleanTerm = term.replace("'", "['’]?");
      const regex = new RegExp(`\\b${cleanTerm}\\b`, 'i');
      if (regex.test(line)) {
        hits.push({ file: path.relative('.', file), lineNum: idx + 1, term, context: line.trim().slice(0, 140) });
      }
    }
  });
}

console.log('Total hits found:', hits.length);
hits.forEach(h => console.log(`[${h.file}:${h.lineNum}] (Term: ${h.term}) -> ${h.context}`));
