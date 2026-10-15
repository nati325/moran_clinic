// אפליקציית הניהול של מורן: מסך אחד, בלי ספריות. כל הנתונים מוצגים דרך h() ו-textContent, אף פעם לא innerHTML.
const IL = 'Asia/Jerusalem';
const DAY_NAMES = [['Sunday', 'א׳'], ['Monday', 'ב׳'], ['Tuesday', 'ג׳'], ['Wednesday', 'ד׳'], ['Thursday', 'ה׳'], ['Friday', 'ו׳'], ['Saturday', 'ש׳']];
const STATUS = { requested: 'ממתין לאישור', confirmed: 'מאושר', done: 'בוצע', cancelled: 'בוטל' };
const LOC_LABELS = { hero: 'כפתור ראשי (בית)', hero_online: 'יומן אונליין (ראשי)', sticky: 'סרגל תחתון', header: 'כותרת', menu: 'תפריט', booking: 'קביעת תור (תחתית)', booking_online: 'יומן אונליין (תחתית)', footer: 'פוטר', waze: 'Waze', maps: 'Google Maps', form_open: 'טופס', thank_you: 'עמוד תודה', not_found: 'עמוד 404' };
const PAGE_LABELS = { '/': 'עמוד הבית', '/massage/': 'עיסוי גוף', '/facial-massage/': 'עיסוי פנים', '/facial-treatment/': 'טיפולי פנים', '/waxing/': 'שעווה', '/eyebrows/': 'גבות', '/thank-you/': 'תודה' };

// ── עזרים ──
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'value') value = v;
    else if (k === 'checked') el.checked = true;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  if (value !== undefined) el.value = value;
  return el;
}
const $ = (s, el = document) => el.querySelector(s);
const fmt = (opts) => new Intl.DateTimeFormat('he-IL', { timeZone: IL, ...opts });
const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: IL }).format(new Date());
const addDays = (ds, n) => { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const weekStartOf = (ds) => addDays(ds, -new Date(ds + 'T12:00:00Z').getUTCDay());
const dayLabel = (ds, o = { weekday: 'long', day: 'numeric', month: 'long' }) => fmt(o).format(new Date(ds + 'T12:00:00Z'));
const hhmm = (start) => start.slice(11, 16);
const endTime = (a) => { const [H, M] = hhmm(a.start).split(':').map(Number); const t = H * 60 + M + a.durationMin; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const digits = (s) => String(s || '').replace(/\D/g, '').replace(/^972/, '0');
const waLink = (phone) => { const d = digits(phone); return d ? `https://wa.me/972${d.replace(/^0/, '')}` : ''; };
const svcName = (key) => state.meta?.services.find((s) => s.key === key)?.name || key || '';

const state = { tab: 'today', meta: null, clients: [], appts: [], settings: null, stats: null, statsDays: 30, day: todayStr(), week: weekStartOf(todayStr()), search: '' };
const root = $('#app');

// ── רשת ──
let onUnauthorized = () => {};
async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch(`/api/${path}`, {
    method, credentials: 'same-origin',
    headers: { 'X-Requested-With': 'moran-admin', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'auth') onUnauthorized();
  if (!r.ok) throw Object.assign(new Error(data.message || 'שגיאה. נסי שוב.'), { status: r.status, data });
  return data;
}

function toast(msg, bad) {
  const t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}
const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };

// ── חלון תחתון (sheet) ──
let sheetEl = null;
function openSheet(title, ...content) {
  closeSheet();
  const close = () => closeSheet();
  sheetEl = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === sheetEl) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('h2', null, title), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'סגירה', onclick: close }, '✕')),
      h('div', { class: 'sheet-body' }, content)));
  document.body.append(sheetEl);
  document.body.classList.add('noscroll');
  const f = $('input:not([type=hidden]), select, textarea', sheetEl);
  if (f && !f.value) f.focus();
}
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; document.body.classList.remove('noscroll'); } }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ── כניסה ──
function renderLogin(msg) {
  root.replaceChildren(
    h('main', { class: 'login' },
      h('p', { class: 'brandmark', 'aria-hidden': 'true' }, 'MORAN MADAR'),
      h('h1', null, 'ניהול'),
      h('form', { onsubmit: guard(async (e) => {
        e.preventDefault();
        const btn = $('button', e.target); btn.disabled = true;
        try { await api('auth', { method: 'POST', body: { password: $('input', e.target).value } }); localStorage.setItem('mm_notrack', '1'); await boot(); }
        finally { btn.disabled = false; }
      }) },
        h('label', { for: 'pw' }, 'סיסמה'),
        h('input', { id: 'pw', type: 'password', autocomplete: 'current-password', required: true }),
        msg ? h('p', { class: 'err', role: 'alert' }, msg) : null,
        h('button', { class: 'btn btn-wa btn-lg', type: 'submit' }, 'כניסה'))));
  $('#pw')?.focus();
}
onUnauthorized = () => { closeSheet(); renderLogin(); };

