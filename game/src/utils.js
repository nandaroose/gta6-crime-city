// Small math, geometry and formatting helpers shared by the game modules.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

export function rand(min = 0, max = 1) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.random() * (max - min);
}

export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const chance = (p) => Math.random() < p;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};
export const dist = (x1, y1, x2, y2) => Math.sqrt(dist2(x1, y1, x2, y2));
export const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

export function normAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export const angleDelta = (from, to) => normAngle(to - from);
export const lerpAngle = (a, b, t) => a + angleDelta(a, b) * t;
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function circleRect(x, y, radius, r) {
  const cx = clamp(x, r.x, r.x + r.w);
  const cy = clamp(y, r.y, r.y + r.h);
  return dist2(x, y, cx, cy) <= radius * radius;
}

export function resolveCircleRect(x, y, radius, r) {
  const cx = clamp(x, r.x, r.x + r.w);
  const cy = clamp(y, r.y, r.y + r.h);
  let dx = x - cx;
  let dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 > radius * radius) return null;
  if (d2 < 0.0001) {
    const left = x - r.x;
    const right = r.x + r.w - x;
    const top = y - r.y;
    const bottom = r.y + r.h - y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: r.x - radius, y, nx: -1, ny: 0, hit: true };
    if (m === right) return { x: r.x + r.w + radius, y, nx: 1, ny: 0, hit: true };
    if (m === top) return { x, y: r.y - radius, nx: 0, ny: -1, hit: true };
    return { x, y: r.y + r.h + radius, nx: 0, ny: 1, hit: true };
  }
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  return { x: cx + nx * radius, y: cy + ny * radius, nx, ny, hit: true };
}

export function segmentCircle(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  if (len < 0.0001) return dist2(x1, y1, cx, cy) <= radius * radius;
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len;
  t = clamp(t, 0, 1);
  return dist2(x1 + dx * t, y1 + dy * t, cx, cy) <= radius * radius;
}

export function formatMoney(n) {
  const v = Math.round(Math.abs(n));
  const s = '$' + v.toLocaleString('en-US');
  return n < 0 ? '-' + s : s;
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}

export function formatTimeOfDay(hours) {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return hh + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

export function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function shade(hex, amount) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  let r = parseInt(n.slice(0, 2), 16);
  let g = parseInt(n.slice(2, 4), 16);
  let b = parseInt(n.slice(4, 6), 16);
  if (amount >= 0) {
    r = Math.round(lerp(r, 255, amount));
    g = Math.round(lerp(g, 255, amount));
    b = Math.round(lerp(b, 255, amount));
  } else {
    r = Math.round(r * (1 + amount));
    g = Math.round(g * (1 + amount));
    b = Math.round(b * (1 + amount));
  }
  return '#' + [r, g, b].map((v) => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
