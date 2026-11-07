import fs from 'fs';
/**
 * scripts/test-auth-flow.js
 * Automated test suite for the Stargazer authentication flow with a mocked client:
 * 1. Session present on load -> signed-in UI, no modal.
 * 2. Wrong password -> friendly error, no crash.
 * 3. Signed-out -> sign-in -> progress merges with cloud.
 * 4. Offline -> local play still works.
 */

// Setup minimal browser-like globals in Node environment
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};

globalThis.location = {
  origin: 'http://127.0.0.1:8000',
  pathname: '/',
  search: '',
  hash: ''
};

globalThis.history = {
  state: null,
  replaceState: (state, title, url) => {
    // Mock URL update
    if (url) {
      const u = new URL(url, 'http://127.0.0.1:8000');
      globalThis.location.pathname = u.pathname;
      globalThis.location.search = u.search;
      globalThis.location.hash = u.hash;
    }
  }
};

let modalOpen = false;
let modalClasses = new Set();
let modalContent = '';

globalThis.document = {
  title: 'Cosmic AR Explorer',
  getElementById: (id) => {
    return {
      id,
      style: {},
      innerHTML: '',
      textContent: '',
      onclick: null,
      title: ''
    };
  },
  querySelector: (sel) => {
    if (sel === '#dlg') {
      return {
        get open() { return modalOpen; },
        set open(val) { modalOpen = val; },
        classList: {
          contains: (cls) => modalClasses.has(cls),
          add: (cls) => modalClasses.add(cls),
          remove: (cls) => modalClasses.delete(cls)
        },
        set className(c) {
          modalClasses = new Set(c.split(' ').filter(Boolean));
        },
        get className() {
          return [...modalClasses].join(' ');
        },
        set innerHTML(h) { modalContent = h; },
        get innerHTML() { return modalContent; },
        showModal: () => { modalOpen = true; },
        close: () => { modalOpen = false; }
      };
    }
    return null;
  }
};

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.SAVE = {};
globalThis.showToast = (icon, title, msg) => {
  // console.log(`Toast: ${icon} [${title}] ${msg}`);
};
globalThis.updateHUD = () => {};
globalThis.renderTrail = () => {};

// Import cloud-sync module
const CloudSync = await import('../js/cloud-sync.js');
const {
  initCloud,
  getCurrentUser,
  signInWithPassword,
  signUp,
  resetPassword,
  updatePassword,
  signInWithOtp,
  verifyOtp,
  signOut,
  formatAuthError,
  syncProgressWithCloud,
  readLocal,
  writeLocal
} = CloudSync;

console.log('====================================================');
console.log('   STARGAZER AUTHENTICATION FLOW TEST SUITE         ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`✔ PASS: ${message}`);
}

// -------------------------------------------------------------
// TEST 1: Session present on load -> signed-in UI, no modal
// -------------------------------------------------------------
console.log('--- Test 1: Session present on load -> signed-in UI, no modal ---');

const existingUser = {
  id: 'stargazer-uuid-001',
  email: 'stargazer.galileo@cosmos.org',
  user_metadata: { callsign: 'StarGazer1' }
};

let cloudDbRow = {
  user_id: existingUser.id,
  data: {
    xp: 500,
    stars: 15,
    streak: 3,
    cards: ['card_orion', 'card_cygnus'],
    done: { q1: true, q2: true },
    achievements: { first_light: true }
  }
};

let upsertCallCount = 0;
let lastUpsertData = null;

