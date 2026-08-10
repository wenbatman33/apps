#!/usr/bin/env python3
"""v4 素材正規化：sheet 切格→連通白底去背→單一比例縮放→格內置中→輸出統一 256px spritesheet。
物件圖：去背＋裁切輸出。產物在 public/assets/V4/atlas/。"""
from PIL import Image
from collections import deque
import os

V4 = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'V4')
OUT = os.path.join(V4, 'atlas')
os.makedirs(OUT, exist_ok=True)
CELL = 256

def remove_bg(im, thresh=235):
    """四段式去背：白色系連通清除 → 雙重白邊侵蝕 → 全邊緣抗鋸齒柔化"""
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    def whitish(p, mn=214, df=30):
        lo = min(p[0], p[1], p[2]); hi = max(p[0], p[1], p[2])
        return lo >= mn and (hi - lo) <= df
    # 1) 白色系連通分量：碰邊或面積>=20 → 透明
    label = [[0]*w for _ in range(h)]; cid = 0
    for y0 in range(h):
        for x0 in range(w):
            if label[y0][x0] or not whitish(px[x0, y0]): continue
            cid += 1
            q = deque([(x0, y0)]); label[y0][x0] = cid
            pts = []; touch = False
            while q:
                x, y = q.popleft(); pts.append((x, y))
                if x == 0 or y == 0 or x == w-1 or y == h-1: touch = True
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0 <= nx < w and 0 <= ny < h and not label[ny][nx] and whitish(px[nx, ny]):
                        label[ny][nx] = cid; q.append((nx, ny))
            if touch or len(pts) >= 20:
                for x, y in pts:
                    r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 0)
    # 2) 白邊侵蝕 ×2：貼著透明的偏白像素直接去掉
    for _ in range(2):
        kill = []
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if p[3] == 0 or not whitish(p, 200, 44): continue
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        kill.append((x, y)); break
        for x, y in kill:
            r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 0)
    # 3) 全邊緣抗鋸齒：最外圈 alpha*0.45、次圈 *0.8（不分顏色，統一柔化）
    ring1 = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0: continue
            for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                    ring1.append((x, y)); break
    r1set = set(ring1)
    ring2 = []
    for x, y in ring1:
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 0 and (nx, ny) not in r1set:
                ring2.append((nx, ny))
    for x, y in ring1:
        r, g, b, a = px[x, y]; px[x, y] = (r, g, b, int(a * 0.45))
    for x, y in set(ring2):
        r, g, b, a = px[x, y]; px[x, y] = (r, g, b, int(a * 0.8))
    return im

# (檔名, 欄, 列, 目標角色高)
SHEETS = [
    ('A_archer_sheet_coc',  4, 2, 200),
    ('A_spear_sheet_coc_v2',   4, 2, 200),
    ('A_stone_sheet_coc_v2',   4, 2, 200),
    ('A_oil_sheet_coc_v2',     4, 2, 200),
    ('A_hector_sheet_coc',  4, 2, 228),
    ('A_hector_bow_sheet_coc', 4, 2, 228),
    ('A_zeus_sheet_coc',    4, 2, 206),
    ('A_apollo_sheet_coc',  4, 2, 206),
    ('A_poseidon_sheet_coc',4, 2, 206),
    ('A_athena_sheet_coc',  4, 2, 206),
    ('A_paris_sheet_coc',   4, 2, 206),
    ('E_giant_sheet_coc',   4, 3, 250),
    ('E_sword_sheet_coc',   4, 3, 200),
    ('E_torch_sheet_coc',   4, 3, 200),
    ('E_shield_sheet_coc',  4, 3, 200),
    ('E_ladder_sheet_coc',  4, 3, 214),
    ('E_achilles_sheet_coc',4, 3, 246),
]
OBJECTS = ['E_ram', 'E_siegetower', 'E_catapult', 'S_ship', 'S_tent',
           'S_tree', 'S_rock', 'S_house', 'S_tower', 'S_gate']

def do_sheet(name, cols, rows, target_h):
    im = Image.open(os.path.join(V4, name + '.png'))
    cw, ch = im.width // cols, im.height // rows
    cells, boxes = [], []
    for r in range(rows):
        for c in range(cols):
            cell = remove_bg(im.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch)))
            cells.append(cell)
            boxes.append(cell.getbbox())
    max_h = max((b[3]-b[1]) for b in boxes if b) or 1
    scale = target_h / max_h            # 全 sheet 單一比例
    # 共同對位點：所有幀外框中心的平均（不逐幀置中 → 保留原圖動作位移、消除逐幀瞬移）
    cxs = [ (b[0]+b[2])/2 for b in boxes if b ]
    cys = [ (b[1]+b[3])/2 for b in boxes if b ]
    ax, ay = sum(cxs)/len(cxs), sum(cys)/len(cys)
    out = Image.new('RGBA', (cols*CELL, rows*CELL), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        scaled = cell.resize((max(1,int(cell.width*scale)), max(1,int(cell.height*scale))), Image.LANCZOS)
        ox = int((i % cols)*CELL + CELL/2 - ax*scale)
        oy = int((i // cols)*CELL + CELL/2 - ay*scale)
        # 以裁切方式貼進格子（超出部分捨棄）
        gx0, gy0 = (i % cols)*CELL, (i // cols)*CELL
        tmp = Image.new('RGBA', (CELL, CELL), (0,0,0,0))
        tmp.alpha_composite(scaled, (ox-gx0, oy-gy0))
        out.alpha_composite(tmp, (gx0, gy0))
    out.save(os.path.join(OUT, name.replace('_sheet_coc_v2', '').replace('_sheet_coc', '') + '.png'))
    print('sheet', name, f'scale={scale:.2f}')

def do_object(name):
    im = remove_bg(Image.open(os.path.join(V4, name + '.png')))
    b = im.getbbox()
    im.crop(b).save(os.path.join(OUT, name + '.png'))
    print('object', name)

if __name__ == '__main__':
    for args in SHEETS: do_sheet(*args)
    for n in OBJECTS: do_object(n)
    print('ALL DONE ->', OUT)
