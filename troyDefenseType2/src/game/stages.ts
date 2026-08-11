export type DefenderType = "paris" | "hector" | "cassandra";
export type EnemyKind = "raider" | "shield" | "achilles" | "horse";

export interface StageConfig {
  year: number;
  title: string;
  subtitle: string;
  duration: number;
  spawnDelay: number;
  hpMultiplier: number;
  speedMultiplier: number;
  shieldChance: number;
  boss: EnemyKind;
  bossHp: number;
  bossAt: number;
  startingCoins: number;
  tint: number;
}

export const STAGES: StageConfig[] = [
  {
    year: 1,
    title: "海岸烽火",
    subtitle: "守住第一批登陸的亞該亞先鋒",
    duration: 48,
    spawnDelay: 2700,
    hpMultiplier: 0.8,
    speedMultiplier: 0.82,
    shieldChance: 0,
    boss: "shield",
    bossHp: 330,
    bossAt: 12,
    startingCoins: 500,
    tint: 0xfff5df,
  },
  {
    year: 2,
    title: "城門初圍",
    subtitle: "敵軍開始輪番衝擊特洛伊外牆",
    duration: 52,
    spawnDelay: 2450,
    hpMultiplier: 0.93,
    speedMultiplier: 0.9,
    shieldChance: 0.08,
    boss: "shield",
    bossHp: 430,
    bossAt: 13,
    startingCoins: 480,
    tint: 0xffe7c2,
  },
  {
    year: 3,
    title: "銅盾軍陣",
    subtitle: "重盾兵壓低身形，開始掩護突進",
    duration: 55,
    spawnDelay: 2250,
    hpMultiplier: 1.02,
    speedMultiplier: 0.94,
    shieldChance: 0.24,
    boss: "shield",
    bossHp: 560,
    bossAt: 14,
    startingCoins: 470,
    tint: 0xffd9aa,
  },
  {
    year: 4,
    title: "瘟疫之夏",
    subtitle: "補給短缺，每次失守造成更大損傷",
    duration: 58,
    spawnDelay: 2150,
    hpMultiplier: 1.12,
    speedMultiplier: 0.98,
    shieldChance: 0.28,
    boss: "shield",
    bossHp: 650,
    bossAt: 15,
    startingCoins: 450,
    tint: 0xd8dfae,
  },
  {
    year: 5,
    title: "夜襲船營",
    subtitle: "高速夜襲隊從多條戰線同時逼近",
    duration: 60,
    spawnDelay: 1950,
    hpMultiplier: 1.18,
    speedMultiplier: 1.1,
    shieldChance: 0.24,
    boss: "shield",
    bossHp: 760,
    bossAt: 16,
    startingCoins: 450,
    tint: 0xc5c9e8,
  },
  {
    year: 6,
    title: "眾神風暴",
    subtitle: "敵軍攻勢加速，英雄技能成為關鍵",
    duration: 63,
    spawnDelay: 1825,
    hpMultiplier: 1.28,
    speedMultiplier: 1.04,
    shieldChance: 0.34,
    boss: "shield",
    bossHp: 870,
    bossAt: 17,
    startingCoins: 440,
    tint: 0xb9d5e6,
  },
  {
    year: 7,
    title: "河神怒濤",
    subtitle: "銅盾軍與先鋒混編，連續壓迫城門",
    duration: 66,
    spawnDelay: 1700,
    hpMultiplier: 1.38,
    speedMultiplier: 1.08,
    shieldChance: 0.44,
    boss: "shield",
    bossHp: 1000,
    bossAt: 18,
    startingCoins: 430,
    tint: 0xa8d3cf,
  },
  {
    year: 8,
    title: "英雄決鬥",
    subtitle: "阿基里斯親臨戰線，直取特洛伊城門",
    duration: 68,
    spawnDelay: 1625,
    hpMultiplier: 1.46,
    speedMultiplier: 1.12,
    shieldChance: 0.4,
    boss: "achilles",
    bossHp: 1280,
    bossAt: 20,
    startingCoins: 430,
    tint: 0xf2c3aa,
  },
  {
    year: 9,
    title: "破曉血戰",
    subtitle: "黎明前的總攻，阿基里斯再度突陣",
    duration: 72,
    spawnDelay: 1500,
    hpMultiplier: 1.58,
    speedMultiplier: 1.16,
    shieldChance: 0.5,
    boss: "achilles",
    bossHp: 1550,
    bossAt: 21,
    startingCoins: 420,
    tint: 0xf1b7a8,
  },
  {
    year: 10,
    title: "木馬屠城",
    subtitle: "識破木馬陰謀，守住特洛伊最後一夜",
    duration: 78,
    spawnDelay: 1400,
    hpMultiplier: 1.72,
    speedMultiplier: 1.2,
    shieldChance: 0.55,
    boss: "horse",
    bossHp: 2100,
    bossAt: 24,
    startingCoins: 500,
    tint: 0xeaa89e,
  },
];

export const DEFENDER_NAMES: Record<DefenderType, string> = {
  paris: "帕里斯",
  hector: "赫克托耳",
  cassandra: "卡珊德拉",
};

export const DEFENDER_TYPES: DefenderType[] = ["paris", "hector", "cassandra"];
