// Solano City: a procedural tiled city of roads, blocks, parks, beach and sea.

import { TILE_SIZE, GRID, WORLD_SIZE, COLORS } from './config.js';
import { clamp, rng, pick, shade, circleRect, resolveCircleRect } from './utils.js';

export const TILE = {
  GRASS: 0,
  ROAD: 1,
  SIDEWALK: 2,
  BUILDING: 3,
  PARK: 4,
  SAND: 5,
  WATER: 6,
};

const BEACH_ROW = 39;
const WATER_ROW = 41;
const BLOCK = 7;

export class City {
  constructor(seed = 7) {
    this.seed = seed;
    this.size = WORLD_SIZE;
    this.tiles = new Uint8Array(GRID * GRID);
    this.buildings = [];
    this.parks = [];
    this.trees = [];
    this.palms = [];
    this.umbrellas = [];
    this.roadX = [];
    this.roadY = [];
    this.lanes = [];
    this.landmarks = {};
    this.waterRect = { x: 0, y: WATER_ROW * TILE_SIZE, w: WORLD_SIZE, h: WORLD_SIZE - WATER_ROW * TILE_SIZE };
    this.build(seed);
    this.buildMinimap();
  }

  build(seed) {
    const random = rng(seed * 7919 + 13);
    for (let k = 0; k < 6; k++) {
      this.roadX.push((k * BLOCK + 1) * TILE_SIZE);
      this.roadY.push((k * BLOCK + 1) * TILE_SIZE);
    }
    for (let ty = 0; ty < GRID; ty++) {
      for (let tx = 0; tx < GRID; tx++) {
        let t;
        if (ty >= WATER_ROW) t = TILE.WATER;
        else if (ty >= BEACH_ROW) t = TILE.SAND;
        else if (tx % BLOCK < 2 || ty % BLOCK < 2) t = TILE.ROAD;
        else if (tx % BLOCK === 2 || tx % BLOCK === 6 || ty % BLOCK === 2 || ty % BLOCK === 6) t = TILE.SIDEWALK;
        else t = TILE.GRASS;
        this.tiles[ty * GRID + tx] = t;
      }
    }
    for (let by = 0; by < 5; by++) {
      for (let bx = 0; bx < 6; bx++) {
        const x = (bx * BLOCK + 3) * TILE_SIZE;
        const y = (by * BLOCK + 3) * TILE_SIZE;
        const w = 3 * TILE_SIZE;
        const h = 3 * TILE_SIZE;
        if (random() < 0.2) {
          this.addPark(x, y, w, h, random);
        } else {
          this.addBuildingLot(x, y, w, h, random);
        }
      }
    }
    this.addBeachProps(random);
    this.addLanes();
    this.addLandmarks();
  }

  addBuildingLot(x, y, w, h, random) {
    const color = pick(COLORS.building);
    const roof = pick(COLORS.roof);
    const split = random() < 0.42;
    const gap = 12;
    const make = (rx, ry, rw, rh) => {
      const b = {
        x: rx + 8,
        y: ry + 8,
        w: rw - 16,
        h: rh - 16,
        height: 26 + Math.floor(random() * 70),
        color,
        roof,
        ac: [],
      };
      const acCount = 1 + Math.floor(random() * 3);
      for (let i = 0; i < acCount; i++) {
        b.ac.push({
          x: b.x + 12 + random() * (b.w - 40),
          y: b.y + 12 + random() * (b.h - 40),
          w: 12 + random() * 10,
          h: 10 + random() * 8,
        });
      }
      this.buildings.push(b);
    };
    if (split && random() < 0.5) {
      make(x, y, w, h / 2 - gap / 2);
      make(x, y + h / 2 + gap / 2, w, h / 2 - gap / 2);
    } else if (split) {
      make(x, y, w / 2 - gap / 2, h);
      make(x + w / 2 + gap / 2, y, w / 2 - gap / 2, h);
    } else {
      make(x, y, w, h);
    }
    for (let ty = Math.floor(y / TILE_SIZE); ty < Math.floor((y + h) / TILE_SIZE); ty++) {
      for (let tx = Math.floor(x / TILE_SIZE); tx < Math.floor((x + w) / TILE_SIZE); tx++) {
        this.tiles[ty * GRID + tx] = TILE.BUILDING;
      }
    }
  }

