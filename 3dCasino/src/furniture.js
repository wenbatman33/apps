// 賭場家具：賭桌（21點/輪盤/撲克）、沙發、盆栽、VIP 圍欄柱、櫃檯
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// 共用材質
const M = {
  felt:   new THREE.MeshStandardMaterial({ color: 0x0d3f2c, roughness: 0.92 }),
  feltRed: new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.9 }),
  wood:   new THREE.MeshStandardMaterial({ color: 0x3a2318, metalness: 0.2, roughness: 0.6 }),
  gold:   new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 1.0, roughness: 0.3 }),
  dark:   new THREE.MeshStandardMaterial({ color: 0x14101c, metalness: 0.6, roughness: 0.4 }),
  velvet: new THREE.MeshStandardMaterial({ color: 0x5a1626, roughness: 0.85 }),
  rope:   new THREE.MeshStandardMaterial({ color: 0xa02040, roughness: 0.7 }),
  leaf:   new THREE.MeshStandardMaterial({ color: 0x1e5c30, roughness: 0.9 }),
  pot:    new THREE.MeshStandardMaterial({ color: 0x2a1a12, metalness: 0.3, roughness: 0.7 }),
};

// 小圓凳（賭桌用，深色皮面）
function makeChair(x, z, rotY = 0) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.1, 16), M.velvet);
  seat.position.y = 0.55;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 10), M.gold);
  leg.position.y = 0.27;
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.4, 0.08, 2, 0.03), M.velvet);
  back.position.set(0, 0.85, 0.2);
  g.add(seat, leg, back);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

// 21 點半圓桌
function buildBlackjackTable() {
  const g = new THREE.Group();
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.07, 28, 1, false, 0, Math.PI), M.felt);
  felt.position.y = 0.86;
  g.add(felt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.07, 10, 28, Math.PI), M.wood);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.88;
  g.add(rim);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.09, 0.14), M.wood);
  edge.position.set(0, 0.88, 0);
  g.add(edge);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.82, 12), M.dark);
  base.position.set(0, 0.42, 0.35);
  g.add(base);
  // 玩家側弧形排椅（沿半圓外緣）
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.2 + (i / 3) * Math.PI * 0.6;
    g.add(makeChair(Math.cos(a) * 2.1, Math.sin(a) * 2.1, -a - Math.PI / 2));
  }
  return g;
}

// 輪盤桌（長桌 + 輪盤）
function buildRouletteTable() {
  const g = new THREE.Group();
  const felt = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.08, 1.7, 2, 0.04), M.felt);
  felt.position.y = 0.86;
  g.add(felt);
  const rim = new THREE.Mesh(new RoundedBoxGeometry(3.55, 0.06, 1.85, 2, 0.03), M.wood);
  rim.position.y = 0.8;
  g.add(rim);
  for (const sx of [-1.3, 1.3]) {
    const leg = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.8, 1.3, 2, 0.03), M.dark);
    leg.position.set(sx, 0.4, 0);
    g.add(leg);
  }
  // 輪盤
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.14, 28), M.wood);
  wheel.position.set(-1.15, 0.97, 0);
  g.add(wheel);
  const wheelIn = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x5a0e18, metalness: 0.4, roughness: 0.5 }));
  wheelIn.position.set(-1.15, 1.03, 0);
  g.add(wheelIn);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 10), M.gold);
  spinner.position.set(-1.15, 1.15, 0);
  g.add(spinner);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.03, 8, 28), M.gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(-1.15, 1.05, 0);
  g.add(ring);
  // 兩側椅子
  for (const [cx, cz, ry] of [[0.6, 1.35, Math.PI], [1.6, 1.35, Math.PI], [0.6, -1.35, 0], [1.6, -1.35, 0]]) {
    g.add(makeChair(cx, cz, ry));
  }
  return g;
}

// 橢圓撲克/百家樂桌
function buildPokerTable() {
  const g = new THREE.Group();
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.07, 28), M.felt);
  felt.scale.set(1.5, 1, 1);
  felt.position.y = 0.86;
  g.add(felt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 10, 32), M.wood);
  rim.scale.set(1.5, 1, 1);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.88;
  g.add(rim);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 0.82, 12), M.dark);
  base.position.y = 0.42;
  g.add(base);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    g.add(makeChair(Math.cos(a) * 2.2, Math.sin(a) * 1.75, -a + Math.PI / 2 + Math.PI));
  }
  return g;
}

export function buildTable(type) {
  if (type === 'blackjack') return buildBlackjackTable();
  if (type === 'roulette') return buildRouletteTable();
  return buildPokerTable();
}

// 休息區沙發
export function buildSofa() {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.45, 0.95, 3, 0.1), M.velvet);
  seat.position.y = 0.35;
  const back = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.7, 0.28, 3, 0.1), M.velvet);
  back.position.set(0, 0.75, 0.38);
  g.add(seat, back);
  for (const sx of [-1.05, 1.05]) {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.62, 0.9, 3, 0.08), M.velvet);
    arm.position.set(sx, 0.5, 0);
    g.add(arm);
  }
  const skirt = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.14, 0.85, 2, 0.03), M.gold);
  skirt.position.y = 0.1;
  g.add(skirt);
  return g;
}

// 盆栽
export function buildPlant() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 12), M.pot);
  pot.position.y = 0.25;
  g.add(pot);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 8), M.wood);
  trunk.position.y = 0.75;
  g.add(trunk);
  for (const [ly, r, h] of [[1.25, 0.55, 0.9], [1.7, 0.4, 0.7], [2.05, 0.26, 0.5]]) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), M.leaf);
    leaf.position.y = ly;
    g.add(leaf);
  }
  return g;
}

// VIP 圍欄柱（金柱 + 紅絨繩，rope 連到下一根柱）
export function buildRopePosts(points) {
  const g = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.0, 10);
  const ballGeo = new THREE.SphereGeometry(0.075, 12, 10);
  const baseGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.05, 14);
  points.forEach((p, i) => {
    const pole = new THREE.Mesh(poleGeo, M.gold); pole.position.set(p[0], 0.5, p[1]);
    const ball = new THREE.Mesh(ballGeo, M.gold); ball.position.set(p[0], 1.03, p[1]);
    const base = new THREE.Mesh(baseGeo, M.gold); base.position.set(p[0], 0.025, p[1]);
    g.add(pole, ball, base);
    if (i > 0) {
      const q = points[i - 1];
      const dx = p[0] - q[0], dz = p[1] - q[1];
      const len = Math.hypot(dx, dz);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len * 0.98, 8), M.rope);
      rope.position.set((p[0] + q[0]) / 2, 0.88, (p[1] + q[1]) / 2);
      rope.rotation.z = Math.PI / 2;
      rope.rotation.y = -Math.atan2(dz, dx);
      // 稍微下垂的視覺：中段壓低
      rope.position.y = 0.84;
      g.add(rope);
    }
  });
  return g;
}

// 禮賓櫃檯
export function buildCounter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(4.0, 1.1, 1.0, 3, 0.06), M.dark);
  body.position.y = 0.55;
  g.add(body);
  const top = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.08, 1.2, 2, 0.03), M.gold);
  top.position.y = 1.14;
  g.add(top);
  const front = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.04), M.velvet);
  front.position.set(0, 0.6, -0.53);
  g.add(front);
  return g;
}
