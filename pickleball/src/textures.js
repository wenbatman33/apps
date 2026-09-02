// ===== 程序化貼圖：木地板 / 球場漆面 / 牆面 / 球網 / 記分板，全部用 canvas 產生，不需外部素材 =====
import * as THREE from 'three';

function noise2(x, y, seed = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// 由高度圖（灰階 canvas）算法線貼圖（Sobel）
function heightToNormal(src, strength = 2.0) {
  const w = src.width, h = src.height;
  const g = src.getContext('2d');
  const data = g.getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const og = out.getContext('2d');
  const img = og.createImageData(w, h);
  const H = (x, y) => data[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 255;
      img.data[i + 3] = 255;
    }
  }
  og.putImageData(img, 0, 0);
  return out;
}

function tex(c, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ---- 楓木地板（可平鋪）：一張貼圖 = 4m × 4m ----
export function makeWoodTextures(size = 1024) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const bump = makeCanvas(size, size);
  const bg = bump.getContext('2d');
  const rough = makeCanvas(size, size);
  const rg = rough.getContext('2d');

  const rows = 16;                       // 每列板寬 25cm
  const rowH = size / rows;
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, size, size);
  rg.fillStyle = '#6a6a6a'; rg.fillRect(0, 0, size, size);

  for (let r = 0; r < rows; r++) {
    // 每列板子交錯起點
    let x = -noise2(r, 1) * size * 0.6;
    while (x < size) {
      const len = size * (0.28 + noise2(r, x) * 0.32);
      const tone = noise2(r, x, 3);
      const base = [186 + tone * 24, 132 + tone * 26, 78 + tone * 22];
      const y = r * rowH;
      const grd = g.createLinearGradient(x, y, x + len, y + rowH);
      grd.addColorStop(0, `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`);
      grd.addColorStop(1, `rgb(${(base[0] - 14) | 0},${(base[1] - 12) | 0},${(base[2] - 10) | 0})`);
      g.fillStyle = grd;
      g.fillRect(x, y, len, rowH);
      // 木紋：沿板長方向細線
      const lines = 14 + (noise2(x, r, 7) * 12) | 0;
      for (let i = 0; i < lines; i++) {
        const ly = y + rowH * (0.05 + (i + noise2(i, x, 9)) / lines * 0.9);
        const a = 0.05 + noise2(i, r, 11) * 0.12;
        g.strokeStyle = `rgba(80,45,15,${a})`;
        g.lineWidth = 0.6 + noise2(i, x, 13) * 1.4;
        g.beginPath();
        const segs = 8;
        for (let s = 0; s <= segs; s++) {
          const px = x + (len * s) / segs;
          const py = ly + Math.sin(s * 1.7 + i + x * 0.01) * 1.6;
          if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
      }
      // 板縫（顏色/高度/粗糙度）
      g.fillStyle = 'rgba(60,35,15,0.55)';
      g.fillRect(x + len - 1.5, y, 2.2, rowH);
      g.fillRect(x, y, len, 1.4);
      bg.fillStyle = '#3a3a3a';
      bg.fillRect(x + len - 2, y, 3, rowH);
      bg.fillRect(x, y, len, 2);
      // 粗糙度：板面局部亮一點（拋光不均）
      rg.fillStyle = `rgba(120,120,120,${0.25 + noise2(x, r, 5) * 0.35})`;
      rg.fillRect(x, y, len, rowH);
      x += len;
    }
  }
  // 整體細顆粒讓反射不至於太塑膠
  const id = g.getImageData(0, 0, size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n;
  }
  g.putImageData(id, 0, 0);

  const normal = heightToNormal(bump, 1.6);
  return {
    map: tex(c, { repeat: [7, 8] }),
    normalMap: tex(normal, { srgb: false, repeat: [7, 8] }),
    roughnessMap: tex(rough, { srgb: false, repeat: [7, 8] }),
  };
}

// ---- 球場漆面覆蓋層（含線）：覆蓋 court + 邊界緩衝區，透明底 ----
// 回傳 { texture, worldW, worldL }
export function makeCourtTexture(C) {
  const margin = 0.9;
  const worldW = (C.halfW + margin) * 2;
  const worldL = (C.halfL + margin) * 2;
  const pxPerM = 140;
  const W = Math.round(worldW * pxPerM), H = Math.round(worldL * pxPerM);
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const X = (x) => (x + worldW / 2) * pxPerM;
  const Z = (z) => (z + worldL / 2) * pxPerM;

  // 場地主色（藍）＋ 廚房（深藍綠）
  g.fillStyle = '#2e6fb0';
  g.fillRect(X(-C.halfW), Z(-C.halfL), C.halfW * 2 * pxPerM, C.halfL * 2 * pxPerM);
  g.fillStyle = '#26597d';
  g.fillRect(X(-C.halfW), Z(-C.kitchen), C.halfW * 2 * pxPerM, C.kitchen * 2 * pxPerM);
  // 漆面顆粒
  const id = g.getImageData(0, 0, W, H);
  for (let i = 0; i < id.data.length; i += 4) {
    if (id.data[i + 3] === 0) continue;
    const n = (Math.random() - 0.5) * 14;
    id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n;
  }
  g.putImageData(id, 0, 0);

  // 白線
  const lw = C.lineW * pxPerM;
  g.strokeStyle = '#f4f6f8';
  g.lineWidth = lw;
  g.lineJoin = 'miter';
  const rect = (x0, z0, x1, z1) => g.strokeRect(X(x0) + lw / 2, Z(z0) + lw / 2, (x1 - x0) * pxPerM - lw, (z1 - z0) * pxPerM - lw);
  rect(-C.halfW, -C.halfL, C.halfW, C.halfL);           // 外框（線在框內）
  const line = (x0, z0, x1, z1) => { g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); };
  line(-C.halfW, -C.kitchen, C.halfW, -C.kitchen);       // 廚房線
  line(-C.halfW, C.kitchen, C.halfW, C.kitchen);
  line(0, C.kitchen, 0, C.halfL);                         // 中線（廚房→底線）
  line(0, -C.kitchen, 0, -C.halfL);
  // 線的輕微磨損
  g.globalAlpha = 0.18;
  g.fillStyle = '#2e6fb0';
  for (let i = 0; i < 600; i++) {
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  g.globalAlpha = 1;

  const t = tex(c, { repeat: [1, 1], aniso: 16 });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { texture: t, worldW, worldL };
}

