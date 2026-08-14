// ===== 視覺特效：軌跡光帶 / 粒子 / 震波 / 浮動傷害數字 / 螢幕震動 =====
import * as THREE from 'three';

// ---- 彈珠軌跡光帶（貼地 ribbon，加法混色） ----
export class Trail {
  constructor(scene, color, tune) {
    this.tune = tune;
    this.color = new THREE.Color(color);
    this.points = [];
    this.max = 40;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.max * 2 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.max * 2 * 3), 3));
    const idx = [];
    for (let i = 0; i < this.max - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
  }

  push(x, z) {
    this.points.unshift({ x, z });
    const lim = Math.min(this.max, this.tune.fx.trailLen | 0);
    while (this.points.length > lim) this.points.pop();
  }

  fade() { if (this.points.length) this.points.pop(); if (this.points.length) this.points.pop(); }

  update() {
    const pos = this.mesh.geometry.attributes.position.array;
    const col = this.mesh.geometry.attributes.color.array;
    const n = this.points.length;
    const w0 = this.tune.fx.trailWidth;
    const op = this.tune.fx.trailOpacity;
    for (let i = 0; i < this.max; i++) {
      const p = this.points[Math.min(i, n - 1)] || { x: 0, z: 0 };
      // 節點方向 → 垂直向量
      let dx = 0, dz = 1;
      if (n > 1) {
        const q = this.points[Math.min(i + 1, n - 1)] || p;
        dx = p.x - q.x; dz = p.z - q.z;
        const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      }
      const px = -dz, pz = dx;
      const t = n > 1 ? i / (n - 1) : 1;
      const w = w0 * (1 - t);
      const y = 0.06;
      const a = i * 6;
      pos[a] = p.x + px * w; pos[a + 1] = y; pos[a + 2] = p.z + pz * w;
      pos[a + 3] = p.x - px * w; pos[a + 4] = y; pos[a + 5] = p.z - pz * w;
      const fade = (1 - t) * (n > 1 ? 1 : 0) * op;
      col[a] = this.color.r * fade; col[a + 1] = this.color.g * fade; col[a + 2] = this.color.b * fade;
      col[a + 3] = col[a]; col[a + 4] = col[a + 1]; col[a + 5] = col[a + 2];
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }

  setColor(c) { this.color.set(c); }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}

// ---- 粒子池（Points，加法混色） ----
export class ParticlePool {
  constructor(scene, tune, max = 600) {
    this.tune = tune;
    this.max = max;
    this.parts = []; // {x,y,z,vx,vy,vz,life,maxLife,r,g,b,size}
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    const tex = ParticlePool.makeTexture();
    this.mat = new THREE.PointsMaterial({
      size: 0.42, map: tex, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
  }

  static makeTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  }

  burst(x, y, z, color, count = 14, speed = 6, life = 0.5) {
    const c = new THREE.Color(color);
    const n = Math.round(count * this.tune.fx.particles);
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= this.max) this.parts.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x, y: y + 0.1, z,
        vx: Math.cos(a) * s, vy: 2 + Math.random() * speed * 0.6, vz: Math.sin(a) * s,
        life: life * (0.5 + Math.random() * 0.5), maxLife: life,
        r: c.r, g: c.g, b: c.b,
      });
    }
  }

  update(dt) {
    const pos = this.points.geometry.attributes.position.array;
    const col = this.points.geometry.attributes.color.array;
    let i = 0;
    for (let k = this.parts.length - 1; k >= 0; k--) {
      const p = this.parts[k];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(k, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vy -= 14 * dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.4; }
      const f = p.life / p.maxLife;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 3] = p.r * f; col[i * 3 + 1] = p.g * f; col[i * 3 + 2] = p.b * f;
      i++;
    }
    this.points.geometry.setDrawRange(0, i);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// ---- 震波環 ----
export class ShockwavePool {
  constructor(scene) {
    this.scene = scene;
    this.waves = [];
    this.geo = new THREE.RingGeometry(0.9, 1, 40);
    this.geo.rotateX(-Math.PI / 2);
  }
  spawn(x, z, color, maxR = 2.2, dur = 0.45) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(this.geo, mat);
    m.position.set(x, 0.08, z);
    m.scale.setScalar(0.1);
    m.renderOrder = 5;
    this.scene.add(m);
    this.waves.push({ m, t: 0, dur, maxR });
  }
  update(dt) {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.t += dt;
      const k = w.t / w.dur;
      if (k >= 1) { this.scene.remove(w.m); w.m.material.dispose(); this.waves.splice(i, 1); continue; }
      w.m.scale.setScalar(0.1 + w.maxR * k);
      w.m.material.opacity = 0.9 * (1 - k);
    }
  }
}

// ---- 浮動傷害數字（canvas sprite 池） ----
export class DamageTextPool {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  spawn(x, z, text, { color = '#ffd75e', size = 34, crit = false } = {}) {
    const c = document.createElement('canvas');
    const fs = crit ? size * 1.5 : size;
    c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    g.font = `900 ${fs}px "Arial Black", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8;
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)';
    g.strokeText(text, 128, 48);
    g.fillStyle = color;
    g.fillText(text, 128, 48);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const scale = crit ? 2.3 : 1.7;
    s.scale.set(scale, scale * 0.375, 1);
    s.position.set(x, 1.1, z);
    s.renderOrder = 10;
    this.scene.add(s);
    this.items.push({ s, t: 0, dur: 0.85, vy: crit ? 2.6 : 2.1 });
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = it.t / it.dur;
      if (k >= 1) {
        this.scene.remove(it.s); it.s.material.map.dispose(); it.s.material.dispose();
        this.items.splice(i, 1); continue;
      }
      it.s.position.y += it.vy * dt;
      it.s.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }
  }
}

// ---- 螢幕震動 ----
export class ScreenShake {
  constructor() { this.t = 0; this.power = 0; }
  hit(power = 1) { this.power = Math.max(this.power, power); this.t = 0.35; }
  offset(dt, scale = 1) {
    if (this.t <= 0) return { x: 0, y: 0 };
    this.t -= dt;
    const k = Math.max(0, this.t / 0.35) * this.power * scale;
    return { x: (Math.random() - 0.5) * 0.3 * k, y: (Math.random() - 0.5) * 0.3 * k };
  }
}
