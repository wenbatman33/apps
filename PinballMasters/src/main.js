// ===== 入口：renderer / 引擎內畫面流程（標題/選關/劇情/戰鬥/結算/暫停）＋存檔 =====
// 全部 UI 都在 WebGL 內渲染（canvas 紋理 + 平面），不使用 DOM 元素（唯一例外：隱藏的 DEV 面板）
import * as THREE from 'three';
import { Game } from './game.js';
import { STAGES, STAGE_RAMPS, HEROES } from './data.js';
import { AudioSys } from './audio.js';
import { setupDevTool } from './dev.js';
import { UILayer, makeText, makeRect, makeButton, disposeGroup } from './ui.js';
import { PostFX } from './postfx.js';
import { makeEnvMap, loadEnvMap, loadAllPlayfieldArt } from './art.js';
import { TUNE } from './tune.js';

const canvas = document.getElementById('game-canvas');
const SAVE_KEY = 'pinballMasters.save.v2';

// ---- Renderer（單一 WebGL context） ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// 先用程序生成的環境貼圖開場，載到 AI 生成的遊樂場全景後再換上（金屬反射更真實）
let env = makeEnvMap(renderer);
const postfx = new PostFX(renderer);
for (const [k, v] of Object.entries(TUNE.post)) postfx.set(k, v);
const ui = new UILayer(renderer, canvas);

// ---- 存檔 ----
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function save(patch) {
  const s = { ...loadSave(), ...patch };
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  return s;
}

// ---- 選單背景（3D 星空 + 漂浮彈珠） ----
const menuBg = (() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a1a);
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  cam.position.set(0, 0, 14);
  scene.environment = env;
  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0e28, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(4, 6, 8);
  scene.add(dir);
  // 星點
  const starGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 50;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
    pos[i * 3 + 2] = -10 - Math.random() * 30;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8fa7ff, size: 0.12, transparent: true, opacity: 0.8 })));
  // 漂浮英雄彈珠
  const orbs = [];
  HEROES.forEach((h, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 32, 24),
      new THREE.MeshStandardMaterial({
        color: h.color, emissive: h.color, emissiveIntensity: 0.45,
        roughness: 0.12, metalness: 0.95, envMap: env, envMapIntensity: 1.4,
      })
    );
    m.position.set((i - 1.5) * 3.4, -4.5, -4);
    scene.add(m);
    orbs.push({ m, ph: i * 1.7 });
  });
  return { scene, cam, orbs, t: 0 };
})();

// ---- App 狀態 ----
let game = null;
let currentStage = 0;
let screenGroup = null;   // 目前的 UI 畫面群組
let screenName = null;
let lastResult = null;
let pausedOverlay = false;

function clearScreen() {
  if (screenGroup) {
    // 移除畫面上註冊的按鈕
    screenGroup.traverse(o => {
      const i = ui.pressables.indexOf(o);
      if (i >= 0) ui.pressables.splice(i, 1);
    });
    disposeGroup(screenGroup);
    screenGroup = null;
  }
  screenName = null;
}

function showScreen(name, ...args) {
  clearScreen();
  screenName = name;
  if (!name) return;
  screenGroup = BUILDERS[name](...args);
  ui.scene.add(screenGroup);
  if (game?.hud) game.hud.visible = (name === null);
}

// ================= 畫面建構 =================
const GHOST = { fill: 'rgba(255,255,255,.1)', stroke: 'rgba(255,255,255,.3)', glow: null };
const GOLD = { fill: ['#ffcf5e', '#e08b1d'], textColor: '#3a2400', glow: { color: 'rgba(255,180,60,.5)', blur: 16 } };

