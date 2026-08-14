#!/usr/bin/env node
/* v2 核心規則測試：不開瀏覽器就能驗證地圖、出兵、對撞、佔領與勝負。 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const MapData=require('../src/core/mapData.js');
const MatchState=require('../src/core/state.js');
const MatchAI=require('../src/core/ai.js');

const maps=MapData.levelIds().map(id=>MapData.loadLevel(id,fs,path));
assert.equal(maps.length,5,'必須有五張關卡地圖');

for(const map of maps){
  assert.ok(map.byId.player&&map.byId.enemy,`${map.name} 必須有雙方主城`);
  assert.equal(map.nodes.filter(node=>node.type==='base').length,2,`${map.name} 只能有兩座主城`);
  assert.ok(map.edges.length>=map.nodes.length-1,`${map.name} 道路數不足以連通全圖`);
  const reachable=map.shortestPath('player','enemy');
  assert.ok(reachable.length>=2,`${map.name} 玩家必須能走到敵方主城`);
  for(const node of map.nodes)assert.ok(map.shortestPath('player',node.id).length>=1,`${map.name} ${node.id} 必須可抵達`);
  for(const edge of map.edges){
    assert.ok(edge.line.length>0,`${map.name} ${edge.key} 道路長度必須為正`);
    const start=MapData.pointAt(edge.line,0),end=MapData.pointAt(edge.line,edge.line.length);
    const a=map.byId[edge.a],b=map.byId[edge.b];
    assert.ok(Math.hypot(start.x-a.x,start.y-a.y)<1,`${map.name} ${edge.key} 起點必須貼齊節點`);
    assert.ok(Math.hypot(end.x-b.x,end.y-b.y)<1,`${map.name} ${edge.key} 終點必須貼齊節點`);
  }
}

/* 出兵：派出一半、來源立刻扣兵、串流會實際生出士兵。 */
{
  const match=MatchState.create(maps[0],{seed:7});
  const base=match.nodes.player;
  const before=base.troops;
  const target=match.map.adjacency.player[0];
  const sent=MatchState.dispatch(match,'player',target,match.config.dispatchRatio);
  assert.equal(sent,Math.floor(before*.5),'單擊必須派出駐軍的一半');
  assert.equal(base.troops,before-sent,'來源城寨必須立刻扣掉派出的兵');
  for(let i=0;i<40;i++)MatchState.step(match,.05);
  assert.ok(match.soldiers.length>0,'出兵後路上必須看得到士兵');
  assert.ok(match.soldiers.every(s=>s.side===0),'我方出兵不可生出敵軍');
}

/* 佔領：中立城寨兵被打完就換手。 */
{
  const match=MatchState.create(maps[0],{seed:11});
  const targetId=match.map.adjacency.player[0];
  match.nodes.player.troops=60;
  MatchState.dispatch(match,'player',targetId,1);
  for(let i=0;i<600&&match.nodes[targetId].owner!==0;i++)MatchState.step(match,.05);
  assert.equal(match.nodes[targetId].owner,0,'兵力足夠時必須攻下中立城寨');
  assert.ok(match.nodes[targetId].troops>=1,'攻下的城寨必須留下佔領兵');
}

/* 中立城寨不生產，佔領後才會長兵。 */
{
  const match=MatchState.create(maps[0],{seed:3});
  const neutral=Object.values(match.nodes).find(node=>node.owner<0);
  const before=neutral.troops;
  for(let i=0;i<200;i++)MatchState.step(match,.05);
  assert.equal(neutral.troops,before,'中立城寨不可自己長兵');
  neutral.owner=0;
  for(let i=0;i<200;i++)MatchState.step(match,.05);
  assert.ok(neutral.troops>before,'佔領後必須開始生產');
}

