// Drivable cars: arcade physics, drift, damage, parked spawns and carjacking.

import { CAR_TYPES, CONFIG, COLORS } from './config.js';
import { clamp, pick, rand, sign, shade, dist2, roundRectPath } from './utils.js';

export class Vehicle {
  constructor(opts) {
    const type = opts.type || pick(CAR_TYPES);
    this.type = type;
    this.name = type.name;
    this.w = type.w;
    this.h = type.h;
    this.x = opts.x;
    this.y = opts.y;
    this.angle = opts.angle ?? 0;
    this.color = opts.color || type.color;
    this.isPolice = !!opts.isPolice;
    this.isTaxi = !!opts.isTaxi;
    this.radius = 19;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.health = CONFIG.car.health;
    this.maxHealth = CONFIG.car.health;
    this.dead = false;
    this.deadTimer = 0;
    this.ai = null;
    this.driver = !!opts.driver;
    this.control = null;
    this.siren = false;
    this.sirenPhase = 0;
    this.honkTimer = 0;
    this.damageSmoke = 0;
  }

  update(dt, game, controls = {}) {
    if (this.dead) {
      this.deadTimer += dt;
      this.speed = 0;
      return;
    }
    const throttle = controls.throttle || 0;
    const steer = controls.steer || 0;
    const handbrake = !!controls.handbrake;
    const brake = !!controls.brake;
    const fwdX = Math.cos(this.angle);
    const fwdY = Math.sin(this.angle);
    const sideX = -fwdY;
    const sideY = fwdX;
    let vf = this.vx * fwdX + this.vy * fwdY;
    let vs = this.vx * sideX + this.vy * sideY;

    if (throttle > 0) vf += this.type.accel * throttle * dt;
    else if (throttle < 0) {
      if (vf > 12) vf -= CONFIG.car.brake * dt;
      else vf -= this.type.accel * 0.5 * dt;
    }
    if (brake) vf -= sign(vf) * CONFIG.car.brake * 0.85 * dt;
    if (handbrake) vf *= Math.exp(-1.4 * dt);
    vf *= Math.exp(-CONFIG.car.drag * 0.45 * dt);
    vs *= Math.exp(-(handbrake ? CONFIG.car.driftGrip : this.type.grip) * dt);
    vf = clamp(vf, -CONFIG.car.maxReverse, this.type.speed);

    const speedFactor = clamp(Math.abs(vf) / 150, 0, 1);
    if (Math.abs(vf) > 4) {
      this.angle += steer * CONFIG.car.steer * speedFactor * dt * Math.sign(vf);
    }
    const nfX = Math.cos(this.angle);
    const nfY = Math.sin(this.angle);
    this.vx = nfX * vf - nfY * vs;
    this.vy = nfY * vf + nfX * vs;
    this.speed = vf;

    const move = game.city.moveCircle(this.x, this.y, this.radius, this.vx * dt, this.vy * dt);
    if (move.hit) {
      const dot = this.vx * move.nx + this.vy * move.ny;
      this.vx -= 1.35 * dot * move.nx;
      this.vy -= 1.35 * dot * move.ny;
      this.vx *= 0.52;
      this.vy *= 0.52;
      const impact = Math.abs(dot);
      if (impact > 190) this.damage((impact - 190) * 0.09, game);
      if (impact > 120) game.particles.sparks(this.x + move.nx * 12, this.y + move.ny * 12, 6);
    }
    this.x = move.x;
    this.y = move.y;

    this.sirenPhase += dt * (this.siren ? 7 : 0);
    if (this.health < 35 && Math.random() < dt * 8) {
      game.particles.smoke(this.x + rand(-10, 10), this.y + rand(-10, 10));
    }
    this.damageSmoke += dt;
  }

