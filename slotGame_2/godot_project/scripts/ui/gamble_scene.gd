extends Control
## 賭博迷你遊戲 — 翻牌比大小，贏則翻倍

signal gamble_finished(final_amount: float)

var game_font: Font
var overlay: ColorRect
var popup_container: Control

# 按鈕
var collect_btn: TextureButton
var double_btn: TextureButton
var close_btn: TextureButton

# 金額標籤（只放數字，不放標題文字，因為 gamble_texts.png 已含標題）
var bet_label: Label
var bank_label: Label
var double_to_label: Label

# 卡片相關
var dealer_card_node: Control
var player_card_nodes: Array = []
var dealer_card_value: int = 0
var player_cards: Array = []
var dealer_suit: int = 0
var player_suits: Array = []

# 遊戲狀態
var current_bet: float = 0.0
var banked_amount: float = 0.0
var is_picking: bool = false
var round_active: bool = false

const CARD_W: float = 180.0
const CARD_H: float = 250.0
const SUIT_SYMBOLS: Array = ["♥", "♦", "♣", "♠"]
const RANK_NAMES: Array = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

# gamble_back.png 和 gamble_texts.png 的置中偏移
var gx: float  # base_x
var gy: float  # base_y

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	game_font = load("res://fonts/SaranaiGame-Bold.ttf")
	gx = (1920.0 - 1621.0) / 2.0  # ~149
	gy = (1080.0 - 1005.0) / 2.0  # ~37
	_build_ui()

