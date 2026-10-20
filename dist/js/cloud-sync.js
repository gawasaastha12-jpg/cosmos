// Steps 1, 2, 4: Supabase client, auth, and progress sync.
// localStorage ('cosmic_save_v2') stays the source of truth offline; the cloud is a mirror.
// Self-host the ESM build at vendor/supabase.js to keep the "zero third-party CDN" promise.
import { createClient } from '../vendor/supabase.js';

const SAVE_KEY = 'cosmic_save_v2';
const UNION_KEYS = ['cards'];
const MAX_KEYS = ['xp', 'stars', 'streak'];

let sb = null;
let pushTimer = null;
let currentUser = null;

export function getClient() {
  return sb;
}

export function isConfigured() {
  return sb !== null;
}

export function getCurrentUser() {
  return currentUser;
}

export function formatAuthError(err) {
  if (!err) return '';
  const msg = (err.message || err.error_description || String(err)).toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid grant') || msg.includes('wrong password') || msg.includes('invalid username or password')) {
    return 'Incorrect email or password. Please try again or reset your password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email address by checking your inbox before logging in.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || msg.includes('too many requests')) {
    return 'Too many requests: email rate limit exceeded on the Supabase backend. If you requested an email recently, please check your Spam or Junk folder. To sign in without emails, disable "Confirm email" in your Supabase Auth dashboard.';
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network') || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 'Network connection unavailable. Your progress remains safely stored on this device.';
  }
  return err.message || 'An authentication error occurred. Please try again.';
}

export const applySession = (session) => {
  if (typeof window === 'undefined') return;
  const prevUserEmail = currentUser?.email;

  if (session?.user) {
    currentUser = {
      id: session.user.id,
      email: session.user.email,
      callsign: session.user.user_metadata?.callsign ||
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                (session.user.email ? session.user.email.split('@')[0] : 'Stargazer'),
      avatar: session.user.user_metadata?.avatar_url || null,
      role: 'stargazer'
    };

    try {
      localStorage.setItem('cosmos_active_session', JSON.stringify({ user: currentUser, token: session.access_token }));
    } catch (e) {}

    window.SAVE = window.SAVE || {};
    window.SAVE.user = currentUser;

    if (typeof window.setGlobalUser === 'function') {
      window.setGlobalUser(currentUser);
    }

    // If user landed via email magic link or OAuth redirect with URL hash tokens or PKCE code, clean URL
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.hash.includes('type='))) {
        try {
          window.history.replaceState(window.history.state, document.title, window.location.pathname + window.location.search);
        } catch (e) {}
      }
      if (window.location.search && window.location.search.includes('code=')) {
        try {
          const cleanSearch = window.location.search.replace(/([?&])code=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
          window.history.replaceState(window.history.state, document.title, window.location.pathname + cleanSearch + window.location.hash);
        } catch (e) {}
      }
    }

    // Close sign-in modal if open
    if (typeof window.closeSignInModal === 'function') {
      window.closeSignInModal();
    }

    if (!prevUserEmail && session.user.email) {
      const signinCallsign = currentUser.callsign;
      setTimeout(() => {
        if (currentUser && typeof window.showToast === 'function') {
          window.showToast('✨', 'Welcome Stargazer!', `Connected as ${signinCallsign}`);
        }
      }, 600);
    }
  } else {
    currentUser = null;
    try {
      localStorage.removeItem('cosmos_active_session');
    } catch (e) {}

    if (window.SAVE) {
      delete window.SAVE.user;
    }
    if (typeof window.setGlobalUser === 'function') {
      window.setGlobalUser(null);
    }
  }

  if (typeof window.updateNavUser === 'function') {
    window.updateNavUser();
  }
};

export function initCloud(url, anonKey, options = {}) {
  if (!options.client && (!url || !anonKey)) {
    console.warn('Cloud sync not initialized: missing url or anonKey');
    return null;
  }

  // Check for any authentication errors in the URL hash or query parameters
  if (typeof window !== 'undefined' && window.location) {
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const queryStr = hash.startsWith('#') ? hash.slice(1) : (search.startsWith('?') ? search.slice(1) : '');
      const params = new URLSearchParams(queryStr);
      const err = params.get('error_description') || params.get('error');
      if (err) {
        console.warn('Supabase Auth URL error:', err);
        setTimeout(() => {
          if (typeof window.showToast === 'function') {
            window.showToast('⚠️', 'Authentication', formatAuthError({ message: decodeURIComponent(err).replace(/\+/g, ' ') }));
          }
        }, 600);
      }
    } catch(e) {}
  }

  // anon key is public by design; RLS protects data
  sb = options.client || createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  sb.auth.getSession().then(({ data }) => {
    applySession(data?.session);
    if (data?.session) syncProgressWithCloud();
  }).catch(() => {});

  sb.auth.onAuthStateChange((evt, session) => {
    applySession(session);
    if (evt === 'SIGNED_IN' || evt === 'INITIAL_SESSION' || evt === 'TOKEN_REFRESHED') {
      if (session) syncProgressWithCloud();
    } else if (evt === 'SIGNED_OUT') {
      applySession(null);
    } else if (evt === 'PASSWORD_RECOVERY') {
      if (typeof window !== 'undefined' && typeof window.openPasswordRecoveryModal === 'function') {
        window.openPasswordRecoveryModal();
      }
    }
  });

  return sb;
}

