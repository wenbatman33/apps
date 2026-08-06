#!/usr/bin/env node
/**
 * 防守特洛伊 素材生圖（透過 codex exec 內建 image_gen 工具）
 *
 * 用法：
 *   node scripts/gen_via_codex.mjs              # 全跑（已存在則跳過）
 *   node scripts/gen_via_codex.mjs T E          # 只跑指定分類
 *   node scripts/gen_via_codex.mjs --only T_archer_1
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "scripts/asset_manifest.json");
const OUT_BASE = path.join(ROOT, "public/assets");
const LOG = path.join(ROOT, "scripts/gen_via_codex.log");

const manifest = JSON.parse(readFileSync(MANIFEST, "utf-8"));
const args = process.argv.slice(2);
const onlyIds = new Set();
const onlyCats = new Set();
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--only") { while (args[i + 1] && !args[i + 1].startsWith("--")) onlyIds.add(args[++i]); }
  else if (/^[A-Z]$/.test(a)) onlyCats.add(a);
}
const items = manifest.items.filter(it => {
  if (onlyIds.size && !onlyIds.has(it.id)) return false;
  if (onlyCats.size && !onlyCats.has(it.cat)) return false;
  return true;
});

// === 美術風格鎖定 ===
const STYLE = "古希臘黑繪陶器美學 × 現代遊戲發光特效的融合風格。" +
  "配色嚴格限制：赭紅 #C8542B、炭黑 #1A1512、象牙白 #EDE0C8、古金 #D4A017，" +
  "特效部分才允許高飽和發光（金橙、靛藍）。" +
  "質感：手繪厚塗、有陶土顆粒感與斑駁做舊、輪廓線粗黑有力、" +
  "整體像會動的古代陶器繪畫。史詩、莊嚴、略帶悲劇感。不要 3D 渲染、不要 Q 版、不要可愛化。";

const SIZE = { sprite: "1024x1024", portrait: "1024x1536" };
const sizeFor = (it) => SIZE[it.size] || SIZE.sprite;

function buildPrompt(item) {
  const out = `${ROOT}/public/assets/${item.cat}/${item.id}.png`;
  const isPortrait = item.size === "portrait";
  const bgRule = isPortrait
    ? "**滿版背景圖**，不要透明、不要留白邊、構圖務必是直式 2:3。"
    : "**背景必須是純洋紅色 #FF00FF 的純色平面**（供後製去背用），主體單一置中、" +
      "主體本身絕對不可出現任何洋紅或粉紅色、不要陰影投射到背景、不要地面、不要外框、不要文字。";

  return `請用內建 image_gen 工具產一張 ${sizeFor(item)} PNG。

主題：**${item.prompt}**

風格：${STYLE}

輸出規則：${bgRule}畫面中不可出現任何文字、字母或浮水印。

完成後把產出複製到絕對路徑 ${out}，並用 sips 縮放到 ${sizeFor(item)}。回報 OK 即可。`;
}

let ok = 0, skipped = 0, failed = 0;
const log = (m) => { console.log(m); appendFileSync(LOG, m + "\n"); };
appendFileSync(LOG, `\n=== run ${items.length} items ===\n`);

let idx = 0;
for (const item of items) {
  idx++;
  const dir = path.join(OUT_BASE, item.cat);
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${item.id}.png`);

  if (existsSync(out)) { log(`⏭  [${idx}/${items.length}] ${item.id} (exists)`); skipped++; continue; }

  const t0 = Date.now();
  log(`▶ [${idx}/${items.length}] ${item.id} (${sizeFor(item)})`);
  try {
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(buildPrompt(item))}`,
      { stdio: ["ignore", "ignore", "ignore"], timeout: 420_000 });
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    if (existsSync(out)) { log(`✓ [${idx}/${items.length}] ${item.id} ${dt}s`); ok++; }
    else { log(`✗ [${idx}/${items.length}] ${item.id} ${dt}s (no file)`); failed++; }
  } catch (e) {
    log(`✗ [${idx}/${items.length}] ${item.id} ${String(e.message).slice(0, 100)}`); failed++;
  }
}
log(`\n=== done. ok=${ok} skipped=${skipped} failed=${failed} ===`);
