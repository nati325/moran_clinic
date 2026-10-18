// ניהול זמינות להזמנות אונליין: ימים ושעות, מרווחים, חופשות וחסימות.
import { handler, send, jsonBody, guard } from './_lib/http.js';
import { loadConfig, validateConfig, saveConfig } from './_lib/booking.js';

export default handler(async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method === 'GET') return send(res, 200, { config: await loadConfig() });
  if (req.method === 'PUT') {
    const c = validateConfig(await jsonBody(req));
    await saveConfig(c);
    return send(res, 200, { config: c });
  }
  send(res, 405, { error: 'method' });
});
