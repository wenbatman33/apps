// ============ 二頭身 Q 版角色（實況野球風）：打者 / 投手 / 捕手 / 裁判 / 野手 ============
// 全部用基本幾何體組裝 + 手寫關節動畫。大頭、圓身、無手指圓球手、黑豆眼。
// 好處：造型討喜、零下載、揮棒節奏能與判定完全對齊。
// 若要換成外部 GLB（Mixamo / Quaternius），見 README「角色模型來源」。
import * as THREE from 'three';
import { FIELD, PACE, SWING } from './config.js';

const SKIN = [0xffdcb8, 0xf0c199, 0xc98d5c, 0xffe6cc];

// ---- 比例（總高約 1.46m，頭佔身高逾半 —— 實況野球那種二頭身）----
// 重點：頭要「大到誇張」、身體比頭窄、腿短到幾乎只剩鞋子、手是兩顆大圓球。
const P = {
  hipY: 0.25,          // 髖部高度（只有身高的 17% —— 腿短到幾乎只剩鞋子）
  headR: 0.38,         // 頭半徑（頭頂約 1.46m，佔身高 52%）
  headY: 0.50,         // 頭（neck 節點）相對 torso 的高度
  bodyR: 0.20,         // 軀幹半徑（要比頭小）
  shoulderY: 0.36, shoulderX: 0.165,
  // 手臂長度必須 ≥ 肩膀到球棒握把的距離，否則手構不到球棒，
  // 球棒會看起來浮在手的外面。手臂大半被身體與大頭遮住，加長不影響外觀。
  upperArm: 0.26, foreArm: 0.24, handR: 0.095,   // 手掌是大圓球
  thigh: 0.08, shin: 0.06,                       // 腿極短
};
export const ARM_LEN = P.upperArm + P.foreArm;

function mat(c, o = {}){ return new THREE.MeshLambertMaterial({ color: c, ...o }); }
function cyl(rt, rb, h, m, seg = 12){ const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); g.castShadow = true; return g; }
function sph(r, m, s = 16){ const g = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), m); g.castShadow = true; return g; }
function box(w, h, d, m){ const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.castShadow = true; return g; }

// 臉：大眼睛（眼白＋瞳孔＋高光）＋ 粗眉。パワプロ 的臉是「大眼有眼白」，不是黑豆眼。
function addFace(head, mSkin){
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const iris = new THREE.MeshBasicMaterial({ color: 0x4a3226 });
  const brow = new THREE.MeshBasicMaterial({ color: 0x2b1d16 });
  const R = P.headR;
  for (const sx of [-1, 1]){
    // 眼白（略側傾的橢圓）。z 位置要讓瞳孔疊得上去，不能整顆埋進頭裡。
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 14), white);
    eye.position.set(sx * .145, -.055, R * .88);
    eye.scale.set(.84, 1.08, .34);
    eye.rotation.z = sx * -.10;
    head.add(eye);
    // 瞳孔：必須在眼白「前表面」之外，否則會整顆被眼白包住看不見
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.060, 14, 12), iris);
    pupil.position.set(sx * .145, -.060, R * .88 + .085 * .34 + .004);
    pupil.scale.set(.92, 1.0, .22);
    head.add(pupil);
    // 高光
    const gl = new THREE.Mesh(new THREE.SphereGeometry(.017, 8, 8), white);
    gl.position.set(sx * .162, -.018, R * .88 + .085 * .34 + .012); gl.scale.z = .25;
    head.add(gl);
    // 粗眉
    const br = new THREE.Mesh(new THREE.CapsuleGeometry(.017, .095, 4, 8), brow);
    br.position.set(sx * .148, .012, R * .885);
    br.rotation.set(0, 0, Math.PI / 2 + sx * .15);
    br.scale.z = .45;
    head.add(br);
  }
}

