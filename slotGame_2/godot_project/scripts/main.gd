extends Control
## 主場景 — Classic Sevens Slots 完整遊戲

const InfoPopup = preload("res://scripts/ui/info_popup.gd")
const HistoryPanel = preload("res://scripts/ui/history_panel.gd")
const WinEffect = preload("res://scripts/ui/win_effect.gd")
const GambleScene = preload("res://scripts/ui/gamble_scene.gd")

# ===== 滾輪視覺參數（根據素材實際尺寸計算）=====
const GAME_W: float = 1920.0
const GAME_H: float = 1080.0
const SYMBOL_W: float = 264.0
const SYMBOL_H: float = 264.0
const REEL_COLS: int = 5
const REEL_ROWS: int = 3
# 滾輪區域
const REEL_AREA_W: float = 1345.0
const REEL_AREA_H: float = 792.0  # 3 * 264
const REEL_AREA_X: float = 288.0
const REEL_AREA_Y: float = 105.0
const REEL_GAP_X: float = REEL_AREA_W / REEL_COLS  # 269

# ===== 節點引用 =====
var symbol_nodes: Array = []  # [reel_idx][row] = TextureRect
var line_sprites: Array = []
var background: TextureRect
var bg_frames_main: Array = []     # 主背景動畫幀
var bg_frames_free: Array = []     # 免費旋轉背景動畫幀
var bg_frame_index: int = 0
var bg_anim_timer: float = 0.0
const BG_ANIM_FPS: float = 12.0   # 背景動畫幀率
var balance_label: Label
var bet_label: Label
var win_label: Label
var free_spin_label: Label
var spin_button: TextureButton
var stop_button: TextureButton
var plus_button: TextureButton
var minus_button: TextureButton
var max_bet_button: TextureButton
var info_button: TextureButton
var settings_button: TextureButton
var overlay: ColorRect
var info_popup_node: Control
var history_panel_node: Control
var win_effect_node: Control
var gamble_button: TextureButton
var buy_coins_btn: TextureButton
var buy_coins_popup: Panel
var gamble_scene_node: Control
var last_win_amount: float = 0.0

# ===== Loading Screen 節點 =====
var loading_layer: Control
var loading_bar_fill: ColorRect
var loading_progress: float = 0.0
var loading_active: bool = true

# ===== 自訂字型 =====
var game_font: Font

# ===== 紋理快取 =====
var sym_tex: Dictionary = {}
var sym_dim_tex: Dictionary = {}

# ===== 遊戲狀態 =====
var current_grid: Array = []
var current_wins: Array = []
var reel_spin_flags: Array = [false, false, false, false, false]
var reels_still_spinning: int = 0
var showing_win_lines: bool = false
var win_cycle_idx: int = 0
var win_cycle_timer: float = 0.0

# ===== 初始化 =====

func _ready() -> void:
	# 載入自訂字型
	game_font = load("res://fonts/SaranaiGame-Bold.ttf")
	_cache_textures()
	_build_scene()
	_connect_signals()
	_refresh_ui()
	loading_active = false

func _cache_textures() -> void:
	# 符號紋理
	for i in range(11):
		var path: String = GameConfig.get_symbol_texture_path(i)
		if ResourceLoader.exists(path):
			sym_tex[i] = load(path)
		var dim: String = GameConfig.get_symbol_dim_texture_path(i)
		if ResourceLoader.exists(dim):
			sym_dim_tex[i] = load(dim)

	# 背景動畫幀（main: back_00000 ~ back_00033）
	for idx in range(34):
		var p: String = "res://assets/game_files/Backs/main/back_%05d.jpg" % idx
		if ResourceLoader.exists(p):
			bg_frames_main.append(load(p))
	# 免費旋轉背景動畫幀
	for idx in range(34):
		var p: String = "res://assets/game_files/Backs/free_games/back_free_game_%05d.jpg" % idx
		if ResourceLoader.exists(p):
			bg_frames_free.append(load(p))

# ---------- Loading Screen ----------

func _build_loading_screen() -> void:
	loading_layer = Control.new()
	loading_layer.name = "LoadingScreen"
	loading_layer.set_anchors_preset(PRESET_FULL_RECT)
	loading_layer.z_index = 100
	add_child(loading_layer)

	# 背景
	var bg := TextureRect.new()
	bg.texture = load("res://assets/game_files/Loading/loading_back.jpg")
	bg.set_anchors_preset(PRESET_FULL_RECT)
	bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	loading_layer.add_child(bg)

	# Logo 圖片
	var logo := TextureRect.new()
	logo.texture = load("res://assets/game_files/Loading/loading_logo.png")
	logo.position = Vector2(568, 180)
	logo.size = Vector2(783, 582)
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	loading_layer.add_child(logo)

	# "LOADING:" 文字圖片
	var loading_text := TextureRect.new()
	loading_text.texture = load("res://assets/game_files/Loading/loading_text.png")
	loading_text.position = Vector2(836, 750)
	loading_text.size = Vector2(248, 44)
	loading_text.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	loading_text.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	loading_layer.add_child(loading_text)

	# 進度條背景（框架）
	var bar_bg := TextureRect.new()
	bar_bg.texture = load("res://assets/game_files/Loading/loading_bar.png")
	bar_bg.position = Vector2(660, 810)
	bar_bg.size = Vector2(599, 44)
	bar_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	bar_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	loading_layer.add_child(bar_bg)

	# 進度條填充（模擬用 ColorRect）
	loading_bar_fill = ColorRect.new()
	loading_bar_fill.position = Vector2(665, 815)
	loading_bar_fill.size = Vector2(0, 34)  # 初始寬度 0
	loading_bar_fill.color = Color(0.95, 0.75, 0.1)
	loading_layer.add_child(loading_bar_fill)

