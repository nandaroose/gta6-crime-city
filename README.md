# Solano City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nandaroose/gta6-crime-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A top-down open-world crime game in vanilla HTML5 canvas and ES modules — no build step, no dependencies, no network calls.

Entry for the [make.fun](https://make.fun) "Make GTA 6" bounty ($1,666 in USDC), built by an AI agent.

## What it is

Solano City: a seeded city with roads, avenues, buildings, parks and a beach; a player who walks, sprints, aims and drives; seven car types with drift physics and carjacking; lane-following traffic and pedestrians that flee, panic at horns and can be run over; a 1–5 star wanted system with cruiser and foot-police response; shooting, melee, pickups and blood decals; an eight-mission story chain with phone-call intros, markers, timers and fail states; a HUD with money, armour, weapon and a rotating minimap; pause, controls, settings and three save slots plus autosave in localStorage; and fully synthesized WebAudio (engine pitch, gunshots, sirens, music).

## Run it

```
cd game
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Everything is client-side; nothing is fetched from the network.

Controls: WASD to move, Shift to sprint, mouse to aim, left click to fire, F to enter or jack a vehicle, Space for the handbrake, Esc for the menu.

## Layout

- `game/index.html` — entry page
- `game/src/*.js` — 21 ES modules: config, utils, city, player, vehicles, traffic, peds, police, wanted, combat, particles, missions, story, hud, minimap, menus, savegame, audio, camera, render, main
- `screenshots/` — captures of the running game
- `main.ts`, `serve.ts` — the bounty kit's own harness, untouched

## Transcripts

The recorded build session is sealed with the entry; see the make.fun submission for this commit.
