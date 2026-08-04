// 主程式：场景管理、输入（键盘+虚拟按键）、比赛流程、摄影机、游戏回圈
import * as THREE from 'three';
import { TRACKS, buildTrack, buildSky, loadDecoModels } from './track.js';
import { KART_TYPES, AI_NAMES, buildKartMesh, loadKartModels } from './karts.js';
import { makeKartState, updateKart, collideKarts, updateKartVisual } from './physics.js';
import { aiInput, aiWantsItem } from './ai.js';
import { ItemManager } from './items.js';
import { SoundManager } from './sound.js';
import { ParticleSystem } from './particles.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';

// ============ 基础设置 ============
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 1200);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');

const sound = new SoundManager();
const hud = new HUD();
const ui = new UI(sound);
const fade = document.getElementById('fade');

// ============ 输入 ============
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' && race && (race.state === 'racing' || race.state === 'countdown')) togglePause();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
// 失焦时清空按键，避免 keyup 遗失造成方向卡死
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) for (const k in keys) keys[k] = false;
});

const vkeys = { left: false, right: false, drift: false, brake: false, item: false };
for (const [id, key] of [['vb-left', 'left'], ['vb-right', 'right'], ['vb-drift', 'drift'], ['vb-brake', 'brake'], ['vb-item', 'item']]) {
  const el = document.getElementById(id);
  const press = v => e => {
    e.preventDefault();
    vkeys[key] = v;
    el.classList.toggle('pressed', v);
  };
  el.addEventListener('pointerdown', press(true));
  el.addEventListener('pointerup', press(false));
  el.addEventListener('pointercancel', press(false));
  el.addEventListener('pointerleave', press(false));
}

