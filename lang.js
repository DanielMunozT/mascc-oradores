let langParam = new URLSearchParams(window.location.search).get('lang');
let storedLang = null;
try {
  storedLang = localStorage.getItem('lang');
} catch (e) {
  // ignore if localStorage is not available
}
let browserLang = (navigator.language || 'en').slice(0,2).toLowerCase();
const langCandidate = langParam || storedLang || browserLang;
const LANG = ['en','es','pt'].includes(langCandidate) ? langCandidate : 'en';
try {
  if (storedLang !== LANG) {
    localStorage.setItem('lang', LANG);
  }
} catch (e) {
  // ignore if localStorage is not available
}
const T = {};

for (const [key, value] of Object.entries(translations[LANG] || translations['en'])) {
  T[key] = value;
}

function changeLang(lang) {
  try {
    localStorage.setItem('lang', lang);
  } catch (e) {
    // ignore if localStorage is not available
  }
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  window.location.href = url.toString();
}

function renderLanguageSelector() {
  const div = document.createElement('div');
  div.style.marginBottom = '1em';
  div.innerHTML = `
    <label for="lang-select">🌐 Language: </label>
    <select id="lang-select">
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="pt">Português</option>
    </select>
  `;
  document.body.prepend(div);
  const select = div.querySelector('#lang-select');
  select.value = LANG;
  select.addEventListener('change', (e) => changeLang(e.target.value));
}

function updateLinks() {
  const anchors = document.querySelectorAll('a[href]');
  anchors.forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
      return;
    }
    const url = new URL(href, window.location.href);
    url.searchParams.set('lang', LANG);
    a.setAttribute('href', url.pathname + url.search + url.hash);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  renderLanguageSelector();
  updateLinks();
});

// expose globals
window.LANG = LANG;
window.T = T;
window.changeLang = changeLang;
