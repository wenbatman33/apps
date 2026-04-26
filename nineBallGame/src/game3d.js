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
const CUSHION_INSET = 0;

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
    this._animating = false; // AI 球桿動畫進行中（不得干擾 _allStill 判定）
    // 兩段式出桿：aim（選方向） → power（拖曳決定力度） → 放開出桿
    this.phase = "aim";       // "aim" | "power"
    this.aimDir = null;       // 鎖定後的方向 { ux, uz }
    this.shotPower = 0;       // 0~1，力度階段累積
    this.powerDrag = null;    // 力度階段拖曳狀態
    this.firstHit = null;
    this.pocketedThisShot = [];
    this._applyingRemote = false;
    this._wasMyShot = false;

    this._initThree();
    this._initPhysics();
    this._initShadowWorld();
    this._buildTable();
    this._buildShadowCushions();
    this.balls = [];
    this.cue = null;
    this._rack();
    this._buildShadowBalls();
    this._buildCueStick();
    this._buildPowerGauge();
    this._bindInput();
    this.spin = { x: 0, y: 0 };
    this._buildSpinWidget();
    this._resize();
    window.addEventListener("resize", () => this._resize());
    // 手機瀏覽器工具列出現/隱藏時 visualViewport 會觸發 resize
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => this._resize());
    }
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
      // 邊緣幾乎無摩擦才能保持入射角＝反射角，吻合預測線
      { friction: 0.02, restitution: CUSHION_RESTITUTION },
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

  // 影子世界：用於瞄準預測，與主世界參數完全一致
  // 每次模擬前同步所有球的狀態，施加與真實擊球相同的 impulse + spin，跑 N 步記錄軌跡
  _initShadowWorld() {
    const sw = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    sw.defaultContactMaterial.friction = 0.1;
    sw.broadphase = new CANNON.NaiveBroadphase();
    sw.allowSleep = false;

    const bMat = new CANNON.Material("shadow-ball");
    const fMat = new CANNON.Material("shadow-felt");
    const cMat = new CANNON.Material("shadow-cushion");
    sw.addContactMaterial(new CANNON.ContactMaterial(bMat, fMat,
      { friction: GROUND_FRICTION, restitution: 0.05 }));
    sw.addContactMaterial(new CANNON.ContactMaterial(bMat, bMat,
      { friction: BALL_FRICTION, restitution: BALL_RESTITUTION }));
    sw.addContactMaterial(new CANNON.ContactMaterial(bMat, cMat,
      { friction: 0.02, restitution: CUSHION_RESTITUTION }));

    const ground = new CANNON.Body({ mass: 0, material: fMat, shape: new CANNON.Plane() });
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    sw.addBody(ground);

    this._shadowWorld = sw;
    this._shadowBallMat = bMat;
    this._shadowCushionMat = cMat;
    this._shadowBalls = null;       // 於 _buildShadowBalls 填入
    this._shadowCushionsBuilt = false;
  }

  // 掃描主世界的 cushion bodies（含內層海綿 + 外層安全牆），複製到影子世界
  _buildShadowCushions() {
    if (!this._shadowWorld || this._shadowCushionsBuilt) return;
    for (const body of this.world.bodies) {
      if (body.material !== this.cushionMaterial) continue;
      for (const shape of body.shapes) {
        if (!(shape instanceof CANNON.Box)) continue;
        const he = shape.halfExtents;
        const nb = new CANNON.Body({
          mass: 0, material: this._shadowCushionMat,
          shape: new CANNON.Box(new CANNON.Vec3(he.x, he.y, he.z)),
        });
        nb.position.copy(body.position);
        nb.quaternion.copy(body.quaternion);
        this._shadowWorld.addBody(nb);
      }
    }
    this._shadowCushionsBuilt = true;
  }

  // 建立 / 重建影子球（每顆真實球配一個影子）
  _buildShadowBalls() {
    if (!this._shadowWorld) return;
    // 清掉舊的
    if (this._shadowBalls) {
      for (const sb of this._shadowBalls) this._shadowWorld.removeBody(sb);
    }
    this._shadowBalls = this.balls.map((rb) => {
      const sb = new CANNON.Body({
        mass: BALL_MASS, material: this._shadowBallMat,
        shape: new CANNON.Sphere(BALL_R),
        linearDamping: LINEAR_DAMPING, angularDamping: ANGULAR_DAMPING,
        allowSleep: false,
      });
      sb.position.copy(rb.body.position);
      this._shadowWorld.addBody(sb);
      return sb;
    });
  }

  // ---------- 桌子 & 枱邊 ----------
  _buildTable() {
    this.pocketPos = pocketPositions();

    // 依據貼圖（assets/table）推算 plane 尺寸，讓 SVG「滾動範圍」對齊物理 TABLE_LEN × TABLE_WID
    // 資產規格：1240×697；滾動區 x=[79,1162]、y=[79.19,624.5]
    const ASSET_W = 1240, ASSET_H = 697;
    const ROLL_L = 79, ROLL_R = 1162, ROLL_T = 79.19, ROLL_B = 624.5;
    const rollWpx = ROLL_R - ROLL_L;  // 1083
    const rollHpx = ROLL_B - ROLL_T;  // 545.31
    const planeW = TABLE_LEN * ASSET_W / rollWpx;   // ≈ 2.908 m
    const planeH = TABLE_WID * ASSET_H / rollHpx;   // ≈ 1.623 m
    // 滾動區中心相對畫布中心的偏移 → 反向平移 plane，使物理中心對到滾動區中心
    const rollCxPx = (ROLL_L + ROLL_R) / 2;
    const rollCyPx = (ROLL_T + ROLL_B) / 2;
    const offX = (rollCxPx - ASSET_W / 2) / ASSET_W * planeW;
    const offZ = (rollCyPx - ASSET_H / 2) / ASSET_H * planeH;

    // 用 SVG 的黃圈圓心 + 半徑 (33 px) 覆寫袋口偵測位置（世界座標）
    const pxToWorldX = (px) => (px - ASSET_W / 2) / ASSET_W * planeW - offX;
    const pxToWorldZ = (py) => (py - ASSET_H / 2) / ASSET_H * planeH - offZ;
    const POCKET_R_PX = 33;
    const pocketRWorld = (POCKET_R_PX / ASSET_W) * planeW; // ≈ 0.0774 m
    const holesPx = [
      [66, 64], [620, 46], [1178, 64],
      [66, 631], [620, 654], [1178, 631],
    ];
    this.pocketPos = holesPx.map(([hx, hy]) => ({
      x: pxToWorldX(hx), z: pxToWorldZ(hy), r: pocketRWorld,
    }));

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
    tableMesh.position.set(-offX, 0, -offZ);
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

    // 4) DEBUG: 加 ?dev=1 才顯示「滾動範圍」與「球洞區域」（驗證對齊用）
    //    （來源：assets/table/滾動區域.svg 與 球洞.svg，原圖 1240×697）
    const DEV = new URLSearchParams(location.search).get("dev") === "1";
    if (DEV) {
    g.save();
    g.scale(cw / 1240, ch / 697);
    g.translate(0, 2); // 兩張 svg 都有 translate(0, 2)
    // 滾動範圍（只畫邊界，避免蓋掉毛氈）
    const rollPath = new Path2D(
      "M51,50 L94.4135742,50.1572266 L125.976074,77.1894531 L578.932617,77.1894531 " +
      "L589.447266,50 L649.085938,50 L661.251953,77.1894531 L1112.47656,77.1894531 " +
      "L1147.98754,49.1261564 L1186,49 L1185.74247,97.3592112 L1161.98438,121.130859 " +
      "C1161.98438,375.104711 1161.98438,526.643122 1161.98438,575.746094 " +
      "C1161.98438,578.210549 1170.98958,587.767841 1189,604.417969 L1189,645 " +
      "L1136.89062,645 L1112.47656,622.501953 L661.251953,622.501953 " +
      "L651.022696,645.648099 L589.447266,645.378906 L576.439453,622.501953 " +
      "L125.976074,622.501953 L101.378418,645 L51,645 L51,604.417969 " +
      "L79,575.746094 L79,127.904297 L51,96.3046875 L51,50 Z"
    );
    g.strokeStyle = "rgba(255, 89, 240, 0.95)";
    g.lineWidth = 3;
    g.stroke(rollPath);
    // 球洞圓（黃色半透明）
    g.fillStyle = "rgba(248, 231, 28, 0.55)";
    g.strokeStyle = "rgba(248, 231, 28, 1)";
    g.lineWidth = 2;
    const holes = [
      [66, 64], [66, 631], [620, 46], [620, 654], [1178, 64], [1178, 631],
    ];
    for (const [hx, hy] of holes) {
      g.beginPath(); g.arc(hx, hy, 33, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
    } // end if (DEV)

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
    const CUSHION_INSET = 0;
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
    const outerThick = 0.40;   // 超厚，避免高速球穿板
    const outerH = 0.50;       // 超高，避免球飛越海綿條
    const pGap = POCKET_R * 1.1; // 袋口缺口半寬
    const addOuterX = (x1, x2, z0, facingOut) => {
      if (x2 - x1 <= 0) return;
      const len = x2 - x1;
      const cx = (x1 + x2) / 2;
      const zPos = z0 + facingOut * outerThick / 2;
      const body = new CANNON.Body({
        mass: 0, material: this.cushionMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(len / 2, outerH / 2, outerThick / 2)),
      });
      body.position.set(cx, outerH / 2, zPos);
      this.world.addBody(body);
    };
    const addOuterZ = (z1, z2, x0, facingOut) => {
      if (z2 - z1 <= 0) return;
      const len = z2 - z1;
      const cz = (z1 + z2) / 2;
      const xPos = x0 + facingOut * outerThick / 2;
      const body = new CANNON.Body({
        mass: 0, material: this.cushionMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(outerThick / 2, outerH / 2, len / 2)),
      });
      body.position.set(xPos, outerH / 2, cz);
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
    {
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

  // 桌下 3D 力度量表（Three.js mesh）
  // 預設建置為「沿 +x 延伸」的水平條（未旋轉），以 group.position / rotation.y
  // 由 _positionPowerGauge(isPortrait) 負責擺到正確位置
  _buildPowerGauge() {
    const group = new THREE.Group();
    // 使用較短邊作為長度，讓直式/橫式都不會超出視窗
    const totalW = TABLE_WID * 0.9;
    const totalH = 0.05;
    const y = 0.005;

    // 背景
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW, totalH),
      new THREE.MeshBasicMaterial({ color: 0x0f1a14, transparent: true, opacity: 0.9 })
    );
    bg.rotation.x = -Math.PI / 2;
    bg.position.set(0, y, 0);
    group.add(bg);

    // 邊框
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x3a6a4a });
    const bt = 0.005;
    const mkBorder = (w, h, dx, dz) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), borderMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(dx, y + 0.001, dz);
      group.add(m);
    };
    mkBorder(totalW, bt, 0, -totalH / 2);
    mkBorder(totalW, bt, 0,  totalH / 2);
    mkBorder(bt, totalH, -totalW / 2, 0);
    mkBorder(bt, totalH,  totalW / 2, 0);

    // 填充（以 scale.x 控制長度，錨在左邊 -totalW/2）
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW, totalH - bt * 2),
      new THREE.MeshBasicMaterial({ color: 0x1ca85a })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.set(-totalW / 2, y + 0.002, 0);
    fill.scale.x = 0.0001;
    group.add(fill);

    // 刻度
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x2a4a36, transparent: true, opacity: 0.7 });
    for (const t of [0.25, 0.5, 0.75]) {
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.004, totalH * 0.6), tickMat);
      tick.rotation.x = -Math.PI / 2;
      tick.position.set(-totalW / 2 + totalW * t, y + 0.003, 0);
      group.add(tick);
    }

    group.visible = false;
    this.scene.add(group);
    this.powerGauge = { group, fill, totalW, totalH, y };
    this._updatePowerGauge(0);
    this._positionPowerGauge(window.innerHeight > window.innerWidth);
  }

  _positionPowerGauge(isPortrait) {
    if (!this.powerGauge) return;
    const g = this.powerGauge.group;
    if (isPortrait) {
      // 直式：相機 up = (-1,0,0)，+x 為螢幕下方 → 量表擺在 +x 桌邊外
      // 旋轉 +90° 讓 local +x 指向 world -z（＝螢幕右方），填充方向才是左→右
      g.rotation.y = Math.PI / 2;
      g.position.set(HX + FRAME_THICK + 0.14, 0, 0);
    } else {
      // 橫式：相機 up = (0,0,-1)，+z 為螢幕下方 → 量表擺在 +z 桌邊外
      g.rotation.y = 0;
      g.position.set(0, 0, HZ + FRAME_THICK + 0.14);
    }
  }

  _updatePowerGauge(power) {
    if (!this.powerGauge) return;
    const { fill, totalW } = this.powerGauge;
    const p = Math.max(0, Math.min(1, power));
    // 以 scale.x 控制填充長度；原本寬為 totalW，縮放後實寬 = totalW * p
    // 要讓左邊緣保持在 -totalW/2：position.x = -totalW/2 + (totalW*p)/2
    fill.scale.x = Math.max(0.0001, p);
    fill.position.x = -totalW / 2 + (totalW * p) / 2;
    // 顏色隨力度變化
    const c = p < 0.4 ? 0x1ca85a : p < 0.8 ? 0xf7c300 : 0xd9212e;
    fill.material.color.setHex(c);
  }

  _showPowerGauge(show) {
    if (this.powerGauge) this.powerGauge.group.visible = !!show;
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
    if (!this.cueStick) return;
    const cp = this.cue.body.position;
    let ux, uz, f;
    if (this.phase === "power" && this.aimDir) {
      ux = this.aimDir.ux; uz = this.aimDir.uz;
      f = this.shotPower;
    } else if (this.aim) {
      const dx = this.aim.startX - this.aim.curX;
      const dz = this.aim.startZ - this.aim.curZ;
      const len = Math.hypot(dx, dz);
      if (len < 0.02) { this.cueStick.visible = false; return; }
      ux = dx / len; uz = dz / len;
      f = 0.5; // 瞄準階段使用預覽拉桿量
    } else {
      this.cueStick.visible = false;
      return;
    }
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

    // 練習模式：母球 + 1 顆目標球
    if (this.mode === "practice") {
      const target = this._createBall(1, HX * 0.5, 0);
      this.balls.push(target);
      this.cue = this._createBall(0, -HX * 0.5, 0);
      this.balls.push(this.cue);
      return;
    }

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
    if (this._animating) return false;
    if (this.mode === "ai" && this.currentPlayer === 2) return false;
    if (this.mode === "net" && this.currentPlayer !== this.myPlayerNum) return false;
    return true;
  }

  _down(e) {
    Sfx.unlock();
    if (!this._canAim()) return;
    const w = this._toWorld(e);
    if (!w) return;

    // 練習模式：點到球就直接拖曳擺位
    if (this.mode === "practice") {
      const hitR = BALL_R * 1.6;
      for (const b of this.balls) {
        if (b.pocketed) continue;
        const dx = w.x - b.body.position.x, dz = w.z - b.body.position.z;
        if (dx * dx + dz * dz < hitR * hitR) {
          this.dragBall = b;
          b.body.velocity.set(0, 0, 0);
          b.body.angularVelocity.set(0, 0, 0);
          return;
        }
      }
    }

    if (this.ballInHand) {
      if (this._inPlay(w.x, w.z) && !this._overlaps(w.x, w.z)) {
        this._placeCue(w.x, w.z);
        this.ballInHand = false;
        this._pushHud();
        if (this.mode === "net") this._netSendPlace(w.x, w.z);
        return;
      }
    }

    // 兩段式：Phase 1 aim（選方向）、Phase 2 power（拖曳決定力度）
    if (this.phase === "power") {
      // 力度階段：按下開始累積
      this.powerDrag = { startX: w.x, startZ: w.z, curX: w.x, curZ: w.z };
      this.shotPower = 0;
      this._updatePowerGauge(0);
      this._drawAim();
    } else {
      // 瞄準階段：按下開始旋轉方向
      this.phase = "aim";
      this.aim = { startX: w.x, startZ: w.z, curX: w.x, curZ: w.z };
    }
  }

  _move(e) {
    if (this.dragBall) {
      const w = this._toWorld(e);
      if (!w) return;
      const lx = HX - CUSHION_INSET - BALL_R;
      const lz = HZ - CUSHION_INSET - BALL_R;
      let x = Math.max(-lx, Math.min(lx, w.x));
      let z = Math.max(-lz, Math.min(lz, w.z));
      this.dragBall.body.velocity.set(0, 0, 0);
      this.dragBall.body.angularVelocity.set(0, 0, 0);
      this.dragBall.body.position.set(x, BALL_R, z);
      this.dragBall.body.wakeUp();
      return;
    }
    const w = this._toWorld(e);
    if (!w) return;
    if (this.phase === "aim" && this.aim) {
      this.aim.curX = w.x; this.aim.curZ = w.z;
      this._drawAim();
    } else if (this.phase === "power" && this.powerDrag) {
      this.powerDrag.curX = w.x; this.powerDrag.curZ = w.z;
      const dx = w.x - this.powerDrag.startX;
      const dz = w.z - this.powerDrag.startZ;
      const len = Math.hypot(dx, dz);
      this.shotPower = Math.max(0, Math.min(1, len / 0.6));
      this._updatePowerGauge(this.shotPower);
      this._drawAim();
    }
  }

  _up(e) {
    if (this.dragBall) {
      this.dragBall.body.velocity.set(0, 0, 0);
      this.dragBall.body.angularVelocity.set(0, 0, 0);
      this.dragBall = null;
      return;
    }
    // Phase 1 結束：鎖定方向、切到 Phase 2
    if (this.phase === "aim" && this.aim) {
      const dx = this.aim.startX - this.aim.curX;
      const dz = this.aim.startZ - this.aim.curZ;
      const len = Math.hypot(dx, dz);
      if (len < 0.03) {
        // 拖太短，當作未瞄，重置
        this._clearAim();
        this.aim = null;
        return;
      }
      this.aimDir = { ux: dx / len, uz: dz / len };
      this.phase = "power";
      this.shotPower = 0;
      this._showPowerGauge(true);
      this._updatePowerGauge(0);
      this._drawAim();
      return;
    }
    // Phase 2 結束：以當下力度出桿
    if (this.phase === "power" && this.powerDrag) {
      const p = this.shotPower;
      const dir = this.aimDir;
      // 完全清除視覺與狀態
      this.powerDrag = null;
      this._showPowerGauge(false);
      this._updatePowerGauge(0);
      this._clearAim();
      this.aim = null;
      this.aimDir = null;
      this.phase = "aim";
      this.shotPower = 0;
      if (!dir || p < 0.05) return; // 力度太小視為取消
      const imp = MAX_SHOT_IMPULSE * p;
      this._shoot(dir.ux * imp, dir.uz * imp);
      return;
    }
  }

  // 重置兩段式狀態（換人、取消、局結束時呼叫）
  _resetShotPhase() {
    this.phase = "aim";
    this.aim = null;
    this.aimDir = null;
    this.powerDrag = null;
    this.shotPower = 0;
    this._showPowerGauge(false);
    this._updatePowerGauge(0);
    this._clearAim();
  }

  _drawAim() {
    this._clearAim();
    const cp = this.cue.body.position;
    // 方向來源：Phase 1 看當前拖曳、Phase 2 用鎖定方向
    let ux, uz;
    if (this.phase === "power" && this.aimDir) {
      ux = this.aimDir.ux;
      uz = this.aimDir.uz;
    } else if (this.aim) {
      const dx = this.aim.startX - this.aim.curX;
      const dz = this.aim.startZ - this.aim.curZ;
      const L = Math.hypot(dx, dz);
      if (L < 0.02) return;
      ux = dx / L; uz = dz / L;
    } else {
      return;
    }

    this.aimLines = [];
    const y = BALL_R; // 瞄準線必須與球心同高，否則透視相機會造成偏移

    // 力度：Phase 1 用預覽值（方便玩家判斷路徑）；Phase 2 用實際累積力度
    const f = this.phase === "power" ? this.shotPower : 0.5;

    // 用影子世界模擬擊球，直接取母球/目標球軌跡
    const impMag = MAX_SHOT_IMPULSE * f;
    const spinY = this.spin ? this.spin.y : 0;
    const spinX = this.spin ? this.spin.x : 0;

    // 快取：相同瞄準 / 力度不重算（角度變化 > 0.3°、力度變化 > 1.5% 才重跑）
    const cacheKey = this._simCache;
    const sameDir = cacheKey && Math.abs(cacheKey.ux - ux) + Math.abs(cacheKey.uz - uz) < 0.01;
    const sameF = cacheKey && Math.abs(cacheKey.f - f) < 0.015;
    const sameSpin = cacheKey && cacheKey.sy === spinY && cacheKey.sx === spinX;
    const samePos = cacheKey && Math.abs(cacheKey.cx - cp.x) + Math.abs(cacheKey.cz - cp.z) < 0.001;
    let sim;
    if (sameDir && sameF && sameSpin && samePos && cacheKey.sim) {
      sim = cacheKey.sim;
    } else {
      sim = this._simulateShot(ux, uz, impMag, spinY, spinX);
      this._simCache = { ux, uz, f, sy: spinY, sx: spinX, cx: cp.x, cz: cp.z, sim };
    }

    // 繪製母球軌跡：碰撞前白色粗虛線、碰撞後灰色粗虛線
    this._drawSampledPath(sim.cueBefore, y, 0xffffff, 0.95);
    this._drawSampledPath(sim.cueAfter, y, 0xcccccc, 0.65);

    // ghost / 袋口標記
    if (sim.cuePocket) {
      const ring = this._makeFatRing(sim.cuePocket.x, y, sim.cuePocket.z, BALL_R, 0xff4444, 0.004, 0.9);
      this.scene.add(ring); this.aimLines.push(ring);
    } else if (sim.hitPoint) {
      const ring = this._makeFatRing(sim.hitPoint.x, y, sim.hitPoint.z, BALL_R, 0xffffff, 0.004, 0.9);
      this.scene.add(ring); this.aimLines.push(ring);
    }

    // 目標球軌跡（碰撞後）：短實線表示主方向
    if (sim.targetSamples.length >= 2 && sim.hitBall) {
      const start = sim.targetSamples[0];
      // 取前幾個 sample 的方向做平均，避免接觸瞬間的雜訊
      const look = Math.min(5, sim.targetSamples.length - 1);
      const endP = sim.targetSamples[look];
      const ndx = endP.x - start.x, ndz = endP.z - start.z;
      const nlen = Math.hypot(ndx, ndz);
      if (nlen > 1e-4) {
        const tLen = 0.12 + f * 0.9;
        const tLine = this._makeSolidLine(
          start.x, start.z,
          start.x + (ndx / nlen) * tLen, start.z + (ndz / nlen) * tLen,
          y, 0xffffff, 0.85
        );
        this.scene.add(tLine); this.aimLines.push(tLine);
      }
    }

    // 白球後方力度指示線（反向），長度對應 f（0.6 是 _up 中 len/0.6 normalize 的對應）
    const color = f < 0.4 ? 0x1ca85a : f < 0.8 ? 0xf7c300 : 0xd9212e;
    const barLen = 0.6 * f;
    const p2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cp.x, y, cp.z),
      new THREE.Vector3(cp.x - ux * barLen, y, cp.z - uz * barLen),
    ]);
    const m2 = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    this.powerLine = new THREE.Line(p2, m2);
    this.scene.add(this.powerLine);

    this._updateCueStick();
  }

  // 沿模擬取樣點畫粗虛線：每段累積 stepDist 就放一顆小球
  _drawSampledPath(samples, y, color, opacity) {
    if (!samples || samples.length < 2) return;
    const radius = 0.006;
    const stepDist = 0.045;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false,
    });
    const geom = new THREE.SphereGeometry(radius, 8, 6);
    const group = new THREE.Group();
    let acc = 0;
    // 第一顆放在起點
    const first = new THREE.Mesh(geom, mat);
    first.position.set(samples[0].x, y, samples[0].z);
    first.renderOrder = 2;
    group.add(first);
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      if (segLen < 1e-5) continue;
      let remain = segLen;
      let cursor = 0; // 沿此 segment 已走距離
      while (acc + remain >= stepDist - 1e-6) {
        const need = stepDist - acc;
        cursor += need;
        const frac = cursor / segLen;
        const px = a.x + (b.x - a.x) * frac;
        const pz = a.z + (b.z - a.z) * frac;
        const m = new THREE.Mesh(geom, mat);
        m.position.set(px, y, pz);
        m.renderOrder = 2;
        group.add(m);
        remain -= need;
        acc = 0;
      }
      acc += remain;
    }
    this.scene.add(group);
    this.aimLines.push(group);
  }

  // 粗虛線：沿直線放一排小球，用以模擬比 1px 還粗的虛線
  _makeFatDashedLine(x1, z1, x2, z2, y, color, opacity, radius, step) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const group = new THREE.Group();
    if (len < 1e-4) return group;
    const ux = dx / len, uz = dz / len;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false,
    });
    const geom = new THREE.SphereGeometry(radius, 10, 8);
    for (let d = 0; d <= len + 1e-6; d += step) {
      const m = new THREE.Mesh(geom, mat);
      m.position.set(x1 + ux * d, y, z1 + uz * d);
      m.renderOrder = 2;
      group.add(m);
    }
    return group;
  }

  // 實線：用短 BoxGeometry 沿方向拼接（有粗度）
  _makeSolidLine(x1, z1, x2, z2, y, color, opacity) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const group = new THREE.Group();
    if (len < 1e-4) return group;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false,
    });
    const boxH = 0.004, boxT = 0.008;
    const geom = new THREE.BoxGeometry(len, boxH, boxT);
    const m = new THREE.Mesh(geom, mat);
    m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    m.rotation.y = -Math.atan2(dz, dx);
    m.renderOrder = 2;
    group.add(m);
    return group;
  }

  // 粗 torus 圓圈（有厚度）
  _makeFatRing(cx, y, cz, radius, color, tube, opacity) {
    const geom = new THREE.TorusGeometry(radius, tube, 8, 48);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: opacity ?? 0.9, depthWrite: false,
    });
    const m = new THREE.Mesh(geom, mat);
    m.position.set(cx, y, cz);
    m.rotation.x = Math.PI / 2;
    m.renderOrder = 2;
    return m;
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

  // 影子世界模擬：把當前球狀態複製到影子世界，以給定 (ux, uz, impulse, spin) 模擬擊球，記錄軌跡
  // 回傳 { cueSamples, hitBall, hitPoint, targetSamples, cuePocket }
  //   cueSamples: 母球每幾步取樣一次的位置
  //   hitBall: 第一顆被撞到的真實 Ball 物件（或 null）
  //   hitPoint: 第一次撞球時母球位置 (ghost 位置)
  //   targetSamples: 被撞球之後的位置取樣（若有）
  //   cuePocket: 若母球入袋，入袋位置
  _simulateShot(ux, uz, impMag, spinY, spinX) {
    const sw = this._shadowWorld;
    const sbs = this._shadowBalls;
    if (!sw || !sbs) return { cueSamples: [], hitBall: null, hitPoint: null, targetSamples: [], cuePocket: null };

    // 1. 同步狀態：所有球位置 / 速度 / 角速度
    const cueIdx = this.balls.findIndex(b => b.isCue);
    for (let i = 0; i < this.balls.length; i++) {
      const rb = this.balls[i];
      const sb = sbs[i];
      if (!rb || rb.pocketed) {
        sb.collisionResponse = false;
        sb.position.set(100 + i * 0.5, -10, 0);
        sb.velocity.setZero();
        sb.angularVelocity.setZero();
        sb.quaternion.set(0, 0, 0, 1);
        continue;
      }
      sb.collisionResponse = true;
      sb.position.copy(rb.body.position);
      sb.velocity.copy(rb.body.velocity);
      sb.angularVelocity.copy(rb.body.angularVelocity);
      sb.quaternion.copy(rb.body.quaternion);
      sb.wakeUp();
    }

    // 2. 對影子母球施加與真實擊球一致的衝量 + 旋轉
    const cs = sbs[cueIdx];
    const speed = impMag / BALL_MASS;
    cs.velocity.set(ux * speed, 0, uz * speed);
    const tx = uz, tz = -ux;
    const rate = speed / BALL_R;
    const TOP_GAIN = 2.0, SIDE = 1.2;
    const wTop = rate * (1 + (spinY || 0) * TOP_GAIN);
    const wYaw = rate * (spinX || 0) * SIDE;
    cs.angularVelocity.set(tx * wTop, wYaw, tz * wTop);

    // 3. 模擬
    const dt = 1 / 120;
    const MAX_STEPS = 150; // 1.25s 上限（瞄準預測夠用）
    const SAMPLE_STEPS = 2; // 每 2 步取樣（60Hz 取樣密度）
    const STOP_SPEED = 0.15; // 母球速度低於此即視為停止
    const cueBefore = [{ x: cs.position.x, z: cs.position.z }];
    const cueAfter = [];
    const targetSamples = [];
    let hitBall = null, hitPoint = null, targetIdx = -1;
    let cuePocket = null;
    const pockets = this.pocketPos;

    const checkPocket = (body) => {
      for (const p of pockets) {
        const d = Math.hypot(body.position.x - p.x, body.position.z - p.z);
        if (d < (p.r ?? POCKET_R)) return { x: p.x, z: p.z };
      }
      return null;
    };

    for (let step = 0; step < MAX_STEPS; step++) {
      sw.step(dt);

      // 偵測第一次球-球碰撞
      if (hitBall === null) {
        for (let i = 0; i < sbs.length; i++) {
          if (i === cueIdx) continue;
          const rb = this.balls[i];
          if (!rb || rb.pocketed) continue;
          const sb = sbs[i];
          const d = Math.hypot(cs.position.x - sb.position.x, cs.position.z - sb.position.z);
          if (d < BALL_R * 2 + 0.003) {
            hitBall = rb;
            hitPoint = { x: cs.position.x, z: cs.position.z };
            targetIdx = i;
            // 把接觸瞬間當作 before 最後一點、after 第一點
            cueBefore.push({ x: hitPoint.x, z: hitPoint.z });
            cueAfter.push({ x: hitPoint.x, z: hitPoint.z });
            targetSamples.push({ x: sb.position.x, z: sb.position.z });
            break;
          }
        }
      }

      if (step % SAMPLE_STEPS === 0) {
        const pt = { x: cs.position.x, z: cs.position.z };
        if (hitBall === null) cueBefore.push(pt);
        else cueAfter.push(pt);
        if (targetIdx >= 0) {
          const ts = sbs[targetIdx];
          targetSamples.push({ x: ts.position.x, z: ts.position.z });
        }
      }

      // 母球入袋
      const pk = checkPocket(cs);
      if (pk) { cuePocket = pk; break; }

      // 母球停下（含少許延遲避免剛出發誤判）
      if (step > 15) {
        const cueSpeed = Math.hypot(cs.velocity.x, cs.velocity.z);
        if (cueSpeed < STOP_SPEED) break;
      }
    }

    return { cueBefore, cueAfter, hitBall, hitPoint, targetSamples, cuePocket };
  }

  // AI 專用：模擬擊球到「所有球停下」，回報哪些球進袋、母球最終位置、第一次撞到的球
  // 用於評估候選擊球的好壞（不畫圖、不取樣）
  _simulateShotFull(ux, uz, impMag, spinY, spinX) {
    const sw = this._shadowWorld;
    const sbs = this._shadowBalls;
    if (!sw || !sbs) return null;

    const cueIdx = this.balls.findIndex(b => b.isCue);
    for (let i = 0; i < this.balls.length; i++) {
      const rb = this.balls[i];
      const sb = sbs[i];
      if (!rb || rb.pocketed) {
        sb.collisionResponse = false;
        sb.position.set(100 + i * 0.5, -10, 0);
        sb.velocity.setZero();
        sb.angularVelocity.setZero();
        sb.quaternion.set(0, 0, 0, 1);
        continue;
      }
      sb.collisionResponse = true;
      sb.position.copy(rb.body.position);
      sb.velocity.copy(rb.body.velocity);
      sb.angularVelocity.copy(rb.body.angularVelocity);
      sb.quaternion.copy(rb.body.quaternion);
      sb.wakeUp();
    }

    const cs = sbs[cueIdx];
    const speed = impMag / BALL_MASS;
    cs.velocity.set(ux * speed, 0, uz * speed);
    const tx = uz, tz = -ux;
    const rate = speed / BALL_R;
    const TOP_GAIN = 2.0, SIDE = 1.2;
    const wTop = rate * (1 + (spinY || 0) * TOP_GAIN);
    const wYaw = rate * (spinX || 0) * SIDE;
    cs.angularVelocity.set(tx * wTop, wYaw, tz * wTop);

    const dt = 1 / 120;
    const MAX_STEPS = 600; // 5s 上限
    const STOP_SPEED = 0.05;
    const pockets = this.pocketPos;
    const pocketed = new Set(); // numbers that pocketed during sim
    let firstHit = null;
    let cuePocketed = false;

    // 標記哪些球索引「在影子世界中已進袋」(讓他們之後不再參與物理)
    const pocketedShadow = new Array(sbs.length).fill(false);

    for (let step = 0; step < MAX_STEPS; step++) {
      sw.step(dt);

      // 偵測第一顆撞到的非母球
      if (firstHit === null) {
        for (let i = 0; i < sbs.length; i++) {
          if (i === cueIdx) continue;
          if (pocketedShadow[i]) continue;
          const rb = this.balls[i];
          if (!rb || rb.pocketed) continue;
          const sb = sbs[i];
          const d = Math.hypot(cs.position.x - sb.position.x, cs.position.z - sb.position.z);
          if (d < BALL_R * 2 + 0.003) {
            firstHit = rb.number;
            break;
          }
        }
      }

      // 檢查每顆球是否進袋
      for (let i = 0; i < sbs.length; i++) {
        if (pocketedShadow[i]) continue;
        const rb = this.balls[i];
        if (!rb || rb.pocketed) continue;
        const sb = sbs[i];
        for (const p of pockets) {
          const d = Math.hypot(sb.position.x - p.x, sb.position.z - p.z);
          if (d < (p.r ?? POCKET_R)) {
            pocketedShadow[i] = true;
            if (i === cueIdx) cuePocketed = true;
            else pocketed.add(rb.number);
            // 把進袋的球移開、停掉，避免影響後續模擬
            sb.collisionResponse = false;
            sb.position.set(100 + i * 0.5, -10, 0);
            sb.velocity.setZero();
            sb.angularVelocity.setZero();
            break;
          }
        }
      }

      // 全部球停下？
      if (step > 20) {
        let allStill = true;
        for (let i = 0; i < sbs.length; i++) {
          if (pocketedShadow[i]) continue;
          const sb = sbs[i];
          const v = Math.hypot(sb.velocity.x, sb.velocity.z);
          if (v > STOP_SPEED) { allStill = false; break; }
        }
        if (allStill) break;
      }
    }

    // 回報所有非母球的最終位置
    const finalPositions = {};
    for (let i = 0; i < sbs.length; i++) {
      const rb = this.balls[i];
      if (!rb || rb.pocketed || pocketedShadow[i]) continue;
      finalPositions[rb.number] = { x: sbs[i].position.x, z: sbs[i].position.z };
    }
    const cueFinal = cuePocketed
      ? null
      : { x: cs.position.x, z: cs.position.z };

    return { firstHit, pocketed: Array.from(pocketed), cuePocketed, cueFinal, finalPositions };
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
        const t = raySphereT(p.x, p.z, (p.r ?? POCKET_R) + BALL_R);
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
        // 等質量彈性碰撞：n̂ 為從 ghost（撞擊時白球中心）指向目標球中心的單位向量
        const bx = hit.ball.body.position.x, bz = hit.ball.body.position.z;
        let nx = bx - ex, nz = bz - ez;
        const nl = Math.hypot(nx, nz) || 1;
        nx /= nl; nz /= nl;
        // 白球偏折方向：入射方向減去投影到 n̂ 的分量（即切線分量）
        const dn = dx * nx + dz * nz;
        const cueDefX = dx - dn * nx;
        const cueDefZ = dz - dn * nz;
        end = { x: ex, z: ez, color: 0xffffff, dashed: true,
                hitBall: hit.ball, nx, nz, cueDefX, cueDefZ };
        break;
      }
      if (hit.kind === "pocket") {
        end = { x: hit.p.x, z: hit.p.z, color: 0xff4444, dashed: false };
        break;
      }
      // 反彈：經實測 cannon-es 在此組參數下非常接近完美鏡像反射（誤差 < 2°）
      // 直接對稱翻轉法向分量；方向為單位向量故不需重新正規化
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
        l.traverse && l.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
        if (l.geometry) l.geometry.dispose();
        if (l.material) l.material.dispose();
      }
      this.aimLines = null;
    }
    if (this.powerLine) { this.scene.remove(this.powerLine); this.powerLine.geometry.dispose(); this.powerLine = null; }
    if (this.cueStick) this.cueStick.visible = false;
  }

  // 球桿動畫：拉桿 → 出桿 → 觸球時呼叫 onStrike
  // ux, uz 為擊球方向（母球前進方向）；power 為 0~1
  _animateShot(ux, uz, power, onStrike) {
    if (this.shotInProgress || this._animating) return;
    // 注意：不能在此設 shotInProgress，因為此時球都還沒動，主 loop 的 _allStill 會誤判為「桿已結束」提早觸發 _resolveShot
    this._animating = true; // 專用鎖，_canAim 會檢查
    this._clearAim();
    const cp = this.cue.body.position;
    const cx = cp.x, cz = cp.z;
    const pullMax = 0.08 + Math.max(0, Math.min(1, power)) * 0.24; // 拉桿量
    const pullStart = 0.03;
    const pullTime = 500; // ms，拉桿
    const strikeTime = 110; // ms，擊出
    const t0 = performance.now();
    let struck = false;
    const easeOut = (t) => 1 - (1 - t) * (1 - t);
    const easeIn  = (t) => t * t;
    const tick = () => {
      if (!this.cueStick) return;
      const now = performance.now();
      const el = now - t0;
      let pull;
      if (el < pullTime) {
        const t = el / pullTime;
        pull = pullStart + (pullMax - pullStart) * easeOut(t);
      } else if (el < pullTime + strikeTime) {
        const t = (el - pullTime) / strikeTime;
        pull = pullMax - (pullMax - pullStart) * easeIn(t);
      } else {
        pull = pullStart;
      }
      this._placeCueStickAt(cx, cz, ux, uz, pull);
      // 觸球瞬間（pull 接近 0）觸發擊球
      if (!struck && el >= pullTime + strikeTime) {
        struck = true;
        if (this.cueStick) this.cueStick.visible = false;
        this._animating = false;
        if (onStrike) onStrike(); // 這裡才真正 _shoot，球才會動
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---------- 擊球 ----------
  _shoot(ix, iz) {
    this.shotInProgress = true;
    this.firstHit = null;
    this.pocketedThisShot = [];
    this.targetAtShot = lowestBallOnTable(this.balls);
    // 記錄本桿擊球方向與拉/推桿量，供碰撞後補救使用（cannon-es 求解器會在碰撞瞬間吃掉大量背旋，靠純物理無法呈現拉桿後退）
    const _mag = Math.hypot(ix, iz) || 1;
    this._shotDir = { x: ix / _mag, z: iz / _mag };
    this._shotSpinY = this.spin ? this.spin.y : 0; // -1 全拉桿、+1 全推桿
    this._shotSpinX = this.spin ? this.spin.x : 0;
    this._shotBaseSpeed = _mag / BALL_MASS; // 原始母球速度估算
    this.cue.body.wakeUp();
    this.cue.body.applyImpulse(
      new CANNON.Vec3(ix, 0, iz),
      new CANNON.Vec3(0, 0, 0)
    );
    const impMag = Math.hypot(ix, iz);
    // 球桿撞擊點：推/拉 + 左右塞
    // 基準：中心擊球 ⇒ 自然滾動（ω_z = -v/R，向前行進方向的「頂部向前」），
    //       如此不會因為地面摩擦而被拖停；推桿再往上加，拉桿再往反向扣。
    {
      const speed = impMag / BALL_MASS;
      const ux = ix / (impMag || 1), uz = iz / (impMag || 1);
      const tx = uz, tz = -ux; // cross(up,dir)，自然滾動的軸方向（wTop 為正代表向前滾）
      const rate = speed / BALL_R;
      const TOP_GAIN = 2.0;    // 拉桿強度（全拉桿背旋 v/R；超過 2.5 會觸發 cannon-es 求解器異常讓母球瞬間倒退）
      const SIDE = 1.2;
      const wTop = rate * (1 + this.spin.y * TOP_GAIN); // spin.y=+1 推桿、-1 拉桿
      const wYaw = rate * this.spin.x * SIDE;
      this.cue.body.angularVelocity.set(tx * wTop, wYaw, tz * wTop);
    }
    // 擊球後重置撞擊點，避免下一桿沿用
    if (this.spin) { this.spin.x = 0; this.spin.y = 0; if (this.spinDot) { this.spinDot.style.left = "50%"; this.spinDot.style.top = "50%"; } }
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
      if (b) {
        this.firstHit = b.number;
        // Scripted 拉/推桿：cannon-es 碰撞會讓真實背旋失效，改用事後延遲衝量實現
        // 記錄「本桿擊球原速度」作為 baseline，延遲 ~40ms 等兩球分開後才施加
        const spinY = this._shotSpinY || 0;
        const spinX = this._shotSpinX || 0;
        if (Math.abs(spinY) > 0.05 || Math.abs(spinX) > 0.05) {
          const dir = this._shotDir || { x: 1, z: 0 };
          const baseline = this._shotBaseSpeed || 1;
          const back = -spinY;
          const push = Math.max(0, spinY);
          const drawV = back * baseline * 0.5; // 全拉桿最終達 ~50% 原速反向
          const pushV = push * baseline * 0.3;
          const sideV = spinX * baseline * 0.25;
          const sx = dir.z, sz = -dir.x;
          const totalDvx = (-dir.x * drawV) + (dir.x * pushV) + (sx * sideV);
          const totalDvz = (-dir.z * drawV) + (dir.z * pushV) + (sz * sideV);
          // 分散在 ~20 個 frame (~0.33s) 內漸進施加
          const steps = 20;
          setTimeout(() => {
            this._spinForce = {
              dvx: totalDvx / steps,
              dvz: totalDvz / steps,
              stepsLeft: steps,
            };
          }, 60);
        }
      }
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
        const r = p.r ?? POCKET_R;
        // 只要球身與袋口圓有重疊即判定進袋
        const rr = r + BALL_R;
        if (dx * dx + dz * dz < rr * rr) {
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
    this.world.step(1 / 120, dt, 8);

    // 拉/推桿 scripted 衝量：分散在多個 frame 施加，營造「摩擦漸推」視覺而非彈開
    if (this._spinForce && this._spinForce.stepsLeft > 0) {
      const f = this._spinForce;
      this.cue.body.velocity.x += f.dvx;
      this.cue.body.velocity.z += f.dvz;
      f.stepsLeft--;
    }

    // 硬性位置限制：若球超出桌面範圍（穿板保險），把球拉回並歸零速度
    const MAX_X = HX - BALL_R, MAX_Z = HZ - BALL_R;
    for (const b of this.balls) {
      if (b.pocketed) continue;
      const p = b.body.position;
      if (p.x > MAX_X + 0.2 || p.x < -MAX_X - 0.2 ||
          p.z > MAX_Z + 0.2 || p.z < -MAX_Z - 0.2) {
        // 明顯穿出才回收，小幅越界仍由 cushion 處理
        p.x = Math.max(-MAX_X, Math.min(MAX_X, p.x));
        p.z = Math.max(-MAX_Z, Math.min(MAX_Z, p.z));
        p.y = BALL_R;
        b.body.velocity.set(0, 0, 0);
        b.body.angularVelocity.set(0, 0, 0);
      }
    }

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

    // 練習模式：母球/目標球掉袋就重置，不計分、不換手
    if (this.mode === "practice") {
      if (this.cue.pocketed || cueOff) {
        if (this.cue.pocketed) {
          this.cue.pocketed = false;
          this.cue.mesh.visible = true;
          this.cue.mesh.scale.setScalar(1);
          this.cue.mesh.position.y = BALL_R;
        }
        this._rebuildBody(this.cue, -HX * 0.5, 0);
      }
      const t = this.balls.find(b => b.number === 1);
      if (t && t.pocketed) {
        t.pocketed = false;
        t.mesh.visible = true;
        t.mesh.scale.setScalar(1);
        t.mesh.position.y = BALL_R;
        this._rebuildBody(t, HX * 0.5, 0);
      }
      this.firstHit = null;
      this.pocketedThisShot = [];
      this._pushHud();
      return;
    }

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
    this._buildShadowBalls();
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
    const simulate = (ux, uz, impMag, spinY = 0, spinX = 0) =>
      this._simulateShotFull(ux, uz, impMag, spinY, spinX);
    const plan = planAIShotAdapter(world, this.difficulty, simulate);
    let ix, iz;
    if (!plan) {
      ix = (Math.random() - 0.5) * 0.4;
      iz = (Math.random() - 0.5) * 0.4;
    } else {
      ix = plan.ix;
      iz = plan.iz;
    }
    // 依衝量估算力度（給 AI 球桿動畫使用）
    const mag = Math.hypot(ix, iz);
    const pw = Math.max(0.1, Math.min(1, mag / MAX_SHOT_IMPULSE));
    const uMag = mag || 1;
    const ux = ix / uMag, uz = iz / uMag;
    this._animateShot(ux, uz, pw, () => this._shoot(ix, iz));
  }

  // ---------- HUD ----------
  _pushHud() {
    let p1, p2;
    if (this.mode === "net" && this.net) {
      p1 = this.net.role === "host" ? this.net.myName : (this.net.opponentName || "對手");
      p2 = this.net.role === "host" ? (this.net.opponentName || "對手") : this.net.myName;
    } else if (this.mode === "practice") {
      p1 = "練習模式";
      p2 = "";
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
    // 優先使用 visualViewport（手機瀏覽器工具列出現時會給正確可見高度）
    const vv = window.visualViewport;
    const w = vv ? Math.round(vv.width)  : window.innerWidth;
    const h = vv ? Math.round(vv.height) : window.innerHeight;
    // true = 同步更新 canvas CSS 尺寸（避免 canvas 被拉伸）
    this.renderer.setSize(w, h, true);
    // 若 visualViewport 有位移（部分瀏覽器），對齊到可見區域
    if (vv) {
      this.canvas.style.top  = vv.offsetTop  + 'px';
      this.canvas.style.left = vv.offsetLeft + 'px';
    }
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

    // 直式（手機/平板直拿）：桌子左右約 5% 邊距、上下稍大避開 HUD
    // 橫式且寬高比大（桌機）：視窗放大讓桌邊有空間做大力拖曳
    const isPortrait = h > w;
    let yOffset = 0;
    if (isPortrait) {
      // scale 使桌寬佔 viewW 的 ~90%（左右各 5% 空白）
      // 上下會自動約 8%，yOffset 再把桌子微下移避免 HUD 遮到頂袋
      // 桌子含木框寬 1.43m，base viewW=1.57 → 每邊僅 4.5% 空白；放大視窗讓木框完整露出並留 ~5%
      viewW *= 1.02; viewH *= 1.02;
      yOffset = 0;
    } else {
      // 橫式桌機：放大視窗保留週邊
      viewW /= 0.62; viewH /= 0.62;
    }

    this.camera.left   = -viewW / 2;
    this.camera.right  =  viewW / 2;
    this.camera.top    =  viewH / 2 + yOffset;
    this.camera.bottom = -viewH / 2 + yOffset;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);
    this._positionPowerGauge(isPortrait);
  }

  destroy() {
    cancelAnimationFrame(this._rafId);
    this.renderer.dispose();
    if (this._adjPanel) this._adjPanel.remove();
    if (this.spinWidget) this.spinWidget.remove();
  }

  // 球桿撞擊點選擇器：由上方按鈕開啟的置中 modal
  _buildSpinWidget() {
    const backdrop = document.createElement("div");
    backdrop.id = "spin-backdrop";
    backdrop.style.cssText = [
      "position:fixed", "inset:0", "background:rgba(0,0,0,0.55)",
      "display:none", "align-items:center", "justify-content:center",
      "z-index:30", "touch-action:none",
    ].join(";");
    const w = document.createElement("div");
    w.id = "spin-widget";
    w.style.cssText = [
      "position:relative",
      "width:240px", "height:240px", "border-radius:50%",
      "background:radial-gradient(circle at 35% 30%, #fff 0%, #e6e6e6 60%, #bfbfbf 100%)",
      "box-shadow:0 6px 24px rgba(0,0,0,0.6), inset 0 -8px 16px rgba(0,0,0,0.15)",
      "touch-action:none", "cursor:crosshair", "user-select:none",
    ].join(";");
    const dot = document.createElement("div");
    dot.style.cssText = [
      "position:absolute", "left:50%", "top:50%",
      "width:32px", "height:32px", "border-radius:50%",
      "background:#e33", "box-shadow:0 2px 6px rgba(0,0,0,0.6)",
      "transform:translate(-50%,-50%)", "pointer-events:none",
    ].join(";");
    w.appendChild(dot);
    backdrop.appendChild(w);
    document.body.appendChild(backdrop);
    this.spinWidget = backdrop;
    this.spinDot = dot;

    const setSpin = (nx, ny) => {
      const len = Math.hypot(nx, ny);
      if (len > 1) { nx /= len; ny /= len; }
      this.spin.x = nx;
      this.spin.y = -ny;
      dot.style.left = (50 + nx * 42) + "%";
      dot.style.top  = (50 + ny * 42) + "%";
    };
    this._setSpin = setSpin;
    const fromEvent = (e) => {
      const r = w.getBoundingClientRect();
      const nx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const ny = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      setSpin(nx, ny);
    };
    w.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fromEvent(e);
      w.setPointerCapture(e.pointerId);
      const onMove = (ev) => fromEvent(ev);
      const onUp = () => {
        w.removeEventListener("pointermove", onMove);
        w.removeEventListener("pointerup", onUp);
        // 選完自動關閉
        this.closeSpinPicker();
      };
      w.addEventListener("pointermove", onMove);
      w.addEventListener("pointerup", onUp);
    });
    // 點背景空白處關閉
    backdrop.addEventListener("pointerdown", (e) => {
      if (e.target === backdrop) this.closeSpinPicker();
    });
  }

  openSpinPicker() {
    if (!this.spinWidget) return;
    this.spinWidget.style.display = "flex";
  }
  closeSpinPicker() {
    if (!this.spinWidget) return;
    this.spinWidget.style.display = "none";
  }
}

// 轉接器：ai.js 接收 world 物件（純資料）+ 模擬回呼
function planAIShotAdapter(world, diff, simulate) {
  return planAIShot(world, diff, simulate);
}
