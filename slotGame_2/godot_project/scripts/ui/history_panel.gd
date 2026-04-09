extends Control
## 注單記錄面板 — 顯示所有投注歷史和統計數據

var scroll_container: ScrollContainer
var record_list: VBoxContainer
var stats_container: VBoxContainer
var close_button: Button
var clear_button: Button
var tab_records: Button
var tab_stats: Button
var tab_rtp: Button
var content_panel: Panel

var showing_tab: int = 0  # 0=記錄, 1=統計, 2=RTP設定

# RTP 控制元素
var rtp_toggle: CheckButton
var rtp_slider: HSlider
var win_freq_slider: HSlider
var rtp_label: Label
var freq_label: Label

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	# 主面板背景
	var panel := Panel.new()
	panel.position = Vector2(260, 60)
	panel.size = Vector2(1400, 960)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.08, 0.15, 0.95)
	style.border_color = Color(0.8, 0.6, 0.2)
	style.set_border_width_all(3)
	style.set_corner_radius_all(15)
	panel.add_theme_stylebox_override("panel", style)
	add_child(panel)
	content_panel = panel

	# 標題
	var title := Label.new()
	title.text = "GAME RECORDS"
	title.position = Vector2(500, 10)
	title.size = Vector2(400, 50)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	panel.add_child(title)

	# Tab 按鈕
	tab_records = _create_tab_button("Records", Vector2(50, 70), true)
	tab_records.pressed.connect(_show_records_tab)
	panel.add_child(tab_records)

	tab_stats = _create_tab_button("Statistics", Vector2(250, 70), false)
	tab_stats.pressed.connect(_show_stats_tab)
	panel.add_child(tab_stats)

	tab_rtp = _create_tab_button("RTP Control", Vector2(500, 70), false)
	tab_rtp.pressed.connect(_show_rtp_tab)
	panel.add_child(tab_rtp)

	# 關閉按鈕
	close_button = Button.new()
	close_button.text = "X"
	close_button.position = Vector2(1320, 10)
	close_button.size = Vector2(60, 50)
	close_button.add_theme_font_size_override("font_size", 28)
	close_button.pressed.connect(_on_close)
	panel.add_child(close_button)

	# 滾動容器（記錄列表）
	scroll_container = ScrollContainer.new()
	scroll_container.position = Vector2(20, 130)
	scroll_container.size = Vector2(1360, 760)
	scroll_container.visible = true
	panel.add_child(scroll_container)

	record_list = VBoxContainer.new()
	record_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll_container.add_child(record_list)

	# 統計容器
	stats_container = VBoxContainer.new()
	stats_container.position = Vector2(50, 130)
	stats_container.size = Vector2(1300, 760)
	stats_container.visible = false
	panel.add_child(stats_container)

	# 清除按鈕
	clear_button = Button.new()
	clear_button.text = "CLEAR ALL"
	clear_button.position = Vector2(1150, 900)
	clear_button.size = Vector2(200, 40)
	clear_button.add_theme_font_size_override("font_size", 18)
	clear_button.pressed.connect(_on_clear)
	panel.add_child(clear_button)

func refresh() -> void:
	match showing_tab:
		0:
			_populate_records()
		1:
			_populate_stats()
		2:
			_populate_rtp_controls()

func _populate_records() -> void:
	# 清除舊項目
	for child in record_list.get_children():
		child.queue_free()

	# 表頭
	var header := _create_record_row("#", "Time", "Bet", "Win", "Profit", "Balance", true)
	record_list.add_child(header)

	# 分隔線
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 5)
	record_list.add_child(sep)

	var records: Array = BetHistory.get_recent(100)
	for record in records:
		var profit: float = record.get("profit", 0.0)
		var row := _create_record_row(
			str(record.get("id", 0)),
			str(record.get("timestamp", "")),
			"%.2f" % record.get("total_bet", 0.0),
			"%.2f" % record.get("win", 0.0),
			"%.2f" % profit,
			"%.2f" % record.get("balance_after", 0.0),
			false,
			profit > 0
		)
		record_list.add_child(row)

func _create_record_row(col1: String, col2: String, col3: String, col4: String, col5: String, col6: String, is_header: bool, is_win: bool = false) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)

	var font_size: int = 18 if is_header else 16
	var font_color: Color
	if is_header:
		font_color = Color(1, 0.85, 0.3)
	elif is_win:
		font_color = Color(0.3, 1, 0.3)
	else:
		font_color = Color.WHITE

	var widths: Array = [80, 300, 150, 150, 150, 180]
	var texts: Array = [col1, col2, col3, col4, col5, col6]
	var aligns: Array = [
		HORIZONTAL_ALIGNMENT_CENTER,
		HORIZONTAL_ALIGNMENT_LEFT,
		HORIZONTAL_ALIGNMENT_RIGHT,
		HORIZONTAL_ALIGNMENT_RIGHT,
		HORIZONTAL_ALIGNMENT_RIGHT,
		HORIZONTAL_ALIGNMENT_RIGHT,
	]

	for i in range(6):
		var lbl := Label.new()
		lbl.text = texts[i]
		lbl.custom_minimum_size = Vector2(widths[i], 30)
		lbl.horizontal_alignment = aligns[i]
		lbl.add_theme_font_size_override("font_size", font_size)
		lbl.add_theme_color_override("font_color", font_color)
		row.add_child(lbl)

	return row

