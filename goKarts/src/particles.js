// 轻量粒子系统：Sprite 池（烟雾/尘土/火星），手机效能友善
import * as THREE from 'three';

let _softTex = null;
function softTexture() {
  if (_softTex) return _softTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _softTex = new THREE.CanvasTexture(c);
  return _softTex;
}

export class ParticleSystem {
  constructor(scene, max = 260) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    const tex = softTexture();
    for (let i = 0; i < max; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      sp.visible = false;
      scene.add(sp);
      this.pool.push(sp);
    }
  }

  // o: {pos, vel, life, size0, size1, color, opacity, additive, rise, damp}
  spawn(o) {
    const sp = this.pool.pop();
    if (!sp) return; // 池满就丢弃，保帧率
    sp.visible = true;
    sp.position.copy(o.pos);
    sp.scale.setScalar(o.size0);
    sp.material.color.setHex(o.color);
    sp.material.opacity = o.opacity;
    sp.material.blending = o.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    sp.material.rotation = Math.random() * Math.PI * 2;
    this.active.push({
      sp, t: 0, life: o.life,
      vel: o.vel.clone(),
      size0: o.size0, size1: o.size1,
      op0: o.opacity,
      rise: o.rise ?? 1.2,   // 烟往上飘
      damp: o.damp ?? 2.5,   // 速度阻尼
      spin: (Math.random() - 0.5) * 2,
    });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.t += dt;
      if (p.t >= p.life) {
        p.sp.visible = false;
        p.sp.material.opacity = 0;
        this.pool.push(p.sp);
        this.active.splice(i, 1);
        continue;
      }
      const k = p.t / p.life;
      p.vel.y += p.rise * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.damp * dt));
      p.sp.position.addScaledVector(p.vel, dt);
      p.sp.scale.setScalar(p.size0 + (p.size1 - p.size0) * k);
      p.sp.material.opacity = p.op0 * (1 - k) * (1 - k * 0.3);
      p.sp.material.rotation += p.spin * dt;
    }
  }
}