  addPark(x, y, w, h, random) {
    this.parks.push({ x, y, w, h });
    for (let ty = Math.floor(y / TILE_SIZE); ty < Math.floor((y + h) / TILE_SIZE); ty++) {
      for (let tx = Math.floor(x / TILE_SIZE); tx < Math.floor((x + w) / TILE_SIZE); tx++) {
        this.tiles[ty * GRID + tx] = TILE.PARK;
      }
    }
    const count = 3 + Math.floor(random() * 4);
    for (let i = 0; i < count; i++) {
      this.trees.push({
        x: x + 18 + random() * (w - 36),
        y: y + 18 + random() * (h - 36),
        r: 12 + random() * 10,
        tone: random() < 0.5 ? '#3f7a46' : '#4c8a4e',
      });
    }
  }

  addBeachProps(random) {
    for (let i = 0; i < 34; i++) {
      this.palms.push({
        x: 40 + random() * (WORLD_SIZE - 80),
        y: BEACH_ROW * TILE_SIZE + 14 + random() * (2 * TILE_SIZE - 28),
        h: 16 + random() * 12,
        lean: (random() - 0.5) * 12,
      });
    }
    for (let i = 0; i < 14; i++) {
      this.umbrellas.push({
        x: 80 + random() * (WORLD_SIZE - 160),
        y: BEACH_ROW * TILE_SIZE + 22 + random() * (2 * TILE_SIZE - 44),
        color: pick(['#e2604f', '#3f8fb8', '#f2c14e', '#5fbf8a']),
      });
    }
  }

  addLanes() {
    for (const x of this.roadX) {
      for (const dir of [1, -1]) {
        this.lanes.push({ axis: 'v', dir, coord: x + (dir === 1 ? -32 : 32), min: 40, max: (BEACH_ROW - 1) * TILE_SIZE });
      }
    }
    for (const y of this.roadY) {
      for (const dir of [1, -1]) {
        this.lanes.push({ axis: 'h', dir, coord: y + (dir === 1 ? 32 : -32), min: 40, max: WORLD_SIZE - 40 });
      }
    }
  }