export const signInWithPassword = async (email, password) => {
  if (!sb) throw new Error('Cloud sync not configured');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const friendly = new Error(formatAuthError(error));
    friendly.originalError = error;
    throw friendly;
  }
  if (data?.session) {
    applySession(data.session);
  }
  return data;
};

export const signUp = async (email, password, metadata = {}) => {
  if (!sb) throw new Error('Cloud sync not configured');
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: origin
    }
  });
  if (error) {
    const friendly = new Error(formatAuthError(error));
    friendly.originalError = error;
    throw friendly;
  }
  if (data?.session) {
    applySession(data.session);
  }
  return data;
};

export const resetPassword = async (email) => {
  if (!sb) throw new Error('Cloud sync not configured');
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const { data, error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: origin });
  if (error) {
    const friendly = new Error(formatAuthError(error));
    friendly.originalError = error;
    throw friendly;
  }
  return data;
};

export const updatePassword = async (password) => {
  if (!sb) throw new Error('Cloud sync not configured');
  const { data, error } = await sb.auth.updateUser({ password });
  if (error) {
    const friendly = new Error(formatAuthError(error));
    friendly.originalError = error;
    throw friendly;
  }
  return data;
};

export const signInWithOtp = async (email) => {
  if (!sb) throw new Error('Cloud sync not configured');
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: origin,
      shouldCreateUser: true
    }
  });
  if (error) {
    const friendly = new Error(formatAuthError(error));
    friendly.originalError = error;
    throw friendly;
  }
  return data;
};

export const verifyOtp = async (email, token) => {
  if (!sb) throw new Error('Cloud sync not configured');
  const { data, error } = await sb.auth.verifyOtp({
    email,
    token: (token || '').trim(),
    type: 'email'
  });
  if (error) {
    const friendly = new Error(formatAuthError(error));
    friendly.originalError = error;
    throw friendly;
  }
  if (data?.session) {
    applySession(data.session);
  }
  return data;
};

export const signInWithEmail = (email) => {
  return signInWithOtp(email);
};

export const signInWithProvider = (provider = 'google', redirectTo) => { // 'github' | 'google'
  if (!sb) return Promise.reject(new Error('Cloud sync not configured'));
  const targetUrl = redirectTo || (typeof location !== 'undefined' ? (location.origin + location.pathname) : '');
  return sb.auth.signInWithOAuth({ provider, options: { redirectTo: targetUrl } });
};

export const signInWithGoogle = (redirectTo) => {
  return signInWithProvider('google', redirectTo);
};

export const signOut = async () => {
  if (!sb) return Promise.resolve();
  const res = await sb.auth.signOut();
  applySession(null);
  return res;
};

export const readLocal = () => {
  try {
    let local = {};
    try {
      local = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    } catch {}

    let userKey = null;
    if (typeof window !== 'undefined' && typeof window.getSaveKey === 'function') {
      try { userKey = window.getSaveKey(); } catch {}
    }
    if (userKey && userKey !== SAVE_KEY) {
      try {
        const userSave = JSON.parse(localStorage.getItem(userKey));
        if (userSave) local = mergeProgress(local, userSave);
      } catch {}
    }

    return local;
  } catch {
    return {};
  }
};

export const writeLocal = (obj) => {
  try {
    const str = JSON.stringify(obj);
    localStorage.setItem(SAVE_KEY, str);
    let userKey = null;
    if (typeof window !== 'undefined' && typeof window.getSaveKey === 'function') {
      try { userKey = window.getSaveKey(); } catch {}
    }
    if (userKey && userKey !== SAVE_KEY) {
      localStorage.setItem(userKey, str);
    }
  } catch {}
};

// Merge so neither device loses progress: max for counters, union for collections,
// non-destructive union for completion maps (done, achievements) preserving max stars,
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

  // Preserve all completed modules and highest stars earned
  const allDoneKeys = new Set([...Object.keys(a.done || {}), ...Object.keys(b.done || {})]);
  out.done = {};
  for (const k of allDoneKeys) {
    const valA = a.done ? a.done[k] : undefined;
    const valB = b.done ? b.done[k] : undefined;
    if (typeof valA === 'number' || typeof valB === 'number') {
      out.done[k] = Math.max(valA || 0, valB || 0);
    } else {
      out.done[k] = (valA !== undefined) ? valA : valB;
    }
  }

  // Non-destructive achievements
  out.achievements = Object.assign({}, a.achievements || {}, b.achievements || {});

  // In one single account, once unlocked, all modules stay unlocked forever
  out.modulesUnlocked = !!(a.modulesUnlocked || b.modulesUnlocked || Object.keys(out.done).length > 0 || out.stars > 0 || out.xp > 0);

  if (a.onboarded || b.onboarded) {
    out.onboarded = true;
  }

  out._ts = Math.max(Date.now(), a._ts || 0, b._ts || 0);
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

    const localData = readLocal();
    const cloudData = row?.data || {};
    const merged = mergeProgress(localData, cloudData);
    writeLocal(merged);

    if (typeof window !== 'undefined' && window.SAVE) {
      window.SAVE = mergeProgress(window.SAVE, merged);
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
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('online', () => syncProgressWithCloud());
  }
  window.CloudSync = {
    initCloud,
    getClient,
    isConfigured,
    getCurrentUser,
    signInWithPassword,
    signUp,
    resetPassword,
    updatePassword,
    signInWithOtp,
    verifyOtp,
    signInWithEmail,
    signInWithProvider,
    signInWithGoogle,
    signOut,
    readLocal,
    writeLocal,
    mergeProgress,
    syncProgressWithCloud,
    schedulePush,
    formatAuthError
  };
}
