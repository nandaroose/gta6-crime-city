# Solano City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game for the browser. Solano City is a top-down city of blocks, roads and
traffic where you walk, steal cars, fight pedestrians and police, raise a wanted level, and work
through an eight-mission story to become the kingpin. It is plain HTML, CSS and JavaScript on a
canvas, with no build step and no network calls at run time.

## Run it

Play the game locally:

```
node serve.ts
```

The server hosts `game/` at http://localhost:8080. Open that page in desktop Chrome.

To build the submission bundle instead:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory, checks that
`game/index.html` exists, refuses any `http` or `https` reference under `game/`, and writes
`dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.

## Layout

```
game/              the playable game, served as static files
  index.html       the page and canvas
  src/             one module per system
screenshots/       four renders of the game, the first by name the cover
vendor/            makefun-game.ts, the dossier library
main.ts            the entrypoint that builds the output
serve.ts           a small local static server
shots.json         how the screenshots were captured
```

The game's systems are split into `city`, `render`, `player`, `vehicles`, `traffic`, `peds`,
`police`, `wanted`, `combat`, `missions`, `story`, `hud`, `minimap`, `camera`, `audio`,
`particles`, `menus`, `savegame` and `utils`, all driven from `game/src/main.js`.

## Controls

| Input | Action |
| --- | --- |
| W A S D / arrows | Move on foot, or throttle and steer in a vehicle |
| Shift | Sprint |
| Mouse | Aim |
| Left click | Shoot or attack |
| F / right click | Melee |
| E | Enter or exit a vehicle |
| 1 - 4 | Switch weapon: fists, pistol, SMG, shotgun |
| Space | Handbrake in a vehicle |
| M | Toggle the minimap |
| Esc | Pause |

Menus use the arrow keys or W/S to move, Enter or Space to choose, and Esc to go back.

## Saving

Progress and settings are stored in the browser's `localStorage`, so a save survives a reload
without a server.
