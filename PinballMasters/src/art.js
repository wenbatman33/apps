// ===== 檯面藝術（絲網印刷風 playfield art）與彈珠台零件建模 =====
import * as THREE from 'three';
import { TABLE } from './physics.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji",sans-serif';

// ---------- 中央大燈環（Space Cadet 式的圓盤燈圈） ----------
export const RING = { z: 1.15, r: 1.15, count: 22 };

// ---------- 檯面裝飾燈泡佈局（貼圖與 3D 燈泡共用同一份座標） ----------
export const BULB_LAYOUT = (() => {
  const L = [];
  const Y = 'rgba(255,210,90,.5)', B = 'rgba(90,180,255,.5)', P = 'rgba(200,140,255,.5)', R = 'rgba(255,110,140,.5)';
  // 頂弧內側一圈
  for (let i = 0; i <= 12; i++) {
    const t = (i / 12) * Math.PI;
    L.push({ x: Math.cos(t) * 2.72, z: (-6.6 + 3.2) - Math.sin(t) * 2.72, c: Y });
  }
  // 棋主基座兩側
  for (let i = 0; i < 4; i++) {
    L.push({ x: -1.62, z: -4.9 + i * 0.42, c: R });
    L.push({ x: 1.62, z: -4.9 + i * 0.42, c: R });
  }
  // 靶組上下緣
  for (let i = 0; i < 5; i++) {
    L.push({ x: -1.15 + i * 0.575, z: -2.7, c: Y });
  }
  // 左平台區（沿平台輪廓）
  for (let i = 0; i < 4; i++) L.push({ x: -3.0, z: -2.5 + i * 0.5, c: P });
  L.push({ x: -2.3, z: -2.3, c: P }); L.push({ x: -2.25, z: -1.05, c: P });
  L.push({ x: -2.65, z: -1.65, c: P });
  // 右能量翼
  for (let i = 0; i < 4; i++) L.push({ x: 2.3, z: -1.85 + i * 0.5, c: R });
  // 中央燈環外圈
  for (let i = 0; i < RING.count; i++) {
    const a = (i / RING.count) * Math.PI * 2 - Math.PI / 2;
    L.push({ x: Math.cos(a) * RING.r, z: RING.z + Math.sin(a) * RING.r, c: i % 3 === 0 ? Y : B, ring: i });
  }
  // 下方 inlane 兩側
  for (let i = 0; i < 3; i++) {
    L.push({ x: -1.95 + i * 0.2, z: 2.6 + i * 0.5, c: B });
    L.push({ x: 1.95 - i * 0.2, z: 2.6 + i * 0.5, c: B });
  }
  return L;
})();

