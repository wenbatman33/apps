# 端對端回歸：PC 與手機的完整一局流程（開始→操作→離開→結算→再玩）
import json, math
from playwright.sync_api import sync_playwright
OUT='/private/tmp/claude-502/-Users-batman-work-claude-apps-snake/733323bc-a156-48ff-a26d-c263331cc6bc/scratchpad/'

def run(pw, mobile):
    b = pw.chromium.launch(headless=False)
    ctx = b.new_context(**(pw.devices['iPhone 13'] if mobile else {'viewport':{'width':1440,'height':860}}))
    page = ctx.new_page()
    errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://localhost:5180', wait_until='networkidle')
    page.bring_to_front(); page.wait_for_timeout(900)
    cdp = ctx.new_cdp_session(page)
    def touch(kind, pts):
        cdp.send('Input.dispatchTouchEvent', {'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})

    page.evaluate("document.querySelector('input').value='%s'" % ('手機玩家' if mobile else '電腦玩家'))
    btn = page.evaluate("(()=>{const t=window.GAME.menu.btnText;return{x:t.x,y:t.y}})()")
    if mobile: touch('touchStart',[(btn['x'],btn['y'])]); touch('touchEnd',[])
    else: page.mouse.click(btn['x'],btn['y'])
    page.wait_for_timeout(700)
    started = page.evaluate("(()=>{const p=window.GAME.world.player;return !!p&&!p.dead})()")

    # 操作 4 秒
    if mobile:
        touch('touchStart',[(120,480)])
        for i in range(20):
            a=i/20*math.pi*2
            touch('touchMove',[(120+math.cos(a)*55, 480+math.sin(a)*55)]); page.wait_for_timeout(100)
        touch('touchEnd',[])
    else:
        for i in range(20):
            a=i/20*math.pi*2
            page.mouse.move(720+math.cos(a)*260, 430+math.sin(a)*200); page.wait_for_timeout(100)
    mid = page.evaluate("(()=>{const p=window.GAME.world.player;return{alive:!p.dead,mass:Math.round(p.mass),segs:p.segCount}})()")
    page.evaluate("window.GAME.world.player.mass=380")
    page.wait_for_timeout(1500)
    page.screenshot(path=OUT+('e2e_mobile.png' if mobile else 'e2e_pc.png'))

    # 中途離開：手機點 ✕、PC 按 Esc
    if mobile:
        q = page.evaluate("(()=>{const h=window.GAME.hud;return{x:h.qX,y:h.qY,r:h.qR}})()")
        touch('touchStart',[(q['x'],q['y'])]); touch('touchEnd',[])
    else:
        page.keyboard.press('Escape')
    page.wait_for_timeout(2000)
    over = page.evaluate("(()=>({menu:window.GAME.menu.root.visible,mode:window.GAME.menu.mode,hud:window.GAME.hud.root.visible}))()")
    page.screenshot(path=OUT+('e2e_over_mobile.png' if mobile else 'e2e_over_pc.png'))

    btn2 = page.evaluate("(()=>{const t=window.GAME.menu.btnText;return{x:t.x,y:t.y}})()")
    if mobile: touch('touchStart',[(btn2['x'],btn2['y'])]); touch('touchEnd',[])
    else: page.mouse.click(btn2['x'],btn2['y'])
    page.wait_for_timeout(900)
    again = page.evaluate("(()=>{const p=window.GAME.world.player;return{alive:!!p&&!p.dead,fps:+window.GAME.app.ticker.FPS.toFixed(0)}})()")
    b.close()
    return {'started':started,'mid':mid,'over':over,'again':again,'errors':errs}

with sync_playwright() as pw:
    print(json.dumps({'PC':run(pw,False),'MOBILE':run(pw,True)}, ensure_ascii=False))
