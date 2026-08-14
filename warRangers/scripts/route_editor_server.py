#!/usr/bin/env python3
"""Serve the project and persist route-editor changes to real project files."""
from __future__ import annotations

import argparse
import math
import json
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
NAVIGATION = ROOT / "assets" / "navigation"
WIDTH, HEIGHT = 720, 1280


def bind_route_endpoints(graph: dict[str, Any], tolerance: float = 60) -> dict[str, Any]:
    """Attach authored route endpoints to the nearest authored junction without moving them."""
    nodes = graph.get("nodes", {})

    def nearest(point: dict[str, Any]) -> str | None:
        ranked = sorted(
            (math.hypot(point["x"] - node["x"], point["y"] - node["y"]), node_id)
            for node_id, node in nodes.items()
        )
        return ranked[0][1] if ranked and ranked[0][0] <= tolerance else None

    for route in graph.get("routes", []):
        if not route.get("from"):
            route["from"] = nearest(route["points"][0])
        if not route.get("to"):
            route["to"] = nearest(route["points"][-1])
        if route.get("from") is None or route.get("to") is None:
            raise ValueError(f"路線 {route.get('id')} 的端點未接到路口")
    return graph


def collapse_transit_nodes(graph: dict[str, Any]) -> dict[str, Any]:
    """Merge degree-two editor junctions into one road while preserving its authored shape."""
    while True:
        candidate = None
        for node_id in graph.get("nodes", {}):
            if not node_id.startswith("junction"):
                continue
            incident = [route for route in graph["routes"] if route.get("from") == node_id or route.get("to") == node_id]
            if len(incident) == 2:
                candidate = (node_id, incident)
                break
        if candidate is None:
            return graph
        node_id, (first, second) = candidate

        def oriented(route: dict[str, Any], toward_junction: bool) -> tuple[list[dict[str, Any]], str]:
            starts_at_junction = route["from"] == node_id
            points = [dict(point) for point in route["points"]]
            if toward_junction:
                return (list(reversed(points)) if starts_at_junction else points, route["to"] if starts_at_junction else route["from"])
            return (points if starts_at_junction else list(reversed(points)), route["to"] if starts_at_junction else route["from"])

        left_points, left_node = oriented(first, True)
        right_points, right_node = oriented(second, False)
        merged_points = left_points + right_points
        if merged_points and len(merged_points) > 1 and merged_points[len(left_points) - 1] == merged_points[len(left_points)]:
            merged_points.pop(len(left_points))
        base_id = f"{left_node}-{right_node}"
        route_id = base_id
        suffix = 2
        existing = {route["id"] for route in graph["routes"] if route not in (first, second)}
        while route_id in existing:
            route_id = f"{base_id}-{suffix}"
            suffix += 1
        merged = {"id": route_id, "from": left_node, "to": right_node, "points": merged_points}
        insertion = min(graph["routes"].index(first), graph["routes"].index(second))
        graph["routes"] = [route for route in graph["routes"] if route not in (first, second)]
        graph["routes"].insert(insertion, merged)
        del graph["nodes"][node_id]


def route_files(scene_id: int) -> tuple[Path, Path, Path]:
    if scene_id == 1:
        return (
            NAVIGATION / "jingzhou_level1_routes_v1.json",
            NAVIGATION / "jingzhou_level1_walkable_v1.png",
            NAVIGATION / "jingzhou_level1_route_overlay_v1.png",
        )
    return (
        NAVIGATION / f"campaign_scene_{scene_id}_routes_v2.json",
        NAVIGATION / f"campaign_scene_{scene_id}_walkable_v2.png",
        NAVIGATION / f"campaign_scene_{scene_id}_route_overlay_v2.png",
    )


