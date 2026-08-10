#!/usr/bin/env node
/**
 * v2 模組化場景件並行生圖（codex exec image_gen）
 * 用法：node scripts/gen_v2.mjs [workers]
 *       ONLY=S_gate_0,S_wall_seg node scripts/gen_v2.mjs 3
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_BASE = path.join(ROOT, "public/assets");
const LOG = path.join(ROOT, "scripts/gen_v2.log");
const WORKERS = parseInt(process.argv[2] || "4", 10);

const manifest = JSON.parse(readFileSync(path.join(ROOT, "scripts/asset_manifest_v2.json"), "utf-8"));

// 與現有 CR 風角色一致的美術鎖定
const STYLE = "Supercell《Clash Royale》的美術風格：高品質 3D 卡通渲染，體積厚實、輪廓極清楚，強烈方向光與明確陰影，飽和度高。建築與器械要有手工木石質感與戰損細節。絕對不要甜美可愛風、不要精緻小擺飾感、不要寫實照片風。";

const CHROMA = "**背景必須是純洋紅色 #FF00FF 的純色平面**（供後製去背用），主體單一置中並盡量填滿畫面、主體本身絕對不可出現任何洋紅或粉紅色、不要外框、不要文字。";

// 各視角規則 — 對應遊戲內的組裝方式
const VIEWS = {
  tile:  { view: "**這是遊戲地表的無縫貼圖（seamless tileable texture）**：純俯視（top-down 90 度），無主體物件、無透視、無邊框，四邊圖案必須能無縫拼接。", bg: "滿版填滿整張畫布，不要透明、不要留白。" },
  front: { view: "**這是塔防遊戲的建築模組件，正面立面視角（front elevation）**：鏡頭平視略俯約 15 度，建築正面朝鏡頭，底邊貼齊地面線，結構完整清晰。", bg: null },
  siege: { view: "**這是從畫面上方向下方推進的攻城器械**：鏡頭在斜上方約 30 度俯瞰，器械正面朝向畫面下方（朝鏡頭方向），看得到頂部上表面，底部有橢圓形落地陰影。", bg: null },
  prop:  { view: "**這是戰場擺設物件**：鏡頭在斜上方約 30 度俯瞰，看得到物件頂部上表面，底部有橢圓形落地陰影。", bg: null },
  back:  { view: "**視角極為重要——這是站在城牆上、背對鏡頭向上方遠處攻擊的守軍**：鏡頭在角色的斜後上方約 40 度俯瞰，呈現角色的**背面與後腦勺／頭盔頂**，身體朝畫面上方（遠離鏡頭），武器指向畫面上方，腳下有橢圓形落地陰影。**絕對不可畫成正面立繪**。", bg: null },
};

function buildPrompt(item) {
  const out = `${ROOT}/public/assets/${item.cat}/${item.id}.png`;
  const v = VIEWS[item.view] || VIEWS.prop;
  const bgRule = v.bg || CHROMA;
  return `請用內建 image_gen 工具產一張 1024x1024 PNG。

主題：**${item.prompt}**

${v.view}

風格：${STYLE}

輸出規則：${bgRule}畫面中不可出現任何文字、字母或浮水印。

完成後把產出複製到絕對路徑 ${out}，並用 sips 縮放到 1024x1024。回報 OK 即可。`;
}

const log = (m) => { console.log(m); appendFileSync(LOG, m + "\n"); };

const only = (process.env.ONLY || "").split(",").filter(Boolean);
const todo = manifest.items.filter(it => {
  mkdirSync(path.join(OUT_BASE, it.cat), { recursive: true });
  if (only.length) return only.includes(it.id);
  return !existsSync(path.join(OUT_BASE, it.cat, `${it.id}.png`));
});

log(`\n=== v2 並行生圖：${todo.length} 張待生成，${WORKERS} 個 worker ===`);
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
