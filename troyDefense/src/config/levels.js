/* 十關 = 十年 */
window.TD = window.TD || {};

// w(時間秒, 類型, 數量, 路徑(0/1/2 或 -1 隨機), 間隔ms)
const w = (t, type, count, lane = -1, gap = 700) => ({ t, type, count, lane, gap });

TD.LEVELS = [
  {
    id: 1, year: 1, title: '黑船臨岸', bg: 'B_field_sq', time: 90,
    hp: 100, gold: 260, lanes: [1], tint: 0xFFFFFF,
    intro: '希臘人的黑船靠岸了。城牆上還有人以為這只是一場短暫的騷擾。',
    tutorial: true,
    waves: [
      w(4, 'soldier', 3, 1, 900), w(16, 'soldier', 5, 1, 700),
      w(32, 'soldier', 6, 1, 550), w(50, 'runner', 4, 1, 600),
      w(66, 'soldier', 8, 1, 450),
    ],
  },
  {
    id: 2, year: 2, title: '城下之圍', bg: 'B_field_sq', time: 105,
    hp: 100, gold: 280, lanes: [0, 2], tint: 0xFFFFFF,
    intro: '他們紮下營寨。這不是騷擾，是圍城。',
    waves: [
      w(4, 'soldier', 4, 0), w(10, 'soldier', 4, 2),
      w(24, 'shield', 3, 0, 900), w(34, 'runner', 5, 2, 500),
      w(50, 'shield', 4, -1, 800), w(64, 'soldier', 8, -1, 400),
      w(82, 'shield', 4, 0), w(86, 'runner', 6, 2, 400),
    ],
  },
  {
    id: 3, year: 3, title: '呂卡翁的哀嚎', bg: 'B_field_sq', time: 120,
    hp: 100, gold: 300, lanes: [0, 1, 2], tint: 0xFFF3E0,
    intro: '狄俄墨得斯衝進了戰線。他快得像沒有重量。',
    waves: [
      w(4, 'runner', 5, -1, 450), w(18, 'soldier', 6, -1),
      w(32, 'shield', 4, 1), w(40, 'healer', 2, -1, 1200), w(48, 'runner', 8, -1, 350),
      w(60, 'diomedes', 1, 1), w(62, 'soldier', 8, -1, 500),
      w(88, 'shield', 5, -1), w(100, 'runner', 10, -1, 300),
    ],
  },
  {
    id: 4, year: 4, title: '千艘之火', bg: 'B_field_night_sq', time: 120,
    hp: 100, gold: 320, lanes: [0, 1, 2], tint: 0x8899CC, night: true,
    intro: '他們趁夜來放火。看不清的東西，最讓人害怕。',
    waves: [
      w(4, 'fire', 4, -1, 700), w(18, 'soldier', 8, -1, 450),
      w(32, 'fire', 6, -1, 550), w(44, 'flyer', 4, -1, 800), w(56, 'shield', 5, -1),
      w(62, 'fire', 8, -1, 450), w(78, 'runner', 10, -1, 300),
      w(96, 'fire', 6, -1, 400), w(102, 'shield', 6, -1, 600),
    ],
  },
  {
    id: 5, year: 5, title: '帕特羅克洛斯之死', bg: 'B_field_sq', time: 135,
    hp: 100, gold: 340, lanes: [0, 1, 2], tint: 0xFFE0B2,
    intro: '大埃阿斯推著他的盾牆過來了，像一堵會走路的城。',
    waves: [
      w(4, 'shield', 5, -1), w(16, 'soldier', 10, -1, 400),
      w(30, 'siege', 1, 1), w(36, 'myrmidon', 5, -1, 700), w(46, 'runner', 8, -1, 350),
      w(52, 'shield', 6, -1), w(66, 'ajax', 1, 1),
      w(70, 'soldier', 12, -1, 400), w(92, 'siege', 2, -1, 3000),
      w(110, 'shield', 8, -1, 500),
    ],
  },
  {
    id: 6, year: 6, title: '赫克托爾的最後一戰', bg: 'B_field_sq', time: 150,
    hp: 100, gold: 360, lanes: [0, 1, 2], tint: 0xFFCCBC,
    intro: '赫克托爾出城了。全城的人都知道他回不來——除了他自己。',
    waves: [
      w(4, 'runner', 10, -1, 300), w(20, 'shield', 6, -1),
      w(36, 'drummer', 3, -1, 1000), w(44, 'fire', 8, -1, 400), w(58, 'siege', 2, -1, 2500),
      w(68, 'soldier', 16, -1, 300), w(88, 'shield', 8, -1, 500),
      w(106, 'diomedes', 1, 0), w(108, 'ajax', 1, 2),
      w(112, 'runner', 14, -1, 250), w(132, 'fire', 10, -1, 350),
    ],
  },
  {
    id: 7, year: 7, title: '阿基里斯之怒', bg: 'B_field_sq', time: 150,
    hp: 100, gold: 380, lanes: [0, 1, 2], tint: 0xFFAB91,
    intro: '他刀槍不入。你唯一的機會，在他腳踝閃出微光的那一瞬。',
    waves: [
      w(4, 'soldier', 12, -1, 350), w(20, 'shield', 8, -1, 600),
      w(34, 'flyer', 6, -1, 600), w(42, 'healer', 3, -1, 900), w(52, 'achilles', 1, 1),
      w(56, 'runner', 14, -1, 280), w(78, 'fire', 10, -1, 350),
      w(96, 'shield', 10, -1, 500), w(118, 'soldier', 20, -1, 250),
    ],
  },
  {
    id: 8, year: 8, title: '亞馬遜與黎明', bg: 'B_field_sq', time: 150,
    hp: 100, gold: 400, lanes: [0, 1, 2], tint: 0xFFE0B2,
    freeHeroes: ['penthesilea', 'memnon'],
    intro: '亞馬遜女王與黎明之子帶著援軍抵達。特洛伊還沒有輸。',
    waves: [
      w(4, 'shield', 8, -1, 500), w(20, 'agamemnon', 1, 0),
      w(24, 'myrmidon', 8, -1, 500), w(38, 'drummer', 4, -1, 800), w(50, 'siege', 3, -1, 1800),
      w(64, 'odysseus', 1, 2), w(68, 'soldier', 18, -1, 280),
      w(94, 'fire', 12, -1, 320), w(116, 'shield', 12, -1, 450),
      w(136, 'runner', 18, -1, 220),
    ],
  },
  {
    id: 9, year: 9, title: '十年之圍', bg: 'B_field_night_sq', time: 165,
    hp: 100, gold: 300, lanes: [0, 1, 2], tint: 0x99A0C0, night: true,
    goldPenalty: 0.6,
    intro: '第九年。糧倉見底，箭矢要靠回收。撐下去就是勝利。',
    waves: [
      w(4, 'soldier', 14, -1, 300), w(22, 'shield', 10, -1, 450),
      w(38, 'flyer', 8, -1, 500), w(48, 'healer', 4, -1, 800), w(60, 'myrmidon', 10, -1, 400),
      w(78, 'diomedes', 1, 0), w(80, 'ajax', 1, 2),
      w(84, 'runner', 20, -1, 200), w(110, 'achilles', 1, 1),
      w(114, 'soldier', 24, -1, 220), w(140, 'shield', 14, -1, 380),
    ],
  },
  {
    id: 10, year: 10, title: '木馬屠城', bg: 'B_field_sq', time: 240,
    hp: 100, gold: 600, lanes: [0, 1, 2], tint: 0xFFFFFF,
    finale: true,
    intro: '希臘人的船走了。海灘上只留下一匹巨大的木馬。\n城裡的人在歡呼，要你打開城門。',
    phases: [
      {
        name: '獻禮', dur: 60, bg: 'B_field_sq',
        hint: '60 秒內拆掉木馬 → 改寫歷史',
        waves: [w(2, 'horse', 1, 1)],
      },
      {
        name: '城內混戰', dur: 90, bg: 'B_city_sq', reversed: true,
        hint: '敵人從城內湧出，塔的朝向已翻轉',
        waves: [
          w(2, 'soldier', 12, -1, 300), w(16, 'shield', 8, -1, 400),
          w(32, 'odysseus', 1, 1), w(36, 'runner', 16, -1, 220),
          w(56, 'fire', 12, -1, 300), w(72, 'agamemnon', 1, 1),
          w(76, 'soldier', 20, -1, 250),
        ],
      },
      {
        name: '最後一站', dur: 90, bg: 'B_city_sq', collapse: 10,
        hint: '每 10 秒失去一個塔位，撐住讓埃涅阿斯帶火種離開',
        waves: [
          w(2, 'runner', 18, -1, 220), w(18, 'shield', 12, -1, 350),
          w(34, 'achilles', 1, 1), w(38, 'soldier', 24, -1, 200),
          w(60, 'fire', 16, -1, 250), w(76, 'runner', 24, -1, 180),
        ],
      },
    ],
    waves: [],
  },
];

TD.levelById = (id) => TD.LEVELS.find(l => l.id === id);
