#!/usr/bin/env node
// 透過 codex exec 內建 image_gen 工具批次產出球員圖
// 參考: ~/.claude/CLAUDE.md AI 生圖準則 (2026-05-23)

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const manifestPath = join(__dirname, 'asset_manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const outDir = resolve(projectRoot, manifest.outDir);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

console.log(`[gen] 輸出目錄: ${outDir}`);
console.log(`[gen] 共 ${manifest.items.length} 張，跳過已存在的`);

let done = 0, skipped = 0, failed = 0;
const startAll = Date.now();

for (const item of manifest.items) {
  const outPath = join(outDir, item.file);
  if (existsSync(outPath)) {
    console.log(`[skip] ${item.id} 已存在`);
    skipped++;
    continue;
  }
  console.log(`\n[gen] ${item.id} → ${outPath}`);
  const start = Date.now();

  const instruction = `請用內建 image_gen 工具產一張 ${item.size} PNG。
主題：${item.prompt}
完成後把產出複製到絕對路徑 ${outPath}，並用 sips 縮放到 ${item.finalSize}（指令: sips -z ${item.finalSize.split('x')[1]} ${item.finalSize.split('x')[0]} ${outPath}）。
最後回報 OK 即可，不要額外說明。`;

  const r = spawnSync('codex', ['exec', '--skip-git-repo-check', instruction], {
    stdio: 'inherit',
    timeout: 5 * 60 * 1000,
  });

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  if (r.status === 0 && existsSync(outPath)) {
    console.log(`[ok]   ${item.id}  (${secs}s)`);
    done++;
  } else {
    console.error(`[fail] ${item.id}  (status=${r.status}, ${secs}s)`);
    failed++;
  }
}

const totalSecs = ((Date.now() - startAll) / 1000).toFixed(1);
console.log(`\n[done] 完成 ${done} / 跳過 ${skipped} / 失敗 ${failed}（共 ${totalSecs}s）`);
process.exit(failed > 0 ? 1 : 0);
