/*
 * MEN MANSION - Bundle-Boxen: zwei Ergaenzungen, die reine Darstellung sind.
 *
 *   1. "Das bekommst Du" als aufklappbare Liste im alten Design:
 *      Zeile pro Artikel mit Bild, Name und rechts der Menge bzw. dem
 *      Streichwert plus GRATIS-Badge.
 *      Klassen, Farben und Groessen sind die des alten Buybox-Designs
 *      (mm-pdp-bundle-buybox.css, Commit accc358) - nichts davon ist neu
 *      erfunden, nur auf das Koala-Markup uebertragen.
 *   2. Preiszeile ueber dem Warenkorb-Button: Gesamtpreis, Streichpreis,
 *      "Du sparst X" - die Werte kommen aus der ausgewaehlten Koala-Stufe
 *
 * Alle Werte werden aus dem Widget gelesen, nichts wird gerechnet, was die
 * App nicht selbst anzeigt:
 *   Menge      <- "3x Tallow" im Stufentitel
 *   Name       <- h1 der Seite
 *   Gratis     <- "inkl. 1 Aleppo Seife im Wert von 14,90€" der App
 *   Vorteil    <- (Streichpreis - Preis) + Summe der Gratiswerte
 *
 * An der Mechanik wird nichts geaendert:
 * - Das Widget wird NICHT verschoben. Ein DOM-Umzug des Custom Elements zerstoert
 *   die Bindung der App an die gewaehlte Stufe (nachgewiesen: dann landet immer
 *   die vorausgewaehlte Stufe im Warenkorb).
 * - Keine eigenen Preise und kein eigener /cart/add-Aufruf. Der echte
 *   Warenkorb-Button bleibt der einzige Weg in den Warenkorb.
 *
 * Wichtig zur Laufzeit: KEIN Dauer-Observer auf document.body. Ein frueherer
 * Versuch hat bei jeder Mutation neu geschrieben, das Schreiben erzeugte wieder
 * eine Mutation und der Tab ist eingefroren. Deshalb hier nur ein begrenzter
 * Init-Lauf plus Reaktion auf echte Nutzerinteraktion.
 */
