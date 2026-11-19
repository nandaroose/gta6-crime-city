// localStorage save slots, autosave and the settings blob.

import { MISSIONS } from './story.js';

const SAVE_KEY = 'solano-city-saves-v1';
const SETTINGS_KEY = 'solano-city-settings-v1';

export class SaveGame {
  constructor() {
    this.key = SAVE_KEY;
  }

  readAll() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  writeAll(all) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(all));
    } catch {
      /* storage is full or blocked: keep playing */
    }
  }

  list() {
    const all = this.readAll();
    const out = [];
    for (const slot of ['1', '2', '3']) out.push({ slot, label: 'Slot ' + slot, data: all[slot] || null });
    out.push({ slot: 'auto', label: 'Autosave', data: all.auto || null });
    return out;
  }

  save(slot, game) {
    const all = this.readAll();
    const data = this.serialize(game);
    data.slot = slot;
    all[slot] = data;
    this.writeAll(all);
    game.hud.notify(slot === 'auto' ? 'Autosaved' : 'Saved to slot ' + slot, 'info');
    return data;
  }

  autosave(game) {
    if (game.state === 'title' || game.player.dead) return;
    this.save('auto', game);
  }

  load(slot, game) {
    const data = this.readAll()[slot];
    if (!data) return false;
    this.apply(game, data);
    return true;
  }

  clear(slot) {
    const all = this.readAll();
    delete all[slot];
    this.writeAll(all);
  }

  serialize(game) {
    const p = game.player;
    const def = game.missions.def || MISSIONS[Math.min(game.missions.index, MISSIONS.length - 1)];
    return {
      version: 1,
      savedAt: Date.now(),
      x: p.x,
      y: p.y,
      health: p.health,
      armour: p.armour,
      money: p.money,
      weapon: p.weapon,
      ammo: { ...p.ammo },
      owned: { ...p.owned },
      wanted: game.wanted.level,
      missionIndex: game.missions.index,
      missionTitle: game.missions.index >= MISSIONS.length ? 'Free roam' : def ? def.title : 'Free roam',
      clock: game.clockHours,
      playTime: game.playTime,
    };
  }

  apply(game, data) {
    const p = game.player;
    p.dead = false;
    p.deadTimer = 0;
    p.vehicle = null;
    p.x = data.x;
    p.y = data.y;
    p.health = data.health;
    p.armour = data.armour ?? 0;
    p.money = data.money ?? 0;
    p.weapon = data.weapon || 'pistol';
    p.ammo = { pistol: 24, smg: 0, shotgun: 0, ...(data.ammo || {}) };
    p.owned = { fists: true, pistol: true, smg: false, shotgun: false, ...(data.owned || {}) };
    p.invuln = 1.5;
    game.wanted.hold = false;
    game.wanted.set(data.wanted || 0);
    const m = game.missions;
    m.index = Math.min(data.missionIndex || 0, MISSIONS.length);
    m.state = 'idle';
    m.def = null;
    m.step = null;
    m.timer = 0;
    m.objectives = [];
    m.targets = [];
    m.missionVehicle = null;
    m.marker = null;
    m.cooldown = 2;
    m.storyDone = m.index >= MISSIONS.length;
    game.clockHours = data.clock ?? 17.4;
    game.playTime = data.playTime ?? 0;
    game.police.clear();
  }

  readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  writeSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }
}
