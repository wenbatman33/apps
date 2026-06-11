// 低多邊形 F1 賽車模型（純幾何組裝 + canvas 程序貼圖，無外部素材）
import * as THREE from 'three';

// 輪面貼圖：胎壁 + 配方色環 + 銀色輻條輪框 + 中心鎖（旋轉時可見滾動）
let _wheelTex = null;
function wheelCapTex() {
  if (_wheelTex) return _wheelTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 128, 128);          // 胎壁
  g.strokeStyle = '#ff1a0d'; g.lineWidth = 7;                    // 軟胎紅色環
  g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
  g.fillStyle = '#23252c';                                       // 輪框底
  g.beginPath(); g.arc(64, 64, 42, 0, 7); g.fill();
  g.strokeStyle = '#eef1f6'; g.lineWidth = 9; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {                                  // 5 根輻條
    const a = i / 5 * Math.PI * 2;
    g.beginPath();
    g.moveTo(64 + Math.cos(a) * 12, 64 + Math.sin(a) * 12);
    g.lineTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38);
    g.stroke();
  }
  g.fillStyle = '#d8b942';                                       // 中心鎖
  g.beginPath(); g.arc(64, 64, 8, 0, 7); g.fill();
  _wheelTex = new THREE.CanvasTexture(c);
  _wheelTex.colorSpace = THREE.SRGBColorSpace;
  return _wheelTex;
}

export function createF1Car(bodyColor, accentColor) {
  const grp = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.25 });
  const accent = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.7 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.95 });

  // 車身為 +X 朝前；尺寸近似真車：長 5.5m 寬 2.0m
  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); grp.add(mesh); return mesh; };

  // 底板 + 側箱
  add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 1.85), dark), -0.2, 0.18, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.46, 1.5), body), -0.5, 0.44, 0);
  // 中央單體殼，往車鼻收窄
  const mono = add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.72), body), 0.85, 0.5, 0);
  // 車鼻（圓錐）
  const nose = add(new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.5, 10), body), 2.45, 0.42, 0);
  nose.rotation.z = -Math.PI / 2;
  // 鼻翼連接板
  add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), accent), 2.3, 0.32, 0);
  // 前翼
  add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 2.0), accent), 2.85, 0.18, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 2.0), body), 2.95, 0.30, 0);
  for (const sz of [1, -1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.06), body), 2.85, 0.3, sz * 1.0);
  // 駕駛艙 + 頭枕
  add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.62), dark), 0.45, 0.78, 0);
  // 安全帽
  const helmet = add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), accent), 0.42, 0.95, 0);
  helmet.scale.y = 0.9;
  // Halo
  {
    const haloMat = new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.4, metalness: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 18, Math.PI), haloMat);
    ring.rotation.x = -Math.PI / 2; ring.rotation.z = Math.PI;
    ring.position.set(0.45, 1.02, 0);
    grp.add(ring);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 6), haloMat);
    bar.rotation.z = 0.5; bar.position.set(0.95, 0.85, 0);
    grp.add(bar);
  }
  // 引擎蓋脊背 + 進氣口
  const spine = add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.4), body), -0.85, 0.78, 0);
  spine.scale.set(1, 0.85, 1);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.3), dark), -0.35, 1.0, 0);
  // 尾翼
  add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.7), accent), -2.45, 1.05, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 1.7), body), -2.35, 0.88, 0);
  for (const sz of [1, -1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.06), body), -2.4, 0.85, sz * 0.85);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), dark), -2.1, 0.45, 0); // 尾燈座
  const rearLight = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xdd0000, emissiveIntensity: 0.8 })), -2.35, 0.45, 0);

  // 車輪：幾何先 rotateX 讓輪軸沿 Z，滾動 = rotation.z、轉向 = rotation.y
  // （Euler 順序 XYZ：轉向施加在滾動之外，兩者互不干擾）
  const wheels = [], frontWheels = [];
  const capMat = new THREE.MeshStandardMaterial({ map: wheelCapTex(), roughness: 0.4, metalness: 0.25 });
  const mkWheel = (x, z, front) => {
    const R = front ? 0.41 : 0.45, W = front ? 0.42 : 0.5;
    const geo = new THREE.CylinderGeometry(R, R, W, 20);
    geo.rotateX(Math.PI / 2); // 輪軸由 Y 轉為沿 Z
    const w = new THREE.Mesh(geo, [tire, capMat, capMat]); // [胎面, 外輪面, 內輪面]
    w.position.set(x, R, z);
    grp.add(w);
    wheels.push({ mesh: w, r: R });
    if (front) frontWheels.push(w);
    return w;
  };
  mkWheel(1.7, 0.88, true); mkWheel(1.7, -0.88, true);
  mkWheel(-1.55, 0.92, false); mkWheel(-1.55, -0.92, false);

  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; } });

  return {
    group: grp,
    // 視覺更新：輪胎滾動 + 前輪轉向
    updateWheels(dt, speed, steer) {
      for (const w of wheels) w.mesh.rotation.z += speed * dt / w.r; // 繞輪軸滾動
      for (const fw of frontWheels) fw.rotation.y = steer * 0.9;    // 前輪轉向
    },
    rearLight,
  };
}

// ---------- Ferrari F1-75 glTF 模型（CC-BY-NC-4.0 by Sketcher @ Sketchfab） ----------
// 載入失敗（離線等）回傳 null，遊戲自動退回程序生成車
export async function loadF1Model() {
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync('assets/models/F1/gltf/F1.gltf');
    return gltf.scene;
  } catch (e) {
    console.warn('F1 模型載入失敗，使用程序生成車：', e);
    return null;
  }
}

