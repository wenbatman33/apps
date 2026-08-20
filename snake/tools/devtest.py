# DEV 微調工具測試：開關、滑桿即時生效、版面切換、拖曳 HUD、匯出 JSON
import json
from playwright.sync_api import sync_playwright
OUT='/private/tmp/claude-502/-Users-batman-work-claude-apps-snake/733323bc-a156-48ff-a26d-c263331cc6bc/scratchpad/'
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False)
    page = b.new_context(viewport={'width':1440,'height':860}, permissions=['clipboard-read','clipboard-write']).new_page()
    errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://localhost:5180', wait_until='networkidle')
    page.bring_to_front(); page.wait_for_timeout(700)
    btn = page.evaluate("(()=>{const t=window.GAME.menu.btnText;return{x:t.x,y:t.y}})()")
    page.mouse.click(btn['x'], btn['y']); page.wait_for_timeout(500)

    # D 鍵開面板
    page.keyboard.press('d'); page.wait_for_timeout(300)
    opened = page.evaluate("document.getElementById('devtools').style.display")

    # 拉「baseSpeed」滑桿 → 檢查 TUNING 是否即時改變
    before = page.evaluate("window.GAME.TUNING.baseSpeed")
    page.evaluate("""(()=>{const inp=[...document.querySelectorAll('#devtools input[type=range]')][0];
      inp.value=340; inp.dispatchEvent(new Event('input',{bubbles:true}));})()""")
    after = page.evaluate("window.GAME.TUNING.baseSpeed")

    # 切到 Mobile 版面預覽
    page.evaluate("[...document.querySelectorAll('#devtools button')].find(b=>b.textContent==='Mobile').click()")
    page.wait_for_timeout(400)
    mobileLayout = page.evaluate("(()=>({boostR:window.GAME.LAYOUT.boostBtnR, mm:window.GAME.hud.mmS}))()")
    page.screenshot(path=OUT+'dev_mobile.png')

    # 切回 PC，拖曳小地圖到別的位置
    page.evaluate("[...document.querySelectorAll('#devtools button')].find(b=>b.textContent==='PC').click()")
    page.wait_for_timeout(300)
    page.evaluate("[...document.querySelectorAll('#devtools button')].find(b=>b.textContent.includes('換邊')).click()")
    page.wait_for_timeout(300)
    mm = page.evaluate("(()=>{const h=window.GAME.hud;return{x:h.mmX+h.mmS/2,y:h.mmY+h.mmS/2}})()")
    before_xy = page.evaluate("(()=>[window.GAME.LAYOUT.minimapX, window.GAME.LAYOUT.minimapY])()")
    page.mouse.move(mm['x'], mm['y']); page.mouse.down()
    page.mouse.move(mm['x']-200, mm['y']-120, steps=8); page.mouse.up()
    page.wait_for_timeout(300)
    after_xy = page.evaluate("(()=>[window.GAME.LAYOUT.minimapX, window.GAME.LAYOUT.minimapY])()")

    # 匯出
    page.evaluate("[...document.querySelectorAll('#devtools button')].find(b=>b.textContent.includes('匯出')).click()")
    page.wait_for_timeout(300)
    exported = page.evaluate("document.querySelector('#devtools textarea').value")
    ok_json = False
    try:
        j = json.loads(exported); ok_json = all(k in j for k in ('TUNING','WORLD','LAYOUT_PC','LAYOUT_MOBILE'))
    except Exception as e: j = str(e)

    page.screenshot(path=OUT+'dev_pc.png')
    print(json.dumps({'opened':opened,'slider':[before,after],'mobilePreview':mobileLayout,
                      'dragMinimap':[before_xy,after_xy],'exportOK':ok_json,
                      'exportedBaseSpeed': (j.get('TUNING',{}).get('baseSpeed') if ok_json else None),
                      'errors':errs}, ensure_ascii=False))
    b.close()
