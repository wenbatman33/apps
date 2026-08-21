// 200 關程序生成：以關卡編號為 seed，結果可重現，不需儲存關卡資料
import { GRID, TOTAL_LEVELS, THEME } from '../config.js';

// 格子型別
export const T = {
  EMPTY: 0,
  BRICK: 1,   // 一般方磚
  TRI: 2,     // 三角磚：斜面 45 度反彈，corner 表示直角所在角落（0=左上 1=右上 2=右下 3=左下）
  PLUS: 5,    // 道具：+1 球
  LASER: 6,   // 道具：清除整行與整列
  MULTI: 7,   // 道具：本回合球數 ×3
};

export const POWERUPS = [T.PLUS, T.LASER, T.MULTI];
export function isPowerup(t) { return t === T.PLUS || t === T.LASER || t === T.MULTI; }

// ---- 可重現亂數 ----
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 難度曲線 ----
export function startBallsFor(level) {
  return Math.max(8, Math.min(520, Math.floor(Math.pow(level, 1.12) * 1.3) + 8));
}

// 磚塊血量基準與球數掛鉤，確保「球多 → 磚也厚」的節奏一致
export function hpBaseFor(level) {
  // 前期由關卡直接拉血量（球數還少、成長慢），中後期改由球數決定
  return Math.max(3 + Math.floor(level / 4), Math.round(startBallsFor(level) * 0.11) + 1);
}

export function hpForTurn(level, turn) {
  return Math.max(2, Math.round(hpBaseFor(level) * (0.85 + turn * 0.05)));
}

// 一關的初始盤面總血量目標（球數單調 → 目標單調 → 難度單調）
export function initHpTarget(level) {
  // 前期球少、命中效率低，係數要小；後期球多才吃得下高血量
  const k = 4.0 + Math.min(6.0, level * 0.033);
  return Math.round(startBallsFor(level) * k);
}

// 每一波新行的總血量目標，隨回合緩升
export function waveHpTarget(level, turn) {
  const k = 1.0 + Math.min(1.5, level * 0.0085);
  return Math.round(startBallsFor(level) * k * (1 + turn * 0.06));
}

// 把一組磚的血量等比縮放到目標總量：保留「有難有易」的相對分佈，總難度可控
function normalizeHp(cells, target) {
  let cur = 0;
  for (const c of cells) cur += c.hp;
  if (cur <= 0 || !cells.length) return;
  const k = target / cur;
  for (const c of cells) {
    c.hp = Math.max(1, Math.round(c.hp * k));
    c.maxHp = c.hp;
  }
}

// 每塊磚的血量各自浮動：多數偏低（好打），少數特別厚（要花好幾回合），
// 同一波才會出現有難有易、顏色不一的盤面
export function rollHp(base, rng) {
  const r = rng();
  const mul = r < 0.75 ? 0.32 + r * 0.9 : 1.0 + (r - 0.75) * 3.2;
  return Math.max(1, Math.round(base * mul));
}

export function wavesFor(level) {
  return Math.min(11, 5 + Math.floor(level / 22));
}

function initRowsFor(level) {
  return Math.min(7, 3 + Math.floor(level / 12));
}

// ---- 版面圖樣 ----
const PATTERNS = ['random', 'symmetric', 'checker', 'pyramid', 'arch', 'diamond', 'fortress', 'zigzag'];

// 產生單列的填充遮罩（true = 有磚）
function rowMask(pattern, row, rows, cols, rng, density) {
  const mask = new Array(cols).fill(false);
  const mid = (cols - 1) / 2;
  for (let c = 0; c < cols; c++) {
    const dist = Math.abs(c - mid);
    let on;
    switch (pattern) {
      case 'symmetric':
        on = c <= mid ? rng() < density : mask[cols - 1 - c];
        break;
      case 'checker':
        on = ((r0(row) + c) % 2 === 0) && rng() < density + 0.25;
        break;
      case 'pyramid':
        on = dist <= (row + 1) * (mid / rows) + 0.5;
        break;
      case 'arch':
        on = dist >= mid - row * 0.9 || row === rows - 1;
        break;
      case 'diamond': {
        const rr = Math.abs(row - (rows - 1) / 2);
        on = dist + rr <= mid;
        break;
      }
      case 'fortress':
        on = row === 0 || row === rows - 1 || c === 0 || c === cols - 1 || rng() < density * 0.5;
        break;
      case 'zigzag':
        on = ((c + row) % 3 !== 0) && rng() < density + 0.2;
        break;
      default:
        on = rng() < density;
    }
    mask[c] = !!on;
  }
  // 對稱圖樣二次鏡射，確保左右完全對稱
  if (pattern === 'symmetric') {
    for (let c = 0; c < Math.floor(cols / 2); c++) mask[cols - 1 - c] = mask[c];
  }
  // 幾何圖樣容易留下大片空白，額外補一層隨機填充讓盤面更飽滿
  const boost = density * 0.45;
  for (let c = 0; c < cols; c++) if (!mask[c] && rng() < boost) mask[c] = true;

  // 保證每列至少有一塊，避免空列浪費回合
  if (!mask.some(Boolean)) mask[Math.floor(rng() * cols)] = true;
  return mask;
}
function r0(x) { return x; }

