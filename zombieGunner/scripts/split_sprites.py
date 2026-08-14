#!/usr/bin/env python3
"""
從 AI 產出的分格圖自動切出角色（不依賴精準格線，只需 Pillow）。

流程：
  1. 縮圖後做色鍵遮罩 + 連通區域，找出每隻角色的位置（AI 常把角色畫得偏離格中心）
  2. 回原圖裁切，逐像素做色鍵去背（軟邊 alpha + 去除洋紅溢色）
  3. 等比縮放後置中到固定格子，輸出 frame_000.png ...

用法：
  python3 scripts/split_sprites.py assets/anim/player_walk/raw.png \
      --expect 6 --cell 256 --out assets/anim/player_walk/frames
"""
import argparse, json, os, sys
from collections import deque
from PIL import Image


def find_components(im, key, tol, scale, min_ratio):
    """在縮圖上找連通元件，回傳原圖座標的 bbox 清單"""
    w, h = im.size
    sw, sh = max(1, w // scale), max(1, h // scale)
    small = im.convert('RGB').resize((sw, sh), Image.NEAREST)
    px = list(small.getdata())
    kr, kg, kb = key
    mask = bytearray(sw * sh)
    for i, (r, g, b) in enumerate(px):
        if abs(r - kr) + abs(g - kg) + abs(b - kb) > tol:
            mask[i] = 1

    seen = bytearray(sw * sh)
    comps = []
    min_area = int(sw * sh * min_ratio)
    for start in range(sw * sh):
        if not mask[start] or seen[start]:
            continue
        q = deque([start])
        seen[start] = 1
        n = 0
        x0 = x1 = start % sw
        y0 = y1 = start // sw
        while q:
            p = q.popleft()
            n += 1
            x, y = p % sw, p // sw
            if x < x0: x0 = x
            if x > x1: x1 = x
            if y < y0: y0 = y
            if y > y1: y1 = y
            if x > 0 and mask[p - 1] and not seen[p - 1]: seen[p - 1] = 1; q.append(p - 1)
            if x < sw - 1 and mask[p + 1] and not seen[p + 1]: seen[p + 1] = 1; q.append(p + 1)
            if y > 0 and mask[p - sw] and not seen[p - sw]: seen[p - sw] = 1; q.append(p - sw)
            if y < sh - 1 and mask[p + sw] and not seen[p + sw]: seen[p + sw] = 1; q.append(p + sw)
        if n >= min_area:
            comps.append({'bbox': [x0, y0, x1 + 1, y1 + 1], 'size': n})
    return comps, (sw, sh)


def merge_close(comps, gap):
    """角色的槍管、腳可能與身體斷開，距離很近的元件視為同一隻"""
    changed = True
    while changed:
        changed = False
        for i in range(len(comps)):
            for j in range(i + 1, len(comps)):
                a, b = comps[i]['bbox'], comps[j]['bbox']
                if (a[0] - gap < b[2] and b[0] - gap < a[2] and
                        a[1] - gap < b[3] and b[1] - gap < a[3]):
                    comps[i]['bbox'] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    comps[i]['size'] += comps[j]['size']
                    comps.pop(j)
                    changed = True
                    break
            if changed:
                break
    return comps


def chroma_cut(sub, key, tol_lo, tol_hi):
    """色鍵去背：軟邊 alpha + 去除背景色溢色，並回傳實際內容 bbox"""
    sub = sub.convert('RGBA')
    w, h = sub.size
    src = list(sub.getdata())
    kr, kg, kb = key
    out = []
    minx, miny, maxx, maxy = w, h, -1, -1
    for i, (r, g, b, a) in enumerate(src):
        d = abs(r - kr) + abs(g - kg) + abs(b - kb)
        if d <= tol_lo:
            out.append((0, 0, 0, 0))
            continue
        na = 255 if d >= tol_hi else int(255 * (d - tol_lo) / float(tol_hi - tol_lo))
        # 去洋紅溢色：紅藍同時高於綠時，把紅藍拉回綠的水準
        if kr > 200 and kb > 200 and kg < 60:
            m = (r + b) // 2
            if m > g + 24:
                k = min(r, b, g + (m - g) // 2)
                r, b = k, k
        out.append((r, g, b, na))
        if na > 24:
            x, y = i % w, i // w
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
    res = Image.new('RGBA', (w, h))
    res.putdata(out)
    if maxx < 0:
        return res, None
    return res, (minx, miny, maxx + 1, maxy + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('--out', required=True)
    ap.add_argument('--expect', type=int, default=6)
    ap.add_argument('--cell', type=int, default=256)
    ap.add_argument('--key', default='255,0,255')
    ap.add_argument('--tol', type=int, default=110, help='連通區域偵測容差')
    ap.add_argument('--cut-lo', type=int, default=60, help='完全透明門檻')
    ap.add_argument('--cut-hi', type=int, default=150, help='完全不透明門檻')
    ap.add_argument('--fill', type=float, default=0.9, help='角色佔格子比例')
    ap.add_argument('--gap', type=int, default=8, help='元件合併距離（縮圖座標）')
    ap.add_argument('--scale', type=int, default=4, help='偵測用縮圖倍率')
    ap.add_argument('--rotate', type=float, default=0,
                    help='逆時針旋轉角度；AI 有時把角色畫成朝下/朝上，遊戲一律需要朝右')
    args = ap.parse_args()

    key = tuple(int(v) for v in args.key.split(','))
    im = Image.open(args.input).convert('RGBA')
    W, H = im.size

    comps, (sw, sh) = find_components(im, key, args.tol, args.scale, 0.0012)
    comps = merge_close(comps, args.gap)
    comps.sort(key=lambda c: -c['size'])
    if len(comps) > args.expect:
        comps = comps[:args.expect]

    if not comps:
        print(json.dumps({'ok': False, 'error': 'no sprite found'}))
        sys.exit(1)

    # row-major 排序
    rowh = H / float(args.scale) / max(1, round(H / float(W) * args.expect ** 0.5 * 2))
    comps.sort(key=lambda c: ((c['bbox'][1] + c['bbox'][3]) / 2))
    rows, cur = [], [comps[0]]
    for c in comps[1:]:
        cy = (c['bbox'][1] + c['bbox'][3]) / 2
        py = (cur[-1]['bbox'][1] + cur[-1]['bbox'][3]) / 2
        if abs(cy - py) > sh * 0.22:
            rows.append(cur); cur = [c]
        else:
            cur.append(c)
    rows.append(cur)
    ordered = []
    for r in rows:
        r.sort(key=lambda c: c['bbox'][0])
        ordered += r

    os.makedirs(args.out, exist_ok=True)
    cell, report = args.cell, []

    # 先全部去背裁切，取得每格尺寸與面積重心
    cuts = []
    for c in ordered:
        x0, y0, x1, y1 = [v * args.scale for v in c['bbox']]
        pad = args.scale * 2
        box = (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad))
        sub, bb = chroma_cut(im.crop(box), key, args.cut_lo, args.cut_hi)
        if bb:
            sub = sub.crop(bb)
        if args.rotate:
            sub = sub.rotate(args.rotate, resample=Image.BICUBIC, expand=True)
            bb2 = sub.getbbox()
            if bb2:
                sub = sub.crop(bb2)
        cuts.append({'img': sub, 'box': list(box)})

    # 統一縮放比例（用中位數），避免各格角色忽大忽小
    edges = sorted(max(c['img'].size) for c in cuts)
    med = edges[len(edges) // 2]
    uni = (cell * args.fill) / med

    for i, c in enumerate(cuts):
        sub = c['img']
        w, h = sub.size
        nw, nh = max(1, round(w * uni)), max(1, round(h * uni))
        # 單格過大時才個別收斂，避免超出格子
        if max(nw, nh) > cell:
            k = cell / float(max(nw, nh))
            nw, nh = max(1, round(nw * k)), max(1, round(nh * k))
        sub = sub.resize((nw, nh), Image.LANCZOS)

        # 對齊樞紐：用 alpha 加權「中位數」而非平均。
        # 平均會被細長的槍管往右拉，中位數落在身體本體，旋轉起來才自然。
        a = sub.getchannel('A')
        px = a.load()
        colw = [0] * nw
        roww = [0] * nh
        tot = 0
        for y in range(nh):
            for x in range(nw):
                v = px[x, y]
                if v > 24:
                    colw[x] += v; roww[y] += v; tot += v

        def wmedian(ws, n, total):
            if not total:
                return n / 2.0
            half, acc = total / 2.0, 0
            for i in range(n):
                acc += ws[i]
                if acc >= half:
                    return i + 0.5
            return n / 2.0

        cx = wmedian(colw, nw, tot)
        cy = wmedian(roww, nh, tot)

        canvas = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
        ox = int(round(cell / 2.0 - cx))
        oy = int(round(cell / 2.0 - cy))
        ox = max(min(ox, cell - nw), min(0, cell - nw))
        oy = max(min(oy, cell - nh), min(0, cell - nh))
        canvas.paste(sub, (ox, oy), sub)
        canvas.save(os.path.join(args.out, 'frame_%03d.png' % i))
        report.append({'frame': i, 'src_bbox': c['box'], 'scaled': [nw, nh], 'centroid': [round(cx, 1), round(cy, 1)]})

    with open(os.path.join(args.out, 'report.json'), 'w') as f:
        json.dump({'frames': report, 'cell': cell}, f, indent=1)
    print(json.dumps({'ok': True, 'frames': len(ordered), 'expected': args.expect, 'out': args.out}))


if __name__ == '__main__':
    main()
