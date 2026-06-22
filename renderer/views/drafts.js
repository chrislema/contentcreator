// Drafts View
CC.views.drafts = {
  selectedId: null,
  inputText: '',

  html() {
    const drafts = CC.state.drafts || [];

    if (drafts.length === 0) {
      return `${CC.header('Drafts', 'Collaborative drafting workspace')}
        <div class="section-body">
          ${CC.empty('No drafts yet.', 'Start a draft from a topic card, or create a new draft.')}
        </div>`;
    }

    if (!this.selectedId || !drafts.find((d) => d.id === this.selectedId)) {
      this.selectedId = drafts[0].id;
    }

    const draft = drafts.find((d) => d.id === this.selectedId);

    const listHtml = drafts.map((d) => `
      <div class="draft-list-item ${d.id === this.selectedId ? 'active' : ''}" data-draft-id="${d.id}">
        <div class="title">${CC.escapeHtml(d.title)}</div>
        <div class="sub">${d.status === 'published' ? 'Published' : (d.conversation?.length || 0) + ' msgs'} &middot; ${CC.fmtDate(d.updatedAt)}</div>
      </div>
    `).join('');

    const conv = draft.conversation || [];
    const lastAssistant = [...conv].reverse().find((m) => m.role === 'assistant');

    return `${CC.header('Drafts', 'Collaborative drafting workspace')}
    <div class="draft-layout">
      <div class="draft-list-panel">
        ${listHtml}
      </div>
      <div class="draft-workspace">
        <div style="padding:14px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:15px;font-weight:700">${CC.escapeHtml(draft.title)}</div>
            <div style="font-size:12px;color:var(--muted)">${draft.status === 'published' ? 'Published' : 'Drafting'}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-ghost btn-sm" data-draft-distribute="${draft.id}" ${draft.status !== 'published' ? '' : 'disabled'}>Mark Published &amp; Distribute</button>
            <button class="btn-danger btn-sm" data-draft-remove="${draft.id}">Delete</button>
          </div>
        </div>
        <div class="draft-conversation" id="draft-conv">
          ${conv.length === 0 ? `<div class="empty-state" style="padding:40px"><p>No messages yet.</p><p class="muted">Add instructions or a story below and hit Generate.</p></div>` : ''}
          ${conv.map((m) => `
            <div class="msg">
              <div class="msg-role ${m.role}">${m.role === 'user' ? 'You' : 'Draft'}</div>
              <div class="msg-content">${CC.escapeHtml(m.content)}</div>
            </div>
          `).join('')}
        </div>
        <div class="draft-input-area">
          <textarea id="draft-input" placeholder="Add a story, example, case study, different take, or instructions..." rows="3">${CC.escapeHtml(this.inputText)}</textarea>
          <div class="draft-input-actions">
            <span style="font-size:12px;color:var(--muted)">Model: ${CC.escapeHtml(CC.state.models.find((m) => m.id === draft.modelId)?.displayName || 'Not set')}</span>
            <button class="btn-primary btn-sm" id="draft-generate">Generate / Update</button>
          </div>
        </div>
      </div>
    </div>`;
  },

  init() {
    const self = this;
    const draft = CC.state.drafts.find((d) => d.id === self.selectedId);

    document.querySelectorAll('[data-draft-id]').forEach((el) => {
      el.addEventListener('click', () => {
        self.selectedId = el.dataset.draftId;
        CC.navigate('drafts');
      });
    });

    document.getElementById('draft-generate')?.addEventListener('click', async () => {
      const input = document.getElementById('draft-input');
      const msg = input.value.trim();
      if (!draft) return;

      const btn = document.getElementById('draft-generate');
      btn.disabled = true;
      btn.textContent = 'Generating...';
      input.value = '';

      try {
        await CC.api.drafts.generate(draft.id, msg || null);
        await CC.refresh('drafts');
        CC.navigate('drafts');
      } catch (e) {
        CC.showStatus('Failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Generate / Update';
      }
    });

    document.querySelectorAll('[data-draft-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this draft?')) return;
        await CC.api.drafts.remove(btn.dataset.draftRemove);
        await CC.refresh('drafts');
        self.selectedId = null;
        CC.navigate('drafts');
      });
    });

    document.querySelectorAll('[data-draft-distribute]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const draftId = btn.dataset.draftDistribute;
        await CC.api.drafts.update(draftId, { status: 'published' });
        await CC.refresh('drafts');
        CC.views.distributions.selectedDraftId = draftId;
        CC.navigate('distributions');
      });
    });

    // Auto-scroll to bottom of conversation
    const conv = document.getElementById('draft-conv');
    if (conv) conv.scrollTop = conv.scrollHeight;
  }
};
