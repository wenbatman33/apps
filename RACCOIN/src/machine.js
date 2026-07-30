// ============ 3D 推幣機：Three.js 渲染 + cannon-es 物理 ============
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LAYOUT, COIN_DEFS } from './data.js';
import { Sound } from './sound.js';

let G = null;
let renderer, scene, camera, world;
let pusherBody, pusherMesh, pusherTheta = 0;
let machineGroup = null;
let aimMarker, aimLine;
let coinMat, staticMat;
let uid = 1;

const coins = [];               // 場上所有硬幣 { id, def, body, mesh, value, state:{} }
const touchCooldown = new Map(); // 碰撞事件節流 key:"idA-idB"
const texCache = new Map();
const geoCache = new Map();
const particles = [];
let shakeTime = 0;              // 相機震動
let freezeTimer = 0;            // 推板冰凍
let magnetPullTimer = 0;        // 超級磁鐵道具
let isMobileLayout = false;

// ---------- 貼圖 ----------
function coinTexture(def) {
  if (texCache.has(def.id)) return texCache.get(def.id);
  const s = 128, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const c = cv.getContext('2d');
  // 底色
  const grad = c.createRadialGradient(s/2, s/2, 8, s/2, s/2, s/2);
  grad.addColorStop(0, lighten(def.color, 30));
  grad.addColorStop(0.75, def.color);
  grad.addColorStop(1, lighten(def.color, -35));
  c.fillStyle = grad;
  c.beginPath(); c.arc(s/2, s/2, s/2 - 2, 0, Math.PI*2); c.fill();
  // 外圈
  c.strokeStyle = lighten(def.color, -45); c.lineWidth = 6;
  c.beginPath(); c.arc(s/2, s/2, s/2 - 6, 0, Math.PI*2); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
  c.beginPath(); c.arc(s/2, s/2, s/2 - 12, 0, Math.PI*2); c.stroke();
  // 圖示
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (def.kind === 'normal') {
    c.fillStyle = 'rgba(0,0,0,.55)';
    c.font = '900 56px Arial';
    c.fillText(String(def.value), s/2, s/2 + 2);
  } else {
    c.font = '64px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    c.fillText(def.icon, s/2, s/2 + 4);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(def.id, tex);
  return tex;
}

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

// 垂直斷面 AO 漸層貼圖（上亮下暗，讓切面有立體陰影感）
function aoTexture(topHex, bottomHex) {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, topHex);
  g.addColorStop(0.25, topHex);
  g.addColorStop(1, bottomHex);
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelTexture(text, color = '#ffd23f') {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const c = cv.getContext('2d');
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '900 72px "PingFang TC","Microsoft JhengHei",Arial';
  c.fillStyle = color;
  c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 初始化 ----------
export function initMachine(Gref) {
  G = Gref;
  const app = document.getElementById('app');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  app.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140b24);
  scene.fog = new THREE.Fog(0x140b24, 24, 46);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  applyCamera();

  // 燈光
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x2a1840, 0.55));
  const key = new THREE.DirectionalLight(0xfff2d8, 1.35);
  key.position.set(4, 12, 8);
  scene.add(key);
  const warm = new THREE.PointLight(0xffb86b, 30, 18, 2);
  warm.position.set(0, 6, -3);
  scene.add(warm);
  const front = new THREE.PointLight(0xff8de0, 14, 12, 2);
  front.position.set(0, 2.5, 5.5);
  scene.add(front);

  // 物理世界
  world = new CANNON.World();
  world.gravity.set(0, LAYOUT.physics.gravity, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  coinMat = new CANNON.Material('coin');
  staticMat = new CANNON.Material('static');
  world.addContactMaterial(new CANNON.ContactMaterial(coinMat, coinMat, {
    friction: LAYOUT.physics.friction, restitution: LAYOUT.physics.restitution }));
  // 地板/推板刻意做得滑（像真實推幣機的鋼板面），推力才能傳到前緣
  world.addContactMaterial(new CANNON.ContactMaterial(coinMat, staticMat, {
    friction: LAYOUT.physics.floorFriction, restitution: LAYOUT.physics.restitution }));

  buildMachine();
  buildAimMarker();
  window.addEventListener('resize', onResize);
  onResize();
}

