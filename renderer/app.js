// ContentCreator - Core App
window.CC = {
  state: {
    currentView: 'settings',
    settings: null,
    models: [],
    frameworks: [],
    mcps: [],
    antiAi: [],
    voiceProfiles: [],
    platformProfiles: [],
    audiences: [],
    topics: [],
    drafts: [],
    distributions: []
  },
  views: {},
  api: window.api,

  escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  },

  showStatus(text, sticky = false) {
    const bar = document.getElementById('status-bar');
    if (!text) { bar.classList.add('hidden'); return; }
    bar.textContent = text;
    bar.classList.remove('hidden');
    clearTimeout(this._statusTimer);
    // Only auto-hide for non-sticky messages
    if (!sticky && !this._stickyStatus) {
      this._statusTimer = setTimeout(() => bar.classList.add('hidden'), 3000);
    }
  },

  setStickyStatus(on) {
    this._stickyStatus = on;
  },

  header(title, subtitle, actions) {
    return `<div class="section-header ui-section-header">
      <div>
        <h1>${this.escapeHtml(title)}</h1>
        ${subtitle ? `<div class="subtitle">${this.escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div class="header-actions ui-actions">${actions || ''}</div>
    </div>`;
  },

  empty(message, hint) {
    return `<div class="empty-state ui-empty-state">
      <p>${this.escapeHtml(message)}</p>
      ${hint ? `<p class="muted">${this.escapeHtml(hint)}</p>` : ''}
    </div>`;
  },

  async loadAll() {
    const [settings, models, frameworks, mcps, antiAi, voiceProfiles, platformProfiles, audiences, topics, drafts, distributions, existing] = await Promise.all([
      this.api.settings.get(),
      this.api.models.list(),
      this.api.frameworks.list(),
      this.api.mcps.list(),
      this.api.antiAi.list(),
      this.api.voiceProfiles.list(),
      this.api.platformProfiles.list(),
      this.api.audiences.list(),
      this.api.topics.list(),
      this.api.drafts.list(),
      this.api.distributions.list(),
      this.api.existing.list()
    ]);
    this.state.settings = settings;
    this.state.models = models;
    this.state.frameworks = frameworks;
    this.state.mcps = mcps;
    this.state.antiAi = antiAi;
    this.state.voiceProfiles = voiceProfiles;
    this.state.platformProfiles = platformProfiles;
    this.state.audiences = audiences;
    this.state.topics = topics;
    this.state.drafts = drafts;
    this.state.distributions = distributions;
    this.state.existing = existing;
  },

  async refresh(key) {
    if (key === 'settings' || !key) this.state.settings = await this.api.settings.get();
    if (key === 'models' || !key) this.state.models = await this.api.models.list();
    if (key === 'frameworks' || !key) this.state.frameworks = await this.api.frameworks.list();
    if (key === 'mcps' || !key) this.state.mcps = await this.api.mcps.list();
    if (key === 'antiAi' || !key) this.state.antiAi = await this.api.antiAi.list();
    if (key === 'voiceProfiles' || !key) this.state.voiceProfiles = await this.api.voiceProfiles.list();
    if (key === 'platformProfiles' || !key) this.state.platformProfiles = await this.api.platformProfiles.list();
    if (key === 'audiences' || !key) this.state.audiences = await this.api.audiences.list();
    if (key === 'topics' || !key) this.state.topics = await this.api.topics.list();
    if (key === 'drafts' || !key) this.state.drafts = await this.api.drafts.list();
    if (key === 'distributions' || !key) this.state.distributions = await this.api.distributions.list();
    if (key === 'existing' || !key) this.state.existing = await this.api.existing.list();
  },

  async navigate(view) {
    this.state.currentView = view;
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === view);
    });
    const main = document.getElementById('main-content');
    if (this.views[view]) {
      main.innerHTML = this.views[view].html();
      if (this.views[view].init) this.views[view].init();
    } else {
      main.innerHTML = `<div class="section-body"><p>View not found: ${this.escapeHtml(view)}</p></div>`;
    }
  }
};
