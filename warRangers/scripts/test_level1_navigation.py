#!/usr/bin/env python3
"""Deterministic movement audit for the generated level-1 map."""
from pathlib import Path
from PIL import Image
import json, math

ROOT = Path(__file__).resolve().parents[1]
NAV = ROOT / "assets" / "navigation"
graph = json.loads((NAV / "jingzhou_level1_routes_v1.json").read_text(encoding="utf-8"))
mask = Image.open(NAV / "jingzhou_level1_walkable_v1.png").convert("L")
W, H = mask.size
FOOT_RADIUS = 5
LATERALS = (-8, 8)
LONGITUDINALS = (-12, 0, 12)

def lerp_route(points, distance):
    remaining = distance
    for a, b in zip(points, points[1:]):
        dx, dy = b["x"]-a["x"], b["y"]-a["y"]
        length = math.hypot(dx, dy)
        if remaining <= length:
            t = 0 if length == 0 else remaining/length
            return a["x"]+dx*t, a["y"]+dy*t, dx/(length or 1), dy/(length or 1)
        remaining -= length
    a, b = points[-2], points[-1]
    dx, dy = b["x"]-a["x"], b["y"]-a["y"]
    length = math.hypot(dx, dy) or 1
    return b["x"], b["y"], dx/length, dy/length

def length(points):
    return sum(math.hypot(b["x"]-a["x"], b["y"]-a["y"]) for a,b in zip(points,points[1:]))

errors=[]; samples=0
for route in graph["routes"]:
    points=route["points"]; total=length(points)
    for direction in (1,-1):
        d=18.0
        while d <= total-18:
            for longitudinal in LONGITUDINALS:
                along=max(0,min(total,d+longitudinal*direction))
                x,y,fx,fy=lerp_route(points,along)
                if direction<0: fx,fy=-fx,-fy
                sx,sy=-fy,fx
                for lateral in LATERALS:
                    ux,uy=x+sx*lateral,y+sy*lateral
                    for ox in range(-FOOT_RADIUS,FOOT_RADIUS+1):
                        for oy in range(-FOOT_RADIUS,FOOT_RADIUS+1):
                            if ox*ox+oy*oy>FOOT_RADIUS*FOOT_RADIUS: continue
                            px,py=round(ux+ox),round(uy+oy);samples+=1
                            if px<0 or py<0 or px>=W or py>=H or mask.getpixel((px,py))<255:
                                errors.append(f'{route["id"]} d={d:.1f} unit=({lateral},{longitudinal}) foot=({px},{py})')
                                break
                        if errors and errors[-1].startswith(route["id"]): break
                    if errors and errors[-1].startswith(route["id"]): break
            d+=1

river_top, river_bottom = 526, 653
bridge_centers=(118,360,600)
for route in graph["routes"]:
    for point in route["points"]:
        if river_top <= point["y"] <= river_bottom and min(abs(point["x"]-x) for x in bridge_centers)>20:
            errors.append(f'{route["id"]}: river crossing outside bridge at {point}')

assert not errors, 'navigation audit failed:\n'+'\n'.join(errors[:20])
print(json.dumps({"routes":len(graph["routes"]),"samples":samples,"offRoad":0,"bridgeViolations":0,"result":"PASS"},ensure_ascii=False,indent=2))
