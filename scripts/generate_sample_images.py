from dataclasses import dataclass
from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

CANVAS = 640
THUMB = 240
SCALE = 3
OUT = Path("public/image")


@dataclass(frozen=True)
class Product:
    title: str
    kind: str
    palette: tuple[str, str, str]
    background: str = "dark"


PRODUCTS = [
    Product("Nintendo Switch 2 Console Bundle", "switch_bundle", ("#11d8f5", "#ff4d6d", "#f8fafc"), "dark"),
    Product("PlayStation 5 Slim Disc Edition", "ps5", ("#f7f7fb", "#161b3d", "#4f8cff"), "white"),
    Product("Xbox Series X Console", "xbox", ("#101820", "#15c75f", "#f4f7f5"), "dark"),
    Product("Mario Kart World", "game_case", ("#ff3b30", "#ffd60a", "#39c5ff"), "white"),
    Product("Zelda Fantasy Adventure", "game_case", ("#0b6b4f", "#d9a441", "#f7efe0"), "dark"),
    Product("Final Fantasy RPG", "game_case", ("#252b48", "#86d9ff", "#f7f7ff"), "white"),
    Product("Elden Ring Dark Fantasy", "game_case", ("#1b140b", "#c79a33", "#efe2b6"), "dark"),
    Product("FC26 Football Game", "game_case", ("#0b6b39", "#e9f7ef", "#2cc36b"), "white"),
    Product("DualSense Controller", "ps_controller", ("#f8fafc", "#1d2433", "#578bff"), "dark"),
    Product("Xbox Wireless Controller", "xbox_controller", ("#141a18", "#35d06d", "#f3f6f4"), "white"),
    Product("Switch Pro Controller", "pro_controller", ("#252a35", "#52d1ff", "#ff5f7e"), "dark"),
    Product("Gaming Headset", "headset", ("#161923", "#7c3aed", "#38bdf8"), "white"),
    Product("NVMe Expansion Card", "card", ("#20242c", "#d4af37", "#f4f4f5"), "dark"),
    Product("Fighting Game Deluxe Edition", "game_case", ("#7f1d1d", "#f97316", "#fff7ed"), "dark"),
    Product("Racing Simulator Game", "game_case", ("#111827", "#ef4444", "#f8fafc"), "white"),
    Product("Super Hero Action Game", "game_case", ("#1d4ed8", "#ef4444", "#fde68a"), "dark"),
    Product("Portable Console Carrying Case", "carry_case", ("#111827", "#6b7280", "#f8fafc"), "white"),
    Product("HDMI 2.1 Cable", "cable", ("#101214", "#2dd4bf", "#f8fafc"), "dark"),
    Product("Monster Hunter Adventure", "game_case", ("#254117", "#a16207", "#fef3c7"), "white"),
    Product("Controller Charging Dock", "dock", ("#111827", "#60a5fa", "#f8fafc"), "dark"),
]


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    family = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(family, size * SCALE)


def scaled(points):
    return tuple(int(round(p * SCALE)) for p in points)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(scaled(box), radius=radius * SCALE, fill=fill, outline=outline, width=width * SCALE)


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=None, width=1):
    draw.ellipse(scaled(box), fill=fill, outline=outline, width=width * SCALE)


def polygon(draw: ImageDraw.ImageDraw, xy, fill, outline=None):
    draw.polygon([scaled(p) for p in xy], fill=fill, outline=outline)


def line(draw: ImageDraw.ImageDraw, xy, fill, width=1):
    draw.line([scaled(p) for p in xy], fill=fill, width=width * SCALE, joint="curve")


