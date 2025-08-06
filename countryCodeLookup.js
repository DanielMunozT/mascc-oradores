import countries from 'https://cdn.jsdelivr.net/npm/i18n-iso-countries/index.js';

const supportedLangs = (window.SUPPORTED_LANGS || ['en', 'es', 'pt']).map(l => l.toLowerCase());

for (const lang of supportedLangs) {
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/i18n-iso-countries/langs/${lang}.json`);
    if (res.ok) {
      const locale = await res.json();
      countries.registerLocale(locale);
    }
  } catch (e) {
    // ignore registration errors
  }
}

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildCountryMap() {
  const map = {};
  const codes = countries.getAlpha2Codes();
  for (const code of Object.keys(codes)) {
    const names = new Set();
    for (const lang of supportedLangs) {
      const name = countries.getName(code, lang);
      if (name) names.add(name);
    }
    for (const name of names) {
      map[normalize(name)] = code;
    }
  }
  return map;
}

const countryMap = Object.freeze(buildCountryMap());

export function getCountryCode(inputName) {
  return countryMap[normalize(inputName)] || null;
}
