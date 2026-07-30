// HUD 模組：名次/圈數/計時/車速/道具/迷你地圖/中央訊息
import { ITEM_ICONS } from './items.js';

const ICONS = Object.values(ITEM_ICONS);
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export function fmtTime(ms) {
  if (ms == null || !isFinite(ms)) return '--:--.---';
  const m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000), mm = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(mm).padStart(3, '0')}`;
}

export class HUD {
  constructor() {
    this.root = document.getElementById('hud-root');
    this.elPos = document.querySelector('#hud-pos .p');
    this.elLap = document.querySelector('#hud-pos .lap');
    this.elCur = document.getElementById('t-cur');
    this.elBest = document.getElementById('t-best');
    this.elTotal = document.getElementById('t-total');
    this.elItem = document.getElementById('hud-item');
    this.elSpeed = document.querySelector('#hud-speed .kmh');
    this.elCenter = document.getElementById('hud-center');
    this.elMsg = document.getElementById('hud-msg');
    this.mapCv = document.getElementById('minimap');
    this.mapCtx = this.mapCv.getContext('2d');
    this.mapBase = null;
    this.centerTimer = null; this.msgTimer = null;
  }

  show(timeTrial) {
    this.root.classList.remove('hidden');
    document.getElementById('hud-pos').style.display = timeTrial ? 'none' : 'flex';
    document.getElementById('hud-item').style.display = timeTrial ? 'none' : 'flex';
    this.elCenter.textContent = ''; this.elMsg.textContent = '';
  }
  hide() { this.root.classList.add('hidden'); }

  setRace(kart, laps, raceMs, bestLap) {
    if (kart.rank) this.elPos.textContent = ORD[kart.rank - 1] || `${kart.rank}th`;
    const dispLap = Math.min(Math.max(kart.lap, 0) + 1, laps);
    this.elLap.textContent = `LAP ${dispLap}/${laps}`;
    this.elCur.textContent = fmtTime(raceMs - kart.lapStart);
    this.elBest.textContent = fmtTime(bestLap || null);
    this.elTotal.textContent = fmtTime(raceMs);
    this.elSpeed.textContent = Math.round(Math.abs(kart.speed) * 3.1);
    // 道具框
    if (kart.rouletteT > 0) {
      this.elItem.classList.add('flash');
      this.elItem.textContent = ICONS[Math.floor(performance.now() / 70) % ICONS.length];
    } else {
      this.elItem.classList.remove('flash');
      this.elItem.textContent = kart.item ? ITEM_ICONS[kart.item] : '';
    }
  }

  center(text, dur = 1.2, size = null) {
    this.elCenter.textContent = text;
    this.elCenter.style.fontSize = size || '';
    if (this.centerTimer) clearTimeout(this.centerTimer);
    if (dur > 0) this.centerTimer = setTimeout(() => { this.elCenter.textContent = ''; }, dur * 1000);
  }

  msg(text, dur = 1.6) {
    this.elMsg.textContent = text;
    if (this.msgTimer) clearTimeout(this.msgTimer);
    if (dur > 0) this.msgTimer = setTimeout(() => { this.elMsg.textContent = ''; }, dur * 1000);
  }

  // ---- 迷你地圖 ----
  initMap(track) {
    const size = this.mapCv.width;
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const g = off.getContext('2d');
    g.fillStyle = 'rgba(8,12,20,0.6)';
    g.beginPath(); g.roundRect(0, 0, size, size, 12); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 4.5; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    track.minimap.pts.forEach(([x, z], i) => {
      const px = x * size, pz = z * size;
      i === 0 ? g.moveTo(px, pz) : g.lineTo(px, pz);
    });
    g.closePath(); g.stroke();
    // 起點
    const [sx, sz] = track.minimap.pts[0];
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.arc(sx * size, sz * size, 3.4, 0, 7); g.fill();
    this.mapBase = off;
  }

  drawMap(track, karts, player) {
    if (!this.mapBase) return;
    const g = this.mapCtx, size = this.mapCv.width;
    g.clearRect(0, 0, size, size);
    g.drawImage(this.mapBase, 0, 0);
    for (const k of karts) {
      if (k === player) continue;
      const [x, z] = track.minimap.toMap(k.pos.x, k.pos.z);
      g.fillStyle = '#' + k.type.color.toString(16).padStart(6, '0');
      g.beginPath(); g.arc(x * size, z * size, 3.2, 0, 7); g.fill();
    }
    // 玩家最上層、加白邊
    const [x, z] = track.minimap.toMap(player.pos.x, player.pos.z);
    g.fillStyle = '#' + player.type.color.toString(16).padStart(6, '0');
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(x * size, z * size, 4.4, 0, 7); g.fill(); g.stroke();
  }
}
