// ============================================
//  FootpathFix — Report Issue Logic
// ============================================

let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  showConfigWarning('config-warning');
  initForm();
  initImageUpload();
  initCharCounter();
});

// ── Form Initialization ─────────────────────────────────────────
function initForm() {
  const form = document.getElementById('report-form');
  if (!form) return;

  form.addEventListener('submit', handleSubmit);

  // Real-time validation on blur
  ['complaint-title', 'complaint-category', 'complaint-description', 'complaint-location'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('blur', () => validateField(el));
      el.addEventListener('input', () => {
        if (el.classList.contains('error')) validateField(el);
      });
    }
  });

  // Submit another button
  const submitAnother = document.getElementById('submit-another-btn');
  if (submitAnother) {
    submitAnother.addEventListener('click', resetForm);
  }

  // Copy ID button
  const copyBtn = document.getElementById('copy-id-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const idEl = document.getElementById('success-complaint-id');
      if (!idEl) return;
      navigator.clipboard.writeText(idEl.textContent).then(() => {
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => {
          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
        }, 2000);
      });
    });
  }
}

// ── Character Counter ───────────────────────────────────────────
function initCharCounter() {
  const desc = document.getElementById('complaint-description');
  const counter = document.getElementById('desc-char-count');
  if (!desc || !counter) return;

  desc.addEventListener('input', () => {
    const len = desc.value.length;
    counter.textContent = `${len} / 1000`;
    counter.style.color = len > 950 ? 'var(--color-warning)' : '';
  });
}

// ── Image Upload ────────────────────────────────────────────────
function initImageUpload() {
  const area    = document.getElementById('upload-area');
  const input   = document.getElementById('complaint-image');
  const preview = document.getElementById('image-preview-wrap');

  if (!area || !input) return;

  // Keyboard trigger
  area.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.key === ' ') input.click();
  });

  // Drag & Drop
  area.addEventListener('dragover', e => {
    e.preventDefault();
    area.classList.add('drag-over');
  });

  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));

  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFileSelect(input.files[0]);
  });

  function handleFileSelect(file) {
    // Validate type
    if (!APP_CONFIG.allowedImageTypes.includes(file.type)) {
      showImageError('Only JPG, PNG and WebP images are allowed.');
      return;
    }

    // Validate size
    const maxBytes = APP_CONFIG.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      showImageError(`File is too large. Maximum size is ${APP_CONFIG.maxFileSizeMB} MB.`);
      return;
    }

    clearImageError();
    selectedFile = file;
    showImagePreview(file);
  }

  function showImagePreview(file) {
    area.classList.add('hidden');
    if (!preview) return;

    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = `
        <div class="upload-preview">
          <img src="${e.target.result}" alt="Selected image preview" />
          <button type="button" class="upload-preview-remove" id="remove-image-btn" aria-label="Remove image">✕ Remove</button>
        </div>`;
      preview.classList.remove('hidden');

      document.getElementById('remove-image-btn').addEventListener('click', () => {
        selectedFile = null;
        input.value = '';
        preview.innerHTML = '';
        preview.classList.add('hidden');
        area.classList.remove('hidden');
        clearImageError();
      });
    };
    reader.readAsDataURL(file);
  }

  function showImageError(msg) {
    const errText = document.getElementById('image-error-text');
    const errEl   = document.getElementById('image-error');
    if (errText) errText.textContent = msg;
    if (errEl) errEl.classList.remove('hidden');
    selectedFile = null;
    input.value = '';
  }
}

function clearImageError() {
  const errEl = document.getElementById('image-error');
  if (errEl) errEl.classList.add('hidden');
}

// ── Field Validation ────────────────────────────────────────────
function validateField(el) {
  const id    = el.id;
  const value = el.value.trim();
  let valid   = true;
  let errorId = '';

  if (id === 'complaint-title') {
    errorId = 'title-error';
    valid   = value.length >= 5;
  } else if (id === 'complaint-category') {
    errorId = 'category-error';
    valid   = value !== '';
  } else if (id === 'complaint-description') {
    errorId = 'description-error';
    valid   = value.length >= 20;
  } else if (id === 'complaint-location') {
    errorId = 'location-error';
    valid   = value.length >= 5;
  }

  const errEl = document.getElementById(errorId);
  if (valid) {
    el.classList.remove('error');
    if (errEl) errEl.classList.add('hidden');
  } else {
    el.classList.add('error');
    if (errEl) errEl.classList.remove('hidden');
  }

  return valid;
}

