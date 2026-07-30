// 賽道模組：3 條立體賽道定義 + 建構器（道路網格、傾斜彎、裝飾、迷你地圖資料）
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const UP = new THREE.Vector3(0, 1, 0);

// ---- Kenney 場景裝飾模型（CC0）----
let deco = null, decoPromise = null;
export function loadDecoModels() {
  if (decoPromise) return decoPromise;
  const loader = new GLTFLoader();
  decoPromise = Promise.all(
    ['decoration-forest', 'decoration-tents'].map(n =>
      loader.loadAsync(`assets/kenney/${n}.glb`).then(g => [n, g.scene])
    )
  ).then(pairs => { deco = Object.fromEntries(pairs); })
   .catch(e => { console.warn('裝飾模型載入失敗，略過', e); deco = null; });
  return decoPromise;
}

// ============ 三條賽道定義 ============
export const TRACKS = [
  {
    id: 'meadow', name: '翠綠草原', emoji: '🌿',
    desc: '丘陵起伏的陽光草原，適合入門的高速流暢路線',
    laps: 3, width: 15, shoulder: 6, wallExtra: 7.5,
    theme: 'meadow', bankFactor: 0, maxBank: 0.001,
    sky: { top: '#4aa3ff', bottom: '#cfe9ff' }, fog: { color: 0xcfe9ff, near: 140, far: 520 },
    ground: 0x5fae4e, offroadColor: 0x67b357,
    ambient: 0.95, sunColor: 0xfff4d6, sunPos: [120, 220, 80],
    points: [
      [0, 0, 0], [65, 0, -4], [110, 0, -24], [138, 0, -64], [140, 0, -110],
      [118, 0, -150], [75, 0, -168], [30, 0, -155], [-5, 0, -128],
      [-40, 0, -120], [-75, 0, -138], [-98, 0, -170],
      [-130, 0, -172], [-148, 0, -138], [-142, 0, -100],
      [-124, 0, -70], [-128, 0, -38], [-105, 0, -10], [-62, 0, 6], [-25, 0, 4],
    ],
    itemIdx: [0.16, 0.45, 0.74], boostIdx: [0.32, 0.86],
  },
  {
    id: 'canyon', name: '烈日峽谷', emoji: '🏜️',
    desc: '巨岩峽谷間的大落差山路，髮夾彎與陡坡俯衝',
    laps: 3, width: 14, shoulder: 3.5, wallExtra: 4.5,
    theme: 'canyon', bankFactor: 14, maxBank: 0.16,
    sky: { top: '#ff9e4f', bottom: '#ffe3b3' }, fog: { color: 0xffd9a0, near: 120, far: 480 },
    ground: 0xd8a25e, offroadColor: 0xcf9750,
    ambient: 0.9, sunColor: 0xffdfae, sunPos: [-160, 180, 60],
    points: [
      [0, 0, 0], [64, 0.5, -4], [110, 3, -30], [128, 8, -80], [104, 14, -122],
      [56, 17, -138], [16, 18, -112], [30, 16, -74], [4, 13, -46], [-36, 12, -66],
      [-58, 12, -110], [-46, 10, -156], [-84, 7, -186], [-130, 5, -166], [-142, 3, -118],
      [-120, 2, -72], [-138, 1, -28], [-104, 0.5, 8], [-52, 0, 18], [-20, 0, 12],
    ],
    itemIdx: [0.14, 0.42, 0.72], boostIdx: [0.52, 0.94],
  },
  {
    id: 'neon', name: '星夜霓虹城', emoji: '🌃',
    desc: '穿梭摩天樓間的夜間高架賽道，霓虹燈海與立體交叉',
    laps: 3, width: 14, shoulder: 1.6, wallExtra: 2.4,
    theme: 'neon', bankFactor: 12, maxBank: 0.15,
    sky: { top: '#060818', bottom: '#1b1040' }, fog: { color: 0x11081f, near: 110, far: 430 },
    ground: 0x0d0a1a, offroadColor: 0x171130,
    ambient: 0.55, sunColor: 0x8899ff, sunPos: [-80, 260, -120],
    points: [
      [0, 8, 0], [66, 8, -6], [118, 10, -36], [140, 14, -90], [112, 19, -140],
      [58, 22, -158], [6, 21, -140], [-30, 18, -160], [-78, 16, -184], [-124, 14, -156],
      [-136, 13, -106], [-104, 16, -70], [-70, 19, -40], [-30, 21, -60], [6, 19, -82],
      [2, 16, -102], [-30, 13, -116], [-72, 9, -96], [-96, 8, -52], [-70, 8, -8], [-30, 8, 10],
    ],
    itemIdx: [0.18, 0.46, 0.76], boostIdx: [0.30, 0.62],
  },
];

