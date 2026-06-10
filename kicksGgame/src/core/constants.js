// 從原始 game/js/settings.js 1:1 搬移的常數（只取移植需要的）
// 座標系：Cannon 重力在 Z 軸；X=左右 / Y=朝球門縱深 / Z=高度

const CANVAS_WIDTH = 1360;
const CANVAS_HEIGHT = 640;
const CANVAS_WIDTH_HALF = CANVAS_WIDTH * 0.5;
const CANVAS_HEIGHT_HALF = CANVAS_HEIGHT * 0.5;

const FPS = 30;
const STEP_RATE = 1.5;
const PHYSICS_STEP = 1 / (FPS * STEP_RATE);
const PHYSICS_ACCURACY = 3;
const ROLL_BALL_RATE = 60 / FPS;
const MIN_BALL_VEL_ROTATION = 0.1;

// 守門員撲救動畫類型索引
const IDLE = 0, RIGHT = 1, LEFT = 2, CENTER_DOWN = 3, CENTER_UP = 4,
      LEFT_DOWN = 5, RIGHT_DOWN = 6, CENTER = 7, SIDE_LEFT = 8, SIDE_RIGHT = 9,
      SIDE_LEFT_UP = 10, SIDE_RIGHT_UP = 11, SIDE_LEFT_DOWN = 12, SIDE_RIGHT_DOWN = 13,
      LEFT_UP = 14, RIGHT_UP = 15;

// 進球時 GK 撲錯方向用的排除表（依命中區 0~14）
const ANIM_GOAL_KEEPER_FAIL_EXCLUSION_LIST = [
    [LEFT_UP, LEFT, SIDE_LEFT_UP, SIDE_LEFT],
    [LEFT_UP, LEFT, SIDE_LEFT_UP, SIDE_LEFT, CENTER_UP],
    [CENTER_UP, CENTER, SIDE_LEFT_UP, SIDE_RIGHT_UP, SIDE_LEFT, SIDE_RIGHT],
    [RIGHT_UP, RIGHT, SIDE_RIGHT_UP, SIDE_RIGHT, CENTER_UP],
    [RIGHT_UP, RIGHT, SIDE_RIGHT_UP, SIDE_RIGHT],
    [LEFT_UP, LEFT, SIDE_LEFT_UP, SIDE_LEFT, SIDE_LEFT_DOWN, LEFT_DOWN],
    [LEFT_UP, LEFT, SIDE_LEFT_UP, SIDE_LEFT, SIDE_LEFT_DOWN],
    [CENTER_UP, CENTER, SIDE_LEFT_UP, SIDE_RIGHT_UP, CENTER_DOWN, SIDE_RIGHT, SIDE_LEFT],
    [RIGHT_UP, RIGHT, SIDE_RIGHT_UP, SIDE_RIGHT, SIDE_RIGHT_DOWN],
    [RIGHT_UP, RIGHT, SIDE_RIGHT_UP, SIDE_RIGHT, SIDE_RIGHT_DOWN, RIGHT_DOWN],
    [LEFT_DOWN, LEFT, SIDE_LEFT_DOWN],
    [LEFT_DOWN, LEFT, SIDE_LEFT_DOWN, SIDE_LEFT, SIDE_LEFT_UP],
    [CENTER_DOWN, CENTER, CENTER_UP, SIDE_RIGHT, SIDE_LEFT, SIDE_RIGHT_DOWN, SIDE_LEFT_DOWN],
    [RIGHT_DOWN, RIGHT, SIDE_RIGHT_DOWN, SIDE_RIGHT, SIDE_RIGHT_UP],
    [RIGHT_DOWN, RIGHT, SIDE_RIGHT_DOWN],
];

// 守門員 16 組動畫的名稱與幀數（對應 sprites/gk_* 資料夾）
const SPRITE_NAME_GOALKEEPER = [
    "gk_idle", "gk_save_right", "gk_save_left", "gk_save_center_down", "gk_save_center_up",
    "gk_save_down_left", "gk_save_down_right", "gk_save_center", "gk_save_side_left",
    "gk_save_side_right", "gk_save_side_up_left", "gk_save_side_up_right",
    "gk_save_side_low_left", "gk_save_side_low_right", "gk_save_up_left", "gk_save_up_right"
];
const NUM_SPRITE_GOALKEEPER = [24, 34, 34, 51, 25, 34, 34, 25, 30, 30, 30, 30, 51, 51, 36, 36];

// 各動畫容器位移（螢幕像素）
const OFFSET_CONTAINER_GOALKEEPER = [
    {x: 0, y: 0}, {x: 15, y: -29}, {x: -360, y: -29}, {x: -15, y: -15}, {x: -20, y: -85},
    {x: -355, y: 20}, {x: 21, y: 20}, {x: 10, y: -10}, {x: -140, y: -30}, {x: 10, y: -30},
    {x: -120, y: -75}, {x: 14, y: -75}, {x: -140, y: -10}, {x: 30, y: -10}, {x: -430, y: -56}, {x: -8, y: -56},
];

