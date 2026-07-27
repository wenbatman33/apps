// 老虎機機台 — 現代曲面直屏款（全部用 Three.js 幾何 + Canvas 貼圖程序化生成）
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SYMBOLS = ['🍒', '🔔', '💎', '7️⃣', '⭐', '🍀', '👑', '🍋'];

// J 型曲面板：底部貼平、越往上越往 +Z 掠出（rotation.y = π 後即朝玩家方向掠出）
// 模擬現代曲面機台（Aristocrat 曲屏那種大弧面）
function makeCurvedPlane(w, h, sweep, segments = 24) {
  const geo = new THREE.PlaneGeometry(w, h, 1, segments);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) / h) + 0.5;   // 0(底)..1(頂)
    pos.setZ(i, sweep * t * t);          // 二次曲線：頂端掠出 sweep 深度
  }
  geo.computeVertexNormals();
  return geo;
}

// 共用幾何（所有機台共享，省記憶體）
let sharedGeo = null;
function getSharedGeo() {
  if (sharedGeo) return sharedGeo;
  sharedGeo = {
    plinth: new RoundedBoxGeometry(1.18, 0.14, 0.78, 2, 0.03),
    body:   new RoundedBoxGeometry(1.05, 2.4, 0.62, 4, 0.06),
    backing: makeCurvedPlane(1.08, 1.78, 0.36),
    screen: makeCurvedPlane(0.94, 1.7, 0.36),
    ledSide: makeCurvedPlane(0.07, 1.74, 0.36),
    ledCap: new THREE.BoxGeometry(1.08, 0.05, 0.06),
    belly:  new THREE.PlaneGeometry(0.9, 0.42),
    topper: new RoundedBoxGeometry(1.06, 0.42, 0.16, 3, 0.05),
    crown:  new THREE.CylinderGeometry(0.09, 0.13, 0.1, 16),
    deck:   new RoundedBoxGeometry(0.95, 0.07, 0.3, 2, 0.02),
    button: new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20),
    strip:  new THREE.BoxGeometry(0.035, 2.45, 0.035),
    seatTop: new THREE.CylinderGeometry(0.26, 0.3, 0.09, 24),
    seatLeg: new THREE.CylinderGeometry(0.05, 0.07, 0.52, 12),
    seatBase: new THREE.CylinderGeometry(0.2, 0.24, 0.04, 20),
  };
  return sharedGeo;
}

// 頂牌：遊戲名稱霓虹字
function makeTopperTexture(cfg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, '#241028');
  grad.addColorStop(1, '#0d0511');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 200);
  g.strokeStyle = cfg.accent;
  g.lineWidth = 6;
  g.globalAlpha = 0.9;
  g.strokeRect(10, 10, 492, 180);
  g.globalAlpha = 1;
  g.font = 'bold 86px "PingFang TC", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = cfg.color;
  g.shadowBlur = 32;
  g.fillStyle = cfg.accent;
  g.fillText(cfg.name, 256, 102);
  g.shadowBlur = 10;
  g.fillText(cfg.name, 256, 102);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 下側小海報：主題圖案
function makeBellyTexture(cfg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 240;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 120, 20, 256, 120, 280);
  grad.addColorStop(0, cfg.color);
  grad.addColorStop(1, '#0c0410');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 240);
  g.globalAlpha = 0.15;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 14;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(256, 120);
    g.lineTo(256 + Math.cos(a) * 320, 120 + Math.sin(a) * 320);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.font = '110px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 18;
  g.fillText(cfg.icon, 256, 124);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 曲面直屏內容：上 logo、中 3x3 轉輪、下 JACKPOT 金額
