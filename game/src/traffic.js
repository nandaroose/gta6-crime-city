import { CELL, WORLD, BLOCKS } from './config.js';
import { clamp, rand, randInt, dist } from './utils.js';
import { createVehicle, updateVehicle, drawVehicle } from './vehicles.js';
import { resolveCircle } from './city.js';

const TYPES = [
  ['sedan', 5], ['taxi', 2], ['van', 2], ['sports', 2]
];

function pickType(rng) {
  const total = TYPES.reduce((s, t) => s + t[1], 0);
  let r = rng() * total;
  for (const t of TYPES) {
    r -= t[1];
    if (r <= 0) return t[0];
  }
  return 'sedan';
}

export function spawnTrafficCar(game, awayFrom = null) {
  const rng = Math.random;
  for (let attempt = 0; attempt < 20; attempt++) {
    const band = randInt(rng, 0, BLOCKS);
    const axis = rng() < 0.5 ? 'h' : 'v';
    const sign = rng() < 0.5 ? 1 : -1;
    const along = rand(rng, 80, WORLD - 80);
    const lane = band * CELL + (axis === 'h'
      ? (sign > 0 ? 60 : 20)
      : (sign > 0 ? 20 : 60));
    const x = axis === 'h' ? along : lane;
    const y = axis === 'h' ? lane : along;
    const ref = awayFrom || (game.player ? { x: game.player.x, y: game.player.y } : null);
    if (ref && dist(x, y, ref.x, ref.y) < 520) continue;

    let blocked = false;
    for (let i = 0; i < game.traffic.length; i++) {
      const o = game.traffic[i];
      if (dist(x, y, o.x, o.y) < 130) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    const v = createVehicle(pickType(rng), x, y, 0);
    v.axis = axis;
    v.band = band;
    v.dir = axis === 'h' ? { x: sign, y: 0 } : { x: 0, y: sign };
    v.angle = Math.atan2(v.dir.y, v.dir.x);
    v.driver = 'ai';
    v.turnCooldown = rand(rng, 0.2, 1.2);
    v.ai = true;
    game.traffic.push(v);
    return v;
  }
  return null;
}

export function populateTraffic(game, count) {
  for (let i = 0; i < count; i++) spawnTrafficCar(game);
}

function nearestCenter(axis, coord) {
  return Math.round((coord - 40) / CELL) * CELL + 40;
}

function maybeTurn(game, v, dt) {
  v.turnCooldown = Math.max(0, v.turnCooldown - dt);
  if (v.turnCooldown > 0) return;

  let coord;
  let prev;
  if (v.axis === 'h') {
    coord = v.x;
    prev = v.prevX;
  } else {
    coord = v.y;
    prev = v.prevY;
  }

  let center;
  let crossed = false;
  let outOfBounds = false;

  if (v.axis === 'h') {
    if (v.dir.x > 0) {
      center = (Math.floor((prev - 40) / CELL) + 1) * CELL + 40;
      crossed = coord >= center;
    } else {
      center = (Math.ceil((prev - 40) / CELL) - 1) * CELL + 40;
      crossed = coord <= center;
    }
  } else if (v.dir.y > 0) {
    center = (Math.floor((prev - 40) / CELL) + 1) * CELL + 40;
    crossed = coord >= center;
  } else {
    center = (Math.ceil((prev - 40) / CELL) - 1) * CELL + 40;
    crossed = coord <= center;
  }

  if (center < 0 || center > WORLD) {
    outOfBounds = true;
    crossed = true;
    center = center < 0 ? 40 : WORLD - 40;
  }
  if (!crossed) return;

  let k = clamp(Math.round((center - 40) / CELL), 0, BLOCKS);
  const alongSign = v.axis === 'h' ? v.dir.x : v.dir.y;
  const straightAllowed = !outOfBounds && k + alongSign >= 0 && k + alongSign <= BLOCKS;
  const turnRoll = Math.random();
  const straight = straightAllowed && turnRoll < 0.6;

  if (straight) {
    v.turnCooldown = 1.1;
    return;
  }

  const left = Math.random() < 0.5;
  if (v.axis === 'h') {
    const ny = v.dir.x > 0 ? (left ? -1 : 1) : (left ? 1 : -1);
    v.axis = 'v';
    v.band = k;
    v.dir = { x: 0, y: ny };
    v.x = k * CELL + (ny > 0 ? 20 : 60);
    v.angle = ny > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    const nx = v.dir.y > 0 ? (left ? 1 : -1) : (left ? -1 : 1);
    v.axis = 'h';
    v.band = k;
    v.dir = { x: nx, y: 0 };
    v.y = k * CELL + (nx > 0 ? 60 : 20);
    v.angle = nx > 0 ? 0 : Math.PI;
  }
  v.turnCooldown = 1.5;
}

function obstacleAhead(game, v) {
  const ax = v.x + v.dir.x * 58;
  const ay = v.y + v.dir.y * 58;
  const near = 40;

  for (let i = 0; i < game.traffic.length; i++) {
    const o = game.traffic[i];
    if (o === v || o.dead) continue;
    if (dist(ax, ay, o.x, o.y) < near + 14) return true;
  }
  for (let i = 0; i < game.vehicles.length; i++) {
    const o = game.vehicles[i];
    if (o.dead) continue;
    if (dist(ax, ay, o.x, o.y) < near + 12) return true;
  }
  if (game.police) {
    for (let i = 0; i < game.police.cars.length; i++) {
      const o = game.police.cars[i];
      if (dist(ax, ay, o.x, o.y) < near + 12) return true;
    }
  }
  const p = game.player;
  if (p && !p.inVehicle && dist(ax, ay, p.x, p.y) < near) return true;
  for (let i = 0; i < game.peds.length; i++) {
    const o = game.peds[i];
    if (o.dead) continue;
    if (dist(ax, ay, o.x, o.y) < near - 6) return true;
  }
  return false;
}

export function updateTraffic(game, dt) {
  game.trafficTimer = (game.trafficTimer || 0) - dt;
  if (game.traffic.length < 18 && game.trafficTimer <= 0) {
    game.trafficTimer = 3;
    spawnTrafficCar(game);
  }
  for (let i = game.traffic.length - 1; i >= 0; i--) {
    const v = game.traffic[i];
    if (v.dead) {
      game.traffic.splice(i, 1);
      continue;
    }
    v.prevX = v.x;
    v.prevY = v.y;

    let throttle = 1;
    let brake = 0;
    if (obstacleAhead(game, v)) {
      throttle = 0;
      brake = 0.8;
    }
    const coord = v.axis === 'h' ? v.x : v.y;
    const center = nearestCenter(v.axis, coord);
    if (Math.abs(coord - center) < 68) throttle = Math.min(throttle, 0.5);

    const desired = Math.atan2(v.dir.y, v.dir.x);
    let steer = clamp(((desired - v.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 2.2, -1, 1);
    steer = clamp(steer, -0.9, 0.9);

    updateVehicle(game, v, dt, { throttle, brake, steer });

    maybeTurn(game, v, dt);

    if (v.x < -80 || v.y < -80 || v.x > WORLD + 80 || v.y > WORLD + 80) {
      const res = resolveCircle(game.city, clamp(v.x, 60, WORLD - 60), clamp(v.y, 60, WORLD - 60), v.h);
      v.x = res.x;
      v.y = res.y;
    }
  }
}

export function drawTraffic(ctx, game, view, time) {
  for (let i = 0; i < game.traffic.length; i++) {
    const v = game.traffic[i];
    if (v.x < view.x - 80 || v.y < view.y - 80 || v.x > view.x + view.w + 80 || v.y > view.y + view.h + 80) continue;
    drawVehicle(ctx, v, time);
  }
}
