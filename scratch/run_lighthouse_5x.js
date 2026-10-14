const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const runs = 5;
const results = [];
const nonSameOriginRequests = new Set();

console.log(`Starting 5x Lighthouse Mobile Audit on http://localhost:8000/dist/ ...`);

for (let i = 1; i <= runs; i++) {
  const outPath = path.join(__dirname, `lh_${i}.json`);
  console.log(`[Run ${i}/${runs}] Running Lighthouse...`);
  try {
    execSync(`npx lighthouse http://localhost:8000/dist/ --chrome-flags="--headless" --output=json --output-path="${outPath}" --only-categories=performance --form-factor=mobile --screenEmulation.mobile=true`, {
      stdio: 'pipe'
    });
    const data = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    const score = Math.round(data.categories.performance.score * 100);
    const lcpMs = Math.round(data.audits['largest-contentful-paint'].numericValue);
    const tbtMs = Math.round(data.audits['total-blocking-time'].numericValue);
    const cls = data.audits['cumulative-layout-shift'].numericValue;
    
    // Check network requests on first load
    const requests = data.audits['network-requests']?.details?.items || [];
    requests.forEach(r => {
      try {
        const u = new URL(r.url);
        if (u.origin !== 'http://localhost:8000') {
          nonSameOriginRequests.add(r.url);
        }
      } catch (_) {}
    });

    // Identify LCP element
    let lcpElement = 'Unknown';
    const breakdown = data.audits['lcp-breakdown-insight']?.details?.items || [];
    const nodeItem = breakdown.find(item => item.type === 'node');
    if (nodeItem) {
      lcpElement = `${nodeItem.nodeLabel || ''} (${nodeItem.selector || nodeItem.snippet || ''})`;
    } else if (data.audits['largest-contentful-paint-element']?.details?.items?.[0]) {
      const it = data.audits['largest-contentful-paint-element'].details.items[0];
      lcpElement = `${it.node?.nodeLabel || ''} (${it.node?.selector || it.node?.snippet || ''})`;
    }

    results.push({ run: i, score, lcpMs, tbtMs, cls, lcpElement });
    console.log(`  -> Run ${i}: Score = ${score}, LCP = ${lcpMs} ms, TBT = ${tbtMs} ms, CLS = ${cls}, LCP Element: ${lcpElement}`);
  } catch (err) {
    console.error(`  -> Run ${i} failed:`, err.message);
  }
}

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { min, median, max };
}

const scores = stats(results.map(r => r.score));
const lcps = stats(results.map(r => r.lcpMs));
const tbts = stats(results.map(r => r.tbtMs));

const summary = {
  runs: results,
  score: scores,
  lcp: lcps,
  tbt: tbts,
  nonSameOriginCount: nonSameOriginRequests.size,
  nonSameOriginUrls: [...nonSameOriginRequests]
};

fs.writeFileSync(path.join(__dirname, 'lh_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
console.log('\n--- 5-RUN LIGHTHOUSE MOBILE BENCHMARK SUMMARY ---');
console.log(`Performance Score : Min = ${scores.min}, Median = ${scores.median}, Max = ${scores.max}`);
console.log(`LCP (ms)          : Min = ${lcps.min} ms, Median = ${lcps.median} ms, Max = ${lcps.max} ms`);
console.log(`TBT (ms)          : Min = ${tbts.min} ms, Median = ${tbts.median} ms, Max = ${tbts.max} ms`);
console.log(`Non-Same-Origin Requests: ${nonSameOriginRequests.size}`);
if (nonSameOriginRequests.size > 0) {
  console.log('Third party requests found:', [...nonSameOriginRequests]);
} else {
  console.log('CONFIRMED: ZERO non-same-origin requests on initial load (100% self-hosted).');
}
