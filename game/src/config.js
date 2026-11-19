export const TILE = 40;
export const CELL_TILES = 10;
export const ROAD_TILES = 2;
export const BLOCKS = 10;
export const CELL = TILE * CELL_TILES;
export const ROAD_W = TILE * ROAD_TILES;
export const WORLD = BLOCKS * CELL + ROAD_W;
export const START = { x: 2 * CELL + 40, y: 2 * CELL + 40 };

export const PLAYER = {
  radius: 11,
  walk: 168,
  sprint: 258,
  maxHealth: 100,
  maxArmor: 100,
  startMoney: 400
};

export const CRIME = {
  shoot: 10,
  killPed: 32,
  killCop: 52,
  hitCop: 22,
  stealCar: 20,
  rampage: 18
};

export const WEAPONS = {
  fists: { name: 'Fists', melee: true, damage: 16, rate: 0.36, range: 44, ammo: Infinity },
  pistol: {
    name: 'Pistol', damage: 24, rate: 0.3, speed: 980, spread: 0.03, range: 640,
    ammo: 12, maxAmmo: 150, pellets: 1, sound: 'pistol'
  },
  smg: {
    name: 'SMG', damage: 13, rate: 0.085, speed: 1060, spread: 0.085, range: 560,
    ammo: 30, maxAmmo: 320, pellets: 1, auto: true, sound: 'smg'
  },
  shotgun: {
    name: 'Shotgun', damage: 10, rate: 0.82, speed: 840, spread: 0.2, range: 400,
    ammo: 6, maxAmmo: 48, pellets: 7, sound: 'shotgun'
  }
};

export const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun'];

export const VEHICLES = {
  sedan: {
    name: 'Sedan', w: 46, h: 24, accel: 320, maxSpeed: 330, turn: 2.7,
    colors: ['#c94f4f', '#4f7fc9', '#d9c26a', '#7a7f88', '#5aa06a', '#b46ac9']
  },
  sports: {
    name: 'Comet', w: 44, h: 21, accel: 440, maxSpeed: 470, turn: 3.1,
    colors: ['#e04a2f', '#2fd0c8', '#f0f0f0', '#7b2fd0', '#e8c33a']
  },
  van: {
    name: 'Van', w: 56, h: 28, accel: 220, maxSpeed: 240, turn: 2.0,
    colors: ['#d8d8d8', '#6b5b4b', '#3f6b8a', '#8a3f3f']
  },
  taxi: {
    name: 'Taxi', w: 47, h: 24, accel: 310, maxSpeed: 340, turn: 2.6,
    colors: ['#e8b53a']
  },
  police: {
    name: 'Police', w: 48, h: 25, accel: 420, maxSpeed: 450, turn: 3.0,
    colors: ['#e9edf2']
  }
};

export const PED_COLORS = [
  '#c96b5a', '#5a8fc9', '#7ac95a', '#c9b25a', '#b05ac9',
  '#5ac9b8', '#d18b4a', '#8a8f9c', '#d15a8b', '#6b7a5a'
];

export const SKIN_COLORS = ['#e0b48c', '#c98d63', '#8d5a3a', '#f0cba8', '#6b4630'];

export const COLORS = {
  asphalt: '#282c33',
  asphaltDark: '#22262c',
  lane: '#7a8290',
  sidewalk: '#787d85',
  sidewalkEdge: '#5f646b',
  grass: '#3d7444',
  grassDark: '#33613a',
  path: '#a89a78',
  tree: '#2c5a33',
  treeTop: '#3f7a45',
  buildingShadow: 'rgba(0,0,0,0.28)',
  window: '#1b2129',
  windowLit: '#e9d488'
};

export const SETTINGS = {
  volume: 0.6,
  minimap: true,
  shake: true
};

export const SAVE_KEY = 'solano-city-save-v1';
export const SETTINGS_KEY = 'solano-city-settings-v1';
