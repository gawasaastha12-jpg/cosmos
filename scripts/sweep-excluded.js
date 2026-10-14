const fs = require('fs');
const path = require('path');

const terms = [
  'Hōkūleʻa', 'Hōkūle\'a', 'Hōkūle‘a', 'Hokulea', 'Hokule\'a',
  'Te Punga', 'Matariki', 'Emu', 'Yolngu', 'Djulpan',
  'Māui', 'Maui', 'Maori', 'Māori', 'Aboriginal',
  'Navajo', 'Lakota', 'Ojibwe', "Mi'kmaq", 'Quechua',
  'Maya', 'Aztec', 'Seven Sisters'
];

function scanDir(dir) {
  const hits = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...scanDir(fullPath));
    } else if (/\.(html|json|js|csv)$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const term of terms) {
          if (line.toLowerCase().includes(term.toLowerCase())) {
            hits.push({
              file: path.relative(path.join(__dirname, '..'), fullPath).replace(/\\/g, '/'),
              line: idx + 1,
              term,
              context: line.trim()
            });
            break;
          }
        }
      });
    }
  }
  return hits;
}

const hits = scanDir(path.join(__dirname, '..', 'dist'));
console.log(`Found ${hits.length} occurrences in dist/:`);
hits.forEach(h => {
  console.log(`[${h.file}:${h.line}] (${h.term}) -> ${h.context.slice(0, 140)}`);
});