// ---------- 檯面藝術貼圖 ----------
// 依照真實彈珠台的絲印風格：深底 + 大面積插畫區塊 + 發光路徑 + 區域標示文字
// baseImage：可選的底圖（AI 生成的檯面插畫）。有的話當底層鋪滿，
// 再疊上必須與 3D 零件對齊的燈孔、箭頭、燈環底盤。
export function makePlayfieldTexture(stage, baseImage = null) {
  const PX = 128; // 每世界單位像素
  const W = Math.round(TABLE.W * PX), H = Math.round(TABLE.L * PX);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (baseImage) return paintOverlay(g, c, W, H, baseImage);

  // 世界座標 → 貼圖座標（x:-3.2..3.2 → 0..W；z:-6.6..6.6 → 0..H）
  const X = (x) => (x - (-TABLE.HALF_W)) * PX;
  const Z = (z) => (z - TABLE.TOP) * PX;
  const S = (v) => v * PX;

  // --- 底色：深空漸層 ---
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#131a4d');
  bg.addColorStop(0.35, '#0c1233');
  bg.addColorStop(0.72, '#0a0f2b');
  bg.addColorStop(1, '#141b45');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // --- 星雲塗抹 ---
  const nebula = (cx, cy, r, col, alpha) => {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, col.replace('ALPHA', alpha));
    gr.addColorStop(1, col.replace('ALPHA', '0'));
    g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  nebula(X(-1.8), Z(-4.4), S(3.2), 'rgba(120,80,255,ALPHA)', '.32');
  nebula(X(2.0), Z(-2.2), S(2.8), 'rgba(0,180,255,ALPHA)', '.24');
  nebula(X(0), Z(1.4), S(3.4), 'rgba(255,120,60,ALPHA)', '.14');
  nebula(X(-2.4), Z(3.6), S(2.4), 'rgba(255,60,120,ALPHA)', '.16');

  // --- 星點 ---
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = Math.random() * 2.2 + 0.4;
    g.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // --- 上半部：棋盤格光暈（棋主領域） ---
  g.save();
  g.globalAlpha = 0.16;
  const cs = S(0.42);
  for (let ix = 0; ix < W / cs; ix++) {
    for (let iy = 0; iy < Z(-2.6) / cs; iy++) {
      if ((ix + iy) % 2) continue;
      const t = 1 - iy / (Z(-2.6) / cs);
      g.fillStyle = `rgba(120,150,255,${0.25 + t * 0.5})`;
      g.fillRect(ix * cs, iy * cs, cs, cs);
    }
  }
  g.restore();

  // --- 分區色塊（像 Space Cadet 那樣用大色塊切分機能區） ---
  const zone = (pts, fill, stroke) => {
    g.save();
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))));
    g.closePath();
    g.fillStyle = fill; g.fill();
    if (stroke) { g.lineWidth = 5; g.strokeStyle = stroke; g.stroke(); }
    g.restore();
  };
  // 左側抬高平台區（紫）
  zone([[-3.2, -2.75], [-1.95, -2.45], [-1.9, -0.85], [-3.2, -0.7]],
    'rgba(150,90,235,.30)', 'rgba(200,150,255,.45)');
  // 右側能量翼（紅）
  zone([[1.6, -2.5], [2.55, -2.1], [2.55, 0.4], [1.75, 0.05]],
    'rgba(230,60,90,.24)', 'rgba(255,120,150,.4)');
  // 頂部棋主基座（深藍）
  zone([[-1.5, -5.05], [1.5, -5.05], [1.15, -3.55], [-1.15, -3.55]],
    'rgba(40,60,160,.35)', 'rgba(120,160,255,.4)');
  // 底部發射扇形（紫）
  zone([[-1.5, 4.9], [1.5, 4.9], [0.9, 6.5], [-0.9, 6.5]],
    'rgba(140,90,230,.22)', 'rgba(180,140,255,.3)');

  // --- 發光同心環（中央 bumper 區） ---
  const bcx = X(0), bcy = Z(-1.2);
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = `rgba(90,140,255,${0.5 - i * 0.08})`;
    g.lineWidth = 5 - i * 0.6;
    g.beginPath(); g.arc(bcx, bcy, S(0.55 + i * 0.42), 0, Math.PI * 2); g.stroke();
  }
  // 中心放射線
  g.save();
  g.translate(bcx, bcy);
  for (let i = 0; i < 16; i++) {
    g.rotate(Math.PI * 2 / 16);
    const grd = g.createLinearGradient(0, 0, 0, -S(2.6));
    grd.addColorStop(0, 'rgba(140,180,255,.42)');
    grd.addColorStop(1, 'rgba(140,180,255,0)');
    g.strokeStyle = grd; g.lineWidth = 6;
    g.beginPath(); g.moveTo(0, -S(0.5)); g.lineTo(0, -S(2.6)); g.stroke();
  }
  g.restore();

  // --- 方向箭頭（Space Cadet 風格的黃色導引三角，大量散布） ---
  const arrow = (x, z, dir, size = 0.2, col = 'rgba(255,214,80,.75)') => {
    g.save();
    g.translate(X(x), Z(z));
    g.rotate(dir);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, -S(size)); g.lineTo(S(size * 0.8), S(size * 0.5));
    g.lineTo(0, S(size * 0.12)); g.lineTo(-S(size * 0.8), S(size * 0.5));
    g.closePath(); g.fill();
    g.restore();
  };
  // 沿主要球路鋪箭頭
  for (let i = 0; i < 5; i++) arrow(-2.82, -1.9 + i * 0.62, Math.PI, 0.16);          // 左通道往下
  for (let i = 0; i < 4; i++) arrow(2.3 + i * 0.02, 1.4 + i * 0.55, Math.PI, 0.16);  // 右側往下
  for (let i = 0; i < 3; i++) arrow(-1.15 + i * 0.05, 3.6 + i * 0.4, Math.PI, 0.15, 'rgba(90,220,255,.6)');
  for (let i = 0; i < 3; i++) arrow(1.15 - i * 0.05, 3.6 + i * 0.4, Math.PI, 0.15, 'rgba(90,220,255,.6)');
  arrow(-1.9, -2.5, -0.5, 0.22); arrow(1.9, -2.5, 0.5, 0.22);
  arrow(-0.55, -4.9, 0, 0.2); arrow(0.55, -4.9, 0, 0.2);
  arrow(-2.5, 0.9, -2.2, 0.2, 'rgba(200,150,255,.7)');
  arrow(2.2, -1.9, 2.4, 0.2, 'rgba(255,140,170,.7)');

  // --- 檯面燈點（大量散布的小燈孔，作為 3D 燈泡的底座印刷） ---
  const bulbHole = (x, z, col = 'rgba(255,210,90,.5)', r = 0.09) => {
    const cx = X(x), cy = Z(z);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, S(r * 2.4));
    gr.addColorStop(0, col);
    gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, S(r * 2.4), 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(10,14,34,.75)';
    g.beginPath(); g.arc(cx, cy, S(r), 0, Math.PI * 2); g.fill();
  };
  for (const p of BULB_LAYOUT) bulbHole(p.x, p.z, p.c ?? 'rgba(255,210,90,.5)');

  // --- 中央大燈環底盤（Space Cadet 標誌性的圓盤） ---
  {
    const cx = X(0), cy = Z(RING.z), rr = S(RING.r);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr * 1.15);
    gr.addColorStop(0, 'rgba(90,230,255,.55)');
    gr.addColorStop(0.55, 'rgba(40,120,220,.3)');
    gr.addColorStop(1, 'rgba(20,40,110,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, rr * 1.15, 0, Math.PI * 2); g.fill();
    // 裂紋
    g.strokeStyle = 'rgba(160,230,255,.35)'; g.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * rr * 0.85, cy + Math.sin(a) * rr * 0.85);
      g.stroke();
    }
    g.strokeStyle = 'rgba(200,240,255,.5)'; g.lineWidth = 5;
    g.beginPath(); g.arc(cx, cy, rr * 0.9, 0, Math.PI * 2); g.stroke();
  }

  // --- 區域標示文字（絲印字） ---
  const label = (text, x, z, size, col, rot = 0, weight = 900) => {
    g.save();
    g.translate(X(x), Z(z));
    g.rotate(rot);
    g.font = `${weight} ${S(size)}px "PingFang TC",Impact,sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = S(size) * 0.16; g.strokeStyle = 'rgba(0,0,0,.55)';
    g.strokeText(text, 0, 0);
    g.fillStyle = col;
    g.fillText(text, 0, 0);
    g.restore();
  };
  label('VOID KING', 0, -3.75, 0.34, 'rgba(255,90,130,.7)');
  label('POWER LOOP', 0, -0.05, 0.26, 'rgba(140,180,255,.45)');
  label('SPINNER', -2.62, 0.35, 0.18, 'rgba(255,215,94,.55)', 0);
  label('VOID WELL', 2.62, -0.2, 0.17, 'rgba(199,125,255,.6)', 0);
  label('BONUS', -2.62, 2.35, 0.2, 'rgba(255,215,94,.45)', -0.3);
  label('X2', 2.62, 2.35, 0.26, 'rgba(255,215,94,.45)', 0.3);
  label('SHOOT AGAIN', 0, 5.35, 0.2, 'rgba(255,255,255,.3)');

  // --- 底部 outlane / inlane 分隔線條 ---
  g.strokeStyle = 'rgba(120,160,255,.35)'; g.lineWidth = 4;
  const lane = (x1, z1, x2, z2) => { g.beginPath(); g.moveTo(X(x1), Z(z1)); g.lineTo(X(x2), Z(z2)); g.stroke(); };
  lane(-3.0, 3.4, -2.2, 5.1); lane(-2.45, 3.4, -1.6, 5.1);
  lane(3.0, 3.4, 2.2, 5.1); lane(2.45, 3.4, 1.6, 5.1);

  // --- 排水口（drain）警示 ---
  const dg = g.createLinearGradient(0, Z(5.4), 0, Z(6.6));
  dg.addColorStop(0, 'rgba(255,60,90,0)');
  dg.addColorStop(1, 'rgba(255,60,90,.35)');
  g.fillStyle = dg;
  g.fillRect(X(-1.6), Z(5.4), S(3.2), S(1.2));
  label('DRAIN', 0, 6.1, 0.26, 'rgba(255,140,160,.6)');

  // --- 英雄徽記（四角） ---
  const crest = (emoji, x, z, size, col) => {
    g.save();
    g.translate(X(x), Z(z));
    g.globalAlpha = 0.5;
    g.beginPath(); g.arc(0, 0, S(size * 0.75), 0, Math.PI * 2);
    g.fillStyle = col; g.fill();
    g.globalAlpha = 0.95;
    g.font = `${S(size)}px ${EMOJI_FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, 0, S(size * 0.06));
    g.restore();
  };
  crest('⚔️', -2.55, -4.6, 0.48, 'rgba(255,77,94,.35)');
  crest('🤖', 2.55, -4.6, 0.48, 'rgba(53,214,255,.35)');
  crest('🔮', -2.55, -0.4, 0.48, 'rgba(199,125,255,.3)');
  crest('🤠', 2.55, -0.4, 0.48, 'rgba(255,196,77,.3)');

  // --- 發射軌道底色 ---
  g.fillStyle = 'rgba(255,180,60,.1)';
  g.fillRect(X(TABLE.LANE_X), Z(-3.0), S(TABLE.HALF_W - TABLE.LANE_X), S(9.6));
  for (let i = 0; i < 8; i++) {
    label('▲', TABLE.LANE_CENTER, 5.2 - i * 0.9, 0.24, `rgba(255,200,90,${0.4 - i * 0.04})`);
  }

  // --- 邊緣暗角 ---
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 使用外部底圖時：鋪滿底圖，再疊上必須與 3D 零件對齊的元素
function paintOverlay(g, c, W, H, img) {
  const PX = 128;
  const X = (x) => (x - (-TABLE.HALF_W)) * PX;
  const Z = (z) => (z - TABLE.TOP) * PX;
  const S = (v) => v * PX;

  // 底圖等比填滿（cover）
  const sc = Math.max(W / img.width, H / img.height);
  const dw = img.width * sc, dh = img.height * sc;
  g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  // 發射軌道遮色（右側軌道要壓暗，避免插畫干擾）
  g.fillStyle = 'rgba(6,9,24,.72)';
  g.fillRect(X(TABLE.LANE_X), 0, S(TABLE.HALF_W - TABLE.LANE_X), H);

  // 燈孔（3D 燈泡的底座印刷）
  for (const p of BULB_LAYOUT) {
    const cx = X(p.x), cy = Z(p.z);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, S(0.22));
    gr.addColorStop(0, p.c);
    gr.addColorStop(1, p.c.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, S(0.22), 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(8,12,30,.8)';
    g.beginPath(); g.arc(cx, cy, S(0.09), 0, Math.PI * 2); g.fill();
  }

  // 中央燈環底盤
  {
    const cx = X(0), cy = Z(RING.z), rr = S(RING.r);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr * 1.15);
    gr.addColorStop(0, 'rgba(90,230,255,.5)');
    gr.addColorStop(1, 'rgba(20,40,110,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, rr * 1.15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(200,240,255,.5)'; g.lineWidth = 5;
    g.beginPath(); g.arc(cx, cy, rr * 0.9, 0, Math.PI * 2); g.stroke();
  }

  // 邊緣暗角
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 嘗試載入外部檯面插畫；沒有檔案就回傳 null（改用程序繪製）
export function loadPlayfieldArt(url = './assets/playfield_art.jpg') {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// 三張檯面各自的插畫 + 三張記分板底圖
export function loadAllPlayfieldArt(stages) {
  const jobs = [];
  for (const st of stages) jobs.push(loadPlayfieldArt('./assets/' + st.art));
  for (const st of stages) jobs.push(loadPlayfieldArt('./assets/' + st.glass));
  return Promise.all(jobs).then(all => ({
    tables: all.slice(0, stages.length),
    glasses: all.slice(stages.length),
  }));
}

// ---------- 記分板（backglass）：底圖 + 可即時更新的分數顯示 ----------
export function buildScoreboard(bgImage, theme) {
  const W = 1024, H = 384;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const accent = '#' + (theme.accent ?? 0xffd75e).toString(16).padStart(6, '0');
  const main = '#' + (theme.main ?? 0x35d6ff).toString(16).padStart(6, '0');

  const draw = (score, ball, totalBalls, extra) => {
    g.clearRect(0, 0, W, H);
    if (bgImage) {
      g.drawImage(bgImage, 0, 0, W, H);
      // 中央壓暗，讓數字看得清楚
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(4,6,16,.62)');
      gr.addColorStop(0.5, 'rgba(4,6,16,.78)');
      gr.addColorStop(1, 'rgba(4,6,16,.62)');
      g.fillStyle = gr;
      g.fillRect(W * 0.16, 0, W * 0.68, H);
    } else {
      g.fillStyle = '#070b1c'; g.fillRect(0, 0, W, H);
    }
    // 內框
    g.strokeStyle = accent; g.lineWidth = 5; g.globalAlpha = 0.75;
    g.beginPath(); g.roundRect(W * 0.17, 26, W * 0.66, H - 52, 14); g.stroke();
    g.globalAlpha = 1;

    // 主分數（點矩陣風格：先畫發光底再畫字）
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const text = score.toLocaleString();
    g.font = '900 132px "DS-Digital","Arial Black",monospace';
    g.shadowColor = accent; g.shadowBlur = 34;
    g.fillStyle = accent;
    g.fillText(text, W / 2, H * 0.46);
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.font = '900 132px "DS-Digital","Arial Black",monospace';
    g.globalAlpha = 0.32;
    g.fillText(text, W / 2, H * 0.46);
    g.globalAlpha = 1;

    // 下排：球數 + 額外訊息
    g.font = '700 40px "PingFang TC",Arial,sans-serif';
    g.fillStyle = main;
    g.shadowColor = main; g.shadowBlur = 16;
    g.fillText(`BALL ${ball} / ${totalBalls}`, W * 0.30, H * 0.80);
    g.fillText(extra || '', W * 0.70, H * 0.80);
    g.shadowBlur = 0;
  };

  draw(0, 1, 3, '');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  mesh.userData.update = (score, ball, totalBalls, extra) => {
    draw(score, ball, totalBalls, extra);
    tex.needsUpdate = true;
  };
  return mesh;
}

// ---------- 檯面粗糙度貼圖（讓漆面有變化） ----------
export function makeRoughnessTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4a4a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 40 + Math.random() * 90;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 8);
  return t;
}

