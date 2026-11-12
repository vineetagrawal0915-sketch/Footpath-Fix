// ============================================
//  FootpathFix — Admin Dashboard Logic
// ============================================

let allAdminReports = [];
let filteredAdminReports = [];
let activeView = 'overview';
let currentEditId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Redirect if not admin
  const session = await requireAdmin();
  if (!session) return;

  // Show email
  const emailEl = document.getElementById('admin-user-email');
  if (emailEl) emailEl.textContent = session.user.email;

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    window.location.href = 'admin-login.html';
  });

  initSidebar();
  initUpdateModal();

  // Load data
  await loadAdminData();
});

// ── Load All Data ──────────────────────────────────────────────
async function loadAdminData() {
  try {
    const { data, error } = await _supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allAdminReports = data || [];
    filteredAdminReports = [...allAdminReports];

    updateSidebarCounts();
    renderOverviewStats();
    renderRecentTable();
    renderAdminTable(filteredAdminReports);

  } catch (err) {
    console.error('Admin load error:', err);
    showToast(`Failed to load data: ${err.message}`, 'error', 5000);
  }
}

// ── Sidebar Counts ─────────────────────────────────────────────
function updateSidebarCounts() {
  const counts = getStatusCounts(allAdminReports);
  setEl('sidebar-total',      allAdminReports.length);
  setEl('sidebar-pending',    counts.pending);
  setEl('sidebar-inprogress', counts.inprogress);
  setEl('sidebar-resolved',   counts.resolved);
}

