// 無瀏覽器的世界模擬測試：驗證成長、AI、碰撞、效能都正常
globalThis.matchMedia = () => ({ matches: false });
globalThis.window = { addEventListener() {} };
const { World } = await import('../src/core/world.js');
const { WORLD } = await import('../src/config.js');

const world = new World();
const p = world.spawnPlayer('測試員');
const dt = 1 / 60;
let t0 = performance.now();
let deaths = 0, playerDeaths = 0;
world.events.onDeath = (s) => { deaths++; if (s.isPlayer) playerDeaths++; };

const stats = [];
for (let i = 0; i < 60 * 60; i++) {           // 模擬 60 秒
  if (p.dead) { const [rx, ry] = world.safeSpawn(); p.dead = false; p.mass = 20; p.x = rx; p.y = ry; p.path.length = 0; for (let k = 60; k >= 0; k--) p.path.push(rx, ry); }
  p.targetAngle = Math.sin(i / 90) * 3;        // 玩家繞圈亂走
  p.boosting = i % 300 < 60 && p.mass > 30;
  world.update(dt);
  if (i % 600 === 0) {
    const alive = world.snakes.filter((s) => !s.dead);
    stats.push({
      sec: (i / 60) | 0,
      snakes: alive.length,
      maxMass: Math.round(Math.max(...alive.map((s) => s.mass))),
      avgMass: Math.round(alive.reduce((a, s) => a + s.mass, 0) / alive.length),
      food: world.food.filter((f) => f.alive).length,
      pathMax: Math.max(...alive.map((s) => s.path.length / 2)),
    });
  }
}
const ms = performance.now() - t0;

const bad = [];
for (const s of world.snakes) {
  if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.mass)) bad.push(s.name);
  if (Math.hypot(s.x, s.y) > WORLD.radius + 50 && !s.dead) bad.push(s.name + '(出界)');
}

console.log('模擬 3600 幀耗時', ms.toFixed(0), 'ms →', (ms / 3600).toFixed(3), 'ms/幀（純邏輯）');
console.table(stats);
console.log('死亡次數', deaths, '玩家死亡', playerDeaths);
console.log('異常蛇', bad.length ? bad : '無');
console.log('排行榜', world.board.slice(0, 5).map((s) => `${s.name}:${s.score}`).join(' | '));
