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

function renderHeader() {
  const header = document.createElement('header');
  header.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <a href="index.html">${T.home}</a>
      <div>
        <label for="lang-select">🌐 Language: </label>
        <select id="lang-select">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="pt">Português</option>
        </select>
      </div>
    </div>
    <div style="text-align:center;font-weight:bold;font-size:1.5em;margin-top:0.5em;">${T.site_title}</div>
    <div style="text-align:center;margin-top:0.25em;"><a href="${T.document_link}" target="_blank" rel="noopener noreferrer">${T.document_description}</a></div>
  `;
  header.style.marginBottom = '1em';
  document.body.prepend(header);
  const select = header.querySelector('#lang-select');
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
  renderHeader();
  updateLinks();
});

// expose globals
window.LANG = LANG;
window.T = T;
window.changeLang = changeLang;