const createMockSupabase = (opts = {}) => {
  const callbacks = [];
  let currentSession = opts.initialSession || null;

  return {
    auth: {
      getSession: async () => {
        return { data: { session: currentSession }, error: null };
      },
      onAuthStateChange: (cb) => {
        callbacks.push(cb);
        if (currentSession) {
          cb('INITIAL_SESSION', currentSession);
        }
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: async ({ email, password }) => {
        if (opts.failPassword) {
          return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400 } };
        }
        currentSession = {
          user: { id: 'stargazer-uuid-001', email, user_metadata: { callsign: 'StarGazer1' } },
          access_token: 'mock-access-token-xyz'
        };
        for (const cb of callbacks) {
          cb('SIGNED_IN', currentSession);
        }
        return { data: { user: currentSession.user, session: currentSession }, error: null };
      },
      signUp: async ({ email, password, options }) => {
        if (opts.userAlreadyRegistered) {
          return { data: { user: null, session: null }, error: { message: 'User already registered' } };
        }
        const user = { id: 'new-uuid', email, user_metadata: options?.data || {} };
        const session = opts.confirmEmail ? null : { user, access_token: 'new-token' };
        if (session) {
          currentSession = session;
          for (const cb of callbacks) cb('SIGNED_IN', currentSession);
        }
        return { data: { user, session }, error: null };
      },
      resetPasswordForEmail: async (email, options) => {
        return { data: {}, error: null };
      },
      updateUser: async ({ password }) => {
        return { data: { user: { id: 'stargazer-uuid-001' } }, error: null };
      },
      signInWithOtp: async ({ email }) => {
        return { data: {}, error: null };
      },
      verifyOtp: async ({ email, token, type }) => {
        if (token !== '123456') {
          return { data: { user: null, session: null }, error: { message: 'Token has expired or is invalid' } };
        }
        currentSession = {
          user: { id: 'stargazer-uuid-001', email, user_metadata: { callsign: 'StarGazer1' } },
          access_token: 'mock-access-token-otp'
        };
        for (const cb of callbacks) {
          cb('SIGNED_IN', currentSession);
        }
        return { data: { user: currentSession.user, session: currentSession }, error: null };
      },
      signOut: async () => {
        currentSession = null;
        for (const cb of callbacks) {
          cb('SIGNED_OUT', null);
        }
        return { error: null };
      }
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (opts.offline) throw new Error('Failed to fetch');
            return { data: cloudDbRow, error: null };
          }
        })
      }),
      upsert: async (record) => {
        if (opts.offline) throw new Error('Failed to fetch');
        upsertCallCount++;
        lastUpsertData = record;
        cloudDbRow = record;
        return { error: null };
      }
    })
  };
};

// Start with initial session
const initialSession = {
  user: existingUser,
  access_token: 'token-active-123'
};

const mockClient1 = createMockSupabase({ initialSession });
initCloud('http://127.0.0.1:8000', 'mock-anon-key', { client: mockClient1 });

assert(getCurrentUser() !== null, 'Current user was restored from active session');
assert(getCurrentUser().email === 'stargazer.galileo@cosmos.org', 'Email correctly restored');
assert(getCurrentUser().callsign === 'StarGazer1', 'Callsign metadata correctly populated');
assert(localStorage.getItem('cosmos_active_session') !== null, 'Session persisted to localStorage cosmos_active_session');
assert(modalOpen === false, 'Modal is closed and never popped open when session is present on load');

// -------------------------------------------------------------
// TEST 2: Wrong password -> friendly error, no crash
// -------------------------------------------------------------
console.log('\n--- Test 2: Wrong password -> friendly error, no crash ---');

const mockClient2 = createMockSupabase({ failPassword: true });
initCloud('http://127.0.0.1:8000', 'mock-anon-key', { client: mockClient2 });

let errorCaught = null;
try {
  await signInWithPassword('stargazer.galileo@cosmos.org', 'wrong-pass');
} catch (err) {
  errorCaught = err;
}

assert(errorCaught !== null, 'Invalid login credentials threw an error as expected');
assert(
  errorCaught.message.includes('Incorrect email or password'),
  `Error translated to user-friendly message: "${errorCaught.message}"`
);

// Verify other error mappings
assert(
  formatAuthError({ message: 'Email not confirmed' }).includes('confirm your email'),
  'Unconfirmed email produces friendly guidance'
);
assert(
  formatAuthError({ message: 'User already registered' }).includes('already exists'),
  'Existing account produces friendly message to log in'
);
assert(
  formatAuthError({ message: 'over_email_send_rate_limit' }).includes('Too many requests'),
  'Rate limit produces friendly patience message'
);
assert(
  formatAuthError({ message: 'Failed to fetch' }).includes('Network connection unavailable'),
  'Offline/network error produces friendly local fallback message'
);

// -------------------------------------------------------------
// TEST 3: Signed-out -> sign-in -> progress merges with cloud
// -------------------------------------------------------------
console.log('\n--- Test 3: Signed-out -> sign-in -> progress merges with cloud ---');

// Sign out
await signOut();
assert(getCurrentUser() === null, 'User successfully signed out');
assert(localStorage.getItem('cosmos_active_session') === null, 'Active session removed on sign-out');

// Local progress on device before sign-in
const localProgressBefore = {
  v: 1,
  xp: 300,
  stars: 20,
  cards: ['card_orion', 'card_pleiades'],
  done: { q1: true, q3: true },
  achievements: { speed_runner: true },
  _ts: 1000
};
writeLocal(localProgressBefore);

// Cloud progress currently in database
cloudDbRow = {
  user_id: 'stargazer-uuid-001',
  data: {
    v: 1,
    xp: 600,
    stars: 12,
    cards: ['card_orion', 'card_sirius'],
    done: { q2: true, q3: true },
    achievements: { stargazer: true },
    _ts: 2000
  }
};

// Now sign in
const mockClient3 = createMockSupabase();
initCloud('http://127.0.0.1:8000', 'mock-anon-key', { client: mockClient3 });

