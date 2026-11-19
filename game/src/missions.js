import { STORY, ENDING } from './story.js';
import { dist } from './utils.js';
import { randomSidewalkPoint } from './city.js';
import { spawnHostiles } from './peds.js';
import { addWanted } from './wanted.js';
import { createVehicle } from './vehicles.js';
import { healPlayer, addArmor, giveWeapon } from './player.js';
import { notify } from './combat.js';

export function createMissionState() {
  return {
    active: false,
    index: 0,
    step: 0,
    marker: null,
    stepHostiles: [],
    package: null,
    markerVehicle: null,
    timer: 0,
    titleTimer: 0,
    title: '',
    subtitle: '',
    objective: '',
    cooldown: 0,
    endingShown: false
  };
}

export function createPickups(game) {
  game.pickups = [];
  game.pickupTimer = 5;
  for (let i = 0; i < 24; i++) spawnPickup(game);
}

function spawnPickup(game) {
  const pt = randomSidewalkPoint(Math.random, game.player, 160);
  const roll = Math.random();
  let type;
  let id = null;
  let amount = 0;
  if (roll < 0.4) {
    type = 'health';
    amount = 25;
  } else if (roll < 0.62) {
    type = 'armor';
    amount = 25;
  } else {
    type = 'weapon';
    const r = Math.random();
    id = r < 0.45 ? 'pistol' : r < 0.78 ? 'smg' : 'shotgun';
    amount = id === 'pistol' ? 30 : id === 'smg' ? 60 : 12;
  }
  game.pickups.push({ x: pt.x, y: pt.y, type, id, amount, phase: Math.random() * 6.28 });
}

export function updatePickups(game, dt) {
  game.pickupTimer -= dt;
  if (game.pickupTimer <= 0 && game.pickups.length < 24) {
    game.pickupTimer = 7;
    spawnPickup(game);
  }
  const p = game.player;
  if (p.dead || p.inVehicle) return;
  for (let i = game.pickups.length - 1; i >= 0; i--) {
    const pk = game.pickups[i];
    if (dist(p.x, p.y, pk.x, pk.y) > 26) continue;
    if (pk.type === 'health') {
      healPlayer(game, pk.amount);
      notify(game, 'Health +' + pk.amount, '#7ee08a');
    } else if (pk.type === 'armor') {
      addArmor(game, pk.amount);
      notify(game, 'Armor +' + pk.amount, '#6fb8ff');
    } else {
      giveWeapon(game, pk.id, pk.amount);
      notify(game, (pk.id === 'smg' ? 'SMG' : pk.id === 'shotgun' ? 'Shotgun' : 'Pistol') + ' +' + pk.amount + ' rounds', '#f0c060');
    }
    if (game.audio) game.audio.pickup();
    game.pickups.splice(i, 1);
  }
}

export function startMission(game) {
  const m = game.mission;
  const def = STORY[m.index];
  if (!def) return;
  m.active = true;
  m.step = 0;
  m.title = def.title;
  m.subtitle = def.brief;
  m.titleTimer = 5.5;
  m.package = null;
  m.stepHostiles = [];
  m.markerVehicle = null;
  beginStep(game);
  if (game.audio) game.audio.mission();
  notify(game, 'Mission started: ' + def.title, '#ffe08a');
}

function beginStep(game) {
  const m = game.mission;
  const def = STORY[m.index];
  const step = def.steps[m.step];
  m.objective = step.text;
  m.marker = step.x != null ? { x: step.x, y: step.y } : null;
  m.package = null;
  m.stepHostiles = [];

  if (step.type === 'kill') {
    m.stepHostiles = spawnHostiles(game, step.x, step.y, step.count || 1, !!step.boss);
  } else if (step.type === 'collect') {
    m.package = { x: step.x, y: step.y };
  } else if (step.type === 'survive') {
    m.timer = step.time;
    addWanted(game, (step.stars || 1) * 26, 'mission heat');
  }
  if (step.car) {
    const v = createVehicle(step.car, step.x, step.y, Math.PI / 2);
    game.vehicles.push(v);
    m.markerVehicle = v;
  }
}

function completeMission(game) {
  const m = game.mission;
  const def = STORY[m.index];
  game.player.money += def.reward;
  m.active = false;
  m.marker = null;
  m.objective = '';
  m.package = null;
  m.markerVehicle = null;
  for (let i = 0; i < m.stepHostiles.length; i++) {
    const ped = m.stepHostiles[i];
    if (!ped.dead) {
      ped.hostile = false;
      ped.state = 'flee';
      ped.panic = 6;
    }
  }
  m.stepHostiles = [];
  m.index++;
  m.cooldown = 5;
  m.title = 'MISSION PASSED';
  m.subtitle = def.title + '  +$' + def.reward;
  m.titleTimer = 5;
  if (game.audio) game.audio.complete();
  notify(game, 'Mission passed: ' + def.title + '  +$' + def.reward, '#8ce09a');
}

