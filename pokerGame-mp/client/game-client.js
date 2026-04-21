// ============================================================
// Poker Royale MP — PixiJS + Boardgame.io（以原版 game.js 為底，
// 僅替換狀態來源（G/ctx）與動作觸發（client.moves）
// ============================================================

import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { PokerGame } from '../src/poker.js';

// ── URL 參數 ──
const urlParams = new URLSearchParams(window.location.search);
const MATCH_ID      = urlParams.get('matchID');
const MY_PLAYER_ID  = urlParams.get('playerID');
const PLAYER_CREDS  = urlParams.get('playerCredentials');
const MY_NAME       = urlParams.get('playerName') || ('玩家' + MY_PLAYER_ID);

if (!MATCH_ID || !MY_PLAYER_ID) {
    alert('缺少必要參數，返回首頁');
    window.location.href = '/';
}

// ============================================================
// 常數（與原版一致，最多 6 人）
// ============================================================
const W = 450, H = 950;
const SUITS = ['Hearts','Diamonds','Club','Spades'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const TURN_TIME = 30;
const NUM_PLAYERS = 6;           // MP 版固定 6 人座位

// 6 人座位：自己永遠在底部（seat 0），其他依順時針排列
const SEAT_POS = [
    {x:225, y:760},   // 0 YOU 底部
    {x: 70, y:620},   // 1 左下
    {x: 55, y:400},   // 2 左上
    {x:225, y:195},   // 3 頂部
    {x:395, y:400},   // 4 右上
    {x:380, y:620},   // 5 右下
];
const BET_OFFSET = [
    {x:  0, y:-52},
    {x: 55, y:-14},
    {x: 55, y: 14},
    {x:  0, y: 45},
    {x:-55, y: 14},
    {x:-55, y:-14},
];

// ============================================================
// 設計系統（照搬原版）
// ============================================================
const DS = {
    bgDeep:0x04060E, bgBase:0x070A14, bgRadialCn:0x14213A,
    felt:0x0F4A45, feltVignette:0x1B6760, feltRim:0x0A332F,
    gold1:0x6E4A1A, gold2:0xD4A24C, gold3:0xF2D58A,
    fold:0xC8453A, foldDark:0x8B2820, foldLight:0xE2685D,
    call:0x3FA86A, callDark:0x1F6A3F, callLight:0x5FCB89,
    raise:0xE8862A, raiseDark:0x9B520F, raiseLight:0xF7A857,
    suitRed:0xD7263D, suitBlack:0x0B0F1A,
    fg1:0xF4ECD8,
    glass:0x0D1220, glassStroke:0xFFFFFF,
};
const COLOR = {
    fg1:'#F4ECD8', fg2:'#BDB59D', fg3:'#7C7665',
    gold1:'#6E4A1A', gold2:'#D4A24C', gold3:'#F2D58A',
    suitRed:'#D7263D', suitBlk:'#0B0F1A',
    fold:'#E89890', call:'#9FE2BB', raise:'#FFD2A0',
};
const FONT_UI   = 'Inter, "Noto Sans TC", system-ui, sans-serif';
const FONT_DISP = '"Cormorant Garamond", "Noto Sans TC", serif';

// ============================================================
// 音效（照搬原版）
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio(){ if(!audioCtx) audioCtx = new AudioCtx(); if(audioCtx.state === 'suspended') audioCtx.resume(); }
function mkNoise(c,d){ const n=c.sampleRate*d, b=c.createBuffer(1,n,c.sampleRate), a=b.getChannelData(0); for(let i=0;i<n;i++) a[i]=Math.random()*2-1; const s=c.createBufferSource(); s.buffer=b; return s; }
function playSound(t){ try{ ensureAudio(); const c=audioCtx, n=c.currentTime;
if(t==='card-deal'){const s=mkNoise(c,.06),f=c.createBiquadFilter();f.type='highpass';f.frequency.value=3000;const g=c.createGain();g.gain.setValueAtTime(.3,n);g.gain.exponentialRampToValueAtTime(.001,n+.06);s.connect(f).connect(g).connect(c.destination);s.start(n);s.stop(n+.06);}
else if(t==='card-flip'){const s=mkNoise(c,.12),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=2000;f.Q.value=2;const g=c.createGain();g.gain.setValueAtTime(.25,n);g.gain.exponentialRampToValueAtTime(.001,n+.12);s.connect(f).connect(g).connect(c.destination);s.start(n);s.stop(n+.12);}
else if(t==='chip'){const o=c.createOscillator();o.frequency.setValueAtTime(800,n);o.frequency.exponentialRampToValueAtTime(200,n+.08);const g=c.createGain();g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.1);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.1);}
else if(t==='check'){const o=c.createOscillator();o.frequency.setValueAtTime(300,n);o.frequency.exponentialRampToValueAtTime(100,n+.05);const g=c.createGain();g.gain.setValueAtTime(.2,n);g.gain.exponentialRampToValueAtTime(.001,n+.08);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.08);}
else if(t==='fold'){const s=mkNoise(c,.15),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=800;const g=c.createGain();g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.15);s.connect(f).connect(g).connect(c.destination);s.start(n);s.stop(n+.15);}
else if(t==='win'){[0,.12,.24,.36].forEach((t2,i)=>{const o=c.createOscillator();o.type='triangle';o.frequency.value=[523,659,784,1047][i];const g=c.createGain();g.gain.setValueAtTime(0,n+t2);g.gain.linearRampToValueAtTime(.2,n+t2+.02);g.gain.exponentialRampToValueAtTime(.001,n+t2+.15);o.connect(g).connect(c.destination);o.start(n+t2);o.stop(n+t2+.15);});}
else if(t==='lose'){[0,.15].forEach((t2,i)=>{const o=c.createOscillator();o.type='triangle';o.frequency.value=[400,250][i];const g=c.createGain();g.gain.setValueAtTime(0,n+t2);g.gain.linearRampToValueAtTime(.2,n+t2+.02);g.gain.exponentialRampToValueAtTime(.001,n+t2+.3);o.connect(g).connect(c.destination);o.start(n+t2);o.stop(n+t2+.3);});}
else if(t==='allin'){const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(440,n);o.frequency.setValueAtTime(880,n+.1);const g=c.createGain();g.gain.setValueAtTime(.1,n);g.gain.exponentialRampToValueAtTime(.001,n+.3);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.3);}
else if(t==='button'){const o=c.createOscillator();o.frequency.value=500;const g=c.createGain();g.gain.setValueAtTime(.1,n);g.gain.exponentialRampToValueAtTime(.001,n+.05);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.05);}
else if(t==='turn-alert'){const o=c.createOscillator();o.frequency.value=660;const g=c.createGain();g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.2);o.connect(g).connect(c.destination);o.start(n);o.stop(n+.2);}
}catch(e){} }

// ============================================================
// 本地 shadow state（映射自 G；沿用原版結構讓 UI 函式不變）
// ============================================================
let gameState = {
    // 對映自 G
    communityCards: [],
    players: [],             // [{id, pid, name, chips, hand, bet, folded, allIn, isHuman, isActive, broke}, ...] index=seat
    pot: 0,
    dealerIndex: 0,          // seat index
    currentPlayerIndex: -1,  // seat index；-1 = 無人行動
    phase: 'waiting',
    currentBet: 0,
    minRaise: 100,
    handNumber: 0,
    // 本地 UI 旗標
    isRunning: false,
    isPaused: false,
    actionLock: false,
    turnTimer: null,
    turnTimeLeft: TURN_TIME,
    preAction: null,
};

let SMALL_BLIND = 50, BIG_BLIND = 100;

// ============================================================
// PixiJS 全域
// ============================================================
let app, tex={};
let screens = {};
let seatUI = [], communityUI = [];
let potText, msgC, msgT, timerText, timerBar, actionBar, raisePanel;
let topBarTexts = {};
let bgClient;                        // boardgame.io Client
let prevG = null;                    // 用來偵測 state 差異做動畫
let nameSent = false;
let animatingDeal = false;

// pid → seat index
function seatIdxForPid(pid, G) {
    if (!G || !G.players) return -1;
    if (pid === MY_PLAYER_ID) return 0;
    const myIdx  = G.players.indexOf(MY_PLAYER_ID);
    const pidIdx = G.players.indexOf(pid);
    if (myIdx < 0 || pidIdx < 0) return -1;
    const N = G.players.length;
    return ((pidIdx - myIdx) % N + N) % N;
}

// ============================================================
// 啟動
// ============================================================
async function init(){
    app = new PIXI.Application({ width:W, height:H, backgroundColor:DS.bgBase, antialias:true, resolution:window.devicePixelRatio||1, autoDensity:true });
    document.body.appendChild(app.view);
    const resize = () => {
        const s = Math.min(window.innerWidth/W, window.innerHeight/H);
        app.view.style.width  = W*s + 'px';
        app.view.style.height = H*s + 'px';
        app.view.style.position = 'absolute';
        app.view.style.left = (window.innerWidth - W*s)/2 + 'px';
        app.view.style.top  = (window.innerHeight - H*s)/2 + 'px';
    };
    window.addEventListener('resize', resize); resize();

    await loadAssets();
    buildGameScreen();
    buildResultOverlay();
    buildPauseOverlay();
    // MP 版不使用買入面板（下一版再加）
    showScreen('game');
    app.ticker.add(dt => updateTweens(dt));

    startClient();
}

