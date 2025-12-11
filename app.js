// ---------- Helpers ----------
function adjustWordColumnWidth() {
  const isPhone = window.matchMedia('(max-width: 640px)').matches;

  const table = document.querySelector('table');
  if (!table) return;

  const wordHeader = table.querySelector('thead th:nth-child(1)');
  const wordCells  = table.querySelectorAll('tbody tr td:nth-child(1)');
  if (!wordHeader || !wordCells.length) return;

  // On phones the table becomes cards, so remove any inline widths and stop.
  if (isPhone) {
    wordHeader.style.width = '';
    wordCells.forEach(c => { c.style.width = ''; });
    return;
  }

  let maxWidth = 0;
  wordCells.forEach(cell => {
    const w = cell.scrollWidth;
    if (w > maxWidth) maxWidth = w;
  });

  const targetWidth = (maxWidth + 12) + 'px';
  wordHeader.style.width = targetWidth;
  wordCells.forEach(cell => { cell.style.width = targetWidth; });
}
window.addEventListener('resize', () => {
  requestAnimationFrame(adjustWordColumnWidth);
});
// ---------- Theme toggle ----------
const THEME_KEY = 'vocab_theme';
// ---------- Voice selection (Google UK English only) ----------

const VOICE_GENDER_KEY = 'vocab_voice_gender';

let availableUkVoices = [];
let currentVoiceGender = localStorage.getItem(VOICE_GENDER_KEY) || 'female';

function updateVoiceToggleLabel() {
  const btn = document.getElementById('voice-toggle');
  if (!btn) return;
  btn.textContent = currentVoiceGender === 'female' ? '♂️ Voice' : '♀️ Voice';
}

// Load voices from the browser and keep only Google UK English (en-GB)
function loadVoices() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices() || [];

  availableUkVoices = voices.filter(v =>
    v.lang === 'en-GB' && v.name.toLowerCase().includes('google uk english')
  );

  updateVoiceToggleLabel();
}
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

function getVoiceByGender(gender) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];

  // Prefer Google UK voices
  const googleUk = voices.filter(v =>
    v.lang === 'en-GB' && v.name.toLowerCase().includes('google uk english')
  );

  if (googleUk.length) {
    const word = gender === 'male' ? 'male' : 'female';
    const re = new RegExp(`\\b${word}\\b`);   // match whole word only

    // This now matches "Google UK English Male" but NOT "Google UK English Female" when word = "male"
    const match = googleUk.find(v => re.test(v.name.toLowerCase())) || googleUk[0];

    // Optional: see which one is actually used
    console.log('Chosen voice:', gender, match && match.name);

    return match;
  }

  // Fallback: any UK English voice
  const anyUk = voices.filter(v => v.lang === 'en-GB');
  if (anyUk.length) return anyUk[0];

  // Fallback: any English voice
  const anyEn = voices.filter(v => v.lang && v.lang.startsWith('en'));
  if (anyEn.length) return anyEn[0];

  return null;
}


function speak(text) {
  if (!text) return;
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 1;
  utterance.pitch = 1;

  const chosenVoice = getVoiceByGender(currentVoiceGender);
  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}


function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

