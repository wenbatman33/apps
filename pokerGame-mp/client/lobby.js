// ============================================================
// 多人德州撲克 — 大廳邏輯
// ============================================================

const state = {
  playerName: '',
};

function serverOrigin() {
  return window.location.origin;
}

function toast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
}

function goToGame(matchID, playerID, playerCredentials) {
  const params = new URLSearchParams({
    matchID,
    playerID,
    playerCredentials,
    playerName: state.playerName,
  });
  window.location.href = '/game.html?' + params.toString();
}

// ── 確認名字 ──
window.confirmName = function () {
  const name = (document.getElementById('input-name')?.value || '').trim();
  if (!name) { toast('請輸入名字'); return; }
  state.playerName = name;
  showScreen('lobby');
};

// ── 建立房間 → 立即進入遊戲 ──
window.createRoom = async function () {
  if (!state.playerName) { toast('請先輸入名字'); showScreen('name'); return; }

  const btn = document.querySelector('#screen-lobby .btn-gold');
  if (btn) btn.textContent = '建立中...';

  try {
    const res = await fetch(`${serverOrigin()}/games/poker/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numPlayers: 6 }),
    });
    if (!res.ok) throw new Error('建立失敗 ' + res.status);
    const { matchID } = await res.json();

    const joinRes = await fetch(`${serverOrigin()}/games/poker/${matchID}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerID: '0', playerName: state.playerName }),
    });
    if (!joinRes.ok) throw new Error('加入失敗 ' + joinRes.status);
    const { playerCredentials } = await joinRes.json();

    goToGame(matchID, '0', playerCredentials);
  } catch (e) {
    toast('建立失敗：' + e.message);
    if (btn) btn.textContent = '建立新房間';
  }
};

// ── 加入房間 → 立即進入遊戲 ──
window.joinRoom = async function () {
  if (!state.playerName) { toast('請先輸入名字'); showScreen('name'); return; }

  const code = (document.getElementById('input-code')?.value || '').trim();
  if (code.length < 4) { toast('請輸入正確的邀請碼'); return; }

  const btn = document.querySelector('#screen-lobby .btn-outline');
  if (btn) btn.textContent = '加入中...';

  try {
    const infoRes = await fetch(`${serverOrigin()}/games/poker/${code}`);
    if (!infoRes.ok) {
      if (infoRes.status === 404) throw new Error('找不到此房間，請確認邀請碼');
      throw new Error('查詢失敗 ' + infoRes.status);
    }
    const matchInfo = await infoRes.json();

    const players = matchInfo.players || [];
    let emptySlot = null;
    for (const p of players) {
      if (!p.name) { emptySlot = String(p.id); break; }
    }
    if (emptySlot === null) { toast('房間已滿'); return; }

    const joinRes = await fetch(`${serverOrigin()}/games/poker/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerID: emptySlot, playerName: state.playerName }),
    });
    if (!joinRes.ok) throw new Error('加入失敗 ' + joinRes.status);
    const { playerCredentials } = await joinRes.json();

    goToGame(code, emptySlot, playerCredentials);
  } catch (e) {
    toast('加入失敗：' + e.message);
    if (btn) btn.textContent = '加入房間';
  }
};

// ── Enter 鍵 ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('input-name')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') window.confirmName(); });
  document.getElementById('input-code')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') window.joinRoom(); });
});
