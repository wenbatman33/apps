#!/bin/bash
# 角色俯視角動畫 strip 生成（codex 內建 image_gen）
# 用法： bash scripts/gen_anim.sh <name>
# 產出： assets/anim/<name>/raw.png
#
# 注意：
#  - gpt-image 只支援 1024x1024 / 1536x1024 / 1024x1536，橫幅 strip 一律用 1536x1024
#  - codex 沙盒常無法寫入專案目錄，因此改由本腳本自 ~/.codex/generated_images 取最新檔
#  - 必須明確禁止 codex 自行去背／改走 CLI，否則它會停在確認流程而不產圖

ROOT=/Users/batman_work/claude/apps/zombieGunner
NAME="$1"
DIR="$ROOT/assets/anim/$NAME"
mkdir -p "$DIR"

VIEW="嚴格由正上方俯視（strict top-down bird's-eye view, camera directly overhead looking straight down; 只看得到頭頂與肩膀; 看不到正面的臉; 不是側視圖; 不是 45 度斜視角）"
STYLE="卡通手遊美術風格，粗黑描邊、鮮豔平塗上色、柔和 cel shading、Archero / Survivor.io 俯視射擊手遊質感"
RULES="硬性要求：**背景必須是 100% 均勻的純飽和洋紅色 #FF00FF（RGB 255,0,255），像去背用的綠幕一樣整片同一個顏色，絕對不可以有漸層、暗角、光暈、陰影、地面或任何深色底**（角色本身絕不可出現洋紅或粉紅色）；不要格線、不要文字、不要邊框、不要棋盤格；每一格的角色完整收在自己那格中央、四周留白至少 15%、絕不觸碰格線、相鄰格互不重疊；每一格角色大小完全相同、全程面向畫面右方，不可左右鏡像翻轉。"
NOTE="重要：請直接使用內建 image_gen 工具產圖即可，**不要**自行去背、**不要**改用 CLI gpt-image、**不要**反問我任何問題、**不要**執行 remove_chroma_key 之類的後處理，我會自行處理。產完後只要回報 OK。"

case "$NAME" in
  player_walk)
    BODY="一名軍事風格的卡通槍手角色，深藍色戰術背心與軍用頭盔、青色護目鏡、黑色手套與軍靴，雙手持一把黑色突擊步槍指向畫面右方"
    POSE="第1格左腿向前跨出（俯視可見左腳伸到身體上方）；第2格左腿收回接近身體中線；第3格雙腿併攏、身體略微前傾；第4格右腿向前跨出（右腳伸到身體下方）；第5格右腿收回；第6格雙腿併攏、準備銜接第1格。全程槍口穩定指向右方，肩膀隨步伐輕微上下擺動"
    ;;
  player_shoot)
    BODY="一名軍事風格的卡通槍手角色，深藍色戰術背心與軍用頭盔、青色護目鏡、黑色手套與軍靴，雙手持一把黑色突擊步槍指向畫面右方"
    POSE="第1格穩定持槍待射；第2格槍口出現小火花、身體微微後仰；第3格槍口爆出明亮橘黃色槍焰、肩膀後座最大；第4格槍焰縮小、身體開始回正；第5格槍焰消失、殘留一點煙；第6格回到穩定持槍姿勢。全程角色位置不變、槍永遠指向右方"
    ;;
  zombie_walk)
    BODY="一隻卡通喪屍，腐爛的灰綠色皮膚、破爛的深色衣服、雙臂向畫面右方僵直前伸、頭部略微歪斜，頭頂可見亂髮與傷口"
    POSE="第1格左臂略高右臂略低、左腿向前拖行；第2格身體重心右移；第3格雙腿接近併攏；第4格右臂略高左臂略低、右腿向前拖行；第5格身體重心左移；第6格雙腿接近併攏並銜接第1格。全程雙臂保持向右前伸，身體僵硬地左右搖晃"
    ;;
  zombie_runner)
    BODY="一隻卡通狂奔喪屍，暗紅色腐爛皮膚、撕爛的衣服碎片、身體前傾、雙臂大幅擺動、張大血口"
    POSE="第1格左腿蹬地向後、右腿高抬向前；第2格身體前傾騰空；第3格右腿落地；第4格右腿蹬地、左腿高抬；第5格身體前傾騰空；第6格左腿落地銜接第1格。全程朝右方奔跑，雙臂前後大幅擺動"
    ;;
  zombie_brute)
    BODY="一隻巨大的卡通暴屍，灰藍色厚重肌肉、肩膀有骨刺、雙臂粗壯下垂、頭小身體巨大"
    POSE="第1格左腿沉重前踏；第2格身體重心壓低右擺；第3格雙腿併攏、肩膀聳起；第4格右腿沉重前踏；第5格身體重心壓低左擺；第6格雙腿併攏銜接第1格。全程動作沉重緩慢，朝右方前進"
    ;;
  *)
    echo "未知角色： $NAME"; exit 1;;
esac

STAMP="$DIR/.stamp"
touch "$STAMP"

codex exec --skip-git-repo-check "請用內建 image_gen 工具產生一張 1536x1024 的橫幅 PNG 動畫分格圖。

內容：${BODY}
視角：${VIEW}
風格：${STYLE}

畫面切成 2 列 3 欄共 6 格（上列第 1~3 格，下列第 4~6 格），為一個可循環播放的動畫。
${RULES}

逐格姿勢（必須連貫平滑、相鄰格差異小而均勻）：${POSE}

${NOTE}" > "$DIR/gen.log" 2>&1

# 取回產出：找 stamp 之後產生、且為橫幅 1536x1024 的最新檔
LATEST=$(find ~/.codex/generated_images -name "*.png" -newer "$STAMP" 2>/dev/null | while read -r f; do
  w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/{print $2}')
  [ -n "$w" ] && [ -n "$h" ] && [ "$w" -gt "$h" ] && echo "$f"
done | tail -1)

if [ -n "$LATEST" ]; then
  cp "$LATEST" "$DIR/raw.png"
  echo "✅ $NAME → $DIR/raw.png"
else
  echo "❌ $NAME 未取得橫幅圖，請看 $DIR/gen.log"
fi
rm -f "$STAMP"
