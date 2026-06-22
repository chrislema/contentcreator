// Topics View
CC.views.topics = {
  filterSegment: '',
  filterStatus: '',
  sortBy: 'priority',
  searchQuery: '',

  html() {
    const topics = this.getFiltered();
    const segments = this.getAllSegments();

    return `${CC.header('Topics', 'Research-driven topic ideas aligned with audience segments', `
      <button class="btn-primary btn-sm" id="topic-generate">Generate Topics</button>
      <button class="btn-ghost btn-sm" id="topic-add">+ Add Topic</button>
    `)}
    <div class="section-body">
      <div class="toolbar">
        <input id="topic-search" type="text" placeholder="Search topics..." value="${CC.escapeHtml(this.searchQuery)}" />
        <select id="topic-filter-segment">
          <option value="">All segments</option>
          ${segments.map((s) => `<option value="${CC.escapeHtml(s.name)}" ${this.filterSegment === s.name ? 'selected' : ''}>${CC.escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select id="topic-filter-status">
          <option value="">All status</option>
          <option value="idea" ${this.filterStatus === 'idea' ? 'selected' : ''}>Idea</option>
          <option value="drafting" ${this.filterStatus === 'drafting' ? 'selected' : ''}>Drafting</option>
          <option value="published" ${this.filterStatus === 'published' ? 'selected' : ''}>Published</option>
        </select>
        <select id="topic-sort">
          <option value="priority" ${this.sortBy === 'priority' ? 'selected' : ''}>Sort: Priority</option>
          <option value="date" ${this.sortBy === 'date' ? 'selected' : ''}>Sort: Date</option>
          <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Sort: Title</option>
        </select>
      </div>
      ${topics.length === 0 ? CC.empty('No topics yet.', 'Generate topics from your connected data or add one manually.') : ''}
      <div class="card-grid">
        ${topics.map((t) => this.renderCard(t)).join('')}
      </div>
    </div>`;
  },

  getFiltered() {
    let topics = [...(CC.state.topics || [])];
    if (this.filterSegment) topics = topics.filter((t) => t.target === this.filterSegment);
    if (this.filterStatus) topics = topics.filter((t) => t.status === this.filterStatus);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      topics = topics.filter((t) => [t.title, t.angle, t.target, (t.cmsTags || []).join(' ')].join(' ').toLowerCase().includes(q));
    }
    if (this.sortBy === 'priority') topics.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    else if (this.sortBy === 'date') topics.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else if (this.sortBy === 'title') topics.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return topics;
  },

  getAllSegments() {
    const segments = [];
    for (const aud of CC.state.audiences || []) {
      for (const ms of aud.microSegments || []) {
        segments.push({ name: ms.name, audienceId: aud.id, msId: ms.id });
      }
    }
    return segments;
  },

  renderCard(t) {
    const p = t.priority || 3;
    return `<div class="card" data-topic-id="${t.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div class="card-title">${CC.escapeHtml(t.title)}</div>
        <span class="priority priority-${p}"><span class="priority-dot"></span> P${p}</span>
      </div>
      <div class="card-desc">${CC.escapeHtml(t.angle || '')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin:8px 0">
        ${t.target ? `<span class="badge accent">${CC.escapeHtml(t.target)}</span>` : ''}
        ${(t.cmsTags || []).map((tag) => `<span class="badge">${CC.escapeHtml(tag)}</span>`).join('')}
        <span class="badge dim">${CC.escapeHtml(t.status || 'idea')}</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn-primary btn-sm" data-topic-draft="${t.id}">Draft</button>
        <button class="btn-ghost btn-sm" data-topic-edit="${t.id}">Edit</button>
        <button class="btn-danger btn-sm" data-topic-remove="${t.id}">Delete</button>
      </div>
    </div>`;
  },

  init() {
    const self = this;

    document.getElementById('topic-search')?.addEventListener('input', (e) => {
      self.searchQuery = e.target.value;
      // Debounce
      clearTimeout(self._searchTimer);
      self._searchTimer = setTimeout(() => {
        // Just re-render the grid
        const topics = self.getFiltered();
        const grid = document.querySelector('.card-grid');
        if (grid) grid.innerHTML = topics.map((t) => self.renderCard(t)).join('') || '';
        self.bindCards();
      }, 200);
    });

    document.getElementById('topic-filter-segment')?.addEventListener('change', (e) => {
      self.filterSegment = e.target.value;
      CC.navigate('topics');
    });
    document.getElementById('topic-filter-status')?.addEventListener('change', (e) => {
      self.filterStatus = e.target.value;
      CC.navigate('topics');
    });
    document.getElementById('topic-sort')?.addEventListener('change', (e) => {
      self.sortBy = e.target.value;
      CC.navigate('topics');
    });

    this.bindCards();

    document.getElementById('topic-generate')?.addEventListener('click', async () => {
      const models = CC.state.models || [];
      if (models.length === 0) {
        CC.showStatus('Add a model in Settings first');
        return;
      }
      const model = models[0];
      CC.showStatus('Generating topics...');
      try {
        await CC.api.topics.generate(model.id);
        await CC.refresh('topics');
        CC.navigate('topics');
      } catch (e) {
        CC.showStatus('Failed: ' + e.message);
      }
    });

    document.getElementById('topic-add')?.addEventListener('click', async () => {
      const title = prompt('Topic title:');
      if (!title) return;
      const segments = self.getAllSegments();
      const angle = prompt('Angle/take:') || '';
      const targetOptions = segments.length > 0 ? segments.map((s) => s.name).join(', ') : '';
      const target = prompt(`Target segment (${targetOptions}):`) || '';
      await CC.api.topics.add({ title, angle, target, cmsTags: [], priority: 3, status: 'idea' });
      await CC.refresh('topics');
      CC.navigate('topics');
    });
  },

  bindCards() {
    const self = this;
    document.querySelectorAll('[data-topic-remove]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await CC.api.topics.remove(btn.dataset.topicRemove);
        await CC.refresh('topics');
        CC.navigate('topics');
      });
    });

    document.querySelectorAll('[data-topic-edit]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const topic = CC.state.topics.find((t) => t.id === btn.dataset.topicEdit);
        if (!topic) return;
        const title = prompt('Title:', topic.title);
        if (title === null) return;
        const angle = prompt('Angle:', topic.angle || '') || '';
        const priority = parseInt(prompt('Priority (1-5):', topic.priority || 3)) || 3;
        await CC.api.topics.update(topic.id, { title, angle, priority });
        await CC.refresh('topics');
        CC.navigate('topics');
      });
    });

    document.querySelectorAll('[data-topic-draft]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const topicId = btn.dataset.topicDraft;
        const topic = CC.state.topics.find((t) => t.id === topicId);
        if (!topic) return;

        const models = CC.state.models || [];
        if (models.length === 0) { CC.showStatus('Add a model in Settings first'); return; }

        // Find segment
        const segments = self.getAllSegments();
        const seg = segments.find((s) => s.name === topic.target) || segments[0];

        // Get active frameworks
        const activeFws = (CC.state.frameworks || []).filter((f) => f.active).slice(0, 5);
        const voice = CC.state.voiceProfiles.find((v) => v.isDefault) || CC.state.voiceProfiles[0];

        const draft = await CC.api.drafts.add({
          title: topic.title,
          topicId: topic.id,
          modelId: models[0].id,
          segmentId: seg?.msId || '',
          frameworkIds: activeFws.map((f) => f.id),
          voiceProfileId: voice?.id || '',
          conversation: [],
          content: ''
        });

        await CC.api.topics.update(topic.id, { status: 'drafting' });
        await CC.refresh('topics');
        await CC.refresh('drafts');
        CC.views.drafts.selectedId = draft.id;
        CC.navigate('drafts');
      });
    });
  }
};
