import Phaser from 'phaser';
import './styles.css';
import { Dice3D } from './dice3d.js';
import { gameAudio } from './audio.js';
import { EngineUI } from './engine-ui.js';
import { Map3D } from './map3d.js';
import {
  CHANCE_CARDS,
  FATE_CARDS,
  MAX_ROUNDS,
  PASS_START_BONUS,
  REGIONS,
  ROULETTE_EVENTS,
  STARTING_COINS,
  assetValue,
  boostedRent,
  buildCost,
  createTiles,
  netWorth,
  ownsFullRegion,
  pickControlledDice,
  rentFor,
} from './game-data.js';

const W = 450;
const H = 800;
const RENDER_RESOLUTION = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const money = (value) => Math.round(value).toLocaleString('zh-CN');

const ROSTER = [
  { id: 'mira', name: '钱多多', x: '0%', y: '0%', color: '#39dfff' },
  { id: 'leon', name: '楼小旺', x: '33.333%', y: '0%', color: '#ff6c7e' },
  { id: 'mabel', name: '金算盘', x: '66.667%', y: '0%', color: '#a879f4' },
  { id: 'snooze', name: '周小困', x: '100%', y: '0%', color: '#77baff' },
  { id: 'panna', name: '包租娘', x: '0%', y: '100%', color: '#ffad42' },
  { id: 'miso', name: '票票侠', x: '33.333%', y: '100%', color: '#43c989' },
  { id: 'ivy', name: '苗壮壮', x: '66.667%', y: '100%', color: '#51d694' },
  { id: 'prof', name: '白发明', x: '100%', y: '100%', color: '#e5bd54' },
];

const SEAT_COLORS = ['#39dfff', '#ff667d', '#67d86f', '#a879f4'];
const DICE_RANGES = [[2, 5], [5, 8], [8, 12]];
const mapStage = document.querySelector('#map-stage');
const diceStage = document.querySelector('#dice-stage');

let selectedMode = 'solo';
let selectedCharacter = ROSTER[0];
let players = [];
let tiles = createTiles();
let currentIndex = 0;
let round = 1;
let gameEnded = false;
let matchStarted = false;
let scene;
let engineUI;
let currentTurnLabel = '';
let pendingParity = null;
let gaugeEpoch = performance.now();
let lapBonusTimer;
let travelSelectionResolve = null;
let resolveSceneReady;
const sceneReady = new Promise((resolve) => { resolveSceneReady = resolve; });
const map3d = new Map3D(mapStage);
const dice3d = new Dice3D(diceStage);

class TycoonScene extends Phaser.Scene {
  constructor() { super('TycoonScene'); }

  preload() {
    EngineUI.preload(this);
    this.load.image('roster', './assets/character-roster-fun.png');
  }

  create() {
    scene = this;
    // Phaser 3 不会把顶层 resolution 配置自动应用到主画布。
    // 使用双倍物理画布配合相机缩放，保留 450×800 的逻辑坐标与清晰输入命中。
    this.cameras.main.setZoom(RENDER_RESOLUTION);
    this.cameras.main.centerOn(W / 2, H / 2);
    const rosterTexture = this.textures.get('roster');
    ROSTER.forEach((character, index) => {
      rosterTexture.add(character.id, 0, (index % 4) * 384, index < 4 ? 0 : 512, 384, 512);
    });

    engineUI = new EngineUI(this, { width: W, height: H, roster: ROSTER });
    engineUI.setHandlers({
      onAnyButton: () => gameAudio.play('click', .34),
      onMode: (mode) => { selectedMode = mode; },
      getMode: () => selectedMode,
      onCharacter: (character) => { selectedCharacter = character; },
      getCharacter: () => selectedCharacter,
      onStart: () => { gameAudio.unlock(); startGame(); },
      onRules: () => engineUI.showRules(),
      onPause: () => engineUI.showPause(),
      onAudio: () => gameAudio.toggleMusic(),
      isMusicEnabled: () => gameAudio.musicEnabled,
      onHome: () => window.location.reload(),
      onRematch: () => startGame(),
      onDiceVisibility: (show) => diceStage.classList.toggle('is-hidden', !show),
    });
    map3d.setProjectionListener((positions) => engineUI?.updateTilePositions(positions));
    engineUI.showHome();
    resolveSceneReady();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W * RENDER_RESOLUTION,
  height: H * RENDER_RESOLUTION,
  parent: 'game',
  transparent: true,
  antialias: true,
  roundPixels: true,
  render: { powerPreference: 'high-performance', antialiasGL: true, pixelArt: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TycoonScene],
});

function createPlayers() {
  const ordered = [selectedCharacter, ...ROSTER.filter((character) => character.id !== selectedCharacter.id)].slice(0, 4);
  return ordered.map((character, index) => ({
    id: `p${index + 1}`,
    name: character.name,
    character,
    color: SEAT_COLORS[index],
    coins: STARTING_COINS,
    position: 0,
    token: null,
    bankrupt: false,
    isHuman: selectedMode === 'local' || index === 0,
    rentShield: 0,
    rentBoost: 0,
    inviteCards: 0,
    jailTurns: 0,
    diceControlItems: 0,
  }));
}

