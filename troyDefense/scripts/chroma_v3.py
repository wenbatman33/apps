#!/usr/bin/env python3
"""v3 洋紅去背：去背＋裁到內容邊界（保留原始長寬比，不補成正方形）＋長邊縮到 512
原圖備份到 public/assets/G/_raw/，不做破壞性覆寫。
用法：python3 scripts/chroma_v3.py
"""
import os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GDIR = os.path.join(ROOT, "public/assets/G")
BACKUP = os.path.join(GDIR, "_raw")


def dechroma(path):
    im = Image.open(path).convert("RGBA")
    data = bytearray(im.tobytes())
    n = len(data)

    mag = 0
    for i in range(0, n, 4 * 37):
        r, g, b = data[i], data[i + 1], data[i + 2]
        if r > 140 and b > 140 and g < 120 and abs(r - b) < 100:
            mag += 1
    if mag / (n / (4 * 37)) < 0.03:
        return "skip(無洋紅底)"

    for i in range(0, n, 4):
        r = data[i]; g = data[i + 1]; b = data[i + 2]
        if r > 140 and b > 140 and g < 120 and abs(r - b) < 100:
            data[i + 3] = 0
        elif r > 110 and b > 110 and g < r - 45 and g < b - 45:
            data[i] = int(r * 0.45 + g * 0.55)
            data[i + 2] = int(b * 0.45 + g * 0.55)

    img = Image.frombytes("RGBA", im.size, bytes(data))
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    # 長邊縮到 512（保留比例）
    w, h = img.size
    if max(w, h) > 512:
        k = 512 / max(w, h)
        img = img.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)

    os.makedirs(BACKUP, exist_ok=True)
    bak = os.path.join(BACKUP, os.path.basename(path))
    if not os.path.exists(bak):
        Image.open(path).save(bak)
    img.save(path)
    return f"ok {img.size[0]}x{img.size[1]}"


for p in sorted(glob.glob(os.path.join(GDIR, "G_*.png"))):
    try:
        res = dechroma(p)
    except Exception as e:
        res = f"error: {e}"
    print(f"{os.path.basename(p):22s} {res}")
