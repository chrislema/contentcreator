// Main initialization
(async () => {
  await CC.loadAll();

  // Nav handlers
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.addEventListener('click', () => CC.navigate(el.dataset.view));
  });

  // Sidebar collapse toggle
  const appEl = document.getElementById('app');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const toggleIcon = document.getElementById('toggle-icon');
  toggleBtn.addEventListener('click', () => {
    const collapsed = appEl.classList.toggle('sidebar-collapsed');
    toggleIcon.innerHTML = collapsed ? '&#9776;' : '&#9776;';
    toggleBtn.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  });

  // Status listener - sticky during long operations
  CC.api.onStatus((text) => {
    const sticky = CC._stickyStatus === true;
    CC.showStatus(text, sticky);
  });

  // Global topic generation listeners (always active, not per-view)
  CC.api.onTopicsGenerated((data) => {
    CC.setStickyStatus(false);
    const btn = document.getElementById('topic-generate');
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Topics'; }
    CC.showStatus(`Generated ${data.count} ranked topics from: ${(data.sources || []).join(', ')}`);
    // Refresh and re-render topics view if visible
    CC.refresh('topics').then(() => {
      if (CC.state.currentView === 'topics') {
        CC.navigate('topics');
      }
    });
  });

  CC.api.onTopicsFailed((data) => {
    CC.setStickyStatus(false);
    CC.showStatus('Failed: ' + (data.error || 'unknown error'));
    const btn = document.getElementById('topic-generate');
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Topics'; }
  });

  // Article analysis completion listener
  CC.api.onAnalyzed((data) => {
    CC.setStickyStatus(false);
    CC.showStatus(`Analysis complete: ${data.done}/${data.total} articles summarized`);
    CC.refresh('existing').then(() => {
      if (CC.state.currentView === 'settings') {
        CC.navigate('settings');
      }
    });
  });

  // Navigate to default view
  CC.navigate('settings');
})();
