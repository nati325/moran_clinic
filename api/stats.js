// סטטיסטיקת פניות: ספירה יומית של לחיצות וצפיות (בלי נתונים אישיים).
import { handler, send, guard, dayKey } from './_lib/http.js';
import { pipe } from './_lib/store.js';

export default handler(async (req, res) => {
  if (!guard(req, res)) return;
  const days = Math.min(90, Math.max(1, Number(new URL(req.url, 'http://x').searchParams.get('days')) || 30));
  const dates = Array.from({ length: days }, (_, i) => dayKey(new Date(Date.now() - i * 864e5))).reverse();
  const rows = await pipe(dates.map((d) => ['HGETALL', `stats:${d}`]));
  const out = dates.map((date, i) => {
    const flat = rows[i] || [], counts = {};
    for (let j = 0; j < flat.length; j += 2) counts[flat[j]] = Number(flat[j + 1]);
    return { date, counts };
  });
  send(res, 200, { days: out });
});
