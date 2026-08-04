// UI 模组：画面流程、赛道/车辆选择、暂停、结算、排行榜（localStorage）
import { TRACKS } from './track.js';
import { KART_TYPES, renderKartThumbnail } from './karts.js';
import { fmtTime } from './hud.js';

const LB_KEY = id => `gokarts_lb_${id}`;
const LB_MAX = 10;

const THUMB_BG = {
  meadow: 'linear-gradient(160deg,#7ec8ff 0%,#a5e08a 55%,#4e9e3f 100%)',
  canyon: 'linear-gradient(160deg,#ffb45f 0%,#e08a4a 55%,#9e5a2f 100%)',
  neon:   'linear-gradient(160deg,#1b1040 0%,#3b1a6e 50%,#0d0a1a 100%)',
};

export class UI {
  constructor(sound) {
    this.sound = sound;
    this.mode = 'gp'; this.trackIdx = 0; this.kartIdx = 0;
    this.onStart = null; this.onResume = null; this.onRestart = null; this.onQuit = null;
    this.buildTrackCards();
    this.buildKartCards();
    this.bind();
  }

  show(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
    if (id) document.getElementById(id).classList.remove('hidden');
  }

  click() { this.sound.uiClick(); }

  bind() {
    const $ = x => document.getElementById(x);
    $('btn-gp').onclick = () => { this.click(); this.mode = 'gp'; this.show('scr-track'); };
    $('btn-tt').onclick = () => { this.click(); this.mode = 'tt'; this.show('scr-track'); };
    $('btn-lb').onclick = () => { this.click(); this.renderLbScreen(this.trackIdx); this.show('scr-lb'); };
    for (const b of document.querySelectorAll('.back-btn')) {
      b.onclick = () => { this.click(); this.show(b.dataset.back); };
    }
    $('btn-track-next').onclick = () => { this.click(); this.show('scr-kart'); };
    $('btn-kart-go').onclick = () => {
      this.click(); this.show(null);
      this.onStart && this.onStart(this.mode, TRACKS[this.trackIdx], KART_TYPES[this.kartIdx]);
    };
    $('btn-resume').onclick = () => { this.click(); this.onResume && this.onResume(); };
    $('btn-restart').onclick = () => { this.click(); this.onRestart && this.onRestart(); };
    $('btn-quit').onclick = () => { this.click(); this.onQuit && this.onQuit(); };
    $('btn-r-retry').onclick = () => { this.click(); this.show(null); this.onRestart && this.onRestart(); };
    $('btn-r-menu').onclick = () => { this.click(); this.onQuit && this.onQuit(); };
  }

