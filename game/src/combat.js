import { WEAPONS, CRIME } from './config.js';
import { dist, angleDiff } from './utils.js';
import { pointInSolid } from './city.js';
import { spawnMuzzle, spawnSparks, spawnBlood, spawnExplosion } from './particles.js';
import { damagePlayer, currentWeapon } from './player.js';
import { addWanted } from './wanted.js';
import { damageOfficer } from './police.js';
import { killPed } from './peds.js';

export function createCombatState() {
  return { bullets: [] };
}

function witnesses(game) {
  if (game.police && game.police.officers.length > 0) return true;
  const p = game.player;
  for (let i = 0; i < game.peds.length; i++) {
    const ped = game.peds[i];
    if (!ped.dead && dist(p.x, p.y, ped.x, ped.y) < 520) return true;
  }
  return false;
}

export function playerAttack(game) {
  const p = game.player;
  if (p.dead || game.state !== 'playing') return;
  const spec = currentWeapon(p);

  if (spec.melee) {
    meleeAttack(game);
    return;
  }
  if (p.fireTimer > 0) return;
  const ammo = p.ammo[p.weapon] || 0;
  if (ammo <= 0) {
    p.fireTimer = 0.4;
    if (game.audio) game.audio.dry();
    return;
  }
  p.ammo[p.weapon] = ammo - 1;
  p.fireTimer = spec.rate;

  const muzzleX = p.x + Math.cos(p.angle) * 18;
  const muzzleY = p.y + Math.sin(p.angle) * 18;
  spawnMuzzle(game.particles, muzzleX, muzzleY, p.angle);
  if (game.audio) game.audio.gun(spec.sound);
  game.lastShot = { x: p.x, y: p.y, t: game.time };
  if (game.settings.shake) game.camera.shake = Math.min(8, (game.camera.shake || 0) + 1.6);

  const pellets = spec.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const spread = (Math.random() - 0.5) * 2 * spec.spread;
    const a = p.angle + spread;
    game.bullets.push({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(a) * spec.speed,
      vy: Math.sin(a) * spec.speed,
      damage: spec.damage,
      range: spec.range,
      traveled: 0,
      life: 1.2,
      owner: 'player'
    });
  }

  if (witnesses(game)) addWanted(game, CRIME.shoot, 'discharging a firearm');
  if (spec.sound === 'shotgun') p.angle += (Math.random() - 0.5) * 0.05;
}

export function meleeAttack(game) {
  const p = game.player;
  if (p.meleeTimer > 0) return;
  p.meleeTimer = WEAPONS.fists.rate;
  if (game.audio) game.audio.punch();
  const range = WEAPONS.fists.range;
  let hit = false;

  for (let i = 0; i < game.peds.length; i++) {
    const ped = game.peds[i];
    if (ped.dead) continue;
    const d = dist(p.x, p.y, ped.x, ped.y);
    if (d > range + ped.r) continue;
    if (Math.abs(angleDiff(p.angle, Math.atan2(ped.y - p.y, ped.x - p.x))) > 1.1) continue;
    hit = true;
    ped.health -= WEAPONS.fists.damage;
    ped.hitFlash = 0.2;
    ped.x += Math.cos(p.angle) * 12;
    ped.y += Math.sin(p.angle) * 12;
    spawnBlood(game.particles, ped.x, ped.y, p.angle, 4);
    if (ped.state !== 'hostile') {
      ped.state = 'flee';
      ped.panic = 3;
    }
    if (ped.health <= 0) killPed(game, ped, true);
    addWanted(game, CRIME.shoot * 0.5, 'assault');
    break;
  }

  if (!hit) {
    for (let i = 0; i < game.police.officers.length; i++) {
      const off = game.police.officers[i];
      const d = dist(p.x, p.y, off.x, off.y);
      if (d > range + off.r) continue;
      if (Math.abs(angleDiff(p.angle, Math.atan2(off.y - p.y, off.x - p.x))) > 1.1) continue;
      hit = true;
      damageOfficer(game, off, WEAPONS.fists.damage);
      addWanted(game, CRIME.hitCop, 'assaulting an officer');
      break;
    }
  }

  if (!hit) {
    const tx = p.x + Math.cos(p.angle) * 30;
    const ty = p.y + Math.sin(p.angle) * 30;
    spawnSparks(game.particles, tx, ty, p.angle, 2);
  }
}

