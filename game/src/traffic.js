// traffic.js — ambient AI traffic: cars spawn on road lanes near the player,
// drive along the grid, stop at intersections and behind obstacles, react to
// the player's vehicle and horn.

import { TILE, clamp } from './utils.js';
import { makeCar, stepCar } from './vehicles.js';
import { audio } from './audio.js';

export class Traffic {
  constructor() {
    this.max = 14;
  }

  maintain(world) {
    const p = world.player;
    // despawn far / dead cars (unless player's)
    world.vehicles = world.vehicles.filter(c =>
      c.driver === 'player' ||
      c.missionTag ||
      ((!c.dead || (world.player.car === c)) &&
        (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < (1600) ** 2));

    let guard = 0;
    while (this.count(world) < this.max && guard++ < 6) {
      this.spawnOne(world);
    }
  }

  count(world) {
    return world.vehicles.filter(c => c.driver === 'ai' || c.driver === 'cop').length;
  }

  spawnOne(world) {
    const p = world.player;
    const anglePick = Math.random() * Math.PI * 2;
    const r = 700 + Math.random() * 500;
    const spot = world.city.nearestRoadTile(
      Math.floor((p.x + Math.cos(anglePick) * r) / TILE),
      Math.floor((p.y + Math.sin(anglePick) * r) / TILE));
    if (!spot) return;
    // Choose driving axis
    const onH = world.city.isRoad(spot.tx, spot.ty - 1) || world.city.isRoad(spot.tx, spot.ty + 1) || world.city.roadAxisH.has(spot.ty);
    const dirRight = Math.random() < 0.5 ? 1 : -1;
    const isAve = world.city.isAvenueRow(spot.ty);
    const lane = world.city.laneOffset(spot.ty) * dirRight * 0.8;
    const x = (spot.tx + 0.5) * TILE;
    const y = (spot.ty + 0.5) * TILE + (world.city.roadAxisH.has(spot.ty) ? lane : 0);
    const carType = pickCivType();
    const car = makeCar(carType, x, y, onH ? (dirRight > 0 ? 0 : Math.PI) : (dirRight > 0 ? Math.PI / 2 : -Math.PI / 2));
    car.driver = 'ai';
    car.ai = { axis: onH ? 'h' : 'v', dir: dirRight, stoppedTimer: 0 };
    world.vehicles.push(car);
  }

  update(world, dt) {
    const p = world.player;
    for (const car of world.vehicles) {
      if (car.driver !== 'ai' || car.dead) continue;
      const ai = car.ai;
      const speed = Math.abs(car.speed);

      // Slow down for things ahead
      const aheadX = car.x + Math.cos(car.angle) * 55;
      const aheadY = car.y + Math.sin(car.angle) * 55;
      let blocked = false;
      for (const o of world.vehicles) {
        if (o === car || o.dead) continue;
        if ((o.x - aheadX) ** 2 + (o.y - aheadY) ** 2 < 45 * 45) { blocked = true; break; }
      }
      if (!blocked && !p.car && (p.x - aheadX) ** 2 + (p.y - aheadY) ** 2 < 40 * 40) blocked = true;
      if (!blocked && speed > 80) {
        for (const q of world.peds.list) {
          if (!q.dead && (q.x - aheadX) ** 2 + (q.y - aheadY) ** 2 < 32 * 32) { blocked = true; break; }
        }
      }
      // Flee behavior: after being carjacked or panicked, drive off fast
      const cruise = car.fleeing ? 160 : 85;

      let throttle = blocked ? -0.5 : 1;
      // stop at intersection edge sometimes (random yield)
      const tx = Math.floor(car.x / TILE), ty = Math.floor(car.y / TILE);
      const nearCross = world.city.roadAxisV.has(clamp(tx + ai.dir, 0, 99)) && ai.axis === 'h';
      const nearCrossV = world.city.roadAxisH.has(clamp(ty + ai.dir, 0, 99)) && ai.axis === 'v';
      if (!blocked && ((nearCross && Math.random() < 0.01 && speed > 60) || (nearCrossV && Math.random() < 0.01 && speed > 60))) {
        throttle = 0; // brief yield at intersection
      }

      // Steer toward lane centerline
      let steer = 0;
      if (ai.axis === 'h') {
        const laneY = (ty + 0.5) * TILE + world.city.laneOffset(ty) * ai.dir * 0.8;
        const err = (laneY - car.y) / 24;
        const want = ai.dir > 0 ? 0 : Math.PI;
        let da = angleDiff(want, car.angle);
        steer = clamp(err * (ai.dir > 0 ? 1 : -1), -1, 1) + da * (ai.dir > 0 ? -1 : 1) * -0.8;
        steer = clamp(steer, -1, 1);
      } else {
        const laneX = (tx + 0.5) * TILE + world.city.laneOffset(tx) * ai.dir * 0.8;
        const err = (laneX - car.x) / 24;
        steer = clamp(-err * (ai.dir > 0 ? -1 : 1), -1, 1);
      }
      // avoid solid ahead
      if (!world.city.isWalkable(Math.floor(aheadX / TILE), Math.floor(aheadY / TILE))) {
        steer = ai.dir > 0 ? -0.6 : 0.6;
        throttle = -0.2;
      }

      stepCar(car, { throttle, steer, brake: false }, dt, world);

      // Recompute axis at intersections: sometimes turn
      if (speed < 25) {
        ai.turnCooldown = (ai.turnCooldown || 0) - dt;
        if (ai.turnCooldown !== undefined && ai.turnCooldown <= 0) {
          ai.turnCooldown = 0.4;
          // If sitting at an intersection tile, chance to turn onto the crossing road
          if (world.city.roadAxisH.has(ty) && world.city.roadAxisV.has(tx)) {
            if (Math.random() < 0.5) {
              ai.axis = ai.axis === 'h' ? 'v' : 'h';
              ai.dir = Math.random() < 0.5 ? 1 : -1;
              car.angle = ai.axis === 'h' ? (ai.dir > 0 ? 0 : Math.PI) : (ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
            }
          }
        }
      }
      if (car.fleeing) car.fleeing = Math.max(0, car.fleeing - dt * 0.05);
    }
  }
}

function pickCivType() {
  const r = Math.random();
  if (r < 0.4) return 'sedan';
  if (r < 0.55) return 'taxi';
  if (r < 0.7) return 'sport';
  if (r < 0.83) return 'van';
  if (r < 0.95) return 'pickup';
  return 'limo';
}

function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
