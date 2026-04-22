// 3D 9 號球遊戲（俯視斜角）
import * as THREE from "three";
import * as CANNON from "cannon-es";
import {
  TABLE_LEN, TABLE_WID, CUSHION_H, BALL_R, POCKET_R, POCKET_OPENING,
  FRAME_THICK, FRAME_H,
  BALL_MASS, BALL_RESTITUTION, BALL_FRICTION, GROUND_FRICTION,
  CUSHION_RESTITUTION, LINEAR_DAMPING, ANGULAR_DAMPING, MIN_SPEED,
  MAX_SHOT_IMPULSE, AIM_MAX_DRAG_PX,
  BALL_COLORS, STRIPED,
} from "./constants.js";
import { lowestBallOnTable, judgeShot } from "./rules.js";
import { planAIShot } from "./ai.js";
import * as Sfx from "./sound.js";

const HX = TABLE_LEN / 2; // 半長 (x 方向)
const HZ = TABLE_WID / 2; // 半寬 (z 方向)
// 海綿條寬度（對應 canvas 繪製 cushW = pocketR_px * 0.55）
const CUSHION_INSET = POCKET_R * 0.55;

// 袋口座標（桌面 XZ 平面）
function pocketPositions() {
  return [
    { x: -HX, z: -HZ }, { x: 0, z: -HZ - 0.01 }, { x:  HX, z: -HZ },
    { x: -HX, z:  HZ }, { x: 0, z:  HZ + 0.01 }, { x:  HX, z:  HZ },
  ];
}