// ---------- 環境反射：優先用 AI 生成的遊樂場全景，讓金屬反射有真實層次 ----------
export function loadEnvMap(renderer, url = './assets/env_arcade.jpg') {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromEquirectangular(tex).texture;
      pmrem.dispose();
      tex.dispose();
      resolve(env);
    };
    img.onerror = () => resolve(makeEnvMap(renderer)); // 沒有檔案就退回程序生成
    img.src = url;
  });
}

// ---------- 環境反射（程序生成的備援版本） ----------
export function makeEnvMap(renderer) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#9fc4ff');
  gr.addColorStop(0.45, '#2a3a80');
  gr.addColorStop(0.5, '#0d1230');
  gr.addColorStop(1, '#05070f');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  // 幾盞「頂燈」高光
  for (const [x, y, r] of [[60, 40, 34], [190, 30, 26], [128, 70, 20]]) {
    const lg = g.createRadialGradient(x, y, 0, x, y, r);
    lg.addColorStop(0, 'rgba(255,255,255,.95)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

// ---------- 共用材質 ----------
export const MAT = {
  chrome: (env) => new THREE.MeshStandardMaterial({ color: 0xdfe6f5, roughness: 0.14, metalness: 1, envMap: env, envMapIntensity: 1.35 }),
  plasticGlow: (col) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.28, metalness: 0.1 }),
  rubber: (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0 }),
  darkPlastic: () => new THREE.MeshStandardMaterial({ color: 0x0e1330, roughness: 0.55, metalness: 0.25 }),
};

