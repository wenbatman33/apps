// 英式 8x8 Checkers 規則引擎
// 棋盤座標 (row, col)：row 0 在上方（玩家 2 起始），row 7 在下方（玩家 1 起始）
// 深色格條件：(row + col) % 2 === 1，棋子只走深色格
// 玩家 1（底部）方向 dir = -1（往上 row 遞減）
// 玩家 2（頂部）方向 dir = +1（往下 row 遞增）

export const EMPTY = 0;
export const P1 = 1;       // 玩家 1 普通子
export const P2 = 2;       // 玩家 2 普通子
export const P1K = 3;      // 玩家 1 王
export const P2K = 4;      // 玩家 2 王

export const SIZE = 8;

export function owner(p) {
  if (p === P1 || p === P1K) return 1;
  if (p === P2 || p === P2K) return 2;
  return 0;
}
export function isKing(p) { return p === P1K || p === P2K; }

export function createInitialBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r < 3) b[r][c] = P2;
      else if (r > 4) b[r][c] = P1;
    }
  }
  return b;
}

export function cloneBoard(b) { return b.map(row => row.slice()); }

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

// 取得單一棋子可走方向（dr 集合）
function directions(piece) {
  if (piece === P1) return [[-1, -1], [-1, 1]];
  if (piece === P2) return [[1, -1], [1, 1]];
  if (piece === P1K || piece === P2K) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return [];
}

// 列出某玩家所有「跳吃」序列（從每一顆棋子展開多重跳）
// 回傳 moves: [{from:[r,c], path:[[r,c],...], captures:[[r,c],...], becomesKing:bool}]
function listJumpsFromPiece(board, r, c) {
  const piece = board[r][c];
  const player = owner(piece);
  if (!player) return [];

  const results = [];

  function dfs(curR, curC, curPiece, captured, path) {
    const dirs = directions(curPiece);
    let extended = false;
    for (const [dr, dc] of dirs) {
      const midR = curR + dr, midC = curC + dc;
      const dstR = curR + 2 * dr, dstC = curC + 2 * dc;
      if (!inBounds(dstR, dstC)) continue;
      const midKey = midR + ',' + midC;
      if (captured.has(midKey)) continue;
      const midPiece = board[midR][midC];
      if (owner(midPiece) === 0 || owner(midPiece) === player) continue;
      if (board[dstR][dstC] !== EMPTY && !(dstR === r && dstC === c)) continue;
      // 跳過去
      const newCaptured = new Set(captured); newCaptured.add(midKey);
      const newPath = path.concat([[dstR, dstC]]);
      // 英式規則：途中升王立即停止連跳
      let nextPiece = curPiece;
      let becameKing = false;
      if (curPiece === P1 && dstR === 0) { nextPiece = P1K; becameKing = true; }
      else if (curPiece === P2 && dstR === SIZE - 1) { nextPiece = P2K; becameKing = true; }
      extended = true;
      if (becameKing) {
        results.push({
          from: [r, c],
          path: newPath,
          captures: Array.from(newCaptured).map(k => k.split(',').map(Number)),
          becomesKing: true,
        });
      } else {
        const before = results.length;
        dfs(dstR, dstC, nextPiece, newCaptured, newPath);
        if (results.length === before) {
          // 沒有後續跳，這條路徑就是終點
          results.push({
            from: [r, c],
            path: newPath,
            captures: Array.from(newCaptured).map(k => k.split(',').map(Number)),
            becomesKing: false,
          });
        }
      }
    }
    return extended;
  }

  dfs(r, c, piece, new Set(), []);
  return results;
}

function listSimpleFromPiece(board, r, c) {
  const piece = board[r][c];
  const player = owner(piece);
  if (!player) return [];
  const results = [];
  for (const [dr, dc] of directions(piece)) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    if (board[nr][nc] !== EMPTY) continue;
    let becameKing = false;
    if (piece === P1 && nr === 0) becameKing = true;
    else if (piece === P2 && nr === SIZE - 1) becameKing = true;
    results.push({
      from: [r, c],
      path: [[nr, nc]],
      captures: [],
      becomesKing: becameKing,
    });
  }
  return results;
}

// 取得玩家所有合法走法（強制吃子：有跳吃就只能跳）
export function legalMoves(board, player) {
  const jumps = [];
  const simples = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (owner(board[r][c]) !== player) continue;
      const js = listJumpsFromPiece(board, r, c);
      if (js.length) jumps.push(...js);
      else simples.push(...listSimpleFromPiece(board, r, c));
    }
  }
  return jumps.length ? jumps : simples;
}

// 套用一個 move，回傳新棋盤
export function applyMove(board, move) {
  const nb = cloneBoard(board);
  const [fr, fc] = move.from;
  const piece = nb[fr][fc];
  nb[fr][fc] = EMPTY;
  for (const [cr, cc] of move.captures) nb[cr][cc] = EMPTY;
  const [tr, tc] = move.path[move.path.length - 1];
  let finalPiece = piece;
  if (move.becomesKing) {
    finalPiece = (owner(piece) === 1) ? P1K : P2K;
  }
  nb[tr][tc] = finalPiece;
  return nb;
}

export function countPieces(board) {
  let p1 = 0, p2 = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const o = owner(board[r][c]);
    if (o === 1) p1++; else if (o === 2) p2++;
  }
  return { p1, p2 };
}

// 勝負判斷：對手無合法走法或無子 → 我方勝
export function gameOver(board, toMovePlayer) {
  const moves = legalMoves(board, toMovePlayer);
  if (moves.length === 0) {
    return { over: true, winner: toMovePlayer === 1 ? 2 : 1 };
  }
  return { over: false, winner: 0 };
}
