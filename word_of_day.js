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