// 扁平鴨舌帽（不是半球！パワプロ 的帽子帽頂扁、帽簷寬而平）
function addCap(neck, mCap, headR, helmet){
  // 帽子要比頭「大一圈」才像戴上去的；跟頭同半徑會看起來只是把頭頂塗色
  const R = headR * 1.14;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(R, 26, 18, 0, Math.PI * 2, 0, Math.PI * .52), mCap);
  crown.position.y = .40; crown.scale.y = .80;
  crown.castShadow = true; neck.add(crown);
  // 帽沿一圈（有厚度）：這條邊界線是「帽子」與「頭」分開的關鍵
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(R * .995, R * .985, .05, 26, 1, true), mCap);
  rim.position.y = .385; rim.castShadow = true; neck.add(rim);
  // 寬平帽簷，從帽沿往前伸
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * .80, R * .80, .034, 26, 1, false, -Math.PI * .42, Math.PI * .84), mCap);
  brim.position.set(0, .383, .10);
  brim.scale.set(1.06, 1, 1.6);
  brim.rotation.x = -.05;
  neck.add(brim);
  if (helmet){                                          // 打擊頭盔：加護耳
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), mCap);
    ear.position.set(-headR * .90, .30, .01); ear.scale.set(.45, 1, .95); neck.add(ear);
  }
}

// 建一隻 Q 版球員：回傳 rig（各關節 Group）
export function makePerson({ shirt = 0x1b3f8c, pants = 0xf0f0f0, skin = 0, cap = 0x14264f,
                             hair = 0x2b1d16, num = '7', helmet = false } = {}){
  const mSkin = mat(SKIN[skin]), mShirt = mat(shirt), mPants = mat(pants), mCap = mat(cap), mShoe = mat(0x22242c);
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = P.hipY; root.add(hips);

  // ---- 腳：パワプロ 根本沒有腿，是兩隻扁半圓鞋直接接在身體下 ----
  // 保留 hip/knee 這兩層 Group 讓揮棒動畫照用，只是不放大腿小腿的幾何體。
  const legs = {};
  for (const s of ['L', 'R']){
    const sx = s === 'L' ? 1 : -1;
    const hip = new THREE.Group(); hip.position.set(sx * .115, 0, 0); hips.add(hip);
    const knee = new THREE.Group(); knee.position.y = -P.thigh; hip.add(knee);
    const footY = -P.shin + .06;
    // 鞋：上半球壓扁
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(.135, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mShoe);
    shoe.scale.set(1.02, .60, 1.55); shoe.position.set(0, footY, .06);
    shoe.castShadow = true; knee.add(shoe);
    // 鞋底白邊
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(.138, .138, .038, 16), mat(0xf2f4f8));
    sole.scale.set(1.02, 1, 1.55); sole.position.set(0, footY - .012, .06); knee.add(sole);
    legs[s] = { hip, knee };
  }

  // ---- 軀幹（小圓球，要比頭明顯小）----
  const torso = new THREE.Group(); hips.add(torso);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(P.bodyR, .07, 6, 16), mShirt);
  body.position.y = .23; body.scale.set(1, 1.05, .86); body.castShadow = true; torso.add(body);
  const belt = cyl(P.bodyR * .98, P.bodyR * .94, .06, mat(0x2b2e38)); belt.position.y = .05; belt.scale.z = .86; torso.add(belt);

  // 背號
  {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#' + shirt.toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 128);
    if (num){
      x.fillStyle = '#fff'; x.font = '900 italic 96px Helvetica, Arial';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(num, 64, 70);
    }
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22),
      new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) }));
    p.position.set(0, .25, -.175); p.rotation.y = Math.PI; torso.add(p);
  }

  // ---- 頭（超大，直接坐在身體上，沒有脖子）----
  const neck = new THREE.Group(); neck.position.y = P.headY; torso.add(neck);
  const head = sph(P.headR, mSkin, 22);
  head.scale.set(1, .95, .97); head.position.y = .33; neck.add(head);
  addFace(head, mSkin);

  // 頭髮（後腦一圈）
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(P.headR * 1.012, 22, 16, 0, Math.PI * 2, Math.PI * .33, Math.PI * .15), mat(hair));
  hairMesh.position.y = .33; hairMesh.rotation.x = -.10; neck.add(hairMesh);

  addCap(neck, mCap, P.headR, helmet);                // 扁平鴨舌帽

  // ---- 手臂：パワプロ 看不到細長手臂，只有「深色袖子 + 一顆膚色圓球」----
  const mSleeve = mat(cap);                          // 袖子用隊色
  const arms = {};
  for (const s of ['L', 'R']){
    const sx = s === 'L' ? 1 : -1;
    const sh = new THREE.Group(); sh.position.set(sx * P.shoulderX, P.shoulderY, 0); torso.add(sh);
    // 袖子：粗短的深色膠囊，蓋住上臂
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(.088, P.upperArm * .5, 5, 12), mSleeve);
    sleeve.position.y = -P.upperArm * .48; sleeve.castShadow = true; sh.add(sleeve);
    const el = new THREE.Group(); el.position.y = -P.upperArm; sh.add(el);
    // 前臂做細一點且用膚色，多半被袖子與手球遮住
    const fore = cyl(.062, .07, P.foreArm, mSkin); fore.position.y = -P.foreArm / 2; el.add(fore);
    const hand = new THREE.Group(); hand.position.y = -P.foreArm; el.add(hand);
    const ball = sph(P.handR, mSkin, 16); ball.scale.set(1, .96, 1); hand.add(ball);
    arms[s] = { shoulder: sh, elbow: el, hand };
    sh.rotation.z = sx * .14;
  }

  return { root, hips, torso, neck, head, legs, arms };
}

