// 長時間穩定性：檢查物件陣列不會無限膨脹、效能不衰退
globalThis.matchMedia = () => ({ matches: false });
globalThis.window = { addEventListener() {} };
const { World } = await import('../src/core/world.js');
const world = new World();
const p = world.spawnPlayer('soak');
const dt = 1 / 60;
const marks = [];
let t0 = performance.now();
for (let i = 0; i < 60 * 300; i++) {   // 5 分鐘
  if (p.dead) { const [x, y] = world.safeSpawn(); p.dead = false; p.mass = 20; p.x = x; p.y = y; p.path.length = 0; for (let k = 60; k >= 0; k--) p.path.push(x, y); }
  p.targetAngle = Math.sin(i / 77) * 3;
  world.update(dt);
  if (i % (60 * 60) === 0) {
    marks.push({
      min: i / 3600, foodArr: world.food.length, foodAlive: world.food.filter((f) => f.alive).length,
      snakeArr: world.snakes.length, pathSum: world.snakes.reduce((a, s) => a + s.path.length, 0),
      ms: +(performance.now() - t0).toFixed(0),
    });
    t0 = performance.now();
  }
}
console.table(marks);
const rss = (process.memoryUsage().heapUsed / 1048576).toFixed(1);
console.log('heap', rss, 'MB');
