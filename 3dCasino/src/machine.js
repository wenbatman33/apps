// 老虎機機台 — 全部用 Three.js 幾何 + Canvas 貼圖程序化生成
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SYMBOLS = ['🍒', '🔔', '💎', '7️⃣', '⭐', '🍀', '👑', '🍋'];

// 共用幾何（所有機台共享，省記憶體）
let sharedGeo = null;
function getSharedGeo() {
  if (sharedGeo) return sharedGeo;
  sharedGeo = {
    body:   new RoundedBoxGeometry(1.14, 1.95, 0.72, 4, 0.06),
    plinth: new RoundedBoxGeometry(1.22, 0.16, 0.82, 2, 0.03),
    topper: new RoundedBoxGeometry(1.06, 0.42, 0.16, 3, 0.05),
    crown:  new THREE.CylinderGeometry(0.09, 0.13, 0.1, 16),
    screen: new THREE.PlaneGeometry(0.92, 0.66),
    belly:  new THREE.PlaneGeometry(0.94, 0.5),
    deck:   new RoundedBoxGeometry(1.0, 0.07, 0.34, 2, 0.02),
    button: new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20),
    strip:  new THREE.BoxGeometry(0.035, 1.85, 0.035),
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
  // 邊框
  g.strokeStyle = cfg.accent;
  g.lineWidth = 6;
  g.globalAlpha = 0.9;
  g.strokeRect(10, 10, 492, 180);
  g.globalAlpha = 1;
  // 霓虹字（畫兩次做光暈）
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

// 肚板：主題圖案
function makeBellyTexture(cfg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 272;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 136, 20, 256, 136, 300);
  grad.addColorStop(0, cfg.color);
  grad.addColorStop(1, '#0c0410');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 272);
  // 放射線裝飾
  g.globalAlpha = 0.15;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 14;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(256, 136);
    g.lineTo(256 + Math.cos(a) * 340, 136 + Math.sin(a) * 340);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.font = '130px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 18;
  g.fillText(cfg.icon, 256, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 螢幕轉輪：回傳 { texture, draw(time) }
function makeReelScreen(cfg, seed) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 276;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const speeds = [0.9 + (seed % 3) * 0.25, 1.15 + (seed % 5) * 0.18, 0.75 + (seed % 7) * 0.22];
  const CELL = 92;

  function draw(time, speedMul, winFlash) {
    g.fillStyle = '#08040c';
    g.fillRect(0, 0, 384, 276);
    // 三條轉輪
    for (let r = 0; r < 3; r++) {
      const x0 = 8 + r * 124;
      const w = 116;
      const rg = g.createLinearGradient(0, 0, 0, 276);
      rg.addColorStop(0, '#2a2140');
      rg.addColorStop(0.5, '#4a3a68');
      rg.addColorStop(1, '#2a2140');
      g.fillStyle = rg;
      g.fillRect(x0, 8, w, 260);
      const off = (time * speeds[r] * speedMul * 90 + seed * 37) % CELL;
      g.save();
      g.beginPath();
      g.rect(x0, 8, w, 260);
      g.clip();
      g.font = '58px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = -1; i < 4; i++) {
        const idx = (Math.floor(time * speeds[r] * speedMul * 90 / CELL) + i + seed * (r + 3)) % SYMBOLS.length;
        const sym = SYMBOLS[(idx + SYMBOLS.length) % SYMBOLS.length];
        g.fillText(sym, x0 + w / 2, i * CELL + off + 50);
      }
      g.restore();
    }
    // 中獎線
    g.strokeStyle = winFlash > 0 ? `rgba(255,220,80,${0.5 + 0.5 * Math.sin(time * 20)})` : 'rgba(255,180,80,0.35)';
    g.lineWidth = winFlash > 0 ? 5 : 2;
    g.beginPath();
    g.moveTo(4, 138);
    g.lineTo(380, 138);
    g.stroke();
    // 中獎全螢幕閃光
    if (winFlash > 0) {
      g.fillStyle = `rgba(255, 215, 100, ${0.25 * Math.abs(Math.sin(time * 14))})`;
      g.fillRect(0, 0, 384, 276);
      g.font = 'bold 44px "PingFang TC", sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#ffe066';
      g.shadowColor = '#ff8c00';
      g.shadowBlur = 24;
      g.fillText('★ WIN ★', 192, 60);
      g.shadowBlur = 0;
    }
    tex.needsUpdate = true;
  }
  return { texture: tex, draw };
}

