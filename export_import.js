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