export function failMission(game) {
  const m = game.mission;
  if (!m.active) return;
  const def = STORY[m.index];
  m.active = false;
  m.marker = null;
  m.objective = '';
  m.package = null;
  m.markerVehicle = null;
  m.cooldown = 3;
  m.title = 'MISSION FAILED';
  m.subtitle = def ? def.title : '';
  m.titleTimer = 4;
  for (let i = 0; i < m.stepHostiles.length; i++) {
    const ped = m.stepHostiles[i];
    if (!ped.dead) {
      ped.hostile = false;
      ped.state = 'flee';
      ped.panic = 5;
    }
  }
  m.stepHostiles = [];
  notify(game, 'Mission failed', '#e86a6a');
}

function updateMission(game, dt) {
  const m = game.mission;
  const def = STORY[m.index];
  if (!def) return;
  const step = def.steps[m.step];
  if (!step) {
    completeMission(game);
    return;
  }
  const p = game.player;
  let done = false;

  if (step.type === 'goto') {
    done = dist(p.x, p.y, step.x, step.y) < (step.r || 60);
  } else if (step.type === 'drive') {
    done = !!p.inVehicle && dist(p.x, p.y, step.x, step.y) < (step.r || 72);
  } else if (step.type === 'kill') {
    m.stepHostiles = m.stepHostiles.filter((h) => !h.dead);
    done = m.stepHostiles.length === 0;
  } else if (step.type === 'collect') {
    if (m.package && dist(p.x, p.y, m.package.x, m.package.y) < 30) {
      m.package = null;
      if (game.audio) game.audio.pickup();
      notify(game, 'Package secured', '#ffe08a');
    }
    done = !m.package;
  } else if (step.type === 'survive') {
    m.timer -= dt;
    if (m.timer <= 0) done = true;
  } else if (step.type === 'escape') {
    done = game.wanted.points <= 0;
  }

  if (done) {
    m.step++;
    if (m.step >= def.steps.length) completeMission(game);
    else beginStep(game);
  }
}

export function updateMissions(game, dt) {
  updatePickups(game, dt);
  const m = game.mission;
  m.titleTimer = Math.max(0, m.titleTimer - dt);

  if (m.active) {
    updateMission(game, dt);
    return;
  }

  m.cooldown = Math.max(0, m.cooldown - dt);
  if (m.index < STORY.length && m.cooldown <= 0) {
    const def = STORY[m.index];
    m.marker = { x: def.start.x, y: def.start.y };
    if (dist(game.player.x, game.player.y, def.start.x, def.start.y) < 64) startMission(game);
  } else {
    m.marker = null;
  }

  if (m.index >= STORY.length && m.cooldown <= 0 && !m.endingShown) {
    m.endingShown = true;
    m.title = ENDING.title;
    m.subtitle = ENDING.text;
    m.titleTimer = 8;
    if (game.audio) game.audio.complete();
  }
}

export function drawPickups(ctx, game, time) {
  for (let i = 0; i < game.pickups.length; i++) {
    const pk = game.pickups[i];
    const bob = Math.sin(time * 2.4 + pk.phase) * 3;
    const color = pk.type === 'health' ? '#5ad46a' : pk.type === 'armor' ? '#4f9fe8' : '#e8b53a';
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 9 - bob, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    if (pk.type === 'health') {
      ctx.fillRect(-3, -9, 6, 18);
      ctx.fillRect(-9, -3, 18, 6);
    } else if (pk.type === 'armor') {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, -5);
      ctx.lineTo(7, 6);
      ctx.lineTo(0, 11);
      ctx.lineTo(-7, 6);
      ctx.lineTo(-9, -5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = '#1b1f25';
      ctx.fillRect(-4, -2, 9, 4);
    }
    ctx.restore();
  }
}

export function drawMissionMarker(ctx, marker, time) {
  if (!marker) return;
  const pulse = 0.5 + Math.sin(time * 3) * 0.5;
  ctx.save();
  ctx.translate(marker.x, marker.y);
  ctx.strokeStyle = 'rgba(255,215,90,' + (0.35 + pulse * 0.4) + ')';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 34 + pulse * 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,215,90,0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,215,90,' + (0.2 + pulse * 0.2) + ')';
  ctx.fillRect(-2, -120, 4, 100);
  ctx.fillStyle = '#ffd75a';
  ctx.beginPath();
  ctx.moveTo(0, -130);
  ctx.lineTo(12, -112);
  ctx.lineTo(-12, -112);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPackage(ctx, pkg, time) {
  if (!pkg) return;
  const bob = Math.sin(time * 3) * 3;
  ctx.save();
  ctx.translate(pkg.x, pkg.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 10 - bob, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(-10, -10, 20, 20);
  ctx.strokeStyle = '#8a6a28';
  ctx.lineWidth = 2;
  ctx.strokeRect(-10, -10, 20, 20);
  ctx.fillStyle = '#8a6a28';
  ctx.fillRect(-2, -10, 4, 20);
  ctx.restore();
}