const loginResult = await signInWithPassword('stargazer.galileo@cosmos.org', 'correct-password');
assert(loginResult.user !== null, 'Sign in with password succeeded');
assert(getCurrentUser() !== null, 'Session state active after sign-in');

// Run cloud sync
const syncResult = await syncProgressWithCloud();
assert(syncResult.ok === true, 'Cloud sync returned ok: true');

// Check merged local storage progress
const localMerged = readLocal();
assert(localMerged.xp === 600, `XP merged using max (expected 600, got ${localMerged.xp})`);
assert(localMerged.stars === 20, `Stars merged using max (expected 20, got ${localMerged.stars})`);

const expectedCards = ['card_orion', 'card_pleiades', 'card_sirius'];
assert(
  expectedCards.every((c) => localMerged.cards.includes(c)) && localMerged.cards.length === 3,
  `Cards merged using union: ${JSON.stringify(localMerged.cards)}`
);

assert(
  localMerged.done.q1 && localMerged.done.q2 && localMerged.done.q3,
  'Done quests merged without losing either device progress'
);
assert(
  localMerged.achievements.speed_runner && localMerged.achievements.stargazer,
  'Achievements unioned correctly'
);
assert(lastUpsertData !== null, 'Upsert was pushed to cloud database');
assert(lastUpsertData.data.xp === 600, 'Cloud database received merged XP');

// -------------------------------------------------------------
// TEST 4: Offline -> local play still works
// -------------------------------------------------------------
console.log('\n--- Test 4: Offline -> local play still works ---');

// Configure client to simulate offline network failure
const mockClientOffline = createMockSupabase({
  initialSession: {
    user: existingUser,
    access_token: 'offline-token'
  },
  offline: true
});
initCloud('http://127.0.0.1:8000', 'mock-anon-key', { client: mockClientOffline });

const offlineSyncResult = await syncProgressWithCloud();
assert(offlineSyncResult.ok === false, 'Cloud sync handled network failure gracefully');
assert(offlineSyncResult.reason === 'network', 'Reason was network error');

// User plays offline and saves game locally
const offlineProgress = readLocal();
offlineProgress.xp += 100;
offlineProgress.stars += 2;
offlineProgress.cards.push('card_andromeda');
writeLocal(offlineProgress);

const updatedLocal = readLocal();
assert(updatedLocal.xp === 700, 'Local progress advanced to 700 XP offline');
assert(updatedLocal.stars === 22, 'Local stars advanced to 22 offline');
assert(updatedLocal.cards.includes('card_andromeda'), 'Offline unlocked card retained in cosmic_save_v2');

// Sign out while offline retains local save
await signOut();
const afterLogoutLocal = readLocal();
assert(afterLogoutLocal.xp === 700, 'Sign out kept local progress on device');
assert(afterLogoutLocal.cards.includes('card_andromeda'), 'Unlocked cards preserved on device after sign out');

// -------------------------------------------------------------
// TEST 5: Guest access to all sections & audio.html
// -------------------------------------------------------------
console.log('\n--- Test 5: Guest access to all sections & audio.html ---');

// Verify audio.html has no auth guard redirecting to sign-in
const audioHtmlContent = fs.readFileSync('audio.html', 'utf8');
assert(!audioHtmlContent.includes('guardAudioAccess'), 'audio.html has no guardAudioAccess function');
assert(!audioHtmlContent.includes('window.location.replace'), 'audio.html does not redirect visitors to sign-in');

// Verify index.html does not have protectedSections or audioLink interception
const indexHtmlContent = fs.readFileSync('index.html', 'utf8');
assert(!indexHtmlContent.includes('protectedSections'), 'index.html has no protectedSections list');
assert(!indexHtmlContent.includes('const audioLink = e.target.closest'), 'index.html does not intercept audio.html links');

// Setup mock DOM for navigation go(n)
globalThis.$ = (sel) => [];
globalThis.$ = (sel) => ({ style: {}, classList: { toggle: () => {} } });
globalThis.scrollTo = () => {};
globalThis.fit = () => {};
globalThis.stopV = () => {};
globalThis.loadMythData = () => {};
globalThis.renderMyth = () => {};
globalThis.initAvatar = () => {};
globalThis.resizeAv = () => {};
globalThis.renderQ = () => {};
globalThis.renderFM = () => {};
globalThis.tryInit3D = () => {};

let activePage = 'home';
function testGo(n) {
  activePage = n;
  location.hash = n;
}

// Test guest entering each section
modalOpen = false;
location.hash = '';

