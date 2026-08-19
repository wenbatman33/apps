# Sky Raider

手機直式捲軸射擊遊戲，Phaser 3。**沒有建置流程**：改 `src/*.js` 存檔、重整瀏覽器就看得到。

## 開發

任何靜態伺服器都能跑，專案根目錄就是網站根目錄：

```bash
python3 -m http.server 5173
```

然後開 http://localhost:5173/ 。加 `?dev=1` 會出現 DEV 面板（跳關、換武器、調火力、無敵）。

## 結構

```
index.html      直接載入 src/main.js（原生 ES module，無 importmap 也無 bundler）
styles.css
src/            遊戲程式碼（純 JS ES module，直接編輯）
  main.js       Phaser 設定與場景註冊
  game/
    scenes/     BootScene → PreloadScene → MenuScene → GameScene → ResultScene
    systems/    武器、音效、爆炸、輸入、關卡載入、動態難度、排行榜
    entities/   玩家、敵機、子彈、道具
    data/       關卡與敵機設定
vendor/         phaser.esm.min.js 與 default export shim（各檔以相對路徑 import）
assets/         圖、音效、BGM、parallax、AI 背景
tools/          音效素材試聽頁（開發用，可刪）
```

## 部署

檔案就是成品，push 到 GitHub Pages 即生效，沒有建置步驟。

## 幾個要知道的事

- **關卡資源按需載入**：`GameScene.preload()` 只載當前關卡的 BGM、背景、parallax、boss 立繪，
  已載過的留在 cache。首次進遊戲不必下載全部 8 關（約 35MB）的素材。
- **音量**：`src/game/constants.js` 的 `MASTER_VOLUME` 統一控制音樂與音效。
- **機炮音效**：`AudioSystem.js` 的 `VULCAN_MODE` 可在單發素材與持續掃射循環之間切換。
- **parallax**：素材 512px 寬，`tileScale` 依實際紋理寬度換算，換解析度不會跑版。
- 音效素材來源與授權見 `assets/sound/sfx/CREDITS.md`。

## 型別

原本是 TypeScript，為了消除 290MB 的 node_modules 與建置流程改成純 JS。
需要型別檢查時可在檔案頂端加 `// @ts-check` 搭配 JSDoc，VSCode 原生支援，不需編譯。
