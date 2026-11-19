import { PLAYER, WEAPONS } from './config.js';
import { clamp } from './utils.js';
import { resolveCircle } from './city.js';
import { spawnBlood } from './particles.js';

export function createPlayer(x, y) {
  return {
    x, y, r: PLAYER.radius, angle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    armor: 0,
    money: PLAYER.startMoney,
    inVehicle: null,
    weapon: 'pistol',
    ammo: { pistol: 60, smg: 0, shotgun: 0 },
    fireTimer: 0,
    meleeTimer: 0,
    hurtTimer: 0,
    walkPhase: 0,
    dead: false,
    kills: 0
  };
}

export function currentWeapon(player) {
  return WEAPONS[player.weapon] || WEAPONS.fists;
}

export function updatePlayer(game, dt) {
  const p = game.player;
  p.fireTimer = Math.max(0, p.fireTimer - dt);
  p.meleeTimer = Math.max(0, p.meleeTimer - dt);
  p.hurtTimer = Math.max(0, p.hurtTimer - dt);

  if (p.dead) return;

  if (p.inVehicle) {
    const v = p.inVehicle;
    p.x = v.x;
    p.y = v.y;
    p.angle = v.angle;
    return;
  }

  const keys = game.input.keys;
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;

  const len = Math.hypot(dx, dy);
  const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (len > 0) {
    dx /= len;
    dy /= len;
    const speed = sprinting ? PLAYER.sprint : PLAYER.walk;
    const res = resolveCircle(game.city, p.x + dx * speed * dt, p.y + dy * speed * dt, p.r);
    p.x = res.x;
    p.y = res.y;
    p.walkPhase += dt * (sprinting ? 16 : 10);
  } else {
    p.walkPhase += dt * 2;
  }

  const m = game.input.mouse;
  p.angle = Math.atan2(m.worldY - p.y, m.worldX - p.x);
}

export function damagePlayer(game, amount) {
  const p = game.player;
  if (p.dead || game.state !== 'playing') return;
  let dmg = amount;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, dmg * 0.62);
    p.armor -= absorbed;
    dmg -= absorbed;
  }
  p.health -= dmg;
  p.hurtTimer = 0.45;
  spawnBlood(game.particles, p.x, p.y, Math.random() * Math.PI * 2, 4);
  if (game.audio) game.audio.hurt();
  if (game.settings.shake) game.camera.shake = Math.min(10, (game.camera.shake || 0) + 4);
  if (p.health <= 0) {
    p.health = 0;
    p.dead = true;
    if (p.inVehicle) {
      p.inVehicle.driver = null;
      p.inVehicle = null;
    }
    game.state = 'dead';
    game.deadAt = game.time;
    if (game.audio) game.audio.death();
  }
}

export function healPlayer(game, amount) {
  const p = game.player;
  p.health = clamp(p.health + amount, 0, PLAYER.maxHealth);
}

export function addArmor(game, amount) {
  const p = game.player;
  p.armor = clamp(p.armor + amount, 0, PLAYER.maxArmor);
}

export function giveWeapon(game, id, amount) {
  const p = game.player;
  if (!p.ammo[id] && p.ammo[id] !== 0) p.ammo[id] = 0;
  p.ammo[id] += amount;
  const spec = WEAPONS[id];
  if (spec && spec.maxAmmo) p.ammo[id] = Math.min(p.ammo[id], spec.maxAmmo);
  p.weapon = id;
}

export function respawnPlayer(game) {
  const p = game.player;
  p.dead = false;
  p.health = PLAYER.maxHealth;
  p.armor = 0;
  p.x = 2 * 400 + 40;
  p.y = 2 * 400 + 120;
  p.inVehicle = null;
  p.money = Math.max(0, p.money - 100);
  game.wanted.points = 0;
  game.wanted.stars = 0;
  game.wanted.heat = 0;
  game.state = 'playing';
  game.camera.x = p.x;
  game.camera.y = p.y;
  if (game.mission && game.mission.active) {
    if (typeof game.onMissionFail === 'function') game.onMissionFail();
  }
}

export function drawPlayer(ctx, p, time) {
  if (p.dead) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(120,20,20,0.75)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(p.walkPhase) * 1.4;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  ctx.fillStyle = p.hurtTimer > 0 ? '#e86a6a' : '#3f7fc9';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 9 + bob * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0b48c';
  ctx.beginPath();
  ctx.arc(4, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(2, -7, 10, 4);
  const wpn = p.weapon;
  if (wpn !== 'fists') {
    ctx.fillStyle = '#1b1f25';
    ctx.fillRect(9, -2, wpn === 'shotgun' ? 16 : 11, 4);
  }
  ctx.restore();
  void time;
}