const systemPrefersDark =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const savedTheme = localStorage.getItem(THEME_KEY) || (systemPrefersDark ? 'dark' : 'light');
applyTheme(savedTheme);

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.body.classList.contains('dark') ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7)
  );
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normaliseAnswer(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getPossibleAnswers(ansStr) {
  return ansStr
    .split(/[\/;,]/)
    .map(part => normaliseAnswer(part))
    .filter(part => part.length > 0);
}

function splitAnswersForDisplay(ansStr) {
  return ansStr
    .split(/[\/;,]/)
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Split "Supporter ; Tolérer" into individual pills with line breaks
function buildPillGroup(text, baseClass) {
  if (!text) return '';
  return text
    .split(';')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => `<span class="${baseClass}">${escapeHtml(part)}</span>`)
    .join('<br>');
}

function getVocabItemById(id) {
  return vocab.find(w => w.id === id) || null;
}

function buildAnswerPanel(isCorrect, correctRaw, vocabItem) {
  const answers = splitAnswersForDisplay(correctRaw)
    .map(a => `<span class="answer-chip">${escapeHtml(a)}</span>`)
    .join(' ');

  const cardClass = isCorrect
    ? 'quiz-feedback-card correct'
    : 'quiz-feedback-card incorrect';

  const title = isCorrect ? 'Correct!' : 'Incorrect!';

  const meaningLine =
    vocabItem && vocabItem.meaning
      ? `<div><strong>Meaning:</strong> ${escapeHtml(vocabItem.meaning)}</div>`
      : '';

  const exampleLine =
    vocabItem && vocabItem.comment
      ? `<div><strong>Example:</strong> ${escapeHtml(vocabItem.comment)}</div>`
      : '';

  return `
    <div class="${cardClass}">
      <div class="quiz-feedback-title">${title}</div>
      <div><strong>Answer(s):</strong> ${answers}</div>
      ${meaningLine}
      ${exampleLine}
    </div>
  `;
}

// ---------- Difficulty helpers ----------
function getStats(item) {
  const correct = item.correctCount || 0;
  const wrong = item.wrongCount || 0;
  const total = correct + wrong;
  const accuracy = total > 0 ? correct / total : 0;
  return { correct, wrong, total, accuracy };
}

function getDifficultyLabel(item) {
  const { total, accuracy } = getStats(item);
  if (total === 0) return 'New';
  if (accuracy < 0.6) return 'Hard';
  if (accuracy < 0.85) return 'Medium';
  return 'Easy';
}

function isHardWord(item) {
  return getDifficultyLabel(item) === 'Hard';
}

function getNextReviewDelayDays(item) {
  const diff = getDifficultyLabel(item);
  if (diff === 'New' || diff === 'Hard') return 1;
  if (diff === 'Medium') return 3;
  return 7;
}

function isDueForReview(item) {
  const last = item.lastReviewed || 0;
  const delayDays = getNextReviewDelayDays(item);
  const now = Date.now();
  const ms = delayDays * 24 * 60 * 60 * 1000;
  return !last || now - last >= ms;
}

// ---------- Word of the day ----------
const wordOfDayList = document.getElementById('word-of-day-list');

function updateWordOfDay() {
  if (!wordOfDayList || !vocab.length) return;

  wordOfDayList.innerHTML = '';

  const today = new Date();
  const seedBase =
    Number(today.toISOString().slice(0, 10).replace(/-/g, '')) ||
    today.getDate();

  const count = Math.min(3, vocab.length);
  const chosenIndexes = new Set();
  let tries = 0;

  while (chosenIndexes.size < count && tries < vocab.length * 3) {
    const idx = (seedBase + tries * 97) % vocab.length;
    chosenIndexes.add(idx);
    tries++;
  }

  Array.from(chosenIndexes).forEach(idx => {
    const item = vocab[idx];
    const li = document.createElement('li');
    const target = item.fr || item.meaning || '';
    li.textContent = `${item.word} → ${target}`;
    wordOfDayList.appendChild(li);
  });
}

// ---------- DOM elements ----------
const vocabTab = document.getElementById('vocab-tab');
const form = document.getElementById('vocab-form');
const wordInput = document.getElementById('word');
const frInput = document.getElementById('fr');
const typeInput = document.getElementById('type');
const meaningInput = document.getElementById('meaning');
const commentInput = document.getElementById('comment');
const voiceToggleBtn = document.getElementById('voice-toggle');

// Toggle between Google UK English female / male
if (voiceToggleBtn) {
  voiceToggleBtn.addEventListener('click', () => {
    currentVoiceGender = currentVoiceGender === 'female' ? 'male' : 'female';
    localStorage.setItem(VOICE_GENDER_KEY, currentVoiceGender);
    updateVoiceToggleLabel();
  });
  // Make sure label matches stored gender on load
  updateVoiceToggleLabel();
}

const searchInput = document.getElementById('search');
const filterType = document.getElementById('filter-type');
const sortBy = document.getElementById('sort-by');
const tbody = document.getElementById('vocab-body');

const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit');
const editingIndicator = document.getElementById('editing-indicator');
const exportAllVocabBtn = document.getElementById('export-all-vocab-btn');
const importAllVocabInput = document.getElementById('import-all-vocab-input');


const quizDirection = document.getElementById('quiz-direction');
const quizModeSelect = document.getElementById('quiz-mode');
const quizCountSelect = document.getElementById('quiz-count');
const quizPoolSelect = document.getElementById('quiz-pool');
const startQuizBtn = document.getElementById('start-quiz-btn');

const quizArea = document.getElementById('quiz-area');
const quizHeader = document.getElementById('quiz-header');
const quizQuestion = document.getElementById('quiz-question');
const quizInputArea = document.getElementById('quiz-input-area');
const quizFeedback = document.getElementById('quiz-feedback');
const quizCheckBtn = document.getElementById('quiz-check-btn');
const quizNextBtn = document.getElementById('quiz-next-btn');
const quizSkipBtn = document.getElementById('quiz-skip-btn');
const quizEndBtn = document.getElementById('quiz-end-btn');

const pageSizeSelect = document.getElementById('page-size');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

const STORAGE_KEY = 'my_vocab_list_v3';

let vocab = loadVocab();
let editingId = null;
let currentQuestion = null;
let quizQuestions = [];
let quizPool = [];
let redoQueue = [];
let wrongSummary = []; 
let quizIndex = 0;
let quizCorrect = 0;
let quizWrong = 0;
let scoredQuestionCount = 0;
let currentMode = 'typing';
let quizActive = false;
let inRedoPhase = false;
let inSummary = false; 
let hasAnsweredCurrent = false;



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
// Close any open kebab menus when tapping elsewhere
document.addEventListener('click', (e) => {
  if (e.target.closest('.kebab-btn') || e.target.closest('.kebab-menu')) return;
  document.querySelectorAll('.kebab-menu').forEach(m => m.remove());
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

// ---------- Quiz logic ----------
function getQuizCandidates() {
  const base = getFilteredAndSortedList();
  const pool = quizPoolSelect.value;

  if (pool === 'hard') {
    const hard = base.filter(isHardWord);
    if (!hard.length) {
      alert('No hard words found (try missing some in quizzes first, or change the pool).');
    }
    return hard;
  }

  if (pool === 'due') {
    const due = base.filter(isDueForReview);
    if (!due.length) {
      alert('No words are due for review today (based on your stats).');
    }
    return due;
  }

  return base;
}

function buildQuizQuestions() {
  const candidates = getQuizCandidates();
  if (!candidates || !candidates.length) return null;

  quizPool = candidates.slice();
  shuffle(candidates);

  let count = quizCountSelect.value === 'all'
    ? candidates.length
    : parseInt(quizCountSelect.value, 10);

  if (count > candidates.length) count = candidates.length;

  const direction = quizDirection.value;
  const questions = [];

  for (let i = 0; i < count; i++) {
    const item = candidates[i];
    let actualDirection = direction;
    if (direction === 'mixed') {
      actualDirection = Math.random() < 0.5 ? 'en-fr' : 'fr-en';
    }

    let promptText;
    let answerText;
    let side;

    if (actualDirection === 'en-fr') {
      promptText = item.word || '';
      answerText = item.fr || item.meaning || '';
      side = 'en-fr';
    } else {
      promptText = item.fr || item.meaning || '';
      answerText = item.word || '';
      side = 'fr-en';
    }

    if (!promptText || !answerText) continue;

    questions.push({
      id: item.id,
      prompt: promptText,
      answer: answerText,
      direction: side
    });
  }

  if (!questions.length) {
    alert('Not enough complete words (need both English and French/meaning).');
    return null;
  }

  return questions;
}

function updateStatsForAnswer(wordId, correct) {
  const idx = vocab.findIndex(w => w.id === wordId);
  if (idx === -1) return;
  const item = vocab[idx];
  if (correct) {
    item.correctCount = (item.correctCount || 0) + 1;
  } else {
    item.wrongCount = (item.wrongCount || 0) + 1;
  }
  item.lastReviewed = Date.now();
  saveVocab(vocab);
}

function buildMultipleChoiceOptions(question) {
  const correct = question.answer;
  const answers = new Set();
  answers.add(correct);

  const direction = question.direction;
  const pool = shuffle(quizPool.slice());

  for (const item of pool) {
    if (answers.size >= 4) break;
    if (item.id === question.id) continue;

    let candidate;
    if (direction === 'en-fr') {
      candidate = item.fr || item.meaning || '';
    } else {
      candidate = item.word || '';
    }
    if (!candidate) continue;
    answers.add(candidate);
  }

  return shuffle(Array.from(answers));
}

function updateQuizHeader() {
  if (!quizActive || !quizQuestions.length) {
    quizHeader.textContent = '';
    return;
  }

  // During redo phase, show a different text but keep the same score
  if (inRedoPhase) {
    quizHeader.textContent =
      `Review – extra practice (Score: ${quizCorrect} ✓ / ${quizWrong} ✗)`;
    return;
  }

  const total = scoredQuestionCount || quizQuestions.length;
  quizHeader.textContent =
    `Question ${quizIndex + 1} of ${total} – ` +
    `Score: ${quizCorrect} ✓ / ${quizWrong} ✗`;
}


function showQuizQuestion() {
  currentQuestion = quizQuestions[quizIndex];
  if (!currentQuestion) {
    finishQuiz();
    return;
  }

  hasAnsweredCurrent = false;   // reset for this question

  updateQuizHeader();
  const itemMeta = getVocabItemById(currentQuestion.id);
  let typePillHTML = '';
  if (itemMeta && itemMeta.type) {
    const typeClass = (itemMeta.type || '').toLowerCase();
    typePillHTML =
      ` <span class="type-pill type-${typeClass}">` +
      escapeHtml(itemMeta.type) +
      `</span>`;
  }
  let speakerHtml = '';

  if (currentQuestion.direction === 'en-fr' || currentQuestion.direction === 'fr-en') {
    speakerHtml =
      ' <button type="button" id="quiz-speak-btn" class="speak-btn" title="Play English pronunciation">🔊</button>';
  }

  quizQuestion.innerHTML =
    escapeHtml(currentQuestion.prompt) + typePillHTML + speakerHtml;


  const quizSpeakBtn = document.getElementById('quiz-speak-btn');
  if (quizSpeakBtn) {
    const itemMetaForSpeech = getVocabItemById(currentQuestion.id);
    quizSpeakBtn.addEventListener('click', () => {
      let englishToSpeak = '';

      if (itemMetaForSpeech && itemMetaForSpeech.word) {
        englishToSpeak = itemMetaForSpeech.word;
      } else {
        if (currentQuestion.direction === 'en-fr') {
          englishToSpeak = currentQuestion.prompt;
        } else if (currentQuestion.direction === 'fr-en') {
          englishToSpeak = currentQuestion.answer;
        }
      }

      speak(englishToSpeak);
    });
  }

  quizFeedback.innerHTML = '';
  quizInputArea.innerHTML = '';

  currentMode = quizModeSelect.value;

  quizNextBtn.style.display = 'none';
  quizSkipBtn.style.display = 'inline-block';
  quizCheckBtn.style.display = (currentMode === 'typing') ? 'inline-block' : 'none';
  quizCheckBtn.disabled = false;

  if (currentMode === 'typing') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'quiz-answer-input';
    input.placeholder = 'Type your answer here';
    quizInputArea.appendChild(input);
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation(); // <— add this line

        if (!hasAnsweredCurrent) {
          // first Enter → check answer
          handleTypingCheck();
        } else {
          // second Enter → next question (may call finishQuiz)
          nextQuizQuestion();
        }
      }
    });
  }else {
    const options = buildMultipleChoiceOptions(currentQuestion);
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opt;
      btn.className = 'quiz-option-btn';
      btn.addEventListener('click', () => handleMCQAnswer(opt, btn));
      quizInputArea.appendChild(btn);
    });
  }

  quizArea.style.display = 'block';
}


