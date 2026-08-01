// ============ 入口：renderer / 場景組裝 / 相機 / 主迴圈 / 輸入 ============
import * as THREE from 'three';
import { CAM, FIELD, loadTune } from './config.js';
import { buildStadium, animateCrowd, buildStrikeZone } from './stadium.js';
import { createBall } from './ball.js';
import { createBatter, createPitcher, createCatcher, createUmpire, createFielders,
         updateBatter, updatePitcher } from './characters.js';
import { initGame } from './game.js';
import { initUI } from './ui.js';
import { initDev } from './dev.js';
import { Sound } from './sound.js';

loadTune();

const G = {};
window.SWINGGAME = G;                                   // 除錯用掛勾

const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 820;

// ---------------- Renderer ----------------
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 2 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
G.scene = scene;
G.renderer = renderer;        // 除錯用：可自由擺鏡頭檢視角色（例如從正面看臉與帽子）

const camera = new THREE.PerspectiveCamera(isMobile ? CAM.fovMobile : CAM.fov, innerWidth / innerHeight, 0.1, 1200);
G.camera = camera;

// ---------------- 場景 ----------------
const stad = buildStadium(scene);
G.stadium = stad;
G.ball = createBall(scene);
G.strikeZone = buildStrikeZone(scene);
G.batter = createBatter(scene);
G.pitcher = createPitcher(scene);
G.catcher = createCatcher(scene);
G.umpire = createUmpire(scene);
G.fielders = createFielders(scene);
// 近景打擊視角會被捕手／裁判擋住，預設不顯示（DEV 工具可切回來）
G.setCatcherVisible = (v) => {
  CAM.showCatcher = v ? 1 : 0;
  G.catcher.root.visible = !!v;
  G.umpire.root.visible = !!v;
};
G.setCatcherVisible(CAM.showCatcher);

// ---------------- 模組 ----------------
initGame(G);
initUI(G);
const dev = initDev(G);
G.onTuneChanged = () => {
  camera.fov = isMobile ? CAM.fovMobile : CAM.fov;
  camera.updateProjectionMatrix();
  G.ui.setupTimingZones(G.game.diff);
};

// ---------------- 相機 ----------------
const camPos = new THREE.Vector3(CAM.batX, CAM.batY, CAM.batZ);
const camLook = new THREE.Vector3(0, CAM.batLookY, CAM.batLookZ);
const tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
camera.position.copy(camPos);

function updateCamera(dt){
  const g = G.game, b = G.ball, bp = b.mesh.position;
  const mode = g?.camMode || 'bat';

  if (mode === 'follow' && b.state !== 'idle'){
    const d = Math.hypot(bp.x, bp.z);
    tPos.set(bp.x * .3 - 1.4, 5.2 + d * .17 + bp.y * .32, -11 - d * .13);
    tLook.copy(bp);
  } else if (mode === 'land' && b.landed){
    const L = b.landed;
    const d = Math.hypot(L.x, L.z);
    tPos.set(L.x * .32 - 1.4, 6 + d * .18, -11 - d * .14);
    tLook.set(L.x * .6, 1.2, L.z * .6);
  } else {
    // 直屏（手機）視野較窄，鏡頭拉高退後一點
    const portrait = innerHeight > innerWidth;
    tPos.set(
      CAM.batX + (portrait ? CAM.portraitX : 0),
      CAM.batY + (portrait ? CAM.portraitY : 0),
      CAM.batZ + (portrait ? CAM.portraitZ : 0)
    );
    tLook.set(CAM.batLookX, CAM.batLookY + (portrait ? .1 : 0), CAM.batLookZ);
  }

  const k = mode === 'bat' ? 1 - Math.pow(1 - 0.12, dt * 60) : 1 - Math.pow(1 - CAM.followLerp, dt * 60);
  camPos.lerp(tPos, k);
  camLook.lerp(tLook, Math.min(1, k * 1.5));

  camera.position.copy(camPos);
  if (g?.shake > 0){
    camera.position.x += (Math.random() - .5) * g.shake * .3;
    camera.position.y += (Math.random() - .5) * g.shake * .3;
  }
  camera.lookAt(camLook);

  // 擊中瞬間的 FOV 縮進
  const baseFov = innerWidth < 820 ? CAM.fovMobile : CAM.fov;
  const wantFov = baseFov - (g?.hitZoom || 0);
  if (Math.abs(camera.fov - wantFov) > 0.01){
    camera.fov = wantFov;
    camera.updateProjectionMatrix();
  }
}

// ---------------- 輸入 ----------------
function doSwing(){
  Sound.unlock();
  if (G.game.phase === 'pitching' || G.game.phase === 'windup') G.game.swing();
}

window.addEventListener('keydown', (e) => {
  if (document.activeElement?.tagName === 'INPUT') return;
  if (e.code === 'Space' || e.code === 'Enter'){
    e.preventDefault();
    if (G.game.phase === 'menu'){ document.getElementById('btn-start').click(); return; }
    doSwing();
  }
  if (e.key === 'p' || e.key === 'P') G.ui.togglePower();
  if (e.key === 'a' || e.key === 'A') G.ui.toggleAssist();
  if (e.key === 'm' || e.key === 'M') G.ui.toggleSound();
});

// 點畫面揮棒（避開 UI 控制項）
window.addEventListener('pointerdown', (e) => {
  if (G.game.phase === 'menu' || G.game.phase === 'over') return;
  if (e.target.closest('.cbtn, .screen, #dev, #dev-toggle, .panel')) return;
  doSwing();
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = (innerWidth < 820 ? CAM.fovMobile : CAM.fov);
  camera.updateProjectionMatrix();
});

// ---------------- 主迴圈 ----------------
const clock = new THREE.Clock();
let t = 0;

// 單步更新（也給 DEV／自動測試用：SWINGGAME.step(1/60)）
G.step = (dt, render = true) => {
  const g = G.game;
  const raw = dt;                                       // 真實時間（頓幀／慢動作要用這個計時）
  if (g){
    if (g.hitstop > 0){                                 // 擊中瞬間卡住畫面
      g.hitstop -= raw;
      dt = 0.0006;
    } else if (g.slowmo > 0){                           // 接著轉慢動作
      g.slowmo -= raw;
      dt *= 0.42;
    }
    // 擊中的鏡頭縮進，快速回彈
    if (g.hitZoom > 0) g.hitZoom = Math.max(0, g.hitZoom - raw * 26);
  }
  t += dt;

  if (g) {
    g.update(dt, t);
    g.updateFX(dt);
    if (g._devWatch > 0){ g._devWatch -= dt; if (g._devWatch <= 0) g.camMode = 'bat'; }
  }

  updateBatter(G.batter, dt, t);
  updatePitcher(G.pitcher, dt);
  animateCrowd(stad, t, g ? g.excite : 0.05);
  updateCamera(dt);
  G.ui.updateTiming();

  if (render) renderer.render(scene, camera);
};

function loop(){
  requestAnimationFrame(loop);
  G.step(Math.min(clock.getDelta(), 0.05));
}

// 首幀後移除 loading
requestAnimationFrame(() => {
  renderer.render(scene, camera);
  document.getElementById('boot').style.display = 'none';
  loop();
});
