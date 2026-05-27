# 給 Codex 的工作指示 — Western Bar v4 素材生成

## 任務

生成 Western Bar 遊戲的 **95 張**美術素材。所有規格已備齊，你的工作是執行腳本與善後。

## 檔案位置

- 專案根目錄：`/Users/batman_work/claude/apps/westernBar/`
- 素材清單：`scripts/asset_manifest.json`（95 個項目）
- 生圖腳本：`scripts/generate.mjs`
- 輸出位置：`public/assets/<cat>/<id>.png`

## 執行步驟

```bash
# 1. 確認 API key
echo "${OPENAI_API_KEY:0:7}..."
# 若空白：export OPENAI_API_KEY=sk-...

# 2. 切到專案目錄
cd /Users/batman_work/claude/apps/westernBar

# 3. 執行生圖（--resume 可中斷續跑）
node scripts/generate.mjs --resume
```

## 預估

- **時間**：95 張 × ~15s ÷ 3 併發 ≈ **8–12 分鐘**
- **成本**：~$3–4 USD（gpt-image-1 standard 1024×1024 約 $0.04/張）

## 風格規範（已內建 manifest）

- **背景** A 區、K01 開場：手繪卡通酒吧場景，無人物無文字，1536×1024
- **角色 / 道具 / 效果** B/C/D/E/F/G/H/I/J/L/M：粗黑墨線、透明背景、單一主體，1024×1024
- **UI** K：西部告示牌風、金色、黑描邊、透明背景

## 重點 sprite 對應 v4 玩法

幾個本作特色 sprite，請特別檢查品質：

| ID | 用途 |
|---|---|
| `B05_player_hit` | 主角中槍：蓬髮、淚珠飛濺、誇張喊叫 — 標誌音記憶點 |
| `B07_player_expose_fire` | 對決時跳出桌前射擊 |
| `B08_player_pour_whiskey` | 第 3 關倒酒澆熄炸彈 |
| `E02/E09/E16 peek_hi`, `E03/E10/E17 peek_lo` | 通緝犯試探玩家的兩個動作 |
| `E06/E13/E20 hit` | 通緝犯中槍揮舞手腳 |
| `D02 man_alert`, `D05 woman_alert` | 夫婦生氣 + !! 提示 |

## 完成後請回報

1. 成功幾張 / 失敗幾張、failed id 清單
2. 抽幾張展示風格（建議：A01、B01、B05、E01、E02、F01）
3. 風格是否一致

完成後 Claude 端會接手把素材整合進 Phaser 遊戲。

## 失敗重跑

```bash
# 對失敗的 id 單獨重跑
node scripts/generate.mjs --only B05_player_hit E06_bandit_basic_hit

# 整個分類重跑
node scripts/generate.mjs E
```
