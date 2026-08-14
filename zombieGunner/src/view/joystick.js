/* ============================================================
 * 浮動虛擬搖桿（手機直屏）＋ PC 鍵盤 WASD / 方向鍵
 * 觸控畫面下半部任意處即生成搖桿，手指離開回到閒置位置
 * ============================================================ */
(function (H) {
  'use strict';

  function Joystick(scene) {
    var L = H.LAYOUT.joystick;
    this.scene = scene;
    this.cfg = L;
    this.pointerId = -1;
    this.vec = new Phaser.Math.Vector2(0, 0);
    this.strength = 0;
    this.active = false;

    this.base = scene.add.image(L.baseX, L.baseY, 'joy_base')
      .setScrollFactor(0).setDepth(9000).setAlpha(L.idleAlpha);
    this.knob = scene.add.image(L.baseX, L.baseY, 'joy_knob')
      .setScrollFactor(0).setDepth(9001).setAlpha(L.idleAlpha + 0.12);
    this.setRadius(L.baseR, L.knobR);

    // 鍵盤
    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.cursors = scene.input.keyboard.createCursorKeys();

    var self = this;
    scene.input.on('pointerdown', function (p) { self._down(p); });
    scene.input.on('pointermove', function (p) { self._move(p); });
    scene.input.on('pointerup', function (p) { self._up(p); });
    scene.input.on('pointerupoutside', function (p) { self._up(p); });
    scene.input.addPointer(2);   // 支援多點觸控
  }

  Joystick.prototype.setRadius = function (baseR, knobR) {
    this.cfg.baseR = baseR; this.cfg.knobR = knobR;
    this.base.setDisplaySize(baseR * 2, baseR * 2);
    this.knob.setDisplaySize(knobR * 2, knobR * 2);
  };

  /** 此座標是否屬於搖桿可接管的區域（避開右側按鈕與上方 HUD） */
  Joystick.prototype._claims = function (p) {
    if (p.y < H.GAME.HEIGHT * 0.42) return false;
    var B = H.LAYOUT.buttons;
    if (Phaser.Math.Distance.Between(p.x, p.y, B.skillX, B.skillY) < B.skillR + 18) return false;
    return true;
  };

  Joystick.prototype._down = function (p) {
    if (this.pointerId !== -1) return;
    if (!this._claims(p)) return;
    this.pointerId = p.id;
    this.active = true;
    this.base.setPosition(p.x, p.y).setAlpha(this.cfg.activeAlpha);
    this.knob.setPosition(p.x, p.y).setAlpha(this.cfg.activeAlpha + 0.2);
    this._update(p);
  };

  Joystick.prototype._move = function (p) {
    if (p.id !== this.pointerId) return;
    this._update(p);
  };

  Joystick.prototype._up = function (p) {
    if (p.id !== this.pointerId) return;
    this.pointerId = -1;
    this.active = false;
    this.vec.set(0, 0); this.strength = 0;
    var L = this.cfg;
    this.base.setPosition(L.baseX, L.baseY).setAlpha(L.idleAlpha);
    this.knob.setPosition(L.baseX, L.baseY).setAlpha(L.idleAlpha + 0.12);
  };

  Joystick.prototype._update = function (p) {
    var L = this.cfg;
    var dx = p.x - this.base.x, dy = p.y - this.base.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    // 手指拖出範圍時底座跟著移動（跟隨式搖桿，長距離移動不斷手感）
    if (d > L.baseR + L.followMax) {
      var k = (d - (L.baseR + L.followMax)) / d;
      this.base.x += dx * k; this.base.y += dy * k;
      dx = p.x - this.base.x; dy = p.y - this.base.y;
      d = Math.sqrt(dx * dx + dy * dy);
    }
    var clamp = Math.min(d, L.baseR);
    var a = Math.atan2(dy, dx);
    this.knob.setPosition(this.base.x + Math.cos(a) * clamp, this.base.y + Math.sin(a) * clamp);

    var s = clamp / L.baseR;
    if (s < L.deadzone) { this.vec.set(0, 0); this.strength = 0; }
    else {
      this.strength = Math.min(1, (s - L.deadzone) / (1 - L.deadzone));
      this.vec.set(Math.cos(a), Math.sin(a));
    }
  };

  /** 回傳本幀方向 {x,y}（單位向量）與強度 0~1；鍵盤優先於閒置搖桿 */
  Joystick.prototype.read = function () {
    var kx = 0, ky = 0;
    if (this.keys.left.isDown || this.cursors.left.isDown) kx -= 1;
    if (this.keys.right.isDown || this.cursors.right.isDown) kx += 1;
    if (this.keys.up.isDown || this.cursors.up.isDown) ky -= 1;
    if (this.keys.down.isDown || this.cursors.down.isDown) ky += 1;
    if (kx || ky) {
      var l = Math.sqrt(kx * kx + ky * ky);
      return { x: kx / l, y: ky / l, s: 1 };
    }
    return { x: this.vec.x, y: this.vec.y, s: this.strength };
  };

  Joystick.prototype.setVisible = function (v) {
    this.base.setVisible(v); this.knob.setVisible(v);
  };

  Joystick.prototype.reposition = function () {
    var L = this.cfg;
    if (this.active) return;
    this.base.setPosition(L.baseX, L.baseY);
    this.knob.setPosition(L.baseX, L.baseY);
    this.setRadius(L.baseR, L.knobR);
  };

  H.Joystick = Joystick;
})(window.HABBY);
