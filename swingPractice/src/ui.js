// ============ UI：HUD、選單、結算、排行榜（localStorage） ============
import { SWING, DIFF, PITCH, PACE } from './config.js';
import { timeToContact } from './ball.js';
import { Sound } from './sound.js';

const $ = (s) => document.querySelector(s);
const LB_KEY = 'swing_lb_v1';
const NAME_KEY = 'swing_name_v1';
const TIMING_RANGE = 300;    // 時機條顯示範圍 ±ms

function loadLB(){
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || {}; } catch(e){ return {}; }
}
function saveLB(d){ localStorage.setItem(LB_KEY, JSON.stringify(d)); }

export function initUI(G){
  const el = {
    hud: $('#hud'), score: $('#st-score b'), hr: $('#st-hr b'), far: $('#st-far b'),
    ball: $('#st-ball b'), combo: $('#st-combo b'), comboBox: $('#st-combo'),
    outs: $('#outs'), hint: $('#pitch-hint'),
    timing: $('#timing'), tMarker: $('#timing .marker'), tPerf: $('#timing .z-perfect'), tOk: $('#timing .z-ok'),
    result: $('#result'), rMain: $('#result .r-main'), rSub: $('#result .r-sub'),
    btnSwing: $('#btn-swing'), btnPower: $('#btn-power'), btnAssist: $('#btn-assist'), btnQuit: $('#btn-quit'),
    scrMenu: $('#scr-menu'), scrOver: $('#scr-over'), scrLB: $('#scr-lb'),
    inName: $('#in-name'), lbList: $('#lb-list'),
  };

  const ui = { lastRank: -1, lbDiff: 'easy' };
  G.ui = ui;

  let selDiff = 'easy', selMode = 'derby';

  // ---------- 選項按鈕 ----------
  function bindOpts(sel, cb){
    const wrap = $(sel);
    wrap.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      wrap.querySelectorAll('.opt').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); Sound.ui(); cb(b.dataset.v);
    }));
  }
  bindOpts('#opt-diff', v => selDiff = v);
  bindOpts('#opt-mode', v => selMode = v);
  bindOpts('#opt-lbdiff', v => { ui.lbDiff = v; renderLB(); });

  el.inName.value = localStorage.getItem(NAME_KEY) || '';

  // ---------- 畫面切換 ----------
  const show = (node, on) => node.classList.toggle('hidden', !on);
  function toGame(){
    show(el.scrMenu, false); show(el.scrOver, false); show(el.scrLB, false); show(el.hud, true);
  }
  function toMenu(){
    show(el.scrMenu, true); show(el.scrOver, false); show(el.scrLB, false); show(el.hud, false);
  }

  $('#btn-start').addEventListener('click', () => {
    Sound.unlock(); Sound.ui(true);
    const nm = (el.inName.value || '').trim().slice(0, 10) || '無名打者';
    localStorage.setItem(NAME_KEY, nm);
    toGame();
    setupTimingZones(selDiff);
    G.game.start({ diff: selDiff, mode: selMode, name: nm, maxBalls: 10, maxOuts: 3 });
  });
  $('#btn-lb').addEventListener('click', () => { Sound.ui(); ui.lbDiff = selDiff; syncLBTabs(); show(el.scrLB, true); show(el.scrMenu, false); renderLB(); });
  $('#btn-lb-back').addEventListener('click', () => { Sound.ui(); show(el.scrLB, false); show(el.scrMenu, true); });
  $('#btn-over-lb').addEventListener('click', () => { Sound.ui(); ui.lbDiff = G.game.diff; syncLBTabs(); show(el.scrLB, true); show(el.scrOver, false); renderLB(); });
  $('#btn-again').addEventListener('click', () => {
    Sound.ui(true); toGame(); setupTimingZones(G.game.diff);
    G.game.start({ diff: G.game.diff, mode: G.game.mode, name: G.game.name, maxBalls: 10, maxOuts: 3 });
  });
  $('#btn-menu').addEventListener('click', () => { Sound.ui(); G.game.quit(); toMenu(); });
  el.btnQuit.addEventListener('click', () => { Sound.ui(); G.game.quit(); toMenu(); });
  $('#btn-lb-clear').addEventListener('click', () => {
    const d = loadLB(); delete d[ui.lbDiff]; saveLB(d); renderLB(); Sound.ui();
  });

  // ---------- 遊戲內按鈕 ----------
  el.btnPower.addEventListener('click', (e) => { e.stopPropagation(); togglePower(); });
  el.btnAssist.addEventListener('click', (e) => { e.stopPropagation(); toggleAssist(); });
  el.btnSwing.addEventListener('click', (e) => { e.stopPropagation(); G.game.swing(); });

  function togglePower(){
    const g = G.game; g.power = !g.power;
    el.btnPower.textContent = g.power ? '💪 強打 ON' : '💪 強打 OFF';
    el.btnPower.classList.toggle('on', g.power);
    setupTimingZones(g.diff); Sound.ui(g.power);
  }
  const SND_KEY = 'swing_sound_v1';
  function applySound(on){
    Sound.setEnabled(on);
    localStorage.setItem(SND_KEY, on ? '1' : '0');
    const b = $('#btn-sound');
    b.textContent = on ? '🔊 音效 ON' : '🔇 音效 OFF';
    b.classList.toggle('on', on);
  }
  function toggleSound(){ applySound(!Sound.isEnabled()); Sound.ui(); }
  ui.toggleSound = toggleSound;
  $('#btn-sound').addEventListener('click', (e) => { e.stopPropagation(); toggleSound(); });
  applySound(localStorage.getItem(SND_KEY) !== '0');

  function toggleAssist(){
    const g = G.game; g.assist = !g.assist;
    el.btnAssist.textContent = g.assist ? '🎯 輔助 ON' : '🎯 輔助 OFF';
    el.btnAssist.classList.toggle('on', g.assist);
    el.timing.classList.toggle('off', !g.assist);
    setupTimingZones(g.diff); Sound.ui(g.assist);
  }
  ui.togglePower = togglePower;
  ui.toggleAssist = toggleAssist;

  // ---------- 時機條區間 ----------
  function setupTimingZones(diff){
    const g = G.game;
    const scale = DIFF[diff].windowScale * (g?.assist ? SWING.assistBonus : 1) * (g?.power ? SWING.powerWindow : 1);
    const pw = SWING.perfect * scale / TIMING_RANGE * 50;
    const gw = SWING.good * scale / TIMING_RANGE * 50;
    el.tPerf.style.left = (50 - pw) + '%'; el.tPerf.style.width = (pw * 2) + '%';
    el.tOk.style.left = (50 - gw) + '%'; el.tOk.style.width = (gw * 2) + '%';
    el.btnAssist.classList.toggle('on', !!g?.assist);
    el.btnPower.classList.toggle('on', !!g?.power);
    el.timing.classList.toggle('off', !g?.assist);
  }
  ui.setupTimingZones = setupTimingZones;

  // ---------- HUD ----------
  ui.syncHUD = () => {
    const g = G.game;
    el.score.textContent = g.score.toLocaleString();
    el.hr.textContent = g.hr;
    el.far.textContent = g.farthest.toFixed(0);
    el.ball.textContent = g.mode === 'derby' ? `${Math.min(g.ballNo, g.maxBalls)}/${g.maxBalls}` : `${g.ballNo}`;
    el.combo.textContent = g.combo;
    el.comboBox.classList.toggle('hot', g.combo >= 3);
    // 球數/出局點
    const total = g.mode === 'derby' ? g.maxBalls : g.maxOuts;
    let html = '';
    for (let i = 0; i < total; i++){
      if (g.mode === 'derby'){
        const rec = g.pitchLog[i];
        html += `<i class="${rec ? (rec.r === 'hr' ? 'hit' : 'used') : ''}"></i>`;
      } else {
        html += `<i class="${i < g.outs ? 'used' : ''}"></i>`;
      }
    }
    el.outs.innerHTML = html;
  };

  ui.showPitchHint = (p, assist) => {
    el.hint.textContent = assist ? `${p.name} ${p.cn}` : '';
    el.hint.style.color = '#' + p.color.toString(16).padStart(6, '0');
    el.hint.classList.toggle('show', !!assist);
    setTimeout(() => el.hint.classList.remove('show'), 900);
  };

  let flashTimer = null;
  ui.showResultFlash = (grade, velo) => {
    const map = { perfect: ['PERFECT!', '#ffd23f'], good: ['GOOD!', '#5dffa0'], ok: ['接觸', '#9fc4ff'], poor: ['擦棒', '#8fa4c2'] };
    const [txt, col] = map[grade] || map.ok;
    el.rMain.textContent = txt; el.rMain.style.color = col;
    el.rSub.textContent = `初速 ${(velo * 3.6).toFixed(0)} km/h`;
    el.result.classList.add('show');
    clearTimeout(flashTimer); flashTimer = setTimeout(() => el.result.classList.remove('show'), 900);
  };

  ui.showResult = (title, sub, gained, isHR) => {
    el.rMain.textContent = title;
    el.rMain.style.color = isHR ? '#ffd23f' : title.includes('揮 空') || title.includes('看 球') ? '#ff5f6d' : '#ffffff';
    el.rSub.textContent = sub + (gained > 0 ? `　+${gained.toLocaleString()}` : '');
    el.result.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.result.classList.remove('show'), isHR ? 2200 : 1400);
  };

  // 下一球倒數提示（打完不會馬上又要揮棒）
  let lastCue = -99;
  ui.showReadyCue = (remain) => {
    const cue = $('#ready-cue');
    if (remain < 0 || remain > PACE.countdown){
      cue.classList.remove('show'); lastCue = -99; return;
    }
    const n = Math.ceil(remain);
    cue.classList.add('show');
    if (n !== lastCue){
      lastCue = n;
      cue.querySelector('.rc-num').textContent = n > 0 ? n : '';
      cue.querySelector('.rc-txt').textContent = n <= 1 ? '球 來 了 ！' : '準 備 接 球';
      cue.classList.toggle('hot', n <= 1);
      if (n > 0) Sound.ui(n <= 1);
    }
  };

  // 每幀更新時機標記
  ui.updateTiming = () => {
    const g = G.game;
    const live = g && g.phase === 'pitching' && g.assist;
    el.timing.style.opacity = live ? 1 : .2;              // 非投球時淡出，不干擾看球
    if (!live){ el.tMarker.style.opacity = 0; return; }
    const err = (SWING.barrelDelay / 1000 - timeToContact(G.ball)) * 1000;
    const pct = Math.max(0, Math.min(100, 50 + err / TIMING_RANGE * 50));
    el.tMarker.style.left = pct + '%';
    el.tMarker.style.opacity = 1;
  };

  // ---------- 排行榜 ----------
  ui.submitScore = (g) => {
    if (g.score <= 0) return -1;
    const d = loadLB();
    const arr = d[g.diff] || (d[g.diff] = []);
    const rec = { name: g.name, score: g.score, hr: g.hr, far: +g.farthest.toFixed(1), mode: g.mode, ts: Date.now() };
    arr.push(rec);
    arr.sort((a, b) => b.score - a.score);
    if (arr.length > 30) arr.length = 30;
    saveLB(d);
    ui.lastTs = rec.ts;
    return arr.findIndex(r => r.ts === rec.ts) + 1;
  };

  function syncLBTabs(){
    document.querySelectorAll('#opt-lbdiff .opt').forEach(b => b.classList.toggle('sel', b.dataset.v === ui.lbDiff));
  }
  function renderLB(){
    const d = loadLB(), arr = d[ui.lbDiff] || [];
    if (!arr.length){ el.lbList.innerHTML = '<div class="empty">還沒有紀錄，去打一輪吧 ⚾</div>'; return; }
    el.lbList.innerHTML = arr.slice(0, 20).map((r, i) => `
      <div class="lb-row r${i + 1} ${r.ts === ui.lastTs ? 'me' : ''}">
        <div class="rk">${i + 1}</div>
        <div class="nm">${escapeHtml(r.name)}</div>
        <div class="ex">HR ${r.hr}　${r.far}M</div>
        <div class="sc">${r.score.toLocaleString()}</div>
      </div>`).join('');
  }
  ui.renderLB = renderLB;

  ui.showOver = (g, rank) => {
    $('#ov-score').textContent = g.score.toLocaleString();
    $('#ov-hr').textContent = g.hr;
    $('#ov-far').textContent = g.farthest.toFixed(1);
    $('#ov-perfect').textContent = g.perfects;
    $('#ov-avg').textContent = g.swings ? Math.round(g.contacts / g.swings * 100) : 0;
    $('#ov-rank').textContent = rank > 0 ? `本難度排行第 ${rank} 名` + (rank === 1 ? '　🏆 新紀錄！' : '') : '沒有得分，再挑戰一次！';
    show(el.scrOver, true); show(el.hud, false);
  };

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  setupTimingZones('easy');
  return ui;
}