// 車隊塗裝：把車身貼圖做色相旋轉（UV 完全不動），紅色法拉利 → 各隊配色
// hue=null 維持原色；sat/bright 用於銀白等特殊塗裝
const _tintCache = new Map();
function tintedMaterial(srcMat, hueDeg, sat = 1, bright = 1) {
  const key = `${hueDeg}_${sat}_${bright}`;
  if (_tintCache.has(key)) return _tintCache.get(key);
  const img = srcMat.map.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.filter = `hue-rotate(${hueDeg}deg) saturate(${sat}) brightness(${bright})`;
  g.drawImage(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = srcMat.map.flipY;             // glTF 是 flipY=false，必須沿用
  t.wrapS = srcMat.map.wrapS; t.wrapT = srcMat.map.wrapT;
  const m = srcMat.clone();
  m.map = t;
  _tintCache.set(key, m);
  return m;
}

// AI 用：隱藏外觀看不到的座艙小零件，省下大量 draw call
const AI_HIDE_RE = /gp21|sf21|cinture|pedals|cockpit_details|LCD|led_|sw_|tvcam|CLEARLED/i;

// 把 glTF 場景整理成遊戲用車：車頭朝 +X、長 5.5m、車底貼地、輪子可滾動
// livery: { hue, sat, bright } 改塗裝；aiLite: true 時做效能減負（不投影、藏內裝）
export function createModelCar(modelScene, livery = null, aiLite = false) {
  const grp = new THREE.Group();
  const inner = modelScene;

  // 量測→長軸轉到 X→縮放→置中貼地
  inner.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(inner);
  let size = box.getSize(new THREE.Vector3());
  if (size.z > size.x) inner.rotation.y = Math.PI / 2;
  inner.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(inner);
  size = box.getSize(new THREE.Vector3());
  const sc = 5.5 / size.x;
  inner.scale.multiplyScalar(sc);
  inner.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(inner);
  const ctr = box.getCenter(new THREE.Vector3());
  inner.position.x -= ctr.x;
  inner.position.z -= ctr.z;
  inner.position.y -= box.min.y;
  grp.add(inner);

  // 陰影 + 隱藏高速殘影輪框（與一般輪框重疊）+ 塗裝 + AI 減負
  const wheels = [];
  inner.traverse(o => {
    if (o.isMesh) {
      o.castShadow = !aiLite; // AI 不投影省效能
      if (aiLite && o.material && AI_HIDE_RE.test(o.material.name || '')) o.visible = false;
      if (livery && o.material && o.material.name === 'car_chassis') {
        o.material = tintedMaterial(o.material, livery.hue, livery.sat ?? 1, livery.bright ?? 1);
      }
    }
    if (o.name && o.name.startsWith('RIM_BLUR')) o.visible = false;
    if (o.name && /^WHEEL_(RF|LF|LR|RR)$/.test(o.name)) wheels.push(o);
  });
  inner.updateMatrixWorld(true);

  // 模型的 WHEEL_* 節點軸心不在輪心，直接旋轉節點會讓輪子「公轉」飛走。
  // 解法：在每顆輪子的幾何中心建 pivot，attach 進去（保留世界變換），之後改轉 pivot。
  const q = new THREE.Quaternion();
  const pivots = [];
  for (const w of wheels) {
    const parent = w.parent;
    const center = new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3());
    const pivot = new THREE.Group();
    parent.add(pivot);
    pivot.position.copy(parent.worldToLocal(center.clone()));
    pivot.updateMatrixWorld(true);
    pivot.attach(w);
    // 輪軸 = 世界 Z（車身橫向）換算到 pivot 局部空間，靜止姿態下算一次即可
    pivot.getWorldQuaternion(q);
    pivot.userData.axleLocal = new THREE.Vector3(0, 0, 1).applyQuaternion(q.invert()).normalize();
    pivots.push(pivot);
  }

  // 煞車燈（模型沒有，補一顆在車尾）
  const rearLight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xdd0000, emissiveIntensity: 0.8 }));
  rearLight.position.set(-2.7, 0.55, 0);
  grp.add(rearLight);

  return {
    group: grp,
    updateWheels(dt, speed) {
      const ang = speed * dt / 0.36;
      for (const p of pivots) p.rotateOnAxis(p.userData.axleLocal, ang);
    },
    rearLight,
  };
}

// 效能烘焙：把車上靜態零件按材質合併成單一 mesh（輪子除外），大幅降低 draw call
export async function bakeStaticMeshes(rootGroup, { castShadow = false } = {}) {
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  rootGroup.updateMatrixWorld(true);
  const inWheel = (o) => { let p = o; while (p) { if (/^WHEEL_/.test(p.name || '')) return true; p = p.parent; } return false; };
  const invRoot = new THREE.Matrix4().copy(rootGroup.matrixWorld).invert();
  const buckets = new Map();
  const toRemove = [];
  rootGroup.traverse(o => {
    if (!o.isMesh || !o.visible || inWheel(o)) return;
    if (Array.isArray(o.material)) return; // 多材質先跳過
    let g = o.geometry.clone();
    if (g.index) g = g.toNonIndexed(); // 統一為非索引，合併才不會屬性衝突
    const keep = ['position', 'normal', 'uv'];
    for (const name of Object.keys(g.attributes)) if (!keep.includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().copy(invRoot).multiply(o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    toRemove.push(o);
  });
  for (const o of toRemove) o.removeFromParent();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = castShadow;
    rootGroup.add(mesh);
  }
}
