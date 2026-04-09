extends Node
## 全域遊戲狀態管理

signal balance_changed(new_balance: float)
signal bet_changed(new_bet: float)
signal win_amount_changed(amount: float)
signal free_spins_started(count: int, multiplier: int)
signal free_spins_updated(remaining: int)
signal free_spins_ended(total_win: float)

var balance: float = GameConfig.INITIAL_BALANCE:
	set(value):
		balance = value
		balance_changed.emit(balance)

var current_bet_index: int = 2  # 預設 BET_LEVELS[2] = 0.25
var line_bet: float:
	get:
		return GameConfig.BET_LEVELS[current_bet_index]

var total_bet: float:
	get:
		return line_bet * GameConfig.NUM_LINES

var is_spinning: bool = false
var is_auto_play: bool = false
var auto_play_remaining: int = 0

# 免費旋轉
var free_spins_remaining: int = 0
var free_spins_multiplier: int = 1
var free_spins_total_win: float = 0.0
var is_free_spinning: bool:
	get:
		return free_spins_remaining > 0

# 中獎率控制
var spin_counter: int = 0
var win_counter: int = 0
# 目標中獎頻率（每 N 次旋轉中有幾次中獎）
var target_win_frequency: float = 0.30  # 30% 中獎率
# 是否啟用強制控制
var force_rtp_control: bool = true

func _ready() -> void:
	balance = GameConfig.INITIAL_BALANCE

func increase_bet() -> void:
	if current_bet_index < GameConfig.BET_LEVELS.size() - 1:
		current_bet_index += 1
		bet_changed.emit(line_bet)

func decrease_bet() -> void:
	if current_bet_index > 0:
		current_bet_index -= 1
		bet_changed.emit(line_bet)

func max_bet() -> void:
	current_bet_index = GameConfig.BET_LEVELS.size() - 1
	bet_changed.emit(line_bet)

func can_spin() -> bool:
	if is_free_spinning:
		return true
	return balance >= total_bet and not is_spinning

func deduct_bet() -> bool:
	if is_free_spinning:
		return true
	if balance >= total_bet:
		balance -= total_bet
		return true
	return false

func add_winnings(amount: float) -> void:
	if is_free_spinning:
		amount *= free_spins_multiplier
		free_spins_total_win += amount
	balance += amount
	win_amount_changed.emit(amount)

func start_free_spins(count: int, multiplier: int) -> void:
	free_spins_remaining = count
	free_spins_multiplier = multiplier
	free_spins_total_win = 0.0
	free_spins_started.emit(count, multiplier)

func use_free_spin() -> void:
	if free_spins_remaining > 0:
		free_spins_remaining -= 1
		free_spins_updated.emit(free_spins_remaining)
		if free_spins_remaining == 0:
			free_spins_ended.emit(free_spins_total_win)
			free_spins_multiplier = 1

## 根據中獎率控制判斷這次該不該中獎
func should_force_win() -> bool:
	if not force_rtp_control:
		return false  # 不強制，使用自然結果

	spin_counter += 1
	var current_rate: float = 0.0
	if spin_counter > 0:
		current_rate = float(win_counter) / float(spin_counter)

	# 如果當前中獎率低於目標，增加中獎機率
	if current_rate < target_win_frequency - 0.05:
		return true
	# 如果當前中獎率高於目標，減少中獎機率
	elif current_rate > target_win_frequency + 0.05:
		return false

	# 在正常範圍內，使用自然結果
	return false

func record_win(did_win: bool) -> void:
	if did_win:
		win_counter += 1
