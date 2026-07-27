// 3D Casino 大廳 — 主程式
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { REDIRECT, MACHINES, LAYOUT } from './config.js?v=20';
import { buildMachine, updateMachine, buildCarouselTotem } from './machine.js?v=20';
import { buildCasino } from './casino.js?v=20';
import { initDev } from './dev.js?v=20';

const app = {
  scene: null, camera: null, renderer: null, composer: null, bloomPass: null,
  controls: null, refs: null,
  machineGroup: null, machines: [], spinners: [],
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  hovered: null, focused: null,
  savedCam: null,
  tweens: [],
  devMode: false,
  dragging: null,
  clock: new THREE.Clock(),
  frame: 0,
};
window.__app = app;   // 方便 debug

// ---------- 簡易補間 ----------
function tween(obj, to, dur, onDone) {
  const from = {};
  for (const k in to) from[k] = obj[k];
  app.tweens.push({ obj, from, to, dur, t: 0, onDone });
}
function tweenV3(v, to, dur, onDone) {
  app.tweens.push({ obj: v, from: v.clone(), to, dur, t: 0, isV3: true, onDone });
}
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function stepTweens(dt) {
  for (let i = app.tweens.length - 1; i >= 0; i--) {
    const tw = app.tweens[i];
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    const e = easeInOut(tw.t);
    if (tw.isV3) {
      tw.obj.lerpVectors(tw.from, tw.to, e);
    } else {
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    }
    if (tw.t >= 1) {
      app.tweens.splice(i, 1);
      tw.onDone && tw.onDone();
    }
  }
}

// ---------- 音效（WebAudio 合成，不需檔案）----------
let audioCtx = null;
function playTone(freq, dur, type = 'sine', gain = 0.08) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch (_) { /* 音效失敗不影響遊戲 */ }
}
const sfxClick = () => playTone(660, 0.08, 'triangle', 0.06);
const sfxDing = () => { playTone(880, 0.25, 'sine', 0.07); setTimeout(() => playTone(1320, 0.35, 'sine', 0.05), 90); };

// ---------- 初始化 ----------
function init() {
  const container = document.getElementById('app');
  app.renderer = new THREE.WebGLRenderer({ antialias: true });
  app.renderer.setSize(window.innerWidth, window.innerHeight);
  app.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  app.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  app.renderer.toneMappingExposure = LAYOUT.lights.exposure;
  container.appendChild(app.renderer.domElement);

  app.scene = new THREE.Scene();
  app.scene.fog = new THREE.FogExp2(new THREE.Color(LAYOUT.fog.color), LAYOUT.fog.density);

  // 環境反射（讓金屬與地板有高級質感）
  const pmrem = new THREE.PMREMGenerator(app.renderer);
  app.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  app.scene.environmentIntensity = 0.5;

  app.camera = new THREE.PerspectiveCamera(LAYOUT.camera.fov, window.innerWidth / window.innerHeight, 0.1, 120);
  app.camera.position.set(0, LAYOUT.camera.startY, LAYOUT.camera.startZ);

  app.controls = new OrbitControls(app.camera, app.renderer.domElement);
  app.controls.target.set(0, 1.5, 0);
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.06;
  app.controls.minDistance = LAYOUT.camera.minDist;
  app.controls.maxDistance = LAYOUT.camera.maxDist;
  app.controls.maxPolarAngle = THREE.MathUtils.degToRad(LAYOUT.camera.polarMaxDeg);
  app.controls.minPolarAngle = THREE.MathUtils.degToRad(LAYOUT.camera.polarMinDeg);
  app.controls.enablePan = false;

  // 場景
  app.refs = buildCasino(app.scene);
  rebuildMachines();

  // 後製 Bloom
  app.composer = new EffectComposer(app.renderer);
  app.composer.addPass(new RenderPass(app.scene, app.camera));
  app.bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    LAYOUT.bloom.strength, LAYOUT.bloom.radius, LAYOUT.bloom.threshold
  );
  app.composer.addPass(app.bloomPass);
  app.composer.addPass(new OutputPass());

  // 事件
  window.addEventListener('resize', onResize);
  const el = app.renderer.domElement;
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') toggleDev();
  });
  document.getElementById('devBtn').addEventListener('click', toggleDev);
  document.getElementById('btnPlay').addEventListener('click', launchGame);
  document.getElementById('btnBack').addEventListener('click', leaveMachine);

  // DEV 工具
  initDev(app, { rebuildMachines, applyLayout, triggerRandomWin });

  // 開場漸入
  requestAnimationFrame(() => { document.getElementById('fade').style.opacity = '0'; });

  app.renderer.setAnimationLoop(animate);
}

