// 主程式：場景管理、輸入（鍵盤+虛擬按鍵）、比賽流程、攝影機、遊戲迴圈
import * as THREE from 'three';
import { TRACKS, buildTrack, buildSky, loadDecoModels } from './track.js';
import { KART_TYPES, AI_NAMES, buildKartMesh, loadKartModels } from './karts.js';
import { makeKartState, updateKart, collideKarts, updateKartVisual } from './physics.js';
import { aiInput, aiWantsItem } from './ai.js';
import { ItemManager } from './items.js';
import { SoundManager } from './sound.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';

// ============ 基礎設置 ============
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

// ============ 輸入 ============
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' && race && (race.state === 'racing' || race.state === 'countdown')) togglePause();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
// 失焦時清空按鍵，避免 keyup 遺失造成方向卡死
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
  const steer = (left ? 1 : 0) + (right ? -1 : 0); // 賽道座標：左為正
  const brake = !!(keys.ArrowDown || keys.KeyS || vkeys.brake);
  // 手機：自動油門輔助（預設開）；PC：↑/W
  const throttle = isTouch ? (brake ? 0 : 1) : (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const drift = !!(keys.ShiftLeft || keys.ShiftRight || keys.Space || vkeys.drift);
  const useItem = !!(keys.Enter || keys.KeyE || vkeys.item);
  return { steer, throttle, brake, drift, useItem };
}

// ============ 比賽狀態 ============
let race = null;
let lastT = performance.now();

function startRace(mode, trackDef, kartType) {
  sound.ensure();
  fade.classList.add('on');
  setTimeout(async () => {
    await Promise.all([loadKartModels(), loadDecoModels()]); // 模型就緒後才建場（已載入則立即返回）
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

  // ---- 車輛 ----
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
    // 噴射火焰 & 漂移火花
    k.flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 7),
      new THREE.MeshBasicMaterial({ color: 0xffa229, transparent: true, opacity: 0.9 }));
    k.flame.rotation.x = Math.PI / 2; k.flame.position.set(0, 0.6, -2.0); k.flame.visible = false;
    mesh.add(k.flame);
    k.sparks = [];
    for (const sx of [-0.85, 0.85]) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.9 }));
      sp.position.set(sx, 0.25, -1.1); sp.visible = false;
      mesh.add(sp); k.sparks.push(sp);
    }
  }

  const items = isTT ? null : new ItemManager(scene, track, karts, sound);

  race = {
    mode, trackDef, kartType, scene, track, karts, player, items,
    state: 'countdown', countT: 3.6, raceMs: 0,
    bestLap: 0, camPos: null, wrongWayT: 0, endT: 0,
  };

  // 攝影機初始位置
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

// ============ 暫停 ============
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

// ============ 主迴圈 ============
const _fwd = new THREE.Vector3(), _camTarget = new THREE.Vector3(), _look = new THREE.Vector3();

