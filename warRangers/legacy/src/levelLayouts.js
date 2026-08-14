/* 道路驗證層：只讀 CampaignRules 的格子，不另存任何手描路線。 */
const LevelLayouts=(()=>{
  const rules=typeof CampaignRules!=='undefined'?CampaignRules:require('./campaignRules.js');
  const MAP={width:rules.GRID.width,height:rules.GRID.height};
  const FORMATION=[
    {lateral:-6,longitudinal:-9},{lateral:6,longitudinal:-9},
    {lateral:-6,longitudinal:0},{lateral:6,longitudinal:0},
    {lateral:-6,longitudinal:9},{lateral:6,longitudinal:9},
  ];
  const UNIT_RADIUS=6;
  const levels=rules.maps.map(map=>({
    ...map,chapter:map.name,focus:map.subtitle,
    routes:map.routes.map(spec=>({
      id:`${spec.a}-${spec.b}`,from:spec.a,to:spec.b,cells:spec.cells,
      points:rules.routePoints(map,spec.a,spec.b),halfWidth:rules.ROAD_VISUAL_SIZE/2,
    })),
  }));

  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  function routeLength(spec){let total=0;for(let i=1;i<spec.points.length;i++)total+=distance(spec.points[i-1],spec.points[i]);return total;}
  function sample(spec,value){
    const total=routeLength(spec),target=Math.max(0,Math.min(total,value));let travelled=0;
    for(let i=1;i<spec.points.length;i++){
      const a=spec.points[i-1],b=spec.points[i],length=distance(a,b);
      if(travelled+length>=target){const t=length?((target-travelled)/length):0;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
      travelled+=length;
    }
    return{...spec.points.at(-1)};
  }
  function tangent(spec,value,direction=1){
    const before=sample(spec,value-2*direction),after=sample(spec,value+2*direction),length=Math.hypot(after.x-before.x,after.y-before.y)||1;
    return{x:(after.x-before.x)/length,y:(after.y-before.y)/length};
  }
  function formationAt(spec,value,direction=1){
    return FORMATION.map((slot,index)=>{
      const along=sample(spec,value+slot.longitudinal*direction),heading=tangent(spec,value+slot.longitudinal*direction,direction);
      return{index,x:along.x-heading.y*slot.lateral,y:along.y+heading.x*slot.lateral,radius:UNIT_RADIUS};
    });
  }
  function distanceToSegment(point,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,lengthSq=dx*dx+dy*dy;
    if(!lengthSq)return distance(point,a);
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/lengthSq));
    return Math.hypot(point.x-(a.x+t*dx),point.y-(a.y+t*dy));
  }
  function roadSegments(level){
    const out=[];
    for(const cellKey of level.walkable){
      const[c,r]=cellKey.split(',').map(Number),a=rules.center({c,r});
      for(const[dc,dr]of[[1,0],[0,1]])if(level.walkable.has(rules.key(c+dc,r+dr)))out.push([a,rules.center({c:c+dc,r:r+dr})]);
    }
    return out;
  }
  function clearance(level,point){
    let nearest=Infinity;
    for(const[a,b]of roadSegments(level))nearest=Math.min(nearest,distanceToSegment(point,a,b));
    for(const cellKey of level.walkable){const[c,r]=cellKey.split(',').map(Number);nearest=Math.min(nearest,distance(point,rules.center({c,r})));}
    return rules.ROAD_VISUAL_SIZE/2-nearest-point.radius;
  }
  function validateLevel(level,step=2){
    const nodeIds=new Set(level.nodes.map(item=>item.id)),errors=[],bridges=new Set(),routeCells=new Set();let samples=0,minClearance=Infinity;
    for(const node of level.nodes){
      const k=rules.key(node.cell.c,node.cell.r);
      if(!level.walkable.has(k))errors.push(`${node.id}: 據點不在道路格`);
    }
    for(const spec of level.routes){
      if(!nodeIds.has(spec.from)||!nodeIds.has(spec.to))errors.push(`${spec.id}: 端點不存在`);
      if(spec.cells.length<2)errors.push(`${spec.id}: 路徑格不足`);
      const from=level.nodes.find(node=>node.id===spec.from),to=level.nodes.find(node=>node.id===spec.to);
      const first=spec.cells[0],last=spec.cells.at(-1);
      if(!from||first.c!==from.cell.c||first.r!==from.cell.r)errors.push(`${spec.id}: 起點格不吻合`);
      if(!to||last.c!==to.cell.c||last.r!==to.cell.r)errors.push(`${spec.id}: 終點格不吻合`);
      for(let i=0;i<spec.cells.length;i++){
        const cell=spec.cells[i],k=rules.key(cell.c,cell.r);routeCells.add(k);
        if(cell.c<0||cell.c>=rules.GRID.cols||cell.r<0||cell.r>=rules.GRID.rows)errors.push(`${spec.id}: 格 ${k} 超出地圖`);
        if(!level.walkable.has(k))errors.push(`${spec.id}: 格 ${k} 未鋪道路`);
        if(level.obstacleTiles.has(k)){
          bridges.add(k);
          if(!level.bridgeTiles.has(k)||rules.tileKeyAt(level,cell.c,cell.r)!==level.theme.bridge)errors.push(`${spec.id}: 跨河格 ${k} 沒有橋`);
        }
        if(i){const previous=spec.cells[i-1],manhattan=Math.abs(previous.c-cell.c)+Math.abs(previous.r-cell.r);if(manhattan!==1)errors.push(`${spec.id}: ${rules.key(previous.c,previous.r)} 到 ${k} 不是相鄰格`);}
      }
      const total=routeLength(spec),start=18,end=Math.max(start,total-18);
      for(const direction of [1,-1])for(let d=start;d<=end;d+=step){
        for(const member of formationAt(spec,d,direction)){
          samples++;const margin=clearance(level,member);minClearance=Math.min(minClearance,margin);
          if(margin<-.001)errors.push(`${spec.id}: ${Math.round(d)}px 處士兵 ${member.index} 離開實際道路 ${(-margin).toFixed(2)}px`);
          if(member.x<0||member.x>MAP.width||member.y<0||member.y>MAP.height)errors.push(`${spec.id}: 士兵超出戰場`);
        }
      }
    }
    for(const k of level.walkable)if(!routeCells.has(k)&&!level.nodes.some(node=>rules.key(node.cell.c,node.cell.r)===k))errors.push(`道路格 ${k} 沒有任何路線使用`);
    for(const k of level.bridgeTiles)if(!routeCells.has(k))errors.push(`橋格 ${k} 沒有軍隊路線`);
    const graph=rules.adjacency(level),seen=new Set(['player']),queue=['player'];
    while(queue.length){const current=queue.shift();for(const next of graph[current]||[])if(!seen.has(next)){seen.add(next);queue.push(next);}}
    if(seen.size!==level.nodes.length)errors.push(`路網未完全連通 ${seen.size}/${level.nodes.length}`);
    return{
      levelId:level.id,name:level.name,routes:level.routes.length,roadCells:level.walkable.size,bridges:bridges.size,samples,
      violations:errors.length,minClearance:Number(minClearance.toFixed(2)),errors,
    };
  }
  function validateAll(){
    const levelsReport=levels.map(level=>validateLevel(level));
    return{levels:levelsReport,routes:levelsReport.reduce((sum,item)=>sum+item.routes,0),roadCells:levelsReport.reduce((sum,item)=>sum+item.roadCells,0),bridges:levelsReport.reduce((sum,item)=>sum+item.bridges,0),samples:levelsReport.reduce((sum,item)=>sum+item.samples,0),violations:levelsReport.reduce((sum,item)=>sum+item.violations,0),minClearance:Math.min(...levelsReport.map(item=>item.minClearance))};
  }
  return{MAP,FORMATION,UNIT_RADIUS,levels,routeLength,sample,tangent,formationAt,clearance,validateLevel,validateAll};
})();

if(typeof module!=='undefined')module.exports=LevelLayouts;
