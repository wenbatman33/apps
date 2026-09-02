// ===== 運動員角色 v3：Q 版（大頭、無脖子、短手短腳、圓手套手）+ 球衣貼圖 + 自然持拍姿勢 =====
// 動畫 API 與 v2 相同：legs/knees（跑步）、arms[{shoulder,elbow,hand}]（揮拍）、swing()/update()
import * as THREE from 'three';

let PADDLE_GEO = null;

function paddleGeometry() {
  // 拍面：圓角長方形（寬 0.2 × 高 0.26）
  const w = 0.20, h = 0.26, r = 0.07;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 12 });
  g.center();
  return g;
}

const hex = (c) => '#' + c.toString(16).padStart(6, '0');
function shade(c, k) { const col = new THREE.Color(c); col.multiplyScalar(k); return '#' + col.getHexString(); }

// 球衣貼圖：底色 + 側邊深色版 + 背號 + 前胸小標（實測 lathe 貼圖方向與畫布一致）
function jerseyTexture(color, accent, number) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = hex(color); g.fillRect(0, 0, 512, 512);
  g.fillStyle = shade(color, 0.72);
  g.fillRect(96, 0, 64, 512); g.fillRect(352, 0, 64, 512);
  g.fillStyle = hex(accent);
  g.fillRect(124, 0, 8, 512); g.fillRect(380, 0, 8, 512);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 170px "Helvetica Neue",Arial,sans-serif';
  g.save(); g.translate(256, 230);
  g.lineWidth = 14; g.strokeStyle = shade(color, 0.55); g.strokeText(String(number), 0, 0);
  g.fillStyle = '#f7f7f7'; g.fillText(String(number), 0, 0);
  g.restore();
  g.save(); g.translate(44, 250);
  g.font = '900 40px "Helvetica Neue",Arial,sans-serif';
  g.fillStyle = hex(accent); g.fillText('PB', 0, 0);
  g.restore();
  const id = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 10; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function shortsTexture(color, accent) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = hex(color); g.fillRect(0, 0, 256, 128);
  g.fillStyle = hex(accent);
  g.fillRect(58, 0, 7, 128); g.fillRect(186, 0, 7, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function lathe(points, mat, segs = 28) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), segs), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rTop, rBot, h, mat, segs = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sph(r, mat, w = 18, h = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function caps(r, len, mat) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export class Athlete {
  /**
   * o: { jersey, accent, shorts, skin, hair, paddle, number, style:'cap'|'band', facing: -1 玩家 | 1 AI }
   */
  constructor(o) {
    this.facing = o.facing;
    this.root = new THREE.Group();
    this.pos = this.root.position;
    this.anim = { run: 0, phase: 0, swing: null, t: 0 };
    const SCALE = 1.22;       // Q 版身高約 1.35m，場上才看得清楚
    this.handHeight = 0.62 * SCALE;   // 發球時球拿在手上的高度
    this._build(o);
    this.root.scale.setScalar(SCALE);
    this.root.rotation.y = o.facing === 1 ? 0 : Math.PI; // 模型預設面向 +z，玩家轉 180°
  }

  _build(o) {
    const skin = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.6 });
    const skinDark = new THREE.MeshStandardMaterial({ color: shade(o.skin, 0.85), roughness: 0.6 });
    const jersey = new THREE.MeshStandardMaterial({ map: jerseyTexture(o.jersey, o.accent, o.number), roughness: 0.78 });
    const jerseyPlain = new THREE.MeshStandardMaterial({ color: o.jersey, roughness: 0.78 });
    const accent = new THREE.MeshStandardMaterial({ color: o.accent, roughness: 0.6 });
    const shorts = new THREE.MeshStandardMaterial({ map: shortsTexture(o.shorts, o.accent), roughness: 0.75 });
    const hair = new THREE.MeshStandardMaterial({ color: o.hair, roughness: 0.55 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.55 });
    const sole = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.4 });
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x2a3d5c, roughness: 0.3 });
    const blush = new THREE.MeshStandardMaterial({ color: 0xe8907a, roughness: 0.7, transparent: true, opacity: 0.55 });
    const lip = new THREE.MeshStandardMaterial({ color: shade(o.skin, 0.62), roughness: 0.6 });
    this.mats = [skin, skinDark, jersey, jerseyPlain, accent, shorts, hair, white, sole, dark, eyeWhite, iris, blush, lip];

    // ---- 髖部（動畫用的根）：Q 版腿短，髖高 0.36 ----
    this.hips = new THREE.Group();
    this.hips.position.y = 0.36;
    this.root.add(this.hips);

    // 短褲（寬鬆、圓潤）
    const shortsMesh = lathe([[0.15, -0.16], [0.2, -0.14], [0.215, -0.04], [0.2, 0.05], [0.17, 0.08]], shorts);
    shortsMesh.scale.z = 0.88;
    this.hips.add(shortsMesh);
    const belt = cyl(0.19, 0.19, 0.03, accent, 24); belt.position.y = 0.075; belt.scale.z = 0.88;
    this.hips.add(belt);

    // ---- 腿：短腿 + 大鞋 ----
    this.legs = []; this.knees = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * 0.09, -0.08, 0);
      const thigh = caps(0.07, 0.08, skin); thigh.position.y = -0.07;
      const knee = new THREE.Group(); knee.position.y = -0.14;
      const shin = caps(0.062, 0.06, skin); shin.position.y = -0.05;
      const sock = cyl(0.066, 0.066, 0.05, white); sock.position.y = -0.11;
      const sockStripe = cyl(0.068, 0.068, 0.014, accent); sockStripe.position.y = -0.095;
      // 鞋：圓潤大鞋
      const shoe = new THREE.Group(); shoe.position.y = -0.16;
      const shoeBody = sph(0.085, white, 18, 14); shoeBody.scale.set(1.05, 0.62, 1.55); shoeBody.position.set(0, 0.0, 0.035);
      const shoeSole = sph(0.085, sole, 18, 14); shoeSole.scale.set(1.08, 0.3, 1.58); shoeSole.position.set(0, -0.032, 0.035);
      const stripe = box(0.16, 0.022, 0.08, accent); stripe.position.set(0, 0.012, 0.02);
      const laces = box(0.05, 0.012, 0.06, dark); laces.position.set(0, 0.05, 0.05);
      shoe.add(shoeBody, shoeSole, stripe, laces);
      knee.add(shin, sock, sockStripe, shoe);
      hip.add(thigh, knee);
      this.hips.add(hip);
      this.legs.push(hip); this.knees.push(knee);
    }

    // ---- 軀幹（圓潤短身） ----
    this.torso = new THREE.Group();
    this.torso.position.y = 0.06;
    this.hips.add(this.torso);
    const body = lathe([[0.19, 0], [0.215, 0.1], [0.225, 0.22], [0.21, 0.32], [0.16, 0.38], [0.05, 0.4]], jersey, 36);
    body.scale.z = 0.85;
    this.torso.add(body);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 26), accent);
    collar.rotation.x = Math.PI / 2; collar.position.y = 0.39; collar.scale.z = 0.85;
    this.torso.add(collar);

    // ---- 頭（大頭，直接坐在肩上） ----
    this.head = new THREE.Group();
    this.head.position.y = 0.6;
    const R = 0.25;
    const headMesh = sph(R, skin, 32, 24); headMesh.scale.set(1, 0.96, 0.98);
    this.head.add(headMesh);
    for (const s of [-1, 1]) {
      const ear = sph(0.045, skinDark, 12, 10); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * 0.245, -0.02, 0);
      // 大眼：白眼球 + 虹膜 + 瞳孔 + 高光
      const eye = sph(0.052, eyeWhite, 16, 12); eye.scale.set(0.78, 1.15, 0.4); eye.position.set(s * 0.085, 0.0, R * 0.9);
      const ir = sph(0.03, iris, 12, 10); ir.scale.set(0.85, 1, 0.5); ir.position.set(s * 0.083, -0.005, R * 0.9 + 0.017);
      const pupil = sph(0.017, dark, 10, 8); pupil.scale.set(1, 1.1, 0.5); pupil.position.set(s * 0.082, -0.006, R * 0.9 + 0.03);
      const hi = sph(0.008, eyeWhite, 8, 6); hi.position.set(s * 0.073, 0.012, R * 0.9 + 0.038);
      const brow = box(0.06, 0.012, 0.012, hair); brow.position.set(s * 0.085, 0.075, R * 0.93); brow.rotation.z = s * -0.18; brow.castShadow = false;
      const cheek = sph(0.032, blush, 10, 8); cheek.scale.set(1, 0.6, 0.4); cheek.position.set(s * 0.14, -0.07, R * 0.82); cheek.castShadow = false;
      this.head.add(ear, eye, ir, pupil, hi, brow, cheek);
    }
    const nose = sph(0.02, skinDark, 10, 8); nose.position.set(0, -0.045, R * 0.98);
    const mouth = box(0.05, 0.01, 0.008, lip); mouth.position.set(0, -0.11, R * 0.9);
    this.head.add(nose, mouth);
    // 頭髮：前半到眉毛上方、後半蓋到後腦
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(R + 0.012, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), hair);
    hairCap.scale.set(1, 1.02, 0.98); hairCap.castShadow = true;
    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(R + 0.012, 32, 16, Math.PI, Math.PI, 0, Math.PI * 0.66), hair);
    hairBack.scale.set(1, 1.02, 0.98);
    this.head.add(hairCap, hairBack);
    if (o.style === 'cap') {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(R + 0.022, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), jerseyPlain);
      crown.position.y = 0.01; crown.castShadow = true;
      const crownBack = new THREE.Mesh(new THREE.SphereGeometry(R + 0.022, 32, 16, Math.PI, Math.PI, 0, Math.PI * 0.55), jerseyPlain);
      crownBack.position.y = 0.01;
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.09, R + 0.09, 0.016, 28, 1, false, -Math.PI * 0.4, Math.PI * 0.8), jerseyPlain);
      visor.position.set(0, 0.1, 0.02); visor.rotation.x = 0.2; visor.castShadow = false;
      const button = sph(0.016, accent, 8, 6); button.position.y = R + 0.03;
      this.head.add(crown, crownBack, visor, button);
    } else {
      const band = new THREE.Mesh(new THREE.TorusGeometry(R + 0.005, 0.022, 8, 40), white);
      band.rotation.x = Math.PI / 2; band.position.y = 0.11; band.scale.set(1, 1, 0.98); band.castShadow = false;
      // 立體瀏海/髮束
      for (const [x, y, z, sx, sy, sz] of [[0, 0.24, 0.02, 1.5, 0.7, 1.2], [-0.13, 0.2, 0.08, 0.9, 0.6, 0.9], [0.14, 0.21, 0.06, 0.9, 0.6, 0.9]]) {
        const tuft = sph(0.09, hair, 14, 10); tuft.scale.set(sx, sy, sz); tuft.position.set(x, y, z); tuft.castShadow = false;
        this.head.add(tuft);
      }
      this.head.add(band);
    }
    this.torso.add(this.head);

    // ---- 手臂：短臂 + 圓手套手 ----
    // 模型面向 +z，其右手在 -x 側。座標系（Euler XYZ）：
    //   shoulder.rotation.x < 0 → 手臂往前抬；rotation.z 往「遠離身體」= -x 側為負、+x 側為正
    //   elbow.rotation.x < 0 → 前臂往前/上彎
    this.arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 0.2, 0.31, 0);
      const sleeve = sph(0.078, jerseyPlain, 16, 12); sleeve.scale.set(1, 0.9, 1);
      const sleeveTrim = cyl(0.062, 0.066, 0.02, accent); sleeveTrim.position.y = -0.07;
      const upper = caps(0.052, 0.1, skin); upper.position.y = -0.13;
      const elbow = new THREE.Group(); elbow.position.y = -0.21;
      const elbowBall = sph(0.05, skin, 12, 10);
      const fore = caps(0.048, 0.09, skin); fore.position.y = -0.07;
      const wrist = cyl(0.055, 0.055, 0.035, white); wrist.position.y = -0.135;
      const hand = sph(0.066, skin, 16, 12); hand.scale.set(0.95, 0.85, 1); hand.position.y = -0.2;
      elbow.add(elbowBall, fore, wrist, hand);
      shoulder.add(sleeve, sleeveTrim, upper, elbow);
      this.torso.add(shoulder);
      this.arms.push({ shoulder, elbow, hand, side: s, out: s }); // out：往外張開的 z 旋轉正負號
    }

    // ---- 球拍（右手 = arms[0]） ----
    if (!PADDLE_GEO) PADDLE_GEO = paddleGeometry();
    const faceMat = new THREE.MeshStandardMaterial({ color: o.paddle, roughness: 0.45, metalness: 0.05 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    this.mats.push(faceMat, edgeMat);
    const paddle = new THREE.Group();
    const face = new THREE.Mesh(PADDLE_GEO, faceMat);
    face.castShadow = true; face.position.y = 0.2;
    const edge = new THREE.Mesh(PADDLE_GEO, edgeMat);
    edge.scale.set(1.04, 1.03, 0.7); edge.position.y = 0.2;
    const handle = cyl(0.017, 0.019, 0.1, edgeMat, 12); handle.position.y = 0.04;
    paddle.add(edge, face, handle);
    paddle.scale.setScalar(1.15);
    // 握在手心：拍柄沿前臂延伸方向，拍面朝向前方（前臂抬起時拍面立起朝網）
    paddle.position.set(0, -0.2, 0.02);
    paddle.rotation.set(Math.PI / 2 - 0.25, 0, 0.1);
    const armR = this.arms[0];
    armR.elbow.add(paddle);
    this.paddle = paddle;
    this.paddleFace = face;
    this.hand = armR.hand;
    this._restPose();
  }

  // 準備姿勢（ready stance）：雙臂向兩側張開、手肘彎曲把拍子舉在胸前，左手張開平衡；微蹲前傾
  // sx：前抬（負=往前） sz：外張幅度（依 out 正負號套用） ex：肘彎
  static REST = {
    R: { sx: -0.85, sy: 0, sz: 0.6, ex: -1.45 },
    L: { sx: -0.6, sy: 0, sz: 0.85, ex: -1.05 },
    torsoX: 0.22, knee: 0.35, hipY: 0.33,
  };
  _restPose() {
    const P = Athlete.REST;
    const [R, L] = this.arms;
    R.shoulder.rotation.set(P.R.sx, P.R.sy, P.R.sz * R.out);
    R.elbow.rotation.set(P.R.ex, 0, 0);
    L.shoulder.rotation.set(P.L.sx, P.L.sy, P.L.sz * L.out);
    L.elbow.rotation.set(P.L.ex, 0, 0);
    this.torso.rotation.set(P.torsoX, 0, 0);
  }

  setEnvIntensity(v) { for (const m of this.mats) m.envMapIntensity = v; }

  swing(kind) { this.anim.swing = kind; this.anim.t = 0; }
  get swinging() { return !!this.anim.swing; }

  pickSwing(ballX) {
    // 面向 -z 的玩家右手邊是 +x，面向 +z 的 AI 右手邊是 -x
    const right = -(ballX - this.pos.x) * this.facing;
    return right >= -0.1 ? 'fore' : 'back';
  }

  paddleWorld(out) { return this.paddleFace.getWorldPosition(out); }

  update(dt, moveVec) {
    const a = this.anim;
    const sp = moveVec ? Math.hypot(moveVec.x, moveVec.z) : 0;
    const target = Math.min(1, sp / 4);
    a.run += (target - a.run) * Math.min(1, dt * 10);
    a.phase += dt * (7 + sp * 1.8);
    const s = Math.sin(a.phase), c = Math.cos(a.phase);
    const P = Athlete.REST;
    // 短腿跑步：擺幅大一點，膝在後擺時彎曲；靜止時保持微蹲
    this.legs[0].rotation.x = s * 0.9 * a.run - P.knee * 0.5 * (1 - a.run);
    this.legs[1].rotation.x = -s * 0.9 * a.run - P.knee * 0.5 * (1 - a.run);
    this.knees[0].rotation.x = Math.max(0, -s) * 1.1 * a.run + P.knee * (1 - a.run) + 0.05;
    this.knees[1].rotation.x = Math.max(0, s) * 1.1 * a.run + P.knee * (1 - a.run) + 0.05;
    this.hips.position.y = THREE.MathUtils.lerp(P.hipY, 0.36, a.run) + Math.abs(c) * 0.04 * a.run + Math.sin(a.phase * 0.5) * 0.008 * (1 - a.run);
    const lean = moveVec ? THREE.MathUtils.clamp(-moveVec.x * this.facing * 0.06, -0.15, 0.15) : 0;
    this.hips.rotation.z += (lean - this.hips.rotation.z) * Math.min(1, dt * 8);
    // 大頭隨跑步小幅點頭
    this.head.rotation.x = -0.12 + Math.sin(a.phase * 0.5) * 0.02 - a.run * Math.abs(c) * 0.05;

    const [R, L] = this.arms;
    const ro = R.out, lo = L.out;
    if (!a.swing) {
      const k = Math.min(1, dt * 10);
      // 跑步時雙臂前後擺（仍保持張開），靜止時回到準備姿勢
      R.shoulder.rotation.x += ((P.R.sx + s * 0.35 * a.run) - R.shoulder.rotation.x) * k;
      R.shoulder.rotation.y += (0 - R.shoulder.rotation.y) * k;
      R.shoulder.rotation.z += ((P.R.sz - 0.25 * a.run) * ro - R.shoulder.rotation.z) * k;
      R.elbow.rotation.x += (P.R.ex - R.elbow.rotation.x) * k;
      R.elbow.rotation.y += (0 - R.elbow.rotation.y) * k;
      L.shoulder.rotation.x += ((P.L.sx - s * 0.6 * a.run) - L.shoulder.rotation.x) * k;
      L.shoulder.rotation.y += (0 - L.shoulder.rotation.y) * k;
      L.shoulder.rotation.z += ((P.L.sz - 0.3 * a.run) * lo - L.shoulder.rotation.z) * k;
      L.elbow.rotation.x += (P.L.ex - L.elbow.rotation.x) * k;
      this.torso.rotation.x += (P.torsoX - this.torso.rotation.x) * k;
      this.torso.rotation.y += (0 - this.torso.rotation.y) * Math.min(1, dt * 8);
      return;
    }
    // 揮拍動畫（0.42s）：前 22% 引拍，之後快速揮出，尾段回位
    // k：-1 引拍極限 → +1 揮出極限。右臂在 -x 側：shoulder.y 正 = 手臂往前掃
    const DUR = 0.42;
    a.t += dt;
    const t = Math.min(1, a.t / DUR);
    let k;
    if (t < 0.22) k = -t / 0.22;
    else if (t < 0.6) { const u = (t - 0.22) / 0.38; k = -1 + 2 * (1 - Math.pow(1 - u, 3)); }
    else { const u = (t - 0.6) / 0.4; k = 1 - u * u; }
    // 軀幹扭轉：右肩往後 = torso.y 負（-x 側肩膀往 -z）
    if (a.swing === 'fore' || a.swing === 'volley') {
      // 正手：手臂向右側伸直往後引，再橫掃到身前左側
      R.shoulder.rotation.x = -0.25;
      R.shoulder.rotation.y = k * 1.1;
      R.shoulder.rotation.z = (1.25 - Math.max(0, k) * 0.45) * ro;
      R.elbow.rotation.x = -0.45 - Math.max(0, k) * 0.35;
      this.torso.rotation.y = k * 0.6;
      this.torso.rotation.x = 0.25;
      L.shoulder.rotation.x = -0.4;
      L.shoulder.rotation.z = (1.0 + k * 0.2) * lo;
      L.elbow.rotation.x = -0.8;
    } else if (a.swing === 'back') {
      // 反手：拍子先拉到左側（越過胸前），再往右前方橫掃
      R.shoulder.rotation.x = -0.45;
      R.shoulder.rotation.y = -k * 1.1;
      R.shoulder.rotation.z = (0.2 + Math.max(0, k) * 0.9) * ro;
      R.elbow.rotation.x = -0.5 - Math.max(0, -k) * 0.5;
      this.torso.rotation.y = -k * 0.6;
      this.torso.rotation.x = 0.25;
      L.shoulder.rotation.z = (0.9 - k * 0.25) * lo;
    } else if (a.swing === 'serve') {
      // 低手發球：右臂伸直由後下方往前上擺，左手往前拋球
      R.shoulder.rotation.x = 0.55 - (k + 1) * 0.95;   // -1 → 0.55（後）, +1 → -1.35（前上）
      R.shoulder.rotation.y = 0;
      R.shoulder.rotation.z = 0.4 * ro;
      R.elbow.rotation.x = -0.15;
      L.shoulder.rotation.x = -0.3 - Math.max(0, -k) * 0.8;
      L.shoulder.rotation.z = 0.5 * lo;
      L.elbow.rotation.x = -0.4;
      this.torso.rotation.y = -k * 0.2;
      this.torso.rotation.x = 0.12;
    }
    if (t >= 1) { a.swing = null; this._restPose(); }
  }
}

export function makePlayerAthlete() {
  return new Athlete({ jersey: 0x2f6df6, accent: 0xffd23f, shorts: 0x14213d, skin: 0xf1c9a5, hair: 0x2b1d14, paddle: 0x2a9df4, number: 7, style: 'cap', facing: -1 });
}
export function makeAIAthlete() {
  return new Athlete({ jersey: 0xf25c2b, accent: 0xffffff, shorts: 0x1c1c1c, skin: 0xd9a479, hair: 0x120e0c, paddle: 0xff7a1a, number: 23, style: 'band', facing: 1 });
}
