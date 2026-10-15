// "פרסום לאתר": מפעיל בנייה מחדש ב-Vercel דרך Deploy Hook. הבנייה קוראת את ההגדרות שנשמרו.
import { handler, send, guard } from './_lib/http.js';
import { setJSON, getJSON } from './_lib/store.js';
import { OVERRIDES_KEY } from './_lib/overrides.js';

export default handler(async (req, res) => {
  if (!guard(req, res, { write: true })) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) return send(res, 501, { error: 'no_hook', message: 'עדיין לא חובר קישור פרסום (Deploy Hook) ב-Vercel.' });
  const r = await fetch(hook, { method: 'POST' });
  if (!r.ok) return send(res, 502, { error: 'hook_failed', message: 'הפעלת הפרסום נכשלה.' });
  const o = await getJSON(OVERRIDES_KEY);
  await setJSON('site:published', { at: new Date().toISOString(), version: o?.updatedAt || null });
  send(res, 200, { ok: true });
});