export function applyCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  isMobileLayout = aspect < 0.8;
  const c = isMobileLayout ? LAYOUT.cameraMobile : LAYOUT.cameraPC;
  camera.fov = c.fov;
  camera.aspect = aspect;
  let px = c.x, py = c.y, pz = c.z;
  if (aspect < 1) {
    // 直屏自動取景：沿視線方向拉遠，讓機台寬度完整入鏡
    const halfW = Math.max(LAYOUT.machine.floorW, LAYOUT.machine.fieldFrontW) / 2 + 1.0;
    const hHalf = Math.atan(Math.tan(c.fov * Math.PI / 360) * aspect);
    const need = halfW / Math.tan(hHalf);
    const look = new THREE.Vector3(0, c.lookY, c.lookZ);
    const dir = new THREE.Vector3(c.x, c.y, c.z).sub(look);
    const dist = Math.max(dir.length(), need);
    dir.normalize().multiplyScalar(dist);
    px = look.x + dir.x; py = look.y + dir.y; pz = look.z + dir.z;
  }
  camera.position.set(px, py, pz);
  camera.lookAt(0, c.lookY, c.lookZ);
  camera.updateProjectionMatrix();
  camera.userData.base = { x: px, y: py, z: pz };
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyCamera();
}

// ---------- 機台建構 ----------
export function buildMachine() {
  // 清掉舊機台（DEV 重建用）
  if (machineGroup) {
    scene.remove(machineGroup);
    for (const b of [...world.bodies]) if (b.userData?.isMachine) world.removeBody(b);
  }
  machineGroup = new THREE.Group();
  scene.add(machineGroup);

  const M = LAYOUT.machine;
  const w = M.floorW, halfW = w / 2;
  const backZ = M.floorBackZ, frontZ = M.floorFrontZ;
  const wallT = 0.35, wallH = 5.2;

  const addStatic = (sx, sy, sz, x, y, z, mesh) => {
    const body = new CANNON.Body({ mass: 0, material: staticMat,
      shape: new CANNON.Box(new CANNON.Vec3(sx/2, sy/2, sz/2)) });
    body.position.set(x, y, z);
    body.userData = { isMachine: true };
    world.addBody(body);
    if (mesh) { mesh.position.set(x, y, z); machineGroup.add(mesh); }
    return body;
  };

  const floorMatV = new THREE.MeshStandardMaterial({ color: 0x3d2a5e, roughness: 0.85, metalness: 0.1 });
  const feltMatV = new THREE.MeshStandardMaterial({ color: 0x2f5e3d, roughness: 0.95 });
  const frameMatV = new THREE.MeshStandardMaterial({ color: 0x8f2fd0, roughness: 0.4, metalness: 0.55 });
  const glassMatV = new THREE.MeshPhysicalMaterial({ color: 0xaad4ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, side: THREE.DoubleSide });

  // 後段地板（推板滑行區，被推板蓋住，深色）；梯形視覺與斜牆貼合
  const backLen = 0 - backZ;
  const fwAt = (z) => w + (M.fieldFrontW - w) * ((z - backZ) / (frontZ - backZ));   // 任意 z 的檯面寬
  {
    const bShape = new THREE.Shape();
    bShape.moveTo(-w/2 - 0.3, 0);
    bShape.lineTo(w/2 + 0.3, 0);
    bShape.lineTo(fwAt(0)/2 + 0.3, backLen);
    bShape.lineTo(-fwAt(0)/2 - 0.3, backLen);
    bShape.closePath();
    const bGeo = new THREE.ExtrudeGeometry(bShape, { depth: 0.5, bevelEnabled: false });
    const bMesh = new THREE.Mesh(bGeo, [floorMatV, floorMatV]);
    bMesh.rotation.x = Math.PI / 2;
    bMesh.position.set(0, -0.01, backZ);
    machineGroup.add(bMesh);
    const bBody = new CANNON.Body({ mass: 0, material: staticMat,
      shape: new CANNON.Box(new CANNON.Vec3(M.fieldFrontW/2, 0.25, backLen/2)) });
    bBody.position.set(0, -0.25, backZ + backLen/2);
    bBody.userData = { isMachine: true };
    world.addBody(bBody);
  }
  // 前段地板：梯形（後窄前寬、開口較大）；物理面比視覺短一截（唇口）
  const frontLen = frontZ - 0;
  const lip = 0.3;
  const fw = M.fieldFrontW;
  const floorBody = new CANNON.Body({ mass: 0, material: staticMat,
    shape: new CANNON.Box(new CANNON.Vec3(fw/2, 0.25, (frontLen - lip)/2)) });
  floorBody.position.set(0, -0.25, (frontLen - lip)/2);
  floorBody.userData = { isMachine: true };
  world.addBody(floorBody);
  // 梯形視覺：頂面絨布、側面深色（有立體斷面感）
  const feltSideMat = new THREE.MeshStandardMaterial({ color: 0x12241a, roughness: 0.95 });
  const trapShape = new THREE.Shape();
  trapShape.moveTo(-fwAt(0)/2 - 0.3, 0);
  trapShape.lineTo(fwAt(0)/2 + 0.3, 0);
  trapShape.lineTo(fwAt(frontZ - lip)/2 + 0.3, frontLen - lip);
  trapShape.lineTo(-fwAt(frontZ - lip)/2 - 0.3, frontLen - lip);
  trapShape.closePath();
  const trapGeo = new THREE.ExtrudeGeometry(trapShape, { depth: 0.5, bevelEnabled: false });
  const floorMesh = new THREE.Mesh(trapGeo, [feltMatV, feltSideMat]);
  floorMesh.rotation.x = Math.PI / 2;     // shape 的 XY → 世界 XZ，厚度往下
  floorMesh.position.set(0, -0.01, 0);
  machineGroup.add(floorMesh);

  // 機櫃底座：填滿地板與得分槽之間的黑洞，左右延伸到牆外（消除側邊縫隙感）
  const baseMat = new THREE.MeshStandardMaterial({ map: aoTexture('#231238', '#0a0614'), roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(fw + 1, 1.35, frontZ - backZ + 0.6), baseMat);
  base.position.set(0, -1.2, (frontZ + backZ) / 2 + 0.1);
  machineGroup.add(base);

  // 側牆：左右各一整面連續斜牆（後窄前寬、外八），並往地板下方延伸防擠出
  const fullLen = frontZ - backZ;
  const theta = Math.atan(((fw - w) / 2) / fullLen);
  const slantLen = fullLen / Math.cos(theta) + 0.6;
  for (const sgn of [-1, 1]) {
    const wx = sgn * ((w + fw) / 4 + wallT/2);
    const wz = (backZ + frontZ) / 2;
    const slantBody = new CANNON.Body({ mass: 0, material: staticMat,
      shape: new CANNON.Box(new CANNON.Vec3(wallT/2, (wallH + 3)/2, slantLen/2)) });
    slantBody.position.set(wx, (wallH + 3)/2 - 3.5, wz);
    slantBody.quaternion.setFromEuler(0, sgn * theta, 0);
    slantBody.userData = { isMachine: true };
    world.addBody(slantBody);
    const slantMesh = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH + 3, slantLen), frameMatV);
    slantMesh.position.copy(slantBody.position);
    slantMesh.quaternion.copy(slantBody.quaternion);
    machineGroup.add(slantMesh);
    // 玻璃沿斜牆內側
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(slantLen - 0.6, wallH - 1), glassMatV);
    glass.rotation.y = sgn * (Math.PI / 2 + theta);
    glass.position.set(wx - sgn * (wallT/2 + 0.02), wallH/2, wz);
    machineGroup.add(glass);
  }

  // 後牆
  addStatic(w + 1, wallH + 2, wallT, 0, wallH/2, backZ - wallT/2,
    new THREE.Mesh(new THREE.BoxGeometry(w + 1, wallH + 2, wallT), frameMatV));

  // 上層擋板（backstop：讓推板縮回時把上層硬幣刮落）
  const bsZ = M.pusherMinZ + 0.1;
  addStatic(w, 2.2, 0.3, 0, M.pusherH + 1.1 + 0.08, bsZ - 0.15,
    new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, 0.3), frameMatV));

  // 招牌背板
  const board = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x5a1e8a, roughness: 0.4, emissive: 0x30104a }));
  board.position.set(0, wallH + 2.2, backZ - 0.3);
  machineGroup.add(board);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6),
    new THREE.MeshBasicMaterial({ map: labelTexture('🦝 浣熊推幣機'), transparent: true }));
  label.position.set(0, wallH + 2.2, backZ - 0.13);
  machineGroup.add(label);

  // 得分槽（前緣下方，發光）
  const trough = new THREE.Mesh(new THREE.BoxGeometry(M.fieldFrontW + 1, 0.8, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xaa7700, emissiveIntensity: 0.7, roughness: 0.35 }));
  trough.position.set(0, -1.6, frontZ + 0.9);
  machineGroup.add(trough);
  const troughLabel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85),
    new THREE.MeshBasicMaterial({ map: labelTexture('SCORE ▼', '#3a2400'), transparent: true }));
  troughLabel.position.set(0, -1.35, frontZ + 1.72);
  troughLabel.rotation.x = -0.5;
  machineGroup.add(troughLabel);


  // 推板（kinematic）：前緣中央有半圓凹口（俯視凹字形），凹弧會把錢幣塔往前推
  const pd = M.pusherDepth, ph = M.pusherH, R = M.notchR;
  const hwp = (w - 0.04) / 2;
  if (pusherBody) world.removeBody(pusherBody);
  pusherBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: staticMat });
  // 兩側凸出的肩（凹字的兩豎）
  const sw = hwp - R;
  for (const sgn of [-1, 1]) {
    pusherBody.addShape(new CANNON.Box(new CANNON.Vec3(sw/2, ph/2, pd/2)),
      new CANNON.Vec3(sgn * (R + sw/2), 0, 0));
  }
  // 凹口後方的本體
  pusherBody.addShape(new CANNON.Box(new CANNON.Vec3(R, ph/2, (pd - R)/2)),
    new CANNON.Vec3(0, 0, -R/2));
  // 用四段弦逼近半圓凹弧
  for (const deg of [202.5, 247.5, 292.5, 337.5]) {
    const th = deg * Math.PI / 180;
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), th + Math.PI / 2);
    pusherBody.addShape(new CANNON.Box(new CANNON.Vec3(0.55, ph/2, 0.07)),
      new CANNON.Vec3((R + 0.05) * Math.cos(th), 0, pd/2 + (R + 0.05) * Math.sin(th)), q);
  }
  pusherBody.userData = { isMachine: true };
  world.addBody(pusherBody);
  // 視覺：帶半圓凹口的擠出形狀
  const pusherMatV = new THREE.MeshStandardMaterial({ color: 0xb44fd9, roughness: 0.35, metalness: 0.5 });
  const pusherSideMat = new THREE.MeshStandardMaterial({ color: 0x7a2f96, roughness: 0.45, metalness: 0.4 });
  const ps = new THREE.Shape();
  ps.moveTo(-hwp, -pd/2);
  ps.lineTo(hwp, -pd/2);
  ps.lineTo(hwp, pd/2);
  ps.lineTo(R, pd/2);
  ps.absarc(0, pd/2, R, 0, Math.PI, true);   // 半圓凹口（往推板內凹）
  ps.lineTo(-hwp, pd/2);
  ps.closePath();
  const pGeo = new THREE.ExtrudeGeometry(ps, { depth: ph, bevelEnabled: false });
  const pInner = new THREE.Mesh(pGeo, [pusherMatV, pusherSideMat]);
  pInner.rotation.x = Math.PI / 2;
  pInner.position.y = ph / 2;
  pusherMesh = new THREE.Group();
  pusherMesh.add(pInner);
  // 兩肩前緣霓虹條
  for (const sgn of [-1, 1]) {
    const neon = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.1, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xff8de0, emissive: 0xff4fb8, emissiveIntensity: 1.5 }));
    neon.position.set(sgn * (R + sw/2), ph/2 - 0.05, pd/2 + 0.04);
    pusherMesh.add(neon);
  }
  machineGroup.add(pusherMesh);
  updatePusher(0);
}

