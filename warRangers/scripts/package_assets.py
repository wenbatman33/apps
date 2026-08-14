#!/usr/bin/env python3
"""Package generated PNGs by cropping and resizing only; draws no game art."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TMP = ROOT / "tmp/imagegen"
ASSETS = ROOT / "assets"


def trim(image: Image.Image, padding: int = 8) -> Image.Image:
    rgba = image.convert("RGBA")
    box = rgba.getchannel("A").getbbox()
    if not box:
        raise ValueError("empty asset")
    l = max(0, box[0] - padding)
    t = max(0, box[1] - padding)
    r = min(rgba.width, box[2] + padding)
    b = min(rgba.height, box[3] + padding)
    return rgba.crop((l, t, r, b))


def save_cell(source: str, box: tuple[int, int, int, int], target: str) -> None:
    image = Image.open(TMP / source).convert("RGBA").crop(box)
    out = ASSETS / target
    out.parent.mkdir(parents=True, exist_ok=True)
    trim(image).save(out, optimize=True)
    print(target, Image.open(out).size)


def save_sheet(source: str, target: str) -> None:
    image = Image.open(TMP / source).convert("RGBA")
    if image.size != (1536, 1024):
        raise ValueError(f"{source} must be 1536x1024")
    out = ASSETS / target
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, optimize=True)
    print(target, image.size)


def package_background() -> None:
    image = Image.open(TMP / "arena_full.png").convert("RGB")
    width = round(image.height * 720 / 1560)
    left = (image.width - width) // 2
    image = image.crop((left, 0, left + width, image.height))
    out = ASSETS / "backgrounds/three_lanes.png"
    image.save(out, optimize=True)
    print(out.relative_to(ASSETS), image.size)


def main() -> None:
    package_background()
    boxes = [(20, 145, 520, 820), (520, 145, 1020, 820), (1020, 145, 1536, 820)]
    save_cell("structures_shu_final_rgba.png", boxes[0], "structures/keep_shu.png")
    save_cell("structures_shu_final_rgba.png", boxes[1], "structures/tower_shu.png")
    save_cell("structures_shu_final_rgba.png", boxes[2], "structures/beacon.png")
    save_cell("structures_wei_final_rgba.png", boxes[0], "structures/keep_wei.png")
    save_cell("structures_wei_final_rgba.png", boxes[1], "structures/tower_wei.png")

    sheets = {
        "guard_rgba.png": "characters/guard_shu.png",
        "guard_wei_rgba.png": "characters/guard_wei.png",
        "archer_shu_rgba.png": "characters/archer_shu.png",
        "archer_wei_rgba.png": "characters/archer_wei.png",
        "cavalry_shu_rgba.png": "characters/cavalry_shu.png",
        "cavalry_wei_rgba.png": "characters/cavalry_wei.png",
        "hero_zhaoyun_rgba.png": "characters/zhaoyun.png",
    }
    for source, target in sheets.items():
        save_sheet(source, target)

    ui_boxes = {
        "status_enemy": (35, 210, 525, 365),
        "status_friendly": (570, 210, 1060, 365),
        "card_frame": (1120, 85, 1510, 540),
        "energy_trough": (40, 700, 520, 795),
        "energy_fill": (570, 700, 1020, 795),
        "lane_plate": (1060, 630, 1510, 850),
    }
    for name, box in ui_boxes.items():
        save_cell("ui_rgba.png", box, f"ui/{name}.png")


def package_v2() -> None:
    image = Image.open(TMP / "arena_v2_full.png").convert("RGB")
    target_ratio = 720 / 1300
    crop_h = round(image.width / target_ratio)
    top = max(0, (image.height - crop_h) // 2)
    image = image.crop((0, top, image.width, min(image.height, top + crop_h)))
    out = ASSETS / "backgrounds/arena_v2.png"
    image.save(out, optimize=True)
    print(out.relative_to(ASSETS), image.size)

    structure_boxes = {
        "keep_shu_v2": (35, 155, 430, 690),
        "tower_shu_v2": (430, 170, 760, 700),
        "beacon_shu_v2": (720, 390, 925, 700),
        "keep_wei_v2": (925, 155, 1325, 690),
        "tower_wei_v2": (1305, 170, 1610, 700),
        "beacon_wei_v2": (1600, 390, 1818, 700),
    }
    for name, box in structure_boxes.items():
        save_cell("structures_v2_rgba.png", box, f"structures/{name}.png")

    ui_boxes_v2 = {
        "card_tray_v2": (100, 50, 730, 360),
        "card_frame_v2": (925, 40, 1265, 370),
        "health_friendly_v2": (95, 400, 735, 535),
        "health_enemy_v2": (775, 400, 1420, 535),
        "deploy_friendly_v2": (65, 550, 1460, 780),
        "deploy_enemy_v2": (65, 790, 1465, 1008),
    }
    for name, box in ui_boxes_v2.items():
        save_cell("ui_v2_rgba.png", box, f"ui/{name}.png")


def package_v3() -> None:
    image = Image.open(TMP / "arena_v3_roads.png").convert("RGB")
    target_ratio = 720 / 1300
    crop_h = round(image.width / target_ratio)
    top = max(0, (image.height - crop_h) // 2)
    image = image.crop((0, top, image.width, min(image.height, top + crop_h)))
    out = ASSETS / "backgrounds/arena_v3.png"
    image.save(out, optimize=True)
    print(out.relative_to(ASSETS), image.size)

    ui_boxes_v3 = {
        "status_compact_v3": (65, 95, 580, 235),
        "resource_v3": (665, 105, 1175, 235),
        "card_v3": (115, 300, 535, 690),
        "result_v3": (690, 300, 1110, 680),
        "primary_v3": (110, 775, 540, 900),
        "secondary_v3": (690, 775, 1125, 900),
        "level_v3": (180, 990, 465, 1090),
        "command_v3": (55, 1110, 1195, 1235),
    }
    for name, box in ui_boxes_v3.items():
        save_cell("ui_v3_rgba.png", box, f"ui/{name}.png")


def package_v4() -> None:
    save_cell("deploy_v4_rgba.png", (25, 130, 490, 1415), "ui/deploy_friendly_v4.png")
    save_cell("deploy_v4_rgba.png", (530, 130, 1000, 1415), "ui/deploy_enemy_v4.png")


def package_v5() -> None:
    backgrounds = {
        "outpost_map_plains.png": "backgrounds/outpost_plains_v5.png",
        "outpost_map_cliffs.png": "backgrounds/outpost_cliffs_v5.png",
        "outpost_map_snow.png": "backgrounds/outpost_snow_v5.png",
    }
    for source, target in backgrounds.items():
        image = Image.open(TMP / source).convert("RGB").resize((720, 1300), Image.Resampling.LANCZOS)
        out = ASSETS / target
        out.parent.mkdir(parents=True, exist_ok=True)
        image.save(out, optimize=True)
        print(target, image.size)

    outpost_boxes = {
        "outpost_neutral_v5": (15, 150, 580, 770),
        "outpost_shu_v5": (600, 150, 1175, 770),
        "outpost_wei_v5": (1190, 150, 1760, 770),
    }
    for name, box in outpost_boxes.items():
        save_cell("outpost_structures_rgba.png", box, f"structures/{name}.png")

    fire_boxes = {
        "fire_1_v5": (0, 0, 724, 724),
        "fire_2_v5": (724, 0, 1448, 724),
        "fire_3_v5": (1448, 0, 2172, 724),
    }
    for name, box in fire_boxes.items():
        save_cell("fire_tactic_rgba.png", box, f"effects/{name}.png")


def package_v6() -> None:
    """Crop generated texture atlas cells; no visual art is drawn in code."""
    terrain = Image.open(TMP / "grid_terrain_atlas.png").convert("RGB")
    terrain_boxes = {
        "grass_v6": (0, 0, 411, 622),
        "red_ground_v6": (423, 0, 835, 622),
        "snow_ground_v6": (845, 0, 1254, 622),
        "road_plains_v6": (0, 634, 411, 1254),
        "road_cliffs_v6": (423, 634, 835, 1254),
        "road_snow_v6": (845, 634, 1254, 1254),
    }
    for name, box in terrain_boxes.items():
        image = terrain.crop(box).resize((96, 96), Image.Resampling.LANCZOS)
        out = ASSETS / f"tiles/{name}.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        image.save(out, optimize=True)
        print(out.relative_to(ASSETS), image.size)


def package_v10() -> None:
    """Crop the generated transparent modern HUD sheet; no visual art is drawn here."""
    source = Path('/Users/batman_work/.codex/generated_images/019ff4d7-923a-7283-8ba4-4149d11e5f58/exec-96d159a8-f8b6-420b-95ec-9d6f1a4b0731.png')
    image = Image.open(source).convert('RGBA')
    boxes = {
        'status_modern_v10': (30, 115, 1505, 270),
        'command_modern_v10': (30, 365, 1505, 600),
        'button_modern_v10': (30, 690, 495, 890),
    }
    for name, box in boxes.items():
        out = ASSETS / f'ui/{name}.png'
        trim(image.crop(box), padding=4).save(out, optimize=True)
        print(out.relative_to(ASSETS), Image.open(out).size)
    ground_source = Path('/Users/batman_work/.codex/generated_images/019ff4d7-923a-7283-8ba4-4149d11e5f58/exec-19b7c73e-b779-4595-a09c-8416185c5818.png')
    ground = Image.open(ground_source).convert('RGB').resize((720, 1260), Image.Resampling.LANCZOS)
    ground_out = ASSETS / 'backgrounds/plains_ground_continuous_v10.png'
    ground.save(ground_out, optimize=True)
    print(ground_out.relative_to(ASSETS), ground.size)
    commanders_source = Path('/Users/batman_work/.codex/generated_images/019ff4d7-923a-7283-8ba4-4149d11e5f58/exec-e020c622-1869-4717-a103-5fb5b01fde3e.png')
    commanders = Image.open(commanders_source).convert('RGBA')
    commander_boxes = {
        'zhouyu_v11': (0, 25, 505, 590),
        'simayi_v11': (520, 25, 1024, 590),
        'kongming_command_v11': (175, 585, 840, 1340),
        'strategist_dock_v11': (0, 1340, 1024, 1530),
    }
    for name, box in commander_boxes.items():
        out = ASSETS / f'ui/{name}.png'
        trim(commanders.crop(box), padding=4).save(out, optimize=True)
        print(out.relative_to(ASSETS), Image.open(out).size)


if __name__ == "__main__":
    if "--v2" in __import__("sys").argv:
        package_v2()
    elif "--v3" in __import__("sys").argv:
        package_v3()
    elif "--v4" in __import__("sys").argv:
        package_v4()
    elif "--v5" in __import__("sys").argv:
        package_v5()
    elif "--v6" in __import__("sys").argv:
        package_v6()
    elif "--v10" in __import__("sys").argv:
        package_v10()
    else:
        main()
