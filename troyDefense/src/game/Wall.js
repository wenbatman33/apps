/* v2 城牆與城門 — 真實遊戲實體
 * 城門有 HP 與四段損傷外觀；城牆由牆段+垛口模組拼裝；
 * 城內遠景隨城門血量逐棟起火。
 */
window.TD = window.TD || {};

TD.Wall = class Wall {
  constructor(scene, gateHp) {
    this.s = scene;
    this.maxHp = gateHp;
    this.hp = gateHp;
    this.stage = 0;               // 0 完好 / 1 裂痕 / 2 破洞 / 3 瀕塌
    this.cityFires = [];
    this.slots = TD.LAYOUT.wall.slotXs.map((x, i) => ({
      i, x, y: TD.LAYOUT.wall.slotY, unit: null, ladder: null, burning: null,
    }));
    this.build();
  }

  // ── 模組化組裝 ──
  build() {
    const s = this.s, L = TD.LAYOUT;
    const wy = L.wall.topY, fh = L.wall.faceH;

    this.houses = [];

    // ── 城牆層：一張含五個部署槽位與旗幟的完整城牆美術 ──
    this.wallImg = s.add.image(TD.GAME_W / 2, wy).setOrigin(0.5, 0)
      .setTexture('B_wall').setDepth(TD.DEPTH.WALL);
    this.wallImg.setDisplaySize(TD.GAME_W, fh);

    // 城牆兩端火盆的動態火焰
    [64, TD.GAME_W - 64].forEach(x => s.fx.flame(x, wy + 46, 0.7));

    // 城門（置中疊在牆上）
    this.gateImg = s.add.image(L.gate.x, L.gate.topY, 'G_gate_0')
      .setOrigin(0.5, 0).setDepth(TD.DEPTH.GATE);
    this.gateImg.setDisplaySize(L.gate.w, L.gate.h);
    this.gateBaseY = L.gate.topY;

    // 門上的血條
    this.hpBar = s.add.graphics().setDepth(TD.DEPTH.GATE + 1);
    this.drawHpBar();

    // 槽位提示：空位淡淡的金色「＋」，選取時加亮（城牆美術本身已有凹槽）
    this.slotMarks = this.slots.map(sl => {
      const g = s.add.graphics().setDepth(TD.DEPTH.MERLON + 2);
      g.lineStyle(7, TD.PALETTE.gold, 0.75);
      g.lineBetween(sl.x - 18, sl.y - 26, sl.x + 18, sl.y - 26);
      g.lineBetween(sl.x, sl.y - 44, sl.x, sl.y - 8);
      return g;
    });
    this.refreshSlotMarks();
  }

  refreshSlotMarks(selecting = false) {
    this.slotMarks.forEach((g, i) => {
      const empty = !this.slots[i].unit;
      g.setAlpha(empty ? (selecting ? 1 : 0.45) : 0);
    });
  }

  drawHpBar() {
    const L = TD.LAYOUT.gate;
    const g = this.hpBar; g.clear();
    const x = L.x - L.hpBarW / 2, y = this.gateBaseY + L.h + 8;
    const k = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    g.fillStyle(0x1A0E06, 0.85).fillRoundedRect(x - 3, y - 3, L.hpBarW + 6, L.hpBarH + 6, 6);
    const col = k > 0.5 ? 0x6FE08A : (k > 0.25 ? 0xFFC83D : 0xFF5C5C);
    g.fillStyle(col, 1).fillRoundedRect(x, y, L.hpBarW * k, L.hpBarH, 5);
  }

  /** 城門受擊（撞門/砍門/火把）*/
  damage(v, hitX, hitY, opt = {}) {
    if (this.s.over) return;
    this.hp = Math.max(0, this.hp - v);
    this.drawHpBar();
    const fx = this.s.fx;

    // 受擊表現：形變 + 火花/木屑
    const big = opt.big || v >= 30;
    this.s.tweens.add({
      targets: this.gateImg,
      scaleX: this.gateImg.scaleX * (big ? 1.045 : 1.02),
      scaleY: this.gateImg.scaleY * (big ? 0.96 : 0.985),
      duration: 70, yoyo: true,
    });
    fx.sparks(hitX, hitY, big ? 25 : 8, { power: big ? 520 : 300 });
    fx.chips(hitX, hitY, big ? 12 : 5);
    if (big) { fx.shake(6, 300); fx.dust(TD.LAYOUT.gate.x, this.gateBaseY + 30, 8); }
    else fx.shake(2, 110);
    fx.vignettePulse(big ? 0.4 : 0.22);
    TD.audio.wallHit();

    this.updateStage();
    if (this.hp <= 0) this.s.gateBreach();
  }

  /** 依血量切換四段損傷外觀＋城內火點 */
  updateStage() {
    const k = this.hp / this.maxHp;
    const st = k > 0.75 ? 0 : k > 0.5 ? 1 : k > 0.25 ? 2 : 3;
    if (st === this.stage) return;
    this.stage = st;
    const key = `G_gate_${st}`;
    if (this.s.textures.exists(key)) {
      this.gateImg.setTexture(key);
      this.gateImg.setDisplaySize(TD.LAYOUT.gate.w, TD.LAYOUT.gate.h);
    }
    this.s.fx.flashWhite(0.2, 60);

    // 門本體起火（第 2 段起）
    if (st >= 2 && !this.gateFlames) {
      this.gateFlames = [
        this.s.fx.flame(TD.LAYOUT.gate.x - 70, this.gateBaseY + 90, 0.7, 0, TD.DEPTH.GATE + 1),
        this.s.fx.flame(TD.LAYOUT.gate.x + 60, this.gateBaseY + 150, 0.9, 0, TD.DEPTH.GATE + 1),
      ];
    }
    // 戰損火點：損傷越重、牆體上的火越多
    const firePos = [[180, 40], [880, 60], [340, 90], [720, 30], [90, 80]];
    const wantFires = st === 1 ? 1 : st === 2 ? 3 : st === 3 ? 5 : 0;
    while (this.cityFires.length < wantFires && this.cityFires.length < firePos.length) {
      const [fx, dy] = firePos[this.cityFires.length];
      this.cityFires.push(this.s.fx.flame(fx, TD.LAYOUT.wall.topY + dy, 0.8, 0, TD.DEPTH.MERLON + 1));
    }
    // 瀕死：常駐紅框＋心跳
    this.s.fx.vignetteHold(st >= 3);
  }

  /** 垛口著火（縱火兵）；點擊 3 次滅火 */
  igniteSlot(slot) {
    if (slot.burning) return;
    slot.burning = {
      flame: this.s.fx.flame(slot.x, slot.y + 8, 0.9, 0, TD.DEPTH.DEFENDER + 1),
      taps: 3, lastTick: 0,
    };
  }
  tapExtinguish(slot) {
    const b = slot.burning;
    if (!b) return;
    b.taps--;
    this.s.fx.dust(slot.x, slot.y, 3, 0xE8E0D0);
    if (b.taps <= 0) {
      b.flame.destroy(); slot.burning = null;
      this.s.fx.smoke(slot.x, slot.y - 10, 3);
    }
  }

  /** 空位提示（有選取時加亮）*/
  showSlotHints(on) { this.refreshSlotMarks(on); }

  slotAt(x, y) {
    const r = TD.LAYOUT.wall.slotR;
    return this.slots.find(sl => Phaser.Math.Distance.Between(x, y, sl.x, sl.y) < r) || null;
  }

  update(now, dt) {
    // 垛口火：持續燒掉守軍血 or 空燒
    this.slots.forEach(sl => {
      const b = sl.burning;
      if (!b) return;
      if (now - b.lastTick > 600) {
        b.lastTick = now;
        if (sl.unit) sl.unit.hurt(4);
        if (Math.random() < 0.5) this.s.fx.smoke(sl.x, sl.y - 20, 1);
      }
    });
  }
};
