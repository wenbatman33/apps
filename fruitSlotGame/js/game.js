/**
 * 小瑪莉 Fruit Slot Machine — Game Logic
 */
(() => {
  'use strict';

  // ===== 符號定義 =====
  const SYMBOLS = [
    { id: 'seven',     display: '7',   cls: 'seven-symbol', weight: 1  },
    { id: 'bar',       display: 'BAR', cls: 'bar-symbol',   weight: 2  },
    { id: 'watermelon',display: '🍉',  cls: '',             weight: 4  },
    { id: 'bell',      display: '🔔',  cls: '',             weight: 5  },
    { id: 'grape',     display: '🍇',  cls: '',             weight: 6  },
    { id: 'orange',    display: '🍊',  cls: '',             weight: 8  },
    { id: 'lemon',     display: '🍋',  cls: '',             weight: 9  },
    { id: 'cherry',    display: '🍒',  cls: '',             weight: 12 },
  ];

  // 按 weight 建立加權陣列
  const SYMBOL_POOL = [];
  SYMBOLS.forEach(s => {
    for (let i = 0; i < s.weight; i++) SYMBOL_POOL.push(s);
  });

  // ===== 賠率表 =====
  // key: 'id-id-id' → multiplier
  const PAYTABLE = {
    'seven-seven-seven':         100,
    'bar-bar-bar':                50,
    'watermelon-watermelon-watermelon': 20,
    'bell-bell-bell':             15,
    'grape-grape-grape':          10,
    'orange-orange-orange':        8,
    'lemon-lemon-lemon':           6,
    'cherry-cherry-cherry':        5,
    'cherry-cherry-any':           2,  // 特殊：前兩格cherry
  };

  // ===== 狀態 =====
  let credits   = 100;
  let bet       = 1;
  let spinning  = false;
  let autoMode  = false;
  let autoTimer = null;
  const holdState = [false, false, false];

  // 每個滾輪目前顯示的符號索引（指向一條長帶）
  const REEL_LENGTH = 32; // 每輪帶子長度
  const reelStrips  = [[], [], []]; // 每輪的符號帶
  const reelPos     = [0, 0, 0];   // 目前位置（指帶子頂端的那格）

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const reelEls    = [$('reel-0'), $('reel-1'), $('reel-2')];
  const windowEls  = [
    reelEls[0].parentElement,
    reelEls[1].parentElement,
    reelEls[2].parentElement,
  ];
  const holdBtns   = [$('hold-0'), $('hold-1'), $('hold-2')];
  const spinBtn    = $('spinBtn');
  const addCoins   = $('addCoins');
  const betPlusBtn = $('betPlus');
  const betMinBtn  = $('betMinus');
  const betMaxBtn  = $('betMax');
  const autoBtn    = $('autoBtn');
  const soundBtn   = $('soundBtn');
  const creditsEl  = $('credits');
  const betEl      = $('betDisplay');
  const winEl      = $('winDisplay');
  const machine    = $('machine');
  const winOverlay = $('win-overlay');
  const jackpotOv  = $('jackpot-overlay');

  // ===== 燈泡 =====
  const LIGHT_COLORS = ['on-red','on-yellow','on-green','on-blue'];
  const BULB_COUNT   = 20;
  let   lightTimer   = null;
  let   lightFrame   = 0;

  function buildLights(rowId) {
    const row = $(rowId);
    for (let i = 0; i < BULB_COUNT; i++) {
      const b = document.createElement('div');
      b.className = 'bulb';
      row.appendChild(b);
    }
  }
  buildLights('topLights');
  buildLights('botLights');

  function allBulbs() {
    return [...document.querySelectorAll('.bulb')];
  }

  function startLights(mode = 'idle') {
    stopLights();
    const bulbs = allBulbs();
    if (mode === 'idle') {
      // 緩慢輪流
      lightTimer = setInterval(() => {
        lightFrame++;
        bulbs.forEach((b, i) => {
          b.className = 'bulb';
          if ((i + lightFrame) % 4 === 0) b.classList.add(LIGHT_COLORS[(i) % 4]);
        });
      }, 300);
    } else if (mode === 'spin') {
      lightTimer = setInterval(() => {
        lightFrame++;
        bulbs.forEach((b, i) => {
          b.className = 'bulb';
          const c = LIGHT_COLORS[(i + lightFrame) % LIGHT_COLORS.length];
          if (lightFrame % 2 === 0) b.classList.add(c);
        });
      }, 80);
    } else if (mode === 'win') {
      lightTimer = setInterval(() => {
        lightFrame++;
        bulbs.forEach((b, i) => {
          b.className = 'bulb';
          const on = (i + lightFrame) % 2 === 0;
          if (on) b.classList.add(lightFrame % 2 === 0 ? 'on-yellow' : 'on-red');
        });
      }, 100);
    } else if (mode === 'jackpot') {
      lightTimer = setInterval(() => {
        lightFrame++;
        bulbs.forEach((b) => {
          b.className = 'bulb';
          b.classList.add(LIGHT_COLORS[lightFrame % LIGHT_COLORS.length]);
        });
      }, 60);
    }
  }

  function stopLights() {
    if (lightTimer) { clearInterval(lightTimer); lightTimer = null; }
    allBulbs().forEach(b => b.className = 'bulb');
  }

  // ===== 初始化帶子 =====
  function randSymbol() {
    return SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
  }

  function buildStrip(idx) {
    const strip = [];
    for (let i = 0; i < REEL_LENGTH; i++) strip.push(randSymbol());
    reelStrips[idx] = strip;
  }

  function buildSymbolEl(sym) {
    const div = document.createElement('div');
    div.className = 'symbol' + (sym.cls ? ' ' + sym.cls : '');
    div.textContent = sym.display;
    div.dataset.id = sym.id;
    return div;
  }

  function renderReel(idx) {
    const el   = reelEls[idx];
    const strip = reelStrips[idx];
    const pos   = reelPos[idx];
    el.innerHTML = '';
    // 顯示 pos-1, pos, pos+1, pos+2（共4格，窗口3格 + 緩衝）
    for (let i = -1; i < 4; i++) {
      const si  = ((pos + i) % REEL_LENGTH + REEL_LENGTH) % REEL_LENGTH;
      el.appendChild(buildSymbolEl(strip[si]));
    }
    el.style.transform = `translateY(-${SYMBOL_SIZE}px)`; // offset by 1 to show 3 visible
  }

  let SYMBOL_SIZE = 80;
  function updateSymbolSize() {
    const w = window.innerWidth;
    if      (w <= 360) SYMBOL_SIZE = 68;
    else if (w >= 500) SYMBOL_SIZE = 90;
    else               SYMBOL_SIZE = 80;
  }

  function initReels() {
    updateSymbolSize();
    for (let i = 0; i < 3; i++) {
      buildStrip(i);
      renderReel(i);
    }
  }

  // ===== 取得目前中線3格符號 =====
  function getVisibleSymbols(idx) {
    const strip = reelStrips[idx];
    const pos   = reelPos[idx];
    // 位置 pos-1=top, pos=mid, pos+1=bot
    return [-1, 0, 1].map(offset => {
      const si = ((pos + offset) % REEL_LENGTH + REEL_LENGTH) % REEL_LENGTH;
      return strip[si];
    });
  }

  // ===== 顯示更新 =====
  function updateUI() {
    creditsEl.textContent = credits;
    betEl.textContent     = bet;
  }

  function flashWinDisplay(amount) {
    winEl.textContent = amount;
    winEl.style.color = '#ff4444';
    winEl.style.textShadow = '0 0 12px #ff0000';
    setTimeout(() => {
      winEl.style.color = '';
      winEl.style.textShadow = '';
    }, 1500);
  }

  // ===== 賠率計算 =====
  function calcWin(rows) {
    // rows[0]=top, rows[1]=mid, rows[2]=bot  各3個滾輪
    // 台灣小瑪莉通常只算中間線（mid），但加了3條線豐富性
    let totalWin = 0;
    const lineResults = [];

    // 3條線：top, mid, bot
    for (let line = 0; line < 3; line++) {
      const syms = rows[line]; // rows[line] = [reel0_sym, reel1_sym, reel2_sym]
      const ids  = syms.map(s => s.id);
      const key3 = ids.join('-');

      if (PAYTABLE[key3] !== undefined) {
        const mult = PAYTABLE[key3];
        const win  = bet * mult;
        totalWin  += win;
        lineResults.push({ line, win, mult, ids, isJackpot: key3 === 'seven-seven-seven' });
        continue;
      }
      // cherry-cherry-any
      if (ids[0] === 'cherry' && ids[1] === 'cherry') {
        const win = bet * PAYTABLE['cherry-cherry-any'];
        totalWin += win;
        lineResults.push({ line, win, mult: 2, ids, isJackpot: false });
      }
    }
    return { totalWin, lineResults };
  }

  // ===== 高亮中獎符號 =====
  function highlightWinSymbols(lineResults) {
    // 先清除
    document.querySelectorAll('.symbol.winning').forEach(s => s.classList.remove('winning'));
    document.querySelectorAll('.win-line-indicator').forEach(l => l.classList.remove('active'));

    const indicators = document.querySelectorAll('.win-line-indicator');
    const lineNames  = ['top-line', 'mid-line', 'bot-line'];

    lineResults.forEach(({ line }) => {
      indicators[line].classList.add('active');
      // 高亮對應行的符號
      reelEls.forEach(reelEl => {
        const symbols = reelEl.querySelectorAll('.symbol');
        if (symbols[line + 1]) symbols[line + 1].classList.add('winning'); // +1 因為有 offset
      });
    });
  }

  // ===== 清除高亮 =====
  function clearHighlights() {
    document.querySelectorAll('.symbol.winning').forEach(s => s.classList.remove('winning'));
    document.querySelectorAll('.win-line-indicator').forEach(l => l.classList.remove('active'));
  }

  // ===== WIN OVERLAY =====
  function showWin(totalWin, isJackpot, lineResults) {
    if (isJackpot) {
      $('jackpot-amount').textContent = '+' + totalWin;
      $('jackpotStars').textContent = '⭐⭐⭐⭐⭐';
      jackpotOv.classList.remove('hidden');
      Audio.jackpot();
      startLights('jackpot');
      machine.classList.add('flash-win');
      setTimeout(() => {
        machine.classList.remove('flash-win');
        jackpotOv.classList.add('hidden');
        startLights('idle');
      }, 4000);
    } else {
      const isBig = totalWin >= bet * 10;
      $('win-emoji').textContent  = isBig ? '🎊' : '🎉';
      $('win-title').textContent  = isBig ? 'BIG WIN!' : 'YOU WIN!';
      $('win-amount').textContent = '+' + totalWin;
      $('win-coins').textContent  = `CREDIT: ${credits}`;
      winOverlay.classList.remove('hidden');
      isBig ? Audio.bigWin() : Audio.win();
      startLights('win');
      machine.classList.add('flash-win');

      // 計數滾動
      let counted = 0;
      const step  = Math.max(1, Math.floor(totalWin / 20));
      const countTimer = setInterval(() => {
        counted = Math.min(counted + step, totalWin);
        $('win-amount').textContent = '+' + counted;
        Audio.coinCount();
        if (counted >= totalWin) clearInterval(countTimer);
      }, 60);

      setTimeout(() => {
        winOverlay.classList.add('hidden');
        machine.classList.remove('flash-win');
        startLights('idle');
      }, isBig ? 3000 : 2000);
    }
  }

  // ===== 旋轉動畫 =====
  const SPIN_TICK_INTERVAL = 40; // ms per tick during spin

  function animateSpin(reelIdx, totalTicks, onDone) {
    const el    = reelEls[reelIdx];
    const strip = reelStrips[reelIdx];
    let   tick  = 0;

    const interval = setInterval(() => {
      tick++;
      reelPos[reelIdx] = (reelPos[reelIdx] + 1) % REEL_LENGTH;
      renderReel(reelIdx);
      if (tick % 3 === 0) Audio.tick();

      if (tick >= totalTicks) {
        clearInterval(interval);
        windowEls[reelIdx].classList.remove('spinning');
        Audio.reelStop();
        onDone();
      }
    }, SPIN_TICK_INTERVAL);
  }

  // ===== 主要 SPIN 邏輯 =====
  function spin() {
    if (spinning) return;
    if (credits < bet) { Audio.error(); shakeCredits(); return; }

    Audio.init();
    Audio.resume();
    Audio.spinStart();
    clearHighlights();

    credits -= bet;
    winEl.textContent = 0;
    updateUI();
    spinning = true;
    spinBtn.disabled = true;

    // 決定目標結果（先決定，動畫後對齊）
    const targetResults = [0, 1, 2].map(i => {
      if (holdState[i]) return null; // hold不動
      return Math.floor(Math.random() * REEL_LENGTH);
    });

    // 設置目標位置
    targetResults.forEach((target, i) => {
      if (target !== null) reelStrips[i] = shuffleStrip(reelStrips[i]);
    });

    startLights('spin');

    // 各滾輪不同停止時間（有延遲感）
    const tickCounts = [
      holdState[0] ? 0 : (28 + Math.floor(Math.random()*12)),
      holdState[1] ? 0 : (36 + Math.floor(Math.random()*12)),
      holdState[2] ? 0 : (44 + Math.floor(Math.random()*12)),
    ];

    let stopped = 0;
    const checkDone = () => {
      stopped++;
      if (stopped < 3) return;

      // 全部停止
      spinning = false;
      spinBtn.disabled = false;

      // 重設 hold
      holdState.fill(false);
      holdBtns.forEach(b => b.classList.remove('active'));

      // 計算中獎
      const rows = [0, 1, 2].map(reelIdx =>
        getVisibleSymbols(reelIdx)
      );
      // rows[reelIdx][linePos]  → rows[reelIdx][0]=top, [1]=mid, [2]=bot
      // 我們需要 rows[linePos][reelIdx]
      const byLine = [
        [rows[0][0], rows[1][0], rows[2][0]], // top line: each reel's top symbol
        [rows[0][1], rows[1][1], rows[2][1]], // mid line
        [rows[0][2], rows[1][2], rows[2][2]], // bot line
      ];

      const { totalWin, lineResults } = calcWin(byLine);

      startLights('idle');

      if (totalWin > 0) {
        credits += totalWin;
        updateUI();
        flashWinDisplay(totalWin);
        highlightWinSymbols(lineResults);
        const isJackpot = lineResults.some(r => r.isJackpot);
        setTimeout(() => showWin(totalWin, isJackpot, lineResults), 300);
      }

      // Auto mode 繼續
      if (autoMode) {
        autoTimer = setTimeout(spin, 1200);
      }
    };

    for (let i = 0; i < 3; i++) {
      if (holdState[i]) {
        // Hold：不動，直接算done
        checkDone();
      } else {
        windowEls[i].classList.add('spinning');
        animateSpin(i, tickCounts[i], checkDone);
      }
    }
  }

  function shuffleStrip(strip) {
    // 局部洗牌讓結果更隨機
    const s = [...strip];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
  }

  function shakeCredits() {
    creditsEl.style.transform = 'translateX(-4px)';
    setTimeout(() => creditsEl.style.transform = 'translateX(4px)', 80);
    setTimeout(() => creditsEl.style.transform = '', 160);
  }

  // ===== 按鈕事件 =====
  spinBtn.addEventListener('click', () => {
    if (!spinning) spin();
  });

  addCoins.addEventListener('click', () => {
    Audio.init();
    Audio.coin();
    credits += 100;
    updateUI();
    // 短暫閃爍credits
    creditsEl.style.color = '#00ff88';
    setTimeout(() => creditsEl.style.color = '', 400);
  });

  betPlusBtn.addEventListener('click', () => {
    Audio.click();
    if (bet < 10) { bet++; updateUI(); }
  });

  betMinBtn.addEventListener('click', () => {
    Audio.click();
    if (bet > 1) { bet--; updateUI(); }
  });

  betMaxBtn.addEventListener('click', () => {
    Audio.click();
    bet = 10; updateUI();
  });

  holdBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (spinning) return;
      Audio.click();
      holdState[i] = !holdState[i];
      btn.classList.toggle('active', holdState[i]);
    });
  });

  autoBtn.addEventListener('click', () => {
    autoMode = !autoMode;
    autoBtn.classList.toggle('auto-active', autoMode);
    autoBtn.textContent = autoMode ? 'AUTO ■' : 'AUTO';
    if (autoMode && !spinning) {
      spin();
    } else if (!autoMode && autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  });

  soundBtn.addEventListener('click', () => {
    Audio.init();
    const en = !Audio.isEnabled();
    Audio.setEnabled(en);
    soundBtn.textContent = en ? '🔊 SOUND ON' : '🔇 SOUND OFF';
    soundBtn.classList.toggle('muted', !en);
  });

  // 鍵盤支援
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!spinning) spin();
    }
    if (e.code === 'KeyA') autoBtn.click();
    if (e.code === 'ArrowUp')   betPlusBtn.click();
    if (e.code === 'ArrowDown') betMinBtn.click();
    if (e.code === 'KeyH') holdBtns[0].click();
    if (e.code === 'KeyJ') holdBtns[1].click();
    if (e.code === 'KeyK') holdBtns[2].click();
  });

  // 點擊 overlay 關閉
  winOverlay.addEventListener('click', () => winOverlay.classList.add('hidden'));
  jackpotOv.addEventListener('click',  () => jackpotOv.classList.add('hidden'));

  window.addEventListener('resize', () => {
    updateSymbolSize();
    initReels();
  });

  // ===== 跑馬燈更新 =====
  function updateMarquee() {
    const msgs = [
      '🎰 歡迎光臨小瑪莉！投幣開始遊戲！🎰',
      '🍒🍒🍒 三個Cherry = 5倍彩金！',
      '7️⃣7️⃣7️⃣ JACKPOT = 押注×100！！！',
      '🔔🔔🔔 三個鈴鐺 = 15倍！',
      '按住 HOLD 保留滾輪位置！',
      '⌨️ 空白鍵 / Enter = 旋轉  ↑↓ = 押注',
    ];
    let idx = 0;
    const el = $('marquee-text');
    setInterval(() => {
      idx = (idx + 1) % msgs.length;
      el.textContent = msgs[idx];
    }, 7000);
  }

  // ===== 啟動 =====
  function start() {
    initReels();
    updateUI();
    startLights('idle');
    updateMarquee();
  }

  start();
})();
