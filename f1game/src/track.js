// 鈴鹿賽道：取樣輔助 + 全部 3D 場景網格
import * as THREE from 'three';
import { TRACK } from '../assets/suzuka_track.js';

const UP = new THREE.Vector3(0, 1, 0);

// ---------- 賽道路徑（取樣 / 最近點查詢） ----------
export class TrackPath {
  constructor() {
    const pts = TRACK.points;
    const n = this.n = pts.length;
    this.total = TRACK.lengthM;
    this.step = this.total / n;
    this.pos = []; this.tan = []; this.nor = []; this.wl = []; this.wr = [];
    for (const p of pts) {
      this.pos.push(new THREE.Vector3(p[0], p[2], p[1]));
      this.wl.push(p[3]); this.wr.push(p[4]);
    }
    // 切線、左法線（水平面）
    for (let i = 0; i < n; i++) {
      const a = this.pos[(i - 1 + n) % n], b = this.pos[(i + 1) % n];
      const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
      this.tan.push(t);
      this.nor.push(new THREE.Vector3().crossVectors(UP, t)); // 行進方向左側
    }
    // 帶符號曲率（heading 變化率），再做小視窗平滑
    const head = this.tan.map(t => Math.atan2(-t.z, t.x));
    const raw = [];
    for (let i = 0; i < n; i++) {
      let d = head[(i + 1) % n] - head[(i - 1 + n) % n];
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      raw.push(d / (2 * this.step));
    }
    this.curv = [];
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = -2; k <= 2; k++) s += raw[(i + k + n) % n];
      this.curv.push(s / 5);
    }
  }

  wrap(s) { s %= this.total; return s < 0 ? s + this.total : s; }
  idx(s) { return Math.floor(this.wrap(s) / this.step) % this.n; }

  // 依弧長 s 取插值點
  sample(s, out) {
    s = this.wrap(s);
    const f = s / this.step, i = Math.floor(f) % this.n, j = (i + 1) % this.n, t = f - Math.floor(f);
    out = out || {};
    out.pos = (out.pos || new THREE.Vector3()).lerpVectors(this.pos[i], this.pos[j], t);
    out.tan = (out.tan || new THREE.Vector3()).lerpVectors(this.tan[i], this.tan[j], t).normalize();
    out.nor = (out.nor || new THREE.Vector3()).crossVectors(UP, out.tan);
    out.curv = this.curv[i] + (this.curv[j] - this.curv[i]) * t;
    out.wl = this.wl[i] + (this.wl[j] - this.wl[i]) * t;
    out.wr = this.wr[i] + (this.wr[j] - this.wr[i]) * t;
    return out;
  }

  // 前方一段距離內的最大曲率（AI 煞車判斷用）
  maxCurvAhead(s, dist) {
    let m = 0;
    const steps = Math.ceil(dist / this.step);
    let i = this.idx(s);
    for (let k = 0; k < steps; k++) m = Math.max(m, Math.abs(this.curv[(i + k) % this.n]));
    return m;
  }

  // 最近點查詢（用上次索引 hint 做局部搜尋）
  nearest(x, z, hint) {
    const n = this.n;
    let best = hint ?? 0, bestD = Infinity;
    const search = (from, to) => {
      for (let k = from; k <= to; k++) {
        const i = ((k % n) + n) % n;
        const p = this.pos[i];
        const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
        if (d < bestD) { bestD = d; best = i; }
      }
    };
    if (hint == null) search(0, n - 1);
    else { search(hint - 25, hint + 25); if (bestD > 60 * 60) { bestD = Infinity; search(0, n - 1); } }
    // 投影到該索引切線求精確 s 與橫向偏移（左正右負）
    const p = this.pos[best], t = this.tan[best], nor = this.nor[best];
    const dx = x - p.x, dz = z - p.z;
    const along = dx * t.x + dz * t.z;
    const lat = dx * nor.x + dz * nor.z;
    return { idx: best, s: this.wrap(best * this.step + along), lat };
  }
}

