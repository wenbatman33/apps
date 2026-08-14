#!/usr/bin/env python3
"""Build the hidden level-1 walkable mask and route graph from the accepted map geometry."""
from pathlib import Path
from PIL import Image, ImageDraw
from collections import deque
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "navigation"
OUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 720, 1280

# Centers follow the visible paving. Curves use enough points to stay centered on the generated road.
NODES = {
    "enemy": (360, 105),
    "northwest": (118, 280),
    "northeast": (600, 280),
    "center": (360, 420),
    "southcenter": (360, 810),
    "southwest": (118, 925),
    "southeast": (600, 925),
    "player": (360, 1120),
}
ROUTES = {
    "enemy-center": [NODES["enemy"], (360, 175), (360, 260), (360, 345), NODES["center"]],
    "enemy-northwest": [NODES["enemy"], (320, 145), (270, 180), (220, 210), (170, 240), NODES["northwest"]],
    "enemy-northeast": [NODES["enemy"], (400, 145), (450, 180), (500, 210), (550, 240), NODES["northeast"]],
    "northwest-center": [NODES["northwest"], (145, 325), (190, 360), (250, 395), (310, 418), NODES["center"]],
    "northeast-center": [NODES["northeast"], (575, 325), (530, 360), (470, 395), (410, 418), NODES["center"]],
    "northwest-southwest": [NODES["northwest"], (118, 390), (118, 520), (118, 635), (118, 760), (118, 870), NODES["southwest"]],
    "center-southcenter": [NODES["center"], (360, 520), (360, 635), (360, 720), NODES["southcenter"]],
    "northeast-southeast": [NODES["northeast"], (600, 390), (600, 520), (600, 635), (600, 760), (600, 870), NODES["southeast"]],
    "southwest-southcenter": [NODES["southwest"], (170, 880), (225, 845), (290, 815), NODES["southcenter"]],
    "southeast-southcenter": [NODES["southeast"], (550, 880), (495, 845), (430, 815), NODES["southcenter"]],
    "southcenter-player": [NODES["southcenter"], (360, 900), (360, 1000), NODES["player"]],
    "southwest-player": [NODES["southwest"], (170, 965), (225, 1000), (290, 1040), NODES["player"]],
    "southeast-player": [NODES["southeast"], (550, 965), (495, 1000), (430, 1040), NODES["player"]],
}

ROAD_WIDTH = 40
PLAZA_RADII = {
    "enemy": 70, "player": 70,
    "northwest": 42, "northeast": 42, "center": 48,
    "southcenter": 40, "southwest": 42, "southeast": 42,
}
def build_visual_walkable_mask(source):
    """Segment the actual beige paving; route definitions do not influence this proof mask."""
    pixels = source.convert("RGB")
    raw = bytearray(WIDTH * HEIGHT)
    for y in range(HEIGHT):
        for x in range(WIDTH):
            red, green, blue = pixels.getpixel((x, y))
            if red >= 118 and red-green >= 4 and green-blue >= 8 and red+green+blue >= 315 and blue <= 175:
                raw[y*WIDTH+x] = 1

    # Close tiny paving seams while preserving road edges.
    for _ in range(2):
        expanded = bytearray(raw)
        for y in range(1, HEIGHT-1):
            for x in range(1, WIDTH-1):
                i = y*WIDTH+x
                if not raw[i] and (raw[i-1] or raw[i+1] or raw[i-WIDTH] or raw[i+WIDTH]):
                    expanded[i] = 1
        raw = expanded
    for _ in range(2):
        contracted = bytearray(raw)
        for y in range(1, HEIGHT-1):
            for x in range(1, WIDTH-1):
                i = y*WIDTH+x
                if raw[i] and not (raw[i-1] and raw[i+1] and raw[i-WIDTH] and raw[i+WIDTH]):
                    contracted[i] = 0
        raw = contracted

    # Retain only paving connected to the four known central plazas.
    connected = bytearray(WIDTH * HEIGHT)
    queue = deque()
    for x, y in (NODES["enemy"], NODES["center"], NODES["southcenter"], NODES["player"]):
        i = y*WIDTH+x
        if raw[i] and not connected[i]:
            connected[i] = 1
            queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < WIDTH and 0 <= ny < HEIGHT:
                i = ny*WIDTH+nx
                if raw[i] and not connected[i]:
                    connected[i] = 1
                    queue.append((nx, ny))
    return Image.frombytes("L", (WIDTH, HEIGHT), bytes(255 if value else 0 for value in connected))

source = Image.open(ROOT / "assets" / "backgrounds" / "campaign" / "jingzhou_level1_master_v1.png")
mask = build_visual_walkable_mask(source)

# Dark stair treads, bridge planks and mossy stone seams are visibly walkable but do not
# share the beige-road palette. Add only the narrow, visually reviewed center lanes so
# formations remain well inside the painted paving.
safe_lanes = ImageDraw.Draw(mask)
for points in ROUTES.values():
    safe_lanes.line(points, fill=255, width=32, joint="curve")
for node_id, (x, y) in NODES.items():
    radius = PLAZA_RADII[node_id] - 8
    safe_lanes.ellipse((x-radius, y-radius, x+radius, y+radius), fill=255)
mask.save(OUT / "jingzhou_level1_walkable_v1.png", optimize=True)

graph = {
    "version": 1,
    "image": "backgrounds/campaign/jingzhou_level1_master_v1.png",
    "mask": "navigation/jingzhou_level1_walkable_v1.png",
    "size": [WIDTH, HEIGHT],
    "roadWidth": ROAD_WIDTH,
    "nodes": {key: {"x": value[0], "y": value[1]} for key, value in NODES.items()},
    "routes": [{"id": key, "points": [{"x": x, "y": y} for x, y in value]} for key, value in ROUTES.items()],
}
(OUT / "jingzhou_level1_routes_v1.json").write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8")
(ROOT / "src" / "level1Navigation.js").write_text(
    "const Level1Navigation=" + json.dumps(graph, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)

# Development-only visual proof; it is not loaded by the game.
base = source.convert("RGBA")
proof = Image.new("RGBA", base.size, (0, 0, 0, 0))
proof.putalpha(mask.point(lambda value: 92 if value else 0))
blue = Image.new("RGBA", base.size, (0, 145, 255, 0))
blue.putalpha(proof.getchannel("A"))
Image.alpha_composite(base, blue).save(OUT / "jingzhou_level1_mask_proof_v1.png", optimize=True)

# Review overlay: the exact centerlines used by moving formations. This remains a
# raster asset so validation never depends on Phaser/Canvas/SVG drawing APIs.
route_overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
route_draw = ImageDraw.Draw(route_overlay, "RGBA")
for points in ROUTES.values():
    route_draw.line(points, fill=(0, 174, 255, 245), width=5, joint="curve")
    route_draw.line(points, fill=(232, 251, 255, 255), width=2, joint="curve")
for x, y in NODES.values():
    route_draw.ellipse((x-8, y-8, x+8, y+8), fill=(255, 190, 40, 255), outline=(255, 255, 255, 255), width=2)
route_overlay.save(OUT / "jingzhou_level1_route_overlay_v1.png", optimize=True)
