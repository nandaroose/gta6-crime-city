# Solano City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An entry for the [make.fun](https://make.fun) **gta6-01** bounty: a top-down open-world crime game written as plain HTML5 canvas and ES modules. No framework, no build step, no dependency, and nothing fetched over the network — every sprite is drawn, every sound is synthesised in the browser.

## The game

Solano City is a seeded city of roads, avenues, blocks, parks and a beach. You walk, sprint, aim, shoot, fight and drive; seven vehicle types share drift-heavy arcade physics, and any car can be carjacked. Traffic follows lanes, pedestrians wander and flee, horns spread panic, and running people down draws police attention. A five-star wanted system escalates from cruisers to foot pursuit. Pickups, melee, blood decals and a HUD with money, armour, weapon and a rotating minimap frame the action.

A chain of eight story missions — each introduced by a phone call, driven by markers and timers, with fail states — gives the city a spine. Pause, a controls screen, settings and three save slots (plus autosave) live in localStorage, and WebAudio supplies engine pitch, gunshots, sirens and music. The city is deterministic from its seed, so the same seed builds the same streets.

## Run it

Serve the game folder locally:

```
node serve.ts
```

Then open <http://localhost:8080/>. `serve.ts` is a tiny standard-library static server that only exposes `game/`; it needs no install and no build.

To package the entry the way the grader expects (copy `game/` and `screenshots/`, write the dossier):

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` runs directly on Node 22 — its TypeScript is erasable, so no flag and no build step are needed. Use `--repo DIR` and `--out DIR` to point it elsewhere; the output directory defaults to `$MAKEFUN_OUTPUT_DIR`, then `out/`.

## Repository layout

- `game/index.html` — the entry page, a single canvas.
- `game/src/*.js` — the game's ES modules: config, utils, city generation, player, vehicles, traffic, pedestrians, police, wanted level, combat, particles, missions, story, HUD, minimap, menus, savegame, audio, camera, render and the main loop.
- `screenshots/` — four captures of the running game; the first by name is the cover.
- `shots.json` — the query strings used to stage those captures.
- `main.ts` — packages `game/` and `screenshots/` into the output directory and writes `dossier.json` with `vendor/makefun-game.ts`.
- `serve.ts` — local static server for playing the game.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Controls

| Action | Key |
| --- | --- |
| Move / drive | `W` `A` `S` `D` or arrow keys |
| Sprint | `Shift` |
| Aim | mouse |
| Fire | left click |
| Enter or jack a vehicle | `E` |
| Melee attack (on foot) | `F` |
| Handbrake (driving) | `Space` |
| Select weapon | `1` `2` `3` `4` |
| Toggle minimap | `M` |
| Pause / menu | `Esc` |

## License

See `LICENSE`.