async function startGame() {
  await sceneReady;
  tiles = createTiles();
  players = createPlayers();
  currentIndex = 0;
  round = 1;
  gameEnded = false;
  matchStarted = true;
  map3d.setActive(true);
  map3d.buildBoard(tiles);
  engineUI.showGame();
  hideActionPanel();
  resetScene();
  renderHUD();
  renderTileLayer();
  renderProperties();
  engineUI.showIntro(players);
  await wait(1450);
  engineUI.hideModal();
  beginTurn();
}

function resetScene() {
  map3d.resetPlayers(players);
  map3d.focusTile(0, { immediate: true });
  separateTokens();
}

function renderHUD() {
  if (!engineUI || players.length === 0) return;
  engineUI.renderHUD(players, tiles, currentIndex, gameEnded);
}

function renderTileLayer() {
  if (!engineUI) return;
  // Travel selection is handled by the real 3D tile meshes. Keeping a second
  // Phaser hit target over the labels caused drag gestures to end as an
  // accidental city selection.
  engineUI.renderTiles(tiles, players, null);
}

function completeTravelSelection(index) {
  if (!travelSelectionResolve || tiles[index]?.type !== 'property') return;
  const resolve = travelSelectionResolve;
  travelSelectionResolve = null;
  map3d.setTravelMode(false);
  hideActionPanel();
  renderTileLayer();
  resolve(index);
}

function renderProperties(animatedIndex = -1) {
  if (!map3d) return;
  map3d.syncProperties(tiles, players, animatedIndex);
  renderTileLayer();
}

function separateTokens() {
  map3d.syncTokenPositions(players);
}

// 即时金额变化由玩家列的跳字呈现；不再用大型快报遮住棋盘。
function notify() {}

async function beamMovePlayer(player, destination) {
  gameAudio.play('beam', .72);
  await map3d.teleportToken(player.id, destination);
  player.position = destination;
  separateTokens();
}

async function forceMoveBy(player, spaces) {
  const destination = (player.position + spaces + tiles.length) % tiles.length;
  if (spaces > 0 && player.position + spaces >= tiles.length) {
    changeCoins(player, PASS_START_BONUS, '经过起点');
    showLapBonus(player);
  }
  await beamMovePlayer(player, destination);
}

function showEffectBurst(title, copy = '') {
  return engineUI.showEffect(title, copy);
}

async function animateToll(baseRent, finalRent, boostStacks = 0) {
  await engineUI.animateToll(baseRent, finalRent, boostStacks);
}

function hideActionPanel() {
  engineUI?.hidePanel();
}

function setPanel(title, copy, actions = [], options = {}) {
  const mapped = actions.map(({ label, className = '', run }) => ({
    label,
    gold: className.includes('gold'),
    danger: className.includes('danger'),
    run: () => {
      if (gameEnded) return;
      if (options.hideOnAction !== false) hideActionPanel();
      run();
    },
  }));
  engineUI.setPanel(currentTurnLabel, title, copy, mapped, options);
}

function setRollStatus(title, copy) {
  engineUI.setPanel(currentTurnLabel, title, copy, [], { rollStatus: true });
}

function gaugeRange() {
  const elapsed = ((performance.now() - gaugeEpoch) % 2400) / 2400;
  const position = elapsed <= .5 ? elapsed * 2 : (1 - elapsed) * 2;
  const index = Math.min(2, Math.floor(position * 3));
  return DICE_RANGES[index];
}

function updateDiceControl(player) {
  setDiceControlPanel(player);
}

function setDiceControlPanel(player) {
  if (!pendingParity) pendingParity = null;
  gaugeEpoch = performance.now();
  engineUI.showDiceControl(currentTurnLabel, player, () => {
    pendingParity = pendingParity === 'odd' ? null : 'odd';
    setDiceControlPanel(player);
  }, () => {
    pendingParity = pendingParity === 'even' ? null : 'even';
    setDiceControlPanel(player);
  }, [
    { label: pendingParity ? `使用并掷骰（${pendingParity === 'odd' ? '单' : '双'}）` : '使用并掷骰', run: () => takeTurn(player, true) },
    { label: '暂不使用', run: () => { pendingParity = null; setRollChoicePanel(player); } },
  ]);
}

function setRollChoicePanel(player) {
  const actions = [{
    label: '普通掷骰', className: 'primary-button', run: () => takeTurn(player, false),
  }];
  if (canUseInviteCard(player)) {
    actions.push({
      label: `邀请对手 ×${player.inviteCards}`,
      className: 'choice-button is-danger',
      run: () => openInvitePanel(player),
    });
  }
  if (player.diceControlItems > 0) {
    actions.push({
      label: `使用控制券 ×${player.diceControlItems}`,
      className: 'choice-button is-gold',
      run: () => setDiceControlPanel(player),
    });
  }
  const hasChoice = actions.length > 1;
  setPanel(
    hasChoice ? '选择行动' : '',
    '',
    actions,
    { compact: !hasChoice, hideOnAction: false, showDice: true },
  );
}

function canUseInviteCard(player) {
  return player.inviteCards > 0
    && tiles.some((tile) => tile.owner === player.id)
    && players.some((item) => item !== player && !item.bankrupt);
}

