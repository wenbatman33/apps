extends Control
## 賭博迷你遊戲 — 翻牌比大小，贏則翻倍

signal gamble_finished(final_amount: float)

var game_font: Font
var overlay: ColorRect
var popup_container: Control
var gamble_bg: TextureRect
var gamble_texts: TextureRect

# 按鈕
var collect_btn: TextureButton
var double_btn: TextureButton
var close_btn: TextureButton

# 金額標籤
var bet_label: Label       # 當前賭注
var bank_label: Label      # 累積獎金
var double_to_label: Label # 翻倍後金額

# 卡片相關
var dealer_card_node: Control
var player_card_nodes: Array = []  # 4 張玩家可選卡片
var dealer_card_value: int = 0     # A=1, 2-10, J=11, Q=12, K=13
var player_cards: Array = []       # 4 張玩家卡片的值
var dealer_suit: int = 0
var player_suits: Array = []

# 遊戲狀態
var current_bet: float = 0.0       # 當前這回合的賭注
var banked_amount: float = 0.0     # 已累積的安全獎金
var is_picking: bool = false       # 玩家是否正在選牌
var round_active: bool = false     # 是否在賭博回合中

const CARD_W: float = 160.0
const CARD_H: float = 220.0
const SUITS: Array = ["H", "D", "C", "S"]  # 花色符號
const SUIT_SYMBOLS: Array = ["♥", "♦", "♣", "♠"]
const RANK_NAMES: Array = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	game_font = load("res://fonts/SaranaiGame-Bold.ttf")
	_build_ui()

func _build_ui() -> void:
	# 半透明暗色背景
	overlay = ColorRect.new()
	overlay.set_anchors_preset(PRESET_FULL_RECT)
	overlay.color = Color(0, 0, 0, 0.75)
	overlay.visible = false
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)

	# 彈窗容器
	popup_container = Control.new()
	popup_container.set_anchors_preset(PRESET_FULL_RECT)
	popup_container.visible = false
	add_child(popup_container)

	# 賭博背景圖（1621x1005）置中
	gamble_bg = TextureRect.new()
	gamble_bg.texture = load("res://assets/game_files/interface/gamble/gamble_back.png")
	gamble_bg.position = Vector2((1920 - 1621) / 2.0, (1080 - 1005) / 2.0)
	gamble_bg.size = Vector2(1621, 1005)
	gamble_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	gamble_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	popup_container.add_child(gamble_bg)

	# 文字覆蓋圖（含 GAMBLE、PICK A HIGHER CARD 等文字）
	gamble_texts = TextureRect.new()
	gamble_texts.texture = load("res://assets/game_files/interface/gamble/gamble_texts.png")
	gamble_texts.position = Vector2((1920 - 1621) / 2.0, (1080 - 1005) / 2.0)
	gamble_texts.size = Vector2(1621, 1005)
	gamble_texts.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	gamble_texts.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	gamble_texts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	popup_container.add_child(gamble_texts)

	# 莊家卡片位置（左側）
	var base_x: float = (1920 - 1621) / 2.0
	var base_y: float = (1080 - 1005) / 2.0
	dealer_card_node = _create_card(Vector2(base_x + 200, base_y + 300))
	popup_container.add_child(dealer_card_node)

	# 4 張玩家可選卡片（右側）
	player_card_nodes.clear()
	for i in range(4):
		var card := _create_card(Vector2(base_x + 600 + i * (CARD_W + 30), base_y + 300))
		card.gui_input.connect(_on_player_card_click.bind(i))
		popup_container.add_child(card)
		player_card_nodes.append(card)

	# BET 金額標籤
	bet_label = _make_gamble_label(Vector2(base_x + 250, base_y + 780), Vector2(200, 40), 32)
	popup_container.add_child(bet_label)

	# BANK 金額標籤
	bank_label = _make_gamble_label(Vector2(base_x + 650, base_y + 780), Vector2(200, 40), 32)
	popup_container.add_child(bank_label)

	# DOUBLE TO 金額標籤
	double_to_label = _make_gamble_label(Vector2(base_x + 1050, base_y + 780), Vector2(250, 40), 32)
	popup_container.add_child(double_to_label)

	# COLLECT 按鈕
	collect_btn = TextureButton.new()
	collect_btn.texture_normal = load("res://assets/game_files/interface/gamble/collect_button_normal.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/collect_button_hover.png"):
		collect_btn.texture_hover = load("res://assets/game_files/interface/gamble/collect_button_hover.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/collect_button_clicked.png"):
		collect_btn.texture_pressed = load("res://assets/game_files/interface/gamble/collect_button_clicked.png")
	collect_btn.position = Vector2(base_x + 200, base_y + 860)
	collect_btn.size = Vector2(446, 122)
	collect_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	collect_btn.ignore_texture_size = true
	collect_btn.pressed.connect(_on_collect)
	popup_container.add_child(collect_btn)

	# DOUBLE 按鈕
	double_btn = TextureButton.new()
	double_btn.texture_normal = load("res://assets/game_files/interface/gamble/double_button_normal.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/double_button_hover.png"):
		double_btn.texture_hover = load("res://assets/game_files/interface/gamble/double_button_hover.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/double_button_clicked.png"):
		double_btn.texture_pressed = load("res://assets/game_files/interface/gamble/double_button_clicked.png")
	double_btn.position = Vector2(base_x + 950, base_y + 860)
	double_btn.size = Vector2(446, 122)
	double_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	double_btn.ignore_texture_size = true
	double_btn.pressed.connect(_on_double)
	double_btn.visible = false  # 只在贏了之後才顯示
	popup_container.add_child(double_btn)

	# 關閉按鈕（右上角）
	close_btn = TextureButton.new()
	close_btn.texture_normal = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_01.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/buy_coins/close_button_02.png"):
		close_btn.texture_hover = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_02.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/buy_coins/close_button_03.png"):
		close_btn.texture_pressed = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_03.png")
	close_btn.position = Vector2(base_x + 1621 - 60, base_y + 5)
	close_btn.size = Vector2(55, 55)
	close_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	close_btn.ignore_texture_size = true
	close_btn.pressed.connect(_on_collect)  # 關閉等同收回獎金
	popup_container.add_child(close_btn)

