import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
// LAYOUT — 所有可微調參數（DEV 面板按 D 開啟，可即時調整＋匯出）
// ============================================================
const LAYOUT = {
  camX: 0, camY: 3.4, camZ: 6.2,        // 攝影機相對玩家位置
  camLookY: 1.2, fov: 62,
  laneWidth: 2.2,                        // 跑道間距
  baseSpeed: 12, maxSpeed: 34, accel: 0.18, // 速度（m/s）
  jumpVel: 11.5, gravity: 30,
  playerScale: 0.42, playerRotY: 180,    // 模型縮放/朝向（度）
  laneLerp: 12,                          // 換道平滑速度
  fogNear: 40, fogFar: 95,
  spawnDist: 90,                         // 物件生成距離
  ringScale: 1.0, runAnimBase: 1.0,
  skyTop: '#1e90ff', skyBottom: '#aee4ff',
  groundColor: '#3aa13f', roadColor: '#8a6f4d',
};
const LAYOUT_MOBILE = { ...LAYOUT, fov: 70, camY: 3.8, camZ: 6.8 };
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || innerWidth < 700;
let L = isMobile ? { ...LAYOUT_MOBILE } : { ...LAYOUT };

// 角色模型設定（DEV 面板可切換）
const MODELS = {
  robot:   { url: 'assets/models/RobotExpressive.glb', scale: 0.42, run: ['Running', 'Run'], jump: ['Jump'], death: ['Death'], runSpeed: 1.0 },
  fox:     { url: 'assets/models/Fox.glb',             scale: 0.024, run: ['Run'], jump: [], death: [], runSpeed: 1.6 },
  soldier: { url: 'assets/models/Soldier.glb',         scale: 1.05, run: ['Run'], jump: [], death: [], runSpeed: 1.0 },
};
let currentModelKey = localStorage.getItem('sd_model') || 'robot';

// ============================================================
// 基礎場景（效能取向：無即時陰影、pixelRatio 封頂、共用材質）
// ============================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(L.fov, innerWidth / innerHeight, 0.1, 220);

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x3a5f2f, 1.1));
const sun = new THREE.DirectionalLight(0xfff4d6, 1.6);
sun.position.set(-6, 12, 4);
scene.add(sun);

// 天空漸層（canvas 貼圖，零成本）
function makeSky() {
  const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256;
  const g = cv.getContext('2d').createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, L.skyTop); g.addColorStop(1, L.skyBottom);
  const ctx = cv.getContext('2d'); ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
makeSky();
scene.fog = new THREE.Fog(new THREE.Color(L.skyBottom), L.fogNear, L.fogFar);

// ============================================================
// 地面 — 固定幾何 + 捲動 UV（不移動幾何體，效能極佳）
// ============================================================
function checkerTexture(c1, c2, tiles = 4) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  const s = 128 / tiles;
  for (let y = 0; y < tiles; y++) for (let x = 0; x < tiles; x++) {
    ctx.fillStyle = (x + y) % 2 ? c1 : c2; ctx.fillRect(x * s, y * s, s, s);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function roadTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = L.roadColor; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([26, 22]); ctx.lineWidth = 5;
  for (const x of [256 / 3, 512 / 3]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  ctx.setLineDash([]); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 8;
  ctx.strokeRect(4, -10, 248, 276);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const TRACK_LEN = 240;
const roadTex = roadTexture(); roadTex.repeat.set(1, TRACK_LEN / 8);
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(L.laneWidth * 3 + 0.6, TRACK_LEN),
  new THREE.MeshLambertMaterial({ map: roadTex })
);
road.rotation.x = -Math.PI / 2; road.position.z = -TRACK_LEN / 2 + 20;
scene.add(road);

const grassTex = checkerTexture('#3aa13f', '#2f8a34', 2); grassTex.repeat.set(8, TRACK_LEN / 4);
const grassL = new THREE.Mesh(new THREE.PlaneGeometry(40, TRACK_LEN), new THREE.MeshLambertMaterial({ map: grassTex }));
grassL.rotation.x = -Math.PI / 2; grassL.position.set(-(L.laneWidth * 3) / 2 - 20.3, -0.02, -TRACK_LEN / 2 + 20);
const grassR = grassL.clone(); grassR.position.x = -grassL.position.x;
scene.add(grassL, grassR);

// ============================================================
// 共用幾何 / 材質（全部物件共用，降低 draw call 與記憶體）
// ============================================================
const GEO = {
  ring: new THREE.TorusGeometry(0.42, 0.09, 8, 20),
  spike: new THREE.ConeGeometry(0.45, 1.1, 8),
  crate: new THREE.BoxGeometry(1.5, 1.5, 1.5),
  trunk: new THREE.CylinderGeometry(0.18, 0.26, 3.2, 6),
  leaf: new THREE.ConeGeometry(1.4, 1.2, 7),
  shadow: new THREE.CircleGeometry(0.55, 16),
};
const MAT = {
  ring: new THREE.MeshStandardMaterial({ color: 0xffc400, metalness: 0.8, roughness: 0.25, emissive: 0x6b4d00 }),
  spike: new THREE.MeshLambertMaterial({ color: 0x9aa4b5 }),
  crate: new THREE.MeshLambertMaterial({ color: 0xb5722f }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x2e8b3d }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }),
};

