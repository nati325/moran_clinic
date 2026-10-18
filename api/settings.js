// מחירים ושעות פעילות (טיוטה). הפרסום לאתר נעשה ב-publish.
import { handler, send, jsonBody, guard } from './_lib/http.js';
import { getJSON } from './_lib/store.js';
import { OVERRIDES_KEY, validate, saveOverrides } from './_lib/overrides.js';

export default handler(async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method === 'GET') {
    const [overrides, published] = await Promise.all([getJSON(OVERRIDES_KEY), getJSON('site:published')]);
    return send(res, 200, { overrides, published, deployHook: Boolean(process.env.DEPLOY_HOOK_URL) });
  }
  if (req.method === 'PUT') {
    const o = validate(await jsonBody(req));
    await saveOverrides(o);
    return send(res, 200, { overrides: { ...o } });
  }
  send(res, 405, { error: 'method' });
});
