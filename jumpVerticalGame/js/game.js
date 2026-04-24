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
const MAX_LIVES = 10;
const FALL_MARGIN = 120;
const PLATFORM_GAP_MIN = 62;
const PLATFORM_GAP_MAX = 110;
const PLATFORM_W = 72, PLATFORM_H = 18;

// ============ 資源載入 ============
const IMG = {};
const toLoad = {
  idle:      'assets/Characters/01/Idle.png',
  jump:      'assets/Characters/01/Jump.png',
  die:       'assets/Characters/01/Die.png',
  // 跳板素材重新對應（依官方 6 張 Platformer PNG）
  plat:      'assets/OtherAssets/Platformer5.png', // normal 黃綠
  platMove:  'assets/OtherAssets/Platformer1.png', // 橘棕
  platBreak: 'assets/OtherAssets/Platformer4.png', // 黑底火焰
  platSpring:'assets/OtherAssets/Platformer6.png', // 金棕（加彈簧裝飾）
  platIce:   'assets/OtherAssets/Platformer2.png', // 冰雪（官方雪頂）
  platFlash: 'assets/OtherAssets/Platformer3.png', // 紫色（加閃爍動畫）
  spring1:   'assets/Spring/spring_1.png',         // 彈簧展開
  spring2:   'assets/Spring/spring_2.png',         // 彈簧壓縮
  obstacle:  'assets/OtherAssets/obstacle.png',
  coin1:'assets/Coins/1.png', coin2:'assets/Coins/2.png', coin3:'assets/Coins/3.png',
  coin4:'assets/Coins/4.png', coin5:'assets/Coins/5.png', coin6:'assets/Coins/6.png',
  life:  'assets/Life/1.png',
  life1: 'assets/Life/1.png',
  life2: 'assets/Life/2.png',
  life3: 'assets/Life/3.png',
  life4: 'assets/Life/4.png',
  life5: 'assets/Life/5.png',
  bigLogo:   'assets/Ui/BigLogo.png',
  playBtn:   'assets/Ui/PlayBtn.png',
  restartBtn:'assets/Ui/RestartBtn.png',
  pausedText:'assets/Ui/PausedText.png',
  scoreBox:  'assets/Ui/ScoreBox.png',
};
// 6 套背景
for(let i=1; i<=6; i++){
  const k = i.toString().padStart(2,'0');
  toLoad['bg_'+i+'_sky']  = 'assets/Background/'+k+'/Layer1.png';
  toLoad['bg_'+i+'_far']  = 'assets/Background/'+k+'/Layer2.png';
  toLoad['bg_'+i+'_near'] = 'assets/Background/'+k+'/Layer3.png';
}

// ============ 怪物種類定義 ============
// kind: flyer=水平飛行；walker=在跳板上走；static=釘在跳板上方不可碰
const ENEMY_FOLDER = {
  bee:'Bee', bat:'Bat', bird:'Bird', spider:'Spider', penguin:'Penguin',
  snail:'Snail', crab:'Crab', evilflower:'EvilFlower', hedgehog:'hedgehog', tentacle:'tentacle'
};
const ENEMY_META = {
  bee:        { kind:'flyer',  frames:2, w:48, h:42, spd:[1.0, 1.8] },
  bat:        { kind:'flyer',  frames:4, w:62, h:48, spd:[1.4, 2.6] },
  bird:       { kind:'flyer',  frames:4, w:58, h:44, spd:[1.6, 2.8] },
  tentacle:   { kind:'flyer',  frames:4, w:56, h:70, spd:[0.8, 1.5] },
  penguin:    { kind:'walker', frames:3, w:54, h:54, spd:[0.6, 1.2] },
  snail:      { kind:'walker', frames:2, w:56, h:40, spd:[0.3, 0.7] },
  crab:       { kind:'walker', frames:2, w:58, h:40, spd:[1.0, 1.8] },
  spider:     { kind:'static', frames:2, w:54, h:56 },
  evilflower: { kind:'static', frames:4, w:50, h:58 },
  hedgehog:   { kind:'static', frames:1, w:56, h:42 },
};
// 每關的怪物池（第 1 關只出溫和的蜜蜂）
const ENEMY_POOLS = {
  1: ['bee'],
  2: ['hedgehog', 'penguin', 'bat', 'bird'],
  3: ['spider', 'bat'],
  4: ['evilflower', 'snail'],
  5: ['crab', 'hedgehog'],
  6: ['tentacle', 'bat', 'bird', 'spider', 'evilflower'],
};
// 載入全部怪物素材
for(const [key, meta] of Object.entries(ENEMY_META)){
  const folder = ENEMY_FOLDER[key];
  for(let i=1; i<=meta.frames; i++){
    toLoad[key + i] = 'assets/Enemies/' + folder + '/' + i + '.png';
  }
}

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
const STATE = { MENU:'menu', SELECT:'select', PLAY:'play', PAUSE:'pause', OVER:'over', LEADER:'leader' };
let state = STATE.MENU;
let currentStage = 1; // 1..6
let playerName = localStorage.getItem('jumpup.name') || '';
let leaderRows = []; // 當前顯示排行榜資料
let leaderStage = 1;
let leaderLoading = false;
let leaderError = '';
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
let hearts = [];
let nextHeartScore = 250; // 下一次補血心的觸發分數

