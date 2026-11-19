// Police response: cruisers that chase and foot officers who shoot back.

import { CAR_TYPES, COLORS } from './config.js';
import { clamp, rand, chance, dist2, angleTo, angleDelta, lerpAngle } from './utils.js';
import { Vehicle } from './vehicles.js';

class Officer {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.angle = rand(0, Math.PI * 2);
    this.health = 85;
    this.dead = false;
    this.deadTimer = 0;
    this.cooldown = rand(0.4, 1.2);
    this.walkPhase = rand(0, 10);
    this.hitFlash = 0;
    this.state = 'pursue';
  }

  update(dt, game) {
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    if (this.dead) {
      this.deadTimer += dt;
      return;
    }
    const p = game.player;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    this.angle = lerpAngle(this.angle, angleTo(this.x, this.y, p.x, p.y), 1 - Math.exp(-10 * dt));
    this.cooldown -= dt;
    let move = 0;
    if (d > 230) move = 1;
    else if (d < 120) move = -0.7;
    if (move !== 0) {
      const speed = 120 * move;
      const res = game.city.moveCircle(this.x, this.y, this.radius, Math.cos(this.angle) * speed * dt, Math.sin(this.angle) * speed * dt);
      this.x = res.x;
      this.y = res.y;
      this.walkPhase += dt * 12;
    }
    if (d < 660 && this.cooldown <= 0 && !p.dead) {
      this.cooldown = rand(0.85, 1.65);
      game.combat.policeShoot(this, game);
    }
  }

  damage(amount, game) {
    if (this.dead) return;
    this.health -= amount;
    this.hitFlash = 1;
    if (this.health <= 0) {
      this.dead = true;
      this.deadTimer = 0;
      game.particles.blood(this.x, this.y, 14);
      game.events.emit('copKilled', this);
      game.wanted.add(1);
      if (chance(0.5)) game.combat.spawnPickup(this.x, this.y, 'ammo', { amount: 16 });
      if (chance(0.4)) game.combat.spawnPickup(this.x, this.y, 'armour');
    }
  }

  draw(ctx, time) {
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = 'rgba(80,10,10,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 9, this.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(this.angle);
      ctx.fillStyle = COLORS.policeDark;
      ctx.fillRect(-11, -4, 20, 8);
      ctx.fillStyle = '#e8bd96';
      ctx.beginPath();
      ctx.arc(11, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const bob = Math.sin(this.walkPhase) * 1.4;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(10,14,20,0.26)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(this.angle);
    ctx.fillStyle = COLORS.policeDark;
    ctx.fillRect(-7, -5 + bob * 0.2, 10, 10);
    ctx.fillStyle = COLORS.police;
    ctx.fillRect(-4, -6, 11, 12);
    ctx.fillStyle = '#e8bd96';
    ctx.beginPath();
    ctx.arc(3, 0, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d2f4a';
    ctx.beginPath();
    ctx.arc(1.5, 0, 6, Math.PI * 0.9, Math.PI * 1.9);
    ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(8, -2, 12, 4);
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(15, -1.5, 5, 3);
    ctx.restore();
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(230,70,60,${this.hitFlash * 0.3})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class Police {
  constructor(game) {
    this.officers = [];
    this.cruisers = [];
    this.spawnTimer = 0;
    this.game = game;
  }

  update(dt, game) {
    const level = game.wanted.level;
    const wantCruisers = level > 0 ? Math.min(level, 4) : 0;
    const wantOfficers = level >= 2 ? Math.min(level - 1, 4) : 0;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.5;
      if (this.cruisers.length < wantCruisers) this.spawnCruiser(game);
      if (this.officers.filter((o) => !o.dead).length < wantOfficers) this.spawnOfficer(game);
    }

    for (let i = this.cruisers.length - 1; i >= 0; i--) {
      const car = this.cruisers[i];
      if (car.dead || car.control === 'player' || !car.ai) {
        if (car.dead) game.vehicles.remove(car);
        this.cruisers.splice(i, 1);
        continue;
      }
      if (dist2(car.x, car.y, game.player.x, game.player.y) > 2200 * 2200) {
        game.vehicles.remove(car);
        this.cruisers.splice(i, 1);
        continue;
      }
      this.chase(car, dt, game);
    }

    for (let i = this.officers.length - 1; i >= 0; i--) {
      const o = this.officers[i];
      if (o.dead && o.deadTimer > 14) {
        this.officers.splice(i, 1);
        continue;
      }
      if (dist2(o.x, o.y, game.player.x, game.player.y) > 2200 * 2200) {
        this.officers.splice(i, 1);
        continue;
      }
      o.update(dt, game);
    }

    if (level === 0) {
      for (const car of this.cruisers) {
        car.siren = false;
        game.vehicles.remove(car);
      }
      this.cruisers.length = 0;
      this.officers.length = 0;
    }
  }

  spawnCruiser(game) {
    const p = game.city.randomLaneNear(game.player.x, game.player.y, 700, 1100);
    if (!p.lane) return;
    if (dist2(p.x, p.y, game.player.x, game.player.y) < 520 * 520) return;
    const lane = p.lane;
    const car = new Vehicle({
      x: p.x,
      y: p.y,
      angle: lane.axis === 'h' ? (lane.dir === 1 ? 0 : Math.PI) : lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2,
      type: CAR_TYPES[6],
      isPolice: true,
      driver: true,
      color: '#e9edf2',
    });
    car.ai = { police: true };
    car.siren = true;
    car.health = 140;
    car.maxHealth = 140;
    this.cruisers.push(car);
    game.vehicles.add(car);
  }

  spawnOfficer(game) {
    const spot = game.city.randomSidewalkNear(game.player.x, game.player.y, 260, 520);
    const o = new Officer(spot.x, spot.y);
    this.officers.push(o);
  }

  chase(car, dt, game) {
    const p = game.player;
    const target = p.vehicle || p;
    const desired = angleTo(car.x, car.y, target.x, target.y);
    const diff = angleDelta(car.angle, desired);
    const d = Math.hypot(target.x - car.x, target.y - car.y);
    const steer = clamp(diff * 2.2, -1, 1);
    let throttle = d > 260 ? 0.9 : 0.35;
    if (Math.abs(diff) > 1.5) throttle = 0.15;
    if (Math.abs(car.speed) > 420) throttle = Math.min(throttle, 0);
    const brake = d < 110 && Math.abs(diff) > 1.1;
    car.update(dt, game, { throttle, steer, handbrake: d < 150 && Math.abs(diff) > 0.9, brake });
    if (d < 120 && !p.vehicle && Math.random() < dt * 0.8 && p.health > 0) {
      const close = this.officers.filter((o) => !o.dead).length;
      if (close < 4) this.spawnOfficer(game);
    }
  }

  clear() {
    this.officers.length = 0;
    this.cruisers.length = 0;
  }

  draw(ctx, time) {
    for (const o of this.officers) o.draw(ctx, time);
  }
}
