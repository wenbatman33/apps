// ===== 引擎內 UI 框架：全部 UI 以 canvas 紋理 + Three.js 平面渲染，不用任何 DOM =====
// 座標：正交相機，原點在畫面中心，x 右、y 上，單位 = CSS px
import * as THREE from 'three';

const FONT = '"PingFang TC","Microsoft JhengHei",system-ui,sans-serif';
const DPR = 2; // 紋理超採樣倍率

export class UILayer {
  constructor(renderer, canvas) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    this.w = 1; this.h = 1;
    this.pressables = [];
    this.pressed = null;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.camera.left = -w / 2; this.camera.right = w / 2;
    this.camera.top = h / 2; this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
  }

  toUI(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: -(clientY - r.top - r.height / 2) };
  }

  _shown(m) {
    let o = m;
    while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  }

  hitTest(p) {
    for (let i = this.pressables.length - 1; i >= 0; i--) {
      const m = this.pressables[i];
      if (!m.parent || !this._shown(m)) continue;
      const wp = new THREE.Vector3();
      m.getWorldPosition(wp);
      const hw = m.userData.hitW / 2, hh = m.userData.hitH / 2;
      if (p.x >= wp.x - hw && p.x <= wp.x + hw && p.y >= wp.y - hh && p.y <= wp.y + hh) return m;
    }
    return null;
  }

  pointerDown(clientX, clientY) {
    const hit = this.hitTest(this.toUI(clientX, clientY));
    if (hit) {
      this.pressed = hit;
      hit.scale.setScalar(0.94);
      return true;
    }
    return false;
  }

  pointerUp(clientX, clientY) {
    const p = this.pressed;
    if (!p) return false;
    this.pressed = null;
    p.scale.setScalar(1);
    const hit = this.hitTest(this.toUI(clientX, clientY));
    if (hit === p) { p.userData.onTap?.(); return true; }
    return true;
  }
}

// ---- 工具：畫布 → 紋理平面 ----
function planeFromCanvas(c, wCss, hCss, order = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 2;
  tex.colorSpace = THREE.SRGBColorSpace;
  // UI 不參與色調映射，維持設計原色
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wCss, hCss), mat);
  m.renderOrder = order;
  return m;
}

// ---- 文字 ----
// opts: {text,size,weight,color,stroke,strokeW,gradient:[c1,c2],shadow:{color,blur},letter,lineHeight,order,align}
// 注意：three 的貼圖為不可變儲存，canvas 改尺寸後必須重建 texture，否則內容會被擠壓
export function makeText(opts) {
  const o = { size: 16, weight: 700, color: '#fff', lineHeight: 1.4, letter: 0, order: 2, ...opts };
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const GRID = 32;
  const pad = ((o.shadow?.blur ?? 0) + (o.strokeW ?? 0) + 8) * DPR;
  const lineH = o.size * o.lineHeight * DPR;

  const measure = (text) => {
    const lines = String(text).split('\n');
    g.font = `${o.weight} ${o.size * DPR}px ${FONT}`;
    let maxW = 1;
    for (const ln of lines) maxW = Math.max(maxW, g.measureText(ln).width + o.letter * DPR * ln.length);
    return {
      W: Math.ceil((maxW + pad * 2) / GRID) * GRID,
      H: Math.ceil((lineH * lines.length + pad * 2) / GRID) * GRID,
      lines,
    };
  };

  const paint = (lines) => {
    const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    g.font = `${o.weight} ${o.size * DPR}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${o.letter * DPR}px`;
    g.shadowBlur = 0; g.shadowColor = 'transparent';
    if (o.shadow) { g.shadowColor = o.shadow.color; g.shadowBlur = o.shadow.blur * DPR; g.shadowOffsetY = (o.shadow.dy ?? 0) * DPR; }
    let fill = o.color;
    if (o.gradient) {
      const gr = g.createLinearGradient(0, (H - lineH * lines.length) / 2, 0, (H + lineH * lines.length) / 2);
      o.gradient.forEach((col, i) => gr.addColorStop(i / (o.gradient.length - 1), col));
      fill = gr;
    }
    const top = (H - lineH * lines.length) / 2;
    lines.forEach((ln, i) => {
      const y = top + lineH * (i + 0.5);
      if (o.stroke) {
        g.lineWidth = (o.strokeW ?? 3) * DPR; g.strokeStyle = o.stroke; g.lineJoin = 'round';
        g.strokeText(ln, W / 2, y);
      }
      g.fillStyle = fill;
      g.fillText(ln, W / 2, y);
    });
  };

  const first = measure(o.text);
  c.width = first.W; c.height = first.H;
  paint(first.lines);
  const mesh = planeFromCanvas(c, first.W / DPR, first.H / DPR, o.order);

  mesh.userData.setText = (t) => {
    if (t === mesh.userData._last) return;
    mesh.userData._last = t;
    const m = measure(t);
    if (m.W !== c.width || m.H !== c.height) {
      c.width = m.W; c.height = m.H;
      paint(m.lines);
      mesh.material.map.dispose();
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 2;
      tex.colorSpace = THREE.SRGBColorSpace;
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(m.W / DPR, m.H / DPR);
    } else {
      paint(m.lines);
      mesh.material.map.needsUpdate = true;
    }
  };
  mesh.userData._last = o.text;
  return mesh;
}

