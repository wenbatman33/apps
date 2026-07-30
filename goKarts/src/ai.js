// AI 車手：路線跟隨、彎前減速、漂移、避開陷阱、橡皮筋平衡
import * as THREE from 'three';
import { angleDiff } from './physics.js';

export function aiInput(kart, track, player, hazards, dt) {
  const N = track.N;
  const t = performance.now() / 1000;

  // ---- 個性化路線偏移（緩慢游移 + 避障）----
  kart.aiThink -= dt;
  if (kart.aiThink <= 0) {
    kart.aiThink = 0.5 + Math.random() * 0.5;
    let want = Math.sin(t * 0.35 + kart.aiSeed) * track.halfW * 0.42;
    // 前方陷阱 → 側移閃避
    for (const h of hazards) {
      const rel = (h.idx - kart.idx + N) % N;
      if (rel > 2 && rel < 46 && Math.abs(h.lateral - want) < 3.2) {
        want = h.lateral > 0 ? h.lateral - 4.5 : h.lateral + 4.5;
        want = THREE.MathUtils.clamp(want, -track.halfW * 0.7, track.halfW * 0.7);
      }
    }
    kart.aiOffset += (want - kart.aiOffset) * 0.6;
  }

  // ---- 追蹤前方目標點（彎中縮短視距、出界時瞄回路中央）----
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

  // ---- 彎前減速（依真實曲率推算過彎速度）----
  let maxCurve = 0;
  for (let k = 12; k < 70; k += 4) {
    maxCurve = Math.max(maxCurve, track.samples[(kart.idx + k) % N].curve);
  }
  const cornerSpeed = 14 + 30 * Math.exp(-maxCurve * 6);
  let throttle = 1, brake = false;
  if (kart.speed > cornerSpeed + 6) brake = true;
  else if (kart.speed > cornerSpeed) throttle = 0.25;
  if (Math.abs(dh) > 1.1 && kart.speed > 20) brake = true;

  // ---- 橡皮筋：落後追快、領先放慢 ----
  if (player && !player.finished) {
    const gap = kart.progress - player.progress;
    kart.aiTopScale = gap > 260 ? 0.90 : gap < -260 ? 1.10 : 1.0;
  } else {
    kart.aiTopScale = 1.0;
  }

  // ---- 漂移時機 ----
  const drift = Math.abs(steer) > 0.82 && kart.speed > 24 && maxCurve > 0.18;

  return { steer, throttle, brake, drift };
}

// AI 是否想用道具（由 main 呼叫 items.use）
export function aiWantsItem(kart, karts, dt) {
  if (!kart.item || kart.rouletteT > 0) return false;
  kart.itemCd -= dt;
  if (kart.itemCd > 0) return false;
  kart.itemCd = 0.8 + Math.random() * 2.2;
  // 紅龜殼/閃電看時機，其他隨緣
  if (kart.item === 'redShell') {
    return karts.some(o => o !== kart && !o.finished && o.progress > kart.progress);
  }
  return Math.random() < 0.75;
}
