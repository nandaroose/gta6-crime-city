// utils.js — shared math helpers, seeded RNG, and small generic utilities.

export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }
export function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
export function angleLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

// Mulberry32 — deterministic seeded PRNG for city generation.
export function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, seed = 1337) {
  let h = (x * 374761393 + y * 668265263 + seed * 974711) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Grid tile helpers.
export const TILE = 32;          // world units per tile
export const GRID = 100;         // city is GRID x GRID tiles

export function tileOf(x, y) { return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) }; }
export function tileCenter(tx, ty) { return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }; }
