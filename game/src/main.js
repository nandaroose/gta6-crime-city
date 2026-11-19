// main.js — boot, fixed-timestep game loop, and the top-level state machine
// (MENU, PLAYING, PAUSED, MISSION_TEXT, WASTED, BUSTED). Owns the world object
// and wires every subsystem together.

import { initInput, endFrameInput, mouse, pressed, holding } from './input.js';
import { Camera } from './camera.js';
import { City, T, districtAt } from './city.js';
import { TILE, GRID, clamp, dist } from './utils.js';
import { makePlayer, updatePlayer, drawPlayer, WEAPONS } from './player.js';
import { makeCar, destroyCar, stepCar } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Peds } from './peds.js';
import { Police } from './police.js';
import { Wanted } from './wanted.js';
import { fireBullet, updateBullets, meleeHit } from './combat.js';
import { Particles } from './particles.js';
import { MissionManager } from './missions.js';
import { MISSION_DEFS, missionById } from './story.js';
import { renderWorld, currentDistrict } from './render.js';
import { drawHud, initHud, toast, setCrosshairPos } from './hud.js';
import { MenuState, MENU, updateMenus, drawMenus } from './menus.js';
import { audio } from './audio.js';
import { saveGame, loadGame, applySave } from './savegame.js';
import { makePed as pedsMake } from './peds.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const camera = new Camera();
const menu = new MenuState();

let W = 0, H = 0;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  camera.resize(W, H);
}
window.addEventListener('resize', resize);

// ---------------- world ----------------
const city = new City(20261);

const world = {
  state: { paused: false, over: null, overTimer: 0 },
  city,
  camera,
  size: GRID * TILE,
  player: null,
  vehicles: [],
  bullets: [],
  cops: [],           // shared list handed to combat (police pushes here)
  particles: new Particles(),
  peds: new Peds(),
  police: new Police(),
  traffic: new Traffic(),
  wanted: new Wanted(),
  missions: null,
  pickups: [],
  missionTimer: -1,
  volume: 0.7,
  gameStarted: false,
  pendingOutro: null,

  toast: (msg) => toast(msg),
  currentDistrict: () => currentDistrict(world),

  fireBullet: (x, y, a, s, d, o) => fireBullet(world, x, y, a, s, d, o),
  meleeHit: (x, y, a, r, d) => meleeHit(world, x, y, a, r, d),

  // ---------- crime hooks ----------
  onGunfire(x, y, radius) {
    world.peds.panicAt(world, x, y, radius);
    // cops who hear gunfire respond
    let copNear = false;
    for (const cop of world.police.cops) {
      if (!cop.dead && dist(cop.x, cop.y, x, y) < 420) { copNear = true; world.wanted.seen(); }
    }
    for (const car of world.police.cars) {
      if (!car.dead && dist(car.x, car.y, x, y) < 500) { copNear = true; world.wanted.seen(); }
    }
    if (copNear && world.wanted.add(0.34)) world.toast('Wanted level up!');
  },

  onHorn(x, y, radius) {
    world.peds.panicAt(world, x, y, radius);
    for (const car of world.vehicles) {
      if (car.driver === 'ai' && dist(car.x, car.y, x, y) < radius) car.fleeing = 1;
    }
  },

  onPlayerAttack() {
    // hitting peds/cops raises heat fractionally
    if (world.wanted.add(0.5)) world.toast('Wanted level up!');
    // any cop nearby saw it
    for (const cop of world.police.cops) {
      if (!cop.dead && dist(cop.x, cop.y, world.player.x, world.player.y) < 400) world.wanted.seen();
    }
  },

  onPedHitByCar(ped, car) {
    if (ped.dead) return;
    ped.hp = 0;
    world.onPedKilled(ped, 'car');
    if (car.driver === 'player') {
      if (world.wanted.add(1)) world.toast('Wanted level up!');
    }
  },

  onPedKilled(ped, cause) {
    if (ped.dead) return;
    ped.dead = true;
    ped.deadTimer = 240;
    world.particles.bloodDecal(ped.x, ped.y);
    world.particles.blood(ped.x, ped.y, 14);
    world.peds.panicAt(world, ped.x, ped.y, 200);
    if (cause === 'player') {
      if (world.wanted.add(2)) world.toast('Wanted level up!');
    }
  },

  onCopKilled(cop) {
    cop.dead = true;
    world.particles.bloodDecal(cop.x, cop.y);
    if (world.wanted.add(2)) world.toast('Wanted level up!');
  },

  // ---------- damage ----------
  hurtPlayer(amount) {
    const p = world.player;
    if (p.invuln > 0) return;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, amount);
      p.armor -= absorbed;
      amount -= absorbed;
    }
    p.health -= amount;
    p.invuln = 0.1;
    camera.kick(3);
    if (p.health <= 0) wastePlayer();
  },

  destroyCar(car) { destroyCar(car, world); },

  onPlayerCarDestroyed() {
    // eject the player when their car explodes
    const p = world.player;
    if (p.car) {
      const car = p.car;
      p.car = null;
      p.x = car.x + 30; p.y = car.y + 20;
      world.hurtPlayer(30);
    }
  },

  // ---------- vehicle enter/exit (carjacking) ----------
  enterVehicle(p, car) {
    if (car.dead) return;
    const jacked = car.driver === 'ai' || car.driver === 'cop';
    if (jacked) {
      // driver bails and flees
      const spot = world.city.nearestRoadTile(Math.floor(car.x / TILE), Math.floor(car.y / TILE));
      const px = (spot ? spot.tx + 0.5 : car.x / TILE) * TILE;
      const py = (spot ? spot.ty + 0.5 : car.y / TILE) * TILE;
      const ped = world.peds;
      ped.list.push(Object.assign(pedMake(px, py), { state: 'flee', fleeTimer: 4, threatX: car.x, threatY: car.y }));
      world.peds.panicAt(world, car.x, car.y, 160);
      if (world.wanted.add(1)) world.toast('Wanted level up!');
      world.toast('Carjacked a ' + car.type.name);
    }
    car.driver = 'player';
    car.ai = null;
    p.car = car;
    audio.startEngine();
  },

  exitVehicle(p) {
    const car = p.car;
    if (!car) return;
    car.driver = null;
    car.speed *= 0.3;
    const ox = Math.cos(car.angle + Math.PI / 2) * 28;
    const oy = Math.sin(car.angle + Math.PI / 2) * 28;
    p.x = car.x + ox;
    p.y = car.y + oy;
    p.car = null;
  },

  // ---------- game flow ----------
  setVolume(v) {
    world.volume = v;
    audio.setVolume(v);
  },

  newGame() {
    world.player = makePlayer(10.5 * TILE, 26.5 * TILE);
    world.vehicles = [];
    world.bullets = [];
    world.police.cops = [];
    world.police.cars = [];
    world.wanted.clear();
    world.particles.clear();
    world.peds.list = [];
    world.missions = new MissionManager(world);
    world.missionTimer = -1;
    world.gameStarted = true;
    seedPickups();
    toast('Welcome to Solano City. Press M when you want work.');
  },

  continueGame(data) {
    world.newGame();
    applySave(data, world);
    toast('Save loaded.');
  },

  autosave() {
    if (world.gameStarted) saveGame('auto', world);
  },

  bustPlayer() {
    if (world.state.over) return;
    world.state.over = 'busted';
    world.state.overTimer = 0;
    menu.screen = MENU.BUSTED;
  },
};
world.missions = new MissionManager(world);

