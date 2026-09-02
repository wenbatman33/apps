// ===== 程式進入點：渲染器 / 環境光 / 相機 / 輸入 / 主迴圈 =====
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TUNE, COURT } from './tune.js';
import { Arena } from './arena.js';
import { Ball } from './ball.js';
import { makePlayerAthlete, makeAIAthlete } from './player.js';
import { HUD } from './hud.js';
import { Game } from './game.js';
import { PostFX } from './postfx.js';
import { Audio } from './audio.js';
import { setupDevTool } from './dev.js';

const canvas = document.getElementById('game-canvas');
const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches;
const isMobile = params.has('mobile') ? params.get('mobile') !== '0' : (coarse && Math.min(innerWidth, innerHeight) < 900);
// 版面：直式（含手機直握）用 mobile 相機/HUD，橫式用 pc；DEV 面板可手動覆蓋
let layoutLock = null;
let layoutKey = isMobile ? 'mobile' : 'pc';
const pickLayout = () => layoutLock || ((isMobile || innerHeight > innerWidth) ? 'mobile' : 'pc');

// ---- 渲染器 ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 2 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = TUNE.light.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f16);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);

// 室內環境光（PMREM）
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
pmrem.dispose();

// ---- 場景物件 ----
const arena = new Arena(scene, isMobile);
arena.setEnvironment(envTex);
const ball = new Ball(scene);
ball.mat.envMapIntensity = 0.5;
const player = makePlayerAthlete();
const ai = makeAIAthlete();
scene.add(player.root, ai.root);
const applyChar = () => { player.setEnvIntensity(TUNE.light.envChar); ai.setEnvIntensity(TUNE.light.envChar); };
applyChar();

const audio = new Audio();
const usePost = !isMobile && !params.has('nopost');
const postfx = new PostFX(renderer, scene, camera, usePost);

// ---- UI / 遊戲 ----
let game;
const hud = new HUD(renderer, canvas, isMobile, {
  onStart: (diff) => { game.startMatch(diff); },
  onMenu: () => game.toMenu(),
  onAssist: (v) => { if (game) game.assist = v; },
  onUI: () => audio.play('ui'),
  onMute: (m) => { audio.enabled = !m; try { localStorage.setItem('pb_mute', m ? '1' : '0'); } catch (e) {} },
});
try { if (localStorage.getItem('pb_mute') === '1') { hud.setMuted(true); audio.enabled = false; } } catch (e) {}
game = new Game({ scene, arena, ball, player, ai, hud, audio, camera });
game.assist = hud.assist;

