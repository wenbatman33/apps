/*
 * 武將系統（改版）：武將是「帶兵出征的統帥」，不是站在城裡的 buff。
 *
 * 舊版把武將做成駐守加成，玩家看不出武將在幹嘛——人站在城裡，效果只是背景數字。
 * 現在：
 *   1. 武將帶著一波部隊出擊，該波獲得他的專屬威力
 *   2. 沒有駐軍功能，只有三種狀態：待命 / 出征中 / 折損
 *   3. 整波被全殲則武將折損，等一段時間後自動歸隊（不會永久失去）
 */
(function(root,factory){
  const node=typeof require!=='undefined'&&typeof module!=='undefined';
  const api=factory(node?require('./mapData.js'):root.MapData);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.Heroes=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(MapData){

  /*
   * 每名武將只改變「他帶的那一波」，各自對應一種戰術用途：
   *   關羽＝破城　張飛＝正面對撞　趙雲＝斬首　馬超＝兵力　黃忠＝清路
   */
  const HEROES={
    guanyu:{id:'guanyu',name:'關羽',title:'破城',
      desc:'所率部隊攻城威力加倍',assaultPower:2},
    zhangfei:{id:'zhangfei',name:'張飛',title:'衝陣',
      desc:'所率部隊行軍 +60%，路上一換二',marchSpeed:1.6,soldierHp:2},
    zhaoyun:{id:'zhaoyun',name:'趙雲',title:'突擊',
      desc:'所率部隊行軍加倍，抵達時額外斬敵 8 名',marchSpeed:2,strikeOnArrive:8},
    machao:{id:'machao',name:'馬超',title:'鐵騎',
      desc:'所率部隊人數增加五成',quantityBonus:1.5},
    huangzhong:{id:'huangzhong',name:'黃忠',title:'神射',
      desc:'行軍途中每秒射殺一名同路敵軍',snipeInterval:1},
  };
  const ORDER=['guanyu','zhangfei','zhaoyun','machao','huangzhong'];
  const DOWN_SECONDS=25;

  function createRoster(side,ids=ORDER){
    return ids.map(id=>({
      id,side,def:HEROES[id],
      status:'ready',          /* ready / marching / down */
      cooldown:0,pending:false,arrived:false,
    }));
  }

  const find=(match,heroId)=>(match.heroes||[]).find(hero=>hero.id===heroId);
  const readyHeroes=(match,side)=>(match.heroes||[]).filter(h=>h.side===side&&h.status==='ready');
  /* 這一方有沒有武將正在等著帶下一波兵。 */
  const pendingHero=(match,side)=>(match.heroes||[]).find(h=>h.side===side&&h.pending&&h.status==='ready');

  /* 指派：接下來的一次出兵由這名武將帶領；再點一次可取消。 */
  function lead(match,heroId){
    const hero=find(match,heroId);
    if(!hero||hero.status!=='ready')return false;
    for(const other of match.heroes)if(other.side===hero.side&&other!==hero)other.pending=false;
    hero.pending=!hero.pending;
    return hero.pending;
  }

  /* 出兵時呼叫：把待命中的武將綁到這一波，回傳該武將（或 null）。 */
  function attachToWave(match,side){
    const hero=pendingHero(match,side);
    if(!hero)return null;
    hero.pending=false;hero.status='marching';hero.arrived=false;
    match.events.push({type:'heroLead',hero:hero.id,side});
    return hero;
  }

  /* 武將在戰場上的位置＝他所率部隊最前方那一名士兵。 */
  function positionOf(match,hero){
    if(hero.status!=='marching')return null;
    let best=null;
    for(const soldier of match.soldiers){
      if(soldier.heroId!==hero.id)continue;
      const progress=soldier.direction>0?soldier.position:soldier.edge.line.length-soldier.position;
      if(!best||progress>best.progress)best={soldier,progress};
    }
    return best?{x:best.soldier.x,y:best.soldier.y}:null;
  }

  /* 黃忠：行軍途中清掉同一條路上的敵軍。 */
  function snipe(match,dt){
    for(const hero of match.heroes||[]){
      if(hero.status!=='marching'||!hero.def.snipeInterval)continue;
      hero.snipeClock=(hero.snipeClock||0)-dt;
      if(hero.snipeClock>0)continue;
      hero.snipeClock=hero.def.snipeInterval;
      const roads=new Set();
      for(const soldier of match.soldiers)if(soldier.heroId===hero.id)roads.add(soldier.edge.key);
      if(!roads.size)continue;
      const victim=match.soldiers.find(soldier=>soldier.side!==hero.side&&roads.has(soldier.edge.key));
      if(!victim)continue;
      match.soldiers=match.soldiers.filter(soldier=>soldier!==victim);
      match.stats.lost[victim.side]++;
      match.events.push({type:'snipe',hero:hero.id,x:victim.x,y:victim.y});
    }
  }

  /*
   * 狀態機：整波打光且沒有任何人抵達 → 折損，等 DOWN_SECONDS 後自動歸隊。
   * 只要有一名部下抵達目的地，武將就算完成任務、直接回到待命。
   */
  function update(match,dt){
    for(const hero of match.heroes||[]){
      if(hero.status==='down'){
        hero.cooldown=Math.max(0,hero.cooldown-dt);
        if(hero.cooldown<=0){hero.status='ready';match.events.push({type:'heroReturn',hero:hero.id,side:hero.side});}
        continue;
      }
      if(hero.status!=='marching')continue;
      const alive=match.soldiers.some(soldier=>soldier.heroId===hero.id);
      const queued=match.waves.some(wave=>wave.heroId===hero.id&&wave.remaining>0);
      if(alive||queued)continue;
      if(hero.arrived){
        hero.status='ready';
        match.events.push({type:'heroReturn',hero:hero.id,side:hero.side});
      }else{
        hero.status='down';hero.cooldown=DOWN_SECONDS;
        match.events.push({type:'heroDown',hero:hero.id,side:hero.side});
      }
    }
  }

  return{HEROES,ORDER,DOWN_SECONDS,createRoster,find,readyHeroes,pendingHero,lead,attachToWave,positionOf,snipe,update};
});
