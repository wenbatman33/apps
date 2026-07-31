// ============ 二頭身 Q 版角色（實況野球風）：打者 / 投手 / 捕手 / 裁判 / 野手 ============
// 全部用基本幾何體組裝 + 手寫關節動畫。大頭、圓身、無手指圓球手、黑豆眼。
// 好處：造型討喜、零下載、揮棒節奏能與判定完全對齊。
// 若要換成外部 GLB（Mixamo / Quaternius），見 README「角色模型來源」。
import * as THREE from 'three';
import { FIELD, PACE } from './config.js';

const SKIN = [0xffdcb8, 0xf0c199, 0xc98d5c, 0xffe6cc];

// ---- 比例（總身高約 1.52m，約 2.6 頭身）----
const P = {
  hipY: 0.46,          // 髖部高度
  headR: 0.29,         // 頭半徑
  headY: 0.50,         // 頭（neck 節點）相對 torso 的高度
  shoulderY: 0.40,     // 肩膀相對 torso
  shoulderX: 0.235,
  upperArm: 0.20, foreArm: 0.17, handR: 0.078,
  thigh: 0.22, shin: 0.20,
};
export const ARM_LEN = P.upperArm + P.foreArm;

function mat(c, o = {}){ return new THREE.MeshLambertMaterial({ color: c, ...o }); }
function cyl(rt, rb, h, m, seg = 12){ const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); g.castShadow = true; return g; }
function sph(r, m, s = 16){ const g = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), m); g.castShadow = true; return g; }
function box(w, h, d, m){ const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.castShadow = true; return g; }

// 臉：黑豆眼 + 高光 + 小嘴（畫在頭部前方）
function addFace(head, mSkin){
  const black = new THREE.MeshBasicMaterial({ color: 0x1b1b22 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]){
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.052, 12, 12), black);
    eye.position.set(sx * .105, .015, P.headR * .93);
    eye.scale.set(.82, 1.35, .5);
    head.add(eye);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(.017, 8, 8), white);
    gl.position.set(sx * .088, .052, P.headR * .97); gl.scale.z = .4;
    head.add(gl);
  }
  // 眉（一點表情）
  for (const sx of [-1, 1]){
    const br = new THREE.Mesh(new THREE.BoxGeometry(.075, .017, .02), black);
    br.position.set(sx * .11, .095, P.headR * .92);
    br.rotation.z = sx * .18;
    head.add(br);
  }
  // 嘴
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.045, .012, 6, 12, Math.PI), black);
  mouth.position.set(0, -.075, P.headR * .93);
  mouth.rotation.set(0, 0, Math.PI);
  mouth.scale.set(1, .7, .5);
  head.add(mouth);
  // 腮紅
  for (const sx of [-1, 1]){
    const c = new THREE.Mesh(new THREE.CircleGeometry(.045, 12),
      new THREE.MeshBasicMaterial({ color: 0xff9c9c, transparent: true, opacity: .38 }));
    c.position.set(sx * .185, -.045, P.headR * .86);
    c.rotation.y = sx * .5;
    head.add(c);
  }
}