func _populate_stats() -> void:
	for child in stats_container.get_children():
		child.queue_free()

	var stats: Dictionary = BetHistory.get_statistics()

	var stat_items: Array = [
		["Total Spins", str(stats.get("total_spins", 0))],
		["Total Bet", "%.2f" % stats.get("total_bet", 0.0)],
		["Total Win", "%.2f" % stats.get("total_win", 0.0)],
		["Net Profit", "%.2f" % stats.get("net", 0.0)],
		["RTP", "%.1f%%" % stats.get("rtp", 0.0)],
		["Win Rate", "%.1f%%" % stats.get("win_rate", 0.0)],
	]

	for item in stat_items:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 30)

		var name_label := Label.new()
		name_label.text = item[0]
		name_label.custom_minimum_size = Vector2(300, 60)
		name_label.add_theme_font_size_override("font_size", 32)
		name_label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.8))
		row.add_child(name_label)

		var value_label := Label.new()
		value_label.text = item[1]
		value_label.custom_minimum_size = Vector2(400, 60)
		value_label.add_theme_font_size_override("font_size", 36)
		var net_val: float = stats.get("net", 0.0)
		if item[0] == "Net Profit":
			value_label.add_theme_color_override("font_color", Color.GREEN if net_val >= 0 else Color.RED)
		else:
			value_label.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
		row.add_child(value_label)

		stats_container.add_child(row)

func _populate_rtp_controls() -> void:
	for child in stats_container.get_children():
		child.queue_free()

	# 標題
	var title := Label.new()
	title.text = "Win Rate Control Panel"
	title.custom_minimum_size = Vector2(600, 50)
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	stats_container.add_child(title)

	# 啟用開關
	var toggle_row := HBoxContainer.new()
	toggle_row.add_theme_constant_override("separation", 20)
	var toggle_label := Label.new()
	toggle_label.text = "Enable RTP Control:"
	toggle_label.custom_minimum_size = Vector2(300, 40)
	toggle_label.add_theme_font_size_override("font_size", 22)
	toggle_label.add_theme_color_override("font_color", Color.WHITE)
	toggle_row.add_child(toggle_label)

	rtp_toggle = CheckButton.new()
	rtp_toggle.button_pressed = GameState.force_rtp_control
	rtp_toggle.toggled.connect(_on_rtp_toggle)
	toggle_row.add_child(rtp_toggle)
	stats_container.add_child(toggle_row)

	# 間距
	stats_container.add_child(HSeparator.new())

	# 中獎頻率滑桿
	var freq_row := HBoxContainer.new()
	freq_row.add_theme_constant_override("separation", 20)
	var freq_title := Label.new()
	freq_title.text = "Win Frequency:"
	freq_title.custom_minimum_size = Vector2(300, 40)
	freq_title.add_theme_font_size_override("font_size", 22)
	freq_title.add_theme_color_override("font_color", Color.WHITE)
	freq_row.add_child(freq_title)

	win_freq_slider = HSlider.new()
	win_freq_slider.min_value = 5.0
	win_freq_slider.max_value = 80.0
	win_freq_slider.step = 1.0
	win_freq_slider.value = GameState.target_win_frequency * 100.0
	win_freq_slider.custom_minimum_size = Vector2(500, 40)
	win_freq_slider.value_changed.connect(_on_freq_changed)
	freq_row.add_child(win_freq_slider)

	freq_label = Label.new()
	freq_label.text = "%.0f%%" % (GameState.target_win_frequency * 100.0)
	freq_label.custom_minimum_size = Vector2(100, 40)
	freq_label.add_theme_font_size_override("font_size", 24)
	freq_label.add_theme_color_override("font_color", Color.YELLOW)
	freq_row.add_child(freq_label)
	stats_container.add_child(freq_row)

	# 說明文字
	stats_container.add_child(HSeparator.new())

	var desc := Label.new()
	desc.text = """RTP Control adjusts the probability of winning results.

- Win Frequency: How often spins produce a win (default: 30%)
- Higher frequency = more frequent but smaller wins
- Lower frequency = less frequent but larger potential wins

Symbol weights on each reel can be edited in:
  scripts/autoload/game_config.gd -> reel_weights

Current session stats:
  Spins: %d | Wins: %d | Actual Rate: %.1f%%""" % [
		GameState.spin_counter,
		GameState.win_counter,
		(float(GameState.win_counter) / maxf(GameState.spin_counter, 1)) * 100.0
	]
	desc.custom_minimum_size = Vector2(1200, 300)
	desc.add_theme_font_size_override("font_size", 18)
	desc.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD
	stats_container.add_child(desc)

func _show_records_tab() -> void:
	showing_tab = 0
	scroll_container.visible = true
	stats_container.visible = false
	_update_tab_styles()
	_populate_records()

func _show_stats_tab() -> void:
	showing_tab = 1
	scroll_container.visible = false
	stats_container.visible = true
	_update_tab_styles()
	_populate_stats()

func _show_rtp_tab() -> void:
	showing_tab = 2
	scroll_container.visible = false
	stats_container.visible = true
	_update_tab_styles()
	_populate_rtp_controls()

func _update_tab_styles() -> void:
	var tabs: Array = [tab_records, tab_stats, tab_rtp]
	for i in range(tabs.size()):
		if i == showing_tab:
			tabs[i].add_theme_color_override("font_color", Color(1, 0.85, 0.3))
		else:
			tabs[i].remove_theme_color_override("font_color")

func _on_rtp_toggle(pressed: bool) -> void:
	GameState.force_rtp_control = pressed

func _on_freq_changed(value: float) -> void:
	GameState.target_win_frequency = value / 100.0
	if freq_label:
		freq_label.text = "%.0f%%" % value

func _on_close() -> void:
	visible = false
	var main := get_parent()
	if main and main.has_method("_close_all_popups"):
		main._close_all_popups()

func _on_clear() -> void:
	BetHistory.clear_history()
	refresh()

func _create_tab_button(text: String, pos: Vector2, active: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.position = pos
	btn.size = Vector2(180, 45)
	btn.add_theme_font_size_override("font_size", 22)
	if active:
		btn.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	return btn
