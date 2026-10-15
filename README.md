# אתר קליניקת עיסוי: בית דגן

אתר סטטי בעברית (RTL): עמוד בית, 5 עמודי טיפול, עמוד תודה ו-404. כל התוכן ב-HTML מוגש מהשרת. JS משמש רק לסרגל הדביק, למדידה ולטופס (אם מופעל).

## מבנה

```
src/config.mjs    ← פרטי העסק, מחירים, שעות, מזהי מדידה, המלצות, תמונות, טופס
src/content.mjs   ← הטקסטים של כל עמוד + שאלות נפוצות
src/assets/       ← styles.css, site.js, fonts/ (מתארחים באתר), img/
src/static/       ← favicon, אייקונים, _headers (מועתקים כמו שהם)
src/admin/        ← אפליקציית הניהול של מורן (/admin/)
api/              ← פונקציות Vercel: התחברות, לקוחות, תורים, הגדרות, מדידה, webhook
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

- `src/assets/img/`: WebP בכמה גדלים. שירות בלי צילום (`none: true` ב-`config.mjs`) מוצג בטיפוגרפיה בלבד.
- `tools/straighten_diplomas.py`: מיישר צילומי תעודות לפי המסגרת ומאחד ליחס אחיד (opencv-python-headless).
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

## אפליקציית ניהול למורן (/admin/)

אפליקציית ווב (PWA) שאפשר להתקין על מסך הבית בטלפון. כניסה בסיסמה אחת. כוללת:
- **היום ויומן:** תורים, הוספה ידנית, סימון "בוצע". תורים מ-Cal.com נכנסים לבד (webhook).
- **לקוחות:** כרטיס עם טלפון, הערות והיסטוריית טיפולים, וכפתורי וואטסאפ וחיוג.
- **האתר:** שינוי מחירים ושעות פעילות, וכפתור "פרסום לאתר" שבונה אותו מחדש.
- **סטטיסטיקה:** צפיות ולחיצות על וואטסאפ, טלפון ויומן (מונים בלבד, בלי עוגיות ובלי מזהים אישיים).

הקוד: `src/admin/` (הממשק), `api/` (פונקציות Vercel), `api/_lib/` (אחסון, התחברות ועזרים).

**הקמה ב-Vercel (חד-פעמי):**
1. Storage / Marketplace ← **Upstash Redis** (יש תוכנית חינמית) ← חיבור לפרויקט. המשתנים `KV_REST_API_URL` ו-`KV_REST_API_TOKEN` (או `UPSTASH_REDIS_REST_*`) נוספים אוטומטית.
2. Settings ← Environment Variables:
   - `ADMIN_PASSWORD`: הסיסמה של מורן (ארוכה).
   - `SESSION_SECRET`: מחרוזת אקראית של 32 תווים ומעלה. החלפתה מנתקת את כל המכשירים.
   - `DEPLOY_HOOK_URL`: ל"פרסום לאתר". יוצרים ב-Settings ← Git ← Deploy Hooks (ענף `main`).
   - `CAL_WEBHOOK_SECRET`: סוד כלשהו, זהה לזה שמגדירים ב-Cal.com.
3. Redeploy. נכנסים ל-`https://<הדומיין>/admin/` ואז "הוסף למסך הבית".
4. ב-Cal.com: Settings ← Developer ← Webhooks ← כתובת `https://<הדומיין>/api/cal-webhook`, אירועים: Booking Requested / Created / Rescheduled / Cancelled / Rejected, ו-Secret כאמור.
   אחרי הבקשה הראשונה אפשר לראות מה Cal.com שלח ב-`/api/settings?calog=1` (כשמחוברים), ולוודא שהשדות (טלפון, הערות) נקלטו נכון.

**פיתוח מקומי:**
```bash
node build.mjs --prod
ADMIN_PASSWORD=test SESSION_SECRET=0123456789abcdef0123 ADMIN_LOCAL_DB=.data/db.json \
  CAL_WEBHOOK_SECRET=x node tools/dev-server.mjs 8090   # http://localhost:8090/admin/
```

**איך מחירים ושעות מגיעים לאתר:** האפליקציה שומרת הגדרות במסד הנתונים. בכל בנייה (`build.mjs`) הן נקראות ומחליפות את הערכים שב-`config.mjs` (במחירים, בכותרות, ב-schema ובשעות). אם המסד לא זמין, הבנייה ממשיכה עם הערכים שבקוד.

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
