// ===== 遊戲資料：彈珠 / 三台機檯配置 =====

// 每局三顆彈珠，依序上場，各有小特長
export const HEROES = [
  { id: 'ball1', name: '第一球', title: '', world: '', emoji: '🔵', color: 0x4fa8ff,
    perk: '球保護時間 +6 秒', perkType: 'saver' },
  { id: 'ball2', name: '第二球', title: '', world: '', emoji: '🟡', color: 0xffc44d,
    perk: '彈射器與彈弓得分 ×2', perkType: 'bumperScore' },
  { id: 'ball3', name: '第三球', title: '', world: '', emoji: '🔴', color: 0xff4d5e,
    perk: '對主目標傷害 +25%', perkType: 'bossDmg' },
];

// 關卡（座標系：x ∈ [-3.2,3.2]，z ∈ [-6.6,6.6]，z 負方向 = 檯面頂端）
// 每章共用的基本結構在 game.js 建構；這裡定義各章的機關配置
export const STAGES = [
  {
    id: 0, name: 'GRAND PRIX', sub: 'F1 大獎賽',
    art: 'table_f1.jpg', glass: 'glass_f1.jpg',
    theme: { main: 0xff2d3d, accent: 0xffd75e, wall: 0xc8202e },
    bossName: '衛冕冠軍', bossEmoji: '🏎️', bossColor: 0xff2d3d,
    targetName: '進站維修區', vulnText: '🏁 對手進站！全力超車！',
    laneLetters: ['R', 'A', 'C', 'E'],
    bossHp: 2600,
    bumpers: [ { x: -1.32, z: -1.45 }, { x: 1.32, z: -1.45 }, { x: 0, z: -0.45 } ],
    // 主靶組（全部打掉 → Boss 破防）
    targets: [
      { x: -1.15, z: -3.15 }, { x: -0.575, z: -3.15 }, { x: 0, z: -3.15 },
      { x: 0.575, z: -3.15 }, { x: 1.15, z: -3.15 },
    ],
    // 側邊獨立靶（打中給高分 + 加成）
    sideTargets: [ { x: -2.75, z: -2.9 }, { x: 2.15, z: -2.9 } ],
    // 頂部滾道字母燈（集滿 → 加成倍率 +1）
    laneLetters: ['P', 'I', 'N'],
    // 旋轉片（放在左側滾道通道內）
    spinners: [ { x: -2.82, z: -0.55 } ],
    // 吸球洞（進洞給大量分數 + 直接重擊 Boss）
    saucers: [ { x: 2.1, z: -1.15 } ],
    // 橡膠障礙柱
    posts: [ { x: -1.9, z: 0.2 }, { x: 1.9, z: 0.2 }, { x: 0, z: 2.85 } ],
    // 檯面散布觸點（滾過得分）
    rollovers: [ { x: -1.15, z: 4.5 }, { x: 1.15, z: 4.5 }, { x: -1.5, z: 2.6 }, { x: 1.5, z: 2.6 } ],
  },
  {
    // 台二：中央被主幹道貫穿 → 機關往兩側退，彈射器改成左右對稱雙塔
    id: 1, name: 'STARFLEET', sub: '星際艦隊',
    art: 'table_space.jpg', glass: 'glass_space.jpg',
    theme: { main: 0x35d6ff, accent: 0xc77dff, wall: 0x3b5bff },
    bossName: '旗艦核心', bossEmoji: '🛸', bossColor: 0x35d6ff,
    targetName: '護盾產生器', vulnText: '⚡ 護盾瓦解！攻擊核心！',
    bossHp: 4800,
    ringZ: 2.15,                       // 燈環下移，讓開中央軌道
    bumpers: [
      { x: -1.75, z: -1.55 }, { x: -1.75, z: -2.75 },
      { x: 1.80, z: -1.55 }, { x: 1.80, z: -2.75 },
    ],
    // 靶組改成分成左右兩排（中央要留給軌道）
    targets: [
      { x: -1.30, z: -3.95 }, { x: -0.80, z: -4.20 }, { x: -0.30, z: -4.35 },
      { x: 0.95, z: -3.95 }, { x: 1.45, z: -3.70 },
    ],
    sideTargets: [ { x: -2.85, z: -3.35 }, { x: 2.28, z: -3.60 }, { x: 2.28, z: 1.30 } ],
    laneLetters: ['V', 'O', 'I', 'D'],
    spinners: [ { x: -2.86, z: 0.55 } ],
    saucers: [ { x: -2.15, z: -4.55 }, { x: 1.95, z: 0.55 } ],
    posts: [ { x: -0.95, z: 0.55 }, { x: 0.85, z: 0.55 }, { x: -1.65, z: 3.15 }, { x: 1.65, z: 3.15 } ],
    rollovers: [ { x: -1.15, z: 4.5 }, { x: 1.15, z: 4.5 }, { x: -0.85, z: 3.55 }, { x: 0.85, z: 3.55 } ],
  },
  {
    // 台三：中央有跳台直射巨獸 → 彈射器排成菱形環繞跳台，靶組退到巨獸前
    id: 2, name: 'KAIJU CITY', sub: '巨獸浩劫',
    art: 'table_kaiju.jpg', glass: 'glass_kaiju.jpg',
    theme: { main: 0xff5e3d, accent: 0xffd75e, wall: 0xc23a2a },
    bossName: '巨獸', bossEmoji: '🦖', bossColor: 0xff5e3d,
    targetName: '飛彈發射井', vulnText: '💥 巨獸倒地！集中火力！',
    bossHp: 8000,
    ringZ: 3.05,                       // 燈環再下移，避開跳台
    bumpers: [
      { x: -1.85, z: -1.20 }, { x: 1.85, z: -1.20 },
      { x: -1.35, z: -2.60 }, { x: 1.35, z: -2.60 },
      { x: -1.90, z: 0.30 }, { x: 1.90, z: 0.30 },
    ],
    // 靶組排成弧形護在王座前
    targets: [
      { x: -1.45, z: -4.05 }, { x: -0.75, z: -4.45 }, { x: 0, z: -4.60 },
      { x: 0.75, z: -4.45 }, { x: 1.45, z: -4.05 },
    ],
    sideTargets: [ { x: -2.88, z: -2.55 }, { x: 2.30, z: -2.55 }, { x: -2.88, z: 1.15 }, { x: 2.30, z: 1.15 } ],
    laneLetters: ['K', 'I', 'N', 'G'],
    spinners: [ { x: -2.88, z: -0.45 } ],
    saucers: [ { x: -2.30, z: -3.75 }, { x: 2.25, z: -3.75 } ],
    posts: [ { x: -0.62, z: -0.55 }, { x: 0.62, z: -0.55 }, { x: -1.70, z: 1.60 }, { x: 1.70, z: 1.60 } ],
    rollovers: [ { x: -1.15, z: 4.5 }, { x: 1.15, z: 4.5 }, { x: -0.70, z: 4.15 }, { x: 0.70, z: 4.15 } ],
  },
];