// ---------- 零件：Pop Bumper（帽 + 裙 + 燈環 + 金屬柱） ----------
// 真實的 pop bumper：一頂彩色蘑菇帽（帽面有印刷圖案）壓在透明裙板上，
// 中央金屬桿只露出一小截。帽子要夠大，否則俯視時會變成「白眼球＋黑瞳孔」。
export function buildPopBumper(r, color, env) {
  const grp = new THREE.Group();

  // 底裙：薄薄一圈半透明塑膠，不要做成厚實白盤
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.12, r * 1.2, 0.05, 30),
    new THREE.MeshPhysicalMaterial({
      color: 0xdfe8ff, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.42,
      transmission: 0.5, thickness: 0.05, envMap: env, envMapIntensity: 0.8,
    })
  );
  skirt.position.y = 0.028;

  // 裙下的發光燈圈（真實 bumper 的燈是從裙板下方透出來的）
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.035, 30),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
  );
  ring.position.y = 0.012;

  // 帽面印刷圖案（同心圓 + 放射線，真實 bumper 帽子上都有）
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const col = '#' + color.toString(16).padStart(6, '0');
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 10;
  g.beginPath(); g.arc(128, 128, 92, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 6;
  g.beginPath(); g.arc(128, 128, 58, 0, Math.PI * 2); g.stroke();
  g.save(); g.translate(128, 128);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 12;
  for (let i = 0; i < 12; i++) {
    g.rotate(Math.PI * 2 / 12);
    g.beginPath(); g.moveTo(0, -60); g.lineTo(0, -92); g.stroke();
  }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.beginPath(); g.arc(128, 128, 26, 0, Math.PI * 2); g.fill();
  const capTex = new THREE.CanvasTexture(c);

  // 帽體：夠大夠飽滿的蘑菇形，蓋住大部分裙板
  const capGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0.46), new THREE.Vector2(r * 0.34, 0.445),
    new THREE.Vector2(r * 0.66, 0.39), new THREE.Vector2(r * 0.88, 0.29),
    new THREE.Vector2(r * 1.0, 0.17), new THREE.Vector2(r * 1.02, 0.08),
    new THREE.Vector2(r * 0.94, 0.06),
  ], 34);
  const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({
    map: capTex, color: 0xffffff, emissive: color, emissiveIntensity: 0.22,
    roughness: 0.3, metalness: 0.1, envMap: env, envMapIntensity: 0.7,
  }));
  cap.castShadow = true;

  // 中央金屬頂：只露出一小截圓頭，不要變成一根黑柱
  const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 14, 10), MAT.chrome(env));
  knob.position.y = 0.47;

  grp.add(ring, skirt, cap, knob);
  grp.userData = { cap, ring, skirt };
  return grp;
}