def create_background(product: Product, seed: int) -> Image.Image:
    random.seed(seed)
    preview = 320
    bg = Image.new("RGB", (preview, preview), "white")
    pixels = bg.load()
    dark = product.background == "dark"
    top = (10, 13, 20) if dark else (246, 247, 250)
    bottom = (29, 35, 50) if dark else (218, 223, 232)
    accent = hex_to_rgb(product.palette[1])

    for y in range(preview):
        t = y / (preview - 1)
        base = tuple(int(top[c] * (1 - t) + bottom[c] * t) for c in range(3))
        for x in range(preview):
            dx = (x - preview * 0.5) / preview
            dy = (y - preview * 0.44) / preview
            spot = max(0, 1 - (dx * dx * 8 + dy * dy * 12))
            side = max(0, 1 - ((x - preview * 0.18) / preview) ** 2 * 16 - ((y - preview * 0.2) / preview) ** 2 * 20)
            color = []
            for c in range(3):
                v = base[c] + spot * (55 if dark else 32) + side * accent[c] * (0.18 if dark else 0.08)
                color.append(int(max(0, min(255, v))))
            pixels[x, y] = tuple(color)

    bg = bg.resize((CANVAS * SCALE, CANVAS * SCALE), Image.Resampling.BICUBIC)
    d = ImageDraw.Draw(bg, "RGBA")
    w = h = CANVAS * SCALE
    for _ in range(38):
        x = random.randint(0, w)
        y = random.randint(0, h)
        a = random.randint(7, 22) if dark else random.randint(5, 14)
        r = random.randint(1, 3) * SCALE
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, a))
    return bg

def shadow_layer(size, box, radius=32, opacity=150, blur=22):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    d.rounded_rectangle(scaled(box), radius=radius * SCALE, fill=(0, 0, 0, opacity))
    return layer.filter(ImageFilter.GaussianBlur(blur * SCALE))


def draw_floor_shadow(img: Image.Image, box=(155, 498, 485, 560), opacity=86):
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse(scaled(box), fill=(0, 0, 0, opacity))
    img.alpha_composite(img.filter(ImageFilter.GaussianBlur(0)))


def draw_product_title(draw: ImageDraw.ImageDraw, title: str, dark: bool):
    color = (245, 247, 250, 235) if dark else (20, 25, 35, 230)
    sub = (180, 190, 210, 190) if dark else (95, 105, 122, 210)
    label_font = font(15, True)
    title_font = font(20, True)
    draw.text(scaled((34, 34)), "PLUM COMMERCE", font=label_font, fill=sub)
    words = title.split()
    lines = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=title_font) <= 410 * SCALE:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    for idx, text in enumerate(lines[:2]):
        draw.text(scaled((34, 58 + idx * 25)), text, font=title_font, fill=color)


def draw_case(img, product: Product, idx: int):
    d = ImageDraw.Draw(img, "RGBA")
    primary, accent, light = [hex_to_rgb(c) for c in product.palette]
    img.alpha_composite(shadow_layer(img.size, (205, 142, 465, 514), radius=24, opacity=145, blur=18))
    polygon(d, [(227, 116), (472, 145), (434, 530), (190, 493)], fill=tuple(primary) + (255,))
    polygon(d, [(227, 116), (472, 145), (451, 177), (208, 148)], fill=tuple(light) + (55,))
    polygon(d, [(451, 177), (472, 145), (434, 530), (414, 489)], fill=(0, 0, 0, 95))
    rounded(d, (217, 152, 435, 493), 10, tuple(primary) + (255,), tuple(light) + (95,), 2)
    rounded(d, (238, 176, 414, 306), 12, tuple(accent) + (230,))
    for k in range(5):
        y = 188 + k * 20
        line(d, [(255, y), (394, y + 18)], fill=tuple(light) + (120,), width=3)
    ellipse(d, (286, 334, 372, 420), fill=tuple(accent) + (210,))
    line(d, [(282, 428), (376, 428)], fill=tuple(light) + (210,), width=5)
    line(d, [(300, 448), (358, 448)], fill=tuple(light) + (160,), width=3)
    d.text(scaled((247, 464)), "DELUXE", font=font(18, True), fill=tuple(light) + (235,))


