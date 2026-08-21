// 進度存檔：localStorage，含關卡星等與設定
const KEY = 'brickblast.save.v1';

const DEFAULT = {
  unlocked: 1,          // 已解鎖到第幾關
  stars: {},            // { [level]: 1..3 }
  best: {},             // { [level]: { score, turns, balls } } 各項獨立取最佳
  muted: false,
  bestLevel: 1,
  totalBroken: 0,
  layoutOverride: null, // DEV 工具匯出的版面
};

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT };
  }
}

function flush() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 無痕模式忽略 */ }
}

export function getSave() { return data; }
export function unlocked() { return data.unlocked; }
export function starsOf(level) { return data.stars[level] || 0; }

// 過關紀錄：分數取最高，回合數與用球數取最少（三項各自獨立）
export function recordWin(level, stars, score, turns, balls) {
  const prev = data.stars[level] || 0;
  if (stars > prev) data.stars[level] = stars;
  if (level + 1 > data.unlocked) data.unlocked = level + 1;
  if (level > data.bestLevel) data.bestLevel = level;

  const b = data.best[level] || { score: 0, turns: Infinity, balls: Infinity };
  data.best[level] = {
    score: Math.max(b.score || 0, score || 0),
    turns: Math.min(b.turns ?? Infinity, turns ?? Infinity),
    balls: Math.min(b.balls ?? Infinity, balls ?? Infinity),
  };
  flush();
}

export function bestOf(level) {
  return data.best[level] || null;
}

// 是否刷新了個人紀錄（顯示在結算畫面）
export function checkRecords(level, score, turns, balls) {
  const b = data.best[level];
  if (!b) return { score: true, turns: true, balls: true, first: true };
  return {
    score: score > (b.score || 0),
    turns: turns < (b.turns ?? Infinity),
    balls: balls < (b.balls ?? Infinity),
    first: false,
  };
}

export function totalScore() {
  return Object.values(data.best).reduce((a, b) => a + (b.score || 0), 0);
}

export function clearedCount() {
  return Object.keys(data.best).length;
}

// 排行榜資料：已通關的關卡紀錄，依指定欄位排序
export function rankingRows(sortBy = 'score') {
  const rows = Object.entries(data.best).map(([lv, b]) => ({
    level: +lv,
    score: b.score || 0,
    turns: isFinite(b.turns) ? b.turns : null,
    balls: isFinite(b.balls) ? b.balls : null,
    stars: data.stars[lv] || 0,
  }));
  if (sortBy === 'score') rows.sort((a, b) => b.score - a.score || a.level - b.level);
  else if (sortBy === 'balls') rows.sort((a, b) => (a.balls ?? 1e9) - (b.balls ?? 1e9) || a.level - b.level);
  else if (sortBy === 'turns') rows.sort((a, b) => (a.turns ?? 1e9) - (b.turns ?? 1e9) || a.level - b.level);
  else rows.sort((a, b) => a.level - b.level);
  return rows;
}

export function addBroken(n) { data.totalBroken += n; flush(); }
export function setMutedSave(m) { data.muted = m; flush(); }
export function saveLayout(obj) { data.layoutOverride = obj; flush(); }
export function resetProgress() { data = { ...DEFAULT }; flush(); }
export function totalStars() {
  return Object.values(data.stars).reduce((a, b) => a + b, 0);
}
