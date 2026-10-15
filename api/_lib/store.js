// שכבת אחסון: Upstash Redis (REST) בייצור, וקובץ JSON מקומי לפיתוח.
// בלי תלויות: רק fetch. ה-Marketplace של Vercel מגדיר את המשתנים אוטומטית.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const url = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const localPath = () => process.env.ADMIN_LOCAL_DB;

export const storeKind = () => (url() && token() ? 'upstash' : localPath() ? 'local' : 'none');

// ── Upstash ──
async function upstash(cmds) {
  const r = await fetch(`${url()}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`store ${r.status}`);
  const out = await r.json();
  return out.map((o) => {
    if (o.error) throw new Error(o.error);
    return o.result;
  });
}

// ── מקומי (פיתוח בלבד) ──
let mem = null;
const load = () => {
  if (mem) return mem;
  const p = localPath();
  mem = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  return mem;
};
const save = () => {
  const p = localPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(mem));
};
function local(cmd) {
  const db = load();
  const [op, key, ...a] = cmd;
  const now = Date.now();
  const e = db[key];
  if (e && e.exp && e.exp < now) delete db[key];
  const cur = db[key];
  const need = (t, mk) => (cur && cur.t === t ? cur : (db[key] = { t, v: mk() }));
  let res = null, dirty = true;
  switch (op.toUpperCase()) {
    case 'GET': res = cur ? cur.v : null; dirty = false; break;
    case 'SET': {
      db[key] = { t: 's', v: String(a[0]) };
      if (a[1] && String(a[1]).toUpperCase() === 'EX') db[key].exp = now + Number(a[2]) * 1000;
      res = 'OK'; break;
    }
    case 'DEL': res = cur ? 1 : 0; delete db[key]; break;
    case 'HSET': { need('h', () => ({})).v[a[0]] = String(a[1]); res = 1; break; }
    case 'HGET': res = cur && cur.t === 'h' ? cur.v[a[0]] ?? null : null; dirty = false; break;
    case 'HGETALL': res = cur && cur.t === 'h' ? Object.entries(cur.v).flat() : []; dirty = false; break;
    case 'HDEL': if (cur && cur.t === 'h') { delete cur.v[a[0]]; } res = 1; break;
    case 'HINCRBY': { const h = need('h', () => ({})); h.v[a[0]] = String((Number(h.v[a[0]]) || 0) + Number(a[1])); res = Number(h.v[a[0]]); break; }
    case 'INCR': { const s = need('s', () => '0'); s.v = String(Number(s.v) + 1); res = Number(s.v); break; }
    case 'EXPIRE': if (cur) cur.exp = now + Number(a[0]) * 1000; res = cur ? 1 : 0; break;
    case 'LPUSH': { need('l', () => []).v.unshift(String(a[0])); res = db[key].v.length; break; }
    case 'LTRIM': { const l = need('l', () => []); l.v = l.v.slice(Number(a[0]), Number(a[1]) + 1); res = 'OK'; break; }
    case 'LRANGE': res = cur && cur.t === 'l' ? cur.v.slice(Number(a[0]), Number(a[1]) + 1) : []; dirty = false; break;
    default: throw new Error('unsupported ' + op);
  }
  if (dirty) save();
  return res;
}

export async function pipe(cmds) {
  const k = storeKind();
  if (k === 'upstash') return upstash(cmds);
  if (k === 'local') return cmds.map(local);
  const err = new Error('storage not configured');
  err.code = 'NO_STORE';
  throw err;
}
export const run = async (...cmd) => (await pipe([cmd]))[0];

// ── עזרי JSON ──
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };
export const getJSON = async (key) => { const v = await run('GET', key); return v == null ? null : parse(v); };
export const setJSON = (key, val) => run('SET', key, JSON.stringify(val));
const pairs = (flat) => { const o = {}; for (let i = 0; i < flat.length; i += 2) o[flat[i]] = flat[i + 1]; return o; };
export const hgetallJSON = async (key) => Object.values(pairs((await run('HGETALL', key)) || [])).map(parse).filter(Boolean);
export const hgetall = async (key) => pairs((await run('HGETALL', key)) || []);
export const hsetJSON = (key, id, obj) => run('HSET', key, id, JSON.stringify(obj));
export const hgetJSON = async (key, id) => { const v = await run('HGET', key, id); return v == null ? null : parse(v); };
export const hdel = (key, id) => run('HDEL', key, id);
