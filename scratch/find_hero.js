const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('<h1') || l.includes('hero') || l.includes('headline')) {
    console.log(`${i+1}: ${l.trim().slice(0, 140)}`);
  }
});
