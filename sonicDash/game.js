import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Draco 解码器（太空人模型为 Draco 压缩格式）
const draco = new DRACOLoader();
draco.setDecoderPath('vendor/draco/');

// ============================================================
// LAYOUT — 所有版面/玩法参数
// ============================================================
const LAYOUT = {
  camX: 0, camY: 3.4, camZ: 6.2,        // 摄影机相对玩家位置
  camLookY: 1.2, fov: 62,
  laneWidth: 2.2,                        // 跑道间距
  baseSpeed: 12, maxSpeed: 34, accel: 0.18, // 速度（m/s）
  jumpVel: 11.5, gravity: 30,
  playerScale: 0.42, playerRotY: 180,    // 模型缩放/朝向（度）
  laneLerp: 12,                          // 换道平滑速度
  leanMax: 18,                           // 换道倾身角度（度）
  fogNear: 42, fogFar: 85,               // fogFar < spawnDist，物件在雾中生成后渐显，不会白色剪影
  spawnDist: 90,                         // 对象生成距离
  ringScale: 1.0, runAnimBase: 1.0,
};
const LAYOUT_MOBILE = { ...LAYOUT, fov: 70, camY: 3.8, camZ: 6.8 };
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || innerWidth < 700;
let L = isMobile ? { ...LAYOUT_MOBILE } : { ...LAYOUT };

// ============================================================
// 角色设置（KayKit Q 版角色，主菜单可选）
// ============================================================
const CHARS = {
  finn: {
    name: '太空人芬恩', icon: '🚀', url: 'assets/kaykit/chars/Astronaut_Finn.glb',
    scale: 0.53, run: ['Run'], jump: ['Jump'], death: ['Death'], preview: ['Wave', 'Idle'], runSpeed: 1.0,
    hide: ['Pistol'],
  },
  rae: {
    name: '太空人小蕾', icon: '👩‍🚀', url: 'assets/kaykit/chars/Astronaut_Rae.glb',
    scale: 0.50, run: ['Run'], jump: ['Jump'], death: ['Death'], preview: ['Wave', 'Idle'], runSpeed: 1.0,
    hide: ['Pistol'],
  },
  knight: {
    name: '小骑士', icon: '🛡️', url: 'assets/kaykit/chars/Knight.glb',
    scale: 0.55, run: ['Running_A'], jump: ['Jump_Full_Short', 'Jump_Start'], death: ['Death_A'], preview: ['Cheer', 'Idle'], runSpeed: 1.05,
    hide: ['1H_Sword', '2H_Sword', '1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield'],
  },
};
let currentCharKey = localStorage.getItem('sd_char');
if (!CHARS[currentCharKey]) currentCharKey = 'finn';

// ============================================================
// 场景主题设置（主菜单可选）
// ============================================================
// stage：回送排行榜 API 的关卡编号（rawValue / extData.stage）
const THEMES = {
  meadow: {
    name: '绿野草原', icon: '🌿', stage: 1,
    skyTop: '#1e90ff', skyBottom: '#aee4ff',
    ground1: '#3aa13f', ground2: '#2f8a34', road: '#8a6f4d', roadLine: '#ffd23f',
    hemiSky: 0xcfe8ff, hemiGround: 0x3a5f2f, sunColor: 0xfff4d6, sunI: 1.6,
    deco: 'tree', cloudTint: '#ffffff', snow: false,
  },
  desert: {
    name: '黄昏沙漠', icon: '🏜️', stage: 2,
    skyTop: '#6a3d9e', skyBottom: '#ffb26b',
    ground1: '#e0b26a', ground2: '#d2a052', road: '#b98a4e', roadLine: '#fff3d6',
    hemiSky: 0xffd9b0, hemiGround: 0x8a5a2f, sunColor: 0xffb060, sunI: 1.8,
    deco: 'cactus', cloudTint: '#ffd9b8', snow: false,
  },
  snow: {
    name: '雪夜冰原', icon: '❄️', stage: 3,
    skyTop: '#0b1740', skyBottom: '#4a6a9c',
    ground1: '#eef4fb', ground2: '#d9e6f5', road: '#8fa6c2', roadLine: '#ffd23f',
    hemiSky: 0xbcd4ff, hemiGround: 0x53627a, sunColor: 0xcfe0ff, sunI: 1.2,
    deco: 'snowtree', cloudTint: '#c7d6ee', snow: true,
  },
};
let currentThemeKey = localStorage.getItem('sd_theme');
if (!THEMES[currentThemeKey]) currentThemeKey = 'meadow';
let T = THEMES[currentThemeKey];

// ============================================================
// 基础场景（性能取向：无即时阴影、pixelRatio 封顶、共用材质）
// ============================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(L.fov, innerWidth / innerHeight, 0.1, 220);

