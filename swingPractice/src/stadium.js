// ============ 球場建構：草皮、內野、全壘打牆、看台、觀眾、燈塔、記分板 ============
import * as THREE from 'three';
import { FIELD } from './config.js';

const DEG = Math.PI / 180;

// 全壘打牆半徑（依水平角度 theta，弧度；0 = 中外野）
export function wallRadius(theta){
  const t = Math.min(Math.abs(theta), 45 * DEG);
  return FIELD.wallL + (FIELD.wallC - FIELD.wallL) * Math.cos(t * 2);
}
// 看台內緣半徑
function standRadius(theta){
  const a = Math.abs(theta) / DEG;
  if (a <= 46) return wallRadius(theta) + 7;
  if (a <= 78){ const k = (a - 46) / 32; return THREE.MathUtils.lerp(wallRadius(46 * DEG) + 7, 40, k * k); }
  const k = Math.min((a - 78) / 55, 1);
  return THREE.MathUtils.lerp(40, 26, k);
}

// ---------- 程序化貼圖 ----------
// 球場草皮總圖：以本壘為圓心，同心弧 × 放射狀的雙向割草紋 + 草絲質感，全部烘進一張圖
const FIELD_TEX_SIZE = 320;                             // 這張貼圖覆蓋的世界尺寸（公尺）
function fieldTexture(){
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  const cx = S / 2, cy = S / 2;                         // 貼圖中心 = 本壘
  const M2PX = S / FIELD_TEX_SIZE;                      // 公尺 → 像素

  x.fillStyle = '#43933e'; x.fillRect(0, 0, S, S);

  // 同心弧割草帶（每 7m 一圈，深淺交替）— 這是主要的紋路
  const bandPx = 7 * M2PX;
  for (let i = 0, r = bandPx / 2; r < S; i++, r += bandPx){
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
    x.strokeStyle = i % 2 ? 'rgba(255,255,255,.072)' : 'rgba(0,45,0,.062)';
    x.lineWidth = bandPx; x.stroke();
  }
  // 放射狀割草帶（只留淡淡一層，太強會變成棋盤格）
  for (let a = 0; a < 360; a += 10){
    x.save(); x.translate(cx, cy); x.rotate(a * DEG);
    x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, S, -5 * DEG, 5 * DEG); x.closePath();
    x.fillStyle = (a / 10) % 2 ? 'rgba(255,255,255,.024)' : 'rgba(0,45,0,.02)';
    x.fill(); x.restore();
  }
  // 內野草／外野草的交界弧
  x.beginPath(); x.arc(cx, cy, 29.5 * M2PX, 0, Math.PI * 2);
  x.strokeStyle = 'rgba(18,60,18,.18)'; x.lineWidth = 4; x.stroke();

  // 草絲質感：逐像素處理（比畫幾萬個小方塊快得多）
  const img = x.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4){
    const p = i >> 2, px = p % S, py = p / S | 0;
    const streak = Math.sin(px * 1.7 + py * .35) * 5;   // 縱向草絲
    const n = (Math.random() - .5) * 24 + streak;
    d[i]     = Math.max(0, Math.min(255, d[i]     + n * .55));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * .45));
  }
  x.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 16;
  return t;
}

// 外圍草地（球場貼圖之外的區域）用的重複小圖
function grassTexture(){
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = '#43933e'; x.fillRect(0, 0, s, s);
  const img = x.getImageData(0, 0, s, s), d = img.data;
  for (let i = 0; i < d.length; i += 4){
    const n = (Math.random() - .5) * 22;
    d[i] += n * .5; d[i + 1] += n; d[i + 2] += n * .4;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60);
  t.anisotropy = 8;
  return t;
}