async function loadAssets(){
    try{ tex.table_royale = await PIXI.Assets.load('assets/table_royale.jpg'); }catch(e){}
}

// ============================================================
// Boardgame.io client 初始化
// ============================================================
function startClient(){
    const serverURL = window.location.origin;
    bgClient = Client({
        game: PokerGame,
        multiplayer: SocketIO({ server: serverURL }),
        matchID: MATCH_ID,
        playerID: MY_PLAYER_ID,
        credentials: PLAYER_CREDS,
    });
    bgClient.start();
    bgClient.subscribe(onState);

    // 掛到 window 供等待室 HTML 按鈕呼叫
    window._client = bgClient;
    window.hostStartGame = function(){
        if (bgClient) bgClient.moves.startGame();
    };
    window.copyInviteCode = function(){
        navigator.clipboard.writeText(MATCH_ID)
            .then(()=>alert('邀請碼已複製：'+MATCH_ID))
            .catch(()=>alert('邀請碼：'+MATCH_ID));
    };
}

// ============================================================
// 核心：每次 state 更新 → 映射 G → 呼叫 UI 更新函式
// ============================================================
function onState(state){
    if (!state) return;

    // 第一次收到 state → 隱藏連線中遮罩
    const conn = document.getElementById('connecting');
    if (conn && !conn.classList.contains('hide')){
        conn.classList.add('hide');
        setTimeout(()=>conn.remove(), 600);
    }

    // 第一次收到 → 送出名字
    if (!nameSent){
        nameSent = true;
        setTimeout(()=>{ try{ bgClient.moves.setName(MY_NAME); }catch(e){} }, 200);
    }

    const G = state.G;
    mapGToLocal(G);
    renderFromState(G, prevG);
    prevG = JSON.parse(JSON.stringify(G));  // 保存前一份，用來偵測差異
}

// G → gameState（保留原版形狀讓所有 UI 函式不用改）
function mapGToLocal(G){
    SMALL_BLIND = G.smallBlind || 50;
    BIG_BLIND   = G.bigBlind   || 100;

    gameState.pot = G.pot || 0;
    gameState.currentBet = G.currentBet || 0;
    gameState.minRaise = G.bigBlind || 100;
    gameState.phase = G.phase;
    gameState.handNumber = G.handNumber || 0;
    gameState.communityCards = (G.community || []).filter(c => c && c.suit && c.rank);

    // 清空座位，再依據 G.players 填入
    const players = [];
    for (let i=0; i<NUM_PLAYERS; i++){
        players.push({ id:i, pid:null, name:'', chips:0, hand:[], bet:0, folded:false, allIn:false,
            isHuman:(i===0), isActive:false, broke:false, photoUrl:null });
    }
    (G.players || []).forEach(pid => {
        const seat = seatIdxForPid(pid, G);
        if (seat < 0 || seat >= NUM_PLAYERS) return;
        const p = players[seat];
        p.pid = pid;
        p.name = G.playerNames?.[pid] || ('玩家'+pid);
        p.chips = G.chips?.[pid] || 0;
        p.bet = G.bets?.[pid] || 0;
        p.folded = !!G.folded?.[pid];
        p.allIn = !!G.allIn?.[pid];
        p.isActive = p.chips > 0 || p.bet > 0;
        p.broke = p.chips <= 0 && !p.hand?.length;
        // 手牌：只有自己看得到真牌；其他人依 G.hands[pid] 有 hidden 標記
        const raw = G.hands?.[pid] || [];
        if (pid === MY_PLAYER_ID){
            p.hand = raw.filter(c => c && c.suit && c.rank);
        } else {
            p.hand = raw.map(c => (c && c.suit) ? c : { hidden:true });
        }
    });
    gameState.players = players;

    // 莊家座位
    const dealerPid = G.players?.[G.dealer];
    gameState.dealerIndex = dealerPid != null ? seatIdxForPid(dealerPid, G) : -1;

    // 目前行動玩家座位
    gameState.currentPlayerIndex = G.activePlayer != null ? seatIdxForPid(G.activePlayer, G) : -1;

    // 遊戲進行中旗標
    gameState.isRunning = (G.phase && G.phase !== 'waiting');
}

// 狀態 → UI（含差異動畫）
function renderFromState(G, pG){
    const phase = G.phase || 'waiting';

    // ── 1. 等待室顯示/隱藏 ──
    const wr = document.getElementById('waiting-room');
    if (phase === 'waiting'){
        // 等待中：顯示等待室，隱藏 canvas
        if (wr) wr.classList.add('show');
        if (app?.view) app.view.style.display = 'none';
        updateWaitingRoom(G);
        return;
    } else {
        if (wr) wr.classList.remove('show');
        if (app?.view) app.view.style.display = '';
    }

    // ── 2. 牌局動畫：階段變化 ──
    const prevPhase = pG?.phase;

    // 開局：preflop 剛開始 → 發牌動畫
    if (prevPhase !== 'preflop' && phase === 'preflop'){
        clearUI();
        updateSeats();
        showDealer();
        updatePot();
        updateBets();
        animateDeal();
    }
    // 翻牌 / 轉牌 / 河牌：公共牌張數變多 → 動畫翻牌
    else if (G.community?.length > (pG?.community?.length || 0)){
        const old = pG?.community?.length || 0;
        revealCC(G.community.length - old);
    }
    // 結算
    else if (phase === 'showdown' && prevPhase !== 'showdown'){
        onShowdown(G, pG);
    }

    // ── 3. 一般 UI 更新 ──
    updateSeats();
    updatePot();
    updateBets();
    showDealer();
    setGlow(gameState.currentPlayerIndex);

    // Hand # 顯示
    if (topBarTexts.hand) topBarTexts.hand.text = '第 ' + (G.handNumber||0) + ' 局';
    // 盲注顯示
    if (topBarTexts.blinds) topBarTexts.blinds.text = `盲注  ${SMALL_BLIND} / ${BIG_BLIND}`;

    // ── 4. 行動區 ──
    if (phase === 'showdown'){
        hideAB();
        clearTimer();
        // 結算面板：由 onShowdown 處理
    } else if (gameState.currentPlayerIndex === 0 && !gameState.players[0]?.folded && !gameState.players[0]?.allIn){
        showAB();
        if (!gameState.turnTimer) startTimer();
    } else {
        hideAB();
        clearTimer();
    }
}

// 發牌動畫（由桌心飛到每個座位）
async function animateDeal(){
    animatingDeal = true;
    for (let c=0; c<2; c++){
        for (let i=0; i<NUM_PLAYERS; i++){
            const p = gameState.players[i];
            if (!p || !p.pid) continue;
            const s = seatUI[i];
            const cw = (i===0) ? 48 : 22;
            const ch = (i===0) ? 68 : 32;
            // 自己：正面牌；其他：牌背
            let sp;
            if (i===0){
                const card = p.hand[c];
                if (card && card.suit) sp = drawCardSprite(card.suit, card.rank, cw, ch);
                else sp = drawCardBack(cw, ch);
            } else {
                sp = drawCardBack(cw, ch);
            }
            const idx = s.cardSprites.length;
            const ox = (i===0) ? (idx - 0.5) * (cw + 6) : (idx - 0.5) * (cw - 4);
            const rot = (i===0) ? 0 : (idx === 0 ? -0.15 : 0.15);
            const sx = W/2 - s.container.x - s.cardsC.x;
            const sy = 430 - s.container.y - s.cardsC.y;
            sp.x = sx; sp.y = sy; sp.alpha = 0; sp.rotation = 0;
            s.cardsC.addChild(sp);
            s.cardSprites.push(sp);
            tweenTo(sp, { x:ox, y:0, alpha:1, rotation:rot }, 250, 'easeOut');
            playSound('card-deal');
            await sleep(40);
        }
    }
    animatingDeal = false;
}

// 公共牌翻牌動畫（n 張新牌）
async function revealCC(n){
    const total = gameState.communityCards.length;
    const from  = total - n;
    for (let i=0; i<n; i++){
        const idx  = from + i;
        const card = gameState.communityCards[idx];
        if (!card) continue;
        const slot = communityUI[idx];
        if (!slot) continue;
        if (slot.cardSprite) slot.container.removeChild(slot.cardSprite);
        slot.placeholder.visible = false;
        const sp = drawCardSprite(card.suit, card.rank, 32, 46);
        sp.scale.x = 0;
        slot.container.addChild(sp);
        slot.cardSprite = sp;
        playSound('card-flip');
        await tweenTo(sp.scale, { x:1 }, 250, 'easeOut');
        await sleep(80);
    }
}

