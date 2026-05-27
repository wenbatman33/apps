// v15: 吧台右端貼齊右邊框、左端內縮（2026-05-26）
// 歷史檔：scripts/layout_history/2026-05-26_1030_v15_bar-flush-right-edge.json
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

export const ROW_TOP_Y_RATIO    = 0.300;
export const ROW_COUPLE_Y_RATIO = 0.478;
export const ROW_PLAYER_Y_RATIO = 0.790;
export const ZONE_X_RATIOS      = [0.180, 0.270, 0.395, 0.520, 0.640, 0.760, 0.868];
export const ZONE_NEG1_RATIO    = 0.050;

export const RECTS = {
  barCounter:  { x: 0.420, y: 0.043, w: 0.555, h: 0.211 },
  bottleShelf: { x: 0.422, y: 0.047, w: 0.559, h: 0.224 },
};

export const SPRITES = {
  swing_door:   { x: 0.111, y: 0.185, w: 0.080, h: 0.270, src: "A/A11_swing_door.png" },
  couple_table: { x: 0.434, y: 0.476, w: 0.180, h: 0.150, src: "A/A26_round_table.png" },
  chair_left:   { x: 0.310, y: 0.500, w: 0.055, h: 0.130, src: "A/A27_chair_left.png" },
  chair_right:  { x: 0.555, y: 0.500, w: 0.055, h: 0.130, src: "A/A28_chair_right.png" },
  food_set:     { x: 0.434, y: 0.450, w: 0.110, h: 0.080, src: "A/A29_food_set.png" },

  cover_intact:    { x: 0.871, y: 0.488, w: 0.110, h: 0.140, src: "F/F01_table_intact.png" },
  cover_damaged:   { x: 0.730, y: 0.700, w: 0.110, h: 0.140, src: "F/F02_table_damaged.png" },
  cover_destroyed: { x: 0.730, y: 0.700, w: 0.110, h: 0.130, src: "F/F03_table_destroyed.png" },

  sheriff_action1: { x: 0.328, y: 0.876, w: 0.090, h: 0.260, anchor: "bottom", src: "sprites/sheriff/action1.png", gunOffsetX: -0.292, gunOffsetY: -0.435 },
  sheriff_action2: { x: 0.463, y: 0.883, w: 0.090, h: 0.260, anchor: "bottom", src: "sprites/sheriff/action2.png", gunOffsetX: -0.368, gunOffsetY: -0.346 },
  sheriff_action3: { x: 0.583, y: 0.893, w: 0.101, h: 0.275, anchor: "bottom", src: "sprites/sheriff/action3.png", gunOffsetX: -0.405, gunOffsetY: -0.500 },
  sheriff_action4: { x: 0.730, y: 0.893, w: 0.117, h: 0.303, anchor: "bottom", src: "sprites/sheriff/action4.png", gunOffsetX: -0.447, gunOffsetY: -0.342 },
  sheriff_pour:    { x: 0.742, y: 0.904, w: 0.129, h: 0.328, anchor: "bottom", src: "sprites/sheriff/pour.png" },
  sheriff_hide:    { x: 0.906, y: 0.654, w: 0.123, h: 0.343, anchor: "bottom", src: "sprites/sheriff/hide.png" },
  sheriff_fire:    { x: 0.758, y: 0.636, w: 0.126, h: 0.328, anchor: "bottom", src: "sprites/sheriff/fire.png" },
  sheriff_down:    { x: 0.850, y: 0.867, w: 0.140, h: 0.290, anchor: "bottom", src: "sprites/sheriff/down.png" },

  bandit_at_door: { x: 0.111, y: 0.420, w: 0.095, h: 0.270, anchor: "bottom", src: "sprites/bandit/at_door.png" },
  bandit_enter:   { x: 0.150, y: 0.620, w: 0.095, h: 0.270, anchor: "bottom", src: "sprites/bandit/enter.png" },
  bandit_hide:    { x: 0.200, y: 0.403, w: 0.067, h: 0.170, anchor: "bottom", src: "sprites/bandit/hide.png" },
  bandit_peek:    { x: 0.221, y: 0.445, w: 0.085, h: 0.250, anchor: "bottom", src: "sprites/bandit/peek.png" },
  bandit_fire:    { x: 0.160, y: 0.790, w: 0.140, h: 0.300, anchor: "bottom", src: "sprites/bandit/fire.png" },
  bandit_hit:     { x: 0.120, y: 0.790, w: 0.140, h: 0.300, anchor: "bottom", src: "sprites/bandit/hit.png" },
  bandit_down:    { x: 0.132, y: 0.835, w: 0.160, h: 0.250, anchor: "bottom", src: "sprites/bandit/down.png" },

  barman_idle:  { x: 0.927, y: 0.346, w: 0.105, h: 0.250, anchor: "bottom", src: "sprites/barman/idle.png" },
  barman_slide: { x: 0.927, y: 0.346, w: 0.105, h: 0.250, anchor: "bottom", src: "sprites/barman/slide.png" },
  barman_catch: { x: 0.927, y: 0.346, w: 0.105, h: 0.250, anchor: "bottom", src: "sprites/barman/catch.png" },
  barman_cheer: { x: 0.927, y: 0.346, w: 0.105, h: 0.250, anchor: "bottom", src: "sprites/barman/cheer.png" },

  husband_eat1:  { x: 0.362, y: 0.557, w: 0.100, h: 0.220, anchor: "bottom", src: "sprites/husband/eat1.png" },
  husband_eat2:  { x: 0.382, y: 0.557, w: 0.100, h: 0.220, anchor: "bottom", src: "sprites/husband/eat2.png" },
  husband_alert: { x: 0.402, y: 0.557, w: 0.100, h: 0.220, anchor: "bottom", src: "sprites/husband/alert.png" },
  husband_hide:  { x: 0.422, y: 0.557, w: 0.100, h: 0.220, anchor: "bottom", src: "sprites/husband/hide.png" },

  wife_eat1:  { x: 0.529, y: 0.544, w: 0.095, h: 0.225, anchor: "bottom", src: "sprites/wife/eat1.png" },
  wife_eat2:  { x: 0.549, y: 0.544, w: 0.095, h: 0.225, anchor: "bottom", src: "sprites/wife/eat2.png" },
  wife_alert: { x: 0.569, y: 0.544, w: 0.095, h: 0.225, anchor: "bottom", src: "sprites/wife/alert.png" },
  wife_hide:  { x: 0.589, y: 0.544, w: 0.095, h: 0.225, anchor: "bottom", src: "sprites/wife/hide.png" },

  cup:     { x: 0.749, y: 0.300, w: 0.040, h: 0.060, src: "G/G01_cup_intact.png" },
  bottle:  { x: 0.705, y: 0.300, w: 0.030, h: 0.080, src: "G/G03_bottle_intact.png" },
  plate:   { x: 0.788, y: 0.300, w: 0.045, h: 0.050, src: "G/G05_plate_intact.png" },
  bonus:   { x: 0.780, y: 0.300, w: 0.035, h: 0.080, src: "G/G07_bonus_bottle.png" },
  apple:   { x: 0.605, y: 0.446, w: 0.030, h: 0.040, src: "H/H01_apple.png" },
  ashtray: { x: 0.311, y: 0.500, w: 0.035, h: 0.030, src: "H/H02_ashtray.png" },
  whiskey: { x: 0.850, y: 0.450, w: 0.030, h: 0.075, src: "J/J01_whiskey_bottle.png" },

  dynamite_lit:    { x: 0.080, y: 0.200, w: 0.030, h: 0.050, src: "I/I01_dynamite_lit.png" },
  dynamite_ground: { x: 0.492, y: 0.860, w: 0.035, h: 0.050, src: "I/I02_dynamite_ground.png" },
  explosion:       { x: 0.516, y: 0.640, w: 0.080, h: 0.110, src: "I/I03_explosion.png" },
  bullet_player:   { x: 0.558, y: 0.760, w: 0.015, h: 0.040, src: "L/L01_bullet_player.png" },
  bullet_bandit:   { x: 0.206, y: 0.600, w: 0.015, h: 0.035, src: "L/L02_bullet_bandit.png" },
};