  addLandmarks() {
    const spot = (x, y) => this.walkableNear(x, y);
    this.landmarks.home = spot(this.roadX[1] + 92, this.roadY[1] + 92);
    this.landmarks.garage = spot(this.roadX[0] + 130, this.roadY[1] + 120);
    this.landmarks.downtown = spot(this.roadX[2] + 20, this.roadY[2] + 20);
    this.landmarks.docks = spot(this.roadX[0] + 110, this.roadY[4] + 110);
    this.landmarks.hospital = spot(this.roadX[4] + 96, this.roadY[0] + 96);
    this.landmarks.stadium = spot(this.roadX[5] + 110, this.roadY[4] + 110);
    this.landmarks.mall = spot(this.roadX[3] + 120, this.roadY[4] + 110);
    this.landmarks.airport = spot(this.roadX[5] + 120, this.roadY[0] + 100);
    this.landmarks.beach = spot(WORLD_SIZE * 0.48, BEACH_ROW * TILE_SIZE + 40);
    this.landmarks.pier = spot(this.roadX[5] - 80, BEACH_ROW * TILE_SIZE + 30);
    this.landmarks.park = this.parks.length ? { x: this.parks[0].x + this.parks[0].w / 2, y: this.parks[0].y + this.parks[0].h / 2 } : spot(this.roadX[3] + 100, this.roadY[2] + 100);
    this.landmarks.sea = { x: WORLD_SIZE * 0.5, y: (WATER_ROW + 1) * TILE_SIZE };
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) return TILE.WATER;
    return this.tiles[ty * GRID + tx];
  }

  tileAtWorld(x, y) {
    return this.tileAt(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  isRoadAt(x, y) {
    return this.tileAtWorld(x, y) === TILE.ROAD;
  }

  isWaterAt(x, y) {
    return this.tileAtWorld(x, y) === TILE.WATER;
  }

  isWalkable(x, y) {
    if (x < 8 || y < 8 || x > WORLD_SIZE - 8 || y > WORLD_SIZE - 8) return false;
    const t = this.tileAtWorld(x, y);
    if (t === TILE.WATER || t === TILE.BUILDING) return false;
    for (const b of this.buildings) if (circleRect(x, y, 2, b)) return false;
    return true;
  }

  walkableNear(x, y) {
    for (let r = 0; r < 14; r++) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const px = clamp(x + Math.cos(a) * r * 20, 20, WORLD_SIZE - 20);
        const py = clamp(y + Math.sin(a) * r * 20, 20, WORLD_SIZE - 20);
        if (this.isWalkable(px, py)) return { x: px, y: py };
      }
    }
    return { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
  }

  collideCircle(x, y, radius) {
    let hit = null;
    let nx = x;
    let ny = y;
    for (const b of this.buildings) {
      const r = resolveCircleRect(nx, ny, radius, b);
      if (r) {
        nx = r.x;
        ny = r.y;
        hit = r;
      }
    }
    const w = resolveCircleRect(nx, ny, radius, this.waterRect);
    if (w) {
      nx = w.x;
      ny = w.y;
      hit = w;
    }
    if (nx < radius) {
      nx = radius;
      hit = { nx: 1, ny: 0, hit: true };
    }
    if (ny < radius) {
      ny = radius;
      hit = { nx: 0, ny: 1, hit: true };
    }
    if (nx > WORLD_SIZE - radius) {
      nx = WORLD_SIZE - radius;
      hit = { nx: -1, ny: 0, hit: true };
    }
    if (ny > WORLD_SIZE - radius) {
      ny = WORLD_SIZE - radius;
      hit = { nx: 0, ny: -1, hit: true };
    }
    return hit ? { x: nx, y: ny, nx: hit.nx, ny: hit.ny, hit: true } : null;
  }

  moveCircle(x, y, radius, dx, dy) {
    const nx = x + dx;
    const ny = y + dy;
    const hit = this.collideCircle(nx, ny, radius);
    return hit ? { x: hit.x, y: hit.y, hit: true, nx: hit.nx, ny: hit.ny } : { x: nx, y: ny, hit: false, nx: 0, ny: 0 };
  }

  nearestRoad(x, y) {
    let best = null;
    let bd = Infinity;
    for (const rx of this.roadX) {
      const d = Math.abs(x - rx);
      if (d < bd) {
        bd = d;
        best = { x: rx, y: clamp(y, 40, (BEACH_ROW - 1) * TILE_SIZE), axis: 'v' };
      }
    }
    for (const ry of this.roadY) {
      const d = Math.abs(y - ry);
      if (d < bd) {
        bd = d;
        best = { x: clamp(x, 40, WORLD_SIZE - 40), y: ry, axis: 'h' };
      }
    }
    return best;
  }

  randomSidewalkNear(x, y, minR, maxR) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (px < 40 || py < 40 || px > WORLD_SIZE - 40 || py > (BEACH_ROW - 1) * TILE_SIZE) continue;
      const t = this.tileAtWorld(px, py);
      if ((t === TILE.SIDEWALK || t === TILE.SAND || t === TILE.PARK) && this.isWalkable(px, py)) return { x: px, y: py };
    }
    return this.walkableNear(x, y);
  }

  randomLaneNear(x, y, minR, maxR) {
    for (let i = 0; i < 40; i++) {
      const lane = pick(this.lanes);
      const along = lane.axis === 'h' ? x : y;
      const spread = minR + Math.random() * (maxR - minR);
      const side = Math.random() < 0.5 ? -1 : 1;
      let v = along + side * spread;
      v = clamp(v, lane.min + 60, lane.max - 60);
      if (lane.axis === 'h') return { x: v, y: lane.coord, lane };
      return { x: lane.coord, y: v, lane };
    }
    const p = this.walkableNear(x, y);
    return { x: p.x, y: p.y, lane: this.lanes[0] };
  }

  parkedSpot() {
    const lane = pick(this.lanes);
    const along = lane.min + 120 + Math.random() * (lane.max - lane.min - 240);
    const offset = lane.dir === 1 ? 18 : -18;
    if (lane.axis === 'h') {
      return { x: along, y: lane.coord + offset, angle: lane.dir === 1 ? 0 : Math.PI };
    }
    return { x: lane.coord + offset, y: along, angle: lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2 };
  }

  buildMinimap() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const g = c.getContext('2d');
    const s = 512 / GRID;
    const colors = {
      [TILE.GRASS]: '#41694a',
      [TILE.ROAD]: '#5a5f68',
      [TILE.SIDEWALK]: '#b7a98b',
      [TILE.BUILDING]: '#8b7d6a',
      [TILE.PARK]: '#4d8a56',
      [TILE.SAND]: '#d8c184',
      [TILE.WATER]: '#2f7f9c',
    };
    for (let ty = 0; ty < GRID; ty++) {
      for (let tx = 0; tx < GRID; tx++) {
        g.fillStyle = colors[this.tileAt(tx, ty)] || '#333';
        g.fillRect(tx * s, ty * s, s + 1, s + 1);
      }
    }
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (const rx of this.roadX) g.fillRect((rx / TILE_SIZE) * s - 1, 0, 2, (BEACH_ROW * TILE_SIZE / TILE_SIZE) * s);
    for (const ry of this.roadY) g.fillRect(0, (ry / TILE_SIZE) * s - 1, 512, 2);
    this.minimapCanvas = c;
  }

  renderGround(ctx, camera, time) {
    const view = camera.viewRect();
    const x0 = Math.max(0, Math.floor(view.x / TILE_SIZE));
    const y0 = Math.max(0, Math.floor(view.y / TILE_SIZE));
    const x1 = Math.min(GRID - 1, Math.ceil((view.x + view.w) / TILE_SIZE));
    const y1 = Math.min(GRID - 1, Math.ceil((view.y + view.h) / TILE_SIZE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.tileAt(tx, ty);
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;
        if (t === TILE.ROAD) {
          ctx.fillStyle = COLORS.road;
          ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
        } else if (t === TILE.SIDEWALK) {
          ctx.fillStyle = COLORS.sidewalk;
          ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
          ctx.fillStyle = COLORS.sidewalkEdge;
          ctx.fillRect(x, y, TILE_SIZE + 1, 3);
          ctx.fillRect(x, y, 3, TILE_SIZE + 1);
        } else if (t === TILE.PARK || t === TILE.GRASS) {
          ctx.fillStyle = t === TILE.PARK ? COLORS.park : COLORS.grass;
          ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
          if ((tx + ty) % 5 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(x + 8, y + 10, TILE_SIZE - 16, TILE_SIZE - 20);
          }
        } else if (t === TILE.SAND) {
          ctx.fillStyle = COLORS.sand;
          ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
          ctx.fillStyle = COLORS.sandDark;
          for (let i = 0; i < 3; i++) {
            const px = x + ((tx * 17 + i * 23) % TILE_SIZE);
            const py = y + ((ty * 29 + i * 19) % TILE_SIZE);
            ctx.fillRect(px, py, 3, 2);
          }
        } else if (t === TILE.WATER) {
          const depth = (ty - WATER_ROW) / (GRID - WATER_ROW);
          ctx.fillStyle = depth > 0.4 ? COLORS.waterDeep : COLORS.water;
          ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
          ctx.strokeStyle = 'rgba(255,255,255,0.14)';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 2; i++) {
            const wy = y + 16 + i * 26 + Math.sin(time * 1.3 + tx + ty + i) * 4;
            ctx.beginPath();
            ctx.moveTo(x + 6, wy);
            ctx.quadraticCurveTo(x + TILE_SIZE / 2, wy + 5, x + TILE_SIZE - 6, wy);
            ctx.stroke();
          }
        }
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, WATER_ROW * TILE_SIZE);
    ctx.lineTo(WORLD_SIZE, WATER_ROW * TILE_SIZE);
    ctx.stroke();

    const top = Math.max(0, view.y);
    const bottom = Math.min((BEACH_ROW - 1) * TILE_SIZE, view.y + view.h);
    for (const x of this.roadX) {
      if (x < view.x - 80 || x > view.x + view.w + 80) continue;
      ctx.strokeStyle = COLORS.lane;
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 16]);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      for (const side of [-58, 58]) {
        ctx.beginPath();
        ctx.moveTo(x + side, top);
        ctx.lineTo(x + side, bottom);
        ctx.stroke();
      }
    }
    for (const y of this.roadY) {
      if (y < view.y - 80 || y > view.y + view.h + 80) continue;
      ctx.strokeStyle = COLORS.lane;
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 16]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_SIZE, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      for (const side of [-58, 58]) {
        ctx.beginPath();
        ctx.moveTo(0, y + side);
        ctx.lineTo(WORLD_SIZE, y + side);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const x of this.roadX) {
      for (const y of this.roadY) {
        if (x < view.x - 120 || x > view.x + view.w + 120 || y < view.y - 120 || y > view.y + view.h + 120) continue;
        for (let i = -2; i <= 2; i++) {
          ctx.fillRect(x - 54, y + i * 18 - 4, 108, 7);
          ctx.fillRect(x + i * 18 - 4, y - 54, 7, 108);
        }
      }
    }
  }

  renderBuildings(ctx, camera) {
    const view = camera.viewRect();
    const visible = this.buildings.filter((b) => b.x + b.w > view.x - 40 && b.x < view.x + view.w + 40 && b.y + b.h > view.y - 40 && b.y < view.y + view.h + 40);
    visible.sort((a, b) => a.y - b.y);
    for (const b of visible) {
      const lift = b.height * 0.14;
      ctx.fillStyle = 'rgba(20,24,32,0.24)';
      ctx.fillRect(b.x + 14, b.y + 18, b.w, b.h);
      ctx.fillStyle = shade(b.color, -0.35);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - lift * 0.55, b.y - lift, b.w, b.h);
      ctx.fillStyle = shade(b.roof, 0.06);
      ctx.fillRect(b.x - lift * 0.55 + 5, b.y - lift + 5, b.w - 10, b.h - 10);
      ctx.strokeStyle = shade(b.roof, -0.2);
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - lift * 0.55 + 5, b.y - lift + 5, b.w - 10, b.h - 10);
      for (const ac of b.ac) {
        ctx.fillStyle = '#8d918f';
        ctx.fillRect(ac.x - lift * 0.55, ac.y - lift, ac.w, ac.h);
        ctx.fillStyle = '#b8bcb8';
        ctx.fillRect(ac.x - lift * 0.55 + 2, ac.y - lift + 2, ac.w - 4, ac.h - 4);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(b.x - lift * 0.55 + 8, b.y - lift + 8, b.w - 16, 4);
      ctx.fillStyle = 'rgba(30,40,50,0.18)';
      for (let wy = b.y + 14; wy < b.y + b.h - 10; wy += 18) {
        ctx.fillRect(b.x + 8, wy, b.w - 16, 3);
      }
    }
  }

  renderProps(ctx, camera, time) {
    const view = camera.viewRect();
    for (const p of this.parks) {
      if (p.x + p.w < view.x - 40 || p.x > view.x + view.w + 40 || p.y + p.h < view.y - 40 || p.y > view.y + view.h + 40) continue;
      ctx.fillStyle = 'rgba(225,214,180,0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.36, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, 8, p.h * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const t of this.trees) {
      if (t.x < view.x - 40 || t.x > view.x + view.w + 40 || t.y < view.y - 40 || t.y > view.y + view.h + 40) continue;
      ctx.fillStyle = 'rgba(20,30,20,0.2)';
      ctx.beginPath();
      ctx.ellipse(t.x + 6, t.y + 7, t.r * 1.05, t.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(t.x - 3, t.y - 2, 6, 12);
      ctx.fillStyle = t.tone;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 4, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.5, t.r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of this.palms) {
      if (p.x < view.x - 50 || p.x > view.x + view.w + 50 || p.y < view.y - 50 || p.y > view.y + view.h + 50) continue;
      ctx.fillStyle = 'rgba(60,40,20,0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x + 8, p.y + 6, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6a42';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 8);
      ctx.quadraticCurveTo(p.x + p.lean, p.y - p.h * 0.5, p.x + p.lean * 1.4, p.y - p.h);
      ctx.stroke();
      ctx.fillStyle = '#4f8a4e';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.sin(time + p.x) * 0.03;
        ctx.beginPath();
        ctx.ellipse(p.x + p.lean * 1.4 + Math.cos(a) * 11, p.y - p.h + Math.sin(a) * 7, 13, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const u of this.umbrellas) {
      if (u.x < view.x - 40 || u.x > view.x + view.w + 40 || u.y < view.y - 40 || u.y > view.y + view.h + 40) continue;
      ctx.fillStyle = 'rgba(40,30,20,0.16)';
      ctx.beginPath();
      ctx.ellipse(u.x + 5, u.y + 5, 17, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = u.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.arc(u.x, u.y, 15, -2.6, -1.6);
      ctx.closePath();
      ctx.fill();
    }
  }
}
