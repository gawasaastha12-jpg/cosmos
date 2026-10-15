// Astrometry core. Angles in degrees; longitude east-positive (matches Geolocation API).
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const norm360 = (x) => ((x % 360) + 360) % 360;   // JS % keeps the sign; this fixes it

export const julianDate = (ms = Date.now()) => ms / 86400000 + 2440587.5;

export function gmstDeg(jd = julianDate()) {
  const d = jd - 2451545.0;                               // full JD incl. fraction: correct
  return norm360((18.697374558 + 24.06570982441908 * d) * 15);
}
export const lstDeg = (lonEastDeg, jd = julianDate()) => norm360(gmstDeg(jd) + lonEastDeg);

// J2000 -> equinox of date (IAU 1976). Catalog RA/Dec (BSC5/Hipparcos) are J2000.
// Skipping this is ~0.36 deg off in 2026: invisible on a globe, visible in AR overlay.
export function precessToDate(raDeg, decDeg, jd = julianDate()) {
  const T = (jd - 2451545.0) / 36525, s = 1 / 3600;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) * s * D2R;
  const z    = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) * s * D2R;
  const th   = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) * s * D2R;
  const a = raDeg * D2R + zeta, d = decDeg * D2R;
  const A = Math.cos(d) * Math.sin(a);
  const B = Math.cos(th) * Math.cos(d) * Math.cos(a) - Math.sin(th) * Math.sin(d);
  const C = Math.sin(th) * Math.cos(d) * Math.cos(a) + Math.cos(th) * Math.sin(d);
  return { ra: norm360(Math.atan2(A, B) * R2D + z * R2D), dec: Math.asin(Math.max(-1, Math.min(1, C))) * R2D };
}

// Altitude + azimuth (azimuth from North, increasing East). No refraction applied.
export function altAz(raDeg, decDeg, latDeg, lonEastDeg, jd = julianDate()) {
  const ha = (lstDeg(lonEastDeg, jd) - raDeg) * D2R;
  const phi = latDeg * D2R, dec = decDeg * D2R;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));   // clamp: float error can exceed 1
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI;
  return { alt: alt * R2D, az: norm360(az * R2D) };
}

export function selfTest() {
  const gmst = gmstDeg(2451545.0);                        // J2000.0 -> 280.46061837 deg
  const polaris = altAz(37.95, 89.26, 16.7, 74.2).alt;    // Kolhapur: should be ~ latitude
  return { gmstOk: Math.abs(gmst - 280.46061837) < 1e-6, polarisAlt: polaris };
}

if (typeof globalThis !== 'undefined') {
  globalThis.Astro = { norm360, julianDate, gmstDeg, lstDeg, precessToDate, altAz, selfTest };
}