# ===== 公開 API =====

func show_gamble(amount: float) -> void:
	current_bet = amount
	banked_amount = 0.0
	visible = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.visible = true
	popup_container.visible = true
	_start_round()

# ===== 遊戲邏輯 =====

func _start_round() -> void:
	round_active = true
	is_picking = true
	double_btn.visible = false
	collect_btn.visible = true

	# 更新金額顯示
	_update_labels()

	# 生成莊家卡片（隨機 1~13）
	dealer_card_value = randi_range(1, 13)
	dealer_suit = randi_range(0, 3)

	# 生成 4 張玩家卡片
	player_cards.clear()
	player_suits.clear()
	for i in range(4):
		player_cards.append(randi_range(1, 13))
		player_suits.append(randi_range(0, 3))

	# 顯示莊家卡片（正面朝上）
	_show_card_face(dealer_card_node, dealer_card_value, dealer_suit)

	# 玩家卡片背面朝上
	for i in range(4):
		_show_card_back(player_card_nodes[i])
		player_card_nodes[i].mouse_filter = Control.MOUSE_FILTER_STOP

func _on_player_card_click(event: InputEvent, card_index: int) -> void:
	if not (event is InputEventMouseButton and event.pressed):
		return
	if not is_picking:
		return

	is_picking = false

	# 翻開選中的卡片
	var player_value: int = player_cards[card_index]
	var player_suit: int = player_suits[card_index]
	_show_card_face(player_card_nodes[card_index], player_value, player_suit)

	# 禁用所有玩家卡片的點擊
	for node in player_card_nodes:
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# 判斷結果
	await get_tree().create_timer(0.8).timeout
	if not is_inside_tree():
		return

	if player_value > dealer_card_value:
		# 贏了！翻倍
		_on_win()
	else:
		# 輸了（等於或小於都算輸）
		_on_lose()

func _on_win() -> void:
	# 賭注翻倍成功
	current_bet *= 2.0
	_update_labels()

	# 顯示 DOUBLE 按鈕讓玩家選擇繼續或收回
	double_btn.visible = true
	collect_btn.visible = true

func _on_lose() -> void:
	# 失去當前賭注
	current_bet = 0.0
	_update_labels()
	round_active = false

	# 延遲後自動關閉
	await get_tree().create_timer(1.5).timeout
	if is_inside_tree():
		_close_gamble()

func _on_collect() -> void:
	# 收回獎金
	_close_gamble()

func _on_double() -> void:
	# 繼續翻倍：開始新回合
	_start_round()