// 泥土：耙痕（同心圓）+ 顆粒
function dirtTexture(){
  const s = 1024, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = '#a9714a'; x.fillRect(0, 0, s, s);
  for (let r = 6; r < s * 1.4; r += 9){                 // 整地耙痕
    x.beginPath(); x.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    x.strokeStyle = (r / 9) % 2 ? 'rgba(255,228,196,.11)' : 'rgba(88,44,20,.11)';
    x.lineWidth = 5; x.stroke();
  }
  const img = x.getImageData(0, 0, s, s), d = img.data;
  for (let i = 0; i < d.length; i += 4){
    const n = (Math.random() - .5) * 32;
    d[i] += n; d[i + 1] += n * .8; d[i + 2] += n * .7;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

// 牆面廣告條
function wallTexture(){
  const w = 2048, h = 128, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#1d6b48'; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, h - 14, w, 5);
  const ads = ['HOMERUN KING', '⚾ SWING', 'STADIUM', 'POWER', 'GRAND SLAM', 'CLAUDE PARK'];
  const cols = ['#ffd23f', '#5ec8ff', '#ff8de0', '#5dffa0', '#ff9f1c', '#ffffff'];
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < 12; i++){
    x.save(); x.translate((i + .5) * (w / 12), h / 2 - 4);
    x.font = '900 italic 40px Helvetica, Arial';
    x.fillStyle = cols[i % cols.length]; x.globalAlpha = .82;
    x.fillText(ads[i % ads.length], 0, 0); x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1);
  return t;
}

// ---------- 巨蛋屋頂 ----------
// 白色膜結構：放射狀肋條 + 同心環，中央亮、邊緣稍暗
function domeTexture(){
  const w = 2048, h = 1024, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  // 底色：中央（v=0，屋頂正中）最亮
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(.45, '#eef2f8');
  g.addColorStop(.8, '#d3dbe6');
  g.addColorStop(1, '#b9c3d2');
  x.fillStyle = g; x.fillRect(0, 0, w, h);

  // 放射狀肋條（沿經度）
  x.strokeStyle = 'rgba(120,138,164,.5)'; x.lineWidth = 5;
  for (let i = 0; i < 48; i++){
    const px = (i + .5) * (w / 48);
    x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke();
  }
  // 同心環（沿緯度）
  x.strokeStyle = 'rgba(120,138,164,.38)'; x.lineWidth = 4;
  for (let j = 1; j < 9; j++){
    const py = Math.pow(j / 9, .8) * h;
    x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke();
  }
  // 中央天窗
  x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(0, 0, w, 46);
  return new THREE.CanvasTexture(c);
}

function makeDome(){
  const grp = new THREE.Group();
  const R = 210;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 30, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ map: domeTexture(), side: THREE.BackSide, emissive: 0x333c4a, emissiveIntensity: .55 })
  );
  dome.scale.y = 0.31;                                   // 壓扁成巨蛋（頂高約 65m）
  grp.add(dome);

  // 內壁（看台上方到屋頂之間的環）
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, 26, 64, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x8f9cb0, side: THREE.BackSide })
  );
  wall.position.y = 13; grp.add(wall);

  // 屋頂燈組（三圈朝下的發光面板）
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffdf2 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: .13, depthWrite: false });
  for (const [rad, n, y] of [[52, 12, 58], [104, 20, 52], [156, 26, 40]]){
    for (let i = 0; i < n; i++){
      const a = (i / n) * Math.PI * 2 + (rad === 104 ? .12 : 0);
      const px = Math.cos(a) * rad, pz = Math.sin(a) * rad;
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(3.4, 12), lampMat);
      lamp.rotation.x = Math.PI / 2;                     // 朝下
      lamp.position.set(px, y, pz);
      grp.add(lamp);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(6.5, 8, 6), glowMat);
      glow.position.set(px, y - 1, pz);
      grp.add(glow);
    }
  }
  return grp;
}