/* 路上對撞：敵我正面相遇必須 1 換 1，不可穿透。 */
{
  const match=MatchState.create(maps[0],{seed:5});
  const targetId=match.map.adjacency.player[0];
  match.nodes[targetId].owner=1;match.nodes[targetId].troops=40;
  match.nodes.player.troops=40;
  MatchState.dispatch(match,'player',targetId,1);
  MatchState.dispatch(match,targetId,'player',1);
  let duels=0;
  for(let i=0;i<400;i++){MatchState.step(match,.05);duels+=match.events.filter(e=>e.type==='duel').length;}
  assert.ok(duels>0,'兩軍在同一條路相向而行必須發生對撞');
  assert.equal(match.stats.lost[0],match.stats.lost[1],'對撞必須是一兵抵一兵');
}

/* 友軍城寨是中繼站，不可把過路部隊吸收掉。 */
{
  const match=MatchState.create(maps[0],{seed:9});
  const middleId=match.map.adjacency.player[0];
  const far=match.map.shortestPath('player','enemy');
  assert.ok(far.length>=3,'測試需要一條經過中繼城寨的路線');
  match.nodes[far[1]].owner=0;match.nodes[far[1]].troops=5;
  match.nodes.player.troops=40;
  MatchState.dispatch(match,'player','enemy',1);
  let passedThrough=false;
  for(let i=0;i<900;i++){
    MatchState.step(match,.05);
    if(match.soldiers.some(s=>s.fromId===far[1]))passedThrough=true;
  }
  assert.ok(passedThrough,'部隊必須穿越友軍城寨繼續前進');
}

/* 升級：花兵換產能，兵不夠不能升。 */
{
  const match=MatchState.create(maps[0],{seed:13});
  const base=match.nodes.player;
  base.level=1;base.troops=5;
  assert.equal(MatchState.upgrade(match,'player'),false,'兵不足時不可升級');
  base.troops=40;
  assert.equal(MatchState.upgrade(match,'player'),true,'兵足夠時必須能升級');
  assert.equal(base.level,2,'升級後等級必須提高');
  assert.ok(MatchState.rateOf(match.config,base)>MatchState.rateOf(match.config,{...base,level:1}),'升級必須提高生產速度');
}

/* 勝負：攻破主城立刻結束，時間到則比據點。 */
{
  const match=MatchState.create(maps[0],{seed:17});
  const gate=match.map.adjacency.enemy[0];
  match.nodes[gate].owner=0;match.nodes[gate].troops=70;
  match.nodes.enemy.troops=4;
  MatchState.dispatch(match,gate,'enemy',1);
  for(let i=0;i<1200&&!match.over;i++)MatchState.step(match,.05);
  assert.equal(match.over,true,'主城被攻下必須立刻結束對局');
  assert.equal(match.winner,0,'攻破敵方主城必須判玩家勝');
}
/* 沒有任何時間機制：時間長不會自己結束，駐軍上限也不隨時間變化。 */
{
  const match=MatchState.create(maps[0],{seed:19});
  const before=MatchState.capacityOf(match.config,match.nodes.player);
  match.time=500;
  MatchState.step(match,.05);
  assert.equal(match.over,false,'沒有時限，時間長不可自己結束對局');
  assert.equal(MatchState.capacityOf(match.config,match.nodes.player),before,'駐軍上限不可隨時間變化');
  assert.equal('decisiveStage' in match,false,'不可再有決戰階段這種隱形計時');
}

/* 攻城進度會累積：連續攻勢不會因為中斷而白費。 */
{
  const match=MatchState.create(maps[0],{seed:20,heroSides:[]});
  const target=match.map.adjacency.player[0];
  match.nodes[target].owner=1;match.nodes[target].troops=10;match.nodes[target].level=1;
  match.nodes.player.troops=6;match.food[0]=999;
  MatchState.dispatch(match,'player',target,1);
  for(let i=0;i<400;i++)MatchState.step(match,.05);
  assert.ok(match.nodes[target].assaultBuffer>0||match.nodes[target].troops<10,'攻勢必須留下進度');
}

