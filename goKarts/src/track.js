// 赛道模组：3 条立体赛道定义 + 建构器（道路网格、倾斜弯、地形、装饰、看台、迷你地图资料）
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { QUALITY, RENDER } from './render.js';

const UP = new THREE.Vector3(0, 1, 0);

// ---- Kenney 场景装饰模型（CC0）----
let deco = null, decoPromise = null;
export function loadDecoModels() {
  if (decoPromise) return decoPromise;
  const loader = new GLTFLoader();
  decoPromise = Promise.all(
    ['decoration-forest', 'decoration-tents'].map(n =>
      loader.loadAsync(`assets/kenney/${n}.glb`).then(g => [n, g.scene])
    )
  ).then(pairs => {
    deco = Object.fromEntries(pairs);
    for (const o of Object.values(deco)) o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  })
   .catch(e => { console.warn('装饰模型载入失败，略过', e); deco = null; });
  return decoPromise;
}

// ============ 三条赛道定义 ============
// sky: 物理天空参数（Preetham）；hemiSky/hemiGround: 半球光颜色；sunScale: 主光相对强度
export const TRACKS = [
  {
    id: 'meadow', name: '翠绿草原', emoji: '🌿',
    desc: '丘陵起伏的阳光草原，适合入门的高速流畅路线',
    laps: 3, width: 15, shoulder: 6, wallExtra: 7.5,
    theme: 'meadow', bankFactor: 0, maxBank: 0.001,
    sky: { turbidity: 4, rayleigh: 1.6, mie: 0.004, mieG: 0.8 },
    fog: { color: 0xc9dcee, near: 220, far: 900 },
    ground: 0x5fae4e, offroadColor: 0x67b357,
    ambient: 1.0, sunColor: 0xfff1d8, sunPos: [110, 150, 70], sunScale: 1.0,
    hemiSky: 0xcfe2ff, hemiGround: 0x3f6b36,
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
    id: 'canyon', name: '烈日峡谷', emoji: '🏜️',
    desc: '巨岩峡谷间的大落差山路，发夹弯与陡坡俯冲',
    laps: 3, width: 14, shoulder: 3.5, wallExtra: 4.5,
    theme: 'canyon', bankFactor: 14, maxBank: 0.16,
    sky: { turbidity: 9, rayleigh: 2.6, mie: 0.012, mieG: 0.86 },
    fog: { color: 0xe8c9a6, near: 200, far: 820 },
    ground: 0xd8a25e, offroadColor: 0xcf9750,
    ambient: 0.9, sunColor: 0xffd9a8, sunPos: [-200, 80, 60], sunScale: 1.15,
    hemiSky: 0xffd4a8, hemiGround: 0x7a4a2a,
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
    desc: '穿梭摩天楼间的夜间高架赛道，霓虹灯海与立体交叉',
    laps: 3, width: 14, shoulder: 1.6, wallExtra: 2.4,
    theme: 'neon', bankFactor: 12, maxBank: 0.15,
    skyGradient: { top: '#0a0f2e', bottom: '#3b2578' },
    fog: { color: 0x1c1238, near: 140, far: 560 },
    ground: 0x1a1630, offroadColor: 0x221b40,
    // 夜景：月光偏蓝、环境光加倍、曝光独立拉高，避免整片黑
    ambient: 2.6, sunColor: 0xb4c2ff, sunPos: [-80, 260, -120], sunScale: 1.9, exposureScale: 1.7,
    hemiSky: 0x6a5ad0, hemiGround: 0x1a1030,
    points: [
      [0, 8, 0], [66, 8, -6], [118, 10, -36], [140, 14, -90], [112, 19, -140],
      [58, 22, -158], [6, 21, -140], [-30, 18, -160], [-78, 16, -184], [-124, 14, -156],
      [-136, 13, -106], [-104, 16, -70], [-70, 19, -40], [-30, 21, -60], [6, 19, -82],
      [2, 16, -102], [-30, 13, -116], [-72, 9, -96], [-96, 8, -52], [-70, 8, -8], [-30, 8, 10],
    ],
    itemIdx: [0.18, 0.46, 0.76], boostIdx: [0.30, 0.62],
  },
];

// ============ 程序化贴图 ============
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace; // 画布颜色是 sRGB，必须标记才不会偏亮泛白
  return t;
}