export const BOSS = { name: '虛空棋主', emoji: '♚', color: 0xff3d6e, r: 0.55, x: 0, z: -4.35 };

// 頂部滾道（rollover lane）：3~4 條由分隔牆形成的通道
export const LANE = { z: -5.45, wallZ0: -6.15, wallZ1: -4.95 };

// ===== 高架軌道（ramp）=====
// 從彈射板打上入口 → 爬升繞行 → 從另一側出口落回檯面。
// path 的 y 是離檯面的高度；速度不足會在半途滑回入口。

// 台一：左右各一條大迴廊，互相鏡像交叉
const RAMPS_A = [
  {
    id: 'left', name: '星軌迴廊', color: 0x35d6ff,
    entryDir: { x: -0.32, z: -0.95 },
    minSpeed: 13, climbDrag: 0.55, exitSpeed: 7,
    path: [
      { x: -1.62, z: 1.30, y: 0.00 }, { x: -2.05, z: 0.35, y: 0.26 },
      { x: -2.42, z: -0.85, y: 0.58 }, { x: -2.58, z: -2.20, y: 0.82 },
      { x: -2.34, z: -3.55, y: 0.96 }, { x: -1.62, z: -4.75, y: 1.02 },
      { x: -0.45, z: -5.42, y: 1.00 }, { x: 0.80, z: -5.20, y: 0.92 },
      { x: 1.72, z: -4.35, y: 0.74 }, { x: 2.10, z: -3.20, y: 0.48 },
      { x: 2.14, z: -2.15, y: 0.16 }, { x: 2.08, z: -1.62, y: 0.00 },
    ],
    exitDir: { x: -0.15, z: 0.99 },
  },
  {
    id: 'right', name: '裂縫迴廊', color: 0xff5e8a,
    entryDir: { x: 0.32, z: -0.95 },
    minSpeed: 13, climbDrag: 0.55, exitSpeed: 7,
    path: [
      { x: 1.62, z: 1.30, y: 0.00 }, { x: 2.02, z: 0.40, y: 0.26 },
      { x: 2.30, z: -0.70, y: 0.56 }, { x: 2.42, z: -2.00, y: 0.80 },
      { x: 2.20, z: -3.40, y: 0.96 }, { x: 1.50, z: -4.65, y: 1.04 },
      { x: 0.30, z: -5.40, y: 1.06 }, { x: -0.95, z: -5.25, y: 1.00 },
      { x: -1.90, z: -4.40, y: 0.82 }, { x: -2.30, z: -3.30, y: 0.56 },
      { x: -2.40, z: -2.30, y: 0.24 }, { x: -2.44, z: -1.75, y: 0.00 },
    ],
    exitDir: { x: 0.12, z: 0.99 },
  },
];

