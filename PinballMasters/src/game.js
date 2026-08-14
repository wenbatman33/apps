// ===== 美式彈珠台核心：3D 檯面 / Flipper / 彈簧發射 / 棋主 Boss 戰 / 引擎內 HUD =====
import * as THREE from 'three';
import { PinballWorld, TABLE } from './physics.js';
import { Trail, ParticlePool, ShockwavePool, DamageTextPool, ScreenShake } from './fx.js';
import { AudioSys } from './audio.js';
import { HEROES, STAGES, BOSS, LANE, STAGE_RAMPS } from './data.js';
import { TUNE } from './tune.js';
import { makeText, makeRect, makeButton, makeBarFill, disposeGroup } from './ui.js';
import {
  makePlayfieldTexture, makeRoughnessTexture, MAT,
  buildPopBumper, buildDropTarget, buildSlingshot, buildFlipper, buildWireGuide, buildWallSegment,
  buildRollover, buildLaneLight, buildSpinner, buildSaucer, buildPost,
  buildBulb, buildRingCore, buildPlatform, buildRamp, buildScoreboard, BULB_LAYOUT, RING,
} from './art.js';

function makeEmojiSprite(emoji, worldSize = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '96px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd75e'; // 非彩色 emoji 字符（如 ♚）用金色
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6;
  g.fillText(emoji, 64, 72);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(worldSize, worldSize, 1);
  s.renderOrder = 8;
  return s;
}

