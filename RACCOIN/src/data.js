// ============ 遊戲資料定義 ============

// 可被 DEV 工具即時調整的版面與物理參數
export const LAYOUT = {
  cameraPC:     { x: 0, y: 8.2, z: 10.2, fov: 42, lookY: 0.4, lookZ: -1.0 },
  cameraMobile: { x: 0, y: 12.0, z: 8.6, fov: 52, lookY: 0.0, lookZ: -0.8 },
  machine: {
    floorW: 7.0,        // 機台內部寬
    floorBackZ: -5.2,   // 後牆
    floorFrontZ: 2.4,   // 前緣（得分掉落）
    pusherDepth: 3.6,   // 推板深度
    pusherH: 1.15,      // 推板高（上層平台面）
    pusherMinZ: -3.9,   // 推板前緣最小 z
    pusherRange: 2.6,   // 推板行程
    pusherPeriod: 3.6,  // 推板往返秒數
    dropZ: -2.35,       // 投幣落點 z
    dropY: 5.2,         // 投幣高度
    aimMaxX: 2.9,       // 瞄準左右極限
    notchR: 1.15,       // 推板前緣中央的半圓凹口半徑（凹字形）
    fieldFrontW: 9.2,   // 檯面前緣寬度（下方開口較大的梯形）
    towerEveryMin: 14,  // 不定時出塔：最短間隔（秒）
    towerEveryMax: 28,  // 不定時出塔：最長間隔（秒）
    towerSizeMin: 14,   // 一座塔最少幾枚
    towerSizeMax: 26,   // 一座塔最多幾枚
  },
  physics: {
    gravity: -22,
    coinRadius: 0.44,
    coinHeight: 0.11,
    coinMass: 1.0,
    friction: 0.3,
    floorFriction: 0.16,
    restitution: 0.05,
    linearDamping: 0.12,
    maxCoins: 150,
  },
  game: {
    comboWindow: 2.5,       // 連擊維持秒數
    insertCooldown: 0.22,   // 投幣冷卻
    wheelTh1: 8, wheelTh2: 20, wheelTh3: 40,  // 輪盤能量門檻
    convRate: 0.2,          // 分數→票券轉換率
    exchangeYield: 25,      // 每次兌換給的硬幣數
    regenSec: 2.5,          // 手持硬幣自動回充間隔（秒）
    regenCap: 60,           // 自動回充上限
  },
  hud: { hudTop:{x:0,y:0}, hudLeft:{x:0,y:0}, hudRight:{x:0,y:0}, hudBottom:{x:0,y:0} },
};

export const RARITY = {
  common: { name:'普通', color:'#cfd8ea' },
  rare:   { name:'稀有', color:'#6bb8ff' },
  scarce: { name:'罕見', color:'#c08dff' },
  epic:   { name:'史詩', color:'#ffd23f' },
  bad:    { name:'負面', color:'#ff5252' },
};

