const rand = (a, b) => a + Math.random() * (b - a);

function push(list, p) {
  if (list.length > 900) list.shift();
  list.push(p);
}

export function spawnBlood(list, x, y, angle, count = 6) {
  for (let i = 0; i < count; i++) {
    const a = angle + rand(-0.9, 0.9);
    const sp = rand(30, 150);
    push(list, {
      type: 'blood', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.3, 0.7), max: 0.7, size: rand(1.5, 3.4),
      drag: 3, color: Math.random() < 0.3 ? '#8d1f1f' : '#b52a2a'
    });
  }
}

export function spawnSparks(list, x, y, angle, count = 5) {
  for (let i = 0; i < count; i++) {
    const a = angle + rand(-1.1, 1.1);
    const sp = rand(60, 240);
    push(list, {
      type: 'spark', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.12, 0.3), max: 0.3, size: rand(1, 2.2),
      drag: 1, color: Math.random() < 0.5 ? '#ffd27a' : '#fff2c0'
    });
  }
}

export function spawnMuzzle(list, x, y, angle) {
  for (let i = 0; i < 4; i++) {
    const a = angle + rand(-0.35, 0.35);
    const sp = rand(80, 200);
    push(list, {
      type: 'spark', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.05, 0.12), max: 0.12, size: rand(1.5, 3),
      drag: 1, color: '#ffe6a0'
    });
  }
  push(list, {
    type: 'muzzle', x, y, vx: 0, vy: 0,
    life: 0.06, max: 0.06, size: 13, drag: 0, color: '#fff0b0'
  });
}

export function spawnSmoke(list, x, y, amount = 1, dark = false) {
  for (let i = 0; i < amount; i++) {
    push(list, {
      type: 'smoke', x: x + rand(-6, 6), y: y + rand(-6, 6),
      vx: rand(-14, 14), vy: rand(-30, -10),
      life: rand(0.5, 1.3), max: 1.3, size: rand(5, 12),
      drag: 0.4, color: dark ? 'rgba(30,30,30,0.5)' : 'rgba(170,170,170,0.35)'
    });
  }
}

export function spawnDust(list, x, y) {
  push(list, {
    type: 'dust', x, y, vx: rand(-20, 20), vy: rand(-20, 20),
    life: 0.35, max: 0.35, size: rand(6, 11), drag: 2, color: 'rgba(200,190,170,0.35)'
  });
}

export function spawnExplosion(list, x, y) {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(40, 320);
    push(list, {
      type: 'fire', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.25, 0.8), max: 0.8, size: rand(3, 9),
      drag: 2.4, color: Math.random() < 0.4 ? '#ffd06a' : Math.random() < 0.6 ? '#ff8a3a' : '#e8502a'
    });
  }
  for (let i = 0; i < 14; i++) {
    push(list, {
      type: 'smoke', x: x + rand(-14, 14), y: y + rand(-14, 14),
      vx: rand(-60, 60), vy: rand(-80, -10),
      life: rand(0.8, 1.8), max: 1.8, size: rand(9, 20),
      drag: 0.5, color: 'rgba(40,40,40,0.55)'
    });
  }
  push(list, {
    type: 'flash', x, y, vx: 0, vy: 0,
    life: 0.18, max: 0.18, size: 70, drag: 0, color: 'rgba(255,230,160,0.8)'
  });
}

export function spawnTracer(list, x, y, x2, y2) {
  push(list, {
    type: 'tracer', x, y, x2, y2, vx: 0, vy: 0,
    life: 0.07, max: 0.07, size: 1.5, drag: 0, color: '#ffe08a'
  });
}

export function updateParticles(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const d = Math.max(0, 1 - p.drag * dt);
    p.vx *= d;
    p.vy *= d;
    if (p.type === 'smoke') p.vy -= 6 * dt;
  }
}

export function drawParticles(ctx, list) {
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const t = Math.max(0, p.life / p.max);
    ctx.globalAlpha = t;
    if (p.type === 'tracer') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x2, p.y2);
      ctx.stroke();
    } else if (p.type === 'smoke') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'flash') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.2 - t * 0.2), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * t), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
