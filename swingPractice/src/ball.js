// ============ 球：投球軌跡、擊球後自由飛行、拖尾與落點 ============
import * as THREE from 'three';
import { FIELD, PHYS, PITCH } from './config.js';
import { wallRadius } from './stadium.js';

const R = 0.048;   // 略大於真實(0.037)，讓遠處看得見

function ballTexture(){
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = '#f8f8f4'; x.fillRect(0, 0, s, s);
  x.strokeStyle = '#d1354a'; x.lineWidth = 5;
  for (const off of [0.28, 0.72]){                 // 兩道紅色縫線
    x.beginPath();
    for (let i = 0; i <= 64; i++){
      const u = i / 64, px = u * s;
      const py = off * s + Math.sin(u * Math.PI * 2) * s * 0.11;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
    x.setLineDash([7, 9]); x.lineWidth = 3.4; x.stroke(); x.setLineDash([]); x.lineWidth = 5;
  }
  return new THREE.CanvasTexture(c);
}

export function createBall(scene){
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(R, 20, 16),
    new THREE.MeshPhongMaterial({ map: ballTexture(), shininess: 26 })
  );
  mesh.castShadow = true;
  scene.add(mesh);

  // 高光暈（讓遠處仍可見）
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.75, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, depthWrite: false }));
  mesh.add(halo);

  // 拖尾
  const MAXT = 90;
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXT * 3), 3));
  const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: .55 }));
  trail.frustumCulled = false; scene.add(trail);

  // 落點光圈
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .0, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .06; scene.add(ring);

  return {
    mesh, halo, trail, ring,
    trailPts: [], MAXT,
    state: 'idle',          // idle | pitch | hit | dead
    t: 0, T: 1,
    from: new THREE.Vector3(), to: new THREE.Vector3(),
    bx: 0, by: 0,
    vel: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    landed: null, dist: 0, foul: false, hr: false, maxH: 0,
  };
}

// 投球：回傳到達本壘所需秒數
export function pitchBall(b, { kmh, type, targetX, targetY, breakScale = 1 }){
  const P = PITCH[type] || PITCH.fast;
  const speed = (kmh / 3.6) * P.spdMul;
  b.from.set(FIELD.releaseX, FIELD.releaseY, FIELD.moundZ - 1.55);
  b.to.set(targetX, targetY, -0.25);
  const dist = b.from.distanceTo(b.to);
  b.T = dist / speed;
  b.t = 0;
  b.bx = P.bx * breakScale; b.by = P.by * breakScale;
  b.type = type;
  b.state = 'pitch';
  b.landed = null; b.foul = false; b.hr = false; b.wallHit = false; b.dist = 0; b.maxH = 0;
  b.trailPts.length = 0;
  b.ring.material.opacity = 0;
  b.mesh.visible = true;
  b.spin.set(28, 4, 0);
  posPitch(b, 0);
  return b.T;
}

function posPitch(b, u){
  const p = b.mesh.position;
  p.lerpVectors(b.from, b.to, u);
  const k = u * u;                                  // 變化球後段才明顯
  p.x += b.bx * k;
  p.y += b.by * k - 0.18 * u * u;                   // 自然下墜
}

// 目前球到「理想擊球點」的剩餘時間（秒，負 = 已通過）
export function timeToContact(b){
  const uc = (b.from.z - FIELD.contactZ) / (b.from.z - b.to.z);
  return (uc - b.t / b.T) * b.T;
}

// 擊球：exitVelo m/s、launchAngle 度、sprayAngle 度（負 = 拉打到左外野）
export function hitBall(b, exitVelo, launchAngle, sprayAngle){
  const la = launchAngle * Math.PI / 180, sa = sprayAngle * Math.PI / 180;
  const h = Math.cos(la) * exitVelo;
  b.vel.set(Math.sin(sa) * h, Math.sin(la) * exitVelo, Math.cos(sa) * h);
  b.state = 'hit';
  b.trailPts.length = 0;
  b.maxH = b.mesh.position.y;
  b.spin.set(6, 2, 10);
}