  damage(amount, game) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) this.explode(game);
  }

  explode(game) {
    if (this.dead) return;
    this.dead = true;
    this.deadTimer = 0;
    this.health = 0;
    this.vx = 0;
    this.vy = 0;
    game.particles.explosion(this.x, this.y);
    game.audio.explosion();
    game.camera.addShake(1.2);
    game.camera.addFlash(0.45, '255,180,90');
    const player = game.player;
    if (player.vehicle === this) {
      player.damage(160, game);
      player.vehicle = null;
    }
    for (const ped of game.peds.list) {
      if (!ped.dead && dist2(ped.x, ped.y, this.x, this.y) < 110 * 110) ped.damage(120, game, this);
    }
  }

  draw(ctx, time) {
    const w = this.w;
    const h = this.h;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(10,14,20,0.25)';
    ctx.beginPath();
    ctx.ellipse(6, 8, w * 0.56, h * 0.52, this.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(this.angle);
    if (this.dead) {
      ctx.fillStyle = '#2c2c2c';
      roundRectPath(ctx, -w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = shade(this.color, -0.35);
    roundRectPath(ctx, -w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 7);
    ctx.fill();
    ctx.fillStyle = this.color;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 6);
    ctx.fill();
    if (this.isPolice) {
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(-w * 0.12, -h / 2, w * 0.3, h);
      ctx.fillStyle = COLORS.police;
      ctx.fillRect(-w / 2, -h / 2, w * 0.26, h);
      ctx.fillRect(w * 0.36, -h / 2, w * 0.14, h);
    }
    if (this.isTaxi) {
      ctx.fillStyle = '#f4c84a';
      ctx.fillRect(-4, -h / 2 - 1, 12, h + 2);
    }
    ctx.fillStyle = 'rgba(24,32,44,0.85)';
    roundRectPath(ctx, -w * 0.2, -h * 0.34, w * 0.34, h * 0.68, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(170,210,225,0.55)';
    roundRectPath(ctx, -w * 0.16, -h * 0.3, w * 0.22, h * 0.6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 3);
    ctx.fillStyle = '#f6e7a8';
    ctx.fillRect(w / 2 - 4, -h * 0.3, 3, 6);
    ctx.fillRect(w / 2 - 4, h * 0.3 - 6, 3, 6);
    ctx.fillStyle = '#c94a3f';
    ctx.fillRect(-w / 2 + 1, -h * 0.3, 3, 6);
    ctx.fillRect(-w / 2 + 1, h * 0.3 - 6, 3, 6);
    if (this.isPolice) {
      const on = Math.sin(this.sirenPhase) > 0;
      ctx.fillStyle = on ? '#ff4d4d' : '#4d6dff';
      ctx.fillRect(-w * 0.04, -h / 2 - 5, w * 0.12, 5);
      ctx.fillStyle = on ? '#4d6dff' : '#ff4d4d';
      ctx.fillRect(w * 0.1, -h / 2 - 5, w * 0.12, 5);
    }
    if (this.control === 'player') {
      ctx.strokeStyle = 'rgba(244,200,74,0.8)';
      ctx.lineWidth = 2;
      roundRectPath(ctx, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class VehicleManager {
  constructor(city) {
    this.city = city;
    this.list = [];
  }

  add(v) {
    this.list.push(v);
    return v;
  }

  remove(v) {
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
  }

  spawnParked(count = 16) {
    let tries = 0;
    while (this.list.length < count && tries < count * 12) {
      tries++;
      const spot = this.city.parkedSpot();
      if (this.city.collideCircle(spot.x, spot.y, 24)) continue;
      if (this.list.some((v) => dist2(v.x, v.y, spot.x, spot.y) < 90 * 90)) continue;
      const taxi = Math.random() < 0.12;
      this.add(
        new Vehicle({
          x: spot.x,
          y: spot.y,
          angle: spot.angle,
          isTaxi: taxi,
          color: taxi ? '#f4c84a' : undefined,
          type: taxi ? CAR_TYPES[2] : pick(CAR_TYPES),
        }),
      );
    }
  }

  update(dt, game) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const v = this.list[i];
      if (v.dead && v.deadTimer > 5) {
        this.list.splice(i, 1);
        continue;
      }
      if (v.ai) continue;
      const controls = v.control === 'player' ? game.carControls : { throttle: 0, steer: 0 };
      v.update(dt, game, controls);
    }
  }

  findNearest(x, y, radius, filter) {
    let best = null;
    let bd = radius * radius;
    for (const v of this.list) {
      if (v.dead) continue;
      if (filter && !filter(v)) continue;
      const d = dist2(x, y, v.x, v.y);
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    return best;
  }

  draw(ctx, time) {
    for (const v of this.list) v.draw(ctx, time);
  }
}
