export const MAX_ROUNDS = 8;
export const STARTING_COINS = 1200;
export const PASS_START_BONUS = 180;

export const REGIONS = {
  sapphire: { name: '江南区', color: '#3d9cff', landmark: '东方明珠' },
  turquoise: { name: '闽南区', color: '#22b9b4', landmark: '福建土楼' },
  coral: { name: '粤港区', color: '#ff6679', landmark: '广州塔' },
  orange: { name: '中部区', color: '#f49a3f', landmark: '黄鹤楼' },
  jade: { name: '京津区', color: '#38c99b', landmark: '天坛' },
  cyan: { name: '东北区', color: '#43b8e8', landmark: '冰雪大世界' },
  violet: { name: '西北区', color: '#956be5', landmark: '大雁塔' },
  magenta: { name: '巴蜀区', color: '#dc62aa', landmark: '乐山大佛' },
};

export const CHANCE_CARDS = [
  { id: 'red-envelope', title: '幸运红包', description: '获得旅游活动奖金 $180。', effect: 'coins', amount: 180 },
  { id: 'express', title: '高铁直达券', description: '选择任一城市直接抵达，并处理抵达的格子。', effect: 'travelChoice' },
  { id: 'build-grant', title: '城市建设补助', description: '名下一块房产免费建造一阶；没有房产则获得 $100。', effect: 'freeBuild' },
  { id: 'rent-shield', title: '天使免租券', description: '获得 1 张免租券，可累积并在支付过路费时使用。', effect: 'rentShield' },
  { id: 'invite-guest', title: '好友邀请函', description: '获得 1 张邀请卡，可把一名对手召来自己的房产。', effect: 'inviteCard' },
  { id: 'tour-income', title: '观光热潮', description: '名下每块土地带来 $45；尚无土地则获得旅游补助 $60。', effect: 'propertyBonus' },
  { id: 'precision-dice', title: '精准骰子券', description: '获得 1 次骰子控制；之后可选点数区间并指定单数或双数。', effect: 'diceControl', amount: 1 },
];

export const FATE_CARDS = [
  { id: 'rain-detour', title: '暴雨改道', description: '行程受阻，立刻后退 2 格。', effect: 'backward', steps: 2 },
  { id: 'repair', title: '紧急维修', description: '支付旅程维修费 $120。', effect: 'coins', amount: -120 },
  { id: 'travel-season', title: '全民旅游季', description: '所有未破产玩家各获得 $70。', effect: 'globalBonus', amount: 70 },
  { id: 'wealth-order', title: '财富调节令', description: '目前首富转交 $100 给资产最少的玩家。', effect: 'wealthTransfer', amount: 100 },
  { id: 'rent-boom', title: '过路费加成', description: '获得 1 张加成卡；可累积，下一次成功收租时每张增加 50%。', effect: 'rentBoost' },
];

export const ROULETTE_EVENTS = [
  { id: 'all-bonus', title: '全民分红', description: '所有未破产玩家获得 $80。', effect: 'globalBonus', amount: 80 },
  { id: 'rich-tax', title: '首富回馈', description: '目前首富分给其余玩家每人 $45。', effect: 'richTax', amount: 45 },
  { id: 'rent-rush', title: '全民加成卡', description: '所有未破产玩家各获得 1 张过路费加成卡。', effect: 'rentBoostAll' },
  { id: 'city-renewal', title: '城市翻新', description: '随机一块已持有房产免费升级一阶。', effect: 'randomBuild' },
  { id: 'lucky-draw', title: '幸运旅客', description: '随机一位未破产玩家获得 $160。', effect: 'randomBonus', amount: 160 },
];

