// Solano City: boot, input, fixed-timestep loop and the game state machine.

import { CONFIG, WEAPONS } from './config.js';
import { dist, dist2 } from './utils.js';
import { City } from './city.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { Traffic } from './traffic.js';
import { PedManager } from './peds.js';
import { Police } from './police.js';
import { Wanted } from './wanted.js';
import { Combat } from './combat.js';
import { ParticleSystem } from './particles.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Minimap } from './minimap.js';
import { Menus } from './menus.js';
import { SaveGame } from './savegame.js';
import { Audio } from './audio.js';
import { Camera } from './camera.js';
import { Renderer } from './render.js';

class EventBus {
  constructor() {
    this.map = new Map();
  }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, []);
    this.map.get(name).push(fn);
  }
  emit(name, ...args) {
    const list = this.map.get(name);
    if (list) for (const fn of list) fn(...args);
  }
}

class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false, justDown: false };
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.justDown = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  isDown(code) {
    return this.keys.has(code);
  }
  just(code) {
    return this.pressed.has(code);
  }
  get moveX() {
    return (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0) - (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0);
  }
  get moveY() {
    return (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0) - (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0);
  }
  get run() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }
  endFrame() {
    this.pressed.clear();
    this.mouse.justDown = false;
  }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const city = new City(2026);
const player = new Player(city.landmarks.home.x, city.landmarks.home.y);

const game = {
  canvas,
  ctx,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  width: window.innerWidth,
  height: window.innerHeight,
  state: 'title',
  time: 0,
  playTime: 0,
  clockHours: 17.4,
  deathTimer: 0,
  autosaveTimer: 60,
  hint: null,
  aim: { x: player.x, y: player.y },
  carControls: { throttle: 0, steer: 0, handbrake: false, brake: false },
  city,
  player,
};

game.events = new EventBus();
game.input = new Input(canvas);
game.particles = new ParticleSystem();
game.audio = new Audio();
game.camera = new Camera(city.size);
game.vehicles = new VehicleManager(city);
game.wanted = new Wanted();
game.combat = new Combat();
game.peds = new PedManager(game);
game.traffic = new Traffic(game);
game.police = new Police(game);
game.missions = new Missions();
game.hud = new HUD();
game.minimap = new Minimap();
game.saveGame = new SaveGame();
game.settings = Object.assign({ volume: 0.7, music: 0.5, rotateMinimap: true }, game.saveGame.readSettings());
game.renderer = new Renderer(canvas, ctx);
game.menus = new Menus(game);

game.audio.setVolumes(game.settings.volume, game.settings.music);

game.wanted.onChange = (level, before) => {
  if (level > before) {
    game.hud.notify('Wanted level ' + level + ' — police responding', 'crime');
    game.audio.phone();
  } else if (level === 0 && before > 0) {
    game.hud.notify('You lost the heat', 'info');
  }
};

game.events.on('gunshot', ({ x, y }) => {
  game.peds.panic(x, y, 520, game);
});
game.events.on('playerDied', () => {
  game.deathTimer = CONFIG.player.respawnTime;
  if (game.missions.state === 'active') game.missions.fail('You were wasted', game);
});
game.events.on('copKilled', () => {
  game.hud.notify('Officer down', 'danger');
});
game.events.on('missionComplete', () => {
  game.camera.addFlash(0.12, '244,200,74');
});

function resize() {
  game.dpr = Math.min(window.devicePixelRatio || 1, 2);
  game.width = window.innerWidth;
  game.height = window.innerHeight;
  canvas.width = Math.round(game.width * game.dpr);
  canvas.height = Math.round(game.height * game.dpr);
  canvas.style.width = game.width + 'px';
  canvas.style.height = game.height + 'px';
  game.camera.setViewport(game.width, game.height);
}
window.addEventListener('resize', resize);
resize();

function spawnPoint() {
  const home = city.landmarks.home;
  return city.walkableNear(home.x + 148, home.y + 96);
}

function populateCity() {
  game.peds.spawnNear(game, 11);
  game.traffic.burst(game, 7);
}

function resetWorld() {
  game.vehicles.list.length = 0;
  game.traffic.cars.length = 0;
  game.peds.list.length = 0;
  game.police.clear();
  game.combat.bullets.length = 0;
  game.combat.pickups.length = 0;
  game.particles.list.length = 0;
  game.vehicles.spawnParked(16);
  game.autosaveTimer = 60;
}

function resetMissions() {
  const m = game.missions;
  m.index = 0;
  m.state = 'idle';
  m.def = null;
  m.step = null;
  m.stepIndex = 0;
  m.timer = 0;
  m.objectives = [];
  m.targets = [];
  m.missionVehicle = null;
  m.marker = null;
  m.cooldown = 0;
  m.storyDone = false;
}

