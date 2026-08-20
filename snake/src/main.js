import { Application } from '../vendor/pixi.min.mjs';
import { buildTextures } from './view/textures.js';
import { Renderer } from './view/renderer.js';
import { HUD } from './view/hud.js';
import { Menu } from './view/menu.js';
import { Input } from './input/controls.js';
import { LocalTransport } from './net/transport.js';
import { TUNING, WORLD, LAYOUT, IS_TOUCH } from './config.js';
import { saveScore } from './store/leaderboard.js';
import { SFX, unlockAudio } from './audio/sfx.js';
import { createDevTools } from './dev/devtools.js';

const app = new Application();
await app.init({
  background: '#050a18',
  resizeTo: window,
  antialias: true,
  resolution: Math.min(devicePixelRatio || 1, 2),
  autoDensity: true,
  powerPreference: 'high-performance',
});
document.getElementById('game').appendChild(app.canvas);
document.getElementById('loading')?.remove();

buildTextures();

const transport = new LocalTransport();
const world = transport.world;
const renderer = new Renderer(app);
const hud = new HUD(app);
const input = new Input(app, hud);
const menu = new Menu(app, startGame);

let state = 'menu';       // menu | playing | dying
let playerStart = 0;
let maxMass = 0;
let deathTimer = 0;
let spectate = null;      // 選單時鏡頭跟著的 AI 蛇

hud.root.visible = false;
menu.showStart();
renderer.cam.zoom = 0.7;

// 世界事件 → 音效 / 特效 / 結算
world.events.onEat = () => SFX.eat();
world.events.onDeath = (s, killer) => {
  renderer.burst(s.x, s.y, s.skin[0], s.isPlayer ? 34 : 16, s.isPlayer ? 1.6 : 1);
  if (s.isPlayer) {
    SFX.die();
    state = 'dying';
    deathTimer = 1.1;
    input.enabled = false;
  } else if (killer && killer.isPlayer) {
    SFX.kill();
    hud.toast(`擊殺 ${s.name}！`, 0x7dff9a);
  }
  if (s === spectate) spectate = null;
};

function startGame(name) {
  // 重開：清掉舊的玩家蛇再生一條
  if (world.player) {
    world.player.dead = true;
    world.snakes = world.snakes.filter((s) => s !== world.player);
  }
  renderer.cleanupLabels(world);
  const p = world.spawnPlayer(name);
  renderer.cam.x = p.x; renderer.cam.y = p.y;
  playerStart = world.time;
  maxMass = p.mass;
  state = 'playing';
  input.enabled = true;
  input.angle = p.angle;
  hud.root.visible = true;
  hud.layout();
}

function finishGame() {
  const p = world.player;
  const all = world.snakes.filter((s) => !s.dead || s === p).sort((a, b) => b.mass - a.mass);
  const rank = all.indexOf(p) + 1;
  const score = Math.floor(maxMass * 10);
  const recordRank = saveScore(p.name, score, p.kills, world.time - playerStart);
  hud.root.visible = false;
  menu.showGameOver({
    score,
    length: Math.floor(maxMass),
    kills: p.kills,
    rank: rank || all.length,
    total: all.length,
    time: Math.round(world.time - playerStart),
    recordRank: recordRank < 0 || recordRank > 9 ? -1 : recordRank,
  });
  state = 'menu';
}

input.onQuit = () => {
  if (state !== 'playing' || !world.player || world.player.dead) return;
  world.kill(world.player, null);   // 中途離開＝結束本局，照常結算
};

const dev = createDevTools({
  app, world, hud, renderer,
  restart: () => startGame(world.player?.name || '玩家'),
  onResize: () => { hud.layout(); menu.layout(); },
  onTune: () => { renderer.drawBorder(); },
});

addEventListener('resize', () => {
  renderer.resize(); hud.layout(); menu.layout();
});
addEventListener('pointerdown', unlockAudio, { once: true });

let boostSfxTimer = 0;

app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 0.05);

  input.update(dt);
  if (state === 'playing') transport.sendInput(input.angle, input.boosting);
  transport.tick(dt);

  const p = world.player;
  if (state === 'playing' && p && !p.dead) {
    if (p.mass > maxMass) maxMass = p.mass;
    if (input.boosting && p.canBoost()) {
      boostSfxTimer -= dt;
      if (boostSfxTimer <= 0) { SFX.boost(); boostSfxTimer = 0.22; }
    }
  }

  // 相機：遊玩時跟玩家；選單時緩慢跟著場上最大的一條蛇當背景
  let target = p && !p.dead ? p : null;
  if (!target && state === 'dying') target = null;   // 死亡瞬間鏡頭留在原地
  if (!target && state !== 'dying') {
    if (!spectate || spectate.dead) spectate = world.board[0] || world.snakes.find((s) => !s.dead);
    target = spectate;
  }
  if (target) {
    const mobileK = IS_TOUCH ? 0.84 : 1;   // 手機直向視野窄，鏡頭拉遠一些
    const zoom = Math.max(TUNING.cameraZoomMin, TUNING.cameraZoomBase / (1 + target.mass * TUNING.cameraZoomFalloff)) * mobileK;
    const k = Math.min(1, TUNING.cameraLerp * dt * 60);
    renderer.cam.x += (target.x - renderer.cam.x) * k;
    renderer.cam.y += (target.y - renderer.cam.y) * k;
    renderer.cam.zoom += (zoom * (state === 'playing' ? 1 : 0.82) - renderer.cam.zoom) * Math.min(1, dt * 2.2);
  }

  renderer.update(world, dt);
  if (hud.root.visible) hud.update(world, dt, input);
  menu.update(dt);

  if (state === 'dying') {
    deathTimer -= dt;
    if (deathTimer <= 0) finishGame();
  }
  if ((app.ticker.lastTime | 0) % 997 === 0) renderer.cleanupLabels(world);
});

// 給 console 除錯用
window.GAME = { app, world, renderer, hud, input, menu, dev, TUNING, WORLD, LAYOUT };