// ---------- 球棒（配合 Q 版比例縮短） ----------
export function makeBat(){
  // Q 版角色旁邊，細球棒根本看不見——照二頭身比例加粗成「胖棒」
  const L = 0.95;                                       // 棒頭要明顯高過頭頂
  const pts = [];
  for (let i = 0; i <= 14; i++){
    const t = i / 14;
    pts.push(new THREE.Vector2(0.034 + Math.pow(t, 1.9) * 0.042, t * L));
  }
  pts.push(new THREE.Vector2(0.072, L * 1.01), new THREE.Vector2(0, L * 1.018));
  const bat = new THREE.Mesh(new THREE.LatheGeometry(pts, 18),
    new THREE.MeshPhongMaterial({ color: 0xd9903c, shininess: 52, specular: 0x6b4018 }));
  bat.castShadow = true;
  // 深色握把：跟棒身有對比才看得出球棒的方向
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.038, .038, .19, 12), mat(0x24262e));
  grip.position.y = .095; bat.add(grip);
  bat.add(new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .03, 12), mat(0x24262e)));
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
  stripe.position.y = .18; stripe.scale.z = .86; p.torso.add(stripe);

  const bat = makeBat();
  const grip = new THREE.Group();
  // 掛在「靠鏡頭那一側」的肩膀後上方。torso 已扭轉 0.62rad，local +x 才是世界的 -z（捕手／鏡頭側）；
  // 放在 local -z 會被算到打者的遠側，整支球棒被身體擋掉。
  grip.position.set(-0.35, 0.42, 0.38);
  p.torso.add(grip);
  grip.add(bat);
  // 兩個握點（給手臂近似 IK 用）
  const handHi = new THREE.Object3D(); handHi.position.set(0, .10, 0); grip.add(handHi);
  const handLo = new THREE.Object3D(); handLo.position.set(0, .01, 0); grip.add(handLo);
  // 拖尾取樣點：棒頭與棒身中段
  const tipNode = new THREE.Object3D(); tipNode.position.set(0, .96, 0); bat.add(tipNode);
  const midNode = new THREE.Object3D(); midNode.position.set(0, .44, 0); bat.add(midNode);

  scene.add(p.root);

  const st = {
    ...p, bat, grip, handHi, handLo, tipNode, midNode,
    trail: makeSwingTrail(scene),
    swing: -1,        // -1 = 未揮棒；0~1 = 進行中
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
  b.grip.position.set(-0.35, 0.42, 0.38);                 // 靠鏡頭側的肩上
  b.grip.rotation.set(0.50, 0, 0.20 + sway * .28);      // 棒子高舉過頭（不然會被大頭擋住）
}