// ---- 硬幣定義 ----
// kind: normal(普通) / special(特殊) / bad(負面)
// tags: animal, plant, economic ...
export const COIN_DEFS = {
  copper: { id:'copper', kind:'normal', name:'銅幣', icon:'🪙', color:'#c47a3d', value:1, rarity:'common', desc:'最基本的硬幣。' },
  silver: { id:'silver', kind:'normal', name:'銀幣', icon:'🪙', color:'#c8d0dc', value:5, rarity:'common', desc:'價值 5 的普通硬幣。' },
  gold:   { id:'gold',   kind:'normal', name:'金幣', icon:'🪙', color:'#ffd23f', value:25, rarity:'rare', desc:'價值 25 的高級硬幣。' },

  ticket: { id:'ticket', kind:'special', name:'票券幣', icon:'🎟️', color:'#ff8de0', value:3, rarity:'common', price:15, tags:['economic'],
    desc:'得分時額外獲得 +6 🎟️票券。' },
  sticky: { id:'sticky', kind:'special', name:'黏著幣', icon:'🍯', color:'#e8a33d', value:4, rarity:'common', price:12,
    desc:'得分時把附近 3 枚硬幣往前拖動。' },
  bomb:   { id:'bomb', kind:'special', name:'炸彈幣', icon:'💣', color:'#5a5f6e', value:2, rarity:'common', price:18,
    desc:'落地 1.5 秒後，被碰撞就爆炸，把周圍硬幣往前炸飛（可摧毀負面幣）。' },
  giant:  { id:'giant', kind:'special', name:'巨大幣', icon:'🟤', color:'#a86a2f', value:15, rarity:'common', price:20, radiusScale:1.7, massScale:4,
    desc:'超大超重，推力驚人，價值 15。' },
  magnet: { id:'magnet', kind:'special', name:'磁鐵幣', icon:'🧲', color:'#e04f4f', value:6, rarity:'rare', price:22,
    desc:'每 2 秒把附近硬幣吸向自己，形成硬幣團。' },
  clone:  { id:'clone', kind:'special', name:'複製幣', icon:'🪞', color:'#9fd8ff', value:8, rarity:'rare', price:30,
    desc:'得分時在機台上複製一枚自己（最多傳兩代）。' },
  double: { id:'double', kind:'special', name:'加倍幣', icon:'✖️', color:'#ff6bd6', value:5, rarity:'rare', price:35, tags:['economic'],
    desc:'得分時「永久」提高全域得分倍率 +0.15。' },
  rabbit: { id:'rabbit', kind:'special', name:'兔子幣', icon:'🐰', color:'#f2e3d5', value:3, rarity:'common', price:16, tags:['animal'],
    desc:'兩枚兔子幣碰撞會繁殖出小兔子（有冷卻，全場上限 12 隻）。' },
  wolf:   { id:'wolf', kind:'special', name:'狼幣', icon:'🐺', color:'#7d8aa0', value:6, rarity:'rare', price:25, tags:['animal','predator'],
    desc:'捕食碰到的其他動物幣：吃掉後自身價值增加，並產出一枚肥料幣。' },
  fert:   { id:'fert', kind:'special', name:'肥料幣', icon:'💩', color:'#8a6a3a', value:2, rarity:'common', price:8, tags:['plantfood'],
    desc:'種子幣的養分。價值 2。' },
  seed:   { id:'seed', kind:'special', name:'種子幣', icon:'🌱', color:'#7ac96f', value:4, rarity:'rare', price:14, tags:['plant'],
    desc:'吸收 3 次水滴/肥料後長成硬幣樹：直接得分 +30 並掉出 3 枚金幣。' },
  water:  { id:'water', kind:'special', name:'水滴幣', icon:'💧', color:'#6bc7ff', value:2, rarity:'common', price:10, tags:['plantfood'],
    desc:'種子幣的水分。價值 2。' },
  laser:  { id:'laser', kind:'special', name:'雷射幣', icon:'🔫', color:'#ff4f9e', value:5, rarity:'scarce', price:28,
    desc:'投入瞬間發射雷射，直接讓同一直線上最多 4 枚硬幣立刻得分。' },
  ret:    { id:'ret', kind:'special', name:'回歸幣', icon:'🔁', color:'#8f6bff', value:12, rarity:'rare', price:26,
    desc:'價值 12；得分後 70% 機率回到特殊硬幣夾。' },
  tornado:{ id:'tornado', kind:'special', name:'龍捲風幣', icon:'🌪️', color:'#9fb8c8', value:3, rarity:'rare', price:24,
    desc:'落地 3 秒後捲起龍捲風，把周圍硬幣攪往前方，然後消失。' },
  cleaner:{ id:'cleaner', kind:'special', name:'清除幣', icon:'🧹', color:'#b8e0a0', value:4, rarity:'common', price:18,
    desc:'碰到負面幣就將其清除並 +10 🎟️（一次性）。' },
  nuke:   { id:'nuke', kind:'special', name:'核爆幣', icon:'☢️', color:'#d9ff5a', value:10, rarity:'epic', price:60,
    desc:'得分時引發核爆：全場硬幣被往前狂推，直接得分 +50，摧毀所有負面幣。' },

  rust:   { id:'rust', kind:'bad', name:'鏽蝕幣', icon:'🦠', color:'#6a4a3a', value:0, rarity:'bad',
    desc:'碰到的硬幣價值減半（每枚只會被鏽一次）。推下去清掉它！' },
  stone:  { id:'stone', kind:'bad', name:'石頭幣', icon:'🪨', color:'#616a75', value:0, rarity:'bad', massScale:3, radiusScale:1.25,
    desc:'又重又沒價值，佔位子擋路。' },
  thief:  { id:'thief', kind:'bad', name:'小偷幣', icon:'🦹', color:'#3a3550', value:0, rarity:'bad',
    desc:'落入得分區時偷走 15 🎟️票券。用爆炸摧毀它就不會被偷。' },
  curse:  { id:'curse', kind:'bad', name:'詛咒幣', icon:'👻', color:'#5a4a7a', value:0, rarity:'bad',
    desc:'停留在機台上時，全域得分倍率 −10%。' },
  tax:    { id:'tax', kind:'bad', name:'稅務幣', icon:'📛', color:'#8a3a3a', value:0, rarity:'bad',
    desc:'停留在機台上時，兌換成本 +50%。' },
};

export const SHOP_COIN_POOL = ['ticket','sticky','bomb','giant','magnet','clone','double','rabbit','wolf','fert','seed','water','laser','ret','tornado','cleaner','nuke'];
export const RARITY_WEIGHT = { common: 50, rare: 30, scarce: 15, epic: 5 };

