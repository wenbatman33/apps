// 9 號球網路對戰 - 沿用 pongFootball 的配對模式
// 主機權威：每次擊球由「擊球方」做物理模擬，結束後廣播最終球位 / 事件給對方
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseConfig.js";

let supabase = null;
let lobbyChan = null;
let gameChan = null;
let role = null;          // 'host' | 'client'
let myId = null;
let myName = null;
let opponentName = null;
let roomCode = null;
let matched = false;
let cbs = {};

async function loadLib() {
  if (supabase) return supabase;
  const mod = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 30 } },
  });
  return supabase;
}

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function joinLobby(name, callbacks = {}) {
  myName = name || "玩家";
  myId = Math.random().toString(36).slice(2, 12);
  opponentName = null;
  roomCode = null;
  matched = false;
  role = null;
  cbs = { ...callbacks };

  await loadLib();
  lobbyChan = supabase.channel("nineball-lobby", {
    config: { presence: { key: myId } },
  });

  let committed = false;

  const tryMatch = async () => {
    if (committed) return;
    const presState = lobbyChan.presenceState();
    const all = [];
    for (const id in presState) {
      const entries = presState[id];
      if (!entries || !entries.length) continue;
      const latest = entries[entries.length - 1];
      all.push({ ...latest, id });
    }
    const waiter = all.find(x => x.role === "waiting" && x.id !== myId);
    if (waiter) {
      committed = true;
      opponentName = waiter.name;
      roomCode = waiter.roomCode;
      try { lobbyChan.untrack(); lobbyChan.unsubscribe(); } catch {}
      lobbyChan = null;
      startGameChannel("client");
      return;
    }
    // 沒 waiter：升級自己為 waiting
    const lookers = all.filter(x => x.role === "looking");
    if (lookers.length === 0) return;
    lookers.sort((a, b) => a.id.localeCompare(b.id));
    if (lookers[0].id === myId) {
      committed = true;
      roomCode = genCode();
      await lobbyChan.track({ role: "waiting", name: myName, roomCode });
      startGameChannel("host");
    }
  };

  lobbyChan.on("presence", { event: "sync" }, tryMatch);
  lobbyChan.on("presence", { event: "join" }, tryMatch);

  await new Promise((resolve) => {
    lobbyChan.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await lobbyChan.track({ role: "looking", name: myName });
        resolve();
      }
    });
  });
}

function startGameChannel(asRole) {
  role = asRole;
  gameChan = supabase.channel(`nineball-${roomCode}`, {
    config: { presence: { key: myId }, broadcast: { self: false } },
  });

  gameChan.on("broadcast", { event: "state" }, ({ payload }) => {
    if (cbs.onState) cbs.onState(payload);
  });
  gameChan.on("broadcast", { event: "shot" }, ({ payload }) => {
    if (cbs.onShot) cbs.onShot(payload);
  });
  gameChan.on("broadcast", { event: "place" }, ({ payload }) => {
    if (cbs.onPlaceCue) cbs.onPlaceCue(payload);
  });
  gameChan.on("broadcast", { event: "chat" }, ({ payload }) => {
    if (cbs.onChat) cbs.onChat(payload);
  });
  gameChan.on("presence", { event: "join" }, () => {
    if (!matched) {
      // 對方進入
      matched = true;
      if (cbs.onMatched) cbs.onMatched({ role, opponentName, myName, roomCode });
    }
  });
  gameChan.on("presence", { event: "leave" }, () => {
    if (cbs.onOpponentLeft) cbs.onOpponentLeft();
  });

  gameChan.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await gameChan.track({ name: myName });
      // host 看到 client 就會在 join 事件觸發 matched；若是先進者等 join。
      // 為了保險，在 subscribe 後若對面已在場也視為 matched
      setTimeout(() => {
        const st = gameChan.presenceState();
        const cnt = Object.keys(st).length;
        if (cnt >= 2 && !matched) {
          matched = true;
          if (cbs.onMatched) cbs.onMatched({ role, opponentName, myName, roomCode });
        }
      }, 500);
    }
  });
}

// GameScene 進來後重新掛 callbacks（Menu 配對完成後 Scene 切換）
export function __setCallbacks(newCbs) {
  cbs = { ...cbs, ...newCbs };
}

export function sendState(payload) {
  if (!gameChan) return;
  gameChan.send({ type: "broadcast", event: "state", payload });
}
export function sendShot(payload) {
  if (!gameChan) return;
  gameChan.send({ type: "broadcast", event: "shot", payload });
}
export function sendPlaceCue(payload) {
  if (!gameChan) return;
  gameChan.send({ type: "broadcast", event: "place", payload });
}
export function leave() {
  try { if (lobbyChan) { lobbyChan.untrack(); lobbyChan.unsubscribe(); } } catch {}
  try { if (gameChan) { gameChan.untrack(); gameChan.unsubscribe(); } } catch {}
  lobbyChan = null; gameChan = null; matched = false;
}
