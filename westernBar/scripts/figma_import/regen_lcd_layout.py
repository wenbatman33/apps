#!/usr/bin/env python3
"""從 layout_ratios.json 重新生成 LCD_LAYOUT.ts 的 SLOTS 區塊"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT, "layout_ratios.json")) as f:
    d = json.load(f)
S = d["sprites"]

# Figma key → SLOTS key + src + anchor + gunOffset
mapping = [
    # 警長
    ("sheriff_action0", "sheriff/action0", "sprites/sheriff/action0.png", "bottom", None),
    ("sheriff_action1", "sheriff/action1", "sprites/sheriff/action1.png", "bottom", (-0.30, -0.50)),
    ("sheriff_action2", "sheriff/action2", "sprites/sheriff/action2.png", "bottom", (-0.30, -0.50)),
    ("sheriff_action3", "sheriff/action3", "sprites/sheriff/action3.png", "bottom", (-0.30, -0.50)),
    ("sheriff_action4", "sheriff/action4", "sprites/sheriff/action4.png", "bottom", (-0.30, -0.50)),
    ("sheriff_pour",    "sheriff/pour",    "sprites/sheriff/pour.png",    "bottom", None),
    ("sheriff_down",    "sheriff/down",    "sprites/sheriff/down.png",    "bottom", None),
    ("sheriff_duel_in", "sheriff/duel_in", "sprites/sheriff/duel_in.png", "bottom", None),
    ("sheriff_hide",    "sheriff/hide",    "sprites/sheriff/hide.png",    "bottom", None),
    ("sheriff_fire",    "sheriff/fire",    "sprites/sheriff/fire.png",    "bottom", None),
    # 通緝犯
    ("bandit_at_door", "bandit/at_door", "sprites/bandit/at_door.png", "bottom", None),
    ("bandit_enter",   "bandit/enter",   "sprites/bandit/enter.png",   "bottom", None),
    ("bandit_hide",    "bandit/hide",    "sprites/bandit/hide.png",    "bottom", None),
    ("bandit_peek",    "bandit/peek",    "sprites/bandit/peek.png",    "bottom", None),
    ("bandit_fire",    "bandit/fire",    "sprites/bandit/fire.png",    "bottom", None),
    ("bandit_hit",     "bandit/hit",     "sprites/bandit/hit.png",     "bottom", None),
    # 門
    ("door_open",   "door/open",   "A/door_open.png",   "bottom", None),
    ("door_closed", "door/closed", "A/door_closed.png", "bottom", None),
    # 掩體
    ("cover_intact",    "cover/intact",    "F/F01_table_intact.png",    "bottom", None),
    ("cover_damaged",   "cover/damaged",   "F/F02_table_damaged.png",   "bottom", None),
    ("cover_destroyed", "cover/destroyed", "F/F03_table_destroyed.png", "bottom", None),
    # 沖天炮
    ("dyn_1",  "dyn/1",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_2",  "dyn/2",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_3",  "dyn/3",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_4",  "dyn/4",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_5",  "dyn/5",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_6",  "dyn/6",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_7",  "dyn/7",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_8",  "dyn/8",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_9",  "dyn/9",  "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_10", "dyn/10", "I/I01_dynamite_lit.png", "bottom", None),
    ("dyn_11", "dyn/11", "I/I02_dynamite_ground.png", "bottom", None),
    # 飛盤
    ("plate_send", "plate/send", "G/G05_plate_intact.png", "bottom", None),
    ("plate_0", "plate/0", "G/G05_plate_intact.png", "bottom", None),
    ("plate_1", "plate/1", "G/G05_plate_intact.png", "bottom", None),
    ("plate_2", "plate/2", "G/G05_plate_intact.png", "bottom", None),
    ("plate_3", "plate/3", "G/G05_plate_intact.png", "bottom", None),
    ("plate_4", "plate/4", "G/G05_plate_intact.png", "bottom", None),
    ("plate_5", "plate/5", "G/G05_plate_intact.png", "bottom", None),
    # 酒瓶
    ("bottle_send", "bottle/send", "G/G03_bottle_intact.png", "bottom", None),
    ("bottle_0", "bottle/0", "G/G03_bottle_intact.png", "bottom", None),
    ("bottle_1", "bottle/1", "G/G03_bottle_intact.png", "bottom", None),
    ("bottle_2", "bottle/2", "G/G03_bottle_intact.png", "bottom", None),
    ("bottle_3", "bottle/3", "G/G03_bottle_intact.png", "bottom", None),
    ("bottle_4", "bottle/4", "G/G03_bottle_intact.png", "bottom", None),
    ("bottle_5", "bottle/5", "G/G03_bottle_intact.png", "bottom", None),
    # 酒杯
    ("cup_send", "cup/send", "G/G01_cup_intact.png", "bottom", None),
    ("cup_0", "cup/0", "G/G01_cup_intact.png", "bottom", None),
    ("cup_1", "cup/1", "G/G01_cup_intact.png", "bottom", None),
    ("cup_2", "cup/2", "G/G01_cup_intact.png", "bottom", None),
    ("cup_3", "cup/3", "G/G01_cup_intact.png", "bottom", None),
    ("cup_4", "cup/4", "G/G01_cup_intact.png", "bottom", None),
    ("cup_5", "cup/5", "G/G01_cup_intact.png", "bottom", None),
    # 夫妻
    ("husband_1", "husband/1", "sprites/husband/eat1.png",  "bottom", None),
    ("husband_2", "husband/2", "sprites/husband/alert.png", "bottom", None),
    ("husband_3", "husband/3", "sprites/husband/hide.png",  "bottom", None),
    ("wife_1",    "wife/1",    "sprites/wife/eat1.png",     "bottom", None),
    ("wife_2",    "wife/2",    "sprites/wife/alert.png",    "bottom", None),
    ("wife_3",    "wife/3",    "sprites/wife/hide.png",     "bottom", None),
    # 投擲物
    ("ash_origin", "ash/origin", "H/H02_ashtray.png", "bottom", None),
    ("ash_z4_p1",  "ash/z1_1",   "H/H02_ashtray.png", "bottom", None),
    ("ash_z4_p2",  "ash/z1_2",   "H/H02_ashtray.png", "bottom", None),
    ("ash_z3_p1",  "ash/z2_1",   "H/H02_ashtray.png", "bottom", None),
    ("ash_z3_p2",  "ash/z2_2",   "H/H02_ashtray.png", "bottom", None),
    ("apple_origin", "apple/origin", "H/H01_apple.png", "bottom", None),
    ("apple_z2_p1",  "apple/z3_1",   "H/H01_apple.png", "bottom", None),
    ("apple_z2_p2",  "apple/z3_2",   "H/H01_apple.png", "bottom", None),
    ("apple_z1_p1",  "apple/z4_1",   "H/H01_apple.png", "bottom", None),
    ("apple_z1_p2",  "apple/z4_2",   "H/H01_apple.png", "bottom", None),
    # 爆炸
    ("explosion", "explosion", "I/I03_explosion.png", "bottom", None),
]

print("// 從 layout_ratios.json 自動生成 — 不要手改，改用 regen_lcd_layout.py")
print()
for figma_key, slot_key, src, anchor, gun in mapping:
    if figma_key not in S:
        print(f"  // MISSING: {figma_key}")
        continue
    s = S[figma_key]
    parts = [f'x: {s["x"]:.4f}', f'y: {s["y"]:.4f}', f'w: {s["w"]:.4f}', f'h: {s["h"]:.4f}']
    if anchor:
        parts.append(f'anchor: "{anchor}"')
    parts.append(f'src: "{src}"')
    if gun:
        parts.append(f'gunOffsetX: {gun[0]}')
        parts.append(f'gunOffsetY: {gun[1]}')
    print(f'  "{slot_key}": {{ ' + ", ".join(parts) + " },")

# 加上沒在 Figma 但需要的 slot
print()
print("  // 酒保（Figma 沒給 — 預設位置）")
print('  "barman/idle":  { x: 0.910, y: 0.346, w: 0.105, h: 0.250, anchor: "bottom", src: "sprites/barman/idle.png" },')
print('  "barman/slide": { x: 0.910, y: 0.346, w: 0.105, h: 0.250, anchor: "bottom", src: "sprites/barman/slide.png" },')
