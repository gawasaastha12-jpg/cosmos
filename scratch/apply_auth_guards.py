import sys
import re

print("Applying authentication gates...")

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

# Replace routing block
old_routing = """/* ---------- routing ---------- */
let page='home';
function go(n){page=n;$$('.pg').forEach(p=>p.classList.toggle('on',p.id===n));$$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.go===n));
const cv=$('#cv');if(cv)cv.style.display=n==='home'?'block':'none';const lbs=$('#lbs');if(lbs&&n!=='home')lbs.style.display='none';if(n!=='home'&&window.R)R.clear();
document.body.classList.toggle('warm',n==='myth');scrollTo(0,0);if(n!=='home')stopV();fit();location.hash=n;if(n==='myth'){loadMythData();renderMyth();if(!avR&&window.THREE)initAvatar();resizeAv();}if(n==='play'){renderQ();renderFM();}if(n==='home')tryInit3D();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});"""

new_routing = """/* ---------- session & routing guards ---------- */
function getActiveSession() {
  try {
    const raw = localStorage.getItem('cosmos_active_session');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

let page='home';
function go(n){
  if (['sci', 'myth', 'play'].includes(n) && !getActiveSession()) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent('index.html#' + n);
    return;
  }
  page=n;
  $$('.pg').forEach(p=>p.classList.toggle('on',p.id===n));
  $$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.go===n));
  const cv=$('#cv');if(cv)cv.style.display=n==='home'?'block':'none';
  const lbs=$('#lbs');if(lbs&&n!=='home')lbs.style.display='none';
  if(n!=='home'&&window.R)R.clear();
  document.body.classList.toggle('warm',n==='myth');
  scrollTo(0,0);
  if(n!=='home')stopV();
  fit();
  location.hash=n;
  if(n==='myth'){loadMythData();renderMyth();if(!avR&&window.THREE)initAvatar();resizeAv();}
  if(n==='play'){renderQ();renderFM();}
  if(n==='home')tryInit3D();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');
  if(b) go(b.dataset.go);
  const a=e.target.closest('a[href="audio.html"]');
  if(a && !getActiveSession()){
    e.preventDefault();
    window.location.href = 'login.html?redirect=audio.html';
  }
});"""

if old_routing in index_content:
    index_content = index_content.replace(old_routing, new_routing)
    print("✓ Replaced routing in index.html")
else:
    print("✗ Warning: old_routing not found exactly in index.html")

# Update constellation and star target clicks
old_star_clicks = "const s=e.target.closest('[data-st]');if(s){sel=s.dataset.st;go('sci');readout();return}const m=e.target.closest('[data-myth]');if(m){for(const[c,v]of Object.entries(MY)){const i=v[1].findIndex(x=>x[3]===m.dataset.myth);if(i>=0){cat=c;cur=i;go('myth');renderMyth();return}}}});"
new_star_clicks = "const s=e.target.closest('[data-st]');if(s){if(!getActiveSession()){window.location.href='login.html?redirect='+encodeURIComponent('index.html#sci');return;}sel=s.dataset.st;go('sci');readout();return}const m=e.target.closest('[data-myth]');if(m){if(!getActiveSession()){window.location.href='login.html?redirect='+encodeURIComponent('index.html#myth');return;}for(const[c,v]of Object.entries(MY)){const i=v[1].findIndex(x=>x[3]===m.dataset.myth);if(i>=0){cat=c;cur=i;go('myth');renderMyth();return}}}});"

if old_star_clicks in index_content:
    index_content = index_content.replace(old_star_clicks, new_star_clicks)
    print("✓ Replaced star/myth clicks in index.html")
else:
    print("✗ Warning: old_star_clicks not found exactly in index.html")

# Update initial load and hashchange
old_hash = "addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(['home','sci','myth','play'].includes(h)&&h!==page)go(h)});\ntryInit3D();fit();renderMyth();renderQ();setLang('en');if(['sci','myth','play'].includes(location.hash.slice(1)))go(location.hash.slice(1));requestAnimationFrame(frame);"

