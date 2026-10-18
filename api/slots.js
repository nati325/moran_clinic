// ציבורי: שעות פנויות לטיפול בטווח תאריכים. לא חושף שום פרט על תורים קיימים.
import { handler, send, clientIp, throttle, DATE } from './_lib/http.js';
import { storeKind } from './_lib/store.js';
import { BOOKABLE, loadConfig, activeAppts, computeSlots, nowLocal, addDays } from './_lib/booking.js';

export default handler(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'method' });
  if (storeKind() === 'none') return send(res, 503, { error: 'unavailable', message: 'ההזמנה אונליין עדיין לא זמינה.' });
  if (await throttle(`slots:${clientIp(req)}`, 90, 60)) return send(res, 429, { error: 'slow_down' });
  const q = new URL(req.url, 'http://x').searchParams;
  const svc = BOOKABLE[q.get('service')];
  if (!svc) return send(res, 400, { error: 'invalid' });
  const today = nowLocal().slice(0, 10);
  const from = DATE.test(q.get('from') || '') && q.get('from') > today ? q.get('from') : today;
  const days = Math.min(21, Math.max(1, Number(q.get('days')) || 14));
  const cfg = await loadConfig();
  const slots = computeSlots(cfg, await activeAppts(), svc.duration, from, days);
  send(res, 200, { from, days, next: addDays(from, days), maxDate: addDays(today, cfg.maxDaysAhead), slots });
});