// ---- 圓角矩形面板 ----
// opts: {w,h,fill,stroke,strokeW,radius,glow:{color,blur},order,topLight}
export function makeRect(opts) {
  const o = { radius: 12, order: 1, ...opts };
  const pad = (o.glow?.blur ?? 0) + 4;
  const c = document.createElement('canvas');
  c.width = (o.w + pad * 2) * DPR; c.height = (o.h + pad * 2) * DPR;
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  if (o.glow) { g.shadowColor = o.glow.color; g.shadowBlur = o.glow.blur; g.shadowOffsetY = o.glow.dy ?? 0; }
  g.beginPath();
  g.roundRect(pad, pad, o.w, o.h, o.radius);
  if (o.fill) {
    if (Array.isArray(o.fill)) {
      const gr = g.createLinearGradient(0, pad, 0, pad + o.h);
      o.fill.forEach((col, i) => gr.addColorStop(i / (o.fill.length - 1), col));
      g.fillStyle = gr;
    } else g.fillStyle = o.fill;
    g.fill();
  }
  g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetY = 0;
  if (o.topLight) {
    // 頂部內光：讓按鈕有立體感
    g.save();
    g.clip();
    const gl = g.createLinearGradient(0, pad, 0, pad + o.h * 0.5);
    gl.addColorStop(0, 'rgba(255,255,255,0.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl;
    g.fillRect(pad, pad, o.w, o.h * 0.5);
    g.restore();
  }
  if (o.stroke) { g.lineWidth = o.strokeW ?? 1.5; g.strokeStyle = o.stroke; g.stroke(); }
  return planeFromCanvas(c, o.w + pad * 2, o.h + pad * 2, o.order);
}

// ---- 按鈕（rect + text 群組，自帶點擊區） ----
export function makeButton(layer, opts) {
  const o = { w: 220, h: 52, size: 19, fill: ['#4f7bff', '#2a49d8'], textColor: '#fff',
    radius: 26, glow: { color: 'rgba(80,120,255,.5)', blur: 14 }, order: 3, ...opts };
  const grp = new THREE.Group();
  const bg = makeRect({ w: o.w, h: o.h, fill: o.fill, stroke: o.stroke, strokeW: 1.5, radius: o.radius, glow: o.glow, order: o.order, topLight: true });
  const label = makeText({ text: o.label, size: o.size, weight: 800, color: o.textColor, letter: 2, order: o.order + 1 });
  grp.add(bg, label);
  grp.userData.hitW = o.w + 16; grp.userData.hitH = o.h + 14;
  grp.userData.onTap = o.onTap;
  grp.userData.label = label;
  grp.userData.bg = bg;
  layer.pressables.push(grp);
  return grp;
}
