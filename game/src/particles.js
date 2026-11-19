// particles.js — particle system + world decals (blood, skid marks, scorch).

export class Particles {
  constructor() {
    this.list = [];
    this.decals = [];   // {x,y,r,color,alpha,type}
    this.maxDecals = 220;
  }

  spawn(x, y, opts = {}) {
    const n = opts.count || 1;
    for (let i = 0; i < n; i++) {
      this.list.push({
        x, y,
        vx: (Math.random() - 0.5) * (opts.spread || 60),
        vy: (Math.random() - 0.5) * (opts.spread || 60),
        life: opts.life || 0.5,
        age: 0,
        r: opts.r || 2 + Math.random() * 2,
        color: opts.color || '#fff',
        grav: opts.grav || 0,
        drag: opts.drag || 1,
        glow: !!opts.glow,
      });
    }
  }

  muzzle(x, y, angle) {
    this.spawn(x, y, {
      count: 5, spread: 90, life: 0.09, r: 3, color: '#ffd873', glow: true,
    });
    this.spawn(x, y, { count: 3, spread: 40, life: 0.25, r: 2.5, color: '#caa', drag: 0.9 });
  }

  blood(x, y, count = 10) {
    this.spawn(x, y, { count, spread: 110, life: 0.4, r: 2.4, color: '#a01818', drag: 0.88 });
  }

  sparks(x, y) {
    this.spawn(x, y, { count: 8, spread: 140, life: 0.3, r: 1.6, color: '#ffcf6e', glow: true });
  }

  smoke(x, y) {
    this.spawn(x, y, { count: 4, spread: 30, life: 1.1, r: 6, color: 'rgba(70,70,75,0.5)', drag: 0.95 });
  }

  explosion(x, y) {
    this.spawn(x, y, { count: 26, spread: 260, life: 0.7, r: 5, color: '#ffb347', glow: true });
    this.spawn(x, y, { count: 18, spread: 160, life: 1.4, r: 8, color: 'rgba(60,60,65,0.6)', drag: 0.95 });
    this.addDecal(x, y, 34, 'rgba(20,15,12,0.75)', 'scorch');
  }

  addDecal(x, y, r, color, type) {
    this.decals.push({ x, y, r, color, type, alpha: 1 });
    if (this.decals.length > this.maxDecals) this.decals.shift();
  }

  bloodDecal(x, y) {
    this.addDecal(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8,
      5 + Math.random() * 5, 'rgba(130,15,15,0.6)', 'blood');
  }

  skid(x, y, angle) {
    this.decals.push({
      x, y, r: 3, color: 'rgba(25,25,28,0.5)', type: 'skid',
      angle, alpha: 1,
    });
    if (this.decals.length > this.maxDecals) this.decals.shift();
  }

  clear() { this.list.length = 0; this.decals.length = 0; }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) { this.list.splice(i, 1); continue; }
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const d of this.decals) {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      if (d.type === 'skid') {
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle || 0);
        ctx.fillStyle = d.color;
        ctx.fillRect(-4, -d.r, 8, d.r * 2);
      } else {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const p of this.list) {
      const t = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = t;
      if (p.glow) {
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.4 + t * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
