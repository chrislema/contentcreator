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
      <button class="sub-tab ${this.subView === 'existing' ? 'active' : ''}" data-sub="existing">Existing Content</button>
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
      case 'existing': return this.renderExisting();
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
    if (this.subView === 'existing') this.initExisting();
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
  modelChatHistory: [],

  renderModels() {
    const models = CC.state.models || [];
    return `<div class="mcp-section">
      <button class="btn-primary btn-sm" id="model-add">+ Add Model</button>
      <div id="model-form" class="hidden mcp-form">
        <div class="form-row">
          <div class="form-group">
            <label>Display Name</label>
            <input id="m-displayName" type="text" placeholder="Claude Opus 4.8" />
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
          <input id="m-model" type="text" placeholder="claude-opus-4-8" />
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
            <label>CLI Command</label>
            <input id="m-cliPath" type="text" placeholder="claude" />
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
      <div class="mcp-list">
        ${models.length === 0 ? CC.empty('No models configured.', 'Add an AI model to start generating content.') : models.map((m) => this.renderModelCard(m)).join('')}
      </div>
      ${models.length > 0 ? this.renderModelChat(models) : ''}
    </div>`;
  },

  renderModelCard(m) {
    const connType = m.connectionType === 'oauth-cli' ? 'OAuth/CLI' : 'API Key';
    const tested = m.lastTested;
    const statusBadge = tested
      ? (m.lastTestResult ? '<span class="badge ok">Working</span>' : '<span class="badge" style="color:var(--danger);border-color:var(--danger)">Failed</span>')
      : '<span class="badge dim">Untested</span>';
    const isDefault = CC.state.settings.defaultModelId === m.id;
    const defaultBadge = isDefault ? '<span class="badge accent">Default</span>' : '';

    return `<div class="mcp-card ${isDefault ? 'mcp-card-highlighted' : ''}">
      <div class="mcp-card-top">
        <div class="mcp-card-name">${CC.escapeHtml(m.displayName || m.model)} ${statusBadge} ${defaultBadge}</div>
        <div class="mcp-card-actions">
          ${isDefault
            ? '<span style="font-size:12px;color:var(--accent);font-weight:600;padding:4px 8px">Default Model</span>'
            : `<button class="btn-ghost btn-sm" data-model-default="${m.id}">Set Default</button>`
          }
          <button class="btn-primary btn-sm" data-model-test="${m.id}">Test</button>
          <button class="btn-ghost btn-sm" data-model-edit="${m.id}">Edit</button>
          <button class="btn-ghost btn-sm" data-model-remove="${m.id}">Remove</button>
        </div>
      </div>
      <div class="mcp-card-url">
        ${CC.escapeHtml(m.provider)} &middot; ${CC.escapeHtml(m.model)} &middot; ${connType}
        ${m.baseUrl ? `<br>${CC.escapeHtml(m.baseUrl)}` : ''}
        ${m.cliPath ? `<br>CLI: ${CC.escapeHtml(m.cliPath)}` : ''}
      </div>
    </div>`;
  },

  renderModelChat(models) {
    const history = this.modelChatHistory || [];
    const workingModels = models.filter((m) => m.lastTestResult);
    const defaultModelId = CC.state.settings?.defaultModelId;
    const selectedModel = this.modelChatModelId
      || defaultModelId
      || (workingModels[0] && workingModels[0].id)
      || (models[0] && models[0].id)
      || '';
    const modelName = models.find((m) => m.id === selectedModel)?.displayName || models[0]?.displayName || 'None';
    const modelCount = models.length;
    const workingCount = workingModels.length;

    return `<div class="mcp-chat">
      <div class="mcp-chat-messages" id="model-chat-messages">
        ${history.length === 0
          ? `<div class="mcp-chat-empty">Test your model:<br><span>"Write a one-sentence greeting"</span></div>`
          : history.map((msg) => this.renderChatMessage(msg)).join('')
        }
      </div>
      <div class="mcp-chat-input-wrap">
        <textarea id="model-chat-input" class="mcp-chat-input" rows="1" placeholder="Test your model..."></textarea>
        <button id="model-chat-send" class="mcp-chat-send" ${models.length === 0 ? 'disabled' : ''}>&#9650;</button>
      </div>
      <div class="mcp-chat-meta">
        <div class="mcp-chat-meta-item" id="model-chat-model-label">
          <span class="mcp-chat-meta-label">Model</span>
          <span class="mcp-chat-meta-value">${CC.escapeHtml(modelName)}</span>
        </div>
        <span class="badge ${workingCount > 0 ? 'ok' : 'dim'}">${workingCount}/${modelCount} working</span>
        ${history.length > 0 ? '<button class="mcp-chat-clear" id="model-chat-clear">Clear chat</button>' : ''}
      </div>
      <select id="model-chat-model-select" class="hidden">
        ${models.map((m) => {
          const status = m.lastTested ? (m.lastTestResult ? ' (working)' : ' (failed)') : ' (untested)';
          return `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${CC.escapeHtml((m.displayName || m.model) + status)}</option>`;
        }).join('')}
      </select>
    </div>`;
  },

  initModels() {
    const self = this;
    const form = document.getElementById('model-form');
    document.getElementById('model-add')?.addEventListener('click', () => {
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        delete form.dataset.editId;
        form.querySelectorAll('input').forEach((i) => { if (i.type !== 'number') i.value = ''; });
        document.getElementById('m-maxTokens').value = '8192';
        document.getElementById('m-save').textContent = 'Save Model';
      }
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
      const editId = form.dataset.editId;
      const payload = {
        displayName: document.getElementById('m-displayName').value,
        provider: document.getElementById('m-provider').value,
        model: document.getElementById('m-model').value,
        connectionType: document.getElementById('m-connectionType').value,
        baseUrl: document.getElementById('m-baseUrl').value,
        apiKey: document.getElementById('m-apiKey').value,
        cliPath: document.getElementById('m-cliPath').value,
        maxOutputTokens: parseInt(document.getElementById('m-maxTokens').value) || 8192
      };
      if (editId) {
        await CC.api.models.update(editId, payload);
        delete form.dataset.editId;
      } else {
        await CC.api.models.add(payload);
      }
      await CC.refresh('models');
      CC.navigate('settings');
    });

    // Edit
    document.querySelectorAll('[data-model-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = CC.state.models.find((mo) => mo.id === btn.dataset.modelEdit);
        if (!m) return;
        form.classList.remove('hidden');
        form.dataset.editId = m.id;
        document.getElementById('m-displayName').value = m.displayName || '';
        document.getElementById('m-provider').value = m.provider || 'anthropic';
        document.getElementById('m-model').value = m.model || '';
        document.getElementById('m-connectionType').value = m.connectionType || 'api-key';
        document.getElementById('m-baseUrl').value = m.baseUrl || '';
        document.getElementById('m-apiKey').value = m.apiKey || '';
        document.getElementById('m-cliPath').value = m.cliPath || '';
        document.getElementById('m-maxTokens').value = m.maxOutputTokens || 8192;
        // Toggle fields
        const isCli = (m.connectionType || 'api-key') === 'oauth-cli';
        apiFields.classList.toggle('hidden', isCli);
        cliFields.classList.toggle('hidden', !isCli);
        document.getElementById('m-save').textContent = 'Update';
        form.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Remove
    document.querySelectorAll('[data-model-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.models.remove(btn.dataset.modelRemove);
        await CC.refresh('models');
        CC.navigate('settings');
      });
    });

    // Set default model
    document.querySelectorAll('[data-model-default]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.settings.patch({ defaultModelId: btn.dataset.modelDefault });
        await CC.refresh('settings');
        CC.navigate('settings');
      });
    });

    // Quick test from card
    document.querySelectorAll('[data-model-test]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Testing...';
        try {
          const result = await CC.api.models.test(btn.dataset.modelTest, 'Say "Model connected and working" in one sentence.');
          // Update model record with test status
          await CC.api.models.update(btn.dataset.modelTest, {
            lastTested: new Date().toISOString(),
            lastTestResult: result.connected
          });
          await CC.refresh('models');
          CC.navigate('settings');
        } catch (e) {
          CC.showStatus('Test failed: ' + e.message);
          await CC.api.models.update(btn.dataset.modelTest, {
            lastTested: new Date().toISOString(),
            lastTestResult: false
          });
          await CC.refresh('models');
          CC.navigate('settings');
        }
      });
    });

    // Model chat handlers
    const chatInput = document.getElementById('model-chat-input');
    const chatSend = document.getElementById('model-chat-send');
    const modelSelect = document.getElementById('model-chat-model-select');

    async function sendChat() {
      const modelId = self.modelChatModelId || modelSelect.value;
      const query = chatInput.value.trim();
      if (!modelId || !query) return;

      self.modelChatHistory.push({ role: 'user', content: query });
      self.modelChatHistory.push({ role: 'system', content: 'Thinking...' });
      chatInput.value = '';
      chatInput.style.height = '';
      CC.navigate('settings');

      try {
        const result = await CC.api.models.test(modelId, query);
        self.modelChatHistory.pop();
        if (result.connected) {
          self.modelChatHistory.push({ role: 'assistant', content: result.response });
        } else {
          self.modelChatHistory.push({ role: 'assistant', content: 'Failed: ' + result.error });
        }
      } catch (e) {
        self.modelChatHistory.pop();
        self.modelChatHistory.push({ role: 'assistant', content: 'Failed: ' + e.message });
      } finally {
        CC.navigate('settings');
        setTimeout(() => {
          const msgs = document.getElementById('model-chat-messages');
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
          document.getElementById('model-chat-input')?.focus();
        }, 50);
      }
    }

    chatSend?.addEventListener('click', sendChat);
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
    chatInput?.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
    });

    // Model selector
    document.getElementById('model-chat-model-label')?.addEventListener('click', () => {
      modelSelect.classList.toggle('hidden');
      if (!modelSelect.classList.contains('hidden')) modelSelect.focus();
    });
    modelSelect?.addEventListener('change', () => {
      self.modelChatModelId = modelSelect.value;
      modelSelect.classList.add('hidden');
      CC.navigate('settings');
    });
    modelSelect?.addEventListener('blur', () => modelSelect.classList.add('hidden'));

    // Clear chat
    document.getElementById('model-chat-clear')?.addEventListener('click', () => {
      self.modelChatHistory = [];
      CC.navigate('settings');
    });

    setTimeout(() => {
      const msgs = document.getElementById('model-chat-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 50);
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
  mcpChatHistory: [],

  renderMcps() {
    const mcps = CC.state.mcps || [];
    return `<div class="mcp-section">
      <button class="btn-primary btn-sm" id="mcp-add">+ Add MCP</button>
      <div id="mcp-form" class="hidden mcp-form">
        <div class="form-group">
          <label>Name</label>
          <input id="mcp-name" type="text" placeholder="ContentStudio" />
        </div>
        <div class="form-group">
          <label>Transport Type</label>
          <select id="mcp-transport">
            <option value="http">HTTP (URL + Token)</option>
            <option value="stdio">stdio (Local Command)</option>
          </select>
        </div>
        <div id="mcp-http-fields">
          <div class="form-group">
            <label>URL</label>
            <input id="mcp-url" type="text" placeholder="https://cms.chrislema.com" />
          </div>
          <div class="form-group">
            <label>Auth Type</label>
            <select id="mcp-authType">
              <option value="bearer">Bearer Token</option>
              <option value="api-key">API Key</option>
              <option value="oauth">OAuth (Managed)</option>
            </select>
          </div>
          <div class="form-group" id="mcp-token-group">
            <label>Token / Key <span style="font-weight:400;color:var(--muted)">(not needed for OAuth)</span></label>
            <input id="mcp-token" type="password" placeholder="..." />
          </div>
        </div>
        <div id="mcp-stdio-fields" class="hidden">
          <div class="form-group">
            <label>Command</label>
            <input id="mcp-command" type="text" placeholder="npx" />
          </div>
          <div class="form-group">
            <label>Args (space-separated)</label>
            <input id="mcp-args" type="text" placeholder="-y contentstudio-mcp" />
          </div>
          <div class="form-group">
            <label>Env Vars (KEY=value, one per line)</label>
            <textarea id="mcp-env" rows="3" placeholder="CONTENTSTUDIO_API_KEY=your-key-here"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn-primary btn-sm" id="mcp-save">Save</button>
          <button class="btn-ghost btn-sm" id="mcp-cancel">Cancel</button>
        </div>
      </div>
      <div id="mcp-list" class="mcp-list">
        ${mcps.length === 0 ? CC.empty('No MCPs connected.', 'Add connections to your CMS, newsletter, analytics, etc.') : mcps.map((m) => this.renderMcpCard(m)).join('')}
      </div>
      ${mcps.length > 0 ? this.renderMcpChat(mcps) : ''}
    </div>`;
  },

  renderMcpCard(m) {
    const connected = m.connected;
    const toolCount = m.toolCount || 0;
    const statusBadge = connected
      ? `<span class="badge ok">Connected</span>`
      : `<span class="badge dim">Not connected</span>`;

    return `<div class="mcp-card">
      <div class="mcp-card-top">
        <div class="mcp-card-name">${CC.escapeHtml(m.name)} ${statusBadge}</div>
        <div class="mcp-card-actions">
          ${connected
            ? `<button class="btn-danger btn-sm" data-mcp-disconnect="${m.id}">Disconnect</button>`
            : `<button class="btn-primary btn-sm" data-mcp-connect="${m.id}">Connect</button>`
          }
          <button class="btn-ghost btn-sm" data-mcp-edit="${m.id}">Edit</button>
          <button class="btn-ghost btn-sm" data-mcp-remove="${m.id}">Remove</button>
        </div>
      </div>
      <div class="mcp-card-url">
        ${m.transport === 'stdio'
          ? `${CC.escapeHtml(m.command || 'npx')} ${CC.escapeHtml((m.args || []).join(' '))}`
          : `${CC.escapeHtml(m.url)} &middot; ${CC.escapeHtml(m.authType)}`
        }
        ${connected ? ` &middot; <span style="color:var(--accent)">${toolCount} tools</span>` : ''}
        ${m.lastError ? ` &middot; <span style="color:var(--danger)">${CC.escapeHtml(m.lastError)}</span>` : ''}
      </div>
      ${connected && m.tools && m.tools.length ? `<div class="mcp-card-tags">${m.tools.map((t) => `<span class="badge dim" style="font-size:10.5px">${CC.escapeHtml(t.name)}</span>`).join('')}</div>` : ''}
    </div>`;
  },

  renderMcpChat(mcps) {
    const connectedMcps = mcps.filter((m) => m.connected);
    const models = CC.state.models || [];
    const workingModels = models.filter((m) => m.lastTestResult);
    const history = this.mcpChatHistory || [];
    const selectedMcp = this.mcpChatMcpId || (connectedMcps[0] && connectedMcps[0].id) || '';
    const defaultModelId = CC.state.settings?.defaultModelId;
    const selectedModel = this.mcpChatModelId
      || defaultModelId
      || (workingModels[0] && workingModels[0].id)
      || (models[0] && models[0].id)
      || '';
    const mcpName = connectedMcps.find((m) => m.id === selectedMcp)?.name || 'None';
    const modelName = models.find((m) => m.id === selectedModel)?.displayName || 'None';
    const mcpCount = mcps.length;
    const connectedCount = connectedMcps.length;
    const modelCount = models.length;
    const modelWorkingCount = workingModels.length;

    return `<div class="mcp-chat">
      <div class="mcp-chat-messages" id="mcp-chat-messages">
        ${history.length === 0
          ? `<div class="mcp-chat-empty">Ask something like:<br><span>"Use payload cms to give me the title of my last post"</span></div>`
          : history.map((msg) => this.renderChatMessage(msg)).join('')
        }
      </div>
      <div class="mcp-chat-input-wrap">
        <textarea id="mcp-chat-input" class="mcp-chat-input" rows="1" placeholder="Ask your MCP..."></textarea>
        <button id="mcp-chat-send" class="mcp-chat-send" ${connectedMcps.length === 0 ? 'disabled' : ''}>&#9650;</button>
      </div>
      <div class="mcp-chat-meta">
        <div class="mcp-chat-meta-item" id="mcp-chat-mcp-label">
          <span class="mcp-chat-meta-label">MCP</span>
          <span class="mcp-chat-meta-value">${CC.escapeHtml(mcpName)}</span>
        </div>
        <span class="badge ${connectedCount > 0 ? 'ok' : 'dim'}">${connectedCount}/${mcpCount} connected</span>
        <div class="mcp-chat-meta-item" id="mcp-chat-model-label">
          <span class="mcp-chat-meta-label">Model</span>
          <span class="mcp-chat-meta-value">${CC.escapeHtml(modelName)}</span>
        </div>
        <span class="badge ${modelWorkingCount > 0 ? 'ok' : 'dim'}">${modelWorkingCount}/${modelCount} working</span>
        ${history.length > 0 ? '<button class="mcp-chat-clear" id="mcp-chat-clear">Clear chat</button>' : ''}
      </div>
      <select id="mcp-chat-mcp-select" class="hidden">
        ${connectedMcps.map((m) => {
          const toolCount = m.toolCount || 0;
          return `<option value="${m.id}" ${m.id === selectedMcp ? 'selected' : ''}>${CC.escapeHtml(m.name + (toolCount ? ' (' + toolCount + ' tools)' : ''))}</option>`;
        }).join('')}
      </select>
      <select id="mcp-chat-model-select" class="hidden">
        ${models.map((m) => {
          const status = m.lastTested ? (m.lastTestResult ? ' (working)' : ' (failed)') : ' (untested)';
          return `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${CC.escapeHtml((m.displayName || m.model) + status)}</option>`;
        }).join('')}
      </select>
    </div>`;
  },

  renderChatMessage(msg) {
    if (msg.role === 'user') {
      return `<div class="mcp-chat-user"><div class="mcp-chat-user-bubble">${CC.escapeHtml(msg.content)}</div></div>`;
    }
    if (msg.role === 'system') {
      return `<div class="mcp-chat-system">${CC.escapeHtml(msg.content)}</div>`;
    }
    const toolBadge = msg.tool ? `<div class="mcp-chat-tool"><span class="badge accent">${CC.escapeHtml(msg.tool)}</span></div>` : '';
    return `<div class="mcp-chat-assistant">${toolBadge}<div class="mcp-chat-assistant-text">${CC.escapeHtml(msg.content)}</div></div>`;
  },

  initMcps() {
    const form = document.getElementById('mcp-form');
    const transportSelect = document.getElementById('mcp-transport');
    const httpFields = document.getElementById('mcp-http-fields');
    const stdioFields = document.getElementById('mcp-stdio-fields');
    const authSelect = document.getElementById('mcp-authType');
    const tokenGroup = document.getElementById('mcp-token-group');

    function toggleTransportFields() {
      const isStdio = transportSelect.value === 'stdio';
      httpFields.classList.toggle('hidden', isStdio);
      stdioFields.classList.toggle('hidden', !isStdio);
    }
    function toggleAuthFields() {
      tokenGroup.style.display = authSelect.value === 'oauth' ? 'none' : '';
    }
    transportSelect?.addEventListener('change', toggleTransportFields);
    authSelect?.addEventListener('change', toggleAuthFields);

    document.getElementById('mcp-add')?.addEventListener('click', () => {
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        delete form.dataset.editId;
        form.querySelector('#mcp-name').value = '';
        form.querySelector('#mcp-url').value = '';
        form.querySelector('#mcp-token').value = '';
        form.querySelector('#mcp-command').value = '';
        form.querySelector('#mcp-args').value = '';
        form.querySelector('#mcp-env').value = '';
        transportSelect.value = 'http';
        authSelect.value = 'bearer';
        toggleTransportFields();
        toggleAuthFields();
        document.getElementById('mcp-save').textContent = 'Save';
      }
    });
    document.getElementById('mcp-cancel')?.addEventListener('click', () => form.classList.add('hidden'));

    document.getElementById('mcp-save')?.addEventListener('click', async () => {
      const editId = form.dataset.editId;
      const transport = transportSelect.value;
      const payload = {
        name: document.getElementById('mcp-name').value,
        transport,
        active: true
      };

      if (transport === 'stdio') {
        payload.command = document.getElementById('mcp-command').value.trim() || 'npx';
        payload.args = document.getElementById('mcp-args').value.trim().split(/\s+/).filter(Boolean);
        // Parse env textarea into object
        const env = {};
        document.getElementById('mcp-env').value.split('\n').forEach((line) => {
          const eq = line.indexOf('=');
          if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        });
        payload.env = env;
      } else {
        payload.url = document.getElementById('mcp-url').value;
        payload.authType = document.getElementById('mcp-authType').value;
        payload.token = document.getElementById('mcp-token').value;
      }

      payload.connected = false;
      payload.toolCount = 0;
      payload.tools = [];

      if (editId) {
        await CC.api.mcps.update(editId, payload);
        delete form.dataset.editId;
        document.getElementById('mcp-save').textContent = 'Save';
      } else {
        await CC.api.mcps.add(payload);
      }
      await CC.refresh('mcps');
      CC.navigate('settings');
    });

    document.querySelectorAll('[data-mcp-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mcp = CC.state.mcps.find((m) => m.id === btn.dataset.mcpEdit);
        if (!mcp) return;
        form.classList.remove('hidden');
        form.dataset.editId = mcp.id;
        document.getElementById('mcp-name').value = mcp.name || '';
        document.getElementById('mcp-url').value = mcp.url || '';
        document.getElementById('mcp-authType').value = mcp.authType || 'bearer';
        document.getElementById('mcp-token').value = mcp.token || '';
        document.getElementById('mcp-command').value = mcp.command || '';
        document.getElementById('mcp-args').value = (mcp.args || []).join(' ');
        document.getElementById('mcp-env').value = Object.entries(mcp.env || {}).map(([k, v]) => `${k}=${v}`).join('\n');
        transportSelect.value = mcp.transport || 'http';
        toggleTransportFields();
        toggleAuthFields();
        document.getElementById('mcp-save').textContent = 'Update';
        form.scrollIntoView({ behavior: 'smooth' });
      });
    });

    document.querySelectorAll('[data-mcp-connect]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Connecting...';
        try {
          await CC.api.mcps.connect(btn.dataset.mcpConnect);
          await CC.refresh('mcps');
          CC.navigate('settings');
        } catch (e) {
          CC.showStatus('Connection failed: ' + e.message);
          await CC.refresh('mcps');
          CC.navigate('settings');
        }
      });
    });

    document.querySelectorAll('[data-mcp-disconnect]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.mcps.disconnect(btn.dataset.mcpDisconnect);
        await CC.refresh('mcps');
        CC.navigate('settings');
      });
    });

    document.querySelectorAll('[data-mcp-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.mcps.remove(btn.dataset.mcpRemove);
        await CC.refresh('mcps');
        CC.navigate('settings');
      });
    });

    // MCP chat handlers
    const self = this;
    const chatInput = document.getElementById('mcp-chat-input');
    const chatSend = document.getElementById('mcp-chat-send');
    const mcpSelect = document.getElementById('mcp-chat-mcp-select');
    const modelSelect = document.getElementById('mcp-chat-model-select');

    async function sendChat() {
      const mcpId = self.mcpChatMcpId || mcpSelect.value;
      const modelId = self.mcpChatModelId || modelSelect.value;
      const query = chatInput.value.trim();
      if (!mcpId || !query) return;

      if (!modelId) {
        self.mcpChatHistory.push({ role: 'system', content: 'Add a model in Settings > Models first' });
        CC.navigate('settings');
        return;
      }

      self.mcpChatHistory.push({ role: 'user', content: query });
      self.mcpChatHistory.push({ role: 'system', content: 'Thinking...' });
      chatInput.value = '';
      chatInput.style.height = '';
      CC.navigate('settings');

      try {
        const result = await CC.api.mcps.query(mcpId, query, modelId);
        self.mcpChatHistory.pop();

        if (result.error) {
          self.mcpChatHistory.push({ role: 'assistant', content: result.error });
        } else if (result.formatted) {
          self.mcpChatHistory.push({ role: 'assistant', content: result.formatted, tool: result.tool });
        } else {
          self.mcpChatHistory.push({ role: 'assistant', content: JSON.stringify(result, null, 2) });
        }
      } catch (e) {
        self.mcpChatHistory.pop();
        self.mcpChatHistory.push({ role: 'assistant', content: 'Failed: ' + e.message });
      } finally {
        CC.navigate('settings');
        setTimeout(() => {
          const msgs = document.getElementById('mcp-chat-messages');
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
          document.getElementById('mcp-chat-input')?.focus();
        }, 50);
      }
    }

    chatSend?.addEventListener('click', sendChat);

    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });

    // Auto-grow textarea
    chatInput?.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
    });

    // MCP selector - click the meta item to show the hidden select
    document.getElementById('mcp-chat-mcp-label')?.addEventListener('click', () => {
      mcpSelect.classList.toggle('hidden');
      if (!mcpSelect.classList.contains('hidden')) mcpSelect.focus();
    });
    mcpSelect?.addEventListener('change', () => {
      self.mcpChatMcpId = mcpSelect.value;
      mcpSelect.classList.add('hidden');
      CC.navigate('settings');
    });
    mcpSelect?.addEventListener('blur', () => {
      mcpSelect.classList.add('hidden');
    });

    // Model selector
    document.getElementById('mcp-chat-model-label')?.addEventListener('click', () => {
      modelSelect.classList.toggle('hidden');
      if (!modelSelect.classList.contains('hidden')) modelSelect.focus();
    });
    modelSelect?.addEventListener('change', () => {
      self.mcpChatModelId = modelSelect.value;
      modelSelect.classList.add('hidden');
      CC.navigate('settings');
    });
    modelSelect?.addEventListener('blur', () => {
      modelSelect.classList.add('hidden');
    });

    // Clear chat
    document.getElementById('mcp-chat-clear')?.addEventListener('click', () => {
      self.mcpChatHistory = [];
      CC.navigate('settings');
    });

    // Scroll to bottom on load
    setTimeout(() => {
      const msgs = document.getElementById('mcp-chat-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 50);
  },

  // ── Existing Content ────────────────────
  existingSort: 'date-desc',
  existingTagFilter: '',

  renderExisting() {
    const articles = CC.state.existing || [];

    // Collect all unique tags for filter dropdown
    const allTags = [...new Set(articles.flatMap((a) => a.tags || []))].sort();

    // Apply tag filter
    let filtered = articles;
    if (this.existingTagFilter) {
      filtered = filtered.filter((a) => (a.tags || []).includes(this.existingTagFilter));
    }

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return this.existingSort === 'date-asc' ? da - db : db - da;
    });

    const analyzedCount = articles.filter((a) => a.analysis).length;

    return `<div class="mcp-section">
      <div class="existing-import-row">
        <button class="btn-primary btn-sm" id="existing-import">+ Import Articles</button>
        <button class="btn-ghost btn-sm" id="existing-sync-mcp">Update with MCP</button>
        <button class="btn-ghost btn-sm" id="existing-analyze" ${analyzedCount === articles.length && articles.length > 0 ? 'disabled' : ''}>${analyzedCount === articles.length && articles.length > 0 ? 'Summaries Ready' : `Generate Summaries${analyzedCount > 0 ? ` (${analyzedCount}/${articles.length})` : ''}`}</button>
      </div>
      <div class="existing-controls">
        <select id="existing-tag-filter" class="existing-select">
          <option value="">All tags (${articles.length})</option>
          ${allTags.map((t) => `<option value="${CC.escapeHtml(t)}" ${t === this.existingTagFilter ? 'selected' : ''}>${CC.escapeHtml(t)}</option>`).join('')}
        </select>
        <select id="existing-sort" class="existing-select">
          <option value="date-desc" ${this.existingSort === 'date-desc' ? 'selected' : ''}>Newest first</option>
          <option value="date-asc" ${this.existingSort === 'date-asc' ? 'selected' : ''}>Oldest first</option>
        </select>
        <span class="existing-count">${filtered.length} article${filtered.length === 1 ? '' : 's'}</span>
      </div>
      <div class="mcp-list">
        ${filtered.length === 0
          ? CC.empty('No articles found.', articles.length === 0 ? 'Select markdown or text files to build your content library.' : 'Try a different tag filter.')
          : filtered.map((a) => this.renderExistingCard(a)).join('')
        }
      </div>
    </div>`;
  },

  renderExistingCard(a) {
    const dateStr = a.date
      ? new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';
    const tags = (a.tags || []).map((t) => `<span class="badge dim" style="font-size:10.5px">${CC.escapeHtml(t)}</span>`).join('');
    return `<div class="mcp-card">
      <div class="mcp-card-top">
        <div class="mcp-card-name">${CC.escapeHtml(a.title)}</div>
        <div class="mcp-card-actions">
          ${dateStr ? `<span class="existing-date">${dateStr}</span>` : ''}
          <button class="btn-primary btn-sm" data-existing-view="${a.id}">View</button>
          <button class="btn-danger btn-sm" data-existing-remove="${a.id}">Remove</button>
        </div>
      </div>
      <div class="mcp-card-url">${CC.escapeHtml((a.excerpt || '').slice(0, 180))}${(a.excerpt || '').length > 180 ? '...' : ''}</div>
      ${tags ? `<div class="mcp-card-tags">${tags}</div>` : ''}
    </div>`;
  },

  initExisting() {
    document.getElementById('existing-import')?.addEventListener('click', async () => {
      const result = await CC.api.existing.importFiles();
      if (result) {
        await CC.refresh('existing');
        CC.navigate('settings');
      }
    });

    document.getElementById('existing-tag-filter')?.addEventListener('change', (e) => {
      this.existingTagFilter = e.target.value;
      CC.navigate('settings');
    });

    document.getElementById('existing-sort')?.addEventListener('change', (e) => {
      this.existingSort = e.target.value;
      CC.navigate('settings');
    });

    document.getElementById('existing-sync-mcp')?.addEventListener('click', async () => {
      const btn = document.getElementById('existing-sync-mcp');
      btn.disabled = true;
      btn.textContent = 'Syncing...';
      try {
        const result = await CC.api.existing.syncMcp();
        CC.showStatus(`Synced: ${result.tagsUpdated} tags updated, ${result.imported} new articles imported`);
        await CC.refresh('existing');
        CC.navigate('settings');
      } catch (e) {
        CC.showStatus('Sync failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Update with MCP';
      }
    });

    document.getElementById('existing-analyze')?.addEventListener('click', async () => {
      const btn = document.getElementById('existing-analyze');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Analyzing...';
      CC.setStickyStatus(true);
      CC.showStatus('Starting article analysis...');
      try {
        await CC.api.existing.analyze();
      } catch (e) {
        CC.setStickyStatus(false);
        CC.showStatus('Analysis failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Generate Summaries';
      }
    });

    document.querySelectorAll('[data-existing-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.existing.remove(btn.dataset.existingRemove);
        await CC.refresh('existing');
        CC.navigate('settings');
      });
    });

    document.querySelectorAll('[data-existing-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const article = CC.state.existing.find((a) => a.id === btn.dataset.existingView);
        if (!article) return;
        const modal = document.getElementById('existing-modal');
        const modalTitle = document.getElementById('existing-modal-title');
        const modalBody = document.getElementById('existing-modal-body');
        if (modal && modalTitle && modalBody) {
          modalTitle.textContent = article.title;
          modalBody.textContent = article.body || article.excerpt || '';
          modal.classList.remove('hidden');
        }
      });
    });

    document.getElementById('existing-modal-close')?.addEventListener('click', () => {
      document.getElementById('existing-modal')?.classList.add('hidden');
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
