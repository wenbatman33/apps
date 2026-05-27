#!/usr/bin/env python3
"""從 全部物件.png 裁出主角動作那一排，並做成 2x2 collage 當 codex ref。
872x471 → 主角排在下半部，依比例估算後切左右兩半各 4 個 pose。"""
from PIL import Image
from pathlib import Path

SRC = Path("動作解析圖檔們/全部物件.png")
OUTDIR = Path("scripts/pose_refs")
OUTDIR.mkdir(exist_ok=True, parents=True)

img = Image.open(SRC).convert("RGB")
W, H = img.size  # 872, 471
print(f"src: {W}x{H}")

# 主角排在底部約 y=320..460 區間（依圖目視）
# 為安全保留邊框，從 y=305 切到 y=465（高 160）
TOP = 305
BOT = 465
LEFT_PAD = 40   # 排除左邊 LEVEL/SCORE 區
RIGHT_PAD = 30  # 排除右邊框

row = img.crop((LEFT_PAD, TOP, W-RIGHT_PAD, BOT))
row.save(OUTDIR / "player_row_raw.png")
print(f"row: {row.size}")

# row 寬度 802，假設 8 個 pose 平均分布
# 每格寬 ~100，但實際留白不均，這裡簡化：均分 8 等分
RW, RH = row.size
PER = RW // 8
poses = []
for i in range(8):
    cell = row.crop((i*PER, 0, (i+1)*PER, RH))
    # 等比放大到 460x460 留邊
    target = 460
    cell.thumbnail((target, target), Image.LANCZOS)
    poses.append(cell)

# 拼成兩張 1024x1024 (2x2 each)
CELL = 512
for sheet_name, idx_list in [("player_A", [0,1,2,3]), ("player_B", [4,5,6,7])]:
    canvas = Image.new("RGB", (CELL*2, CELL*2), (255, 255, 255))
    for i, src_idx in enumerate(idx_list):
        p = poses[src_idx]
        col, row_i = i % 2, i // 2
        x = col*CELL + (CELL - p.width)//2
        y = row_i*CELL + (CELL - p.height)//2
        canvas.paste(p, (x, y))
    out = OUTDIR / f"{sheet_name}_pose_ref.png"
    canvas.save(out)
    print(f"✓ {out}")
