#!/usr/bin/env node
const assert=require('node:assert/strict');
const rules=require('../src/combatRules.js');

assert.equal(rules.matchup('cavalry','archer'),1.9,'騎兵對弓兵必須獲得 1.9 倍傷害');
assert.equal(rules.matchup('archer','cavalry'),.6,'弓兵對騎兵必須降為 0.6 倍傷害');
assert.equal(rules.matchup('guard','cavalry'),1.9,'槍盾必須剋騎兵');
assert.equal(rules.matchup('archer','guard'),1.9,'弓兵必須剋槍盾');
assert.equal(rules.damage('hero','archer'),rules.units.hero.atk,'趙雲普通攻擊不應偷加倍率');
assert.equal(rules.damage('hero','archer',rules.units.hero.atk,rules.units.hero.chargeMultiplier),rules.units.hero.atk*2.2,'趙雲衝鋒第一擊必須是 2.2 倍');
assert.ok(rules.units.guard.visualScale<rules.units.hero.visualScale,'普通士兵必須比武將更小');
assert.ok(rules.units.hero.visualScale>=rules.units.guard.visualScale*2.5,'戰場武將至少必須是步兵的 2.5 倍大');
assert.ok(rules.units.hero.stationScale<rules.units.hero.visualScale,'武將進駐城寨後必須縮小，不能遮住駐軍數字');
assert.ok(rules.units.guard.speed<=55&&rules.units.archer.speed<=55,'步兵單段行軍速度必須受到限制');
assert.ok(rules.units.hero.speed>rules.units.cavalry.speed,'趙雲行軍速度必須高於騎兵');
assert.equal(rules.units.guard.squad,6,'槍盾必須以六人小隊出兵');
assert.equal(rules.units.archer.squad,6,'弓兵必須以六人小隊出兵');
assert.equal(rules.units.cavalry.squad,4,'騎兵必須以四騎小隊出兵');

for(const kind of ['guard','archer','cavalry']){
  const mirror=rules.simulateSquadDuel(kind,kind);
  assert.equal(mirror.winner,'draw',`${kind} 鏡像戰必須同步打平`);
  assert.equal(mirror.hpA,mirror.hpB,`${kind} 鏡像戰剩餘生命必須相同`);
}

const expected=[['cavalry','archer'],['guard','cavalry'],['archer','guard']];
for(const [winner,loser] of expected){
  const result=rules.simulateSquadDuel(winner,loser);
  assert.equal(result.winner,winner,`${winner} 必須穩定擊敗 ${loser}: ${JSON.stringify(result)}`);
  assert.ok(result.survivorsA>=1,`${winner} 勝利後至少要保留一名可見兵力`);
}

console.log(JSON.stringify({
  mirror:['guard','archer','cavalry'].map(k=>[k,rules.simulateSquadDuel(k,k)]),
  counters:expected.map(([a,b])=>[`${a}>${b}`,rules.simulateSquadDuel(a,b)]),
},null,2));
