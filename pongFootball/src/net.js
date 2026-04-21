// Supabase Realtime 網路對戰（host-authoritative）
// host 跑物理、每 50ms broadcast 全狀態；client 送自己的 paddleY。
// 用 Broadcast channel（最輕量、不寫資料庫），房間名 = pong-<ROOM>
// 需要透過 CDN 動態 import supabase-js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseConfig.js";

let supabase = null;
let channel = null;
let role = null;        // 'host' | 'client'
let onRemoteState = null;
let onRemoteInput = null;
let onOpponentJoin = null;

async function loadLib() {
  if (supabase) return supabase;
  if (!SUPABASE_URL) throw new Error("未設定 Supabase");
  const mod = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 30 } },
  });
  return supabase;
}

export function genRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export async function hostRoom(code, callbacks) {
  role = "host";
  onRemoteInput = callbacks.onInput;
  onOpponentJoin = callbacks.onJoin;
  await loadLib();
  channel = supabase.channel(`pong-${code}`, { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "input" }, ({ payload }) => {
    if (onRemoteInput) onRemoteInput(payload);
  });
  channel.on("broadcast", { event: "join" }, ({ payload }) => {
    if (onOpponentJoin) onOpponentJoin(payload);
    channel.send({ type: "broadcast", event: "hello", payload: { role: "host" } });
  });
  await channel.subscribe();
  return { role: "host", code };
}

export async function joinRoom(code, callbacks) {
  role = "client";
  onRemoteState = callbacks.onState;
  await loadLib();
  channel = supabase.channel(`pong-${code}`, { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "state" }, ({ payload }) => {
    if (onRemoteState) onRemoteState(payload);
  });
  let joined = false;
  channel.on("broadcast", { event: "hello" }, () => { joined = true; });
  await channel.subscribe();
  await channel.send({ type: "broadcast", event: "join", payload: { t: Date.now() } });
  // 等待 host hello
  const start = Date.now();
  while (!joined && Date.now() - start < 5000) {
    await new Promise(r => setTimeout(r, 100));
  }
  return { role: "client", code, connected: joined };
}

export function sendState(payload) {
  if (channel && role === "host") {
    channel.send({ type: "broadcast", event: "state", payload });
  }
}

export function sendInput(payload) {
  if (channel && role === "client") {
    channel.send({ type: "broadcast", event: "input", payload });
  }
}

export function leaveRoom() {
  if (channel) { channel.unsubscribe(); channel = null; }
  role = null;
}

export function getRole() { return role; }