// 建立一列 cell 資料
export function buildRow(def, turn, rng, opts = {}) {
  const { COLS } = GRID;
  const cols = COLS;
  const density = opts.density ?? def.density;
  const pattern = opts.pattern ?? def.pattern;
  const mask = rowMask(pattern, opts.row ?? 0, opts.rows ?? 1, cols, rng, density);

  // 通道：固定幾個欄位大多留空，讓球有開口能鑽進磚陣往上連續彈擊
  for (const lane of def.lanes || []) {
    if (rng() < 0.78) mask[lane] = false;
  }
  const base = hpForTurn(def.level, turn);
  const row = [];
  for (let c = 0; c < cols; c++) {
    if (!mask[c]) { row.push(null); continue; }
    const hp = rollHp(base, rng);
    // 一部分磚塊做成三角形，讓彈道更有變化
    if (def.level >= 6 && rng() < 0.16) {
      row.push({ t: T.TRI, hp, maxHp: hp, corner: Math.floor(rng() * 4) });
    } else {
      row.push({ t: T.BRICK, hp, maxHp: hp });
    }
  }
  // 每列放 1~2 個道具，只放在空格上，不覆蓋任何磚塊
  const rate = def.plusRate ?? 0.55;
  const count = (rng() < rate ? 1 : 0) + (rng() < rate * 0.5 ? 1 : 0);
  const lanes = def.lanes || [];
  for (let k = 0; k < count; k++) {
    const empties = [];
    for (let c = 0; c < cols; c++) if (!row[c]) empties.push(c);
    if (!empties.length) break;
    // 優先放在通道以外的空格，避免道具全擠在同一條通道上
    const outside = empties.filter((c) => !lanes.includes(c));
    const pool = outside.length ? outside : empties;
    row[pool[Math.floor(rng() * pool.length)]] = { t: pickPowerup(def.level, rng), hp: 1, maxHp: 1 };
  }
  if (opts.hpTarget) normalizeHp(row.filter((c) => c && !isPowerup(c.t)), opts.hpTarget);
  return row;
}

// 道具權重：加球最常見，雷射次之，球數 ×3 最稀有
function pickPowerup(level, rng) {
  const roll = rng();
  const laserW = level >= 8 ? 0.22 : 0;
  const multiW = level >= 15 ? 0.08 : 0;
  if (roll < multiW) return T.MULTI;
  if (roll < multiW + laserW) return T.LASER;
  return T.PLUS;
}

// ---- 關卡定義 ----
export function makeLevel(level) {
  const n = Math.max(1, Math.min(TOTAL_LEVELS, level | 0));
  const rng = mulberry32(0x9E3779B9 ^ (n * 2654435761));
  const pattern = PATTERNS[Math.floor(rng() * PATTERNS.length)];

  // 1~2 條縱向通道，不貼邊（貼邊會讓球只沿著牆跑）
  const laneCount = 1 + (rng() < 0.55 ? 1 : 0);
  const lanes = [];
  let guard = 20;
  while (lanes.length < laneCount && guard-- > 0) {
    const c = 1 + Math.floor(rng() * (GRID.COLS - 2));
    if (!lanes.includes(c) && !lanes.some((l) => Math.abs(l - c) < 2)) lanes.push(c);
  }

  const def = {
    level: n,
    lanes,
    theme: THEME,
    pattern,
    density: 0.64 + Math.min(0.26, n * 0.002) + rng() * 0.08,
    plusRate: Math.max(0.5, 0.85 - n * 0.001),
    startBalls: startBallsFor(n),
    waves: wavesFor(n),
    initRows: initRowsFor(n),
    seed: 0x9E3779B9 ^ (n * 2654435761),
    goal: 'clear',
  };
  return def;
}

// 產生關卡初始盤面（二維陣列 rows[row][col]，row 0 在最上方）
export function buildInitialGrid(def) {
  const rng = mulberry32(def.seed ^ 0x51ED2701);
  const grid = [];
  for (let r = 0; r < GRID.ROWS; r++) grid.push(new Array(GRID.COLS).fill(null));

  const rows = def.initRows;
  for (let r = 0; r < rows; r++) {
    // 只有最底一行稍微留縫，其餘維持密集盤面
    const falloff = r === rows - 1 ? 0.82 : 1;
    const row = buildRow(def, 0, rng, { row: r, rows, density: def.density * falloff });
    grid[r] = row;
  }

  // 保底填充：幾何圖樣可能過於稀疏，補到目標密度確保盤面夠滿
  {
    const cells = rows * GRID.COLS;
    let filled = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < GRID.COLS; c++) if (grid[r][c]) filled++;
    const target = Math.floor(cells * Math.min(0.85, def.density));
    let guard = cells * 3;
    while (filled < target && guard-- > 0) {
      const r = Math.floor(rng() * rows);
      const c = Math.floor(rng() * GRID.COLS);
      if (grid[r][c]) continue;
      const hp = rollHp(hpForTurn(def.level, 0), rng);
      grid[r][c] = def.level >= 6 && rng() < 0.16
        ? { t: T.TRI, hp, maxHp: hp, corner: Math.floor(rng() * 4) }
        : { t: T.BRICK, hp, maxHp: hp };
      filled++;
    }
  }

  // 整體正規化：把初始盤面總血量壓到目標值，確保關卡難度隨編號單調
  {
    const cells = [];
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const cell = grid[r][c];
        if (cell && !isPowerup(cell.t)) cells.push(cell);
      }
    }
    normalizeHp(cells, initHpTarget(def.level));
  }

  return grid;
}

