/**
 * 小瑪莉 — 台灣傳統水果機 (Chase Light Version)
 * 跑馬燈機制：燈光沿 24 個邊框符號順時針跑動，停在一個符號上決定輸贏
 */
(() => {
  'use strict';

  /* ===== 符號定義 ===== */
  const SYMS = {
    apple:   { em:'🍎', cls:'' },
    melon:   { em:'🍉', cls:'' },
    star:    { em:'⭐', cls:'' },
    seven:   { em:'7', cls:'seven-tile' },
    bar:     { em:'BAR', cls:'bar-tile' },
    bell:    { em:'🔔', cls:'' },
    plum:    { em:'🍇', cls:'' },
    orange:  { em:'🍊', cls:'' },
    cherry:  { em:'🍒', cls:'' },
    once:    { em:'ONCE\nMORE', cls:'once-tile' },
  };

  /* ===== 邊框符號帶 (24格，順時針) =====
     上7 → 右5 → 下7 → 左5
     所有符號都必須在賠率表中有對應（除了 ONCE MORE）
  */
  const BORDER = [
    // top row L→R (0-6)
    'orange','bell','cherry','bar','apple','plum','melon',
    // right col T→B (7-11)
    'cherry','orange','apple','bell','once',
    // bottom row L→R (12-18)  — visually R→L on machine
    'orange','seven','bell','apple','melon','cherry','plum',
    // left col T→B (19-23) — visually B→T on machine
    'once','melon','star','cherry','plum',
  ];

  const BORDER_LEN = BORDER.length; // 24

  /* ===== 賠率表 (9欄) =====
     全部 9 欄都可下注，對應按鈕 1-9
  */
  const PAYTABLE = [
    { sid:'apple',  mult:5,   label:'5'   },  // 0 - btn 1
    { sid:'melon',  mult:20,  label:'20'  },  // 1 - btn 2
    { sid:'star',   mult:30,  label:'30'  },  // 2 - btn 3
    { sid:'seven',  mult:40,  label:'40'  },  // 3 - btn 4
    { sid:'bar',    mult:100, label:'100' },  // 4 - btn 5 ← JACKPOT
    { sid:'bell',   mult:20,  label:'20'  },  // 5 - btn 6
    { sid:'plum',   mult:15,  label:'15'  },  // 6 - btn 7
    { sid:'orange', mult:10,  label:'10'  },  // 7 - btn 8
    { sid:'cherry', mult:2,   label:'2'   },  // 8 - btn 9
  ];

  const BTN_COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];  // all 9 player-controlled

  /* ===== LocalStorage 存檔 ===== */
  const SAVE_KEY = 'xiaomali_credits';
  function loadCredits() {
    const saved = localStorage.getItem(SAVE_KEY);
    return saved !== null ? Math.max(0, parseInt(saved, 10) || 0) : 100;
  }
  function saveCredits() {
    localStorage.setItem(SAVE_KEY, String(credits));
  }

  /* ===== State ===== */
  let credits    = loadCredits();
  let winPool    = 0;       // WIN 累積池
  let bets       = new Array(9).fill(0);
  let spinning   = false;
  let chasePos   = 0;
  let chaseTimer = null;
  let freeSpinPending = false;
  let autoPlay   = false;
  let autoBetPattern = new Array(9).fill(0);

  /* ===== DOM ===== */
  const $ = id => document.getElementById(id);

  function setLed(el, num, digits = 4) {
    const s = String(Math.max(0, Math.floor(num))).padStart(digits, '0').slice(-digits);
    el.querySelectorAll('span').forEach((sp, i) => sp.textContent = s[i]);
  }

  const winLed    = $('winLed');
  const creditLed = $('creditLed');

  function updateCredit() { setLed(creditLed, credits, 4); saveCredits(); }
  function updateWin()    { setLed(winLed, winPool, 4); }

  /* ===== Center symbol display ===== */
  const centerReelCard  = $('center-reel-card');
  const centerSymEl     = $('center-sym-display');

  const SYM_IDLE_ORDER = ['apple','melon','star','seven','bar','bell','plum','orange','cherry'];
  let idleSymIdx = 0;

  function updateCenterSymbol(symId) {
    if (!centerSymEl) return;
    if (symId === null) {
      centerReelCard.classList.remove('spinning', 'win-glow');
      centerSymEl.textContent = '🎰';
      centerSymEl.style.cssText = '';
      return;
    }
    const s = SYMS[symId];
    if (!s) return;
    centerSymEl.textContent = s.em;
    centerSymEl.style.cssText = '';
    if (symId === 'bar') {
      centerSymEl.style.fontSize = '18px';
      centerSymEl.style.fontWeight = '900';
      centerSymEl.style.color = '#ffffff';
    } else if (symId === 'seven') {
      centerSymEl.style.fontSize = '38px';
      centerSymEl.style.fontWeight = '900';
      centerSymEl.style.color = '#ff2222';
      centerSymEl.style.textShadow = '0 0 10px #ff0000';
    } else if (symId === 'once') {
      centerSymEl.style.fontSize = '11px';
      centerSymEl.style.fontWeight = '900';
      centerSymEl.style.color = '#886600';
      centerSymEl.style.whiteSpace = 'pre-line';
      centerSymEl.style.textAlign = 'center';
      centerSymEl.textContent = 'ONCE\nMORE';
    } else {
      centerSymEl.style.fontSize = '40px';
    }
  }

  // Idle: slowly cycle through symbols
  setInterval(() => {
    if (!spinning) {
      idleSymIdx = (idleSymIdx + 1) % SYM_IDLE_ORDER.length;
      updateCenterSymbol(SYM_IDLE_ORDER[idleSymIdx]);
    }
  }, 900);

  /* ===== Build symbol frame ===== */
  function makeTile(symId, posIdx) {
    const div = document.createElement('div');
    const sym = SYMS[symId];
    div.className = 'stile' + (sym.cls ? ' ' + sym.cls : '');
    div.textContent = sym.em;
    div.dataset.pos = posIdx;
    div.dataset.sym = symId;
    const dot = document.createElement('span');
    dot.className = 'tile-led';
    div.appendChild(dot);
    return div;
  }

  const frameTop   = $('frame-top');
  const frameBot   = $('frame-bottom');
  const frameLeft  = $('frame-left');
  const frameRight = $('frame-right');

  const allTiles = [];

  function buildFrame() {
    frameTop.innerHTML = frameBot.innerHTML = frameLeft.innerHTML = frameRight.innerHTML = '';
    allTiles.length = 0;

    for (let i = 0; i < 7; i++) {
      const t = makeTile(BORDER[i], i);
      frameTop.appendChild(t);
      allTiles[i] = t;
    }
    for (let i = 7; i < 12; i++) {
      const t = makeTile(BORDER[i], i);
      frameRight.appendChild(t);
      allTiles[i] = t;
    }
    for (let i = 18; i >= 12; i--) {
      const t = makeTile(BORDER[i], i);
      frameBot.appendChild(t);
      allTiles[i] = t;
    }
    for (let i = 23; i >= 19; i--) {
      const t = makeTile(BORDER[i], i);
      frameLeft.appendChild(t);
      allTiles[i] = t;
    }
  }

  function clearChaseHighlight() {
    allTiles.forEach(t => {
      t.classList.remove('chase-lit', 'chase-trail-1', 'chase-trail-2', 'chase-win');
    });
  }

  function setChaseHighlight(pos) {
    clearChaseHighlight();
    allTiles[pos].classList.add('chase-lit');
    const t1 = (pos - 1 + BORDER_LEN) % BORDER_LEN;
    const t2 = (pos - 2 + BORDER_LEN) % BORDER_LEN;
    allTiles[t1].classList.add('chase-trail-1');
    allTiles[t2].classList.add('chase-trail-2');
  }

  /* ===== Build paytable ===== */
  const ptCols = $('paytable-cols');
  const ptLeds = $('paytable-leds');
  const ptLedEls = [];
  const ptColEls = [];

  function buildPaytable() {
    ptCols.innerHTML = ptLeds.innerHTML = '';
    PAYTABLE.forEach((pt, i) => {
      const sym = SYMS[pt.sid];
      const col = document.createElement('div');
      col.className = 'pt-col' + (i === 4 ? ' pt-jackpot' : '');

      const mult = document.createElement('div');
      mult.className = 'pt-mult';
      mult.textContent = pt.label;

      const symDiv = document.createElement('div');
      symDiv.className = 'pt-sym' + (pt.sid === 'bar' ? ' bar-sym' : pt.sid === 'seven' ? ' seven-sym' : '');
      symDiv.textContent = sym ? sym.em : '';

      col.appendChild(mult);
      col.appendChild(symDiv);
      ptCols.appendChild(col);
      ptColEls.push(col);

      const led = document.createElement('div');
      led.className = 'pt-led';
      led.innerHTML = '<span>0</span><span>0</span>';
      ptLeds.appendChild(led);
      ptLedEls.push(led);
    });
  }

  function setPayLed(colIdx, val, isWin) {
    const s = String(Math.max(0, Math.floor(val))).padStart(2, '0').slice(-2);
    const spans = ptLedEls[colIdx].querySelectorAll('span');
    spans.forEach((sp, i) => sp.textContent = s[i]);
    spans.forEach(sp => {
      if (isWin) {
        sp.style.color = '#ff2200';
        sp.style.textShadow = '0 0 6px rgba(255,50,0,0.8)';
      } else if (val > 0) {
        sp.style.color = '#ff8800';
        sp.style.textShadow = '0 0 4px rgba(255,136,0,0.6)';
      } else {
        sp.style.color = '#550000';
        sp.style.textShadow = 'none';
      }
    });
  }

  function updateAllPayLeds() {
    for (let i = 0; i < 9; i++) {
      setPayLed(i, bets[i], false);
    }
    ptColEls.forEach(c => c.style.background = '');
  }

  function clearBets() {
    bets.fill(0);
    updateAllPayLeds();
  }

  /* ===== Build action buttons ===== */
  const actionSymsEl = $('action-symbols');
  const actionBtnsEl = $('action-btns');
  const actionBtns   = [];

  function buildActionPanel() {
    actionSymsEl.innerHTML = actionBtnsEl.innerHTML = '';
    BTN_COLS.forEach((colIdx, btnIdx) => {
      const pt  = PAYTABLE[colIdx];
      const sym = SYMS[pt.sid];

      const sd = document.createElement('div');
      sd.className = 'act-sym'
        + (pt.sid === 'bar' ? ' bar-sym' : pt.sid === 'seven' ? ' seven-sym' : '');
      sd.textContent = sym ? sym.em : '';
      actionSymsEl.appendChild(sd);

      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.dataset.col = colIdx;
      btn.textContent = String(btnIdx + 1);
      btn.addEventListener('click', () => onBetBtn(colIdx));
      actionBtnsEl.appendChild(btn);
      actionBtns.push(btn);
    });
  }

  /* ===== Panel indicator lights ===== */
  const plights = document.querySelectorAll('.plight');
  let lightTimer = null;
  let lightPhase = 0;

  function startLights(mode) {
    stopLights();
    if (mode === 'idle') {
      lightTimer = setInterval(() => {
        lightPhase++;
        plights.forEach((l, i) => {
          l.className = 'plight';
          if ((i + lightPhase) % 3 === 0) l.classList.add('lit-r');
          else if ((i + lightPhase) % 3 === 1) l.classList.add('lit-y');
        });
      }, 350);
    } else if (mode === 'spin') {
      lightTimer = setInterval(() => {
        lightPhase++;
        plights.forEach((l, i) => {
          l.className = 'plight';
          l.classList.add(['lit-r', 'lit-y', 'lit-g'][(i + lightPhase) % 3]);
        });
      }, 80);
    } else if (mode === 'win') {
      lightTimer = setInterval(() => {
        lightPhase++;
        plights.forEach(l => {
          l.className = 'plight';
          l.classList.add(lightPhase % 2 === 0 ? 'lit-y' : 'lit-r');
        });
      }, 120);
    } else if (mode === 'jackpot') {
      lightTimer = setInterval(() => {
        lightPhase++;
        const cs = ['lit-r', 'lit-y', 'lit-g', 'lit-y'];
        plights.forEach(l => { l.className = 'plight'; l.classList.add(cs[lightPhase % cs.length]); });
      }, 60);
    }
  }

  function stopLights() {
    if (lightTimer) { clearInterval(lightTimer); lightTimer = null; }
    plights.forEach(l => l.className = 'plight');
  }

  /* ===== Betting ===== */
  function onBetBtn(colIdx) {
    Audio.init(); Audio.resume();
    if (spinning) return;
    if (credits <= 0) { Audio.error(); shakeCredit(); return; }

    Audio.click();
    credits--;
    bets[colIdx]++;
    updateCredit();
    setPayLed(colIdx, bets[colIdx], false);

    const btnIdx = BTN_COLS.indexOf(colIdx);
    if (btnIdx >= 0) {
      actionBtns[btnIdx].classList.add('bet-flash');
      setTimeout(() => actionBtns[btnIdx].classList.remove('bet-flash'), 150);
    }
  }

  /* ===== Chase Light Spin ===== */
  function spin() {
    if (spinning) return;

    if (!freeSpinPending) {
      const hasBets = bets.some(b => b > 0);
      if (!hasBets) {
        Audio.error();
        $('game-msg').textContent = '請先下注！';
        setTimeout(() => $('game-msg').textContent = '', 1500);
        return;
      }
    }

    Audio.init();
    Audio.resume();
    Audio.spinStart();

    spinning = true;
    freeSpinPending = false;
    $('game-msg').textContent = '';
    $('startBtn').disabled = true;
    // autoBtn stays enabled so player can stop auto-play mid-spin
    actionBtns.forEach(b => b.disabled = true);
    centerReelCard.classList.add('spinning');
    centerReelCard.classList.remove('win-glow');

    startLights('spin');

    const finalPos = pickStopPosition();

    const minLoops = 2;
    const baseSteps = minLoops * BORDER_LEN;
    const stepsToTarget = (finalPos - chasePos + BORDER_LEN) % BORDER_LEN;
    const totalSteps = baseSteps + stepsToTarget + Math.floor(Math.random() * BORDER_LEN);
    let step = 0;
    const startInterval = 35;
    const endInterval = 300;

    function doStep() {
      chasePos = (chasePos + 1) % BORDER_LEN;
      step++;
      setChaseHighlight(chasePos);
      updateCenterSymbol(BORDER[chasePos]);
      Audio.tick();

      if (step >= totalSteps) {
        onChaseStopped(chasePos);
        return;
      }

      const progress = step / totalSteps;
      const ease = progress * progress;
      const interval = startInterval + (endInterval - startInterval) * ease;

      chaseTimer = setTimeout(doStep, interval);
    }

    chaseTimer = setTimeout(doStep, startInterval);
  }

  function pickStopPosition() {
    const weights = BORDER.map((sym) => {
      if (sym === 'once') return 3;
      if (sym === 'bar') return 1;
      if (sym === 'seven') return 1;
      if (sym === 'star') return 2;
      return 5;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < BORDER_LEN; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  function onChaseStopped(pos) {
    spinning = false;
    clearChaseHighlight();

    allTiles[pos].classList.add('chase-win');
    Audio.reelStop();

    const landedSym = BORDER[pos];
    centerReelCard.classList.remove('spinning');
    updateCenterSymbol(landedSym);

    // ONCE MORE → 免費再轉
    if (landedSym === 'once') {
      centerReelCard.classList.add('win-glow');
      startLights('win');
      $('game-msg').textContent = '★ ONCE MORE! ★';
      $('machine').classList.add('win-flash');

      setTimeout(() => {
        $('machine').classList.remove('win-flash');
        allTiles[pos].classList.remove('chase-win');
        centerReelCard.classList.remove('win-glow');
        freeSpinPending = true;
        $('game-msg').textContent = '免費再轉一次！按開始';
        $('startBtn').disabled = false;
        $('autoBtn').disabled = false;
        startLights('idle');
        if (autoPlay) setTimeout(() => spin(), 1200);
      }, 2000);
      return;
    }

    // 計算中獎
    let totalWin = 0;
    let isJackpot = false;

    for (let i = 0; i < 9; i++) {
      if (bets[i] > 0 && PAYTABLE[i].sid === landedSym) {
        const win = bets[i] * PAYTABLE[i].mult;
        totalWin += win;
        setPayLed(i, PAYTABLE[i].mult, true);
        ptColEls[i].style.background = '#1a1a00';
        if (i === 4) isJackpot = true;
      }
    }

    if (totalWin > 0) {
      // 累積進 WIN 池
      winPool += totalWin;
      updateWin();
      centerReelCard.classList.add('win-glow');

      if (isJackpot) {
        Audio.jackpot();
        startLights('jackpot');
        $('jp-overlay-amount').textContent = '+' + totalWin;
        $('jp-overlay').classList.remove('hidden');
        $('machine').classList.add('win-flash');
        $('game-msg').textContent = '🎰 JACKPOT!! +' + totalWin;
        setTimeout(() => {
          $('jp-overlay').classList.add('hidden');
          $('machine').classList.remove('win-flash');
          finishRound();
        }, 4000);
      } else {
        Audio.win();
        startLights('win');
        $('machine').classList.add('win-flash');
        $('win-amount-display').textContent = '+' + totalWin;
        $('win-overlay').classList.remove('hidden');
        $('game-msg').textContent = '★ WIN! +' + totalWin + ' ★';
        setTimeout(() => {
          $('win-overlay').classList.add('hidden');
          $('machine').classList.remove('win-flash');
          finishRound();
        }, 2500);
      }
    } else {
      $('game-msg').textContent = '再試一次！';
      finishRound();
    }
  }

  function finishRound() {
    startLights('idle');
    clearBets();
    centerReelCard.classList.remove('win-glow');

    setTimeout(() => {
      allTiles.forEach(t => t.classList.remove('chase-win'));

      if (autoPlay) {
        const totalBet = autoBetPattern.reduce((a, b) => a + b, 0);
        if (totalBet <= 0 || credits < totalBet) {
          autoPlay = false;
          $('autoBtn').classList.remove('auto-active');
          $('startBtn').disabled = false;
          $('autoBtn').disabled = false;
          actionBtns.forEach(b => b.disabled = false);
          updateCenterSymbol(null);
          $('game-msg').textContent = totalBet > 0 ? '餘額不足，AUTO停止' : '';
          if (totalBet > 0) setTimeout(() => { if ($('game-msg').textContent.includes('AUTO')) $('game-msg').textContent = ''; }, 2000);
        } else {
          for (let i = 0; i < 9; i++) bets[i] = autoBetPattern[i];
          credits -= totalBet;
          updateCredit();
          updateAllPayLeds();
          $('game-msg').textContent = '';
          spin();
        }
      } else {
        $('startBtn').disabled = false;
        $('autoBtn').disabled = false;
        actionBtns.forEach(b => b.disabled = false);
        updateCenterSymbol(null);
        if ($('game-msg').textContent.startsWith('再')) {
          $('game-msg').textContent = '';
        }
      }
    }, 1500);
  }

  function shakeCredit() {
    creditLed.style.transform = 'translateX(-3px)';
    setTimeout(() => creditLed.style.transform = 'translateX(3px)', 80);
    setTimeout(() => creditLed.style.transform = '', 160);
  }

  /* ===== WIN → CREDIT ===== */
  function transferWinToCredit() {
    if (winPool <= 0 || spinning) return;
    Audio.coin();
    const amount = winPool;
    winPool = 0;
    let transferred = 0;
    const step = Math.max(1, Math.floor(amount / 20));
    const timer = setInterval(() => {
      const chunk = Math.min(step, amount - transferred);
      transferred += chunk;
      credits += chunk;
      updateCredit();
      setLed(winLed, amount - transferred, 4);
      Audio.coinCount();
      if (transferred >= amount) { clearInterval(timer); updateWin(); }
    }, 50);
  }

  /* ===== 離開（兌幣） ===== */
  function cashOut() {
    if (spinning) return;
    Audio.click();
    if (winPool > 0) { credits += winPool; winPool = 0; updateWin(); updateCredit(); }
    clearBets();
    if (credits > 0) {
      $('game-msg').textContent = '兌換 ' + credits + ' 分！謝謝光臨！';
      // 模擬出幣動畫
      const totalCoins = credits;
      credits = 0;
      updateCredit();
      // 重新投幣
      setTimeout(() => {
        credits = 100;
        updateCredit();
        $('game-msg').textContent = '已投幣 100 分，請開始遊戲！';
        setTimeout(() => $('game-msg').textContent = '', 2500);
      }, 2500);
    }
  }

  /* ===== Auto play ===== */
  function toggleAuto() {
    Audio.init(); Audio.resume();
    if (autoPlay) {
      // Turn off — current spin finishes, next one won't start
      autoPlay = false;
      $('autoBtn').classList.remove('auto-active');
      if (!spinning) $('game-msg').textContent = 'AUTO 已停止';
      setTimeout(() => { if ($('game-msg').textContent === 'AUTO 已停止') $('game-msg').textContent = ''; }, 1500);
      return;
    }
    if (spinning) return; // can only turn ON when not spinning
    if (!bets.some(b => b > 0)) {
      Audio.error();
      $('game-msg').textContent = '請先下注再開啟AUTO！';
      setTimeout(() => { if ($('game-msg').textContent.includes('AUTO')) $('game-msg').textContent = ''; }, 1500);
      return;
    }
    autoBetPattern = [...bets];
    autoPlay = true;
    $('autoBtn').classList.add('auto-active');
    spin();
  }

  /* ===== Button handlers ===== */
  $('startBtn').addEventListener('click', () => { if (!spinning) spin(); });
  $('autoBtn').addEventListener('click', toggleAuto);

  // 小注: 一次押 1~4 欄（🍎🍉⭐7），每欄各 1 分
  $('smallBetBtn').addEventListener('click', () => {
    Audio.init(); Audio.resume();
    if (spinning) return;
    Audio.click();
    for (let i = 0; i <= 3; i++) {
      if (credits <= 0) break;
      credits--;
      bets[i]++;
    }
    updateCredit();
    updateAllPayLeds();
    $('game-msg').textContent = '小注：押 🍎🍉⭐7 各1分';
    setTimeout(() => $('game-msg').textContent = '', 1500);
  });

  // 大注: 一次押 6~9 欄（🔔🍇🍊🍒），每欄各 1 分
  $('bigBetBtn').addEventListener('click', () => {
    Audio.init(); Audio.resume();
    if (spinning) return;
    Audio.click();
    for (let i = 5; i <= 8; i++) {
      if (credits <= 0) break;
      credits--;
      bets[i]++;
    }
    updateCredit();
    updateAllPayLeds();
    $('game-msg').textContent = '大注：押 🔔🍇🍊🍒 各1分';
    setTimeout(() => $('game-msg').textContent = '', 1500);
  });

  // WIN→CREDIT
  $('winCreditBtn').addEventListener('click', () => {
    Audio.init(); Audio.resume();
    transferWinToCredit();
  });

  // 儲值: 加 100 分
  $('addCreditBtn').addEventListener('click', () => {
    Audio.init(); Audio.resume();
    if (spinning) return;
    Audio.coin();
    credits += 100;
    updateCredit();
    $('game-msg').textContent = '儲值 +100 分！';
    setTimeout(() => $('game-msg').textContent = '', 1500);
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!spinning) spin();
    }
    if (e.code === 'KeyS') $('smallBetBtn').click();
    if (e.code === 'KeyB') $('bigBetBtn').click();
    if (e.code === 'KeyA') $('autoBtn').click();
    const n = parseInt(e.key);
    if (n >= 1 && n <= 9) onBetBtn(BTN_COLS[n - 1]);
  });

  // Close overlays
  $('win-overlay').addEventListener('click', () => $('win-overlay').classList.add('hidden'));
  $('jp-overlay').addEventListener('click', () => $('jp-overlay').classList.add('hidden'));

  /* ===== Init ===== */
  function init() {
    buildFrame();
    buildPaytable();
    buildActionPanel();
    updateCredit();
    updateWin();
    $('jp-count').textContent = '0';
    startLights('idle');

    // Idle LED animation
    let idlePos = 0;
    setInterval(() => {
      if (!spinning) {
        idlePos = (idlePos + 1) % BORDER_LEN;
        allTiles.forEach((t, i) => {
          const dot = t.querySelector('.tile-led');
          if (dot) {
            dot.classList.toggle('idle-lit', i === idlePos || i === (idlePos + 12) % BORDER_LEN);
          }
        });
      }
    }, 400);
  }

  init();
})();
