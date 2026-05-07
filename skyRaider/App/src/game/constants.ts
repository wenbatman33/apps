export const GAME_WIDTH = 432;
export const GAME_HEIGHT = 936;

export const WORLD = {
  left: 24,
  right: GAME_WIDTH - 24,
  top: 28,
  bottom: GAME_HEIGHT - 48,
};

export const DEPTH = {
  background: 0,
  enemy: 10,
  pickup: 12,
  bullet: 20,
  player: 30,
  vfx: 40,
  ui: 100,
};

export const EVENTS = {
  playerHit: 'player-hit',
  enemyKilled: 'enemy-killed',
  bossSpawned: 'boss-spawned',
  bossPhaseChanged: 'boss-phase-changed',
  stageCleared: 'stage-cleared',
  statsChanged: 'stats-changed',
} as const;
