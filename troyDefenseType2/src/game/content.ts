export type UnitType = "archer" | "guard" | "priest" | "hunter" | "engineer";

export interface UnitDefinition {
  type: UnitType;
  name: string;
  shortName: string;
  role: string;
  texture: string;
  projectile: string;
  impact: string;
  baseDamage: number;
  attackDelay: number;
  attackRange: number;
  color: string;
  ringTint: number;
}

export interface CampaignYear {
  year: number;
  title: string;
  boss: string;
  rule: string;
  recommendedHero: string;
}

export const UNIT_ORDER: UnitType[] = ["archer", "guard", "priest", "hunter", "engineer"];

export const UNITS: Record<UnitType, UnitDefinition> = {
  archer: {
    type: "archer",
    name: "特洛伊弓手",
    shortName: "弓手",
    role: "快速單體・弱點暴擊",
    texture: "unit-archer",
    projectile: "sun-arrow",
    impact: "bronze-impact",
    baseDamage: 18,
    attackDelay: 980,
    attackRange: 470,
    color: "#ffd54a",
    ringTint: 0xffc928,
  },
  guard: {
    type: "guard",
    name: "王城禁衛",
    shortName: "禁衛",
    role: "破甲・擊退重甲",
    texture: "unit-guard",
    projectile: "javelin",
    impact: "bronze-impact",
    baseDamage: 25,
    attackDelay: 1280,
    attackRange: 210,
    color: "#ff6b5d",
    ringTint: 0xff493d,
  },
  priest: {
    type: "priest",
    name: "阿波羅祭司",
    shortName: "祭司",
    role: "日火印記・支援",
    texture: "unit-priest",
    projectile: "oracle-bolt",
    impact: "oracle-impact",
    baseDamage: 14,
    attackDelay: 1120,
    attackRange: 360,
    color: "#c482ff",
    ringTint: 0xa64dff,
  },
  hunter: {
    type: "hunter",
    name: "伊達山獵手",
    shortName: "獵手",
    role: "緩速・束縛",
    texture: "unit-hunter",
    projectile: "javelin",
    impact: "bronze-impact",
    baseDamage: 16,
    attackDelay: 1040,
    attackRange: 300,
    color: "#74e77c",
    ringTint: 0x37c95a,
  },
  engineer: {
    type: "engineer",
    name: "城防投石手",
    shortName: "投石",
    role: "範圍傷害・震暈",
    texture: "unit-engineer",
    projectile: "bronze-impact",
    impact: "bronze-impact",
    baseDamage: 29,
    attackDelay: 1580,
    attackRange: 520,
    color: "#63b8ff",
    ringTint: 0x2b98ff,
  },
};

export const CAMPAIGN_YEARS: CampaignYear[] = [
  { year: 1, title: "海岸烽火", boss: "普羅忒西拉俄斯", rule: "召喚與同階合成", recommendedHero: "赫克托耳" },
  { year: 2, title: "城門初圍", boss: "阿伽門農", rule: "重甲與法力管理", recommendedHero: "帕里斯" },
  { year: 3, title: "銅盾軍陣", boss: "大埃阿斯", rule: "盾陣與破甲", recommendedHero: "赫克托耳" },
  { year: 4, title: "瘟疫之夏", boss: "希臘祭司隊", rule: "負面狀態與淨化", recommendedHero: "安德洛瑪刻" },
  { year: 5, title: "夜襲船營", boss: "狄俄墨得斯", rule: "夜襲與火焰連鎖", recommendedHero: "帕里斯" },
  { year: 6, title: "眾神風暴", boss: "風暴化身", rule: "雷擊格與預警", recommendedHero: "卡珊德拉" },
  { year: 7, title: "河神怒濤", boss: "斯卡曼德河靈", rule: "潮水封鎖棋格", recommendedHero: "埃涅阿斯" },
  { year: 8, title: "英雄決鬥", boss: "阿基里斯", rule: "援軍與弱點窗", recommendedHero: "帕里斯" },
  { year: 9, title: "破曉血戰", boss: "三將連戰", rule: "無休息首領戰", recommendedHero: "普里阿摩斯" },
  { year: 10, title: "木馬屠城", boss: "奧德修斯", rule: "識破木馬與內城死守", recommendedHero: "卡珊德拉" },
];

export const HERO = {
  id: "hector",
  name: "赫克托耳",
  title: "特洛伊守護者",
  texture: "hero-hector",
  skill: "不破城牆",
  skillDescription: "恢復一顆生命，親自衝上戰線持續突刺、擊退並斬殺敵軍。",
  passive: "守護誓言：每次合成王城禁衛，額外獲得英雄怒氣。",
};
