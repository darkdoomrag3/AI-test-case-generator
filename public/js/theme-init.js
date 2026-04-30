(function () {
  var KEY = 'qa-workbench-theme';
  function effective(pref) {
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
  try {
    var stored = localStorage.getItem(KEY);
    var pref = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var theme = effective(pref === 'system' ? null : pref);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-pref', pref);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-theme-pref', 'system');
  }
})();
