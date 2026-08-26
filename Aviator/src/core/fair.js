// Provably Fair（可证明公平）
// 流程与 Crash 类游戏标准做法一致：
//   1. 回合开始前先产生 serverSeed，只公布其 SHA-256「承诺哈希」
//   2. 倍数由 SHA-256(serverSeed:clientSeed:nonce) 决定，开局前就已定案
//   3. 回合结束后公开 serverSeed，玩家可自行重算验证
// 分布：P(crash >= m) = RTP / m  → 期望回报率恰为 RTP（97%）

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

// 由 hash 推出崩盘倍数（纯函数，验证页也用同一支）
export function crashFromHash(hash) {
  // 取前 13 个 hex（52 bits）转成 [0,1) 均匀乱数
  const h = parseInt(hash.slice(0, 13), 16);
  const r = h / 2 ** 52;
  const raw = RULES.rtp / (1 - r);
  if (!isFinite(raw) || raw < 1) return 1.0;
  const m = Math.round(raw * 100) / 100; // 四舍五入取到小数 2 位，避免取整偏差压低 RTP
  return Math.min(m, RULES.maxMultiplier);
}

// 产生一回合的公平数据
export async function makeRound(clientSeed, nonce) {
  const serverSeed = randomSeed(16);
  const commit = await sha256Hex(serverSeed);
  const hash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return { serverSeed, commit, clientSeed, nonce, hash, crash: crashFromHash(hash) };
}

// 供验证面板使用
export async function verify(serverSeed, clientSeed, nonce) {
  const hash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return { hash, crash: crashFromHash(hash), commit: await sha256Hex(serverSeed) };
}
