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

// Kebab menu behaviour for mobile cards
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const kebabBtn = event.target.closest('.kebab-btn');
    const menuClick = event.target.closest('.kebab-menu');
    const openMenus = document.querySelectorAll('.kebab-menu.open');

    // Click outside any menu closes all
    if (!kebabBtn && !menuClick) {
      openMenus.forEach(m => m.classList.remove('open'));
      return;
    }

    // Click on the three dots
    if (kebabBtn) {
      event.stopPropagation();
      const row = kebabBtn.closest('tr');
      if (!row) return;
      const menu = row.querySelector('.kebab-menu');
      if (!menu) return;

      const isOpen = menu.classList.contains('open');

      // Close other menus
      openMenus.forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });

      // Toggle this one
      menu.classList.toggle('open', !isOpen);
    }
  });
});