// ---------- 工具：canvas 紋理 ----------
function asphaltTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#55575d'; g.fillRect(0, 0, 256, 256);          // 柏油底色
  let seed = 4242;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 14; i++) {                                 // 大塊修補/磨損色差（遠看也有層次）
    const v = 72 + rng() * 28;
    g.fillStyle = `rgba(${v},${v},${v + 5},${0.35 + rng() * 0.3})`;
    const w = 50 + rng() * 130, h = 40 + rng() * 110;
    g.fillRect(rng() * 256 - w / 2, rng() * 256 - h / 2, w, h);
  }
  for (let i = 0; i < 7; i++) {                                  // 縱向胎痕（沿行車方向 = 貼圖 y 軸）
    g.fillStyle = `rgba(38,38,42,${0.12 + rng() * 0.14})`;
    g.fillRect(rng() * 256, 0, 7 + rng() * 16, 256);
  }
  for (let i = 0; i < 9000; i++) {                               // 碎石顆粒（高對比）
    const v = 55 + rng() * 75;
    g.fillStyle = `rgba(${v},${v},${v + 4},${0.35 + rng() * 0.55})`;
    g.fillRect(rng() * 256, rng() * 256, 1.8, 1.8);
  }
  for (let i = 0; i < 26; i++) {                                 // 細裂縫
    g.strokeStyle = 'rgba(28,28,32,.32)'; g.lineWidth = 0.7;
    g.beginPath();
    let x = rng() * 256, y = rng() * 256;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (rng() - 0.5) * 28; y += rng() * 22; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// 優先用 assets/textures/grass.jpg（AI 生成精緻貼圖），載入失敗自動退回程序生成
function grassTexSmart() {
  const procedural = grassTex();
  const loader = new THREE.TextureLoader();
  loader.load('assets/textures/grass.jpg', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    // 直接替換 image 與參數，所有共用此貼圖的材質即時更新
    procedural.image = t.image;
    procedural.needsUpdate = true;
  }, undefined, () => { /* 沒有檔案就維持程序貼圖 */ });
  return procedural;
}
function grassTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3d7a33'; g.fillRect(0, 0, 256, 256);           // 草地底色
  for (let b = 0; b < 4; b++) {                                  // 割草條紋（轉播感，遠看依然清楚）
    if (b % 2 === 0) { g.fillStyle = 'rgba(255,255,230,0.10)'; g.fillRect(b * 64, 0, 64, 256); }
    else { g.fillStyle = 'rgba(10,40,10,0.13)'; g.fillRect(b * 64, 0, 64, 256); }
  }
  let seed = 1357;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 7000; i++) {                               // 草葉短斜線
    const gr = 90 + rng() * 70, r = 35 + rng() * 30;
    g.strokeStyle = `rgba(${r},${gr},${30 + rng() * 25},${0.3 + rng() * 0.45})`;
    g.lineWidth = 1;
    const x = rng() * 256, y = rng() * 256, dx = (rng() - 0.5) * 3, dy = 2 + rng() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
  }
  for (let i = 0; i < 22; i++) {                                 // 色塊變化（修剪痕）
    g.fillStyle = `rgba(${40 + rng() * 30},${100 + rng() * 50},40,${0.06 + rng() * 0.08})`;
    g.beginPath(); g.arc(rng() * 256, rng() * 256, 20 + rng() * 40, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function checkerTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) {
    g.fillStyle = (x + y) % 2 ? '#0c0c0c' : '#f4f4f4';
    g.fillRect(x * 8, y * 8, 8, 8);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function crowdTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#3a4356'; g.fillRect(0, 0, 256, 64);
  const cols = ['#e8c14d', '#d04545', '#4d7de8', '#e8e8e8', '#45b06a', '#c46ad8', '#e88c45'];
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0];
    g.beginPath(); g.arc(Math.random() * 256, Math.random() * 64, 1.4, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.repeat.x = 6;
  return t;
}

// ---------- 建立賽道與環境網格 ----------
export function buildWorld(scene, path) {
  const n = path.n;

  // === 柏油路面（三角帶 + 程序柏油貼圖，頂點色做明暗變化） ===
  {
    const verts = [], cols = [], uvs = [], idxs = [];
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      const p = path.pos[k], nor = path.nor[k];
      const L = new THREE.Vector3().copy(p).addScaledVector(nor, path.wl[k]);
      const R = new THREE.Vector3().copy(p).addScaledVector(nor, -path.wr[k]);
      verts.push(L.x, L.y, L.z, R.x, R.y, R.z);
      const sh = 0.86 + Math.sin(k * 12.9898) * 0.05 + (k % 7) * 0.012;
      cols.push(sh, sh, sh + 0.02, sh, sh, sh + 0.02);
      const v = i * path.step / 7; // 沿賽道每 7m 重複一次
      uvs.push(0, v, 2, v);        // 路寬方向重複 2 次
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idxs.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idxs); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: asphaltTex(), vertexColors: true, roughness: 0.94, metalness: 0 }));
    m.receiveShadow = true;
    scene.add(m);
  }

  // === 路邊白線（左右各一條，貼在路面上方 2cm） ===
  const stripe = (offsetFn, color, w, lift, everyOn) => {
    const verts = [], idxs = []; let vi = 0;
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      if (everyOn && !everyOn(k)) continue;
      const p = path.pos[k], nor = path.nor[k];
      const o = offsetFn(k);
      const A = new THREE.Vector3().copy(p).addScaledVector(nor, o).setY(p.y + lift);
      const B = new THREE.Vector3().copy(p).addScaledVector(nor, o - Math.sign(o) * w).setY(p.y + lift);
      verts.push(A.x, A.y, A.z, B.x, B.y, B.z);
      vi++;
      if (vi >= 2) { const a = (vi - 2) * 2; idxs.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idxs); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    scene.add(m); return m;
  };
  stripe(k => path.wl[k] - 0.15, 0xeeeeee, 0.28, 0.02);
  stripe(k => -(path.wr[k] - 0.15), 0xeeeeee, 0.28, 0.02);

  // === 紅白路緣石（彎道處、紅白交錯小段） ===
  {
    const matR = new THREE.MeshStandardMaterial({ color: 0xd02020, roughness: 0.55 });
    const matW = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.55 });
    const geoR = [], geoW = [];
    const KW = 1.3; // 路緣石寬
    for (let i = 0; i < n; i++) {
      if (Math.abs(path.curv[i]) < 0.011) continue;
      for (const side of [1, -1]) {
        const w0 = side > 0 ? path.wl[i] : path.wr[i];
        const p = path.pos[i], p2 = path.pos[(i + 1) % n], nor = path.nor[i], nor2 = path.nor[(i + 1) % n];
        const w1 = side > 0 ? path.wl[(i + 1) % n] : path.wr[(i + 1) % n];
        const A = new THREE.Vector3().copy(p).addScaledVector(nor, side * w0);
        const B = new THREE.Vector3().copy(p).addScaledVector(nor, side * (w0 + KW));
        const C = new THREE.Vector3().copy(p2).addScaledVector(nor2, side * w1);
        const D = new THREE.Vector3().copy(p2).addScaledVector(nor2, side * (w1 + KW));
        const lift = 0.045;
        const arr = ((i >> 1) % 2 === 0) ? geoR : geoW;
        arr.push(A.x, A.y + lift, A.z, B.x, B.y + lift, B.z, C.x, C.y + lift, C.z,
                 B.x, B.y + lift, B.z, D.x, D.y + lift, D.z, C.x, C.y + lift, C.z);
      }
    }
    for (const [arr, mat] of [[geoR, matR], [geoW, matW]]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, mat));
    }
  }

  // === 草地裙帶（沿賽道向外 55m，順高程下降，鋪草地貼圖） ===
  const grassMap = grassTexSmart();
  {
    const verts = [], cols = [], uvs = [], idxs = [];
    const EXT = 55;
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      const p = path.pos[k], nor = path.nor[k];
      for (const side of [1, -1]) {
        const w = (side > 0 ? path.wl[k] : path.wr[k]) + 0.02;
        const A = new THREE.Vector3().copy(p).addScaledVector(nor, side * w).setY(p.y - 0.04);
        const B = new THREE.Vector3().copy(p).addScaledVector(nor, side * (w + EXT)).setY(p.y - 2.4);
        verts.push(A.x, A.y, A.z, B.x, B.y, B.z);
        const g1 = 0.92 + Math.sin(k * 7.13) * 0.06, g2 = 0.82 + Math.cos(k * 3.7) * 0.06;
        cols.push(g1, g1, g1, g2, g2, g2);
        const v = i * path.step / 9;
        uvs.push(0, v, 6, v); // 向外重複 6 次
      }
    }
    for (let i = 0; i < n; i++) {
      for (const off of [0, 2]) {
        const a = i * 4 + off;
        idxs.push(a, a + 4, a + 1, a + 1, a + 4, a + 5);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idxs); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: grassMap, vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    scene.add(m);
  }

  // === 大地平面（最底層） ===
  {
    const gm = grassTexSmart(); // 獨立實例（clone 不會跟著非同步載入更新）
    gm.repeat.set(320, 320);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(5200, 5200),
      new THREE.MeshStandardMaterial({ map: gm, color: 0x9fb89a, roughness: 1 })
    );
    m.rotation.x = -Math.PI / 2; m.position.set(-540, -12, -150);
    scene.add(m);
  }

  // === 護欄（沿兩側 offset，水泥牆 + 上緣藍條） ===
  {
    const mWall = new THREE.MeshStandardMaterial({ color: 0xb9bec7, roughness: 0.9 });
    const mBlue = new THREE.MeshStandardMaterial({ color: 0x2255cc, roughness: 0.7 });
    const wallV = [], blueV = [];
    const OFF = 8.5, H = 1.0;
    for (const side of [1, -1]) {
      let prev = null;
      for (let i = 0; i <= n; i += 2) {
        const k = i % n;
        const w = (side > 0 ? path.wl[k] : path.wr[k]) + OFF;
        const p = new THREE.Vector3().copy(path.pos[k]).addScaledVector(path.nor[k], side * w);
        p.y = path.pos[k].y - 0.3;
        if (prev) {
          const d = prev.distanceTo(p);
          if (d < 14 && d > 0.5) { // 跳過平行曲線反折的退化段
            for (const [arr, y0, y1] of [[wallV, 0, H], [blueV, H, H + 0.18]]) {
              arr.push(prev.x, prev.y + y0, prev.z, p.x, p.y + y0, p.z, prev.x, prev.y + y1, prev.z,
                       p.x, p.y + y0, p.z, p.x, p.y + y1, p.z, prev.x, prev.y + y1, prev.z);
            }
          }
        }
        prev = p;
      }
    }
    for (const [arr, mat] of [[wallV, mWall], [blueV, mBlue]]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, mat);
      mesh.material.side = THREE.DoubleSide;
      scene.add(mesh);
    }
  }

  // === 起終點線（黑白格） ===
  {
    const sm = path.sample(0);
    const w = sm.wl + sm.wr;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, w), new THREE.MeshStandardMaterial({ map: checkerTex(), roughness: 0.6 }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.atan2(-sm.tan.z, sm.tan.x) + Math.PI / 2;
    m.position.copy(sm.pos).addScaledVector(sm.nor, (sm.wl - sm.wr) / 2);
    m.position.y += 0.03;
    scene.add(m);
  }

  // === 起跑門架 + 燈板 ===
  const gantryLights = [];
  {
    const sm = path.sample(6);
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b7686, roughness: 0.5, metalness: 0.4 });
    const span = sm.wl + sm.wr + 6;
    for (const side of [1, -1]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.5, 0.6), mat);
      pil.position.set(side * span / 2, 3.75, 0); grp.add(pil);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(span, 1.1, 1.0), mat);
    beam.position.y = 7; grp.add(beam);
    // 5 組紅燈
    const panel = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.7, 0.25), new THREE.MeshStandardMaterial({ color: 0x111418 }));
    panel.position.set(0, 5.7, 0); grp.add(panel);
    for (let c = 0; c < 5; c++) {
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a0d0d, emissive: 0x000000 });
      for (let r = 0; r < 2; r++) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8), lampMat);
        lamp.position.set(-2.0 + c * 1.0, 6.05 - r * 0.62, 0.16);
        grp.add(lamp);
      }
      gantryLights.push(lampMat);
    }
    grp.position.copy(sm.pos).addScaledVector(sm.nor, (sm.wl - sm.wr) / 2);
    grp.rotation.y = Math.atan2(-sm.tan.z, sm.tan.x) + Math.PI / 2;
    grp.traverse(o => { o.castShadow = true; });
    scene.add(grp);
  }

  // === 立體交叉橋（西直道從上方跨越） ===
  {
    const sOver = TRACK.crossOver * path.total;
    const mat = new THREE.MeshStandardMaterial({ color: 0x8d939d, roughness: 0.85 });
    // 橋墩
    for (const ds of [-16, 16]) {
      const sm = path.sample(sOver + ds);
      for (const side of [1, -1]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, sm.pos.y + 10, 1.4), mat);
        col.position.copy(sm.pos).addScaledVector(sm.nor, side * (side > 0 ? sm.wl : sm.wr) * 0.7);
        col.position.y = (sm.pos.y - 10) / 2 + 4;
        col.castShadow = true;
        scene.add(col);
      }
    }
    // 橋側牆
    for (let ds = -28; ds <= 28; ds += 4) {
      const sm = path.sample(sOver + ds);
      for (const side of [1, -1]) {
        const w = (side > 0 ? sm.wl : sm.wr) + 0.4;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.35), mat);
        wall.position.copy(sm.pos).addScaledVector(sm.nor, side * w);
        wall.position.y += 0.4;
        wall.rotation.y = Math.atan2(-sm.tan.z, sm.tan.x);
        scene.add(wall);
      }
    }
  }

  // === 主看台（大直道外側）含人群紋理 ===
  {
    const sm = path.sample(path.total - 120);
    const grp = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(230, 14, 18), new THREE.MeshStandardMaterial({ color: 0x7d8aa3, roughness: 0.85 }));
    stand.position.y = 7; grp.add(stand);
    const crowd = new THREE.Mesh(new THREE.PlaneGeometry(228, 12), new THREE.MeshStandardMaterial({ map: crowdTex(), roughness: 1 }));
    crowd.position.set(0, 8.2, 9.2); crowd.rotation.x = -0.32; grp.add(crowd);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(232, 0.5, 22), new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: 0.4, metalness: 0.3 }));
    roof.position.set(0, 14.6, -1); roof.rotation.x = 0.06; grp.add(roof);
    grp.position.copy(sm.pos).addScaledVector(sm.nor, -(sm.wr + 26));
    grp.position.y = sm.pos.y - 0.5;
    grp.rotation.y = Math.atan2(-sm.tan.z, sm.tan.x);
    // 確保人群面朝賽道：檢查局部 +z 是否指向賽道，否則旋轉 180°
    {
      const localZ = new THREE.Vector3(Math.sin(grp.rotation.y), 0, Math.cos(grp.rotation.y));
      const toTrack = new THREE.Vector3().subVectors(sm.pos, grp.position).setY(0);
      if (localZ.dot(toTrack) < 0) grp.rotation.y += Math.PI;
    }
    grp.traverse(o => { o.castShadow = true; });
    scene.add(grp);

    // 維修大樓（內側）
    const pit = new THREE.Mesh(new THREE.BoxGeometry(200, 9, 14), new THREE.MeshStandardMaterial({ color: 0xdce1e8, roughness: 0.7 }));
    const sm2 = path.sample(path.total - 140);
    pit.position.copy(sm2.pos).addScaledVector(sm2.nor, sm2.wl + 18);
    pit.position.y = sm2.pos.y + 4.5;
    pit.rotation.y = Math.atan2(-sm2.tan.z, sm2.tan.x);
    pit.castShadow = true;
    scene.add(pit);
  }

  // === 鈴鹿招牌摩天輪 ===
  let ferris = null;
  {
    const sm = path.sample(path.total - 350);
    const grp = new THREE.Group();
    const R = 28;
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8e8f0, roughness: 0.5, metalness: 0.35 });
    const wheel = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.7, 8, 48), mat);
    wheel.add(ring);
    const gondCols = [0xe14444, 0xe1a544, 0x44b6e1, 0x6ee144, 0xc66ee1, 0xe1e144];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, R, 6), mat);
      spoke.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0);
      spoke.rotation.z = a + Math.PI / 2;
      wheel.add(spoke);
      const gond = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8),
        new THREE.MeshStandardMaterial({ color: gondCols[i % 6], roughness: 0.4 }));
      gond.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      wheel.add(gond);
    }
    wheel.position.y = R + 6;
    grp.add(wheel);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, R + 8, 8), mat);
      leg.position.set(sx * 7, (R + 6) / 2, 0);
      leg.rotation.z = sx * 0.2;
      grp.add(leg);
    }
    grp.position.copy(sm.pos).addScaledVector(sm.nor, -(sm.wr + 95));
    grp.position.y = sm.pos.y - 2;
    grp.rotation.y = Math.atan2(-sm.tan.z, sm.tan.x);
    scene.add(grp);
    ferris = wheel;
  }

  // === 樹木（instanced，避開賽道） ===
  {
    const cnt = 420;
    const trunkG = new THREE.CylinderGeometry(0.35, 0.5, 3.5, 6);
    const crownG = new THREE.ConeGeometry(3.2, 8, 7);
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 }), cnt);
    const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), cnt);
    // 賽道點空間網格，用來排除離路太近的樹
    const grid = new Map();
    const CELL = 40;
    const keyOf = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
    for (const p of path.pos) {
      const k = keyOf(p.x, p.z);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(p);
    }
    const nearTrack = (x, z, r) => {
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gz = cz - 1; gz <= cz + 1; gz++) {
        const arr = grid.get(`${gx},${gz}`);
        if (arr) for (const p of arr) {
          if ((p.x - x) ** 2 + (p.z - z) ** 2 < r * r) return p;
        }
      }
      return null;
    };
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    let placed = 0, rngS = 12345;
    const rng = () => { rngS = (rngS * 16807) % 2147483647; return rngS / 2147483647; };
    let guard = 0;
    while (placed < cnt && guard++ < 8000) {
      const x = -1620 + rng() * 2180, z = -480 + rng() * 1180;
      if (nearTrack(x, z, 28)) continue;
      const ref = nearTrack(x, z, 130);
      const y = ref ? ref.y - 2.5 : -11;
      const sc = 0.7 + rng() * 0.9;
      S.set(sc, sc, sc);
      M.compose(new THREE.Vector3(x, y + 1.75 * sc, z), Q, S);
      trunks.setMatrixAt(placed, M);
      M.compose(new THREE.Vector3(x, y + (3.5 + 3.5) * sc, z), Q, S);
      crowns.setMatrixAt(placed, M);
      // 每棵樹冠隨機深淺綠（偶爾偏黃綠），整片樹林不再死板
      const hue = 0.28 + rng() * 0.09, light = 0.16 + rng() * 0.14;
      crowns.setColorAt(placed, new THREE.Color().setHSL(hue, 0.55 + rng() * 0.2, light));
      placed++;
    }
    trunks.count = crowns.count = placed;
    trunks.castShadow = crowns.castShadow = true;
    scene.add(trunks, crowns);
  }

  // === 彎道指示板（煞車點 100/50 板，彎前外側） ===
  {
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xeb3434, roughness: 0.6 });
    for (let i = 0; i < n; i += 6) {
      if (Math.abs(path.curv[i]) > 0.02 && Math.abs(path.curv[(i - 25 + n) % n]) < 0.006) {
        const k = (i - 25 + n) % n;
        const side = path.curv[i] > 0 ? -1 : 1; // 彎外側
        const p = path.pos[k], nor = path.nor[k];
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 1.0), boardMat);
        b.position.copy(p).addScaledVector(nor, side * ((side > 0 ? path.wl[k] : path.wr[k]) + 3));
        b.position.y = p.y + 1.0;
        b.rotation.y = Math.atan2(-path.tan[k].z, path.tan[k].x);
        scene.add(b);
      }
    }
  }

  return { gantryLights, ferris };
}
