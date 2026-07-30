// 道具系統：道具箱、輪盤、綠龜殼/紅龜殼/香蕉/蘑菇/閃電
import * as THREE from 'three';
import { angleDiff } from './physics.js';

export const ITEM_ICONS = { greenShell: '🐢', redShell: '🎯', banana: '🍌', mushroom: '🍄', lightning: '⚡' };
const ICON_LIST = Object.keys(ITEM_ICONS);

export class ItemManager {
  constructor(scene, track, karts, sound) {
    this.scene = scene; this.track = track; this.karts = karts; this.sound = sound;
    this.entities = [];
    this.boxes = [];

    // 道具箱：發光旋轉方塊
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    for (const spot of track.itemSpots) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x64d8ff, transparent: true, opacity: 0.65 });
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.copy(spot.pos);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: 0xffffff }));
      mesh.add(edge);
      scene.add(mesh);
      this.boxes.push({ mesh, spot, active: true, respawn: 0 });
    }
  }

  // ---- 依名次加權抽道具 ----
  roll(kart) {
    const total = this.karts.length;
    const r = kart.rank, rnd = Math.random();
    let table;
    if (r === 1) table = [['banana', .42], ['greenShell', .38], ['mushroom', .15], ['redShell', .05]];
    else if (r <= Math.ceil(total / 2)) table = [['greenShell', .25], ['redShell', .28], ['banana', .14], ['mushroom', .28], ['lightning', .05]];
    else table = [['redShell', .30], ['mushroom', .33], ['lightning', .18], ['greenShell', .14], ['banana', .05]];
    let acc = 0;
    for (const [it, w] of table) { acc += w; if (rnd < acc) return it; }
    return table[0][0];
  }

  // ---- 使用道具 ----
  use(kart) {
    if (!kart.item || kart.rouletteT > 0) return false;
    const item = kart.item; kart.item = null;
    const t = this.track, N = t.N;
    if (item === 'mushroom') {
      kart.boost = Math.max(kart.boost, 1.6);
      this.sound.boost();
      return true;
    }
    if (item === 'lightning') {
      for (const o of this.karts) {
        if (o === kart || o.finished) continue;
        o.spinT = Math.max(o.spinT, 0.9); o.shrinkT = 5; o.speed *= 0.4;
      }
      this.sound.lightning();
      if (kart.isPlayer) flashScreen('rgba(255,255,160,0.55)');
      return true;
    }
    if (item === 'banana') {
      // 丟在車後方
      const back = kart.pos.clone();
      back.x -= Math.sin(kart.heading) * 3.2; back.z -= Math.cos(kart.heading) * 3.2;
      const q = t.query(back, kart.idx);
      back.y = t.surfaceY(q.idx, Math.max(0, Math.min(1, q.frac)), q.lateral) + 0.35;
      const mesh = bananaMesh();
      mesh.position.copy(back);
      this.scene.add(mesh);
      this.entities.push({ kind: 'banana', pos: back, idx: q.idx, lateral: q.lateral, mesh, life: 30, owner: kart, armT: 0.4 });
      this.sound.itemThrow();
      return true;
    }
    if (item === 'greenShell' || item === 'redShell') {
      const red = item === 'redShell';
      const pos = kart.pos.clone();
      pos.x += Math.sin(kart.heading) * 2.6; pos.z += Math.cos(kart.heading) * 2.6; pos.y += 0.5;
      const mesh = shellMesh(red ? 0xe33b3b : 0x2fb757);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      // 紅殼鎖定前方最近對手
      let target = null;
      if (red) {
        let bestGap = Infinity;
        for (const o of this.karts) {
          if (o === kart || o.finished) continue;
          const gap = o.progress - kart.progress;
          if (gap > 0 && gap < bestGap) { bestGap = gap; target = o; }
        }
      }
      this.entities.push({
        kind: 'shell', red, pos, heading: kart.heading, speed: 58,
        idx: kart.idx, lateral: kart.lateral, mesh, life: 9, bounces: 6,
        owner: kart, armT: 0.45, target,
      });
      this.sound.itemThrow();
      return true;
    }
    return false;
  }

  // AI 避障用：目前場上的陷阱/殼
  hazards() {
    return this.entities.map(e => ({ idx: e.idx, lateral: e.lateral }));
  }

  update(dt, raceTime) {
    const t = this.track, N = t.N;

    // ---- 道具箱 ----
    for (const b of this.boxes) {
      if (!b.active) {
        b.respawn -= dt;
        if (b.respawn <= 0) { b.active = true; b.mesh.visible = true; }
        continue;
      }
      b.mesh.rotation.y += dt * 1.6; b.mesh.rotation.x += dt * 0.9;
      b.mesh.position.y = b.spot.pos.y + Math.sin(raceTime * 2 + b.spot.idx) * 0.15;
      for (const k of this.karts) {
        if (k.finished || k.item || k.rouletteT > 0) continue;
        // 用水平距離判定（道具箱懸浮 1.1m，3D 距離會誤殺大半判定範圍）
        const dx = k.pos.x - b.mesh.position.x, dz = k.pos.z - b.mesh.position.z;
        if (dx * dx + dz * dz < 4.8) {
          b.active = false; b.mesh.visible = false; b.respawn = 3;
          k.rouletteT = 1.15;
          if (k.isPlayer) this.sound.itemBox();
          break;
        }
      }
    }

    // ---- 輪盤 ----
    for (const k of this.karts) {
      if (k.rouletteT > 0) {
        k.rouletteT -= dt;
        if (k.rouletteT <= 0) {
          k.item = this.roll(k);
          if (k.isPlayer) this.sound.itemGot();
        }
      }
    }

    // ---- 場上實體 ----
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      e.life -= dt; e.armT = Math.max(0, e.armT - dt);
      if (e.life <= 0) { this.remove(i); continue; }

      if (e.kind === 'shell') {
        // 紅殼導引：沿賽道追目標
        if (e.red && e.target && !e.target.finished) {
          const gap = ((e.target.idx - e.idx) % N + N) % N;
          if (gap < 26) {
            // 近距離直接追
            const th = Math.atan2(e.target.pos.x - e.pos.x, e.target.pos.z - e.pos.z);
            e.heading += THREE.MathUtils.clamp(angleDiff(th, e.heading), -3.2 * dt, 3.2 * dt);
          } else {
            // 遠距離沿賽道中線
            const s = t.samples[(e.idx + 8) % N];
            const th = Math.atan2(s.pos.x - e.pos.x, s.pos.z - e.pos.z);
            e.heading += THREE.MathUtils.clamp(angleDiff(th, e.heading), -2.4 * dt, 2.4 * dt);
          }
        }
        e.pos.x += Math.sin(e.heading) * e.speed * dt;
        e.pos.z += Math.cos(e.heading) * e.speed * dt;
        const q = t.query(e.pos, e.idx);
        e.idx = q.idx; e.lateral = q.lateral;
        const s = t.samples[q.idx];
        // 撞牆反彈
        const lim = t.wallD - 0.6;
        if (Math.abs(q.lateral) > lim) {
          const segLen = t.totalLen / N;
          const base = s.pos.clone().addScaledVector(s.tan, THREE.MathUtils.clamp(q.frac, 0, 1) * segLen);
          const sign = Math.sign(q.lateral);
          e.pos.x = base.x + s.side.x * lim * sign;
          e.pos.z = base.z + s.side.z * lim * sign;
          const trackH = Math.atan2(s.tan.x, s.tan.z);
          e.heading = trackH - angleDiff(e.heading, trackH); // 鏡射反彈
          e.bounces--;
          this.sound.shellBounce();
          if (e.bounces <= 0) { this.remove(i); continue; }
        }
        e.pos.y = t.surfaceY(e.idx, THREE.MathUtils.clamp(q.frac, 0, 1), THREE.MathUtils.clamp(q.lateral, -lim, lim)) + 0.45;
        e.mesh.position.copy(e.pos);
        e.mesh.rotation.y += dt * 12;
      }

      // ---- 命中判定 ----
      for (const k of this.karts) {
        if (k.finished || k.spinT > 0) continue;
        if (e.owner === k && e.armT > 0) continue;
        const rr = e.kind === 'shell' ? 2.4 : 2.0;
        if (k.pos.distanceToSquared(e.pos) < rr) {
          k.spinT = Math.max(k.spinT, e.kind === 'shell' ? 1.3 : 1.0);
          k.speed *= e.kind === 'shell' ? 0.25 : 0.4;
          if (k.drift.active) { k.drift.active = false; k.drift.dir = 0; k.drift.charge = 0; }
          this.sound.hit(k.isPlayer);
          if (k.isPlayer) flashScreen('rgba(255,80,60,0.35)');
          this.remove(i);
          break;
        }
      }
    }
  }

  remove(i) {
    const e = this.entities[i];
    this.scene.remove(e.mesh);
    this.entities.splice(i, 1);
  }

  dispose() {
    for (const e of this.entities) this.scene.remove(e.mesh);
    for (const b of this.boxes) this.scene.remove(b.mesh);
    this.entities = []; this.boxes = [];
  }
}