function makeReelScreen(cfg, seed) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 672;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const speeds = [0.9 + (seed % 3) * 0.25, 1.15 + (seed % 5) * 0.18, 0.75 + (seed % 7) * 0.22];
  const CELL = 112;
  const baseJackpot = 3000 + (seed * 977) % 6000;

  function draw(time, speedMul, winFlash) {
    // 背景
    g.fillStyle = '#0a0614';
    g.fillRect(0, 0, 384, 672);

    // ── 頂部遊戲 logo 區 ──
    const hg = g.createLinearGradient(0, 0, 0, 96);
    hg.addColorStop(0, cfg.color);
    hg.addColorStop(1, '#160a1e');
    g.fillStyle = hg;
    g.fillRect(0, 0, 384, 96);
    g.font = 'bold 46px "PingFang TC", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = cfg.color;
    g.shadowBlur = 18;
    g.fillStyle = '#ffffff';
    g.fillText(`${cfg.icon} ${cfg.name}`, 192, 50);
    g.shadowBlur = 0;

    // ── 中段 3x3 轉輪 ──
    for (let r = 0; r < 3; r++) {
      const x0 = 10 + r * 124;
      const w = 116;
      const rg = g.createLinearGradient(0, 104, 0, 540);
      rg.addColorStop(0, '#241a38');
      rg.addColorStop(0.5, '#3c2e58');
      rg.addColorStop(1, '#241a38');
      g.fillStyle = rg;
      g.fillRect(x0, 104, w, 436);
      const off = (time * speeds[r] * speedMul * 90 + seed * 37) % CELL;
      g.save();
      g.beginPath();
      g.rect(x0, 104, w, 436);
      g.clip();
      g.font = '58px sans-serif';
      for (let i = -1; i < 5; i++) {
        const idx = (Math.floor(time * speeds[r] * speedMul * 90 / CELL) + i + seed * (r + 3)) % SYMBOLS.length;
        const sym = SYMBOLS[(idx + SYMBOLS.length) % SYMBOLS.length];
        g.fillText(sym, x0 + w / 2, 104 + i * CELL + off + 56);
      }
      g.restore();
    }
    // 中獎線
    g.strokeStyle = winFlash > 0 ? `rgba(255,220,80,${0.5 + 0.5 * Math.sin(time * 20)})` : 'rgba(255,180,80,0.4)';
    g.lineWidth = winFlash > 0 ? 5 : 2;
    g.beginPath();
    g.moveTo(6, 322);
    g.lineTo(378, 322);
    g.stroke();

    // ── 底部 JACKPOT 金額 ──
    g.fillStyle = '#120a1c';
    g.fillRect(0, 548, 384, 124);
    g.strokeStyle = 'rgba(255, 200, 100, 0.45)';
    g.lineWidth = 2;
    g.strokeRect(8, 556, 368, 108);
    g.font = 'bold 26px Georgia, serif';
    g.fillStyle = '#ffd166';
    g.shadowColor = '#ff8c00';
    g.shadowBlur = 10;
    g.fillText('✦ JACKPOT ✦', 192, 580);
    const amount = baseJackpot + time * 2.3;
    g.font = '900 44px Georgia, serif';
    g.fillStyle = '#ffe6a3';
    g.shadowBlur = 16;
    g.fillText('$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 192, 628);
    g.shadowBlur = 0;

    // 中獎全螢幕閃光
    if (winFlash > 0) {
      g.fillStyle = `rgba(255, 215, 100, ${0.25 * Math.abs(Math.sin(time * 14))})`;
      g.fillRect(0, 0, 384, 672);
      g.font = 'bold 64px "PingFang TC", sans-serif';
      g.fillStyle = '#ffe066';
      g.shadowColor = '#ff8c00';
      g.shadowBlur = 30;
      g.fillText('★ WIN ★', 192, 330);
      g.shadowBlur = 0;
    }
    tex.needsUpdate = true;
  }
  return { texture: tex, draw };
}