// 座椅貼圖（貼在每一階的踏面上）：一格一格的椅子
function seatTexture(){
  const w = 256, h = 64, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#22488f'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 32; i++){                        // 單張椅子
    const px = i * (w / 32);
    x.fillStyle = '#2d5aa8'; x.fillRect(px + 1.5, 6, w / 32 - 3, h - 14);
    x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(px + 1.5, 6, w / 32 - 3, 4);
    x.fillStyle = 'rgba(6,14,30,.45)'; x.fillRect(px, 0, 1.5, h);
  }
  x.fillStyle = 'rgba(6,14,30,.35)'; x.fillRect(0, h - 6, w, 6);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 觀眾剪影（頭＋肩），用 alphaTest 去背，一人只花兩個三角形
function personTexture(){
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.beginPath(); x.arc(s / 2, s * .26, s * .19, 0, Math.PI * 2); x.fill();   // 頭
  x.beginPath();                                                            // 肩＋身體
  x.moveTo(s * .27, s * .52); x.quadraticCurveTo(s * .5, s * .40, s * .73, s * .52);
  x.lineTo(s * .82, s); x.lineTo(s * .18, s); x.closePath(); x.fill();
  return new THREE.CanvasTexture(c);
}

// ---------- 看台：真正的階梯 + 密集人群 ----------
function buildStands(){
  const grp = new THREE.Group();
  const A0 = -132 * DEG, A1 = 132 * DEG, NA = 168;
  const TIERS = 26;              // 座位排數
  const TREAD = 0.95;            // 每排往後的水平深度
  const RISE = 0.72;             // 每排的高度差
  const Y0 = 1.1;

  // --- 階梯幾何：每排 = 一片踏面（水平）+ 一片立面（垂直）---
  const tPos = [], tUv = [], tIdx = [];   // 踏面（貼座椅圖）
  const rPos = [], rIdx = [];             // 立面（水泥）
  const push = (arr, ...v) => arr.push(...v);
  for (let j = 0; j < TIERS; j++){
    const y = Y0 + j * RISE;
    for (let i = 0; i <= NA; i++){
      const th = THREE.MathUtils.lerp(A0, A1, i / NA);
      const s = Math.sin(th), cth = Math.cos(th);
      const rIn = standRadius(th) + j * TREAD;
      const rOut = rIn + TREAD;
      // 踏面：rIn → rOut，同高度
      push(tPos, s * rIn, y, cth * rIn, s * rOut, y, cth * rOut);
      push(tUv, i / NA * 90, 0, i / NA * 90, 1);
      // 立面：rOut 這一圈，從 y 升到 y+RISE
      push(rPos, s * rOut, y, cth * rOut, s * rOut, y + RISE, cth * rOut);
    }
    const off = j * (NA + 1) * 2;
    for (let i = 0; i < NA; i++){
      const a = off + i * 2;
      tIdx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      rIdx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }
  const gT = new THREE.BufferGeometry();
  gT.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
  gT.setAttribute('uv', new THREE.Float32BufferAttribute(tUv, 2));
  gT.setIndex(tIdx); gT.computeVertexNormals();
  grp.add(new THREE.Mesh(gT, new THREE.MeshLambertMaterial({ map: seatTexture(), side: THREE.DoubleSide })));

  const gR = new THREE.BufferGeometry();
  gR.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
  gR.setIndex(rIdx); gR.computeVertexNormals();
  grp.add(new THREE.Mesh(gR, new THREE.MeshLambertMaterial({ color: 0x8794a8, side: THREE.DoubleSide })));

  // --- 觀眾：每排沿弧長等距排列，密到看不出個體 ---
  const SPACING = 0.62;          // 座位間距（公尺）
  const AISLE_EVERY = 46, AISLE_W = 3;   // 每 46 個座位留 3 個當走道
  const rows = [];
  let total = 0;
  for (let j = 0; j < TIERS; j++){
    const rMid = standRadius(0) + j * TREAD + TREAD * .45;
    const cols = Math.floor((A1 - A0) * rMid / SPACING);
    rows.push(cols); total += cols;
  }

  const geo = new THREE.PlaneGeometry(0.52, 0.62);
  const mat = new THREE.MeshLambertMaterial({
    map: personTexture(), alphaTest: .5, side: THREE.DoubleSide,
  });
  // 人浪：在 GPU 上算，才有辦法讓兩萬人一起動
  const uT = { value: 0 }, uE = { value: 0.06 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT; sh.uniforms.uExcite = uE;
    sh.vertexShader = 'uniform float uTime;\nuniform float uExcite;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec3 iP = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
       float ph = atan(iP.x, iP.z) * 2.2 + iP.y * .12;
       transformed.y += max(0.0, sin(uTime * 4.5 + ph)) * uExcite;`
    );
  };

  const inst = new THREE.InstancedMesh(geo, mat, total);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  // 球迷衣著：以白／灰／深藍／黑為底，穿插少量鮮色，才不會像一堆糖果
  const PAL = [
    0xffffff, 0xf2f5fa, 0xe4e9f1, 0xd0d7e2, 0xb0bac9, 0x8b95a6, 0x596374,
    0x3465b8, 0x5b8ad6, 0x8fb3e6,
    0xe0554a, 0xf2a04a, 0xf7dc7a, 0x55b567, 0xb8845c, 0xd7ab84, 0xe89ac0,
  ];
  let n = 0;
  for (let j = 0; j < TIERS; j++){
    const cols = rows[j];
    const y = Y0 + j * RISE + 0.42;                       // 坐在踏面上
    for (let i = 0; i < cols; i++){
      if (i % AISLE_EVERY < AISLE_W) continue;            // 走道
      if (Math.random() < 0.06) continue;                 // 零星空位
      const th = THREE.MathUtils.lerp(A0 + .02, A1 - .02, (i + (j % 2) * .5) / cols);
      const r = standRadius(th) + j * TREAD + TREAD * .45;
      dummy.position.set(Math.sin(th) * r, y, Math.cos(th) * r);
      dummy.lookAt(0, y, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(n, dummy.matrix);
      const base = PAL[(i * 5 + j * 3 + (Math.random() * 3 | 0)) % PAL.length];
      color.setHex(base).offsetHSL(0, 0, (Math.random() - .5) * .08);
      inst.setColorAt(n, color);
      n++;
    }
  }
  inst.count = n;                                          // 扣掉走道與空位
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;   // 少了這行觀眾會全黑
  inst.frustumCulled = false;
  grp.add(inst);

  // 看台最上緣的護欄
  const railPts = [];
  for (let i = 0; i <= NA; i++){
    const th = THREE.MathUtils.lerp(A0, A1, i / NA);
    const r = standRadius(th) + TIERS * TREAD;
    railPts.push(new THREE.Vector3(Math.sin(th) * r, Y0 + TIERS * RISE + .9, Math.cos(th) * r));
  }
  grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(railPts),
    new THREE.LineBasicMaterial({ color: 0xeaf0f8 })));

  return { group: grp, crowd: inst, waveTime: uT, waveExcite: uE, crowdCount: n };
}

// ---------- 記分板 ----------
function buildScoreboard(){
  const g = new THREE.Group();
  const th = 6 * DEG, r = wallRadius(th) + 26;
  g.position.set(Math.sin(th) * r, 0, Math.cos(th) * r);
  g.lookAt(0, 0, 0);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(34, 15, 1.4), new THREE.MeshLambertMaterial({ color: 0x39445a }));
  frame.position.y = 30; g.add(frame);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 448;
  const x = c.getContext('2d');
  x.fillStyle = '#070c16'; x.fillRect(0, 0, 1024, 448);
  x.strokeStyle = '#1e2c46'; x.lineWidth = 6; x.strokeRect(10, 10, 1004, 428);
  x.textAlign = 'center'; x.fillStyle = '#ffd23f';
  x.font = '900 italic 118px Helvetica, Arial'; x.fillText('HOMERUN', 512, 160);
  x.fillStyle = '#5ec8ff'; x.font = '900 italic 96px Helvetica, Arial'; x.fillText('KING', 512, 268);
  x.fillStyle = '#7d90aa'; x.font = '700 44px Helvetica, Arial'; x.fillText('★ CLAUDE PARK ★', 512, 372);
  const tex = new THREE.CanvasTexture(c);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(31, 13.6), new THREE.MeshBasicMaterial({ map: tex }));
  panel.position.set(0, 30, 0.85); g.add(panel);    // group 已 lookAt 本壘（+z 朝本壘），面板法線同向
  const legL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 23, 1.6), new THREE.MeshLambertMaterial({ color: 0x515e78 }));
  legL.position.set(-12, 11.5, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 12; g.add(legR);
  return g;
}

// ---------- 主建構 ----------
export function buildStadium(scene){
  scene.background = new THREE.Color(0xe4eaf2);
  scene.fog = new THREE.Fog(0xdfe7f1, 220, 620);          // 室內：只有很遠才起淡霧

  scene.add(makeDome());

  // 燈光：室內巨蛋 = 頂棚均勻打亮 + 柔和主光
  scene.add(new THREE.AmbientLight(0xffffff, 0.30));
  scene.add(new THREE.HemisphereLight(0xf4f9ff, 0x6f9464, 0.72));
  const key = new THREE.DirectionalLight(0xfffaf0, 0.82);
  key.position.set(-42, 70, -26);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const d = 34;
  key.shadow.camera.left = -d; key.shadow.camera.right = d;
  key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
  key.shadow.camera.far = 200; key.shadow.bias = -0.0016;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8f0ff, .5); fill.position.set(50, 46, 40); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff2d8, .35); rim.position.set(10, 40, -60); scene.add(rim);

  // 外圍草地（襯底）
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(400, 72),
    new THREE.MeshLambertMaterial({ map: grassTexture(), color: 0xa8c99a })
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // 球場草皮：割草格紋 + 草絲質感（本壘在貼圖正中央）
  const turf = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD_TEX_SIZE, FIELD_TEX_SIZE),
    new THREE.MeshLambertMaterial({ map: fieldTexture() })
  );
  turf.rotation.x = -Math.PI / 2; turf.position.y = 0.012;
  turf.receiveShadow = true;
  scene.add(turf);

  const dirtMat = new THREE.MeshLambertMaterial({ map: dirtTexture(), color: 0xe8bd93 });

  // 內野土（扇形 ~ 半徑 29，公平區）
  const inf = new THREE.Mesh(new THREE.CircleGeometry(29.5, 48, -Math.PI / 4 + Math.PI / 2 - Math.PI / 2, Math.PI / 2), dirtMat);
  inf.rotation.x = -Math.PI / 2; inf.rotation.z = -Math.PI / 4 - Math.PI / 2; inf.position.y = 0.02;
  inf.receiveShadow = true;
  scene.add(inf);

  // 內野草（菱形內圈）
  const grassIn = new THREE.Mesh(new THREE.CircleGeometry(23.5, 40), new THREE.MeshLambertMaterial({ map: grassTexture(), color: 0xe6f5da }));
  grassIn.rotation.x = -Math.PI / 2; grassIn.position.set(0, 0.03, 20.5); grassIn.receiveShadow = true;
  scene.add(grassIn);

  // 本壘周邊土（含捕手、裁判所在的後方區域）
  const homeDirt = new THREE.Mesh(new THREE.CircleGeometry(8.6, 40), dirtMat);
  homeDirt.rotation.x = -Math.PI / 2; homeDirt.position.set(0, 0.04, -1.6);
  homeDirt.scale.set(1, 0.92, 1); homeDirt.receiveShadow = true;
  scene.add(homeDirt);

  // 投手丘
  const mound = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, .32, 28), dirtMat);
  mound.position.set(0, .14, FIELD.moundZ); mound.receiveShadow = true;
  scene.add(mound);
  const rubber = new THREE.Mesh(new THREE.BoxGeometry(.62, .06, .18), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  rubber.position.set(0, .31, FIELD.moundZ + .1); scene.add(rubber);

  // 本壘板
  const plateShape = new THREE.Shape();
  plateShape.moveTo(-.216, -.216); plateShape.lineTo(.216, -.216); plateShape.lineTo(.216, .1); plateShape.lineTo(0, .33); plateShape.lineTo(-.216, .1); plateShape.closePath();
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(plateShape), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  plate.rotation.x = -Math.PI / 2; plate.rotation.z = Math.PI; plate.position.y = .05;
  scene.add(plate);

  // 打擊區白框
  const boxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 });
  for (const sx of [-1, 1]){
    const b = new THREE.Mesh(new THREE.RingGeometry(0, 1, 4), boxMat);
    const line = new THREE.Group();
    const mk = (w, h, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), boxMat); m.rotation.x = -Math.PI / 2; m.position.set(x, .045, z); return m; };
    line.add(mk(.08, 1.83, sx * 1.22, .15), mk(.08, 1.83, sx * .42, .15), mk(.8, .08, sx * .82, 1.05), mk(.8, .08, sx * .82, -.75));
    scene.add(line); b.visible = false;
  }

  // 壘包 + 壘線
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const B = 27.43 / Math.SQRT2;
  const bases = [[B, 0, B], [0, 0, 27.43], [-B, 0, B]];
  for (const [bx, , bz] of bases){
    const m = new THREE.Mesh(new THREE.BoxGeometry(.46, .07, .46), baseMat);
    m.position.set(bx, .06, bz); m.castShadow = true; scene.add(m);
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 });
  for (const s of [-1, 1]){
    const L = 100;
    const l = new THREE.Mesh(new THREE.PlaneGeometry(.11, L), lineMat);
    l.rotation.x = -Math.PI / 2; l.rotation.z = s * Math.PI / 4;
    l.position.set(s * Math.sin(Math.PI / 4) * L / 2, .05, Math.cos(Math.PI / 4) * L / 2);
    scene.add(l);
  }

  // 全壘打牆（弧形帶狀）
  {
    const N = 90, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++){
      const th = THREE.MathUtils.lerp(-45 * DEG, 45 * DEG, i / N);
      const r = wallRadius(th), sx = Math.sin(th) * r, sz = Math.cos(th) * r;
      pos.push(sx, 0, sz, sx, FIELD.wallH, sz);
      uv.push(i / N, 0, i / N, 1);
    }
    for (let i = 0; i < N; i++){ const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: wallTexture(), side: THREE.DoubleSide })));

    // 牆頂黃線
    const tp = [];
    for (let i = 0; i <= N; i++){
      const th = THREE.MathUtils.lerp(-45 * DEG, 45 * DEG, i / N), r = wallRadius(th);
      tp.push(new THREE.Vector3(Math.sin(th) * r, FIELD.wallH + .04, Math.cos(th) * r));
    }
    const tg = new THREE.BufferGeometry().setFromPoints(tp);
    scene.add(new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffd23f })));
  }

  // 界外標竿
  for (const s of [-1, 1]){
    const th = s * 45 * DEG, r = wallRadius(th);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 21, 8), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    pole.position.set(Math.sin(th) * r, 10.5, Math.cos(th) * r);
    scene.add(pole);
  }

  const stands = buildStands();
  scene.add(stands.group);
  scene.add(buildScoreboard());

  return { key, ...stands };
}

// 觀眾人浪：只更新兩個 uniform，位移由 vertex shader 算（兩萬人也不掉幀）
export function animateCrowd(st, t, excite){
  if (!st.waveTime) return;
  st.waveTime.value = t;
  const target = 0.05 + excite * 0.75;
  st.waveExcite.value += (target - st.waveExcite.value) * 0.06;
}