  buildTrackCards() {
    const wrap = document.getElementById('track-cards');
    wrap.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'sel-card' + (i === this.trackIdx ? ' selected' : '');
      el.innerHTML = `
        <div class="thumb" style="background-image:url('assets/img/track-${t.id}.jpg'), ${THUMB_BG[t.theme]};"></div>
        <div class="nm">${t.emoji} ${t.name}</div>
        <div class="ds">${t.desc}</div>`;
      el.onclick = () => {
        this.click(); this.trackIdx = i;
        wrap.querySelectorAll('.sel-card').forEach((c, j) => c.classList.toggle('selected', j === i));
      };
      wrap.appendChild(el);
    });
  }

  buildKartCards() {
    const wrap = document.getElementById('kart-cards');
    wrap.innerHTML = '';
    const bar = (v, lo, hi) => Math.round((v - lo) / (hi - lo) * 100);
    KART_TYPES.forEach((k, i) => {
      const el = document.createElement('div');
      el.className = 'sel-card kart-card' + (i === this.kartIdx ? ' selected' : '');
      const hex = '#' + k.color.toString(16).padStart(6, '0');
      el.innerHTML = `
        <div class="kthumb" data-kart="${k.id}" style="background-image:linear-gradient(180deg,${hex}55,#10131f)"></div>
        <div class="nm">${k.name}</div>
        <div class="statbar"><span class="lb">极速</span><div class="bg"><div class="fg" style="width:${bar(k.topSpeed, 37, 47)}%"></div></div></div>
        <div class="statbar"><span class="lb">加速</span><div class="bg"><div class="fg" style="width:${bar(k.accel, 19, 31)}%"></div></div></div>
        <div class="statbar"><span class="lb">操控</span><div class="bg"><div class="fg" style="width:${bar(k.handling, 0.75, 1.3)}%"></div></div></div>
        <div class="statbar"><span class="lb">漂移</span><div class="bg"><div class="fg" style="width:${bar(k.drift, 0.8, 1.4)}%"></div></div></div>
        <div class="ds">${k.desc}</div>`;
      el.onclick = () => {
        this.click(); this.kartIdx = i;
        wrap.querySelectorAll('.sel-card').forEach((c, j) => c.classList.toggle('selected', j === i));
      };
      wrap.appendChild(el);
    });
  }

  // 模型载入完成后，用实际 3D 模型渲染卡片缩图（UI 与游戏内 100% 一致）
  fillKartThumbnails() {
    if (this._thumbsDone) return;
    let ok = 0;
    for (const k of KART_TYPES) {
      const url = renderKartThumbnail(k);
      if (!url) continue;
      const el = document.querySelector(`.kthumb[data-kart="${k.id}"]`);
      if (el) { el.style.backgroundImage = `url('${url}')`; el.style.backgroundSize = 'contain'; ok++; }
    }
    if (ok === KART_TYPES.length) this._thumbsDone = true;
  }

  showPause() { document.getElementById('scr-pause').classList.remove('hidden'); }
  hidePause() { document.getElementById('scr-pause').classList.add('hidden'); }

  // ============ 排行榜 ============
  getLb(trackId) {
    try { return JSON.parse(localStorage.getItem(LB_KEY(trackId))) || []; }
    catch (e) { return []; }
  }

  qualifies(trackId, ms) {
    const lb = this.getLb(trackId);
    return lb.length < LB_MAX || ms < lb[lb.length - 1].ms;
  }

  insertLb(trackId, entry) {
    const lb = this.getLb(trackId);
    lb.push(entry);
    lb.sort((a, b) => a.ms - b.ms);
    lb.length = Math.min(lb.length, LB_MAX);
    localStorage.setItem(LB_KEY(trackId), JSON.stringify(lb));
    return lb.findIndex(e => e === entry) + 1 || lb.indexOf(entry) + 1;
  }

  lbTableHtml(trackId, hiIdx = -1) {
    const lb = this.getLb(trackId);
    if (!lb.length) return `<div class="empty-note">尚无纪录 — 快去计时挑战创下第一笔！</div>`;
    let rows = lb.map((e, i) => `
      <tr class="${i === hiIdx ? 'me' : ''}">
        <td class="rank">${['🥇', '🥈', '🥉'][i] || (i + 1)}</td>
        <td>${escapeHtml(e.name)}</td>
        <td>${escapeHtml(e.kart || '')}</td>
        <td class="tval">${fmtTime(e.ms)}</td>
      </tr>`).join('');
    return `<table class="rtable"><tr><th></th><th>玩家</th><th>车辆</th><th>总时间</th></tr>${rows}</table>`;
  }

  renderLbScreen(activeIdx) {
    const tabs = document.getElementById('lb-tabs');
    tabs.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const b = document.createElement('div');
      b.className = 'lb-tab' + (i === activeIdx ? ' on' : '');
      b.textContent = `${t.emoji} ${t.name}`;
      b.onclick = () => { this.click(); this.renderLbScreen(i); };
      tabs.appendChild(b);
    });
    document.getElementById('lb-content').innerHTML = this.lbTableHtml(TRACKS[activeIdx].id);
  }

  // ============ 结算 ============
  showGPResult(standings, player) {
    const rank = standings.indexOf(player) + 1;
    const title = rank === 1 ? '🏆 冠军！' : rank <= 3 ? `🎉 第 ${rank} 名` : `第 ${rank} 名 — 再接再厉`;
    document.getElementById('result-title').textContent = title;
    const rows = standings.map((k, i) => `
      <tr class="${k.isPlayer ? 'me' : ''}">
        <td class="rank">${['🥇', '🥈', '🥉'][i] || (i + 1)}</td>
        <td>${escapeHtml(k.name)}</td>
        <td>${escapeHtml(k.type.name)}</td>
        <td class="tval">${k.finished ? fmtTime(k.finishTime) : 'DNF'}</td>
      </tr>`).join('');
    document.getElementById('result-body').innerHTML =
      `<table class="rtable"><tr><th></th><th>车手</th><th>车辆</th><th>时间</th></tr>${rows}</table>`;
    document.getElementById('scr-result').classList.remove('hidden');
  }

  showTTResult({ trackId, totalMs, lapTimes, bestLap, kartName }) {
    document.getElementById('result-title').textContent = '⏱️ 完赛！';
    const lapRows = lapTimes.map((t, i) => `
      <tr><td class="rank">L${i + 1}</td><td></td>
      <td class="tval ${t === bestLap ? 'me' : ''}">${fmtTime(t)}</td></tr>`).join('');
    let html = `
      <table class="rtable">
        <tr><th colspan="2">总时间</th><td class="tval me" style="font-size:18px">${fmtTime(totalMs)}</td></tr>
        ${lapRows}
        <tr><th colspan="2">最速圈</th><td class="tval" style="color:#c478ff">${fmtTime(bestLap)}</td></tr>
      </table>`;
    const qualified = this.qualifies(trackId, totalMs);
    if (qualified) {
      html += `
        <div style="text-align:center;color:#ffe66d;font-weight:800;margin-top:12px">🎊 进入排行榜！输入你的名字：</div>
        <div id="name-entry">
          <input id="name-input" maxlength="12" placeholder="你的名字" value="${escapeHtml(localStorage.getItem('gokarts_name') || '')}">
          <button class="btn-sm green" id="btn-save-score">储存</button>
        </div>
        <div id="lb-after"></div>`;
    } else {
      html += `<div style="margin-top:12px">${this.lbTableHtml(trackId)}</div>`;
    }
    document.getElementById('result-body').innerHTML = html;
    document.getElementById('scr-result').classList.remove('hidden');
    if (qualified) {
      document.getElementById('btn-save-score').onclick = () => {
        this.click();
        const name = (document.getElementById('name-input').value.trim() || '无名英雄').slice(0, 12);
        localStorage.setItem('gokarts_name', name);
        const entry = { name, ms: totalMs, kart: kartName, date: Date.now() };
        this.insertLb(trackId, entry);
        const lb = this.getLb(trackId);
        const idx = lb.findIndex(e => e.date === entry.date && e.ms === entry.ms);
        document.getElementById('name-entry').style.display = 'none';
        document.getElementById('lb-after').innerHTML = this.lbTableHtml(trackId, idx);
      };
    }
  }

  hideResult() { document.getElementById('scr-result').classList.add('hidden'); }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
