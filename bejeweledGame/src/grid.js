// 純資料邏輯：Match-3 網格運算（不涉及渲染）
import { GRID_W, GRID_H, GEM_TYPES } from "./constants.js";

// 建立一個無初始配對的隨機網格
export function createGrid() {
  const g = Array.from({ length: GRID_H }, () => new Array(GRID_W).fill(null));
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let t;
      let guard = 0;
      do {
        t = Math.floor(Math.random() * GEM_TYPES);
        guard++;
      } while (
        guard < 20 && (
          (x >= 2 && g[y][x - 1] === t && g[y][x - 2] === t) ||
          (y >= 2 && g[y - 1][x] === t && g[y - 2][x] === t)
        )
      );
      g[y][x] = t;
    }
  }
  // 保證有合法移動
  if (!hasValidMove(g)) return createGrid();
  return g;
}

export function inBounds(x, y) {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

export function isAdjacent(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

export function swap(g, a, b) {
  const tmp = g[a.y][a.x];
  g[a.y][a.x] = g[b.y][b.x];
  g[b.y][b.x] = tmp;
}

// 找出所有配對（連續 3+ 同色），回傳一個 Set<"x,y">
export function findMatches(g) {
  const matched = new Set();

  // 橫向
  for (let y = 0; y < GRID_H; y++) {
    let runStart = 0;
    for (let x = 1; x <= GRID_W; x++) {
      const cur = x < GRID_W ? g[y][x] : null;
      const prev = g[y][x - 1];
      if (cur !== null && cur === prev) continue;
      const runLen = x - runStart;
      if (runLen >= 3 && prev !== null) {
        for (let k = runStart; k < x; k++) matched.add(`${k},${y}`);
      }
      runStart = x;
    }
  }

  // 縱向
  for (let x = 0; x < GRID_W; x++) {
    let runStart = 0;
    for (let y = 1; y <= GRID_H; y++) {
      const cur = y < GRID_H ? g[y][x] : null;
      const prev = g[y - 1][x];
      if (cur !== null && cur === prev) continue;
      const runLen = y - runStart;
      if (runLen >= 3 && prev !== null) {
        for (let k = runStart; k < y; k++) matched.add(`${x},${k}`);
      }
      runStart = y;
    }
  }

  return matched;
}

// 偵測交換會不會造成配對（用來決定交換是否合法）
export function swapCausesMatch(g, a, b) {
  swap(g, a, b);
  const matches = findMatches(g);
  swap(g, a, b);  // 還原
  return matches.size > 0;
}

// 清除被配對的格子 → null。回傳被清除的數量
export function clearMatches(g, matched) {
  matched.forEach(key => {
    const [x, y] = key.split(",").map(Number);
    g[y][x] = null;
  });
  return matched.size;
}

// 重力：將所有非空格子往下壓，回傳每格的移動記錄 { fromY, toY, x, type }
export function applyGravity(g) {
  const moves = [];
  for (let x = 0; x < GRID_W; x++) {
    let writeY = GRID_H - 1;
    for (let y = GRID_H - 1; y >= 0; y--) {
      if (g[y][x] !== null) {
        if (y !== writeY) {
          g[writeY][x] = g[y][x];
          g[y][x] = null;
          moves.push({ x, fromY: y, toY: writeY, type: g[writeY][x] });
        }
        writeY--;
      }
    }
  }
  return moves;
}

// 填充頂端空格，回傳新增格 { x, y, type }
export function refill(g) {
  const added = [];
  for (let x = 0; x < GRID_W; x++) {
    for (let y = 0; y < GRID_H; y++) {
      if (g[y][x] === null) {
        const t = Math.floor(Math.random() * GEM_TYPES);
        g[y][x] = t;
        added.push({ x, y, type: t });
      }
    }
  }
  return added;
}

// 是否存在任何合法交換
export function hasValidMove(g) {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      // 向右
      if (x + 1 < GRID_W) {
        swap(g, { x, y }, { x: x + 1, y });
        const m = findMatches(g).size > 0;
        swap(g, { x, y }, { x: x + 1, y });
        if (m) return true;
      }
      // 向下
      if (y + 1 < GRID_H) {
        swap(g, { x, y }, { x, y: y + 1 });
        const m = findMatches(g).size > 0;
        swap(g, { x, y }, { x, y: y + 1 });
        if (m) return true;
      }
    }
  }
  return false;
}

// 提示：回傳一對合法交換座標 [a, b]，無則 null
export function findHint(g) {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (x + 1 < GRID_W) {
        const a = { x, y }, b = { x: x + 1, y };
        if (swapCausesMatch(g, a, b)) return [a, b];
      }
      if (y + 1 < GRID_H) {
        const a = { x, y }, b = { x, y: y + 1 };
        if (swapCausesMatch(g, a, b)) return [a, b];
      }
    }
  }
  return null;
}

// 深拷貝
export function cloneGrid(g) {
  return g.map(row => row.slice());
}