func _close_gamble() -> void:
	overlay.visible = false
	popup_container.visible = false
	visible = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	round_active = false
	gamble_finished.emit(current_bet)

func _update_labels() -> void:
	bet_label.text = "%.2f" % current_bet
	bank_label.text = "%.2f" % banked_amount
	double_to_label.text = "%.2f" % (current_bet * 2.0)

# ===== 卡片繪製 =====

func _create_card(pos: Vector2) -> Control:
	var card := Control.new()
	card.position = pos
	card.size = Vector2(CARD_W, CARD_H)
	card.mouse_filter = Control.MOUSE_FILTER_STOP

	# 卡片背景（白色圓角矩形）
	var bg := ColorRect.new()
	bg.name = "CardBg"
	bg.position = Vector2.ZERO
	bg.size = Vector2(CARD_W, CARD_H)
	bg.color = Color(0.15, 0.1, 0.05)  # 暗棕色（牌背）
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(bg)

	# 花紋裝飾（牌背圖案）
	var pattern := ColorRect.new()
	pattern.name = "Pattern"
	pattern.position = Vector2(10, 10)
	pattern.size = Vector2(CARD_W - 20, CARD_H - 20)
	pattern.color = Color(0.35, 0.2, 0.1)  # 棕色花紋
	pattern.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(pattern)

	# 牌面數字（初始隱藏）
	var rank_label := Label.new()
	rank_label.name = "RankLabel"
	rank_label.position = Vector2(0, 20)
	rank_label.size = Vector2(CARD_W, 80)
	rank_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rank_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	rank_label.add_theme_font_size_override("font_size", 56)
	rank_label.add_theme_color_override("font_color", Color.BLACK)
	rank_label.add_theme_constant_override("outline_size", 2)
	rank_label.add_theme_color_override("font_outline_color", Color(0.3, 0.3, 0.3))
	if game_font:
		rank_label.add_theme_font_override("font", game_font)
	rank_label.visible = false
	rank_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(rank_label)

	# 花色符號
	var suit_label := Label.new()
	suit_label.name = "SuitLabel"
	suit_label.position = Vector2(0, 100)
	suit_label.size = Vector2(CARD_W, 80)
	suit_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	suit_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	suit_label.add_theme_font_size_override("font_size", 64)
	suit_label.visible = false
	suit_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(suit_label)

	return card

func _show_card_face(card: Control, value: int, suit: int) -> void:
	# 白色背景
	var bg: ColorRect = card.get_node("CardBg")
	bg.color = Color(0.95, 0.93, 0.88)

	# 隱藏花紋
	var pattern: ColorRect = card.get_node("Pattern")
	pattern.visible = false

	# 顯示數字
	var rank_label: Label = card.get_node("RankLabel")
	rank_label.text = RANK_NAMES[value]
	# 紅色花色（紅心、方塊）或黑色（梅花、黑桃）
	var is_red: bool = suit <= 1
	rank_label.add_theme_color_override("font_color", Color.RED if is_red else Color.BLACK)
	rank_label.visible = true

	# 顯示花色
	var suit_label: Label = card.get_node("SuitLabel")
	suit_label.text = SUIT_SYMBOLS[suit]
	suit_label.add_theme_color_override("font_color", Color.RED if is_red else Color.BLACK)
	suit_label.visible = true

func _show_card_back(card: Control) -> void:
	# 暗棕色背景
	var bg: ColorRect = card.get_node("CardBg")
	bg.color = Color(0.15, 0.1, 0.05)

	# 顯示花紋
	var pattern: ColorRect = card.get_node("Pattern")
	pattern.visible = true

	# 隱藏數字和花色
	var rank_label: Label = card.get_node("RankLabel")
	rank_label.visible = false
	var suit_label: Label = card.get_node("SuitLabel")
	suit_label.visible = false

# ===== 工具函式 =====

func _make_gamble_label(pos: Vector2, sz: Vector2, font_sz: int) -> Label:
	var lbl := Label.new()
	lbl.position = pos
	lbl.size = sz
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.add_theme_font_size_override("font_size", font_sz)
	lbl.add_theme_color_override("font_color", Color(1.0, 0.9, 0.3))
	lbl.add_theme_constant_override("outline_size", 3)
	lbl.add_theme_color_override("font_outline_color", Color(0.2, 0.1, 0.0))
	if game_font:
		lbl.add_theme_font_override("font", game_font)
	return lbl