const hemi = new THREE.HemisphereLight(T.hemiSky, T.hemiGround, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(T.sunColor, T.sunI);
sun.position.set(-6, 12, 4);
scene.add(sun);

// 天空渐层（canvas 贴图，零成本）
let skyTex = null;
function makeSky() {
  const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  // 地平线约在画面中段：中段以下固定为雾色，让远方地面与天空无缝衔接
  g.addColorStop(0, T.skyTop); g.addColorStop(0.5, T.skyBottom); g.addColorStop(1, T.skyBottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
  if (skyTex) skyTex.dispose();
  skyTex = new THREE.CanvasTexture(cv); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
}
makeSky();
scene.fog = new THREE.Fog(new THREE.Color(T.skyBottom), L.fogNear, L.fogFar);

// ============================================================
// 地面 — 固定几何 + 卷动 UV（不移动几何体，性能极佳）
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
  ctx.fillStyle = T.road; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([26, 22]); ctx.lineWidth = 5;
  for (const x of [256 / 3, 512 / 3]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  ctx.setLineDash([]); ctx.strokeStyle = T.roadLine; ctx.lineWidth = 8;
  ctx.strokeRect(4, -10, 248, 276);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const TRACK_LEN = 240;
let roadTex = roadTexture(); roadTex.repeat.set(1, TRACK_LEN / 8);
const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
const road = new THREE.Mesh(new THREE.PlaneGeometry(L.laneWidth * 3 + 0.6, TRACK_LEN), roadMat);
road.rotation.x = -Math.PI / 2; road.position.z = -TRACK_LEN / 2 + 20;
scene.add(road);

let grassTex = checkerTexture(T.ground1, T.ground2, 2); grassTex.repeat.set(8, TRACK_LEN / 4);
const grassMat = new THREE.MeshLambertMaterial({ map: grassTex });
const grassL = new THREE.Mesh(new THREE.PlaneGeometry(40, TRACK_LEN), grassMat);
grassL.rotation.x = -Math.PI / 2; grassL.position.set(-(L.laneWidth * 3) / 2 - 20.3, -0.02, -TRACK_LEN / 2 + 20);
const grassR = grassL.clone(); grassR.position.x = -grassL.position.x;
scene.add(grassL, grassR);

// ============================================================
// 共用几何 / 材质（全部对象共用，降低 draw call 与内存）
// ============================================================
const GEO = {
  ring: new THREE.TorusGeometry(0.42, 0.09, 8, 20),
  spike: new THREE.ConeGeometry(0.5, 1.35, 10),
  warn: new THREE.RingGeometry(0.3, 0.68, 24),
  crate: new THREE.BoxGeometry(1.5, 1.5, 1.5),
  trunk: new THREE.CylinderGeometry(0.18, 0.26, 3.2, 6),
  leaf: new THREE.ConeGeometry(1.4, 1.2, 7),
  pine1: new THREE.ConeGeometry(1.5, 1.6, 8),   // 雪松三层（下中上）
  pine2: new THREE.ConeGeometry(1.15, 1.35, 8),
  pine3: new THREE.ConeGeometry(0.78, 1.15, 8),
  cap1: new THREE.ConeGeometry(0.95, 0.5, 8),   // 各层积雪
  cap2: new THREE.ConeGeometry(0.72, 0.45, 8),
  cap3: new THREE.ConeGeometry(0.5, 0.4, 8),
  cactusBody: new THREE.CylinderGeometry(0.34, 0.4, 2.4, 8),
  cactusArm: new THREE.CylinderGeometry(0.15, 0.15, 1.0, 6),
  rock: new THREE.DodecahedronGeometry(0.8, 0),
  shadow: new THREE.CircleGeometry(0.55, 16),
};
// 红白条纹贴图（交通锥风格，醒目易辨识）
function stripeTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff3b30'; ctx.fillRect(0, i * 16, 64, 16); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const MAT = {
  ring: new THREE.MeshStandardMaterial({ color: 0xffc400, metalness: 0.8, roughness: 0.25, emissive: 0x6b4d00 }),
  spike: new THREE.MeshLambertMaterial({ map: stripeTexture(), emissive: 0x551111 }),
  warn: new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.55, depthWrite: false }),
  crate: new THREE.MeshLambertMaterial({ color: 0xb5722f }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x2e8b3d }),
  pine: new THREE.MeshLambertMaterial({ color: 0x1f5d3a }),
  snowCap: new THREE.MeshLambertMaterial({ color: 0xf4f9ff }),
  cactus: new THREE.MeshLambertMaterial({ color: 0x3f9b4f }),
  rock: new THREE.MeshLambertMaterial({ color: 0xc0894f }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }),
};

// ============================================================
// 对象池
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
// 坑洞贴图：深渊黑洞 + 土色崩边
function holeTexture() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 160;
  const ctx = cv.getContext('2d');
  ctx.translate(64, 80);
  ctx.fillStyle = '#4a3520';                        // 外圈崩边
  ctx.beginPath(); ctx.ellipse(0, 0, 62, 78, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#191410';                        // 内缘阴影
  ctx.beginPath(); ctx.ellipse(0, 2, 54, 70, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#050508';                        // 深渊
  ctx.beginPath(); ctx.ellipse(0, 6, 46, 60, 0, 0, Math.PI * 2); ctx.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const holeGeo = new THREE.PlaneGeometry(1.9, 2.6);
const holeMat = new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false });
const holes = makePool(() => {
  const m = new THREE.Mesh(holeGeo, holeMat);
  m.rotation.x = -Math.PI / 2;
  return m;
}, 12);

// 尖刺＝红白条纹锥 + 地面警示圈（被金环挡住时仍可从地面辨识）
const spikes = makePool(() => {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(GEO.spike, MAT.spike); cone.position.y = 0.68;
  const warn = new THREE.Mesh(GEO.warn, MAT.warn); warn.rotation.x = -Math.PI / 2; warn.position.y = 0.03;
  g.add(cone, warn); return g;
}, 24);
const crates = makePool(() => new THREE.Mesh(GEO.crate, MAT.crate), 16);

// KayKit 树模型库（草原用；载入完成后重建装饰池换上真树）
const treeLib = [];

