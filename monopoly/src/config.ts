// 遊戲常數配置

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

// 馬卡龍色系
export const COLORS = {
  // 主色
  softBlue: 0x5B9BD5,
  mintGreen: 0x7ED6A0,
  warmOrange: 0xF5A623,
  // 強調色
  sakuraPink: 0xFFB7C5,
  lightPurple: 0xB8A9E8,
  lemonYellow: 0xFFE066,
  // 中性色
  creamWhite: 0xFFF8F0,
  lightGray: 0xE8E4E0,
  darkBrown: 0x4A3728,
  // 功能色
  coralRed: 0xFF6B6B,
  successGreen: 0x5BBF8A,
  // 背景
  skyTop: 0xB3E5FC,
  skyBottom: 0xE1F5FE,
};

// 格子類型定義
export enum TileType {
  Coin = 'coin',
  Property = 'property',
  Chest = 'chest',
  Chance = 'chance',
  Shield = 'shield',
  Raid = 'raid',
  Event = 'event',
}

// 格子配置
export interface TileConfig {
  type: TileType;
  emoji: string;
  color: number;
  label: string;
}

export const TILE_CONFIGS: Record<TileType, TileConfig> = {
  [TileType.Coin]: { type: TileType.Coin, emoji: '💰', color: 0xFFD700, label: '金幣' },
  [TileType.Property]: { type: TileType.Property, emoji: '🏠', color: 0x5B9BD5, label: '物業' },
  [TileType.Chest]: { type: TileType.Chest, emoji: '💎', color: 0xB8A9E8, label: '寶箱' },
  [TileType.Chance]: { type: TileType.Chance, emoji: '❓', color: 0xF5A623, label: '機會' },
  [TileType.Shield]: { type: TileType.Shield, emoji: '🛡️', color: 0x7ED6A0, label: '防護' },
  [TileType.Raid]: { type: TileType.Raid, emoji: '👊', color: 0xFF6B6B, label: '突襲' },
  [TileType.Event]: { type: TileType.Event, emoji: '⭐', color: 0xFFE066, label: '特殊' },
};

// 棋盤格子分佈（20格）
export const BOARD_LAYOUT: TileType[] = [
  TileType.Coin, TileType.Property, TileType.Coin, TileType.Chance,
  TileType.Coin, TileType.Chest, TileType.Coin, TileType.Property,
  TileType.Raid, TileType.Coin, TileType.Event, TileType.Coin,
  TileType.Property, TileType.Chance, TileType.Coin, TileType.Shield,
  TileType.Coin, TileType.Property, TileType.Raid, TileType.Chance,
];

// 棋盤參數
export const BOARD = {
  tileCount: 20,
  tileSize: 44,
  centerX: GAME_WIDTH / 2,
  centerY: 460,
  radiusX: 155,
  radiusY: 120,
};

// 骰子參數
export const DICE = {
  size: 56,
  gap: 20,
  areaY: 650,
  rollDuration: 1000,
  maxDice: 200,
  startDice: 100,
};

// Token 參數
export const TOKEN = {
  size: 30,
  hopHeight: 22,
  hopDuration: 180,
  emoji: '🐱',
};

// 倍率選項
export const MULTIPLIERS = [1, 2, 5, 10];

// 金幣獎勵範圍（基礎值，會乘以倍率）
export const REWARDS = {
  coin: { min: 50, max: 200 },
  chest: { min: 100, max: 500 },
  raid: { min: 200, max: 800 },
};

// UI 尺寸
export const UI = {
  topBarHeight: 56,
  bottomNavHeight: 65,
  diceButtonSize: 100,
  diceButtonY: 740,
  multiplierY: 690,
};