// ============================================================
// 物件池
// ============================================================
function makePool(create, n) {
  const pool = [];
  for (let i = 0; i < n; i++) { const o = create(); o.visible = false; o.userData.active = false; scene.add(o); pool.push(o); }
  return {
    pool,
    get() { const o = pool.find(p => !p.userData.active); if (o) { o.userData.active = true; o.visible = true; } return o; },
    release(o) { o.userData.active = false; o.visible = false; },
    each(fn) { for (const o of pool) if (o.userData.active) fn(o); },
  };
}
const rings = makePool(() => new THREE.Mesh(GEO.ring, MAT.ring), 60);
const spikes = makePool(() => new THREE.Mesh(GEO.spike, MAT.spike), 24);
const crates = makePool(() => new THREE.Mesh(GEO.crate, MAT.crate), 16);
const trees = makePool(() => {
  const g = new THREE.Group();
  const t = new THREE.Mesh(GEO.trunk, MAT.trunk); t.position.y = 1.6;
  const l1 = new THREE.Mesh(GEO.leaf, MAT.leaf); l1.position.y = 3.6;
  const l2 = new THREE.Mesh(GEO.leaf, MAT.leaf); l2.position.y = 4.3; l2.scale.setScalar(0.7);
  g.add(t, l1, l2); return g;
}, 26);

// ============================================================
// 玩家
// ============================================================
const player = new THREE.Group(); scene.add(player);
const blob = new THREE.Mesh(GEO.shadow, MAT.shadow);
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; scene.add(blob);

let mixer = null, actions = {}, modelRoot = null, modelCfg = MODELS[currentModelKey];
const loader = new GLTFLoader();
function pickClip(clips, names) { for (const n of names) { const c = clips.find(c => c.name === n); if (c) return c; } return null; }
function loadModel(key) {
  modelCfg = MODELS[key]; currentModelKey = key; localStorage.setItem('sd_model', key);
  loader.load(modelCfg.url, (gltf) => {
    if (modelRoot) player.remove(modelRoot);
    modelRoot = gltf.scene;
    modelRoot.scale.setScalar(modelCfg.scale * L.playerScale / 0.42);
    modelRoot.rotation.y = THREE.MathUtils.degToRad(L.playerRotY);
    player.add(modelRoot);
    mixer = new THREE.AnimationMixer(modelRoot);
    actions = {};
    const run = pickClip(gltf.animations, modelCfg.run);
    const jump = pickClip(gltf.animations, modelCfg.jump);
    const death = pickClip(gltf.animations, modelCfg.death);
    if (run) { actions.run = mixer.clipAction(run); actions.run.play(); }
    if (jump) { actions.jump = mixer.clipAction(jump); actions.jump.setLoop(THREE.LoopOnce); actions.jump.clampWhenFinished = true; }
    if (death) { actions.death = mixer.clipAction(death); actions.death.setLoop(THREE.LoopOnce); actions.death.clampWhenFinished = true; }
  });
}
loadModel(currentModelKey);

// ============================================================
// 音效（WebAudio 合成，零資源檔）
// ============================================================
let AC = null;
function beep(freq, dur = 0.08, type = 'sine', vol = 0.18) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  } catch (e) { /* 無聲環境忽略 */ }
}

// ============================================================
// 遊戲狀態
// ============================================================
const state = {
  running: false, dead: false,
  lane: 0,                 // -1 / 0 / 1
  speed: L.baseSpeed,
  py: 0, vy: 0, jumping: false,
  dist: 0, ringCount: 0, score: 0,
  nextSpawnZ: -30, nextTreeZ: -10,
  slowmo: false,
};
const $score = document.getElementById('score');
const $rings = document.getElementById('ringCount');
const $overlay = document.getElementById('overlay');
const $startBtn = document.getElementById('startBtn');

