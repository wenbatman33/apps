// ===== 遊戲資料：英雄彈珠 / 關卡（彈珠台配置）/ 劇情 =====

// 四位跨界英雄 = 四顆彈珠（每章依序上場），各有小特長
export const HEROES = [
  { id: 'sword',  name: '雲嵐',   title: '劍聖',      world: '武俠世界', emoji: '⚔️', color: 0xff4d5e,
    perk: '對棋主傷害 +25%',   perkType: 'bossDmg' },
  { id: 'mech',   name: 'NOVA-7', title: '機甲駕駛員', world: '未來都市', emoji: '🤖', color: 0x35d6ff,
    perk: '彈射器得分 ×2',     perkType: 'bumperScore' },
  { id: 'mage',   name: '露娜',   title: '魔導少女',   world: '魔法學院', emoji: '🔮', color: 0xc77dff,
    perk: '球保護時間 +6 秒',   perkType: 'saver' },
  { id: 'gunner', name: '傑克',   title: '快槍手',     world: '西部荒野', emoji: '🤠', color: 0xffc44d,
    perk: '彈弓得分 ×2',       perkType: 'slingScore' },
];

// 關卡（座標系：x ∈ [-3.2,3.2]，z ∈ [-6.6,6.6]，z 負方向 = 檯面頂端）
// 每章共用的基本結構在 game.js 建構；這裡定義各章的機關配置
export const STAGES = [
  {
    id: 0, name: '第一章', sub: '虛空前哨戰', bossHp: 2600,
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
    id: 1, name: '第二章', sub: '次元裂縫', bossHp: 4800,
    bumpers: [ { x: -1.5, z: -1.15 }, { x: 1.5, z: -1.15 }, { x: 0, z: -2.05 }, { x: 0, z: 0.15 } ],
    targets: [
      { x: -1.15, z: -3.3 }, { x: -0.575, z: -3.3 }, { x: 0, z: -3.3 },
      { x: 0.575, z: -3.3 }, { x: 1.15, z: -3.3 },
    ],
    sideTargets: [ { x: -2.75, z: -3.0 }, { x: 2.15, z: -3.0 }, { x: -2.75, z: 1.6 }, { x: 2.15, z: 1.6 } ],
    laneLetters: ['V', 'O', 'I', 'D'],
    spinners: [ { x: -2.82, z: -0.5 } ],
    saucers: [ { x: -1.95, z: -4.35 }, { x: 2.1, z: -1.3 } ],
    posts: [ { x: -1.95, z: 0.15 }, { x: 1.95, z: 0.15 }, { x: -1.5, z: 2.75 }, { x: 1.5, z: 2.75 } ],
    rollovers: [ { x: -1.15, z: 4.5 }, { x: 1.15, z: 4.5 }, { x: -0.62, z: 2.9 }, { x: 0.62, z: 2.9 } ],
  },
  {
    id: 2, name: '最終章', sub: '棋主的王座', bossHp: 8000,
    bumpers: [
      { x: -1.6, z: -0.85 }, { x: 1.6, z: -0.85 },
      { x: -0.8, z: -1.85 }, { x: 0.8, z: -1.85 }, { x: 0, z: 0.25 },
    ],
    targets: [
      { x: -1.15, z: -3.4 }, { x: -0.575, z: -3.4 }, { x: 0, z: -3.4 },
      { x: 0.575, z: -3.4 }, { x: 1.15, z: -3.4 },
    ],
    sideTargets: [ { x: -2.75, z: -3.05 }, { x: 2.15, z: -3.05 }, { x: -2.75, z: 1.5 }, { x: 2.15, z: 1.5 } ],
    laneLetters: ['K', 'I', 'N', 'G'],
    spinners: [ { x: -2.82, z: -0.45 } ],
    saucers: [ { x: -1.95, z: -4.5 }, { x: 2.1, z: -1.4 } ],
    posts: [ { x: -2.0, z: 0.1 }, { x: 2.0, z: 0.1 }, { x: -1.55, z: 2.8 }, { x: 1.55, z: 2.8 } ],
    rollovers: [ { x: -1.15, z: 4.5 }, { x: 1.15, z: 4.5 }, { x: -0.62, z: 2.95 }, { x: 0.62, z: 2.95 }, { x: 0, z: 3.5 } ],
  },
];

