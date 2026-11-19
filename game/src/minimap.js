import { WORLD } from './config.js';
import { roundRect } from './utils.js';

export function drawMinimap(game, ctx, x, y, size) {
  const scale = size / WORLD;
  ctx.save();
  roundRect(ctx, x, y, size, size, 10);
  ctx.fillStyle = '#2a2f37';
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, size, size, 10);
  ctx.clip();

  ctx.fillStyle = '#3a4049';
  ctx.fillRect(x, y, size, size);

  const city = game.city;
  for (let i = 0; i < city.blocks.length; i++) {
    const b = city.blocks[i];
    ctx.fillStyle = b.type === 'park' ? '#2f5a36' : '#1a1f26';
    ctx.fillRect(x + b.x * scale, y + b.y * scale, b.w * scale, b.h * scale);
  }

  const m = game.mission;
  if (m.marker) {
    const pulse = 2 + Math.sin(game.time * 4) * 1.2;
    ctx.fillStyle = '#ffd75a';
    ctx.beginPath();
    ctx.arc(x + m.marker.x * scale, y + m.marker.y * scale, pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < game.peds.length; i++) {
    const ped = game.peds[i];
    if (ped.dead) continue;
    ctx.fillStyle = ped.hostile ? '#e04a3a' : 'rgba(210,215,225,0.45)';
    ctx.fillRect(x + ped.x * scale - 1, y + ped.y * scale - 1, 2, 2);
  }

  for (let i = 0; i < game.police.officers.length; i++) {
    const off = game.police.officers[i];
    ctx.fillStyle = '#4f8fe8';
    ctx.fillRect(x + off.x * scale - 2, y + off.y * scale - 2, 4, 4);
  }
  for (let i = 0; i < game.police.cars.length; i++) {
    const car = game.police.cars[i];
    ctx.fillStyle = '#7fb4ff';
    ctx.fillRect(x + car.x * scale - 2, y + car.y * scale - 2, 4, 4);
  }

  const p = game.player;
  ctx.save();
  ctx.translate(x + p.x * scale, y + p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 10);
  ctx.stroke();
  ctx.restore();
}
