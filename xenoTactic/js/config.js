// =====================
// GAME DIMENSIONS
// =====================
const CELL_SIZE = 44;
const GRID_COLS = 20;
const GRID_ROWS = 13;
const PANEL_WIDTH = 230;
const HUD_HEIGHT = 55;
const GRID_OFFSET_X = 0;
const GRID_OFFSET_Y = HUD_HEIGHT;

const GAME_WIDTH = GRID_COLS * CELL_SIZE + PANEL_WIDTH;   // 880 + 230 = 1110
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE + HUD_HEIGHT;  // 572 + 55 = 627

// Entry: left middle, Exit: right middle
const ENTRY = { col: 0, row: 6 };
const EXIT  = { col: GRID_COLS - 1, row: 6 };

// =====================
// TOWER DEFINITIONS
// =====================
const TOWER_DEFS = {
  VULCAN: {
    key: 'VULCAN', name: 'Vulcan', cost: 15,
    damage: 8, range: 2.5, fireRate: 350, bulletSpeed: 220,
    targets: ['ground'], color: 0x9999aa, barrelColor: 0x666677,
    desc: 'Fast, low damage', sellRatio: 0.5
  },
  PLASMA: {
    key: 'PLASMA', name: 'Plasma', cost: 100,
    damage: 95, range: 3.2, fireRate: 2200, bulletSpeed: 200,
    targets: ['ground'], color: 0xff5500, barrelColor: 0xff9900,
    desc: 'High dmg, slow fire', sellRatio: 0.5
  },
  SAM: {
    key: 'SAM', name: 'SAM', cost: 60,
    damage: 38, range: 3.5, fireRate: 900, bulletSpeed: 260,
    targets: ['ground'], color: 0x00bb55, barrelColor: 0x00ff77,
    desc: 'Effective vs groups', sellRatio: 0.5
  },
  DCA: {
    key: 'DCA', name: 'DCA', cost: 80,
    damage: 42, range: 4.5, fireRate: 500, bulletSpeed: 320,
    targets: ['air'], color: 0x4488ff, barrelColor: 0x88bbff,
    desc: 'ANTI-AIR only!', sellRatio: 0.5
  },
  FREEZE: {
    key: 'FREEZE', name: 'Freeze', cost: 50,
    damage: 3, range: 3.0, fireRate: 1200, bulletSpeed: 170,
    targets: ['ground'], color: 0x44ddff, barrelColor: 0x88eeff,
    slowFactor: 0.35, slowDuration: 2200,
    desc: 'Slows enemies', sellRatio: 0.5
  },
  SONIC: {
    key: 'SONIC', name: 'Sonic', cost: 75,
    damage: 25, range: 2.5, fireRate: 750, bulletSpeed: 0,
    targets: ['ground'], color: 0xffdd00, barrelColor: 0xffff66,
    aoe: true, aoeRadius: 1.8,
    desc: 'Area damage', sellRatio: 0.5
  }
};

// =====================
// ENEMY DEFINITIONS
// =====================
const ENEMY_DEFS = {
  BASIC: {
    name: 'Xenomorph', hp: 60, speed: 68, reward: 5,
    isFlying: false, color: 0x44dd44, size: 9
  },
  SPEED: {
    name: 'Runner', hp: 35, speed: 155, reward: 8,
    isFlying: false, color: 0xffee44, size: 7
  },
  ARMORED: {
    name: 'Tank', hp: 360, speed: 44, reward: 20,
    isFlying: false, color: 0x8899aa, size: 14
  },
  SLIME: {
    name: 'Slime', hp: 80, speed: 55, reward: 10,
    isFlying: false, color: 0x55ff88, size: 11,
    splitsOnDeath: true, splitCount: 2, splitHp: 30, splitSpeed: 70
  },
  FLYING: {
    name: 'Hornet', hp: 50, speed: 95, reward: 12,
    isFlying: true, color: 0xff88ff, size: 9
  },
  BOSS: {
    name: 'Queen', hp: 1200, speed: 30, reward: 60,
    isFlying: false, color: 0xff2222, size: 20, isBoss: true
  }
};

// =====================
// WAVE GENERATOR
// =====================
function generateWaves() {
  const w = [
    [{ t: 'BASIC',   n: 10 }],
    [{ t: 'BASIC',   n: 15 }],
    [{ t: 'BASIC',   n: 10 }, { t: 'SPEED',   n: 5  }],
    [{ t: 'BASIC',   n: 12 }, { t: 'SPEED',   n: 8  }],
    [{ t: 'BASIC',   n: 12 }, { t: 'ARMORED', n: 2  }],
    [{ t: 'SPEED',   n: 15 }, { t: 'ARMORED', n: 3  }],
    [{ t: 'FLYING',  n: 8  }, { t: 'BASIC',   n: 10 }],
    [{ t: 'FLYING',  n: 10 }, { t: 'SPEED',   n: 8  }, { t: 'ARMORED', n: 2 }],
    [{ t: 'SPEED',   n: 20 }, { t: 'FLYING',  n: 5  }],
    [{ t: 'BOSS',    n: 1  }, { t: 'BASIC',   n: 15 }, { t: 'FLYING',  n: 5 }],
    [{ t: 'SLIME',   n: 10 }, { t: 'BASIC',   n: 10 }],
    [{ t: 'SLIME',   n: 15 }, { t: 'FLYING',  n: 8  }],
    [{ t: 'ARMORED', n: 8  }, { t: 'SPEED',   n: 10 }, { t: 'FLYING',  n: 6 }],
    [{ t: 'BASIC',   n: 20 }, { t: 'SLIME',   n: 10 }, { t: 'FLYING',  n: 8 }],
    [{ t: 'BOSS',    n: 2  }, { t: 'ARMORED', n: 5  }, { t: 'FLYING',  n: 10}],
    [{ t: 'SPEED',   n: 30 }, { t: 'FLYING',  n: 10 }],
    [{ t: 'ARMORED', n: 10 }, { t: 'SLIME',   n: 15 }, { t: 'FLYING',  n: 8 }],
    [{ t: 'SLIME',   n: 20 }, { t: 'SPEED',   n: 15 }, { t: 'FLYING',  n: 10}],
    [{ t: 'ARMORED', n: 10 }, { t: 'BOSS',    n: 2  }, { t: 'FLYING',  n: 15}],
    [{ t: 'BOSS',    n: 3  }, { t: 'ARMORED', n: 15 }, { t: 'FLYING',  n: 20}, { t: 'SLIME', n: 10 }]
  ];

  return w.map((groups, wi) => {
    const list = [];
    for (const { t, n } of groups) for (let i = 0; i < n; i++) list.push(t);
    // Shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    const interval = Math.max(400, 1500 - wi * 55);
    return { enemies: list, interval, waveNum: wi + 1 };
  });
}

function getScaledHp(type, waveNum) {
  return Math.floor(ENEMY_DEFS[type].hp * (1 + (waveNum - 1) * 0.12));
}
