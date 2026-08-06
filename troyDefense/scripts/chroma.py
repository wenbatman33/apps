#!/usr/bin/env python3
"""洋紅去背 + 去殘邊 + 裁切置中（純 PIL，無額外依賴）

生圖時要求 codex 產出 #FF00FF 純色背景，這支把它轉成透明 PNG。
原圖一律先備份到 public/assets/_raw/，不做破壞性覆寫。

用法：
    python3 scripts/chroma.py            # 處理 T/E/H/B/U 全部 sprite
    python3 scripts/chroma.py T E        # 只處理指定分類
"""
import sys, os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "public/assets")
BACKUP = os.path.join(ASSETS, "_raw")

# 滿版背景圖不去背
SKIP = {"B_field_day", "B_field_night", "B_city_burn", "U_title",
        "B_field_sq", "B_field_night_sq", "B_city_sq"}


def dechroma(path):
    name = os.path.splitext(os.path.basename(path))[0]
    if name in SKIP:
        return "skip(滿版背景)"

    im = Image.open(path).convert("RGBA")
    data = bytearray(im.tobytes())
    n = len(data)

    # 先數洋紅比例，太少就當作不是 chroma 圖
    mag_count = 0
    for i in range(0, n, 4 * 37):          # 抽樣加速
        r, g, b = data[i], data[i + 1], data[i + 2]
        if r > 140 and b > 140 and g < 120 and abs(r - b) < 100:
            mag_count += 1
    if mag_count / (n / (4 * 37)) < 0.03:
        return "skip(無洋紅底)"

    # 全圖處理：去背 + despill
    for i in range(0, n, 4):
        r = data[i]; g = data[i + 1]; b = data[i + 2]
        if r > 140 and b > 140 and g < 120 and abs(r - b) < 100:
            data[i + 3] = 0
        elif r > 110 and b > 110 and g < r - 45 and g < b - 45:
            # 邊緣粉紫殘留 → 把 R/B 拉向 G
            data[i] = int(r * 0.45 + g * 0.55)
            data[i + 2] = int(b * 0.45 + g * 0.55)

    img = Image.frombytes("RGBA", im.size, bytes(data))

    # 裁掉透明邊界，等比放回正方形（主體更大更清楚）
    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        w, h = cropped.size
        side = max(w, h)
        pad = int(side * 0.04)
        canvas = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
        canvas.paste(cropped, ((side - w) // 2 + pad, (side - h) // 2 + pad))
        img = canvas.resize((1024, 1024), Image.LANCZOS)

    os.makedirs(BACKUP, exist_ok=True)
    bak = os.path.join(BACKUP, os.path.basename(path))
    if not os.path.exists(bak):
        Image.open(path).save(bak)

    img.save(path)
    return "ok"


def main():
    cats = [c for c in sys.argv[1:] if len(c) == 1 and c.isupper()] or ["T", "E", "H", "B", "U"]
    n_ok = n_skip = 0
    for cat in cats:
        for p in sorted(glob.glob(os.path.join(ASSETS, cat, "*.png"))):
            try:
                res = dechroma(p)
            except Exception as e:
                res = f"error: {e}"
            print(f"{os.path.basename(p):28s} {res}")
            n_ok += res == "ok"
            n_skip += res != "ok"
    print(f"\n去背 {n_ok} 張，略過 {n_skip} 張（原圖備份在 public/assets/_raw/）")


if __name__ == "__main__":
    main()
