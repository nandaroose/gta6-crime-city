// city.js — procedural generation of Solano City: a deterministic, seeded
// 100x100 tile grid with a road network (2-lane streets + 4-lane avenues),
// building blocks with rooftop clutter, parks, a beach and the ocean on the
// east edge, named districts, and tile-level collision data.

import { GRID, TILE, hash2, makeRng, clamp } from './utils.js';

// Tile codes
export const T = {
  EMPTY: 0,     // ocean
  SAND: 1,      // beach
  ROAD: 2,
  SIDEWALK: 3,
  PARK: 4,
  BUILDING: 5,
};

export const ROAD_SPACING = 8;    // a street every 8 tiles
export const AVENUE_SPACING = 32;
export const OCEAN_COLS = 6;     // east edge is water
export const WORLD = GRID * TILE;

export const DISTRICTS = [
  { name: 'Casco Viejo',   x0: 0,  y0: 52, x1: 48, y1: 100 },
  { name: 'Sunrise Mile',  x0: 0,  y0: 0,  x1: 100, y1: 20 },
  { name: 'Palm Groves',   x0: 0,  y0: 20, x1: 52, y1: 52 },
  { name: 'Marea Harbor',  x0: 48, y0: 20, x1: 100, y1: 70 },
  { name: 'Golden Vista',  x0: 52, y0: 70, x1: 100, y1: 100 },
];

export function districtAt(tx, ty) {
  for (const d of DISTRICTS) {
    if (tx >= d.x0 && tx < d.x1 && ty >= d.y0 && ty < d.y1) return d.name;
  }
  return 'Solano City';
}

// Buildings: { x, y, w, h (px), height (fake 3D), color, roofSeed, district }
// Parks: { x, y, w, h, trees: [{x,y,r}] }
// Water/beach handled by tiles.
export class City {
  constructor(seed = 20261) {
    this.seed = seed;
    this.tiles = new Uint8Array(GRID * GRID);
    this.roadAxisH = new Set(); // rows that are roads
    this.roadAxisV = new Set(); // cols that are roads
    this.avenues = new Set();   // multi-lane axis ids
    this.buildings = [];
    this.parks = [];
    this.specials = []; // police station, hospital, mission spots
    this.generate();
  }

