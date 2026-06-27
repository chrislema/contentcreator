// Research View
CC.views.research = {
  filterStatus: '',
  sortBy: 'score',
  searchQuery: '',

  html() {
    const research = this.getFiltered();
    const models = CC.state.models || [];
    const defaultModelId = CC.state.settings?.defaultModelId;
    const selectedModelId = this.modelId || defaultModelId || models[0]?.id || '';
    const hasScores = research.some((item) => item.scores);

    return `${CC.header('Research', 'Research-backed idea cards scored against your data', `
      <select id="research-model" class="research-model-select">
        ${models.map((m) => `<option value="${m.id}" ${m.id === selectedModelId ? 'selected' : ''}>${CC.escapeHtml(m.displayName || m.model)}</option>`).join('')}
      </select>
      ${CC.ui.button('Import PDFs', { id: 'research-import' })}
    `)}
    <div class="section-body">
      <div class="ui-toolbar">
        <input id="research-search" type="text" placeholder="Search research..." value="${CC.escapeHtml(this.searchQuery)}" />
        <select id="research-filter-status">
          <option value="">All status</option>
          <option value="idea" ${this.filterStatus === 'idea' ? 'selected' : ''}>Idea</option>
          <option value="analyzing" ${this.filterStatus === 'analyzing' ? 'selected' : ''}>Analyzing</option>
          <option value="drafting" ${this.filterStatus === 'drafting' ? 'selected' : ''}>Drafting</option>
          <option value="completed" ${this.filterStatus === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="failed" ${this.filterStatus === 'failed' ? 'selected' : ''}>Failed</option>
        </select>
        <select id="research-sort">
          <option value="score" ${this.sortBy === 'score' ? 'selected' : ''}>Sort: Score</option>
          <option value="date" ${this.sortBy === 'date' ? 'selected' : ''}>Sort: Date</option>
          <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Sort: Title</option>
        </select>
      </div>
      ${research.length === 0 ? CC.empty('No research cards yet.', 'Import PDFs to create evidence-backed draft ideas.') : ''}
      <div class="ui-grid ui-card-grid research-grid">
        ${research.map((item, i) => this.renderCard(item, i, hasScores)).join('')}
      </div>
    </div>`;
  },

  getFiltered() {
    let items = [...(CC.state.research || [])];
    if (this.filterStatus) items = items.filter((item) => item.status === this.filterStatus);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter((item) => [
        item.title,
        item.subject,
        item.angle,
        item.aha,
        item.finding,
        item.target,
        (item.citations || []).map((citation) => [
          citation.articleTitle,
          (citation.authors || []).join(' '),
          citation.journal,
          citation.publicationDate,
          citation.year,
          citation.doi,
          citation.rawCitation
        ].join(' ')).join(' '),
        (item.cmsTags || []).join(' '),
        (item.sources || []).map((s) => s.fileName).join(' ')
      ].join(' ').toLowerCase().includes(q));
    }
    if (this.sortBy === 'score') items.sort((a, b) => ((b.scores?.total) || 0) - ((a.scores?.total) || 0));
    else if (this.sortBy === 'date') items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else if (this.sortBy === 'title') items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return items;
  },

  renderCard(item, idx, hasScores) {
    const scores = item.scores;
    const rank = hasScores && scores ? idx + 1 : null;
    const status = item.status || 'idea';
    const isDone = status === 'completed' || status === 'published';
    const isAnalyzing = status === 'analyzing';
    const isFailed = status === 'failed';
    const citationHtml = (item.citations || []).slice(0, 3).map((citation) => {
      const authors = Array.isArray(citation.authors) ? citation.authors.join(', ') : (citation.authors || '');
      const publication = [
        citation.journal,
        citation.publicationDate || citation.year,
        citation.volume ? `Vol. ${citation.volume}` : '',
        citation.issue ? `No. ${citation.issue}` : '',
        citation.pages
      ].filter(Boolean).join(' · ');
      const details = [
        authors,
        publication,
        citation.doi ? `DOI: ${citation.doi}` : ''
      ].filter(Boolean).join(' | ');
      const title = citation.articleTitle || citation.rawCitation || citation.sourceFile || 'Citation details';
      return `<div class="research-citation">
        <strong>${CC.escapeHtml(title)}</strong>
        ${details ? `<small>${CC.escapeHtml(details)}</small>` : ''}
      </div>`;
    }).join('');
    const sourceBadges = (item.sources || []).slice(0, 4).map((source) => {
      const label = source.fileName || 'PDF';
      const tone = source.status === 'failed' ? 'danger' : source.status === 'extracted' ? 'ok' : 'dim';
      return CC.ui.badge(label, { tone, size: 'sm' });
    }).join('');

    return `<div class="ui-card topic-card research-card ${rank === 1 ? 'topic-card-top-ranked' : ''} ${isDone ? 'topic-card-completed' : ''}" data-research-id="${item.id}">
      <div class="ui-card-header topic-card-header">
        <div class="ui-card-title">${rank ? `<span class="topic-rank">#${rank}</span> ` : ''}${CC.escapeHtml(item.title || item.subject || 'Research insight')}</div>
        ${scores && !isDone
          ? `<span class="topic-score"><span class="topic-score-num">${scores.total}</span><span class="topic-score-max">/50</span></span>`
          : isAnalyzing ? CC.ui.badge('Analyzing', { tone: 'accent' })
            : isFailed ? CC.ui.badge('Failed', { tone: 'danger' })
              : isDone ? CC.ui.badge('Completed', { tone: 'ok' })
                : CC.ui.badge(status, { tone: 'dim' })
        }
      </div>
      <div class="ui-card-desc">${CC.escapeHtml(item.angle || item.concept || item.aha || '')}</div>
      ${scores && !isDone ? `<div class="topic-scores-bar">
        <span class="topic-score-pill" title="Search Demand">Search ${scores.searchDemand}</span>
        <span class="topic-score-pill" title="Performance Potential">Traffic ${scores.performancePotential}</span>
        <span class="topic-score-pill" title="Content Gap">Gap ${scores.contentGap}</span>
        <span class="topic-score-pill" title="Audience Fit">Fit ${scores.audienceFit}</span>
        <span class="topic-score-pill" title="Uniqueness">Unique ${scores.uniqueness}</span>
      </div>` : ''}
      ${item.aha ? `<div class="research-aha">${CC.escapeHtml(item.aha)}</div>` : ''}
      ${item.finding ? `<div class="research-detail"><span>Finding</span>${CC.escapeHtml(item.finding)}</div>` : ''}
      ${item.whyItMatters ? `<div class="research-detail"><span>Why it matters</span>${CC.escapeHtml(item.whyItMatters)}</div>` : ''}
      ${citationHtml ? `<div class="research-detail research-citations"><span>Citation</span>${citationHtml}</div>` : ''}
      ${item.rationale ? `<div class="topic-rationale">${CC.escapeHtml(item.rationale)}</div>` : ''}
      ${item.lastError ? `<div class="research-error">${CC.escapeHtml(item.lastError)}</div>` : ''}
      <div class="ui-tags research-tags">
        ${item.target ? CC.ui.badge(item.target, { tone: 'accent' }) : ''}
        ${(item.cmsTags || []).map((tag) => CC.ui.badge(tag)).join('')}
        ${CC.ui.badge(status, { tone: isFailed ? 'danger' : 'dim' })}
      </div>
      ${sourceBadges ? `<div class="ui-tags research-sources">${sourceBadges}</div>` : ''}
      <div class="ui-actions">
        ${status === 'idea' ? CC.ui.button('Draft', { data: { 'research-draft': item.id } }) : ''}
        ${CC.ui.button('Delete', { variant: 'danger', data: { 'research-remove': item.id } })}
      </div>
    </div>`;
  },

  init() {
    const self = this;

    document.getElementById('research-model')?.addEventListener('change', (e) => {
      self.modelId = e.target.value;
    });

    document.getElementById('research-search')?.addEventListener('input', (e) => {
      self.searchQuery = e.target.value;
      clearTimeout(self._searchTimer);
      self._searchTimer = setTimeout(() => {
        const grid = document.querySelector('.ui-card-grid');
        const items = self.getFiltered();
        const hasScores = items.some((item) => item.scores);
        if (grid) grid.innerHTML = items.map((item, i) => self.renderCard(item, i, hasScores)).join('');
        self.bindCards();
      }, 120);
    });

    document.getElementById('research-filter-status')?.addEventListener('change', (e) => {
      self.filterStatus = e.target.value;
      CC.navigate('research');
    });

    document.getElementById('research-sort')?.addEventListener('change', (e) => {
      self.sortBy = e.target.value;
      CC.navigate('research');
    });

    document.getElementById('research-import')?.addEventListener('click', async () => {
      const btn = document.getElementById('research-import');
      const modelId = document.getElementById('research-model')?.value;
      if (!modelId) { CC.showStatus('Add a model in Settings first'); return; }
      btn.disabled = true;
      btn.textContent = 'Importing...';
      CC.setStickyStatus(true);
      CC.showStatus('Starting research analysis...');
      try {
        const result = await CC.api.research.importPdfs(modelId);
        if (result.canceled) {
          CC.setStickyStatus(false);
          btn.disabled = false;
          btn.textContent = 'Import PDFs';
          return;
        }
        await CC.refresh('research');
        CC.navigate('research');
      } catch (e) {
        CC.setStickyStatus(false);
        CC.showStatus('Research failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Import PDFs';
      }
    });

    this.bindCards();
  },

  bindCards() {
    document.querySelectorAll('[data-research-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await CC.api.research.remove(btn.dataset.researchRemove);
        await CC.refresh('research');
        CC.navigate('research');
      });
    });

    document.querySelectorAll('[data-research-draft]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = CC.state.research.find((r) => r.id === btn.dataset.researchDraft);
        if (!item) return;

        const models = CC.state.models || [];
        if (models.length === 0) { CC.showStatus('Add a model in Settings first'); return; }
        const defaultModelId = CC.state.settings?.defaultModelId;
        const modelId = (models.find((m) => m.id === defaultModelId) || models[0]).id;
        const segment = (CC.state.audiences || []).find((a) => a.id === item.targetAudience)
          || (CC.state.audiences || []).find((a) => a.name === item.target)
          || (CC.state.audiences || [])[0];
        const voice = CC.state.voiceProfiles?.find((v) => v.isDefault) || CC.state.voiceProfiles?.[0];
        const activeFws = (CC.state.frameworks || []).filter((f) => f.active);

        const draft = await CC.api.drafts.add({
          title: item.title || item.subject,
          sourceType: 'research',
          researchId: item.id,
          modelId,
          segmentId: segment?.id || '',
          frameworkIds: activeFws.map((f) => f.id),
          voiceProfileId: voice?.id || '',
          conversation: [],
          content: ''
        });

        await CC.api.research.update(item.id, { status: 'drafting' });
        await CC.refresh('research');
        await CC.refresh('drafts');
        CC.views.drafts.selectedId = draft.id;
        CC.navigate('drafts');
      });
    });
  }
};
