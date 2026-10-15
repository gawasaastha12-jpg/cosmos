/**
 * api.js
 * 
 * Lightweight API Router & Persistent Storage for Cosmic AR Explorer:
 * - Stargazer authentication (email/password, magic link)
 * - Deterministic progress synchronization (set-union merging)
 * - Profile and companion mascot management
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

// Ensure users.json exists
function loadDb() {
  try {
    if (!fs.existsSync(USERS_DB_PATH)) {
      const initial = { users: {}, sessions: {}, submissions: [] };
      fs.writeFileSync(USERS_DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(USERS_DB_PATH, 'utf-8'));
  } catch (err) {
    return { users: {}, sessions: {}, submissions: [] };
  }
}

function saveDb(db) {
  fs.writeFileSync(USERS_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return check === hash;
}

function generateToken() {
  return 'stargazer_' + crypto.randomBytes(24).toString('hex');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Main API request handler
async function handleApiRequest(req, res) {
  const urlObj = new URL(req.url, 'http://127.0.0.1:8000');
  const pathname = urlObj.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const db = loadDb();

  // Helper to get authenticated user
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const sessionUserEmail = token && db.sessions[token] ? db.sessions[token].email : null;

  try {
    // 1. REGISTER
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { email, password, callsign } = await parseJsonBody(req);
      if (!email || !password || !callsign) {
        return sendJson(res, 400, { success: false, error: 'Email, password, and callsign are required.' });
      }

      const emailKey = email.toLowerCase().trim();
      if (db.users[emailKey]) {
        return sendJson(res, 409, { success: false, error: 'A stargazer with this email is already registered.' });
      }

      const { hash, salt } = hashPassword(password);
      const user = {
        id: crypto.randomUUID(),
        callsign: callsign.trim(),
        email: emailKey,
        role: 'stargazer',
        hash,
        salt,
        activeCompanion: 'owl',
        createdAt: new Date().toISOString(),
        progress: {
          v: 1,
          xp: 0,
          stars: 0,
          streak: 1,
          lastDay: new Date().toISOString().slice(0, 10),
          lives: 3,
          done: {},
          cards: [],
          achievements: {},
          dailyDone: 0,
          dailyClaimed: false,
          settings: { sound: false, lang: 'en', reducedMotion: false },
          avatar: 'owl',
          onboarded: false,
          lastSyncedAt: new Date().toISOString()
        }
      };

      db.users[emailKey] = user;
      const newToken = generateToken();
      db.sessions[newToken] = { email: emailKey, createdAt: new Date().toISOString() };
      saveDb(db);

      const { hash: _, salt: __, ...safeUser } = user;
      return sendJson(res, 201, { success: true, token: newToken, user: safeUser, progress: user.progress });
    }

    // 2. LOGIN
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await parseJsonBody(req);
      if (!email || !password) {
        return sendJson(res, 400, { success: false, error: 'Email and password required.' });
      }

      const emailKey = email.toLowerCase().trim();
      const user = db.users[emailKey];
      if (!user || !verifyPassword(password, user.hash, user.salt)) {
        return sendJson(res, 401, { success: false, error: 'Invalid stargazer credentials.' });
      }

      const newToken = generateToken();
      db.sessions[newToken] = { email: emailKey, createdAt: new Date().toISOString() };
      saveDb(db);

      const { hash: _, salt: __, ...safeUser } = user;
      return sendJson(res, 200, { success: true, token: newToken, user: safeUser, progress: user.progress });
    }

    // 3. PROGRESS SYNC (Save full user state isolated per user)
    if (pathname === '/api/progress/sync' && req.method === 'POST') {
      if (!sessionUserEmail || !db.users[sessionUserEmail]) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized stargazer session.' });
      }

      const { progress: clientProgress } = await parseJsonBody(req);
      const user = db.users[sessionUserEmail];
      const cur = user.progress || {};

      user.progress = {
        v: 1,
        xp: typeof clientProgress?.xp === 'number' ? clientProgress.xp : (cur.xp || 0),
        stars: typeof clientProgress?.stars === 'number' ? clientProgress.stars : (cur.stars || 0),
        streak: typeof clientProgress?.streak === 'number' ? clientProgress.streak : (cur.streak || 1),
        lastDay: clientProgress?.lastDay || cur.lastDay || new Date().toISOString().slice(0, 10),
        lives: typeof clientProgress?.lives === 'number' ? clientProgress.lives : (cur.lives || 3),
        done: Object.assign({}, cur.done || {}, clientProgress?.done || {}),
        cards: Array.from(new Set([...(cur.cards || []), ...(clientProgress?.cards || [])])),
        achievements: Object.assign({}, cur.achievements || {}, clientProgress?.achievements || {}),
        dailyDone: clientProgress?.dailyDone ?? cur.dailyDone ?? 0,
        dailyClaimed: clientProgress?.dailyClaimed ?? cur.dailyClaimed ?? false,
        settings: Object.assign({}, cur.settings || {}, clientProgress?.settings || {}),
        avatar: clientProgress?.avatar || cur.avatar || 'owl',
        onboarded: clientProgress?.onboarded ?? cur.onboarded ?? false,
        lastSyncedAt: new Date().toISOString()
      };

      saveDb(db);
      return sendJson(res, 200, { success: true, progress: user.progress });
    }



    // 5. GET USER PROFILE
    if (pathname === '/api/user/profile' && req.method === 'GET') {
      if (!sessionUserEmail || !db.users[sessionUserEmail]) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized.' });
      }
      const user = db.users[sessionUserEmail];
      const { hash: _, salt: __, ...safeUser } = user;
      return sendJson(res, 200, { success: true, user: safeUser });
    }

    // 6. LOGOUT
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      if (token && db.sessions[token]) {
        delete db.sessions[token];
        saveDb(db);
      }
      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    // Unknown API endpoint
    return sendJson(res, 404, { success: false, error: 'API route not found' });
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { success: false, error: 'Internal observatory server error' });
  }
}

module.exports = { handleApiRequest };
