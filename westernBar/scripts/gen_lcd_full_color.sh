#!/bin/bash
# 完整彩色插畫風 — chibi 3D 卡通可愛風（Toy Story / Pixar 質感）
# 統一風格：1:2 頭身比、大眼、可愛動作、品紅背景方便去背
set -u
cd "$(dirname "$0")/.."

OUT_DIR="public/assets/lcd_color"
LOG="scripts/gen_lcd_full_color.log"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

SHERIFF_CHAR="A young chibi cowboy sheriff (toy-figure proportions, big head, small body 1:2 ratio). Brown wide-brim cowboy hat with a small gold five-pointed star pinned on the front of the hat brim. Tousled medium-brown hair peeking under the hat. Big round expressive eyes with shiny pupils, small button nose, cheerful determined face. Cream long-sleeve shirt with cuffs rolled up. Red bandana triangle tied around the neck. Dark brown leather vest with a large gold five-pointed sheriff star on the left chest. Brown wide belt with gold buckle and brown holster on right hip. Blue denim jeans with grey cuffed hems. Brown high-top leather boots with small gold star-shaped spurs on the heels."

BANDIT_CHAR="A chibi outlaw bandit (same toy-figure proportions, 1:2). Black wide-brim cowboy hat. Bright red bandana mask covering nose and mouth. Dark messy hair peeking out. Stern frowning eyes. Loose dirty grey-brown shirt with rolled sleeves. Two crossing brown leather ammo belts on chest with brass bullet shells. Brown leather vest. Dark brown trousers. Brown boots with metal toe caps. Brown holster on right hip."

HUSBAND_CHAR="A chibi middle-aged husband seated at a saloon table (1:2 proportions). Bald round head with two black curly tufts of hair on the sides above the ears, big bushy brown moustache, droopy eyebrows. White collared shirt, dark suspenders, brown trousers visible."

WIFE_CHAR="A chibi middle-aged wife seated at a saloon table (1:2 proportions). Round face with high updo bun of red hair, round cheeks, big lashes. Long pink saloon dress with frills and tight bodice, gloved hands."

STYLE="Pixar 3D chibi cartoon render, soft global illumination, subsurface scattering, warm saturated colors, rounded forms, smooth surfaces like toys, no outlines, no flat color, no anime style, no realism. 512x512 PNG. Subject centered, fills about 80 percent of frame. Background pure magenta #FF00FF for chroma-key removal. No floor, no shadow circle, no text, no extra characters."

gen() {
  local key="$1"
  local prompt="$2"
  local out="$OUT_DIR/${key}.png"
  if [ -f "$out" ]; then
    log "skip (exists): $key"
    return
  fi
  log "▶ $key"
  local full="Generate a 512x512 PNG with image_gen. ${STYLE}

${prompt}

Save the result to /Users/batman_work/claude/apps/westernBar/$out and confirm 512x512 with sips."
  echo "$full" | codex exec --skip-git-repo-check >>"$LOG" 2>&1
  if [ -f "$out" ]; then
    log "  ✓ done"
  else
    log "  ✗ failed"
  fi
}

log "===== generating full-color chibi sprites ====="

# === 警長 10 pose（開場 + 4 zone 走路 + pour + duel_in + hide + fire + down）===
gen "sheriff_action0" "${SHERIFF_CHAR} Pose: opening parade walking pose, side view, leaning slightly forward mid-stride, one leg forward one back, revolver holstered on hip (no gun in hand), arms swinging naturally, head facing forward."

gen "sheriff_duel_in" "${SHERIFF_CHAR} Pose: sneaking sideways toward cover, body crouched slightly, revolver in right hand pointing down at hip level, head turned alertly toward screen left, knees bent, looks ready for duel."

# === walk_1-4：頭必須仰起看槍口/天花板（射擊上方吧台物件）===
HEAD_UP_RULE="VERY IMPORTANT: The sheriff's head must be tilted up looking straight at the gun barrel above him (head tilted back about 60 degrees so chin points up and eyes look at the sky / ceiling), since he is aiming at items on the bar overhead. Not looking forward, not looking at camera. Looking UP at his own gun barrel."