/* AI：必須真的會出手，也不能一開局就傾巢而出。 */
{
  const match=MatchState.create(maps[0],{seed:23});
  const ai=MatchAI.create(1,3);
  for(let i=0;i<1200&&!match.over;i++){MatchAI.update(match,ai,.05);MatchState.step(match,.05);}
  assert.ok(match.stats.dispatched[1]>0,'敵方 AI 必須會主動出兵');
  assert.ok(MatchState.ownedNodes(match,1).length>1,'敵方 AI 必須真的攻下城寨，而不是只會出兵');
  assert.ok(match.nodes.enemy.troops>0,'敵方 AI 不可把主城派空');
}

console.log('✅ core 測試全部通過｜地圖 5 張、道路貼齊、出兵/對撞/穿越/升級/勝負/AI 均正確');

/* ---------- 武將系統（帶兵出征） ---------- */
const Heroes=require('../src/core/heroes.js');

function matchWithHeroes(seed){
  const match=MatchState.create(maps[0],{seed,heroSides:[0]});
  match.food[0]=999;
  return match;
}

/* 沒有駐軍功能：武將只有待命／出征／折損三種狀態。 */
{
  const match=matchWithHeroes(31);
  assert.equal(match.heroes.length,Heroes.ORDER.length,'我方必須有全部武將');
  assert.ok(match.heroes.every(hero=>hero.status==='ready'),'開局全部武將必須待命');
  assert.ok(match.heroes.every(hero=>!('nodeId' in hero)),'武將不可再有駐守城寨的概念');
  for(const node of Object.values(match.nodes))assert.equal(node.hero,undefined,'城寨不可再掛駐守武將');
}

/* 指派後由該武將帶下一波兵；出征中不能重複指派。 */
{
  const match=matchWithHeroes(33);
  const near=match.map.adjacency.player[0];
  assert.equal(Heroes.lead(match,'guanyu'),true,'待命武將必須可以指派帶兵');
  assert.equal(Heroes.lead(match,'guanyu'),false,'再點一次必須取消指派');
  Heroes.lead(match,'guanyu');
  MatchState.dispatch(match,'player',near,.5);
  const guanyu=Heroes.find(match,'guanyu');
  assert.equal(guanyu.status,'marching','出兵後武將必須進入出征狀態');
  for(let i=0;i<20;i++)MatchState.step(match,.05);
  assert.ok(match.soldiers.some(soldier=>soldier.heroId==='guanyu'),'該波士兵必須掛上武將');
  assert.equal(Heroes.lead(match,'guanyu'),false,'出征中的武將不可再被指派');
}

/* 關羽破城：同樣人數要把守軍打得更低。
   （量「最低打到幾兵」而不是結束時的兵數——城寨會邊打邊補，終值量不出攻勢強弱。） */
function deepestPush(withGuanyu){
  const match=matchWithHeroes(35);
  const target=match.map.adjacency.player[0];
  match.nodes[target].owner=1;match.nodes[target].troops=60;match.nodes[target].level=2;
  match.nodes.player.troops=20;
  if(withGuanyu)Heroes.lead(match,'guanyu');
  MatchState.dispatch(match,'player',target,1);
  let lowest=60;
  for(let i=0;i<600;i++){MatchState.step(match,.05);lowest=Math.min(lowest,match.nodes[target].troops);}
  return lowest;
}
assert.ok(deepestPush(true)<deepestPush(false),'關羽帶隊必須把守軍打得更低');

/* 馬超鐵騎：同一座城寨派出的人數更多。 */
{
  const plain=matchWithHeroes(37),boosted=matchWithHeroes(37);
  const near=plain.map.adjacency.player[0];
  plain.nodes.player.troops=20;boosted.nodes.player.troops=20;
  const a=MatchState.dispatch(plain,'player',near,.5);
  Heroes.lead(boosted,'machao');
  const b=MatchState.dispatch(boosted,'player',near,.5);
  assert.ok(b>a,`馬超帶隊必須派出更多人（${a} → ${b}）`);
}

/* 趙雲突擊：抵達瞬間額外斬敵，且只發動一次。 */
{
  const match=matchWithHeroes(39);
  const target=match.map.adjacency.player[0];
  match.nodes[target].owner=1;match.nodes[target].troops=40;
  match.nodes.player.troops=10;
  Heroes.lead(match,'zhaoyun');
  MatchState.dispatch(match,'player',target,1);
  let strikes=0;
  for(let i=0;i<600;i++){MatchState.step(match,.05);strikes+=match.events.filter(e=>e.type==='heroStrike').length;}
  assert.equal(strikes,1,'趙雲的斬首只能發動一次');
}

