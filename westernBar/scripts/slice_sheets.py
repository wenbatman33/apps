#!/usr/bin/env python3
"""把 sprite sheet 切成個別 sprite + chroma-key 去背 (magenta #FF00FF → alpha)
然後輸出到 public/assets/sprites/<char>/<pose>.png
最後印出 BootScene.ts asset key 對照表。"""
from PIL import Image
from pathlib import Path
import sys

SHEETS_DIR = Path("public/assets/sheets")
OUT_DIR = Path("public/assets/sprites")
OUT_DIR.mkdir(exist_ok=True, parents=True)

# 每張 sheet 的 pose 對應（左上 / 右上 / 左下 / 右下）
SHEETS = {
    "sheriff_A": ["idle", "walk", "aim", "pour"],
    "sheriff_B": ["fire", "hide", "hit", "down"],
    "bandit_A":  ["at_door", "enter", "hide", "peek"],
    "bandit_B":  ["fire", "hit", "down", "idle"],
    "barman":    ["idle", "slide", "catch", "cheer"],
    "husband":   ["eat1", "eat2", "alert", "hide"],
    "wife":      ["eat1", "eat2", "alert", "hide"],
}

# 品紅 chroma-key 閾值
def is_magenta(r, g, b, threshold=80):
    # 偵測高紅 + 低綠 + 高藍 ≈ #FF00FF 周邊
    return r > 200 and g < threshold and b > 200

def chroma_key(img):
    """把純品紅與其相近色變透明。"""
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if is_magenta(r, g, b):
                pixels[x, y] = (r, g, b, 0)
            elif g < 100 and r > 180 and b > 180:
                # 邊緣半透明：依品紅程度做漸層 alpha
                purity = min(255, (r + b) // 2) - g
                if purity > 100:
                    new_alpha = max(0, 255 - purity * 2)
                    pixels[x, y] = (r, g, b, new_alpha)
    return img

def crop_to_content(img, padding=10):
    """裁到非透明內容邊界 + padding。"""
    bbox = img.getbbox()
    if bbox is None:
        return img
    l, t, r, b = bbox
    w, h = img.size
    l = max(0, l - padding)
    t = max(0, t - padding)
    r = min(w, r + padding)
    b = min(h, b + padding)
    return img.crop((l, t, r, b))

slice_log = []
for sheet_name, poses in SHEETS.items():
    sheet_path = SHEETS_DIR / f"{sheet_name}_sheet.png"
    if not sheet_path.exists():
        print(f"⚠ {sheet_path} missing, skip", file=sys.stderr)
        continue

    sheet = Image.open(sheet_path)
    W, H = sheet.size
    cell_w, cell_h = W // 2, H // 2

    # 推導角色資料夾（sheriff_A/B → sheriff，bandit_A/B → bandit，其他用原名）
    char_dir = sheet_name.split("_")[0] if sheet_name.split("_")[0] in ("sheriff", "bandit") else sheet_name
    char_outdir = OUT_DIR / char_dir
    char_outdir.mkdir(exist_ok=True)

    for i, pose in enumerate(poses):
        col, row = i % 2, i // 2
        cell = sheet.crop((col*cell_w, row*cell_h, (col+1)*cell_w, (row+1)*cell_h))
        cell = chroma_key(cell)
        cell = crop_to_content(cell, padding=10)
        out_path = char_outdir / f"{pose}.png"
        cell.save(out_path, "PNG")
        slice_log.append((char_dir, pose, str(out_path), cell.size))
        print(f"✓ {char_dir}/{pose}.png  {cell.size}")

print("\n==== 切片完成 ====\n")
print("可以放進 BootScene.ts 的 ASSET keys：\n")
for char, pose, path, size in slice_log:
    key = f"sp_{char}_{pose}" if char != "sheriff" else f"sp_player_{pose}"
    rel = path.replace("public/assets/", "")
    print(f'  {{ key: "{key:25s}", file: "{rel}", w: {size[0]}, h: {size[1]} }},')
