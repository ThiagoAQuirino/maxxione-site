'use strict';

document.addEventListener('DOMContentLoaded', function () {

  // ── Constantes ──────────────────────────────────────────────────────────────
  var WA = '5544999893307';
  function waOpen(msg) {
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  }

  // ── Ano no footer ────────────────────────────────────────────────────────────
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Urgency bar ──────────────────────────────────────────────────────────────
  var urgencyBar  = document.getElementById('urgencyBar');
  var closeBarBtn = document.getElementById('closeBar');

  function applyBarDismissed() {
    document.documentElement.style.setProperty('--bar-h', '0px');
    if (urgencyBar) urgencyBar.style.display = 'none';
  }

  function dismissBar() {
    if (!urgencyBar) return;
    urgencyBar.style.transition = 'height .3s, opacity .3s';
    urgencyBar.style.height = '0';
    urgencyBar.style.opacity = '0';
    urgencyBar.style.overflow = 'hidden';
    document.documentElement.style.setProperty('--bar-h', '0px');
    setTimeout(function () { urgencyBar.style.display = 'none'; }, 320);
    sessionStorage.setItem('barDismissed', '1');
  }

  if (sessionStorage.getItem('barDismissed')) {
    applyBarDismissed();
  }
  if (closeBarBtn) closeBarBtn.addEventListener('click', dismissBar);

  // ── Menu mobile ──────────────────────────────────────────────────────────────
  var navEl      = document.getElementById('nav');
  var hamburger  = document.getElementById('hamburger');

  function openMenu() {
    navEl.classList.add('nav--open');
    hamburger.classList.add('hamburger--open');
    hamburger.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    navEl.classList.remove('nav--open');
    hamburger.classList.remove('hamburger--open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu() {
    navEl.classList.contains('nav--open') ? closeMenu() : openMenu();
  }

  if (hamburger) hamburger.addEventListener('click', toggleMenu);
  document.querySelectorAll('.nav__link').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Fechar menu ao clicar fora
  document.addEventListener('click', function (e) {
    if (navEl && navEl.classList.contains('nav--open') &&
        !navEl.contains(e.target) && !hamburger.contains(e.target)) {
      closeMenu();
    }
  });

  // ── Smooth scroll ────────────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var hash   = this.getAttribute('href');
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var offset = document.getElementById('header') ? document.getElementById('header').offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset - 8;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  // ── Header scroll shadow ─────────────────────────────────────────────────────
  var headerEl = document.getElementById('header');
  function onScroll() {
    if (!headerEl) return;
    if (window.scrollY > 10) headerEl.classList.add('header--scrolled');
    else headerEl.classList.remove('header--scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Active nav link on scroll ─────────────────────────────────────────────────
  var sections = Array.from(document.querySelectorAll('section[id]'));
  var navLinks = document.querySelectorAll('.nav__link');
  window.addEventListener('scroll', function () {
    var scrollY = window.scrollY + 120;
    var current = '';
    sections.forEach(function (sec) {
      if (sec.offsetTop <= scrollY) current = sec.id;
    });
    navLinks.forEach(function (link) {
      link.classList.toggle('nav__link--active', link.getAttribute('href') === '#' + current);
    });
  }, { passive: true });

  // ── Scroll reveal ─────────────────────────────────────────────────────────────
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var delay = parseInt(entry.target.dataset.delay || '0', 10);
        setTimeout(function () {
          entry.target.classList.add('revealed');
        }, delay);
        revealObs.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('revealed'); });
  }

  // ── Stats counter ─────────────────────────────────────────────────────────────
  var countEls = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el      = entry.target;
        var end     = parseFloat(el.dataset.count);
        var suffix  = el.dataset.suffix || '';
        var prefix  = el.dataset.prefix || '';
        var decimal = String(end).indexOf('.') !== -1;
        var dur     = 1800;
        var t0      = performance.now();
        function tick(now) {
          var p  = Math.min((now - t0) / dur, 1);
          var e  = 1 - Math.pow(1 - p, 3);
          var v  = end * e;
          el.textContent = prefix + (decimal ? v.toFixed(1) : Math.floor(v)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = prefix + end + suffix;
        }
        requestAnimationFrame(tick);
        countObs.unobserve(el);
      });
    }, { threshold: 0.6 });
    countEls.forEach(function (el) { countObs.observe(el); });
  }

  // ── Helper: mostrar erro num input ───────────────────────────────────────────
  function showInputError(input, errorEl, msg) {
    input.classList.add('input--error');
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    input.focus();
    setTimeout(function () {
      input.classList.remove('input--error');
      if (errorEl) errorEl.style.display = 'none';
    }, 3000);
  }

  // ── Lead form (Hero) ──────────────────────────────────────────────────────────
  var leadInput = document.getElementById('leadName');
  var leadBtn   = document.getElementById('leadBtn');
  var leadError = document.getElementById('leadError');

  function submitLead() {
    var name = leadInput ? leadInput.value.trim() : '';
    if (!name) {
      showInputError(leadInput, leadError, 'Por favor, informe seu nome antes de continuar.');
      return;
    }
    var msg = 'Olá! Meu nome é ' + name + ' e vim pelo site. Gostaria de um atendimento personalizado!';
    waOpen(msg);
  }

  if (leadBtn)   leadBtn.addEventListener('click', submitLead);
  if (leadInput) {
    leadInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitLead(); });
    leadInput.addEventListener('input',   function ()  {
      leadInput.classList.remove('input--error');
      if (leadError) leadError.style.display = 'none';
    });
  }

  // ── Popup exit intent ─────────────────────────────────────────────────────────
  var popupOverlay  = document.getElementById('popupOverlay');
  var popupClose    = document.getElementById('popupClose');
  var popupSkip     = document.getElementById('popupSkip');
  var popupWaBtn    = document.getElementById('popupWaBtn');
  var popupName     = document.getElementById('popupName');
  var popupShown    = false;

  function showPopup() {
    if (popupShown || sessionStorage.getItem('popupShown') || !popupOverlay) return;
    popupShown = true;
    sessionStorage.setItem('popupShown', '1');
    popupOverlay.removeAttribute('hidden');
    // Duplo rAF: garante que o browser registra o estado inicial antes de animar
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        popupOverlay.classList.add('popup-overlay--visible');
        if (popupName) setTimeout(function () { popupName.focus(); }, 300);
      });
    });
  }

  function closePopup() {
    if (!popupOverlay) return;
    popupOverlay.classList.remove('popup-overlay--visible');
    setTimeout(function () { popupOverlay.setAttribute('hidden', ''); }, 320);
  }

  function submitPopup() {
    var name = popupName ? popupName.value.trim() : '';
    var msg = name
      ? 'Olá! Meu nome é ' + name + ' e vim pelo site. Quero ver as novidades!'
      : 'Olá! Vim pelo site e quero ver as novidades.';
    waOpen(msg);
    closePopup();
  }

  if (popupClose)   popupClose.addEventListener('click', closePopup);
  if (popupSkip)    popupSkip.addEventListener('click', closePopup);
  if (popupWaBtn)   popupWaBtn.addEventListener('click', submitPopup);
  if (popupName) {
    popupName.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitPopup(); });
  }
  if (popupOverlay) {
    popupOverlay.addEventListener('click', function (e) {
      if (e.target === popupOverlay) closePopup();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePopup();
  });

  // Exit intent: mouse sai pelo topo
  document.addEventListener('mouseleave', function (e) {
    if (e.clientY < 10) showPopup();
  });

  // Fallback: 45s idle
  var idleTimer = setTimeout(showPopup, 45000);
  ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showPopup, 45000);
    }, { passive: true });
  });

  // ── WhatsApp links com mensagens contextuais ──────────────────────────────────
  // Urgency bar CTA
  var barCta = document.getElementById('barCta');
  if (barCta) {
    barCta.addEventListener('click', function (e) {
      e.preventDefault();
      waOpen('Olá! Vi no site que tem novidades chegando e quero saber mais!');
    });
  }

});
