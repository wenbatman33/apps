const MAIN_MENU_IMAGES = [
  { key: "main_menu_bg_clean", path: "assets/bg/bg_battlefield_clean.png" },
  { key: "main_menu_chu_idle", path: "assets/characters/chu/chu_idle.png" },
  { key: "main_menu_han_idle", path: "assets/characters/han/han_idle.png" },
  { key: "main_menu_yuji_idle", path: "assets/free_game/characters/yuji_idle.png" },
  { key: "main_menu_logo", path: "assets/logo/chuhan_logo_title.png" },
  { key: "button_start_game", path: "assets/main_menu/ui/button_start_game_gpt.png" },
  { key: "main_menu_tagline_frame", path: "assets/logo/info_bar.png" },
];

const MAIN_MENU_TEXT_PATH = "data/main_menu_text.json";

const MAIN_MENU_LAYOUT = {
  title: { x: 960, y: 128 },
  startButton: { x: 960, y: 805 },
  tagline: { x: 960, y: 988 },
};

const MAIN_MENU_LAYER_ORDER = [
  "main_menu_bg_clean",
  "main_menu_chu_idle",
  "main_menu_han_idle",
  "main_menu_yuji_idle",
  "main_menu_logo",
  "start_button",
  "start_button_text",
  "tagline_frame",
  "tagline_text",
];

const SYMBOL_IMAGES = [
  { key: "sym_gem_red", path: "assets/symbols/low/sym_gem_red.png" },
  { key: "sym_gem_yellow", path: "assets/symbols/low/sym_gem_yellow.png" },
  { key: "sym_gem_blue", path: "assets/symbols/low/sym_gem_blue.png" },
  { key: "sym_gem_green", path: "assets/symbols/low/sym_gem_green.png" },
  { key: "sym_gem_purple", path: "assets/symbols/low/sym_gem_purple.png" },
  { key: "sym_halberd", path: "assets/symbols/high/sym_halberd.png" },
  { key: "sym_tiger_tally", path: "assets/symbols/high/sym_tiger_tally.png" },
  { key: "sym_bonus_han_seal", path: "assets/symbols/special/sym_bonus_han_seal.png" },
  { key: "sym_scatter_phoenix_hairpin", path: "assets/symbols/special/sym_scatter_phoenix_hairpin.png" },
  { key: "sym_wild_dragon_jade", path: "assets/symbols/special/sym_wild_dragon_jade.png" },
];

const BASE_GAME_LAYER_IMAGES = [
  {
    key: "bg_battlefield_clean",
    path: "assets/bg/bg_battlefield_clean.png",
    depth: 0,
    x: 960,
    y: 540,
    width: 1920,
    height: 1080,
  },
  {
    key: "chu_idle",
    path: "assets/characters/chu/chu_idle.png",
    depth: 10,
    x: 238,
    y: 1311,
    height: 1240,
    originX: 0.5,
    originY: 1,
  },
  {
    key: "han_idle",
    path: "assets/characters/han/han_idle.png",
    depth: 20,
    x: 1690,
    y: 1360,
    height: 1240,
    originX: 0.5,
    originY: 1,
  },
  {
    key: "reel_bg",
    path: "assets/reel/reel_bg.png",
    depth: 80,
    x: 960,
    y: 572,
    width: 984,
    height: 632,
  },
  {
    key: "reel_separator",
    path: "assets/reel/reel_separator.png",
    depth: 90,
    type: "reel_separators",
    x: 960,
    y: 572,
    width: 18,
    height: 632,
  },
  {
    key: "reel_frame",
    path: "assets/reel/reel_frame.png",
    depth: 110,
    x: 960,
    y: 572,
    width: 1018,
    height: 676,
  },
  {
    key: "top_jackpot_panel",
    path: "assets/ui/panels/top_jackpot_panel.png",
    depth: 120,
    x: 960,
    y: 42,
    width: 1920,
    height: 76,
  },
  {
    key: "info_bar",
    path: "assets/logo/info_bar.png",
    depth: 130,
    x: 960,
    y: 142,
    width: 720,
    height: 91,
  },
  {
    key: "btn_settings_normal",
    path: "assets/ui/buttons/btn_settings_normal.png",
    depth: 150,
    x: 1868,
    y: 44,
    width: 58,
    height: 58,
  },
  {
    key: "bottom_hud_panel",
    path: "assets/ui/panels/bottom_hud_panel.png",
    depth: 140,
    x: 960,
    y: 1018,
    width: 1810,
    height: 129,
  },
  {
    key: "hud_controls",
    depth: 145,
    type: "hud_controls",
    assets: [
      { key: "player_avatar_chu", path: "assets/ui/hud/player_avatar_chu.png", x: 116, y: 1008, width: 74, height: 74 },
      { key: "icon_coin_stack", path: "assets/ui/hud/icon_coin_stack.png", x: 468, y: 1008, width: 66, height: 66 },
      { key: "btn_bet_minus_left", path: "assets/ui/hud/btn_bet_minus.png", x: 820, y: 1008, width: 62, height: 62 },
      { key: "btn_bet_minus_right", path: "assets/ui/hud/btn_bet_minus.png", x: 902, y: 1008, width: 62, height: 62 },
      { key: "btn_bet_plus", path: "assets/ui/hud/btn_bet_plus.png", x: 1194, y: 1008, width: 62, height: 62 },
      { key: "btn_max_bet", path: "assets/ui/hud/btn_max_bet.png", x: 1322, y: 1008, width: 156, height: 58 },
    ],
  },
  {
    key: "btn_spin_normal",
    path: "assets/ui/buttons/btn_spin_normal.png",
    depth: 155,
    x: 1602,
    y: 928,
    width: 210,
    height: 210,
  },
  {
    key: "side_buttons",
    depth: 150,
    type: "side_buttons",
    buttons: [
      { key: "btn_event_normal", path: "assets/ui/buttons/btn_event_normal.png", x: 1826, y: 452, width: 76, height: 76 },
      { key: "btn_fast_normal", path: "assets/ui/buttons/btn_fast_normal.png", x: 1826, y: 562, width: 76, height: 76 },
      { key: "btn_auto_normal", path: "assets/ui/buttons/btn_auto_normal.png", x: 1826, y: 672, width: 76, height: 76 },
      { key: "btn_menu_normal", path: "assets/ui/buttons/btn_menu_normal.png", x: 1826, y: 832, width: 76, height: 76 },
    ],
  },
];

const BASE_GAME_LAYER_ORDER = [
  "bg_battlefield_clean",
  "chu_idle",
  "han_idle",
  "reel_bg",
  "reel_separator",
  "symbols_6x5",
  "reel_frame",
  "top_jackpot_panel",
  "jackpot_text",
  "btn_settings_normal",
  "info_bar",
  "info_text",
  "bottom_hud_panel",
  "hud_controls",
  "hud_text",
  "btn_spin_normal",
  "side_buttons",
  "button_labels",
];

