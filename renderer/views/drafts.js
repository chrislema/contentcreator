// Drafts View
CC.views.drafts = {
  selectedId: null,
  inputText: '',

  html() {
    const drafts = CC.state.drafts || [];

    if (drafts.length === 0) {
      return `${CC.header('Drafts', 'Collaborative drafting workspace', `
        ${CC.ui.button('+ New Draft', { id: 'draft-new' })}
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
      ${CC.ui.button('+ New Draft', { id: 'draft-new' })}
    `)}
    ${this.showNewForm ? this.renderNewDraftForm() : ''}
    <div class="draft-layout">
      <div class="draft-list-panel">
        ${listHtml}
      </div>
      <div class="draft-workspace">
        <div class="draft-header">
          <div>
            <div class="ui-card-title draft-title">${CC.escapeHtml(draft.title)}</div>
            <div class="ui-card-meta draft-status">${draft.status === 'published' ? 'Published' : draft.status === 'ready' ? 'Ready for distribution' : 'Drafting'}</div>
          </div>
          <div class="ui-actions draft-header-actions">
            ${draft.status === 'drafting'
              ? CC.ui.button('Mark Ready', { data: { 'draft-ready': draft.id } })
              : draft.status === 'ready'
                ? `${CC.ui.button('Update Article', { variant: 'ghost', data: { 'draft-ready': draft.id } })}${CC.ui.button('Send to Distribution', { variant: 'ghost', data: { 'draft-distribute': draft.id } })}`
                : ''
            }
            ${CC.ui.button('Delete', { variant: 'danger', data: { 'draft-remove': draft.id } })}
          </div>
        </div>
        <div class="draft-conversation" id="draft-conv">
          ${conv.length === 0 ? `<div class="empty-state conversation-empty"><p>No messages yet.</p><p class="muted">Add instructions or a story below and hit Generate.</p></div>` : ''}
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
            <span class="ui-note draft-model-note">Model: ${CC.escapeHtml(CC.state.models.find((m) => m.id === draft.modelId)?.displayName || 'Not set')}</span>
            ${CC.ui.button('Generate / Update', { id: 'draft-generate' })}
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

    return `<div id="draft-new-form" class="ui-form-panel ${this.showNewForm ? '' : 'hidden'}">
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
      ${CC.ui.formActions(`
        ${CC.ui.button('Create Draft', { id: 'nd-create' })}
        ${CC.ui.button('Cancel', { id: 'nd-cancel', variant: 'ghost' })}
      `)}
    </div>`;
  },

  // Extract article - picks the longest assistant message that looks like an article
  // (has headings or is substantially longer than average)
  extractArticle(draft) {
    if (draft.content && draft.content.length > 200) return draft.content;

    const conv = draft.conversation || [];
    const assistantMsgs = conv.filter((m) => m.role === 'assistant');
    if (assistantMsgs.length === 0) return draft.content || '';

    // Default to the longest assistant message
    let best = assistantMsgs[0];
    for (const m of assistantMsgs) {
      if (m.content.length > best.content.length) best = m;
    }
    return this.cleanArticle(best.content);
  },

  cleanArticle(text) {
    let article = text;

    // Strip content between leading chatter and first heading/hr
    // If the article has --- or # markers, start from there
    const headingIdx = article.search(/^#{1,3}\s/m);
    const hrIdx = article.indexOf('\n---');
    const cutIdx = Math.min(
      headingIdx >= 0 ? headingIdx : Infinity,
      hrIdx >= 0 ? hrIdx : Infinity
    );
    if (cutIdx !== Infinity && cutIdx > 0 && cutIdx < 500) {
      article = article.slice(cutIdx).replace(/^[\s---]+/, '');
    }

    // Strip trailing chatter after the last --- closer
    const lastHr = article.lastIndexOf('\n---');
    if (lastHr >= 0 && lastHr > article.length - 200) {
      const afterHr = article.slice(lastHr + 4).trim();
      // If there's substantial text after the last ---, it's likely postamble
      if (afterHr.length > 20 && afterHr.length < 500) {
        article = article.slice(0, lastHr).trim();
      }
    }

    // Strip common postambles
    const postambles = [
      /\n+(that'?s the (?:finished|final|complete)[^\n]*\.?)$/i,
      /\n+(want me to (?:make|swap|adjust|change)[^\n]*\??)$/i,
      /\n+(let me know (?:what|if|how)[^\n]*\.?)$/i,
      /\n+(how does this look\??)$/i,
      /\n+(would you like me to (?:adjust|revise|change|add)[^\n]*\??)$/i,
      /\n+(hope this helps!?)$/i,
      /\n+(feel free to (?:adjust|edit|tweak|modify)[^\n]*\.?)$/i,
      /\n+(what do you think\??)$/i,
      /\n+(one thing i'?ll flag[^\n]*\.?)$/i,
    ];
    for (const re of postambles) {
      article = article.replace(re, '');
    }

    return article.trim();
  },

  showReadyModal(draft) {
    const conv = draft.conversation || [];
    const assistantMsgs = conv.filter((m) => m.role === 'assistant');

    // Build a dedicated full-screen modal instead of reusing existing-modal
    let modal = document.getElementById('ready-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ready-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const defaultArticle = this.extractArticle(draft);

    modal.innerHTML = `<div class="modal ready-modal">
      <div class="modal-header">
        <h3>Review Article: ${CC.escapeHtml(draft.title)}</h3>
        ${CC.ui.button('Close', { id: 'ready-modal-close', variant: 'ghost' })}
      </div>
      <div class="ready-modal-body">
        <div class="ready-modal-sidebar">
          <div class="ui-kicker ready-section-label">AI Responses (${assistantMsgs.length})</div>
          <div class="ready-version-list">
            ${assistantMsgs.map((m, i) => {
              const preview = m.content.slice(0, 80).replace(/\n/g, ' ');
              const len = m.content.length;
              const hasHeading = /^#{1,3}\s/m.test(m.content);
              return `<div class="ready-version-item ${m.content === defaultArticle ? 'active' : ''}" data-version-idx="${i}">
                <div class="ready-version-label">${i + 1}. ${hasHeading ? CC.ui.badge('Article', { tone: 'accent', size: 'sm' }) : ''} ${len} chars</div>
                <div class="ready-version-preview">${CC.escapeHtml(preview)}...</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="ready-modal-editor">
          <div class="ui-kicker ready-section-label">Article Content (editable)</div>
          <textarea id="ready-article-text" class="ready-article-editor">${CC.escapeHtml(defaultArticle)}</textarea>
          <div class="ui-actions ready-modal-actions">
            ${CC.ui.button('Mark Ready & Save', { id: 'ready-confirm' })}
            ${CC.ui.button('Cancel', { id: 'ready-cancel', variant: 'ghost' })}
          </div>
        </div>
      </div>
    </div>`;
    modal.classList.remove('hidden');

    // Version picker
    modal.querySelectorAll('[data-version-idx]').forEach((el) => {
      el.addEventListener('click', () => {
        modal.querySelectorAll('.ready-version-item').forEach((e) => e.classList.remove('active'));
        el.classList.add('active');
        const idx = parseInt(el.dataset.versionIdx);
        const cleaned = this.cleanArticle(assistantMsgs[idx].content);
        const editor = document.getElementById('ready-article-text');
        editor.value = cleaned;
      });
    });

    modal.querySelector('#ready-modal-close')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    modal.querySelector('#ready-cancel')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.querySelector('#ready-confirm')?.addEventListener('click', async () => {
      const content = document.getElementById('ready-article-text').value.trim();
      modal.classList.add('hidden');
      await CC.api.drafts.update(draft.id, { status: 'ready', content });
      if (draft.topicId) {
        await CC.api.topics.update(draft.topicId, { status: 'completed' });
        await CC.refresh('topics');
      }
      // Generate model-driven summary only if not already present (idempotent)
      if (!draft.summary) {
        CC.showStatus('Generating article summary...');
        try {
          await CC.api.drafts.generateSummary(draft.id);
        } catch (e) {
          CC.showStatus('Summary generation failed: ' + (e.message || e));
        }
      }
      await CC.refresh('drafts');
      CC.showStatus('Draft marked ready for distribution');
      CC.navigate('drafts');
    });
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

    document.querySelectorAll('[data-draft-ready]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const draft = CC.state.drafts.find((d) => d.id === btn.dataset.draftReady);
        if (!draft) return;
        self.showReadyModal(draft);
      });
    });

    document.querySelectorAll('[data-draft-distribute]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const draftId = btn.dataset.draftDistribute;
        CC.views.distributions.selectedDraftId = draftId;
        CC.navigate('distributions');
      });
    });

    // Auto-scroll to bottom of conversation
    if (conv) conv.scrollTop = conv.scrollHeight;
  }
};
