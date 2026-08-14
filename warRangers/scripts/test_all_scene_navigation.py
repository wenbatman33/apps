#!/usr/bin/env python3
"""Audit the shared formation routes against every high-quality campaign scene."""
from pathlib import Path
from PIL import Image
import json, math

ROOT = Path(__file__).resolve().parents[1]
NAV = ROOT / "assets" / "navigation"
FOOT_RADIUS = 5

def sample(points, distance):
    for a, b in zip(points, points[1:]):
        dx, dy = b["x"]-a["x"], b["y"]-a["y"]
        segment = math.hypot(dx, dy)
        if distance <= segment:
            t = distance/(segment or 1)
            return a["x"]+dx*t, a["y"]+dy*t, dx/(segment or 1), dy/(segment or 1)
        distance -= segment
    a, b = points[-2], points[-1]
    segment = math.hypot(b["x"]-a["x"], b["y"]-a["y"]) or 1
    return b["x"], b["y"], (b["x"]-a["x"])/segment, (b["y"]-a["y"])/segment

results = []
for scene_id in range(1, 6):
    graph_name = "jingzhou_level1_routes_v1.json" if scene_id == 1 else f"campaign_scene_{scene_id}_routes_v2.json"
    graph = json.loads((NAV / graph_name).read_text(encoding="utf-8"))
    name = "jingzhou_level1_walkable_v1.png" if scene_id == 1 else f"campaign_scene_{scene_id}_walkable_v2.png"
    mask = Image.open(NAV / name).convert("L")
    errors = 0
    samples = 0
    for route in graph["routes"]:
        points = route["points"]
        total = sum(math.hypot(b["x"]-a["x"], b["y"]-a["y"]) for a,b in zip(points,points[1:]))
        distance = 18.0
        while distance <= total-18:
            for longitudinal in (-12, 0, 12):
                x,y,fx,fy = sample(points, min(total,max(0,distance+longitudinal)))
                for lateral in (-8,8):
                    ux,uy = x-fy*lateral,y+fx*lateral
                    for ox in range(-FOOT_RADIUS,FOOT_RADIUS+1):
                        for oy in range(-FOOT_RADIUS,FOOT_RADIUS+1):
                            if ox*ox+oy*oy > FOOT_RADIUS*FOOT_RADIUS:
                                continue
                            samples += 1
                            px,py = round(ux+ox),round(uy+oy)
                            if not (0 <= px < 720 and 0 <= py < 1280) or mask.getpixel((px,py)) < 255:
                                errors += 1
            distance += 1
    assert errors == 0, f"scene {scene_id}: {errors} off-road foot samples"
    results.append({"scene":scene_id,"routes":len(graph["routes"]),"samples":samples,"offRoad":errors})
print(json.dumps({"result":"PASS","scenes":results},ensure_ascii=False,indent=2))