function buildAimMarker() {
  const P = LAYOUT.physics;
  aimMarker = new THREE.Mesh(
    new THREE.CylinderGeometry(P.coinRadius, P.coinRadius, P.coinHeight, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.55 }));
  scene.add(aimMarker);
  const lineMat = new THREE.LineDashedMaterial({ color: 0xffe66d, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.5 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -LAYOUT.machine.dropY - 0.5, 0)]);
  aimLine = new THREE.Line(lineGeo, lineMat);
  aimLine.computeLineDistances();
  aimMarker.add(aimLine);
  setAimX(0);
}

export function setAimX(x) {
  const M = LAYOUT.machine;
  const cx = Math.max(-M.aimMaxX, Math.min(M.aimMaxX, x));
  aimMarker.position.set(cx, M.dropY, M.dropZ);
  return cx;
}
export function getAimX() { return aimMarker.position.x; }
export function setAimVisible(v) { aimMarker.visible = v; }
export function setAimColor(hex) { aimMarker.material.color.set(hex); }

// 由螢幕座標反推瞄準 x（射線打在 dropY 平面）
const _ray = new THREE.Raycaster();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();
export function aimFromScreen(px, py) {
  const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
  _ray.setFromCamera(ndc, camera);
  _plane.constant = -1.0; // 用 y=1 平面近似桌面高度，手感較直覺
  if (_ray.ray.intersectPlane(_plane, _hit)) return setAimX(_hit.x);
  return getAimX();
}

