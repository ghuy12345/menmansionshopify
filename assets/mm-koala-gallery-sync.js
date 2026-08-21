/*
 * Men Mansion — Koala Deal -> Produktgalerie-Sync
 * Verknuepft die Koala-Offer-Auswahl mit der PDP-Galerie.
 *
 * Zuordnung: feste Bildposition je Offer (Offer-Nr. von oben, 1-basiert):
 *   - Offer 1 (oben)  -> Bild 1
 *   - Offer 2 (mitte) -> Bild 5
 *   - Offer 3 (unten) -> Bild 10
 *   - uebrige Offers  -> Bild 1
 *
 * Verhalten:
 *   - Klick auf ein Offer schaltet die Galerie um (Hin- und Herspringen moeglich).
 *   - Beim Laden der PDP wird das VORAUSGEWAEHLTE Offer erkannt und dessen Bild direkt gezeigt
 *     (Koala waehlt standardmaessig das mittlere Offer -> vorletztes Bild). Laeuft nur einmal
 *     und bricht ab, sobald der Nutzer selbst klickt.
 *
 * Bild-Spec: negativ = von hinten (-1 letztes, -2 vorletztes), positiv = feste Position von vorne (1-basiert).
 */
(function () {
  'use strict';

  // Feste Bildposition je Offer-Nr. (1 = oberstes Offer). Bild-Spec = 1-basierte Position von vorne.
  var OFFER_IMAGE_MAP = { 2: 5, 3: 10 }; // Offer 2 -> Bild 5, Offer 3 -> Bild 10
  var DEFAULT_SPEC = 1;                   // uebrige Offers (z. B. Offer 1) -> Bild 1
  function specForTier(idx, total) {
    var offerNo = idx + 1; // 1-basiert von oben
    return Object.prototype.hasOwnProperty.call(OFFER_IMAGE_MAP, offerNo) ? OFFER_IMAGE_MAP[offerNo] : DEFAULT_SPEC;
  }

  // Alle Offer-Tiers desselben Koala-Widgets in DOM-Reihenfolge.
  function getTiersFor(tier) {
    var node = tier.parentElement;
    while (node && node.querySelectorAll('.koala-deal__tier').length <= 1) {
      node = node.parentElement;
    }
    return Array.prototype.slice.call((node || document).querySelectorAll('.koala-deal__tier'));
  }

  // Aktuell ausgewaehltes Offer ermitteln (checked-Radio, dann Klassen/ARIA).
  function getSelectedTier(tiers) {
    var i, k;
    for (i = 0; i < tiers.length; i++) {
      var f = tiers[i].getAttribute('for');
      if (f) { var inp = document.getElementById(f); if (inp && inp.checked) return tiers[i]; }
    }
    for (i = 0; i < tiers.length; i++) {
      var cl = tiers[i].classList;
      for (k = 0; k < cl.length; k++) {
        var t = cl[k].toLowerCase();
        if (t.indexOf('selected') > -1 || t.indexOf('active') > -1 || t.indexOf('current') > -1) return tiers[i];
      }
      if (tiers[i].getAttribute('aria-checked') === 'true' ||
          tiers[i].getAttribute('aria-current') === 'true' ||
          tiers[i].getAttribute('data-selected') === 'true') return tiers[i];
    }
    return null;
  }

  // Galerie-Bilder in visueller Reihenfolge (Thumbnails, dedupliziert) als data-target-Liste.
  function getOrderedTargets() {
    var nodes = document.querySelectorAll('.thumbnail-list__item[data-target]');
    if (!nodes.length) nodes = document.querySelectorAll('[data-media-position][data-target]');
    var seen = {}, list = [];
    Array.prototype.forEach.call(nodes, function (n) {
      var t = n.getAttribute('data-target');
      if (t && !seen[t]) { seen[t] = 1; list.push(t); }
    });
    return list;
  }

  // Bild-Spec (positiv/negativ) -> konkretes data-target.
  function resolveTarget(spec) {
    var list = getOrderedTargets();
    if (!list.length) return null;
    var idx = spec < 0 ? list.length + spec : spec - 1;
    if (idx < 0 || idx >= list.length) return null;
    return list[idx];
  }

  function esc(v) {
    return (window.CSS && CSS.escape) ? CSS.escape(v) : v.replace(/["\\]/g, '\\$&');
  }

  function switchGalleryTo(spec) {
    var target = resolveTarget(spec);
    if (!target) return false;

    var gallery = document.querySelector('media-gallery');
    if (gallery && typeof gallery.setActiveMedia === 'function') {
      // Dawns setActiveMedia scrollt die Seite zum Bild, wenn die Galerie ueber
      // dem Viewport liegt (assets/media-gallery.js: "Don't scroll if the image
      // is already in view"). Beim Umschalten der Bundle-Stufe sass der Nutzer
      // unten am Widget und wurde dadurch nach oben zum Bild geworfen.
      // window.scrollTo wird deshalb kurz stillgelegt - der Scroll der Galerie
      // selbst laeuft ueber element.scrollTo und bleibt davon unberuehrt.
      var orig = window.scrollTo;
      window.scrollTo = function () {};
      try {
        gallery.setActiveMedia(target, false);
      } finally {
        window.setTimeout(function () { window.scrollTo = orig; }, 400);
      }
      return true;
    }
    var btn = document.querySelector('.thumbnail-list__item[data-target="' + esc(target) + '"] button')
           || document.querySelector('[data-target="' + esc(target) + '"] button');
    if (btn) { btn.click(); return true; }
    return false;
  }

  var userInteracted = false;

  document.addEventListener(
    'click',
    function (e) {
      var el = e.target;
      if (!el || !el.closest) return;

      // Nutzer-Interaktion merken -> Initial-Sync nicht mehr ueberschreiben lassen.
      if (el.closest('.thumbnail-list__item') || el.closest('media-gallery') || el.closest('.koala-deal__tier')) {
        userInteracted = true;
      }

      var tier = el.closest('.koala-deal__tier');
      if (!tier) return;
      if (el.closest('a[href]')) return; // echte Links (Geschenk-Links) nicht abfangen

      var tiers = getTiersFor(tier);
      var idx = tiers.indexOf(tier);
      if (idx === -1 || tiers.length < 2) return;

      var spec = specForTier(idx, tiers.length);
      window.setTimeout(function () {
        if (!switchGalleryTo(spec)) {
          window.setTimeout(function () { switchGalleryTo(spec); }, 250);
        }
      }, 50);
    },
    true // Capture: faengt auch Klicks auf dynamisch von Koala injizierte Tiers.
  );

  // Initial-Sync beim Laden: vorausgewaehltes Offer -> passendes Bild.
  function runInitialSync() {
    var done = false, ticksWithTiers = 0, attempts = 0, MAX = 40;

    function attempt() {
      if (done || userInteracted) return true;
      attempts++;
      var any = document.querySelector('.koala-deal__tier');
      if (any) {
        var tiers = getTiersFor(any);
        if (tiers.length >= 2) {
          var sel = getSelectedTier(tiers);
          if (sel) {
            switchGalleryTo(specForTier(tiers.indexOf(sel), tiers.length));
            return (done = true);
          }
          ticksWithTiers++;
          // Tiers da, aber Selektion (noch) nicht auslesbar -> Fallback: mittleres/vorletztes Offer.
          if (ticksWithTiers >= 4) {
            switchGalleryTo(specForTier(tiers.length - 2, tiers.length));
            return (done = true);
          }
        }
      }
      return attempts >= MAX;
    }

    if (attempt()) return;
    var iv = setInterval(function () { if (attempt()) clearInterval(iv); }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitialSync);
  } else {
    runInitialSync();
  }
})();
