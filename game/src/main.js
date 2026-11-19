import { START, SETTINGS, WEAPON_ORDER } from './config.js';
import { createCity, randomRoadPoint, resolveCircle } from './city.js';
import { createPlayer, updatePlayer, respawnPlayer } from './player.js';
import { createCamera, updateCamera } from './camera.js';
import { createWanted, updateWanted } from './wanted.js';
import { createPoliceState, updatePolice } from './police.js';
import {
  createMissionState, createPickups, updateMissions, failMission
} from './missions.js';
import { createVehicle, updateVehicle } from './vehicles.js';
import { populateTraffic, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds, checkVehiclePedHits } from './peds.js';
import { playerAttack, meleeAttack, updateBullets, updateMessages } from './combat.js';
import { updateParticles } from './particles.js';
import { AudioEngine } from './audio.js';
import { render } from './render.js';
import { loadSettings, saveSettings } from './savegame.js';
import { handleMenuKey, menuClick } from './menus.js';
import { dist } from './utils.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = Math.max(360, window.innerWidth);
  canvas.height = Math.max(260, window.innerHeight);
}
resize();
window.addEventListener('resize', resize);

const game = {
  canvas,
  ctx,
  state: 'title',
  time: 0,
  dt: 0,
  menuIndex: 0,
  menuReturn: 'paused',
  settings: Object.assign({}, SETTINGS, loadSettings() || {}),
  input: {
    keys: new Set(),
    mouse: { x: canvas.width / 2, y: canvas.height / 2, worldX: 0, worldY: 0, down: false }
  },
  messages: [],
  particles: [],
  bullets: [],
  lastShot: null,
  vehicles: [],
  traffic: [],
  peds: [],
  pickups: [],
  city: null,
  player: null,
  camera: null,
  police: createPoliceState(),
  wanted: createWanted(),
  mission: createMissionState(),
  audio: new AudioEngine()
};

const VEHICLE_TYPES = ['sedan', 'sedan', 'taxi', 'van', 'sports'];

function spawnParked(game, count, minDist) {
  for (let i = 0; i < count; i++) {
    const pt = randomRoadPoint(Math.random, game.player, minDist || 300);
    const type = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
    const v = createVehicle(type, pt.x, pt.y, Math.random() * Math.PI * 2);
    game.vehicles.push(v);
  }
}

function buildWorld(game) {
  game.city = createCity(1337);
  game.player = createPlayer(START.x, START.y);
  game.camera = createCamera(game.player);
  game.vehicles = [];
  game.traffic = [];
  game.peds = [];
  game.pickups = [];
  game.bullets = [];
  game.particles = [];
  game.messages = [];
  game.lastShot = null;
  game.police = createPoliceState();
  game.wanted = createWanted();
  game.mission = createMissionState();
  game.time = 0;
  createPickups(game);
  populateTraffic(game, 20);
  spawnPeds(game, 30);
  spawnParked(game, 10, 120);
}

game.newGame = () => {
  buildWorld(game);
  game.state = 'playing';
  game.menuIndex = 0;
  game.audio.init();
  game.audio.setVolume(game.settings.volume);
  game.audio.engineStop();
  game.audio.sirenStop();
};

game.respawn = () => {
  respawnPlayer(game);
  game.audio.engineStop();
  game.audio.sirenStop();
};

game.onMissionFail = () => failMission(game);

game.onAfterLoad = () => {
  populateTraffic(game, 18);
  spawnPeds(game, 24);
  spawnParked(game, 8, 200);
  game.audio.setVolume(game.settings.volume);
};

function toggleVehicle(game) {
  const p = game.player;
  if (p.dead) return;
  if (p.inVehicle) {
    const v = p.inVehicle;
    v.driver = null;
    p.inVehicle = null;
    const side = v.angle + Math.PI / 2;
    const res = resolveCircle(
      game.city,
      v.x + Math.cos(side) * (v.h + 16),
      v.y + Math.sin(side) * (v.h + 16),
      p.r
    );
    p.x = res.x;
    p.y = res.y;
    game.audio.engineStop();
    return;
  }

  let best = null;
  let bestDist = 82;
  const consider = (v) => {
    if (v.dead) return;
    const d = dist(p.x, p.y, v.x, v.y);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  };
  for (let i = 0; i < game.vehicles.length; i++) consider(game.vehicles[i]);
  for (let i = 0; i < game.traffic.length; i++) consider(game.traffic[i]);

  if (!best) return;
  const ti = game.traffic.indexOf(best);
  if (ti >= 0) {
    game.traffic.splice(ti, 1);
    best.ai = false;
    game.vehicles.push(best);
  }
  best.driver = 'player';
  p.inVehicle = best;
  game.audio.init();
  game.audio.engineStart();
}

