// ---------- Kebab closing for the whole app ----------
function closeKebabs() {
  document.querySelectorAll('.kebab-menu').forEach(m => m.remove());
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.kebab-btn') || e.target.closest('.kebab-menu')) return;
  closeKebabs();
});

// ---------- Tabs ----------
const tabButtons = document.querySelectorAll('.tab-button');
const tabPages = document.querySelectorAll('.tab-page');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.tab;

    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    tabPages.forEach(page => {
      page.classList.toggle('hidden', page.id !== targetId);
    });

    closeKebabs();
  });
});

// ---------- Collapsible panels ----------
function setupCollapsible(id, key) {
  const d = document.getElementById(id);
  if (!d) return;
  const saved = localStorage.getItem(key);
  if (saved === 'open') d.setAttribute('open', '');
  d.addEventListener('toggle', () => {
    localStorage.setItem(key, d.open ? 'open' : 'closed');
  });
}

setupCollapsible('vocab-form-wrap', 'ui_vform_open');
setupCollapsible('rules-form-wrap', 'ui_rulesform_open');
setupCollapsible('quiz-controls-wrap', 'ui_quizcontrols_open');
setupCollapsible('table-controls-wrap', 'ui_tablecontrols_open');

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('SW scope:', r.scope))
      .catch(err => console.error('SW error:', err));
  });
}

// Global helper for the three dots menu
function toggleKebabMenu(button) {
  // Find the row of this button
  const row = button.closest('tr');
  if (!row) return;

  // Find the menu in that row
  const menu = row.querySelector('.kebab-menu');
  if (!menu) return;

  const isOpen = menu.classList.contains('open');

  // Close any other open menus
  document.querySelectorAll('.kebab-menu.open').forEach(m => {
    if (m !== menu) m.classList.remove('open');
  });

  // Toggle this one
  if (!isOpen) {
    menu.classList.add('open');
  } else {
    menu.classList.remove('open');
  }
}


