// peds.js — pedestrians: sidewalk wandering, panic fleeing from gunfire and
// horns, running over (blood decal + wanted), and despawn/spawn streaming.

import { TILE, clamp, TAU, hash2 } from './utils.js';
import { T } from './city.js';

export class Peds {
  constructor() {
    this.list = [];
    this.max = 60;
  }

  maintain(world) {
    // Despawn far-away peds, spawn near the player on sidewalks.
    const p = world.player;
    this.list = this.list.filter(q =>
      !q.dead && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < (1400) ** 2 || q.dead);

    for (const q of this.list) {
      if (q.dead) q.deadTimer -= 1;
    }
    this.list = this.list.filter(q => !q.dead || q.deadTimer > 0);

    let guard = 0;
    while (this.list.length < this.max && guard++ < 8) {
      const pos = findSidewalkNear(world, p.x + (Math.random() - 0.5) * 1200, p.y + (Math.random() - 0.5) * 1200);
      if (!pos) continue;
      this.list.push(makePed(pos.x, pos.y));
    }
  }

  update(world, dt) {
    const player = world.player;
    for (const q of this.list) {
      if (q.dead) continue;

      // Run-over check: any moving car near
      for (const car of world.vehicles) {
        const cs = Math.abs(car.speed);
        if (cs > 40 && Math.abs(q.x - car.x) < car.type.w / 2 + 4 && Math.abs(q.y - car.y) < car.type.h / 2 + 4) {
          world.onPedHitByCar(q, car);
        }
      }

      if (q.state === 'wander') {
        q.timer -= dt;
        if (q.timer <= 0) {
          q.timer = 1.5 + Math.random() * 3;
          // Prefer to keep walking along the sidewalk
          const a = Math.random() * TAU;
          q.dirX = Math.cos(a); q.dirY = Math.sin(a);
          if (Math.random() < 0.4) { q.dirX = 0; q.dirY = 0; } // idle
        }
        // Keep to walkable tiles: probe ahead
        const sp = q.speed;
        const nx = q.x + q.dirX * sp * dt, ny = q.y + q.dirY * sp * dt;
        if (world.city.isWalkable(Math.floor(nx / TILE), Math.floor(q.y / TILE))) q.x = nx;
        else q.dirX *= -1;
        if (world.city.isWalkable(Math.floor(q.x / TILE), Math.floor(ny / TILE))) q.y = ny;
        else q.dirY *= -1;

        // Panic near player gunfire is triggered externally via panicAt()
      } else if (q.state === 'flee') {
        q.fleeTimer -= dt;
        if (q.fleeTimer <= 0) { q.state = 'wander'; q.timer = 0; }
        const fx = q.x - q.threatX, fy = q.y - q.threatY;
        const l = Math.hypot(fx, fy) || 1;
        const sp = q.speed * 2.6;
        const nx = q.x + (fx / l) * sp * dt, ny = q.y + (fy / l) * sp * dt;
        if (world.city.isWalkable(Math.floor(nx / TILE), Math.floor(ny / TILE))) {
          q.x = nx; q.y = ny;
        } else {
          // slide along wall
          if (world.city.isWalkable(Math.floor(nx / TILE), Math.floor(q.y / TILE))) q.x = nx;
          else if (world.city.isWalkable(Math.floor(q.x / TILE), Math.floor(ny / TILE))) q.y = ny;
          else q.threatX += (Math.random() - 0.5) * 100;
        }
        q.walkPhase += dt * 20;
      }

      // On-foot player lightly collides with peds
      if (!player.car) {
        const d = Math.hypot(q.x - player.x, q.y - player.y);
        if (d < 14 && d > 0.01) {
          const push = (14 - d) / d * 0.5;
          q.x -= (player.x - q.x) * push;
          q.y -= (player.y - q.y) * push;
        }
      }
    }
  }

  // Panic broadcast: peds within radius flee from (x,y).
  panicAt(world, x, y, radius) {
    for (const q of this.list) {
      if (q.dead) continue;
      const d2 = (q.x - x) ** 2 + (q.y - y) ** 2;
      if (d2 < radius * radius) {
        q.state = 'flee';
        q.fleeTimer = 2.5 + Math.random() * 2;
        q.threatX = x; q.threatY = y;
      }
    }
  }
}

const SHIRTS = ['#d94f4f', '#4f7fd9', '#d9a84f', '#59b06a', '#c65fc4', '#e0e0e0', '#5f5f5f'];

export function makePed(x, y) {
  return {
    x, y,
    dirX: 0, dirY: 0,
    timer: Math.random() * 2,
    speed: 40 + hash2(x | 0, y | 0, 7) * 30,
    state: 'wander',
    fleeTimer: 0, threatX: 0, threatY: 0,
    walkPhase: Math.random() * TAU,
    hp: 25,
    dead: false, deadTimer: 120,
    shirt: SHIRTS[(x * 7 + y) % SHIRTS.length | 0] || '#d94f4f',
    skin: ['#d9a184', '#a97b5a', '#8a5c3b', '#e8c39e'][(x + y) % 4 | 0] || '#d9a184',
  };
}

export function findSidewalkNear(world, x, y) {
  for (let tries = 0; tries < 14; tries++) {
    const tx = clamp(Math.floor(x / TILE) + ((Math.random() * 20) | 0) - 10, 1, 98);
    const ty = clamp(Math.floor(y / TILE) + ((Math.random() * 20) | 0) - 10, 1, 98);
    if (world.city.t(tx, ty) === T.SIDEWALK) {
      return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
    }
  }
  return null;
}

export function drawPed(ctx, q) {
  ctx.save();
  ctx.translate(q.x, q.y);
  if (q.dead) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = q.shirt;
    ctx.fillRect(-8, -3, 16, 6);
    ctx.fillStyle = q.skin;
    ctx.beginPath(); ctx.arc(9, 0, 3.5, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 4, 7, 5, 0, 0, TAU); ctx.fill();

  const face = Math.atan2(q.dirY, q.dirX);
  ctx.rotate(face + Math.PI / 2);
  const bob = Math.sin(q.walkPhase) * 2.5;
  ctx.fillStyle = '#333';
  ctx.fillRect(-4, 1, 3, 7 + bob * 0.3);
  ctx.fillRect(1, 1, 3, 7 - bob * 0.3);
  ctx.fillStyle = q.shirt;
  ctx.fillRect(-5, -5, 10, 9);
  ctx.fillStyle = q.skin;
  ctx.beginPath(); ctx.arc(0, -7, 3.6, 0, TAU); ctx.fill();
  ctx.restore();
}