let itemKeyLatch = false;
function playerInput() {
  const left = keys.ArrowLeft || keys.KeyA || vkeys.left;
  const right = keys.ArrowRight || keys.KeyD || vkeys.right;
  const steer = (left ? 1 : 0) + (right ? -1 : 0); // 赛道座标：左为正
  const brake = !!(keys.ArrowDown || keys.KeyS || vkeys.brake);
  // 手机：自动油门辅助（预设开）；PC：↑/W
  const throttle = isTouch ? (brake ? 0 : 1) : (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const drift = !!(keys.ShiftLeft || keys.ShiftRight || keys.Space || vkeys.drift);
  const useItem = !!(keys.Enter || keys.KeyE || vkeys.item);
  return { steer, throttle, brake, drift, useItem };
}

// ============ 比赛状态 ============
let race = null;
let lastT = performance.now();

function startRace(mode, trackDef, kartType) {
  sound.ensure();
  fade.classList.add('on');
  setTimeout(async () => {
    await Promise.all([loadKartModels(), loadDecoModels()]); // 模型就绪后才建场（已载入则立即返回）
    disposeRace();
    buildRace(mode, trackDef, kartType);
    fade.classList.remove('on');
  }, 380);
}

function buildRace(mode, trackDef, kartType) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(trackDef.fog.color, trackDef.fog.near, trackDef.fog.far);
  scene.add(buildSky(trackDef));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, trackDef.ambient));
  const sun = new THREE.DirectionalLight(trackDef.sunColor, trackDef.theme === 'neon' ? 0.5 : 1.0);
  sun.position.set(...trackDef.sunPos);
  scene.add(sun);

  const track = buildTrack(trackDef);
  scene.add(track.group);

  // ---- 车辆 ----
  const isTT = mode === 'tt';
  const karts = [];
  const player = makeKartState(kartType, track.startPositions[isTT ? 0 : 3], true, '你');
  karts.push(player);
  if (!isTT) {
    const others = KART_TYPES.filter(k => k !== kartType);
    shuffle(others);
    const names = shuffle([...AI_NAMES]);
    let slot = 0;
    for (let i = 0; i < 5; i++) {
      if (slot === 3) slot++; // 玩家的起跑格
      const ai = makeKartState(others[i], track.startPositions[slot++], false, names[i]);
      karts.push(ai);
    }
  }
  for (const k of karts) {
    const { mesh, wheels } = buildKartMesh(k.type);
    k.mesh = mesh; k.wheels = wheels;
    scene.add(mesh);
    updateKartVisual(k, track, 0.016);
    // 喷射火焰：内白外橘双层火舌（喷发时抖动，烟雾由粒子系统处理）
    k.flame = new THREE.Group();
    const flameOut = new THREE.Mesh(new THREE.ConeGeometry(0.30, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    flameOut.rotation.x = Math.PI / 2;
    const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.0, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    flameCore.rotation.x = Math.PI / 2; flameCore.position.z = 0.18;
    k.flame.add(flameOut, flameCore);
    k.flame.position.set(0, 0.6, -1.95); k.flame.visible = false;
    mesh.add(k.flame);
    k._fxAcc = 0;
  }

  const items = isTT ? null : new ItemManager(scene, track, karts, sound);
  const particles = new ParticleSystem(scene);

  race = {
    mode, trackDef, kartType, scene, track, karts, player, items, particles,
    state: 'countdown', countT: 3.6, raceMs: 0,
    bestLap: 0, camPos: null, wrongWayT: 0, endT: 0,
  };

  // 摄影机初始位置
  const fwd = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  camera.position.copy(player.pos).addScaledVector(fwd, -8).add(new THREE.Vector3(0, 4, 0));
  race.camPos = camera.position.clone();
  camera.lookAt(player.pos);

  hud.show(isTT);
  hud.initMap(track);
  document.body.classList.add('racing');
  updateMuteBtn();
  sound.startEngine();
}

function disposeRace() {
  if (!race) return;
  sound.stopEngine();
  sound.stopMusic();
  if (race.items) race.items.dispose();
  race.scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
  hud.hide();
  document.body.classList.remove('racing');
  race = null;
}

// ============ 暂停 ============
function togglePause() {
  if (!race) return;
  if (race.state === 'paused') {
    race.state = race._prevState;
    ui.hidePause();
    if (sound.ctx) sound.ctx.resume();
  } else if (race.state === 'racing' || race.state === 'countdown') {
    race._prevState = race.state;
    race.state = 'paused';
    ui.showPause();
    if (sound.ctx) sound.ctx.suspend();
  }
}
document.getElementById('btn-pause').onclick = togglePause;
document.addEventListener('visibilitychange', () => {
  if (document.hidden && race && race.state === 'racing') togglePause();
});

const muteBtn = document.getElementById('btn-mute');
muteBtn.onclick = () => { sound.ensure(); updateMuteBtn(sound.toggleMute()); };
function updateMuteBtn(m = sound.muted) { muteBtn.textContent = m ? '🔇' : '🔊'; }

// ============ UI 回呼 ============
ui.onStart = (mode, trackDef, kartType) => startRace(mode, trackDef, kartType);
ui.onResume = () => togglePause();
ui.onRestart = () => {
  ui.hidePause(); ui.hideResult();
  if (sound.ctx) sound.ctx.resume();
  const { mode, trackDef, kartType } = race;
  startRace(mode, trackDef, kartType);
};
ui.onQuit = () => {
  ui.hidePause(); ui.hideResult();
  if (sound.ctx) sound.ctx.resume();
  fade.classList.add('on');
  setTimeout(() => { disposeRace(); ui.show('scr-main'); fade.classList.remove('on'); }, 380);
};

// ============ 主回圈 ============
const _fwd = new THREE.Vector3(), _camTarget = new THREE.Vector3(), _look = new THREE.Vector3();

function tick() {
  requestAnimationFrame(tick);
  const now = performance.now();
  let dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  if (!race) { renderer.clear(); return; }
  const r = race;

  if (r.state === 'paused') { renderer.render(r.scene, camera); return; }

  // ---- 倒数 ----
  if (r.state === 'countdown') {
    const prev = Math.ceil(r.countT);
    r.countT -= dt;
    const cur = Math.ceil(r.countT);
    if (cur !== prev && cur > 0 && cur <= 3) { hud.center(String(cur), 0.85); sound.countBeep(); }
    if (r.countT <= 0) {
      r.state = 'racing';
      hud.center('GO!', 0.9);
      sound.goBeep();
      sound.startMusic(r.trackDef.theme);
      for (const k of r.karts) k.lapStart = 0;
    }
    // 倒数期间引擎怠速
    sound.setEngine(0, playerInput().throttle * 0.3, false, false);
    updateCamera(r, dt, true);
    renderer.render(r.scene, camera);
    return;
  }

  // ---- 比赛中 ----
  r.raceMs += dt * 1000;
  const laps = r.trackDef.laps;
  const hazards = r.items ? r.items.hazards() : [];

  for (const k of r.karts) {
    let input;
    if (k.isPlayer) {
      // 完赛后松油门滑行停止（不能给 brake：停住后会转为倒车）
      input = k.finished ? { steer: 0, throttle: 0, brake: false, drift: false } : playerInput();
      // 道具（按键防连发）
      if (input.useItem && !itemKeyLatch && r.items && !k.finished) r.items.use(k);
      itemKeyLatch = input.useItem;
    } else {
      input = k.finished
        ? { steer: aiInput(k, r.track, r.player, hazards, dt).steer, throttle: 0.25, brake: false, drift: false }
        : aiInput(k, r.track, r.player, hazards, dt);
      if (!k.finished && r.items && aiWantsItem(k, r.karts, dt)) r.items.use(k);
    }

    const prevCharge = k.drift.charge;
    updateKart(k, input, r.track, dt);
    updateKartVisual(k, r.track, dt);

    // 事件音效／讯息
    if (k.isPlayer) {
      if (k._wallHit > 4) sound.wallHit(k._wallHit);
      if (k._bump > 6) { sound.bump(); k._bump = 0; }
      if (k._gotPad) sound.boost();
      if (k._miniTurbo) { sound.miniTurbo(k._miniTurbo); sound.boost(); k._miniTurbo = 0; }
      if ((prevCharge < 1.1 && k.drift.charge >= 1.1) || (prevCharge < 2.4 && k.drift.charge >= 2.4)) sound.driftTick();
    } else if (k._miniTurbo) k._miniTurbo = 0;

    // 火焰视觉：喷发时长度/宽度随机抖动
    k.flame.visible = k.boost > 0;
    if (k.flame.visible) {
      k.flame.scale.set(0.85 + Math.random() * 0.3, 0.85 + Math.random() * 0.3, 0.65 + Math.random() * 0.7);
    }
    // 烟雾/火星/尘土粒子
    emitKartFX(k, dt, r);

    // ---- 跨线事件 ----
    if (k._crossedLine) {
      if (k.lap >= 1) {
        const lapT = r.raceMs - k.lapStart;
        k.lapTimes.push(lapT);
        if (!k.bestLap || lapT < k.bestLap) {
          k.bestLap = lapT;
          if (k.isPlayer && k.lapTimes.length > 1) { sound.bestLapJingle(); hud.msg('✨ 最速圈！'); }
        }
      }
      k.lapStart = r.raceMs;
      if (k.isPlayer && k.lap === laps - 1) { hud.center('最后一圈！', 1.4, 'min(9vw,56px)'); sound.lapJingle(); }
      else if (k.isPlayer && k.lap >= 1 && k.lap < laps) sound.lapJingle();

      // 完赛
      if (k.lap >= laps && !k.finished) {
        k.finished = true;
        k.finishTime = r.raceMs;
        if (k.isPlayer) onPlayerFinish(r);
      }
    }
  }

  collideKarts(r.karts);
  if (r.items) r.items.update(dt, r.raceMs / 1000);
  r.particles.update(dt);

  // ---- 名次 ----
  const finished = r.karts.filter(k => k.finished).sort((a, b) => a.finishTime - b.finishTime);
  const running = r.karts.filter(k => !k.finished).sort((a, b) => b.progress - a.progress);
  [...finished, ...running].forEach((k, i) => { k.rank = i + 1; });

  // ---- 逆向警告 ----
  const p = r.player;
  if (!p.finished) {
    const s = r.track.samples[p.idx];
    const dot = Math.sin(p.heading) * s.tan.x + Math.cos(p.heading) * s.tan.z;
    if (dot < -0.25 && p.speed > 6) {
      r.wrongWayT += dt;
      if (r.wrongWayT > 0.9) hud.msg('⚠️ 逆向行驶！', 0.5);
    } else r.wrongWayT = 0;
  }

  // ---- 引擎声 ----
  const in_ = p.finished ? { throttle: 0 } : playerInput();
  sound.setEngine(
    Math.min(1, Math.abs(p.speed) / p.type.topSpeed),
    in_.throttle || 0,
    p.boost > 0,
    p.drift.active && Math.abs(p.speed) > 12
  );

  // ---- HUD ----
  hud.setRace(p, laps, r.raceMs, p.bestLap);
  hud.drawMap(r.track, r.karts, p);

  // ---- 结束流程 ----
  if (r.state === 'ending') {
    r.endT -= dt;
    if (r.endT <= 0) {
      r.state = 'results';
      showResults(r);
    }
  }

  updateCamera(r, dt, false);
  renderer.render(r.scene, camera);
}

// ============ 车辆特效粒子发射 ============
const _fx = new THREE.Vector3(), _fxv = new THREE.Vector3();
// 把车身局部座标转世界座标
function kartLocal(k, x, y, z, out) {
  return out.set(x, y, z).applyQuaternion(k.mesh.quaternion).add(k.mesh.position);
}

function emitKartFX(k, dt, r) {
  const P = r.particles;
  const speed = Math.abs(k.speed);
  const rate = k.isPlayer ? 1 : 0.55; // AI 减量保帧率
  const fwdX = Math.sin(k.heading), fwdZ = Math.cos(k.heading);
  k._fxAcc += dt * 60 * rate;

  while (k._fxAcc >= 1) {
    k._fxAcc -= 1;
    const roll = Math.random();

    // 喷射中：排气管喷出火星 + 滚滚深灰废烟
    if (k.boost > 0) {
      const sx = Math.random() > 0.5 ? 0.3 : -0.3;
      kartLocal(k, sx, 0.55, -1.6, _fx);
      // 废烟：向后喷出、上飘、变大消散
      _fxv.set(-fwdX * (speed * 0.4 + 5) + (Math.random() - 0.5) * 2, 0.6 + Math.random(), -fwdZ * (speed * 0.4 + 5) + (Math.random() - 0.5) * 2);
      P.spawn({ pos: _fx, vel: _fxv, life: 0.55 + Math.random() * 0.35, size0: 0.35, size1: 1.5, color: 0x4a4a52, opacity: 0.42, rise: 2.2, damp: 3 });
      // 火星：小而亮、快速熄灭
      if (roll < 0.7) {
        _fxv.set(-fwdX * (speed * 0.5 + 9) + (Math.random() - 0.5) * 3, (Math.random() - 0.2) * 2, -fwdZ * (speed * 0.5 + 9) + (Math.random() - 0.5) * 3);
        P.spawn({ pos: _fx, vel: _fxv, life: 0.16 + Math.random() * 0.1, size0: 0.32, size1: 0.08, color: Math.random() > 0.4 ? 0xffa229 : 0xfff3c0, opacity: 0.95, additive: true, rise: 0, damp: 1 });
      }
    }

    // 漂移：后轮扬起白灰轮胎烟 + 依蓄力等级喷火花
    if (k.drift.active && speed > 12) {
      const wx = k.drift.dir > 0 ? -0.85 : 0.85; // 外侧后轮烟较浓
      kartLocal(k, roll > 0.35 ? wx : -wx, 0.2, -1.05, _fx);
      _fxv.set(-fwdX * speed * 0.25 + (Math.random() - 0.5) * 2.5, 0.8 + Math.random() * 0.8, -fwdZ * speed * 0.25 + (Math.random() - 0.5) * 2.5);
      P.spawn({ pos: _fx, vel: _fxv, life: 0.5 + Math.random() * 0.4, size0: 0.3, size1: 1.3, color: 0xd8d8dc, opacity: 0.3, rise: 1.6, damp: 3.5 });
      if (k.drift.charge > 0.4 && roll < 0.55) {
        const col = k.drift.charge > 2.4 ? 0xff9a1f : k.drift.charge > 1.1 ? 0x66aaff : 0xbbbbbb;
        kartLocal(k, wx, 0.18, -1.0, _fx);
        _fxv.set((Math.random() - 0.5) * 5 - fwdX * 3, 0.5 + Math.random() * 2, (Math.random() - 0.5) * 5 - fwdZ * 3);
        P.spawn({ pos: _fx, vel: _fxv, life: 0.2 + Math.random() * 0.15, size0: 0.22, size1: 0.05, color: col, opacity: 1, additive: true, rise: -2, damp: 0.5 });
      }
    }
    // 越野：扬起尘土
    else if (k.offroad && speed > 8 && roll < 0.6) {
      kartLocal(k, Math.random() > 0.5 ? 0.8 : -0.8, 0.15, -1.0, _fx);
      _fxv.set(-fwdX * speed * 0.2 + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 0.8, -fwdZ * speed * 0.2 + (Math.random() - 0.5) * 2);
      P.spawn({ pos: _fx, vel: _fxv, life: 0.6 + Math.random() * 0.4, size0: 0.4, size1: 1.6, color: r.trackDef.theme === 'canyon' ? 0xc09760 : 0x9a8a62, opacity: 0.32, rise: 1.2, damp: 3 });
    }

    // 打滑旋转中：冒烟
    if (k.spinT > 0 && roll < 0.5) {
      kartLocal(k, (Math.random() - 0.5) * 1.4, 0.3, (Math.random() - 0.5) * 2, _fx);
      _fxv.set((Math.random() - 0.5) * 3, 1.2 + Math.random(), (Math.random() - 0.5) * 3);
      P.spawn({ pos: _fx, vel: _fxv, life: 0.6, size0: 0.4, size1: 1.4, color: 0x707078, opacity: 0.4, rise: 2, damp: 2.5 });
    }
  }
}

function onPlayerFinish(r) {
  hud.center('FINISH!', 2.2, 'min(13vw,84px)');
  const isWin = r.mode === 'tt' || r.player.rank === 1;
  if (isWin) sound.finishWin();
  else if (r.player.rank <= 3) sound.finishWin();
  else sound.finishLose();
  sound.stopMusic();
  r.state = 'ending';
  r.endT = 2.4;
}

function showResults(r) {
  if (r.mode === 'tt') {
    ui.showTTResult({
      trackId: r.trackDef.id,
      totalMs: r.player.finishTime,
      lapTimes: r.player.lapTimes,
      bestLap: r.player.bestLap,
      kartName: r.kartType.name,
    });
  } else {
    // 未完赛 AI 依进度排序列入
    const standings = [
      ...r.karts.filter(k => k.finished).sort((a, b) => a.finishTime - b.finishTime),
      ...r.karts.filter(k => !k.finished).sort((a, b) => b.progress - a.progress),
    ];
    ui.showGPResult(standings, r.player);
  }
}

// ============ 摄影机 ============
function updateCamera(r, dt, countdown) {
  const p = r.player;
  _fwd.set(Math.sin(p.heading), 0, Math.cos(p.heading));
  const speedF = Math.min(1, Math.abs(p.speed) / p.type.topSpeed);
  const dist = 7.4 + speedF * 1.8;
  const h = 3.4 + speedF * 0.5;
  _camTarget.copy(p.pos).addScaledVector(_fwd, -dist);
  _camTarget.y = p.pos.y + h;
  if (countdown) {
    // 倒数运镜：从侧前方环绕，收尾正好停在车尾追焦位置
    const t = Math.max(0, r.countT / 3.6);
    const orbA = p.heading + Math.PI + t * 2.2; // t=0 时 = 车正后方
    const orbDist = dist + t * 4;
    _camTarget.set(
      p.pos.x + Math.sin(orbA) * orbDist,
      p.pos.y + h + t * 1.8,
      p.pos.z + Math.cos(orbA) * orbDist
    );
  }
  const damp = countdown ? 1 - Math.pow(0.02, dt) : 1 - Math.pow(0.0004, dt);
  r.camPos.lerp(_camTarget, damp);
  // 避免摄影机低于路面
  const q = r.track.query(r.camPos, p.idx);
  const minY = q.surfaceY + 1.4;
  if (r.camPos.y < minY) r.camPos.y = minY;
  camera.position.copy(r.camPos);
  _look.copy(p.pos).addScaledVector(_fwd, 5.5);
  _look.y += 1.3;
  camera.lookAt(_look);
  // 加速时视野拉宽
  const targetFov = 68 + (p.boost > 0 ? 12 : 0) + speedF * 4;
  camera.fov += (targetFov - camera.fov) * Math.min(1, 5 * dt);
  camera.updateProjectionMatrix();
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 首次互动解锁音讯（行动装置需要）
window.addEventListener('pointerdown', () => sound.ensure(), { once: true });

ui.show('scr-main');
// 进主选单即开始预载模型；车辆就绪后用实际模型渲染选车卡片缩图
loadKartModels().then(() => ui.fillKartThumbnails());
loadDecoModels();
tick();
