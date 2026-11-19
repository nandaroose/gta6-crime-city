import { PED_COLORS, SKIN_COLORS, CRIME } from './config.js';
import { clamp, dist, rand } from './utils.js';
import { resolveCircle, randomSidewalkPoint, pointInSolid } from './city.js';
import { spawnBlood, spawnTracer, spawnMuzzle } from './particles.js';
import { addWanted } from './wanted.js';
import { damagePlayer } from './player.js';

let nextPedId = 1;

export function createPed(game, x, y, opts = {}) {
  const rng = Math.random;
  return {
    id: nextPedId++,
    x, y,
    r: 9,
    angle: rand(rng, 0, Math.PI * 2),
    health: opts.health || (opts.hostile ? 55 : 40),
    color: PED_COLORS[Math.floor(rng() * PED_COLORS.length)],
    skin: SKIN_COLORS[Math.floor(rng() * SKIN_COLORS.length)],
    speed: opts.speed || rand(rng, 42, 66),
    state: opts.hostile ? 'hostile' : 'walk',
    hostile: !!opts.hostile,
    boss: !!opts.boss,
    target: null,
    timer: 0,
    panic: 0,
    shootTimer: rand(rng, 0.4, 1.4),
    walkPhase: rand(rng, 0, 10),
    dead: false,
    deadTimer: 0,
    hitFlash: 0
  };
}

export function spawnPeds(game, count) {
  for (let i = 0; i < count; i++) {
    const pt = randomSidewalkPoint(Math.random, game.player, 240);
    const ped = createPed(game, pt.x, pt.y);
    game.peds.push(ped);
  }
}

export function spawnHostiles(game, x, y, count, boss = false) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const radius = count > 1 ? 34 : 0;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    const ped = createPed(game, px, py, { hostile: true, boss: boss && i === 0 });
    if (ped.boss) {
      ped.health = 140;
      ped.speed = 60;
      ped.color = '#2b2b33';
    }
    game.peds.push(ped);
    list.push(ped);
  }
  return list;
}

function lineBlocked(city, x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(d / 34);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInSolid(city, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return true;
  }
  return false;
}

