const KEY = 'slither_scores_v1';
const NAME_KEY = 'slither_name_v1';
const MAX = 10;

// 本機歷史排行榜（localStorage）
export function loadScores() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
export function saveScore(name, score, kills, lengthSec) {
  const list = loadScores();
  list.push({ name, score, kills, t: Date.now(), sec: Math.round(lengthSec) });
  list.sort((a, b) => b.score - a.score);
  const cut = list.slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(cut)); } catch {}
  return cut.findIndex((r) => r.score === score && r.name === name);
}
export function bestScore() { return loadScores()[0]?.score ?? 0; }
export function loadName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } }
export function saveName(n) { try { localStorage.setItem(NAME_KEY, n); } catch {} }
