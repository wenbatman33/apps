import { TUNING, WORLD } from '../config.js';

const CANDIDATES = 15;        // 候選轉向數
const SPREAD = Math.PI * 0.85; // 候選角度扇形範圍
const SENSE = 420;            // 感知半徑

// AI 決策：對數個候選方向評分（安全 > 食物 > 攻擊 > 邊界），選最高分
export function botThink(s, world, dt) {
  s._think = (s._think ?? Math.random() * TUNING.botReactTime) - dt;
  if (s._think > 0) return;
  s._think = TUNING.botReactTime;

  // 收集附近障礙（別條蛇的身體節點）與食物
  const obstacles = [];
  world.bodyGrid.query(s.x, s.y, SENSE, (n) => {
    if (n.s === s) return;
    obstacles.push(n);
  });
  const foods = [];
  world.foodGrid.query(s.x, s.y, SENSE, (f) => { if (f.alive) foods.push(f); });

  // 找可獵殺的目標：比我短的蛇頭且夠近
  let prey = null, preyD = 1e9;
  for (const o of world.snakes) {
    if (o === s || o.dead) continue;
    const d = Math.hypot(o.x - s.x, o.y - s.y);
    if (d < SENSE * 1.3 && o.mass < s.mass * 0.85 && d < preyD) { prey = o; preyD = d; }
  }

  const distCenter = Math.hypot(s.x, s.y);
  const nearEdge = distCenter > WORLD.radius - 500;
  let best = -1e9, bestAngle = s.angle, bestBoost = false;

  for (let i = 0; i < CANDIDATES; i++) {
    const a = s.angle + (i / (CANDIDATES - 1) - 0.5) * SPREAD;
    const dx = Math.cos(a), dy = Math.sin(a);
    let score = 0;

    // 1) 安全：往這方向前進會不會撞上身體
    let danger = 0;
    for (const n of obstacles) {
      const rx = n.x - s.x, ry = n.y - s.y;
      const proj = rx * dx + ry * dy;
      if (proj < 0 || proj > 300) continue;
      const perp = Math.abs(-rx * dy + ry * dx);
      const need = n.r + s.radius + 14;
      if (perp < need) danger += (300 - proj) / 300 * (1 - perp / need) * 60;
    }
    score -= danger * 3;

    // 2) 食物：方向上的食物加分（越近越重）
    for (const f of foods) {
      const rx = f.x - s.x, ry = f.y - s.y;
      const d = Math.hypot(rx, ry) + 1;
      const dot = (rx * dx + ry * dy) / d;
      if (dot > 0.3) score += f.v * dot * (SENSE - Math.min(d, SENSE)) / SENSE * 1.6;
    }

    // 3) 攻擊：切到獵物前方（繞頭）
    if (prey && Math.random() < 0.9) {
      const lead = 90 + preyD * 0.35;
      const tx = prey.x + Math.cos(prey.angle) * lead, ty = prey.y + Math.sin(prey.angle) * lead;
      const rx = tx - s.x, ry = ty - s.y, d = Math.hypot(rx, ry) + 1;
      score += ((rx * dx + ry * dy) / d) * 40 * TUNING.botAggression;
    }

    // 4) 邊界：靠近世界邊緣時強力導回圓心
    if (nearEdge) {
      const inward = (-s.x * dx - s.y * dy) / (distCenter + 1);
      score += inward * 260 * ((distCenter - (WORLD.radius - 500)) / 500);
    }
    // 5) 慣性：避免抖動
    score += Math.cos(a - s.angle) * 6;

    if (score > best) {
      best = score; bestAngle = a;
      bestBoost = !!prey && preyD < 320 && danger < 4 && s.mass > 60 && Math.random() < TUNING.botBoostChance;
    }
  }
  s.targetAngle = bestAngle;
  s.boosting = bestBoost;
}