gen "sheriff_walk_1" "${SHERIFF_CHAR} Pose: standing in zone 1, body facing front, right arm raised holding silver revolver pointed straight up overhead, left arm relaxed. ${HEAD_UP_RULE} Feet shoulder-width apart, knees slightly bent."
gen "sheriff_walk_2" "${SHERIFF_CHAR} Pose: walking, right leg crossing in front of left leg in X shape, body slightly tilted, right arm raised holding revolver pointed straight up, left arm swinging. ${HEAD_UP_RULE}"
gen "sheriff_walk_3" "${SHERIFF_CHAR} Pose: sidestep stance, both legs spread wide in V shape with knees turned outward, right arm raised with revolver pointed straight up. ${HEAD_UP_RULE}"
gen "sheriff_walk_4" "${SHERIFF_CHAR} Pose: action stance, legs split very wide like karate stance, right arm raised with revolver pointed straight up overhead, chest puffed out. ${HEAD_UP_RULE}"

gen "sheriff_pour"   "${SHERIFF_CHAR} Pose: tilting brown whiskey bottle high above head, pouring amber liquid stream toward the ground beneath him, head tilted back looking up at the bottle high overhead, satisfied gleeful expression."
gen "sheriff_hide"   "${SHERIFF_CHAR} Pose: crouching down behind low cover, only head with hat and one arm holding the revolver visible above an imaginary edge, alert wide eyes."
gen "sheriff_fire"   "${SHERIFF_CHAR} Pose: sideways shooting stance facing screen left, both hands gripping the revolver extended horizontally, muzzle flash sparks at the gun barrel, gritted teeth determined."
gen "sheriff_down"   "${SHERIFF_CHAR} Pose: lying flat on his back on the ground, arms and legs splayed out, hat fallen beside him, X-shaped closed eyes, tongue sticking out, small yellow stars circling above the head indicating knocked out."

# === 通緝犯 6 pose ===
gen "bandit_at_door"   "${BANDIT_CHAR} Pose: peeking through the gap of double saloon swing doors, only upper body and one shoulder visible behind the door panels, peering forward with menacing eyes, one hand on the door panel."
gen "bandit_enter"     "${BANDIT_CHAR} Pose: striding forward into the saloon, one foot forward one back, body facing screen right, arms swinging naturally, determined to enter expression."
gen "bandit_hide"      "${BANDIT_CHAR} Pose: fully crouched down behind cover, body compacted small, only the very top of the black hat visible, arms hugging knees."
gen "bandit_peek"      "${BANDIT_CHAR} Pose: half-rising from behind cover, head and shoulders visible over the cover edge, eyes scanning, one hand on cover."
gen "bandit_fire"      "${BANDIT_CHAR} Pose: sideways shooting stance facing screen right, both hands gripping a silver revolver extended horizontally, muzzle flash with smoke at the barrel, snarling expression."
gen "bandit_hit"       "${BANDIT_CHAR} Pose: reeling backward, arms flung out sideways, hat flying off the head, body arched back, eyes wide with shock, mouth open in cry."

# === 夫妻 各 3 pose ===
gen "husband_eat"      "${HUSBAND_CHAR} Pose: seated at a small round saloon table, leaning forward, holding a knife and fork eating a steak from a plate, content expression."
gen "husband_alert"    "${HUSBAND_CHAR} Pose: seated at the same table, suddenly alarmed and angry, fists raised at face height, eyebrows furrowed, mouth open shouting, vein on temple."
gen "husband_throw"    "${HUSBAND_CHAR} Pose: seated at the table, right arm cocked back high holding a small dark round ashtray, ready to hurl it forward, angry shouting expression."
gen "wife_eat"         "${WIFE_CHAR} Pose: seated at a small round saloon table opposite her husband, holding a teacup with pinky raised, sipping gracefully."
gen "wife_alert"       "${WIFE_CHAR} Pose: seated at the table, sitting up straight, hands raised to mouth in shocked gesture, eyes wide in surprise."
gen "wife_throw"       "${WIFE_CHAR} Pose: seated at the table, right arm cocked back holding a red apple, ready to throw it, angry pursed lips."