game.startNew = function startNew() {
  game.audio.init();
  resetWorld();
  resetMissions();
  player.reset(spawnPoint().x, spawnPoint().y);
  populateCity();
  player.money = 500;
  player.weapon = 'pistol';
  player.ammo = { pistol: 30, smg: 0, shotgun: 0 };
  player.owned = { fists: true, pistol: true, smg: false, shotgun: false };
  game.wanted.clear();
  game.wanted.hold = false;
  game.clockHours = 17.4;
  game.playTime = 0;
  game.deathTimer = 0;
  game.state = 'playing';
  game.camera.snapTo(player.x, player.y);
  game.menus.hide();
  game.hud.notify('Welcome to Solano City, Rico', 'mission');
  game.hud.setCall('Mama Cielo', ['Rico? You landed? Good.', 'Find the gold M on your map. We have work.'], 7);
};

function newestSave() {
  const saves = game.saveGame.list().filter((s) => s.data);
  if (!saves.length) return null;
  saves.sort((a, b) => (b.data.savedAt || 0) - (a.data.savedAt || 0));
  return saves[0].slot;
}

game.continueGame = function continueGame() {
  const slot = newestSave();
  if (!slot) {
    game.startNew();
    return;
  }
  game.loadSlot(slot);
};

game.resume = function resume() {
  game.state = 'playing';
  game.menus.hide();
};

game.quitToTitle = function quitToTitle() {
  game.state = 'title';
  game.menus.showTitle();
};

game.saveSlot = function saveSlot(slot) {
  game.saveGame.save(slot, game);
};

game.loadSlot = function loadSlot(slot) {
  game.audio.init();
  resetWorld();
  if (!game.saveGame.load(slot, game)) {
    game.hud.notify('That slot is empty', 'danger');
    return;
  }
  game.state = 'playing';
  game.deathTimer = 0;
  game.camera.snapTo(player.x, player.y);
  game.menus.hide();
  game.hud.notify('Welcome back to Solano', 'mission');
};

game.saveSettings = function saveSettings() {
  game.saveGame.writeSettings(game.settings);
};

game.pause = function pause() {
  game.state = 'paused';
  game.menus.showPause();
};

function toggleVehicle() {
  const p = game.player;
  if (p.dead) return;
  if (p.vehicle) {
    p.exitVehicle(game);
    return;
  }
  const v = game.vehicles.findNearest(p.x, p.y, 86, (car) => !car.dead);
  if (!v) {
    game.hud.notify('No car nearby', 'info');
    return;
  }
  p.enterVehicle(v, game);
  if (v.ai || v.driver) {
    game.hud.notify(v.isPolice ? 'Police cruiser stolen' : 'Carjacked ' + v.name, 'crime');
  }
}

function honk() {
  const p = game.player;
  if (!p.vehicle || p.vehicle.dead) return;
  game.audio.horn(p.x, p.y);
  game.peds.panic(p.x, p.y, 420, game);
  game.particles.ring(p.x, p.y, 'rgba(244,200,74,0.5)');
}

function processActions() {
  const input = game.input;
  game.aim = game.camera.screenToWorld(input.mouse.x, input.mouse.y);
  if (input.just('Escape')) {
    if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') {
      if (game.menus.mode === 'pause') game.resume();
      else game.menus.showPause();
    }
  }
  if (game.state === 'title') {
    if (input.just('Enter') || input.just('Space')) game.startNew();
    return;
  }
  if (game.state !== 'playing') return;
  const p = game.player;
  if (input.just('KeyF')) toggleVehicle();
  if (input.just('Digit1')) p.switchWeapon(0);
  if (input.just('Digit2')) p.switchWeapon(1);
  if (input.just('Digit3')) p.switchWeapon(2);
  if (input.just('Digit4')) p.switchWeapon(3);
  if (input.just('KeyH')) honk();
  if (input.just('KeyM')) {
    game.settings.rotateMinimap = !game.settings.rotateMinimap;
    game.saveSettings();
    game.hud.notify('Rotating minimap ' + (game.settings.rotateMinimap ? 'on' : 'off'), 'info');
  }
  if (!p.dead && input.mouse.down) {
    const w = WEAPONS[p.weapon];
    if (w.auto || input.mouse.justDown) p.tryShoot(game);
  }
}

