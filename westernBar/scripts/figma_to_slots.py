#!/usr/bin/env python3
"""把 Figma 28:3 frame 內節點 bbox 換算成 SLOTS ratio 並寫進 LCD_LAYOUT.ts"""
import re, sys, pathlib

FW, FH = 1536, 1024  # Figma frame size

# (slot_key, figma_id, bbox=(x,y,w,h), anchor="bottom"/"center", extra={})
# bbox 直接從之前 scan_nodes 結果填入（已驗證過）
DATA = [
    # 警長
    ("sheriff/action0",  (200, 608, 317, 317), "bottom", {}),
    ("sheriff/action1",  (496, 659, 200, 362), "bottom", {"gunOffsetX": -0.30, "gunOffsetY": -0.50}),
    ("sheriff/action2",  (742, 663, 182, 367), "bottom", {"gunOffsetX": -0.30, "gunOffsetY": -0.50}),
    ("sheriff/action3",  (877, 678, 203, 348), "bottom", {"gunOffsetX": -0.30, "gunOffsetY": -0.50}),
    ("sheriff/action4",  (1129, 657, 231, 359),"bottom", {"gunOffsetX": -0.30, "gunOffsetY": -0.50}),
    ("sheriff/pour",     (1136, 712, 265, 334),"bottom", {}),
    ("sheriff/hide",     (1295, 352, 294, 294),"bottom", {}),
    ("sheriff/fire",     (1063, 375, 215, 233),"bottom", {}),
    ("sheriff/down",     (1063, 537, 310, 310),"bottom", {}),
    ("sheriff/duel_in",  (1129, 657, 231, 359),"bottom", {}),
    # 通緝犯
    ("bandit/at_door",   (124, 211, 236, 265), "bottom", {}),
    ("bandit/enter",     (108, 318, 304, 283), "bottom", {}),
    ("bandit/fire",      (20, 512, 339, 339),  "bottom", {}),
    ("bandit/hit",       (1, 521, 314, 314),   "bottom", {}),
    ("bandit/peek",      (388, 262, 167, 255), "bottom", {}),
    ("bandit/hide",      (401, 249, 162, 273), "bottom", {}),
    # 門（Figma 無 — 沿用舊值，但這裡寫死成合理數）
    ("door/open",        None, "bottom", {"x":0.0866, "y":0.3103, "w":0.1594, "h":0.2069}),
    ("door/closed",      None, "bottom", {"x":0.1166, "y":0.3372, "w":0.1501, "h":0.2337}),
    # 掩體（Figma 只有 intact，damaged/destroyed 共用位置）
    ("cover/intact",     (1244, 352, 187, 280),"bottom", {}),
    ("cover/damaged",    (1244, 380, 187, 250),"bottom", {}),
    ("cover/destroyed",  (1244, 430, 187, 200),"bottom", {}),
    # 炸彈軌跡
    ("dyn/1",  (251, 22, 114, 66),  "bottom", {}),
    ("dyn/2",  (412, 0, 114, 67),   "bottom", {}),
    ("dyn/3",  (586, 57, 114, 67),  "bottom", {}),
    ("dyn/4",  (793, 62, 114, 67),  "bottom", {}),
    ("dyn/5",  (994, 88, 114, 67),  "bottom", {}),
    ("dyn/6",  (1195, 96, 114, 67), "bottom", {}),
    ("dyn/7",  (1335, 272, 114, 67),"bottom", {}),
    ("dyn/8",  (1450, 500, 114, 67),"bottom", {}),  # 內推（Figma 在 1527 outside）
    ("dyn/9",  (1410, 925, 101, 77),"bottom", {}),
    ("dyn/10", None, "bottom", {"x":0.9550, "y":0.7050, "w":0.0808, "h":0.0690}),
    # 飛靶 5 個位置（位置1..5 = 0..4），column 5 外推
    ("plate/0", (1207, 7, 76, 76), "bottom", {}),
    ("plate/1", (1007, 7, 76, 76), "bottom", {}),
    ("plate/2", (800, 7, 76, 76),  "bottom", {}),
    ("plate/3", (593, 7, 76, 76),  "bottom", {}),
    ("plate/4", (416, 95, 76, 76), "bottom", {}),
    # 酒瓶
    ("bottle/0", (1236, 231, 41, 98), "bottom", {}),
    ("bottle/1", (1019, 231, 41, 98), "bottom", {}),
    ("bottle/2", (812, 231, 41, 98),  "bottom", {}),
    ("bottle/3", (605, 231, 41, 98),  "bottom", {}),
    ("bottle/4", (443, 247, 41, 98),  "bottom", {}),
    # 酒杯
    ("cup/0", (1207, 288, 45, 58), "bottom", {}),
    ("cup/1", (1000, 288, 45, 58), "bottom", {}),
    ("cup/2", (793, 288, 45, 58),  "bottom", {}),
    ("cup/3", (586, 288, 45, 58),  "bottom", {}),
    ("cup/4", (434, 304, 45, 58),  "bottom", {}),
    # 夫妻
    ("husband/1", (648, 397, 144, 228), "bottom", {}),  # 低頭吃東西
    ("husband/2", (542, 338, 195, 257), "bottom", {}),  # 生氣
    ("husband/3", (648, 379, 144, 246), "bottom", {}),  # 抬頭
    ("wife/1",    (893, 397, 144, 228), "bottom", {}),  # 借用 wife_alert 的 x，高度同 husband_eat
    ("wife/2",    (977, 352, 176, 248), "bottom", {}),  # 生氣
    ("wife/3",    (893, 390, 144, 228), "bottom", {}),  # 抬頭
    # 桌椅木桶（新增）
    ("couple_table",   (720, 465, 241, 163), "bottom", {}),
    ("chair_left",     (632, 448, 120, 177), "bottom", {}),
    ("chair_right",    (924, 447, 122, 180), "bottom", {}),
    ("barrel",         (446, 403, 128, 158), "bottom", {}),
    # 投擲物軌跡（蘋果 + 煙灰缸）
    ("ash/origin", (537, 361, 59, 50),  "bottom", {}),
    ("ash/z1_1",   (567, 577, 56, 47),  "bottom", {}),
    ("ash/z1_2",   (563, 693, 56, 47),  "bottom", {}),
    ("ash/z2_1",   (768, 603, 56, 47),  "bottom", {}),
    ("ash/z2_2",   (810, 678, 56, 47),  "bottom", {}),
    ("apple/origin",(1119, 379, 34, 35),"bottom", {}),
    ("apple/z3_1", (985, 609, 34, 35),  "bottom", {}),
    ("apple/z3_2", (945, 712, 34, 35),  "bottom", {}),
    ("apple/z4_1", (1181, 601, 34, 35), "bottom", {}),
    ("apple/z4_2", (1231, 711, 34, 35), "bottom", {}),
    # 爆炸（Figma 無）
    ("explosion",  None, "bottom", {"x":0.4942, "y":0.7778, "w":0.1386, "h":0.2337}),
    # 酒保（Figma 在右側偏外）
    ("barman/idle",  None, "bottom", {"x":0.9700, "y":0.3500, "w":0.1000, "h":0.2300}),
    ("barman/slide", None, "bottom", {"x":0.9700, "y":0.3500, "w":0.1000, "h":0.2300}),
]

