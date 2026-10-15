const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
const lines = html.split('\n');
const line = lines.find(l => l.includes('const CI={')) || '';
const m = line.match(/const CI=\{([\s\S]*?)\};/);
if (m) {
  const ci = eval('({' + m[1] + '})');
  console.log('Constellations in CI:', Object.keys(ci));
  const terms = ['Hōkūleʻa', 'Hōkūle\'a', 'Hokulea', 'Te Punga', 'Matariki', 'Emu', 'Yolngu', 'Djulpan', 'Māui', 'Maui', 'Maori', 'Māori', 'Aboriginal', 'Navajo', 'Lakota', 'Ojibwe', 'Quechua', 'Maya', 'Aztec', 'Seven Sisters'];
  for (const [k, v] of Object.entries(ci)) {
    const s = JSON.stringify(v);
    for (const t of terms) {
      if (s.toLowerCase().includes(t.toLowerCase())) {
        console.log(`CI[${k}] matches ${t}: ${s}`);
      }
    }
  }
}
