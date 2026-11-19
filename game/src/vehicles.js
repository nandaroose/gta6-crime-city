// vehicles.js — arcade car physics, car type catalog, damage/explosions,
// and enter/exit (carjack) logic shared by player, traffic and police.

import { TILE, clamp, TAU } from './utils.js';
import { T } from './city.js';
import { audio } from './audio.js';

export const CAR_TYPES = [
  { id: 'sedan',  name: 'Corsair Sedan',   w: 30, h: 16, accel: 150, top: 190, grip: 3.2, turn: 2.4, hp: 100, colors: ['#c8433a', '#3a6fc8', '#c8b03a', '#7a3ac8', '#44aa77'] },
  { id: 'sport',  name: 'Barracuda GT',    w: 32, h: 15, accel: 220, top: 260, grip: 2.6, turn: 2.6, hp: 90,  colors: ['#e02020', '#f2c014', '#20d0e0'] },
  { id: 'van',    name: 'Palma Van',       w: 34, h: 18, accel: 120, top: 150, grip: 4.0, turn: 1.9, hp: 130, colors: ['#d8d8d8', '#8a99a8', '#c8a06a'] },
  { id: 'pickup', name: 'Ranchero',       w: 33, h: 17, accel: 140, top: 170, grip: 3.6, turn: 2.1, hp: 120, colors: ['#6a8a4a', '#8a6a4a', '#557'] },
  { id: 'taxi',   name: 'Solano Cab',      w: 30, h: 16, accel: 150, top: 185, grip: 3.3, turn: 2.3, hp: 100, colors: ['#f2c014'], taxi: true },
  { id: 'limo',   name: 'Vice Limousine',  w: 44, h: 16, accel: 130, top: 165, grip: 3.8, turn: 1.6, hp: 140, colors: ['#111', '#f0f0f0'] },
  { id: 'police', name: 'PD Cruiser',      w: 31, h: 16, accel: 200, top: 240, grip: 3.0, turn: 2.5, hp: 120, colors: ['#eef2f6'], police: true },
];

export function makeCar(typeId, x, y, angle) {
  const type = CAR_TYPES.find(t => t.id === typeId) || CAR_TYPES[0];
  const color = type.colors[Math.floor(Math.random() * type.colors.length)];
  return {
    type, color,
    x, y, angle,
    speed: 0,
    steer: 0,
    hp: type.hp,
    dead: false,
    burnTimer: 0,
    wheelAngle: 0,
    driver: null,       // 'player' | 'ai' | 'cop' | null (parked)
    ai: null,           // traffic brain (traffic.js)
    skidTimer: 0,
    hornCooldown: 0,
    flipX: 0, flipY: 0, // collision impulse
    fireDamageCooldown: 0,
  };
}

// Physics step. controls = { throttle: -1..1, steer: -1..1, brake: bool, handbrake: bool }
export function stepCar(car, controls, dt, world) {
  const t = car.type;
  if (car.dead) {
    car.speed *= Math.pow(0.2, dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (car.burnTimer > 0) car.burnTimer -= dt;
    return;
  }

  const throttle = controls.throttle || 0;
  const steerIn = clamp(controls.steer || 0, -1, 1);

  // Acceleration & braking
  if (throttle > 0) car.speed += t.accel * throttle * dt;
  else if (throttle < 0) car.speed += t.accel * 0.7 * throttle * dt;
  if (controls.brake) car.speed -= Math.sign(car.speed) * t.accel * 1.4 * dt;
  if (controls.handbrake) car.speed *= Math.pow(0.05, dt);
  car.speed = clamp(car.speed, -t.top * 0.4, t.top);

  // Steering: rate scales down at high speed for stability
  const speedFactor = Math.min(1, Math.abs(car.speed) / 60);
  car.steer = steerIn;
  const turnRate = t.turn * (0.4 + 0.6 * (1 - speedFactor * 0.55));
  car.angle += steerIn * turnRate * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 40);

  // Drift: decompose velocity into forward + lateral, damp lateral by grip
  const fwd = car.speed;
  car.driftLat = (car.driftLat || 0);
  const lat = -steerIn * Math.abs(fwd) * dt * (controls.handbrake ? 2.4 : 0.9) / t.grip;
  car.driftLat = car.driftLat * Math.pow(0.02, dt) + lat;

  const ca = Math.cos(car.angle), sa = Math.sin(car.angle);
  let nx = car.x + (ca * fwd + Math.cos(car.angle + Math.PI / 2) * car.driftLat * 30) * dt;
  let ny = car.y + (sa * fwd + Math.sin(car.angle + Math.PI / 2) * car.driftLat * 30) * dt;

  // Skid marks when drifting hard or braking
  const skidding = Math.abs(car.driftLat) > 0.25 || (controls.brake && Math.abs(car.speed) > 60);
  if (skidding && world) {
    car.skidTimer -= dt;
    if (car.skidTimer <= 0) {
      car.skidTimer = 0.03;
      world.particles.skid(nx - ca * 8, ny - sa * 8, car.angle);
      world.particles.skid(nx - ca * 8 + Math.cos(car.angle + Math.PI / 2) * 6,
                            ny - sa * 8 + Math.sin(car.angle + Math.PI / 2) * 6, car.angle);
    }
  }

  // Building collision — sample tile ahead of each corner
  const hw = t.w / 2, hh = t.h / 2;
  let hit = false;
  for (const [ox, oy] of [[hw, hh], [hw, -hh], [-hw, hh], [-hw, -hh]]) {
    const px = nx + ox * ca - oy * sa;
    const py = ny + ox * sa + oy * ca;
    if (world && !world.city.isWalkable(Math.floor(px / TILE), Math.floor(py / TILE))) {
      hit = true;
      break;
    }
  }
  if (hit) {
    const impact = Math.abs(car.speed);
    if (impact > 50 && world) {
      world.camera.kick(Math.min(6, impact / 30));
      car.hp -= impact / 8;
      audio.crash();
      world.particles.sparks(nx + ca * hw, ny + sa * hw);
      if (car.hp <= 0) destroyCar(car, world);
    }
    car.speed *= -0.3;
    car.driftLat = 0;
  } else {
    car.x = nx; car.y = ny;
  }

  // World bounds
  car.x = clamp(car.x, 8, 100 * TILE - 8);
  car.y = clamp(car.y, 8, 100 * TILE - 8);

  // Burn & explode when hp low
  if (car.hp < 25 && !car.dead) {
    car.burnTimer += dt;
    if (world && Math.random() < dt * 6) world.particles.smoke(car.x, car.y);
    if (car.burnTimer > 6) destroyCar(car, world);
  }
}

