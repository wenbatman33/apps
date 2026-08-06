#!/usr/bin/env node
/**
 * 並行生圖 — 同時開 N 個 codex exec，大幅縮短總時間
 * 用法：node scripts/gen_parallel.mjs [workers]
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_BASE = path.join(ROOT, "public/assets");
const LOG = path.join(ROOT, "scripts/gen_parallel.log");
const WORKERS = parseInt(process.argv[2] || "4", 10);

const manifest = JSON.parse(readFileSync(path.join(ROOT, "scripts/asset_manifest_top.json"), "utf-8"));

const STYLE = "Supercell《Clash Royale》/《部落衝突》的美術風格：高品質 3D 卡通渲染。**誇張且有戲劇性的角色設計**——大頭、粗壯的手腳、體積感厚實，表情強烈有個性（兇狠、囂張、猙獰或滑稽），不是乖巧可愛的小雕像。材質厚實有份量、強烈的方向光與明確陰影、飽和度高、輪廓極清楚。**絕對不要甜美可愛風、不要精緻小擺飾感、不要平淡表情**。";

const SIZE = { unit: "1024x1024", enemy: "1024x1024", sheet: "1536x1024", square: "1024x1024", icon: "1024x1024", portrait: "1024x1536" };
const sizeFor = (it) => SIZE[it.size] || "1024x1024";

// 戰場單位一律 45° 斜俯視 — 這是塔防遊戲單位的正確視角
const SHEETVIEW = "**視角極為重要——這是俯視棋盤遊戲的單位，不是角色卡立繪**：\n鏡頭架在角色的**斜上方約 45 度往下俯瞰**（top-down 3/4 game view），因此必須呈現：\n  ・清楚看得見**頭頂／頭盔的上表面**與**肩膀的上表面**\n  ・身體因俯視透視而**縱向壓縮**，腿看起來比正面站姿明顯短\n  ・看得到腳邊的地面，腳下有一圈**橢圓形落地陰影**\n  ・角色**背對畫面上方、朝畫面下方（往鏡頭方向）行走**\n**絕對不可以畫成平視的正面站姿立繪或角色卡插圖**。\n\n**同時這是一張行走循環 sprite sheet**：把畫面**平均分成橫向 4 格**，每格是同一角色的一個行走幀，由左到右：\n  第1格 左腳向前跨、第2格 雙腳交會身體最高、第3格 右腳向前跨、第4格 雙腳再次交會\n四格的體型、服裝、配色、配件、俯視角度必須完全一致，大小與垂直位置也一致，**唯一差別只有四肢姿勢與高低起伏**。每格角色置中、均勻分佈、不重疊。";

const TOPDOWN = "**視角：手機塔防棋盤上的防禦塔單位**，鏡頭略俯視約 25 度，看得見正面與一點頂面，單一主體置中並填滿畫面，腳下有明確的深色橢圓陰影。輪廓要非常清楚，縮到 80px 仍一眼可辨。";

const MAP = "**視角：3D 卡通塔防關卡地圖，由斜上方約 40 度俯視**。中央必須是一大片平坦、乾淨、有規則方格紋理的開闊地面（供遊戲疊格子，**不可有道路、石頭、樹木或雜物**），四周才是裝飾景物邊框。";

function buildPrompt(item) {
  const out = `${ROOT}/public/assets/${item.cat}/${item.id}.png`;
  const chroma = "**背景必須是純洋紅色 #FF00FF 的純色平面**（供後製去背用），" +
    "主體單一置中並盡量填滿畫面、主體本身絕對不可出現任何洋紅或粉紅色、" +
    "不要外框、不要文字。";

  let view = "", bgRule = "";
  if (item.size === "sheet") { view = SHEETVIEW; bgRule = chroma; }
  else if (item.size === "unit") { view = TOPDOWN; bgRule = chroma; }
  else if (item.size === "icon") { view = ""; bgRule = chroma; }
  else if (item.size === "square") { view = MAP; bgRule = "**滿版地圖**，不要透明、不要留白邊，正方形構圖。"; }
  else { view = ""; bgRule = "**滿版背景圖**，不要透明、不要留白邊，直式 2:3 構圖。"; }

  return `請用內建 image_gen 工具產一張 ${sizeFor(item)} PNG。

主題：**${item.prompt}**

${view}

風格：${STYLE}

輸出規則：${bgRule}畫面中不可出現任何文字、字母或浮水印。

完成後把產出複製到絕對路徑 ${out}，並用 sips 縮放到 ${sizeFor(item)}。回報 OK 即可。`;
}

const log = (m) => { console.log(m); appendFileSync(LOG, m + "\n"); };

// 待辦（跳過已存在）；ONLY=id1,id2 可指定
const only = (process.env.ONLY || "").split(",").filter(Boolean);
const todo = manifest.items.filter(it => {
  mkdirSync(path.join(OUT_BASE, it.cat), { recursive: true });
  if (only.length) return only.includes(it.id);
  return !existsSync(path.join(OUT_BASE, it.cat, `${it.id}.png`));
});

log(`\n=== 並行生圖：${todo.length} 張待生成，${WORKERS} 個 worker ===`);
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
