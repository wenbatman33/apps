// パチンコ — Phaser 3 重做版
// 開發者模式：URL 加 ?dev=1 才顯示編輯按鈕、提示
const DEV_MODE = new URLSearchParams(window.location.search).get("dev") === "1";

// 多邊形 point-in-polygon 判定（射線法）
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// 計算凸包（Andrew's monotone chain）— 把塗鴉點包成多邊形
function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}
// 邏輯世界尺寸 800x1067（與機台圖一致），Scale 自動配合視口
const W = 800, H = 1067;

// 機台關鍵座標（依 cabinet_clean.png 量測，800×1067 比例）
const LCD = { x: 397, y: 448, w: 338, h: 278 };
const GREEN = { cx: 398, cy: 480, rx: 292, ry: 343 }; // 釘子可佈橢圓（依使用者修正範圍）
// 使用者編輯的綠色範圍貝茲控制點（套用為預設）
const GREEN_BEZIER = [
  { x: 690, y: 480 },
  { x: 634, y: 738 },
  { x: 398, y: 823 },
  { x: 171, y: 743 },
  { x: 106, y: 480 },
  { x: 177, y: 216 },
  { x: 398, y: 137 },
  { x: 620, y: 210 },
];
// 發球線貝茲控制點（編輯後貼進來會自動套用）
const LAUNCH_BEZIER = [
  { x: 617, y: 773 },
  { x: 649, y: 643 },
  { x: 658, y: 463 },
  { x: 632, y: 297 },
  { x: 600, y: 243 },
  { x: 523, y: 179 },
  { x: 345, y: 175 },
  { x: 221, y: 217 },
  { x: 158, y: 295 },
];
// 釘子配置（使用者排好的）
const NAILS = [
  [590, 660], [669, 595], [672, 556], [673, 509], [672, 463],
  [672, 411], [622, 607], [629, 530], [666, 367], [632, 414],
  [610, 362], [651, 311], [604, 302], [137, 339], [129, 404],
  [156, 443], [164, 323], [121, 484], [154, 523], [158, 609],
  [349, 720], [178, 698], [223, 721], [545, 642], [452, 715],
  [140, 554], [553, 764], [266, 712], [319, 692], [287, 672],
  [180, 489], [184, 425], [180, 652], [208, 658], [145, 643],
  [229, 685], [255, 660], [395, 178], [367, 207], [414, 206],
  [386, 235], [454, 238], [328, 235], [286, 210], [326, 185],
  [363, 267], [430, 270], [271, 250], [315, 276], [238, 220],
  [231, 274], [198, 256], [470, 687], [287, 622], [321, 652],
  [329, 614], [512, 686], [489, 649], [512, 616], [494, 273],
];
// 入賞口位置（使用者排好的）
const POCKETS = {
  heso:  { x: 397, y: 742, w: 56, h: 40 },
  sideL: { x: 307, y: 755, w: 56, h: 36 },
  sideR: { x: 479, y: 752, w: 56, h: 36 },
};
const WINDMILL = { x: 400, y: 653, r: 38 };
// アウト：綠色橢圓底部內側（球到達此 y 即吞掉）
const OUT_Y = 810;

class GameScene extends Phaser.Scene {
  constructor() { super("game"); }

  preload() {
    // 機台 + UI
    this.load.image("cabinet", "assets/cabinet_clean.png");
    this.load.image("led_l",   "assets/led_strip_left.png");
    this.load.image("led_r",   "assets/led_strip_right.png");
    this.load.image("controller", "assets/controller.png");
    this.load.image("disc",    "assets/disc_gold.png");
    this.load.image("ball",    "assets/ball.png");
    this.load.image("nail",    "assets/nail.png");
    this.load.image("windmill","assets/windmill.png");
    this.load.image("pocketStart", "assets/pocket_start.png");
    this.load.image("pocketV",     "assets/pocket_v.png");
    // LCD
    this.load.image("lcd_idle",  "assets/lcd_bg_idle.png");
    this.load.image("lcd_fever", "assets/lcd_bg_fever.png");
    this.load.image("mascot_idle",    "assets/mascot_idle.png");
    this.load.image("mascot_spin",    "assets/mascot_spin.png");
    this.load.image("mascot_reach",   "assets/mascot_reach.png");
    this.load.image("mascot_jackpot", "assets/mascot_jackpot.png");
    // SP 演出
    this.load.image("fx_reach",    "assets/fx_reach.png");
    this.load.image("fx_gekiatsu", "assets/fx_gekiatsu.png");
    this.load.image("fx_jackpot",  "assets/fx_jackpot.png");
    this.load.image("fx_gekiatsu_text", "assets/fx_gekiatsu_text.png");
    // sprite sheets
    this.load.spritesheet("sakura", "assets/sakura_sheet.png",
      { frameWidth: 1994/8, frameHeight: 789/2 });
    this.load.spritesheet("coin", "assets/coin_sheet.png",
      { frameWidth: 2172/8, frameHeight: 724 });
    this.load.spritesheet("lightning", "assets/fx_lightning.png",
      { frameWidth: 2172/6, frameHeight: 724 });
    this.load.spritesheet("shockwave", "assets/fx_shockwave.png",
      { frameWidth: 2172/6, frameHeight: 724 });
    // 七段數字（新版透明圖，每格 188×253 aspect 0.74）
    this.load.spritesheet("digits", "assets/digits.png?v=4",
      { frameWidth: 188, frameHeight: 253 });
  }

  create() {
    this.state = {
      balls: 1000, spins: 0, jackpots: 0,
      mode: "通常", spinning: false, fever: false, feverRounds: 0,
      holds: [],
    };
    this.balls = [];
    this.launching = [];
    this.ballTrails = new WeakMap();

    // 動態產生白色鋼珠 texture（取代圖片）
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(10, 10, 9);
      g.lineStyle(1, 0xcccccc);
      g.strokeCircle(10, 10, 9);
      // 高光
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(7, 7, 2.5);
      g.generateTexture("whiteball", 20, 20);
      g.destroy();
    }

    this.createCabinet();
    this.createPlayfield();
    // 套用預設貝茲綠色範圍（取代橢圓邊界）
    if (typeof GREEN_BEZIER !== "undefined" && GREEN_BEZIER.length >= 3) {
      this.bezierPoints = GREEN_BEZIER.map(p => ({ x: p.x, y: p.y }));
      this.customGreenPoly = this.sampleClosedSpline(this.bezierPoints, 60);
      this.applyCustomGreen();
    }
    // 套用預設貝茲發球線（不畫粉紅線，只用於球的飛行軌跡計算）
    if (typeof LAUNCH_BEZIER !== "undefined" && LAUNCH_BEZIER && LAUNCH_BEZIER.length >= 3) {
      this.launchBezierPoints = LAUNCH_BEZIER.map(p => ({ x: p.x, y: p.y }));
      this.customLaunchPath = this.sampleOpenSpline(this.launchBezierPoints, 60);
    }
    this.createLCD();
    this.createSakuraEmitter();
    this.createControls();
    this.createHUD();
    this.createSPOverlay();
    this.createPaintGreenMode();
    this.createDrawPathMode();
    this.createEditMode();
    this.createAudio();

