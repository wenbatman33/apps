(()=>{
  const sceneEl=document.querySelector('#scene'),routeEl=document.querySelector('#route'),mapEl=document.querySelector('#map'),overlay=document.querySelector('#overlay'),statusEl=document.querySelector('#status'),jsonEl=document.querySelector('#json');
  const maps={1:'assets/backgrounds/campaign/jingzhou_level1_master_v1.png',2:'assets/backgrounds/campaign/campaign_scene_2_master_v1.png',3:'assets/backgrounds/campaign/campaign_scene_3_master_v1.png',4:'assets/backgrounds/campaign/campaign_scene_4_master_v1.png',5:'assets/backgrounds/campaign/campaign_scene_5_master_v1.png'};
  const names={1:'1｜荊州三渡',2:'2｜秋谷斜河',3:'3｜雪山雙門',4:'4｜竹澤島鏈',5:'5｜赤壁包圍網'};
  const original={1:Level1Navigation,...CampaignNavigation.scenes};let sceneId=4,routeIndex=0,selectedPoint=-1,drag=null,history=[],mode='edit',connectStart=null;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function normalizeGraph(value){
    const normalized=clone(value);normalized.nodes=normalized.nodes||{};
    for(const route of normalized.routes){
      const entries=Object.entries(normalized.nodes),first=route.points[0],last=route.points.at(-1),nearest=point=>entries.map(([id,node])=>({id,d:distance(point,node)})).sort((a,b)=>a.d-b.d)[0];
      const from=nearest(first),to=nearest(last);
      if(!route.from&&from&&from.d<=55)route.from=from.id;
      if(!route.to&&to&&to.d<=55)route.to=to.id;
    }
    return normalized;
  }
  const load=id=>normalizeGraph(original[id]);
  let graph=load(sceneId);
  const point=(event)=>{const r=overlay.getBoundingClientRect();return{x:Math.max(0,Math.min(720,(event.clientX-r.left)*720/r.width)),y:Math.max(0,Math.min(1280,(event.clientY-r.top)*1280/r.height))};};
  const pushHistory=()=>{history.push(clone(graph));if(history.length>40)history.shift();};
  function refreshSelects(){sceneEl.innerHTML=Object.entries(names).map(([id,n])=>`<option value="${id}" ${Number(id)===sceneId?'selected':''}>${n}</option>`).join('');routeEl.innerHTML=graph.routes.map((r,i)=>`<option value="${i}" ${i===routeIndex?'selected':''}>${i+1}. ${r.id}</option>`).join('');}
  function setMode(next){mode=next;connectStart=null;document.querySelector('#addNode').classList.toggle('active',mode==='addPoint');document.querySelector('#connectNodes').classList.toggle('active',mode==='connect');render();}
  function uniqueNodeId(){let n=1;while(graph.nodes[`junction${n}`])n++;return`junction${n}`;}
  function uniqueRouteId(from,to){const base=`${from}-${to}`;let id=base,n=2;while(graph.routes.some(route=>route.id===id))id=`${base}-${n++}`;return id;}
  function moveNode(id,p){graph.nodes[id]={x:Math.round(p.x),y:Math.round(p.y)};for(const route of graph.routes){if(route.from===id)route.points[0]={...graph.nodes[id]};if(route.to===id)route.points[route.points.length-1]={...graph.nodes[id]};}}
  function insertControlPoint(index,segmentIndex,clickedPoint){
    const route=graph.routes[index],a=route.points[segmentIndex],b=route.points[segmentIndex+1],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(.04,Math.min(.96,((clickedPoint.x-a.x)*dx+(clickedPoint.y-a.y)*dy)/(dx*dx+dy*dy||1))),controlPoint={x:Math.round(a.x+t*dx),y:Math.round(a.y+t*dy)};
    pushHistory();route.points.splice(segmentIndex+1,0,controlPoint);routeIndex=index;selectedPoint=segmentIndex+1;mode='edit';connectStart=null;refreshSelects();render();statusEl.textContent=`已在「${route.id}」加入控制點；仍是同一條路線，拖曳白色圓點調整即可。`;
  }
  function chooseConnectionNode(id){
    if(!connectStart){connectStart=id;statusEl.textContent=`已選起點「${id}」，請再點另一個黃色節點。`;render();return;}
    if(connectStart===id){statusEl.textContent='終點不能和起點相同，請選另一個節點。';return;}
    pushHistory();const from=connectStart,to=id,route={id:uniqueRouteId(from,to),from,to,points:[{...graph.nodes[from]},{...graph.nodes[to]}]};graph.routes.push(route);routeIndex=graph.routes.length-1;selectedPoint=-1;connectStart=null;mode='edit';refreshSelects();render();statusEl.textContent=`已建立「${from} → ${to}」；雙擊線段增加控制點，再把線貼到道路中心。`;
  }
  function render(){overlay.replaceChildren();graph.routes.forEach((route,index)=>{for(let segmentIndex=0;segmentIndex<route.points.length-1;segmentIndex++){const a=route.points[segmentIndex],b=route.points[segmentIndex+1],dx=b.x-a.x,dy=b.y-a.y,line=document.createElement('div');line.className=`route-segment${index===routeIndex?' selected':''}`;line.style.left=`${a.x/7.2}%`;line.style.top=`${a.y/12.8}%`;line.style.width=`${Math.hypot(dx,dy)/7.2}%`;line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;line.addEventListener('pointerdown',event=>{event.stopPropagation();if(mode==='addPoint')return;routeIndex=index;selectedPoint=-1;refreshSelects();render();});line.addEventListener('click',event=>{event.stopPropagation();if(mode==='addPoint')insertControlPoint(index,segmentIndex,point(event));});line.addEventListener('dblclick',event=>{event.stopPropagation();if(mode==='edit')insertPoint(index,point(event));});overlay.append(line);}});
    const route=graph.routes[routeIndex];route.points.forEach((p,index)=>{const c=document.createElement('div');c.className=`handle${index===0||index===route.points.length-1?' endpoint':''}${index===selectedPoint?' selected':''}`;c.style.left=`${p.x/7.2}%`;c.style.top=`${p.y/12.8}%`;c.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();pushHistory();selectedPoint=index;drag={id:event.pointerId,index};overlay.setPointerCapture(event.pointerId);render();});overlay.append(c);});
    Object.entries(graph.nodes).forEach(([id,node])=>{const n=document.createElement('div');n.className=`map-node${connectStart===id?' connect-selected':''}`;n.dataset.label=id;n.style.left=`${node.x/7.2}%`;n.style.top=`${node.y/12.8}%`;n.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();if(mode==='connect'){chooseConnectionNode(id);return;}pushHistory();drag={id:event.pointerId,kind:'node',nodeId:id};overlay.setPointerCapture(event.pointerId);});overlay.append(n);});
    jsonEl.value=JSON.stringify(graph,null,2);if(mode==='edit')statusEl.textContent=`場景 ${sceneId}｜路線 ${routeIndex+1}/${graph.routes.length}｜${route.id}｜控制點 ${route.points.length}｜${route.from||'?'} → ${route.to||'?'}`;
  }
  function insertPoint(index,p){pushHistory();const pts=graph.routes[index].points;let best=0,score=Infinity;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),x=a.x+t*dx,y=a.y+t*dy,d=(p.x-x)**2+(p.y-y)**2;if(d<score){score=d;best=i;}}pts.splice(best+1,0,{x:Math.round(p.x),y:Math.round(p.y)});routeIndex=index;selectedPoint=best+1;refreshSelects();render();}
  overlay.addEventListener('pointermove',event=>{if(!drag)return;const p=point(event);if(drag.kind==='node'){moveNode(drag.nodeId,p);}else{const target=graph.routes[routeIndex].points[drag.index];target.x=Math.round(p.x);target.y=Math.round(p.y);selectedPoint=drag.index;}render();});overlay.addEventListener('pointerup',()=>drag=null);overlay.addEventListener('pointercancel',()=>drag=null);
  document.addEventListener('keydown',event=>{if((event.key==='Delete'||event.key==='Backspace')&&document.activeElement!==jsonEl&&selectedPoint>0&&selectedPoint<graph.routes[routeIndex].points.length-1){pushHistory();graph.routes[routeIndex].points.splice(selectedPoint,1);selectedPoint=-1;render();}});
  sceneEl.addEventListener('change',()=>{sceneId=Number(sceneEl.value);graph=load(sceneId);routeIndex=0;selectedPoint=-1;history=[];mode='edit';connectStart=null;mapEl.src=maps[sceneId];refreshSelects();render();});routeEl.addEventListener('change',()=>{routeIndex=Number(routeEl.value);selectedPoint=-1;render();});
  document.querySelector('#prev').onclick=()=>{routeIndex=(routeIndex-1+graph.routes.length)%graph.routes.length;selectedPoint=-1;refreshSelects();render();};document.querySelector('#next').onclick=()=>{routeIndex=(routeIndex+1)%graph.routes.length;selectedPoint=-1;refreshSelects();render();};
  document.querySelector('#addNode').onclick=()=>{setMode('addPoint');statusEl.textContent='增加控制點模式：直接點既有線段；路線數不會增加。';};
  document.querySelector('#connectNodes').onclick=()=>{setMode('connect');statusEl.textContent='新增支線模式：請依序點選起點與終點兩個橙色路口。只有這個操作會增加路線。';};
  document.querySelector('#cancelMode').onclick=()=>{setMode('edit');};
  document.querySelector('#deleteRoute').onclick=()=>{if(graph.routes.length<=1)return;if(confirm(`確定刪除路線「${graph.routes[routeIndex].id}」？`)){pushHistory();graph.routes.splice(routeIndex,1);routeIndex=Math.min(routeIndex,graph.routes.length-1);selectedPoint=-1;refreshSelects();render();}};
  document.querySelector('#undo').onclick=()=>{if(history.length){graph=history.pop();selectedPoint=-1;refreshSelects();render();}};document.querySelector('#reset').onclick=()=>{if(confirm('確定放棄本關尚未儲存的修改？')){graph=clone(original[sceneId]);history=[];selectedPoint=-1;refreshSelects();render();}};
  async function saveProject(){
    statusEl.textContent='正在寫入專案並重建路線圖……';
    const response=await fetch('/api/routes/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sceneId,graph})});
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||'儲存失敗');
    original[sceneId]=clone(graph);
    history=[];
    statusEl.textContent=`已寫回專案：場景 ${sceneId}。重新整理後仍會保留。`;
    return result.revision;
  }
  document.querySelector('#save').onclick=async()=>{try{await saveProject();}catch(error){statusEl.textContent=`儲存失敗：${error.message}。請使用 http://localhost:8123/editor.html 開啟編輯器。`;}};
  document.querySelector('#download').onclick=()=>{const blob=new Blob([JSON.stringify(graph,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`campaign_scene_${sceneId}_routes_edited.json`;a.click();URL.revokeObjectURL(a.href);};
  document.querySelector('#apply').onclick=()=>{try{pushHistory();graph=normalizeGraph(JSON.parse(jsonEl.value));routeIndex=0;selectedPoint=-1;refreshSelects();render();}catch(error){statusEl.textContent=`JSON 錯誤：${error.message}`;}};
  document.querySelector('#preview').onclick=async()=>{try{const revision=await saveProject();location.href=`index.html?scene=${sceneId}&edit=1&routes=1&rev=${revision}`;}catch(error){statusEl.textContent=`無法預覽：${error.message}`;}};
  mapEl.src=maps[sceneId];refreshSelects();render();
})();
