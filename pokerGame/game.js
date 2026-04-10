// ============================================================
// 德州撲克九人遊戲 - 核心邏輯（含音效）
// ============================================================

// === 常量 ===
const SUITS = ['Hearts', 'Diamonds', 'Club', 'Spades'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const AI_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eva', 'Frank', 'Grace', 'Henry'];
const STARTING_CHIPS = 10000;
const SMALL_BLIND = 50;
const BIG_BLIND = 100;
const TURN_TIME = 15;

// === 音效系統 ===
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// 使用 Web Audio API 產生合成音效（不需要外部音檔）
function playSound(type) {
    try {
        ensureAudio();
        const ctx = audioCtx;
        const now = ctx.currentTime;

        switch (type) {
            case 'card-deal': {
                // 短促的「唰」聲
                const noise = createNoise(ctx, 0.06);
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 3000;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                noise.connect(filter).connect(gain).connect(ctx.destination);
                noise.start(now);
                noise.stop(now + 0.06);
                break;
            }
            case 'card-flip': {
                // 翻牌音效
                const noise = createNoise(ctx, 0.12);
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 2000;
                filter.Q.value = 2;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                noise.connect(filter).connect(gain).connect(ctx.destination);
                noise.start(now);
                noise.stop(now + 0.12);
                break;
            }
            case 'chip': {
                // 籌碼碰撞聲
                const osc1 = ctx.createOscillator();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(800, now);
                osc1.frequency.exponentialRampToValueAtTime(200, now + 0.08);
                const osc2 = ctx.createOscillator();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1200, now);
                osc2.frequency.exponentialRampToValueAtTime(400, now + 0.06);
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc1.connect(gain).connect(ctx.destination);
                osc2.connect(gain);
                osc1.start(now); osc1.stop(now + 0.1);
                osc2.start(now); osc2.stop(now + 0.08);
                break;
            }
            case 'check': {
                // 敲桌聲
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.08);
                break;
            }
            case 'fold': {
                // 棄牌聲
                const noise = createNoise(ctx, 0.15);
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 800;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                noise.connect(filter).connect(gain).connect(ctx.destination);
                noise.start(now); noise.stop(now + 0.15);
                break;
            }
            case 'win': {
                // 勝利音效 - 上升音階
                [0, 0.12, 0.24, 0.36].forEach((t, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.value = [523, 659, 784, 1047][i];
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, now + t);
                    gain.gain.linearRampToValueAtTime(0.2, now + t + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.15);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now + t); osc.stop(now + t + 0.15);
                });
                break;
            }
            case 'lose': {
                // 失敗音效 - 下降音
                [0, 0.15].forEach((t, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.value = [400, 250][i];
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, now + t);
                    gain.gain.linearRampToValueAtTime(0.2, now + t + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.3);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now + t); osc.stop(now + t + 0.3);
                });
                break;
            }
            case 'allin': {
                // All-in 警告音
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(880, now + 0.1);
                osc.frequency.setValueAtTime(440, now + 0.2);
                osc.frequency.setValueAtTime(880, now + 0.3);
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.setValueAtTime(0.1, now + 0.35);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.4);
                break;
            }
            case 'turn-alert': {
                // 輪到你了
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 660;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.2);
                break;
            }
            case 'button': {
                // 按鈕點擊
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 500;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.05);
                break;
            }
        }
    } catch (e) {
        // 靜默失敗，不影響遊戲
    }
}

function createNoise(ctx, duration) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
}

// === 遊戲狀態 ===
let gameState = {
    deck: [],
    communityCards: [],
    players: [],
    pot: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    phase: 'preflop',
    currentBet: 0,
    minRaise: BIG_BLIND,
    isRunning: false,
    isPaused: false,
    turnTimer: null,
    turnTimeLeft: TURN_TIME,
    actedThisRound: new Set(),
    lastRaiserIndex: -1,
    actionLock: false, // 防止重複觸發
};

// === 建立牌組 ===
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function getCardImage(card) {
    return `assets/Cards/png/${card.suit}_${card.rank}.png`;
}