// ---------- 零件：Drop Target（可倒下的立牌靶） ----------
export function buildDropTarget(color, env) {
  const grp = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.42, 0.07),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.15,
      envMap: env, envMapIntensity: 0.7,
    })
  );
  face.position.y = 0.21;
  // 靶面白色橫紋
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.07, 0.075),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  stripe.position.set(0, 0.21, 0.002);
  // 底座
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.16), MAT.chrome(env));
  base.position.y = 0.025;
  grp.add(face, stripe, base);
  grp.userData = { face, stripe };
  return grp;
}

// ---------- 零件：Slingshot 三角擋板 ----------
// 真實彈珠台的 slingshot：一片有厚度的三角形塑膠板，斜邊掛橡皮筋，三個角有金屬柱與螺絲。
// a→b 是面向檯面中央的彈射斜邊，c 是靠牆的外側角。
export function buildSlingshot(a, b, c, color, env) {
  const grp = new THREE.Group();
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz);

  // --- 三角形塑膠板（擠出成有厚度的實體） ---
  const shape = new THREE.Shape();
  shape.moveTo(a.x, a.z); shape.lineTo(b.x, b.z); shape.lineTo(c.x, c.z); shape.closePath();
  const plateGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2,
  });
  plateGeo.rotateX(-Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({
    color: 0xf2f5ff, emissive: color, emissiveIntensity: 0.35,
    roughness: 0.28, metalness: 0.15, envMap: env, envMapIntensity: 0.9,
  }));
  plate.position.y = 0.2;
  plate.castShadow = true; plate.receiveShadow = true;
  grp.add(plate);

  // --- 板面上的發光燈條（沿斜邊，命中時會亮） ---
  const lampGeo = new THREE.BoxGeometry(len * 0.82, 0.02, 0.09);
  const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending,
  }));
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
  // 燈條往三角形內側縮一點，才不會蓋住橡皮筋
  const inx = (c.x - mx), inz = (c.z - mz);
  const inLen = Math.hypot(inx, inz) || 1;
  lamp.position.set(mx + inx / inLen * 0.16, 0.215, mz + inz / inLen * 0.16);
  lamp.rotation.y = -Math.atan2(dz, dx);
  grp.add(lamp);

  // --- 斜邊橡皮筋（架在兩根柱之間，略高於板面） ---
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, len, 10),
    MAT.rubber(0xe8394f)
  );
  band.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, 0, dz).normalize()
  );
  band.position.set(mx, 0.3, mz);
  band.castShadow = true;
  grp.add(band);

  // --- 三個角的金屬柱（斜邊兩端的柱子撐住橡皮筋） ---
  for (const [p, tall] of [[a, true], [b, true], [c, false]]) {
    const h = tall ? 0.46 : 0.3;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, h, 12), MAT.chrome(env));
    post.position.set(p.x, h / 2 + 0.02, p.z);
    post.castShadow = true;
    grp.add(post);
    if (tall) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12), MAT.rubber(0xe8394f));
      cap.position.set(p.x, h + 0.05, p.z);
      grp.add(cap);
    } else {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8), MAT.chrome(env));
      screw.position.set(p.x, h + 0.04, p.z);
      grp.add(screw);
    }
  }

  grp.userData = { band, plate, lamp };
  return grp;
}

