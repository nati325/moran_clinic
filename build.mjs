// בונה את האתר הסטטי לתיקייה dist/.  שימוש: node build.mjs
// עיצוב mobile-first, מינימליסטי: תמונה גדולה, טיפוגרפיה שקטה, מטרה אחת: וואטסאפ.
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { site } from './src/config.mjs';
import { allPages, servicePages, home, byKey } from './src/content.mjs';
import {
  esc, abs, waLink, telLink, S, dur, durShort, price,
  daysText, hoursHtml, hoursRange, fullAddress, nearbyText, PROD,
} from './src/lib.mjs';

const OUT = 'dist';

// גרסה לפי תוכן הקובץ: /assets נשמר במטמון לשנה (_headers), אז כל שינוי חייב URL חדש
const ver = (f) => createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 8);
const CSS_URL = `/assets/styles.css?v=${ver('src/assets/styles.css')}`;
const JS_URL = `/assets/site.js?v=${ver('src/assets/site.js')}`;

// ── production: כל משפט/פריט שעדיין מחכה לאישור יורד, וההמלצות מוסתרות עד שיש אמיתיות ──
const PH = /\[[^\]]*[֐-׿][^\]]*\]/;
const dropPh = (s) => s.split(/(?<=[.!?])\s+/).filter((x) => !PH.test(x)).join(' ').trim();
if (PROD) {
  for (const p of allPages) {
    for (const f of ['bullets', 'steps']) if (p[f]) p[f] = p[f].map(dropPh).filter(Boolean);
    if (p.types) p.types = p.types.map((t) => ({ ...t, p: dropPh(t.p) }));
    if (p.faq) p.faq = p.faq.map((f) => ({ ...f, a: dropPh(f.a) })).filter((f) => f.a);
  }
  site.massageTraining = '';
}
const missingImages = new Map(); // תווית → עמודים
let currentPath = '/';

// [placeholders] בטקסט גלוי → מסומנים בצהוב. טווחי שעות → LTR (אחרת מתהפכים בעברית).
const markPlaceholders = (html) =>
  html.replace(
    />([^<]+)</g,
    (_, t) =>
      '>' +
      t
        .replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>')
        .replace(/(\d{1,2}:\d{2}–\d{1,2}:\d{2})/g, '<span dir="ltr">$1</span>') +
      '<',
  );

