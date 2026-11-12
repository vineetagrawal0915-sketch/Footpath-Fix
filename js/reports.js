// ============================================
//  FootpathFix — View Reports Logic
// ============================================

let allReports     = [];
let filteredReports = [];
let displayedCount = 0;
let viewMode       = 'grid';  // 'grid' | 'list'
let currentModalId = null;

const PAGE_SIZE = 12;

document.addEventListener('DOMContentLoaded', async () => {
  showConfigWarning('config-warning');
  initControls();

  if (!isConfigured()) {
    showNotConfigured();
    return;
  }

  await loadAllReports();

  // Open report directly if ?id= param is in URL
  const params = new URLSearchParams(window.location.search);
  const reportId = params.get('id');
  if (reportId) openReportModal(reportId);
});

// ── Load All Reports from Supabase ─────────────────────────────
async function loadAllReports() {
  setContainerLoading(true);

  try {
    const { data, error } = await _supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allReports = data || [];
    applyFilters();

  } catch (err) {
    console.error('Load error:', err);
    document.getElementById('reports-container').innerHTML = `
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span>Failed to load reports: ${err.message}. Please check your Supabase configuration.</span>
      </div>`;
  }
}

// ── Filter & Search Logic ───────────────────────────────────────
function applyFilters() {
  const search   = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const category = document.getElementById('filter-category')?.value || '';
  const status   = document.getElementById('filter-status')?.value   || '';

  filteredReports = allReports.filter(r => {
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search) ||
      r.location.toLowerCase().includes(search) ||
      shortId(r.id).toLowerCase().includes(search) ||
      r.id.toLowerCase().includes(search);

    const matchCategory = !category || r.category === category;
    const matchStatus   = !status   || r.status   === status;

    return matchSearch && matchCategory && matchStatus;
  });

  displayedCount = 0;
  renderReports(true);
  updateResultsCount();
}

function updateResultsCount() {
  const el = document.getElementById('results-count');
  if (!el) return;
  const total = allReports.length;
  const shown = filteredReports.length;
  el.innerHTML = shown === total
    ? `Showing <strong>${total}</strong> report${total !== 1 ? 's' : ''}`
    : `Showing <strong>${shown}</strong> of <strong>${total}</strong> report${total !== 1 ? 's' : ''}`;
}

// ── Render Reports ──────────────────────────────────────────────
async function renderReports(reset = false) {
  const container = document.getElementById('reports-container');
  const loadMoreWrap = document.getElementById('load-more-wrap');
  if (!container) return;

  if (reset) {
    container.innerHTML = '';
    displayedCount = 0;
  }

  if (filteredReports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <h3>No reports found</h3>
        <p>Try adjusting your search or filters.</p>
        <button class="btn btn-outline btn-sm" onclick="clearAllFilters()" style="margin-top:var(--space-3)">Clear Filters</button>
      </div>`;
    if (loadMoreWrap) loadMoreWrap.classList.add('hidden');
    return;
  }

  const batch = filteredReports.slice(displayedCount, displayedCount + PAGE_SIZE);
  displayedCount += batch.length;

  // Set up wrapper if first render
  if (reset) {
    if (viewMode === 'grid') {
      const grid = document.createElement('div');
      grid.className = 'reports-grid';
      grid.id = 'reports-inner';
      container.appendChild(grid);
    } else {
      const list = document.createElement('div');
      list.className = 'reports-list';
      list.id = 'reports-inner';
      container.appendChild(list);
    }
  }

  const inner = document.getElementById('reports-inner');
  if (!inner) return;

  for (const report of batch) {
    const el = viewMode === 'grid'
      ? await buildGridCard(report)
      : await buildListItem(report);
    inner.appendChild(el);
  }

  // Load more button
  if (displayedCount < filteredReports.length) {
    if (loadMoreWrap) loadMoreWrap.classList.remove('hidden');
  } else {
    if (loadMoreWrap) loadMoreWrap.classList.add('hidden');
  }
}

// ── Grid Card ──────────────────────────────────────────────────
async function buildGridCard(report) {
  const card = document.createElement('article');
  card.className = 'report-card animate-fadeInUp';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Open report: ${report.title}`);

  let imageHtml = `<div class="report-card-no-image">
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  </div>`;

  if (report.image_path) {
    const url = await getImageUrl(report.image_path);
    if (url) imageHtml = `<img src="${url}" alt="Report photo" loading="lazy" />`;
  }

  card.innerHTML = `
    <div class="report-card-image">${imageHtml}</div>
    <div class="report-card-body">
      <span class="report-card-category">${report.category}</span>
      <div class="report-card-title">${escapeHtml(report.title)}</div>
      <div class="report-card-meta">
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(report.location)}
        </span>
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${timeAgo(report.created_at)}
        </span>
      </div>
    </div>
    <div class="report-card-footer">
      <span class="text-xs text-muted font-semibold">#${shortId(report.id)}</span>
      ${statusBadge(report.status)}
    </div>`;

  card.addEventListener('click', () => openReportModal(report.id));
  card.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.key === ' ') openReportModal(report.id);
  });

  return card;
}

