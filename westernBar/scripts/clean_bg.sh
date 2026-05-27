#!/bin/bash
# 後製去除背景圖裡的所有人物
set -u
cd "$(dirname "$0")/.."

LOG="scripts/clean_bg.log"
ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "==== clean background characters start ===="

PROMPT='附加參考圖是一個西部酒吧場景。請用 image_gen 工具產出**同一個場景但完全沒有任何人物角色**的純空景版本。

要求：
- 保留：所有牆面、招牌（WANTED、SALOON）、酒瓶架、桌椅、木桶、地板透視、彈簧門、燈光、視角、構圖、色調風格
- 移除：所有人物角色（警長、夫婦、酒保、任何 humanoid figure）
- 桌椅保持原位但桌上的食物盤子也清掉
- 場景看起來像「酒吧開門前沒人的清晨景象」— 完全空房間

風格與參考圖完全一致：Pixar 3D Q版卡通可愛風。'

for id in A01_bg_L1_day A03_bg_L3_dusk A04_bg_L4_night A05_bg_L5_rain A06_bg_L6_dust A07_bg_L7_minetown A08_bg_L8_abandoned A09_bg_L9_storm A10_bg_L10_final; do
  out="public/assets/A/${id}.png"
  if [ ! -f "$out" ]; then
    log "⚠ skip $id (not exist)"
    continue
  fi
  log "▶ cleaning $id"
  full_prompt="${PROMPT}

產出 1536x1024 PNG，複製到 /Users/batman_work/claude/apps/westernBar/${out} 並 sips 縮放到 1536x1024。"
  echo "$full_prompt" | codex exec --skip-git-repo-check --image "$out" >/dev/null 2>&1
  log "✓ done $id"
done

log "==== ALL DONE ===="
