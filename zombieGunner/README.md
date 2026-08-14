# 屍潮槍手 Zombie Gunner

弓箭傳說（Archero）架構的手機直屏射擊遊戲 —— 槍手對抗喪屍。
Phaser 3 + 純 script 載入（無建置流程），PC / 手機皆可遊玩。

```bash
python3 -m http.server 8123
```
開啟 http://localhost:8123

---

## 核心玩法

| 機制 | 說明 |
|---|---|
| **移動即停火** | 移動中不開火，停下後自動鎖定最近敵人射擊 —— 走位就是一切 |
| **虛擬搖桿** | 左下浮動式，觸控畫面下半部任意處即生成；拖出範圍時底座跟隨 |
| **PC 操作** | WASD / 方向鍵移動，ESC 暫停，D 開啟版面微調工具 |
| **三選一強化** | 每過一關抽 3 張技能卡，本次征戰累積（27 種技能） |
| **關卡** | 3 大章 × 50 小關 = 150 關；每 5 關精英、每 10 關 BOSS |
| **永久成長** | 金幣可在主選單購買 6 種永久強化，跨場保留 |

### 三大章節

1. **淪陷街區** DOWNTOWN OUTBREAK — 行屍、爬屍、狂奔屍、吐酸屍、爆裂屍、暴屍
2. **汙染實驗室** BIOHAZARD LAB — 變異加速，新增屍巫（召喚）
3. **軍事禁區** MILITARY QUARANTINE — 裝甲屍登場，敵人最強

BOSS 共 7 種：重甲屍王、群屍之母、劇毒母體、屠夫、腐化祭司、究極變異體、喪屍領主。

---

## 檔案結構

```
zombieGunner/
├── index.html              入口（所有 script 以 ?v= 版本號載入）
├── style.css
├── vendor/phaser.min.js    Phaser 3.87
├── src/
│   ├── core/               規則層（無渲染）
│   │   ├── config.js       畫面尺寸、LAYOUT 版面、玩家數值、難度曲線
│   │   ├── chapters.js     三章主題 + 150 關生成器
│   │   ├── enemies.js      敵人與 BOSS 定義表
│   │   ├── skills.js       27 種技能池 + 抽卡
│   │   ├── save.js         localStorage 存檔
│   │   ├── combat.js       開火、子彈、命中、爆炸、傷害結算
│   │   ├── ai.js           喪屍行為（近戰/遠程/自爆/召喚/BOSS）
│   │   └── sfx.js          WebAudio 程式合成音效（免素材）
│   ├── view/
│   │   ├── art.js          程式生成貼圖（AI 素材未就緒時的後備）
│   │   ├── anim.js         AI sprite 動畫接入層
│   │   ├── ui.js           按鈕 / 面板 / 標題
│   │   └── joystick.js     浮動虛擬搖桿
│   ├── scenes/
│   │   ├── menus.js        Boot / 主選單 / 關卡選擇 / 永久強化
│   │   ├── GameScene.js    戰鬥主場景
│   │   └── overlays.js     三選一技能 / 暫停 / 結算
│   ├── dev/devtools.js     版面微調工具
│   └── main.js
├── assets/
│   ├── icons/              32 張技能與強化圖示（AI 生成）
│   ├── props/              6 個俯視角道具（木箱、油桶、廢車、沙包、金幣、醫療箱）
│   └── anim/<動作>/        角色動畫
│       ├── raw.png         AI 原始分格圖（洋紅色鍵背景，素材源檔）
│       ├── frames/         切格去背後的單格
│       └── <動作>.png/json sprite sheet + atlas（遊戲實際載入）
└── scripts/                素材生成與後處理工具
```

---

## DEV 版面微調工具

戰鬥中按 **D** 開啟右側面板：

- **滑桿**：場地範圍、HUD 每個元素座標、搖桿（位置/半徑/透明度/死區/跟隨距離）、玩家數值（移速/射速/傷害/彈速/射程/角色尺寸/**槍口偏移**）
- **拖曳模式**：直接用滑鼠拖動場地、搖桿、血條
- **快捷**：無敵、殺光敵人、生 BOSS、隨機技能、直接過關、物理框線
- **💾 匯出 LAYOUT JSON**：一鍵複製到剪貼簿，貼回來我就能 baked 進原始碼

所有調整即時生效，不需重整。

---

## 素材生成流程（codex image_gen）

```bash
# 圖示 / 道具（靜態）
node scripts/gen_via_codex.mjs S --jobs 3     # 技能圖示
node scripts/gen_via_codex.mjs O --jobs 2     # 場景道具

# 角色動畫（6 格俯視角循環）
bash scripts/gen_anim.sh player_walk          # 生成 raw.png
bash scripts/process_anim.sh player_walk      # 切格去背 + 打包 atlas
bash scripts/process_anim.sh zombie_brute 90  # 第二參數 = 逆時針旋轉角度（AI 畫成朝下時用）

bash scripts/bump.sh                          # 更新 index.html 快取版本號
```

角色貼圖一律**面朝右**（遊戲用 rotation 對準目標）。
`scripts/split_sprites.py` 用連通區域自動找角色（不依賴 AI 精準排版），以 alpha 加權中位數對齊旋轉樞紐，避免槍管把樞紐往外拉。

已生成的動畫：`player_walk`、`player_shoot`、`zombie_walk`、`zombie_runner`、`zombie_brute`。
未做專屬動畫的敵種（爬屍、吐酸屍、爆裂屍、屍巫、各 BOSS）沿用相近體型的 sprite 並染色區分。

素材缺漏時遊戲會自動退回程式生成的貼圖，不會壞掉。
