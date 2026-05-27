#!/usr/bin/env python3
"""v16: 吧台中等長度（左端 0.37、右端貼齊右邊框）"""
import os, subprocess, shutil, time, sys

PROJ = "/Users/batman_work/claude/apps/westernBar"
OUT = f"{PROJ}/public/assets/A/A00_empty_bg.png"
REF_BAK = f"{PROJ}/public/assets/A/A00_empty_bg.png.bak_v13"
REF_PNG = f"{PROJ}/public/assets/A/_bg_ref.png"
LOG = f"{PROJ}/scripts/regen_bg_v16.log"

if not os.path.exists(REF_BAK):
    print(f"missing ref: {REF_BAK}", file=sys.stderr)
    sys.exit(1)

# 先備份目前的 v15
if os.path.exists(OUT):
    shutil.copyfile(OUT, OUT + ".bak_v15")

shutil.copyfile(REF_BAK, REF_PNG)

def log(msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

log("==== v16 吧台中等長度（左從 37% 開始、右貼邊框）====")

PROMPT = """附加圖是西部酒吧空場景背景。

任務：請用 image_gen 工具生成完全相同視角/透視/邊框/門洞/海報/招牌/酒瓶架/木地板/光線/色調的版本，
唯一差異是把【吧台 + 酒瓶架】整體稍微變短，且【右端緊貼 LCD 綠色右邊框】。

【目標位置】：
- 吧台 + 酒瓶架的【右端】緊貼著畫面右邊綠色 LCD 邊框內側（無空隙）
- 吧台 + 酒瓶架的【左端】從畫面寬度約 37% 位置開始
- 吧台與門洞之間多出一段木地板（左半邊約 25-30% 寬）

【嚴格保留 — 絕對不准改】：
- 相機 45 度俯視角度
- 綠色 LCD 圓角邊框
- 左側門洞 + 門框 + 透出的西部小鎮街景
- WANTED 海報、SALOON 招牌、油燈、風景畫（位置可能跟吧台一起右移）
- 酒保走道（吧台後與酒瓶架之間的橫向縫）
- 後牆酒瓶架的木紋、層架結構
- 吧台檯面深核桃木光澤面、木紋細節
- 整片地板的木板平行縫線方向、由近到遠延伸
- Pixar 3D 風格、軟陰影、暖色調

【唯一改變】：
- 吧台 + 酒瓶架整體比附加圖稍微往右壓縮（縮約 7-9% 寬度）
- 右端緊貼右邊框內側（無空隙）
- 左側空出一段木地板給門口和玩家走道

【絕對禁止】：
- 不准改視角、透視、邊框、門洞、整體色調
- 不准加入任何角色、桌椅、物品
- 不准在吧台右側留任何空地板間隔
- 不准吧台縮太多（剩下不到 60% 寬就是太短）

【輸出規範】：
- 1536x1024 PNG

完成後存到 """ + OUT + " 並用 sips 確認 1536x1024。"

log("▶ 開始生圖")

prompt_file = "/tmp/bg_v16_prompt.txt"
with open(prompt_file, "w") as f:
    f.write(PROMPT)

ref_rel = "public/assets/A/_bg_ref.png"
cmd = ["codex", "exec", "--skip-git-repo-check", "--image", ref_rel]

start = time.time()
with open(prompt_file) as stdin_f:
    result = subprocess.run(cmd, stdin=stdin_f, cwd=PROJ, capture_output=True, text=True, timeout=600)
elapsed = int(time.time() - start)

with open(LOG, "a") as f:
    f.write(f"--- elapsed {elapsed}s, returncode={result.returncode} ---\n")

if os.path.exists(OUT) and os.path.getmtime(OUT) > start:
    log(f"✓ 完成 ({elapsed}s)")
else:
    log(f"✗ 失敗 ({elapsed}s, returncode={result.returncode})")

try: os.remove(REF_PNG)
except: pass
