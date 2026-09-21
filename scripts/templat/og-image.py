"""
Builds the share image static/og-image.png (1200 by 630): the white Pertamina Foundation logo on the brand blue,
with the generic programme name. Run from the repo root: python scripts/templat/og-image.py
"""
from PIL import Image, ImageDraw, ImageFont

OUT = 'static/og-image.png'
W, H = 1200, 630
BLUE = (0, 102, 178)
DEEP = (1, 90, 154)
WHITE = (255, 255, 255)
SOFT = (223, 240, 255)


def font(size, bold=False):
    for name in (['segoeuisb.ttf', 'segoeui.ttf'] if bold else ['segoeui.ttf']):
        try:
            return ImageFont.truetype('C:/Windows/Fonts/' + name, size)
        except OSError:
            continue
    return ImageFont.load_default()


img = Image.new('RGB', (W, H), BLUE)
draw = ImageDraw.Draw(img)
# A quiet diagonal band in a deeper blue, so the card is not a flat rectangle.
draw.polygon([(760, 0), (W, 0), (W, H), (560, H)], fill=DEEP)

logo = Image.open('static/logo-pf-white.png').convert('RGBA')
scale = 380 / logo.width
logo = logo.resize((380, round(logo.height * scale)), Image.LANCZOS)
img.paste(logo, (90, 80), logo)

draw.text((90, 300), 'Desa Energi Berdikari', font=font(74, bold=True), fill=WHITE)
draw.text((90, 400), 'Pertamina Foundation', font=font(44), fill=SOFT)
draw.text((90, 530), 'deb.pertaminafoundation.org', font=font(30), fill=SOFT)
img.save(OUT, optimize=True)
print('written', OUT, img.size)
