# 觸控操作測試：模擬手指拖曳搖桿與按加速鍵，確認手機操控真的有作用
import json, math
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False)
    ctx = b.new_context(**pw.devices['iPhone 13'])
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://localhost:5180', wait_until='networkidle')
    page.wait_for_timeout(1000)
    cdp = ctx.new_cdp_session(page)

    def touch(kind, pts):
        cdp.send('Input.dispatchTouchEvent', {
            'type': kind,
            'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)],
        })

    # 用觸控點開始按鈕
    page.evaluate("document.querySelector('input').value='手機測試'")
    btn = page.evaluate("(()=>{const t=window.GAME.menu.btnText;return {x:t.x,y:t.y}})()")
    touch('touchStart', [(btn['x'], btn['y'])]); touch('touchEnd', [])
    page.wait_for_timeout(500)
    started = page.evaluate("(()=>{const p=window.GAME.world.player;return !!p&&!p.dead})()")

    # 搖桿：左下按住後往右上拖
    touch('touchStart', [(120, 500)])
    angles = []
    for i in range(24):
        a = i / 24 * math.pi * 2
        touch('touchMove', [(120 + math.cos(a) * 60, 500 + math.sin(a) * 60)])
        page.wait_for_timeout(60)
        angles.append(page.evaluate("window.GAME.world.player.targetAngle.toFixed(2)"))
    joy = page.evaluate("(()=>{const j=window.GAME.input.joystick;return {active:j.active,power:+j.power.toFixed(2)}})()")
    touch('touchEnd', [])

    # 加速鍵：右下角，按住 1 秒觀察狀態與 mass 消耗
    page.bring_to_front()
    page.evaluate("window.GAME.world.player.mass = 300")
    bb = page.evaluate("(()=>{const h=window.GAME.hud;return {x:h.bbX,y:h.bbY,r:h.bbR}})()")
    touch('touchStart', [(bb['x'], bb['y'])])
    samples = []
    for _ in range(5):
        page.wait_for_timeout(200)
        samples.append(page.evaluate("(()=>({b:window.GAME.input.boosting,src:window.GAME.input.srcBtn,sb:window.GAME.world.player.boosting,m:Math.round(window.GAME.world.player.mass)}))()"))
    boosting = samples
    touch('touchEnd', [])
    page.wait_for_timeout(300)
    boostOff = page.evaluate("(()=>({b:window.GAME.input.boosting,src:window.GAME.input.srcBtn}))()")

    hud = page.evaluate("""(()=>{const h=window.GAME.hud;const s=window.GAME.app.screen;
      return {screen:[s.width,s.height], minimap:[h.mmX,h.mmY,h.mmS], boost:[h.bbX,h.bbY,h.bbR]}})()""")
    page.screenshot(path='/private/tmp/claude-502/-Users-batman-work-claude-apps-snake/733323bc-a156-48ff-a26d-c263331cc6bc/scratchpad/mb2.png')
    print(json.dumps({'started': started, 'joystick': joy, 'angleChanged': len(set(angles)) > 8,
                      'boostOn': boosting, 'boostOffAfterRelease': boostOff, 'hud': hud, 'errors': errs}, ensure_ascii=False))
    b.close()
