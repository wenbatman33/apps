#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(__dirname, 'asset_manifest_white.json'), 'utf8'));

for (const item of manifest.items) {
  const out = resolve(ROOT, item.file);
  const [w, h] = item.size.split('x');
  const prompt = `${item.prompt}\n\n${manifest.style}\n\n完成後請將輸出 PNG 複製到絕對路徑：${out}\n並用 sips 縮放到 ${w}x${h}。完成後只回報 "OK ${item.id}"。`;
  console.log(`[gen] ${item.id}`);
  try {
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(prompt)}`, { stdio: 'inherit', timeout: 5 * 60 * 1000 });
  } catch (e) { console.error(`[fail] ${item.id}: ${e.message}`); }
}