function getCardBack() {
    return 'assets/Cards/png/shirt_blue.png';
}

// === 初始化玩家 ===
function initPlayers() {
    const players = [];
    players.push({
        id: 0, name: 'You', chips: STARTING_CHIPS,
        hand: [], bet: 0, totalBet: 0,
        folded: false, allIn: false, isHuman: true, isActive: true,
    });
    for (let i = 1; i <= 8; i++) {
        players.push({
            id: i, name: AI_NAMES[i - 1], chips: STARTING_CHIPS,
            hand: [], bet: 0, totalBet: 0,
            folded: false, allIn: false, isHuman: false, isActive: true,
        });
    }
    return players;
}

// === 開始遊戲 ===
function startGame() {
    playSound('button');
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    gameState.players = initPlayers();
    gameState.dealerIndex = Math.floor(Math.random() * 9);
    startNewRound();
}

// === 新一輪 ===
function startNewRound() {
    const gs = gameState;
    gs.deck = shuffleDeck(createDeck());
    gs.communityCards = [];
    gs.pot = 0;
    gs.currentBet = 0;
    gs.minRaise = BIG_BLIND;
    gs.phase = 'preflop';
    gs.actedThisRound = new Set();
    gs.lastRaiserIndex = -1;
    gs.isRunning = true;
    gs.actionLock = false;

    for (const p of gs.players) {
        p.hand = [];
        p.bet = 0;
        p.totalBet = 0;
        p.folded = false;
        p.allIn = false;
        p.isActive = p.chips > 0;
    }

    gs.dealerIndex = getNextActivePlayer(gs.dealerIndex);
    clearAllUI();
    updateAllPlayersUI();
    showDealerChip();

    // 下盲注
    const sbIndex = getNextActivePlayer(gs.dealerIndex);
    const bbIndex = getNextActivePlayer(sbIndex);
    placeBet(sbIndex, Math.min(SMALL_BLIND, gs.players[sbIndex].chips));
    placeBet(bbIndex, Math.min(BIG_BLIND, gs.players[bbIndex].chips));
    gs.currentBet = BIG_BLIND;
    playSound('chip');

    updatePotDisplay();
    updateBetsUI();

    // 發牌
    dealCards().then(() => {
        gs.currentPlayerIndex = getNextActivePlayer(bbIndex);
        scheduleNextTurn(300);
    });
}

// === 發牌 ===
async function dealCards() {
    const gs = gameState;
    for (let cardNum = 0; cardNum < 2; cardNum++) {
        for (let i = 0; i < 9; i++) {
            const pIndex = (gs.dealerIndex + 1 + i) % 9;
            const player = gs.players[pIndex];
            if (!player.isActive) continue;
            const card = gs.deck.pop();
            player.hand.push(card);
            const cardsEl = document.getElementById(`cards-${pIndex}`);
            const img = document.createElement('img');
            img.src = pIndex === 0 ? getCardImage(card) : getCardBack();
            img.classList.add('card-reveal');
            cardsEl.appendChild(img);
            playSound('card-deal');
            await sleep(80);
        }
    }
}

// === 排程下一次行動（使用固定延遲，避免閉包問題）===
function scheduleNextTurn(delay) {
    setTimeout(() => {
        if (gameState.isRunning && !gameState.isPaused) {
            processNextTurn();
        }
    }, delay);
}

