#!/usr/bin/env python3
"""更嚴格的 chroma-key — 處理夫婦 sprite 殘留品紅。
使用 HSV：色相在品紅範圍且飽和度高的 pixel 一律透明。"""
from PIL import Image
from pathlib import Path
import colorsys

TARGETS = []
for d in ["husband", "wife"]:
    for p in (Path("public/assets/sprites") / d).glob("*.png"):
        TARGETS.append(p)

def is_magentaish(r, g, b, a):
    if a < 10: return False
    # 純品紅 #FF00FF: r>200, g<60, b>200
    if r > 200 and g < 60 and b > 200: return True
    # HSV 檢查：飽和度 > 0.5 且色相 ∈ [280°, 330°]（品紅範圍）
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    hue_deg = h * 360
    if s > 0.45 and v > 0.55 and (280 <= hue_deg <= 340):
        return True
    return False

def edge_magenta_strength(r, g, b):
    """0..1 表示「有多像品紅」（用來算 alpha）"""
    # 越紫越像 magenta：(r+b)/2 - g
    purity = (r + b) / 2 - g
    return max(0, min(1, (purity - 60) / 120))

for p in TARGETS:
    img = Image.open(p).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    cleaned = 0
    feathered = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if is_magentaish(r, g, b, a):
                pixels[x, y] = (r, g, b, 0)
                cleaned += 1
            elif a > 200 and g < 130 and r > 150 and b > 150:
                # 邊緣半透明：依品紅程度淡化
                strength = edge_magenta_strength(r, g, b)
                if strength > 0.15:
                    new_a = int(a * (1 - strength))
                    pixels[x, y] = (r, g, b, new_a)
                    feathered += 1
    # crop to content
    bbox = img.getbbox()
    if bbox:
        l, t, r, b = bbox
        pad = 6
        img = img.crop((max(0,l-pad), max(0,t-pad), min(w,r+pad), min(h,b+pad)))
    img.save(p, "PNG")
    print(f"✓ {p}  cleared={cleaned}  feathered={feathered}  → {img.size}")

print("Done")