// ---------- 機台排列：中央圓形島台 + 兩側弧形機列（賭場式）----------
// 機台正面是本地 -Z；要讓正面朝向世界方向 (fx, fz) 時 rotY = atan2(-fx, -fz)
function faceTowards(fx, fz) {
  return Math.atan2(-fx, -fz);
}

function rebuildMachines() {
  if (app.machineGroup) {
    app.scene.remove(app.machineGroup);
  }
  app.machineGroup = new THREE.Group();
  app.machines = [];
  const M = LAYOUT.machines;
  const placements = [];

  // 1) 中央島台：機台背對中心柱、正面朝外環繞
  const cCount = Math.min(M.carouselCount, M.total);
  for (let i = 0; i < cCount; i++) {
    const phi = (i / cCount) * Math.PI * 2 + Math.PI / cCount;
    const fx = Math.sin(phi), fz = Math.cos(phi);
    placements.push({
      x: fx * M.carouselRadius,
      z: M.carouselZ + fz * M.carouselRadius,
      rotY: faceTowards(fx, fz),
    });
  }

  // 2) 後排機牆：沿後牆一字排開、面向入口
  const bCount = Math.min(M.backRowCount, LAYOUT.machines.total - cCount);
  const backZ = -LAYOUT.room.depth / 2 + M.backRowOffset;
  for (let i = 0; i < bCount; i++) {
    placements.push({
      x: (i - (bCount - 1) / 2) * M.backRowSpacing,
      z: backZ,
      rotY: faceTowards(0, 1),
    });
  }

  // 3) 兩側弧形機列：沿弧排開、正面朝走道扇形展開
  const rest = Math.max(0, M.total - cCount - bCount);
  const perArc = [Math.ceil(rest / 2), Math.floor(rest / 2)];
  [-1, 1].forEach((side, si) => {
    const n = perArc[si];
    if (n <= 0) return;
    const R = M.arcRadius;
    const cx = side * (M.aisleHalf + R);          // 弧心在牆外側
    const dAlpha = M.arcSpacing / R;              // 沿弧長轉角
    for (let i = 0; i < n; i++) {
      const alpha = (i - (n - 1) / 2) * dAlpha;
      const fx = -side * Math.cos(alpha);          // 朝走道的外法線
      const fz = Math.sin(alpha);
      placements.push({
        x: cx + fx * R,
        z: M.arcZ + fz * R,
        rotY: faceTowards(fx, fz),
      });
    }
  });

  // 依序放置：遊戲不夠時循環指派（同款遊戲多台，跟真賭場一樣）
  placements.forEach((p, i) => {
    const cfg = MACHINES[i % MACHINES.length];
    const g = buildMachine(cfg, i);
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rotY;
    g.scale.setScalar(M.scale);
    // DEV 拖曳後儲存的個別位移（以機台序號為鍵）
    const key = `m${i}`;
    const off = LAYOUT.machineOffsets[key];
    if (off) { g.position.x += off.x; g.position.z += off.z; }
    g.userData.offsetKey = key;
    g.userData.baseX = p.x;
    g.userData.baseZ = p.z;
    app.machineGroup.add(g);
    app.machines.push(g);
  });

  // 島台中心發光柱（有島台機台才放）
  app.spinners = [];
  app.ticker = null;
  if (cCount > 0) {
    const totem = buildCarouselTotem(LAYOUT.room.height);
    totem.position.set(0, 0, M.carouselZ);
    app.machineGroup.add(totem);
    totem.traverse((o) => { if (o.userData.spin) app.spinners.push(o); });
    app.ticker = totem.userData.ticker;
  }
  app.scene.add(app.machineGroup);
}

