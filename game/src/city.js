import { TILE, CELL, ROAD_W, WORLD, BLOCKS, COLORS } from './config.js';
import { mulberry32, rand, randInt, pick, clamp, circleRect } from './utils.js';

const BUILDING_COLORS = ['#4a4f57', '#57504a', '#3f4a52', '#5b4a4a', '#4d5560', '#63594a', '#3d444b'];
const ROOF_COLORS = ['#3a3f46', '#484038', '#333c43', '#4a3c3c'];

export function createCity(seed = 1337) {
  const rng = mulberry32(seed);
  const blocks = [];
  const solids = [];
  const trees = [];

  for (let by = 0; by < BLOCKS; by++) {
    for (let bx = 0; bx < BLOCKS; bx++) {
      const x = bx * CELL + ROAD_W;
      const y = by * CELL + ROAD_W;
      const inner = { x: x + TILE, y: y + TILE, w: 6 * TILE, h: 6 * TILE };
      const park = rng() < 0.17;
      const block = {
        bx, by, x, y, w: 8 * TILE, h: 8 * TILE, inner,
        type: park ? 'park' : 'building',
        color: pick(rng, BUILDING_COLORS),
        roof: pick(rng, ROOF_COLORS),
        windows: [],
        trees: [],
        detail: null
      };

      if (park) {
        const pathH = { x: inner.x, y: inner.y + inner.h / 2 - 10, w: inner.w, h: 20 };
        const pathV = { x: inner.x + inner.w / 2 - 10, y: inner.y, w: 20, h: inner.h };
        block.detail = { pathH, pathV };
        for (let i = 0; i < 9; i++) {
          const t = {
            x: inner.x + rand(rng, 18, inner.w - 18),
            y: inner.y + rand(rng, 18, inner.h - 18),
            r: rand(rng, 10, 17)
          };
          block.trees.push(t);
          trees.push(t);
          solids.push({ x: t.x - 9, y: t.y - 9, w: 18, h: 18, tree: true });
        }
      } else {
        solids.push({ x: inner.x, y: inner.y, w: inner.w, h: inner.h, building: true });
        const cols = 5;
        const rows = 5;
        const cw = inner.w / cols;
        const ch = inner.h / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rng() < 0.12) continue;
            block.windows.push({
              x: inner.x + c * cw + cw / 2 - 7,
              y: inner.y + r * ch + ch / 2 - 6,
              w: 14,
              h: 12,
              lit: rng() < 0.35
            });
          }
        }
        block.detail = {
          ac: {
            x: inner.x + rand(rng, 20, inner.w - 70),
            y: inner.y + rand(rng, 20, inner.h - 60),
            w: 34,
            h: 26
          }
        };
      }
      blocks.push(block);
    }
  }
  return { blocks, solids, trees, rng };
}

export function isRoadAt(x, y) {
  if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return false;
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  return tx % 10 < 2 || ty % 10 < 2;
}

export function isSidewalkAt(x, y) {
  if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return false;
  if (isRoadAt(x, y)) return false;
  const tx = Math.floor(x / TILE) % 10;
  const ty = Math.floor(y / TILE) % 10;
  return tx === 2 || tx === 9 || ty === 2 || ty === 9;
}

export function pointInSolid(city, x, y) {
  for (let i = 0; i < city.solids.length; i++) {
    const s = city.solids[i];
    if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return true;
  }
  return false;
}

export function resolveCircle(city, x, y, r) {
  let px = clamp(x, r, WORLD - r);
  let py = clamp(y, r, WORLD - r);
  for (let i = 0; i < city.solids.length; i++) {
    const s = city.solids[i];
    if (!circleRect(px, py, r, s)) continue;
    const nx = clamp(px, s.x, s.x + s.w);
    const ny = clamp(py, s.y, s.y + s.h);
    let dx = px - nx;
    let dy = py - ny;
    let d = Math.hypot(dx, dy);
    if (d < 0.001) {
      const left = px - s.x;
      const right = s.x + s.w - px;
      const top = py - s.y;
      const bottom = s.y + s.h - py;
      const m = Math.min(left, right, top, bottom);
      if (m === left) px = s.x - r;
      else if (m === right) px = s.x + s.w + r;
      else if (m === top) py = s.y - r;
      else py = s.y + s.h + r;
      continue;
    }
    const push = r - d;
    px += (dx / d) * push;
    py += (dy / d) * push;
  }
  return { x: px, y: py, hit: px !== x || py !== y };
}

export function randomRoadPoint(rng, awayFrom, minDist = 500) {
  for (let tries = 0; tries < 40; tries++) {
    const band = randInt(rng, 0, BLOCKS);
    const horizontal = rng() < 0.5;
    const along = rand(rng, 0, WORLD);
    const lane = band * CELL + (rng() < 0.5 ? 20 : 60);
    const x = horizontal ? along : lane;
    const y = horizontal ? lane : along;
    if (!awayFrom || Math.hypot(x - awayFrom.x, y - awayFrom.y) >= minDist) {
      return { x: clamp(x, 30, WORLD - 30), y: clamp(y, 30, WORLD - 30) };
    }
  }
  return { x: rand(rng, 100, WORLD - 100), y: rand(rng, 100, WORLD - 100) };
}

