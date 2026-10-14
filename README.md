# אתר קליניקת עיסוי — בית דגן

אתר סטטי בעברית (RTL), 5 עמודים + עמוד תודה. כל התוכן ב-HTML מוגש מהשרת. JS משמש רק למדידה ולולידציה של הטופס.

## מבנה

```
src/config.mjs    ← פרטי העסק, מחירים, שעות, מזהי מדידה, המלצות, תמונות
src/content.mjs   ← הטקסטים של כל עמוד + שאלות נפוצות
src/assets/       ← styles.css, site.js, img/
src/static/       ← favicon, 404, _headers (מועתקים כמו שהם)
build.mjs         ← מייצר את dist/: עמודים, sitemap.xml, robots.txt, llms.txt
dist/             ← התוצר לדיפלוי
```

אין תלויות. צריך רק Node 18 ומעלה.

**תמונות** (צריך Python עם Pillow ו-ffmpeg; את הקבצים המוכנים כבר יצרתי):
- `python tools/process_images.py`: חיתוך, תיקון צבע ו-WebP לכל תמונה מתוך `תמונות מורן/`. **מסתיר את מספר ת.ז. בתעודה.**
- `python tools/edit_video.py`: עורך סרטון לרשתות (`media/moran-clinic-reel.mp4`). האתר עצמו כרגע בלי סרטונים: האיכות של החומר הקיים לא הספיקה.
- התיקייה `תמונות מורן/` (המקורות, כולל התעודה עם ת.ז.) **לא** עולה לאתר. רק `dist/` עולה.

```bash
node build.mjs          # תצוגה מקדימה: placeholders מסומנים בצהוב
node build.mjs --prod   # לאוויר: בלי placeholders, בלי סקשן המלצות ריק
node tools/audit.mjs    # בדיקה: קישורים, עוגנים, JSON-LD, H1, alt, תוויות, וואטסאפ
```

`--prod` מוריד אוטומטית כל משפט או פריט שעדיין מחכה לאישור, ומסתיר את ההמלצות עד שיש אמיתיות. אם נשאר placeholder כלשהו, הבנייה נכשלת. Netlify בונה עם `--prod`.

בסוף, הבנייה מדפיסה אזהרות SEO (title מעל 60 תווים, description שלא באורך 150–160) ואת **כל ה-placeholders שנשארו**, עם העמודים שבהם הם מופיעים. באתר עצמו placeholders מסומנים ברקע צהוב.

## דיפלוי

**Netlify (מומלץ, כי הטופס עובד בלי שרת):**
1. מעלים את התיקייה ל-GitHub ומחברים ל-Netlify. `netlify.toml` כבר מגדיר `node build.mjs` ו-`dist`.
2. או: מריצים `node build.mjs` וגוררים את `dist/` ל-app.netlify.com/drop.
3. ב-Netlify → Forms: מפעילים התראות מייל על הטופס `booking`.

**אחסון סטטי אחר (Cloudflare Pages, Vercel, אחסון רגיל):** מעלים את `dist/`. Netlify Forms לא יעבוד שם, אז:
- בוחרים שירות טפסים (Formspree, Web3Forms, Basin).
- ב-`config.mjs` מגדירים `form: { mode: 'external', action: '<כתובת השירות>' }`.
- בהגדרות השירות מגדירים הפניה אחרי שליחה ל-`https://<הדומיין>/thank-you/`.

אחרי עלייה לאוויר:
- מעדכנים `site.url` לדומיין האמיתי ובונים מחדש (canonical, sitemap ו-schema תלויים בו).
- מגישים את `sitemap.xml` ב-Google Search Console.
- בודקים את ה-schema ב-https://search.google.com/test/rich-results

## מדידה

ב-`config.mjs`: `ga4Id`, `adsId`, `adsLabelThankYou`, `adsLabelWhatsapp`. כל עוד הם ריקים, gtag לא נטען בכלל.

| אירוע | מתי |
|---|---|
| `click_whatsapp` | קליק על כל קישור wa.me (+ המרת Ads אם יש `adsLabelWhatsapp`) |
| `click_phone` | קליק על tel: |
| `click_booking` | קליק על "לקביעת תור" |
| `form_submit` | שליחת טופס תקין |
| המרת Ads | טעינת `/thank-you/` (אם יש `adsLabelThankYou`) |

לכל אירוע מצורף `link_location` (hero / sticky / footer וכו') ו-`page_path`.
ב-GA4 מסמנים את `form_submit` ו-`click_whatsapp` כ-Key events.

## Placeholders למילוי

**פרטי עסק (`src/config.mjs`):**
- [x] `businessName` / `therapistName`: מורן מדר. לוודא שזה **זהה אות באות** לפרופיל העסקי בגוגל
- [ ] `training`: שם המכון, שנת סיום, שנות ותק
- [ ] `hours.days`: ימי פעילות (השעות 16:00–21:00 כבר מוגדרות)
- [ ] `url`: הדומיין
- [ ] `bookingUrl`: קישור ליומן ההזמנות. כל עוד ריק, הכפתור מוביל לטופס בעמוד
- [ ] `reviews`: 6–10 המלצות אמיתיות. לכל אחת שם פרטי, עיר, צילום מסך (`image`) **וגם הטקסט** (`text`). גוגל ומנועי AI לא קוראים טקסט מתוך תמונה
- [ ] `images`: 7 תמונות (WebP, ב-`src/assets/img/`, עם width/height ו-alt בעברית). רשימה מלאה בהערות ב-`config.mjs`. כל עוד חסרה תמונה, האתר מציג מסגרת "מקום לתמונה", והבנייה מדפיסה את רשימת החסרות
- [ ] `geo`: קואורדינטות (אופציונלי)
- [ ] `services.facialMassage.duration`: משך עיסוי פנים
- [ ] `services.facialTreatment.duration` + `price`: משך ומחיר טיפול פנים
- [ ] מזהי GA4 ו-Google Ads

**תוכן לאישור (`src/content.mjs`, מסומן `[לאשר: ...]`):**
- [ ] מאיזה שבוע בהריון מקבלת מטופלות
- [ ] מה כולל טיפול ההיכרות
- [ ] עיסוי פנים: מחיר ומשך לשילוב עם עיסוי גוף, אילו מוצרים
- [ ] טיפול פנים: סוג הפילינג, האם כולל הוצאת שחורים, מה מוחלף בהריון, כמה ימים לפני אירוע
- [ ] גבות: שיטה (חוט / שעווה / פינצטה), מחיר לגבות בלבד או לשפם בלבד
- [ ] לעבור על "מה קורה בטיפול" בכל עמוד ולוודא שזה התיאור המדויק שלה

**אחרי שיהיו ביקורות אמיתיות בגוגל:** אפשר להוסיף `aggregateRating` ל-`businessSchema()` ב-`build.mjs`. לא להמציא.

## הערות

- **פונט:** Assistant נטען מ-Google Fonts בצורה לא חוסמת. כדי לשפר עוד את Lighthouse, אפשר להוריד את קבצי ה-woff2 ל-`src/assets/fonts/` ולהחליף את `FONT_CSS` ב-`@font-face` מקומי.
- **מפה:** המפה בעמוד הבית מבוססת על הכתובת. לנעיצה מדויקת, מחליפים את ה-`src` של ה-iframe בקוד ההטמעה מהפרופיל העסקי בגוגל (שתף → הטמעת מפה).
- **AEO:** `robots.txt` מתיר במפורש את GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, Google-Extended, Bingbot ו-Applebot-Extended. `llms.txt` נוצר אוטומטית מהקונפיג, כך שהוא תמיד מסונכרן עם האתר.
