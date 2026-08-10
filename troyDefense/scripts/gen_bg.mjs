#!/usr/bin/env node
/**
 * 場景美術分層生圖（戰場／城牆／面板／格子）
 * 用法：node scripts/gen_bg.mjs [workers]
 *       ONLY=B_field node scripts/gen_bg.mjs 1
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_BASE = path.join(ROOT, "public/assets");
const LOG = path.join(ROOT, "scripts/gen_bg.log");
const WORKERS = parseInt(process.argv[2] || "4", 10);

const manifest = JSON.parse(readFileSync(path.join(ROOT, "scripts/asset_manifest_bg.json"), "utf-8"));

const STYLE = "專業手機遊戲的場景背景美術（AAA mobile game environment art）：" +
  "精緻的手繪厚塗（painterly / hand-painted）質感、豐富的細節與材質層次、" +
  "明確的方向光與柔和的環境遮蔽陰影、電影感的明暗對比與色溫變化、" +
  "溫暖的火光與冷色夜空形成對比。" +
  "絕對不要：扁平純色色塊、向量圖形風、粗描邊卡通貼紙風、像素風、照片。";

const SIZE = { portrait: "1024x1536", wide: "1536x1024", square: "1024x1024" };

function buildPrompt(item) {
  const sz = SIZE[item.size] || SIZE.square;
  const out = `${ROOT}/public/assets/${item.cat}/${item.id}.png`;
  return `請用內建 image_gen 工具產一張 ${sz} PNG。

主題：**${item.prompt}**

風格：${STYLE}

輸出規則：**滿版背景圖**，填滿整張畫布、不要透明、不要留白邊、不要外框。
畫面中**絕對不可出現任何人物、士兵、生物**，也不可出現任何文字、字母、數字或浮水印。

完成後把產出複製到絕對路徑 ${out}，並用 sips 縮放到 ${sz}。回報 OK 即可。`;
}

const log = (m) => { console.log(m); appendFileSync(LOG, m + "\n"); };

const only = (process.env.ONLY || "").split(",").filter(Boolean);
const todo = manifest.items.filter(it => {
  mkdirSync(path.join(OUT_BASE, it.cat), { recursive: true });
  if (only.length) return only.includes(it.id);
  return !existsSync(path.join(OUT_BASE, it.cat, `${it.id}.png`));
});

log(`\n=== 場景美術生圖：${todo.length} 張，${WORKERS} workers ===`);
let done = 0, failed = 0, cursor = 0;

function runOne(item) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn("codex", ["exec", "--skip-git-repo-check", buildPrompt(item)],
      { stdio: ["ignore", "ignore", "ignore"] });
    const timer = setTimeout(() => { try { p.kill("SIGKILL"); } catch (e) {} }, 480_000);
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
