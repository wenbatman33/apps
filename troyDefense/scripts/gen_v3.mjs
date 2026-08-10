#!/usr/bin/env node
/**
 * v3 精緻貼紙風並行生圖（codex exec image_gen）
 * 用法：node scripts/gen_v3.mjs [workers]
 *       ONLY=G_def_archer,G_soldier node scripts/gen_v3.mjs 3
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_BASE = path.join(ROOT, "public/assets");
const LOG = path.join(ROOT, "scripts/gen_v3.log");
const WORKERS = parseInt(process.argv[2] || "4", 10);

const manifest = JSON.parse(readFileSync(path.join(ROOT, "scripts/asset_manifest_v3.json"), "utf-8"));

// ── 風格鎖定：專業手遊素材包的貼紙風 ──
const STYLE = "專業手機遊戲 2D 素材包的貼紙風格（premium mobile game asset pack sticker style）：" +
  "**每個形狀都有均勻的粗深棕色描邊（thick uniform dark-brown outline，約佔畫面 1.5% 粗細）**、" +
  "底色平塗＋柔和的兩階漸層陰影（soft cel shading）＋頂部光澤高光（glossy highlight）、" +
  "Q 版圓潤飽滿的造型、明亮飽和但和諧的配色、乾淨的向量插畫質感。" +
  "整體像高品質貼紙，可愛精緻、大人小孩都喜歡。" +
  "絕對不要：3D 寫實渲染、照片質感、雜訊筆觸、像素風。";

const CHROMA = "**背景必須是純洋紅色 #FF00FF 的純色平面**（供後製去背用），主體單一置中並盡量填滿畫面、主體本身絕對不可出現任何洋紅或粉紅色、不要外框、不要文字。";

const NOHUMAN = "畫面中**絕對不可出現任何人物、士兵或生物**，只畫物件本身。";
const VIEWS = {
  tile:  "**這是遊戲地圖的無縫貼圖（seamless tileable texture）**：純俯視、無主體物件、無透視、無外框描邊，**四邊圖案必須能無縫拼接**。滿版填滿整張畫布、不要透明、不要留白。" + NOHUMAN,
  back:  "**視角：站在城牆上、背對鏡頭向畫面上方攻擊的守軍**——呈現角色的背面與頭盔後方，武器指向畫面上方。**只畫角色本身＋腳下橢圓形落地陰影，不要石台、不要地面、不要背景物**。絕不可畫成正面。",
  front: "**視角：朝畫面下方行軍的敵兵正面**——面向鏡頭。只畫角色本身＋腳下橢圓形落地陰影，不要地面、不要背景物。",
  building: "**視角：建築正面立面（front elevation）**，結構完整。" + NOHUMAN,
  side:  "**視角：側面**，底部有橢圓形落地陰影。" + NOHUMAN,
  siege: "**視角：斜上方約 30 度俯瞰的攻城器械**，正面朝畫面下方，看得到頂部，底部有橢圓形落地陰影。" + NOHUMAN,
  prop:  "**視角：斜上方約 30 度俯瞰的物件**，底部有橢圓形落地陰影。" + NOHUMAN,
};

function buildPrompt(item) {
  const out = `${ROOT}/public/assets/${item.cat}/${item.id}.png`;
  return `請用內建 image_gen 工具產一張 1024x1024 PNG。

主題：**${item.prompt}**

${VIEWS[item.view] || ""}

風格：${STYLE}

輸出規則：${CHROMA}畫面中不可出現任何文字、字母或浮水印。

完成後把產出複製到絕對路徑 ${out}，並用 sips 縮放到 1024x1024。回報 OK 即可。`;
}

const log = (m) => { console.log(m); appendFileSync(LOG, m + "\n"); };

const only = (process.env.ONLY || "").split(",").filter(Boolean);
const todo = manifest.items.filter(it => {
  mkdirSync(path.join(OUT_BASE, it.cat), { recursive: true });
  if (only.length) return only.includes(it.id);
  return !existsSync(path.join(OUT_BASE, it.cat, `${it.id}.png`));
});

log(`\n=== v3 貼紙風並行生圖：${todo.length} 張，${WORKERS} workers ===`);
let done = 0, failed = 0;
let cursor = 0;

function runOne(item) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn("codex", ["exec", "--skip-git-repo-check", buildPrompt(item)],
      { stdio: ["ignore", "ignore", "ignore"] });
    const timer = setTimeout(() => { try { p.kill("SIGKILL"); } catch (e) {} }, 420_000);
    p.on("close", () => {
      clearTimeout(timer);
      const dt = ((Date.now() - t0) / 1000).toFixed(0);
      const ok = existsSync(path.join(OUT_BASE, item.cat, `${item.id}.png`));
      ok ? done++ : failed++;
      log(`${ok ? "✓" : "✗"} ${item.id}  ${dt}s   (${done + failed}/${todo.length})`);
      resolve();
    });
  });
}

async function worker(id) {
  while (cursor < todo.length) {
    const item = todo[cursor++];
    log(`▶ [w${id}] ${item.id}`);
    await runOne(item);
  }
}

await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i + 1)));
log(`\n=== 完成：成功 ${done}，失敗 ${failed} ===`);