const FREE_GAME_IMAGES = [
  { key: "free_bg", path: "assets/bg/bg_battlefield_clean.png" },
  { key: "free_reel_bg", path: "assets/reel/reel_bg.png" },
  { key: "free_reel_separator", path: "assets/reel/reel_separator.png" },
  { key: "free_reel_frame", path: "assets/reel/reel_frame.png" },
  { key: "free_info_bar", path: "assets/logo/info_bar.png" },
  { key: "free_top_jackpot_panel", path: "assets/ui/panels/top_jackpot_panel.png" },
  { key: "free_bottom_hud_panel", path: "assets/ui/panels/bottom_hud_panel.png" },
  { key: "free_btn_spin_normal", path: "assets/ui/buttons/btn_spin_normal.png" },
  { key: "free_btn_settings_normal", path: "assets/ui/buttons/btn_settings_normal.png" },
  { key: "free_btn_event_normal", path: "assets/ui/buttons/btn_event_normal.png" },
  { key: "free_btn_fast_normal", path: "assets/ui/buttons/btn_fast_normal.png" },
  { key: "free_btn_auto_normal", path: "assets/ui/buttons/btn_auto_normal.png" },
  { key: "free_btn_menu_normal", path: "assets/ui/buttons/btn_menu_normal.png" },
  { key: "free_yuji_idle", path: "assets/free_game/characters/yuji_idle.png" },
  { key: "free_phoenix_wing_left", path: "assets/free_game/fx/phoenix_wing_left.png" },
  { key: "free_phoenix_wing_right", path: "assets/free_game/fx/phoenix_wing_right.png" },
  { key: "free_phoenix_back", path: "assets/free_game/fx/phoenix_back.png" },
  { key: "free_fengming_logo", path: "assets/free_game/ui/fengming_jiuxiao_logo.png" },
  { key: "free_word_metal", path: "assets/free_game/ui/free_word_metal.png" },
  { key: "game_word_metal", path: "assets/free_game/ui/game_word_metal.png" },
  { key: "gold_num_0", path: "numbers_gold/num_0.png" },
  { key: "gold_num_1", path: "numbers_gold/num_1.png" },
  { key: "gold_num_2", path: "numbers_gold/num_2.png" },
  { key: "gold_num_3", path: "numbers_gold/num_3.png" },
  { key: "gold_num_4", path: "numbers_gold/num_4.png" },
  { key: "gold_num_5", path: "numbers_gold/num_5.png" },
  { key: "gold_num_6", path: "numbers_gold/num_6.png" },
  { key: "gold_num_7", path: "numbers_gold/num_7.png" },
  { key: "gold_num_8", path: "numbers_gold/num_8.png" },
  { key: "gold_num_9", path: "numbers_gold/num_9.png" },
];

const FREE_GAME_LAYER_ORDER = [
  "free_bg",
  "free_phoenix_back",
  "free_yuji_idle",
  "free_reel_bg",
  "free_reel_separator",
  "free_symbols_6x5",
  "free_reel_frame",
  "free_top_ui",
  "free_info_bar",
  "free_bottom_hud",
  "free_side_buttons",
  "free_15x_text",
  "free_fengming_logo",
  "free_win_result",
];

const WIN_DEMO_IMAGES = [
  { key: "win_bg", path: "assets/win/bg/win_bg_award_clean.png" },
  { key: "win_chu_idle", path: "assets/characters/chu/chu_idle.png" },
  { key: "win_han_idle", path: "assets/characters/han/han_idle.png" },
  { key: "win_phoenix_back", path: "assets/free_game/fx/phoenix_back.png" },
  { key: "win_text_big", path: "text/win_text_big.png" },
  { key: "win_text_super", path: "text/win_text_super.png" },
  { key: "win_text_mega", path: "text/win_text_mega.png" },
  { key: "win_amount_frame", path: "assets/logo/title_plaque.png" },
  { key: "win_subtitle_frame", path: "assets/logo/info_bar.png" },
];

const WIN_DEMO_MODES = {
  big: {
    label: "BIG WIN",
    titleKey: "win_text_big",
    amount: 368000,
    titleWidth: 650,
    titleY: 310,
  },
  super: {
    label: "SUPER WIN",
    titleKey: "win_text_super",
    amount: 868000,
    titleWidth: 820,
    titleY: 310,
  },
  mega: {
    label: "MEGA WIN",
    titleKey: "win_text_mega",
    amount: 1368000,
    titleWidth: 900,
    titleY: 305,
  },
};

const WIN_DEMO_LAYER_ORDER = [
  "win_bg",
  "win_characters",
  "win_phoenix",
  "win_title",
  "win_amount_panel",
  "win_amount_text",
  "win_subtitle",
  "win_coins",
  "win_mode_buttons",
];

const WIN_COIN_SPRITESHEET = {
  key: "win_coin_fx",
  path: "assets/win/fx/coin_fx_sprites.png",
  frameWidth: 128,
  frameHeight: 160,
};