new_hash = """addEventListener('hashchange',()=>{
  const h=location.hash.slice(1);
  if(['home','sci','myth','play'].includes(h)&&h!==page){
    if(['sci','myth','play'].includes(h)&&!getActiveSession()){
      window.location.replace('login.html?redirect='+encodeURIComponent('index.html#'+h));
      return;
    }
    go(h);
  }
});
tryInit3D();fit();renderMyth();renderQ();setLang('en');
if(['sci','myth','play'].includes(location.hash.slice(1))){
  if(!getActiveSession()){
    window.location.replace('login.html?redirect='+encodeURIComponent('index.html#'+location.hash.slice(1)));
  } else {
    go(location.hash.slice(1));
  }
}
requestAnimationFrame(frame);"""

if old_hash in index_content:
    index_content = index_content.replace(old_hash, new_hash)
    print("✓ Replaced hash listeners in index.html")
else:
    print("✗ Warning: old_hash not found exactly in index.html")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_content)


# 2. Update login.html
with open('login.html', 'r', encoding='utf-8') as f:
    login_content = f.read()

# Add warning status CSS
if '.status-msg.warning' not in login_content:
    warning_css = """.status-msg.warning {
      display: block;
      background: rgba(255, 179, 71, 0.12);
      border: 1px solid rgba(255, 179, 71, 0.35);
      color: var(--myth);
    }
    .status-msg.error {"""
    login_content = login_content.replace('.status-msg.error {', warning_css)
    print("✓ Added .status-msg.warning CSS in login.html")

# Redirect support in login submit
old_submit_redirect = """        setTimeout(() => {
          window.location.href = 'index.html#home';
        }, 800);"""

new_submit_redirect = """        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || 'index.html#home';
        setTimeout(() => {
          window.location.href = redirect;
        }, 800);"""

if old_submit_redirect in login_content:
    login_content = login_content.replace(old_submit_redirect, new_submit_redirect)
    print("✓ Added redirect support to handleAuthSubmit in login.html")
else:
    print("✗ Warning: old_submit_redirect not found in login.html")

# Add redirect detection and continue button in active session banner
old_active_check = """    function checkActiveSession() {
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
    checkActiveSession();"""

new_active_check = """    function checkRedirectNotice() {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        let name = 'this observatory feature';
        if (redirect.includes('sci')) name = 'the Scientific Observatory';
        else if (redirect.includes('myth')) name = 'the Myth & Culture Lore Archives';
        else if (redirect.includes('play')) name = 'Stargazer Journeys & Quests';
        else if (redirect.includes('audio')) name = 'the Celestial Audio Storybook';
        showStatus('✦ Stargazer Sign In Required: Please sign in or enlist to access ' + name + '.', 'warning');
      }
    }
    checkRedirectNotice();

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
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            const contBtn = document.getElementById('active-session-continue');
            if (redirect && contBtn) {
              contBtn.href = redirect;
              contBtn.style.display = 'inline-block';
            }
            return;
          }
        }
      } catch(e){}
      banner.style.display = 'none';
    }
    checkActiveSession();"""

if old_active_check in login_content:
    login_content = login_content.replace(old_active_check, new_active_check)
    print("✓ Added checkRedirectNotice in login.html")
else:
    print("✗ Warning: old_active_check not found in login.html")

# Add continue button to active-session-banner HTML
old_banner_html = """          <div style="display:flex;gap:8px">
            <a href="index.html#home" class="chip-btn" style="text-decoration:none;font-size:12px">Return to Sky</a>
            <button type="button" class="chip-btn" style="background:rgba(255,107,139,.18);border-color:rgba(255,107,139,.4);color:#ff8b8b;font-size:12px" onclick="logoutFromLogin()">Log Out</button>
          </div>"""

new_banner_html = """          <div style="display:flex;gap:8px">
            <a href="#" id="active-session-continue" class="chip-btn" style="display:none;text-decoration:none;font-size:12px;background:rgba(93,224,208,.15);border-color:var(--sci);color:var(--sci)">Continue to Feature →</a>
            <a href="index.html#home" class="chip-btn" style="text-decoration:none;font-size:12px">Return to Sky</a>
            <button type="button" class="chip-btn" style="background:rgba(255,107,139,.18);border-color:rgba(255,107,139,.4);color:#ff8b8b;font-size:12px" onclick="logoutFromLogin()">Log Out</button>
          </div>"""

