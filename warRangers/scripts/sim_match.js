#!/usr/bin/env node
/*
 * Headless 對局模擬：平衡調整一律先在這裡驗證，再進遊戲。
 *
 *   node scripts/sim_match.js                 兩邊同難度、五張地圖各 100 場
 *   node scripts/sim_match.js 3 4 200 1       我方難度3 / 敵方難度4 / 200場 / 只跑第1關
 */
const fs=require('node:fs');
const path=require('node:path');
const MapData=require('../src/core/mapData.js');
const MatchState=require('../src/core/state.js');
const MatchAI=require('../src/core/ai.js');

const [,,levelA='3',levelB='3',runs='100',onlyMap]=process.argv;
const difficultyA=Number(levelA),difficultyB=Number(levelB),count=Number(runs);
const mapIds=onlyMap?[Number(onlyMap)]:MapData.levelIds();
const STEP=.05,MAX_STEPS=Math.ceil(MatchState.CONFIG.safetySeconds/STEP)+40;

function playOnce(map,seed){
  const match=MatchState.create(map,{seed});
  const sides=[MatchAI.create(0,difficultyA),MatchAI.create(1,difficultyB)].map(ai=>MatchAI.attach(match,ai));
  for(let i=0;i<MAX_STEPS&&!match.over;i++){
    /* 每個 tick 隨機決定誰先思考：固定順序會把「看得到對手剛出的兵」這個資訊優勢
       永遠送給後動的一方，讓地圖公平性的量測失真。 */
    const order=match.rng()<.5?sides:[sides[1],sides[0]];
    for(const ai of order)MatchAI.update(match,ai,STEP);
    MatchState.step(match,STEP);
  }
  return{
    winner:match.over?match.winner:null,
    seconds:Number(match.time.toFixed(1)),
    reason:match.endReason||'未結束',
    byBase:(match.endReason||'').includes('主城'),
    captures:match.stats.captured,
  };
}

const summary=[];
for(const id of mapIds){
  const map=MapData.loadLevel(id,fs,path);
  const results=[];
  for(let i=0;i<count;i++)results.push(playOnce(map,i*7919+id*13+1));
  const wins=results.filter(r=>r.winner===0).length;
  const baseKills=results.filter(r=>r.byBase).length;
  const seconds=results.reduce((sum,r)=>sum+r.seconds,0)/results.length;
  const shortest=Math.min(...results.map(r=>r.seconds)),longest=Math.max(...results.map(r=>r.seconds));
  summary.push({
    關卡:`${id} ${map.name}`,
    我方勝率:`${(wins/results.length*100).toFixed(1)}%`,
    主城決勝比例:`${(baseKills/results.length*100).toFixed(1)}%`,
    平均秒數:seconds.toFixed(1),
    最短:shortest.toFixed(1),
    最長:longest.toFixed(1),
  });
}
console.log(`難度 我方${difficultyA}（${MatchAI.profileFor(difficultyA).label}） vs 敵方${difficultyB}（${MatchAI.profileFor(difficultyB).label}）｜每張地圖 ${count} 場`);
console.table(summary);

const rates=summary.map(row=>Number(row.我方勝率.replace('%','')));
const balanced=difficultyA===difficultyB;
if(balanced){
  const worst=rates.reduce((acc,rate)=>Math.max(acc,Math.abs(rate-50)),0);
  console.log(worst<=12?`✅ 同難度對戰勝率偏差 ${worst.toFixed(1)}%，在容許範圍內`:`⚠️ 同難度對戰勝率偏差 ${worst.toFixed(1)}%，地圖或數值需要再調`);
}
const durations=summary.map(row=>Number(row.平均秒數));
const tooLong=durations.filter(seconds=>seconds>=240).length;
console.log(tooLong?`⚠️ 有 ${tooLong} 張地圖平均超過 4 分鐘，決戰壓力可能不足`:'✅ 各地圖都能在合理時間內分出勝負');