// === 處理下一位玩家行動 ===
function processNextTurn() {
    const gs = gameState;
    if (!gs.isRunning || gs.isPaused) return;

    // 找到下一個需要行動的玩家
    const idx = gs.currentPlayerIndex;
    const player = gs.players[idx];

    // 只剩一人？
    const activePlayers = gs.players.filter(p => p.isActive && !p.folded);
    if (activePlayers.length === 1) {
        endRound(activePlayers[0].id);
        return;
    }

    // 本輪完成？
    if (isRoundComplete()) {
        nextPhase();
        return;
    }

    // 跳過已棄牌 / all-in / 非活躍
    if (!player.isActive || player.folded || player.allIn) {
        gs.currentPlayerIndex = getNextActivePlayer(idx);
        processNextTurn(); // 直接遞迴（同步，不會有閉包問題）
        return;
    }

    // 高亮當前玩家
    updateActivePlayerUI(idx);

    if (player.isHuman) {
        showActionPanel();
        startTurnTimer();
        playSound('turn-alert');
    } else {
        // AI 行動：儲存當前 index 避免閉包問題
        const aiIdx = idx;
        const delay = 600 + Math.random() * 800;
        setTimeout(() => {
            if (gs.isRunning && !gs.isPaused && gs.currentPlayerIndex === aiIdx) {
                performAIAction(aiIdx);
            }
        }, delay);
    }
}

// === 判斷本輪是否完成 ===
function isRoundComplete() {
    const gs = gameState;
    const canAct = gs.players.filter(p => p.isActive && !p.folded && !p.allIn);
    if (canAct.length === 0) return true;

    for (const p of canAct) {
        if (!gs.actedThisRound.has(p.id)) return false;
        if (p.bet < gs.currentBet) return false;
    }
    return true;
}

// === 下一階段 ===
function nextPhase() {
    const gs = gameState;
    collectBets();

    gs.actedThisRound = new Set();
    gs.lastRaiserIndex = -1;
    gs.currentBet = 0;
    for (const p of gs.players) p.bet = 0;
    updateBetsUI();

    const activeNotFolded = gs.players.filter(p => p.isActive && !p.folded);
    const canAct = activeNotFolded.filter(p => !p.allIn);

    const advancePhase = () => {
        if (canAct.length <= 1) {
            // 所有人（除一人外）都 all-in 或棄牌，直接推進到下一階段
            if (gs.phase === 'river' || gs.phase === 'showdown') {
                gs.phase = 'showdown';
                showdown();
            } else {
                nextPhase();
            }
        } else {
            gs.currentPlayerIndex = getFirstToAct();
            scheduleNextTurn(300);
        }
    };

    if (gs.phase === 'preflop') {
        gs.phase = 'flop';
        revealCommunityCards(3).then(advancePhase);
    } else if (gs.phase === 'flop') {
        gs.phase = 'turn';
        revealCommunityCards(1).then(advancePhase);
    } else if (gs.phase === 'turn') {
        gs.phase = 'river';
        revealCommunityCards(1).then(advancePhase);
    } else {
        gs.phase = 'showdown';
        showdown();
    }
}

// === 翻公共牌 ===
async function revealCommunityCards(count) {
    const gs = gameState;
    gs.deck.pop(); // 燒牌

    for (let i = 0; i < count; i++) {
        const card = gs.deck.pop();
        gs.communityCards.push(card);
        const slotIndex = gs.communityCards.length - 1;
        const slot = document.getElementById(`community-${slotIndex}`);
        const img = document.createElement('img');
        img.src = getCardImage(card);
        img.classList.add('card-flip');
        slot.innerHTML = '';
        slot.appendChild(img);
        playSound('card-flip');
        await sleep(350);
    }
}

// === 攤牌 ===
function showdown() {
    const gs = gameState;
    collectBets();

    const contenders = gs.players.filter(p => p.isActive && !p.folded);

    // 翻開所有 AI 的牌
    for (const p of contenders) {
        if (!p.isHuman) {
            const cardsEl = document.getElementById(`cards-${p.id}`);
            cardsEl.innerHTML = '';
            for (const card of p.hand) {
                const img = document.createElement('img');
                img.src = getCardImage(card);
                img.classList.add('card-flip');
                cardsEl.appendChild(img);
            }
        }
    }
    playSound('card-flip');

    // 評估牌型
    let bestScore = -1;
    let winnerId = -1;
    let winnerHandName = '';

    for (const p of contenders) {
        const allCards = [...p.hand, ...gs.communityCards];
        const result = evaluateHand(allCards);
        if (result.score > bestScore) {
            bestScore = result.score;
            winnerId = p.id;
            winnerHandName = result.name;
        }
    }

    setTimeout(() => endRound(winnerId, winnerHandName), 1500);
}

