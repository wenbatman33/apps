extends Node
## 注單記錄管理器

signal history_updated()

const SAVE_PATH: String = "user://bet_history.json"
const MAX_RECORDS: int = 500

var records: Array = []

func _ready() -> void:
	load_history()

## 新增一筆注單記錄
func add_record(data: Dictionary) -> void:
	var record: Dictionary = {
		"id": records.size() + 1,
		"timestamp": Time.get_datetime_string_from_system(),
		"bet": data.get("bet", 0.0),
		"total_bet": data.get("total_bet", 0.0),
		"win": data.get("win", 0.0),
		"profit": data.get("win", 0.0) - data.get("total_bet", 0.0),
		"grid": data.get("grid", []),
		"win_lines": data.get("win_lines", []),
		"is_free_spin": data.get("is_free_spin", false),
		"balance_after": data.get("balance_after", 0.0),
	}
	records.push_front(record)

	# 限制記錄數量
	if records.size() > MAX_RECORDS:
		records.resize(MAX_RECORDS)

	save_history()
	history_updated.emit()

## 取得最近 N 筆記錄
func get_recent(count: int = 50) -> Array:
	return records.slice(0, mini(count, records.size()))

## 統計資訊
func get_statistics() -> Dictionary:
	if records.is_empty():
		return {"total_spins": 0, "total_bet": 0, "total_win": 0, "net": 0, "rtp": 0}

	var total_bet: float = 0.0
	var total_win: float = 0.0
	var win_count: int = 0

	for record in records:
		total_bet += record.get("total_bet", 0.0)
		total_win += record.get("win", 0.0)
		if record.get("win", 0.0) > 0:
			win_count += 1

	var rtp: float = 0.0
	if total_bet > 0:
		rtp = (total_win / total_bet) * 100.0

	return {
		"total_spins": records.size(),
		"total_bet": total_bet,
		"total_win": total_win,
		"net": total_win - total_bet,
		"rtp": rtp,
		"win_rate": float(win_count) / float(records.size()) * 100.0
	}

## 清除所有記錄
func clear_history() -> void:
	records.clear()
	save_history()
	history_updated.emit()

## 儲存到檔案
func save_history() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(records))
		file.close()

## 從檔案載入
func load_history() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
		if file:
			var json := JSON.new()
			var result := json.parse(file.get_as_text())
			file.close()
			if result == OK:
				records = json.data
