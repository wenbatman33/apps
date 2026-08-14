#!/usr/bin/env node
const assert=require('node:assert/strict');
const fs=require('node:fs');
const rules=require('../src/campaignRules.js');

assert.deepEqual(rules.GRID,{cols:24,rows:42,tile:30,width:720,height:1260},'戰場必須固定為 24×42、每格 30px');
assert.equal(rules.settings.matchSeconds,180,'人海據點戰必須保留三分鐘決策時間');
assert.equal(rules.reward(true),3,'勝利軍功必須為 3');
assert.equal(rules.reward(false),1,'戰敗仍必須有 1 軍功');
assert.equal(rules.supplyRate(3),1.9,'三座城寨必須加速 90% 補給：攻寨要有明顯滾雪球回饋');
assert.ok(rules.settings.baseHp>=6000,'主城不可被少量兵力瞬間摧毀');
assert.ok(rules.settings.baseHp/rules.settings.siegeDamage<=12,'主城必須能在一波大軍內被攻破，否則勝利條件形同虛設');
assert.equal(rules.settings.tacticCooldown,18,'拒馬陣必須有獨立 18 秒冷卻');
assert.equal(rules.settings.blockadeDuration,5.5,'拒馬陣必須阻軍 5.5 秒');
assert.ok(rules.settings.enemyTacticCooldown>=rules.settings.tacticCooldown,'AI 不可比玩家更頻繁施放計略');
assert.equal(rules.settings.heroSpawnBonus,.08,'每名武將進駐只能提高全軍總補兵 8%，不可讓單城暴兵');
assert.equal(rules.settings.commanderPerLevel,.08,'趙雲每級統率加成必須為 8%');
assert.equal(rules.settings.baseStartGarrison,20,'雙方主城開局駐軍必須完全相同');
assert.equal(rules.settings.neutralGarrison,6,'中立城寨必須有六名守軍');
assert.equal(rules.dispatchCount(20),12,'駐軍二十人必須能一次派出十二人：出兵量要對得起城裡的兵');
assert.equal(rules.dispatchCount(54),32,'滿編主城單波仍受上限保護，不可一次清空');
assert.equal(rules.dispatchCount(8),4,'駐軍八人時畫面必須只派出四名士兵');
assert.equal(rules.dispatchCount(1),0,'一名守軍不可把城寨派空');
assert.ok(rules.settings.manualDispatchCooldown<=.5,'連續出兵的等待必須短到不打斷節奏');
assert.equal(rules.garrisonCapacity('base'),54,'主城必須有明確駐軍上限');
assert.equal(rules.garrisonCapacity('outpost'),32,'城寨必須有明確駐軍上限');
assert.ok(rules.recruitInterval('outpost',3,1,false)<rules.recruitInterval('outpost',0,1,false),'持有更多城寨必須縮短募兵時間');
assert.ok(rules.recruitInterval('outpost',0,.32,false)>rules.recruitInterval('outpost',0,1,false),'受損城寨的募兵必須比完整城寨慢');
assert.equal(rules.totalRecruitRate(2,0),rules.totalRecruitRate(2,0),'相同寨數的敵我總補兵速度必須完全相同');
assert.ok(rules.totalRecruitRate(3,0)>rules.totalRecruitRate(0,0),'攻下城寨必須提高全軍共享補兵速度');
assert.ok(rules.totalRecruitRate(3,1)>rules.totalRecruitRate(3,0),'武將進駐必須提高共享補兵速度');
assert.ok(rules.repairIntegrity(.32,5,false)>.32,'已佔領的受損城寨必須隨時間修復');