// ---- 牆面：淺色塗裝 + 微顆粒 ----
export function makeWallTexture(size = 512) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = '#d8d3c6';
  g.fillRect(0, 0, size, size);
  const id = g.getImageData(0, 0, size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n - 2;
  }
  g.putImageData(id, 0, 0);
  return tex(c, { repeat: [6, 2] });
}

// ---- 混凝土磚（牆面上半） ----
export function makeBlockTexture(size = 512) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const bump = makeCanvas(size, size);
  const bg = bump.getContext('2d');
  g.fillStyle = '#cfc8b8'; g.fillRect(0, 0, size, size);
  bg.fillStyle = '#8a8a8a'; bg.fillRect(0, 0, size, size);
  const rows = 8, bh = size / rows, bw = size / 4;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw / 2;
    for (let i = -1; i < 5; i++) {
      const x = i * bw + off, y = r * bh;
      const t = noise2(i, r, 21);
      g.fillStyle = `rgb(${(200 + t * 22) | 0},${(193 + t * 20) | 0},${(176 + t * 18) | 0})`;
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      bg.fillStyle = '#5a5a5a';
      bg.fillRect(x, y, bw, 3); bg.fillRect(x, y, 3, bh);
    }
  }
  const id = g.getImageData(0, 0, size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n;
  }
  g.putImageData(id, 0, 0);
  return { map: tex(c, { repeat: [5, 2] }), normalMap: tex(heightToNormal(bump, 1.2), { srgb: false, repeat: [5, 2] }) };
}

// ---- 球網（透明網格，可平鋪）：線要夠粗，遠處 mipmap 平均後仍看得到半透明黑網 ----
export function makeNetTexture(size = 192) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.strokeStyle = '#17171b';
  g.lineWidth = 3.2;
  const n = 12, cell = size / n;
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(i * cell, 0); g.lineTo(i * cell, size); g.stroke();
    g.beginPath(); g.moveTo(0, i * cell); g.lineTo(size, i * cell); g.stroke();
  }
  return tex(c, { repeat: [1, 1] });
}

// ---- 匹克球表面（洞洞） ----
export function makeBallTexture(size = 256) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = '#d5ef2f';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#7f8f18';
  const n = 8;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n / 2; j++) {
      const x = (i + (j % 2) * 0.5) * (size / n);
      const y = (j + 0.5) * (size / (n / 2));
      g.beginPath(); g.arc(x, y, size / n * 0.18, 0, Math.PI * 2); g.fill();
    }
  }
  const t = tex(c, { repeat: [2, 1] });
  return t;
}

// ---- 記分板（動態 canvas，emissive） ----
export class ScoreboardTexture {
  constructor() {
    this.c = makeCanvas(1024, 384);
    this.g = this.c.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.draw(0, 0, 'p');
  }
  draw(p, a, server) {
    const g = this.g, W = this.c.width, H = this.c.height;
    g.fillStyle = '#0b0f14';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2b3542'; g.lineWidth = 6;
    g.strokeRect(6, 6, W - 12, H - 12);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 54px "PingFang TC","Microsoft JhengHei",system-ui,sans-serif';
    g.fillStyle = '#9fb3c8';
    g.fillText('PLAYER', W * 0.25, 70);
    g.fillText('CPU', W * 0.75, 70);
    g.font = '900 210px "Helvetica Neue",Arial,sans-serif';
    g.fillStyle = '#ff5a3c';
    g.shadowColor = '#ff5a3c'; g.shadowBlur = 24;
    g.fillText(String(p).padStart(2, '0'), W * 0.25, 220);
    g.fillStyle = '#4fd1ff'; g.shadowColor = '#4fd1ff';
    g.fillText(String(a).padStart(2, '0'), W * 0.75, 220);
    g.shadowBlur = 0;
    g.fillStyle = '#2b3542';
    g.fillRect(W / 2 - 3, 40, 6, H - 80);
    // 發球指示燈
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.arc(server === 'p' ? W * 0.25 : W * 0.75, 340, 14, 0, Math.PI * 2); g.fill();
    this.texture.needsUpdate = true;
  }
}

// ---- 橫幅（牆上大字） ----
export function makeBannerTexture(text, sub) {
  const c = makeCanvas(2048, 512);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#1d3a63'); grd.addColorStop(1, '#122340');
  g.fillStyle = grd; g.fillRect(0, 0, 2048, 512);
  g.strokeStyle = '#ffd23f'; g.lineWidth = 14; g.strokeRect(24, 24, 2000, 464);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 210px "Helvetica Neue",Arial,sans-serif';
  g.fillStyle = '#f7f9fc';
  g.fillText(text, 1024, 220);
  g.font = '700 70px "Helvetica Neue",Arial,sans-serif';
  g.fillStyle = '#ffd23f';
  g.fillText(sub, 1024, 400);
  const t = tex(c, { repeat: [1, 1] });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