export const TILE_POSITIONS = [
  [0.132, 0.735],
  [0.247, 0.737], [0.327, 0.737], [0.407, 0.737], [0.490, 0.737],
  [0.571, 0.737], [0.652, 0.737], [0.733, 0.737],
  [0.865, 0.735],
  [0.859, 0.657], [0.857, 0.597], [0.856, 0.538], [0.854, 0.480],
  [0.852, 0.422], [0.851, 0.363], [0.849, 0.304],
  [0.846, 0.239],
  [0.731, 0.239], [0.650, 0.239], [0.571, 0.239], [0.493, 0.239],
  [0.415, 0.239], [0.338, 0.239], [0.260, 0.239],
  [0.134, 0.239],
  [0.142, 0.304], [0.140, 0.363], [0.137, 0.422], [0.134, 0.480],
  [0.132, 0.538], [0.130, 0.597], [0.128, 0.657],
];

const property = (name, region, price, rent) => ({
  type: 'property', name, region, price, baseRent: rent, owner: null, level: 0,
});

export function createTiles() {
  return [
    { type: 'start', name: '环游中国', icon: '✦' },
    property('上海', 'sapphire', 110, 35),
    property('杭州', 'sapphire', 130, 42),
    property('苏州', 'sapphire', 150, 50),
    { type: 'chance', name: '机会卡', icon: '?' },
    property('福州', 'turquoise', 120, 39),
    property('厦门', 'turquoise', 140, 46),
    property('泉州', 'turquoise', 160, 54),
    { type: 'train', name: '高铁旅游', icon: '➤' },
    property('广州', 'coral', 150, 50),
    property('深圳', 'coral', 170, 58),
    property('珠海', 'coral', 190, 66),
    { type: 'fate', name: '命运卡', icon: '✦' },
    property('武汉', 'orange', 170, 58),
    property('长沙', 'orange', 190, 66),
    property('南昌', 'orange', 210, 74),
    { type: 'roulette', name: '命运轮盘', icon: '◎' },
    property('北京', 'jade', 180, 62),
    property('天津', 'jade', 200, 70),
    property('青岛', 'jade', 220, 78),
    { type: 'world', name: '世界巡游赛', icon: '★' },
    property('哈尔滨', 'cyan', 210, 74),
    property('沈阳', 'cyan', 230, 82),
    property('大连', 'cyan', 250, 90),
    { type: 'jail', name: '旅程监狱', icon: '⌛' },
    property('西安', 'violet', 220, 78),
    property('兰州', 'violet', 240, 88),
    property('乌鲁木齐', 'violet', 270, 100),
    { type: 'diceLab', name: '骰子工坊', icon: '' },
    property('成都', 'magenta', 250, 90),
    property('重庆', 'magenta', 270, 100),
    property('贵阳', 'magenta', 290, 110),
  ];
}

export function assetValue(tile) {
  if (tile.type !== 'property' || !tile.owner) return 0;
  return tile.price + buildCost(tile) * tile.level;
}

export function buildCost(tile) {
  return Math.round(tile.price * 0.55);
}

export function ownsFullRegion(tiles, owner, region) {
  const group = tiles.filter((tile) => tile.type === 'property' && tile.region === region);
  return group.length === 3 && group.every((tile) => tile.owner === owner);
}

export function pickControlledDice(range = [2, 12], parity = null, random = Math.random) {
  const candidates = [];
  for (let first = 1; first <= 6; first += 1) {
    for (let second = 1; second <= 6; second += 1) {
      const sum = first + second;
      const inRange = sum >= range[0] && sum <= range[1];
      const parityMatches = parity === null || sum % 2 === (parity === 'odd' ? 1 : 0);
      if (inRange && parityMatches) candidates.push([first, second]);
    }
  }
  const pool = candidates.length > 0 ? candidates : [[1, 1]];
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function rentFor(tiles, tile) {
  const levelScale = [0.45, 1, 1.8, 2.8, 5][tile.level] ?? 1;
  const setScale = ownsFullRegion(tiles, tile.owner, tile.region) ? 2 : 1;
  return Math.round(tile.baseRent * levelScale * setScale);
}

export function boostedRent(baseRent, stacks = 0) {
  return Math.round(baseRent * (1 + Math.max(0, stacks) * 0.5));
}

export function netWorth(tiles, player) {
  return player.coins + tiles
    .filter((tile) => tile.owner === player.id)
    .reduce((sum, tile) => sum + assetValue(tile), 0);
}