// 装饰物（依主题重建：树 / 仙人掌+岩石 / 雪松）
function buildDeco(kind) {
  const g = new THREE.Group();
  if (kind === 'cactus') {
    if (Math.random() < 0.4) { // 岩石
      const r = new THREE.Mesh(GEO.rock, MAT.rock);
      const s = 0.7 + Math.random() * 0.8; r.scale.setScalar(s); r.position.y = 0.5 * s;
      g.add(r);
    } else { // 仙人掌
      const b = new THREE.Mesh(GEO.cactusBody, MAT.cactus); b.position.y = 1.2;
      const a1 = new THREE.Mesh(GEO.cactusArm, MAT.cactus); a1.position.set(0.45, 1.5, 0); a1.rotation.z = -0.6;
      const a2 = new THREE.Mesh(GEO.cactusArm, MAT.cactus); a2.position.set(-0.45, 1.15, 0); a2.rotation.z = 0.6;
      g.add(b, a1, a2);
    }
  } else if (kind === 'snowtree') {
    // 三层雪松：矮树干 + 由大到小的三层伞盖，每层顶部盖积雪
    const t = new THREE.Mesh(GEO.trunk, MAT.trunk); t.scale.y = 0.5; t.position.y = 0.8;
    g.add(t);
    const layers = [
      [GEO.pine1, GEO.cap1, 1.75],
      [GEO.pine2, GEO.cap2, 2.75],
      [GEO.pine3, GEO.cap3, 3.62],
    ];
    for (const [pine, cap, y] of layers) {
      const p = new THREE.Mesh(pine, MAT.pine); p.position.y = y;
      const c = new THREE.Mesh(cap, MAT.snowCap); c.position.y = y + 0.55;
      g.add(p, c);
    }
  } else { // tree（草原）— 优先用 KayKit 真树模型，尚未载入时用旧造型
    if (treeLib.length) {
      const m = treeLib[(Math.random() * treeLib.length) | 0].clone(true);
      m.scale.setScalar(3.2); m.position.y = 0.32; // 模型 ymin=-0.1，抬回地面
      g.add(m);
    } else {
      const t = new THREE.Mesh(GEO.trunk, MAT.trunk); t.position.y = 1.6;
      const l1 = new THREE.Mesh(GEO.leaf, MAT.leaf); l1.position.y = 3.6;
      const l2 = new THREE.Mesh(GEO.leaf, MAT.leaf); l2.position.y = 4.3; l2.scale.setScalar(0.7);
      g.add(t, l1, l2);
    }
  }
  return g;
}
let decos = null;
function rebuildDecos() {
  if (decos) for (const o of decos.pool) scene.remove(o);
  decos = makePool(() => buildDeco(T.deco), 26);
}
rebuildDecos();

// ============================================================
// 云朵（billboard sprite，各主题染色）
// ============================================================
function cloudTexture() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  for (const [x, y, r] of [[38, 40, 20], [64, 32, 26], [92, 42, 18], [64, 46, 22]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const cloudTex = cloudTexture();
const clouds = [];
for (let i = 0; i < 8; i++) {
  const m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, fog: false });
  const s = new THREE.Sprite(m);
  const sc = 5 + Math.random() * 5;
  s.scale.set(sc, sc * 0.5, 1);
  s.position.set((Math.random() - 0.5) * 70, 9 + Math.random() * 9, -85 + Math.random() * 55);
  scene.add(s); clouds.push(s);
}
function tintClouds() { for (const c of clouds) c.material.color.set(T.cloudTint); }
tintClouds();

// ============================================================
// 落雪粒子（仅雪夜主题显示）
// ============================================================
const SNOW_N = 400;
const snowGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 44;
    pos[i * 3 + 1] = Math.random() * 18;
    pos[i * 3 + 2] = -80 + Math.random() * 92;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
}
const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.9 }));
snowPts.visible = T.snow;
scene.add(snowPts);
function updateSnow(dt, time) {
  if (!snowPts.visible) return;
  const p = snowGeo.attributes.position.array;
  for (let i = 0; i < SNOW_N; i++) {
    p[i * 3 + 1] -= dt * (2.0 + (i % 5) * 0.35);
    p[i * 3] += Math.sin(time * 1.3 + i) * dt * 0.5;
    if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 18;
  }
  snowGeo.attributes.position.needsUpdate = true;
}

// ============================================================
// 金环收集粒子特效（星星迸发）
// ============================================================
function starTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const ctx = cv.getContext('2d');
  ctx.translate(16, 16); ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 5 : 13, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const starTex = starTexture();
const burstPool = [];
for (let i = 0; i < 48; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, fog: false, depthWrite: false }));
  s.visible = false; scene.add(s);
  burstPool.push({ s, vx: 0, vy: 0, vz: 0, life: 0, active: false });
}
function spawnBurst(pos) {
  let n = 0;
  for (const b of burstPool) {
    if (b.active) continue;
    b.active = true; b.life = 0.5;
    b.s.visible = true; b.s.position.copy(pos);
    const a = Math.random() * Math.PI * 2;
    b.vx = Math.cos(a) * (1.5 + Math.random() * 2);
    b.vy = 2 + Math.random() * 3;
    b.vz = Math.sin(a) * 1.5;
    b.s.scale.setScalar(0.3 + Math.random() * 0.2);
    if (++n >= 8) break;
  }
}
function updateBursts(dt) {
  for (const b of burstPool) {
    if (!b.active) continue;
    b.life -= dt;
    if (b.life <= 0) { b.active = false; b.s.visible = false; continue; }
    b.s.position.x += b.vx * dt;
    b.s.position.y += b.vy * dt; b.vy -= 9 * dt;
    b.s.position.z += b.vz * dt;
    b.s.material.opacity = b.life / 0.5;
  }
}

