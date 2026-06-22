const els = {
  newBtn: document.getElementById('new-btn'),
  status: document.getElementById('status'),
  search: document.getElementById('search'),
  filterType: document.getElementById('filter-type'),
  count: document.getElementById('count'),
  list: document.getElementById('list'),
  empty: document.getElementById('empty'),
  overlay: document.getElementById('editor-overlay'),
  editorTitle: document.getElementById('editor-title'),
  editTitle: document.getElementById('edit-title'),
  editType: document.getElementById('edit-type'),
  editTags: document.getElementById('edit-tags'),
  editBody: document.getElementById('edit-body'),
  editError: document.getElementById('edit-error'),
  saveBtn: document.getElementById('save-btn')
};

let records = [];
let editingId = null;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

function showStatus(text) {
  if (!text) {
    els.status.classList.add('hidden');
    els.status.innerHTML = '';
    return;
  }
  els.status.classList.remove('hidden');
  els.status.innerHTML = `<span>${escapeHtml(text)}</span>`;
  setTimeout(() => showStatus(''), 2500);
}

function cardHtml(r) {
  const tagsHtml = (r.tags || [])
    .map((t) => `<span class="badge">${escapeHtml(t)}</span>`)
    .join('');
  const preview =
    (r.body || '').slice(0, 300) +
    ((r.body || '').length > 300 ? '…' : '');

  return `
    <div class="card" data-id="${r.id}">
      <div class="card-head">
        <div class="card-title">
          <span class="type">${escapeHtml(r.type)}</span>
          <span class="name" data-action="edit">${escapeHtml(r.title)}</span>
        </div>
        <div class="card-actions">
          <button class="icon-btn edit" data-action="edit" title="Edit">&#9998;</button>
          <button class="icon-btn" data-action="delete" title="Delete">&times;</button>
        </div>
      </div>
      <div class="preview">${preview ? escapeHtml(preview) : '<span class="muted">No content yet.</span>'}</div>
      ${tagsHtml ? `<div class="badges"><span class="badge type-${escapeHtml(r.type)}">${escapeHtml(r.type)}</span>${tagsHtml}</div>` : `<div class="badges"><span class="badge type-${escapeHtml(r.type)}">${escapeHtml(r.type)}</span></div>`}
      <div class="card-foot">
        <span class="meta">Updated ${fmtDate(r.updatedAt)}</span>
      </div>
    </div>`;
}

function render() {
  const q = els.search.value.trim().toLowerCase();
  const typeFilter = els.filterType.value;

  let filtered = records;
  if (typeFilter) {
    filtered = filtered.filter((r) => r.type === typeFilter);
  }
  if (q) {
    filtered = filtered.filter((r) => {
      const hay = [r.title, r.body, (r.tags || []).join(' '), r.type]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  els.count.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
  if (records.length === 0) {
    els.list.classList.add('hidden');
    els.empty.classList.remove('hidden');
    return;
  }
  els.empty.classList.add('hidden');
  els.list.classList.remove('hidden');
  els.list.innerHTML = filtered.map(cardHtml).join('');
}

async function refresh() {
  records = await api.list();
  render();
}

function openEditor(record) {
  editingId = record ? record.id : null;
  els.editorTitle.textContent = record ? 'Edit content' : 'New content';
  els.editTitle.value = record ? record.title : '';
  els.editType.value = record ? record.type : 'article';
  els.editTags.value = record ? (record.tags || []).join(', ') : '';
  els.editBody.value = record ? record.body || '' : '';
  els.editError.classList.add('hidden');
  els.overlay.classList.remove('hidden');
  els.editTitle.focus();
}

function closeEditor() {
  els.overlay.classList.add('hidden');
  editingId = null;
}

async function saveContent() {
  const title = els.editTitle.value.trim();
  if (!title) {
    els.editError.textContent = 'Title is required.';
    els.editError.classList.remove('hidden');
    els.editTitle.focus();
    return;
  }

  const tags = els.editTags.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = {
    title,
    type: els.editType.value,
    tags,
    body: els.editBody.value
  };

  els.saveBtn.disabled = true;
  try {
    if (editingId) {
      await api.update(editingId, payload);
    } else {
      await api.create(payload);
    }
    closeEditor();
    await refresh();
  } catch (e) {
    els.editError.textContent = e.message || 'Failed to save.';
    els.editError.classList.remove('hidden');
  } finally {
    els.saveBtn.disabled = false;
  }
}

els.newBtn.addEventListener('click', () => openEditor(null));

els.saveBtn.addEventListener('click', saveContent);

els.search.addEventListener('input', render);
els.filterType.addEventListener('change', render);

els.overlay.addEventListener('click', (e) => {
  if (e.target === els.overlay) closeEditor();
  const btn = e.target.closest('button');
  if (btn && btn.dataset.action === 'close') closeEditor();
  if (btn && btn.dataset.action === 'cancel') closeEditor();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.overlay.classList.contains('hidden')) closeEditor();
});

els.list.addEventListener('click', async (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const card = e.target.closest('.card');
  const id = card?.dataset.id;
  if (!id) return;

  const record = records.find((r) => r.id === id);
  if (!record) return;

  if (actionEl.dataset.action === 'edit') {
    openEditor(record);
  } else if (actionEl.dataset.action === 'delete') {
    if (!confirm(`Delete "${record.title}"?`)) return;
    records = await api.delete(id);
    render();
  }
});

api.onStatus((text) => showStatus(text));

refresh();
