/* 戰鬥唯一真實來源：場景與自動測試都必須使用這份規則。 */
const CombatRules=(()=>{
  const units={
    guard:{name:'槍盾',hp:260,atk:46,speed:54,range:28,cooldown:.9,squad:6,visualScale:.094},
    archer:{name:'弓兵',hp:170,atk:48,speed:51,range:105,cooldown:1.0,squad:6,visualScale:.094},
    cavalry:{name:'騎兵',hp:360,atk:72,speed:74,range:34,cooldown:.85,squad:4,visualScale:.112},
    hero:{name:'武將',hp:930,atk:102,speed:96,range:42,cooldown:.68,squad:1,visualScale:.25,stationScale:.15,chargeMultiplier:2.2},
  };
  const counters={guard:'cavalry',cavalry:'archer',archer:'guard'};
  const ADVANTAGE=1.9,DISADVANTAGE=.6,NEUTRAL=1;

  function matchup(attacker,defender){
    if(attacker==='hero'||defender==='hero'||attacker===defender)return NEUTRAL;
    if(counters[attacker]===defender)return ADVANTAGE;
    if(counters[defender]===attacker)return DISADVANTAGE;
    return NEUTRAL;
  }
  function damage(attacker,defender,attackValue=units[attacker].atk,modifier=1){return attackValue*matchup(attacker,defender)*modifier;}

  /* 無建築介入的確定性小隊模擬，用於平衡測試；傷害同一 tick 同步結算。 */
  function simulateSquadDuel(kindA,kindB,{maxSeconds=30,dt=.05,startDistance=260}={}){
    const a=units[kindA],b=units[kindB];
    const make=(spec)=>Array.from({length:spec.squad},()=>({hp:spec.hp,cd:0}));
    const armyA=make(a),armyB=make(b);let distance=startDistance,time=0;
    const alive=army=>army.filter(x=>x.hp>0);
    while(time<maxSeconds&&alive(armyA).length&&alive(armyB).length){
      const aa=alive(armyA),bb=alive(armyB),inA=distance<=a.range+18,inB=distance<=b.range+18;
      const pendingA=new Map(),pendingB=new Map();
      for(const u of aa){u.cd=Math.max(0,u.cd-dt);if(inA&&u.cd<=0){u.cd=a.cooldown;const target=bb[0];pendingB.set(target,(pendingB.get(target)||0)+damage(kindA,kindB));}}
      for(const u of bb){u.cd=Math.max(0,u.cd-dt);if(inB&&u.cd<=0){u.cd=b.cooldown;const target=aa[0];pendingA.set(target,(pendingA.get(target)||0)+damage(kindB,kindA));}}
      for(const [u,hurt] of pendingA)u.hp-=hurt;for(const [u,hurt] of pendingB)u.hp-=hurt;
      if(!inA||!inB){const closing=(inA?0:a.speed)+(inB?0:b.speed);distance=Math.max(0,distance-closing*dt);}
      time+=dt;
    }
    const hpA=alive(armyA).reduce((sum,u)=>sum+u.hp,0),hpB=alive(armyB).reduce((sum,u)=>sum+u.hp,0);
    return{winner:hpA===hpB?'draw':hpA>hpB?kindA:kindB,survivorsA:alive(armyA).length,survivorsB:alive(armyB).length,hpA:Math.round(hpA),hpB:Math.round(hpB),seconds:Number(time.toFixed(2))};
  }
  return{units,counters,ADVANTAGE,DISADVANTAGE,NEUTRAL,matchup,damage,simulateSquadDuel};
})();

if(typeof module!=='undefined')module.exports=CombatRules;