// ============================================================
// 主题套用（天空/地面/光照/装饰/落雪一次切换）
// ============================================================
function applyTheme(key) {
  currentThemeKey = key; T = THEMES[key];
  localStorage.setItem('sd_theme', key);
  makeSky();
  scene.fog.color.set(T.skyBottom);
  hemi.color.set(T.hemiSky); hemi.groundColor.set(T.hemiGround);
  sun.color.set(T.sunColor); sun.intensity = T.sunI;
  const oldRoad = roadTex, oldGrass = grassTex;
  roadTex = roadTexture(); roadTex.repeat.set(1, TRACK_LEN / 8);
  grassTex = checkerTexture(T.ground1, T.ground2, 2); grassTex.repeat.set(8, TRACK_LEN / 4);
  roadMat.map = roadTex; roadMat.needsUpdate = true;
  grassMat.map = grassTex; grassMat.needsUpdate = true;
  oldRoad.dispose(); oldGrass.dispose();
  rebuildDecos();
  snowPts.visible = T.snow;
  tintClouds();
}

// ============================================================
// 玩家
// ============================================================
const player = new THREE.Group(); scene.add(player);
const blob = new THREE.Mesh(GEO.shadow, MAT.shadow);
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; scene.add(blob);

let mixer = null, actions = {}, modelRoot = null, charCfg = CHARS[currentCharKey];
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
// 预载 KayKit 树模型；载入完成后若在草原主题，重建装饰池换上真树
for (const u of ['assets/kaykit/nature/tree_single_A.gltf', 'assets/kaykit/nature/tree_single_B.gltf']) {
  loader.load(u, (gltf) => { treeLib.push(gltf.scene); if (T.deco === 'tree') rebuildDecos(); });
}
function pickClip(clips, names) { for (const n of names) { const c = clips.find(c => c.name === n); if (c) return c; } return null; }
// 隐藏模型内置武器/盾牌等配件
function hideParts(root, cfg) {
  if (!cfg.hide) return;
  root.traverse(n => { if (cfg.hide.includes(n.name)) n.visible = false; });
}
function loadModel(key) {
  charCfg = CHARS[key]; currentCharKey = key; localStorage.setItem('sd_char', key);
  loader.load(charCfg.url, (gltf) => {
    if (currentCharKey !== key) return; // 期间又切换了角色，丢弃本次加载
    if (modelRoot) player.remove(modelRoot);
    modelRoot = gltf.scene;
    hideParts(modelRoot, charCfg);
    modelRoot.scale.setScalar(charCfg.scale * L.playerScale / 0.42);
    modelRoot.rotation.y = THREE.MathUtils.degToRad(L.playerRotY);
    player.add(modelRoot);
    mixer = new THREE.AnimationMixer(modelRoot);
    actions = {};
    const run = pickClip(gltf.animations, charCfg.run);
    const jump = pickClip(gltf.animations, charCfg.jump);
    const death = pickClip(gltf.animations, charCfg.death);
    if (run) { actions.run = mixer.clipAction(run); actions.run.play(); }
    if (jump) { actions.jump = mixer.clipAction(jump); actions.jump.setLoop(THREE.LoopOnce); actions.jump.clampWhenFinished = true; }
    if (death) { actions.death = mixer.clipAction(death); actions.death.setLoop(THREE.LoopOnce); actions.death.clampWhenFinished = true; }
  });
}
loadModel(currentCharKey);

// ============================================================
// 音效（WebAudio 合成，零资源档）
// ============================================================
let AC = null;
// 音效档（金环收集 / 按钮 / 游戏结束），页面载入即抓档，首次播放时解码
const SFX_URLS = {
  coin: 'assets/audio/coin04.mp3',
  button: 'assets/audio/button01b.mp3',
  over: 'assets/audio/powerdown07.mp3',
};
const sfxData = {}, sfxBuf = {};
for (const [k, u] of Object.entries(SFX_URLS)) {
  fetch(u).then(r => r.arrayBuffer()).then(b => { sfxData[k] = b; }).catch(() => {});
}
function playSfx(key, vol = 0.6) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const playBuf = (buf) => {
      const src = AC.createBufferSource(), g = AC.createGain();
      src.buffer = buf; g.gain.value = vol;
      src.connect(g).connect(AC.destination); src.start();
    };
    if (sfxBuf[key]) playBuf(sfxBuf[key]);
    else if (sfxData[key]) AC.decodeAudioData(sfxData[key].slice(0)).then(buf => { sfxBuf[key] = buf; playBuf(buf); });
  } catch (e) { /* 无声环境忽略 */ }
}
function beep(freq, dur = 0.08, type = 'sine', vol = 0.18) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  } catch (e) { /* 无声环境忽略 */ }
}
// 经典平台游戏跳跃音：频率快速上扫的「咻↑」
function jumpSound() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = AC.currentTime;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(170, t0);
    o.frequency.exponentialRampToValueAtTime(660, t0 + 0.18);
    g.gain.setValueAtTime(0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
    o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + 0.22);
  } catch (e) { /* 无声环境忽略 */ }
}

// ============================================================
// 游戏状态
// ============================================================
const state = {
  running: false, dead: false,
  lane: 0,                 // -1 / 0 / 1
  speed: L.baseSpeed,
  py: 0, vy: 0, jumping: false,
  dist: 0, ringCount: 0, score: 0,
  nextSpawnZ: -30, nextTreeZ: -10,
  slowmo: false, falling: false,
};
const $score = document.getElementById('score');
const $rings = document.getElementById('ringCount');
const $overlay = document.getElementById('overlay');
const $startBtn = document.getElementById('startBtn');
const $ovTitle = document.getElementById('ovTitle');
const $ovInfo = document.getElementById('ovInfo');
const $ovUpload = document.getElementById('ovUpload');

