# 音效來源

SFX 取自三個免費素材庫，皆允許個人與商用使用。
原始檔經 ffmpeg 裁切／淡出／峰值正規化（-1 dBFS）處理。

- Kenney sci-fi sounds — https://kenney.nl（CC0 公眾領域，無需標示）
- taira-komori.net — https://taira-komori.net/freesoundtw.html
- 効果音ラボ（soundeffect-lab.info） — https://soundeffect-lab.info/

| 遊戲內用途 | 檔案 | 原始素材 |
| --- | --- | --- |
| 機炮（Vulcan）射擊 | shot-vulcan.mp3 | Kenney laserSmall_004.ogg（裁 0.22s，尾端淡出） |
| 機炮掃射循環（備用，見 VULCAN_MODE） | shot-vulcan-loop.mp3 | 効果音ラボ「重機関銃を乱射2」/ heavy-machine-gun2（取 0.10~2.40s 穩定段循環） |
| 雷射（Laser）射擊 | shot-laser.mp3 | Kenney laserLarge_001.ogg（裁 0.32s，尾端淡出） |
| 電漿（Plasma）電流 | shot-plasma.mp3 | taira sf01/electric_shock1.mp3（取前 0.5s） |
| 追蹤導彈發射 | shot-missile.mp3 | taira arms01/launcher1.mp3（取前 0.6s） |
| Boss 登場警報 | boss-warning.mp3 | taira sf01/emergency_signal.mp3 |
| 撿到炸彈 | pickup-bomb.mp3 | taira game01/powerup04.mp3 |
| 撿到 1UP | pickup-1up.mp3 | taira game01/powerup08.mp3 |

BGM `boss_titan_descent.mp3` 為使用者自備素材。

候選素材試聽工具在 `tools/sfx-picker/`（本機開 http://localhost:5180/）。
