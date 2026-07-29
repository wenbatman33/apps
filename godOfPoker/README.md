# 賭神撲克 God of Poker

手機直屏（720×1280）德州撲克，Phaser 3 製作。你以 $100,000 對戰四大港片賭壇高手，把所有人打到破產即獲勝。

## 對手陣容（電腦強度：賭神 > 賭俠 ≈ 龍五 > 賭聖）

| 角色 | AI 風格 | 特色 |
|------|---------|------|
| 賭神 | `god` | 高精度蒙地卡羅 + 詐唬 + 慢打陷阱（人少時才玩心理戰） |
| 賭俠 | `knight` | 賠率導向、穩健老練 |
| 龍五 | `rock` | 極緊：垃圾牌不碰、強牌毫不手軟 |
| 賭聖 | `saint` | 鬆散愛跟注、隨性加注、很少棄牌 |

玩家為無名的「你」，五人同桌、每人起始 $100,000、盲注 500/1000。

## 遊戲流程

```
Menu（角色介紹）
  └─ Game
       ├─ startHand：輪轉莊家 → 下盲注 → 發兩張手牌
       ├─ preflop → flop → turn → river 四輪下注
       │    ├─ 玩家：棄牌 / 過牌 / 跟注 / 加注（滑桿 + 最小/半池/滿池/全下）
       │    ├─ AI：蒙地卡羅勝率估算 + 風格化決策
       │    └─ 全員 all-in 時自動快進發完公共牌
       ├─ showdown：攤牌、7 取 5 最佳牌型、邊池分配、平分處理
       ├─ 淘汰檢查（籌碼歸零 → 出局）
       └─ 終局：你破產 = 失敗；只剩你一人 = 統一賭壇
```

## 開發

```bash
python3 serve.py   # http://localhost:8123
```

- **DEV 微調面板**：遊戲中按 `D` 鍵或右下角 ⚙ 開啟。滑桿即時調整 `LAYOUT` 所有數值、拖曳模式直接拖動元件、「💾 匯出 LAYOUT」複製 JSON（貼回 `src/config/layout.js`）。
- **無頭引擎模擬**：`src/core/{cards,game,ai}.js` 不依賴 Phaser，可在 Node 串接後跑批量對局驗證（籌碼守恆、邊池、AI 強度）。

## 結構

```
index.html            入口（Phaser 3.80.1 CDN）
src/config/layout.js  版面 + 規則常數（全部可被 DEV 面板調整）
src/core/cards.js     牌組 / 7取5評牌 / 蒙地卡羅勝率
src/core/game.js      德州撲克引擎（狀態機、盲注、邊池、事件流）
src/core/ai.js        四種 AI 風格
src/core/sound.js     WebAudio 合成音效（無音檔）
src/scenes/           MenuScene / GameScene（事件佇列驅動動畫）
src/dev/DevPanel.js   DEV 微調工具
scripts/              AI 生圖（codex exec image_gen）manifest + 腳本
assets/chars/         人物頭像（AI 生成，*2 為現行港片海報風版本）
```

## 素材

人物圖以 `codex exec` 內建 image_gen 生成（見 `scripts/gen_via_codex.mjs`），風格：90 年代香港電影海報手繪風、原創角色設計致敬港產賭片經典造型。
