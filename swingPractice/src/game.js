// ============ 遊戲流程：投球循環、揮棒判定、計分、特效 ============
import * as THREE from 'three';
import { FIELD, SWING, HIT, DIFF, PITCH, CAM, PACE } from './config.js';
import { pitchBall, hitBall, updateBall, resetBall, timeToContact } from './ball.js';
import { triggerSwing, isSwinging, pitchThrow } from './characters.js';
import { Sound } from './sound.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export function initGame(G){
  const g = {
    phase: 'menu',        // menu | ready | windup | pitching | result | over
    diff: 'easy',
    mode: 'derby',
    name: '打者',
    assist: true,
    power: false,

    ballNo: 0, maxBalls: 10, outs: 0, maxOuts: 3,
    score: 0, hr: 0, farthest: 0, perfects: 0, contacts: 0, swings: 0,
    combo: 0, bestCombo: 0,
    pitchLog: [],

    timer: 0,             // 階段計時
    swungThisPitch: false,
    lastErr: 0,
    camMode: 'bat',       // bat | follow | land
    excite: 0,            // 觀眾興奮度 0~1
    shake: 0,
  };
  G.game = g;

  const B = G.ball, bat = G.batter, pit = G.pitcher;

  // ---------------- 特效 ----------------
  const fx = makeFX(G.scene);
  g.fx = fx;

  // ---------------- 流程 ----------------
  g.start = (opts) => {
    Object.assign(g, opts);
    g.ballNo = 0; g.outs = 0; g.score = 0; g.hr = 0; g.farthest = 0;
    g.perfects = 0; g.contacts = 0; g.swings = 0; g.combo = 0; g.bestCombo = 0;
    g.pitchLog = [];
    g.phase = 'ready'; g.timer = PACE.firstBall;
    g.camMode = 'bat';
    resetBall(B);
    Sound.ambient(true);
    G.ui.syncHUD();
  };

  g.quit = () => { g.phase = 'menu'; resetBall(B); Sound.ambient(false); };

  function nextPitch(){
    if (g.mode === 'derby' && g.ballNo >= g.maxBalls) return finish();
    if (g.mode === 'survival' && g.outs >= g.maxOuts) return finish();

    g.ballNo++;
    g.swungThisPitch = false;
    g.phase = 'windup';
    const D = DIFF[g.diff];
    const type = D.pitches[Math.floor(Math.random() * D.pitches.length)];
    const kmh = rnd(D.speedKmh[0], D.speedKmh[1]);
    // 好球帶內落點（難度越高越靠邊）
    const edge = g.diff === 'hard' ? .3 : g.diff === 'normal' ? .2 : .12;
    g.pending = {
      type, kmh, breakScale: D.breakScale,
      targetX: rnd(-.22 - edge, .22 + edge),
      targetY: rnd(FIELD.plateY - .24 - edge * .5, FIELD.plateY + .26 + edge * .5),
    };
    bat.loaded = 0;
    pitchThrow(pit, kmh / 130, onRelease);
    G.ui.syncHUD();
  }
  g.nextPitch = nextPitch;

  function onRelease(){
    const p = g.pending;
    const T = pitchBall(B, p);
    g.phase = 'pitching';
    g.flightT = T;
    g.camMode = 'bat';
    Sound.release();
    G.ui.showPitchHint(PITCH[p.type], g.assist);
  }

  function finish(){
    g.phase = 'over';
    Sound.ambient(false);
    const rank = G.ui.submitScore(g);
    G.ui.showOver(g, rank);
  }

  // ---------------- 揮棒 ----------------
  g.swing = () => {
    if (g.phase === 'windup'){ return; }               // 太早，忽略（不罰）
    if (g.phase !== 'pitching' || g.swungThisPitch) return;
    g.swungThisPitch = true; g.swings++;
    // 揮棒平面跟著這球的高低走，球棒才會真的掃過球
    const aim = THREE.MathUtils.clamp((g.pending.targetY - FIELD.plateY) * 0.7, -0.2, 0.2);
    triggerSwing(bat, g.power, aim);

    const scale = DIFF[g.diff].windowScale * (g.assist ? SWING.assistBonus : 1) * (g.power ? SWING.powerWindow : 1);
    const err = (SWING.barrelDelay / 1000 - timeToContact(B)) * 1000;   // ms，負=太早
    g.lastErr = err;
    const ae = Math.abs(err);

    const wPerf = SWING.perfect * scale, wGood = SWING.good * scale,
          wOk = SWING.ok * scale, wPoor = SWING.poor * scale;

    Sound.whoosh();                                    // 每次出棒都有風聲，才聽得出「揮了」

    if (ae > wPoor){                                   // 揮空
      setTimeout(() => Sound.sigh(), 260);
      g.resultPending = { kind: 'miss' };
      g.phase = 'result'; g.timer = 1.15;
      return;
    }

    // 擊中：品質 0~1
    const q = Math.max(0, 1 - ae / wPoor);
    const grade = ae <= wPerf ? 'perfect' : ae <= wGood ? 'good' : ae <= wOk ? 'ok' : 'poor';
    g.contacts++;
    if (grade === 'perfect') g.perfects++;

    // 擊球參數
    const qb = Math.pow(q, HIT.veloCurve);
    let velo = THREE.MathUtils.lerp(HIT.veloMin, HIT.veloMax, qb) * (g.power ? SWING.powerVelo : 1);
    velo *= 1 + gauss() * .04;

    // 球的高低也影響仰角：高球易高飛、低球易滾地
    const hOff = (B.mesh.position.y - FIELD.plateY) * 16;
    let angle = HIT.angleBest + hOff + gauss() * HIT.angleSpread * (1 - qb) + (grade === 'perfect' ? 0 : gauss() * 4);
    angle = THREE.MathUtils.clamp(angle, -12, 68);

    let spray = err * HIT.sprayK + gauss() * HIT.spraySpread;
    spray = THREE.MathUtils.clamp(spray, -58, 58);

    // 判定已完成，但球要等揮棒動畫掃到接觸幀才飛出去——
    // 否則會出現「一按下去球就飛走、球棒事後才掃過來」的錯位
    g.resultPending = { kind: 'hit', grade, q, velo, angle, spray };
    g.pendingHit = { grade, q, velo, angle, spray };
    g.phase = 'result'; g.timer = 0.28;
  };

  // 揮棒動畫掃到接觸幀時，才真正把球打出去
  function executeHit(){
    const h = g.pendingHit;
    g.pendingHit = null;

    // 對齊揮棒時球棒中段（甜蜜點）的位置，看起來才是「打中」而不是被握把碰到
    B.mesh.position.set(-0.78, Math.max(.5, B.mesh.position.y), FIELD.contactZ + 0.16);
    hitBall(B, h.velo, h.angle, h.spray);

    // ---- 打擊感：頓幀 → 鏡頭縮進 → 震動 → 火花 → 慢動作 ----
    Sound.crack(h.q);
    fx.spark(B.mesh.position, h.q);
    g.hitstop = PACE.hitstop * (0.55 + h.q * 0.75);      // 擊中那一下畫面先卡住
    g.hitZoom = CAM.hitZoom * (0.5 + h.q * 0.7);         // 再猛地縮進
    g.shake = CAM.shake * (0.5 + h.q);
    g.excite = Math.max(g.excite, .3 + h.q * .5);
    g.hitHold = PACE.swingHold;
    G.ui.showResultFlash(h.grade, h.velo);
    if (h.velo > 36) g.slowmo = 0.4 + h.q * 0.25;
  }

  // ---------------- 結果結算 ----------------
  function settle(){
    const r = g.resultPending || { kind: 'miss' };
    let gained = 0, title = '', sub = '';

    if (r.kind === 'miss'){
      g.combo = 0; g.outs++;
      title = '揮 空'; sub = g.lastErr < 0 ? '揮太早了' : '慢了半拍';
      g.pitchLog.push({ r: 'miss' });
    } else if (r.kind === 'take'){
      g.combo = 0;
      if (g.mode === 'survival') g.outs++;
      title = '看 球'; sub = '沒出棒';
      g.pitchLog.push({ r: 'take' });
    } else if (B.hr){
      g.hr++; g.combo++; g.bestCombo = Math.max(g.bestCombo, g.combo);
      const d = B.dist;
      gained = 1000 + Math.round(d * 12) + (r.grade === 'perfect' ? 400 : 0) + (g.combo - 1) * 250;
      title = d > 135 ? '超 特 大 全 壘 打' : '全 壘 打 ！';
      sub = `飛行距離 ${d.toFixed(1)} M　·　初速 ${(r.velo * 3.6).toFixed(0)} km/h`;
      g.farthest = Math.max(g.farthest, d);
      Sound.cheer(d > 135 || g.combo >= 3);
      g.excite = 1;
      fx.firework(B.mesh.position.clone());
      g.pitchLog.push({ r: 'hr', d });
    } else if (B.wallHit){
      g.combo = 0;
      const d = B.dist;
      gained = Math.round(d * 7) + 150;
      title = '撞 牆 二 壘 打'; sub = `${d.toFixed(1)} M　差一點就飛出去！`;
      g.farthest = Math.max(g.farthest, d);
      g.pitchLog.push({ r: 'wall', d });
    } else if (B.foul){
      g.combo = 0;
      gained = 30;
      title = '界 外'; sub = '角度差了一點';
      g.pitchLog.push({ r: 'foul' });
    } else {
      g.combo = 0;
      const d = B.dist;
      gained = Math.round(d * 5) + (r.grade === 'perfect' ? 120 : 0);
      title = d > 70 ? '深遠飛球' : d > 35 ? '場內安打' : '滾 地 球';
      sub = `${d.toFixed(1)} M`;
      g.farthest = Math.max(g.farthest, d);
      g.pitchLog.push({ r: 'in', d });
    }

    g.score += gained;
    G.ui.showResult(title, sub, gained, r.kind === 'hit' && B.hr);
    G.ui.syncHUD();

    g.phase = 'ready';
    g.timer = B.hr ? PACE.afterHR : PACE.afterPlay;
    g.camMode = 'land';
  }

  // ---------------- 每幀 ----------------
  g.update = (dt, t) => {
    // 好球帶只在等球／投球時顯示
    if (G.strikeZone){
      G.strikeZone.position.y = FIELD.plateY;
      G.strikeZone.visible = g.assist && (g.phase === 'windup' || g.phase === 'pitching');
    }
    if (g.phase === 'menu' || g.phase === 'over') return;

    g.excite = Math.max(0, g.excite - dt * .35);
    g.shake = Math.max(0, g.shake - dt * 2.6);
    // 注意：slowmo / hitstop 由 main.js 用「未縮放」的真實 dt 遞減，這裡不能扣

    // 打者蓄力（球飛行中前半段）
    if (g.phase === 'windup') bat.loaded = Math.min(1, bat.loaded + dt * 2.2);
    else if (g.phase === 'pitching') bat.loaded = Math.max(0, bat.loaded - dt * 3);

    if (g.phase === 'pitching'){
      // 球通過本壘且沒揮棒 → 看球
      if (!g.swungThisPitch && timeToContact(B) < -0.13){
        g.swungThisPitch = true;
        Sound.mitt();
        g.resultPending = { kind: 'take' };
        g.phase = 'result'; g.timer = .7;
      }
      // 揮空後球繼續進捕手手套
      if (g.swungThisPitch && B.state === 'dead'){ /* 等 result 計時 */ }
    }

    if (g.phase === 'result'){
      // 揮棒動畫掃到接觸幀 → 球才飛出去
      if (g.pendingHit){
        // 時機差很多時球會先飛過本壘板，先藏起來免得穿過鏡頭
        if (B.mesh.position.z < -1.2) B.mesh.visible = false;
        if (bat.swing >= bat.contactAt){ B.mesh.visible = true; executeHit(); }
      }
      // 擊出後先讓鏡頭停在打擊視角看完揮棒，再切去追球
      if (g.resultPending?.kind === 'hit' && B.state === 'hit'){
        g.hitHold -= dt;
        if (g.hitHold <= 0) g.camMode = 'follow';
      }
      g.timer -= dt;
      // 等接觸幀的球還沒打出去，也不能提前結算
      const flying = g.resultPending?.kind === 'hit' && (B.state === 'hit' || !!g.pendingHit);
      if (flying) g.timer = Math.max(g.timer, .05);      // 球還在飛就等
      if (!flying && g.timer <= 0) settle();
    } else if (g.phase === 'ready'){
      g.timer -= dt;
      // 提早把鏡頭帶回打擊視角，讓玩家有時間就定位
      if (g.timer < 1.5) g.camMode = 'bat';
      G.ui.showReadyCue(g.timer);
      if (g.timer <= 0){ resetBall(B); nextPitch(); }
    } else {
      G.ui.showReadyCue(-1);
    }

    // 球擊出後加快播放（物理積分照跑，落點與距離不變，只是不用等它慢慢飛）
    updateBall(B, B.state === 'hit' ? dt * PACE.flightSpeed : dt);
  };

  // 更新特效
  g.updateFX = (dt) => fx.update(dt);

  return g;
}

