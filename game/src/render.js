// render.js — world rendering: tiles (roads, sidewalks, parks, sand, ocean),
// buildings with fake shadows and rooftop AC units, trees, vehicles, actors,
// mission marker, lighting tint and bloom pass. Canvas 2D only.

import { TILE, GRID, TAU, hash2, clamp } from './utils.js';
import { T, roofDetails, districtAt } from './city.js';
import { drawPlayer } from './player.js';
import { drawPed } from './peds.js';
import { drawCarShape } from './vehicles.js';
import { drawBullets } from './combat.js';
import { drawMarker } from './missions.js';
import { setCopDrawTarget } from './police.js';

const TILE_COLORS = {
  [T.EMPTY]: '#123a52',
  [T.SAND]: '#e6cf9a',
  [T.ROAD]: '#3a3d42',
  [T.SIDEWALK]: '#8f9297',
  [T.PARK]: '#4e7a45',
  [T.BUILDING]: '#555', // drawn over by buildings anyway
};

export function renderWorld(ctx, world, camera, time) {
  const b = camera.viewBounds(80);
  const city = world.city;

  // Ground pass — tiles
  const tx0 = clamp(Math.floor(b.x0 / TILE) - 1, 0, GRID - 1);
  const ty0 = clamp(Math.floor(b.y0 / TILE) - 1, 0, GRID - 1);
  const tx1 = clamp(Math.ceil(b.x1 / TILE) + 1, 0, GRID - 1);
  const ty1 = clamp(Math.ceil(b.y1 / TILE) + 1, 0, GRID - 1);

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const v = city.t(tx, ty);
      ctx.fillStyle = TILE_COLORS[v] || '#123a52';
      ctx.fillRect(tx * TILE, ty * TILE, TILE + 1, TILE + 1);

      // Road detail: dashed center line on avenue mid-axis
      if (v === T.ROAD) {
        if (city.isAvenueRow(ty) && !city.isAvenueCol(tx)) {
          ctx.fillStyle = 'rgba(230,225,150,0.7)';
          ctx.fillRect(tx * TILE, ty * TILE + TILE / 2 - 1, TILE / 2, 2);
        } else if (city.isAvenueCol(tx) && !city.isAvenueRow(ty)) {
          ctx.fillStyle = 'rgba(230,225,150,0.7)';
          ctx.fillRect(tx * TILE + TILE / 2 - 1, ty * TILE, 2, TILE / 2);
        } else if (!city.isAvenueCol(tx) && !city.isAvenueRow(ty)) {
          // 2-lane street: subtle lane dots at block midpoints
          const h = city.roadAxisH.has(ty) && !city.isAvenueRow(ty);
          const vv = city.roadAxisV.has(tx) && !city.isAvenueCol(tx);
          if (h && hash2(tx, ty, 3) > 0.9) {
            ctx.fillStyle = 'rgba(220,220,200,0.35)';
            ctx.fillRect(tx * TILE + 8, ty * TILE + TILE / 2, 12, 1.5);
          }
          if (vv && hash2(tx, ty, 5) > 0.9) {
            ctx.fillStyle = 'rgba(220,220,200,0.35)';
            ctx.fillRect(tx * TILE + TILE / 2, ty * TILE + 8, 1.5, 12);
          }
        }
      }
      // sand speckle
      if (v === T.SAND && hash2(tx, ty, 9) > 0.85) {
        ctx.fillStyle = 'rgba(180,150,90,0.4)';
        ctx.fillRect(tx * TILE + 10, ty * TILE + 12, 5, 3);
      }
      // park grass variation
      if (v === T.PARK && hash2(tx, ty, 11) > 0.7) {
        ctx.fillStyle = 'rgba(60,110,55,0.6)';
        ctx.fillRect(tx * TILE + 6, ty * TILE + 8, 10, 6);
      }
    }
  }

  // Water shimmer (east edge)
  drawWater(ctx, world, time, tx0, ty0, tx1, ty1);

  // Decals (skids, blood, scorch) beneath entities
  world.particles.draw(ctx);

  // Buildings with fake 3D shadow + roof detail
  for (const bd of city.buildings) {
    if (bd.x > b.x1 || bd.y > b.y1 || bd.x + bd.w < b.x0 || bd.y + bd.h < b.y0) continue;
    drawBuilding(ctx, bd);
  }

  // Trees in parks
  for (const park of city.parks) {
    for (const tr of park.trees) {
      if (tr.x < b.x0 - 40 || tr.x > b.x1 + 40 || tr.y < b.y0 - 40 || tr.y > b.y1 + 40) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.arc(tr.x + 5, tr.y + 6, tr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3c6b38';
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4e8348';
      ctx.beginPath(); ctx.arc(tr.x - tr.r * 0.2, tr.y - tr.r * 0.25, tr.r * 0.65, 0, TAU); ctx.fill();
    }
  }

  // Mission marker on the ground
  if (world.missions.active) drawMarker(ctx, world.missions.active.marker, time);

  // Dead peds first (under everything alive)
  for (const q of world.peds.list) if (q.dead) drawPed(ctx, q);
  for (const cop of world.police.cops) if (cop.dead) world.police.drawCop(ctx, cop);

  // Vehicles
  for (const car of world.vehicles) {
    if (car.x < b.x0 - 60 || car.x > b.x1 + 60 || car.y < b.y0 - 60 || car.y > b.y1 + 60) continue;
    if (car.driver === 'player') continue; // drawn last
    drawCarShape(ctx, car, 0);
  }

  // Actors
  for (const q of world.peds.list) if (!q.dead) drawPed(ctx, q);
  setCopDrawTarget(world.player);
  for (const cop of world.police.cops) if (!cop.dead) world.police.drawCop(ctx, cop);
  world.missions.drawMissionActors(ctx);

  // Player + player car last
  if (world.player.car) drawCarShape(ctx, world.player.car, 0);
  else drawPlayer(ctx, world.player);

  drawBullets(ctx, world);

  // Lighting: sun tint + subtle vignette + bloom flashes
  applyLighting(ctx, camera, world, time);
}

