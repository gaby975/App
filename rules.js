// ---------- Rules storage and UI ----------

const RULES_STORAGE_KEY = 'my_vocab_rules_v1';

function loadRules() {
  const raw = localStorage.getItem(RULES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map(rule => ({
      ...rule,
      id: rule.id || makeId(),
      createdAt: rule.createdAt || Date.now()
    }));
  } catch {
    return [];
  }
}

function saveRules(list) {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(list));
}

let rules = loadRules();
let editingRuleId = null;

// DOM elements for rules
const rulesForm = document.getElementById('rules-form');
const ruleTitleInput = document.getElementById('rule-title');
const ruleCategoryInput = document.getElementById('rule-category');
const ruleExplanationInput = document.getElementById('rule-explanation');
const ruleExamplesInput = document.getElementById('rule-examples');
const ruleSubmitBtn = document.getElementById('rule-submit-btn');
const ruleCancelEditBtn = document.getElementById('rule-cancel-edit');
const ruleEditingIndicator = document.getElementById('rule-editing-indicator');
const rulesBody = document.getElementById('rules-body');
const exportAllRulesBtn = document.getElementById('export-all-rules-btn');
const importAllRulesInput = document.getElementById('import-all-rules-input');
const rulesSearchInput = document.getElementById('rules-search');
const rulesFilterCategory = document.getElementById('rules-filter-category');
const rulesSortBy = document.getElementById('rules-sort-by');

function resetRuleEditing() {
  editingRuleId = null;
  rulesForm.reset();
  ruleSubmitBtn.textContent = 'Add rule';
  ruleCancelEditBtn.style.display = 'none';
  ruleEditingIndicator.style.display = 'none';
  ruleTitleInput.focus();
}

function getFilteredAndSortedRules() {
  const search = (rulesSearchInput?.value || '').toLowerCase();
  const categoryFilter = rulesFilterCategory?.value || '';
  const sortField = rulesSortBy?.value || 'newest';

  let filtered = rules.filter(rule => {
    const matchesCategory = !categoryFilter || rule.category === categoryFilter;
    const text = ((rule.title || '') + ' ' + (rule.explanation || '') + ' ' + (rule.examples || '')).toLowerCase();
    const matchesSearch = !search || text.includes(search);
    return matchesCategory && matchesSearch;
  });

  filtered.sort((a, b) => {
    if (sortField === 'newest') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    if (sortField === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (sortField === 'category') {
      return (a.category || '').localeCompare(b.category || '');
    }
    return 0;
  });

  return filtered;
}

function getShortExplanation(text, wordLimit = 15) {
  if (!text) return '';
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);

  if (words.length <= wordLimit) {
    return trimmed;
  }

  const preview = words.slice(0, wordLimit).join(' ');
  return preview + ' …';
}

