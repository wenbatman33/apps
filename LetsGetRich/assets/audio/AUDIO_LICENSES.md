# 音频素材来源与授权

本目录中的音效只作为《房产大亨》游戏流程的一部分使用，不作为独立音效包或音乐文件提供。所有音频均已按游戏节奏重新裁切、混音、淡入淡出并统一响度。

## 背景音乐

- 当前游戏文件：`golden-gilded-avenues.mp3`
- 曲名：`Golden Gilded Avenues`
- 来源：使用者提供的音频文件。
- 用途：游戏背景音乐，约 29.8 秒，以 HTML Audio 原生循环播放。
- 授权：由使用者负责确认该音频用于本项目及后续发布的授权范围。
- 旧版文件：`property-parade-loop.ogg`、`property-parade-loop.m4a` 仅保留在素材目录中作为版本回退，目前不会载入或播放。

## 小森平的免费下载音效

- `dice.mp3`：`dice2`，真实掷骰录音；压缩为约 2.47 秒，并在 3D 骰子定点后立即淡出
- `coin.mp3`：`coin01`，金币提示
- `beam.mp3`：`warp2`，强制移动光束
- `win.mp3`：`fanfare1`，胜利演出
- `bankrupt.mp3`：`badend1`，破产演出
- 来源：[小森平的免费下载音效](https://taira-komori.net/freesoundtw.html)
- 授权：允许用于游戏、软件、影像等作品；禁止把音效文件冒名、单独销售或作为音效素材再次发布。

## 音效实验室

- `click.mp3`：`decision22`，可爱确认按钮
- `step.mp3`：由 `click.mp3` 裁切为 0.11 秒的短促走格提示音；角色每前进或后退一格播放一次
- `purchase.mp3`：`amount-display1`，收银结算
- `build.mp3`：`wood-nail1` 与 `levelup1` 混音，建造与落成
- `card.mp3`：`card-turn-over1`，翻卡
- `roulette.mp3`：`drum-roll1` 与 `roll-finish1` 混音，轮盘抽选与揭晓
- 来源：[音效实验室](https://soundeffect-lab.info/)
- 授权：[使用条款](https://soundeffect-lab.info/agreement/)允许免费商用、加工，以及把音效作为应用程序操作音使用；禁止将音效本身再次发布。

## 游戏内处理

- 音效：44.1 kHz 双声道 MP3，128–160 kbps。
- 音乐：当前使用 44.1 kHz、192 kbps MP3；游戏音量为 0.20，并在首次玩家互动后开始循环播放。
- 未使用 Phaser Graphics、Canvas 或 SVG 生成任何音频或视觉素材。