function openInvitePanel(player) {
  const targets = players.filter((item) => item !== player && !item.bankrupt);
  setPanel('邀请谁来作客？', '', [
    ...targets.map((target) => ({
      label: target.name,
      className: 'choice-button is-danger',
      run: () => useInviteCard(player, target),
    })),
    { label: '返回', run: () => setRollChoicePanel(player) },
  ], { hideOnAction: false });
}

async function useInviteCard(owner, target) {
  if (!canUseInviteCard(owner) || target.bankrupt) {
    setRollChoicePanel(owner);
    return;
  }
  const destination = tiles
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => tile.owner === owner.id)
    .sort((a, b) => rentFor(tiles, b.tile) - rentFor(tiles, a.tile))[0];
  owner.inviteCards -= 1;
  hideActionPanel();
  renderHUD();
  await beamMovePlayer(target, destination.index);
  await settleRent(target, owner, destination.tile);
  if (await handleIfBankrupt(target)) return;
  await wait(260);
  finishTurn();
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function presentEvent(player, {
  kind,
  cardId,
  kicker,
  title,
  description,
  actionLabel = '确定',
  reveal = false,
}) {
  gameAudio.play('card', .72);
  hideActionPanel();
  return engineUI.presentEvent({
    player, kind, cardId, kicker, title, description, actionLabel, reveal,
    auto: !player?.isHuman && selectedMode === 'solo',
  });
}

async function applyCardEffect(player, card) {
  if (card.effect === 'coins') changeCoins(player, card.amount, card.title);
  if (card.effect === 'forward') {
    await forceMoveBy(player, card.steps);
    await resolveTile(player, tiles[player.position]);
    return true;
  }
  if (card.effect === 'backward') {
    await forceMoveBy(player, -card.steps);
    await resolveTile(player, tiles[player.position]);
    return true;
  }
  if (card.effect === 'travelChoice') {
    const destination = await chooseTravelDestination(player);
    await beamMovePlayer(player, destination);
    await resolveTile(player, tiles[destination]);
    return true;
  }
  if (card.effect === 'freeBuild') {
    const candidates = tiles.filter((tile) => tile.owner === player.id && tile.level < 4);
    if (candidates.length === 0) {
      changeCoins(player, 100, '建设补助折现');
    } else {
      const target = randomItem(candidates);
      target.level += 1;
      renderProperties(tiles.indexOf(target));
    }
  }
  if (card.effect === 'rentShield') player.rentShield += 1;
  if (card.effect === 'inviteCard') player.inviteCards += card.amount ?? 1;
  if (card.effect === 'diceControl') player.diceControlItems += card.amount ?? 1;
  if (card.effect === 'propertyBonus') {
    const owned = tiles.filter((tile) => tile.owner === player.id).length;
    changeCoins(player, Math.max(60, owned * 45), '观光收入');
  }
  if (card.effect === 'globalBonus') {
    players.filter((item) => !item.bankrupt).forEach((item) => changeCoins(item, card.amount, card.title));
  }
  if (card.effect === 'wealthTransfer') {
    const ranking = players.filter((item) => !item.bankrupt).sort((a, b) => netWorth(tiles, b) - netWorth(tiles, a));
    const richest = ranking[0];
    const poorest = ranking.at(-1);
    if (richest && poorest && richest !== poorest) {
      const transfer = Math.min(card.amount, Math.max(0, richest.coins));
      await transferCoins(richest, poorest, transfer, card.title);
    }
  }
  if (card.effect === 'rentBoost') player.rentBoost += 1;
  renderHUD();
  return false;
}

async function resolveCardTile(player, deckName) {
  const isChance = deckName === 'chance';
  const card = randomItem(isChance ? CHANCE_CARDS : FATE_CARDS);
  await presentEvent(player, {
    kind: deckName,
    cardId: card.id,
    kicker: isChance ? '机会卡' : '命运卡',
    title: card.title,
    description: card.description,
    actionLabel: '确定',
    reveal: true,
  });
  const moved = await applyCardEffect(player, card);
  if (moved || gameEnded) return;
  if (await handleIfBankrupt(player)) return;
  await wait(360);
  finishTurn();
}

async function resolveDiceLab(player) {
  await presentEvent(player, {
    kind: 'diceLab',
    cardId: 'diceLab',
    kicker: '骰子工坊',
    title: '获得精准骰子券',
    description: '精准骰子券 +1',
    actionLabel: '确定',
  });
  player.diceControlItems += 1;
  renderHUD();
  finishTurn();
}

function trainDestinations(player) {
  const properties = tiles.map((tile, index) => ({ tile, index })).filter(({ tile }) => tile.type === 'property');
  const priorities = [
    properties.filter(({ tile }) => !tile.owner).sort((a, b) => b.tile.price - a.tile.price)[0],
    properties.filter(({ tile }) => tile.owner === player.id && tile.level < 4).sort((a, b) => b.tile.level - a.tile.level)[0],
    properties.filter(({ tile }) => tile.owner && tile.owner !== player.id).sort((a, b) => a.tile.level - b.tile.level)[0],
  ].filter(Boolean);
  const unique = [...new Map(priorities.map((item) => [item.index, item])).values()];
  for (const candidate of properties) {
    if (unique.length >= 3) break;
    if (!unique.some((item) => item.index === candidate.index)) unique.push(candidate);
  }
  return unique.slice(0, 3);
}