// ============ 程序化貼圖 ============
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function roadTexture(theme) {
  return canvasTex(256, 256, (g, w, h) => {
    const base = theme === 'neon' ? '#1c2030' : theme === 'canyon' ? '#4a4038' : '#3c3f46';
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // 柏油顆粒
    for (let i = 0; i < 2600; i++) {
      const v = Math.random() * 30 - 15;
      g.fillStyle = `rgba(${128 + v},${128 + v},${132 + v},0.08)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // 兩側白邊線
    g.fillStyle = theme === 'neon' ? '#59f7ff' : '#e8e8e8';
    g.fillRect(6, 0, 7, h); g.fillRect(w - 13, 0, 7, h);
    // 中央虛線
    g.fillStyle = theme === 'neon' ? '#ff5fd0' : '#ffd23f';
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 4, y, 8, 34);
  });
}

function curbTexture() {
  return canvasTex(64, 128, (g, w, h) => {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? '#e33b3b' : '#f2f2f2';
      g.fillRect(0, i * 32, w, 32);
    }
  });
}

function checkerTexture() {
  return canvasTex(128, 64, (g, w, h) => {
    const s = 16;
    for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#fff';
      g.fillRect(x * s, y * s, s, s);
    }
  });
}

function groundTexture(hex, theme) {
  return canvasTex(256, 256, (g, w, h) => {
    const c = new THREE.Color(hex);
    g.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3200; i++) {
      const v = Math.random() * 36 - 18;
      g.fillStyle = `rgba(${c.r * 255 + v | 0},${c.g * 255 + v | 0},${c.b * 255 + v | 0},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    if (theme === 'neon') { // 城市地面格線
      g.strokeStyle = 'rgba(80,110,255,0.25)'; g.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke();
        g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke();
      }
    }
  });
}

// ============ 賽道建構 ============
export const N_SAMPLES = 900;

export function buildTrack(def) {
  const group = new THREE.Group();
  const pts = def.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.55);
  const N = N_SAMPLES;
  const raw = curve.getSpacedPoints(N); // N+1 點，首尾相同
  raw.pop();
  const totalLen = curve.getLength();
  const halfW = def.width / 2;

  // ---- 取樣：位置/切線/側向/傾斜 ----
  const samples = [];
  for (let i = 0; i < N; i++) {
    const p = raw[i];
    const tan = raw[(i + 1) % N].clone().sub(raw[(i - 1 + N) % N]).normalize();
    const side = new THREE.Vector3().crossVectors(UP, tan).normalize(); // 行進方向左側
    samples.push({ pos: p, tan, side, bank: 0, bankSlope: 0 });
  }
  // 由曲率算彎道傾斜（內高外低的斜坡），再平滑
  const rawBank = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t0 = samples[(i - 2 + N) % N].tan, t1 = samples[(i + 2) % N].tan;
    const cy = t0.x * t1.z - t0.z * t1.x; // 轉向符號
    rawBank[i] = THREE.MathUtils.clamp(cy * def.bankFactor, -def.maxBank, def.maxBank);
  }
  // 傾斜過渡拉長（±26 取樣 ≈ 25m），避免 S 彎中傾斜方向急翻造成路面扭曲
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let k = -26; k <= 26; k++) s += rawBank[(i + k + N) % N];
    samples[i].bank = s / 53;
    samples[i].bankSlope = Math.tan(samples[i].bank);
  }
  // 真實曲率（切線夾角），供 AI 彎前減速用，與傾斜度脫鉤
  for (let i = 0; i < N; i++) {
    const t0 = samples[(i - 3 + N) % N].tan, t1 = samples[(i + 3) % N].tan;
    const dot = THREE.MathUtils.clamp(t0.x * t1.x + t0.y * t1.y + t0.z * t1.z, -1, 1);
    samples[i].curve = Math.acos(dot);
  }

  // ---- 表面高度查詢 ----
  function surfaceY(idx, frac, lateral) {
    const a = samples[idx], b = samples[(idx + 1) % N];
    const y = a.pos.y + (b.pos.y - a.pos.y) * frac;
    const slope = a.bankSlope + (b.bankSlope - a.bankSlope) * frac;
    return y + slope * lateral;
  }

  // ---- 最近取樣點查詢 ----
  // 窗口刻意縮小（±12）：連續追蹤下每幀移動 <1 取樣點，
  // 窗口太大會在髮夾彎被吸附到對面路段，造成瞬間出界/高度跳動的「隱形陷阱」
  const tmp = new THREE.Vector3();
  function query(pos, hint) {
    let best = hint, bestD = Infinity;
    for (let k = -12; k <= 12; k++) {
      const i = (hint + k + N) % N;
      const d = tmp.subVectors(pos, samples[i].pos).setY(0).lengthSq();
      if (d < bestD) { bestD = d; best = i; }
    }
    // 追蹤丟失（距離 >20m）時才全域重新搜尋
    if (bestD > 400) {
      for (let i = 0; i < N; i += 2) {
        const d = tmp.subVectors(pos, samples[i].pos).setY(0).lengthSq();
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    const s = samples[best];
    const dx = pos.x - s.pos.x, dz = pos.z - s.pos.z;
    const along = dx * s.tan.x + dz * s.tan.z;            // 沿切線的投影
    const lateral = dx * s.side.x + dz * s.side.z;        // 側向偏移（左正）
    const segLen = totalLen / N;
    const frac = THREE.MathUtils.clamp(along / segLen, -0.5, 1.5);
    return { idx: best, frac, lateral, surfaceY: surfaceY(best, THREE.MathUtils.clamp(frac, 0, 1), lateral) };
  }

  // ---- 道路網格 ----
  const roadGeo = new THREE.BufferGeometry();
  const vtx = [], uv = [], idxArr = [];
  const vScale = totalLen / (def.width * 2.2); // 貼圖沿路重複數
  for (let i = 0; i <= N; i++) {
    const s = samples[i % N];
    const l = s.pos.clone().addScaledVector(s.side, halfW); l.y += s.bankSlope * halfW;
    const r = s.pos.clone().addScaledVector(s.side, -halfW); r.y -= s.bankSlope * halfW;
    vtx.push(l.x, l.y, l.z, r.x, r.y, r.z);
    uv.push(0, i / N * vScale, 1, i / N * vScale);
    if (i < N) { const a = i * 2; idxArr.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vtx, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  roadGeo.setIndex(idxArr);
  roadGeo.computeVertexNormals();
  const road = new THREE.Mesh(roadGeo, new THREE.MeshLambertMaterial({ map: roadTexture(def.theme), side: THREE.DoubleSide }));
  road.receiveShadow = false;
  group.add(road);

  // 貼合路面的條帶（起跑線、加速帶等用，避免平面貼片在坡道上破圖）
  function buildStrip(i0, len, halfWidth, yOff, mat, vTiles) {
    const g = new THREE.BufferGeometry();
    const v = [], u = [], id = [];
    for (let k = 0; k <= len; k++) {
      const s = samples[(i0 + k) % N];
      for (const sgn of [1, -1]) {
        const p = s.pos.clone().addScaledVector(s.side, sgn * halfWidth);
        p.y += s.bankSlope * sgn * halfWidth + yOff;
        v.push(p.x, p.y, p.z);
      }
      u.push(0, k / len * vTiles, 1, k / len * vTiles);
      if (k < len) { const a = k * 2; id.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.setIndex(id); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }

  // ---- 路緣（紅白curb）----
  const curbT = curbTexture();
  for (const sign of [1, -1]) {
    const g2 = new THREE.BufferGeometry();
    const v2 = [], u2 = [], i2 = [];
    for (let i = 0; i <= N; i++) {
      const s = samples[i % N];
      const inn = s.pos.clone().addScaledVector(s.side, sign * halfW);
      inn.y += s.bankSlope * sign * halfW + 0.02;
      const out = s.pos.clone().addScaledVector(s.side, sign * (halfW + 1.1));
      out.y += s.bankSlope * sign * (halfW + 1.1) + 0.06;
      v2.push(inn.x, inn.y, inn.z, out.x, out.y, out.z);
      u2.push(0, i * 0.5, 1, i * 0.5);
      if (i < N) { const a = i * 2; i2.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    g2.setAttribute('position', new THREE.Float32BufferAttribute(v2, 3));
    g2.setAttribute('uv', new THREE.Float32BufferAttribute(u2, 2));
    g2.setIndex(i2); g2.computeVertexNormals();
    group.add(new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ map: curbT, side: THREE.DoubleSide })));
  }

  // ---- 路肩（路緣外到護欄的實體地面，與物理高度外推一致）----
  const wallD = halfW + def.wallExtra;
  const shT = groundTexture(def.offroadColor, def.theme);
  shT.repeat.set(1, 60);
  for (const sign of [1, -1]) {
    const g4 = new THREE.BufferGeometry();
    const v4 = [], u4 = [], i4 = [];
    for (let i = 0; i <= N; i++) {
      const s = samples[i % N];
      const inn = s.pos.clone().addScaledVector(s.side, sign * (halfW + 1.05));
      inn.y += s.bankSlope * sign * (halfW + 1.05) - 0.02;
      const out = s.pos.clone().addScaledVector(s.side, sign * (wallD + 1.5));
      out.y += s.bankSlope * sign * (wallD + 1.5) - 0.02;
      v4.push(inn.x, inn.y, inn.z, out.x, out.y, out.z);
      u4.push(0, i / N * 60, 1, i / N * 60);
      if (i < N) { const a = i * 2; i4.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    g4.setAttribute('position', new THREE.Float32BufferAttribute(v4, 3));
    g4.setAttribute('uv', new THREE.Float32BufferAttribute(u4, 2));
    g4.setIndex(i4); g4.computeVertexNormals();
    group.add(new THREE.Mesh(g4, new THREE.MeshLambertMaterial({ map: shT, side: THREE.DoubleSide })));
  }

  // ---- 護欄 / 霓虹燈條 ----
  const railMat = def.theme === 'neon'
    ? new THREE.MeshBasicMaterial({ color: 0x3ce6ff, transparent: true, opacity: 0.9 })
    : new THREE.MeshLambertMaterial({ color: def.theme === 'canyon' ? 0xa9743c : 0xe8e2d2 });
  // 實體護欄：內側面 + 頂面 + 外側面（有厚度）
  const wallH = def.theme === 'canyon' ? 2.4 : 1.1;
  const wallT = def.theme === 'neon' ? 0.55 : 0.85;
  for (const sign of [1, -1]) {
    const g3 = new THREE.BufferGeometry();
    const v3 = [], i3 = [];
    for (let i = 0; i <= N; i++) {
      const s = samples[i % N];
      const inn = s.pos.clone().addScaledVector(s.side, sign * wallD);
      inn.y += s.bankSlope * sign * wallD;
      const out = s.pos.clone().addScaledVector(s.side, sign * (wallD + wallT));
      out.y += s.bankSlope * sign * (wallD + wallT);
      // 每取樣 4 點：內下、內上、外上、外下（底部略埋入地面）
      v3.push(
        inn.x, inn.y - 0.25, inn.z,
        inn.x, inn.y + wallH, inn.z,
        out.x, out.y + wallH, out.z,
        out.x, out.y - 0.25, out.z
      );
      if (i < N) {
        const a = i * 4;
        i3.push(
          a, a + 1, a + 4, a + 1, a + 5, a + 4,       // 內側面
          a + 1, a + 2, a + 5, a + 2, a + 6, a + 5,   // 頂面
          a + 2, a + 3, a + 6, a + 3, a + 7, a + 6    // 外側面
        );
      }
    }
    g3.setAttribute('position', new THREE.Float32BufferAttribute(v3, 3));
    g3.setIndex(i3); g3.computeVertexNormals();
    const mat = railMat.clone();
    mat.side = THREE.DoubleSide;
    group.add(new THREE.Mesh(g3, mat));
  }

  // ---- 起跑線 + 拱門 ----
  const s0 = samples[0];
  group.add(buildStrip(N - 2, 4, halfW, 0.045, new THREE.MeshBasicMaterial({ map: checkerTexture() }), 1));

  const archMat = new THREE.MeshLambertMaterial({ color: 0xd8352f });
  for (const sign of [1, -1]) {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 9, 10), archMat);
    pil.position.copy(s0.pos).addScaledVector(s0.side, sign * (halfW + 1.6));
    pil.position.y += 4.5;
    group.add(pil);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(def.width + 4.5, 2.2, 1), new THREE.MeshBasicMaterial({ map: checkerTexture() }));
  banner.position.copy(s0.pos); banner.position.y += 9.2;
  banner.rotation.y = Math.atan2(s0.tan.x, s0.tan.z);
  group.add(banner);

  // ---- 地面 ----
  const groundT = groundTexture(def.ground, def.theme);
  groundT.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(650, 48), new THREE.MeshLambertMaterial({ map: groundT }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6;
  group.add(ground);

  // ---- 主題裝飾 ----
  addDecorations(group, def, samples, halfW, N);

  // ---- 加速帶（貼路面的箭頭條帶）----
  const boostPads = [];
  const padTex = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // V 型箭頭（尖端朝行進方向）
    g.fillStyle = 'rgba(255,154,31,0.92)';
    g.beginPath();
    g.moveTo(6, 36); g.lineTo(32, 8); g.lineTo(58, 36);
    g.lineTo(58, 54); g.lineTo(32, 26); g.lineTo(6, 54);
    g.closePath(); g.fill();
  });
  const padMat = new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false });
  for (const f of def.boostIdx) {
    const idx = Math.floor(f * N), len = 10;
    boostPads.push({ idx, len });
    group.add(buildStrip(idx, len, halfW * 0.72, 0.06, padMat, 5));
  }

  // ---- 道具箱位置 ----
  const itemSpots = [];
  for (const f of def.itemIdx) {
    const idx = Math.floor(f * N);
    for (const lat of [-halfW * 0.62, -halfW * 0.21, halfW * 0.21, halfW * 0.62]) {
      const s = samples[idx];
      const p = s.pos.clone().addScaledVector(s.side, lat);
      p.y += s.bankSlope * lat + 1.1;
      itemSpots.push({ pos: p, idx });
    }
  }

  // ---- 起跑格（8 格）----
  const startPositions = [];
  for (let i = 0; i < 8; i++) {
    const back = 10 + Math.floor(i / 2) * 7;
    const idx = (N - back + N) % N;
    const s = samples[idx];
    const lat = (i % 2 === 0 ? 1 : -1) * halfW * 0.38;
    const p = s.pos.clone().addScaledVector(s.side, lat);
    p.y = surfaceY(idx, 0, lat) + 0.0;
    startPositions.push({ pos: p, heading: Math.atan2(s.tan.x, s.tan.z), idx, lat });
  }

  // ---- 迷你地圖點位（xz 正規化）----
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const s of samples) {
    minX = Math.min(minX, s.pos.x); maxX = Math.max(maxX, s.pos.x);
    minZ = Math.min(minZ, s.pos.z); maxZ = Math.max(maxZ, s.pos.z);
  }
  const span = Math.max(maxX - minX, maxZ - minZ);
  const mapPt = (x, z, size, pad) => [
    pad + (x - minX - (maxX - minX - span) / 2) / span * (size - pad * 2),
    pad + (z - minZ - (maxZ - minZ - span) / 2) / span * (size - pad * 2),
  ];
  const minimap = { pts: samples.map(s => mapPt(s.pos.x, s.pos.z, 1, 0.08)), toMap: (x, z) => mapPt(x, z, 1, 0.08) };

  return { def, group, samples, N, totalLen, halfW, shoulderW: def.shoulder, wallD, query, surfaceY, boostPads, itemSpots, startPositions, minimap };
}