let camY = 0;
let highestY = 0;
let score = 0;
let best = 0; // 每關獨立最佳（進入關卡後依 currentStage 讀取）
function bestKey(stage){ return 'jumpup.best.' + stage; }
function loadBest(stage){ return parseInt(localStorage.getItem(bestKey(stage))||'0',10) || 0; }
let lives = MAX_LIVES;
let coinCount = 0;

let keys = { left:false, right:false };
let touchDir = 0;
let pointerTargetX = null;
const POINTER_DEADZONE = 24;

// ============ 平台/金幣/敵人生成 ============
function rand(a,b){ return a + Math.random()*(b-a); }
function gapForScore(){
  const diff = Math.min(1, score / 600);
  const min = PLATFORM_GAP_MIN + diff * 20;
  const max = PLATFORM_GAP_MAX + diff * 30;
  return rand(min, max);
}

function stageCfg(){ return STAGES[currentStage-1] || STAGES[0]; }

// flash 跳板週期：2.3 秒一循環，1.5 秒實體，0.8 秒透明無碰撞
const FLASH_CYCLE = 2.3, FLASH_ON = 1.5;
function flashOn(p){
  const t = ((performance.now()/1000) + (p.phase||0)) % FLASH_CYCLE;
  return t < FLASH_ON;
}