func _build_ui() -> void:
	# 半透明暗色背景
	overlay = ColorRect.new()
	overlay.position = Vector2.ZERO
	overlay.size = Vector2(1920, 1080)
	overlay.color = Color(0, 0, 0, 0.75)
	overlay.visible = false
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)

	# 彈窗容器
	popup_container = Control.new()
	popup_container.position = Vector2.ZERO
	popup_container.size = Vector2(1920, 1080)
	popup_container.visible = false
	add_child(popup_container)

	# 賭博背景圖
	var bg := TextureRect.new()
	bg.texture = load("res://assets/game_files/interface/gamble/gamble_back.png")
	bg.position = Vector2(gx, gy)
	bg.size = Vector2(1621, 1005)
	bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	popup_container.add_child(bg)

	# 用程式碼建立標題文字（取代 gamble_texts.png 避免重疊）
	var title_lbl := Label.new()
	title_lbl.text = "GAMBLE"
	title_lbl.position = Vector2(gx, gy + 5)
	title_lbl.size = Vector2(1621, 60)
	title_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_lbl.add_theme_font_size_override("font_size", 48)
	title_lbl.add_theme_color_override("font_color", Color(0.25, 0.15, 0.05))
	if game_font:
		title_lbl.add_theme_font_override("font", game_font)
	title_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	popup_container.add_child(title_lbl)

	var pick_lbl := Label.new()
	pick_lbl.text = "PICK A HIGHER CARD"
	pick_lbl.position = Vector2(gx, gy + 640)
	pick_lbl.size = Vector2(1621, 50)
	pick_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pick_lbl.add_theme_font_size_override("font_size", 32)
	pick_lbl.add_theme_color_override("font_color", Color(1.0, 0.85, 0.4))
	if game_font:
		pick_lbl.add_theme_font_override("font", game_font)
	pick_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	popup_container.add_child(pick_lbl)

	# BET / BANK / DOUBLE TO 標題
	var headers: Array = [
		{"text": "BET", "x": 55, "w": 400},
		{"text": "BANK", "x": 470, "w": 440},
		{"text": "DOUBLE TO", "x": 960, "w": 520},
	]
	for h in headers:
		var lbl := Label.new()
		lbl.text = h["text"]
		lbl.position = Vector2(gx + h["x"], gy + 730)
		lbl.size = Vector2(h["w"], 40)
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.add_theme_font_size_override("font_size", 26)
		lbl.add_theme_color_override("font_color", Color(1.0, 0.85, 0.4))
		if game_font:
			lbl.add_theme_font_override("font", game_font)
		lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		popup_container.add_child(lbl)

	# --- 卡片區域 ---
	# 莊家卡片（左側）
	dealer_card_node = _create_card(Vector2(gx + 130, gy + 130))
	popup_container.add_child(dealer_card_node)

	# 4 張玩家卡片（右側）
	player_card_nodes.clear()
	for i in range(4):
		var card := _create_card(Vector2(gx + 460 + i * (CARD_W + 40), gy + 130))
		card.gui_input.connect(_on_player_card_click.bind(i))
		popup_container.add_child(card)
		player_card_nodes.append(card)

	# --- 金額標籤（只有數字，位置對齊 gamble_texts.png 的 BET/BANK/DOUBLE TO 下方）---
	# 金額數字放在標題下方（格子內）
	bet_label = _make_amount_label(Vector2(gx + 55, gy + 770), Vector2(400, 55))
	popup_container.add_child(bet_label)

	bank_label = _make_amount_label(Vector2(gx + 470, gy + 770), Vector2(440, 55))
	popup_container.add_child(bank_label)

	double_to_label = _make_amount_label(Vector2(gx + 960, gy + 770), Vector2(520, 55))
	popup_container.add_child(double_to_label)

	# --- COLLECT 按鈕 ---
	collect_btn = TextureButton.new()
	collect_btn.texture_normal = load("res://assets/game_files/interface/gamble/collect_button_normal.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/collect_button_hover.png"):
		collect_btn.texture_hover = load("res://assets/game_files/interface/gamble/collect_button_hover.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/collect_button_clicked.png"):
		collect_btn.texture_pressed = load("res://assets/game_files/interface/gamble/collect_button_clicked.png")
	collect_btn.position = Vector2(gx + 150, gy + 860)
	collect_btn.size = Vector2(446, 110)
	collect_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	collect_btn.ignore_texture_size = true
	collect_btn.pressed.connect(_on_collect)
	popup_container.add_child(collect_btn)

	# --- DOUBLE 按鈕 ---
	double_btn = TextureButton.new()
	double_btn.texture_normal = load("res://assets/game_files/interface/gamble/double_button_normal.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/double_button_hover.png"):
		double_btn.texture_hover = load("res://assets/game_files/interface/gamble/double_button_hover.png")
	if ResourceLoader.exists("res://assets/game_files/interface/gamble/double_button_clicked.png"):
		double_btn.texture_pressed = load("res://assets/game_files/interface/gamble/double_button_clicked.png")
	double_btn.position = Vector2(gx + 1000, gy + 860)
	double_btn.size = Vector2(446, 110)
	double_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	double_btn.ignore_texture_size = true
	double_btn.pressed.connect(_on_double)
	double_btn.visible = false
	popup_container.add_child(double_btn)

	# --- 關閉按鈕 ---
	close_btn = TextureButton.new()
	close_btn.texture_normal = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_01.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/buy_coins/close_button_02.png"):
		close_btn.texture_hover = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_02.png")
	close_btn.position = Vector2(gx + 1621 - 70, gy + 5)
	close_btn.size = Vector2(60, 60)
	close_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	close_btn.ignore_texture_size = true
	close_btn.pressed.connect(_on_collect)
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
	_update_labels()

	# 莊家卡片
	dealer_card_value = randi_range(1, 13)
	dealer_suit = randi_range(0, 3)

	# 4 張玩家卡片
	player_cards.clear()
	player_suits.clear()
	for i in range(4):
		player_cards.append(randi_range(1, 13))
		player_suits.append(randi_range(0, 3))

	# 莊家正面朝上
	_show_card_face(dealer_card_node, dealer_card_value, dealer_suit)

	# 玩家牌背朝上
	for i in range(4):
		_show_card_back(player_card_nodes[i])
		player_card_nodes[i].mouse_filter = Control.MOUSE_FILTER_STOP

func _on_player_card_click(event: InputEvent, card_index: int) -> void:
	if not (event is InputEventMouseButton and event.pressed):
		return
	if not is_picking:
		return
	is_picking = false

	# 翻開選中的牌
	_show_card_face(player_card_nodes[card_index], player_cards[card_index], player_suits[card_index])

	# 禁用所有玩家牌
	for node in player_card_nodes:
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# 判斷結果
	await get_tree().create_timer(0.8).timeout
	if not is_inside_tree():
		return

	if player_cards[card_index] > dealer_card_value:
		_on_win()
	else:
		_on_lose()

func _on_win() -> void:
	current_bet *= 2.0
	_update_labels()
	double_btn.visible = true
	collect_btn.visible = true

func _on_lose() -> void:
	current_bet = 0.0
	_update_labels()
	round_active = false
	await get_tree().create_timer(1.5).timeout
	if is_inside_tree():
		_close_gamble()

