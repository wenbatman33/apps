// F1 鈴鹿大獎賽 — 主程式
import * as THREE from 'three';
import { PARAMS, TEAMS } from './params.js';
import { TrackPath, buildWorld } from './track.js';
import { createF1Car, loadF1Model, createModelCar, bakeStaticMeshes } from './car.js';
import { PlayerCar } from './physics.js';
import { AICar } from './ai.js';
import { HUD, fmtTime } from './hud.js';
import { EngineSound } from './sound.js';
import { initDevTool } from './dev.js';

// ---------- 基礎場景 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc4ec); // 穹頂外的備援色
scene.fog = new THREE.Fog(0xcfdfef, 250, PARAMS.graphics.fogDist);

// 天空漸層穹頂（canvas 垂直漸層：天頂深藍 → 地平線奶白）
{
  const c = document.createElement('canvas'); c.width = 1; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#2a64c8');   // 天頂
  grad.addColorStop(0.45, '#7fb0e8');
  grad.addColorStop(0.72, '#cfe2f4');  // 地平線
  grad.addColorStop(1.0, '#e8eef5');
  g.fillStyle = grad; g.fillRect(0, 0, 1, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2500, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  dome.position.set(-540, -60, -150); // 蓋住整個場地
  scene.add(dome);
}

const camera = new THREE.PerspectiveCamera(PARAMS.camera.fovBase, innerWidth / innerHeight, 0.5, 3000);

// 光照：天光 + 太陽（陰影跟著玩家走）
scene.add(new THREE.HemisphereLight(0xbdd5f2, 0x3a5230, 1.2));
const sun = new THREE.DirectionalLight(0xfff2dd, 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
sun.shadow.camera.far = 500;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
// 反向補光：避免背光面死黑
const fill = new THREE.DirectionalLight(0xcfe0f5, 0.5);
fill.position.set(-150, 80, -60);
scene.add(fill);

// 雲朵（壓扁的白球）
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  let s = 777;
  const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 14; i++) {
    const grp = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(14 + rng() * 18, 8, 6), mat);
      m.position.set((rng() - 0.5) * 60, (rng() - 0.5) * 6, (rng() - 0.5) * 26);
      m.scale.y = 0.4;
      grp.add(m);
    }
    grp.position.set(-1700 + rng() * 2400, 150 + rng() * 90, -700 + rng() * 1500);
    scene.add(grp);
  }
}

// ---------- 賽道 ----------
const path = new TrackPath();
const { gantryLights, ferris } = buildWorld(scene, path);

// ---------- 車輛 ----------
const player = new PlayerCar(path);
let playerVis = createF1Car(TEAMS[0].body, TEAMS[0].accent);
scene.add(playerVis.group);
// 各隊塗裝：以法拉利紅為基準做色相旋轉（sat/bright 做銀白）
const AI_LIVERIES = [
  { hue: 30, sat: 1.5, bright: 1.5 },   // 橘箭
  { hue: 165, sat: 1.25, bright: 1.55 },// 銀星（青）
  { hue: 235, sat: 1.35, bright: 1.3 }, // 深藍
  { hue: 140, sat: 1.35, bright: 1.35 },// 綠能
  { hue: 320, sat: 1.35, bright: 1.55 },// 粉電
  { hue: 0, sat: 0.12, bright: 1.8 },   // 白武（銀白）
  { hue: 200, sat: 1.35, bright: 1.5 }, // 藍翼
];

// 全車隊非同步升級為 Ferrari F1-75 模型（載入失敗就維持程序車）
loadF1Model().then(async (m) => {
  if (!m) return;
  // 先複製再加工（加工會改縮放/軸心，必須用原始場景複製）
  const clones = aiVis.map(() => m.clone(true));
  const newPlayer = createModelCar(m);
  await bakeStaticMeshes(newPlayer.group, { castShadow: true });
  scene.remove(playerVis.group);
  playerVis = newPlayer;
  scene.add(playerVis.group);
  for (let i = 0; i < aiVis.length; i++) {
    const v = createModelCar(clones[i], AI_LIVERIES[i % AI_LIVERIES.length], true);
    await bakeStaticMeshes(v.group, { castShadow: false });
    scene.remove(aiVis[i].group);
    aiVis[i] = v;
    scene.add(v.group);
  }
  syncVisuals(0);
  console.log('Ferrari F1-75 模型已載入並烘焙（玩家 + AI 全車隊）');
});

