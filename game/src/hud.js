// Heads-up display: health, armour, money, weapon, wanted stars, calls and notifications.

import { WEAPONS, COLORS } from './config.js';
import { clamp, formatMoney, roundRectPath } from './utils.js';

export class HUD {
  constructor() {
    this.notifications = [];
    this.call = null;
    this.callTimer = 0;
    this.callLine = 0;
    this.callLineTimer = 0;
    this.pulse = 0;
  }

  notify(text, kind = 'info') {
    this.notifications.push({ text, kind, life: 4.4, max: 4.4 });
    if (this.notifications.length > 5) this.notifications.shift();
  }

  setCall(caller, lines, duration = 9) {
    this.call = { caller, lines: lines.slice() };
    this.callTimer = duration;
    this.callLine = 0;
    this.callLineTimer = 2.6;
  }

  update(dt) {
    this.pulse += dt;
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      this.notifications[i].life -= dt;
      if (this.notifications[i].life <= 0) this.notifications.splice(i, 1);
    }
    if (this.call) {
      this.callTimer -= dt;
      this.callLineTimer -= dt;
      if (this.callLineTimer <= 0 && this.callLine < this.call.lines.length - 1) {
        this.callLine++;
        this.callLineTimer = 2.6;
      }
      if (this.callTimer <= 0) this.call = null;
    }
  }

  draw(ctx, game, w, h) {
    if (game.state === 'title') return;
    const p = game.player;
    ctx.save();
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(14,18,26,0.62)';
    roundRectPath(ctx, w - 250, 18, 232, 96, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.money;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatMoney(p.money), w - 32, 28);
    const weapon = WEAPONS[p.weapon];
    ctx.fillStyle = '#e9e3d2';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(weapon.name, w - 32, 64);
    ctx.fillStyle = 'rgba(233,227,210,0.7)';
    ctx.font = '13px system-ui, sans-serif';
    const ammo = weapon.melee ? 'ready' : p.ammo[p.weapon] + ' rounds';
    ctx.fillText(ammo, w - 32, 84);
    this.drawStars(ctx, w - 32, 122, game.wanted.level);

    const mm = game.minimap;
    const barsX = mm.centerX + mm.radius + 18;
    const barsY = h - 76;
    this.bar(ctx, barsX, barsY, 196, 12, p.health / 100, '#d94b45', 'HEALTH');
    this.bar(ctx, barsX, barsY + 24, 196, 10, p.armour / 100, '#4f8fd8', 'ARMOUR');

    const obj = game.missions.objectiveText();
    const timer = game.missions.timerText();
    const progress = game.missions.progressText();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(14,18,26,0.6)';
    roundRectPath(ctx, 18, 18, 360, timer || progress ? 84 : 64, 10);
    ctx.fill();
    ctx.fillStyle = '#f4c84a';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('CURRENT JOB', 34, 30);
    ctx.fillStyle = '#f1ead8';
    ctx.font = '600 16px system-ui, sans-serif';
    this.wrap(ctx, obj, 34, 48, 326, 19, 2);
    if (timer) {
      ctx.fillStyle = timer && Number(timer.split(':')[0]) < 1 ? '#e8564a' : '#f4c84a';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(timer, 34, 86);
    }
    if (progress) {
      ctx.fillStyle = '#d9d2bf';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(progress, timer ? 96 : 34, 87);
    }

    if (p.vehicle && !p.vehicle.dead) {
      const mph = Math.round(Math.abs(p.vehicle.speed) * 0.13);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(14,18,26,0.62)';
      roundRectPath(ctx, w - 172, h - 98, 154, 72, 10);
      ctx.fill();
      ctx.fillStyle = '#f4c84a';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText(String(mph), w - 62, h - 92);
      ctx.fillStyle = 'rgba(233,227,210,0.7)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('MPH', w - 30, h - 84);
      ctx.fillStyle = '#d9d2bf';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(p.vehicle.name, w - 30, h - 48);
      ctx.textAlign = 'left';
    }

    if (game.hint && game.state === 'playing') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(14,18,26,0.6)';
      roundRectPath(ctx, w / 2 - 150, h - 48, 300, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#e9e3d2';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(game.hint, w / 2, h - 40);
      ctx.textAlign = 'left';
    }

    if (this.call) {
      const width = Math.min(470, w - 36);
      const x = w / 2 - width / 2;
      const y = w >= 1180 ? 22 : 132;
      ctx.fillStyle = 'rgba(14,18,26,0.78)';
      roundRectPath(ctx, x, y, width, 92, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,200,74,0.6)';
      ctx.lineWidth = 2;
      roundRectPath(ctx, x, y, width, 92, 12);
      ctx.stroke();
      ctx.fillStyle = '#f4c84a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('CALL  ·  ' + this.call.caller.toUpperCase(), x + 18, y + 12);
      ctx.fillStyle = '#f1ead8';
      ctx.font = '15px system-ui, sans-serif';
      this.wrap(ctx, this.call.lines[this.callLine] || '', x + 18, y + 36, width - 36, 20, 2);
      const dots = this.call.lines.length;
      for (let i = 0; i < dots; i++) {
        ctx.fillStyle = i === this.callLine ? '#f4c84a' : 'rgba(244,200,74,0.3)';
        ctx.beginPath();
        ctx.arc(x + width - 22 - i * 12, y + 74, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let ny = h - 132;
    ctx.textAlign = 'center';
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const n = this.notifications[i];
      const a = clamp(n.life / 0.6, 0, 1) * clamp((n.max - n.life) / 0.3, 0, 1);
      ctx.globalAlpha = a;
      const colors = { mission: '#f4c84a', crime: '#e8564a', danger: '#e8564a', health: '#7fc46a', money: '#8fd47a', ammo: '#d9c27a', weapon: '#c9c9c9', info: '#e9e3d2' };
      const tw = ctx.measureText(n.text).width + 34;
      ctx.fillStyle = 'rgba(14,18,26,0.72)';
      roundRectPath(ctx, w / 2 - tw / 2, ny - 6, tw, 26, 7);
      ctx.fill();
      ctx.fillStyle = colors[n.kind] || '#e9e3d2';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(n.text, w / 2, ny);
      ny -= 31;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    if (p.dead) {
      ctx.fillStyle = 'rgba(120,10,10,0.45)';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e6d2';
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.fillText('WASTED', w / 2, h / 2 - 40);
      ctx.fillStyle = 'rgba(240,230,210,0.7)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('The city spits you back out in a moment', w / 2, h / 2 + 38);
      ctx.textAlign = 'left';
    }

    if (game.state === 'playing' && !p.dead) this.crosshair(ctx, game);
    ctx.restore();
  }

  bar(ctx, x, y, w, h, value, color, label) {
    ctx.fillStyle = 'rgba(14,18,26,0.65)';
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = color;
    if (value > 0) {
      roundRectPath(ctx, x + 2, y + 2, Math.max(2, (w - 4) * clamp(value, 0, 1)), h - 4, (h - 4) / 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 12);
  }

  drawStars(ctx, right, y, level) {
    for (let i = 0; i < 5; i++) {
      const x = right - 15 - i * 24;
      const on = i < level;
      const flash = on && level >= 4 && Math.sin(this.pulse * 8) > 0;
      ctx.fillStyle = on ? (flash ? '#fff2b0' : '#f4c84a') : 'rgba(255,255,255,0.14)';
      this.star(ctx, x, y, 9, 4.2);
    }
  }

  star(ctx, cx, cy, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  crosshair(ctx, game) {
    const m = game.input.mouse;
    const weapon = WEAPONS[game.player.weapon];
    ctx.strokeStyle = weapon.melee ? 'rgba(255,255,255,0.7)' : 'rgba(255,220,150,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,150,0.95)';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,150,0.5)';
    ctx.beginPath();
    ctx.moveTo(m.x - 14, m.y);
    ctx.lineTo(m.x - 6, m.y);
    ctx.moveTo(m.x + 6, m.y);
    ctx.lineTo(m.x + 14, m.y);
    ctx.moveTo(m.x, m.y - 14);
    ctx.lineTo(m.x, m.y - 6);
    ctx.moveTo(m.x, m.y + 6);
    ctx.lineTo(m.x, m.y + 14);
    ctx.stroke();
  }

  wrap(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text).split(' ');
    let line = '';
    let lines = 0;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y + lines * lineHeight);
        line = word;
        lines++;
        if (lines >= maxLines - 1) break;
      } else {
        line = test;
      }
    }
    if (lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
  }
}