// ── List Item ──────────────────────────────────────────────────
async function buildListItem(report) {
  const item = document.createElement('article');
  item.className = 'report-list-item animate-fadeInUp';
  item.setAttribute('tabindex', '0');
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', `Open report: ${report.title}`);

  let thumbHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

  if (report.image_path) {
    const url = await getImageUrl(report.image_path);
    if (url) thumbHtml = `<img src="${url}" alt="Report thumbnail" loading="lazy" />`;
  }

  item.innerHTML = `
    <div class="report-list-thumb">${thumbHtml}</div>
    <div class="report-list-info">
      <div class="report-list-title">${escapeHtml(report.title)}</div>
      <div class="report-list-meta">
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(report.location)}
        </span>
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/></svg>
          ${report.category}
        </span>
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${formatDate(report.created_at)}
        </span>
      </div>
    </div>
    <div class="report-list-actions">
      ${statusBadge(report.status)}
      <span class="report-list-id">#${shortId(report.id)}</span>
    </div>`;

  item.addEventListener('click', () => openReportModal(report.id));
  item.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.key === ' ') openReportModal(report.id);
  });

  return item;
}

// ── Report Detail Modal ────────────────────────────────────────
async function openReportModal(reportId) {
  const modal    = document.getElementById('report-modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  if (!modal || !modalBody) return;

  currentModalId = reportId;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  modalBody.innerHTML = `<div class="loading-overlay" style="padding:var(--space-10)"><div class="spinner"></div></div>`;

  try {
    // Find locally first (avoid extra request)
    let report = allReports.find(r => r.id === reportId);

    if (!report) {
      const { data, error } = await _supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      report = data;
    }

    if (modalTitle) modalTitle.textContent = `Report #${shortId(report.id)}`;

    let imageHtml = `<div class="detail-no-image">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    </div>`;

    if (report.image_path) {
      const url = await getImageUrl(report.image_path);
      if (url) imageHtml = `<img class="detail-image" src="${url}" alt="Report photo" />`;
    }

    const resolutionHtml = report.resolution_note
      ? `<div class="detail-resolution-note">
           <strong>✓ Resolution Note</strong>
           ${escapeHtml(report.resolution_note)}
         </div>`
      : '';

    modalBody.innerHTML = `
      ${imageHtml}
      <div class="detail-header">
        <h3 class="detail-title">${escapeHtml(report.title)}</h3>
        ${statusBadge(report.status)}
      </div>
      <div class="detail-meta-grid">
        <div class="detail-meta-item">
          <span class="detail-meta-label">Category</span>
          <span class="detail-meta-value">
            ${CATEGORY_ICONS[report.category] || ''}
            ${report.category}
          </span>
        </div>
        <div class="detail-meta-item">
          <span class="detail-meta-label">Complaint ID</span>
          <span class="detail-meta-value" style="font-family:monospace;font-size:1rem;color:var(--color-primary)">#${shortId(report.id)}</span>
        </div>
        <div class="detail-meta-item">
          <span class="detail-meta-label">Location</span>
          <span class="detail-meta-value">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(report.location)}
          </span>
        </div>
        <div class="detail-meta-item">
          <span class="detail-meta-label">Submitted</span>
          <span class="detail-meta-value">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${formatDate(report.created_at)}
          </span>
        </div>
      </div>
      <div class="detail-description">${escapeHtml(report.description)}</div>
      ${resolutionHtml}`;

  } catch (err) {
    console.error('Modal error:', err);
    modalBody.innerHTML = `
      <div class="alert alert-error">
        <span>Failed to load report details. ${err.message}</span>
      </div>`;
  }
}

function closeModal() {
  const modal = document.getElementById('report-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  currentModalId = null;
}

// ── Controls Setup ─────────────────────────────────────────────
function initControls() {
  // Search & filters
  let searchTimeout;
  document.getElementById('search-input')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 300);
  });

  document.getElementById('filter-category')?.addEventListener('change', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('clear-filters-btn')?.addEventListener('click', clearAllFilters);

  // Load more
  document.getElementById('load-more-btn')?.addEventListener('click', () => renderReports(false));

  // View toggle
  document.getElementById('view-grid')?.addEventListener('click', () => setViewMode('grid'));
  document.getElementById('view-list')?.addEventListener('click', () => setViewMode('list'));

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);

  document.getElementById('report-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('report-modal')) closeModal();
  });

  // Keyboard escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function clearAllFilters() {
  const search   = document.getElementById('search-input');
  const category = document.getElementById('filter-category');
  const status   = document.getElementById('filter-status');
  if (search)   search.value   = '';
  if (category) category.value = '';
  if (status)   status.value   = '';
  applyFilters();
}

function setViewMode(mode) {
  viewMode = mode;
  document.getElementById('view-grid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('view-list')?.classList.toggle('active', mode === 'list');
  renderReports(true);
}

function setContainerLoading(loading) {
  const container = document.getElementById('reports-container');
  if (!container) return;
  if (loading) {
    container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading reports…</span></div>`;
  }
}

function showNotConfigured() {
  document.getElementById('reports-container').innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <h3>Supabase not configured</h3>
      <p>Add your credentials to <code>js/config.js</code> to load reports.</p>
    </div>`;
}

// ── Escape HTML ────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
