// Supabase Realtime 網路對戰（host-authoritative）
// 配對流程：
//   1) joinLobby 在 pong-lobby channel 用 presence 宣告自己 looking / waiting
//   2) 最小 id 的 looker 升級為 waiting + 直接訂閱 pong-<code> 當 host 等人
//   3) 其他 looker 看到 waiter → 離開 lobby，訂閱 pong-<code> 當 client
//   4) host 偵測到 game channel 有對方 presence join → 配對成功
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseConfig.js";

let supabase = null;
let lobbyChan = null;
let gameChan = null;
let role = null;
let myId = null;
let myName = null;
let opponentName = null;
let roomCode = null;
let matched = false;

let cbs = {};

async function loadLib() {
  if (supabase) return supabase;
  if (!SUPABASE_URL) throw new Error("未設定 Supabase");
  const mod = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 30 } },
  });
  return supabase;
}

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ---------- Lobby 配對 ----------

export async function joinLobby(name, callbacks = {}) {
  myName = name || "玩家";
  myId = Math.random().toString(36).slice(2, 12);
  opponentName = null;
  roomCode = null;
  matched = false;
  role = null;
  cbs = { ...cbs, ...callbacks };

  await loadLib();
  lobbyChan = supabase.channel("pong-lobby", {
    config: { presence: { key: myId } },
  });

  let myState = null;        // 'looking' | 'waiting'
  let committed = false;     // 已決定成為 host 或 client

  const track = async (nextState) => {
    myState = nextState.role;
    await lobbyChan.track(nextState);
  };

  const tryMatch = async () => {
    if (committed) return;
    const presState = lobbyChan.presenceState();
    // 每個 id 取最新 entry（Supabase 會累積）
    const all = [];
    for (const id in presState) {
      const entries = presState[id];
      if (!entries || !entries.length) continue;
      const latest = entries[entries.length - 1];
      all.push({ ...latest, id });
    }

    // 如果發現有 waiter（可能是別人）→ 我當 client
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

    // 沒 waiter：看我是不是最小 id 的 looker → 我升 waiting
    if (myState === "looking") {
      const lookers = all.filter(x => x.role === "looking");
      lookers.sort((a, b) => a.id.localeCompare(b.id));
      if (lookers[0] && lookers[0].id === myId) {
        const code = genCode();
        roomCode = code;
        await track({
          name: myName, role: "waiting", roomCode: code, ts: Date.now(),
        });
        // 直接開遊戲房當 host 等人
        committed = true;
        startGameChannel("host");
        // 注意：暫不 unsubscribe lobby，讓他人能看到我是 waiter
        // 等 host 收到對方 presence join → 才 finishLobby
      }
    }
  };

  lobbyChan.on("presence", { event: "sync" }, tryMatch);
  lobbyChan.on("presence", { event: "join" }, tryMatch);

  await lobbyChan.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await track({
        name: myName, role: "looking", roomCode: null, ts: Date.now(),
      });
    }
  });
}

function finishLobby() {
  if (!lobbyChan) return;
  try { lobbyChan.untrack(); lobbyChan.unsubscribe(); } catch {}
  lobbyChan = null;
}

export function cancelMatchmaking() {
  finishLobby();
  if (gameChan) { try { gameChan.unsubscribe(); } catch {} gameChan = null; }
  role = null; roomCode = null; opponentName = null; matched = false;
}

// ---------- 遊戲房 ----------

function startGameChannel(asRole) {
  role = asRole;
  gameChan = supabase.channel(`pong-${roomCode}`, {
    config: {
      broadcast: { self: false },
      presence: { key: myId },
    },
  });

  gameChan.on("broadcast", { event: "input" }, ({ payload }) => {
    if (role === "host" && cbs.onInput) cbs.onInput(payload);
  });
  gameChan.on("broadcast", { event: "state" }, ({ payload }) => {
    if (role === "client" && cbs.onState) cbs.onState(payload);
  });
  gameChan.on("broadcast", { event: "ready" }, ({ payload }) => {
    if (cbs.onReady) cbs.onReady(payload);
  });
  gameChan.on("broadcast", { event: "surrender" }, ({ payload }) => {
    if (cbs.onSurrender) cbs.onSurrender(payload);
  });

  gameChan.on("presence", { event: "join" }, ({ key, newPresences }) => {
    if (key === myId) return;
    // host 等到 client 才算配對成功
    if (role === "host" && !matched) {
      matched = true;
      opponentName = newPresences[0]?.name || "對手";
      finishLobby();
      if (cbs.onMatched) cbs.onMatched({ role, opponentName, roomCode });
    }
  });
  gameChan.on("presence", { event: "leave" }, ({ key }) => {
    if (key !== myId && matched && cbs.onOpponentLeft) cbs.onOpponentLeft();
  });

  gameChan.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await gameChan.track({ name: myName, role });
      if (role === "client" && !matched) {
        matched = true;
        if (cbs.onMatched) cbs.onMatched({ role, opponentName, roomCode });
      }
    }
  });
}

// ---------- 收發事件 ----------

export function sendReady(isReady) {
  if (gameChan) gameChan.send({ type: "broadcast", event: "ready", payload: { ready: isReady, from: role } });
}

export function sendSurrender() {
  if (gameChan) gameChan.send({ type: "broadcast", event: "surrender", payload: { from: role } });
}

export function sendState(payload) {
  if (gameChan && role === "host") {
    gameChan.send({ type: "broadcast", event: "state", payload });
  }
}

export function sendInput(payload) {
  if (gameChan && role === "client") {
    gameChan.send({ type: "broadcast", event: "input", payload });
  }
}

export function leaveRoom() {
  finishLobby();
  if (gameChan) { try { gameChan.untrack(); gameChan.unsubscribe(); } catch {} gameChan = null; }
  role = null; roomCode = null; opponentName = null; matched = false;
}

export function getRole() { return role; }
export function getOpponentName() { return opponentName; }
export function getMyName() { return myName; }
