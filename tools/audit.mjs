// בדיקה מקצה לקצה של dist/: קישורים, עוגנים, JSON-LD, כותרות, alt, טפסים, וואטסאפ.
// שימוש: node build.mjs --prod && node tools/audit.mjs
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'dist';
const errors = [];
const notes = [];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const exists = (p) => stat(p).then(() => true, () => false);
const all = (re, s) => [...s.matchAll(re)];

for (const file of await walk(OUT)) {
  const html = await readFile(file, 'utf8');
  const page = '/' + file.slice(OUT.length + 1).replace(/\\/g, '/').replace(/index\.html$/, '');
  const err = (m) => errors.push(`${page}: ${m}`);

  if (!/<html lang="he" dir="rtl">/.test(html)) err('חסר lang/dir');
  const h1 = all(/<h1[\s>]/g, html).length;
  if (h1 !== 1) err(`${h1} כותרות H1 (צריך בדיוק אחת)`);
  if (!/<title>[^<]+<\/title>/.test(html)) err('חסר title');
  if (!page.includes('404') && !/<link rel="canonical"/.test(html)) err('חסר canonical');

  // קישורים פנימיים ועוגנים
  const ids = new Set(all(/\sid="([^"]+)"/g, html).map((m) => m[1]));
  for (const [, href] of all(/href="([^"]+)"/g, html)) {
    if (href.startsWith('#')) {
      if (href.length > 1 && !ids.has(href.slice(1))) err(`עוגן שבור ${href}`);
    } else if (href.startsWith('/')) {
      const clean = href.split(/[?#]/)[0];
      const target = join(OUT, clean.endsWith('/') ? clean + 'index.html' : clean);
      if (!(await exists(target))) err(`קישור שבור ${href}`);
    }
  }
  for (const [, src] of all(/\s(?:src|poster|data-src)="(\/[^"]+)"/g, html))
    if (!(await exists(join(OUT, src.split('?')[0])))) err(`קובץ חסר ${src}`);
  for (const [, set] of all(/srcset="([^"]+)"/g, html))
    for (const part of set.split(','))
      if (!(await exists(join(OUT, part.trim().split(' ')[0])))) err(`srcset חסר ${part.trim()}`);

  // תמונות: alt קיים (ריק מותר רק לדקורטיביות), width/height
  for (const [tag] of all(/<img\b[^>]*>/g, html)) {
    if (!/\salt="/.test(tag)) err(`תמונה בלי alt: ${tag.slice(0, 80)}`);
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) err(`תמונה בלי width/height: ${tag.slice(0, 80)}`);
  }

  // טפסים: לכל input גלוי יש label
  for (const [, id] of all(/<input[^>]*\sid="([^"]+)"/g, html))
    if (!html.includes(`for="${id}"`)) err(`שדה ${id} בלי label`);

  // JSON-LD תקין
  for (const [, json] of all(/<script type="application\/ld\+json">(.*?)<\/script>/gs, html)) {
    try { JSON.parse(json); } catch (e) { err(`JSON-LD לא תקין: ${e.message}`); }
  }

  // וואטסאפ: כל קישור עם הודעה מוכנה
  const wa = all(/href="https:\/\/wa\.me\/(\d+)\?text=([^"]+)"/g, html);
  if (!page.includes('404') && !wa.length) err('אין כפתור וואטסאפ');
  for (const [, num] of wa) if (num !== '972547100209') err(`מספר וואטסאפ שגוי ${num}`);
  if (wa.length) notes.push(`${page.padEnd(20)} וואטסאפ: "${decodeURIComponent(wa[0][2].replace(/&amp;/g, '&'))}"`);

  // placeholders
  const ph = all(/\[[^\][{}"<>]*[֐-׿][^\][{}"<>]*\]/g, html).map((m) => m[0]);
  if (ph.length) err(`placeholders: ${[...new Set(ph)].join(' ')}`);
}

// משקל העמוד הראשי (בלי הווידאו שנטען אחרי load)
const home = await readFile(join(OUT, 'index.html'), 'utf8');
const css = (await stat(join(OUT, 'assets/styles.css'))).size;
const js = (await stat(join(OUT, 'assets/site.js'))).size;
const poster = (await stat(join(OUT, 'assets/img/hero-moran-720.webp'))).size;
const video = (await stat(join(OUT, 'assets/video/hero.mp4'))).size;
notes.push(`\nמשקל עמוד הבית: HTML ${(home.length / 1024).toFixed(0)}KB · CSS ${(css / 1024).toFixed(0)}KB · JS ${(js / 1024).toFixed(0)}KB · תמונת hero ${(poster / 1024).toFixed(0)}KB · וידאו (אחרי טעינה) ${(video / 1e6).toFixed(1)}MB`);

console.log(notes.join('\n'));
console.log(errors.length ? `\n✗ ${errors.length} בעיות:\n` + errors.map((e) => '  - ' + e).join('\n') : '\n✓ אין בעיות');
process.exitCode = errors.length ? 1 : 0;