// 結算：揭示對手牌 + 飛籌碼
function onShowdown(G){
    clearTimer();
    hideAB();

    // 公共牌若尚未全出，補齊顯示（server 可能略過後續圈發到 river）
    for (let i=0; i<(G.community?.length||0); i++){
        const slot = communityUI[i];
        if (!slot || slot.cardSprite) continue;
        const card = G.community[i];
        if (!card || !card.suit) continue;
        slot.placeholder.visible = false;
        const sp = drawCardSprite(card.suit, card.rank, 32, 46);
        slot.container.addChild(sp);
        slot.cardSprite = sp;
    }

    // 揭示其他玩家手牌
    for (let i=0; i<NUM_PLAYERS; i++){
        const p = gameState.players[i];
        if (!p || !p.pid || p.folded || i === 0) continue;
        const pid = p.pid;
        const raw = G.hands?.[pid] || [];
        const real = raw.filter(c => c && c.suit && c.rank);
        if (real.length === 0) continue;
        const s = seatUI[i];
        s.cardsC.removeChildren();
        s.cardSprites = [];
        for (let j=0; j<real.length; j++){
            const sp = drawCardSprite(real[j].suit, real[j].rank, 22, 32);
            sp.x = (j - 0.5) * 24;
            sp.rotation = 0;
            s.cardsC.addChild(sp);
            s.cardSprites.push(sp);
        }
    }
    playSound('card-flip');

    // 顯示贏家 + 飛籌碼 + 結果卡
    const winnerPid = G.winner;
    const winnerSeat = winnerPid != null ? seatIdxForPid(winnerPid, G) : -1;
    const winnerName = winnerPid != null ? (G.playerNames?.[winnerPid] || '玩家'+winnerPid) : '';
    const handName = G.winnerHand || '';
    const winAmount = (prevG?.pot || 0);

    if (winnerSeat >= 0){
        seatUI[winnerSeat].glow.visible = true;
        playSound(winnerSeat === 0 ? 'win' : 'lose');
        showMsg(winnerName + ' 獲勝' + (handName ? ' · ' + handName : ''));
        flyPotToWinner(winnerSeat);
        setTimeout(() => showResult(winnerSeat === 0, handName, winAmount), 1200);
    }
}

// 籌碼飛向贏家
function flyPotToWinner(wi){
    const stage = screens.game; if (!stage) return;
    const seat = seatUI[wi]; if (!seat) return;
    const tx = seat.container.x, ty = seat.container.y;
    const sx = W/2, sy = 540;
    const count = 8;
    for (let i=0; i<count; i++){
        const chip = new PIXI.Graphics();
        chip.beginFill(0x6E4A1A); chip.drawCircle(0,0,7); chip.endFill();
        chip.beginFill(0xD4A24C); chip.drawCircle(0,0,5.5); chip.endFill();
        chip.beginFill(0xF2D58A,0.6); chip.drawCircle(-1.5,-1.5,2.5); chip.endFill();
        chip.x = sx + (Math.random()-0.5) * 26;
        chip.y = sy + (Math.random()-0.5) * 14;
        chip.alpha = 0;
        stage.addChild(chip);
        const delay = i * 30;
        setTimeout(() => {
            tweenTo(chip, {alpha:1}, 80);
            tweenTo(chip, {x:tx, y:ty}, 520, 'easeOut').then(() => {
                tweenTo(chip, {alpha:0}, 120).then(() => stage.removeChild(chip));
            });
        }, delay);
    }
}

// 等待室（HTML 疊層）
function updateWaitingRoom(G){
    const list = document.getElementById('wr-player-list');
    const count = document.getElementById('wr-count');
    const btn = document.getElementById('btn-start');
    const hint = document.getElementById('wr-hint');
    const code = document.getElementById('wr-code');
    if (code) code.textContent = MATCH_ID;
    if (!list) return;
    list.innerHTML = '';
    const players = G.players || [];
    players.forEach(pid => {
        const name = G.playerNames?.[pid] || ('玩家'+pid);
        const chips = G.chips?.[pid] || 5000;
        const row = document.createElement('div');
        row.className = 'wr-player';
        const av = document.createElement('div'); av.className = 'wr-avatar'; av.textContent = name[0] || '?';
        const nm = document.createElement('div'); nm.className = 'wr-name'; nm.textContent = name;
        const ch = document.createElement('div'); ch.className = 'wr-chips'; ch.textContent = '$ ' + chips.toLocaleString();
        row.appendChild(av); row.appendChild(nm); row.appendChild(ch);
        if (pid === '0') {
            const bd = document.createElement('div'); bd.className = 'wr-badge'; bd.textContent = '房主';
            row.appendChild(bd);
        }
        if (pid === MY_PLAYER_ID) {
            const bd = document.createElement('div'); bd.className = 'wr-badge'; bd.textContent = 'YOU';
            row.appendChild(bd);
        }
        list.appendChild(row);
    });
    if (count) count.textContent = `${players.length} / 6 已入座`;
    // 房主（playerID='0'）且人數 >= 2 才顯示「開始」
    if (btn){
        const isHost = (MY_PLAYER_ID === '0');
        const canStart = isHost && players.length >= 2;
        btn.style.display = isHost ? 'block' : 'none';
        btn.disabled = !canStart;
        btn.style.opacity = canStart ? '1' : '0.5';
        btn.textContent = canStart ? '開始遊戲' : '開始遊戲（最少 2 人）';
    }
    if (hint) hint.textContent = '最少 2 人，最多 6 人';
}

// ============================================================
// Tween 系統（照搬原版）
// ============================================================
const tweens = [];
function tweenTo(o, p, d, e='linear'){
    return new Promise(r => {
        const s = {};
        for (const k in p) s[k] = o[k];
        tweens.push({ obj:o, start:s, end:p, duration:d, elapsed:0, ease:e, resolve:r });
    });
}
function updateTweens(dt){
    for (let i = tweens.length - 1; i >= 0; i--){
        const tw = tweens[i];
        tw.elapsed += dt * (1000/60);
        let t = Math.min(tw.elapsed / tw.duration, 1);
        if (tw.ease === 'easeOut') t = 1 - (1 - t) * (1 - t);
        for (const k in tw.end) tw.obj[k] = tw.start[k] + (tw.end[k] - tw.start[k]) * t;
        if (t >= 1){ tweens.splice(i, 1); tw.resolve(); }
    }
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// 繪製工具（照搬原版）
// ============================================================
function mkText(str, opts){ const t = new PIXI.Text(str, { fontFamily:FONT_UI, fill:COLOR.fg1, fontWeight:'600', ...opts }); t.anchor.set(0.5); return t; }
function mkDispText(str, opts){ const t = new PIXI.Text(str, { fontFamily:FONT_DISP, fill:COLOR.gold3, fontWeight:'700', ...opts }); t.anchor.set(0.5); return t; }

const SUIT_SYMBOLS = { Hearts:'♥', Diamonds:'♦', Club:'♣', Spades:'♠' };
const SUIT_COLORS  = { Hearts:COLOR.suitRed, Diamonds:COLOR.suitRed, Club:COLOR.suitBlk, Spades:COLOR.suitBlk };

function drawCardSprite(suit, rank, w, h){
    const c = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.45); bg.drawRoundedRect(-w/2+1, -h/2+2, w, h, Math.max(4, w*0.12)); bg.endFill();
    bg.beginFill(0xFBF6EA); bg.drawRoundedRect(-w/2, -h/2, w, h, Math.max(4, w*0.12)); bg.endFill();
    bg.lineStyle(1, 0xD4CCB4, 0.6); bg.drawRoundedRect(-w/2, -h/2, w, h, Math.max(4, w*0.12));
    c.addChild(bg);
    const color = SUIT_COLORS[suit] || COLOR.suitBlk;
    const sym   = SUIT_SYMBOLS[suit] || '?';
    const isSmall = w < 40;
    const topRank = new PIXI.Text(rank, { fontFamily:FONT_DISP, fontSize:isSmall?12:19, fontWeight:'700', fill:color });
    topRank.anchor.set(0.5); topRank.x = -w/2 + (isSmall?8:12); topRank.y = -h/2 + (isSmall?9:12);
    c.addChild(topRank);
    const topSuit = new PIXI.Text(sym, { fontSize:isSmall?9:13, fill:color, fontWeight:'700' });
    topSuit.anchor.set(0.5); topSuit.x = topRank.x; topSuit.y = topRank.y + (isSmall?10:13);
    c.addChild(topSuit);
    const centerSuit = new PIXI.Text(sym, { fontSize:isSmall?16:28, fill:color, fontWeight:'700' });
    centerSuit.anchor.set(0.5); centerSuit.y = isSmall?3:4;
    c.addChild(centerSuit);
    return c;
}

function drawCardBack(w, h){
    const c = new PIXI.Container();
    const r = Math.max(4, w*0.12);
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.45); bg.drawRoundedRect(-w/2+1, -h/2+2, w, h, r); bg.endFill();
    bg.beginFill(0x1B3D6B); bg.drawRoundedRect(-w/2, -h/2, w, h, r); bg.endFill();
    c.addChild(bg);
    const stripes = new PIXI.Graphics();
    stripes.lineStyle(1, 0x14315A, 0.9);
    for (let k=-w-h; k<w+h; k+=5){ stripes.moveTo(-w/2+k, -h/2); stripes.lineTo(-w/2+k+h, h/2); }
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff); mask.drawRoundedRect(-w/2, -h/2, w, h, r); mask.endFill();
    stripes.mask = mask; c.addChild(mask); c.addChild(stripes);
    const inner = new PIXI.Graphics();
    inner.lineStyle(1, DS.gold2, 0.75); inner.drawRoundedRect(-w/2+3, -h/2+3, w-6, h-6, Math.max(2, r-2));
    c.addChild(inner);
    return c;
}