export function randomSidewalkPoint(rng, awayFrom, minDist = 0) {
  for (let tries = 0; tries < 60; tries++) {
    const bx = randInt(rng, 0, BLOCKS - 1);
    const by = randInt(rng, 0, BLOCKS - 1);
    const ox = bx * CELL + ROAD_W;
    const oy = by * CELL + ROAD_W;
    const side = randInt(rng, 0, 3);
    let x;
    let y;
    if (side === 0) {
      x = ox + rand(rng, 10, 310);
      y = oy + rand(rng, 10, 30);
    } else if (side === 1) {
      x = ox + rand(rng, 10, 310);
      y = oy + 290 + rand(rng, 0, 20);
    } else if (side === 2) {
      x = ox + rand(rng, 10, 30);
      y = oy + rand(rng, 10, 310);
    } else {
      x = ox + 290 + rand(rng, 0, 20);
      y = oy + rand(rng, 10, 310);
    }
    if (!awayFrom || Math.hypot(x - awayFrom.x, y - awayFrom.y) >= minDist) {
      return { x, y };
    }
  }
  return { x: 840, y: 120 };
}

export function randomIntersection(rng, awayFrom, minDist = 0) {
  for (let tries = 0; tries < 30; tries++) {
    const kx = randInt(rng, 1, BLOCKS - 1);
    const ky = randInt(rng, 1, BLOCKS - 1);
    const x = kx * CELL + 40;
    const y = ky * CELL + 40;
    if (!awayFrom || Math.hypot(x - awayFrom.x, y - awayFrom.y) >= minDist) return { x, y };
  }
  return { x: 840, y: 840 };
}

export function drawCity(ctx, city, view, time) {
  ctx.fillStyle = COLORS.asphalt;
  ctx.fillRect(view.x, view.y, view.w, view.h);

  for (let i = 0; i < city.blocks.length; i++) {
    const b = city.blocks[i];
    if (b.x + b.w < view.x || b.y + b.h < view.y || b.x > view.x + view.w || b.y > view.y + view.h) continue;

    ctx.fillStyle = COLORS.sidewalk;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = COLORS.sidewalkEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    const inner = b.inner;
    if (b.type === 'park') {
      ctx.fillStyle = COLORS.grass;
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
      ctx.fillStyle = COLORS.grassDark;
      ctx.fillRect(inner.x, inner.y, inner.w, 6);
      ctx.fillRect(inner.x, inner.y + inner.h - 6, inner.w, 6);
      ctx.fillStyle = COLORS.path;
      ctx.fillRect(b.detail.pathH.x, b.detail.pathH.y, b.detail.pathH.w, b.detail.pathH.h);
      ctx.fillRect(b.detail.pathV.x, b.detail.pathV.y, b.detail.pathV.w, b.detail.pathV.h);
      for (let t = 0; t < b.trees.length; t++) {
        const tr = b.trees[t];
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.arc(tr.x + 4, tr.y + 5, tr.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.tree;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.treeTop;
        ctx.beginPath();
        ctx.arc(tr.x - tr.r * 0.25, tr.y - tr.r * 0.25, tr.r * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = COLORS.buildingShadow;
      ctx.fillRect(inner.x + 7, inner.y + 9, inner.w, inner.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(inner.x, inner.y, inner.w, 10);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);

      for (let w = 0; w < b.windows.length; w++) {
        const win = b.windows[w];
        const lit = win.lit && (Math.sin(time * 0.6 + w * 1.7) > -0.85);
        ctx.fillStyle = lit ? COLORS.windowLit : COLORS.window;
        ctx.fillRect(win.x, win.y, win.w, win.h);
      }

      const ac = b.detail.ac;
      ctx.fillStyle = b.roof;
      ctx.fillRect(ac.x, ac.y, ac.w, ac.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(ac.x, ac.y, ac.w, ac.h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(ac.x + 4, ac.y + 4, ac.w - 8, 6);
    }
  }

  ctx.strokeStyle = COLORS.lane;
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 20]);
  const firstH = Math.max(0, Math.floor((view.y - 40) / CELL));
  const lastH = Math.min(BLOCKS, Math.ceil((view.y + view.h - 40) / CELL));
  for (let i = firstH; i <= lastH; i++) {
    const y = i * CELL + 40;
    ctx.beginPath();
    ctx.moveTo(Math.max(view.x, 0), y);
    ctx.lineTo(Math.min(view.x + view.w, WORLD), y);
    ctx.stroke();
  }
  const firstV = Math.max(0, Math.floor((view.x - 40) / CELL));
  const lastV = Math.min(BLOCKS, Math.ceil((view.x + view.w - 40) / CELL));
  for (let i = firstV; i <= lastV; i++) {
    const x = i * CELL + 40;
    ctx.beginPath();
    ctx.moveTo(x, Math.max(view.y, 0));
    ctx.lineTo(x, Math.min(view.y + view.h, WORLD));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, WORLD, WORLD);
}