function roadTexture(theme) {
  return canvasTex(512, 512, (g, w, h) => {
    const base = theme === 'neon' ? '#2a3046' : theme === 'canyon' ? '#3e3733' : '#34373d';
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // 柏油颗粒（两层：细粒 + 粗斑）
    for (let i = 0; i < 9000; i++) {
      const v = Math.random() * 34 - 17;
      g.fillStyle = `rgba(${140 + v},${140 + v},${146 + v},0.07)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (let i = 0; i < 900; i++) {
      const v = Math.random() * 20 - 10;
      g.fillStyle = `rgba(${90 + v},${90 + v},${96 + v},0.10)`;
      g.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 5, 3 + Math.random() * 4);
    }
    // 轮胎磨痕：两道略深的行车线
    for (const cx of [w * 0.3, w * 0.7]) {
      const gr = g.createLinearGradient(cx - 46, 0, cx + 46, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(cx - 46, 0, 92, h);
    }
    // 两侧白边线（边缘略磨损）
    g.fillStyle = theme === 'neon' ? '#59f7ff' : '#e6e6e2';
    g.fillRect(12, 0, 12, h); g.fillRect(w - 24, 0, 12, h);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(52,55,61,${0.25 + Math.random() * 0.35})`;
      const y = Math.random() * h;
      g.fillRect(12 + Math.random() * 10, y, 2, 3); g.fillRect(w - 24 + Math.random() * 10, y, 2, 3);
    }
    // 中央虚线
    g.fillStyle = theme === 'neon' ? '#ff5fd0' : '#f2c53d';
    for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 7, y, 14, 68);
  });
}

function curbTexture() {
  return canvasTex(64, 128, (g, w, h) => {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? '#d63a34' : '#efefea';
      g.fillRect(0, i * 32, w, 32);
      // 每段接缝处压一道暗线，做出立体块感
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, i * 32, w, 2);
    }
  });
}

function checkerTexture() {
  return canvasTex(128, 64, (g, w, h) => {
    const s = 16;
    for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) {
      g.fillStyle = (x + y) % 2 ? '#141414' : '#f4f4f4';
      g.fillRect(x * s, y * s, s, s);
    }
  });
}