for(const map of rules.maps){
  const ids=new Set(map.nodes.map(n=>n.id));
  assert.equal(ids.size,map.nodes.length,`${map.name} 節點 id 不可重複`);
  assert.equal(map.nodes.filter(n=>n.type==='base').length,2,`${map.name} 必須有雙方主城`);
  for(const node of map.nodes){
    assert.ok(node.cell.c>=0&&node.cell.c<rules.GRID.cols&&node.cell.r>=0&&node.cell.r<rules.GRID.rows,`${map.name} ${node.id} 必須位於格內`);
    assert.ok(map.walkable.has(rules.key(node.cell.c,node.cell.r)),`${map.name} ${node.id} 入口必須可行走`);
  }
  const player=map.nodes.find(n=>n.id==='player'),enemy=map.nodes.find(n=>n.id==='enemy');
  for(const[a,b]of map.edges){
    assert.ok(ids.has(a)&&ids.has(b),`${map.name} 道路端點必須存在`);
    const forward=rules.routePoints(map,a,b),reverse=rules.routePoints(map,b,a);
    assert.ok(forward.length>=2,`${map.name} ${a}>${b} 必須有行軍格`);
    assert.deepEqual(forward,[...reverse].reverse(),`${map.name} ${a}/${b} 正反方向必須共用同一條路`);
    for(let i=1;i<forward.length;i++){
      const dx=Math.abs(forward[i].x-forward[i-1].x),dy=Math.abs(forward[i].y-forward[i-1].y);
      assert.equal(dx+dy,rules.GRID.tile,`${map.name} ${a}>${b} 第 ${i} 步只能上下左右移動一格`);
      assert.ok(dx===0||dy===0,`${map.name} ${a}>${b} 不可斜行`);
    }
  }
  for(const bridge of map.bridgeTiles){
    assert.ok(map.walkable.has(bridge),`${map.name} 橋格必須也是實際道路`);
    assert.ok(map.obstacleTiles.has(bridge),`${map.name} 橋只能出現在河流格`);
  }
  const strategic=rules.shortestPath(map,'player','enemy');
  assert.ok(strategic.length>=3,`${map.name} 主城間必須至少經過一座城寨`);
  assert.equal(strategic[0],'player');assert.equal(strategic.at(-1),'enemy');
  const firstLeg=id=>Math.min(...rules.adjacency(map)[id].map(next=>rules.routePoints(map,id,next).length-1));
  assert.ok(Math.abs(firstLeg('player')-firstLeg('enemy'))<=6,`${map.name} 雙方抵達最近城寨的步數差不可超過六格`);
}

