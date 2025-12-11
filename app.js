// ---------- DOM elements ----------
const vocabTab = document.getElementById('vocab-tab');
const form = document.getElementById('vocab-form');
const wordInput = document.getElementById('word');
const frInput = document.getElementById('fr');
const typeInput = document.getElementById('type');
const meaningInput = document.getElementById('meaning');
const commentInput = document.getElementById('comment');

const searchInput = document.getElementById('search');
const filterType = document.getElementById('filter-type');
const sortBy = document.getElementById('sort-by');
const tbody = document.getElementById('vocab-body');

const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit');
const editingIndicator = document.getElementById('editing-indicator');
const exportAllVocabBtn = document.getElementById('export-all-vocab-btn');
const importAllVocabInput = document.getElementById('import-all-vocab-input');

const pageSizeSelect = document.getElementById('page-size');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

const STORAGE_KEY = 'my_vocab_list_v3';

let vocab = loadVocab();
let editingId = null;

let currentPage = 1;
let pageSize = pageSizeSelect.value === 'all'
  ? 'all'
  : parseInt(pageSizeSelect.value, 10);
let totalPages = 1;

// ---------- Storage ----------
function loadVocab() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      ...item,
      id: item.id || makeId(),
      createdAt: item.createdAt || Date.now(),
      correctCount: item.correctCount || 0,
      wrongCount: item.wrongCount || 0,
      lastReviewed: item.lastReviewed || null
    }));
  } catch {
    return [];
  }
}

