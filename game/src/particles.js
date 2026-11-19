// Pooled particles: muzzle flashes, sparks, blood, smoke, water spray and explosions.

import { rand, pick, clamp } from './utils.js';

const MAX = 700;

export class ParticleSystem {
  constructor() {
    this.list = [];
  }

  add(p) {
    p.maxLife = p.life;
    this.list.push(p);
    if (this.list.length > MAX) this.list.splice(0, this.list.length - MAX);
  }

  muzzle(x, y, angle) {
    this.add({ type: 'flash', x, y, vx: 0, vy: 0, life: 0.08, size: 13, color: '#ffe9a3' });
    for (let i = 0; i < 4; i++) {
      const a = angle + rand(-0.35, 0.35);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * rand(120, 330), vy: Math.sin(a) * rand(120, 330), life: rand(0.08, 0.2), size: rand(1, 2.4), color: '#ffcf6a' });
    }
    this.add({ type: 'smoke', x, y, vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 20, life: rand(0.3, 0.6), size: 5, color: 'rgba(220,220,210,0.35)' });
  }

  sparks(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(80, 320);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.12, 0.35), size: rand(1, 2.5), color: pick(['#ffd36a', '#ffb04a', '#fff0b0']) });
    }
  }

  blood(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(30, 170);
      this.add({ type: 'blood', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.9), size: rand(1.4, 3.4), color: pick(['#9d1f24', '#7d171c', '#c32b2e']) });
    }
  }

  smoke(x, y) {
    this.add({ type: 'smoke', x, y, vx: rand(-14, 14), vy: rand(-24, -6), life: rand(0.8, 1.8), size: rand(5, 11), color: 'rgba(80,84,88,0.5)' });
  }

  dust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      this.add({ type: 'dust', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-30, 30), life: rand(0.3, 0.7), size: rand(3, 7), color: 'rgba(210,196,160,0.4)' });
    }
  }

  splash(x, y) {
    for (let i = 0; i < 6; i++) {
      this.add({ type: 'splash', x, y, vx: rand(-80, 80), vy: rand(-90, -20), life: rand(0.3, 0.7), size: rand(1.5, 3.5), color: 'rgba(190,235,245,0.8)' });
    }
  }

  explosion(x, y) {
    this.add({ type: 'flash', x, y, vx: 0, vy: 0, life: 0.22, size: 55, color: '#fff3c4' });
    this.add({ type: 'ring', x, y, vx: 0, vy: 0, life: 0.5, size: 20, grow: 190, color: 'rgba(255,190,90,0.8)' });
    for (let i = 0; i < 22; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(100, 420);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.8), size: rand(1.5, 4), color: pick(['#ffcf5a', '#ff8a3d', '#fff0b0']) });
    }
    for (let i = 0; i < 14; i++) {
      this.add({ type: 'smoke', x: x + rand(-16, 16), y: y + rand(-16, 16), vx: rand(-50, 50), vy: rand(-60, 20), life: rand(0.8, 2.2), size: rand(9, 22), color: pick(['rgba(60,60,62,0.55)', 'rgba(95,90,84,0.5)']) });
    }
    for (let i = 0; i < 6; i++) {
      this.add({ type: 'debris', x, y, vx: rand(-220, 220), vy: rand(-220, 220), life: rand(0.4, 1), size: rand(2, 5), color: '#3a3a3a', spin: rand(-8, 8), rot: 0 });
    }
  }

  ring(x, y, color = 'rgba(255,255,255,0.5)') {
    this.add({ type: 'ring', x, y, vx: 0, vy: 0, life: 0.45, size: 8, grow: 120, color });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'blood' || p.type === 'spark' || p.type === 'debris') {
        p.vx *= Math.exp(-3.2 * dt);
        p.vy *= Math.exp(-3.2 * dt);
      }
      if (p.type === 'smoke' || p.type === 'dust') {
        p.vx *= Math.exp(-1.1 * dt);
        p.vy *= Math.exp(-1.1 * dt);
        p.size += dt * 7;
      }
      if (p.type === 'ring') p.size += p.grow * dt;
      if (p.type === 'debris' && p.spin) p.rot += p.spin * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      } else if (p.type === 'flash') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(255,180,60,0)');
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'debris') {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        ctx.globalAlpha = p.type === 'smoke' || p.type === 'dust' ? a * 0.8 : a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