function handleTypingCheck() {
  if (!currentQuestion) return;
  const input = document.getElementById('quiz-answer-input');
  if (!input) return;

  const userAnswer = input.value;
  const correct = currentQuestion.answer;

  const userNorm = normaliseAnswer(userAnswer);
  const possible = getPossibleAnswers(correct);
  const ok = possible.includes(userNorm);

  const itemMeta = getVocabItemById(currentQuestion.id);
  quizFeedback.innerHTML = buildAnswerPanel(ok, correct, itemMeta);

  if (!inRedoPhase) {
    if (ok) {
      quizCorrect += 1;
    } else {
      quizWrong += 1;
      // Schedule this word to be repeated at the end
      redoQueue.push({ ...currentQuestion });
      // Keep for final summary
      wrongSummary.push({ ...currentQuestion });
    }
    updateStatsForAnswer(currentQuestion.id, ok);
  } 

  hasAnsweredCurrent = true; 
  updateQuizHeader();

  quizCheckBtn.disabled = true;
  quizNextBtn.style.display = 'inline-block';
  quizSkipBtn.style.display = 'none';
}

function handleMCQAnswer(optionText, clickedButton) {
  if (!currentQuestion) return;

  const correct = currentQuestion.answer;
  const buttons = quizInputArea.querySelectorAll('.quiz-option-btn');

  let ok = (optionText === correct);

  buttons.forEach(btn => {
    btn.disabled = true;
    const isCorrect = (btn.textContent === correct);
    btn.classList.remove('correct', 'wrong');

    if (isCorrect) {
      btn.classList.add('correct');
    }
  });

  if (!ok) {
    clickedButton.classList.add('wrong');
  }

  const itemMeta = getVocabItemById(currentQuestion.id);
  quizFeedback.innerHTML = buildAnswerPanel(ok, correct, itemMeta);

  if (!inRedoPhase) {
    if (ok) {
      quizCorrect += 1;
    } else {
      quizWrong += 1;
      // Schedule this word to be repeated at the end
      redoQueue.push({ ...currentQuestion });
      // Keep for final summary
      wrongSummary.push({ ...currentQuestion });
    }

    updateStatsForAnswer(currentQuestion.id, ok);
  }

  hasAnsweredCurrent = true; 
  updateQuizHeader();

  quizNextBtn.style.display = 'inline-block';
  quizSkipBtn.style.display = 'none';
}

