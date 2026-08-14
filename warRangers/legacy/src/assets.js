const ART={
  root:'assets',
  images:{
    arena:'backgrounds/arena_v3.png',
    jingzhou_level1_master_v1:'backgrounds/campaign/jingzhou_level1_master_v1.png',
    jingzhou_level1_walkable_v1:'navigation/jingzhou_level1_walkable_v1.png',
    jingzhou_level1_route_overlay_v1:'navigation/jingzhou_level1_route_overlay_v1.png',
    campaign_scene_2_master_v1:'backgrounds/campaign/campaign_scene_2_master_v1.png',
    campaign_scene_3_master_v1:'backgrounds/campaign/campaign_scene_3_master_v1.png',
    campaign_scene_4_master_v1:'backgrounds/campaign/campaign_scene_4_master_v1.png',
    campaign_scene_5_master_v1:'backgrounds/campaign/campaign_scene_5_master_v1.png',
    campaign_scene_2_walkable_v2:'navigation/campaign_scene_2_walkable_v2.png',
    campaign_scene_3_walkable_v2:'navigation/campaign_scene_3_walkable_v2.png',
    campaign_scene_4_walkable_v2:'navigation/campaign_scene_4_walkable_v2.png',
    campaign_scene_5_walkable_v2:'navigation/campaign_scene_5_walkable_v2.png',
    campaign_scene_2_route_overlay_v2:'navigation/campaign_scene_2_route_overlay_v2.png',
    campaign_scene_3_route_overlay_v2:'navigation/campaign_scene_3_route_overlay_v2.png',
    campaign_scene_4_route_overlay_v2:'navigation/campaign_scene_4_route_overlay_v2.png',
    campaign_scene_5_route_overlay_v2:'navigation/campaign_scene_5_route_overlay_v2.png',
    map_plains_ground_v10:'backgrounds/plains_ground_continuous_v10.png',
    keep_shu:'structures/keep_shu_v2.png',keep_wei:'structures/keep_wei_v2.png',keep_fallen_v7:'structures/keep_fallen_v7.png',
    tower_shu:'structures/tower_shu_v2.png',tower_wei:'structures/tower_wei_v2.png',
    energy_trough:'ui/energy_trough.png',energy_fill:'ui/energy_fill.png',
    health_friendly_v2:'ui/health_friendly_v2.png',health_enemy_v2:'ui/health_enemy_v2.png',
    deploy_friendly_v2:'ui/deploy_friendly_v2.png',deploy_enemy_v2:'ui/deploy_enemy_v2.png',
    result_v3:'ui/result_v3.png',primary_v3:'ui/primary_v3.png',secondary_v3:'ui/secondary_v3.png',
    status_modern_v10:'ui/status_modern_v10.png',command_modern_v10:'ui/command_modern_v10.png',button_modern_v10:'ui/button_modern_v10.png',
    zhouyu_v11:'ui/zhouyu_v11.png',simayi_v11:'ui/simayi_v11.png',kongming_command_v11:'ui/kongming_command_v11.png',strategist_dock_v11:'ui/strategist_dock_v11.png',
    outpost_neutral_v5:'structures/outpost_neutral_v5.png',outpost_shu_v5:'structures/outpost_shu_v5.png',outpost_wei_v5:'structures/outpost_wei_v5.png',
    fire_1_v5:'effects/fire_1_v5.png',fire_2_v5:'effects/fire_2_v5.png',fire_3_v5:'effects/fire_3_v5.png',blockade_v12:'effects/blockade_v12.png',arrow_v1:'effects/arrow_v1.png',
    tile_grass_v6:'tiles/grass_v6.png',tile_red_ground_v6:'tiles/red_ground_v6.png',tile_snow_ground_v6:'tiles/snow_ground_v6.png',
    tile_road_plains_v6:'tiles/road_plains_v6.png',tile_road_cliffs_v6:'tiles/road_cliffs_v6.png',tile_road_snow_v6:'tiles/road_snow_v6.png',
    tile_water_plains_v6:'tiles/water_plains_v6.png',tile_water_cliffs_v6:'tiles/water_cliffs_v6.png',tile_ice_snow_v6:'tiles/ice_snow_v6.png',
    tile_bridge_plains_v6:'tiles/bridge_plains_v6.png',tile_bridge_cliffs_v6:'tiles/bridge_cliffs_v6.png',tile_bridge_snow_v6:'tiles/bridge_snow_v6.png',
  },
  sheets:{
    guard_shu:'characters/guard_shu.png',guard_wei:'characters/guard_wei.png',
    archer_shu:'characters/archer_shu.png',archer_wei:'characters/archer_wei.png',
    cavalry_shu:'characters/cavalry_shu.png',cavalry_wei:'characters/cavalry_wei.png',
    zhaoyun:'characters/zhaoyun.png',guanyu:'characters/guanyu_v1.png',zhangfei:'characters/zhangfei_v1.png',
    machao:'characters/machao_v1.png',huangzhong:'characters/huangzhong_v1.png',
  },
  tileSheets:{
    tile_plains_autotile_v9:{path:'tiles/plains_autotile_transparent_v9.png',frameWidth:128,frameHeight:128},
  },
  preload(scene){
    for(const [key,path] of Object.entries(this.images))scene.load.image(key,`${this.root}/${path}`);
    for(const [key,path] of Object.entries(this.sheets))scene.load.spritesheet(key,`${this.root}/${path}`,{frameWidth:384,frameHeight:512});
    for(const [key,sheet] of Object.entries(this.tileSheets))scene.load.spritesheet(key,`${this.root}/${sheet.path}`,{frameWidth:sheet.frameWidth,frameHeight:sheet.frameHeight});
  },
  animations(scene){
    for(const key of Object.keys(this.sheets)){
      const defs={idle:{frames:[0,1],rate:3,repeat:-1},walk:{frames:[2,3],rate:8,repeat:-1},attack:{frames:[4,5,6],rate:12,repeat:0}};
      for(const [state,d] of Object.entries(defs)){
        const name=`${key}_${state}`;
        if(scene.anims.exists(name))continue;
        scene.anims.create({key:name,frames:d.frames.map(frame=>({key,frame})),frameRate:d.rate,repeat:d.repeat});
      }
    }
  },
  fit(object,maxW,maxH){return object.setScale(Math.min(maxW/object.width,maxH/object.height));},
  width(object,width){return object.setScale(width/object.width);},
};
