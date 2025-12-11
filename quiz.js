// ---------- Quiz DOM elements ----------
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

// ---------- Quiz state ----------
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

  hasAnsweredCurrent = false;

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
        e.stopPropagation();

        if (!hasAnsweredCurrent) {
          handleTypingCheck();
        } else {
          nextQuizQuestion();
        }
      }
    });
  } else {
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
      redoQueue.push({ ...currentQuestion });
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
      redoQueue.push({ ...currentQuestion });
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

  if (!inRedoPhase && quizIndex >= quizQuestions.length) {
    if (redoQueue.length > 0) {
      inRedoPhase = true;
      quizQuestions = redoQueue;
      quizIndex = 0;
      redoQueue = [];
      showQuizQuestion();
      return;
    }
    finishQuiz();
    return;
  }

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

      const answerPills = splitAnswersForDisplay(q.answer)
        .map(a => `<span class="answer-chip">${escapeHtml(a)}</span>`)
        .join(' ');

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

  renderTable();
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
  if (inSummary && (e.code === 'Space' || e.key === 'Enter')) {
    e.preventDefault();
    closeSummaryAndRestore();
    return;
  }

  if (!quizActive) return;
  if (currentMode === 'multiple' && hasAnsweredCurrent && e.key === 'Enter') {
    e.preventDefault();
    nextQuizQuestion();
  }
});

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
  wrongSummary = [];
  inRedoPhase = false;
  inSummary = false;
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
  if (inSummary && !quizActive) {
    closeSummaryAndRestore();
    return;
  }

  if (!quizActive) return;
  if (confirm('End quiz now?')) {
    finishQuiz();
  }
});
