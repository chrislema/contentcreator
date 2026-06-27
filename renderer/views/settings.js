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
      <button class="sub-tab ${this.subView === 'utilities' ? 'active' : ''}" data-sub="utilities">Utilities</button>
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
      case 'utilities': return this.renderUtilities();
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
    if (this.subView === 'utilities') this.initUtilities();
  },

  // ── Profile ──────────────────────────────
  renderProfile() {
    const p = CC.state.settings?.profile || {};
    return `${CC.ui.formPanel(`
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
      ${CC.ui.formActions(CC.ui.button('Save Profile', { id: 'pf-save', size: false }))}
    `, { className: 'profile-form' })}

    <div class="profile-cards-row">
      <div class="ui-card util-card profile-card">
        ${CC.ui.cardHeader(CC.escapeHtml('Voice Profiles'), {
          actions: CC.ui.button('Import Voice Profile (.md)', { id: 'vp-import' })
        })}
        ${CC.state.voiceProfiles.map((vp) => `
          <div class="ui-list-item">
            <div class="ui-list-item-info">
              <div class="ui-list-item-title">${CC.escapeHtml(vp.name)} ${vp.isDefault ? CC.ui.badge('default', { tone: 'accent' }) : ''}</div>
              <div class="ui-list-item-sub">${CC.escapeHtml((vp.identity || '').slice(0, 80))}...</div>
            </div>
            <div class="ui-actions ui-list-item-actions">
              ${CC.ui.button('View', { variant: 'ghost', data: { 'vp-view': vp.id } })}
              ${!vp.isDefault ? `<button class="icon-btn" data-vp-remove="${vp.id}">&times;</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="ui-card util-card profile-card">
        ${CC.ui.cardHeader(CC.escapeHtml('Platform Profiles'), {
          actions: CC.ui.button('Import Platform Profile (.md)', { id: 'pp-import' })
        })}
        ${CC.state.platformProfiles.map((pp) => `
          <div class="ui-list-item">
            <div class="ui-list-item-info">
              <div class="ui-list-item-title">${CC.escapeHtml(pp.name)} ${pp.isDefault ? CC.ui.badge('default', { tone: 'accent' }) : ''}</div>
              <div class="ui-list-item-sub">Platforms: ${Object.keys(pp.platforms || {}).join(', ')}</div>
            </div>
            <div class="ui-actions ui-list-item-actions">
              ${CC.ui.button('View', { variant: 'ghost', data: { 'pp-view': pp.id } })}
              ${!pp.isDefault ? `<button class="icon-btn" data-pp-remove="${pp.id}">&times;</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  },

  renderProfileDetailField(label, value) {
    if (!value) return '';
    return `<div class="profile-detail-field">
      <div class="profile-detail-label">${CC.escapeHtml(label)}</div>
      <div class="profile-detail-value">${CC.escapeHtml(value)}</div>
    </div>`;
  },

  renderVoiceProfileDetail(vp) {
    const fields = [
      ['Identity', vp.identity],
      ['Tone', vp.tone],
      ['Humor Style', vp.humorStyle],
      ['Sentence Structure', vp.sentenceStructure],
      ['Vocabulary Tendencies', vp.vocabularyTendencies],
      ['Contractions', vp.contractions],
      ['Punctuation', vp.punctuation],
      ['Paragraph Structure', vp.paragraphStructure],
      ['Opening Moves', vp.openingMoves],
      ['Closing Moves', vp.closingMoves],
      ['Content Philosophy', vp.contentPhilosophy],
      ['Credibility', vp.credibility],
      ['Audience Relationship', vp.audienceRelationship],
      ['Anti-Patterns', vp.antiPatterns]
    ].map(([label, value]) => this.renderProfileDetailField(label, value)).join('');

    return fields || CC.ui.inlineEmpty('No voice profile details are available.');
  },

  renderPlatformProfileDetail(pp) {
    const platformLabels = {
      linkedin: 'LinkedIn',
      facebook: 'Facebook',
      twitter: 'Twitter/X',
      email: 'Email'
    };
    const platforms = Object.entries(pp.platforms || {});

    if (platforms.length === 0) {
      return CC.ui.inlineEmpty('No platform rules are available.');
    }

    return platforms.map(([platform, rules]) => {
      const safeRules = rules || {};
      const fields = [
        ['Hook Patterns', safeRules.hookPatterns],
        ['Structure Rules', safeRules.structureRules],
        ['Length Guidance', safeRules.lengthGuidance],
        ['CTA Conventions', safeRules.ctaConventions],
        ['Link Strategy', safeRules.linkStrategy]
      ].map(([label, value]) => this.renderProfileDetailField(label, value)).join('');

      return `<div class="profile-detail-platform">
        <div class="profile-detail-platform-title">${CC.escapeHtml(platformLabels[platform] || platform)}</div>
        ${fields || CC.ui.inlineEmpty('No rules saved for this platform.')}
      </div>`;
    }).join('');
  },

  openProfileDetailModal(title, content) {
    const modal = document.getElementById('existing-modal');
    const modalTitle = document.getElementById('existing-modal-title');
    const modalBody = document.getElementById('existing-modal-body');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = `<div class="profile-detail-modal">${content}</div>`;
    modal.classList.remove('hidden');
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

    document.querySelectorAll('[data-vp-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const profile = CC.state.voiceProfiles.find((vp) => vp.id === btn.dataset.vpView);
        if (!profile) return;
        this.openProfileDetailModal(profile.name, this.renderVoiceProfileDetail(profile));
      });
    });

    document.querySelectorAll('[data-pp-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const profile = CC.state.platformProfiles.find((pp) => pp.id === btn.dataset.ppView);
        if (!profile) return;
        this.openProfileDetailModal(profile.name, this.renderPlatformProfileDetail(profile));
      });
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

    document.getElementById('existing-modal-close')?.addEventListener('click', () => {
      document.getElementById('existing-modal')?.classList.add('hidden');
    });
  },

  // ── Models ───────────────────────────────
  modelChatHistory: [],

  renderModels() {
    const models = CC.state.models || [];
    return `<div class="settings-panel">
      <div class="settings-panel-actions ui-actions">${CC.ui.button('+ Add Model', { id: 'model-add' })}</div>
      <div id="model-form" class="hidden ui-form-panel">
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
        ${CC.ui.formActions(`
          ${CC.ui.button('Save Model', { id: 'm-save' })}
          ${CC.ui.button('Cancel', { id: 'm-cancel', variant: 'ghost' })}
        `)}
      </div>
      <div class="settings-card-grid">
        ${models.length === 0 ? CC.empty('No models configured.', 'Add an AI model to start generating content.') : models.map((m) => this.renderModelCard(m)).join('')}
      </div>
      ${models.length > 0 ? this.renderModelChat(models) : ''}
    </div>`;
  },

  renderModelCard(m) {
    const connType = m.connectionType === 'oauth-cli' ? 'OAuth/CLI' : 'API Key';
    const tested = m.lastTested;
    const statusBadge = tested
      ? (m.lastTestResult ? CC.ui.badge('Working', { tone: 'ok' }) : CC.ui.badge('Failed', { tone: 'danger' }))
      : CC.ui.badge('Untested', { tone: 'dim' });
    const isDefault = CC.state.settings.defaultModelId === m.id;
    const defaultBadge = isDefault ? CC.ui.badge('Default', { tone: 'accent' }) : '';

    return `<div class="ui-card settings-card ${isDefault ? 'settings-card-highlighted' : ''}">
      <div class="ui-card-header settings-card-header">
        <div class="ui-card-title">${CC.escapeHtml(m.displayName || m.model)} ${statusBadge} ${defaultBadge}</div>
        <div class="ui-actions ui-card-actions">
          ${isDefault ? '' : CC.ui.button('Set Default', { variant: 'ghost', data: { 'model-default': m.id } })}
          ${CC.ui.button('Test', { data: { 'model-test': m.id } })}
          ${CC.ui.button('Edit', { variant: 'ghost', data: { 'model-edit': m.id } })}
          ${CC.ui.button('Remove', { variant: 'ghost', data: { 'model-remove': m.id } })}
        </div>
      </div>
      <div class="ui-card-meta settings-card-meta">
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
        <div class="mcp-chat-selector">
          <div class="mcp-chat-meta-item" id="model-chat-model-label">
            <span class="mcp-chat-meta-label">Model</span>
            <span class="mcp-chat-meta-value">${CC.escapeHtml(modelName)}</span>
          </div>
          <select id="model-chat-model-select" class="hidden">
            ${models.map((m) => {
              const status = m.lastTested ? (m.lastTestResult ? ' (working)' : ' (failed)') : ' (untested)';
              return `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${CC.escapeHtml((m.displayName || m.model) + status)}</option>`;
            }).join('')}
          </select>
        </div>
        ${CC.ui.badge(`${workingCount}/${modelCount} working`, { tone: workingCount > 0 ? 'ok' : 'dim' })}
        ${history.length > 0 ? '<button class="mcp-chat-clear" id="model-chat-clear">Clear chat</button>' : ''}
      </div>
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

    let html = `<div class="ui-toolbar">
      <input id="fw-search" type="text" placeholder="Search frameworks..." />
      ${CC.ui.badge(`${fws.filter(f => f.active).length} active / ${fws.length} total`, { tone: 'dim' })}
      ${CC.ui.button('+ Add Custom', { id: 'fw-add-custom', variant: 'ghost' })}
    </div>`;

    for (const [cat, items] of Object.entries(cats)) {
      html += CC.ui.sectionTitle(catLabels[cat] || cat, items.length);
      html += '<div class="ui-grid ui-card-grid">';
      for (const fw of items) {
        html += `<div class="ui-card fw-card ${fw.active ? '' : 'inactive'}" data-fw-id="${fw.id}">
          <div class="ui-card-header fw-card-head">
            <div>
              <div class="ui-card-title">${CC.escapeHtml(fw.name)}</div>
              <div class="ui-card-meta fw-category">${CC.escapeHtml(catLabels[cat] || cat)} &middot; Stage ${fw.stage}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" data-fw-toggle="${fw.id}" ${fw.active ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
          <div class="ui-card-desc">${CC.escapeHtml(fw.description)}</div>
          ${fw.custom ? CC.ui.actions(CC.ui.button('Delete', { variant: 'danger', data: { 'fw-remove': fw.id } }), { className: 'fw-card-actions' }) : ''}
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
    return `<div class="settings-panel">
      <div class="settings-panel-actions ui-actions">${CC.ui.button('+ Add MCP', { id: 'mcp-add' })}</div>
      <div id="mcp-form" class="hidden ui-form-panel">
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
            <label>Token / Key <span class="form-label-note">(not needed for OAuth)</span></label>
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
        ${CC.ui.formActions(`
          ${CC.ui.button('Save', { id: 'mcp-save' })}
          ${CC.ui.button('Cancel', { id: 'mcp-cancel', variant: 'ghost' })}
        `)}
      </div>
      <div id="mcp-list" class="settings-card-grid">
        ${mcps.length === 0 ? CC.empty('No MCPs connected.', 'Add connections to your CMS, newsletter, analytics, etc.') : mcps.map((m) => this.renderMcpCard(m)).join('')}
      </div>
      ${mcps.length > 0 ? this.renderMcpChat(mcps) : ''}
    </div>`;
  },

  renderMcpCard(m) {
    const connected = m.connected;
    const toolCount = m.toolCount || 0;
    const visibleError = connected ? '' : (m.lastError || '');
    const statusBadge = connected
      ? CC.ui.badge('Connected', { tone: 'ok' })
      : CC.ui.badge('Not connected', { tone: 'dim' });

    return `<div class="ui-card settings-card">
      <div class="ui-card-header settings-card-header">
        <div class="ui-card-title">${CC.escapeHtml(m.name)} ${statusBadge}</div>
        <div class="ui-actions ui-card-actions">
          ${connected
            ? CC.ui.button('Disconnect', { variant: 'danger', data: { 'mcp-disconnect': m.id } })
            : CC.ui.button('Connect', { data: { 'mcp-connect': m.id } })
          }
          ${CC.ui.button('Edit', { variant: 'ghost', data: { 'mcp-edit': m.id } })}
          ${CC.ui.button('Remove', { variant: 'ghost', data: { 'mcp-remove': m.id } })}
        </div>
      </div>
      <div class="ui-card-meta settings-card-meta">
        ${m.transport === 'stdio'
          ? `${CC.escapeHtml(m.command || 'npx')} ${CC.escapeHtml((m.args || []).join(' '))}`
          : `${CC.escapeHtml(m.url)} &middot; ${CC.escapeHtml(m.authType)}`
        }
        ${connected ? ` &middot; <span class="metric-ok">${toolCount} tools</span>` : ''}
        ${visibleError ? ` &middot; <span class="metric-danger">${CC.escapeHtml(visibleError)}</span>` : ''}
      </div>
      ${connected && m.tools && m.tools.length ? CC.ui.tagRow(m.tools.map((t) => CC.ui.badge(t.name, { tone: 'dim', size: 'sm' })).join(''), { className: 'settings-card-tags' }) : ''}
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
        <div class="mcp-chat-selector">
          <div class="mcp-chat-meta-item" id="mcp-chat-mcp-label">
            <span class="mcp-chat-meta-label">MCP</span>
            <span class="mcp-chat-meta-value">${CC.escapeHtml(mcpName)}</span>
          </div>
          <select id="mcp-chat-mcp-select" class="hidden">
            ${connectedMcps.map((m) => {
              const toolCount = m.toolCount || 0;
              return `<option value="${m.id}" ${m.id === selectedMcp ? 'selected' : ''}>${CC.escapeHtml(m.name + (toolCount ? ' (' + toolCount + ' tools)' : ''))}</option>`;
            }).join('')}
          </select>
        </div>
        ${CC.ui.badge(`${connectedCount}/${mcpCount} connected`, { tone: connectedCount > 0 ? 'ok' : 'dim' })}
        <div class="mcp-chat-selector">
          <div class="mcp-chat-meta-item" id="mcp-chat-model-label">
            <span class="mcp-chat-meta-label">Model</span>
            <span class="mcp-chat-meta-value">${CC.escapeHtml(modelName)}</span>
          </div>
          <select id="mcp-chat-model-select" class="hidden">
            ${models.map((m) => {
              const status = m.lastTested ? (m.lastTestResult ? ' (working)' : ' (failed)') : ' (untested)';
              return `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${CC.escapeHtml((m.displayName || m.model) + status)}</option>`;
            }).join('')}
          </select>
        </div>
        ${CC.ui.badge(`${modelWorkingCount}/${modelCount} working`, { tone: modelWorkingCount > 0 ? 'ok' : 'dim' })}
        ${history.length > 0 ? '<button class="mcp-chat-clear" id="mcp-chat-clear">Clear chat</button>' : ''}
      </div>
    </div>`;
  },

  renderChatMessage(msg) {
    if (msg.role === 'user') {
      return `<div class="mcp-chat-user"><div class="mcp-chat-user-bubble">${CC.escapeHtml(msg.content)}</div></div>`;
    }
    if (msg.role === 'system') {
      return `<div class="mcp-chat-system">${CC.escapeHtml(msg.content)}</div>`;
    }
    const toolBadge = msg.tool ? `<div class="mcp-chat-tool">${CC.ui.badge(msg.tool, { tone: 'accent' })}</div>` : '';
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

    return `<div class="settings-panel">
      <div class="ui-actions existing-import-row">
        ${CC.ui.button('Update with MCP', { id: 'existing-sync-mcp' })}
      </div>
      <div class="ui-toolbar existing-controls">
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
      <div class="existing-grid">
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
    const summary = (a.analysis || a.description || a.excerpt || '').trim();
    const tagBadges = (a.tags || []).map((t) => CC.ui.badge(t, { tone: 'dim', size: 'sm' })).join('');
    const hasAnalytics = !!a.analytics;
    const hasUrl = !!a.publicUrl;
    const tags = `${tagBadges}${hasAnalytics ? CC.ui.badge('Analytics', { tone: 'ok', size: 'sm' }) : ''}`;

    return `<div class="ui-card settings-card">
      <div class="ui-card-header settings-card-header">
        <div class="ui-card-title">${CC.escapeHtml(a.title)}</div>
        <div class="ui-actions ui-card-actions">
          ${hasAnalytics ? CC.ui.button('Details', { variant: 'ghost', data: { 'existing-details': a.id } }) : ''}
          ${CC.ui.button('View', { data: { 'existing-view': a.id } })}
          ${CC.ui.button('Remove', { variant: 'danger', data: { 'existing-remove': a.id } })}
        </div>
      </div>
      ${dateStr ? `<div class="existing-date">${dateStr}</div>` : ''}
      <div class="ui-card-meta settings-card-meta">
        ${hasUrl ? `<a href="${CC.escapeHtml(a.publicUrl)}" target="_blank" rel="noopener noreferrer" class="existing-url">${CC.escapeHtml(a.publicUrl)}</a>` : '<span class="existing-no-url">No URL (run Fetch URLs in Utilities)</span>'}
      </div>
      ${summary ? `<div class="existing-summary">${CC.escapeHtml(summary)}</div>` : ''}
      ${tags ? CC.ui.tagRow(tags, { className: 'settings-card-tags existing-tags-row' }) : ''}
      ${this.selectedExistingDetail === a.id && hasAnalytics ? this.renderAnalyticsPanel(a) : ''}
    </div>`;
  },

  renderAnalyticsPanel(a) {
    const an = a.analytics || {};
    const t30 = an.last30d || {};
    const countries = an.topCountries || [];
    const sources = an.topSources || [];
    const queries = an.topQueries || [];
    const warnings = an.warnings || [];
    const errors = an.errors || [];
    const hasLast30d = !!an.last30d;
    const statusClass = an.status === 'complete' ? 'ok' : an.status === 'failed' ? 'warn' : 'accent';
    const statusLabel = an.status ? an.status[0].toUpperCase() + an.status.slice(1) : '';
    const emptyRow = (text) => `<div class="ui-inline-empty analytics-empty">${CC.escapeHtml(text)}</div>`;

    return `<div class="analytics-panel">
      <div class="analytics-panel-header">
        <span class="analytics-panel-title">Analytics</span>
        <div class="analytics-panel-meta">
          ${statusLabel ? CC.ui.badge(statusLabel, { tone: statusClass, size: 'sm' }) : ''}
          ${CC.ui.button('Close', { variant: 'ghost', data: { 'existing-details-close': true } })}
        </div>
      </div>
      <div class="analytics-grid">
        <div class="analytics-stat">
          <span class="analytics-stat-label">Page Views (30d)</span>
          <span class="analytics-stat-value">${hasLast30d ? (t30.pageViews || 0).toLocaleString() : '-'}</span>
        </div>
        <div class="analytics-stat">
          <span class="analytics-stat-label">Active Users (30d)</span>
          <span class="analytics-stat-value">${hasLast30d ? (t30.activeUsers || 0).toLocaleString() : '-'}</span>
        </div>
        <div class="analytics-stat">
          <span class="analytics-stat-label">Avg Session</span>
          <span class="analytics-stat-value">${hasLast30d ? Math.round(t30.avgSessionDuration || 0) + 's' : '-'}</span>
        </div>
        <div class="analytics-stat">
          <span class="analytics-stat-label">Engagement</span>
          <span class="analytics-stat-value">${hasLast30d ? Math.round((t30.engagementRate || 0) * 100) + '%' : '-'}</span>
        </div>
      </div>
      ${errors.length || warnings.length ? `<div class="analytics-alerts">
        ${errors.slice(0, 3).map((e) => `<div class="analytics-alert error">${CC.escapeHtml(e.label || 'Error')}: ${CC.escapeHtml(e.message || '')}</div>`).join('')}
        ${warnings.slice(0, 3).map((w) => `<div class="analytics-alert">${CC.escapeHtml(w.label || 'Note')}: ${CC.escapeHtml(w.message || '')}</div>`).join('')}
      </div>` : ''}
      <div class="analytics-section">
        <div class="analytics-section-title">Top Countries</div>
        ${countries.length ? countries.map((c) => `<div class="analytics-row"><span>${CC.escapeHtml(c.country || 'Unknown')}</span><span>${(c.users || 0).toLocaleString()}</span></div>`).join('') : emptyRow('No country data returned for this page.')}
      </div>
      <div class="analytics-section">
        <div class="analytics-section-title">Top Sources</div>
        ${sources.length ? sources.map((s) => `<div class="analytics-row"><span>${CC.escapeHtml(s.source || 'Unknown')}</span><span>${(s.users || 0).toLocaleString()}</span></div>`).join('') : emptyRow('No source data returned for this page.')}
      </div>
      <div class="analytics-section">
        <div class="analytics-section-title">Top Search Queries</div>
        ${queries.length ? queries.map((q) => `<div class="analytics-query-row">
          <span class="analytics-query-text">${CC.escapeHtml(q.query)}</span>
          <div class="analytics-query-stats">
            <span class="analytics-query-stat">${q.clicks} clicks</span>
            <span class="analytics-query-stat">#${q.position ? q.position.toFixed(1) : '-'}</span>
          </div>
        </div>`).join('') : emptyRow('No Search Console queries returned for this page.')}
      </div>
      <div class="analytics-enriched-at">Enriched: ${an.enrichedAt ? new Date(an.enrichedAt).toLocaleDateString() : '-'}</div>
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

    // Details panel toggle
    document.querySelectorAll('[data-existing-details]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.existingDetails;
        this.selectedExistingDetail = this.selectedExistingDetail === id ? null : id;
        CC.navigate('settings');
      });
    });

    document.querySelectorAll('[data-existing-details-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedExistingDetail = null;
        CC.navigate('settings');
      });
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

    let html = `<div class="ui-toolbar">
      ${CC.ui.button('+ Add Rule', { id: 'aa-add' })}
      ${CC.ui.badge(`${rules.filter(r => r.active).length} active / ${rules.length} total`, { tone: 'dim' })}
    </div>`;

    for (const [cat, items] of Object.entries(cats)) {
      html += CC.ui.sectionTitle(catLabels[cat] || cat);
      for (const r of items) {
        html += `<div class="ui-list-item ${r.active ? '' : 'is-muted'}">
          <div class="ui-list-item-info">
            <div class="ui-list-item-title">${CC.escapeHtml(r.rule)}</div>
            <div class="ui-list-item-sub">${CC.escapeHtml(r.description || '')} ${r.custom ? CC.ui.badge('custom', { tone: 'dim', size: 'sm' }) : ''}</div>
          </div>
          <div class="ui-actions ui-list-item-actions">
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
  },

  // ── Utilities (Export / Import) ──────────────────────
  renderUtilities() {
    const sections = [
      { id: 'settings', label: 'Models, MCPs & Profile', desc: 'Model configs, MCP connections, and profile settings. API keys and tokens stay local.' },
      { id: 'frameworks', label: 'Frameworks', desc: 'Content frameworks and active toggles' },
      { id: 'antiAi', label: 'Anti-AI Rules', desc: 'Banned words, phrases, and structural patterns' },
      { id: 'voiceProfiles', label: 'Voice Profiles', desc: 'Voice identity, tone, and style settings' },
      { id: 'platformProfiles', label: 'Platform Profiles', desc: 'Platform-specific posting rules' },
      { id: 'audiences', label: 'Audiences', desc: 'Micro-segments, goal pyramids, pain pyramids' },
      { id: 'research', label: 'Research', desc: 'Research-backed insight cards from uploaded PDFs' },
      { id: 'topics', label: 'Topics', desc: 'Ranked content ideas and intelligence data' },
      { id: 'drafts', label: 'Drafts', desc: 'Article drafts, conversations, summaries' },
      { id: 'distributions', label: 'Distributions', desc: 'Generated platform posts' },
      { id: 'existingContent', label: 'Existing Content', desc: 'Imported articles with analysis summaries' }
    ];

    return `<div class="util-section">
      <div class="ui-card util-card" data-util="export">
        <div class="ui-card-title util-card-title">Export Data</div>
        <p class="util-desc">Select what to export. You'll get a single JSON file you can import on another machine; API keys and bearer tokens are not included.</p>
        <div class="util-checkboxes">
          <label class="util-check-all">
            <input type="checkbox" id="util-export-all" />
            <span class="util-check-label"><strong>Select Everything</strong></span>
          </label>
          ${sections.map((s) => `
            <label class="util-check">
              <input type="checkbox" class="util-export-item" data-export="${s.id}" />
              <div>
                <span class="util-check-label">${CC.escapeHtml(s.label)}</span>
                <span class="util-check-desc">${CC.escapeHtml(s.desc)}</span>
              </div>
            </label>
          `).join('')}
        </div>
        ${CC.ui.button('Export Selected', { id: 'util-export-btn' })}
      </div>

      <div class="ui-card util-card" data-util="enrich">
        <div class="ui-card-title util-card-title">Content Data Enrichment</div>
        <p class="util-desc">One-time setup and rarely-used tools. Run these to build and enrich your content library. Daily operations like "Update with MCP" live in the Existing Content tab.</p>
        <div class="util-action-row">
          <div class="util-action">
            <span class="util-action-label">Import Articles</span>
            <span class="util-action-desc">Select markdown/text files from your local drive to build the content library.</span>
            ${CC.ui.button('Import Articles', { id: 'util-import-articles' })}
          </div>
          <div class="util-action">
            <span class="util-action-label">Fetch Article URLs from CMS</span>
            <span class="util-action-desc">Gets the public URL (slug) for each AI-tagged article from Payload. Run this before analytics.</span>
            ${CC.ui.button('Fetch URLs', { id: 'util-fetch-urls' })}
          </div>
          <div class="util-action">
            <span class="util-action-label">Enrich with Analytics</span>
            <span class="util-action-desc">Pulls GA4 + GSC data per article (traffic, countries, sources, top queries). Requires URLs to be set first.</span>
            ${CC.ui.button('Enrich Analytics', { id: 'util-enrich-analytics' })}
          </div>
          <div class="util-action">
            <span class="util-action-label">Generate Summaries</span>
            <span class="util-action-desc">Runs all articles through the default model to create 2-3 sentence analysis summaries. Used by topic intelligence for deduplication.</span>
            ${CC.ui.button('Generate Summaries', { id: 'util-generate-summaries' })}
          </div>
        </div>
        <div id="util-enrich-status" class="util-enrich-status"></div>
      </div>

      <div class="ui-card util-card" data-util="import">
        <div class="ui-card-title util-card-title">Import Data</div>
        <p class="util-desc">Select a previously exported JSON file. This will overwrite existing data for every section found in the file.</p>
        ${CC.ui.button('Choose File & Import', { id: 'util-import-btn' })}
        <div id="util-import-result" class="util-import-result"></div>
      </div>

      <div class="ui-card util-card util-warning">
        <div class="ui-card-title util-card-title">What's NOT exported</div>
        <ul class="util-notes">
          <li>Installed CLI tools (ContentStudio, Claude Code) - install these manually on the new machine</li>
          <li>API keys, bearer tokens, OAuth tokens, and sensitive MCP env vars - add these locally after import</li>
          <li>MCP <em>connection state</em> - you'll need to click Connect again after import</li>
          <li>The app itself - download the latest Mac installer from <a href="https://github.com/chrislema/contentcreator/releases" target="_blank" rel="noopener noreferrer">GitHub Releases</a></li>
        </ul>
      </div>
    </div>`;
  },

  initUtilities() {
    const self = this;

    // Select all toggle
    document.getElementById('util-export-all')?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.util-export-item').forEach((cb) => { cb.checked = checked; });
    });

    // Individual checkbox: uncheck "all" if any unchecked
    document.querySelectorAll('.util-export-item').forEach((cb) => {
      cb.addEventListener('change', () => {
        const all = document.getElementById('util-export-all');
        const items = document.querySelectorAll('.util-export-item');
        const allChecked = Array.from(items).every((i) => i.checked);
        all.checked = allChecked;
      });
    });

    // Export
    document.getElementById('util-export-btn')?.addEventListener('click', async () => {
      const sections = {};
      let count = 0;
      document.querySelectorAll('.util-export-item').forEach((cb) => {
        sections[cb.dataset.export] = cb.checked;
        if (cb.checked) count++;
      });
      if (count === 0) { CC.showStatus('Select at least one section to export'); return; }

      const btn = document.getElementById('util-export-btn');
      btn.disabled = true;
      btn.textContent = 'Exporting...';
      try {
        const result = await CC.api.utilities.exportData(sections);
        if (result.canceled) {
          btn.disabled = false;
          btn.textContent = 'Export Selected';
        } else {
          CC.showStatus(`Exported ${count} section(s) to file`);
        }
      } catch (e) {
        CC.showStatus('Export failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Export Selected';
      }
    });

    // Import articles
    document.getElementById('util-import-articles')?.addEventListener('click', async () => {
      const result = await CC.api.existing.importFiles();
      if (result) {
        await CC.refresh('existing');
        CC.showStatus(`Imported ${result.length} articles`);
      }
    });

    // Generate summaries
    document.getElementById('util-generate-summaries')?.addEventListener('click', async () => {
      const btn = document.getElementById('util-generate-summaries');
      btn.disabled = true;
      btn.textContent = 'Starting...';
      CC.setStickyStatus(true);
      CC.showStatus('Generating summaries...');
      try {
        const result = await CC.api.existing.analyze();
        if (result.started) {
          const statusDiv = document.getElementById('util-enrich-status');
          if (statusDiv) {
            statusDiv.innerHTML = CC.ui.badge(`Generating summaries for ${result.count} articles...`, { tone: 'accent', className: 'util-status-badge' });
          }
          btn.textContent = 'Summarizing...';
        } else {
          CC.setStickyStatus(false);
          CC.showStatus('All articles already analyzed');
          btn.disabled = false;
          btn.textContent = 'Generate Summaries';
        }
      } catch (e) {
        CC.setStickyStatus(false);
        CC.showStatus('Failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Generate Summaries';
      }
    });

    // Fetch URLs from CMS
    document.getElementById('util-fetch-urls')?.addEventListener('click', async () => {
      const btn = document.getElementById('util-fetch-urls');
      btn.disabled = true;
      btn.textContent = 'Fetching...';
      CC.setStickyStatus(true);
      CC.showStatus('Fetching article URLs from Payload CMS...');
      try {
        const result = await CC.api.existing.fetchUrls();
        CC.setStickyStatus(false);
        CC.showStatus(`URLs: ${result.updated} updated, ${result.notFound || 0} not found`);
        await CC.refresh('existing');
      } catch (e) {
        CC.setStickyStatus(false);
        CC.showStatus('Failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Fetch URLs';
      }
    });

    // Enrich analytics
    document.getElementById('util-enrich-analytics')?.addEventListener('click', async () => {
      const btn = document.getElementById('util-enrich-analytics');
      const statusDiv = document.getElementById('util-enrich-status');
      btn.disabled = true;
      btn.textContent = 'Enriching...';
      CC.setStickyStatus(true);
      CC.showStatus('Starting analytics enrichment...');
      try {
        const result = await CC.api.existing.enrichAnalytics();
        if (result.started) {
          statusDiv.innerHTML = CC.ui.badge(`Enriching ${result.count} articles in background...`, { tone: 'accent', className: 'util-status-badge' });
        } else {
          CC.setStickyStatus(false);
          CC.showStatus(`All articles already enriched (${result.skipped})`);
          btn.disabled = false;
          btn.textContent = 'Enrich Analytics';
        }
      } catch (e) {
        CC.setStickyStatus(false);
        CC.showStatus('Failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Enrich Analytics';
      }
    });

    // Analytics progress events
    if (window._analyticsProgressHandler) window._analyticsProgressHandler();
    window._analyticsProgressHandler = CC.api.onAnalyticsProgress((data) => {
      const statusDiv = document.getElementById('util-enrich-status');
      if (statusDiv) {
        statusDiv.innerHTML = CC.ui.badge(`Enriching ${data.done}/${data.total}...`, { tone: 'accent', className: 'util-status-badge' });
      }
      CC.showStatus(`Enriching ${data.done}/${data.total}...`);
    });

    if (window._analyticsCompleteHandler) window._analyticsCompleteHandler();
    window._analyticsCompleteHandler = CC.api.onAnalyticsComplete((data) => {
      CC.setStickyStatus(false);
      const statusDiv = document.getElementById('util-enrich-status');
      if (statusDiv) {
        statusDiv.innerHTML = CC.ui.badge(`Done: ${data.done}/${data.total} articles enriched`, { tone: 'ok', className: 'util-status-badge' });
      }
      CC.showStatus(`Analytics complete: ${data.done}/${data.total}`);
      const btn = document.getElementById('util-enrich-analytics');
      if (btn) { btn.disabled = false; btn.textContent = 'Enrich Analytics'; }
      CC.refresh('existing');
    });

    // Import
    document.getElementById('util-import-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('util-import-btn');
      btn.disabled = true;
      btn.textContent = 'Importing...';
      const resultDiv = document.getElementById('util-import-result');
      resultDiv.innerHTML = '';
      try {
        const result = await CC.api.utilities.importData();
        if (result.canceled) {
          btn.disabled = false;
          btn.textContent = 'Choose File & Import';
          return;
        }
        resultDiv.innerHTML = CC.ui.badge(`Imported: ${result.imported.join(', ')}`, { tone: 'ok', className: 'util-status-badge' });
        CC.showStatus('Import complete. Refreshing...');
        // Reload all state at once
        await CC.refresh();
        CC.navigate('settings');
      } catch (e) {
        resultDiv.innerHTML = CC.ui.badge(`Failed: ${e.message}`, { tone: 'danger', className: 'util-status-badge' });
        CC.showStatus('Import failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Choose File & Import';
      }
    });
  }
};