function validateAll() {
  const fields = ['complaint-title','complaint-category','complaint-description','complaint-location'];
  return fields.map(id => {
    const el = document.getElementById(id);
    return el ? validateField(el) : true;
  }).every(Boolean);
}

// ── Form Submission ─────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  if (!isConfigured()) {
    showSubmitError('Supabase is not configured. Please set your credentials in js/config.js.');
    return;
  }

  if (!validateAll()) {
    // Scroll to first error
    const firstError = document.querySelector('.form-control.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  setSubmitLoading(true);
  hideSubmitError();

  try {
    // 1. Upload image if present
    let imagePath = null;
    if (selectedFile) {
      imagePath = await uploadImage(selectedFile);
    }

    // 2. Build report record
    const report = {
      title:       document.getElementById('complaint-title').value.trim(),
      category:    document.getElementById('complaint-category').value,
      description: document.getElementById('complaint-description').value.trim(),
      location:    document.getElementById('complaint-location').value.trim(),
      image_path:  imagePath,
      status:      'Pending',
    };

    // 3. Insert into Supabase
    const { data, error } = await _supabase
      .from('reports')
      .insert([report])
      .select()
      .single();

    if (error) throw error;

    // 4. Show success
    showSuccess(data.id);

  } catch (err) {
    console.error('Submit error:', err);
    setSubmitLoading(false);

    if (err.message?.includes('row-level security')) {
      showSubmitError('Submission blocked by security policy. Please check your Supabase RLS policies allow anonymous inserts.');
    } else {
      showSubmitError(err.message || 'Failed to submit complaint. Please try again.');
    }
  }
}

// ── Image Upload to Supabase Storage ───────────────────────────
async function uploadImage(file) {
  const progressWrap = document.getElementById('upload-progress-wrap');
  const progressBar  = document.getElementById('upload-progress-bar');

  if (progressWrap) progressWrap.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '30%';

  const ext       = file.name.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const random    = Math.random().toString(36).substring(2, 8);
  const path      = `reports/${timestamp}-${random}.${ext}`;

  if (progressBar) progressBar.style.width = '60%';

  const { data, error } = await _supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    if (progressWrap) progressWrap.classList.add('hidden');
    throw new Error(`Image upload failed: ${error.message}`);
  }

  if (progressBar) progressBar.style.width = '100%';
  setTimeout(() => {
    if (progressWrap) progressWrap.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';
  }, 500);

  return data.path;
}

// ── UI Helpers ──────────────────────────────────────────────────
function setSubmitLoading(loading) {
  const btn = document.getElementById('submit-btn');
  if (!btn) return;
  if (loading) {
    btn.classList.add('btn-loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

function showSubmitError(msg) {
  const el = document.getElementById('submit-error');
  if (!el) return;
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    <span>${msg}</span>`;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideSubmitError() {
  const el = document.getElementById('submit-error');
  if (el) el.classList.add('hidden');
}

function showSuccess(id) {
  const formWrapper = document.getElementById('form-wrapper');
  const successScreen = document.getElementById('success-screen');
  const idEl = document.getElementById('success-complaint-id');

  if (formWrapper) formWrapper.classList.add('hidden');
  if (successScreen) successScreen.classList.remove('hidden');
  if (idEl) idEl.textContent = shortId(id);

  successScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Complaint submitted successfully!', 'success', 4000);
}

function resetForm() {
  const form = document.getElementById('report-form');
  const formWrapper = document.getElementById('form-wrapper');
  const successScreen = document.getElementById('success-screen');
  const preview = document.getElementById('image-preview-wrap');
  const area = document.getElementById('upload-area');

  if (form) {
    form.reset();
    document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
    document.getElementById('desc-char-count').textContent = '0 / 1000';
  }

  selectedFile = null;
  if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
  if (area) area.classList.remove('hidden');

  if (formWrapper) formWrapper.classList.remove('hidden');
  if (successScreen) successScreen.classList.add('hidden');
  setSubmitLoading(false);
  hideSubmitError();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