/* 張飛衝陣：路上對撞換掉更多敵軍。 */
function duelLosses(withZhangfei){
  const match=matchWithHeroes(41);
  const target=match.map.adjacency.player[0];
  match.nodes[target].owner=1;match.nodes[target].troops=40;
  match.nodes.player.troops=40;match.food[1]=999;
  if(withZhangfei)Heroes.lead(match,'zhangfei');
  MatchState.dispatch(match,'player',target,1);
  MatchState.dispatch(match,target,'player',1);
  for(let i=0;i<400;i++)MatchState.step(match,.05);
  return match.stats.lost;
}
{
  const plain=duelLosses(false),charged=duelLosses(true);
  assert.equal(plain[0],plain[1],'沒有張飛時對撞必須一換一');
  assert.ok(charged[1]>charged[0],'張飛帶隊必須換掉更多敵軍');
}

/* 黃忠神射：行軍途中清掉同路敵軍。 */
{
  const match=matchWithHeroes(43);
  const gate=match.map.adjacency.player[0];
  match.nodes[gate].owner=1;match.nodes[gate].troops=40;match.food[1]=999;
  match.nodes.player.troops=30;
  Heroes.lead(match,'huangzhong');
  MatchState.dispatch(match,'player',gate,1);
  MatchState.dispatch(match,gate,'player',1);
  let snipes=0;
  for(let i=0;i<400;i++){MatchState.step(match,.05);snipes+=match.events.filter(e=>e.type==='snipe').length;}
  assert.ok(snipes>0,'黃忠必須在行軍途中射殺敵軍');
}

/* 全軍覆沒 → 折損，等一段時間後自動歸隊。 */
{
  const match=matchWithHeroes(45);
  const target=match.map.adjacency.player[0];
  match.nodes[target].owner=1;match.nodes[target].troops=200;match.nodes[target].level=3;
  match.nodes.player.troops=4;
  Heroes.lead(match,'guanyu');
  MatchState.dispatch(match,'player',target,1);
  const guanyu=Heroes.find(match,'guanyu');
  for(let i=0;i<600&&guanyu.status==='marching';i++)MatchState.step(match,.05);
  assert.equal(guanyu.status,'down','整波被全殲時武將必須折損');
  assert.ok(guanyu.cooldown>0,'折損必須有復歸倒數');
  for(let i=0;i<Math.ceil(Heroes.DOWN_SECONDS/.05)+4;i++)MatchState.step(match,.05);
  assert.equal(guanyu.status,'ready','等待結束後武將必須自動歸隊');
}

/* 有部下抵達就算完成任務，直接回到待命。 */
{
  const match=matchWithHeroes(47);
  const near=match.map.adjacency.player[0];
  match.nodes.player.troops=30;
  Heroes.lead(match,'zhangfei');
  MatchState.dispatch(match,'player',near,1);
  const zhangfei=Heroes.find(match,'zhangfei');
  for(let i=0;i<600&&zhangfei.status==='marching';i++)MatchState.step(match,.05);
  assert.equal(zhangfei.status,'ready','有部下抵達時武將必須平安歸隊');
}

console.log('✅ 武將測試通過｜帶兵出征、關羽破城、馬超增兵、趙雲斬首、張飛對撞、黃忠清路、折損歸隊');

/* ---------- 軍師策略 ---------- */
const Tactics=require('../src/core/tactics.js');

function matchWithTactics(seed,hand){
  const match=MatchState.create(maps[0],{seed,heroSides:[]});
  const state=Tactics.createState(0,match.rng);
  state.points=Tactics.COST;state.hand=[...hand];
  match.tactics[0]=state;
  return{match,state};
}