function resetGame() {
  state.running = true; state.dead = false;
  state.startTs = Date.now();          // 本局开始时间（上传游玩时长用）
  state.lane = 0; state.speed = L.baseSpeed;
  state.py = 0; state.vy = 0; state.jumping = false;
  state.dist = 0; state.ringCount = 0; state.score = 0;
  state.nextSpawnZ = -30; state.nextTreeZ = -10;
  rings.each(o => rings.release(o)); spikes.each(o => spikes.release(o));
  crates.each(o => crates.release(o)); decos.each(o => decos.release(o));
  holes.each(o => holes.release(o));
  state.falling = false; blob.visible = true;
  player.position.set(0, 0, 0);
  if (actions.death) { actions.death.stop(); }
  if (actions.run) { actions.run.reset().play(); }
  tut.active = false; tut.crate = null;
  $tut.classList.add('hidden');
  $ovUpload.classList.add('hidden');
  $overlay.classList.add('hidden');
  stopPreview();
}
// ============================================================
// 新手教学（首次自动进入；换道 → 跳跃 → 吃金环 → 闪障碍）
// ============================================================
const tut = { active: false, step: -1, timer: 0, crate: null, startRings: 0 };
const $tut = document.getElementById('tut');
function tutMsg(main, sub = '') {
  $tut.innerHTML = `${main}${sub ? `<div class="sub">${sub}</div>` : ''}`;
  $tut.classList.remove('hidden', 'pop');
  void $tut.offsetWidth; // 重新触发动画
  $tut.classList.add('pop');
}
const TUT_STEPS = [
  () => tutMsg('👋 跟着做就好！', isMobile ? '左右滑动 切换跑道' : '按 ← → 切换跑道'),
  () => tutMsg('✓ 漂亮！再来跳跃', isMobile ? '上滑或点一下屏幕 跳跃' : '按 Space 或 ↑ 跳跃'),
  () => { tutMsg('✓ 很好！收集金环', '吃 3 个金环试试 ⭕'); tut.startRings = state.ringCount; tutSpawnRings(); },
  () => { tutMsg('⚠️ 小心障碍物！', '跳过木箱，撞到会结束游戏'); tutSpawnCrate(); },
  () => { tutMsg('🎉 教学完成！', '速度要上来了，冲吧！'); tut.timer = 1.6; },
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
  playSfx('button');
  resetGame();
  tut.active = true; tut.step = -1; tut.crate = null; tut.timer = 0;
  advanceTut();
}
function endTutorial() {
  localStorage.setItem('sd_tut', '1');
  tut.active = false; tut.crate = null;
  $tut.classList.add('hidden');
  state.score = 0; state.dist = 0; // 教学不计分，正式起跑
  state.startTs = Date.now();      // 时长也从正式起跑算起
  $startBtn.textContent = '开始游戏';
}
const $tutBtn = document.getElementById('tutBtn');
$tutBtn.addEventListener('click', startTutorial);
$startBtn.addEventListener('click', () => {
  if (!localStorage.getItem('sd_tut')) { startTutorial(); return; }
  playSfx('button'); resetGame();
});

function gameOver(fall = false) {
  state.running = false; state.dead = true;
  playSfx('over', 0.7);
  if (actions.run) actions.run.fadeOut(0.15);
  if (!fall && actions.death) actions.death.reset().fadeIn(0.1).play(); // 坠落时人已沉入洞中，不播倒地动画
  const sc = Math.floor(state.score);
  const best = +(localStorage.getItem('sd_best') || 0);
  const newBest = sc > best;
  if (newBest) localStorage.setItem('sd_best', sc);
  $ovTitle.textContent = 'GAME OVER';
  $ovInfo.textContent = `SCORE ${sc}　⭕ ${state.ringCount}` + (newBest ? '　🏆 新纪录！' : `　🏆 最高 ${best}`);
  $ovInfo.classList.remove('hidden');
  $startBtn.textContent = '再来一次';
  $overlay.classList.remove('hidden');
  startPreview();

  // 自动上传游戏纪录（关卡=场景编号 1/2/3，需宿主 token 才会入榜）
  if (sc > 0 && window.Leaderboard) {
    const elapsed = state.startTs ? (Date.now() - state.startTs) : 0;
    window.Leaderboard.submit(T.stage, sc, elapsed);
  }
  const hasToken = !!(window.HOST_AUTH && window.HOST_AUTH.token);
  $ovUpload.textContent = hasToken ? '成绩已上传排行榜' : '未带 token，成绩不会上传';
  $ovUpload.classList.toggle('warn', !hasToken);
  $ovUpload.classList.remove('hidden');
}

