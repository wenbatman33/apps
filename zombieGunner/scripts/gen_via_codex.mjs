#!/usr/bin/env node
/**
 * 屍潮槍手 素材生圖（透過 codex exec 內建 image_gen 工具）
 *
 * 用法：
 *   node scripts/gen_via_codex.mjs                 # 全跑（跳過已存在）
 *   node scripts/gen_via_codex.mjs S               # 只跑分類 S
 *   node scripts/gen_via_codex.mjs --only sk_atk   # 只跑指定 id
 *   node scripts/gen_via_codex.mjs --jobs 3        # 並行數（預設 3）
 *   node scripts/gen_via_codex.mjs --force         # 已存在也重生
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "scripts/asset_manifest.json");
const OUT_BASE = path.join(ROOT, "assets");
const LOG = path.join(ROOT, "scripts/gen.log");

const manifest = JSON.parse(readFileSync(MANIFEST, "utf-8"));
const argv = process.argv.slice(2);
const onlyIds = new Set();
const onlyCats = new Set();
let JOBS = 3;
let FORCE = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--only") { while (argv[i + 1] && !argv[i + 1].startsWith("--")) onlyIds.add(argv[++i]); }
  else if (a === "--jobs") JOBS = parseInt(argv[++i], 10) || 3;
  else if (a === "--force") FORCE = true;
  else if (/^[A-Z]$/.test(a)) onlyCats.add(a);
}

const CAT_DIR = { S: "icons", P: "player", Z: "zombies", O: "props" };

function outPath(item) {
  return path.join(OUT_BASE, CAT_DIR[item.cat] || "misc", `${item.id}.png`);
}

function outSize(item) {
  if (item.cat === "S") return manifest.icon_out_size || "256x256";
  if (item.cat === "O") return "256x256";
  return manifest.sprite_out_size || "256x256";
}

function buildPrompt(item) {
  const style = item.cat === "S" ? manifest.style_icon
    : item.cat === "O" ? manifest.style_obstacle : manifest.style_topdown;
  const out = outPath(item);
  const [w, h] = outSize(item).split("x");
  return [
    "請用你內建的 image_gen 工具產生一張 1024x1024 PNG 圖。",
    "",
    `**主題**：${item.prompt}`,
    "",
    `**風格要求（務必嚴格遵守）**：${style}`,
    "",
    "**絕對禁止**：任何文字、字母、數字、浮水印、邊框、方形底板、地面陰影、寫實照片風。",
    "",
    `完成後把產出的圖複製到絕對路徑 ${out}，並用 sips 縮放到 ${w}x${h}（指令：sips -z ${h} ${w} "${out}"）。`,
    "確認檔案存在後回報 OK 即可，不要輸出其他說明。",
  ].join("\n");
}

const items = manifest.items.filter((it) => {
  if (onlyIds.size && !onlyIds.has(it.id)) return false;
  if (onlyCats.size && !onlyCats.has(it.cat)) return false;
  if (!FORCE && existsSync(outPath(it))) return false;
  return true;
});

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG, line + "\n"); } catch (e) {}
}

function runOne(item) {
  return new Promise((resolve) => {
    const dir = path.dirname(outPath(item));
    mkdirSync(dir, { recursive: true });
    const t0 = Date.now();
    log(`▶ 開始 ${item.id}`);
    const p = spawn("codex", ["exec", "--skip-git-repo-check", buildPrompt(item)], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let tail = "";
    p.stdout.on("data", (d) => { tail = (tail + d.toString()).slice(-500); });
    p.stderr.on("data", (d) => { tail = (tail + d.toString()).slice(-500); });
    p.on("close", (code) => {
      const sec = ((Date.now() - t0) / 1000).toFixed(0);
      const ok = existsSync(outPath(item));
      const size = ok ? statSync(outPath(item)).size : 0;
      log(`${ok ? "✅" : "❌"} ${item.id}  (${sec}s, exit=${code}, ${size}B)`);
      if (!ok) log(`   ↳ tail: ${tail.replace(/\n/g, " ").slice(-260)}`);
      resolve(ok);
    });
  });
}

(async () => {
  log(`=== 開始生成 ${items.length} 張（並行 ${JOBS}）===`);
  let idx = 0, done = 0, ok = 0;
  async function worker() {
    while (idx < items.length) {
      const it = items[idx++];
      const r = await runOne(it);
      done++; if (r) ok++;
      log(`   進度 ${done}/${items.length}（成功 ${ok}）`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, items.length) }, worker));
  log(`=== 完成：成功 ${ok} / ${items.length} ===`);
})();
