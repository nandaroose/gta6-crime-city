// Smooth follow camera with look-ahead and screen shake.

import { CONFIG } from './config.js';
import { clamp, damp, rand } from './utils.js';

export class Camera {
  constructor(worldSize) {
    this.worldSize = worldSize;
    this.x = worldSize / 2;
    this.y = worldSize / 2;
    this.zoom = 1;
    this.viewW = 1280;
    this.viewH = 800;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flash = 0;
    this.flashColor = '255,255,255';
  }

  setViewport(w, h) {
    this.viewW = w;
    this.viewH = h;
    this.zoom = clamp(Math.min(w / 1280, h / 800), 0.82, 1.18);
  }

  snapTo(x, y) {
    this.x = x;
    this.y = y;
  }

  follow(target, dt, lookX = 0, lookY = 0) {
    const desiredX = target.x + lookX;
    const desiredY = target.y + lookY;
    this.x = damp(this.x, desiredX, CONFIG.camera.follow, dt);
    this.y = damp(this.y, desiredY, CONFIG.camera.follow, dt);
    const margin = 80;
    const halfW = this.viewW / (2 * this.zoom);
    const halfH = this.viewH / (2 * this.zoom);
    this.x = clamp(this.x, Math.min(halfW - margin, this.worldSize / 2), Math.max(this.worldSize - halfW + margin, this.worldSize / 2));
    this.y = clamp(this.y, Math.min(halfH - margin, this.worldSize / 2), Math.max(this.worldSize - halfH + margin, this.worldSize / 2));
    this.shake = Math.max(0, this.shake - CONFIG.camera.shakeDecay * dt);
    const amount = this.shake * this.shake;
    this.shakeX = rand(-1, 1) * amount * 14;
    this.shakeY = rand(-1, 1) * amount * 14;
    this.flash = Math.max(0, this.flash - dt * 2.4);
  }

  addShake(amount) {
    this.shake = clamp(this.shake + amount, 0, 1.6);
  }

  addFlash(amount, color = '255,255,255') {
    this.flash = Math.min(1, this.flash + amount);
    this.flashColor = color;
  }

  apply(ctx) {
    ctx.translate(this.viewW / 2, this.viewH / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  viewRect() {
    const w = this.viewW / this.zoom;
    const h = this.viewH / this.zoom;
    return { x: this.x - w / 2, y: this.y - h / 2, w, h };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewW / 2) / this.zoom + this.x - this.shakeX,
      y: (sy - this.viewH / 2) / this.zoom + this.y - this.shakeY,
    };
  }

  worldToScreen(x, y) {
    return {
      x: (x - this.x + this.shakeX) * this.zoom + this.viewW / 2,
      y: (y - this.y + this.shakeY) * this.zoom + this.viewH / 2,
    };
  }
}