// ---- 模型 ----
function shellMesh(color) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshLambertMaterial({ color }));
  g.add(dome);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.5, 0.18, 12),
    new THREE.MeshLambertMaterial({ color: 0xf5f0dc }));
  rim.position.y = -0.02; g.add(rim);
  return g;
}

function bananaMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffd428 });
  const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.75, 7), mat);
  seg1.rotation.z = 0.6; seg1.position.set(-0.2, 0.3, 0); g.add(seg1);
  const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.75, 7), mat);
  seg2.rotation.z = -0.6; seg2.position.set(0.2, 0.3, 0); g.add(seg2);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshLambertMaterial({ color: 0x6b4a1f }));
  tip.position.set(-0.5, 0.58, 0); g.add(tip);
  g.scale.setScalar(1.4); // 放大避免玩家看不見
  return g;
}

// 全螢幕閃光（被閃電/被擊中回饋）
let _flashEl = null;
export function flashScreen(color) {
  if (!_flashEl) {
    _flashEl = document.createElement('div');
    _flashEl.style.cssText = 'position:fixed;inset:0;z-index:35;pointer-events:none;transition:opacity .5s;opacity:0';
    document.body.appendChild(_flashEl);
  }
  _flashEl.style.background = color;
  _flashEl.style.transition = 'none';
  _flashEl.style.opacity = '1';
  requestAnimationFrame(() => {
    _flashEl.style.transition = 'opacity .5s';
    _flashEl.style.opacity = '0';
  });
}
