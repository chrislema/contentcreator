// Distributions View
CC.views.distributions = {
  selectedDraftId: null,
  selectedPlatforms: {},

  html() {
    const published = (CC.state.drafts || []).filter((d) => d.status === 'published');
    const dists = CC.state.distributions || [];

    return `${CC.header('Distributions', 'Adapt, promote, and publish your content')}
    <div class="section-body">
      ${published.length === 0 && dists.length === 0 ? CC.empty('No published drafts yet.', 'Mark a draft as published to start distributing.') : ''}

      ${published.length > 0 ? `
        <h3 style="font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent-2)">Published Drafts</h3>
        ${published.map((d) => this.renderDraftRow(d)).join('')}
      ` : ''}

      ${dists.length > 0 ? `
        <h3 style="font-size:14px;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent-2)">Generated Distributions</h3>
        ${dists.map((dist) => this.renderDist(dist)).join('')}
      ` : ''}

      ${this.selectedDraftId ? this.renderPlatformSelector() : ''}
    </div>`;
  },

  renderDraftRow(d) {
    const isSelected = this.selectedDraftId === d.id;
    if (isSelected) return '';
    return `<div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${CC.escapeHtml(d.title)}</div>
        <div class="list-item-sub">Published ${CC.fmtDate(d.updatedAt)}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-primary btn-sm" data-dist-select="${d.id}">Distribute</button>
      </div>
    </div>`;
  },

  renderPlatformSelector() {
    const draft = CC.state.drafts.find((d) => d.id === this.selectedDraftId);
    if (!draft) return '';

    const platforms = [
      { id: 'linkedin', label: 'LinkedIn' },
      { id: 'facebook', label: 'Facebook' },
      { id: 'twitter', label: 'Twitter/X' },
      { id: 'email', label: 'Email' }
    ];

    const mcps = CC.state.mcps || [];
    const cmsMcp = mcps.find((m) => /cms|payload/i.test(m.name));
    const emailMcp = mcps.find((m) => /kit|email|newsletter/i.test(m.name));

    return `<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-top:20px">
      <h3 style="margin:0 0 4px;font-size:15px">Distribute: ${CC.escapeHtml(draft.title)}</h3>
      <p style="color:var(--muted);font-size:13px;margin:0 0 16px">Select platforms for promotional posts</p>
      <div class="checkbox-group" style="margin-bottom:16px">
        ${platforms.map((p) => `
          <label class="checkbox-chip ${this.selectedPlatforms[p.id] ? 'selected' : ''}">
            <input type="checkbox" data-platform="${p.id}" ${this.selectedPlatforms[p.id] ? 'checked' : ''} />
            ${CC.escapeHtml(p.label)}
          </label>
        `).join('')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="btn-primary btn-sm" id="dist-generate">Generate Promotional Posts</button>
        ${cmsMcp ? `<button class="btn-ghost btn-sm" id="dist-push-cms">Push to CMS (${CC.escapeHtml(cmsMcp.name)})</button>` : ''}
        ${emailMcp ? `<button class="btn-ghost btn-sm" id="dist-push-email">Push to Email (${CC.escapeHtml(emailMcp.name)})</button>` : ''}
        <button class="btn-ghost btn-sm" id="dist-cancel">Cancel</button>
      </div>
    </div>`;
  },

  renderDist(dist) {
    const posts = dist.platformPosts || [];
    return `<div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="card-title">${CC.escapeHtml(dist.title || 'Untitled')}</div>
        <span class="badge dim">${CC.fmtDate(dist.createdAt)}</span>
      </div>
      ${posts.map((p) => `
        <div class="platform-post">
          <div class="platform-post-head">
            <span class="badge accent">${CC.escapeHtml(p.platform)}</span>
            <button class="btn-ghost btn-sm" data-copy-post="${CC.escapeHtml(p.content)}">Copy</button>
          </div>
          <div class="platform-post-content">${CC.escapeHtml(p.content)}</div>
        </div>
      `).join('')}
    </div>`;
  },

  init() {
    const self = this;

    document.querySelectorAll('[data-dist-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        self.selectedDraftId = btn.dataset.distSelect;
        self.selectedPlatforms = {};
        CC.navigate('distributions');
      });
    });

    document.querySelectorAll('[data-platform]').forEach((cb) => {
      cb.addEventListener('change', () => {
        self.selectedPlatforms[cb.dataset.platform] = cb.checked;
        cb.closest('.checkbox-chip').classList.toggle('selected', cb.checked);
      });
    });

    document.getElementById('dist-generate')?.addEventListener('click', async () => {
      const platforms = Object.entries(self.selectedPlatforms).filter(([, v]) => v).map(([k]) => k);
      if (platforms.length === 0) { CC.showStatus('Select at least one platform'); return; }

      const models = CC.state.models || [];
      if (models.length === 0) { CC.showStatus('Add a model first'); return; }

      CC.showStatus('Generating promotional posts...');
      try {
        await CC.api.distributions.generate(self.selectedDraftId, platforms, models[0].id);
        await CC.refresh('distributions');
        await CC.refresh('drafts');
        self.selectedDraftId = null;
        CC.navigate('distributions');
      } catch (e) {
        CC.showStatus('Failed: ' + e.message);
      }
    });

    document.getElementById('dist-cancel')?.addEventListener('click', () => {
      self.selectedDraftId = null;
      CC.navigate('distributions');
    });

    document.getElementById('dist-push-cms')?.addEventListener('click', () => {
      CC.showStatus('CMS push - MCP integration coming soon');
    });

    document.getElementById('dist-push-email')?.addEventListener('click', () => {
      CC.showStatus('Email push - MCP integration coming soon');
    });

    document.querySelectorAll('[data-copy-post]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copyPost).then(() => {
          CC.showStatus('Copied to clipboard');
        });
      });
    });
  }
};
