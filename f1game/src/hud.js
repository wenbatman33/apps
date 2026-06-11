// HUD：名次/圈速/速度/小地圖/起跑燈/結算
import { PARAMS, TEAMS } from './params.js';

export function fmtTime(ms) {
  if (ms == null || !isFinite(ms)) return '--:--.---';
  const m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000), x = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(x).padStart(3, '0')}`;
}

export class HUD {
  constructor(path) {
    this.path = path;
    this.el = {
      pos: document.querySelector('#hud-pos .p'),
      lap: document.querySelector('#hud-pos .lap'),
      kmh: document.getElementById('kmh'),
      gear: document.getElementById('gear'),
      bar: document.getElementById('speedbar'),
      cur: document.getElementById('t-cur'),
      last: document.getElementById('t-last'),
      best: document.getElementById('t-best'),
      gap: document.getElementById('t-gap'),
      msg: document.getElementById('hud-msg'),
      lights: document.getElementById('lights'),
      results: document.getElementById('results'),
      resTable: document.getElementById('res-table'),
      resTitle: document.getElementById('res-title'),
    };
    // 起跑燈 DOM
    this.lampCols = [];
    this.el.lights.style.display = 'flex';
    for (let c = 0; c < 5; c++) {
      const col = document.createElement('div'); col.className = 'col';
      const lamps = [];
      for (let r = 0; r < 2; r++) {
        const l = document.createElement('div'); l.className = 'lamp';
        col.appendChild(l); lamps.push(l);
      }
      this.el.lights.appendChild(col);
      this.lampCols.push(lamps);
    }
    this.el.lights.style.display = 'none';

    // 小地圖：預畫賽道輪廓
    this.map = document.getElementById('minimap');
    this.mctx = this.map.getContext('2d');
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const p of path.pos) {
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x);
      minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z);
    }
    const W = this.map.width, pad = 12;
    const sc = Math.min((W - pad * 2) / (maxx - minx), (W - pad * 2) / (maxz - minz));
    this.mapFn = (x, z) => [
      pad + (x - minx) * sc + (W - pad * 2 - (maxx - minx) * sc) / 2,
      pad + (z - minz) * sc + (W - pad * 2 - (maxz - minz) * sc) / 2,
    ];
    this.trackLayer = document.createElement('canvas');
    this.trackLayer.width = this.trackLayer.height = W;
    const g = this.trackLayer.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i <= path.n; i++) {
      const p = path.pos[i % path.n];
      const [mx, my] = this.mapFn(p.x, p.z);
      i === 0 ? g.moveTo(mx, my) : g.lineTo(mx, my);
    }
    g.stroke();
    // 起終點
    const [sx, sy] = this.mapFn(path.pos[0].x, path.pos[0].z);
    g.fillStyle = '#ffd23f'; g.fillRect(sx - 3, sy - 3, 6, 6);
  }

  setLights(count) { // count = 亮幾組；-1 全滅
    this.el.lights.style.display = count === null ? 'none' : 'flex';
    this.lampCols.forEach((lamps, i) =>
      lamps.forEach(l => l.classList.toggle('on', i < count)));
  }

  showMsg(text, ms = 1600) {
    this.el.msg.textContent = text;
    this.el.msg.style.opacity = 1;
    clearTimeout(this._msgT);
    if (ms) this._msgT = setTimeout(() => { this.el.msg.style.opacity = 0; }, ms);
  }

  update(state) {
    const { posIdx, total, lap, laps, speed, curMs, lastMs, bestMs, gapStr } = state;
    this.el.pos.textContent = 'P' + posIdx;
    this.el.lap.textContent = `LAP ${Math.min(lap, laps)}/${laps}`;
    const kmh = Math.round(Math.abs(speed) * 3.6);
    this.el.kmh.textContent = kmh;
    // 8 速序列變速箱：以速度推檔位（負速 = 倒車檔 R）
    const gears = [0, 28, 60, 95, 135, 178, 222, 268, 310];
    let gi = 1;
    for (let i = 1; i < gears.length; i++) if (kmh >= gears[i]) gi = i;
    this.el.gear.textContent = speed < -0.3 ? 'R' : (speed < 0.5 ? 'N' : gi);
    this.gearInfo = { gi, lo: gears[gi], hi: gears[Math.min(gi + 1, 8)] || 340, kmh };
    this.el.bar.style.width = Math.min(100, kmh / (PARAMS.physics.topSpeed * 3.6) * 100) + '%';
    this.el.cur.textContent = fmtTime(curMs);
    this.el.last.textContent = fmtTime(lastMs);
    this.el.best.textContent = fmtTime(bestMs);
    this.el.gap.textContent = gapStr;
  }

  drawMap(cars, playerIdx) {
    const g = this.mctx, W = this.map.width;
    g.clearRect(0, 0, W, W);
    g.drawImage(this.trackLayer, 0, 0);
    cars.forEach((c, i) => {
      const [x, y] = this.mapFn(c.pos.x, c.pos.z);
      g.beginPath();
      g.arc(x, y, i === playerIdx ? 5 : 3.5, 0, 7);
      g.fillStyle = i === playerIdx ? '#ffd23f' : '#' + TEAMS[i].body.toString(16).padStart(6, '0');
      g.fill();
      if (i === playerIdx) { g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke(); }
    });
  }

  showResults(rows, playerWon) {
    this.el.resTitle.textContent = playerWon ? '🏆 勝利！' : '比賽結束';
    this.el.resTable.innerHTML = rows.map(r => `
      <tr class="${r.me ? 'me' : ''}">
        <td>P${r.pos}</td>
        <td><span class="chip" style="background:#${r.color.toString(16).padStart(6, '0')}"></span>${r.name}</td>
        <td style="text-align:right">${r.time}</td>
      </tr>`).join('');
    this.el.results.style.display = 'flex';
  }
  hideResults() { this.el.results.style.display = 'none'; }
}