func _set_game_visible(vis: bool) -> void:
	# 控制除了 loading_layer 以外的所有子節點可見性
	for child in get_children():
		if child != loading_layer:
			child.visible = vis

var game_container: Control  # 所有遊戲元素的容器，用於置中

func _build_scene() -> void:
	# 全螢幕背景（直接加到 self，填滿整個視窗）
	background = TextureRect.new()
	if bg_frames_main.size() > 0:
		background.texture = bg_frames_main[0]
	else:
		background.texture = load("res://assets/game_files/Backs/main_back.jpg")
	background.set_anchors_preset(PRESET_FULL_RECT)
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	add_child(background)

	# 遊戲容器（固定 1920x1080，動態置中）
	# 所有後續 add_child 都加到 self，build 完後統一搬到 container
	game_container = Control.new()
	game_container.name = "GameContainer"
	game_container.size = Vector2(GAME_W, GAME_H)
	game_container.clip_contents = false

	# 2) 滾輪區域（含裁切）
	_build_reels()

	# 3) 上方介面條
	_build_upper_bar()

	# 4) 下方介面條
	_build_bottom_bar()

	# 5) 連線圖層
	_build_paylines()

	# 6) Gamble 按鈕（中獎後出現）
	_build_gamble_button()

	# 7) 彈窗層
	_build_popups()

	# 8) 把所有子節點（除了 background）搬到 game_container
	var children_to_move: Array = []
	for child in get_children():
		if child != background and child != game_container:
			children_to_move.append(child)
	add_child(game_container)
	for child in children_to_move:
		remove_child(child)
		game_container.add_child(child)
	_center_game_container()

# ---------- 滾輪 ----------

func _build_reels() -> void:
	var clip := Control.new()
	clip.name = "ReelClip"
	clip.position = Vector2(REEL_AREA_X, REEL_AREA_Y)
	clip.size = Vector2(REEL_AREA_W, REEL_AREA_H)
	clip.clip_contents = true
	add_child(clip)

	symbol_nodes.clear()
	for col in range(REEL_COLS):
		var col_arr: Array = []
		for row in range(REEL_ROWS):
			var tr := TextureRect.new()
			tr.name = "Sym_%d_%d" % [col, row]
			var x: float = col * REEL_GAP_X + (REEL_GAP_X - SYMBOL_W) / 2.0
			var y: float = row * SYMBOL_H
			tr.position = Vector2(x, y)
			tr.custom_minimum_size = Vector2(SYMBOL_W, SYMBOL_H)
			tr.size = Vector2(SYMBOL_W, SYMBOL_H)
			tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			# 隨機初始符號
			tr.texture = sym_tex.get(GameConfig.pick_symbol(col), null)
			clip.add_child(tr)
			col_arr.append(tr)
		symbol_nodes.append(col_arr)

# ---------- 上方介面（精確對齊參考圖）----------

