// ─────────────────────────────────────────────────────────────
// כל פרטי העסק במקום אחד. אחרי עריכה: node build.mjs
// כל ערך בסוגריים מרובעים [כך] הוא placeholder שעוד לא מולא.
// הבנייה מדפיסה בסוף רשימה של כל ה-placeholders והתמונות שחסרים.
// ─────────────────────────────────────────────────────────────

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
  // עדיין חסר: תעודת העיסוי ושנות הוותק
  massageTraining: '[לאשר: תעודת עיסוי, שם המכון ושנה]',
  experience: '[מספר שנות ותק]',

  // קישור ליומן אונליין. כל עוד ריק — "לקביעת תור" מוביל לטופס בעמוד.
  bookingUrl: '',

  // טופס: ברירת המחדל עובדת עם Netlify Forms. ראו README לחלופות.
  form: { mode: 'netlify', action: '/thank-you/' },

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
  // name = תחילת שם הקובץ; widths = הגדלים שנוצרו. svg = איור קו. null = מסגרת "מקום לתמונה".
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
    waxing: {
      svg: 'illus-waxing', width: 800, height: 1000, pos: '50% 55%',
      alt: 'איור קו של צנצנת שעווה עם מרית ופרחי קמומיל',
    },
    brows: {
      svg: 'illus-brows', width: 800, height: 1000, pos: '50% 45%',
      alt: 'איור קו של עין וגבה מעוצבת',
    },
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
