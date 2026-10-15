# אתר קליניקת עיסוי: בית דגן

אתר סטטי בעברית (RTL): עמוד בית, 5 עמודי טיפול, עמוד תודה ו-404. כל התוכן ב-HTML מוגש מהשרת. JS משמש רק לסרגל הדביק, למדידה ולטופס (אם מופעל).

## מבנה

```
src/config.mjs    ← פרטי העסק, מחירים, שעות, מזהי מדידה, המלצות, תמונות, טופס
src/content.mjs   ← הטקסטים של כל עמוד + שאלות נפוצות
src/assets/       ← styles.css, site.js, fonts/ (מתארחים באתר), img/
src/static/       ← favicon, אייקונים, _headers (מועתקים כמו שהם)
build.mjs         ← מייצר את dist/: עמודים, 404, sitemap.xml, robots.txt, llms.txt
vercel.json       ← בנייה, תיקיית פלט וכותרות אבטחה ל-Vercel
netlify.toml      ← אותו דבר ל-Netlify (הכותרות ב-src/static/_headers)
dist/             ← התוצר לדיפלוי (לא נשמר ב-git)
CREDITS.md        ← מקור ורישיון של תמונות סטוק
```

אין תלויות. צריך רק Node 18 ומעלה.

```bash
node build.mjs            # תצוגה מקדימה: placeholders מסומנים בצהוב
node build.mjs --prod     # לאוויר: בלי placeholders, בלי סקשן המלצות ריק
node build.mjs --prod --strict   # כמו prod, ונכשל אם site.url עדיין example
node tools/audit.mjs      # בדיקה: קישורים, עוגנים, JSON-LD, H1, alt, תוויות, וואטסאפ
```

`--prod` מוריד אוטומטית כל משפט או פריט שעדיין מחכה לאישור, ומסתיר את ההמלצות עד שיש אמיתיות.
בסוף הבנייה מודפסות אזהרות SEO ורשימת כל ה-placeholders שנשארו.

## עיצוב

מינימליסטי, mobile-first. גופנים מקומיים: Frank Ruhl Libre (כותרות), Heebo (טקסט), Cinzel (שם המותג). הצבעים והמרווחים מוגדרים כמשתנים בראש `styles.css`.

## תמונות

- `src/assets/img/`: WebP בכמה גדלים, ו-SVG לאיורי השעווה והגבות.
- `tools/straighten_diplomas.py`: מיישר צילומי תעודות לפי המסגרת ומאחד ליחס אחיד (opencv-python-headless).
- `tools/make_illustrations.py`: מייצר את איורי הקו (SVG). להחליף בצילום אמיתי כשיהיה: ב-`config.mjs` מחליפים את `svg: ...` ב-`name` ו-`widths`.
- `tools/process_images.py`: חיתוך ותיקון צבע מתוך תיקיית מקורות (לא נשמרת בריפו).
- `og-image.jpg`: תמונת שיתוף 1200×630.

## דיפלוי

מחברים את הריפו ל-Vercel, Netlify או Cloudflare Pages. פקודת בנייה: `node build.mjs --prod`, תיקיית פלט: `dist`.

**שימו לב:** התוכנית החינמית של Vercel מיועדת לשימוש לא מסחרי. ל-Netlify ול-Cloudflare Pages אין הגבלה כזו בתוכנית החינמית.

אחרי עלייה לאוויר:
- מעדכנים `site.url` לדומיין האמיתי ובונים מחדש (canonical, sitemap ו-schema תלויים בו).
- מגישים את `sitemap.xml` ב-Google Search Console.
- בודקים את ה-schema ב-https://search.google.com/test/rich-results
- פותחים את הקונסולה ובודקים שאין חסימות של ה-CSP (`vercel.json` / `_headers`).

## טופס יצירת קשר (אופציונלי)

כל עוד `form.action` ב-`config.mjs` ריק, הטופס לא מוצג, והאתר עובד עם וואטסאפ וטלפון בלבד.
להפעלה: נרשמים ל-Web3Forms (מפתח מגיע למייל) או ל-Formspree, ומגדירים:

```js
form: { mode: 'external', action: 'https://api.web3forms.com/submit',
        fields: { access_key: '<המפתח>', subject: 'פנייה חדשה מהאתר' } },
```

ההודעה מגיעה למייל, והגולשת עוברת ל-`/thank-you/`. אם מפעילים טופס, יש להוסיף מדיניות פרטיות.

## מדידה

ב-`config.mjs`: `ga4Id`, `adsId`, `adsLabelThankYou`, `adsLabelWhatsapp`. כל עוד הם ריקים, gtag לא נטען בכלל. אם מפעילים, יש להוסיף באנר הסכמה לעוגיות.

| אירוע | מתי |
|---|---|
| `click_whatsapp` | קליק על כל קישור wa.me (+ המרת Ads אם יש `adsLabelWhatsapp`) |
| `click_phone` | קליק על tel: |
| `click_booking` | פתיחת הטופס או קליק על קישור לקביעת תור |
| `form_submit` | שליחת טופס תקין |
| המרת Ads | טעינת `/thank-you/` (אם יש `adsLabelThankYou`) |

לכל אירוע מצורף `link_location` (hero / sticky / footer וכו') ו-`page_path`. ב-GA4 מסמנים את `form_submit` ו-`click_whatsapp` כ-Key events.

## מה עוד צריך למלא

**`src/config.mjs`:**
- [ ] `url`: הדומיין
- [ ] `massageTraining`: תעודת העיסוי (שם המכון ושנה), ו-`experience`: שנות ותק
- [ ] `reviews`: 6–10 המלצות אמיתיות. לכל אחת שם פרטי, עיר, צילום מסך (`image`) **וגם הטקסט** (`text`)
- [ ] `geo`: קואורדינטות, `bookingUrl`: יומן אונליין (אופציונלי)
- [ ] מזהי GA4 / Google Ads
- [ ] צילום אמיתי לשעווה ולגבות (מחליף את האיורים), ולתמונת "המטפלת"

**`src/content.mjs`** (מסומן `[לאשר: ...]`): מחיר הארכה, מחירון שעווה לפי אזור, שיטת עיצוב גבות, חומרים בהריון, תדירות מפגשים בעיסוי פנים.

אחרי שיהיו ביקורות אמיתיות בגוגל אפשר להוסיף `aggregateRating` ל-`businessSchema()`. לא להמציא.

## הערות

- **מפה:** לנעיצה מדויקת מחליפים את הכתובת בקוד ההטמעה מהפרופיל העסקי בגוגל.
- **AEO:** `robots.txt` מתיר במפורש בוטים של מנועי AI. `llms.txt` נוצר אוטומטית מהקונפיג.
