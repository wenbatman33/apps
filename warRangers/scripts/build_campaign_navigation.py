#!/usr/bin/env python3
"""Build independent, reviewable navigation data for the five generated maps."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "navigation"
OUT.mkdir(parents=True, exist_ok=True)

SCENES = {
  2: {
    "nodes": {"enemy":(540,95),"upperLeft":(120,230),"upperMid":(340,260),"upperRight":(650,345),"midLeft":(165,455),"center":(500,545),"lowerLeft":(175,745),"lowerRight":(525,1015),"player":(205,1160)},
    "edges": [("enemy","upperMid"), ("enemy","upperRight"), ("upperMid","upperLeft"), ("upperLeft","midLeft"), ("upperMid","center"), ("upperRight","center"), ("midLeft","center"), ("midLeft","lowerLeft"), ("center","lowerRight"), ("lowerLeft","player"), ("lowerRight","player")],
    "paths": {
      "enemy-upperMid":[(540,95),(490,145),(415,205),(340,260)],
      "enemy-upperRight":[(540,95),(555,155),(610,230),(650,345)],
      "upperMid-upperLeft":[(340,260),(260,235),(190,225),(120,230)],
      "upperLeft-midLeft":[(120,230),(115,310),(135,390),(165,455)],
      "upperMid-center":[(340,260),(390,340),(445,430),(500,545)],
      "upperRight-center":[(650,345),(640,420),(585,500),(500,545)],
      "midLeft-center":[(165,455),(230,500),(330,530),(420,545),(500,545)],
      "midLeft-lowerLeft":[(165,455),(155,555),(155,650),(175,745)],
      "center-lowerRight":[(500,545),(505,660),(485,780),(495,900),(525,1015)],
      "lowerLeft-player":[(175,745),(160,865),(170,980),(190,1080),(205,1160)],
      "lowerRight-player":[(525,1015),(470,1060),(390,1085),(300,1100),(235,1135),(205,1160)],
    },
    "river": "diagonal",
  },
  3: {
    "nodes": {"enemy":(360,80),"upperLeft":(130,245),"upperMid":(360,300),"upperRight":(590,245),"midLeft":(225,540),"midRight":(500,540),"lowerLeft":(220,905),"lowerRight":(500,905),"player":(360,1165)},
    "edges": [("enemy","upperLeft"),("enemy","upperMid"),("enemy","upperRight"),("upperLeft","upperMid"),("upperLeft","midLeft"),("upperMid","midLeft"),("upperMid","midRight"),("upperRight","midRight"),("midLeft","lowerLeft"),("midRight","lowerRight"),("lowerLeft","lowerRight"),("lowerLeft","player"),("lowerRight","player")],
    "paths": {
      "enemy-upperLeft":[(360,80),(295,130),(215,190),(130,245)],
      "enemy-upperMid":[(360,80),(360,180),(360,300)],
      "enemy-upperRight":[(360,80),(425,130),(510,190),(590,245)],
      "upperLeft-upperMid":[(130,245),(220,265),(300,285),(360,300)],
      "upperLeft-midLeft":[(130,245),(130,360),(165,455),(225,540)],
      "upperMid-midLeft":[(360,300),(335,395),(285,475),(225,540)],
      "upperMid-midRight":[(360,300),(395,395),(450,475),(500,540)],
      "upperRight-midRight":[(590,245),(590,360),(560,455),(500,540)],
      "midLeft-lowerLeft":[(225,540),(220,660),(220,790),(220,905)],
      "midRight-lowerRight":[(500,540),(500,660),(500,790),(500,905)],
      "lowerLeft-lowerRight":[(220,905),(330,905),(410,905),(500,905)],
      "lowerLeft-player":[(220,905),(215,1010),(260,1100),(360,1165)],
      "lowerRight-player":[(500,905),(505,1010),(460,1100),(360,1165)],
    },
    "river": "horizontal-two-bridges",
  },
  4: {
    "nodes": {"enemy":(180,90),"upperMid":(465,160),"upperRight":(600,365),"midLeft":(110,480),"centerTop":(345,335),"center":(385,520),"lowerLeft":(175,690),"lowerRight":(550,745),"cross":(360,790),"lowerMid":(260,865),"rightLow":(500,965),"player":(590,1160)},
    "edges": [("enemy","upperMid"),("enemy","midLeft"),("upperMid","centerTop"),("upperMid","upperRight"),("centerTop","center"),("upperRight","center"),("upperRight","lowerRight"),("midLeft","center"),("midLeft","lowerLeft"),("center","lowerLeft"),("center","lowerRight"),("lowerLeft","cross"),("lowerRight","cross"),("cross","lowerMid"),("cross","rightLow"),("lowerMid","player"),("rightLow","player")],
    "paths": {
      "enemy-upperMid":[(180,90),(260,130),(340,190),(405,205),(465,160)],
      "enemy-midLeft":[(180,90),(175,210),(150,340),(110,480)],
      "upperMid-centerTop":[(465,160),(410,220),(370,285),(345,335)],
      "upperMid-upperRight":[(465,160),(520,215),(565,290),(600,365)],
      "centerTop-center":[(345,335),(355,410),(370,470),(385,520)],
      "upperRight-center":[(600,365),(590,445),(530,505),(460,520),(385,520)],
      "upperRight-lowerRight":[(600,365),(590,470),(570,610),(550,745)],
      "midLeft-center":[(110,480),(190,500),(285,515),(385,520)],
      "midLeft-lowerLeft":[(110,480),(120,570),(145,640),(175,690)],
      "center-lowerLeft":[(385,520),(355,620),(315,720),(250,735),(175,690)],
      "center-lowerRight":[(385,520),(470,520),(525,565),(540,660),(550,745)],
      "lowerLeft-cross":[(175,690),(245,725),(305,760),(360,790)],
      "lowerRight-cross":[(550,745),(480,755),(420,775),(360,790)],
      "cross-lowerMid":[(360,790),(325,820),(290,850),(260,865)],
      "cross-rightLow":[(360,790),(405,850),(455,920),(500,965)],
      "lowerMid-player":[(260,865),(200,915),(145,970),(125,1030),(170,1085),(265,1125),(380,1145),(500,1155),(590,1160)],
      "rightLow-player":[(500,965),(510,1040),(535,1110),(590,1160)],
    },
    "river": "wetland-causeways",
  },
  5: {
    "nodes": {"enemy":(360,85),"upperLeft":(130,200),"upperRight":(590,200),"midLeft":(95,375),"centerHigh":(360,295),"midRight":(625,375),"centerLow":(360,760),"lowerLeft":(130,905),"lowerRight":(590,905),"player":(360,1110)},
    "edges": [("enemy","upperLeft"),("enemy","upperRight"),("enemy","centerHigh"),("upperLeft","midLeft"),("upperLeft","centerHigh"),("upperRight","midRight"),("upperRight","centerHigh"),("midLeft","centerHigh"),("midRight","centerHigh"),("centerHigh","centerLow"),("midLeft","lowerLeft"),("midRight","lowerRight"),("centerLow","lowerLeft"),("centerLow","lowerRight"),("centerLow","player"),("lowerLeft","player"),("lowerRight","player")],
    "paths": {
      "enemy-upperLeft":[(360,85),(270,120),(200,165),(130,200)],
      "enemy-upperRight":[(360,85),(450,120),(520,165),(590,200)],
      "enemy-centerHigh":[(360,85),(360,190),(360,295)],
      "upperLeft-midLeft":[(130,200),(110,280),(95,375)],
      "upperLeft-centerHigh":[(130,200),(220,235),(300,270),(360,295)],
      "upperRight-midRight":[(590,200),(610,280),(625,375)],
      "upperRight-centerHigh":[(590,200),(500,235),(420,270),(360,295)],
      "midLeft-centerHigh":[(95,375),(185,340),(280,310),(360,295)],
      "midRight-centerHigh":[(625,375),(535,340),(440,310),(360,295)],
      "centerHigh-centerLow":[(360,295),(360,430),(360,575),(360,760)],
      "midLeft-lowerLeft":[(95,375),(95,520),(105,680),(130,905)],
      "midRight-lowerRight":[(625,375),(625,520),(615,680),(590,905)],
      "centerLow-lowerLeft":[(360,760),(280,815),(200,870),(130,905)],
      "centerLow-lowerRight":[(360,760),(440,815),(520,870),(590,905)],
      "centerLow-player":[(360,760),(360,900),(360,1010),(360,1110)],
      "lowerLeft-player":[(130,905),(200,960),(280,1035),(360,1110)],
      "lowerRight-player":[(590,905),(520,960),(440,1035),(360,1110)],
    },
    "river": "horizontal-three-bridges",
  },
}

manifest = {"version":2,"scenes":{}}
for scene_id, spec in SCENES.items():
    nodes = spec["nodes"]
    routes = []
    for a, b in spec["edges"]:
        route_id=f"{a}-{b}"
        points=spec.get("paths",{}).get(route_id,[nodes[a],nodes[b]])
        routes.append({"id":route_id,"points":[{"x":x,"y":y} for x,y in points]})
    graph = {"version":2,"scene":scene_id,"size":[720,1280],"roadWidth":40,"nodes":{k:{"x":v[0],"y":v[1]} for k,v in nodes.items()},"routes":routes,"river":spec["river"]}
    (OUT/f"campaign_scene_{scene_id}_routes_v2.json").write_text(json.dumps(graph,ensure_ascii=False,indent=2),encoding="utf-8")

    mask = Image.new("L",(720,1280),0)
    draw = ImageDraw.Draw(mask)
    for route in routes:
        draw.line([(p["x"],p["y"]) for p in route["points"]],fill=255,width=60,joint="curve")
    for x,y in nodes.values(): draw.ellipse((x-48,y-48,x+48,y+48),fill=255)
    mask.save(OUT/f"campaign_scene_{scene_id}_walkable_v2.png",optimize=True)

    overlay = Image.new("RGBA",(720,1280),(0,0,0,0)); od = ImageDraw.Draw(overlay,"RGBA")
    for route in routes:
        pts=[(p["x"],p["y"]) for p in route["points"]]
        od.line(pts,fill=(0,174,255,245),width=5,joint="curve");od.line(pts,fill=(232,251,255,255),width=2,joint="curve")
    for x,y in nodes.values(): od.ellipse((x-8,y-8,x+8,y+8),fill=(255,190,40,255),outline=(255,255,255,255),width=2)
    overlay.save(OUT/f"campaign_scene_{scene_id}_route_overlay_v2.png",optimize=True)
    manifest["scenes"][str(scene_id)] = graph

(ROOT/"src"/"campaignNavigation.js").write_text("const CampaignNavigation="+json.dumps(manifest,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
