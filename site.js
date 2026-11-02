(function () {
  var root = document.documentElement;

  // Every page opens at the top (unless the link points at a section, like contact.html#demand),
  // instead of keeping the scroll position of the page you came from.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var toTop = function () {
    if (location.hash && document.getElementById(location.hash.slice(1))) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  toTop();
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', function (e) { if (e.persisted) toTop(); });

  // Header turns solid once the photo hero has scrolled under it.
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('solid', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Scroll reveals: text rises in, photos open up, step lines draw across.
  // Anything already on screen at load is left alone, so the first view is always complete.
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var below = function (el) { return el.getBoundingClientRect().top > window.innerHeight * 0.9; };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    var mark = function (els, cls, stagger) {
      els.forEach(function (el, i) {
        if (!below(el)) return;
        el.classList.add(cls);
        if (stagger) el.style.setProperty('--rv-d', Math.min(i, 5) * stagger + 'ms');
        io.observe(el);
      });
    };
    var all = function (s, root) { return [].slice.call((root || document).querySelectorAll(s)); };
    // Text groups: stagger siblings within each group
    ['.sec-head', '.feature .copy', '.photo-band .inner', '.contact-grid > div', '.founder'].forEach(function (g) {
      all(g).forEach(function (group) { mark(all(':scope > *', group), 'rv', 90); });
    });
    // Repeated items: stagger across the row
    ['.pillars', '.doors', '.tiles', '.team', '.cities', '.pubwall', '.facts', '.details'].forEach(function (g) {
      all(g).forEach(function (row) { mark(all(':scope > *', row), 'rv', 80); });
    });
    mark(all('.feature > figure, .tile figure'), 'rv-img', 0);
    mark(all('.inspector, .table-box, .form, .policy-body > section'), 'rv', 0);
    all('.steps').forEach(function (s) { if (below(s)) { s.classList.add('rv-line'); io.observe(s); mark(all(':scope > .step > *', s), 'rv', 60); } });
  }

  // Mobile menu
  var menuBtn = document.querySelector('.menu-btn');
  var panel = document.getElementById('mobile-panel');
  if (menuBtn && panel) {
    menuBtn.addEventListener('click', function () {
      var open = !root.classList.contains('menu-open');
      root.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.querySelector('.label').textContent = open ? 'Close' : 'Menu';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) menuBtn.click();
    });
  }

  // Bid-request inspector: tabs plus a slow auto-cycle that stops once someone interacts.
  var insp = document.querySelector('.inspector');
  if (insp) {
    var tabs = [].slice.call(insp.querySelectorAll('.tab'));
    var panes = [].slice.call(insp.querySelectorAll('pre'));
    var current = 0, timer = null;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var show = function (i) {
      current = i;
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
      panes.forEach(function (p, j) { if (j === i) p.removeAttribute('data-off'); else p.setAttribute('data-off', ''); });
    };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stop(); show(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault(); stop();
          var n = (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          show(n); tabs[n].focus();
        }
      });
    });
    show(0);
    if (!reduce) timer = setInterval(function () {
      if (!document.hidden && !insp.matches(':hover')) show((current + 1) % panes.length);
    }, 5200);
  }

  // Copy buttons
  [].forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-copy'));
      var reset = function (t) { btn.textContent = t; setTimeout(function () { btn.textContent = 'Copy'; }, 1600); };
      var select = function () { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); reset('Selected'); };
      try { navigator.clipboard.writeText(el.textContent).then(function () { reset('Copied'); }, select); } catch (e) { select(); }
    });
  });

  // Contact form: sends to the form service in data-endpoint (e.g. Formspree), which emails hello@adsphere360.com.
  // With no endpoint set, it says plainly that nothing was sent.
  var form = document.getElementById('contact-form');
  if (form) {
    var note = document.getElementById('form-note');
    var submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('f-name'), email = document.getElementById('f-email');
      if (!name.value.trim()) { note.textContent = 'Add your name so we know who to reply to.'; name.focus(); return; }
      if (!email.value.trim() || !email.checkValidity()) { note.textContent = 'Add a valid work email so we can reply.'; email.focus(); return; }
      var first = name.value.trim().split(' ')[0];
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        note.textContent = 'Thanks, ' + first + '. This form isn’t connected yet, so nothing was sent. Please email hello@adsphere360.com.';
        return;
      }
      // The Claude preview blocks outside requests, so only the live site (or a local copy) can send.
      var live = /(^|\.)adsphere360\.com$/.test(location.hostname) || location.protocol === 'file:' || location.hostname === 'localhost';
      if (!live) {
        note.textContent = 'Thanks, ' + first + '. This preview can’t send messages; the form will work once the site is live at adsphere360.com.';
        return;
      }
      submitBtn.disabled = true; note.textContent = 'Sending…';
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('bad status');
          form.reset();
          note.textContent = 'Thanks, ' + first + '. Your message is with us, and we’ll reply within one business day.';
        })
        .catch(function () {
          note.textContent = 'Your message didn’t go through. Please try again, or email hello@adsphere360.com.';
        })
        .then(function () { submitBtn.disabled = false; });
    });
    // Preselect the audience when arriving from a page-specific button (#publisher / #demand).
    var h = (location.hash || '').slice(1);
    var pre = document.getElementById('role-' + h);
    if (pre) pre.checked = true;
  }
})();
