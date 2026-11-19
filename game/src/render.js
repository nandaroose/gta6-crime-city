// Draw order, golden-hour lighting, vignette and the screen-space pass.

import { hexToRgba } from './utils.js';

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  draw(game) {
    const ctx = this.ctx;
    const w = game.width;
    const h = game.height;
    ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1b2b2e';
    ctx.fillRect(0, 0, w, h);

    const camera = game.camera;
    camera.setViewport(w, h);
    ctx.save();
    camera.apply(ctx);
    const time = game.time;
    game.city.renderGround(ctx, camera, time);
    game.city.renderBuildings(ctx, camera);
    game.city.renderProps(ctx, camera, time);
    game.missions.drawMarkers(ctx, time);
    game.combat.drawPickups(ctx, time);

    const drawables = [];
    for (const v of game.vehicles.list) drawables.push({ y: v.y, kind: 'vehicle', obj: v });
    for (const p of game.peds.list) drawables.push({ y: p.y, kind: 'ped', obj: p });
    for (const o of game.police.officers) drawables.push({ y: o.y, kind: 'cop', obj: o });
    if (!game.player.vehicle && !game.player.dead) drawables.push({ y: game.player.y, kind: 'player', obj: game.player });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) {
      if (d.kind === 'vehicle') d.obj.draw(ctx, time);
      else d.obj.draw(ctx, time);
    }

    game.combat.drawBullets(ctx);
    game.particles.draw(ctx);
    ctx.restore();

    ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
    this.lighting(ctx, w, h, camera);
    if (game.state !== 'title') {
      game.minimap.draw(ctx, game, w, h);
      game.hud.draw(ctx, game, w, h);
    }
  }

  lighting(ctx, w, h, camera) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const grade = ctx.createLinearGradient(0, 0, w, h);
    grade.addColorStop(0, 'rgba(255,196,120,0.16)');
    grade.addColorStop(0.55, 'rgba(255,140,90,0.04)');
    grade.addColorStop(1, 'rgba(50,90,140,0.12)');
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    const sun = ctx.createRadialGradient(w * 0.8, h * 0.08, 10, w * 0.8, h * 0.08, Math.max(w, h) * 0.75);
    sun.addColorStop(0, 'rgba(255,214,140,0.2)');
    sun.addColorStop(0.4, 'rgba(255,180,110,0.06)');
    sun.addColorStop(1, 'rgba(255,160,90,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.72);
    vig.addColorStop(0, 'rgba(8,10,16,0)');
    vig.addColorStop(1, 'rgba(8,10,16,0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (camera.flash > 0.001) {
      ctx.fillStyle = `rgba(${camera.flashColor},${camera.flash * 0.32})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (camera.shake > 0.55) {
      ctx.fillStyle = hexToRgba('#e8564a', (camera.shake - 0.55) * 0.18);
      ctx.fillRect(0, 0, w, h);
    }
  }
}
