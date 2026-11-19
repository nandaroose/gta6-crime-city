import { SAVE_KEY, SETTINGS_KEY } from './config.js';
import { STAR_POINTS } from './wanted.js';

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function saveGame(game) {
  try {
    const p = game.player;
    const data = {
      version: 1,
      savedAt: Date.now(),
      time: game.time,
      storyIndex: game.mission.index,
      wantedPoints: game.wanted.points,
      player: {
        x: p.x,
        y: p.y,
        health: p.health,
        armor: p.armor,
        money: p.money,
        weapon: p.weapon,
        ammo: { pistol: p.ammo.pistol, smg: p.ammo.smg, shotgun: p.ammo.shotgun },
        kills: p.kills
      }
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(game) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.version !== 1 || !d.player) return false;

    const p = game.player;
    p.dead = false;
    p.inVehicle = null;
    p.x = d.player.x;
    p.y = d.player.y;
    p.health = d.player.health;
    p.armor = d.player.armor || 0;
    p.money = d.player.money || 0;
    p.weapon = d.player.weapon || 'pistol';
    p.ammo = { pistol: 0, smg: 0, shotgun: 0 };
    if (d.player.ammo) {
      p.ammo.pistol = d.player.ammo.pistol || 0;
      p.ammo.smg = d.player.ammo.smg || 0;
      p.ammo.shotgun = d.player.ammo.shotgun || 0;
    }
    p.kills = d.player.kills || 0;

    const m = game.mission;
    m.index = Math.min(d.storyIndex || 0, 8);
    m.active = false;
    m.step = 0;
    m.marker = null;
    m.objective = '';
    m.package = null;
    m.markerVehicle = null;
    m.stepHostiles = [];
    m.cooldown = 2;
    m.titleTimer = 0;
    m.endingShown = m.index >= 8;

    game.wanted.points = d.wantedPoints || 0;
    game.wanted.stars = Math.min(5, Math.floor((d.wantedPoints || 0) / STAR_POINTS));
    game.wanted.heat = 0;
    game.wanted.decay = 0;

    game.vehicles.length = 0;
    game.traffic.length = 0;
    game.peds.length = 0;
    game.police.officers.length = 0;
    game.police.cars.length = 0;
    game.bullets.length = 0;
    game.particles.length = 0;
    game.messages.length = 0;

    game.state = 'playing';
    game.camera.x = p.x;
    game.camera.y = p.y;
    if (game.audio) {
      game.audio.sirenStop();
      game.audio.engineStop();
    }
    if (typeof game.onAfterLoad === 'function') game.onAfterLoad();
    return true;
  } catch {
    return false;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return d;
  } catch {
    return null;
  }
}