function drawBuilding(ctx, bd) {
  const shadowOff = bd.height * 0.35;
  // drop shadow (sun from northwest)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(bd.x + shadowOff, bd.y + shadowOff, bd.w, bd.h);
  // body
  ctx.fillStyle = bd.color;
  ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
  // sunlit top edge
  ctx.fillStyle = 'rgba(255,235,190,0.18)';
  ctx.fillRect(bd.x, bd.y, bd.w, 4);
  ctx.fillStyle = 'rgba(255,235,190,0.09)';
  ctx.fillRect(bd.x, bd.y, 4, bd.h);
  // darker shaded edge
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(bd.x + bd.w - 4, bd.y, 4, bd.h);
  ctx.fillRect(bd.x, bd.y + bd.h - 4, bd.w, 4);
  // rooftop AC units / vents (generated once per building, then cached)
  const items = bd.roof || (bd.roof = roofDetails(bd));
  for (const it of items) {
    if (it.type === 'ac') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(it.x + 2, it.y + 2, it.w, it.h);
      ctx.fillStyle = '#cfd4da';
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.fillStyle = '#9aa0a8';
      ctx.beginPath();
      ctx.arc(it.x + it.w / 2, it.y + it.h / 2, Math.min(it.w, it.h) / 2.6, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#7d838c';
      ctx.fillRect(it.x, it.y, it.w * 0.6, it.h * 0.6);
    }
  }
}

function drawWater(ctx, world, time, tx0, ty0, tx1, ty1) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let ty = Math.max(0, ty0); ty <= Math.min(GRID - 1, ty1); ty++) {
    for (let tx = Math.max(0, tx0); tx <= Math.min(GRID - 1, tx1); tx++) {
      if (world.city.t(tx, ty) !== T.EMPTY) continue;
      const wave = Math.sin(time * 1.4 + tx * 0.7 + ty * 1.1) * 0.5 + 0.5;
      if (wave > 0.6) {
        ctx.fillStyle = `rgba(120,190,220,${(wave - 0.6) * 0.5})`;
        ctx.fillRect(tx * TILE, ty * TILE + 6, TILE, 3);
      }
    }
  }
  ctx.restore();
}

// Warm afternoon-sun tint + edge vignette + light bloom on glowing particles.
function applyLighting(ctx, camera, world, time) {
  const { W, H } = camera;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // sun tint
  ctx.globalCompositeOperation = 'overlay';
  const grd = ctx.createRadialGradient(W * 0.25, H * 0.2, 0, W * 0.25, H * 0.2, W * 0.9);
  grd.addColorStop(0, 'rgba(255,214,150,0.14)');
  grd.addColorStop(1, 'rgba(40,60,110,0.10)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  // vignette
  ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// District label shown when crossing into a new district (drawn by hud).
export function currentDistrict(world) {
  const tx = Math.floor(world.player.x / TILE), ty = Math.floor(world.player.y / TILE);
  return districtAt(tx, ty);
}
