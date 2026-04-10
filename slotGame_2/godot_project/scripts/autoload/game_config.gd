extends Node
## 遊戲設定 — 中獎率、賠率、符號權重全在這裡調整

# ===== 符號定義 =====
enum Symbol {
	ORANGE = 0,    # 1_orange
	LEMON = 1,     # 2_lemon
	PLUM = 2,      # 3_plum
	BANANA = 3,    # 4_banana
	CHERRY = 4,    # 5_cherry
	GRAPES = 5,    # 6_grapes
	WATERMELON = 6,# 7_watermelon
	BAR = 7,       # 8_bar
	SEVEN = 8,     # 9_seven
	SCATTER = 9,   # 10_strawberry (Scatter)
	WILD = 10      # 11_bell (Wild)
}

# 符號名稱（對應素材檔名）
const SYMBOL_NAMES: Array = [
	"1_orange", "2_lemon", "3_plum", "4_banana", "5_cherry",
	"6_grapes", "7_watermelon", "8_bar", "9_seven",
	"10_strawberry", "11_bell"
]

# 符號顯示名稱
const SYMBOL_DISPLAY_NAMES: Array = [
	"Orange", "Lemon", "Plum", "Banana", "Cherry",
	"Grapes", "Watermelon", "BAR", "7", "Scatter", "Wild"
]

# ===== 賠率表（乘以線注）=====
# 索引 = Symbol enum, 內層 [3連, 4連, 5連]
const PAYTABLE: Dictionary = {
	Symbol.ORANGE:     [4, 8, 40],
	Symbol.LEMON:      [8, 25, 70],
	Symbol.PLUM:       [10, 50, 100],
	Symbol.BANANA:     [12, 75, 125],
	Symbol.CHERRY:     [15, 100, 250],
	Symbol.GRAPES:     [30, 150, 500],
	Symbol.WATERMELON: [20, 200, 1000],
	Symbol.BAR:        [10, 300, 2000],
	Symbol.SEVEN:      [12, 350, 2500],
	Symbol.WILD:       [20, 1000, 5000],
}

# Scatter 賠率（乘以總注額）+ 免費旋轉
const SCATTER_PAYS: Dictionary = {
	2: {"pay": 0, "free_spins": 0, "multiplier": 1},
	3: {"pay": 100, "free_spins": 10, "multiplier": 2},
	4: {"pay": 400, "free_spins": 15, "multiplier": 3},
	5: {"pay": 3000, "free_spins": 20, "multiplier": 3},
}

# ===== 20 條連線定義 =====
# 每條線 5 個數字，代表該軸的行位置 (0=上, 1=中, 2=下)
const PAYLINES: Array = [
	[1, 1, 1, 1, 1],  # Line 1:  中中中中中
	[0, 0, 0, 0, 0],  # Line 2:  上上上上上
	[2, 2, 2, 2, 2],  # Line 3:  下下下下下
	[0, 1, 2, 1, 0],  # Line 4:  V 形
	[2, 1, 0, 1, 2],  # Line 5:  倒 V
	[1, 0, 1, 0, 1],  # Line 6:  中上中上中（鋸齒）
	[1, 2, 1, 2, 1],  # Line 7:  中下中下中（鋸齒）
	[0, 0, 1, 2, 2],  # Line 8:  上上中下下（斜降）
	[2, 2, 1, 0, 0],  # Line 9:  下下中上上（斜升）
	[1, 2, 1, 0, 1],  # Line 10: 中下中上中
	[1, 0, 1, 2, 1],  # Line 11: 中上中下中
	[0, 1, 1, 1, 0],  # Line 12: 上中中中上
	[2, 1, 1, 1, 2],  # Line 13: 下中中中下
	[0, 1, 0, 1, 0],  # Line 14: 上中上中上（W形）
	[2, 1, 2, 1, 2],  # Line 15: 下中下中下（M形）
	[1, 1, 0, 1, 1],  # Line 16: 中中上中中
	[1, 1, 2, 1, 1],  # Line 17: 中中下中中
	[0, 0, 2, 0, 0],  # Line 18: 上上下上上
	[2, 2, 0, 2, 2],  # Line 19: 下下上下下
	[0, 2, 2, 2, 0],  # Line 20: 上下下下上
]

