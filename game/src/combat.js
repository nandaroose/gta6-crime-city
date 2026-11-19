// combat.js — bullets, damage application, melee hits, and hit resolution
// across player, peds, cops, and vehicles.

import { TAU } from './utils.js';

export function fireBullet(world, x, y, angle, speed, damage, owner) {
  world.bullets.push({
    x, y,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    life: 0.7,
    damage,
    owner, // 'player' | 'cop'
  });
}

export function updateBullets(world, dt) {
  const bl = world.bullets;
  for (let i = bl.length - 1; i >= 0; i--) {
    const b = bl[i];
    b.life -= dt;
    if (b.life <= 0) { bl.splice(i, 1); continue; }

    // Sub-step to reduce tunneling
    const steps = 2;
    let done = false;
    for (let s = 0; s < steps && !done; s++) {
      b.x += b.dx * dt / steps;
      b.y += b.dy * dt / steps;

      // Walls
      if (world.city.solidAtWorld(b.x, b.y)) {
        world.particles.sparks(b.x, b.y);
        bl.splice(i, 1);
        break;
      }
      // Vehicles
      for (const car of world.vehicles) {
        if (car.dead) continue;
        if (Math.abs(b.x - car.x) < car.type.w / 2 && Math.abs(b.y - car.y) < car.type.h / 2 && nearAngle(car, b)) {
          car.hp -= b.damage;
          world.particles.sparks(b.x, b.y);
          if (car.hp <= 0) world.destroyCar(car);
          bl.splice(i, 1);
          done = true;
          break;
        }
      }
      if (done) break;
      // Peds
      for (const ped of world.peds.list) {
        if (ped.dead) continue;
        if (dist(b.x, b.y, ped.x, ped.y) < 10) {
          ped.hp -= b.damage;
          ped.state = 'flee';
          world.particles.blood(b.x, b.y, 6);
          if (b.owner === 'player') world.onPlayerAttack();
          if (ped.hp <= 0) world.onPedKilled(ped, b.owner === 'player' ? 'player' : 'cop');
          bl.splice(i, 1);
          done = true;
          break;
        }
      }
      if (done) break;
      // Cops
      for (const cop of world.cops) {
        if (cop.dead) continue;
        if (dist(b.x, b.y, cop.x, cop.y) < 10) {
          if (b.owner === 'player') {
            cop.hp -= b.damage;
            world.particles.blood(b.x, b.y, 6);
            if (cop.hp <= 0) world.onCopKilled(cop);
          }
          bl.splice(i, 1);
          done = true;
          break;
        }
      }
      if (done) break;
      // Player (cop bullets only)
      if (b.owner === 'cop' && !world.player.car && dist(b.x, b.y, world.player.x, world.player.y) < 10) {
        world.hurtPlayer(b.damage);
        world.particles.blood(b.x, b.y, 6);
        bl.splice(i, 1);
        done = true;
      }
    }
  }
}

function nearAngle(car, b) {
  // rough AABB in car-local frame
  const dx = b.x - car.x, dy = b.y - car.y;
  const cos = Math.cos(-car.angle), sin = Math.sin(-car.angle);
  const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
  return Math.abs(lx) < car.type.w / 2 && Math.abs(ly) < car.type.h / 2;
}

export function meleeHit(world, x, y, angle, range, damage) {
  const tx = x + Math.cos(angle) * range * 0.7;
  const ty = y + Math.sin(angle) * range * 0.7;
  for (const ped of world.peds.list) {
    if (ped.dead) continue;
    if (dist(tx, ty, ped.x, ped.y) < range) {
      ped.hp -= damage;
      ped.state = 'flee';
      world.particles.blood(ped.x, ped.y, 3);
      world.onPlayerAttack();
      if (ped.hp <= 0) world.onPedKilled(ped, 'player');
      return;
    }
  }
  for (const cop of world.cops) {
    if (cop.dead) continue;
    if (dist(tx, ty, cop.x, cop.y) < range) {
      cop.hp -= damage;
      world.particles.blood(cop.x, cop.y, 3);
      if (cop.hp <= 0) world.onCopKilled(cop);
      return;
    }
  }
  for (const car of world.vehicles) {
    if (car.dead || car.driver !== 'ai') continue;
    if (dist(tx, ty, car.x, car.y) < car.type.w * 0.6) {
      car.speed *= 0.4; // "tap" cars out of the way
      return;
    }
  }
}

export function drawBullets(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of world.bullets) {
    ctx.strokeStyle = 'rgba(255,220,140,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.dx * 0.01, b.y - b.dy * 0.01);
    ctx.stroke();
  }
  ctx.restore();
}

function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
export const COMBAT_TAU = TAU;