function renderRulesTable() {
  if (!rulesBody) return;
  rulesBody.innerHTML = '';

  const sorted = getFilteredAndSortedRules();

  sorted.forEach(rule => {
    const tr = document.createElement('tr');
    tr.dataset.id = rule.id;

    const titleText = escapeHtml(rule.title || '');
    const categoryText = escapeHtml(rule.category || '');
    const fullExplanation = rule.explanation || '';

    const shortExplanation = escapeHtml(
      getShortExplanation(fullExplanation)
    );

    const examplesLines = (rule.examples || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const firstExample = examplesLines.length ? escapeHtml(examplesLines[0]) : '';

    const categoryCell = categoryText
      ? `<span class="rule-category-pill">${categoryText}</span>`
      : '';

    tr.innerHTML = `
      <td class="rules-col-title" data-label="Title">
        ${titleText}
        <button type="button" class="kebab-btn" title="More">⋮</button>
      </td>
      <td data-label="Category">${categoryCell}</td>
      <td class="rules-col-explanation" data-label="Explanation">${shortExplanation}</td>
      <td class="rules-col-examples" data-label="Examples">${firstExample}</td>
      <td class="actions-cell" data-label="Actions">
        <button type="button" class="edit-btn details-rule-btn" title="Show details">ℹ</button>
        <button type="button" class="edit-btn edit-rule-btn" title="Edit rule">✏</button>
        <button type="button" class="delete-btn delete-rule-btn" title="Delete rule">✕</button>
      </td>
    `;
    rulesBody.appendChild(tr);

    const detailsTr = document.createElement('tr');
    detailsTr.dataset.detailsFor = rule.id;
    detailsTr.className = 'rule-details-row';
    detailsTr.style.display = 'none';

    let detailsHtml = '';

    if (fullExplanation) {
      detailsHtml += `
        <div>
          <strong>Full explanation</strong>
          <div>${escapeHtml(fullExplanation)}</div>
        </div>
      `;
    }

    if (examplesLines.length) {
      const listItems = examplesLines
        .map(line => `<li>${escapeHtml(line)}</li>`)
        .join('');
      detailsHtml += `
        <div style="margin-top:6px;">
          <strong>Examples</strong>
          <ul class="rule-examples-list">
            ${listItems}
          </ul>
        </div>
      `;
    }

    if (!detailsHtml) {
      detailsHtml = '<em>No extra details.</em>';
    }

    detailsTr.innerHTML = `
      <td colspan="5">
        ${detailsHtml}
      </td>
    `;
    rulesBody.appendChild(detailsTr);
  });
}

if (rulesForm) {
  rulesForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = ruleTitleInput.value.trim();
    const explanation = ruleExplanationInput.value.trim();

    if (!title || !explanation) return;

    const baseData = {
      title,
      category: ruleCategoryInput.value,
      explanation,
      examples: ruleExamplesInput.value.trim()
    };

    if (editingRuleId) {
      const idx = rules.findIndex(r => r.id === editingRuleId);
      if (idx !== -1) {
        rules[idx] = {
          ...rules[idx],
          ...baseData
        };
      }
    } else {
      rules.push({
        ...baseData,
        id: makeId(),
        createdAt: Date.now()
      });
    }

    saveRules(rules);
    resetRuleEditing();
    renderRulesTable();
  });
}

ruleCancelEditBtn?.addEventListener('click', resetRuleEditing);
rulesSearchInput?.addEventListener('input', renderRulesTable);
rulesFilterCategory?.addEventListener('change', renderRulesTable);
rulesSortBy?.addEventListener('change', renderRulesTable);

// One click handler for the whole rules table, including kebab menu
rulesBody?.addEventListener('click', (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.dataset.id;

  // Kebab menu
  const kb = e.target.closest('.kebab-btn');
  if (kb && id) {
    e.stopPropagation();
    let menu = tr.querySelector('.kebab-menu');
    if (menu) {
      menu.remove();
      return;
    }
    menu = document.createElement('div');
    menu.className = 'kebab-menu';
    menu.innerHTML = `
      <button data-act="details-rule">Show details</button>
      <button data-act="edit-rule">Edit</button>
      <button data-act="delete-rule">Delete</button>
    `;
    tr.appendChild(menu);

    menu.addEventListener('click', (ev) => {
      const action = ev.target.dataset.act;
      if (!action) return;
      if (action === 'details-rule') {
        tr.querySelector('.details-rule-btn')?.click();
      }
      if (action === 'edit-rule') {
        tr.querySelector('.edit-rule-btn')?.click();
      }
      if (action === 'delete-rule') {
        tr.querySelector('.delete-rule-btn')?.click();
      }
      menu.remove();
    }, { once: true });

    return;
  }

  const btn = e.target.closest('button');
  if (!btn || !id) return;

  if (btn.classList.contains('edit-rule-btn')) {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    ruleTitleInput.value = rule.title || '';
    ruleCategoryInput.value = rule.category || '';
    ruleExplanationInput.value = rule.explanation || '';
    ruleExamplesInput.value = rule.examples || '';

    editingRuleId = id;
    ruleSubmitBtn.textContent = 'Save changes';
    ruleCancelEditBtn.style.display = 'inline-block';
    ruleEditingIndicator.style.display = 'inline';
    ruleTitleInput.focus();
  } else if (btn.classList.contains('delete-rule-btn')) {
    rules = rules.filter(r => r.id !== id);
    saveRules(rules);
    if (editingRuleId === id) {
      resetRuleEditing();
    }
    renderRulesTable();
  } else if (btn.classList.contains('details-rule-btn')) {
    const detailsRow = rulesBody.querySelector(
      `tr.rule-details-row[data-details-for="${id}"]`
    );
    if (!detailsRow) return;

    const isVisible =
      detailsRow.style.display === '' ||
      detailsRow.style.display === 'table-row';

    detailsRow.style.display = isVisible ? 'none' : 'table-row';
  }
});

// Initial render
renderRulesTable();