function cycleWeapon(game, dir) {
  const p = game.player;
  const available = WEAPON_ORDER.filter((id) => id === 'fists' || (p.ammo[id] || 0) > 0);
  if (available.length <= 1) return;
  let idx = available.indexOf(p.weapon);
  idx = (idx + dir + available.length) % available.length;
  p.weapon = available[idx];
  game.audio.ui();
}

function selectWeapon(game, index) {
  const id = WEAPON_ORDER[index];
  if (!id) return;
  const p = game.player;
  if (id !== 'fists' && (p.ammo[id] || 0) <= 0) return;
  p.weapon = id;
  game.audio.ui();
}

function updateAim(game) {
  const m = game.input.mouse;
  m.worldX = game.camera.x - game.canvas.width / 2 + m.x;
  m.worldY = game.camera.y - game.canvas.height / 2 + m.y;
}

window.addEventListener('keydown', (e) => {
  game.audio.init();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();

  if (game.state !== 'playing') {
    handleMenuKey(game, e.code);
    return;
  }

  if (e.code === 'Escape') {
    game.state = 'paused';
    game.menuIndex = 0;
    game.input.keys.clear();
    game.input.mouse.down = false;
    game.audio.engineStop();
    return;
  }

  if (e.repeat) {
    game.input.keys.add(e.code);
    return;
  }
  game.input.keys.add(e.code);

  if (e.code === 'KeyE') toggleVehicle(game);
  if (e.code === 'KeyF' && !game.player.inVehicle) meleeAttack(game);
  if (e.code === 'Digit1') selectWeapon(game, 0);
  if (e.code === 'Digit2') selectWeapon(game, 1);
  if (e.code === 'Digit3') selectWeapon(game, 2);
  if (e.code === 'Digit4') selectWeapon(game, 3);
  if (e.code === 'KeyM') {
    game.settings.minimap = !game.settings.minimap;
    saveSettings(game.settings);
  }
});

window.addEventListener('keyup', (e) => {
  game.input.keys.delete(e.code);
});

window.addEventListener('blur', () => {
  game.input.keys.clear();
  game.input.mouse.down = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  game.input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  game.input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('mousedown', (e) => {
  game.audio.init();
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (game.state !== 'playing') {
    menuClick(game, mx, my);
    return;
  }
  if (e.button === 0) game.input.mouse.down = true;
  if (e.button === 2) {
    if (!game.player.inVehicle) meleeAttack(game);
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) game.input.mouse.down = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('wheel', (e) => {
  if (game.state !== 'playing') return;
  e.preventDefault();
  cycleWeapon(game, e.deltaY > 0 ? 1 : -1);
}, { passive: false });

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  game.dt = dt;

  if (game.state === 'playing') {
    game.time += dt;
    updateAim(game);
    const p = game.player;

    updatePlayer(game, dt);

    if (p.inVehicle) {
      const v = p.inVehicle;
      const k = game.input.keys;
      const up = k.has('KeyW') || k.has('ArrowUp');
      const down = k.has('KeyS') || k.has('ArrowDown');
      const left = k.has('KeyA') || k.has('ArrowLeft');
      const right = k.has('KeyD') || k.has('ArrowRight');
      updateVehicle(game, v, dt, {
        throttle: up ? 1 : 0,
        brake: down ? 1 : 0,
        reverse: down && v.speed <= 1,
        steer: (right ? 1 : 0) - (left ? 1 : 0),
        handbrake: k.has('Space')
      });
      p.x = v.x;
      p.y = v.y;
      game.audio.setEngine(Math.min(1, Math.abs(v.speed) / v.spec.maxSpeed));
    }

    updateTraffic(game, dt);
    updatePeds(game, dt);
    checkVehiclePedHits(game);
    updatePolice(game, dt);

    if (game.input.mouse.down && !p.inVehicle && !p.dead) playerAttack(game);
    updateBullets(game, dt);
    if (p.inVehicle && p.inVehicle.dead) {
      const wreck = p.inVehicle;
      p.inVehicle = null;
      const res = resolveCircle(game.city, wreck.x + wreck.h + 20, wreck.y, p.r);
      p.x = res.x;
      p.y = res.y;
      game.audio.engineStop();
    }
    game.vehicles = game.vehicles.filter((v) => !v.dead);
    updateParticles(game.particles, dt);
    updateMissions(game, dt);
    updateWanted(game, dt);
    updateMessages(game, dt);
    updateCamera(game, dt);

    if (game.wanted.stars > 0) game.audio.sirenStart();
    else game.audio.sirenStop();
  } else if (game.state === 'dead') {
    game.audio.engineStop();
    game.audio.sirenStop();
    updateParticles(game.particles, dt);
    updateCamera(game, dt);
    updateAim(game);
  }

  render(game);
  requestAnimationFrame(frame);
}

buildWorld(game);
game.audio.setVolume(game.settings.volume);
requestAnimationFrame(frame);