// ============================================================
// 生成逻辑（距离驱动，对象向 +z 移动）
// ============================================================
const laneX = (i) => i * L.laneWidth;
let lastRingLane = null; // 上一组金环所在道：紧接着不生障碍，避免被金环挡住看不见
function spawnPattern(z) {
  const r = Math.random();
  const lanes = [-1, 0, 1];
  if (r < 0.45) {
    // 一排金环（单一车道直线 5 颗，偶尔跳跃弧线）
    const lane = lanes[(Math.random() * 3) | 0];
    const arc = Math.random() < 0.3;
    for (let i = 0; i < 5; i++) {
      const o = rings.get(); if (!o) break;
      const t = i / 4;
      o.position.set(laneX(lane), arc ? 0.7 + Math.sin(t * Math.PI) * 1.6 : 0.7, z - i * 1.6);
    }
    if (arc) { // 弧线前放个箱子引导跳跃
      const c = crates.get(); if (c) c.position.set(laneX(lane), 0.75, z + 2.2);
    }
    lastRingLane = lane;
  } else if (r < 0.75) {
    // 尖刺：封 1~2 条道（避开刚出现金环的道，跟着金环跑必安全）
    const cand = lastRingLane === null ? [...lanes] : lanes.filter(l => l !== lastRingLane);
    const shuffled = cand.sort(() => Math.random() - 0.5);
    const block = Math.min(shuffled.length - (lastRingLane === null ? 1 : 0), Math.random() < 0.5 ? 1 : 2);
    for (let i = 0; i < block; i++) {
      const o = spikes.get(); if (!o) break;
      o.position.set(laneX(shuffled[i]), 0, z);
    }
    // 留活道上放金环
    const free = lanes.filter(l => !shuffled.slice(0, block).includes(l));
    const freeLane = free[(Math.random() * free.length) | 0];
    for (let i = 0; i < 3; i++) { const o = rings.get(); if (o) o.position.set(laneX(freeLane), 0.7, z - i * 1.4); }
    lastRingLane = freeLane;
  } else if (r < 0.84) {
    // 木箱墙（可跳过）：单道箱子 + 上方金环（同样避开刚出现金环的道）
    const cand = lastRingLane === null ? lanes : lanes.filter(l => l !== lastRingLane);
    const lane = cand[(Math.random() * cand.length) | 0];
    const c = crates.get(); if (c) c.position.set(laneX(lane), 0.75, z);
    const o = rings.get(); if (o) o.position.set(laneX(lane), 2.6, z);
    lastRingLane = null;
  } else {
    // 坑洞（必须跳过）：路面黑洞 + 上方金环弧线提示跳跃
    const cand = lastRingLane === null ? lanes : lanes.filter(l => l !== lastRingLane);
    const lane = cand[(Math.random() * cand.length) | 0];
    const h = holes.get(); if (h) h.position.set(laneX(lane), 0.02, z);
    const arcY = [1.3, 1.9, 1.3];
    for (let i = 0; i < 3; i++) { const o = rings.get(); if (o) o.position.set(laneX(lane), arcY[i], z + 1.4 - i * 1.4); }
    lastRingLane = null;
  }
}
function spawnDeco(z) {
  const o = decos.get(); if (!o) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  o.position.set(side * (L.laneWidth * 1.5 + 1.8 + Math.random() * 5), 0, z);
  o.rotation.y = Math.random() * Math.PI * 2;
  o.scale.setScalar(0.85 + Math.random() * 0.4); // 大小随机更自然
}

// ============================================================
// 输入：键盘 + 触摸滑动
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
  jumpSound();
  if (actions.jump) { actions.jump.reset().play(); if (actions.run) actions.run.fadeOut(0.08); }
}
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': moveLane(-1); break;
    case 'ArrowRight': case 'KeyD': moveLane(1); break;
    case 'ArrowUp': case 'KeyW': case 'Space': jump(); break;
    case 'Enter': if (!state.running) { resetGame(); } break;
  }
});
// 触摸：touchmove 即时判定（更跟手），点一下＝跳跃，UI 面板上的触碰忽略
let touch = null;
const onUI = (e) => e.target.closest && e.target.closest('#overlay, #lbPanel');
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
  if (touch && !touch.used && performance.now() - touch.t0 < 250) jump(); // 点一下＝跳
  touch = null;
}, { passive: true });