// === 結束本輪 ===
function endRound(winnerId, handName = '') {
    const gs = gameState;
    gs.isRunning = false;
    gs.actionLock = false;
    clearTurnTimer();
    hideActionPanel();

    const winner = gs.players[winnerId];
    winner.chips += gs.pot;

    document.getElementById(`seat-${winnerId}`).classList.add('winner');
    updateAllPlayersUI();

    const isHumanWin = winnerId === 0;
    playSound(isHumanWin ? 'win' : 'lose');
    showResult(isHumanWin, handName, gs.pot);
}

function showResult(isWin, handName, amount) {
    const overlay = document.getElementById('result-overlay');
    document.getElementById('result-panel-bg').src = 'assets/Win/png/panel.png';
    document.getElementById('result-title-img').src = isWin
        ? 'assets/Win/png/win.png'
        : 'assets/Lose/png/you_lose.png';
    document.getElementById('result-hand').textContent = handName || '';
    document.getElementById('result-amount').textContent = `$${amount.toLocaleString()}`;
    overlay.classList.remove('hidden');
}

function nextRound() {
    playSound('button');
    document.getElementById('result-overlay').classList.add('hidden');
    document.querySelectorAll('.player-seat').forEach(el => el.classList.remove('winner'));

    if (gameState.players[0].chips <= 0) {
        backToMenu();
        return;
    }
    startNewRound();
}

// === 玩家操作 ===
function playerAction(action) {
    const gs = gameState;
    if (!gs.isRunning || gs.isPaused || gs.actionLock) return;
    if (gs.currentPlayerIndex !== 0) return;
    gs.actionLock = true;

    clearTurnTimer();
    hideActionPanel();

    const player = gs.players[0];

    switch (action) {
        case 'fold':
            player.folded = true;
            document.getElementById('seat-0').classList.add('folded');
            playSound('fold');
            break;
        case 'check':
            playSound('check');
            break;
        case 'call': {
            const callAmount = Math.min(gs.currentBet - player.bet, player.chips);
            placeBet(0, callAmount);
            playSound('chip');
            break;
        }
        case 'allin':
            placeBet(0, player.chips);
            player.allIn = true;
            playSound('allin');
            break;
    }

    gs.actedThisRound.add(player.id);
    updateBetsUI();
    updateAllPlayersUI();

    gs.currentPlayerIndex = getNextActivePlayer(0);
    gs.actionLock = false;
    scheduleNextTurn(300);
}

function showRaiseSlider() {
    const gs = gameState;
    const player = gs.players[0];
    const slider = document.getElementById('raise-slider');
    const input = document.getElementById('raise-amount');

    const minRaise = gs.currentBet + gs.minRaise;
    const maxRaise = player.chips + player.bet;

    input.min = minRaise;
    input.max = maxRaise;
    input.step = BIG_BLIND;
    input.value = minRaise;
    document.getElementById('raise-value').textContent = `$${minRaise.toLocaleString()}`;

    input.oninput = () => {
        document.getElementById('raise-value').textContent = `$${parseInt(input.value).toLocaleString()}`;
    };

    slider.classList.remove('hidden');
    playSound('button');
}

function hideRaiseSlider() {
    document.getElementById('raise-slider').classList.add('hidden');
}