const mapQ = encodeURIComponent(fullAddress());
const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${site.street} ${site.city}`)}&navigate=yes`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQ}`;

// ── אייקונים ─────────────────────────────────────────────────
const icon = {
  wa: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z"/></svg>',
  phone: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.5.6 3.6a1 1 0 0 1-.3 1Z"/></svg>',
  pin: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>',
  ig: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
  cam: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  check: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
};

// ── רכיבים ───────────────────────────────────────────────────

const waBtn = (text, loc, label = 'קביעת תור בוואטסאפ', cls = 'btn btn-wa') =>
  `<a class="${cls}" href="${esc(waLink(text))}" target="_blank" rel="noopener" data-loc="${loc}">${icon.wa}<span>${label}</span></a>`;

const telBtn = (loc, cls = 'btn btn-soft') =>
  `<a class="${cls}" href="${telLink}" data-loc="${loc}">${icon.phone}<span dir="ltr">${site.phoneDisplay}</span></a>`;

function picture(o, label, { cls = '', eager = false, sizes = '(min-width: 1000px) 40vw, 100vw' } = {}) {
  if (o?.svg) {
    const pos = o.pos ? ` style="object-position:${o.pos}"` : '';
    return `<img class="${cls}" src="/assets/img/${o.svg}.svg"${pos} width="${o.width}" height="${o.height}" alt="${esc(o.alt || label)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }
  if (o) {
    const url = (w) => `/assets/img/${o.name}-${w}.webp`;
    const set = o.widths.length > 1 ? ` srcset="${o.widths.map((w) => `${url(w)} ${w}w`).join(', ')}" sizes="${sizes}"` : '';
    const pos = o.pos ? ` style="object-position:${o.pos}"` : '';
    return `<img class="${cls}" src="${url(o.widths.at(-1))}"${set}${pos} width="${o.width}" height="${o.height}" alt="${esc(o.alt || label)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }
  if (!missingImages.has(label)) missingImages.set(label, new Set());
  missingImages.get(label).add(currentPath);
  return `<span class="slot ${cls}" aria-hidden="true">${icon.cam}<span>${label}</span></span>`;
}

const secHead = (id, title, extra = '') => `<div class="sec-head container"><h2 id="${id}">${title}</h2>${extra}</div>`;

function treatmentRail(keys, id = 'treatments-h', title = 'הטיפולים') {
  return `<section class="sec" aria-labelledby="${id}">
${secHead(id, title)}
<ul class="tgrid">${keys
    .map((k) => {
      const p = byKey[k];
      return `<li><a class="titem" href="${p.path}">
<span class="titem-img">${picture(site.images[k], p.navLabel, { sizes: '(min-width: 1000px) 220px, (min-width: 720px) 30vw, 100vw' })}</span>
<span class="titem-body"><h3>${p.navLabel}</h3><span class="titem-short">${p.short}</span></span>
</a></li>`;
    })
    .join('')}</ul>
</section>`;
}

function reviewsRail() {
  if (PROD && !site.reviews.length) return '';
  const items = site.reviews.length
    ? site.reviews
    : Array.from({ length: site.reviewSlots }, () => ({ name: '[שם פרטי]', city: '[עיר]' }));
  return `<section class="sec" aria-labelledby="reviews-h">
${secHead('reviews-h', 'מה מטופלות כותבות')}
<ul class="rail rail-reviews">${items
    .map((r, i) => {
      const img = r.image
        ? `<img src="${esc(r.image.src)}" width="${r.image.width}" height="${r.image.height}" alt="${esc(`המלצה של ${r.name} מ${r.city}`)}" loading="lazy" decoding="async">`
        : !r.text
          ? picture(null, `צילום המלצה ${i + 1}`)
          : '';
      const quote = r.text ? `<blockquote><p>${esc(r.text)}</p></blockquote>` : '';
      return `<li><figure class="review">${img}${quote}<figcaption>${esc(r.name)}, ${esc(r.city)}</figcaption></figure></li>`;
    })
    .join('')}</ul>
</section>`;
}

function priceSection(keys, title = 'מחירון') {
  const rows = keys
    .map((k) => {
      const s = S[k];
      const note = s.note ? `<small>${s.note}</small>` : '';
      return `<tr><th scope="row"><a href="${s.path}">${s.name}</a>${note}</th><td class="pr">${price(s)}</td></tr>`;
    })
    .join('');
  return `<section class="sec sec-narrow" id="prices" aria-labelledby="prices-h">
${secHead('prices-h', title)}
<div class="container"><table class="prices">
<caption class="sr">מחירי הטיפולים בקליניקה של מורן מדר ב${site.city}</caption>
<thead class="sr"><tr><th scope="col">טיפול</th><th scope="col">מחיר</th></tr></thead>
<tbody>${rows}</tbody></table></div>
</section>`;
}

function faqSection(faq) {
  return `<section class="sec sec-narrow" aria-labelledby="faq-h">
${secHead('faq-h', 'שאלות נפוצות')}
<div class="container faq">${faq.map((f) => `<details><summary><h3>${f.q}</h3></summary><p>${f.a}</p></details>`).join('')}</div>
</section>`;
}

function aboutSection() {
  const certs = site.certificates
    .map(
      (c) => `<li><a class="cert" href="/assets/img/${c.img}-${c.size[0]}.webp" target="_blank" rel="noopener">
<img src="/assets/img/${c.img}-560.webp" width="560" height="${Math.round((560 * c.size[1]) / c.size[0])}" alt="תעודת ${esc(c.title)} של מורן מדר מ${esc(c.school)}" loading="lazy" decoding="async">
<span><strong>${c.title}</strong>${c.school} · <time datetime="${c.iso}">${c.date}</time></span></a></li>`,
    )
    .join('');
  return `<section class="sec about" aria-labelledby="about-h">
<div class="container about-card">
${picture(site.images.therapist, 'מורן בעבודה', { cls: 'about-img', sizes: '(min-width: 1000px) 320px, 40vw' })}
<div class="about-text">
<p class="kicker">המטפלת</p>
<h2 id="about-h">${site.therapistName}</h2>
<p>קוסמטיקאית ומעסה. מטפלת בנשים בלבד, בקליניקה פרטית ב${site.city}.</p>
${site.massageTraining ? `<p class="small">${site.massageTraining}</p>` : ''}
</div>
</div>
<div class="container"><details class="certs">
<summary>הסמכות והכשרה</summary>
<ul class="rail rail-certs">${certs}</ul>
</details></div>
</section>`;
}

function bookingSection(page) {
  const opts = [
    ['massage', 'עיסוי גוף'],
    ['massage_cupping', 'עיסוי עם כוסות רוח'],
    ['facialMassage', 'עיסוי פנים / לפטינג'],
    ['facialTreatment', 'טיפול פנים'],
    ['waxing', 'הסרת שיער בשעווה'],
    ['brows', 'עיצוב גבות'],
    ['unsure', 'עוד לא בטוחה'],
  ];
  const netlify = site.form.mode === 'netlify' ? ' data-netlify="true" netlify-honeypot="company"' : '';
  const ajax = site.form.mode === 'external' ? ' data-ajax' : '';
  const hidden = Object.entries(site.form.fields || {}).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');
  const formEnabled = site.form.mode === 'netlify' || Boolean(site.form.action);
  return `<section class="sec book" id="booking" aria-labelledby="booking-h">
<div class="container"><div class="book-card">
<h2 id="booking-h">קובעות תור?</h2>
<p>הכי מהיר בוואטסאפ. כותבות מה בא לך, ומורן חוזרת עם מועד.</p>
<div class="stack">${waBtn(page.waText, 'booking', 'כתבי למורן בוואטסאפ', 'btn btn-wa btn-lg')}<a class="tlink" href="${telLink}" data-loc="booking">או בטלפון <span dir="ltr">${site.phoneDisplay}</span></a></div>
<dl class="info">
<div><dt>ימים</dt><dd>${daysText().replace('ימים ', '')}</dd></div>
<div><dt>שעות</dt><dd>${hoursHtml()}</dd></div>
<div><dt>כתובת</dt><dd>${fullAddress()}</dd></div>
</dl>
<div class="nav-to"><a href="${esc(wazeUrl)}" target="_blank" rel="noopener" data-loc="waze">Waze</a><a href="${esc(mapsUrl)}" target="_blank" rel="noopener" data-loc="maps">Google Maps</a></div>
${formEnabled ? `<details class="form-wrap">
<summary>או השאירי פרטים ונחזור אלייך</summary>
<form class="form" name="booking" method="POST" action="${esc(site.form.action || '/thank-you/')}" data-booking-form${ajax}${netlify}>
${hidden}<input type="hidden" name="form-name" value="booking">
<p class="hp" aria-hidden="true"><label>לא למילוי <input name="company" tabindex="-1" autocomplete="off"></label></p>
<div class="field"><label for="f-name">שם</label>
<input id="f-name" name="name" type="text" autocomplete="given-name" required minlength="2" aria-describedby="f-name-err">
<p class="field-error" id="f-name-err" hidden>נא למלא שם.</p></div>
<div class="field"><label for="f-phone">טלפון</label>
<input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required aria-describedby="f-phone-err">
<p class="field-error" id="f-phone-err" hidden>נא למלא מספר טלפון תקין, למשל 050-1234567.</p></div>
<div class="field"><label for="f-service">טיפול</label>
<select id="f-service" name="service">${opts.map(([v, l]) => `<option value="${v}"${v === page.formService ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
<div class="field"><label for="f-time">זמן מועדף <span class="opt">(לא חובה)</span></label>
<input id="f-time" name="preferred_time" type="text" placeholder="למשל: שלישי אחרי 18:00"></div>
<p class="form-status" role="alert" hidden>לא הצלחנו לשלוח. אפשר לכתוב למורן בוואטסאפ או להתקשר.</p>
<button class="btn btn-light btn-lg" type="submit">שליחה</button>
</form>
</details>` : ''}
</div></div>
</section>`;
}

// ── שלד ──────────────────────────────────────────────────────

function header(page) {
  const links = [home, ...servicePages]
    .map((p) => `<li><a href="${p.path}"${p.key === page.key ? ' aria-current="page"' : ''}>${p.navLabel}</a></li>`)
    .join('');
  return `<header class="top">
<div class="container top-bar">
<a class="brand" href="/" aria-label="${site.businessName}, עמוד הבית"><span class="brand-en" aria-hidden="true">MORAN MADAR</span></a>
<nav class="nav-desk" aria-label="ניווט ראשי"><ul>${links}</ul></nav>
${waBtn(page.waText, 'header', 'קביעת תור', 'btn btn-wa btn-sm head-cta')}
<details class="menu">
<summary aria-label="תפריט"><span class="burger" aria-hidden="true"></span></summary>
<nav class="menu-panel" aria-label="ניווט ראשי"><ul>${links}</ul>
${waBtn(page.waText, 'menu', 'קביעת תור בוואטסאפ', 'btn btn-wa btn-lg')}</nav>
</details>
</div>
</header>`;
}

function footer() {
  return `<footer class="foot">
<div class="container">
<p class="foot-brand" aria-hidden="true">MORAN MADAR</p>
<address>
<strong>${site.businessName}</strong>
<span>${site.street}, ${site.city}</span>
<a href="${telLink}" data-loc="footer" dir="ltr">${site.phoneDisplay}</a>
<span>${daysText()}</span>
<span>${hoursHtml()}</span>
</address>
<p class="foot-links"><a href="${site.instagram}" target="_blank" rel="noopener">${icon.ig}<bdi dir="ltr">${site.instagramHandle}</bdi></a></p>
<nav aria-label="טיפולים"><ul>${servicePages.map((p) => `<li><a href="${p.path}">${p.navLabel}</a></li>`).join('')}</ul></nav>
<p class="copy">© ${new Date().getFullYear()} ${site.businessName} · קליניקה לנשים בלבד</p>
</div>
</footer>`;
}

function stickyBar(page) {
  return `<div class="sticky" data-sticky>
${waBtn(page.waText, 'sticky', 'קביעת תור בוואטסאפ', 'btn btn-light')}
<a class="sticky-tel" href="${telLink}" data-loc="sticky" aria-label="חיוג ל-${site.phoneDisplay}">${icon.phone}</a>
</div>`;
}

function analyticsHead(page) {
  const ids = [site.ga4Id, site.adsId].filter(Boolean);
  if (!ids.length) return '';
  let s = `<script async src="https://www.googletagmanager.com/gtag/js?id=${ids[0]}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${ids.map((id) => `gtag('config','${id}');`).join('')}`;
  if (page.key === 'thankYou' && site.adsId && site.adsLabelThankYou)
    s += `gtag('event','conversion',{send_to:'${site.adsId}/${site.adsLabelThankYou}'});`;
  return s + '</script>';
}

function layout(page, mainHtml, schemas) {
  const canonical = abs(page.path);
  const ogImg = abs('/assets/img/og-image.jpg');
  const waConv = site.adsId && site.adsLabelWhatsapp ? ` data-ads-wa="${site.adsId}/${site.adsLabelWhatsapp}"` : '';
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${canonical}">
${page.noindex ? '<meta name="robots" content="noindex, follow">\n' : ''}<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="${esc(site.businessName)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1e1a16">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/Heebo-hebrew.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/FrankRuhlLibre-hebrew.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${CSS_URL}">
${analyticsHead(page)}
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body class="page-${page.key}"${waConv}>
<a class="skip" href="#main">דילוג לתוכן</a>
${markPlaceholders(header(page))}
${markPlaceholders(`<main id="main">${mainHtml}</main>`)}
${markPlaceholders(footer())}
${page.noindex ? '' : stickyBar(page)}
<script src="${JS_URL}" defer></script>
</body>
</html>
`;
}

// ── עמודים ───────────────────────────────────────────────────

function homeMain(p) {
  const h = site.images.hero;
  return `
<section class="hero" aria-labelledby="hero-h">
<div class="hero-media">
${picture(h, 'מורן בקליניקה', { cls: 'hero-poster', eager: true, sizes: '(min-width: 1000px) 420px, 100vw' })}
</div>
<div class="hero-body container">
<p class="pill">קליניקה פרטית לנשים · ${site.city}</p>
<h1 id="hero-h">עיסוי לנשים<br>בבית דגן</h1>
<p class="lead">${p.lead}</p>
<div class="stack">${waBtn(p.waText, 'hero', 'קביעת תור בוואטסאפ', 'btn btn-light btn-lg')}<a class="tlink" href="#prices">למחירון</a></div>
</div>
</section>

<ul class="why container" aria-label="למה אצל מורן">${p.why.map((w) => `<li><strong>${w.h}</strong><span>${w.p}</span></li>`).join('')}</ul>

${treatmentRail(['massage', 'facialMassage', 'facialTreatment', 'waxing', 'brows'])}
${reviewsRail()}
${aboutSection()}
${priceSection(['massage', 'facialMassage', 'facialTreatment', 'waxing', 'waxingParts', 'brows'])}
${faqSection(p.faq)}
${bookingSection(p)}`;
}

function serviceMain(p) {
  const s = S[p.key];
  const chips = [s.duration || s.durLabel ? durShort(s) : '', price(s), 'נשים בלבד'].filter(Boolean);
  return `
<nav class="crumbs container" aria-label="פירורי לחם"><ol><li><a href="/">בית</a></li><li aria-current="page">${p.navLabel}</li></ol></nav>
<article>
<section class="s-hero container" aria-labelledby="hero-h">
<div class="s-hero-img">${picture(site.images[p.key], p.navLabel, { eager: true, sizes: '(min-width: 1000px) 480px, 100vw' })}</div>
<div class="s-hero-body">
<h1 id="hero-h">${p.h1}</h1>
<p class="lead">${p.lead}</p>
<ul class="chips chips-light">${chips.map((c) => `<li>${c}</li>`).join('')}</ul>
<div class="stack">${waBtn(p.waText, 'hero', 'קביעת תור בוואטסאפ', 'btn btn-wa btn-lg')}</div>
</div>
</section>

<section class="sec sec-narrow" aria-labelledby="facts-h">
${secHead('facts-h', 'בקצרה')}
<ul class="ticks container">${p.bullets.map((b) => `<li><span>${b}</span></li>`).join('')}</ul>
</section>

${p.types ? `<section class="sec sec-narrow" aria-labelledby="types-h">
${secHead('types-h', p.typesHeading)}
<ul class="types container">${p.types.map((t) => `<li class="type"><h3>${t.h}</h3><p>${t.p}</p></li>`).join('')}</ul>
</section>` : ''}

<section class="sec sec-narrow" aria-labelledby="steps-h">
${secHead('steps-h', 'איך זה עובד')}
<ol class="steps container">${p.steps.map((t) => `<li>${t}</li>`).join('')}</ol>
</section>

${p.priceKeys.length > 1 ? priceSection(p.priceKeys, 'מחיר') : ''}
${reviewsRail()}
${faqSection(p.faq)}
</article>
${treatmentRail(p.related, 'more-h', 'עוד אצל מורן')}
${bookingSection(p)}`;
}

function thankYouMain(p) {
  return `
<section class="thanks container">
<h1>${p.h1}</h1>
<p class="lead">הפרטים אצלנו. מורן תחזור אלייך בהקדם לתיאום.</p>
<div class="stack">${waBtn(p.waText, 'thank_you', 'רוצה מהר יותר? וואטסאפ', 'btn btn-wa btn-lg')}${telBtn('thank_you')}</div>
<p><a href="/">חזרה לעמוד הבית</a></p>
</section>`;
}

// ── Schema ───────────────────────────────────────────────────

const BIZ_ID = abs('/#business');

function businessSchema() {
  const offer = (k) => {
    const s = S[k];
    const o = { '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.name, url: abs(s.path) }, priceCurrency: 'ILS' };
    if (s.price) o.price = s.price;
    return o;
  };
  const b = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    '@id': BIZ_ID,
    name: site.businessName,
    url: abs('/'),
    telephone: site.phoneIntl,
    priceRange: '100–350 ₪',
    image: abs(`/assets/img/${site.images.hero.name}-${site.images.hero.widths.at(-1)}.webp`),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.street,
      addressLocality: site.city,
      addressCountry: 'IL',
      ...(site.postalCode && { postalCode: site.postalCode }),
    },
    areaServed: [site.city, ...site.nearby].map((n) => ({ '@type': 'Place', name: n })),
    hasMap: mapsUrl,
    sameAs: [site.instagram],
    employee: {
      '@type': 'Person',
      name: site.therapistName,
      jobTitle: 'קוסמטיקאית ומעסה',
      hasCredential: site.certificates.map((c) => ({
        '@type': 'EducationalOccupationalCredential',
        name: c.title,
        recognizedBy: { '@type': 'EducationalOrganization', name: c.school },
        dateCreated: c.iso,
      })),
    },
    description:
      'קליניקה פרטית לנשים בלבד בבית דגן. עיסוי שוודי, רקמות עמוק, טיפולי ומשולב עם כוסות רוח, עיסוי פנים ולפטינג, טיפולי פנים לכל סוגי העור, הסרת שיער בשעווה ועיצוב גבות.',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'טיפולים',
      itemListElement: ['massage', 'facialMassage', 'facialTreatment', 'waxing', 'brows'].map(offer),
    },
  };
  if (site.geo) b.geo = { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng };
  if (site.hours.days.length)
    b.openingHoursSpecification = [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: site.hours.days, opens: site.hours.opens, closes: site.hours.closes },
    ];
  return b;
}

const faqSchema = (faq) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

const crumbSchema = (page) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'בית', item: abs('/') },
    { '@type': 'ListItem', position: 2, name: page.navLabel, item: abs(page.path) },
  ],
});

function serviceSchema(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.h1,
    serviceType: S[page.key].name,
    url: abs(page.path),
    provider: { '@id': BIZ_ID },
    areaServed: [site.city, ...site.nearby],
    audience: { '@type': 'PeopleAudience', suggestedGender: 'female' },
    offers: page.priceKeys.map((k) => ({ '@type': 'Offer', name: S[k].name, priceCurrency: 'ILS', ...(S[k].price && { price: S[k].price }) })),
  };
}

// ── קבצי טקסט ────────────────────────────────────────────────

const indexable = allPages.filter((p) => !p.noindex);

function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
}

function robots() {
  const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Bingbot', 'Applebot-Extended'];
  return `# מנועי חיפוש ומנועי AI — מותרים במפורש
${bots.map((b) => `User-agent: ${b}\nAllow: /\nDisallow: /thank-you/\n`).join('\n')}
User-agent: *
Allow: /
Disallow: /thank-you/

Sitemap: ${abs('/sitemap.xml')}
`;
}

// llms.txt — כאן הפירוט המלא שקוצר מהעמודים, כדי שמנועי AI יקבלו את כל העובדות
function llmsTxt() {
  const line = (k) => `- ${S[k].name}: ${[dur(S[k]), price(S[k])].filter(Boolean).join(', ')}${S[k].note ? ` (${S[k].note})` : ''}`;
  const pageBlock = (p) =>
    `### ${p.h1}\n${p.lead}\n${p.bullets.map((b) => `- ${b}`).join('\n')}${p.types ? `\n- ${p.typesHeading}: ${p.types.map((t) => `${t.h} (${t.p.replace(/\.$/, '')})`).join('; ')}` : ''}\n${abs(p.path)}`;
  return `# ${site.businessName} — עיסוי לנשים בבית דגן

> קליניקה פרטית לנשים בלבד, ברחוב ${fullAddress()}. המטפלת: ${site.therapistName}, קוסמטיקאית ומעסה. הטיפולים מתבצעים בקליניקה בלבד, אין טיפולי בית ואין אירועים.

## עובדות
- מיקום: ${fullAddress()}. קרוב ל${nearbyText()}.
- קהל: נשים בלבד.
- טלפון ווואטסאפ: ${site.phoneDisplay}
- שעות פעילות: ${daysText()}, ${hoursRange()}.
- הכשרה: ${site.certificates.map((c) => `${c.title} (${c.school}, ${c.date})`).join('; ')}.
- אינסטגרם: ${site.instagram}

## מחירים
${['massage', 'facialMassage', 'facialTreatment', 'waxing', 'waxingParts', 'brows'].map(line).join('\n')}

## טיפולים
${servicePages.map(pageBlock).join('\n\n')}

## קביעת תור
וואטסאפ: https://wa.me/${site.whatsapp}
טלפון: ${site.phoneDisplay}
${site.bookingUrl ? `יומן אונליין: ${site.bookingUrl}\n` : ''}`;
}

// ── הרצה ─────────────────────────────────────────────────────

async function write(path, content) {
  const full = join(OUT, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
}

await mkdir(OUT, { recursive: true });
await cp('src/assets', join(OUT, 'assets'), { recursive: true, force: true });
await cp('src/static', OUT, { recursive: true, force: true });

const biz = businessSchema();
for (const p of allPages) {
  currentPath = p.path;
  let main, schemas;
  if (p.key === 'home') {
    main = homeMain(p);
    schemas = [biz, faqSchema(p.faq)];
  } else if (p.key === 'thankYou') {
    main = thankYouMain(p);
    schemas = [];
  } else {
    main = serviceMain(p);
    schemas = [biz, serviceSchema(p), crumbSchema(p), faqSchema(p.faq)];
  }
  const file = p.path === '/' ? 'index.html' : p.path.slice(1) + 'index.html';
  await write(file, layout(p, main, schemas));
}
await write('sitemap.xml', sitemap());
await write('robots.txt', robots());
await write('llms.txt', llmsTxt());

// ── בדיקות ───────────────────────────────────────────────────
const warn = [];
for (const p of indexable) {
  if (p.title.length > 60) warn.push(`title ארוך מ-60 (${p.title.length}): ${p.path}`);
  if (p.description.length < 150 || p.description.length > 160)
    warn.push(`description לא באורך 150-160 (${p.description.length}): ${p.path}`);
}
const found = new Map();
for (const p of allPages) {
  const file = p.path === '/' ? 'index.html' : p.path.slice(1) + 'index.html';
  const html = await readFile(join(OUT, file), 'utf8');
  for (const m of html.matchAll(/\[[^\][{}"<>]*[֐-׿][^\][{}"<>]*\]/g)) {
    if (!found.has(m[0])) found.set(m[0], new Set());
    found.get(m[0]).add(p.path);
  }
}
const list = (map) => [...map].map(([k, v]) => `  ${k}  ←  ${[...v].join(' ')}`).join('\n');
console.log(`נבנו ${allPages.length} עמודים ל-${OUT}/${PROD ? ' (production)' : ' (תצוגה מקדימה: placeholders מסומנים בצהוב)'}`);
if (warn.length) console.log('\nאזהרות SEO:\n' + warn.map((w) => '  - ' + w).join('\n'));
if (found.size) console.log(`\nplaceholders שנותרו (${found.size}):\n${list(found)}`);
if (PROD && found.size) {
  console.error('\n✗ בגרסת production אסור שיישארו placeholders. הבנייה נכשלה.');
  process.exitCode = 1;
}
const STRICT = process.argv.includes('--strict');
if (PROD && /example\./.test(site.url)) {
  console.error(`\n⚠ site.url עדיין ${site.url}: canonical, sitemap ו-schema מצביעים על דומיין דמה. להחליף ב-src/config.mjs.`);
  if (STRICT) process.exitCode = 1;
}
if (missingImages.size) console.log(`\nתמונות חסרות (${missingImages.size}):\n${list(missingImages)}`);
