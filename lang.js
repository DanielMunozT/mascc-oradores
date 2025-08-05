let langParam = new URLSearchParams(window.location.search).get('lang');
let browserLang = (navigator.language || 'en').slice(0,2).toLowerCase();
const LANG = ['en','es','pt'].includes((langParam || browserLang)) ? (langParam || browserLang) : 'en';
const T = {};

for (const [key, value] of Object.entries(translations[LANG] || translations['en'])) {
  T[key] = value;
}

function changeLang(lang) {
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

window.addEventListener('DOMContentLoaded', renderLanguageSelector);

// expose globals
window.LANG = LANG;
window.T = T;
window.changeLang = changeLang;