def draw_console(img, product: Product, variant: str):
    d = ImageDraw.Draw(img, "RGBA")
    primary, accent, light = [hex_to_rgb(c) for c in product.palette]
    img.alpha_composite(shadow_layer(img.size, (142, 196, 500, 480), radius=34, opacity=150, blur=20))
    if variant == "switch_bundle":
        rounded(d, (134, 203, 506, 444), 34, (16, 18, 25, 255), tuple(light) + (55,), 2)
        rounded(d, (195, 222, 445, 425), 12, (26, 31, 42, 255))
        rounded(d, (147, 205, 195, 442), 28, tuple(primary) + (255,))
        rounded(d, (445, 205, 493, 442), 28, tuple(accent) + (255,))
        ellipse(d, (162, 242, 180, 260), fill=(18, 24, 31, 255))
        ellipse(d, (459, 352, 477, 370), fill=(18, 24, 31, 255))
        line(d, [(240, 322), (400, 322)], fill=tuple(primary) + (120,), width=5)
        d.text(scaled((247, 282)), "2", font=font(54, True), fill=tuple(light) + (215,))
    elif variant == "ps5":
        rounded(d, (212, 135, 430, 492), 36, (245, 247, 252, 255), (190, 198, 214, 255), 2)
        rounded(d, (282, 126, 360, 502), 20, tuple(accent) + (255,))
        rounded(d, (300, 145, 342, 482), 10, (18, 21, 31, 255))
        line(d, [(230, 190), (270, 170), (270, 448), (232, 421)], fill=(180, 190, 210, 180), width=3)
        ellipse(d, (317, 184, 327, 194), fill=(90, 140, 255, 255))
    else:
        rounded(d, (227, 124, 413, 505), 22, tuple(primary) + (255,), (80, 88, 100, 255), 2)
        ellipse(d, (271, 151, 369, 249), fill=(20, 25, 24, 255), outline=tuple(accent) + (190,), width=3)
        for i in range(8):
            angle = i * math.pi / 4
            x = 320 + math.cos(angle) * 31
            y = 200 + math.sin(angle) * 31
            ellipse(d, (x - 4, y - 4, x + 4, y + 4), fill=tuple(accent) + (210,))
        rounded(d, (251, 378, 389, 412), 8, (34, 41, 45, 255))


def draw_controller(img, product: Product, variant: str):
    d = ImageDraw.Draw(img, "RGBA")
    primary, accent, light = [hex_to_rgb(c) for c in product.palette]
    img.alpha_composite(shadow_layer(img.size, (124, 244, 520, 438), radius=60, opacity=130, blur=18))
    body = tuple(primary) + (255,)
    polygon(d, [(142, 314), (198, 248), (288, 265), (320, 296), (352, 265), (442, 248), (498, 314), (468, 424), (374, 389), (320, 399), (266, 389), (172, 424)], fill=body)
    rounded(d, (194, 262, 446, 382), 58, body, tuple(light) + (70,), 2)
    if variant == "ps_controller":
        rounded(d, (257, 275, 383, 354), 38, (24, 28, 38, 255))
    ellipse(d, (210, 304, 258, 352), fill=(28, 31, 38, 255))
    line(d, [(224, 328), (244, 328)], fill=tuple(light) + (220,), width=4)
    line(d, [(234, 318), (234, 338)], fill=tuple(light) + (220,), width=4)
    for x, y in [(405, 300), (429, 324), (381, 324), (405, 348)]:
        ellipse(d, (x - 10, y - 10, x + 10, y + 10), fill=tuple(accent) + (255,))
    ellipse(d, (287, 344, 313, 370), fill=(36, 42, 53, 255))
    ellipse(d, (327, 344, 353, 370), fill=(36, 42, 53, 255))
    line(d, [(286, 286), (354, 286)], fill=tuple(accent) + (180,), width=4)