export function updatePeds(game, dt) {
  const p = game.player;
  const shot = game.lastShot;
  for (let i = game.peds.length - 1; i >= 0; i--) {
    const ped = game.peds[i];
    ped.hitFlash = Math.max(0, ped.hitFlash - dt);

    if (ped.dead) {
      ped.deadTimer += dt;
      if (ped.deadTimer > 18) game.peds.splice(i, 1);
      continue;
    }

    if (shot && game.time - shot.t < 4 && dist(ped.x, ped.y, shot.x, shot.y) < 430 && ped.state !== 'hostile') {
      ped.state = 'flee';
      ped.panic = 4;
    }

    let vx = 0;
    let vy = 0;

    if (ped.state === 'hostile') {
      const d = dist(ped.x, ped.y, p.x, p.y);
      const ang = Math.atan2(p.y - ped.y, p.x - ped.x);
      ped.angle = ang;
      if (d > 150) {
        vx = Math.cos(ang) * ped.speed * 1.5;
        vy = Math.sin(ang) * ped.speed * 1.5;
      } else if (d < 90) {
        vx = -Math.cos(ang) * ped.speed * 0.6;
        vy = -Math.sin(ang) * ped.speed * 0.6;
      }
      ped.shootTimer -= dt;
      if (ped.shootTimer <= 0 && d < 440 && !p.dead) {
        ped.shootTimer = rand(Math.random, 0.9, 1.7);
        if (!lineBlocked(game.city, ped.x, ped.y, p.x, p.y)) {
          spawnMuzzle(game.particles, ped.x + Math.cos(ang) * 12, ped.y + Math.sin(ang) * 12, ang);
          if (game.audio) game.audio.gun('pistol');
          game.lastShot = { x: ped.x, y: ped.y, t: game.time };
          const accuracy = clamp(0.85 - d / 700, 0.18, 0.8);
          if (Math.random() < accuracy) {
            damagePlayer(game, ped.boss ? 14 : 8, 'gun');
          } else {
            const missX = p.x + rand(Math.random, -70, 70);
            const missY = p.y + rand(Math.random, -70, 70);
            spawnTracer(game.particles, ped.x, ped.y, missX, missY);
          }
        }
      }
    } else if (ped.state === 'flee') {
      ped.panic -= dt;
      const ang = shot ? Math.atan2(ped.y - shot.y, ped.x - shot.x) : ped.angle;
      ped.angle = ang;
      vx = Math.cos(ang) * ped.speed * 2.2;
      vy = Math.sin(ang) * ped.speed * 2.2;
      if (ped.panic <= 0) {
        ped.state = 'walk';
        ped.target = null;
      }
    } else {
      ped.timer -= dt;
      if (!ped.target || ped.timer <= 0 || dist(ped.x, ped.y, ped.target.x, ped.target.y) < 14) {
        const pt = randomSidewalkPoint(Math.random, { x: ped.x, y: ped.y }, 40);
        ped.target = pt;
        ped.timer = rand(Math.random, 3, 9);
      }
      if (ped.target) {
        const ang = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
        ped.angle = ang;
        vx = Math.cos(ang) * ped.speed;
        vy = Math.sin(ang) * ped.speed;
      }
    }

    if (vx !== 0 || vy !== 0) {
      const res = resolveCircle(game.city, ped.x + vx * dt, ped.y + vy * dt, ped.r);
      ped.x = res.x;
      ped.y = res.y;
      ped.walkPhase += dt * 9;
    }
  }

  game.pedTimer = (game.pedTimer || 0) - dt;
  if (game.pedTimer <= 0) {
    let alive = 0;
    for (let i = 0; i < game.peds.length; i++) if (!game.peds[i].dead) alive++;
    if (alive < 26) {
      spawnPeds(game, 2);
      game.pedTimer = 5;
    }
  }
}

export function killPed(game, ped, byPlayer) {
  if (ped.dead) return;
  ped.dead = true;
  ped.state = 'dead';
  ped.deadTimer = 0;
  spawnBlood(game.particles, ped.x, ped.y, Math.random() * Math.PI * 2, 12);
  if (byPlayer) {
    game.player.kills++;
    addWanted(game, ped.boss ? CRIME.killCop : CRIME.killPed, 'murder');
  }
}

export function checkVehiclePedHits(game) {
  const p = game.player;
  if (!p.inVehicle || p.inVehicle.dead) return;
  const v = p.inVehicle;
  if (Math.abs(v.speed) < 95) return;
  for (let i = 0; i < game.peds.length; i++) {
    const ped = game.peds[i];
    if (ped.dead) continue;
    if (dist(v.x, v.y, ped.x, ped.y) < v.h + ped.r + 6) {
      killPed(game, ped, true);
      v.speed *= 0.72;
      spawnBlood(game.particles, ped.x, ped.y, v.angle, 14);
    }
  }
}

export function drawPed(ctx, ped, time) {
  if (ped.dead) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle);
    ctx.fillStyle = 'rgba(90,15,15,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    void time;
    return;
  }
  const bob = Math.sin(ped.walkPhase) * 1.6;
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(ped.angle);
  ctx.fillStyle = ped.hitFlash > 0 ? '#ffffff' : ped.color;
  ctx.beginPath();
  ctx.ellipse(0, bob * 0.15, 9.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(3, 0, 4.8, 0, Math.PI * 2);
  ctx.fill();
  if (ped.boss) {
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, -7, 8, 3);
  }
  if (ped.hostile) {
    ctx.fillStyle = '#c83030';
    ctx.fillRect(-2, -8, 6, 3);
  }
  ctx.restore();
}
