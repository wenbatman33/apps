# 深海捕魚機

Phaser 3 mobile portrait fishing arcade prototype.

## Run

```bash
npm install
npm run dev -- --port 5173
```

Open `http://localhost:5173/`.

Developer prize test mode:

```text
http://localhost:5173/?dev=1
```

This shows a dev-only panel for triggering `BIG WIN`, `MEGA WIN`, and `JACKPOT`.

## Gameplay

- Tap `開始遊戲` from the main menu.
- Drag or tap the screen to aim the net.
- Use `+` and `-` to adjust the net multiplier.
- Release to cast a fishing net to that position.
- Total cost is shown before casting: `selected multiplier x distance segment`.
- The selected multiplier also limits cast range: low multipliers can only cast short nets, while high multipliers are locked to far-distance casts.
- Each net hit rolls a catch chance based on the invested points and the fish difficulty.
- Missed hits add a small pity value to that fish, but big fish still require repeated attempts and higher multipliers.
- Fish have different catch difficulty, size, speed, and rewards.
- Large fish appear periodically. They have much higher difficulty and usually need higher multipliers or repeated net hits.
- Catching fish gives coins and score. Consecutive catches build combo bonus.

## Asset Loading

The game uses the generated asset pack in `assets/`.

```js
this.load.image('loadingScreen', 'assets/ui/loading_screen.png');
this.load.image('mainMenu', 'assets/ui/main_menu.png');
this.load.image('gameplayBg', 'assets/backgrounds/gameplay_bg.png');
this.load.spritesheet('fish', 'assets/sprites/fish_sheet.png', {
  frameWidth: 362,
  frameHeight: 362
});
this.load.spritesheet('cannonEffects', 'assets/sprites/cannon_effects_sheet.png', {
  frameWidth: 362,
  frameHeight: 362
});
this.load.spritesheet('gameUi', 'assets/ui/ui_sheet.png', {
  frameWidth: 320,
  frameHeight: 320
});
```

See `assets/asset-manifest.json` for the full asset map.

## Suggested Next Features

- Add lock-on targeting for boss fish.
- Add laser, bomb, and full-screen net skills.
- Add fish wave tables per stage.
- Add sound effects and reward animations.
- Split Phaser into a separate build chunk if production bundle size matters.
