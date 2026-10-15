const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(indexPath, 'utf8');

const target = `// Load saved data
try {
  const loaded = localStorage.getItem(SAVE_KEY);
  if (loaded) {
    const parsed = JSON.parse(loaded);
    if (parsed && parsed.v === 1) {
      SAVE = Object.assign(SAVE, parsed);
      // Daily streak check
      const today = new Date().toISOString().slice(0,10);
      if (SAVE.lastDay !== today) {
        const prev = new Date();
        prev.setDate(prev.getDate() - 1);
        const yest = prev.toISOString().slice(0,10);
        if (SAVE.lastDay === yest) {
          SAVE.streak = (SAVE.streak || 1) + 1;
        } else {
          SAVE.streak = 1;
        }
        SAVE.lastDay = today;
        SAVE.dailyDone = 0;
        SAVE.dailyClaimed = false;
        SAVE.lives = 3;
      }
    }
  }
} catch (e) { console.warn('Storage unavailable', e); }

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch(e){}
  updateHUD();
  checkAchievements();
  if (SAVE && SAVE.token) syncProgressWithCloud();
}

function updateNavUser() {
  const chip = document.getElementById('nav-user-chip');
  const label = document.getElementById('nav-user-label');
  if (!chip || !label) return;
  if (typeof SAVE !== 'undefined' && SAVE && SAVE.user && SAVE.user.callsign) {
    label.textContent = SAVE.user.callsign;
    chip.style.color = 'var(--sci)';
    chip.title = 'Stargazer Callsign: ' + SAVE.user.callsign + ' (Role: ' + (SAVE.user.role || 'stargazer') + ')';
  } else {
    label.textContent = 'Sign In';
    chip.style.color = 'var(--mut)';
    chip.title = 'Stargazer Access';
  }
}
updateNavUser();

async function syncProgressWithCloud() {
  if (typeof SAVE === 'undefined' || !SAVE || !SAVE.token) return;
  try {
    const res = await fetch('/api/progress/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SAVE.token
      },
      body: JSON.stringify({
        progress: {
          completed: Object.keys(SAVE.done || {}),
          unlockedCards: SAVE.cards || [],
          badges: Object.keys(SAVE.achievements || {})
        }
      })
    }).then(r => r.json());
    if (res && res.success && res.progress) {
      if (res.progress.unlockedCards) {
        SAVE.cards = Array.from(new Set([...(SAVE.cards || []), ...res.progress.unlockedCards]));
      }
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch(e){}
    }
  } catch (e) {}
}
if (typeof SAVE !== 'undefined' && SAVE && SAVE.token) {
  syncProgressWithCloud();
}`;

