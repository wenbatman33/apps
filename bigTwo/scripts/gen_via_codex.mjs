#!/usr/bin/env node
/**
 * 大老二素材生圖（透過 codex exec 內建 image_gen 工具，免 API key）
 * 扁平卡通風格：標題 Logo + 3 位電腦對手頭像
 *
 * 用法：
 *   node scripts/gen_via_codex.mjs            # 全跑（skip 已存在）
 *   node scripts/gen_via_codex.mjs --only title
 *   node scripts/gen_via_codex.mjs --force    # 強制重生
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets");
const LOG = path.join(ROOT, "scripts/gen.log");
mkdirSync(OUT, { recursive: true });

// 統一美術基準：扁平卡通、鮮明飽和、乾淨線條、透明背景，配深色 UI
const STYLE =
  "flat cartoon vector illustration style, bold clean outlines, bright saturated colors, " +
  "cute and playful, friendly, simple flat shapes with subtle flat shading (NOT 3D, NOT realistic, NOT gradient-heavy), " +
  "modern mobile game art, centered composition, TRANSPARENT background PNG (no background, no drop shadow on background)";

// 主題綠 #4ade80 作為點綴色，避免整體太暗（要能襯在深色底上）
const ITEMS = [
  {
    id: "title",
    size: "1024x1024",
    prompt:
      `A fun logo illustration for a Chinese poker card game called "大老二" (Big Two). ` +
      `Show three playful playing cards (a red heart, a black spade, and the "2" card) fanned out and bursting with energy, ` +
      `with bold rounded chunky Chinese characters "大老二" as the centerpiece. ` +
      `Energetic, casual, "play anytime anywhere" vibe with small motion sparks/confetti. ` +
      `Mint green (#4ade80) and warm accent colors, cheerful. ${STYLE}`
  },
  {
    id: "avatar_a",
    size: "1024x1024",
    prompt:
      `A cute cartoon cat character wearing cool sunglasses, confident smug grin, upper-body bust portrait facing forward, ` +
      `a "cool gambler" personality. Bright fur, expressive, fits nicely inside a circle crop. ${STYLE}`
  },
  {
    id: "avatar_b",
    size: "1024x1024",
    prompt:
      `A cute cartoon panda character, friendly calm gentle smile, upper-body bust portrait facing forward, ` +
      `a "steady easygoing" personality. Soft and rounded, expressive eyes, fits nicely inside a circle crop. ${STYLE}`
  },
  {
    id: "avatar_c",
    size: "1024x1024",
    prompt:
      `A cute cartoon fox character, sly clever wink, mischievous grin, upper-body bust portrait facing forward, ` +
      `a "tricky cunning" personality. Orange fur, sharp playful eyes, fits nicely inside a circle crop. ${STYLE}`
  }
];

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const onlyIdx = argv.indexOf("--only");
const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  appendFileSync(LOG, line);
}

for (const item of ITEMS) {
  if (only && item.id !== only) continue;
  const outPath = path.join(OUT, `${item.id}.png`);
  if (existsSync(outPath) && !force) { log(`skip ${item.id}（已存在）`); continue; }

  const instruction =
    `請用內建 image_gen 工具產生一張圖。主題：${item.prompt}\n` +
    `完成後把產出複製到絕對路徑 ${outPath}，並用 sips 縮放到 ${item.size}。回報 OK 即可。`;

  log(`生成 ${item.id} ...`);
  const t0 = Date.now();
  const r = spawnSync("codex", ["exec", "--skip-git-repo-check", instruction], {
    stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8", timeout: 5 * 60 * 1000
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(0);
  if (r.status === 0 && existsSync(outPath)) log(`OK ${item.id}（${dt}s）`);
  else log(`FAIL ${item.id}（${dt}s）status=${r.status} ${(r.stderr || "").slice(-300)}`);
}

log("全部完成");
