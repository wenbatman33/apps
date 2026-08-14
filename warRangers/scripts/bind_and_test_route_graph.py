#!/usr/bin/env python3
"""Bind authored route endpoints and prove all five route graphs are traversable."""
from __future__ import annotations

import json
import math
from pathlib import Path

from route_editor_server import NAVIGATION, bind_route_endpoints, collapse_transit_nodes, rebuild_navigation_javascript


def graph_path(scene_id: int) -> Path:
    name = "jingzhou_level1_routes_v1.json" if scene_id == 1 else f"campaign_scene_{scene_id}_routes_v2.json"
    return NAVIGATION / name


results = []
for scene_id in range(1, 6):
    path = graph_path(scene_id)
    graph = json.loads(path.read_text(encoding="utf-8"))
    coordinates_before = [[dict(point) for point in route["points"]] for route in graph["routes"]]
    bind_route_endpoints(graph)
    collapse_transit_nodes(graph)
    coordinates_after = [dict(point) for route in graph["routes"] for point in route["points"]]
    authored_coordinates = [dict(point) for route in coordinates_before for point in route]
    for point in coordinates_after:
        assert point in authored_coordinates, f"scene {scene_id}: invented route coordinate {point}"

    adjacency = {node_id: [] for node_id in graph["nodes"]}
    for route in graph["routes"]:
        start, end = route["from"], route["to"]
        assert start in adjacency and end in adjacency, f"scene {scene_id}: unbound {route['id']}"
        adjacency[start].append((end, route["id"]))
        adjacency[end].append((start, route["id"]))

    start = "player"
    visited_nodes = {start}
    frontier = [start]
    while frontier:
        node = frontier.pop()
        for neighbor, _route_id in adjacency[node]:
            if neighbor not in visited_nodes:
                visited_nodes.add(neighbor)
                frontier.append(neighbor)
    assert len(visited_nodes) == len(adjacency), f"scene {scene_id}: disconnected nodes"

    # Deterministic walker: always prefer an unvisited road at each junction.
    node = start
    previous_route = None
    visited_routes: set[str] = set()
    transitions = 0
    limit = max(100, len(graph["routes"]) * len(graph["routes"]) * 4)
    while len(visited_routes) < len(graph["routes"]) and transitions < limit:
        options = [edge for edge in adjacency[node] if edge[1] != previous_route]
        unseen = [edge for edge in options if edge[1] not in visited_routes]
        if unseen:
            neighbor, route_id = unseen[0]
        elif options:
            neighbor, route_id = options[transitions % len(options)]
        else:
            neighbor, route_id = adjacency[node][0]
        visited_routes.add(route_id)
        previous_route = route_id
        node = neighbor
        transitions += 1
    assert len(visited_routes) == len(graph["routes"]), f"scene {scene_id}: walker missed roads"

    path.write_text(json.dumps(graph, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    results.append({
        "scene": scene_id,
        "nodes": len(adjacency),
        "routes": len(graph["routes"]),
        "reachableNodes": len(visited_nodes),
        "walkedRoutes": len(visited_routes),
        "inventedCoordinates": 0,
    })

rebuild_navigation_javascript()
print(json.dumps({"result": "PASS", "scenes": results}, ensure_ascii=False, indent=2))
