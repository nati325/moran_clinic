// עזרים לפונקציות: עובדים גם עם Vercel וגם עם שרת הפיתוח (רק Node גולמי).
import { createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { run, storeKind } from './store.js';

export const newId = () => randomUUID();

export function send(res, code, body, headers = {}) {
  res.statusCode = code;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader('Cache-Control', 'no-store');
  if (body === undefined) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

// גוף גולמי: חייבים לקרוא את הזרם לפני שנוגעים ב-req.body (ב-Vercel הוא מפוענח באופן עצל)
export async function rawBody(req, max = 200_000) {
  if (req.readable && !req.readableEnded) {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > max) throw Object.assign(new Error('too large'), { code: 'TOO_LARGE' });
      chunks.push(c);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  const b = req.body;
  return typeof b === 'string' ? b : b == null ? '' : JSON.stringify(b);
}
export async function jsonBody(req, max) {
  const t = await rawBody(req, max);
  if (!t) return {};
  try { return JSON.parse(t); } catch { throw Object.assign(new Error('bad json'), { code: 'BAD_JSON' }); }
}

export const parseCookies = (req) =>
  Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));

export const clientIp = (req) => (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

// ── סשן: עוגייה חתומה, סיסמה אחת ──
const COOKIE = 'mm_admin';
const sign = (data) => createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('base64url');
export const authConfigured = () => Boolean(process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);

export function makeSession(days = 30) {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + days * 864e5 })).toString('base64url');
  return `${body}.${sign(body)}`;
}
export const isAuthed = (req) => sessionValid(parseCookies(req)[COOKIE]);
function sessionValid(tok) {
  if (!tok || !authConfigured()) return false;
  const [body, sig] = tok.split('.');
  if (!body || !sig) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
export const sessionCookie = (tok, maxAge) =>
  `${COOKIE}=${tok}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
export const passwordOk = (input) => {
  const h = (s) => createHash('sha256').update(String(s)).digest();
  return timingSafeEqual(h(input), h(process.env.ADMIN_PASSWORD || ''));
};

export function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

// בדיקת הגנה אחידה לכל נקודות הקצה של הניהול. מחזיר true אם אפשר להמשיך.
export function guard(req, res, { write = false } = {}) {
  if (!authConfigured()) { send(res, 503, { error: 'not_configured', message: 'לא הוגדרו סיסמה ומפתח סשן בשרת.' }); return false; }
  if (!sessionValid(parseCookies(req)[COOKIE])) { send(res, 401, { error: 'unauthorized' }); return false; }
  if (write || req.method !== 'GET') {
    if (!sameOrigin(req)) { send(res, 403, { error: 'bad_origin' }); return false; }
    if (req.headers['x-requested-with'] !== 'moran-admin') { send(res, 403, { error: 'bad_request' }); return false; }
  }
  if (storeKind() === 'none') { send(res, 503, { error: 'no_store', message: 'אחסון הנתונים עדיין לא חובר.' }); return false; }
  return true;
}

// עוטף handler: טיפול אחיד בשגיאות
export const handler = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e.code === 'BAD_JSON') return send(res, 400, { error: 'bad_json' });
    if (e.code === 'TOO_LARGE') return send(res, 413, { error: 'too_large' });
    if (e.code === 'NO_STORE') return send(res, 503, { error: 'no_store' });
    console.error(e);
    send(res, 500, { error: 'server' });
  }
};

export const dayKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(d);

export async function throttle(key, limit, windowSec) {
  const n = await run('INCR', key);
  if (n === 1) await run('EXPIRE', key, windowSec);
  return n > limit;
}

// ── ולידציה ──
export const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const DATE = /^\d{4}-\d{2}-\d{2}$/;
