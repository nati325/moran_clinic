// שרת פיתוח מקומי: מגיש את dist/ ומריץ את פונקציות api/ בדיוק כמו Vercel (בלי תלויות).
// שימוש:  ADMIN_PASSWORD=... SESSION_SECRET=... ADMIN_LOCAL_DB=.data/db.json node tools/dev-server.mjs [port]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.argv[2]) || 8090;
const ROOT = join(process.cwd(), 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname.startsWith('/api/')) {
    try {
      const mod = await import(pathToFileURL(join(process.cwd(), 'api', u.pathname.slice(5).replace(/\/$/, '') + '.js')).href);
      return await mod.default(req, res);
    } catch (e) { console.error(e); res.statusCode = 404; return res.end('no such function'); }
  }
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const f = join(ROOT, p);
    if ((await stat(f)).isDirectory()) { res.statusCode = 301; res.setHeader('Location', p + '/'); return res.end(); }
    res.setHeader('Content-Type', TYPES[extname(f)] || 'application/octet-stream');
    res.end(await readFile(f));
  } catch { res.statusCode = 404; res.end(await readFile(join(ROOT, '404.html')).catch(() => 'not found')); }
}).listen(PORT, () => console.log(`dev server http://localhost:${PORT}`));