export const PATHS: Record<string, Array<{x: number; y: number; lbl?: string}>> = {
  cup_flow: [
    { x: 0.940, y: 0.258, lbl: "酒保發" },
    { x: 0.850, y: 0.260 },
    { x: 0.755, y: 0.260 },
    { x: 0.660, y: 0.260 },
    { x: 0.565, y: 0.260 },
    { x: 0.470, y: 0.260 },
    { x: 0.420, y: 0.319, lbl: "MISS" },
  ],
  bottle_flow: [
    { x: 0.940, y: 0.295 }, { x: 0.850, y: 0.297 }, { x: 0.755, y: 0.297 },
    { x: 0.660, y: 0.297 }, { x: 0.565, y: 0.295 }, { x: 0.470, y: 0.292 },
    { x: 0.420, y: 0.361 },
  ],
  plate_flow: [
    { x: 0.940, y: 0.064 }, { x: 0.846, y: 0.059 }, { x: 0.750, y: 0.059 },
    { x: 0.654, y: 0.059 }, { x: 0.560, y: 0.056 }, { x: 0.465, y: 0.122 },
    { x: 0.420, y: 0.179 },
  ],
  dynamite_arc: [
    { x: 0.181, y: 0.077, lbl: "1 門口" },
    { x: 0.300, y: 0.076 },
    { x: 0.440, y: 0.127 },
    { x: 0.580, y: 0.119, lbl: "拋物頂" },
    { x: 0.700, y: 0.118 },
    { x: 0.820, y: 0.121 },
    { x: 0.940, y: 0.159 },
    { x: 0.970, y: 0.396 },
    { x: 0.940, y: 0.550 },
    { x: 0.820, y: 0.833, lbl: "10 落地" },
  ],
  husband_throw_z1: [
    { x: 0.334, y: 0.431, lbl: "起" },
    { x: 0.286, y: 0.473 },
    { x: 0.287, y: 0.584 },
    { x: 0.305, y: 0.693, lbl: "Z1 落" },
  ],
  husband_throw_z2: [
    { x: 0.362, y: 0.437, lbl: "起" },
    { x: 0.410, y: 0.519 },
    { x: 0.425, y: 0.598 },
    { x: 0.445, y: 0.691, lbl: "Z2 落" },
  ],
  wife_throw_z3: [
    { x: 0.602, y: 0.463, lbl: "起" },
    { x: 0.564, y: 0.474 },
    { x: 0.563, y: 0.576 },
    { x: 0.580, y: 0.697, lbl: "Z3 落" },
  ],
  wife_throw_z4: [
    { x: 0.602, y: 0.460, lbl: "起" },
    { x: 0.652, y: 0.511 },
    { x: 0.670, y: 0.574 },
    { x: 0.701, y: 0.747, lbl: "Z4 落" },
  ],
};

export function rectPx(r: { x: number; y: number; w: number; h: number }) {
  return { x: r.x * GAME_WIDTH, y: r.y * GAME_HEIGHT, w: r.w * GAME_WIDTH, h: r.h * GAME_HEIGHT };
}
export function spritePx(s: { x: number; y: number; w: number; h: number; anchor?: string }) {
  return {
    x: s.x * GAME_WIDTH, y: s.y * GAME_HEIGHT,
    w: s.w * GAME_WIDTH, h: s.h * GAME_HEIGHT,
    anchor: s.anchor || "center",
  };
}
export function pathPx(name: string) {
  return (PATHS[name] || []).map(pt => ({ x: pt.x * GAME_WIDTH, y: pt.y * GAME_HEIGHT, lbl: pt.lbl }));
}
