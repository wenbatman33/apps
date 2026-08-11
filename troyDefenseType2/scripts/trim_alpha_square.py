#!/usr/bin/env python3
"""Crop transparent game sprites to a padded square without resampling pixels."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def trim_square(path: Path, padding_ratio: float = 0.08) -> None:
    image = Image.open(path).convert("RGBA")
    if max(image.width, image.height) / min(image.width, image.height) > 1.15:
        print(f"{path}: skipped non-square source {image.width}x{image.height}")
        return
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"No visible pixels in {path}")

    left, top, right, bottom = bbox
    content_width = right - left
    content_height = bottom - top
    side = int(max(content_width, content_height) * (1 + padding_ratio * 2))
    side = min(side, image.width, image.height)
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    crop_left = round(center_x - side / 2)
    crop_top = round(center_y - side / 2)
    crop_left = max(0, min(crop_left, image.width - side))
    crop_top = max(0, min(crop_top, image.height - side))
    cropped = image.crop((crop_left, crop_top, crop_left + side, crop_top + side))
    cropped.save(path, optimize=True)
    print(f"{path}: {image.width}x{image.height} -> {cropped.width}x{cropped.height}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: trim_alpha_square.py sprite.png [sprite.png ...]")
    for input_path in sys.argv[1:]:
        trim_square(Path(input_path))