/* 計策值不足不可施放；火計打的是道路上的敵軍。 */
function roadWithEnemies(seed){
  const {match,state}=matchWithTactics(seed,['fire','farming']);
  const gate=match.map.adjacency.player[0];
  match.nodes[gate].owner=1;match.nodes[gate].troops=40;
  MatchState.dispatch(match,gate,'player',1);
  for(let i=0;i<12;i++)MatchState.step(match,.05);
  const road=match.soldiers[0].edge.key;
  return{match,state,road};
}
{
  const {match,state,road}=roadWithEnemies(61);
  const before=match.soldiers.length;
  state.points=Tactics.COST-1;
  assert.equal(Tactics.cast(match,state,'fire',road),false,'計策值不足不可施放');
  state.points=Tactics.COST;
  assert.equal(Tactics.cast(match,state,'fire',road),true,'計策值足夠必須能施放');
  assert.ok(match.soldiers.length<before,'火計必須燒掉路上的敵軍');
  assert.equal(state.points,0,'施放後必須扣光計策值');
  assert.equal(state.hand.length,2,'用掉一張後必須立刻補牌');
  assert.ok(!state.hand.includes('fire'),'用掉的牌不可留在手上');
}

/* 空路放火不生效，手牌與計策值都要保留。 */
{
  const {match,state}=matchWithTactics(63,['fire','barricade']);
  const road=match.map.edges[0].key;
  assert.equal(Tactics.cast(match,state,'fire',road),false,'路上沒有敵軍時火計不可生效');
  assert.equal(state.points,Tactics.COST,'無效施放不可扣點');
  assert.ok(state.hand.includes('fire'),'無效施放必須保留手牌');
  assert.equal(Tactics.cast(match,state,'fire','player'),false,'火計不可指定城寨，它打的是道路');
}

/* 屯田：補的是兵糧，不是兵。 */
{
  const {match,state}=matchWithTactics(67,['farming','fire']);
  match.food[0]=10;
  const troops=match.nodes.player.troops;
  assert.equal(Tactics.cast(match,state,'farming',null),true,'屯田不需指定目標');
  assert.equal(match.food[0],50,'屯田必須補充 40 點兵糧');
  assert.equal(match.nodes.player.troops,troops,'屯田不該直接變出兵');
}

/* ---------- 兵糧 ---------- */

/* 出兵要扣糧，而且遠征更貴。 */
{
  const match=MatchState.create(maps[0],{seed:91});
  const near=match.map.adjacency.player[0];
  match.food[0]=200;match.nodes.player.troops=20;
  const before=match.food[0];
  const sent=MatchState.dispatch(match,'player',near,1);
  assert.equal(sent,20,'兵糧充足時必須派滿');
  assert.equal(before-match.food[0],20,'相鄰出兵每人扣一份兵糧');

  const far=MatchState.create(maps[0],{seed:92});
  far.food[0]=200;far.nodes.player.troops=20;
  const steps=far.map.shortestPath('player','enemy').length-1;
  assert.ok(steps>=3,'測試需要一條三段以上的遠征路線');
  const foodBefore=far.food[0];
  MatchState.dispatch(far,'player','enemy',1);
  assert.ok(foodBefore-far.food[0]>20,'遠征的糧耗必須高於相鄰出兵');
}

/* 兵糧不足時派出付得起的人數，而不是整個擋下。 */
{
  const match=MatchState.create(maps[0],{seed:93});
  const near=match.map.adjacency.player[0];
  match.nodes.player.troops=30;match.food[0]=8;
  const sent=MatchState.dispatch(match,'player',near,1);
  assert.equal(sent,8,'兵糧只夠八份時必須派出八人');
  assert.equal(Math.round(match.food[0]),0,'派兵後兵糧必須扣光');
  assert.equal(match.nodes.player.troops,22,'沒派出去的兵必須留在城裡');
  match.food[0]=0;
  assert.equal(MatchState.dispatch(match,'player',near,1),0,'完全沒糧時派不出兵');
}

