// Drafts View
CC.views.drafts = {
  selectedId: null,
  inputText: '',

  html() {
    const drafts = CC.state.drafts || [];

    if (drafts.length === 0) {
      return `${CC.header('Drafts', 'Collaborative drafting workspace', `
        <button class="btn-primary btn-sm" id="draft-new">+ New Draft</button>
      `)}
        <div class="section-body">
          ${this.renderNewDraftForm()}
          ${CC.empty('No drafts yet.', 'Create a new draft or start one from a topic card.')}
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

    return `${CC.header('Drafts', 'Collaborative drafting workspace', `
      <button class="btn-primary btn-sm" id="draft-new">+ New Draft</button>
    `)}
    ${this.showNewForm ? this.renderNewDraftForm() : ''}
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
          ${conv.map((m) => {
            const roleName = m.role === 'user' ? 'You' : (CC.state.models.find((mo) => mo.id === draft.modelId)?.displayName || 'AI');
            return `<div class="msg ${m.role}">
              <div class="msg-role ${m.role}">${roleName}</div>
              <div class="msg-content">${CC.escapeHtml(m.content)}</div>
            </div>`;
          }).join('')}
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

  renderNewDraftForm() {
    const models = CC.state.models || [];
    const audiences = CC.state.audiences || [];
    const topics = CC.state.topics || [];
    const defaultModelId = CC.state.settings?.defaultModelId;
    const voice = CC.state.voiceProfiles?.find((v) => v.isDefault) || CC.state.voiceProfiles?.[0];
    const activeFws = (CC.state.frameworks || []).filter((f) => f.active);

    return `<div id="draft-new-form" class="mcp-form" style="${this.showNewForm ? '' : 'display:none'}">
      <div class="form-group">
        <label>Subject</label>
        <input id="nd-title" type="text" placeholder="What is this about?" />
      </div>
      <div class="form-group">
        <label>Core Concept</label>
        <textarea id="nd-concept" rows="3" placeholder="What is the main argument, story, or insight you want to make? This gives the AI the seed to work from."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Model</label>
          <select id="nd-model">
            ${models.map((m) => `<option value="${m.id}" ${m.id === defaultModelId ? 'selected' : ''}>${CC.escapeHtml(m.displayName || m.model)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Target Audience</label>
          <select id="nd-audience">
            <option value="">None</option>
            ${audiences.map((a) => `<option value="${a.id}">${CC.escapeHtml(a.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Link to Topic (optional)</label>
        <select id="nd-topic">
          <option value="">None</option>
          ${topics.map((t) => `<option value="${t.id}">${CC.escapeHtml(t.title)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-primary btn-sm" id="nd-create">Create Draft</button>
        <button class="btn-ghost btn-sm" id="nd-cancel">Cancel</button>
      </div>
    </div>`;
  },

  init() {
    const self = this;
    const draft = CC.state.drafts.find((d) => d.id === self.selectedId);

    // New Draft button - toggle form
    document.getElementById('draft-new')?.addEventListener('click', () => {
      self.showNewForm = !self.showNewForm;
      CC.navigate('drafts');
    });

    // Cancel form
    document.getElementById('nd-cancel')?.addEventListener('click', () => {
      self.showNewForm = false;
      CC.navigate('drafts');
    });

    // Create draft
    document.getElementById('nd-create')?.addEventListener('click', async () => {
      const title = document.getElementById('nd-title').value.trim();
      if (!title) { CC.showStatus('Enter a subject'); return; }

      const concept = document.getElementById('nd-concept').value.trim();
      const modelId = document.getElementById('nd-model').value;
      const segmentId = document.getElementById('nd-audience').value;
      const topicId = document.getElementById('nd-topic').value || undefined;
      const voice = CC.state.voiceProfiles?.find((v) => v.isDefault) || CC.state.voiceProfiles?.[0];
      const activeFws = (CC.state.frameworks || []).filter((f) => f.active);

      // Seed the conversation with the core concept as the first message
      const conversation = concept
        ? [{ role: 'user', content: concept }]
        : [];

      const draft = await CC.api.drafts.add({
        title,
        modelId,
        segmentId,
        topicId,
        frameworkIds: activeFws.map((f) => f.id),
        voiceProfileId: voice?.id || '',
        conversation,
        content: ''
      });

      if (topicId) {
        await CC.api.topics.update(topicId, { status: 'drafting' });
        await CC.refresh('topics');
      }

      self.showNewForm = false;
      self.selectedId = draft.id;
      await CC.refresh('drafts');
      CC.navigate('drafts');
    });

    document.querySelectorAll('[data-draft-id]').forEach((el) => {
      el.addEventListener('click', () => {
        self.selectedId = el.dataset.draftId;
        CC.navigate('drafts');
      });
    });

    const input = document.getElementById('draft-input');
    const conv = document.getElementById('draft-conv');
    const btn = document.getElementById('draft-generate');

    // Enter to send, Shift+Enter for newline
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('draft-generate')?.click();
      }
    });

    document.getElementById('draft-generate')?.addEventListener('click', async () => {
      const msg = input.value.trim();
      if (!draft || !msg) return;

      btn.disabled = true;
      btn.textContent = 'Thinking...';
      input.value = '';

      // Show user message immediately
      const userMsg = document.createElement('div');
      userMsg.className = 'msg user';
      const roleName = CC.state.models.find((mo) => mo.id === draft.modelId)?.displayName || 'AI';
      userMsg.innerHTML = `<div class="msg-role user">You</div><div class="msg-content">${CC.escapeHtml(msg)}</div>`;
      conv.appendChild(userMsg);

      // Show thinking placeholder
      const thinkMsg = document.createElement('div');
      thinkMsg.className = 'msg assistant';
      thinkMsg.id = 'draft-thinking';
      thinkMsg.innerHTML = `<div class="msg-role assistant">${CC.escapeHtml(roleName)}</div><div class="msg-content msg-thinking">Thinking...</div>`;
      conv.appendChild(thinkMsg);
      conv.scrollTop = conv.scrollHeight;

      try {
        await CC.api.drafts.generate(draft.id, msg);
        await CC.refresh('drafts');
        CC.navigate('drafts');
      } catch (e) {
        thinkMsg.querySelector('.msg-content').textContent = 'Failed: ' + e.message;
        CC.showStatus('Failed: ' + e.message);
      } finally {
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
    if (conv) conv.scrollTop = conv.scrollHeight;
  }
};
