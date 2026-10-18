// ציבורי: בקשת תור. נכנסת ליומן כ"ממתין לאישור", ומורן מאשרת מהאפליקציה.
import { handler, send, jsonBody, clientIp, throttle, newId, str, DATETIME } from './_lib/http.js';
import { storeKind, hsetJSON, hgetallJSON, run } from './_lib/store.js';
import { BOOKABLE, loadConfig, activeAppts, computeSlots } from './_lib/booking.js';

const phoneDigits = (s) => String(s || '').replace(/\D/g, '').replace(/^972/, '0');

async function notify(a, svcName) {
  const url = process.env.NOTIFY_URL; // למשל https://ntfy.sh/<נושא-סודי>: התראה לטלפון של מורן
  if (!url) return;
  const when = `${a.start.slice(8, 10)}/${a.start.slice(5, 7)} ${a.start.slice(11, 16)}`;
  try {
    await fetch(url, { method: 'POST', headers: { Title: 'New booking request', Priority: 'high' }, body: `${a.name} · ${svcName} · ${when}`, signal: AbortSignal.timeout(3000) });
  } catch { /* התראה היא בונוס: לא מכשילה הזמנה */ }
}

export default handler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (storeKind() === 'none') return send(res, 503, { error: 'unavailable', message: 'ההזמנה אונליין עדיין לא זמינה. אפשר לכתוב לי בוואטסאפ.' });
  const ip = clientIp(req);
  if (await throttle(`book:${ip}`, 6, 3600)) return send(res, 429, { error: 'slow_down', message: 'יותר מדי ניסיונות. אפשר לכתוב לי בוואטסאפ.' });
  const b = await jsonBody(req, 5000);
  if (b.website) return send(res, 200, { ok: true }); // מלכודת בוטים
  const svc = BOOKABLE[b.service];
  const name = str(b.name, 80), note = str(b.note, 500);
  const phone = str(b.phone, 24).replace(/[^\d+\-\s]/g, '');
  const pd = phoneDigits(phone);
  const start = String(b.start || '');
  if (!svc || !DATETIME.test(start) || !name || pd.length < 9 || pd.length > 10) return send(res, 400, { error: 'invalid', message: 'בדקי שהשם והטלפון מלאים ושנבחרו טיפול ושעה.' });

  // מונע שתי הזמנות לאותה שעה במקביל
  if ((await run('INCR', `lock:${start}`)) > 1) return send(res, 409, { error: 'taken', message: 'השעה הזו נתפסה הרגע. אפשר לבחור שעה אחרת.' });
  await run('EXPIRE', `lock:${start}`, 15);

  const date = start.slice(0, 10), time = start.slice(11, 16);
  const cfg = await loadConfig();
  const free = computeSlots(cfg, await activeAppts(), svc.duration, date, 1)[date] || [];
  if (!free.includes(time)) return send(res, 409, { error: 'taken', message: 'השעה הזו כבר לא פנויה. אפשר לבחור שעה אחרת.' });

  // קישור ללקוחה קיימת לפי טלפון, או כרטיס חדש
  const clients = await hgetallJSON('clients');
  let client = clients.find((c) => phoneDigits(c.phone) === pd);
  const now = new Date().toISOString();
  if (!client) {
    client = { id: newId(), name, phone, notes: '', visits: [], createdAt: now, updatedAt: now };
    await hsetJSON('clients', client.id, client);
  }
  const a = { id: newId(), clientId: client.id, name, phone, service: b.service, start, durationMin: svc.duration, status: 'requested', note, source: 'site', createdAt: now, updatedAt: now };
  await hsetJSON('appts', a.id, a);
  await notify(a, svc.name);
  send(res, 201, { ok: true, summary: { service: svc.name, date, time, durationMin: svc.duration } });
});
