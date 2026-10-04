"""עורך את שני הסרטונים של מורן לסרטון אחד קצר (כ-27 שניות), אנכי 720x1280.

שימוש:  python tools/edit_video.py
פלט:    src/assets/video/clinic.mp4 (לאתר, בלי סאונד)
        src/assets/video/clinic-poster.webp
        media/moran-clinic-reel.mp4 (גרסה לרשתות, איכות גבוהה יותר)
"""
import os
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'תמונות מורן'
V1 = SRC / '28941.mp4'  # אור אדום/סגול + סיור בקליניקה
V2 = SRC / '28942.mp4'  # עיסוי לפטינג באור יום
FONT_SERIF = 'C\\:/Windows/Fonts/frank.ttf'
FONT_SANS = 'C\\:/Windows/Fonts/gisha.ttf'

W, H, FPS, XF = 720, 1280, 30, 0.45  # XF = משך מעבר

# גרייד לכל סוג צילום — מקרב הכל לגוון חם ואחיד
WARM_DAY = 'colorbalance=rs=.05:gs=.01:bs=-.07:rm=.03:bm=-.04,eq=contrast=1.05:saturation=.92:gamma=.98'
RED = 'colorbalance=rs=-.08:rm=-.06,eq=saturation=.72:contrast=1.04:gamma=1.04'
PURPLE = 'hue=s=.55,colorbalance=rs=.06:bs=-.14:bm=-.08,eq=brightness=.02:contrast=1.03'
DARK = 'eq=brightness=.06:contrast=1.06:gamma=1.22:saturation=.9,colorbalance=rs=.03:bs=-.03'
DRIFT = "zoompan=z='min(zoom+0.0007,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}"

# (קובץ, התחלה, סוף, גרייד, תנועת מצלמה עדינה)
CUTS = [
    (V1, 16.3, 18.9, DARK, True),     # נרות ובקבוקים — פתיחה אווירתית
    (V2, 9.6, 13.4, WARM_DAY, False),  # ידיים על הפנים (אחרי שקרדיט המוזיקה של אינסטגרם נעלם)
    (V1, 0.2, 4.2, RED, False),       # עיסוי פנים באור חם
    (V2, 15.0, 19.0, WARM_DAY, False),  # תנועות לפטינג
    (V1, 8.0, 11.6, PURPLE, False),   # ידיים על הלחיים
    (V2, 27.0, 31.0, WARM_DAY, False),
    (V1, 18.9, 21.1, DARK, True),     # קיר התעודות
    (V1, 21.6, 24.4, DARK, True),     # לוגו על הקיר
]
END_CARD = 3.2


def write_text(name, text):
    p = Path(tempfile.gettempdir()) / name
    p.write_text(text, encoding='utf-8')
    return str(p).replace('\\', '/').replace(':', '\\:')


def build(out, crf, preset, extra=()):
    t_name = write_text('mm_name.txt', 'מורן מדר')
    t_sub = write_text('mm_sub.txt', 'עיסוי · טיפולי פנים · קוסמטיקה')
    t_loc = write_text('mm_loc.txt', 'בית דגן · נשים בלבד')
    t_tel = write_text('mm_tel.txt', '054-7100209')

    inputs, chains = [], []
    for i, (f, a, b, grade, drift) in enumerate(CUTS):
        inputs += ['-ss', str(a), '-t', str(b - a), '-i', str(f)]
        move = ',' + DRIFT.format(W=W, H=H, FPS=FPS) if drift else ''
        chains.append(
            f'[{i}:v]fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,'
            f'crop={W}:{H},{grade}{move},setsar=1,format=yuv420p,settb=1/{FPS}[s{i}]'
        )

    n = len(CUTS)
    card = (
        f'color=c=0x221813:s={W}x{H}:d={END_CARD}:r={FPS},'
        f"drawbox=x=(iw-120)/2:y=560:w=120:h=1:color=0xb08a58:t=fill,"
        f"drawtext=fontfile='{FONT_SERIF}':textfile='{t_name}':fontsize=104:fontcolor=0xefe3d3:x=(w-tw)/2:y=420,"
        f"drawtext=fontfile='{FONT_SANS}':textfile='{t_sub}':fontsize=36:fontcolor=0xcdb28b:x=(w-tw)/2:y=600,"
        f"drawtext=fontfile='{FONT_SANS}':textfile='{t_loc}':fontsize=32:fontcolor=0xc9b7a3:x=(w-tw)/2:y=660,"
        f"drawtext=fontfile='{FONT_SANS}':textfile='{t_tel}':fontsize=44:fontcolor=0xefe3d3:x=(w-tw)/2:y=780,"
        f'setsar=1,format=yuv420p,settb=1/{FPS}[s{n}]'
    )
    chains.append(card)

    # שרשור עם מעברי dissolve
    durs = [b - a for (_, a, b, _, _) in CUTS] + [END_CARD]
    prev, t = 's0', durs[0]
    for i in range(1, n + 1):
        off = t - XF
        label = f'x{i}'
        chains.append(f'[{prev}][s{i}]xfade=transition=fade:duration={XF}:offset={off:.3f}[{label}]')
        prev, t = label, off + durs[i]

    # גימור: גרעין עדין, וינייטה, חידוד קל, פייד פתיחה/סגירה
    chains.append(
        f'[{prev}]vignette=PI/5,unsharp=5:5:0.45,noise=alls=3:allf=t,'
        f'fade=t=in:st=0:d=0.6,fade=t=out:st={t - 0.5:.3f}:d=0.5,format=yuv420p[out]'
    )

    cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(chains),
           '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', preset, '-crf', str(crf),
           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', *extra, str(out)]
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(cmd, check=True)
    print(f'{out}  ({t:.1f}s, {out.stat().st_size / 1e6:.1f} MB)')
    return t


