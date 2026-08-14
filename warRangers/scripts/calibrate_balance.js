#!/usr/bin/env node
/*
 * 量測每張地圖的開局讓子。
 *
 * 五張地圖都是「敵在上、玩家在下」畫的，城寨群偏上，玩家的道路普遍較長；
 * 純幾何量測不足以當代理指標，所以直接用同難度 AI 對戰掃描讓子，取勝率最接近 50% 的值。
 * 產出的數字要手動填回 src/core/mapData.js 的 LEVEL_META.balanceTroops。
 *
 *   node scripts/calibrate_balance.js [每格場數] [難度]
 *
 * 注意：校準用的亂數種子與 sim_match.js 不同，驗證時才不會是在對答案。
 */
const fs=require('node:fs');
const path=require('node:path');
const MapData=require('../src/core/mapData.js');
const MatchState=require('../src/core/state.js');
const MatchAI=require('../src/core/ai.js');

const [,,runsArg='50',proxyArg='2']=process.argv;
const runs=Number(runsArg),proxy=Number(proxyArg);
/*
 * 這是 PvE：校準目標不是「AI 對 AI 五五波」，而是一條難度曲線。
 * 玩家用難度 proxy（預設 3）的操作水準當替身；真人另有武將與計謀，實戰會更好打。
 */
/*
 * 基準改用「難度 2」＝一般休閒玩家的操作水準。
 * 先前拿難度 3（每 2.2 秒精算全圖、從不浪費一兵）當基準，
 * 導致真人玩家在第 2 關之後幾乎全敗——校準標準本身就錯了。
 */
const TARGET={1:85,2:72,3:60,4:50,5:40};
const CANDIDATES=[-6,-4,-2,0,2,4,6,8,10,12,14,16,18,20];
const STEP=.05,MAX_STEPS=Math.ceil(MatchState.CONFIG.safetySeconds/STEP)+40;

function winRate(map,handicap){
  map.balanceTroops=handicap;
  let wins=0,seconds=0;
  for(let i=0;i<runs;i++){
    const match=MatchState.create(map,{seed:i*104729+map.id*31+7});
    const sides=[MatchAI.create(0,proxy),MatchAI.create(1,map.id)].map(ai=>MatchAI.attach(match,ai));
    for(let step=0;step<MAX_STEPS&&!match.over;step++){
      const order=match.rng()<.5?sides:[sides[1],sides[0]];
      for(const ai of order)MatchAI.update(match,ai,STEP);
      MatchState.step(match,STEP);
    }
    if(match.winner===0)wins++;
    seconds+=match.time;
  }
  return{rate:wins/runs*100,seconds:seconds/runs};
}

const rows=[],baked={};
for(const id of MapData.levelIds()){
  const map=MapData.loadLevel(id,fs,path);
  const scan=CANDIDATES.map(handicap=>({handicap,...winRate(map,handicap)}));
  const target=TARGET[id]||50;
  const best=scan.reduce((a,b)=>Math.abs(b.rate-target)<Math.abs(a.rate-target)?b:a);
  baked[id]=best.handicap;
  rows.push({
    關卡:`${id} ${map.name}`,
    目標:`${TARGET[id]}%`,
    讓子:best.handicap,
    校準後勝率:`${best.rate.toFixed(1)}%`,
    平均秒數:best.seconds.toFixed(1),
    掃描:scan.map(entry=>`${entry.handicap}:${entry.rate.toFixed(0)}%`).join(' '),
  });
}
console.log(`玩家替身難度 ${proxy}　vs　各關自己的難度（第 N 關＝難度 N），每格 ${runs} 場`);
console.table(rows);
console.log('填回 src/core/mapData.js 的 LEVEL_META：');
for(const [id,handicap] of Object.entries(baked))console.log(`  第 ${id} 關 balanceTroops:${handicap}`);