/* 產糧：城寨越多越快，且駐軍會屯田自足。 */
{
  const match=MatchState.create(maps[0],{seed:94});
  const base=match.nodes.player;
  const solo=MatchState.foodRateOf(match.config,base);
  base.troops+=40;
  assert.ok(MatchState.foodRateOf(match.config,base)>solo,'駐軍越多產糧越快');
  const one=MatchState.foodCapOf(match.config,1),four=MatchState.foodCapOf(match.config,4);
  assert.ok(four>one,'持有越多城寨，兵糧上限越高');

  match.food[0]=0;
  for(let i=0;i<100;i++)MatchState.step(match,.05);
  const alone=match.food[0];
  const wide=MatchState.create(maps[0],{seed:94});
  for(const node of Object.values(wide.nodes))if(node.type==='outpost')node.owner=0;
  wide.food[0]=0;
  for(let i=0;i<100;i++)MatchState.step(wide,.05);
  assert.ok(wide.food[0]>alone,'佔領更多城寨必須讓產糧明顯變快');
}

/* 兵糧不會無限累積。 */
{
  const match=MatchState.create(maps[0],{seed:95});
  for(let i=0;i<4000;i++)MatchState.step(match,.05);
  assert.ok(match.food[0]<=MatchState.foodCapOf(match.config,MatchState.ownedNodes(match,0).length)+.001,'兵糧不可超過上限');
}

/* 策反：敵城掉三成，我方最近的城寨接收。 */
{
  const {match,state}=matchWithTactics(71,['defect','fire']);
  const target=match.map.adjacency.player[0];
  match.nodes[target].owner=1;match.nodes[target].troops=20;
  const mine=match.nodes.player.troops;
  assert.equal(Tactics.cast(match,state,'defect',target),true,'策反必須可施放');
  assert.equal(match.nodes[target].troops,14,'策反必須讓敵城掉三成守軍');
  assert.equal(match.nodes.player.troops,mine+6,'倒戈的兵必須加入我方城寨');
}

/* 急行軍：單一士兵在同一個 tick 內走得更遠。
   （不可用「一段時間後跑最遠的士兵」來量——快的先抵達就被移除，反而量不出差距。） */
function stepDelta(withBoost){
  const {match,state}=matchWithTactics(73,['forcedMarch','fire']);
  const target=match.map.adjacency.player[0];
  MatchState.dispatch(match,'player',target,1);
  MatchState.step(match,.05);
  if(withBoost)assert.equal(Tactics.cast(match,state,'forcedMarch',null),true,'急行軍必須可施放');
  const soldier=match.soldiers[0];
  const travelled=()=>soldier.direction>0?soldier.position:soldier.edge.line.length-soldier.position;
  const before=travelled();
  MatchState.step(match,.05);
  return travelled()-before;
}
assert.ok(stepDelta(true)>stepDelta(false)*1.7,'急行軍必須明顯加快行軍');

/* 拒馬：只封鎖指定的那條路，且時效過後恢復。 */
{
  const {match,state}=matchWithTactics(79,['barricade','fire']);
  const gate=match.map.adjacency.player[0];
  match.nodes[gate].owner=1;match.nodes[gate].troops=30;
  MatchState.dispatch(match,gate,'player',1);
  for(let i=0;i<10;i++)MatchState.step(match,.05);
  const scout=match.soldiers[0];
  const road=scout.edge.key;
  assert.equal(Tactics.cast(match,state,'barricade',road),true,'拒馬必須可對道路施放');
  /* 盯住同一名士兵：封鎖期間串流仍在放人，用整個陣列比對會被新生成的士兵干擾。 */
  const before=scout.position;
  for(let i=0;i<20;i++)MatchState.step(match,.05);
  assert.equal(scout.position,before,'拒馬封鎖期間敵軍必須停在原地');
  for(let i=0;i<160;i++)MatchState.step(match,.05);
  assert.notEqual(scout.position,before,'封鎖時效過後敵軍必須恢復行進');
}