(function () {
  'use strict';

  var MAX_TICKS = 25;      // 25 x 400ms = 10s, danach ist Schluss
  var ticks = 0;
  var timer = null;

  var CHEVRON =
    '<svg class="mm-bb-tier-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">' +
    '<path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  /* Freigestellte Bilder aus dem Theme. Die Fotos der App liegen auf schwarzem
     Grund und sind als 30px-Thumbnail unbrauchbar. Die Zuordnung kommt per
     JSON-Block aus main-product.liquid, weil ein Asset kein Liquid kann. */
  var THUMBS = (function () {
    var el = document.getElementById('mm-kb-thumbs');
    if (!el) return {};
    try { return JSON.parse(el.textContent); } catch (e) { return {}; }
  })();

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function parseMoney(txt) {
    if (!txt) return null;
    var m = String(txt).replace(/\s/g, '').match(/(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
    if (!m) return null;
    var v = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  }
  function money(v) { return v.toFixed(2).replace('.', ',') + ' €'; }
  function txt(el) { return el ? el.textContent.trim() : ''; }

  /* ---------- 1. "Das bekommst Du" ---------- */
  function productName() {
    var h = document.querySelector('product-info .product__title h1, .product__title h1, product-info h1');
    return txt(h);
  }

  function tierQty(tier) {
    var m = txt(tier.querySelector('.koala-deal__tier__title')).match(/(\d+)\s*x/i);
    return m ? parseInt(m[1], 10) : 1;
  }

  /* Gratisartikel der Stufe: Bild, Name und Wert stehen alle im App-Markup. */
  function giftsOf(tier) {
    var out = [];
    var boxes = tier.querySelectorAll('.koala-deal__tier__gift-container');
    for (var i = 0; i < boxes.length; i++) {
      var img = boxes[i].querySelector('.koala-deal__tier__gift-image');
      var link = boxes[i].querySelector('.koala-deal__tier__gift-link');
      var label = txt(boxes[i].querySelector('.koala-deal__tier__gift-text'));
      var alt = img ? (img.getAttribute('alt') || '') : '';
      var handle = '';
      if (link) {
        var href = (link.getAttribute('href') || '').split('?')[0].replace(/\/$/, '');
        handle = href.substring(href.lastIndexOf('/') + 1);
      }
      // Die App schreibt zwei Varianten: "inkl. 1 Aleppo Seife im Wert von 14,90€"
      // und "+ 1 Sea Texture Spray im Wert von 27,90€". Ohne den Plus-Fall fiel
      // der Name auf den langen alt-Text zurueck und der Wert fehlte.
      var m = label.match(/^\s*(?:inkl\.|\+)?\s*\d*\s*(.+?)\s+im\s+Wert\s+von\s+([\d.,]+)/i);
      var name = m ? m[1].trim() : (alt || label);
      // Die Groessenangabe steht nur im alt-Text ("Aleppo Seife 190g")
      if (alt && alt.toLowerCase().indexOf(name.toLowerCase()) === 0) name = alt.trim();
      out.push({
        name: name,
        value: m ? parseMoney(m[2]) : null,
        src: THUMBS[handle] || (img ? img.getAttribute('src') : '')
      });
    }
    return out;
  }

  function selfThumb(tier) {
    if (THUMBS.self) return "url('" + THUMBS.self + "')";
    var img = tier.querySelector('.koala-deal__tier__image');
    if (!img) return '';
    var bg = window.getComputedStyle(img).backgroundImage;
    return bg && bg !== 'none' ? bg : '';
  }

  function row(thumb, name, right) {
    return '<div class="mm-bb-item-row">' +
      '<span class="mm-bb-item-thumb" style="background-image:' + esc(thumb) + '"></span>' +
      '<span class="mm-bb-item-name">' + esc(name) + '</span>' + right + '</div>';
  }

  // Alle Stufen offen: bisher nur auf der Tallow-PDP gewuenscht. Ueberall sonst
  // bleibt es beim alten Verhalten, also nur die Bestseller-Stufe offen.
  function alleOffen() {
    return !!document.querySelector('.mm-pdp-tallow');
  }

  function buildTier(tier, input) {
    if (tier.querySelector('.mm-bb-tier-items')) return;
    var gifts = giftsOf(tier);
    // Einzelstufe ohne Gratisartikel bekommt keine Liste: die einzige Zeile waere
    // eine Wiederholung des Kartentitels. Im alten Design war .mm-bb-tier-items
    // in diesem Fall ebenfalls hidden.
    if (!gifts.length) return;
    var qty = tierQty(tier);
    var name = productName() || txt(tier.querySelector('.koala-deal__tier__title'));
    if (!name) return;

    var total = parseMoney(txt(tier.querySelector('.koala-deal__tier__price')));
    var reg = tier.querySelector('.koala-deal__tier__regular-price');
    var compare = reg && reg.className.indexOf('--hidden') === -1 ? parseMoney(txt(reg)) : null;

    var html = '<div class="mm-bb-tier-items-toggle">' +
      '<span class="mm-bb-tier-items-label">Das bekommst Du</span>' + CHEVRON + '</div>' +
      '<div class="mm-bb-tier-items-body">';
    html += row(selfThumb(tier), name, '<span class="mm-bb-item-qty">' + qty + '×</span>');
    for (var j = 0; j < gifts.length; j++) {
      var g = gifts[j];
      var right = (g.value ? '<span class="mm-bb-item-value">' + money(g.value) + '</span>' : '') +
        '<span class="mm-bb-item-gratis">Gratis</span>';
      html += row(g.src ? "url('" + g.src + "')" : '', g.name, right);
    }
    html += '</div>';

    var box = document.createElement('div');
    box.className = 'mm-bb-tier-items';
    box.innerHTML = html;
    // Auf der Tallow-PDP starten alle Stufen offen: der Inhalt eines Bundles ist
    // das Kaufargument und soll nicht erst nach einem Klick sichtbar werden.
    // Zuklappen bleibt ueber den Toggle moeglich. Sonst nur die Bestseller-Stufe.
    if (!alleOffen()) {
      var isBest = (input && input.checked) ||
        /bestseller/i.test(txt(tier.querySelector('.koala-deal__tier__label')));
      if (!isBest) box.classList.add('is-collapsed');
    }

    box.querySelector('.mm-bb-tier-items-toggle').addEventListener('click', function (e) {
      var radio = tier.previousElementSibling;
      var gewaehlt = radio && radio.checked;
      if (gewaehlt) {
        // Schon gewaehlt: nur auf- und zuklappen. preventDefault, weil das Tier ein
        // <label> ist und der Klick sonst die Auswahl neu setzt.
        e.preventDefault();
        e.stopPropagation();
        box.classList.toggle('is-collapsed');
        return;
      }
      // Noch nicht gewaehlt: Klick bewusst durchlassen, dann waehlt das <label> die
      // Stufe aus. Vorher blieb die Auswahl stehen und nur die Liste klappte auf -
      // das hat verwirrt. openSelected() unten klappt die neue Stufe auf.
    });
    tier.appendChild(box);
  }

  function buildLists() {
    var tiers = document.querySelectorAll('.koala-deal__tier');
    if (!tiers.length) return false;
    var done = 0;
    for (var i = 0; i < tiers.length; i++) {
      // Solange die App die Gratiszeilen noch nicht gerendert hat, warten -
      // sonst steht in der Liste nur das Hauptprodukt.
      var pricing = tiers[i].querySelector('.koala-deal__tier__price');
      if (!pricing) continue;
      buildTier(tiers[i], tiers[i].previousElementSibling);
      // Fertig ist eine Stufe auch dann, wenn sie gar keine Gratisartikel hat.
      if (tiers[i].querySelector('.mm-bb-tier-items') ||
          !tiers[i].querySelector('.koala-deal__tier__gift-container')) done++;
    }
    return done === tiers.length;
  }

  /* Die gewaehlte Stufe zeigt ihre Liste offen, damit sofort sichtbar ist, was
     drin ist. Die uebrigen bleiben zugeklappt.

     Wichtig: das greift NUR bei einem echten Auswahlwechsel. Vorher lief es nach
     jedem Klick in der Stufe - auch nach dem Klick auf die Zuklapp-Zeile, die
     Liste ging dadurch 150ms spaeter wieder auf und liess sich nicht schliessen. */
  var letzteAuswahl = null;
  function openSelected(force) {
    var aktuell = document.querySelector('.koala-deal__tier__input:checked');
    if (!force && aktuell === letzteAuswahl) return;
    letzteAuswahl = aktuell;
    var tiers = document.querySelectorAll('.koala-deal__tier');
    for (var i = 0; i < tiers.length; i++) {
      var box = tiers[i].querySelector('.mm-bb-tier-items');
      if (!box) continue;
      var radio = tiers[i].previousElementSibling;
      if (alleOffen()) {
        // Nur die gewaehlte sicher aufklappen, die anderen bleiben wie sie sind.
        if (radio && radio.checked) box.classList.remove('is-collapsed');
      } else {
        box.classList.toggle('is-collapsed', !(radio && radio.checked));
      }
    }
  }

  /* ---------- 2. Preiszeile ueber dem Warenkorb-Button ---------- */
  function selectedTier() {
    var i = document.querySelector('.koala-deal__tier__input:checked');
    return i && i.nextElementSibling ? i.nextElementSibling : document.querySelector('.koala-deal__tier');
  }

  function buildBar() {
    if (document.getElementById('mm-kb-sum')) return true;
    var anchor = document.querySelector('product-info .product-form__buttons, .product-form__buttons');
    if (!anchor || !document.querySelector('.koala-deal__tier')) return false;
    var bar = document.createElement('div');
    bar.id = 'mm-kb-sum';
    bar.className = 'mm-kb-sum';
    bar.innerHTML =
      '<span class="mm-kb-sum-main">' +
      '<span class="mm-kb-sum-total" id="mm-kb-sum-total"></span>' +
      '<span class="mm-kb-sum-compare" id="mm-kb-sum-compare" hidden></span>' +
      '</span>' +
      '<span class="mm-kb-sum-save" id="mm-kb-sum-save" hidden></span>';
    anchor.parentNode.insertBefore(bar, anchor);
    return true;
  }

  /* Preisanzeigen ausserhalb des Widgets an die gewaehlte Stufe haengen.

     Bisher liefen sie am Bundle vorbei: .mm-pdp-price-total und .mm-sc-price
     kommen statisch aus Liquid und zeigen den Einzelpreis, und der Preis im
     Warenkorb-Button wird von initPriceInButton() in mm-pdp-clearskinset.js
     genau einmal beim Laden aus .mm-pdp-price-total uebernommen und danach per
     data-mm-price-added gegen weitere Laeufe gesperrt. Wer also das 3er-Bundle
     fuer 66,96 EUR waehlte, sah im Button und in der Sticky-Leiste weiter 27,90.

     Angefasst wird nur, was schon einen Preis zeigt. Wo keiner steht - etwa im
     Button auf der Tallow-PDP - bleibt es dabei. */
  function syncAussenpreise(total) {
    var betrag = money(total);

    var zeile = document.querySelector('.mm-pdp-price-total');
    if (zeile && zeile.textContent.trim() !== betrag) zeile.textContent = betrag;

    var sticky = document.querySelector('.mm-sc-price');
    if (sticky && sticky.textContent.trim() !== betrag) sticky.textContent = betrag;

    // Der Button traegt "In den Warenkorb — 27,90 €". Nur der Teil hinter dem
    // Gedankenstrich wird ersetzt, damit die Beschriftung erhalten bleibt.
    var btn = document.querySelector('[data-mm-price-added]');
    if (btn) {
      var basis = btn.textContent.split('\u2014')[0].trim();
      var neu = basis + ' \u2014 ' + betrag;
      if (btn.textContent.trim() !== neu) btn.textContent = neu;
    }
  }

  function syncBar() {
    var bar = document.getElementById('mm-kb-sum');
    var tier = selectedTier();
    if (!bar || !tier) return;
    var total = parseMoney(txt(tier.querySelector('.koala-deal__tier__price')));
    var compare = parseMoney(txt(tier.querySelector('.koala-deal__tier__regular-price')));
    var elT = document.getElementById('mm-kb-sum-total');
    var elC = document.getElementById('mm-kb-sum-compare');
    var elS = document.getElementById('mm-kb-sum-save');
    if (total == null) { bar.hidden = true; return; }
    bar.hidden = false;
    syncAussenpreise(total);
    var t = money(total);
    if (elT.textContent !== t) elT.textContent = t;           // nur schreiben wenn sich was aendert
    if (compare != null && compare > total) {
      var c = money(compare), s = 'Du sparst ' + money(compare - total);
      if (elC.textContent !== c) elC.textContent = c;
      if (elS.textContent !== s) elS.textContent = s;
      elC.hidden = false; elS.hidden = false;
    } else {
      elC.hidden = true; elS.hidden = true;
    }
  }

  function tick() {
    ticks++;
    var a = buildLists();
    if (a) openSelected(true);   // Ausgangslage merken: gewaehlte Stufe offen
    var b = buildBar();
    if (b) syncBar();
    if ((a && b) || ticks >= MAX_TICKS) { window.clearInterval(timer); timer = null; }
  }

  function start() {
    tick();
    if (timer === null && ticks < MAX_TICKS) timer = window.setInterval(tick, 400);
    // Auf echte Interaktion reagieren - endlich, kein Observer.
    document.addEventListener('change', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('koala-deal__tier__input')) { syncBar(); openSelected(); }
    }, true);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.koala-deal__tier')) {
        window.setTimeout(function () { syncBar(); openSelected(); }, 150);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
