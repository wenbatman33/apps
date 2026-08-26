import { Application, Assets } from '../vendor/pixi.min.mjs';
import { Engine } from './core/engine.js';
import { Game } from './core/game.js';
import { Bots } from './core/bots.js';
import { Sfx } from './audio/sfx.js';
import { Scene } from './view/scene.js';
import { planeFallback } from './view/textures.js';

async function boot() {
  const app = new Application();
  await app.init({
    background: 0x0b0b0f,
    resizeTo: window,
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    preference: 'webgl',
  });
  document.getElementById('game').appendChild(app.canvas);

  // AI 产生的飞机素材；若不存在则用程序绘制版本
  let planeTexture = null;
  try {
    planeTexture = await Assets.load('assets/images/plane.png');
  } catch {
    planeTexture = planeFallback();
  }

  const engine = new Engine();
  const game = new Game(engine);
  const bots = new Bots();
  const sfx = new Sfx();
  const scene = new Scene(app, engine, game, bots, sfx, planeTexture);
  app.stage.addChild(scene);

  const unlock = () => { sfx.init(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  let raf = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => scene.relayout());
  });
  window.addEventListener('orientationchange', () => setTimeout(() => scene.relayout(), 250));

  app.ticker.add((t) => scene.update(Math.min(50, t.deltaMS)));

  document.getElementById('loading')?.remove();
  window.__aviator = { app, engine, game, bots, scene };
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('loading');
  if (el) el.innerHTML = `<span style="color:#ff5c74">加载失败：${e.message}</span>`;
});
