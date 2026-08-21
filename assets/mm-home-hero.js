/*
 * MEN MANSION - Startseite: Hoehe der Header-Gruppe messen.
 *
 * Auf der Startseite liegen Announcement-Bar und Header transparent ueber dem
 * Hero-Bild (siehe .mm-header-group in mm-design-system.css). Die Hero-Copy
 * braucht deshalb oben genau den Platz, den beide Leisten zusammen einnehmen.
 * Ein fester Wert geht nicht: mobil sind es rund 99px, auf dem Desktop mehr,
 * und die Bar-Hoehe haengt an der Textlaenge.
 *
 * Deshalb hier einmal messen und als --mm-header-h auf :root schreiben. Kein
 * Dauer-Observer: nur beim Laden, bei resize und wenn Bilder in der Bar noch
 * nachladen.
 */
(function () {
  'use strict';

  function apply() {
    var group = document.querySelector('.mm-header-group');
    if (!group) return;
    var h = Math.round(group.getBoundingClientRect().height);
    if (!h) return;
    document.documentElement.style.setProperty('--mm-header-h', h + 'px');
  }

  function start() {
    apply();
    // Die Announcement-Bar der App rendert ihren Text teils nach.
    var ticks = 0;
    var iv = window.setInterval(function () {
      ticks++;
      apply();
      if (ticks >= 10) window.clearInterval(iv);
    }, 300);
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('load', apply);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