// 建立一台完整機台（含椅子），正面為本地 -Z，由外層旋轉朝向
export function buildMachine(cfg, index) {
  const geo = getSharedGeo();
  const group = new THREE.Group();
  const themeColor = new THREE.Color(cfg.color);
  const accentColor = new THREE.Color(cfg.accent);

  // 底座
  const plinth = new THREE.Mesh(geo.plinth, new THREE.MeshStandardMaterial({
    color: 0x0e0c14, metalness: 0.7, roughness: 0.4,
  }));
  plinth.position.y = 0.07;
  group.add(plinth);

  // 修長機身
  const body = new THREE.Mesh(geo.body, new THREE.MeshStandardMaterial({
    color: 0x14101c, metalness: 0.7, roughness: 0.3,
  }));
  body.position.y = 1.32;
  group.add(body);

  // J 弧背板（深色，撐出曲屏厚度）
  const backing = new THREE.Mesh(geo.backing, new THREE.MeshStandardMaterial({
    color: 0x090711, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide,
  }));
  backing.position.set(0, 1.8, -0.3);
  backing.rotation.y = Math.PI;
  group.add(backing);

  // J 型曲面大屏：底部貼機身、頂部往玩家方向掠出
  const screen = makeReelScreen(cfg, index + 1);
  const screenMesh = new THREE.Mesh(geo.screen, new THREE.MeshBasicMaterial({ map: screen.texture }));
  screenMesh.position.set(0, 1.8, -0.33);
  screenMesh.rotation.y = Math.PI;
  group.add(screenMesh);

  // 沿弧邊的 LED 燈帶（主題色呼吸）
  const stripMat = new THREE.MeshStandardMaterial({
    color: themeColor, emissive: themeColor, emissiveIntensity: 1.6,
    metalness: 0.1, roughness: 0.4, side: THREE.DoubleSide,
  });
  for (const sx of [-0.52, 0.52]) {
    const led = new THREE.Mesh(geo.ledSide, stripMat);
    led.position.set(sx, 1.8, -0.335);
    led.rotation.y = Math.PI;
    group.add(led);
  }
  // 頂端（跟著掠出位置）與底端封邊
  const capTop = new THREE.Mesh(geo.ledCap, stripMat);
  capTop.position.set(0, 2.66, -0.33 - 0.35);
  capTop.rotation.x = -0.35;
  group.add(capTop);
  const capBot = new THREE.Mesh(geo.ledCap, stripMat);
  capBot.position.set(0, 0.94, -0.34);
  group.add(capBot);

  // 機身兩側直立 LED 燈條
  for (const sx of [-0.55, 0.55]) {
    const strip = new THREE.Mesh(geo.strip, stripMat);
    strip.position.set(sx, 1.4, -0.28);
    group.add(strip);
  }

  // 下側主題小海報
  const belly = new THREE.Mesh(geo.belly, new THREE.MeshBasicMaterial({ map: makeBellyTexture(cfg) }));
  belly.position.set(0, 0.52, -0.318);
  belly.rotation.y = Math.PI;
  group.add(belly);

  // 按鈕檯
  const deck = new THREE.Mesh(geo.deck, new THREE.MeshStandardMaterial({
    color: 0x201a2c, metalness: 0.6, roughness: 0.35,
  }));
  deck.position.set(0, 0.92, -0.44);
  deck.rotation.x = 0.35;
  group.add(deck);
  const btnColors = [0xff4060, 0xffc040, 0x40ff90];
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(geo.button, new THREE.MeshStandardMaterial({
      color: btnColors[i], emissive: btnColors[i], emissiveIntensity: 0.9,
      metalness: 0.2, roughness: 0.3,
    }));
    btn.position.set((i - 1) * 0.24, 0.96, -0.49);
    btn.rotation.x = 0.35;
    group.add(btn);
  }

  // 頂牌 + 頂燈
  const topperTex = makeTopperTexture(cfg);
  const topper = new THREE.Mesh(geo.topper, new THREE.MeshStandardMaterial({
    color: 0xffffff, map: topperTex,
    emissive: 0xffffff, emissiveMap: topperTex, emissiveIntensity: 1.1,
    metalness: 0.2, roughness: 0.5,
  }));
  topper.position.set(0, 2.9, -0.14);
  topper.rotation.y = Math.PI;
  group.add(topper);

  const crownMat = new THREE.MeshStandardMaterial({
    color: themeColor, emissive: themeColor, emissiveIntensity: 1.4,
    metalness: 0.1, roughness: 0.4,
  });
  const crown = new THREE.Mesh(geo.crown, crownMat);
  crown.position.set(0, 3.18, -0.14);
  group.add(crown);

  // 椅子
  const stool = new THREE.Group();
  const seatMat = new THREE.MeshStandardMaterial({ color: themeColor.clone().multiplyScalar(0.55), metalness: 0.3, roughness: 0.6 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 1.0, roughness: 0.3 });
  const seat = new THREE.Mesh(geo.seatTop, seatMat); seat.position.y = 0.6;
  const leg = new THREE.Mesh(geo.seatLeg, legMat); leg.position.y = 0.3;
  const base = new THREE.Mesh(geo.seatBase, legMat); base.position.y = 0.03;
  stool.add(seat, leg, base);
  stool.position.set(0, 0, -1.1);
  group.add(stool);

  // 互動與動畫所需資料
  group.userData = {
    isMachine: true,
    cfg,
    screen,
    stripMat,
    crownMat,
    themeColor,
    accentColor,
    winFlash: 0,       // >0 = 中獎動畫剩餘秒數
    phase: Math.random() * Math.PI * 2,
  };
  return group;
}

