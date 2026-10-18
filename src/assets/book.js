// הזמנת תור אונליין: טיפול ← תאריך ← שעה ← פרטים. בלי ספריות; כל טקסט נכנס דרך textContent.
(() => {
  const root = document.getElementById('book');
  if (!root) return;
  const SERVICES = JSON.parse(root.dataset.services || '[]');
  const WA = root.dataset.wa;
  const IL = 'Asia/Jerusalem';
  const st = { service: '', date: '', time: '', slots: {}, loading: false, from: null, maxDate: null, sending: false };

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
  const addDays = (ds, n) => { const d = dObj(ds); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: IL }).format(new Date());

  async function loadSlots(more) {
    st.loading = true; render();
    try {
      const from = more ? st.from : todayStr();
      const r = await fetch(`/api/slots?service=${encodeURIComponent(st.service)}&from=${from}&days=14`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'לא הצלחתי לטעון שעות פנויות.');
      st.slots = { ...(more ? st.slots : {}), ...data.slots };
      st.from = data.next; st.maxDate = data.maxDate; st.error = '';
    } catch (e) { st.error = e.message; }
    st.loading = false; render();
  }

  const availableDays = () => Object.keys(st.slots).filter((d) => st.slots[d].length).sort();
  const canMore = () => st.from && st.maxDate && st.from <= st.maxDate;

  function render() {
    const prevScroll = window.scrollY;
    const days = availableDays();
    const svcName = SERVICES.find((s) => s.key === st.service)?.name;
    root.replaceChildren(...[
      // 1. טיפול
      h('fieldset', { class: 'bk-step' },
        h('legend', null, h('b', null, '1'), 'איזה טיפול?'),
        h('div', { class: 'bk-svc' }, SERVICES.map((s) => h('button', { type: 'button', class: 'bk-opt' + (st.service === s.key ? ' on' : ''), 'aria-pressed': st.service === s.key ? 'true' : 'false', onclick: () => { st.service = s.key; st.date = ''; st.time = ''; st.slots = {}; loadSlots(false); } }, s.name)))),
      // 2. תאריך
      st.service ? h('div', { class: 'bk-step' },
        h('h2', { class: 'bk-q' }, h('b', null, '2'), 'באיזה יום?'),
        st.error ? h('p', { class: 'bk-err', role: 'alert' }, st.error) : null,
        days.length ? h('div', { class: 'bk-days', role: 'group', 'aria-label': 'ימים פנויים' }, days.map((d) => h('button', { type: 'button', class: 'bk-day' + (st.date === d ? ' on' : ''), 'aria-pressed': st.date === d ? 'true' : 'false', onclick: () => { st.date = d; st.time = ''; render(); document.getElementById('bk-times')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
          h('small', null, fmt({ weekday: 'short' }).format(dObj(d))), h('b', null, dObj(d).getUTCDate()), h('small', null, fmt({ month: 'short' }).format(dObj(d)))))) : null,
        st.loading ? h('p', { class: 'bk-note' }, 'טוענת שעות פנויות…') : null,
        !st.loading && !st.error && !days.length ? h('p', { class: 'bk-note' }, 'אין כרגע שעות פנויות. אפשר לכתוב לי בוואטסאפ ונמצא יחד זמן.') : null,
        !st.loading && canMore() && days.length ? h('button', { type: 'button', class: 'bk-more', onclick: () => loadSlots(true) }, 'עוד ימים') : null) : null,
      // 3. שעה
      st.date ? h('div', { class: 'bk-step', id: 'bk-times' },
        h('h2', { class: 'bk-q' }, h('b', null, '3'), 'באיזו שעה?'),
        h('p', { class: 'bk-note' }, fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(dObj(st.date))),
        h('div', { class: 'bk-times', role: 'group', 'aria-label': 'שעות פנויות' }, st.slots[st.date].map((t) => h('button', { type: 'button', class: 'bk-time' + (st.time === t ? ' on' : ''), 'aria-pressed': st.time === t ? 'true' : 'false', onclick: () => { st.time = t; render(); document.getElementById('bk-form')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, t)))) : null,
      // 4. פרטים
      st.time ? form(svcName) : null].filter(Boolean));
    window.scrollTo(0, prevScroll);
  }

  function form(svcName) {
    const msg = h('p', { class: 'bk-err', role: 'alert' });
    const name = h('input', { id: 'bk-name', name: 'name', required: true, maxlength: 80, autocomplete: 'given-name' });
    const phone = h('input', { id: 'bk-phone', name: 'phone', type: 'tel', inputmode: 'tel', dir: 'ltr', required: true, maxlength: 24, autocomplete: 'tel', placeholder: '050-0000000' });
    const note = h('textarea', { id: 'bk-note', name: 'note', rows: 2, maxlength: 500 });
    const trap = h('input', { name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', class: 'bk-trap' });
    const btn = h('button', { class: 'btn btn-wa btn-lg', type: 'submit' }, 'שליחת בקשה');
    return h('form', { class: 'bk-step', id: 'bk-form', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      msg.textContent = '';
      if (!name.value.trim() || phone.value.replace(/\D/g, '').length < 9) { msg.textContent = 'צריך שם וטלפון תקינים, כדי שאוכל לאשר את התור.'; return; }
      btn.disabled = true; btn.textContent = 'שולחת…';
      try {
        const r = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service: st.service, start: `${st.date}T${st.time}`, name: name.value, phone: phone.value, note: note.value, website: trap.value }) });
        const data = await r.json().catch(() => ({}));
        if (r.status === 409) { st.time = ''; await loadSlots(false); st.error = data.message; render(); return; }
        if (!r.ok) throw new Error(data.message || 'משהו השתבש. אפשר לנסות שוב או לכתוב לי בוואטסאפ.');
        done(name.value.trim());
      } catch (err) { msg.textContent = err.message; btn.disabled = false; btn.textContent = 'שליחת בקשה'; }
    } },
      h('h2', { class: 'bk-q' }, h('b', null, '4'), 'הפרטים שלך'),
      h('p', { class: 'bk-sum' }, `${svcName} · ${fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(dObj(st.date))} · ${st.time}`),
      h('div', { class: 'fld' }, h('label', { for: 'bk-name' }, 'שם'), name),
      h('div', { class: 'fld' }, h('label', { for: 'bk-phone' }, 'טלפון'), phone),
      h('div', { class: 'fld' }, h('label', { for: 'bk-note' }, 'משהו שחשוב שאדע? (לא חובה)'), note),
      trap, msg, btn,
      h('p', { class: 'small' }, 'זו בקשה, ואני מאשרת אותה אישית בוואטסאפ. הפרטים שלך משמשים רק לתיאום התור.'));
  }

  function done(first) {
    const svcName = SERVICES.find((s) => s.key === st.service)?.name;
    const when = `${fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(dObj(st.date))} בשעה ${st.time}`;
    root.replaceChildren(h('div', { class: 'bk-done' },
      h('h2', null, `תודה ${first}, קיבלתי`),
      h('p', { class: 'lead' }, `${svcName}, ${when}.`),
      h('p', null, 'אני אחזור אלייך בוואטסאפ לאישור התור.'),
      h('div', { class: 'stack' }, h('a', { class: 'btn btn-wa btn-lg', href: `${WA}`, target: '_blank', rel: 'noopener', 'data-loc': 'booking' }, 'וואטסאפ למורן'), h('a', { class: 'tlink', href: '/' }, 'חזרה לעמוד הבית'))));
    window.scrollTo(0, 0);
  }

  // קישור ישיר לטיפול: /book/?s=massage
  const pre = new URLSearchParams(location.search).get('s');
  if (pre && SERVICES.some((s) => s.key === pre)) { st.service = pre; loadSlots(false); } else render();
})();