function wastePlayer() {
  if (world.state.over) return;
  world.state.over = 'wasted';
  world.state.overTimer = 0;
  menu.screen = MENU.WASTED;
}

function pedMake(x, y) {
  return pedsMake(x, y);
}

// Weapon / health pickups sprinkled around town.
function seedPickups() {
  world.pickups = [
    { type: 'pistol', ammo: 24, x: 12.5 * TILE, y: 44.5 * TILE, taken: 0 },
    { type: 'smg', ammo: 60, x: 68.5 * TILE, y: 36.5 * TILE, taken: 0 },
    { type: 'health', ammo: 0, x: 66.5 * TILE, y: 50.5 * TILE, taken: 0 },
    { type: 'armor', ammo: 0, x: 20.5 * TILE, y: 10.5 * TILE, taken: 0 },
    { type: 'pistol', ammo: 24, x: 92.5 * TILE, y: 44.5 * TILE, taken: 0 },
  ];
}

function updatePickups(dt) {
  const p = world.player;
  for (const pk of world.pickups) {
    if (pk.taken > 0) { pk.taken -= dt; continue; }
    if (dist(p.x, p.y, pk.x, pk.y) < 24) {
      if (pk.type === 'health') { p.health = p.maxHealth; toast('Health restored'); }
      else if (pk.type === 'armor') { p.armor = p.maxArmor; toast('Armor equipped'); }
      else { WEAPONS[pk.type] && giveW(pk.type, pk.ammo); }
      pk.taken = 45; // respawn after 45s
    }
  }
}
function giveW(id, ammo) {
  const p = world.player;
  p.ammo[id] = (p.ammo[id] || 0) + ammo;
  if (p.weapon === 'fists' || p.ammo[p.weapon] <= 0) p.weapon = id;
  audio.pickup();
  toast(`Picked up ${WEAPONS[id].name} (+${ammo})`);
}

function drawPickups(ctx) {
  for (const pk of world.pickups) {
    if (pk.taken > 0) continue;
    ctx.save();
    ctx.translate(pk.x, pk.y);
    const bob = Math.sin(performance.now() / 400 + pk.x) * 2;
    ctx.translate(0, bob);
    const colors = { pistol: '#4a4a52', smg: '#3a3f45', health: '#4dde77', armor: '#5db8e8' };
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-6, 6, 12, 4);
    if (pk.type === 'health' || pk.type === 'armor') {
      ctx.fillStyle = colors[pk.type];
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillRect(-5, -2, 10, 4);
    } else {
      ctx.fillStyle = colors[pk.type];
      ctx.fillRect(-8, -3, 16, 6);
      ctx.fillRect(2, -6, 4, 4);
    }
    ctx.restore();
  }
}

