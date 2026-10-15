/**
 * scripts/test-astro.js
 * Test astrometry calculations (GMST, LST, precession, and Polaris altitude).
 */

const { selfTest, gmstDeg, lstDeg, precessToDate, altAz, norm360 } = await import('../js/astro.js');

console.log('--- Running Astro Self-Test ---');
const res = selfTest();
console.log('selfTest() result:', res);

const latExpected = 16.7;
const altDiff = Math.abs(res.polarisAlt - latExpected);
console.log(`Polaris altitude: ${res.polarisAlt.toFixed(4)}° (Observer lat: ${latExpected}°, diff: ${altDiff.toFixed(4)}°)`);

if (!res.gmstOk) {
  console.error('FAIL: GMST J2000 degree calculation is incorrect.');
  process.exit(1);
}

if (altDiff > 1.0) {
  console.error(`FAIL: Polaris altitude diff ${altDiff}° exceeds 1.0° tolerance.`);
  process.exit(1);
}

// Test norm360 negative angle normalization
if (norm360(-45) !== 315 || norm360(725) !== 5) {
  console.error('FAIL: norm360 failed to normalize angles correctly.');
  process.exit(1);
}

// Test precession in 2026: Polaris / J2000 offset
const jd2026 = 2461055.5; // ~2026
const prec = precessToDate(37.95, 89.26, jd2026);
console.log(`Polaris J2000 (37.95°, 89.26°) precessed to 2026: ra=${prec.ra.toFixed(2)}°, dec=${prec.dec.toFixed(2)}°`);

console.log('✔ Astro tests passed successfully.');
process.exit(0);
