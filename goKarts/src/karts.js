// 车辆模组：6 台车型属性 + Kenney 赛车模型（CC0）载入，失败时退回低多边形自建车
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// topSpeed: 极速(单位/秒)  accel: 加速度  handling: 转向灵敏  weight: 重量(碰撞优势)  drift: 漂移增压效率
export const KART_TYPES = [
  { id: 'red',    name: '疾风红魂', color: 0xe33b3b, accent: 0xffd23f, topSpeed: 42, accel: 26, handling: 1.00, weight: 1.0, drift: 1.0,  desc: '全能均衡・新手首选' },
  { id: 'yellow', name: '雷霆闪电', color: 0xffc21f, accent: 0x222222, topSpeed: 46, accel: 22, handling: 0.82, weight: 1.0, drift: 0.9,  desc: '极速最强・转向偏重' },
  { id: 'green',  name: '碧绿精灵', color: 0x2fb757, accent: 0xd8f7e0, topSpeed: 40, accel: 27, handling: 1.22, weight: 0.85, drift: 1.05, desc: '神级操控・灵活过弯' },
  { id: 'blue',   name: '深海重炮', color: 0x2f5fd0, accent: 0x9fd0ff, topSpeed: 43, accel: 21, handling: 0.88, weight: 1.5, drift: 0.9,  desc: '重量级・碰撞不吃亏' },
  { id: 'pink',   name: '粉红甜心', color: 0xff6fb0, accent: 0xffffff, topSpeed: 40, accel: 30, handling: 1.08, weight: 0.8, drift: 1.0,  desc: '起步火箭・轻巧敏捷' },
  { id: 'purple', name: '暗夜紫影', color: 0x8447d6, accent: 0x3ce6ff, topSpeed: 42, accel: 24, handling: 1.02, weight: 0.95, drift: 1.35, desc: '漂移大师・弯道超车' },
];

// AI 车手名字池
export const AI_NAMES = ['小灰', '阿boost', '狂飙哥', '奶油圈', '尾速仔', '甜甜圈', '橡皮糖'];

// ============ Kenney 模型载入（CC0，assets/kenney/）============
const MODEL_FILES = {
  red: 'vehicle-truck-red.glb',
  yellow: 'vehicle-truck-yellow.glb',
  green: 'vehicle-truck-green.glb',
  purple: 'vehicle-truck-purple.glb',
};
let templates = null;
let loadPromise = null;

export function loadKartModels() {
  if (loadPromise) return loadPromise;
  const loader = new GLTFLoader();
  loadPromise = Promise.all(
    Object.entries(MODEL_FILES).map(([id, f]) =>
      loader.loadAsync('assets/kenney/' + f).then(g => [id, g.scene])
    )
  ).then(pairs => {
    templates = Object.fromEntries(pairs);
    // 蓝色与粉色：以红色版换色贴图生成
    templates.blue = recolorTemplate(templates.red, 0.585, 0.9, 0.95);
    templates.pink = recolorTemplate(templates.red, 0.905, 0.8, 1.25);
  }).catch(e => {
    console.warn('Kenney 车辆模型载入失败，改用内建模型', e);
    templates = null;
  });
  return loadPromise;
}

// 把贴图中红色系像素换成目标色相（HSL），产生新配色的模板
function recolorTemplate(src, targetH, sMul, lMul) {
  const clone = src.clone(true);
  let srcMat = null;
  src.traverse(o => { if (o.isMesh && !srcMat) srcMat = o.material; });
  const img = srcMat.map.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const [h, s, l] = rgb2hsl(px[i], px[i + 1], px[i + 2]);
    if (s > 0.3 && (h < 0.055 || h > 0.93)) {
      const [r2, g2, b2] = hsl2rgb(targetH, Math.min(1, s * sMul), Math.min(0.92, l * lMul));
      px[i] = r2; px[i + 1] = g2; px[i + 2] = b2;
    }
  }
  g.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false; // glTF UV 惯例
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = srcMat.map.magFilter;
  tex.minFilter = srcMat.map.minFilter;
  const mat = srcMat.clone();
  mat.map = tex;
  clone.traverse(o => { if (o.isMesh) o.material = mat; });
  return clone;
}

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (mx === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hsl2rgb(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = t => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255 | 0, f(h) * 255 | 0, f(h - 1 / 3) * 255 | 0];
}

