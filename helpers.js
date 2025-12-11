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

