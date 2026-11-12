# Build all app icons from logo-a-source.jpg: full-bleed master, adaptive fg/bg, launcher/round mipmaps, web, Play, splash.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os, json
ROOT = os.path.dirname(os.path.abspath(__file__)); APP = os.path.dirname(ROOT)
src = np.asarray(Image.open(os.path.join(ROOT, 'logo-a-source.jpg')).convert('RGB')).astype(np.float32)
H, W, _ = src.shape
# 1) rounded-square bounds: rows/cols that are clearly non-white
nonwhite = (src.min(axis=2) < 200)
ys, xs = np.where(nonwhite); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
print('square bbox', x0, y0, x1, y1)
# 2) fit background gradient (quadratic in x,y) on interior pixels away from the content
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
sat = src.max(axis=2) - src.min(axis=2)
# background = bluish/violet (b > r+20, g small), exclude white/gold content
bgmask = (src[..., 2] > src[..., 0] + 25) & (src[..., 1] < 90) & nonwhite
bgmask &= (xx > x0 + 25) & (xx < x1 - 25) & (yy > y0 + 25) & (yy < y1 - 25)
def feats(x, y):
    x = (x - W / 2) / W; y = (y - H / 2) / H
    return np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], -1)
F = feats(xx[bgmask], yy[bgmask]); coefs = [np.linalg.lstsq(F, src[..., c][bgmask], rcond=None)[0] for c in range(3)]
grad_at = lambda x, y: np.stack([feats(x, y) @ coefs[c] for c in range(3)], -1)
G = grad_at(xx, yy); res = np.abs(G[bgmask] - src[bgmask]).mean(); print('gradient fit residual', round(float(res), 2))
# 3) foreground alpha: distance from local gradient, within the square interior
d = np.sqrt(((src - G) ** 2).sum(-1))
inner = Image.new('L', (W, H), 0); r = int((x1 - x0) * 0.17)
ImageDraw.Draw(inner).rounded_rectangle([x0 + 6, y0 + 6, x1 - 6, y1 - 6], radius=r, fill=255)
inner = np.asarray(inner.filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
inner2 = Image.new('L', (W, H), 0); ImageDraw.Draw(inner2).rounded_rectangle([x0 + 45, y0 + 45, x1 - 45, y1 - 45], radius=r, fill=255)
alpha = np.clip((d - 18) / 40, 0, 1) * (np.asarray(inner2).astype(np.float32) / 255)
# drop small specks (JPEG noise): keep only pixels in a dilated version of strong content
strong = Image.fromarray(((alpha > 0.6) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
alpha *= np.asarray(strong).astype(np.float32) / 255
# content bbox
cy, cx = np.where(alpha > 0.5); bx0, bx1, by0, by1 = cx.min(), cx.max(), cy.min(), cy.max(); print('content bbox', bx0, by0, bx1, by1)
# 4) master: crop the square region, replace everything outside the rounded interior by the fitted gradient
S = min(x1 - x0, y1 - y0); cxs, cys = (x0 + x1) / 2, (y0 + y1) / 2
master = src * inner[..., None] + G * (1 - inner[..., None])
box = (int(cxs - S / 2), int(cys - S / 2), int(cxs - S / 2) + S, int(cys - S / 2) + S)
# foreground RGBA (unpremultiply: colour = source where content), cropped to the same square
fg = np.dstack([src, alpha * 255]).astype(np.uint8)
FG = Image.fromarray(fg, 'RGBA').crop(box).resize((1024, 1024), Image.LANCZOS)
# background-only square (gradient)
BG = Image.fromarray(np.clip(G, 0, 255).astype(np.uint8)).crop(box).resize((1024, 1024), Image.LANCZOS)
BG.save(os.path.join(ROOT, 'logo-background-1024.png'))
M = BG.convert('RGBA'); M.alpha_composite(FG); M.convert('RGB').save(os.path.join(ROOT, 'logo-master-1024.png'))
# tight foreground (content bbox in master coords)
fb = FG.getbbox(); FGt = FG.crop(fb); FGt.save(os.path.join(ROOT, 'logo-foreground-tight.png')); print('fg tight', FGt.size)
def fit(img, size, frac):
    """img centred, longest side = frac*size, on transparent canvas"""
    w, h = img.size; k = frac * size / max(w, h); im = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    c = Image.new('RGBA', (size, size), (0, 0, 0, 0)); c.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2)); return c
def rounded(img, rad):
    m = Image.new('L', (img.width * 4, img.height * 4), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, img.width * 4 - 1, img.height * 4 - 1], radius=rad * 4, fill=255); m = m.resize(img.size, Image.LANCZOS)
    o = img.convert('RGBA'); o.putalpha(m); return o
def circle(img):
    m = Image.new('L', (img.width * 4, img.height * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, img.width * 4 - 1, img.height * 4 - 1], fill=255); m = m.resize(img.size, Image.LANCZOS)
    o = img.convert('RGBA'); o.putalpha(m); return o
# full-bleed composite with content scaled for a given frame
def compose(size, frac):
    b = BG.resize((size, size), Image.LANCZOS).convert('RGBA'); b.alpha_composite(fit(FGt, size, frac)); return b
