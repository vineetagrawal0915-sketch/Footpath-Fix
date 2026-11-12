// ============================================
//  FootpathFix — Auth Helper
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  showConfigWarning('config-warning');

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isAdminPage = currentPage === 'admin-dashboard.html';

  const { data: { session } } = await _supabase.auth.getSession();

  if (session) {
    const isAdmin = await checkAdminRole(session.user.id);

    if (isAdmin) {
      if (!isAdminPage) {
        window.location.href = 'admin-dashboard.html';
      }
      return;
    }

    // Clear stale/mismatched session so the user cannot bounce endlessly.
    try {
      await _supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('footpathfix-auth');
  }

  // If this is the admin dashboard and the user is not an admin, send them away.
  if (isAdminPage) {
    window.location.href = 'admin-login.html';
    return;
  }

  initLoginForm();
  initPasswordToggle();
});

// ── Login Form ──────────────────────────────────────────────────
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('login-email')?.value.trim()    || '';
    const password = document.getElementById('login-password')?.value         || '';

    let valid = true;

    if (!email || !email.includes('@')) {
      showFieldError('email-error', true);
      document.getElementById('login-email')?.classList.add('error');
      valid = false;
    } else {
      showFieldError('email-error', false);
      document.getElementById('login-email')?.classList.remove('error');
    }

    if (!password) {
      showFieldError('password-error', true);
      document.getElementById('login-password')?.classList.add('error');
      valid = false;
    } else {
      showFieldError('password-error', false);
      document.getElementById('login-password')?.classList.remove('error');
    }

    if (!valid) return;

    if (!isConfigured()) {
      showLoginError('Supabase is not configured. Please set your credentials in js/config.js.');
      return;
    }

    setLoginLoading(true);
    hideLoginError();

    try {
      const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      // Verify admin role in DB
      const isAdmin = await checkAdminRole(data.user.id);

      if (!isAdmin) {
        // Sign out immediately — not an admin, and remove the stale session state.
        await _supabase.auth.signOut();
        localStorage.removeItem('footpathfix-auth');
        throw new Error('Access denied. This account does not have administrator privileges.');
      }

      window.location.href = 'admin-dashboard.html';

    } catch (err) {
      setLoginLoading(false);
      showLoginError(err.message || 'Login failed. Please check your credentials.');
    }
  });
}

// ── Check Admin Role ────────────────────────────────────────────
// Queries the admin_users table — never trusts client-supplied roles.
async function checkAdminRole(userId) {
  try {
    const { data, error } = await _supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Admin check error:', error);
      return false;
    }

    return data !== null;
  } catch {
    return false;
  }
}

// ── Password Toggle ────────────────────────────────────────────
function initPasswordToggle() {
  const toggleBtn = document.getElementById('toggle-password');
  const passInput = document.getElementById('login-password');
  const eyeIcon   = document.getElementById('eye-icon');

  if (!toggleBtn || !passInput) return;

  toggleBtn.addEventListener('click', () => {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    if (eyeIcon) {
      eyeIcon.innerHTML = isHidden
        ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
        : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
  });
}

// ── UI helpers ─────────────────────────────────────────────────
function showFieldError(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden', !show);
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    <span>${msg}</span>`;
  el.classList.remove('hidden');
}

function hideLoginError() {
  const el = document.getElementById('login-error');
  if (el) el.classList.add('hidden');
}

function setLoginLoading(loading) {
  const btn = document.getElementById('login-btn');
  if (!btn) return;
  if (loading) {
    btn.classList.add('btn-loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

// ── Shared: requireAdmin (used on dashboard page) ───────────────
async function requireAdmin() {
  const { data: { session }, error } = await _supabase.auth.getSession();

  if (error || !session) {
    window.location.href = 'admin-login.html';
    return null;
  }

  const isAdmin = await checkAdminRole(session.user.id);

  if (!isAdmin) {
    try {
      await _supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('footpathfix-auth');
    window.location.href = 'admin-login.html';
    return null;
  }

  return session;
}
