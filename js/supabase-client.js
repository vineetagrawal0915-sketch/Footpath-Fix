// ============================================
//  FootpathFix — Supabase Client Singleton
// ============================================

// Initialize Supabase client using the CDN-loaded library
const { createClient } = supabase;

const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:        true,
    autoRefreshToken:      true,
    detectSessionInUrl:    true,
    storageKey:            'footpathfix-auth',
  }
});

// ── Helper: check if config is set ─────────────────────────────
function isConfigured() {
  return (
    SUPABASE_URL     !== 'YOUR_SUPABASE_PROJECT_URL' &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'  &&
    SUPABASE_URL.startsWith('https://')
  );
}

// ── Toast Notification System ──────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container') ||
    (() => {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();

  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), duration + 300);
}

// ── Global Error Banner ────────────────────────────────────────
function showConfigWarning(elementId) {
  const el = document.getElementById(elementId);
  if (!el || isConfigured()) return;
  el.innerHTML = `
    <div class="alert alert-warning" style="margin-bottom:1.5rem">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <div>
        <strong>Supabase not configured.</strong> Open <code>js/config.js</code> and add your project URL and anon key. 
        See <a href="README.md" style="color:inherit;font-weight:600">README.md</a> for instructions.
      </div>
    </div>`;
  el.classList.remove('hidden');
}

// ── Date formatting ────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  const now  = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60)         return 'just now';
  if (diff < 3600)       return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)      return `${Math.floor(diff/3600)}h ago`;
  if (diff < 2592000)    return `${Math.floor(diff/86400)}d ago`;
  return formatDate(dateStr);
}

// ── Status badge HTML ──────────────────────────────────────────
function statusBadge(status) {
  const map = {
    'Pending':     'badge-pending',
    'In Progress': 'badge-inprogress',
    'Resolved':    'badge-resolved',
  };
  const cls = map[status] || 'badge-pending';
  const dots = {
    'Pending':     '●',
    'In Progress': '●',
    'Resolved':    '●',
  };
  return `<span class="badge ${cls}">${dots[status] || '●'} ${status}</span>`;
}

// ── Category icon map ──────────────────────────────────────────
const CATEGORY_ICONS = {
  'Illegal Parking':       `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  'Street Vendors':        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  'Construction Materials':`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  'Garbage and Waste':     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  'Damaged Footpath':      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  'Other':                 `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

// ── Short UUID generator (for display purposes) ───────────────
function shortId(uuid) {
  return uuid ? uuid.split('-')[0].toUpperCase() : 'N/A';
}

// ── Get public image URL ──────────────────────────────────────
async function getImageUrl(imagePath) {
  if (!imagePath) return null;
  try {
    const { data } = _supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(imagePath);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

// ── Navigation highlight ──────────────────────────────────────
function highlightActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    const hrefPage = href.split('/').pop();
    if (hrefPage === path) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ── Mobile nav toggle ─────────────────────────────────────────
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const nav    = document.getElementById('navbar-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
  });

  // Close on link click
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      toggle.classList.remove('open');
      nav.classList.remove('open');
    });
  });
}

// ── On DOM ready ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNav();
  initMobileNav();
});
