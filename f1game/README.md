# F1 鈴鹿大獎賽 — Suzuka Grand Prix

Three.js 3D F1 網頁遊戲。賽道使用真實鈴鹿賽道中心線資料（TUMFTM racetrack-database，總長 5802.9m），含 8 字型立體交叉、近似真實高程、7 台 AI 對手、F1 五紅燈起跑、圈速計時與結算。

## 操作
- ↑/W 油門、空白鍵煞車（↓/S 也可；停止時長按 = 倒車）
- ←→/A D 轉向、R 重新起跑、M 或左上按鈕靜音
- `（backquote）或 F2：DEV 微調工具（物理/攝影機/AI 即時調整、HUD 拖曳、匯出 JSON）

## 執行
任一靜態伺服器即可，例如：`python3 -m http.server 8741`，開 `http://localhost:8741`。

## 素材授權
- 玩家車 3D 模型：「[Ferrari F1-75](https://sketchfab.com/3d-models/ferrari-f1-75-06454e0f23a44fcdabcc7808aee6caf9)」by [Sketcher](https://sketchfab.com/sketcher987654321)，授權 [CC-BY-NC-4.0](http://creativecommons.org/licenses/by-nc/4.0/)（署名、**禁止商用**）。完整條款見 `assets/models/F1/license.txt`。
- 賽道中心線資料：[TUMFTM racetrack-database](https://github.com/TUMFTM/racetrack-database)。
- 其餘（AI 車、賽道網格、貼圖、音效）皆為程式生成。