function updateTitle(dt) {
  game.traffic.update(dt, game);
  game.peds.update(dt, game);
  game.vehicles.update(dt, game);
  game.particles.update(dt);
  game.time += dt;
  const t = game.time;
  game.camera.x = player.x + Math.cos(t * 0.09) * 190;
  game.camera.y = player.y + Math.sin(t * 0.07) * 150;
  game.camera.follow(player, dt, 0, 0);
}

function updatePlayerHits(dt) {
  const p = game.player;
  if (p.dead || p.vehicle) return;
  for (const v of game.vehicles.list) {
    if (v.dead) continue;
    if (Math.abs(v.speed) > 150 && dist2(v.x, v.y, p.x, p.y) < (v.radius + p.radius) * (v.radius + p.radius)) {
      p.damage(75, game, v);
      game.particles.blood(p.x, p.y, 8);
      game.camera.addShake(0.5);
      break;
    }
  }
}

function computeHint() {
  const p = game.player;
  if (p.dead) return null;
  if (p.vehicle) return 'F exit  ·  Space handbrake  ·  H horn';
  const v = game.vehicles.findNearest(p.x, p.y, 92, (car) => !car.dead);
  if (v) return 'F — ' + (v.ai || v.driver ? 'carjack ' : 'drive ') + v.name;
  const start = game.missions.startMarker();
  if (start && dist(p.x, p.y, start.x, start.y) < 180) return 'Walk into the gold marker to start the job';
  return null;
}

function update(dt) {
  if (game.state === 'title') {
    updateTitle(dt);
    return;
  }
  if (game.state !== 'playing') return;

  game.time += dt;
  game.playTime += dt;
  game.clockHours = (game.clockHours + dt * 0.018) % 24;
  game.aim = game.camera.screenToWorld(game.input.mouse.x, game.input.mouse.y);

  const p = game.player;
  game.carControls = {
    throttle: (game.input.isDown('KeyW') || game.input.isDown('ArrowUp') ? 1 : 0) - (game.input.isDown('KeyS') || game.input.isDown('ArrowDown') ? 1 : 0),
    steer: (game.input.isDown('KeyD') || game.input.isDown('ArrowRight') ? 1 : 0) - (game.input.isDown('KeyA') || game.input.isDown('ArrowLeft') ? 1 : 0),
    handbrake: game.input.isDown('Space'),
    brake: false,
  };
  p.update(dt, game);
  game.vehicles.update(dt, game);
  if (p.vehicle) {
    p.x = p.vehicle.x;
    p.y = p.vehicle.y;
    p.angle = p.vehicle.angle;
  }
  game.traffic.update(dt, game);
  game.peds.update(dt, game);
  game.police.update(dt, game);
  game.wanted.update(dt);
  game.combat.update(dt, game);
  game.missions.update(dt, game);
  updatePlayerHits(dt);
  game.particles.update(dt);
  game.hud.update(dt);

  if (p.dead) {
    game.deathTimer -= dt;
    if (game.deathTimer <= 0) {
      const h = city.landmarks.hospital;
      p.reset(h.x, h.y);
      p.money = Math.floor(p.money * 0.9);
      game.wanted.clear();
      game.wanted.hold = false;
      game.police.clear();
      game.deathTimer = 0;
      game.camera.snapTo(p.x, p.y);
      game.hud.notify('Patched up at Solano General', 'health');
    }
  }

  let lx = 0;
  let ly = 0;
  if (p.vehicle) {
    lx = p.vehicle.vx * 0.32;
    ly = p.vehicle.vy * 0.32;
  } else {
    lx = Math.cos(p.angle) * 26;
    ly = Math.sin(p.angle) * 26;
  }
  game.camera.follow(p, dt, lx, ly);
  game.audio.update(dt, game);
  game.hint = computeHint();

  game.autosaveTimer -= dt;
  if (game.autosaveTimer <= 0) {
    game.autosaveTimer = 60;
    if (!p.dead) game.saveGame.autosave(game);
  }
}

let last = performance.now();
let accumulator = 0;
const STEP = 1 / 60;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.2) dt = 0.2;
  processActions();
  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < 5) {
    try {
      update(STEP);
    } catch (err) {
      if (!frame.reported) {
        frame.reported = true;
        console.error('Solano City: a frame failed, the city keeps running', err);
      }
    }
    accumulator -= STEP;
    steps++;
  }
  if (steps >= 5) accumulator = 0;
  game.renderer.draw(game);
  game.input.endFrame();
  requestAnimationFrame(frame);
}

resetWorld();
player.reset(spawnPoint().x, spawnPoint().y);
populateCity();
game.camera.snapTo(player.x, player.y);
game.menus.showTitle();
window.Solano = game;
requestAnimationFrame(frame);