const AVATAR_COLORS = [
    0x4488cc, 0xcc4444, 0x44aa44, 0xcc8844, 0x8844cc, 0xcc4488,
    0x44ccaa, 0xaaaa44, 0x6666aa, 0xaa6644,
];
function drawAvatar(size, playerIndex){
    const c = new PIXI.Container();
    const color = AVATAR_COLORS[playerIndex % AVATAR_COLORS.length];
    const bg = new PIXI.Graphics(); bg.beginFill(color, 0.3); bg.drawRoundedRect(-size, -size, size*2, size*2, 4); bg.endFill(); c.addChild(bg);
    const head = new PIXI.Graphics(); head.beginFill(color); head.drawCircle(0, -size*0.25, size*0.32); head.endFill(); c.addChild(head);
    const body = new PIXI.Graphics(); body.beginFill(color); body.drawEllipse(0, size*0.4, size*0.5, size*0.4); body.endFill(); c.addChild(body);
    return c;
}

function mkIconBtn(icon, x, y, size, cb){
    const c = new PIXI.Container(); c.x = x; c.y = y;
    const bg = new PIXI.Graphics();
    bg.lineStyle(1, 0xFFFFFF, 0.12); bg.beginFill(DS.glass, 0.72); bg.drawCircle(0, 0, size); bg.endFill();
    c.addChild(bg);
    const t = mkText(icon, { fontSize:size*0.85, fill:COLOR.gold3, fontWeight:'700' }); c.addChild(t);
    c.eventMode = 'static'; c.cursor = 'pointer';
    c.on('pointerdown', () => { playSound('button'); cb(); c.scale.set(0.94); });
    c.on('pointerup',   () => c.scale.set(1));
    c.on('pointerupoutside', () => c.scale.set(1));
    return c;
}

function drawDarkBg(container){
    const bg = new PIXI.Graphics(); bg.beginFill(DS.bgBase); bg.drawRect(0, 0, W, H); bg.endFill(); container.addChild(bg);
    const glow = new PIXI.Graphics();
    glow.beginFill(DS.bgRadialCn, 0.55); glow.drawEllipse(W/2, H*0.38, W*0.75, H*0.35); glow.endFill();
    glow.beginFill(DS.bgRadialCn, 0.3);  glow.drawEllipse(W/2, H*0.5,  W*0.55, H*0.28); glow.endFill();
    container.addChild(glow);
    const vig = new PIXI.Graphics();
    vig.beginFill(DS.bgDeep, 0.6); vig.drawRect(0, 0, W, H); vig.endFill();
    vig.beginHole(); vig.drawEllipse(W/2, H*0.5, W*0.85, H*0.55); vig.endHole();
    container.addChild(vig);
}

function drawVerticalTable(container){
    if (tex.table_royale){
        const sp = new PIXI.Sprite(tex.table_royale);
        sp.anchor.set(0.5, 0.5); sp.x = W/2; sp.y = H/2;
        const s = Math.max(W/sp.texture.width, H/sp.texture.height);
        sp.scale.set(s);
        container.addChild(sp);
        const mark = new PIXI.Text('P O K E R   R O Y A L E', { fontFamily:FONT_DISP, fontSize:10, fontWeight:'600', fill:COLOR.gold2, letterSpacing:4 });
        mark.anchor.set(0.5); mark.x = W/2; mark.y = 310; mark.alpha = 0.42;
        container.addChild(mark);
        return;
    }
    // fallback 向量繪製
    const cx = W/2, cy = 500, rx = 160, ry = 340;
    const rail = new PIXI.Graphics(); rail.beginFill(0x1A0E08); rail.drawEllipse(cx, cy, rx+24, ry+24); rail.endFill(); container.addChild(rail);
    const rim  = new PIXI.Graphics(); rim.lineStyle(4, DS.gold2, 0.9); rim.drawEllipse(cx, cy, rx+10, ry+10); container.addChild(rim);
    const felt = new PIXI.Graphics(); felt.beginFill(DS.felt); felt.drawEllipse(cx, cy, rx, ry); felt.endFill(); container.addChild(felt);
    const inner = new PIXI.Graphics(); inner.lineStyle(1.5, DS.gold2, 0.28); inner.drawEllipse(cx, cy, rx-30, ry-40); container.addChild(inner);
}

// ============================================================
// 金屬金按鈕工具（照搬原版）
// ============================================================
const GOLD_N = [0x6E4A1A, 0xD4A24C, 0xF2D58A];
function _lerpColor(a, b, t){
    const r1 = (a>>16)&0xFF, g1 = (a>>8)&0xFF, b1 = a&0xFF;
    const r2 = (b>>16)&0xFF, g2 = (b>>8)&0xFF, b2 = b&0xFF;
    return (Math.floor(r1+(r2-r1)*t)<<16) | (Math.floor(g1+(g2-g1)*t)<<8) | Math.floor(b1+(b2-b1)*t);
}
function _goldColorAt(t){
    if (t < 0.18) return _lerpColor(GOLD_N[0], GOLD_N[2], t/0.18);
    if (t < 0.5)  return _lerpColor(GOLD_N[2], GOLD_N[1], (t-0.18)/0.32);
    return _lerpColor(GOLD_N[1], GOLD_N[0], (t-0.5)/0.5);
}
function drawRadialBtn(_d, _m, _l, r){
    const g = new PIXI.Graphics();
    const steps = 72, bandH = (2*r)/steps;
    for (let i=0; i<steps; i++){
        const t = (i+0.5)/steps;
        const y = -r + i*bandH;
        const yc = y + bandH/2;
        const chord = Math.sqrt(Math.max(0, r*r - yc*yc));
        if (chord <= 0.5) continue;
        g.beginFill(_goldColorAt(t));
        g.drawRect(-chord, y, chord*2, bandH+0.5);
        g.endFill();
    }
    g.lineStyle(1, 0x000000, 0.55); g.drawCircle(0, 0, r);
    return g;
}
function drawGoldPill(w, h, radius){
    const g = new PIXI.Graphics();
    const steps = Math.max(48, Math.floor(h*2)), bandH = h/steps;
    const rOK = Math.min(radius, h/2, w/2);
    for (let i=0; i<steps; i++){
        const t = (i+0.5)/steps;
        const y = -h/2 + i*bandH;
        const yc = y + bandH/2;
        let dy = 0;
        if (yc < -h/2 + rOK) dy = (-h/2 + rOK) - yc;
        else if (yc > h/2 - rOK) dy = yc - (h/2 - rOK);
        const arcHalf = Math.sqrt(Math.max(0, rOK*rOK - dy*dy));
        const xHalf = (w/2 - rOK) + arcHalf;
        if (xHalf <= 0.5) continue;
        g.beginFill(_goldColorAt(t));
        g.drawRect(-xHalf, y, xHalf*2, bandH+0.5);
        g.endFill();
    }
    g.lineStyle(1, 0x000000, 0.55);
    g.drawRoundedRect(-w/2, -h/2, w, h, rOK);
    return g;
}
function mkActBtn(kind, label, r){
    const c = new PIXI.Container();
    c.addChild(drawRadialBtn(null, null, null, r));
    const ink = kind === 'fold' ? '#2A0A07' : kind === 'call' ? '#07210F' : '#2A1604';
    const t = new PIXI.Text(label, { fontFamily:FONT_UI, fontSize:12, fontWeight:'700', fill:ink, letterSpacing:1 });
    t.anchor.set(0.5); c.addChild(t);
    const sub = new PIXI.Text('', { fontFamily:FONT_UI, fontSize:8, fontWeight:'700', fill:ink, letterSpacing:0.3 });
    sub.anchor.set(0.5); sub.y = 9; sub.alpha = 0.8; c.addChild(sub);
    c.eventMode = 'static'; c.cursor = 'pointer';
    c._label = t; c._sub = sub;
    c.on('pointerdown', () => c.scale.set(0.94));
    c.on('pointerup',   () => c.scale.set(1));
    c.on('pointerupoutside', () => c.scale.set(1));
    return c;
}