const aiCars = [], aiVis = [];
for (let i = 0; i < PARAMS.race.aiCount; i++) {
  const ai = new AICar(path, 1000 + i * 137);
  aiCars.push(ai);
  const v = createF1Car(TEAMS[i + 1].body, TEAMS[i + 1].accent);
  scene.add(v.group);
  aiVis.push(v);
}

// ---------- HUD / 音效 ----------
const hud = new HUD(path);
const sound = new EngineSound();

// ---------- 輸入 ----------
const keys = {};
addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); // 避免捲動/誤觸聚焦按鈕
  keys[e.code] = true;
  sound.resume();
  if (e.code === 'KeyR') game.restart();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Backquote' || e.code === 'F2') dev.toggle();
});
addEventListener('keyup', e => { keys[e.code] = false; });

// 靜音切換（M 鍵或畫面按鈕）
const muteBtn = document.getElementById('btn-mute');
function toggleMute() {
  const muted = sound.toggleMute();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  hud.showMsg(muted ? '🔇 靜音' : '🔊 音效開啟', 900);
}
muteBtn.addEventListener('click', () => { sound.resume(); toggleMute(); });
muteBtn.textContent = sound.muted ? '🔇' : '🔊'; // 還原記憶的靜音狀態

// 觸控
const touch = { left: 0, right: 0, gas: 0, brake: 0 };
if ('ontouchstart' in window) {
  document.body.classList.add('touch');
  const bind = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => { touch[key] = 1; sound.resume(); el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointerup', () => { touch[key] = 0; });
    el.addEventListener('pointercancel', () => { touch[key] = 0; });
  };
  bind('tb-left', 'left'); bind('tb-right', 'right'); bind('tb-gas', 'gas'); bind('tb-brake', 'brake');
}


// ---------- 比賽管理 ----------
const game = {
  phase: 'idle', // idle | lights | race | finished
  lightsT: 0, lightsOn: 0,
  raceStartT: 0,
  crossings: 0, prevS: 0,
  lapStartT: 0, lastMs: null, bestMs: null,
  finished: false,
  hud,

  setupGrid() {
    // 起跑排位：玩家 P8（最後），AI 在前
    const slot = (i) => ({ s: path.wrap(path.total - 14 - i * 8), lat: i % 2 === 0 ? 3.0 : -3.0 });
    aiCars.forEach((ai, i) => { const p = slot(i); ai.placeAt(p.s, p.lat); ai.lap = 0; ai.frozen = true; });
    const p = slot(aiCars.length);
    player.placeAt(p.s, p.lat);
    player.frozen = true;
    this.crossings = 0; this.prevS = player.lapS;
    this.lastMs = null; this.bestMs = null;
    this.finished = false;
    hud.hideResults();
    syncVisuals(0);
    // 攝影機立即就位
    const fwd = new THREE.Vector3(Math.cos(player.heading), 0, -Math.sin(player.heading));
    camera.position.copy(player.pos).addScaledVector(fwd, -PARAMS.camera.dist).add(new THREE.Vector3(0, PARAMS.camera.height, 0));
  },

  restart() {
    this.setupGrid();
    this.phase = 'lights';
    this.lightsT = clock.elapsedTime + 1.2;
    this.lightsOn = 0;
    hud.setLights(0);
    hud.showMsg('鈴鹿大獎賽 · ' + PARAMS.race.laps + ' 圈', 2200);
  },

  go() {
    this.phase = 'race';
    player.frozen = false;
    aiCars.forEach(a => { a.frozen = false; });
    this.raceStartT = this.lapStartT = clock.elapsedTime;
    hud.setLights(null);
    gantryLights.forEach(m => { m.color.setHex(0x2a0d0d); m.emissive.setHex(0); });
    hud.showMsg('起跑！', 1100);
    sound.beep(880, 0.5, 0.3);
  },

  // 與 AICar.progress()（lap*total+s，lap 從 0 起算）同基準
  playerProgress() { return this.crossings * path.total + player.lapS; },

  previewResults() { // dev 工具用
    this.showFinalResults(true);
  },

  showFinalResults(preview = false) {
    const totalT = (clock.elapsedTime - this.raceStartT) * 1000;
    const pProg = this.playerProgress();
    const rows = [];
    const entries = [{ name: TEAMS[0].name, color: TEAMS[0].body, prog: pProg, me: true }];
    aiCars.forEach((a, i) => entries.push({ name: TEAMS[i + 1].name, color: TEAMS[i + 1].body, prog: a.progress(), me: false }));
    // AI lap 從 0 起算、玩家 lap 從 1，progress 定義已對齊，可直接比較
    entries.sort((a, b) => b.prog - a.prog);
    entries.forEach((e, i) => {
      const gap = (entries[0].prog - e.prog) / 55; // 以均速估差距秒數
      rows.push({
        pos: i + 1, name: e.name, color: e.color, me: e.me,
        time: i === 0 ? fmtTime(totalT) : '+' + gap.toFixed(2) + 's',
      });
    });
    hud.showResults(rows, entries[0].me);
    if (!preview) this.phase = 'finished';
  },
};