// DEV 面板調整後即時套用
function applyLayout() {
  const L = LAYOUT, r = app.refs;
  app.scene.fog.color.set(L.fog.color);
  app.scene.fog.density = L.fog.density;
  app.bloomPass.strength = L.bloom.strength;
  app.bloomPass.radius = L.bloom.radius;
  app.bloomPass.threshold = L.bloom.threshold;
  app.renderer.toneMappingExposure = L.lights.exposure;
  r.ambient.intensity = L.lights.ambient;
  r.hemi.intensity = L.lights.hemi;
  r.panelMat.emissiveIntensity = L.lights.ceilingPanel;
  for (const p of r.aisleLights) {
    p.intensity = L.lights.aisleIntensity;
    p.color.set(L.lights.aisleColor);
  }
  app.camera.fov = L.camera.fov;
  app.camera.updateProjectionMatrix();
  app.controls.minDistance = L.camera.minDist;
  app.controls.maxDistance = L.camera.maxDist;
  app.controls.minPolarAngle = THREE.MathUtils.degToRad(L.camera.polarMinDeg);
  app.controls.maxPolarAngle = THREE.MathUtils.degToRad(L.camera.polarMaxDeg);
}

function triggerRandomWin() {
  const m = app.machines[Math.floor(Math.random() * app.machines.length)];
  if (m) { m.userData.winFlash = 4; sfxDing(); }
}

// ---------- 互動 ----------
function setPointer(e) {
  app.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  app.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function pickMachine() {
  app.raycaster.setFromCamera(app.pointer, app.camera);
  const hits = app.raycaster.intersectObjects(app.machineGroup.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.isMachine) o = o.parent;
    if (o) return o;
  }
  return null;
}

function pickFloor() {
  app.raycaster.setFromCamera(app.pointer, app.camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pt = new THREE.Vector3();
  return app.raycaster.ray.intersectPlane(plane, pt) ? pt : null;
}

const tooltip = document.getElementById('tooltip');

function onPointerMove(e) {
  setPointer(e);
  // DEV 拖曳機台
  if (app.devMode && app.dragging) {
    const pt = pickFloor();
    if (pt) {
      app.dragging.position.x = pt.x;
      app.dragging.position.z = pt.z;
    }
    return;
  }
  if (app.focused) return;
  const m = pickMachine();
  if (m !== app.hovered) {
    app.hovered = m;
    if (m) {
      tooltip.textContent = `${m.userData.cfg.icon} ${m.userData.cfg.name}`;
      tooltip.style.display = 'block';
      document.body.style.cursor = 'pointer';
    } else {
      tooltip.style.display = 'none';
      document.body.style.cursor = 'default';
    }
  }
  if (m) {
    tooltip.style.left = e.clientX + 'px';
    tooltip.style.top = e.clientY + 'px';
  }
}

let downPos = null;
function onPointerDown(e) {
  setPointer(e);
  downPos = { x: e.clientX, y: e.clientY };
  if (app.devMode) {
    const m = pickMachine();
    if (m) {
      app.dragging = m;
      app.controls.enabled = false;
    }
  }
}

function onPointerUp(e) {
  if (app.devMode && app.dragging) {
    // 記錄拖曳位移供匯出
    const u = app.dragging.userData;
    LAYOUT.machineOffsets[u.offsetKey] = {
      x: +(app.dragging.position.x - u.baseX).toFixed(3),
      z: +(app.dragging.position.z - u.baseZ).toFixed(3),
    };
    app.dragging = null;
    app.controls.enabled = true;
    return;
  }
  // 判斷是點擊而非拖曳鏡頭
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 6 || app.focused) return;
  setPointer(e);

  const m = pickMachine();
  if (m) { focusMachine(m); return; }

  // 點地板 → 走過去
  const pt = pickFloor();
  if (pt) {
    sfxClick();
    const W = LAYOUT.room.width, D = LAYOUT.room.depth;
    pt.x = THREE.MathUtils.clamp(pt.x, -W / 2 + 2, W / 2 - 2);
    pt.z = THREE.MathUtils.clamp(pt.z, -D / 2 + 2, D / 2 - 2);
    const offset = app.camera.position.clone().sub(app.controls.target);
    const newTarget = new THREE.Vector3(pt.x, 1.5, pt.z);
    tweenV3(app.controls.target, newTarget, 0.9);
    tweenV3(app.camera.position, newTarget.clone().add(offset), 0.9);
  }
}

