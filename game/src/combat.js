// Bullets, melee, damage and the pickups scattered around the city.

import { WEAPONS } from './config.js';
import { dist2, segmentCircle, angleDelta, rand, randInt, pick, roundRectPath, formatMoney } from './utils.js';

export class Combat {
  constructor() {
    this.bullets = [];
    this.pickups = [];
    this.pickupTimer = 9;
  }

  playerShoot(player, game) {
    const w = WEAPONS[player.weapon];
    if (!w || w.melee) return;
    const angle = player.aimAngle ?? player.angle;
    const ox = player.x + Math.cos(angle) * 18;
    const oy = player.y + Math.sin(angle) * 18;
    for (let i = 0; i < (w.pellets || 1); i++) {
      const a = angle + rand(-w.spread, w.spread);
      this.bullets.push({
        x: ox,
        y: oy,
        px: ox,
        py: oy,
        vx: Math.cos(a) * w.speed,
        vy: Math.sin(a) * w.speed,
        life: w.range / w.speed,
        damage: w.damage,
        owner: 'player',
        color: w.color,
      });
    }
    game.particles.muzzle(ox, oy, angle);
    game.audio.gunshot(w.sound);
    game.camera.addShake(w.sound === 'shotgun' ? 0.55 : w.sound === 'smg' ? 0.12 : 0.24);
    game.camera.addFlash(w.sound === 'shotgun' ? 0.12 : 0.04, '255,220,150');
    game.events.emit('gunshot', { x: ox, y: oy });
  }

  policeShoot(officer, game) {
    const target = game.player;
    const angle = Math.atan2(target.y - officer.y, target.x - officer.x) + rand(-0.09, 0.09);
    const ox = officer.x + Math.cos(angle) * 16;
    const oy = officer.y + Math.sin(angle) * 16;
    this.bullets.push({
      x: ox,
      y: oy,
      px: ox,
      py: oy,
      vx: Math.cos(angle) * 900,
      vy: Math.sin(angle) * 900,
      life: 0.75,
      damage: 9,
      owner: 'police',
      color: '#bfe2ff',
    });
    game.particles.muzzle(ox, oy, angle);
    game.audio.gunshot('pistol', 0.55);
    game.events.emit('gunshot', { x: ox, y: oy });
  }

  melee(player, game) {
    const angle = player.aimAngle ?? player.angle;
    let hit = false;
    for (const ped of game.peds.list) {
      if (ped.dead) continue;
      if (dist2(player.x, player.y, ped.x, ped.y) > 52 * 52) continue;
      if (Math.abs(angleDelta(angle, Math.atan2(ped.y - player.y, ped.x - player.x))) > 1.1) continue;
      ped.damage(WEAPONS.fists.damage, game, 'player');
      game.particles.blood(ped.x, ped.y, 6);
      game.camera.addShake(0.18);
      game.audio.punch();
      hit = true;
      break;
    }
    if (!hit) game.audio.whoosh();
  }