// ============================================================
// 遊戲畫面（照搬原版）
// ============================================================
function buildGameScreen(){
    const c = new PIXI.Container(); c.visible = false; app.stage.addChild(c); screens.game = c;
    drawVerticalTable(c);

    // 頂部狀態列
    const topBarBg = new PIXI.Graphics();
    topBarBg.beginFill(DS.bgDeep, 0.82); topBarBg.drawRect(0, 0, W, 52); topBarBg.endFill();
    topBarBg.beginFill(DS.bgDeep, 0.35); topBarBg.drawRect(0, 52, W, 16); topBarBg.endFill();
    c.addChild(topBarBg);

    const topBar = new PIXI.Container(); topBar.y = 10; c.addChild(topBar);
    topBar.addChild(mkIconBtn('≡', 26, 16, 14, () => backToMenu()));
    topBar.addChild(mkIconBtn('＋', 60, 16, 14, () => {}));
    const pillC = new PIXI.Container(); pillC.x = W/2; pillC.y = 16; c.addChild(pillC);
    const pill = new PIXI.Graphics();
    pill.beginFill(DS.glass, 0.7); pill.drawRoundedRect(-58, -13, 116, 26, 13); pill.endFill();
    pill.lineStyle(1, 0xFFFFFF, 0.12); pill.drawRoundedRect(-58, -13, 116, 26, 13);
    pillC.addChild(pill);
    const dot = new PIXI.Graphics(); dot.beginFill(DS.call); dot.drawCircle(-42, 0, 3.5); dot.endFill(); pillC.addChild(dot);
    topBarTexts.hand = new PIXI.Text('第 0 局', { fontFamily:FONT_UI, fontSize:11, fontWeight:'600', fill:COLOR.fg2, letterSpacing:1.5 });
    topBarTexts.hand.anchor.set(0.5); topBarTexts.hand.x = 6; topBarTexts.hand.y = 0; pillC.addChild(topBarTexts.hand);
    topBar.addChild(mkIconBtn('ⓘ', W-60, 16, 14, () => {}));
    topBar.addChild(mkIconBtn('⚙', W-26, 16, 14, () => pauseGame()));

    topBarTexts.blinds = new PIXI.Text('盲注  50 / 100', { fontFamily:FONT_UI, fontSize:10, fontWeight:'600', fill:COLOR.fg3, letterSpacing:2 });
    topBarTexts.blinds.anchor.set(0.5, 0); topBarTexts.blinds.x = W/2; topBarTexts.blinds.y = 42; c.addChild(topBarTexts.blinds);

    // 公共牌
    communityUI = [];
    for (let i=0; i<5; i++){
        const slot = new PIXI.Container();
        slot.x = W/2 - 88 + i*44; slot.y = 450; c.addChild(slot);
        const ph = new PIXI.Graphics();
        ph.lineStyle(1, DS.gold2, 0.3); ph.beginFill(0x000000, 0.22);
        ph.drawRoundedRect(-16, -23, 32, 46, 4); ph.endFill();
        slot.addChild(ph);
        communityUI.push({ container:slot, placeholder:ph, cardSprite:null });
    }

    // 底池
    const potC = new PIXI.Container(); potC.x = W/2; potC.y = 540; c.addChild(potC);
    const potBg = new PIXI.Graphics();
    potBg.beginFill(0x000000, 0.55); potBg.drawRoundedRect(-75, -18, 150, 36, 18); potBg.endFill();
    potBg.lineStyle(1, DS.gold2, 0.55); potBg.drawRoundedRect(-75, -18, 150, 36, 18);
    potC.addChild(potBg);
    const potLabel = new PIXI.Text('底池', { fontFamily:FONT_UI, fontSize:11, fontWeight:'600', fill:COLOR.fg3, letterSpacing:2 });
    potLabel.anchor.set(0.5); potLabel.x = -44; potLabel.y = 0; potC.addChild(potLabel);
    const sep = new PIXI.Graphics(); sep.lineStyle(1, DS.gold2, 0.4); sep.moveTo(-26, -10); sep.lineTo(-26, 10); potC.addChild(sep);
    potText = new PIXI.Text('$ 0', { fontFamily:FONT_UI, fontSize:17, fontWeight:'700', fill:COLOR.gold3 });
    potText.anchor.set(0.5); potText.x = 20; potText.y = 0; potC.addChild(potText);

    // 計時器
    const timerC = new PIXI.Container(); timerC.x = W/2; timerC.y = 500; timerC.visible = false; c.addChild(timerC);
    timerText = new PIXI.Text('你的回合 · 30秒', { fontFamily:FONT_UI, fontSize:13, fontWeight:'700', fill:COLOR.gold3, letterSpacing:2 });
    timerText.anchor.set(0.5); timerC.addChild(timerText);
    const tBg = new PIXI.Graphics(); tBg.beginFill(0x000000, 0.6); tBg.drawRoundedRect(-90, 14, 180, 4, 2); tBg.endFill(); timerC.addChild(tBg);
    timerBar = new PIXI.Graphics(); timerC.addChild(timerBar);
    c._timerC = timerC;

    // 訊息
    msgC = new PIXI.Container(); msgC.x = W/2; msgC.y = 500; msgC.visible = false; c.addChild(msgC);
    msgC._bg = new PIXI.Graphics(); msgC.addChild(msgC._bg);
    msgT = new PIXI.Text('', { fontFamily:FONT_UI, fontSize:13, fontWeight:'700', fill:COLOR.fg1, letterSpacing:1.5 });
    msgT.anchor.set(0.5); msgC.addChild(msgT);

    // 座位
    seatUI = [];
    for (let i=0; i<NUM_PLAYERS; i++){ const s = buildSeat(i); c.addChild(s.container); seatUI.push(s); }

    buildActionBar(c);
}

function buildSeat(i){
    const c = new PIXI.Container(); c.x = SEAT_POS[i].x; c.y = SEAT_POS[i].y;
    const isMe = i === 0;
    const avR = isMe ? 28 : 22;

    const glow = new PIXI.Graphics();
    glow.lineStyle(2.5, DS.gold2, 0.95); glow.drawCircle(0, 0, avR+4);
    glow.visible = false; c.addChild(glow);

    const avatarC = new PIXI.Container();
    const ring = new PIXI.Graphics();
    ring.beginFill(DS.gold2); ring.drawCircle(0, 0, avR+1.5); ring.endFill();
    ring.beginFill(0x1B1408); ring.drawCircle(0, 0, avR); ring.endFill();
    avatarC.addChild(ring);
    const avatar = drawAvatar(avR*0.78, i);
    avatarC.addChild(avatar);
    c.addChild(avatarC);

    const plate = new PIXI.Container(); plate.y = avR + 14; c.addChild(plate);
    const plW = isMe ? 98 : 82, plH = 28;
    const plBg = new PIXI.Graphics();
    plBg.beginFill(DS.glass, 0.78); plBg.drawRoundedRect(-plW/2, -plH/2, plW, plH, 8); plBg.endFill();
    plBg.lineStyle(1, isMe ? DS.gold2 : 0xFFFFFF, isMe ? 0.55 : 0.12); plBg.drawRoundedRect(-plW/2, -plH/2, plW, plH, 8);
    plate.addChild(plBg);
    const nameT = new PIXI.Text('', { fontFamily:FONT_UI, fontSize:9.5, fontWeight:'600', fill:COLOR.fg1, letterSpacing:0.5 });
    nameT.anchor.set(0.5); nameT.y = -6; plate.addChild(nameT);
    const chipsT = new PIXI.Text('', { fontFamily:FONT_UI, fontSize:11, fontWeight:'700', fill:COLOR.gold3 });
    chipsT.anchor.set(0.5); chipsT.y = 6; plate.addChild(chipsT);

    const dc = new PIXI.Container(); dc.x = avR - 2; dc.y = -avR - 2; dc.visible = false;
    const dcBg = new PIXI.Graphics(); dcBg.beginFill(0xFFFFFF); dcBg.drawCircle(0, 0, 9); dcBg.endFill(); dcBg.lineStyle(1, 0x888, 0.8); dcBg.drawCircle(0, 0, 9); dc.addChild(dcBg);
    const dT = new PIXI.Text('D', { fontFamily:FONT_UI, fontSize:10, fontWeight:'900', fill:'#0B0F1A' }); dT.anchor.set(0.5); dc.addChild(dT);
    c.addChild(dc);

    const statusC = new PIXI.Container(); statusC.y = -avR - 14; statusC.visible = false; c.addChild(statusC);
    const stBg = new PIXI.Graphics(); statusC.addChild(stBg);
    const stT = new PIXI.Text('', { fontFamily:FONT_UI, fontSize:9, fontWeight:'700', fill:COLOR.fg1, letterSpacing:1.2 });
    stT.anchor.set(0.5); statusC.addChild(stT);
    statusC._bg = stBg; statusC._t = stT;

    const isLeft = (i === 1 || i === 2);
    const cardsC = new PIXI.Container();
    if (isMe) { cardsC.y = -58; }
    else if (i === 3) { cardsC.y = -avR - 20; }
    else if (isLeft) { cardsC.x = avR + 12; cardsC.y = -avR + 4; }
    else { cardsC.x = -avR - 12; cardsC.y = -avR + 4; }
    c.addChild(cardsC);

    const betC = new PIXI.Container(); betC.x = BET_OFFSET[i].x; betC.y = BET_OFFSET[i].y; betC.visible = false; c.addChild(betC);

    return { container:c, avatarC, avR, nameT, chipsT, dc, cardsC, betC, glow, statusC, cardSprites:[] };
}

