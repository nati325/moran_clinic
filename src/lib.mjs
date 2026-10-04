import { site, services } from './config.mjs';

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const abs = (p) => site.url.replace(/\/$/, '') + p;

export const waLink = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

export const telLink = `tel:${site.phoneIntl}`;

// node build.mjs --prod → האתר לגולשים: בלי placeholders בכלל
export const PROD = process.argv.includes('--prod');
const missing = (label) => (PROD ? '' : label);

export const dur = (s) => s.durLabel ?? (s.duration ? `${s.duration} דקות` : missing('[משך]'));
export const durShort = (s) => s.durLabel ?? (s.duration ? `${s.duration} דק'` : missing('[משך]'));
export const price = (s) => s.priceLabel ?? (s.price ? `${s.price} ₪` : missing('[מחיר]'));

export const S = services;

const DAY_HE = {
  Sunday: "א'",
  Monday: "ב'",
  Tuesday: "ג'",
  Wednesday: "ד'",
  Thursday: "ה'",
  Friday: "ו'",
  Saturday: 'שבת',
};
const ORDER = Object.keys(DAY_HE);

export function daysText() {
  const d = site.hours.days;
  if (!d.length) return '[ימי פעילות]';
  const idx = d.map((x) => ORDER.indexOf(x)).sort((a, b) => a - b);
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && idx.length > 2) return `ימים ${DAY_HE[ORDER[idx[0]]]}–${DAY_HE[ORDER[idx.at(-1)]]}`;
  return 'ימים ' + idx.map((i) => DAY_HE[ORDER[i]]).join(', ');
}

export const hoursRange = () => `${site.hours.opens}–${site.hours.closes}`;
export const hoursHtml = () =>
  `<span dir="ltr"><time datetime="${site.hours.opens}">${site.hours.opens}</time>–<time datetime="${site.hours.closes}">${site.hours.closes}</time></span>`;

export const fullAddress = () => `${site.street}, ${site.city}`;
export const nearbyText = () => {
  const n = site.nearby;
  return n.slice(0, -1).join(', ') + ' ו' + n.at(-1);
};