function tick() {
  requestAnimationFrame(tick);
  const now = performance.now();
  let dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  if (!race) { renderer.clear(); return; }
  const r = race;

  if (r.state === 'paused') { renderer.render(r.scene, camera); return; }

  // ---- 倒數 ----
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
    // 倒數期間引擎怠速
    sound.setEngine(0, playerInput().throttle * 0.3, false, false);
    updateCamera(r, dt, true);
    renderer.render(r.scene, camera);
    return;
  }

  // ---- 比賽中 ----
  r.raceMs += dt * 1000;
  const laps = r.trackDef.laps;
  const hazards = r.items ? r.items.hazards() : [];

  for (const k of r.karts) {
    let input;
    if (k.isPlayer) {
      // 完賽後鬆油門滑行停止（不能給 brake：停住後會轉為倒車）
      input = k.finished ? { steer: 0, throttle: 0, brake: false, drift: false } : playerInput();
      // 道具（按鍵防連發）
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

    // 事件音效／訊息
    if (k.isPlayer) {
      if (k._wallHit > 4) sound.wallHit(k._wallHit);
      if (k._bump > 6) { sound.bump(); k._bump = 0; }
      if (k._gotPad) sound.boost();
      if (k._miniTurbo) { sound.miniTurbo(k._miniTurbo); sound.boost(); k._miniTurbo = 0; }
      if ((prevCharge < 1.1 && k.drift.charge >= 1.1) || (prevCharge < 2.4 && k.drift.charge >= 2.4)) sound.driftTick();
    } else if (k._miniTurbo) k._miniTurbo = 0;

    // 火焰 / 火花視覺
    k.flame.visible = k.boost > 0;
    if (k.flame.visible) k.flame.scale.setScalar(0.7 + Math.random() * 0.6);
    const sparkOn = k.drift.active && k.drift.charge > 0.4;
    for (const sp of k.sparks) {
      sp.visible = sparkOn;
      if (sparkOn) {
        sp.material.color.setHex(k.drift.charge > 2.4 ? 0xff9a1f : k.drift.charge > 1.1 ? 0x66aaff : 0xcccccc);
        sp.scale.setScalar(0.6 + Math.random() * 0.8);
      }
    }

    // ---- 跨線事件 ----
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
      if (k.isPlayer && k.lap === laps - 1) { hud.center('最後一圈！', 1.4, 'min(9vw,56px)'); sound.lapJingle(); }
      else if (k.isPlayer && k.lap >= 1 && k.lap < laps) sound.lapJingle();

      // 完賽
      if (k.lap >= laps && !k.finished) {
        k.finished = true;
        k.finishTime = r.raceMs;
        if (k.isPlayer) onPlayerFinish(r);
      }
    }
  }

  collideKarts(r.karts);
  if (r.items) r.items.update(dt, r.raceMs / 1000);

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
      if (r.wrongWayT > 0.9) hud.msg('⚠️ 逆向行駛！', 0.5);
    } else r.wrongWayT = 0;
  }

  // ---- 引擎聲 ----
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

  // ---- 結束流程 ----
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
    // 未完賽 AI 依進度排序列入
    const standings = [
      ...r.karts.filter(k => k.finished).sort((a, b) => a.finishTime - b.finishTime),
      ...r.karts.filter(k => !k.finished).sort((a, b) => b.progress - a.progress),
    ];
    ui.showGPResult(standings, r.player);
  }
}

// ============ 攝影機 ============
function updateCamera(r, dt, countdown) {
  const p = r.player;
  _fwd.set(Math.sin(p.heading), 0, Math.cos(p.heading));
  const speedF = Math.min(1, Math.abs(p.speed) / p.type.topSpeed);
  const dist = 7.4 + speedF * 1.8;
  const h = 3.4 + speedF * 0.5;
  _camTarget.copy(p.pos).addScaledVector(_fwd, -dist);
  _camTarget.y = p.pos.y + h;
  if (countdown) {
    // 倒數運鏡：從側前方環繞，收尾正好停在車尾追焦位置
    const t = Math.max(0, r.countT / 3.6);
    const orbA = p.heading + Math.PI + t * 2.2; // t=0 時 = 車正後方
    const orbDist = dist + t * 4;
    _camTarget.set(
      p.pos.x + Math.sin(orbA) * orbDist,
      p.pos.y + h + t * 1.8,
      p.pos.z + Math.cos(orbA) * orbDist
    );
  }
  const damp = countdown ? 1 - Math.pow(0.02, dt) : 1 - Math.pow(0.0004, dt);
  r.camPos.lerp(_camTarget, damp);
  // 避免攝影機低於路面
  const q = r.track.query(r.camPos, p.idx);
  const minY = q.surfaceY + 1.4;
  if (r.camPos.y < minY) r.camPos.y = minY;
  camera.position.copy(r.camPos);
  _look.copy(p.pos).addScaledVector(_fwd, 5.5);
  _look.y += 1.3;
  camera.lookAt(_look);
  // 加速時視野拉寬
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

// 首次互動解鎖音訊（行動裝置需要）
window.addEventListener('pointerdown', () => sound.ensure(), { once: true });

ui.show('scr-main');
loadKartModels(); loadDecoModels(); // 進主選單即開始預載模型
tick();
