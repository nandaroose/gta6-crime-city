import { CRIME } from './config.js';
import { clamp, dist, rand } from './utils.js';
import { randomRoadPoint, resolveCircle, pointInSolid } from './city.js';
import { createVehicle, updateVehicle, drawVehicle } from './vehicles.js';
import { spawnBlood, spawnMuzzle, spawnTracer } from './particles.js';
import { addWanted } from './wanted.js';
import { damagePlayer } from './player.js';

export function createPoliceState() {
  return { officers: [], cars: [], spawnTimer: 0, despawnTimer: 0 };
}

function nearRoad(game, min, max) {
  const p = game.player;
  for (let i = 0; i < 24; i++) {
    const pt = randomRoadPoint(Math.random, p, min);
    if (dist(pt.x, pt.y, p.x, p.y) <= max) return pt;
  }
  return randomRoadPoint(Math.random, p, min);
}

function spawnOfficer(game) {
  const pt = nearRoad(game, 480, 1000);
  game.police.officers.push({
    x: pt.x, y: pt.y, r: 9, angle: 0,
    health: 70, shootTimer: rand(Math.random, 0.6, 1.4),
    walkPhase: 0, hitFlash: 0, dead: false
  });
}

function spawnCopCar(game) {
  const pt = nearRoad(game, 620, 1200);
  const v = createVehicle('police', pt.x, pt.y, 0);
  v.driver = 'ai';
  v.chase = true;
  v.ramTimer = 0;
  v.angle = Math.atan2(game.player.y - pt.y, game.player.x - pt.x);
  game.police.cars.push(v);
}

export function updatePolice(game, dt) {
  const state = game.police;
  const stars = game.wanted.stars;
  const p = game.player;

  if (stars <= 0) {
    state.despawnTimer += dt;
    if (state.despawnTimer > 2.5) {
      state.officers.length = 0;
      state.cars.length = 0;
    }
    return;
  }
  state.despawnTimer = 0;

  const targetOfficers = Math.min(8, stars * 2);
  const targetCars = stars >= 2 ? Math.min(4, stars - 1) : 0;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.spawnTimer = 1.7;
    if (state.officers.length < targetOfficers) spawnOfficer(game);
    if (state.cars.length < targetCars) spawnCopCar(game);
  }

  for (let i = state.officers.length - 1; i >= 0; i--) {
    const off = state.officers[i];
    off.hitFlash = Math.max(0, off.hitFlash - dt);
    if (off.dead) {
      state.officers.splice(i, 1);
      continue;
    }
    const d = dist(off.x, off.y, p.x, p.y);
    if (d > 2400) {
      state.officers.splice(i, 1);
      continue;
    }
    const ang = Math.atan2(p.y - off.y, p.x - off.x);
    off.angle = ang;
    let vx = 0;
    let vy = 0;
    if (d > 230) {
      vx = Math.cos(ang) * 118;
      vy = Math.sin(ang) * 118;
    } else if (d < 120) {
      vx = -Math.cos(ang) * 45;
      vy = -Math.sin(ang) * 45;
    }
    if (vx || vy) {
      const res = resolveCircle(game.city, off.x + vx * dt, off.y + vy * dt, off.r);
      off.x = res.x;
      off.y = res.y;
      off.walkPhase += dt * 10;
    }
    off.shootTimer -= dt;
    if (off.shootTimer <= 0 && d < 520 && !p.dead) {
      off.shootTimer = rand(Math.random, 0.85, 1.5);
      let blocked = false;
      const steps = Math.ceil(d / 34);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        if (pointInSolid(game.city, off.x + (p.x - off.x) * t, off.y + (p.y - off.y) * t)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        spawnMuzzle(game.particles, off.x + Math.cos(ang) * 12, off.y + Math.sin(ang) * 12, ang);
        if (game.audio) game.audio.gun('pistol');
        const accuracy = clamp(0.8 - d / 800, 0.2, 0.75);
        if (Math.random() < accuracy) {
          spawnTracer(game.particles, off.x, off.y, p.x, p.y);
          damagePlayer(game, rand(Math.random, 7, 12), 'cop');
        } else {
          spawnTracer(game.particles, off.x, off.y,
            p.x + rand(Math.random, -90, 90), p.y + rand(Math.random, -90, 90));
        }
      }
    }
  }

  for (let i = state.cars.length - 1; i >= 0; i--) {
    const v = state.cars[i];
    if (v.dead) {
      state.cars.splice(i, 1);
      continue;
    }
    const d = dist(v.x, v.y, p.x, p.y);
    if (d > 2200) {
      state.cars.splice(i, 1);
      continue;
    }
    const desired = Math.atan2(p.y - v.y, p.x - v.x);
    let steer = clamp(((desired - v.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 1.8, -1, 1);
    const throttle = d > 110 ? 1 : 0;
    const brake = d < 80 ? 1 : 0;
    updateVehicle(game, v, dt, { throttle, brake, steer });
    v.ramTimer = Math.max(0, v.ramTimer - dt);
    if (d < v.h + 26 && Math.abs(v.speed) > 130 && v.ramTimer <= 0 && !p.dead) {
      v.ramTimer = 1;
      damagePlayer(game, rand(Math.random, 6, 11), 'car');
      if (game.audio) game.audio.impact();
    }
  }
}

export function damageOfficer(game, off, amount) {
  if (off.dead) return;
  off.health -= amount;
  off.hitFlash = 0.2;
  spawnBlood(game.particles, off.x, off.y, Math.random() * Math.PI * 2, 4);
  if (off.health <= 0) {
    off.dead = true;
    spawnBlood(game.particles, off.x, off.y, Math.random() * Math.PI * 2, 12);
    addWanted(game, CRIME.killCop, 'cop killer');
    const idx = game.police.officers.indexOf(off);
    if (idx >= 0) game.police.officers.splice(idx, 1);
  }
}

export function drawOfficer(ctx, off) {
  if (off.dead) return;
  const bob = Math.sin(off.walkPhase) * 1.4;
  ctx.save();
  ctx.translate(off.x, off.y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(off.angle);
  ctx.fillStyle = off.hitFlash > 0 ? '#ffffff' : '#26365e';
  ctx.beginPath();
  ctx.ellipse(0, bob * 0.15, 9.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0b48c';
  ctx.beginPath();
  ctx.arc(3, 0, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#141b2b';
  ctx.fillRect(1, -6, 8, 3);
  ctx.fillStyle = '#1b1f25';
  ctx.fillRect(8, -1.5, 10, 3);
  ctx.restore();
}

export function drawPoliceCars(ctx, game, view, time) {
  for (let i = 0; i < game.police.cars.length; i++) {
    const v = game.police.cars[i];
    if (v.x < view.x - 90 || v.y < view.y - 90 || v.x > view.x + view.w + 90 || v.y > view.y + view.h + 90) continue;
    drawVehicle(ctx, v, time);
  }
}
