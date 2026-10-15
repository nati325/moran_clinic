// לקוחות והערות. הכל מאחורי התחברות.
import { handler, send, jsonBody, guard, newId, str } from './_lib/http.js';
import { hgetallJSON, hsetJSON, hgetJSON, hdel } from './_lib/store.js';

const KEY = 'clients';
const phoneOf = (v) => str(v, 24).replace(/[^\d+\-\s]/g, '');
const dateOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

function clean(input, old = {}) {
  const visits = Array.isArray(input.visits) ? input.visits : old.visits || [];
  return {
    id: old.id || newId(),
    name: str(input.name, 80),
    phone: phoneOf(input.phone),
    notes: str(input.notes, 4000),
    visits: visits.slice(0, 300).map((v) => ({
      id: typeof v.id === 'string' ? v.id.slice(0, 60) : newId(),
      date: dateOk(v.date) || '',
      service: str(v.service, 60),
      note: str(v.note, 500),
      ...(v.apptId ? { apptId: str(v.apptId, 60) } : {}),
    })).filter((v) => v.date),
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default handler(async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method === 'GET') {
    const all = await hgetallJSON(KEY);
    return send(res, 200, { clients: all.sort((a, b) => a.name.localeCompare(b.name, 'he')) });
  }
  if (req.method === 'POST') {
    const c = clean(await jsonBody(req));
    if (!c.name) return send(res, 400, { error: 'name_required', message: 'צריך שם.' });
    await hsetJSON(KEY, c.id, c);
    return send(res, 201, { client: c });
  }
  if (req.method === 'PUT') {
    const body = await jsonBody(req);
    const old = await hgetJSON(KEY, String(body.id || ''));
    if (!old) return send(res, 404, { error: 'not_found' });
    const c = clean(body, old);
    if (!c.name) return send(res, 400, { error: 'name_required', message: 'צריך שם.' });
    await hsetJSON(KEY, c.id, c);
    return send(res, 200, { client: c });
  }
  if (req.method === 'DELETE') {
    const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
    await hdel(KEY, id);
    return send(res, 200, { ok: true });
  }
  send(res, 405, { error: 'method' });
});
