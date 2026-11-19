import { PLAYER, WEAPONS } from './config.js';
import { clamp, fmtMoney, roundRect } from './utils.js';
import { drawMinimap } from './minimap.js';

function star(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ffd24a';
    ctx.fill();
  }
  ctx.strokeStyle = filled ? '#ffe9a0' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, ratio, color, bg) {
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const fw = Math.max(0, w * clamp(ratio, 0, 1));
  if (fw > 1) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, fw, h, Math.min(h / 2, fw / 2));
    ctx.fill();
  }
}

export function drawHUD(game) {
  const ctx = game.ctx;
  const w = game.canvas.width;
  const h = game.canvas.height;
  const p = game.player;

  if (p.health < 35 && !p.dead) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.78);
    grad.addColorStop(0, 'rgba(160,0,0,0)');
    grad.addColorStop(1, 'rgba(150,0,0,' + (0.25 + Math.sin(game.time * 5) * 0.1) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.save();
  ctx.fillStyle = 'rgba(12,15,20,0.72)';
  roundRect(ctx, 16, 16, 238, 96, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#8f97a3';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HEALTH', 28, 38);
  bar(ctx, 82, 29, 158, 11, p.health / PLAYER.maxHealth, '#d94f4f', 'rgba(255,255,255,0.1)');

  ctx.fillStyle = '#8f97a3';
  ctx.fillText('ARMOR', 28, 58);
  bar(ctx, 82, 49, 158, 11, p.armor / PLAYER.maxArmor, '#4f8fe8', 'rgba(255,255,255,0.1)');

  ctx.fillStyle = '#8ce09a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(fmtMoney(p.money), 28, 94);
  ctx.restore();

  const stars = game.wanted.stars;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const sx = w - 28 - (4 - i) * 30;
    star(ctx, sx, 40, 12, i < stars);
  }
  if (stars > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('WANTED', w - 28, 66);
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(12,15,20,0.72)';
  roundRect(ctx, 16, h - 92, 218, 76, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.stroke();
  const spec = WEAPONS[p.weapon] || WEAPONS.fists;
  ctx.fillStyle = '#f0c060';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(spec.name.toUpperCase(), 30, h - 58);
  ctx.fillStyle = '#c8ced8';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const ammo = spec.melee ? '∞' : String(p.ammo[p.weapon] || 0);
  ctx.fillText(ammo, 30, h - 28);
  ctx.fillStyle = '#6f7783';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(spec.melee ? 'MELEE' : 'ROUNDS', 30 + ctx.measureText(ammo).width + 12, h - 28);
  ctx.restore();

  if (game.mission.active && game.mission.objective) {
    ctx.save();
    ctx.font = 'bold 15px system-ui, sans-serif';
    const text = game.mission.objective;
    const tw = ctx.measureText(text).width;
    const bw = Math.min(w - 80, tw + 46);
    const bx = (w - bw) / 2;
    ctx.fillStyle = 'rgba(12,15,20,0.76)';
    roundRect(ctx, bx, 18, bw, 42, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,90,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffd75a';
    ctx.textAlign = 'center';
    ctx.fillText('OBJECTIVE', w / 2, 34);
    ctx.fillStyle = '#f2eee2';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(text, w / 2, 51);
    ctx.restore();
  }

  const marker = game.mission.marker;
  if (marker) {
    const cam = game.camera;
    const sx = marker.x - (cam.x - w / 2);
    const sy = marker.y - (cam.y - h / 2);
    const margin = 54;
    if (sx < margin || sx > w - margin || sy < margin || sy > h - margin) {
      const a = Math.atan2(sy - h / 2, sx - w / 2);
      const ax = clamp(sx, margin, w - margin);
      const ay = clamp(sy, margin, h - margin);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,215,90,0.92)';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-8, 8);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  if (game.mission.titleTimer > 0) {
    const t = game.mission.titleTimer;
    const alpha = Math.min(1, t * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,10,14,0.62)';
    ctx.fillRect(0, h * 0.32, w, 128);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd75a';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(game.mission.title, w / 2, h * 0.32 + 58);
    ctx.fillStyle = '#e6e2d6';
    ctx.font = '15px system-ui, sans-serif';
    const sub = game.mission.subtitle || '';
    const maxW = w - 120;
    if (ctx.measureText(sub).width > maxW) {
      const words = sub.split(' ');
      let line = '';
      let ly = h * 0.32 + 86;
      for (let i = 0; i < words.length; i++) {
        const test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, w / 2, ly);
          ly += 20;
          line = words[i];
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, w / 2, ly);
    } else {
      ctx.fillText(sub, w / 2, h * 0.32 + 88);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  for (let i = 0; i < game.messages.length; i++) {
    const msg = game.messages[i];
    const a = Math.min(1, msg.life / 0.6);
    ctx.globalAlpha = a;
    ctx.font = 'bold 14px system-ui, sans-serif';
    const tw = ctx.measureText(msg.text).width;
    const bx = (w - tw) / 2 - 14;
    const by = h - 130 - i * 30;
    ctx.fillStyle = 'rgba(10,12,16,0.7)';
    roundRect(ctx, bx, by - 17, tw + 28, 26, 6);
    ctx.fill();
    ctx.fillStyle = msg.color;
    ctx.fillText(msg.text, w / 2, by);
  }
  ctx.restore();

  if (game.settings.minimap) {
    const size = 168;
    drawMinimap(game, ctx, w - size - 18, h - size - 18, size);
  }

  if (game.state === 'playing' && !game.input.mouse.down) {
    const mx = game.input.mouse.x;
    const my = game.input.mouse.y;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx - 9, my);
    ctx.lineTo(mx - 3, my);
    ctx.moveTo(mx + 3, my);
    ctx.lineTo(mx + 9, my);
    ctx.moveTo(mx, my - 9);
    ctx.lineTo(mx, my - 3);
    ctx.moveTo(mx, my + 3);
    ctx.lineTo(mx, my + 9);
    ctx.stroke();
    ctx.restore();
  }
}