function confirmRaise() {
    const gs = gameState;
    if (gs.actionLock) return;
    gs.actionLock = true;

    const player = gs.players[0];
    const raiseTotal = parseInt(document.getElementById('raise-amount').value);
    const betNeeded = raiseTotal - player.bet;

    if (betNeeded >= player.chips) {
        placeBet(0, player.chips);
        player.allIn = true;
        playSound('allin');
    } else {
        placeBet(0, betNeeded);
        playSound('chip');
    }

    gs.minRaise = Math.max(raiseTotal - gs.currentBet, BIG_BLIND);
    gs.currentBet = Math.max(raiseTotal, gs.currentBet);
    gs.lastRaiserIndex = 0;
    // 加注後重置所有人（只保留自己）
    gs.actedThisRound = new Set([0]);

    hideRaiseSlider();
    hideActionPanel();
    clearTurnTimer();
    updateBetsUI();
    updateAllPlayersUI();

    gs.currentPlayerIndex = getNextActivePlayer(0);
    gs.actionLock = false;
    scheduleNextTurn(300);
}

// === AI 行動 ===
function performAIAction(playerIndex) {
    const gs = gameState;
    const player = gs.players[playerIndex];

    if (!gs.isRunning || player.folded || !player.isActive || player.allIn) {
        gs.currentPlayerIndex = getNextActivePlayer(playerIndex);
        scheduleNextTurn(200);
        return;
    }

    const callAmount = gs.currentBet - player.bet;
    const handStrength = evaluateHandStrength(player.hand, gs.communityCards);
    const potOdds = callAmount > 0 ? callAmount / (gs.pot + callAmount) : 0;
    const rand = Math.random();

    let action = 'fold';
    let raiseAmount = 0;

    if (handStrength > 0.85) {
        if (rand < 0.3) { action = 'allin'; }
        else { action = 'raise'; raiseAmount = Math.min(gs.pot * 2, player.chips + player.bet); }
    } else if (handStrength > 0.65) {
        if (rand < 0.4) { action = 'raise'; raiseAmount = Math.min(gs.currentBet + gs.minRaise * 2, player.chips + player.bet); }
        else { action = callAmount > 0 ? 'call' : 'check'; }
    } else if (handStrength > 0.45) {
        if (callAmount === 0) {
            action = rand < 0.25 ? 'raise' : 'check';
            raiseAmount = gs.currentBet + gs.minRaise;
        } else if (potOdds < 0.3) { action = 'call'; }
        else { action = rand < 0.3 ? 'call' : 'fold'; }
    } else if (handStrength > 0.25) {
        if (callAmount === 0) {
            action = rand < 0.12 ? 'raise' : 'check';
            raiseAmount = gs.currentBet + gs.minRaise;
        } else if (callAmount <= BIG_BLIND * 2 && rand < 0.25) { action = 'call'; }
        else { action = 'fold'; }
    } else {
        if (callAmount === 0) { action = 'check'; }
        else if (rand < 0.06) { action = 'raise'; raiseAmount = gs.currentBet + gs.minRaise; }
        else { action = 'fold'; }
    }

    // 確保 raise 金額合理
    if (action === 'raise') {
        raiseAmount = Math.max(raiseAmount, gs.currentBet + gs.minRaise);
        raiseAmount = Math.min(raiseAmount, player.chips + player.bet);
    }

    executeAIAction(playerIndex, action, raiseAmount);
}

