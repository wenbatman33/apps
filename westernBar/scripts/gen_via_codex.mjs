#!/usr/bin/env node
/**
 * Western Bar 素材生圖（透過 codex exec 內建 image_gen 工具）
 *
 * v2 升級：
 *   - 背景類 (cat A、K01) 用 --image 餵原作參考圖確保構圖一致
 *   - 其他角色/物品/UI 用 Pixar 3D Q版 chibi 風格 prompt
 *
 * 用法：
 *   node scripts/gen_via_codex.mjs                 # 全跑（skip 已存在）
 *   node scripts/gen_via_codex.mjs A B C           # 只跑指定分類
 *   node scripts/gen_via_codex.mjs --only B05_player_hit
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "scripts/asset_manifest.json");
const OUT_BASE = path.join(ROOT, "public/assets");
const LOG = path.join(ROOT, "scripts/gen_via_codex.log");
const REF_EMPTY_SCENE = path.join(ROOT, "analysis/reference/empty_scene.png");

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

// === Pixar 3D Q 版 chibi 風格定義（鎖定為本作美術基準） ===
const PIXAR_STYLE = "Pixar / Disney / Mario Odyssey 3D Q版 chibi 卡通可愛風，3D 渲染（不是 2D 插畫），軟陰影、subsurface scattering 質感、明亮飽和色彩、圓潤無稜角、Q 版大頭比例（頭佔身體 1/2），物件鮮活有生命感";

// 場景元素一致性指令（給背景類使用）
const SCENE_LAYOUT = `視角：45° 俯視（looking into the saloon from front-left），門在左側牆面（從前景延伸到後牆角落的側牆上，不是後牆上方）。後牆中央：WANTED \$25,000 海報、SALOON 招牌、酒瓶架。最右上：酒保站在吧台後。中段：圓桌 + 椅子 + 木桶。下方：木板地板透視。風格為 ${PIXAR_STYLE}。`;

function sizeFor(item) { return item.size === "bg" ? "1536x1024" : "1024x1024"; }

function buildPromptForBackground(item) {
  return `請用 image_gen 工具，**完整保留**附加參考圖的構圖、視角與所有元素位置。${SCENE_LAYOUT}\n\n本張為：**${item.prompt}**\n\n產出 ${sizeFor(item)} PNG，複製到 /Users/batman_work/claude/apps/westernBar/public/assets/${item.cat}/${item.id}.png 並 sips 縮放到 ${sizeFor(item)}。`;
}

function buildPromptForSprite(item) {
  let extra = "";
  if (item.cat === "B") extra = "**警長角色**：瘦削身材、大八字鬍、米色 cowboy hat、紅格紋衫 + 棕色背心、警長星徽、藍色牛仔褲、棕色靴子、槍套。中年成熟感從鬍子與表情傳達不靠肥胖。";
  if (item.cat === "E") extra = "**通緝犯角色**：戴黑色寬邊帽、紅色 bandana 蓋下半臉、髒兮兮灰襯衫 + 棕色皮背心、子彈帶 + 槍套、Q 版兇狠表情。";
  if (item.cat === "C") extra = "**酒保角色**：友善大叔、白髮 / 灰白八字鬍、白襯衫 + 棕色背心 + 領結、白圍裙。";
  if (item.cat === "D") extra = "**夫婦角色**：男（中年八字鬍、格紋衫吊帶褲）、女（包頭髮型、洋裝），坐在桌邊。";

  return `請用 image_gen 工具產一張 ${sizeFor(item)} PNG。\n\n主題：**${item.prompt}**。${extra}\n\n風格：${PIXAR_STYLE}。**透明背景**（用 chroma-key 產生再去背輸出 RGBA PNG）。單一主體置中、無底色、無陰影、無多餘文字。\n\n完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/${item.cat}/${item.id}.png 並 sips 縮放到 ${sizeFor(item)}。`;
}

function buildPromptForUI(item) {
  return `請用 image_gen 工具產一張 ${sizeFor(item)} PNG。\n\n主題：**${item.prompt}**。\n\n風格：西部告示牌 / 木雕 / 復古海報質感，配合 ${PIXAR_STYLE} 整體調性。透明背景 PNG（無底色）。\n\n完成後複製到 /Users/batman_work/claude/apps/westernBar/public/assets/${item.cat}/${item.id}.png 並 sips 縮放到 ${sizeFor(item)}。`;
}

let ok = 0, skipped = 0, failed = 0;
const log = (msg) => { console.log(msg); appendFileSync(LOG, msg + "\n"); };
appendFileSync(LOG, `\n=== ${new Date().toISOString()} v2 run ${items.length} items (Pixar 3D) ===\n`);

let idx = 0;
for (const item of items) {
  idx++;
  const dir = path.join(OUT_BASE, item.cat);
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${item.id}.png`);

  if (existsSync(out)) {
    log(`⏭  [${idx}/${items.length}] ${item.id} (exists)`);
    skipped++;
    continue;
  }

  const isBackground = item.cat === "A" || item.id === "K01_opening_visual";
  const isUI = item.cat === "K" && !isBackground;

  let promptText;
  let useImageRef = false;
  if (isBackground) {
    promptText = buildPromptForBackground(item);
    useImageRef = true;
  } else if (isUI) {
    promptText = buildPromptForUI(item);
  } else {
    promptText = buildPromptForSprite(item);
  }

  const t0 = Date.now();
  log(`▶ [${idx}/${items.length}] ${item.id}  (${sizeFor(item)})${useImageRef ? " +ref" : ""}`);

  try {
    if (useImageRef) {
      // echo prompt | codex exec --image ref.png
      execSync(
        `echo ${JSON.stringify(promptText)} | codex exec --skip-git-repo-check --image ${JSON.stringify(REF_EMPTY_SCENE)}`,
        { stdio: ["pipe", "ignore", "ignore"], timeout: 300_000 }
      );
    } else {
      execSync(
        `codex exec --skip-git-repo-check ${JSON.stringify(promptText)}`,
        { stdio: ["ignore", "ignore", "ignore"], timeout: 300_000 }
      );
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    if (existsSync(out)) {
      log(`✓ [${idx}/${items.length}] ${item.id}  ${dt}s`);
      ok++;
    } else {
      log(`✗ [${idx}/${items.length}] ${item.id}  ${dt}s  (no file)`);
      failed++;
    }
  } catch (e) {
    log(`✗ [${idx}/${items.length}] ${item.id}  ${e.message.slice(0, 100)}`);
    failed++;
  }
}

log(`\n=== done. ok=${ok} skipped=${skipped} failed=${failed} ===`);
