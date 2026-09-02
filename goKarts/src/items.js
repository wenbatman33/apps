// 道具系统：道具箱、轮盘、足球/追踪弹/油渍/氮气/落雷
import * as THREE from 'three';
import { angleDiff } from './physics.js';

export const ITEM_ICONS = { ball: '⚽', missile: '🚀', oil: '🛢️', nitro: '💨', thunder: '⚡' };

export class ItemManager {
  constructor(scene, track, karts, sound) {
    this.scene = scene; this.track = track; this.karts = karts; this.sound = sound;
    this.entities = [];
    this.boxes = [];

    // 道具箱：发光旋转方块
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    for (const spot of track.itemSpots) {
      // 半透明玻璃方块 + HDR 自发光（有 bloom 时会发光）
      const mat = new THREE.MeshStandardMaterial({ color: 0x64d8ff, emissive: 0x2fc8ff, emissiveIntensity: 1.1,
        transparent: true, opacity: 0.72, roughness: 0.25, metalness: 0.1, envMapIntensity: 1.0 });
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.castShadow = true;
      mesh.position.copy(spot.pos);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.6) }));
      mesh.add(edge);
      scene.add(mesh);
      this.boxes.push({ mesh, spot, active: true, respawn: 0 });
    }
  }

  // ---- 依名次加权抽道具 ----
  roll(kart) {
    const total = this.karts.length;
    const r = kart.rank, rnd = Math.random();
    let table;
    if (r === 1) table = [['oil', .42], ['ball', .38], ['nitro', .15], ['missile', .05]];
    else if (r <= Math.ceil(total / 2)) table = [['ball', .25], ['missile', .28], ['oil', .14], ['nitro', .28], ['thunder', .05]];
    else table = [['missile', .30], ['nitro', .33], ['thunder', .18], ['ball', .14], ['oil', .05]];
    let acc = 0;
    for (const [it, w] of table) { acc += w; if (rnd < acc) return it; }
    return table[0][0];
  }

  // ---- 使用道具 ----
  use(kart) {
    if (!kart.item || kart.rouletteT > 0) return false;
    const item = kart.item; kart.item = null;
    const t = this.track;
    if (item === 'nitro') {
      // 氮气：立即喷射
      kart.boost = Math.max(kart.boost, 1.6);
      this.sound.boost();
      return true;
    }
    if (item === 'thunder') {
      // 落雷：全场对手遭雷击（有明确的落雷视觉）
      for (const o of this.karts) {
        if (o === kart || o.finished) continue;
        o.spinT = Math.max(o.spinT, 0.9); o.shrinkT = 5; o.speed *= 0.4;
        this.spawnBolt(o);
      }
      this.sound.lightning();
      if (kart.isPlayer) flashScreen('rgba(255,255,160,0.55)');
      return true;
    }
    if (item === 'oil') {
      // 油渍：丢在车后方的黑色滑油区
      const back = kart.pos.clone();
      back.x -= Math.sin(kart.heading) * 3.4; back.z -= Math.cos(kart.heading) * 3.4;
      const q = t.query(back, kart.idx);
      const frac = THREE.MathUtils.clamp(q.frac, 0, 1);
      back.y = t.surfaceY(q.idx, frac, q.lateral) + 0.06;
      const mesh = oilMesh();
      // 贴合路面法线
      const s = t.samples[q.idx];
      const side3 = s.side.clone(); side3.y += s.bankSlope; side3.normalize();
      const n = new THREE.Vector3().crossVectors(side3, s.tan).normalize();
      if (n.y < 0) n.negate();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      mesh.position.copy(back);
      this.scene.add(mesh);
      this.entities.push({ kind: 'oil', pos: back, idx: q.idx, lateral: q.lateral, mesh, life: 30, owner: kart, armT: 0.4 });
      this.sound.itemThrow();
      return true;
    }
    if (item === 'ball' || item === 'missile') {
      const missile = item === 'missile';
      const pos = kart.pos.clone();
      pos.x += Math.sin(kart.heading) * 2.6; pos.z += Math.cos(kart.heading) * 2.6; pos.y += 0.55;
      const mesh = missile ? missileMesh() : ballMesh();
      mesh.position.copy(pos);
      this.scene.add(mesh);
      // 追踪弹锁定前方最近对手
      let target = null;
      if (missile) {
        let bestGap = Infinity;
        for (const o of this.karts) {
          if (o === kart || o.finished) continue;
          const gap = o.progress - kart.progress;
          if (gap > 0 && gap < bestGap) { bestGap = gap; target = o; }
        }
      }
      this.entities.push({
        kind: missile ? 'missile' : 'ball',
        pos, heading: kart.heading, speed: missile ? 66 : 52,
        idx: kart.idx, lateral: kart.lateral, mesh,
        life: missile ? 8 : 10, bounces: missile ? 1 : 8,
        owner: kart, armT: 0.45, target,
      });
      this.sound.itemThrow();
      return true;
    }
    return false;
  }

  // 落雷视觉：从天而降的锯齿闪电，短暂显示后淡出
  spawnBolt(victim) {
    const g = boltMesh();
    g.position.copy(victim.pos);
    this.scene.add(g);
    this.entities.push({ kind: 'bolt', pos: victim.pos.clone(), idx: victim.idx, lateral: victim.lateral, mesh: g, life: 0.5, maxLife: 0.5, owner: null, armT: 0 });
  }

  // AI 避障用：目前场上的陷阱/投射物
  hazards() {
    return this.entities.filter(e => e.kind !== 'bolt').map(e => ({ idx: e.idx, lateral: e.lateral }));
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
        // 用水平距离判定（道具箱悬浮 1.1m，3D 距离会误杀大半判定范围）
        const dx = k.pos.x - b.mesh.position.x, dz = k.pos.z - b.mesh.position.z;
        if (dx * dx + dz * dz < 4.8) {
          b.active = false; b.mesh.visible = false; b.respawn = 3;
          k.rouletteT = 1.15;
          if (k.isPlayer) this.sound.itemBox();
          break;
        }
      }
    }

    // ---- 轮盘 ----
    for (const k of this.karts) {
      if (k.rouletteT > 0) {
        k.rouletteT -= dt;
        if (k.rouletteT <= 0) {
          k.item = this.roll(k);
          if (k.isPlayer) this.sound.itemGot();
        }
      }
    }

    // ---- 场上实体 ----
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      e.life -= dt; e.armT = Math.max(0, e.armT - dt);
      if (e.life <= 0) { this.remove(i); continue; }

      // 落雷：只做视觉淡出，无碰撞
      if (e.kind === 'bolt') {
        const f = e.life / e.maxLife;
        e.mesh.traverse(o => { if (o.material) o.material.opacity = f; });
        e.mesh.rotation.y += dt * 3;
        continue;
      }

      if (e.kind === 'ball' || e.kind === 'missile') {
        // 追踪弹导引：沿赛道追目标
        if (e.kind === 'missile' && e.target && !e.target.finished) {
          const gap = ((e.target.idx - e.idx) % N + N) % N;
          if (gap < 26) {
            const th = Math.atan2(e.target.pos.x - e.pos.x, e.target.pos.z - e.pos.z);
            e.heading += THREE.MathUtils.clamp(angleDiff(th, e.heading), -3.6 * dt, 3.6 * dt);
          } else {
            const s = t.samples[(e.idx + 8) % N];
            const th = Math.atan2(s.pos.x - e.pos.x, s.pos.z - e.pos.z);
            e.heading += THREE.MathUtils.clamp(angleDiff(th, e.heading), -2.6 * dt, 2.6 * dt);
          }
        }
        e.pos.x += Math.sin(e.heading) * e.speed * dt;
        e.pos.z += Math.cos(e.heading) * e.speed * dt;
        const q = t.query(e.pos, e.idx);
        e.idx = q.idx; e.lateral = q.lateral;
        const s = t.samples[q.idx];
        // 撞墙：足球反弹、追踪弹爆掉
        const lim = t.wallD - 0.6;
        if (Math.abs(q.lateral) > lim) {
          e.bounces--;
          if (e.bounces <= 0) {
            if (e.kind === 'missile') this.sound.hit(false);
            this.remove(i); continue;
          }
          const segLen = t.totalLen / N;
          const base = s.pos.clone().addScaledVector(s.tan, THREE.MathUtils.clamp(q.frac, 0, 1) * segLen);
          const sign = Math.sign(q.lateral);
          e.pos.x = base.x + s.side.x * lim * sign;
          e.pos.z = base.z + s.side.z * lim * sign;
          const trackH = Math.atan2(s.tan.x, s.tan.z);
          e.heading = trackH - angleDiff(e.heading, trackH); // 镜射反弹
          this.sound.shellBounce();
        }
        e.pos.y = t.surfaceY(e.idx, THREE.MathUtils.clamp(q.frac, 0, 1), THREE.MathUtils.clamp(q.lateral, -lim, lim)) + (e.kind === 'ball' ? 0.5 : 0.45);
        e.mesh.position.copy(e.pos);
        if (e.kind === 'ball') {
          // 足球滚动
          e.mesh.rotation.y = e.heading;
          e.mesh.rotation.x += e.speed * dt / 0.5;
        } else {
          // 追踪弹朝向飞行方向
          e.mesh.rotation.y = e.heading;
        }
      }

      // ---- 命中判定 ----
      for (const k of this.karts) {
        if (k.finished || k.spinT > 0) continue;
        if (e.owner === k && e.armT > 0) continue;
        const rr = e.kind === 'oil' ? 2.6 : 2.4;
        if (k.pos.distanceToSquared(e.pos) < rr) {
          if (e.kind === 'oil') {
            k.spinT = Math.max(k.spinT, 0.9); k.speed *= 0.5;
          } else if (e.kind === 'missile') {
            k.spinT = Math.max(k.spinT, 1.4); k.speed *= 0.2;
          } else {
            k.spinT = Math.max(k.spinT, 1.2); k.speed *= 0.3;
          }
          if (k.drift.active) { k.drift.active = false; k.drift.dir = 0; k.drift.charge = 0; }
          this.sound.hit(k.isPlayer);
          if (k.isPlayer) flashScreen('rgba(255,80,60,0.35)');
          // 油渍踩过不消失（留在原地），投射物命中即消失
          if (e.kind !== 'oil') this.remove(i);
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

// ============ 模型 ============
let _ballTex = null;
function ballTexture() {
  if (_ballTex) return _ballTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#181818';
  for (let i = 0; i < 10; i++) {
    const x = (i % 5) * 26 + (i >= 5 ? 13 : 0) + 6, y = i >= 5 ? 42 : 12;
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * 7, py = y + Math.sin(a) * 7;
      k === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath(); g.fill();
  }
  _ballTex = new THREE.CanvasTexture(c);
  return _ballTex;
}

function ballMesh() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 14, 10),
    new THREE.MeshLambertMaterial({ map: ballTexture() })
  );
}

