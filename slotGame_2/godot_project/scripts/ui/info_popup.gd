extends Control
## 規則燈箱 — 顯示連線規則、符號賠率、免費遊戲說明

var current_page: int = 0
const TOTAL_PAGES: int = 4

var page_container: Control
var page_images: Array = []
var close_button: TextureButton
var left_arrow: TextureButton
var right_arrow: TextureButton
var page_label: Label

# Info 頁面圖片路徑
const PAGE_PATHS: Array = [
	["res://assets/game_files/Info/info_1_01.png", "res://assets/game_files/Info/info_1_02.png"],
	["res://assets/game_files/Info/info_2_01.png", "res://assets/game_files/Info/info_2_02.png"],
	["res://assets/game_files/Info/info_3_01.png", "res://assets/game_files/Info/info_3_02.png"],
	["res://assets/game_files/Info/info_4_01.png", "res://assets/game_files/Info/info_4_02.png"],
]

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	# 背景（1920x1080 全畫面）
	var bg := TextureRect.new()
	if ResourceLoader.exists("res://assets/game_files/Info/info_back.png"):
		bg.texture = load("res://assets/game_files/Info/info_back.png")
	bg.position = Vector2(0, 0)
	bg.size = Vector2(1920, 1080)
	bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(bg)

	# 頁面容器
	page_container = Control.new()
	page_container.name = "PageContainer"
	page_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(page_container)

	# 預載所有頁面圖片（1920x1080 全畫面）
	for page_idx in range(TOTAL_PAGES):
		var page_textures: Array = []
		for img_path in PAGE_PATHS[page_idx]:
			var tex_rect := TextureRect.new()
			if ResourceLoader.exists(img_path):
				tex_rect.texture = load(img_path)
			tex_rect.position = Vector2(0, 0)
			tex_rect.size = Vector2(1920, 1080)
			tex_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			tex_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tex_rect.visible = false
			tex_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
			page_container.add_child(tex_rect)
			page_textures.append(tex_rect)
		page_images.append(page_textures)

	# 關閉按鈕（右上角，確保可見可點擊）
	close_button = TextureButton.new()
	if ResourceLoader.exists("res://assets/game_files/Info/buttons/close_button_01.png"):
		close_button.texture_normal = load("res://assets/game_files/Info/buttons/close_button_01.png")
	if ResourceLoader.exists("res://assets/game_files/Info/buttons/close_button_02.png"):
		close_button.texture_hover = load("res://assets/game_files/Info/buttons/close_button_02.png")
	if ResourceLoader.exists("res://assets/game_files/Info/buttons/close_button_03.png"):
		close_button.texture_pressed = load("res://assets/game_files/Info/buttons/close_button_03.png")
	close_button.position = Vector2(1810, 15)
	close_button.size = Vector2(85, 85)
	close_button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	close_button.ignore_texture_size = true
	close_button.z_index = 10  # 確保在最上層可點擊
	close_button.pressed.connect(_on_close)
	add_child(close_button)

	# 左箭頭
	left_arrow = TextureButton.new()
	if ResourceLoader.exists("res://assets/game_files/Info/buttons/info_arrow_01.png"):
		left_arrow.texture_normal = load("res://assets/game_files/Info/buttons/info_arrow_01.png")
	if ResourceLoader.exists("res://assets/game_files/Info/buttons/info_arrow_02.png"):
		left_arrow.texture_hover = load("res://assets/game_files/Info/buttons/info_arrow_02.png")
	left_arrow.position = Vector2(20, 450)
	left_arrow.size = Vector2(80, 100)
	left_arrow.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	left_arrow.ignore_texture_size = true
	left_arrow.pressed.connect(_on_prev_page)
	add_child(left_arrow)

	# 右箭頭
	right_arrow = TextureButton.new()
	if ResourceLoader.exists("res://assets/game_files/Info/buttons/info_arrow_05.png"):
		right_arrow.texture_normal = load("res://assets/game_files/Info/buttons/info_arrow_05.png")
	if ResourceLoader.exists("res://assets/game_files/Info/buttons/info_arrow_06.png"):
		right_arrow.texture_hover = load("res://assets/game_files/Info/buttons/info_arrow_06.png")
	right_arrow.position = Vector2(1820, 450)
	right_arrow.size = Vector2(80, 100)
	right_arrow.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	right_arrow.ignore_texture_size = true
	right_arrow.pressed.connect(_on_next_page)
	add_child(right_arrow)

	# 頁碼標籤
	page_label = Label.new()
	page_label.position = Vector2(860, 1020)
	page_label.size = Vector2(200, 40)
	page_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	page_label.add_theme_font_size_override("font_size", 24)
	page_label.add_theme_color_override("font_color", Color.WHITE)
	add_child(page_label)

func show_page(page: int) -> void:
	current_page = clampi(page, 0, TOTAL_PAGES - 1)
	# 隱藏所有頁面
	for page_tex_array in page_images:
		for tex in page_tex_array:
			tex.visible = false
	# 顯示當前頁面
	if current_page < page_images.size():
		for tex in page_images[current_page]:
			tex.visible = true

	page_label.text = "%d / %d" % [current_page + 1, TOTAL_PAGES]
	left_arrow.visible = current_page > 0
	right_arrow.visible = current_page < TOTAL_PAGES - 1

func _on_next_page() -> void:
	show_page(current_page + 1)

func _on_prev_page() -> void:
	show_page(current_page - 1)

func _on_close() -> void:
	visible = false
	var parent := get_parent()
	if parent and parent.has_method("_close_all_popups"):
		parent._close_all_popups()
