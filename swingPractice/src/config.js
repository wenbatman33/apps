// ============ 全域參數（DEV 工具可即時覆寫；存 localStorage） ============
// 座標系：本壘板 = 原點 (0,0,0)；中外野方向 = +Z；一壘側 = +X；三壘側 = -X
// 單位：公尺 / 秒

export const FIELD = {
  moundZ: 18.44,        // 投手丘距本壘
  releaseY: 1.34,       // 出手高度（Q 版身高 1.52m ＋ 投手丘 0.3m）
  releaseX: 0.28,       // 出手橫向偏移（右投：投手面向 -z，右手在世界 +x 側）
  plateY: 0.78,         // 通過本壘的平均高度（對齊 Q 版打者揮棒時球棒掃過的高度）
  contactZ: 0.35,       // 理想擊球點（本壘板前方一點）
  wallL: 100,           // 左外野角落全壘打牆距離
  wallC: 122,           // 中外野
  wallH: 3.6,           // 牆高
};

// 物理（可調）
export const PHYS = {
  g: 9.81,
  drag: 0.0052,         // 空氣阻力係數 k：a_drag = -k*v*|v|
  lift: 0.0016,         // 後旋升力（簡化：與水平速度平方成正比的向上分量）
  windX: 0,             // 側風
  windZ: 0,             // 順/逆風（+ = 助飛）
};

// 揮棒判定（時間誤差，單位毫秒）
export const SWING = {
  perfect: 30,
  good: 62,
  ok: 105,
  poor: 165,            // 超過 = 揮空
  // 按下到棒頭進入擊球區的延遲。必須等於「揮棒動畫跑到接觸幀」的時間
  // （contactAt / swingSpeed = 0.42 / 2.6 ≈ 162ms），否則畫面與判定會錯開
  barrelDelay: 162,
  swingSpeed: 2.6,      // 揮棒動畫速度（越小越慢、越看得清楚出棒）
  assistBonus: 1.18,    // 輔助模式的判定窗口放大倍率
  powerWindow: 0.74,    // 強打模式窗口縮小倍率
  powerVelo: 1.13,      // 強打模式初速加成
};

// 擊球初速（m/s）：由 quality(0~1) 內插
export const HIT = {
  veloMin: 22,
  veloMax: 50,
  veloCurve: 1.15,      // >1 = 時機略差初速就掉得快（拉開 PERFECT 與 GOOD 的差距）
  angleBest: 29,        // PERFECT 的最佳仰角
  angleSpread: 26,      // 品質下降時仰角亂度
  sprayK: 0.28,         // 時間誤差 → 水平噴射角（度/ms）
  spraySpread: 6,       // 隨機噴散
};

// 難度
export const DIFF = {
  easy:   { label:'新手',   speedKmh:[105,118], pitches:['fast','fast','change'],           windowScale:1.35, breakScale:0.5 },
  normal: { label:'職業',   speedKmh:[125,142], pitches:['fast','fast','curve','change','slider'], windowScale:1.0,  breakScale:1.0 },
  hard:   { label:'大聯盟', speedKmh:[140,159], pitches:['fast','curve','slider','change','fast'], windowScale:0.78, breakScale:1.35 },
};

// 球種：速度倍率 / 橫向位移 / 縱向位移（到本壘時的偏移，公尺）
export const PITCH = {
  fast:   { name:'速球',   cn:'FASTBALL', spdMul:1.00, bx:  0.00, by: 0.10, color:0xff5f6d },
  curve:  { name:'曲球',   cn:'CURVE',    spdMul:0.84, bx: -0.34, by:-0.62, color:0x5ec8ff },
  slider: { name:'滑球',   cn:'SLIDER',   spdMul:0.91, bx:  0.46, by:-0.22, color:0x9d7bff },
  change: { name:'變速球', cn:'CHANGEUP', spdMul:0.79, bx:  0.12, by:-0.34, color:0x5dffa0 },
};

// 節奏（DEV 可調）：每球之間留出喘息時間，不要打完馬上又要揮棒
export const PACE = {
  firstBall: 2.2,       // 開局第一球前的等待
  afterPlay: 3.2,       // 一般結果後到下一球
  afterHR: 4.6,         // 全壘打後（讓歡呼與鏡頭走完）
  windupSpeed: 0.58,    // 投手預備動作速度（越小越慢）
  countdown: 1.9,       // 顯示倒數提示的秒數（要短於 afterPlay - 結果字停留時間，避免重疊）
  flightSpeed: 2.9,     // 擊出後的播放倍速（真實滯空 6 秒太拖，只加快播放不改物理結果）
  swingHold: 0.52,      // 擊中後鏡頭停在打擊視角的秒數（看完揮棒動作再追球）
  hitstop: 0.075,       // 擊中瞬間的畫面凍結（動作遊戲的打擊感來源）
  windupSpeedSlow: 0.58,
};

// 相機（DEV 可調）
export const CAM = {
  // 打擊視角：打者近景、鏡頭低而平、視線直看投手（打者會落在畫面右側）
  // batY 要明顯高過打者頭頂(1.49)，否則揮棒時球棒整支被身體擋住
  batX: 0.52, batY: 1.78, batZ: -3.15,
  batLookX: 0.02, batLookY: 1.00, batLookZ: 16,
  portraitX: -0.58, portraitY: 0.30, portraitZ: -1.5,   // 直屏視野窄，退後並把打者往畫面內帶
  fov: 52, fovMobile: 62,
  followLerp: 0.09,
  shake: 1.15,          // 擊中的鏡頭震動
  hitZoom: 6,           // 擊中瞬間的 FOV 縮進（衝擊感）
  showCatcher: 0,                      // 0 = 不顯示捕手與裁判（會擋住近景視角）
};

// UI 版面（DEV 可調位置的元素）
export const LAYOUT = {
  hudTopY: 10, outsY: 64, hintY: 96, timingBottom: 120, swingSize: 104,
};

// ---------- localStorage 覆寫 ----------
const KEY = 'swing_tune_v1';
const TABLES = { FIELD, PHYS, SWING, HIT, CAM, LAYOUT, PACE };

export function loadTune(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (const t in raw) if (TABLES[t]) Object.assign(TABLES[t], raw[t]);
  }catch(e){}
}
export function saveTune(){
  const out = {};
  for (const t in TABLES) out[t] = { ...TABLES[t] };
  localStorage.setItem(KEY, JSON.stringify(out));
  return out;
}
export function resetTune(){ localStorage.removeItem(KEY); location.reload(); }
export function tuneTables(){ return TABLES; }
