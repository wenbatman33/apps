#!/usr/bin/env python3
"""縮短吧台右端 - 用 .bak_v13 當 ref 避免 codex 卡住"""
import os, subprocess, shutil, time, sys

PROJ = "/Users/batman_work/claude/apps/westernBar"
OUT = f"{PROJ}/public/assets/A/A00_empty_bg.png"
REF_BAK = f"{PROJ}/public/assets/A/A00_empty_bg.png.bak_v13"
REF_PNG = f"{PROJ}/public/assets/A/_bg_ref.png"
LOG = f"{PROJ}/scripts/regen_bg_short_bar_v2.log"

if not os.path.exists(REF_BAK):
    print(f"missing ref: {REF_BAK}", file=sys.stderr)
    sys.exit(1)

# 複製備份成獨立 ref 檔
shutil.copyfile(REF_BAK, REF_PNG)

def log(msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

log("==== v2 縮短吧台右端 ====")

PROMPT = """附加圖是西部酒吧空場景背景圖。

任務：請用 image_gen 工具生成一張【完全相同視角/透視/牆面/地板/酒瓶架/SALOON 招牌/WANTED 海報/門洞/綠色 LCD 邊框】的版本，唯一差異是把【吧台檯面 + 吧台前面板 + 酒瓶架】整體右端往左縮短 8-10% 畫面寬度，畫面右側多出一段純木地板（與下方地板無縫銜接、木紋方向一致）。

【嚴格保留 — 絕對不准改】：
- 相機 45 度俯視角度
- 綠色 LCD 圓角邊框
- 左側門洞 + 門框 + 透出的西部小鎮街景（藍天、遠山、店舖剪影）
- WANTED 海報（紙質、釘子、撕邊）
- SALOON 招牌（深紅木板、金色花框）
- 油燈、風景畫等所有牆上裝飾
- 酒保走道（吧台與酒瓶架之間透出地板的橫向縫，寬度約畫面高 8-12%）
- 後牆酒瓶架的木紋、層架結構（寬度跟著縮短）
- 吧台檯面【深核桃木光澤面】、木紋細節
- 整片地板的【木板平行縫線】方向、由近到遠延伸
- Pixar 3D 風格、軟陰影、暖色調

【唯一改變】：
- 吧台 + 酒瓶架右端【截斷往左】到約畫面寬度 85-87% 位置
- 截斷處自然收尾（吧台木板側面可見有厚度的截斷面、可能小立柱或木牆收邊）
- 右側空出木地板（與下方客人地板無縫銜接、木紋方向延伸一致）

【絕對禁止】：
- 不准改視角、透視、邊框、門洞、海報位置
- 不准加入任何角色、桌椅、物品
- 不准改色調、光線方向

【輸出規範】：
- 1536x1024 PNG
- 整張就是 LCD 螢幕畫面內容

完成後存到 """ + OUT + " 並用 sips 確認 1536x1024。"

log("▶ 開始生圖（3-5 分鐘）")

# 寫 prompt 到暫存檔，再用 stdin redirect 傳給 codex
prompt_file = "/tmp/bg_prompt.txt"
with open(prompt_file, "w") as f:
    f.write(PROMPT)

ref_rel = "public/assets/A/_bg_ref.png"
cmd = ["codex", "exec", "--skip-git-repo-check", "--image", ref_rel]

start = time.time()
with open(prompt_file) as stdin_f:
    result = subprocess.run(cmd, stdin=stdin_f, cwd=PROJ, capture_output=True, text=True)
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

# 清理暫存 ref
try:
    os.remove(REF_PNG)
except Exception:
    pass