// ---------- 硬幣 ----------
function makeCoinMesh(def, r = null, h = null) {
  const P = LAYOUT.physics;
  r = r ?? P.coinRadius * (def.radiusScale || 1);
  h = h ?? P.coinHeight * (def.radiusScale ? Math.min(def.radiusScale, 1.4) : 1);
  const geoKey = def.id;
  let geo = geoCache.get(geoKey);
  if (!geo) { geo = new THREE.CylinderGeometry(r, r, h, 22); geoCache.set(geoKey, geo); }
  const tex = coinTexture(def);
  const sideMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(def.color).multiplyScalar(0.8), roughness: 0.35, metalness: 0.75 });
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.65 });
  return { mesh: new THREE.Mesh(geo, [sideMat, faceMat, faceMat]), r, h };
}

export function spawnCoin(defId, opts = {}) {
  const def = COIN_DEFS[defId];
  if (!def) return null;
  if (coins.length >= LAYOUT.physics.maxCoins && !opts.force) return null;
  const P = LAYOUT.physics;
  const r = P.coinRadius * (def.radiusScale || 1);
  const h = P.coinHeight * (def.radiusScale ? Math.min(def.radiusScale, 1.4) : 1);
  const mass = P.coinMass * (def.massScale || 1);

  const { mesh } = makeCoinMesh(def, r, h);
  scene.add(mesh);

  const body = new CANNON.Body({
    mass, material: coinMat,
    shape: new CANNON.Cylinder(r, r, h, 12),
    linearDamping: P.linearDamping, angularDamping: 0.25,
    sleepSpeedLimit: 0.35, sleepTimeLimit: 0.8,
  });
  const M = LAYOUT.machine;
  body.position.set(
    opts.x ?? 0,
    opts.y ?? M.dropY,
    opts.z ?? M.dropZ);
  if (opts.rot !== false) {
    body.quaternion.setFromEuler(Math.random() * 0.5 - 0.25, Math.random() * Math.PI, Math.random() * 0.5 - 0.25);
  }
  if (opts.vx || opts.vy || opts.vz) body.velocity.set(opts.vx || 0, opts.vy || 0, opts.vz || 0);
  world.addBody(body);

  const coin = {
    id: uid++, def, body, mesh,
    value: opts.value ?? def.value,
    state: { gen: opts.gen || 0, landedAt: null, rusted: false, growth: 0, lastTrigger: 0 },
  };
  body.userData = { coin };
  body.addEventListener('collide', (e) => onCollide(coin, e));
  coins.push(coin);
  return coin;
}

