/**
 * skiing.js — Skiing Placeholder Page
 *
 * Initialisiert Navbar ohne Auth-Guard (public page).
 * Scroll-to-top Button.
 * i18n Namespace: skiing
 * Regeln: var only, function(){}, no arrow functions, no template literals
 */

/* Use 'load' not 'DOMContentLoaded': defer scripts run after DOMContentLoaded. */
window.addEventListener('load', function() {
  function _initSkiing() {
  Navbar.init('skiing');

  var jumper = document.getElementById('section-jumper');
  var topBtn = document.getElementById('jump-top');

  function updateScrollBtns() {
    var navH = (document.querySelector('.navbar') || {}).offsetHeight || 52;
    var scrolled = window.scrollY > navH;
    if (jumper) jumper.classList.toggle('is-visible', scrolled);
    if (topBtn) topBtn.classList.toggle('is-hidden-top', !scrolled);
  }

  if (topBtn) {
    topBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  var chatFab = document.getElementById('chat-fab');
  if (chatFab) chatFab.addEventListener('click', function() { /* placeholder */ });

  window.addEventListener('scroll', updateScrollBtns);
  updateScrollBtns();
  } /* end _initSkiing */
  if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
    CurrencyService.onReady(_initSkiing);
  } else {
    _initSkiing();
  }
});
