/*
 * 戰役地圖唯一真實來源。
 * 24×42 格同時決定：道路圖塊、橋梁、可行走區、預覽驗證線與士兵尋路。
 * 不存在「看背景猜道路」或另一套隱藏座標。
 */
const CampaignRules=(()=>{
  const GRID={cols:24,rows:42,tile:30,width:720,height:1260};
  const ROAD_VISUAL_SIZE=74;
  const unitTypes=['guard','archer','cavalry'];
  const settings={
    matchSeconds:180,baseHp:7200,
    baseCapacity:54,outpostCapacity:32,baseStartGarrison:20,neutralGarrison:6,
    /* 出兵是本作唯一的主動操作：一次派出六成駐軍、幾乎不設上限，冷卻只留手感用的 0.35 秒。 */
    baseRecruit:1.35,outpostRecruit:1.7,dispatchFraction:.6,dispatchWaveCap:32,manualDispatchCooldown:.35,fieldUnitCap:120,
    supplyPerOutpost:.3,heroSpawnBonus:.08,repairRate:.055,capturedIntegrity:.32,attackWear:.035,siegeDamage:800,
    aiOpeningDelay:2.4,aiDecisionInterval:2.4,
    tacticCooldown:18,blockadeDuration:5.5,blockadeRadius:92,enemyTacticCooldown:25,tacticDamage:240,
    defenseRange:138,outpostArrowDamage:34,baseArrowDamage:44,defenseCooldown:1.45,
    heroRespawnCooldown:12,heroAssaultInterval:.9,heroGarrisonDamage:3,heroSiegeDamage:520,
    winMerit:3,lossMerit:1,commanderPerLevel:.08,
  };
  const key=(c,r)=>`${c},${r}`;
  const center=cell=>({x:(cell.c+.5)*GRID.tile,y:(cell.r+.5)*GRID.tile});
  const C=(c,r)=>({c,r});
  const P=(...pairs)=>pairs.map(([c,r])=>C(c,r));
  const edgeKey=(a,b)=>[a,b].sort().join('|');

  function line(a,b){
    if(a.c!==b.c&&a.r!==b.r)throw new Error(`grid segment must be orthogonal: ${key(a.c,a.r)}>${key(b.c,b.r)}`);
    const out=[],dc=Math.sign(b.c-a.c),dr=Math.sign(b.r-a.r);let c=a.c,r=a.r;
    for(;;){out.push(C(c,r));if(c===b.c&&r===b.r)break;c+=dc;r+=dr;}
    return out;
  }
  function polyline(points){
    const out=[];
    for(let i=1;i<points.length;i++){const part=line(points[i-1],points[i]);if(out.length)part.shift();out.push(...part);}
    return out;
  }
  function makeRoute(a,b,points){return{a,b,cells:polyline(points)};}
  const node=(id,type,c,r,owner=-1)=>({id,type,cell:C(c,r),owner});

  const themes={
    plains:{ground:'tile_grass_v6',road:'tile_road_plains_v6',obstacle:'tile_water_plains_v6',bridge:'tile_bridge_plains_v6',roadSheet:'tile_plains_autotile_v9'},
    cliffs:{ground:'tile_red_ground_v6',road:'tile_road_cliffs_v6',obstacle:'tile_water_cliffs_v6',bridge:'tile_bridge_cliffs_v6'},
    snow:{ground:'tile_snow_ground_v6',road:'tile_road_snow_v6',obstacle:'tile_ice_snow_v6',bridge:'tile_bridge_snow_v6'},
  };

  function buildMap({id,name,subtitle,theme,nodes:nodeSpecs,routes,riverRows=[]}){
    const nodes=nodeSpecs.map(spec=>({...spec,...center(spec.cell)}));
    const routeByEdge={},walkable=new Set();
    for(const route of routes){
      routeByEdge[edgeKey(route.a,route.b)]=route.cells;
      for(const cell of route.cells)walkable.add(key(cell.c,cell.r));
    }
    for(const spec of nodes)walkable.add(key(spec.cell.c,spec.cell.r));
    const obstacleTiles=new Set();
    for(const r of riverRows)for(let c=0;c<GRID.cols;c++)obstacleTiles.add(key(c,r));
    const bridgeTiles=new Set([...walkable].filter(cellKey=>obstacleTiles.has(cellKey)));
    return{
      id,name,subtitle,theme:themes[theme],themeId:theme,nodes,routes,
      edges:routes.map(({a,b})=>[a,b]),routeByEdge,walkable,
      roadTiles:new Set(walkable),obstacleTiles,bridgeTiles,riverRows:[...riverRows],
    };
  }

  function fromNavigation(navigation,id){
    const titles={
      1:['荊州三渡','三路爭寨・中央渡河'],
      2:['秋谷斜河','谷地岔路・側翼爭奪'],
      3:['雪山雙門','雪嶺關隘・雙路突進'],
      4:['竹澤島鏈','水澤連營・多點包抄'],
      5:['赤壁包圍網','熔岩險道・全域寨網'],
    };
    const nodes=Object.entries(navigation.nodes).map(([nodeId,point])=>({
      id:nodeId,
      type:nodeId==='enemy'||nodeId==='player'?'base':'outpost',
      owner:nodeId==='enemy'?1:nodeId==='player'?0:-1,
      x:point.x,y:point.y,
    }));
    const routeByEdge={},routes=[];
    for(const authored of navigation.routes){
      if(!authored.from||!authored.to)throw new Error(`route ${authored.id} is not bound to nodes`);
      const route={id:authored.id,a:authored.from,b:authored.to,points:authored.points.map(point=>({...point}))};
      routes.push(route);routeByEdge[edgeKey(route.a,route.b)]=route;
    }
    const [name,subtitle]=titles[id]||[`第 ${id} 關`,'爭奪戰'];
    return{id,name,subtitle,authored:true,nodes,routes,edges:routes.map(route=>[route.a,route.b]),routeByEdge,navigation};
  }

  const maps=[
    buildMap({
      id:1,name:'荊州三渡',subtitle:'三路爭寨・中央渡河',theme:'plains',riverRows:[20,21],
      nodes:[node('enemy','base',12,2,1),node('northwest','outpost',5,8),node('northeast','outpost',19,8),node('center','outpost',12,16),node('southwest','outpost',5,29),node('southeast','outpost',19,29),node('player','base',12,39,0)],
      routes:[
        makeRoute('enemy','center',P([12,2],[12,16])),
        makeRoute('enemy','northwest',P([12,2],[12,5],[5,5],[5,8])),
        makeRoute('enemy','northeast',P([12,2],[12,5],[19,5],[19,8])),
        makeRoute('northwest','southwest',P([5,8],[5,29])),
        makeRoute('northeast','southeast',P([19,8],[19,29])),
        makeRoute('center','player',P([12,16],[12,39])),
        makeRoute('southwest','player',P([5,29],[5,35],[12,35],[12,39])),
        makeRoute('southeast','player',P([19,29],[19,35],[12,35],[12,39])),
      ],
    }),
    buildMap({
      id:2,name:'赤壁水寨',subtitle:'雙河水網・偏心突擊',theme:'cliffs',riverRows:[14,15,25,26],
      nodes:[node('enemy','base',17,2,1),node('northwest','outpost',5,8),node('northeast','outpost',19,10),node('center','outpost',12,19),node('southwest','outpost',4,30),node('southeast','outpost',18,31),node('player','base',7,39,0)],
      routes:[
        makeRoute('enemy','northwest',P([17,2],[17,5],[5,5],[5,8])),
        makeRoute('enemy','northeast',P([17,2],[17,7],[19,7],[19,10])),
        makeRoute('northwest','center',P([5,8],[5,19],[12,19])),
        makeRoute('northeast','center',P([19,10],[19,19],[12,19])),
        makeRoute('center','southwest',P([12,19],[4,19],[4,30])),
        makeRoute('center','southeast',P([12,19],[18,19],[18,31])),
        makeRoute('southwest','player',P([4,30],[4,36],[7,36],[7,39])),
        makeRoute('southeast','player',P([18,31],[18,36],[7,36],[7,39])),
      ],
    }),
    buildMap({
      id:3,name:'定軍山道',subtitle:'山口繞行・中央捷徑',theme:'snow',riverRows:[19,20],
      nodes:[node('enemy','base',12,2,1),node('northwest','outpost',5,9),node('northeast','outpost',18,8),node('center','outpost',12,17),node('southwest','outpost',6,30),node('southeast','outpost',18,31),node('player','base',12,39,0)],
      routes:[
        makeRoute('enemy','northwest',P([12,2],[12,5],[5,5],[5,9])),
        makeRoute('enemy','northeast',P([12,2],[12,5],[18,5],[18,8])),
        makeRoute('enemy','center',P([12,2],[12,17])),
        makeRoute('northwest','center',P([5,9],[5,17],[12,17])),
        makeRoute('northeast','southeast',P([18,8],[18,31])),
        makeRoute('center','southwest',P([12,17],[6,17],[6,30])),
        makeRoute('center','player',P([12,17],[12,39])),
        makeRoute('southwest','player',P([6,30],[6,35],[12,35],[12,39])),
        makeRoute('southeast','player',P([18,31],[18,35],[12,35],[12,39])),
      ],
    }),
    buildMap({
      id:4,name:'五丈原',subtitle:'斜向戰局・多點包抄',theme:'plains',riverRows:[21,22],
      nodes:[node('enemy','base',18,2,1),node('upperwest','outpost',5,8),node('uppereast','outpost',20,10),node('center','outpost',11,17),node('middlewest','outpost',4,27),node('middleeast','outpost',18,29),node('lowercenter','outpost',10,34),node('player','base',4,39,0)],
      routes:[
        makeRoute('enemy','upperwest',P([18,2],[18,5],[5,5],[5,8])),
        makeRoute('enemy','uppereast',P([18,2],[18,7],[20,7],[20,10])),
        makeRoute('upperwest','center',P([5,8],[5,17],[11,17])),
        makeRoute('uppereast','center',P([20,10],[20,17],[11,17])),
        makeRoute('center','middlewest',P([11,17],[4,17],[4,27])),
        makeRoute('center','middleeast',P([11,17],[18,17],[18,29])),
        makeRoute('middlewest','lowercenter',P([4,27],[4,34],[10,34])),
        makeRoute('middleeast','lowercenter',P([18,29],[18,34],[10,34])),
        makeRoute('lowercenter','player',P([10,34],[4,34],[4,39])),
      ],
    }),
    buildMap({
      id:5,name:'天水終局',subtitle:'三渡雙環・全域寨網',theme:'plains',riverRows:[17,18,25,26],
      nodes:[node('enemy','base',12,2,1),node('northwest','outpost',4,8),node('northeast','outpost',20,8),node('uppercenter','outpost',12,13),node('center','outpost',12,21),node('southwest','outpost',4,29),node('southeast','outpost',20,29),node('lowercenter','outpost',12,34),node('player','base',12,39,0)],
      routes:[
        makeRoute('enemy','uppercenter',P([12,2],[12,13])),
        makeRoute('enemy','northwest',P([12,2],[12,5],[4,5],[4,8])),
        makeRoute('enemy','northeast',P([12,2],[12,5],[20,5],[20,8])),
        makeRoute('northwest','center',P([4,8],[4,21],[12,21])),
        makeRoute('northeast','center',P([20,8],[20,21],[12,21])),
        makeRoute('uppercenter','center',P([12,13],[12,21])),
        makeRoute('center','southwest',P([12,21],[4,21],[4,29])),
        makeRoute('center','southeast',P([12,21],[20,21],[20,29])),
        makeRoute('center','lowercenter',P([12,21],[12,34])),
        makeRoute('southwest','lowercenter',P([4,29],[4,34],[12,34])),
        makeRoute('southeast','lowercenter',P([20,29],[20,34],[12,34])),
        makeRoute('lowercenter','player',P([12,34],[12,39])),
      ],
    }),
  ];

  const supplyRate=ownedOutposts=>1+ownedOutposts*settings.supplyPerOutpost;
  /*
   * 每一方只有一份共享補兵額度。城寨增加補給倍率，但不會讓每座城各自
   * 產生完整的一份兵力；同寨數、同武將數時，敵我每秒總增兵完全相同。
   */
  const totalRecruitRate=(ownedOutposts,stationedHeroes=0)=>
    (1/settings.baseRecruit)*supplyRate(ownedOutposts)*(1+Math.max(0,stationedHeroes)*settings.heroSpawnBonus);
  const garrisonCapacity=type=>type==='base'?settings.baseCapacity:settings.outpostCapacity;
  const dispatchCount=garrison=>garrison<2?0:Math.min(settings.dispatchWaveCap,Math.max(1,Math.floor(garrison*settings.dispatchFraction)));
  function repairIntegrity(integrity,seconds,hasHero=false){return Math.min(1,Math.max(0,integrity)+settings.repairRate*(hasHero?1.35:1)*Math.max(0,seconds));}
  function recruitInterval(type,ownedOutposts,integrity=1,hasHero=false){
    const base=type==='base'?settings.baseRecruit:settings.outpostRecruit,condition=.35+.65*Math.min(1,Math.max(0,integrity));
    return base/(supplyRate(ownedOutposts)*condition*(hasHero?1+settings.heroSpawnBonus:1));
  }
  const reward=win=>win?settings.winMerit:settings.lossMerit;
  function adjacency(map){const out=Object.fromEntries(map.nodes.map(n=>[n.id,[]]));for(const[a,b]of map.edges){out[a].push(b);out[b].push(a);}return out;}
  function shortestPath(map,from,to){
    if(from===to)return[from];const graph=adjacency(map),queue=[[from]],seen=new Set([from]);
    while(queue.length){const path=queue.shift(),last=path.at(-1);for(const next of graph[last]||[]){if(seen.has(next))continue;const candidate=[...path,next];if(next===to)return candidate;seen.add(next);queue.push(candidate);}}
    return[];
  }
  function gridPath(map,start,end){
    const startKey=key(start.c,start.r),endKey=key(end.c,end.r),queue=[startKey],seen=new Set([startKey]),prev=new Map();
    while(queue.length){const current=queue.shift();if(current===endKey)break;const[c,r]=current.split(',').map(Number);
      for(const[dc,dr]of[[1,0],[-1,0],[0,1],[0,-1]]){const next=key(c+dc,r+dr);if(!map.walkable.has(next)||seen.has(next))continue;seen.add(next);prev.set(next,current);queue.push(next);}}
    if(!seen.has(endKey))return[];const out=[];for(let at=endKey;at;at=prev.get(at)){const[c,r]=at.split(',').map(Number);out.push(C(c,r));if(at===startKey)break;}return out.reverse();
  }
  function routeCells(map,from,to){
    if(map.authored)return[];
    const a=map.nodes.find(n=>n.id===from),stored=map.routeByEdge[edgeKey(from,to)];if(!a||!stored)return[];
    return stored[0].c===a.cell.c&&stored[0].r===a.cell.r?stored:[...stored].reverse();
  }
  function routePoints(map,from,to){
    if(!map.authored)return routeCells(map,from,to).map(center);
    const route=map.routeByEdge[edgeKey(from,to)],source=map.nodes.find(node=>node.id===from),target=map.nodes.find(node=>node.id===to);if(!route||!source||!target)return[];
    const authored=route.a===from?route.points:[...route.points].reverse();
    const result=[{x:source.x,y:source.y},...authored.map(point=>({...point})),{x:target.x,y:target.y}];
    return result.filter((point,index)=>index===0||Math.hypot(point.x-result[index-1].x,point.y-result[index-1].y)>.5);
  }
  function tileKeyAt(map,c,r){
    const k=key(c,r);if(map.bridgeTiles.has(k))return map.theme.bridge;if(map.obstacleTiles.has(k))return map.theme.obstacle;if(map.walkable.has(k))return map.theme.road;return map.theme.ground;
  }
  /* N/E/S/W 四位鄰接遮罩到既有 PNG 道路 spritesheet frame。 */
  const roadFrames=[0,1,2,7,3,5,9,12,4,8,6,11,10,14,13,15];
  function roadFrameAt(map,c,r){
    let mask=0;if(map.walkable.has(key(c,r-1)))mask|=1;if(map.walkable.has(key(c+1,r)))mask|=2;if(map.walkable.has(key(c,r+1)))mask|=4;if(map.walkable.has(key(c-1,r)))mask|=8;
    return roadFrames[mask];
  }
  return{GRID,ROAD_VISUAL_SIZE,unitTypes,settings,maps,fromNavigation,supplyRate,totalRecruitRate,garrisonCapacity,dispatchCount,repairIntegrity,recruitInterval,reward,adjacency,shortestPath,gridPath,routeCells,routePoints,tileKeyAt,roadFrameAt,key,center};
})();

if(typeof module!=='undefined')module.exports=CampaignRules;