const REEL_COLUMNS = 6;
const REEL_ROWS = 5;
const REEL_CENTER_X = 960;
const REEL_CENTER_Y = 572;
const REEL_WIDTH = 984;
const REEL_HEIGHT = 632;
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
    this.layerObjects = new Map();
    this.layerVisibility = new Map();
  }

  preload() {
    MAIN_MENU_IMAGES.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });

    this.load.json("main_menu_text", MAIN_MENU_TEXT_PATH);
  }

  create() {
    this.createMainMenuLayers();

    const textConfig = this.cache.json.get("main_menu_text");
    this.createTaglineBar();
    this.createDynamicTagline(textConfig);
    this.createStartButton(textConfig);
    this.createMainMenuLayerControls();
  }

  registerMainMenuLayer(key, objects) {
    this.layerObjects.set(key, Array.isArray(objects) ? objects : [objects]);
    if (!this.layerVisibility.has(key)) this.layerVisibility.set(key, true);
  }

  createMainMenuLayers() {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "main_menu_bg_clean")
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);
    this.registerMainMenuLayer("main_menu_bg_clean", bg);

    const chu = this.add.image(270, 1378, "main_menu_chu_idle")
      .setOrigin(0.5, 1)
      .setDisplaySize(792, 1220)
      .setDepth(10);
    this.registerMainMenuLayer("main_menu_chu_idle", chu);

    const han = this.add.image(960, 1378, "main_menu_han_idle")
      .setOrigin(0.5, 1)
      .setDisplaySize(622, 1220)
      .setDepth(12);
    this.registerMainMenuLayer("main_menu_han_idle", han);

    const yuji = this.add.image(1620, 1385, "main_menu_yuji_idle")
      .setOrigin(0.5, 1)
      .setDisplaySize(702, 1220)
      .setDepth(14);
    this.registerMainMenuLayer("main_menu_yuji_idle", yuji);

    const logo = this.add.image(MAIN_MENU_LAYOUT.title.x, MAIN_MENU_LAYOUT.title.y, "main_menu_logo")
      .setDisplaySize(640, 247)
      .setDepth(70);
    this.registerMainMenuLayer("main_menu_logo", logo);
  }

  createTaglineBar() {
    const taglineFrame = this.add.image(MAIN_MENU_LAYOUT.tagline.x, MAIN_MENU_LAYOUT.tagline.y, "main_menu_tagline_frame")
      .setDepth(88)
      .setDisplaySize(1240, 157);
    this.registerMainMenuLayer("tagline_frame", taglineFrame);
  }

  createStartButton(textConfig) {
    const { x, y } = MAIN_MENU_LAYOUT.startButton;
    const startButton = this.add.image(x, y, "button_start_game")
      .setDepth(100)
      .setDisplaySize(420, 198)
      .setInteractive({ useHandCursor: true });

    const startText = this.add.text(x, y + 2, textConfig.startButton, {
      fontFamily: "\"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif",
      fontSize: "42px",
      fontStyle: "900",
      color: "#ffe996",
      stroke: "#4a1908",
      strokeThickness: 8,
      align: "center",
      resolution: 2,
    })
      .setOrigin(0.5)
      .setDepth(101);

    const setButtonScale = (width, height) => {
      startButton.setDisplaySize(width, height);
      startText.setScale(width / 420);
    };

    startButton.on("pointerover", () => {
      setButtonScale(440, 208);
    });

    startButton.on("pointerout", () => {
      setButtonScale(420, 198);
    });

    startButton.on("pointerdown", () => {
      setButtonScale(404, 190);
    });

    startButton.on("pointerup", () => {
      setButtonScale(420, 198);
      document.getElementById("base-game-title")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    this.registerMainMenuLayer("start_button", startButton);
    this.registerMainMenuLayer("start_button_text", startText);
  }

  createDynamicTagline(textConfig) {
    const { x, y } = MAIN_MENU_LAYOUT.tagline;

    const taglineText = this.add.text(x, y, textConfig.tagline, {
      fontFamily: "\"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif",
      fontSize: "34px",
      fontStyle: "900",
      color: "#ffe996",
      stroke: "#4a1908",
      strokeThickness: 7,
      align: "center",
      resolution: 2,
    })
      .setOrigin(0.5)
      .setDepth(91);
    this.registerMainMenuLayer("tagline_text", taglineText);
  }

  createMainMenuLayerControls() {
    const layerList = document.getElementById("main-menu-layer-list");
    if (!layerList) return;

    layerList.innerHTML = "";
    MAIN_MENU_LAYER_ORDER.forEach((key) => {
      const item = document.createElement("li");
      item.dataset.layerKey = key;

      const label = document.createElement("span");
      label.textContent = key;

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "layer-eye-button";
      toggleButton.dataset.layerKey = key;
      toggleButton.addEventListener("click", () => this.toggleMainMenuLayer(key));

      item.append(toggleButton, label);
      layerList.appendChild(item);
    });

    this.updateMainMenuLayerVisibility();
  }

  toggleMainMenuLayer(key) {
    this.layerVisibility.set(key, !this.layerVisibility.get(key));
    this.updateMainMenuLayerVisibility();
  }

  updateMainMenuLayerVisibility() {
    MAIN_MENU_LAYER_ORDER.forEach((key) => {
      const visible = this.layerVisibility.get(key);
      const objects = this.layerObjects.get(key) || [];
      objects.forEach((object) => object.setVisible(visible));
    });

    document.querySelectorAll("#main-menu-layer-list li").forEach((item) => {
      const key = item.dataset.layerKey;
      const visible = this.layerVisibility.get(key);
      const toggleButton = item.querySelector(".layer-eye-button");
      item.classList.toggle("active", visible);
      item.classList.toggle("hidden-layer", !visible);

      if (toggleButton) {
        toggleButton.textContent = visible ? "◎" : "○";
        toggleButton.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${key}`);
        toggleButton.title = `${visible ? "Hide" : "Show"} ${key}`;
      }
    });

    const status = document.getElementById("main-menu-layer-status");
    if (status) {
      const visibleCount = MAIN_MENU_LAYER_ORDER.filter((key) => this.layerVisibility.get(key)).length;
      status.textContent = `Showing ${visibleCount}/${MAIN_MENU_LAYER_ORDER.length} layers`;
    }
  }
}

class BaseGameScene extends Phaser.Scene {
  constructor() {
    super("BaseGameScene");
    this.symbols = [];
    this.layerObjects = new Map();
    this.layerVisibility = new Map();
    this.isSpinning = false;
    this.visibleLayerIndex = BASE_GAME_LAYER_ORDER.length - 1;
  }

  preload() {
    const sideButtonAssets = BASE_GAME_LAYER_IMAGES
      .filter((asset) => asset.type === "side_buttons")
      .flatMap((asset) => asset.buttons);
    const hudControlAssets = BASE_GAME_LAYER_IMAGES
      .filter((asset) => asset.type === "hud_controls")
      .flatMap((asset) => asset.assets);

    [...BASE_GAME_LAYER_IMAGES, ...sideButtonAssets, ...hudControlAssets, ...SYMBOL_IMAGES].forEach((asset) => {
      if (!asset.path) return;
      this.load.image(asset.key, asset.path);
    });
  }

  create() {
    this.createLayerImages();
    this.createReelSymbols();
    this.createTextLayers();
    this.createLayerControls();
    this.exposeControls();
  }

  createLayerImages() {
    BASE_GAME_LAYER_IMAGES.forEach((asset) => {
      if (asset.type === "reel_separators") {
        this.createReelSeparators(asset);
        return;
      }

      if (asset.type === "side_buttons") {
        this.createSideButtons(asset);
        return;
      }

      if (asset.type === "hud_controls") {
        this.createHudControls(asset);
        return;
      }

      const image = this.add.image(asset.x, asset.y, asset.key)
        .setDepth(asset.depth);

      image.setOrigin(asset.originX ?? 0.5, asset.originY ?? 0.5);

      if (asset.width && asset.height) {
        image.setDisplaySize(asset.width, asset.height);
      } else if (asset.height) {
        image.setDisplaySize(image.width * (asset.height / image.height), asset.height);
      }

      if (asset.key === "btn_spin_normal") {
        image.setInteractive({ useHandCursor: true });
        image.on("pointerup", () => this.spinReels());
      }

      this.layerObjects.set(asset.key, [image]);
      this.layerVisibility.set(asset.key, true);
    });
  }

  createReelSeparators(asset) {
    const cellWidth = REEL_WIDTH / REEL_COLUMNS;
    const startX = REEL_CENTER_X - REEL_WIDTH / 2;
    const separators = [];

    for (let column = 1; column < REEL_COLUMNS; column += 1) {
      const separator = this.add.image(startX + column * cellWidth, asset.y, asset.key)
        .setDepth(asset.depth)
        .setDisplaySize(asset.width, asset.height);

      separators.push(separator);
    }

    this.layerObjects.set(asset.key, separators);
    this.layerVisibility.set(asset.key, true);
  }

  createSideButtons(asset) {
    const buttons = asset.buttons.map((button) => this.add.image(button.x, button.y, button.key)
      .setDepth(asset.depth)
      .setDisplaySize(button.width, button.height)
      .setInteractive({ useHandCursor: true }));

    this.layerObjects.set(asset.key, buttons);
    this.layerVisibility.set(asset.key, true);
  }

  createHudControls(asset) {
    const controls = asset.assets.map((item) => this.add.image(item.x, item.y, item.key)
      .setDepth(asset.depth)
      .setDisplaySize(item.width, item.height)
      .setInteractive({ useHandCursor: true }));

    this.layerObjects.set(asset.key, controls);
    this.layerVisibility.set(asset.key, true);
  }

  createReelSymbols() {
    const cellWidth = REEL_WIDTH / REEL_COLUMNS;
    const cellHeight = REEL_HEIGHT / REEL_ROWS;
    const startX = REEL_CENTER_X - REEL_WIDTH / 2 + cellWidth / 2;
    const startY = REEL_CENTER_Y - REEL_HEIGHT / 2 + cellHeight / 2;
    const symbolSize = Math.min(cellWidth, cellHeight) - 6;
    const textureKeys = SYMBOL_IMAGES.map((asset) => asset.key);

    for (let row = 0; row < REEL_ROWS; row += 1) {
      for (let column = 0; column < REEL_COLUMNS; column += 1) {
        const textureIndex = (row * REEL_COLUMNS + column) % textureKeys.length;
        const symbol = this.add.image(
          startX + column * cellWidth,
          startY + row * cellHeight,
          textureKeys[textureIndex],
        )
          .setDepth(100)
          .setDisplaySize(symbolSize, symbolSize);

        symbol.setData("homeY", symbol.y);
        symbol.setData("textureIndex", textureIndex);
        this.symbols.push(symbol);
      }
    }

    this.layerObjects.set("symbols_6x5", this.symbols);
    this.layerVisibility.set("symbols_6x5", true);
  }

  createTextLayers() {
    this.createJackpotTextLayer();
    this.createInfoTextLayer();
    this.createHudTextLayer();
    this.createButtonLabelLayer();
  }

  createText(x, y, text, size, depth, options = {}) {
    return this.add.text(x, y, text, {
      fontFamily: "\"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif",
      fontSize: `${size}px`,
      fontStyle: options.fontStyle ?? "900",
      color: options.color ?? "#ffe58d",
      stroke: options.stroke ?? "#2a0908",
      strokeThickness: options.strokeThickness ?? 5,
      align: "center",
      resolution: 2,
    })
      .setOrigin(options.originX ?? 0.5, options.originY ?? 0.5)
      .setDepth(depth);
  }

  createJackpotTextLayer() {
    const labels = [
      { label: "GRAND", value: "250,000.00", x: 250 },
      { label: "MAJOR", value: "50,000.00", x: 960 },
      { label: "MINOR", value: "2,000.00", x: 1520 },
    ];

    const objects = labels.flatMap((item) => [
      this.createText(item.x - 92, 44, item.label, 27, 121, { color: "#ffdf55", strokeThickness: 4 }),
      this.createText(item.x + 112, 44, item.value, 27, 121, { color: "#ffffff", stroke: "#2b1334", strokeThickness: 3 }),
    ]);

    this.layerObjects.set("jackpot_text", objects);
    this.layerVisibility.set("jackpot_text", true);
  }

  createInfoTextLayer() {
    const objects = [
      this.createText(960, 143, "出現 WILD 可乘上贏分", 34, 131, {
        color: "#ffe894",
        stroke: "#08352f",
        strokeThickness: 5,
      }),
    ];

    this.layerObjects.set("info_text", objects);
    this.layerVisibility.set("info_text", true);
  }

  createHudTextLayer() {
    const objects = [
      this.createText(210, 990, "玩家123456", 25, 146, { color: "#ffffff", strokeThickness: 3 }),
      this.createText(212, 1030, "LV. 88", 28, 146, { color: "#ffdf5a", strokeThickness: 3 }),
      this.createText(625, 990, "86,971.00", 34, 146, { color: "#ffffff", strokeThickness: 4 }),
      this.createText(625, 1033, "餘額", 22, 146, { color: "#d8c399", strokeThickness: 3 }),
      this.createText(1060, 990, "80.00", 34, 146, { color: "#ffffff", strokeThickness: 4 }),
      this.createText(1060, 1033, "總押注", 22, 146, { color: "#d8c399", strokeThickness: 3 }),
      this.createText(1322, 1008, "最大押注", 25, 146, { color: "#ffe55f", stroke: "#551342", strokeThickness: 4 }),
    ];

    this.layerObjects.set("hud_text", objects);
    this.layerVisibility.set("hud_text", true);
  }

  createButtonLabelLayer() {
    const objects = [
      this.createText(1826, 495, "活動", 20, 156, { color: "#ffe55f", strokeThickness: 3 }),
      this.createText(1826, 605, "快速", 20, 156, { color: "#ffe55f", strokeThickness: 3 }),
      this.createText(1826, 715, "自動", 20, 156, { color: "#ffe55f", strokeThickness: 3 }),
    ];

    this.layerObjects.set("button_labels", objects);
    this.layerVisibility.set("button_labels", true);
  }

  createLayerControls() {
    const layerList = document.getElementById("base-game-layer-list");
    if (!layerList) return;

    layerList.innerHTML = "";
    BASE_GAME_LAYER_ORDER.forEach((key) => {
      const item = document.createElement("li");
      item.dataset.layerKey = key;

      const label = document.createElement("span");
      label.textContent = key;

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "layer-eye-button";
      toggleButton.dataset.layerKey = key;
      toggleButton.addEventListener("click", () => {
        this.toggleLayer(key);
      });

      item.append(toggleButton, label);
      layerList.appendChild(item);
    });

    this.updateLayerVisibility();
  }

  exposeControls() {
    window.baseGamePreview = {
      spin: () => {
        this.spinReels();
      },
      showAllLayers: () => {
        BASE_GAME_LAYER_ORDER.forEach((key) => this.layerVisibility.set(key, true));
        this.updateLayerVisibility();
      },
      showNextLayer: () => {
        const nextHiddenLayer = BASE_GAME_LAYER_ORDER.find((key) => !this.layerVisibility.get(key));
        if (nextHiddenLayer) this.layerVisibility.set(nextHiddenLayer, true);
        this.updateLayerVisibility();
      },
      clearLayers: () => {
        BASE_GAME_LAYER_ORDER.forEach((key) => this.layerVisibility.set(key, false));
        this.updateLayerVisibility();
      },
      toggleLayer: (key) => this.toggleLayer(key),
    };
  }

  toggleLayer(key) {
    this.layerVisibility.set(key, !this.layerVisibility.get(key));
    this.updateLayerVisibility();
  }

  updateLayerVisibility() {
    BASE_GAME_LAYER_ORDER.forEach((key) => {
      const visible = this.layerVisibility.get(key);
      const objects = this.layerObjects.get(key) || [];
      objects.forEach((object) => object.setVisible(visible));
    });

    document.querySelectorAll("#base-game-layer-list li").forEach((item) => {
      const key = item.dataset.layerKey;
      const visible = this.layerVisibility.get(key);
      const toggleButton = item.querySelector(".layer-eye-button");
      item.classList.toggle("active", visible);
      item.classList.toggle("hidden-layer", !visible);

      if (toggleButton) {
        toggleButton.textContent = visible ? "◎" : "○";
        toggleButton.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${key}`);
        toggleButton.title = `${visible ? "Hide" : "Show"} ${key}`;
      }
    });

    const status = document.getElementById("layer-status");
    if (status) {
      const visibleCount = BASE_GAME_LAYER_ORDER.filter((key) => this.layerVisibility.get(key)).length;
      status.textContent = visibleCount === 0
        ? "All layers hidden"
        : `Showing ${visibleCount}/${BASE_GAME_LAYER_ORDER.length} layers`;
    }
  }

  spinReels() {
    if (this.isSpinning) return;

    this.isSpinning = true;
    const status = document.getElementById("spin-status");
    if (status) status.textContent = "Spinning";

    const textureKeys = SYMBOL_IMAGES.map((asset) => asset.key);
    this.symbols.forEach((symbol, index) => {
      const delay = (index % REEL_COLUMNS) * 90 + Math.floor(index / REEL_COLUMNS) * 18;
      const nextTextureIndex = (symbol.getData("textureIndex") + 1 + index) % textureKeys.length;
      symbol.setData("textureIndex", nextTextureIndex);

      this.tweens.add({
        targets: symbol,
        y: symbol.getData("homeY") + 36,
        alpha: 0.35,
        duration: 120,
        delay,
        yoyo: true,
        ease: "Sine.easeInOut",
        onYoyo: () => {
          symbol.setTexture(textureKeys[nextTextureIndex]);
        },
        onComplete: () => {
          symbol.setAlpha(0.92);
          if (index === this.symbols.length - 1) {
            this.isSpinning = false;
            if (status) status.textContent = "Ready";
          }
        },
      });
    });
  }
}