# ===== 中獎率控制 =====
# 每個滾輪的符號權重 — 數字越大出現機率越高
# 調整這些數值可以精確控制 RTP (Return To Player)
# 預設 RTP 約 92-95%

# 目標 RTP 百分比（顯示用）
var target_rtp: float = 93.0

# 每個滾輪的虛擬帶（符號出現的權重分布）
# 格式: { Symbol: 權重 }
var reel_weights: Array = [
	# 滾輪 1
	{
		Symbol.ORANGE: 8, Symbol.LEMON: 7, Symbol.PLUM: 6,
		Symbol.BANANA: 5, Symbol.CHERRY: 5, Symbol.GRAPES: 4,
		Symbol.WATERMELON: 3, Symbol.BAR: 2, Symbol.SEVEN: 2,
		Symbol.SCATTER: 3, Symbol.WILD: 2
	},
	# 滾輪 2
	{
		Symbol.ORANGE: 8, Symbol.LEMON: 7, Symbol.PLUM: 6,
		Symbol.BANANA: 5, Symbol.CHERRY: 5, Symbol.GRAPES: 4,
		Symbol.WATERMELON: 3, Symbol.BAR: 2, Symbol.SEVEN: 2,
		Symbol.SCATTER: 3, Symbol.WILD: 2
	},
	# 滾輪 3
	{
		Symbol.ORANGE: 9, Symbol.LEMON: 7, Symbol.PLUM: 6,
		Symbol.BANANA: 5, Symbol.CHERRY: 5, Symbol.GRAPES: 4,
		Symbol.WATERMELON: 3, Symbol.BAR: 2, Symbol.SEVEN: 2,
		Symbol.SCATTER: 3, Symbol.WILD: 1
	},
	# 滾輪 4
	{
		Symbol.ORANGE: 8, Symbol.LEMON: 7, Symbol.PLUM: 6,
		Symbol.BANANA: 5, Symbol.CHERRY: 5, Symbol.GRAPES: 4,
		Symbol.WATERMELON: 3, Symbol.BAR: 2, Symbol.SEVEN: 2,
		Symbol.SCATTER: 3, Symbol.WILD: 2
	},
	# 滾輪 5
	{
		Symbol.ORANGE: 8, Symbol.LEMON: 7, Symbol.PLUM: 6,
		Symbol.BANANA: 5, Symbol.CHERRY: 5, Symbol.GRAPES: 4,
		Symbol.WATERMELON: 3, Symbol.BAR: 2, Symbol.SEVEN: 2,
		Symbol.SCATTER: 3, Symbol.WILD: 2
	},
]

# ===== 投注設定 =====
const BET_LEVELS: Array = [0.05, 0.10, 0.25, 0.50, 1.00, 2.00, 5.00, 10.00]
const NUM_LINES: int = 20
const INITIAL_BALANCE: float = 1000.0

# ===== 遊戲速度 =====
const REEL_SPIN_SPEED: float = 2000.0      # 滾輪滾動速度（像素/秒）
const REEL_STOP_DELAY: float = 0.3         # 每軸停止間隔（秒）
const REEL_SPIN_MIN_TIME: float = 0.5      # 最短旋轉時間（秒）
const WIN_DISPLAY_TIME: float = 2.0        # 中獎展示時間（秒）

# ===== 工具函式 =====

## 根據權重隨機選取符號
func pick_symbol(reel_index: int) -> int:
	var weights: Dictionary = reel_weights[reel_index]
	var total_weight: int = 0
	for w in weights.values():
		total_weight += w

	var roll: int = randi() % total_weight
	var cumulative: int = 0
	for symbol_id in weights:
		cumulative += weights[symbol_id]
		if roll < cumulative:
			return symbol_id
	return Symbol.ORANGE

## 生成一次旋轉的結果（5x3 矩陣）
func generate_spin_result() -> Array:
	var result: Array = []
	for reel_idx in range(5):
		var reel_result: Array = []
		for _row in range(3):
			reel_result.append(pick_symbol(reel_idx))
		result.append(reel_result)
	return result

