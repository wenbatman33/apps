/*
 * 對局規則引擎（State.io 模型）。純資料 + 純函式，零 Phaser 依賴。
 *
 * 一座城寨只有一個數字，一條路只有一種走法，一個動作只有一種結果：
 *   出兵 → 沿路串流行軍 → 路上一兵抵一兵 → 抵達扣兵 → 扣到 0 以下換手。
 * 任何平衡調整都必須先用 scripts/sim_match.js 驗證過再進遊戲。
 */
(function(root,factory){
  const node=typeof require!=='undefined'&&typeof module!=='undefined';
  const api=factory(node?require('./mapData.js'):root.MapData,node?require('./heroes.js'):root.Heroes,node?require('./tactics.js'):root.Tactics);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MatchState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(MapData,Heroes,Tactics){

  const CONFIG={
    dispatchRatio:.5,          /* 單擊派出駐軍的一半 */
    dispatchAllRatio:1,        /* 雙擊傾巢而出 */
    minDispatchTroops:2,       /* 低於此數的城寨派不出兵 */
    /*
     * 整隊冷卻：同一座城寨出兵後要重整隊形才能再出。
     * 沒有這條的話，一座城可以無限連點把兵擠出去——既不合理，
     * 也正是「機械最優的 AI」壓過真人玩家的主要手段。
     * 想要更大的攻勢就該同時動用多座城寨（多選出兵），而不是猛戳同一座。
     */
    dispatchCooldown:2.5,
    streamInterval:.075,       /* 出兵串流：每 0.075 秒放出一名士兵 */
    soldierSpeed:132,
    levels:[
      {rate:.55,cap:30,cost:0,food:.8},
      {rate:.85,cap:50,cost:25,food:1.2},
      {rate:1.2,cap:80,cost:45,food:1.7},
    ],
    /*
     * 兵糧：全軍共用的一個數字，每派出一名士兵扣一份。
     * 產糧刻意略高於產兵——兵糧不該比兵力更常見底，否則遊戲會變成等待。
     */
    /*
     * 守城加成：攻方要幾人才能換掉一名守軍。
     * 純 1:1 對消會讓「駐守」完全沒有意義（31 人就能打下 30 人的城），
     * 遊戲只剩比誰兵多。中立城無人守備所以是 1.0，佔領後才築得起防禦。
     * 決戰階段的攻城效率會除掉這個係數——早期城牆厚，後期城牆瓦解。
     */
    defenseByLevel:[1.25,1.4,1.6],
    baseDefenseBonus:1.25,
    neutralDefense:1,
    foodPerGarrison:.015,
    foodCapBase:100,foodCapPerNode:20,
    /* 遠征耗糧：距離越遠每名士兵越貴，長程奔襲因此是要付代價的豪賭。 */
    foodCostBySteps:[1,1,1.5,2,2.5],
    baseStartLevel:2,
    baseStartTroops:30,
    neutralTroops:8,
    outpostStartLevel:1,
    /* 開局讓子由 scripts/calibrate_balance.js 量測後寫進 mapData.LEVEL_META.balanceTroops。 */
    useMapBalance:true,
    /* 滾雪球抑制：持有越多城寨，每座的產能越低。1 = 不抑制。 */
    snowballDamping:0.88,
    /*
     * 逆境加成（哀兵）：落後方每少一座城寨就提升產能與守城。
     * 沒有翻盤機制時，局面變成「誰先領先誰就贏」，操作水準掉一階勝率就掉 40～50 個百分點，
     * 玩家的體感是「根本沒有策略感」。這條是整個系統裡最重要的抗滾雪球設計。
     */
    underdogPerNode:.13,underdogMax:.45,underdogDefense:.06,
    /*
     * 沒有任何隨時間變化的機制：不計時、不判定，也沒有「決戰」加成。
     * 勝負只有一種——攻破對方主城。
     * 抗僵局改由逆境加成（落後方變強）與攻城進度累積（assaultBuffer 不歸零）承擔。
     */
    /*
     * 攻城削弱（取代舊的「決戰」計時）：城寨每被攻擊一次，城防就被打掉一點；
     * 沒人攻打時會慢慢修復。這是純粹由「玩家的攻勢」驅動的，不看時間。
     *   ── 拿掉所有時間機制後實測：主城陷落率掉到 0～27%，五張圖全部拖到保險絲。
     *      守城加成必須有被打破的途徑，否則單波攻勢永遠削不動補兵速度。
     */
    siegePerHit:.11,siegeMax:.72,siegeRepair:.05,
    /*
     * 圍城斷糧：城寨正被攻打時停止補兵。
     * 沒有這條的話，一座 50 兵的主城要約 88 人才攻得下，而它每秒補 1 兵——
     * 分批攻擊永遠追不上補兵，實測主城陷落率是 0%。
     * 這是由「有沒有人在攻」決定的，不看時間。
     */
    siegeChokeAt:.18,
    /* 純粹的保險絲：正常對局不該走到，只為了讓模擬與極端局面一定會終止。 */
    safetySeconds:900,
  };
  const KINDS=['guard','archer','cavalry'];

  /* 可重現的亂數：模擬 1000 場時必須每次結果一致，才能比較平衡調整。 */
  function makeRng(seed){
    let value=(seed>>>0)||1;
    return function(){value^=value<<13;value>>>=0;value^=value>>17;value^=value<<5;value>>>=0;return value/4294967296;};
  }

  function levelOf(config,level){return config.levels[Math.max(0,Math.min(config.levels.length-1,level-1))];}
  /*
   * 主城不再是全場產能最高的點：模擬顯示主城若同時擁有最高上限與最快產能，
   * 守方的補兵永遠快過單波攻勢，五張地圖有四張會打到時間到、主城零陷落。
   */
  const capacityOf=(config,node)=>levelOf(config,node.level).cap*(node.type==='base'?1.15:1);
  function defenseOf(config,node,deficit=0){
    if(node.owner<0)return config.neutralDefense;
    const level=config.defenseByLevel[Math.max(0,Math.min(config.defenseByLevel.length-1,node.level-1))];
    return level*(node.type==='base'?config.baseDefenseBonus:1)      *(1+Math.max(0,deficit)*config.underdogDefense)
      *(1-Math.min(config.siegeMax,node.siege||0));   /* 被持續攻打的城牆會垮 */
  }
  /* 落後幾座城寨；用來算逆境加成。 */
  const deficitOf=(match,side)=>Math.max(0,ownedNodes(match,1-side).length-ownedNodes(match,side).length);
  const underdogOf=(config,deficit)=>1+Math.min(config.underdogMax,Math.max(0,deficit)*config.underdogPerNode);
  const foodRateOf=(config,node)=>levelOf(config,node.level).food*(node.rateBonus||1)
    +node.troops*config.foodPerGarrison;
  const foodCapOf=(config,ownedCount)=>config.foodCapBase+config.foodCapPerNode*ownedCount;
  /* 每名士兵的糧耗；steps = 行軍要經過幾段路。 */
  function foodCostPerSoldier(config,steps){
    const table=config.foodCostBySteps;
    return table[Math.max(0,Math.min(table.length-1,steps))];
  }
  const rateOf=(config,node,ownedCount=1)=>
    levelOf(config,node.level).rate*(node.rateBonus||1)*Math.pow(config.snowballDamping||1,Math.max(0,ownedCount-1));

  /*
 * heroSides 預設為空：模擬與平衡測試必須是乾淨的對稱局面。
 * 實際遊戲由畫面層傳 [0]——武將是玩家對抗高難度 AI 的本錢（AI 對 AI 時我方勝率約 40%）。
 */
  function create(map,{seed=1,config={},heroSides=[]}={}){
    const merged={...CONFIG,...config};
    /*
     * 開局讓子：五張地圖都是「敵在上、玩家在下」畫的，城寨群偏上，玩家的道路普遍較長。
     * 幾何量測不足以當代理指標（第 2 關道路較長但拓樸較短），因此讓子直接由模擬校準，
     * 難度只能來自設計好的 AI 等級，不能來自沒人發現的地圖偏差。
     */
    const compensation=merged.useMapBalance?(map.balanceTroops||0):0;
    const nodes={};
    for(const spec of map.nodes){
      const isBase=spec.type==='base';
      const handicap=!isBase?0:spec.id==='player'?compensation:-compensation;
      nodes[spec.id]={
        id:spec.id,type:spec.type,x:spec.x,y:spec.y,
        owner:spec.startOwner,
        level:isBase?merged.baseStartLevel:merged.outpostStartLevel,
        troops:isBase?Math.max(6,merged.baseStartTroops+handicap):merged.neutralTroops,
        growth:0,rateBonus:1,shield:0,assaultBuffer:0,cooldown:0,siege:0,
      };
    }
    return{
      map,config:merged,rng:makeRng(seed),
      time:0,over:false,winner:null,endReason:null,
      food:[merged.foodCapBase*.4,merged.foodCapBase*.4],
      nodes,waves:[],soldiers:[],events:[],nextId:1,sideTempo:[1,1],
      blocks:[],marchBoost:{},tactics:{},
      heroes:heroSides.flatMap(side=>Heroes.createRoster(side)),
      stats:{dispatched:[0,0],lost:[0,0],captured:[0,0]},
    };
  }

  const ownedNodes=(match,side)=>Object.values(match.nodes).filter(node=>node.owner===side);
  const totalTroops=(match,side)=>ownedNodes(match,side).reduce((sum,node)=>sum+node.troops,0)
    +match.soldiers.filter(soldier=>soldier.side===side).length
    +match.waves.filter(wave=>wave.side===side).reduce((sum,wave)=>sum+wave.remaining,0);

  function emit(match,type,payload){match.events.push({type,...payload});}

  /*
   * 出兵：來源可以是多座城寨（多選），目標不限相鄰，自動走最短路徑。
   * 回傳實際派出的總人數。
   */
  function dispatch(match,sourceIds,targetId,ratio){
    if(match.over)return 0;
    const list=Array.isArray(sourceIds)?sourceIds:[sourceIds];
    const target=match.nodes[targetId];if(!target)return 0;
    let sent=0;
    for(const sourceId of list){
      const source=match.nodes[sourceId];
      if(!source||source.id===targetId||source.owner<0)continue;
      if(source.troops<match.config.minDispatchTroops)continue;
      if((source.cooldown||0)>0){emit(match,'regrouping',{node:sourceId,remain:source.cooldown});continue;}
      const path=match.map.shortestPath(sourceId,targetId);
      if(path.length<2)continue;
      /* 武將帶隊：接下來這一波由待命中的武將率領，整波套用他的專屬威力。 */
      const hero=Heroes.attachToWave(match,source.owner);
      const bonus=hero?hero.def:{};
      const wanted=Math.min(source.troops,
        Math.max(1,Math.floor(source.troops*(ratio||match.config.dispatchRatio)*(bonus.quantityBonus||1))));
      /* 兵糧不足就派出付得起的人數，而不是整個擋下來——休閒向不用硬性封鎖懲罰玩家。 */
      const perSoldier=foodCostPerSoldier(match.config,path.length-1);
      const affordable=Math.floor(match.food[source.owner]/perSoldier);
      const quantity=Math.min(wanted,affordable);
      if(quantity<1){emit(match,'noFood',{node:sourceId,x:source.x,y:source.y,need:perSoldier});continue;}
      match.food[source.owner]=Math.max(0,match.food[source.owner]-quantity*perSoldier);
      source.troops-=quantity;
      source.cooldown=match.config.dispatchCooldown;
      match.waves.push({
        side:source.owner,path,remaining:quantity,timer:0,
        kind:KINDS[Math.floor(match.rng()*KINDS.length)],
        speed:match.config.soldierSpeed*(bonus.marchSpeed||1),
        hp:bonus.soldierHp||1,                     /* 張飛衝陣：路上一換二 */
        heroId:hero?hero.id:null,
        assaultPower:bonus.assaultPower||1,        /* 關羽破城 */
        strikeOnArrive:bonus.strikeOnArrive||0,    /* 趙雲斬首 */
      });
      match.stats.dispatched[source.owner]+=quantity;
      sent+=quantity;
      emit(match,'dispatch',{side:source.owner,from:sourceId,to:targetId,quantity,
        food:Math.round(quantity*perSoldier),short:quantity<wanted});
    }
    return sent;
  }

  function upgrade(match,nodeId){
    const node=match.nodes[nodeId];if(!node||node.owner<0)return false;
    if(node.level>=match.config.levels.length)return false;
    const cost=levelOf(match.config,node.level+1).cost;
    if(node.troops<cost)return false;
    node.troops-=cost;node.level++;
    emit(match,'upgrade',{node:node.id,level:node.level,side:node.owner});
    return true;
  }

  function spawnSoldier(match,wave){
    const fromId=wave.path[0],toId=wave.path[1],edge=match.map.edge(fromId,toId);
    if(!edge)return;
    const direction=edge.a===fromId?1:-1;
    match.soldiers.push({
      id:match.nextId++,side:wave.side,kind:wave.kind,speed:wave.speed,hp:wave.hp||1,
      heroId:wave.heroId||null,assaultPower:wave.assaultPower||1,strikeOnArrive:wave.strikeOnArrive||0,
      edge,position:direction>0?0:edge.line.length,direction,
      path:wave.path,pathIndex:1,fromId,toId,x:0,y:0,heading:0,
    });
  }

  function retarget(match,soldier,fromId,toId){
    const edge=match.map.edge(fromId,toId);if(!edge)return false;
    soldier.edge=edge;soldier.direction=edge.a===fromId?1:-1;
    soldier.position=soldier.direction>0?0:edge.line.length;
    soldier.fromId=fromId;soldier.toId=toId;
    return true;
  }

  function capture(match,node,side){
    const previous=node.owner;
    node.owner=side;node.troops=0;node.growth=0;node.shield=0;node.assaultBuffer=0;node.siege=0;
    if(side>=0)match.stats.captured[side]++;
    emit(match,'capture',{node:node.id,side,from:previous});
    if(node.type==='base')finish(match,side,'主城陷落');
  }

  function resolveArrival(match,soldier){
    const node=match.nodes[soldier.toId];
    if(soldier.heroId){
      /* 趙雲：抵達瞬間斬敵，只在第一名部下抵達時發動一次。 */
      if(soldier.strikeOnArrive&&node.owner!==soldier.side&&!soldier.struck){
        node.troops=Math.max(0,node.troops-soldier.strikeOnArrive);
        emit(match,'heroStrike',{hero:soldier.heroId,node:node.id,x:node.x,y:node.y,damage:soldier.strikeOnArrive});
        for(const other of match.soldiers)if(other.heroId===soldier.heroId)other.strikeOnArrive=0;
      }
    }
    if(node.owner===soldier.side){
      const next=soldier.path[soldier.pathIndex+1];
      /* 友軍城寨只是中繼站，還沒到目的地就直接通過。 */
      if(next&&retarget(match,soldier,node.id,next)){soldier.pathIndex++;return false;}
      node.troops=Math.min(capacityOf(match.config,node),node.troops+1);
      /* 平安抵達友軍城寨才算完成任務；撞上城牆戰死不算。 */
      if(soldier.heroId){const hero=Heroes.find(match,soldier.heroId);if(hero)hero.arrived=true;}
      emit(match,'reinforce',{node:node.id,side:soldier.side});
      return true;
    }
    if(node.troops>0){
      /*
       * 攻城結算：1 ÷ 守城加成。用緩衝值累積，駐軍維持整數。
       * 緩衝值不會歸零，所以連續攻勢的進度會累積下去。
       */
      node.assaultBuffer=(node.assaultBuffer||0)
        +(soldier.assaultPower||1)/defenseOf(match.config,node,deficitOf(match,node.owner));
      node.siege=Math.min(match.config.siegeMax,(node.siege||0)+match.config.siegePerHit);
      while(node.assaultBuffer>=1&&node.troops>0){node.troops--;node.assaultBuffer--;}
      emit(match,'clash',{node:node.id,x:node.x,y:node.y});
      if(node.troops<=0&&node.assaultBuffer>=1){
        node.assaultBuffer=0;capture(match,node,soldier.side);node.troops=1;
        if(soldier.heroId){const hero=Heroes.find(match,soldier.heroId);if(hero)hero.arrived=true;}
      }
    }
    else{
      capture(match,node,soldier.side);node.troops=1;        /* 攻進空城的那一兵就地駐守 */
      if(soldier.heroId){const hero=Heroes.find(match,soldier.heroId);if(hero)hero.arrived=true;}
    }
    return true;
  }

  /* 同一條路上的敵我士兵正面相遇即 1 換 1 同歸於盡。 */
  function resolveCollisions(match){
    const byEdge=new Map();
    for(const soldier of match.soldiers){
      if(!byEdge.has(soldier.edge.key))byEdge.set(soldier.edge.key,[]);
      byEdge.get(soldier.edge.key).push(soldier);
    }
    const dead=new Set();
    for(const group of byEdge.values()){
      if(group.length<2)continue;
      for(const [sideA,sideB] of [[0,1],[1,0]]){
        const forward=group.filter(s=>s.side===sideA&&s.direction>0&&!dead.has(s.id)).sort((a,b)=>b.position-a.position);
        const backward=group.filter(s=>s.side===sideB&&s.direction<0&&!dead.has(s.id)).sort((a,b)=>a.position-b.position);
        while(forward.length&&backward.length&&forward[0].position>=backward[0].position){
          const one=forward[0],other=backward[0];
          one.hp--;other.hp--;
          if(one.hp<=0){dead.add(one.id);match.stats.lost[one.side]++;forward.shift();}
          if(other.hp<=0){dead.add(other.id);match.stats.lost[other.side]++;backward.shift();}
          emit(match,'duel',{x:(one.x+other.x)/2,y:(one.y+other.y)/2});
          if(one.hp>0&&other.hp>0)break;        /* 雙方都撐住就僵持，避免無限迴圈 */
        }
      }
    }
    if(dead.size)match.soldiers=match.soldiers.filter(soldier=>!dead.has(soldier.id));
  }

  function finish(match,winner,reason){
    if(match.over)return;
    match.over=true;match.winner=winner;match.endReason=reason;
    emit(match,'finish',{winner,reason});
  }

  /* 沒有倒數，只有極端情況才會用到的保險絲判定。 */
  function judgeByPoints(match,reason){
    const score=side=>[ownedNodes(match,side).length,totalTroops(match,side)];
    const [nodesA,troopsA]=score(0),[nodesB,troopsB]=score(1);
    if(nodesA!==nodesB)return finish(match,nodesA>nodesB?0:1,`${reason}・據點較多`);
    if(troopsA!==troopsB)return finish(match,troopsA>troopsB?0:1,`${reason}・兵力較多`);
    finish(match,0,`${reason}・平手判予守方`);
  }

  function step(match,dt){
    if(match.over)return match;
    match.events.length=0;
    const step=Math.min(dt,.05);
    match.time+=step;

    const owned=[ownedNodes(match,0).length,ownedNodes(match,1).length];

    for(const node of Object.values(match.nodes)){
      node.cooldown=Math.max(0,(node.cooldown||0)-step);
      node.siege=Math.max(0,(node.siege||0)-match.config.siegeRepair*step);   /* 無人攻打就慢慢修城 */
      if(node.owner<0)continue;                       /* 中立城寨不生產，逼玩家出門搶地盤 */
      /* 正在被圍攻的城寨補不了兵。 */
      if((node.siege||0)>=match.config.siegeChokeAt){node.growth=0;continue;}
      const capacity=capacityOf(match.config,node);
      if(node.troops>=capacity){
        /* 滿員只提醒一次，避免洗版；兵滿代表產能正在浪費。 */
        if(!node.fullNotified){node.fullNotified=true;emit(match,'capacityFull',{node:node.id,side:node.owner});}
        node.growth=0;continue;
      }
      node.fullNotified=false;
      node.growth+=rateOf(match.config,node,owned[node.owner])*(match.sideTempo[node.owner]||1)
        *underdogOf(match.config,owned[1-node.owner]-owned[node.owner])*step;
      while(node.growth>=1&&node.troops<capacity){node.troops++;node.growth--;}
    }

    /* 產糧：城寨等級 + 駐軍屯田，並受決戰階段加成。 */
    for(const side of [0,1]){
      const mine=ownedNodes(match,side);
      const rate=mine.reduce((sum,node)=>sum+foodRateOf(match.config,node),0)*(match.sideTempo[side]||1)
        *underdogOf(match.config,ownedNodes(match,1-side).length-mine.length);
      match.food[side]=Math.min(foodCapOf(match.config,mine.length),match.food[side]+rate*step);
    }

    Heroes.update(match,step);
    Heroes.snipe(match,step);

    for(const wave of match.waves){
      wave.timer-=step;
      while(wave.remaining>0&&wave.timer<=0){spawnSoldier(match,wave);wave.remaining--;wave.timer+=match.config.streamInterval;}
    }
    match.waves=match.waves.filter(wave=>wave.remaining>0);

    match.blocks=match.blocks.filter(block=>block.until>match.time);
    const arrived=[];
    for(const soldier of match.soldiers){
      const boost=match.marchBoost[soldier.side];
      const tempoMul=boost&&boost.until>match.time?boost.multiplier:1;
      /* 拒馬：封鎖的是「對手」通過這條路。 */
      const blocked=match.blocks.some(block=>block.key===soldier.edge.key&&block.side!==soldier.side);
      if(!blocked)soldier.position+=soldier.speed*tempoMul*step*soldier.direction;
      const done=soldier.direction>0?soldier.position>=soldier.edge.line.length:soldier.position<=0;
      const point=MapData.pointAt(soldier.edge.line,Math.max(0,Math.min(soldier.edge.line.length,soldier.position)));
      soldier.x=point.x;soldier.y=point.y;soldier.heading=point.heading*soldier.direction;
      if(done)arrived.push(soldier);
    }
    resolveCollisions(match);

    const consumed=new Set();
    for(const soldier of arrived){
      if(!match.soldiers.includes(soldier))continue;
      if(resolveArrival(match,soldier))consumed.add(soldier.id);
    }
    if(consumed.size)match.soldiers=match.soldiers.filter(soldier=>!consumed.has(soldier.id));

    if(!match.over&&match.time>=match.config.safetySeconds)judgeByPoints(match,'保險絲');
    return match;
  }

  return{CONFIG,KINDS,create,step,dispatch,upgrade,ownedNodes,totalTroops,capacityOf,rateOf,defenseOf,deficitOf,underdogOf,foodRateOf,foodCapOf,foodCostPerSoldier,levelOf,makeRng};
});
