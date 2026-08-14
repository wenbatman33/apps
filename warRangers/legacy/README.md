# 舊版程式碼封存（codex 版）

2026-08-13 v2 重寫時整包移入，**唯讀保存、請勿再修改**。
保留原因：路徑資料綁定方式、素材鍵名、關卡數值仍具參考價值。

- `src/` 舊 Phaser 場景與規則（battle.js / campaignRules.js / combatRules.js ...）
- `scripts/` 舊自動測試
- `index_legacy.html` 舊進入點（開 `?battle` 才是遊戲，預設是除錯場景）

新版程式碼在 `../src/core` 與 `../src/view`，規劃見 `../docs/REBUILD_V2_PLAN.md`。
