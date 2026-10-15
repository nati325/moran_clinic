// התחברות: סיסמה אחת. GET = בדיקת סטטוס, POST = כניסה, DELETE = יציאה.
import { handler, send, jsonBody, sameOrigin, authConfigured, passwordOk, makeSession, sessionCookie, clientIp, throttle, isAuthed } from './_lib/http.js';
import { storeKind } from './_lib/store.js';

export default handler(async (req, res) => {
  if (!authConfigured()) return send(res, 503, { error: 'not_configured', message: 'לא הוגדרו סיסמה ומפתח סשן בשרת.' });
  if (req.method === 'GET') {
    return isAuthed(req) ? send(res, 200, { ok: true, store: storeKind() }) : send(res, 401, { error: 'unauthorized' });
  }
  if (req.method === 'DELETE') {
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!sameOrigin(req) || req.headers['x-requested-with'] !== 'moran-admin')
    return send(res, 403, { error: 'bad_request' });
  if (storeKind() === 'none') return send(res, 503, { error: 'no_store', message: 'אחסון הנתונים עדיין לא חובר.' });
  // הגבלת ניסיונות: 6 ניסיונות ל-15 דקות לכל כתובת
  if (await throttle(`login:${clientIp(req)}`, 6, 900)) return send(res, 429, { error: 'too_many', message: 'יותר מדי ניסיונות. נסי שוב בעוד כמה דקות.' });
  const { password } = await jsonBody(req, 2000);
  if (typeof password !== 'string' || !passwordOk(password)) return send(res, 401, { error: 'wrong_password', message: 'הסיסמה לא נכונה.' });
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(makeSession(30), 30 * 86400) });
});
