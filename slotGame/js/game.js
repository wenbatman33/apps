/* ===== Classic Sevens Slots — Game Engine ===== */
'use strict';

/* ============================================================
   CONFIGURATION
   ============================================================ */
const COLS = 5, ROWS = 3;
const PAYLINES = [
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
  [2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[1,0,0,1,2],[1,2,2,1,0],[0,1,2,2,1],
];
const LINE_COLORS = [
  '#ff4444','#44ff44','#4488ff','#ffff44','#ff44ff',
  '#44ffff','#ff8844','#88ff44','#ff4488','#44ff88',
  '#8844ff','#ffaa44','#44aaff','#aaff44','#ff44aa',
  '#aa44ff','#44ffaa','#ffaa88','#88aaff','#aaff88',
];

const BET_OPTIONS = [0.20, 0.40, 0.60, 0.80, 1, 2, 5, 10, 20, 50];

// Symbol IDs (index matters for reel strips)
const SYM_IDS = ['orange','lemon','watermelon','plum','banana','cherry','grapes','bar','seven','scatter','wild'];
const SYM_NAMES = {
  orange:'Orange', lemon:'Lemon', watermelon:'Watermelon', plum:'Plum',
  banana:'Banana', cherry:'Cherry', grapes:'Grapes', bar:'BAR',
  seven:'Lucky 7', scatter:'Scatter', wild:'Wild'
};

// Payouts: [3-match, 4-match, 5-match] as multiplier of line bet
const PAY_TABLE = {
  orange:     [8, 25, 100],
  lemon:      [5, 20, 75],
  watermelon: [5, 20, 75],
  plum:       [8, 25, 100],
  banana:     [10, 35, 125],
  cherry:     [10, 35, 125],
  grapes:     [15, 50, 250],
  bar:        [50, 200, 1000],
  seven:      [25, 100, 500],
};
// Scatter pays on total bet
const SCATTER_PAY = { 3: 5, 4: 20, 5: 100 };

// Free spins: scatter count -> {spins, multiplier}
const FREE_SPIN_RULES = {
  3: { spins: 10, mult: 2 },
  4: { spins: 15, mult: 2 },
  5: { spins: 20, mult: 3 },
};

/* ---- Reel Strips (weighted distribution) ---- */
// Each reel strip has ~30 symbols; adjust weights by repeating symbols
const REEL_STRIPS = [
  ['cherry','orange','lemon','plum','banana','watermelon','grapes','cherry','orange','lemon','seven','plum','banana','watermelon','cherry','orange','lemon','plum','banana','grapes','cherry','orange','scatter','lemon','watermelon','plum','bar','banana','orange','lemon'],
  ['orange','lemon','plum','cherry','watermelon','banana','orange','lemon','grapes','cherry','plum','banana','watermelon','orange','wild','lemon','plum','cherry','banana','orange','lemon','watermelon','cherry','plum','scatter','banana','orange','seven','lemon','plum'],
  ['lemon','cherry','orange','banana','plum','watermelon','lemon','cherry','grapes','orange','banana','plum','watermelon','lemon','cherry','seven','orange','banana','plum','scatter','watermelon','lemon','cherry','orange','wild','banana','plum','lemon','cherry','orange'],
  ['plum','banana','orange','cherry','lemon','watermelon','plum','banana','grapes','orange','cherry','lemon','watermelon','plum','banana','orange','cherry','wild','lemon','plum','banana','orange','seven','cherry','lemon','scatter','watermelon','plum','banana','orange'],
  ['banana','cherry','plum','orange','lemon','watermelon','banana','cherry','plum','grapes','orange','lemon','watermelon','banana','cherry','plum','orange','lemon','banana','cherry','scatter','plum','orange','bar','lemon','watermelon','banana','seven','cherry','plum'],
];

/* ============================================================
   AUDIO ENGINE
   ============================================================ */
const Audio = (() => {
  let actx = null;
  let muted = false;

  function ctx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
  }
  function resume() { if (actx && actx.state === 'suspended') actx.resume(); }

  function play(fn) {
    if (muted) return;
    try { resume(); fn(ctx()); } catch(e) {}
  }

  function osc(ac, type, freq, start, dur, vol) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(start); o.stop(start + dur);
  }

  function noise(ac, start, dur, vol) {
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const s = ac.createBufferSource();
    const g = ac.createGain();
    s.buffer = buf;
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    s.connect(g); g.connect(ac.destination);
    s.start(start); s.stop(start + dur);
  }

  return {
    toggle() { muted = !muted; return !muted; },
    isMuted() { return muted; },
    spin() { play(ac => { const t = ac.currentTime; osc(ac,'sawtooth',120,t,0.15,0.08); noise(ac,t,0.1,0.05); }); },
    tick() { play(ac => { osc(ac,'sine',1200,ac.currentTime,0.04,0.06); }); },
    reelStop() { play(ac => { const t = ac.currentTime; osc(ac,'sine',200,t,0.1,0.1); noise(ac,t,0.06,0.08); }); },
    win() { play(ac => { const t = ac.currentTime; [523,659,784,1047].forEach((f,i) => osc(ac,'sine',f,t+i*0.12,0.25,0.1)); }); },
    bigWin() { play(ac => { const t = ac.currentTime; [523,659,784,1047,1319,1568].forEach((f,i) => osc(ac,'sine',f,t+i*0.1,0.4,0.12)); noise(ac,t+0.6,0.3,0.06); }); },
    scatter() { play(ac => { const t = ac.currentTime; [880,1100,1320,1760].forEach((f,i) => osc(ac,'triangle',f,t+i*0.08,0.3,0.1)); }); },
    click() { play(ac => { osc(ac,'sine',800,ac.currentTime,0.03,0.05); }); },
    coin() { play(ac => { const t = ac.currentTime; osc(ac,'sine',1400,t,0.08,0.08); osc(ac,'sine',1800,t+0.06,0.08,0.06); }); },
    gambleWin() { play(ac => { const t = ac.currentTime; [660,880,1100].forEach((f,i) => osc(ac,'sine',f,t+i*0.1,0.2,0.1)); }); },
    gambleLose() { play(ac => { const t = ac.currentTime; [400,300,200].forEach((f,i) => osc(ac,'sine',f,t+i*0.15,0.3,0.08)); }); },
  };
})();

