/* 圖鑑：守軍 / 融合 / 敵人 / 英雄 的完整說明
 * 讓玩家在開打前就看得懂每個單位能做什麼、該怎麼應對。
 */
window.TD = window.TD || {};

TD.CodexScene = class CodexScene extends Phaser.Scene {
  constructor() { super('Codex'); }

  init(data) { this.tab = (data && data.tab) || 'unit'; this.scroll = 0; }

  create() {
    this.build();
    // 滾輪與拖曳捲動
    this.input.on('wheel', (p, o, dx, dy) => this.scrollBy(dy * 0.8));
    let dragY = null;
    this.input.on('pointerdown', (p) => { dragY = p.y; });
    this.input.on('pointermove', (p) => {
      if (dragY === null || !p.isDown) return;
      this.scrollBy(dragY - p.y);
      dragY = p.y;
    });
    this.input.on('pointerup', () => { dragY = null; });
  }

  scrollBy(d) {
    const max = Math.max(0, this.contentH - (TD.GAME_H - 420));
    this.scroll = Phaser.Math.Clamp(this.scroll + d, 0, max);
    if (this.listLayer) this.listLayer.y = -this.scroll;
  }

  build() {
    this.children.removeAll();
    this.scroll = 0;

    // 背景
    const bgKey = this.textures.exists('B_field_sq') ? 'B_field_sq' : null;
    if (bgKey) {
      const img = this.add.image(TD.GAME_W / 2, TD.GAME_H / 2, bgKey);
      const sc = Math.max(TD.GAME_W / img.width, TD.GAME_H / img.height);
      img.setScale(sc);
    }
    this.add.rectangle(TD.GAME_W / 2, TD.GAME_H / 2, TD.GAME_W, TD.GAME_H, 0x2A1A0C, 0.86);

    // 標題
    this.add.text(TD.GAME_W / 2, 64, '圖鑑', {
      fontFamily: TD.FONT, fontSize: '64px', color: '#FFC72C',
      stroke: '#4A2E12', strokeThickness: 8,
    }).setOrigin(0.5);

    // 分頁
    const tabs = [['unit', '守軍'], ['fuse', '融合'], ['enemy', '敵人'], ['hero', '英雄']];
    const tw = 230, gap = 12;
    const x0 = (TD.GAME_W - (tabs.length * tw + (tabs.length - 1) * gap)) / 2;
    tabs.forEach(([k, label], i) => {
      const x = x0 + i * (tw + gap), y = 130;
      const on = this.tab === k;
      const g = this.add.graphics();
      g.fillStyle(on ? 0xC98416 : 0x5E3A18, 1).fillRoundedRect(x, y + 6, tw, 74, 16);
      g.fillStyle(on ? 0xFFC72C : 0x8B5A2B, 1).fillRoundedRect(x, y, tw, 68, 16);
      g.fillStyle(0xFFFFFF, on ? 0.3 : 0.12).fillRoundedRect(x + 8, y + 6, tw - 16, 24, 12);
      this.add.text(x + tw / 2, y + 34, label, {
        fontFamily: TD.FONT, fontSize: '34px', color: on ? '#4A2E12' : '#FFE9B8',
      }).setOrigin(0.5);
      this.add.zone(x + tw / 2, y + 34, tw, 74).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.tab = k; this.build(); });
    });

    // 可捲動內容
    this.listLayer = this.add.container(0, 0);
    let y = 240;
    if (this.tab === 'unit') y = this.buildUnits(y);
    else if (this.tab === 'fuse') y = this.buildFusions(y);
    else if (this.tab === 'enemy') y = this.buildEnemies(y);
    else y = this.buildHeroes(y);
    this.contentH = y;

    // 遮住捲動溢出的頂部與底部
    this.add.rectangle(TD.GAME_W / 2, 105, TD.GAME_W, 210, 0x2A1A0C, 1).setDepth(50);
    this.add.text(TD.GAME_W / 2, 64, '圖鑑', {
      fontFamily: TD.FONT, fontSize: '64px', color: '#FFC72C',
      stroke: '#4A2E12', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(51);
    tabs.forEach(([k, label], i) => {
      const x = x0 + i * (tw + gap), y2 = 130;
      const on = this.tab === k;
      const g = this.add.graphics().setDepth(51);
      g.fillStyle(on ? 0xC98416 : 0x5E3A18, 1).fillRoundedRect(x, y2 + 6, tw, 74, 16);
      g.fillStyle(on ? 0xFFC72C : 0x8B5A2B, 1).fillRoundedRect(x, y2, tw, 68, 16);
      g.fillStyle(0xFFFFFF, on ? 0.3 : 0.12).fillRoundedRect(x + 8, y2 + 6, tw - 16, 24, 12);
      this.add.text(x + tw / 2, y2 + 34, label, {
        fontFamily: TD.FONT, fontSize: '34px', color: on ? '#4A2E12' : '#FFE9B8',
      }).setOrigin(0.5).setDepth(52);
      this.add.zone(x + tw / 2, y2 + 34, tw, 74).setInteractive({ useHandCursor: true })
        .setDepth(53).on('pointerdown', () => { this.tab = k; this.build(); });
    });

    // 底部返回
    this.add.rectangle(TD.GAME_W / 2, TD.GAME_H - 90, TD.GAME_W, 180, 0x2A1A0C, 1).setDepth(50);
    const bg = this.add.graphics().setDepth(51);
    bg.fillStyle(0xC98416, 1).fillRoundedRect(TD.GAME_W / 2 - 220, TD.GAME_H - 140, 440, 104, 24);
    bg.fillStyle(0xFFC72C, 1).fillRoundedRect(TD.GAME_W / 2 - 220, TD.GAME_H - 146, 440, 100, 24);
    this.add.text(TD.GAME_W / 2, TD.GAME_H - 96, '返回', {
      fontFamily: TD.FONT, fontSize: '44px', color: '#4A2E12',
    }).setOrigin(0.5).setDepth(52);
    this.add.zone(TD.GAME_W / 2, TD.GAME_H - 96, 440, 104).setInteractive({ useHandCursor: true })
      .setDepth(53).on('pointerdown', () => this.scene.start('Title'));

    this.add.text(TD.GAME_W / 2, TD.GAME_H - 26, '上下拖曳可捲動', {
      fontFamily: TD.FONT, fontSize: '22px', color: '#C9A87C',
    }).setOrigin(0.5).setDepth(52);
  }

  /** 卡片外框 */
  card(y, h) {
    const g = this.add.graphics();
    const X = 40, W = TD.GAME_W - 80;
    g.fillStyle(0x5E3A18, 1).fillRoundedRect(X, y + 6, W, h, 20);
    g.fillStyle(0x8B5A2B, 1).fillRoundedRect(X, y, W, h - 4, 20);
    g.fillStyle(0xB57C42, 0.5).fillRoundedRect(X + 6, y + 6, W - 12, (h - 4) * 0.22, 16);
    this.listLayer.add(g);
    return { X, W };
  }

  txt(x, y, s, size, color, opt = {}) {
    const t = this.add.text(x, y, s, Object.assign({
      fontFamily: TD.FONT, fontSize: `${size}px`, color,
      stroke: '#4A2E12', strokeThickness: opt.stroke === false ? 0 : 4,
      lineSpacing: 8,
    }, opt.style || {}));
    if (opt.origin) t.setOrigin.apply(t, opt.origin);
    if (opt.wrap) t.setWordWrapWidth(opt.wrap);
    this.listLayer.add(t);
    return t;
  }

  icon(x, y, tex, size) {
    if (!this.textures.exists(tex)) return null;
    const i = this.add.image(x, y, tex).setDisplaySize(size, size);
    this.listLayer.add(i);
    return i;
  }

  // ── 守軍 ──
  buildUnits(y) {
    this.txt(50, y, '五大兵系，同種同階拖在一起可升階，最高 Lv.6', 26, '#FFE9B8');
    y += 54;

    // 路障說明放最前面，因為它是路線設計的核心工具
    const BH = 200;
    const bc = this.card(y, BH);
    this.icon(bc.X + 96, y + 100, 'U_barricade', 150);
    this.txt(bc.X + 200, y + 24, '🧱 路障', 42, '#9FD3FF');
    this.txt(bc.X + 200, y + 82,
      '不會攻擊，只用來擋路。用它把敵人導去你想要的路線，\n讓他們在你的火力網裡多走幾格。點一下可拆掉並退款。',
      25, '#FFE9B8', { wrap: bc.W - 230 });
    this.txt(bc.X + 200, y + 152,
      `每關上限 ${TD.BARRICADE.max} 個，價格 ${TD.BARRICADE.baseCost} 起、每放一個 +${TD.BARRICADE.step}`,
      23, '#FFD98A', { stroke: false });
    y += BH + 20;
    Object.keys(TD.KINDS).forEach(k => {
      const K = TD.KINDS[k];
      const s1 = TD.statsOf(k, 1), s6 = TD.statsOf(k, 6);
      const rows = [];
      if (s1.dmg) rows.push(`傷害　Lv1 ${s1.dmg} → Lv6 ${s6.dmg}`);
      if (s1.cd) rows.push(`射速　${(1000 / s1.cd).toFixed(1)}/s → ${(1000 / s6.cd).toFixed(1)}/s`);
      if (s1.range) rows.push(`射程　${s1.range} → ${s6.range}`);
      if (s1.aoe) rows.push(`爆炸範圍　${s1.aoe} → ${s6.aoe}`);
      if (s1.burn) rows.push(`燃燒　${s1.burn}/s → ${s6.burn}/s`);
      if (s1.buff) rows.push(`光環增傷　+${Math.round(s1.buff * 100)}% → +${Math.round(s6.buff * 100)}%`);
      if (s1.slow) rows.push(`減速　${Math.round(s1.slow * 100)}% → ${Math.round(s6.slow * 100)}%`);

      // 卡片高度依實際行數撐開，避免文字互相壓到
      const H = 176 + rows.length * 34;
      const { X, W } = this.card(y, H);
      this.icon(X + 96, y + H / 2 - 10, TD.texOf(k, 3), Math.min(180, H - 90));
      this.txt(X + 200, y + 22, `${K.icon} ${K.name}`, 44, '#FFF6E0');
      this.txt(X + 200, y + 80, K.desc, 26, '#FFE9B8', { wrap: W - 230 });
      this.txt(X + 200, y + 122, rows.join('\n'), 24, '#FFD98A',
               { stroke: false, style: { lineSpacing: 10 } });
      this.txt(X + 200, y + H - 44, `Lv1 ${K.lvNames[0]}　→　Lv6 ${K.lvNames[5]}`,
               22, '#C9A87C', { stroke: false });
      y += H + 20;
    });
    return y;
  }

  // ── 融合 ──
  buildFusions(y) {
    this.txt(50, y, '兩個「不同兵種、相同等級」拖在一起會融合成特殊單位', 26, '#FFE9B8');
    y += 54;
    TD.FUSIONS.forEach(f => {
      const out = TD.FUSED[f.out];
      const H = 230;
      const { X, W } = this.card(y, H);
      this.icon(X + 84, y + 112, TD.texOf(f.a, f.lv), 120);
      this.txt(X + 152, y + 96, '+', 40, '#FFF6E0');
      this.icon(X + 240, y + 112, TD.texOf(f.b, f.lv), 120);
      this.txt(X + 310, y + 96, '=', 40, '#FFF6E0');
      this.icon(X + 400, y + 112, TD.texOf(f.out, 1), 130);

      this.txt(X + 480, y + 30, `${out.icon} ${out.name}`, 38, '#FFE066');
      this.txt(X + 480, y + 84, out.desc, 25, '#FFE9B8', { wrap: W - 500 });
      const st = TD.statsOf(f.out, 1);
      const info = [];
      if (st.dmg) info.push(`傷害 ${st.dmg}`);
      if (st.cd) info.push(`射速 ${(1000 / st.cd).toFixed(1)}/s`);
      if (st.range && st.range < 900) info.push(`射程 ${st.range}`);
      this.txt(X + 480, y + 158, info.join('　'), 24, '#FFD98A', { stroke: false });
      this.txt(X + 24, y + 192, `需要雙方都是 Lv.${f.lv}`, 22, '#C9A87C', { stroke: false });
      y += H + 18;
    });
    return y;
  }

  // ── 敵人 ──
  buildEnemies(y) {
    this.txt(50, y, '看懂機制才知道要怎麼擋', 26, '#FFE9B8');
    y += 54;
    const order = ['soldier', 'shield', 'runner', 'fire', 'siege', 'healer', 'flyer',
                   'myrmidon', 'drummer', 'diomedes', 'ajax', 'achilles', 'agamemnon',
                   'odysseus', 'horse'];
    order.forEach(k => {
      const E = TD.ENEMIES[k];
      if (!E) return;
      const boss = !!E.boss;
      const H = 210;
      const { X, W } = this.card(y, H);
      this.icon(X + 88, y + 100, E.tex, 150);
      this.txt(X + 180, y + 22, (boss ? '👑 ' : '') + E.name, 38, boss ? '#FFE066' : '#FFF6E0');

      const stat = [`血 ${E.hp}`, `速 ${E.spd}`];
      if (E.armor) stat.push(`護甲 ${Math.round(E.armor * 100)}%`);
      if (E.gold) stat.push(`金幣 ${E.gold}`);
      this.txt(X + 180, y + 72, stat.join('　'), 25, '#FFD98A', { stroke: false });

      // title 已描述過的機制就不重複列
      const tips = [];
      const add = (line, kw) => {
        if (E.title && kw && E.title.indexOf(kw) >= 0) return;
        tips.push(line);
      };
      if (E.title) tips.push(E.title);
      if (E.heal) add('會治療周圍同伴 → 優先清掉', '治療');
      if (E.flying) add('飛行：直線穿越，迷宮完全擋不住', '空中');
      if (E.split) add('死亡分裂 → 帶點範圍傷害比較省事', '分裂');
      if (E.haste) add('讓周圍同伴加速 → 減速鏈會被抵銷', '加速');
      if (E.armor >= 0.3) add('高護甲 → 用熱油燃燒或投石範圍破防', '盾');
      if (E.burnTower) add('抵達城牆會癱瘓一座塔 5 秒', '癱瘓');
      if (E.dash) add('會週期性衝刺', '衝刺');
      if (E.stealth) add('會潛行隱形 → 祭司光環可讓它現形', '潛行');
      if (E.summon) add('會不斷召喚小兵 → 速戰速決', '召喚');
      if (E.invulnerable) add('平時無敵，腳踝亮起時「點擊它」造成處決傷害', '腳踝');
      this.txt(X + 180, y + 112, tips.join('\n'), 24, '#FFCFA8', { wrap: W - 210, stroke: false });
      y += H + 16;
    });
    return y;
  }

  // ── 英雄 ──
  buildHeroes(y) {
    this.txt(50, y, '每關可帶 2 位，技能需手動施放', 26, '#FFE9B8');
    y += 54;
    TD.heroList().forEach(k => {
      const H = TD.HEROES[k];
      const CH = 250;
      const { X, W } = this.card(y, CH);
      this.icon(X + 96, y + 120, H.tex, 170);
      this.txt(X + 200, y + 24, `${H.name} · ${H.title}`, 38, '#FFF6E0');
      this.txt(X + 200, y + 80, `⚡ ${H.skill.name}`, 30, '#FFE066');
      this.txt(X + 200, y + 122, H.skill.desc, 25, '#FFE9B8', { wrap: W - 230, stroke: false });
      this.txt(X + 200, y + 182, `◈ 被動：${H.passive.name}`, 25, '#8CE99A', { stroke: false });
      this.txt(X + 200, y + 216, `冷卻 ${Math.round(H.skill.cd / 1000)} 秒　·　第 ${H.unlock} 年解鎖`,
               22, '#C9A87C', { stroke: false });
      y += CH + 18;
    });
    return y;
  }
};
