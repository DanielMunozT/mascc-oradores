(function() {
  const supportedLangs = ['en', 'es', 'pt'];
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  const storedLang = localStorage.getItem('lang');
  const browserLang = (navigator.language || 'en').slice(0,2).toLowerCase();
  const initialLang = supportedLangs.includes(urlLang)
    ? urlLang
    : supportedLangs.includes(storedLang)
    ? storedLang
    : supportedLangs.includes(browserLang)
    ? browserLang
    : 'en';

  const storedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', storedTheme);

  i18next.use(i18nextHttpBackend).init({
    lng: initialLang,
    fallbackLng: 'en',
    backend: { loadPath: 'locales/{{lng}}.json' }
  }, () => {
    renderHeader();
    updateContent();
    updateLinks();
    document.dispatchEvent(new Event('i18nReady'));
  });

  window.T = new Proxy({}, {
    get: (_, prop) => i18next.t(prop)
  });

  function changeLang(lang) {
    localStorage.setItem('lang', lang);
    i18next.changeLanguage(lang, () => {
      updateContent();
      updateLinks();
    });
  }

  function changeTheme(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  function renderHeader() {
    const menuItems = [
      { href: 'speakers.html', key: 'list' },
      { href: 'availability.html', key: 'availability' },
      { href: 'teaching.html', key: 'teaching' },
      { href: 'this_week.html', key: 'this_week' },
      { href: 'next_week.html', key: 'next_week' }
    ];
    const menuLinks = menuItems.map(i => `<li><a href="${i.href}" data-i18n-key="${i.key}"></a></li>`).join('');
    const header = document.createElement('header');
    header.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <details id="nav-menu">
          <summary data-i18n-key="menu"></summary>
          <ul>${menuLinks}</ul>
        </details>
        <div>
          <label for="lang-select" data-i18n-key="language"></label>
          <select id="lang-select">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="pt">Português</option>
          </select>
          <label for="theme-select" data-i18n-key="theme"></label>
          <select id="theme-select">
            <option value="light" data-i18n-key="light"></option>
            <option value="dark" data-i18n-key="dark"></option>
          </select>
        </div>
      </div>
      <div style="text-align:center;font-weight:bold;font-size:1.5em;margin-top:0.5em;" data-i18n-key="site_title"></div>
      <div style="text-align:center;margin-top:0.25em;"><a id="doc-link" target="_blank" rel="noopener noreferrer" data-i18n-key="document_description"></a></div>
    `;
    document.body.prepend(header);
    header.querySelector('#doc-link').href = i18next.t('document_link');
    const langSelect = header.querySelector('#lang-select');
    langSelect.value = i18next.language;
    langSelect.addEventListener('change', e => changeLang(e.target.value));
    const themeSelect = header.querySelector('#theme-select');
    themeSelect.value = storedTheme;
    themeSelect.addEventListener('change', e => changeTheme(e.target.value));
  }

  function updateContent() {
    const titleEl = document.querySelector('title[data-i18n-key]');
    if (titleEl) {
      document.title = i18next.t(titleEl.getAttribute('data-i18n-key'));
    } else {
      document.title = i18next.t('title');
    }
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
      const key = el.getAttribute('data-i18n-key');
      const translation = i18next.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const attr = el.getAttribute('data-i18n-attr');
        if (attr) {
          el.setAttribute(attr, translation);
        } else {
          el.value = translation;
        }
      } else if (el.tagName === 'OPTION') {
        el.textContent = translation;
      } else {
        el.textContent = translation;
      }
    });
  }

  function updateLinks() {
    const anchors = document.querySelectorAll('a[href]');
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
        return;
      }
      const url = new URL(href, window.location.href);
      url.searchParams.set('lang', i18next.language);
      a.setAttribute('href', url.pathname + url.search + url.hash);
    });
  }

  window.changeLang = changeLang;
  window.changeTheme = changeTheme;
})();