func _build_upper_bar() -> void:
	# 背景條
	var bar := TextureRect.new()
	bar.texture = load("res://assets/game_files/interface/interface/upper_back.png")
	bar.position = Vector2(0, 0)
	bar.size = Vector2(1920, 90)
	bar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	bar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(bar)

	# LOBBY 按鈕（左上角）
	var lobby_btn := _tex_btn("lobby_button", Vector2(15, 12), Vector2(155, 70))
	add_child(lobby_btn)

	# 金幣餘額背景條
	var coins_bg := TextureRect.new()
	coins_bg.texture = load("res://assets/game_files/interface/interface/coins_back.png")
	coins_bg.position = Vector2(185, 18)
	coins_bg.size = Vector2(340, 52)
	coins_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	coins_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(coins_bg)

	# 金幣圖示（在背景條左端）
	var ci := TextureRect.new()
	ci.texture = load("res://assets/game_files/interface/interface/coins_icon.png")
	ci.position = Vector2(185, 10)
	ci.size = Vector2(58, 58)
	ci.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	ci.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(ci)

	# 餘額數字（金幣右邊，在背景條內）
	balance_label = _make_label(Vector2(250, 20), Vector2(260, 48), 28, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	balance_label.add_theme_font_override("font", game_font)
	balance_label.clip_text = true
	add_child(balance_label)

	# BUY COINS 按鈕（頂部中央）
	buy_coins_btn = _tex_btn("buy_coins", Vector2(680, 5), Vector2(500, 80))
	add_child(buy_coins_btn)

	# 經驗值星星
	var star := TextureRect.new()
	if ResourceLoader.exists("res://assets/game_files/interface/experience_bar/experience_star.png"):
		star.texture = load("res://assets/game_files/interface/experience_bar/experience_star.png")
	star.position = Vector2(1220, 12)
	star.size = Vector2(60, 65)
	star.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	star.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(star)

	# 經驗值條背景
	var exp_bar := TextureRect.new()
	if ResourceLoader.exists("res://assets/game_files/interface/experience_bar/experience_bar.png"):
		exp_bar.texture = load("res://assets/game_files/interface/experience_bar/experience_bar.png")
	exp_bar.position = Vector2(1290, 18)
	exp_bar.size = Vector2(400, 50)
	exp_bar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	exp_bar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(exp_bar)

	# 100% 經驗值文字（條的右端）
	var exp_text := _make_label(Vector2(1650, 22), Vector2(60, 40), 20, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	exp_text.text = "100%"
	if game_font:
		exp_text.add_theme_font_override("font", game_font)
	add_child(exp_text)

	# Info 按鈕（右上角）
	info_button = _tex_btn("info_button", Vector2(1740, 12), Vector2(88, 68))
	add_child(info_button)

	# 設定按鈕
	settings_button = _tex_btn("settings_button", Vector2(1830, 12), Vector2(88, 68))
	add_child(settings_button)

	# 免費旋轉提示（位於 BUY COINS 下方，不重疊）
	free_spin_label = _make_label(Vector2(600, 88), Vector2(720, 20), 18, Color.YELLOW, HORIZONTAL_ALIGNMENT_CENTER)
	free_spin_label.add_theme_font_override("font", game_font)
	free_spin_label.visible = false
	add_child(free_spin_label)

# ---------- 下方介面（精確對齊參考圖：[-] [TOTAL BET] [+] [WIN] [MAX BET] [SPIN]）----------

func _build_bottom_bar() -> void:
	# 背景條
	var bar := TextureRect.new()
	bar.texture = load("res://assets/game_files/interface/interface/bottom_back.png")
	bar.position = Vector2(0, 897)
	bar.size = Vector2(1920, 183)
	bar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	bar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(bar)

	# [-] 按鈕（最左邊）
	minus_button = _tex_btn("minus_button", Vector2(20, 925), Vector2(100, 110))
	add_child(minus_button)

	# TOTAL BET 背景（素材已含 "TOTAL BET" 文字，不需額外 Label）
	var tb := TextureRect.new()
	tb.texture = load("res://assets/game_files/interface/interface/total_bet_back_01.png")
	tb.position = Vector2(135, 918)
	tb.size = Vector2(330, 120)
	tb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tb.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(tb)

	# 注金數字 — 在 TOTAL BET 框下半部居中
	bet_label = _make_label(Vector2(160, 970), Vector2(280, 50), 40, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	bet_label.add_theme_font_override("font", game_font)
	bet_label.clip_text = true
	add_child(bet_label)

	# [+] 按鈕
	plus_button = _tex_btn("plus_button", Vector2(475, 925), Vector2(100, 110))
	add_child(plus_button)

	# WIN 背景（素材已含 "WIN" 文字，不需額外 Label）
	var wb := TextureRect.new()
	wb.texture = load("res://assets/game_files/interface/interface/win_back_01.png")
	wb.position = Vector2(620, 915)
	wb.size = Vector2(520, 130)
	wb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	wb.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(wb)

	# WIN 數字 — 在 WIN 框下半部居中
	win_label = _make_label(Vector2(680, 972), Vector2(400, 50), 42, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	win_label.add_theme_font_override("font", game_font)
	win_label.clip_text = true
	add_child(win_label)

	# MAX BET 按鈕
	max_bet_button = _tex_btn("max_bet", Vector2(1190, 925), Vector2(160, 110))
	add_child(max_bet_button)

	# SPIN 按鈕（右側大按鈕）
	spin_button = _tex_btn("spin_button", Vector2(1420, 900), Vector2(470, 170))
	add_child(spin_button)

	# STOP 按鈕（初始隱藏，同位置同尺寸）
	stop_button = _tex_btn("stop_button", Vector2(1420, 900), Vector2(470, 170))
	stop_button.visible = false
	add_child(stop_button)

	# 免費旋轉底部標籤（左半：倍率徽章，右半：免費次數）
	_build_free_game_bottom_labels()

func _build_free_game_bottom_labels() -> void:
	# 免費旋轉倍率圖（free_game_multiplier_text.png）— 左半邊
	var mult_img := TextureRect.new()
	mult_img.name = "FreeMultImg"
	if ResourceLoader.exists("res://assets/game_files/interface/interface/free_game_multiplier_text.png"):
		mult_img.texture = load("res://assets/game_files/interface/interface/free_game_multiplier_text.png")
	mult_img.position = Vector2(50, 910)
	mult_img.size = Vector2(500, 130)
	mult_img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	mult_img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	mult_img.visible = false
	mult_img.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(mult_img)

	# 免費旋轉次數圖（free_spins_text.png）— 右半邊
	var spins_img := TextureRect.new()
	spins_img.name = "FreeSpinsImg"
	if ResourceLoader.exists("res://assets/game_files/interface/interface/free_spins_text.png"):
		spins_img.texture = load("res://assets/game_files/interface/interface/free_spins_text.png")
	spins_img.position = Vector2(1200, 910)
	spins_img.size = Vector2(400, 130)
	spins_img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	spins_img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	spins_img.visible = false
	spins_img.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(spins_img)

# ---------- Gamble 按鈕 ----------

func _build_gamble_button() -> void:
	gamble_button = TextureButton.new()
	gamble_button.name = "GambleButton"
	var base_path := "res://assets/game_files/interface/gamble/gamble_button/"
	if ResourceLoader.exists(base_path + "gamble_button_normal.png"):
		gamble_button.texture_normal = load(base_path + "gamble_button_normal.png")
	if ResourceLoader.exists(base_path + "gamble_button_hover.png"):
		gamble_button.texture_hover = load(base_path + "gamble_button_hover.png")
	if ResourceLoader.exists(base_path + "gamble_button_clicked.png"):
		gamble_button.texture_pressed = load(base_path + "gamble_button_clicked.png")
	# 置中 x，y=835，使用原始素材尺寸 610x109
	gamble_button.position = Vector2((GAME_W - 610.0) / 2.0, 835)
	gamble_button.size = Vector2(610, 60)
	gamble_button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	gamble_button.ignore_texture_size = true
	gamble_button.visible = false
	add_child(gamble_button)

# ---------- 連線圖層 ----------

func _build_paylines() -> void:
	for i in range(20):
		var ls := TextureRect.new()
		var path := "res://assets/game_files/Lines/Line%d.png" % (i + 1)
		if ResourceLoader.exists(path):
			ls.texture = load(path)
		ls.position = Vector2(REEL_AREA_X, REEL_AREA_Y)
		ls.size = Vector2(REEL_AREA_W, REEL_AREA_H)
		ls.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		ls.visible = false
		ls.mouse_filter = MOUSE_FILTER_IGNORE
		add_child(ls)
		line_sprites.append(ls)

# ---------- 彈窗 ----------

func _build_popups() -> void:
	overlay = ColorRect.new()
	overlay.name = "Overlay"
	overlay.set_anchors_preset(PRESET_FULL_RECT)
	overlay.color = Color(0, 0, 0, 0.75)
	overlay.visible = false
	overlay.mouse_filter = MOUSE_FILTER_STOP
	add_child(overlay)

	info_popup_node = Control.new()
	info_popup_node.set_script(InfoPopup)
	info_popup_node.name = "InfoPopup"
	info_popup_node.set_anchors_preset(PRESET_FULL_RECT)
	info_popup_node.visible = false
	add_child(info_popup_node)

	history_panel_node = Control.new()
	history_panel_node.set_script(HistoryPanel)
	history_panel_node.name = "HistoryPanel"
	history_panel_node.set_anchors_preset(PRESET_FULL_RECT)
	history_panel_node.visible = false
	add_child(history_panel_node)

	win_effect_node = Control.new()
	win_effect_node.set_script(WinEffect)
	win_effect_node.name = "WinEffect"
	win_effect_node.set_anchors_preset(PRESET_FULL_RECT)
	win_effect_node.mouse_filter = MOUSE_FILTER_IGNORE
	win_effect_node.visible = false
	add_child(win_effect_node)

	# Gamble 場景
	gamble_scene_node = Control.new()
	gamble_scene_node.set_script(GambleScene)
	gamble_scene_node.name = "GambleScene"
	gamble_scene_node.set_anchors_preset(PRESET_FULL_RECT)
	gamble_scene_node.mouse_filter = MOUSE_FILTER_IGNORE
	gamble_scene_node.visible = false
	add_child(gamble_scene_node)
	gamble_scene_node.gamble_finished.connect(_on_gamble_finished)

	# Buy Coins 彈窗
	_build_buy_coins_popup()

func _build_buy_coins_popup() -> void:
	buy_coins_popup = Panel.new()
	buy_coins_popup.position = Vector2(0, 0)
	buy_coins_popup.size = Vector2(1920, 1080)
	buy_coins_popup.visible = false
	# 透明背景的 Panel（只當容器用）
	var transparent_style := StyleBoxFlat.new()
	transparent_style.bg_color = Color(0, 0, 0, 0)
	buy_coins_popup.add_theme_stylebox_override("panel", transparent_style)
	add_child(buy_coins_popup)

	# 主背景圖片（置中）
	var bg_img := TextureRect.new()
	bg_img.texture = load("res://assets/game_files/Pop_Ups/buy_coins/buy_coins_back.png")
	bg_img.position = Vector2(35, 190)
	bg_img.size = Vector2(1849, 702)
	bg_img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bg_img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	buy_coins_popup.add_child(bg_img)

	# 標題文字圖片
	var title_img := TextureRect.new()
	title_img.texture = load("res://assets/game_files/Pop_Ups/buy_coins/buy_coins_text.png")
	title_img.position = Vector2(390, 210)
	title_img.size = Vector2(1139, 59)
	title_img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	title_img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	buy_coins_popup.add_child(title_img)

	# "YOU ALREADY HAVE" 提示 + 金幣圖示 + 餘額
	var already_lbl := _make_label(Vector2(600, 275), Vector2(220, 40), 22, Color.WHITE, HORIZONTAL_ALIGNMENT_RIGHT)
	already_lbl.text = "YOU ALREADY HAVE"
	if game_font:
		already_lbl.add_theme_font_override("font", game_font)
	buy_coins_popup.add_child(already_lbl)

	var coin_icon := TextureRect.new()
	coin_icon.texture = load("res://assets/game_files/Pop_Ups/buy_coins/coin_icon.png")
	coin_icon.position = Vector2(830, 275)
	coin_icon.size = Vector2(38, 38)
	coin_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	coin_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	buy_coins_popup.add_child(coin_icon)

	var balance_display := Label.new()
	balance_display.name = "BuyCoinsBalance"
	balance_display.position = Vector2(875, 275)
	balance_display.size = Vector2(200, 40)
	balance_display.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	balance_display.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	balance_display.add_theme_font_size_override("font_size", 26)
	balance_display.add_theme_color_override("font_color", Color(1.0, 0.9, 0.3))
	if game_font:
		balance_display.add_theme_font_override("font", game_font)
	balance_display.text = "%d" % int(GameState.balance)
	buy_coins_popup.add_child(balance_display)

	var coins_suffix := _make_label(Vector2(1060, 275), Vector2(120, 40), 22, Color.WHITE, HORIZONTAL_ALIGNMENT_LEFT)
	coins_suffix.text = "COINS"
	if game_font:
		coins_suffix.add_theme_font_override("font", game_font)
	buy_coins_popup.add_child(coins_suffix)

	# 6 張幣包卡片，水平排列
	var coin_amounts: Array = [2500, 5000, 11000, 27500, 56000, 110000]
	var card_w: float = 275.0
	var card_h: float = 440.0
	var total_cards_w: float = card_w * 6 + 12.0 * 5  # 6 張 + 5 個間距
	var cards_start_x: float = (1920.0 - total_cards_w) / 2.0
	var cards_y: float = 335.0
	var card_spacing: float = 12.0

	for i in range(6):
		var card := TextureButton.new()
		var card_path := "res://assets/game_files/Pop_Ups/buy_coins/buy_coins_back%02d.png" % (i + 1)
		if ResourceLoader.exists(card_path):
			card.texture_normal = load(card_path)
		card.position = Vector2(cards_start_x + i * (card_w + card_spacing), cards_y)
		card.size = Vector2(card_w, card_h)
		card.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
		card.ignore_texture_size = true
		var amount: int = coin_amounts[i]
		card.pressed.connect(func():
			SoundManager.play("coin")
			GameState.balance += amount
			balance_display.text = "%d" % int(GameState.balance)
			_refresh_ui()
			_close_popups()
		)
		buy_coins_popup.add_child(card)

		# 卡片上的金額文字
		var amount_lbl := Label.new()
		amount_lbl.position = Vector2(cards_start_x + i * (card_w + card_spacing), cards_y + card_h - 75)
		amount_lbl.size = Vector2(card_w, 50)
		amount_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		amount_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		amount_lbl.add_theme_font_size_override("font_size", 26)
		amount_lbl.add_theme_color_override("font_color", Color(1.0, 0.9, 0.3))
		amount_lbl.add_theme_constant_override("outline_size", 3)
		amount_lbl.add_theme_color_override("font_outline_color", Color(0.2, 0.1, 0.0))
		if game_font:
			amount_lbl.add_theme_font_override("font", game_font)
		amount_lbl.text = _format_number(amount) if amount >= 1000 else str(amount)
		buy_coins_popup.add_child(amount_lbl)

	# "POPULAR" 徽章在第 4 張卡片下方（index 3）
	var popular_badge := TextureRect.new()
	popular_badge.texture = load("res://assets/game_files/Pop_Ups/buy_coins/buy_coins_popular.png")
	var pop_x: float = cards_start_x + 3 * (card_w + card_spacing) + (card_w - 120) / 2.0
	popular_badge.position = Vector2(pop_x, cards_y + card_h + 5)
	popular_badge.size = Vector2(120, 35)
	popular_badge.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	popular_badge.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	buy_coins_popup.add_child(popular_badge)

	# "BEST PRICE" 徽章在第 6 張卡片下方（index 5）
	var best_badge := TextureRect.new()
	best_badge.texture = load("res://assets/game_files/Pop_Ups/buy_coins/buy_coins_best_price.png")
	var best_x: float = cards_start_x + 5 * (card_w + card_spacing) + (card_w - 120) / 2.0
	best_badge.position = Vector2(best_x, cards_y + card_h + 5)
	best_badge.size = Vector2(120, 35)
	best_badge.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	best_badge.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	buy_coins_popup.add_child(best_badge)

	# 關閉按鈕（右上角）
	var close_btn := TextureButton.new()
	close_btn.texture_normal = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_01.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/buy_coins/close_button_02.png"):
		close_btn.texture_hover = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_02.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/buy_coins/close_button_03.png"):
		close_btn.texture_pressed = load("res://assets/game_files/Pop_Ups/buy_coins/close_button_03.png")
	close_btn.position = Vector2(1820, 195)
	close_btn.size = Vector2(55, 55)
	close_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	close_btn.ignore_texture_size = true
	close_btn.pressed.connect(_close_popups)
	buy_coins_popup.add_child(close_btn)

func _format_number(n: int) -> String:
	var s: String = str(n)
	var result: String = ""
	var count: int = 0
	for i in range(s.length() - 1, -1, -1):
		result = s[i] + result
		count += 1
		if count % 3 == 0 and i > 0:
			result = "," + result
	return result

# ===== 信號連接 =====

func _connect_signals() -> void:
	spin_button.pressed.connect(_on_spin)
	stop_button.pressed.connect(_on_stop)
	plus_button.pressed.connect(func(): _change_bet(1))
	minus_button.pressed.connect(func(): _change_bet(-1))
	max_bet_button.pressed.connect(func():
		if not GameState.is_spinning:
			GameState.max_bet()
			_refresh_ui()
	)
	buy_coins_btn.pressed.connect(_on_buy_coins)
	info_button.pressed.connect(_on_info)
	settings_button.pressed.connect(_on_history)
	overlay.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed:
			_close_popups()
	)
	gamble_button.pressed.connect(_on_gamble)
	GameState.balance_changed.connect(func(v: float): balance_label.text = "%.2f" % v)
	GameState.bet_changed.connect(func(_v: float): bet_label.text = "%.2f" % GameState.total_bet)
	GameState.free_spins_started.connect(func(c: int, m: int):
		free_spin_label.visible = true
		free_spin_label.text = "FREE SPINS: %d (x%d)" % [c, m]
		# 顯示底部免費旋轉圖片
		var mult_node := get_node_or_null("FreeMultImg")
		var spins_node := get_node_or_null("FreeSpinsImg")
		if mult_node: mult_node.visible = true
		if spins_node: spins_node.visible = true
	)
	GameState.free_spins_updated.connect(func(r: int):
		free_spin_label.text = "FREE SPINS: %d (x%d)" % [r, GameState.free_spins_multiplier]
	)
	GameState.free_spins_ended.connect(func(tw: float):
		free_spin_label.visible = false
		# 隱藏底部免費旋轉圖片
		var mult_node := get_node_or_null("FreeMultImg")
		var spins_node := get_node_or_null("FreeSpinsImg")
		if mult_node: mult_node.visible = false
		if spins_node: spins_node.visible = false
		if tw > 0:
			win_effect_node.show_free_spin_total(tw)
	)

func _refresh_ui() -> void:
	balance_label.text = "%.2f" % GameState.balance
	bet_label.text = "%.2f" % GameState.total_bet
	win_label.text = ""

# ===== 每幀更新 =====

func _process(delta: float) -> void:
	# Loading Screen 進度條更新
	if loading_active:
		loading_progress += delta / 2.0  # 2 秒填滿
		if loading_progress >= 1.0:
			loading_progress = 1.0
		# 最大填充寬度 589（留邊距）
		loading_bar_fill.size.x = loading_progress * 589.0
		if loading_progress >= 1.0:
			_finish_loading()
		return  # loading 期間不更新遊戲邏輯

	# 背景動畫
	_update_bg_animation(delta)
	_center_game_container()

	# 滾輪旋轉動畫 + 停止計時（完全同步，不用 async）
	if GameState.is_spinning:
		reel_spin_elapsed += delta
		spin_anim_timer += delta

		# 每 ~55ms 切換一次旋轉中的符號圖
		if spin_anim_timer >= 0.055:
			spin_anim_timer -= 0.055
			for col in range(REEL_COLS):
				if not reel_landed[col]:
					for row in range(REEL_ROWS):
						var rid: int = GameConfig.pick_symbol(col)
						if sym_tex.has(rid):
							symbol_nodes[col][row].texture = sym_tex[rid]
						symbol_nodes[col][row].modulate = Color(0.6, 0.6, 0.6, 0.7)

		# 按時間停止每軸
		for col in range(REEL_COLS):
			if not reel_landed[col] and reel_spin_elapsed >= reel_stop_timers[col]:
				_land_reel(col)

	# 中獎連線輪播
	if showing_win_lines and current_wins.size() > 1:
		win_cycle_timer += delta
		if win_cycle_timer >= 1.5:
			win_cycle_timer = 0.0
			_hide_lines()
			win_cycle_idx = (win_cycle_idx + 1) % current_wins.size()
			_highlight_win(current_wins[win_cycle_idx])

func _finish_loading() -> void:
	loading_active = false
	# 淡出 loading 畫面
	var tw := create_tween()
	tw.tween_property(loading_layer, "modulate:a", 0.0, 0.5)
	tw.tween_callback(func():
		loading_layer.visible = false
		loading_layer.queue_free()
	)
	# 顯示主遊戲
	_set_game_visible(true)

func _center_game_container() -> void:
	if game_container:
		var vp_size: Vector2 = get_viewport().get_visible_rect().size
		var offset_x: float = (vp_size.x - GAME_W) / 2.0
		var offset_y: float = (vp_size.y - GAME_H) / 2.0
		game_container.position = Vector2(maxf(offset_x, 0), maxf(offset_y, 0))

func _update_bg_animation(delta: float) -> void:
	var frames: Array = bg_frames_free if GameState.is_free_spinning else bg_frames_main
	if frames.is_empty():
		return
	bg_anim_timer += delta
	if bg_anim_timer >= 1.0 / BG_ANIM_FPS:
		bg_anim_timer -= 1.0 / BG_ANIM_FPS
		bg_frame_index = (bg_frame_index + 1) % frames.size()
		background.texture = frames[bg_frame_index]

# ===== 旋轉核心 =====

func _on_spin() -> void:
	if GameState.is_spinning or not GameState.can_spin():
		return

	# 重置中獎狀態
	_hide_lines()
	showing_win_lines = false
	current_wins.clear()
	win_label.text = ""
	gamble_button.visible = false

	if not GameState.deduct_bet():
		return
	if GameState.is_free_spinning:
		GameState.use_free_spin()

	SoundManager.play("bet", -6.0)

	GameState.is_spinning = true
	spin_button.visible = false
	stop_button.visible = true
	_set_controls(false)

	# 生成結果（RTP 控制）
	# should_force_win 回傳: 1=強制贏, 0=自然隨機, -1=強制輸
	var force_result: int = GameState.should_force_win()
	if force_result == 1:
		current_grid = GameConfig.generate_forced_result(true)
	elif force_result == -1:
		current_grid = GameConfig.generate_forced_result(false)
	else:
		current_grid = GameConfig.generate_spin_result()

	# 啟動滾輪動畫（全部在 _process 中同步管理，不用 async）
	reels_still_spinning = REEL_COLS
	reel_landed = [false, false, false, false, false]
	reel_stop_timers = [0.6, 0.95, 1.3, 1.65, 2.0]
	reel_spin_elapsed = 0.0
	spin_anim_timer = 0.0
	SoundManager.play("spin_loop", -4.0)

# 追蹤哪些軸已經停了，避免重複呼叫
var reel_landed: Array = [false, false, false, false, false]
var reel_stop_timers: Array = [0.6, 0.95, 1.3, 1.65, 2.0]
var reel_spin_elapsed: float = 0.0
var spin_anim_timer: float = 0.0

func _land_reel(col: int) -> void:
	if reel_landed[col]:
		return
	reel_landed[col] = true

	# 停輪音效
	SoundManager.play("reel_stop", -4.0)

	# 放置最終符號
	for row in range(REEL_ROWS):
		var sid: int = current_grid[col][row]
		symbol_nodes[col][row].texture = sym_tex.get(sid, null)
		symbol_nodes[col][row].modulate = Color.WHITE

	# 彈跳動畫
	for row in range(REEL_ROWS):
		var node: TextureRect = symbol_nodes[col][row]
		var base_x: float = col * REEL_GAP_X + (REEL_GAP_X - SYMBOL_W) / 2.0
		var base_y: float = row * SYMBOL_H
		var tw := create_tween()
		tw.tween_property(node, "position", Vector2(base_x, base_y + 18), 0.07)
		tw.tween_property(node, "position", Vector2(base_x, base_y - 6), 0.06)
		tw.tween_property(node, "position", Vector2(base_x, base_y), 0.05)

	# 檢查是否全部都停了
	var all_done: bool = true
	for i in range(REEL_COLS):
		if not reel_landed[i]:
			all_done = false
			break
	if all_done:
		_evaluate_result()

func _on_stop() -> void:
	for col in range(REEL_COLS):
		_land_reel(col)

func _evaluate_result() -> void:
	GameState.is_spinning = false
	stop_button.visible = false
	spin_button.visible = true
	_set_controls(true)

	# 檢查連線中獎
	var wins: Array = GameConfig.check_wins(current_grid)
	var scatter: Dictionary = GameConfig.check_scatter_win(current_grid)
	var total_win: float = 0.0

	for w in wins:
		total_win += w["payout"] * GameState.line_bet

	if scatter.size() > 0:
		total_win += scatter.get("pay", 0) * GameState.line_bet
		var fc: int = scatter.get("free_spins", 0)
		if fc > 0:
			SoundManager.play("scatter")
			GameState.start_free_spins(fc, scatter.get("multiplier", 1))

	var did_win: bool = total_win > 0
	GameState.record_win(did_win)
	current_wins = wins

	if did_win:
		GameState.add_winnings(total_win)
		win_label.text = "%.2f" % total_win
		last_win_amount = total_win
		# Debug: 印出中獎詳情
		for w in wins:
			var sym_name: String = GameConfig.SYMBOL_DISPLAY_NAMES[w["symbol"]]
			print("WIN Line %d: %dx %s = %d" % [w["line"] + 1, w["count"], sym_name, w["payout"]])
		# 顯示 Gamble 按鈕（非免費旋轉模式下）
		if not GameState.is_free_spinning:
			gamble_button.visible = true
		if wins.size() > 0:
			showing_win_lines = true
			win_cycle_idx = 0
			win_cycle_timer = 0.0
			_highlight_win(wins[0])
		# 音效 + 彈窗：大獎 vs 普通中獎
		if total_win >= GameState.total_bet * 10:
			SoundManager.play("big_win")
			win_effect_node.show_big_win(total_win)
		elif total_win >= GameState.total_bet * 3:
			SoundManager.play("win")
			win_effect_node.show_normal_win(total_win)
		else:
			SoundManager.play("win")
			SoundManager.play("coin", -3.0)

	# 記錄注單
	BetHistory.add_record({
		"bet": GameState.line_bet,
		"total_bet": 0.0 if GameState.is_free_spinning else GameState.total_bet,
		"win": total_win,
		"grid": current_grid.duplicate(true),
		"win_lines": wins.duplicate(true),
		"is_free_spin": GameState.is_free_spinning,
		"balance_after": GameState.balance,
	})

	_refresh_ui()

	# 免費旋轉和 AutoPlay 都不自動旋轉，等玩家手動按 SPIN

# ===== Gamble 按鈕回調 =====

func _on_gamble() -> void:
	gamble_button.visible = false
	SoundManager.play("button_click", -6.0)
	# 取得目前中獎金額（從 win_label 解析）
	var win_text: String = win_label.text.strip_edges()
	var win_val: float = 0.0
	if win_text != "":
		win_val = win_text.to_float()
	if win_val <= 0:
		return
	# 先從餘額扣除中獎金額（進入賭博池）
	last_win_amount = win_val
	GameState.balance -= win_val
	_refresh_ui()
	gamble_scene_node.show_gamble(win_val)

func _on_gamble_finished(final_amount: float) -> void:
	# 賭博結束：把最終金額加回餘額
	if final_amount > 0:
		GameState.balance += final_amount
	last_win_amount = 0.0
	win_label.text = ""
	_refresh_ui()
	# 隱藏中獎連線
	_hide_lines()
	showing_win_lines = false

# ===== 中獎展示 =====

func _highlight_win(win_info: Dictionary) -> void:
	var line_idx: int = win_info["line"]
	var count: int = win_info["count"]
	var line: Array = GameConfig.PAYLINES[line_idx]

	# 顯示連線
	if line_idx >= 0 and line_idx < line_sprites.size():
		line_sprites[line_idx].visible = true

	# 先全部稍微暗化，再把中獎符號提亮
	for c in range(REEL_COLS):
		for r in range(REEL_ROWS):
			symbol_nodes[c][r].modulate = Color(0.5, 0.5, 0.5)
	# 中獎符號全亮 + 稍微放大效果
	for c in range(count):
		var r: int = line[c]
		symbol_nodes[c][r].modulate = Color(1.2, 1.2, 1.0)  # 略微過曝突顯

func _hide_lines() -> void:
	for ls in line_sprites:
		ls.visible = false
	for c in range(REEL_COLS):
		for r in range(REEL_ROWS):
			symbol_nodes[c][r].modulate = Color.WHITE

# ===== UI 操作 =====

func _change_bet(dir: int) -> void:
	if GameState.is_spinning:
		return
	SoundManager.play("button_click", -6.0)
	if dir > 0:
		GameState.increase_bet()
	else:
		GameState.decrease_bet()
	_refresh_ui()

func _on_buy_coins() -> void:
	if GameState.is_spinning:
		return
	SoundManager.play("button_click", -6.0)
	overlay.visible = true
	buy_coins_popup.visible = true

func _on_info() -> void:
	if GameState.is_spinning:
		return
	SoundManager.play("button_click", -6.0)
	overlay.visible = true
	info_popup_node.visible = true
	info_popup_node.show_page(0)

func _on_history() -> void:
	if GameState.is_spinning:
		return
	SoundManager.play("button_click", -6.0)
	overlay.visible = true
	history_panel_node.visible = true
	history_panel_node.refresh()

func _close_popups() -> void:
	overlay.visible = false
	info_popup_node.visible = false
	history_panel_node.visible = false
	buy_coins_popup.visible = false
	gamble_scene_node.visible = false

func _set_controls(on: bool) -> void:
	plus_button.disabled = not on
	minus_button.disabled = not on
	max_bet_button.disabled = not on
	info_button.disabled = not on
	settings_button.disabled = not on

func _input(event: InputEvent) -> void:
	if loading_active:
		return
	if event.is_action_pressed("spin"):
		if GameState.is_spinning:
			_on_stop()
		else:
			_on_spin()

# ===== 工具函式 =====

func _tex_btn(base_name: String, pos: Vector2, sz: Vector2) -> TextureButton:
	var btn := TextureButton.new()
	var dir := "res://assets/game_files/interface/buttons_interface/"
	for suffix in [["_01.png", "texture_normal"], ["_02.png", "texture_hover"], ["_03.png", "texture_pressed"]]:
		var p: String = dir + base_name + suffix[0]
		if ResourceLoader.exists(p):
			btn.set(suffix[1], load(p))
	btn.position = pos
	btn.size = sz
	btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	btn.ignore_texture_size = true
	return btn

func _make_label(pos: Vector2, sz: Vector2, font_sz: int, col: Color, align: int) -> Label:
	var lbl := Label.new()
	lbl.position = pos
	lbl.size = sz
	lbl.horizontal_alignment = align
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.add_theme_font_size_override("font_size", font_sz)
	lbl.add_theme_color_override("font_color", col)
	return lbl