// ============================================================
// 主循环
// ============================================================
const clock = new THREE.Clock();
let elapsed = 0;
function tick() {
  requestAnimationFrame(tick);
  step(Math.min(clock.getDelta(), 0.05));
}
function step(dt) {
  if (state.slowmo) dt *= 0.25;
  elapsed += dt;

  if (state.running) {
    // 加速（教学中固定慢速）
    if (tut.active) state.speed = 8;
    else state.speed = Math.min(L.maxSpeed, state.speed + L.accel * dt * 10);
    const dz = state.speed * dt;
    state.dist += dz;
    state.score += dz;

    // UV 卷动制造前进感（几何不动）
    roadTex.offset.y += dz / 8;
    grassTex.offset.y += dz / 4;

    // 玩家横移 + 跳跃 + 换道倾身
    const targetX = laneX(state.lane);
    player.position.x += (targetX - player.position.x) * Math.min(1, L.laneLerp * dt);
    const lean = THREE.MathUtils.clamp((player.position.x - targetX) * 0.5, -1, 1) * THREE.MathUtils.degToRad(L.leanMax);
    player.rotation.z += (lean - player.rotation.z) * Math.min(1, 10 * dt);
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

    // 对象向玩家移动 + 回收 + 碰撞
    const px = player.position.x, py = state.py;
    rings.each(o => {
      o.position.z += dz; o.rotation.y += dt * 4;
      if (o.position.z > 8) return rings.release(o);
      if (Math.abs(o.position.z) < 0.6 && Math.abs(o.position.x - px) < 0.7 && Math.abs(o.position.y - (py + 0.7)) < 1.0) {
        spawnBurst(o.position);
        rings.release(o); state.ringCount++; state.score += 10;
        playSfx('coin', 0.5);
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
        if (tut.active) { // 教学中撞到不死，重试
          beep(180, .2, 'sawtooth', .18);
          crates.release(o);
          if (tut.crate === o) { tut.crate = null; tut.timer = 1.2; tutMsg('💥 撞到了！没关系再来', isMobile ? '上滑或点一下 跳过木箱' : '按 Space 跳过木箱'); }
        } else gameOver();
      }
    });
    holes.each(o => {
      o.position.z += dz;
      if (o.position.z > 8) return holes.release(o);
      // 在地面且位于洞口范围内 → 坠落
      if (Math.abs(o.position.z) < 1.0 && Math.abs(o.position.x - px) < 0.8 && py <= 0.05) {
        state.falling = true; blob.visible = false;
        gameOver(true);
      }
    });
    decos.each(o => { o.position.z += dz; if (o.position.z > 12) decos.release(o); });
    for (const c of clouds) { c.position.z += dz * 0.15; if (c.position.z > 10) c.position.z = -85; }

    // 生成（以世界座标距离节奏；教学中只长装饰当风景，关卡对象由教学脚本控制）
    state.nextSpawnZ += dz; state.nextTreeZ += dz;
    if (!tut.active) {
      while (state.nextSpawnZ > -L.spawnDist) { spawnPattern(state.nextSpawnZ - L.spawnDist); state.nextSpawnZ -= 9 + Math.random() * 7; }
    } else state.nextSpawnZ = Math.min(state.nextSpawnZ, -20);
    while (state.nextTreeZ > -L.spawnDist) { spawnDeco(state.nextTreeZ - L.spawnDist); state.nextTreeZ -= 5 + Math.random() * 6; }

    // 教学步骤监控
    if (tut.active) {
      tut.timer = Math.max(0, tut.timer - dt);
      if (tut.step === 2) {
        let alive = 0; rings.each(() => alive++);
        if (state.ringCount - tut.startRings >= 3) advanceTut();
        else if (alive === 0) tutSpawnRings(); // 没吃到就再补一排
      } else if (tut.step === 3) {
        if (tut.crate && tut.crate.position.z > 2) advanceTut();          // 成功越过
        else if (!tut.crate && tut.timer <= 0) tutSpawnCrate();           // 撞掉后重生
      } else if (tut.step === 4 && tut.timer <= 0) {
        endTutorial();
      }
    }

    // 跑步动画速度随移动速度
    if (actions.run) actions.run.timeScale = charCfg.runSpeed * L.runAnimBase * (0.7 + state.speed / L.maxSpeed);

    $score.textContent = Math.floor(state.score);
    $rings.textContent = state.ringCount;
  }

  updateSnow(dt, elapsed);
  updateBursts(dt);
  MAT.warn.opacity = 0.4 + 0.3 * Math.sin(elapsed * 7); // 尖刺警示圈呼吸闪烁
  if (state.falling && player.position.y > -2.6) player.position.y -= 9 * dt; // 坠入坑洞下沉动画
  if (mixer) mixer.update(dt);

  // 摄影机跟随
  camera.position.set(player.position.x * 0.55 + L.camX, L.camY + state.py * 0.25, L.camZ);
  camera.lookAt(player.position.x * 0.7, L.camLookY + state.py * 0.4, -6);

  renderer.render(scene, camera);
}
tick();
window.__game = { renderer, scene, state, L, step, pools: { rings, spikes, crates, holes } }; // step 供测试手动推进

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ============================================================
// 主菜单：角色 3D 预览（独立小 renderer，仅菜单打开时渲染）
// ============================================================
const pvCanvas = document.getElementById('pv');
const pvRenderer = new THREE.WebGLRenderer({ canvas: pvCanvas, antialias: true, alpha: true });
pvRenderer.setSize(336, 336, false);
pvRenderer.outputColorSpace = THREE.SRGBColorSpace;
const pvScene = new THREE.Scene();
const pvCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
pvScene.add(new THREE.HemisphereLight(0xffffff, 0x556688, 1.2));
const pvSun = new THREE.DirectionalLight(0xfff4d6, 1.8); pvSun.position.set(3, 6, 4); pvScene.add(pvSun);
const pvLoader = new GLTFLoader();
pvLoader.setDRACOLoader(draco);
let pvRoot = null, pvMixer = null, pvActive = false, pvLoadKey = '';
function loadPreview(key) {
  pvLoadKey = key;
  const cfg = CHARS[key];
  pvLoader.load(cfg.url, (gltf) => {
    if (pvLoadKey !== key) return; // 期间又切换了角色，丢弃本次加载
    if (pvRoot) pvScene.remove(pvRoot);
    pvRoot = gltf.scene;
    hideParts(pvRoot, cfg);
    // 与游戏内相同缩放（各角色约 1.5 单位高），固定框位取景
    pvRoot.scale.setScalar(cfg.scale);
    pvScene.add(pvRoot);
    const box = new THREE.Box3().setFromObject(pvRoot);
    const center = box.getCenter(new THREE.Vector3());
    pvRoot.position.x -= center.x; pvRoot.position.z -= center.z;
    pvRoot.position.y -= box.min.y + 0.78; // 脚底贴齐取景框下缘
    pvCamera.position.set(0, 0.12, 2.8);
    pvCamera.lookAt(0, 0, 0);
    pvMixer = new THREE.AnimationMixer(pvRoot);
    const clip = pickClip(gltf.animations, cfg.preview) || gltf.animations[0];
    if (clip) pvMixer.clipAction(clip).play();
  });
}
const pvClock = new THREE.Clock();
function pvTick() {
  if (!pvActive) return;
  requestAnimationFrame(pvTick);
  const dt = pvClock.getDelta();
  if (pvMixer) pvMixer.update(dt);
  if (pvRoot) pvRoot.rotation.y += dt * 0.7;
  pvRenderer.render(pvScene, pvCamera);
}
function startPreview() { if (!pvActive) { pvActive = true; pvClock.getDelta(); pvTick(); } }
function stopPreview() { pvActive = false; }

