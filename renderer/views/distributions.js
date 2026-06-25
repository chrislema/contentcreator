// Distributions View
CC.views.distributions = {
  // Track which draft has its platform panel open: { draftId: 'site' | 'facebook' | 'twitter' | 'linkedin' }
  openPanels: {},
  // Track selected model per panel: { [draftId]: { [platform]: modelId } }
  panelModels: {},

  html() {
    const ready = (CC.state.drafts || []).filter((d) => d.status === 'ready' || d.status === 'published');
    const dists = CC.state.distributions || [];

    return `${CC.header('Distributions', 'Adapt, promote, and publish your content')}
    <div class="section-body">
      ${ready.length === 0 && dists.length === 0 ? CC.empty('No drafts ready for distribution.', 'Mark a draft as Ready in the Drafts view to start distributing.') : ''}

      ${ready.length > 0 ? `
        <h3 style="font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent-2)">Ready for Distribution</h3>
        ${ready.map((d) => this.renderDistCard(d)).join('')}
      ` : ''}

      ${dists.length > 0 ? `
        <h3 style="font-size:14px;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent-2)">Generated Distributions</h3>
        ${dists.map((dist) => this.renderDist(dist)).join('')}
      ` : ''}
    </div>`;
  },

  PLATFORMS: [
    { id: 'site', label: 'Site', long: 'Website' },
    { id: 'facebook', label: 'Facebook', long: 'Facebook' },
    { id: 'twitter', label: 'X', long: 'Twitter/X' },
    { id: 'linkedin', label: 'LinkedIn', long: 'LinkedIn' }
  ],

  getModelId(draftId, platform) {
    if (!this.panelModels[draftId]) this.panelModels[draftId] = {};
    return this.panelModels[draftId][platform] || CC.state.settings?.defaultModelId || '';
  },

  renderModelSelector(draftId, platform) {
    const models = CC.state.models || [];
    const selected = this.getModelId(draftId, platform);
    return `<select class="dist-panel-model" data-model-select data-draft="${draftId}" data-platform="${platform}">
      ${models.map((m) => `<option value="${m.id}" ${m.id === selected ? 'selected' : ''}>${CC.escapeHtml(m.displayName || m.model)}</option>`).join('')}
    </select>`;
  },

  renderDistCard(d) {
    const article = d.content || [...(d.conversation || [])].reverse().find((m) => m.role === 'assistant')?.content || '';
    const h1Match = article.match(/^#\s+(.+)$/m);
    const displayTitle = h1Match ? h1Match[1].trim() : d.title;

    const segment = CC.state.audiences?.find((a) => a.id === d.segmentId);
    const segmentName = segment?.name || null;

    const openPanel = this.openPanels[d.id];
    const panelHtml = openPanel ? this.renderPanel(d, openPanel) : '';

    return `<div class="dist-card-wrapper" data-dist-card="${d.id}">
      <div class="card dist-card">
        <div class="dist-card-left">
          <div class="card-title">${CC.escapeHtml(displayTitle)}</div>
          ${d.summary
            ? `<div class="dist-summary">${CC.escapeHtml(d.summary)}</div>`
            : `<div class="dist-summary dist-summary-missing">
                <span>No summary yet.</span>
                <button class="btn-ghost btn-sm" data-gen-summary="${d.id}">Generate Summary</button>
              </div>`
          }
          <div class="topic-tags-row">
            ${segmentName ? `<span class="badge accent">${CC.escapeHtml(segmentName)}</span>` : ''}
          </div>
          <details class="dist-article-details">
            <summary class="dist-article-summary">View full article</summary>
            <div class="dist-article-preview">${CC.escapeHtml(article)}</div>
          </details>
        </div>
        <div class="dist-card-right">
          <div class="dist-status-list">
            ${this.PLATFORMS.map((p) => this.renderStatusRow(d, p)).join('')}
          </div>
          <div class="dist-actions">
            <button class="btn-primary btn-sm" data-open-panel="${d.id}" data-platform="site" ${d.sitePublishedAt ? 'disabled' : ''}>
              ${d.sitePublishedAt ? 'Published to Site' : 'Publish to Site'}
            </button>
            <button class="btn-ghost btn-sm" data-open-panel="${d.id}" data-platform="facebook">Draft FB Post</button>
            <button class="btn-ghost btn-sm" data-open-panel="${d.id}" data-platform="twitter">Draft X Post</button>
            <button class="btn-ghost btn-sm" data-open-panel="${d.id}" data-platform="linkedin">Draft LinkedIn Post</button>
          </div>
        </div>
      </div>
      ${panelHtml}
    </div>`;
  },

  renderPanel(d, platform) {
    const platLabel = this.PLATFORMS.find((p) => p.id === platform)?.long || platform;
    const isSite = platform === 'site';

    let conversation = [];
    if (isSite) {
      conversation = d.siteConversation || [];
    } else {
      conversation = d.platformPosts?.[platform]?.conversation || [];
    }

    const hasMessages = conversation.length > 0;

    return `<div class="dist-panel">
      <div class="dist-panel-header">
        <div class="dist-panel-header-left">
          <span class="badge accent">${platLabel}</span>
          <span style="font-size:12px;color:var(--muted)">Chat with the model to ${isSite ? 'plan the publish' : 'draft the post'}</span>
        </div>
        <button class="btn-ghost btn-sm" data-panel-close="${d.id}">Close</button>
      </div>
      <div class="dist-panel-chat" id="dist-conv-${d.id}-${platform}">
        ${hasMessages
          ? conversation.map((m) => this.renderMsg(m, d)).join('')
          : `<div class="empty-state" style="padding:30px"><p>No messages yet.</p><p class="muted">${isSite ? 'Tell the model how to publish: tags, description, date...' : 'Ask the model to write a ' + platLabel + ' post.'}</p></div>`
        }
      </div>
      <div class="dist-panel-toolbar">
        <div class="dist-panel-input-row">
          <textarea class="dist-panel-input" id="dist-input-${d.id}-${platform}" placeholder="${isSite ? 'e.g., Use AI and content-strategy as tags. Description: ' + (d.summary || '...') + '. Date it today. Ignore featured image.' : 'Message the model about the ' + platLabel + ' post...'}" rows="2"></textarea>
          <button class="btn-primary btn-sm" data-panel-send="${d.id}" data-platform="${platform}">Send</button>
        </div>
        <div class="dist-panel-toolbar-bottom">
          ${this.renderModelSelector(d.id, platform)}
          ${hasMessages ? `<div class="dist-panel-execute">
            ${isSite
              ? `<button class="btn-primary btn-sm" data-site-execute="${d.id}" ${d.sitePublishedAt ? 'disabled' : ''}>${d.sitePublishedAt ? 'Published to Site' : 'Mark Published to Site'}</button>`
              : `<button class="btn-primary btn-sm" data-platform-publish="${d.id}" data-platform="${platform}">Publish to ${platLabel}</button>`
            }
          </div>` : ''}
        </div>
      </div>
    </div>`;
  },

  renderStatusRow(d, p) {
    let publishedAt = null;
    if (p.id === 'site') {
      publishedAt = d.sitePublishedAt;
    } else {
      publishedAt = d.platformPosts?.[p.id]?.publishedAt;
    }
    const statusText = publishedAt
      ? `<span class="dist-status-date">${CC.fmtDate(publishedAt)}</span>`
      : `<span class="dist-status-pending">Not yet</span>`;
    const icon = publishedAt ? '&#10003;' : '&#9744;';
    return `<div class="dist-status-row ${publishedAt ? 'done' : ''}">
      <span class="dist-status-label">${icon} ${p.long}</span>
      ${statusText}
    </div>`;
  },

  renderMsg(m, draft) {
    const modelId = draft.siteModelId || draft.modelId;
    const roleName = CC.state.models.find((mo) => mo.id === modelId)?.displayName || 'AI';
    if (m.role === 'user') {
      return `<div class="msg user"><div class="msg-role user">You</div><div class="msg-content">${CC.escapeHtml(m.content)}</div></div>`;
    }
    return `<div class="msg assistant"><div class="msg-role assistant">${CC.escapeHtml(roleName)}</div><div class="msg-content">${CC.escapeHtml(m.content)}</div></div>`;
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

    // Generate missing summary
    document.querySelectorAll('[data-gen-summary]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Generating...';
        CC.showStatus('Generating summary...');
        try {
          await CC.api.drafts.generateSummary(btn.dataset.genSummary);
          await CC.refresh('drafts');
          CC.showStatus('Summary generated');
          CC.navigate('distributions');
        } catch (e) {
          CC.showStatus('Failed: ' + e.message);
          btn.disabled = false;
          btn.textContent = 'Generate Summary';
        }
      });
    });

    // Model selector change
    document.querySelectorAll('[data-model-select]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const draftId = sel.dataset.draft;
        const platform = sel.dataset.platform;
        if (!self.panelModels[draftId]) self.panelModels[draftId] = {};
        self.panelModels[draftId][platform] = sel.value;
      });
    });

    // Open/close platform panel
    document.querySelectorAll('[data-open-panel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const draftId = btn.dataset.openPanel;
        const platform = btn.dataset.platform;
        if (self.openPanels[draftId] === platform) {
          delete self.openPanels[draftId];
        } else {
          self.openPanels[draftId] = platform;
        }
        CC.navigate('distributions');
      });
    });

    document.querySelectorAll('[data-panel-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        delete self.openPanels[btn.dataset.panelClose];
        CC.navigate('distributions');
      });
    });

    // Send message in panel (works for both platform posts and site chat)
    document.querySelectorAll('[data-panel-send]').forEach((btn) => {
      const sendHandler = async () => {
        const draftId = btn.dataset.panelSend;
        const platform = btn.dataset.platform;
        const input = document.getElementById(`dist-input-${draftId}-${platform}`);
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;

        const modelId = self.getModelId(draftId, platform);
        const draft = CC.state.drafts.find((d) => d.id === draftId);
        const roleName = CC.state.models.find((mo) => mo.id === modelId)?.displayName || 'AI';

        const conv = document.getElementById(`dist-conv-${draftId}-${platform}`);
        conv.querySelectorAll('.empty-state').forEach((e) => e.remove());
        const userMsg = document.createElement('div');
        userMsg.className = 'msg user';
        userMsg.innerHTML = `<div class="msg-role user">You</div><div class="msg-content">${CC.escapeHtml(msg)}</div>`;
        conv.appendChild(userMsg);
        const thinkMsg = document.createElement('div');
        thinkMsg.className = 'msg assistant';
        thinkMsg.innerHTML = `<div class="msg-role assistant">${CC.escapeHtml(roleName)}</div><div class="msg-content msg-thinking">Thinking...</div>`;
        conv.appendChild(thinkMsg);
        conv.scrollTop = conv.scrollHeight;

        input.value = '';
        btn.disabled = true;
        btn.textContent = 'Thinking...';

        try {
          if (platform === 'site') {
            await CC.api.drafts.siteChat(draftId, msg, modelId);
          } else {
            await CC.api.drafts.platformChat(draftId, platform, msg, modelId);
          }
          await CC.refresh('drafts');
          CC.navigate('distributions');
        } catch (e) {
          thinkMsg.querySelector('.msg-content').textContent = 'Failed: ' + e.message;
          CC.showStatus('Failed: ' + e.message);
          btn.disabled = false;
          btn.textContent = 'Send';
        }
      };

      btn.addEventListener('click', sendHandler);

      // Enter to send
      const input = document.getElementById(`dist-input-${btn.dataset.panelSend}-${btn.dataset.platform}`);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendHandler();
        }
      });
    });

    // Execute site publish via MCP
    document.querySelectorAll('[data-site-execute]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        if (!confirm('Execute the publish plan via Payload CMS MCP?')) return;
        btn.disabled = true;
        btn.textContent = 'Executing...';
        CC.setStickyStatus(true);
        CC.showStatus('Publishing to site via MCP...');
        try {
          const result = await CC.api.drafts.siteExecute(btn.dataset.siteExecute);
          CC.setStickyStatus(false);
          CC.showStatus(result.success ? 'Published to site' : 'Publish completed');
          delete self.openPanels[btn.dataset.siteExecute];
          await CC.refresh('drafts');
          CC.navigate('distributions');
        } catch (e) {
          CC.setStickyStatus(false);
          CC.showStatus('Failed: ' + e.message);
          btn.disabled = false;
          btn.textContent = 'Execute Publish via MCP';
        }
      });
    });

    // Publish platform post
    document.querySelectorAll('[data-platform-publish]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const draftId = btn.dataset.platformPublish;
        const platform = btn.dataset.platform;
        const draft = CC.state.drafts.find((d) => d.id === draftId);
        const conv = draft?.platformPosts?.[platform]?.conversation || [];
        const lastAssistant = [...conv].reverse().find((m) => m.role === 'assistant');
        if (!lastAssistant) { CC.showStatus('No post to publish'); return; }

        if (!confirm(`Publish this ${platform} post to ContentStudio?`)) return;
        btn.disabled = true;
        btn.textContent = 'Publishing...';
        CC.setStickyStatus(true);
        CC.showStatus(`Publishing to ${platform} via ContentStudio...`);
        try {
          await CC.api.drafts.publishPlatform(draftId, platform, lastAssistant.content);
          CC.setStickyStatus(false);
          delete self.openPanels[draftId];
          await CC.refresh('drafts');
          CC.showStatus(`Published to ${platform}`);
          CC.navigate('distributions');
        } catch (e) {
          CC.setStickyStatus(false);
          CC.showStatus('Failed: ' + e.message);
          btn.disabled = false;
          btn.textContent = 'Publish';
        }
      });
    });

    // Auto-scroll open panel chat to bottom
    document.querySelectorAll('.dist-panel-chat').forEach((conv) => {
      conv.scrollTop = conv.scrollHeight;
    });

    // Copy post
    document.querySelectorAll('[data-copy-post]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copyPost).then(() => {
          CC.showStatus('Copied to clipboard');
        });
      });
    });
  }
};
