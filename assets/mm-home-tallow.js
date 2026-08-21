(function () {
  if (window.__mmTallowInit) return;
  window.__mmTallowInit = true;

  function addToCart(btn) {
    if (btn.dataset.loading === 'true') return;
    var variantId = btn.getAttribute('data-variant-id');
    btn.dataset.loading = 'true';

    var cartEl = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
    var sectionsToRender = cartEl ? cartEl.getSectionsToRender().map(function (s) { return s.id; }) : ['cart-icon-bubble'];
    if (sectionsToRender.indexOf('cart-icon-bubble') === -1) sectionsToRender.push('cart-icon-bubble');

    fetch(window.routes.cart_add_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        id: variantId,
        quantity: 1,
        sections: sectionsToRender,
        sections_url: window.location.pathname,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (response) {
        btn.dataset.loading = 'false';
        if (response.status) {
          console.error('mm-tallow add to cart error', response);
          return;
        }
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'mm-home-tallow', productVariantId: variantId, cartData: response });
        }
        if (cartEl && typeof cartEl.renderContents === 'function') {
          if (typeof cartEl.setActiveElement === 'function') cartEl.setActiveElement(document.activeElement);
          cartEl.renderContents(response);
        } else if (response.sections && response.sections['cart-icon-bubble']) {
          var bubble = document.getElementById('cart-icon-bubble');
          if (bubble) {
            var parsed = new DOMParser().parseFromString(response.sections['cart-icon-bubble'], 'text/html');
            var section = parsed.querySelector('.shopify-section');
            bubble.innerHTML = section ? section.innerHTML : response.sections['cart-icon-bubble'];
          }
        }
        document.querySelectorAll('.mm-tallow-cta[data-variant-id="' + variantId + '"]').forEach(function (el) {
          var label = el.textContent;
          el.textContent = 'Hinzugefügt ✓';
          el.classList.add('is-added');
          setTimeout(function () {
            el.textContent = label;
            el.classList.remove('is-added');
          }, 2200);
        });
      })
      .catch(function (err) {
        btn.dataset.loading = 'false';
        console.error('mm-tallow add to cart failed', err);
      });
  }

  function init() {
    document.querySelectorAll('.mm-tallow-cta[data-variant-id]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        addToCart(btn);
      });
    });

    var primaryCta = document.querySelector('.mm-tallow-cta[data-variant-id]');
    var sticky = document.querySelector('.mm-tallow-sticky');
    if (!primaryCta || !sticky) return;

    var ticking = false;
    function updateStickyVisibility() {
      ticking = false;
      var rect = primaryCta.getBoundingClientRect();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