document.getElementById('res-restart').onclick = () => game.restart();

// ---------- 視覺同步 ----------
function syncVisuals(dt) {
  playerVis.group.position.copy(player.pos);
  playerVis.group.rotation.y = player.heading;
  playerVis.updateWheels(dt, player.speed, player.steerAngle);
  playerVis.rearLight.material.emissiveIntensity = (keys.Space || keys.ArrowDown || keys.KeyS || touch.brake) ? 2.5 : 0.6;
  aiCars.forEach((a, i) => {
    aiVis[i].group.position.copy(a.pos);
    aiVis[i].group.rotation.y = a.heading;
    aiVis[i].updateWheels(dt, a.speed, 0);
  });
}

// ---------- 碰撞（簡易圓形推開） ----------
function collide() {
  const all = [{ kind: 'p' }, ...aiCars.map(a => ({ kind: 'ai', a }))];
  const posOf = (e) => e.kind === 'p' ? player.pos : e.a.pos;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const A = posOf(all[i]), B = posOf(all[j]);
    const dx = B.x - A.x, dz = B.z - A.z;
    const d2 = dx * dx + dz * dz, R = 2.7;
    if (d2 > R * R || d2 < 1e-6) continue;
    const d = Math.sqrt(d2), push = (R - d) / 2;
    const nx = dx / d, nz = dz / d;
    const apply = (e, sx, sz) => {
      if (e.kind === 'p') { player.pos.x += sx; player.pos.z += sz; player.speed *= 0.99; }
      else {
        const sm = e.a._sm;
        e.a.lat += sx * sm.nor.x + sz * sm.nor.z;
        e.a.speed *= 0.99;
      }
    };
    apply(all[i], -nx * push, -nz * push);
    apply(all[j], nx * push, nz * push);
  }
}

// ---------- 攝影機 ----------
const camTarget = new THREE.Vector3();
let shake = 0;
function updateCamera(dt) {
  const C = PARAMS.camera;
  const fwd = new THREE.Vector3(Math.cos(player.heading), 0, -Math.sin(player.heading));
  const want = new THREE.Vector3().copy(player.pos).addScaledVector(fwd, -C.dist);
  want.y = player.pos.y + C.height;
  const k = Math.min(1, C.lag * dt);
  camera.position.lerp(want, k);
  // 不讓攝影機掉進路面下
  const near = path.nearest(camera.position.x, camera.position.z, player.hintIdx);
  const smc = path.sample(near.s);
  camera.position.y = Math.max(camera.position.y, smc.pos.y + 1.6);

  camTarget.copy(player.pos).addScaledVector(fwd, C.lookAhead);
  camTarget.y += 1.2;
  shake = Math.max(0, shake - dt * 3);
  if (player.onGrass && player.speed > 8) shake = Math.min(0.5, shake + dt * 4);
  if (shake > 0.01) {
    camTarget.x += (Math.random() - 0.5) * shake;
    camTarget.y += (Math.random() - 0.5) * shake * 0.6;
  }
  camera.lookAt(camTarget);
  camera.fov = C.fovBase + C.fovSpeed * (player.speed / PARAMS.physics.topSpeed);
  camera.updateProjectionMatrix();

  // 太陽跟著玩家（陰影區域）
  sun.position.copy(player.pos).add(new THREE.Vector3(120, 180, 80));
  sun.target.position.copy(player.pos);
}

// ---------- DEV 工具 ----------
const dev = initDevTool(game);

