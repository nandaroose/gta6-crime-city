// Rico Vale: walking, running, aiming, shooting and getting in and out of cars.

import { CONFIG, WEAPONS } from './config.js';
import { angleTo, lerpAngle } from './utils.js';

export class Player {
  constructor(x, y) {
    this.name = 'Rico Vale';
    this.x = x;
    this.y = y;
    this.radius = CONFIG.player.radius;
    this.angle = 0;
    this.health = CONFIG.player.maxHealth;
    this.armour = 0;
    this.money = 500;
    this.vehicle = null;
    this.dead = false;
    this.deadTimer = 0;
    this.invuln = 0;
    this.cooldown = 0;
    this.walkPhase = 0;
    this.footstep = 0;
    this.weapon = 'pistol';
    this.owned = { fists: true, pistol: true, smg: false, shotgun: false };
    this.ammo = { pistol: 30, smg: 0, shotgun: 0 };
    this.hitFlash = 0;
    this.lastShot = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vehicle = null;
    this.dead = false;
    this.deadTimer = 0;
    this.health = CONFIG.player.maxHealth;
    this.armour = 0;
    this.invuln = 1.5;
    this.cooldown = 0;
    this.hitFlash = 0;
    this.angle = 0;
  }

  update(dt, game) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    if (this.dead) {
      this.deadTimer += dt;
      return;
    }
    const aim = game.aim;
    if (this.vehicle) {
      const v = this.vehicle;
      this.x = v.x;
      this.y = v.y;
      this.angle = v.angle;
      if (aim) this.aimAngle = angleTo(v.x, v.y, aim.x, aim.y);
      return;
    }
    this.aimAngle = aim ? angleTo(this.x, this.y, aim.x, aim.y) : this.angle;
    this.angle = lerpAngle(this.angle, this.aimAngle, 1 - Math.exp(-16 * dt));
    const ax = game.input.moveX;
    const ay = game.input.moveY;
    const moving = ax !== 0 || ay !== 0;
    if (moving) {
      const len = Math.hypot(ax, ay);
      const run = game.input.run;
      const speed = run ? CONFIG.player.run : CONFIG.player.walk;
      const dx = (ax / len) * speed * dt;
      const dy = (ay / len) * speed * dt;
      const move = game.city.moveCircle(this.x, this.y, this.radius, dx, dy);
      this.x = move.x;
      this.y = move.y;
      this.walkPhase += dt * (run ? 16 : 9);
      this.footstep -= dt;
      if (this.footstep <= 0) {
        this.footstep = run ? 0.26 : 0.42;
        game.audio.footstep(run);
      }
      if (move.hit) this.walkPhase += dt * 2;
    } else {
      this.walkPhase += dt * 2;
    }
    if (this.health <= 0 && !this.dead) this.kill(game);
  }

  enterVehicle(v, game) {
    if (v.dead) return false;
    if (v.ai || v.driver) {
      v.ai = null;
      v.driver = false;
      const ped = game.peds.spawnAt(v.x + Math.cos(v.angle + Math.PI / 2) * 30, v.y + Math.sin(v.angle + Math.PI / 2) * 30, { flee: true });
      if (ped) game.peds.panic(ped.x, ped.y, 220, game);
      game.wanted.add(v.isPolice ? 2 : 1);
      game.hud.notify('Carjacked ' + v.name, 'crime');
      game.audio.ui();
    }
    v.control = 'player';
    v.ai = null;
    v.driver = false;
    this.vehicle = v;
    this.x = v.x;
    this.y = v.y;
    game.camera.addShake(0.18);
    return true;
  }

  exitVehicle(game) {
    const v = this.vehicle;
    if (!v) return;
    v.control = null;
    this.vehicle = null;
    const side = v.angle + Math.PI / 2;
    let px = v.x + Math.cos(side) * 38;
    let py = v.y + Math.sin(side) * 38;
    if (!game.city.isWalkable(px, py)) {
      px = v.x - Math.cos(side) * 38;
      py = v.y - Math.sin(side) * 38;
    }
    if (!game.city.isWalkable(px, py)) {
      const spot = game.city.walkableNear(v.x, v.y);
      px = spot.x;
      py = spot.y;
    }
    this.x = px;
    this.y = py;
    this.angle = v.angle;
    this.invuln = 0.4;
  }

  tryShoot(game) {
    if (this.dead) return;
    const w = WEAPONS[this.weapon];
    if (!w) return;
    if (w.melee) {
      if (this.cooldown > 0) return;
      this.cooldown = w.cooldown;
      game.combat.melee(this, game);
      return;
    }
    if (this.ammo[this.weapon] <= 0) {
      game.hud.notify('Out of ammo for ' + w.name, 'danger');
      game.audio.dryFire();
      this.cooldown = 0.35;
      return;
    }
    if (this.cooldown > 0) return;
    this.cooldown = w.cooldown;
    this.ammo[this.weapon]--;
    this.lastShot = game.time;
    game.combat.playerShoot(this, game);
  }

  switchWeapon(slot) {
    const names = ['fists', 'pistol', 'smg', 'shotgun'];
    const name = names[slot];
    if (!name) return false;
    if (!this.owned[name]) return false;
    this.weapon = name;
    this.cooldown = 0.15;
    return true;
  }

  damage(amount, game, source) {
    if (this.dead || this.invuln > 0) return;
    let dmg = amount;
    if (this.armour > 0) {
      const absorbed = Math.min(this.armour, dmg * 0.65);
      this.armour -= absorbed;
      dmg -= absorbed;
    }
    this.health -= dmg;
    this.invuln = 0.18;
    this.hitFlash = 1;
    game.camera.addShake(0.25);
    game.audio.hurt();
    if (this.health <= 0) this.kill(game);
  }

  kill(game) {
    if (this.dead) return;
    this.dead = true;
    this.deadTimer = 0;
    this.health = 0;
    if (this.vehicle) {
      this.vehicle.control = null;
      this.vehicle = null;
    }
    game.particles.blood(this.x, this.y, 26);
    game.camera.addShake(0.8);
    game.events.emit('playerDied', this);
  }

  addMoney(n) {
    this.money = Math.max(0, this.money + n);
  }

  addAmmo(weapon, n) {
    if (weapon === 'ammo') {
      this.ammo.pistol += n;
      if (this.owned.smg) this.ammo.smg += Math.floor(n * 0.7);
      if (this.owned.shotgun) this.ammo.shotgun += Math.floor(n * 0.25);
    } else {
      this.owned[weapon] = true;
      this.ammo[weapon] = (this.ammo[weapon] || 0) + n;
    }
  }

  draw(ctx, time) {
    if (this.vehicle || this.dead) return;
    const bob = Math.sin(this.walkPhase) * 1.5;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(10,14,20,0.3)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#2f3d52';
    ctx.fillRect(-7, -7 + bob * 0.2, 12, 14);
    ctx.fillStyle = '#e8bd96';
    ctx.beginPath();
    ctx.arc(1, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b3a5a';
    ctx.beginPath();
    ctx.arc(-1, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8bd96';
    ctx.beginPath();
    ctx.arc(3, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c94a3f';
    ctx.fillRect(-6, -6, 10, 4);
    const w = WEAPONS[this.weapon];
    if (w && !w.melee) {
      ctx.fillStyle = '#252b35';
      ctx.fillRect(8, -2.2, 13, 4.4);
      ctx.fillStyle = '#4a5362';
      ctx.fillRect(16, -1.5, 6, 3);
    }
    ctx.restore();
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(220,60,50,${this.hitFlash * 0.25})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.invuln > 0.8 && Math.sin(time * 18) > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