def draw_accessory(img, product: Product, variant: str):
    d = ImageDraw.Draw(img, "RGBA")
    primary, accent, light = [hex_to_rgb(c) for c in product.palette]
    img.alpha_composite(shadow_layer(img.size, (134, 194, 508, 490), radius=42, opacity=130, blur=20))
    if variant == "headset":
        line(d, [(207, 335), (207, 247), (243, 180), (320, 156), (397, 180), (433, 247), (433, 335)], fill=tuple(primary) + (255,), width=30)
        line(d, [(230, 332), (230, 256), (260, 210), (320, 192), (380, 210), (410, 256), (410, 332)], fill=tuple(accent) + (210,), width=8)
        rounded(d, (156, 303, 238, 432), 26, tuple(primary) + (255,), tuple(accent) + (180,), 3)
        rounded(d, (402, 303, 484, 432), 26, tuple(primary) + (255,), tuple(accent) + (180,), 3)
        line(d, [(430, 428), (380, 466), (342, 458)], fill=tuple(accent) + (235,), width=7)
    elif variant == "card":
        rounded(d, (191, 222, 449, 391), 20, tuple(primary) + (255,), tuple(light) + (90,), 2)
        rounded(d, (219, 251, 421, 330), 10, (37, 43, 54, 255))
        for x in range(210, 432, 26):
            line(d, [(x, 391), (x + 10, 413)], fill=tuple(accent) + (255,), width=6)
        line(d, [(238, 286), (396, 286)], fill=tuple(accent) + (220,), width=4)
        d.text(scaled((240, 343)), "NVMe", font=font(24, True), fill=tuple(light) + (230,))
    elif variant == "carry_case":
        rounded(d, (154, 226, 486, 420), 54, tuple(primary) + (255,), tuple(light) + (110,), 2)
        rounded(d, (198, 198, 442, 260), 28, (0, 0, 0, 0), tuple(primary) + (255,), 14)
        line(d, [(179, 320), (461, 320)], fill=tuple(accent) + (255,), width=5)
        rounded(d, (293, 302, 347, 338), 8, tuple(light) + (230,))
    elif variant == "cable":
        for off in [0, 18, 36]:
            line(d, [(195, 330 + off), (256, 232 + off), (383, 234 + off), (445, 330 + off)], fill=tuple(primary) + (255,), width=16)
        rounded(d, (145, 306, 220, 376), 14, tuple(primary) + (255,), tuple(accent) + (200,), 3)
        rounded(d, (420, 306, 495, 376), 14, tuple(primary) + (255,), tuple(accent) + (200,), 3)
        rounded(d, (161, 322, 207, 360), 5, tuple(light) + (235,))
        rounded(d, (433, 322, 479, 360), 5, tuple(light) + (235,))
    else:
        rounded(d, (168, 312, 472, 408), 20, tuple(primary) + (255,), tuple(light) + (100,), 2)
        rounded(d, (206, 256, 434, 335), 28, (24, 28, 36, 255), tuple(accent) + (220,), 4)
        ellipse(d, (245, 194, 295, 244), fill=tuple(accent) + (255,))
        ellipse(d, (345, 194, 395, 244), fill=tuple(accent) + (255,))
        line(d, [(270, 244), (270, 294)], fill=tuple(accent) + (230,), width=7)
        line(d, [(370, 244), (370, 294)], fill=tuple(accent) + (230,), width=7)


def draw_scene(product: Product, index: int) -> Image.Image:
    img = create_background(product, index).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    draw_product_title(d, product.title, product.background == "dark")
    d.ellipse(scaled((136, 505, 504, 568)), fill=(0, 0, 0, 70))
    if product.kind in {"switch_bundle", "ps5", "xbox"}:
        draw_console(img, product, product.kind)
    elif product.kind == "game_case":
        draw_case(img, product, index)
    elif product.kind in {"ps_controller", "xbox_controller", "pro_controller"}:
        draw_controller(img, product, product.kind)
    else:
        draw_accessory(img, product, product.kind)

    shine = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shine, "RGBA")
    sd.rectangle(scaled((0, 0, 640, 640)), outline=(255, 255, 255, 24), width=2 * SCALE)
    img.alpha_composite(shine)
    img = img.resize((CANVAS, CANVAS), Image.Resampling.LANCZOS).convert("RGB")
    img = ImageEnhance.Sharpness(img).enhance(1.08)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for idx, product in enumerate(PRODUCTS, start=1):
        image = draw_scene(product, idx)
        image.save(OUT / f"product_{idx:02d}.jpg", "JPEG", quality=94, optimize=True, progressive=True)
        image.resize((THUMB, THUMB), Image.Resampling.LANCZOS).save(
            OUT / f"thumb_product_{idx:02d}.jpg", "JPEG", quality=92, optimize=True, progressive=True
        )
    print(f"generated {len(PRODUCTS)} product images and {len(PRODUCTS)} thumbnails in {OUT}")


if __name__ == "__main__":
    main()
