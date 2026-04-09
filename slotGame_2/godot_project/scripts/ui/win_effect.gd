extends Control
## 中獎特效 — 大獎動畫、免費旋轉結算

var big_win_label: Label
var big_win_amount: Label
var big_win_panel: Panel
var anim_tween: Tween

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_ui()

func _build_ui() -> void:
	# 大獎面板
	big_win_panel = Panel.new()
	big_win_panel.position = Vector2(460, 300)
	big_win_panel.size = Vector2(1000, 400)
	big_win_panel.visible = false
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.02, 0.1, 0.9)
	style.border_color = Color(1, 0.85, 0.3)
	style.set_border_width_all(4)
	style.set_corner_radius_all(20)
	big_win_panel.add_theme_stylebox_override("panel", style)
	add_child(big_win_panel)

	big_win_label = Label.new()
	big_win_label.text = "BIG WIN!"
	big_win_label.position = Vector2(200, 50)
	big_win_label.size = Vector2(600, 100)
	big_win_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	big_win_label.add_theme_font_size_override("font_size", 72)
	big_win_label.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	big_win_panel.add_child(big_win_label)

	big_win_amount = Label.new()
	big_win_amount.position = Vector2(200, 180)
	big_win_amount.size = Vector2(600, 100)
	big_win_amount.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	big_win_amount.add_theme_font_size_override("font_size", 64)
	big_win_amount.add_theme_color_override("font_color", Color.WHITE)
	big_win_panel.add_child(big_win_amount)

	# 點擊關閉提示
	var hint := Label.new()
	hint.text = "TAP TO CONTINUE"
	hint.position = Vector2(300, 330)
	hint.size = Vector2(400, 40)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_font_size_override("font_size", 20)
	hint.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	big_win_panel.add_child(hint)

func show_big_win(amount: float) -> void:
	visible = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	big_win_panel.visible = true
	big_win_label.text = "BIG WIN!"
	big_win_amount.text = "%.2f" % amount

	# 縮放動畫
	big_win_panel.scale = Vector2(0.3, 0.3)
	big_win_panel.pivot_offset = big_win_panel.size / 2.0
	if anim_tween:
		anim_tween.kill()
	anim_tween = create_tween()
	anim_tween.set_ease(Tween.EASE_OUT)
	anim_tween.set_trans(Tween.TRANS_ELASTIC)
	anim_tween.tween_property(big_win_panel, "scale", Vector2(1, 1), 0.6)

	# 金額滾動
	_animate_amount(amount)

	# 自動關閉
	await get_tree().create_timer(4.0).timeout
	_hide_effect()

func show_free_spin_total(amount: float) -> void:
	visible = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	big_win_panel.visible = true
	big_win_label.text = "FREE SPINS TOTAL"
	big_win_amount.text = "%.2f" % amount

	big_win_panel.scale = Vector2(0.3, 0.3)
	big_win_panel.pivot_offset = big_win_panel.size / 2.0
	if anim_tween:
		anim_tween.kill()
	anim_tween = create_tween()
	anim_tween.set_ease(Tween.EASE_OUT)
	anim_tween.set_trans(Tween.TRANS_ELASTIC)
	anim_tween.tween_property(big_win_panel, "scale", Vector2(1, 1), 0.6)

	await get_tree().create_timer(4.0).timeout
	_hide_effect()

func _animate_amount(target: float) -> void:
	var current: float = 0.0
	var steps: int = 30
	for i in range(steps):
		current = lerpf(0, target, float(i + 1) / float(steps))
		big_win_amount.text = "%.2f" % current
		await get_tree().create_timer(0.05).timeout

func _hide_effect() -> void:
	if anim_tween:
		anim_tween.kill()
	anim_tween = create_tween()
	anim_tween.tween_property(big_win_panel, "modulate:a", 0.0, 0.3)
	await anim_tween.finished
	big_win_panel.visible = false
	big_win_panel.modulate.a = 1.0
	visible = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		_hide_effect()
