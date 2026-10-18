// יומן ותורים: ידניים, ובקשות מעמוד ההזמנה באתר (api/book).
import { handler, send, jsonBody, guard, newId, str, DATETIME } from './_lib/http.js';
import { hgetallJSON, hsetJSON, hgetJSON, hdel } from './_lib/store.js';

const KEY = 'appts';
const STATUSES = ['requested', 'confirmed', 'done', 'cancelled'];

function clean(i, old = {}) {
  const start = DATETIME.test(i.start) ? i.start : old.start;
  return {
    id: old.id || newId(),
    clientId: str(i.clientId ?? old.clientId ?? '', 60),
    name: str(i.name ?? old.name, 80),
    phone: str(i.phone ?? old.phone ?? '', 24).replace(/[^\d+\-\s]/g, ''),
    service: str(i.service ?? old.service ?? '', 60),
    start,
    durationMin: Math.min(480, Math.max(5, Number(i.durationMin ?? old.durationMin) || 60)),
    status: STATUSES.includes(i.status) ? i.status : old.status || 'confirmed',
    note: str(i.note ?? old.note ?? '', 1000),
    source: old.source || 'manual',
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// כשתור מסומן "בוצע" ויש לקוחה מקושרת: נרשם ביקור בכרטיס שלה (פעם אחת לכל תור)
async function recordVisit(a) {
  if (a.status !== 'done' || !a.clientId) return;
  const c = await hgetJSON('clients', a.clientId);
  if (!c || (c.visits || []).some((v) => v.apptId === a.id)) return;
  c.visits = [{ id: newId(), date: a.start.slice(0, 10), service: a.service, note: a.note, apptId: a.id }, ...(c.visits || [])].slice(0, 300);
  c.updatedAt = new Date().toISOString();
  await hsetJSON('clients', c.id, c);
}

export default handler(async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method === 'GET') {
    const all = await hgetallJSON(KEY);
    return send(res, 200, { appointments: all.sort((a, b) => a.start.localeCompare(b.start)) });
  }
  if (req.method === 'POST') {
    const body = await jsonBody(req);
    const a = clean(body);
    if (!a.name || !a.start) return send(res, 400, { error: 'invalid', message: 'צריך שם ותאריך ושעה.' });
    await hsetJSON(KEY, a.id, a);
    await recordVisit(a);
    return send(res, 201, { appointment: a });
  }
  if (req.method === 'PUT') {
    const body = await jsonBody(req);
    const old = await hgetJSON(KEY, String(body.id || ''));
    if (!old) return send(res, 404, { error: 'not_found' });
    const a = clean(body, old);
    if (!a.name || !a.start) return send(res, 400, { error: 'invalid', message: 'צריך שם ותאריך ושעה.' });
    await hsetJSON(KEY, a.id, a);
    await recordVisit(a);
    return send(res, 200, { appointment: a });
  }
  if (req.method === 'DELETE') {
    await hdel(KEY, new URL(req.url, 'http://x').searchParams.get('id') || '');
    return send(res, 200, { ok: true });
  }
  send(res, 405, { error: 'method' });
});
