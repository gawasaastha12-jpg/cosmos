/**
 * scripts/test-audit-negative.js
 * Negative testing for launch audit:
 * Verifies that injecting 'service_role' or an excluded tradition reference causes failure.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('--- Running Negative Audit Security Tests ---');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html does not exist. Run build-public.js first.');
  process.exit(1);
}

const originalHtml = fs.readFileSync(indexPath, 'utf8');

// Case 1: Injected service_role
console.log('\n[Case 1] Injected "service_role" check:');
fs.writeFileSync(indexPath, originalHtml + '\n<!-- service_role leaked key -->', 'utf8');

const runCase1 = spawnSync(process.execPath, [
  '-e',
  `const { runLaunchAudit } = require('./scripts/launch-audit'); runLaunchAudit('dist', { excludePendingCommunityReview: true, expectedPublicCount: 109 });`
], { encoding: 'utf8' });

fs.writeFileSync(indexPath, originalHtml, 'utf8');

if (runCase1.status === 1 && runCase1.stderr.includes('service_role')) {
  console.log('✔ PASS: Audit caught injected service_role and exited with code 1.');
} else {
  console.error('❌ FAIL: Audit did not catch injected service_role. Status:', runCase1.status);
  process.exit(1);
}

// Case 2: Injected excluded tradition reference (data-trad="poly")
console.log('\n[Case 2] Injected data-trad="poly" reference check:');
fs.writeFileSync(indexPath, originalHtml + '\n<div data-trad="poly">Excluded item</div>', 'utf8');

const runCase2 = spawnSync(process.execPath, [
  '-e',
  `const { runLaunchAudit } = require('./scripts/launch-audit'); runLaunchAudit('dist', { excludePendingCommunityReview: true, expectedPublicCount: 109 });`
], { encoding: 'utf8' });

fs.writeFileSync(indexPath, originalHtml, 'utf8');

if (runCase2.status === 1 && runCase2.stderr.includes('excluded tradition reference')) {
  console.log('✔ PASS: Audit caught injected data-trad="poly" reference and exited with code 1.');
} else {
  console.error('❌ FAIL: Audit did not catch injected tradition. Status:', runCase2.status, runCase2.stderr);
  process.exit(1);
}

// Case 3: Injected story count mismatch
console.log('\n[Case 3] Public story count mismatch check:');
const runCase3 = spawnSync(process.execPath, [
  '-e',
  `const { runLaunchAudit } = require('./scripts/launch-audit'); runLaunchAudit('dist', { excludePendingCommunityReview: true, expectedPublicCount: 999 });`
], { encoding: 'utf8' });

if (runCase3.status === 1 && runCase3.stderr.includes('public story count 109 != expected 999')) {
  console.log('✔ PASS: Audit caught story count mismatch and exited with code 1.');
} else {
  console.error('❌ FAIL: Audit did not catch story count mismatch. Status:', runCase3.status);
  process.exit(1);
}

console.log('\n✔ All negative launch audit tests passed successfully.');
