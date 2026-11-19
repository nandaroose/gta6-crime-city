// camera.js — smooth follow camera with zoom, screen shake, and screen<->world
// coordinate conversion. Zooms out in vehicles, in on foot.

import { clamp, lerp } from './utils.js';

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;          // world position of view center
    this.zoom = 1;
    this.targetZoom = 1;
    this.shake = 0;
    this.W = 0; this.H = 0;          // canvas size, set by main
  }

  resize(w, h) { this.W = w; this.H = h; }

  follow(target, inVehicle, dt) {
    this.targetZoom = inVehicle ? 1.6 : 2.2;
    this.zoom = lerp(this.zoom, this.targetZoom, 1 - Math.pow(0.001, dt));
    // Lead slightly ahead of movement for a dynamic feel
    const lead = inVehicle ? 40 : 12;
    const tx = target.x + Math.cos(target.angle || 0) * lead * (inVehicle ? 1 : 0.3);
    const ty = target.y + Math.sin(target.angle || 0) * lead * (inVehicle ? 1 : 0.3);
    const k = 1 - Math.pow(0.0001, dt);
    this.x = lerp(this.x, tx, k);
    this.y = lerp(this.y, ty, k);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
  }

  kick(amount) { this.shake = Math.min(this.shake + amount, 18); }

  apply(ctx) {
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(this.W / 2 + sx, this.H / 2 + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  // Visible world rect (with margin) — used to cull rendering.
  viewBounds(margin = 64) {
    const hw = (this.W / 2) / this.zoom + margin;
    const hh = (this.H / 2) / this.zoom + margin;
    return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.W / 2) / this.zoom + this.x,
      y: (sy - this.H / 2) / this.zoom + this.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.W / 2,
      y: (wy - this.y) * this.zoom + this.H / 2,
    };
  }
}
