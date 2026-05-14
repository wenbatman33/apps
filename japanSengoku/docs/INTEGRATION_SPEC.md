# 戰國雙雄 — Operator Integration Spec
（廠商串接規格書）

> 給營運商 / 包網平台 / Aggregator 對接用。
> 目前版本：客戶端為 Phaser 3，**單機展示版**（盤面結果由前端隨機產生），上線需改為 **Server Authoritative** 模式。

---

## 1. 部署架構

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│  Player UI  │ ───▶   │   RGS (我方)  │ ───▶   │  Operator   │
│  (Phaser)   │  HTTPS  │ Game Server   │  HTTPS │   Wallet    │
└─────────────┘  WSS   └──────────────┘        └─────────────┘
       ▲                       │
       │                       ▼
       │                ┌──────────────┐
       └─── assets ───  │   CDN (S3)   │
                        └──────────────┘
```

- 客戶端純前端，**所有結果由 RGS 計算**
- 客戶端只負責播放動畫、不參與 RNG
- Operator 對接的是我方的 RGS，玩家錢包扣分由 Operator 完成

---

## 2. API Endpoints

Base URL：`https://rgs.example.com/api/v1/sengoku`

### 2.1 Authenticate
```
POST /auth
Headers:
  X-Operator-Id: OP123
  X-Signature: HMAC-SHA256(payload, secret)
Body:
{
  "operator_token": "abc...",
  "player_id": "user_42",
  "currency": "TWD",
  "language": "zh-TW"
}
Response:
{
  "session_id": "sess_xyz",
  "balance": 1000.00,
  "bet_levels": [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  "default_bet": 10
}
```

### 2.2 Spin
```
POST /spin
{
  "session_id": "sess_xyz",
  "bet": 10,
  "feature_buy": false
}
Response:
{
  "round_id": "r_001",
  "bet_deducted": 10.00,
  "balance_after_bet": 990.00,
  "grid": [
    ["torii","sakura","momiji","hanabi","yari","scatter"],
    ...5 rows
  ],
  "cascades": [
    {
      "matches": [{"id":"sakura","count":9,"value":10}],
      "multiplier_orbs": [],
      "win": 90.00,
      "new_grid": [...] // 補洞後
    },
    ...
  ],
  "total_win": 270.00,
  "feature_triggered": null,
  "balance_after": 1260.00
}
```

### 2.3 Spin（Buy Feature）
```
POST /spin
{
  "session_id": "sess_xyz",
  "bet": 10,
  "feature_buy": true
}
Response:
{
  "round_id": "r_002",
  "bet_deducted": 1000.00,        // 100x
  "feature": {
    "type": "free_game",
    "spins": 15,
    "free_rounds": [
      {
        "grid": [...],
        "cascades": [...],
        "sticky_multiplier_after": 5,
        "scatter_count": 0,
        "retrigger": 0,
        "round_win": 80.00
      },
      ... 15 個
    ],
    "total_free_win": 4250.00
  },
  "total_win": 4250.00,
  "balance_after": 4250.00
}
```

### 2.4 Balance Sync
```
GET /balance?session_id=sess_xyz
{ "balance": 4250.00 }
```

### 2.5 Replay（重放）
```
GET /replay/r_001
→ 回傳完整 spin response，給玩家爭議時調閱
```

---

## 3. Operator → RGS 回呼

### 3.1 Wallet Debit
```
POST {operator}/wallet/debit
Headers:
  X-Game-Id: JS-SENGOKU-001
  X-Round-Id: r_001
  X-Signature: HMAC-SHA256(...)
Body:
{
  "player_id": "user_42",
  "amount": 10.00,
  "currency": "TWD",
  "transaction_id": "tx_001"
}
Response: 200 OK + new balance | 402 Insufficient Funds
```

### 3.2 Wallet Credit
```
POST {operator}/wallet/credit
{ ...same shape with "amount": 270.00 }
```

### 3.3 Rollback（發生錯誤時補償）
```
POST {operator}/wallet/rollback
{ "transaction_id": "tx_001" }
```

---

## 4. 結算流程（Settle Flow）

```
玩家點 SPIN
   ↓
RGS receive → 呼叫 Operator wallet/debit
   ↓
扣款成功 → RNG 計算結果 → 寫入 DB
   ↓
回 spin response 給 Client
   ↓
Client 播動畫（5~8 秒）
   ↓
若有贏分 → RGS 呼叫 Operator wallet/credit
   ↓
Operator 回 OK → 完成
```

**錯誤處理**：
- Debit 失敗 → 直接回 Client 401，不做 RNG
- Credit 失敗 → 重試 3 次，仍失敗 → 進人工對帳隊列，**結果保留可重放**

---

## 5. 安全要求

| 項目 | 規範 |
|---|---|
| Transport | TLS 1.3 + mTLS |
| Signature | HMAC-SHA256, 5min timestamp window |
| RNG | 通過 GLI-19 / iTech Labs 認證 |
| Audit Log | 保留 5 年 |
| Session Expiry | 30 min idle |
| Rate Limit | 10 spin/sec per player |

---

## 6. 國際化與在地化

| 語言代碼 | 介面 | 幣值預設 |
|---|---|---|
| zh-TW | 繁中 | TWD |
| zh-CN | 簡中 | CNY |
| en | English | USD |
| th | ภาษาไทย | THB |
| vi | Tiếng Việt | VND |
| id | Indonesia | IDR |

**監管屏蔽**：
- `feature_buy = true` → 在地區為 UK/NL/SE/DE 時 RGS 直接拒絕（HTTP 403）
- 預設讀取 IP geolocation + operator metadata

---

## 7. 認證 / 監管文件

需提供（標準包）：
1. ✅ Math Sheet（本文件附件 `MATH_SHEET.md`）
2. ⏳ 100M spin simulation report
3. ⏳ GLI-19 RNG certificate
4. ⏳ ISO 27001（資安管理）
5. ⏳ PCI DSS（金流）
6. ⏳ Game Rules HTML（玩家可讀版本）
7. ⏳ Privacy Policy / Terms of Service
8. ⏳ Responsible Gaming features（限額、自我排除）

---

## 8. 上線 Checklist（給商務 / 法務）

- [ ] 目標市場是否允許 Buy Feature？
- [ ] RTP 是否需依市場法規調整？（如義大利強制 90%，部分東南亞無限制）
- [ ] 是否需通過當地 GLI / BMM / iTech Labs 認證？
- [ ] 是否串接 Responsible Gaming 平台（GamCare / GambleAware 等）？
- [ ] 是否需要 24/7 客服 SLA？
- [ ] 分潤條件：通常 RGS 拿淨營收 12~25%
- [ ] 玩家身分驗證（KYC）誰做？
- [ ] 反洗錢（AML）門檻通報誰處理？
