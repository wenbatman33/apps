// 娛樂場大廳場景：地板、動線地毯、牆面、天花板、霓虹招牌、柱子、燈光、
// 桌遊區、VIP 高額區、休息區、禮賓櫃檯
import * as THREE from 'three';
import { LAYOUT } from './config.js?v=20';
import { buildTable, buildSofa, buildPlant, buildRopePosts, buildCounter } from './furniture.js?v=20';

// 紅毯圖樣（深紅底 + 金色菱格）
function makeCarpetTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3d0d16';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(212, 168, 84, 0.55)';
  g.lineWidth = 3;
  for (const [ox, oy] of [[0, 0], [128, 128]]) {
    g.beginPath();
    g.moveTo(ox + 64, oy - 64);
    g.lineTo(ox + 192, oy + 64);
    g.lineTo(ox + 64, oy + 192);
    g.lineTo(ox - 64, oy + 64);
    g.closePath();
    g.stroke();
  }
  g.fillStyle = 'rgba(212, 168, 84, 0.5)';
  for (const [ox, oy] of [[64, 64], [192, 192], [192, 64], [64, 192]]) {
    g.beginPath();
    g.arc(ox, oy, 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 霓虹招牌
export function makeSignTexture(text, sub, color) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 300;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0510';
  g.fillRect(0, 0, 1024, 300);
  g.strokeStyle = color;
  g.lineWidth = 5;
  g.shadowColor = color;
  g.shadowBlur = 25;
  g.strokeRect(16, 16, 992, 268);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 110px Georgia, serif';
  g.shadowBlur = 45;
  g.fillStyle = '#ffffff';
  g.fillText(text, 512, 120);
  g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText(text, 512, 120);
  g.font = 'bold 44px "PingFang TC", sans-serif';
  g.shadowColor = '#ffd166';
  g.shadowBlur = 22;
  g.fillStyle = '#ffe6b3';
  g.fillText(sub, 512, 232);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildCasino(scene) {
  const L = LAYOUT;
  const room = new THREE.Group();
  const W = L.room.width, D = L.room.depth, H = L.room.height;
  const refs = {};   // 需要被 DEV 工具即時調整的物件

  // ---------- 地板：深色光澤大理石 ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ color: 0x0d0b12, metalness: 0.55, roughness: 0.18 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.userData.isFloor = true;
  room.add(floor);

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x8a6a2f, metalness: 1.0, roughness: 0.25,
    emissive: 0x2a1f08, emissiveIntensity: 0.6,
  });

  // ---------- 動線地毯系統（環狀主動線 + 入口引道）----------
  const carpetTex = makeCarpetTexture();
  carpetTex.repeat.set(8, 8);
  const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.95, metalness: 0 });

  // 中央島區圓毯
  const centerCarpet = new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), carpetMat);
  centerCarpet.rotation.x = -Math.PI / 2;
  centerCarpet.position.set(0, 0.012, -2);
  centerCarpet.userData.isFloor = true;
  room.add(centerCarpet);

  // 主環狀動線（亮色紋理，繞中央島一圈、串起各主題島）
  const pathTex = makeCarpetTexture();
  pathTex.repeat.set(10, 10);
  const pathMat = new THREE.MeshStandardMaterial({
    map: pathTex, color: 0xc89058, roughness: 0.9, metalness: 0,
  });
  const ringPath = new THREE.Mesh(new THREE.RingGeometry(9.4, 12.6, 96), pathMat);
  ringPath.rotation.x = -Math.PI / 2;
  ringPath.position.set(0, 0.013, -2);
  ringPath.userData.isFloor = true;
  room.add(ringPath);
  // 主動線金邊
  for (const rr of [9.4, 12.6]) {
    const edge = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.05, 6, 96), trimMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.set(0, 0.02, -2);
    room.add(edge);
  }

  // 入口引道（主入口直通環狀動線）
  const entryLen = D / 2 - 10;
  const entryPath = new THREE.Mesh(new THREE.PlaneGeometry(4.8, entryLen), pathMat);
  entryPath.rotation.x = -Math.PI / 2;
  entryPath.position.set(0, 0.013, 10 + entryLen / 2);
  entryPath.userData.isFloor = true;
  room.add(entryPath);

  // ---------- 桌遊區（入口與環狀動線之間）----------
  const tzCarpet = new THREE.Mesh(new THREE.PlaneGeometry(19, 9), carpetMat);
  tzCarpet.rotation.x = -Math.PI / 2;
  tzCarpet.position.set(0, 0.014, 17);
  tzCarpet.userData.isFloor = true;
  room.add(tzCarpet);
  for (const [tw, td, tx, tz2] of [[19, 0.12, 0, 12.5], [19, 0.12, 0, 21.5], [0.12, 9, -9.5, 17], [0.12, 9, 9.5, 17]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.02, td), trimMat);
    b.position.set(tx, 0.022, tz2);
    room.add(b);
  }
  // 桌子讓開中央入口引道（引道寬 4.8）
  const tzTables = [
    ['blackjack', -6.8, 15.6, 2.7],
    ['poker', -5.6, 19.6, 0.8],
    ['roulette', 5.8, 17.3, 0],
  ];
  for (const [tp, tx, tz2, tr] of tzTables) {
    const t = buildTable(tp);
    t.position.set(tx, 0, tz2);
    t.rotation.y = tr;
    room.add(t);
  }

  // 島間散桌（沿環狀動線內外）
  for (const [tp, tx, tz2, tr] of [
    ['poker', -9.5, -9, 0.5],
    ['blackjack', 9.5, -9, -2.4],
    ['poker', 9.5, 6.5, 2.6],
    ['blackjack', -9.5, 6.5, 0.6],
  ]) {
    const t = buildTable(tp);
    t.position.set(tx, 0, tz2);
    t.rotation.y = tr;
    room.add(t);
  }

  // ---------- VIP 高額區（右側，金柱紅絨繩圍出）----------
  const vipCarpet = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 19),
    new THREE.MeshStandardMaterial({ color: 0x241030, roughness: 0.92 })
  );
  vipCarpet.rotation.x = -Math.PI / 2;
  vipCarpet.position.set(W / 2 - 9, 0.014, 3);
  vipCarpet.userData.isFloor = true;
  room.add(vipCarpet);
  for (const [tw, td, tx, tz2] of [[15, 0.12, W / 2 - 9, -6.5], [15, 0.12, W / 2 - 9, 12.5], [0.12, 19, W / 2 - 16.5, 3]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.02, td), trimMat);
    b.position.set(tx, 0.022, tz2);
    room.add(b);
  }
  room.add(buildRopePosts([[W / 2 - 16.5, -6.5], [W / 2 - 16.5, -2], [W / 2 - 16.5, 3], [W / 2 - 16.5, 8], [W / 2 - 16.5, 12.5]]));
  for (const [tp, tx, tz2, tr] of [['poker', W / 2 - 11, 0, 0.4], ['blackjack', W / 2 - 8, 8, -0.9]]) {
    const t = buildTable(tp);
    t.position.set(tx, 0, tz2);
    t.rotation.y = tr;
    room.add(t);
  }
  // VIP 牆面招牌
  const vipTex = makeSignTexture('VIP', '★ 高 額 貴 賓 區 ★', '#ffd166');
  const vipSign = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, map: vipTex,
      emissive: 0xffffff, emissiveMap: vipTex, emissiveIntensity: 1.2,
      metalness: 0, roughness: 0.6,
    })
  );
  vipSign.position.set(W / 2 - 0.06, 4.4, 3);
  vipSign.rotation.y = -Math.PI / 2;
  room.add(vipSign);

  // ---------- 主入口迎賓 ----------
  const entryMat = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.6), carpetMat);
  entryMat.rotation.x = -Math.PI / 2;
  entryMat.position.set(0, 0.014, D / 2 - 2.6);
  entryMat.userData.isFloor = true;
  room.add(entryMat);
  room.add(buildRopePosts([[-4.2, D / 2 - 1.2], [-4.2, D / 2 - 4.6]]));
  room.add(buildRopePosts([[4.2, D / 2 - 1.2], [4.2, D / 2 - 4.6]]));

  // ---------- 休息區（入口右側）＋ 禮賓櫃檯（入口左側）----------
  const sofa1 = buildSofa();
  sofa1.position.set(W / 2 - 13, 0, D / 2 - 5.5);
  sofa1.rotation.y = Math.PI;
  room.add(sofa1);
  const sofa2 = buildSofa();
  sofa2.position.set(W / 2 - 9.5, 0, D / 2 - 9);
  sofa2.rotation.y = -Math.PI / 2;
  room.add(sofa2);
  const counter = buildCounter();
  counter.position.set(-(W / 2 - 12), 0, D / 2 - 4.5);
  room.add(counter);

  // ---------- 盆栽點綴 ----------
  for (const [px, pz] of [
    [-21, -4], [21, -4], [-21, 10], [21, 10],
    [-8, 23], [8, 23], [W / 2 - 6, D / 2 - 12], [-(W / 2 - 6), D / 2 - 12],
    [-26, 20], [26, 20],
  ]) {
    const p = buildPlant();
    p.position.set(px, 0, pz);
    room.add(p);
  }

  // ---------- 牆面 ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a1220, metalness: 0.15, roughness: 0.9 });
  const walls = [
    { w: W, x: 0, z: -D / 2, ry: 0 },
    { w: W, x: 0, z: D / 2, ry: Math.PI },
    { w: D, x: -W / 2, z: 0, ry: Math.PI / 2 },
    { w: D, x: W / 2, z: 0, ry: -Math.PI / 2 },
  ];
  for (const wcfg of walls) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(wcfg.w, H), wallMat);
    wall.position.set(wcfg.x, H / 2, wcfg.z);
    wall.rotation.y = wcfg.ry;
    room.add(wall);
    // 金色腰線（雙層，撐出挑高感）
    for (const ly of [2.4, H * 0.55]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(wcfg.w, 0.08, 0.05), trimMat);
      line.position.set(wcfg.x, ly, wcfg.z);
      line.rotation.y = wcfg.ry;
      line.translateZ(0.03);
      room.add(line);
    }
  }

  // ---------- 天花板 + 發光燈格 ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ color: 0x120a18, roughness: 0.9 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  room.add(ceiling);

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x332211, emissive: 0xffe8c8, emissiveIntensity: L.lights.ceilingPanel,
  });
  refs.panelMat = panelMat;
  const panelGeo = new THREE.PlaneGeometry(1.9, 1.9);
  const panelFrameGeo = new THREE.BoxGeometry(2.2, 0.05, 2.2);
  const cols = Math.floor((W / 2 - 3) / 5.5);
  const rows = Math.floor((D / 2 - 3) / 4.8);
  for (let px = -cols; px <= cols; px++) {
    for (let pz = -rows; pz <= rows; pz++) {
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(px * 5.5, H - 0.1, pz * 4.8);   // 低於外框，才不會被框盒擋住
      room.add(panel);
      const pframe = new THREE.Mesh(panelFrameGeo, trimMat);
      pframe.position.set(px * 5.5, H - 0.02, pz * 4.8);
      room.add(pframe);
    }
  }

  // ---------- 後牆霓虹招牌 ----------
  const signTex = makeSignTexture(L.sign.text, L.sign.sub, L.sign.color);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: signTex,
    emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 1.35,
    metalness: 0, roughness: 0.6,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.7), signMat);
  sign.position.set(0, H * 0.72, -D / 2 + 0.06);
  room.add(sign);
  refs.sign = sign;
  refs.signMat = signMat;

  // ---------- 金柱 ----------
  const colGeo = new THREE.CylinderGeometry(0.28, 0.32, H, 20);
  const colMat = new THREE.MeshStandardMaterial({ color: 0x3a2c16, metalness: 0.9, roughness: 0.35 });
  const capGeo = new THREE.CylinderGeometry(0.42, 0.36, 0.25, 20);
  for (const sx of [-1, 1]) {
    for (const pz of [-D / 2 + 3, 0, D / 2 - 3]) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(sx * (W / 2 - 2.2), H / 2, pz);
      room.add(col);
      for (const cy of [0.15, H - 0.15]) {
        const cap = new THREE.Mesh(capGeo, trimMat);
        cap.position.set(sx * (W / 2 - 2.2), cy, pz);
        room.add(cap);
      }
    }
  }

  // ---------- 燈光 ----------
  const ambient = new THREE.AmbientLight(0xfff0e0, L.lights.ambient);
  const hemi = new THREE.HemisphereLight(0xffe8d0, 0x201028, L.lights.hemi);
  room.add(ambient, hemi);
  refs.ambient = ambient;
  refs.hemi = hemi;

  // 全場暖色點光（中央 + 四象限 + 入口）
  refs.aisleLights = [];
  for (const [px, pz] of [[0, -2], [-16, -11], [16, -11], [-15, 13], [15, 13], [0, D / 2 - 6]]) {
    const p = new THREE.PointLight(new THREE.Color(L.lights.aisleColor), L.lights.aisleIntensity, 26, 1.8);
    p.position.set(px, H - 1.5, pz);
    room.add(p);
    refs.aisleLights.push(p);
  }

  // 招牌打光
  const signLight = new THREE.PointLight(new THREE.Color(L.sign.color), 20, 20, 1.6);
  signLight.position.set(0, H * 0.7, -D / 2 + 4);
  room.add(signLight);
  refs.signLight = signLight;

  scene.add(room);
  return refs;
}
