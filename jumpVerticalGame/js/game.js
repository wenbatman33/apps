// Jump Up! 垂直跳躍主程式 — Canvas only UI
(function(){
'use strict';

// ============ 基本設定 ============
const W = 360, H = 640;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// 依 devicePixelRatio 與實際顯示尺寸調整 backing store，避免放大後糊掉
function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  // backing store 以邏輯尺寸為基準按顯示比例放大，再乘 DPR
  const cssW = rect.width || W;
  const cssH = rect.height || H;
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  // 把座標系 scale 回 360×640 邏輯尺寸
  const sx = canvas.width / W;
  const sy = canvas.height / H;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

const GRAVITY = 0.38;
const JUMP_VY = -13.5;
const SPRING_VY = -20;
const MOVE_SPEED = 5.2;
const MAX_LIVES = 3;
const FALL_MARGIN = 120;
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
  bigLogo:   'assets/Ui/BigLogo.png',
  playBtn:   'assets/Ui/PlayBtn.png',
  restartBtn:'assets/Ui/RestartBtn.png',
  pausedText:'assets/Ui/PausedText.png',
  scoreBox:  'assets/Ui/ScoreBox.png',
};

let loadProgress = 0; // 0~1
function loadAll(){
  const keys = Object.keys(toLoad);
  const total = keys.length;
  let done = 0;
  return Promise.all(keys.map(k => new Promise(res=>{
    const im = new Image();
    const finish = ()=>{ done++; loadProgress = done/total; res(); };
    im.onload = ()=>{ IMG[k] = im; finish(); };
    im.onerror = ()=>{ IMG[k] = null; finish(); };
    im.src = toLoad[k];
  })));
}

// 載入畫面：進度條 + 提示
function drawLoading(){
  ctx.fillStyle = '#1a1235';
  ctx.fillRect(0, 0, W, H);
  // 標題
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 36px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Jump Up!', W/2, H/2 - 60);
  // 副標
  ctx.fillStyle = '#cfc7f0';
  ctx.font = '16px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('載入中…', W/2, H/2 - 20);
  // 進度條
  const bw = 240, bh = 14, bx = W/2 - bw/2, by = H/2 + 20;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#7dd87a';
  ctx.fillRect(bx, by, bw * loadProgress, bh);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  // 百分比
  ctx.fillStyle = '#fff';
  ctx.font = '14px -apple-system, sans-serif';
  ctx.fillText(Math.round(loadProgress*100) + '%', W/2, by + bh + 22);
}
let loadingRaf = 0;
function loadingLoop(){
  drawLoading();
  loadingRaf = requestAnimationFrame(loadingLoop);
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
  bounceVx: 0, bounceTimer: 0,
};

let platforms = [];
let coins = [];
let enemies = [];
let particles = [];

let camY = 0;
let highestY = 0;
let score = 0;
let best = parseInt(localStorage.getItem('jumpup.best')||'0',10) || 0;
let lives = MAX_LIVES;
let coinCount = 0;

let keys = { left:false, right:false };
let touchDir = 0;

// ============ 平台/金幣/敵人生成 ============
function rand(a,b){ return a + Math.random()*(b-a); }
function gapForScore(){
  const diff = Math.min(1, score / 600);
  const min = PLATFORM_GAP_MIN + diff * 20;
  const max = PLATFORM_GAP_MAX + diff * 30;
  return rand(min, max);
}

function spawnPlatform(y){
  const diff = Math.min(1, score / 600);
  const type = (()=>{
    const r = Math.random();
    if(score < 80) return 'normal';
    if(r < 0.72 - diff*0.32) return 'normal';
    if(r < 0.85 - diff*0.20) return 'move';
    if(r < 0.95 - diff*0.05) return 'break';
    return 'spring';
  })();
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

  if(Math.random() < 0.22){
    coins.push({ x: p.x + p.w/2 - 14, y: p.y - 32, w:28, h:28, frame:Math.random()*6, taken:false });
  }
  if(score > 100){
    const enemyChance = 0.05 + diff * 0.17;
    if(Math.random() < enemyChance){
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
  player.bounceVx = 0; player.bounceTimer = 0;

  platforms.push({ x: 0, y: H - 60, w: W, h: 20, type:'ground', vx:0 });
  let y = H - 140;
  while(y > -800){
    y -= gapForScore();
    spawnPlatform(y);
  }
}

// ============ 物理 / 更新 ============
function update(dt){
  const dir = (keys.left ? -1:0) + (keys.right ? 1:0) + touchDir;
  if(player.bounceTimer > 0){
    player.vx = player.bounceVx;
    player.bounceTimer -= dt;
    player.bounceVx *= 0.92;
  } else {
    player.vx = Math.sign(dir) * MOVE_SPEED;
    if(dir !== 0) player.facing = Math.sign(dir);
  }

  player.vy += GRAVITY;
  if(player.vy > 18) player.vy = 18;
  player.x += player.vx;
  player.y += player.vy;

  const halfW = player.w/2;
  if(player.x < halfW){
    player.x = halfW;
    player.bounceVx = MOVE_SPEED * 1.6;
    player.bounceTimer = 180;
    player.facing = 1;
    GameAudio.land();
  } else if(player.x > W - halfW){
    player.x = W - halfW;
    player.bounceVx = -MOVE_SPEED * 1.6;
    player.bounceTimer = 180;
    player.facing = -1;
    GameAudio.land();
  }

  for(const p of platforms){
    if(p.vx){
      p.x += p.vx;
      if(p.x < 10 || p.x + p.w > W - 10) p.vx *= -1;
    }
  }

  if(player.vy > 0){
    for(const p of platforms){
      if(p.broken) continue;
      const screenPy = p.y - camY;
      if(screenPy > H - 8 || screenPy < -20) continue;
      const feetPrev = player.y + player.h/2 - player.vy;
      const feet = player.y + player.h/2;
      if(feetPrev <= p.y && feet >= p.y &&
         player.x + player.w*0.3 > p.x && player.x - player.w*0.3 < p.x + p.w){
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

  for(const c of coins){
    if(c.taken) continue;
    c.frame = (c.frame + 0.2) % 6;
    if(rectOverlap(player.x-player.w/2, player.y-player.h/2, player.w, player.h, c.x, c.y, c.w, c.h)){
      c.taken = true; coinCount++; score += 10;
      GameAudio.coin();
      for(let i=0;i<8;i++) particles.push({x:c.x+14, y:c.y+14, vx:rand(-3,3), vy:rand(-4,-1), life:25, color:'#ffe27a'});
    }
  }

  for(const e of enemies){
    e.x += e.vx;
    e.frame = (e.frame + 0.2) % 4;
    if(e.x < 0 || e.x + e.w > W) e.vx *= -1;
    if(player.invuln <= 0 && rectOverlap(player.x-player.w/2+6, player.y-player.h/2+6, player.w-12, player.h-12, e.x+4, e.y+4, e.w-8, e.h-8)){
      hurt();
    }
  }

  for(const pt of particles){
    pt.x += pt.vx; pt.y += pt.vy;
    pt.vy += 0.2;
    pt.life--;
  }
  particles = particles.filter(p=>p.life>0);

  // 自動向上捲動
  const diffAuto = Math.min(1, score / 700);
  const autoScroll = 0.15 + diffAuto * 2.25;
  camY -= autoScroll;

  const screenY = player.y - camY;
  if(screenY < H * 0.42){
    const d = H * 0.42 - screenY;
    camY -= d;
  }
  highestY = Math.min(highestY, player.y);

  score = Math.max(score, Math.floor(-highestY / 10) + coinCount*10);

  platforms = platforms.filter(p => p.y < camY + H + 100 && !p.broken || (p.broken && p.y > camY - 50));
  platforms = platforms.filter(p => !(p.broken && player.y > p.y + 200));
  let topY = platforms.reduce((m,p)=> Math.min(m,p.y), H);
  while(topY > camY - 400){
    topY -= gapForScore();
    spawnPlatform(topY);
  }

  coins = coins.filter(c => !c.taken && c.y < camY + H + 100);
  enemies = enemies.filter(e => e.y < camY + H + 100);

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
}

// ============ 繪製：遊戲世界 ============
function drawBackground(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#2a1f5c'); g.addColorStop(1,'#120a2a');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  const drawBGLayer = (img, factor) => {
    if(!img) return;
    const ratio = W / img.width;
    const dh = img.height * ratio;
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
  if(player.invuln > 0 && Math.floor(player.invuln/80)%2 === 0) return;
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

function drawParticles(){
  for(const p of particles){
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life/30);
    ctx.fillRect(p.x-2, p.y - camY -2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function renderWorld(){
  drawBackground();
  for(const p of platforms) drawPlatform(p);
  for(const c of coins) if(!c.taken) drawCoin(c);
  for(const e of enemies) drawEnemy(e);
  drawPlayer();
  drawParticles();
}

// ============ 繪製：UI（全部在 Canvas 上） ============
// 按鈕定義：每幀根據 state 重建，pointerdown 用座標命中
let uiButtons = [];
function addButton(b){ uiButtons.push(b); }

function drawPillBg(x, y, w, h, alpha){
  ctx.fillStyle = `rgba(0,0,0,${alpha!=null?alpha:0.35})`;
  roundRect(x, y, w, h, h/2, true);
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  roundRect(x, y, w, h, h/2, false, true);
}
function roundRect(x, y, w, h, r, fill, stroke){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
}

function drawIconPause(cx, cy, size, color){
  ctx.fillStyle = color || '#fff';
  const w = size*0.22, h = size*0.6;
  ctx.fillRect(cx - w - 3, cy - h/2, w, h);
  ctx.fillRect(cx + 3, cy - h/2, w, h);
}
function drawIconSpeaker(cx, cy, size, muted){
  ctx.fillStyle = '#fff';
  const s = size/2;
  // 喇叭本體
  ctx.beginPath();
  ctx.moveTo(cx-s*0.9, cy-s*0.35);
  ctx.lineTo(cx-s*0.2, cy-s*0.35);
  ctx.lineTo(cx+s*0.3, cy-s*0.75);
  ctx.lineTo(cx+s*0.3, cy+s*0.75);
  ctx.lineTo(cx-s*0.2, cy+s*0.35);
  ctx.lineTo(cx-s*0.9, cy+s*0.35);
  ctx.closePath();
  ctx.fill();
  if(muted){
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx+s*0.5, cy-s*0.5); ctx.lineTo(cx+s*0.95, cy+s*0.5);
    ctx.moveTo(cx+s*0.95, cy-s*0.5); ctx.lineTo(cx+s*0.5, cy+s*0.5);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx+s*0.5, cy, s*0.35, -Math.PI/4, Math.PI/4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx+s*0.5, cy, s*0.65, -Math.PI/4, Math.PI/4);
    ctx.stroke();
  }
}
function drawIconHeart(cx, cy, size, lost){
  ctx.save();
  if(IMG.life){
    if(lost){ ctx.filter = 'grayscale(1) brightness(0.45)'; ctx.globalAlpha = 0.55; }
    ctx.drawImage(IMG.life, cx - size/2, cy - size/2, size, size);
  } else {
    ctx.fillStyle = lost ? '#555' : '#ff4d6b';
    ctx.beginPath();
    ctx.moveTo(cx, cy + size*0.35);
    ctx.bezierCurveTo(cx - size*0.6, cy - size*0.1, cx - size*0.3, cy - size*0.55, cx, cy - size*0.2);
    ctx.bezierCurveTo(cx + size*0.3, cy - size*0.55, cx + size*0.6, cy - size*0.1, cx, cy + size*0.35);
    ctx.fill();
  }
  ctx.restore();
}

function drawHUD(){
  // 左上：分數 + 最佳 + 金幣
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(6, 8, 150, 72, 14, true);
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 1;
  roundRect(6, 8, 150, 72, 14, false, true);

  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText(score + ' m', 16, 14);
  ctx.font = '11px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText('最佳 ' + best + ' m', 16, 40);

  // 金幣
  const coinImg = IMG.coin1;
  if(coinImg) ctx.drawImage(coinImg, 16, 52, 20, 20);
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 15px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText(String(coinCount), 42, 56);

  // 右上：血量
  const heartSize = 22;
  const heartsW = MAX_LIVES * heartSize + (MAX_LIVES-1)*4 + 14;
  const heartsX = W - 6 - heartsW - 80;    // 留空間給 mute/pause
  drawPillBg(heartsX, 14, heartsW, 34);
  for(let i=0;i<MAX_LIVES;i++){
    drawIconHeart(heartsX + 7 + heartSize/2 + i*(heartSize+4), 14 + 17, heartSize, i >= lives);
  }

  // 右上：mute / pause 按鈕
  const btnR = 18;
  const muteBtn = { x: W - 6 - btnR*2 - 4 - btnR*2, y: 14, w: btnR*2, h: btnR*2, action:'mute' };
  const pauseBtn = { x: W - 6 - btnR*2, y: 14, w: btnR*2, h: btnR*2, action:'pause' };
  [muteBtn, pauseBtn].forEach(b => {
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.arc(b.x + b.w/2, b.y + b.h/2, b.w/2, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.stroke();
  });
  drawIconSpeaker(muteBtn.x + muteBtn.w/2, muteBtn.y + muteBtn.h/2, 22, GameAudio.muted);
  drawIconPause(pauseBtn.x + pauseBtn.w/2, pauseBtn.y + pauseBtn.h/2, 22);

  addButton(muteBtn);
  addButton(pauseBtn);
}

function drawDimmer(alpha){
  ctx.fillStyle = `rgba(8,4,24,${alpha||0.75})`;
  ctx.fillRect(0,0,W,H);
}

function drawMenu(){
  drawBackground();
  drawDimmer(0.55);

  // logo
  if(IMG.bigLogo){
    const lw = 220, lh = IMG.bigLogo.height * (lw / IMG.bigLogo.width);
    ctx.drawImage(IMG.bigLogo, W/2 - lw/2, 100, lw, lh);
  }

  // 標題
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 40px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillText('Jump Up!', W/2, 300);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.font = '15px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('往上跳！別掉下去', W/2, 332);

  // 開始按鈕
  const startBtn = { x: W/2 - 100, y: 380, w: 200, h: 64, action:'start' };
  if(IMG.playBtn){
    ctx.drawImage(IMG.playBtn, startBtn.x, startBtn.y, startBtn.w, startBtn.h);
  } else {
    ctx.fillStyle = '#ffb347';
    roundRect(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 32, true);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.fillText('開始遊戲', W/2, startBtn.y + startBtn.h/2);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  addButton(startBtn);

  // 最佳紀錄
  if(best > 0){
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = '13px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.fillText('最佳 ' + best + ' m', W/2, 470);
  }

  // 提示
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '12px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('PC：← → 方向鍵　手機：點角色左右側', W/2, 560);
  ctx.fillText('（按鍵 P / Esc 可暫停）', W/2, 580);
}

function drawPauseOverlay(){
  drawDimmer(0.7);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if(IMG.pausedText){
    const pw = 200, ph = IMG.pausedText.height * (pw / IMG.pausedText.width);
    ctx.drawImage(IMG.pausedText, W/2 - pw/2, 180, pw, ph);
  } else {
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 48px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.fillText('PAUSED', W/2, 220);
  }

  const resumeBtn = { x: W/2 - 100, y: 310, w: 200, h: 64, action:'resume' };
  if(IMG.playBtn) ctx.drawImage(IMG.playBtn, resumeBtn.x, resumeBtn.y, resumeBtn.w, resumeBtn.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.fillText('繼續', W/2, resumeBtn.y + resumeBtn.h/2);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  addButton(resumeBtn);

  const quitBtn = { x: W/2 - 90, y: 400, w: 180, h: 48, action:'quit' };
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(quitBtn.x, quitBtn.y, quitBtn.w, quitBtn.h, 24, true);
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1.5;
  roundRect(quitBtn.x, quitBtn.y, quitBtn.w, quitBtn.h, 24, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = '16px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('回主選單', W/2, quitBtn.y + quitBtn.h/2);
  addButton(quitBtn);
}

function drawGameOverOverlay(){
  drawDimmer(0.78);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 48px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillText('Game Over', W/2, 160);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // 分數面板
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  roundRect(W/2 - 120, 210, 240, 110, 16, true);
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  roundRect(W/2 - 120, 210, 240, 110, 16, false, true);

  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.font = '15px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('本次', W/2 - 60, 240);
  ctx.fillText('最佳', W/2 + 60, 240);
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 26px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText(score + ' m', W/2 - 60, 275);
  ctx.fillText(best + ' m', W/2 + 60, 275);

  const restartBtn = { x: W/2 - 100, y: 360, w: 200, h: 64, action:'restart' };
  if(IMG.restartBtn) ctx.drawImage(IMG.restartBtn, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.fillText('再玩一次', W/2, restartBtn.y + restartBtn.h/2);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  addButton(restartBtn);

  const menuBtn = { x: W/2 - 90, y: 450, w: 180, h: 48, action:'menu' };
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 24, true);
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1.5;
  roundRect(menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 24, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = '16px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('主選單', W/2, menuBtn.y + menuBtn.h/2);
  addButton(menuBtn);
}

// ============ 主迴圈 ============
function loop(ts){
  const dt = Math.min(32, ts - lastTime || 16);
  lastTime = ts;

  uiButtons = [];  // 每幀重置按鈕清單

  if(state === STATE.PLAY){
    update(dt);
    renderWorld();
    drawHUD();
  } else if(state === STATE.PAUSE){
    renderWorld();
    drawHUD();
    drawPauseOverlay();
  } else if(state === STATE.OVER){
    renderWorld();
    drawHUD();
    drawGameOverOverlay();
  } else {
    drawMenu();
  }
  requestAnimationFrame(loop);
}

// ============ 控制 / 輸入 ============
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

// 把 client 座標轉成 canvas 邏輯座標
function eventToCanvas(e){
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  const y = (e.clientY - rect.top) / rect.height * H;
  return { x, y, inRect: e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom };
}

function hitButton(x, y){
  for(const b of uiButtons){
    if(x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

function handleButton(action){
  GameAudio.click();
  switch(action){
    case 'start':    startGame(); break;
    case 'restart':  startGame(); break;
    case 'resume':   resumeGame(); break;
    case 'pause':    pauseGame(); break;
    case 'quit':
    case 'menu':     toMenu(); break;
    case 'mute': {
      const m = GameAudio.toggleMute();
      void m;
      break;
    }
  }
}

let pointerHeld = false;
canvas.addEventListener('pointerdown', e => {
  GameAudio.resume();
  const { x, y, inRect } = eventToCanvas(e);
  if(!inRect) return;
  const btn = hitButton(x, y);
  if(btn){
    e.preventDefault();
    handleButton(btn.action);
    return;
  }
  // 遊戲中：依點擊點與主角 x 判左右
  if(state === STATE.PLAY){
    const dx = x - player.x;
    if(Math.abs(dx) < 6) return;
    touchDir = dx < 0 ? -1 : 1;
    pointerHeld = true;
    if(canvas.setPointerCapture && e.pointerId != null){
      try{ canvas.setPointerCapture(e.pointerId); }catch{}
    }
  }
});
canvas.addEventListener('pointermove', e => {
  if(!pointerHeld || state !== STATE.PLAY) return;
  const { x } = eventToCanvas(e);
  const dx = x - player.x;
  if(Math.abs(dx) < 6) return;
  touchDir = dx < 0 ? -1 : 1;
});
function releasePointer(){ if(pointerHeld){ pointerHeld = false; touchDir = 0; } }
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
window.addEventListener('blur', releasePointer);

// ============ 狀態切換 ============
function startGame(){
  GameAudio.init(); GameAudio.resume();
  initWorld();
  state = STATE.PLAY;
  GameAudio.playBGM();
}
function pauseGame(){
  if(state !== STATE.PLAY) return;
  state = STATE.PAUSE;
  GameAudio.pauseBGM();
}
function resumeGame(){
  if(state !== STATE.PAUSE) return;
  state = STATE.PLAY;
  GameAudio.playBGM();
}
function toMenu(){
  state = STATE.MENU;
  GameAudio.stopBGM();
}

// ============ 啟動 ============
(async function(){
  GameAudio.init();
  loadingRaf = requestAnimationFrame(loadingLoop);
  await loadAll();
  cancelAnimationFrame(loadingRaf);
  best = parseInt(localStorage.getItem('jumpup.best')||'0',10) || 0;
  requestAnimationFrame(loop);
})();

})();
