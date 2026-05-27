#!/usr/bin/env python3
"""把 Figma layout JSON 轉成 LAYOUT.ts 用的比例座標"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT, "figma_layout.json")) as f:
    data = json.load(f)

FX, FY, FW, FH = data["frame"]["x"], data["frame"]["y"], data["frame"]["w"], data["frame"]["h"]

def to_ratio(sp, anchor="bottom"):
    ax, ay, aw, ah = sp["abs"]
    # 相對 frame 的位置
    rx = (ax - FX) / FW
    ry = (ay - FY) / FH
    rw = aw / FW
    rh = ah / FH
    # 中心 x（與 LAYOUT.ts 約定一致）
    cx = rx + rw / 2
    # 依 anchor 算 y
    if anchor == "bottom":
        cy = ry + rh   # bottom edge
    else:
        cy = ry + rh / 2
    return {"x": round(cx, 4), "y": round(cy, 4), "w": round(rw, 4), "h": round(rh, 4)}

# 按 key 分組
sprites = {sp["key"]: to_ratio(sp) for sp in data["sprites"]}

# === 輸出 LAYOUT.ts ===
def fmt_sprite(key, src, anchor="bottom", extra_keys=None):
    s = sprites[key]
    parts = [f'x: {s["x"]}', f'y: {s["y"]}', f'w: {s["w"]}', f'h: {s["h"]}']
    if anchor:
        parts.append(f'anchor: "{anchor}"')
    parts.append(f'src: "{src}"')
    return "{ " + ", ".join(parts) + " }"

# 物品路徑：cup/bottle/plate 從 5（最右、酒保發）到 0（最左、被警長打掉）+ MISS (5)
# 但仔細看 Figma 的命名：5 反而是 MISS，0-4 是吧台上 5 格
# 重新看：飛盤-0 (x=0.769) 最右、飛盤-5 (x=0.194) 最左
# 所以路徑：發射(?) -> 0 -> 1 -> 2 -> 3 -> 4 -> 5(MISS)
def path_from_keys(keys, label_first=None, label_last=None):
    pts = []
    for i, k in enumerate(keys):
        if k not in sprites: continue
        s = sprites[k]
        # 用中心點
        pt = {"x": s["x"], "y": s["y"] - s["h"] / 2}
        if i == 0 and label_first: pt["lbl"] = label_first
        if i == len(keys) - 1 and label_last: pt["lbl"] = label_last
        pts.append(pt)
    return pts

cup_path  = path_from_keys(["cup_send","cup_0","cup_1","cup_2","cup_3","cup_4","cup_5"], "酒保發", "MISS")
bot_path  = path_from_keys(["bottle_send","bottle_0","bottle_1","bottle_2","bottle_3","bottle_4","bottle_5"], "酒保發", "MISS")
pl_path   = path_from_keys(["plate_send","plate_0","plate_1","plate_2","plate_3","plate_4","plate_5"], "酒保發", "MISS")
dyn_path  = path_from_keys([f"dyn_{i}" for i in range(1, 12)], "1 門口", "11 落地")
# 男人丟煙灰缸 → z1/z2（左半邊）；女人丟蘋果 → z3/z4（右半邊）
# Figma 命名：煙灰缸-3-x 落 x≈0.45（玩家 zone 2），煙灰缸-4-x 落 x≈0.33（玩家 zone 1）
# 蘋果-2-x 落 x≈0.59（玩家 zone 3），蘋果-1-x 落 x≈0.71（玩家 zone 4）
husband_z1 = path_from_keys(["ash_origin","ash_z4_p1","ash_z4_p2"], "起", "Z1 落")
husband_z2 = path_from_keys(["ash_origin","ash_z3_p1","ash_z3_p2"], "起", "Z2 落")
wife_z3    = path_from_keys(["apple_origin","apple_z2_p1","apple_z2_p2"], "起", "Z3 落")
wife_z4    = path_from_keys(["apple_origin","apple_z1_p1","apple_z1_p2"], "起", "Z4 落")

# 列印 LAYOUT.ts 用的內容
def path_lines(name, pts):
    lines = [f"  {name}: ["]
    for p in pts:
        parts = [f'x: {round(p["x"],3)}', f'y: {round(p["y"],3)}']
        if "lbl" in p: parts.append(f'lbl: "{p["lbl"]}"')
        lines.append("    { " + ", ".join(parts) + " },")
    lines.append("  ],")
    return "\n".join(lines)

print("// ===== Sprites =====")
sheriff_anchors = {
    "sheriff_action0": ("sprites/sheriff/action0.png", "bottom"),
    "sheriff_action1": ("sprites/sheriff/action1.png", "bottom"),
    "sheriff_action2": ("sprites/sheriff/action2.png", "bottom"),
    "sheriff_action3": ("sprites/sheriff/action3.png", "bottom"),
    "sheriff_action4": ("sprites/sheriff/action4.png", "bottom"),
    "sheriff_pour":    ("sprites/sheriff/pour.png", "bottom"),
    "sheriff_down":    ("sprites/sheriff/down.png", "bottom"),
    "sheriff_duel_in": ("sprites/sheriff/duel_in.png", "bottom"),
    "sheriff_hide":    ("sprites/sheriff/hide.png", "bottom"),
    "sheriff_fire":    ("sprites/sheriff/fire.png", "bottom"),
}
for k, (src, anc) in sheriff_anchors.items():
    print(f"  {k}: {fmt_sprite(k, src, anc)},")

print()
bandit_anchors = {
    "bandit_at_door": ("sprites/bandit/at_door.png", "bottom"),
    "bandit_enter":   ("sprites/bandit/enter.png", "bottom"),
    "bandit_hide":    ("sprites/bandit/hide.png", "bottom"),
    "bandit_peek":    ("sprites/bandit/peek.png", "bottom"),
    "bandit_fire":    ("sprites/bandit/fire.png", "bottom"),
    "bandit_hit":     ("sprites/bandit/hit.png", "bottom"),
}
for k, (src, anc) in bandit_anchors.items():
    print(f"  {k}: {fmt_sprite(k, src, anc)},")

print()
for k, src in [("door_open", "A/door_open.png"), ("door_closed", "A/door_closed.png"),
               ("cover_intact", "F/F01_table_intact.png"),
               ("cover_damaged", "F/F02_table_damaged.png"),
               ("cover_destroyed", "F/F03_table_destroyed.png")]:
    print(f"  {k}: {fmt_sprite(k, src, None)},")

print()
print("// === 物品（各 6 個位置 + 4 個擊碎） ===")
for k in ["cup_0","cup_1","cup_2","cup_3","cup_4","cup_5"]:
    print(f"  {k}: {fmt_sprite(k, f'G/G01_cup_intact.png', None)},")

print()
print("// ===== Paths =====")
print(path_lines("cup_flow", cup_path))
print(path_lines("bottle_flow", bot_path))
print(path_lines("plate_flow", pl_path))
print(path_lines("dynamite_arc", dyn_path))
print(path_lines("husband_throw_z1", husband_z1))
print(path_lines("husband_throw_z2", husband_z2))
print(path_lines("wife_throw_z3", wife_z3))
print(path_lines("wife_throw_z4", wife_z4))

# 同時輸出 JSON 給編輯器用
out = {
    "frame_ratio": {"w": FW, "h": FH},
    "sprites": sprites,
    "paths": {
        "cup_flow": cup_path,
        "bottle_flow": bot_path,
        "plate_flow": pl_path,
        "dynamite_arc": dyn_path,
        "husband_throw_z1": husband_z1,
        "husband_throw_z2": husband_z2,
        "wife_throw_z3": wife_z3,
        "wife_throw_z4": wife_z4,
    }
}
with open(os.path.join(ROOT, "layout_ratios.json"), "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f"\n// saved: scripts/figma_import/layout_ratios.json")
