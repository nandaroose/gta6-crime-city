// savegame.js — localStorage persistence: 3 manual slots + autosave. Serializes
// player state, mission progress, money and position.

const PREFIX = 'solano-city-save-';
export const SLOTS = ['1', '2', '3', 'auto'];

export function saveGame(slot, world) {
  const p = world.player;
  const data = {
    version: 1,
    savedAt: Date.now(),
    missionIndex: world.missions.index,
    x: p.car ? p.car.x : p.x,
    y: p.car ? p.car.y : p.y,
    inCar: !!p.car,
    health: p.health,
    armor: p.armor,
    money: p.money,
    weapon: p.weapon,
    ammo: p.ammo,
  };
  try {
    localStorage.setItem(PREFIX + slot, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame(slot) {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function slotInfo(slot) {
  const d = loadGame(slot);
  if (!d) return null;
  return {
    savedAt: d.savedAt,
    missionIndex: d.missionIndex,
    money: d.money,
  };
}

export function applySave(data, world) {
  const p = world.player;
  world.missions.index = data.missionIndex || 0;
  p.health = data.health ?? 100;
  p.armor = data.armor || 0;
  p.money = data.money || 0;
  p.weapon = data.weapon || 'fists';
  p.ammo = data.ammo || { pistol: 0, smg: 0 };
  p.x = data.x; p.y = data.y;
  p.car = null;
}

export function clearSave(slot) {
  try { localStorage.removeItem(PREFIX + slot); } catch (e) { /* ignore */ }
}