// 建一隻 Q 版球員：回傳 rig（各關節 Group）
export function makePerson({ shirt = 0x1b3f8c, pants = 0xf0f0f0, skin = 0, cap = 0x14264f,
                             hair = 0x2b1d16, num = '7', helmet = false } = {}){
  const mSkin = mat(SKIN[skin]), mShirt = mat(shirt), mPants = mat(pants), mCap = mat(cap), mShoe = mat(0x22242c);
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = P.hipY; root.add(hips);

  // ---- 腿（短圓 + 大鞋）----
  const legs = {};
  for (const s of ['L', 'R']){
    const sx = s === 'L' ? 1 : -1;
    const hip = new THREE.Group(); hip.position.set(sx * .115, 0, 0); hips.add(hip);
    const thigh = cyl(.088, .078, P.thigh, mPants); thigh.position.y = -P.thigh / 2; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -P.thigh; hip.add(knee);
    const shin = cyl(.076, .068, P.shin, mPants); shin.position.y = -P.shin / 2; knee.add(shin);
    const sock = cyl(.072, .066, .08, mat(shirt)); sock.position.y = -P.shin + .02; knee.add(sock);
    const shoe = box(.145, .095, .245, mShoe); shoe.position.set(0, -P.shin - .04, .055); knee.add(shoe);
    legs[s] = { hip, knee };
  }

  // ---- 軀幹（圓胖膠囊）----
  const torso = new THREE.Group(); hips.add(torso);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.215, .16, 6, 16), mShirt);
  body.position.y = .22; body.scale.set(1, 1, .84); body.castShadow = true; torso.add(body);
  const belt = cyl(.205, .2, .06, mat(0x2b2e38)); belt.position.y = .04; belt.scale.z = .86; torso.add(belt);

  // 背號
  {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#' + shirt.toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 128);
    if (num){
      x.fillStyle = '#fff'; x.font = '900 italic 96px Helvetica, Arial';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(num, 64, 70);
    }
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.26, .26),
      new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) }));
    p.position.set(0, .26, -.19); p.rotation.y = Math.PI; torso.add(p);
  }

  // ---- 頭（超大）----
  const neck = new THREE.Group(); neck.position.y = P.headY; torso.add(neck);
  const head = sph(P.headR, mSkin, 20);
  head.scale.set(1, .97, .98); head.position.y = .245; neck.add(head);
  addFace(head, mSkin);

  // 頭髮（後腦一圈）
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(P.headR * 1.015, 18, 14, 0, Math.PI * 2, 0, Math.PI * .62), mat(hair));
  hairMesh.position.y = .245; hairMesh.rotation.x = -.28; neck.add(hairMesh);

  // 帽子 / 頭盔
  const capMesh = new THREE.Mesh(new THREE.SphereGeometry(P.headR * 1.045, 18, 14, 0, Math.PI * 2, 0, Math.PI * .52), mCap);
  capMesh.position.y = .25; capMesh.castShadow = true; neck.add(capMesh);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(P.headR * .96, P.headR * .96, .028, 20, 1, false, -Math.PI * .42, Math.PI * .84), mCap);
  brim.position.set(0, .245 + P.headR * .18, .07); brim.scale.z = 1.25; neck.add(brim);
  if (helmet){                                        // 打擊頭盔：加護耳
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), mCap);
    ear.position.set(-P.headR * .96, .215, .02); ear.scale.set(.5, 1, .9); neck.add(ear);
  }

  // ---- 手臂（短粗 + 圓球手）----
  const arms = {};
  for (const s of ['L', 'R']){
    const sx = s === 'L' ? 1 : -1;
    const sh = new THREE.Group(); sh.position.set(sx * P.shoulderX, P.shoulderY, 0); torso.add(sh);
    const upper = cyl(.066, .058, P.upperArm, mShirt); upper.position.y = -P.upperArm / 2; sh.add(upper);
    const el = new THREE.Group(); el.position.y = -P.upperArm; sh.add(el);
    const fore = cyl(.056, .05, P.foreArm, mSkin); fore.position.y = -P.foreArm / 2; el.add(fore);
    const hand = new THREE.Group(); hand.position.y = -P.foreArm; el.add(hand);
    hand.add(sph(P.handR, mSkin, 12));
    arms[s] = { shoulder: sh, elbow: el, hand };
    sh.rotation.z = sx * .14;
  }

  return { root, hips, torso, neck, head, legs, arms };
}

