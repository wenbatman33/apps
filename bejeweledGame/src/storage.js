// localStorage 排行榜
import { STORAGE_KEY, TOP_N } from "./constants.js";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { simple: [], timed: [] };
    const data = JSON.parse(raw);
    return {
      simple: Array.isArray(data.simple) ? data.simple : [],
      timed: Array.isArray(data.timed) ? data.timed : [],
    };
  } catch {
    return { simple: [], timed: [] };
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getScores(mode) {
  const all = readAll();
  return (all[mode] || []).slice().sort((a, b) => b.score - a.score).slice(0, TOP_N);
}

// 加入分數。回傳排名（1-based），未上榜回 -1
export function addScore(mode, name, score) {
  const all = readAll();
  if (!all[mode]) all[mode] = [];
  all[mode].push({
    name: name.slice(0, 8) || "????",
    score,
    date: new Date().toISOString().slice(0, 10),
  });
  all[mode].sort((a, b) => b.score - a.score);
  all[mode] = all[mode].slice(0, TOP_N);
  writeAll(all);

  const rank = all[mode].findIndex(s => s.score === score && s.name === name.slice(0, 8));
  return rank >= 0 ? rank + 1 : -1;
}

// 是否能上榜（Top 10）
export function qualifies(mode, score) {
  if (score <= 0) return false;
  const scores = getScores(mode);
  if (scores.length < TOP_N) return true;
  return score > scores[scores.length - 1].score;
}
