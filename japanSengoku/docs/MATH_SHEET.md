# 戰國雙雄 Math Sheet（數學模型表）

> 提供給營運商 / RGS 平台 / 認證機構（GLI、BMM 等）審查用。
> 目前數值為**設計目標**，需要透過跑 100M+ 次模擬驗證。

---

## 1. 基本參數

| 項目 | 值 | 備註 |
|---|---|---|
| Game ID | `JS-SENGOKU-001` | 内部代號 |
| Game Name | 戰國雙雄（Sengoku Slot） | |
| Reel Setup | 6×5 cluster | 30 格、群集消除 |
| Min Bet | NT$ 1.00 | 可隨營運商調整 |
| Max Bet | NT$ 10,000 | |
| Bet Steps | 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000 | 13 階 |
| **Target RTP** | **96.50%** | 主流區間 |
| Buy Feature RTP | 97.20% | 業界慣例略高於 base |
| **Volatility** | High（5/5） | |
| Max Win | **5,000x** total bet | 硬天花板 |
| Hit Frequency | ~28% per spin | 含小贏 |
| Free Game Trigger | ~1 / 220 spins | 自然觸發 |

---

## 2. Symbol Paytable（賠率表）

賠率 = **盤面上同 ID 的數量** × symbol value × （倍數球倍數）

| Symbol | ID | 8~9 個 | 10~11 個 | 12+ 個 |
|---|---|---|---|---|
| 信長 | oda | 28 | 56 | 168 |
| 信玄 | takeda | 28 | 56 | 168 |
| 兜 | kabuto | 35 | 70 | 210 |
| 刀 | katana | 30 | 60 | 180 |
| 軍配 | gunbai | 25 | 50 | 150 |
| 槍 | yari | 20 | 40 | 120 |
| 火繩槍 | rifle | 18 | 36 | 108 |
| 太鼓 | taiko | 16 | 32 | 96 |
| 鳥居 | torii | 14 | 28 | 84 |
| 櫻 | sakura | 10 | 20 | 60 |
| 楓 | momiji | 10 | 20 | 60 |
| 雪 | snowflake | 8 | 16 | 48 |
| 花火 | hanabi | 8 | 16 | 48 |
| **3× 倍數球** | mult3 | — | — | 3x（不獨立支付，疊加倍數） |
| **100× 倍數球** | mult100 | — | — | 100x |
| **SCATTER 小判** | scatter | — | — | 4+ 觸發 Free Game |

> 目前 main.js 內最低門檻為 5 個（測試方便），上線版本應調整為 8 個門檻 + 細分組別。

---

## 3. Weighting（權重表）

主遊戲 reel weights：

| Symbol | Weight | 機率（理論） |
|---|---|---|
| scatter | 3 | 2.0% |
| kabuto | 5 | 3.3% |
| katana | 8 | 5.3% |
| gunbai | 9 | 6.0% |
| yari | 9 | 6.0% |
| rifle | 10 | 6.7% |
| taiko | 10 | 6.7% |
| torii | 12 | 8.0% |
| sakura | 14 | 9.3% |
| momiji | 14 | 9.3% |
| snowflake | 16 | 10.6% |
| hanabi | 16 | 10.6% |
| mult3 | 5 | 3.3% |
| mult100 | 1 | 0.7% |
| oda | 7 | 4.7% |
| takeda | 7 | 4.7% |
| **總和** | 150 | 100% |

Free Game 內權重調整建議（待實作）：
- scatter ×2（容易再觸發）
- mult3 / mult100 ×1.5
- 高賠率 symbol（kabuto、katana）×1.2

---

## 4. 特殊機制

### 4.1 Cascade（連消）
- 每次贏分後勝出 symbol 消失，上方落下、頂部隨機補新
- 同回合可連消 **無上限**（目前 main.js 限 4 次防無限迴圈，正式版應移除）

### 4.2 Multiplier Orbs（倍數球）
- `mult3` 出現 3×，`mult100` 出現 100×
- 同回合多顆 → **加總**（不是相乘）
- 主遊戲：每次旋轉重新計算
- 免費遊戲：**累積到本次免費遊戲結束**（sticky multiplier）

### 4.3 Free Game（免費遊戲）
- 觸發：4+ scatter → 15 次
- 再觸發：免費遊戲中 3+ scatter → +5 次
- Sticky Multiplier：免費遊戲內所有倍數球**累加保留**
- 不扣 bet、勝分計入主帳

### 4.4 Buy Feature（購買特色）
- 售價：**100× 當前 bet**
- 立即觸發 15 次免費遊戲
- RTP 略高於主遊戲（97.2% vs 96.5%）— 業界標準
- 監管限制：英國、荷蘭等歐洲市場已禁止，部署時需依市場屏蔽按鈕

---

## 5. 預期分布（Target Distribution）

| Win Range（× bet） | 機率 | 累積 |
|---|---|---|
| 0 | 72% | 72% |
| 0.01 – 1× | 18% | 90% |
| 1 – 5× | 7% | 97% |
| 5 – 20× | 2.5% | 99.5% |
| 20 – 100× | 0.4% | 99.9% |
| 100 – 1000× | 0.09% | 99.99% |
| 1000 – 5000× | 0.01% | 100% |

---

## 6. 認證須提供的模擬輸出

需要跑 **100,000,000 spins** 並產出：
1. Actual RTP（誤差 < 0.1%）
2. 變異係數（CV）
3. Hit frequency
4. Top 1000 wins
5. Free game frequency + average win
6. Buy Feature ROI

> 建議用 Node.js worker_threads 跑批次模擬，輸出 CSV 報告。