// ============================================================
// 主菜单：角色卡 / 场景卡
// ============================================================
const $charRow = document.getElementById('charRow');
const $themeRow = document.getElementById('themeRow');
const $pvName = document.getElementById('pvName');
function buildMenu() {
  $charRow.innerHTML = ''; $themeRow.innerHTML = '';
  for (const [key, cfg] of Object.entries(CHARS)) {
    const b = document.createElement('button');
    b.className = 'card' + (key === currentCharKey ? ' sel' : '');
    b.innerHTML = `<div class="ic">${cfg.icon}</div><div class="nm">${cfg.name}</div>`;
    b.addEventListener('click', () => {
      if (key === currentCharKey) return;
      playSfx('button');
      loadModel(key); loadPreview(key);
      buildMenu();
    });
    $charRow.appendChild(b);
  }
  for (const [key, cfg] of Object.entries(THEMES)) {
    const b = document.createElement('button');
    b.className = 'card theme' + (key === currentThemeKey ? ' sel' : '');
    b.style.background = `linear-gradient(180deg, ${cfg.skyTop}, ${cfg.skyBottom})`;
    b.innerHTML = `<div class="ic">${cfg.icon}</div><div class="nm">${cfg.name}</div>`;
    b.addEventListener('click', () => {
      if (key === currentThemeKey) return;
      playSfx('button');
      applyTheme(key);
      buildMenu();
    });
    $themeRow.appendChild(b);
  }
  $pvName.textContent = `${CHARS[currentCharKey].icon} ${CHARS[currentCharKey].name}`;
}
buildMenu();
loadPreview(currentCharKey);
startPreview();

// ============================================================
// 排行榜面板（宿主站 wengamebase API，功能对齐 jumpVerticalGame / stack）
// ============================================================
const $lbPanel = document.getElementById('lbPanel');
const $lbList = document.getElementById('lbList');
const $lbTime = document.getElementById('lbTime');
const $lbTabs = document.getElementById('lbTabs');
let lbTab = 'all'; // 'all' 总榜 | 'today' 今日 | 'yesterday' 昨日

function formatPlayDuration(sec) {
  if (sec == null || isNaN(sec)) return '--';
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  if (h > 0) return p(h) + ' 小时 ' + p(m) + ' 分 ' + p(s) + ' 秒';
  if (m > 0) return p(m) + ' 分 ' + p(s) + ' 秒';
  return p(s) + ' 秒';
}
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function lbMsg(txt, err) {
  $lbList.innerHTML = `<div class="lbMsg${err ? ' err' : ''}">${txt}</div>`;
}
function renderLbTabs() {
  for (const b of $lbTabs.querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === lbTab);
}
function renderLbRows(rows) {
  if (!rows.length) { lbMsg('尚无纪录'); return; }
  $lbList.innerHTML = rows.slice(0, 10).map((r, i) => {
    const rank = r.rank || (i + 1);
    // 会员账号（memberAccount 后端已隐码；本人则换成真实账号并高亮）
    const isMe = !!r.isCurrentMember;
    const realName = isMe && window.Leaderboard.getCurrentUserName ? window.Leaderboard.getCurrentUserName() : '';
    const account = isMe && realName ? realName : (r.memberAccount || r.gameAccount || ('UID' + r.memberID));
    return `<div class="lbRow r${rank <= 3 ? rank : 0}${isMe ? ' me' : ''}">` +
      `<span class="rk">#${rank}</span>` +
      `<span class="ac">${escHtml(String(account).slice(0, 16))}</span>` +
      `<span class="sc">${r.bestScore ?? 0}</span></div>`;
  }).join('');
}
function loadLb() {
  if (!window.Leaderboard) { lbMsg('排行榜服务未加载', true); $lbTime.textContent = ''; return; }
  const tab = lbTab; // 快照：回来时若已切 tab 则丢弃
  lbMsg('加载中…');
  window.Leaderboard.getTop({ tab, limit: 10 }).then(rows => {
    if (lbTab !== tab) return;
    renderLbRows(rows || []);
  }).catch(() => {
    if (lbTab !== tab) return;
    lbMsg('加载失败', true);
  });
  // 今日/昨日顺便查累积游玩时长
  if (tab === 'today' || tab === 'yesterday') {
    const label = tab === 'today' ? '今日' : '昨日';
    $lbTime.textContent = label + '您累积游玩时长 加载中…';
    window.Leaderboard.getTotalTime(tab).then(sec => {
      if (lbTab !== tab) return;
      $lbTime.textContent = label + '您累积游玩时长 ' + (sec == null ? '--' : formatPlayDuration(sec));
    }).catch(() => {
      if (lbTab !== tab) return;
      $lbTime.textContent = label + '您累积游玩时长 --';
    });
  } else $lbTime.textContent = '';
}
document.getElementById('lbBtn').addEventListener('click', () => {
  playSfx('button');
  lbTab = 'all'; // 每次进入预设回总榜
  $lbPanel.classList.remove('hidden');
  renderLbTabs();
  loadLb();
});
document.getElementById('lbClose').addEventListener('click', () => {
  playSfx('button');
  $lbPanel.classList.add('hidden');
});
$lbTabs.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.dataset.tab === lbTab) return;
  playSfx('button');
  lbTab = b.dataset.tab;
  renderLbTabs();
  loadLb();
});
