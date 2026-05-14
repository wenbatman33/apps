# 戰國雙雄 — 商業化文件總覽

| 文件 | 對象 | 用途 |
|---|---|---|
| [MATH_SHEET.md](./MATH_SHEET.md) | 數值設計師 / 認證機構 | RTP / Volatility / Paytable |
| [INTEGRATION_SPEC.md](./INTEGRATION_SPEC.md) | 營運商 / 平台對接 | API / Wallet / 結算流程 |
| [MISSING_ASSETS.md](./MISSING_ASSETS.md) | AI 繪圖 / 美術 | 待補圖檔清單 + Prompt |
| [SFX_SOURCES.md](./SFX_SOURCES.md) | 音效設計師 | 音效資源來源 + 搜尋詞 |
| [DEV_MODE.md](./DEV_MODE.md) | 內部 QA / 數值 | 開發者模式使用說明 |

---

## 商業化進度（戰神賽特對標）

| 機制 | 戰神賽特 | 戰國雙雄目前 | 待補 |
|---|---|---|---|
| 6×5 Cluster Pay | ✅ | ✅ | — |
| Cascade 連消 | ✅ | ✅ | 連消無上限（移除 4 次限制） |
| 倍數球（主遊戲） | ✅ | ✅ | — |
| Scatter 觸發 Free Game | ✅ | ✅ | — |
| Free Game Sticky Multiplier | ✅ | ✅ | — |
| Free Game Retrigger | ✅ | ✅ | — |
| Free Game intro/outro | ✅ | ✅ | — |
| **Buy Feature** | ✅ | ✅ | 加確認彈窗 + RTP 區隔 |
| **Big / Mega / Epic Win 儀式** | ✅ | ✅ | 加分級音效 |
| Progressive Jackpot | ✅ | ⚠️ 純裝飾數字 | 接後台真實累積 |
| Near Miss 視覺 | ✅ | ❌ | 待補 |
| 連消音階上升 | ✅ | ❌ | 待補音效 |
| Server-side RNG | ✅ | ❌ 客戶端 | **上線必補** |
| Math 模擬 100M+ | ✅ | ❌ | **認證必補** |
| GLI / iTech 認證 | ✅ | ❌ | **上線必補** |

---

## 下一步建議優先級

1. **跑模擬數學**（用 Node.js 寫 simulation runner，跑 1M spin 看 RTP）
2. **Server-side RNG**（最重要的合規前提）
3. **補 Big Win / Free Game 分層音效**
4. **AI 生成 buy-feature-button 等 UI 素材**
5. **Near miss 視覺**
6. **連消音階上升**
7. **找 RGS 平台或自建**（自建約 6 個月、雇 RGS 約 3 個月上線）
