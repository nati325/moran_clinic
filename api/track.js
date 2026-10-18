// מדידה פנימית וקלה: רק מונים מצטברים (אירוע, מיקום הכפתור, עמוד). בלי עוגיות ובלי מזהים אישיים.
import { handler, send, jsonBody, dayKey, clientIp, throttle } from './_lib/http.js';
import { pipe, storeKind } from './_lib/store.js';

const EVENTS = new Set(['pv', 'click_whatsapp', 'click_phone', 'click_booking']);
const PAGES = new Set(['/', '/massage/', '/facial-massage/', '/facial-treatment/', '/waxing/', '/eyebrows/', '/book/', '/thank-you/']);

export default handler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (storeKind() === 'none') return send(res, 204);
  if (await throttle(`trk:${clientIp(req)}`, 120, 60)) return send(res, 429, { error: 'slow_down' });
  const b = await jsonBody(req, 1000);
  const e = String(b.e || ''), l = String(b.l || ''), p = String(b.p || '');
  if (!EVENTS.has(e) || !PAGES.has(p) || (l && !/^[a-z_]{1,24}$/.test(l))) return send(res, 400, { error: 'invalid' });
  const key = `stats:${dayKey()}`;
  const cmds = [['HINCRBY', key, e, 1], ['HINCRBY', key, `${e}@${p}`, 1]];
  if (l) cmds.push(['HINCRBY', key, `${e}:${l}`, 1]);
  cmds.push(['EXPIRE', key, 400 * 86400]);
  await pipe(cmds);
  send(res, 204);
});
