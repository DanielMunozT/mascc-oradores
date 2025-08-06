const supportedLangs = ((typeof window !== 'undefined' && window.SUPPORTED_LANGS) || ['en', 'es', 'pt']).map(l => l.toLowerCase());

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildCountryMap() {
  const map = {};
  const displayNames = {};
  for (const lang of supportedLangs) {
    try {
      displayNames[lang] = new Intl.DisplayNames([lang], { type: 'region' });
    } catch (e) {
      // ignore languages not supported by Intl.DisplayNames
    }
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
      const code = letters[i] + letters[j];
      for (const lang of Object.keys(displayNames)) {
        const name = displayNames[lang].of(code);
        if (name && name.toUpperCase() !== code) {
          map[normalize(name)] = code;
        }
      }
    }
  }
  return map;
}

const countryMap = Object.freeze(buildCountryMap());

export function getCountryCode(inputName) {
  return countryMap[normalize(inputName)] || null;
}