const BUILDERS = {
  title() {
    const g = new THREE.Group();
    const w = ui.w, h = ui.h;
    const en = makeText({ text: 'PINBALL MASTERS', size: 14, letter: 6, color: '#8fa7ff', order: 5 });
    const title = makeText({
      text: '彈珠達人', size: Math.min(56, w * 0.14), weight: 900, letter: 6,
      gradient: ['#9fd8ff', '#4f7bff', '#c77dff'], shadow: { color: 'rgba(90,140,255,.55)', blur: 18 }, order: 5,
    });
    const sub = makeText({
      text: '三台機檯，每局三顆彈珠。\n拉彈簧發球、點左右控制彈射板。',
      size: 14, weight: 400, color: 'rgba(255,255,255,.8)', order: 5, lineHeight: 1.7,
    });
    const btnStart = makeButton(ui, { ...GOLD, label: '選擇機檯', onTap: () => {
      AudioSys.init(); AudioSys.sfx('ui'); showScreen('stages');
    } });
    const btnSelect = makeButton(ui, { ...GHOST, label: '快速開始', onTap: () => {
      AudioSys.init(); AudioSys.sfx('ui'); startStage(0);
    } });
    const btnSound = makeButton(ui, { ...GHOST, label: AudioSys.enabled ? '🔊 音效：開' : '🔇 音效：關', onTap: () => {
      AudioSys.init();
      AudioSys.setEnabled(!AudioSys.enabled);
      btnSound.userData.label.userData.setText(AudioSys.enabled ? '🔊 音效：開' : '🔇 音效：關');
      if (AudioSys.enabled) AudioSys.sfx('ui');
    } });
    const hint = makeText({
      text: '發球：按住畫面往下拉再放開（PC 可長按 Space）\n彈射板：點住畫面左／右側（PC：← → 鍵）\nD 鍵：開發者微調工具',
      size: 11, weight: 400, color: 'rgba(255,255,255,.45)', lineHeight: 1.9, order: 5,
    });
    en.position.y = h * 0.30;
    title.position.y = h * 0.17;
    sub.position.y = h * 0.02;
    btnStart.position.y = -h * 0.12;
    btnSelect.position.y = -h * 0.12 - 66;
    btnSound.position.y = -h * 0.12 - 132;
    hint.position.y = -h / 2 + 74;
    g.add(en, title, sub, btnStart, btnSelect, btnSound, hint);
    return g;
  },

  // 機檯選擇：三台全部開放，各自顯示主題色與最高分
  stages() {
    const g = new THREE.Group();
    const h = ui.h;
    const s = loadSave();
    const best = s.best ?? {};
    const t = makeText({ text: '選擇機檯', size: 24, letter: 4, order: 5 });
    t.position.y = h * 0.32;
    g.add(t);
    const cw = Math.min(ui.w * 0.92, 380);
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    STAGES.forEach((st, i) => {
      const col = hex(st.theme.main);
      const card = makeButton(ui, {
        w: cw, h: 84, radius: 16, size: 17,
        fill: 'rgba(255,255,255,.06)', stroke: col, glow: { color: col + '66', blur: 12 },
        label: '',
        onTap: () => { AudioSys.init(); AudioSys.sfx('ui'); startStage(i); },
      });
      const emo = makeText({ text: st.bossEmoji, size: 30, order: 5 });
      emo.position.set(-cw / 2 + 34, 0, 0);
      const name = makeText({ text: st.name, size: 19, weight: 900, letter: 2, color: col, order: 5 });
      name.position.set(-cw / 2 + 70 + name.geometry.parameters.width / 2, 16, 0);
      const sub = makeText({ text: st.sub, size: 13, weight: 400, color: 'rgba(255,255,255,.75)', order: 5 });
      sub.position.set(-cw / 2 + 70 + sub.geometry.parameters.width / 2, -6, 0);
      const info = makeText({
        text: `軌道 ×${STAGE_RAMPS[i].length}　彈射器 ×${st.bumpers.length}　靶 ×${st.targets.length}`,
        size: 10, weight: 400, color: 'rgba(255,255,255,.5)', order: 5,
      });
      info.position.set(-cw / 2 + 70 + info.geometry.parameters.width / 2, -26, 0);
      card.add(emo, name, sub, info);
      if (best[i]) {
        const b = makeText({ text: `BEST\n${best[i].toLocaleString()}`, size: 11, color: '#ffd75e', lineHeight: 1.5, order: 5 });
        b.position.set(cw / 2 - b.geometry.parameters.width / 2 - 14, 0, 0);
        card.add(b);
      }
      card.position.y = h * 0.32 - 78 - i * 100;
      g.add(card);
    });
    const back = makeButton(ui, { ...GHOST, label: '返回', w: 160, onTap: () => { AudioSys.sfx('ui'); showScreen('title'); } });
    back.position.y = h * 0.32 - 78 - STAGES.length * 100 - 10;
    g.add(back);
    return g;
  },

  result() {
    const { win, score } = lastResult;
    const g = new THREE.Group();
    const w = ui.w, h = ui.h;
    const dim = makeRect({ w: w + 4, h: h + 4, fill: 'rgba(5,7,20,.82)', radius: 0, order: 4 });
    const title = makeText({
      text: win ? 'VICTORY' : 'DEFEAT', size: 46, weight: 900, letter: 6,
      color: win ? '#ffd75e' : '#8fa7ff',
      shadow: { color: win ? 'rgba(255,190,60,.8)' : 'rgba(90,120,255,.6)', blur: 22 }, order: 5,
    });
    title.position.y = h * 0.22;
    const bestNow = (loadSave().best ?? {})[currentStage] ?? 0;
    const starText = makeText({
      text: score >= bestNow ? '★ NEW BEST ★' : `BEST ${bestNow.toLocaleString()}`,
      size: 18, color: '#ffd75e', letter: 3, order: 5,
      shadow: { color: 'rgba(255,190,60,.6)', blur: 12 },
    });
    starText.position.y = h * 0.12;
    const scoreText = makeText({ text: `總分 ${score.toLocaleString()}`, size: 18, color: 'rgba(255,255,255,.9)', order: 5 });
    scoreText.position.y = h * 0.04;
    g.add(dim, title, starText, scoreText);
    let y = -h * 0.08;
    if (win && currentStage < STAGES.length - 1) {
      const next = makeButton(ui, { ...GOLD, label: '下一章 ➤', onTap: () => { AudioSys.sfx('ui'); startStage(currentStage + 1); } });
      next.position.y = y; y -= 66;
      g.add(next);
    }
    const retry = makeButton(ui, { label: win ? '再次挑戰' : '再挑戰一次', onTap: () => { AudioSys.sfx('ui'); startStage(currentStage, true); } });
    retry.position.y = y; y -= 66;
    const menu = makeButton(ui, { ...GHOST, label: '回主選單', onTap: () => { AudioSys.sfx('ui'); backToMenu(); } });
    menu.position.y = y;
    g.add(retry, menu);
    return g;
  },

  pause() {
    const g = new THREE.Group();
    const w = ui.w, h = ui.h;
    const dim = makeRect({ w: w + 4, h: h + 4, fill: 'rgba(5,7,20,.7)', radius: 0, order: 4 });
    const t = makeText({ text: '暫停中', size: 26, letter: 4, order: 5 });
    t.position.y = h * 0.14;
    const resume = makeButton(ui, { label: '繼續遊戲', onTap: () => { AudioSys.sfx('ui'); resumeGame(); } });
    const retry = makeButton(ui, { ...GHOST, label: '重新開始本章', onTap: () => { AudioSys.sfx('ui'); pausedOverlay = false; startStage(currentStage, true); } });
    const menu = makeButton(ui, { ...GHOST, label: '回主選單', onTap: () => { AudioSys.sfx('ui'); pausedOverlay = false; backToMenu(); } });
    resume.position.y = 10; retry.position.y = -56; menu.position.y = -122;
    g.add(dim, t, resume, retry, menu);
    return g;
  },
};

