/*!
 * Basketball Player Widget — 球員投籃浮層（尼克 / 馬刺）
 * 逐幀 sprite 版：投籃為 5 幀手繪連續動作（深蹲→起身→站直→伸展→出手）
 * 用法：
 *   <script src="basketball-player-widget.js"
 *           data-assets="assets/players"
 *           data-team="knicks"></script>
 * 按住畫面蓄力 → 放開投籃。零依賴、單檔。
 */
(function () {
  if (window.__BASKETBALL_PLAYER_WIDGET_LOADED__) return;
  window.__BASKETBALL_PLAYER_WIDGET_LOADED__ = true;

  // ====== 設定（可由 script tag data-* 覆寫） ======
  const script = document.currentScript || document.querySelector('script[src*="basketball-player-widget"]');
  const assetsBase = (script && script.dataset.assets) || 'assets/players';
  const ballImg = (script && script.dataset.ball) || `${assetsBase}/basketball.png`;
  let currentTeam = (script && script.dataset.team) || 'knicks';

  // 每隊 5 幀投籃動作；放在 assets/players/frames_<team>/frame_1..5.png
  const TEAMS = {
    knicks: { name: '尼克', dir: 'frames_knicks' },
    spurs:  { name: '馬刺', dir: 'frames_spurs'  }
  };
  const FRAME_COUNT = 4;

  // ====== 樣式 ======
  const css = `
  .bpw-root, .bpw-root * { box-sizing: border-box; }
  .bpw-player, .bpw-hoop, .bpw-ball, .bpw-hud, .bpw-power, .bpw-team {
    position: fixed; z-index: 99990;
    pointer-events: none;
  }
  .bpw-hud, .bpw-team { pointer-events: auto; }

  .bpw-hud {
    top: 14px; left: 14px;
    background: rgba(0,0,0,.62); color: #fff;
    padding: 8px 16px; border-radius: 12px;
    border: 1px solid rgba(255,255,255,.18);
    backdrop-filter: blur(6px);
    font-family: -apple-system, "Noto Sans TC", sans-serif;
  }
  .bpw-hud .l { font-size: 10px; letter-spacing: 3px; color: #ffd84a; }
  .bpw-hud .s { font-size: 26px; font-weight: 900; line-height: 1.1; }
  .bpw-hud .sub { font-size: 11px; opacity: .8; margin-top: 2px; }

  .bpw-team {
    top: 14px; right: 14px; display: flex; gap: 6px;
    font-family: -apple-system, "Noto Sans TC", sans-serif;
  }
  .bpw-team button {
    background: rgba(0,0,0,.62); color: #fff;
    border: 1px solid rgba(255,255,255,.25);
    padding: 8px 12px; border-radius: 10px;
    font-weight: 700; font-size: 12px; cursor: pointer;
    backdrop-filter: blur(6px);
  }
  .bpw-team button.on { background: #ffd84a; color: #222; border-color: #ffd84a; }

  .bpw-hint {
    position: fixed; left: 50%; bottom: 16px;
    transform: translateX(-50%); z-index: 99990;
    background: rgba(0,0,0,.6); color: #fff;
    padding: 8px 16px; border-radius: 999px; font-size: 13px;
    pointer-events: none;
    font-family: -apple-system, "Noto Sans TC", sans-serif;
  }

  .bpw-player {
    will-change: transform;
    transform-origin: 50% 100%;
    background-repeat: no-repeat;
    background-size: 400% 100%;      /* 4 幀並排於一張 sheet */
    background-position: 0% 0%;
    filter: drop-shadow(0 14px 10px rgba(0,0,0,.3));
    pointer-events: auto;            /* 只在球員身上才能按 */
    cursor: pointer;
  }
  .bpw-shadow {
    position: fixed; z-index: 99988;
    width: 130px; height: 18px;
    background: radial-gradient(ellipse at center, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 70%);
    pointer-events: none; will-change: transform, opacity;
  }

  .bpw-hoop { width: 130px; height: 200px; }
  .bpw-hoop img { width: 100%; height: 100%; display: block; }
  .bpw-ball { width: 50px; height: 50px; top: 0; left: 0; z-index: 99993; will-change: transform;
              filter: drop-shadow(0 3px 4px rgba(0,0,0,.4)); }
  .bpw-ball img { width: 100%; height: 100%; display: block; }

  .bpw-power {
    left: 50%; bottom: 70px; transform: translateX(-50%);
    width: 220px; height: 14px;
    background: rgba(0,0,0,.55);
    border: 2px solid rgba(255,255,255,.45);
    border-radius: 999px; overflow: hidden;
    opacity: 0; transition: opacity .15s;
  }
  .bpw-power.show { opacity: 1; }
  .bpw-power .fill {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, #22c55e 0%, #ffd84a 50%, #ef4444 100%);
    transition: width .04s linear;
  }

  .bpw-float {
    position: fixed; z-index: 99995;
    font-family: Impact, sans-serif; font-size: 34px; font-weight: 900;
    color: #ffd84a;
    text-shadow: 0 2px 0 #000, 0 0 14px rgba(255,216,74,.65);
    pointer-events: none; animation: bpwFloat .9s ease-out forwards;
  }
  @keyframes bpwFloat {
    0%   { transform: translate(-50%, 0) scale(.6); opacity: 0; }
    20%  { transform: translate(-50%, -10px) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -90px) scale(1); opacity: 0; }
  }

  .bpw-click { position: fixed; inset: 0; z-index: 99980; background: transparent; pointer-events: none; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ====== DOM ======
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // 側面籃框（使用者提供 hoop_side.svg；原 viewBox 253x389）
  const hoopSVG = `<img src="${assetsBase}/hoop_side.svg" alt="hoop" draggable="false" />`;

  const ballSVG = `
    <svg width="50" height="50" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="#e8772e" stroke="#5a2a0a" stroke-width="1.5"/>
      <path d="M 2,18 Q 18,12 34,18" fill="none" stroke="#5a2a0a" stroke-width="1.2"/>
      <path d="M 2,18 Q 18,24 34,18" fill="none" stroke="#5a2a0a" stroke-width="1.2"/>
      <path d="M 18,2 Q 14,18 18,34" fill="none" stroke="#5a2a0a" stroke-width="1.2"/>
      <path d="M 18,2 Q 22,18 18,34" fill="none" stroke="#5a2a0a" stroke-width="1.2"/>
    </svg>`;

  const root = el('div', 'bpw-root');
  const clickLayer = el('div', 'bpw-click');
  const hud = el('div', 'bpw-hud',
    `<div class="l">SCORE</div>
     <div class="s" id="bpw-score">0</div>
     <div class="sub">命中 <span id="bpw-hits">0</span> / 投 <span id="bpw-shots">0</span></div>`);
  const teamBox = el('div', 'bpw-team',
    `<button data-team="knicks">尼克</button>
     <button data-team="spurs">馬刺</button>`);
  const hoopEl = el('div', 'bpw-hoop', hoopSVG);
  const shadowEl = el('div', 'bpw-shadow');
  const playerEl = el('div', 'bpw-player');  // 背景使用 sprite sheet
  const ballEl = el('div', 'bpw-ball', `<img src="${ballImg}" alt="ball" />`);
  const powerEl = el('div', 'bpw-power', `<div class="fill"></div>`);
  const powerFill = powerEl.querySelector('.fill');
  const hint = el('div', 'bpw-hint', '按住球員蓄力 → 放開投籃 🏀');

  root.appendChild(clickLayer);
  root.appendChild(hud);
  root.appendChild(teamBox);
  root.appendChild(hoopEl);
  root.appendChild(shadowEl);
  root.appendChild(playerEl);
  root.appendChild(ballEl);
  root.appendChild(powerEl);
  root.appendChild(hint);
  document.body.appendChild(root);

  const scoreEl = hud.querySelector('#bpw-score');
  const hitsEl = hud.querySelector('#bpw-hits');
  const shotsEl = hud.querySelector('#bpw-shots');

  // ====== 預載 sprite sheet ======
  const sheetCache = {};
  function sheetSrc(team) { return `${assetsBase}/sheet_${team}.png`; }
  function preloadTeam(team) {
    if (sheetCache[team]) return;
    const img = new Image();
    img.src = sheetSrc(team);
    sheetCache[team] = img;
  }

  // ====== 球隊切換 ======
  function applyTeam(team) {
    currentTeam = team;
    preloadTeam(team);
    playerEl.style.backgroundImage = `url("${sheetSrc(team)}")`;
    _curFrame = 0;
    setFrame(1); // idle = 深蹲預備（第 1 格）
    teamBox.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.team === team);
    });
  }
  let _curFrame = 0;
  function setFrame(idx1) {
    if (idx1 === _curFrame) return;
    _curFrame = idx1;
    // 5 格：position-x = (idx-1)/(5-1) * 100%
    const pct = FRAME_COUNT > 1 ? ((idx1 - 1) / (FRAME_COUNT - 1)) * 100 : 0;
    playerEl.style.backgroundPositionX = pct + '%';
  }
  teamBox.addEventListener('click', e => {
    const b = e.target.closest('button[data-team]');
    if (b && phase === 'idle' && !ball.flying) applyTeam(b.dataset.team);
  });

  // ====== 版面 ======
  let W = innerWidth, H = innerHeight;
  // 幀圖比例 512:768 = 2:3
  const PLAYER_W = 224, PLAYER_H = 336;
  const HOOP_W = 160, HOOP_H = 140;
  const player = { x: 0, y: 0 };
  const hoop = { x: 0, y: 0, rimX: 0, rimY: 0, rimR: 36 };
  // 出手點：對應 frame_5 中球的相對位置（球員顯示框內比例）
  const RELEASE_ANCHOR = { x: 0.40, y: 0.15 };

  function layout() {
    W = innerWidth; H = innerHeight;
    player.x = W - PLAYER_W - 6;          // 貼最右邊
    player.y = H - PLAYER_H - 12;
    playerEl.style.left = player.x + 'px';
    playerEl.style.top = player.y + 'px';
    playerEl.style.width = PLAYER_W + 'px';
    playerEl.style.height = PLAYER_H + 'px';

    hoop.x = 16;                          // 側面籃板在左
    hoop.y = Math.max(40, H * 0.16);
    // hoop_side.svg viewBox 253x389；籃框開口中心約 (137,199)
    hoop.rimX = hoop.x + 130 * (137 / 253);  // ≈ +70
    hoop.rimY = hoop.y + 200 * (199 / 389);  // ≈ +102
    hoopEl.style.left = hoop.x + 'px';
    hoopEl.style.top = hoop.y + 'px';

    shadowEl.style.left = (player.x + PLAYER_W / 2 - 65) + 'px';
    shadowEl.style.top = (player.y + PLAYER_H - 10) + 'px';

    if (!ball.flying && phase === 'idle') restBall();
  }

  function releasePoint() {
    return {
      x: player.x + PLAYER_W * RELEASE_ANCHOR.x,
      y: player.y + PLAYER_H * RELEASE_ANCHOR.y
    };
  }

  // ====== 球 ======
  const ball = { x: 0, y: 0, vx: 0, vy: 0, flying: false, scored: false };
  function hideBall() { ballEl.style.opacity = '0'; }
  function showBall() { ballEl.style.opacity = '1'; }
  function restBall() {
    // idle 時球已畫在 sprite 裡，隱藏物理球
    hideBall();
    ball.flying = false;
    ball.scored = false;
    setFrame(1);
    shadowEl.style.transform = 'scale(1,1)';
    shadowEl.style.opacity = '0.8';
  }

  // ====== 蓄力 ======
  let charging = false, chargeStart = 0;
  const MAX_CHARGE = 1000;
  function startCharge(e) {
    if (phase !== 'idle' || ball.flying) return;
    e.preventDefault();
    charging = true;
    chargeStart = performance.now();
    powerEl.classList.add('show');
    requestAnimationFrame(tickCharge);
  }
  function tickCharge() {
    if (!charging) return;
    const t = Math.min((performance.now() - chargeStart) / MAX_CHARGE, 1);
    powerFill.style.width = (t * 100) + '%';
    requestAnimationFrame(tickCharge);
  }
  function endCharge(e) {
    if (!charging) return;
    const t = Math.min((performance.now() - chargeStart) / MAX_CHARGE, 1);
    charging = false;
    powerEl.classList.remove('show');
    powerFill.style.width = '0%';
    shoot(t);
  }
  // 只有「按在球員身上」才開始蓄力；放開（畫面任意處）就投籃
  playerEl.addEventListener('mousedown', startCharge);
  playerEl.addEventListener('touchstart', startCharge, { passive: false });
  document.addEventListener('mouseup', endCharge);
  document.addEventListener('touchend', endCharge, { passive: false });

  // ====== 投籃：逐幀播放 + 出手物理 ======
  const stats = { score: 0, hits: 0, shots: 0 };
  let phase = 'idle';   // 'idle' | 'windup' | 'release' | 'recover'
  let pendingPower = 0;
  let seqIdx = 0;       // 目前播到第幾幀(1-based)
  let phaseClock = 0;   // 該幀已播時間 ms
  let lastT = 0;

  // 投籃時間軸（各幀停留 ms）；第 5 幀為出手
  const WINDUP_DUR = [110, 100, 85];    // 幀1→3（蹲→舉→set）
  const HOLD_RELEASE = 260;             // 幀4 出手 follow-through 停留
  // 收勢：快速倒帶回 idle
  const RECOVER_SEQ = [{f:3,d:55},{f:1,d:1}];

  function shoot(power) {
    if (phase !== 'idle' || ball.flying) return;
    phase = 'windup';
    pendingPower = power;
    stats.shots++; shotsEl.textContent = stats.shots;
    seqIdx = 1; phaseClock = 0;
    setFrame(1);
    hideBall();
    lastT = performance.now();
    requestAnimationFrame(step);
  }

  function launchBall(power) {
    showBall();
    ball.flying = true;
    ball.scored = false;
    const rp = releasePoint();
    ball.x = rp.x - 25;
    ball.y = rp.y - 25;

    const dx = hoop.rimX - (ball.x + 25);
    const dy = hoop.rimY - (ball.y + 25);
    const baseTime = 1.25 - power * 0.35;   // 放慢飛行讓球看得清楚
    const T = Math.max(0.6, baseTime + (1 - power) * 0.15 * (Math.random() - 0.5));
    const g = 1500;
    let vx = dx / T;
    let vy = (dy - 0.5 * g * T * T) / T;
    const ideal = 0.65;
    const err = Math.abs(power - ideal);
    vx += (Math.random() - 0.5) * err * 600;
    vy += (Math.random() - 0.5) * err * 400;
    ball.vx = vx; ball.vy = vy;
    ballEl.style.transform = `translate(${ball.x}px, ${ball.y}px)`;
  }

  let recoverStep = 0;
  function step(now) {
    const dt = Math.min(now - lastT, 40);
    lastT = now;

    if (phase === 'windup') {
      phaseClock += dt;
      const dur = WINDUP_DUR[seqIdx - 1] || 80;
      // 抬升時影子縮小（幀 3~4）
      const lift = seqIdx >= 3 ? (seqIdx - 2) * 0.18 : 0;
      shadowEl.style.transform = `scale(${1 - lift * 0.5}, ${1 - lift * 0.4})`;
      shadowEl.style.opacity = String(0.8 - lift * 0.4);
      if (phaseClock >= dur) {
        phaseClock = 0;
        seqIdx++;
        if (seqIdx >= FRAME_COUNT) {
          // 進入出手幀
          setFrame(FRAME_COUNT);
          phase = 'release';
          phaseClock = 0;
          launchBall(pendingPower);
        } else {
          setFrame(seqIdx);
        }
      }
    } else if (phase === 'release') {
      phaseClock += dt;
      if (phaseClock >= HOLD_RELEASE) {
        phase = 'recover';
        recoverStep = 0; phaseClock = 0;
        setFrame(RECOVER_SEQ[0].f);
      }
    } else if (phase === 'recover') {
      phaseClock += dt;
      if (phaseClock >= RECOVER_SEQ[recoverStep].d) {
        phaseClock = 0;
        recoverStep++;
        if (recoverStep >= RECOVER_SEQ.length) {
          phase = 'idle';
          shadowEl.style.transform = 'scale(1,1)';
          shadowEl.style.opacity = '0.8';
          setFrame(1);
        } else {
          setFrame(RECOVER_SEQ[recoverStep].f);
        }
      }
    }

    // 球飛行
    if (ball.flying) {
      const fdt = dt / 1000;
      ball.vy += 1500 * fdt;
      ball.x += ball.vx * fdt;
      ball.y += ball.vy * fdt;
      const rot = (now / 8) % 360;
      ballEl.style.transform = `translate(${ball.x}px, ${ball.y}px) rotate(${rot}deg)`;

      const cx = ball.x + 25, cy = ball.y + 25;
      if (!ball.scored && ball.vy > 0 &&
          cy >= hoop.rimY - 4 && cy <= hoop.rimY + 14 &&
          Math.abs(cx - hoop.rimX) < hoop.rimR - 6) {
        ball.scored = true;
        score(cx, cy);
      }
      if (ball.y > H + 60 || ball.x < -80 || ball.x > W + 80) {
        ball.flying = false;
        hideBall();
      }
    }

    if (phase !== 'idle' || ball.flying) requestAnimationFrame(step);
    else restBall();
  }

  function score(x, y) {
    stats.hits++; stats.score += 2;
    hitsEl.textContent = stats.hits;
    scoreEl.textContent = stats.score;
    const f = el('div', 'bpw-float', '+2');
    f.style.left = x + 'px';
    f.style.top = (y - 30) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  // ====== 啟動 ======
  addEventListener('resize', layout);
  applyTeam(currentTeam);
  layout();
  restBall();
})();
