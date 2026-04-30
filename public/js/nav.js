(() => {
  var THEME_KEY = 'qa-workbench-theme';

  function effectiveFromPref(pref) {
    if (pref === 'light' || pref === 'dark') {
      return pref;
    }
    try {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (e) {}
    return 'dark';
  }

  function getPref() {
    try {
      var s = localStorage.getItem(THEME_KEY);
      if (s === 'light' || s === 'dark' || s === 'system') {
        return s;
      }
    } catch (e) {}
    return 'system';
  }

  function setPref(pref) {
    try {
      localStorage.setItem(THEME_KEY, pref);
    } catch (e) {}
    document.documentElement.setAttribute('data-theme-pref', pref);
    document.documentElement.setAttribute(
      'data-theme',
      effectiveFromPref(pref === 'system' ? null : pref),
    );
    updateThemeButtons();
  }

  var mqListener = null;

  function bindSystemListener() {
    if (mqListener) {
      return;
    }
    try {
      mqListener = window.matchMedia('(prefers-color-scheme: light)');
      mqListener.addEventListener('change', function () {
        if (getPref() === 'system') {
          document.documentElement.setAttribute(
            'data-theme',
            effectiveFromPref(null),
          );
          updateThemeButtons();
        }
      });
    } catch (e) {}
  }

  var themeGroup = null;

  function updateThemeButtons() {
    if (!themeGroup) {
      return;
    }
    var pref = getPref();
    themeGroup.querySelectorAll('[data-theme-pref]').forEach(function (btn) {
      var p = btn.getAttribute('data-theme-pref');
      var isActive = p === pref;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.classList.toggle('theme-btn-active', isActive);
    });
  }

  var links = [
    { href: '/', label: 'Home' },
    { href: '/generator', label: 'Suite generator' },
    { href: '/agent', label: 'QA Copilot' },
    { href: '/workflows', label: 'Workflows' },
    { href: '/history', label: 'Suite history' },
  ];
  var cur = window.location.pathname.replace(/\/$/, '') || '/';
  var bar = document.createElement('nav');
  bar.className = 'app-nav';
  bar.setAttribute('aria-label', 'Primary');
  var inner = document.createElement('div');
  inner.className = 'app-nav-inner';
  var brand = document.createElement('a');
  brand.className = 'app-nav-brand';
  brand.href = '/';
  brand.textContent = 'QA Workbench';
  inner.appendChild(brand);
  links.forEach(function (item) {
    var a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    var normalized = item.href === '/' ? '/' : item.href.replace(/\/$/, '');
    if (cur === normalized) {
      a.className = 'app-nav-link active';
    } else {
      a.className = 'app-nav-link';
    }
    inner.appendChild(a);
  });

  themeGroup = document.createElement('div');
  themeGroup.className = 'theme-switcher';
  themeGroup.setAttribute('role', 'group');
  themeGroup.setAttribute('aria-label', 'Color theme');
  [['system', 'Auto'], ['dark', 'Dark'], ['light', 'Light']].forEach(function (pair) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-btn';
    b.setAttribute('data-theme-pref', pair[0]);
    b.textContent = pair[1];
    b.addEventListener('click', function () {
      setPref(pair[0]);
      bindSystemListener();
    });
    themeGroup.appendChild(b);
  });
  inner.appendChild(themeGroup);

  bar.appendChild(inner);
  var host = document.querySelector('.page-wrap') || document.body;
  host.insertBefore(bar, host.firstChild);

  document.documentElement.setAttribute('data-theme-pref', getPref());
  document.documentElement.setAttribute(
    'data-theme',
    effectiveFromPref(getPref() === 'system' ? null : getPref()),
  );
  updateThemeButtons();
  bindSystemListener();
})();
