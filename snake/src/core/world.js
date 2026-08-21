import { WORLD, TUNING, SKINS, BOT_NAMES } from '../config.js';
import { Snake } from './snake.js';
import { botThink } from './bot.js';
import { UniformGrid } from './spatial.js';

const FOOD_COLORS = [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xea80fc, 0xffffff, 0xff8a65];
const tmp = { x: 0, y: 0 };

// 世界模擬：蛇、食物、碰撞、死亡與重生。純資料層，不碰任何渲染
export class World {
  constructor() {
    this.snakes = [];
    this.food = [];
    this.foodPool = [];
    this.bodyGrid = new UniformGrid(WORLD.gridCell);
    this.foodGrid = new UniformGrid(WORLD.gridCell);
    this.nextId = 1;
    this.player = null;
    this.time = 0;
    this.board = [];
    this._boardTimer = 0;
    this.events = { onDeath: null, onEat: null, onKill: null };
    for (let i = 0; i < WORLD.foodCount; i++) this.spawnFood(...this.activePoint(0), 1 + Math.random() * 1.5);
    for (let i = 0; i < WORLD.botCount; i++) this.spawnBot();
  }

  randomPoint() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (WORLD.radius - 120);
    return [Math.cos(a) * r, Math.sin(a) * r];
  }

  // 活躍區中心：跟著玩家跑；玩家不在（選單／死亡）時退回世界原點
  focus() {
    const p = this.player;
    return (p && !p.dead) ? p : { x: 0, y: 0 };
  }

  // 在活躍區內取一點（環狀分布，min~max 為距焦點的距離）
  // 預設 min = spawnMinDist：一律生在畫面外，玩家不會看到東西憑空出現
  activePoint(min = WORLD.spawnMinDist, max = WORLD.activeRadius) {
    const f = this.focus();
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(min * min + Math.random() * (max * max - min * min));
    const lim = WORLD.radius - 140;
    let x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r;
    // 超出世界邊界就往內夾回來
    const d = Math.hypot(x, y);
    if (d > lim) { x = x / d * lim; y = y / d * lim; }
    return [x, y];
  }

  spawnFood(x, y, v = 1, color = -1) {
    let f = this.foodPool.pop();
    if (!f) { f = { x: 0, y: 0, v: 1, c: 0, alive: true, eater: null, pulse: 0 }; this.food.push(f); }
    f.x = x; f.y = y; f.v = v; f.alive = true; f.eater = null;
    f.pulse = Math.random() * 6.28;
    f.c = color >= 0 ? color : FOOD_COLORS[(Math.random() * FOOD_COLORS.length) | 0];
    return f;
  }
  killFood(f) { if (!f.alive) return; f.alive = false; f.eater = null; this.foodPool.push(f); }

  // 出生點：在玩家周圍的活躍區內，且盡量遠離其他蛇（試 30 次取最佳）
  safeSpawn(min = 260, max = WORLD.activeRadius) {
    let best = null, bestD = -1;
    for (let i = 0; i < 30; i++) {
      const [x, y] = this.activePoint(min, max);
      let near = 1e9;
      for (const s of this.snakes) {
        if (s.dead) continue;
        near = Math.min(near, Math.hypot(s.x - x, s.y - y));
      }
      if (near > bestD) { bestD = near; best = [x, y]; }
      if (near > 700) break;
    }
    return best;
  }

  spawnPlayer(name) {
    const [x, y] = this.safeSpawn(0, 700);
    const s = new Snake({
      id: this.nextId++, name: name || '玩家', isPlayer: true,
      skin: SKINS[0], x, y, mass: TUNING.startMass,
    });
    this.snakes.push(s); this.player = s;
    return s;
  }

  spawnBot() {
    const [x, y] = this.safeSpawn(WORLD.spawnMinDist, WORLD.activeRadius);   // 一律在畫面外上線
    const s = new Snake({
      id: this.nextId++, isBot: true,
      name: BOT_NAMES[(Math.random() * BOT_NAMES.length) | 0],
      skin: SKINS[1 + ((Math.random() * (SKINS.length - 1)) | 0)],
      x, y, mass: TUNING.startMass + Math.random() * 90,
    });
    this.snakes.push(s);
    return s;
  }

  update(dt) {
    this.time += dt;
    // 1) AI 決策
    for (const s of this.snakes) if (s.isBot && !s.dead) botThink(s, this, dt);

    // 2) 移動
    const drop = (x, y, v) => this.spawnFood(x, y, v);
    for (const s of this.snakes) if (!s.dead) s.update(dt, drop);

    // 3) 重建空間網格（碰撞用；身體每 2 節取樣一個碰撞點即可覆蓋）
    this.bodyGrid.clear();
    for (const s of this.snakes) {
      if (s.dead) continue;
      const n = s.activeSegCount, r = s.radius;
      for (let i = 2; i < n; i += 2) {
        s.segPos(i, tmp);
        this.bodyGrid.insert(tmp.x, tmp.y, { s, x: tmp.x, y: tmp.y, r });
      }
    }
    this.foodGrid.clear();
    for (const f of this.food) if (f.alive) this.foodGrid.insert(f.x, f.y, f);

    // 4a) 頭對頭：兩顆頭撞在一起 → 大的吃掉小的，勢均力敵則同歸於盡
    const list = this.snakes;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const need = (a.radius + b.radius) * 0.92;
        if (dx * dx + dy * dy > need * need) continue;
        const edge = TUNING.headOnMassEdge;
        if (a.mass > b.mass * edge) this.kill(b, a);
        else if (b.mass > a.mass * edge) this.kill(a, b);
        else { this.kill(a, b); this.kill(b, a); }
        if (a.dead) break;
      }
    }

    // 4b) 碰撞：頭撞到別條蛇的身體 → 死亡
    for (const s of this.snakes) {
      if (s.dead) continue;
      const hr = s.radius * 0.86;
      let killer = null;
      this.bodyGrid.query(s.x, s.y, hr + TUNING.maxRadius, (n) => {
        if (killer || n.s === s || n.s.dead) return;
        const d = Math.hypot(n.x - s.x, n.y - s.y);
        if (d < hr + n.r * 0.88) killer = n.s;
      });
      if (killer) { this.kill(s, killer); continue; }
      // 撞牆同樣死亡
      if (Math.hypot(s.x, s.y) > WORLD.radius) this.kill(s, null);
    }

    // 5) 吃食物（含吸附動畫）
    for (const s of this.snakes) {
      if (s.dead) continue;
      const reach = s.radius + TUNING.foodMagnet;
      this.foodGrid.query(s.x, s.y, reach, (f) => {
        if (!f.alive) return;
        if (!f.eater) {
          if (Math.hypot(f.x - s.x, f.y - s.y) < reach) f.eater = s;
        }
      });
    }
    for (const f of this.food) {
      if (!f.alive || !f.eater) continue;
      const s = f.eater;
      if (s.dead) { f.eater = null; continue; }
      const dx = s.x - f.x, dy = s.y - f.y, d = Math.hypot(dx, dy) + 0.001;
      const step = TUNING.eatSpeed * dt;
      if (d <= step + s.radius * 0.4) {
        s.mass += f.v * TUNING.foodValue;
        this.killFood(f);
        if (s.isPlayer) this.events.onEat?.(f);
      } else { f.x += dx / d * step; f.y += dy / d * step; }
    }

    // 6) 活躍區串流：回收離玩家太遠的食物與 bot，再補回玩家周圍
    //    世界本身極大（跑不到邊），但模擬量固定，所以怎麼跑都保持一樣熱鬧
    const streaming = this.player && !this.player.dead;
    const fx = this.player?.x ?? 0, fy = this.player?.y ?? 0;
    const far = WORLD.despawnRadius * WORLD.despawnRadius;
    let alive = 0;
    for (const f of this.food) {
      if (!f.alive) continue;
      if (streaming && !f.eater) {
        const dx = f.x - fx, dy = f.y - fy;
        if (dx * dx + dy * dy > far) { this.killFood(f); continue; }
      }
      alive++;
    }
    for (let i = alive; i < WORLD.foodCount; i++) this.spawnFood(...this.activePoint(), 1 + Math.random() * 1.5);
    let bots = 0;
    for (const s of this.snakes) {
      if (!s.isBot || s.dead) continue;
      if (streaming) {
        const dx = s.x - fx, dy = s.y - fy;
        if (dx * dx + dy * dy > far) { s.dead = true; continue; }  // 直接下線，不撒食物
      }
      bots++;
    }
    for (let i = bots; i < WORLD.botCount; i++) this.spawnBot();
    if (this.snakes.length > WORLD.botCount * 3) this.snakes = this.snakes.filter((s) => !s.dead);

    // 7) 排行榜（每 0.4 秒重排一次即可）
    this._boardTimer -= dt;
    if (this._boardTimer <= 0) {
      this._boardTimer = 0.4;
      this.board = this.snakes.filter((s) => !s.dead).sort((a, b) => b.mass - a.mass).slice(0, 10);
    }
  }

  // 死亡：身體沿路撒成食物，玩家死亡回報上層
  kill(s, killer) {
    if (s.dead) return;
    s.dead = true;
    const n = s.activeSegCount;
    const total = s.mass * TUNING.deathFoodRatio;
    const drops = Math.max(6, Math.floor(n / 2));
    const per = Math.max(1, total / drops);
    for (let i = 0; i < drops; i++) {
      s.segPos(i * 2, tmp);
      this.spawnFood(tmp.x + (Math.random() - 0.5) * 14, tmp.y + (Math.random() - 0.5) * 14, per, s.skin[0]);
    }
    if (killer && !killer.dead) killer.kills++;
    this.events.onDeath?.(s, killer);
  }
}
