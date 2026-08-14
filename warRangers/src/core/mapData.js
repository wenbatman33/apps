/*
 * 地圖唯一真實來源：直接讀 assets/navigation/*.json。
 * 這份資料是舊版留下最可靠的資產（節點座標 + 道路折線都經過遮罩驗證），v2 完整沿用。
 * 本檔不依賴 Phaser，node 與瀏覽器共用。
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MapData=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){

  /*
   * difficulty：該關敵方 AI 的難度（1～5）。不再硬性等於關卡編號——
   *             地圖本身的偏差差異很大（第 4 關長鏈地形對下方位特別不利），
   *             用難度當主要旋鈕比硬塞讓子有效得多。
   * balanceTroops：玩家主城的開局讓子（負數代表反過來讓敵方）。
   * 這是 PvE，校準目標不是「AI 對 AI 五五波」，而是一條難度曲線：
   * 第 1～5 關對玩家的目標勝率為 75 / 65 / 55 / 45 / 35%（見 scripts/calibrate_balance.js）。
   * 數值由模擬量測，勿手改。
   */
  const LEVEL_META={
    1:{difficulty:1,file:'jingzhou_level1_routes_v1.json',art:'jingzhou_level1_master_v1',name:'荊州三渡',subtitle:'三路爭寨・中央渡河',balanceTroops:6},
    2:{difficulty:2,file:'campaign_scene_2_routes_v2.json',art:'campaign_scene_2_master_v1',name:'秋谷斜河',subtitle:'谷地岔路・側翼爭奪',balanceTroops:16},
    3:{difficulty:3,file:'campaign_scene_3_routes_v2.json',art:'campaign_scene_3_master_v1',name:'雪山雙門',subtitle:'雪嶺關隘・雙路突進',balanceTroops:6},
    4:{difficulty:3,file:'campaign_scene_4_routes_v2.json',art:'campaign_scene_4_master_v1',name:'竹澤島鏈',subtitle:'水澤連營・多點包抄',balanceTroops:6},
    5:{difficulty:5,file:'campaign_scene_5_routes_v2.json',art:'campaign_scene_5_master_v1',name:'赤壁包圍網',subtitle:'險道環伺・全域寨網',balanceTroops:-8},
  };
  const levelIds=()=>Object.keys(LEVEL_META).map(Number).sort((a,b)=>a-b);
  const edgeKey=(a,b)=>[a,b].sort().join('|');
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);

  /* 折線總長與等距取樣：士兵沿著這條線走，畫面上就會貼合道路。 */
  function measure(points){
    const cumulative=[0];
    for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+distance(points[i-1],points[i]));
    return{points,cumulative,length:cumulative[cumulative.length-1]};
  }
  function pointAt(line,travelled){
    const target=Math.max(0,Math.min(line.length,travelled)),{points,cumulative}=line;
    for(let i=1;i<points.length;i++){
      if(cumulative[i]<target)continue;
      const span=cumulative[i]-cumulative[i-1],t=span?(target-cumulative[i-1])/span:0;
      return{
        x:points[i-1].x+(points[i].x-points[i-1].x)*t,
        y:points[i-1].y+(points[i].y-points[i-1].y)*t,
        heading:Math.atan2(points[i].y-points[i-1].y,points[i].x-points[i-1].x),
      };
    }
    const last=points[points.length-1],previous=points[points.length-2]||last;
    return{x:last.x,y:last.y,heading:Math.atan2(last.y-previous.y,last.x-previous.x)};
  }

  /*
   * navigation JSON → 對局用的圖。
   * 每條 route 產生一條「有向可用、無向共享」的邊：a→b 與 b→a 走同一條折線，
   * 對撞判定才能在同一條線上比較行進距離。
   */
  function build(raw,levelId){
    const meta=LEVEL_META[levelId]||LEVEL_META[1];
    const nodes=Object.entries(raw.nodes).map(([id,point])=>({
      id,
      type:id==='player'||id==='enemy'?'base':'outpost',
      startOwner:id==='player'?0:id==='enemy'?1:-1,
      x:point.x,y:point.y,
    }));
    const byId=Object.fromEntries(nodes.map(node=>[node.id,node]));
    const edges=[],edgeByKey={};
    for(const route of raw.routes){
      if(!route.from||!route.to)throw new Error(`route ${route.id} 未綁定節點`);
      const source=byId[route.from],target=byId[route.to];
      if(!source||!target)throw new Error(`route ${route.id} 指向不存在的節點`);
      const key=edgeKey(route.from,route.to);
      if(edgeByKey[key])continue;
      const points=[{x:source.x,y:source.y},...route.points.map(p=>({x:p.x,y:p.y})),{x:target.x,y:target.y}]
        .filter((point,index,all)=>index===0||distance(all[index-1],point)>.5);
      const edge={key,a:route.from,b:route.to,line:measure(points)};
      edges.push(edge);edgeByKey[key]=edge;
    }
    const adjacency=Object.fromEntries(nodes.map(node=>[node.id,[]]));
    for(const edge of edges){adjacency[edge.a].push(edge.b);adjacency[edge.b].push(edge.a);}
    for(const node of nodes)if(!adjacency[node.id].length)throw new Error(`節點 ${node.id} 沒有任何道路相連`);

    const map={
      id:levelId,name:meta.name,subtitle:meta.subtitle,art:meta.art,
      width:720,height:1280,roadWidth:raw.roadWidth||40,
      nodes,byId,edges,edgeByKey,adjacency,
      edge(from,to){return edgeByKey[edgeKey(from,to)]||null;},
      /* 沿邊行進：direction 1 代表 a→b。 */
      direction(from,to){const edge=this.edge(from,to);return edge?(edge.a===from?1:-1):0;},
      shortestPath(from,to){return shortestPath(this,from,to);},
      balanceTroops:meta.balanceTroops||0,
      difficulty:meta.difficulty||3,
    };
    map.roadStats=measureFairness(map);
    return map;
  }

  /*
   * 地圖是「敵在上、玩家在下」畫的，城寨群普遍偏上，導致敵方主城到各城寨的實際道路
   * 明顯較短（第 5 關拓樸完全對稱，我方道路卻長 166px，模擬勝率只有 23.8%）。
   * 道路已烘進背景圖不能移動節點，因此把地利差量化出來，交給對局在開場用兵力抵銷。
   */
  function measureFairness(map){
    const outposts=map.nodes.filter(node=>node.type==='outpost');
    const roadLength=(from,to)=>{
      const path=shortestPath(map,from,to);let total=0;
      for(let i=1;i<path.length;i++)total+=map.edge(path[i-1],path[i]).line.length;
      return total;
    };
    const average=baseId=>outposts.length?outposts.reduce((sum,node)=>sum+roadLength(baseId,node.id),0)/outposts.length:0;
    const player=average('player'),enemy=average('enemy');
    return{player,enemy,gap:player-enemy};
  }

  function shortestPath(map,from,to){
    if(from===to)return[from];
    const queue=[from],previous={[from]:null};
    while(queue.length){
      const current=queue.shift();
      for(const next of map.adjacency[current]||[]){
        if(next in previous)continue;
        previous[next]=current;
        if(next===to){const path=[to];let at=to;while(previous[at]){at=previous[at];path.push(at);}return path.reverse();}
        queue.push(next);
      }
    }
    return[];
  }

  /* node 端載入（測試與模擬用）；瀏覽器端由 loadLevelInBrowser 走 fetch。 */
  function loadLevel(levelId,fs,path){
    const meta=LEVEL_META[levelId];if(!meta)throw new Error(`沒有第 ${levelId} 關`);
    const file=path.join(__dirname,'..','..','assets','navigation',meta.file);
    return build(JSON.parse(fs.readFileSync(file,'utf8')),levelId);
  }
  async function loadLevelInBrowser(levelId,root='assets/navigation'){
    const meta=LEVEL_META[levelId];if(!meta)throw new Error(`沒有第 ${levelId} 關`);
    const response=await fetch(`${root}/${meta.file}`);
    if(!response.ok)throw new Error(`讀不到 ${meta.file}：${response.status}`);
    return build(await response.json(),levelId);
  }

  return{LEVEL_META,levelIds,build,loadLevel,loadLevelInBrowser,pointAt,measure,edgeKey};
});