// 球號 disc 紋理（透明背景 + 白圓 + 黑數字），貼在球頂朝上，避免球面 UV 變形
function makeNumberDisc(number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  // 白底圓
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
  // 數字
  ctx.fillStyle = "#111111";
  ctx.font = `bold ${Math.floor(size * 0.62)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), size / 2, size / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class Game3D {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.mode = opts.mode || "ai";          // 'ai' | 'net' | 'local'
    this.raceTo = opts.raceTo || 9;
    this.difficulty = opts.difficulty || "normal";
    this.playerName = opts.name || "玩家";
    this.net = opts.net || null;
    this.myPlayerNum = this.net ? (this.net.role === "host" ? 1 : 2) : 1;
    this.rng = mulberry32(this.net ? this.net.seed : Math.floor(Math.random() * 1e9));

    this.onHudChange = opts.onHudChange || (() => {});
    this.onMatchEnd = opts.onMatchEnd || (() => {});
    this.onOpponentLeft = opts.onOpponentLeft || (() => {});
    this.onToast = opts.onToast || (() => {});

    this.score = { p1: 0, p2: 0 };
    this.currentPlayer = 1;
    this.ballInHand = false;
    this.shotInProgress = false;
    this.firstHit = null;
    this.pocketedThisShot = [];
    this._applyingRemote = false;
    this._wasMyShot = false;

    this._initThree();
    this._initPhysics();
    this._buildTable();
    this.balls = [];
    this.cue = null;
    this._rack();
    this._buildCueStick();
    this._bindInput();
    this._resize();
    window.addEventListener("resize", () => this._resize());
    this._loop = this._loop.bind(this);
    this._lastT = performance.now();
    requestAnimationFrame(this._loop);

    this._pushHud();
    if (this.mode === "ai" && this.currentPlayer === 2) {
      setTimeout(() => this._runAI(), 600);
    }
  }

  // ---------- Three.js 場景 ----------
  _initThree() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1a12);
    this.scene = scene;

    // 正上方俯視（正交投影，無透視變形）
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
    cam.position.set(0, 5, 0);
    cam.up.set(0, 0, -1);       // 讓 -Z 朝上（桌面長軸水平）
    cam.lookAt(0, 0, 0);
    this.camera = cam;

    // 光
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(-1.5, 3, 1.8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -2;
    dir.shadow.camera.right = 2;
    dir.shadow.camera.top = 2;
    dir.shadow.camera.bottom = -2;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 10;
    scene.add(dir);

    const overhead = new THREE.PointLight(0xffffff, 0.4, 8, 1.2);
    overhead.position.set(0, 2, 0);
    scene.add(overhead);
  }

  // ---------- 物理世界 ----------
  _initPhysics() {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.defaultContactMaterial.friction = 0.1;
    world.broadphase = new CANNON.NaiveBroadphase();
    world.allowSleep = true;

    this.ballMaterial = new CANNON.Material("ball");
    this.feltMaterial = new CANNON.Material("felt");
    this.cushionMaterial = new CANNON.Material("cushion");

    world.addContactMaterial(new CANNON.ContactMaterial(
      this.ballMaterial, this.feltMaterial,
      { friction: GROUND_FRICTION, restitution: 0.05 },
    ));
    world.addContactMaterial(new CANNON.ContactMaterial(
      this.ballMaterial, this.ballMaterial,
      { friction: BALL_FRICTION, restitution: BALL_RESTITUTION },
    ));
    world.addContactMaterial(new CANNON.ContactMaterial(
      this.ballMaterial, this.cushionMaterial,
      { friction: 0.2, restitution: CUSHION_RESTITUTION },
    ));

    // 全域碰撞事件：播放音效（節流避免太吵）
    this._lastClackT = 0;
    this._lastCushionT = 0;
    world.addEventListener("beginContact", (e) => {
      const a = e.bodyA, b = e.bodyB;
      const ma = a.material, mb = b.material;
      if (!ma || !mb) return;
      const now = performance.now();
      // 撞擊強度：以相對速度估算
      const rvx = a.velocity.x - b.velocity.x;
      const rvz = a.velocity.z - b.velocity.z;
      const speed = Math.hypot(rvx, rvz);
      const inten = Math.min(speed / 4, 1);
      if (ma === this.ballMaterial && mb === this.ballMaterial) {
        if (now - this._lastClackT > 25) {
          Sfx.playClack(inten);
          this._lastClackT = now;
        }
      } else if ((ma === this.ballMaterial && mb === this.cushionMaterial)
              || (mb === this.ballMaterial && ma === this.cushionMaterial)) {
        if (now - this._lastCushionT > 40) {
          Sfx.playCushion(inten);
          this._lastCushionT = now;
        }
      }
    });

    // 地面（桌面 felt）
    const ground = new CANNON.Body({
      mass: 0, material: this.feltMaterial,
      shape: new CANNON.Plane(),
    });
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(ground);

    this.world = world;
  }

  // ---------- 桌子 & 枱邊 ----------
  _buildTable() {
    this.pocketPos = pocketPositions();
    const railM = 0.10; // 木框寬
    const planeW = TABLE_LEN + railM * 2;
    const planeH = TABLE_WID + railM * 2;

    // 先放一個過渡用的純色平面，等圖檔載入後再更新材質
    const placeholder = new THREE.CanvasTexture((() => {
      const c = document.createElement("canvas");
      c.width = c.height = 4;
      const cg = c.getContext("2d");
      cg.fillStyle = "#0a5a32"; cg.fillRect(0, 0, 4, 4);
      return c;
    })());
    const tableMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(planeW, planeH),
      new THREE.MeshStandardMaterial({ map: placeholder, roughness: 0.95, metalness: 0.0 })
    );
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.position.y = 0;
    tableMesh.receiveShadow = true;
    this.scene.add(tableMesh);
    this._tableMesh = tableMesh;

    // 非同步載入 hood / table_new 拼圖
    this._composeTableTexture(tableMesh);

    this._buildCushions();
  }

  async _composeTableTexture(tableMesh) {
    const loadImg = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
    let layer1, layer2;
    const v = Date.now();
    try {
      [layer1, layer2] = await Promise.all([
        loadImg(`assets/table/layer_1.png?v=${v}`),
        loadImg(`assets/table/layer_2.png?v=${v}`),
      ]);
    } catch (e) {
      console.warn("桌面貼圖載入失敗，使用預設色", e);
      return;
    }

    // 以 layer 原生尺寸為畫布，避免任何縮放失真
    const cw = layer1.width;
    const ch = layer1.height;
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const g = canvas.getContext("2d");

    // 1) 底層：layer_1（灰階毛氈 + 海綿 + 袋口暗影）
    g.drawImage(layer1, 0, 0);

    // 2) 把灰階毛氈像素上色為綠（避開很暗的袋口/陰影與全白）
    try {
      const img = g.getImageData(0, 0, cw, ch);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], b = d[i + 2], a = d[i + 3];
        if (a === 0) continue;
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        const chroma = mx - mn;
        // 近似灰階 & 非全黑 → 當作毛氈/海綿區域，依亮度上綠
        if (chroma < 18 && mx > 30 && mx < 240) {
          const l = mx / 255;
          const noise = (Math.random() - 0.5) * 14;
          d[i]     = Math.max(0, Math.min(255, 18 * l * 1.2 + noise));
          d[i + 1] = Math.max(0, Math.min(255, 205 * l + noise));
          d[i + 2] = Math.max(0, Math.min(255, 80 * l + noise * 0.6));
        }
      }
      g.putImageData(img, 0, 0);
    } catch (e) {
      console.warn("毛氈上色失敗", e);
    }

    // 3) 疊上 layer_2（木框 + 鉻框）
    g.drawImage(layer2, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    tableMesh.material.map = tex;
    tableMesh.material.needsUpdate = true;
    return;
  }

  _buildTable_LEGACY_UNUSED() {
    const railM = 0.10;
    const canvas = document.createElement("canvas");
    const PX_PER_M = 400;
    const cw = (TABLE_LEN + railM * 2) * PX_PER_M;
    const ch = (TABLE_WID + railM * 2) * PX_PER_M;
    canvas.width = cw; canvas.height = ch;
    const g = canvas.getContext("2d");

    // 木紋底色
    const woodGrad = g.createLinearGradient(0, 0, 0, ch);
    woodGrad.addColorStop(0, "#8b5a2b");
    woodGrad.addColorStop(0.5, "#a77041");
    woodGrad.addColorStop(1, "#8b5a2b");
    g.fillStyle = woodGrad; g.fillRect(0, 0, cw, ch);
    // 木紋細線
    g.strokeStyle = "rgba(60,30,10,0.25)"; g.lineWidth = 1;
    for (let i = 0; i < 120; i++) {
      const y = (i / 120) * ch + Math.sin(i) * 4;
      g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke();
    }

    // 毛氈區（含海綿/導角）像素範圍
    const rail_px = railM * PX_PER_M;
    const fx = rail_px, fy = rail_px;
    const fw = TABLE_LEN * PX_PER_M, fh = TABLE_WID * PX_PER_M;
    // 毛氈底（含海綿）
    g.fillStyle = "#0e7a43";
    g.fillRect(fx, fy, fw, fh);

    // 袋口像素座標（物理中心 -> canvas 中心）
    const cx = cw / 2, cy = ch / 2;
    const pocketsPx = this.pocketPos.map(p => ({
      x: cx + p.x * PX_PER_M, y: cy + p.z * PX_PER_M,
    }));
    const pocketR_px = POCKET_R * PX_PER_M;

    // 袋口導角（木色三角）
    g.fillStyle = "#8b5a2b";
    const drawCornerWedge = (px, py, sx, sy) => {
      // 角袋：從袋口邊切一個正方形缺角進入毛氈
      const wedge = pocketR_px * 1.6;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + sx * wedge, py);
      g.lineTo(px, py + sy * wedge);
      g.closePath(); g.fill();
    };
    const drawMiddleWedge = (px, py, sy) => {
      // 中袋：梯形導角
      const wedge = pocketR_px * 1.4;
      g.beginPath();
      g.moveTo(px - wedge, py);
      g.lineTo(px + wedge, py);
      g.lineTo(px + wedge * 0.55, py + sy * wedge);
      g.lineTo(px - wedge * 0.55, py + sy * wedge);
      g.closePath(); g.fill();
    };
    // 四角
    drawCornerWedge(fx, fy,        +1, +1);
    drawCornerWedge(fx + fw, fy,   -1, +1);
    drawCornerWedge(fx, fy + fh,   +1, -1);
    drawCornerWedge(fx + fw, fy + fh, -1, -1);
    // 中袋（上下）
    drawMiddleWedge(cx, fy, +1);
    drawMiddleWedge(cx, fy + fh, -1);

    // 海綿條（深綠 cushion rail，沿毛氈四邊，末端斜切到袋口）
    const cushW = pocketR_px * 0.55; // 海綿寬度
    const cushInset = pocketR_px * 1.2; // 海綿距離角袋中心
    const cushMidInset = pocketR_px * 1.1; // 海綿距離中袋中心
    g.fillStyle = "#0a6b3a";
    g.strokeStyle = "#063b1e"; g.lineWidth = 2;
    const drawCushion = (pts) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath(); g.fill(); g.stroke();
    };
    // 上邊（兩段，夾中袋）
    drawCushion([
      [fx + cushInset, fy],
      [cx - cushMidInset, fy],
      [cx - cushMidInset, fy + cushW],
      [fx + cushInset + cushW, fy + cushW],
    ]);
    drawCushion([
      [cx + cushMidInset, fy],
      [fx + fw - cushInset, fy],
      [fx + fw - cushInset - cushW, fy + cushW],
      [cx + cushMidInset, fy + cushW],
    ]);
    // 下邊
    drawCushion([
      [fx + cushInset, fy + fh],
      [cx - cushMidInset, fy + fh],
      [cx - cushMidInset, fy + fh - cushW],
      [fx + cushInset + cushW, fy + fh - cushW],
    ]);
    drawCushion([
      [cx + cushMidInset, fy + fh],
      [fx + fw - cushInset, fy + fh],
      [fx + fw - cushInset - cushW, fy + fh - cushW],
      [cx + cushMidInset, fy + fh - cushW],
    ]);
    // 左邊
    drawCushion([
      [fx, fy + cushInset],
      [fx, fy + fh - cushInset],
      [fx + cushW, fy + fh - cushInset - cushW],
      [fx + cushW, fy + cushInset + cushW],
    ]);
    // 右邊
    drawCushion([
      [fx + fw, fy + cushInset],
      [fx + fw, fy + fh - cushInset],
      [fx + fw - cushW, fy + fh - cushInset - cushW],
      [fx + fw - cushW, fy + cushInset + cushW],
    ]);

    // 毛氈漸層（中心較亮）
    const feltGrad = g.createRadialGradient(cx, cy, fh * 0.1, cx, cy, Math.max(fw, fh) * 0.55);
    feltGrad.addColorStop(0, "#1ea45f");
    feltGrad.addColorStop(1, "#0a5a32");
    g.fillStyle = feltGrad;
    // 毛氈主區：海綿條內側
    const feltX = fx + cushW, feltY = fy + cushW;
    const feltW = fw - cushW * 2, feltH = fh - cushW * 2;
    g.fillRect(feltX, feltY, feltW, feltH);

    // 毛氈顆粒雜訊（模擬絨布纖維）
    {
      const img = g.getImageData(feltX, feltY, feltW, feltH);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        // 小幅度隨機擾動亮度，偶爾加亮點模擬纖維
        const n = (Math.random() - 0.5) * 30;
        const hi = Math.random() < 0.015 ? 25 + Math.random() * 20 : 0;
        d[i]     = Math.max(0, Math.min(255, d[i]     + n + hi));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 1.1 + hi));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.8 + hi * 0.6));
      }
      g.putImageData(img, feltX, feltY);
    }

    // 袋口黑洞
    for (const pp of pocketsPx) {
      const r = pocketR_px * 0.95;
      const pg = g.createRadialGradient(pp.x, pp.y, r * 0.2, pp.x, pp.y, r);
      pg.addColorStop(0, "#000"); pg.addColorStop(0.7, "#000"); pg.addColorStop(1, "#1a1a1a");
      g.fillStyle = pg;
      g.beginPath(); g.arc(pp.x, pp.y, r, 0, Math.PI * 2); g.fill();
    }

    // 菱形瞄準點（木框中央線上）
    g.fillStyle = "#e9d28a"; g.strokeStyle = "#6b4a20"; g.lineWidth = 2;
    const dia = (px, py) => {
      g.save(); g.translate(px, py); g.rotate(Math.PI / 4);
      g.fillRect(-5, -5, 10, 10); g.strokeRect(-5, -5, 10, 10);
      g.restore();
    };
    for (let i = 1; i <= 3; i++) {
      if (i === 2) continue;
      const x = fx + fw * i / 4;
      dia(x, rail_px / 2);
      dia(x, ch - rail_px / 2);
    }
    for (let i = 1; i <= 3; i++) {
      if (i === 2) continue;
      const y = fy + fh * i / 4;
      dia(rail_px / 2, y);
      dia(cw - rail_px / 2, y);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const planeW = TABLE_LEN + railM * 2;
    const planeH = TABLE_WID + railM * 2;
    const tableMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(planeW, planeH),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0 })
    );
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.position.y = 0;
    tableMesh.receiveShadow = true;
    this.scene.add(tableMesh);
    this._tableMesh = tableMesh;

    this._buildCushions();
  }

  _applyFrameAdjust() {
    const { sx, sz, ox, oz } = this.frameAdj;
    if (this._frameGroup) {
      this._frameGroup.scale.set(sx, 1, sz);
      this._frameGroup.position.set(ox, 0, oz);
    }
    this._updateAdjPanel();
  }

  _applyPocketAdjust() {
    if (!this._pocketRings) return;
    const { sx, sz, ox, oz, r } = this.pocketAdj;
    this._pocketGroup.scale.set(sx, 1, sz);
    this._pocketGroup.position.set(ox, 0, oz);
    for (const ring of this._pocketRings) {
      ring.scale.set(r, r, 1);
    }
    this._updateAdjPanel();
  }

  _updateAdjPanel() {
    if (!this._adjInfo) return;
    const f = this.frameAdj || { sx:1, sz:1, ox:0, oz:0 };
    const p = this.pocketAdj || { sx:1, sz:1, ox:0, oz:0, r:1 };
    this._adjInfo.textContent =
      `紅框  sx=${f.sx.toFixed(4)}  sz=${f.sz.toFixed(4)}\n` +
      `      ox=${f.ox.toFixed(4)}  oz=${f.oz.toFixed(4)}\n` +
      `黃圈  sx=${p.sx.toFixed(4)}  sz=${p.sz.toFixed(4)}\n` +
      `      ox=${p.ox.toFixed(4)}  oz=${p.oz.toFixed(4)}  r=${p.r.toFixed(3)}`;
  }

  _setupAdjPanel() {
    const el = document.createElement("div");
    el.id = "tableAdjPanel";
    Object.assign(el.style, {
      position: "fixed", right: "10px", top: "60px", zIndex: 99999,
      background: "rgba(0,0,0,0.9)", color: "#fff", padding: "10px 14px",
      font: "13px/1.5 monospace", borderRadius: "8px",
      border: "2px solid #ff0044", userSelect: "none",
    });
    document.body.appendChild(el);
    this._adjPanel = el;

    const info = document.createElement("pre");
    info.style.margin = "0 0 8px 0";
    el.appendChild(info);
    this._adjInfo = info;

    const mkBtn = (label, onClick) => {
      const b = document.createElement("button");
      b.textContent = label;
      Object.assign(b.style, {
        margin: "2px", padding: "4px 8px", font: "12px monospace",
        cursor: "pointer", background: "#222", color: "#fff",
        border: "1px solid #666", borderRadius: "4px", minWidth: "32px",
      });
      b.addEventListener("click", (e) => { e.preventDefault(); onClick(); });
      return b;
    };

    const bump = (target, field, delta) => {
      const obj = target === "frame" ? this.frameAdj : this.pocketAdj;
      obj[field] += delta;
      if (target === "frame") this._applyFrameAdjust(); else this._applyPocketAdjust();
    };
    const row = (label, target, field, stepVal) => {
      const div = document.createElement("div");
      div.style.margin = "2px 0";
      div.appendChild(document.createTextNode(label + " "));
      div.appendChild(mkBtn("-", () => bump(target, field, -stepVal)));
      div.appendChild(mkBtn("+", () => bump(target, field,  stepVal)));
      return div;
    };

    const frameLabel = document.createElement("div");
    frameLabel.textContent = "── 紅框（毛氈邊界）──";
    frameLabel.style.marginTop = "4px";
    el.appendChild(frameLabel);
    el.appendChild(row("sx  ", "frame", "sx", 0.002));
    el.appendChild(row("sz  ", "frame", "sz", 0.002));
    el.appendChild(row("ox  ", "frame", "ox", 0.005));
    el.appendChild(row("oz  ", "frame", "oz", 0.005));

    const pocketLabel = document.createElement("div");
    pocketLabel.textContent = "── 黃圈（袋口）──";
    pocketLabel.style.marginTop = "4px";
    el.appendChild(pocketLabel);
    el.appendChild(row("sx  ", "pocket", "sx", 0.002));
    el.appendChild(row("sz  ", "pocket", "sz", 0.002));
    el.appendChild(row("ox  ", "pocket", "ox", 0.005));
    el.appendChild(row("oz  ", "pocket", "oz", 0.005));
    el.appendChild(row("r   ", "pocket", "r",  0.02));

    const actions = document.createElement("div");
    actions.style.marginTop = "6px";
    const saveBtn = mkBtn("存檔", () => {
      localStorage.setItem("frameAdj",  JSON.stringify(this.frameAdj));
      localStorage.setItem("pocketAdj", JSON.stringify(this.pocketAdj));
      saveBtn.textContent = "已存 ✓";
      setTimeout(() => { saveBtn.textContent = "存檔"; }, 1500);
    });
    actions.appendChild(saveBtn);
    actions.appendChild(mkBtn("重設", () => {
      this.frameAdj.sx = 1; this.frameAdj.sz = 1;
      this.frameAdj.ox = 0; this.frameAdj.oz = 0;
      this.pocketAdj.sx = 1; this.pocketAdj.sz = 1;
      this.pocketAdj.ox = 0; this.pocketAdj.oz = 0; this.pocketAdj.r = 1;
      this._applyFrameAdjust(); this._applyPocketAdjust();
    }));
    el.appendChild(actions);
  }

  _buildCushions() {
    const gap = POCKET_OPENING;      // 中袋開口
    const cgap = POCKET_OPENING * 0.9; // 角袋開口
    const h = CUSHION_H;
    const thick = 0.03;              // 枱邊厚度（向桌心延伸）
    // 海綿條寬度（必須對應 canvas 中 cushW = pocketR_px * 0.55）
    const CUSHION_INSET = POCKET_R * 0.55;
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x095a2e, roughness: 0.9,
    });

    // 幫手：建立一段 cushion（沿 X 軸長，放在 y=h/2，Z 位置 z0）
    const addXCushion = (x1, x2, z0, facingOut /* +1 外 / -1 內 */) => {
      const len = x2 - x1;
      if (len <= 0) return;
      const cx = (x1 + x2) / 2;
      // 向桌心內縮 CUSHION_INSET，讓反彈點對齊海綿條內緣
      const zPos = z0 + facingOut * (thick / 2 - CUSHION_INSET);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(len, h, thick), cushionMat
      );
      mesh.position.set(cx, h / 2, zPos);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.visible = false; // 視覺由 canvas 貼圖提供
      this.scene.add(mesh);
      const body = new CANNON.Body({
        mass: 0, material: this.cushionMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(len / 2, h / 2, thick / 2)),
      });
      body.position.set(cx, h / 2, zPos);
      this.world.addBody(body);
    };
    const addZCushion = (z1, z2, x0, facingOut) => {
      const len = z2 - z1;
      if (len <= 0) return;
      const cz = (z1 + z2) / 2;
      const xPos = x0 + facingOut * (thick / 2 - CUSHION_INSET);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(thick, h, len), cushionMat
      );
      mesh.position.set(xPos, h / 2, cz);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.visible = false; // 視覺由 canvas 貼圖提供
      this.scene.add(mesh);
      const body = new CANNON.Body({
        mass: 0, material: this.cushionMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(thick / 2, h / 2, len / 2)),
      });
      body.position.set(xPos, h / 2, cz);
      this.world.addBody(body);
    };

    // 上下邊 (z = ±HZ)，被中袋切兩段，兩端保留到角袋邊
    addXCushion(-HX + cgap,  -gap, -HZ, -1);
    addXCushion( gap, HX - cgap, -HZ, -1);
    addXCushion(-HX + cgap,  -gap,  HZ,  1);
    addXCushion( gap, HX - cgap,  HZ,  1);
    // 左右邊 (x = ±HX)，保留角袋缺口
    addZCushion(-HZ + cgap, HZ - cgap, -HX, -1);
    addZCushion(-HZ + cgap, HZ - cgap,  HX,  1);

    // 外層安全牆（隱形、貼在毛氈邊緣木紋內側）
    // cushion 內縮後袋口外木紋區會讓球逃出，這層牆擋住非袋口位置
    const outerThick = 0.02;
    const pGap = POCKET_R * 1.1; // 袋口缺口半寬
    const addOuterX = (x1, x2, z0, facingOut) => {
      if (x2 - x1 <= 0) return;
      const len = x2 - x1;
      const cx = (x1 + x2) / 2;
      const zPos = z0 + facingOut * outerThick / 2;
      const body = new CANNON.Body({
        mass: 0, material: this.cushionMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(len / 2, h / 2, outerThick / 2)),
      });
      body.position.set(cx, h / 2, zPos);
      this.world.addBody(body);
    };
    const addOuterZ = (z1, z2, x0, facingOut) => {
      if (z2 - z1 <= 0) return;
      const len = z2 - z1;
      const cz = (z1 + z2) / 2;
      const xPos = x0 + facingOut * outerThick / 2;
      const body = new CANNON.Body({
        mass: 0, material: this.cushionMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(outerThick / 2, h / 2, len / 2)),
      });
      body.position.set(xPos, h / 2, cz);
      this.world.addBody(body);
    };
    // 上下邊：左-中袋、中-右段（角袋、中袋各留缺口）
    addOuterX(-HX + pGap, -pGap, -HZ, -1);
    addOuterX( pGap, HX - pGap, -HZ, -1);
    addOuterX(-HX + pGap, -pGap,  HZ,  1);
    addOuterX( pGap, HX - pGap,  HZ,  1);
    // 左右邊：兩個角袋之間
    addOuterZ(-HZ + pGap, HZ - pGap, -HX, -1);
    addOuterZ(-HZ + pGap, HZ - pGap,  HX,  1);
  }

  // ---------- 球 ----------
  _createBall(number, x, z) {
    const isCue = number === 0;
    let mat;
    if (isCue) {
      mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1 });
    } else {
      const tex = new THREE.TextureLoader().load(`./assets/${number}ball.png`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.1 });
    }
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set(x, BALL_R, z);
    this.scene.add(mesh);
    const disc = null; // 改用球面貼圖，會跟隨球體旋轉

    const body = new CANNON.Body({
      mass: BALL_MASS, material: this.ballMaterial,
      shape: new CANNON.Sphere(BALL_R),
      linearDamping: LINEAR_DAMPING, angularDamping: ANGULAR_DAMPING,
      allowSleep: true,
    });
    body.position.set(x, BALL_R, z);
    // 非白球給個隨機初始朝向，避免所有號碼都正面朝上
    if (!isCue) {
      const q = new CANNON.Quaternion();
      q.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        "XYZ",
      );
      body.quaternion.copy(q);
    }
    body.sleepSpeedLimit = 0.05;
    body.sleepTimeLimit = 0.3;
    this.world.addBody(body);

    const ball = {
      number, isCue, mesh, body, disc, pocketed: false,
      get pos() { return { x: this.body.position.x, z: this.body.position.z }; },
    };
    return ball;
  }

  _buildCueStick() {
    // 球竿沿本地 +Y 軸，從 tip(local y=0) → butt(local y=len) 平滑逐漸加粗
    // 半徑設計：tip 0.005 → shaft 末端 0.009 → butt 末端 0.015（相較球半徑 0.029 約 1/3）
    const len = 1.25;
    const group = new THREE.Group();

    const woodLight = new THREE.MeshStandardMaterial({ color: 0xd9a86b, roughness: 0.45 });
    const woodDark  = new THREE.MeshStandardMaterial({ color: 0x4a2312, roughness: 0.55 });
    const white     = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
    const black     = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const blue      = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9 });

    // 分段累積長度（由 tip 端往 butt 端堆疊）。
    // addSeg(rTipSide, rButtSide, ...)：指定本段 tip 端與 butt 端的半徑。
    // CylinderGeometry(radiusTop, radiusBottom) 中 top=+Y=butt 方向，bottom=-Y=tip 方向。
    let y = 0;
    const addSeg = (rTipSide, rButtSide, h, mat) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rButtSide, rTipSide, h, 20), mat);
      m.position.y = y + h / 2;
      group.add(m);
      y += h;
    };

    const rTip = 0.006;
    const rJoint = 0.011;
    const rEnd = 0.016;

    // 1) 皮頭（藍皮）
    addSeg(rTip, rTip, 0.01, blue);
    // 2) 白箍
    addSeg(rTip, rTip, 0.004, white);
    // 3) 前桿（淺木）：tip 細 → 接合處粗
    addSeg(rTip, rJoint, len * 0.60, woodLight);
    // 4) 裝飾環（白黑白，同徑）
    addSeg(rJoint, rJoint, 0.004, white);
    addSeg(rJoint, rJoint, 0.004, black);
    addSeg(rJoint, rJoint, 0.004, white);
    // 5) 後桿（深木）：接合處 → 尾端，繼續加粗
    const tailLen = len - y - 0.008;
    addSeg(rJoint, rEnd, tailLen, woodDark);
    // 6) 橡膠尾
    addSeg(rEnd, rEnd * 0.9, 0.008, black);

    group.traverse(m => { if (m.isMesh) m.castShadow = true; });
    group.visible = false;
    this.scene.add(group);
    this.cueStick = group;
    this._cueStickLen = len;
  }

  _placeCueStickAt(cx, cz, ux, uz, pull) {
    const tipX = cx - ux * (BALL_R + pull);
    const tipZ = cz - uz * (BALL_R + pull);
    const buttDir = new THREE.Vector3(-ux, 0, -uz).normalize();
    this.cueStick.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), buttDir
    );
    this.cueStick.position.set(tipX, CUSHION_H + BALL_R * 1.2, tipZ);
    this.cueStick.visible = true;
  }

  _updateCueStick() {
    if (!this.aim || !this.cueStick) { if (this.cueStick) this.cueStick.visible = false; return; }
    const cp = this.cue.body.position;
    // 方向＝拖曳反向（start → cur 的反向）
    const dx = this.aim.startX - this.aim.curX;
    const dz = this.aim.startZ - this.aim.curZ;
    const len = Math.hypot(dx, dz);
    if (len < 0.02) { this.cueStick.visible = false; return; }
    const ux = dx / len, uz = dz / len;
    const f = Math.min(len / 0.6, 1);
    const pull = 0.03 + f * 0.2;
    this._placeCueStickAt(cp.x, cp.z, ux, uz, pull);
  }

  _rack() {
    // 清除舊球
    for (const b of this.balls) {
      this.scene.remove(b.mesh);
      this.world.removeBody(b.body);
    }
    this.balls = [];

    // 腳點（rack 前端 = 1 號球位置）：在 x = +HX/2 附近
    const footX = HX * 0.5;
    const footZ = 0;
    const d = BALL_R * 2 + 0.001;
    const dx = d * Math.cos(Math.PI / 6);

    const fillers = [2, 3, 4, 5, 6, 7, 8];
    for (let i = fillers.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [fillers[i], fillers[j]] = [fillers[j], fillers[i]];
    }
    const rows = [[null], [null, null], [null, 9, null], [null, null], [null]];
    rows[0][0] = 1;
    const flat = rows.flat();
    for (let i = 0; i < flat.length; i++) if (flat[i] == null) flat[i] = fillers.shift();

    const coords = [];
    for (let c = 0; c < 5; c++) {
      const count = rows[c].length;
      for (let r = 0; r < count; r++) {
        const offZ = (r - (count - 1) / 2) * d;
        coords.push({ x: footX + c * dx, z: footZ + offZ });
      }
    }
    for (let i = 0; i < flat.length; i++) {
      this.balls.push(this._createBall(flat[i], coords[i].x, coords[i].z));
    }
    // 白球（頭區）
    this.cue = this._createBall(0, -HX * 0.5, 0);
    this.balls.push(this.cue);
  }

  // ---------- 輸入 ----------
  _bindInput() {
    this._pointer = new THREE.Vector2();
    this._raycaster = new THREE.Raycaster();
    this._tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.aim = null;
    this.aimLine = null;

    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => this._down(e));
    c.addEventListener("pointermove", (e) => this._move(e));
    c.addEventListener("pointerup",   (e) => this._up(e));
    c.addEventListener("pointercancel", (e) => this._up(e));
  }

  _toWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this._pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointer, this.camera);
    const hit = new THREE.Vector3();
    this._raycaster.ray.intersectPlane(this._tablePlane, hit);
    return hit;
  }

  _canAim() {
    if (this.shotInProgress) return false;
    if (this.mode === "ai" && this.currentPlayer === 2) return false;
    if (this.mode === "net" && this.currentPlayer !== this.myPlayerNum) return false;
    return true;
  }

  _down(e) {
    Sfx.unlock();
    if (!this._canAim()) return;
    const w = this._toWorld(e);
    if (!w) return;
    const cuePos = this.cue.body.position;

    if (this.ballInHand) {
      // 放置白球（需要在桌面內且不重疊）
      if (this._inPlay(w.x, w.z) && !this._overlaps(w.x, w.z)) {
        this._placeCue(w.x, w.z);
        this.ballInHand = false;
        this._pushHud();
        // 網路：廣播白球位置
        if (this.mode === "net") this._netSendPlace(w.x, w.z);
        return;
      }
    }

    // 從畫面任何位置開始拖都可以，使用拖曳位移量計算方向與力度
    this.aim = { startX: w.x, startZ: w.z, curX: w.x, curZ: w.z };
  }

  _move(e) {
    if (!this.aim) return;
    const w = this._toWorld(e);
    this.aim.curX = w.x; this.aim.curZ = w.z;
    this._drawAim();
  }

  _up(e) {
    if (!this.aim) return;
    // 方向＝拖曳反向（start → cur 的反向），力度＝拖曳世界距離
    const dx = this.aim.startX - this.aim.curX;
    const dz = this.aim.startZ - this.aim.curZ;
    const len = Math.hypot(dx, dz);
    this._clearAim();
    this.aim = null;
    if (len < 0.03) return; // 拖太短
    const ux = dx / len, uz = dz / len;
    const f = Math.min(len / 0.6, 1);
    const imp = MAX_SHOT_IMPULSE * f;
    this._shoot(ux * imp, uz * imp);
  }

  _drawAim() {
    this._clearAim();
    if (!this.aim) return;
    const cp = this.cue.body.position;
    // 方向＝拖曳反向（瞄準線永遠從白球出發）
    const dx = this.aim.startX - this.aim.curX;
    const dz = this.aim.startZ - this.aim.curZ;
    const len = Math.hypot(dx, dz);
    if (len < 0.02) return;
    const ux = dx / len, uz = dz / len;

    // 模擬白球軌跡含反射與碰球預測
    const traj = this._predictTrajectory(cp.x, cp.z, ux, uz);
    this.aimLines = [];
    const y = 0.012;

    // 以虛線段繪製每一段軌跡
    for (let i = 0; i < traj.segments.length; i++) {
      const seg = traj.segments[i];
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(seg.x1, y, seg.z1),
        new THREE.Vector3(seg.x2, y, seg.z2),
      ]);
      // 第一段亮白色，反射段稍暗
      const col = i === 0 ? 0xffffff : 0xcccccc;
      const mat = new THREE.LineDashedMaterial({
        color: col, dashSize: 0.035, gapSize: 0.025,
        transparent: true, opacity: i === 0 ? 0.9 : 0.7,
      });
      const line = new THREE.Line(geom, mat);
      line.computeLineDistances();
      this.scene.add(line);
      this.aimLines.push(line);
    }

    // 終點圓圈（ghost 球 / 袋口標記）
    if (traj.end) {
      const ring = this._makeRing(traj.end.x, y, traj.end.z, BALL_R, traj.end.color, traj.end.dashed);
      this.scene.add(ring);
      this.aimLines.push(ring);
    }

    // 力度條（反向，不受反射影響）
    const f = Math.min(len / 0.6, 1);
    const color = f < 0.4 ? 0x1ca85a : f < 0.8 ? 0xf7c300 : 0xd9212e;
    const p2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cp.x, y, cp.z),
      new THREE.Vector3(cp.x - ux * Math.min(len, 0.6), y, cp.z - uz * Math.min(len, 0.6)),
    ]);
    const m2 = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    this.powerLine = new THREE.Line(p2, m2);
    this.scene.add(this.powerLine);

    this._updateCueStick();
  }

  _makeRing(cx, y, cz, radius, color, dashed) {
    const pts = [];
    const N = 36;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.02, gapSize: 0.012, transparent: true, opacity: 0.9 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geom, mat);
    if (dashed) line.computeLineDistances();
    return line;
  }

  // 白球軌跡預測：回傳多段 segments 與終點 end
  _predictTrajectory(x0, z0, ux, uz) {
    const segments = [];
    const innerX = HX - CUSHION_INSET - BALL_R;
    const innerZ = HZ - CUSHION_INSET - BALL_R;
    let x = x0, z = z0, dx = ux, dz = uz;
    let end = null;
    const pockets = this.pocketPos;
    const MAX_BOUNCES = 3;

    const raySphereT = (cx, cz, r) => {
      const ox = x - cx, oz = z - cz;
      const b = 2 * (ox * dx + oz * dz);
      const c = ox * ox + oz * oz - r * r;
      const disc = b * b - 4 * c;
      if (disc < 0) return Infinity;
      const sq = Math.sqrt(disc);
      const t1 = (-b - sq) / 2;
      if (t1 > 1e-4) return t1;
      return Infinity;
    };

    for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
      let minT = Infinity;
      let hit = null;

      // 球（白球以外，已入袋的忽略）
      for (const b of this.balls) {
        if (b.isCue || b.pocketed) continue;
        const t = raySphereT(b.body.position.x, b.body.position.z, BALL_R * 2);
        if (t < minT) { minT = t; hit = { kind: "ball", ball: b }; }
      }
      // 袋口
      for (const p of pockets) {
        const t = raySphereT(p.x, p.z, POCKET_R);
        if (t < minT) { minT = t; hit = { kind: "pocket", p }; }
      }
      // 邊界（內縮後的海綿條內緣）
      const wallCand = [];
      if (dx > 1e-6) wallCand.push({ t: (innerX - x) / dx, axis: "x" });
      if (dx < -1e-6) wallCand.push({ t: (-innerX - x) / dx, axis: "x" });
      if (dz > 1e-6) wallCand.push({ t: (innerZ - z) / dz, axis: "z" });
      if (dz < -1e-6) wallCand.push({ t: (-innerZ - z) / dz, axis: "z" });
      for (const w of wallCand) {
        if (w.t > 1e-4 && w.t < minT) { minT = w.t; hit = { kind: "wall", axis: w.axis }; }
      }

      if (!hit || !isFinite(minT)) break;
      const ex = x + dx * minT, ez = z + dz * minT;
      segments.push({ x1: x, z1: z, x2: ex, z2: ez });

      if (hit.kind === "ball") {
        end = { x: ex, z: ez, color: 0xffffff, dashed: true };
        break;
      }
      if (hit.kind === "pocket") {
        end = { x: hit.p.x, z: hit.p.z, color: 0xff4444, dashed: false };
        break;
      }
      // 反彈
      if (hit.axis === "x") dx = -dx; else dz = -dz;
      x = ex; z = ez;
      if (bounce === MAX_BOUNCES) break;
    }
    return { segments, end };
  }

  _clearAim() {
    if (this.aimLines) {
      for (const l of this.aimLines) {
        this.scene.remove(l);
        if (l.geometry) l.geometry.dispose();
        if (l.material) l.material.dispose();
      }
      this.aimLines = null;
    }
    if (this.powerLine) { this.scene.remove(this.powerLine); this.powerLine.geometry.dispose(); this.powerLine = null; }
    if (this.cueStick) this.cueStick.visible = false;
  }

  // ---------- 擊球 ----------
  _shoot(ix, iz) {
    this.shotInProgress = true;
    this.firstHit = null;
    this.pocketedThisShot = [];
    this.targetAtShot = lowestBallOnTable(this.balls);
    this.cue.body.wakeUp();
    this.cue.body.applyImpulse(
      new CANNON.Vec3(ix, 0, iz),
      new CANNON.Vec3(0, 0, 0)
    );
    const impMag = Math.hypot(ix, iz);
    Sfx.playCueStrike(Math.min(impMag / MAX_SHOT_IMPULSE, 1));
    // 擊球瞬間讓球竿快速推到白球位置再隱藏（視覺回饋）
    if (this.cueStick && this.cueStick.visible) {
      this.cueStick.visible = false;
    }
    if (this.mode === "net" && !this._applyingRemote) {
      this._wasMyShot = true;
      this._netSendShot(ix, iz, this.cue.body.position.x, this.cue.body.position.z);
    } else {
      this._wasMyShot = false;
    }
    this._applyingRemote = false;
    // 監聽第一次撞擊
    if (this._cueCollHandler) this.cue.body.removeEventListener("collide", this._cueCollHandler);
    this._cueCollHandler = (ev) => {
      if (this.firstHit !== null) return;
      // 對方 body 所屬球
      const other = ev.body;
      const b = this.balls.find(x => x.body === other && x.number !== 0);
      if (b) this.firstHit = b.number;
    };
    this.cue.body.addEventListener("collide", this._cueCollHandler);
  }

  _placeCue(x, z) {
    this.cue.body.velocity.set(0, 0, 0);
    this.cue.body.angularVelocity.set(0, 0, 0);
    this.cue.body.position.set(x, BALL_R, z);
    this.cue.body.wakeUp();
  }

  _inPlay(x, z) {
    return Math.abs(x) < HX - BALL_R && Math.abs(z) < HZ - BALL_R;
  }

  _overlaps(x, z) {
    for (const b of this.balls) {
      if (b.pocketed || b === this.cue) continue;
      const dx = x - b.body.position.x, dz = z - b.body.position.z;
      if (dx * dx + dz * dz < (BALL_R * 2.1) ** 2) return true;
    }
    return false;
  }

  // ---------- 進袋偵測 ----------
  _checkPockets() {
    for (const b of this.balls) {
      if (b.pocketed) continue;
      for (const p of this.pocketPos) {
        const dx = b.body.position.x - p.x;
        const dz = b.body.position.z - p.z;
        if (dx * dx + dz * dz < POCKET_R * POCKET_R) {
          this._pocketBall(b);
          break;
        }
      }
    }
  }

  _pocketBall(b) {
    b.pocketed = true;
    this.pocketedThisShot.push(b.number);
    try { this.world.removeBody(b.body); } catch {}
    Sfx.playPocket();
    if (b.disc) b.disc.visible = false;
    // 白球進袋：不做下沉動畫（_resolveShot 會立即復活，避免狀態衝突）
    if (b.isCue) {
      b.mesh.visible = false;
      return;
    }
    // 目標球下沉動畫
    const start = performance.now();
    const startY = b.mesh.position.y;
    const fall = () => {
      if (!b.pocketed) return;
      const t = Math.min((performance.now() - start) / 300, 1);
      b.mesh.position.y = startY - t * 0.15;
      b.mesh.scale.setScalar(1 - t * 0.4);
      if (t < 1) requestAnimationFrame(fall);
      else b.mesh.visible = false;
    };
    fall();
  }

  // ---------- 主循環 ----------
  _loop(t) {
    const dt = Math.min((t - this._lastT) / 1000, 0.05);
    this._lastT = t;
    this.world.step(1 / 60, dt, 3);

    // 同步 mesh
    for (const b of this.balls) {
      if (b.pocketed) continue;
      b.mesh.position.copy(b.body.position);
      b.mesh.quaternion.copy(b.body.quaternion);
      if (b.disc) {
        b.disc.position.set(b.body.position.x, b.body.position.y + BALL_R + 0.0005, b.body.position.z);
      }
    }

    if (this.shotInProgress) {
      this._checkPockets();
      if (this._allStill()) {
        this.shotInProgress = false;
        this._resolveShot();
      }
    }

    this.renderer.render(this.scene, this.camera);
    this._rafId = requestAnimationFrame(this._loop);
  }

  _allStill() {
    for (const b of this.balls) {
      if (b.pocketed) continue;
      const v = b.body.velocity;
      if (Math.hypot(v.x, v.z) > MIN_SPEED) return false;
    }
    return true;
  }

  // ---------- 擊球判定 ----------
  _resolveShot() {
    const cp = this.cue.body.position;
    const cueOff = !this._inPlay(cp.x, cp.z) && !this.cue.pocketed;
    const ctx = {
      firstHit: this.firstHit,
      pocketed: this.pocketedThisShot.slice(),
      cueOffTable: cueOff,
      targetBall: this.targetAtShot,
    };
    const res = judgeShot(ctx);

    // 提示擊球結果
    const who = this.currentPlayer === 1 ? "P1" : (this.mode === "ai" ? "AI" : "P2");
    let msg;
    if (this.firstHit == null) msg = `${who}：空桿（未擊中任何球）`;
    else msg = `${who}：先擊中 ${this.firstHit} 號球`;
    const pots = this.pocketedThisShot.filter(n => n !== 0);
    if (pots.length) msg += `，進袋 ${pots.join("、")} 號`;
    if (this.cue.pocketed || cueOff) msg += "，白球掉袋";
    if (res.foul) msg += "（犯規）";
    this.onToast(msg);

    // 白球進袋 / 掉出桌：重置
    if (this.cue.pocketed || cueOff) {
      if (this.cue.pocketed) {
        this.cue.pocketed = false;
        this.cue.mesh.visible = true;
        this.cue.mesh.scale.setScalar(1);
        this.cue.mesh.position.y = BALL_R;
      }
      // 重建 body
      this._rebuildBody(this.cue, -HX * 0.5, 0);
    }

    // 9 號犯規進袋 → 重新擺 9 號到腳點
    if (res.nineSunkOnFoul) {
      const nine = this.balls.find(b => b.number === 9);
      if (nine) {
        nine.pocketed = false;
        nine.mesh.visible = true;
        nine.mesh.scale.setScalar(1);
        nine.mesh.position.y = BALL_R;
        this._rebuildBody(nine, HX * 0.5, 0);
        this.pocketedThisShot = this.pocketedThisShot.filter(n => n !== 9);
      }
    }

    // 勝一局
    if (res.winGame) {
      if (this.currentPlayer === 1) this.score.p1++;
      else this.score.p2++;
      if (this.score.p1 >= this.raceTo || this.score.p2 >= this.raceTo) {
        this._pushHud();
        Sfx.playWin();
        this.onMatchEnd({ score: this.score, winner: this.score.p1 > this.score.p2 ? 1 : 2 });
        return;
      }
      setTimeout(() => this._newRack(), 900);
      this._pushHud();
      if (this.mode === "net" && this._wasMyShot) this._netSendSnapshot();
      return;
    }

    if (res.foul) {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      this.ballInHand = true;
    } else if (!res.continueTurn) {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }

    this._pushHud();
    if (this.mode === "net" && this._wasMyShot) this._netSendSnapshot();

    if (this.mode === "ai" && this.currentPlayer === 2) {
      setTimeout(() => this._runAI(), 600);
    }
  }

  _rebuildBody(b, x, z) {
    try { this.world.removeBody(b.body); } catch {}
    b.body = new CANNON.Body({
      mass: BALL_MASS, material: this.ballMaterial,
      shape: new CANNON.Sphere(BALL_R),
      linearDamping: LINEAR_DAMPING, angularDamping: ANGULAR_DAMPING,
      allowSleep: true,
    });
    b.body.position.set(x, BALL_R, z);
    b.body.sleepSpeedLimit = 0.05;
    b.body.sleepTimeLimit = 0.3;
    this.world.addBody(b.body);
    b.mesh.position.set(x, BALL_R, z);
  }

  _newRack() {
    this.currentPlayer = this.currentPlayer; // 輸家或贏家先開？簡化：維持現狀（贏家續）
    this.ballInHand = false;
    this.firstHit = null;
    this.pocketedThisShot = [];
    this._rack();
    this._pushHud();
    if (this.mode === "ai" && this.currentPlayer === 2) {
      setTimeout(() => this._runAI(), 600);
    }
  }

  // ---------- AI ----------
  _runAI() {
    if (this.ballInHand) {
      this._placeCue(-HX * 0.5, 0);
      this.ballInHand = false;
    }
    const world = {
      balls: this.balls.map(b => ({
        number: b.number, pocketed: b.pocketed,
        pos: { x: b.body?.position?.x ?? b.mesh.position.x, z: b.body?.position?.z ?? b.mesh.position.z },
      })),
      cue: { pos: { x: this.cue.body.position.x, z: this.cue.body.position.z } },
      pockets: this.pocketPos,
    };
    // 讓 ai.js 內比較目標 ball 物件：以 number 比對
    const plan = planAIShotAdapter(world, this.difficulty);
    if (!plan) {
      this._shoot((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
      return;
    }
    this._shoot(plan.ix, plan.iz);
  }

  // ---------- HUD ----------
  _pushHud() {
    let p1, p2;
    if (this.mode === "net" && this.net) {
      p1 = this.net.role === "host" ? this.net.myName : (this.net.opponentName || "對手");
      p2 = this.net.role === "host" ? (this.net.opponentName || "對手") : this.net.myName;
    } else {
      p1 = this.playerName;
      p2 = this.mode === "ai" ? `AI (${this.difficulty})` : "對手";
    }
    this.onHudChange({
      raceTo: this.raceTo,
      p1, p2,
      score: this.score,
      currentPlayer: this.currentPlayer,
      target: lowestBallOnTable(this.balls),
      ballInHand: this.ballInHand,
    });
  }

  // ---------- 網路 ----------
  setNetHandlers(Net) {
    this._Net = Net;
    Net.__setCallbacks && Net.__setCallbacks({
      onShot: (p) => this._netRecvShot(p),
      onPlaceCue: (p) => this._netRecvPlace(p),
      onState: (p) => this._netRecvState(p),
      onOpponentLeft: () => this.onOpponentLeft(),
    });
  }
  _netSendShot(ix, iz, cx, cz) { this._Net?.sendShot({ ix, iz, cx, cz }); }
  _netSendPlace(x, z) { this._Net?.sendPlaceCue({ x, z }); }
  _netSendSnapshot() {
    if (!this._Net) return;
    const balls = this.balls.map(b => ({
      n: b.number, p: b.pocketed ? 1 : 0,
      x: +b.body?.position.x.toFixed(3) || 0,
      z: +b.body?.position.z.toFixed(3) || 0,
    }));
    this._Net.sendState({
      balls, score: this.score,
      currentPlayer: this.currentPlayer,
      ballInHand: this.ballInHand,
    });
  }
  _netRecvShot(p) {
    if (p.cx !== undefined) this._placeCue(p.cx, p.cz);
    this._applyingRemote = true;
    this._shoot(p.ix, p.iz);
  }
  _netRecvPlace(p) {
    this._placeCue(p.x, p.z);
    this.ballInHand = false;
    this._pushHud();
  }
  _netRecvState(p) {
    if (p.score) this.score = p.score;
    if (p.currentPlayer) this.currentPlayer = p.currentPlayer;
    this.ballInHand = !!p.ballInHand;
    if (Array.isArray(p.balls)) {
      for (const s of p.balls) {
        const b = this.balls.find(x => x.number === s.n);
        if (!b) continue;
        if (s.p) {
          if (!b.pocketed) this._pocketBall(b);
        } else {
          if (b.pocketed) {
            b.pocketed = false;
            b.mesh.visible = true;
            b.mesh.scale.setScalar(1);
            b.mesh.position.y = BALL_R;
            this._rebuildBody(b, s.x, s.z);
          } else {
            this._rebuildBody(b, s.x, s.z);
          }
        }
      }
    }
    this._pushHud();
  }

  // ---------- 響應式 ----------
  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);

    // 目標：桌子 + 一點邊框都看得到，自適應畫面
    const pad = 0.15;
    const needW = TABLE_LEN + pad * 2;
    const needH = TABLE_WID + pad * 2;
    const aspect = w / h;

    let viewW, viewH;
    if (aspect >= needW / needH) {
      // 畫面比桌子寬 → 以高度為準
      viewH = needH;
      viewW = viewH * aspect;
    } else {
      // 畫面比桌子窄（手機直式）→ 以寬度為準
      // 若仍然放不下，旋轉鏡頭讓桌子長邊對齊螢幕長邊
      if (h > w) {
        // 直式：把桌子長軸擺成直的
        this.camera.up.set(-1, 0, 0);
        viewW = needH;
        viewH = viewW / aspect;
        if (viewH < needW) {
          viewH = needW;
          viewW = viewH * aspect;
        }
      } else {
        viewW = needW;
        viewH = viewW / aspect;
      }
    }
    if (w >= h) this.camera.up.set(0, 0, -1);

    this.camera.left   = -viewW / 2;
    this.camera.right  =  viewW / 2;
    this.camera.top    =  viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);
  }

  destroy() {
    cancelAnimationFrame(this._rafId);
    this.renderer.dispose();
    if (this._adjPanel) this._adjPanel.remove();
  }
}

// 轉接器：ai.js 接收 world 物件（純資料）
function planAIShotAdapter(world, diff) {
  return planAIShot(world, diff);
}