// 台二：一條中央直衝軌道 + 一條左側折返軌道（球從同側回來）
const RAMPS_B = [
  {
    id: 'center', name: '資料主幹道', color: 0x35d6ff,
    entryDir: { x: 0.06, z: -1.0 },
    minSpeed: 15, climbDrag: 0.62, exitSpeed: 8,
    path: [
      { x: -0.35, z: 1.55, y: 0.00 }, { x: -0.28, z: 0.30, y: 0.30 },
      { x: -0.20, z: -1.10, y: 0.64 }, { x: -0.15, z: -2.60, y: 0.92 },
      { x: 0.35, z: -4.10, y: 1.08 }, { x: 1.55, z: -5.05, y: 1.06 },
      { x: 2.35, z: -4.30, y: 0.86 }, { x: 2.60, z: -3.05, y: 0.56 },
      { x: 2.55, z: -1.95, y: 0.22 }, { x: 2.42, z: -1.30, y: 0.00 },
    ],
    exitDir: { x: -0.25, z: 0.97 },
  },
  {
    id: 'loop', name: '迴圈折返道', color: 0xc77dff,
    entryDir: { x: -0.42, z: -0.91 },
    minSpeed: 12, climbDrag: 0.5, exitSpeed: 6.5,
    path: [
      { x: -1.72, z: 1.20, y: 0.00 }, { x: -2.28, z: 0.20, y: 0.28 },
      { x: -2.62, z: -1.10, y: 0.60 }, { x: -2.45, z: -2.45, y: 0.82 },
      { x: -1.70, z: -3.10, y: 0.86 }, { x: -1.05, z: -2.45, y: 0.72 },
      { x: -1.10, z: -1.10, y: 0.44 }, { x: -1.35, z: 0.10, y: 0.16 },
      { x: -1.45, z: 0.85, y: 0.00 },
    ],
    exitDir: { x: 0.35, z: 0.94 },
  },
];

// 台三：三條軌道（左、右、中央短跳台），最擁擠
const RAMPS_C = [
  {
    id: 'left', name: '熔岩坡道', color: 0xffa23d,
    entryDir: { x: -0.30, z: -0.95 },
    minSpeed: 12.5, climbDrag: 0.52, exitSpeed: 7,
    path: [
      { x: -1.58, z: 1.35, y: 0.00 }, { x: -2.10, z: 0.30, y: 0.30 },
      { x: -2.55, z: -1.05, y: 0.66 }, { x: -2.60, z: -2.60, y: 0.92 },
      { x: -2.05, z: -3.95, y: 1.04 }, { x: -0.95, z: -4.85, y: 1.06 },
      { x: 0.25, z: -4.55, y: 0.94 }, { x: 0.85, z: -3.45, y: 0.66 },
      { x: 0.95, z: -2.40, y: 0.34 }, { x: 0.90, z: -1.80, y: 0.00 },
    ],
    exitDir: { x: 0.05, z: 0.99 },
  },
  {
    id: 'right', name: '黃金鎖鍊道', color: 0xffd75e,
    entryDir: { x: 0.30, z: -0.95 },
    minSpeed: 12.5, climbDrag: 0.52, exitSpeed: 7,
    path: [
      { x: 1.58, z: 1.35, y: 0.00 }, { x: 2.10, z: 0.30, y: 0.30 },
      { x: 2.50, z: -1.05, y: 0.66 }, { x: 2.55, z: -2.60, y: 0.92 },
      { x: 2.00, z: -3.95, y: 1.04 }, { x: 0.90, z: -4.85, y: 1.06 },
      { x: -0.30, z: -4.55, y: 0.94 }, { x: -0.90, z: -3.45, y: 0.66 },
      { x: -1.00, z: -2.40, y: 0.34 }, { x: -0.95, z: -1.80, y: 0.00 },
    ],
    exitDir: { x: -0.05, z: 0.99 },
  },
  {
    id: 'jump', name: '王座跳台', color: 0xff5e3d,
    entryDir: { x: 0, z: -1.0 },
    minSpeed: 17, climbDrag: 0.78, exitSpeed: 10,
    path: [
      { x: 0, z: 2.10, y: 0.00 }, { x: 0, z: 1.00, y: 0.42 },
      { x: 0, z: -0.20, y: 0.78 }, { x: 0, z: -1.45, y: 0.96 },
      { x: 0, z: -2.55, y: 0.72 }, { x: 0, z: -3.35, y: 0.30 },
      { x: 0, z: -3.80, y: 0.00 },
    ],
    exitDir: { x: 0, z: -1.0 },   // 直接把球射向棋主
  },
];

export const STAGE_RAMPS = [RAMPS_A, RAMPS_B, RAMPS_C];
