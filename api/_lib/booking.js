// לוגיקת ההזמנות: זמינות, חישוב שעות פנויות ובדיקת התנגשויות. כל השעות בשעון ישראל, כמחרוזות מקומיות.
import { getJSON, setJSON, hgetallJSON } from './store.js';
import { OVERRIDES_KEY } from './overrides.js';

export const CONFIG_KEY = 'booking:config';
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// הטיפולים שאפשר להזמין אונליין. המשכים כאן הם פנימיים ולא מוצגים לגולשת (שעווה לפי אזור: בתיאום בוואטסאפ).
// אם משנים כאן, לעדכן גם את ה-duration ב-src/config.mjs.
export const BOOKABLE = {
  massage: { name: 'עיסוי גוף', duration: 60 },
  facialMassage: { name: 'עיסוי פנים, דקולטה וקרקפת', duration: 60 },
  facialTreatment: { name: 'טיפול פנים (קוסמטיקה)', duration: 60 },
  brows: { name: 'עיצוב גבות + שפם', duration: 20 },
};

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function nowLocal(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export const addDays = (ds, n) => { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const weekdayOf = (ds) => DAYS[new Date(ds + 'T12:00:00Z').getUTCDay()];

export async function defaultConfig() {
  const h = (await getJSON(OVERRIDES_KEY))?.hours || { opens: '09:00', closes: '21:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] };
  return {
    step: 30, bufferMin: 0, minNoticeHours: 3, maxDaysAhead: 45,
    week: Object.fromEntries(DAYS.map((d) => [d, { open: h.days.includes(d), from: h.opens, to: h.closes }])),
    blocked: [],
  };
}
export async function loadConfig() {
  const def = await defaultConfig();
  const saved = await getJSON(CONFIG_KEY);
  return saved ? { ...def, ...saved, week: { ...def.week, ...saved.week } } : def;
}

export function validateConfig(i) {
  const num = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : d; };
  const out = {
    step: [15, 20, 30, 45, 60].includes(Number(i?.step)) ? Number(i.step) : 30,
    bufferMin: num(i?.bufferMin, 0, 120, 0),
    minNoticeHours: num(i?.minNoticeHours, 0, 168, 3),
    maxDaysAhead: num(i?.maxDaysAhead, 7, 180, 45),
    week: {},
    blocked: [],
  };
  for (const d of DAYS) {
    const w = i?.week?.[d] || {};
    const from = TIME.test(w.from) ? w.from : '09:00';
    const to = TIME.test(w.to) && w.to > from ? w.to : '21:00';
    out.week[d] = { open: Boolean(w.open), from, to: to > from ? to : '21:00' };
  }
  for (const b of Array.isArray(i?.blocked) ? i.blocked.slice(0, 100) : []) {
    if (DATE.test(b?.from) && DATE.test(b?.to) && b.from <= b.to) out.blocked.push({ from: b.from, to: b.to, note: typeof b.note === 'string' ? b.note.trim().slice(0, 80) : '' });
  }
  return out;
}
export const saveConfig = (c) => setJSON(CONFIG_KEY, c);

export const activeAppts = async () => (await hgetallJSON('appts')).filter((a) => a.status === 'requested' || a.status === 'confirmed');

// שעות פנויות לטווח תאריכים: { 'YYYY-MM-DD': ['09:00', ...] }
export function computeSlots(cfg, appts, duration, fromDate, days, now = nowLocal()) {
  const out = {};
  const [today, nowT] = now.split('T');
  const earliest = toMin(nowT) + cfg.minNoticeHours * 60;
  const last = addDays(today, cfg.maxDaysAhead);
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    out[date] = [];
    if (date < today || date > last) continue;
    const w = cfg.week[weekdayOf(date)];
    if (!w?.open || cfg.blocked.some((b) => date >= b.from && date <= b.to)) continue;
    const busy = appts.filter((a) => a.start.startsWith(date)).map((a) => [toMin(a.start.slice(11, 16)) - cfg.bufferMin, toMin(a.start.slice(11, 16)) + a.durationMin + cfg.bufferMin]);
    const open = toMin(w.from), close = toMin(w.to);
    for (let m = open; m + duration <= close; m += cfg.step) {
      if (date === today && m < earliest) continue;
      // התור החדש [m, m+duration) לא חופף לאף תור קיים (כולל מרווח)
      if (busy.some(([s, e]) => m < e && m + duration > s)) continue;
      out[date].push(fromMin(m));
    }
  }
  return out;
}
