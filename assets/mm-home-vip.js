(function () {
  if (window.__mmVipInit) return;
  window.__mmVipInit = true;

  function applyPlaceholder() {
    var input = document.querySelector('.klaviyo-form-TRCGwb .klaviyo-emailinput input');
    if (input && input.placeholder !== 'deine@email.de') {
      input.placeholder = 'deine@email.de';
    }
  }

  function start() {
    applyPlaceholder();
    var observer = new MutationObserver(applyPlaceholder);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
