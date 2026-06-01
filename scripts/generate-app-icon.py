#!/usr/bin/env python3
"""Genera icon.png, apple-icon.png y favicon.ico (MF + Claude) para Next.js."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
APP = ROOT / "src" / "app"

SIZE = 512
APPLE = 180
FAVICON = 32


def rounded_mask(size: int, radius: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def apply_rounded(img: Image.Image, radius: float) -> Image.Image:
    w, h = img.size
    mask = rounded_mask(w, radius)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def gradient_bg(size: int) -> Image.Image:
    """Fondo blanco limpio (ligero degradado para profundidad)."""
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        # #ffffff → #f4f4f5 (neutral-100)
        v = int(255 - t * 11)
        draw.line([(0, y), (size, y)], fill=(v, v, v + 1 if v < 255 else 255, 255))
    return img


def drop_shadow(tile: Image.Image, offset: tuple[int, int], blur: int = 14) -> Image.Image:
    pad = blur * 3
    w, h = tile.size
    shadow = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    alpha = tile.split()[3]
    black = Image.new("RGBA", tile.size, (0, 0, 0, 100))
    black.putalpha(alpha)
    shadow.paste(black, (pad + offset[0], pad + offset[1]))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    out.paste(shadow, (0, 0))
    out.paste(tile, (pad, pad), tile)
    return out, pad


def scale_logo(path: Path, px: int) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img = img.resize((px, px), Image.Resampling.LANCZOS)
    return apply_rounded(img, px * 0.22)


def plus_badge(d: int) -> Image.Image:
    img = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((0, 0, d - 1, d - 1), fill=(250, 250, 250, 255))
    draw.ellipse((1, 1, d - 2, d - 2), outline=(228, 228, 231, 255), width=max(1, d // 32))
    stroke = max(2, d // 14)
    arm = d // 3
    cx, cy = d // 2, d // 2
    plus_color = (82, 82, 91, 255)  # neutral-600
    draw.rectangle(
        (cx - arm // 2, cy - stroke // 2, cx + arm // 2, cy + stroke // 2),
        fill=plus_color,
    )
    draw.rectangle(
        (cx - stroke // 2, cy - arm // 2, cx + stroke // 2, cy + arm // 2),
        fill=plus_color,
    )
    return img


def compose(size: int) -> Image.Image:
    bg = gradient_bg(size)
    mask = rounded_mask(size, size * 0.22)
    bg.putalpha(mask)

    tile = int(size * 0.42)
    gap = int(size * 0.06)
    mf = scale_logo(BRAND / "macrofactor.png", tile)
    claude = scale_logo(BRAND / "claude.png", tile)

    mf_s, pad = drop_shadow(mf, (2, 4), blur=int(size * 0.028))
    cl_s, _ = drop_shadow(claude, (2, 4), blur=int(size * 0.028))

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(bg, (0, 0))

    group_w = tile * 2 - gap
    ox = (size - group_w) // 2
    oy = (size - tile) // 2

    canvas.paste(mf_s, (ox - pad, oy - pad), mf_s)
    canvas.paste(cl_s, (ox + tile - gap - pad, oy - pad), cl_s)

    badge = plus_badge(int(size * 0.16))
    bx = size // 2 - badge.size[0] // 2
    by = size // 2 - badge.size[1] // 2
    canvas.paste(badge, (bx, by), badge)

    return canvas


def save_ico(img: Image.Image, path: Path) -> None:
    sizes = [16, 32, 48]
    icons = [img.resize((s, s), Image.Resampling.LANCZOS) for s in sizes]
    icons[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=icons[1:],
    )


def main() -> None:
    icon = compose(SIZE)
    APP.mkdir(parents=True, exist_ok=True)

    icon.save(APP / "icon.png", format="PNG", optimize=True)
    icon.resize((APPLE, APPLE), Image.Resampling.LANCZOS).save(
        APP / "apple-icon.png", format="PNG", optimize=True
    )
    save_ico(icon, APP / "favicon.ico")

    # Open Graph / PWA opcional
    public = ROOT / "public"
    icon.resize((512, 512), Image.Resampling.LANCZOS).save(
        public / "icon-512.png", format="PNG", optimize=True
    )

    print("Generated:", APP / "icon.png", APP / "apple-icon.png", APP / "favicon.ico")


if __name__ == "__main__":
    main()
