/*
 * MEN MANSION — PDP "Clear Skin Set" Interaktionen.
 * Rein visuelle Erweiterungen, greift NICHT in product-form.js / price-per-item.js /
 * die native Warenkorb-Logik ein — Tier-Karten setzen nur den vorhandenen Quantity-Input
 * und feuern ein "change"-Event, den Rest (Preis, Cart) übernimmt Shopify nativ.
 */
(function () {
  function initGalleryIntro() {
    // Nur das Hauptbild (erste aktive Slide), nicht die Thumbnail-/Variantenbilder.
    var mainSlide = document.querySelector('.product__media-item.is-active');
    if (!mainSlide || mainSlide.querySelector('[data-mm-gallery-intro]')) return;

    var overlay = document.createElement('div');
    overlay.className = 'mm-pdp-gallery-intro';
    overlay.setAttribute('data-mm-gallery-intro', '');
    overlay.innerHTML = '<span>MEN&nbsp;MANSION</span>';
    mainSlide.appendChild(overlay);

    setTimeout(function () { overlay.classList.add('is-showing'); }, 80);
    setTimeout(function () { overlay.classList.remove('is-showing'); overlay.classList.add('is-out'); }, 2000);
    setTimeout(function () { overlay.classList.add('is-done'); }, 2900);
  }

  // Manche Inhaltsstoffe-Bilder haben (anders als z.B. Tallow) keinen echten
  // transparenten Hintergrund, sondern einen fest eingebrannten, aber flachen
  // Einzelfarbton (Fotostudio-Hintergrund). Per Canvas erkennen (gleiche Farbe
  // in allen 4 Ecken) und nur DANN in Transparenz umwandeln, sonst Bild
  // unveraendert lassen (z.B. wenn schon transparent oder kein flacher Rand).
  function initIngredientImageKeying() {
    document.querySelectorAll('.mm-pdp-ingredient-img').forEach(function (imgEl) {
      var loader = new Image();
      loader.crossOrigin = 'anonymous';
      loader.onload = function () {
        try {
          var w = loader.naturalWidth, h = loader.naturalHeight;
          if (!w || !h) return;
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(loader, 0, 0);
          var imgData = ctx.getImageData(0, 0, w, h);
          var d = imgData.data;
          function px(x, y) { var i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }
          var corners = [px(1, 1), px(w - 2, 1), px(1, h - 2), px(w - 2, h - 2)];
          var ref = corners[0];
          var isUniform = ref[3] > 200 && corners.every(function (c) {
            return Math.abs(c[0] - ref[0]) < 6 && Math.abs(c[1] - ref[1]) < 6 && Math.abs(c[2] - ref[2]) < 6;
          });
          if (!isUniform) return; // schon transparent oder kein flacher Hintergrund

          var tol = 24;
          for (var i = 0; i < d.length; i += 4) {
            if (Math.abs(d[i] - ref[0]) < tol && Math.abs(d[i + 1] - ref[1]) < tol && Math.abs(d[i + 2] - ref[2]) < tol) {
              d[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          imgEl.src = canvas.toDataURL('image/png');
        } catch (e) {
          // CORS/Canvas-Fehler: Bild bleibt einfach wie es ist.
        }
      };
      loader.src = imgEl.currentSrc || imgEl.src;
    });
  }

  function initMoreToggle() {
    document.querySelectorAll('[data-mm-more-toggle]').forEach(function (toggle) {
      var body = document.querySelector(toggle.getAttribute('data-mm-more-toggle'));
      if (!body) return;
      toggle.addEventListener('click', function () {
        var isHidden = body.hasAttribute('hidden');
        if (isHidden) {
          body.removeAttribute('hidden');
          toggle.textContent = toggle.getAttribute('data-label-less') || 'Weniger anzeigen';
        } else {
          body.setAttribute('hidden', '');
          toggle.textContent = toggle.getAttribute('data-label-more') || 'Mehr lesen';
        }
      });
    });
  }

  function initAccordionRows() {
    document.querySelectorAll('[data-mm-accordion]').forEach(function (row) {
      var head = row.querySelector('[data-mm-accordion-toggle]');
      var body = row.querySelector('[data-mm-accordion-body]');
      var mark = row.querySelector('[data-mm-accordion-mark]');
      if (!head || !body) return;
      head.addEventListener('click', function () {
        var isHidden = body.hasAttribute('hidden');
        if (isHidden) {
          body.removeAttribute('hidden');
          if (mark) mark.textContent = '−';
        } else {
          body.setAttribute('hidden', '');
          if (mark) mark.textContent = '+';
        }
      });
    });
  }

  function initScrollLinks() {
    document.querySelectorAll('[data-mm-scroll-to]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var target = document.querySelector(trigger.getAttribute('data-mm-scroll-to'));
        if (!target) return;
        var rect = target.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + rect.top - 60, behavior: 'smooth' });
      });
    });
  }

  // Loox Admin -> Einstellungen -> API-Schluessel -> "publicStoreId" (NICHT der
  // app_key aus dem Widget-Script-Tag). Solange Platzhalter: Funktion no-opt sicher.
  var LOOX_PUBLIC_STORE_ID = 'REPLACE_WITH_REAL_LOOX_PUBLIC_STORE_ID';
  var LOOX_PAGE_LIMIT = 9;

  function initLooxReviewsGrid() {
    var grid = document.querySelector('[data-mm-reviews-grid]');
    var moreBtn = document.querySelector('[data-mm-reviews-more]');
    if (!grid) return;

    var productId = grid.getAttribute('data-product-id');
    var fallbackImage = grid.getAttribute('data-fallback-image');
    var fallbackProductName = grid.getAttribute('data-fallback-product-name') || '';

    if (!productId || !LOOX_PUBLIC_STORE_ID || LOOX_PUBLIC_STORE_ID.indexOf('REPLACE_WITH') === 0) {
      return;
    }

    var state = { page: 0, loading: false, nextPageUrl: null };

    function escapeHtml(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function starsMarkup(rating) {
      var rounded = Math.max(0, Math.min(5, Math.round(Number(rating)) || 0));
      var html = '';
      for (var i = 1; i <= 5; i++) {
        html += i <= rounded ? '★' : '<span style="color:var(--mm-graphite)">★</span>';
      }
      return html;
    }

    function renderCard(review) {
      var mediaUrl = (review.media && review.media[0] && review.media[0].url) || fallbackImage;
      var name = (review.reviewer && review.reviewer.name) || 'Kunde';
      var productName = (review.product && review.product.name) || fallbackProductName;
      var initial = escapeHtml((name.charAt(0) || 'K').toUpperCase());

      return (
        '<article class="mm-pdp-reviews-card">' +
          '<div class="mm-pdp-reviews-card-media"><img src="' + escapeHtml(mediaUrl) + '" loading="lazy" alt="' + escapeHtml(productName) + '"></div>' +
          '<div class="mm-pdp-reviews-card-body">' +
            '<div class="mm-pdp-reviews-stars">' + starsMarkup(review.rating) + '</div>' +
            '<p class="mm-pdp-reviews-card-text">' + escapeHtml(review.body) + '</p>' +
          '</div>' +
          '<div class="mm-pdp-reviews-card-footer">' +
            '<span class="mm-pdp-reviews-avatar">' + initial + '</span>' +
            '<div>' +
              '<div class="mm-pdp-reviews-card-name">' + escapeHtml(name) + '</div>' +
              '<div class="mm-pdp-reviews-card-product">' + escapeHtml(productName) + '</div>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }

    function hasMorePages(pagination, loadedCount) {
      if (!pagination) return false;
      if (typeof pagination.hasMore === 'boolean') return pagination.hasMore;
      if (typeof pagination.hasNextPage === 'boolean') return pagination.hasNextPage;
      if (typeof pagination.has_more === 'boolean') return pagination.has_more;
      var total = pagination.total != null ? pagination.total : pagination.total_count;
      if (typeof total === 'number') return loadedCount < total;
      return false;
    }

    function setButtonLoading(isLoading) {
      if (!moreBtn) return;
      moreBtn.disabled = isLoading;
      moreBtn.textContent = isLoading ? 'Lädt…' : 'Mehr Bewertungen';
    }

    function loadPage(page) {
      if (state.loading) return;
      state.loading = true;
      if (page > 1) setButtonLoading(true);

      // Ab Seite 2 die von Loox selbst gelieferte nextPageUrl verwenden (enthaelt
      // bereits alle noetigen Query-Parameter), statt die URL selbst zu bauen.
      var url = state.nextPageUrl
        ? 'https://storefront-api.loox.io' + state.nextPageUrl
        : 'https://storefront-api.loox.io/storefront/v1/store/' + encodeURIComponent(LOOX_PUBLIC_STORE_ID) +
          '/product-reviews?product_id=' + encodeURIComponent(productId) +
          '&page=' + page + '&limit=' + LOOX_PAGE_LIMIT + '&sort=featured';

      fetch(url)
        .then(function (res) { if (!res.ok) throw new Error('Loox API ' + res.status); return res.json(); })
        .then(function (data) {
          state.loading = false;
          var reviews = (data && data.reviews) || [];
          if (!reviews.length) {
            if (moreBtn) moreBtn.setAttribute('hidden', '');
            return;
          }
          grid.insertAdjacentHTML('beforeend', reviews.map(renderCard).join(''));
          state.page = page;

          var pagination = data && data.pagination;
          var loadedCount = grid.querySelectorAll('.mm-pdp-reviews-card').length;
          state.nextPageUrl = (pagination && pagination.nextPageUrl) || null;

          if (moreBtn) {
            if (hasMorePages(pagination, loadedCount)) {
              moreBtn.removeAttribute('hidden');
              setButtonLoading(false);
            } else {
              moreBtn.setAttribute('hidden', '');
            }
          }
        })
        .catch(function (err) {
          state.loading = false;
          console.warn('[mm-pdp] Loox reviews fetch failed:', err);
          if (page > 1 && moreBtn) setButtonLoading(false);
        });
    }

    if (moreBtn) {
      moreBtn.addEventListener('click', function () { loadPage(state.page + 1); });
    }

    loadPage(1);
  }

  function initQuantityTiers() {
    var group = document.querySelector('[data-mm-tier-group]');
    if (!group) return;
    var sectionId = group.getAttribute('data-section-id');
    var input = document.getElementById('Quantity-' + sectionId);
    if (!input) return;

    group.querySelectorAll('[data-mm-tier]').forEach(function (tier) {
      tier.addEventListener('click', function () {
        group.querySelectorAll('[data-mm-tier]').forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
        tier.setAttribute('aria-pressed', 'true');

        var qty = parseInt(tier.getAttribute('data-quantity'), 10);
        if (!qty || qty === input.valueAsNumber) return;
        input.value = qty;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function initKoalaReposition() {
    var priceLine = document.querySelector('.mm-pdp-price-line');
    if (!priceLine) return;
    var moved = false;

    function moveKoala() {
      if (moved) return;
      var koala = document.querySelector('koala-quantity-breaks-embed, .koala-deal');
      if (!koala) return;
      priceLine.parentNode.insertBefore(koala, priceLine.nextSibling);
      moved = true;
      observer.disconnect();
    }

    var observer = new MutationObserver(moveKoala);
    observer.observe(document.body, { childList: true, subtree: true });
    moveKoala();
    setTimeout(function () { observer.disconnect(); }, 8000);
  }

  function initPriceInButton() {
    var priceEl = document.querySelector('.mm-pdp-price-total');
    var btn = document.querySelector('product-form .product-form__submit, .product-form__submit.button--primary');
    if (!priceEl || !btn) return;
    var price = priceEl.textContent.trim();
    var span = btn.querySelector('span');
    var target = span || btn;
    if (target.dataset.mmPriceAdded) return;
    target.textContent = target.textContent.trim() + ' — ' + price;
    target.dataset.mmPriceAdded = 'true';
  }

  function initBeforeAfterSliders() {
    document.querySelectorAll('[data-mm-ba]').forEach(function (el) {
      var before = el.querySelector('[data-mm-ba-before]');
      var handle = el.querySelector('[data-mm-ba-handle]');
      var dragging = false;

      function setPosition(clientX) {
        var rect = el.getBoundingClientRect();
        var pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
        handle.style.left = pct + '%';
      }

      handle.addEventListener('pointerdown', function (e) {
        dragging = true;
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
        setPosition(e.clientX);
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        e.preventDefault();
        setPosition(e.clientX);
      }, { passive: false });
      window.addEventListener('pointerup', function () { dragging = false; });
      window.addEventListener('pointercancel', function () { dragging = false; });
    });
  }

  function initStudieCountup() {
    var nums = document.querySelectorAll('.mm-pdp-studie-number');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.dataset.mmCounted) return;
        el.dataset.mmCounted = 'true';
        var match = el.textContent.trim().match(/^(\d+)(.*)$/);
        if (!match) return;
        var target = parseInt(match[1], 10);
        var suffix = match[2];
        var duration = 1000;
        var start = null;
        function step(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          el.textContent = Math.round(progress * target) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { observer.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGalleryIntro();
    initIngredientImageKeying();
    initBeforeAfterSliders();
    initMoreToggle();
    initAccordionRows();
    initScrollLinks();
    initQuantityTiers();
    initLooxReviewsGrid();
    initKoalaReposition();
    initPriceInButton();
    initStudieCountup();
  });
})();
