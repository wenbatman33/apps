// 難度分析：每關跑多次模擬，檢查是否可通關、難度曲線是否單調遞增
import { Game, PHASE } from '../src/core/game.js';
import { LAYOUT, GRID, applyLayout, LAYOUT_PC } from '../src/config.js';
import { bestAngle } from './ai.mjs';
import { makeLevel, buildInitialGrid, initHpTarget, isPowerup } from '../src/core/level.js';

applyLayout(LAYOUT_PC);

const DT = 1 / 60;
const MAX_TURN_SECONDS = 45;
const MAX_TURNS = 60;
const TRIALS = +(process.env.TRIALS || 3);

function playOnce(level, jitterSeed) {
  let st = (jitterSeed * 2654435761) >>> 0;
  const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };

  const game = new Game(level, {});
  while (game.phase !== PHASE.WIN && game.phase !== PHASE.LOSE && game.turn < MAX_TURNS) {
    // 加入角度擾動，模擬真人不會每球都打在最佳角
    const best = bestAngle(game, { samples: 36, balls: 3 });
    const ang = best.angle + (rnd() - 0.5) * 0.09 * jitterSeed;
    game.aim(Math.cos(ang), Math.sin(ang));
    if (!game.fire()) break;
    let t = 0;
    while (game.phase === PHASE.FIRING && t < MAX_TURN_SECONDS) { game.update(DT); t += DT; }
    if (t >= MAX_TURN_SECONDS) { game.balls.length = 0; game.pendingFire = 0; game.endTurn(); }
  }
  return { win: game.phase === PHASE.WIN, turns: game.turn, balls: game.stats.ballsFired, stars: game.resultStars };
}

const rows = [];
const levels = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : Array.from({ length: 200 }, (_, i) => i + 1);

for (const lv of levels) {
  const def = makeLevel(lv);
  const grid = buildInitialGrid(def);
  let bricks = 0, totalHp = 0;
  for (const row of grid) for (const c of row) { if (c && !isPowerup(c.t)) { bricks++; totalHp += c.hp; } }

  let wins = 0, sumTurns = 0, sumBalls = 0, worstTurns = 0;
  for (let t = 0; t < TRIALS; t++) {
    const r = playOnce(lv, t + 1);
    if (r.win) { wins++; sumTurns += r.turns; sumBalls += r.balls; }
    worstTurns = Math.max(worstTurns, r.turns);
  }
  rows.push({
    lv,
    winRate: wins / TRIALS,
    avgTurns: wins ? sumTurns / wins : null,
    avgBalls: wins ? Math.round(sumBalls / wins) : null,
    waves: def.waves,
    bricks,
    totalHp,
    target: initHpTarget(lv),
    lanes: (def.lanes || []).length,
  });
}

// ---- 報告 ----
const fails = rows.filter((r) => r.winRate < 1);
console.log(`\n=== 通關能力（每關 ${TRIALS} 次模擬）===`);
console.log(`全勝關卡：${rows.filter((r) => r.winRate === 1).length}/${rows.length}`);
if (fails.length) {
  console.log('未達全勝的關卡：');
  for (const f of fails) console.log(`  L${f.lv}  通關率 ${(f.winRate * 100).toFixed(0)}%  波次 ${f.waves}  磚 ${f.bricks}  總血 ${f.totalHp}`);
} else {
  console.log('每一關在每次模擬中都能通關 ✓');
}

// 難度曲線：以「通關回合數 / 波次」為難度指標
console.log('\n=== 難度曲線 ===');
// 主要指標：超額回合數（通關回合 − 波次），代表玩家要多撐幾輪
const diff = rows.map((r) => ({ lv: r.lv, d: r.avgTurns == null ? 99 : Math.max(0, r.avgTurns - r.waves) }));
const ratio = rows.map((r) => (r.avgTurns == null ? 99 : r.avgTurns / r.waves));
const win = 15;
const smooth = diff.map((_, i) => {
  const a = Math.max(0, i - win), b = Math.min(diff.length, i + win + 1);
  const seg = diff.slice(a, b);
  return seg.reduce((s, x) => s + x.d, 0) / seg.length;
});
for (let i = 0; i < rows.length; i += 20) {
  const r = rows[i];
  console.log(`  L${String(r.lv).padStart(3)}  超額回合 ${smooth[i].toFixed(2)}  比值 ${ratio[i].toFixed(2)}  回合 ${r.avgTurns?.toFixed(1) ?? '-'}/${r.waves}  用球 ${String(r.avgBalls ?? '-').padStart(5)}  磚 ${String(r.bricks).padStart(3)}  總血 ${String(r.totalHp).padStart(5)}`);
}

// 找出「比後面明顯更難」的關卡
console.log('\n=== 難度倒掛檢查 ===');
const bad = [];
for (let i = 0; i < rows.length; i++) {
  const later = diff.slice(i + 10, i + 40);
  if (later.length < 10) continue;
  const laterAvg = later.reduce((s, x) => s + x.d, 0) / later.length;
  if (diff[i].d > laterAvg * 1.6 + 1.5) bad.push({ lv: rows[i].lv, d: diff[i].d, laterAvg });
}
if (bad.length) {
  console.log(`發現 ${bad.length} 關明顯比後續關卡更難：`);
  for (const b of bad.slice(0, 20)) console.log(`  L${b.lv}  難度 ${b.d.toFixed(2)}  後續平均 ${b.laterAvg.toFixed(2)}`);
} else {
  console.log('沒有關卡明顯比後續關卡更難 ✓');
}

const first = smooth[0], last = smooth[smooth.length - 1];
console.log(`\n整體趨勢（超額回合）：起點 ${first.toFixed(2)} → 終點 ${last.toFixed(2)}  (${last > first ? '遞增 ✓' : '未遞增 ✗'})`);
// 分段檢查：每 40 關一段，段平均須遞增
const seg = [];
for (let i = 0; i < rows.length; i += 40) {
  const s2 = diff.slice(i, i + 40);
  seg.push({ from: rows[i].lv, to: rows[Math.min(rows.length - 1, i + 39)].lv, avg: s2.reduce((a, x) => a + x.d, 0) / s2.length });
}
console.log('分段平均：');
let segMono = true;
for (let i = 0; i < seg.length; i++) {
  const s2 = seg[i];
  const mark = i > 0 ? (s2.avg >= seg[i - 1].avg ? '↑' : '↓') : ' ';
  if (i > 0 && s2.avg < seg[i - 1].avg) segMono = false;
  console.log(`  L${String(s2.from).padStart(3)}-${String(s2.to).padStart(3)}  ${s2.avg.toFixed(2)} ${mark}`);
}
console.log(segMono ? '分段難度逐段遞增 ✓' : '分段難度有倒退 ✗');