RES = os.path.join(APP, 'capacitor/android/app/src/main/res')
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for dn, k in dens.items():
    d = os.path.join(RES, 'mipmap-' + dn); os.makedirs(d, exist_ok=True)
    s = round(48 * k); full = compose(s * 4, 0.80).resize((s, s), Image.LANCZOS)
    rounded(full, round(s * 0.18)).save(os.path.join(d, 'ic_launcher.png'))
    circle(compose(s * 4, 0.70).resize((s, s), Image.LANCZOS)).save(os.path.join(d, 'ic_launcher_round.png'))
    fs = round(108 * k)  # adaptive foreground: 108dp canvas, 66dp safe zone -> content fits in ~60dp
    fit(FGt, fs, 60 / 108).save(os.path.join(d, 'ic_launcher_foreground.png'))
    BG.resize((fs, fs), Image.LANCZOS).save(os.path.join(d, 'ic_launcher_background.png'))
ad = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@drawable/ic_stat_notify_mono"/>\n</adaptive-icon>\n'
for n in ['ic_launcher.xml', 'ic_launcher_round.xml']: open(os.path.join(RES, 'mipmap-anydpi-v26', n), 'w').write(ad)
# splash: gradient + centred logo content (portrait/landscape all densities)
spl = {'port-mdpi': (320, 480), 'port-hdpi': (480, 800), 'port-xhdpi': (720, 1280), 'port-xxhdpi': (960, 1600), 'port-xxxhdpi': (1280, 1920),
       'land-mdpi': (480, 320), 'land-hdpi': (800, 480), 'land-xhdpi': (1280, 720), 'land-xxhdpi': (1600, 960), 'land-xxxhdpi': (1920, 1280)}
def splash(w, h):
    big = BG.resize((max(w, h),) * 2, Image.LANCZOS); b = big.crop(((big.width - w) // 2, (big.height - h) // 2, (big.width - w) // 2 + w, (big.height - h) // 2 + h)).convert('RGBA')
    f = fit(FGt, min(w, h), 0.46); b.alpha_composite(f, ((w - f.width) // 2, (h - f.height) // 2)); return b.convert('RGB')
for k, (w, h) in spl.items(): splash(w, h).save(os.path.join(RES, 'drawable-' + k, 'splash.png'))
splash(1280, 1920).save(os.path.join(RES, 'drawable', 'splash.png'))
# Android 12+ splash icon: content inside 2/3 circle of a 288dp canvas -> use foreground with smaller frac
for dn, k in dens.items():
    fit(FGt, round(288 * k), 0.50).save(os.path.join(RES, 'mipmap-' + dn, 'ic_splash_icon.png'))
# web + play
compose(512, 0.80).convert('RGB').save(os.path.join(APP, 'icon-512.png'))
compose(192, 0.80).convert('RGB').save(os.path.join(APP, 'icon-192.png'))
compose(1024, 0.80).convert('RGB').save(os.path.join(APP, 'icon-1024.png'))
compose(512, 0.62).convert('RGB').save(os.path.join(APP, 'icon-maskable-512.png'))
compose(192, 0.62).convert('RGB').save(os.path.join(APP, 'icon-maskable-192.png'))
compose(180, 0.80).convert('RGB').save(os.path.join(APP, 'apple-touch-icon.png'))
rounded(compose(256, 0.86), 56).resize((64, 64), Image.LANCZOS).save(os.path.join(APP, 'favicon-64.png'))
rounded(compose(128, 0.86), 28).resize((32, 32), Image.LANCZOS).save(os.path.join(APP, 'favicon-32.png'))
rounded(compose(256, 0.86), 56).save(os.path.join(APP, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
compose(512, 0.80).convert('RGB').save(os.path.join(ROOT, 'play-store-icon-512.png'))
rounded(compose(256, 0.84), 58).save(os.path.join(APP, 'logo-256.png'))  # in-app logo
# preview sheet: launcher-style
pv = Image.new('RGB', (1200, 560), (236, 238, 245)); dr = ImageDraw.Draw(pv)
items = [('Legacy', rounded(compose(768, .80), 138)), ('Round', circle(compose(768, .70))),
         ('Adaptive circle', None), ('Adaptive squircle', None), ('Play Store', rounded(compose(768, .80), 150))]
def adaptive(mask):
    c = BG.resize((432, 432), Image.LANCZOS).convert('RGBA'); c.alpha_composite(fit(FGt, 432, 60 / 108))
    c = c.crop((36, 36, 396, 396)).resize((768, 768), Image.LANCZOS)  # launchers show the inner 72dp of 108dp
    return circle(c) if mask == 'c' else rounded(c, 250)
items[2] = ('Adaptive circle', adaptive('c')); items[3] = ('Adaptive squircle', adaptive('s'))
for i, (lab, im) in enumerate(items):
    x = 40 + i * 230; t = im.resize((190, 190), Image.LANCZOS); pv.paste(t, (x, 110), t)
    dr.text((x + 95 - len(lab) * 3.5, 320), lab, fill=(60, 60, 80))
pv.save(os.path.join(ROOT, 'preview-icons.png'))
print('done')