function resetGame() {
  state.running = true; state.dead = false;
  state.lane = 0; state.speed = L.baseSpeed;
  state.py = 0; state.vy = 0; state.jumping = false;
  state.dist = 0; state.ringCount = 0; state.score = 0;
  state.nextSpawnZ = -30; state.nextTreeZ = -10;
  rings.each(o => rings.release(o)); spikes.each(o => spikes.release(o));
  crates.each(o => crates.release(o)); trees.each(o => trees.release(o));
  player.position.set(0, 0, 0);
  if (actions.death) { actions.death.stop(); }
  if (actions.run) { actions.run.reset().play(); }
  tut.active = false; tut.crate = null;
  $tut.classList.add('hidden');
  $overlay.classList.add('hidden');
}
// ============================================================
// 新手教學（首次自動進入；換道 → 跳躍 → 吃金環 → 閃障礙）
// ============================================================
const tut = { active: false, step: -1, timer: 0, crate: null, startRings: 0 };
const $tut = document.getElementById('tut');
function tutMsg(main, sub = '') {
  $tut.innerHTML = `${main}${sub ? `<div class="sub">${sub}</div>` : ''}`;
  $tut.classList.remove('hidden', 'pop');
  void $tut.offsetWidth; // 重新觸發動畫
  $tut.classList.add('pop');
}
const TUT_STEPS = [
  () => tutMsg('👋 跟著做就好！', isMobile ? '左右滑動 切換跑道' : '按 ← → 切換跑道'),
  () => tutMsg('✓ 漂亮！再來跳躍', isMobile ? '上滑或點一下螢幕 跳躍' : '按 Space 或 ↑ 跳躍'),
  () => { tutMsg('✓ 很好！收集金環', '吃 3 個金環試試 ⭕'); tut.startRings = state.ringCount; tutSpawnRings(); },
  () => { tutMsg('⚠️ 小心障礙物！', '跳過木箱，撞到會結束遊戲'); tutSpawnCrate(); },
  () => { tutMsg('🎉 教學完成！', '速度要上來了，衝吧！'); tut.timer = 1.6; },
];
function advanceTut() {
  beep(880, .1, 'sine', .15);
  tut.step++;
  TUT_STEPS[tut.step]();
}
function tutSpawnRings() {
  for (let i = 0; i < 5; i++) {
    const o = rings.get(); if (!o) break;
    o.position.set(laneX(state.lane), 0.7, -28 - i * 1.8);
  }
}
function tutSpawnCrate() {
  const c = crates.get(); if (!c) return;
  c.position.set(laneX(state.lane), 0.75, -32);
  tut.crate = c;
}
function startTutorial() {
  beep(660, .12, 'square');
  resetGame();
  tut.active = true; tut.step = -1; tut.crate = null; tut.timer = 0;
  advanceTut();
}
function endTutorial() {
  localStorage.setItem('sd_tut', '1');
  tut.active = false; tut.crate = null;
  $tut.classList.add('hidden');
  state.score = 0; state.dist = 0; // 教學不計分，正式起跑
  $startBtn.textContent = '開始遊戲';
}
const $tutBtn = document.getElementById('tutBtn');
$tutBtn.addEventListener('click', startTutorial);
if (!localStorage.getItem('sd_tut')) $startBtn.textContent = '開始遊戲（含新手教學）';
$startBtn.addEventListener('click', () => {
  if (!localStorage.getItem('sd_tut')) { startTutorial(); return; }
  beep(660, .12, 'square'); resetGame();
});

function gameOver() {
  state.running = false; state.dead = true;
  beep(160, .4, 'sawtooth', .25);
  if (actions.run) actions.run.fadeOut(0.15);
  if (actions.death) actions.death.reset().fadeIn(0.1).play();
  $overlay.querySelector('h1').textContent = 'GAME OVER';
  $overlay.querySelectorAll('p').forEach((p, i) => {
    if (i === 0) { p.className = 'final'; p.textContent = `SCORE ${Math.floor(state.score)}　⭕ ${state.ringCount}`; }
    else p.textContent = '';
  });
  $startBtn.textContent = '再來一次';
  $overlay.classList.remove('hidden');
}

