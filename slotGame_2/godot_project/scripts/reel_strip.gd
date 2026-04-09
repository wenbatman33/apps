extends Node2D
## 滾輪帶 — 處理單一滾輪的旋轉動畫（備用，主要動畫在 main.gd 中處理）

var reel_index: int = 0
var is_spinning: bool = false
var spin_speed: float = 0.0
var target_symbols: Array = []

func _ready() -> void:
	reel_index = get_meta("reel_index") if has_meta("reel_index") else 0
