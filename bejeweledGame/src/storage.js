// 排行榜：優先寫 Supabase、localStorage 當離線 fallback + 快取
// 所有 export 改為 async，呼叫端需 await
import { STORAGE_KEY, TOP_N } from "./constants.js";
import { REMOTE_ENABLED, sbSelect, sbInsert, sbCountHigher } from "./supabase.js";

// ============ localStorage（離線 fallback / 快取）============
function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { simple: [], timed: [] };
    const data = JSON.parse(raw);
    return {
      simple: Array.isArray(data.simple) ? data.simple : [],
      timed:  Array.isArray(data.timed)  ? data.timed  : [],
    };
  } catch {
    return { simple: [], timed: [] };
  }
}

function writeLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// 把遠端回傳的排行榜寫入本地快取（離線時仍能看到最近的榜單）
function cacheRemote(mode, rows) {
  const all = readLocal();
  all[mode] = rows;
  writeLocal(all);
}

// 本地插入並回傳 1-based 排名，-1 表示沒上榜
function addToLocal(mode, finalName, score) {
  const all = readLocal();
  if (!all[mode]) all[mode] = [];
  all[mode].push({
    name: finalName,
    score,
    date: new Date().toISOString().slice(0, 10),
  });
  all[mode].sort((a, b) => b.score - a.score);
  all[mode] = all[mode].slice(0, TOP_N);
  writeLocal(all);
  const idx = all[mode].findIndex(s => s.score === score && s.name === finalName);
  return idx >= 0 ? idx + 1 : -1;
}

// ============ 公開 API（async）============

// 取得指定模式的 Top N 排行榜
export async function getScores(mode) {
  if (REMOTE_ENABLED) {
    try {
      const q = `select=name,score,created_at&mode=eq.${mode}&order=score.desc&limit=${TOP_N}`;
      const data = await sbSelect("scores", q);
      const rows = (data || []).map(r => ({
        name:  r.name,
        score: r.score,
        date:  (r.created_at || "").slice(0, 10),
      }));
      cacheRemote(mode, rows);
      return rows;
    } catch (e) {
      console.warn("[storage] remote fetch failed, fallback local", e);
    }
  }
  const all = readLocal();
  return (all[mode] || []).slice().sort((a, b) => b.score - a.score).slice(0, TOP_N);
}

// 新增分數，回傳 1-based 排名（遠端成功用全球排名，失敗或離線用本地排名）
export async function addScore(mode, name, score) {
  const finalName = (name || "Player").slice(0, 8);

  // 先寫本地（保險 + 即時顯示）
  const localRank = addToLocal(mode, finalName, score);

  if (REMOTE_ENABLED) {
    try {
      await sbInsert("scores", { mode, name: finalName, score });
      // 再問真正有幾個人分數比你高 → +1 就是全球排名
      const higher = await sbCountHigher("scores", mode, score);
      return higher + 1;
    } catch (e) {
      console.warn("[storage] remote insert failed, use local rank", e);
    }
  }
  return localRank;
}

// 是否能上榜（Top N 以內）
export async function qualifies(mode, score) {
  if (score <= 0) return false;
  const scores = await getScores(mode);
  if (scores.length < TOP_N) return true;
  return score > scores[scores.length - 1].score;
}