function nextQuizQuestion() {
quizIndex += 1;

  // Finished main run?
  if (!inRedoPhase && quizIndex >= quizQuestions.length) {
    if (redoQueue.length > 0) {
      // Start redo phase
      inRedoPhase = true;
      quizQuestions = redoQueue;
      quizIndex = 0;
      redoQueue = [];
      showQuizQuestion();
      return;
    }
    // Nothing to redo
    finishQuiz();
    return;
  }

  // Finished redo phase
  if (inRedoPhase && quizIndex >= quizQuestions.length) {
    finishQuiz();
    return;
  }

  showQuizQuestion();
}


function finishQuiz() {
  quizActive = false;
  inSummary = true;
  startQuizBtn.disabled = false;

  const total = scoredQuestionCount || quizQuestions.length;
  const percent = total > 0 ? Math.round((quizCorrect / total) * 100) : 0;

  let summaryHtml = `
    <div class="quiz-feedback-card">
      <div class="quiz-feedback-title">Quiz finished</div>
      <div>You scored <strong>${quizCorrect} / ${total}</strong> (${percent}% correct).</div>
  `;

  if (wrongSummary.length > 0) {
    summaryHtml += `<div style="margin-top:6px;"><strong>Words to review:</strong></div><ul class="quiz-summary-list">`;

    wrongSummary.forEach(q => {
      const item = getVocabItemById(q.id);
      if (!item) return;

      const mainLabel = item.word || item.fr || q.prompt;
      const diffLabel = getDifficultyLabel(item);
      const diffClass = diffLabel.toLowerCase();

      // one pill per possible answer
      const answerPills = splitAnswersForDisplay(q.answer)
        .map(a => `<span class="answer-chip">${escapeHtml(a)}</span>`)
        .join(' ');

      // same difficulty pill style as in the table
      const diffPill = `<span class="difficulty-pill diff-${diffClass}">${diffLabel}</span>`;

      summaryHtml += `
        <li>
          <strong>${escapeHtml(mainLabel)}</strong>
          – ${answerPills}
          – ${diffPill}
        </li>
      `;
    });


    summaryHtml += `</ul>`;
  } else {
    summaryHtml += `<div style="margin-top:6px;">Nothing to review from this quiz. 🔥</div>`;
  }

  summaryHtml += `</div>`;

  quizArea.style.display = 'block';
  quizHeader.textContent = '';
  quizQuestion.textContent = '';
  quizInputArea.innerHTML = '';
  quizFeedback.innerHTML = summaryHtml;

  quizCheckBtn.style.display = 'none';
  quizNextBtn.style.display = 'none';
  quizSkipBtn.style.display = 'none';
  quizEndBtn.style.display = 'inline-block';

  // still in quiz-running mode here, so the rest of the tab stays hidden
  renderTable();
}
function closeKebabs() {
  document.querySelectorAll('.kebab-menu').forEach(m => m.remove());
}