function saveVocab(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ---------- Table rendering ----------
function resetEditingState() {
  editingId = null;
  form.reset();
  submitBtn.textContent = 'Add word';
  cancelEditBtn.style.display = 'none';
  editingIndicator.style.display = 'none';
  wordInput.focus();
}

function getFilteredAndSortedList() {
  const search = searchInput.value.toLowerCase();
  const typeFilter = filterType.value;

  let filtered = vocab.filter(item => {
    const matchesType = !typeFilter || item.type === typeFilter;
    const text = ((item.word || '') + ' ' + (item.fr || '')).toLowerCase();
    const matchesSearch = !search || text.includes(search);
    return matchesType && matchesSearch;
  });

  const sortField = sortBy.value;

  filtered.sort((a, b) => {
    if (sortField === 'newest') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    if (sortField === 'oldest') {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    const va = (a[sortField] || '').toLowerCase();
    const vb = (b[sortField] || '').toLowerCase();
    return va.localeCompare(vb);
  });

  return filtered;
}

function renderTable() {
  const filtered = getFilteredAndSortedList();
  const totalItems = filtered.length;

  const renderRow = (item) => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;
  
    const typeClass = (item.type || '').toLowerCase();
    const typeCell = item.type
      ? `<span class="type-pill type-${typeClass}">${escapeHtml(item.type)}</span>`
      : '';
  
    const diffLabel = getDifficultyLabel(item);
    const diffClass = diffLabel.toLowerCase();
    const difficultyCell = `<span class="difficulty-pill diff-${diffClass}">${diffLabel}</span>`;
  
    tr.innerHTML = `
      <td class="word-col" data-label="Word">
        ${buildPillGroup(item.word, 'word-pill')}
        <button type="button" class="kebab-btn" title="More">⋮</button>
      </td>
      <td data-label="FR">${buildPillGroup(item.fr, 'fr-pill')}</td>
      <td data-label="Type">${typeCell}</td>
      <td data-label="Difficulty">${difficultyCell}</td>
      <td class="col-meaning" data-label="Meaning">
        ${item.meaning ? escapeHtml(item.meaning) : ''}
      </td>
      <td class="col-comment" data-label="Comment">
        ${item.comment ? escapeHtml(item.comment) : ''}
      </td>
      <td class="actions-cell" data-label="Actions">
        <button type="button" class="edit-btn" title="Edit">✏</button>
        <button type="button" class="delete-btn" title="Delete">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  };


  if (pageSize === 'all') {
    totalPages = 1;
    currentPage = 1;

    tbody.innerHTML = '';
    filtered.forEach(renderRow);

    pageInfo.textContent = totalItems
      ? `Showing all ${totalItems} word(s)`
      : 'No words to display';
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;

    adjustWordColumnWidth();
    updateWordOfDay();
    return;
  }

  if (totalItems === 0) {
    totalPages = 1;
    currentPage = 1;
    tbody.innerHTML = '';
    pageInfo.textContent = 'No words to display';
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;

    adjustWordColumnWidth();
    updateWordOfDay();
    return;
  }

  totalPages = Math.ceil(totalItems / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filtered.slice(startIndex, endIndex);

  tbody.innerHTML = '';
  pageItems.forEach(renderRow);

  pageInfo.textContent =
    `Page ${currentPage} of ${totalPages} (${totalItems} word${totalItems === 1 ? '' : 's'})`;

  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;

  adjustWordColumnWidth();
  updateWordOfDay();
}

// ---------- Form events ----------
form.addEventListener('submit', event => {
  event.preventDefault();

  const baseData = {
    word: wordInput.value.trim(),
    fr: frInput.value.trim(),
    type: typeInput.value,
    meaning: meaningInput.value.trim(),
    comment: commentInput.value.trim()
  };

  if (!baseData.word) return;

  if (editingId) {
    const idx = vocab.findIndex(item => item.id === editingId);
    if (idx !== -1) {
      vocab[idx] = {
        ...vocab[idx],
        ...baseData
      };
    }
  } else {
    vocab.push({
      ...baseData,
      id: makeId(),
      createdAt: Date.now(),
      correctCount: 0,
      wrongCount: 0,
      lastReviewed: null
    });
  }

  saveVocab(vocab);
  resetEditingState();
  renderTable();
});

cancelEditBtn.addEventListener('click', () => {
  resetEditingState();
});

tbody.addEventListener('click', event => {
  const tr = event.target.closest('tr');
  if (!tr) return;
  const id = tr.dataset.id;
  if (!id) return;

  // Click on the word cell → speak
  if (event.target.closest('td.word-col') && !event.target.closest('button')) {
    const item = vocab.find(entry => entry.id === id);
    if (item && item.word) {
      speak(item.word);
    }
    return;
  }

  const button = event.target.closest('button');
  if (!button) return;

  if (button.classList.contains('edit-btn')) {
    const item = vocab.find(entry => entry.id === id);
    if (!item) return;

    wordInput.value = item.word || '';
    frInput.value = item.fr || '';
    typeInput.value = item.type || '';
    meaningInput.value = item.meaning || '';
    commentInput.value = item.comment || '';

    editingId = id;
    submitBtn.textContent = 'Save changes';
    cancelEditBtn.style.display = 'inline-block';
    editingIndicator.style.display = 'inline';
    wordInput.focus();
  }

  if (button.classList.contains('delete-btn')) {
    vocab = vocab.filter(entry => entry.id !== id);
    saveVocab(vocab);

    if (editingId === id) {
      resetEditingState();
    }

    renderTable();
  }
});

// Vocab kebab
tbody.addEventListener('click', (e) => {
  const kb = e.target.closest('.kebab-btn');
  if (!kb) return;
  e.stopPropagation();
  const tr = kb.closest('tr');
  let menu = tr.querySelector('.kebab-menu');
  if (menu) { menu.remove(); return; }
  menu = document.createElement('div');
  menu.className = 'kebab-menu';
  menu.innerHTML = `
    <button data-act="edit-word">Edit</button>
    <button data-act="delete-word">Delete</button>
  `;
  tr.appendChild(menu);

  menu.addEventListener('click', (ev) => {
    const id = tr.dataset.id;
    if (ev.target.dataset.act === 'edit-word') {
      const btn = tr.querySelector('.edit-btn');
      btn?.click();
    }
    if (ev.target.dataset.act === 'delete-word') {
      const btn = tr.querySelector('.delete-btn');
      btn?.click();
    }
    menu.remove();
  }, { once: true });
});

function resetPageAndRender() {
  currentPage = 1;
  renderTable();
}

searchInput.addEventListener('input', resetPageAndRender);
filterType.addEventListener('change', resetPageAndRender);
sortBy.addEventListener('change', resetPageAndRender);

// ---------- Pagination ----------
pageSizeSelect.addEventListener('change', () => {
  pageSize = pageSizeSelect.value === 'all'
    ? 'all'
    : parseInt(pageSizeSelect.value, 10);
  currentPage = 1;
  renderTable();
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
});

// Initial render for vocab
renderTable();