def slot_dict(item):
    key, bbox, anchor, extra = item
    if bbox is None:
        d = dict(extra); d["anchor"] = anchor
        return d
    x, y, w, h = bbox
    cx = (x + w/2) / FW
    by = (y + h) / FH
    rw = w / FW
    rh = h / FH
    d = {"x": round(cx, 4), "y": round(by, 4), "w": round(rw, 4), "h": round(rh, 4), "anchor": anchor}
    d.update(extra)
    return d

def fmt_slot(key, d):
    parts = [f'x: {d["x"]}', f'y: {d["y"]}', f'w: {d["w"]}', f'h: {d["h"]}']
    if d.get("anchor"): parts.append(f'anchor: "{d["anchor"]}"')
    if "gunOffsetX" in d: parts.append(f'gunOffsetX: {d["gunOffsetX"]}')
    if "gunOffsetY" in d: parts.append(f'gunOffsetY: {d["gunOffsetY"]}')
    return f'  "{key}": {{ {", ".join(parts)} }},'

def main():
    lines = ["  // === 從 Figma frame 28:3 計算（scripts/figma_to_slots.py） ==="]
    for it in DATA:
        d = slot_dict(it)
        lines.append(fmt_slot(it[0], d))
    new_body = "\n".join(lines)

    layout = pathlib.Path("src/scenes/LCD_LAYOUT.ts")
    src = layout.read_text()
    updated = re.sub(
        r"(export const SLOTS[^=]*=\s*\{)[\s\S]*?(\n\};)",
        lambda m: m.group(1) + "\n" + new_body + m.group(2),
        src, count=1,
    )
    layout.write_text(updated)
    print(f"wrote {len(DATA)} slots to {layout}")

    # 同步更新 public/slots.json
    import json
    out = {it[0]: slot_dict(it) for it in DATA}
    pathlib.Path("public/slots.json").write_text(json.dumps(out, indent=2))
    print(f"wrote public/slots.json")

if __name__ == "__main__":
    main()