export class Game {
  // app: { renderer, canvas, ui, onPause }
  constructor(app, stageIdx, onEnd) {
    this.app = app;
    this.renderer = app.renderer;
    this.canvas = app.canvas;
    this.ui = app.ui;
    this.env = app.env;       // 環境反射貼圖
    this.postfx = app.postfx; // 後製 bloom
    this.stageIdx = stageIdx;
    this.stage = STAGES[stageIdx];
    this.onEnd = onEnd;
    this.dead = false;
    this.paused = false;
    this.devDrag = false;

    // ---- 場景 ----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a1a);
    this.scene.fog = new THREE.Fog(0x070a1a, 26, 48);
    this.camera = new THREE.PerspectiveCamera(TUNE.camera.fov, 1, 0.1, 100);

    this.scene.environment = this.env;
    // 打光：半球環境 + 主燈（投影）+ 兩側冷暖輪廓光
    this.scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0e28, 0.55));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.5);
    key.position.set(3.5, 11, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
    key.shadow.camera.near = 1; key.shadow.camera.far = 26;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    const rimCool = new THREE.DirectionalLight(0x5a7bff, 0.7);
    rimCool.position.set(-7, 5, -8);
    this.scene.add(rimCool);
    const rimWarm = new THREE.DirectionalLight(0xff7a4d, 0.35);
    rimWarm.position.set(7, 4, 7);
    this.scene.add(rimWarm);

    // 不額外補光：檯面的金屬件（發射軌、導軌）反射率高，
    // 多加光源只會讓整條軌道過曝成燈管。球的辨識度改用陰影對比解決。
    // 不給彈珠跟隨光源：真實鋼珠不發光也不會照亮檯面，
    // 立體感交給環境反射（envMap）與場景既有燈光
    // 定點氛圍燈：彈射器區（金）與 Boss 王座區（紅）
    const bossGlow = new THREE.PointLight(0xff3d6e, 1.1, 6, 1.8);
    bossGlow.position.set(0, 2.2, -4.9);
    this.scene.add(bossGlow);

    // ---- 物理 / 特效 ----
    this.world = new PinballWorld(TUNE);
    this.particles = new ParticlePool(this.scene, TUNE);
    this.shockwaves = new ShockwavePool(this.scene);
    this.dmgTexts = new DamageTextPool(this.scene);
    this.shake = new ScreenShake();

    // ---- 戰鬥狀態 ----
    this.state = 'launch'; // launch | play | over
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.multiplier = 1;
    this.rounds = 0;                              // 已擊倒主目標的次數（街機模式持續刷分）
    this.ringZ = this.stage.ringZ ?? RING.z;      // 各台燈環位置（避開該台的軌道）
    this.bossColor = this.stage.bossColor ?? BOSS.color; // 主目標配色依機檯主題
    this.bossHp = this.stage.bossHp;
    this.bossHpMax = this.stage.bossHp;
    this.vulnT = 0;
    this.saverT = 0;
    this.ballIdx = 0;
    this.stuckT = 0;
    this.plunger = null; // {sy, k}
    this.flipTouches = new Map(); // pointerId -> 'L'|'R'
    this.spaceCharge = -1;

    this._buildTable();
    this._buildBall();
    this._buildHUD();
    this._newBall(true);

    // 背景音樂暫不啟用（合成 BGM 品質不佳，待換高品質素材）
    this.resize();
  }

  // ================= 檯面建構 =================
  _buildTable() {
    const HW = TABLE.HALF_W;
    const env = this.env;
    // 檯面（絲印藝術圖 + 粗糙度變化 + 清漆反射）
    this.boardTex = makePlayfieldTexture(this.stage, this.app.playfieldArts?.tables?.[this.stageIdx] ?? null);
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE.W, TABLE.L),
      new THREE.MeshStandardMaterial({
        map: this.boardTex, roughnessMap: makeRoughnessTexture(),
        roughness: 0.42, metalness: 0.25, envMap: env, envMapIntensity: 0.5,
      })
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    const outer = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshBasicMaterial({ color: 0x03050d })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.06;
    this.scene.add(outer);

    // ---- 物理牆面（同時生成視覺） ----
    const W = this.world;
    const seg = (ax, az, bx, bz, opts) => {
      const s = W.addSegment(ax, az, bx, bz, opts);
      if (s.draw) {
        const col = opts?.color ?? 0x4f7bff;
        const mesh = buildWallSegment(ax, az, bx, bz, col, env, { low: opts?.low });
        mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
        this.scene.add(mesh);
        s.mesh = mesh;
      }
      return s;
    };
    // 頂部圓弧
    const arcC = { x: 0, z: TABLE.TOP + HW };
    const N = 18;
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI, t1 = ((i + 1) / N) * Math.PI;
      seg(Math.cos(t0) * HW, arcC.z - Math.sin(t0) * HW,
          Math.cos(t1) * HW, arcC.z - Math.sin(t1) * HW);
    }
    // 側牆
    seg(HW, arcC.z, HW, 6.45);                    // 右外牆（含發射軌外側）
    seg(-HW, arcC.z, -HW, 2.6);                   // 左牆
    // 發射軌用矮牆：一般牆高 0.52，從俯視角度會把整顆球埋在槽底看不見
    seg(TABLE.LANE_X, -2.9, TABLE.LANE_X, 6.45, { low: true });  // 發射軌內牆（整條）
    seg(TABLE.LANE_X, 6.45, HW, 6.45, { low: true });            // 發射軌底
    // 單向閘門（發射後關閉，防止球回到發射軌）
    this.gate = seg(TABLE.LANE_X, -3.1, HW + 0.05, -3.95, { active: false, draw: false });

    // 彈弓斜牆：兼任側邊導引牆——球撞到被彈回中央，慢速則滑向 flipper。
    // 底部因此沒有死路 outlane，也沒有夾縫卡球
    this.slings = [];
    // 上段＝單純導引牆（不彈射），下段＝真正的 slingshot（長度約 1 個球徑的數倍）
    const sideWall = (outerX) => {
      const sgn = outerX > 0 ? 1 : -1;
      const M = { x: sgn * 2.25, z: 3.62 };            // 三角形上頂點
      const B = { x: sgn * 1.52, z: 4.62 };            // 三角形下內側頂點（斜邊 M→B 面向中央）
      const C = { x: sgn * 2.42, z: 4.62 };            // 靠牆的外側角
      seg(outerX, 2.6, M.x, M.z, { color: this.stage.theme?.wall ?? 0x3b5bff });
      const s = seg(M.x, M.z, B.x, B.z, { kind: 'sling', e: 0.7, draw: false });
      const grp = buildSlingshot(M, B, C, this.stage.theme?.main ?? 0xff5e8a, env);
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(grp);
      const obj = { grp, seg: s, pulse: 0 };
      s.ref = obj;
      this.slings.push(obj);
    };
    sideWall(-HW);
    sideWall(TABLE.LANE_X);
    // drain 兩側擋牆（球只能從兩片 flipper 中間漏下）——用矮牆樣式，不然會變成兩條刺眼的白柱
    const wallCol = this.stage.theme?.wall ?? 0x3b5bff;
    seg(-1.52, 4.62, -1.52, 6.25, { color: wallCol, low: true });
    seg(1.52, 4.62, 1.52, 6.25, { color: wallCol, low: true });

    // ---- Flipper ----
    this.flippers = [];
    for (const side of ['L', 'R']) {
      const f = W.addFlipper(side);
      const { rest } = W.flipperAngles(f);
      f.ang = rest;
      const grp = buildFlipper(TUNE.flipper.len, TUNE.flipper.r, side === 'L' ? 0xff4d5e : 0x35d6ff, env);
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      const { px, pz } = W.flipperPose(f);
      grp.position.set(px, 0, pz);
      this.scene.add(grp);
      this.flippers.push({ f, grp, mesh: grp.userData.body });
    }

    // ---- Pop bumpers ----
    this.bumpers = [];
    for (const bp of this.stage.bumpers) {
      const r = 0.42;
      const grp = buildPopBumper(r, 0xffd75e, env);
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      grp.position.set(bp.x, 0, bp.z);
      this.scene.add(grp);
      // 每個彈射器自帶點光源
      const light = new THREE.PointLight(0xffb830, 0.45, 3.2, 2);
      light.position.set(bp.x, 0.7, bp.z);
      this.scene.add(light);
      const cir = this.world.addCircle({ x: bp.x, z: bp.z, r, kind: 'bumper', e: 0.9, ref: null });
      const bumper = { grp, body: grp.userData.cap, ring: grp.userData.ring, light, cir, pulse: 0 };
      cir.ref = bumper;
      this.bumpers.push(bumper);
    }

    // ---- Drop targets（主靶組：全部打掉 → Boss 破防） ----
    this.targets = [];
    for (const tp of this.stage.targets) {
      const r = 0.2;
      const grp = buildDropTarget(0xffd75e, env);
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      grp.position.set(tp.x, 0, tp.z);
      this.scene.add(grp);
      const cir = this.world.addCircle({ x: tp.x, z: tp.z, r, kind: 'target', e: 0.7, ref: null });
      const target = { grp, mesh: grp.userData.face, cir, respawnFx: 0, dropT: 0 };
      cir.ref = target;
      this.targets.push(target);
    }

    // ---- 側邊獨立靶（打中給高分，不影響破防） ----
    this.sideTargets = [];
    for (const tp of this.stage.sideTargets ?? []) {
      const grp = buildDropTarget(0x35d6ff, env);
      grp.rotation.y = tp.x < 0 ? Math.PI / 2 : -Math.PI / 2;
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      grp.position.set(tp.x, 0, tp.z);
      this.scene.add(grp);
      const cir = this.world.addCircle({ x: tp.x, z: tp.z, r: 0.2, kind: 'sideTarget', e: 0.75, ref: null });
      const t = { grp, mesh: grp.userData.face, cir, hitT: 0 };
      cir.ref = t;
      this.sideTargets.push(t);
    }

    // ---- 頂部滾道字母燈（集滿 → 得分倍率 +1） ----
    this.laneLights = [];
    {
      const letters = this.stage.laneLetters ?? [];
      const n = letters.length;
      const span = 4.3;                       // 滾道區總寬
      const step = span / n;
      const x0 = -span / 2 + step / 2;
      for (let i = 0; i < n; i++) {
        const lx = x0 + i * step;
        const grp = buildLaneLight(letters[i]);
        grp.position.set(lx, 0, LANE.z);
        this.scene.add(grp);
        const sen = this.world.addSensor({ x: lx, z: LANE.z, r: 0.3, kind: 'lane', ref: null });
        const lane = { grp, sen, letter: letters[i], on: false };
        sen.ref = lane;
        this.laneLights.push(lane);
      }
      // 滾道分隔牆
      for (let i = 1; i < n; i++) {
        const wx = x0 + i * step - step / 2;
        seg(wx, LANE.wallZ0, wx, LANE.wallZ1, { color: 0x3b5bff });
      }
    }

    // ---- 左側滾道通道（spinner 所在的 lane，兩道牆形成通道） ----
    if ((this.stage.spinners ?? []).length) {
      seg(-2.45, -1.85, -2.45, 0.85, { color: 0x3b5bff });   // 通道內牆
      seg(-2.45, -1.85, -3.05, -2.55, { color: 0x3b5bff });  // 上方導入斜口
    }

    // ---- Spinner 旋轉片 ----
    this.spinners = [];
    for (const sp of this.stage.spinners ?? []) {
      const grp = buildSpinner(env);
      grp.rotation.y = Math.PI / 2;           // 葉片面朝上下（球從 z 方向穿過）
      grp.position.set(sp.x, 0, sp.z);
      this.scene.add(grp);
      const sen = this.world.addSensor({ x: sp.x, z: sp.z, r: 0.34, kind: 'spinner', ref: null });
      const o = { grp, blade: grp.userData.blade, sen, spin: 0, spinVel: 0 };
      sen.ref = o;
      this.spinners.push(o);
    }

    // ---- Saucer 吸球洞 ----
    this.saucers = [];
    for (const sp of this.stage.saucers ?? []) {
      const grp = buildSaucer(0xc77dff, env);
      grp.position.set(sp.x, 0, sp.z);
      this.scene.add(grp);
      const light = new THREE.PointLight(0xc77dff, 0.5, 2.6, 2);
      light.position.set(sp.x, 0.5, sp.z);
      this.scene.add(light);
      const sc = this.world.addSaucer({ x: sp.x, z: sp.z, r: 0.3, ref: null });
      const o = { grp, glow: grp.userData.glow, light, sc, holdT: 0 };
      sc.ref = o;
      this.saucers.push(o);
    }

    // ---- 橡膠障礙柱 ----
    for (const pp of this.stage.posts ?? []) {
      const grp = buildPost(0xf24a6a, env);
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      grp.position.set(pp.x, 0, pp.z);
      this.scene.add(grp);
      this.world.addCircle({ x: pp.x, z: pp.z, r: 0.14, kind: 'post', e: 0.82, ref: null });
    }

    // ---- 檯面觸點 ----
    this.rollovers = [];
    for (const rp of this.stage.rollovers ?? []) {
      const grp = buildRollover(0x35d6ff);
      grp.position.set(rp.x, 0, rp.z);
      this.scene.add(grp);
      const sen = this.world.addSensor({ x: rp.x, z: rp.z, r: 0.26, kind: 'rollover', ref: null });
      const o = { grp, lens: grp.userData.lens, sen, litT: 0 };
      sen.ref = o;
      this.rollovers.push(o);
    }

    // ---- 檯面燈泡陣列（Space Cadet 式的密集燈點，會流動點亮） ----
    this.bulbs = [];
    this.ringBulbs = [];
    for (const p of BULB_LAYOUT) {
      const col = p.c.includes('255,210') ? 0xffd75e
        : p.c.includes('90,180') ? 0x5ab4ff
        : p.c.includes('200,140') ? 0xc88cff : 0xff6e8c;
      const m = buildBulb(col);
      m.position.set(p.x, 0.012, p.z);
      this.scene.add(m);
      const bulb = { m, base: 0.35, lit: 0, phase: Math.random() * 6.28, ring: p.ring };
      this.bulbs.push(bulb);
      if (p.ring !== undefined) this.ringBulbs[p.ring] = bulb;
    }

    // ---- 中央大燈環核心（撞擊點亮一格，繞滿一圈給大獎） ----
    {
      const rz = this.ringZ;
      const grp = buildRingCore(0x5ae6ff, env);
      grp.position.set(0, 0, rz);
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(grp);
      const light = new THREE.PointLight(0x5ae6ff, 0.7, 3.4, 2);
      light.position.set(0, 0.6, rz);
      this.scene.add(light);
      const cir = this.world.addCircle({ x: 0, z: rz, r: 0.5, kind: 'ringCore', e: 0.86, ref: null });
      this.ringCore = { grp, ...grp.userData, light, cir, hitT: 0, progress: 0 };
      cir.ref = this.ringCore;
    }

    // ---- 左側抬高任務平台（純視覺分層，不阻擋球路） ----
    {
      const plat = buildPlatform(
        [[-3.2, -2.75], [-1.95, -2.45], [-1.9, -0.85], [-3.2, -0.7]],
        0.1, 0x7a4ad6, env
      );
      this.scene.add(plat);
    }

    // ---- 鋼絲導軌（外圈與入球道，增加機檯真實感） ----
    const arcPts = [];
    for (let i = 0; i <= 14; i++) {
      const t = (i / 14) * Math.PI;
      arcPts.push({ x: Math.cos(t) * (HW - 0.22), z: (TABLE.TOP + HW) - Math.sin(t) * (HW - 0.22) });
    }
    const guideTop = buildWireGuide(arcPts, env, 0.46, 0.042);
    guideTop.castShadow = true;
    this.scene.add(guideTop);
    // 雙層鋼絲（真實機檯的 habitrail 是上下兩條）
    const guideTop2 = buildWireGuide(arcPts, env, 0.66, 0.036);
    this.scene.add(guideTop2);
    // 立柱連接兩層
    for (let i = 0; i <= 14; i += 2) {
      const p = arcPts[i];
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 6), MAT.chrome(env));
      strut.position.set(p.x, 0.56, p.z);
      this.scene.add(strut);
    }
    // ---- 高架軌道（球真的會爬上去跑一圈） ----
    this.ramps = [];
    for (const def of STAGE_RAMPS[this.stageIdx] ?? []) {
      const grp = buildRamp(def.path, def.color, env);
      this.scene.add(grp);
      // 依曲線取樣，讓物理與視覺走同一條路徑
      const curve = grp.userData.curve;
      const N = 90;
      const samples = [];
      for (let i = 0; i <= N; i++) {
        const p = curve.getPoint(i / N);
        samples.push({ x: p.x, y: p.y - 0.16, z: p.z });
      }
      let length = 0;
      for (let i = 1; i < samples.length; i++) {
        length += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
      }
      const r = this.world.addRamp({
        id: def.id, entry: { x: def.path[0].x, z: def.path[0].z }, entryR: 0.42,
        entryDir: def.entryDir, exitDir: def.exitDir,
        minSpeed: def.minSpeed, climbDrag: def.climbDrag, exitSpeed: def.exitSpeed,
        samples, length, ref: null,
      });
      const obj = { def, grp, arrow: grp.userData.arrow, floor: grp.userData.floor, r, litT: 0, runs: 0 };
      r.ref = obj;
      this.ramps.push(obj);
    }
    for (const sgn of [-1, 1]) {
      const pts = [
        { x: sgn * (HW - 0.2), z: 3.2 }, { x: sgn * 2.5, z: 4.1 }, { x: sgn * 1.62, z: 4.86 },
      ];
      const gd = buildWireGuide(pts, env, 0.42, 0.04);
      gd.castShadow = true;
      this.scene.add(gd);
    }

    // ---- Boss：虛空棋主（王座 + 水晶核心 + 環繞碎片） ----
    {
      const grp = new THREE.Group();
      // 王座底座
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(BOSS.r * 1.5, BOSS.r * 1.75, 0.22, 8),
        new THREE.MeshStandardMaterial({ color: 0x11173a, roughness: 0.4, metalness: 0.7, envMap: env, envMapIntensity: 0.9 })
      );
      base.position.y = 0.11;
      base.receiveShadow = true;
      // 核心
      const body = new THREE.Mesh(
        new THREE.IcosahedronGeometry(BOSS.r, 1),
        new THREE.MeshStandardMaterial({
          color: 0x1a1030, emissive: this.bossColor, emissiveIntensity: 0.8,
          roughness: 0.18, metalness: 0.8, flatShading: true, envMap: env, envMapIntensity: 1.2,
        })
      );
      body.position.y = BOSS.r + 0.25;
      body.castShadow = true;
      // 外殼（半透明能量罩）
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(BOSS.r * 1.32, 1),
        new THREE.MeshBasicMaterial({
          color: this.bossColor, transparent: true, opacity: 0.18,
          blending: THREE.AdditiveBlending, wireframe: true,
        })
      );
      shell.position.y = BOSS.r + 0.25;
      // 王冠
      const crown = new THREE.Group();
      const cring = new THREE.Mesh(
        new THREE.TorusGeometry(BOSS.r * 0.62, 0.055, 10, 26),
        MAT.plasticGlow(0xffd75e)
      );
      cring.rotation.x = Math.PI / 2;
      crown.add(cring);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), MAT.plasticGlow(0xffd75e));
        spike.position.set(Math.cos(a) * BOSS.r * 0.62, 0.13, Math.sin(a) * BOSS.r * 0.62);
        crown.add(spike);
      }
      crown.position.y = BOSS.r * 2 + 0.38;
      // 環繞碎片
      const shards = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.15),
          new THREE.MeshStandardMaterial({ color: 0x2a1040, emissive: this.bossColor, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.6, flatShading: true })
        );
        const a = (i / 6) * Math.PI * 2;
        s.position.set(Math.cos(a) * 1.15, BOSS.r + 0.3 + Math.sin(a * 2) * 0.25, Math.sin(a) * 1.15);
        shards.add(s);
      }
      shards.position.y = 0;
      grp.add(base, body, shell, crown, shards);
      grp.position.set(BOSS.x, 0, BOSS.z);
      this.scene.add(grp);
      const cir = this.world.addCircle({ x: BOSS.x, z: BOSS.z, r: BOSS.r, kind: 'boss', e: 0.6, ref: null });
      this.boss = { grp, body, shell, crown, shards, cir, spin: 0, hitT: 0 };
      cir.ref = this.boss;
    }

    // ---- 發射軌指示燈：沿軌道排一列燈，由下往上依序亮起，指出發射方向 ----
    // 用純 emissive 的小燈罩，不放實際光源——點光源打在軌道金屬牆上會過曝成燈管。
    this.laneLights2 = [];
    {
      const col = new THREE.Color(this.stage.theme?.accent ?? 0xffd75e);
      const N = 9;
      // 軌道兩側各一排（內牆側與外牆側），一起跑才有「通道」的方向感
      for (const side of [TABLE.LANE_X + 0.14, TABLE.HALF_W - 0.14]) {
        for (let i = 0; i < N; i++) {
          const t = i / (N - 1);
          const z = 5.75 - t * 7.6;                     // 由發射口往檯面頂端排列
          const lens = new THREE.Mesh(
            new THREE.SphereGeometry(0.058, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({
              color: 0x1a1408, emissive: col, emissiveIntensity: 0.25,
              roughness: 0.3, metalness: 0.1,
            })
          );
          lens.position.set(side, 0.02, z);
          this.scene.add(lens);
          this.laneLights2.push({ lens, idx: i });
        }
      }
    }

    // ---- 彈簧發射桿（金屬桿 + 彈簧圈 + 握把） ----
    {
      const grp = new THREE.Group();
      // pad 是推球的圓盤，必須貼在球「後方」（z 更大），不能與球體重疊。
      // 球停在 z=6.1、半徑 0.195 → 球後緣 6.295；群組原點 6.28，故 pad 置於 +0.09。
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.5, 10), MAT.chrome(env));
      rod.rotation.x = Math.PI / 2;
      rod.position.set(0, 0.22, 0.72);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 16), MAT.chrome(env));
      pad.rotation.x = Math.PI / 2;
      pad.position.set(0, 0.2, 0.09);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), MAT.plasticGlow(0xff5e3d));
      knob.position.set(0, 0.22, 1.42);
      // 彈簧
      const coilPts = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        coilPts.push(new THREE.Vector3(Math.cos(t * Math.PI * 12) * 0.11, Math.sin(t * Math.PI * 12) * 0.11, t * 0.75));
      }
      const coil = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 90, 0.028, 6, false),
        MAT.chrome(env)
      );
      coil.position.set(0, 0.2, 0.26);
      grp.add(rod, pad, knob, coil);
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      grp.position.set(TABLE.LANE_CENTER, 0, 6.28);
      this.scene.add(grp);
      this.plungerPad = grp;
    }

    this._buildDecor();
  }

  // ---- 場景裝飾：背板 / 機檯側框 / 圍裙 / 星空 / 立柱 ----
  _buildDecor() {
    const HW = TABLE.HALF_W;
    const env = this.env;
    // 星空背景
    const starGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      sp[i * 3] = (Math.random() - 0.5) * 44;
      sp[i * 3 + 1] = 2 + Math.random() * 18;
      sp[i * 3 + 2] = -14 - Math.random() * 26;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x8fa7ff, size: 0.14, transparent: true, opacity: 0.85, sizeAttenuation: true,
    })));

    // ---- 機檯外殼：烤漆側板 + 不鏽鋼側軌 + 玻璃壓條 ----
    // 深色烤漆櫃體（不要用鏡面 chrome，否則整個外框會反射成白色）
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0x0a1030, roughness: 0.45, metalness: 0.35,
      envMap: env, envMapIntensity: 0.35,
    });
    // 側軌用偏暗的拉絲金屬
    const sideRailMat = new THREE.MeshStandardMaterial({
      color: 0x76819c, roughness: 0.34, metalness: 0.92,
      envMap: env, envMapIntensity: 0.6,
    });
    const CAB_H = 1.05, CAB_T = 0.16, CAB_L = TABLE.L + 1.1; // 邊框做薄，少佔畫面
    for (const sx of [-1, 1]) {
      const x = sx * (HW + CAB_T / 2 + 0.06);
      // 側板本體（往下延伸出厚度，看起來像真的櫃體）
      const body = new THREE.Mesh(new THREE.BoxGeometry(CAB_T, CAB_H, CAB_L), cabinetMat);
      body.position.set(x, -CAB_H / 2 + 0.62, 0);
      body.castShadow = true; body.receiveShadow = true;
      this.scene.add(body);
      // 頂部側軌（真實機檯玻璃兩側的金屬壓條，做細一點才不會搶戲）
      const rail = new THREE.Mesh(new THREE.BoxGeometry(CAB_T + 0.04, 0.07, CAB_L), sideRailMat);
      rail.position.set(x, 0.64, 0);
      rail.castShadow = true;
      this.scene.add(rail);
      // 側板霓虹飾條
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, CAB_L - 0.4),
        new THREE.MeshBasicMaterial({ color: 0x4f7bff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending })
      );
      strip.position.set(x - sx * (CAB_T / 2 + 0.01), 0.4, 0);
      this.scene.add(strip);
    }
    // 檯面頂端與底端的封邊（貼齊檯面邊緣，否則下方會露出一段黑色空隙）
    for (const [z, len] of [[TABLE.TOP - 0.3, 0.34], [TABLE.BOTTOM + 0.38, 0.34]]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(TABLE.W + CAB_T * 2 + 0.12, CAB_H, len), cabinetMat);
      cap.position.set(0, -CAB_H / 2 + 0.62, z);
      cap.castShadow = true;
      this.scene.add(cap);
      const capRail = new THREE.Mesh(new THREE.BoxGeometry(TABLE.W + CAB_T * 2 + 0.14, 0.07, len + 0.04), sideRailMat);
      capRail.position.set(0, 0.64, z);
      this.scene.add(capRail);
    }

    // 底部不再放 apron 擋板（太佔畫面），只留一條細的不鏽鋼收邊
    const apronLip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, TABLE.W + 0.3, 10),
      sideRailMat
    );
    apronLip.rotation.z = Math.PI / 2;
    apronLip.position.set(0, 0.16, TABLE.BOTTOM + 0.2);
    this.scene.add(apronLip);

    // ---- 記分板（backglass）：立在檯面上方，顯示分數與球數 ----
    {
      const glass = this.app.playfieldArts?.glasses?.[this.stageIdx] ?? null;
      const board = buildScoreboard(glass, this.stage.theme);
      const bw = TABLE.W + 0.55;
      board.scale.set(bw, bw * 384 / 1024, 1);
      board.position.set(0, 1.62, TABLE.TOP - 1.02);
      board.rotation.x = -0.16;
      this.scene.add(board);
      this.scoreboard = board;
      // 記分板外框與背光
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(bw + 0.14, bw * 384 / 1024 + 0.14, 0.1),
        cabinetMat
      );
      frame.position.copy(board.position);
      frame.position.z -= 0.06;
      frame.rotation.copy(board.rotation);
      this.scene.add(frame);
      const glow = new THREE.PointLight(this.stage.theme.main, 1.2, 6, 2);
      glow.position.set(0, 1.6, TABLE.TOP - 0.45);
      this.scene.add(glow);
    }

    // 導板端點的橡膠緩衝柱（真實彈珠台的 rubber post）
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf24a6a, roughness: 0.8, metalness: 0 });
    for (const [px, pz] of [[-1.55, 4.8], [1.55, 4.8]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.5, 14), postMat);
      post.position.set(px, 0.25, pz);
      post.castShadow = true;
      this.scene.add(post);
    }
  }

  // ================= 彈珠 =================
  _buildBall() {
    const r = TUNE.physics.ballR;
    this.ballBody = this.world.addBall({ x: TABLE.LANE_CENTER, z: 6.1, vx: 0, vz: 0, r });
    this.ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 24),
      // 亮銀色拋光鋼珠：底色調亮讓它在暗檯面上顯眼，
      // 但保留一點粗糙度，不做成純鏡面（否則會把環境燈管反射成刺眼白斑）
      new THREE.MeshStandardMaterial({
        color: 0xf8fbff, emissive: 0x9fb4d4, emissiveIntensity: 0.12,
        roughness: 0.13, metalness: 0.95, envMap: this.env, envMapIntensity: 0.85,
      })
    );
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);

    // 球正下方的接觸陰影：一片貼地的暗影。
    // 檯面插畫很花，光靠陰影貼圖不足以讓小鋼珠浮現，
    // 這片暗影提供穩定的對比，球滾到哪都看得見（是變暗，不是發光）。
    {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g2 = c.getContext('2d');
      const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,0,0,.75)');
      gr.addColorStop(0.55, 'rgba(0,0,0,.35)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      this.ballShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(r * 4.2, r * 4.2),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 })
      );
      this.ballShadow.rotation.x = -Math.PI / 2;
      this.ballShadow.renderOrder = 3;
      this.scene.add(this.ballShadow);
    }

    this.trail = new Trail(this.scene, 0xffffff, TUNE);
  }

  get hero() { return HEROES[this.ballIdx]; }

  _newBall(first = false) {
    const h = this.hero;
    this.ballBody.x = TABLE.LANE_CENTER; this.ballBody.z = 6.1;
    this.ballBody.vx = 0; this.ballBody.vz = 0; this.ballBody.y = 0; this.ballBody.vy = 0;
    this.ballBody.held = null;
    this.ballBody.onRamp = null;
    this.state = 'launch';
    this.gate.active = false;
    this.plunger = null;
    this.spaceCharge = -1;
    this.saverT = 0; // 發射後才開始計
    this.stuckT = 0;
    // 球與軌跡都維持銀白色（鋼珠的殘影不該是彩色的）；
    // 三顆球的區別只在 HUD 與上場提示顯示
    this.trail.setColor(0xdfe8ff);
    this.trail.points.length = 0;
    this._toast(`${h.emoji} ${h.title}・${h.name} 上場！${first ? '' : ''}（${h.perk}）`, 2200);
    this._updateHUD();
  }

  _launch(k) {
    const P = TUNE.plunger;
    const speed = P.minSpeed + (P.maxSpeed - P.minSpeed) * Math.min(1, k);
    this.ballBody.vz = -speed;
    this.state = 'play';
    const saver = TUNE.battle.saverSec + (this.hero.perkType === 'saver' ? 6 : 0);
    this.saverT = saver;
    AudioSys.sfx('plungerLaunch');
    this.launchFlash = 1;   // 發射瞬間跑馬燈整排閃一次
    this.particles.burst(this.ballBody.x, 0.2, this.ballBody.z, this.hero.color, 14, 5, 0.4);
    this._updateHUD();
  }

  // ================= HUD（引擎內） =================
  _buildHUD() {
    const g = new THREE.Group();
    this.ui.scene.add(g);
    this.hud = g;

    this.hudStage = makeText({ text: `${this.stage.name}・${this.stage.sub}`, size: 13, color: '#9fd8ff', order: 10 });
    this.hudScore = makeText({ text: '0', size: 17, color: '#ffd75e', weight: 900, order: 10 });
    this.hudBalls = makeText({ text: '', size: 13, order: 10 });
    this.hudCombo = makeText({ text: '', size: 26, weight: 900, color: '#9fd8ff', shadow: { color: 'rgba(90,160,255,.9)', blur: 10 }, order: 10 });
    this.pauseBtn = makeButton(this.ui, {
      w: 38, h: 38, size: 14, label: '❚❚', radius: 19, fill: 'rgba(10,14,34,.75)',
      stroke: 'rgba(140,170,255,.4)', glow: null, order: 10,
      onTap: () => { AudioSys.sfx('ui'); this.app.onPause?.(); },
    });

    // Boss 血條
    const bw = 210;
    this.bossBarW = bw;
    this.bossBarBg = makeRect({ w: bw, h: 12, fill: 'rgba(0,0,0,.6)', stroke: 'rgba(255,255,255,.25)', radius: 7, order: 10 });
    this.bossBarFill = makeBarFill({ w: bw - 4, h: 8, color: ['#ff3d6e', '#ff8a5e'], radius: 4, order: 11 });
    this.bossLabel = makeText({ text: `${this.stage.bossEmoji} ${this.stage.bossName}`, size: 12, color: '#ff8a9a', order: 11 });
    this.bossHpText = makeText({ text: '', size: 11, color: '#ffffff', order: 12 });

    // 橫幅 / 提示
    this.banner = makeText({ text: '', size: 30, weight: 900, color: '#ffd75e', letter: 4, shadow: { color: 'rgba(255,180,40,.8)', blur: 16 }, order: 12 });
    this.banner.visible = false;
    this.toast = makeText({ text: '', size: 14, color: '#ffd75e', order: 12, shadow: { color: 'rgba(0,0,0,.9)', blur: 6 } });
    this.toast.visible = false;

    // 發射提示 + 力度計
    this.launchHint = makeText({ text: '⬇ 按住畫面往下拉，放開發射', size: 15, color: '#ffffff', shadow: { color: 'rgba(80,120,255,.9)', blur: 10 }, order: 12 });
    this.meterBg = makeRect({ w: 12, h: 150, fill: 'rgba(0,0,0,.55)', stroke: 'rgba(255,255,255,.3)', radius: 6, order: 10 });
    this.meterFill = makeBarFill({ w: 146, h: 8, color: ['#3dff9e', '#ffd75e', '#ff5e3d'], radius: 4, order: 11 });
    this.meterFill.rotation.z = Math.PI / 2; // 直立（原點在下端）
    this.meterFill.userData.setRatio(0);

    g.add(this.hudStage, this.hudScore, this.hudBalls, this.hudCombo, this.pauseBtn,
      this.bossBarBg, this.bossBarFill, this.bossLabel, this.bossHpText,
      this.banner, this.toast, this.launchHint, this.meterBg, this.meterFill);
    this._layoutHUD();
    this._updateHUD();
  }

  _layoutHUD() {
    const w = this.ui.w, h = this.ui.h;
    const top = h / 2 - 26;
    this.hudStage.position.set(-w / 2 + this.hudStage.geometry.parameters.width / 2 + 10, top, 0);
    this.pauseBtn.position.set(w / 2 - 30, top, 0);
    this.hudScore.position.set(w / 2 - 60 - this.hudScore.geometry.parameters.width / 2, top, 0);
    this.hudBalls.position.set(-w / 2 + this.hudBalls.geometry.parameters.width / 2 + 12, top - 26, 0);
    // Boss 血條移到畫面底部，避免與 3D 背板重疊
    const bossY = -h / 2 + 52;
    this.bossLabel.position.set(-this.bossBarW / 2 - 6 - this.bossLabel.geometry.parameters.width / 2 + this.bossBarW * 0 , bossY, 0);
    this.bossLabel.position.x = -this.bossBarW / 2 - this.bossLabel.geometry.parameters.width / 2 + 4;
    this.bossBarBg.position.set(this.bossLabel.geometry.parameters.width / 2 + 6, bossY, 0);
    this.bossBarFill.position.set(this.bossBarBg.position.x - (this.bossBarW - 4) / 2, bossY, 0);
    this.bossHpText.position.set(this.bossBarBg.position.x, bossY - 16, 0);
    this.banner.position.set(0, h * 0.16, 0);
    this.toast.position.set(0, -h / 2 + 138, 0);
    this.launchHint.position.set(0, -h / 2 + 104, 0);
    this.meterBg.position.set(w / 2 - 24, -h * 0.1, 0);
    this.meterFill.position.set(w / 2 - 24, -h * 0.1 - 73, 0);
    // Combo 移到右側偏下，避免和中央橫幅疊在一起
    this.hudCombo.position.set(w / 2 - 62, h * 0.04, 0);
  }

  _updateHUD() {
    // 記分板（機檯上方的實體看板）
    this.scoreboard?.userData.update(
      this.score, Math.min(this.ballIdx + 1, HEROES.length), HEROES.length,
      this.vulnT > 0 ? 'JACKPOT' : (this.multiplier > 1 ? `X${this.multiplier}` : (this.rounds ? `R${this.rounds + 1}` : ''))
    );
    this.hudScore.userData.setText(this.score.toLocaleString());
    const remain = HEROES.slice(this.ballIdx).map(x => x.emoji).join(' ');
    this.hudBalls.userData.setText(
      `彈珠 ${remain}${this.multiplier > 1 ? `　倍率 ×${this.multiplier}` : ''}${this.rounds ? `　ROUND ${this.rounds + 1}` : ''}`
    );
    const k = Math.max(0, this.bossHp) / this.bossHpMax;
    this.bossBarFill.userData.setRatio(k);
    this.bossHpText.userData.setText(`${Math.max(0, Math.round(this.bossHp)).toLocaleString()} / ${this.bossHpMax.toLocaleString()}`);
    const inLaunch = this.state === 'launch';
    this.launchHint.visible = inLaunch;
    this.meterBg.visible = inLaunch;
    this.meterFill.visible = inLaunch;
    if (this.combo >= 3) {
      this.hudCombo.visible = true;
      this.hudCombo.userData.setText(`${this.combo}\nCOMBO`);
    } else this.hudCombo.visible = false;
  }

  _banner2(text, color = '#ffd75e', ms = 1200) {
    this.banner.userData.setText(text);
    this.banner.visible = true;
    this.bannerT = ms / 1000;
    this.bannerDur = ms / 1000;
  }

  _toast(text, ms = 1600) {
    this.toast.userData.setText(text);
    this.toast.visible = true;
    this.toastT = ms / 1000;
  }

  // ================= 得分 / Boss =================
  _addScore(base, x, z, { color = '#ffd75e', silentPopup = false } = {}) {
    const B = TUNE.battle;
    this.comboT = B.comboWindow;
    this.combo = Math.min(99, this.combo + 1);   // 上限，避免異常時數字失控
    // combo 加成設上限（最多 +100%），避免長 combo 讓分數失去比較意義
    const comboMul = 1 + Math.min(1, this.combo * B.comboBonus);
    const pts = Math.round(base * comboMul * this.multiplier);
    this.score += pts;
    if (!silentPopup) this.dmgTexts.spawn(x, z, `+${pts}`, { color, size: 26 });
    this._updateHUD();
  }

  _damageBoss(impact) {
    const B = TUNE.battle;
    const vuln = this.vulnT > 0;
    let dmg = vuln ? B.vulnDmgBase + impact * B.vulnDmgImpact : B.chipDmgBase + impact * B.chipDmgImpact;
    if (this.hero.perkType === 'bossDmg') dmg *= 1.25;
    dmg = Math.round(dmg);
    this.bossHp -= dmg;
    this.boss.hitT = 0.2;
    this.dmgTexts.spawn(BOSS.x + (Math.random() - 0.5) * 0.6, BOSS.z + 0.4, String(dmg), {
      color: vuln ? '#ffde5e' : '#ffffff', crit: vuln,
    });
    this.particles.burst(BOSS.x, 0.6, BOSS.z, vuln ? 0xffd75e : this.bossColor, vuln ? 26 : 10, vuln ? 8 : 5, 0.6);
    if (vuln) { this.shockwaves.spawn(BOSS.x, BOSS.z, 0xffd75e, 2.6, 0.4); this.shake.hit(1.1); }
    AudioSys.sfx('hitEnemy', vuln ? 1 : 0.4);
    this.score += dmg;
    this._updateHUD();
    if (this.bossHp <= 0) this._victory();
  }

  _hitTarget(t) {
    if (!t.cir.alive) return;
    t.cir.alive = false;
    t.dropT = 0.25;
    t.respawnFx = 0;
    AudioSys.sfx('target', 1);
    this.particles.burst(t.cir.x, 0.4, t.cir.z, 0xffd75e, 16, 6, 0.5);
    this.shockwaves.spawn(t.cir.x, t.cir.z, 0xffd75e, 1.4, 0.3);
    this._addScore(TUNE.score.target, t.cir.x, t.cir.z);
    if (this.targets.every(x => !x.cir.alive)) this._triggerVuln();
  }

  _triggerVuln() {
    this.vulnT = TUNE.battle.vulnSec;
    AudioSys.sfx('vuln');
    this._banner2(this.stage.vulnText ?? '⚡ 破防！全力攻擊！', '#ffd75e', 1600);
    this.shockwaves.spawn(BOSS.x, BOSS.z, 0xffd75e, 4, 0.6);
    this.shake.hit(1);
  }

  _endVuln() {
    this.vulnT = 0;
    for (const t of this.targets) {
      t.cir.alive = true;
      t.dropT = 0;
      t.respawnFx = 0.4;
    }
    this._toast(`${this.stage.targetName ?? '目標靶'}重新升起`, 1300);
  }

  // 擊倒主目標不結束遊戲：給大獎、主目標強化重生，讓玩家繼續刷分
  _victory() {
    if (this.state === 'over') return;
    this.rounds++;
    AudioSys.sfx('bossDie');
    setTimeout(() => AudioSys.sfx('win'), 400);
    this.particles.burst(BOSS.x, 0.6, BOSS.z, this.bossColor, 70, 12, 1);
    this.particles.burst(BOSS.x, 0.6, BOSS.z, 0xffd75e, 40, 8, 0.8);
    this.shockwaves.spawn(BOSS.x, BOSS.z, this.bossColor, 5, 0.7);
    this.shake.hit(2);

    // 擊倒獎勵隨輪數遞增
    const bonus = TUNE.battle.defeatBonus * this.rounds;
    this.score += bonus;
    this.dmgTexts.spawn(BOSS.x, BOSS.z, `+${bonus.toLocaleString()}`, { color: '#ffd75e', crit: true });
    this._banner2(`${this.stage.bossName} 擊倒 ×${this.rounds}`, '#ffd75e', 1800);
    this._toast(`🏆 ROUND ${this.rounds + 1} 開始！目標強化`, 2000);

    // 主目標強化重生
    this.bossHpMax = Math.round(this.stage.bossHp * Math.pow(TUNE.battle.roundHpScale, this.rounds));
    this.bossHp = this.bossHpMax;
    this.vulnT = 0;
    this.boss.reviveT = 0.9;
    for (const t of this.targets) { t.cir.alive = true; t.dropT = 0; t.respawnFx = 0.4; }
    this.multiplier = Math.min(9, this.multiplier + 1); // 每輪送一級倍率
    this._updateHUD();
  }

  // 三顆球用完＝一局結束（唯一的結束條件）
  _defeat() {
    if (this.state === 'over') return;
    this.state = 'over';
    AudioSys.stopBgm();
    AudioSys.sfx('lose');
    setTimeout(() => {
      if (!this.dead) this.onEnd(this.score, { rounds: this.rounds, multiplier: this.multiplier });
    }, 1100);
  }

  _drainBall() {
    AudioSys.sfx('drain');
    this.shake.hit(0.8);
    this.particles.burst(this.ballBody.x, 0.2, this.ballBody.z, 0x5a7bff, 18, 5, 0.6);
    if (this.saverT > 0) {
      AudioSys.sfx('saved');
      this._banner2('BALL SAVED!', '#3dff9e', 1100);
      this.ballBody.x = TABLE.LANE_CENTER; this.ballBody.z = 6.1;
      this.ballBody.vx = 0; this.ballBody.vz = 0;
      this.ballBody.held = null;
      this.ballBody.onRamp = null;
      this.state = 'launch';
      this.gate.active = false;
      this.saverT = 0;
      this._updateHUD();
      return;
    }
    this._toast(`${this.hero.emoji} ${this.hero.name} 退場…`, 1500);
    if (this.ballIdx + 1 < HEROES.length) {
      this.state = 'switch';
      setTimeout(() => {
        if (this.dead || this.state === 'over') return;
        this.ballIdx++;
        this._newBall();
      }, 900);
    } else {
      this._banner2('GAME OVER', '#8fa7ff', 1400);
      this._defeat();
    }
  }

  // ================= 輸入（由 main.js 轉發） =================
  pointerDown(e) {
    AudioSys.init();
    if (this.devDrag) { this._devDragStart(e); return; }
    if (this.state === 'launch') {
      this.plunger = { sy: e.clientY, k: 0, id: e.pointerId, lastStep: 0 };
      return;
    }
    if (this.state !== 'play') return;
    const r = this.canvas.getBoundingClientRect();
    const side = (e.clientX - r.left) < r.width / 2 ? 'L' : 'R';
    this.flipTouches.set(e.pointerId, side);
    this._setFlipper(side, true);
  }

  pointerMove(e) {
    if (this.devDragging) { this._devDragMove(e); return; }
    if (this.plunger && e.pointerId === this.plunger.id) {
      const k = Math.max(0, Math.min(1, (e.clientY - this.plunger.sy) / TUNE.plunger.pullPx));
      const step = Math.floor(k * 10);
      if (step !== this.plunger.lastStep) { AudioSys.sfx('plungerPull', k); this.plunger.lastStep = step; }
      this.plunger.k = k;
      this.meterFill.userData.setRatio(k);
    }
  }

  pointerUp(e) {
    if (this.devDragging) { this.devDragging = null; return; }
    if (this.plunger && e.pointerId === this.plunger.id) {
      const k = this.plunger.k;
      this.plunger = null;
      this.meterFill.userData.setRatio(0);
      if (k > 0.06) this._launch(k);
      return;
    }
    const side = this.flipTouches.get(e.pointerId);
    if (side) {
      this.flipTouches.delete(e.pointerId);
      // 若還有其他手指按同側則不放開
      if (![...this.flipTouches.values()].includes(side)) this._setFlipper(side, false);
    }
  }

  keyDown(e) {
    if (e.repeat) return;
    AudioSys.init();
    if (e.code === 'ArrowLeft' || e.code === 'KeyZ') this._setFlipper('L', true);
    if (e.code === 'ArrowRight' || e.code === 'KeyM' || e.code === 'Slash') this._setFlipper('R', true);
    if (e.code === 'Space' && this.state === 'launch') this.spaceCharge = 0;
  }

  keyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyZ') this._setFlipper('L', false);
    if (e.code === 'ArrowRight' || e.code === 'KeyM' || e.code === 'Slash') this._setFlipper('R', false);
    if (e.code === 'Space' && this.spaceCharge >= 0 && this.state === 'launch') {
      const k = this.spaceCharge;
      this.spaceCharge = -1;
      this.meterFill.userData.setRatio(0);
      if (k > 0.05) this._launch(k);
    }
  }

  _setFlipper(side, pressed) {
    for (const fl of this.flippers) {
      if (fl.f.side === side && fl.f.pressed !== pressed) {
        fl.f.pressed = pressed;
        if (pressed) AudioSys.sfx('flipper');
      }
    }
  }

  // ================= 每幀更新 =================
  update(dt) {
    if (this.dead) return;

    // Space 蓄力
    if (this.spaceCharge >= 0 && this.state === 'launch') {
      this.spaceCharge = Math.min(1, this.spaceCharge + dt * 0.9);
      this.meterFill.userData.setRatio(this.spaceCharge);
    }

    // 物理（launch 狀態下球停在彈簧上也照跑，可看到微彈跳）
    if (this.state === 'play' || this.state === 'launch') {
      const events = this.world.step(dt);
      this._handleEvents(events);
      if (this.state === 'play') {
        // 只有球夠快才留軌跡；慢速時節點會擠成一團亮斑，看起來像球黏著光點
        const tsp = Math.hypot(this.ballBody.vx, this.ballBody.vz);
        if (tsp > TUNE.fx.trailMinSpeed) this.trail.push(this.ballBody.x, this.ballBody.z);
        else this.trail.fade();
        // 閘門：球進入主檯面後關閉發射軌
        if (!this.gate.active && this.ballBody.x < 2.0) this.gate.active = true;
        // 球保護倒數
        if (this.saverT > 0) this.saverT -= dt;
        const b = this.ballBody;
        const sp = Math.hypot(b.vx, b.vz);
        // 球在高架軌道上：不做落球與卡球判定（軌道上速度為 0 是正常的）
        if (b.onRamp) { this.stuckT = 0; this.deadT = 0; }
        // 落球
        else if (b.z > TABLE.DRAIN_Z && b.x < 2.3) this._drainBall();
        // 球滑回發射軌並停下 → 交還發射權，不算損失球
        // （否則球會永遠停在軌道底部：不符落球條件、也不在卡球偵測範圍內）
        else if (b.x > TABLE.LANE_X && b.z > 5.4 && sp < 0.5 && !b.held) {
          this.state = 'launch';
          this.gate.active = false;
          this.stuckT = 0;
          this._updateHUD();
        }
        // 滯留偵測：不看速度，看「這段時間實際移動了多少」。
        // 球貼著彈射器或燈環邊緣打轉時速度不低，但位置幾乎不動，
        // 只看速度會抓不到，就會一直卡在那裡刷分。
        else if (!b.held) {
          this.anchorT = (this.anchorT ?? 0) + dt;
          if (this.anchorT >= 1.2) {
            const moved = Math.hypot(b.x - (this.anchorX ?? b.x), b.z - (this.anchorZ ?? b.z));
            if (moved < 0.85 && b.z < 5.2) {
              // 朝檯面下方踢出去，避免又落回同一個機關
              const away = Math.atan2(b.z - this.ringZ, b.x) + (Math.random() - 0.5) * 0.8;
              const push = 7.5;
              b.vx += Math.cos(away) * push;
              b.vz += Math.abs(Math.sin(away)) * push * 0.6 + 2;
              b.vy = 1.5;
              this.particles.burst(b.x, 0.3, b.z, 0xffffff, 8, 4, 0.3);
            }
            this.anchorX = b.x; this.anchorZ = b.z; this.anchorT = 0;
          }
        } else { this.anchorT = 0; }
      }
    } else {
      this.trail.fade();
    }

    // Combo 倒數
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) { this.combo = 0; this._updateHUD(); }
    }
    // 破防倒數
    if (this.vulnT > 0) {
      this.vulnT -= dt;
      if (this.vulnT <= 0 && this.state !== 'over') this._endVuln();
    }

    // ---- 視覺同步 ----
    const b = this.ballBody;
    this.ballMesh.position.set(b.x, b.r + b.y, b.z);
    // 接觸陰影貼地跟隨；球彈起時陰影變淡變大
    if (this.ballShadow) {
      const lift = Math.min(1, b.y / 0.6);
      this.ballShadow.position.set(b.x, 0.012, b.z);
      this.ballShadow.material.opacity = 0.85 * (1 - lift * 0.6);
      this.ballShadow.scale.setScalar(1 + lift * 0.5);
      this.ballShadow.visible = !b.onRamp;   // 球在高架軌道上時不投在檯面
    }
    const sp = Math.hypot(b.vx, b.vz);
    this.ballMesh.rotation.x += sp * dt * 2;
    this.trail.update();

    const now = performance.now();

    // Flipper
    for (const fl of this.flippers) {
      fl.grp.rotation.y = -fl.f.ang;
      fl.mesh.material.emissiveIntensity = fl.f.pressed ? 1.2 : 0.35;
    }

    // Slingshot 彈射脈衝
    for (const sl of this.slings) {
      if (sl.pulse > 0) sl.pulse -= dt * 4;
      const k = Math.max(0, sl.pulse);
      // 命中時：燈條爆亮、橡皮筋被撐開
      sl.grp.userData.lamp.material.opacity = 0.5 + k * 0.5;
      sl.grp.userData.plate.material.emissiveIntensity = 0.3 + k * 1.6;
      sl.grp.userData.band.scale.set(1 + k * 0.35, 1, 1 + k * 0.35);
    }

    // Bumpers
    for (const bp of this.bumpers) {
      if (bp.pulse > 0) bp.pulse -= dt * 3;
      const k = Math.max(0, bp.pulse);
      // 命中時帽子被壓下再彈回
      bp.grp.userData.cap.position.y = -k * 0.1;
      bp.grp.userData.cap.scale.set(1 + k * 0.12, 1 - k * 0.18, 1 + k * 0.12);
      bp.body.material.emissiveIntensity = 0.22 + k * 2.2;
      bp.ring.material.opacity = 0.45 + Math.sin(now / 380 + bp.cir.x) * 0.12 + k * 0.5;
      bp.light.intensity = 0.45 + k * 3;
    }

    // 軌道：入口箭頭脈動、球在上面跑時整條發亮
    for (const rp of this.ramps) {
      if (rp.litT > 0) rp.litT -= dt * 1.4;
      const k = Math.max(0, rp.litT);
      const onIt = this.ballBody.onRamp?.ramp === rp.r;
      rp.arrow.material.opacity = 0.45 + Math.sin(now / 260) * 0.2 + k * 0.5;
      rp.arrow.scale.setScalar(1 + k * 0.3);
      rp.floor.material.emissiveIntensity = 0.2 + k * 0.9 + (onIt ? 0.8 : 0);
      rp.floor.material.opacity = 0.45 + k * 0.3 + (onIt ? 0.2 : 0);
    }

    // 檯面燈泡：未鎖定的做波浪流動，鎖定的恆亮
    for (const b of this.bulbs) {
      if (b.locked) {
        b.m.material.emissiveIntensity = 2.2;
        b.m.scale.setScalar(1.25);
      } else {
        const wave = 0.5 + Math.sin(now / 420 + b.phase + b.m.position.z * 0.7) * 0.5;
        b.m.material.emissiveIntensity = b.base + wave * 0.8;
        b.m.scale.setScalar(1);
      }
    }

    // 中央燈環核心
    {
      const rc = this.ringCore;
      if (rc.hitT > 0) rc.hitT -= dt;
      const k = Math.max(0, rc.hitT / 0.25);
      const prog = rc.progress / RING.count;
      rc.core.scale.setScalar(1 + k * 0.5 + Math.sin(now / 200) * 0.06);
      rc.core.material.opacity = 0.6 + prog * 0.35 + k * 0.4;
      rc.disc.material.emissiveIntensity = 0.55 + prog * 0.9 + k * 2;
      rc.halo.rotation.z += dt * (0.6 + prog * 2.5);
      rc.halo.material.opacity = 0.45 + prog * 0.4;
      rc.light.intensity = 0.7 + prog * 1.6 + k * 3;
    }

    // Spinner 旋轉
    for (const sp of this.spinners) {
      if (sp.spinVel > 0.05) {
        sp.spin += sp.spinVel * dt;
        sp.spinVel *= Math.pow(0.28, dt); // 逐漸停下
        sp.blade.rotation.x = sp.spin;
      }
    }

    // Saucer：吸住球 → 計時後朝檯面上方射出
    for (const sc of this.saucers) {
      sc.glow.material.opacity = 0.5 + Math.sin(now / 260) * 0.2;
      if (sc.holdT > 0) {
        sc.holdT -= dt;
        sc.glow.material.opacity = 1;
        sc.light.intensity = 2.4;
        if (sc.holdT <= 0 && this.ballBody.held === sc.sc) {
          // 朝檯面中央斜上方射出（角度夠陡才不會馬上落回同一個洞）
          const dir = sc.sc.x < 0 ? -0.95 : Math.PI + 0.95;
          this.world.ejectBall(this.ballBody, dir, 18);
          AudioSys.sfx('plungerLaunch');
          this.particles.burst(sc.sc.x, 0.3, sc.sc.z, 0xc77dff, 18, 7, 0.5);
        }
      } else {
        sc.light.intensity = 0.5;
      }
    }

    // 檯面觸點亮燈
    for (const ro of this.rollovers) {
      if (ro.litT > 0) ro.litT -= dt;
      const k = Math.max(0, ro.litT / 0.6);
      ro.lens.material.emissiveIntensity = 0.4 + k * 2.5;
    }

    // Lane 燈脈動
    for (const l of this.laneLights) {
      l.grp.position.y = l.on ? 0.02 + Math.sin(now / 240) * 0.01 : 0;
    }

    // 側靶命中閃光
    for (const t of this.sideTargets) {
      if (t.hitT > 0) t.hitT -= dt;
      t.mesh.material.emissiveIntensity = 0.9 + Math.max(0, t.hitT / 0.25) * 2.5;
    }

    // Drop target：倒下 / 升起動畫
    for (const t of this.targets) {
      if (t.dropT > 0) {
        t.dropT -= dt;
        const k = Math.max(0, t.dropT / 0.25);
        t.grp.position.y = -0.42 * (1 - k);
        t.grp.rotation.x = -(1 - k) * 0.8;
      }
      if (t.respawnFx > 0) {
        t.respawnFx -= dt;
        const k = Math.max(0, t.respawnFx / 0.4);
        t.grp.position.y = -0.42 * k;
        t.grp.rotation.x = -k * 0.8;
      }
      t.mesh.material.emissiveIntensity = 0.9 + Math.sin(now / 300 + t.cir.x * 2) * 0.3;
    }

    // Boss
    const bo = this.boss;
    bo.spin += dt * (this.vulnT > 0 ? 2.2 : 0.7);
    bo.body.rotation.y = bo.spin;
    bo.body.rotation.x = bo.spin * 0.4;
    bo.body.position.y = BOSS.r + 0.25 + Math.sin(now / 480) * 0.08;
    bo.shell.rotation.y = -bo.spin * 0.6;
    bo.shell.position.y = bo.body.position.y;
    bo.shell.scale.setScalar(1 + Math.sin(now / 300) * 0.04);
    bo.crown.rotation.y = bo.spin * 0.5;
    bo.shards.rotation.y = -bo.spin * 0.8;
    let flash = 0;
    if (bo.hitT > 0) { bo.hitT -= dt; flash = bo.hitT / 0.2; }
    const vulnGlow = this.vulnT > 0 ? 0.8 + Math.sin(now / 120) * 0.4 : 0;
    bo.body.material.emissiveIntensity = 0.8 + flash * 2.4 + vulnGlow;
    bo.shell.material.opacity = 0.18 + vulnGlow * 0.25 + flash * 0.3;
    // 被擊倒後縮小再放大重生
    if (bo.reviveT > 0) {
      bo.reviveT -= dt;
      const k = 1 - Math.max(0, bo.reviveT) / 0.9;  // 0→1
      const s = k < 0.4 ? 1 - k / 0.4 : (k - 0.4) / 0.6;
      bo.grp.scale.setScalar(Math.max(0.02, s));
      bo.grp.rotation.y += dt * 6;
      if (bo.reviveT <= 0) { bo.grp.scale.setScalar(1); bo.grp.rotation.y = 0; }
    }

    // 彈簧視覺
    const pull = this.plunger?.k ?? (this.spaceCharge >= 0 ? this.spaceCharge : 0);

    // 發射軌跑馬燈：待發射時緩慢由下往上跑，拉彈簧時越拉越快，
    // 發射瞬間整排閃一次，做出「準備出發」的節奏感
    if (this.laneLights2) {
      const N = 9;   // 每排的燈數（兩排共用同一組相位，左右同步跑）
      const inLaunch = this.state === 'launch';
      this.laneSeq = (this.laneSeq ?? 0) + dt * (inLaunch ? (2.2 + pull * 9) : 0.9);
      const flash = Math.max(0, this.launchFlash ?? 0);
      if (this.launchFlash > 0) this.launchFlash -= dt * 2.6;
      for (const l of this.laneLights2) {
        // 由下往上的行進波
        const phase = (this.laneSeq - l.idx * 0.42) % N;
        const wave = phase >= 0 && phase < 1.1 ? 1 - phase / 1.1 : 0;
        const base = inLaunch ? 0.3 : 0.12;
        l.lens.material.emissiveIntensity = base + wave * 2.6 + flash * 3;
        l.lens.scale.setScalar(1 + wave * 0.45 + flash * 0.5);
      }
    }
    // 拉的時候整組往後退（z 變大），放開瞬間回到貼球位置
    this.plungerPad.position.z = 6.28 + pull * 0.5;

    // 橫幅 / toast 計時
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      const k = Math.max(0, Math.min(1, (this.bannerDur - this.bannerT) * 8));
      this.banner.scale.setScalar(0.7 + 0.3 * k);
      if (this.bannerT <= 0) this.banner.visible = false;
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toast.visible = false;
    }

    // 特效
    this.particles.update(dt);
    this.shockwaves.update(dt);
    this.dmgTexts.update(dt);
  }

  _handleEvents(events) {
    for (const ev of events) {
      if (ev.type === 'flipper') {
        if (ev.impact > 3) AudioSys.sfx('bounce', Math.min(1, ev.impact / 20));
      } else if (ev.type === 'wall') {
        if (ev.impact > 4) {
          AudioSys.sfx('bounce', Math.min(1, ev.impact / TUNE.physics.maxSpeed));
          this.particles.burst(ev.x, 0.2, ev.z, this.hero.color, 5, 3, 0.3);
        }
      } else if (ev.type === 'sling') {
        AudioSys.sfx('sling');
        if (ev.ref) ev.ref.pulse = 1;
        const mult = this.hero.perkType === 'slingScore' ? 2 : 1;
        this._addScore(TUNE.score.sling * mult, ev.x, ev.z, { color: '#ff8ab0' });
        this.particles.burst(ev.x, 0.3, ev.z, 0xff5e8a, 10, 5, 0.4);
        this.shake.hit(0.3);
      } else if (ev.type === 'circle') {
        const c = ev.ref;
        if (ev.kind === 'bumper') {
          AudioSys.sfx('bumper');
          c.pulse = 1;
          const mult = this.hero.perkType === 'bumperScore' ? 2 : 1;
          this._addScore(TUNE.score.bumper * mult, ev.x, ev.z);
          this.particles.burst(ev.x, 0.5, ev.z, 0xffd75e, 12, 6, 0.45);
          this.shockwaves.spawn(ev.x, ev.z, 0xffd75e, 1.5, 0.3);
          this.shake.hit(0.4);
        } else if (ev.kind === 'target') {
          this._hitTarget(c);
        } else if (ev.kind === 'sideTarget') {
          c.hitT = 0.25;
          AudioSys.sfx('target', 0.7);
          this._addScore(TUNE.score.sideTarget, ev.x, ev.z, { color: '#8fe8ff' });
          this.particles.burst(ev.x, 0.4, ev.z, 0x35d6ff, 12, 5, 0.4);
          this._damageBoss(ev.impact * 0.4); // 側靶也能磨傷 Boss
        } else if (ev.kind === 'post') {
          if (ev.impact > 3) AudioSys.sfx('bounce', Math.min(1, ev.impact / 18));
          this.particles.burst(ev.x, 0.3, ev.z, 0xf24a6a, 5, 3, 0.25);
        } else if (ev.kind === 'ringCore') {
          this._hitRingCore(ev.impact, ev.x, ev.z);
        } else if (ev.kind === 'boss') {
          this._damageBoss(ev.impact);
        }
      } else if (ev.type === 'sensor') {
        this._handleSensor(ev);
      } else if (ev.type === 'saucer') {
        this._enterSaucer(ev.ref.ref);
      } else if (ev.type === 'rampEnter') {
        const o = ev.ref.ref;
        o.litT = 1;
        AudioSys.sfx('plungerLaunch');
        this._toast(`🚀 ${o.def.name}`, 1100);
        this.particles.burst(ev.ref.entry.x, 0.3, ev.ref.entry.z, o.def.color, 16, 6, 0.5);
      } else if (ev.type === 'rampExit') {
        const o = ev.ref.ref;
        o.runs++;
        o.litT = 1;
        AudioSys.sfx('skillReady');
        const pts = TUNE.score.ramp * o.runs;
        this._addScore(pts, ev.ref.samples[ev.ref.samples.length - 1].x, ev.ref.samples[ev.ref.samples.length - 1].z, { color: '#8fe8ff' });
        this._banner2(`軌道 ×${o.runs}`, '#8fe8ff', 900);
        this._damageBoss(10 + o.runs * 2);
        this.shockwaves.spawn(ev.ref.entry.x, ev.ref.entry.z, o.def.color, 2.2, 0.4);
      } else if (ev.type === 'rampFail') {
        AudioSys.sfx('bounce', 0.5);
        this._toast('力道不足，球滑回來了', 900);
      }
    }
  }

  _handleSensor(ev) {
    const o = ev.ref.ref;
    if (ev.kind === 'lane') {
      if (o.on) { this._addScore(TUNE.score.lane, ev.x, ev.z, { color: '#9fd8ff' }); return; }
      o.on = true;
      o.grp.userData.setOn(true);
      AudioSys.sfx('target', 0.5);
      this._addScore(TUNE.score.lane, ev.x, ev.z, { color: '#ffd75e' });
      if (this.laneLights.every(l => l.on)) this._completeLanes();
    } else if (ev.kind === 'spinner') {
      // 依球速決定旋轉圈數與得分
      o.spinVel = Math.min(34, ev.speed * 1.5);
      const ticks = Math.max(1, Math.round(ev.speed * 0.7));
      AudioSys.sfx('bumper');
      this._addScore(TUNE.score.spinner * ticks, ev.x, ev.z, { color: '#ffd75e' });
      this.particles.burst(ev.x, 0.4, ev.z, 0xffd75e, 8, 4, 0.35);
    } else if (ev.kind === 'rollover') {
      o.litT = 0.6;
      AudioSys.sfx('ui');
      this._addScore(TUNE.score.rollover, ev.x, ev.z, { color: '#8fe8ff' });
    }
  }

  // 中央大燈環：每次撞擊點亮下一格，繞滿一圈給大獎並重擊棋主
  _hitRingCore(impact, x, z) {
    const rc = this.ringCore;
    rc.hitT = 0.25;
    const step = Math.max(1, Math.round(impact / 5));
    for (let i = 0; i < step; i++) {
      const idx = rc.progress % RING.count;
      const b = this.ringBulbs[idx];
      if (b) { b.locked = true; b.lit = 1; }
      rc.progress++;
    }
    AudioSys.sfx('target', 0.8);
    this._addScore(TUNE.score.ringCore, x, z, { color: '#8fe8ff' });
    this.particles.burst(x, 0.4, z, 0x5ae6ff, 14, 6, 0.45);
    this.shockwaves.spawn(x, z, 0x5ae6ff, 1.8, 0.35);
    if (rc.progress >= RING.count) {
      rc.progress = 0;
      for (const b of this.ringBulbs) if (b) b.locked = false;
      AudioSys.sfx('vuln');
      this._banner2('⚡ 能量環充滿！', '#5ae6ff', 1500);
      this.shockwaves.spawn(0, this.ringZ, 0x5ae6ff, 5, 0.7);
      this.score += 5000;
      this._damageBoss(20);
      this.shake.hit(1.4);
    }
  }

  _completeLanes() {
    this.multiplier = Math.min(9, this.multiplier + 1);
    AudioSys.sfx('skillReady');
    this._banner2(`得分倍率 ×${this.multiplier}`, '#ffd75e', 1400);
    this.shockwaves.spawn(0, LANE.z, 0xffd75e, 4, 0.6);
    for (const l of this.laneLights) { l.on = false; l.grp.userData.setOn(false); }
    this._updateHUD();
  }

  _enterSaucer(o) {
    o.holdT = 0.9;
    AudioSys.sfx('nova');
    this.shockwaves.spawn(o.sc.x, o.sc.z, 0xc77dff, 2.4, 0.5);
    this.particles.burst(o.sc.x, 0.3, o.sc.z, 0xc77dff, 22, 6, 0.6);
    this._addScore(TUNE.score.saucer, o.sc.x, o.sc.z, { color: '#d9a6ff' });
    // 進洞＝對棋主的直接重擊
    this._damageBoss(14);
    this._toast(`💥 直擊${this.stage.bossName ?? '主目標'}！`, 1400);
  }

  // ================= 相機 =================
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this._fitCamera();
    this._layoutHUD();
  }

  _fitCamera() {
    const C = TUNE.camera;
    this.camera.fov = C.fov;
    const tilt = THREE.MathUtils.degToRad(C.tilt);
    const corners = [
      // 檯面四角（框做薄了，取景更貼近檯面）＋ 記分板上緣
      new THREE.Vector3(-3.45, 0, TABLE.TOP - 0.2), new THREE.Vector3(3.45, 0, TABLE.TOP - 0.2),
      new THREE.Vector3(-3.45, 0, 6.85), new THREE.Vector3(3.45, 0, 6.85),
      new THREE.Vector3(0, 2.85, TABLE.TOP - 1.02),
    ];
    const fits = (dist) => {
      const cy = Math.cos(tilt) * dist, cz = Math.sin(tilt) * dist + C.lookZ;
      this.camera.position.set(0, cy, cz);
      this.camera.lookAt(0, 0, C.lookZ);
      this.camera.updateMatrixWorld();
      this.camera.updateProjectionMatrix();
      const m = 1 / C.margin;
      return corners.every(c => {
        const p = c.clone().project(this.camera);
        return Math.abs(p.x) <= m && Math.abs(p.y) <= m;
      });
    };
    let lo = 6, hi = 80;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid; else lo = mid;
    }
    fits(hi);
    this.baseCamPos = this.camera.position.clone();
  }

  render(dt) {
    const off = this.shake.offset(dt, TUNE.camera.shake);
    if (this.baseCamPos) {
      this.camera.position.set(this.baseCamPos.x + off.x, this.baseCamPos.y + off.y, this.baseCamPos.z + off.x * 0.5);
    }
    this.postfx.renderScene(this.scene, this.camera, dt);
  }

  // ================= DEV 支援 =================
  devVuln() { this._triggerVuln(); for (const t of this.targets) { t.cir.alive = false; t.mesh.visible = false; } }
  devVictory() { this.bossHp = 0; this._updateHUD(); this._victory(); }
  devDefeat() { this._defeat(); }
  devAddBall() { if (this.ballIdx > 0) { this.ballIdx--; this._updateHUD(); this._toast('補一顆彈珠'); } }
  devRefreshCamera() { this._fitCamera(); }

  _devDragStart(e) {
    const p = this._screenToBoard(e.clientX, e.clientY);
    if (!p) return;
    let best = null, bd = 1.0;
    const cands = [
      ...this.bumpers.map(b => ({ kind: 'bumper', cir: b.cir, grp: b.grp })),
      ...this.targets.map(t => ({ kind: 'target', cir: t.cir, grp: t.mesh })),
      { kind: 'boss', cir: this.boss.cir, grp: this.boss.grp },
    ];
    for (const c of cands) {
      const d = Math.hypot(c.cir.x - p.x, c.cir.z - p.z);
      if (d < bd) { bd = d; best = c; }
    }
    this.devDragging = best;
  }

  _devDragMove(e) {
    const p = this._screenToBoard(e.clientX, e.clientY);
    if (!p || !this.devDragging) return;
    const x = Math.max(-3, Math.min(3, p.x));
    const z = Math.max(-6.3, Math.min(4.5, p.z));
    const t = this.devDragging;
    t.cir.x = x; t.cir.z = z;
    t.grp.position.x = x; t.grp.position.z = z;
  }

  _screenToBoard(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const out = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, out) ? { x: out.x, z: out.z } : null;
  }

  devExportLayout() {
    return {
      stage: this.stageIdx,
      bumpers: this.bumpers.map(b => ({ x: +b.cir.x.toFixed(2), z: +b.cir.z.toFixed(2) })),
      targets: this.targets.map(t => ({ x: +t.cir.x.toFixed(2), z: +t.cir.z.toFixed(2) })),
      boss: { x: +this.boss.cir.x.toFixed(2), z: +this.boss.cir.z.toFixed(2) },
    };
  }

  dispose() {
    this.dead = true;
    const idx = this.ui.pressables.indexOf(this.pauseBtn);
    if (idx >= 0) this.ui.pressables.splice(idx, 1);
    disposeGroup(this.hud);
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { m.map?.dispose(); m.dispose(); });
      }
    });
  }
}
