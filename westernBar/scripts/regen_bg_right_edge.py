#!/usr/bin/env python3
"""吧台縮短但右端貼齊右邊框（左邊多空出地板）"""
import os, subprocess, shutil, time, sys

PROJ = "/Users/batman_work/claude/apps/westernBar"
OUT = f"{PROJ}/public/assets/A/A00_empty_bg.png"
REF_BAK = f"{PROJ}/public/assets/A/A00_empty_bg.png.bak_v13"
REF_PNG = f"{PROJ}/public/assets/A/_bg_ref.png"
LOG = f"{PROJ}/scripts/regen_bg_right_edge.log"

if not os.path.exists(REF_BAK):
    print(f"missing ref: {REF_BAK}", file=sys.stderr)
    sys.exit(1)

shutil.copyfile(REF_BAK, REF_PNG)

def log(msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

log("==== 吧台縮短 + 右端貼齊右邊框 ====")

PROMPT = """附加圖是西部酒吧空場景背景。

任務：請用 image_gen 工具生成完全相同視角/透視/邊框/門洞/海報/招牌/酒瓶架/木地板/光線/色調的版本，
唯一差異是把【吧台 + 酒瓶架】整體變短，且【右端緊貼 LCD 綠色右邊框】。

【目標 — 用 ASCII 示意】：
舊版：｜門洞 [______吧台延伸到右邊______]｜
新版：｜門洞 ___地板___ [____短吧台貼右____]｜

具體位置：
- 吧台 + 酒瓶架的【右端就貼著畫面右邊綠色 LCD 邊框內側】（沒有空地板間隔）
- 吧台 + 酒瓶架的【左端從畫面寬度約 42-45% 位置開始】（不是原本 30% 那麼長）
- 吧台與門洞之間多出一段木地板（左半邊）

【嚴格保留 — 絕對不准改】：
- 相機 45 度俯視角度
- 綠色 LCD 圓角邊框
- 左側門洞 + 門框 + 透出的西部小鎮街景
- WANTED 海報、SALOON 招牌、油燈、風景畫（位置跟吧台一起往右移）
- 酒保走道（吧台後與酒瓶架之間的橫向縫）
- 後牆酒瓶架的木紋、層架結構
- 吧台檯面深核桃木光澤面、木紋細節
- 整片地板的木板平行縫線方向、由近到遠延伸
- Pixar 3D 風格、軟陰影、暖色調

【唯一改變】：
- 吧台 + 酒瓶架整體往右壓縮、變窄
- 右端緊貼右邊框內側（無空隙）
- 左側空出一段木地板（從門洞到吧台左端）

【絕對禁止】：
- 不准改視角、透視、邊框、門洞、整體色調
- 不准加入任何角色、桌椅、物品
- 不准在吧台右側留任何空地板間隔

【輸出規範】：
- 1536x1024 PNG
- 整張就是 LCD 螢幕畫面內容

完成後存到 """ + OUT + " 並用 sips 確認 1536x1024。"

log("▶ 開始生圖（3-5 分鐘）")

prompt_file = "/tmp/bg_right_edge_prompt.txt"
with open(prompt_file, "w") as f:
    f.write(PROMPT)

ref_rel = "public/assets/A/_bg_ref.png"
cmd = ["codex", "exec", "--skip-git-repo-check", "--image", ref_rel]

start = time.time()
with open(prompt_file) as stdin_f:
    result = subprocess.run(cmd, stdin=stdin_f, cwd=PROJ, capture_output=True, text=True, timeout=600)
elapsed = int(time.time() - start)

with open(LOG, "a") as f:
    f.write(f"--- codex stdout (last 30 lines) ---\n")
    f.write("\n".join(result.stdout.split("\n")[-30:]))
    f.write(f"\n--- codex stderr (last 10 lines) ---\n")
    f.write("\n".join(result.stderr.split("\n")[-10:]))
    f.write(f"\n--- elapsed {elapsed}s, returncode={result.returncode} ---\n")

if os.path.exists(OUT) and os.path.getsize(OUT) > 0:
    out_ts = os.path.getmtime(OUT)
    if out_ts > start:
        log(f"✓ 完成 ({elapsed}s)")
    else:
        log(f"✗ 圖檔未更新 ({elapsed}s, returncode={result.returncode})")
else:
    log(f"✗ 失敗 ({elapsed}s)")

try:
    os.remove(REF_PNG)
except Exception:
    pass
