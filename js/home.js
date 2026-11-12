// ============================================
//  FootpathFix — Home Page Logic
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Show config warning if not set up
  showConfigWarning('config-warning');

  if (!isConfigured()) {
    renderFallbackStats();
    renderNoReportsMessage();
    return;
  }

  await Promise.all([
    loadStats(),
    loadRecentReports(),
  ]);
});

// ── Load & display statistics ───────────────────────────────────
async function loadStats() {
  try {
    const { data, error } = await _supabase
      .from('reports')
      .select('status');

    if (error) throw error;

    const counts = { total: data.length, pending: 0, inprogress: 0, resolved: 0 };
    data.forEach(r => {
      if (r.status === 'Pending')     counts.pending++;
      if (r.status === 'In Progress') counts.inprogress++;
      if (r.status === 'Resolved')    counts.resolved++;
    });

    animateCount('stat-total',      counts.total);
    animateCount('stat-pending',    counts.pending);
    animateCount('stat-inprogress', counts.inprogress);
    animateCount('stat-resolved',   counts.resolved);

  } catch (err) {
    console.error('Stats error:', err);
    renderFallbackStats();
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  let current = 0;
  const duration = 1000;
  const step = Math.ceil(target / (duration / 16));

  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 16);
}

function renderFallbackStats() {
  ['stat-total','stat-pending','stat-inprogress','stat-resolved'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

// ── Load & display recent reports ──────────────────────────────
async function loadRecentReports() {
  const container = document.getElementById('recent-reports-container');
  if (!container) return;

  try {
    const { data: reports, error } = await _supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;

    if (!reports || reports.length === 0) {
      renderNoReportsMessage();
      return;
    }

    // Build grid
    const grid = document.createElement('div');
    grid.className = 'recent-reports-grid';

    for (const report of reports) {
      const card = await buildReportCard(report);
      grid.appendChild(card);
    }

    container.innerHTML = '';
    container.appendChild(grid);

  } catch (err) {
    console.error('Recent reports error:', err);
    container.innerHTML = `
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span>Failed to load recent reports. ${err.message || 'Please check your connection.'}</span>
      </div>`;
  }
}

async function buildReportCard(report) {
  const card = document.createElement('article');
  card.className = 'report-card animate-fadeInUp';
  card.setAttribute('role', 'article');
  card.setAttribute('aria-label', `Report: ${report.title}`);
  card.style.cursor = 'pointer';

  let imageHtml = `
    <div class="report-card-no-image">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    </div>`;

  if (report.image_path) {
    const url = await getImageUrl(report.image_path);
    if (url) {
      imageHtml = `<img src="${url}" alt="Report photo for ${report.title}" loading="lazy" />`;
    }
  }

  card.innerHTML = `
    <div class="report-card-image">${imageHtml}</div>
    <div class="report-card-body">
      <span class="report-card-category">${report.category}</span>
      <div class="report-card-title">${escapeHtml(report.title)}</div>
      <div class="report-card-meta">
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(report.location)}
        </span>
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${timeAgo(report.created_at)}
        </span>
      </div>
    </div>
    <div class="report-card-footer">
      <span class="text-xs text-muted font-semibold">#${shortId(report.id)}</span>
      ${statusBadge(report.status)}
    </div>`;

  card.addEventListener('click', () => {
    window.location.href = `reports.html?id=${report.id}`;
  });

  return card;
}

function renderNoReportsMessage() {
  const container = document.getElementById('recent-reports-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      <h3>No reports yet</h3>
      <p>Be the first to report a footpath obstruction in your area.</p>
      <a href="report.html" class="btn btn-primary" style="margin-top:var(--space-3)">Report an Issue</a>
    </div>`;
}

// ── Escape HTML to prevent XSS ─────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