// ---- 晶片定義 ----
export const CHIP_DEFS = {
  chip_rate:   { id:'chip_rate',   name:'得分晶片', icon:'📈', rarity:'rare',  price:40, desc:'全域得分倍率 +0.2。' },
  chip_combo:  { id:'chip_combo',  name:'連擊晶片', icon:'⏱️', rarity:'common',price:30, desc:'連擊維持時間 +1.2 秒。' },
  chip_wheel:  { id:'chip_wheel',  name:'輪盤晶片', icon:'🎡', rarity:'rare',  price:35, desc:'幸運輪盤獎勵數量 +1。' },
  chip_start:  { id:'chip_start',  name:'開場晶片', icon:'🌅', rarity:'common',price:25, desc:'每回合開始 +8 枚手持硬幣。' },
  chip_shop:   { id:'chip_shop',   name:'折扣晶片', icon:'🏷️', rarity:'rare',  price:35, desc:'商店價格 −20%。' },
  chip_exch:   { id:'chip_exch',   name:'兌換晶片', icon:'🔄', rarity:'common',price:28, desc:'兌換成本 −30%。' },
  chip_boom:   { id:'chip_boom',   name:'爆破晶片', icon:'🧨', rarity:'rare',  price:32, desc:'所有爆炸威力與範圍 +50%。' },
  chip_ticket: { id:'chip_ticket', name:'售票晶片', icon:'🎫', rarity:'common',price:30, desc:'每回合結束 +12 🎟️票券。' },
};

// ---- 主動道具定義 ----
export const PRIZE_DEFS = {
  p_shake:  { id:'p_shake',  name:'機台震動器', icon:'📳', price:25, uses:3, desc:'猛烈震動機台，所有硬幣位移。' },
  p_bomb:   { id:'p_bomb',   name:'遙控炸彈', icon:'💥', price:30, uses:2, desc:'在機台中央引爆，把硬幣往前炸。' },
  p_freeze: { id:'p_freeze', name:'冰凍器', icon:'🧊', price:28, uses:2, desc:'推板暫停 6 秒，方便堆疊佈局。' },
  p_magnet: { id:'p_magnet', name:'超級磁鐵', icon:'🧲', price:35, uses:2, desc:'3 秒內把全場硬幣往得分區吸。' },
  p_clean:  { id:'p_clean',  name:'清除器', icon:'🧹', price:22, uses:2, desc:'移除一枚負面幣。' },
  p_copy:   { id:'p_copy',   name:'複製機', icon:'🖨️', price:45, uses:1, desc:'隨機複製機台上的一枚特殊幣。' },
};

// ---- 輪盤獎勵 ----
export const WHEEL_REWARDS = [
  { id:'coinRain',   name:'銅幣雨',   icon:'🌧️', weight:22, minLv:1 },
  { id:'silverRain', name:'銀幣雨',   icon:'✨',  weight:14, minLv:1 },
  { id:'handCoins',  name:'額外投幣', icon:'🪙',  weight:16, minLv:1 },
  { id:'tickets',    name:'額外票券', icon:'🎟️', weight:16, minLv:1 },
  { id:'tower',      name:'硬幣塔',   icon:'🗼', weight:10, minLv:2 },
  { id:'prizeBall',  name:'獎品球',   icon:'🎁', weight:9,  minLv:2 },
  { id:'empower',    name:'全場強化', icon:'💪', weight:8,  minLv:2 },
  { id:'wheel2',     name:'二階輪盤', icon:'🎡', weight:5,  minLv:1 },
];

// ---- 回合目標曲線（基準 100 分）----
export const ROUND_CURVE = [1, 1.4, 1.8, 2.5, 3.2, 4.0, 5.5, 7.5, 9.5, 12, 16, 22, 35, 60, 100];
export const BASE_TARGET = 80;
export const TOTAL_ROUNDS = 15;
export const ENDLESS_MULT = 1.8;

// ---- 難度 ----
export const DIFFICULTIES = [
  { id:0, name:'輕鬆', targetMult:1.0,  badStartRound:6, badPerRound:1, shopMult:1.0,  startCoins:70 },
  { id:1, name:'標準', targetMult:1.35, badStartRound:4, badPerRound:1, shopMult:1.15, startCoins:60 },
  { id:2, name:'困難', targetMult:1.8,  badStartRound:2, badPerRound:2, shopMult:1.3,  startCoins:50 },
];

export const BAD_POOL = ['rust','stone','thief','curse','tax'];

// ---- 角色 ----
export const CHARACTER = {
  id:'raccoon_manager', name:'浣熊店長', avatar:'🦝',
  passive:'每回合結束 +8 🎟️；兌換成本 −10%',
  startTickets:30, startClip:['ticket'], clipCap:5,
  endRoundTickets:8, exchangeDiscount:0.9,
};