// 劇情腳本
export const STORY = {
  intro: [
    { who: 'narrator', text: '在無數平行世界的交會處，漂浮著一座巨大的「虛空彈珠台」。' },
    { who: 'narrator', text: '神祕的「虛空棋主」奪走了各世界的彈珠核心——失去核心的世界，正一格一格崩解。' },
    { who: 'boss',     text: '哈哈哈……想拿回核心？那就在我的彈珠台上，分個高下吧！' },
    { who: 'sword',    text: '劍未出鞘，勝負已分。雲嵐，接下這一局。' },
    { who: 'mech',     text: 'NOVA-7 系統啟動。彈道模擬完成——命中率 99.7%。' },
    { who: 'mage',     text: '星星們說，只要我們四人聯手，就沒有打不碎的棋子♪' },
    { who: 'gunner',   text: '嘿，在我的荒野，出老千的傢伙只有一個下場。上吧，夥伴們！' },
    { who: 'narrator', text: '四位跨界高手化身彈珠，躍上檯面——彈珠達人跨界對決，開局！' },
  ],
  stageIntro: [
    [ { who: 'narrator', text: '第一章・虛空前哨戰——彈珠台外圍防線。' },
      { who: 'gunner',   text: '教學交給我！按住畫面「往下拉」再放開，就能拉彈簧發球；之後點畫面左右兩側，控制左右彈射板！' },
      { who: 'mage',     text: '先打掉三個發光的目標靶，棋主就會「破防」——那時候用彈珠狠狠撞他就對了♪' } ],
    [ { who: 'narrator', text: '第二章・次元裂縫——檯面深處，空間開始扭曲。' },
      { who: 'mech',     text: '偵測到追加的能量彈射器。善用連續彈射累積 COMBO，得分加成會越疊越高。' },
      { who: 'sword',    text: '心如止水。守住彈射板，球不落袋，勝負自然分明。' } ],
    [ { who: 'narrator', text: '最終章・棋主的王座——一切的元凶，就在檯面頂端。' },
      { who: 'boss',     text: '能走到這裡，勉強算得上棋逢對手。但王，是不會被將死的！' },
      { who: 'sword',    text: '四個世界的怒火，就由這一擊——替天行道！' } ],
  ],
  stageOutro: [
    [ { who: 'gunner', text: '呼——前哨站清光了。這台子，手感還挺不錯。' },
      { who: 'mage',   text: '前面的裂縫越來越大了……大家，抓緊囉！' } ],
    [ { who: 'mech',  text: '裂縫突破。偵測到王座反應——最終決戰，就在前方。' },
      { who: 'sword', text: '棋主……你的殘局，該收官了。' } ],
    [ { who: 'boss',     text: '不可能……我的彈珠台、我的王座……竟被四顆彈珠……將軍……' },
      { who: 'narrator', text: '虛空棋主碎成星塵，被奪走的彈珠核心緩緩升起，飛回各自的世界。' },
      { who: 'mage',     text: '看！天空的裂縫在癒合……我們做到了！' },
      { who: 'gunner',   text: '那，回家前——再來一局友誼賽如何？這次我可不會放水。' },
      { who: 'narrator', text: '檯面上，笑聲與彈珠的碰撞聲迴盪不息。跨界對決，永不落幕——感謝遊玩！' } ],
  ],
};

export const WHO = {
  sword: { name: '劍聖・雲嵐', emoji: '⚔️' },
  mech: { name: 'NOVA-7', emoji: '🤖' },
  mage: { name: '魔導少女・露娜', emoji: '🔮' },
  gunner: { name: '快槍手・傑克', emoji: '🤠' },
  boss: { name: '虛空棋主', emoji: '♚' },
  narrator: { name: '旁白', emoji: '🌌' },
};

export const BOSS = { name: '虛空棋主', emoji: '♚', color: 0xff3d6e, r: 0.55, x: 0, z: -4.35 };

// 頂部滾道（rollover lane）：3~4 條由分隔牆形成的通道
export const LANE = { z: -5.45, wallZ0: -6.15, wallZ1: -4.95 };