function onCollide(coin, e) {
  const other = e.body.userData?.coin;
  const imp = Math.abs(e.contact.getImpactVelocityAlongNormal());
  if (imp > 1.2) Sound.clink(imp * 0.3);
  if (!other) return;
  // 同一對硬幣事件節流（0.5 秒）
  const key = coin.id < other.id ? `${coin.id}-${other.id}` : `${other.id}-${coin.id}`;
  const now = performance.now();
  if (touchCooldown.get(key) > now - 500) return;
  touchCooldown.set(key, now);
  G.game?.onCoinTouch(coin, other, imp);
}

export function removeCoin(coin) {
  const i = coins.indexOf(coin);
  if (i < 0) return;
  coins.splice(i, 1);
  world.removeBody(coin.body);
  scene.remove(coin.mesh);
}

export function getCoins() { return coins; }

export function coinsNear(pos, radius, filter) {
  const out = [];
  for (const c of coins) {
    const d = c.body.position.distanceTo(new CANNON.Vec3(pos.x, pos.y, pos.z));
    if (d <= radius && (!filter || filter(c))) out.push(c);
  }
  return out;
}

// 爆炸：推開周圍硬幣
export function explode(pos, radius, power, { destroyBad = false, big = false } = {}) {
  const boost = G.game?.explosionBoost?.() || 1;
  radius *= boost; power *= boost;
  Sound.explosion(big);
  shakeTime = Math.max(shakeTime, big ? 0.6 : 0.3);
  burst(pos, big ? 60 : 26, big ? 0xffe66d : 0xff9f4a);
  const toDestroy = [];
  for (const c of coins) {
    const p = c.body.position;
    const dx = p.x - pos.x, dy = p.y - pos.y, dz = p.z - pos.z;
    const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (d > radius) continue;
    const f = power * (1 - d / radius);
    c.body.wakeUp();
    // 往外推 + 往前(+z)與往上偏移，讓爆炸傾向把硬幣送進得分區
    c.body.applyImpulse(new CANNON.Vec3(
      (dx / (d || 1)) * f * 0.5,
      Math.min(f * 0.35, 4),
      (dz / (d || 1)) * f * 0.35 + f * 0.55));
    if (destroyBad && c.def.kind === 'bad') toDestroy.push(c);
  }
  for (const c of toDestroy) { burst(c.body.position, 12, 0xff5252); G.game?.onBadDestroyed(c); removeCoin(c); }
  // 大爆炸會震倒推板上的錢幣塔
  if (big) crashTowers(1.5);
}

