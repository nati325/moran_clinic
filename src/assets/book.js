// הזמנת תור אונליין: טיפול ← יום ← שעה ← פרטים. שלב שהושלם נסגר לשורת סיכום עם "שינוי".
// בלי ספריות; כל טקסט נכנס דרך textContent.
(() => {
  const root = document.getElementById('book');
  if (!root) return;
  const SERVICES = JSON.parse(root.dataset.services || '[]');
  const WA = root.dataset.wa;
  const IL = 'Asia/Jerusalem';
  const st = { service: '', date: '', time: '', slots: {}, loading: false, next: null, maxDate: null, error: '', fieldErr: {} };

  const h = (tag, props, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  };
  const fmt = (o) => new Intl.DateTimeFormat('he-IL', { timeZone: IL, ...o });
  const dObj = (ds) => new Date(ds + 'T12:00:00Z');
  const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: IL }).format(new Date());
  const longDay = (ds) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(dObj(ds));
  const svcName = () => SERVICES.find((s) => s.key === st.service)?.name || '';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('mm_client') || '{}'); } catch { return {}; } },
    set(v) { try { localStorage.setItem('mm_client', JSON.stringify(v)); } catch { /* מצב פרטי: לא קריטי */ } },
  };

  async function loadSlots(more) {
    st.loading = true; st.error = ''; render();
    try {
      const from = more ? st.next : todayStr();
      const r = await fetch(`/api/slots?service=${encodeURIComponent(st.service)}&from=${from}&days=14`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'לא הצלחתי לטעון שעות פנויות.');
      st.slots = { ...(more ? st.slots : {}), ...data.slots };
      st.next = data.next; st.maxDate = data.maxDate;
    } catch (e) { st.error = e.message || 'אין חיבור. נסי שוב.'; }
    st.loading = false; render();
  }

  const availableDays = () => Object.keys(st.slots).filter((d) => st.slots[d].length).sort();
  const canMore = () => st.next && st.maxDate && st.next <= st.maxDate;
  const stepNow = () => (!st.service ? 1 : !st.date ? 2 : !st.time ? 3 : 4);

  // ── רכיבים ──
  const head = (n, title) => h('h2', { class: 'bk-q' }, h('b', null, n), title);
  const summaryRow = (label, value, onEdit) => h('div', { class: 'bk-done-row' },
    h('div', null, h('small', null, label), h('strong', null, value)),
    h('button', { type: 'button', class: 'bk-edit', onclick: onEdit }, 'שינוי'));

  function stepService() {
    return h('section', { class: 'bk-step' }, head(1, 'איזה טיפול?'),
      h('div', { class: 'bk-svc' }, SERVICES.map((s) => h('button', { type: 'button', class: 'bk-opt', onclick: () => { st.service = s.key; st.date = st.time = ''; st.slots = {}; loadSlots(false); } }, s.name))));
  }

  function nearest() {
    const d = availableDays()[0];
    return d ? { date: d, time: st.slots[d][0] } : null;
  }

  function stepDate() {
    const days = availableDays();
    const n = nearest();
    return h('section', { class: 'bk-step', 'aria-busy': st.loading ? 'true' : 'false' }, head(2, 'באיזה יום?'),
      n ? h('button', { type: 'button', class: 'bk-quick', onclick: () => { st.date = n.date; st.time = n.time; render(); focusForm(); } },
        h('small', null, 'הכי קרוב'), h('strong', null, `${longDay(n.date)} · ${n.time}`)) : null,
      st.error ? h('div', { class: 'bk-err', role: 'alert' }, st.error, ' ', h('button', { type: 'button', class: 'bk-edit', onclick: () => loadSlots(false) }, 'ניסיון נוסף')) : null,
      days.length ? h('div', { class: 'bk-days', role: 'group', 'aria-label': 'ימים פנויים' }, days.map((d) => h('button', { type: 'button', class: 'bk-day', onclick: () => { st.date = d; st.time = ''; render(); } },
        h('small', null, fmt({ weekday: 'short' }).format(dObj(d))), h('b', null, dObj(d).getUTCDate()), h('small', null, fmt({ month: 'short' }).format(dObj(d)))))) : null,
      st.loading ? h('div', { class: 'bk-skel', role: 'status' }, h('span', { class: 'sr' }, 'טוענת שעות פנויות'), [0, 1, 2, 3, 4].map(() => h('i'))) : null,
      !st.loading && !st.error && !days.length ? h('p', { class: 'bk-note' }, 'אין כרגע שעות פנויות. אפשר לכתוב לי בוואטסאפ ונמצא יחד זמן.') : null,
      !st.loading && canMore() && days.length ? h('button', { type: 'button', class: 'bk-more', onclick: () => loadSlots(true) }, 'עוד ימים') : null);
  }

  function stepTime() {
    const times = st.slots[st.date] || [];
    const groups = [['בוקר', (t) => t < '12:00'], ['צהריים', (t) => t >= '12:00' && t < '17:00'], ['ערב', (t) => t >= '17:00']];
    return h('section', { class: 'bk-step' }, head(3, 'באיזו שעה?'),
      groups.map(([label, f]) => { const ts = times.filter(f); return ts.length ? h('div', { class: 'bk-group' }, h('small', null, label),
        h('div', { class: 'bk-times', role: 'group', 'aria-label': label }, ts.map((t) => h('button', { type: 'button', class: 'bk-time', onclick: () => { st.time = t; render(); focusForm(); } }, t)))) : null; }));
  }

  function focusForm() { setTimeout(() => { const f = document.getElementById('bk-name'); if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (!f.value) f.focus({ preventScroll: true }); } }, 60); }

  function stepForm() {
    const saved = store.get();
    const msg = h('p', { class: 'bk-err', role: 'alert' });
    const name = h('input', { id: 'bk-name', name: 'name', required: true, maxlength: 80, autocomplete: 'given-name', value: saved.name || '' });
    const phone = h('input', { id: 'bk-phone', name: 'phone', type: 'tel', inputmode: 'tel', dir: 'ltr', required: true, maxlength: 24, autocomplete: 'tel', placeholder: '050-0000000', value: saved.phone || '' });
    const nameErr = h('small', { class: 'bk-fe', id: 'bk-name-e' }), phoneErr = h('small', { class: 'bk-fe', id: 'bk-phone-e' });
    name.setAttribute('aria-describedby', 'bk-name-e'); phone.setAttribute('aria-describedby', 'bk-phone-e');
    const note = h('textarea', { id: 'bk-note', name: 'note', rows: 2, maxlength: 500 });
    const trap = h('input', { name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', class: 'bk-trap' });
    const btn = h('button', { class: 'btn btn-wa btn-lg', type: 'submit' }, 'שליחת בקשה');
    const okName = () => { const ok = name.value.trim().length >= 2; nameErr.textContent = ok ? '' : 'איך לקרוא לך?'; name.toggleAttribute('aria-invalid', !ok); return ok; };
    const okPhone = () => { const d = phone.value.replace(/\D/g, '').replace(/^972/, '0'); const ok = /^0\d{8,9}$/.test(d); phoneErr.textContent = ok ? '' : 'מספר טלפון תקין, כדי שאוכל לאשר את התור.'; phone.toggleAttribute('aria-invalid', !ok); return ok; };
    name.addEventListener('blur', () => name.value && okName());
    phone.addEventListener('blur', () => phone.value && okPhone());
    return h('form', { class: 'bk-step', id: 'bk-form', novalidate: true, onsubmit: async (e) => {
      e.preventDefault(); msg.textContent = '';
      const a = okName(), b = okPhone();
      if (!a || !b) { (a ? phone : name).focus(); return; }
      btn.disabled = true; btn.textContent = 'שולחת…';
      try {
        const r = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service: st.service, start: `${st.date}T${st.time}`, name: name.value, phone: phone.value, note: note.value, website: trap.value }) });
        const data = await r.json().catch(() => ({}));
        if (r.status === 409) { st.time = ''; await loadSlots(false); st.error = data.message || 'השעה נתפסה. אפשר לבחור אחרת.'; render(); return; }
        if (!r.ok) throw new Error(data.message || 'משהו השתבש. אפשר לנסות שוב או לכתוב לי בוואטסאפ.');
        store.set({ name: name.value.trim(), phone: phone.value.trim() });
        done(name.value.trim(), data.summary?.durationMin || 60);
      } catch (err) { msg.textContent = err instanceof TypeError ? 'אין חיבור לאינטרנט. נסי שוב.' : err.message; btn.disabled = false; btn.textContent = 'שליחת בקשה'; }
    } },
      head(4, 'הפרטים שלך'),
      h('div', { class: 'fld' }, h('label', { for: 'bk-name' }, 'שם'), name, nameErr),
      h('div', { class: 'fld' }, h('label', { for: 'bk-phone' }, 'טלפון'), phone, phoneErr),
      h('div', { class: 'fld' }, h('label', { for: 'bk-note' }, 'משהו שחשוב שאדע? (לא חובה)'), note),
      trap, msg, btn,
      h('p', { class: 'small bk-fine' }, 'זו בקשה, ואני מאשרת אותה אישית בוואטסאפ. הפרטים משמשים רק לתיאום התור.'));
  }

  function render() {
    const y = window.scrollY, step = stepNow();
    const rows = [];
    if (step > 1) rows.push(summaryRow('טיפול', svcName(), () => { st.service = st.date = st.time = ''; st.slots = {}; render(); }));
    if (step > 2) rows.push(summaryRow('יום', longDay(st.date), () => { st.date = st.time = ''; render(); }));
    if (step > 3) rows.push(summaryRow('שעה', st.time, () => { st.time = ''; render(); }));
    root.replaceChildren(...[
      rows.length ? h('div', { class: 'bk-summary' }, rows) : null,
      step === 1 ? stepService() : step === 2 ? stepDate() : step === 3 ? stepTime() : stepForm(),
    ].filter(Boolean));
    window.scrollTo(0, y);
  }

  // קובץ יומן (.ics) בשעון מקומי צף: נפתח ביומן של הטלפון
  function icsHref(durationMin) {
    const p = (n) => String(n).padStart(2, '0');
    const start = `${st.date.replace(/-/g, '')}T${st.time.replace(':', '')}00`;
    const [H, M] = st.time.split(':').map(Number), t = H * 60 + M + durationMin;
    const end = `${st.date.replace(/-/g, '')}T${p(Math.floor(t / 60) % 24)}${p(t % 60)}00`;
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//moran madar//he', 'BEGIN:VEVENT', `UID:${Date.now()}@moranmadar`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, '')}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${svcName()} אצל מורן מדר (ממתין לאישור)`, 'LOCATION:הגליל 55, בית דגן', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
  }

  function done(first, durationMin) {
    const when = `${longDay(st.date)} בשעה ${st.time}`;
    const u = new URL(WA); u.searchParams.set('text', `היי מורן, זו ${first}. ביקשתי באתר תור ל${svcName()}, ${when}.`);
    root.replaceChildren(h('div', { class: 'bk-ok', role: 'status' },
      h('div', { class: 'bk-check', 'aria-hidden': 'true' }, '✓'),
      h('h2', null, `תודה ${first}, קיבלתי`),
      h('p', { class: 'bk-when' }, svcName(), h('br'), when),
      h('p', null, 'התור עוד לא סופי: אני אחזור אלייך בוואטסאפ לאישור.'),
      h('div', { class: 'stack' },
        h('a', { class: 'btn btn-wa btn-lg', href: u.href, target: '_blank', rel: 'noopener', 'data-loc': 'booking' }, 'וואטסאפ למורן'),
        h('a', { class: 'tlink', href: icsHref(durationMin), download: 'moran-madar.ics' }, 'הוספה ליומן בטלפון'),
        h('a', { class: 'tlink', href: '/' }, 'חזרה לעמוד הבית'))));
    root.closest('.bookpg')?.classList.add('is-done');
    window.scrollTo(0, 0);
  }

  const pre = new URLSearchParams(location.search).get('s');
  if (pre && SERVICES.some((s) => s.key === pre)) { st.service = pre; loadSlots(false); } else render();
})();
