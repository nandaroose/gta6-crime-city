import { clamp } from './utils.js';

export const STAR_POINTS = 26;

export function createWanted() {
  return { points: 0, stars: 0, heat: 0, decay: 0, reason: '' };
}

export function addWanted(game, points, reason = '') {
  const w = game.wanted;
  if (!w) return;
  w.points = clamp(w.points + points, 0, STAR_POINTS * 5);
  w.heat = 16;
  w.decay = 0;
  if (reason) w.reason = reason;
  const before = w.stars;
  w.stars = Math.floor(w.points / STAR_POINTS);
  if (w.stars > before && game.audio) game.audio.sirenStart();
}

export function clearWanted(game) {
  const w = game.wanted;
  w.points = 0;
  w.stars = 0;
  w.heat = 0;
  w.decay = 0;
  w.reason = '';
  if (game.audio) game.audio.sirenStop();
}

export function updateWanted(game, dt) {
  const w = game.wanted;
  if (w.points <= 0) {
    w.points = 0;
    w.stars = 0;
    return;
  }
  w.stars = clamp(Math.floor(w.points / STAR_POINTS), 0, 5);
  if (w.heat > 0) {
    w.heat -= dt;
    return;
  }
  w.decay += dt;
  if (w.decay > 4.5) {
    w.decay = 0;
    w.points = Math.max(0, w.points - STAR_POINTS);
    w.stars = Math.floor(w.points / STAR_POINTS);
    if (w.stars === 0 && game.audio) game.audio.sirenStop();
  }
}