func _on_collect() -> void:
	_close_gamble()

func _on_double() -> void:
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

# ===== 卡片繪製（仿照撲克牌風格）=====

func _create_card(pos: Vector2) -> Control:
	var card := Control.new()
	card.position = pos
	card.size = Vector2(CARD_W, CARD_H)
	card.mouse_filter = Control.MOUSE_FILTER_STOP

	# 外框（深棕色邊框）
	var border := ColorRect.new()
	border.name = "Border"
	border.position = Vector2.ZERO
	border.size = Vector2(CARD_W, CARD_H)
	border.color = Color(0.3, 0.2, 0.1)
	border.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(border)

	# 卡片主體
	var bg := ColorRect.new()
	bg.name = "CardBg"
	bg.position = Vector2(4, 4)
	bg.size = Vector2(CARD_W - 8, CARD_H - 8)
	bg.color = Color(0.45, 0.3, 0.15)  # 牌背棕金色
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(bg)

	# 牌背寶石裝飾（模擬紅寶石菱形）
	var gem := Label.new()
	gem.name = "Gem"
	gem.position = Vector2(0, 60)
	gem.size = Vector2(CARD_W, 120)
	gem.text = "◆"
	gem.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	gem.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	gem.add_theme_font_size_override("font_size", 80)
	gem.add_theme_color_override("font_color", Color(0.8, 0.15, 0.1))
	gem.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(gem)

	# 牌面數字（初始隱藏）
	var rank_label := Label.new()
	rank_label.name = "RankLabel"
	rank_label.position = Vector2(10, 10)
	rank_label.size = Vector2(60, 50)
	rank_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	rank_label.add_theme_font_size_override("font_size", 42)
	if game_font:
		rank_label.add_theme_font_override("font", game_font)
	rank_label.visible = false
	rank_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(rank_label)

	# 中央大花色
	var suit_big := Label.new()
	suit_big.name = "SuitBig"
	suit_big.position = Vector2(0, 50)
	suit_big.size = Vector2(CARD_W, 140)
	suit_big.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	suit_big.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	suit_big.add_theme_font_size_override("font_size", 90)
	suit_big.visible = false
	suit_big.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(suit_big)

	# 左上小花色
	var suit_small := Label.new()
	suit_small.name = "SuitSmall"
	suit_small.position = Vector2(12, 45)
	suit_small.size = Vector2(40, 30)
	suit_small.add_theme_font_size_override("font_size", 24)
	suit_small.visible = false
	suit_small.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(suit_small)

	return card

func _show_card_face(card: Control, value: int, suit: int) -> void:
	var is_red: bool = suit <= 1
	var color: Color = Color(0.85, 0.1, 0.1) if is_red else Color(0.1, 0.1, 0.1)

	# 白色背景
	card.get_node("CardBg").color = Color(0.98, 0.96, 0.92)
	# 隱藏寶石
	card.get_node("Gem").visible = false

	# 數字
	var rank_label: Label = card.get_node("RankLabel")
	rank_label.text = RANK_NAMES[value]
	rank_label.add_theme_color_override("font_color", color)
	rank_label.visible = true

	# 大花色
	var suit_big: Label = card.get_node("SuitBig")
	suit_big.text = SUIT_SYMBOLS[suit]
	suit_big.add_theme_color_override("font_color", color)
	suit_big.visible = true

	# 小花色
	var suit_small: Label = card.get_node("SuitSmall")
	suit_small.text = SUIT_SYMBOLS[suit]
	suit_small.add_theme_color_override("font_color", color)
	suit_small.visible = true

func _show_card_back(card: Control) -> void:
	card.get_node("CardBg").color = Color(0.45, 0.3, 0.15)
	card.get_node("Gem").visible = true
	card.get_node("RankLabel").visible = false
	card.get_node("SuitBig").visible = false
	card.get_node("SuitSmall").visible = false

# ===== 工具函式 =====

func _make_amount_label(pos: Vector2, sz: Vector2) -> Label:
	var lbl := Label.new()
	lbl.position = pos
	lbl.size = sz
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.add_theme_font_size_override("font_size", 36)
	lbl.add_theme_color_override("font_color", Color.WHITE)
	lbl.add_theme_constant_override("outline_size", 3)
	lbl.add_theme_color_override("font_outline_color", Color(0.15, 0.08, 0.0))
	if game_font:
		lbl.add_theme_font_override("font", game_font)
	return lbl