function buildActionBar(parent){
    actionBar = new PIXI.Container(); actionBar.y = H - 92; actionBar.alpha = 0.35; actionBar._enabled = false; parent.addChild(actionBar);

    const bar = new PIXI.Graphics();
    bar.beginFill(DS.bgDeep, 0);    bar.drawRect(0, -30, W, 30); bar.endFill();
    bar.beginFill(DS.bgDeep, 0.55); bar.drawRect(0, 0, W, 30);   bar.endFill();
    bar.beginFill(DS.bgDeep, 0.88); bar.drawRect(0, 30, W, 80);  bar.endFill();
    actionBar.addChild(bar);

    // 下注顆粒列
    const pillsC = new PIXI.Container(); pillsC.y = -14; actionBar.addChild(pillsC); actionBar._pillsC = pillsC;
    const pillLabels = ['¼','½','⅔','底池','2x','全下'];
    const pillVals   = ['quarter','half','twothird','pot','double','allin'];
    actionBar._pills = [];
    const pillGap = 5, pillW = 46, pillH = 24;
    const startX = W/2 - (pillW*pillLabels.length + pillGap*(pillLabels.length-1))/2 + pillW/2;
    pillLabels.forEach((lb, idx) => {
        const p = new PIXI.Container(); p.x = startX + idx*(pillW + pillGap);
        const isAllIn = pillVals[idx] === 'allin';
        const bgCol = isAllIn ? DS.raise : 0x4C80C8;
        const strokeCol = isAllIn ? DS.raiseLight : 0x78AAE6;
        const textCol = isAllIn ? '#FFE4CA' : '#CDE0F5';
        const pBg = new PIXI.Graphics();
        pBg.beginFill(bgCol, isAllIn ? 0.25 : 0.18); pBg.drawRoundedRect(-pillW/2, -pillH/2, pillW, pillH, 12); pBg.endFill();
        pBg.lineStyle(1, strokeCol, isAllIn ? 0.7 : 0.45); pBg.drawRoundedRect(-pillW/2, -pillH/2, pillW, pillH, 12);
        p.addChild(pBg);
        const pT = new PIXI.Text(lb, { fontFamily:FONT_UI, fontSize:isAllIn?10:11, fontWeight:'700', fill:textCol, letterSpacing:isAllIn?0.5:0 });
        pT.anchor.set(0.5); p.addChild(pT);
        p.eventMode = 'static'; p.cursor = 'pointer';
        p._kind = pillVals[idx];
        p.on('pointerdown', () => onBetPill(p._kind));
        pillsC.addChild(p); actionBar._pills.push(p);
    });

    // 預選列
    const preC = new PIXI.Container(); preC.y = 40; preC.visible = false; actionBar.addChild(preC); actionBar._preC = preC;
    const preItems = [
        { kind:'fold',      lines:['蓋牌'],         ink:'#5A1B17' },
        { kind:'checkfold', lines:['過牌','蓋牌'],   ink:'#1F2430' },
        { kind:'check',     lines:['過牌'],         ink:'#14301E' },
        { kind:'callany',   lines:['無條件','跟注'], ink:'#4A2A0C' },
    ];
    actionBar._preBtns = [];
    const preR = 28, preGap = 92, preStart = W/2 - preGap*(preItems.length-1)/2;
    preItems.forEach((it, idx) => {
        const b = new PIXI.Container(); b.x = preStart + idx*preGap; b.y = 0;
        const arm = new PIXI.Graphics(); arm.lineStyle(3, 0xFFFFFF, 0.9); arm.drawCircle(0, 0, preR+5); arm.visible = false; b.addChild(arm);
        const arm2 = new PIXI.Graphics(); arm2.lineStyle(1.5, 0xFFFFFF, 0.5); arm2.drawCircle(0, 0, preR+9); arm2.visible = false; b.addChild(arm2);
        b.addChild(drawRadialBtn(null, null, null, preR));
        if (it.lines.length === 1){
            const t = new PIXI.Text(it.lines[0], { fontFamily:FONT_UI, fontSize:14, fontWeight:'700', fill:it.ink, letterSpacing:1 });
            t.anchor.set(0.5); b.addChild(t);
        } else {
            const t1 = new PIXI.Text(it.lines[0], { fontFamily:FONT_UI, fontSize:12, fontWeight:'700', fill:it.ink, letterSpacing:0.5 });
            t1.anchor.set(0.5); t1.y = -8; b.addChild(t1);
            const t2 = new PIXI.Text(it.lines[1], { fontFamily:FONT_UI, fontSize:12, fontWeight:'700', fill:it.ink, letterSpacing:0.5 });
            t2.anchor.set(0.5); t2.y = 8; b.addChild(t2);
        }
        b.eventMode = 'static'; b.cursor = 'pointer';
        b._kind = it.kind; b._arm = arm; b._arm2 = arm2;
        b.on('pointerdown', () => onPreSelect(b._kind));
        preC.addChild(b); actionBar._preBtns.push(b);
    });

    // 三個主按鈕
    const btnR = 28, btnY = 40, btnGap = 72;
    const btnGroup = new PIXI.Container(); actionBar.addChild(btnGroup); actionBar._btnGroup = btnGroup;
    const foldBtn = mkActBtn('fold', '棄牌', btnR); foldBtn.x = W/2 - btnGap; foldBtn.y = btnY;
    foldBtn.on('pointerdown', () => onActClick('fold'));
    btnGroup.addChild(foldBtn);

    const checkBtn = mkActBtn('call', '過牌', btnR); checkBtn.x = W/2; checkBtn.y = btnY;
    checkBtn.on('pointerdown', () => onActClick('check'));
    btnGroup.addChild(checkBtn); actionBar._checkBtn = checkBtn;

    const callBtn = mkActBtn('call', '跟注', btnR); callBtn.x = W/2; callBtn.y = btnY; callBtn.visible = false;
    callBtn.on('pointerdown', () => onActClick('call'));
    btnGroup.addChild(callBtn); actionBar._callBtn = callBtn; actionBar._callAmount = callBtn._sub;

    const raiseBtn = mkActBtn('raise', '加注', btnR); raiseBtn.x = W/2 + btnGap; raiseBtn.y = btnY;
    raiseBtn.on('pointerdown', () => toggleRaisePanel());
    btnGroup.addChild(raiseBtn);

    // 觀戰提示
    const specC = new PIXI.Container(); specC.x = W/2; specC.y = 40; specC.visible = false; actionBar.addChild(specC);
    const sBg = new PIXI.Graphics();
    sBg.beginFill(0x000000, 0.75); sBg.drawRoundedRect(-150, -18, 300, 36, 18); sBg.endFill();
    sBg.lineStyle(1, DS.gold2, 0.55); sBg.drawRoundedRect(-150, -18, 300, 36, 18);
    specC.addChild(sBg);
    const sT = new PIXI.Text('觀戰中', { fontFamily:FONT_UI, fontSize:12, fontWeight:'600', fill:COLOR.gold3, letterSpacing:1.5 });
    sT.anchor.set(0.5); specC.addChild(sT);
    screens.game._specC = specC;

    buildRaisePanel(parent);
}

function onBetPill(kind){
    if (!actionBar._enabled) return;
    const gs = gameState, p = gs.players[0];
    let val;
    if (kind === 'quarter') val = Math.round((gs.pot + gs.currentBet) * 0.25);
    else if (kind === 'half') val = Math.round((gs.pot + gs.currentBet) * 0.5);
    else if (kind === 'twothird') val = Math.round((gs.pot + gs.currentBet) * 0.6667);
    else if (kind === 'pot') val = gs.pot + gs.currentBet;
    else if (kind === 'allin') val = p.chips + p.bet;
    else val = Math.max(gs.currentBet * 2, BIG_BLIND * 2);
    val = Math.max(val, gs.currentBet + gs.minRaise);
    val = Math.min(val, p.chips + p.bet);
    raisePanel._currentValue = val;
    confirmRaise();
}

function buildRaisePanel(parent){
    raisePanel = new PIXI.Container(); raisePanel.x = W/2; raisePanel.y = H - 220; raisePanel.visible = false; parent.addChild(raisePanel);

    const bg = new PIXI.Graphics();
    bg.beginFill(DS.glass, 0.94); bg.drawRoundedRect(-160, -110, 320, 160, 16); bg.endFill();
    bg.lineStyle(1, DS.gold2, 0.45); bg.drawRoundedRect(-160, -110, 320, 160, 16);
    raisePanel.addChild(bg);

    const tt = new PIXI.Text('加注金額', { fontFamily:FONT_UI, fontSize:11, fontWeight:'600', fill:COLOR.fg3, letterSpacing:3 });
    tt.anchor.set(0.5); tt.y = -92; raisePanel.addChild(tt);

    const allin = new PIXI.Container(); allin.x = 125; allin.y = -92;
    const aBg = new PIXI.Graphics();
    aBg.beginFill(DS.raise, 0.22); aBg.drawRoundedRect(-28, -10, 56, 20, 10); aBg.endFill();
    aBg.lineStyle(1, DS.raise, 0.6); aBg.drawRoundedRect(-28, -10, 56, 20, 10);
    allin.addChild(aBg);
    const aT = new PIXI.Text('全下', { fontFamily:FONT_UI, fontSize:10, fontWeight:'700', fill:COLOR.raise, letterSpacing:1 });
    aT.anchor.set(0.5); allin.addChild(aT);
    allin.eventMode = 'static'; allin.cursor = 'pointer';
    allin.on('pointerdown', () => {
        const p = gameState.players[0];
        raisePanel._currentValue = p.chips + p.bet;
        raisePanel._vt.text = '加注 $ ' + raisePanel._currentValue.toLocaleString();
        raisePanel._handle.x = 90; updateRaiseSlider();
    });
    raisePanel.addChild(allin);

    const sliderY = -50;
    const track = new PIXI.Graphics();
    track.beginFill(0x000000, 0.55); track.drawRoundedRect(-100, sliderY - 3, 200, 6, 3); track.endFill();
    raisePanel.addChild(track);
    raisePanel._sliderFill = new PIXI.Graphics(); raisePanel.addChild(raisePanel._sliderFill);
    const handle = new PIXI.Graphics();
    handle.beginFill(DS.gold3); handle.drawCircle(0, 0, 11); handle.endFill();
    handle.beginFill(DS.gold1); handle.drawCircle(0, 0, 7); handle.endFill();
    handle.x = -100; handle.y = sliderY; handle.eventMode = 'static'; handle.cursor = 'grab';
    raisePanel.addChild(handle); raisePanel._handle = handle;
    let drag = false;
    handle.on('pointerdown', () => { drag = true; });
    app.stage.on('pointermove', e => {
        if (!drag) return;
        const l = raisePanel.toLocal(e.global);
        handle.x = Math.max(-100, Math.min(100, l.x));
        updateRaiseSlider();
    });
    app.stage.on('pointerup', () => { drag = false; });
    app.stage.eventMode = 'static';

    const confirmBtn = new PIXI.Container(); confirmBtn.y = 20;
    confirmBtn.addChild(drawGoldPill(260, 36, 18));
    raisePanel._vt = new PIXI.Text('加注 $ 0', { fontFamily:FONT_UI, fontSize:15, fontWeight:'700', fill:'#1B1408', letterSpacing:1 });
    raisePanel._vt.anchor.set(0.5); confirmBtn.addChild(raisePanel._vt);
    confirmBtn.eventMode = 'static'; confirmBtn.cursor = 'pointer';
    confirmBtn.on('pointerdown', () => confirmRaise());
    raisePanel.addChild(confirmBtn);

    raisePanel._min = 0; raisePanel._max = 10000; raisePanel._currentValue = 0;
}

