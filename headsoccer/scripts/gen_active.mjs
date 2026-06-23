import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const STYLE = "3D Pixar-style chibi caricature soccer player, HUGE round head tiny body, glossy 3D rendered, vibrant studio lighting, big expressive eyes, confident face, full body standing ready pose facing RIGHT, the character should be LARGE and FILL most of the frame, centered, clean fully transparent alpha background (do NOT draw a checkerboard), game character sprite. IMPORTANT: NO soccer ball anywhere, NOT touching or kicking any ball, empty feet, hands free";
const players = [
  { id:'vinicius',   desc:"young Brazilian winger Vinicius Junior, short curly afro hair with a small top, bright Brazil yellow jersey, cheeky energetic smile" },
  { id:'bellingham', desc:"young English midfielder Jude Bellingham, short brown hair, white England/Real Madrid jersey, determined confident face, arms-spread celebration vibe" },
  { id:'salah',      desc:"Egyptian forward Mohamed Salah, big curly black hair and full beard, Liverpool red jersey, warm smile" },
];
for(const p of players){
  const out = `/Users/batman_work/claude/apps/headsoccer/assets/players/${p.id}.png`;
  if(existsSync(out)){ console.log('skip', p.id); continue; }
  console.log('GEN', p.id, '...');
  const prompt = `${STYLE}. Character: a famous ACTIVE footballer caricature — ${p.desc}.`;
  try{
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(`請用內建 image_gen 工具產一張 1024x1024 PNG，真正透明 alpha 背景。主題：${prompt}。完成後把產出複製到絕對路徑 ${out} 並用 sips 縮放到 512x512。回報 OK 即可。`)}`, {stdio:'inherit'});
  }catch(e){ console.log('FAIL', p.id, e.message); }
}
console.log('ALL ACTIVE DONE');
