/*
 * 軍師策略：孔明（我方）與司馬懿（敵方）共用同一套規則。
 *
 * 設計原則——策略是「節奏道具」，不是勝負開關：
 *   1. 計策值隨時間與持有城寨累積，滾雪球的一方策略也更快，但單張效果有上限
 *   2. 手牌固定兩張，用掉一張立刻補抽，玩家永遠有選擇但不會被選項淹沒
 *   3. 敵方施放前會先預警，玩家有反應時間
 */
(function(root,factory){
  const node=typeof require!=='undefined'&&typeof module!=='undefined';
  const api=factory(node?require('./mapData.js'):root.MapData);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.Tactics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(MapData){

  const COST=100;
  /*
   * 計謀打在「路」上而不是「城」上：火攻與拒馬本來就是道路上的伏擊手段，
   * 打城只是把它變成另一種傷害數字，失去了「切斷哪一條補給線」的判斷。
   */
  const TACTICS={
    fire:{id:'fire',name:'火計',target:'road',desc:'火燒一條道路，殲滅路上敵軍',amount:12},
    barricade:{id:'barricade',name:'拒馬',target:'road',desc:'封鎖一條道路 6 秒，敵軍寸步難行',duration:6},
    forcedMarch:{id:'forcedMarch',name:'急行軍',target:'none',desc:'我方全軍行軍速度 +80%，持續 8 秒',duration:8,multiplier:1.8},
    farming:{id:'farming',name:'屯田',target:'none',desc:'立刻補充 40 點兵糧',amount:40},
    defect:{id:'defect',name:'策反',target:'hostile',desc:'指定敵城，三成守軍當場倒戈',ratio:.3},
  };
  const DECK=['fire','barricade','forcedMarch','farming','defect'];

  function createState(side,rng){
    const shuffled=[...DECK].sort(()=>rng()-.5);
    return{side,points:0,hand:shuffled.slice(0,2),deck:shuffled.slice(2),discard:[],warning:null};
  }
  const canCast=(state,cardId)=>state.points>=COST&&state.hand.includes(cardId);

  function draw(state,rng){
    if(!state.deck.length){state.deck=state.discard.sort(()=>rng()-.5);state.discard=[];}
    return state.deck.shift()||DECK[Math.floor(rng()*DECK.length)];
  }

  /*
   * 累積速度：原本 1+0.3/寨，集滿 100 要 45～77 秒——一場 120 秒只放得出一張，
   * 玩家的感受是「計謀根本用不出來」。改成開局約 30 秒可放第一張，中盤每 15～20 秒一張。
   * 敵方軍師刻意慢一截（PvE 讓玩家吃到策略紅利）。
   */
  const ENEMY_TEMPO=.72;
  function gain(match,state,dt,ownedCount){
    const rate=(2.2+ownedCount*.9)*(state.side===1?ENEMY_TEMPO:1);
    state.points=Math.min(COST,state.points+rate*dt);
  }

  /* 實際結算；回傳是否成功。target 只有 target!=='none' 的卡需要。 */
  function cast(match,state,cardId,targetId){
    const card=TACTICS[cardId];
    if(!card||!canCast(state,cardId))return false;
    const side=state.side;
    const road=card.target==='road'?match.map.edgeByKey[targetId]:null;
    const target=card.target==='road'?null:(targetId?match.nodes[targetId]:null);
    if(card.target==='road'&&!road)return false;
    if(card.target==='hostile'&&(!target||target.owner===side))return false;
    if(card.target==='own'&&(!target||target.owner!==side))return false;

    if(card.id==='fire'){
      const victims=match.soldiers.filter(soldier=>soldier.side!==side&&soldier.edge.key===road.key).slice(0,card.amount);
      if(!victims.length)return false;                       /* 空路放火沒有意義，直接擋下並保留手牌 */
      const dead=new Set(victims.map(soldier=>soldier.id));
      match.soldiers=match.soldiers.filter(soldier=>!dead.has(soldier.id));
      for(const victim of victims)match.stats.lost[victim.side]++;
      const middle=MapData.pointAt(road.line,road.line.length/2);
      match.events.push({type:'tactic',card:card.id,side,road:road.key,x:middle.x,y:middle.y,amount:victims.length});
    }
    if(card.id==='defect'){
      const moved=Math.floor(target.troops*card.ratio);
      target.troops-=moved;
      const home=Object.values(match.nodes).filter(node=>node.owner===side)
        .map(node=>({node,steps:match.map.shortestPath(target.id,node.id).length||99}))
        .sort((a,b)=>a.steps-b.steps)[0];
      if(home)home.node.troops+=moved;
      match.events.push({type:'tactic',card:card.id,side,node:target.id,x:target.x,y:target.y,amount:moved});
    }
    if(card.id==='barricade'){
      match.blocks.push({key:road.key,side,until:match.time+card.duration});
      const middle=MapData.pointAt(road.line,road.line.length/2);
      match.events.push({type:'tactic',card:card.id,side,road:road.key,x:middle.x,y:middle.y});
    }
    if(card.id==='forcedMarch'){
      match.marchBoost[side]={until:match.time+card.duration,multiplier:card.multiplier};
      match.events.push({type:'tactic',card:card.id,side});
    }
    if(card.id==='farming'){
      const owned=Object.values(match.nodes).filter(node=>node.owner===side).length;
      match.food[side]=Math.min(match.config.foodCapBase+match.config.foodCapPerNode*owned,match.food[side]+card.amount);
      match.events.push({type:'tactic',card:card.id,side,amount:card.amount});
    }

    state.points-=COST;
    state.hand=state.hand.filter(id=>id!==cardId);
    state.discard.push(cardId);
    state.hand.push(draw(state,match.rng));
    return true;
  }

  /* 敵方軍師：先預警再施放，讓玩家有反應時間。 */
  function updateEnemy(match,state,dt,ownedCount){
    gain(match,state,dt,ownedCount);
    if(state.warning){
      state.warning.delay-=dt;
      if(state.warning.delay<=0){
        cast(match,state,state.warning.card,state.warning.target);
        state.warning=null;
      }
      return;
    }
    if(state.points<COST)return;
    const plan=pickEnemyPlay(match,state);
    if(!plan)return;
    state.warning={...plan,delay:1.5};
    match.events.push({type:'tacticWarning',side:state.side,card:plan.card,node:plan.target});
  }

  function pickEnemyPlay(match,state){
    const side=state.side;
    const hostile=Object.values(match.nodes).filter(node=>node.owner!==side);
    const mine=Object.values(match.nodes).filter(node=>node.owner===side);
    const richest=[...hostile].sort((a,b)=>b.troops-a.troops)[0];
    const threatened=[...mine].sort((a,b)=>a.troops-b.troops)[0];
    /* 路上敵軍最多的那條，就是最值得放火或封鎖的補給線。 */
    const byRoad=new Map();
    for(const soldier of match.soldiers){
      if(soldier.side===side)continue;
      byRoad.set(soldier.edge.key,(byRoad.get(soldier.edge.key)||0)+1);
    }
    const busiest=[...byRoad.entries()].sort((a,b)=>b[1]-a[1])[0];
    for(const card of state.hand){
      if(card==='fire'&&busiest&&busiest[1]>=6)return{card,target:busiest[0]};
      if(card==='barricade'&&busiest&&busiest[1]>=4)return{card,target:busiest[0]};
      if(card==='defect'&&richest&&richest.troops>=14)return{card,target:richest.id};
      if(card==='farming')return{card,target:null};
      if(card==='forcedMarch'&&match.soldiers.some(soldier=>soldier.side===side))return{card,target:null};
    }
    return null;
  }

  return{COST,TACTICS,DECK,ENEMY_TEMPO,createState,canCast,cast,gain,updateEnemy,pickEnemyPlay,draw};
});
