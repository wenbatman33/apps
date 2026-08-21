// 全域設定：所有可調參數集中在此，DEV 微調工具直接改這些物件（即時生效）

// 世界設定
export const WORLD = {
  radius: 14000,         // 圓形世界半徑（放大到「跑不到邊」的尺度）
  foodCount: 3000,       // 場上食物數量上限（集中在活躍區內，密度比舊版更高）
  botCount: 18,          // AI 蛇數量（密度調低，讓發育期不會一直撞見敵人）
  gridCell: 160,         // 空間網格單格大小（碰撞加速用）
  spawnMinDist: 2100,    // 補生成的最小距離：必須大於畫面可見半徑，避免食物／敵蛇在眼前憑空冒出
  activeRadius: 4200,    // 活躍區半徑：食物與 bot 只在玩家周圍這個範圍內補充
  despawnRadius: 7000,   // 離玩家超過此距離的食物／bot 會被回收，挪回活躍區重生
  minimapRange: 3800,    // 小地圖（局部雷達）顯示的世界半徑
};

// 玩法手感參數
export const TUNING = {
  baseSpeed: 205,        // 基礎速度 px/s
  boostSpeed: 400,       // 加速時速度 px/s
  turnRate: 4.6,         // 每秒最大轉向弧度（基準）
  turnRateFatPenalty: 0.45, // 蛇越粗轉向越慢的比例（0=不減速）
  boostDrainPerSec: 9,   // 加速每秒消耗的 mass
  boostMinMass: 22,      // 低於此 mass 不能加速
  startMass: 20,         // 初始 mass
  massPerSegment: 2.4,   // 每多少 mass 增加一節身體
  baseRadius: 11,        // 基礎身體半徑
  radiusGrowth: 0.34,    // 粗細成長係數（對 mass 開根號）
  maxRadius: 64,
  segSpacingRatio: 0.46, // 身體節點間距 = 半徑 * 此值
  foodValue: 1,          // 一般食物 mass
  foodMagnet: 46,        // 食物吸附距離（額外於身體半徑）
  eatSpeed: 900,         // 食物被吸過來的速度
  deathFoodRatio: 0.75,  // 死亡後轉成食物的 mass 比例
  headOnMassEdge: 1.1,   // 頭對頭相撞：質量高過對方這個倍率就吃掉對方（差距內則同歸於盡）
  cameraZoomBase: 1.05,  // 相機基礎縮放
  cameraZoomFalloff: 0.0009, // 蛇越大鏡頭拉越遠（放慢，避免抵銷身體成長）
  cameraZoomMin: 0.56,
  cameraLerp: 0.14,      // 相機跟隨平滑
  botAggression: 0.55,   // AI 攻擊性 0~1（越高越愛繞頭堵人）
  botBoostChance: 0.35,  // AI 追擊時開加速的機率
  botReactTime: 0.19,    // AI 決策間隔（秒，越大反應越鈍）
  botAvoidSkill: 0.7,    // AI 閃避技巧 0~1（越低越容易被玩家繞頭堵死）
  botSense: 340,         // AI 感知半徑
};

// 版面：PC 與 Mobile 各一份，DEV 工具可分別調整與匯出
export const LAYOUT_PC = {
  hudScale: 1,
  scoreX: 24, scoreY: 22, scoreSize: 22,
  boardX: -24, boardY: 22, boardSize: 17, boardRows: 10, boardAlpha: 0.92,
  minimapX: -24, minimapY: -24, minimapSize: 168, minimapAlpha: 0.72,
  boostBtnX: -120, boostBtnY: -150, boostBtnR: 0, // PC 不顯示（用滑鼠左鍵／空白鍵）
  joyX: 0, joyY: 0, joyR: 0,
  quitX: 0, quitY: 0, quitR: 0,                   // PC 用 Esc 離開，不畫按鈕
  nameSize: 15,
};

export const LAYOUT_MOBILE = {
  hudScale: 1,
  scoreX: 14, scoreY: 12, scoreSize: 18,
  boardX: -14, boardY: 12, boardSize: 12, boardRows: 6, boardAlpha: 0.86,
  minimapX: 14, minimapY: -14, minimapSize: 100, minimapAlpha: 0.62,  // 左下，避開右下加速鍵
  boostBtnX: -80, boostBtnY: -96, boostBtnR: 0,                      // 不用加速鍵：搖桿推到底就是衝刺（單指操作）
  joyX: 0, joyY: 0, joyR: 68,                                         // 搖桿為浮動式，按哪出現在哪
  quitX: 30, quitY: 92, quitR: 17,                                    // 左上離開鍵
  nameSize: 15,
};

// 蛇的配色（每條蛇一組漸層雙色）
export const SKINS = [
  [0x00e5ff, 0x0066ff], [0xff2d75, 0x7a1fa2], [0x76ff03, 0x00c853],
  [0xffd54f, 0xff6f00], [0xff6ec7, 0xff1744], [0x40c4ff, 0x00b8d4],
  [0xb388ff, 0x651fff], [0xffffff, 0x90a4ae], [0xff8a65, 0xd84315],
  [0x69f0ae, 0x00bfa5], [0xffee58, 0xf9a825], [0xea80fc, 0xaa00ff],
];

export const BOT_NAMES = [
  '小蛇皮','貪食者','夜行','雷姆','阿財','無情鐵手','滑溜溜','蛇王',
  '光速仔','肥宅','抖動','青龍','夜梟','小圓','電神','阿吉','風之子',
  '銀環','伏地魔','大胃王','閃電','紫羅蘭','刺客','綠豆','老司機','霹靂',
];

export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// 實際生效的版面：保持同一個物件引用，切換模式時只覆蓋內容，讓 DEV 工具能即時預覽
export const LAYOUT = { ...(IS_TOUCH ? LAYOUT_MOBILE : LAYOUT_PC) };
export let layoutMode = IS_TOUCH ? 'mobile' : 'pc';
export function setLayoutMode(mode) {
  layoutMode = mode;
  Object.assign(LAYOUT, mode === 'mobile' ? LAYOUT_MOBILE : LAYOUT_PC);
}
// DEV 工具「匯出」用：把目前調整值寫回對應的預設表
export function commitLayout() {
  Object.assign(layoutMode === 'mobile' ? LAYOUT_MOBILE : LAYOUT_PC, LAYOUT);
}
