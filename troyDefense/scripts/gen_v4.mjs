// v4 CoC 風格素材批量生成器：3 併發呼叫 codex exec image_gen，existsSync 跳過已完成
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(readFileSync(join(here, 'asset_manifest_v4.json'), 'utf8'));
const queue = M.items.filter(it => !existsSync(it.out));
console.log(`待生成 ${queue.length}/${M.items.length} 張`);

let active = 0, idx = 0, failed = [];
function pump() {
  while (active < 3 && idx < queue.length) {
    const it = queue[idx++]; active++;
    const prompt = `請用內建 image_gen 工具產一張 ${it.gen || '1024x1024'} PNG。主題：${M.style} ${it.prompt}。完成後把產出複製到絕對路徑 ${it.out} 並用 sips 縮放到 ${it.size}。回報 OK 即可。`;
    console.log(new Date().toISOString(), 'START', it.id);
    const p = spawn('codex', ['exec', '--skip-git-repo-check', prompt], { stdio: 'ignore' });
    p.on('exit', code => {
      const ok = existsSync(it.out);
      console.log(new Date().toISOString(), ok ? 'DONE' : 'FAIL', it.id, 'exit', code);
      if (!ok) failed.push(it.id);
      active--; pump();
      if (active === 0 && idx >= queue.length)
        console.log('ALL DONE. failed:', failed.length ? failed.join(',') : 'none');
    });
  }
}
pump();
if (!queue.length) console.log('ALL DONE. failed: none');