function explodeVehicle(game, v) {
  if (v.dead) return;
  v.dead = true;
  spawnExplosion(game.particles, v.x, v.y);
  if (game.audio) game.audio.explosion();
  if (game.settings.shake) game.camera.shake = Math.min(18, (game.camera.shake || 0) + 12);
  const p = game.player;
  if (dist(p.x, p.y, v.x, v.y) < 110 && !p.dead) {
    damagePlayer(game, 35, 'explosion');
  }
  for (let i = 0; i < game.peds.length; i++) {
    const ped = game.peds[i];
    if (ped.dead) continue;
    if (dist(ped.x, ped.y, v.x, v.y) < 100) {
      ped.health -= 90;
      spawnBlood(game.particles, ped.x, ped.y, Math.random() * 6.28, 8);
      if (ped.health <= 0) killPed(game, ped, false);
    }
  }
  for (let i = game.police.officers.length - 1; i >= 0; i--) {
    const off = game.police.officers[i];
    if (dist(off.x, off.y, v.x, v.y) < 100) damageOfficer(game, off, 100);
  }
}

function damageVehicle(game, v, dmg) {
  if (v.dead) return;
  v.health -= dmg;
  spawnSparks(game.particles, v.x, v.y, Math.random() * 6.28, 3);
  if (v.health <= 0) explodeVehicle(game, v);
}

function hitVehicles(game, b) {
  const check = (v) => {
    if (v.dead) return false;
    if (dist(b.x, b.y, v.x, v.y) < v.h * 0.62 + 3) {
      damageVehicle(game, v, b.damage);
      return true;
    }
    return false;
  };
  for (let i = 0; i < game.vehicles.length; i++) if (check(game.vehicles[i])) return true;
  for (let i = 0; i < game.traffic.length; i++) if (check(game.traffic[i])) return true;
  for (let i = 0; i < game.police.cars.length; i++) if (check(game.police.cars[i])) return true;
  return false;
}

export function updateBullets(game, dt) {
  const p = game.player;
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    const stepX = b.vx * dt;
    const stepY = b.vy * dt;
    b.x += stepX;
    b.y += stepY;
    b.traveled += Math.hypot(stepX, stepY);
    b.life -= dt;

    if (b.life <= 0 || b.traveled > b.range) {
      game.bullets.splice(i, 1);
      continue;
    }
    if (pointInSolid(game.city, b.x, b.y)) {
      spawnSparks(game.particles, b.x, b.y, Math.atan2(-b.vy, -b.vx), 4);
      game.bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    if (b.owner === 'player') {
      for (let j = 0; j < game.police.officers.length; j++) {
        const off = game.police.officers[j];
        if (dist(b.x, b.y, off.x, off.y) < off.r + 4) {
          damageOfficer(game, off, b.damage);
          spawnBlood(game.particles, b.x, b.y, Math.atan2(b.vy, b.vx), 3);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (let j = 0; j < game.peds.length; j++) {
          const ped = game.peds[j];
          if (ped.dead) continue;
          if (dist(b.x, b.y, ped.x, ped.y) < ped.r + 4) {
            ped.health -= b.damage;
            ped.hitFlash = 0.18;
            spawnBlood(game.particles, b.x, b.y, Math.atan2(b.vy, b.vx), 4);
            if (ped.state !== 'hostile') {
              ped.state = 'flee';
              ped.panic = 4;
            }
            if (ped.health <= 0) killPed(game, ped, true);
            hit = true;
            break;
          }
        }
      }
      if (!hit) hit = hitVehicles(game, b);
    } else if (!p.dead) {
      if (p.inVehicle) {
        const v = p.inVehicle;
        if (dist(b.x, b.y, v.x, v.y) < v.h * 0.7) {
          damageVehicle(game, v, b.damage * 0.6);
          hit = true;
        }
      } else if (dist(b.x, b.y, p.x, p.y) < p.r + 4) {
        damagePlayer(game, b.damage, 'bullet');
        spawnBlood(game.particles, b.x, b.y, Math.atan2(b.vy, b.vx), 3);
        hit = true;
      }
    }

    if (hit) game.bullets.splice(i, 1);
  }
}

export function drawBullets(ctx, bullets) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffe08a';
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018);
    ctx.stroke();
  }
}

export function notify(game, text, color = '#f2e6c8') {
  const list = game.messages;
  if (list.length && list[list.length - 1].text === text) return;
  list.push({ text, color, life: 3.2, max: 3.2 });
  if (list.length > 4) list.shift();
}

export function updateMessages(game, dt) {
  for (let i = game.messages.length - 1; i >= 0; i--) {
    game.messages[i].life -= dt;
    if (game.messages[i].life <= 0) game.messages.splice(i, 1);
  }
}

