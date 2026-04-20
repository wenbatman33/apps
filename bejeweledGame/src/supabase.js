// ===========================================================================
// Supabase 排行榜設定
// ---------------------------------------------------------------------------
// 使用流程：
//   1. https://supabase.com 免費註冊（可 GitHub 登入）
//   2. 建立新專案，region 建議選 Tokyo/Singapore（台灣較近）
//   3. 進 SQL Editor 執行 README 最下方的 SQL 建立 scores 表
//   4. Settings → API，複製 Project URL + anon public key 填到下方
//   5. Commit + push，遊戲自動啟用雲端排行榜
//
// 若 SUPABASE_URL 留空，遊戲會 fallback 使用 localStorage（現有行為）。
// anon key 是公開的、可以直接 commit 上 GitHub，安全性靠資料表的
// Row Level Security (RLS) 擋作弊——詳見下方 SQL。
// ===========================================================================

export const SUPABASE_URL      = "https://igqpwzldgqocazlbawgo.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncXB3emxkZ3FvY2F6bGJhd2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwNzYsImV4cCI6MjA5MjI2MDA3Nn0.XaUtO_11MKbJFgDJvUnelwdwOXgbRKQqmd-lUNw8NwE";

export const REMOTE_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// --- Supabase REST API 最小封裝（不依賴 @supabase/supabase-js）---

function headers(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json",
    ...extra,
  };
}

// table: 資料表名，query: PostgREST 查詢字串（不含前置 "?"）
export async function sbSelect(table, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? "?" + query : ""}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase select ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function sbInsert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase insert ${res.status}: ${await res.text()}`);
}

// 取得比指定分數高的筆數（用來算全球排名）
export async function sbCountHigher(table, mode, score) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?mode=eq.${mode}&score=gt.${score}&select=id`;
  const res = await fetch(url, { headers: headers({ Prefer: "count=exact", Range: "0-0" }) });
  if (!res.ok) throw new Error(`Supabase count ${res.status}`);
  // Content-Range: "0-0/42" 或 "*/42"
  const range = res.headers.get("Content-Range") || "";
  const total = parseInt(range.split("/")[1], 10);
  return Number.isFinite(total) ? total : 0;
}
