extends Control
## 中獎特效 — 支援大獎 (big_win) 和一般中獎 (you_win_coins) 兩種彈窗

var overlay: ColorRect
var popup_container: Control
var win_image: TextureRect       # 主圖（big_win 或 you_win_coins）
var win_amount_label: Label
var coin_icon: TextureRect       # 金額旁的金幣圖示
var collect_btn: TextureButton
var share_btn: TextureButton
var anim_tween: Tween
var game_font: Font

# 預載兩種素材
var tex_big_win: Texture2D
var tex_you_win: Texture2D

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	game_font = load("res://fonts/SaranaiGame-Bold.ttf")
	_preload_textures()
	_build_ui()

func _preload_textures() -> void:
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/big_win/big_win.png"):
		tex_big_win = load("res://assets/game_files/Pop_Ups/big_win/big_win.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/you_win_coins/you_win_coins.png"):
		tex_you_win = load("res://assets/game_files/Pop_Ups/you_win_coins/you_win_coins.png")

func _build_ui() -> void:
	# 半透明暗色背景
	overlay = ColorRect.new()
	overlay.set_anchors_preset(PRESET_FULL_RECT)
	overlay.color = Color(0, 0, 0, 0.7)
	overlay.visible = false
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)

	# 彈窗容器（用於整體縮放動畫）
	popup_container = Control.new()
	popup_container.set_anchors_preset(PRESET_FULL_RECT)
	popup_container.visible = false
	popup_container.pivot_offset = Vector2(960, 540)
	add_child(popup_container)

	# 主圖（1920x1080，含文字 + 金幣 + 紅絲帶）
	win_image = TextureRect.new()
	win_image.position = Vector2(0, 0)
	win_image.size = Vector2(1920, 1080)
	win_image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	win_image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	popup_container.add_child(win_image)

	# 金幣圖示（金額左邊）
	coin_icon = TextureRect.new()
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/buy_coins/coin_icon.png"):
		coin_icon.texture = load("res://assets/game_files/Pop_Ups/buy_coins/coin_icon.png")
	coin_icon.position = Vector2(720, 585)
	coin_icon.size = Vector2(50, 50)
	coin_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	coin_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	popup_container.add_child(coin_icon)

	# 金額文字（在紅絲帶區域居中）
	win_amount_label = Label.new()
	win_amount_label.position = Vector2(780, 580)
	win_amount_label.size = Vector2(500, 60)
	win_amount_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	win_amount_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	win_amount_label.add_theme_font_size_override("font_size", 60)
	win_amount_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
	if game_font:
		win_amount_label.add_theme_font_override("font", game_font)
	win_amount_label.add_theme_constant_override("outline_size", 4)
	win_amount_label.add_theme_color_override("font_outline_color", Color(0.3, 0.15, 0.0))
	popup_container.add_child(win_amount_label)

	# COLLECT 按鈕
	collect_btn = TextureButton.new()
	collect_btn.texture_normal = load("res://assets/game_files/Pop_Ups/collect_button_01.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/collect_button_02.png"):
		collect_btn.texture_hover = load("res://assets/game_files/Pop_Ups/collect_button_02.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/collect_button_03.png"):
		collect_btn.texture_pressed = load("res://assets/game_files/Pop_Ups/collect_button_03.png")
	collect_btn.position = Vector2(660, 660)
	collect_btn.size = Vector2(278, 81)
	collect_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	collect_btn.ignore_texture_size = true
	collect_btn.pressed.connect(_hide_effect)
	popup_container.add_child(collect_btn)

	# SHARE 按鈕
	share_btn = TextureButton.new()
	share_btn.texture_normal = load("res://assets/game_files/Pop_Ups/share_button_01.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/share_button_02.png"):
		share_btn.texture_hover = load("res://assets/game_files/Pop_Ups/share_button_02.png")
	if ResourceLoader.exists("res://assets/game_files/Pop_Ups/share_button_03.png"):
		share_btn.texture_pressed = load("res://assets/game_files/Pop_Ups/share_button_03.png")
	share_btn.position = Vector2(1000, 660)
	share_btn.size = Vector2(278, 81)
	share_btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	share_btn.ignore_texture_size = true
	share_btn.pressed.connect(_hide_effect)
	popup_container.add_child(share_btn)

# ===== 公開 API =====

func show_big_win(amount: float) -> void:
	# 使用大獎素材
	if tex_big_win:
		win_image.texture = tex_big_win
	_show_popup(amount)

func show_normal_win(amount: float) -> void:
	# 使用一般中獎素材
	if tex_you_win:
		win_image.texture = tex_you_win
	else:
		win_image.texture = tex_big_win  # 備用
	_show_popup(amount)

func show_free_spin_total(amount: float) -> void:
	# 免費旋轉結算使用大獎素材
	if tex_big_win:
		win_image.texture = tex_big_win
	_show_popup(amount)

# ===== 動畫 =====

func _show_popup(amount: float) -> void:
	visible = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.visible = true
	popup_container.visible = true
	win_amount_label.text = "0.00"

	# 縮放彈入動畫
	popup_container.scale = Vector2(0.5, 0.5)
	if anim_tween:
		anim_tween.kill()
	anim_tween = create_tween()
	anim_tween.set_ease(Tween.EASE_OUT)
	anim_tween.set_trans(Tween.TRANS_ELASTIC)
	anim_tween.tween_property(popup_container, "scale", Vector2(1, 1), 0.8)

	# 金額滾動動畫
	_animate_amount(amount)

func _animate_amount(target: float) -> void:
	var steps: int = 45
	for i in range(steps):
		var current: float = lerpf(0, target, float(i + 1) / float(steps))
		win_amount_label.text = "%.2f" % current
		await get_tree().create_timer(0.033).timeout
		if not is_inside_tree() or not popup_container.visible:
			return

func _hide_effect() -> void:
	if anim_tween:
		anim_tween.kill()
	anim_tween = create_tween()
	anim_tween.tween_property(popup_container, "modulate:a", 0.0, 0.3)
	anim_tween.parallel().tween_property(overlay, "modulate:a", 0.0, 0.3)
	await anim_tween.finished
	popup_container.visible = false
	popup_container.modulate.a = 1.0
	overlay.visible = false
	overlay.modulate.a = 1.0
	visible = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		_hide_effect()
