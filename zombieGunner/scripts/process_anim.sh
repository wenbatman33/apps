#!/bin/bash
# 切格去背 + 打包 atlas： bash scripts/process_anim.sh <name>
set -e
ROOT=/Users/batman_work/claude/apps/zombieGunner
N="$1"
ROT="${2:-0}"   # 第二參數：逆時針旋轉角度（AI 畫成朝下時用 90）
D="$ROOT/assets/anim/$N"
[ -f "$D/raw.png" ] || { echo "❌ $N 缺 raw.png"; exit 1; }
rm -rf "$D/frames"
python3 "$ROOT/scripts/split_sprites.py" "$D/raw.png" --expect 6 --cell 256 \
  --cut-lo 95 --cut-hi 175 --rotate "$ROT" --out "$D/frames" 2>/dev/null | grep -o '"frames": [0-9]*'
python3 ~/.claude/skills/sprite-sheet-animator/scripts/pack.py "$D/frames" --out "$D/$N" 2>/dev/null | grep -o '"frames": [0-9]*'
echo "✅ $N → $D/$N.png + $N.json"