function missileMesh() {
  const g = new THREE.Group();
  const grey = new THREE.MeshLambertMaterial({ color: 0x9aa4b5 });
  const red = new THREE.MeshLambertMaterial({ color: 0xd8352f });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 10), grey);
  body.rotation.x = Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10), red);
  nose.rotation.x = Math.PI / 2; nose.position.z = 0.67; g.add(nose);
  for (const [fx, fy] of [[0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(fx ? 0.3 : 0.04, fy ? 0.3 : 0.04, 0.22), red);
    fin.position.set(fx, fy, -0.42); g.add(fin);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 8),
    new THREE.MeshBasicMaterial({ color: 0xffa229, transparent: true, opacity: 0.9 }));
  flame.rotation.x = -Math.PI / 2; flame.position.z = -0.75; g.add(flame);
  return g;
}

function oilMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x14161c, transparent: true, opacity: 0.88 });
  // 不规则油渍：主椭圆 + 几滴小圆
  const main = new THREE.Mesh(new THREE.CircleGeometry(1.15, 18), mat);
  main.rotation.x = -Math.PI / 2; main.scale.z = 0.75; g.add(main);
  for (const [ox, oz, r] of [[0.9, 0.55, 0.3], [-0.85, -0.4, 0.35], [0.2, -0.85, 0.24]]) {
    const drop = new THREE.Mesh(new THREE.CircleGeometry(r, 10), mat);
    drop.rotation.x = -Math.PI / 2; drop.position.set(ox, 0.001, oz); g.add(drop);
  }
  // 油光
  const sheen = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12),
    new THREE.MeshBasicMaterial({ color: 0x4a5a78, transparent: true, opacity: 0.5 }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.set(-0.2, 0.002, 0.1); g.add(sheen);
  return g;
}

let _boltTex = null;
function boltTexture() {
  if (_boltTex) return _boltTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 256);
  // 锯齿主干
  g.strokeStyle = '#fffbe0'; g.lineWidth = 7; g.lineJoin = 'miter';
  g.shadowColor = '#ffe66d'; g.shadowBlur = 12;
  g.beginPath();
  const pts = [[32, 0], [22, 48], [40, 88], [24, 132], [42, 176], [28, 214], [34, 256]];
  pts.forEach(([x, y], i) => i === 0 ? g.moveTo(x, y) : g.lineTo(x, y));
  g.stroke();
  // 分岔
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(40, 88); g.lineTo(54, 120); g.stroke();
  g.beginPath(); g.moveTo(24, 132); g.lineTo(10, 168); g.stroke();
  _boltTex = new THREE.CanvasTexture(c);
  return _boltTex;
}

function boltMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    map: boltTexture(), transparent: true, opacity: 1,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  for (const ry of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 16), mat.clone());
    p.position.y = 8; p.rotation.y = ry;
    g.add(p);
  }
  // 地面光圈
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1;
  g.add(ring);
  return g;
}

// 全萤幕闪光（被落雷/被击中回馈）
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
