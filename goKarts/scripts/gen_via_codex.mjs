// 批次生圖：對 manifest 每個 item 呼叫一次 codex exec（內建 image_gen），已存在則跳過
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/asset_manifest.json'), 'utf8'));
const outDir = resolve(root, manifest.outDir);
mkdirSync(outDir, { recursive: true });

for (const item of manifest.items) {
  const out = resolve(outDir, `${item.id}.png`);
  if (existsSync(out)) { console.log(`[skip] ${item.id}`); continue; }
  const prompt = `請用內建 image_gen 工具產生一張圖片。主題：${item.prompt}. Style: ${manifest.style}. ` +
    `完成後把產出複製到絕對路徑 ${out} 並用 sips 把它縮放成 ${item.w}x${item.h}（sips -z ${item.h} ${item.w}）。回報 OK 即可。`;
  console.log(`[gen] ${item.id} ...`);
  try {
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(prompt)}`, { stdio: 'inherit', timeout: 300000 });
    console.log(existsSync(out) ? `[done] ${item.id}` : `[FAIL-missing] ${item.id}`);
  } catch (e) {
    console.log(`[FAIL] ${item.id}: ${e.message}`);
  }
}
console.log('ALL DONE');
