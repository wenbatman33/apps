#!/usr/bin/env node
/**
 * Western Bar 素材生圖腳本
 *
 * 用法：
 *   export OPENAI_API_KEY=sk-...
 *   node scripts/generate.mjs                    # 全跑
 *   node scripts/generate.mjs A B C              # 只跑指定分類
 *   node scripts/generate.mjs --only B01 B02     # 指定 id
 *   node scripts/generate.mjs --resume           # 跳過已存在的檔
 *
 * 輸出：public/assets/<cat>/<id>.png
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "scripts/asset_manifest.json");
const OUT_BASE = path.join(ROOT, "public/assets");
const LOG = path.join(ROOT, "scripts/generate.log");

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.IMAGE_MODEL || "gpt-image-1";
const CONCURRENCY = Number(process.env.GEN_CONCURRENCY || 3);
const MAX_RETRIES = 3;

if (!API_KEY) {
  console.error("✗ 請先 export OPENAI_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const onlyIds = new Set();
const onlyCats = new Set();
let resume = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--resume") resume = true;
  else if (a === "--only") { while (args[i + 1] && !args[i + 1].startsWith("--")) onlyIds.add(args[++i]); }
  else if (/^[A-K]$/.test(a)) onlyCats.add(a);
}

const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf-8"));
const items = manifest.items.filter(it => {
  if (onlyIds.size && !onlyIds.has(it.id)) return false;
  if (onlyCats.size && !onlyCats.has(it.cat)) return false;
  return true;
});

console.log(`▶ 將生成 ${items.length} 張（共 ${manifest.items.length} 張）`);
console.log(`  輸出位置：${OUT_BASE}`);
console.log(`  模型：${MODEL}    併發：${CONCURRENCY}`);

await fs.mkdir(OUT_BASE, { recursive: true });
await fs.writeFile(LOG, `# generate.log  ${new Date().toISOString()}\n`, { flag: "a" });

function buildPrompt(item) {
  const baseline =
    item.cat === "A" || item.id === "K01_opening_visual"
      ? manifest.style_baseline_background
      : item.cat === "J"
      ? manifest.style_baseline_ui
      : manifest.style_baseline_character;
  return `${baseline}. Subject: ${item.prompt}.`;
}

function sizeOf(item) {
  return item.size === "bg" ? "1536x1024" : "1024x1024";
}

async function callOnce(item) {
  const body = {
    model: MODEL,
    prompt: buildPrompt(item),
    size: sizeOf(item),
    n: 1,
    // gpt-image-1：以下參數可選；維持預設讓相容性最佳
    // quality: "high",
    // background: item.cat === "A" || item.id === "K01_opening_visual" ? "opaque" : "transparent"
  };
  // 角色/物品/UI 嘗試請求透明背景（gpt-image-1 支援）
  if (item.cat !== "A" && item.id !== "K01_opening_visual") {
    body.background = "transparent";
  }
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}  ${txt.slice(0, 400)}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  const url = json.data?.[0]?.url;
  if (b64) return Buffer.from(b64, "base64");
  if (url) {
    const r2 = await fetch(url);
    return Buffer.from(await r2.arrayBuffer());
  }
  throw new Error("沒有回傳 b64_json 或 url：" + JSON.stringify(json).slice(0, 200));
}

async function withRetry(item) {
  let lastErr;
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try { return await callOnce(item); }
    catch (e) {
      lastErr = e;
      console.warn(`  ⚠ ${item.id} 第 ${i} 次失敗：${e.message}`);
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
  throw lastErr;
}

async function processOne(item) {
  const dir = path.join(OUT_BASE, item.cat);
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${item.id}.png`);

  if (resume) {
    try { await fs.access(out); console.log(`  ⏭  ${item.id}（已存在，跳過）`); return; }
    catch {}
  }

  const t0 = Date.now();
  console.log(`  ▶ ${item.id}`);
  try {
    const buf = await withRetry(item);
    await fs.writeFile(out, buf);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ✓ ${item.id}  (${(buf.length / 1024).toFixed(0)}KB, ${dt}s)`);
    await fs.appendFile(LOG, `OK   ${item.id}  ${dt}s  ${buf.length}B\n`);
  } catch (e) {
    console.error(`  ✗ ${item.id}  最終失敗：${e.message}`);
    await fs.appendFile(LOG, `FAIL ${item.id}  ${e.message}\n`);
  }
}

// 簡易併發池
async function runPool(tasks, n) {
  const it = tasks[Symbol.iterator]();
  const workers = Array.from({ length: n }, async () => {
    for (const t of it) await processOne(t);
  });
  await Promise.all(workers);
}

const t0 = Date.now();
await runPool(items, CONCURRENCY);
const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n✓ 完成（${dt}s）。檢查 ${OUT_BASE}/ 與 ${LOG}`);
