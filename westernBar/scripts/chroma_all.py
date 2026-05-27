#!/usr/bin/env python3
"""對所有個別 PNG sprite 套用 chroma-key：把品紅 #FF00FF 變透明 + crop to content。
適用：sprites/sheriff/, sprites/bandit/, sprites/barman/, sprites/husband/, sprites/wife/,
      A/A11_swing_door.png, A/A26_round_table.png,
      F/F01-F03, G/*, H/*, I/*, J/*, L/*
跳過已是 RGBA 透明背景的圖（依檔頭判斷）。
"""
from PIL import Image
from pathlib import Path
import sys

PUBLIC = Path("public/assets")

# 要處理的檔案清單
TARGETS = []
# 角色 sprite 個別檔
for char_dir in ["sheriff", "bandit", "barman", "husband", "wife"]:
    for p in (PUBLIC / "sprites" / char_dir).glob("*.png"):
        TARGETS.append(p)
# 場景物件 A/A11 (swing_door)、A26 (round_table)
for n in ["A11_swing_door.png", "A26_round_table.png"]:
    p = PUBLIC / "A" / n
    if p.exists(): TARGETS.append(p)
# 掩體 F01-F03
for p in (PUBLIC / "F").glob("F0[1-3]_*.png"):
    TARGETS.append(p)
# 物品 G H I J L
for d in ["G", "H", "I", "J", "L"]:
    for p in (PUBLIC / d).glob("*.png"):
        TARGETS.append(p)

def is_magenta(r, g, b, threshold=80):
    return r > 200 and g < threshold and b > 200

def chroma_key(img):
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if is_magenta(r, g, b):
                pixels[x, y] = (r, g, b, 0)
            elif g < 100 and r > 180 and b > 180:
                purity = min(255, (r + b) // 2) - g
                if purity > 100:
                    pixels[x, y] = (r, g, b, max(0, 255 - purity * 2))
    return img

def crop_to_content(img, padding=8):
    bbox = img.getbbox()
    if bbox is None: return img
    l, t, r, b = bbox
    w, h = img.size
    return img.crop((max(0,l-padding), max(0,t-padding), min(w,r+padding), min(h,b+padding)))

def has_magenta(img):
    """快速檢查是否含品紅像素。"""
    rgb = img.convert("RGB")
    pixels = rgb.load()
    w, h = rgb.size
    # 取樣 100 個邊緣像素
    for i in range(0, w, max(1, w//10)):
        for y in (0, h-1):
            r, g, b = pixels[i, y]
            if is_magenta(r, g, b): return True
    for j in range(0, h, max(1, h//10)):
        for x in (0, w-1):
            r, g, b = pixels[x, j]
            if is_magenta(r, g, b): return True
    return False

count_done = 0
count_skip = 0
for p in TARGETS:
    try:
        img = Image.open(p)
        if not has_magenta(img):
            count_skip += 1
            continue
        img = chroma_key(img)
        img = crop_to_content(img)
        img.save(p, "PNG")
        print(f"✓ {p}  → {img.size}")
        count_done += 1
    except Exception as e:
        print(f"✗ {p}: {e}", file=sys.stderr)

print(f"\n處理 {count_done} 張, 跳過 {count_skip} 張（已透明）")
