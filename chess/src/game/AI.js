// Minimax + Alpha-Beta，AI 永遠扮演玩家 2（頂部，coral）
import { legalMoves, applyMove, owner, isKing, boardKey, isProgressMove, P1, P2, P1K, P2K, SIZE } from './Board.js';

const PIECE_VAL = 100;
const KING_VAL = 175;
const ADVANCE_BONUS = 4;     // 普通子推進加分
const BACK_ROW_BONUS = 6;    // 守家後排
const CENTER_BONUS = 3;      // 中央格

function evaluate(board, aiPlayer) {
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      const o = owner(p);
      if (!o) continue;
      const sign = (o === aiPlayer) ? 1 : -1;
      let v = isKing(p) ? KING_VAL : PIECE_VAL;
      // 推進：玩家 1 越往上越好；玩家 2 越往下越好
      if (!isKing(p)) {
        if (o === 1) v += (SIZE - 1 - r) * ADVANCE_BONUS;
        else v += r * ADVANCE_BONUS;
        // 後排守家
        if ((o === 1 && r === SIZE - 1) || (o === 2 && r === 0)) v += BACK_ROW_BONUS;
      }
      // 中央
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += CENTER_BONUS;
      score += sign * v;
    }
  }
  return score;
}

function minimax(board, toMove, depth, alpha, beta, aiPlayer, ctx) {
  const moves = legalMoves(board, toMove);
  if (moves.length === 0) {
    return { score: toMove === aiPlayer ? -100000 - depth : 100000 + depth, move: null };
  }
  if (depth === 0) {
    return { score: evaluate(board, aiPlayer), move: null };
  }
  const maximizing = (toMove === aiPlayer);
  let best = maximizing ? -Infinity : Infinity;
  let bestMove = null;
  moves.sort((a, b) => b.captures.length - a.captures.length);
  for (const m of moves) {
    const nb = applyMove(board, m);
    const next = (toMove === 1) ? 2 : 1;

    // 反重複：若這一步會導致歷史已出現過 ≥ 2 次的局面（再走一次就 3 次和棋）
    // → AI 走出來會強烈避免（除非處於劣勢，那時和棋反而有利）
    let repetitionAdjust = 0;
    if (ctx && ctx.positionCounts) {
      const key = boardKey(nb, next);
      const prevCount = ctx.positionCounts.get(key) || 0;
      if (prevCount >= 2) {
        // 將形成三重複 → 和棋
        const evalNow = evaluate(board, aiPlayer);
        // AI 領先（evalNow > 0）時，和棋不利 → 大扣分
        // AI 落後（evalNow < 0）時，和棋有利 → 加分
        repetitionAdjust = -evalNow * 0.8;
      } else if (prevCount >= 1) {
        // 即將第 2 次重複，略避免
        repetitionAdjust = maximizing ? -8 : 8;
      }
    }

    const { score: rawScore } = minimax(nb, next, depth - 1, alpha, beta, aiPlayer, ctx);
    const score = rawScore + (maximizing ? repetitionAdjust : -repetitionAdjust);

    if (maximizing) {
      if (score > best) { best = score; bestMove = m; }
      alpha = Math.max(alpha, best);
    } else {
      if (score < best) { best = score; bestMove = m; }
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return { score: best, move: bestMove };
}

export function chooseAIMove(board, aiPlayer, difficulty = 'normal', ctx = null) {
  const depthMap = { easy: 2, normal: 5, hard: 7 };
  const depth = depthMap[difficulty] ?? 5;
  const { move } = minimax(board, aiPlayer, depth, -Infinity, Infinity, aiPlayer, ctx);
  if (move) return move;
  const ms = legalMoves(board, aiPlayer);
  return ms[Math.floor(Math.random() * ms.length)] || null;
}
