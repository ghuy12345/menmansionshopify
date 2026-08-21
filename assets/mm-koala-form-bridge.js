/*
 * MEN MANSION - Bruecke zwischen Koala-Widget und Produktformular
 *
 * Problem: Koala schreibt beim Klick auf eine Stufe hidden inputs in das
 * Produktformular (quantity, properties[__koala_deal_id],
 * properties[__koala_contract_id] und Gratisartikel als items[n][...]) und
 * faengt den Submit ab. Das passiert nur, wenn das Widget im Formular liegt.
 *
 * Auf manchen PDPs platziert die App das Widget ausserhalb des Formulars
 * (nachgewiesen bei Sea Texture Spray: Elternkette div.mm-pdp-price-row statt
 * form.form). Dann bleibt quantity auf 1 und aus dem 3er-Bundle wird ein
 * einzelnes Stueck im Warenkorb - bei Tallow lag der Unterschied genau hier.
 *
 * Diese Datei aendert NICHTS am DOM des Widgets. Ein Umzug des Custom Elements
 * wuerde die Bindung der App an die gewaehlte Stufe zerstoeren (siehe den
 * Kommentar in sections/main-product.liquid). Stattdessen werden nur die
 * fehlenden hidden inputs im Formular gespiegelt.
 *
 * Sicherung gegen Doppelarbeit: Liegt das Widget im Formular, macht die Datei
 * garantiert nichts - dort erledigt die App das selbst.
 */
(function () {
  'use strict';

  var PREFIX = 'mm-kfb-';               // Marker an den selbst gesetzten Feldern
  var widget, form, active = false;

  function findWidget() {
    return document.querySelector('koala-quantity-breaks-embed, .koala-deal');
  }

  function findForm() {
    var atc = document.querySelector('button[name="add"], .product-form__submit');
    return atc ? atc.closest('form') : null;
  }

  // Menge einer Stufe: Koala schreibt sie nicht ins Markup, aber Gesamtpreis
  // geteilt durch Stueckpreis ergibt sie exakt (27,90 / 50,22 / 66,96 -> 1/2/3).
  function money(el) {
    if (!el) return null;
    var t = String(el.textContent).replace(/\s| /g, '');
    var m = t.match(/(\d+(?:\.\d{3})*(?:,\d{1,2})?)(?!.*\d)/);
    if (!m) return null;
    var v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  }

  function quantityOf(tier) {
    var total = money(tier.querySelector('.koala-deal__tier__price'));
    var each = money(tier.querySelector('.koala-deal__tier__per-item-price'));
    if (total && each && each > 0) {
      var q = Math.round(total / each);
      if (q >= 1 && q <= 50) return q;
    }
    // Ersatzweg: Streichpreis geteilt durch Stueckpreis der ersten Stufe
    var regular = money(tier.querySelector('.koala-deal__tier__regular-price'));
    var first = document.querySelector('.koala-deal__tier .koala-deal__tier__price');
    var base = money(first);
    if (regular && base && base > 0) {
      var q2 = Math.round(regular / base);
      if (q2 >= 1 && q2 <= 50) return q2;
    }
    // Letzter Ausweg: Zahl im Titel ("3x Tallow", "3er Pack")
    var title = tier.querySelector('.koala-deal__tier__title');
    var tm = title && String(title.textContent).match(/(\d+)\s*(?:x|er\b|stk|stück)/i);
    return tm ? parseInt(tm[1], 10) : 1;
  }

  function selectedTier() {
    var input = document.querySelector('.koala-deal__tier__input:checked');
    if (input && input.nextElementSibling &&
        input.nextElementSibling.classList.contains('koala-deal__tier')) {
      return input.nextElementSibling;
    }
    return null;
  }

  // Bestehende Felder werden gesetzt, nicht dupliziert: zwei quantity-Felder im
  // selben Formular waeren davon abhaengig, welches zuletzt im DOM steht.
  var touched = [];

  function setField(name, value) {
    var existing = form.querySelector('[name="' + name + '"]:not([data-' + PREFIX + 'field])');
    if (existing) {
      if (!existing.hasAttribute('data-' + PREFIX + 'orig')) {
        existing.setAttribute('data-' + PREFIX + 'orig', existing.value);
        touched.push(existing);
      }
      existing.value = value;
      return;
    }
    var el = form.querySelector('input[data-' + PREFIX + 'field="' + name + '"]');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.setAttribute('data-' + PREFIX + 'field', name);
      form.appendChild(el);
    }
    el.name = name;
    el.value = value;
  }

  function clearOwnFields() {
    var own = form.querySelectorAll('[data-' + PREFIX + 'field]');
    for (var i = 0; i < own.length; i++) own[i].parentNode.removeChild(own[i]);
    // Fremde Felder auf ihren Ausgangswert zuruecksetzen
    for (var j = 0; j < touched.length; j++) {
      var t = touched[j];
      t.value = t.getAttribute('data-' + PREFIX + 'orig');
      t.removeAttribute('data-' + PREFIX + 'orig');
    }
    touched = [];
  }

  function sync() {
    if (!active) return;
    var tier = selectedTier();
    if (!tier) return;

    // Wenn die App inzwischen selbst liefert, sofort zuruecktreten.
    if (widget.closest('form') === form) { active = false; clearOwnFields(); return; }

    var qty = quantityOf(tier);
    var dealId = widget.getAttribute('data-deal-id');
    var groups = tier.querySelector('.koala-deal__tier__variant-groups');
    var contractId = groups ? groups.getAttribute('data-contract-id') : null;

    clearOwnFields();
    setField('quantity', String(qty));
    if (dealId) setField('properties[__koala_deal_id]', dealId);
    if (contractId) setField('properties[__koala_contract_id]', contractId);
  }

  function start() {
    widget = findWidget();
    form = findForm();
    if (!widget || !form) return;

    // Der Normalfall: Widget liegt im Formular, die App macht alles selbst.
    if (widget.closest('form') === form) return;

    active = true;
    sync();

    document.addEventListener('change', function (e) {
      if (e.target && e.target.classList &&
          e.target.classList.contains('koala-deal__tier__input')) sync();
    }, true);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.koala-deal__tier')) {
        window.setTimeout(sync, 120);
      }
    }, true);

    // Die App rendert Stufen nach; Werte idempotent nachziehen.
    var obs = new MutationObserver(function () { sync(); });
    obs.observe(widget, { childList: true, subtree: true });
  }

  function boot() {
    var tries = 0;
    var iv = window.setInterval(function () {
      tries++;
      if (document.querySelector('.koala-deal__tier')) { start(); window.clearInterval(iv); }
      else if (tries > 40) window.clearInterval(iv);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
