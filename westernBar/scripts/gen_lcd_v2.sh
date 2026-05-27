#!/bin/bash
# v2: 3D chibi cartoon Western，姿勢嚴格對應遊戲機制
set -u
cd "$(dirname "$0")/.."

OUT_DIR="public/assets/lcd_color"
LOG="scripts/gen_lcd_v2.log"
mkdir -p "$OUT_DIR"

ts() { date +"%H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# 統一風格規格
STYLE="High-quality 3D chibi cartoon character render, Pixar/Toy Story style, polished smooth surfaces, soft volumetric studio lighting, subsurface scattering, warm color palette, expressive exaggerated cartoon facial features, big rounded heads with chunky body proportions 1:2.2 head:body ratio, no outlines, photorealistic materials (leather grain, denim weave, wood grain, metal highlights). 512x512 PNG, single subject centered fills 80 percent of frame, BACKGROUND must be pure flat magenta #FF00FF (for chroma-key removal), no floor shadow, no ground plane, no other characters."

SHERIFF="Young brave chibi cowboy sheriff. Wide-brim brown leather cowboy hat with a small gold five-pointed star pinned on the front. Tousled medium-brown hair peeking under hat. Big round expressive eyes (large pupils with shiny highlights), small button nose, cheerful determined face with rosy cheeks. Cream long-sleeve shirt with rolled-up cuffs. Red bandana tied around neck. Dark brown leather vest with large gold sheriff star on left chest. Wide brown belt with gold buckle, brown holster on right hip. Blue denim jeans with grey cuffed hems. Brown high-top leather boots with small gold star-shaped spurs on heels. Silver revolver in right hand."

BANDIT="Mean chibi outlaw bandit. Black wide-brim cowboy hat (slightly tattered). Red bandana mask covering nose and mouth, eyes visible (narrowed and menacing). Messy dark hair sticking out from under hat. Loose dirty grey-brown long-sleeve shirt with rolled sleeves. Two crossing brown leather bandolier ammo belts across chest with brass bullet shells. Dark brown leather vest. Worn dark brown trousers. Heavy brown boots. Brown holster on right hip. Silver revolver in right hand when armed."

HUSBAND="Plump middle-aged chibi husband (about 40-50 years old). Bald shiny head on top, two big curly black tufts of hair sticking out from the sides above the ears. Huge bushy black handlebar mustache. Big round nose, droopy expressive eyebrows. White button-up collared shirt under brown leather suspenders, dark brown trousers. Sitting on a tall wooden chair."

WIFE="Plump middle-aged chibi wife (about 40-50 years old). Round face, big eyes with long lashes, small pink lips. Bright red hair styled in a tall vintage updo bun with hairpins. Long old-fashioned pink saloon dress with frilly collar and tight bodice, dark gloves. Sitting on a tall wooden chair."

gen() {
  local key="$1"
  local prompt="$2"
  local out="$OUT_DIR/${key}.png"
  [ -f "$out" ] && { log "skip (exists): $key"; return; }
  log "▶ $key"
  echo "${STYLE}

${prompt}

Save to /Users/batman_work/claude/apps/westernBar/$out and verify 512x512 with sips." | codex exec --skip-git-repo-check >>"$LOG" 2>&1
  [ -f "$out" ] && log "  ✓ done" || log "  ✗ failed"
}

log "===== generating v2 (polished 3D chibi) ====="

# ====== 警長 10 pose ======
# 走 zone：頭抬高看槍口（射擊上方吧台物件）
HEAD_UP="HEAD MUST BE TILTED BACK looking straight up at the gun barrel above him (chin pointing up, eyes looking at the ceiling/sky). NOT looking forward, NOT at camera. He is aiming at items on the bar overhead so he looks UP."

gen "sheriff_action0" "${SHERIFF} Pose: side view, mid-stride walking confidently, one leg forward one back, revolver holstered (not in hand), arms swinging naturally, head facing forward looking proud. This is the opening parade pose."

gen "sheriff_walk_1" "${SHERIFF} Standing pose in zone 1. Right arm raised straight up holding revolver pointing to sky overhead. Left arm relaxed at side. Feet shoulder-width apart, knees slightly bent. ${HEAD_UP}"

gen "sheriff_walk_2" "${SHERIFF} Walking pose, RIGHT LEG CROSSED IN FRONT of left leg forming X shape (knees slightly bent). Body slightly tilted, right arm raised holding revolver pointing straight up to sky. Left arm swinging. ${HEAD_UP}"

gen "sheriff_walk_3" "${SHERIFF} Sidestep pose, BOTH LEGS WIDE APART in V shape (knees turned outward, feet far apart). Right arm raised holding revolver pointing straight up. Left arm out for balance. ${HEAD_UP}"

gen "sheriff_walk_4" "${SHERIFF} Karate-stance pose, LEGS SPLIT VERY WIDE (one to each side like a split). Chest puffed forward. Right arm raised holding revolver pointing straight up. Left arm out. ${HEAD_UP}"

gen "sheriff_pour" "${SHERIFF} Pose: holding a brown whiskey bottle in right hand high above head, TILTING bottle so amber liquid pours out as a stream toward the ground beneath his feet. Head tilted back looking up at the bottle. Mouth open with satisfied gleeful smile. Left arm relaxed."

gen "sheriff_duel_in" "${SHERIFF} Pose: sneaking sideways toward cover, body crouched LOW (knees deeply bent), revolver in right hand pointing DOWN at hip level, head turned alertly to the LEFT side scanning for danger, mouth set in grim line. Both feet positioned for stealthy step."

gen "sheriff_hide" "${SHERIFF} Pose: CROUCHED very low behind cover. Only the top of the hat, the eyes peeking over an imaginary cover edge, and ONE arm holding the revolver visible above the cover line. Body almost entirely hidden below the cover edge. Wide alert eyes looking toward screen left."

gen "sheriff_fire" "${SHERIFF} Pose: standing sideways facing LEFT side of screen, BOTH HANDS gripping revolver extended HORIZONTALLY toward screen left. Muzzle flash (yellow spark and smoke puff) at the gun barrel. Gritted teeth, eyes narrowed and focused. Right foot forward, left foot back in shooting stance."

gen "sheriff_down" "${SHERIFF} Pose: KNOCKED OUT lying flat on back on ground. Arms and legs splayed out limply in star shape. Hat fallen and tilted beside head. X-shaped closed eyes. Tongue lolling out. Small yellow stars circling above head as dizzy marks."

# ====== 通緝犯 6 pose ======
gen "bandit_at_door" "${BANDIT} Pose: peeking through the gap of double wooden saloon swing doors. ONLY upper body (head, shoulders, one arm) visible, lower body hidden behind the door panels. One hand pushing the right door panel slightly open. Eyes scanning forward menacingly."

gen "bandit_enter" "${BANDIT} Pose: stepping forward into the saloon interior, one foot forward and one foot back mid-stride. Body fully visible, facing screen right (the direction of the bar). Arms swinging naturally with menacing forward purpose. Dust kicked up from boots."

gen "bandit_hide" "${BANDIT} Pose: fully CROUCHED DOWN very small behind cover. Body compacted tight, knees pulled up to chest, arms hugging knees. ONLY the very top of the black hat barely visible above an imaginary cover edge. Body almost entirely hidden."

gen "bandit_peek" "${BANDIT} Pose: half-rising from behind cover. Head, shoulders and ONE arm visible above the cover edge. Eyes scanning to the right. One hand resting on the cover edge. Bottom half of body hidden behind cover."

gen "bandit_fire" "${BANDIT} Pose: standing sideways facing RIGHT side of screen, BOTH HANDS gripping silver revolver extended HORIZONTALLY toward screen right. Muzzle flash (bright yellow spark and smoke cloud) at the gun barrel. Snarling mouth visible behind bandana, eyes narrowed with intense focus."

gen "bandit_hit" "${BANDIT} Pose: REELING BACKWARD as if shot. Both arms flung wildly outward to sides. Black hat flying off the head straight up. Body arched far back. Eyes wide open in shock, mouth open in pained cry. Both feet awkwardly off-balance."

# ====== 夫妻 6 pose（坐在椅子上，桌子是另外的 sprite）======
gen "husband_eat" "${HUSBAND} Pose: SITTING on chair, leaning forward toward a small table (not shown in this sprite), holding a fork in right hand and knife in left hand, eating with content expression, full cheeks. Eyes calm and happy. The chair under him is visible but no table in this image."

gen "husband_alert" "${HUSBAND} Pose: SITTING on chair, suddenly ALARMED — body bolt upright, BOTH FISTS raised to face height in angry threatening gesture, eyebrows furrowed deep, mouth wide open shouting (visible teeth), red vein popping on temple, big mustache flying. The chair under him is visible."

gen "husband_throw" "${HUSBAND} Pose: SITTING on chair, RIGHT ARM cocked all the way back behind head HOLDING A SMALL DARK ASHTRAY ready to hurl forward, left hand grabbing the table edge, angry shouting expression with teeth bared, mustache flying. Body twisted to put weight into the throw. The chair is visible."

gen "wife_eat" "${WIFE} Pose: SITTING on chair, sitting elegantly upright, holding a small porcelain TEACUP in right hand with pinky raised gracefully, taking a gentle sip with eyes half-closed in satisfaction, content smile. The chair under her is visible but no table in this image."

gen "wife_alert" "${WIFE} Pose: SITTING on chair, sitting bolt upright in SHOCK — both gloved hands raised flat to either side of her face in classic 'oh my!' gesture, eyes wide as dinner plates, mouth in surprised O shape. Hair bun shaking. The chair is visible."

gen "wife_throw" "${WIFE} Pose: SITTING on chair, RIGHT ARM cocked back HOLDING A RED APPLE ready to throw it forward, left hand on hip, angry pursed lips, eyebrows arched in fury, eyes blazing. Body twisted to put weight into the throw. The chair is visible."

# 共用圓桌（夫妻坐的桌子，獨立 sprite 疊在中間）
gen "couple_table" "Small round wooden saloon table viewed from a slight 3/4 angle. Polished dark walnut wood top with visible wood grain. Single central pedestal leg flaring at the base. ON TOP of the table: a small dinner plate with food bits, a tiny porcelain teacup, scattered playing cards, breadcrumbs. No characters. No chairs (chairs are separate sprites under the seated husband/wife)."

# ====== 物品 ======
gen "cup_intact" "A single chunky wooden beer tankard mug, viewed from side. Curved sturdy handle on side. Full of golden beer with thick foamy white head spilling slightly over the rim. Wood grain visible on the mug body, glints of foam highlights."

gen "cup_broken" "A wooden beer tankard SHATTERED into 5-6 chunky flying pieces — pieces flying outward in a starburst, golden beer splashing in liquid droplet sprays, frothy foam scattering."

gen "bottle_intact" "A tall whiskey bottle with long narrow neck, dark amber glass body, paper label showing a stylized gold star and the word WHISKY. Cork in top. Smooth glass highlights catching light."

gen "bottle_broken" "A whiskey bottle SHATTERED into chunky glass shards flying outward, amber whiskey liquid splashing and forming droplets in mid-air. Paper label tearing apart. Cork popping out."

gen "plate_intact" "A round bullseye target board with three concentric rings (bright red center, white middle, bright red outer), mounted on a small wooden A-frame stand. Wood grain on the stand. NOT a dinner plate, this is a SHOOTING TARGET."

gen "plate_broken" "A bullseye target board SHATTERED into 4-5 chunky wooden splinter pieces flying outward, bullet hole visible in the center fragment, small puffs of dust around the impact."

# ====== 投擲物 / 爆炸 ======
gen "dynamite" "A chunky red cylindrical stick of dynamite (TNT). Wrapped in red paper with black diagonal stripes. Sparking yellow flame on the fuse at the top. Smoke wisp trailing."

gen "explosion" "A cartoon BOOM explosion burst. Jagged star-shaped cloud of bright yellow, orange and red flames with smoke wisps and small flying debris bits. No text."

gen "apple" "A glossy round bright red apple. Small brown stem on top. One vibrant green leaf attached to stem. Shiny highlights on the skin."

gen "ashtray" "A small round dark glass ashtray. One half-smoked cigarette (with glowing orange tip) resting on the rim. Thin wisp of grey smoke rising from the cigarette."

# ====== 場景元件 ======
gen "door_open" "Two wooden western saloon swing doors viewed straight on, BOTH PANELS OPEN WIDE swung outward showing a clear gap between them. Wooden plank slats with metal hinges and decorative wood trim. NO characters, NO frame around the doors."

gen "door_closed" "Two wooden western saloon swing doors viewed straight on, BOTH PANELS CLOSED meeting flat in the middle. Wooden plank slats with metal hinges and decorative wood trim. NO characters."

gen "cover_intact" "A small round wooden saloon table FLIPPED ON ITS SIDE on the ground, used as a defensive cover/barricade. Top edge of the table facing screen left (the side facing the shooter). Four legs sticking out to the right. Wood completely INTACT with no damage. Visible wood grain."

gen "cover_damaged" "Same flipped wooden saloon table on its side but now DAMAGED — multiple bullet holes punched through the tabletop, cracks radiating, small wood splinters missing, some chips knocked off the edge."

gen "cover_destroyed" "Same flipped wooden saloon table but now BADLY DESTROYED — most of the top half blown away, only a low jagged stump remaining with one broken leg, lots of splinters, deep cracks throughout."

# ====== 酒保 ======
gen "barman_idle" "Chibi bartender behind bar counter, ONLY upper body visible (waist up). Bald shiny round head with thin curled black handlebar mustache, friendly smile. White collared shirt under a small black bow tie. White apron strap visible over shoulder. Both hands holding a glass and a polishing cloth, wiping the glass calmly."

gen "barman_slide" "Same chibi bartender, leaning forward energetically with right arm extended toward screen LEFT, having just SLID a wooden beer mug along the bar counter. The mug visible at the end of his outstretched arm, motion lines and speed streaks behind it. Mouth open in cheerful shout."

log "===== v2 generation queued ====="
