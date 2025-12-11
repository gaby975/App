// -------- Theme and voice --------

const THEME_KEY = 'vocab_theme';
const VOICE_GENDER_KEY = 'vocab_voice_gender';

let availableUkVoices = [];
let currentVoiceGender = localStorage.getItem(VOICE_GENDER_KEY) || 'female';

function updateVoiceToggleLabel() {
  const btn = document.getElementById('voice-toggle');
  if (!btn) return;
  // same logic as before
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
    const re = new RegExp(`\\b${word}\\b`);

    const match = googleUk.find(v => re.test(v.name.toLowerCase())) || googleUk[0];

    console.log('Chosen voice:', gender, match && match.name);

    return match;
  }

  const anyUk = voices.filter(v => v.lang === 'en-GB');
  if (anyUk.length) return anyUk[0];

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

// Initialise theme from storage or system preference
const systemPrefersDark =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const savedTheme =
  localStorage.getItem(THEME_KEY) || (systemPrefersDark ? 'dark' : 'light');

applyTheme(savedTheme);

// Wire theme toggle button
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = document.body.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

// Wire voice toggle button
const voiceToggleBtn = document.getElementById('voice-toggle');
if (voiceToggleBtn) {
  voiceToggleBtn.addEventListener('click', () => {
    currentVoiceGender = currentVoiceGender === 'female' ? 'male' : 'female';
    localStorage.setItem(VOICE_GENDER_KEY, currentVoiceGender);
    updateVoiceToggleLabel();
  });

  // Make sure the label matches the stored gender on load
  updateVoiceToggleLabel();
}