class FreeGameScene extends Phaser.Scene {
  constructor() {
    super("FreeGameScene");
    this.freeSymbols = [];
    this.layerObjects = new Map();
    this.layerVisibility = new Map();
    this.freeGamesCount = 15;
    this.freeGamesCounter = { value: 15 };
    this.freeGamesNumberSprites = [];
    this.freeGamesTextLayer = [];
  }

  preload() {
    [...FREE_GAME_IMAGES, ...SYMBOL_IMAGES].forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });
  }

  create() {
    const bg = this.add.image(960, 540, "free_bg")
      .setDisplaySize(1920, 1080)
      .setDepth(0);
    this.registerFreeLayer("free_bg", bg);

    this.createYujiAndPhoenix();
    this.createFreeReels();
    this.createFreeHud();
    this.createFreeGameText();
    this.createFreeIntroTitle();
    this.createWinResult();
    this.createFreeLayerControls();
    this.exposeFreeGameControls();
  }

  registerFreeLayer(key, objects) {
    this.layerObjects.set(key, Array.isArray(objects) ? objects : [objects]);
    if (!this.layerVisibility.has(key)) this.layerVisibility.set(key, true);
  }

  createFreeText(x, y, text, size, depth, options = {}) {
    return this.add.text(x, y, text, {
      fontFamily: "\"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif",
      fontSize: `${size}px`,
      fontStyle: options.fontStyle ?? "900",
      color: options.color ?? "#ffe58d",
      stroke: options.stroke ?? "#2a0908",
      strokeThickness: options.strokeThickness ?? 5,
      align: "center",
      resolution: 2,
    })
      .setOrigin(options.originX ?? 0.5, options.originY ?? 0.5)
      .setDepth(depth);
  }

  createFreeReels() {
    const reelBg = this.add.image(REEL_CENTER_X, REEL_CENTER_Y, "free_reel_bg")
      .setDisplaySize(REEL_WIDTH, REEL_HEIGHT)
      .setDepth(40)
      .setAlpha(0.72);
    this.registerFreeLayer("free_reel_bg", reelBg);

    const cellWidth = REEL_WIDTH / REEL_COLUMNS;
    const startX = REEL_CENTER_X - REEL_WIDTH / 2;
    const separators = [];
    for (let column = 1; column < REEL_COLUMNS; column += 1) {
      const separator = this.add.image(startX + column * cellWidth, REEL_CENTER_Y, "free_reel_separator")
        .setDisplaySize(18, REEL_HEIGHT)
        .setDepth(45)
        .setAlpha(0.74);
      separators.push(separator);
    }
    this.registerFreeLayer("free_reel_separator", separators);

    const textureKeys = SYMBOL_IMAGES.map((asset) => asset.key);
    const cellHeight = REEL_HEIGHT / REEL_ROWS;
    const symbolStartX = REEL_CENTER_X - REEL_WIDTH / 2 + cellWidth / 2;
    const symbolStartY = REEL_CENTER_Y - REEL_HEIGHT / 2 + cellHeight / 2;
    const symbolSize = Math.min(cellWidth, cellHeight) - 6;
    for (let row = 0; row < REEL_ROWS; row += 1) {
      for (let column = 0; column < REEL_COLUMNS; column += 1) {
        const textureIndex = (row * REEL_COLUMNS + column + 8) % textureKeys.length;
        const symbol = this.add.image(
          symbolStartX + column * cellWidth,
          symbolStartY + row * cellHeight,
          textureKeys[textureIndex],
        )
          .setDisplaySize(symbolSize, symbolSize)
          .setDepth(50)
          .setAlpha(textureKeys[textureIndex].includes("scatter") ? 0.98 : 0.36);

        this.freeSymbols.push(symbol);
      }
    }
    this.registerFreeLayer("free_symbols_6x5", this.freeSymbols);

    const reelFrame = this.add.image(REEL_CENTER_X, REEL_CENTER_Y, "free_reel_frame")
      .setDisplaySize(1018, 676)
      .setDepth(60);
    this.registerFreeLayer("free_reel_frame", reelFrame);
  }

  createFreeHud() {
    const topUi = [
      this.add.image(960, 42, "free_top_jackpot_panel")
      .setDisplaySize(1920, 76)
      .setDepth(70),
      this.createFreeText(158, 44, "GRAND", 27, 71, { color: "#ffdf55", strokeThickness: 4 }),
      this.createFreeText(370, 44, "250,000.00", 27, 71, { color: "#ffffff", stroke: "#2b1334", strokeThickness: 3 }),
      this.createFreeText(870, 44, "MAJOR", 27, 71, { color: "#ffdf55", strokeThickness: 4 }),
      this.createFreeText(1086, 44, "50,000.00", 27, 71, { color: "#ffffff", stroke: "#2b1334", strokeThickness: 3 }),
      this.createFreeText(1392, 44, "MINOR", 27, 71, { color: "#ffdf55", strokeThickness: 4 }),
      this.createFreeText(1640, 44, "2,000.00", 27, 71, { color: "#ffffff", stroke: "#2b1334", strokeThickness: 3 }),
      this.add.image(1868, 44, "free_btn_settings_normal")
        .setDisplaySize(58, 58)
        .setDepth(76),
    ];
    this.registerFreeLayer("free_top_ui", topUi);

    const infoBar = [
      this.add.image(960, 142, "free_info_bar")
      .setDisplaySize(720, 91)
      .setDepth(72),
      this.createFreeText(960, 143, "出現 WILD 可乘上贏分", 34, 73, {
      color: "#ffe894",
      stroke: "#08352f",
      strokeThickness: 5,
      }),
    ];
    this.registerFreeLayer("free_info_bar", infoBar);

    const bottomHud = [
      this.add.image(960, 1018, "free_bottom_hud_panel")
      .setDisplaySize(1810, 129)
      .setDepth(74),
      this.add.image(1602, 928, "free_btn_spin_normal")
      .setDisplaySize(210, 210)
      .setDepth(82),
    ];
    this.registerFreeLayer("free_bottom_hud", bottomHud);

    const sideButtons = [
      ["free_btn_event_normal", 1826, 452],
      ["free_btn_fast_normal", 1826, 562],
      ["free_btn_auto_normal", 1826, 672],
      ["free_btn_menu_normal", 1826, 832],
    ].map(([key, x, y]) => this.add.image(x, y, key)
        .setDisplaySize(76, 76)
        .setDepth(78));
    this.registerFreeLayer("free_side_buttons", sideButtons);
  }

  createYujiAndPhoenix() {
    const phoenix = this.add.image(1460, 390, "free_phoenix_back")
      .setDisplaySize(690, 388)
      .setDepth(8)
      .setAlpha(0.42);

    const yuji = this.add.image(1525, 1450, "free_yuji_idle")
      .setOrigin(0.5, 1)
      .setDisplaySize(760, 1320)
      .setDepth(12);

    this.registerFreeLayer("free_phoenix_back", phoenix);
    this.registerFreeLayer("free_yuji_idle", yuji);

    this.tweens.add({
      targets: phoenix,
      angle: 1.4,
      scaleX: 1.025,
      scaleY: 0.99,
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createFreeGameText() {
    this.freeGamesNumberSprites = [];
    this.freeGamesTextLayer = [];

    const freeWord = this.add.image(170, 720, "free_word_metal")
      .setDisplaySize(210, 82)
      .setDepth(95);

    const gameWord = this.add.image(170, 820, "game_word_metal")
      .setDisplaySize(218, 78)
      .setDepth(95);

    this.freeGamesTextLayer.push(freeWord, gameWord);
    this.renderFreeGamesNumber(this.freeGamesCount);

    this.registerFreeLayer("free_15x_text", this.freeGamesTextLayer);
  }

  renderFreeGamesNumber(value) {
    const digits = String(Math.max(0, Math.round(value))).split("");
    const targetX = 170;
    const digitHeight = 100;
    const digitGap = -2;
    const targetY = 620;
    const totalWidth = digits.reduce((sum, digit) => {
      const texture = this.textures.get(`gold_num_${digit}`).getSourceImage();
      return sum + texture.width * (digitHeight / texture.height) + digitGap;
    }, 0) - digitGap;
    let cursorX = targetX - totalWidth / 2;

    this.freeGamesNumberSprites.forEach((sprite) => sprite.destroy());
    this.freeGamesNumberSprites = [];

    digits.forEach((digit) => {
      const texture = this.textures.get(`gold_num_${digit}`).getSourceImage();
      const width = texture.width * (digitHeight / texture.height);
      const sprite = this.add.image(cursorX + width / 2, targetY, `gold_num_${digit}`)
        .setDisplaySize(width, digitHeight)
        .setDepth(96);
      this.freeGamesNumberSprites.push(sprite);
      cursorX += width + digitGap;
    });

    this.freeGamesTextLayer = [
      ...this.freeGamesTextLayer.filter((object) => object.active && !object.texture?.key?.startsWith("gold_num_")),
      ...this.freeGamesNumberSprites,
    ];
    this.layerObjects.set("free_15x_text", this.freeGamesTextLayer);
    this.updateFreeLayerVisibility();
  }

  setFreeGamesCount(value) {
    const nextValue = Math.max(0, Math.round(value));
    this.freeGamesCount = nextValue;
    this.freeGamesCounter.value = nextValue;
    this.renderFreeGamesNumber(nextValue);
  }

  animateFreeGamesCount(targetValue, duration = 600) {
    const nextValue = Math.max(0, Math.round(targetValue));
    this.tweens.killTweensOf(this.freeGamesCounter);
    this.tweens.add({
      targets: this.freeGamesCounter,
      value: nextValue,
      duration,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.renderFreeGamesNumber(this.freeGamesCounter.value);
      },
      onComplete: () => {
        this.setFreeGamesCount(nextValue);
      },
    });
  }

  addFreeGamesCount(delta) {
    this.animateFreeGamesCount(this.freeGamesCount + delta);
  }

  countdownFreeGamesCount() {
    this.addFreeGamesCount(-1);
  }

  createFreeIntroTitle() {
    const logo = this.add.image(960, 370, "free_fengming_logo")
      .setDepth(110)
      .setAlpha(0)
      .setScale(0.34);

    this.tweens.add({
      targets: logo,
      alpha: 1,
      scale: 0.42,
      duration: 420,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 900,
      delay: 250,
    });
    this.registerFreeLayer("free_fengming_logo", logo);
  }

  createWinResult() {
    const resultText = this.createFreeText(960, 575, "贏得獎金 1,286,400", 64, 115, {
      color: "#fff3a3",
      stroke: "#5a1402",
      strokeThickness: 9,
    }).setAlpha(0);

    this.tweens.add({
      targets: resultText,
      alpha: 1,
      scale: 1.08,
      duration: 500,
      delay: 5200,
      ease: "Back.easeOut",
    });
    this.registerFreeLayer("free_win_result", resultText);
  }

  exposeFreeGameControls() {
    window.freeGamePreview = {
      getFreeGames: () => this.freeGamesCount,
      setFreeGames: (value) => this.animateFreeGamesCount(value),
      addFreeGames: (delta = 1) => this.addFreeGamesCount(delta),
      countdownFreeGames: () => this.countdownFreeGamesCount(),
      resetFreeGames: () => this.animateFreeGamesCount(15),
      toggleLayer: (key) => this.toggleFreeLayer(key),
    };
  }

  createFreeLayerControls() {
    const layerList = document.getElementById("free-game-layer-list");
    if (!layerList) return;

    layerList.innerHTML = "";
    FREE_GAME_LAYER_ORDER.forEach((key) => {
      const item = document.createElement("li");
      item.dataset.layerKey = key;

      const label = document.createElement("span");
      label.textContent = key;

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "layer-eye-button";
      toggleButton.dataset.layerKey = key;
      toggleButton.addEventListener("click", () => {
        this.toggleFreeLayer(key);
      });

      item.append(toggleButton, label);
      layerList.appendChild(item);
    });

    this.updateFreeLayerVisibility();
  }

  toggleFreeLayer(key) {
    this.layerVisibility.set(key, !this.layerVisibility.get(key));
    this.updateFreeLayerVisibility();
  }

  updateFreeLayerVisibility() {
    FREE_GAME_LAYER_ORDER.forEach((key) => {
      const visible = this.layerVisibility.get(key);
      const objects = this.layerObjects.get(key) || [];
      objects.forEach((object) => object.setVisible(visible));
    });

    document.querySelectorAll("#free-game-layer-list li").forEach((item) => {
      const key = item.dataset.layerKey;
      const visible = this.layerVisibility.get(key);
      const toggleButton = item.querySelector(".layer-eye-button");
      item.classList.toggle("active", visible);
      item.classList.toggle("hidden-layer", !visible);
      if (toggleButton) {
        toggleButton.textContent = visible ? "◎" : "○";
        toggleButton.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${key}`);
        toggleButton.title = `${visible ? "Hide" : "Show"} ${key}`;
      }
    });

    const status = document.getElementById("free-layer-status");
    if (status) {
      const visibleCount = FREE_GAME_LAYER_ORDER.filter((key) => this.layerVisibility.get(key)).length;
      status.textContent = `Showing ${visibleCount}/${FREE_GAME_LAYER_ORDER.length} layers`;
    }
  }
}

class WinDemoScene extends Phaser.Scene {
  constructor() {
    super("WinDemoScene");
    this.layerObjects = new Map();
    this.layerVisibility = new Map();
    this.amountCounter = { value: 0 };
    this.currentMode = "mega";
  }

  preload() {
    WIN_DEMO_IMAGES.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });
    this.load.spritesheet(WIN_COIN_SPRITESHEET.key, WIN_COIN_SPRITESHEET.path, {
      frameWidth: WIN_COIN_SPRITESHEET.frameWidth,
      frameHeight: WIN_COIN_SPRITESHEET.frameHeight,
    });
  }

  create() {
    this.createWinStage();
    this.createWinControls();
    this.createWinLayerControls();
    this.setWinMode(this.currentMode);
  }

  registerWinLayer(key, objects) {
    this.layerObjects.set(key, Array.isArray(objects) ? objects : [objects]);
    if (!this.layerVisibility.has(key)) this.layerVisibility.set(key, true);
  }

  createWinText(x, y, text, size, depth, options = {}) {
    return this.add.text(x, y, text, {
      fontFamily: "\"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif",
      fontSize: `${size}px`,
      fontStyle: options.fontStyle ?? "900",
      color: options.color ?? "#ffe58d",
      stroke: options.stroke ?? "#2a0908",
      strokeThickness: options.strokeThickness ?? 5,
      align: "center",
      resolution: 2,
    })
      .setOrigin(options.originX ?? 0.5, options.originY ?? 0.5)
      .setDepth(depth);
  }

  createWinStage() {
    const bg = this.add.image(960, 540, "win_bg")
      .setDisplaySize(1920, 1080)
      .setDepth(0);
    this.registerWinLayer("win_bg", bg);

    const characters = [
      this.add.image(230, 1210, "win_chu_idle")
        .setOrigin(0.5, 1)
        .setDisplaySize(610, 940)
        .setDepth(10)
        .setAlpha(0.94),
      this.add.image(1690, 1210, "win_han_idle")
        .setOrigin(0.5, 1)
        .setDisplaySize(520, 1020)
        .setDepth(10)
        .setAlpha(0.94),
    ];
    this.registerWinLayer("win_characters", characters);

    const phoenix = this.add.image(960, 236, "win_phoenix_back")
      .setDisplaySize(680, 382)
      .setDepth(20)
      .setAlpha(0.34);
    this.registerWinLayer("win_phoenix", phoenix);
    this.tweens.add({
      targets: phoenix,
      y: 226,
      alpha: 0.42,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.titleImage = this.add.image(960, 305, "win_text_mega")
      .setDepth(40)
      .setDisplaySize(900, 197);
    this.registerWinLayer("win_title", this.titleImage);
    this.tweens.add({
      targets: this.titleImage,
      scale: 1.075,
      alpha: 0.82,
      duration: 540,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const amountPanel = this.add.image(960, 545, "win_amount_frame")
      .setDisplaySize(1180, 230)
      .setDepth(45);
    this.registerWinLayer("win_amount_panel", amountPanel);

    this.amountText = this.createWinText(960, 548, "0.00", 106, 46, {
      color: "#fff4a6",
      stroke: "#7a1203",
      strokeThickness: 10,
    });
    this.registerWinLayer("win_amount_text", this.amountText);

    const subtitleObjects = [
      this.add.image(960, 725, "win_subtitle_frame")
        .setDisplaySize(860, 109)
        .setDepth(48),
      this.createWinText(960, 726, "鳳鳴九霄　獎勵翻倍！", 42, 49, {
        color: "#ffe893",
        stroke: "#063833",
        strokeThickness: 6,
      }),
    ];
    this.registerWinLayer("win_subtitle", subtitleObjects);

    this.createCoinThrowLayer();

    const modeLabels = [
      this.createWinText(780, 875, "BIG", 28, 60, { color: "#ffe893", strokeThickness: 4 }),
      this.createWinText(960, 875, "SUPER", 28, 60, { color: "#ffe893", strokeThickness: 4 }),
      this.createWinText(1160, 875, "MEGA", 28, 60, { color: "#ffe893", strokeThickness: 4 }),
    ];
    this.registerWinLayer("win_mode_buttons", modeLabels);
  }

  createCoinThrowLayer() {
    const coins = [];
    const lanes = [
      60, 140, 240, 360, 510, 660, 810, 960,
      1110, 1260, 1410, 1560, 1700, 1815,
    ];

    lanes.forEach((x, index) => {
      const coin = this.add.sprite(x, 1140 + (index % 4) * 38, "win_coin_fx", index % 8)
        .setDepth(36)
        .setScale(0.58 + (index % 4) * 0.08)
        .setAlpha(0.96);
      coins.push(coin);
      this.launchWinCoin(coin, index * 85);
    });

    this.registerWinLayer("win_coins", coins);
  }

  launchWinCoin(coin, delay = 0) {
    const baseX = coin.getData("baseX") ?? coin.x;
    coin.setData("baseX", baseX);
    const startX = baseX + Phaser.Math.Between(-52, 52);
    const startY = 1148 + Phaser.Math.Between(0, 110);
    const peakY = Phaser.Math.Between(120, 420);
    const endX = startX + Phaser.Math.Between(-240, 240);
    const endY = 1110 + Phaser.Math.Between(0, 120);
    const durationUp = Phaser.Math.Between(720, 1080);
    const durationDown = Phaser.Math.Between(1050, 1600);

    coin
      .setPosition(startX, startY)
      .setFrame(Phaser.Math.Between(0, 7))
      .setAlpha(0)
      .setScale(Phaser.Math.FloatBetween(0.48, 0.86))
      .setAngle(Phaser.Math.Between(-30, 30));

    this.tweens.add({
      targets: coin,
      x: (startX + endX) / 2 + Phaser.Math.Between(-70, 70),
      y: peakY,
      alpha: 1,
      angle: coin.angle + Phaser.Math.Between(180, 540),
      duration: durationUp,
      delay,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: coin,
          x: endX,
          y: endY,
          alpha: 0,
          angle: coin.angle + Phaser.Math.Between(120, 260),
          duration: durationDown,
          ease: "Sine.easeIn",
          onComplete: () => this.launchWinCoin(coin, Phaser.Math.Between(0, 280)),
        });
      },
    });
  }

  createWinControls() {
    window.winDemoPreview = {
      setMode: (mode) => this.setWinMode(mode),
      toggleLayer: (key) => this.toggleWinLayer(key),
    };
  }

  setWinMode(mode) {
    const config = WIN_DEMO_MODES[mode] || WIN_DEMO_MODES.mega;
    this.currentMode = mode;

    if (this.titleImage) {
      const texture = this.textures.get(config.titleKey).getSourceImage();
      const titleHeight = Math.round(config.titleWidth * (texture.height / texture.width));
      this.titleImage
        .setTexture(config.titleKey)
        .setPosition(960, config.titleY)
        .setDisplaySize(config.titleWidth, titleHeight);
    }

    this.tweens.killTweensOf(this.amountCounter);
    this.amountCounter.value = 0;
    if (this.amountText) this.amountText.setText(this.formatWinAmount(0));

    this.tweens.add({
      targets: this.amountCounter,
      value: config.amount,
      duration: 4200,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.amountText?.setText(this.formatWinAmount(this.amountCounter.value));
      },
      onComplete: () => {
        this.amountText?.setText(this.formatWinAmount(config.amount));
      },
    });

    document.querySelectorAll("[data-win-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.winMode === mode);
    });

    this.updateWinLayerVisibility();
  }

  formatWinAmount(value) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  createWinLayerControls() {
    const layerList = document.getElementById("win-layer-list");
    if (!layerList) return;

    layerList.innerHTML = "";
    WIN_DEMO_LAYER_ORDER.forEach((key) => {
      const item = document.createElement("li");
      item.dataset.layerKey = key;

      const label = document.createElement("span");
      label.textContent = key;

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "layer-eye-button";
      toggleButton.dataset.layerKey = key;
      toggleButton.addEventListener("click", () => {
        this.toggleWinLayer(key);
      });

      item.append(toggleButton, label);
      layerList.appendChild(item);
    });

    this.updateWinLayerVisibility();
  }

  toggleWinLayer(key) {
    this.layerVisibility.set(key, !this.layerVisibility.get(key));
    this.updateWinLayerVisibility();
  }

  updateWinLayerVisibility() {
    WIN_DEMO_LAYER_ORDER.forEach((key) => {
      const visible = this.layerVisibility.get(key);
      const objects = this.layerObjects.get(key) || [];
      objects.forEach((object) => object.setVisible(visible));
    });

    document.querySelectorAll("#win-layer-list li").forEach((item) => {
      const key = item.dataset.layerKey;
      const visible = this.layerVisibility.get(key);
      const toggleButton = item.querySelector(".layer-eye-button");
      item.classList.toggle("active", visible);
      item.classList.toggle("hidden-layer", !visible);
      if (toggleButton) {
        toggleButton.textContent = visible ? "◎" : "○";
        toggleButton.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${key}`);
        toggleButton.title = `${visible ? "Hide" : "Show"} ${key}`;
      }
    });

    const status = document.getElementById("win-layer-status");
    if (status) {
      const visibleCount = WIN_DEMO_LAYER_ORDER.filter((key) => this.layerVisibility.get(key)).length;
      status.textContent = `Showing ${visibleCount}/${WIN_DEMO_LAYER_ORDER.length} layers`;
    }
  }
}

