# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file browser game: `index.html` — a fully self-contained Monopoly game built with **PixiJS v8**, with 4 Asian country themes (Japan, Taiwan, Bangkok, Korea), supporting 1–4 players (human or AI). Works on both PC and mobile.

## Running the Game

Open `index.html` directly in a browser — no build step required. A local server (e.g. `npx serve`) is recommended for best compatibility. PixiJS is loaded via CDN.

## Architecture

Everything lives in `index.html` using a **hybrid rendering** approach:

- **PixiJS Canvas** — handles all game rendering (welcome screen, board, sidebar, modals, tokens, dice)
- **HTML Overlay** — only `#setup-overlay` for player name input (requires IME support for Chinese)
- **CSS** — minimal, only for the setup overlay styling

### JS Sections (comment-delimited):

- `GAME DATA` — `GROUPS`, `makeBoard()` (40 spaces per country), `CHANCE_CARDS`, `COMM_CARDS`, `COUNTRY_META`
- `GAME STATE` — `G` object (global mutable state), `selectedCountry`, `playerCount`
- `TWEEN ENGINE` — lightweight Promise-based animation system, supports nested properties (`'scale.x'`), driven by `setInterval(16ms)`
- `PIXI SETUP` — `initPixi()`, canvas initialization, responsive resize handler
- `WELCOME SCREEN` — PixiJS scene with country selection cards
- `SETUP SCREEN` — HTML overlay with player configuration
- `BOARD RENDER` — `renderBoard()`, `spaceToGrid(idx)`, `cellCenter(idx)`, `cellPixelPos(idx)`, `updateBuildings()`
- `TOKENS` — `updateTokens()`, `animateTokenMove()` with step-by-step path animation
- `SIDEBAR` — `renderSidebar()` rebuilds full PixiJS sidebar, `addLog()` with debounced updates
- `DICE` — `doRoll()` async with tween-based dice animation
- `MODAL SYSTEM` — `showModal()`, `hideModal()` with scale/alpha animations, 5 modal types (buy, card, rent, prop info, winner)
- `PROPERTY LOGIC` — `handlePropertyLand()`, `calcRent()`, `promptBuy()`, `doBuySpace()`
- `BUILDING` — `canBuild()`, `doBuildOn()`, `aiBuild()`
- `CARDS` — `drawCard()`, card effect functions
- `BANKRUPTCY` — `checkBankrupt()`, `checkWinner()`
- `TURN FLOW` — `doEndTurn()`, `maybeAI()`, `autoAIEndTurn()`

### Key PixiJS Containers:

- `rootContainer` → top-level stage child
  - `welcomeScene` — welcome screen
  - `gameScene` — game screen
    - `boardContainer` — 672×672 board grid
    - `tokenLayer` — player tokens (same scale/position as board)
    - `sidebarContainer` — player info, dice, buttons, log
    - `modalLayer` — popup overlays

## Board Layout

`spaceToGrid(idx)` maps space 0–39 to `[row, col]` on an 11×11 grid:
- Bottom row (r=10): space 0 at col 10, going left to space 10 at col 0
- Left col (c=0): spaces 11–20 going up
- Top row (r=0): spaces 21–30 going right
- Right col (c=10): spaces 31–39 going down

Corner spaces: GO=0, Jail=10, Free Parking=20, Go to Jail=30.

Grid dimensions: corners 90px, edges 54px. Total 672×672px.

## Key Data Structures

```js
// Space object (in G.spaces[])
{ id, type, name, group, price, rent[6], icon, owner, buildings, mortgaged }

// Player object (in G.players[])
{ id, name, color, avatar, isAI, money, position, inJail, jailTurns, bankrupt, doublesCount }

// Global state G
{ country, spaces, players, current, phase, dice, doublesRolled, log }
```

`G.phase`: `'roll'` → player must roll | `'post'` → player can end turn or manage properties.

## Tween System

`tween(obj, props, durationMs, easeFn)` → Promise. Supports:
- Direct properties: `{x: 100, y: 200, alpha: 0.5}`
- Nested properties: `{'scale.x': 1.5, 'scale.y': 1.5}`
- Easing functions: `easeOutCubic`, `easeOutBack`, `easeInOutQuad`

## AI Flow

AI players auto-roll via `maybeAI()` → `doRoll()`. After landing, `autoAIEndTurn()` schedules `doEndTurn()` with a delay. Card/rent modals auto-close for AI players.

## Adding Content

- **New country**: add to `makeBoard()` following the 40-space pattern, add metadata to `COUNTRY_META`
- **New card effect**: add to `CHANCE_CARDS`/`COMM_CARDS` with `fn(player)` that sets `G.phase='post'`, calls `renderSidebar()` and `autoAIEndTurn()`
- **New space type**: handle in `landOn()` switch block
