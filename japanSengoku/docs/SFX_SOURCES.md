# 戰國雙雄 — 音效資源建議清單

> 我無法在沙箱內直接下載音檔，但以下是業界 slot 遊戲常用的合法 / 免費資源、以及具體搜尋詞。
> 一律確認授權：**CC0 / CC-BY** 可商用，**royalty-free** 需看條款。

---

## 1. 免費 / CC0 資源（優先）

### 1.1 Freesound.org（CC0 / CC-BY 為主）
網址：https://freesound.org

| 用途 | 搜尋詞建議 |
|---|---|
| Big Win 慶祝 | `casino jackpot win`, `slot big win`, `coins shower` |
| 倍數球出現 | `magic chime`, `golden sparkle`, `mystical bell` |
| Spin 按鈕 | `slot machine spin`, `reel start`, `mechanical click` |
| Scatter 觸發 | `bonus trigger`, `slot scatter sound` |
| 連消 | `gem match`, `cluster pop`, `bubble pop satisfying` |
| 武將語音音效 | `samurai grunt`, `japanese warrior shout`, `katana draw` |
| 環境音 | `japanese taiko`, `shamisen`, `wind chime`, `temple bell` |

### 1.2 Pixabay Sound Effects（完全免費商用）
網址：https://pixabay.com/sound-effects/

熱門關鍵詞：
- `slot machine`
- `taiko drum`
- `japanese`
- `coin shower`
- `magical chime`
- `victory fanfare`

### 1.3 OpenGameArt.org
網址：https://opengameart.org/art-search?keys=slot

提供完整 slot game audio pack（多為 CC-BY）

---

## 2. 付費但廠商級資源

### 2.1 Pond5
- https://www.pond5.com/sound-effects
- 搜尋 `casino slot game pack` — 一套 $50~150 USD
- 高品質、有 stems（分軌）

### 2.2 Sound Ideas — Casino & Slot Machine SFX Library
- 業界經典，許多大廠（IGT、Aristocrat）使用
- 單套售價 $300~800 USD

### 2.3 Epidemic Sound
- 訂閱制 $15/月
- 適合需要 BGM 的場景（戰國風尺八、太鼓 BGM）

### 2.4 AudioJungle (Envato)
- 單檔 $5~30 USD
- 搜尋 `slot win fanfare`, `japanese taiko loop`

---

## 3. 你目前已有的音檔 + 建議補強

現有 12 個音檔（已英文化）：

| 檔名 | 用途 | 建議補強 |
|---|---|---|
| `ready.mp3` | 進遊戲開場 | ✅ 已可用 |
| `victory.mp3` | 一般中獎 | 加 `bigwin-tier1.mp3` / `tier2` / `tier3` 分級 |
| `crowd.mp3` | 觀眾歡呼 | ✅ 已可用 |
| `charge.mp3` | 武將衝鋒 | ✅ 已可用 |
| `click.mp3` | 按鈕點擊 | ✅ 已可用 |
| `confirm.mp3` | 確認動作 | ✅ 已可用 |
| `spin.mp3` | 旋轉 | ✅ 已可用 |
| `clear.mp3` | 消除 | 建議再做 5 個音調逐漸提高版本（連消音階升調） |
| `fan.mp3` | 軍配揮舞 | ✅ 已可用 |
| `drop.mp3` | 金幣掉落 | ✅ 已可用 |
| `rifle.mp3` | 火繩槍 | ✅ 已可用 |
| `cheer.mp3` | 男聲喝采 | ✅ 已可用 |

### 強烈建議新增（按優先級）

| 檔名 | 用途 | 搜尋詞 |
|---|---|---|
| `bigwin.mp3` | Big Win 觸發 | `casino jackpot win short` |
| `megawin.mp3` | Mega Win 觸發 | `slot mega win fanfare` |
| `epicwin.mp3` | Epic Win 觸發 | `epic win celebration orchestra` |
| `freegame-intro.mp3` | 進免費遊戲過場 | `mystical portal opening`, `epic riser` |
| `freegame-outro.mp3` | 離開免費遊戲 | `gentle fanfare ending` |
| `freegame-bgm.mp3` | 免費遊戲背景樂 | `japanese taiko battle loop` |
| `multiplier-appear.mp3` | 倍數球出現 | `magical sparkle short` |
| `scatter-land.mp3` | scatter symbol 落地 | `mystical bell single hit` |
| `retrigger.mp3` | 免費遊戲再觸發 | `wow fanfare short` |
| `near-miss.mp3` | Near miss 提示 | `tension rise short` |
| `cascade-rise-1.mp3` ~ `cascade-rise-5.mp3` | 連消音階上升 | `taiko hit C / D / E / F / G` 或自己用鋼琴錄 |
| `button-buy-feature.mp3` | 購買特色按鈕 | `cash register stylized` |

---

## 4. BGM 建議

目前只有 `Wager_in_the_Valley.mp3`，建議加：

| 檔名 | 用途 | 風格 |
|---|---|---|
| `bgm-main.mp3` | 主遊戲常駐 | 現在的 ✅ |
| `bgm-freegame.mp3` | 免費遊戲 | 鼓聲激昂、節奏更快 |
| `bgm-bigwin.mp3` | Big Win 期間覆蓋 | 5~10 秒高潮 |
| `bgm-menu.mp3` | 首頁 | 寧靜尺八 + 環境音 |

---

## 5. 處理流程建議

1. **批次下載**：用 Freesound API 自動撈 + 標籤分類
2. **音量正規化**：所有 SFX 統一 -14 LUFS（業界標準）
3. **格式**：mp3 192kbps（手機友善）；BGM 用 ogg 96kbps loop
4. **檔名規範**：`<category>-<event>-<variant>.mp3`，例：`win-big-tier2.mp3`
5. **建議目錄**：
   ```
   assets/
     BGM/
       bgm-main.mp3
       bgm-freegame.mp3
       bgm-menu.mp3
     sound/
       ui/          # 按鈕、確認
       win/         # 中獎分級
       symbol/      # symbol 互動
       feature/     # free game、retrigger
       ambient/     # 環境音
   ```

---

## 6. 法律提醒

⚠️ **不可使用**：
- 商業電影 / 動漫片段（如新海誠、宮崎駿配樂）
- 著名 slot 廠商（Pragmatic Play / NetEnt）的音效 — 已註冊
- YouTube 隨意下載的「日本太鼓 mix」— 多為盜版

✅ **安全做法**：
- 所有 SFX / BGM 保留授權憑證（CC-BY 要標註作者）
- 付費的留發票
- 自己用真實樂器錄製最安全（太鼓、尺八、和琴可在 Hire-a-musician 平台找）
