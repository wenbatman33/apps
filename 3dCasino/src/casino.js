// 娛樂場大廳場景：地板、紅毯、牆面、天花板、霓虹招牌、柱子、燈光
import * as THREE from 'three';
import { LAYOUT } from './config.js';

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

  // 中央紅毯大區（涵蓋島台與兩側弧列）
  const carpetW = Math.min(L.machines.aisleHalf * 2 + 10, W - 8);
  const carpetD = D - 6;
  const carpetTex = makeCarpetTexture();
  carpetTex.repeat.set(Math.round(carpetW / 2), Math.round(carpetD / 1.5));
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(carpetW, carpetD),
    new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.95, metalness: 0 })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.012;
  carpet.userData.isFloor = true;
  room.add(carpet);
  refs.carpet = carpet;

  // 走道金色鑲邊
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x8a6a2f, metalness: 1.0, roughness: 0.25,
    emissive: 0x2a1f08, emissiveIntensity: 0.6,
  });
  for (const sx of [-1, 1]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, carpetD), trimMat);
    trim.position.set(sx * (carpetW / 2 - 0.4), 0.02, 0);
    room.add(trim);
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

  // 走道點光源（暖色）
  refs.aisleLights = [];
  for (const pz of [-D / 4, 0, D / 4]) {
    const p = new THREE.PointLight(new THREE.Color(L.lights.aisleColor), L.lights.aisleIntensity, 26, 1.8);
    p.position.set(0, H - 1.5, pz);
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