// 龍捲風：切向攪動
export function tornadoAt(pos, radius, power) {
  Sound.shake();
  shakeTime = Math.max(shakeTime, 0.35);
  burst(pos, 30, 0x9fd8ff);
  for (const c of coins) {
    const p = c.body.position;
    const dx = p.x - pos.x, dz = p.z - pos.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d > radius) continue;
    const f = power * (1 - d / radius);
    c.body.wakeUp();
    c.body.applyImpulse(new CANNON.Vec3(-dz / (d || 1) * f * 0.6, f * 0.3, dx / (d || 1) * f * 0.6 + f * 0.5));
  }
}

// 全場推力（磁鐵/搖晃）
export function pushAll(fz, fy = 0, fx = 0, randomize = 0) {
  for (const c of coins) {
    c.body.wakeUp();
    c.body.applyImpulse(new CANNON.Vec3(
      fx + (Math.random() - 0.5) * randomize,
      fy + Math.random() * randomize * 0.5,
      fz + (Math.random() - 0.5) * randomize * 0.5));
  }
}

export function shakeMachine(power = 1.6) {
  Sound.shake();
  shakeTime = Math.max(shakeTime, 0.5);
  pushAll(power * 0.5, power * 0.55, 0, power * 1.2);
  // 搖晃會把推板上的錢幣塔搖倒
  crashTowers(power * 0.8);
}

export function setFreeze(sec) { freezeTimer = Math.max(freezeTimer, sec); }
export function setMagnetPull(sec) { magnetPullTimer = Math.max(magnetPullTimer, sec); }

// 雷射視覺
export function laserBeam(x) {
  const M = LAYOUT.machine;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, M.floorFrontZ - M.floorBackZ + 2),
    new THREE.MeshBasicMaterial({ color: 0xff4f9e, transparent: true, opacity: 0.95 }));
  beam.position.set(x, 0.45, (M.floorFrontZ + M.floorBackZ) / 2);
  scene.add(beam);
  Sound.laser();
  let t = 0;
  const anim = () => {
    t += 0.05;
    beam.material.opacity = Math.max(0, 0.95 - t * 1.6);
    beam.scale.x = beam.scale.y = 1 + t * 3;
    if (beam.material.opacity > 0) requestAnimationFrame(anim);
    else scene.remove(beam);
  };
  anim();
}

// ---------- 粒子 ----------
function burst(pos, n, color) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(n * 3);
  const vels = [];
  for (let i = 0; i < n; i++) {
    positions[i*3] = pos.x; positions[i*3+1] = pos.y; positions[i*3+2] = pos.z;
    vels.push(new THREE.Vector3((Math.random()-0.5)*7, Math.random()*6, (Math.random()-0.5)*7));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.14, transparent: true, opacity: 1 });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  particles.push({ pts, vels, life: 0.8, t: 0 });
}

export function sparkleAt(pos, color = 0x7dffb0) { burst(pos, 10, color); }

// ---------- 推板 ----------
function updatePusher(dt) {
  const M = LAYOUT.machine;
  if (freezeTimer > 0) {
    freezeTimer -= dt;
    pusherBody.velocity.set(0, 0, 0);
  } else {
    pusherTheta += dt * (Math.PI * 2) / M.pusherPeriod;
    const s = 0.5 + 0.5 * Math.sin(pusherTheta);
    const front = M.pusherMinZ + M.pusherRange * s;
    const cz = front - M.pusherDepth / 2;
    const dsdT = 0.5 * Math.cos(pusherTheta) * (Math.PI * 2) / M.pusherPeriod;
    pusherBody.velocity.set(0, 0, M.pusherRange * dsdT);
    pusherBody.position.set(0, M.pusherH / 2, cz);
    // 追蹤推板前緣位移（錢幣塔用）
    if (pusherFront !== null) deckDelta += front - pusherFront;
    pusherFront = front;
    // kinematic 推板不會喚醒睡眠中的硬幣：前進時主動喚醒掃掠區內的硬幣
    if (pusherBody.velocity.z > 0.01) {
      for (const c of coins) {
        const p = c.body.position;
        if (c.body.sleepState === CANNON.Body.SLEEPING && p.z < front + 0.55 && p.y < M.pusherH + 0.6) c.body.wakeUp();
      }
    }
  }
  pusherMesh.position.copy(pusherBody.position);
}

