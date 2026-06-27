// Audiences View
CC.views.audiences = {
  html() {
    const audiences = CC.state.audiences || [];
    return `${CC.header('Audiences', 'Standalone audience segments that compete on their own', `
      ${CC.ui.button('Import .md', { id: 'aud-import', variant: 'ghost' })}
    `)}
    <div class="ui-grid audience-grid">
      ${audiences.length === 0
        ? CC.empty('No audience segments yet.', 'Import a markdown file to extract individual segments.')
        : audiences.map((a, i) => this.renderCard(a, i)).join('')
      }
    </div>`;
  },

  renderCard(a, idx) {
    const gp = a.goalPyramid || {};
    const forces = a.fourForces || {};
    return `<div class="ui-card ms-card">
      <div class="ui-card-header ms-card-header">
        <div class="ms-card-title-block">
          <div class="ui-card-title ms-card-title">${CC.escapeHtml(a.name)}</div>
          ${a.description ? `<div class="ms-card-desc">${CC.escapeHtml(a.description)}</div>` : ''}
          <div class="ui-tags ms-card-badges">
            ${a.dominantForce ? CC.ui.badge(a.dominantForce, { tone: 'accent' }) : ''}
            ${a.source ? CC.ui.badge(a.source, { tone: 'dim' }) : ''}
          </div>
        </div>
        <div class="ui-actions ui-card-actions ms-card-actions">
          ${CC.ui.button('Details', { data: { 'ms-toggle': idx } })}
          ${CC.ui.button('Remove', { variant: 'danger', data: { 'aud-remove': a.id } })}
        </div>
      </div>
      <div class="ms-card-body" id="ms-body-${idx}">
        ${(gp.level1 || gp.level2 || gp.level3 || gp.level4) ? `<div class="ms-section">
          <h5>Goal Pyramid</h5>
          ${gp.level4 ? `<div class="pyramid-level"><span class="lvl">Level 4</span><span>${CC.escapeHtml(gp.level4)}</span></div>` : ''}
          ${gp.level3 ? `<div class="pyramid-level"><span class="lvl">Level 3</span><span>${CC.escapeHtml(gp.level3)}</span></div>` : ''}
          ${gp.level2 ? `<div class="pyramid-level"><span class="lvl">Level 2</span><span>${CC.escapeHtml(gp.level2)}</span></div>` : ''}
          ${gp.level1 ? `<div class="pyramid-level"><span class="lvl">Level 1</span><span>${CC.escapeHtml(gp.level1)}</span></div>` : ''}
        </div>` : ''}
        ${(a.invertedPainPyramid || []).length ? `<div class="ms-section">
          <h5>Pain &rarr; Inverted Goal</h5>
          ${a.invertedPainPyramid.map((p) => `
            <div class="pain-row">
              <div class="pain">${CC.escapeHtml(p.pain)}</div>
              <div class="goal">${CC.escapeHtml(p.invertedGoal)}</div>
            </div>
          `).join('')}
        </div>` : ''}
        ${(forces.push || forces.anxiety) ? `<div class="ms-section">
          <h5>Four Forces</h5>
          <div class="ui-tags ms-card-badges">
            ${forces.push ? CC.ui.badge(`Push: ${forces.push}`) : ''}
            ${forces.magnetism ? CC.ui.badge(`Magnetism: ${forces.magnetism}`) : ''}
            ${forces.anxiety ? CC.ui.badge(`Anxiety: ${forces.anxiety}`) : ''}
            ${forces.habit ? CC.ui.badge(`Habit: ${forces.habit}`) : ''}
          </div>
          ${forces.netForce ? `<p class="ui-note-block">${CC.escapeHtml(forces.netForce)}</p>` : ''}
        </div>` : ''}
        ${(a.hiringMoments || []).length ? `<div class="ms-section">
          <h5>Hiring Moments</h5>
          <ul>${a.hiringMoments.map((h) => `<li>${CC.escapeHtml(h)}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
    </div>`;
  },

  init() {
    document.querySelectorAll('[data-ms-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const body = document.getElementById(`ms-body-${el.dataset.msToggle}`);
        if (body) body.classList.toggle('open');
      });
    });

    document.querySelectorAll('[data-aud-remove]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const aud = CC.state.audiences.find((a) => a.id === btn.dataset.audRemove);
        if (!aud) return;
        if (!confirm(`Delete "${aud.name}"?`)) return;
        await CC.api.audiences.remove(btn.dataset.audRemove);
        await CC.refresh('audiences');
        CC.navigate('audiences');
      });
    });

    document.getElementById('aud-import')?.addEventListener('click', async () => {
      const result = await CC.api.import.file('audience');
      if (result) {
        await CC.refresh('audiences');
        CC.navigate('audiences');
      }
    });
  }
};