// ================= 遊戲流程 =================
const app = {
  renderer, canvas, ui, env, postfx, playfieldArts: [null, null, null],
  onPause: () => { if (!game || pausedOverlay) return; game.paused = true; pausedOverlay = true; showScreen('pause'); if (game.hud) game.hud.visible = false; },
};

// 預載三張檯面插畫（缺檔時該章維持 null，改用程序繪製的檯面）
// 開檯前會等這個 promise，避免圖還沒載完就建好檯面
const artsReady = Promise.all([
  loadAllPlayfieldArt(STAGES).then(imgs => { app.playfieldArts = imgs; }),
  loadEnvMap(renderer).then(e => {
    env = e;
    app.env = e;
    menuBg.scene.environment = e;
  }),
]);

function startStage(idx) {
  currentStage = idx;
  pausedOverlay = false;
  (async () => {
    await artsReady;
    game?.dispose();
    game = new Game(app, idx, onGameEnd);
    devTool.showButton(true);
    showScreen(null);
  })();
}

function onGameEnd(win, score, stars) {
  devTool.showButton(false);
  lastResult = { win, score, stars };
  if (game?.hud) game.hud.visible = false;
  // 記錄每台機檯的最高分
  const s = loadSave();
  const best = { ...(s.best ?? {}) };
  best[currentStage] = Math.max(best[currentStage] ?? 0, score);
  save({ best });
  showScreen('result');
}

