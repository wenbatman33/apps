import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANCE_CARDS,
  FATE_CARDS,
  REGIONS,
  ROULETTE_EVENTS,
  TILE_POSITIONS,
  assetValue,
  boostedRent,
  buildCost,
  createTiles,
  netWorth,
  ownsFullRegion,
  pickControlledDice,
  rentFor,
} from '../src/game-data.js';

test('棋盘包含 32 格与八区各三座可购买城市', () => {
  const tiles = createTiles();
  assert.equal(tiles.length, 32);
  assert.equal(TILE_POSITIONS.length, 32);
  assert.equal(tiles.filter((tile) => tile.type === 'property').length, 24);
  assert.equal(Object.keys(REGIONS).length, 8);
  for (const region of Object.keys(REGIONS)) {
    assert.equal(tiles.filter((tile) => tile.region === region).length, 3);
  }
});

test('集齐同区三城后租金乘二', () => {
  const tiles = createTiles();
  const group = tiles.filter((tile) => tile.region === 'sapphire');
  group.forEach((tile) => { tile.owner = 'human'; tile.level = 1; });
  assert.equal(ownsFullRegion(tiles, 'human', 'sapphire'), true);
  assert.equal(rentFor(tiles, group[0]), group[0].baseRent * 2);
});

test('购地后是纯土地，三栋后再升级地标', () => {
  const tiles = createTiles();
  const tile = tiles.find((item) => item.type === 'property');
  tile.owner = 'human';
  tile.level = 0;
  const landRent = rentFor(tiles, tile);
  const landValue = assetValue(tile);
  assert.equal(landValue, tile.price);
  for (const expectedLevel of [1, 2, 3, 4]) {
    tile.level += 1;
    assert.equal(tile.level, expectedLevel);
  }
  assert.ok(rentFor(tiles, tile) > landRent);
  assert.equal(assetValue(tile), landValue + buildCost(tile) * 4);
});

test('总资产包含现金与名下房产', () => {
  const tiles = createTiles();
  tiles[1].owner = 'human';
  tiles[1].level = 0;
  const player = { id: 'human', coins: 700 };
  assert.equal(netWorth(tiles, player), 700 + tiles[1].price);
});

test('棋盘具备可实际触发的趣味格', () => {
  const types = new Set(createTiles().map((tile) => tile.type));
  for (const type of ['chance', 'fate', 'train', 'world', 'jail', 'roulette', 'diceLab']) {
    assert.equal(types.has(type), true, `缺少 ${type} 格`);
  }
});

test('骰子控制同时遵守蓄力区间与单双条件', () => {
  for (const [range, parity] of [
    [[2, 5], 'odd'],
    [[5, 8], 'even'],
    [[8, 12], 'odd'],
  ]) {
    const values = pickControlledDice(range, parity, () => 0.62);
    const sum = values[0] + values[1];
    assert.ok(sum >= range[0] && sum <= range[1]);
    assert.equal(sum % 2, parity === 'odd' ? 1 : 0);
    assert.ok(values.every((value) => value >= 1 && value <= 6));
  }
});

test('机会命运与轮盘涵盖移动、建设、防御、租金与全场效果', () => {
  assert.equal(CHANCE_CARDS.length, 7);
  assert.equal(FATE_CARDS.length, 5);
  assert.equal(ROULETTE_EVENTS.length, 5);
  const effects = new Set([...CHANCE_CARDS, ...FATE_CARDS, ...ROULETTE_EVENTS].map((card) => card.effect));
  for (const effect of ['travelChoice', 'backward', 'freeBuild', 'rentShield', 'inviteCard', 'diceControl', 'rentBoost', 'globalBonus', 'wealthTransfer']) {
    assert.equal(effects.has(effect), true, `缺少 ${effect} 效果`);
  }
});

test('过路费加成卡可累积，每张增加五成', () => {
  assert.equal(boostedRent(100, 0), 100);
  assert.equal(boostedRent(100, 1), 150);
  assert.equal(boostedRent(100, 2), 200);
  assert.equal(boostedRent(80, 3), 200);
});
