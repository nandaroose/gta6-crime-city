import { VEHICLES } from './config.js';
import { clamp, angleDiff, approach } from './utils.js';
import { resolveCircle } from './city.js';

let nextVehicleId = 1;

export function createVehicle(type, x, y, angle = 0, opts = {}) {
  const spec = VEHICLES[type] || VEHICLES.sedan;
  const colors = spec.colors;
  return {
    id: nextVehicleId++,
    type,
    spec,
    x, y, angle,
    speed: 0,
    w: spec.w,
    h: spec.h,
    color: opts.color || colors[Math.floor(Math.random() * colors.length)],
    health: 100,
    maxHealth: 100,
    driver: null,
    dead: false,
    brakeLight: false,
    smokeTimer: 0,
    police: type === 'police',
    prevX: x,
    prevY: y
  };
}

export function updateVehicle(game, v, dt, ctrl) {
  if (v.dead) return;
  const spec = v.spec;
  const throttle = ctrl.throttle || 0;
  const brake = ctrl.brake || 0;
  const steer = clamp(ctrl.steer || 0, -1, 1);

  if (throttle > 0) v.speed += spec.accel * throttle * dt;
  if (brake > 0) {
    v.speed = approach(v.speed, 0, spec.accel * 2.1 * brake * dt);
    v.brakeLight = true;
  } else {
    v.brakeLight = false;
  }
  if (ctrl.reverse) v.speed -= spec.accel * 0.55 * dt;
  if (ctrl.handbrake) v.speed = approach(v.speed, 0, spec.accel * 2.6 * dt);

  const drag = throttle > 0 || ctrl.reverse ? 0.35 : 1.1;
  v.speed -= v.speed * drag * dt;
  v.speed = clamp(v.speed, -spec.maxSpeed * 0.42, spec.maxSpeed);
  if (Math.abs(v.speed) < 1.2 && !throttle && !ctrl.reverse) v.speed = 0;

  const grip = Math.min(Math.abs(v.speed) / 110, 1);
  const turnRate = spec.turn * (0.45 + grip * 0.75) * (ctrl.handbrake ? 1.35 : 1);
  v.angle += steer * turnRate * dt * Math.sign(v.speed || 1);

  const nx = v.x + Math.cos(v.angle) * v.speed * dt;
  const ny = v.y + Math.sin(v.angle) * v.speed * dt;

  let hit = false;
  let cx = 0;
  let cy = 0;
  let count = 0;
  const offsets = [0, 0.34, -0.34];
  for (let i = 0; i < offsets.length; i++) {
    const ox = nx + Math.cos(v.angle) * offsets[i] * v.w;
    const oy = ny + Math.sin(v.angle) * offsets[i] * v.w;
    const res = resolveCircle(game.city, ox, oy, v.h * 0.54);
    if (res.hit) {
      hit = true;
      cx += res.x - ox;
      cy += res.y - oy;
    }
    count++;
  }
  if (hit) {
    v.x += cx / count;
    v.y += cy / count;
    if (Math.abs(v.speed) > 70) {
      v.health = Math.max(0, v.health - Math.abs(v.speed) * 0.06);
      if (v.health <= 0) v.dead = true;
    }
    v.speed *= -0.18;
  } else {
    v.x = nx;
    v.y = ny;
  }

  if (v.health < 45) {
    v.smokeTimer -= dt;
    if (v.smokeTimer <= 0) {
      v.smokeTimer = 0.12;
      if (game.particles) {
        game.particles.push({
          type: 'smoke',
          x: v.x + Math.cos(v.angle + Math.PI) * v.w * 0.35,
          y: v.y + Math.sin(v.angle + Math.PI) * v.w * 0.35,
          vx: (Math.random() - 0.5) * 20,
          vy: -20 - Math.random() * 20,
          life: 0.9, max: 0.9, size: 7 + Math.random() * 5, drag: 0.5,
          color: 'rgba(40,40,40,0.5)'
        });
      }
    }
  }
}

export function drawVehicle(ctx, v, time) {
  const damaged = v.health < 45;
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-v.w / 2 + 4, -v.h / 2 + 6, v.w, v.h);

  ctx.fillStyle = '#15181d';
  const wheelY = v.h / 2 - 1;
  ctx.fillRect(-v.w * 0.34, -wheelY - 4, v.w * 0.22, 5);
  ctx.fillRect(-v.w * 0.34, wheelY - 1, v.w * 0.22, 5);
  ctx.fillRect(v.w * 0.16, -wheelY - 4, v.w * 0.22, 5);
  ctx.fillRect(v.w * 0.16, wheelY - 1, v.w * 0.22, 5);

  ctx.fillStyle = v.color;
  ctx.beginPath();
  ctx.moveTo(-v.w / 2 + 5, -v.h / 2);
  ctx.lineTo(v.w / 2 - 7, -v.h / 2);
  ctx.quadraticCurveTo(v.w / 2, -v.h / 2, v.w / 2, 0);
  ctx.quadraticCurveTo(v.w / 2, v.h / 2, v.w / 2 - 7, v.h / 2);
  ctx.lineTo(-v.w / 2 + 5, v.h / 2);
  ctx.quadraticCurveTo(-v.w / 2, v.h / 2, -v.w / 2, v.h / 2 - 5);
  ctx.lineTo(-v.w / 2, -v.h / 2 + 5);
  ctx.quadraticCurveTo(-v.w / 2, -v.h / 2, -v.w / 2 + 5, -v.h / 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(20,28,38,0.85)';
  ctx.fillRect(v.w * 0.08, -v.h / 2 + 3, v.w * 0.2, v.h - 6);
  ctx.fillRect(-v.w * 0.2, -v.h / 2 + 3, v.w * 0.13, v.h - 6);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(-v.w / 2 + 4, -v.h / 2 + 2, v.w - 8, 3);

  ctx.fillStyle = '#f7e6a8';
  ctx.fillRect(v.w / 2 - 4, -v.h / 2 + 3, 3, 5);
  ctx.fillRect(v.w / 2 - 4, v.h / 2 - 8, 3, 5);
  ctx.fillStyle = v.brakeLight ? '#ff4a3a' : '#8a2a24';
  ctx.fillRect(-v.w / 2 + 1, -v.h / 2 + 3, 3, 5);
  ctx.fillRect(-v.w / 2 + 1, v.h / 2 - 8, 3, 5);

  if (v.police) {
    ctx.fillStyle = '#1b2b5a';
    ctx.fillRect(-v.w * 0.1, -v.h / 2 + 2, v.w * 0.3, v.h - 4);
    const flash = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b3b' : '#3b6bff';
    ctx.fillRect(-2, -6, 4, 5);
    ctx.fillRect(-2, 1, 4, 5);
  }
  if (damaged) {
    ctx.fillStyle = 'rgba(30,30,30,0.45)';
    ctx.fillRect(-v.w * 0.25, -v.h * 0.3, 7, 6);
    ctx.fillRect(v.w * 0.1, v.h * 0.1, 5, 5);
  }
  ctx.restore();
}

export function vehicleAngleDiff(v, tx, ty) {
  return angleDiff(v.angle, Math.atan2(ty - v.y, tx - v.x));
}
