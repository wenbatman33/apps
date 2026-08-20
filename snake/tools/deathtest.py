# 死亡 → 結算 → 再玩一次 的完整流程測試
import json
from playwright.sync_api import sync_playwright
OUT='/private/tmp/claude-502/-Users-batman-work-claude-apps-snake/733323bc-a156-48ff-a26d-c263331cc6bc/scratchpad/'
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=False)
    page = b.new_context(viewport={'width':1280,'height':800}).new_page()
    errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://localhost:5180', wait_until='networkidle')
    page.bring_to_front(); page.wait_for_timeout(800)
    page.evaluate("document.querySelector('input').value='蝙蝠俠'")
    btn = page.evaluate("(()=>{const t=window.GAME.menu.btnText;return{x:t.x,y:t.y}})()")
    page.mouse.click(btn['x'], btn['y']); page.wait_for_timeout(600)

    # 養大一點再撞死，才看得出結算數字
    page.evaluate("window.GAME.world.player.mass = 560; window.GAME.world.player.kills = 3")
    page.wait_for_timeout(2500)
    page.screenshot(path=OUT+'big.png')
    stateBefore = page.evaluate("(()=>({mass:Math.round(window.GAME.world.player.mass),zoom:+window.GAME.renderer.cam.zoom.toFixed(2)}))()")

    page.evaluate("window.GAME.world.kill(window.GAME.world.player, null)")
    page.wait_for_timeout(2200)
    page.screenshot(path=OUT+'gameover.png')
    over = page.evaluate("(()=>({visible:window.GAME.menu.root.visible, mode:window.GAME.menu.mode, hud:window.GAME.hud.root.visible, scores:JSON.parse(localStorage.getItem('slither_scores_v1')||'[]').length}))()")

    # 再玩一次
    btn2 = page.evaluate("(()=>{const t=window.GAME.menu.btnText;return{x:t.x,y:t.y}})()")
    page.mouse.click(btn2['x'], btn2['y']); page.wait_for_timeout(1200)
    again = page.evaluate("(()=>{const p=window.GAME.world.player;return{alive:!!p&&!p.dead,mass:Math.round(p.mass),hud:window.GAME.hud.root.visible,labels:window.GAME.renderer.labels.size,snakes:window.GAME.world.snakes.length}})()")
    page.screenshot(path=OUT+'restart.png')
    print(json.dumps({'before':stateBefore,'gameover':over,'restart':again,'errors':errs}, ensure_ascii=False))
    b.close()
