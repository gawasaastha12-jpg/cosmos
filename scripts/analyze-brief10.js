const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

// 1. Check CI (Constellation info)
const ciMatch = html.match(/const CI\s*=\s*\{([\s\S]*?)\n\};/);
if (ciMatch) {
  console.log('--- CI CONSTELLATION INFO MATCHES ---');
  const lines = ciMatch[1].split('\n');
  lines.forEach((l, i) => {
    if (/hōkūle|punga|matariki|emu|yolngu|djulpan|māui|maui|maori|aboriginal|navajo|lakota|ojibwe|quechua|maya|aztec|seven sisters/i.test(l)) {
      console.log(`CI line ${i + 1}: ${l.trim()}`);
    }
  });
}

// 2. Check Q (Quiz questions)
const qMatch = html.match(/(?:const|let)\s+Q\s*=\s*\[([\s\S]*?)\];/);
if (qMatch) {
  console.log('\n--- QUIZ QUESTIONS (Q) MATCHES ---');
  const lines = qMatch[1].split('\n');
  lines.forEach((l, i) => {
    if (/hōkūle|punga|matariki|emu|yolngu|djulpan|māui|maui|maori|aboriginal|navajo|lakota|ojibwe|quechua|maya|aztec/i.test(l)) {
      console.log(`Q item ${i + 1}: ${l.trim()}`);
    }
  });
}

// 3. Check match-pairs
console.log('\n--- MATCH-PAIR GAME MATCHES ---');
const mpRegex = /\[\s*['"][^'"]+['"]\s*,\s*['"][^'"]+['"]\s*\]/g;
const mpSection = html.match(/(?:pairs|match|cards)[\s\S]{0,500}\[\s*\[[\s\S]*?\]\s*\]/i);
if (mpSection) {
  console.log('Match section:', mpSection[0].slice(0, 300));
}

// Look for lines containing ['Te Punga'
const allLines = html.split('\n');
allLines.forEach((l, i) => {
  if (l.includes("'Te Punga'") || l.includes('"Te Punga"') || l.includes("'Emu in Sky'")) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});

// 4. Check collection cards & journeys
console.log('\n--- COLLECTION CARDS & JOURNEYS MATCHES ---');
allLines.forEach((l, i) => {
  if (l.includes('c3_1') || l.includes('c3_4') || l.includes('c3_6') || l.includes('collection') || l.includes('card')) {
    if (/hōkūle|punga|matariki|emu|yolngu|djulpan|māui|maui|maori|aboriginal|navajo|lakota|ojibwe|quechua|maya|aztec/i.test(l)) {
      console.log(`Card/Journey Line ${i + 1}: ${l.trim()}`);
    }
  }
});
