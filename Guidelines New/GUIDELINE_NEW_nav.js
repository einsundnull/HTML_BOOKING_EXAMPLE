/* ════════════════════════════════════════════════════════════
   GUIDELINE_NEW — Shared Navigation JS
   - Marks active nav link based on current filename
   - Controls mobile hamburger menu
   ════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var filename = window.location.pathname.split('/').pop() || '';

  /* ── Active link — desktop ─────────────────────────────── */
  var desktopLinks = document.querySelectorAll('.gl-nav-link[data-page]');
  for (var i = 0; i < desktopLinks.length; i++) {
    if (desktopLinks[i].getAttribute('data-page') === filename) {
      desktopLinks[i].classList.add('is-active');
    }
  }

  /* ── Active link — mobile ──────────────────────────────── */
  var mobileLinks = document.querySelectorAll('.gl-nav-mobile-link[data-page]');
  for (var j = 0; j < mobileLinks.length; j++) {
    if (mobileLinks[j].getAttribute('data-page') === filename) {
      mobileLinks[j].classList.add('is-active');
    }
  }

  /* ── Hamburger toggle ──────────────────────────────────── */
  var toggle    = document.getElementById('gl-nav-toggle');
  var mobileNav = document.getElementById('gl-nav-mobile');
  var overlay   = document.getElementById('gl-nav-overlay');

  if (!toggle || !mobileNav || !overlay) { return; }

  var _isOpen = false;

  function openMenu() {
    _isOpen = true;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Navigation schließen');
    mobileNav.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var firstLink = mobileNav.querySelector('.gl-nav-mobile-link');
    if (firstLink) { firstLink.focus(); }
  }

  function closeMenu() {
    _isOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Navigation öffnen');
    mobileNav.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    toggle.focus();
  }

  toggle.addEventListener('click', function () {
    if (_isOpen) { closeMenu(); } else { openMenu(); }
  });

  overlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _isOpen) { closeMenu(); }
  });

  var navLinks = mobileNav.querySelectorAll('.gl-nav-mobile-link');
  for (var k = 0; k < navLinks.length; k++) {
    navLinks[k].addEventListener('click', function () {
      /* small delay so page doesn't jump before navigation */
      setTimeout(closeMenu, 80);
    });
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768 && _isOpen) { closeMenu(); }
  });

}());
