import Phaser from '../vendor/phaser.js';
import { CHANCE_CARDS, FATE_CARDS, REGIONS, ROULETTE_EVENTS, netWorth, rentFor } from './game-data.js';

const UI_DEPTH = 100;
const FONT = '"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
const TEXT_RESOLUTION = Math.max(2, Math.min(4, window.devicePixelRatio || 1));
const SPECIAL_LABELS = {
  start: '起点', chance: '机会', train: '高铁', fate: '命运', roulette: '轮盘',
  world: '巡游赛', jail: '监狱', diceLab: '骰控',
};
const CARD_FRAME_WIDTH = 384;
const CARD_FRAME_HEIGHT = 512;
const SPECIAL_EVENT_CARD_IDS = ['train', 'diceLab', 'world', 'jail', 'jailEscape', 'lap', 'back', 'reserve'];

function money(value) {
  return Math.round(value).toLocaleString('zh-CN');
}

export class EngineUI {
  static preload(scene) {
    scene.load.image('board-bg', './assets/sky-board-china-v7-8-series.png');
    scene.load.image('home-bg', './assets/home-key-art-fun.png');
    scene.load.image('ui-button-primary', './assets/ui-button-primary-v1.png');
    scene.load.image('ui-button-positive', './assets/ui-button-positive-v1.png');
    scene.load.image('ui-card-clean', './assets/ui-card-clean-v1.png');
    scene.load.image('ui-setup-panel', './assets/ui-setup-panel-v2.png');
    scene.load.image('ui-option-card', './assets/ui-option-card-v2.png');
    scene.load.image('ui-character-card', './assets/ui-character-card-v2.png');
    scene.load.image('ui-amount-pill', './assets/ui-amount-pill-v2.png');
    scene.load.image('ui-hud-card', './assets/ui-hud-card-v2.png');
    scene.load.image('chance-event-cards', './assets/chance-event-cards-v1.png');
    scene.load.image('fate-event-cards', './assets/fate-event-cards-v1.png');
    scene.load.image('special-event-cards', './assets/special-event-cards-v1.png');
    scene.load.image('bankruptcy-art', './assets/bankruptcy-art.png');
    scene.load.image('victory-art', './assets/victory-art.png');
    scene.load.image('coin-token', './assets/coin-token.png');
  }

  constructor(scene, { width, height, roster }) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.roster = roster;
    this.handlers = {};
    this.buttons = [];
    this.pointerTargets = [];
    this.lastEnginePointerActivation = -Infinity;
    this.tileItems = [];
    this.hudPoints = new Map();
    this.actionShowsDice = false;
    this.currentScreen = 'home';