function getStatusCounts(reports) {
  return reports.reduce((acc, r) => {
    if (r.status === 'Pending')     acc.pending++;
    if (r.status === 'In Progress') acc.inprogress++;
    if (r.status === 'Resolved')    acc.resolved++;
    return acc;
  }, { pending: 0, inprogress: 0, resolved: 0 });
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Overview Stats ─────────────────────────────────────────────
function renderOverviewStats() {
  const grid = document.getElementById('dash-stats-grid');
  if (!grid) return;

  const counts = getStatusCounts(allAdminReports);
  const total  = allAdminReports.length;
  const resolvedPct = total ? Math.round((counts.resolved / total) * 100) : 0;

  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:#EFF6FF">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div>
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total Complaints</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#FFFBEB">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <div>
        <div class="stat-value">${counts.pending}</div>
        <div class="stat-label">Pending</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#EFF6FF">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </div>
      <div>
        <div class="stat-value">${counts.inprogress}</div>
        <div class="stat-label">In Progress</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#ECFDF5">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <div class="stat-value">${counts.resolved}</div>
        <div class="stat-label">Resolved (${resolvedPct}%)</div>
      </div>
    </div>`;

  // Category breakdown
  const catCounts = {};
  allAdminReports.forEach(r => {
    catCounts[r.category] = (catCounts[r.category] || 0) + 1;
  });

  const breakdownWrap = document.getElementById('dash-recent-wrap');
}

// ── Recent Table (overview) ────────────────────────────────────
function renderRecentTable() {
  const wrap = document.getElementById('dash-recent-wrap');
  if (!wrap) return;

  if (allAdminReports.length === 0) {
    wrap.innerHTML = `<div class="empty-state" style="padding:var(--space-10)">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
      <h3>No complaints yet</h3><p>Reports will appear here once citizens start submitting.</p>
    </div>`;
    return;
  }

  const recent = allAdminReports.slice(0, 8);
  wrap.innerHTML = `
    <table class="table" aria-label="Recent complaints">
      <thead>
        <tr>
          <th>ID</th><th>Title</th><th>Category</th><th>Location</th><th>Date</th><th>Status</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${recent.map(r => buildTableRow(r)).join('')}
      </tbody>
    </table>`;

  attachTableRowEvents(wrap);
}

// ── Admin Reports Table ────────────────────────────────────────
function renderAdminTable(reports) {
  const tbody = document.getElementById('admin-reports-tbody');
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state" style="padding:var(--space-8)">
        <h3>No reports found</h3><p>Try adjusting your filters.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => buildTableRow(r)).join('');
  attachTableRowEvents(document.getElementById('admin-reports-table'));
}

function buildTableRow(r) {
  return `
    <tr data-id="${escapeHtml(r.id)}" tabindex="0" aria-label="Complaint: ${escapeHtml(r.title)}">
      <td><span style="font-family:monospace;font-weight:700;color:var(--color-primary)">#${shortId(r.id)}</span></td>
      <td><div class="report-title-cell" title="${escapeHtml(r.title)}">${escapeHtml(r.title)}</div></td>
      <td><span style="font-size:0.8rem">${r.category}</span></td>
      <td><div class="report-loc-cell" title="${escapeHtml(r.location)}">${escapeHtml(r.location)}</div></td>
      <td style="font-size:0.8125rem;white-space:nowrap">${formatDate(r.created_at)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <button class="btn btn-outline btn-sm update-btn" data-id="${escapeHtml(r.id)}" aria-label="Update complaint ${shortId(r.id)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Update
        </button>
      </td>
    </tr>`;
}

function attachTableRowEvents(table) {
  if (!table) return;
  table.querySelectorAll('.update-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openUpdateModal(btn.dataset.id);
    });
  });
}

// ── Update Modal ───────────────────────────────────────────────
function openUpdateModal(reportId) {
  const report = allAdminReports.find(r => r.id === reportId);
  if (!report) return;

  currentEditId = reportId;

  const modal    = document.getElementById('update-modal');
  const modalBody = document.getElementById('update-modal-body');
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <div class="update-report-preview">
      <div class="update-report-preview-title">${escapeHtml(report.title)}</div>
      <div class="update-report-preview-meta">
        <span>ID: #${shortId(report.id)}</span>
        <span>Category: ${report.category}</span>
        <span>Location: ${escapeHtml(report.location)}</span>
        <span>Submitted: ${formatDate(report.created_at)}</span>
      </div>
    </div>
    <div class="update-fields">
      <div class="form-group">
        <label for="update-status" class="form-label">Status <span class="required">*</span></label>
        <select id="update-status" class="form-control" aria-required="true">
          <option value="Pending"      ${report.status === 'Pending'     ? 'selected' : ''}>Pending</option>
          <option value="In Progress"  ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved"     ${report.status === 'Resolved'    ? 'selected' : ''}>Resolved</option>
        </select>
      </div>
      <div class="form-group">
        <label for="update-note" class="form-label">Internal Resolution Note <span class="text-muted">(Optional)</span></label>
        <textarea
          id="update-note"
          class="form-control"
          rows="3"
          placeholder="e.g. Field team dispatched on 12 Nov. Vehicle owner notified and towed."
          maxlength="500"
        >${escapeHtml(report.resolution_note || '')}</textarea>
        <div class="form-hint">This note is visible to the public once the status is Resolved.</div>
      </div>
    </div>`;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('update-status')?.focus();
}

function closeUpdateModal() {
  const modal = document.getElementById('update-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  currentEditId = null;

  const saveBtn = document.getElementById('update-modal-save');
  if (saveBtn) {
    saveBtn.classList.remove('btn-loading');
    saveBtn.disabled = false;
  }
}

async function saveUpdate() {
  if (!currentEditId) return;

  const status = document.getElementById('update-status')?.value;
  const note   = document.getElementById('update-note')?.value.trim() || null;

  if (!status) {
    showToast('Please select a status.', 'error');
    return;
  }

  const saveBtn = document.getElementById('update-modal-save');
  if (saveBtn) {
    saveBtn.classList.add('btn-loading');
    saveBtn.disabled = true;
  }

  try {
    const { error } = await _supabase
      .from('reports')
      .update({
        status,
        resolution_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentEditId);

    if (error) throw error;

    // Update local cache
    const idx = allAdminReports.findIndex(r => r.id === currentEditId);
    if (idx !== -1) {
      allAdminReports[idx].status = status;
      allAdminReports[idx].resolution_note = note;
    }

    closeUpdateModal();
    showToast('Complaint updated successfully!', 'success');

    // Re-render
    filteredAdminReports = [...allAdminReports];
    updateSidebarCounts();
    renderOverviewStats();
    renderRecentTable();
    applyAdminFilters();

  } catch (err) {
    console.error('Update error:', err);
    if (saveBtn) {
      saveBtn.classList.remove('btn-loading');
      saveBtn.disabled = false;
    }
    showToast(`Update failed: ${err.message}`, 'error');
  }
}

// ── Admin Filter ───────────────────────────────────────────────
function applyAdminFilters() {
  const search   = document.getElementById('admin-search')?.value.toLowerCase().trim() || '';
  const status   = document.getElementById('admin-filter-status')?.value   || '';
  const category = document.getElementById('admin-filter-category')?.value || '';

  let base = [...allAdminReports];

  // Status view filter from sidebar
  if (activeView === 'pending')    base = base.filter(r => r.status === 'Pending');
  if (activeView === 'inprogress') base = base.filter(r => r.status === 'In Progress');
  if (activeView === 'resolved')   base = base.filter(r => r.status === 'Resolved');

  filteredAdminReports = base.filter(r => {
    const matchSearch   = !search   || r.title.toLowerCase().includes(search) || r.location.toLowerCase().includes(search) || shortId(r.id).toLowerCase().includes(search);
    const matchStatus   = !status   || r.status   === status;
    const matchCategory = !category || r.category === category;
    return matchSearch && matchStatus && matchCategory;
  });

  renderAdminTable(filteredAdminReports);
}

// ── Sidebar navigation ─────────────────────────────────────────
function initSidebar() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
    });
  });

  document.getElementById('dash-view-all-btn')?.addEventListener('click', () => switchView('reports'));
  document.getElementById('refresh-reports-btn')?.addEventListener('click', loadAdminData);

  // Admin filters
  let searchTimeout;
  document.getElementById('admin-search')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyAdminFilters, 300);
  });
  document.getElementById('admin-filter-status')?.addEventListener('change', applyAdminFilters);
  document.getElementById('admin-filter-category')?.addEventListener('change', applyAdminFilters);
}