## 強制中獎結果（用於控制中獎率）
func generate_forced_result(force_win: bool) -> Array:
	if force_win:
		return _generate_winning_result()
	else:
		return _generate_losing_result()

func _generate_winning_result() -> Array:
	# 隨機選一條線和一個符號，保證至少 3 連
	var line_idx: int = randi() % NUM_LINES
	var line: Array = PAYLINES[line_idx]
	# 選一個中低價值符號（避免每次大獎）
	var win_symbol: int = randi() % 7  # 0~6 中低價值
	var match_count: int = 3 + (randi() % 2)  # 3或4連

	var result: Array = []
	for reel_idx in range(5):
		var reel_result: Array = []
		for row in range(3):
			if reel_idx < match_count and row == line[reel_idx]:
				reel_result.append(win_symbol)
			else:
				reel_result.append(pick_symbol(reel_idx))
		result.append(reel_result)
	return result

func _generate_losing_result() -> Array:
	# 生成結果並確保沒有 3 連以上
	for _attempt in range(100):
		var result: Array = generate_spin_result()
		var wins: Array = check_wins(result)
		var scatter_count: int = _count_scatters(result)
		if wins.is_empty() and scatter_count < 3:
			return result
	# 失敗的話就直接回傳隨機（極少見）
	return generate_spin_result()

## 計算中獎結果
func check_wins(grid: Array) -> Array:
	var wins: Array = []
	for line_idx in range(NUM_LINES):
		var line: Array = PAYLINES[line_idx]
		var symbols_on_line: Array = []
		for reel_idx in range(5):
			symbols_on_line.append(grid[reel_idx][line[reel_idx]])

		var win_info: Dictionary = _check_line_win(symbols_on_line, line_idx)
		if win_info.size() > 0:
			wins.append(win_info)
	return wins

func _check_line_win(symbols: Array, line_index: int) -> Dictionary:
	# 從左到右計算連線，Wild 可替代任何符號（Scatter 除外）
	var first_symbol: int = -1
	var match_count: int = 0

	for i in range(5):
		var sym: int = symbols[i]
		if sym == Symbol.SCATTER:
			break  # Scatter 不參與連線
		if first_symbol == -1:
			if sym == Symbol.WILD:
				first_symbol = Symbol.WILD
			else:
				first_symbol = sym
			match_count = 1
		elif sym == first_symbol or sym == Symbol.WILD:
			match_count += 1
			# 如果首個是 Wild，遇到非 Wild 就替換
			if first_symbol == Symbol.WILD and sym != Symbol.WILD:
				first_symbol = sym
		else:
			break

	if match_count >= 3 and first_symbol >= 0 and first_symbol != Symbol.SCATTER:
		var pay_key: int = first_symbol
		if pay_key == Symbol.WILD:
			pay_key = Symbol.WILD
		if PAYTABLE.has(pay_key):
			var pay_index: int = match_count - 3  # 0=3連, 1=4連, 2=5連
			if pay_index >= 0 and pay_index < PAYTABLE[pay_key].size():
				return {
					"line": line_index,
					"symbol": first_symbol,
					"count": match_count,
					"payout": PAYTABLE[pay_key][pay_index]
				}
	return {}

func _count_scatters(grid: Array) -> int:
	var count: int = 0
	for reel in grid:
		for sym in reel:
			if sym == Symbol.SCATTER:
				count += 1
	return count

## 檢查 Scatter 中獎
func check_scatter_win(grid: Array) -> Dictionary:
	var count: int = _count_scatters(grid)
	if count >= 3 and SCATTER_PAYS.has(count):
		return SCATTER_PAYS[count].duplicate()
	return {}

## 取得符號圖片路徑
func get_symbol_texture_path(symbol_id: int) -> String:
	return "res://assets/game_files/Symbols/%s.png" % SYMBOL_NAMES[symbol_id]

## 取得符號暗色圖片路徑
func get_symbol_dim_texture_path(symbol_id: int) -> String:
	return "res://assets/game_files/Symbols/%s_2.png" % SYMBOL_NAMES[symbol_id]
