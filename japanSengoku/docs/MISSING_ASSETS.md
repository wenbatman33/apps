# 戰國雙雄 — 待補素材清單

> 提供給 AI 繪圖（Midjourney / Stable Diffusion / DALL·E）或設計師。
> 主題基調：**安土桃山時代日本戰國**，金黑紅配色，浮世繪風格 + 寫實質感。

---

## A. 角色素材（高優先 ⭐⭐⭐）

### A1. 武將動作差分（目前只有 stand / fire / wave）
| 檔名 | 用途 | Prompt 範本 |
|---|---|---|
| `oda-bigwin.png` | Big Win 慶祝姿勢 | 「織田信長, arms raised in triumph, holding sword high, samurai armor, cherry blossom petals, ukiyo-e meets photorealism, transparent background」 |
| `oda-thinking.png` | 待機輕微動 | 「織田信長, looking sideways with smirk, hand on hilt, idle pose, samurai armor」 |
| `takeda-bigwin.png` | Big Win 慶祝姿勢 | 「武田信玄, holding war fan upward roaring, mountain background blur, samurai general」 |
| `takeda-thinking.png` | 待機輕微動 | 「武田信玄, contemplative pose, war fan resting on shoulder」 |

### A2. 武將上半身 hi-res 版（直版需要更高解析）
- `oda-bust.png` — 純上半身、頭頂到腰、透明背景、長寬比 3:4、解析度 ≥ 1024×1365
- `takeda-bust.png` — 同上

> 目前用 `setCrop` 從全身圖裁切，畫質有損。專屬版本更銳利。

---

## B. UI 素材（高優先 ⭐⭐⭐）

| 檔名 | 規格 | Prompt |
|---|---|---|
| `buy-feature-button.png` | 360×120 px，金色框 + 紅底，透明背景 | 「ornate japanese gold and red button frame, sengoku motif, cherry blossom corners, isolated」 |
| `auto-button.png` | 180×180 px 圓形 | 「circular japanese gold seal button, kanji motif」 |
| `paytable-bg.png` | 1080×1920 半透明，玩家查賠率時用 | 「dark scroll with gold border, japanese parchment」 |
| `bigwin-banner-bg.png` | 1080×400 全屏橫向，半透明 | 「golden ornate banner, fan motif left/right, sakura petals」 |
| `freegame-intro-bg.png` | 1080×1920 全屏 | 「epic japanese castle silhouette at sunset, fireworks, gold gradient」 |

---

## B+. 雙層 Scatter（戰神賽特對標核心）⭐⭐⭐

### `symbols/bonus.png` — 覺醒 Scatter（紫色聖甲蟲變體）
規格：`256×256`，透明背景

```
mystical japanese koban gold coin with PURPLE awakening aura,
violet sapphire jewel in center carved with kanji 覺,
purple-blue energy halo around it, lightning crackling,
sengoku awakening scatter symbol, glowing magical purple aura,
isolated transparent background, --ar 1:1
```

> 機制：3 個普通小判 scatter + 1 個 bonus = 立即觸發「覺醒之力」（15 次 free + 起始倍數 3x）；2+ bonus = 「超級覺醒」（20 次 free + 起始倍數 5x）。
> 目前用 scatter-glow-04 + 紫色 tint 暫代。

---

## C. Symbol 細節升級（中優先 ⭐⭐）

目前 16 個 symbol 已有，但可優化：

| 檔名 | 現況 | 建議 |
|---|---|---|
| `symbols/scatter.png` | 已有 | 加金光暈動畫 frame 序列（4 張） |
| `symbols/mult3.png` | 已有 | 改為**戰旗**圖案配「3x」字 |
| `symbols/mult100.png` | 已有 | 改為**金色巨大戰旗**配「100x」+ 火焰特效 |
| `symbols/oda-icon.png` | 武將大頭 | 圓形邊框內信長頭部特寫，**和其他 symbol 構圖一致** |
| `symbols/takeda-icon.png` | 武將大頭 | 同上 |

---

## D. 背景與情境（中優先 ⭐⭐）

| 檔名 | 用途 | Prompt |
|---|---|---|
| `screens/free-game-bg.png` | 免費遊戲背景 | 「sengoku battlefield at night, torches, banners, dramatic」 |
| `screens/buy-feature-bg.png` | Buy Feature 確認頁背景 | 「golden treasury, coins piles, japanese vault」 |
| `layers/clean-background-mobile-night.png` | 進入 free game 後切換 | 「same composition as mobile bg but at night, more red lanterns」 |

---

## E. 動態 / 特效（低優先 ⭐）

需要 sprite sheet 動畫：

| 檔名 | Frames | 規格 |
|---|---|---|
| `fx/explosion-sheet.png` | 8 | 256×256 each — symbol 消除時 |
| `fx/golden-burst-sheet.png` | 12 | 256×256 — Big Win 時 |
| `fx/sakura-rain-sheet.png` | 16 | 1080×200 — Free Game intro |
| `fx/torii-portal-sheet.png` | 10 | 512×512 — Free Game intro 切換時 |

---

## F. 行銷 / 商店素材（可後補）

| 檔名 | 用途 |
|---|---|
| `marketing/cover-1080x1080.png` | App store / 包網平台縮圖 |
| `marketing/banner-1920x600.png` | Web banner |
| `marketing/loop-30s.mp4` | 30 秒 demo 動畫 |
| `marketing/screenshots/01-05.png` | 5 張遊玩截圖 |

---

## 統一 Prompt Style Guide

所有 AI 繪圖請帶上：
```
style: ukiyo-e meets photorealism, japanese sengoku period (Azuchi-Momoyama),
color palette: deep crimson #8a1818, antique gold #ffd76b, ink black #05030a,
lighting: dramatic side lighting, gold glow accents,
background: transparent (for UI/character) OR full scene (for backgrounds),
no text, no watermark, --ar matches the spec --v 6
```

避免：
- 西方奇幻元素
- 現代物品
- 過度卡通化
