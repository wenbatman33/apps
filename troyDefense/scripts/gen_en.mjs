#!/usr/bin/env node
/* 極簡英文 prompt 生圖：背景規則放第一行，是唯一能讓 AI 真的給純色底的寫法 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const items = JSON.parse(readFileSync(path.join(ROOT, "scripts/asset_manifest_en.json"), "utf-8")).items;
const WORKERS = parseInt(process.argv[2] || "5", 10);
const LOG = path.join(ROOT, "scripts/gen_en.log");
const log = (m) => { console.log(m); appendFileSync(LOG, m + "\n"); };

function prompt(it) {
  const sheet = it.size === "sheet";
  const size = sheet ? "1536x1024" : "1024x1024";
  const out = `${ROOT}/public/assets/${it.cat}/${it.id}.png`;
  const camera = sheet
    ? `CAMERA: top-down 3/4 game view, camera ~45 degrees above. You see the TOP of the head/helmet and the TOP of the shoulders; legs look short from the downward perspective. Character faces toward the bottom of the frame.

SHEET LAYOUT: Split the image into 4 EQUAL COLUMNS. Each column is one walk-cycle frame of the SAME character: (1) left leg forward, (2) legs passing, body highest, (3) right leg forward, (4) legs passing again. Body, outfit, colors, size and camera angle must be IDENTICAL in all 4 frames - only the limbs and body height change. Center each frame, evenly spaced, no overlap.`
    : `CAMERA: top-down 3/4 game view, camera ~45 degrees above. You see the TOP of the head/helmet and the TOP of the shoulders; legs look short from the downward perspective.`;

  return `Use image_gen to make a ${size} PNG game sprite.

BACKGROUND RULE (most important): The entire background must be ONE FLAT SOLID MAGENTA COLOR #FF00FF.
Absolutely NO scenery, NO ground, NO sky, NO castle, NO clouds, NO environment of any kind.
Just the character isolated on flat magenta, like a cut-out sprite asset. Do not draw a drop shadow.

SUBJECT: ${it.en}${it.big ? " . Make it a HUGE unit, clearly twice the bulk of a normal soldier." : ""}

${camera}

STYLE: Clash Royale 3D cartoon rendering, chunky exaggerated proportions, strong directional light, saturated colors, very readable silhouette.

Then copy the result to ${out} and sips it to ${size}. Reply OK.`;
}

let done = 0, failed = 0, cursor = 0;
const todo = items.filter(it => { mkdirSync(path.join(ROOT, "public/assets", it.cat), { recursive: true }); return true; });
log(`\n=== 英文極簡 prompt：${todo.length} 張，${WORKERS} workers ===`);
function runOne(it) {
  return new Promise((res) => {
    const t0 = Date.now();
    const p = spawn("codex", ["exec", "--skip-git-repo-check", prompt(it)], { stdio: ["ignore","ignore","ignore"] });
    const timer = setTimeout(() => { try { p.kill("SIGKILL"); } catch (e) {} }, 420000);
    p.on("close", () => {
      clearTimeout(timer);
      const ok = existsSync(path.join(ROOT, "public/assets", it.cat, `${it.id}.png`));
      ok ? done++ : failed++;
      log(`${ok ? "✓" : "✗"} ${it.id} ${((Date.now()-t0)/1000).toFixed(0)}s (${done+failed}/${todo.length})`);
      res();
    });
  });
}
async function worker() { while (cursor < todo.length) await runOne(todo[cursor++]); }
await Promise.all(Array.from({ length: WORKERS }, worker));
log(`\n=== 完成：成功 ${done}，失敗 ${failed} ===`);
