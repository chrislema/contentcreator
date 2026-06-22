// Audiences View
CC.views.audiences = {
  selectedId: null,

  html() {
    const audiences = CC.state.audiences || [];
    if (audiences.length === 0) {
      return `${CC.header('Audiences', 'Manage audience segment profiles')}
        <div class="section-body">
          ${CC.empty('No audience profiles yet.', 'Import a markdown file or add one manually.')}
          <div style="text-align:center;margin-top:20px">
            <button class="btn-primary" id="aud-import">Import Audience (.md)</button>
            <button class="btn-ghost" id="aud-add" style="margin-left:10px">Add Manually</button>
          </div>
        </div>`;
    }

    if (!this.selectedId || !audiences.find((a) => a.id === this.selectedId)) {
      this.selectedId = audiences[0].id;
    }
    const aud = audiences.find((a) => a.id === this.selectedId);

    const sidebar = audiences.map((a) => `
      <div class="draft-list-item ${a.id === this.selectedId ? 'active' : ''}" data-aud-id="${a.id}">
        <div class="title">${CC.escapeHtml(a.name)}</div>
        <div class="sub">${(a.microSegments || []).length} segments</div>
      </div>
    `).join('');

    return `${CC.header('Audiences', 'Manage audience segment profiles', `
      <button class="btn-ghost btn-sm" id="aud-import">Import .md</button>
      <button class="btn-danger btn-sm" data-aud-remove="${aud.id}">Delete</button>
    `)}
    <div class="draft-layout">
      <div class="draft-list-panel">
        ${sidebar}
      </div>
      <div class="draft-workspace">
        <div style="overflow-y:auto">
          <h2 style="margin:0 0 4px;font-size:18px">${CC.escapeHtml(aud.name)}</h2>
          <p style="color:var(--muted);font-size:13px;margin:0 0 40px;line-height:1.5">${CC.escapeHtml((aud.description || '').slice(0, 180))}${(aud.description || '').length > 180 ? '...' : ''}</p>
          ${aud.howToUse ? `<div style="background:var(--accent-soft);border:1px solid #f0c9a0;border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:24px;font-size:13px;color:var(--accent-2);line-height:1.5">${CC.escapeHtml(aud.howToUse.slice(0, 300))}${aud.howToUse.length > 300 ? '...' : ''}</div>` : ''}
          ${(aud.microSegments || []).map((ms, i) => this.renderMicroSegment(ms, i)).join('')}
        </div>
      </div>
    </div>`;
  },

  renderMicroSegment(ms, idx) {
    const gp = ms.goalPyramid || {};
    const forces = ms.fourForces || {};
    return `<div class="ms-card">
      <div class="ms-card-header" data-ms-toggle="${idx}">
        <div>
          <div style="font-size:15px;font-weight:700">${CC.escapeHtml(ms.name)}</div>
          ${ms.dominantForce ? `<span class="badge accent">${CC.escapeHtml(ms.dominantForce)}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn-danger btn-sm" data-ms-delete="${ms.id}">Delete</button>
          <span style="color:var(--muted);font-size:13px">&#9662;</span>
        </div>
      </div>
      <div class="ms-card-body" id="ms-body-${idx}">
        ${ms.description ? `<div class="ms-section"><h5>Description</h5><p>${CC.escapeHtml(ms.description)}</p></div>` : ''}
        ${(gp.level1 || gp.level2 || gp.level3 || gp.level4) ? `<div class="ms-section">
          <h5>Goal Pyramid</h5>
          ${gp.level4 ? `<div class="pyramid-level"><span class="lvl">Level 4</span><span>${CC.escapeHtml(gp.level4)}</span></div>` : ''}
          ${gp.level3 ? `<div class="pyramid-level"><span class="lvl">Level 3</span><span>${CC.escapeHtml(gp.level3)}</span></div>` : ''}
          ${gp.level2 ? `<div class="pyramid-level"><span class="lvl">Level 2</span><span>${CC.escapeHtml(gp.level2)}</span></div>` : ''}
          ${gp.level1 ? `<div class="pyramid-level"><span class="lvl">Level 1</span><span>${CC.escapeHtml(gp.level1)}</span></div>` : ''}
        </div>` : ''}
        ${(ms.invertedPainPyramid || []).length ? `<div class="ms-section">
          <h5>Pain &rarr; Inverted Goal</h5>
          ${ms.invertedPainPyramid.map((p) => `
            <div class="pain-row">
              <div class="pain">${CC.escapeHtml(p.pain)}</div>
              <div class="goal">${CC.escapeHtml(p.invertedGoal)}</div>
            </div>
          `).join('')}
        </div>` : ''}
        ${(forces.push || forces.anxiety) ? `<div class="ms-section">
          <h5>Four Forces</h5>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            ${forces.push ? `<span class="badge">Push: ${CC.escapeHtml(forces.push)}</span>` : ''}
            ${forces.magnetism ? `<span class="badge">Magnetism: ${CC.escapeHtml(forces.magnetism)}</span>` : ''}
            ${forces.anxiety ? `<span class="badge">Anxiety: ${CC.escapeHtml(forces.anxiety)}</span>` : ''}
            ${forces.habit ? `<span class="badge">Habit: ${CC.escapeHtml(forces.habit)}</span>` : ''}
          </div>
        </div>` : ''}
        ${(ms.hiringMoments || []).length ? `<div class="ms-section">
          <h5>Hiring Moments</h5>
          <ul>${ms.hiringMoments.map((h) => `<li>${CC.escapeHtml(h)}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
    </div>`;
  },

  init() {
    const self = this;
    document.querySelectorAll('[data-aud-id]').forEach((el) => {
      el.addEventListener('click', () => {
        self.selectedId = el.dataset.audId;
        CC.navigate('audiences');
      });
    });

    document.querySelectorAll('[data-ms-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-ms-delete]')) return;
        const body = document.getElementById(`ms-body-${el.dataset.msToggle}`);
        if (body) body.classList.toggle('open');
      });
    });

    document.querySelectorAll('[data-ms-delete]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const msId = btn.dataset.msDelete;
        const aud = CC.state.audiences.find((a) => a.id === self.selectedId);
        if (!aud) return;
        const msName = aud.microSegments?.find((m) => m.id === msId)?.name || 'this segment';
        if (!confirm(`Delete "${msName}"?`)) return;
        const updatedSegments = (aud.microSegments || []).filter((m) => m.id !== msId);
        await CC.api.audiences.update(aud.id, { microSegments: updatedSegments });
        await CC.refresh('audiences');
        CC.navigate('audiences');
      });
    });

    document.getElementById('aud-import')?.addEventListener('click', async () => {
      const result = await CC.api.import.file('audience');
      if (result) { await CC.refresh('audiences'); self.selectedId = result.id; CC.navigate('audiences'); }
    });

    document.getElementById('aud-add')?.addEventListener('click', async () => {
      const name = prompt('Audience profile name:');
      if (!name) return;
      const result = await CC.api.audiences.add({ name, description: '', microSegments: [] });
      await CC.refresh('audiences');
      self.selectedId = result.id;
      CC.navigate('audiences');
    });

    document.querySelectorAll('[data-aud-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this audience profile?')) return;
        await CC.api.audiences.remove(btn.dataset.audRemove);
        await CC.refresh('audiences');
        self.selectedId = null;
        CC.navigate('audiences');
      });
    });
  }
};
