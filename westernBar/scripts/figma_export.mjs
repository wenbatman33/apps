// 直接走 TalkToFigma 的 WebSocket bridge (port 3055) 批次匯出 sprite
// 使用：node scripts/figma_export.mjs <channel>
// 例：node scripts/figma_export.mjs rx195dmi

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/assets/lcd_figma");
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHANNEL = process.argv[2];
if (!CHANNEL) { console.error("用法: node scripts/figma_export.mjs <channel>"); process.exit(1); }

// === 對應表：game_key → figma node id ===
const MAP = [
  // 警長
  ["sheriff_action0", "28:9"],
  ["sheriff_walk_1",  "28:10"],
  ["sheriff_walk_2",  "28:11"],
  ["sheriff_walk_3",  "28:12"],
  ["sheriff_walk_4",  "28:13"],
  ["sheriff_pour",    "28:14"],   // action_5
  ["sheriff_hide",    "28:15"],   // 躲在掩體
  ["sheriff_fire",    "28:18"],   // 決鬥開槍
  ["sheriff_down",    "28:17"],   // 中彈
  ["sheriff_duel_in", "28:13"],   // 暫用 walk_4
  // 通緝犯
  ["bandit_at_door",  "28:70"],   // boss開門
  ["bandit_enter",    "28:21"],   // boss_進場
  ["bandit_fire",     "28:6"],    // boss_開槍
  ["bandit_hit",      "28:23"],   // boss_中槍
  ["bandit_peek",     "28:30"],   // boss_刺探
  ["bandit_hide",     "28:31"],   // boss躲藏
  // 夫妻 + 桌椅
  ["husband_alert",   "28:74"],   // 男人_生氣
  ["husband_eat",     "28:62"],   // 男人_低頭吃東西
  ["husband_throw",   "28:34"],   // 男人_抬頭（暫當投擲）
  ["wife_alert",      "28:82"],   // 女人_生氣
  ["wife_eat",        "28:66"],   // 女人_低頭吃東西
  ["wife_throw",      "28:54"],   // 女人_抬頭
  ["couple_table",    "28:50"],   // 桌子
  ["chair_left",      "28:38"],
  ["chair_right",     "28:46"],
  // 場景物
  ["barman_idle",     "28:5"],
  ["barrel",          "28:16"],   // 木桶
  ["cover_intact",    "28:8"],    // 掩體_1
  // 物品（每組多顆，先抓一顆當代表）
  ["plate_intact",    "28:87"],   // 飛靶1
  ["bottle_intact",   "28:88"],   // 酒瓶1
  ["cup_intact",      "28:91"],   // 酒杯1
  ["cup_broken",      "28:127"],  // 酒杯擊碎
  ["bottle_broken",   "28:128"],  // 酒瓶擊碎
  // 炸彈 9 顆
  ["dyn_1",           "28:133"],
  ["dyn_2",           "28:137"],
  ["dyn_3",           "28:140"],
  ["dyn_4",           "28:143"],
  ["dyn_5",           "28:146"],
  ["dyn_6",           "28:149"],
  ["dyn_7",           "28:161"],
  ["dyn_8",           "28:155"],
  ["dyn_9",           "28:169"],
  // 投擲物代表
  ["apple",           "28:177"],
  ["ashtray",         "28:198"],
];

// === WebSocket logic ===
let ws;
const pending = new Map();
let msgIdSeq = 1;

function send(obj) { ws.send(JSON.stringify(obj)); }

function callCommand(command, params, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const id = "req_" + (msgIdSeq++);
    pending.set(id, { resolve, reject });
    const t = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("timeout"));
      }
    }, timeoutMs);
    pending.get(id).timer = t;
    send({
      id, type: "message", channel: CHANNEL,
      message: { id, command, params },
    });
  });
}

function onMessage(data) {
  let m;
  try { m = JSON.parse(data); } catch { return; }
  if (m.type === "system") return;
  // Figma plugin broadcasts as { type:"broadcast", message:{id, result|error}, ... }
  const inner = m.message;
  if (!inner || !inner.id) return;
  const p = pending.get(inner.id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(inner.id);
  if (inner.error) p.reject(new Error(inner.error));
  else p.resolve(inner.result);
}

(async () => {
  console.log(`[figma_export] 連線 ws://localhost:3055，加入 channel ${CHANNEL}`);
  await new Promise((resolve, reject) => {
    ws = new WebSocket("ws://localhost:3055");
    ws.addEventListener("open", () => {
      send({ id: "join_" + Date.now(), type: "join", channel: CHANNEL });
      // 等系統訊息確認
      setTimeout(resolve, 400);
    });
    ws.addEventListener("message", (ev) => onMessage(ev.data));
    ws.addEventListener("error", reject);
  });

  let ok = 0, fail = 0;
  for (const [name, nodeId] of MAP) {
    process.stdout.write(`  ${name.padEnd(20)} ${nodeId.padEnd(10)} `);
    try {
      const res = await callCommand("export_node_as_image", {
        nodeId, format: "PNG", scale: 1,
      });
      // res.imageData 是 base64
      const b64 = res.imageData || res.data;
      if (!b64) throw new Error("no imageData");
      const buf = Buffer.from(b64, "base64");
      const out = path.join(OUT_DIR, `${name}.png`);
      fs.writeFileSync(out, buf);
      console.log(`✓ ${buf.length} bytes`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
  }
  console.log(`\n完成: ${ok} ok / ${fail} fail`);
  console.log(`輸出路徑: ${OUT_DIR}`);
  ws.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
