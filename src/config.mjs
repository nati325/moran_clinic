// ─────────────────────────────────────────────────────────────
// כל פרטי העסק במקום אחד. אחרי עריכה: node build.mjs
// כל ערך בסוגריים מרובעים [כך] הוא placeholder שעוד לא מולא.
// הבנייה מדפיסה בסוף רשימה של כל ה-placeholders והתמונות שחסרים.
// ─────────────────────────────────────────────────────────────

import { loadOverrides } from '../api/_lib/overrides.js';

export const site = {
  // הדומיין הסופי, בלי / בסוף. משמש ל-canonical, sitemap ו-schema.
  url: 'https://www.example.co.il',

  // NAP — חייב להיות זהה אות באות לפרופיל העסקי בגוגל.
  businessName: 'מורן מדר',
  therapistName: 'מורן מדר',
  street: 'הגליל 55',
  city: 'בית דגן',
  postalCode: '', // אופציונלי
  phoneDisplay: '054-7100209',
  phoneIntl: '+972547100209',
  whatsapp: '972547100209',

  // קואורדינטות (אופציונלי, משפר את ה-schema). למשל { lat: 31.99, lng: 34.83 }
  geo: null,

  // שעות. days באנגלית לפי schema.org, למשל:
  // ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
  // כל עוד הרשימה ריקה, האתר מציג [ימי פעילות] ולא מכניס שעות ל-schema.
  hours: { opens: '09:00', closes: '21:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },

  instagram: 'https://www.instagram.com/moran__madar/',
  instagramHandle: '@moran__madar',

  // תעודות — מתוך התמונות שמורן שלחה. התמונות עברו חיתוך, ומספר ת.ז. הוסתר.
  certificates: [
    {
      title: 'קוסמטיקה רב-תחומית מתקדמת',
      school: 'המרכז הרב תחומי ללימודי הקוסמטיקה',
      date: 'מרץ 2025',
      iso: '2025-03',
      img: 'diploma-cosmetics',
      size: [1000, 714],
    },
    {
      title: 'Face Master: מאמנת מקצועית לשרירי הפנים',
      school: 'Faceclub School',
      date: 'דצמבר 2025',
      iso: '2025-12-07',
      detail: 'כולל פיסול פנים, עיסוי קרקפת ועיסוי יפני',
      img: 'diploma-faceclub',
      size: [1000, 714],
    },
    {
      title: 'ארומתרפיה קוסמטית',
      school: 'Shifon Professional',
      date: 'אפריל 2024',
      iso: '2024-04',
      img: 'diploma-shifon',
      size: [1000, 714],
    },
  ],
  // אין תעודת עיסוי נפרדת: ההסמכות הן אלו שמוצגות למעלה
  massageTraining: '',
  experience: '', // בכוונה ריק: לא מציגים מספר שנות ותק

  // קישור ליומן אונליין. כל עוד ריק — "לקביעת תור" מוביל לטופס בעמוד.
  bookingUrl: 'https://cal.com/%D7%A0%D7%AA%D7%A0%D7%90%D7%9C-%D7%9E%D7%93%D7%A8-usl8nf',

  // טופס יצירת קשר: נשלח במייל למורן דרך שירות טפסים (אין שרת באתר סטטי).
  // כל עוד action ריק, הטופס לא מוצג באתר בכלל (וואטסאפ וטלפון עובדים כרגיל).
  // Web3Forms: action 'https://api.web3forms.com/submit', fields { access_key: '<המפתח שהגיע למייל של מורן>', subject: 'פנייה חדשה מהאתר' }
  // Formspree: action 'https://formspree.io/f/<המזהה>', fields {}
  // Netlify Forms: mode 'netlify', action '/thank-you/'
  form: { mode: 'external', action: '', fields: {} },

  // מדידה. השאירו ריק כדי לא לטעון gtag בכלל.
  ga4Id: '', // 'G-XXXXXXXXXX'
  adsId: '', // 'AW-XXXXXXXXX'
  adsLabelThankYou: '', // תווית המרה: הגעה ל-/thank-you
  adsLabelWhatsapp: '', // תווית המרה: קליק על וואטסאפ

  // יישובים סמוכים (מופיעים בטקסט וב-areaServed)
  nearby: ['צריפין', 'יהוד', 'אור יהודה', 'מקווה ישראל', 'ראשון לציון מזרח'],

  // המלצות. כל המלצה יכולה לכלול צילום מסך (image), טקסט, או את שניהם.
  // חשוב: גוגל ומנועי AI לא קוראים טקסט מתוך תמונה — כדאי להעתיק גם את הטקסט.
  // { name: 'דנה', city: 'יהוד', text: '...', image: { src: '/assets/img/review-1.webp', width: 720, height: 1280 } }
  reviews: [],
  reviewSlots: 6, // כמה מקומות ריקים להציג כל עוד אין המלצות

  // תמונות WebP בתיקייה src/assets/img (נוצרות עם tools/process_images.py).
  // name = תחילת שם הקובץ; widths = הגדלים שנוצרו. none = בלי צילום (השירות מוצג בטיפוגרפיה בלבד). null = מסגרת "מקום לתמונה".
  images: {
    hero: {
      name: 'hero-moran', widths: [720, 1095], width: 1095, height: 1600,
      alt: 'מורן מדר מחייכת מאחורי כוסות רוח על גב של מטופלת, והלוגו של הקליניקה על הקיר',
    },
    therapist: {
      name: 'moran-at-work', widths: [720, 1200], width: 1200, height: 1500,
      alt: 'מורן מדר מבצעת ניקוי פנים למטופלת, מתחת למנורת הגדלה',
    },
    massage: {
      name: 'massage-back', widths: [640, 1000], width: 1000, height: 1250, pos: '50% 40%',
      alt: 'ידיים מעסות כתפיים וגב בעיסוי גוף',
    },
    facialMassage: {
      name: 'facial-relax', widths: [640, 1000], width: 1000, height: 1250, pos: '30% 45%',
      alt: 'אישה שוכבת בעיניים עצומות ברגיעה, ויד תומכת בראשה',
    },
    facialTreatment: {
      name: 'facial-mask', widths: [720, 1200], width: 1200, height: 1500,
      alt: 'מריחת מסכת חימר במכחול על הפנים של מטופלת בטיפול פנים',
    },
    // עד שיהיה צילום טוב: השירות מוצג בטיפוגרפיה בלבד
    waxing: { none: true },
    brows: { none: true },
  },
};

// מחירים ומשכים. null = עוד לא ידוע (יוצג כ-placeholder).
// durLabel / priceLabel — טקסט חופשי במקום מספר (למשל "לפי אזור").
export const services = {
  massage: {
    name: 'עיסוי גוף',
    duration: 60,
    price: 350,
    path: '/massage/',
    note: 'מכף רגל ועד ראש · אפשרות להארכה לפי בקשה',
  },
  facialMassage: {
    name: 'עיסוי פנים, דקולטה וקרקפת',
    duration: 60,
    price: 350,
    path: '/facial-massage/',
    note: 'כולל אפשרות לעיסוי לפטינג',
  },
  facialTreatment: {
    name: 'טיפול פנים (קוסמטיקה)',
    duration: 60,
    price: 350,
    path: '/facial-treatment/',
    note: 'מותאם לסוג העור',
  },
  waxing: { name: 'הסרת שיער בשעווה: כל הגוף', durLabel: '', price: 300, path: '/waxing/' }, // משך לא רלוונטי למחירון
  waxingParts: {
    name: 'הסרת שיער בשעווה: אזורים לבחירה',
    durLabel: 'לפי אזור',
    priceLabel: 'לפי אזור',
    path: '/waxing/',
  },
  brows: { name: 'עיצוב גבות + שפם', duration: 20, price: 100, path: '/eyebrows/' },
};

// בזמן הבנייה: מחירים ושעות פעילות שמורן עדכנה באפליקציית הניהול (אם האחסון מחובר).
// כל כשל כאן לא מפיל את הבנייה: האתר נבנה עם הערכים שבקובץ הזה.
try {
  const ov = await loadOverrides();
  if (ov) {
    for (const [k, v] of Object.entries(ov.prices || {})) if (services[k]) services[k].price = v;
    if (ov.hours) site.hours = { ...site.hours, ...ov.hours };
    console.log('הוחלו הגדרות מאפליקציית הניהול (מחירים/שעות)');
  }
} catch (e) {
  console.warn(`⚠ לא נטענו הגדרות מאפליקציית הניהול: ${e.message}`);
}
