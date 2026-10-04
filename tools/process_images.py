"""מעבד את התמונות של מורן לאתר: חיתוך, תיקון צבע עדין, WebP בכמה גדלים.

שימוש:  python tools/process_images.py
פלט:    src/assets/img/*.webp  (+ מדפיס width/height לכל קובץ)
"""
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'תמונות מורן'
OUT = ROOT / 'src/assets/img'
OUT.mkdir(parents=True, exist_ok=True)


def grade(im, warmth=1.0, contrast=1.04, color=0.96, sharp=1.15):
    """גוון חם ואחיד לכל התמונות, בלי להגזים."""
    im = ImageOps.autocontrast(im, cutoff=0.4)
    r, g, b = im.split()
    r = r.point(lambda v: min(255, v * (1 + 0.035 * warmth)))
    b = b.point(lambda v: v * (1 - 0.04 * warmth))
    im = Image.merge('RGB', (r, g, b))
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(color)
    return ImageEnhance.Sharpness(im).enhance(sharp)


def crop_ratio(im, box, ratio=None):
    """חותך לפי box (x0,y0,x1,y1); אם ניתן ratio (רוחב/גובה) — מתקן את הגובה סביב המרכז."""
    x0, y0, x1, y1 = box
    if ratio:
        w = x1 - x0
        h = round(w / ratio)
        cy = (y0 + y1) / 2
        y0 = max(0, round(cy - h / 2))
        y1 = min(im.height, y0 + h)
        y0 = y1 - h
    return im.crop((x0, y0, x1, y1))


def save(im, name, widths, quality=80):
    sizes = []
    for w in widths:
        w = min(w, im.width)
        out = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        p = OUT / f'{name}-{w}.webp'
        out.save(p, 'WEBP', quality=quality, method=6)
        sizes.append((p.name, out.width, out.height, p.stat().st_size // 1024))
    for s in sizes:
        print(f'  {s[0]:34} {s[1]}x{s[2]}  {s[3]} KB')


def load(name):
    return Image.open(SRC / name).convert('RGB')


# ── מורן מאחורי כוסות הרוח, הלוגו ברקע — תמונת הרקע של עמוד הבית ──
moran = load('28936.jpg')
save(grade(moran, warmth=1.2), 'hero-moran', [1095, 720])

# חיתוך לעמוד העיסוי: הכוסות בפוקוס, מורן מחייכת מאחור (4:5)
save(grade(crop_ratio(moran, (95, 600, 1095, 1600), 4 / 5), warmth=1.2), 'massage-cupping', [1000, 640])

# ── ניקוי פנים עם מנורת זכוכית מגדלת — מורן בעבודה ──
clean = load('28933.jpg')
save(grade(crop_ratio(clean, (0, 160, 1200, 1600), 4 / 5)), 'moran-at-work', [1200, 720])

# ── מסכה במכחול — טיפולי פנים ──
mask = load('28935.jpg')
save(grade(crop_ratio(mask, (0, 260, 1200, 1600), 4 / 5), warmth=1.6, color=0.92), 'facial-mask', [1200, 720])
# פרט עגול למקומות קטנים
save(grade(mask.crop((150, 380, 1150, 1380)), warmth=1.6, color=0.92), 'facial-mask-detail', [600])

# ── פריים מהסרטון: עיסוי לפטינג (מקור 480 פיקסל, לכן גודל אחד) ──
frame = ROOT / 'src/assets/img/_lifting-frame.png'
# 2.5 שניות = הפריים הכי חד (נמדד); חותכים מתחת לכיתוב של אינסטגרם
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '2.5', '-i', str(SRC / '28942.mp4'),
                '-frames:v', '1', str(frame)], check=True)
lift = Image.open(frame).convert('RGB').crop((17, 290, 463, 848))
save(grade(lift, warmth=1.4, sharp=1.3), 'facial-lifting', [lift.width])
frame.unlink()

# ── סטילס אווירה מתוך סרטון הסיור (464x832, הפריימים החדים ביותר — נמדד) ──
def still(t, name, box, warmth=1.3, bright=1.25):
    tmp = OUT / f'_{name}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', str(SRC / '28941.mp4'),
                    '-frames:v', '1', str(tmp)], check=True)
    im = Image.open(tmp).convert('RGB').crop(box)
    tmp.unlink()
    im = ImageEnhance.Brightness(im).enhance(bright)
    im = grade(im, warmth=warmth, contrast=1.06, color=0.9, sharp=1.2)
    save(im, name, [im.width], quality=78)


print('אווירה:')
still(18.0, 'clinic-candles', (0, 120, 464, 700))     # נרות, שמנים ופרחים יבשים
still(23.2, 'clinic-logo-wall', (0, 130, 464, 710))   # הלוגו על הקיר ומגבות מקופלות

# ── תעודות: חיתוך צמוד למסגרת ──
print('תעודות:')
d1 = load('28937.jpg').crop((300, 70, 1432, 838))   # Faceclub — Face Master
save(grade(d1, warmth=0.6, contrast=1.06, color=1.0), 'diploma-faceclub', [1100, 560])

d2 = load('28938.jpg').crop((318, 86, 1328, 778))   # Shifon — ארומתרפיה קוסמטית
save(grade(d2, warmth=0.6, contrast=1.06, color=1.0), 'diploma-shifon', [1000, 560])

# המרכז הרב תחומי — קוסמטיקה רב-תחומית מתקדמת. מסתירים את מספר תעודת הזהות!
d3 = load('28939.jpg')
redact = d3.crop((790, 474, 990, 512)).filter(ImageFilter.GaussianBlur(14))
d3.paste(redact, (790, 474))
ImageDraw.Draw(d3).rectangle((800, 478, 980, 508), fill=d3.getpixel((780, 492)))
d3 = d3.crop((205, 86, 1282, 872))
save(grade(d3, warmth=0.6, contrast=1.06, color=1.0), 'diploma-cosmetics', [1060, 560])