  t(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) return T.EMPTY;
    return this.tiles[ty * GRID + tx];
  }

  set(tx, ty, v) { this.tiles[ty * GRID + tx] = v; }

  isRoad(tx, ty) { return this.t(tx, ty) === T.ROAD; }
  isWalkable(tx, ty) {
    const v = this.t(tx, ty);
    return v === T.ROAD || v === T.SIDEWALK || v === T.PARK || v === T.SAND;
  }
  solidAtWorld(x, y) {
    return !this.isWalkable(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  generate() {
    const rng = makeRng(this.seed);
    // 1) Road grid
    for (let i = 2; i < GRID - OCEAN_COLS; i++) {
      const isAV = (i % AVENUE_SPACING) === 2;
      if (isAV) this.avenues.add(i);
      if (i % ROAD_SPACING === 2 || isAV) {
        // horizontal road at row i
        for (let x = 0; x < GRID - OCEAN_COLS; x++) this.set(x, i, T.ROAD);
        this.roadAxisH.add(i);
        // vertical road at col i
        for (let y = 0; y < GRID; y++) this.set(i, y, T.ROAD);
        this.roadAxisV.add(i);
      }
    }
    // 2) Sidewalks around roads
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID - OCEAN_COLS; x++) {
        if (this.t(x, y) !== T.EMPTY) continue;
        const nearRoad =
          this.roadAxisH.has(y - 1) || this.roadAxisH.has(y + 1) ||
          this.roadAxisV.has(x - 1) || this.roadAxisV.has(x + 1);
        if (nearRoad) this.set(x, y, T.SIDEWALK);
      }
    }
    // 3) Ocean + beach on east edge
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const xOcean = GRID - OCEAN_COLS;
        if (x >= xOcean) {
          this.set(x, y, x < xOcean + 2 ? T.SAND : T.EMPTY);
        }
      }
    }
    // 4) Fill blocks with buildings / parks
    for (const ry of this.roadAxisH) {
      const ry2 = ry + ROAD_SPACING; // next road row (approx block height)
      if (ry2 >= GRID) continue;
      for (const rx of this.roadAxisV) {
        const rx2 = rx + ROAD_SPACING;
        if (rx2 >= GRID - OCEAN_COLS) continue;
        this.fillBlock(rx + 1, ry + 1, rx2 - 1, Math.min(ry2, GRID - OCEAN_COLS) - 1, rng);
      }
    }
    // 5) Special locations
    this.specials = [
      { id: 'police', name: 'Solano PD — Precinct 1', tx: 34, ty: 18 },
      { id: 'hospital', name: 'La Costa Medical', tx: 66, ty: 50 },
      { id: 'garage', name: "Delmar's Garage", tx: 18, ty: 42 },
    ];
  }

  fillBlock(x0, y0, x1, y1, rng) {
    // A block may become a park (rare) or split into 1-4 buildings.
    if (rng() < 0.12) {
      this.makePark(x0, y0, x1, y1, rng);
      return;
    }
    // Split the block into random subdivisions.
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const cutsX = Math.max(0, Math.floor(w / 3) - 1 + (rng() < 0.5 ? 1 : 0));
    const cutsY = Math.max(0, Math.floor(h / 3) - 1 + (rng() < 0.5 ? 1 : 0));
    const xs = [x0];
    for (let i = 0; i < cutsX; i++) xs.push(xs[xs.length - 1] + 2 + Math.floor(rng() * 2));
    xs.push(x1 + 1);
    const ys = [y0];
    for (let i = 0; i < cutsY; i++) ys.push(ys[ys.length - 1] + 2 + Math.floor(rng() * 2));
    ys.push(y1 + 1);

    for (let iy = 0; iy < ys.length - 1; iy++) {
      for (let ix = 0; ix < xs.length - 1; ix++) {
        const bx0 = xs[ix], bx1 = xs[ix + 1] - 1;
        const by0 = ys[iy], by1 = ys[iy + 1] - 1;
        if (bx1 < bx0 || by1 < by0) continue;
        if (rng() < 0.08) { // small courtyard between buildings
          continue;
        }
        const shade = 46 + Math.floor(rng() * 34);
        const hue = [ '#b8a68c', '#a68f78', '#9c8d7a', '#8d9aa6', '#b09a86', '#7e8894' ][Math.floor(rng() * 6)];
        this.buildings.push({
          x: bx0 * TILE, y: by0 * TILE,
          w: (bx1 - bx0 + 1) * TILE, h: (by1 - by0 + 1) * TILE,
          height: 10 + rng() * 26,
          color: hue,
          gray: shade,
          roofSeed: Math.floor(rng() * 65535),
        });
        for (let y = by0; y <= by1; y++)
          for (let x = bx0; x <= bx1; x++) this.set(x, y, T.BUILDING);
      }
    }
  }

  makePark(x0, y0, x1, y1, rng) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) this.set(x, y, T.PARK);
    const trees = [];
    const n = 3 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      trees.push({
        x: (x0 + rng() * (x1 - x0 + 1)) * TILE,
        y: (y0 + rng() * (y1 - y0 + 1)) * TILE,
        r: 8 + rng() * 7,
      });
    }
    this.parks.push({ x: x0 * TILE, y: y0 * TILE, w: (x1 - x0 + 1) * TILE, h: (y1 - y0 + 1) * TILE, trees });
  }

  // Lane helper for traffic: returns lane offset (px) from road centerline.
  laneOffset(axisId) { return this.avenues.has(axisId) ? 20 : 10; }

  // Find a road tile near a world position (for spawning).
  nearestRoadTile(tx, ty) {
    tx = clamp(tx, 2, GRID - OCEAN_COLS - 2) | 0;
    ty = clamp(ty, 2, GRID - 2) | 0;
    for (let r = 0; r < 24; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.isRoad(tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
        }
      }
    }
    return null;
  }

  isAvenueRow(ty) { return this.roadAxisH.has(ty) && this.avenues.has(ty); }
  isAvenueCol(tx) { return this.roadAxisV.has(tx) && this.avenues.has(tx); }
}

// Roof-top clutter: given a building and its roofSeed, list AC units/vents.
export function roofDetails(b) {
  const items = [];
  const r = makeRng(b.roofSeed);
  const n = 1 + Math.floor(r() * (b.w * b.h) / 900);
  for (let i = 0; i < n; i++) {
    items.push({
      x: b.x + 6 + r() * Math.max(1, b.w - 16),
      y: b.y + 6 + r() * Math.max(1, b.h - 16),
      w: 8 + r() * 8, h: 8 + r() * 8,
      type: r() < 0.7 ? 'ac' : 'vent',
    });
  }
  return items;
}