// ---------- 零件：Flipper（塑膠本體 + 橡膠面 + 金屬軸） ----------
export function buildFlipper(len, r, color, env) {
  const grp = new THREE.Group();
  const bodyGeo = new THREE.CapsuleGeometry(r, len, 8, 18);
  bodyGeo.rotateZ(Math.PI / 2);
  bodyGeo.translate(len / 2, 0, 0);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.35, roughness: 0.28, metalness: 0.2,
    envMap: env, envMapIntensity: 0.8,
  }));
  body.position.y = r + 0.05;
  // 上緣橡膠條（白）
  const rubGeo = new THREE.CapsuleGeometry(r * 0.42, len * 0.94, 6, 12);
  rubGeo.rotateZ(Math.PI / 2);
  rubGeo.translate(len / 2, 0, 0);
  const rubber = new THREE.Mesh(rubGeo, MAT.rubber(0xf2f5ff));
  rubber.position.set(0, r + 0.05, -r * 0.72);
  // 樞軸
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.34, 12), MAT.chrome(env));
  pivot.position.y = r + 0.12;
  grp.add(body, rubber, pivot);
  grp.userData = { body, rubber };
  return grp;
}

// ---------- 零件：鋼絲導軌（沿路徑的圓管） ----------
export function buildWireGuide(points, env, y = 0.42, radius = 0.045) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, y, p.z)));
  const geo = new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), radius, 8, false);
  return new THREE.Mesh(geo, MAT.chrome(env));
}

// ---------- 零件：Rollover 觸點（檯面上的圓形燈，球滾過會亮） ----------
export function buildRollover(color = 0x35d6ff) {
  const grp = new THREE.Group();
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.035, 20),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.5,
      roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9,
    })
  );
  lens.position.y = 0.018;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.022, 8, 22),
    new THREE.MeshStandardMaterial({ color: 0xcfd8ee, roughness: 0.3, metalness: 0.9 })
  );
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.03;
  // 中央金屬線（真實台的 rollover wire）
  const wire = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.018, 6, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xdfe6f5, roughness: 0.2, metalness: 1 })
  );
  wire.position.y = 0.05;
  grp.add(lens, rim, wire);
  grp.userData = { lens };
  return grp;
}

// ---------- 零件：Lane 字母燈（頂部滾道，會亮起字母） ----------
export function buildLaneLight(letter, color = 0xffd75e) {
  const grp = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const draw = (on) => {
    g.clearRect(0, 0, 128, 128);
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fillStyle = on ? 'rgba(255,225,140,.95)' : 'rgba(30,40,80,.85)';
    g.fill();
    g.lineWidth = 6; g.strokeStyle = on ? '#fff6d0' : 'rgba(150,180,255,.45)';
    g.stroke();
    g.font = '900 74px "Arial Black",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = on ? '#5a3a00' : 'rgba(160,190,255,.55)';
    g.fillText(letter, 64, 68);
  };
  draw(false);
  const tex = new THREE.CanvasTexture(c);
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  const wire = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.02, 6, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xdfe6f5, roughness: 0.2, metalness: 1 })
  );
  wire.position.y = 0.05;
  grp.add(disc, wire);
  grp.userData = { setOn: (on) => { draw(on); tex.needsUpdate = true; } };
  return grp;
}

// ---------- 零件：Spinner（旋轉片，球穿過會轉） ----------
export function buildSpinner(env) {
  const grp = new THREE.Group();
  // 支架
  for (const sx of [-0.3, 0.3]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8), MAT.chrome(env));
    post.position.set(sx, 0.25, 0);
    grp.add(post);
  }
  // 旋轉葉片
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#16204e'; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#ffd75e'; g.lineWidth = 5; g.strokeRect(3, 3, 122, 58);
  g.fillStyle = '#ffd75e';
  g.font = '900 30px "Arial Black",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SPIN', 64, 34);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.34, 0.02),
    new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(c), roughness: 0.35, metalness: 0.6,
      envMap: env, envMapIntensity: 0.8, side: THREE.DoubleSide,
    })
  );
  blade.position.y = 0.3;
  grp.add(blade);
  grp.userData = { blade };
  return grp;
}