// respawn after WASTED / BUSTED
function respawn() {
  const p = world.player;
  const spot = world.state.over === 'wasted'
    ? { x: 66.5 * TILE, y: 50.5 * TILE }   // La Costa Medical
    : { x: 34.5 * TILE, y: 19.5 * TILE };  // Precinct One
  p.car = null;
  p.x = spot.x; p.y = spot.y;
  p.health = p.maxHealth;
  p.armor = 0;
  const fee = Math.min(p.money, Math.floor(p.money * 0.25));
  p.money -= fee;
  world.wanted.clear();
  world.police.despawnAll(world);
  world.bullets.length = 0;
  toast(world.state.over === 'wasted'
    ? `Patched up at La Costa Medical. Fee: $${fee}`
    : `Released from Precinct One. Bribe: $${fee}`);
  world.state.over = null;
  world.missionTimer = -1;
  if (world.missions.active) world.missions.fail('You went down.');
}

// ---------------- loop ----------------
const STEP = 1 / 60;
let last = 0;
let acc = 0;
let streamingTimer = 0;

function frame(ts) {
  requestAnimationFrame(frame);
  const t = ts / 1000;
  let dt = Math.min(0.1, t - last || 0);
  last = t;
  acc += dt;

  // world <-> screen mouse coords
  const mw = camera.screenToWorld(mouse.x, mouse.y);
  mouse.wx = mw.x; mouse.wy = mw.y;
  setCrosshairPos(mouse.x, mouse.y);

  const menuScreen = menu.screen;
  const inMenu = menuScreen !== null && menuScreen !== undefined;

  if (!inMenu && world.gameStarted) {
    while (acc >= STEP) { step(STEP); acc -= STEP; }
  } else {
    acc = 0;
    // menu ticking (typewriter, selection, timers)
    updateMenus(menu, world, dt);
    if (world.state.over) {
      world.state.overTimer += dt;
      if (world.state.overTimer > 2.4) respawn();
    }
    // handle mission text confirmation here (menus returns [] items)
    if (menu.screen === MENU.MISSION_TEXT && (pressed('enter') || pressed(' '))) {
      const def = menu.pendingMission;
      menu.screen = null;
      if (def) { world.missions.start(def); menu.pendingMission = null; }
    } else if (menu.screen === MENU.MISSION_OUTRO && (pressed('enter') || pressed(' '))) {
      menu.screen = null;
    }
  }

  draw(t, inMenu);
  audio.updateMusic(dt);
  endFrameInput();
}

function step(dt) {
  const p = world.player;

  // gameplay pause key
  if (pressed('escape')) { menu.screen = MENU.PAUSE; return; }

  updatePlayer(p, world, dt);

  world.traffic.update(world, dt);
  world.peds.update(world, dt);
  updateBullets(world, dt);
  world.wanted.update(dt, world);
  world.police.update(world, dt);
  world.missions.update(dt);
  updatePickups(dt);
  world.particles.update(dt);

  camera.follow(p.car || p, !!p.car, dt);

  // stream ambient actors
  streamingTimer -= dt;
  if (streamingTimer <= 0) {
    streamingTimer = 0.5;
    world.traffic.maintain(world);
    world.peds.maintain(world);
  }

  // answer the phone → next mission
  if (pressed('m') && !world.missions.active && world.missions.nextDef) {
    const def = world.missions.nextDef;
    menu.screen = MENU.MISSION_TEXT;
    menu.textLines = def.intro;
    menu.textDone = 0;
    menu.pendingMission = def;
    audio.phone();
  }

  // engine sound
  audio.startEngine();
  audio.updateEngine(!!p.car, p.car ? Math.abs(p.car.speed) / p.car.type.top : 0);

  // autosave every 30s of play
  world._autoT = (world._autoT || 0) + dt;
  if (world._autoT > 30) { world._autoT = 0; world.autosave(); }
}

function draw(t, inMenu) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, W, H);

  if (world.gameStarted) {
    camera.apply(ctx);
    renderWorld(ctx, world, camera, t);
    drawPickups(ctx);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (world.gameStarted && !inMenu) {
    drawHud(ctx, world, W, H);
  } else if (inMenu) {
    if (world.gameStarted) drawHud(ctx, world, W, H);
    drawMenus(ctx, menu, world, W, H);
  }
}

// ---------------- boot ----------------
function boot() {
  resize();
  initInput(canvas);
  initHud();
  // audio must init after a user gesture; hook first interaction
  const arm = () => { audio.init(); audio.setVolume(world.volume); audio.startEngine(); window.removeEventListener('pointerdown', arm); window.removeEventListener('keydown', arm); };
  window.addEventListener('pointerdown', arm);
  window.addEventListener('keydown', arm);
  requestAnimationFrame(frame);
}

boot();
