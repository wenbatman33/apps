#!/usr/bin/env node
/**
 * 戰神賽特風格 slot 模擬器 — 純邏輯，無動畫
 * 跑 N 次 spin 計算 RTP / hit rate / max win / Free Game 觸發率
 *
 * Usage: node scripts/simulate.js [spins=50000] [bet=160]
 */

const SYMBOLS = [
  { id: 'scatter',   payTable: { 8: 60,  10: 100, 12: 2000 }, weight: 4.2 },
  { id: 'bonus',     weight: 1.0, awakened: true },
  { id: 'oda',       payTable: { 8: 200, 10: 500, 12: 1000 }, weight: 5 },
  { id: 'takeda',    payTable: { 8: 200, 10: 500, 12: 1000 }, weight: 5 },
  { id: 'kabuto',    payTable: { 8: 50,  10: 200, 12: 500 },  weight: 8 },
  { id: 'gunbai',    payTable: { 8: 40,  10: 100, 12: 300 },  weight: 10 },
  { id: 'katana',    payTable: { 8: 30,  10: 40,  12: 240 },  weight: 14 },
  { id: 'yari',      payTable: { 8: 16,  10: 24,  12: 160 },  weight: 18 },
  { id: 'rifle',     payTable: { 8: 10,  10: 20,  12: 100 },  weight: 22 },
  { id: 'taiko',     payTable: { 8: 8,   10: 18,  12: 80 },   weight: 26 },
  { id: 'torii',     payTable: { 8: 5,   10: 15,  12: 40 },   weight: 30 },
  { id: 'sakura',    payTable: { 8: 5,   10: 15,  12: 40 },   weight: 34 },
  { id: 'snowflake', payTable: { 8: 5,   10: 15,  12: 40 },   weight: 36 },
  { id: 'mult2',     multiplier: 2,    weight: 6.0 },
  { id: 'mult5',     multiplier: 5,    weight: 3.5 },
  { id: 'mult10',    multiplier: 10,   weight: 1.8 },
  { id: 'mult25',    multiplier: 25,   weight: 0.9 },
  { id: 'mult50',    multiplier: 50,   weight: 0.45 },
  { id: 'mult100',   multiplier: 100,  weight: 0.2 },
  { id: 'mult500',   multiplier: 500,  weight: 0.05 }
];

const RTP_SCALE = 0.237;     // 校正係數（暫代，模擬後可調）
const CLUSTER_MIN = 8;
const ROWS = 5, COLS = 6;
const CASCADE_LIMIT = 30;
const FG_TRIGGER_SCATTERS = 4;
const FG_SPINS = 15;
const FG_RETRIGGER_SCATTERS = 3;
const FG_RETRIGGER_BONUS = 5;
const FG_MAX = 100;
const FG_ORB_BOOST = 2.0;
const FG_PAYING_BOOST = 1.6;

function weightedSymbol(inFG = false) {
  const adjusted = SYMBOLS.map(s => {
    let w = s.weight;
    const isLuck = s.id === 'scatter' || s.id === 'bonus' || s.multiplier;
    if (inFG) {
      if (isLuck) w *= FG_ORB_BOOST;
      else if (s.weight >= 14) w *= FG_PAYING_BOOST;
    }
    return { sym: s, w };
  });
  const total = adjusted.reduce((sum, x) => sum + x.w, 0);
  let roll = Math.random() * total;
  for (const { sym, w } of adjusted) {
    roll -= w;
    if (roll <= 0) return sym;
  }
  return adjusted[adjusted.length - 1].sym;
}

function fillBoard(inFG = false) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = weightedSymbol(inFG);
    }
  }
  return grid;
}

function scoreMatches(grid) {
  const counts = new Map();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sym = grid[r][c];
      if (!sym || !sym.payTable) continue;
      if (!counts.has(sym.id)) counts.set(sym.id, { symbol: sym, cells: [] });
      counts.get(sym.id).cells.push([r, c]);
    }
  }
  return [...counts.values()].filter(c => c.cells.length >= CLUSTER_MIN);
}

function payoutFor(symbol, count) {
  if (!symbol.payTable) return 0;
  if (count >= 12) return symbol.payTable[12];
  if (count >= 10) return symbol.payTable[10];
  if (count >= 8)  return symbol.payTable[8];
  return 0;
}

function popAndRefill(grid, winningCellSet, inFG) {
  // 標記 winning cells 為 null
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (winningCellSet.has(`${r},${c}`)) grid[r][c] = null;
    }
  }
  // 每列從下往上 collapse + 上方 refill
  for (let c = 0; c < COLS; c++) {
    const surviving = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c]) surviving.push(grid[r][c]);
    }
    // 從下往上填回
    for (let r = ROWS - 1; r >= 0; r--) {
      grid[r][c] = surviving.shift() || weightedSymbol(inFG);
    }
  }
}

