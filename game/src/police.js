// police.js — police response: foot officers and patrol cruisers spawn with
// wanted stars, chase, shoot, and try to bust the player on foot.

import { TILE, clamp, dist, TAU } from './utils.js';
import { makeCar, stepCar } from './vehicles.js';
import { audio } from './audio.js';

export class Police {
  constructor() {
    this.cars = [];   // active cruiser objects (also mirrored in world.vehicles)
    this.cops = [];   // foot officers
    this.spawnTimer = 0;
  }

  update(world, dt) {
    const wanted = world.wanted;
    audio.startSiren();

    // Sirens audible while any cruiser is close and wanted > 0
    let sirenNear = false;
    for (const c of this.cars) {
      if (dist(c.x, c.y, world.player.x, world.player.y) < 700) { sirenNear = true; break; }
    }
    audio.setSiren(wanted.stars > 0 && sirenNear);

    // Despawn everything at 0 stars
    if (wanted.stars === 0) {
      this.despawnAll(world);
      return;
    }

    // Spawn budget
    this.spawnTimer -= dt;
    const budget = wanted.unitBudget();
    const active = this.cops.length + this.cars.length;
    if (active < budget && this.spawnTimer <= 0) {
      this.spawnTimer = 2.2 - wanted.stars * 0.25;
      if (wanted.stars >= 2 && Math.random() < 0.6) this.spawnCruiser(world);
      else this.spawnFootCop(world);
    }

    this.updateFootCops(world, dt);
    this.updateCruisers(world, dt);
  }

  despawnAll(world) {
    for (const c of this.cars) {
      const i = world.vehicles.indexOf(c);
      if (i >= 0 && c.driver !== 'player') world.vehicles.splice(i, 1);
    }
    this.cars.length = 0;
    for (const cop of this.cops) cop.despawn = true;
    this.cops = this.cops.filter(c => false);
  }

  spawnFootCop(world) {
    const p = world.player;
    const a = Math.random() * TAU;
    const r = 420 + Math.random() * 180;
    const spot = world.city.nearestRoadTile(
      Math.floor((p.x + Math.cos(a) * r) / TILE), Math.floor((p.y + Math.sin(a) * r) / TILE));
    if (!spot) return;
    this.cops.push({
      x: (spot.tx + 0.5) * TILE, y: (spot.ty + 0.5) * TILE,
      hp: 40, dead: false, despawn: false,
      shootCd: 0.8 + Math.random(),
      walkPhase: 0,
    });
  }

  spawnCruiser(world) {
    const p = world.player;
    const a = Math.random() * TAU;
    const r = 600 + Math.random() * 300;
    const spot = world.city.nearestRoadTile(
      Math.floor((p.x + Math.cos(a) * r) / TILE), Math.floor((p.y + Math.sin(a) * r) / TILE));
    if (!spot) return;
    const car = makeCar('police', (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE,
      Math.random() < 0.5 ? 0 : Math.PI / 2);
    car.driver = 'cop';
    world.vehicles.push(car);
    this.cars.push(car);
  }

  updateFootCops(world, dt) {
    const p = world.player;
    for (const cop of this.cops) {
      if (cop.dead) { cop.deadT = (cop.deadT || 0) + dt; continue; }
      const d = dist(cop.x, cop.y, p.x, p.y);
      if (d < 520) world.wanted.seen();

      if (!p.car) {
        // chase
        const l = d || 1;
        const sp = 150;
        const nx = cop.x + ((p.x - cop.x) / l) * sp * dt;
        const ny = cop.y + ((p.y - cop.y) / l) * sp * dt;
        if (world.city.isWalkable(Math.floor(nx / TILE), Math.floor(cop.y / TILE))) cop.x = nx;
        if (world.city.isWalkable(Math.floor(cop.x / TILE), Math.floor(ny / TILE))) cop.y = ny;
        cop.walkPhase += dt * 12;

        // shooting
        cop.shootCd -= dt;
        if (d < 300 && cop.shootCd <= 0) {
          cop.shootCd = 0.9 + Math.random() * 0.6;
          const a = Math.atan2(p.y - cop.y, p.x - cop.x) + (Math.random() - 0.5) * 0.25;
          world.fireBullet(cop.x, cop.y, a, 640, 10, 'cop');
          audio.gunshot(false);
        }

        // BUSTED: close cop while player is on foot and slow
        if (d < 26) {
          cop.bustTimer = (cop.bustTimer || 0) + dt;
          if (cop.bustTimer > 1.4) world.bustPlayer();
        } else cop.bustTimer = 0;
      }
    }
    this.cops = this.cops.filter(c => !c.despawn && (!c.dead || (c.deadT || 0) < 25));
  }

  updateCruisers(world, dt) {
    const p = world.player;
    for (const car of this.cars) {
      if (car.dead) continue;
      const d = dist(car.x, car.y, p.x, p.y);
      if (d < 600) world.wanted.seen();

      // Ram-ish chase: steer toward the player
      let steer = 0, throttle = 1;
      const want = Math.atan2(p.y - car.y, p.x - car.x);
      let da = want - car.angle;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      steer = clamp(da * 1.6, -1, 1);
      if (d < 60) throttle = 0.2;
      stepCar(car, { throttle, steer, brake: false }, dt, world);

      // Deploy a foot cop if close & slow
      if (d < 240 && Math.abs(car.speed) < 30 && this.cops.length < 6) {
        car.deployCd = (car.deployCd || 2) - dt;
        if (car.deployCd <= 0) {
          car.deployCd = 3;
          this.cops.push({
            x: car.x + (Math.random() - 0.5) * 20, y: car.y + (Math.random() - 0.5) * 20,
            hp: 40, dead: false, despawn: false, shootCd: 1.2, walkPhase: 0,
          });
        }
      }
    }
    this.cars = this.cars.filter(c => !c.dead);
  }

  drawCop(ctx, cop) {
    ctx.save();
    ctx.translate(cop.x, cop.y);
    if (cop.dead) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#1a3a6a';
      ctx.fillRect(-8, -3, 16, 6);
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(2, 4, 7, 5, 0, 0, TAU); ctx.fill();
    const a = Math.atan2(worldP.y - cop.y, worldP.x - cop.x);
    ctx.rotate(a + Math.PI / 2);
    const bob = Math.sin(cop.walkPhase) * 2.5;
    ctx.fillStyle = '#223355';
    ctx.fillRect(-4, 1, 3, 7 + bob * 0.3);
    ctx.fillRect(1, 1, 3, 7 - bob * 0.3);
    ctx.fillStyle = '#2f4f8f'; // uniform
    ctx.fillRect(-5, -5, 10, 9);
    ctx.fillStyle = '#d9a184';
    ctx.beginPath(); ctx.arc(0, -7, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#22222a'; // cap
    ctx.fillRect(-4, -12, 8, 3);
    ctx.restore();
  }
}

// global ref hack-free: drawCop needs player pos; main sets this before drawing
let worldP = { x: 0, y: 0 };
export function setCopDrawTarget(p) { worldP = p; }