function closeSummaryAndRestore() {
  inSummary = false;
  quizArea.style.display = 'none';
  vocabTab.classList.remove('quiz-running');

  quizHeader.textContent = '';
  quizQuestion.textContent = '';
  quizInputArea.innerHTML = '';
  quizFeedback.innerHTML = '';
}

document.addEventListener('keydown', (e) => {
  // On the summary screen: Space or Enter closes it
  if (inSummary && (e.code === 'Space' || e.key === 'Enter')) {
    e.preventDefault();
    closeSummaryAndRestore();
    return;
  }

  // During the quiz: only used for MCQ to go to next question
  if (!quizActive) return;
  if (currentMode === 'multiple' && hasAnsweredCurrent && e.key === 'Enter') {
    e.preventDefault();
    nextQuizQuestion();
  }
});

// Wire up quiz buttons
startQuizBtn.addEventListener('click', () => {
  if (quizActive) return;

  const questions = buildQuizQuestions();
  if (!questions || !questions.length) return;

  quizQuestions = questions;
  quizIndex = 0;
  quizCorrect = 0;
  quizWrong = 0;
  quizActive = true;
  startQuizBtn.disabled = true;
  redoQueue = [];
  wrongSummary = [];          // reset summary list
  inRedoPhase = false;
  inSummary = false;          // not on summary yet
  scoredQuestionCount = quizQuestions.length;
  vocabTab.classList.add('quiz-running');
  showQuizQuestion();
});



