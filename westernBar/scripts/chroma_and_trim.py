#!/usr/bin/env python3
"""把 lcd_color/ 所有 PNG 的品紅 #FF00FF 背景轉透明 + trim 透明邊緣"""
import os, glob
from PIL import Image

SRC_DIR = "/Users/batman_work/claude/apps/westernBar/public/assets/lcd_color"
files = sorted(glob.glob(os.path.join(SRC_DIR, "*.png")))
print(f"processing {len(files)} files...")

for f in files:
    name = os.path.basename(f)
    # 背景不處理（背景就是要保留完整圖）
    if name == "background.png":
        print(f"  skip background.png")
        continue
    img = Image.open(f).convert("RGBA")
    data = img.load()
    w, h = img.size
    # 把接近品紅（#FF00FF）的像素轉透明
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            # 容差判定：紅高、綠低、藍高 = 品紅
            if r > 220 and g < 60 and b > 220:
                data[x, y] = (255, 0, 255, 0)
    # trim 透明邊緣（找到 bbox）
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(f)
    print(f"  ✓ {name}  {img.size}")

print("done")
