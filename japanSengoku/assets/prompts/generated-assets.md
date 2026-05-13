# ATG戰神賽特 Generated Asset Prompts

These assets were generated with the built-in image generation tool, then copied into this project.

## Screens

- `assets/images/screens/loading-background.png`: premium Egyptian Set mythology loading background with temple entrance, storm clouds, obsidian/gold materials, and lower-center loading bar space.
- `assets/images/screens/main-menu-background.png`: luxury Egyptian throne hall main menu background with top title space and lower button space.
- `assets/images/screens/gameplay-slot-screen-concept.png`: original slot/cascade gameplay concept based on the provided reference layout, with central 6x5 board, jackpot header, side characters, and spin controls.
- `assets/images/screens/gameplay-battle-background.png`: alternate Egyptian battlefield/temple background for bonus or transition scenes.

## Characters

- `assets/images/characters/set-boss.png`: transparent Set boss/guardian character converted from a chroma-key source.
- `assets/images/characters/hero-warrior.png`: transparent Egyptian hero character converted from a chroma-key source.

## UI And Symbols

- `assets/images/ui/slot-symbols-sheet.png`: 4x4 slot symbol source sheet: scarab scatter, Eye of Horus, khopesh, cobra, bows, ankh, gems, multiplier tokens, jackpot coin, sun disk, and Set mask.
- `assets/images/ui/slot-controls-sheet.png`: spin button, autoplay, turbo, menu/info/sound buttons, bet controls, jackpot panels, reel ornaments, and FREE GAMES plaque.
- `assets/images/ui/egyptian-ui-kit-sheet.png`: general UI frames, buttons, loading frame, HUD bars, icon slots, and title plaque.

## Phaser Notes

Use the full-screen images as `cover` backgrounds and crop through camera scaling. For the symbol and UI sheets, slice manually or create a TexturePacker atlas after choosing final icon bounds.

Suggested initial scene keys:

```js
this.load.image('loading-bg', 'assets/images/screens/loading-background.png');
this.load.image('menu-bg', 'assets/images/screens/main-menu-background.png');
this.load.image('gameplay-concept', 'assets/images/screens/gameplay-slot-screen-concept.png');
this.load.image('set-boss', 'assets/images/characters/set-boss.png');
this.load.image('hero-warrior', 'assets/images/characters/hero-warrior.png');
this.load.image('slot-symbols-sheet', 'assets/images/ui/slot-symbols-sheet.png');
this.load.image('slot-controls-sheet', 'assets/images/ui/slot-controls-sheet.png');
this.load.image('egyptian-ui-kit', 'assets/images/ui/egyptian-ui-kit-sheet.png');
```
