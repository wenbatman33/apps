# Sky Raider

Stage 1 demo for a portrait Phaser 3 vertical shooter inspired by classic arcade STG structure.

## Current Scope

- Phaser 3.90 + TypeScript + Vite web build.
- Capacitor 7 config for iOS/Android packaging.
- Tauri 2 shell config for desktop packaging.
- Stage 1 playable loop: menu, player movement, auto-fire, enemy waves, boss, pickups, bombs, explosions, result screen.
- Stage progression through all 8 planned stages, using GPT Image 2 review boards as the current stage art source.
- Data-driven stage/enemy config under `src/game/data`.
- Static SVG sprite placeholders under `public/assets/images`, GPT Image 2 pure stage backgrounds under `public/assets/ai/gpt2_backgrounds`, GPT Image 2 review tiles under `public/assets/ai/gpt2_tiles`, and seamless two-screen scrolling plates under `public/assets/ai/gpt2_long`.
- Premium GPT Image 2 player ship and main menu background under `public/assets/images/generated`.
- Vitest coverage for level loading, object pool behavior, weapon scaling, and DDA.

## Commands

```bash
npm install
npm run dev
npm run build
npm test
npm run cap:sync
npm run tauri:dev
```

## Controls

- Touch or mouse drag: move ship with finger offset.
- Keyboard: WASD or arrow keys.
- Bomb: on-screen `B` button or `X`.
- Weapon switch: `C`, external dev panel weapon buttons, or weapon pickups.

## Dev Review Panel

The browser build includes a right-side development panel:

- Stage buttons jump directly to Stage 1-8.
- Weapon buttons switch between Vulcan, Laser, and Missile.
- Continue on death keeps the run alive after lives drop below zero.
- Bullet Preview shows the three player bullet styles.
- Scene Tiles previews the three clean stitchable background tiles for each stage.

## Asset Pipeline Note

The current checked-in sprite pack is SVG so it is easy to inspect and iterate. The game now uses newly generated GPT Image 2 pure scene backgrounds from `public/assets/ai/gpt2_backgrounds/stage-*-gpt2-source.png`, converted into seamless 432x1872 scrolling plates in `public/assets/ai/gpt2_long/stage-*-gpt2-long.png`. Dev panel previews use crops from the same source under `public/assets/ai/gpt2_tiles/stage-*-tile-*.png`. Replace any sprite with final AI-generated transparent PNG/WebP files by keeping the same texture keys in `PreloadScene`, or update the keys in `src/game/data/stage1.ts`.

The current player ship uses `public/assets/images/generated/player-ship-premium.png`, created from a GPT Image 2 chroma-key source and processed locally into a transparent PNG. The main menu uses `public/assets/images/generated/menu-background-premium.png`.

Important: the GPT Image 2 outputs are review boards, not separated transparent sprites. They are now used in-game as stage art, but production-quality collision sprites still need a slicing/pass to extract each aircraft, turret, boss, projectile, and explosion into transparent atlas files.

The small enemy kill hit stop was removed because it felt like frame stutter during normal shooting. Only large events such as boss-scale explosions still use a short hit stop.
