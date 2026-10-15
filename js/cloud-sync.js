// Steps 1, 2, 4: Supabase client, auth, and progress sync.
// localStorage ('cosmic_save_v2') stays the source of truth offline; the cloud is a mirror.
// Self-host the ESM build at vendor/supabase.js to keep the "zero third-party CDN" promise.
import { createClient } from '../vendor/supabase.js';

const SAVE_KEY = 'cosmic_save_v2';
const UNION_KEYS = ['cards'];
const MAX_KEYS = ['xp', 'stars', 'streak'];

let sb = null;
let pushTimer = null;

export function getClient() {
  return sb;
}

export function isConfigured() {
  return sb !== null;
}

export function initCloud(url, anonKey) {
  if (!url || !anonKey) {
    console.warn('Cloud sync not initialized: missing url or anonKey');
    return null;
  }
  // anon key is public by design; RLS protects data
  sb = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  const applySession = (session) => {
    if (typeof window === 'undefined') return;
    if (session?.user) {
      if (window.SAVE) {
        window.SAVE.user = {
          id: session.user.id,
          email: session.user.email,
          callsign: session.user.user_metadata?.callsign || (session.user.email ? session.user.email.split('@')[0] : 'Stargazer'),
          role: 'stargazer'
        };
      }
    } else {
      if (window.SAVE) {
        delete window.SAVE.user;
      }
    }
    if (typeof window.updateNavUser === 'function') {
      window.updateNavUser();
    }
  };

  sb.auth.getSession().then(({ data }) => {
    applySession(data?.session);
    if (data?.session) syncProgressWithCloud();
  }).catch(() => {});

  sb.auth.onAuthStateChange((evt, session) => {
    applySession(session);
    if (evt === 'SIGNED_IN' || evt === 'INITIAL_SESSION') {
      syncProgressWithCloud();
    }
  });

  return sb;
}

export const signInWithEmail = (email) => {
  if (!sb) return Promise.reject(new Error('Cloud sync not configured'));
  const origin = typeof location !== 'undefined' ? location.origin : '';
  return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: origin } });
};

export const signInWithProvider = (provider) => { // 'github' | 'google'
  if (!sb) return Promise.reject(new Error('Cloud sync not configured'));
  const origin = typeof location !== 'undefined' ? location.origin : '';
  return sb.auth.signInWithOAuth({ provider, options: { redirectTo: origin } });
};

export const signOut = async () => {
  if (!sb) return Promise.resolve();
  const res = await sb.auth.signOut();
  if (typeof window !== 'undefined') {
    if (window.SAVE) delete window.SAVE.user;
    if (typeof window.updateNavUser === 'function') window.updateNavUser();
  }
  return res;
};

export const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
  } catch {
    return {};
  }
};

export const writeLocal = (obj) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(obj));
  } catch {}
};

// Merge so neither device loses progress: max for counters, union for collections,
// shallow merge for completion maps (done, achievements),
// newest write wins for settings/day/avatar.
export function mergeProgress(a = {}, b = {}) {
  const newer = (a._ts || 0) >= (b._ts || 0) ? a : b;
  const out = { ...(newer === a ? b : a), ...newer };
  for (const k of MAX_KEYS) {
    out[k] = Math.max(a[k] || 0, b[k] || 0);
  }
  for (const k of UNION_KEYS) {
    out[k] = [...new Set([...(a[k] || []), ...(b[k] || [])])];
  }
  out.done = Object.assign({}, a.done || {}, b.done || {});
  out.achievements = Object.assign({}, a.achievements || {}, b.achievements || {});
  out._ts = Date.now();
  return out;
}

export async function syncProgressWithCloud() {
  if (!sb) return { ok: false, reason: 'not-configured' };
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { ok: false, reason: 'signed-out' };
    const uid = session.user.id;

    const { data: row, error } = await sb.from('user_progress')
      .select('data').eq('user_id', uid).maybeSingle();
    if (error) throw error;

    const merged = mergeProgress(readLocal(), row?.data || {});
    writeLocal(merged);

    if (typeof window !== 'undefined' && window.SAVE) {
      window.SAVE = Object.assign(window.SAVE, merged);
      if (typeof window.updateHUD === 'function') window.updateHUD();
      if (typeof window.renderTrail === 'function') window.renderTrail();
    }

    const { error: upErr } = await sb.from('user_progress')
      .upsert({ user_id: uid, data: merged, schema_version: 2 }, { onConflict: 'user_id' });
    if (upErr) throw upErr;
    return { ok: true, data: merged };
  } catch (e) {
    console.warn('Cloud sync failed; staying on local save.', e);
    return { ok: false, reason: 'network' }; // never block gameplay
  }
}

// Call after every local save; coalesces bursts into one upsert.
export function schedulePush(delay = 3000) {
  if (!sb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncProgressWithCloud, delay);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncProgressWithCloud());
  window.CloudSync = {
    initCloud,
    getClient,
    isConfigured,
    signInWithEmail,
    signInWithProvider,
    signOut,
    readLocal,
    writeLocal,
    mergeProgress,
    syncProgressWithCloud,
    schedulePush
  };
}