function executeAIAction(playerIndex, action, raiseAmount) {
    const gs = gameState;
    const player = gs.players[playerIndex];

    switch (action) {
        case 'fold':
            player.folded = true;
            document.getElementById(`seat-${playerIndex}`).classList.add('folded');
            showGameMessage(`${player.name} Fold`);
            playSound('fold');
            break;

        case 'check':
            showGameMessage(`${player.name} Check`);
            playSound('check');
            break;

        case 'call': {
            const callAmt = Math.min(gs.currentBet - player.bet, player.chips);
            if (callAmt >= player.chips) {
                placeBet(playerIndex, player.chips);
                player.allIn = true;
                showGameMessage(`${player.name} All-In!`);
                playSound('allin');
            } else {
                placeBet(playerIndex, callAmt);
                showGameMessage(`${player.name} Call $${callAmt.toLocaleString()}`);
                playSound('chip');
            }
            break;
        }

        case 'raise': {
            const betNeeded = raiseAmount - player.bet;
            if (betNeeded >= player.chips) {
                placeBet(playerIndex, player.chips);
                player.allIn = true;
                showGameMessage(`${player.name} All-In!`);
                playSound('allin');
            } else {
                placeBet(playerIndex, betNeeded);
                const oldBet = gs.currentBet;
                gs.currentBet = raiseAmount;
                gs.minRaise = Math.max(raiseAmount - oldBet, BIG_BLIND);
                gs.lastRaiserIndex = playerIndex;
                gs.actedThisRound = new Set([playerIndex]);
                showGameMessage(`${player.name} Raise $${raiseAmount.toLocaleString()}`);
                playSound('chip');
            }
            break;
        }

        case 'allin': {
            const amt = player.chips;
            placeBet(playerIndex, amt);
            player.allIn = true;
            if (player.bet > gs.currentBet) {
                const oldBet = gs.currentBet;
                gs.currentBet = player.bet;
                gs.minRaise = Math.max(player.bet - oldBet, BIG_BLIND);
                gs.lastRaiserIndex = playerIndex;
                gs.actedThisRound = new Set([playerIndex]);
            }
            showGameMessage(`${player.name} ALL-IN!`);
            playSound('allin');
            break;
        }
    }

    gs.actedThisRound.add(player.id);
    updateBetsUI();
    updateAllPlayersUI();

    gs.currentPlayerIndex = getNextActivePlayer(playerIndex);
    scheduleNextTurn(500);
}

// === AI 手牌強度 ===
function evaluateHandStrength(hand, communityCards) {
    if (communityCards.length === 0) return preflopStrength(hand);
    const allCards = [...hand, ...communityCards];
    const result = evaluateHand(allCards);
    return Math.min(result.score / 5000000, 1);
}

function preflopStrength(hand) {
    const r1 = RANKS.indexOf(hand[0].rank);
    const r2 = RANKS.indexOf(hand[1].rank);
    const high = Math.max(r1, r2);
    const low = Math.min(r1, r2);
    const suited = hand[0].suit === hand[1].suit;
    const paired = r1 === r2;

    let s = (high + low) / 24;
    if (paired) s += 0.3 + (high / 12) * 0.3;
    if (suited) s += 0.08;
    if (Math.abs(r1 - r2) === 1) s += 0.06;
    if (high >= 10) s += 0.1;
    if (high === 12) s += 0.1;
    return Math.min(s, 1);
}

// === 牌型評估 ===
function evaluateHand(cards) {
    const combos = getCombinations(cards, 5);
    let bestScore = 0, bestName = 'High Card';
    for (const combo of combos) {
        const r = evaluate5Cards(combo);
        if (r.score > bestScore) { bestScore = r.score; bestName = r.name; }
    }
    return { score: bestScore, name: bestName };
}

function evaluate5Cards(cards) {
    const ranks = cards.map(c => RANKS.indexOf(c.rank)).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = checkStraight(ranks);

    const rankCount = {};
    for (const r of ranks) rankCount[r] = (rankCount[r] || 0) + 1;
    const counts = Object.entries(rankCount)
        .map(([rank, count]) => ({ rank: parseInt(rank), count }))
        .sort((a, b) => b.count - a.count || b.rank - a.rank);

    if (isFlush && isStraight && ranks[0] === 12 && ranks[4] === 8)
        return { score: 9000000, name: 'Royal Flush' };
    if (isFlush && isStraight)
        return { score: 8000000 + ranks[0], name: 'Straight Flush' };
    if (counts[0].count === 4)
        return { score: 7000000 + counts[0].rank * 100 + counts[1].rank, name: 'Four of a Kind' };
    if (counts[0].count === 3 && counts[1].count === 2)
        return { score: 6000000 + counts[0].rank * 100 + counts[1].rank, name: 'Full House' };
    if (isFlush)
        return { score: 5000000 + ranks[0]*10000 + ranks[1]*1000 + ranks[2]*100 + ranks[3]*10 + ranks[4], name: 'Flush' };
    if (isStraight) {
        const h = (ranks[0] === 12 && ranks[1] === 3) ? 3 : ranks[0];
        return { score: 4000000 + h, name: 'Straight' };
    }
    if (counts[0].count === 3)
        return { score: 3000000 + counts[0].rank * 10000 + counts[1].rank * 100 + counts[2].rank, name: 'Three of a Kind' };
    if (counts[0].count === 2 && counts[1].count === 2) {
        const hp = Math.max(counts[0].rank, counts[1].rank);
        const lp = Math.min(counts[0].rank, counts[1].rank);
        return { score: 2000000 + hp * 10000 + lp * 100 + counts[2].rank, name: 'Two Pair' };
    }
    if (counts[0].count === 2)
        return { score: 1000000 + counts[0].rank * 10000 + counts[1].rank * 100 + counts[2].rank * 10 + counts[3].rank, name: 'One Pair' };
    return { score: ranks[0]*10000 + ranks[1]*1000 + ranks[2]*100 + ranks[3]*10 + ranks[4], name: 'High Card' };
}