// ================= 特效 =================
// 圓形柔邊粒子貼圖（不然 PointsMaterial 會是方塊）
function sparkTexture(){
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(.35, 'rgba(255,255,255,.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

function makeFX(scene){
  const N = 160;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: .3, map: sparkTexture(), vertexColors: true, transparent: true, opacity: .95,
    depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false;
  scene.add(pts);
  const vel = [], life = new Float32Array(N);
  for (let i = 0; i < N; i++) vel.push(new THREE.Vector3());
  let head = 0;

  function emit(p, n, spread, speed, color, size){
    for (let i = 0; i < n; i++){
      const k = head = (head + 1) % N;
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      vel[k].set((Math.random() - .5) * spread, Math.random() * spread * .8, (Math.random() - .5) * spread)
        .normalize().multiplyScalar(speed * (.4 + Math.random()));
      const c = color.clone().offsetHSL((Math.random() - .5) * .12, 0, (Math.random() - .5) * .2);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      life[k] = .9 + Math.random() * .6;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  return {
    spark(p, q){                                        // 擊中的爆裂火花
      emit(p, 26 + Math.round(q * 22), 1, 6 + q * 11, new THREE.Color(0xffe071));
      emit(p, 10, 1, 3 + q * 5, new THREE.Color(0xffffff));
    },
    firework(p){
      emit(p, 46, 1, 13, new THREE.Color(0xff8de0));
      setTimeout(() => emit(p, 40, 1, 10, new THREE.Color(0x5ec8ff)), 180);
      setTimeout(() => emit(p, 40, 1, 11, new THREE.Color(0xffd23f)), 360);
    },
    update(dt){
      let dirty = false;
      for (let i = 0; i < N; i++){
        if (life[i] <= 0) continue;
        life[i] -= dt; dirty = true;
        vel[i].y -= 9 * dt;
        pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt;
        if (life[i] <= 0){ pos[i * 3 + 1] = -999; }
      }
      if (dirty) geo.attributes.position.needsUpdate = true;
    },
  };
}
