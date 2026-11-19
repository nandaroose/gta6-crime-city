// Wandering pedestrians who flee gunfire, panic at horns and drop the odd dollar.

import { CONFIG, COLORS, PED_FIRST, PED_LAST } from './config.js';
import { rand, randInt, pick, chance, dist2, angleTo, normAngle, lerpAngle } from './utils.js';

export class Ped {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.radius = 9;
    this.angle = rand(0, Math.PI * 2);
    this.targetAngle = this.angle;
    this.speed = rand(34, 58);
    this.state = opts.state || 'wander';
    this.timer = rand(1, 4);
    this.threatX = x;
    this.threatY = y;
    this.health = opts.health || 100;
    this.maxHealth = this.health;
    this.dead = false;
    this.deadTimer = 0;
    this.walkPhase = rand(0, 10);
    this.target = !!opts.target;
    this.guard = !!opts.guard;
    this.skin = pick(COLORS.skin);
    this.shirt = this.target ? '#b23a3a' : pick(COLORS.shirt);
    this.pants = pick(COLORS.pants);
    this.name = pick(PED_FIRST) + ' ' + pick(PED_LAST);
    this.panicTimer = 0;
    this.hitFlash = 0;
  }

  update(dt, game) {
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    if (this.dead) {
      this.deadTimer += dt;
      return;
    }
    this.timer -= dt;
    if (this.state === 'flee' || this.state === 'panic') {
      const away = angleTo(this.threatX, this.threatY, this.x, this.y);
      this.targetAngle = away + Math.sin(game.time * 5 + this.walkPhase) * 0.3;
      this.speed = this.state === 'panic' ? 155 : 125;
      if (this.timer <= 0) {
        this.state = 'wander';
        this.timer = rand(2, 5);
        this.speed = rand(34, 58);
      }
    } else {
      if (this.timer <= 0) {
        this.timer = rand(2, 6);
        this.targetAngle = this.angle + rand(-1.8, 1.8);
      }
      this.speed = this.guard ? 42 : rand(30, 56);
    }
    this.angle = lerpAngle(this.angle, this.targetAngle, 1 - Math.exp(-7 * dt));
    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;
    const move = game.city.moveCircle(this.x, this.y, this.radius, dx, dy);
    this.x = move.x;
    this.y = move.y;
    if (move.hit) {
      this.targetAngle = normAngle(this.angle + Math.PI + rand(-0.9, 0.9));
      this.timer = rand(0.3, 1.1);
    }
    if (this.x < 40 || this.y < 40 || this.x > game.city.size - 40 || this.y > 38 * 64) {
      this.targetAngle = angleTo(this.x, this.y, game.city.size / 2, game.city.size / 2);
    }
    this.walkPhase += dt * (this.speed > 100 ? 15 : 7);
  }

  damage(amount, game, source) {
    if (this.dead) return;
    this.health -= amount;
    this.hitFlash = 1;
    game.particles.blood(this.x, this.y, 5);
    if (this.health <= 0) {
      this.dead = true;
      this.deadTimer = 0;
      game.particles.blood(this.x, this.y, 18);
      game.events.emit('pedKilled', this);
      const byPlayer = source === 'player' || source === game.player || (source && source.control === 'player');
      if (byPlayer) game.wanted.add(1);
      if (chance(0.4)) game.combat.spawnPickup(this.x + rand(-8, 8), this.y + rand(-8, 8), 'money', { amount: randInt(20, 120) });
      else if (chance(0.18)) game.combat.spawnPickup(this.x, this.y, 'ammo', { amount: 12 });
    }
  }

  draw(ctx, time) {
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = 'rgba(80,10,10,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 9, this.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(this.angle);
      ctx.fillStyle = this.pants;
      ctx.fillRect(-10, -4, 18, 8);
      ctx.fillStyle = this.shirt;
      ctx.fillRect(-2, -5, 11, 10);
      ctx.fillStyle = this.skin;
      ctx.beginPath();
      ctx.arc(10, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const bob = Math.sin(this.walkPhase) * 1.3;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(10,14,20,0.24)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(this.angle);
    ctx.fillStyle = this.pants;
    ctx.fillRect(-7, -5 + bob * 0.2, 9, 10);
    ctx.fillStyle = this.shirt;
    ctx.fillRect(-4, -6, 10, 12);
    ctx.fillStyle = this.skin;
    ctx.beginPath();
    ctx.arc(3, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,30,25,0.8)';
    ctx.beginPath();
    ctx.arc(1, 0, 5.4, Math.PI * 0.55, Math.PI * 1.45);
    ctx.fill();
    if (this.state !== 'wander') {
      ctx.strokeStyle = this.skin;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, -11);
      ctx.moveTo(0, 5);
      ctx.lineTo(5, 11);
      ctx.stroke();
    }
    ctx.restore();
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(230,70,60,${this.hitFlash * 0.3})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.target && !this.dead) {
      ctx.strokeStyle = 'rgba(220,70,60,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 17 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export class PedManager {
  constructor(game) {
    this.list = [];
    this.timer = 0.6;
  }

  spawnAt(x, y, opts = {}) {
    if (this.list.length >= CONFIG.peds.max * 2) return null;
    const p = new Ped(x, y, opts);
    this.list.push(p);
    return p;
  }

  spawnNear(game, count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.list.filter((p) => !p.dead).length >= CONFIG.peds.max) return;
      const spot = game.city.randomSidewalkNear(game.player.x, game.player.y, 260, 900);
      this.spawnAt(spot.x, spot.y, {});
    }
  }

  update(dt, game) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = CONFIG.peds.spawnEvery;
      this.spawnNear(game, 1);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.dead && p.deadTimer > 18) {
        this.list.splice(i, 1);
        continue;
      }
      if (dist2(p.x, p.y, game.player.x, game.player.y) > CONFIG.peds.despawn * CONFIG.peds.despawn) {
        this.list.splice(i, 1);
        continue;
      }
      p.update(dt, game);
      if (p.dead) continue;
      for (const v of game.vehicles.list) {
        if (v.dead || Math.abs(v.speed) < 120) continue;
        if (dist2(p.x, p.y, v.x, v.y) < 30 * 30) {
          p.damage(120, game, v);
          game.particles.blood(p.x, p.y, 12);
          break;
        }
      }
    }
  }

  panic(x, y, radius, game) {
    const r2 = radius * radius;
    for (const p of this.list) {
      if (p.dead) continue;
      if (dist2(p.x, p.y, x, y) < r2) {
        p.state = chance(0.5) ? 'panic' : 'flee';
        p.threatX = x;
        p.threatY = y;
        p.timer = rand(2.5, 6);
        p.speed = 145;
      }
    }
  }

  draw(ctx, time) {
    for (const p of this.list) p.draw(ctx, time);
  }
}
