// AI 车手：路线跟随、弯前减速、漂移、避开陷阱、橡皮筋平衡
import * as THREE from 'three';
import { angleDiff } from './physics.js';

export function aiInput(kart, track, player, hazards, dt) {
  const N = track.N;
  const t = performance.now() / 1000;

  // ---- 个性化路线偏移（游移幅度收窄 → 更贴近理想路线）----
  kart.aiThink -= dt;
  if (kart.aiThink <= 0) {
    kart.aiThink = 0.5 + Math.random() * 0.5;
    let want = Math.sin(t * 0.35 + kart.aiSeed) * track.halfW * 0.22;
    // 前方陷阱 → 侧移闪避
    for (const h of hazards) {
      const rel = (h.idx - kart.idx + N) % N;
      if (rel > 2 && rel < 46 && Math.abs(h.lateral - want) < 3.2) {
        want = h.lateral > 0 ? h.lateral - 4.5 : h.lateral + 4.5;
        want = THREE.MathUtils.clamp(want, -track.halfW * 0.7, track.halfW * 0.7);
      }
    }
    kart.aiOffset += (want - kart.aiOffset) * 0.6;
  }

  // ---- 追踪前方目标点（弯中缩短视距、出界时瞄回路中央）----
  const curveNow = track.samples[(kart.idx + 10) % N].curve;
  let la = Math.floor((13 + kart.speed * 0.6) * (1 - Math.min(0.55, curveNow * 3)));
  let offset = kart.aiOffset;
  if (kart.offroad) { la = 10; offset = 0; }
  const s = track.samples[(kart.idx + la) % N];
  const tx = s.pos.x + s.side.x * offset;
  const tz = s.pos.z + s.side.z * offset;
  const targetH = Math.atan2(tx - kart.pos.x, tz - kart.pos.z);
  const dh = angleDiff(targetH, kart.heading);
  const steer = THREE.MathUtils.clamp(dh * 2.4, -1, 1);

  // ---- 弯前减速（依真实曲率推算过弯速度）----
  let maxCurve = 0;
  for (let k = 12; k < 70; k += 4) {
    maxCurve = Math.max(maxCurve, track.samples[(kart.idx + k) % N].curve);
  }
  // 过弯速度上调 → AI 敢用更高速度杀弯（原 14+30 偏保守）
  const cornerSpeed = 19 + 34 * Math.exp(-maxCurve * 6);
  let throttle = 1, brake = false;
  if (kart.speed > cornerSpeed + 9) brake = true;
  else if (kart.speed > cornerSpeed) throttle = 0.45;
  if (Math.abs(dh) > 1.25 && kart.speed > 24) brake = true;

  // ---- 橡皮筋：落后猛追、领先仅略收（原本领先就大幅放水，玩家太好赢）----
  if (player && !player.finished) {
    const gap = kart.progress - player.progress;
    kart.aiTopScale = gap > 420 ? 0.97 : gap < -200 ? 1.16 : 1.05;
  } else {
    kart.aiTopScale = 1.05;
  }

  // ---- 漂移时机（门槛放宽 → 更常吃到漂移喷射）----
  const drift = Math.abs(steer) > 0.62 && kart.speed > 20 && maxCurve > 0.12;

  return { steer, throttle, brake, drift };
}

// AI 是否想用道具（由 main 呼叫 items.use）
export function aiWantsItem(kart, karts, dt) {
  if (!kart.item || kart.rouletteT > 0) return false;
  kart.itemCd -= dt;
  if (kart.itemCd > 0) return false;
  kart.itemCd = 0.5 + Math.random() * 1.4; // 出手更果断
  // 追踪弹看时机，其他随缘
  if (kart.item === 'missile') {
    return karts.some(o => o !== kart && !o.finished && o.progress > kart.progress);
  }
  return Math.random() < 0.9;
}