def build_ambient(out):
    """לופ רקע שקט ורחב (16:10) לסקשן הציטוט: ידיים בתנועה איטית, גוון חם, טשטוש קל."""
    a, b = 15.0, 22.0
    d = b - a
    cross = 1.0  # הסוף מתמזג בהתחלה, כדי שהלופ לא "יקפוץ"
    graph = (
        f'[0:v]fps=24,crop=416:260:64:300,scale=960:600:flags=lanczos,{WARM_DAY},'
        f'colorchannelmixer=rr=1.06:gg=.98:bb=.86,eq=saturation=.78:gamma=.95,gblur=sigma=1.1,setsar=1,format=yuv420p,split[m][t];'
        f'[t]trim=0:{cross},setpts=PTS-STARTPTS[head];'
        f'[m]trim={cross}:{d},setpts=PTS-STARTPTS[body];'
        f'[body][head]xfade=transition=fade:duration={cross}:offset={d - 2 * cross:.2f}[out]'
    )
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-t', str(d), '-i', str(V2),
                    '-filter_complex', graph, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'slow',
                    '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1', '-i', str(out), '-frames:v', '1',
                    '-c:v', 'libwebp', '-quality', '70', str(out.with_name('ambient-poster.webp'))], check=True)
    print(f'{out}  ({out.stat().st_size / 1e6:.2f} MB)')


def build_hero_loop(out):
    """לופ אנכי לרקע ה-hero בנייד: רק שוטים של עיסוי, בלי כרטיס סיום, קטן וקל."""
    cuts = [CUTS[1], CUTS[3], CUTS[2], CUTS[5], CUTS[0]]  # ידיים, לפטינג, אור חם, ידיים, נרות
    w, h, fps, xf = 540, 960, 24, 0.6
    inputs, chains = [], []
    for i, (f, a, b, grade, _) in enumerate(cuts):
        inputs += ['-ss', str(a), '-t', str(b - a), '-i', str(f)]
        chains.append(f'[{i}:v]fps={fps},scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos,'
                      f'crop={w}:{h},{grade},setsar=1,format=yuv420p,settb=1/{fps}[s{i}]')
    durs = [b - a for (_, a, b, _, _) in cuts]
    prev, t = 's0', durs[0]
    for i in range(1, len(cuts)):
        off = t - xf
        chains.append(f'[{prev}][s{i}]xfade=transition=fade:duration={xf}:offset={off:.3f}[x{i}]')
        prev, t = f'x{i}', off + durs[i]
    chains.append(f'[{prev}]fade=t=in:st=0:d=0.5,fade=t=out:st={t - 0.5:.3f}:d=0.5,format=yuv420p[out]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(chains), '-map', '[out]',
                    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(out)], check=True)
    print(f'{out}  ({t:.1f}s, {out.stat().st_size / 1e6:.2f} MB)')


if __name__ == '__main__':
    build_hero_loop(ROOT / 'src/assets/video/hero.mp4')
    build_ambient(ROOT / 'src/assets/video/ambient.mp4')
    site = ROOT / 'src/assets/video/clinic.mp4'
    build(site, crf=27, preset='slow', extra=('-profile:v', 'high', '-tune', 'film'))
    build(ROOT / 'media/moran-clinic-reel.mp4', crf=18, preset='slow')
    # פוסטר: פריים מהשוט של הלפטינג
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '7.6', '-i', str(site), '-frames:v', '1',
                    '-c:v', 'libwebp', '-quality', '82', str(site.with_name('clinic-poster.webp'))], check=True)
