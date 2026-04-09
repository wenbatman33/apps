extends Control
## 主場景 — Classic Sevens Slots 完整遊戲

const InfoPopup = preload("res://scripts/ui/info_popup.gd")
const HistoryPanel = preload("res://scripts/ui/history_panel.gd")
const WinEffect = preload("res://scripts/ui/win_effect.gd")

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

func _build_scene() -> void:
	# 1) 動畫背景
	background = TextureRect.new()
	if bg_frames_main.size() > 0:
		background.texture = bg_frames_main[0]
	else:
		background.texture = load("res://assets/game_files/Backs/main_back.jpg")
	background.set_anchors_preset(PRESET_FULL_RECT)
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	add_child(background)

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
	bar.size = Vector2(1920, 122)
	bar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	add_child(bar)

	# LOBBY 按鈕（左上角）
	var lobby_btn := _tex_btn("lobby_button", Vector2(15, 15), Vector2(155, 70))
	add_child(lobby_btn)

	# 金幣餘額背景條
	var coins_bg := TextureRect.new()
	coins_bg.texture = load("res://assets/game_files/interface/interface/coins_back.png")
	coins_bg.position = Vector2(175, 22)
	coins_bg.size = Vector2(340, 48)
	coins_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	coins_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(coins_bg)

	# 金幣圖示（在背景條左端）
	var ci := TextureRect.new()
	ci.texture = load("res://assets/game_files/interface/interface/coins_icon.png")
	ci.position = Vector2(175, 12)
	ci.size = Vector2(55, 55)
	ci.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	ci.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(ci)

	# 餘額數字（在背景條內，金幣右邊）
	balance_label = _make_label(Vector2(240, 25), Vector2(250, 40), 28, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	balance_label.add_theme_font_override("font", game_font)
	add_child(balance_label)

	# BUY COINS 按鈕（頂部中央）
	buy_coins_btn = _tex_btn("buy_coins", Vector2(680, 5), Vector2(500, 80))
	add_child(buy_coins_btn)

	# 經驗值星星
	var star := TextureRect.new()
	if ResourceLoader.exists("res://assets/game_files/interface/experience_bar/experience_star.png"):
		star.texture = load("res://assets/game_files/interface/experience_bar/experience_star.png")
	star.position = Vector2(1250, 10)
	star.size = Vector2(65, 70)
	star.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	star.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(star)

	# 經驗值條背景
	var exp_bar := TextureRect.new()
	if ResourceLoader.exists("res://assets/game_files/interface/experience_bar/experience_bar.png"):
		exp_bar.texture = load("res://assets/game_files/interface/experience_bar/experience_bar.png")
	exp_bar.position = Vector2(1320, 20)
	exp_bar.size = Vector2(380, 50)
	exp_bar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	exp_bar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(exp_bar)

	# Info 按鈕（右上角）
	info_button = _tex_btn("info_button", Vector2(1755, 12), Vector2(70, 72))
	add_child(info_button)

	# 設定（注單記錄）按鈕
	settings_button = _tex_btn("settings_button", Vector2(1840, 12), Vector2(80, 72))
	add_child(settings_button)

	# 免費旋轉提示（覆蓋在 BUY COINS 位置上）
	free_spin_label = _make_label(Vector2(600, 35), Vector2(720, 50), 34, Color.YELLOW, HORIZONTAL_ALIGNMENT_CENTER)
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
	add_child(bar)

	# [-] 按鈕（最左邊）
	minus_button = _tex_btn("minus_button", Vector2(20, 920), Vector2(100, 120))
	add_child(minus_button)

	# TOTAL BET 背景（素材已含 "TOTAL BET" 文字）
	var tb := TextureRect.new()
	tb.texture = load("res://assets/game_files/interface/interface/total_bet_back_01.png")
	tb.position = Vector2(130, 910)
	tb.size = Vector2(320, 135)
	tb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tb.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(tb)

	# 注金數字 — 放在框的下半部
	bet_label = _make_label(Vector2(145, 975), Vector2(290, 55), 42, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	bet_label.add_theme_font_override("font", game_font)
	add_child(bet_label)

	# [+] 按鈕
	plus_button = _tex_btn("plus_button", Vector2(460, 920), Vector2(100, 120))
	add_child(plus_button)

	# WIN 背景（素材已含 "WIN" 文字）
	var wb := TextureRect.new()
	wb.texture = load("res://assets/game_files/interface/interface/win_back_01.png")
	wb.position = Vector2(610, 905)
	wb.size = Vector2(500, 145)
	wb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	wb.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(wb)

	# WIN 數字 — 放在框的下半部
	win_label = _make_label(Vector2(680, 975), Vector2(340, 55), 48, Color.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	win_label.add_theme_font_override("font", game_font)
	add_child(win_label)

	# MAX BET 按鈕
	max_bet_button = _tex_btn("max_bet", Vector2(1170, 920), Vector2(155, 120))
	add_child(max_bet_button)

	# SPIN 按鈕（右側）
	spin_button = _tex_btn("spin_button", Vector2(1420, 900), Vector2(470, 175))
	add_child(spin_button)

	# STOP 按鈕（初始隱藏，同位置）
	stop_button = _tex_btn("stop_button", Vector2(1420, 900), Vector2(470, 175))
	stop_button.visible = false
	add_child(stop_button)

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
	# 置中 x，y=830，尺寸 500x80
	gamble_button.position = Vector2((GAME_W - 500.0) / 2.0, 830)
	gamble_button.size = Vector2(500, 80)
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

	# Buy Coins 彈窗
	_build_buy_coins_popup()

func _build_buy_coins_popup() -> void:
	buy_coins_popup = Panel.new()
	buy_coins_popup.position = Vector2(510, 250)
	buy_coins_popup.size = Vector2(900, 550)
	buy_coins_popup.visible = false
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.08, 0.18, 0.95)
	style.border_color = Color(0.85, 0.65, 0.2)
	style.set_border_width_all(4)
	style.set_corner_radius_all(20)
	buy_coins_popup.add_theme_stylebox_override("panel", style)
	add_child(buy_coins_popup)

	# 標題
	var title := Label.new()
	title.text = "BUY COINS"
	title.position = Vector2(280, 20)
	title.size = Vector2(340, 60)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 42)
	title.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	if game_font:
		title.add_theme_font_override("font", game_font)
	buy_coins_popup.add_child(title)

	# 加幣選項按鈕
	var coin_options: Array = [
		{"amount": 500, "label": "500 COINS", "color": Color(0.3, 0.7, 0.3)},
		{"amount": 2000, "label": "2,000 COINS", "color": Color(0.3, 0.5, 0.9)},
		{"amount": 5000, "label": "5,000 COINS", "color": Color(0.8, 0.4, 0.9)},
		{"amount": 20000, "label": "20,000 COINS", "color": Color(1.0, 0.7, 0.2)},
	]

	for i in range(coin_options.size()):
		var opt: Dictionary = coin_options[i]
		var btn := Button.new()
		btn.text = opt["label"]
		btn.position = Vector2(100, 110 + i * 100)
		btn.size = Vector2(700, 80)
		btn.add_theme_font_size_override("font_size", 32)
		if game_font:
			btn.add_theme_font_override("font", game_font)
		var btn_style := StyleBoxFlat.new()
		btn_style.bg_color = opt["color"]
		btn_style.set_corner_radius_all(12)
		btn.add_theme_stylebox_override("normal", btn_style)
		var hover_style := StyleBoxFlat.new()
		hover_style.bg_color = opt["color"].lightened(0.2)
		hover_style.set_corner_radius_all(12)
		btn.add_theme_stylebox_override("hover", hover_style)
		var amount: int = opt["amount"]
		btn.pressed.connect(func():
			SoundManager.play("coin")
			GameState.balance += amount
			_refresh_ui()
			_close_popups()
		)
		buy_coins_popup.add_child(btn)

	# 關閉按鈕
	var close_btn := Button.new()
	close_btn.text = "X"
	close_btn.position = Vector2(830, 15)
	close_btn.size = Vector2(55, 55)
	close_btn.add_theme_font_size_override("font_size", 28)
	close_btn.pressed.connect(_close_popups)
	buy_coins_popup.add_child(close_btn)

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
	)
	GameState.free_spins_updated.connect(func(r: int):
		free_spin_label.text = "FREE SPINS: %d (x%d)" % [r, GameState.free_spins_multiplier]
	)
	GameState.free_spins_ended.connect(func(tw: float):
		free_spin_label.visible = false
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
	var force: bool = GameState.should_force_win()
	if GameState.force_rtp_control and GameState.spin_counter > 10:
		current_grid = GameConfig.generate_forced_result(force)
	else:
		current_grid = GameConfig.generate_spin_result()

	# 啟動滾輪動畫
	reels_still_spinning = REEL_COLS
	# 播放旋轉持續音效
	SoundManager.play("spin_loop", -4.0)
	for col in range(REEL_COLS):
		reel_spin_flags[col] = true
		_run_spin_anim(col)
		# 排程停止（每軸延遲遞增）
		var delay: float = 0.6 + col * 0.35
		get_tree().create_timer(delay).timeout.connect(_land_reel.bind(col))

func _run_spin_anim(col: int) -> void:
	## 模擬滾動：快速隨機切換符號圖片 + 機械齒輪聲
	var tick_count: int = 0
	while reel_spin_flags[col]:
		for row in range(REEL_ROWS):
			var rid: int = GameConfig.pick_symbol(col)
			symbol_nodes[col][row].texture = sym_tex.get(rid, null)
			symbol_nodes[col][row].modulate = Color(0.6, 0.6, 0.6, 0.7)
		# 每軸獨立的機械咔嗒聲（降低頻率避免太密集）
		tick_count += 1
		if tick_count % 4 == 0:
			SoundManager.play("reel_tick", -14.0)
		await get_tree().create_timer(0.055).timeout
		if not is_inside_tree():
			return

func _land_reel(col: int) -> void:
	reel_spin_flags[col] = false
	await get_tree().create_timer(0.04).timeout

	# 停輪音效
	SoundManager.play("reel_stop", -4.0)

	# 放置最終符號
	for row in range(REEL_ROWS):
		var sid: int = current_grid[col][row]
		symbol_nodes[col][row].texture = sym_tex.get(sid, null)
		symbol_nodes[col][row].modulate = Color.WHITE

	# 彈跳
	for row in range(REEL_ROWS):
		var node: TextureRect = symbol_nodes[col][row]
		var base_x: float = col * REEL_GAP_X + (REEL_GAP_X - SYMBOL_W) / 2.0
		var base_y: float = row * SYMBOL_H
		var tw := create_tween()
		tw.tween_property(node, "position", Vector2(base_x, base_y + 18), 0.07)
		tw.tween_property(node, "position", Vector2(base_x, base_y - 6), 0.06)
		tw.tween_property(node, "position", Vector2(base_x, base_y), 0.05)

	reels_still_spinning -= 1
	if reels_still_spinning <= 0:
		_evaluate_result()

func _on_stop() -> void:
	# 快速停止
	for col in range(REEL_COLS):
		reel_spin_flags[col] = false

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
		# 顯示 Gamble 按鈕（非免費旋轉模式下）
		if not GameState.is_free_spinning:
			gamble_button.visible = true
		if wins.size() > 0:
			showing_win_lines = true
			win_cycle_idx = 0
			win_cycle_timer = 0.0
			_highlight_win(wins[0])
		# 音效：大獎 vs 一般中獎
		if total_win >= GameState.total_bet * 10:
			SoundManager.play("big_win")
			win_effect_node.show_big_win(total_win)
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

	# 自動繼續（免費旋轉 / AutoPlay）
	if GameState.is_free_spinning:
		await get_tree().create_timer(1.5).timeout
		if is_inside_tree():
			_on_spin()
	elif GameState.is_auto_play and GameState.auto_play_remaining > 0:
		GameState.auto_play_remaining -= 1
		await get_tree().create_timer(1.0).timeout
		if GameState.is_auto_play and is_inside_tree():
			_on_spin()

# ===== Gamble 按鈕回調 =====

func _on_gamble() -> void:
	# 目前僅隱藏按鈕（未來可接入 Gamble 場景）
	gamble_button.visible = false
	SoundManager.play("button_click", -6.0)

# ===== 中獎展示 =====

func _highlight_win(win_info: Dictionary) -> void:
	var line_idx: int = win_info["line"]
	var count: int = win_info["count"]
	var line: Array = GameConfig.PAYLINES[line_idx]

	# 顯示連線
	if line_idx >= 0 and line_idx < line_sprites.size():
		line_sprites[line_idx].visible = true

	# 高亮中獎符號，暗化其餘
	for c in range(REEL_COLS):
		for r in range(REEL_ROWS):
			if c < count and r == line[c]:
				symbol_nodes[c][r].modulate = Color.WHITE
			else:
				symbol_nodes[c][r].modulate = Color(0.35, 0.35, 0.35)

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
