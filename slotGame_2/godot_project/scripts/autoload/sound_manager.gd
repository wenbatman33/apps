extends Node
## 音效管理器 — 統一管理所有遊戲音效

var sounds: Dictionary = {}
var players: Array = []  # AudioStreamPlayer 池
const POOL_SIZE: int = 8
var master_volume: float = 1.0
var sfx_enabled: bool = true

# 音效路徑定義
const SOUND_FILES: Dictionary = {
	"button_click": "res://assets/audio/button_click.wav",
	"reel_tick": "res://assets/audio/reel_tick.wav",
	"reel_stop": "res://assets/audio/reel_stop.wav",
	"win": "res://assets/audio/win.wav",
	"big_win": "res://assets/audio/big_win.wav",
	"coin": "res://assets/audio/coin.wav",
	"scatter": "res://assets/audio/scatter.wav",
	"bet": "res://assets/audio/bet.wav",
	"spin_loop": "res://assets/audio/spin_loop.wav",
}

func _ready() -> void:
	# 預載所有音效
	for key in SOUND_FILES:
		var path: String = SOUND_FILES[key]
		if ResourceLoader.exists(path):
			sounds[key] = load(path)

	# 建立播放器池
	for i in range(POOL_SIZE):
		var player := AudioStreamPlayer.new()
		player.bus = "Master"
		add_child(player)
		players.append(player)

## 播放音效
func play(sound_name: String, volume_db: float = 0.0) -> void:
	if not sfx_enabled:
		return
	if not sounds.has(sound_name):
		return

	# 找一個空閒的播放器
	for player in players:
		if not player.playing:
			player.stream = sounds[sound_name]
			player.volume_db = volume_db + linear_to_db(master_volume)
			player.play()
			return

	# 全部忙碌時搶佔最早開始的
	players[0].stream = sounds[sound_name]
	players[0].volume_db = volume_db + linear_to_db(master_volume)
	players[0].play()

## 停止所有音效
func stop_all() -> void:
	for player in players:
		player.stop()

## 設定音量（0.0 ~ 1.0）
func set_volume(vol: float) -> void:
	master_volume = clampf(vol, 0.0, 1.0)

## 切換靜音
func toggle_mute() -> void:
	sfx_enabled = not sfx_enabled
