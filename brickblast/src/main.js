// 進入點：場景管理、遊戲迴圈、事件串接
import * as PIXI from '../vendor/pixi.min.mjs';
import { WORLD, LAYOUT, LAYOUT_PC, LAYOUT_MOBILE, RULES, GRID, THEME, TOTAL_LEVELS, applyLayout } from './config.js';
import { Game, PHASE, cellX, cellY } from './core/game.js';
import { T } from './core/level.js';
import { Renderer } from './view/renderer.js';
import { HUD } from './view/hud.js';
import { Menu } from './view/menu.js';
import { Leaderboard } from './view/leaderboard.js';
import { AimInput } from './input/aim.js';
import { DevTools } from './dev/devtools.js';
import * as SFX from './audio/sfx.js';
import { getSave, recordWin, addBroken, setMutedSave, unlocked, resetProgress, checkRecords } from './store/save.js';

const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);

applyLayout(isMobile ? LAYOUT_MOBILE : LAYOUT_PC);

const app = new PIXI.Application();

await app.init({
  resizeTo: window,
  antialias: true,
  background: 0x05060f,
  resolution: Math.min(2, window.devicePixelRatio || 1),
  autoDensity: true,
  powerPreference: 'high-performance',
});
document.getElementById('game').appendChild(app.canvas);

const renderer = new Renderer(app);

let game = null;
let scene = 'menu';
let lastRecords = null;   // 本次過關刷新了哪些個人紀錄
let timeScale = 1;
let hitBudget = 0;

// ---- 特效與音效串接 ----
function cellCenter(r, c) {
  return { x: cellX(c) + GRID.CELL / 2, y: cellY(r) + GRID.CELL / 2 };
}

const events = {
  onFire() { SFX.sfxFire(); },

  onHit(r, c, cell, cause, ball) {
    if (hitBudget <= 0) return;
    hitBudget--;
    const p = ball ? { x: ball.x, y: ball.y } : cellCenter(r, c);
    renderer.fx.emit(p.x, p.y, 1, renderer.accent, { speed: 150, life: 0.18, size: 0.45, grav: 300 });
    if (cause === 'ball') SFX.sfxHit();
  },

  onBreak(r, c) {
    const p = cellCenter(r, c);
    renderer.fx.emit(p.x, p.y, 4, renderer.accent, { speed: 220, life: 0.4, size: 0.6 });
    renderer.fx.addShake(0.8);
    SFX.sfxBreak();
  },

  // 雷射：整行與整列一次清掉
  onLaser(r, c) {
    const p = cellCenter(r, c);
    const W = GRID.COLS * GRID.CELL;
    const H = GRID.ROWS * GRID.CELL;
    renderer.fx.emit(p.x, p.y, 16, 0xfacc15, { speed: 340, life: 0.45, size: 0.8 });
    renderer.fx.wave(p.x, p.y, 0xfacc15, 200, 0.35);
    renderer.fx.laserFlash(LAYOUT.playLeft, p.y, W, 18, 0xfacc15);
    renderer.fx.laserFlash(p.x - GRID.CELL / 2, LAYOUT.playTop, 18, H, 0xfacc15, true);
    renderer.fx.addShake(5);
    SFX.sfxLaser();
  },

  // 球數 ×3
  onMulti(r, c, total) {
    const p = cellCenter(r, c);
    renderer.fx.emit(p.x, p.y, 20, 0xc084fc, { speed: 300, life: 0.5, size: 0.8 });
    renderer.fx.wave(p.x, p.y, 0xc084fc, 240, 0.4);
    renderer.fx.addShake(4);
    SFX.sfxMulti();
  },

  onPlus(r, c, total) {
    const p = cellCenter(r, c);
    renderer.fx.emit(p.x, p.y, 8, 0x9dff6b, { speed: 220, life: 0.4, size: 0.6 });
    SFX.sfxPlus();
  },

  onLand(b) {
    if (hitBudget <= 0) return;
    hitBudget--;
    renderer.fx.emit(b.x, LAYOUT.launchY, 1, renderer.accent, { speed: 110, life: 0.16, size: 0.35, angle: -Math.PI / 2, spread: 1.4, grav: 320 });
  },

  onRecall() {
    renderer.fx.wave(game.launchX, LAYOUT.launchY, renderer.accent, 130, 0.3);
  },

  onTurn() {
    SFX.sfxTurn();
    renderer.fx.addShake(1.2);
  },

  onWin(stars, stats, score) {
    SFX.sfxWin();
    addBroken(stats.broken);
    // 先比對是否刷新紀錄，再寫入存檔
    lastRecords = checkRecords(game.def.level, score, stats.shots, stats.ballsFired);
    recordWin(game.def.level, stars, score, stats.shots, stats.ballsFired);
    renderer.fx.addShake(6);
    setTimeout(() => showResult(true), 620);
  },

  onLose(stats) {
    SFX.sfxLose();
    addBroken(stats.broken);
    lastRecords = null;
    renderer.fx.addShake(8);
    setTimeout(() => showResult(false), 520);
  },
};

