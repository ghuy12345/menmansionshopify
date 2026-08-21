(function () {
  if (window.__mmWiderrufInit) return;
  window.__mmWiderrufInit = true;

  function fix(el) {
    // text-decoration:none setzt die App bereits selbst inline - passt zum Sibling-Link
    // (der ebenfalls kein Underline im Ruhezustand hat), nur color muss korrigiert werden.
    el.style.setProperty('color', 'rgba(250, 250, 248, 0.75)');
  }

  function scan() {
    document.querySelectorAll('a[href="/apps/widerruf"]').forEach(fix);
  }

  function start() {
    scan();
    var footer = document.querySelector('footer') || document.body;
    var observer = new MutationObserver(scan);
    observer.observe(footer, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