// ---------- 球棒（配合 Q 版比例縮短） ----------
export function makeBat(){
  const L = 0.70;
  const pts = [];
  for (let i = 0; i <= 14; i++){
    const t = i / 14;
    pts.push(new THREE.Vector2(0.021 + Math.pow(t, 1.9) * 0.021, t * L));
  }
  pts.push(new THREE.Vector2(0.038, L * 1.007), new THREE.Vector2(0, L * 1.012));
  const bat = new THREE.Mesh(new THREE.LatheGeometry(pts, 16),
    new THREE.MeshPhongMaterial({ color: 0xc98336, shininess: 46, specular: 0x5a3616 }));
  bat.castShadow = true;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .15, 12), mat(0x24262e));
  grip.position.y = .075; bat.add(grip);
  bat.add(new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .024, 12), mat(0x24262e)));
  return bat;
}

// ---------- 手套 ----------
function makeGlove(color = 0x6b3a1c){
  const g = new THREE.Group();
  const palm = sph(.135, mat(color), 12); palm.scale.set(1, 1.12, .58); g.add(palm);
  const web = new THREE.Mesh(new THREE.TorusGeometry(.115, .03, 6, 14, Math.PI), mat(color));
  web.position.y = .045; g.add(web);
  return g;
}

// =========================================================
// 打者
// =========================================================
export function createBatter(scene, opts = {}){
  const p = makePerson({
    shirt: 0xfafbfe, pants: 0xeef1f6, cap: 0x16224a, hair: 0x2b1d16,
    num: '99', skin: opts.skin ?? 0, helmet: true,
  });
  // 左打者：站在一壘側（-x，從本壘後方看在畫面右邊），身體面向 +x
  p.root.position.set(-0.82, 0, 0.12);
  p.root.rotation.y = Math.PI / 2;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(.44, .045, .38), mat(0x1b3f8c));
  stripe.position.y = .13; stripe.scale.z = .86; p.torso.add(stripe);

  const bat = makeBat();
  const grip = new THREE.Group();
  grip.position.set(0.06, 0.38, -0.10);
  p.torso.add(grip);
  grip.add(bat);
  // 兩個握點（給手臂近似 IK 用）
  const handHi = new THREE.Object3D(); handHi.position.set(0, .14, 0); grip.add(handHi);
  const handLo = new THREE.Object3D(); handLo.position.set(0, .05, 0); grip.add(handLo);

  scene.add(p.root);

  const st = {
    ...p, bat, grip, handHi, handLo,
    swing: -1,        // -1 = 未揮棒；0~1 = 進行中
    swingSpeed: 3.6,
    idleT: Math.random() * 10,
    loaded: 0,        // 0~1 蓄力（投手投球時上升）
    contactAt: 0.42,  // 揮棒進度中的接觸時刻
    power: false,
  };
  poseIdle(st, 0);
  return st;
}

// 站姿
function poseIdle(b, t){
  const sway = Math.sin(t * 1.6) * 0.05, bob = Math.sin(t * 3.2) * 0.01;
  b.hips.position.y = P.hipY + bob;
  b.hips.rotation.set(0, 0, 0);
  b.torso.rotation.set(0.04, 0.62 + sway * .5, 0);       // 身體後扭（準備姿勢）
  b.neck.rotation.set(0, -0.68 - sway * .5, 0);          // 大頭轉向投手
  b.legs.L.hip.rotation.set(-0.16, 0, 0.12);
  b.legs.R.hip.rotation.set(0.12, 0, -0.14);
  b.legs.L.knee.rotation.x = 0.26;
  b.legs.R.knee.rotation.x = 0.28;
  b.grip.position.set(0.06, 0.38, -0.10);
  b.grip.rotation.set(-0.28, 0, 0.40 + sway * .5);       // 棒子立在肩後
}

// 蓄力（投手放球後身體微沉、前腳抬）
function poseLoad(b, k, t){
  poseIdle(b, t);
  b.torso.rotation.y = 0.62 + k * 0.26;
  b.hips.position.y = P.hipY - k * 0.035;
  b.legs.L.hip.rotation.x = -0.16 - k * 0.6;
  b.legs.L.knee.rotation.x = 0.26 + k * 0.8;
  b.grip.rotation.z = 0.40 + k * 0.30;
}

