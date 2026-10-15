// הגדרות שמורן משנה מהאפליקציה: מחירים ושעות. נקראות בזמן הבנייה של האתר.
import { getJSON, setJSON, storeKind } from './store.js';

export const OVERRIDES_KEY = 'site:overrides';
export const PRICE_KEYS = ['massage', 'facialMassage', 'facialTreatment', 'waxing', 'brows'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validate(input) {
  const out = { prices: {}, hours: null };
  for (const k of PRICE_KEYS) {
    const n = Number(input?.prices?.[k]);
    if (Number.isFinite(n) && n >= 10 && n <= 5000) out.prices[k] = Math.round(n);
  }
  const h = input?.hours;
  if (h && TIME.test(h.opens) && TIME.test(h.closes) && h.opens < h.closes && Array.isArray(h.days)) {
    const days = DAYS.filter((d) => h.days.includes(d));
    if (days.length) out.hours = { opens: h.opens, closes: h.closes, days };
  }
  return out;
}

export const loadOverrides = async () => (storeKind() === 'none' ? null : (await getJSON(OVERRIDES_KEY)) || null);
export const saveOverrides = (o) => setJSON(OVERRIDES_KEY, { ...o, updatedAt: new Date().toISOString() });