// 建立一台完整機台（含椅子），朝 -Z 面向玩家，再由外層旋轉
export function buildMachine(cfg, index) {
  const geo = getSharedGeo();
  const group = new THREE.Group();
  const themeColor = new THREE.Color(cfg.color);
  const accentColor = new THREE.Color(cfg.accent);

  // 底座
  const plinth = new THREE.Mesh(geo.plinth, new THREE.MeshStandardMaterial({
    color: 0x0e0c14, metalness: 0.7, roughness: 0.4,
  }));
  plinth.position.y = 0.08;
  group.add(plinth);

  // 機身
  const body = new THREE.Mesh(geo.body, new THREE.MeshStandardMaterial({
    color: 0x17131f, metalness: 0.65, roughness: 0.32,
  }));
  body.position.y = 1.13;
  group.add(body);

  // 螢幕（微微後仰）
  const screen = makeReelScreen(cfg, index + 1);
  const screenMesh = new THREE.Mesh(geo.screen, new THREE.MeshBasicMaterial({ map: screen.texture }));
  screenMesh.position.set(0, 1.52, -0.405);
  screenMesh.rotation.set(-0.08, Math.PI, 0);
  group.add(screenMesh);

  // 螢幕金框（在螢幕後方一點，只露出邊）
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(1.0, 0.74, 0.04, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 1.0, roughness: 0.28 })
  );
  frame.position.set(0, 1.52, -0.34);
  frame.rotation.x = -0.08;
  group.add(frame);

  // 肚板主題圖
  const belly = new THREE.Mesh(geo.belly, new THREE.MeshBasicMaterial({ map: makeBellyTexture(cfg) }));
  belly.position.set(0, 0.72, -0.372);
  belly.rotation.y = Math.PI;
  group.add(belly);

  // 頂牌
  const topperTex = makeTopperTexture(cfg);
  const topper = new THREE.Mesh(geo.topper, new THREE.MeshStandardMaterial({
    color: 0xffffff, map: topperTex,
    emissive: 0xffffff, emissiveMap: topperTex, emissiveIntensity: 1.1,
    metalness: 0.2, roughness: 0.5,
  }));
  topper.position.set(0, 2.34, -0.18);
  topper.rotation.y = Math.PI;
  group.add(topper);

  // 頂燈（中獎時會爆閃）
  const crownMat = new THREE.MeshStandardMaterial({
    color: themeColor, emissive: themeColor, emissiveIntensity: 1.4,
    metalness: 0.1, roughness: 0.4,
  });
  const crown = new THREE.Mesh(geo.crown, crownMat);
  crown.position.set(0, 2.62, -0.18);
  group.add(crown);

  // 按鈕檯
  const deck = new THREE.Mesh(geo.deck, new THREE.MeshStandardMaterial({
    color: 0x201a2c, metalness: 0.6, roughness: 0.35,
  }));
  deck.position.set(0, 1.02, -0.5);
  deck.rotation.x = 0.35;
  group.add(deck);
  const btnColors = [0xff4060, 0xffc040, 0x40ff90];
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(geo.button, new THREE.MeshStandardMaterial({
      color: btnColors[i], emissive: btnColors[i], emissiveIntensity: 0.9,
      metalness: 0.2, roughness: 0.3,
    }));
    btn.position.set((i - 1) * 0.24, 1.06, -0.55);
    btn.rotation.x = 0.35;
    group.add(btn);
  }

  // 兩側 LED 燈條（動畫呼吸）
  const stripMat = new THREE.MeshStandardMaterial({
    color: themeColor, emissive: themeColor, emissiveIntensity: 1.6,
    metalness: 0.1, roughness: 0.4,
  });
  for (const sx of [-0.585, 0.585]) {
    const strip = new THREE.Mesh(geo.strip, stripMat);
    strip.position.set(sx, 1.13, -0.34);
    group.add(strip);
  }

  // 椅子
  const stool = new THREE.Group();
  const seatMat = new THREE.MeshStandardMaterial({ color: themeColor.clone().multiplyScalar(0.55), metalness: 0.3, roughness: 0.6 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 1.0, roughness: 0.3 });
  const seat = new THREE.Mesh(geo.seatTop, seatMat); seat.position.y = 0.6;
  const leg = new THREE.Mesh(geo.seatLeg, legMat); leg.position.y = 0.3;
  const base = new THREE.Mesh(geo.seatBase, legMat); base.position.y = 0.03;
  stool.add(seat, leg, base);
  stool.position.set(0, 0, -1.05);
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
    baseEmissive: 1.6,
  };
  return group;
}

// 島台中央的發光柱 + 旋轉 JACKPOT 燈環
function makeRingTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#14060e';
  g.fillRect(0, 0, 1024, 128);
  g.font = '900 76px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const word = '★ JACKPOT ';
  g.shadowColor = '#ffd166';
  g.shadowBlur = 26;
  g.fillStyle = '#ffe6a3';
  for (let i = 0; i < 2; i++) g.fillText(word, 256 + i * 512, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
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
  for (const by of [0.9, 1.7, 2.5, 5.6, 6.4]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 10, 40), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = by;
    g.add(band);
  }
  // 旋轉 JACKPOT 燈環（開口圓筒 + 跑馬燈貼圖）
  const ringTex = makeRingTexture();
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.7, 48, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, map: ringTex,
      emissive: 0xffffff, emissiveMap: ringTex, emissiveIntensity: 1.3,
      side: THREE.DoubleSide, metalness: 0.1, roughness: 0.5,
    })
  );
  ring.position.y = 4.3;
  ring.userData.spin = 0.35;   // 每秒弧度，主迴圈會轉它
  g.add(ring);
  // 上下金冠收邊
  const capMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 1.0, roughness: 0.3 });
  for (const [cy, r1, r2] of [[4.72, 2.18, 2.22], [3.88, 2.22, 2.18]]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 0.1, 48), capMat);
    cap.position.y = cy;
    g.add(cap);
  }
  // 頂部暖色點光
  const glow = new THREE.PointLight(0xffb060, 22, 15, 1.8);
  glow.position.y = 5.2;
  g.add(glow);
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