// 揮棒（p: 0~1）
function poseSwing(b, p){
  const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // easeInOutQuad
  const rot = THREE.MathUtils.lerp(0.95, -2.35, e);                  // 腰部旋轉
  b.hips.rotation.y = rot * 0.42;
  b.torso.rotation.y = rot;
  b.torso.rotation.x = 0.06 - e * 0.1;
  b.hips.position.y = P.hipY - Math.sin(p * Math.PI) * 0.05;
  b.neck.rotation.y = -rot * 0.55 - 0.3;                             // 頭盯著球

  // 下半身：前腳落地踏實、後腳蹬轉
  b.legs.L.hip.rotation.set(-0.16 - Math.max(0, .25 - p) * 2.2, 0, 0.12);
  b.legs.L.knee.rotation.x = 0.26 + Math.max(0, .25 - p) * 2.4;
  b.legs.R.hip.rotation.set(0.12 + e * .2, -e * .5, -0.14);
  b.legs.R.knee.rotation.x = 0.28 + e * 0.5;

  // 球棒：從肩後掃出，接觸時（p≈.42）棒身放平並往前伸展
  const reach = Math.sin(Math.min(p, .85) / .85 * Math.PI);
  b.grip.position.set(0.06 - e * .02, 0.38 - e * .05, -0.10 + reach * 0.22);
  b.grip.rotation.set(
    THREE.MathUtils.lerp(-0.28, 0.10, e),
    0,
    THREE.MathUtils.lerp(0.40, 2.30, e)
  );
  // 揮棒後段球棒繞到背後
  if (p > .72){ const k = (p - .72) / .28; b.grip.rotation.z = 2.30 + k * 1.5; b.grip.rotation.x = 0.10 - k * .7; }
}

// 近似 IK：讓手臂（local -Y 為指向）朝向握點，並依距離彎肘
const DOWN = new THREE.Vector3(0, -1, 0);
const _v = new THREE.Vector3();
function aimArm(arm, targetWorld){
  const parent = arm.shoulder.parent;                    // torso
  parent.worldToLocal(_v.copy(targetWorld)).sub(arm.shoulder.position);
  const len = _v.length();
  if (len < 1e-4) return;
  _v.divideScalar(len);
  arm.shoulder.quaternion.setFromUnitVectors(DOWN, _v);
  arm.elbow.rotation.set(-Math.max(0, ARM_LEN - len) * 4.2, 0, 0);
}

const _g1 = new THREE.Vector3(), _g2 = new THREE.Vector3();
export function updateBatter(b, dt, t){
  if (b.swing >= 0){
    b.swing += dt * b.swingSpeed * (b.power ? 0.88 : 1);
    if (b.swing >= 1.35) b.swing = -1;
    else poseSwing(b, Math.min(b.swing, 1));
  }
  if (b.swing < 0){
    b.idleT += dt;
    if (b.loaded > 0) poseLoad(b, b.loaded, b.idleT);
    else poseIdle(b, b.idleT);
  }
  // 雙手跟著球棒握把
  b.root.updateMatrixWorld(true);
  b.handHi.getWorldPosition(_g1);
  b.handLo.getWorldPosition(_g2);
  aimArm(b.arms.L, _g1);
  aimArm(b.arms.R, _g2);
}

export function triggerSwing(b, power){ b.swing = 0; b.power = !!power; }
export function isSwinging(b){ return b.swing >= 0; }

// =========================================================
// 投手
// =========================================================
export function createPitcher(scene){
  const p = makePerson({ shirt: 0xa8283c, pants: 0xeceef4, cap: 0x4a121f, hair: 0x1d1410, num: '11', skin: 1 });
  p.root.position.set(-0.1, 0.3, FIELD.moundZ + 0.15);
  p.root.rotation.y = Math.PI;                              // 面向本壘 (-z)
  const glove = makeGlove(0x5a2f14);
  glove.rotation.x = -Math.PI / 2;
  p.arms.L.hand.add(glove);
  scene.add(p.root);
  const st = { ...p, anim: -1, speed: 1.0, idleT: 0, onRelease: null };
  posePitcherIdle(st, 0);
  return st;
}