// ---- 相機 ----
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camInit = false;
function applyCamera() {
  const C = TUNE.camera[layoutKey];
  camera.fov = C.fov;
  camera.updateProjectionMatrix();
  camInit = false;
}
function updateCamera(dt) {
  if (window.__pb?.freeCam) return; // DEV：自由相機（console 設 __pb.freeCam = true 後自行擺相機）
  const C = TUNE.camera[layoutKey];
  let tx, ty, tz, lx, ly, lz;
  if (game.state === 'title') {
    // 標題：緩慢環繞球場
    const t = performance.now() / 1000 * 0.12;
    const r = 11.5;
    tx = Math.sin(t) * r; tz = Math.cos(t) * r; ty = 4.6 + Math.sin(t * 0.7) * 0.6;
    lx = 0; ly = 0.6; lz = 0;
  } else {
    const fx = player.pos.x * C.followX;
    tx = C.x + fx; ty = C.y; tz = C.z;
    lx = fx * 0.6; ly = C.lookY; lz = C.lookZ;
  }
  if (!camInit) { camPos.set(tx, ty, tz); camLook.set(lx, ly, lz); camInit = true; }
  const k = Math.min(1, dt * TUNE.camera.lerp);
  camPos.lerp(new THREE.Vector3(tx, ty, tz), k);
  camLook.lerp(new THREE.Vector3(lx, ly, lz), k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}
applyCamera();

// ---- 尺寸 ----
function resize() {
  const w = innerWidth, h = innerHeight;
  const k = pickLayout();
  if (k !== layoutKey) { layoutKey = k; hud.layoutKey = k; applyCamera(); }
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  postfx.setSize(w, h);
  hud.resize(w, h);
}
addEventListener('resize', resize);
layoutKey = pickLayout(); hud.layoutKey = layoutKey; applyCamera();
resize();

// ---- 輸入 ----
const pointers = new Map();
let mouseNX = 0;
const toNX = (clientX) => THREE.MathUtils.clamp((clientX / innerWidth) * 2 - 1, -1, 1);
canvas.addEventListener('pointerdown', (e) => {
  audio.resume();
  if (hud.pointerDown(e.clientX, e.clientY)) { pointers.set(e.pointerId, { ui: true }); return; }
  pointers.set(e.pointerId, { ui: false, x: e.clientX, y: e.clientY, moved: 0 });
  mouseNX = toNX(e.clientX);
  game.tap(mouseNX);
});
canvas.addEventListener('pointermove', (e) => {
  mouseNX = toNX(e.clientX);
  const p = pointers.get(e.pointerId);
  if (!p || p.ui) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  p.moved += Math.abs(dx) + Math.abs(dy);
  if (p.moved > 6) game.manualMove(dx * TUNE.player.dragSpeed, dy * TUNE.player.dragSpeed);
});
const endPointer = (e) => {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (p?.ui) hud.pointerUp(e.clientX, e.clientY);
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  keys.add(e.code);
  if (['Space', 'Enter', 'KeyJ', 'KeyK'].includes(e.code)) {
    e.preventDefault();
    audio.resume();
    if (game.state === 'title') game.startMatch(hud.difficulty);
    else if (game.state === 'result') game.startMatch(hud.difficulty);
    else game.tap(keys.has('ArrowLeft') || keys.has('KeyA') ? -0.75 : keys.has('ArrowRight') || keys.has('KeyD') ? 0.75 : mouseNX);
  }
  if (e.code === 'Escape' && game.state !== 'title') game.toMenu();
});
addEventListener('keyup', (e) => keys.delete(e.code));
function keyboardMove(dt) {
  let dx = 0, dz = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dz -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dz += 1;
  if (dx || dz) game.manualMove(dx * TUNE.player.speed * dt, dz * TUNE.player.speed * dt);
}

// ---- DEV 工具 ----
setupDevTool({
  hud, arena, postfx, game, canvas, applyCamera, applyChar,
  getLayout: () => layoutKey,
  setLayout: (k) => { layoutLock = k; layoutKey = k; hud.layoutKey = k; applyCamera(); hud.layout(); },
});

// ---- 自動測試（?auto=1）：玩家由簡單機器人代打，用來驗證回合流程 ----
const autoPlay = params.has('auto');
function autoSwing() {
  if (game.state === 'title') { game.startMatch(hud.difficulty); return; }
  if (game.state === 'result') { game.startMatch(hud.difficulty); return; }
  if (game.state === 'serve' && game.server === 'p' && !game.served && game.timer > 0.4) { game.tap(Math.random() * 2 - 1); return; }
  if (game.state !== 'rally' || !ball.active || ball.lastHitter === 'p') return;
  const rz = ball.pos.z - player.pos.z, rx = ball.pos.x - player.pos.x;
  if (Math.abs(rx) < 1.2 && rz > -1.3 && rz < 0.3 && ball.vel.z > 0) game.tap(Math.random() * 2 - 1);
}

// ---- 主迴圈 ----
const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  keyboardMove(dt);
  if (autoPlay) autoSwing();
  game.update(dt);
  hud.update(dt);
  updateCamera(dt);
  postfx.render();
  hud.render();
  if (firstFrame) {
    firstFrame = false;
    const ld = document.getElementById('loader');
    if (ld) { ld.style.opacity = '0'; setTimeout(() => ld.remove(), 420); }
  }
});

// 供 console 除錯
window.__pb = { game, hud, arena, ball, player, ai, TUNE, renderer, scene, camera };
