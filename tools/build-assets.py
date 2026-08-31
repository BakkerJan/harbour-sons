"""Derive web-optimised brand assets from the master logo files.

Run:  python tools/build-assets.py "C:/path/to/Logo"
The master art lives outside the repo (huge .ai/.eps/6250px PNGs); this script
emits only the trimmed, resized, web-ready files that are committed.
"""
import os
import sys
from PIL import Image, ImageChops

SRC = sys.argv[1] if len(sys.argv) > 1 else \
    "C:/Users/JanBakker/Downloads/Logo-20260831T140852Z-1-001/Logo"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets", "img")


def load(rel):
    return Image.open(os.path.join(SRC, rel)).convert("RGBA")


def trim(im, pad=0.015):
    """Crop away fully transparent margins, then add a small even breathing pad."""
    box = im.getchannel("A").getbbox()
    im = im.crop(box)
    p = int(max(im.size) * pad)
    out = Image.new("RGBA", (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0))
    out.alpha_composite(im, (p, p))
    return out


def fit(im, w):
    if im.width <= w:
        return im
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def white_ink(im):
    """Black line art -> white line art on transparent.

    Rather than inverting RGB and keeping the old alpha, fold the ink density
    into the alpha channel and make RGB a flat white. The result looks
    identical on a dark background but roughly halves the file size: WebP
    compresses a constant colour plane to nothing and only has to carry the
    detail once, in alpha.
    """
    r, g, b, a = im.split()
    lum = Image.merge("RGB", (r, g, b)).convert("L")   # 0 = ink, 255 = paper
    density = ImageChops.invert(lum)                   # 255 = ink, 0 = paper
    out = Image.new("RGBA", im.size, (255, 255, 255, 0))
    out.putalpha(ImageChops.multiply(density, a))
    return out


def save(im, name, quality=82):
    path = os.path.join(OUT, name)
    if name.endswith(".webp"):
        im.save(path, "WEBP", quality=quality, method=6)
    else:
        im.save(path, "PNG", optimize=True)
    print(f"  {name:28s} {im.size[0]}x{im.size[1]}  {os.path.getsize(path)/1024:7.1f} KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("Building web assets ->", OUT)

    badge = trim(load("Harbour-02.png"))            # colour oval, full lockup
    seal = trim(load("Sublogo 2026/Harbour sons-02 (1).png"))  # colour rope roundel
    wide = trim(load("Sublogo 2026/Harbour sons-04 (1).png"))  # colour horizontal lockup
    mono = trim(load("Harbour-03.png"))             # mono oval line art

    save(fit(badge, 900), "badge-color.webp")
    save(fit(seal, 640), "seal-color.webp")
    save(fit(wide, 1400), "lockup-wide.webp")
    save(fit(white_ink(mono), 640), "badge-white.webp")
    save(fit(white_ink(trim(load("Sublogo 2026/Harbour sons-07.png"))), 320),
         "seal-white.webp")
    save(fit(white_ink(trim(load("Sublogo 2026/Harbour sons-08.png"))), 1000),
         "lockup-white.webp")

    # Favicons / PWA icons - square canvas, roundel centred
    for px in (32, 180, 512):
        icon = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        s = fit(seal.copy(), px)
        icon.alpha_composite(s, ((px - s.width) // 2, (px - s.height) // 2))
        save(icon, f"icon-{px}.png")

    # Open Graph card: 1200x630 on brand cream, badge centred
    og = Image.new("RGBA", (1200, 630), (251, 243, 228, 255))
    b = badge.copy()
    b.thumbnail((520, 520), Image.LANCZOS)
    og.alpha_composite(b, ((1200 - b.width) // 2, (630 - b.height) // 2))
    save(og.convert("RGB"), "og-card.png")


if __name__ == "__main__":
    main()