// ---- HUD / 選單 ----
const hud = new HUD(renderer.world, {
  onBack: () => { SFX.sfxTap(); toMenu(); },
  onSound: () => {
    const m = !SFX.isMuted();
    SFX.setMuted(m); setMutedSave(m); hud.setSoundIcon(m);
  },
  onSpeed: () => {
    timeScale = timeScale >= 3 ? 1 : 3;
    hud.setSpeedIcon(timeScale);
    SFX.sfxTap();
  },
  onRecall: () => { doRecall(); },
});

// 一鍵收球（按鈕或 R 鍵）
function doRecall() {
  if (!game || !game.recall()) return;
  SFX.sfxTap();
}
window.addEventListener('keydown', (e) => {
  if (scene !== 'game' || !game) return;
  if (e.key === 'r' || e.key === 'R') doRecall();
});
hud.setVisible(false);

const menu = new Menu(renderer.world, {
  onPlay: (lv) => { SFX.resumeAudio(); SFX.sfxTap(); startLevel(lv); },
  onLocked: () => SFX.sfxTap(),
  onRanking: () => { SFX.sfxTap(); toRanking(); },
});

const leaderboard = new Leaderboard(renderer.world, {
  onBack: () => { SFX.sfxTap(); toMenu(); },
});

function showResult(win) {
  hud.showResult({
    win,
    level: game.def.level,
    stars: game.resultStars,
    stats: game.stats,
    score: game.score,
    records: lastRecords,
    accent: THEME.accent,
    onNext: () => { SFX.sfxTap(); startLevel(Math.min(TOTAL_LEVELS, game.def.level + 1)); },
    onRetry: () => { SFX.sfxTap(); startLevel(game.def.level); },
    onMenu: () => { SFX.sfxTap(); toMenu(); },
  });
}

function startLevel(lv) {
  hud.hideResult();
  renderer.clearFx();
  timeScale = 1;
  hud.setSpeedIcon(1);
  game = new Game(lv, events);
  renderer.setTheme(THEME);
  hud.setLevel(game.def);
  hud.layout();
  hud.setVisible(true);
  menu.setVisible(false);
  leaderboard.setVisible(false);
  scene = 'game';
  renderer.drawAim(game, null);
}

function toRanking() {
  scene = 'ranking';
  hud.setVisible(false);
  menu.setVisible(false);
  leaderboard.setVisible(true);
  leaderboard.viewScale = renderer.viewScale;
  renderer.clearFx();
  app.renderer.background.color = 0x05060f;
}

function toMenu() {
  scene = 'menu';
  hud.setVisible(false);
  leaderboard.setVisible(false);
  menu.setVisible(true);
  renderer.clearFx();
  app.renderer.background.color = 0x05060f;
  renderer.drawAim(null, null);
}

