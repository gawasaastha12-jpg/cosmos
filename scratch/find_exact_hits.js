const fs = require('fs');
const path = require('path');

const terms = [
  'Hōkūleʻa',
  'Te Punga',
  'Matariki',
  'Emu',
  'Yolngu',
  'Djulpan',
  'Māui',
  'Maori',
  'Aboriginal',
  'Navajo',
  'Lakota',
  'Ojibwe',
  "Mi'kmaq",
  'Quechua',
  'Maya',
  'Aztec',
  'Seven Sisters'
];

// We search index.html and every data file in dist/
const distDir = path.join(__dirname, '..', 'dist');

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = getAllFiles(distDir);
const targetFiles = allFiles.filter(f => {
  const rel = path.relative(distDir, f).replace(/\\/g, '/');
  // target index.html and every data file (json/csv)
  if (rel === 'index.html') return true;
  if (rel.endsWith('.json') || rel.endsWith('.csv')) return true;
  return false;
});

console.log('Target files to sweep in dist/:', targetFiles.map(f => path.relative(distDir, f)));

const hits = [];

for (const f of targetFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');
  const relPath = 'dist/' + path.relative(distDir, f).replace(/\\/g, '/');
  
  lines.forEach((line, idx) => {
    for (const term of terms) {
      const normLine = line.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’ʻ`]/g, '');
      const normTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’ʻ`]/g, '');
      const pattern = new RegExp('(^|[^a-zA-Z0-9])' + normTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zA-Z0-9]|$)', 'i');
      if (pattern.test(normLine)) {
        hits.push({
          file: relPath,
          line: idx + 1,
          term: term,
          context: line.trim()
        });
      }
    }
  });
}

fs.writeFileSync(path.join(__dirname, 'all_hits.json'), JSON.stringify(hits, null, 2), 'utf-8');
console.log(`Saved ${hits.length} hits to scratch/all_hits.json`);
