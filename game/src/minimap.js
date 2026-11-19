// Rotating circular minimap with mission, police, traffic and objective blips.

import { CONFIG } from './config.js';

export class Minimap {
  constructor() {
    this.radius = CONFIG.minimap.radius;
    this.centerX = 112;
    this.centerY = 112;
    this.scale = this.radius / (CONFIG.minimap.view / 2);
  }

  layout(w, h) {
    this.centerX = 18 + this.radius;
    this.centerY = h - 18 - this.radius;
  }

  draw(ctx, game, w, h) {
    this.layout(w, h);
    const p = game.player;
    const heading = p.vehicle ? p.vehicle.angle : p.angle;
    const rotate = game.settings.rotateMinimap !== false;
    const rot = rotate ? -heading - Math.PI / 2 : 0;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#1d2a2e';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-p.x, -p.y);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(game.city.minimapCanvas, 0, 0, game.city.size, game.city.size);

    const blip = (x, y, color, size = 5) => {
      const s = size / this.scale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const b of game.missions.blips()) {
      const color = b.kind === 'target' ? '#e8564a' : b.kind === 'vehicle' ? '#78dcff' : b.kind === 'package' ? '#f4c84a' : '#f4c84a';
      blip(b.x, b.y, color, b.kind === 'mission' || b.kind === 'objective' ? 7 : 4);
    }
    for (const v of game.vehicles.list) {
      if (v.dead) continue;
      if (v === p.vehicle) continue;
      blip(v.x, v.y, v.isPolice ? '#5d8cff' : 'rgba(235,235,225,0.55)', v.isPolice ? 5 : 2.6);
    }
    for (const o of game.police.officers) {
      if (!o.dead) blip(o.x, o.y, '#5d8cff', 3.4);
    }
    const flash = Math.sin(game.time * 8) > 0;
    for (const c of game.police.cruisers) {
      if (!c.dead) blip(c.x, c.y, flash ? '#ff5a5a' : '#5d8cff', 5.5);
    }
    ctx.restore();

    const g = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    if (!rotate) ctx.rotate(heading + Math.PI / 2);
    ctx.fillStyle = '#f4c84a';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,20,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(244,200,74,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
    ctx.stroke();
    if (!rotate) {
      ctx.fillStyle = '#f1ead8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', cx, cy - r + 2);
    }
    ctx.restore();
  }
}
