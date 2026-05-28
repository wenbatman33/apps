#!/usr/bin/env node
// 透過 codex exec 內建 image_gen 工具批次出圖
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(__dirname, 'asset_manifest.json'), 'utf8'));

console.log(`[gen] 共 ${manifest.items.length} 張，輸出到 ${ROOT}`);

for (const item of manifest.items) {
  const out = resolve(ROOT, item.file);
  if (existsSync(out)) { console.log(`[skip] ${item.id} 已存在`); continue; }

  const [w, h] = item.size.split('x');
  const prompt = `${item.prompt}\n\n${manifest.style}\n\n完成後請將輸出 PNG 複製到絕對路徑：${out}\n並用 sips 縮放到 ${w}x${h}。完成後只回報 "OK ${item.id}"。`;

  console.log(`[gen] ${item.id} -> ${out}`);
  try {
    const cmd = `codex exec --skip-git-repo-check ${JSON.stringify(prompt)}`;
    execSync(cmd, { stdio: 'inherit', timeout: 5 * 60 * 1000 });
    console.log(`[done] ${item.id}`);
  } catch (e) {
    console.error(`[fail] ${item.id}: ${e.message}`);
  }
}
console.log('[gen] 全部完成');