if old_banner_html in login_content:
    login_content = login_content.replace(old_banner_html, new_banner_html)
    print("✓ Added continue button to active-session-banner in login.html")

with open('login.html', 'w', encoding='utf-8') as f:
    f.write(login_content)


# 3. Update audio.html
with open('audio.html', 'r', encoding='utf-8') as f:
    audio_content = f.read()

# Add head auth guard
head_guard = """<head>
  <meta charset="utf-8">
  <script>
    (function() {
      try {
        var raw = localStorage.getItem('cosmos_active_session');
        if (!raw) {
          window.location.replace('login.html?redirect=audio.html');
          return;
        }
        var sess = JSON.parse(raw);
        if (!sess || !sess.user) {
          window.location.replace('login.html?redirect=audio.html');
          return;
        }
      } catch(e) {
        window.location.replace('login.html?redirect=audio.html');
      }
    })();
  </script>"""

if '<head>\n  <meta charset="utf-8">' in audio_content:
    audio_content = audio_content.replace('<head>\n  <meta charset="utf-8">', head_guard)
    print("✓ Added immediate auth guard to <head> in audio.html")
elif '<head>' in audio_content:
    audio_content = audio_content.replace('<head>', head_guard)
    print("✓ Added immediate auth guard to <head> in audio.html")
else:
    print("✗ Warning: <head> tag pattern not found in audio.html")

# Add Stargazer user chip and logout button to audio.html nav
old_audio_nav = """    <nav class="nav-links">
      <a href="index.html">← Celestial Sky</a>
      <a href="about.html">About &amp; Sources</a>
      <a href="privacy.html">Privacy</a>
    </nav>"""

new_audio_nav = """    <nav class="nav-links">
      <a href="index.html">← Celestial Sky</a>
      <a href="about.html">About &amp; Sources</a>
      <a href="privacy.html">Privacy</a>
      <span id="audio-user-chip" style="padding:4px 10px;border-radius:99px;border:1px solid rgba(93,224,208,.3);color:var(--sci);font-size:12px;display:none;align-items:center;gap:4px">✦ <span id="audio-user-callsign"></span></span>
      <button type="button" id="audio-logout-btn" onclick="logoutFromAudio()" style="all:unset;cursor:pointer;padding:4px 10px;border-radius:99px;border:1px solid rgba(255,107,139,.3);color:#ff8b8b;font-size:12px;background:rgba(255,107,139,.1);display:none">Log Out</button>
    </nav>"""

if old_audio_nav in audio_content:
    audio_content = audio_content.replace(old_audio_nav, new_audio_nav)
    print("✓ Added user chip and logout button to nav in audio.html")

# Add audio auth script before </body>
audio_script = """  <script>
    function initAudioUser() {
      try {
        const raw = localStorage.getItem('cosmos_active_session');
        if (raw) {
          const sess = JSON.parse(raw);
          if (sess && sess.user && sess.user.callsign) {
            const chip = document.getElementById('audio-user-chip');
            const btn = document.getElementById('audio-logout-btn');
            const name = document.getElementById('audio-user-callsign');
            if (chip && btn && name) {
              name.textContent = sess.user.callsign;
              chip.style.display = 'inline-flex';
              btn.style.display = 'inline-block';
            }
          }
        }
      } catch(e){}
    }
    initAudioUser();

    async function logoutFromAudio() {
      try {
        const raw = localStorage.getItem('cosmos_active_session');
        if (raw) {
          const sess = JSON.parse(raw);
          if (sess && sess.token) {
            fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: sess.token })
            }).catch(() => {});
          }
        }
      } catch(e){}
      localStorage.removeItem('cosmos_active_session');
      window.location.href = 'login.html';
    }
  </script>
</body>"""

if '</body>' in audio_content and 'initAudioUser' not in audio_content:
    audio_content = audio_content.replace('</body>', audio_script)
    print("✓ Added initAudioUser & logoutFromAudio to audio.html")

with open('audio.html', 'w', encoding='utf-8') as f:
    f.write(audio_content)

print("Authentication guards applied successfully!")
