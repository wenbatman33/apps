// Western Bar — v4.3 設定
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// 7 zone：0 = MISS、1..4 = 玩家可動 + 可射、5 = 緩衝空格、6 = 酒保固定位
export const ZONES = 7;
export const PLAYER_MIN_ZONE = 1;
export const PLAYER_MAX_ZONE = 4;
export const BARMAN_ZONE = 6;

// 各 zone 中心 X 座標 — 對齊背景圖的吧台寬度（往右下縮）
export const ZONE_X: number[] = [];
{
  const left = GAME_WIDTH * 0.28;
  const right = GAME_WIDTH * 0.94;
  const step = (right - left) / (ZONES - 1);
  for (let i = 0; i < ZONES; i++) ZONE_X.push(left + step * i);
}

// 三層 Y 座標 — 對齊背景圖：物品軌道在吧台檯面正上、夫婦在中、玩家在前景地板
export const ROW_TOP_Y     = GAME_HEIGHT * 0.52;   // 對齊吧台檯面前緣（物品恰好放在桌面上）
export const ROW_COUPLE_Y  = GAME_HEIGHT * 0.66;   // 對齊中段桌椅區
export const ROW_PLAYER_Y  = GAME_HEIGHT * 0.86;   // 對齊前景木地板

// 物品節拍 — 固定，不隨等級變快
export const GLOBAL_STEP_BASE_MS = 1400;

export interface LevelDiff {
  itemStepMs: number;
  itemSpawnMs: number;
  coupleAngerMs: number;
  coupleAngerChance: number;
  projectileTossMs: number;   // 攻擊物斜向丟擲到玩家層所花時間
  bombChance: number;
}

// 難度提升 = 物品更多 + 夫婦更愛丟
// 不再讓物品移動速度加快（itemStepMs 固定）
export function levelDiff(level: number): LevelDiff {
  const L = Math.max(1, Math.min(10, level));
  const stepMs = GLOBAL_STEP_BASE_MS;  // 固定節拍
  // spawn 間隔隨關卡縮短：L1 = stepMs*0.85、L10 ≈ stepMs*0.35
  const spawnFactor = Math.max(0.35, 0.85 - (L - 1) * 0.055);
  return {
    itemStepMs: stepMs,
    itemSpawnMs: Math.round(stepMs * spawnFactor),
    projectileTossMs: 2000,  // 固定
    // 夫婦越來越愛生氣（檢查間隔變短、發怒機率變高）
    coupleAngerMs: Math.max(700, 2000 - L * 130),
    coupleAngerChance: Math.min(0.10, 0.02 + L * 0.008),
    bombChance: 0.08 + L * 0.012
  };
}

export const PARAMS = {
  lives: 3,
  hitsToFinishStage: 20,
  duelBanditHits: 3,
  tableHp: 3
};

// 計分
export const SCORE = {
  singleHit: 10,
  multiHitFlat: 50,
  bonus: 200,
  banditKill: 500
};

export const COLORS = {
  bgWood:    0x2b1a0e,
  bgPanel:   0x4a2d18,
  bartop:    0x3a230f,
  lane:      0xc89968,
  hudGold:   0xe9c46a,
  red:       0xd00000,
  textCream: "#ffe8b5"
};