// ── מבנה האפליקציה ──
const TABS = [['today', 'היום', 'M12 3v2m0 14v2M3 12h2m14 0h2M12 8a4 4 0 100 8 4 4 0 000-8z'], ['calendar', 'יומן', 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z'], ['clients', 'לקוחות', 'M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3 3 0 100-6 3 3 0 000 6m8 8v-1a4 4 0 00-3-3.9M15 5.2a3 3 0 010 5.6'], ['site', 'האתר', 'M4 6h16M4 12h16M4 18h10'], ['stats', 'סטטיסטיקה', 'M5 20V10m7 10V4m7 16v-7']];
const icon = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); s.append(p); return s; };

function render() {
  const views = { today: viewToday, calendar: viewCalendar, clients: viewClients, site: viewSite, stats: viewStats };
  const [, title] = TABS.find((t) => t[0] === state.tab);
  const main = h('main', { id: 'main', class: 'view' }, views[state.tab]());
  root.replaceChildren(
    h('header', { class: 'top' }, h('span', { class: 'brandmark', 'aria-hidden': 'true' }, 'MORAN MADAR'), h('h1', null, title),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'יציאה', onclick: guard(async () => { await api('auth', { method: 'DELETE' }); renderLogin(); }) }, 'יציאה')),
    main,
    h('nav', { class: 'tabs', 'aria-label': 'ניווט ראשי' }, TABS.map(([k, label, d]) =>
      h('button', { type: 'button', class: k === state.tab ? 'on' : '', 'aria-current': k === state.tab ? 'page' : null, onclick: () => go(k) }, icon(d), h('span', null, label)))));
}
function go(tab) { state.tab = tab; if (tab === 'stats') loadStats().then(render).catch((e) => toast(e.message, true)); render(); window.scrollTo(0, 0); }

// ── רכיבים משותפים ──
const chip = (status) => h('span', { class: `chip s-${status}` }, STATUS[status]);
function apptRow(a, { showDay } = {}) {
  return h('li', null, h('button', { type: 'button', class: 'row' + (a.status === 'cancelled' ? ' dim' : ''), onclick: () => apptSheet(a) },
    h('span', { class: 'time' }, showDay ? h('small', null, dayLabel(a.start.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'numeric' })) : null, hhmm(a.start)),
    h('span', { class: 'grow' }, h('strong', null, a.name), h('small', null, [svcName(a.service), a.source === 'cal' ? 'מ-Cal.com' : ''].filter(Boolean).join(' · '))),
    chip(a.status)));
}
const empty = (t) => h('p', { class: 'empty' }, t);
const activeAppts = (list) => list.filter((a) => a.status !== 'cancelled');

// ── היום ──
function viewToday() {
  const t = todayStr();
  const todays = state.appts.filter((a) => a.start.startsWith(t)).sort((a, b) => a.start.localeCompare(b.start));
  const pending = state.appts.filter((a) => a.status === 'requested' && a.start.slice(0, 10) >= t).sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = activeAppts(state.appts).filter((a) => a.start.slice(0, 10) > t).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
  return [
    h('p', { class: 'date' }, dayLabel(t)),
    pending.length ? h('section', null, h('h2', null, `בקשות ממתינות (${pending.length})`), h('ul', { class: 'list' }, pending.map((a) => apptRow(a, { showDay: true})))) : null,
    h('section', null, h('h2', null, 'התורים של היום'), todays.length ? h('ul', { class: 'list' }, todays.map((a) => apptRow(a))) : empty('אין תורים להיום.')),
    upcoming.length ? h('section', null, h('h2', null, 'בקרוב'), h('ul', { class: 'list' }, upcoming.map((a) => apptRow(a, { showDay: true })))) : null,
    h('button', { class: 'fab', type: 'button', onclick: () => apptSheet(null, { date: t }) }, '+ תור חדש'),
  ];
}

