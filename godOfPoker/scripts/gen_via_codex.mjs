#!/usr/bin/env node
/**
 * godOfPoker 人物頭像生圖（透過 codex exec 內建 image_gen 工具）
 * 用法：node scripts/gen_via_codex.mjs   # 全跑（skip 已存在）
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(__dirname, "asset_manifest.json"), "utf-8"));
const LOG = path.join(__dirname, "gen_via_codex.log");

// 極簡 flat 風格（本作美術基準）
const STYLE = "九十年代香港漫畫（港漫）風格：銳利硬朗的粗墨線條、賽璐璐高對比上色、戲劇性的塊面光影、人物五官俊朗誇張、髮型與服裝特徵鮮明放大、背景是簡化色塊的深綠賭場與金色燈光，帶少許網點與速度線質感。經典港漫封面人物半身構圖、人物置中。原創漫畫角色。無任何文字。";

const log = (m) => { console.log(m); appendFileSync(LOG, m + "\n"); };
appendFileSync(LOG, `\n=== ${new Date().toISOString()} run ${manifest.items.length} items ===\n`);

let ok = 0, skipped = 0, failed = 0;
let idx = 0;
for (const item of manifest.items) {
  idx++;
  const dir = path.join(ROOT, "assets", item.cat);
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${item.id}.png`);
  if (existsSync(out)) { log(`⏭  [${idx}/${manifest.items.length}] ${item.id} (exists)`); skipped++; continue; }

  const prompt = `請用內建 image_gen 工具產一張 ${item.size} PNG。\n\n主題：${item.prompt}。\n\n風格：${STYLE}\n\n完成後把產出複製到絕對路徑 ${out} 並用 sips 縮放到 ${item.size}（sips -z 1024 1024）。回報 OK 即可。`;

  log(`🎨 [${idx}/${manifest.items.length}] ${item.id} ...`);
  try {
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(prompt)}`, { stdio: "pipe", timeout: 900000 });
    if (existsSync(out)) { log(`✅ ${item.id}`); ok++; }
    else { log(`❌ ${item.id} — codex 完成但檔案不存在`); failed++; }
  } catch (e) {
    log(`❌ ${item.id} — ${e.message.slice(0, 200)}`);
    failed++;
  }
}
log(`\n完成：ok=${ok} skipped=${skipped} failed=${failed}`);
