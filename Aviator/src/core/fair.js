// Provably Fair（可證明公平）
// 流程與 Crash 類遊戲標準做法一致：
//   1. 回合開始前先產生 serverSeed，只公布其 SHA-256「承諾雜湊」
//   2. 倍數由 SHA-256(serverSeed:clientSeed:nonce) 決定，開局前就已定案
//   3. 回合結束後公開 serverSeed，玩家可自行重算驗證
// 分佈：P(crash >= m) = RTP / m  → 期望回報率恰為 RTP（97%）

import { RULES } from '../config.js';

const enc = new TextEncoder();

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return toHex(buf);
}

export function randomSeed(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a.buffer);
}

// 由 hash 推出崩盤倍數（純函式，驗證頁也用同一支）
export function crashFromHash(hash) {
  // 取前 13 個 hex（52 bits）轉成 [0,1) 均勻亂數
  const h = parseInt(hash.slice(0, 13), 16);
  const r = h / 2 ** 52;
  const raw = RULES.rtp / (1 - r);
  if (!isFinite(raw) || raw < 1) return 1.0;
  const m = Math.round(raw * 100) / 100; // 四捨五入取到小數 2 位，避免取整偏差壓低 RTP
  return Math.min(m, RULES.maxMultiplier);
}

// 產生一回合的公平資料
export async function makeRound(clientSeed, nonce) {
  const serverSeed = randomSeed(16);
  const commit = await sha256Hex(serverSeed);
  const hash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return { serverSeed, commit, clientSeed, nonce, hash, crash: crashFromHash(hash) };
}

// 供驗證面板使用
export async function verify(serverSeed, clientSeed, nonce) {
  const hash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return { hash, crash: crashFromHash(hash), commit: await sha256Hex(serverSeed) };
}
