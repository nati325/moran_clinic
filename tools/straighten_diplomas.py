"""מיישר את צילומי התעודות: מזהה את המסגרת, מתקן פרספקטיבה ומאחד לאותו יחס.

שימוש:  python tools/straighten_diplomas.py   (דורש opencv-python-headless)
קלט/פלט: src/assets/img/diploma-*-{1000,560}.webp
"""
from pathlib import Path
import cv2
import numpy as np

IMG = Path(__file__).resolve().parent.parent / 'src/assets/img'
NAMES = ['diploma-cosmetics', 'diploma-faceclub', 'diploma-shifon']
W, H = 1000, 714  # יחס אחיד לכל התעודות


def order(p):
    p = np.array(p, dtype=np.float32)
    s, d = p.sum(1), np.diff(p, axis=1).ravel()
    return np.array([p[s.argmin()], p[d.argmin()], p[s.argmax()], p[d.argmax()]], dtype=np.float32)  # TL TR BR BL


for name in NAMES:
    # הקובץ הגדול ביותר הקיים (מאפשר להריץ שוב על תוצר קודם)
    src = max(IMG.glob(f'{name}-*.webp'), key=lambda f: f.stat().st_size)
    im = cv2.imread(str(src))
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    m = cv2.morphologyEx((g < 200).astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    c = max(cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
    quad = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True).reshape(-1, 2)
    assert len(quad) == 4, f'{name}: לא זוהו 4 פינות'
    M = cv2.getPerspectiveTransform(order(quad), np.float32([[0, 0], [W, 0], [W, H], [0, H]]))
    out = cv2.warpPerspective(im, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    for w in (1000, 560):
        r = out if w == W else cv2.resize(out, (w, round(H * w / W)), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(IMG / f'{name}-{w}.webp'), r, [cv2.IMWRITE_WEBP_QUALITY, 82])
    print(name, 'ok')
