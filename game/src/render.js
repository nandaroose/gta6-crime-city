import { drawCity } from './city.js';
import { drawVehicle } from './vehicles.js';
import { drawTraffic } from './traffic.js';
import { drawPed } from './peds.js';
import { drawOfficer, drawPoliceCars } from './police.js';
import { drawPlayer } from './player.js';
import { drawParticles } from './particles.js';
import { drawBullets } from './combat.js';
import { drawPickups, drawMissionMarker, drawPackage } from './missions.js';
import { drawHUD } from './hud.js';
import { drawMenu } from './menus.js';
import { cameraOffset } from './camera.js';

function onScreen(view, x, y, margin = 120) {
  return x > view.x - margin && y > view.y - margin && x < view.x + view.w + margin && y < view.y + view.h + margin;
}

export function render(game) {
  const ctx = game.ctx;
  const canvas = game.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cam = game.camera;
  const off = cameraOffset(cam);
  const view = {
    x: cam.x - canvas.width / 2 + off.x,
    y: cam.y - canvas.height / 2 + off.y,
    w: canvas.width,
    h: canvas.height
  };

  ctx.save();
  ctx.translate(-view.x, -view.y);

  drawCity(ctx, game.city, view, game.time);
  drawPickups(ctx, game, game.time);
  drawPackage(ctx, game.mission.package, game.time);
  drawMissionMarker(ctx, game.mission.marker, game.time);

  for (let i = 0; i < game.vehicles.length; i++) {
    const v = game.vehicles[i];
    if (v.dead || !onScreen(view, v.x, v.y, 90)) continue;
    drawVehicle(ctx, v, game.time);
  }
  drawTraffic(ctx, game, view, game.time);
  drawPoliceCars(ctx, game, view, game.time);

  for (let i = 0; i < game.peds.length; i++) {
    const ped = game.peds[i];
    if (!onScreen(view, ped.x, ped.y, 60)) continue;
    drawPed(ctx, ped, game.time);
  }
  for (let i = 0; i < game.police.officers.length; i++) {
    const off2 = game.police.officers[i];
    if (!onScreen(view, off2.x, off2.y, 60)) continue;
    drawOfficer(ctx, off2);
  }

  if (!game.player.inVehicle) drawPlayer(ctx, game.player, game.time);

  drawBullets(ctx, game.bullets);
  drawParticles(ctx, game.particles);

  ctx.restore();

  if (game.state !== 'title') drawHUD(game);
  if (game.state !== 'playing') drawMenu(game);
}
