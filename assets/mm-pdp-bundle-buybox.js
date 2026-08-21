(function () {
  function fmt(n) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function initBundleBuybox() {
    var root = document.querySelector('[data-mm-bb]');
    var staticBar = document.querySelector('[data-mm-bb-static]');
    var sticky = document.querySelector('[data-mm-bb-sticky]');
    if (!root || !staticBar || !sticky) return;

    var tiers = Array.prototype.slice.call(root.querySelectorAll('[data-mm-bb-tier]'));

    var bars = [
      {
        total: staticBar.querySelector('[data-mm-bb-static-total]'),
        compare: staticBar.querySelector('[data-mm-bb-static-compare]'),
        save: staticBar.querySelector('[data-mm-bb-static-save]'),
        cta: staticBar.querySelector('[data-mm-bb-static-cta]'),
      },
      {
        total: sticky.querySelector('[data-mm-bb-sticky-total]'),
        compare: sticky.querySelector('[data-mm-bb-sticky-compare]'),
        save: sticky.querySelector('[data-mm-bb-sticky-save]'),
        cta: sticky.querySelector('[data-mm-bb-cta]'),
      },
    ];

    function select(tier) {
      tiers.forEach(function (t) {
        t.setAttribute('aria-pressed', t === tier ? 'true' : 'false');
      });
      var total = parseFloat(tier.dataset.total);
      var compare = tier.dataset.compare ? parseFloat(tier.dataset.compare) : null;
      var advantage = tier.dataset.advantage ? parseFloat(tier.dataset.advantage) : null;

      bars.forEach(function (bar) {
        bar.total.textContent = fmt(total);
        if (compare) {
          bar.compare.textContent = fmt(compare);
          bar.compare.hidden = false;
        } else {
          bar.compare.hidden = true;
        }
        if (advantage) {
          bar.save.textContent = 'Du sparst ' + fmt(advantage);
          bar.save.hidden = false;
        } else {
          bar.save.hidden = true;
        }
        bar.cta.textContent = 'In den Warenkorb';
        bar.cta.dataset.tierKey = tier.dataset.tierKey;
      });
    }

    tiers.forEach(function (tier) {
      tier.addEventListener('click', function () {
        select(tier);
      });
      var toggle = tier.querySelector('[data-mm-bb-items-toggle]');
      if (toggle) {
        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          var items = tier.querySelector('[data-mm-bb-items]');
          items.classList.toggle('is-collapsed');
        });
      }
    });

    var preselected = root.querySelector('[data-mm-bb-tier][data-preselect="true"]') || tiers[0];
    if (preselected) select(preselected);

    function addToCart(cta) {
      if (cta.dataset.loading === 'true') return;
      var tierKey = cta.dataset.tierKey;
      var tier = tiers.filter(function (t) { return t.dataset.tierKey === tierKey; })[0];
      if (!tier) return;

      var items = JSON.parse(tier.dataset.items);
      var ctaButtons = bars.map(function (bar) { return bar.cta; });
      ctaButtons.forEach(function (btn) {
        btn.dataset.loading = 'true';
        btn.classList.add('is-loading');
      });
      var originalTexts = ctaButtons.map(function (btn) { return btn.textContent; });

      var cartEl = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
      var sectionsToRender = cartEl ? cartEl.getSectionsToRender().map(function (s) { return s.id; }) : ['cart-icon-bubble'];
      if (sectionsToRender.indexOf('cart-icon-bubble') === -1) sectionsToRender.push('cart-icon-bubble');

      fetch(window.routes ? window.routes.cart_add_url : '/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: items,
          sections: sectionsToRender,
          sections_url: window.location.pathname,
        }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          ctaButtons.forEach(function (btn, i) {
            btn.dataset.loading = 'false';
            btn.classList.remove('is-loading');
            btn.classList.add('is-added');
            btn.textContent = 'Hinzugefügt ✓';
            setTimeout(function () {
              btn.classList.remove('is-added');
              btn.textContent = originalTexts[i];
            }, 2200);
          });

          if (window.publish && window.PUB_SUB_EVENTS) {
            window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'mm-bundle-buybox', cartData: data });
          }

          if (cartEl && typeof cartEl.renderContents === 'function') {
            if (typeof cartEl.setActiveElement === 'function') cartEl.setActiveElement(document.activeElement);
            cartEl.renderContents(data);
          } else if (data && data.sections && data.sections['cart-icon-bubble']) {
            var bubble = document.getElementById('cart-icon-bubble');
            if (bubble) {
              var parsed = new DOMParser().parseFromString(data.sections['cart-icon-bubble'], 'text/html');
              var newBubble = parsed.getElementById('cart-icon-bubble');
              if (newBubble) bubble.innerHTML = newBubble.innerHTML;
            }
          }
        })
        .catch(function () {
          ctaButtons.forEach(function (btn, i) {
            btn.dataset.loading = 'false';
            btn.classList.remove('is-loading');
            btn.textContent = originalTexts[i];
          });
        });
    }

    bars.forEach(function (bar) {
      bar.cta.addEventListener('click', function (e) {
        e.preventDefault();
        addToCart(bar.cta);
      });
    });

    var trigger = document.querySelector('.mm-pdp-principle') || document.querySelector('.mm-pdp-ba') || staticBar;
    if (trigger) {
      var ticking = false;
      function updateStickyVisibility() {
        ticking = false;
        var rect = trigger.getBoundingClientRect();
        sticky.classList.toggle('is-visible', rect.top < 0);
      }
      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateStickyVisibility);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      updateStickyVisibility();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBundleBuybox);
  } else {
    initBundleBuybox();
  }
})();
