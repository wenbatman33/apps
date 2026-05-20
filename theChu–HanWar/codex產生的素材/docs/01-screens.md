# 01. 畫面階段規劃

## 美術風格基調

- 類型：2D 豪華寫實卡牌感 Slot 遊戲介面。
- 題材：楚漢爭霸，秦末漢初戰場、宮廷金飾、漆器紅黑、青銅與玉石質感。
- 視角：正面 UI 舞台構圖，主遊戲以固定 16:9 橫向畫面呈現。
- 色彩：深黑紅底、金色邊框、青銅綠點綴、暖色火光與高對比獎勵光效。
- 素材規則：正式素材命名一律小寫 + 底線；檔案路徑不得使用空格或中文檔名。現有中文 PNG 僅作為參考稿或待整理來源。
- 目標解析度：設計基準 1672 x 941，實作輸出建議對齊 1920 x 1080，安全區為中央 1600 x 900，重要按鈕與數字不得靠近外框 80px 內。

## Phase 定義

| Phase | 目標 | 可玩狀態 |
|---|---|---|
| Phase 1 | MVP 可跑流程 | Boot、Preload、MainMenu、Game、HUD、Result 可串接；可開始、旋轉、顯示一次結果、回主選單 |
| Phase 2 | 完整主遊戲體驗 | 補齊 Pause、符號動畫、Win 表現、音效載入策略與基本 Bonus 入口 |
| Phase 3 | 完整版 | Free Game、Bonus Wheel、Big Win 分層特效、角色事件畫面與素材 atlas 最佳化 |

## Scene 清單

### BootScene - 啟動檢查

- 開發階段：Phase 1
- 進入條件：Phaser Game 啟動後第一個 Scene
- 離開條件：載入 boot 最小素材後進入 PreloadScene
- 畫面解析度與安全區：1920 x 1080；安全區 1600 x 900
- 玩家目標：等待遊戲進入載入畫面
- 互動元素清單：無

### PreloadScene - 全域載入畫面

- 開發階段：Phase 1
- 進入條件：BootScene 完成
- 離開條件：全域共用素材載入完成後進入 MainMenuScene
- 畫面解析度與安全區：1920 x 1080；安全區 1600 x 900
- 玩家目標：理解遊戲正在載入並看到進度
- 互動元素清單：無，僅顯示 logo、進度條、載入百分比

### MainMenuScene - 主選單

- 開發階段：Phase 1
- 進入條件：PreloadScene 完成，或 ResultScene 回到主選單
- 離開條件：玩家點擊開始後進入 GameScene 並啟動 HUDScene overlay
- 畫面解析度與安全區：1920 x 1080；安全區 1600 x 900
- 玩家目標：開始一局楚漢爭霸 Slot
- 互動元素清單：開始按鈕、設定按鈕、音效切換按鈕

### GameScene - 主遊戲盤面

- 開發階段：Phase 1
- 進入條件：MainMenuScene 點擊開始，或 ResultScene 選擇再玩一次
- 離開條件：單局結束後進入 ResultScene；觸發特殊模式時進入 FreeGameIntroScene 或 BonusWheelScene
- 畫面解析度與安全區：1920 x 1080；安全區 1600 x 900；轉輪互動區固定為 6 x 5 元素，建議 1240 x 700
- 玩家目標：按下旋轉並得到一組符號結果
- 互動元素清單：旋轉按鈕、停止按鈕、下注減少、下注增加、轉輪符號可視區

### HUDScene - 遊戲資訊 Overlay

- 開發階段：Phase 1
- 進入條件：GameScene 啟動時同步 launch
- 離開條件：GameScene 結束或回到 MainMenuScene 時 stop
- 畫面解析度與安全區：1920 x 1080；安全區 1600 x 900
- 玩家目標：查看餘額、下注、贏分與操作狀態
- 互動元素清單：餘額顯示、下注顯示、贏分顯示、選單按鈕、暫停按鈕

### PauseScene - 暫停選單

- 開發階段：Phase 2
- 進入條件：HUDScene 點擊暫停按鈕
- 離開條件：繼續按鈕返回 GameScene；離開按鈕回 MainMenuScene
- 畫面解析度與安全區：1920 x 1080；安全區 1280 x 720
- 玩家目標：暫停遊戲、調整設定或退出
- 互動元素清單：繼續按鈕、音效切換、回主選單按鈕

### ResultScene - 結算畫面

- 開發階段：Phase 1
- 進入條件：GameScene 單局結束
- 離開條件：玩家點擊再玩一次回 GameScene；點擊主選單回 MainMenuScene
- 畫面解析度與安全區：1920 x 1080；安全區 1400 x 780
- 玩家目標：確認本局結果並決定下一步
- 互動元素清單：再玩一次按鈕、主選單按鈕、結果確認區

### FreeGameIntroScene - Free Game 啟動畫面

- 開發階段：Phase 3
- 進入條件：GameScene 轉出 Free Game 觸發條件
- 離開條件：播放完成或玩家點擊繼續後進入 FreeGameScene
- 畫面解析度與安全區：1920 x 1080；安全區 1600 x 900
- 玩家目標：理解已進入免費遊戲
- 互動元素清單：繼續按鈕、略過動畫按鈕

### FreeGameScene - 免費遊戲盤面

- 開發階段：Phase 3
- 進入條件：FreeGameIntroScene 完成
- 離開條件：免費次數結束後進入 ResultScene
- 畫面解析度與安全區：1920 x 1080；安全區 1600 x 900
- 玩家目標：完成免費旋轉並累積贏分
- 互動元素清單：免費次數顯示、旋轉狀態區、略過動畫按鈕

### BonusWheelScene - Bonus 輪盤

- 開發階段：Phase 3
- 進入條件：GameScene 轉出 Bonus 觸發條件
- 離開條件：倍率結果確認後回 GameScene 或 ResultScene
- 畫面解析度與安全區：1920 x 1080；安全區 1400 x 900
- 玩家目標：取得 Bonus 倍率獎勵
- 互動元素清單：啟動輪盤按鈕、確認按鈕、倍率結果區