// ============================================================
// 生成邏輯（距離驅動，物件向 +z 移動）
// ============================================================
const laneX = (i) => i * L.laneWidth;
function spawnPattern(z) {
  const r = Math.random();
  const lanes = [-1, 0, 1];
  if (r < 0.45) {
    // 一排金環（單一車道直線 5 顆，偶爾跳躍弧線）
    const lane = lanes[(Math.random() * 3) | 0];
    const arc = Math.random() < 0.3;
    for (let i = 0; i < 5; i++) {
      const o = rings.get(); if (!o) break;
      const t = i / 4;
      o.position.set(laneX(lane), arc ? 0.7 + Math.sin(t * Math.PI) * 1.6 : 0.7, z - i * 1.6);
    }
    if (arc) { // 弧線前放個箱子引導跳躍
      const c = crates.get(); if (c) c.position.set(laneX(lane), 0.75, z + 2.2);
    }
  } else if (r < 0.75) {
    // 尖刺：封 1~2 條道
    const block = Math.random() < 0.5 ? 1 : 2;
    const shuffled = lanes.sort(() => Math.random() - 0.5);
    for (let i = 0; i < block; i++) {
      const o = spikes.get(); if (!o) break;
      o.position.set(laneX(shuffled[i]), 0.55, z);
    }
    // 留活道上放金環
    const free = shuffled[2];
    for (let i = 0; i < 3; i++) { const o = rings.get(); if (o) o.position.set(laneX(free), 0.7, z - i * 1.4); }
  } else {
    // 木箱牆（可跳過）：單道箱子 + 上方金環
    const lane = lanes[(Math.random() * 3) | 0];
    const c = crates.get(); if (c) c.position.set(laneX(lane), 0.75, z);
    const o = rings.get(); if (o) o.position.set(laneX(lane), 2.6, z);
  }
}
function spawnTree(z) {
  const o = trees.get(); if (!o) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  o.position.set(side * (L.laneWidth * 1.5 + 1.8 + Math.random() * 5), 0, z);
  o.rotation.y = Math.random() * Math.PI * 2;
}

// ============================================================
// 輸入：鍵盤 + 觸控滑動
// ============================================================
function moveLane(dir) {
  if (!state.running) return;
  const prev = state.lane;
  state.lane = THREE.MathUtils.clamp(state.lane + dir, -1, 1);
  beep(440 + dir * 60, .05, 'triangle', .08);
  if (tut.active && tut.step === 0 && state.lane !== prev) advanceTut();
}
function jump() {
  if (!state.running || state.jumping) return;
  state.jumping = true; state.vy = L.jumpVel;
  if (tut.active && tut.step === 1) advanceTut();
  beep(520, .1, 'square', .12);
  if (actions.jump) { actions.jump.reset().play(); if (actions.run) actions.run.fadeOut(0.08); }
}
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': moveLane(-1); break;
    case 'ArrowRight': case 'KeyD': if (!devOpen) moveLane(1); break;
    case 'ArrowUp': case 'KeyW': case 'Space': jump(); break;
    case 'Enter': if (!state.running) { resetGame(); } break;
  }
  if (e.code === 'KeyD' && e.shiftKey) toggleDev(); // Shift+D 開 DEV
});
// 觸控：touchmove 即時判定（更跟手），點一下＝跳躍，UI 面板上的觸碰忽略
let touch = null;
const onUI = (e) => e.target.closest && e.target.closest('#devPanel, #overlay, #devBtn');
addEventListener('touchstart', (e) => {
  if (onUI(e)) { touch = null; return; }
  const t = e.touches[0];
  touch = { x: t.clientX, y: t.clientY, t0: performance.now(), used: false };
}, { passive: true });
addEventListener('touchmove', (e) => {
  if (!touch || touch.used) return;
  const t = e.touches[0];
  const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) { moveLane(dx > 0 ? 1 : -1); touch.used = true; }
  else if (dy < -36 && Math.abs(dy) > Math.abs(dx)) { jump(); touch.used = true; }
}, { passive: true });
addEventListener('touchend', () => {
  if (touch && !touch.used && performance.now() - touch.t0 < 250) jump(); // 點一下＝跳
  touch = null;
}, { passive: true });