function chooseTravelDestination(player) {
  const destinations = tiles
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => tile.type === 'property');
  if (!player.isHuman) {
    const target = [...destinations].sort((a, b) => {
      const score = ({ tile }) => (!tile.owner ? tile.price + 400 : tile.owner === player.id ? 150 - tile.level * 10 : -rentFor(tiles, tile));
      return score(b) - score(a);
    })[0];
    return Promise.resolve(target.index);
  }
  return new Promise((resolve) => {
    travelSelectionResolve = resolve;
    map3d.showOverview();
    map3d.setTravelMode(true, completeTravelSelection);
    renderTileLayer();
    engineUI.showTravelPicker(currentTurnLabel);
  });
}

async function travelToTile(player, index) {
  await beamMovePlayer(player, index);
  await resolveTile(player, tiles[index]);
}

async function resolveTrain(player) {
  await presentEvent(player, {
    kind: 'train',
    cardId: 'train',
    kicker: '高铁旅游',
    title: '高铁直达',
    description: '选择任一城市直接抵达。',
    actionLabel: '选择目的地',
  });
  if (player.isHuman) {
    const destination = await chooseTravelDestination(player);
    await travelToTile(player, destination);
    return;
  }
  const destinations = trainDestinations(player);
  await wait(360);
  await travelToTile(player, destinations[0].index);
}

async function resolveWorldTournament(player) {
  const standings = players.filter((item) => !item.bankrupt).map((item) => ({
    player: item,
    score: 1 + Math.floor(Math.random() * 6) + tiles.filter((tile) => tile.owner === item.id).length,
  })).sort((a, b) => b.score - a.score);
  const winner = standings[0];
  const runnerUp = standings[1];
  changeCoins(winner.player, 200, '世界巡游赛冠军');
  if (runnerUp) changeCoins(runnerUp.player, 80, '世界巡游赛亚军');
  await presentEvent(player, {
    kind: 'world',
    cardId: 'world',
    kicker: '世界巡游赛',
    title: `${winner.player.name} 夺得冠军！`,
    description: `旅游分数 ${winner.score}，获得 $200${runnerUp ? `；${runnerUp.player.name} 获得亚军奖 $80` : ''}。`,
    actionLabel: '领取奖励',
  });
  finishTurn();
}

async function applyRouletteEvent(event) {
  const solvent = players.filter((player) => !player.bankrupt);
  if (event.effect === 'globalBonus') solvent.forEach((player) => changeCoins(player, event.amount, event.title));
  if (event.effect === 'richTax') {
    const richest = [...solvent].sort((a, b) => netWorth(tiles, b) - netWorth(tiles, a))[0];
    const others = solvent.filter((player) => player !== richest);
    const share = Math.min(event.amount, Math.floor(Math.max(0, richest.coins) / Math.max(1, others.length)));
    await Promise.all(others.map((player) => transferCoins(richest, player, share, event.title)));
  }
  if (event.effect === 'rentBoostAll') solvent.forEach((player) => { player.rentBoost += 1; });
  if (event.effect === 'randomBuild') {
    const candidates = tiles.filter((tile) => tile.owner && tile.level < 4);
    if (candidates.length > 0) {
      const target = randomItem(candidates);
      target.level += 1;
      renderProperties(tiles.indexOf(target));
    } else {
      solvent.forEach((player) => changeCoins(player, 50, '翻新补助折现'));
    }
  }
  if (event.effect === 'randomBonus') changeCoins(randomItem(solvent), event.amount, event.title);
  renderHUD();
}

async function resolveDestinyRoulette(player) {
  hideActionPanel();
  gameAudio.play('roulette', .72);
  const event = await engineUI.showRoulette(!player?.isHuman && selectedMode === 'solo');
  await applyRouletteEvent(event);
}

function beginTurn() {
  if (gameEnded) return;
  const player = players[currentIndex];
  map3d.focusTile(player.position);
  renderHUD();
  currentTurnLabel = `${player.name} 的回合`;
  if (player.isHuman) {
    setRollChoicePanel(player);
  } else {
    hideActionPanel();
    notify(`${player.name} 思考中`, 'AI 正在评估土地与资金……');
    if (canUseInviteCard(player) && Math.random() < .3) {
      const target = randomItem(players.filter((item) => item !== player && !item.bankrupt));
      window.setTimeout(() => useInviteCard(player, target), 620);
      return;
    }
    const useControl = player.diceControlItems > 0 && (player.jailTurns > 0 || Math.random() < .35);
    window.setTimeout(() => takeTurn(player, useControl), 620);
  }
}

