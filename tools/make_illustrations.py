"""מייצר את איורי הקו לשירותים שאין להם צילום טוב (SVG, אחיד בסגנון).

שימוש:  python tools/make_illustrations.py
פלט:    src/assets/img/illus-{facial-massage,waxing,brows}.svg
"""
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src/assets/img'
BG, ARCH, INK, CLAY, SAGE, HONEY, WOOD = '#efe3d3', '#e6d2ba', '#6e3a24', '#b8643f', '#6f7d5c', '#d9a441', '#d8b98c'
W, H = 800, 1000


def frame(body, seed=1):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-hidden="true">
<rect width="{W}" height="{H}" fill="{BG}"/>
<path d="M110 {H} V420 A290 290 0 0 1 690 420 V{H} Z" fill="{ARCH}"/>
<g fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
{body}
</g></svg>'''


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return tuple(u**3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t**3 * d for a, b, c, d in zip(p0, p1, p2, p3))


def leaf(x, y, ang, ln, color=SAGE, w=None):
    w = w or ln * 0.28
    a = math.radians(ang)
    ex, ey = x + math.cos(a) * ln, y + math.sin(a) * ln
    nx, ny = -math.sin(a) * w, math.cos(a) * w
    mx, my = (x + ex) / 2, (y + ey) / 2
    return (f'<path d="M{x:.1f} {y:.1f} Q{mx + nx:.1f} {my + ny:.1f} {ex:.1f} {ey:.1f} Q{mx - nx:.1f} {my - ny:.1f} {x:.1f} {y:.1f}Z" '
            f'fill="{color}" fill-opacity=".85" stroke="{INK}" stroke-width="2.5"/>'
            f'<path d="M{x:.1f} {y:.1f} L{ex:.1f} {ey:.1f}" stroke="{INK}" stroke-width="2" opacity=".6"/>')


def sprig(x, y, ang, n, ln, rnd):
    """ענף עם עלים לסירוגין."""
    out = []
    a = math.radians(ang)
    ex, ey = x + math.cos(a) * ln * n * 0.55, y + math.sin(a) * ln * n * 0.55
    out.append(f'<path d="M{x} {y} L{ex:.1f} {ey:.1f}" stroke-width="3.5"/>')
    for i in range(1, n + 1):
        t = i / (n + 1)
        px, py = x + (ex - x) * t, y + (ey - y) * t
        side = 1 if i % 2 else -1
        out.append(leaf(px, py, ang + side * (48 + rnd.uniform(-8, 8)), ln * (1 - t * 0.35) * rnd.uniform(.9, 1.1)))
    out.append(leaf(ex, ey, ang, ln * 0.7))
    return ''.join(out)


def chamomile(x, y, r, rnd):
    petals = ''.join(
        f'<ellipse cx="{x + math.cos(a) * r * 1.05:.1f}" cy="{y + math.sin(a) * r * 1.05:.1f}" rx="{r * .62:.1f}" ry="{r * .26:.1f}" '
        f'transform="rotate({math.degrees(a):.0f} {x + math.cos(a) * r * 1.05:.1f} {y + math.sin(a) * r * 1.05:.1f})" fill="#fbf6ee" stroke-width="2.5"/>'
        for a in [i * 2 * math.pi / 11 + rnd.uniform(-.06, .06) for i in range(11)])
    return petals + f'<circle cx="{x}" cy="{y}" r="{r * .5:.1f}" fill="{HONEY}" stroke-width="2.5"/>'


def brows():
    rnd = random.Random(7)
    parts = []
    # עין
    up = ((190, 600), (270, 470), (530, 470), (610, 600))
    lo = ((205, 612), (300, 690), (500, 690), (595, 612))
    parts.append(f'<path d="M{up[0][0]} {up[0][1]} C{up[1][0]} {up[1][1]} {up[2][0]} {up[2][1]} {up[3][0]} {up[3][1]}" stroke-width="5"/>')
    parts.append(f'<path d="M{lo[0][0]} {lo[0][1]} C{lo[1][0]} {lo[1][1]} {lo[2][0]} {lo[2][1]} {lo[3][0]} {lo[3][1]}" stroke-width="3.5"/>')
    parts.append(f'<path d="M{up[0][0]} {up[0][1]} L{lo[0][0]} {lo[0][1]} M{up[3][0]} {up[3][1]} L{lo[3][0]} {lo[3][1]}" stroke-width="3"/>')
    parts.append(f'<clipPath id="e"><path d="M{up[0][0]} {up[0][1]} C{up[1][0]} {up[1][1]} {up[2][0]} {up[2][1]} {up[3][0]} {up[3][1]} L{lo[3][0]} {lo[3][1]} C{lo[2][0]} {lo[2][1]} {lo[1][0]} {lo[1][1]} {lo[0][0]} {lo[0][1]}Z"/></clipPath>')
    parts.append(f'<g clip-path="url(#e)"><circle cx="400" cy="560" r="70" fill="{CLAY}" fill-opacity=".55"/><circle cx="400" cy="560" r="70" stroke-width="3"/>'
                 f'<circle cx="400" cy="560" r="28" fill="{INK}"/><circle cx="378" cy="538" r="11" fill="#fbf6ee" stroke="none"/></g>')
    # ריסים
    for i in range(26):
        t = 0.06 + 0.88 * i / 25
        x, y = bez(*up, t)
        dx, dy = bez(*up, min(1, t + .01))[0] - x, bez(*up, min(1, t + .01))[1] - y
        n = math.hypot(dx, dy) or 1
        nx, ny = dy / n, -dx / n
        ln = 26 + 16 * math.sin(math.pi * t) + rnd.uniform(-3, 3)
        bend = (t - .5) * 26
        parts.append(f'<path d="M{x:.1f} {y:.1f} q{nx * ln * .55 + bend * .4:.1f} {ny * ln * .55:.1f} {nx * ln + bend:.1f} {ny * ln:.1f}" stroke-width="3.2"/>')
    # גבה: שערות מגמישות לאורך קשת
    cen = ((165, 400), (260, 300), (480, 270), (650, 390))
    for i in range(380):
        t = rnd.random()
        x, y = bez(*cen, t)
        x2, y2 = bez(*cen, min(1, t + .02))
        ang = math.atan2(y2 - y, x2 - x)
        thick = 16 + 44 * math.sin(math.pi * min(1, t * 1.02)) ** .7 * (1 - .3 * t)
        off = rnd.uniform(-.5, .5) * thick
        px, py = x - math.sin(ang) * off, y + math.cos(ang) * off
        ln = 30 + 24 * (1 - t) + rnd.uniform(-4, 4)
        tilt = ang + math.radians(-52 + 58 * t) + rnd.uniform(-.08, .08)
        ex, ey = px + math.cos(tilt) * ln, py + math.sin(tilt) * ln
        cx, cy = px + math.cos(tilt - .25) * ln * .55, py + math.sin(tilt - .25) * ln * .55
        parts.append(f'<path d="M{px:.1f} {py:.1f} Q{cx:.1f} {cy:.1f} {ex:.1f} {ey:.1f}" stroke="{INK}" stroke-width="{rnd.uniform(2.2, 3.4):.1f}"/>')
    # עלים בצדדים
    parts.append(sprig(120, 880, -62, 4, 70, rnd) + sprig(690, 900, -118, 4, 70, rnd))
    return frame(''.join(parts))


def waxing():
    rnd = random.Random(11)
    p = []
    p.append(sprig(160, 940, -70, 5, 82, rnd) + sprig(650, 950, -112, 5, 82, rnd))
    p.append(chamomile(205, 640, 32, rnd) + chamomile(610, 600, 28, rnd) + chamomile(540, 720, 22, rnd))
    # צנצנת שעווה
    p.append(f'<path d="M270 560 C268 700 268 780 300 830 C340 862 460 862 500 830 C532 780 532 700 530 560" fill="{HONEY}" fill-opacity=".9" stroke-width="5"/>')
    p.append(f'<ellipse cx="400" cy="560" rx="130" ry="34" fill="#f1c968" stroke-width="5"/>')
    p.append(f'<ellipse cx="400" cy="560" rx="104" ry="23" fill="#e6b34f" stroke-width="3"/>')
    p.append(f'<path d="M300 640 C298 720 302 780 322 806" stroke="#fbf6ee" stroke-width="7" opacity=".7"/>')
    p.append(f'<rect x="335" y="690" width="130" height="80" rx="10" fill="#fbf6ee" stroke-width="3.5"/>')
    p.append(f'<path d="M372 744 q10 -46 28 -34 q18 -12 28 34 M400 744 v-28" stroke="{SAGE}" stroke-width="3.5"/>')
    # מרית
    p.append(f'<g transform="rotate(28 420 520)"><rect x="396" y="190" width="52" height="400" rx="26" fill="{WOOD}" stroke-width="5"/>'
             f'<path d="M412 230 V520 M432 230 V520" stroke-width="2" opacity=".35"/>'
             f'<path d="M396 520 C396 580 448 580 448 520 L448 560 C448 612 396 612 396 560Z" fill="#f1c968" stroke-width="4"/></g>')
    return frame(''.join(p))


def facial():
    rnd = random.Random(5)
    p = []
    # צוואר וכתפיים
    p.append(f'<path d="M335 760 C335 820 320 850 250 880 C190 905 170 940 165 1000 M465 760 C465 820 480 850 550 880 C610 905 630 940 635 1000" stroke-width="5"/>')
    # פנים
    p.append(f'<path d="M400 258 C292 258 250 340 252 440 C254 560 305 700 400 722 C495 700 546 560 548 440 C550 340 508 258 400 258Z" fill="#f6ecdf" stroke-width="5"/>')
    # שיער + קוקו
    p.append(f'<path d="M248 470 C226 330 290 214 400 214 C510 214 574 330 552 470 C540 380 500 318 400 312 C300 318 260 380 248 470Z" fill="{INK}" fill-opacity=".88" stroke-width="4"/>')
    p.append(f'<circle cx="400" cy="178" r="58" fill="{INK}" fill-opacity=".88" stroke-width="4"/><path d="M360 160 Q400 130 440 160 M368 188 Q400 160 432 188" stroke="{BG}" stroke-width="3" opacity=".5"/>')
    # עיניים עצומות, גבות, אף, שפתיים
    for sx in (-1, 1):
        cx = 400 + sx * 78
        p.append(f'<path d="M{cx - 38} 462 Q{cx} 486 {cx + 38} 462" stroke-width="4.5"/>')
        for k in range(5):
            t = (k + .5) / 5
            x = cx - 34 + 68 * t
            y = 462 + 24 * math.sin(math.pi * t) * .72
            p.append(f'<path d="M{x:.1f} {y:.1f} q{sx * 2 + (t - .5) * 8:.1f} 10 {(t - .5) * 16:.1f} 17" stroke-width="3"/>')
        p.append(f'<path d="M{cx - 44} 424 Q{cx} {402 - sx * 0} {cx + 44} 428" stroke-width="5"/>')
    p.append(f'<path d="M400 470 C396 520 384 548 400 560 C410 566 424 560 424 556" stroke-width="3.5"/>')
    p.append(f'<path d="M358 618 Q380 606 400 614 Q420 606 442 618 Q420 644 400 644 Q380 644 358 618Z" fill="{CLAY}" fill-opacity=".8" stroke-width="3.5"/>')
    # תנועות עיסוי סביב הלחיים
    for sx in (-1, 1):
        for i, r in enumerate((48, 72, 98)):
            cx, cy = 400 + sx * 215, 560
            a0, a1 = (200, 330) if sx < 0 else (210, 340)
            pts = []
            for a in range(a0, a1, 10):
                pts.append(f'{cx + math.cos(math.radians(a if sx < 0 else 540 - a)) * r:.1f} {cy + math.sin(math.radians(a)) * r:.1f}')
            p.append(f'<path d="M{" L".join(pts)}" stroke="{CLAY}" stroke-width="{4 - i * .6:.1f}" opacity="{1 - i * .22:.2f}"/>')
    p.append(sprig(120, 960, -68, 4, 66, rnd) + sprig(680, 960, -112, 4, 66, rnd))
    return frame(''.join(p))


for name, fn in (('waxing', waxing), ('brows', brows)):
    (OUT / f'illus-{name}.svg').write_text(fn(), encoding='utf-8')
    print('illus-' + name)
