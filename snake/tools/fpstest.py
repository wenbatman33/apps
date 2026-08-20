# 用真實瀏覽器量測 FPS 與截圖（headed，避免背景分頁節流）
import sys, json
from playwright.sync_api import sync_playwright

MOBILE = len(sys.argv) > 1 and sys.argv[1] == 'mobile'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/snake_shot.png'

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False, args=['--use-gl=angle', '--enable-gpu'])
    ctx = b.new_context(**(pw.devices['iPhone 13'] if MOBILE else {'viewport': {'width': 1440, 'height': 860}}))
    page = ctx.new_page()
    errs = []
    page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    page.goto('http://localhost:5180', wait_until='networkidle')
    page.wait_for_timeout(1200)
    page.screenshot(path=OUT.replace('.png', '_menu.png'))

    # 開始遊戲：填暱稱後按開始鍵（按鈕位置由 Pixi 佈局換算，直接呼叫 canvas 座標點擊）
    page.evaluate("document.querySelector('input').value = '蝙蝠俠'")
    box = page.evaluate("(()=>{const r=document.querySelector('input').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()")
    page.mouse.click(box['x'] + box['w'] / 2, box['y'] + box['h'] + 22 + 30)   # 輸入框下方的開始按鈕
    page.wait_for_timeout(600)
    playing = page.evaluate("(()=>{const p=window.GAME.world.player; return !!p && !p.dead})()")

    # 玩 6 秒：滑鼠繞圈操作 + 加速，同時量 FPS
    page.evaluate("window.__f=0; window.__t=performance.now(); (function l(){window.__f++; requestAnimationFrame(l)})()")
    import math
    for i in range(60):
        a = i / 60 * math.pi * 4
        cx, cy = (200, 420) if MOBILE else (720, 430)
        page.mouse.move(cx + math.cos(a) * 160, cy + math.sin(a) * 160)
        page.wait_for_timeout(100)
    res = page.evaluate("""(()=>{const G=window.GAME,p=G.world.player;
      return {fps: (window.__f/((performance.now()-window.__t)/1000)).toFixed(1),
              pixiFps: G.app.ticker.FPS.toFixed(1),
              mass: Math.round(p?p.mass:0), dead: p?p.dead:true, worldTime: G.world.time.toFixed(1),
              snakes: G.world.snakes.filter(s=>!s.dead).length,
              sprites: G.renderer.bodyPool.length + G.renderer.foodPool.length,
              drawCalls: G.app.renderer.gl ? 'webgl' : 'gpu'}})()""")
    page.screenshot(path=OUT)
    print(json.dumps({'playing': playing, **res, 'errors': errs[:5]}, ensure_ascii=False))
    b.close()
