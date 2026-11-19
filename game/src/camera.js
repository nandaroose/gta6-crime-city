import { WORLD } from './config.js';
import { clamp, lerp } from './utils.js';

export function createCamera(target) {
  return { x: target.x, y: target.y, shake: 0 };
}

export function updateCamera(game, dt) {
  const cam = game.camera;
  const p = game.player;
  const vw = game.canvas.width;
  const vh = game.canvas.height;
  const m = game.input.mouse;

  const lookX = clamp((m.worldX - p.x) * 0.14, -90, 90);
  const lookY = clamp((m.worldY - p.y) * 0.14, -90, 90);
  const k = 1 - Math.pow(0.0009, Math.min(dt, 0.05));

  cam.x = lerp(cam.x, p.x + lookX, k);
  cam.y = lerp(cam.y, p.y + lookY, k);

  const halfW = vw / 2;
  const halfH = vh / 2;
  cam.x = vw >= WORLD ? WORLD / 2 : clamp(cam.x, halfW, WORLD - halfW);
  cam.y = vh >= WORLD ? WORLD / 2 : clamp(cam.y, halfH, WORLD - halfH);

  cam.shake = Math.max(0, (cam.shake || 0) - dt * 22);
}

export function cameraOffset(cam) {
  if (!cam.shake) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * cam.shake,
    y: (Math.random() - 0.5) * cam.shake
  };
}
