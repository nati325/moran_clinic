// Webhook מ-Cal.com: כל בקשה, אישור, שינוי או ביטול נכנסים ליומן של מורן.
// ב-Cal.com: Settings → Developer → Webhooks → כתובת https://<הדומיין>/api/cal-webhook ו-Secret זהה ל-CAL_WEBHOOK_SECRET.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { handler, send, rawBody, newId } from './_lib/http.js';
import { run, hgetallJSON, hsetJSON, hgetJSON, pipe, storeKind } from './_lib/store.js';

const IL = 'Asia/Jerusalem';
const toLocal = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: IL, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};
const digits = (s) => String(s || '').replace(/\D/g, '').replace(/^972/, '0');
const val = (r) => (r && typeof r === 'object' && 'value' in r ? r.value : r);

function pickPhone(p) {
  const a = (p.attendees || [])[0] || {};
  if (a.phoneNumber) return a.phoneNumber;
  for (const [k, v] of Object.entries(p.responses || {})) if (/phone|טלפון|mobile|נייד/i.test(k + ' ' + (v?.label || ''))) return String(val(v) || '');
  return '';
}

export default handler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret || storeKind() === 'none') return send(res, 503, { error: 'not_configured' });
  const raw = await rawBody(req, 100_000);
  const want = createHmac('sha256', secret).update(raw).digest('hex');
  const got = String(req.headers['x-cal-signature-256'] || '');
  if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return send(res, 401, { error: 'bad_signature' });

  let evt;
  try { evt = JSON.parse(raw); } catch { return send(res, 400, { error: 'bad_json' }); }
  // יומן אירועים אחרונים לבדיקה (10 האחרונים)
  await pipe([['LPUSH', 'calog', JSON.stringify({ at: new Date().toISOString(), event: evt.triggerEvent, payload: evt.payload }).slice(0, 6000)], ['LTRIM', 'calog', 0, 9]]);

  const t = evt.triggerEvent, p = evt.payload || {};
  const status = { BOOKING_REQUESTED: 'requested', BOOKING_CREATED: p.status === 'PENDING' ? 'requested' : 'confirmed', BOOKING_RESCHEDULED: 'confirmed', BOOKING_CANCELLED: 'cancelled', BOOKING_REJECTED: 'cancelled' }[t];
  if (!status || !p.uid) return send(res, 200, { ok: true, ignored: t });

  const att = (p.attendees || [])[0] || {};
  const start = toLocal(p.startTime);
  if (!start) return send(res, 200, { ok: true, ignored: 'no_start' });
  const id = `cal_${String(p.uid).slice(0, 60)}`;
  const old = await hgetJSON('appts', id);
  const phone = pickPhone(p);
  const name = String(att.name || val(p.responses?.name) || 'מבקשת תור').slice(0, 80);

  // קישור ללקוחה לפי טלפון (או יצירה, אם יש טלפון)
  let clientId = old?.clientId || '';
  if (!clientId && digits(phone).length >= 9) {
    const found = (await hgetallJSON('clients')).find((c) => digits(c.phone) === digits(phone));
    if (found) clientId = found.id;
    else {
      clientId = newId();
      await hsetJSON('clients', clientId, { id: clientId, name, phone: phone.slice(0, 24), notes: '', visits: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }
  const dur = Math.round((new Date(p.endTime) - new Date(p.startTime)) / 60000);
  await hsetJSON('appts', id, {
    id, clientId, name, phone: phone.slice(0, 24).replace(/[^\d+\-\s]/g, ''),
    service: String(p.title || p.type || '').slice(0, 60),
    start, durationMin: Number.isFinite(dur) && dur > 0 ? Math.min(dur, 480) : 60,
    // סטטוס "בוצע" שמורן סימנה לא נדרס על ידי אירוע ישן
    status: old?.status === 'done' && status === 'confirmed' ? 'done' : status,
    note: String(p.additionalNotes || val(p.responses?.notes) || old?.note || '').slice(0, 1000),
    source: 'cal', calUid: String(p.uid).slice(0, 60),
    createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  send(res, 200, { ok: true });
});
