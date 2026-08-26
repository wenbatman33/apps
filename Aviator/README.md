# Aviator 飞行员（Crash 即时下注）

以 **PixiJS v8** 重制 SPRIBE《Aviator》玩法的网页游戏，PC 与手机皆可游玩。
全部 UI（HUD、下注面板、清单、弹窗、数字键盘、DEV 工具）都由引擎绘制，没有任何 DOM 组件。

> 纯技术展示 Demo，不涉及任何真实金流。

## 玩法（对齐原作规则）

| 项目 | 数值 |
| --- | --- |
| RTP | 97% |
| 最大倍率 | 100,000x |
| 最小 / 最大投注 | NT$3 / NT$3,000 |
| 每注奖金上限 | NT$300,000 |
| 同时下注 | 双押注 |
| 公平机制 | Provably Fair（SHA-256） |

- **投注**：回合起飞前输入金额或用快捷钮（10 / 20 / 50 / 100），按「投注」；起飞前可按「取消」收回。飞行中下注则排入下一回合。
- **兑现**：飞机飞走前按「兑现」，奖金 = 兑现倍数 × 投注额；没兑现就归零。
- **双押注**：面板右上角 `+` / `−` 可添加或收起第二个下注面板。
- **自动**：「自动」分页可开自动下注、自动兑现（目标倍数点一下用内置数字键盘输入）。
- **即时投注**：PC 在左侧、手机在下方，列出本回合所有玩家的下注与兑现，另有「我的下注」「最高」分页。
- **断线处理**：投注生效中若离开页面，会以当下倍数自动兑现（对齐原作断线规则）。

## Provably Fair

- 每回合开始前先产生 `serverSeed`，只公布其 SHA-256 **承诺哈希**。
- 倍数由 `SHA-256(serverSeed:clientSeed:nonce)` 决定，**开局前就已定案**。
- 回合结束后公开 `serverSeed`，菜单 →「Provably Fair 公平验证」可一键重算比对。
- 分布：`P(倍数 ≥ m) = RTP / m`，因此期望回报率恰为 97%；`clientSeed` 可自行更换。

验证分布与 RTP：

```bash
node tools/simrtp.mjs
```

## DEV 微调工具

游戏中按 **D** 打开（或菜单内说明）：

- 版面滑杆：topbar / history / 侧栏宽 / 间距 / 下注面板高、飞机巡航点与缩放、原点、倍数字级与位置、按钮高度、列高……即时预览
- 🎯 **拖曳画面直接设置飞机巡航点**
- 节奏参数：`growth`（倍数成长速度）、`reachMs`、`bettingMs`、`crashedMs`
- 状态测试：立即飞走、下一回合锁 1.00x / 2.00x / 10.00x / 100.00x
- PC / Mobile 版型切换、重设数值
- 💾 导出 JSON（拷贝到剪贴板，贴回 `src/config.js` 的 `LAYOUT_PC` / `LAYOUT_MOBILE` 即可锁定）

## 本机运行

```bash
python3 -m http.server 5190
```

开 http://localhost:5190 。

## 自动测试

```bash
python3 scripts/test_ui.py
```

用 Playwright 实际点击 canvas 上的按钮，验证下注 → 兑现 → 余额、分页切换、数字键盘、菜单与 Provably Fair 重算。

## 结构

```
index.html / styles.css
src/
  config.js          规则、色票、PC/Mobile 版面
  core/  fair.js     Provably Fair 与崩盘倍数分布
         engine.js   回合状态机（下注 → 飞行 → 飞走）
         game.js     余额、双押注、自动下注/兑现
         bots.js     即时投注列表的在线玩家
  view/  scene.js    版面组装与事件链接
         flight.js   曲线、飞机、倍数、等待动画
         betpanel.js 下注面板
         feed.js     即时投注清单（虚拟列表）
         chrome.js   顶列与历史倍数列
         modals.js   菜单 / 玩法 / 公平验证
         keypad.js   引擎渲染的数字键盘
         ui.js       按钮、分页、开关、卷动容器
         textures.js canvas 产生的渐变与程序绘制飞机
  audio/ sfx.js      WebAudio 合成音效
  dev/   devtools.js DEV 微调工具
assets/images/plane.png   AI 生成的飞机素材
tools/simrtp.mjs          RTP / 分布验证
scripts/                  截屏与 UI 自测脚本
```
