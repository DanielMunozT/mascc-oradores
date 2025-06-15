const assert = require('assert');
const translations = require('./translations');

const languages = Object.values(translations);
const baseKeys = Object.keys(languages[0]).sort();

for (const lang of languages) {
  const keys = Object.keys(lang).sort();
  assert.deepStrictEqual(keys, baseKeys, 'All language objects should share the same keys');
}

console.log('All translation keys match.');