    this.matter.world.on("collisionstart", this.onCollision, this);
  }

  // ==================== 機台外殼 + 燈條 ====================
  createCabinet() {
    this.cabinet = this.add.image(W/2, H/2, "cabinet")
      .setDisplaySize(W, H);

    // 燈條（嵌在機台凹槽位置 — left 6.5%~13.5%, top 22%~64%）
    const ledY = H * 0.43;  // 中央
    const ledH = H * 0.42;
    this.ledL = this.add.image(W * 0.10, ledY, "led_l")
      .setDisplaySize(W * 0.07, ledH).setBlendMode(Phaser.BlendModes.SCREEN);
    this.ledR = this.add.image(W * 0.90, ledY, "led_r")
      .setDisplaySize(W * 0.07, ledH).setBlendMode(Phaser.BlendModes.SCREEN);
    // 燈條呼吸閃爍
    this.tweens.add({
      targets: [this.ledL, this.ledR],
      alpha: { from: 0.7, to: 1 },
      duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }

  // ==================== 釘陣 + 入賞口 + 邊界 ====================
  createPlayfield() {
    // 物理邊界（緊貼世界外圍，避免球飛出畫面）
    this.matter.world.setBounds(0, 0, W, H + 50);

    // LCD 邊界牆已移除 — 球可從 LCD 螢幕區域穿越/滑下

    // 綠色橢圓邊界牆 — 完全封閉，球永遠關在範圍內
    // 球從 setPosition 直接生成在範圍內、入賞口和 アウト 也都在範圍內
    this.greenEdges = [];
    const segs = 72;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      const x1 = GREEN.cx + Math.cos(a) * GREEN.rx;
      const y1 = GREEN.cy + Math.sin(a) * GREEN.ry;
      const x2 = GREEN.cx + Math.cos(a2) * GREEN.rx;
      const y2 = GREEN.cy + Math.sin(a2) * GREEN.ry;
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 1) continue;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      // 加厚到 14px，避免高速球穿牆
      const wall = this.matter.add.rectangle(mx, my, len + 8, 14, {
        isStatic: true, angle: ang, friction: 0.05, restitution: 0.45,
        label: "green-edge", render: { visible: false },
        slop: 0.01,
      });
      this.greenEdges.push(wall);
    }

    // 釘陣 — 使用者排好的配置
    this.nails = [];
    if (typeof NAILS !== "undefined" && NAILS.length > 0) {
      for (const [x, y] of NAILS) this.addNail(x, y);
    }

    // 風車裝飾（旋轉中央梅花）
    this.windmillSprite = this.add.image(WINDMILL.x, WINDMILL.y, "windmill")
      .setDisplaySize(76, 76);
    // 風車中心 bumper（球撞會強力反彈）
    this.matter.add.circle(WINDMILL.x, WINDMILL.y, 22, {
      isStatic: true, restitution: 0.95, friction: 0.02,
      label: "windmill", render: { visible: false },
    });

    // 綠色 debug graphics（保留供編輯模式使用，但預設不畫）
    this.greenDebug = this.add.graphics().setDepth(3);

    // 軌跡用 graphics（每幀清空重繪）
    this.trailGfx = this.add.graphics().setDepth(24);

    // 發射路徑 graphics（預設不畫，僅編輯模式顯示）
    this.launchPathGfx = this.add.graphics().setDepth(50);

    // 入賞口（圖片裝飾 + 偵測 sensor）
    this.pocketSprites = {};
    this.pocketSensors = {};
    const heso = this.add.image(POCKETS.heso.x, POCKETS.heso.y, "pocketV")
      .setDisplaySize(POCKETS.heso.w * 1.6, POCKETS.heso.h * 1.4);
    heso._baseScaleX = heso.scaleX; heso._baseScaleY = heso.scaleY;
    this.pocketSprites.heso = heso;
    const sL = this.add.image(POCKETS.sideL.x, POCKETS.sideL.y, "pocketStart")
      .setDisplaySize(POCKETS.sideL.w * 1.4, POCKETS.sideL.h * 1.2);
    sL._baseScaleX = sL.scaleX; sL._baseScaleY = sL.scaleY;
    this.pocketSprites.sideL = sL;
    const sR = this.add.image(POCKETS.sideR.x, POCKETS.sideR.y, "pocketStart")
      .setDisplaySize(POCKETS.sideR.w * 1.4, POCKETS.sideR.h * 1.2);
    sR._baseScaleX = sR.scaleX; sR._baseScaleY = sR.scaleY;
    this.pocketSprites.sideR = sR;
  }

  inGreen(x, y) {
    // 若使用者畫了自訂多邊形，用 point-in-polygon 判定
    if (this.customGreenPoly && this.customGreenPoly.length >= 3) {
      return pointInPolygon(x, y, this.customGreenPoly);
    }
    const dx = (x - GREEN.cx) / GREEN.rx;
    const dy = (y - GREEN.cy) / GREEN.ry;
    return dx * dx + dy * dy <= 1;
  }
  inLCD(x, y) {
    return x > LCD.x - LCD.w/2 - 10 && x < LCD.x + LCD.w/2 + 10
        && y > LCD.y - LCD.h/2 - 10 && y < LCD.y + LCD.h/2 + 10;
  }
  addNail(x, y) {
    const body = this.matter.add.circle(x, y, 6, {
      isStatic: true, restitution: 0.55, friction: 0.02, label: "nail",
      render: { visible: false },
    });
    const sprite = this.add.image(x, y, "nail").setDisplaySize(16, 16);
    this.nails.push({ body, sprite });
  }

  // ==================== LCD 看板娘 ====================
  createLCD() {
    // LCD 黑色底（和機台 LCD 鏤空對齊）
    this.lcdBg = this.add.image(LCD.x, LCD.y, "lcd_idle")
      .setDisplaySize(LCD.w - 8, LCD.h - 8);
    // 看板娘（用 LCD 矩形遮罩 — 看板娘只會出現在黑色 LCD 範圍內）
    this.mascot = this.add.image(LCD.x, LCD.y, "mascot_idle")
      .setDisplaySize(LCD.w - 12, LCD.h - 12);
    const lcdMask = this.make.graphics({ x: 0, y: 0, add: false });
    lcdMask.fillStyle(0xffffff);
    lcdMask.fillRect(LCD.x - LCD.w / 2 + 4, LCD.y - LCD.h / 2 + 4, LCD.w - 8, LCD.h - 8);
    this.mascot.setMask(lcdMask.createGeometryMask());

    // LCD 數字 (777) — 在 LCD 內部下方置中，保持 0.74 aspect 比例
    const digitH = 80, digitW = digitH * 0.74, gap = 4;  // 約 59 × 80
    const digitY = LCD.y + LCD.h / 2 - digitH / 2 - 14;
    this.digitGroup = this.add.container(LCD.x, digitY);
    this.digits = [];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * (digitW + gap);
      const d = this.add.image(x, 0, "digits", 7).setDisplaySize(digitW, digitH);
      this.digits.push(d);
      this.digitGroup.add(d);
    }
    this.digitGroup.setDepth(40);  // 確保在看板娘上方

    // LCD 訊息
    this.lcdMessage = this.add.text(LCD.x, LCD.y + LCD.h * 0.4, "", {
      fontFamily: "DotGothic16", fontSize: "22px", color: "#f5c542",
      stroke: "#000", strokeThickness: 4, fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0).setDepth(16);
  }

  setMood(mood) {
    const map = {
      idle: "mascot_idle", spin: "mascot_spin",
      reach: "mascot_reach", jackpot: "mascot_jackpot",
    };
    this.mascot.setTexture(map[mood] || "mascot_idle");
    if (mood === "spin") {
      this.tweens.add({ targets: this.mascot, scale: { from: 0.95, to: 1 }, duration: 200 });
    } else if (mood === "reach") {
      this.tweens.add({
        targets: this.mascot, scale: { from: 1, to: 1.05 },
        duration: 800, yoyo: true, repeat: -1,
      });
    } else if (mood === "jackpot") {
      this.tweens.killTweensOf(this.mascot);
      this.tweens.add({
        targets: this.mascot, angle: { from: -3, to: 3 }, scale: { from: 1, to: 1.08 },
        duration: 250, yoyo: true, repeat: 8,
      });
    } else {
      this.tweens.killTweensOf(this.mascot);
      this.mascot.setScale(1).setAngle(0);
    }
  }

  setDigit(i, val) {
    this.digits[i].setFrame(val);
  }

  // ==================== 櫻花飄落 ====================
  createSakuraEmitter() {
    this.sakuraParticles = this.add.particles(0, -30, "sakura", {
      x: { min: 0, max: W },
      y: -30,
      lifespan: 8000,
      speedX: { min: -30, max: 30 },
      speedY: { min: 30, max: 70 },
      scale: { start: 0.05, end: 0.04 },
      alpha: { start: 0.7, end: 0.6 },
      frame: { frames: Array.from({length: 16}, (_, i) => i), cycle: false },
      frequency: 380,
      quantity: 1,
      blendMode: Phaser.BlendModes.NORMAL,
    });
    this.sakuraParticles.setDepth(2);
  }

  // ==================== 控制器 + 力道計量 ====================
  createControls() {
    const dialX = W * 0.80, dialY = H * 0.85, dialR = 95;

    // 計量表（緊貼控制器外緣）
    this.gauge = this.add.graphics().setDepth(45);
    this.gaugeMax = 270;
    this.gaugeRadius = dialR * 0.92;
    this.dialPos = { x: dialX, y: dialY };

    // 控制器旋鈕圖（完全不透明）
    this.dial = this.add.image(dialX, dialY, "controller")
      .setDisplaySize(dialR * 1.6, dialR * 1.6)
      .setDepth(46)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });

    // 力道顯示文字（小一點）
    this.gaugeLabel = this.add.text(dialX, dialY + dialR + 8, "0", {
      fontFamily: "DotGothic16", fontSize: "13px", color: "#f5c542",
      backgroundColor: "rgba(0,0,0,0.6)", padding: { x: 6, y: 1 },
    }).setOrigin(0.5).setDepth(46);

    this.dialAngle = 0;     // 0~120
    this.dialMaxAngle = 120;
    this.dialDragging = false;
    this.fireLoop = null;

    this.dial.on("pointerdown", (pointer) => {
      this.dialDragging = true;
      this._dragStartAbs = Math.atan2(pointer.y - dialY, pointer.x - dialX);
      this._dragStartDial = this.dialAngle;
    });
    this.input.on("pointermove", (pointer) => {
      if (!this.dialDragging) return;
      const cur = Math.atan2(pointer.y - dialY, pointer.x - dialX);
      let delta = (cur - this._dragStartAbs) * 180 / Math.PI;
      // 處理跨越 ±π 邊界（避免角度突跳）
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      // 順時針拖 = 力道增加（如真實柏青哥握把）
      this.setDialAngle(this._dragStartDial + delta);
      this.startFireLoop();
    });
    this.input.on("pointerup", () => {
      this.dialDragging = false;
      // 不彈回，保持當前角度繼續發射
      if (this.dialAngle > 5) this.startFireLoop();
    });

    // 雙擊歸零
    this.dial.on("pointerdown", (pointer, x, y, event) => {
      if (event.detail === 2) {
        this.setDialAngle(0);
        if (this.fireLoop) { this.fireLoop.remove(); this.fireLoop = null; }
      }
    });

    this.updateGauge();
  }

  setDialAngle(deg) {
    const newAngle = Phaser.Math.Clamp(deg, 0, this.dialMaxAngle);
    const newPower = Math.round(newAngle / this.dialMaxAngle * 100);
    // 每變化 5 級播個 click 音效（增加細節感）
    if (this.audio && this.power !== undefined &&
        Math.floor(newPower / 5) !== Math.floor(this.power / 5)) {
      this.audio.nail();  // 用釘子聲當作 click
    }
    this.dialAngle = newAngle;
    this.dial.setAngle(this.dialAngle);
    this.power = newPower;
    this.gaugeLabel.setText(String(this.power));
    this.updateGauge();
  }

  updateGauge() {
    this.gauge.clear();
    const startAngle = Phaser.Math.DegToRad(135);
    const endAngle = Phaser.Math.DegToRad(135 + this.gaugeMax);
    // 背景軌
    this.gauge.lineStyle(7, 0xffffff, 0.18);
    this.gauge.beginPath();
    this.gauge.arc(this.dialPos.x, this.dialPos.y, this.gaugeRadius,
                   startAngle, endAngle, false);
    this.gauge.strokePath();
    // 刻度（每 10% 一格大刻度，每 5% 小刻度）
    for (let i = 0; i <= 10; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / 10);
      const isMajor = (i % 2 === 0);
      const r1 = this.gaugeRadius - (isMajor ? 4 : 2);
      const r2 = this.gaugeRadius + (isMajor ? 8 : 4);
      this.gauge.lineStyle(isMajor ? 3 : 2, 0xffffff, isMajor ? 0.7 : 0.35);
      this.gauge.lineBetween(
        this.dialPos.x + Math.cos(a) * r1, this.dialPos.y + Math.sin(a) * r1,
        this.dialPos.x + Math.cos(a) * r2, this.dialPos.y + Math.sin(a) * r2
      );
    }
    // 力道填充（漸層用多段）
    if (this.power > 0) {
      const fillEnd = startAngle + Phaser.Math.DegToRad(this.gaugeMax * (this.power / 100));
      const segs = 30;
      const step = (fillEnd - startAngle) / segs;
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const c = Phaser.Display.Color.Interpolate.RGBWithRGB(
          56, 232, 255,    // 青
          255, 61, 166,    // 粉紅
          1, t
        );
        const col = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
        this.gauge.lineStyle(8, col, 0.95);
        this.gauge.beginPath();
        this.gauge.arc(this.dialPos.x, this.dialPos.y, this.gaugeRadius,
                       startAngle + step * i, startAngle + step * (i + 1), false);
        this.gauge.strokePath();
      }
    }
  }

  startFireLoop() {
    if (this.fireLoop) return;
    this.fireLoop = this.time.addEvent({
      delay: 280, loop: true,
      callback: () => {
        if (this.dialAngle < 5 || this.state.balls <= 0) {
          this.fireLoop.remove();
          this.fireLoop = null;
          return;
        }
        this.fire();
      },
    });
  }

  // ==================== HUD ====================
  createHUD() {
    // HUD 區塊：左下角立體面板
    const panelX = 20, panelY = H - 200, panelW = 200, panelH = 170;
    const bg = this.add.graphics().setDepth(40);
    // 主底色
    bg.fillStyle(0x000000, 0.78);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    // 金色內外框
    bg.lineStyle(2, 0xf5c542, 0.9);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    bg.lineStyle(1, 0xb8860b, 0.5);
    bg.strokeRoundedRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, 6);

    const tStyleLabel = { fontFamily: "DotGothic16", fontSize: "12px", color: "#aaa" };
    const tStyleValue = { fontFamily: "DotGothic16", fontSize: "20px", color: "#f5c542", fontStyle: "bold" };

    // 持球
    this.add.text(panelX + 16, panelY + 12, "持球", tStyleLabel).setDepth(41);
    this.hudBalls = this.add.text(panelX + 60, panelY + 8, "1000", tStyleValue).setDepth(41);
    // 回轉
    this.add.text(panelX + 16, panelY + 42, "回轉", tStyleLabel).setDepth(41);
    this.hudSpins = this.add.text(panelX + 60, panelY + 38, "0", tStyleValue).setDepth(41);
    // 大当
    this.add.text(panelX + 16, panelY + 72, "大当", tStyleLabel).setDepth(41);
    this.hudJackpots = this.add.text(panelX + 60, panelY + 68, "0", tStyleValue).setDepth(41);
    // 模式
    this.hudMode = this.add.text(panelX + 16, panelY + 102, "通常", {
      fontFamily: "DotGothic16", fontSize: "16px", color: "#38e8ff",
    }).setDepth(41);
    // 保留 LED（標籤+4 燈）
    this.add.text(panelX + 16, panelY + 130, "保留", tStyleLabel).setDepth(41);
    this.holdLeds = [];
    for (let i = 0; i < 4; i++) {
      const led = this.add.circle(panelX + 60 + i * 24, panelY + 142, 7, 0x222222, 1)
        .setStrokeStyle(1.5, 0xb8860b).setDepth(41);
      this.holdLeds.push(led);
    }

    this.syncHud();
  }

  syncHud() {
    this.hudBalls.setText("持球 " + this.state.balls);
    this.hudSpins.setText("回轉 " + this.state.spins);
    this.hudJackpots.setText("大当 " + this.state.jackpots);
    this.hudMode.setText(this.state.fever ? "確変 RUSH" : this.state.mode);
    this.hudMode.setColor(this.state.fever ? "#ff3da6" : "#38e8ff");
    this.holdLeds.forEach((led, i) => {
      if (i < this.state.holds.length) {
        led.setFillStyle(0x38e8ff, 1).setStrokeStyle(2, 0xffffff);
      } else {
        led.setFillStyle(0x222222, 1).setStrokeStyle(1, 0xb8860b);
      }
    });
  }

  // ==================== 塗畫綠色範圍模式（按 G 切換）====================
  createPaintGreenMode() {
    this.paintingGreen = false;
    this.customGreenPoly = null;
    this.greenDrawnPoints = [];

    this.greenHint = this.add.text(W / 2, 130, "[G] 塗畫綠色範圍 OFF — 按 G 切換", {
      fontFamily: "DotGothic16", fontSize: "14px", color: "#fff",
      backgroundColor: "rgba(0,80,40,0.7)", padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(80).setVisible(DEV_MODE);

    this.greenPaintGfx = this.add.graphics().setDepth(60);

    this.input.keyboard.on("keydown-G", () => {
      if (!DEV_MODE) return;
      this.paintingGreen = !this.paintingGreen;
      if (this.paintingGreen) {
        this.initBezierPoints();
        this.greenHint.setText("[編輯中] 拖控制點 / 點空白處新增 / 右鍵刪點 / R 重設 / G 套用")
          .setColor("#80ffc0");
        this.matter.world.enabled = false;
        this.redrawBezier();
      } else {
        this.greenHint.setText("[G] 編輯綠色範圍 OFF — 按 G 切換").setColor("#fff");
        this.matter.world.enabled = true;
        if (this.bezierPoints && this.bezierPoints.length >= 3) {
          this.customGreenPoly = this.sampleClosedSpline(this.bezierPoints, 60);
          this.applyCustomGreen();
        }
        this.greenPaintGfx.clear();
      }
    });
    this.input.keyboard.on("keydown-R", () => {
      if (!this.paintingGreen) return;
      this.bezierPoints = null;
      this.initBezierPoints();
      this.redrawBezier();
    });

    // 控制點 + 拖曳
    this.bezierPoints = null;
    this.dragPointIdx = -1;
    this.input.on("pointerdown", (pointer) => {
      if (!this.paintingGreen) return;
      const x = pointer.worldX, y = pointer.worldY;
      // 找最近控制點（拖曳/刪除）
      let nearest = -1, nearestD = 22;
      for (let i = 0; i < this.bezierPoints.length; i++) {
        const p = this.bezierPoints[i];
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < nearestD) { nearestD = d; nearest = i; }
      }
      if (pointer.rightButtonDown()) {
        if (nearest >= 0 && this.bezierPoints.length > 3) {
          this.bezierPoints.splice(nearest, 1);
          this.redrawBezier();
        }
      } else if (nearest >= 0) {
        this.dragPointIdx = nearest;
      } else {
        // 新增點（插在最近的線段中間）
        let bestSeg = 0, bestDist = Infinity;
        for (let i = 0; i < this.bezierPoints.length; i++) {
          const a = this.bezierPoints[i];
          const b = this.bezierPoints[(i + 1) % this.bezierPoints.length];
          const d = this.distanceToSegment(x, y, a, b);
          if (d < bestDist) { bestDist = d; bestSeg = i + 1; }
        }
        this.bezierPoints.splice(bestSeg, 0, { x, y });
        this.redrawBezier();
      }
    });
    this.input.on("pointermove", (pointer) => {
      if (!this.paintingGreen || this.dragPointIdx < 0) return;
      this.bezierPoints[this.dragPointIdx].x = pointer.worldX;
      this.bezierPoints[this.dragPointIdx].y = pointer.worldY;
      this.redrawBezier();
    });
    this.input.on("pointerup", () => {
      this.dragPointIdx = -1;
    });
  }

  // 啟動編輯：載入預設或現有控制點
  initBezierPoints() {
    if (this.bezierPoints && this.bezierPoints.length >= 3) return;
    const n = 8;
    this.bezierPoints = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.bezierPoints.push({
        x: GREEN.cx + Math.cos(a) * GREEN.rx,
        y: GREEN.cy + Math.sin(a) * GREEN.ry,
      });
    }
  }

  distanceToSegment(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-6) return Math.hypot(px - a.x, py - a.y);
    let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
  }

  // 封閉 Catmull-Rom 樣條 → 採樣多邊形
  sampleClosedSpline(pts, totalSegs) {
    const out = [];
    const n = pts.length;
    const stepsPerSeg = Math.max(4, Math.floor(totalSegs / n));
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let s = 0; s < stepsPerSeg; s++) {
        const t = s / stepsPerSeg, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
                  (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                  (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
                  (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                  (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        out.push({ x, y });
      }
    }
    return out;
  }

  redrawBezier() {
    this.greenPaintGfx.clear();
    if (!this.bezierPoints || this.bezierPoints.length < 3) return;
    const samples = this.sampleClosedSpline(this.bezierPoints, 80);
    // 半透明填充 + 輪廓
    this.greenPaintGfx.fillStyle(0x80ffc0, 0.15);
    this.greenPaintGfx.lineStyle(4, 0x80ffc0, 0.9);
    this.greenPaintGfx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      if (i === 0) this.greenPaintGfx.moveTo(p.x, p.y);
      else this.greenPaintGfx.lineTo(p.x, p.y);
    }
    this.greenPaintGfx.closePath();
    this.greenPaintGfx.fillPath();
    this.greenPaintGfx.strokePath();
    // 控制點（粉紅）
    for (const p of this.bezierPoints) {
      this.greenPaintGfx.fillStyle(0xff80c0, 1);
      this.greenPaintGfx.fillCircle(p.x, p.y, 8);
      this.greenPaintGfx.lineStyle(2, 0xffffff, 0.9);
      this.greenPaintGfx.strokeCircle(p.x, p.y, 8);
    }
  }

  applyCustomGreen() {
    // 移除舊的橢圓邊界牆
    if (this.greenEdges) {
      for (const w of this.greenEdges) {
        this.matter.world.remove(w);
      }
      this.greenEdges = [];
    }
    // 用使用者的多邊形建立新邊界牆 — 但底部留開口讓球能掉到 アウト
    const poly = this.customGreenPoly;
    let maxY = -Infinity;
    for (const p of poly) if (p.y > maxY) maxY = p.y;
    const bottomGapY = maxY - 50;  // 底部 50px 範圍內不放牆 → 球可從底部開口落下
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (len < 1) continue;
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      // 底部開口：略過接近最底部的牆段
      if (my > bottomGapY) continue;
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const wall = this.matter.add.rectangle(mx, my, len + 8, 14, {
        isStatic: true, angle: ang, friction: 0.05, restitution: 0.45,
        label: "green-edge", render: { visible: false },
        slop: 0.01,
      });
      this.greenEdges.push(wall);
    }
    // 不畫 debug 邊界（使用者要求拿掉所有輔助線）
    if (this.greenDebug) this.greenDebug.clear();
    if (this.greenPaintGfx) this.greenPaintGfx.clear();
  }

  // ==================== 繪製發球路徑模式（按 D 切換）====================
  createDrawPathMode() {
    this.drawingPath = false;
    this.customLaunchPath = null;
    this.launchBezierPoints = null;
    this.dragLaunchIdx = -1;

    this.drawHint = this.add.text(W / 2, 100, "[D] 編輯發球線 OFF — 按 D 切換", {
      fontFamily: "DotGothic16", fontSize: "14px", color: "#fff",
      backgroundColor: "rgba(40,0,80,0.7)", padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(80).setVisible(DEV_MODE);

    this.drawingGfx = this.add.graphics().setDepth(60);

    this.input.keyboard.on("keydown-D", () => {
      if (!DEV_MODE) return;
      this.drawingPath = !this.drawingPath;
      if (this.drawingPath) {
        this.initLaunchBezier();
        // 隱藏原本的粉紅路徑，只顯示編輯中的
        if (this.launchPathGfx) this.launchPathGfx.clear();
        this.drawHint.setText("[編輯中] 拖控制點 / 點空白處新增 / 右鍵刪點 / R 重設 / D 套用")
          .setColor("#ff80c0");
        this.matter.world.enabled = false;
        this.redrawLaunchBezier();
      } else {
        this.drawHint.setText("[D] 編輯發球線 OFF — 按 D 切換").setColor("#fff");
        this.matter.world.enabled = true;
        if (this.launchBezierPoints && this.launchBezierPoints.length >= 3) {
          this.customLaunchPath = this.sampleOpenSpline(this.launchBezierPoints, 60);
          this.applyLaunchPathVisual();
        }
        this.drawingGfx.clear();
      }
    });

    this.input.keyboard.on("keydown-R", () => {
      if (!this.drawingPath) return;
      this.launchBezierPoints = null;
      this.initLaunchBezier();
      this.redrawLaunchBezier();
    });

    this.input.on("pointerdown", (pointer) => {
      if (!this.drawingPath) return;
      const x = pointer.worldX, y = pointer.worldY;
      let nearest = -1, nearestD = 22;
      for (let i = 0; i < this.launchBezierPoints.length; i++) {
        const p = this.launchBezierPoints[i];
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < nearestD) { nearestD = d; nearest = i; }
      }
      if (pointer.rightButtonDown()) {
        if (nearest >= 0 && this.launchBezierPoints.length > 3) {
          this.launchBezierPoints.splice(nearest, 1);
          this.redrawLaunchBezier();
        }
      } else if (nearest >= 0) {
        this.dragLaunchIdx = nearest;
      } else {
        let bestSeg = this.launchBezierPoints.length, bestDist = Infinity;
        for (let i = 0; i < this.launchBezierPoints.length - 1; i++) {
          const a = this.launchBezierPoints[i];
          const b = this.launchBezierPoints[i + 1];
          const d = this.distanceToSegment(x, y, a, b);
          if (d < bestDist) { bestDist = d; bestSeg = i + 1; }
        }
        this.launchBezierPoints.splice(bestSeg, 0, { x, y });
        this.redrawLaunchBezier();
      }
    });
    this.input.on("pointermove", (pointer) => {
      if (!this.drawingPath || this.dragLaunchIdx < 0) return;
      this.launchBezierPoints[this.dragLaunchIdx].x = pointer.worldX;
      this.launchBezierPoints[this.dragLaunchIdx].y = pointer.worldY;
      this.redrawLaunchBezier();
    });
    this.input.on("pointerup", () => {
      this.dragLaunchIdx = -1;
    });
  }

  initLaunchBezier() {
    if (this.launchBezierPoints && this.launchBezierPoints.length >= 3) return;
    this.launchBezierPoints = this.makeLaunchPath().map(p => ({ x: p.x, y: p.y }));
  }

  // 開放路徑樣條採樣（不封閉）
  sampleOpenSpline(pts, totalSegs) {
    const out = [];
    const n = pts.length;
    if (n < 2) return pts.slice();
    if (n === 2) return pts.slice();
    const stepsPerSeg = Math.max(4, Math.floor(totalSegs / (n - 1)));
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(n - 1, i + 2)];
      for (let s = 0; s < stepsPerSeg; s++) {
        const t = s / stepsPerSeg, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
                  (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                  (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
                  (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                  (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        out.push({ x, y });
      }
    }
    out.push({ x: pts[n - 1].x, y: pts[n - 1].y });
    return out;
  }

  redrawLaunchBezier() {
    this.drawingGfx.clear();
    if (!this.launchBezierPoints || this.launchBezierPoints.length < 2) return;
    const samples = this.sampleOpenSpline(this.launchBezierPoints, 80);
    this.drawingGfx.lineStyle(10, 0xff80c0, 0.35);
    this.drawingGfx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      if (i === 0) this.drawingGfx.moveTo(p.x, p.y);
      else this.drawingGfx.lineTo(p.x, p.y);
    }
    this.drawingGfx.strokePath();
    this.drawingGfx.lineStyle(4, 0xff80c0, 1);
    this.drawingGfx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      if (i === 0) this.drawingGfx.moveTo(p.x, p.y);
      else this.drawingGfx.lineTo(p.x, p.y);
    }
    this.drawingGfx.strokePath();
    for (const p of this.launchBezierPoints) {
      this.drawingGfx.fillStyle(0xffffff, 1);
      this.drawingGfx.fillCircle(p.x, p.y, 8);
      this.drawingGfx.lineStyle(2, 0xff80c0, 1);
      this.drawingGfx.strokeCircle(p.x, p.y, 8);
    }
  }

  applyLaunchPathVisual() {
    if (!this.launchPathGfx || !this.customLaunchPath) return;
    this.launchPathGfx.clear();
    this.launchPathGfx.lineStyle(10, 0xff80c0, 0.35);
    this.launchPathGfx.beginPath();
    for (let i = 0; i < this.customLaunchPath.length; i++) {
      const p = this.customLaunchPath[i];
      if (i === 0) this.launchPathGfx.moveTo(p.x, p.y);
      else this.launchPathGfx.lineTo(p.x, p.y);
    }
    this.launchPathGfx.strokePath();
    this.launchPathGfx.lineStyle(4, 0xff80c0, 1);
    this.launchPathGfx.beginPath();
    for (let i = 0; i < this.customLaunchPath.length; i++) {
      const p = this.customLaunchPath[i];
      if (i === 0) this.launchPathGfx.moveTo(p.x, p.y);
      else this.launchPathGfx.lineTo(p.x, p.y);
    }
    this.launchPathGfx.strokePath();
  }

  // ==================== 匯出 textarea ====================
  showExportTextarea(txt) {
    let ta = document.getElementById("export-ta");
    if (!ta) {
      const wrap = document.createElement("div");
      wrap.id = "export-wrap";
      wrap.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);" +
        "z-index:99999;background:#000;border:2px solid #f5c542;padding:12px;" +
        "max-width:90vw;max-height:80vh;display:flex;flex-direction:column;gap:8px;";
      const hint = document.createElement("div");
      hint.style.cssText = "color:#f5c542;font-family:monospace;font-size:12px;";
      hint.innerHTML = "✅ 已自動全選 — 按 <b>Cmd/Ctrl + C</b> 複製<br>關閉視窗：點 [關閉] 或按 ESC";
      wrap.appendChild(hint);
      ta = document.createElement("textarea");
      ta.id = "export-ta";
      ta.style.cssText = "width:80vw;height:60vh;background:#0a0014;color:#fff;" +
        "border:1px solid #b8860b;font-family:monospace;font-size:12px;padding:10px;";
      wrap.appendChild(ta);
      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy";
      copyBtn.style.cssText = "padding:6px 16px;background:#f5c542;color:#000;border:none;" +
        "font-weight:bold;cursor:pointer;border-radius:4px;";
      copyBtn.onclick = () => {
        ta.select();
        try { navigator.clipboard.writeText(ta.value); copyBtn.textContent = "Copied!"; }
        catch(e) { document.execCommand("copy"); copyBtn.textContent = "Copied!"; }
        setTimeout(() => copyBtn.textContent = "Copy", 1500);
      };
      btnRow.appendChild(copyBtn);
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "關閉";
      closeBtn.style.cssText = "padding:6px 16px;background:#444;color:#fff;border:none;" +
        "cursor:pointer;border-radius:4px;";
      closeBtn.onclick = () => this.hideExportTextarea();
      btnRow.appendChild(closeBtn);
      wrap.appendChild(btnRow);
      document.body.appendChild(wrap);
      // ESC 關閉
      this._escHandler = (e) => { if (e.key === "Escape") this.hideExportTextarea(); };
      window.addEventListener("keydown", this._escHandler);
    }
    ta.value = txt;
    ta.focus();
    ta.select();
  }
  hideExportTextarea() {
    const wrap = document.getElementById("export-wrap");
    if (wrap) wrap.remove();
    if (this._escHandler) {
      window.removeEventListener("keydown", this._escHandler);
      this._escHandler = null;
    }
  }

  // ==================== 編輯模式（按 E 切換）====================
  createEditMode() {
    this.editMode = false;
    this.editLabel = this.add.text(W / 2, 70, "[E] 編輯模式 OFF — 按 E 切換", {
      fontFamily: "DotGothic16", fontSize: "14px", color: "#fff",
      backgroundColor: "rgba(0,0,0,0.55)", padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(80).setVisible(DEV_MODE);

    // 風車 + 三個入賞口都可拖曳
    [this.windmillSprite, this.pocketSprites.heso,
     this.pocketSprites.sideL, this.pocketSprites.sideR].forEach(spr => {
      spr.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(spr);
    });

    // E 鍵切換編輯模式
    this.input.keyboard.on("keydown-E", () => {
      if (!DEV_MODE) return;
      this.editMode = !this.editMode;
      this.editLabel.setText(this.editMode
        ? "[編輯中] 左鍵+空白處=放釘  右鍵釘子=移除  拖曳風車=移位  按 E 結束 / 按 P 列印 JSON"
        : "[E] 編輯模式 OFF — 按 E 切換");
      this.editLabel.setColor(this.editMode ? "#ffd166" : "#fff");
      // 編輯時暫停物理
      this.matter.world.enabled = !this.editMode;
    });

    // 輸出 JSON 用的文字框
    this.exportBox = this.add.text(W / 2, H / 2, "", {
      fontFamily: "monospace", fontSize: "11px", color: "#fff",
      backgroundColor: "rgba(0,0,0,0.92)", padding: { x: 14, y: 12 },
      wordWrap: { width: W - 80 },
    }).setOrigin(0.5).setDepth(200).setVisible(false);

    const buildExportText = () => {
      try {
        const nailsArr = this.nails.map(n =>
          `[${Math.round(n.body.position.x)}, ${Math.round(n.body.position.y)}]`
        );
        let txt = "// === 排好的配置（複製整段給 Claude）===\n" +
          "WINDMILL = { x: " + Math.round(this.windmillSprite.x) +
                    ", y: " + Math.round(this.windmillSprite.y) + " };\n" +
          "HESO  = { x: " + Math.round(this.pocketSprites.heso.x) +
                  ", y: " + Math.round(this.pocketSprites.heso.y) + " };\n" +
          "SIDEL = { x: " + Math.round(this.pocketSprites.sideL.x) +
                  ", y: " + Math.round(this.pocketSprites.sideL.y) + " };\n" +
          "SIDER = { x: " + Math.round(this.pocketSprites.sideR.x) +
                  ", y: " + Math.round(this.pocketSprites.sideR.y) + " };\n" +
          "NAILS = [\n  " + nailsArr.join(",\n  ") + "\n];\n";
        if (this.bezierPoints && this.bezierPoints.length >= 3) {
          const bzArr = this.bezierPoints.map(p =>
            `{ x: ${Math.round(p.x)}, y: ${Math.round(p.y)} }`
          );
          txt += "GREEN_BEZIER = [\n  " + bzArr.join(",\n  ") + "\n];\n";
        }
        if (this.launchBezierPoints && this.launchBezierPoints.length >= 3) {
          const lbArr = this.launchBezierPoints.map(p =>
            `{ x: ${Math.round(p.x)}, y: ${Math.round(p.y)} }`
          );
          txt += "LAUNCH_BEZIER = [\n  " + lbArr.join(",\n  ") + "\n];";
        }
        return txt;
      } catch (e) {
        return "// 匯出時發生錯誤: " + e.message;
      }
    };
    this.exportTextBuilder = buildExportText;

    // P 鍵
    this.input.keyboard.on("keydown-P", () => {
      if (!DEV_MODE) return;
      const txt = buildExportText();
      console.log(txt);
      this.showExportTextarea(txt);
    });
    // 畫面上的 EXPORT 按鈕（永遠可點，比按 P 可靠）
    this.exportBtn = this.add.text(W - 60, 170, "📋 匯出 P", {
      fontFamily: "DotGothic16", fontSize: "14px", color: "#fff",
      backgroundColor: "rgba(0,80,40,0.85)", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(80).setVisible(DEV_MODE).setInteractive({ useHandCursor: true });
    this.exportBtn.on("pointerdown", () => {
      const txt = buildExportText();
      console.log(txt);
      this.showExportTextarea(txt);
    });
    this.input.keyboard.on("keydown-X", () => {
      if (this.exportBox) this.exportBox.setVisible(false);
      this.hideExportTextarea();
    });

    // 滑鼠點擊：左鍵加釘、右鍵移除最近的釘
    this.input.on("pointerdown", (pointer) => {
      if (!this.editMode) return;
      const x = pointer.worldX, y = pointer.worldY;
      // 編輯時忽略對 windmill 物件的 click（讓它走 drag）
      if (this.windmillSprite.getBounds().contains(x, y)) return;
      if (pointer.rightButtonDown()) {
        // 移除最近 24 px 內的釘
        let best = -1, bestD = 24;
        for (let i = 0; i < this.nails.length; i++) {
          const n = this.nails[i];
          const d = Math.hypot(n.sprite.x - x, n.sprite.y - y);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (best >= 0) {
          this.matter.world.remove(this.nails[best].body);
          this.nails[best].sprite.destroy();
          this.nails.splice(best, 1);
        }
      } else {
        // 左鍵：在綠色範圍且不在 LCD 內就加
        if (!this.inGreen(x, y) || this.inLCD(x, y)) return;
        this.addNail(x, y);
      }
    });

    // 拖曳風車 / 入賞口
    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (!this.editMode) return;
      const allowed = [this.windmillSprite, this.pocketSprites.heso,
                       this.pocketSprites.sideL, this.pocketSprites.sideR];
      if (!allowed.includes(gameObject)) return;
      gameObject.setPosition(dragX, dragY);
      // 同步更新 POCKETS 邏輯位置（讓物理偵測跟著動）
      if (gameObject === this.pocketSprites.heso) {
        POCKETS.heso.x = dragX; POCKETS.heso.y = dragY;
      } else if (gameObject === this.pocketSprites.sideL) {
        POCKETS.sideL.x = dragX; POCKETS.sideL.y = dragY;
      } else if (gameObject === this.pocketSprites.sideR) {
        POCKETS.sideR.x = dragX; POCKETS.sideR.y = dragY;
      }
    });

    // 防止瀏覽器右鍵選單
    this.game.canvas.addEventListener("contextmenu", e => e.preventDefault());
  }

  // ==================== SP 演出 overlay ====================
  createSPOverlay() {
    this.spDim = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.85)
      .setDepth(95).setVisible(false);
    this.spImg = this.add.image(W/2, H/2, "fx_gekiatsu")
      .setDisplaySize(W * 0.95, W * 0.95 * 506 / 900)
      .setDepth(96).setVisible(false);
  }

  showSp(type) {
    const map = {
      reach: "fx_reach", gekiatsu: "fx_gekiatsu",
      jackpot: "fx_jackpot",
    };
    this.spImg.setTexture(map[type] || "fx_reach");
    this.spDim.setVisible(true);
    this.spImg.setVisible(true);
    this.spImg.setScale(0.2).setAngle(-12).setAlpha(0);
    this.tweens.add({
      targets: this.spImg,
      scale: { from: 0.2, to: 1 },
      angle: { from: -12, to: 0 },
      alpha: { from: 0, to: 1 },
      duration: 600, ease: "Back.easeOut",
    });
    const dur = type === "jackpot" ? 2200 : 1400;
    this.time.delayedCall(dur, () => {
      this.tweens.add({
        targets: [this.spImg, this.spDim],
        alpha: 0, duration: 200,
        onComplete: () => {
          this.spImg.setVisible(false);
          this.spDim.setVisible(false).setAlpha(0.85);
        },
      });
    });
  }

  // ==================== 音效（Web Audio 合成）====================
  createAudio() {
    let actx = null;
    const ensure = () => actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
    const tone = (f, dur = 0.08, type = "sine", vol = 0.18, slide = 0) => {
      const ac = ensure();
      if (ac.state === "suspended") ac.resume();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g).connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur);
    };
    const noise = (dur = 0.06, vol = 0.1, hp = 800) => {
      const ac = ensure();
      const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
      const g = ac.createGain(); g.gain.value = vol;
      src.connect(f).connect(g).connect(ac.destination);
      src.start();
    };
    this.audio = {
      fire: () => tone(220, 0.05, "square", 0.12, 200),
      nail: () => noise(0.03, 0.05, 2400),
      pocket: () => { tone(600, 0.08, "sine", 0.15); setTimeout(() => tone(900, 0.1, "sine", 0.15), 60); },
      start: () => [400, 500, 600].forEach((f, i) => setTimeout(() => tone(f, 0.1, "triangle", 0.18), i * 60)),
      reach: () => { for (let i = 0; i < 8; i++) setTimeout(() => tone(400 + i * 50, 0.06, "sawtooth", 0.1, 100), i * 70); },
      jackpot: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.22), i * 100)),
      spin: () => tone(180 + Math.random() * 200, 0.04, "square", 0.05),
    };
  }

  // ==================== 球 ====================
  fire() {
    if (this.state.balls <= 0) return;
    this.state.balls--;
    this.syncHud();
    this.spawnBall(this.power || 60);
  }

  makeLaunchPath() {
    // 若有 LAUNCH_BEZIER 預設值，球從第一個貝茲點開始（不經過控制器）
    if (typeof LAUNCH_BEZIER !== "undefined" && LAUNCH_BEZIER && LAUNCH_BEZIER.length >= 3) {
      return this.sampleOpenSpline(LAUNCH_BEZIER.map(p => ({ x: p.x, y: p.y })), 60);
    }
    const path = [
      { x: 672, y: 939 },
      { x: 640, y: 850 },
      { x: 620, y: 730 },
    ];
    // 右側直線（x=620 固定）— 從 y=730 直線上升到 y=280
    for (let y = 700; y >= 280; y -= 60) {
      path.push({ x: 620, y });
    }
    // 圓弧繞 LCD 上方（弧心 LCD 中央，半徑 ~225）
    const arcCx = 398, arcCy = 280, arcR = 222;
    // 從右側 angle ≈ 0（指向右）逆時針到 π（指向左）
    const arcSegs = 8;
    for (let i = 1; i <= arcSegs; i++) {
      const a = (i / arcSegs) * Math.PI;  // 0 → π
      const x = arcCx + Math.cos(a) * arcR;
      const y = arcCy - Math.sin(a) * arcR * 0.55;  // 縱向壓縮成扁圓弧
      path.push({ x, y });
    }
    // 左側直線（x=180）— 從 y=280 直線下降到 y=380
    path.push({ x: 180, y: 320 });
    path.push({ x: 180, y: 400 });  // 終點：LCD 左下方（綠色內）
    return path;
  }

  spawnBall(power) {
    const fullPath = (this.customLaunchPath && this.customLaunchPath.length >= 3)
      ? this.customLaunchPath : this.makeLaunchPath(power);
    // 力度決定球在軌道上能走多遠（弱發射 → 早離開軌道掉下；強發射 → 完整繞過去）
    const p = Math.max(0, Math.min(100, power));
    const portion = 0.35 + p * 0.0065;  // 弱 0.35 / 強 1.0
    const cutLen = Math.max(2, Math.floor(fullPath.length * portion));
    const path = fullPath.slice(0, cutLen);
    // 動畫時長隨距離成比例（球速一致）
    const duration = 800 * portion + 300;
    this.launching.push({ path, t: 0, duration, power, sprite: null });
    if (this.audio) this.audio.fire();
  }

  pathPoint(s, path) {
    const segs = path.length - 1;
    const i = Math.min(segs - 1, Math.floor(s * segs));
    const t = s * segs - i;
    const p0 = path[Math.max(0, i - 1)];
    const p1 = path[i];
    const p2 = path[i + 1];
    const p3 = path[Math.min(segs, i + 2)];
    const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * t +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * t * t);
    const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t);
    return { x, y };
  }

  createBallBody(x, y, vx, vy) {
    const ball = this.matter.add.image(x, y, "whiteball", null, {
      shape: { type: "circle", radius: 9 },
      restitution: 0.45, friction: 0.005, frictionAir: 0.002,
      density: 0.05, label: "ball",
    });
    ball.setDisplaySize(20, 20).setDepth(25);
    ball.setVelocity(vx, vy);
    this.balls.push(ball);
    this.ballTrails.set(ball, []);
    return ball;
  }

  // ==================== 主迴圈：更新發射動畫、軌跡、入賞偵測 ====================
  update(time, delta) {
    // 風車旋轉
    if (this.windmillSprite) this.windmillSprite.rotation += 0.04;

    // 燈條閃爍 (tween 自動)

    // 發射動畫
    for (let i = this.launching.length - 1; i >= 0; i--) {
      const L = this.launching[i];
      L.t += delta;
      const s = Math.min(1, L.t / L.duration);
      const p = this.pathPoint(s, L.path);
      if (!L.sprite) {
        L.sprite = this.add.image(p.x, p.y, "whiteball").setDisplaySize(20, 20).setDepth(25);
      }
      L.sprite.setPosition(p.x, p.y);
      if (s >= 1) {
        L.sprite.destroy();
        const exit = L.path[L.path.length - 1];
        // 把球的生成點往綠色範圍中心偏移 18px，避免跟邊界牆重疊
        let sx = exit.x, sy = exit.y;
        if (this.customGreenPoly) {
          let cx = 0, cy = 0;
          for (const p of this.customGreenPoly) { cx += p.x; cy += p.y; }
          cx /= this.customGreenPoly.length;
          cy /= this.customGreenPoly.length;
          const dx = cx - sx, dy = cy - sy;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            sx += dx / len * 22;
            sy += dy / len * 22;
          }
        }
        const vx = L.power * 0.04 + (Math.random() - 0.5) * 0.4;
        const vy = 0.5;
        this.createBallBody(sx, sy, vx, vy);
        this.launching.splice(i, 1);
      }
    }

    // 球軌跡（用 graphics 繪製）
    if (this.trailGfx) {
      this.trailGfx.clear();
      for (const b of this.balls) {
        const t = this.ballTrails.get(b);
        if (!t) continue;
        for (let k = 0; k < t.length - 1; k++) {
          const a = (k + 1) / t.length;
          this.trailGfx.lineStyle(2 + 2 * a, 0xffe070, a * 0.7);
          this.trailGfx.beginPath();
          this.trailGfx.moveTo(t[k].x, t[k].y);
          this.trailGfx.lineTo(t[k + 1].x, t[k + 1].y);
          this.trailGfx.strokePath();
        }
      }
    }

    // 入賞偵測 + 球軌跡更新
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      let t = this.ballTrails.get(b);
      if (t) {
        t.push({ x: b.x, y: b.y });
        if (t.length > 18) t.shift();
      }
      // 落入入賞口判定
      const pk = this.checkPocket(b.x, b.y);
      if (pk) {
        this.handlePocket(pk);
        b.destroy();
        this.balls.splice(i, 1);
        continue;
      }
      // アウト 或飛出邊界
      if (b.y > OUT_Y || b.x < -30 || b.x > W + 30) {
        b.destroy();
        this.balls.splice(i, 1);
      }
    }
  }

  checkPocket(x, y) {
    const tests = [
      { name: "heso",  rect: POCKETS.heso, type: "heso" },
      { name: "sideL", rect: POCKETS.sideL, type: "side" },
      { name: "sideR", rect: POCKETS.sideR, type: "side" },
    ];
    for (const t of tests) {
      const r = t.rect;
      if (x > r.x - r.w / 2 && x < r.x + r.w / 2 &&
          y > r.y - r.h / 2 && y < r.y + r.h / 2) {
        return t;
      }
    }
    return null;
  }

  handlePocket(pk) {
    if (pk.type === "heso") {
      this.state.balls += 3;
      if (this.audio) this.audio.start();
      this.doSpin(false);
    } else if (pk.type === "side") {
      this.state.balls += 5;
      if (this.audio) this.audio.start();
      this.doSpin(false);
    }
    if (this.audio) this.audio.pocket();
    this.syncHud();
    // 入賞口閃光（以記錄的 base scale 為基準，避免累積放大）
    const sprite = this.pocketSprites[pk.name];
    if (sprite && sprite._baseScaleX) {
      this.tweens.killTweensOf(sprite);
      sprite.setScale(sprite._baseScaleX * 1.25, sprite._baseScaleY * 1.25);
      this.tweens.add({
        targets: sprite,
        scaleX: sprite._baseScaleX,
        scaleY: sprite._baseScaleY,
        duration: 250,
      });
    }
  }

  // ==================== 抽選 ====================
  doSpin(forceJackpot = false) {
    if (this.state.spinning) {
      if (this.state.holds.length < 4) {
        this.state.holds.push({ forceJackpot });
        this.syncHud();
      }
      return;
    }
    this.state.spinning = true;
    this.state.spins++;
    this.syncHud();

    const baseProb = this.state.fever ? 1 / 30 : 1 / 100;
    const win = forceJackpot || Math.random() < baseProb;

    this.setMood("spin");

    let elapsed = 0;
    const total = win ? 2800 : 1100;
    const tick = this.time.addEvent({
      delay: 60, loop: true,
      callback: () => {
        elapsed += 60;
        if (this.audio) this.audio.spin();
        this.digits.forEach(d => d.setFrame(Math.floor(Math.random() * 10)));

        if (win && elapsed > 1000 && elapsed < 2700) {
          this.digits[0].setFrame(7);
          this.digits[1].setFrame(7);
          if (this.state.mode !== "リーチ") {
            this.state.mode = "リーチ";
            this.lcdMessage.setText("★ リーチ ★").setAlpha(1);
            this.setMood("reach");
            if (this.audio) this.audio.reach();
            this.cameras.main.shake(600, 0.005);
            this.syncHud();
            // 50% SP 演出
            if (Math.random() < 0.5) this.showSp(win ? "gekiatsu" : "reach");
          }
        }

        if (elapsed >= total) {
          tick.remove();
          if (win) {
            this.digits.forEach(d => d.setFrame(7));
            this.onJackpot();
          } else {
            const final = Math.floor(Math.random() * 9) + 1;
            this.digits[0].setFrame(final);
            this.digits[1].setFrame(final);
            this.digits[2].setFrame((final + 1) % 10);
            this.state.mode = this.state.fever ? "確変 RUSH" : "通常";
            this.lcdMessage.setAlpha(0);
            this.state.spinning = false;
            this.setMood("idle");
            this.syncHud();
            this.consumeHold();
          }
        }
      },
    });
  }

  onJackpot() {
    this.state.jackpots++;
    this.state.balls += 100;
    this.state.fever = true;
    this.state.feverRounds = 10;
    this.state.mode = "大当!!";
    this.lcdMessage.setText("★ 大 当 ★").setAlpha(1);
    this.setMood("jackpot");
    this.showSp("jackpot");
    if (this.audio) this.audio.jackpot();
    this.cameras.main.shake(800, 0.02);
    this.cameras.main.flash(500, 255, 255, 255);
    // LCD bg → 確変 城市
    this.lcdBg.setTexture("lcd_fever");
    // 金幣雨
    this.add.particles(W/2, H * 0.3, "coin", {
      speed: { min: 200, max: 500 },
      angle: { min: 230, max: 310 },
      scale: { start: 0.05, end: 0.04 },
      lifespan: 1500,
      gravityY: 800,
      quantity: 60, frequency: -1,
    }).explode(60);

    this.syncHud();
    this.time.delayedCall(3000, () => {
      this.state.spinning = false;
      this.state.mode = "確変 RUSH";
      this.setMood("idle");
      this.syncHud();
      this.consumeHold();
    });
  }

  consumeHold() {
    if (this.state.fever && !this.state.spinning) {
      this.state.feverRounds--;
      if (this.state.feverRounds <= 0) {
        this.state.fever = false;
        this.state.mode = "通常";
        this.lcdBg.setTexture("lcd_idle");
        this.syncHud();
      }
    }
    if (this.state.holds.length === 0) return;
    const next = this.state.holds.shift();
    this.syncHud();
    this.time.delayedCall(200, () => this.doSpin(next.forceJackpot));
  }

  resetGame() {
    this.state.balls = 1000;
    this.state.spins = 0;
    this.state.jackpots = 0;
    this.state.mode = "通常";
    this.state.fever = false;
    this.state.spinning = false;
    this.state.holds.length = 0;
    this.balls.forEach(b => b.destroy());
    this.balls = [];
    this.launching.forEach(L => L.sprite && L.sprite.destroy());
    this.launching = [];
    this.lcdBg.setTexture("lcd_idle");
    this.lcdMessage.setAlpha(0);
    this.digits.forEach(d => d.setFrame(7));
    this.setMood("idle");
    this.syncHud();
  }

  onCollision(event) {
    for (const pair of event.pairs) {
      const aLabel = pair.bodyA.label, bLabel = pair.bodyB.label;
      if ((aLabel === "ball" && bLabel === "nail") ||
          (aLabel === "nail" && bLabel === "ball")) {
        if (this.audio && this._lastNailSound !== undefined &&
            performance.now() - this._lastNailSound < 35) continue;
        if (this.audio) this.audio.nail();
        this._lastNailSound = performance.now();
      }
    }
  }
}

// === Game 設定 ===
const config = {
  type: Phaser.AUTO,
  parent: "app",
  width: W, height: H,
  backgroundColor: "#0a0014",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: false,
    },
  },
  // 失去焦點時不要暫停遊戲（避免在 preview iframe 內被卡住）
  disableVisibilityChange: true,
  scene: GameScene,
};

const game = new Phaser.Game(config);
window.game = game;
window.getScene = () => game.scene.getScene("game");