// ============================================================
// 主迴圈
// ============================================================
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  step(Math.min(clock.getDelta(), 0.05));
}
function step(dt) {
  if (state.slowmo) dt *= 0.25;

  if (state.running) {
    // 加速（教學中固定慢速）
    if (tut.active) state.speed = 8;
    else state.speed = Math.min(L.maxSpeed, state.speed + L.accel * dt * 10);
    const dz = state.speed * dt;
    state.dist += dz;
    state.score += dz;

    // UV 捲動製造前進感（幾何不動）
    roadTex.offset.y += dz / 8;
    grassTex.offset.y += dz / 4;

    // 玩家橫移 + 跳躍
    const targetX = laneX(state.lane);
    player.position.x += (targetX - player.position.x) * Math.min(1, L.laneLerp * dt);
    if (state.jumping) {
      state.vy -= L.gravity * dt;
      state.py += state.vy * dt;
      if (state.py <= 0) {
        state.py = 0; state.jumping = false;
        if (actions.run && actions.jump) { actions.jump.fadeOut(0.1); actions.run.reset().fadeIn(0.1).play(); }
      }
    }
    player.position.y = state.py;
    blob.position.x = player.position.x;
    blob.position.z = player.position.z;
    blob.scale.setScalar(Math.max(0.4, 1 - state.py * 0.18));

    // 物件向玩家移動 + 回收 + 碰撞
    const px = player.position.x, py = state.py;
    rings.each(o => {
      o.position.z += dz; o.rotation.y += dt * 4;
      if (o.position.z > 8) return rings.release(o);
      if (Math.abs(o.position.z) < 0.6 && Math.abs(o.position.x - px) < 0.7 && Math.abs(o.position.y - (py + 0.7)) < 1.0) {
        rings.release(o); state.ringCount++; state.score += 10;
        beep(1180, .07, 'sine', .15); beep(1560, .09, 'sine', .1);
      }
    });
    const hitCheck = (o, hw, hh) =>
      Math.abs(o.position.z) < 0.55 && Math.abs(o.position.x - px) < hw && py < hh;
    spikes.each(o => {
      o.position.z += dz;
      if (o.position.z > 8) return spikes.release(o);
      if (hitCheck(o, 0.75, 0.8)) gameOver();
    });
    crates.each(o => {
      o.position.z += dz;
      if (o.position.z > 8) return crates.release(o);
      if (hitCheck(o, 0.95, 1.3)) {
        if (tut.active) { // 教學中撞到不死，重試
          beep(180, .2, 'sawtooth', .18);
          crates.release(o);
          if (tut.crate === o) { tut.crate = null; tut.timer = 1.2; tutMsg('💥 撞到了！沒關係再來', isMobile ? '上滑或點一下 跳過木箱' : '按 Space 跳過木箱'); }
        } else gameOver();
      }
    });
    trees.each(o => { o.position.z += dz; if (o.position.z > 12) trees.release(o); });

    // 生成（以世界座標距離節奏；教學中只長樹當風景，關卡物件由教學腳本控制）
    state.nextSpawnZ += dz; state.nextTreeZ += dz;
    if (!tut.active) {
      while (state.nextSpawnZ > -L.spawnDist) { spawnPattern(state.nextSpawnZ - L.spawnDist); state.nextSpawnZ -= 9 + Math.random() * 7; }
    } else state.nextSpawnZ = Math.min(state.nextSpawnZ, -20);
    while (state.nextTreeZ > -L.spawnDist) { spawnTree(state.nextTreeZ - L.spawnDist); state.nextTreeZ -= 5 + Math.random() * 6; }

    // 教學步驟監控
    if (tut.active) {
      tut.timer = Math.max(0, tut.timer - dt);
      if (tut.step === 2) {
        let alive = 0; rings.each(() => alive++);
        if (state.ringCount - tut.startRings >= 3) advanceTut();
        else if (alive === 0) tutSpawnRings(); // 沒吃到就再補一排
      } else if (tut.step === 3) {
        if (tut.crate && tut.crate.position.z > 2) advanceTut();          // 成功越過
        else if (!tut.crate && tut.timer <= 0) tutSpawnCrate();           // 撞掉後重生
      } else if (tut.step === 4 && tut.timer <= 0) {
        endTutorial();
      }
    }

    // 跑步動畫速度隨移動速度
    if (actions.run) actions.run.timeScale = modelCfg.runSpeed * L.runAnimBase * (0.7 + state.speed / L.maxSpeed);

    $score.textContent = Math.floor(state.score);
    $rings.textContent = state.ringCount;
  }

  if (mixer) mixer.update(dt);

  // 攝影機跟隨
  camera.position.set(player.position.x * 0.55 + L.camX, L.camY + state.py * 0.25, L.camZ);
  camera.lookAt(player.position.x * 0.7, L.camLookY + state.py * 0.4, -6);

  renderer.render(scene, camera);
}
tick();
window.__game = { renderer, scene, state, L, step }; // step 供測試手動推進

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ============================================================
// DEV 微調工具（Shift+D 或右下角 ⚙️）
// ============================================================
const $panel = document.getElementById('devPanel');
let devOpen = false;
function toggleDev() { devOpen = !devOpen; $panel.classList.toggle('hidden', !devOpen); if (devOpen) buildDev(); }
document.getElementById('devBtn').addEventListener('click', toggleDev);

