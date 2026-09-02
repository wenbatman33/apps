// 车辆模组：6 台车型属性 + 复古皮卡 FBX 模型载入，失败时退回低多边形自建车
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { QUALITY, RENDER } from './render.js';

// 每台车型对应一款实体车(不同车壳), color 取自该车实际车漆色 → UI 与游戏内完全一致
// topSpeed: 极速(单位/秒)  accel: 加速度  handling: 转向灵敏  weight: 重量(碰撞优势)  drift: 漂移增压效率
export const KART_TYPES = [
  { id: 'red',    model: 'Pickup_08', name: '疾风红魂', color: 0xff674a, accent: 0xffd23f, topSpeed: 42, accel: 26, handling: 1.00, weight: 1.0, drift: 1.0,  desc: '全能均衡・新手首选' },
  { id: 'yellow', model: 'Pickup_05', name: '雷霆闪电', color: 0xf2ae42, accent: 0x222222, topSpeed: 46, accel: 22, handling: 0.82, weight: 1.0, drift: 0.9,  desc: '极速最强・转向偏重' },
  { id: 'green',  model: 'Pickup_03', name: '碧绿精灵', color: 0x5ac696, accent: 0xd8f7e0, topSpeed: 40, accel: 27, handling: 1.22, weight: 0.85, drift: 1.05, desc: '神级操控・灵活过弯' },
  { id: 'blue',   model: 'Pickup_02', name: '深海重炮', color: 0x6595c6, accent: 0x9fd0ff, topSpeed: 43, accel: 21, handling: 0.88, weight: 1.5, drift: 0.9,  desc: '重量级・碰撞不吃亏' },
  { id: 'pink',   model: 'Pickup_04', name: '粉红甜心', color: 0xf28fc0, accent: 0xffffff, topSpeed: 40, accel: 30, handling: 1.08, weight: 0.8, drift: 1.0,  desc: '起步火箭・轻巧敏捷' },
  { id: 'purple', model: 'Pickup_07', name: '暗夜紫影', color: 0x774aab, accent: 0x3ce6ff, topSpeed: 42, accel: 24, handling: 1.02, weight: 0.95, drift: 1.35, desc: '漂移大师・弯道超车' },
];

// AI 车手名字池
export const AI_NAMES = ['小灰', '阿boost', '狂飙哥', '奶油圈', '尾速仔', '甜甜圈', '橡皮糖'];

// ============ 复古皮卡 FBX 载入（assets/3d/karts/）============
// 六款车共用一张色票图集(atlas.png)，各车的车漆色由其 UV 对应到不同色块，
// 因此不需换色处理，天然就是不同配色。
const MODEL_DIR = 'assets/3d/karts/';
let templates = null;
let loadPromise = null;

export function loadKartModels() {
  if (loadPromise) return loadPromise;
  const texLoader = new THREE.TextureLoader();
  const loader = new FBXLoader();

  const atlasP = texLoader.loadAsync(MODEL_DIR + 'atlas.png').then(t => {
    // flipY 保持 Three.js 预设 true —— FBX 的 UV 就是按这个惯例导出的,
    // 设成 false 会让取样落到错误色块(车漆错色、挡风玻璃变橘)
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  });

  loadPromise = Promise.all([
    atlasP,
    ...KART_TYPES.map(t => loader.loadAsync(MODEL_DIR + t.model + '.fbx').then(o => [t.id, o])),
  ]).then(([atlas, ...pairs]) => {
    const mat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.55, metalness: 0.08, envMapIntensity: RENDER.envKart });
    templates = {};
    for (const [id, obj] of pairs) {
      obj.traverse(o => { if (o.isMesh) o.material = mat; });
      templates[id] = obj;
    }
  }).catch(e => {
    console.warn('皮卡模型载入失败，改用内建模型', e);
    templates = null;
  });
  return loadPromise;
}

// ============ 选车卡片缩图：离屏渲染实际模型，确保 UI 与游戏内一致 ============
export function renderKartThumbnail(type, w = 400, h = 300) {
  if (!templates || !templates[type.id]) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3f4c, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.6);
  rim.position.set(-4, 3, -3);
  scene.add(key, rim);

  const { mesh } = buildKartMesh(type);
  mesh.rotation.y = Math.PI * 0.78; // 3/4 前左视角
  scene.add(mesh);

  const box = new THREE.Box3().setFromObject(mesh);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  // 只取车体本身(排除脚下阴影贴片)决定取景半径, 让车尽量填满卡片
  const radius = Math.max(size.x, size.z) * 0.5;
  const cam = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
  const dist = radius / Math.sin((cam.fov * Math.PI / 180) / 2) * 1.02;
  cam.position.set(c.x + dist * 0.6, c.y + dist * 0.34, c.z + dist * 0.62);
  cam.lookAt(c.x, c.y - size.y * 0.05, c.z);
  r.render(scene, cam);

  const url = canvas.toDataURL('image/png');
  r.dispose();
  return url;
}

// ============ 车辆建构 ============
export function buildKartMesh(type) {
  const built = templates && templates[type.id]
    ? buildFromTemplate(type)
    : buildBoxKart(type);
  // 有即时阴影时车体投影；低画质改用假阴影（blob shadow — 手机效能友善）
  if (QUALITY.shadows) {
    built.mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  } else {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4),
      new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06;
    built.mesh.add(shadow);
  }
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

  // 车轮：以轮心为支点包一层 wrapper（外层转向 yaw、内层轮体滚动）
  // FBX 节点名如 Pickup_08_FL_Tire / _RR_Tire
  const wheels = [];
  const wheelNodes = [];
  model.traverse(o => { if (/_(FL|FR|RL|RR)_Tire/i.test(o.name || '')) wheelNodes.push(o); });
  const _c = new THREE.Vector3();
  for (const o of wheelNodes) {
    const parent = o.parent;
    new THREE.Box3().setFromObject(o).getCenter(_c);
    const centerLocal = parent.worldToLocal(_c.clone());
    const wrapper = new THREE.Group();
    wrapper.position.copy(centerLocal);
    wrapper.userData.front = /_F[LR]_Tire/i.test(o.name);
    wrapper.userData.spin = [o];
    parent.add(wrapper);
    o.position.sub(centerLocal); // 保持轮体世界位置不变
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
