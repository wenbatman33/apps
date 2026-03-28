# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file browser game: `index.html` — a fully self-contained Monopoly game with 4 Asian country themes (Japan, Taiwan, Bangkok, Korea), supporting 1–4 players (human or AI).

## Running the Game

Open `index.html` directly in a browser — no build step, no server required. All CSS, HTML, and JS are embedded in one file.

## Architecture

Everything lives in `index.html`, organized into clearly labeled sections:

- **CSS** — luxury dark theme with gold accents; country-specific color palettes applied via class/data attributes
- **HTML** — 3 screens (`#screen-welcome`, `#screen-setup`, `#screen-game`) + modal overlays
- **JS** — structured in comment-delimited sections:
  - `GAME DATA` — `GROUPS`, `makeBoard()` (40 spaces per country), `CHANCE_CARDS`, `COMM_CARDS`
  - `GAME STATE` — `G` object (global mutable state), `selectedCountry`, `playerCount`
  - `BOARD RENDER` — `renderBoard()`, `spaceToGrid(idx)` maps space index → 11×11 CSS grid position, `cellCenter(idx)` for token positioning
  - `TOKENS` — `updateTokens()` positions `.token` elements on `#token-layer` absolutely over the board
  - `SIDEBAR` — `renderSidebar()`, `addLog()`
  - `DICE` — `doRoll()` animates dice then calls `afterRoll()`
  - `PROPERTY LOGIC` — `handlePropertyLand()`, `calcRent()`, `promptBuy()`, `doBuySpace()`
  - `BUILDING` — `canBuild()`, `doBuildOn()`, `aiBuild()`
  - `CARDS` — `drawCard()`, card effect functions (`gainMoney`, `loseMoney`, `advanceTo`, etc.)
  - `BANKRUPTCY` — `checkBankrupt()`, `checkWinner()`
  - `TURN FLOW` — `doEndTurn()`, `maybeAI()`, `showRentModal()`

## Board Layout

The board is an 11×11 CSS Grid. `spaceToGrid(idx)` maps space 0–39 to `[row, col]`:
- Bottom row (r=10): space 0 at col 10, going left to space 10 at col 0
- Left col (c=0): spaces 11–20 going up
- Top row (r=0): spaces 21–30 going right
- Right col (c=10): spaces 31–39 going down

Corner spaces: GO=0, Jail=10, Free Parking=20, Go to Jail=30.

## Key Data Structures

```js
// Space object (in G.spaces[])
{ id, type, name, group, price, rent[6], icon, owner, buildings, mortgaged }

// Player object (in G.players[])
{ id, name, color, emoji, isAI, money, position, inJail, jailTurns, bankrupt, doublesCount }

// Global state G
{ country, spaces, players, current, phase, dice, doublesRolled, log }
```

`G.phase`: `'roll'` → player must roll | `'post'` → player can end turn or manage properties.

## Adding Content

- **New country**: add an entry to `makeBoard()` following the existing 40-space pattern, and add metadata to `COUNTRY_META`.
- **New card effect**: add to `CHANCE_CARDS` or `COMM_CARDS` with a `fn(player)` that eventually sets `G.phase='post'` and calls `renderSidebar()`.
- **New space type**: handle in the `switch(space.type)` block inside `landOn()`.