function bootPreview(rootId, scene, globalKey) {
  const root = document.getElementById(rootId);
  if (!root || !window.Phaser) return;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: root,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    transparent: false,
    backgroundColor: "#090806",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene,
  });

  window[globalKey] = game;
}

function bootBaseGamePreview() {
  bootPreview("game-root", BaseGameScene, "chuHanBaseGame");

  const button = document.getElementById("spin-button");
  if (button) {
    button.addEventListener("click", () => {
      window.baseGamePreview?.spin();
    });
  }

  const clearButton = document.getElementById("clear-layers-button");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.baseGamePreview?.clearLayers();
    });
  }

  const nextLayerButton = document.getElementById("next-layer-button");
  if (nextLayerButton) {
    nextLayerButton.addEventListener("click", () => {
      window.baseGamePreview?.showNextLayer();
    });
  }

  const allLayersButton = document.getElementById("all-layers-button");
  if (allLayersButton) {
    allLayersButton.addEventListener("click", () => {
      window.baseGamePreview?.showAllLayers();
    });
  }
}

function bootMainMenuPreview() {
  bootPreview("main-menu-root", MainMenuScene, "chuHanMainMenu");
}

function bootFreeGamePreview() {
  bootPreview("free-game-root", FreeGameScene, "chuHanFreeGame");

  const getFreeGameScene = () => window.chuHanFreeGame?.scene?.keys?.FreeGameScene;
  const ensureFreeGamePreviewApi = () => {
    const scene = getFreeGameScene();
    if (scene?.exposeFreeGameControls) scene.exposeFreeGameControls();
  };

  window.setTimeout(ensureFreeGamePreviewApi, 300);
  window.setTimeout(ensureFreeGamePreviewApi, 900);

  const countDownButton = document.getElementById("free-count-down-button");
  if (countDownButton) {
    countDownButton.addEventListener("click", () => {
      ensureFreeGamePreviewApi();
      window.freeGamePreview?.countdownFreeGames();
    });
  }

  const countUpButton = document.getElementById("free-count-up-button");
  if (countUpButton) {
    countUpButton.addEventListener("click", () => {
      ensureFreeGamePreviewApi();
      window.freeGamePreview?.addFreeGames(1);
    });
  }

  const resetButton = document.getElementById("free-count-reset-button");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      ensureFreeGamePreviewApi();
      window.freeGamePreview?.resetFreeGames();
    });
  }
}

function bootWinDemoPreview() {
  bootPreview("win-demo-root", WinDemoScene, "chuHanWinDemo");

  document.querySelectorAll("[data-win-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      window.winDemoPreview?.setMode(button.dataset.winMode);
    });
  });
}

window.addEventListener("load", () => {
  bootMainMenuPreview();
  bootBaseGamePreview();
  bootFreeGamePreview();
  bootWinDemoPreview();
});
