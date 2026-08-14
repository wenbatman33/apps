/*
 * 敵方決策。目標是「像個對手」而不是「輾壓玩家」：
 * 只在有把握時出手，兵力不足就存兵，並且每次決策之間有可感知的節奏。
 */
(function(root,factory){
  const api=factory(typeof require!=='undefined'&&typeof module!=='undefined'?require('./state.js'):root.MatchState);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MatchAI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(MatchState){

  /* 難度只調三件事：思考間隔、出手門檻、願意打多遠。 */
  /*
   * 難度必須是「單調變強」的旋鈕。
   * 教訓：一開始用「侵略性」當難度，結果最保守的 AI 反而勝率最高（龜縮存兵穩贏），
   * 難度曲線整個反向。侵略性只是風格，不是強度。
   *
   *   tempo   ← 真正的強度：該方所有城寨的產能倍率
   *   interval← 反應速度
   *   margin  ← 出手前要求的兵力安全倍率（風格，各級維持相近）
   *   reach   ← 願意打多遠
   */
  const LEVELS={
    1:{tempo:.90,interval:3.0,margin:1.40,reach:2,upgradeAt:.80,label:'新手'},
    2:{tempo:.95,interval:2.6,margin:1.34,reach:3,upgradeAt:.75,label:'普通'},
    3:{tempo:1.00,interval:2.2,margin:1.28,reach:3,upgradeAt:.70,label:'精銳'},
    4:{tempo:1.05,interval:1.8,margin:1.20,reach:4,upgradeAt:.64,label:'名將'},
    5:{tempo:1.10,interval:1.4,margin:1.12,reach:4,upgradeAt:.58,label:'霸主'},
  };
  const profileFor=level=>LEVELS[Math.max(1,Math.min(5,level))]||LEVELS[2];

  function create(side,difficulty){
    const profile=profileFor(difficulty);
    return{side,profile,clock:profile.interval*.6,plan:null};
  }
  /* 把難度的產能倍率掛進對局；建立 AI 後必須呼叫一次。 */
  function attach(match,ai){
    match.sideTempo=match.sideTempo||[1,1];
    match.sideTempo[ai.side]=ai.profile.tempo;
    return ai;
  }

  /*
   * 拆成兩部分回報：
   *   wall   ＝ 城牆與駐軍，是確定值（守城加成已算進去）
   *   mobile ＝ 路上會攔截的敵軍，是不確定值
   * 安全倍率只該乘在 mobile 上。乘在 wall 上等於把難度算兩次——
   * 實測那樣會讓 AI 幾乎不出手，五張地圖全部拖到保險絲。
   */
  function threatAt(match,ai,target,path){
    const wallOf=node=>node.troops*MatchState.defenseOf(match.config,node,MatchState.deficitOf(match,node.owner));
    let wall=target.owner===ai.side?0:wallOf(target),mobile=0;
    const corridor=new Set();
    for(let i=1;i<path.length;i++)corridor.add(match.map.edge(path[i-1],path[i])?.key);
    for(const soldier of match.soldiers)if(soldier.side!==ai.side&&corridor.has(soldier.edge.key))mobile++;
    for(let i=1;i<path.length-1;i++){const middle=match.nodes[path[i]];if(middle.owner!==ai.side)wall+=wallOf(middle);}
    return{wall,mobile,total:wall+mobile};
  }

  /*
   * 會集中兵力：單一城寨的半數駐軍幾乎打不下有產能的目標（模擬顯示主城陷落率為 0），
   * 因此改成先選目標，再從最近的幾座城寨湊足兵力一起出手 —— 就是人類玩家的多選出兵。
   */
  function think(match,ai){
    const reach=ai.profile.reach;
    const mine=MatchState.ownedNodes(match,ai.side)
      .map(node=>({node,available:Math.floor(node.troops*match.config.dispatchRatio)}))
      .filter(entry=>entry.available>=2&&entry.node.troops>=match.config.minDispatchTroops
        &&(entry.node.cooldown||0)<=0);
    if(!mine.length)return null;

    let best=null;
    for(const target of Object.values(match.nodes)){
      if(target.owner===ai.side)continue;
      const reachable=mine
        .map(entry=>({...entry,path:match.map.shortestPath(entry.node.id,target.id)}))
        .filter(entry=>entry.path.length>=2&&entry.path.length-1<=reach)
        .sort((a,b)=>a.path.length-b.path.length||b.available-a.available);
      if(!reachable.length)continue;
      const threat=threatAt(match,ai,target,reachable[0].path);
      const required=threat.wall+threat.mobile*ai.profile.margin+1;
      /* 兵糧也是出手條件：湊得出兵卻養不起遠征，就不該發動。 */
      const perSoldier=MatchState.foodCostPerSoldier(match.config,reachable[0].path.length-1);
      const affordable=Math.floor(match.food[ai.side]/perSoldier);
      if(affordable<required)continue;
      const chosen=[];let pooled=0;
      for(const entry of reachable){
        chosen.push(entry);pooled+=entry.available;
        if(pooled>=Math.min(required,affordable))break;
      }
      if(pooled<required||chosen.length>3)continue;
      const distance=chosen[chosen.length-1].path.length-1;
      const worth=(target.owner<0?40:26)+(target.type==='base'?34:0)-threat.total*1.4-distance*7
        -(chosen.length-1)*4+match.rng()*3;   /* 微幅抖動，避免同分時永遠偏袒地圖上排在前面的城寨 */
      if(!best||worth>best.worth)best={sources:chosen.map(entry=>entry.node),target,worth};
    }
    return best;
  }

  function update(match,ai,dt){
    if(match.over)return;
    ai.clock-=dt;
    if(ai.clock>0)return;
    ai.clock=ai.profile.interval*(.8+match.rng()*.4);

    /* 兵滿了打不出去就升級，避免產能浪費在上限上。 */
    for(const node of MatchState.ownedNodes(match,ai.side)){
      const capacity=MatchState.capacityOf(match.config,node);
      const cost=MatchState.levelOf(match.config,node.level+1).cost;
      if(node.level<match.config.levels.length&&node.troops>=capacity*ai.profile.upgradeAt&&node.troops>cost*1.6){
        if(MatchState.upgrade(match,node.id))return;
      }
    }
    /*
     * 公平性：玩家只有一隻手，一次只能點一座城寨出兵。
     * AI 若能在同一個決策裡同時從三座城發兵，那不是難度而是作弊。
     * 因此改成「擬定作戰計畫，每次決策只發一座城」——要集中兵力就得跟玩家一樣分好幾次下令，
     * 它的手速就是難度參數 interval。
     */
    if(ai.plan){
      const target=match.nodes[ai.plan.targetId];
      const nextId=ai.plan.sources.shift();
      const source=nextId&&match.nodes[nextId];
      const stillWorth=target&&target.owner!==ai.side;
      if(stillWorth&&source&&source.owner===ai.side&&(source.cooldown||0)<=0){
        MatchState.dispatch(match,source.id,target.id,match.config.dispatchRatio);
      }
      if(!ai.plan.sources.length||!stillWorth)ai.plan=null;
      return;
    }
    const move=think(match,ai);
    if(!move)return;
    const sources=move.sources.map(node=>node.id);
    MatchState.dispatch(match,sources[0],move.target.id,match.config.dispatchRatio);
    if(sources.length>1)ai.plan={targetId:move.target.id,sources:sources.slice(1)};
  }

  return{LEVELS,profileFor,create,attach,update,think};
});
