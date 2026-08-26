// 全域设置：色票、规则参数、PC / Mobile 版面
// 版面数值可由 DEV 工具（按 D）即时微调并导出

export const COLORS = {
  bg: 0x0b0b0f,
  panel: 0x1b1c1d,
  panelDeep: 0x141516,
  panelLine: 0x2c2d30,
  text: 0xffffff,
  textDim: 0x9ea0a3,
  textFaint: 0x7b7d80,
  green: 0x28a909,
  greenLight: 0x34c60c,
  greenDark: 0x1f8508,
  red: 0xe21c3d,
  redLight: 0xff3b57,
  orange: 0xd07206,
  orangeLight: 0xf3901c,
  cyan: 0x34b4ff,
  purple: 0x913ef8,
  pink: 0xc017b4,
  gold: 0xffd60a,
  curve: 0xe50539,
  curveFill: 0xff2c55,
};

// 规则（对齐 SPRIBE Aviator / DS 站台限额）
export const RULES = {
  rtp: 0.97,             // 官方 RTP 97%
  minBet: 3,             // 最小投注 NT$3
  maxBet: 3000,          // 最大投注 NT$3,000
  maxWinPerBet: 300000,  // 每注奖金上限 NT$300,000
  maxMultiplier: 100000, // 最大倍率 100,000x
  quickBets: [10, 20, 50, 100],
  startBalance: 10000,
  bettingMs: 5000,       // 起飞前下注时间
  crashedMs: 3000,       // 飞走后停留时间
  growth: 0.0865,        // 倍数成长系数 m = e^(growth * t)
  reachMs: 3200,         // 飞机爬升到巡航位置所需时间
  historyMax: 30,
};

// 倍数 → 颜色（Aviator 历史胶囊配色）
export function multColor(m) {
  if (m < 2) return COLORS.cyan;
  if (m < 10) return COLORS.purple;
  return COLORS.pink;
}

// ── 版面（可由 DEV 工具调整）─────────────────────────────
// 所有数值皆为「设计坐标」，场景会依窗口大小自动缩放/伸展

export const LAYOUT_PC = {
  designW: 1280,
  designH: 800,
  topbarH: 46,
  historyH: 40,
  sideW: 320,
  gap: 10,
  betPanelH: 190,
  // 游戏画布内的飞机巡航位置（比例）
  planeX: 0.74,
  planeY: 0.30,
  planeScale: 0.30,
  originX: 0.055,
  originY: 0.90,
  multSize: 82,
  multY: 0.37,
  statusSize: 20,
  betBtnH: 66,
  amountH: 40,
  quickH: 26,
  feedRowH: 30,
};

export const LAYOUT_MOBILE = {
  designW: 420,
  designH: 860,
  topbarH: 42,
  historyH: 34,
  sideW: 0,
  gap: 8,
  betPanelH: 150,
  planeX: 0.70,
  planeY: 0.27,
  planeScale: 0.24,
  originX: 0.07,
  originY: 0.88,
  multSize: 50,
  multY: 0.46,
  statusSize: 15,
  betBtnH: 56,
  amountH: 34,
  quickH: 24,
  feedRowH: 28,
};

export function pickLayout(w, h) {
  const mobile = w < 900 || w / h < 1.1;
  return { mobile, L: { ...(mobile ? LAYOUT_MOBILE : LAYOUT_PC) } };
}

export const FONT = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "PingFang TC", "Segoe UI", Roboto, sans-serif';
