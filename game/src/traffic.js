// Lane-following civilian traffic that spawns around the player and can be carjacked.

import { CONFIG, CAR_TYPES } from './config.js';
import { clamp, angleDelta, angleTo, dist2, pick, rand, chance } from './utils.js';
import { Vehicle } from './vehicles.js';

export class Traffic {
  constructor(game) {
    this.cars = [];
    this.timer = 1.2;
    this.honkCooldown = 0;
  }

  update(dt, game) {
    this.timer -= dt;
    this.honkCooldown = Math.max(0, this.honkCooldown - dt);
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      if (car.dead || !car.ai || car.control === 'player') {
        this.cars.splice(i, 1);
        continue;
      }
      if (dist2(car.x, car.y, game.player.x, game.player.y) > CONFIG.traffic.despawn * CONFIG.traffic.despawn) {
        game.vehicles.remove(car);
        this.cars.splice(i, 1);
        continue;
      }
      this.drive(car, dt, game);
    }
    if (this.cars.length < CONFIG.traffic.max && this.timer <= 0) {
      this.timer = CONFIG.traffic.spawnEvery;
      this.spawn(game);
    }
  }

  burst(game, count) {
    for (let i = 0; i < count; i++) this.spawn(game);
  }

  spawn(game) {
    const p = game.city.randomLaneNear(game.player.x, game.player.y, 620, 1150);
    if (!p.lane) return;
    if (dist2(p.x, p.y, game.player.x, game.player.y) < 480 * 480) return;
    if (game.vehicles.list.some((v) => dist2(v.x, v.y, p.x, p.y) < 90 * 90)) return;
    const lane = p.lane;
    const type = pick(CAR_TYPES);
    const car = new Vehicle({
      x: p.x,
      y: p.y,
      angle: lane.axis === 'h' ? (lane.dir === 1 ? 0 : Math.PI) : lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2,
      type,
      driver: true,
      isTaxi: Math.random() < 0.08,
    });
    if (car.isTaxi) car.color = '#f4c84a';
    car.ai = {
      axis: lane.axis,
      dir: lane.dir,
      coord: lane.coord,
      turnCooldown: 1.2,
      baseSpeed: CONFIG.traffic.speed + rand(-25, 35),
      stuck: 0,
    };
    this.cars.push(car);
    game.vehicles.add(car);
  }

  drive(car, dt, game) {
    const ai = car.ai;
    ai.turnCooldown -= dt;
    const ahead = 130 + Math.abs(car.speed) * 0.32;
    let tx;
    let ty;
    if (ai.axis === 'h') {
      tx = car.x + ai.dir * ahead;
      ty = ai.coord;
    } else {
      tx = ai.coord;
      ty = car.y + ai.dir * ahead;
    }
    const desired = angleTo(car.x, car.y, tx, ty);
    const diff = angleDelta(car.angle, desired);
    let steer = clamp(diff * 2.1, -1, 1);
    let throttle = 0.5;
    if (Math.abs(diff) > 1.1) throttle = 0.12;
    if (Math.abs(diff) > 2.1) throttle = -0.35;
    if (Math.abs(car.speed) > ai.baseSpeed) throttle = Math.min(throttle, 0);

    const blocked = this.blockedAhead(car, game);
    if (blocked) {
      throttle = car.speed > 70 ? -0.5 : 0;
      if (car.speed < 25) ai.stuck += dt;
      else ai.stuck = 0;
      if (ai.stuck > 2.4 && this.honkCooldown <= 0) {
        this.honkCooldown = 3.5;
        game.audio.horn(car.x, car.y);
        game.peds.panic(car.x, car.y, 220, game);
      }
    } else {
      ai.stuck = 0;
    }

    if (ai.turnCooldown <= 0) {
      if (ai.axis === 'h') {
        const cx = nearest(car.x, game.city.roadX);
        if (Math.abs(car.x - cx) < 70 && chance(0.16)) {
          const dir = chance(0.5) ? 1 : -1;
          ai.axis = 'v';
          ai.dir = dir;
          ai.coord = cx + (dir === 1 ? -32 : 32);
          ai.turnCooldown = 2.2;
        }
      } else {
        const cy = nearest(car.y, game.city.roadY);
        if (Math.abs(car.y - cy) < 70 && chance(0.16)) {
          const dir = chance(0.5) ? 1 : -1;
          ai.axis = 'h';
          ai.dir = dir;
          ai.coord = cy + (dir === 1 ? 32 : -32);
          ai.turnCooldown = 2.2;
        }
      }
    }

    if (ai.axis === 'h') {
      if (ai.dir === 1 && car.x > game.city.size - 110) ai.dir = -1;
      if (ai.dir === -1 && car.x < 110) ai.dir = 1;
    } else {
      if (ai.dir === 1 && car.y > 38 * 64) ai.dir = -1;
      if (ai.dir === -1 && car.y < 90) ai.dir = 1;
    }

    car.update(dt, game, { throttle, steer, handbrake: false, brake: false });
  }

  blockedAhead(car, game) {
    const ai = car.ai;
    for (const other of this.cars) {
      if (other === car || other.dead || !other.ai) continue;
      if (other.ai.axis !== ai.axis || other.ai.dir !== ai.dir) continue;
      if (Math.abs(other.ai.coord - ai.coord) > 24) continue;
      const gap = ai.axis === 'h' ? (other.x - car.x) * ai.dir : (other.y - car.y) * ai.dir;
      if (gap > 0 && gap < 95) return true;
    }
    const pv = game.player.vehicle;
    if (pv && !pv.dead) {
      const gap = ai.axis === 'h' ? (pv.x - car.x) * ai.dir : (pv.y - car.y) * ai.dir;
      const lateral = ai.axis === 'h' ? Math.abs(pv.y - ai.coord) : Math.abs(pv.x - ai.coord);
      if (gap > 0 && gap < 110 && lateral < 40) return true;
    }
    return false;
  }
}

function nearest(value, list) {
  let best = list[0];
  let bd = Math.abs(value - best);
  for (const v of list) {
    const d = Math.abs(value - v);
    if (d < bd) {
      bd = d;
      best = v;
    }
  }
  return best;
}
