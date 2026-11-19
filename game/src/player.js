// player.js — the protagonist "Vic Solaro": on-foot movement (WASD, sprint),
// mouse aiming, shooting & melee, health/armor, vehicle enter/exit (carjack).

import { TILE, clamp, TAU } from './utils.js';
import { holding, pressed, mouse } from './input.js';
import { carEntryRadius } from './vehicles.js';
import { audio } from './audio.js';

export const WEAPONS = {
  fists:   { id: 'fists',   name: 'Fists',      melee: true, damage: 8,  range: 22, cooldown: 0.4 },
  pistol: { id: 'pistol',  name: 'Pistol',     damage: 14, cooldown: 0.35, spread: 0.05, speed: 700, pellets: 1 },
  smg:     { id: 'smg',    name: 'SMG "Chatter"', damage: 9, cooldown: 0.09, spread: 0.14, speed: 760, pellets: 1 },
};

export function makePlayer(x, y) {
  return {
    x, y, angle: 0,
    vx: 0, vy: 0,
    radius: 9,
    health: 100, maxHealth: 100,
    armor: 0, maxArmor: 100,
    money: 250,
    weapon: 'fists',
    ammo: { pistol: 0, smg: 0 },
    fireCooldown: 0,
    walkPhase: 0,
    car: null,          // current vehicle or null
    bustedTimer: 0,
    invuln: 0,
    punchAnim: 0,
    name: 'Vic Solaro',
  };
}

export function giveWeapon(p, id, ammo) {
  p.ammo[id] = (p.ammo[id] || 0) + ammo;
  if (p.weapon === 'fists' || p.ammo[p.weapon] <= 0) p.weapon = id;
  audio.pickup();
}

export function updatePlayer(p, world, dt) {
  p.invuln = Math.max(0, p.invuln - dt);
  p.fireCooldown -= dt;
  p.punchAnim = Math.max(0, p.punchAnim - dt);

  if (p.car) {
    driveVehicle(p, world, dt);
    return;
  }
  onFoot(p, world, dt);
}

function onFoot(p, world, dt) {
  let mx = 0, my = 0;
  if (holding('w')) my -= 1;
  if (holding('s')) my += 1;
  if (holding('a')) mx -= 1;
  if (holding('d')) mx += 1;
  const sprint = holding('shift');
  const speed = sprint ? 190 : 120;
  const len = Math.hypot(mx, my) || 1;
  p.vx = (mx / len) * speed;
  p.vy = (my / len) * speed;
  if (mx === 0 && my === 0) { p.vx = 0; p.vy = 0; }

  // Aim at mouse
  p.angle = Math.atan2(mouse.wy - p.y, mouse.wx - p.x);

  // Move with collision (axis-separated against solid tiles)
  moveCollide(p, world, p.vx * dt, 0);
  moveCollide(p, world, 0, p.vy * dt);
  p.x = clamp(p.x, 8, world.size - 8);
  p.y = clamp(p.y, 8, world.size - 8);

  if (mx || my) p.walkPhase += dt * (sprint ? 14 : 9);

  // Enter vehicle
  if (pressed('e')) {
    const car = world.vehicles.find(c => carEntryRadius(c, p.x, p.y));
    if (car) world.enterVehicle(p, car);
  }

  // Weapons
  const wep = WEAPONS[p.weapon];
  if (mouse.down && p.fireCooldown <= 0) {
    if (wep.melee) {
      p.fireCooldown = wep.cooldown;
      p.punchAnim = 0.2;
      audio.punch();
      world.meleeHit(p.x, p.y, p.angle, wep.range, wep.damage);
    } else if ((p.ammo[p.weapon] || 0) > 0) {
      p.fireCooldown = wep.cooldown;
      p.ammo[p.weapon]--;
      world.fireBullet(p.x, p.y, p.angle + (Math.random() - 0.5) * wep.spread, wep.speed, wep.damage, 'player');
      audio.gunshot(p.weapon === 'smg');
      world.particles.muzzle(p.x + Math.cos(p.angle) * 12, p.y + Math.sin(p.angle) * 12, p.angle);
      world.onGunfire(p.x, p.y, 260);
      if (p.ammo[p.weapon] === 0) {
        world.toast('Out of ammo — switching to fists');
        p.weapon = 'fists';
      }
    }
  }

  // Weapon switching: Q cycles pistol/smg if owned
  if (pressed('q')) {
    const owned = ['fists', 'pistol', 'smg'].filter(w => w === 'fists' || (p.ammo[w] || 0) > 0);
    const i = owned.indexOf(p.weapon);
    p.weapon = owned[(i + 1) % owned.length];
    audio.click();
  }
}

function moveCollide(p, world, dx, dy) {
  const nx = p.x + dx, ny = p.y + dy;
  if (!world.city.solidAtWorld(nx + (dx > 0 ? p.radius : -p.radius) * 0.7, ny) &&
      !world.city.solidAtWorld(nx, ny + (dy > 0 ? p.radius : -p.radius) * 0.7)) {
    p.x = nx; p.y = ny;
  } else if (!world.city.solidAtWorld(nx, p.y)) {
    p.x = nx;
  } else if (!world.city.solidAtWorld(p.x, ny)) {
    p.y = ny;
  }
}

function driveVehicle(p, world, dt) {
  const car = p.car;
  const controls = {
    throttle: (holding('w') ? 1 : 0) + (holding('s') ? -0.7 : 0),
    steer: (holding('a') ? -1 : 0) + (holding('d') ? 1 : 0),
    brake: holding(' ') || holding('control'),
    handbrake: holding(' '),
  };
  if (pressed('e')) { world.exitVehicle(p); return; }
  if (pressed('f') || (pressed('h'))) { // horn
    if (car.hornCooldown <= 0) {
      car.hornCooldown = 0.5;
      audio.horn();
      world.onHorn(car.x, car.y, 180);
    }
  }
  car.hornCooldown -= dt;
  p.x = car.x; p.y = car.y; p.angle = car.angle;
}

// Render the on-foot player sprite.
export function drawPlayer(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(3, 5, 9, 7, 0, 0, TAU);
  ctx.fill();

  ctx.rotate(p.angle + Math.PI / 2);

  // legs (walk bob)
  const bob = Math.sin(p.walkPhase) * 3;
  ctx.fillStyle = '#2c3a55';
  ctx.fillRect(-5, 2, 4, 9 + bob * 0.2);
  ctx.fillRect(1, 2, 4, 9 - bob * 0.2);

  // torso — tropical shirt
  ctx.fillStyle = '#e0a63c';
  ctx.fillRect(-6, -6, 12, 10);
  ctx.fillStyle = '#b57a20';
  ctx.fillRect(-2, -6, 4, 10);

  // head
  ctx.fillStyle = '#d9a184';
  ctx.beginPath();
  ctx.arc(0, -8, 4.5, 0, TAU);
  ctx.fill();

  // gun arm
  const wep = WEAPONS[p.weapon];
  if (!wep.melee) {
    ctx.fillStyle = '#333';
    ctx.fillRect(2, -14, 3, 8);
    if (p.weapon === 'smg') ctx.fillRect(0, -14, 7, 4);
  } else if (p.punchAnim > 0) {
    ctx.fillStyle = '#d9a184';
    ctx.beginPath();
    ctx.arc(0, -16, 3.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export const PLAYER_TAU = TAU;
