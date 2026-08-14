class LayoutPreviewScene extends Phaser.Scene{
  constructor(){super('LayoutPreview');}
  preload(){
    ART.preload(this);
    const params=new URLSearchParams(location.search),sceneId=Phaser.Math.Clamp(Number(params.get('scene'))||1,1,5),revision=params.get('rev')||Date.now();
    if(params.has('edit')){
      const stem=sceneId===1?'jingzhou_level1':`campaign_scene_${sceneId}`;
      const version=sceneId===1?'v1':'v2';
      this.load.image('edited_walkable',`assets/navigation/${stem}_walkable_${version}.png?rev=${revision}`);
      this.load.image('edited_route_overlay',`assets/navigation/${stem}_route_overlay_${version}.png?rev=${revision}`);
    }
  }
  create(){
    ART.animations(this);
    const params=new URLSearchParams(location.search);
    this.sceneId=Phaser.Math.Clamp(Number(params.get('scene'))||1,1,5);
    this.nav=this.sceneId===1?Level1Navigation:CampaignNavigation.scenes[String(this.sceneId)];
    this.routes=this.nav.routes.map((route,index)=>({...route,index,halfWidth:this.nav.roadWidth/2,length:this.routeLength(route)}));
    this.graph=this.buildGraph();
    this.mapKey=this.sceneId===1?'jingzhou_level1_master_v1':`campaign_scene_${this.sceneId}_master_v1`;
    this.maskKey=params.has('edit')?'edited_walkable':(this.sceneId===1?'jingzhou_level1_walkable_v1':`campaign_scene_${this.sceneId}_walkable_v2`);
    this.overlayKey=params.has('edit')?'edited_route_overlay':(this.sceneId===1?'jingzhou_level1_route_overlay_v1':`campaign_scene_${this.sceneId}_route_overlay_v2`);
    this.elapsed=0;this.offRoad=0;this.convoys=[];
    this.add.image(W/2,BATTLE_Y+640,this.mapKey).setDisplaySize(720,1280).setDepth(-200);
    if(params.has('routes')){
      this.add.image(W/2,BATTLE_Y+640,this.overlayKey).setDisplaySize(720,1280).setDepth(700);
    }
    this.createConvoys();
    document.title=`NAV_READY|SCENE${this.sceneId}|routes${this.routes.length}|offRoad0`;
  }
  routeLength(route){
    let total=0;for(let i=1;i<route.points.length;i++)total+=Phaser.Math.Distance.Between(route.points[i-1].x,route.points[i-1].y,route.points[i].x,route.points[i].y);return total;
  }
  sample(route,value){
    const total=this.routeLength(route),target=Phaser.Math.Clamp(value,0,total);let travelled=0;
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],length=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);
      if(travelled+length>=target){const t=length?(target-travelled)/length:0;return{x:Phaser.Math.Linear(a.x,b.x,t),y:Phaser.Math.Linear(a.y,b.y,t)};}travelled+=length;
    }
    return{...route.points.at(-1)};
  }
  tangent(route,value,direction){
    const a=this.sample(route,value-2*direction),b=this.sample(route,value+2*direction),length=Math.hypot(b.x-a.x,b.y-a.y)||1;
    return{x:(b.x-a.x)/length,y:(b.y-a.y)/length};
  }
  inferNode(point){
    let winner=null,best=Infinity;for(const [id,node] of Object.entries(this.nav.nodes)){const d=Math.hypot(point.x-node.x,point.y-node.y);if(d<best){best=d;winner=id;}}return best<=60?winner:null;
  }
  buildGraph(){
    const graph={};for(const id of Object.keys(this.nav.nodes))graph[id]=[];
    this.routes.forEach(route=>{route.from=route.from||this.inferNode(route.points[0]);route.to=route.to||this.inferNode(route.points.at(-1));if(!route.from||!route.to)return;graph[route.from].push({route,node:route.to,direction:1});graph[route.to].push({route,node:route.from,direction:-1});});return graph;
  }
  chooseNext(convoy,node){
    const options=(this.graph[node]||[]).filter(edge=>edge.route!==convoy.route);if(!options.length)return null;
    const unvisited=options.filter(edge=>!convoy.visited.has(edge.route.id)),pool=unvisited.length?unvisited:options,index=Math.floor(convoy.turnSeed++*.61803398875%1*pool.length);return pool[index];
  }
  createConvoys(){
    const slots=[[-8,-12],[8,-12],[-8,0],[8,0],[-8,12],[8,12]];
    this.routes.forEach((route,index)=>{
      const direction=index%2?1:-1,side=(index+1)%2,total=route.length,distance=24+((index*.173)%1)*Math.max(1,total-48);
      const sprites=slots.map(()=>{
        const sprite=this.add.sprite(0,0,side===0?'guard_shu':'guard_wei',2).setScale(.043).setDepth(800);
        sprite.play(side===0?'guard_shu_walk':'guard_wei_walk');return sprite;
      });
      const convoy={route,direction,side,total,distance,speed:side===0?35:33,slots,sprites,visited:new Set([route.id]),turnSeed:index+1};this.convoys.push(convoy);this.positionConvoy(convoy);
    });
  }
  footInsideMask(x,y,radius=5){
    for(let ox=-radius;ox<=radius;ox++)for(let oy=-radius;oy<=radius;oy++){
      if(ox*ox+oy*oy>radius*radius)continue;
      if(this.textures.getPixelAlpha(Math.round(x+ox),Math.round(y+oy),this.maskKey)<255)return false;
    }
    return true;
  }
  positionConvoy(convoy){
    convoy.slots.forEach(([lateral,longitudinal],index)=>{
      const d=Phaser.Math.Clamp(convoy.distance+longitudinal*convoy.direction,0,convoy.total),p=this.sample(convoy.route,d),heading=this.tangent(convoy.route,d,convoy.direction);
      const x=p.x-heading.y*lateral,y=p.y+heading.x*lateral;
      if(!this.footInsideMask(x,y))this.offRoad++;
      convoy.sprites[index].setPosition(x,BATTLE_Y+y).setFlipX(heading.x<-.08).setDepth(BATTLE_Y+y+400);
    });
  }
  update(_time,delta){
    const dt=Math.min(delta,50)/1000;this.elapsed+=dt;
    for(const convoy of this.convoys){
      convoy.distance+=convoy.speed*dt*convoy.direction;
      const reachedEnd=convoy.direction>0&&convoy.distance>=convoy.total-20,reachedStart=convoy.direction<0&&convoy.distance<=20;
      if(reachedEnd||reachedStart){
        const node=reachedEnd?convoy.route.to:convoy.route.from,next=this.chooseNext(convoy,node);
        if(next){convoy.route=next.route;convoy.total=next.route.length;convoy.direction=next.direction;convoy.distance=next.direction>0?20:convoy.total-20;convoy.visited.add(next.route.id);}else{convoy.distance=reachedEnd?convoy.total-20:20;convoy.direction*=-1;}
      }
      this.positionConvoy(convoy);
    }
    document.title=`NAV_READY|SCENE${this.sceneId}|routes${this.routes.length}|seconds${Math.floor(this.elapsed)}|offRoad${this.offRoad}`;
  }
}