const guestSections = ['sci', 'myth', 'audio', 'play', 'home'];
for (const sec of guestSections) {
  testGo(sec);
  assert(activePage === sec, `Guest successfully navigated to section '${sec}'`);
  assert(modalOpen === false, `Auth modal remained closed when entering '${sec}'`);
  assert(location.hash === sec, `Hash updated to '#${sec}' without forcing '#signin'`);
}

// -------------------------------------------------------------
// TEST 6: Guest progress survives a refresh
// -------------------------------------------------------------
console.log('\n--- Test 6: Guest progress survives a refresh ---');

await signOut();
storage.clear();

const guestSessionProgress = {
  v: 2,
  xp: 220,
  stars: 7,
  streak: 2,
  cards: ['card_orion', 'card_sirius'],
  done: { quest_polaris: 3, quest_vega: 2 },
  achievements: { first_light: true, night_owl: true },
  avatar: 'owl',
  _ts: Date.now()
};

writeLocal(guestSessionProgress);

// Simulate page refresh: reset in-memory variables and reload from localStorage
globalThis.SAVE = null;
const refreshedProgress = readLocal();

assert(refreshedProgress.xp === 220, 'Guest XP (220) preserved across page refresh');
assert(refreshedProgress.stars === 7, 'Guest stars (7) preserved across page refresh');
assert(
  refreshedProgress.cards.length === 2 &&
  refreshedProgress.cards.includes('card_orion') &&
  refreshedProgress.cards.includes('card_sirius'),
  'Guest unlocked cards preserved across page refresh'
);
assert(
  refreshedProgress.done.quest_polaris === 3 && refreshedProgress.done.quest_vega === 2,
  'Guest quest completions preserved across page refresh'
);
assert(refreshedProgress.achievements.night_owl === true, 'Guest achievements preserved across page refresh');

// -------------------------------------------------------------
// TEST 7: Guest-to-signed-in merge keeps both sets of progress
// -------------------------------------------------------------
console.log('\n--- Test 7: Guest-to-signed-in merge keeps both sets of progress ---');

// Guest local save on device
const guestPreLogin = {
  v: 2,
  xp: 350,
  stars: 11,
  streak: 3,
  cards: ['card_orion', 'card_guest_gemini'],
  done: { q_common: 2, q_guest_only: 3 },
  achievements: { speed_runner: true },
  avatar: 'fox',
  _ts: 1000000
};
writeLocal(guestPreLogin);

// Existing cloud account data from another device
cloudDbRow = {
  user_id: 'guest-convert-user-007',
  data: {
    v: 2,
    xp: 400,
    stars: 14,
    streak: 5,
    cards: ['card_orion', 'card_cloud_perseus'],
    done: { q_common: 3, q_cloud_only: 2 },
    achievements: { star_gazer: true },
    avatar: 'owl',
    _ts: 2000000
  }
};

const mockClientGuestConvert = createMockSupabase();
initCloud('http://127.0.0.1:8000', 'mock-anon-key', { client: mockClientGuestConvert });

// Guest signs in
await signInWithPassword('guest.converted@cosmos.org', 'validPassword123');
const guestSyncResult = await syncProgressWithCloud();

assert(guestSyncResult.ok === true, 'Cloud sync returned ok: true on guest sign-in');

const finalMerged = readLocal();
assert(finalMerged.xp === 400, 'XP merged to max(350, 400) = 400');
assert(finalMerged.stars === 14, 'Stars merged to max(11, 14) = 14');
assert(
  finalMerged.cards.includes('card_guest_gemini') &&
  finalMerged.cards.includes('card_cloud_perseus') &&
  finalMerged.cards.includes('card_orion') &&
  finalMerged.cards.length === 3,
  'Cards merged via union preserving both guest and cloud cards'
);
assert(
  finalMerged.done.q_guest_only === 3 &&
  finalMerged.done.q_cloud_only === 2 &&
  finalMerged.done.q_common === 3,
  'Done quests unioned keeping highest stars earned per quest'
);
assert(
  finalMerged.achievements.speed_runner && finalMerged.achievements.star_gazer,
  'Achievements from both guest play and cloud account unioned'
);
assert(
  lastUpsertData !== null &&
  lastUpsertData.data.cards.includes('card_guest_gemini') &&
  lastUpsertData.data.cards.includes('card_cloud_perseus'),
  'Cloud database updated with the merged progress dataset'
);

// Verify soft guest prompt dismissal persistence
assert(localStorage.getItem('cosmos_guest_prompt_dismissed') === null, 'Prompt dismissal not set initially');
localStorage.setItem('cosmos_guest_prompt_dismissed', '1');
assert(localStorage.getItem('cosmos_guest_prompt_dismissed') === '1', 'Prompt dismissal persisted in localStorage');

console.log('\n====================================================');
console.log(`✔ ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('====================================================\n');