function posePitcherIdle(q, t){
  const bob = Math.sin(t * 1.4) * 0.012;
  q.hips.position.y = P.hipY + bob;
  q.hips.rotation.set(0, 0, 0);
  q.torso.rotation.set(0.06, 0, 0);
  q.neck.rotation.set(-0.05, 0, 0);
  q.legs.L.hip.rotation.set(0.06, 0, .05); q.legs.L.knee.rotation.x = .1;
  q.legs.R.hip.rotation.set(-0.06, 0, -.05); q.legs.R.knee.rotation.x = .12;
  q.arms.L.shoulder.rotation.set(-1.0, 0, .4); q.arms.L.elbow.rotation.x = -1.3;
  q.arms.R.shoulder.rotation.set(-0.8, 0, -.35); q.arms.R.elbow.rotation.x = -1.45;
}

// 投球動作（p: 0~1，release 在 0.62）
function posePitch(q, p){
  const t = q.idleT;
  posePitcherIdle(q, t);
  if (p < .3){                       // 抬腿
    const k = p / .3;
    q.hips.position.y = P.hipY - k * .05;
    q.torso.rotation.set(.06 - k * .18, k * .5, 0);
    q.legs.L.hip.rotation.x = .06 - k * 1.6; q.legs.L.knee.rotation.x = .1 + k * 2.0;
    q.arms.R.shoulder.rotation.set(-.8 - k * .35, 0, -.35 - k * .3);
    q.arms.L.shoulder.rotation.set(-1.0 - k * .5, 0, .4);
  } else if (p < .62){               // 跨步 + 拉臂
    const k = (p - .3) / .32;
    q.hips.position.y = P.hipY - .05 - k * .07;
    q.torso.rotation.set(-.12 - k * .05, .5 - k * .95, 0);
    q.legs.L.hip.rotation.x = -1.54 + k * 1.2; q.legs.L.knee.rotation.x = 2.1 - k * 1.7;
    q.legs.R.hip.rotation.x = -.06 + k * .55; q.legs.R.knee.rotation.x = .12 + k * .55;
    q.arms.R.shoulder.rotation.set(-1.15 + k * 3.7, 0, -.65 + k * .55);   // 由後掄到前上方
    q.arms.R.elbow.rotation.x = -1.45 + k * 1.3;
    q.arms.L.shoulder.rotation.set(-1.5 + k * 1.6, 0, .4 - k * .55);
  } else {                           // 跟隨動作
    const k = (p - .62) / .38;
    q.hips.position.y = P.hipY - .12 + k * .1;
    q.torso.rotation.set(.05 + k * .45, -.45 - k * .35, 0);
    q.legs.L.hip.rotation.x = -.34 - k * .2; q.legs.L.knee.rotation.x = .4 + k * .3;
    q.legs.R.hip.rotation.x = .49 - k * .9; q.legs.R.knee.rotation.x = .67 + k * .9;
    q.arms.R.shoulder.rotation.set(2.55 + k * .5, 0, -.1);
    q.arms.R.elbow.rotation.x = -.15 - k * .8;
    q.arms.L.shoulder.rotation.set(.1 - k * .6, 0, -.15);
  }
}

export function pitchThrow(q, speedMul, onRelease){
  q.anim = 0; q.speed = speedMul; q.onRelease = onRelease; q._released = false;
}
export function updatePitcher(q, dt){
  q.idleT += dt;
  if (q.anim >= 0){
    q.anim += dt * (PACE.windupSpeed + q.speed * .28);
    if (!q._released && q.anim >= .62){ q._released = true; q.onRelease && q.onRelease(); }
    if (q.anim >= 1.3){ q.anim = -1; posePitcherIdle(q, q.idleT); return; }
    posePitch(q, Math.min(q.anim, 1));
  } else posePitcherIdle(q, q.idleT);
}

