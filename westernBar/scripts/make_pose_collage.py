#!/usr/bin/env python3
"""把 LCD 單張動作圖拼成 2x2 collage 當 codex image_gen 的 ref。
每格 512x512，整張 1024x1024。底色白，便於 AI 識別 pose 剪影。
"""
from PIL import Image
from pathlib import Path
import sys

REFDIR = Path("動作解析圖檔們")
OUTDIR = Path("scripts/pose_refs")
OUTDIR.mkdir(exist_ok=True, parents=True)

GROUPS = {
    "player_A": ["主角動作1.png", "主角動作2.png", "主角動作3.png", "主角動作4.png"],
    "player_B": ["主角動作5 往地上澆熄炸彈.png", "主角動作6 進入掩蔽物.png",
                  "主角動作7開槍.png", "主角動作8 中槍:被砸到東西.png"],
}

CELL = 512
PAD = 20

for name, files in GROUPS.items():
    canvas = Image.new("RGB", (CELL*2, CELL*2), (255, 255, 255))
    for i, f in enumerate(files):
        p = REFDIR / f
        if not p.exists():
            print(f"MISSING: {p}", file=sys.stderr); continue
        img = Image.open(p).convert("RGBA")
        # 等比縮放塞進 (CELL - 2*PAD)
        target = CELL - 2*PAD
        img.thumbnail((target, target), Image.LANCZOS)
        col, row = i % 2, i // 2
        x = col*CELL + (CELL - img.width)//2
        y = row*CELL + (CELL - img.height)//2
        # 白底
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
        canvas.paste(bg, (x, y))
    out = OUTDIR / f"{name}_pose_ref.png"
    canvas.save(out)
    print(f"✓ {out} ({canvas.size})")
