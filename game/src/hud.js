// hud.js — HUD: health/armor bars + wanted stars + cash + weapon (top-left),
// mission objective text (center-bottom), mission timer, district name,
// and notification toasts (DOM-based).

import { WEAPONS } from './player.js';
import { MISSION_DEFS } from './story.js';
import { drawMinimap } from './minimap.js';
import { currentDistrict } from './render.js';

let toastRoot = null;

export function initHud() {
  toastRoot = document.getElementById('toasts');
}

export function toast(msg, ms = 3200) {
  if (!toastRoot) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastRoot.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

export function drawHud(ctx, world, W, H) {
  const p = world.player;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'top';

  // ---- top-left panel ----
  const x = 16, y = 14;

  // Health
  ctx.fillStyle = 'rgba(8,10,16,0.6)';
  roundRect(ctx, x, y, 220, 74, 6);
  ctx.fill();

  ctx.fillStyle = '#cfd6de';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('HEALTH', x + 10, y + 8);
  ctx.fillStyle = '#1a1f28';
  ctx.fillRect(x + 70, y + 8, 140, 10);
  ctx.fillStyle = p.health > 30 ? '#4dde77' : '#e04a3a';
  ctx.fillRect(x + 70, y + 8, 140 * Math.max(0, p.health) / p.maxHealth, 10);

  ctx.fillStyle = '#cfd6de';
  ctx.fillText('ARMOR', x + 10, y + 24);
  ctx.fillStyle = '#1a1f28';
  ctx.fillRect(x + 70, y + 24, 140, 10);
  ctx.fillStyle = '#5db8e8';
  ctx.fillRect(x + 70, y + 24, 140 * Math.max(0, p.armor) / p.maxArmor, 10);

  // cash
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`$${p.money}`, x + 10, y + 40);

  // weapon
  const wep = WEAPONS[p.weapon];
  ctx.fillStyle = '#cfd6de';
  ctx.font = 'bold 12px sans-serif';
  const ammoTxt = wep.melee ? '' : ` — ${p.ammo[p.weapon] || 0}`;
  ctx.fillText(wep.name + ammoTxt, x + 100, y + 42);

  // ---- wanted stars ----
  const stars = world.wanted.stars;
  for (let i = 0; i < 5; i++) {
    const sx = x + 8 + i * 24, sy = y + 60;
    drawStar(ctx, sx, sy, 9, i < stars ? '#ffd166' : 'rgba(255,255,255,0.16)');
  }

  // ---- mission objective (center-bottom) ----
  const a = world.missions.active;
  if (a) {
    const text = a.def.objective;
    ctx.font = 'bold 14px sans-serif';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(8,10,16,0.6)';
    roundRect(ctx, W / 2 - w / 2 - 14, H - 66, w + 28, 30, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H - 59);

    if (world.missionTimer >= 0) {
      ctx.fillStyle = world.missionTimer < 15 ? '#ff5544' : '#ffd166';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`${Math.ceil(world.missionTimer)}s`, W / 2, H - 100);
    }
    ctx.textAlign = 'left';
  } else {
    // next mission hint
    const next = MISSION_DEFS[world.missions.index];
    if (next) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center';
      ctx.fillText(`Next job available: “${next.title}” — pick up the phone (M)`, W / 2, H - 40);
      ctx.textAlign = 'left';
    }
  }

  // ---- district label (bottom-right) ----
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.textAlign = 'right';
  ctx.fillText(currentDistrict(world), W - 16, H - 30);
  ctx.textAlign = 'left';

  // ---- minimap ----
  drawMinimap(ctx, world, W, H);

  // ---- crosshair when armed on foot ----
  if (!p.car && !WEAPONS[p.weapon].melee) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    const r = 7;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, r, 0, Math.PI * 2);
    ctx.moveTo(mouseX - r - 4, mouseY); ctx.lineTo(mouseX - r + 2, mouseY);
    ctx.moveTo(mouseX + r - 2, mouseY); ctx.lineTo(mouseX + r + 4, mouseY);
    ctx.stroke();
  }

  ctx.restore();
}

let mouseX = 0, mouseY = 0;
export function setCrosshairPos(x, y) { mouseX = x; mouseY = y; }

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