function spawnPlatform(y){
  const diff = Math.min(1, score / 600);
  const sc = stageCfg();
  const type = (()=>{
    const r = Math.random();
    // 一開始前幾塊強制 normal，避免開場就踩空
    if(score < 40) return 'normal';
    const moveP  = 0.13 * (sc.moveMul  || 0);
    const breakP = 0.10 * (sc.breakMul || 0);
    const iceP   = 0.11 * (sc.iceMul   || 0);
    const flashP = 0.09 * (sc.flashMul || 0);
    const springP = 0.06; // spring 固定少量
    const specialSum = moveP + breakP + iceP + flashP + springP;
    const normalEnd = Math.max(0.30, 0.85 - diff*0.30 - specialSum);
    let acc = normalEnd;
    if(r < acc) return 'normal';
    acc += moveP + diff*0.04;  if(r < acc) return 'move';
    acc += breakP + diff*0.03; if(r < acc) return 'break';
    acc += iceP;               if(r < acc) return 'ice';
    acc += flashP;             if(r < acc) return 'flash';
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
    phase: type === 'flash' ? Math.random() * 2.3 : 0, // 閃爍相位偏移
  };
  platforms.push(p);

  if(Math.random() < 0.22){
    coins.push({ x: p.x + p.w/2 - 14, y: p.y - 32, w:28, h:28, frame:Math.random()*6, taken:false });
  }
  // 第 1 關提早、少量出怪；其他關維持原本「score > 100 才出」的門檻
  const enemyGate = currentStage === 1 ? score > 60 : score > 100;
  if(enemyGate){
    const enemyChance = (0.05 + diff * 0.17) * sc.enemyMul;
    if(Math.random() < enemyChance){
      const pool = ENEMY_POOLS[currentStage] || ['bat'];
      const etype = pool[Math.floor(Math.random() * pool.length)];
      spawnEnemy(etype, p);
    }
  }
}

function spawnHeart(){
  // 從畫面左或右側飛入，y 在畫面上半部
  const fromLeft = Math.random() < 0.5;
  const w = 56, h = 44;
  const y = camY + rand(60, H * 0.55);
  const vx = (fromLeft ? 1 : -1) * rand(1.4, 2.2);
  const x = fromLeft ? -w - 8 : W + 8;
  hearts.push({
    x, y, w, h, vx, vy: rand(-0.15, 0.15),
    frame: 0, taken: false,
  });
}

function spawnEnemy(type, host){
  const m = ENEMY_META[type];
  if(!m) return;
  const e = {
    type, kind: m.kind, frames: m.frames,
    w: m.w, h: m.h, frame: Math.random()*m.frames, host: null,
  };
  if(m.kind === 'flyer'){
    e.x = rand(20, W - m.w - 20);
    e.y = host.y - rand(70, 140);
    const sp = m.spd || [1.2, 2.2];
    e.vx = (Math.random()<.5?-1:1) * rand(sp[0], sp[1]);
  } else if(m.kind === 'walker'){
    e.host = host;
    e.offsetX = Math.max(2, host.w/2 - m.w/2);
    e.x = host.x + e.offsetX;
    e.y = host.y - m.h + 2;
    const sp = m.spd || [0.5, 1.0];
    e.vx = (Math.random()<.5?-1:1) * rand(sp[0], sp[1]);
  } else { // static（不可踩，釘在跳板正上方）
    e.host = host;
    e.offsetX = Math.max(2, host.w/2 - m.w/2);
    e.x = host.x + e.offsetX;
    e.y = host.y - m.h + 2;
    e.vx = 0;
  }
  enemies.push(e);
}

function initWorld(){
  platforms = []; coins = []; enemies = []; particles = []; hearts = [];
  nextHeartScore = 250;
  camY = 0; highestY = 0; score = 0; coinCount = 0;
  lives = MAX_LIVES;
  player.x = W/2; player.y = H - 140;
  player.vx = 0; player.vy = JUMP_VY;
  player.alive = true; player.invuln = 0; player.facing = 1;
  player.bounceVx = 0; player.bounceTimer = 0;
  player.iceTimer = 0;

  platforms.push({ x: 0, y: H - 60, w: W, h: 20, type:'ground', vx:0 });
  let y = H - 140;
  while(y > -800){
    y -= gapForScore();
    spawnPlatform(y);
  }
}

// ============ 物理 / 更新 ============
function update(dt){
  // 依滑鼠/觸控目標位置逐幀重算左右方向，進入容許值即停止
  if(pointerTargetX !== null){
    const dx = pointerTargetX - player.x;
    if(Math.abs(dx) < POINTER_DEADZONE) touchDir = 0;
    else touchDir = dx < 0 ? -1 : 1;
  }
  const dir = (keys.left ? -1:0) + (keys.right ? 1:0) + touchDir;
  if(player.bounceTimer > 0){
    player.vx = player.bounceVx;
    player.bounceTimer -= dt;
    player.bounceVx *= 0.92;
  } else {
    const targetVx = Math.sign(dir) * MOVE_SPEED;
    if(player.iceTimer > 0){
      // 打滑：逐漸逼近目標速度（鬆開方向鍵仍會滑一段）
      player.vx += (targetVx - player.vx) * 0.06;
      player.iceTimer -= dt;
    } else {
      player.vx = targetVx;
    }
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
    if(p.springT > 0) p.springT -= dt;
  }

  if(player.vy > 0){
    for(const p of platforms){
      if(p.broken) continue;
      // flash 透明期間無碰撞
      if(p.type === 'flash' && !flashOn(p)) continue;
      const screenPy = p.y - camY;
      if(screenPy > H - 8 || screenPy < -20) continue;
      const feetPrev = player.y + player.h/2 - player.vy;
      const feet = player.y + player.h/2;
      if(feetPrev <= p.y && feet >= p.y &&
         player.x + player.w*0.3 > p.x && player.x - player.w*0.3 < p.x + p.w){
        if(p.type === 'spring'){
          player.vy = SPRING_VY;
          p.springT = 180; // 壓縮動畫計時
          GameAudio.powerup();
        } else {
          player.vy = JUMP_VY;
          GameAudio.jump();
        }
        if(p.type === 'break'){
          p.broken = true;
          for(let i=0;i<6;i++) particles.push({x:p.x+p.w/2, y:p.y, vx:rand(-2,2), vy:rand(-3,-1), life:30, color:'#8a5a2b'});
        }
        if(p.type === 'ice'){
          player.iceTimer = 600; // 0.6 秒打滑狀態
          for(let i=0;i<4;i++) particles.push({x:p.x+p.w/2, y:p.y, vx:rand(-2,2), vy:rand(-2,-0.5), life:25, color:'#cfefff'});
        } else {
          player.iceTimer = 0;
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
    if(e.kind === 'flyer'){
      e.x += e.vx;
      if(e.x < 0 || e.x + e.w > W) e.vx *= -1;
    } else if(e.kind === 'walker' && e.host){
      e.offsetX += e.vx;
      if(e.offsetX < 0 || e.offsetX + e.w > e.host.w){
        e.vx *= -1;
        e.offsetX = Math.max(0, Math.min(e.host.w - e.w, e.offsetX));
      }
      e.x = e.host.x + e.offsetX;
      e.y = e.host.y - e.h + 2;
    } else if(e.kind === 'static' && e.host){
      e.x = e.host.x + e.offsetX;
      e.y = e.host.y - e.h + 2;
    }
    e.frame = (e.frame + 0.18) % e.frames;
    if(player.invuln <= 0 && rectOverlap(player.x-player.w/2+6, player.y-player.h/2+6, player.w-12, player.h-12, e.x+4, e.y+4, e.w-8, e.h-8)){
      hurt();
    }
  }
  // 移除 host 已消失的怪物
  enemies = enemies.filter(e => !(e.host && e.host.broken));

  for(const pt of particles){
    pt.x += pt.vx; pt.y += pt.vy;
    pt.vy += 0.2;
    pt.life--;
  }
  particles = particles.filter(p=>p.life>0);

  // 自動向上捲動（依關卡強度）
  const diffAuto = Math.min(1, score / 700);
  const autoScroll = (0.15 + diffAuto * 2.25) * stageCfg().autoScrollMul;
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

  // 飛行愛心：每累積一定分數生一顆，只在玩家血量未滿時才刷
  if(score >= nextHeartScore && lives < MAX_LIVES){
    spawnHeart();
    nextHeartScore = score + Math.floor(rand(350, 550));
  }
  // 更新愛心位置 + 碰撞
  for(const hc of hearts){
    if(hc.taken) continue;
    hc.x += hc.vx;
    hc.y += hc.vy;
    hc.vy += hc.vy > 0 ? -0.005 : 0.005; // 輕微上下飄
    hc.frame = (hc.frame + 0.18) % 5;
    if(hc.x < -50 || hc.x > W + 50) hc.taken = true; // 飛出畫面
    if(!hc.taken && rectOverlap(player.x-player.w/2, player.y-player.h/2, player.w, player.h, hc.x, hc.y, hc.w, hc.h)){
      hc.taken = true;
      if(lives < MAX_LIVES){ lives++; score += 30; }
      GameAudio.powerup && GameAudio.powerup();
      for(let i=0;i<10;i++) particles.push({x:hc.x+hc.w/2, y:hc.y+hc.h/2, vx:rand(-3,3), vy:rand(-4,-1), life:30, color:'#ff5a6e'});
    }
  }
  hearts = hearts.filter(h => !h.taken && h.y < camY + H + 80 && h.y > camY - 200);

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
  if(score > best){ best = score; localStorage.setItem(bestKey(currentStage), ''+best); }
  // 自動提交到 Supabase（若已有暱稱）
  if(playerName && score > 0 && window.Leaderboard){
    window.Leaderboard.submit(currentStage, playerName, score);
  }
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
  drawBGLayer(IMG['bg_'+currentStage+'_sky'],  0.05);
  drawBGLayer(IMG['bg_'+currentStage+'_far'],  0.12);
  drawBGLayer(IMG['bg_'+currentStage+'_near'], 0.22);
}

function drawPlatform(p){
  const y = p.y - camY;
  if(y < -30 || y > H + 30) return;
  if(p.type === 'ground'){
    ctx.fillStyle = '#3d2b6b';
    ctx.fillRect(p.x, y, p.w, p.h);
    ctx.fillStyle = '#5a3fa0';
    ctx.fillRect(p.x, y, p.w, 4);
    return;
  }
  const baseKey = stageCfg().basePlat || 'plat';
  let img = IMG[baseKey] || IMG.plat;
  if(p.type === 'break') img = IMG.platBreak || img;
  else if(p.type === 'move') img = IMG.platMove || img;
  else if(p.type === 'spring') img = IMG.platSpring || img;
  else if(p.type === 'ice') img = IMG.platIce || img;
  else if(p.type === 'flash') img = IMG.platFlash || img;

  // flash：依週期決定透明度，透明期近乎消失但留虛線框
  let alpha = 1;
  let flashOff = false;
  if(p.type === 'flash'){
    const t = ((performance.now()/1000) + (p.phase||0)) % FLASH_CYCLE;
    const on = t < FLASH_ON;
    if(on){
      const remain = FLASH_ON - t;
      alpha = remain < 0.3 ? remain / 0.3 : 1;
    } else {
      alpha = 0;
      flashOff = true;
    }
  }

  if(alpha > 0){
    if(alpha < 1) ctx.globalAlpha = alpha;
    if(img){
      ctx.drawImage(img, p.x, y - 4, p.w, p.h + 8);
    } else {
      ctx.fillStyle = p.type==='spring'?'#ffd54a': p.type==='break'?'#b56b34':'#6c9b55';
      ctx.fillRect(p.x, y, p.w, p.h);
    }
    if(alpha < 1) ctx.globalAlpha = 1;
  }

  // flash 透明期：虛線框提示位置
  if(flashOff){
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#c59dff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x + 0.5, y + 0.5, p.w - 1, p.h - 1);
    ctx.restore();
  }

  // spring 跳板疊上彈簧 PNG（展開 / 壓縮兩幀）
  if(p.type === 'spring'){
    const compressed = p.springT > 0;
    const spImg = IMG[compressed ? 'spring2' : 'spring1'];
    if(spImg){
      const sw = 52;
      const natH = spImg.naturalHeight || 56;
      const natW = spImg.naturalWidth  || 196;
      const sh = sw * (natH / natW);
      const sx = p.x + p.w/2 - sw/2;
      ctx.drawImage(spImg, sx, y - sh + 2, sw, sh);
    }
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
  const idx = Math.floor(e.frame) + 1;
  const img = IMG[e.type + idx];
  const flipByVx = e.kind !== 'static'; // static 類不翻轉
  if(img){
    ctx.save();
    if(flipByVx && e.vx < 0){
      ctx.translate(e.x + e.w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, e.w, e.h);
    } else {
      ctx.drawImage(img, e.x, y, e.w, e.h);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(e.x, y, e.w, e.h);
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

function drawHeart(hc){
  const y = hc.y - camY;
  if(y < -50 || y > H + 50) return;
  const idx = Math.floor(hc.frame) + 1;
  const img = IMG['life' + idx];
  ctx.save();
  if(hc.vx < 0){
    ctx.translate(hc.x + hc.w, y);
    ctx.scale(-1, 1);
    if(img) ctx.drawImage(img, 0, 0, hc.w, hc.h);
  } else {
    if(img) ctx.drawImage(img, hc.x, y, hc.w, hc.h);
  }
  ctx.restore();
  if(!img){
    ctx.fillStyle = '#ff5a6e';
    ctx.fillRect(hc.x, y, hc.w, hc.h);
  }
}

function renderWorld(){
  drawBackground();
  for(const p of platforms) drawPlatform(p);
  for(const c of coins) if(!c.taken) drawCoin(c);
  for(const e of enemies) drawEnemy(e);
  for(const hc of hearts) if(!hc.taken) drawHeart(hc);
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
function drawPillButton(x, y, w, h){
  const r = h/2;
  // 外框陰影
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  // 漸層底色
  const g = ctx.createLinearGradient(0, y, 0, y+h);
  g.addColorStop(0, '#ffd066');
  g.addColorStop(0.5, '#ff9a1f');
  g.addColorStop(1, '#e07a0a');
  ctx.fillStyle = g;
  roundRect(x, y, w, h, r, true);
  ctx.restore();
  // 外框
  ctx.strokeStyle = '#7a3a00';
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, r, false, true);
  // 上方高光
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + w/2, y + h*0.28, w*0.38, h*0.22, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();
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

  // 右上：血量（♥ x N）
  const heartsW = 78;
  const heartsX = W - 6 - heartsW - 80;
  drawPillBg(heartsX, 14, heartsW, 34);
  drawIconHeart(heartsX + 20, 14 + 17, 22, false);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('x' + lives, heartsX + 36, 14 + 18);

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

  // 選擇關卡按鈕
  const selectBtn = { x: W/2 - 110, y: 380, w: 220, h: 72, action:'gotoSelect' };
  drawPillButton(selectBtn.x, selectBtn.y, selectBtn.w, selectBtn.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.fillText('選擇關卡', W/2, selectBtn.y + selectBtn.h/2);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  addButton(selectBtn);

  // 暱稱顯示 + 修改
  const nameBtn = { x: W/2 - 90, y: 470, w: 180, h: 36, action:'editName' };
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(nameBtn.x, nameBtn.y, nameBtn.w, nameBtn.h, 18, true);
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1.5;
  roundRect(nameBtn.x, nameBtn.y, nameBtn.w, nameBtn.h, 18, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = '14px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('暱稱：' + (playerName || '(未設定)'), W/2, nameBtn.y + nameBtn.h/2);
  addButton(nameBtn);

  // 提示
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '12px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('PC：← → 方向鍵　手機：點角色左右側', W/2, 560);
  ctx.fillText('（按鍵 P / Esc 可暫停）', W/2, 580);
}

function drawStageSelect(){
  // 背景用當前選到的關卡
  drawBackground();
  drawDimmer(0.55);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 28px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillText('選擇關卡', W/2, 36);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // 6 張卡片 2 欄 x 3 列
  const cardW = 150, cardH = 130, gapX = 20, gapY = 14;
  const totalW = cardW*2 + gapX;
  const startX = (W - totalW)/2;
  const startY = 70;
  for(let i=0;i<6;i++){
    const s = STAGES[i];
    const col = i % 2, row = Math.floor(i/2);
    const x = startX + col*(cardW+gapX);
    const y = startY + row*(cardH+gapY);
    const isSel = (currentStage === s.id);

    // 卡底（以該關縮圖 Layer3 當封面）
    const cover = IMG['bg_'+s.id+'_near'];
    ctx.fillStyle = '#1e1540';
    roundRect(x, y, cardW, cardH, 14, true);
    if(cover){
      ctx.save();
      // 用圓角裁切
      ctx.beginPath();
      roundRect(x, y, cardW, cardH-32, 14, false);
      ctx.clip();
      const r = cardW / cover.width;
      ctx.drawImage(cover, x, y - 20, cardW, cover.height*r);
      ctx.restore();
    }
    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(x, y, cardW, cardH-32, 14, true);

    // 關卡名
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.fillText((s.id) + '. ' + s.name, x + cardW/2, y + 18);

    // 底部資訊
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 14px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.fillText('最佳 ' + loadBest(s.id) + ' m', x + cardW/2, y + cardH - 18);

    // 外框（選中高亮）
    ctx.lineWidth = isSel ? 3 : 1.5;
    ctx.strokeStyle = isSel ? '#ffd24a' : 'rgba(255,255,255,.35)';
    roundRect(x, y, cardW, cardH, 14, false, true);

    addButton({ x, y, w:cardW, h:cardH, action:'pickStage', stageId:s.id });
  }

  // 底部：開始、排行榜、返回
  const playBtn = { x: 20, y: H - 60, w: 140, h: 44, action:'startStage' };
  drawPillButton(playBtn.x, playBtn.y, playBtn.w, playBtn.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.fillText('開始第 ' + currentStage + ' 關', playBtn.x + playBtn.w/2, playBtn.y + playBtn.h/2);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  addButton(playBtn);

  const lbBtn = { x: 170, y: H - 60, w: 110, h: 44, action:'showLeader' };
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(lbBtn.x, lbBtn.y, lbBtn.w, lbBtn.h, 22, true);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.5;
  roundRect(lbBtn.x, lbBtn.y, lbBtn.w, lbBtn.h, 22, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = '14px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('排行榜', lbBtn.x + lbBtn.w/2, lbBtn.y + lbBtn.h/2);
  addButton(lbBtn);

  const backBtn = { x: 290, y: H - 60, w: 50, h: 44, action:'menu' };
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 22, true);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  roundRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 22, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px -apple-system, sans-serif';
  ctx.fillText('‹', backBtn.x + backBtn.w/2, backBtn.y + backBtn.h/2);
  addButton(backBtn);
}

function drawLeaderboard(){
  drawBackground();
  drawDimmer(0.7);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 26px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillText('排行榜 第 ' + leaderStage + ' 關', W/2, 36);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // 關卡切換箭頭
  const prevBtn = { x: 20, y: 18, w: 40, h: 40, action:'leaderPrev' };
  const nextBtn = { x: W-60, y: 18, w: 40, h: 40, action:'leaderNext' };
  [prevBtn, nextBtn].forEach(b=>{
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(b.x, b.y, b.w, b.h, 20, true);
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    roundRect(b.x, b.y, b.w, b.h, 20, false, true);
  });
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px -apple-system, sans-serif';
  ctx.fillText('‹', prevBtn.x + prevBtn.w/2, prevBtn.y + prevBtn.h/2);
  ctx.fillText('›', nextBtn.x + nextBtn.w/2, nextBtn.y + nextBtn.h/2);
  addButton(prevBtn); addButton(nextBtn);

  // 清單
  const listX = 24, listY = 80, rowH = 36;
  ctx.textAlign = 'left';
  if(leaderLoading){
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = '15px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('載入中…', W/2, 160);
  } else if(leaderError){
    ctx.fillStyle = '#ff8a8a';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(leaderError, W/2, 160);
  } else if(leaderRows.length === 0){
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '15px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('尚無紀錄', W/2, 160);
  } else {
    for(let i=0;i<leaderRows.length;i++){
      const r = leaderRows[i];
      const y = listY + i*rowH;
      ctx.fillStyle = i<3 ? 'rgba(255,210,74,.15)' : 'rgba(255,255,255,.06)';
      roundRect(listX, y, W-48, rowH-6, 10, true);
      // 名次
      ctx.fillStyle = i===0 ? '#ffd24a' : i===1 ? '#cfe3ff' : i===2 ? '#ffb37a' : '#fff';
      ctx.font = 'bold 16px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('#' + (i+1), listX + 10, y + (rowH-6)/2);
      // 名字
      ctx.fillStyle = '#fff';
      ctx.font = '14px -apple-system, "Microsoft JhengHei", sans-serif';
      ctx.fillText(String(r.name).slice(0,16), listX + 52, y + (rowH-6)/2);
      // 分數
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(r.score + ' m', W - listX - 10, y + (rowH-6)/2);
    }
  }

  // 返回
  const backBtn = { x: W/2 - 70, y: H - 60, w: 140, h: 44, action:'back' };
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 22, true);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  roundRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 22, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = '15px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('返回', backBtn.x + backBtn.w/2, backBtn.y + backBtn.h/2);
  addButton(backBtn);
}

function loadLeader(stage){
  leaderStage = stage;
  leaderLoading = true;
  leaderError = '';
  leaderRows = [];
  if(!window.Leaderboard){
    leaderError = '排行榜服務未載入';
    leaderLoading = false;
    return;
  }
  window.Leaderboard.getTop(stage, 10).then(rows=>{
    leaderRows = rows || [];
    leaderLoading = false;
  }).catch(err=>{
    leaderError = '載入失敗';
    leaderLoading = false;
  });
}

const nameEditor = document.getElementById('nameEditor');
const nameInput = document.getElementById('nameInput');
const nameOkBtn = document.getElementById('nameOk');
const nameCancelBtn = document.getElementById('nameCancel');
let nameCallback = null;

function askName(cb){
  nameCallback = cb || null;
  nameInput.value = playerName || '';
  nameEditor.hidden = false;
  setTimeout(()=>{ nameInput.focus(); nameInput.select(); }, 30);
}
function closeNameEditor(save){
  nameEditor.hidden = true;
  if(save){
    const n = nameInput.value.trim().slice(0,16);
    if(n){ playerName = n; localStorage.setItem('jumpup.name', n); }
  }
  const cb = nameCallback; nameCallback = null;
  if(cb) cb();
}
nameOkBtn.addEventListener('click', ()=>closeNameEditor(true));
nameCancelBtn.addEventListener('click', ()=>closeNameEditor(false));
nameInput.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); closeNameEditor(true); }
  else if(e.key === 'Escape'){ e.preventDefault(); closeNameEditor(false); }
});

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

  const resumeBtn = { x: W/2 - 110, y: 310, w: 220, h: 72, action:'resume' };
  drawPillButton(resumeBtn.x, resumeBtn.y, resumeBtn.w, resumeBtn.h);
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

  const restartBtn = { x: W/2 - 110, y: 360, w: 220, h: 72, action:'restart' };
  drawPillButton(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.fillText('再玩一次', W/2, restartBtn.y + restartBtn.h/2);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  addButton(restartBtn);

  // 查看排行榜
  const lbBtn = { x: W/2 - 100, y: 450, w: 95, h: 40, action:'gameOverLeader' };
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  roundRect(lbBtn.x, lbBtn.y, lbBtn.w, lbBtn.h, 20, true);
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1.5;
  roundRect(lbBtn.x, lbBtn.y, lbBtn.w, lbBtn.h, 20, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = '14px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('排行榜', lbBtn.x + lbBtn.w/2, lbBtn.y + lbBtn.h/2);
  addButton(lbBtn);

  // 主選單
  const menuBtn = { x: W/2 + 5, y: 450, w: 95, h: 40, action:'menu' };
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 20, true);
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1.5;
  roundRect(menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 20, false, true);
  ctx.fillStyle = '#fff';
  ctx.font = '14px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.fillText('主選單', menuBtn.x + menuBtn.w/2, menuBtn.y + menuBtn.h/2);
  addButton(menuBtn);

  // 暱稱提示（若未設定）
  if(!playerName){
    ctx.fillStyle = '#ff8a8a';
    ctx.font = '12px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.fillText('未設定暱稱，成績不會上傳排行榜', W/2, 510);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px -apple-system, "Microsoft JhengHei", sans-serif';
    ctx.fillText('已以 ' + playerName + ' 上傳', W/2, 510);
  }
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
  } else if(state === STATE.SELECT){
    drawStageSelect();
  } else if(state === STATE.LEADER){
    drawLeaderboard();
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

let lastClickedBtn = null;
function handleButton(action){
  GameAudio.click();
  switch(action){
    case 'start':    startGame(); break;
    case 'restart':  startGame(); break;
    case 'resume':   resumeGame(); break;
    case 'pause':    pauseGame(); break;
    case 'quit':
    case 'menu':     toMenu(); break;
    case 'mute':     GameAudio.toggleMute(); break;
    case 'gotoSelect': toSelect(); break;
    case 'editName':   askName(); break;
    case 'pickStage':
      if(lastClickedBtn && lastClickedBtn.stageId){
        currentStage = lastClickedBtn.stageId;
        best = loadBest(currentStage);
      }
      break;
    case 'startStage':
      if(!playerName){
        askName(()=>{ if(playerName){ best = loadBest(currentStage); startGame(); } });
        return;
      }
      best = loadBest(currentStage);
      startGame();
      break;
    case 'showLeader':
      state = STATE.LEADER;
      loadLeader(currentStage);
      break;
    case 'gameOverLeader':
      state = STATE.LEADER;
      loadLeader(currentStage);
      break;
    case 'leaderPrev':
      loadLeader(((leaderStage-1-1+6)%6)+1);
      break;
    case 'leaderNext':
      loadLeader((leaderStage % 6) + 1);
      break;
    case 'back':
      state = STATE.SELECT;
      break;
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
    lastClickedBtn = btn;
    handleButton(btn.action);
    return;
  }
  // 遊戲中：依點擊點與主角 x 判左右
  if(state === STATE.PLAY){
    const dx = x - player.x;
    pointerHeld = true;
    pointerTargetX = x;
    if(Math.abs(dx) < POINTER_DEADZONE) touchDir = 0;
    else touchDir = dx < 0 ? -1 : 1;
    if(canvas.setPointerCapture && e.pointerId != null){
      try{ canvas.setPointerCapture(e.pointerId); }catch{}
    }
  }
});
canvas.addEventListener('pointermove', e => {
  if(!pointerHeld || state !== STATE.PLAY) return;
  const { x } = eventToCanvas(e);
  pointerTargetX = x;
});
function releasePointer(){ if(pointerHeld){ pointerHeld = false; touchDir = 0; pointerTargetX = null; } }
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
window.addEventListener('blur', releasePointer);

// ============ 狀態切換 ============
function startGame(){
  GameAudio.init(); GameAudio.resume();
  best = loadBest(currentStage);
  initWorld();
  state = STATE.PLAY;
  GameAudio.playBGM();
}
function toSelect(){
  state = STATE.SELECT;
  best = loadBest(currentStage);
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
  best = loadBest(currentStage);
  requestAnimationFrame(loop);
})();

})();
