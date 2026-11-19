// minimap.js — bottom-left circular minimap: rotates with the player, renders
// roads from the real city grid, plus mission marker and police blips.

import { TILE, GRID, clamp } from './utils.js';
import { T } from './city.js';

const SIZE = 180;       // on-screen diameter
const RADIUS = SIZE / 2;
const VIEW_TILES = 26;  // how many tiles across

export function drawMinimap(ctx, world, screenW, screenH) {
  const px = 20, py = screenH - SIZE - 20;
  const p = world.player;
  const scale = SIZE / VIEW_TILES; // px per tile

  ctx.save();
  ctx.beginPath();
  ctx.arc(px + RADIUS, py + RADIUS, RADIUS, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#15181e';
  ctx.fillRect(px, py, SIZE, SIZE);

  // rotate around the player
  ctx.translate(px + RADIUS, py + RADIUS);
  ctx.rotate(-(p.car ? p.car.angle : p.angle) + Math.PI / 2);
  ctx.scale(scale / TILE, scale / TILE);
  ctx.translate(-p.x, -p.y);

  // draw tiles: sample the grid with 1-tile resolution
  const half = VIEW_TILES * TILE / 2;
  const x0 = Math.floor((p.x - half) / TILE), y0 = Math.floor((p.y - half) / TILE);
  const x1 = Math.ceil((p.x + half) / TILE), y1 = Math.ceil((p.y + half) / TILE);
  const city = world.city;
  for (let ty = Math.max(0, y0); ty <= Math.min(GRID - 1, y1); ty++) {
    for (let tx = Math.max(0, x0); tx <= Math.min(GRID - 1, x1); tx++) {
      const v = city.t(tx, ty);
      let color = null;
      if (v === T.ROAD) color = '#3c4048';
      else if (v === T.ROAD && city.isAvenueRow(ty)) color = '#4a4f58';
      else if (v === T.SIDEWALK) color = '#20242b';
      else if (v === T.PARK) color = '#28402a';
      else if (v === T.SAND) color = '#4a422c';
      else if (v === T.EMPTY) color = '#12283a';
      else if (v === T.BUILDING) color = '#101216';
      if (v === T.ROAD) color = city.isAvenueRow(ty) || city.isAvenueCol(tx) ? '#4a4f58' : '#3c4048';
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(tx * TILE, ty * TILE, TILE + 1, TILE + 1);
      }
    }
  }

  // police blips
  ctx.fillStyle = '#4488ff';
  for (const cop of world.police.cops) {
    if (!cop.dead) { ctx.beginPath(); ctx.arc(cop.x, cop.y, TILE * 0.45, 0, Math.PI * 2); ctx.fill(); }
  }
  for (const car of world.police.cars) {
    if (!car.dead) { ctx.beginPath(); ctx.arc(car.x, car.y, TILE * 0.55, 0, Math.PI * 2); ctx.fill(); }
  }

  // mission marker (clamped into view)
  const a = world.missions.active;
  if (a && a.marker) {
    const m = a.marker;
    // clamp to circle edge if far
    const dx = m.x - p.x, dy = m.y - p.y;
    const d = Math.hypot(dx, dy);
    const maxD = half * 0.92;
    let mx = m.x, my = m.y;
    if (d > maxD) { mx = p.x + (dx / d) * maxD; my = p.y + (dy / d) * maxD; }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(mx, my, TILE * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // player arrow
  ctx.rotate((p.car ? p.car.angle : p.angle) - Math.PI / 2);
  ctx.fillStyle = '#7dff8a';
  ctx.beginPath();
  ctx.moveTo(TILE * 0.9, 0);
  ctx.lineTo(-TILE * 0.6, TILE * 0.55);
  ctx.lineTo(-TILE * 0.6, -TILE * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // frame
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px + RADIUS, py + RADIUS, RADIUS + 1, 0, Math.PI * 2);
  ctx.stroke();
  // north indicator
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  const ang = -(p.car ? p.car.angle : p.angle) + Math.PI / 2;
  const nx = px + RADIUS + Math.sin(ang) * (RADIUS - 12);
  const ny = py + RADIUS - Math.cos(ang) * (RADIUS - 12);
  ctx.fillText('N', nx, ny + 4);
  ctx.restore();
}

export const MINIMAP_SIZE = SIZE;
export const MINIMAP_UNUSED = clamp;