// 島台中央：發光柱 + 旋轉 GRAND JACKPOT 金額跑馬燈環
function makeTickerTexture() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 160;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;

  function draw(amount) {
    g.fillStyle = '#14060e';
    g.fillRect(0, 0, 2048, 160);
    const txt = '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < 2; i++) {
      const cx = 512 + i * 1024;
      g.font = '900 64px Georgia, serif';
      g.shadowColor = '#ff4040';
      g.shadowBlur = 22;
      g.fillStyle = '#ff5a5a';
      g.fillText('GRAND JACKPOT', cx, 44);
      g.font = '900 84px Georgia, serif';
      g.shadowColor = '#ffd166';
      g.shadowBlur = 26;
      g.fillStyle = '#ffe6a3';
      g.fillText(txt, cx, 116);
    }
    tex.needsUpdate = true;
  }
  draw(11433.42);
  return { texture: tex, draw };
}

export function buildCarouselTotem(ceilingH = 10.5) {
  const g = new THREE.Group();
  // 主柱直通天花板（像真賭場的柱式島台）
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, ceilingH, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a1424, metalness: 0.7, roughness: 0.3 })
  );
  pillar.position.y = ceilingH / 2;
  g.add(pillar);
  // 柱上霓虹環帶
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xff2d78, emissive: 0xff2d78, emissiveIntensity: 1.8, metalness: 0.2, roughness: 0.4,
  });
  for (const by of [0.9, 1.7, 2.5, 6.0, 6.8]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 10, 40), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = by;
    g.add(band);
  }
  // 旋轉 GRAND JACKPOT 金額環（跑馬燈貼圖即時更新）
  const ticker = makeTickerTexture();
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.7, 48, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, map: ticker.texture,
      emissive: 0xffffff, emissiveMap: ticker.texture, emissiveIntensity: 1.3,
      side: THREE.DoubleSide, metalness: 0.1, roughness: 0.5,
    })
  );
  ring.position.y = 4.6;
  ring.userData.spin = 0.35;   // 每秒弧度，主迴圈會轉它
  g.add(ring);
  // 上下金冠收邊
  const capMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 1.0, roughness: 0.3 });
  for (const [cy, r1, r2] of [[5.02, 2.18, 2.22], [4.18, 2.22, 2.18]]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 0.1, 48), capMat);
    cap.position.y = cy;
    g.add(cap);
  }
  // 頂部暖色點光
  const glow = new THREE.PointLight(0xffb060, 22, 15, 1.8);
  glow.position.y = 5.5;
  g.add(glow);
  g.userData.ticker = ticker;
  return g;
}

// 每幀更新（外部以 stagger 呼叫 screen.draw 以省效能）
export function updateMachine(group, time, dt, reelSpeed, doRedraw) {
  const u = group.userData;
  if (u.winFlash > 0) u.winFlash = Math.max(0, u.winFlash - dt);
  // LED 呼吸
  const breathe = 1.3 + 0.5 * Math.sin(time * 2.2 + u.phase);
  u.stripMat.emissiveIntensity = u.winFlash > 0 ? 2.5 + Math.sin(time * 18) * 1.5 : breathe;
  u.crownMat.emissiveIntensity = u.winFlash > 0 ? 3.0 + Math.sin(time * 22) * 2.0 : 1.4;
  if (doRedraw) u.screen.draw(time, reelSpeed * (u.winFlash > 0 ? 3.5 : 1), u.winFlash);
}
