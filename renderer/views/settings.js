// Settings View
CC.views.settings = {
  subView: 'profile',

  html() {
    return `${CC.header('Settings', 'Configure your profile, models, frameworks, connections, and quality rules')}
    <div class="sub-tabs">
      <button class="sub-tab ${this.subView === 'profile' ? 'active' : ''}" data-sub="profile">Profile</button>
      <button class="sub-tab ${this.subView === 'models' ? 'active' : ''}" data-sub="models">Models</button>
      <button class="sub-tab ${this.subView === 'frameworks' ? 'active' : ''}" data-sub="frameworks">Frameworks</button>
      <button class="sub-tab ${this.subView === 'mcps' ? 'active' : ''}" data-sub="mcps">MCPs</button>
      <button class="sub-tab ${this.subView === 'antiAi' ? 'active' : ''}" data-sub="antiAi">Anti-AI</button>
    </div>
    <div class="section-body" id="settings-content">
      ${this.renderSub()}
    </div>`;
  },

  renderSub() {
    switch (this.subView) {
      case 'profile': return this.renderProfile();
      case 'models': return this.renderModels();
      case 'frameworks': return this.renderFrameworks();
      case 'mcps': return this.renderMcps();
      case 'antiAi': return this.renderAntiAi();
      default: return '';
    }
  },

  init() {
    const self = this;
    document.querySelectorAll('.sub-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        self.subView = tab.dataset.sub;
        CC.navigate('settings');
      });
    });
    if (this.subView === 'profile') this.initProfile();
    if (this.subView === 'models') this.initModels();
    if (this.subView === 'frameworks') this.initFrameworks();
    if (this.subView === 'mcps') this.initMcps();
    if (this.subView === 'antiAi') this.initAntiAi();
  },

  // ── Profile ──────────────────────────────
  renderProfile() {
    const p = CC.state.settings?.profile || {};
    return `<div style="max-width:520px">
      <div class="form-group">
        <label>Name</label>
        <input id="pf-name" type="text" value="${CC.escapeHtml(p.name || '')}" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="pf-email" type="email" value="${CC.escapeHtml(p.email || '')}" />
      </div>
      <div class="form-group">
        <label>Bio</label>
        <textarea id="pf-bio" rows="3">${CC.escapeHtml(p.bio || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>LinkedIn</label>
          <input id="pf-linkedin" type="text" value="${CC.escapeHtml(p.social?.linkedin || '')}" />
        </div>
        <div class="form-group">
          <label>Twitter/X</label>
          <input id="pf-twitter" type="text" value="${CC.escapeHtml(p.social?.twitter || '')}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Facebook</label>
          <input id="pf-facebook" type="text" value="${CC.escapeHtml(p.social?.facebook || '')}" />
        </div>
        <div class="form-group">
          <label>Website</label>
          <input id="pf-website" type="text" value="${CC.escapeHtml(p.social?.website || '')}" />
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <button class="btn-primary" id="pf-save">Save Profile</button>
      </div>

      <hr style="margin:28px 0;border:none;border-top:1px solid var(--border)" />
      <h3 style="font-size:15px;margin:0 0 12px">Voice Profiles</h3>
      <div style="margin-bottom:12px">
        <button class="btn-ghost btn-sm" id="vp-import">Import Voice Profile (.md)</button>
      </div>
      ${CC.state.voiceProfiles.map((vp) => `
        <div class="list-item">
          <div class="list-item-info">
            <div class="list-item-title">${CC.escapeHtml(vp.name)} ${vp.isDefault ? '<span class="badge accent">default</span>' : ''}</div>
            <div class="list-item-sub">${CC.escapeHtml((vp.identity || '').slice(0, 80))}...</div>
          </div>
          <div class="list-item-actions">
            ${!vp.isDefault ? `<button class="icon-btn" data-vp-remove="${vp.id}">&times;</button>` : ''}
          </div>
        </div>
      `).join('')}

      <hr style="margin:28px 0;border:none;border-top:1px solid var(--border)" />
      <h3 style="font-size:15px;margin:0 0 12px">Platform Profiles</h3>
      <div style="margin-bottom:12px">
        <button class="btn-ghost btn-sm" id="pp-import">Import Platform Profile (.md)</button>
      </div>
      ${CC.state.platformProfiles.map((pp) => `
        <div class="list-item">
          <div class="list-item-info">
            <div class="list-item-title">${CC.escapeHtml(pp.name)} ${pp.isDefault ? '<span class="badge accent">default</span>' : ''}</div>
            <div class="list-item-sub">Platforms: ${Object.keys(pp.platforms || {}).join(', ')}</div>
          </div>
          <div class="list-item-actions">
            ${!pp.isDefault ? `<button class="icon-btn" data-pp-remove="${pp.id}">&times;</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;
  },

  initProfile() {
    document.getElementById('pf-save')?.addEventListener('click', async () => {
      const profile = {
        name: document.getElementById('pf-name').value,
        email: document.getElementById('pf-email').value,
        bio: document.getElementById('pf-bio').value,
        social: {
          linkedin: document.getElementById('pf-linkedin').value,
          twitter: document.getElementById('pf-twitter').value,
          facebook: document.getElementById('pf-facebook').value,
          website: document.getElementById('pf-website').value
        }
      };
      await CC.api.settings.patch({ profile });
      await CC.refresh('settings');
      CC.showStatus('Profile saved');
    });

    document.getElementById('vp-import')?.addEventListener('click', async () => {
      const result = await CC.api.import.file('voice');
      if (result) { await CC.refresh('voiceProfiles'); CC.navigate('settings'); }
    });

    document.getElementById('pp-import')?.addEventListener('click', async () => {
      const result = await CC.api.import.file('platform');
      if (result) { await CC.refresh('platformProfiles'); CC.navigate('settings'); }
    });

    document.querySelectorAll('[data-vp-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.voiceProfiles.remove(btn.dataset.vpRemove);
        await CC.refresh('voiceProfiles');
        CC.navigate('settings');
      });
    });

    document.querySelectorAll('[data-pp-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.platformProfiles.remove(btn.dataset.ppRemove);
        await CC.refresh('platformProfiles');
        CC.navigate('settings');
      });
    });
  },

  // ── Models ───────────────────────────────
  renderModels() {
    const models = CC.state.models || [];
    return `<div style="margin-bottom:16px;display:flex;gap:10px">
      <button class="btn-primary btn-sm" id="model-add">+ Add Model</button>
    </div>
    <div id="model-form" class="hidden" style="max-width:520px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:16px">
      <div class="form-row">
        <div class="form-group">
          <label>Display Name</label>
          <input id="m-displayName" type="text" placeholder="Claude Sonnet 4.5" />
        </div>
        <div class="form-group">
          <label>Provider</label>
          <select id="m-provider">
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="glm">GLM (Zhipu)</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Model ID</label>
        <input id="m-model" type="text" placeholder="claude-sonnet-4-5-20250514" />
      </div>
      <div class="form-group">
        <label>Connection Type</label>
        <select id="m-connectionType">
          <option value="api-key">API Key</option>
          <option value="oauth-cli">OAuth / CLI</option>
        </select>
      </div>
      <div id="m-apikey-fields">
        <div class="form-group">
          <label>Base URL</label>
          <input id="m-baseUrl" type="text" placeholder="https://api.anthropic.com" />
        </div>
        <div class="form-group">
          <label>API Key</label>
          <input id="m-apiKey" type="password" placeholder="sk-..." />
        </div>
      </div>
      <div id="m-cli-fields" class="hidden">
        <div class="form-group">
          <label>CLI Path</label>
          <input id="m-cliPath" type="text" placeholder="/usr/local/bin/claude" />
        </div>
      </div>
      <div class="form-group">
        <label>Max Output Tokens</label>
        <input id="m-maxTokens" type="number" value="8192" />
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-primary btn-sm" id="m-save">Save Model</button>
        <button class="btn-ghost btn-sm" id="m-cancel">Cancel</button>
      </div>
    </div>
    ${models.length === 0 ? CC.empty('No models configured.', 'Add an AI model to start generating content.') : models.map((m) => `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${CC.escapeHtml(m.displayName || m.model)}</div>
          <div class="list-item-sub">${CC.escapeHtml(m.provider)} &middot; ${CC.escapeHtml(m.model)} &middot; ${m.connectionType === 'oauth-cli' ? 'OAuth/CLI' : 'API Key'}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn-danger btn-sm" data-model-remove="${m.id}">Remove</button>
        </div>
      </div>
    `).join('')}`;
  },

  initModels() {
    const form = document.getElementById('model-form');
    document.getElementById('model-add')?.addEventListener('click', () => {
      form.classList.toggle('hidden');
    });
    document.getElementById('m-cancel')?.addEventListener('click', () => form.classList.add('hidden'));

    const connType = document.getElementById('m-connectionType');
    const apiFields = document.getElementById('m-apikey-fields');
    const cliFields = document.getElementById('m-cli-fields');
    connType?.addEventListener('change', () => {
      const isCli = connType.value === 'oauth-cli';
      apiFields.classList.toggle('hidden', isCli);
      cliFields.classList.toggle('hidden', !isCli);
    });

    // Auto-fill base URL based on provider
    document.getElementById('m-provider')?.addEventListener('change', (e) => {
      const urls = {
        anthropic: 'https://api.anthropic.com',
        openai: 'https://api.openai.com',
        glm: 'https://open.bigmodel.cn/api/paas/v4',
        custom: ''
      };
      const urlField = document.getElementById('m-baseUrl');
      if (urlField && !urlField.value) urlField.value = urls[e.target.value] || '';
    });

    document.getElementById('m-save')?.addEventListener('click', async () => {
      const model = {
        displayName: document.getElementById('m-displayName').value,
        provider: document.getElementById('m-provider').value,
        model: document.getElementById('m-model').value,
        connectionType: document.getElementById('m-connectionType').value,
        baseUrl: document.getElementById('m-baseUrl').value,
        apiKey: document.getElementById('m-apiKey').value,
        cliPath: document.getElementById('m-cliPath').value,
        maxOutputTokens: parseInt(document.getElementById('m-maxTokens').value) || 8192
      };
      await CC.api.models.add(model);
      await CC.refresh('models');
      CC.navigate('settings');
    });

    document.querySelectorAll('[data-model-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.models.remove(btn.dataset.modelRemove);
        await CC.refresh('models');
        CC.navigate('settings');
      });
    });
  },

  // ── Frameworks ──────────────────────────
  renderFrameworks() {
    const fws = CC.state.frameworks || [];
    const cats = {};
    fws.forEach((f) => { if (!cats[f.category]) cats[f.category] = []; cats[f.category].push(f); });

    const catLabels = {
      'insight-prompts': 'Insight Prompts',
      'content-formats': 'Content Formats',
      'headline-formulas': 'Headline Formulas',
      'messaging-frameworks': 'Messaging Frameworks',
      'story-shapes': 'Story Shapes',
      'psychological-triggers': 'Psychological Triggers'
    };

    let html = `<div class="toolbar">
      <input id="fw-search" type="text" placeholder="Search frameworks..." />
      <span class="badge dim">${fws.filter(f => f.active).length} active / ${fws.length} total</span>
      <button class="btn-ghost btn-sm" id="fw-add-custom">+ Add Custom</button>
    </div>`;

    for (const [cat, items] of Object.entries(cats)) {
      html += `<h3 style="font-size:14px;margin:20px 0 10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent-2)">${catLabels[cat] || cat} <span class="badge dim">${items.length}</span></h3>`;
      html += '<div class="card-grid">';
      for (const fw of items) {
        html += `<div class="card fw-card ${fw.active ? '' : 'inactive'}" data-fw-id="${fw.id}">
          <div class="fw-card-head">
            <div>
              <div class="card-title">${CC.escapeHtml(fw.name)}</div>
              <div class="fw-category">${CC.escapeHtml(catLabels[cat] || cat)} &middot; Stage ${fw.stage}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" data-fw-toggle="${fw.id}" ${fw.active ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
          <div class="card-desc">${CC.escapeHtml(fw.description)}</div>
          ${fw.custom ? `<button class="btn-danger btn-sm" data-fw-remove="${fw.id}" style="margin-top:6px">Delete</button>` : ''}
        </div>`;
      }
      html += '</div>';
    }
    return html;
  },

  initFrameworks() {
    document.getElementById('fw-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.fw-card').forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });

    document.querySelectorAll('[data-fw-toggle]').forEach((cb) => {
      cb.addEventListener('change', async () => {
        await CC.api.frameworks.toggle(cb.dataset.fwToggle);
        await CC.refresh('frameworks');
        CC.showStatus(cb.checked ? 'Framework activated' : 'Framework deactivated');
      });
    });

    document.querySelectorAll('[data-fw-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.frameworks.remove(btn.dataset.fwRemove);
        await CC.refresh('frameworks');
        CC.navigate('settings');
      });
    });

    document.getElementById('fw-add-custom')?.addEventListener('click', async () => {
      const name = prompt('Framework name:');
      if (!name) return;
      const desc = prompt('Description:') || '';
      const category = prompt('Category (insight-prompts, content-formats, headline-formulas, messaging-frameworks, story-shapes, psychological-triggers):', 'content-formats') || 'content-formats';
      await CC.api.frameworks.add({ name, description: desc, category, type: 'custom', stage: 1, pairsWellWith: [] });
      await CC.refresh('frameworks');
      CC.navigate('settings');
    });
  },

  // ── MCPs ────────────────────────────────
  renderMcps() {
    const mcps = CC.state.mcps || [];
    return `<div style="margin-bottom:16px">
      <button class="btn-primary btn-sm" id="mcp-add">+ Add MCP</button>
    </div>
    <div id="mcp-form" class="hidden" style="max-width:520px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:16px">
      <div class="form-group">
        <label>Name</label>
        <input id="mcp-name" type="text" placeholder="Payload CMS" />
      </div>
      <div class="form-group">
        <label>URL</label>
        <input id="mcp-url" type="text" placeholder="https://cms.chrislema.com" />
      </div>
      <div class="form-group">
        <label>Auth Type</label>
        <select id="mcp-authType">
          <option value="bearer">Bearer Token</option>
          <option value="api-key">API Key</option>
          <option value="oauth">OAuth</option>
        </select>
      </div>
      <div class="form-group">
        <label>Token / Key</label>
        <input id="mcp-token" type="password" placeholder="..." />
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-primary btn-sm" id="mcp-save">Save</button>
        <button class="btn-ghost btn-sm" id="mcp-cancel">Cancel</button>
      </div>
    </div>
    ${mcps.length === 0 ? CC.empty('No MCPs connected.', 'Add connections to your CMS, newsletter, analytics, etc.') : mcps.map((m) => `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${CC.escapeHtml(m.name)}</div>
          <div class="list-item-sub">${CC.escapeHtml(m.url)} &middot; ${CC.escapeHtml(m.authType)}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn-danger btn-sm" data-mcp-remove="${m.id}">Disconnect</button>
        </div>
      </div>
    `).join('')}`;
  },

  initMcps() {
    const form = document.getElementById('mcp-form');
    document.getElementById('mcp-add')?.addEventListener('click', () => form.classList.toggle('hidden'));
    document.getElementById('mcp-cancel')?.addEventListener('click', () => form.classList.add('hidden'));

    document.getElementById('mcp-save')?.addEventListener('click', async () => {
      await CC.api.mcps.add({
        name: document.getElementById('mcp-name').value,
        url: document.getElementById('mcp-url').value,
        authType: document.getElementById('mcp-authType').value,
        token: document.getElementById('mcp-token').value,
        active: true
      });
      await CC.refresh('mcps');
      CC.navigate('settings');
    });

    document.querySelectorAll('[data-mcp-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.mcps.remove(btn.dataset.mcpRemove);
        await CC.refresh('mcps');
        CC.navigate('settings');
      });
    });
  },

  // ── Anti-AI ─────────────────────────────
  renderAntiAi() {
    const rules = CC.state.antiAi || [];
    const cats = {};
    rules.forEach((r) => { if (!cats[r.category]) cats[r.category] = []; cats[r.category].push(r); });

    const catLabels = {
      'banned-words': 'Banned Words',
      'banned-phrases': 'Banned Phrases',
      'structural-patterns': 'Structural Patterns'
    };

    let html = `<div class="toolbar">
      <button class="btn-primary btn-sm" id="aa-add">+ Add Rule</button>
      <span class="badge dim">${rules.filter(r => r.active).length} active / ${rules.length} total</span>
    </div>`;

    for (const [cat, items] of Object.entries(cats)) {
      html += `<h3 style="font-size:13px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent-2)">${catLabels[cat] || cat}</h3>`;
      for (const r of items) {
        html += `<div class="list-item" style="${r.active ? '' : 'opacity:0.5'}">
          <div class="list-item-info">
            <div class="list-item-title" style="font-size:13.5px">${CC.escapeHtml(r.rule)}</div>
            <div class="list-item-sub">${CC.escapeHtml(r.description || '')} ${r.custom ? '<span class="badge dim">custom</span>' : ''}</div>
          </div>
          <div class="list-item-actions">
            <label class="toggle">
              <input type="checkbox" data-aa-toggle="${r.id}" ${r.active ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
            ${r.custom ? `<button class="icon-btn" data-aa-remove="${r.id}">&times;</button>` : ''}
          </div>
        </div>`;
      }
    }
    return html;
  },

  initAntiAi() {
    document.querySelectorAll('[data-aa-toggle]').forEach((cb) => {
      cb.addEventListener('change', async () => {
        await CC.api.antiAi.toggle(cb.dataset.aaToggle);
        await CC.refresh('antiAi');
        CC.showStatus(cb.checked ? 'Rule enabled' : 'Rule disabled');
      });
    });

    document.querySelectorAll('[data-aa-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.antiAi.remove(btn.dataset.aaRemove);
        await CC.refresh('antiAi');
        CC.navigate('settings');
      });
    });

    document.getElementById('aa-add')?.addEventListener('click', async () => {
      const rule = prompt('Rule (word, phrase, or pattern to flag):');
      if (!rule) return;
      const category = prompt('Category (banned-words, banned-phrases, structural-patterns):', 'banned-words') || 'banned-words';
      await CC.api.antiAi.add({ rule, category, description: 'Custom rule' });
      await CC.refresh('antiAi');
      CC.navigate('settings');
    });
  }
};