function checkStraight(ranks) {
    const sorted = [...new Set(ranks)].sort((a, b) => b - a);
    if (sorted.length < 5) return false;
    if (sorted[0] - sorted[4] === 4 && sorted.length === 5) return true;
    if (sorted[0] === 12 && sorted[1] === 3 && sorted[2] === 2 && sorted[3] === 1 && sorted[4] === 0) return true;
    return false;
}

function getCombinations(arr, k) {
    const results = [];
    function combine(start, combo) {
        if (combo.length === k) { results.push([...combo]); return; }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }
    combine(0, []);
    return results;
}

// === 工具函數 ===
function placeBet(playerIndex, amount) {
    const player = gameState.players[playerIndex];
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    player.bet += actual;
    player.totalBet += actual;
    gameState.pot += actual;
}

function collectBets() {
    for (const p of gameState.players) p.bet = 0;
}

function getNextActivePlayer(fromIndex) {
    for (let i = 1; i <= 9; i++) {
        const idx = (fromIndex + i) % 9;
        const p = gameState.players[idx];
        if (p.isActive && !p.folded && !p.allIn) return idx;
    }
    // 全部都 all-in 或 folded
    for (let i = 1; i <= 9; i++) {
        const idx = (fromIndex + i) % 9;
        if (gameState.players[idx].isActive && !gameState.players[idx].folded) return idx;
    }
    return fromIndex;
}