quizCheckBtn.addEventListener('click', handleTypingCheck);
quizNextBtn.addEventListener('click', nextQuizQuestion);
quizSkipBtn.addEventListener('click', () => {
  if (!quizActive) return;
  nextQuizQuestion();
});

quizEndBtn.addEventListener('click', () => {
  // If we are on the final summary screen, this closes it
  if (inSummary && !quizActive) {
    closeSummaryAndRestore();
    return;
  }

  // During the quiz, End quiz still asks for confirmation
  if (!quizActive) return;
  if (confirm('End quiz now?')) {
    finishQuiz();
  }
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

    // close any open kebab when changing tab
    closeKebabs();
  });
});
// ---------- Rules storage & UI ----------
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
  // Internal storage: ids are kept here (like vocab),
  // they just won't be exported unless you add exports later.
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


// Rules kebab safe even before the const is declared
document.getElementById('rules-body')?.addEventListener('click', (e) => {
  const kb = e.target.closest('.kebab-btn');
  if (!kb) return;
  e.stopPropagation();
  const tr = kb.closest('tr');
  let menu = tr.querySelector('.kebab-menu');
  if (menu) { menu.remove(); return; }
  menu = document.createElement('div');
  menu.className = 'kebab-menu';
  menu.innerHTML = `
    <button data-act="details-rule">Show details</button>
    <button data-act="edit-rule">Edit</button>
    <button data-act="delete-rule">Delete</button>
  `;
  tr.appendChild(menu);

  menu.addEventListener('click', (ev) => {
    const id = tr.dataset.id;
    if (ev.target.dataset.act === 'details-rule') tr.querySelector('.details-rule-btn')?.click();
    if (ev.target.dataset.act === 'edit-rule')    tr.querySelector('.edit-rule-btn')?.click();
    if (ev.target.dataset.act === 'delete-rule')  tr.querySelector('.delete-rule-btn')?.click();
    menu.remove();
  }, { once: true });
});

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

    // Only the first example in the main table
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

    // Details row (collapsed by default)
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