function updateRaiseSlider(){
    const mn = -100, mx = 100;
    const t = (raisePanel._handle.x - mn) / (mx - mn);
    const v = Math.round((raisePanel._min + t*(raisePanel._max - raisePanel._min)) / BIG_BLIND) * BIG_BLIND;
    raisePanel._currentValue = Math.max(raisePanel._min, Math.min(raisePanel._max, v));
    raisePanel._vt.text = '加注 $ ' + raisePanel._currentValue.toLocaleString();
    raisePanel._sliderFill.clear();
    raisePanel._sliderFill.beginFill(DS.gold2, 0.78);
    raisePanel._sliderFill.drawRoundedRect(mn, -53, raisePanel._handle.x - mn, 6, 3);
    raisePanel._sliderFill.endFill();
}

function toggleRaisePanel(forceOpen){
    if (!forceOpen && raisePanel.visible){ raisePanel.visible = false; return; }
    const gs = gameState, p = gs.players[0];
    raisePanel._min = gs.currentBet + gs.minRaise;
    raisePanel._max = p.chips + p.bet;
    raisePanel._handle.x = -100; raisePanel._currentValue = raisePanel._min;
    raisePanel._vt.text = '加注 $ ' + raisePanel._min.toLocaleString();
    updateRaiseSlider();
    raisePanel.visible = true;
    playSound('button');
}

// ============================================================
// 結算 / 暫停（照搬原版）
// ============================================================
function buildResultOverlay(){
    screens.result = new PIXI.Container(); screens.result.visible = false; app.stage.addChild(screens.result);
    const ov = new PIXI.Graphics(); ov.beginFill(0x04060E, 0.8); ov.drawRect(0, 0, W, H); ov.endFill(); ov.eventMode = 'static'; screens.result.addChild(ov);
    const pb = new PIXI.Graphics();
    pb.beginFill(DS.glass, 0.92); pb.drawRoundedRect(W/2 - 150, H/2 - 150, 300, 300, 20); pb.endFill();
    pb.lineStyle(1.5, DS.gold2, 0.55); pb.drawRoundedRect(W/2 - 150, H/2 - 150, 300, 300, 20);
    screens.result.addChild(pb);
    screens.result._hd = new PIXI.Text('', { fontFamily:FONT_DISP, fontSize:36, fontWeight:'700', fill:COLOR.gold3, letterSpacing:4 });
    screens.result._hd.anchor.set(0.5); screens.result._hd.x = W/2; screens.result._hd.y = H/2 - 95; screens.result.addChild(screens.result._hd);
    const hl = new PIXI.Graphics(); hl.lineStyle(1, DS.gold2, 0.6); hl.moveTo(W/2 - 70, H/2 - 70); hl.lineTo(W/2 + 70, H/2 - 70); hl.beginFill(DS.gold2); hl.drawCircle(W/2, H/2 - 70, 2); hl.endFill(); screens.result.addChild(hl);
    screens.result._ht = new PIXI.Text('', { fontFamily:FONT_UI, fontSize:14, fontWeight:'600', fill:COLOR.fg2, letterSpacing:2 });
    screens.result._ht.anchor.set(0.5); screens.result._ht.x = W/2; screens.result._ht.y = H/2 - 40; screens.result.addChild(screens.result._ht);
    const potLbl = new PIXI.Text('贏得底池', { fontFamily:FONT_UI, fontSize:11, fontWeight:'600', fill:COLOR.fg3, letterSpacing:3 });
    potLbl.anchor.set(0.5); potLbl.x = W/2; potLbl.y = H/2 + 10; screens.result.addChild(potLbl);
    screens.result._at = new PIXI.Text('$ 0', { fontFamily:FONT_UI, fontSize:30, fontWeight:'700', fill:COLOR.gold3 });
    screens.result._at.anchor.set(0.5); screens.result._at.x = W/2; screens.result._at.y = H/2 + 42; screens.result.addChild(screens.result._at);
    const okC = new PIXI.Container(); okC.x = W/2; okC.y = H/2 + 110; okC.eventMode = 'static'; okC.cursor = 'pointer';
    okC.addChild(drawGoldPill(160, 36, 18));
    const okT = new PIXI.Text('下一局', { fontFamily:FONT_UI, fontSize:14, fontWeight:'700', fill:'#1B1408', letterSpacing:2 });
    okT.anchor.set(0.5); okC.addChild(okT);
    okC.on('pointerdown', () => {
        screens.result.visible = false;
        try { bgClient.moves.nextHand(); } catch(e) {}
    });
    screens.result.addChild(okC);
}

function showResult(isWin, handName, amount){
    const R = screens.result;
    R._hd.text = isWin ? '勝利' : '結算';
    R._hd.style.fill = isWin ? COLOR.gold3 : COLOR.fg2;
    R._ht.text = handName || '';
    R._at.text = '$ ' + (amount || 0).toLocaleString();
    R.visible = true;
}

function buildPauseOverlay(){
    screens.pause = new PIXI.Container(); screens.pause.visible = false; app.stage.addChild(screens.pause);
    const ov = new PIXI.Graphics(); ov.beginFill(0x04060E, 0.8); ov.drawRect(0, 0, W, H); ov.endFill(); ov.eventMode = 'static'; screens.pause.addChild(ov);
    const pb = new PIXI.Graphics();
    pb.beginFill(DS.glass, 0.94); pb.drawRoundedRect(W/2 - 130, H/2 - 100, 260, 200, 20); pb.endFill();
    pb.lineStyle(1, DS.gold2, 0.45); pb.drawRoundedRect(W/2 - 130, H/2 - 100, 260, 200, 20);
    screens.pause.addChild(pb);
    const ttl = new PIXI.Text('選單', { fontFamily:FONT_DISP, fontSize:30, fontWeight:'700', fill:COLOR.gold3, letterSpacing:4 });
    ttl.anchor.set(0.5); ttl.x = W/2; ttl.y = H/2 - 55; screens.pause.addChild(ttl);
    const rC = new PIXI.Container(); rC.x = W/2; rC.y = H/2 - 5; rC.eventMode = 'static'; rC.cursor = 'pointer';
    const rBg = new PIXI.Graphics();
    rBg.beginFill(DS.call); rBg.drawRoundedRect(-90, -18, 180, 36, 18); rBg.endFill();
    rBg.beginFill(DS.callLight, 0.4); rBg.drawRoundedRect(-88, -16, 176, 12, 10); rBg.endFill();
    rC.addChild(rBg);
    const rT = new PIXI.Text('繼續遊戲', { fontFamily:FONT_UI, fontSize:14, fontWeight:'700', fill:'#fff', letterSpacing:2 });
    rT.anchor.set(0.5); rC.addChild(rT);
    rC.on('pointerdown', () => resumeGame());
    screens.pause.addChild(rC);
    const lC = new PIXI.Container(); lC.x = W/2; lC.y = H/2 + 50; lC.eventMode = 'static'; lC.cursor = 'pointer';
    const lBg = new PIXI.Graphics();
    lBg.beginFill(0x000000, 0.5); lBg.drawRoundedRect(-90, -18, 180, 36, 18); lBg.endFill();
    lBg.lineStyle(1, DS.gold2, 0.55); lBg.drawRoundedRect(-90, -18, 180, 36, 18);
    lC.addChild(lBg);
    const lT = new PIXI.Text('回大廳', { fontFamily:FONT_UI, fontSize:14, fontWeight:'700', fill:COLOR.gold3, letterSpacing:2 });
    lT.anchor.set(0.5); lC.addChild(lT);
    lC.on('pointerdown', () => backToMenu());
    screens.pause.addChild(lC);
}

function showScreen(name){ for (const k in screens) screens[k].visible = (k === name); }

// ============================================================
// 玩家動作 → boardgame.io moves
// ============================================================
function onActClick(kind){
    const gs = gameState;
    if (!gs.isRunning) return;
    if (actionBar._enabled && gs.currentPlayerIndex === 0){ onAction(kind); return; }
    const mapped = (kind === 'call') ? 'callany' : kind;
    onPreSelect(mapped);
}
function onPreSelect(kind){
    const gs = gameState;
    const me = gs.players?.[0];
    if (!me || me.chips <= 0) return;
    const next = (gs.preAction === kind) ? null : kind;
    gs.preAction = next;
    for (const b of (actionBar._preBtns || [])){
        const on = b._kind === next;
        if (b._arm) b._arm.visible = on;
        if (b._arm2) b._arm2.visible = on;
    }
    playSound('button');
}

