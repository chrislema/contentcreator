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

  // Status listener
  CC.api.onStatus((text) => CC.showStatus(text));

  // Navigate to default view
  CC.navigate('settings');
})();
