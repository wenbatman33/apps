#!/bin/bash
# 生成原創 LCD 風黑色剪影 sprite — 給 LcdScene 用
# 風格：2D 平面、黑色填色、無線條、單純幾何感、模糊 LCD 風格的西部主題
set -u
cd "$(dirname "$0")/.."

OUT_DIR="public/assets/lcd"
LOG="scripts/gen_lcd_sprites.log"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

STYLE_RULE="STYLE: 2D flat solid black silhouette only, no outline, no shading, no detail lines, white background pure #FFFFFF, single recognizable shape with chunky proportions. Like a vintage handheld game LCD silhouette (not LCD-screen tech, just the aesthetic). Output 256x256 PNG, subject centered, fills about 80 percent of frame."

gen_sprite() {
  local key="$1"
  local desc="$2"
  local out="$OUT_DIR/${key}.png"
  [ -f "$out" ] && { log "skip (exists): $key"; return; }
  log "▶ $key  | $desc"

  local prompt="Generate a 256x256 PNG using image_gen. ${STYLE_RULE}

SUBJECT: ${desc}

The image must be: a single black solid silhouette of the subject, on a pure white background. No grey shading, no outline strokes. Recognizable from the shape alone. Save to /Users/batman_work/claude/apps/westernBar/$out and confirm 256x256 with sips."

  echo "$prompt" | codex exec --skip-git-repo-check >>"$LOG" 2>&1

  if [ -f "$out" ]; then
    log "  ✓ done"
  else
    log "  ✗ failed"
  fi
}

log "===== generating original LCD-style silhouettes ====="

# === 警長：年輕、瘦、戴牛仔帽、舉左輪手槍指向上方 ===
gen_sprite "sheriff_walk_1" "young thin cowboy with wide brim hat, standing pose with one leg slightly forward, holding revolver pointed straight up overhead, drawn as chunky black silhouette"
gen_sprite "sheriff_walk_2" "young thin cowboy with wide brim hat, walking pose with legs crossed mid-stride, holding revolver pointed straight up overhead, chunky black silhouette"
gen_sprite "sheriff_walk_3" "young thin cowboy with wide brim hat, side step pose with legs slightly apart, holding revolver pointed straight up overhead, chunky black silhouette"
gen_sprite "sheriff_walk_4" "young thin cowboy with wide brim hat, action pose with both legs spread wide, holding revolver pointed straight up overhead, chunky black silhouette"
gen_sprite "sheriff_pour"   "young cowboy tipping a whiskey bottle to pour onto the ground at his feet, side view, chunky black silhouette"
gen_sprite "sheriff_hide"   "young cowboy crouching behind low cover, only head and hat visible peeking over, chunky black silhouette"
gen_sprite "sheriff_fire"   "young cowboy standing sideways aiming a revolver toward the left, both arms extended, chunky black silhouette"
gen_sprite "sheriff_down"   "young cowboy lying on the ground knocked out, arms and legs splayed, hat fallen nearby, chunky black silhouette"

# === 通緝犯：戴遮臉巾、黑帽、惡棍體型 ===
gen_sprite "bandit_at_door" "outlaw cowboy with black hat and bandana mask, peeking head out from behind a swing door, only upper body and one shoulder visible, chunky black silhouette"
gen_sprite "bandit_enter"   "outlaw cowboy with black hat and bandana mask, mid stride walking forward, chunky black silhouette"
gen_sprite "bandit_hide"    "outlaw cowboy crouching down low fully hidden behind cover, only top of hat visible, chunky black silhouette"
gen_sprite "bandit_peek"    "outlaw cowboy half-rising from cover, head and one arm visible, looking right, chunky black silhouette"
gen_sprite "bandit_fire"    "outlaw cowboy standing sideways aiming revolver toward the right, gun smoke puff at muzzle, chunky black silhouette"
gen_sprite "bandit_hit"     "outlaw cowboy reeling backward arms flung out, hat flying off, chunky black silhouette"

# === 物品 ===
gen_sprite "cup_intact"  "single beer mug with handle, side view, chunky black silhouette"
gen_sprite "cup_broken"  "shattered beer mug pieces flying outward in a small burst, chunky black silhouette"
gen_sprite "bottle_intact" "tall whiskey bottle with long neck, side view, chunky black silhouette"
gen_sprite "bottle_broken" "shattered whiskey bottle with glass shards and liquid spray, chunky black silhouette"
gen_sprite "plate_intact" "round dinner plate seen from a slight angle showing flat oval, chunky black silhouette"
gen_sprite "plate_broken" "shattered plate fragments flying outward, chunky black silhouette"

# === 投擲物 / 爆炸 ===
gen_sprite "dynamite"  "stick of dynamite with lit fuse and small flame at top, chunky black silhouette"
gen_sprite "explosion" "starburst explosion with jagged radiating spikes, chunky black silhouette"
gen_sprite "apple"     "simple round apple with small stem on top, chunky black silhouette"
gen_sprite "ashtray"   "small round ashtray with one cigarette resting on the rim, chunky black silhouette"

# === 夫妻 ===
gen_sprite "husband_eat"   "seated man with rounded head, eating at a table, plain shirt, chunky black silhouette"
gen_sprite "husband_alert" "seated man jolting up alarmed with arms raised, chunky black silhouette"
gen_sprite "husband_throw" "seated man arm cocked back ready to throw something, chunky black silhouette"
gen_sprite "wife_eat"      "seated woman with long hair tied in a bun, eating at a table, chunky black silhouette"
gen_sprite "wife_alert"    "seated woman jolting up alarmed with arms raised, long hair bun, chunky black silhouette"
gen_sprite "wife_throw"    "seated woman arm cocked back ready to throw something, long hair bun, chunky black silhouette"

# === 場景 ===
gen_sprite "door_open"     "double saloon swing door fully open showing gap between two panels, chunky black silhouette"
gen_sprite "door_closed"   "double saloon swing door closed straight panels, chunky black silhouette"
gen_sprite "cover_intact"    "small overturned table or barrel used as cover, intact, chunky black silhouette"
gen_sprite "cover_damaged"   "same overturned cover but with chunks missing and cracks, chunky black silhouette"
gen_sprite "cover_destroyed" "same overturned cover but almost completely smashed only a low stump remaining, chunky black silhouette"

# === 酒保 ===
gen_sprite "barman_idle"  "bartender behind counter, upper body only visible with apron and mustache, chunky black silhouette"
gen_sprite "barman_slide" "bartender mid-throw sliding a mug along the bar with one arm extended, chunky black silhouette"

log "===== done ====="
log "next: 把這些圖檔登錄到 BootScene 與 LcdScene 的 texKeyForSlot"