    this.background = scene.add.image(width / 2, height / 2, 'home-bg')
      .setDisplaySize(width, height).setDepth(0);
    this.boardWorld = scene.add.container(0, 0).setDepth(4).setVisible(false);
    this.boardBackground = scene.add.image(width / 2, height / 2, 'board-bg')
      .setDisplaySize(width, height);
    this.boardLayer = scene.add.container(0, 0);
    this.boardWorld.add([this.boardBackground, this.boardLayer]);
    this.hudLayer = scene.add.container(0, 0).setDepth(40).setVisible(false);
    this.actionLayer = scene.add.container(0, 0).setDepth(55).setVisible(false);
    this.fxLayer = scene.add.container(0, 0).setDepth(75).setVisible(false);
    this.screenLayer = scene.add.container(0, 0).setDepth(UI_DEPTH);
    this.modalLayer = scene.add.container(0, 0).setDepth(UI_DEPTH + 20).setVisible(false);
    this.registerEventCardFrames();
    this.installDesktopPointerFallback();
    this.showHome();
  }

  setHandlers(handlers) { this.handlers = handlers; }

  createText(x, y, value, size, options = {}) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: options.bold === false ? 'normal' : 'bold',
      color: options.color || '#ffffff',
      align: options.align || 'center',
      resolution: TEXT_RESOLUTION,
      stroke: options.stroke || '#071a3c',
      strokeThickness: options.strokeThickness ?? (size >= 18 ? 3 : 1.5),
      lineSpacing: options.lineSpacing || 2,
      wordWrap: options.wrap ? { width: options.wrap, useAdvancedWrap: true } : undefined,
    }).setOrigin(options.originX ?? .5, options.originY ?? .5);
    if (typeof text.setResolution === 'function') text.setResolution(TEXT_RESOLUTION);
    return text;
  }

  createSurface(x, y, width, height, tint = 0xffffff, alpha = 1) {
    const surface = this.scene.add.nineslice(
      x, y, 'ui-card-clean', undefined, width, height, 24, 24, 24, 24,
    ).setAlpha(alpha);
    if (tint !== 0xffffff) surface.setTint(tint);
    return surface;
  }

  makePanel(parent, x, y, width, height, tint = 0xffffff, alpha = 1) {
    const panel = this.createSurface(x, y, width, height, tint, alpha);
    parent.add(panel);
    return panel;
  }

  makeButton(parent, x, y, width, height, label, onPress, options = {}) {
    const container = this.scene.add.container(x, y);
    const texture = options.texture || (width / height < 1.7 ? 'ui-card-clean' : 'ui-button-primary');
    const lightSurface = texture === 'ui-card-clean' || texture === 'ui-option-card' || texture === 'ui-character-card';
    const panel = texture === 'ui-card-clean'
      ? this.createSurface(0, 0, width, height, options.tint || 0xffffff)
      : this.scene.add.image(0, 0, texture).setDisplaySize(width, height);
    if (texture !== 'ui-card-clean' && options.tint) panel.setTint(options.tint);
    const baseTint = options.tint || 0xffffff;
    const restoreTint = () => {
      if (baseTint === 0xffffff) panel.clearTint();
      else panel.setTint(baseTint);
    };
    const text = this.createText(0, 0, label, options.fontSize || 16, {
      color: options.color || '#ffffff',
      stroke: options.stroke || '#071a3c',
      strokeThickness: options.strokeThickness ?? (lightSurface ? 0 : 1.5),
      wrap: width - 18,
    });
    container.add([panel, text]);
    panel.setInteractive({ useHandCursor: true });
    panel.on('pointerover', () => panel.setTint(options.hoverTint || 0xddffff));
    panel.on('pointerout', restoreTint);
    panel.on('pointerdown', () => panel.setTint(options.downTint || 0xffffc4));
    const activate = () => {
      restoreTint();
      if (onPress) {
        this.lastEnginePointerActivation = performance.now();
        this.handlers.onAnyButton?.();
        onPress();
      }
    };
    panel.on('pointerup', activate);
    parent.add(container);
    this.buttons.push(container);
    this.registerPointerTarget(container, activate);
    return container;
  }

  registerPointerTarget(gameObject, activate) {
    this.pointerTargets.push({ gameObject, activate });
  }

  installDesktopPointerFallback() {
    const canvas = this.scene.game.canvas;
    canvas.addEventListener('pointerup', (event) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (event.clientX - rect.left) * (this.width / rect.width);
      const y = (event.clientY - rect.top) * (this.height / rect.height);
      window.setTimeout(() => {
        // Phaser 正常派发时由引擎处理；某些桌面浏览器只送 PointerEvent，
        // 没有 Phaser Mouse Plugin 依赖的兼容 mouseup，因此在此补一次命中。
        if (performance.now() - this.lastEnginePointerActivation < 120) return;
        const target = [...this.pointerTargets].reverse().find(({ gameObject }) => {
          if (!gameObject?.active || !this.isVisibleInHierarchy(gameObject)) return false;
          const bounds = gameObject.getBounds?.();
          return bounds?.contains(x, y);
        });
        target?.activate();
      }, 0);
    }, { passive: true });
  }

  isVisibleInHierarchy(gameObject) {
    let current = gameObject;
    while (current) {
      if (!current.active || !current.visible || current.alpha <= 0) return false;
      current = current.parentContainer;
    }
    return true;
  }

  registerEventCardFrames() {
    const register = (textureKey, ids) => {
      const texture = this.scene.textures.get(textureKey);
      ids.forEach((id, index) => {
        if (texture.has(id)) return;
        texture.add(
          id,
          0,
          (index % 4) * CARD_FRAME_WIDTH,
          Math.floor(index / 4) * CARD_FRAME_HEIGHT,
          CARD_FRAME_WIDTH,
          CARD_FRAME_HEIGHT,
        );
      });
    };
    register('chance-event-cards', [...CHANCE_CARDS.map((card) => card.id), 'back']);
    register('fate-event-cards', [...FATE_CARDS.map((card) => card.id), 'back', 'reserve-a', 'reserve-b']);
    register('special-event-cards', SPECIAL_EVENT_CARD_IDS);
  }

  eventCardVisual(kind, cardId, revealed) {
    if (kind === 'chance') {
      return { texture: 'chance-event-cards', frame: revealed && cardId ? cardId : 'back' };
    }
    if (kind === 'fate') {
      return { texture: 'fate-event-cards', frame: revealed && cardId ? cardId : 'back' };
    }
    const specialId = SPECIAL_EVENT_CARD_IDS.includes(cardId || kind) ? (cardId || kind) : 'back';
    return { texture: 'special-event-cards', frame: specialId };
  }

  clear(container) {
    container.removeAll(true);
  }

  showEngineDice(show) {
    // 地名、金额与特殊格标签属于棋盘信息，掷骰期间也必须常驻。
    // 骰子的前后关系由独立 3D 舞台的 CSS 层级处理，不能靠隐藏棋盘文字规避遮挡。
    if (this.boardLayer) this.boardLayer.setVisible(this.currentScreen === 'game');
    this.handlers.onDiceVisibility?.(show);
  }

  showHome() {
    this.currentScreen = 'home';
    this.boardWorld.setVisible(false);
    this.background.setTexture('home-bg').setDisplaySize(this.width, this.height).setAlpha(1).setVisible(true).clearTint();
    this.boardLayer.setVisible(false);
    this.hudLayer.setVisible(false);
    this.actionLayer.setVisible(false);
    this.modalLayer.setVisible(false);
    this.showEngineDice(false);
    this.clear(this.screenLayer);
    this.screenLayer.setVisible(true);
    const title = this.createText(this.width / 2, 93, '房产大亨', 45, {
      color: '#fff5c3', stroke: '#123d91', strokeThickness: 7,
    });
    const sub = this.createText(this.width / 2, 133, '中国城市争霸', 14, {
      color: '#ffe283', strokeThickness: 2,
    });
    this.screenLayer.add([title, sub]);
    this.makeButton(this.screenLayer, this.width / 2, 640, 300, 62, '开始游戏', () => this.showSetup(), { fontSize: 21 });
    this.makeButton(this.screenLayer, this.width / 2, 717, 250, 52, '玩法说明', () => this.handlers.onRules?.(), { tint: 0x314d88, fontSize: 17 });
  }

  showSetup() {
    this.currentScreen = 'setup';
    this.boardWorld.setVisible(false);
    this.background.setTexture('board-bg').setDisplaySize(this.width, this.height).clearTint().setAlpha(.12).setVisible(true);
    this.clear(this.screenLayer);
    this.screenLayer.setVisible(true);
    const wash = this.scene.add.image(this.width / 2, this.height / 2, 'ui-setup-panel')
      .setDisplaySize(520, 925).setAlpha(1);
    this.screenLayer.add(wash);
    this.screenLayer.add([
      this.createText(this.width / 2, 49, '准备出发', 11, { color: '#c47a08', strokeThickness: 0 }),
      this.createText(this.width / 2, 76, '选择游戏模式', 24, { color: '#0b2854', strokeThickness: 0 }),
    ]);
    const soloSelected = this.handlers.getMode?.() === 'solo';
    const localSelected = this.handlers.getMode?.() === 'local';
    this.makeButton(this.screenLayer, 132, 132, 190, 64, '单人挑战', () => {
      this.handlers.onMode?.('solo');
      this.showSetup();
    }, {
      texture: soloSelected ? 'ui-button-primary' : 'ui-option-card',
      color: soloSelected ? '#ffffff' : '#28436e', fontSize: 16,
      strokeThickness: soloSelected ? 1.5 : 0,
    });
    this.makeButton(this.screenLayer, 318, 132, 190, 64, '四人同机', () => {
      this.handlers.onMode?.('local');
      this.showSetup();
    }, {
      texture: localSelected ? 'ui-button-primary' : 'ui-option-card',
      color: localSelected ? '#ffffff' : '#28436e', fontSize: 16,
      strokeThickness: localSelected ? 1.5 : 0,
    });
    this.screenLayer.add([
      this.createText(this.width / 2, 184, '八选一', 11, { color: '#c47a08', strokeThickness: 0 }),
      this.createText(this.width / 2, 214, '选择你的角色', 25, { color: '#0b2854', strokeThickness: 0 }),
    ]);

    this.roster.forEach((character, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 68 + col * 105;
      const y = 318 + row * 172;
      const selected = this.handlers.getCharacter?.()?.id === character.id;
      const card = this.scene.add.container(x, y);
      const panel = this.scene.add.image(0, 0, 'ui-character-card').setDisplaySize(96, 154);
      if (selected && panel.postFX) panel.postFX.addGlow(Phaser.Display.Color.HexStringToColor(character.color).color, 3, 0, false, .1, 12);
      const portrait = this.scene.add.image(0, -12, 'roster', character.id).setDisplaySize(76, 104).setOrigin(.5, .55);
      const name = this.createText(0, 57, character.name, 13, { color: '#28436e', strokeThickness: 0, wrap: 82 });
      card.add([panel, portrait, name]);
      panel.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.lastEnginePointerActivation = performance.now();
        this.handlers.onAnyButton?.();
        this.handlers.onCharacter?.(character);
        this.showSetup();
      });
      this.registerPointerTarget(card, () => {
        this.lastEnginePointerActivation = performance.now();
        this.handlers.onAnyButton?.();
        this.handlers.onCharacter?.(character);
        this.showSetup();
      });
      this.screenLayer.add(card);
    });
    this.makeButton(this.screenLayer, this.width / 2, 700, 300, 62, '开始对局', () => this.handlers.onStart?.(), { fontSize: 20 });
    this.makeButton(this.screenLayer, 42, 38, 54, 46, '‹', () => this.showHome(), {
      texture: 'ui-card-clean', color: '#28436e', fontSize: 25,
    });
  }

  showGame() {
    this.currentScreen = 'game';
    this.clear(this.screenLayer);
    this.screenLayer.setVisible(false);
    this.modalLayer.setVisible(false);
    this.background.setVisible(false);
    this.boardBackground.setVisible(false);
    this.boardWorld.setPosition(0, 0).setScale(1).setVisible(true);
    this.boardLayer.setVisible(true);
    this.hudLayer.setVisible(true);
    this.actionShowsDice = false;
    this.showEngineDice(false);
    this.makeGameControls();
  }

  makeGameControls() {
    this.clear(this.fxLayer);
    this.fxLayer.setVisible(true);
    this.makeButton(this.fxLayer, 413, 752, 48, 43, 'Ⅱ', () => this.handlers.onPause?.(), { tint: 0x1b3867, fontSize: 17 });
    this.makeButton(this.fxLayer, 360, 752, 48, 43, this.handlers.isSoundEnabled?.() ? '🔊' : '🔇', () => {
      this.handlers.onAudio?.();
      this.makeGameControls();
    }, { tint: 0x1b3867, fontSize: 17 });
    this.makeButton(this.fxLayer, 307, 752, 48, 43, '?', () => this.handlers.onRules?.(), { tint: 0x1b3867, fontSize: 17 });
  }

  showIntro(players) {
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(true);
    this.showEngineDice(false);
    const wash = this.scene.add.image(this.width / 2, this.height / 2, 'ui-setup-panel')
      .setDisplaySize(520, 925).setAlpha(1);
    this.modalLayer.add([
      wash,
      this.createText(this.width / 2, 86, '四人入场', 30, { color: '#0b2854', strokeThickness: 0 }),
    ]);
    players.forEach((player, index) => {
      const x = 120 + (index % 2) * 210;
      const y = 270 + Math.floor(index / 2) * 280;
      const card = this.scene.add.container(x, y);
      const panel = this.scene.add.image(0, 0, 'ui-character-card').setDisplaySize(154, 244);
      if (panel.postFX) {
        panel.postFX.addGlow(
          Phaser.Display.Color.HexStringToColor(player.color).color,
          player.isHuman ? 3 : 1.2, 0, false, .09, player.isHuman ? 12 : 5,
        );
      }
      const portrait = this.scene.add.image(0, -20, 'roster', player.character.id)
        .setDisplaySize(116, 158).setOrigin(.5, .55);
      const label = this.createText(0, 88, `${player.name}${player.isHuman ? '' : ' AI'}`, 16, {
        color: '#28436e', strokeThickness: 0, wrap: 136,
      });
      card.add([panel, portrait, label]);
      this.modalLayer.add(card);
    });
  }

  hideModal() {
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(false);
    if (this.currentScreen === 'game') this.showEngineDice(this.actionShowsDice);
  }

  renderHUD(players, tiles, currentIndex, gameEnded) {
    this.clear(this.hudLayer);
    this.hudPoints.clear();
    const solvent = players.filter((p) => !p.bankrupt);
    const highestWorth = Math.max(0, ...solvent.map((p) => netWorth(tiles, p)));
    const highestCash = Math.max(1, ...solvent.map((p) => p.coins));
    const soleWorthLeader = solvent.filter((p) => netWorth(tiles, p) === highestWorth).length === 1;
    const soleCashLeader = solvent.filter((p) => p.coins === highestCash).length === 1;
    players.forEach((player, index) => {
      const x = index % 2 === 0 ? 112 : 338;
      const y = index < 2 ? 42 : 124;
      const active = index === currentIndex && !gameEnded;
      const worth = netWorth(tiles, player);
      const property = Math.max(0, worth - player.coins);
      const card = this.scene.add.container(x, y);
      const panel = this.scene.add.image(0, 0, 'ui-hud-card').setDisplaySize(214, 76)
        .setAlpha(player.bankrupt ? .5 : .98);
      if (panel.postFX) {
        panel.postFX.addGlow(
          Phaser.Display.Color.HexStringToColor(player.color).color,
          active ? 2.5 : .7, 0, false, .08, active ? 10 : 4,
        );
      }
      const portrait = this.scene.add.image(-78, 0, 'roster', player.character.id).setDisplaySize(50, 68);
      const name = this.createText(-48, -24, player.name, 15.5, { originX: 0, color: '#ffffff', strokeThickness: 1.5 });
      const finances = this.createText(-48, 1, player.bankrupt ? '破产' : `现金 ${money(player.coins)}`, 16, {
        originX: 0, color: '#ffe277', strokeThickness: 0,
      });
      const assets = this.createText(-48, 26, player.bankrupt ? '' : `资产 ${money(property)}`, 15, {
        originX: 0, color: '#8ee8ff', strokeThickness: 0,
      });
      const leader = soleWorthLeader && worth === highestWorth && !player.bankrupt
        ? '首富'
        : soleCashLeader && player.coins === highestCash && !player.bankrupt ? '现金王' : '';
      card.add([panel, portrait, name, finances, assets]);
      if (leader) {
        const leaderPill = this.scene.add.image(79, -25, 'ui-amount-pill').setDisplaySize(42, 17).setTint(0xffdf69);
        const leaderText = this.createText(79, -25, leader, 8.5, { color: '#422500', strokeThickness: 0 });
        card.add([leaderPill, leaderText]);
      }
      const inventory = [
        ['免', player.rentShield], ['邀', player.inviteCards], ['增', player.rentBoost], ['骰', player.diceControlItems],
      ].filter(([, count]) => count > 0).map(([icon, count]) => `${icon}${count}`).join(' ');
      if (inventory) card.add(this.createText(69, 26, inventory, 8.5, { color: '#c9f6ff', strokeThickness: 2 }));
      this.hudLayer.add(card);
      this.hudPoints.set(player.id, { x, y });
    });
  }

  renderTiles(tiles, players, onTravel) {
    this.clear(this.boardLayer);
    this.tileItems = [];
    tiles.forEach((tile, index) => {
      const item = this.scene.add.container(this.width / 2, this.height / 2).setVisible(false);
      if (tile.type === 'property') {
        const amount = tile.owner ? `$${money(rentFor(tiles, tile))}` : `$${money(tile.price)}`;
        const amountPill = this.scene.add.image(0, 0, 'ui-amount-pill')
          .setDisplaySize(72, 24).setTintFill(0xffffff).setAlpha(1);
        const amountText = this.createText(0, 0, amount, 13.5, {
          color: '#0b2854', strokeThickness: 0,
        });
        const nameText = this.createText(0, 23, tile.name, 15.5, {
          color: '#102046', stroke: '#ffffff', strokeThickness: 2.5,
        });
        item.add([amountPill, amountText, nameText]);
        if (onTravel) {
          const target = this.scene.add.zone(0, 10, 104, 70).setInteractive({ useHandCursor: true });
          target.on('pointerup', () => onTravel(index));
          item.addAt(target, 0);
        }
      } else {
        item.add(this.createText(0, 8, SPECIAL_LABELS[tile.type] || tile.name, 13.5, { color: '#5a3100', stroke: '#fff1ba', strokeThickness: 4, wrap: 88 }));
      }
      this.boardLayer.add(item);
      this.tileItems[index] = item;
    });
  }

  updateTilePositions(screenPositions) {
    this.tileItems.forEach((item, index) => {
      const position = screenPositions[index];
      if (!item || !position) return;
      item.setPosition(position.x, position.y).setScale(position.scale).setVisible(position.visible);
    });
  }

  setPanel(turnLabel, title, copy, actions = [], options = {}) {
    this.clear(this.actionLayer);
    this.actionLayer.setVisible(true);
    const actionCount = actions.length;
    this.actionShowsDice = options.rollStatus === true || options.showDice === true;
    this.showEngineDice(this.actionShowsDice);
    if (options.compact && !title && !copy && actionCount === 1) {
      // 单一掷骰操作固定在底部安全操作区，避免棋盘下方留下大片无用途背景。
      this.actionLayer.add(this.createText(this.width / 2, 616, turnLabel, 13, { color: '#ffe17c', strokeThickness: 3 }));
      this.makeButton(this.actionLayer, this.width / 2, 660, 250, 60, actions[0].label, actions[0].run, {
        texture: actions[0].gold ? 'ui-button-positive' : 'ui-button-primary',
        fontSize: 19,
      });
      return { y: 660, height: 60 };
    }
    const width = options.routePicker || options.liquidation ? 380 : actionCount <= 1 && !title ? 220 : 350;
    const height = options.routePicker || options.liquidation
      ? 430
      : options.rollStatus ? (copy ? 108 : 88) : Math.max(112, 94 + Math.ceil(actionCount / 2) * 54 + (copy ? 22 : 0));
    // 一般决策框使用下半屏，衔接底部操作键；路线选择、骰控与掷骰状态维持专用位置。
    const y = options.routePicker ? 410 : options.diceControl ? 470 : options.rollStatus ? 480 : 600;
    this.makePanel(this.actionLayer, this.width / 2, y, width, height, 0xffffff, 1);
    if (turnLabel) this.actionLayer.add(this.createText(this.width / 2, y - height / 2 + 18, turnLabel, 12, {
      color: '#b66c00', strokeThickness: 0,
    }));
    if (title) this.actionLayer.add(this.createText(this.width / 2, y - height / 2 + 48, title, options.rollStatus ? 18 : 20, {
      color: '#0a2854', strokeThickness: 0, wrap: width - 35,
    }));
    if (copy) this.actionLayer.add(this.createText(this.width / 2, y - height / 2 + 78, copy, 12, {
      color: '#465d7d', strokeThickness: 0, wrap: width - 40,
    }));
    const columns = options.routePicker || options.liquidation ? 2 : Math.min(2, actionCount);
    const buttonW = columns === 1 ? Math.min(260, width - 38) : (width - 44) / 2;
    const startY = y + height / 2 - 28 - (Math.ceil(actionCount / columns) - 1) * 50;
    actions.forEach((action, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const buttonX = columns === 1 ? this.width / 2 : this.width / 2 + (col === 0 ? -buttonW / 2 - 4 : buttonW / 2 + 4);
      this.makeButton(this.actionLayer, buttonX, startY + row * 50, buttonW, 42, action.label, action.run, {
        texture: action.gold ? 'ui-button-positive' : 'ui-button-primary',
        fontSize: action.fontSize || 13,
      });
    });
    return { y, height };
  }

  hidePanel() {
    this.clear(this.actionLayer);
    this.actionLayer.setVisible(false);
    this.actionShowsDice = false;
    this.showEngineDice(false);
  }

  showTravelPicker(turnLabel) {
    this.clear(this.actionLayer);
    this.actionLayer.setVisible(true);
    this.actionShowsDice = false;
    this.showEngineDice(false);
    this.makePanel(this.actionLayer, this.width / 2, 430, 272, 66, 0xffffff, .98);
    this.actionLayer.add([
      this.createText(this.width / 2, 416, turnLabel, 10, { color: '#b66c00', strokeThickness: 0 }),
      this.createText(this.width / 2, 440, '拖动棋盘 · 点选城市', 16, { color: '#0a2854', strokeThickness: 0 }),
    ]);
  }

  showDiceControl(turnLabel, player, onOdd, onEven, actions) {
    this.setPanel(turnLabel, '使用精准骰子券', `控制券 ×${player.diceControlItems}`, actions, { diceControl: true });
    const y = 458;
    const gauge = this.createText(this.width / 2, y, '2–5      5–8      8–12', 12, { color: '#ffffff', stroke: '#245783', strokeThickness: 4 });
    this.actionLayer.add(gauge);
    this.makeButton(this.actionLayer, 158, 493, 120, 34, '指定单数', onOdd, { tint: 0x6f5fd5, fontSize: 11 });
    this.makeButton(this.actionLayer, 292, 493, 120, 34, '指定双数', onEven, { tint: 0x6f5fd5, fontSize: 11 });
  }

  showLapBonus(playerName, amount) {
    const container = this.scene.add.container(this.width / 2, 330).setDepth(90);
    const panel = this.createSurface(0, 0, 300, 95, 0x204f88, .98);
    const title = this.createText(0, -16, `${playerName} 环游一圈`, 18, { color: '#ffffff', strokeThickness: 3 });
    const value = this.createText(0, 18, `薪资 +$${money(amount)}`, 22, { color: '#ffe67d', strokeThickness: 3 });
    container.add([panel, title, value]);
    container.setAlpha(0).setY(350);
    this.scene.tweens.add({ targets: container, alpha: 1, y: 330, duration: 220, ease: 'Back.Out', hold: 1150, yoyo: true, onComplete: () => container.destroy() });
  }

  async showEffect(title, copy = '') {
    const container = this.scene.add.container(this.width / 2, 370).setDepth(92);
    const panel = this.createSurface(0, 0, 330, copy ? 105 : 78, 0x173f79, .98);
    const heading = this.createText(0, copy ? -18 : 0, title, 22, { color: '#ffe17c', strokeThickness: 3, wrap: 290 });
    container.add([panel, heading]);
    if (copy) container.add(this.createText(0, 21, copy, 13, { color: '#ffffff', strokeThickness: 2, wrap: 290 }));
    container.setAlpha(0);
    await new Promise((resolve) => this.scene.tweens.add({ targets: container, alpha: 1, y: 350, duration: 180, yoyo: true, hold: 900, onComplete: resolve }));
    container.destroy();
  }

  async animateToll(baseRent, finalRent, boostStacks) {
    const container = this.scene.add.container(this.width / 2, 360).setDepth(92);
    const panel = this.createSurface(0, 0, 300, 112, boostStacks ? 0x644d9c : 0x173f79, .98);
    const title = this.createText(0, -25, boostStacks ? `过路费加成 ×${boostStacks}` : '过路费', 16, { color: '#ffe17c' });
    const value = this.createText(0, 18, `$${money(baseRent)}`, 30, { color: '#ffffff', strokeThickness: 4 });
    container.add([panel, title, value]);
    const duration = boostStacks ? 850 : 380;
    await new Promise((resolve) => this.scene.tweens.addCounter({
      from: baseRent, to: finalRent, duration, ease: 'Cubic.Out',
      onUpdate: (tween) => value.setText(`$${money(tween.getValue())}`), onComplete: resolve,
    }));
    await new Promise((resolve) => this.scene.time.delayedCall(520, resolve));
    container.destroy();
  }

  showCoinBurst(playerId, amount) {
    const point = this.hudPoints.get(playerId);
    if (!point) return;
    const text = this.createText(point.x, point.y + 30, `${amount >= 0 ? '+' : '−'}$${money(Math.abs(amount))}`, 15, {
      color: amount >= 0 ? '#8dffae' : '#ff8d9c', strokeThickness: 3,
    }).setDepth(95);
    this.scene.tweens.add({ targets: text, y: point.y + 8, alpha: 0, duration: 900, ease: 'Cubic.Out', onComplete: () => text.destroy() });
  }

  async animateCoinTransfer(fromId, toId, amount) {
    const start = this.hudPoints.get(fromId);
    const end = this.hudPoints.get(toId);
    if (!start || !end || amount <= 0) return;
    const duration = 720;
    const particles = Array.from({ length: 12 }, (_, index) => {
      const coin = this.scene.add.image(start.x, start.y, 'coin-token').setDisplaySize(19, 19).setDepth(94).setAlpha(0);
      this.scene.tweens.add({
        targets: coin, x: end.x + ((index % 3) - 1) * 5, y: end.y, alpha: { from: 0, to: 1 },
        angle: 720, duration, delay: index * 35, ease: 'Cubic.InOut', onComplete: () => coin.destroy(),
      });
      return coin;
    });
    const value = this.createText((start.x + end.x) / 2, (start.y + end.y) / 2 + 25, `$${money(amount)}`, 17, { color: '#ffe17c' }).setDepth(95);
    this.scene.tweens.add({ targets: value, y: value.y - 20, alpha: 0, duration: duration + 350, onComplete: () => value.destroy() });
    await new Promise((resolve) => this.scene.time.delayedCall(duration + particles.length * 35, resolve));
  }

  presentEvent({ player, kind, cardId, kicker, title, description, actionLabel = '确定', reveal = false, auto = false }) {
    this.hidePanel();
    this.showEngineDice(false);
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(true);
    this.makePanel(this.modalLayer, this.width / 2, this.height / 2, 424, 770, 0x0e3768, .995);
    const initiallyRevealed = !reveal;
    const initialVisual = this.eventCardVisual(kind, cardId, initiallyRevealed);
    const kickerText = this.createText(this.width / 2, 55, kicker, 19, {
      color: '#ffe17c', strokeThickness: 3, wrap: 370,
    });
    const art = this.scene.add.image(this.width / 2, 332, initialVisual.texture, initialVisual.frame)
      .setDisplaySize(304, 405);
    const titleText = this.createText(this.width / 2, 454, initiallyRevealed ? title : '翻开卡片', 23, {
      color: '#fff8da', stroke: '#401d08', strokeThickness: 3, wrap: 260,
    });
    const copyText = this.createText(this.width / 2, 501, initiallyRevealed ? description : '', 13, {
      color: '#ffffff', stroke: '#28170b', strokeThickness: 2, wrap: 258,
    });
    this.modalLayer.add([art, kickerText, titleText, copyText]);
    return new Promise((resolve) => {
      let revealed = initiallyRevealed;
      let flipping = false;
      const close = () => { this.hideModal(); resolve(); };
      const action = () => {
        if (flipping) return;
        if (!revealed) {
          flipping = true;
          buttonText.setText('翻牌中');
          const baseScaleX = art.scaleX;
          this.scene.tweens.add({
            targets: art,
            scaleX: .025,
            duration: 170,
            ease: 'Cubic.In',
            onComplete: () => {
              const front = this.eventCardVisual(kind, cardId, true);
              art.setTexture(front.texture, front.frame);
              titleText.setText(title);
              copyText.setText(description);
              revealed = true;
              this.scene.tweens.add({
                targets: art,
                scaleX: baseScaleX,
                duration: 210,
                ease: 'Back.Out',
                onComplete: () => {
                  flipping = false;
                  buttonText.setText(actionLabel);
                },
              });
            },
          });
          return;
        }
        close();
      };
      const button = this.makeButton(this.modalLayer, this.width / 2, 724, 258, 58, reveal ? '翻牌' : actionLabel, action, { fontSize: 19 });
      const buttonText = button.list[1];
      if (auto) {
        this.scene.time.delayedCall(900, () => {
          action();
          if (reveal) this.scene.time.delayedCall(1500, action);
        });
      }
    });
  }

  showRoulette(auto = false) {
    this.hidePanel();
    this.showEngineDice(false);
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(true);
    this.makePanel(this.modalLayer, this.width / 2, this.height / 2, 414, 748, 0x123b73, .995);
    this.modalLayer.add(this.createText(this.width / 2, 72, '命运轮盘', 27, { color: '#ffe17c' }));
    this.makePanel(this.modalLayer, this.width / 2, 340, 366, 342, 0x071a38, 1);
    const highlight = this.scene.add.image(this.width / 2, 340, 'ui-amount-pill')
      .setDisplaySize(342, 68).setTint(0xe4a928).setAlpha(1);
    this.modalLayer.add(highlight);
    let eventCursor = Math.floor(Math.random() * ROULETTE_EVENTS.length);
    const slotY = [220, 280, 340, 400, 460];
    const slots = slotY.map((y, index) => this.createText(
      this.width / 2,
      y,
      ROULETTE_EVENTS[(eventCursor + index) % ROULETTE_EVENTS.length].title,
      index === 2 ? 28 : 18,
      { color: index === 2 ? '#fff196' : '#b9d7ef', strokeThickness: 3 },
    ));
    const styleSlots = () => slots.forEach((slot, index) => {
      const distance = Math.abs(index - 2);
      slot.setFontSize(index === 2 ? 28 : distance === 1 ? 20 : 17)
        .setColor(index === 2 ? '#fff196' : '#b9d7ef')
        .setAlpha(distance === 2 ? .38 : distance === 1 ? .7 : 1)
        .setScale(index === 2 ? 1.06 : 1);
    });
    styleSlots();
    this.modalLayer.add(slots);
    return new Promise((resolve) => {
      let running = false;
      let result = null;
      let readyToConfirm = false;
      const start = async () => {
        if (running && result && readyToConfirm) { this.hideModal(); resolve(result); return; }
        if (running) return;
        running = true;
        result = null;
        readyToConfirm = false;
        resultLabel.setText('');
        description.setText('');
        button.setAlpha(.72);
        buttonText.setText('正在抽选');
        const totalSteps = 34;
        for (let step = 0; step < totalSteps; step += 1) {
          const progress = step / (totalSteps - 1);
          const duration = step < 9 ? 54 : 58 + Math.round((progress ** 2.55) * 300);
          await new Promise((done) => this.scene.tweens.add({
            targets: slots,
            y: '-=60',
            duration,
            ease: step < 20 ? 'Linear' : 'Cubic.Out',
            onComplete: done,
          }));
          const first = slots.shift();
          eventCursor = (eventCursor + 1) % ROULETTE_EVENTS.length;
          first.setY(460).setText(ROULETTE_EVENTS[(eventCursor + 4) % ROULETTE_EVENTS.length].title);
          slots.push(first);
          styleSlots();
        }
        result = ROULETTE_EVENTS[(eventCursor + 2) % ROULETTE_EVENTS.length];
        slots[2].setText(result.title);
        resultLabel.setText('本轮事件');
        description.setText(result.description);
        buttonText.setText('结果确认中');
        this.scene.tweens.add({
          targets: slots[2],
          scaleX: 1.14,
          scaleY: 1.14,
          duration: 180,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.InOut',
        });
        this.scene.time.delayedCall(1400, () => {
          readyToConfirm = true;
          button.setAlpha(1);
          buttonText.setText('确定');
          if (auto) this.scene.time.delayedCall(2600, start);
        });
      };
      const resultLabel = this.createText(this.width / 2, 543, '', 14, { color: '#ffe17c', strokeThickness: 2 });
      const description = this.createText(this.width / 2, 578, '', 15, { color: '#ffffff', wrap: 342, strokeThickness: 2 });
      this.modalLayer.add([resultLabel, description]);
      const button = this.makeButton(this.modalLayer, this.width / 2, 704, 242, 56, '开始', start, { fontSize: 19 });
      const buttonText = button.list[1];
      if (auto) this.scene.time.delayedCall(600, start);
    });
  }

  showRules() {
    this.showEngineDice(false);
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(true);
    const wash = this.scene.add.image(this.width / 2, this.height / 2, 'ui-setup-panel')
      .setDisplaySize(520, 925).setAlpha(1);
    this.modalLayer.add([
      wash,
      this.createText(this.width / 2, 82, '游戏规则', 27, { color: '#0b2854', strokeThickness: 0 }),
    ]);
    const rules = [
      '第一次买地，之后依次建造 1、2、3 栋房屋，\n   再升级中国地标。',
      '集齐同色三城，该区过路费永久 ×2。',
      '支付过路费后，可用房产价值 2 倍强制收购。',
      '机会、命运与轮盘可获得免租、邀请、加成\n   和骰子控制卡。',
      '高铁可点击任意城市直接抵达。',
      '每次经过起点获得 $180；现金不足时可卖房卖地。',
      '最后存活者获胜；限时结束比较总资产。',
    ].map((line, index) => `${index + 1}. ${line}`).join('\n\n');
    this.modalLayer.add(this.createText(this.width / 2, 360, rules, 14.5, {
      color: '#213d66', strokeThickness: 0, align: 'left', wrap: 350, lineSpacing: 3,
    }));
    this.makeButton(this.modalLayer, this.width / 2, 704, 245, 54, '确定', () => this.hideModal(), { fontSize: 18 });
  }

  showPause() {
    this.showEngineDice(false);
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(true);
    this.makePanel(this.modalLayer, this.width / 2, this.height / 2, 350, 310, 0xffffff, 1);
    this.modalLayer.add(this.createText(this.width / 2, 330, '游戏暂停', 28, { color: '#0b2854', strokeThickness: 0 }));
    this.makeButton(this.modalLayer, this.width / 2, 410, 250, 54, '继续游戏', () => this.hideModal(), { fontSize: 18 });
    this.makeButton(this.modalLayer, this.width / 2, 480, 250, 54, '回到首页', () => this.handlers.onHome?.(), { fontSize: 17 });
  }

  showBankruptcy(player, auto = false) {
    this.hidePanel();
    this.showEngineDice(false);
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(true);
    const wash = this.scene.add.image(this.width / 2, this.height / 2, 'ui-setup-panel')
      .setDisplaySize(520, 925).setAlpha(1);
    const art = this.scene.add.image(this.width / 2, 300, 'bankruptcy-art').setDisplaySize(390, 390);
    this.modalLayer.add([wash, art,
      this.createText(this.width / 2, 530, `${player.name} 破产出局`, 28, { color: '#0b2854', strokeThickness: 0 }),
      this.createText(this.width / 2, 585, '土地与建筑已由银行收回', 15, { color: '#465d7d', strokeThickness: 0, wrap: 330 }),
    ]);
    return new Promise((resolve) => {
      const close = () => { this.hideModal(); resolve(); };
      this.makeButton(this.modalLayer, this.width / 2, 660, 240, 54, player.isHuman ? '继续观战' : '继续游戏', close, { fontSize: 17 });
      if (auto) this.scene.time.delayedCall(1800, close);
    });
  }

  showResults(ranking, tiles, reason) {
    this.hidePanel();
    this.showEngineDice(false);
    this.clear(this.modalLayer);
    this.modalLayer.setVisible(true);
    const wash = this.scene.add.image(this.width / 2, this.height / 2, 'ui-setup-panel')
      .setDisplaySize(520, 925).setAlpha(1);
    const art = this.scene.add.image(this.width / 2, 205, 'victory-art').setDisplaySize(360, 360);
    this.modalLayer.add([wash, art,
      this.createText(this.width / 2, 388, `${ranking[0].name} 成为房产首富！`, 24, { color: '#0b2854', strokeThickness: 0, wrap: 350 }),
      this.createText(this.width / 2, 430, reason, 12.5, { color: '#465d7d', strokeThickness: 0, wrap: 340 }),
    ]);
    ranking.forEach((player, index) => {
      const y = 476 + index * 50;
      const portrait = this.scene.add.image(90, y, 'roster', player.character.id).setDisplaySize(34, 46);
      const name = this.createText(125, y, `${index + 1}. ${player.name}${player.bankrupt ? ' 破产' : ''}`, 14, {
        originX: 0, color: '#213d66', strokeThickness: 0,
      });
      const score = this.createText(360, y, `$${money(netWorth(tiles, player))}`, 15, {
        originX: 1, color: '#b66c00', strokeThickness: 0,
      });
      this.modalLayer.add([portrait, name, score]);
    });
    this.makeButton(this.modalLayer, 145, 724, 170, 50, '再玩一局', () => this.handlers.onRematch?.(), { fontSize: 15 });
    this.makeButton(this.modalLayer, 305, 724, 170, 50, '回首页', () => this.handlers.onHome?.(), { fontSize: 15 });
  }
}
