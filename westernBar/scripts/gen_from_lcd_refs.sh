#!/bin/bash
# 從 LCD 原作位置解析圖逐張生成 Pixar 3D sprite
# 每張 reference → 一張 sprite，保留原作的 pose、位置、動作
set -u
cd "$(dirname "$0")/.."

LOG="scripts/gen_from_lcd_refs.log"
REFDIR="動作解析圖檔們"
OUTBASE="public/assets"
mkdir -p $OUTBASE/{B,C,D,E,G,I}

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "==== gen_from_lcd_refs start ===="

# helper: 餵 reference 圖 + prompt 給 codex
gen_sprite() {
  local out="$1" ref="$2" desc="$3" tries=0
  if [ -f "$out" ]; then
    log "⏭  $(basename $out) (skip exists)"
    return 0
  fi
  while [ $tries -lt 2 ]; do
    log "▶ gen $(basename $out) ← $(basename $ref) (try $((tries+1)))"
    local prompt="附加圖是 Casio Western Bar 1984 LCD 原作的場景參考圖，圖中某個位置有一個角色擺出特定動作。

任務：請用 image_gen 工具生成**只有該角色 sprite** 的彩色 Pixar 3D Q版 chibi 卡通版本，**精確保留**原作 reference 圖中該角色的：
- 姿勢 (pose)
- 手腳擺位
- 持物（手槍 / 酒瓶 / 蘋果 等）
- 表情狀態
- 朝向 (facing direction)

角色描述: $desc

風格：Pixar / Disney / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染、軟陰影、subsurface scattering、明亮飽和色彩、圓潤無稜角、Q 版大頭比例（頭佔身體 1/2）。

**只輸出該角色 sprite**：
- 透明背景 PNG（用 chroma-key 產生再去背）
- 單一主體置中
- 不要包含背景、桌椅、地板、牆面、其他角色
- 不要文字、編號、標籤
- 1024x1024 大小

完成後複製到絕對路徑 /Users/batman_work/claude/apps/westernBar/$out 並 sips 縮放到 1024x1024。"
    echo "$prompt" | codex exec --skip-git-repo-check --image "$ref" >/dev/null 2>&1
    if [ -f "$out" ] && [ -s "$out" ]; then
      log "✓ $(basename $out)"
      return 0
    fi
    tries=$((tries+1))
  done
  log "✗ $(basename $out) FAILED"
  return 1
}

# ====== 主角 8 動作 ======
log "==== 主角 (8 actions) ===="
gen_sprite "$OUTBASE/B/B01_player_idle.png"      "$REFDIR/主角動作1.png"                    "醉酒老警長：大八字鬍、米色 cowboy hat、紅格紋衫 + 棕色背心 + 警長星徽、藍牛仔褲、棕靴、槍套"
gen_sprite "$OUTBASE/B/B02_player_walk1.png"     "$REFDIR/主角動作2.png"                    "同上警長角色，但姿勢依參考圖"
gen_sprite "$OUTBASE/B/B03_player_walk2.png"     "$REFDIR/主角動作3.png"                    "同上警長角色，但姿勢依參考圖"
gen_sprite "$OUTBASE/B/B04_player_walk3.png"     "$REFDIR/主角動作4.png"                    "同上警長角色，但姿勢依參考圖"
gen_sprite "$OUTBASE/B/B05_player_pour_whiskey.png" "$REFDIR/主角動作5 往地上澆熄炸彈.png"   "同上警長角色，手持威士忌酒瓶向下傾倒、琥珀色液體灑出來"
gen_sprite "$OUTBASE/B/B06_player_hide_table.png"   "$REFDIR/主角動作6 進入掩蔽物.png"       "同上警長角色，蹲低躲在倒立桌子後面，只露頭 + 手槍"
gen_sprite "$OUTBASE/B/B07_player_fire.png"         "$REFDIR/主角動作7開槍.png"              "同上警長角色，手槍朝上開火、muzzle flash"
gen_sprite "$OUTBASE/B/B08_player_hit.png"          "$REFDIR/主角動作8 中槍:被砸到東西.png" "同上警長角色，中彈反應：蓬髮、淚珠飛、嘴大張、雙手揮舞、滑稽痛感"

# ====== 通緝犯 6 動作 ======
log "==== 通緝犯 (6 actions) ===="
gen_sprite "$OUTBASE/E/E01_bandit_at_door.png"   "$REFDIR/通緝犯動作1 站在門口.png"  "西部通緝犯：黑色寬邊帽、紅色 bandana 蓋下半臉、髒兮兮灰襯衫 + 棕色皮背心、子彈帶、深色褲、棕靴、Q 版兇狠"
gen_sprite "$OUTBASE/E/E02_bandit_enter.png"     "$REFDIR/通緝犯動作2 進場.png"      "同上通緝犯角色，依參考圖姿勢"
gen_sprite "$OUTBASE/E/E03_bandit_hide.png"      "$REFDIR/通緝犯動作3 躲避動作.png"  "同上通緝犯角色，蹲低躲藏"
gen_sprite "$OUTBASE/E/E04_bandit_peek.png"      "$REFDIR/通緝犯動作4 刺探動作.png"  "同上通緝犯角色，探頭刺探"
gen_sprite "$OUTBASE/E/E05_bandit_fire.png"      "$REFDIR/通緝犯動作5 開槍.png"      "同上通緝犯角色，手槍開火、muzzle flash"
gen_sprite "$OUTBASE/E/E06_bandit_hit.png"       "$REFDIR/通緝犯動作6 被擊中.png"    "同上通緝犯角色，中彈飛開、四肢揮舞"

# ====== 桌上男人 4 動作 ======
log "==== 桌上男人 (4 actions) ===="
gen_sprite "$OUTBASE/D/D01_man_eat1.png"   "$REFDIR/桌上男人動作1.png"           "酒吧客人男 (husband)：中年大鬍子、藍格紋衫 + 吊帶褲、坐在桌邊吃飯"
gen_sprite "$OUTBASE/D/D02_man_eat2.png"   "$REFDIR/桌上男人動作2.png"           "同上夫婦男，依參考圖姿勢"
gen_sprite "$OUTBASE/D/D03_man_alert.png"  "$REFDIR/桌上男人動作3 生氣站立.png"   "同上夫婦男，站起身、生氣、頭上有 !! 標記"
gen_sprite "$OUTBASE/D/D04_man_hide.png"   "$REFDIR/桌上男人動作4 躲避.png"       "同上夫婦男，躲到桌子下面"

# ====== 桌上女人 4 動作 ======
log "==== 桌上女人 (4 actions) ===="
gen_sprite "$OUTBASE/D/D05_woman_eat1.png"  "$REFDIR/桌上女人動作1.png"           "酒吧客人女 (wife)：包頭髮型、洋裝、坐在桌邊吃飯"
gen_sprite "$OUTBASE/D/D06_woman_eat2.png"  "$REFDIR/桌上女人動作2.png"           "同上夫婦女，依參考圖姿勢"
gen_sprite "$OUTBASE/D/D07_woman_alert.png" "$REFDIR/桌上女人動作3 生氣站立.png"   "同上夫婦女，站起身、生氣、頭上有 !! 標記"
gen_sprite "$OUTBASE/D/D08_woman_hide.png"  "$REFDIR/桌上女人動作4 躲避.png"       "同上夫婦女，躲到桌子下面"

log "==== ALL DONE ===="
find public/assets -name "*.png" | wc -l | xargs echo "Total PNGs:"
