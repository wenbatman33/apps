// 無頭模擬：用 AI 隨機/貪婪策略跑關卡，驗證不卡死、不穿透、可通關
import { Game, PHASE, wallLeft, wallRight } from '../src/core/game.js';
import { LAYOUT, RULES, GRID, applyLayout, LAYOUT_PC } from '../src/config.js';
import { bestAngle } from './ai.mjs';

applyLayout(LAYOUT_PC);

const DT = 1 / 60;
const MAX_TURN_SECONDS = 90;   // 球速放慢後單回合會拉長，門檻要跟著放寬   // 單回合超過此秒數視為卡死
const MAX_TURNS = 120;

function playLevel(level, seed = 1, strategy = 'sim') {
  let rngState = seed;
  const rnd = () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };

  const game = new Game(level, {});
  let stuckTurns = 0;
  let maxTurnTime = 0;
  let escaped = 0;
  let maxBallsAlive = 0;

  while (game.phase !== PHASE.WIN && game.phase !== PHASE.LOSE && game.turn < MAX_TURNS) {
    // 選角度
    let ang;
    if (strategy === 'sim') {
      ang = bestAngle(game, { samples: 40, balls: 3 }).angle;
    } else if (strategy === 'greedy') {
      // 朝盤面最低一塊磚的方向
      let target = null;
      for (let r = GRID.ROWS - 1; r >= 0 && !target; r--) {
        for (let c = 0; c < GRID.COLS; c++) {
          if (game.grid[r][c]) { target = { r, c }; break; }
        }
      }
      if (target) {
        const tx = LAYOUT.playLeft + target.c * GRID.CELL + GRID.CELL / 2;
        const ty = LAYOUT.playTop + target.r * GRID.CELL;
        ang = Math.atan2(ty - LAYOUT.launchY, tx - game.launchX);
      } else ang = -Math.PI / 2;
      ang += (rnd() - 0.5) * 0.3;
    } else {
      ang = -Math.PI + 0.2 + rnd() * (Math.PI - 0.4);
    }

    game.aim(Math.cos(ang), Math.sin(ang));
    if (!game.fire()) break;

    let t = 0;
    while (game.phase === PHASE.FIRING && t < MAX_TURN_SECONDS) {
      game.update(DT);
      t += DT;
      if (game.balls.length > maxBallsAlive) maxBallsAlive = game.balls.length;
      for (const b of game.balls) {
        if (b.x < wallLeft() - 20 || b.x > wallRight() + 20 || b.y < LAYOUT.playTop - 40) escaped++;
      }
    }
    maxTurnTime = Math.max(maxTurnTime, t);
    if (t >= MAX_TURN_SECONDS) {
      stuckTurns++;
      game.balls.length = 0;    // 強制結束以繼續測試
      game.pendingFire = 0;
      game.endTurn();
    }
  }

  return {
    level,
    result: game.phase,
    turns: game.turn,
    maxTurnTime: +maxTurnTime.toFixed(1),
    stuckTurns,
    escaped,
    maxBallsAlive,
    finalBalls: game.ballsTotal,
    hits: game.stats.hits,
    broken: game.stats.broken,
  };
}

const args = process.argv.slice(2);
const levels = args.length ? args.map(Number) : [1, 2, 5, 10, 20, 30, 50, 75, 100, 125, 150, 175, 190, 200];

let stuck = 0, escapedTotal = 0, wins = 0, losses = 0;
console.log('關卡  結果   回合  最久回合  球峰值  最終球數  命中     破壞');
for (const lv of levels) {
  const r = playLevel(lv);
  if (r.stuckTurns) stuck += r.stuckTurns;
  escapedTotal += r.escaped;
  if (r.result === PHASE.WIN) wins++; else if (r.result === PHASE.LOSE) losses++;
  console.log(
    String(lv).padStart(4),
    (r.result === 'win' ? '過關' : r.result === 'lose' ? '失敗' : '未完').padEnd(4),
    String(r.turns).padStart(5),
    String(r.maxTurnTime + 's').padStart(8),
    String(r.maxBallsAlive).padStart(7),
    String(r.finalBalls).padStart(8),
    String(r.hits).padStart(8),
    String(r.broken).padStart(7),
    r.stuckTurns ? `⚠️卡死×${r.stuckTurns}` : '',
    r.escaped ? `⚠️穿透×${r.escaped}` : ''
  );
}
console.log(`\n總計：過關 ${wins} / 失敗 ${losses} / 卡死回合 ${stuck} / 穿透 ${escapedTotal}`);