// ---------- 主迴圈 ----------
const clock = new THREE.Clock();
game.setupGrid();
game.restart();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // 起跑燈序列
  if (game.phase === 'lights') {
    if (game.lightsOn < 5 && t > game.lightsT) {
      game.lightsOn++;
      game.lightsT = t + (game.lightsOn === 5 ? 0.7 + Math.random() * 1.0 : 0.85);
      hud.setLights(game.lightsOn);
      sound.beep(440, 0.18);
      // 門架實體燈同步
      gantryLights.forEach((m, i) => {
        if (i < game.lightsOn) { m.color.setHex(0xff2222); m.emissive.setHex(0xff2222); m.emissiveIntensity = 1.5; }
      });
    } else if (game.lightsOn === 5 && t > game.lightsT) {
      game.go();
    }
  }

  // 物理更新
  const input = game.phase === 'race' ? {
    throttle: (keys.ArrowUp || keys.KeyW || touch.gas) ? 1 : 0,
    brake: (keys.Space || keys.ArrowDown || keys.KeyS || touch.brake) ? 1 : 0,
    steer: ((keys.ArrowLeft || keys.KeyA || touch.left) ? 1 : 0) - ((keys.ArrowRight || keys.KeyD || touch.right) ? 1 : 0),
  } : { throttle: 0, brake: 1, steer: 0 };

  // 固定步長子迭代，高速時物理更穩
  const sub = 2;
  for (let k = 0; k < sub; k++) {
    player.update(dt / sub, input);
    // AI 閃避對象含玩家（包成同介面）
    const playerProxy = {
      progress: () => game.playerProgress(),
      latPos: () => player.latNow || 0,
      speedVal: () => player.speed,
    };
    const everyone = [...aiCars, playerProxy];
    aiCars.forEach(a => a.update(dt / sub, everyone));
    collide();
  }

  // 圈數判定（crossings：過線次數。第 1 次過線 = 開始第 1 圈，之後每次過線記一圈）
  if (game.phase === 'race') {
    if (game.prevS > path.total * 0.9 && player.lapS < path.total * 0.1) {
      game.crossings++;
      if (game.crossings === 1) {
        game.lapStartT = t; // 起跑後首次過線：第 1 圈計時開始
      } else {
        const lapMs = (t - game.lapStartT) * 1000;
        game.lapStartT = t;
        game.lastMs = lapMs;
        if (game.bestMs == null || lapMs < game.bestMs) {
          game.bestMs = lapMs;
          hud.showMsg('🟣 最速圈 ' + fmtTime(lapMs), 1800);
        }
        if (game.crossings > PARAMS.race.laps) {
          game.showFinalResults();
        } else {
          hud.showMsg(game.crossings === PARAMS.race.laps ? '最後一圈！' : `LAP ${game.crossings}/${PARAMS.race.laps}`, 1400);
        }
      }
    }
    game.prevS = player.lapS;
  }

  syncVisuals(dt);
  updateCamera(dt);
  if (ferris) ferris.rotation.z += dt * 0.06;

  // HUD
  if (game.phase === 'race' || game.phase === 'lights') {
    const pProg = game.playerProgress();
    let ahead = 0, minGap = Infinity;
    for (const a of aiCars) {
      const diff = a.progress() - pProg;
      if (diff > 0) { ahead++; minGap = Math.min(minGap, diff); }
    }
    const gapStr = ahead === 0 ? '🏆 領先' : '+' + (minGap / Math.max(player.speed, 20)).toFixed(1) + 's';
    hud.update({
      posIdx: ahead + 1, lap: Math.min(Math.max(game.crossings, 1), PARAMS.race.laps), laps: PARAMS.race.laps,
      speed: player.speed,
      curMs: game.phase === 'race' ? (t - game.lapStartT) * 1000 : null,
      lastMs: game.lastMs, bestMs: game.bestMs, gapStr,
    });
    hud.drawMap([{ pos: player.pos }, ...aiCars], 0);
  }

  // 引擎聲
  if (hud.gearInfo) {
    const { lo, hi, kmh } = hud.gearInfo;
    const rpm01 = Math.min(1, Math.max(0, (kmh - lo) / Math.max(hi - lo, 1)));
    sound.update(rpm01, Math.abs(player.speed) / PARAMS.physics.topSpeed, input.throttle);
  }

  renderer.render(scene, camera);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// 除錯把手（自動化測試用）
window.__f1 = { game, player, aiCars, path, PARAMS, scene, get playerVis() { return playerVis; } };