/* 敵方軍師：施放前必須先預警。 */
{
  const match=MatchState.create(maps[0],{seed:83,heroSides:[]});
  const state=Tactics.createState(1,match.rng);
  state.points=Tactics.COST;state.hand=['fire','farming'];
  match.tactics[1]=state;
  const target=match.map.adjacency.enemy[0];
  match.nodes[target].owner=0;match.nodes[target].troops=20;
  Tactics.updateEnemy(match,state,.05,1);
  assert.ok(state.warning,'敵方軍師必須先進入預警狀態');
  assert.equal(state.points,Tactics.COST,'預警階段不可先扣點');
  /* 目標由 AI 自己選（會挑守軍最多的一座），測試必須跟著它選的那座看。 */
  const struck=match.nodes[state.warning.target];   /* 也可能是道路，屆時為 undefined */
  const before=struck?struck.troops:null;
  for(let i=0;i<40&&state.warning;i++)Tactics.updateEnemy(match,state,.05,1);
  assert.equal(state.warning,null,'預警結束後必須真的施放');
  assert.ok(state.points<Tactics.COST,'施放後必須扣掉計策值');
  if(struck)assert.ok(struck.troops<before,'敵方策略必須造成實際效果');
}

console.log('✅ 策略測試通過｜計策值、火計、屯田、策反、急行軍、拒馬、敵方預警');
console.log("✅ 兵糧測試通過｜遠征耗糧、糧不足派得起的人數、駐軍屯田、城寨越多產糧越快、上限");

/* ---------- 整隊冷卻 ---------- */
{
  const match=MatchState.create(maps[0],{seed:101,heroSides:[]});
  const near=match.map.adjacency.player[0];
  match.food[0]=999;match.nodes.player.troops=40;
  assert.ok(MatchState.dispatch(match,'player',near,.5)>0,'第一次出兵必須成功');
  assert.ok(match.nodes.player.cooldown>0,'出兵後必須進入整隊冷卻');
  assert.equal(MatchState.dispatch(match,'player',near,.5),0,'整隊冷卻中不可連續派兵');
  for(let i=0;i<Math.ceil(match.config.dispatchCooldown/.05)+2;i++)MatchState.step(match,.05);
  assert.ok(MatchState.dispatch(match,'player',near,.5)>0,'冷卻結束後必須能再出兵');
}
console.log('✅ 整隊冷卻測試通過｜同一座城寨不可連續派兵');

/* ---------- 公平性：AI 一次只能派一座城 ---------- */
{
  const match=MatchState.create(maps[0],{seed:111,heroSides:[]});
  const ai=MatchAI.create(1,5);
  MatchAI.attach(match,ai);
  for(const node of Object.values(match.nodes))if(node.owner===1||node.id==='enemy'){node.owner=1;node.troops=40;}
  match.food[1]=999;
  let maxPerDecision=0;
  for(let i=0;i<1200&&!match.over;i++){
    const before=match.waves.length;
    MatchAI.update(match,ai,.05);
    maxPerDecision=Math.max(maxPerDecision,match.waves.length-before);
    MatchState.step(match,.05);
  }
  assert.ok(maxPerDecision<=1,`AI 一次決策最多只能從一座城寨出兵（實測 ${maxPerDecision}），玩家只有一隻手`);
}
console.log('✅ 公平性測試通過｜AI 一次決策只能派一座城寨，與玩家一致');

/* ---------- 圍城斷糧 ---------- */
{
  const match=MatchState.create(maps[0],{seed:121,heroSides:[]});
  const target=match.map.adjacency.player[0];
  match.nodes[target].owner=1;match.nodes[target].troops=20;
  match.nodes.player.troops=40;match.food[0]=999;
  /* 沒人攻打時會補兵 */
  const idle=match.nodes[target].troops;
  for(let i=0;i<100;i++)MatchState.step(match,.05);
  assert.ok(match.nodes[target].troops>idle,'沒被攻打的城寨必須正常補兵');
  /* 被圍攻時停止補兵 */
  match.nodes[target].siege=match.config.siegeChokeAt+.1;
  const besieged=match.nodes[target].troops;
  MatchState.step(match,.05);
  assert.equal(match.nodes[target].troops,besieged,'被圍攻的城寨不可補兵');
}
console.log('✅ 圍城斷糧測試通過｜被攻打中的城寨停止補兵');