def validate_graph(scene_id: int, graph: Any) -> dict[str, Any]:
    if not isinstance(graph, dict) or not isinstance(graph.get("routes"), list):
        raise ValueError("路線資料格式錯誤")
    if not graph["routes"]:
        raise ValueError("至少需要一條路線")
    graph["scene"] = scene_id
    graph["size"] = [WIDTH, HEIGHT]
    graph.setdefault("roadWidth", 40)
    nodes = graph.get("nodes")
    if not isinstance(nodes, dict):
        raise ValueError("場景缺少岔路節點資料")
    for node_id, point in nodes.items():
        if not isinstance(node_id, str) or not isinstance(point, dict):
            raise ValueError("岔路節點格式錯誤")
        x, y = point.get("x"), point.get("y")
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            raise ValueError(f"節點 {node_id} 有無效座標")
        point["x"] = round(max(0, min(WIDTH, x)))
        point["y"] = round(max(0, min(HEIGHT, y)))
    bind_route_endpoints(graph)
    seen: set[str] = set()
    for route in graph["routes"]:
        route_id = route.get("id")
        points = route.get("points")
        if not isinstance(route_id, str) or not route_id or route_id in seen:
            raise ValueError("每條路線必須有不重複的名稱")
        seen.add(route_id)
        if not isinstance(points, list) or len(points) < 2:
            raise ValueError(f"路線 {route_id} 至少需要兩個控制點")
        for point in points:
            x, y = point.get("x"), point.get("y")
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                raise ValueError(f"路線 {route_id} 有無效座標")
            point["x"] = round(max(0, min(WIDTH, x)))
            point["y"] = round(max(0, min(HEIGHT, y)))
        for field, endpoint in (("from", 0), ("to", -1)):
            node_id = route.get(field)
            if node_id is not None:
                if node_id not in nodes:
                    raise ValueError(f"路線 {route_id} 連到不存在的節點 {node_id}")
    return graph


def rebuild_navigation_javascript() -> None:
    level1_path, _, _ = route_files(1)
    level1 = json.loads(level1_path.read_text(encoding="utf-8"))
    (ROOT / "src" / "level1Navigation.js").write_text(
        "const Level1Navigation=" + json.dumps(level1, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    scenes: dict[str, Any] = {}
    for scene_id in range(2, 6):
        graph_path, _, _ = route_files(scene_id)
        scenes[str(scene_id)] = json.loads(graph_path.read_text(encoding="utf-8"))
    manifest = {"version": 2, "scenes": scenes}
    (ROOT / "src" / "campaignNavigation.js").write_text(
        "const CampaignNavigation=" + json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


def rebuild_route_images(graph: dict[str, Any], mask_path: Path, overlay_path: Path) -> None:
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    mask_draw = ImageDraw.Draw(mask)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay, "RGBA")
    endpoints: set[tuple[int, int]] = set()
    for route in graph["routes"]:
        points = [(point["x"], point["y"]) for point in route["points"]]
        # Six-unit formations need extra shoulder room at sharp control-point turns.
        mask_draw.line(points, fill=255, width=72, joint="curve")
        overlay_draw.line(points, fill=(0, 145, 255, 255), width=7, joint="curve")
        overlay_draw.line(points, fill=(232, 251, 255, 255), width=3, joint="curve")
        endpoints.update((points[0], points[-1]))
    for x, y in endpoints:
        mask_draw.ellipse((x - 48, y - 48, x + 48, y + 48), fill=255)
        overlay_draw.ellipse(
            (x - 7, y - 7, x + 7, y + 7),
            fill=(255, 178, 30, 255),
            outline=(255, 255, 255, 255),
            width=2,
        )
    mask.save(mask_path, optimize=True)
    overlay.save(overlay_path, optimize=True)


def persist(scene_id: int, graph: Any) -> int:
    clean_graph = validate_graph(scene_id, graph)
    collapse_transit_nodes(clean_graph)
    validate_graph(scene_id, clean_graph)
    graph_path, mask_path, overlay_path = route_files(scene_id)
    graph_path.write_text(json.dumps(clean_graph, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rebuild_route_images(clean_graph, mask_path, overlay_path)
    rebuild_navigation_javascript()
    return time.time_ns()


class RouteEditorHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/routes/save":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            scene_id = int(payload["sceneId"])
            if scene_id not in range(1, 6):
                raise ValueError("場景編號必須是 1 到 5")
            revision = persist(scene_id, payload["graph"])
            body = json.dumps({"ok": True, "sceneId": scene_id, "revision": revision}).encode()
            self.send_response(200)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            body = json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False).encode()
            self.send_response(400)
        except Exception as error:  # keep the editor response actionable
            body = json.dumps({"ok": False, "error": f"寫入失敗：{error}"}, ensure_ascii=False).encode()
            self.send_response(500)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8123)
    args = parser.parse_args()
    rebuild_navigation_javascript()
    handler = lambda *handler_args, **handler_kwargs: RouteEditorHandler(  # noqa: E731
        *handler_args, directory=str(ROOT), **handler_kwargs
    )
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Route editor ready: http://{args.host}:{args.port}/editor.html", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