// ---------- 零件：Saucer 吸球洞（凹槽 + 燈環） ----------
export function buildSaucer(color = 0xc77dff, env) {
  const grp = new THREE.Group();
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.24, 0.14, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: 0.9, metalness: 0, side: THREE.DoubleSide })
  );
  hole.position.y = -0.07;
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 22),
    new THREE.MeshStandardMaterial({ color: 0x0a0e22, roughness: 0.8 })
  );
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -0.14;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.05, 10, 26),
    new THREE.MeshStandardMaterial({ color: 0xcfd8ee, roughness: 0.25, metalness: 0.95, envMap: env })
  );
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.01;
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.03, 8, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
  );
  glow.rotation.x = Math.PI / 2; glow.position.y = 0.015;
  grp.add(hole, bottom, rim, glow);
  grp.userData = { glow };
  return grp;
}

// ---------- 零件：檯面燈泡（大量使用，共用幾何與材質以省效能） ----------
const BULB_GEO = new THREE.SphereGeometry(0.085, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
export function buildBulb(color) {
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.35,
    roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.92,
  });
  const m = new THREE.Mesh(BULB_GEO, mat);
  m.position.y = 0.012;
  return m;
}

// ---------- 零件：中央燈環的圓盤 target ----------
export function buildRingCore(color, env) {
  const grp = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.5, 0.16, 26),
    new THREE.MeshStandardMaterial({
      color: 0x0d2a4a, emissive: color, emissiveIntensity: 0.7,
      roughness: 0.25, metalness: 0.6, envMap: env, envMapIntensity: 1,
    })
  );
  disc.position.y = 0.08;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 18, 14),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  core.position.y = 0.2;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.035, 8, 30),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  halo.rotation.x = Math.PI / 2; halo.position.y = 0.02;
  grp.add(disc, core, halo);
  grp.userData = { disc, core, halo };
  return grp;
}

// ---------- 零件：抬高平台（左側任務區） ----------
export function buildPlatform(pts, height, color, env) {
  const grp = new THREE.Group();
  const shape = new THREE.Shape();
  pts.forEach((p, i) => (i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.15,
    roughness: 0.4, metalness: 0.45, envMap: env, envMapIntensity: 0.9,
  }));
  top.position.y = height;
  top.receiveShadow = true; top.castShadow = true;
  grp.add(top);
  // 邊緣發光描邊（沿輪廓的細管），讓平台不會是一塊死板色塊
  const loop = [...pts, pts[0]].map(p => new THREE.Vector3(p[0], height + 0.012, p[1]));
  const edge = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 60, 0.028, 6, true),
    new THREE.MeshBasicMaterial({ color: 0xd9a6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  grp.add(edge);
  // 表面斜紋（像 Space Cadet 平台上的條紋印刷）
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(230,200,255,.5)'; g.lineWidth = 7;
  for (let i = -128; i < 256; i += 26) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke();
  }
  const stripeTex = new THREE.CanvasTexture(c);
  stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
  stripeTex.repeat.set(2.5, 2.5);
  const inner = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ map: stripeTex, transparent: true, opacity: 0.28 })
  );
  inner.geometry.rotateX(-Math.PI / 2);
  inner.position.y = height + 0.008;
  grp.add(inner);
  return grp;
}

// ---------- 零件：橡膠障礙柱 ----------
export function buildPost(color = 0xf24a6a, env) {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.52, 10), MAT.chrome(env));
  core.position.y = 0.26;
  const rubber = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.24, 16), MAT.rubber(color));
  rubber.position.y = 0.24;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.chrome(env));
  cap.position.y = 0.53;
  grp.add(core, rubber, cap);
  return grp;
}