// ============ 车辆建构 ============
export function buildKartMesh(type) {
  const built = templates && templates[type.id]
    ? buildFromTemplate(type)
    : buildBoxKart(type);
  // 假阴影（blob shadow — 手机效能友善）
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06;
  built.mesh.add(shadow);
  return built;
}

function buildFromTemplate(type) {
  const g = new THREE.Group();
  const model = templates[type.id].clone(true);
  // 尺寸校正：车长贴齐 2.7、车底贴地
  const bbox = new THREE.Box3().setFromObject(model);
  const size = bbox.getSize(new THREE.Vector3());
  const len = Math.max(size.x, size.z);
  model.scale.setScalar(2.7 / len);
  const bbox2 = new THREE.Box3().setFromObject(model);
  model.position.y -= bbox2.min.y;
  g.add(model);

  // 车轮：包一层转向用 wrapper，轮体本身滚动
  const wheels = [];
  const wheelNodes = [];
  model.traverse(o => { if (o.name && o.name.startsWith('wheel')) wheelNodes.push(o); });
  for (const o of wheelNodes) {
    const wrapper = new THREE.Group();
    wrapper.position.copy(o.position);
    wrapper.userData.front = o.name.includes('front');
    wrapper.userData.spin = [o];
    o.parent.add(wrapper);
    o.position.set(0, 0, 0);
    wrapper.add(o);
    wheels.push(wrapper);
  }
  return { mesh: g, wheels };
}

// ---- 内建低多边形车（模型载入失败时的后备）----
function buildBoxKart(type) {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: type.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
  const accent = new THREE.MeshLambertMaterial({ color: type.accent });
  const skin = new THREE.MeshLambertMaterial({ color: 0xffd9b0 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 2.5), dark);
  chassis.position.y = 0.36; g.add(chassis);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 2.1), body);
  hull.position.y = 0.68; g.add(hull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.65), body);
  nose.position.set(0, 0.55, 1.45); g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.4), accent);
  wing.position.set(0, 0.5, 1.62); g.add(wing);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.5), accent);
  spoiler.position.set(0, 1.06, -1.15); g.add(spoiler);
  for (const sx of [-0.55, 0.55]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.09), dark);
    strut.position.set(sx, 0.88, -1.15); g.add(strut);
  }
  const wheelCol = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), dark);
  wheelCol.rotation.x = 1.1; wheelCol.position.set(0, 0.95, 0.55); g.add(wheelCol);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.42), accent);
  torso.position.set(0, 1.05, -0.15); g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
  head.position.set(0, 1.5, -0.15); g.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), body);
  helmet.position.set(0, 1.52, -0.15); g.add(helmet);
  for (const sx of [-0.32, 0.32]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.5, 8), dark);
    pipe.rotation.x = Math.PI / 2 - 0.25; pipe.position.set(sx, 0.62, -1.35); g.add(pipe);
  }

  const wheels = [];
  const wheelG = new THREE.CylinderGeometry(0.38, 0.38, 0.34, 12);
  const hubG = new THREE.CylinderGeometry(0.16, 0.16, 0.36, 8);
  for (const [sx, sz, front] of [[-0.85, 0.95, 1], [0.85, 0.95, 1], [-0.85, -0.95, 0], [0.85, -0.95, 0]]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wheelG, dark); tire.rotation.z = Math.PI / 2; w.add(tire);
    const hub = new THREE.Mesh(hubG, accent); hub.rotation.z = Math.PI / 2; w.add(hub);
    w.position.set(sx, 0.38, sz);
    w.userData.front = !!front;
    w.userData.spin = [tire, hub];
    g.add(w); wheels.push(w);
  }
  return { mesh: g, wheels };
}

let _blobTex = null;
function blobShadowTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.42)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _blobTex = new THREE.CanvasTexture(c);
  return _blobTex;
}