ruleCancelEditBtn?.addEventListener('click', resetRuleEditing);
rulesSearchInput?.addEventListener('input', renderRulesTable);
rulesFilterCategory?.addEventListener('change', renderRulesTable);
rulesSortBy?.addEventListener('change', renderRulesTable);


rulesBody?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const tr = e.target.closest('tr');
  const id = tr?.dataset.id;
  if (!id) return;

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


// ---------- Combined vocab + rules export / import (JSON only) ----------

function buildExportData() {
  return {
    version: 1,
    vocab,
    rules
  };
}

function exportAllData() {
  const data = buildExportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `data-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importAllFromText(text) {
  const parsed = JSON.parse(text);

  let importedVocabRaw = [];
  let importedRulesRaw = [];

  if (Array.isArray(parsed)) {
    // simple array, treat as vocab only
    importedVocabRaw = parsed;
  } else {
    if (Array.isArray(parsed.vocab)) importedVocabRaw = parsed.vocab;
    if (Array.isArray(parsed.rules)) importedRulesRaw = parsed.rules;
  }

  if (!importedVocabRaw.length && !importedRulesRaw.length) {
    throw new Error('JSON does not contain vocab or rules arrays');
  }

  if (importedVocabRaw.length) {
    vocab = importedVocabRaw.map(item => ({
      word: item.word || '',
      fr: item.fr || '',
      type: item.type || '',
      meaning: item.meaning || '',
      comment: item.comment || '',
      id: item.id || makeId(),
      createdAt: item.createdAt || Date.now(),
      correctCount: item.correctCount || 0,
      wrongCount: item.wrongCount || 0,
      lastReviewed: item.lastReviewed || null
    }));
    saveVocab(vocab);
    currentPage = 1;
    resetEditingState();
  }

  if (importedRulesRaw.length) {
    rules = importedRulesRaw.map(item => ({
      title: item.title || '',
      category: item.category || '',
      explanation: item.explanation || '',
      examples: item.examples || '',
      id: item.id || makeId(),
      createdAt: item.createdAt || Date.now()
    }));
    saveRules(rules);
    resetRuleEditing();
  }

  renderTable();
  renderRulesTable();
}

function attachAllImport(inputElement) {
  if (!inputElement) return;
  inputElement.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        importAllFromText(e.target.result);
        alert('Import successful');
      } catch (err) {
        alert('Could not import data: ' + err.message);
      } finally {
        // reset file input so you can import the same file again if needed
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  });
}

// hook buttons in both tabs
exportAllVocabBtn?.addEventListener('click', exportAllData);
exportAllRulesBtn?.addEventListener('click', exportAllData);
attachAllImport(importAllVocabInput);
attachAllImport(importAllRulesInput);

// Initial render for rules
renderRulesTable();

// Initial render for vocab
renderTable();

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('SW scope:', r.scope))
      .catch(err => console.error('SW error:', err));
  });
}