function onAction(a){
    const gs = gameState;
    if (!actionBar._enabled || !gs.isRunning || gs.isPaused || gs.actionLock || gs.currentPlayerIndex !== 0) return;
    if (a === 'raise'){ toggleRaisePanel(); return; }
    gs.actionLock = true;
    clearTimer();
    const p = gs.players[0];
    try {
        if (a === 'fold'){
            playSound('fold');
            seatUI[0].container.alpha = 0.4;
            bgClient.moves.fold();
        } else if (a === 'check' || a === 'checkfold'){
            playSound('check');
            bgClient.moves.check();
        } else if (a === 'call'){
            playSound('chip');
            bgClient.moves.call();
        }
    } catch (e) { console.warn('move err', e); }
    hideAB();
    gs.actionLock = false;
}

function confirmRaise(){
    const gs = gameState;
    if (gs.actionLock) return;
    gs.actionLock = true;
    const tot = raisePanel._currentValue;
    const p = gs.players[0];
    if (tot >= p.chips + p.bet) playSound('allin');
    else playSound('chip');
    try { bgClient.moves.raise(tot); } catch (e) { console.warn('raise err', e); }
    raisePanel.visible = false;
    hideAB();
    clearTimer();
    gs.actionLock = false;
}

// ============================================================
// showAB / hideAB（照搬原版、稍作簡化）
// ============================================================
function showAB(){
    const gs = gameState, p = gs.players[0];
    if (!p) return;
    const ca = gs.currentBet - p.bet;
    actionBar._checkBtn.visible = ca <= 0;
    actionBar._callBtn.visible = ca > 0;
    if (ca > 0) actionBar._callAmount.text = '$' + ca.toLocaleString();
    actionBar.alpha = 1; actionBar._enabled = true;
    if (actionBar._pillsC) actionBar._pillsC.visible = true;
    if (actionBar._btnGroup) actionBar._btnGroup.visible = true;
    if (actionBar._preC) actionBar._preC.visible = false;
    if (screens.game?._specC) screens.game._specC.visible = false;

    const pre = gs.preAction;
    if (pre){
        gs.preAction = null;
        for (const b of (actionBar._preBtns || [])){
            if (b._arm) b._arm.visible = false;
            if (b._arm2) b._arm2.visible = false;
        }
        let act = null;
        if (pre === 'fold') act = 'fold';
        else if (pre === 'checkfold') act = ca <= 0 ? 'check' : 'fold';
        else if (pre === 'check') act = ca <= 0 ? 'check' : null;
        else if (pre === 'callany') act = ca > 0 ? 'call' : 'check';
        if (act) setTimeout(() => {
            if (gameState.currentPlayerIndex === 0 && actionBar._enabled) onAction(act);
        }, 250);
    }

    playSound('turn-alert');
}

function hideAB(){
    actionBar.alpha = 1; actionBar._enabled = false; raisePanel.visible = false;
    if (actionBar._pillsC) actionBar._pillsC.visible = false;
    if (actionBar._btnGroup) actionBar._btnGroup.visible = false;
    const gs = gameState, me = gs.players?.[0];
    const inHand = !!(me && me.hand && me.hand.length > 0);
    const folded = !!(me && me.folded);
    const allIn = !!(me && me.allIn);
    const broke = !!(me && me.chips <= 0 && !inHand);
    const sittingOut = !!(me && gs.isRunning && !broke && !folded && !inHand);
    if (actionBar._preC) actionBar._preC.visible = !(broke || folded || sittingOut || allIn);
    const spec = screens.game?._specC;
    if (spec){
        if (broke){ spec.visible = true; if (spec.children[1]) spec.children[1].text = '餘額不足'; }
        else if (sittingOut){ spec.visible = true; if (spec.children[1]) spec.children[1].text = '等待下局'; }
        else spec.visible = false;
    }
}

// ============================================================
// 計時器（本地倒數，超時自動執行）
// ============================================================
function startTimer(){
    const gs = gameState;
    gs.turnTimeLeft = TURN_TIME;
    if (screens.game?._timerC) screens.game._timerC.visible = true;
    gs.turnTimer = setInterval(() => {
        gs.turnTimeLeft -= 0.1;
        const pct = Math.max(0, gs.turnTimeLeft / TURN_TIME);
        timerText.text = '你的回合 · ' + Math.ceil(gs.turnTimeLeft) + ' 秒';
        timerText.style.fill = pct > 0.3 ? COLOR.gold3 : COLOR.fold;
        timerBar.clear();
        timerBar.beginFill(pct > 0.3 ? DS.gold2 : DS.fold);
        timerBar.drawRoundedRect(-90, 14, 180 * pct, 4, 2);
        timerBar.endFill();
        if (gs.turnTimeLeft <= 0){
            clearTimer();
            if (gs.currentBet > gs.players[0].bet) onAction('fold');
            else onAction('check');
        }
    }, 100);
}
function clearTimer(){
    if (gameState.turnTimer){ clearInterval(gameState.turnTimer); gameState.turnTimer = null; }
    if (screens.game?._timerC) screens.game._timerC.visible = false;
}

// ============================================================
// UI 更新（照搬原版、僅改為讀 gameState shadow）
// ============================================================
function clearUI(){
    for (const s of seatUI){
        s.cardsC.removeChildren(); s.cardSprites = [];
        s.betC.visible = false; s.betC.removeChildren();
        s.glow.visible = false; s.container.alpha = 1;
        if (s.statusC) s.statusC.visible = false;
    }
    for (const c of communityUI){
        if (c.cardSprite){ c.container.removeChild(c.cardSprite); c.cardSprite = null; }
        c.placeholder.visible = true;
    }
    hideAB();
    if (msgC) msgC.visible = false;
    if (screens.result) screens.result.visible = false;
}

function updateSeats(){
    for (let i=0; i<NUM_PLAYERS; i++){
        const p = gameState.players[i];
        const s = seatUI[i];
        if (!p || !p.pid){
            // 空座位：隱藏整個座位
            s.container.visible = false;
            continue;
        }
        s.container.visible = true;
        s.nameT.text = p.name || '';
        s.chipsT.text = '$ ' + (p.chips || 0).toLocaleString();
        if (p.folded) s.container.alpha = 0.4;
        else if (!p.isActive) s.container.alpha = 0.3;
        else s.container.alpha = 1;
    }
}
function updatePot(){ if (potText) potText.text = '$ ' + gameState.pot.toLocaleString(); }
function updateBets(){
    updatePot();
    for (let i=0; i<NUM_PLAYERS; i++){
        const p = gameState.players[i]; const s = seatUI[i];
        s.betC.removeChildren();
        if (p && p.bet > 0){
            s.betC.visible = true;
            const txt = '$ ' + p.bet.toLocaleString();
            const tmp = new PIXI.Text(txt, { fontFamily:FONT_UI, fontSize:10, fontWeight:'700', fill:COLOR.gold3 });
            tmp.anchor.set(0.5);
            const w = tmp.width + 32, h = 18;
            const cap = new PIXI.Graphics();
            cap.beginFill(0x000000, 0.6); cap.drawRoundedRect(-w/2, -h/2, w, h, 9); cap.endFill();
            cap.lineStyle(1, DS.gold2, 0.55); cap.drawRoundedRect(-w/2, -h/2, w, h, 9);
            s.betC.addChild(cap);
            const chip = new PIXI.Graphics();
            chip.beginFill(DS.gold2); chip.drawCircle(-w/2 + 8, 0, 4); chip.endFill();
            chip.beginFill(0x000000, 0.45); chip.drawCircle(-w/2 + 8, 0, 2); chip.endFill();
            s.betC.addChild(chip);
            tmp.x = 4; s.betC.addChild(tmp);
        } else s.betC.visible = false;
    }
}

function showDealer(){
    for (let i=0; i<NUM_PLAYERS; i++){
        if (!seatUI[i]) continue;
        seatUI[i].dc.visible = (i === gameState.dealerIndex);
    }
}
function setGlow(i){
    for (let j=0; j<NUM_PLAYERS; j++){
        if (!seatUI[j]) continue;
        seatUI[j].glow.visible = (j === i);
    }
}
function showMsg(t){
    if (!msgC) return;
    msgT.text = t; msgC._bg.clear();
    const w = Math.max(150, msgT.width + 40);
    msgC._bg.beginFill(DS.glass, 0.92); msgC._bg.drawRoundedRect(-w/2, -16, w, 32, 16); msgC._bg.endFill();
    msgC._bg.lineStyle(1, DS.gold2, 0.5); msgC._bg.drawRoundedRect(-w/2, -16, w, 32, 16);
    msgC.visible = true; setTimeout(() => { msgC.visible = false; }, 1200);
}

function pauseGame(){ gameState.isPaused = true; clearTimer(); screens.pause.visible = true; playSound('button'); }
function resumeGame(){ gameState.isPaused = false; screens.pause.visible = false; playSound('button'); }
function backToMenu(){
    if (confirm('確定要離開牌桌？')) window.location.href = '/';
}

// ============================================================
// 啟動入口
// ============================================================
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