const replacement = `// Per-user isolated storage & session management
function getActiveSession() {
  try {
    const raw = localStorage.getItem('cosmos_active_session');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function getSaveKey() {
  const sess = getActiveSession();
  if (sess && sess.user && sess.user.email) {
    return 'cosmos_save_user_' + sess.user.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  return 'cosmos_save_guest';
}

function createDefaultProgress() {
  return {
    v: 1,
    xp: 0,
    stars: 0,
    streak: 1,
    lastDay: new Date().toISOString().slice(0,10),
    lives: 3,
    done: {},
    cards: [],
    achievements: {},
    dailyDone: 0,
    dailyClaimed: false,
    settings: { sound: false, lang: 'en', reducedMotion: false },
    avatar: 'owl',
    onboarded: false
  };
}

function loadCurrentProgress() {
  const sess = getActiveSession();
  const key = getSaveKey();
  let progress = createDefaultProgress();
  try {
    const loaded = localStorage.getItem(key);
    if (loaded) {
      const parsed = JSON.parse(loaded);
      if (parsed && parsed.v === 1) progress = Object.assign(progress, parsed);
    }
  } catch (e) { console.warn('Storage unavailable', e); }

  if (sess && sess.user) {
    progress.user = sess.user;
    progress.token = sess.token;
  } else {
    progress.user = null;
    progress.token = null;
  }

  // Daily streak check
  const today = new Date().toISOString().slice(0,10);
  if (progress.lastDay !== today) {
    const prev = new Date();
    prev.setDate(prev.getDate() - 1);
    const yest = prev.toISOString().slice(0,10);
    if (progress.lastDay === yest) {
      progress.streak = (progress.streak || 1) + 1;
    } else {
      progress.streak = 1;
    }
    progress.lastDay = today;
    progress.dailyDone = 0;
    progress.dailyClaimed = false;
    progress.lives = 3;
  }

  return progress;
}

SAVE = loadCurrentProgress();

function saveGame() {
  try {
    const key = getSaveKey();
    localStorage.setItem(key, JSON.stringify(SAVE));
  } catch(e){}
  updateHUD();
  checkAchievements();
  if (SAVE && SAVE.token) syncProgressWithCloud();
}

function updateNavUser() {
  const chip = document.getElementById('nav-user-chip');
  const label = document.getElementById('nav-user-label');
  if (!chip || !label) return;
  if (typeof SAVE !== 'undefined' && SAVE && SAVE.user && SAVE.user.callsign) {
    label.textContent = SAVE.user.callsign;
    chip.style.color = 'var(--sci)';
    chip.title = 'Stargazer Callsign: ' + SAVE.user.callsign + ' (Click to manage account / log out)';
    chip.onclick = e => {
      e.preventDefault();
      openStargazerModal();
    };
  } else {
    label.textContent = 'Sign In';
    chip.style.color = 'var(--mut)';
    chip.title = 'Stargazer Access';
    chip.onclick = null;
    chip.href = 'login.html';
  }
}
updateNavUser();

function openStargazerModal() {
  const d = $('#dlg');
  if (!d || !SAVE.user) return;
  const user = SAVE.user;
  const m = COMPANIONS[SAVE.avatar] || COMPANIONS.owl;
  const cardCount = (SAVE.cards || []).length;
  const doneCount = Object.keys(SAVE.done || {}).length;

  d.className = 'wide game-modal';
  d.innerHTML = \`
    <div class="modal-header">
      <div>
        <h3 style="display:flex;align-items:center;gap:8px"><span>✦</span> Stargazer Observatory Profile</h3>
        <p style="font-size:12px;color:var(--mut);margin-top:2px">Observatory Station Session · Isolated Stargazer Progress</p>
      </div>
      <button class="modal-close" onclick="$('#dlg').close()" aria-label="Close modal">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;background:rgba(255,255,255,.03);border:1px solid var(--bd);border-radius:16px;padding:16px;margin:16px 0">
      <div style="font-size:48px;background:rgba(123,140,255,.12);border:1px solid rgba(123,140,255,.3);width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center">
        \${m.icon}
      </div>
      <div>
        <div style="font-size:20px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px">
          <span>\${user.callsign}</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(93,224,208,.15);color:var(--sci);border:1px solid rgba(93,224,208,.3)">\${user.role || 'stargazer'}</span>
        </div>
        <div style="font-size:13px;color:var(--mut);margin-top:2px">\${user.email || ''}</div>
        <div style="font-size:12px;color:var(--myth);margin-top:4px">Active Companion: \${m.name}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:20px">
      <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.02);border:1px solid var(--bd);border-radius:12px">
        <div style="font-size:20px;font-weight:700;color:#ffd27a">⭐ \${SAVE.stars || 0}</div>
        <div style="font-size:11px;color:var(--mut)">Stars Earned</div>
      </div>
      <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.02);border:1px solid var(--bd);border-radius:12px">
        <div style="font-size:20px;font-weight:700;color:var(--sci)">✦ \${SAVE.xp || 0}</div>
        <div style="font-size:11px;color:var(--mut)">Stardust XP</div>
      </div>
      <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.02);border:1px solid var(--bd);border-radius:12px">
        <div style="font-size:20px;font-weight:700;color:#a8c2ff">🪐 \${doneCount}/15</div>
        <div style="font-size:11px;color:var(--mut)">Quests Cleared</div>
      </div>
      <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.02);border:1px solid var(--bd);border-radius:12px">
        <div style="font-size:20px;font-weight:700;color:var(--myth)">🃏 \${cardCount}/21</div>
        <div style="font-size:11px;color:var(--mut)">Cards Unlocked</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid var(--bd);flex-wrap:wrap;gap:10px">
      <div style="font-size:12px;color:var(--sci);display:flex;align-items:center;gap:6px">
        <span>🟢</span> Synchronized with Cloud Database
      </div>
      <div style="display:flex;gap:10px">
        <a href="login.html" class="btn" style="font-size:13px;text-decoration:none">Switch Account</a>
        <button class="btn" style="font-size:13px;background:rgba(255,107,139,.18);border-color:rgba(255,107,139,.4);color:#ff8b8b" onclick="logoutStargazer()">Log Out</button>
      </div>
    </div>
  \`;
  d.showModal();
}

async function logoutStargazer() {
  const callsign = SAVE.user ? SAVE.user.callsign : 'Stargazer';
  if (SAVE && SAVE.token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SAVE.token
        }
      });
    } catch(e){}
  }
  localStorage.removeItem('cosmos_active_session');
  SAVE = loadCurrentProgress();
  updateNavUser();
  updateHUD();
  renderTrail();
  const d = $('#dlg');
  if (d && d.open) d.close();
  showToast('🌌', 'Observatory Log Out', \`Logged out of \${callsign}. Switched to Guest Sky.\`);
}

async function syncProgressWithCloud() {
  if (typeof SAVE === 'undefined' || !SAVE || !SAVE.token) return;
  try {
    const res = await fetch('/api/progress/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SAVE.token
      },
      body: JSON.stringify({
        progress: {
          xp: SAVE.xp || 0,
          stars: SAVE.stars || 0,
          streak: SAVE.streak || 1,
          lives: SAVE.lives || 3,
          done: SAVE.done || {},
          cards: SAVE.cards || [],
          achievements: SAVE.achievements || {},
          dailyDone: SAVE.dailyDone || 0,
          dailyClaimed: SAVE.dailyClaimed || false,
          avatar: SAVE.avatar || 'owl',
          settings: SAVE.settings || {}
        }
      })
    }).then(r => r.json());
    if (res && res.success && res.progress) {
      const p = res.progress;
      SAVE.xp = typeof p.xp === 'number' ? p.xp : SAVE.xp;
      SAVE.stars = typeof p.stars === 'number' ? p.stars : SAVE.stars;
      SAVE.done = Object.assign(SAVE.done || {}, p.done || {});
      SAVE.cards = Array.from(new Set([...(SAVE.cards || []), ...(p.cards || [])]));
      SAVE.achievements = Object.assign(SAVE.achievements || {}, p.achievements || {});
      const key = getSaveKey();
      try { localStorage.setItem(key, JSON.stringify(SAVE)); } catch(e){}
      updateHUD();
      renderTrail();
    }
  } catch (e) {}
}
if (typeof SAVE !== 'undefined' && SAVE && SAVE.token) {
  syncProgressWithCloud();
}`;

const normS = s.replace(/\r\n/g, '\n');
const normT = target.replace(/\r\n/g, '\n');

if (normS.includes(normT)) {
  const newNormS = normS.replace(normT, replacement);
  fs.writeFileSync(indexPath, newNormS.replace(/\n/g, '\r\n'), 'utf8');
  console.log('SUCCESSFULLY_UPDATED_INDEX_HTML');
} else {
  console.error('Target block not found in index.html');
}