// ---------- 聚焦機台 → 彈窗 → 轉址 ----------
function focusMachine(m) {
  sfxDing();
  app.focused = m;
  app.hovered = null;
  tooltip.style.display = 'none';
  document.body.style.cursor = 'default';
  app.controls.enabled = false;
  app.savedCam = { pos: app.camera.position.clone(), target: app.controls.target.clone() };

  // 機台正面方向（local -Z 轉到世界座標）
  const front = new THREE.Vector3(0, 0, -1).applyQuaternion(m.quaternion).normalize();
  const lookAt = m.position.clone().add(new THREE.Vector3(0, 1.7, 0));
  const camPos = m.position.clone().add(front.multiplyScalar(3.6)).setY(1.9);

  tweenV3(app.controls.target, lookAt, 1.0);
  tweenV3(app.camera.position, camPos, 1.0, () => {
    const cfg = app.focused.userData.cfg;
    document.getElementById('mName').textContent = `${cfg.icon} ${cfg.name}`;
    document.getElementById('modal').classList.add('show');
  });
}

function leaveMachine() {
  sfxClick();
  document.getElementById('modal').classList.remove('show');
  if (!app.savedCam) { app.focused = null; app.controls.enabled = true; return; }
  tweenV3(app.controls.target, app.savedCam.target, 0.9);
  tweenV3(app.camera.position, app.savedCam.pos, 0.9, () => {
    app.focused = null;
    app.controls.enabled = true;
  });
}

function launchGame() {
  if (!app.focused) return;
  const cfg = app.focused.userData.cfg;
  const url = cfg.url || `${REDIRECT.base}?game=${encodeURIComponent(cfg.id)}`;
  sfxDing();
  app.focused.userData.winFlash = 2;
  // 小小的儀式感：閃一下再跳轉
  setTimeout(() => {
    if (REDIRECT.openInNewTab) window.open(url, '_blank');
    else window.location.href = url;
  }, 450);
}

// ---------- 主迴圈 ----------
function onResize() {
  app.camera.aspect = window.innerWidth / window.innerHeight;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(window.innerWidth, window.innerHeight);
  app.composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const dt = Math.min(app.clock.getDelta(), 0.1);
  const time = app.clock.elapsedTime;
  app.frame++;

  stepTweens(dt);
  app.controls.update();

  // 機台動畫（螢幕分批重繪：每台約 20fps，省效能）
  app.machines.forEach((m, i) => {
    updateMachine(m, time, dt, LAYOUT.reels.speed, (app.frame + i) % 3 === 0);
  });

  // 島台燈環旋轉 + GRAND JACKPOT 金額跳動
  for (const s of app.spinners) s.rotation.y += s.userData.spin * dt;
  if (app.ticker && app.frame % 24 === 0) {
    app.ticker.draw(11433.42 + time * 3.7);
  }

  // 招牌霓虹閃爍
  if (app.refs.signMat) {
    const flicker = Math.random() < 0.01 ? 0.6 : 1;
    app.refs.signMat.emissiveIntensity = (1.25 + 0.15 * Math.sin(time * 3)) * flicker;
  }

  app.composer.render();
}

function toggleDev() {
  app.devMode = !app.devMode;
  document.getElementById('devTip').style.display = app.devMode ? 'block' : 'none';
  window.__devToggle && window.__devToggle(app.devMode);
}

init();