async function takeTurn(player, useControl = false) {
  if (player !== players[currentIndex] || player.bankrupt || gameEnded) return;
  if (useControl && player.diceControlItems <= 0) return;
  const controlledRange = useControl
    ? (player.isHuman ? gaugeRange() : randomItem(DICE_RANGES))
    : null;
  const controlledParity = useControl
    ? (player.isHuman ? pendingParity : (player.jailTurns > 0 ? 'even' : randomItem([null, 'odd', 'even'])))
    : null;
  if (useControl) player.diceControlItems -= 1;
  const forcedValues = useControl ? pickControlledDice(controlledRange, controlledParity) : null;
  renderHUD();
  const controlText = useControl
    ? `${controlledRange[0]}–${controlledRange[1]} 点${controlledParity ? `・${controlledParity === 'odd' ? '单数' : '双数'}` : ''}`
    : '';
  setRollStatus('骰子滚动中', controlText);
  notify('3D 骰子滚动中', '重力、碰撞与角速度都由物理引擎即时计算。');
  const diceVoice = gameAudio.play('dice', .7);
  const values = await dice3d.roll(forcedValues);
  gameAudio.fadeOut(diceVoice);
  if (!values || gameEnded) return;
  const steps = values[0] + values[1];
  setRollStatus(`掷出 ${steps} 点`, `${values[0]} + ${values[1]}`);
  await wait(700);
  if (player.jailTurns > 0) {
    if (values[0] === values[1]) {
      player.jailTurns = 0;
      await presentEvent(player, {
        kind: 'jail',
        cardId: 'jailEscape',
        kicker: '监狱判定',
        title: '双数脱困！',
        description: `${values[0]} + ${values[1]} 掷出双数，免费离开并前进 ${steps} 格。`,
        actionLabel: '离开监狱',
      });
    } else if (player.isHuman) {
      const actions = [];
      if (player.coins >= 80) {
        actions.push({
          label: '保释 $80',
          className: 'choice-button is-gold',
          run: async () => {
            player.jailTurns = 0;
            changeCoins(player, -80, '监狱保释');
            await movePlayer(player, steps);
            await resolveTile(player, tiles[player.position]);
          },
        });
      }
      actions.push({
        label: '留监一回',
        run: () => {
          player.jailTurns = 0;
          finishTurn();
        },
      });
      setPanel('没有掷出双数', `${values[0]} + ${values[1]}；支付保释金可照常前进，否则本次停留。`, actions);
      return;
    } else if (player.coins >= 360) {
      player.jailTurns = 0;
      changeCoins(player, -80, '监狱保释');
    } else {
      player.jailTurns = 0;
      finishTurn();
      return;
    }
  }
  hideActionPanel();
  await wait(170);
  notify(`${player.name} 掷出 ${steps} 点`, `${values[0]} + ${values[1]}`);
  await movePlayer(player, steps);
  await resolveTile(player, tiles[player.position]);
}

async function movePlayer(player, steps) {
  for (let step = 0; step < steps; step += 1) {
    const previous = player.position;
    player.position = (player.position + 1) % tiles.length;
    if (previous === tiles.length - 1 && player.position === 0) {
      changeCoins(player, PASS_START_BONUS, '经过起点');
      showLapBonus(player);
    }
    gameAudio.play('step', .32);
    await map3d.moveToken(player.id, player.position, 180);
  }
  separateTokens();
}

function showLapBonus(player) {
  engineUI.showLapBonus(player.name, PASS_START_BONUS);
}

async function movePlayerBackward(player, steps) {
  for (let step = 0; step < steps; step += 1) {
    player.position = (player.position - 1 + tiles.length) % tiles.length;
    gameAudio.play('step', .32);
    await map3d.moveToken(player.id, player.position, 195);
  }
  separateTokens();
}

async function resolveTile(player, tile) {
  if (gameEnded) return;
  hideActionPanel();
  notify(`抵达 ${tile.name}`, tile.type === 'property' ? REGIONS[tile.region].name : '特殊事件');
  if (tile.type === 'property') return resolveProperty(player, tile);
  if (tile.type === 'chance' || tile.type === 'fate') return resolveCardTile(player, tile.type);
  if (tile.type === 'train') return resolveTrain(player);
  if (tile.type === 'world') return resolveWorldTournament(player);
  if (tile.type === 'diceLab') return resolveDiceLab(player);
  if (tile.type === 'roulette') {
    await resolveDestinyRoulette(player);
    finishTurn();
    return;
  }
  if (tile.type === 'jail') {
    player.jailTurns = 1;
    await presentEvent(player, {
      kind: 'jail',
      cardId: 'jail',
      kicker: '旅程监狱',
      title: '暂停行程',
      description: '下次仍可掷骰；掷出双数免费离开，否则支付 $80 保释或停留一次。',
      actionLabel: '接受判定',
    });
    finishTurn();
    return;
  }

  if (await handleIfBankrupt(player)) return;
  await wait(620);
  finishTurn();
}

function describeStage(tile) {
  if (tile.level === 0) return '纯土地';
  if (tile.level < 4) return `${tile.level} 栋住宅`;
  return `${REGIONS[tile.region].landmark}地标`;
}

function nextConstruction(tile) {
  if (tile.level === 0) return { title: `在 ${tile.name} 建第 1 栋？`, label: '建第 1 栋', result: '1 栋住宅' };
  if (tile.level === 1) return { title: `加建 ${tile.name} 第 2 栋？`, label: '建第 2 栋', result: '2 栋住宅' };
  if (tile.level === 2) return { title: `加建 ${tile.name} 第 3 栋？`, label: '建第 3 栋', result: '3 栋住宅' };
  return {
    title: `升级为${REGIONS[tile.region].landmark}？`,
    label: '升级中国地标',
    result: `${REGIONS[tile.region].landmark}地标`,
  };
}