// ── יומן ──
function viewCalendar() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(state.week, i));
  const list = state.appts.filter((a) => a.start.startsWith(state.day)).sort((a, b) => a.start.localeCompare(b.start));
  const count = (d) => activeAppts(state.appts).filter((a) => a.start.startsWith(d)).length;
  return [
    h('div', { class: 'weekbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'שבוע קודם', onclick: () => { state.week = addDays(state.week, -7); state.day = state.week; render(); } }, '›'),
      h('strong', null, `${dayLabel(days[0], { day: 'numeric', month: 'short' })} – ${dayLabel(days[6], { day: 'numeric', month: 'short' })}`),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'שבוע הבא', onclick: () => { state.week = addDays(state.week, 7); state.day = state.week; render(); } }, '‹')),
    h('div', { class: 'days' }, days.map((d, i) => h('button', { type: 'button', class: 'day' + (d === state.day ? ' on' : '') + (d === todayStr() ? ' today' : ''), 'aria-pressed': d === state.day ? 'true' : 'false', 'aria-label': dayLabel(d), onclick: () => { state.day = d; render(); } },
      h('small', null, DAY_NAMES[i][1]), h('b', null, d.slice(8).replace(/^0/, '')), h('i', { class: count(d) ? 'dot' : '' })))),
    h('p', { class: 'date' }, dayLabel(state.day)),
    list.length ? h('ul', { class: 'list' }, list.map((a) => apptRow(a))) : empty('אין תורים ביום הזה.'),
    h('button', { class: 'fab', type: 'button', onclick: () => apptSheet(null, { date: state.day }) }, '+ תור חדש'),
  ];
}

