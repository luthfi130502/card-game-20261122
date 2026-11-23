# Emberclash

[![make.fun bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/nimble-orca-65/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/nimble-orca-65/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**Emberclash** — a complete, original card duel that plays offline in a desktop
browser from static files. You are the Ember Keeper, duelling Ash, the Cinder
Fox, at a green felt table. Reduce Ash to 0 life before your own embers run out.

## How to play

- Each turn you gain mana (1 on turn one, +1 a turn, up to 10) and draw a card.
- Click a card — or press 1–7 — to play it if you can afford its cost.
  - **Flame** (red) burns the rival for its power.
  - **Tide** (blue) restores your life.
  - **Gale** (green) deals a little damage and draws cards.
  - **Stone** (gold) raises armour, which soaks damage before life does.
- End your turn with **E** or the END TURN button; Ash then plays its own hand.
- First to 0 life loses. Your score is damage dealt, cards played, and a win bonus.

Keys: **Space/Enter** start · **1–7** play a card · **E** end turn · **P** pause ·
**M** mute · **R** restart after a duel.

## Play it

Serve `game/` with any static server and open `index.html`, e.g.:

```sh
node serve.ts   # then open http://localhost:8080
```

No network request is made; all sound is synthesised with WebAudio.

## Files

- `game/` — the playable game (plain HTML + ES modules, no library)
- `game/src/world.js` — duel rules, turns and the rival AI
- `game/src/render.js` — the table, cards and screens
- `game/src/cards.js` — the 13-card catalogue in four suits
- `screenshots/` — real renders of the game's own code (title, play, win, loss)
- `main.ts` — hands the game in: copies `game/` + `screenshots/` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's library, unchanged

Built for the [best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826) on make.fun. MIT licensed.