const battleSource=fs.readFileSync(require.resolve('../src/battle.js'),'utf8');
assert.ok(!battleSource.includes('finishByScore'),'時間到不可再用據點分數直接判勝');
assert.match(battleSource,/base\.hp<=0\)this\.collapseBase/,'只有主城生命歸零才能觸發主城陷落');
assert.equal((battleSource.match(/this\.endBattle\(/g)||[]).length,1,'不可存在第二條繞過主城陷落的勝負入口');
assert.match(battleSource,/setTexture\('keep_fallen_v7'\)/,'主城陷落後必須先換成真實毀損素材');
assert.match(battleSource,/CampaignRules\.routePoints\(this\.map,fromId,toId\)/,'實際士兵必須使用格狀道路資料');
assert.doesNotMatch(battleSource,/Angle\.Between\(from\.x,from\.y,to\.x,to\.y\)/,'路線提示不得再用節點直線假裝道路');

const assetSource=fs.readFileSync(require.resolve('../src/assets.js'),'utf8');
assert.match(assetSource,/tile_plains_autotile_v9:[\s\S]*frameWidth:128,frameHeight:128/,'道路必須以透明 4×4 spritesheet 載入');
assert.match(assetSource,/jingzhou_level1_master_v1:'backgrounds\/campaign\/jingzhou_level1_master_v1\.png'/,'第一關必須載入生成式完整戰場 PNG');
assert.match(assetSource,/jingzhou_level1_walkable_v1:'navigation\/jingzhou_level1_walkable_v1\.png'/,'第一關必須載入逐像素通行遮罩');
assert.match(battleSource,/this\.manualDispatch\(source,node\)/,'點完起點與目標必須立即出兵');
assert.match(battleSource,/RULES\.fieldUnitCap-fieldCount/,'敵我雙方必須共用可見的場上人口上限');
assert.match(battleSource,/updateGarrisons\(dt\)/,'戰場必須逐點累積城內駐軍');
assert.match(battleSource,/this\.recruitBudget\[side\]\+=dt\*this\.spawnMultiplier\*CampaignRules\.totalRecruitRate/,'雙方必須使用可核對的共享總補兵額度');
assert.doesNotMatch(battleSource,/node\.spawnClock-=dt/,'不可再讓每座城寨各自生成一整份兵力');
assert.match(battleSource,/CampaignRules\.dispatchCount\(source\.garrison\)/,'出兵量必須直接取決於來源城寨駐軍');
assert.match(battleSource,/this\.spawnUnit\(side,kind[\s\S]*this\.updateNodeVisual\(source\);\n    return qty/,'建立完所有士兵後必須立即同步顯示駐軍與行軍人數');
assert.match(battleSource,/target\.garrison--/,'進攻兵必須先與城內守軍一比一抵消');
assert.match(battleSource,/condition=RULES\.capturedIntegrity/,'城寨換手後必須進入受損修復狀態');
assert.doesNotMatch(battleSource,/updateCaptures|captureRate/,'不得再用隱藏占領百分比取代可見駐軍');
assert.doesNotMatch(battleSource,/updateProduction|spawnWave/,'不得再由城寨自動把單兵吐到路上');
assert.doesNotMatch(battleSource,/if\(this\.commandMode!==['"]route['"]\)this\.setMode/,'點戰場不可暗中切換成派兵模式');
assert.match(battleSource,/點我方城 →/,'派兵操作必須明示點選流程');
assert.match(battleSource,/installBattlefieldPointerInput\(\)/,'PC 必須有一套自訂的戰場指標輸入');
assert.doesNotMatch(battleSource,/dragDistanceThreshold|setDraggable/,'不可再依賴 Phaser drag 系統：畫布縮放後門檻與 hit-test 都會失準');
assert.match(battleSource,/this\.input\.on\('pointermove'/,'拖曳必須由場景層的 pointermove 自行判定');
assert.match(battleSource,/radiusX=node\.type==='base'\?102:88/,'城寨必須提供比建築更大的橢圓命中範圍');
assert.match(battleSource,/const direct=this\.nodeAtPointer\(pointer\);if\(direct&&direct!==source\)return direct/,'拖到城寨上必須直接命中該城，不可再靠角度猜目標');
assert.match(battleSource,/keydown-SPACE/,'必須保留一鍵全軍出擊');
assert.match(battleSource,/dragDirectionTarget\(source,pointer\)/,'PC 拖曳必須依道路方向選擇目標，不可要求拖到遠方建築');
assert.doesNotMatch(battleSource,/Distance\.Between\(pointer\.x,mapY,target\.x,target\.y\)>135/,'PC 拖曳不得再要求游標精準落在遠方城寨上');
assert.match(battleSource,/hero:zhaoyun/,'下方軍令必須可選趙雲');
assert.match(battleSource,/hero:guanyu/,'下方軍令必須可選關羽');
assert.match(battleSource,/hero:zhangfei/,'下方軍令必須可選張飛');
assert.match(battleSource,/hero:machao/,'下方軍令必須可選馬超');
assert.match(battleSource,/hero:huangzhong/,'下方軍令必須可選黃忠');
assert.match(assetSource,/machao:'characters\/machao_v1\.png'/,'馬超必須載入真實八格 PNG 動作素材');
assert.match(assetSource,/huangzhong:'characters\/huangzhong_v1\.png'/,'黃忠必須載入真實八格 PNG 動作素材');
assert.match(battleSource,/resolveHeroMission/,'武將必須可派駐或直接進攻城寨');
assert.match(battleSource,/u\.wait=Infinity/,'進駐武將不可因隱藏倒數而失去重新下令能力');
assert.match(battleSource,/heroIsStationed\(hero\)/,'武將進駐狀態必須由任務與所在城寨判定');
assert.match(battleSource,/updateNodeDefense/,'有駐軍的城寨必須射箭回擊');
assert.match(battleSource,/this\.enemyDecisionClock-=dt/,'敵軍全軍必須共用一個決策冷卻，不可每城同時暴兵');
assert.doesNotMatch(battleSource,/仍在行軍，抵達後才能再派/,'不得再用「上一隊未抵達」擋住玩家連續出兵');
assert.doesNotMatch(battleSource,/updatePlayerOrders/,'不得再自動重複執行上一道行軍令，出兵必須完全由玩家掌控');
assert.match(battleSource,/const path=CampaignRules\.shortestPath\(this\.map,source\.id,target\.id\)/,'必須支援派往任一連通城寨的長程行軍');
assert.match(battleSource,/if\(this\.advanceAlongPath\(u,target\)\)return/,'部隊經過友軍城寨必須繼續前進，不可被中途吸收');
assert.match(battleSource,/source\.garrison>=6/,'敵軍開局兵力足夠時必須主動出擊');
assert.match(battleSource,/updateBlockades\(dt\)/,'拒馬陣必須具有實際持續時間');
assert.match(battleSource,/this\.isBlocked\(u\)/,'拒馬陣必須實際停止敵軍行進');
assert.match(assetSource,/blockade_v12:'effects\/blockade_v12\.png'/,'拒馬陣必須載入真實 PNG 素材');

console.log(JSON.stringify({grid:rules.GRID,maps:rules.maps.map(m=>({name:m.name,walkable:m.walkable.size,roadTiles:m.roadTiles.size,path:rules.shortestPath(m,'player','enemy')}))},null,2));