// ---------- 零件：高架軌道（底板 + 兩側護欄 + 支柱 + 入口指示） ----------
export function buildRamp(path, color, env) {
  const grp = new THREE.Group();
  const pts = path.map(p => new THREE.Vector3(p.x, p.y + 0.16, p.z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const DIV = 120;

  // 軌道底板：沿曲線鋪一條帶狀面
  const width = 0.34;
  const pos = [], idx = [], uvs = [];
  for (let i = 0; i <= DIV; i++) {
    const t = i / DIV;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    pos.push(p.x + side.x * width, p.y, p.z + side.z * width);
    pos.push(p.x - side.x * width, p.y, p.z - side.z * width);
    uvs.push(0, t * 12, 1, t * 12);
    if (i < DIV) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // 半透明壓克力軌道面（真實彈珠台的 ramp 多是透明塑膠）
  const c = document.createElement('canvas');
  c.width = 32; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(0, 0, 32, 64);
  g.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 64; i += 16) g.fillRect(0, i, 32, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const floor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex, color, transparent: true, opacity: 0.5,
    roughness: 0.18, metalness: 0.35, side: THREE.DoubleSide,
    envMap: env, envMapIntensity: 1.1, emissive: color, emissiveIntensity: 0.25,
  }));
  floor.renderOrder = 3;
  grp.add(floor);

  // 兩側壓克力側牆（真實 ramp 是有高牆的凹槽，球被夾在裡面跑）
  const WALL_H = 0.19;
  for (const s of [1, -1]) {
    const wpos = [], widx = [], wuv = [];
    for (let i = 0; i <= DIV; i++) {
      const t = i / DIV;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const bx = p.x + side.x * width * s, bz = p.z + side.z * width * s;
      wpos.push(bx, p.y, bz);              // 牆底
      wpos.push(bx, p.y + WALL_H, bz);     // 牆頂
      wuv.push(t * 10, 0, t * 10, 1);
      if (i < DIV) {
        const a = i * 2;
        widx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const wgeo = new THREE.BufferGeometry();
    wgeo.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
    wgeo.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2));
    wgeo.setIndex(widx);
    wgeo.computeVertexNormals();
    const wall = new THREE.Mesh(wgeo, new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity: 0.3, roughness: 0.06, metalness: 0,
      transmission: 0.6, thickness: 0.2, side: THREE.DoubleSide,
      envMap: env, envMapIntensity: 1.4, emissive: color, emissiveIntensity: 0.2,
    }));
    wall.renderOrder = 4;
    grp.add(wall);

    // 牆頂的金屬收邊條
    const rail = [];
    for (let i = 0; i <= DIV; i++) {
      const t = i / DIV;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      rail.push(new THREE.Vector3(p.x + side.x * width * s, p.y + WALL_H, p.z + side.z * width * s));
    }
    const rm = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), DIV, 0.028, 6, false),
      MAT.chrome(env)
    );
    rm.castShadow = true;
    grp.add(rm);
  }

  // 支柱（每隔一段撐到檯面）
  for (let i = 1; i < path.length - 1; i += 2) {
    const p = path[i];
    if (p.y < 0.2) continue;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, p.y + 0.16, 6),
      MAT.chrome(env)
    );
    strut.position.set(p.x, (p.y + 0.16) / 2, p.z);
    grp.add(strut);
  }

  // 入口的金屬導板（真實 ramp 入口都有一片墊高的鋼片，球從這裡衝上軌道）
  const e0 = path[0], e1 = path[1];
  const ang = Math.atan2(e1.x - e0.x, e1.z - e0.z);
  const flap = new THREE.Mesh(
    new THREE.BoxGeometry(width * 2.1, 0.03, 0.5),
    MAT.chrome(env)
  );
  flap.position.set(e0.x, 0.07, e0.z);
  flap.rotation.y = ang;
  flap.rotation.x = 0.16;   // 微微翹起形成斜坡
  flap.castShadow = true;
  grp.add(flap);
  // 導板兩側的護角
  for (const s of [1, -1]) {
    const side = new THREE.Vector3(Math.cos(ang) * s, 0, -Math.sin(ang) * s);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.5), MAT.chrome(env));
    guard.position.set(e0.x + side.x * width * 1.05, 0.11, e0.z + side.z * width * 1.05);
    guard.rotation.y = ang;
    grp.add(guard);
  }

  // 入口指示燈箭頭（球要打進這裡）
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.19, 0.42, 4),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  arrow.rotation.set(Math.PI / 2, 0, 0);
  arrow.rotation.y = ang;
  arrow.position.set(e0.x, 0.14, e0.z - 0.35);
  grp.add(arrow);
  grp.userData = { floor, arrow, curve };
  return grp;
}

// ---------- 零件：牆面（含金屬側條與發光內襯） ----------
// opts.low：矮牆樣式（drain 兩側等貼近檯面的分隔牆用，避免高亮長條太搶眼）
export function buildWallSegment(ax, az, bx, bz, color, env, opts = {}) {
  const grp = new THREE.Group();
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  const low = !!opts.low;
  const h = low ? 0.3 : 0.52, t = low ? 0.16 : 0.22;
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(len + t, h, t),
    new THREE.MeshStandardMaterial({
      color: low ? 0x0c1230 : 0x121a44, roughness: low ? 0.6 : 0.4, metalness: low ? 0.3 : 0.6,
      envMap: env, envMapIntensity: low ? 0.35 : 1.0,
    })
  );
  wall.position.y = h / 2;
  // 頂面導條：一般牆用亮金屬，矮牆用暗色收邊免得變成刺眼的白線
  const railTop = new THREE.Mesh(
    new THREE.BoxGeometry(len + t, 0.05, t * 1.05),
    low
      ? new THREE.MeshStandardMaterial({ color: 0x5a6480, roughness: 0.5, metalness: 0.7, envMap: env, envMapIntensity: 0.4 })
      : MAT.chrome(env)
  );
  railTop.position.y = h + 0.02;
  grp.add(railTop);
  // 發光內襯（矮牆的燈條也調弱）
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(len + t, low ? 0.05 : 0.1, t * 0.5),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: low ? 0.35 : 0.8, blending: THREE.AdditiveBlending,
    })
  );
  strip.position.set(0, h * 0.6, -t * 0.5);
  grp.add(wall, strip);
  grp.position.set((ax + bx) / 2, 0, (az + bz) / 2);
  grp.rotation.y = -Math.atan2(dz, dx);
  return grp;
}