// ---------- 主更新 ----------
const FIXED = 1 / 60;
let acc = 0;
export function stepMachine(dt, timeScale = 1) {
  acc += Math.min(dt, 0.05) * timeScale;
  let n = 0;
  while (acc >= FIXED && n < 4) {
    acc -= FIXED; n++;
    updatePusher(FIXED);
    if (magnetPullTimer > 0) {
      magnetPullTimer -= FIXED;
      for (const c of coins) { c.body.wakeUp(); c.body.applyImpulse(new CANNON.Vec3(0, 0, 0.25 * c.body.mass)); }
    }
    world.step(FIXED);
    checkFallen();
  }

  // 同步 mesh
  for (const c of coins) {
    c.mesh.position.copy(c.body.position);
    c.mesh.quaternion.copy(c.body.quaternion);
  }

  // 錢幣塔出幣器更新
  updateTowers(Math.min(dt, 0.05) * timeScale);

  // 粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    const arr = p.pts.geometry.attributes.position.array;
    for (let j = 0; j < p.vels.length; j++) {
      arr[j*3] += p.vels[j].x * dt;
      arr[j*3+1] += p.vels[j].y * dt;
      arr[j*3+2] += p.vels[j].z * dt;
      p.vels[j].y -= 12 * dt;
    }
    p.pts.geometry.attributes.position.needsUpdate = true;
    p.pts.material.opacity = 1 - p.t / p.life;
    if (p.t >= p.life) { scene.remove(p.pts); particles.splice(i, 1); }
  }

  // 相機震動
  if (shakeTime > 0) {
    shakeTime -= dt;
    const a = camera.userData.base || camera.position;
    camera.position.set(
      a.x + (Math.random() - 0.5) * 0.14 * shakeTime * 4,
      a.y + (Math.random() - 0.5) * 0.1 * shakeTime * 4,
      a.z);
    if (shakeTime <= 0) applyCamera();
  }

  renderer.render(scene, camera);
}

// 掉落判定：得分 or 側溝流失
function checkFallen() {
  const M = LAYOUT.machine;
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    const p = c.body.position;
    if (c.state.landedAt === null && p.y < LAYOUT.machine.pusherH + 0.4 && Math.abs(c.body.velocity.y) < 1) {
      c.state.landedAt = performance.now();
    }
    // 只要掉下機台（前緣或側邊）通通算分，不讓玩家有「白掉」的挫折感
    if (p.y < -0.9) {
      removeCoin(c);
      G.game?.onCoinScored(c);
    } else if (p.y < -8 || Math.abs(p.x) > 12 || p.z < M.floorBackZ - 3) {
      removeCoin(c);
      G.game?.onCoinLost(c);
    }
  }
}

// ---------- 錢幣塔（從下層凹口中央升起） ----------
// 機器不定時在推板凹口中央升出一座高塔（立在下層檯面上）。
// 塔有一個直立圓柱實體，會被推板凹弧與幣海一路往前擠，
// 擠到前緣就整座倒進幣海。
const dispenser = { towers: [], nextIn: 6 };
let pusherFront = null, deckDelta = 0;

export function towerCount() { return dispenser.towers.reduce((s, t) => s + t.coins.length, 0); }

export function towerDebug() {
  return dispenser.towers.map(t => ({ state: t.state, x: +t.x.toFixed(2), z: +t.z.toFixed(2),
    bodyZ: +t.body.position.z.toFixed(2), bodyY: +t.body.position.y.toFixed(2),
    vz: +t.body.velocity.z.toFixed(2), type: t.body.type, pusherFront: +(pusherFront ?? 0).toFixed(2) }));
}

