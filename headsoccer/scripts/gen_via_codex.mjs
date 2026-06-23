import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const items = [
  { id:'ball', size:'512x512', prompt:'a cute cartoon soccer ball, classic black-and-white pentagon pattern, glossy, bold clean outline, centered, transparent background PNG, no shadow, vibrant flat shading' },
  { id:'player1', size:'512x512', prompt:'a cute chibi cartoon soccer player character with a big round head and tiny body, wearing a BLUE jersey, happy smiling face, facing right, big head soccer game style, bold outline, centered, transparent background PNG, full body, flat vibrant colors' },
  { id:'player2', size:'512x512', prompt:'a cute chibi cartoon soccer player character with a big round head and tiny body, wearing a RED jersey, confident grin, facing left, big head soccer game style, bold outline, centered, transparent background PNG, full body, flat vibrant colors' },
  { id:'bg', size:'1280x720', prompt:'a bright cartoon soccer stadium background, blue sky with fluffy clouds, green grandstands with cheering crowd silhouettes, no field lines, no players, flat vibrant cartoon style, wide 16:9' },
];
for(const it of items){
  const out = `/Users/batman_work/claude/apps/headsoccer/assets/${it.id}.png`;
  if(existsSync(out)){ console.log('skip', it.id); continue; }
  console.log('GEN', it.id, '...');
  try{
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(`請用內建 image_gen 工具產一張 PNG。主題：${it.prompt}。完成後把產出複製到絕對路徑 ${out} 並用 sips 縮放到 ${it.size}。回報 OK 即可。`)}`, {stdio:'inherit'});
  }catch(e){ console.log('FAIL', it.id, e.message); }
}
console.log('ALL DONE');