/* ============================================================
   PARTICLE SYSTEM
   ============================================================ */
class Particle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = -Math.random() * 4 - 2;
    this.life = 1;
    this.decay = 0.01 + Math.random() * 0.02;
    this.size = 2 + Math.random() * 4;
    this.color = `hsl(${40 + Math.random() * 20}, 100%, ${50 + Math.random() * 30}%)`;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.12; // gravity
    this.life -= this.decay;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}

/* ============================================================
   MAIN GAME CLASS
   ============================================================ */
class SlotGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // State
    this.state = 'idle'; // idle, spinning, evaluating, win_show, freespin_intro, freespin, gamble
    this.balance = 1000;
    this.betLevel = 4; // index into BET_OPTIONS
    this.lastWin = 0;
    this.totalWin = 0;
    this.grid = []; // 5 cols × 3 rows of symbol ids
    this.reelPositions = [0, 0, 0, 0, 0]; // float positions for animation
    this.reelTargets = [0, 0, 0, 0, 0];
    this.reelSpeeds = [0, 0, 0, 0, 0];
    this.reelStopped = [true, true, true, true, true];
    this.reelStopTimes = [0, 0, 0, 0, 0];
    this.spinStartTime = 0;

    // Free spins
    this.freeSpinsLeft = 0;
    this.freeSpinMult = 1;
    this.freeSpinTotalWin = 0;

    // Wild expansion
    this.expandedWilds = []; // col indices
    this.reSpinPending = false;

    // Win display
    this.winLines = []; // [{lineIdx, symbols, count, payout}]
    this.winShowTimer = 0;
    this.winLineIdx = 0;

    // Auto
    this.autoSpins = 0;
    this.autoActive = false;

    // Gamble
    this.gambleAmount = 0;
    this.gambleCard = 0;

    // Particles
    this.particles = [];

    // RTP control
    this.rtpEnabled = false;
    this.rtpWinRate = 50;
    this.rtpSpins = 0;
    this.rtpWins = 0;

    // Animation
    this.rainbowPhase = 0;
    this.frameCount = 0;

    // Layout (computed on resize)
    this.layout = {};

    this.init();
  }

  init() {
    SymbolRenderer.init();
    this.initGrid();
    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.updateUI();
    this.loop();
  }

  initGrid() {
    this.grid = [];
    for (let c = 0; c < COLS; c++) {
      const strip = REEL_STRIPS[c];
      const pos = Math.floor(Math.random() * strip.length);
      this.reelPositions[c] = pos;
      const col = [];
      for (let r = 0; r < ROWS; r++) {
        col.push(strip[(pos + r) % strip.length]);
      }
      this.grid.push(col);
    }
  }

  /* ---- Layout ---- */
  resize() {
    const cont = document.getElementById('game-container');
    const topBar = document.getElementById('top-bar');
    const fsBar = document.getElementById('freespin-bar');
    const msgBar = document.getElementById('msg-bar');
    const botPanel = document.getElementById('bottom-panel');
    const toolbar = document.getElementById('toolbar');

    const cw = cont.clientWidth;
    const topH = topBar.offsetHeight + (fsBar.classList.contains('hidden') ? 0 : fsBar.offsetHeight);
    const msgH = msgBar.offsetHeight;
    const botH = botPanel.offsetHeight;
    const toolH = toolbar.offsetHeight;
    const availH = cont.clientHeight - topH - msgH - botH - toolH;

    const padding = 12;
    const sideWidth = 20; // rainbow strips
    const gridW = cw - padding * 2 - sideWidth * 2;
    const cellW = gridW / COLS;
    // Cell height: keep cells near-square, never taller than 1.2× cell width
    const maxCellH = cellW * 1.2;
    const cellH = Math.min(Math.max(availH - padding * 2, 100) / ROWS, maxCellH);
    const gridH = cellH * ROWS;
    const symSize = Math.min(cellW, cellH) * 0.88;

    // Canvas height = grid + padding on both sides
    const canvasH = Math.max(200, gridH + padding * 2);
    this.canvas.width  = cw * window.devicePixelRatio;
    this.canvas.height = canvasH * window.devicePixelRatio;
    this.canvas.style.width  = cw + 'px';
    this.canvas.style.height = canvasH + 'px';
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    const canvasW = cw;
    const gridY = padding;

    this.layout = {
      canvasW, canvasH, padding, sideWidth,
      gridX: padding + sideWidth,
      gridY,
      gridW, gridH, cellW, cellH, symSize,
    };
  }

  /* ---- UI Binding ---- */
  bindUI() {
    const $ = id => document.getElementById(id);

    $('btn-spin').addEventListener('click', () => this.onSpin());
    $('btn-bet-down').addEventListener('click', () => this.changeBet(-1));
    $('btn-bet-up').addEventListener('click', () => this.changeBet(1));
    $('btn-maxbet').addEventListener('click', () => { this.betLevel = BET_OPTIONS.length - 1; this.updateUI(); Audio.click(); });
    $('btn-auto').addEventListener('click', () => this.toggleAuto());
    $('btn-sound').addEventListener('click', () => {
      const on = Audio.toggle();
      $('btn-sound').textContent = on ? '\u{1F50A}' : '\u{1F507}';
    });
    $('btn-info').addEventListener('click', () => this.showPaytable());
    $('btn-paytable').addEventListener('click', () => this.showPaytable());
    $('btn-settings').addEventListener('click', () => { /* placeholder */ });
    $('btn-rtp').addEventListener('click', () => $('rtp-panel').classList.toggle('hidden'));

    // RTP panel
    $('rtp-enabled').addEventListener('change', e => { this.rtpEnabled = e.target.checked; });
    $('rtp-slider').addEventListener('input', e => {
      this.rtpWinRate = parseInt(e.target.value);
      $('rtp-val').textContent = this.rtpWinRate;
    });

    // Paytable close
    $('paytable-modal').addEventListener('click', e => {
      if (e.target === $('paytable-modal') || e.target.classList.contains('modal-close'))
        $('paytable-modal').classList.add('hidden');
    });

    // Big win overlay close
    $('bigwin-overlay').addEventListener('click', () => {
      $('bigwin-overlay').classList.add('hidden');
      this.finishWinShow();
    });

    // Gamble buttons
    $('btn-collect').addEventListener('click', () => this.gambleCollect());
    $('btn-gamble-pick').addEventListener('click', () => this.gamblePick());

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.onSpin(); }
      if (e.key === '`') $('rtp-panel').classList.toggle('hidden');
    });

    // Touch resume audio
    document.addEventListener('touchstart', () => Audio.click(), { once: true });
    document.addEventListener('click', () => { /* ensure audio context */ }, { once: true });
  }

  /* ---- Bet ---- */
  get bet() { return BET_OPTIONS[this.betLevel]; }
  get lineBet() { return this.bet / PAYLINES.length; }

  changeBet(dir) {
    if (this.state !== 'idle') return;
    this.betLevel = Math.max(0, Math.min(BET_OPTIONS.length - 1, this.betLevel + dir));
    this.updateUI();
    Audio.click();
  }

  /* ---- Auto ---- */
  toggleAuto() {
    if (this.autoActive) {
      this.autoActive = false;
      this.autoSpins = 0;
    } else {
      this.autoActive = true;
      this.autoSpins = 10;
      if (this.state === 'idle') this.onSpin();
    }
    this.updateUI();
  }

  /* ---- Spin ---- */
  onSpin() {
    if (this.state === 'win_show') {
      // Skip win show
      this.finishWinShow();
      return;
    }
    if (this.state !== 'idle') return;

    const cost = this.freeSpinsLeft > 0 ? 0 : this.bet;
    if (this.balance < cost) {
      this.showMsg('Insufficient balance!');
      this.autoActive = false;
      this.autoSpins = 0;
      this.updateUI();
      return;
    }

    this.balance -= cost;
    this.lastWin = 0;
    this.totalWin = 0;
    this.winLines = [];
    this.expandedWilds = [];
    this.reSpinPending = false;
    this._lockedWildCols = [];

    if (this.freeSpinsLeft > 0) {
      this.freeSpinsLeft--;
      this.showMsg(`Free Spin! ${this.freeSpinsLeft} remaining`);
    }

    this.state = 'spinning';
    this.spinStartTime = performance.now();

    // Determine outcome
    const outcome = this.generateOutcome();

    // Set reel targets
    for (let c = 0; c < COLS; c++) {
      const strip = REEL_STRIPS[c];
      // Find position in strip that gives desired symbols
      let targetPos = this.findStripPosition(c, outcome[c]);
      this.reelTargets[c] = targetPos;
      this.reelSpeeds[c] = 25 + c * 3; // stagger speed
      this.reelStopped[c] = false;
      this.reelStopTimes[c] = 600 + c * 200; // cascade delay
    }

    Audio.spin();
    this.updateUI();
  }

  generateOutcome() {
    // RTP control
    if (this.rtpEnabled) {
      this.rtpSpins++;
      const shouldWin = Math.random() * 100 < this.rtpWinRate;
      if (!shouldWin) {
        return this.generateLosingOutcome();
      }
    }

    // Normal weighted random: pick from reel strips
    const result = [];
    for (let c = 0; c < COLS; c++) {
      const strip = REEL_STRIPS[c];
      const pos = Math.floor(Math.random() * strip.length);
      const col = [];
      for (let r = 0; r < ROWS; r++) {
        col.push(strip[(pos + r) % strip.length]);
      }
      result.push(col);
    }
    return result;
  }

  generateLosingOutcome() {
    // Generate a result guaranteed to have no wins
    let result;
    let attempts = 0;
    do {
      result = [];
      for (let c = 0; c < COLS; c++) {
        const strip = REEL_STRIPS[c];
        const pos = Math.floor(Math.random() * strip.length);
        const col = [];
        for (let r = 0; r < ROWS; r++) {
          col.push(strip[(pos + r) % strip.length]);
        }
        result.push(col);
      }
      attempts++;
    } while (this.evaluateGrid(result).length > 0 && attempts < 50);
    return result;
  }

  findStripPosition(col, targetSymbols) {
    const strip = REEL_STRIPS[col];
    // Find first position where strip matches target
    for (let p = 0; p < strip.length; p++) {
      let match = true;
      for (let r = 0; r < ROWS; r++) {
        if (strip[(p + r) % strip.length] !== targetSymbols[r]) {
          match = false; break;
        }
      }
      if (match) return p;
    }
    // Fallback: inject symbols (shouldn't happen with well-designed strips)
    return Math.floor(Math.random() * strip.length);
  }

  /* ---- Evaluation ---- */
  evaluateGrid(grid) {
    const wins = [];

    // Check paylines
    PAYLINES.forEach((line, lineIdx) => {
      const syms = line.map((row, col) => grid[col][row]);

      // Resolve wilds
      let firstNonWild = syms.find(s => s !== 'wild' && s !== 'scatter');
      if (!firstNonWild) firstNonWild = 'bar'; // all wilds → treat as highest paying
      if (firstNonWild === 'scatter') return; // scatter doesn't pay on lines

      let count = 0;
      for (let i = 0; i < COLS; i++) {
        if (syms[i] === firstNonWild || syms[i] === 'wild') {
          count++;
        } else break;
      }

      if (count >= 3 && PAY_TABLE[firstNonWild]) {
        const payIdx = count - 3;
        const payout = PAY_TABLE[firstNonWild][payIdx] * this.lineBet;
        wins.push({ lineIdx, symbol: firstNonWild, count, payout, positions: line.slice(0, count) });
      }
    });

    // Scatter check (count across entire grid)
    let scatterCount = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[c][r] === 'scatter') scatterCount++;
      }
    }
    if (scatterCount >= 3 && SCATTER_PAY[scatterCount]) {
      wins.push({
        lineIdx: -1, symbol: 'scatter', count: scatterCount,
        payout: SCATTER_PAY[scatterCount] * this.bet,
        isScatter: true
      });
    }

    return wins;
  }

  /* ---- Animation Loop ---- */
  loop() {
    this.frameCount++;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    const now = performance.now();

    // Spinning animation
    if (this.state === 'spinning') {
      let allStopped = true;
      for (let c = 0; c < COLS; c++) {
        if (this.reelStopped[c]) continue;

        const elapsed = now - this.spinStartTime;
        if (elapsed < this.reelStopTimes[c]) {
          // Still spinning
          this.reelPositions[c] += this.reelSpeeds[c] * 0.06;
          const stripLen = REEL_STRIPS[c].length;
          this.reelPositions[c] %= stripLen;
          allStopped = false;
        } else {
          // Decelerate and stop
          const decelElapsed = elapsed - this.reelStopTimes[c];
          if (decelElapsed < 300) {
            const decelFactor = 1 - (decelElapsed / 300);
            this.reelPositions[c] += this.reelSpeeds[c] * 0.06 * decelFactor;
            const stripLen = REEL_STRIPS[c].length;
            this.reelPositions[c] %= stripLen;
            allStopped = false;
          } else if (!this.reelStopped[c]) {
            this.reelPositions[c] = this.reelTargets[c];
            this.reelStopped[c] = true;
            Audio.reelStop();
            // Update grid for this column
            const strip = REEL_STRIPS[c];
            for (let r = 0; r < ROWS; r++) {
              this.grid[c][r] = strip[(this.reelTargets[c] + r) % strip.length];
            }
          }
        }
        if (!this.reelStopped[c]) allStopped = false;
      }

      if (allStopped) {
        this.state = 'evaluating';
        this.evaluate();
      }
    }

    // Win show timer
    if (this.state === 'win_show') {
      this.winShowTimer++;
      if (this.winShowTimer % 45 === 0) {
        this.winLineIdx = (this.winLineIdx + 1) % this.winLines.length;
      }
      // Auto-advance: faster during auto play
      const showDuration = this.autoActive
        ? Math.min(this.winLines.length * 30 + 30, 90)
        : this.winLines.length * 45 + 40;
      if (this.winShowTimer > showDuration) {
        this.finishWinShow();
      }
    }

    // Particles
    this.particles = this.particles.filter(p => {
      p.update();
      return p.life > 0;
    });

    // Rainbow phase
    this.rainbowPhase += 0.02;
  }

  evaluate() {
    // Check for NEW wild expansion (skip already-locked columns from prior re-spins)
    const prevLocked = new Set(this._lockedWildCols || []);
    const newWilds = [];
    for (let c = 0; c < COLS; c++) {
      if (prevLocked.has(c)) continue; // already expanded
      for (let r = 0; r < ROWS; r++) {
        if (this.grid[c][r] === 'wild') {
          if (!newWilds.includes(c)) newWilds.push(c);
          break;
        }
      }
    }

    // Expand new wilds
    if (newWilds.length > 0) {
      newWilds.forEach(c => {
        for (let r = 0; r < ROWS; r++) {
          this.grid[c][r] = 'wild';
        }
      });
      this.expandedWilds = [...prevLocked, ...newWilds];
      this._lockedWildCols = [...this.expandedWilds];
      this.reSpinPending = true;
    } else {
      this.expandedWilds = [...prevLocked];
      this.reSpinPending = false;
    }

    const wins = this.evaluateGrid(this.grid);
    this.winLines = wins;

    let totalPayout = 0;
    wins.forEach(w => {
      totalPayout += w.payout;
    });

    // Apply free spin multiplier
    if (this.freeSpinMult > 1) {
      totalPayout *= this.freeSpinMult;
    }

    this.totalWin = totalPayout;
    this.lastWin = totalPayout;

    // RTP tracking
    if (this.rtpEnabled) {
      if (totalPayout > 0) this.rtpWins++;
      document.getElementById('rtp-last').textContent = totalPayout > 0 ? 'WIN' : 'LOSS';
      document.getElementById('rtp-spins').textContent = this.rtpSpins;
      document.getElementById('rtp-wins').textContent = this.rtpWins;
    }

    // Check scatter for free spins
    const scatterWin = wins.find(w => w.isScatter);
    if (scatterWin) {
      const rule = FREE_SPIN_RULES[scatterWin.count];
      if (rule) {
        this.freeSpinsLeft += rule.spins;
        this.freeSpinMult = rule.mult;
        this.freeSpinTotalWin = 0;
        Audio.scatter();
        this.showMsg(`${rule.spins} Free Spins with x${rule.mult} multiplier!`);
      }
    }

    if (this.freeSpinsLeft > 0) {
      this.freeSpinTotalWin += totalPayout;
    }

    if (totalPayout > 0) {
      this.balance += totalPayout;
      Audio.win();

      // Spawn particles at win positions
      wins.forEach(w => {
        if (!w.isScatter && w.positions) {
          for (let i = 0; i < w.count; i++) {
            const px = this.layout.gridX + i * this.layout.cellW + this.layout.cellW / 2;
            const py = this.layout.gridY + w.positions[i] * this.layout.cellH + this.layout.cellH / 2;
            for (let j = 0; j < 8; j++) this.particles.push(new Particle(px, py));
          }
        }
      });

      // Big win check
      if (totalPayout >= this.bet * 10) {
        this.state = 'win_show';
        this.showBigWin(totalPayout);
        return;
      }

      this.state = 'win_show';
      this.winShowTimer = 0;
      this.winLineIdx = 0;
    } else {
      this.finishWinShow();
    }

    this.updateUI();
  }

  finishWinShow() {
    this.state = 'idle';
    this.winLines = [];

    // Re-spin from wild expansion
    if (this.reSpinPending) {
      this.reSpinPending = false;
      this.showMsg('Wild Re-Spin!');
      setTimeout(() => {
        if (this.state === 'idle') this.doReSpin();
      }, 400);
      return;
    }

    // Continue free spins
    if (this.freeSpinsLeft > 0) {
      this.updateFreespinBar();
      setTimeout(() => {
        if (this.state === 'idle') this.onSpin();
      }, 300);
      return;
    } else if (this.freeSpinMult > 1) {
      // Free spins ended
      this.showMsg(`Free Spins complete! Won: ${this.freeSpinTotalWin.toFixed(2)}`);
      this.freeSpinMult = 1;
      this.freeSpinTotalWin = 0;
      document.getElementById('freespin-bar').classList.add('hidden');
      this.resize();
    }

    // Auto play
    if (this.autoActive && this.autoSpins > 0) {
      this.autoSpins--;
      if (this.autoSpins <= 0) {
        this.autoActive = false;
      }
      this.updateUI();
      if (this.autoActive) {
        setTimeout(() => {
          if (this.state === 'idle') this.onSpin();
        }, 300);
      }
      return;
    }

    // Offer gamble if won
    if (this.lastWin > 0 && !this.autoActive && this.freeSpinsLeft === 0) {
      this.gambleAmount = this.lastWin;
    }

    this.updateUI();
  }

  doReSpin() {
    // Re-spin non-wild columns only
    this.state = 'spinning';
    this.spinStartTime = performance.now();

    for (let c = 0; c < COLS; c++) {
      if (this.expandedWilds.includes(c)) {
        // Lock this column
        this.reelStopped[c] = true;
        continue;
      }
      const strip = REEL_STRIPS[c];
      const pos = Math.floor(Math.random() * strip.length);
      this.reelTargets[c] = pos;
      this.reelSpeeds[c] = 25 + c * 3;
      this.reelStopped[c] = false;
      this.reelStopTimes[c] = 500 + c * 180;
    }

    Audio.spin();
    this.updateUI();
  }

  /* ---- Big Win ---- */
  showBigWin(amount) {
    const overlay = document.getElementById('bigwin-overlay');
    const text = document.getElementById('bigwin-text');
    const amountEl = document.getElementById('bigwin-amount');

    if (amount >= this.bet * 50) text.textContent = 'MEGA WIN!';
    else if (amount >= this.bet * 25) text.textContent = 'SUPER WIN!';
    else text.textContent = 'BIG WIN!';

    overlay.classList.remove('hidden');
    Audio.bigWin();

    // Animate counter
    let current = 0;
    const target = amount;
    const step = target / 60;
    const counter = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(counter);
      }
      amountEl.textContent = current.toFixed(2);
    }, 30);

    // Particles
    for (let i = 0; i < 60; i++) {
      this.particles.push(new Particle(
        this.layout.canvasW * Math.random(),
        this.layout.canvasH * Math.random()
      ));
    }

    // Auto-dismiss during auto play or free spins
    if (this.autoActive || this.freeSpinsLeft > 0) {
      setTimeout(() => {
        if (!overlay.classList.contains('hidden')) {
          overlay.classList.add('hidden');
          this.finishWinShow();
        }
      }, 2000);
    }
  }

  /* ---- Gamble ---- */
  offerGamble() {
    if (this.gambleAmount <= 0) return;
    document.getElementById('gamble-overlay').classList.remove('hidden');
    document.getElementById('gamble-bet').textContent = this.gambleAmount.toFixed(2);
    document.getElementById('gamble-win').textContent = (this.gambleAmount * 2).toFixed(2);
    document.getElementById('dealer-card').textContent = '?';
    document.getElementById('dealer-card').className = 'card dealer-card';
    document.getElementById('player-card').textContent = '?';
    document.getElementById('player-card').className = 'card player-card';
  }

  gamblePick() {
    const suits = ['\u2665', '\u2666', '\u2663', '\u2660'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const dealerVal = Math.floor(Math.random() * 13);
    const playerVal = Math.floor(Math.random() * 13);

    const dealerCard = document.getElementById('dealer-card');
    const playerCard = document.getElementById('player-card');

    dealerCard.textContent = values[dealerVal] + suits[Math.floor(Math.random() * 4)];
    dealerCard.classList.add('revealed');
    playerCard.textContent = values[playerVal] + suits[Math.floor(Math.random() * 4)];
    playerCard.classList.add('revealed');

    setTimeout(() => {
      if (playerVal > dealerVal) {
        // Win
        this.gambleAmount *= 2;
        this.balance += this.gambleAmount;
        playerCard.classList.add('win');
        dealerCard.classList.add('lose');
        Audio.gambleWin();
        document.getElementById('gamble-bet').textContent = this.gambleAmount.toFixed(2);
        document.getElementById('gamble-win').textContent = (this.gambleAmount * 2).toFixed(2);
        this.showMsg('Gamble Win!');
      } else {
        // Lose
        this.balance -= this.gambleAmount;
        this.gambleAmount = 0;
        playerCard.classList.add('lose');
        dealerCard.classList.add('win');
        Audio.gambleLose();
        this.showMsg('Gamble Lost!');
        setTimeout(() => this.gambleCollect(), 1500);
      }
      this.updateUI();
    }, 500);
  }

  gambleCollect() {
    document.getElementById('gamble-overlay').classList.add('hidden');
    this.gambleAmount = 0;
    this.updateUI();
  }

  /* ---- Paytable ---- */
  showPaytable() {
    const modal = document.getElementById('paytable-modal');
    const pages = document.getElementById('paytable-pages');
    const dots = document.getElementById('paytable-dots');
    pages.innerHTML = '';
    dots.innerHTML = '';

    // Page 1: Major symbols
    const p1 = document.createElement('div');
    p1.className = 'paytable-page';
    p1.innerHTML = '<h3>MAJOR SYMBOLS</h3>';
    const c1 = document.createElement('canvas');
    c1.width = 340; c1.height = 300;
    const ctx1 = c1.getContext('2d');
    this.drawPaytablePage(ctx1, ['wild','scatter','bar','seven','grapes'], 340, 300);
    p1.appendChild(c1);
    pages.appendChild(p1);

    // Page 2: Minor symbols
    const p2 = document.createElement('div');
    p2.className = 'paytable-page hidden';
    p2.innerHTML = '<h3>MINOR SYMBOLS</h3>';
    const c2 = document.createElement('canvas');
    c2.width = 340; c2.height = 360;
    const ctx2 = c2.getContext('2d');
    this.drawPaytablePage(ctx2, ['cherry','banana','plum','orange','lemon','watermelon'], 340, 360);
    p2.appendChild(c2);
    pages.appendChild(p2);

    // Page 3: Paylines
    const p3 = document.createElement('div');
    p3.className = 'paytable-page hidden';
    p3.innerHTML = '<h3>PAYLINES</h3>';
    const c3 = document.createElement('canvas');
    c3.width = 340; c3.height = 360;
    const ctx3 = c3.getContext('2d');
    this.drawPaylinesPage(ctx3, 340, 360);
    p3.appendChild(c3);
    pages.appendChild(p3);

    // Page 4: Free game info
    const p4 = document.createElement('div');
    p4.className = 'paytable-page hidden';
    p4.innerHTML = `<h3>FREE GAME</h3>
      <div style="color:#c0b0a0;font-size:12px;line-height:1.6;padding:8px">
        <p>3 or more SCATTER anywhere on reels triggers Free Spins!</p>
        <p style="margin:8px 0"><span style="color:#ffee40">3 Scatter</span> = 10 Free Spins with x2 Multiplier</p>
        <p><span style="color:#ffee40">4 Scatter</span> = 15 Free Spins with x2 Multiplier</p>
        <p style="margin:8px 0"><span style="color:#ffee40">5 Scatter</span> = 20 Free Spins with x3 Multiplier</p>
        <hr style="border-color:#5a4020;margin:12px 0">
        <p><span style="color:#ffd040">WILD (Bell)</span> expands to fill entire reel and grants 1 Re-Spin!</p>
        <p style="margin-top:8px">During Re-Spin, Wild reels are locked while other reels spin again.</p>
      </div>`;
    pages.appendChild(p4);

    const allPages = pages.querySelectorAll('.paytable-page');
    let currentPage = 0;

    for (let i = 0; i < allPages.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'page-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => {
        allPages.forEach(p => p.classList.add('hidden'));
        allPages[i].classList.remove('hidden');
        dots.querySelectorAll('.page-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        currentPage = i;
      });
      dots.appendChild(dot);
    }

    // Swipe support
    let startX = 0;
    pages.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
    pages.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        const dir = dx < 0 ? 1 : -1;
        const next = Math.max(0, Math.min(allPages.length - 1, currentPage + dir));
        if (next !== currentPage) {
          dots.children[next].click();
        }
      }
    });

    modal.classList.remove('hidden');
  }

  drawPaytablePage(ctx, symbols, w, h) {
    const rowH = h / symbols.length;
    symbols.forEach((sym, i) => {
      const y = i * rowH;
      SymbolRenderer.drawSymbolAt(ctx, sym, 8, y + 4, rowH - 8, rowH - 8);

      ctx.font = 'bold 13px Arial';
      ctx.fillStyle = '#ffd700';
      ctx.textBaseline = 'top';
      ctx.fillText(SYM_NAMES[sym], rowH + 8, y + 8);

      ctx.font = '11px Arial';
      ctx.fillStyle = '#c0b0a0';
      if (sym === 'wild') {
        ctx.fillText('Substitutes all except Scatter', rowH + 8, y + 26);
        ctx.fillText('Expands to fill entire reel', rowH + 8, y + 42);
      } else if (sym === 'scatter') {
        ctx.fillText(`3×: ${SCATTER_PAY[3]}x  4×: ${SCATTER_PAY[4]}x  5×: ${SCATTER_PAY[5]}x`, rowH + 8, y + 26);
        ctx.fillText('(Total Bet multiplier)', rowH + 8, y + 42);
      } else if (PAY_TABLE[sym]) {
        const p = PAY_TABLE[sym];
        ctx.fillText(`3×: ${p[0]}   4×: ${p[1]}   5×: ${p[2]}`, rowH + 8, y + 26);
      }
    });
  }

  drawPaylinesPage(ctx, w, h) {
    const cols = 4, rows = 5;
    const cellW = w / cols;
    const cellH = h / rows;
    const gridW = 50, gridH = 24;

    for (let i = 0; i < 20; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * cellW + cellW / 2;
      const cy = row * cellH + cellH / 2;

      // Mini grid
      const gx = cx - gridW / 2;
      const gy = cy - gridH / 2;
      ctx.fillStyle = '#2a1a08';
      ctx.fillRect(gx, gy, gridW, gridH);
      ctx.strokeStyle = '#5a4020';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(gx, gy, gridW, gridH);

      // Line
      const line = PAYLINES[i];
      ctx.beginPath();
      ctx.strokeStyle = LINE_COLORS[i];
      ctx.lineWidth = 2;
      for (let c = 0; c < 5; c++) {
        const lx = gx + (c + 0.5) * (gridW / 5);
        const ly = gy + (line[c] + 0.5) * (gridH / 3);
        if (c === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.stroke();

      // Line number
      ctx.font = 'bold 10px Arial';
      ctx.fillStyle = LINE_COLORS[i];
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, cx, cy + gridH / 2 + 14);
    }
    ctx.textAlign = 'left';
  }

  /* ---- UI ---- */
  updateUI() {
    document.getElementById('balance-top').textContent = this.balance.toFixed(2);
    document.getElementById('bet-display').textContent = this.bet.toFixed(2);
    document.getElementById('win-display').textContent = this.lastWin > 0 ? this.lastWin.toFixed(2) : '0';

    const spinBtn = document.getElementById('btn-spin');
    spinBtn.disabled = this.state === 'spinning' || this.state === 'evaluating';
    if (this.state === 'spinning') {
      spinBtn.textContent = 'STOP';
      spinBtn.classList.add('stop-btn');
    } else {
      spinBtn.textContent = this.freeSpinsLeft > 0 ? 'FREE' : 'SPIN';
      spinBtn.classList.remove('stop-btn');
    }

    const autoBtn = document.getElementById('btn-auto');
    if (this.autoActive) {
      autoBtn.textContent = `STOP\n(${this.autoSpins})`;
      autoBtn.classList.add('active');
    } else {
      autoBtn.textContent = 'AUTO\n10';
      autoBtn.classList.remove('active');
    }

    this.updateFreespinBar();
  }

  updateFreespinBar() {
    const bar = document.getElementById('freespin-bar');
    if (this.freeSpinsLeft > 0 || this.freeSpinMult > 1) {
      bar.classList.remove('hidden');
      document.getElementById('fs-multiplier').textContent = `x${this.freeSpinMult}`;
      document.getElementById('fs-count').textContent = `${this.freeSpinsLeft} FREE SPINS`;
      this.resize();
    }
  }

  showMsg(text) {
    document.getElementById('msg-bar').textContent = text;
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => {
      document.getElementById('msg-bar').innerHTML = '&nbsp;';
    }, 3000);
  }

  /* ============================================================
     DRAWING
     ============================================================ */
  draw() {
    const ctx = this.ctx;
    const L = this.layout;
    if (!L.canvasW) return;

    ctx.clearRect(0, 0, L.canvasW, L.canvasH);

    // Background
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, L.canvasW, L.canvasH);

    this.drawRainbowStrips(ctx, L);
    this.drawSlotFrame(ctx, L);
    this.drawReels(ctx, L);
    this.drawWinLines(ctx, L);
    this.drawParticles(ctx);
  }

  drawRainbowStrips(ctx, L) {
    const colors = ['#ff2020','#ff6020','#ffcc20','#20dd20','#2080ff','#8020ff'];
    const stripW = L.sideWidth;
    const stripH = L.gridH / colors.length;
    const phase = this.rainbowPhase;

    // Left strip
    colors.forEach((c, i) => {
      const idx = (i + Math.floor(phase * 3)) % colors.length;
      const brightness = 0.5 + 0.5 * Math.sin(phase * 4 + i * 0.8);
      ctx.fillStyle = colors[idx];
      ctx.globalAlpha = 0.4 + brightness * 0.6;
      ctx.fillRect(L.padding, L.gridY + i * stripH, stripW, stripH);
    });

    // Right strip
    colors.forEach((c, i) => {
      const idx = (colors.length - 1 - i + Math.floor(phase * 3)) % colors.length;
      const brightness = 0.5 + 0.5 * Math.sin(phase * 4 + i * 0.8 + 1);
      ctx.fillStyle = colors[idx];
      ctx.globalAlpha = 0.4 + brightness * 0.6;
      ctx.fillRect(L.canvasW - L.padding - stripW, L.gridY + i * stripH, stripW, stripH);
    });

    ctx.globalAlpha = 1;
  }

  drawSlotFrame(ctx, L) {
    // Frame border
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.gridX - 2, L.gridY - 2, L.gridW + 4, L.gridH + 4);

    // Inner bg — matches sprite sheet background colour
    ctx.fillStyle = '#120a24';
    ctx.fillRect(L.gridX, L.gridY, L.gridW, L.gridH);

    // Grid lines
    ctx.strokeStyle = 'rgba(139,105,20,0.3)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      const x = L.gridX + c * L.cellW;
      ctx.beginPath();
      ctx.moveTo(x, L.gridY);
      ctx.lineTo(x, L.gridY + L.gridH);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      const y = L.gridY + r * L.cellH;
      ctx.beginPath();
      ctx.moveTo(L.gridX, y);
      ctx.lineTo(L.gridX + L.gridW, y);
      ctx.stroke();
    }
  }

  drawReels(ctx, L) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.gridX, L.gridY, L.gridW, L.gridH);
    ctx.clip();

    for (let c = 0; c < COLS; c++) {
      const strip = REEL_STRIPS[c];
      const pos = this.reelPositions[c];

      if (this.reelStopped[c]) {
        // Draw final symbols
        for (let r = 0; r < ROWS; r++) {
          const sym = this.grid[c][r];
          const x = L.gridX + c * L.cellW + (L.cellW - L.symSize) / 2;
          const y = L.gridY + r * L.cellH + (L.cellH - L.symSize) / 2;

          // Highlight expanded wilds
          if (this.expandedWilds.includes(c) && sym === 'wild') {
            ctx.fillStyle = 'rgba(255,208,64,0.15)';
            ctx.fillRect(L.gridX + c * L.cellW, L.gridY + r * L.cellH, L.cellW, L.cellH);
          }

          SymbolRenderer.drawSymbolAt(ctx, sym, x, y, L.symSize, L.symSize);
        }
      } else {
        // Spinning: draw scrolling symbols
        const fractional = pos % 1;
        const base = Math.floor(pos);

        for (let r = -1; r <= ROWS; r++) {
          const symIdx = (base + r + strip.length) % strip.length;
          const sym = strip[symIdx];
          const x = L.gridX + c * L.cellW + (L.cellW - L.symSize) / 2;
          const y = L.gridY + (r - fractional) * L.cellH + (L.cellH - L.symSize) / 2;

          // Blur effect during fast spin
          ctx.save();
          if (this.reelSpeeds[c] > 15) {
            ctx.globalAlpha = 0.6;
          }
          SymbolRenderer.drawSymbolAt(ctx, sym, x, y, L.symSize, L.symSize);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  drawWinLines(ctx, L) {
    if (this.state !== 'win_show' || this.winLines.length === 0) return;

    const win = this.winLines[this.winLineIdx % this.winLines.length];
    if (!win || win.isScatter) {
      // Scatter: highlight all scatter positions
      if (win && win.isScatter) {
        const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.15);
        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
            if (this.grid[c][r] === 'scatter') {
              ctx.fillStyle = `rgba(255,100,50,${0.2 + pulse * 0.3})`;
              ctx.fillRect(L.gridX + c * L.cellW, L.gridY + r * L.cellH, L.cellW, L.cellH);
            }
          }
        }
      }
      return;
    }

    const lineIdx = win.lineIdx;
    const line = PAYLINES[lineIdx];
    const color = LINE_COLORS[lineIdx];

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    for (let c = 0; c < COLS; c++) {
      const x = L.gridX + (c + 0.5) * L.cellW;
      const y = L.gridY + (line[c] + 0.5) * L.cellH;
      if (c === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Highlight winning cells
    const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.15);
    for (let c = 0; c < win.count; c++) {
      const x = L.gridX + c * L.cellW;
      const y = L.gridY + line[c] * L.cellH;
      ctx.fillStyle = `rgba(255,215,0,${0.15 + pulse * 0.2})`;
      ctx.fillRect(x, y, L.cellW, L.cellH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, L.cellW - 2, L.cellH - 2);
    }
  }

  drawParticles(ctx) {
    if (this.particles.length === 0) return;
    ctx.save();
    this.particles.forEach(p => p.draw(ctx));
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/* ============================================================
   START
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  window.game = new SlotGame();
});
