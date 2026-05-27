#!/usr/bin/env python3
"""v6 sprite sheet 自動切割 — 跑完 batch_v6.sh 後執行"""
from PIL import Image
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public/assets"

def white_to_alpha(im, threshold=240):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > threshold and g > threshold and b > threshold:
                px[x, y] = (r, g, b, 0)
    return im

def slice_sheet(sheet_path, cols, rows, names, target=256, pad=6):
    if not sheet_path.exists():
        print(f"  ⚠ skip (missing): {sheet_path.name}")
        return 0
    img = Image.open(sheet_path).convert("RGBA")
    W, H = img.size
    cw, ch = W // cols, H // rows
    n = 0
    for (name, cx, cy) in names:
        if cx >= cols or cy >= rows:
            continue
        box = (cx*cw, cy*ch, (cx+1)*cw, (cy+1)*ch)
        cell = img.crop(box).crop((pad, pad, cw-pad, ch-pad))
        cell = white_to_alpha(cell)
        bbox = cell.getbbox()
        if bbox: cell = cell.crop(bbox)
        cell.thumbnail((target, target), Image.LANCZOS)
        canvas = Image.new("RGBA", (target, target), (0,0,0,0))
        x = (target - cell.width) // 2
        y = (target - cell.height) // 2
        canvas.paste(cell, (x, y), cell)
        out_path = sheet_path.parent / f"{name}.png"
        canvas.save(out_path)
        print(f"  ✓ {name}.png")
        n += 1
    return n

print("==== v6 slice start ====")

# 1) 通緝犯 (3x2)
print("\n--- bandit ---")
slice_sheet(ASSETS/"E/bandit_spritesheet.png", 3, 2, [
    ("E01_bandit_enter",   0, 0),
    ("E02_bandit_peek_hi", 1, 0),
    ("E03_bandit_peek_lo", 2, 0),
    ("E04_bandit_aim",     0, 1),
    ("E06_bandit_hit",     1, 1),
    ("E07_bandit_down",    2, 1),
])

# 2) 夫婦 (3x2)
print("\n--- couple ---")
slice_sheet(ASSETS/"D/couple_spritesheet.png", 3, 2, [
    ("D01_man_eat",   0, 0),
    ("D02_man_alert", 1, 0),
    ("D03_man_throw", 2, 0),
    ("D04_woman_eat",   0, 1),
    ("D05_woman_alert", 1, 1),
    ("D06_woman_throw", 2, 1),
])

# 3) 酒保 (3x1)
print("\n--- barman ---")
slice_sheet(ASSETS/"C/barman_spritesheet.png", 3, 1, [
    ("C01_barman_idle",       0, 0),
    ("C02_barman_throw",      1, 0),
    ("C03_barman_catch_bomb", 2, 0),
])

# 4) 物品 (4x2)
print("\n--- items ---")
slice_sheet(ASSETS/"G/items_spritesheet.png", 4, 2, [
    ("G01_cup_intact",    0, 0),
    ("G02_cup_broken",    1, 0),
    ("G03_bottle_intact", 2, 0),
    ("G04_bottle_broken", 3, 0),
    ("G05_plate_intact",  0, 1),
    ("G06_plate_broken",  1, 1),
    ("G07_bonus_bottle",  2, 1),
    ("H01_apple",         3, 1),
], target=200)

# 5) 桌子掩體 (3x1)
print("\n--- table ---")
slice_sheet(ASSETS/"F/table_spritesheet.png", 3, 1, [
    ("F01_table_intact",    0, 0),
    ("F02_table_damaged",   1, 0),
    ("F03_table_destroyed", 2, 0),
], target=300)

# 6) 炸彈 + 效果 (4x1)
print("\n--- dynamite & effects ---")
slice_sheet(ASSETS/"I/effects_spritesheet.png", 4, 1, [
    ("I01_dynamite_lit",       0, 0),
    ("I02_dynamite_ground",    1, 0),
    ("I03_explosion",          2, 0),
    ("J01_whiskey_bottle",     3, 0),
], target=220)

# 把 J01 移到正確分類
src = ASSETS/"I/J01_whiskey_bottle.png"
dst = ASSETS/"J/J01_whiskey_bottle.png"
if src.exists():
    dst.parent.mkdir(exist_ok=True)
    src.rename(dst)
    print(f"  → moved J01 to J/")

print("\n==== v6 slice DONE ====")
print(f"Total PNGs:")
os.system(f"find {ASSETS} -name '*.png' | wc -l")
