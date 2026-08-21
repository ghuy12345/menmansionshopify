(function () {
  if (window.__mmpCollectionInit) return;
  window.__mmpCollectionInit = true;

  var FREE_SHIPPING = 55; // € — reale, etablierte Versandkostenfrei-Schwelle
  var grid = document.querySelector('[data-mmp-grid]');
  var chips = document.querySelectorAll('.mmp-chip');
  var sortEl = document.querySelector('[data-mmp-sort]');
  var countEl = document.querySelector('[data-mmp-count]');

  function num(el, attr) { return parseFloat(el.getAttribute(attr) || '0'); }
  function eur(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.mm-bs-card'));
    var order = cards.slice();
    var state = { filter: 'alle', sort: 'empfohlen' };

    function apply() {
      var list = order.slice();
      if (state.sort === 'beliebt') list.sort(function (a, b) { return num(b, 'data-pop') - num(a, 'data-pop'); });
      if (state.sort === 'preis-auf') list.sort(function (a, b) { return num(a, 'data-price') - num(b, 'data-price'); });
      if (state.sort === 'preis-ab') list.sort(function (a, b) { return num(b, 'data-price') - num(a, 'data-price'); });

      var visible = 0;
      list.forEach(function (card) {
        var show = state.filter === 'alle' || card.getAttribute('data-cat') === state.filter;
        card.hidden = !show;
        if (show) visible++;
        grid.appendChild(card);
      });
      if (countEl) countEl.textContent = visible + (visible === 1 ? ' Produkt' : ' Produkte');
    }

    function setFilter(value) {
      state.filter = value;
      chips.forEach(function (c) {
        var on = c.getAttribute('data-filter') === value;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () { setFilter(c.getAttribute('data-filter')); });
    });
    document.querySelectorAll('.mmp-guide__item').forEach(function (b) {
      b.addEventListener('click', function () {
        setFilter(b.getAttribute('data-filter'));
        window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 120, behavior: 'smooth' });
      });
    });
    if (sortEl) sortEl.addEventListener('change', function () { state.sort = sortEl.value; apply(); });

    apply();
  }

  /* --- Sticky Warenkorb-Leiste aus dem echten Shopify-Cart --- */
  var bar = document.querySelector('[data-mmp-sticky]');
  function renderCart(cart) {
    if (!bar) return;
    var total = (cart.total_price || 0) / 100;
    var count = cart.item_count || 0;
    bar.hidden = count === 0;
    var missing = Math.max(0, FREE_SHIPPING - total);
    var fill = bar.querySelector('[data-mmp-fill]');
    var ship = bar.querySelector('[data-mmp-ship]');
    var totalEl = bar.querySelector('[data-mmp-total]');
    if (fill) fill.style.width = Math.min(100, (total / FREE_SHIPPING) * 100).toFixed(0) + '%';
    if (ship) ship.textContent = missing > 0 ? 'Noch ' + eur(missing) + ' bis Gratisversand' : 'Gratisversand freigeschaltet';
    if (totalEl) totalEl.textContent = eur(total) + ' · ' + count + (count === 1 ? ' Artikel' : ' Artikel');
  }
  function refreshCart() {
    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(renderCart)
      .catch(function () {});
  }
  refreshCart();

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, refreshCart);
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('.mm-bs-cta')) setTimeout(refreshCart, 700);
  });
})();