// 撲救動畫衝擊原點（用於 runAnimAndShift 對齊球落點）
const ORIGIN_POINT_IMPACT_ANIMATION = [
    {x: null, y: null}, {x: 295.74, y: 3.76}, {x: -324.82, y: 3.76}, {x: 4.8, y: null}, {x: 5, y: null},
    {x: -354, y: null}, {x: 334.5, y: null}, {x: 4.8, y: null}, {x: -198.77, y: null}, {x: 189, y: null},
    {x: -208.4, y: null}, {x: 189, y: null}, {x: -150, y: null}, {x: 101.8, y: null}, {x: -344, y: -88}, {x: 315, y: -88}
];

const NUM_SPRITE_PLAYER = 31;
const SHOOT_FRAME = 7;

// 物理
const BALL_MASS = 0.5;
const BALL_RADIUS = 0.64;
const BALL_LINEAR_DAMPING = 0.2;

// 場地 / 球門尺寸（Cannon 世界單位）
const BACK_WALL_GOAL_SIZE = {width: 20.5, depth: 1, height: 7.5};
const LEFT_RIGHT_WALL_GOAL_SIZE = {width: 0.1, depth: 25, height: 7.5};
const UP_WALL_GOAL_SIZE = {width: 20.5, depth: 25, height: 0.1};
const BACK_WALL_GOAL_POSITION = {x: 0, y: 155, z: -2.7};
const GOAL_LINE_POS = {x: 0, y: BACK_WALL_GOAL_POSITION.y - UP_WALL_GOAL_SIZE.depth + 2, z: BACK_WALL_GOAL_POSITION.z};
const POSITION_BALL = {x: 0.05, y: 15.4, z: -9 + BALL_RADIUS};
const POLE_UP_SIZE = {radius_top: 0.5, radius_bottom: 0.5, height: 40.5, segments: 10};
const POLE_RIGHT_LEFT_SIZE = {radius_top: 0.5, radius_bottom: 0.5, height: 15, segments: 10};
const GOAL_KEEPER_DEPTH_Y = BACK_WALL_GOAL_POSITION.y - UP_WALL_GOAL_SIZE.depth;
const BALL_OUT_Y = BACK_WALL_GOAL_POSITION.y + 3;

// 球門區網格（5 欄 3 列 = 15 區）
const NUM_AREA_GOAL = {h: 3, w: 5};
const AREA_GOALS_ANIM = [
    LEFT_UP, SIDE_LEFT_UP, CENTER_UP, SIDE_RIGHT_UP, RIGHT_UP,
    LEFT, SIDE_LEFT, CENTER, SIDE_RIGHT, RIGHT,
    LEFT_DOWN, SIDE_LEFT_DOWN, CENTER_DOWN, SIDE_RIGHT_DOWN, RIGHT_DOWN
];

// 射門力道相關
const HIT_BALL_MAX_FORCE = 130;
const HIT_BALL_MIN_FORCE = 5;
const FORCE_RATE = 0.0014;
const FORCE_MAX = 0.5;
const FORCE_MULTIPLIER_AXIS = {x: 0.14, y: 0.4, z: 0.10};
const MAX_FORCE_Y = 66;
const MIN_FORCE_Y = 50;
const TIME_SWIPE_DESKTOP = 500;
const TIME_SWIPE_MOBILE = 650;

// 射門落點 → 球門座標的映射參數
const STRIKER_GOAL_SHOOTAREA = {lx: -0.2, rx: 0.195, zmin: 0.07, zmax: 0.1865};

// 重置時間（ms）
const TIME_RESET_AFTER_GOAL = 1000;
const TIME_RESET_AFTER_SAVE = 500;
const TIME_RESET_AFTER_BALL_OUT = 250;
const TIME_POLE_COLLISION_RESET = 1000;
const BUFFER_ANIM_PLAYER = FPS;
const MAX_PERCENT_PROBABILITY = 100;

// 球 / 陰影縮放
const FOV = 15;
const NEAR = 1, FAR = 2000;
const CAMERA_POSITION = {x: 0, y: 0, z: -7};
const BALL_SCALE_FACTOR = 0.07;
const SHADOWN_FACTOR = 1.1;

// 關卡資料（原 game/index.html 傳入 CMain 的 oData）
const LEVEL_DATA = {
    // 平均 ~74%：搭配少量出界 → 10 球約進 6~7 球
    area_goal: [
        {id: 0, probability: 96}, {id: 1, probability: 80}, {id: 2, probability: 60},
        {id: 3, probability: 80}, {id: 4, probability: 96}, {id: 5, probability: 78},
        {id: 6, probability: 60}, {id: 7, probability: 50}, {id: 8, probability: 60},
        {id: 9, probability: 78}, {id: 10, probability: 84}, {id: 11, probability: 66},
        {id: 12, probability: 72}, {id: 13, probability: 66}, {id: 14, probability: 84}
    ],
    num_of_penalty: 10,
    multiplier_step: 0.1,
};

// 工具：線性映射（原 ctl_utils.linearFunction）
function linearFunction(x, x1, x2, y1, y2) {
    return ((x - x1) * (y2 - y1) / (x2 - x1)) + y1;
}
function distanceV2(v1, v2) {
    const dx = v1.x - v2.x, dy = v1.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
}