const DEV_SCHEMA = [
  ['攝影機', [
    ['camX', -5, 5, 0.1], ['camY', 1, 10, 0.1], ['camZ', 2, 14, 0.1],
    ['camLookY', 0, 5, 0.1], ['fov', 40, 100, 1],
  ]],
  ['玩法', [
    ['laneWidth', 1.2, 4, 0.05], ['baseSpeed', 4, 24, 0.5], ['maxSpeed', 16, 60, 1],
    ['accel', 0.02, 0.6, 0.01], ['jumpVel', 5, 16, 0.1], ['gravity', 10, 50, 0.5],
    ['laneLerp', 4, 30, 0.5], ['spawnDist', 50, 150, 5],
  ]],
  ['外觀', [
    ['playerScale', 0.1, 2.5, 0.01], ['playerRotY', 0, 360, 1],
    ['fogNear', 10, 100, 1], ['fogFar', 40, 200, 1],
    ['ringScale', 0.4, 2, 0.05], ['runAnimBase', 0.4, 2.5, 0.05],
  ]],
];
function applyLayout() {
  camera.fov = L.fov; camera.updateProjectionMatrix();
  scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  if (modelRoot) {
    modelRoot.scale.setScalar(modelCfg.scale * L.playerScale / 0.42);
    modelRoot.rotation.y = THREE.MathUtils.degToRad(L.playerRotY);
  }
  rings.pool.forEach(o => o.scale.setScalar(L.ringScale));
}
function buildDev() {
  $panel.innerHTML = `<b>🔧 DEV 微調工具</b><div style="opacity:.6">${isMobile ? 'Mobile' : 'PC'} layout</div>`;
  for (const [title, rows] of DEV_SCHEMA) {
    const h = document.createElement('h3'); h.textContent = title; $panel.appendChild(h);
    for (const [key, min, max, step] of rows) {
      const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<label>${key}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${L[key]}"><span class="val">${L[key]}</span>`;
      const input = row.querySelector('input'), val = row.querySelector('.val');
      input.addEventListener('input', () => { L[key] = parseFloat(input.value); val.textContent = input.value; applyLayout(); });
      $panel.appendChild(row);
    }
  }
  const h = document.createElement('h3'); h.textContent = '角色模型'; $panel.appendChild(h);
  const mrow = document.createElement('div');
  for (const key of Object.keys(MODELS)) {
    const b = document.createElement('button');
    b.textContent = key + (key === currentModelKey ? ' ✓' : '');
    b.className = key === currentModelKey ? '' : 'alt';
    b.addEventListener('click', () => { loadModel(key); buildDev(); });
    mrow.appendChild(b);
  }
  $panel.appendChild(mrow);
  const h2 = document.createElement('h3'); h2.textContent = '狀態 / 匯出'; $panel.appendChild(h2);
  const actionsRow = document.createElement('div');
  const mk = (label, fn, alt) => { const b = document.createElement('button'); b.textContent = label; if (alt) b.className = 'alt'; b.addEventListener('click', fn); actionsRow.appendChild(b); };
  mk('💾 匯出 JSON', () => {
    const json = JSON.stringify(L, null, 2);
    console.log('LAYOUT =', json);
    navigator.clipboard?.writeText(json);
    alert('已複製到剪貼簿＆輸出到 console，跟 Claude 說「我調好了，鎖定」即可寫入程式碼');
  });
  mk('🐢 慢動作', () => { state.slowmo = !state.slowmo; }, true);
  mk('💀 觸發 GameOver', () => { if (state.running) gameOver(); }, true);
  mk('🔄 重新開始', () => resetGame(), true);
  $panel.appendChild(actionsRow);
}