function getFirstToAct() {
    return getNextActivePlayer(gameState.dealerIndex);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === 計時器 ===
function startTurnTimer() {
    const gs = gameState;
    gs.turnTimeLeft = TURN_TIME;
    const seat = document.querySelector(`#seat-${gs.currentPlayerIndex} .timer-fill`);
    if (seat) seat.style.width = '100%';

    gs.turnTimer = setInterval(() => {
        gs.turnTimeLeft -= 0.1;
        const pct = (gs.turnTimeLeft / TURN_TIME) * 100;
        if (seat) seat.style.width = `${Math.max(0, pct)}%`;
        if (gs.turnTimeLeft <= 0) {
            clearTurnTimer();
            if (gs.currentBet > gs.players[0].bet) playerAction('fold');
            else playerAction('check');
        }
    }, 100);
}

function clearTurnTimer() {
    if (gameState.turnTimer) {
        clearInterval(gameState.turnTimer);
        gameState.turnTimer = null;
    }
}

// === UI ===
function clearAllUI() {
    for (let i = 0; i < 5; i++) {
        document.getElementById(`community-${i}`).innerHTML = '<div class="card-placeholder"></div>';
    }
    for (let i = 0; i < 9; i++) {
        document.getElementById(`cards-${i}`).innerHTML = '';
        document.getElementById(`bet-${i}`).innerHTML = '';
        document.getElementById(`seat-${i}`).classList.remove('folded', 'active-turn', 'winner');
    }
    document.getElementById('game-message').classList.add('hidden');
    hideActionPanel();
}

function updateAllPlayersUI() {
    for (let i = 0; i < 9; i++) {
        const p = gameState.players[i];
        document.getElementById(`name-${i}`).textContent = p.name;
        document.getElementById(`chips-${i}`).textContent = `$${p.chips.toLocaleString()}`;
        const seatEl = document.getElementById(`seat-${i}`);
        seatEl.style.opacity = !p.isActive ? '0.3' : p.folded ? '0.4' : '1';
    }
    document.getElementById('player-chips-display').textContent = `$${gameState.players[0].chips.toLocaleString()}`;
}

function updateActivePlayerUI(playerIndex) {
    document.querySelectorAll('.player-seat').forEach(el => el.classList.remove('active-turn'));
    document.getElementById(`seat-${playerIndex}`).classList.add('active-turn');
}

function updatePotDisplay() {
    document.getElementById('pot-amount').textContent = `$${gameState.pot.toLocaleString()}`;
}

function updateBetsUI() {
    updatePotDisplay();
    for (let i = 0; i < 9; i++) {
        const p = gameState.players[i];
        const betEl = document.getElementById(`bet-${i}`);
        if (p.bet > 0) {
            betEl.innerHTML = `<img src="${getChipImage(p.bet)}" alt=""><span>$${p.bet.toLocaleString()}</span>`;
        } else {
            betEl.innerHTML = '';
        }
    }
}

function getChipImage(amount) {
    if (amount >= 10000) return 'assets/Chips/png/10000.png';
    if (amount >= 5000) return 'assets/Chips/png/5000.png';
    if (amount >= 1000) return 'assets/Chips/png/1000.png';
    if (amount >= 500) return 'assets/Chips/png/500.png';
    if (amount >= 100) return 'assets/Chips/png/100.png';
    if (amount >= 50) return 'assets/Chips/png/50.png';
    if (amount >= 25) return 'assets/Chips/png/25.png';
    if (amount >= 10) return 'assets/Chips/png/10.png';
    return 'assets/Chips/png/1.png';
}

function showDealerChip() {
    for (let i = 0; i < 9; i++) {
        const chip = document.getElementById(`dealer-chip-${i}`);
        chip.classList.toggle('hidden', i !== gameState.dealerIndex);
    }
}

function showActionPanel() {
    const gs = gameState;
    const player = gs.players[0];
    const callAmount = gs.currentBet - player.bet;
    const btnCheck = document.getElementById('btn-check');
    const btnCall = document.getElementById('btn-call');

    if (callAmount > 0) {
        btnCheck.classList.add('hidden');
        btnCall.classList.remove('hidden');
        document.getElementById('call-amount').textContent = `$${callAmount.toLocaleString()}`;
    } else {
        btnCheck.classList.remove('hidden');
        btnCall.classList.add('hidden');
    }
    document.getElementById('action-panel').classList.add('show');
    hideRaiseSlider();
}

function hideActionPanel() {
    document.getElementById('action-panel').classList.remove('show');
}

function showGameMessage(text) {
    const msgEl = document.getElementById('game-message');
    document.getElementById('message-text').textContent = text;
    msgEl.classList.remove('hidden');
    msgEl.style.animation = 'none';
    msgEl.offsetHeight;
    msgEl.style.animation = '';
    setTimeout(() => msgEl.classList.add('hidden'), 1000);
}

// === 暫停 ===
function pauseGame() {
    gameState.isPaused = true;
    clearTurnTimer();
    document.getElementById('pause-overlay').classList.remove('hidden');
    playSound('button');
}

function resumeGame() {
    gameState.isPaused = false;
    document.getElementById('pause-overlay').classList.add('hidden');
    playSound('button');
    if (gameState.isRunning && gameState.currentPlayerIndex === 0) {
        showActionPanel();
        startTurnTimer();
    } else if (gameState.isRunning) {
        scheduleNextTurn(300);
    }
}

function backToMenu() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    clearTurnTimer();
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
    document.getElementById('menu-money').textContent = gameState.players[0]?.chips?.toLocaleString() || '10,000';
    playSound('button');
}
