const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '..', 'login.html');
let s = fs.readFileSync(loginPath, 'utf8');

// 1. Add active-session banner right above status-banner
const bannerHtml = `        <!-- Active Session Banner with Logout Option -->
        <div id="active-session-banner" style="display:none;background:rgba(93,224,208,.08);border:1px solid rgba(93,224,208,.25);border-radius:14px;padding:12px 16px;margin-bottom:18px;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="font-size:13px;color:var(--ink)">
            <span>Active Callsign: <b id="active-session-callsign" style="color:var(--myth)"></b></span><br>
            <span id="active-session-email" style="font-size:11px;color:var(--mut)"></span>
          </div>
          <div style="display:flex;gap:8px">
            <a href="index.html#home" class="chip-btn" style="text-decoration:none;font-size:12px">Return to Sky</a>
            <button type="button" class="chip-btn" style="background:rgba(255,107,139,.18);border-color:rgba(255,107,139,.4);color:#ff8b8b;font-size:12px" onclick="logoutFromLogin()">Log Out</button>
          </div>
        </div>

        <!-- Status Message Banner -->`;

s = s.replace('<!-- Status Message Banner -->', bannerHtml);

// 2. Update session storage logic in handleAuthSubmit
const oldSessionStorage = `        // Persist session to local SAVE state for seamless client integration
        try {
          const rawSave = localStorage.getItem('cosmos_save_v1');
          const save = rawSave ? JSON.parse(rawSave) : {};
          save.token = resData.token;
          save.user = resData.user;
          if (resData.progress) {
            save.completed = Array.from(new Set([...(save.completed || []), ...(resData.progress.completed || [])]));
            save.unlockedCards = Array.from(new Set([...(save.unlockedCards || []), ...(resData.progress.unlockedCards || [])]));
            save.badges = Array.from(new Set([...(save.badges || []), ...(resData.progress.badges || [])]));
          }
          localStorage.setItem('cosmos_save_v1', JSON.stringify(save));
        } catch (err) {}`;

const newSessionStorage = `        // Persist active session and isolate user-specific progress
        try {
          const activeSession = { token: resData.token, user: resData.user };
          localStorage.setItem('cosmos_active_session', JSON.stringify(activeSession));

          const userKey = 'cosmos_save_user_' + resData.user.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const existingUserSave = localStorage.getItem(userKey);
          let userProgress = existingUserSave ? JSON.parse(existingUserSave) : null;
          if (!userProgress || !userProgress.v) {
            userProgress = resData.progress || {
              v: 1, xp: 0, stars: 0, streak: 1, lastDay: new Date().toISOString().slice(0,10),
              lives: 3, done: {}, cards: [], achievements: {}, dailyDone: 0, dailyClaimed: false,
              settings: { sound: false, lang: 'en', reducedMotion: false }, avatar: 'owl', onboarded: false
            };
          } else if (resData.progress) {
            userProgress.done = Object.assign(userProgress.done || {}, resData.progress.done || {});
            userProgress.cards = Array.from(new Set([...(userProgress.cards || []), ...(resData.progress.cards || [])]));
            userProgress.achievements = Object.assign(userProgress.achievements || {}, resData.progress.achievements || {});
            userProgress.xp = typeof resData.progress.xp === 'number' ? resData.progress.xp : userProgress.xp;
            userProgress.stars = typeof resData.progress.stars === 'number' ? resData.progress.stars : userProgress.stars;
          }
          userProgress.user = resData.user;
          userProgress.token = resData.token;
          localStorage.setItem(userKey, JSON.stringify(userProgress));
        } catch (err) {}`;

const normS = s.replace(/\r\n/g, '\n');
const normOld = oldSessionStorage.replace(/\r\n/g, '\n');
const normNew = newSessionStorage.replace(/\r\n/g, '\n');

if (normS.includes(normOld)) {
  s = normS.replace(normOld, normNew);
} else {
  console.error('Session storage block not found');
}

// 3. Add checkActiveSession and logoutFromLogin to script
const scriptExtension = `    // --- 8. Active Session & Log Out Handler ---
    function checkActiveSession() {
      const banner = document.getElementById('active-session-banner');
      if (!banner) return;
      try {
        const raw = localStorage.getItem('cosmos_active_session');
        if (raw) {
          const sess = JSON.parse(raw);
          if (sess && sess.user && sess.user.callsign) {
            banner.style.display = 'flex';
            document.getElementById('active-session-callsign').textContent = sess.user.callsign;
            document.getElementById('active-session-email').textContent = sess.user.email || '';
            return;
          }
        }
      } catch(e){}
      banner.style.display = 'none';
    }
    checkActiveSession();

    async function logoutFromLogin() {
      try {
        const raw = localStorage.getItem('cosmos_active_session');
        if (raw) {
          const sess = JSON.parse(raw);
          if (sess.token) {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sess.token }
            });
          }
        }
      } catch(e){}
      localStorage.removeItem('cosmos_active_session');
      checkActiveSession();
      showStatus('✦ Successfully logged out. Enter credentials to sign into another account.', 'success');
    }
  </script>`;

s = s.replace('  </script>', scriptExtension);

fs.writeFileSync(loginPath, s.replace(/\n/g, '\r\n'), 'utf8');
console.log('SUCCESSFULLY_UPDATED_LOGIN_HTML');