  update(dt, game) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.px = b.x;
      b.py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }
      let hit = false;
      if (game.city.isWaterAt(b.x, b.y)) {
        game.particles.splash(b.x, b.y);
        this.bullets.splice(i, 1);
        continue;
      }
      const wall = game.city.collideCircle(b.x, b.y, 2);
      if (wall) {
        game.particles.sparks(wall.x, wall.y, 3);
        this.bullets.splice(i, 1);
        continue;
      }
      if (b.owner === 'player') {
        for (const ped of game.peds.list) {
          if (ped.dead) continue;
          if (segmentCircle(b.px, b.py, b.x, b.y, ped.x, ped.y, ped.radius + 2)) {
            ped.damage(b.damage, game, 'player');
            game.particles.blood(b.x, b.y, 4);
            hit = true;
            break;
          }
        }
        if (hit) {
          this.bullets.splice(i, 1);
          continue;
        }
        for (const cop of game.police.officers) {
          if (cop.dead) continue;
          if (segmentCircle(b.px, b.py, b.x, b.y, cop.x, cop.y, cop.radius + 2)) {
            cop.damage(b.damage, game);
            game.particles.blood(b.x, b.y, 4);
            hit = true;
            break;
          }
        }
        if (hit) {
          this.bullets.splice(i, 1);
          continue;
        }
      }
      for (const v of game.vehicles.list) {
        if (v.dead || v === game.player.vehicle) continue;
        if (segmentCircle(b.px, b.py, b.x, b.y, v.x, v.y, v.radius + 2)) {
          v.damage(b.damage * 0.8, game);
          game.particles.sparks(b.x, b.y, 4);
          game.audio.metalHit();
          hit = true;
          break;
        }
      }
      if (hit) {
        this.bullets.splice(i, 1);
        continue;
      }
      if (b.owner === 'police') {
        const p = game.player;
        if (p.vehicle) {
          if (segmentCircle(b.px, b.py, b.x, b.y, p.vehicle.x, p.vehicle.y, p.vehicle.radius + 2)) {
            p.vehicle.damage(b.damage * 0.7, game);
            game.particles.sparks(b.x, b.y, 4);
            this.bullets.splice(i, 1);
            continue;
          }
        } else if (!p.dead && segmentCircle(b.px, b.py, b.x, b.y, p.x, p.y, p.radius + 2)) {
          p.damage(b.damage, game);
          game.particles.blood(b.x, b.y, 4);
          this.bullets.splice(i, 1);
          continue;
        }
      }
    }

    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = rand(16, 26);
      if (this.pickups.length < 10) this.spawnRandom(game);
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.bob += dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }
      if (!game.player.dead && dist2(p.x, p.y, game.player.x, game.player.y) < 30 * 30) {
        this.collect(p, game);
        this.pickups.splice(i, 1);
      }
    }
  }

  spawnRandom(game) {
    const spot = game.city.randomSidewalkNear(game.player.x, game.player.y, 260, 850);
    const roll = Math.random();
    if (roll < 0.3) this.spawnPickup(spot.x, spot.y, 'money', { amount: randInt(40, 220) });
    else if (roll < 0.5) this.spawnPickup(spot.x, spot.y, 'health');
    else if (roll < 0.68) this.spawnPickup(spot.x, spot.y, 'armour');
    else if (roll < 0.9) this.spawnPickup(spot.x, spot.y, 'ammo', { amount: 24 });
    else this.spawnPickup(spot.x, spot.y, 'weapon', { weapon: pick(['smg', 'shotgun']), amount: 20 });
  }

  spawnPickup(x, y, type, opts = {}) {
    const p = {
      x,
      y,
      type,
      amount: opts.amount ?? 0,
      weapon: opts.weapon ?? null,
      bob: rand(0, 6),
      life: 120,
    };
    this.pickups.push(p);
    return p;
  }

  collect(p, game) {
    const player = game.player;
    game.audio.pickup();
    if (p.type === 'health') {
      player.health = Math.min(100, player.health + 40);
      game.hud.notify('Health +40', 'health');
    } else if (p.type === 'armour') {
      player.armour = Math.min(100, player.armour + 55);
      game.hud.notify('Armour +55', 'health');
    } else if (p.type === 'ammo') {
      player.addAmmo('ammo', p.amount);
      game.hud.notify('Ammo +' + p.amount, 'ammo');
    } else if (p.type === 'money') {
      player.addMoney(p.amount);
      game.hud.notify(formatMoney(p.amount) + ' picked up', 'money');
    } else if (p.type === 'weapon') {
      player.addAmmo(p.weapon, p.amount);
      player.switchWeapon(p.weapon === 'smg' ? 2 : 3);
      game.hud.notify(WEAPONS[p.weapon].name + ' acquired', 'weapon');
    }
  }

  drawBullets(ctx) {
    for (const b of this.bullets) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawPickups(ctx, time) {
    for (const p of this.pickups) {
      const bob = Math.sin(p.bob * 3) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.fillStyle = 'rgba(10,14,20,0.2)';
      ctx.beginPath();
      ctx.ellipse(2, 8 - bob, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(Math.sin(time * 2 + p.bob) * 0.08);
      const colors = { health: '#e8564a', armour: '#4f8fd8', ammo: '#c9a24a', money: '#7fc46a', weapon: '#c9c9c9' };
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors[p.type];
      if (p.type === 'health') {
        ctx.fillRect(-4, -9, 8, 18);
        ctx.fillRect(-9, -4, 18, 8);
      } else if (p.type === 'armour') {
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(9, -5);
        ctx.lineTo(7, 7);
        ctx.lineTo(0, 11);
        ctx.lineTo(-7, 7);
        ctx.lineTo(-9, -5);
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'money') {
        ctx.fillStyle = '#d9c27a';
        roundRectPath(ctx, -9, -7, 18, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#4f7a45';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
      } else if (p.type === 'weapon') {
        ctx.fillRect(-10, -3, 18, 5);
        ctx.fillRect(-3, -6, 5, 6);
      } else {
        roundRectPath(ctx, -8, -6, 16, 12, 2);
        ctx.fill();
        ctx.fillStyle = '#6a5a2f';
        ctx.fillRect(-5, -2, 10, 2);
      }
      ctx.restore();
    }
  }
}