// ── טופס תור ──
function field(label, input, id) { return h('div', { class: 'fld' }, h('label', { for: id }, label), input); }
function apptSheet(a, defaults = {}) {
  const isNew = !a;
  const cur = a || { name: '', phone: '', service: 'massage', start: `${defaults.date || todayStr()}T10:00`, durationMin: 60, status: 'confirmed', note: '', clientId: '' };
  let clientId = cur.clientId || '';
  const svc = (state.meta?.services || []).filter((s) => s.key !== 'waxingParts');
  const name = h('input', { id: 'a-name', value: cur.name, required: true, maxlength: 80, list: 'dl-clients', autocomplete: 'off' });
  const phone = h('input', { id: 'a-phone', type: 'tel', inputmode: 'tel', dir: 'ltr', value: cur.phone, maxlength: 24 });
  name.addEventListener('input', () => {
    const c = state.clients.find((x) => x.name === name.value);
    if (c) { clientId = c.id; phone.value = c.phone; } else clientId = '';
  });
  const known = svc.some((s) => s.key === cur.service) || cur.service === 'other' || !cur.service;
  const service = h('select', { id: 'a-svc', value: cur.service || 'massage' }, svc.map((s) => h('option', { value: s.key }, s.name)), h('option', { value: 'other' }, 'אחר'), known ? null : h('option', { value: cur.service }, cur.service));
  const date = h('input', { id: 'a-date', type: 'date', value: cur.start.slice(0, 10), required: true });
  const time = h('input', { id: 'a-time', type: 'time', step: 300, value: cur.start.slice(11, 16), required: true });
  const dur = h('select', { id: 'a-dur', value: String(cur.durationMin) }, [20, 30, 45, 60, 75, 90, 120, 150].map((m) => h('option', { value: String(m) }, `${m} דקות`)));
  if (!$('option[value="' + cur.durationMin + '"]', dur)) { dur.append(h('option', { value: String(cur.durationMin) }, `${cur.durationMin} דקות`)); dur.value = String(cur.durationMin); }
  const status = h('select', { id: 'a-status', value: cur.status }, Object.entries(STATUS).map(([k, v]) => h('option', { value: k }, v)));
  const note = h('textarea', { id: 'a-note', rows: 3, maxlength: 1000 }, cur.note);
  const saveClient = h('input', { id: 'a-sc', type: 'checkbox', checked: isNew });
  // מילוי משך ברירת מחדל לפי הטיפול
  service.addEventListener('change', () => { const s = svc.find((x) => x.key === service.value); if (s?.duration && isNew) dur.value = String(s.duration); });

  const save = guard(async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', e.target); btn.disabled = true;
    try {
      let cid = clientId;
      if (!cid) {
        const match = digits(phone.value).length >= 9 && state.clients.find((c) => digits(c.phone) === digits(phone.value));
        if (match) cid = match.id;
        else if (saveClient.checked && name.value.trim()) {
          const r = await api('clients', { method: 'POST', body: { name: name.value, phone: phone.value } });
          state.clients.push(r.client); cid = r.client.id;
        }
      }
      const payload = { ...(a ? { id: a.id } : {}), clientId: cid, name: name.value, phone: phone.value, service: service.value, start: `${date.value}T${time.value}`, durationMin: Number(dur.value), status: status.value, note: note.value };
      const r = await api('appointments', { method: a ? 'PUT' : 'POST', body: payload });
      const i = state.appts.findIndex((x) => x.id === r.appointment.id);
      if (i >= 0) state.appts[i] = r.appointment; else state.appts.push(r.appointment);
      if (r.appointment.status === 'done') state.clients = (await api('clients')).clients;
      closeSheet(); render(); toast('נשמר');
    } finally { btn.disabled = false; }
  });
  const wa = waLink(cur.phone);
  openSheet(isNew ? 'תור חדש' : 'תור', h('form', { onsubmit: save },
    cur.source === 'cal' && cur.status === 'requested' ? h('p', { class: 'hint' }, 'הבקשה הגיעה מ-Cal.com. האישור הסופי למטופלת נעשה שם: ', h('a', { href: 'https://app.cal.com/bookings/unconfirmed', target: '_blank', rel: 'noopener' }, 'פתחי בקשות ממתינות')) : null,
    field('שם', name, 'a-name'), h('datalist', { id: 'dl-clients' }, state.clients.map((c) => h('option', { value: c.name }))),
    field('טלפון', phone, 'a-phone'),
    field('טיפול', service, 'a-svc'),
    h('div', { class: 'two' }, field('תאריך', date, 'a-date'), field('שעה', time, 'a-time')),
    h('div', { class: 'two' }, field('משך', dur, 'a-dur'), field('סטטוס', status, 'a-status')),
    field('הערות', note, 'a-note'),
    isNew ? h('label', { class: 'check' }, saveClient, ' שמרי גם ככרטיס לקוחה') : null,
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-wa', type: 'submit' }, 'שמירה'),
      wa ? h('a', { class: 'btn btn-soft', href: wa, target: '_blank', rel: 'noopener' }, 'וואטסאפ') : null,
      !isNew && cur.status !== 'done' ? h('button', { class: 'btn btn-soft', type: 'button', onclick: (e) => { status.value = 'done'; e.target.closest('form').requestSubmit(); } }, 'סמני כבוצע') : null,
      !isNew ? h('button', { class: 'btn link-danger', type: 'button', onclick: guard(async () => { if (!confirm('למחוק את התור?')) return; await api(`appointments?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' }); state.appts = state.appts.filter((x) => x.id !== a.id); closeSheet(); render(); }) }, 'מחיקה') : null)));
}

// ── לקוחות ──
function viewClients() {
  const q = state.search.trim().toLowerCase();
  const list = state.clients.filter((c) => !q || c.name.toLowerCase().includes(q) || digits(c.phone).includes(digits(q) || '\u0000'));
  const lastVisit = (c) => (c.visits || []).map((v) => v.date).sort().pop();
  const search = h('input', { type: 'search', class: 'search', placeholder: 'חיפוש לפי שם או טלפון', 'aria-label': 'חיפוש לקוחות', value: state.search });
  search.addEventListener('input', () => { state.search = search.value; const pos = search.selectionStart; render(); const s = $('.search'); s.focus(); s.setSelectionRange(pos, pos); });
  return [
    search,
    list.length ? h('ul', { class: 'list' }, list.map((c) => h('li', null, h('button', { type: 'button', class: 'row', onclick: () => clientSheet(c) },
      h('span', { class: 'grow' }, h('strong', null, c.name), h('small', { dir: 'ltr' }, c.phone || '')),
      h('small', null, lastVisit(c) ? `ביקור אחרון ${dayLabel(lastVisit(c), { day: 'numeric', month: 'short' })}` : ''))))) : empty(state.clients.length ? 'לא נמצאו לקוחות.' : 'עוד אין לקוחות. הוסיפי את הראשונה.'),
    h('button', { class: 'fab', type: 'button', onclick: () => clientSheet(null) }, '+ לקוחה חדשה'),
  ];
}
function clientSheet(c) {
  const isNew = !c;
  const cur = c || { name: '', phone: '', notes: '', visits: [] };
  const name = h('input', { id: 'c-name', value: cur.name, required: true, maxlength: 80 });
  const phone = h('input', { id: 'c-phone', type: 'tel', inputmode: 'tel', dir: 'ltr', value: cur.phone, maxlength: 24 });
  const notes = h('textarea', { id: 'c-notes', rows: 5, maxlength: 4000, placeholder: 'רגישויות, העדפות, מה חשוב לזכור…' }, cur.notes);
  const visits = (cur.visits || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = c ? activeAppts(state.appts).filter((a) => (a.clientId === c.id || (digits(a.phone) && digits(a.phone) === digits(c.phone))) && a.start.slice(0, 10) >= todayStr()).sort((a, b) => a.start.localeCompare(b.start)) : [];
  const save = guard(async (e) => {
    e.preventDefault();
    const payload = { ...(c ? { id: c.id, visits: cur.visits } : {}), name: name.value, phone: phone.value, notes: notes.value };
    const r = await api('clients', { method: c ? 'PUT' : 'POST', body: payload });
    const i = state.clients.findIndex((x) => x.id === r.client.id);
    if (i >= 0) state.clients[i] = r.client; else state.clients.push(r.client);
    state.clients.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    closeSheet(); render(); toast('נשמר');
  });
  const wa = waLink(cur.phone);
  const visitForm = c ? h('form', { class: 'visit-form', onsubmit: guard(async (e) => {
    e.preventDefault();
    const f = e.target;
    const v = { id: crypto.randomUUID(), date: f.vdate.value, service: f.vsvc.value, note: f.vnote.value };
    const r = await api('clients', { method: 'PUT', body: { id: c.id, name: c.name, phone: c.phone, notes: notes.value, visits: [v, ...(cur.visits || [])] } });
    const i = state.clients.findIndex((x) => x.id === c.id); state.clients[i] = r.client;
    clientSheet(r.client); render(); toast('הביקור נוסף');
  }) },
    h('h3', null, 'הוספת ביקור'),
    h('div', { class: 'two' }, h('input', { name: 'vdate', type: 'date', value: todayStr(), required: true, 'aria-label': 'תאריך' }), h('select', { name: 'vsvc', 'aria-label': 'טיפול' }, (state.meta?.services || []).filter((s) => s.key !== 'waxingParts').map((s) => h('option', { value: s.name }, s.name)))),
    h('input', { name: 'vnote', placeholder: 'הערה (לא חובה)', maxlength: 500, 'aria-label': 'הערה' }),
    h('button', { class: 'btn btn-soft', type: 'submit' }, 'הוספה')) : null;
  openSheet(isNew ? 'לקוחה חדשה' : c.name, h('form', { onsubmit: save },
    field('שם', name, 'c-name'), field('טלפון', phone, 'c-phone'), field('הערות', notes, 'c-notes'),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-wa', type: 'submit' }, 'שמירה'),
      wa ? h('a', { class: 'btn btn-soft', href: wa, target: '_blank', rel: 'noopener' }, 'וואטסאפ') : null,
      cur.phone ? h('a', { class: 'btn btn-soft', href: `tel:${digits(cur.phone)}` }, 'חיוג') : null,
      !isNew ? h('button', { class: 'btn link-danger', type: 'button', onclick: guard(async () => { if (!confirm(`למחוק את ${c.name}? התורים שלה יישארו ביומן.`)) return; await api(`clients?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' }); state.clients = state.clients.filter((x) => x.id !== c.id); closeSheet(); render(); }) }, 'מחיקה') : null)),
    upcoming.length ? h('section', null, h('h3', null, 'תורים קרובים'), h('ul', { class: 'list' }, upcoming.map((a) => apptRow(a, { showDay: true })))) : null,
    visitForm,
    visits.length ? h('section', null, h('h3', null, 'היסטוריית טיפולים'), h('ul', { class: 'list' }, visits.map((v) => h('li', { class: 'visit' }, h('span', { class: 'time' }, dayLabel(v.date, { day: 'numeric', month: 'short', year: '2-digit' })), h('span', { class: 'grow' }, h('strong', null, svcName(v.service)), v.note ? h('small', null, v.note) : null))))) : null);
}

// ── האתר: מחירים ושעות ──
function viewSite() {
  const s = state.settings || {};
  const ov = s.overrides || {};
  const meta = state.meta;
  const priceInputs = meta.services.filter((x) => x.price != null && x.key !== 'waxingParts').map((x) =>
    field(x.name, h('input', { id: `p-${x.key}`, name: x.key, type: 'number', inputmode: 'numeric', min: 10, max: 5000, step: 10, value: String(ov.prices?.[x.key] ?? x.price), dir: 'ltr' }), `p-${x.key}`));
  const hours = ov.hours || meta.hours;
  const opens = h('input', { id: 'h-open', type: 'time', value: hours.opens, required: true });
  const closes = h('input', { id: 'h-close', type: 'time', value: hours.closes, required: true });
  const dayBtns = DAY_NAMES.map(([en, he]) => h('label', { class: 'daychip' }, h('input', { type: 'checkbox', name: 'day', value: en, checked: hours.days.includes(en) }), h('span', null, he)));
  const unpublished = ov.updatedAt && (!s.published || s.published.version !== ov.updatedAt);
  const collect = () => ({
    prices: Object.fromEntries(meta.services.filter((x) => x.price != null && x.key !== 'waxingParts').map((x) => [x.key, Number($(`#p-${x.key}`).value)])),
    hours: { opens: opens.value, closes: closes.value, days: [...document.querySelectorAll('input[name=day]:checked')].map((i) => i.value) },
  });
  const saveDraft = async () => { const r = await api('settings', { method: 'PUT', body: collect() }); state.settings = { ...(await api('settings')) }; return r; };
  return [
    h('p', { class: 'hint' }, 'השינויים נשמרים כטיפוס ומתפרסמים באתר רק כשלוחצים "פרסום לאתר". הפרסום לוקח כדקה.'),
    unpublished ? h('p', { class: 'banner' }, 'יש שינויים שעוד לא פורסמו באתר.') : (s.published ? h('p', { class: 'hint' }, `פורסם לאחרונה: ${fmt({ dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s.published.at))}`) : null),
    h('section', null, h('h2', null, 'מחירים (₪)'), priceInputs),
    h('section', null, h('h2', null, 'שעות פעילות'), h('div', { class: 'two' }, field('פתיחה', opens, 'h-open'), field('סגירה', closes, 'h-close')), h('div', { class: 'days-row', role: 'group', 'aria-label': 'ימי פעילות' }, dayBtns)),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-soft', type: 'button', onclick: guard(async () => { await saveDraft(); render(); toast('נשמר כטיוטה'); }) }, 'שמירה כטיוטה'),
      h('button', { class: 'btn btn-wa', type: 'button', onclick: guard(async () => {
        await saveDraft();
        if (!s.deployHook) { render(); toast('נשמר. עדיין לא חובר קישור פרסום ב-Vercel.', true); return; }
        await api('publish', { method: 'POST' });
        state.settings = await api('settings'); render(); toast('הפרסום התחיל. האתר יתעדכן בעוד כדקה.');
      }) }, 'פרסום לאתר')),
    !s.deployHook ? h('p', { class: 'hint' }, 'כדי לפרסם מכאן צריך לחבר "Deploy Hook" ב-Vercel (הוראות ב-README).') : null,
  ];
}

// ── סטטיסטיקה ──
async function loadStats() { state.stats = await api(`stats?days=${state.statsDays}`); }
function viewStats() {
  const d = state.stats?.days;
  if (!d) return [empty('טוען…')];
  const sum = (k) => d.reduce((n, x) => n + (x.counts[k] || 0), 0);
  const inq = (x) => (x.counts.click_whatsapp || 0) + (x.counts.click_phone || 0) + (x.counts.click_booking || 0);
  const max = Math.max(1, ...d.map(inq));
  const W = 320, Hh = 90, bw = W / d.length;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`); svg.setAttribute('role', 'img'); svg.setAttribute('class', 'chart');
  svg.setAttribute('aria-label', `פניות ליום ב-${d.length} הימים האחרונים. סך הכל ${d.reduce((n, x) => n + inq(x), 0)}.`);
  d.forEach((x, i) => { const v = inq(x), hh = (v / max) * (Hh - 8); const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('x', String(i * bw + 1)); r.setAttribute('width', String(Math.max(1, bw - 2))); r.setAttribute('y', String(Hh - hh)); r.setAttribute('height', String(Math.max(v ? 2 : 0, hh))); r.setAttribute('fill', 'currentColor'); const t = document.createElementNS('http://www.w3.org/2000/svg', 'title'); t.textContent = `${x.date}: ${v}`; r.append(t); svg.append(r); });
  const rows = (prefix, labels) => {
    const keys = {};
    for (const x of d) for (const [k, v] of Object.entries(x.counts)) if (k.startsWith(prefix)) keys[k.slice(prefix.length)] = (keys[k.slice(prefix.length)] || 0) + v;
    return Object.entries(keys).sort((a, b) => b[1] - a[1]).map(([k, v]) => h('tr', null, h('td', null, labels[k] || k), h('td', { class: 'num' }, v)));
  };
  const pagesTbl = (() => {
    const out = {};
    for (const x of d) for (const [k, v] of Object.entries(x.counts)) { const m = k.match(/^(pv|click_whatsapp|click_phone|click_booking)@(.+)$/); if (m) { out[m[2]] ||= { pv: 0, q: 0 }; if (m[1] === 'pv') out[m[2]].pv += v; else out[m[2]].q += v; } }
    return Object.entries(out).sort((a, b) => b[1].pv - a[1].pv).map(([p, v]) => h('tr', null, h('td', null, PAGE_LABELS[p] || p), h('td', { class: 'num' }, v.pv), h('td', { class: 'num' }, v.q)));
  })();
  const tile = (label, n) => h('div', { class: 'tile' }, h('b', null, String(n)), h('small', null, label));
  const pending = state.appts.filter((a) => a.status === 'requested').length;
  return [
    h('div', { class: 'seg', role: 'group', 'aria-label': 'טווח' }, [7, 30, 90].map((n) => h('button', { type: 'button', class: state.statsDays === n ? 'on' : '', onclick: () => { state.statsDays = n; state.stats = null; render(); loadStats().then(render).catch((e) => toast(e.message, true)); } }, `${n} ימים`))),
    h('div', { class: 'tiles' }, tile('פניות (סה״כ)', d.reduce((n, x) => n + inq(x), 0)), tile('וואטסאפ', sum('click_whatsapp')), tile('חיוגים', sum('click_phone')), tile('יומן אונליין', sum('click_booking')), tile('צפיות בעמודים', sum('pv')), tile('בקשות ממתינות', pending)),
    h('section', null, h('h2', null, 'פניות ליום'), svg, h('p', { class: 'hint' }, `${dayLabel(d[0].date, { day: 'numeric', month: 'short' })} – ${dayLabel(d.at(-1).date, { day: 'numeric', month: 'short' })}`)),
    pagesTbl.length ? h('section', null, h('h2', null, 'לפי עמוד'), h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'עמוד'), h('th', { class: 'num' }, 'צפיות'), h('th', { class: 'num' }, 'פניות'))), h('tbody', null, pagesTbl))) : null,
    h('section', null, h('h2', null, 'מאיפה לחצו על וואטסאפ'), h('table', { class: 'tbl' }, h('tbody', null, rows('click_whatsapp:', LOC_LABELS)))),
    h('p', { class: 'hint' }, 'המדידה לא שומרת שום פרט אישי, רק מונים. הכניסות שלך ממכשיר זה לא נספרות.'),
  ];
}

// ── אתחול ──
async function boot() {
  state.meta = await (await fetch('/admin/meta.json', { cache: 'no-cache' })).json();
  const [c, a, s] = await Promise.all([api('clients'), api('appointments'), api('settings')]);
  state.clients = c.clients; state.appts = a.appointments; state.settings = s;
  render();
}

(async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
  try {
    await api('auth');
    localStorage.setItem('mm_notrack', '1');
    await boot();
  } catch (e) {
    if (e.status === 503) renderLogin(e.data?.message || 'האפליקציה עוד לא הוגדרה בשרת.');
    else if (e.status === 401) renderLogin();
    else renderLogin('אין חיבור לשרת. נסי שוב.');
  }
})();