// ---- 輸入 ----
const input = new AimInput(app.canvas, renderer, {
  canAim: () => scene === 'game' && game && game.phase === PHASE.AIM,
  origin: () => ({ x: game.launchX, y: LAYOUT.launchY }),
  onAim: (v) => {
    if (!v) { renderer.drawAim(game, null); return null; }
    const dir = game.aim(v.x, v.y);
    renderer.drawAim(game, dir);
    return dir;
  },
  onFire: () => {
    SFX.resumeAudio();
    game.fire();
    renderer.drawAim(game, null);
  },
  onCancel: () => renderer.drawAim(game, null),
  // 點在 UI 元件上時不進入瞄準（避免點按鈕誤發射）
  blocked: (x, y) => {
    const b = app.renderer.events.rootBoundary;
    const hit = b.hitTest(x, y);
    return !!(hit && hit !== app.stage);
  },
});

// ---- DEV 工具 ----
const dev = new DevTools({
  onLayoutChange: () => {
    renderer.redrawFrame();
    renderer.buildBrickViewsPositions?.();
    hud.layout();
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const v = renderer.brickViews[r][c];
        v.cont.x = cellX(c) + GRID.CELL / 2;
        v.cont.y = cellY(r) + GRID.CELL / 2;
      }
    }
  },
  addBalls: (n) => { if (game) game.ballsTotal = Math.min(RULES.maxBalls, game.ballsTotal + n); },
  clearBoard: () => {
    if (!game) return;
    for (let r = 0; r < GRID.ROWS; r++) game.grid[r] = new Array(GRID.COLS).fill(null);
  },
  forceWin: () => { if (game) { game.turn = game.def.waves; game.win(); } },
  forceLose: () => { if (game) game.lose(); },
  jump: (d) => { if (game) startLevel(Math.max(1, Math.min(TOTAL_LEVELS, game.def.level + d))); },
  goto: (n) => startLevel(n),
  unlockAll: () => { getSave().unlocked = TOTAL_LEVELS; menu.refresh(); },
  resetAll: () => { resetProgress(); menu.refresh(); },
  stress: (n) => {
    if (!game) return;
    game.ballsTotal = n;
    game.aim(0.35, -1);
    game.fire();
  },
});

// ---- 尺寸 ----
function onResize() {
  const w = app.screen.width;
  const h = app.screen.height;
  renderer.resize(w, h);
  menu.viewScale = renderer.viewScale;
  leaderboard.viewScale = renderer.viewScale;
}
app.renderer.on('resize', onResize);
onResize();

// ---- 主迴圈 ----
let fpsAcc = 0, fpsFrames = 0, fpsShown = 60, tAcc = 0;

app.ticker.add((ticker) => {
  const dt = Math.min(0.05, ticker.deltaMS / 1000);
  tAcc += dt;
  hitBudget = 14;   // 每幀特效預算，球多時自動節流

  renderer.fx.update(dt);

  if (scene === 'menu') {
    menu.update(dt);
    renderer.root.x = 0; renderer.root.y = 0;
  } else if (scene === 'ranking') {
    leaderboard.update(dt);
    renderer.root.x = 0; renderer.root.y = 0;
  } else if (game) {
    // 加速模式以多次固定步進推進，避免大 dt 造成穿透
    const steps = timeScale > 1 ? timeScale : 1;
    for (let i = 0; i < steps; i++) game.update(dt);
    renderer.update(dt, game, tAcc);
    hud.update(game);
  }

  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.5) {
    fpsShown = Math.round(fpsFrames / fpsAcc);
    fpsAcc = 0; fpsFrames = 0;
    dev.setFps(fpsShown, game ? game.balls.length : 0);
  }
});

// ---- 啟動 ----
SFX.initAudio();
SFX.setMuted(getSave().muted);
hud.setSoundIcon(getSave().muted);
menu.setVisible(true);
onResize();

const ld = document.getElementById('loading');
ld.classList.add('hide');
setTimeout(() => ld.remove(), 500);

window.addEventListener('pointerdown', () => SFX.resumeAudio(), { once: true });
window.BB = { game: () => game, startLevel, renderer, menu, app };