function simulateSpin(bet, inFG = false, stickyMult = 0) {
  let grid = fillBoard(inFG);
  let scattersOnInit = 0;
  let bonusOnInit = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c]?.id === 'scatter') scattersOnInit++;
    if (grid[r][c]?.id === 'bonus') bonusOnInit++;
  }

  let totalWin = 0;
  let multiplier = inFG ? Math.max(stickyMult, 1) : 1;
  let lastOrbSum = 0;
  // Initial orbs
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c]?.multiplier) lastOrbSum += grid[r][c].multiplier;
  }
  if (lastOrbSum > 0) {
    if (inFG) { stickyMult += lastOrbSum; multiplier = stickyMult; }
    else multiplier = lastOrbSum;
  }

  for (let cascade = 1; cascade <= CASCADE_LIMIT; cascade++) {
    const matches = scoreMatches(grid);
    if (matches.length === 0) break;

    // delta orb check
    let currentOrbSum = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (grid[r][c]?.multiplier) currentOrbSum += grid[r][c].multiplier;
    }
    const delta = currentOrbSum - lastOrbSum;
    if (delta > 0) {
      if (inFG) { stickyMult += delta; multiplier = stickyMult; }
      else multiplier = (multiplier === 1 ? 0 : multiplier) + delta;
      lastOrbSum = currentOrbSum;
    }

    let baseWin = 0;
    const winSet = new Set();
    for (const m of matches) {
      baseWin += payoutFor(m.symbol, m.cells.length) * (bet / 20);
      m.cells.forEach(([r, c]) => winSet.add(`${r},${c}`));
    }
    const cascadeWin = baseWin * multiplier * RTP_SCALE;
    totalWin += cascadeWin;

    popAndRefill(grid, winSet, inFG);
  }

  return {
    totalWin,
    scattersOnInit,
    bonusOnInit,
    stickyMult,
    hit: totalWin > 0
  };
}

function simulate(spins, bet) {
  let totalBet = 0;
  let totalWin = 0;
  let hits = 0;
  let maxWin = 0;
  let fgTriggers = 0;
  let fgWins = 0;

  for (let i = 0; i < spins; i++) {
    totalBet += bet;
    const r = simulateSpin(bet, false, 0);
    totalWin += r.totalWin;
    if (r.totalWin > maxWin) maxWin = r.totalWin;
    if (r.hit) hits++;

    // Free Game 觸發
    if (r.scattersOnInit + r.bonusOnInit >= FG_TRIGGER_SCATTERS) {
      fgTriggers++;
      let fgRemaining = FG_SPINS;
      let stickyMult = (r.bonusOnInit >= 2) ? 5 : (r.bonusOnInit === 1) ? 3 : 0;
      let fgTotal = 0;
      while (fgRemaining > 0) {
        const fgr = simulateSpin(bet, true, stickyMult);
        stickyMult = fgr.stickyMult;
        fgTotal += fgr.totalWin;
        if (fgr.scattersOnInit >= FG_RETRIGGER_SCATTERS) {
          fgRemaining = Math.min(fgRemaining + FG_RETRIGGER_BONUS, FG_MAX);
        }
        fgRemaining--;
      }
      totalWin += fgTotal;
      fgWins += fgTotal;
      if (fgTotal > maxWin) maxWin = fgTotal;
    }

    if (i > 0 && i % 10000 === 0) {
      const rtp = (totalWin / totalBet * 100).toFixed(2);
      process.stderr.write(`  ${i}/${spins} | RTP: ${rtp}% | Hit: ${(hits/i*100).toFixed(2)}%\n`);
    }
  }

  return {
    spins,
    totalBet,
    totalWin,
    rtp: (totalWin / totalBet) * 100,
    hitRate: (hits / spins) * 100,
    maxWin,
    maxWinMultiple: maxWin / bet,
    fgTriggers,
    fgFrequency: spins / fgTriggers,
    fgAvgWin: fgWins / Math.max(fgTriggers, 1)
  };
}

// CLI
const args = process.argv.slice(2);
const spins = parseInt(args[0] || '50000', 10);
const bet = parseInt(args[1] || '160', 10);

console.log(`\n戰國雙雄 / 戰神賽特對標 - RTP 模擬\n`);
console.log(`設定: ${spins.toLocaleString()} spin × bet ${bet} (rtpScale ${RTP_SCALE})\n`);

const start = Date.now();
const r = simulate(spins, bet);
const sec = ((Date.now() - start) / 1000).toFixed(1);

console.log(`\n=== 結果 (${sec}s) ===`);
console.log(`Total Bet:     ${r.totalBet.toLocaleString()}`);
console.log(`Total Win:     ${r.totalWin.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
console.log(`RTP:           ${r.rtp.toFixed(2)}%   (目標 96.89%)`);
console.log(`Hit Rate:      ${r.hitRate.toFixed(2)}%   (目標 23.76%)`);
console.log(`Max Win:       ${r.maxWin.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${r.maxWinMultiple.toFixed(0)}× bet)`);
console.log(`FG Triggers:   ${r.fgTriggers}`);
console.log(`FG Frequency:  1 / ${r.fgFrequency.toFixed(0)} spin   (目標 1/200~250)`);
console.log(`FG Avg Win:    ${r.fgAvgWin.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
console.log(``);

// RTP 校正建議
if (r.rtp < 95 || r.rtp > 99) {
  const suggested = (RTP_SCALE * 96.89 / r.rtp).toFixed(4);
  console.log(`⚠️  RTP 偏離目標 96.89%`);
  console.log(`   建議 rtpScale: ${suggested}  (目前 ${RTP_SCALE})`);
}