export function updateBall(b, dt){
  if (b.state === 'pitch'){
    b.t += dt;
    const u = Math.min(b.t / b.T, 1.6);
    posPitch(b, u);
    if (u >= 1.5){ b.state = 'dead'; }
  } else if (b.state === 'hit'){
    // RK 風格半步積分：重力 + 阻力 + 後旋升力
    const v = b.vel, p = b.mesh.position;
    const steps = 2, h = dt / steps;
    for (let i = 0; i < steps; i++){
      const rvx = v.x - PHYS.windX, rvz = v.z - PHYS.windZ;
      const sp = Math.sqrt(rvx * rvx + v.y * v.y + rvz * rvz) || 1e-6;
      const k = PHYS.drag * sp;
      const lift = PHYS.lift * (rvx * rvx + rvz * rvz);
      v.x += (-k * rvx) * h;
      v.z += (-k * rvz) * h;
      v.y += (-PHYS.g - k * v.y + lift) * h;
      p.addScaledVector(v, h);
    }
    if (p.y > b.maxH) b.maxH = p.y;

    const th = Math.atan2(p.x, p.z), r = Math.sqrt(p.x * p.x + p.z * p.z);
    const fair = Math.abs(th) <= Math.PI / 4 && p.z > 0;

    // 飛越全壘打牆
    if (!b.hr && b.landed === null && fair && r >= wallRadius(th) && p.y > FIELD.wallH){
      b.hr = true;
      b.dist = estimateCarry(p.clone(), b.vel.clone());
      b.hrPoint = p.clone();
      b.hrTimer = 0.9;                                  // 飛進看台後隱藏，鏡頭停在越牆點
    }
    // 撞牆（沒過牆頂）：球彈回場內
    if (!b.hr && !b.wallHit && b.landed === null && fair && r >= wallRadius(th) && p.y <= FIELD.wallH){
      b.wallHit = true;
      b.dist = r;
      const n = new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th));   // 牆面法線（指向場內）
      b.vel.reflect(n).multiplyScalar(0.42);
      p.addScaledVector(n, 0.2);
    }

    if (p.y <= R && b.landed === null){
      p.y = R;
      b.landed = p.clone();
      if (!b.wallHit) b.dist = Math.sqrt(p.x * p.x + p.z * p.z);
      b.foul = !b.wallHit && (Math.abs(Math.atan2(p.x, p.z)) > Math.PI / 4 || p.z < 0);
      b.state = 'dead';
      b.ring.position.set(p.x, .06, p.z);
      b.ring.material.opacity = .85;
    }

    if (b.hr){
      b.hrTimer -= dt;
      if (b.hrTimer <= 0){                              // 落點標記放在越牆處
        b.landed = b.hrPoint.clone();
        b.state = 'dead';
        b.mesh.visible = false;
        b.ring.position.set(b.hrPoint.x, .06, b.hrPoint.z);
        b.ring.material.opacity = .85;
      }
    }
  }

  // 飛遠時放大球體，追球鏡頭才看得清楚
  if (b.state === 'hit'){
    const d = b.mesh.position.length();                 // 離本壘的距離
    const s = Math.min(1 + d / 42, 3.4);
    b.mesh.scale.setScalar(s);
  } else if (b.state === 'pitch'){
    b.mesh.scale.setScalar(1);
  }

  // 轉動
  if (b.state !== 'dead'){
    b.mesh.rotation.x += b.spin.x * dt;
    b.mesh.rotation.y += b.spin.y * dt;
    b.mesh.rotation.z += b.spin.z * dt;
  }

  // 拖尾
  if (b.state === 'pitch' || b.state === 'hit'){
    b.trailPts.push(b.mesh.position.clone());
    if (b.trailPts.length > b.MAXT) b.trailPts.shift();
    const arr = b.trail.geometry.attributes.position.array;
    for (let i = 0; i < b.MAXT; i++){
      const q = b.trailPts[Math.min(i, b.trailPts.length - 1)] || b.mesh.position;
      arr[i * 3] = q.x; arr[i * 3 + 1] = q.y; arr[i * 3 + 2] = q.z;
    }
    b.trail.geometry.attributes.position.needsUpdate = true;
    b.trail.visible = true;
  }
  if (b.state === 'dead' && b.landed) b.trail.material.opacity = Math.max(0, b.trail.material.opacity - dt * .5);
  else b.trail.material.opacity = .55;
}

// 全壘打時：續推積分算出「若無牆會落在哪」的飛行距離
function estimateCarry(p, v){
  const h = 0.02;
  for (let i = 0; i < 3000 && p.y > 0; i++){
    const sp = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1e-6;
    const k = PHYS.drag * sp, lift = PHYS.lift * (v.x * v.x + v.z * v.z);
    v.x += -k * v.x * h; v.z += -k * v.z * h;
    v.y += (-PHYS.g - k * v.y + lift) * h;
    p.addScaledVector(v, h);
  }
  return Math.sqrt(p.x * p.x + p.z * p.z);
}

export function resetBall(b){
  b.state = 'idle';
  b.mesh.visible = false;
  b.trailPts.length = 0;
  b.trail.visible = false;
  b.ring.material.opacity = 0;
}
