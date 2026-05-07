// 排行榜系統（Supabase REST 為主，localStorage 為快取與離線備援）
// 參考 jumpVerticalGame/js/leaderboard.js 形式

const SUPABASE_URL = 'https://igqpwzldgqocazlbawgo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TFd7Wcr2ZSNG6eaPEXDROg_0qt1wZTi';
const TABLE = 'skyraider_scores';

const NAME_KEY = 'skyraider:nickname';
const CACHE_KEY = 'skyraider:scores-cache';
const CACHE_MS = 15000;

export const MAX_ENTRIES = 10;

export interface ScoreEntry {
  name: string;
  score: number;
  stage: number;
  cleared?: boolean;
  created_at?: string;
}

let memoryCache: { ts: number; rows: ScoreEntry[] } | null = null;

export function getNickname(): string {
  try {
    const v = localStorage.getItem(NAME_KEY);
    if (v && v.trim()) return v.trim().slice(0, 16);
  } catch {
    // ignore
  }
  return 'PLAYER';
}

export function setNickname(name: string): string {
  const cleaned = (name || '').trim().slice(0, 16) || 'PLAYER';
  try {
    localStorage.setItem(NAME_KEY, cleaned);
  } catch {
    // ignore
  }
  return cleaned;
}

function loadCache(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCache(rows: ScoreEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

// 取 TOP N 排行榜（跨所有關卡，依分數排序）
export async function fetchTop(limit = MAX_ENTRIES): Promise<ScoreEntry[]> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.ts < CACHE_MS) {
    return memoryCache.rows;
  }
  try {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=name,score,stage,cleared,created_at&order=score.desc,created_at.asc&limit=${limit}`;
    const resp = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rows = (await resp.json()) as ScoreEntry[];
    memoryCache = { ts: now, rows };
    saveCache(rows);
    return rows;
  } catch (err) {
    console.warn('[leaderboard] fetchTop fail', err);
    return memoryCache?.rows ?? loadCache();
  }
}

export async function submitScore(entry: {
  name: string;
  score: number;
  stage: number;
  cleared: boolean;
}): Promise<boolean> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: String(entry.name).slice(0, 16),
        score: Math.max(0, Math.floor(entry.score)),
        stage: Math.max(1, Math.floor(entry.stage)),
        cleared: !!entry.cleared,
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status} ${text}`);
    }
    memoryCache = null; // 清快取，下次重新抓
    return true;
  } catch (err) {
    console.warn('[leaderboard] submit fail', err);
    return false;
  }
}
