# Layout 版本歷史

每份使用者透過 scene_editor.html 匯出的 JSON，都會以時間戳 + 標籤存在這資料夾。

## 命名規則

```
YYYY-MM-DD_HHMM_<vN>_<說明>.json
```

例：
- `2026-05-25_2335_v1_first-lock.json`
- `2026-05-25_2350_v2_paths-and-husband-wife.json`

## 操作

### 看歷史

```bash
ls -1t scripts/layout_history/
```

### 還原到某版本

```bash
# 把指定版本套回 LAYOUT.ts + editor DEFAULT_STATE
bash scripts/restore_layout.sh scripts/layout_history/<filename>.json
```

### 比較兩版

```bash
diff scripts/layout_history/<old>.json scripts/layout_history/<new>.json
```

## 約定

- 每次 user 給 JSON → Claude 寫進 `LAYOUT.ts` + 編輯器 `DEFAULT_STATE` + 此資料夾
- 永不覆蓋已存在的版本檔（新檔加時間戳）
- 主檔 `current.json` 永遠是最新一份（symlink 或副本）