function switchView(view) {
  activeView = view;

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`[data-view="${view}"]`);
  if (link) link.classList.add('active');

  const overviewEl = document.getElementById('view-overview');
  const reportsEl  = document.getElementById('view-reports');

  if (view === 'overview') {
    if (overviewEl) overviewEl.classList.remove('hidden');
    if (reportsEl)  reportsEl.classList.add('hidden');
  } else {
    if (overviewEl) overviewEl.classList.add('hidden');
    if (reportsEl)  reportsEl.classList.remove('hidden');

    // Update title
    const titleEl = document.getElementById('reports-view-title');
    if (titleEl) {
      const titles = {
        reports:    'All Complaints',
        pending:    'Pending Complaints',
        inprogress: 'In Progress Complaints',
        resolved:   'Resolved Complaints',
      };
      titleEl.textContent = titles[view] || 'Complaints';
    }

    // Apply filter
    document.getElementById('admin-filter-status').value = '';
    applyAdminFilters();
  }
}

// ── Modal Controls ─────────────────────────────────────────────
function initUpdateModal() {
  document.getElementById('update-modal-close')?.addEventListener('click',  closeUpdateModal);
  document.getElementById('update-modal-cancel')?.addEventListener('click', closeUpdateModal);
  document.getElementById('update-modal-save')?.addEventListener('click',   saveUpdate);

  document.getElementById('update-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('update-modal')) closeUpdateModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeUpdateModal();
  });
}

// ── Escape HTML ────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
