# MASCC Oradores

This scheduler uses the **MAWC** brand name for the English interface and **MASCC** for the Portuguese and Spanish versions.

## Country Codes

Each speaker entry in `speakers.json` includes a `normalizedCountryCode`—a two-letter [ISO&nbsp;3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) code used to display the corresponding flag and identify the speaker's country. The former `countryCode` field has been removed, so new speakers should provide only `normalizedCountryCode`.

## Running Tests

Install Node.js (v18 or later). Then run:

```bash
npm test
```

This executes `translations.test.js`, which verifies that all language objects in `translations.js` share the same set of keys.