// =========================================================
// 捕手（蹲姿）
// =========================================================
export function createCatcher(scene){
  const p = makePerson({ shirt: 0xa8283c, pants: 0xeceef4, cap: 0x2f3138, hair: 0x1d1410, num: '2', skin: 2 });
  p.root.position.set(0, 0, -2.05);
  p.root.rotation.y = 0;                                   // 面向 +z（投手）
  p.hips.position.y = .26;                                 // 蹲下
  p.legs.L.hip.rotation.set(-1.5, .38, 0); p.legs.L.knee.rotation.x = 1.9;
  p.legs.R.hip.rotation.set(-1.5, -.38, 0); p.legs.R.knee.rotation.x = 1.9;
  p.torso.rotation.x = .14;
  p.arms.L.shoulder.rotation.set(-1.3, 0, .35); p.arms.L.elbow.rotation.x = -.7;
  p.arms.R.shoulder.rotation.set(-.5, 0, -.6); p.arms.R.elbow.rotation.x = -1.05;
  const glove = makeGlove(0x3a2110); glove.scale.setScalar(1.3); glove.rotation.x = -1.9;
  p.arms.L.hand.add(glove);
  // 面罩（罩住大頭前半）
  const mask = new THREE.Mesh(
    new THREE.SphereGeometry(P.headR * 1.06, 14, 12, -Math.PI / 2, Math.PI, Math.PI * .18, Math.PI * .62),
    new THREE.MeshLambertMaterial({ color: 0x3a3d47, transparent: true, opacity: .92 }));
  mask.position.y = .245; mask.rotation.y = Math.PI / 2; p.neck.add(mask);
  // 護胸
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .1, 5, 14), mat(0x2f3138));
  chest.position.set(0, .22, .09); chest.scale.set(1, 1, .5); p.torso.add(chest);
  scene.add(p.root);
  return p;
}

// 裁判
export function createUmpire(scene){
  const p = makePerson({ shirt: 0x24262f, pants: 0x24262f, cap: 0x14161c, hair: 0x2b2b2b, num: '', skin: 3 });
  p.root.position.set(0, 0, -2.95);
  p.hips.position.y = .34;
  p.legs.L.hip.rotation.set(-1.1, .32, 0); p.legs.L.knee.rotation.x = 1.35;
  p.legs.R.hip.rotation.set(-1.1, -.32, 0); p.legs.R.knee.rotation.x = 1.35;
  p.torso.rotation.x = .3;
  p.arms.L.shoulder.rotation.set(-.85, 0, .5); p.arms.L.elbow.rotation.x = -1.3;
  p.arms.R.shoulder.rotation.set(-.85, 0, -.5); p.arms.R.elbow.rotation.x = -1.3;
  scene.add(p.root);
  return p;
}

// 外野守備員（裝飾用）
export function createFielders(scene){
  const spots = [[-38, 0, 68], [0, 0, 84], [40, 0, 66], [-19, 0, 34], [19, 0, 36], [-27, 0, 22], [27, 0, 24]];
  const out = [];
  for (const [x, , z] of spots){
    const p = makePerson({
      shirt: 0xa8283c, pants: 0xeceef4, cap: 0x4a121f, hair: 0x1d1410,
      num: String(3 + out.length), skin: out.length % 4,
    });
    p.root.position.set(x, 0, z);
    p.root.lookAt(0, 0, 0);
    p.arms.L.shoulder.rotation.set(-.6, 0, .5); p.arms.L.elbow.rotation.x = -1.0;
    p.arms.R.shoulder.rotation.set(-.5, 0, -.45); p.arms.R.elbow.rotation.x = -.95;
    p.legs.L.hip.rotation.set(-.22, 0, .1); p.legs.L.knee.rotation.x = .35;
    p.legs.R.hip.rotation.set(-.22, 0, -.1); p.legs.R.knee.rotation.x = .35;
    p.arms.L.hand.add(makeGlove(0x5a2f14));
    scene.add(p.root);
    out.push(p);
  }
  return out;
}
