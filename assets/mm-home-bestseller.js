(function () {
  if (window.__mmBsInit) return;
  window.__mmBsInit = true;

  function initSliderProgress() {
    document.querySelectorAll('.mm-bs').forEach(function (section) {
      var slider = section.querySelector('.mm-bs-slider');
      var dashes = section.querySelectorAll('.mm-bs-progress-dash');
      if (!slider || !dashes.length) return;

      var cards = slider.querySelectorAll('.mm-bs-card');
      if (!cards.length) return;
      var cardWidth = cards[0].offsetWidth + 12; // gap

      function update() {
        var index = Math.round(slider.scrollLeft / cardWidth);
        index = Math.max(0, Math.min(dashes.length - 1, index));
        dashes.forEach(function (dash, i) {
          dash.classList.toggle('is-active', i === index);
        });
      }

      slider.addEventListener('scroll', function () {
        window.requestAnimationFrame(update);
      }, { passive: true });
      update();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSliderProgress();
    });
  } else {
    initSliderProgress();
  }
})();