export function destroyCar(car, world) {
  if (car.dead) return;
  car.dead = true;
  car.hp = 0;
  car.burnTimer = 4;
  audio.explosion();
  world.particles.explosion(car.x, car.y);
  world.camera.kick(14);
  // Splash damage to nearby actors
  for (const p of world.peds.list) {
    if (dist(p.x, p.y, car.x, car.y) < 60) world.onPedKilled(p, 'explosion');
  }
  if (world.player.car === car) world.onPlayerCarDestroyed();
  else if (dist(world.player.x, world.player.y, car.x, car.y) < 60) world.hurtPlayer(45);
}

function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }

// Radius for "press E" interactions.
export function carEntryRadius(car, px, py) {
  return dist(px, py, car.x, car.y) < car.type.w * 0.6 + 22;
}

export function drawCarShape(ctx, car, sunAngle) {
  const t = car.type;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // fake shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  drawBody(ctx, t, 3, 4, 'rgba(0,0,0,0.3)');

  // body
  drawBody(ctx, t, 0, 0, car.dead ? '#26262a' : car.color);
  if (car.dead && car.burnTimer > 0) {
    ctx.fillStyle = 'rgba(255,110,30,0.5)';
    ctx.fillRect(-t.w / 2 + 4, -t.h / 2 + 3, t.w - 8, t.h - 6);
  }
  // windshield
  ctx.fillStyle = car.dead ? '#333' : '#223344cc';
  ctx.fillRect(t.w * 0.08, -t.h / 2 + 3, t.w * 0.22, t.h - 6);
  // rear window
  ctx.fillRect(-t.w * 0.42, -t.h / 2 + 4, t.w * 0.14, t.h - 8);
  // roof highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-t.w * 0.24, -t.h / 2 + 3, t.w * 0.3, t.h - 6);

  if (t.police) {
    const lightOn = Math.floor(performance.now() / 250) % 2 === 0;
    ctx.fillStyle = lightOn ? '#ff2222' : '#3a0000';
    ctx.fillRect(-2, -t.h / 2 - 2, 5, 4);
    ctx.fillStyle = lightOn ? '#3a0000' : '#2244ff';
    ctx.fillRect(3, -t.h / 2 - 2, 5, 4);
    // side stripe
    ctx.fillStyle = '#2244aa';
    ctx.fillRect(-t.w / 2, -t.h / 2 + 1, t.w, 2);
  }
  if (t.taxi) {
    ctx.fillStyle = '#111';
    ctx.fillRect(-4, -t.h / 2 - 2, 8, 4);
  }
  // damage scratches
  if (car.hp < car.type.hp * 0.5) {
    ctx.strokeStyle = 'rgba(30,30,30,0.6)';
    ctx.beginPath();
    ctx.moveTo(-t.w * 0.3, -t.h * 0.2); ctx.lineTo(0, t.h * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBody(ctx, t, ox, oy, color) {
  const r = 4;
  const x = -t.w / 2 + ox, y = -t.h / 2 + oy, w = t.w, h = t.h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

export const VEHICLE_EXPORT_TAU = TAU; // keep utils import used
export const VEHICLE_EMPTY = T.EMPTY;