function chooseRentShield(player, rent, tile) {
  if (player.rentShield <= 0) return Promise.resolve(false);
  if (!player.isHuman) return Promise.resolve(rent >= 70 || player.coins < rent);
  return new Promise((resolve) => {
    setPanel(tile.name, `过路费 $${money(rent)}`, [
      {
        label: `使用免租券 ×${player.rentShield}`,
        className: 'choice-button is-gold',
        run: () => resolve(true),
      },
      { label: `支付 $${money(rent)}`, run: () => resolve(false) },
    ]);
  });
}

async function settleRent(payer, receiver, tile) {
  const baseRent = rentFor(tiles, tile);
  const useShield = await chooseRentShield(payer, baseRent, tile);
  hideActionPanel();
  if (useShield) {
    payer.rentShield -= 1;
    renderHUD();
    await showEffectBurst('免除过路费', `${payer.name} 使用免租券`);
    return 0;
  }

  const boostStacks = receiver.rentBoost;
  const finalRent = boostedRent(baseRent, boostStacks);
  if (boostStacks > 0) receiver.rentBoost = 0;
  renderHUD();
  await animateToll(baseRent, finalRent, boostStacks);
  await transferCoins(payer, receiver, finalRent, '支付过路费');
  return finalRent;
}

async function resolveProperty(player, tile) {
  const opponent = players.find((item) => item.id === tile.owner);
  const tileIndex = tiles.indexOf(tile);

  if (!tile.owner) {
    if (player.isHuman) {
      if (player.coins < tile.price) {
        setPanel('资金不足', `购买 ${tile.name} 需要 $${tile.price}`, [{ label: '结束回合', run: finishTurn }]);
        return;
      }
      setPanel(`买下 ${tile.name}？`, `地价 $${tile.price}`, [
        { label: `买地 $${tile.price}`, className: 'choice-button is-gold', run: () => buyProperty(player, tile, tileIndex) },
        { label: '略过', run: finishTurn },
      ]);
      return;
    }
    const shouldBuy = player.coins - tile.price >= 210;
    hideActionPanel();
    notify(shouldBuy ? `${player.name} 购买土地` : `${player.name} 保留资金`, tile.name);
    await wait(650);
    if (shouldBuy) buyProperty(player, tile, tileIndex); else finishTurn();
    return;
  }

  if (tile.owner === player.id) {
    if (tile.level >= 4) {
      hideActionPanel();
      notify('建筑已满级', `${tile.name} 已建成${REGIONS[tile.region].landmark}地标。`);
      await wait(560);
      finishTurn();
      return;
    }
    const cost = buildCost(tile);
    const construction = nextConstruction(tile);
    if (player.isHuman) {
      if (player.coins < cost) {
        setPanel('建造资金不足', `${construction.label}需要 $${cost}`, [{ label: '结束回合', run: finishTurn }]);
        return;
      }
      setPanel(construction.title, `${describeStage(tile)} → ${construction.result}`, [
        { label: `${construction.label} $${cost}`, className: 'choice-button is-gold', run: () => upgradeProperty(player, tile, tileIndex) },
        { label: '保留资金', run: finishTurn },
      ]);
      return;
    }
    const shouldBuild = player.coins - cost >= 230;
    hideActionPanel();
    notify(shouldBuild ? `${player.name} ${construction.label}` : `${player.name} 保留资金`, shouldBuild ? `${tile.name}：${describeStage(tile)} → ${construction.result}` : '暂时不建造');
    await wait(620);
    if (shouldBuild) upgradeProperty(player, tile, tileIndex); else finishTurn();
    return;
  }

  const rent = await settleRent(player, opponent, tile);
  if (await handleIfBankrupt(player)) return;

  const buyout = assetValue(tile) * 2;
  if (player.isHuman) {
    if (player.coins < buyout) {
      setPanel(`${tile.name} ${rent > 0 ? '已付过路费' : '免租'}`, `强买价 $${buyout}，资金不足`, [{ label: '结束回合', run: finishTurn }]);
      return;
    }
    setPanel(`强买 ${tile.name}？`, `强买价 $${buyout}`, [
      { label: `2 倍强买 $${buyout}`, className: 'choice-button is-danger', run: () => forceBuy(player, opponent, tile, buyout, tileIndex) },
      { label: '不强买', run: finishTurn },
    ]);
    return;
  }

  const completesSet = tiles.filter((item) => item.type === 'property' && item.region === tile.region && item.owner === player.id).length === 2;
  const shouldBuyout = player.coins - buyout >= 240 && (completesSet || tile.level >= 2);
  hideActionPanel();
  notify(shouldBuyout ? `${player.name} 发动强买！` : `${player.name} 放弃强买`, shouldBuyout ? `支付 $${buyout}` : '保留现金');
  await wait(720);
  if (shouldBuyout) forceBuy(player, opponent, tile, buyout, tileIndex); else finishTurn();
}

function buyProperty(player, tile, tileIndex) {
  changeCoins(player, -tile.price, '购买土地');
  gameAudio.play('purchase', .8);
  tile.owner = player.id;
  tile.level = 0;
  renderHUD();
  renderProperties();
  notify('购地完成！', `${player.name} 买下 ${tile.name}`);
  checkNewSet(player, tile.region);
  window.setTimeout(finishTurn, 720);
}