function resumeGame() {
  pausedOverlay = false;
  showScreen(null);
  if (game) { game.paused = false; if (game.hud) game.hud.visible = true; }
}

function backToMenu() {
  AudioSys.stopBgm();
  game?.dispose(); game = null;
  devTool.showButton(false);
  showScreen('title');
}

// ================= 輸入路由 =================
canvas.addEventListener('pointerdown', (e) => {
  AudioSys.init();
  if (ui.pointerDown(e.clientX, e.clientY)) return;
  if (screenName === null && game && !game.paused) game.pointerDown(e);
});
window.addEventListener('pointermove', (e) => {
  if (screenName === null && game && !game.paused) game.pointerMove(e);
});
window.addEventListener('pointerup', (e) => {
  if (ui.pointerUp(e.clientX, e.clientY)) return;
  if (screenName === null && game && !game.paused) game.pointerUp(e);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && game) { pausedOverlay ? resumeGame() : app.onPause(); return; }
  if (screenName === null && game && !game.paused) game.keyDown(e);
});
window.addEventListener('keyup', (e) => {
  if (screenName === null && game && !game.paused) game.keyUp(e);
});
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// ================= 主迴圈 =================
const clock = new THREE.Clock();
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  postfx.setSize(w, h);
  ui.resize(w, h);
  menuBg.cam.aspect = w / h;
  menuBg.cam.updateProjectionMatrix();
  game?.resize();
  // 重建目前畫面以套用新尺寸
  if (screenName) showScreen(screenName);
}
window.addEventListener('resize', resize);
resize();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (game) {
    if (!game.paused) game.update(dt);
    game.render(dt); // 內部走 postfx
  } else {
    // 選單背景動畫（同樣經過後製，維持一致的畫面調性）
    menuBg.t += dt;
    for (const o of menuBg.orbs) {
      o.m.position.y = -4.5 + Math.sin(menuBg.t * 0.8 + o.ph) * 0.5;
      o.m.rotation.y += dt * 0.5;
    }
    menuBg.cam.position.x = Math.sin(menuBg.t * 0.12) * 0.6;
    menuBg.cam.lookAt(0, -1, -5);
    postfx.render((target) => {
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(menuBg.scene, menuBg.cam);
    });
  }
  renderer.setRenderTarget(null);
  ui.render();
}
loop();

// ---- DEV 工具（隱藏的開發面板，非遊戲 UI） ----
const devTool = setupDevTool(() => game, postfx);

// 開發用除錯掛載點
window.__PM = {
  get game() { return game; },
  get screen() { return screenName; },
  ui, postfx, TUNE,
};

showScreen('title');
