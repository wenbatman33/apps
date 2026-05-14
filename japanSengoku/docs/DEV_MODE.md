# Developer Mode 使用說明

## 啟用方式

在 URL 加上 `?dev=1`：

```
https://your-domain/japanSengoku/dist/?dev=1
```

或本地：

```
http://localhost:5173/?dev=1
```

---

## 介面位置

啟用後遊戲右下角會出現綠框 DEV 面板，含：

```
DEV MODE
Spins:    123
Bet sum:  1230.00
Win sum:  1186.45
RTP:      96.46%
Free:     0
Sticky×:  0

[ Force Scatter: OFF ]
[ Force Multiplier: OFF ]
[ Buy Feature (Free) ]
```

---

## 功能對照

| 按鈕 / 顯示 | 用途 |
|---|---|
| Spins | 當前 session 旋轉次數 |
| Bet sum | 累計下注（單位：點數） |
| Win sum | 累計贏分 |
| **RTP** | 實時 RTP，跑 10k+ spin 後可粗判數學模型偏差 |
| Free | 剩餘免費遊戲次數 |
| Sticky× | 免費遊戲累積倍數 |
| Force Scatter | （預留）強制 scatter 落入盤面，調整觸發機率 |
| Force Multiplier | （預留）強制倍數球落入 |
| **Buy Feature (Free)** | 不扣點直接進免費遊戲，方便測試 FG 流程 |

---

## 跑數學驗證

打開 dev mode → 啟動 AUTO → 跑 10,000+ spin → 觀察 RTP 是否落在 96% ± 2% 區間。

如果 RTP 持續高於 98% → 倍數球權重過高，需下調 `mult3` / `mult100` weights。
如果 RTP 持續低於 95% → symbol value 過低或 cascade 限制太緊。

---

## 注意

- Dev panel 純客戶端，**不影響 RNG**（目前 RNG 也在客戶端，正式版搬到 RGS 後 dev 工具會改連後台 admin）
- 上線版本透過 build flag 移除 dev mode（`vite build --mode production` 時排除）
- 千萬不要把 `?dev=1` 連結放到正式行銷素材

---

## 後續可加（待補）

- [ ] 真正實作 Force Scatter / Force Multiplier 邏輯（改寫 `weightedSymbol`）
- [ ] 顯示當前 spin 的 grid raw data
- [ ] 一鍵跑 1000 次模擬、輸出 CSV
- [ ] 切換 free game / base game RTP 區隔
- [ ] 切換波動性測試模式（lock 倍數球機率）