function upgradeProperty(player, tile, tileIndex) {
  const cost = buildCost(tile);
  changeCoins(player, -cost, '升级建筑');
  gameAudio.play('build', .82);
  tile.level += 1;
  renderHUD();
  renderProperties(tileIndex);
  notify(tile.level === 4 ? '中国地标落成！' : '住宅建造完成！', `${tile.name} 现在是${describeStage(tile)}`);
  window.setTimeout(finishTurn, 720);
}

async function forceBuy(player, opponent, tile, cost, tileIndex) {
  await transferCoins(player, opponent, cost, '强制收购');
  tile.owner = player.id;
  renderHUD();
  renderProperties(tileIndex);
  notify('2 倍强买成功！', `${tile.name} 与${describeStage(tile)}全部易主`);
  checkNewSet(player, tile.region);
  window.setTimeout(finishTurn, 820);
}

function coinTransferPoint(player) {
  return engineUI.hudPoints.get(player.id) || null;
}

function animateCoinTransfer(from, to, amount) {
  return engineUI.animateCoinTransfer(from.id, to.id, amount);
}

async function transferCoins(from, to, amount, reason) {
  if (amount <= 0 || from === to) return;
  await animateCoinTransfer(from, to, amount);
  changeCoins(from, -amount, reason);
  changeCoins(to, amount, reason);
}

function checkNewSet(player, region) {
  if (ownsFullRegion(tiles, player.id, region)) {
    notify('同区制霸・租金 ×2！', `${player.name} 集齐 ${REGIONS[region].name} 三座城市`);
  }
}

function changeCoins(player, amount, reason) {
  player.coins += amount;
  if (amount > 0) gameAudio.play('coin', .55);
  renderHUD();
  engineUI.showCoinBurst(player.id, amount);
}

function liquidationValue(tile) {
  const sourceValue = tile.level > 0 ? buildCost(tile) : tile.price;
  return Math.round(sourceValue * .7);
}

function liquidationLabel(tile) {
  if (tile.level === 4) return `${tile.name}地标`;
  if (tile.level > 0) return `${tile.name}房屋`;
  return `${tile.name}土地`;
}

function liquidateOneAsset(player, tile) {
  const saleValue = liquidationValue(tile);
  const label = liquidationLabel(tile);
  if (tile.level > 0) tile.level -= 1;
  else {
    tile.owner = null;
    tile.level = 0;
  }
  changeCoins(player, saleValue, '出售房产');
  renderProperties();
  return { saleValue, label };
}

async function attemptAssetLiquidation(player) {
  while (player.coins < 0) {
    const owned = tiles.filter((tile) => tile.owner === player.id);
    if (owned.length === 0) return false;

    let selected;
    if (player.isHuman) {
      selected = await new Promise((resolve) => {
        setPanel('现金不足', `尚缺 ${money(-player.coins)}`, owned.map((tile) => ({
          label: `卖 ${liquidationLabel(tile)} +${money(liquidationValue(tile))}`,
          className: tile.level > 0 ? 'choice-button is-gold' : 'choice-button',
          run: () => resolve(tile),
        })));
        // 资产列表由引擎面板承载。
      });
    } else {
      selected = [...owned].sort((a, b) => {
        if ((a.level > 0) !== (b.level > 0)) return a.level > 0 ? -1 : 1;
        return liquidationValue(a) - liquidationValue(b);
      })[0];
    }

    const { saleValue, label } = liquidateOneAsset(player, selected);
    if (player.isHuman) await showEffectBurst(`出售${label}`, `现金 +${money(saleValue)}`);
    else await wait(140);
  }
  renderHUD();
  return true;
}

async function handleIfBankrupt(player) {
  if (player.coins >= 0 || player.bankrupt) return false;
  if (await attemptAssetLiquidation(player)) return false;
  player.bankrupt = true;
  map3d.setPlayerVisible(player.id, false);
  tiles.forEach((tile) => {
    if (tile.owner === player.id) {
      tile.owner = null;
      tile.level = 0;
    }
  });
  renderHUD();
  renderProperties();
  await showBankruptcy(player);
  const survivors = players.filter((item) => !item.bankrupt);
  if (survivors.length === 1) {
    endGame(`${survivors[0].name} 成为最后一位未破产的玩家。`);
  } else {
    finishTurn();
  }
  return true;
}

function showBankruptcy(player) {
  gameAudio.play('bankrupt', .82);
  hideActionPanel();
  return engineUI.showBankruptcy(player, !player.isHuman && selectedMode === 'solo');
}

function finishTurn() {
  if (gameEnded) return;
  let next = currentIndex;
  let wrapped = false;
  do {
    next = (next + 1) % players.length;
    if (next === 0) wrapped = true;
  } while (players[next].bankrupt && next !== currentIndex);

  if (wrapped) {
    if (round >= MAX_ROUNDS) {
      endGame('限时竞赛结束，以现金加上所有土地与建筑价值决胜。');
      return;
    }
    round += 1;
  }
  currentIndex = next;
  renderHUD();
  beginTurn();
}

function endGame(reason) {
  if (gameEnded) return;
  gameEnded = true;
  gameAudio.play('win', .82);
  hideActionPanel();
  const ranking = [...players].sort((a, b) => netWorth(tiles, b) - netWorth(tiles, a));
  renderHUD();
  engineUI.showResults(ranking, tiles, reason);
}