function groundTexture(hex, theme) {
  return canvasTex(256, 256, (g, w, h) => {
    const c = new THREE.Color(hex);
    const r = c.r * 255 | 0, gg = c.g * 255 | 0, b = c.b * 255 | 0;
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3600; i++) {
      const v = Math.random() * 40 - 20;
      g.fillStyle = `rgba(${r + v | 0},${gg + v | 0},${b + v | 0},0.38)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    if (theme === 'meadow') { // 草丛笔触
      for (let i = 0; i < 700; i++) {
        g.strokeStyle = `rgba(${r - 30 + Math.random() * 30 | 0},${gg + 10 + Math.random() * 30 | 0},${b - 10 | 0},0.35)`;
        g.lineWidth = 1;
        const x = Math.random() * w, y = Math.random() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y - 3 - Math.random() * 4); g.stroke();
      }
    }
    if (theme === 'neon') { // 城市地面格线
      g.strokeStyle = 'rgba(80,110,255,0.25)'; g.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke();
        g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke();
      }
    }
  });
}

// PBR 标准材质快捷（布景统一走 Standard 才吃得到阴影/环境反射）
function std(opts) {
  return new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.0, envMapIntensity: RENDER.env, ...opts });
}
function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast; mesh.receiveShadow = receive; return mesh;
}

// ============ 赛道建构 ============
export const N_SAMPLES = 900;

export function buildTrack(def) {
  const group = new THREE.Group();
  const pts = def.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.55);
  const N = N_SAMPLES;
  const raw = curve.getSpacedPoints(N); // N+1 点，首尾相同
  raw.pop();
  const totalLen = curve.getLength();
  const halfW = def.width / 2;

  // ---- 取样：位置/切线/侧向/倾斜 ----
  const samples = [];
  for (let i = 0; i < N; i++) {
    const p = raw[i];
    const tan = raw[(i + 1) % N].clone().sub(raw[(i - 1 + N) % N]).normalize();
    const side = new THREE.Vector3().crossVectors(UP, tan).normalize(); // 行进方向左侧
    samples.push({ pos: p, tan, side, bank: 0, bankSlope: 0 });
  }
  // 由曲率算弯道倾斜（内高外低的斜坡），再平滑
  const rawBank = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t0 = samples[(i - 2 + N) % N].tan, t1 = samples[(i + 2) % N].tan;
    const cy = t0.x * t1.z - t0.z * t1.x; // 转向符号
    rawBank[i] = THREE.MathUtils.clamp(cy * def.bankFactor, -def.maxBank, def.maxBank);
  }
  // 倾斜过渡拉长（±26 取样 ≈ 25m），避免 S 弯中倾斜方向急翻造成路面扭曲
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let k = -26; k <= 26; k++) s += rawBank[(i + k + N) % N];
    samples[i].bank = s / 53;
    samples[i].bankSlope = Math.tan(samples[i].bank);
  }
  // 真实曲率（切线夹角），供 AI 弯前减速用，与倾斜度脱钩
  for (let i = 0; i < N; i++) {
    const t0 = samples[(i - 3 + N) % N].tan, t1 = samples[(i + 3) % N].tan;
    const dot = THREE.MathUtils.clamp(t0.x * t1.x + t0.y * t1.y + t0.z * t1.z, -1, 1);
    samples[i].curve = Math.acos(dot);
  }

  // ---- 表面高度查询 ----
  function surfaceY(idx, frac, lateral) {
    const a = samples[idx], b = samples[(idx + 1) % N];
    const y = a.pos.y + (b.pos.y - a.pos.y) * frac;
    const slope = a.bankSlope + (b.bankSlope - a.bankSlope) * frac;
    return y + slope * lateral;
  }

  // ---- 最近取样点查询 ----
  // 窗口刻意缩小（±12）：连续追踪下每帧移动 <1 取样点，
  // 窗口太大会在发夹弯被吸附到对面路段，造成瞬间出界/高度跳动的「隐形陷阱」
  const tmp = new THREE.Vector3();
  function query(pos, hint) {
    let best = hint, bestD = Infinity;
    for (let k = -12; k <= 12; k++) {
      const i = (hint + k + N) % N;
      const d = tmp.subVectors(pos, samples[i].pos).setY(0).lengthSq();
      if (d < bestD) { bestD = d; best = i; }
    }
    // 追踪丢失（距离 >20m）时才全域重新搜寻
    if (bestD > 400) {
      for (let i = 0; i < N; i += 2) {
        const d = tmp.subVectors(pos, samples[i].pos).setY(0).lengthSq();
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    const s = samples[best];
    const dx = pos.x - s.pos.x, dz = pos.z - s.pos.z;
    const along = dx * s.tan.x + dz * s.tan.z;            // 沿切线的投影
    const lateral = dx * s.side.x + dz * s.side.z;        // 侧向偏移（左正）
    const segLen = totalLen / N;
    const frac = THREE.MathUtils.clamp(along / segLen, -0.5, 1.5);
    return { idx: best, frac, lateral, surfaceY: surfaceY(best, THREE.MathUtils.clamp(frac, 0, 1), lateral) };
  }

  // ---- 道路网格 ----
  const roadGeo = new THREE.BufferGeometry();
  const vtx = [], uv = [], idxArr = [];
  const vScale = totalLen / (def.width * 2.2); // 贴图沿路重复数
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
  const road = new THREE.Mesh(roadGeo, std({ map: roadTexture(def.theme), roughness: 0.88, side: THREE.DoubleSide }));
  shadowed(road, false, true);
  group.add(road);

  // 贴合路面的条带（起跑线、加速带等用，避免平面贴片在坡道上破图）
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

  // ---- 路缘（红白curb）----
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
    group.add(shadowed(new THREE.Mesh(g2, std({ map: curbT, roughness: 0.7, side: THREE.DoubleSide })), false, true));
  }

  // ---- 路肩（路缘外到护栏的实体地面，与物理高度外推一致）----
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
    group.add(shadowed(new THREE.Mesh(g4, std({ map: shT, side: THREE.DoubleSide })), false, true));
  }

  // ---- 护栏 / 霓虹灯条 ----
  const railMat = def.theme === 'neon'
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3ce6ff).multiplyScalar(1.35), transparent: true, opacity: 0.9 }) // HDR 亮度 → bloom 发光
    : std({ color: def.theme === 'canyon' ? 0xa9743c : 0xdcd6c6, roughness: 0.8 });
  // 实体护栏：内侧面 + 顶面 + 外侧面（有厚度）
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
      // 每取样 4 点：内下、内上、外上、外下（底部略埋入地面）
      v3.push(
        inn.x, inn.y - 0.25, inn.z,
        inn.x, inn.y + wallH, inn.z,
        out.x, out.y + wallH, out.z,
        out.x, out.y - 0.25, out.z
      );
      if (i < N) {
        const a = i * 4;
        i3.push(
          a, a + 1, a + 4, a + 1, a + 5, a + 4,       // 内侧面
          a + 1, a + 2, a + 5, a + 2, a + 6, a + 5,   // 顶面
          a + 2, a + 3, a + 6, a + 3, a + 7, a + 6    // 外侧面
        );
      }
    }
    g3.setAttribute('position', new THREE.Float32BufferAttribute(v3, 3));
    g3.setIndex(i3); g3.computeVertexNormals();
    const mat = railMat.clone();
    mat.side = THREE.DoubleSide;
    group.add(shadowed(new THREE.Mesh(g3, mat), def.theme !== 'neon', true));
  }

  // ---- 起跑线 + 拱门 ----
  const s0 = samples[0];
  group.add(buildStrip(N - 2, 4, halfW, 0.045, std({ map: checkerTexture(), roughness: 0.6 }), 1));

  const archMat = std({ color: 0xd8352f, roughness: 0.55, metalness: 0.1 });
  for (const sign of [1, -1]) {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 9, 12), archMat);
    pil.position.copy(s0.pos).addScaledVector(s0.side, sign * (halfW + 1.6));
    pil.position.y += 4.5;
    group.add(shadowed(pil));
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(def.width + 4.5, 2.2, 1), std({ map: checkerTexture(), roughness: 0.6 }));
  banner.position.copy(s0.pos); banner.position.y += 9.2;
  banner.rotation.y = Math.atan2(s0.tan.x, s0.tan.z);
  group.add(shadowed(banner));
  // 拱门顶灯排（HDR 微亮，有 bloom 时轻微发光）
  const lampRow = new THREE.Mesh(new THREE.BoxGeometry(def.width + 2, 0.25, 0.3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c0).multiplyScalar(1.4) }));
  lampRow.position.copy(banner.position); lampRow.position.y -= 1.35;
  lampRow.rotation.y = banner.rotation.y;
  lampRow.translateZ(-0.6);
  group.add(lampRow);

  // ---- 地形（起伏丘陵，靠近赛道处压平）----
  group.add(buildTerrain(def, samples, N, wallD));

  // ---- 看台 + 观众（起点两侧）----
  addGrandstand(group, def, samples, N, halfW, wallD);

  // ---- 主题装饰 ----
  addDecorations(group, def, samples, halfW, N, wallD);

  // ---- 加速带（贴路面的箭头条带）----
  const boostPads = [];
  const padTex = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // V 型箭头（尖端朝行进方向）
    g.fillStyle = 'rgba(255,154,31,0.92)';
    g.beginPath();
    g.moveTo(6, 36); g.lineTo(32, 8); g.lineTo(58, 36);
    g.lineTo(58, 54); g.lineTo(32, 26); g.lineTo(6, 54);
    g.closePath(); g.fill();
  });
  const padMat = new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false, color: new THREE.Color(1.3, 1.3, 1.3) });
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

  // ---- 迷你地图点位（xz 正规化）----
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

// ============ 地形 ============
// 简易 2D value noise（可重现）
function makeNoise(seed) {
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = t => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const tx = smooth(x - xi), ty = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
  };
  // 三个八度
  return (x, y) => (n2(x, y) * 0.6 + n2(x * 2.1 + 7.3, y * 2.1 + 3.1) * 0.28 + n2(x * 4.3 + 1.7, y * 4.3 + 9.2) * 0.12) - 0.5;
}

function buildTerrain(def, samples, N, wallD) {
  const size = 1500, seg = QUALITY.terrainSeg;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const noise = makeNoise(def.id === 'meadow' ? 11 : def.id === 'canyon' ? 29 : 5);
  const base = new THREE.Color(def.ground);
  const c = new THREE.Color();
  const cfg = def.theme === 'meadow' ? { amp: 9, freq: 1 / 95, flat0: wallD + 9, flat1: wallD + 60, ridge: false }
    : def.theme === 'canyon' ? { amp: 15, freq: 1 / 75, flat0: wallD + 8, flat1: wallD + 50, ridge: true }
    : { amp: 0, freq: 1 / 80, flat0: 0, flat1: 1, ridge: false };
  // 到赛道中心线的最近距离（粗取样即可）
  const step = 6;
  const distToTrack = (x, z) => {
    let best = Infinity;
    for (let i = 0; i < N; i += step) {
      const dx = x - samples[i].pos.x, dz = z - samples[i].pos.z;
      const d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let h = 0;
    if (cfg.amp > 0) {
      const d = distToTrack(x, z);
      const k = THREE.MathUtils.smoothstep(d, cfg.flat0, cfg.flat1);
      let n = noise(x * cfg.freq, z * cfg.freq);
      if (cfg.ridge) n = Math.abs(n) * 1.6 - 0.35;
      h = n * cfg.amp * k;
      // 边缘远处再抬高，衔接远山
      const rim = THREE.MathUtils.smoothstep(Math.hypot(x, z), 380, 700);
      h += rim * 26 * (0.6 + noise(x * 0.004, z * 0.004));
    }
    pos.setY(i, -0.55 + h);
    // 顶点色：随高度/杂讯微变，低处略暗
    const v = noise(x * 0.02 + 50, z * 0.02 + 50);
    if (def.theme === 'meadow') c.copy(base).offsetHSL(v * 0.03, v * 0.15, v * 0.06 + h * 0.004);
    else if (def.theme === 'canyon') c.copy(base).offsetHSL(v * 0.02, v * 0.1, v * 0.05 + h * 0.003);
    else c.copy(base).offsetHSL(0, 0, v * 0.02);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const tex = groundTexture(0xffffff, def.theme); // 白底杂讯 × 顶点色
  tex.repeat.set(90, 90);
  const mat = std({ map: tex, vertexColors: true, roughness: 1.0 });
  return shadowed(new THREE.Mesh(geo, mat), false, true);
}

// ============ 看台 + 观众 ============
function addGrandstand(group, def, samples, N, halfW, wallD) {
  const rng = mulberry32(99);
  const step = 3, from = -48, to = 12;              // 取样区间（涵盖 8 个起跑格）
  const tiers = 4;
  const segs = Math.floor((to - from) / step);
  const segLen = 3.05;
  const perSeg = 3;                                  // 每段每层观众数
  const stepG = new THREE.BoxGeometry(segLen, 1.0, 1.7);
  const seatMat = std({ color: def.theme === 'neon' ? 0x2a2f4a : 0x8d8f96, roughness: 0.85 });
  const stepIM = new THREE.InstancedMesh(stepG, seatMat, segs * tiers * 2);
  const wallIM = new THREE.InstancedMesh(new THREE.BoxGeometry(segLen, tiers * 1.0 + 2.6, 0.5),
    std({ color: def.theme === 'neon' ? 0x1a1e33 : 0x5c6068 }), segs * 2);
  const roofIM = new THREE.InstancedMesh(new THREE.BoxGeometry(segLen, 0.35, tiers * 1.7 + 2.2),
    std({ color: def.theme === 'canyon' ? 0xc2452f : 0x2f5fd0, roughness: 0.6 }), segs * 2);
  const specG = new THREE.BoxGeometry(0.62, 1.0, 0.5);
  const headG = new THREE.SphereGeometry(0.26, 8, 6);
  const specIM = new THREE.InstancedMesh(specG, std({ roughness: 0.9 }), segs * tiers * perSeg * 2);
  const headIM = new THREE.InstancedMesh(headG, std({ color: 0xf1c9a5, roughness: 0.8 }), specIM.count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const col = new THREE.Color();
  let si = 0, wi = 0, pi = 0;
  for (const sign of [1, -1]) {
    for (let g = 0; g < segs; g++) {
      const idx = (from + g * step + Math.floor(step / 2) + N) % N;
      const s = samples[idx];
      const yaw = Math.atan2(s.tan.x, s.tan.z);
      q.setFromAxisAngle(UP, yaw);
      const baseD = wallD + 3.2;
      const baseY = s.pos.y + s.bankSlope * sign * baseD;
      for (let t = 0; t < tiers; t++) {
        const d = baseD + t * 1.7;
        p.copy(s.pos).addScaledVector(s.side, sign * d); p.y = baseY + 0.5 + t * 1.0;
        m.compose(p, q, sc); stepIM.setMatrixAt(si++, m);
        for (let k = 0; k < perSeg; k++) {
          if (rng() < 0.12) continue; // 留几个空位
          const along = (k - 1) * (segLen / perSeg) + (rng() - 0.5) * 0.3;
          p.copy(s.pos).addScaledVector(s.side, sign * (d + 0.25)).addScaledVector(s.tan, along);
          p.y = baseY + 1.0 + t * 1.0 + 0.5;
          m.compose(p, q, sc); specIM.setMatrixAt(pi, m);
          col.setHSL(rng(), 0.75, 0.5); specIM.setColorAt(pi, col);
          p.y += 0.72; m.compose(p, q, sc); headIM.setMatrixAt(pi, m);
          pi++;
        }
      }
      // 背墙 + 顶棚
      p.copy(s.pos).addScaledVector(s.side, sign * (baseD + tiers * 1.7 + 0.4)); p.y = baseY + (tiers * 1.0 + 2.6) / 2;
      m.compose(p, q, sc); wallIM.setMatrixAt(wi, m);
      p.copy(s.pos).addScaledVector(s.side, sign * (baseD + tiers * 1.7 / 2 + 0.6)); p.y = baseY + tiers * 1.0 + 2.9;
      m.compose(p, q, sc); roofIM.setMatrixAt(wi, m);
      wi++;
    }
  }
  specIM.count = pi; headIM.count = pi;
  for (const im of [stepIM, wallIM, roofIM, specIM, headIM]) { shadowed(im); group.add(im); }
  // 顶棚立柱
  const postMat = std({ color: 0x3a3d45 });
  for (const sign of [1, -1]) {
    for (let g = 0; g <= segs; g += 5) {
      const idx = (from + Math.min(g * step, to - from) + N) % N;
      const s = samples[idx];
      const d = wallD + 3.2 + tiers * 1.7 + 0.2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, tiers * 1.0 + 3.0, 6), postMat);
      post.position.copy(s.pos).addScaledVector(s.side, sign * d);
      post.position.y = s.pos.y + s.bankSlope * sign * d + (tiers * 1.0 + 3.0) / 2;
      group.add(shadowed(post));
    }
  }
}

// ============ 主题装饰 ============
function addDecorations(group, def, samples, halfW, N, wallD) {
  const rng = mulberry32(def.id === 'meadow' ? 7 : def.id === 'canyon' ? 21 : 42);
  // 判断位置是否离赛道太近（避免压到路面）
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
  // 起点看台附近净空（避免树压到看台）
  const nearStart = (x, z) => {
    const s = samples[(N - 20) % N];
    return Math.hypot(x - s.pos.x, z - s.pos.z) < 48;
  };

  if (def.theme === 'meadow') {
    // 沿路松树（instanced：树干 + 三层树冠）
    const trunkG = new THREE.CylinderGeometry(0.28, 0.42, 2.6, 7);
    const coneG = new THREE.ConeGeometry(1, 1, 8);
    const trunkIM = new THREE.InstancedMesh(trunkG, std({ color: 0x6b4a2b, roughness: 0.95 }), 140);
    const leafIM = [0, 1, 2].map(() => new THREE.InstancedMesh(coneG, std({ roughness: 0.9 }), 140));
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let ti = 0;
    scatter(140, wallD + 4, wallD + 55, wallD + 3.5, (x, z, s, r) => {
      if (nearStart(x, z)) return;
      const sc = 0.8 + r() * 0.9;
      const y = -0.5;
      m.makeScale(sc, sc, sc).setPosition(x, y + 1.3 * sc, z); trunkIM.setMatrixAt(ti, m);
      col.setHSL(0.33 + r() * 0.05, 0.5 + r() * 0.2, 0.26 + r() * 0.1);
      const tiers = [[2.6, 5.0, 2.4], [2.0, 4.2, 4.6], [1.35, 3.2, 6.6]]; // [半径, 高, 中心高]
      tiers.forEach(([rad, h, cy], k) => {
        m.makeScale(rad * sc, h * sc, rad * sc).setPosition(x, y + cy * sc, z);
        leafIM[k].setMatrixAt(ti, m); leafIM[k].setColorAt(ti, col);
      });
      ti++;
    });
    trunkIM.count = ti; leafIM.forEach(l => { l.count = ti; shadowed(l); group.add(l); });
    shadowed(trunkIM); group.add(trunkIM);

    if (deco && deco['decoration-forest']) {
      // Kenney 森林丛
      const fSrc = deco['decoration-forest'];
      const fb = new THREE.Box3().setFromObject(fSrc);
      const fSize = fb.getSize(new THREE.Vector3());
      const fScale = 16 / Math.max(fSize.x, fSize.z);
      scatter(10, wallD + 22, wallD + 80, wallD + 20, (x, z, s, r) => {
        const mm = fSrc.clone(true);
        mm.scale.setScalar(fScale * (0.75 + r() * 0.6));
        mm.position.set(x, -0.3, z);
        mm.rotation.y = r() * Math.PI * 2;
        group.add(mm);
      });
      // 帐篷观众区
      const tSrc = deco['decoration-tents'];
      if (tSrc) {
        const tb = new THREE.Box3().setFromObject(tSrc);
        const tSize = tb.getSize(new THREE.Vector3());
        const tScale = 13 / Math.max(tSize.x, tSize.z);
        const s12 = samples[Math.floor(N * 0.42)];
        const tp = s12.pos.clone().addScaledVector(s12.side, -(wallD + 14));
        if (clearOf(tp.x, tp.z, wallD + 10)) {
          const tents = tSrc.clone(true);
          tents.scale.setScalar(tScale);
          tents.position.set(tp.x, -0.3, tp.z);
          tents.rotation.y = Math.atan2(s12.tan.x, s12.tan.z);
          group.add(tents);
        }
      }
    }
    // 远山（雪顶低模山脉）
    addMountains(group, rng, { count: 16, rMin: 400, rMax: 560, hMin: 60, hMax: 130, snow: true, hue: 0.33, sat: 0.28, light: 0.3 });
    // 气球
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10),
        std({ color: new THREE.Color().setHSL(rng(), 0.85, 0.58), roughness: 0.45 }));
      const s = samples[Math.floor(rng() * N)];
      b.position.copy(s.pos).addScaledVector(s.side, (rng() > 0.5 ? 1 : -1) * (wallD + 4 + rng() * 10));
      b.position.y += 9 + rng() * 7;
      group.add(shadowed(b));
    }
  }

  if (def.theme === 'canyon') {
    // 巨岩台地（净空随岩石半径，避免压到路面）
    for (let n = 0, tries = 0; n < 34 && tries < 1000; tries++) {
      const i = Math.floor(rng() * N);
      const s = samples[i];
      const sideSign = rng() > 0.5 ? 1 : -1;
      const h = 6 + rng() * 26, w = 5 + rng() * 14;
      const dist = halfW + 8 + w + rng() * 70;
      const x = s.pos.x + s.side.x * sideSign * dist, z = s.pos.z + s.side.z * sideSign * dist;
      if (!clearOf(x, z, halfW + 7 + w) || nearStart(x, z)) continue;
      const rockG = new THREE.CylinderGeometry(w * (0.55 + rng() * 0.3), w, h, 7, 3);
      jitterGeometry(rockG, rng, w * 0.12, true);
      const rock = new THREE.Mesh(rockG, std({ color: new THREE.Color().setHSL(0.07, 0.5, 0.34 + rng() * 0.14), flatShading: true, roughness: 0.95 }));
      rock.position.set(x, h / 2 - 1.5, z);
      rock.rotation.y = rng() * Math.PI;
      group.add(shadowed(rock));
      n++;
    }
    // 仙人掌
    const cactusMat = std({ color: 0x3f9e4d, roughness: 0.8 });
    scatter(40, halfW + 7.5, halfW + 45, halfW + 7, (x, z, s, r) => {
      if (nearStart(x, z)) return;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3.6, 7), cactusMat);
      body.position.y = 1.8; g.add(shadowed(body));
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 1.8, 6), cactusMat);
      arm.position.set(0.85, 2.4, 0); arm.rotation.z = -0.5; g.add(shadowed(arm));
      g.position.set(x, -0.3, z); g.rotation.y = r() * Math.PI * 2;
      const sc = 0.7 + r() * 0.9; g.scale.setScalar(sc);
      group.add(g);
    });
    // 远景峡谷山壁（低模岩山）
    addMountains(group, rng, { count: 14, rMin: 380, rMax: 540, hMin: 50, hMax: 110, snow: false, hue: 0.06, sat: 0.55, light: 0.3 });
  }

  if (def.theme === 'neon') {
    // 高架桥墩
    const pierMat = std({ color: 0x2a2f45, roughness: 0.7, metalness: 0.2 });
    for (let i = 0; i < N; i += 36) {
      const s = samples[i];
      if (s.pos.y < 3) continue;
      // 立体交叉处下方有别段路面 → 不放桥墩
      let overRoad = false;
      for (let j = 0; j < N; j += 3) {
        const d = Math.min(Math.abs(i - j), N - Math.abs(i - j));
        if (d < 60) continue;
        const o = samples[j];
        const dx = s.pos.x - o.pos.x, dz = s.pos.z - o.pos.z;
        if (dx * dx + dz * dz < 144 && o.pos.y < s.pos.y - 2) { overRoad = true; break; }
      }
      if (overRoad) continue;
      // 桥墩顶压在路面中心下方 0.7，避免倾斜弯道时刺穿路面
      const h = s.pos.y - 0.1;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, h, 2.4), pierMat);
      pier.position.set(s.pos.x, s.pos.y / 2 - 0.65, s.pos.z);
      group.add(shadowed(pier));
    }
    // 霓虹大楼（instanced 主体 + 发光窗框）
    const buildings = [];
    scatter(70, halfW + 22, halfW + 120, halfW + 21, (x, z, s, r) => { if (!nearStart(x, z)) buildings.push({ x, z, h: 14 + r() * 58, w: 6 + r() * 10, hue: r() }); });
    const boxG = new THREE.BoxGeometry(1, 1, 1);
    // 发光窗贴图：随机亮窗，emissive 走 HDR 让 bloom 发光
    const winTex = canvasTex(64, 128, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let y = 4; y < h - 4; y += 8) for (let x = 4; x < w - 4; x += 8) {
        if (rng() < 0.55) { g.fillStyle = rng() < 0.7 ? '#ffe9b0' : '#9fd8ff'; g.fillRect(x, y, 4, 5); }
      }
    });
    winTex.repeat.set(2, 6);
    const bodyIM = new THREE.InstancedMesh(boxG, std({ color: 0x1b2140, roughness: 0.5, metalness: 0.3,
      emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.6 }), buildings.length);
    const glowIM = new THREE.InstancedMesh(boxG, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }), buildings.length);
    const m = new THREE.Matrix4();
    buildings.forEach((b, i) => {
      m.makeScale(b.w, b.h, b.w).setPosition(b.x, b.h / 2 - 1, b.z);
      bodyIM.setMatrixAt(i, m);
      m.makeScale(b.w * 1.02, 0.7, b.w * 1.02).setPosition(b.x, b.h - 0.6, b.z); // 顶部霓虹框
      glowIM.setMatrixAt(i, m);
      glowIM.setColorAt(i, new THREE.Color().setHSL(0.5 + b.hue * 0.45, 1, 0.6).multiplyScalar(1.8));
    });
    shadowed(bodyIM);
    group.add(bodyIM, glowIM);
    // 星空
    const starG = new THREE.BufferGeometry();
    const starV = [];
    for (let i = 0; i < 500; i++) {
      const a = rng() * Math.PI * 2, e = rng() * Math.PI * 0.45, r = 560;
      starV.push(Math.cos(a) * Math.cos(e) * r, 40 + Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(starV, 3));
    group.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 1.6, sizeAttenuation: false, fog: false })));
    // 路灯（贴合路肩表面，含弯道倾斜高度）
    for (let i = 0; i < N; i += 60) {
      const s = samples[i];
      const sgn = (i / 60) % 2 === 0 ? 1 : -1; // 左右交错
      const L = halfW + 1.9;
      const baseX = s.pos.x + s.side.x * sgn * L;
      const baseZ = s.pos.z + s.side.z * sgn * L;
      const baseY = s.pos.y + s.bankSlope * sgn * L;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.2, 5), pierMat);
      pole.position.set(baseX, baseY + 2.6, baseZ);
      group.add(shadowed(pole));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe08a).multiplyScalar(2.2) }));
      lamp.position.set(baseX, baseY + 5.35, baseZ);
      group.add(lamp);
    }
  }
}

// 顶点抖动（低模岩石/山体用）；keepTop=true 时不动顶面/底面中心
function jitterGeometry(geo, rng, amount, keepTop) {
  const p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (keepTop && Math.abs(Math.abs(y) - geo.parameters.height / 2) < 1e-3 && Math.hypot(p.getX(i), p.getZ(i)) < 1e-3) continue;
    p.setX(i, p.getX(i) + (rng() - 0.5) * amount);
    p.setZ(i, p.getZ(i) + (rng() - 0.5) * amount);
  }
  geo.computeVertexNormals();
}

// 远山环：低模锥体 + 高度顶点色（雪顶）
function addMountains(group, rng, o) {
  const c = new THREE.Color();
  for (let i = 0; i < o.count; i++) {
    const h = o.hMin + rng() * (o.hMax - o.hMin);
    const rad = h * (0.9 + rng() * 0.6);
    const geo = new THREE.ConeGeometry(rad, h, 9, 5);
    jitterGeometry(geo, rng, rad * 0.16, false);
    const p = geo.getAttribute('position');
    const cols = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) {
      const t = (p.getY(k) + h / 2) / h; // 0 底 → 1 顶
      if (o.snow && t > 0.62) c.setHSL(0.6, 0.15, 0.9 - (1 - t) * 0.2);
      else if (t > 0.42) c.setHSL(o.hue + 0.02, o.sat * 0.5, o.light + 0.12 + (t - 0.42) * 0.3);
      else c.setHSL(o.hue, o.sat, o.light + t * 0.12 + rng() * 0.02);
      cols[k * 3] = c.r; cols[k * 3 + 1] = c.g; cols[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Mesh(geo, std({ vertexColors: true, flatShading: true, roughness: 1.0 }));
    const ang = (i / o.count) * Math.PI * 2 + rng() * 0.3, r = o.rMin + rng() * (o.rMax - o.rMin);
    m.position.set(Math.cos(ang) * r, h / 2 - 12, Math.sin(ang) * r);
    m.rotation.y = rng() * Math.PI;
    group.add(m);
  }
}

// 可重现乱数
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============ 天空 ============
// 白天主题：Preetham 物理天空（HDR，含太阳盘，可烘成环境贴图）；夜景：渐层球体
export function buildSky(def) {
  if (def.sky) {
    const sky = new Sky();
    sky.scale.setScalar(4000);
    const u = sky.material.uniforms;
    u.turbidity.value = def.sky.turbidity;
    u.rayleigh.value = def.sky.rayleigh;
    u.mieCoefficient.value = def.sky.mie;
    u.mieDirectionalG.value = def.sky.mieG;
    u.sunPosition.value.set(...def.sunPos).normalize();
    return sky;
  }
  const geo = new THREE.SphereGeometry(600, 24, 14);
  const top = new THREE.Color(def.skyGradient.top), bot = new THREE.Color(def.skyGradient.bottom);
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
