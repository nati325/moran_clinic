// וידאו ה-hero, הסרגל הדביק, מדידת קליקים וולידציה לטופס. התוכן עצמו לא תלוי בקובץ הזה.
(function () {
  var body = document.body;
  var waConversion = body.getAttribute('data-ads-wa');
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;

  // וידאו ה-hero: נטען רק אחרי שהעמוד נטען (התמונה היא ה-LCP), ולא במצב חיסכון בנתונים
  var hero = document.querySelector('video[data-hero]');
  if (hero && !calm && !saveData) {
    var tryPlay = function () { if (hero.paused) hero.play().catch(function () {}); };
    hero.addEventListener('playing', function () { hero.classList.add('is-on'); }, { once: true });
    hero.addEventListener('canplay', tryPlay);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tryPlay(); });
    window.addEventListener('load', function () {
      hero.src = hero.getAttribute('data-src');
      tryPlay();
    });
  }

  // הסרגל הדביק בנייד מופיע רק אחרי שגוללים מעבר לכפתור הראשי
  var sticky = document.querySelector('[data-sticky]');
  var firstCta = document.querySelector('.hero .btn-wa, .s-hero .btn-wa');
  // (בדיקה לפי מיקום ולא IntersectionObserver: גלילה מהירה שקופצת מעל הכפתור לא מפספסת)
  if (sticky && firstCta) {
    var update = function () {
      sticky.classList.toggle('is-hidden', firstCta.getBoundingClientRect().bottom > 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var params = { link_location: a.getAttribute('data-loc') || '', page_path: location.pathname };
    if (href.indexOf('https://wa.me/') === 0) {
      track('click_whatsapp', params);
      if (waConversion) track('conversion', { send_to: waConversion });
    } else if (href.indexOf('tel:') === 0) {
      track('click_phone', params);
    } else if (href === '#booking' || a.hasAttribute('data-booking')) {
      track('click_booking', params);
    }
  });

  // פתיחת הטופס נספרת כקליק על "קביעת תור"
  var formWrap = document.querySelector('.form-wrap');
  if (formWrap) formWrap.addEventListener('toggle', function () {
    if (formWrap.open) track('click_booking', { link_location: 'form_open', page_path: location.pathname });
  });

  function setError(input, show) {
    var err = document.getElementById(input.getAttribute('aria-describedby'));
    if (err) err.hidden = !show;
    if (show) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function phoneValid(v) {
    var d = v.replace(/\D/g, '').replace(/^972/, '0');
    return /^0\d{8,9}$/.test(d);
  }

  var forms = document.querySelectorAll('form[data-booking-form]');
  Array.prototype.forEach.call(forms, function (form) {
    form.setAttribute('novalidate', '');
    var name = form.elements['name'];
    var phone = form.elements['phone'];
    var sent = false;

    name.addEventListener('input', function () { if (name.value.trim().length >= 2) setError(name, false); });
    phone.addEventListener('input', function () { if (phoneValid(phone.value)) setError(phone, false); });

    form.addEventListener('submit', function (e) {
      // honeypot: בוטים ממלאים את השדה הנסתר
      if (form.elements['company'].value) { e.preventDefault(); return; }

      var nameOk = name.value.trim().length >= 2;
      var phoneOk = phoneValid(phone.value);
      setError(name, !nameOk);
      setError(phone, !phoneOk);
      if (!nameOk || !phoneOk) {
        e.preventDefault();
        (nameOk ? phone : name).focus();
        return;
      }
      if (sent || typeof window.gtag !== 'function') return;

      // שולחים את האירוע לפני שהדפדפן עובר לעמוד התודה
      e.preventDefault();
      sent = true;
      var done = false;
      function go() { if (!done) { done = true; form.submit(); } }
      window.gtag('event', 'form_submit', {
        service: form.elements['service'].value,
        page_path: location.pathname,
        event_callback: go,
      });
      setTimeout(go, 1000);
    });
  });
})();