// 蓄力（投手放球後身體微沉、前腳抬）
function poseLoad(b, k, t){
  poseIdle(b, t);
  b.torso.rotation.y = 0.62 + k * 0.26;
  b.hips.position.y = P.hipY - k * 0.035;
  b.legs.L.hip.rotation.x = -0.16 - k * 0.6;
  b.legs.L.knee.rotation.x = 0.26 + k * 0.8;
  b.grip.rotation.z = 0.14 + k * 0.26;
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

  // 球棒：從肩後掃出，接觸時棒身要放平掃過球的高度（棒頭 y ≈ 好球帶）
  const reach = Math.sin(Math.min(p, .85) / .85 * Math.PI);
  // 轉折點放在 e≈.35（對應 swing≈.42 的接觸時刻），球棒才會「在該低的時候低」
  // b.aim：依這球的高低調整揮棒平面（打者本來就會這樣調整）
  const aim = b.aim || 0;
  const gy = (e <= .35
    ? THREE.MathUtils.lerp(0.42, 0.36, e / .35)
    : THREE.MathUtils.lerp(0.36, 0.30, (e - .35) / .65)) + aim * Math.min(1, e / .35);
  // 從靠鏡頭側的肩上往前推出（local +z 是打者面向的方向）
  b.grip.position.set(-0.35 + e * .12, gy, 0.38 - e * .06 + reach * 0.18);
  // 分兩段：前段掃到水平（接觸），後段只再多轉一點——線性轉到 170° 棒頭會插進地面
  const zRot = e <= .35
    ? THREE.MathUtils.lerp(0.14, 1.62, e / .35)    // 約 93°，棒身水平掃過好球帶
    : THREE.MathUtils.lerp(1.62, 2.10, (e - .35) / .65);
  b.grip.rotation.set(THREE.MathUtils.lerp(0.50, 0.20, e), 0, zRot);
  // 跟隨動作：球棒收到背後肩膀上方
  if (p > .72){
    const k = (p - .72) / .28;
    b.grip.position.y = 0.30 + k * 0.18;
    b.grip.rotation.z = 1.95 - k * 0.60;
    b.grip.rotation.x = 0.20 - k * 1.40;
  }
}

// ---------- 揮棒軌跡拖尾 ----------
// 從打者背後看，球棒是指向鏡頭深處的，透視上只剩一小截又被身體擋住。
// 拖尾把「掃過的那片弧」畫出來，揮棒感主要來自這個。
const TRAIL_N = 16;
function makeSwingTrail(scene){
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(TRAIL_N * 2 * 3);
  const col = new Float32Array(TRAIL_N * 2 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const idx = [];
  for (let i = 0; i < TRAIL_N - 1; i++){
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: .9, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,   // 黑色端自然淡出
  }));
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, pts: [], geo };
}

const _tipW = new THREE.Vector3(), _midW = new THREE.Vector3();
function updateSwingTrail(b){
  const tr = b.trail;
  if (!tr) return;
  if (b.swing < 0 || b.swing > 1.05){                    // 收棒後淡出
    if (tr.pts.length) tr.pts.length = 0;
    tr.mesh.visible = false;
    return;
  }
  b.tipNode.getWorldPosition(_tipW);
  b.midNode.getWorldPosition(_midW);
  tr.pts.unshift([_tipW.clone(), _midW.clone()]);
  if (tr.pts.length > TRAIL_N) tr.pts.length = TRAIL_N;

  const pos = tr.geo.attributes.position.array;
  const col = tr.geo.attributes.color.array;
  for (let i = 0; i < TRAIL_N; i++){
    const p = tr.pts[Math.min(i, tr.pts.length - 1)];
    const k = i * 6;
    pos[k] = p[0].x; pos[k + 1] = p[0].y; pos[k + 2] = p[0].z;
    pos[k + 3] = p[1].x; pos[k + 4] = p[1].y; pos[k + 5] = p[1].z;
    // 越舊越暗（AdditiveBlending 下等於越透明）
    const f = Math.pow(1 - i / TRAIL_N, 1.6) * (i < tr.pts.length ? 1 : 0);
    col[k] = f * .52; col[k + 1] = f * .50; col[k + 2] = f * .34;
    col[k + 3] = f * .22; col[k + 4] = f * .21; col[k + 5] = f * .15;
  }
  tr.geo.attributes.position.needsUpdate = true;
  tr.geo.attributes.color.needsUpdate = true;
  tr.mesh.visible = true;
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
    b.swing += dt * SWING.swingSpeed * (b.power ? 0.88 : 1);
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

  b.root.updateMatrixWorld(true);
  updateSwingTrail(b);
}

export function triggerSwing(b, power, aim = 0){ b.swing = 0; b.power = !!power; b.aim = aim; }
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
  p.hips.position.y = .13;                                 // 蹲下
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
  p.hips.position.y = .17;
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