# === 物品（單一物件特寫）===
gen "cup_intact"   "A simple wooden beer tankard with a curved handle on the side, full of foamy beer at the top. Pixar 3D chibi style, clean object on magenta background."
gen "cup_broken"   "A wooden beer tankard shattered into 4-5 large chunky pieces flying outward in a small burst, foamy beer splashing. Pixar 3D chibi style on magenta."
gen "bottle_intact" "A tall whiskey bottle, dark brown glass with a long neck, paper label with star emblem. Pixar 3D chibi style on magenta."
gen "bottle_broken" "A whiskey bottle shattered into chunky glass pieces flying outward, amber liquid splashing out. Pixar 3D chibi style on magenta."
gen "plate_intact"  "A round bullseye target board, three concentric rings colored red center, white middle, red outer, on a small wooden stand. Pixar 3D chibi style on magenta."
gen "plate_broken"  "A target board shattered into 4-5 chunky wooden pieces flying outward, bullet hole in the center fragment. Pixar 3D chibi style on magenta."

# === 投擲物 ===
gen "dynamite"  "A single chunky red stick of dynamite with a lit fuse on top sparking with yellow flame. Pixar 3D chibi style on magenta."
gen "explosion" "A cartoon explosion burst, jagged yellow-orange-red star shape with smoke wisps. Pixar 3D chibi style on magenta."
gen "apple"     "A glossy red apple with a small brown stem and one green leaf. Pixar 3D chibi style on magenta."
gen "ashtray"   "A round dark glass ashtray with one half-smoked cigarette resting on the rim, small wisp of smoke. Pixar 3D chibi style on magenta."

# === 場景元件 ===
gen "door_open"    "Two wooden saloon swing doors, both panels open wide showing a gap between them, visible wood slats and metal hinges. Pixar 3D chibi style on magenta."
gen "door_closed"  "Two wooden saloon swing doors closed together in the middle, the two panels meeting straight, visible wood slats and hinges. Pixar 3D chibi style on magenta."
gen "cover_intact"   "A small round wooden bar table flipped on its side, top facing screen left as a shield, four legs sticking out to screen right, intact and undamaged. Pixar 3D chibi style on magenta."
gen "cover_damaged"  "Same flipped wooden bar table but with chunky bullet holes and cracks across the tabletop, some splinters missing. Pixar 3D chibi style on magenta."
gen "cover_destroyed" "Same flipped wooden bar table now badly broken, large pieces missing from the top, only a short jagged stump of the original table remaining. Pixar 3D chibi style on magenta."

# === 酒保（吧台後上半身）===
gen "barman_idle"  "A chibi bartender behind the bar counter, only visible from the waist up. Bald shiny head with a thin black mustache, white collared shirt with a small black bowtie, white apron strap over the shoulder. Standing patiently with hands wiping a glass. Pixar 3D chibi style on magenta."
gen "barman_slide" "Same chibi bartender, now leaning forward sliding a beer mug across the counter with one arm extended toward screen left, motion lines behind the mug. Pixar 3D chibi style on magenta."

# === 背景（空酒吧場景，1536x1024 寬幅）===
log "▶ background (1536x1024)"
BG_PROMPT="Generate a 1536x1024 PNG with image_gen. A 45-degree top-down view of an empty old west saloon interior in Pixar 3D chibi cartoon style. Strict layout from top to bottom:
- Back wall (about 22 percent of height from top): cream wooden plank wall with a wooden shelf holding a few whiskey bottles, a wooden WANTED poster with stylized old-time text and a small portrait, a SALOON wooden sign with curly gold ornament, a brass oil lamp.
- Bartender walkway (about 22 to 32 percent of height): a strip of visible wooden floor where a bartender would stand, between the back shelves and the bar counter.
- Bar counter top (about 32 to 50 percent of height): a long horizontal polished dark walnut wooden bar counter top, displayed as a flat oval-rectangle viewed from above.
- Bar counter front panel (50 to 58 percent of height): the vertical front of the bar counter, dark wood.
- Customer floor (58 to 100 percent of height): a large open area of pine wood plank floor, all planks running parallel from near to far receding to the right.
On the left side of the screen, an arched opening showing the swing-door entrance with bright sky and a distant mountain town visible through it.
No characters, no chairs, no tables in the open space, no items on the bar, no swing door panels (only the opening). Just the empty room interior.
Pixar 3D cartoon style, warm afternoon lighting, soft shadows, saturated colors. Save to /Users/batman_work/claude/apps/westernBar/$OUT_DIR/background.png and confirm 1536x1024 with sips."
if [ ! -f "$OUT_DIR/background.png" ]; then
  echo "$BG_PROMPT" | codex exec --skip-git-repo-check >>"$LOG" 2>&1
  log "  ✓ background"
fi

log "===== all done ====="
