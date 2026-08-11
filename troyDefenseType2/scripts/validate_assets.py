#!/usr/bin/env python3
"""Validate local asset references and the no-code-generated-art policy."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "src"
PUBLIC_DIR = ROOT / "public"
FORBIDDEN = {
    "Phaser Graphics": r"add\.graphics|GameObjects\.Graphics|generateTexture",
    "Canvas texture": r"createCanvas|textures\.addBase64|data:image/svg",
    "Geometry placeholder": r"add\.(rectangle|circle|triangle|polygon)\s*\(",
    "SVG loading": r"load\.svg|<svg",
}


def main() -> None:
    source = "\n".join(path.read_text() for path in SOURCE_DIR.rglob("*.ts"))
    failures: list[str] = []

    for label, pattern in FORBIDDEN.items():
        if re.search(pattern, source):
            failures.append(f"Forbidden visual technique found: {label}")

    references = sorted(set(re.findall(r'["\'](/assets/[^"\']+)["\']', source)))
    for reference in references:
        path = PUBLIC_DIR / reference.removeprefix("/")
        if not path.is_file():
            failures.append(f"Missing asset: {reference}")

    svg_files = list(PUBLIC_DIR.rglob("*.svg"))
    if svg_files:
        failures.extend(f"SVG game asset is not allowed: {path}" for path in svg_files)

    transparent_dirs = [
        PUBLIC_DIR / "assets" / "units",
        PUBLIC_DIR / "assets" / "heroes",
        PUBLIC_DIR / "assets" / "enemies",
        PUBLIC_DIR / "assets" / "bosses",
        PUBLIC_DIR / "assets" / "projectiles",
        PUBLIC_DIR / "assets" / "effects",
    ]
    for directory in transparent_dirs:
        for path in directory.rglob("*.png"):
            with Image.open(path) as image:
                if image.mode != "RGBA" or image.getchannel("A").getextrema()[0] != 0:
                    failures.append(f"Transparent sprite has no transparent alpha: {path}")

    if failures:
        raise SystemExit("\n".join(failures))

    print(f"Validated {len(references)} loaded assets; no forbidden visual techniques found.")


if __name__ == "__main__":
    main()
