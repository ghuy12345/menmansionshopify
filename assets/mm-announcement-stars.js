/*
 * MEN MANSION - Emoji-Sterne in der Announcement-Bar durch SVG-Sterne ersetzen.
 *
 * Der Text der Bar kommt aus der App "Essential Announcement Bar", im Theme
 * steht nur der Mount-Point <div class="essential-announcement-block">. Die
 * Sterne sind dort Emoji (U+2B50), die je nach Geraet bunt und unterschiedlich
 * gerendert werden. Hier werden sie im DOM durch ein einheitliches SVG im
 * Goldton getauscht - der Text der App bleibt unangetastet, nur die Darstellung
 * aendert sich.
 *
 * Bewusst KEIN Observer auf document.body: ein frueherer Versuch hat bei jeder
 * Mutation neu geschrieben, das Schreiben erzeugte wieder eine Mutation und der
 * Tab ist eingefroren. Stattdessen ein begrenzter Init-Lauf, weil die App ihren
 * Text nachtraegt.
 */
(function () {
  'use strict';

  var MAX_TICKS = 20; // 20 x 300ms = 6s
  var STAR =
    '<svg class="mm-ann-star" viewBox="0 0 20 20" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M10 1.6l2.55 5.17 5.7.83-4.12 4.02.97 5.68L10 14.62l-5.1 2.68.97-5.68L1.75 7.6l5.7-.83z"/></svg>';
  var EMOJI = /(?:⭐️?)+/g;

  function replaceIn(root) {
    if (!root || root.getAttribute('data-mm-stars') === 'done') return false;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) if (EMOJI.test(n.nodeValue)) nodes.push(n);
    EMOJI.lastIndex = 0;
    if (!nodes.length) return false;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var html = node.nodeValue.replace(EMOJI, function (run) {
        var count = Array.from(run.replace(/️/g, '')).length;
        var out = '<span class="mm-ann-stars" role="img" aria-label="' + count + ' von 5 Sternen">';
        for (var s = 0; s < count; s++) out += STAR;
        return out + '</span>';
      });
      var span = document.createElement('span');
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    }
    root.setAttribute('data-mm-stars', 'done');
    return true;
  }

  function run() {
    var done = 0;
    var blocks = document.querySelectorAll('.essential-announcement-block, .ss-announcement-bar__message');
    for (var i = 0; i < blocks.length; i++) if (replaceIn(blocks[i])) done++;
    return done;
  }

  function start() {
    run();
    var ticks = 0;
    var iv = window.setInterval(function () {
      ticks++;
      run();
      if (ticks >= MAX_TICKS) window.clearInterval(iv);
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