const previewFlow = new URLSearchParams(window.location.search).get('preview');
const previewEnabled = import.meta.env.DEV || ['127.0.0.1', 'localhost'].includes(window.location.hostname);
if (previewEnabled && previewFlow === 'bankruptcy') {
  startGame().then(async () => {
    players[0].coins = -50;
    await handleIfBankrupt(players[0]);
  });
}
if (previewEnabled && previewFlow === 'result') {
  startGame().then(() => {
    players[0].coins = 1680;
    players[1].coins = 1310;
    players[2].coins = 940;
    players[3].coins = 520;
    endGame('限时竞赛结束，以现金加上所有土地与建筑价值决胜。');
  });
}
if (previewEnabled && previewFlow === 'ownership') {
  startGame().then(() => {
    [1600, 1300, 1000, 700].forEach((coins, playerIndex) => {
      players[playerIndex].coins = coins;
    });
    [1, 2, 3].forEach((tileIndex, level) => {
      tiles[tileIndex].owner = players[0].id;
      tiles[tileIndex].level = level;
    });
    [9, 17, 25].forEach((tileIndex, offset) => {
      const playerIndex = offset + 1;
      tiles[tileIndex].owner = players[playerIndex].id;
      tiles[tileIndex].level = [1, 3, 4][offset];
      players[playerIndex].position = tileIndex;
    });
    players[0].position = 1;
    renderProperties();
    separateTokens();
    map3d.focusTile(2, { immediate: true });
    renderHUD();
    hideActionPanel();
    notify('购地建筑进程', '纯土地、1 栋、3 栋、中国地标；四位玩家色彩完整覆盖。');
  });
}
if (previewEnabled && previewFlow === 'side-orientation') {
  startGame().then(() => {
    [10, 11, 12].forEach((tileIndex, offset) => {
      tiles[tileIndex].owner = players[0].id;
      tiles[tileIndex].level = offset;
    });
    players[0].position = 11;
    renderProperties();
    separateTokens();
    map3d.focusTile(11, { immediate: true });
    renderHUD();
    hideActionPanel();
  });
}
if (previewEnabled && previewFlow === 'landmarks') {
  startGame().then(() => {
    [1, 5, 9, 13, 17, 21, 25, 29].forEach((tileIndex, offset) => {
      const owner = players[offset % players.length];
      tiles[tileIndex].owner = owner.id;
      tiles[tileIndex].level = 4;
    });
    renderProperties();
    hideActionPanel();
  });
}
if (previewEnabled && previewFlow === 'roulette') {
  startGame().then(() => resolveDestinyRoulette(players[0]));
}
if (previewEnabled && previewFlow === 'lap') {
  startGame().then(async () => {
    players[0].position = tiles.length - 1;
    separateTokens();
    map3d.focusTile(players[0].position, { immediate: true });
    await movePlayer(players[0], 1);
  });
}
if (previewEnabled && previewFlow === 'dice-control') {
  startGame().then(() => {
    players[0].diceControlItems = 1;
    renderHUD();
    setRollChoicePanel(players[0]);
  });
}
if (previewEnabled && previewFlow === 'dice-roll') {
  startGame().then(() => takeTurn(players[0], false));
}
if (previewEnabled && previewFlow === 'toll') {
  startGame().then(async () => {
    tiles[1].owner = players[1].id;
    tiles[1].level = 2;
    players[0].position = 1;
    players[0].rentShield = 1;
    renderProperties();
    separateTokens();
    map3d.focusTile(1, { immediate: true });
    renderHUD();
    hideActionPanel();
    await resolveProperty(players[0], tiles[1]);
  });
}
if (previewEnabled && previewFlow === 'effects') {
  startGame().then(async () => {
    tiles[1].owner = players[0].id;
    tiles[1].level = 3;
    players[0].rentShield = 2;
    players[0].rentBoost = 2;
    players[0].inviteCards = 2;
    players[0].diceControlItems = 1;
    players[1].position = 7;
    renderProperties();
    renderHUD();
    separateTokens();
    hideActionPanel();
    await wait(500);
    await useInviteCard(players[0], players[1]);
  });
}
if (previewEnabled && previewFlow === 'travel') {
  startGame().then(() => {
    hideActionPanel();
    chooseTravelDestination(players[0]);
  });
}
if (previewEnabled && previewFlow === 'liquidation') {
  startGame().then(async () => {
    tiles[1].owner = players[0].id;
    tiles[1].level = 2;
    tiles[2].owner = players[0].id;
    tiles[2].level = 0;
    players[0].coins = -120;
    renderProperties();
    renderHUD();
    hideActionPanel();
    await handleIfBankrupt(players[0]);
  });
}
if (previewEnabled && previewFlow === 'transfer') {
  startGame().then(async () => {
    hideActionPanel();
    await wait(420);
    await transferCoins(players[0], players[3], 240, '转账预览');
  });
}
if (previewEnabled && previewFlow === 'card') {
  startGame().then(() => presentEvent(players[1], {
    kind: 'chance',
    cardId: 'precision-dice',
    kicker: '机会卡',
    title: '精准骰子券',
    description: '获得 1 次骰子控制；之后可选点数区间并指定单数或双数。',
    actionLabel: '确定',
    reveal: true,
  }));
}