export function dispenseTower(size = null, goldRatio = 0.12) {
  const M = LAYOUT.machine;
  if (dispenser.towers.length >= 1) return false;   // 凹口一次只站一座塔
  const n = size || Math.round(M.towerSizeMin + Math.random() * (M.towerSizeMax - M.towerSizeMin));
  // 塔立在「推板最大伸出時凹口中央」的位置
  const z0 = M.pusherMinZ + M.pusherRange - M.notchR + 0.32;
  const t = { x: 0, z: z0, riseT: 0, state: 'rising', coins: [], body: null, totalH: 0 };
  for (let i = 0; i < n; i++) {
    const id = Math.random() < goldRatio ? 'gold' : (Math.random() < 0.25 ? 'silver' : 'copper');
    const def = COIN_DEFS[id];
    const { mesh, h } = makeCoinMesh(def);
    mesh.position.set(0, -5, z0);
    scene.add(mesh);
    t.totalH += h;
    t.coins.push({ def, value: def.value, h, mesh,
      yaw: Math.random() * Math.PI, jx: (Math.random() - 0.5) * 0.05, jz: (Math.random() - 0.5) * 0.05 });
  }
  // 直立圓柱實體：升起時 kinematic，升完轉 dynamic（可被推板與硬幣往前擠）
  const r = LAYOUT.physics.coinRadius + 0.06;
  t.body = new CANNON.Body({ mass: n * 0.8, type: CANNON.Body.KINEMATIC, material: coinMat,
    shape: new CANNON.Cylinder(r, r, t.totalH, 10), linearDamping: 0.3 });
  t.body.position.set(0, t.totalH / 2 + 0.01, z0);
  t.body.fixedRotation = true;
  t.body.allowSleep = false;
  t.body.updateMassProperties();
  world.addBody(t.body);
  dispenser.towers.push(t);
  Sound.grow();
  G.ui?.toast('🗼 錢幣塔升起來了！', 'good');
  return true;
}

function crashTower(t, forward = 1.6) {
  const idx = dispenser.towers.indexOf(t);
  if (idx >= 0) dispenser.towers.splice(idx, 1);
  if (t.body) world.removeBody(t.body);
  Sound.shake();
  shakeTime = Math.max(shakeTime, 0.4);
  t.coins.forEach((c, i) => {
    const p = c.mesh.position.clone();
    scene.remove(c.mesh);
    spawnCoin(c.def.id, { x: p.x, y: p.y, z: p.z, value: c.value, force: true, rot: false,
      vx: (Math.random() - 0.5) * 1.5, vy: 0.2, vz: forward + i * 0.12 + Math.random() });
  });
  G.ui?.toast('🗼 錢幣塔倒下來了！', 'good');
}

export function crashTowers(forward = 1.2) {
  for (const t of [...dispenser.towers]) if (t.state !== 'rising') crashTower(t, forward);
}

function updateTowers(dt) {
  const M = LAYOUT.machine;
  // 不定時出塔（遊戲進行中才計時）
  if (G.game?.run?.state === 'play') {
    dispenser.nextIn -= dt;
    if (dispenser.nextIn <= 0) {
      dispenseTower();
      dispenser.nextIn = M.towerEveryMin + Math.random() * (M.towerEveryMax - M.towerEveryMin);
    }
  }
  for (const t of [...dispenser.towers]) {
    if (t.state === 'rising') {
      t.riseT += dt / 1.6;
      if (t.riseT >= 1) { t.riseT = 1; t.state = 'riding'; }
    } else {
      // 腳本化推進：推板凹弧伸到哪，塔就被推到哪（單向前進）
      const target = pusherFront - M.notchR + 0.52;
      if (target > t.z) {
        t.z = target;
        t.body.position.z = t.z;
        for (const c of coinsNear({ x: t.x, y: 0.6, z: t.z }, 1.3)) c.body.wakeUp();
      }
      // 被推出凹口就整座往前倒（門檻 = 凹弧最大伸出仍推得到的位置）
      if (t.z > M.pusherMinZ + M.pusherRange - M.notchR + 0.42) {
        crashTower(t, 2.0);
        continue;
      }
    }
    // 排列塔身硬幣 mesh
    let cy = -(1 - t.riseT) * t.totalH;
    for (const c of t.coins) {
      c.mesh.position.set(t.x + c.jx, cy + c.h / 2, t.z + c.jz);
      c.mesh.rotation.set(0, c.yaw, 0);
      cy += c.h;
    }
  }
  deckDelta = 0;
}

// 世界座標 → 螢幕座標（分數跳字用）
const _v = new THREE.Vector3();
export function project(pos) {
  _v.set(pos.x, pos.y, pos.z).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight };
}

export function frontCenter() {
  return { x: 0, y: 0.5, z: LAYOUT.machine.floorFrontZ - 0.8 };
}

// 物理參數即時套用（DEV）
export function applyPhysicsParams() {
  world.gravity.set(0, LAYOUT.physics.gravity, 0);
  for (const cm of world.contactmaterials) {
    const isFloor = cm.materials.includes(staticMat);
    cm.friction = isFloor ? LAYOUT.physics.floorFriction : LAYOUT.physics.friction;
    cm.restitution = LAYOUT.physics.restitution;
  }
}
