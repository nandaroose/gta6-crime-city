# Solano City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solano City is a top-down open-world crime game for the desktop browser. It is one HTML canvas, plain JavaScript modules and no libraries: no build step, no installs, no network requests. Walk the streets, steal cars, shoot it out with the police, and work through a short story of heists and turf wars while the wanted meter climbs.

## Run it

Serve the game with the bundled static server:

```sh
node serve.ts
```

Then open http://localhost:8080. Use `node serve.ts --port 3000` for another port.

Build the entry the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `game/` and `screenshots/` into the output directory, checks that no game file names an http(s) URL, and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`. Requires Node 22.18 or later; `main.ts` runs directly under Node's TypeScript type stripping.

## Repository layout

```
main.ts                  entrypoint: copy the game, scan it, write the dossier
serve.ts                 local static server for game/ on port 8080
vendor/makefun-game.ts   vendored make.fun dossier library
game/index.html          the page
game/src/                the game's ES modules (world, player, combat, police, missions, ...)
screenshots/             four renders of the game; the first by name is the cover
shots.json               how the screenshots were captured
LICENSE                  license
```

## Controls

| Input | Action |
| --- | --- |
| W A S D | Move on foot |
| Shift | Sprint |
| Mouse | Aim |
| Left click | Shoot / attack |
| F or right click | Melee |
| E | Enter / exit vehicle |
| 1 - 4 | Switch weapon |
| W / S in a vehicle | Throttle / brake |
| A / D in a vehicle | Steer |
| Space | Handbrake |
| M | Toggle minimap |
| Esc | Pause |
