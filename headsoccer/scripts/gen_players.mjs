import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// 每日戰報風格：3D Pixar 渲染、Q 版大頭、油亮立體、表情有戲、透明背景、面朝右、全身就位姿勢
const STYLE = "3D Pixar-style chibi caricature soccer player, HUGE round head tiny body, glossy 3D rendered, vibrant studio lighting, big expressive eyes, confident face, full body standing ready pose facing RIGHT, dynamic, clean transparent background PNG, centered, game character sprite";

const players = [
  { id:'messi',      desc:"light short beard, brown wavy hair, Argentina light-blue and white striped jersey number 10" },
  { id:'ronaldo',    desc:"sharp slicked dark hair, clean shaven, Portugal red jersey, muscular, smug grin" },
  { id:'neymar',     desc:"modern fade haircut with short top, Brazil bright yellow jersey, cheeky smile" },
  { id:'mbappe',     desc:"short black hair, young face, France dark-blue jersey, fast runner pose" },
  { id:'haaland',    desc:"long blonde hair tied in a bun, fierce viking look, Norway/Manchester sky-blue jersey" },
  { id:'ronaldinho', desc:"long curly hair, big toothy buck-tooth happy grin, Brazil yellow jersey, joyful" },
  { id:'zidane',     desc:"bald shaved head, calm serious face, France white jersey number 10, elegant" },
  { id:'maradona',   desc:"dark curly mullet hair, stocky, Argentina blue jersey number 10, passionate face" },
];

for(const p of players){
  const out = `/Users/batman_work/claude/apps/headsoccer/assets/players/${p.id}.png`;
  if(existsSync(out)){ console.log('skip', p.id); continue; }
  console.log('GEN', p.id, '...');
  const prompt = `${STYLE}. Character: a famous footballer caricature with ${p.desc}.`;
  try{
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(`請用內建 image_gen 工具產一張 PNG。主題：${prompt}。透明背景。完成後把產出複製到絕對路徑 ${out} 並用 sips 縮放到 512x512。回報 OK 即可。`)}`, {stdio:'inherit'});
  }catch(e){ console.log('FAIL', p.id, e.message); }
}
console.log('ALL PLAYERS DONE');
