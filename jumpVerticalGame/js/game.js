// Jump Up! 垂直跳躍主程式
(function(){
'use strict';

// ============ 基本設定 ============
const W = 360, H = 640;              // 邏輯畫布解析度
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

const GRAVITY = 0.38;
const JUMP_VY = -13.5;
const SPRING_VY = -20;
const MOVE_SPEED = 5.2;
const MAX_LIVES = 3;
const FALL_MARGIN = 120;             // 掉出畫面下緣多少距離才算死
const PLATFORM_GAP_MIN = 62;
const PLATFORM_GAP_MAX = 110;
const PLATFORM_W = 72, PLATFORM_H = 18;

// ============ 資源載入 ============
const IMG = {};
const toLoad = {
  bgSky:     'assets/Background/01/Layer1.png',
  bgFar:     'assets/Background/01/Layer2.png',
  bgNear:    'assets/Background/01/Layer3.png',
  idle:      'assets/Characters/01/Idle.png',
  jump:      'assets/Characters/01/Jump.png',
  die:       'assets/Characters/01/Die.png',
  plat:      'assets/OtherAssets/Platformer1.png',
  platBreak: 'assets/OtherAssets/Platformer4.png',
  platMove:  'assets/OtherAssets/Platformer2.png',
  platSpring:'assets/OtherAssets/Platformer3.png',
  obstacle:  'assets/OtherAssets/obstacle.png',
  coin1:'assets/Coins/1.png', coin2:'assets/Coins/2.png', coin3:'assets/Coins/3.png',
  coin4:'assets/Coins/4.png', coin5:'assets/Coins/5.png', coin6:'assets/Coins/6.png',
  bat1:'assets/Enemies/Bat/1.png', bat2:'assets/Enemies/Bat/2.png',
  bat3:'assets/Enemies/Bat/3.png', bat4:'assets/Enemies/Bat/4.png',
  life: 'assets/Life/1.png',
};

function loadAll(){
  const keys = Object.keys(toLoad);
  return Promise.all(keys.map(k => new Promise(res=>{
    const im = new Image();
    im.onload = ()=>{ IMG[k] = im; res(); };
    im.onerror = ()=>{ IMG[k] = null; res(); };
    im.src = toLoad[k];
  })));
}

// ============ 遊戲狀態 ============
const STATE = { MENU:'menu', PLAY:'play', PAUSE:'pause', OVER:'over' };
let state = STATE.MENU;
let lastTime = 0;

const player = {
  x: W/2, y: H - 200, vx: 0, vy: 0,
  w: 48, h: 56,
  facing: 1,
  alive: true,
  invuln: 0,
};

let platforms = [];
let coins = [];
let enemies = [];
let particles = [];

let camY = 0;        // 攝影機世界 Y 偏移（值越小代表攝影機越高）
let highestY = 0;    // 玩家達到的最高處（世界座標，向上為負）
let score = 0;
let best = parseInt(localStorage.getItem('jumpup.best')||'0',10) || 0;
let lives = MAX_LIVES;
let coinCount = 0;

let keys = { left:false, right:false };
let touchDir = 0;  // -1 / 0 / 1

// ============ 平台/金幣/敵人生成 ============
function rand(a,b){ return a + Math.random()*(b-a); }
// 分數越高間距越大（上限 140），讓跳躍更吃精準
function gapForScore(){
  const diff = Math.min(1, score / 600);
  const min = PLATFORM_GAP_MIN + diff * 20;       // 62 -> 82
  const max = PLATFORM_GAP_MAX + diff * 30;       // 110 -> 140
  return rand(min, max);
}

function spawnPlatform(y){
  // 難度係數 0(起步) -> 1(極難)
  const diff = Math.min(1, score / 600);
  const type = (()=>{
    const r = Math.random();
    if(score < 80) return 'normal';
    // 普通平台佔比隨難度遞減
    if(r < 0.72 - diff*0.32) return 'normal';
    if(r < 0.85 - diff*0.20) return 'move';
    if(r < 0.95 - diff*0.05) return 'break';
    return 'spring';
  })();
  // 移動平台速度隨難度提升
  const moveSpeed = rand(1.2, 2.5) + diff*1.8;
  const p = {
    x: rand(20, W - PLATFORM_W - 20),
    y, w: PLATFORM_W, h: PLATFORM_H,
    type,
    vx: type==='move' ? (Math.random()<.5?-1:1)*moveSpeed : 0,
    broken: false,
    hasSpring: type === 'spring',
  };
  platforms.push(p);

  // 有機率在平台上放金幣
  if(Math.random() < 0.22){
    coins.push({ x: p.x + p.w/2 - 14, y: p.y - 32, w:28, h:28, frame:Math.random()*6, taken:false });
  }
  // 敵人：從 100m 開始出現、機率隨難度攀升最高到 22%
  if(score > 100){
    const enemyChance = 0.05 + diff * 0.17;
    if(Math.random() < enemyChance){
      // 一半機率生在平台上（會左右巡邏），一半機率生在平台上方飛行段（較快）
      const flying = Math.random() < 0.5;
      enemies.push({
        x: flying ? rand(20, W-64) : p.x + p.w/2 - 22,
        y: p.y - (flying ? rand(70, 130) : 50),
        w:44, h:34,
        vx: (Math.random()<.5?-1:1) * (flying ? rand(1.4, 2.6) : rand(0.8, 1.8)),
        frame: 0, type:'bat',
      });
    }
  }
}

function initWorld(){
  platforms = []; coins = []; enemies = []; particles = [];
  camY = 0; highestY = 0; score = 0; coinCount = 0;
  lives = MAX_LIVES;
  player.x = W/2; player.y = H - 140;
  player.vx = 0; player.vy = JUMP_VY;
  player.alive = true; player.invuln = 0; player.facing = 1;

  // 起始大平台（作為地面）
  platforms.push({ x: 0, y: H - 60, w: W, h: 20, type:'ground', vx:0 });
  // 先往上填一堆平台
  let y = H - 140;
  while(y > -800){
    y -= gapForScore();
    spawnPlatform(y);
  }
}

// ============ 物理 / 更新 ============
function update(dt){
  // 輸入
  const dir = (keys.left ? -1:0) + (keys.right ? 1:0) + touchDir;
  player.vx = Math.sign(dir) * MOVE_SPEED;
  if(dir !== 0) player.facing = Math.sign(dir);

  // 重力
  player.vy += GRAVITY;
  if(player.vy > 18) player.vy = 18;
  player.x += player.vx;
  player.y += player.vy;

  // 左右穿牆
  if(player.x < -player.w/2) player.x = W + player.w/2;
  if(player.x > W + player.w/2) player.x = -player.w/2;

  // 更新平台
  for(const p of platforms){
    if(p.vx){
      p.x += p.vx;
      if(p.x < 10 || p.x + p.w > W - 10) p.vx *= -1;
    }
  }

  // 下落時檢查踩平台
  if(player.vy > 0){
    for(const p of platforms){
      if(p.broken) continue;
      const feetPrev = player.y + player.h/2 - player.vy;
      const feet = player.y + player.h/2;
      if(feetPrev <= p.y && feet >= p.y &&
         player.x + player.w*0.3 > p.x && player.x - player.w*0.3 < p.x + p.w){
        // 踩到
        if(p.type === 'spring'){
          player.vy = SPRING_VY;
          GameAudio.powerup();
        } else {
          player.vy = JUMP_VY;
          GameAudio.jump();
        }
        if(p.type === 'break'){
          p.broken = true;
          for(let i=0;i<6;i++) particles.push({x:p.x+p.w/2, y:p.y, vx:rand(-2,2), vy:rand(-3,-1), life:30, color:'#8a5a2b'});
        }
        break;
      }
    }
  }

  // 金幣
  for(const c of coins){
    if(c.taken) continue;
    c.frame = (c.frame + 0.2) % 6;
    if(rectOverlap(player.x-player.w/2, player.y-player.h/2, player.w, player.h, c.x, c.y, c.w, c.h)){
      c.taken = true; coinCount++; score += 10;
      GameAudio.coin();
      for(let i=0;i<8;i++) particles.push({x:c.x+14, y:c.y+14, vx:rand(-3,3), vy:rand(-4,-1), life:25, color:'#ffe27a'});
    }
  }

  // 敵人
  for(const e of enemies){
    e.x += e.vx;
    e.frame = (e.frame + 0.2) % 4;
    if(e.x < 0 || e.x + e.w > W) e.vx *= -1;
    if(player.invuln <= 0 && rectOverlap(player.x-player.w/2+6, player.y-player.h/2+6, player.w-12, player.h-12, e.x+4, e.y+4, e.w-8, e.h-8)){
      hurt();
    }
  }

  // 粒子
  for(const pt of particles){
    pt.x += pt.vx; pt.y += pt.vy;
    pt.vy += 0.2;
    pt.life--;
  }
  particles = particles.filter(p=>p.life>0);

  // 攝影機：當玩家超過畫面上半時推上去
  const screenY = player.y - camY;
  if(screenY < H * 0.42){
    const diff = H * 0.42 - screenY;
    camY -= diff;
    highestY = Math.min(highestY, player.y);
  }

  score = Math.max(score, Math.floor(-highestY / 10) + coinCount*10);

  // 補生平台（淘汰畫面下方的）
  platforms = platforms.filter(p => p.y < camY + H + 100 && !p.broken || (p.broken && p.y > camY - 50));
  platforms = platforms.filter(p => !(p.broken && player.y > p.y + 200));
  let topY = platforms.reduce((m,p)=> Math.min(m,p.y), H);
  while(topY > camY - 400){
    topY -= gapForScore();
    spawnPlatform(topY);
  }

  // 金幣 / 敵人清掉畫面下的
  coins = coins.filter(c => !c.taken && c.y < camY + H + 100);
  enemies = enemies.filter(e => e.y < camY + H + 100);

  // 掉下畫面 → 直接結束（不再救援）
  if(player.y > camY + H + FALL_MARGIN){
    lives = 0;
    gameOver();
    return;
  }

  if(player.invuln > 0) player.invuln -= dt;
}

function rectOverlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function hurt(){
  lives--;
  GameAudio.hurt();
  player.invuln = 1200;
  // 被敵人撞到：彈開並往上彈一下，不轉送平台
  player.vy = JUMP_VY * 0.85;
  if(lives <= 0){
    gameOver();
    return;
  }
}

function gameOver(){
  state = STATE.OVER;
  GameAudio.die();
  GameAudio.pauseBGM();
  if(score > best){ best = score; localStorage.setItem('jumpup.best', ''+best); }
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalBest').textContent = best;
  document.getElementById('gameOver').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
}

// ============ 繪製 ============
function drawBackground(){
  // 漸層底色
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#2a1f5c'); g.addColorStop(1,'#120a2a');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  // 視差背景層（垂直捲動）
  const drawBGLayer = (img, factor) => {
    if(!img) return;
    const ratio = img.width > 0 ? (W / img.width) : 1;
    const dh = img.height * ratio;
    const offset = (camY * factor) % dh;
    for(let y = -dh + offset; y < H; y += dh){
      ctx.drawImage(img, 0, y - (offset - offset), W, dh);
    }
    // 簡化：單張拉伸 + 垂直重複
    let yy = (camY * factor) % dh;
    if(yy > 0) yy -= dh;
    ctx.drawImage(img, 0, yy, W, dh);
    ctx.drawImage(img, 0, yy + dh, W, dh);
  };
  drawBGLayer(IMG.bgSky, 0.05);
  drawBGLayer(IMG.bgFar, 0.12);
  drawBGLayer(IMG.bgNear, 0.22);
}

function drawPlatform(p){
  const y = p.y - camY;
  if(y < -30 || y > H + 30) return;
  let img = IMG.plat;
  if(p.type === 'break') img = IMG.platBreak || IMG.plat;
  else if(p.type === 'move') img = IMG.platMove || IMG.plat;
  else if(p.type === 'spring') img = IMG.platSpring || IMG.plat;
  if(p.type === 'ground'){
    ctx.fillStyle = '#3d2b6b';
    ctx.fillRect(p.x, y, p.w, p.h);
    ctx.fillStyle = '#5a3fa0';
    ctx.fillRect(p.x, y, p.w, 4);
    return;
  }
  if(img){
    ctx.drawImage(img, p.x, y - 4, p.w, p.h + 8);
  } else {
    ctx.fillStyle = p.type==='spring'?'#ffd54a': p.type==='break'?'#b56b34':'#6c9b55';
    ctx.fillRect(p.x, y, p.w, p.h);
  }
}

function drawCoin(c){
  const y = c.y - camY;
  if(y < -40 || y > H + 40) return;
  const img = IMG['coin'+(Math.floor(c.frame)+1)];
  if(img) ctx.drawImage(img, c.x, y, c.w, c.h);
  else { ctx.fillStyle='#ffe27a'; ctx.beginPath(); ctx.arc(c.x+14, y+14, 10, 0, Math.PI*2); ctx.fill(); }
}

function drawEnemy(e){
  const y = e.y - camY;
  if(y < -50 || y > H + 50) return;
  const img = IMG['bat'+(Math.floor(e.frame)+1)];
  if(img){
    ctx.save();
    if(e.vx < 0){ ctx.translate(e.x + e.w, y); ctx.scale(-1,1); ctx.drawImage(img, 0, 0, e.w, e.h); }
    else ctx.drawImage(img, e.x, y, e.w, e.h);
    ctx.restore();
  } else {
    ctx.fillStyle='#e74c3c'; ctx.fillRect(e.x, y, e.w, e.h);
  }
}

function drawPlayer(){
  const y = player.y - camY;
  let img = IMG.idle;
  if(!player.alive) img = IMG.die;
  else if(player.vy < -1) img = IMG.jump;
  if(player.invuln > 0 && Math.floor(player.invuln/80)%2 === 0){
    // 閃爍
  } else {
    ctx.save();
    if(player.facing < 0){
      ctx.translate(player.x + player.w/2, y - player.h/2);
      ctx.scale(-1,1);
      if(img) ctx.drawImage(img, 0, 0, player.w, player.h);
      else { ctx.fillStyle='#4ac7ff'; ctx.fillRect(0,0,player.w,player.h); }
    } else {
      if(img) ctx.drawImage(img, player.x - player.w/2, y - player.h/2, player.w, player.h);
      else { ctx.fillStyle='#4ac7ff'; ctx.fillRect(player.x-player.w/2, y-player.h/2, player.w, player.h); }
    }
    ctx.restore();
  }
}

function drawParticles(){
  for(const p of particles){
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life/30);
    ctx.fillRect(p.x-2, p.y - camY -2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function render(){
  drawBackground();
  for(const p of platforms) drawPlatform(p);
  for(const c of coins) if(!c.taken) drawCoin(c);
  for(const e of enemies) drawEnemy(e);
  drawPlayer();
  drawParticles();
}

// ============ 主迴圈 ============
function loop(ts){
  const dt = Math.min(32, ts - lastTime || 16);
  lastTime = ts;

  if(state === STATE.PLAY){
    update(dt);
    render();
    updateHUD();
  } else if(state === STATE.PAUSE || state === STATE.OVER){
    render();
  } else {
    // MENU 背景小動畫
    drawBackground();
  }
  requestAnimationFrame(loop);
}

function updateHUD(){
  document.getElementById('score').textContent = score + ' m';
  document.getElementById('best').textContent = '最佳 ' + best + ' m';
  const livesEl = document.getElementById('lives');
  if(livesEl.childElementCount !== lives){
    livesEl.innerHTML = '';
    for(let i=0;i<lives;i++){
      const im = document.createElement('img');
      im.src = 'assets/Life/1.png'; im.alt='♥';
      livesEl.appendChild(im);
    }
  }
}

// ============ 控制 ============
window.addEventListener('keydown', e => {
  if(e.code==='ArrowLeft' || e.code==='KeyA') keys.left = true;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = true;
  if(e.code==='Escape' || e.code==='KeyP'){
    if(state===STATE.PLAY) pauseGame(); else if(state===STATE.PAUSE) resumeGame();
  }
});
window.addEventListener('keyup', e => {
  if(e.code==='ArrowLeft' || e.code==='KeyA') keys.left = false;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = false;
});

// 觸控：左右半螢幕
function bindTouch(el, dir){
  const on = e => { e.preventDefault(); touchDir = dir; GameAudio.resume(); };
  const off = e => { e.preventDefault(); touchDir = 0; };
  el.addEventListener('touchstart', on, {passive:false});
  el.addEventListener('touchend', off);
  el.addEventListener('touchcancel', off);
  el.addEventListener('mousedown', on);
  el.addEventListener('mouseup', off);
  el.addEventListener('mouseleave', off);
}
bindTouch(document.getElementById('touchLeft'), -1);
bindTouch(document.getElementById('touchRight'), 1);

// ============ UI ============
const $ = id => document.getElementById(id);

function startGame(){
  GameAudio.init(); GameAudio.resume();
  initWorld();
  state = STATE.PLAY;
  $('menu').classList.add('hidden');
  $('gameOver').classList.add('hidden');
  $('pauseOverlay').classList.add('hidden');
  $('hud').classList.remove('hidden');
  GameAudio.playBGM();
}
function pauseGame(){
  if(state !== STATE.PLAY) return;
  state = STATE.PAUSE;
  $('pauseOverlay').classList.remove('hidden');
  GameAudio.pauseBGM();
}
function resumeGame(){
  if(state !== STATE.PAUSE) return;
  state = STATE.PLAY;
  $('pauseOverlay').classList.add('hidden');
  GameAudio.playBGM();
}
function toMenu(){
  state = STATE.MENU;
  $('menu').classList.remove('hidden');
  $('gameOver').classList.add('hidden');
  $('pauseOverlay').classList.add('hidden');
  $('hud').classList.add('hidden');
  GameAudio.stopBGM();
}

$('startBtn').addEventListener('click', ()=>{ GameAudio.click(); startGame(); });
$('restartBtn').addEventListener('click', ()=>{ GameAudio.click(); startGame(); });
$('menuBtn').addEventListener('click', ()=>{ GameAudio.click(); toMenu(); });
$('quitBtn').addEventListener('click', ()=>{ GameAudio.click(); toMenu(); });
$('resumeBtn').addEventListener('click', ()=>{ GameAudio.click(); resumeGame(); });
$('pauseBtn').addEventListener('click', ()=>{ GameAudio.click(); pauseGame(); });
$('muteBtn').addEventListener('click', () => {
  const m = GameAudio.toggleMute();
  $('muteBtn').textContent = m ? '🔇' : '🔊';
});

// ============ 啟動 ============
(async function(){
  GameAudio.init();
  await loadAll();
  // 初始載入後顯示最佳紀錄
  best = parseInt(localStorage.getItem('jumpup.best')||'0',10) || 0;
  requestAnimationFrame(loop);
})();

})();