// ============ 主題裝飾 ============
function addDecorations(group, def, samples, halfW, N) {
  const rng = mulberry32(def.id === 'meadow' ? 7 : def.id === 'canyon' ? 21 : 42);
  // 判斷位置是否離賽道太近（避免壓到路面）
  const clearOf = (x, z, min) => {
    for (let i = 0; i < N; i += 4) {
      const dx = x - samples[i].pos.x, dz = z - samples[i].pos.z;
      if (dx * dx + dz * dz < min * min) return false;
    }
    return true;
  };
  const scatter = (count, minR, maxR, minClear, place) => {
    let tries = 0;
    for (let n = 0; n < count && tries < count * 30; tries++) {
      const i = Math.floor(rng() * N);
      const s = samples[i];
      const side = rng() > 0.5 ? 1 : -1;
      const d = minR + rng() * (maxR - minR);
      const x = s.pos.x + s.side.x * side * d, z = s.pos.z + s.side.z * side * d;
      if (!clearOf(x, z, minClear)) continue;
      place(x, z, s, rng); n++;
    }
  };

  if (def.theme === 'meadow') {
    if (deco && deco['decoration-forest']) {
      // Kenney 森林叢（取代自建圓錐樹）
      const fSrc = deco['decoration-forest'];
      const fb = new THREE.Box3().setFromObject(fSrc);
      const fSize = fb.getSize(new THREE.Vector3());
      const fScale = 16 / Math.max(fSize.x, fSize.z);
      scatter(12, halfW + 18, halfW + 70, halfW + 16, (x, z, s, r) => {
        const m = fSrc.clone(true);
        m.scale.setScalar(fScale * (0.75 + r() * 0.6));
        m.position.set(x, 0, z);
        m.rotation.y = r() * Math.PI * 2;
        group.add(m);
      });
      // 起點旁帳篷觀眾區
      const tSrc = deco['decoration-tents'];
      if (tSrc) {
        const tb = new THREE.Box3().setFromObject(tSrc);
        const tSize = tb.getSize(new THREE.Vector3());
        const tScale = 13 / Math.max(tSize.x, tSize.z);
        const s12 = samples[14];
        const tp = s12.pos.clone().addScaledVector(s12.side, -(halfW + def.wallExtra + 11));
        if (clearOf(tp.x, tp.z, halfW + 9)) {
          const tents = tSrc.clone(true);
          tents.scale.setScalar(tScale);
          tents.position.set(tp.x, 0, tp.z);
          tents.rotation.y = Math.atan2(s12.tan.x, s12.tan.z);
          group.add(tents);
        }
      }
    } else {
      // 後備：自建圓錐樹（instanced）
      const trunkG = new THREE.CylinderGeometry(0.35, 0.5, 2.4, 6);
      const leafG = new THREE.ConeGeometry(2.6, 5.5, 8);
      const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x7a4f2a }), 90);
      const leaf = new THREE.InstancedMesh(leafG, new THREE.MeshLambertMaterial({ color: 0x2e8b3a }), 90);
      let ti = 0;
      const m = new THREE.Matrix4();
      scatter(90, halfW + 10, halfW + 60, halfW + 9, (x, z) => {
        const sc = 0.8 + rng() * 0.9;
        m.makeScale(sc, sc, sc).setPosition(x, 1.2 * sc, z); trunk.setMatrixAt(ti, m);
        m.makeScale(sc, sc, sc).setPosition(x, (2.4 + 2.4) * sc, z); leaf.setMatrixAt(ti, m);
        ti++;
      });
      trunk.count = leaf.count = ti;
      group.add(trunk, leaf);
    }
    // 遠山
    for (let i = 0; i < 9; i++) {
      const h = 30 + rng() * 45;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(60 + rng() * 60, h, 7),
        new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.32, 0.35, 0.3 + rng() * 0.12) }));
      const ang = rng() * Math.PI * 2, r = 330 + rng() * 200;
      hill.position.set(Math.cos(ang) * r, h / 2 - 8, Math.sin(ang) * r);
      group.add(hill);
    }
    // 氣球
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8),
        new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(rng(), 0.8, 0.6) }));
      const s = samples[Math.floor(rng() * N)];
      b.position.copy(s.pos).addScaledVector(s.side, (rng() > 0.5 ? 1 : -1) * (halfW + 5 + rng() * 10));
      b.position.y += 9 + rng() * 7;
      group.add(b);
    }
  }

  if (def.theme === 'canyon') {
    // 巨岩台地（淨空隨岩石半徑，避免壓到路面）
    for (let n = 0, tries = 0; n < 34 && tries < 1000; tries++) {
      const i = Math.floor(rng() * N);
      const s = samples[i];
      const sideSign = rng() > 0.5 ? 1 : -1;
      const h = 6 + rng() * 26, w = 5 + rng() * 14;
      const dist = halfW + 8 + w + rng() * 70;
      const x = s.pos.x + s.side.x * sideSign * dist, z = s.pos.z + s.side.z * sideSign * dist;
      if (!clearOf(x, z, halfW + 7 + w)) continue;
      const rock = new THREE.Mesh(new THREE.CylinderGeometry(w * (0.55 + rng() * 0.3), w, h, 6),
        new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.07, 0.5, 0.34 + rng() * 0.14) }));
      rock.position.set(x, h / 2 - 1.5, z);
      rock.rotation.y = rng() * Math.PI;
      group.add(rock);
      n++;
    }
    // 仙人掌
    const cactusMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
    scatter(40, halfW + 7.5, halfW + 45, halfW + 7, (x, z, s, r) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3.6, 7), cactusMat);
      body.position.y = 1.8; g.add(body);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 1.8, 6), cactusMat);
      arm.position.set(0.85, 2.4, 0); arm.rotation.z = -0.5; g.add(arm);
      g.position.set(x, 0, z); g.rotation.y = r() * Math.PI * 2;
      const sc = 0.7 + r() * 0.9; g.scale.setScalar(sc);
      group.add(g);
    });
    // 遠景峽谷壁
    for (let i = 0; i < 10; i++) {
      const h = 50 + rng() * 60;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(90 + rng() * 80, h, 26),
        new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.06, 0.55, 0.3 + rng() * 0.1) }));
      const ang = rng() * Math.PI * 2, r = 360 + rng() * 180;
      wall.position.set(Math.cos(ang) * r, h / 2 - 10, Math.sin(ang) * r);
      wall.rotation.y = ang + Math.PI / 2;
      group.add(wall);
    }
  }

  if (def.theme === 'neon') {
    // 高架橋墩
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x2a2f45 });
    for (let i = 0; i < N; i += 36) {
      const s = samples[i];
      if (s.pos.y < 3) continue;
      // 立體交叉處下方有別段路面 → 不放橋墩
      let overRoad = false;
      for (let j = 0; j < N; j += 3) {
        const d = Math.min(Math.abs(i - j), N - Math.abs(i - j));
        if (d < 60) continue;
        const o = samples[j];
        const dx = s.pos.x - o.pos.x, dz = s.pos.z - o.pos.z;
        if (dx * dx + dz * dz < 144 && o.pos.y < s.pos.y - 2) { overRoad = true; break; }
      }
      if (overRoad) continue;
      // 橋墩頂壓在路面中心下方 0.7，避免傾斜彎道時刺穿路面
      const h = s.pos.y - 0.1;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, h, 2.4), pierMat);
      pier.position.set(s.pos.x, s.pos.y / 2 - 0.65, s.pos.z);
      group.add(pier);
    }
    // 霓虹大樓（instanced 主體 + 發光窗）
    const buildings = [];
    scatter(70, halfW + 22, halfW + 120, halfW + 21, (x, z, s, r) => buildings.push({ x, z, h: 14 + r() * 58, w: 6 + r() * 10, hue: r() }));
    const boxG = new THREE.BoxGeometry(1, 1, 1);
    const bodyIM = new THREE.InstancedMesh(boxG, new THREE.MeshLambertMaterial({ color: 0x141a2e }), buildings.length);
    const glowIM = new THREE.InstancedMesh(boxG, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }), buildings.length);
    const m = new THREE.Matrix4();
    buildings.forEach((b, i) => {
      m.makeScale(b.w, b.h, b.w).setPosition(b.x, b.h / 2 - 1, b.z);
      bodyIM.setMatrixAt(i, m);
      m.makeScale(b.w * 1.02, 0.7, b.w * 1.02).setPosition(b.x, b.h - 0.6, b.z); // 頂部霓虹框
      glowIM.setMatrixAt(i, m);
      glowIM.setColorAt(i, new THREE.Color().setHSL(0.5 + b.hue * 0.45, 1, 0.6));
    });
    group.add(bodyIM, glowIM);
    // 星空
    const starG = new THREE.BufferGeometry();
    const starV = [];
    for (let i = 0; i < 500; i++) {
      const a = rng() * Math.PI * 2, e = rng() * Math.PI * 0.45, r = 560;
      starV.push(Math.cos(a) * Math.cos(e) * r, 40 + Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(starV, 3));
    group.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 1.6, sizeAttenuation: false })));
    // 路燈（貼合路肩表面，含彎道傾斜高度）
    for (let i = 0; i < N; i += 60) {
      const s = samples[i];
      const sgn = (i / 60) % 2 === 0 ? 1 : -1; // 左右交錯
      const L = halfW + 1.9;
      const baseX = s.pos.x + s.side.x * sgn * L;
      const baseZ = s.pos.z + s.side.z * sgn * L;
      const baseY = s.pos.y + s.bankSlope * sgn * L;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.2, 5), pierMat);
      pole.position.set(baseX, baseY + 2.6, baseZ);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe08a }));
      lamp.position.set(baseX, baseY + 5.35, baseZ);
      group.add(lamp);
    }
  }
}

// 可重現亂數
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 天空漸層（大球體 + 頂點色）
export function buildSky(def) {
  const geo = new THREE.SphereGeometry(600, 20, 12);
  const top = new THREE.Color(def.sky.top), bot = new THREE.Color(def.sky.bottom);
  const posAttr = geo.getAttribute('position');
  const colors = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i) / 600;
    const c = bot.clone().lerp(top, THREE.MathUtils.clamp(y * 1.4 + 0.35, 0, 1));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
}
