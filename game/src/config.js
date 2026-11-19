// Solano City: shared tuning, palettes and weapon data.

export const TILE_SIZE = 64;
export const GRID = 44;
export const WORLD_SIZE = TILE_SIZE * GRID;

export const CONFIG = {
  tile: TILE_SIZE,
  grid: GRID,
  world: WORLD_SIZE,
  blockEvery: 7,
  roadWidth: 2,
  player: {
    radius: 12,
    walk: 138,
    run: 252,
    accel: 14,
    maxHealth: 100,
    maxArmour: 100,
    respawnTime: 2.8,
  },
  car: {
    radius: 20,
    maxSpeed: 540,
    maxReverse: 170,
    accel: 430,
    brake: 760,
    drag: 0.55,
    grip: 8.5,
    driftGrip: 2.1,
    steer: 2.9,
    health: 100,
  },
  camera: {
    follow: 5.5,
    lookahead: 0.38,
    shakeDecay: 4.5,
  },
  wanted: {
    max: 5,
    decayDelay: 16,
    decayStep: 11,
  },
  traffic: {
    max: 18,
    spawnEvery: 1.1,
    despawn: 1700,
    speed: 175,
  },
  peds: {
    max: 30,
    spawnEvery: 0.85,
    despawn: 1200,
  },
  minimap: {
    radius: 88,
    view: 560,
  },
};

export const COLORS = {
  grass: '#4d7f52',
  park: '#4f8a58',
  parkDark: '#3d6f46',
  road: '#3b3f48',
  roadDark: '#33363e',
  lane: '#e7d38a',
  sidewalk: '#cfc1a3',
  sidewalkEdge: '#b8a98b',
  sand: '#e5d095',
  sandDark: '#d4bd82',
  water: '#2d8ba8',
  waterDeep: '#24728c',
  building: ['#d98c74', '#e0b48c', '#8fb6b0', '#c9a7c4', '#b7c48c', '#e6d2a8', '#a8b8cf', '#d6a08c'],
  roof: ['#b9705c', '#c39a74', '#729b95', '#a887a5', '#94a06e', '#c4ae84', '#8595ac', '#b3816f'],
  skin: ['#e8bd96', '#c98f63', '#8d5a3b', '#f0cfae', '#6f4630'],
  shirt: ['#e26d5c', '#4f9fb8', '#f2c14e', '#7a8fd8', '#5fbf8a', '#d86f9c', '#e8e0cf', '#3f4b6e'],
  pants: ['#333a4a', '#4a4436', '#2f3d52', '#6b5a46', '#242a36'],
  police: '#2f5f9e',
  policeDark: '#1e3f6e',
  money: '#8fd47a',
  gold: '#f4c84a',
  danger: '#e8564a',
};

export const WEAPONS = {
  fists: {
    name: 'Fists',
    damage: 26,
    cooldown: 0.38,
    melee: true,
    range: 46,
  },
  pistol: {
    name: 'Pistol',
    damage: 28,
    speed: 980,
    spread: 0.035,
    cooldown: 0.26,
    pellets: 1,
    range: 760,
    auto: false,
    color: '#ffe08a',
    sound: 'pistol',
  },
  smg: {
    name: 'SMG',
    damage: 15,
    speed: 1040,
    spread: 0.09,
    cooldown: 0.085,
    pellets: 1,
    range: 700,
    auto: true,
    color: '#ffd06a',
    sound: 'smg',
  },
  shotgun: {
    name: 'Shotgun',
    damage: 13,
    speed: 880,
    spread: 0.24,
    cooldown: 0.82,
    pellets: 7,
    range: 420,
    auto: false,
    color: '#ffb35c',
    sound: 'shotgun',
  },
};

export const CAR_TYPES = [
  { name: 'Vulpa GT', w: 46, h: 25, speed: 560, accel: 470, grip: 8.8, color: '#e2604f' },
  { name: 'Manta', w: 48, h: 26, speed: 520, accel: 440, grip: 8.2, color: '#3f8fb8' },
  { name: 'Coral Cruiser', w: 52, h: 27, speed: 480, accel: 410, grip: 7.6, color: '#e8d6b0' },
  { name: 'Dune Runner', w: 50, h: 27, speed: 500, accel: 430, grip: 7.2, color: '#d6a24a' },
  { name: 'Bolt', w: 43, h: 23, speed: 545, accel: 455, grip: 8.6, color: '#7fae6a' },
  { name: 'Tide Van', w: 56, h: 29, speed: 430, accel: 380, grip: 7.0, color: '#c4b8d6' },
  { name: 'Nightcap', w: 46, h: 25, speed: 515, accel: 445, grip: 8.4, color: '#4a4f66' },
];

export const PED_FIRST = ['Marisol', 'Tito', 'Cielo', 'Rusk', 'Nadia', 'Bishop', 'Paloma', 'Dex', 'Ines', 'Rico', 'Sol', 'Vera', 'Milo', 'Cruz', 'Juno'];
export const PED_LAST = ['Vale', 'Caz', 'Rios', 'Mendez', 'Soto', 'Quin', 'Brava', 'Luna', 'Costa', 'Rey', 'Nieve', 'Mar', 'Vega', 'Ortiz'];

export const GAME_TITLE = 'SOLANO CITY';
export const GAME_SUBTITLE = 'A sun-soaked crime saga';
