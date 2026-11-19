// menus.js — start screen (canvas-drawn title art), pause menu, save/load
// slot screens, controls help, settings (volume), mission text screens,
// and WASTED / BUSTED overlays. Pure canvas drawing + keyboard menu input.

import { holding, pressed } from './input.js';
import { audio } from './audio.js';
import { SLOTS, slotInfo, saveGame, loadGame, applySave, clearSave } from './savegame.js';
import { MISSION_DEFS } from './story.js';

export const MENU = {
  MAIN: 'main',
  SLOTS_LOAD: 'slotsLoad',
  SLOTS_SAVE: 'slotsSave',
  CONTROLS: 'controls',
  SETTINGS: 'settings',
  PAUSE: 'pause',
  MISSION_TEXT: 'missionText',
  MISSION_OUTRO: 'missionOutro',
  WASTED: 'wasted',
  BUSTED: 'busted',
};

export class MenuState {
  constructor() {
    this.screen = MENU.MAIN;
    this.choice = 0;
    this.time = 0;
    this.textLines = [];   // for mission text
    this.textDone = 0;     // typewriter progress
    this.pendingMission = null;
  }
}

export function updateMenus(m, world, dt) {
  m.time += dt;
  const items = menuItems(m, world);
  const n = items.length;
  if (n > 0) {
    if (pressed('w') || pressed('arrowup') || pressed('w')) m.choice = (m.choice - 1 + n) % n;
    if (pressed('s') || pressed('arrowdown')) m.choice = (m.choice + 1) % n;
    m.choice = ((m.choice % n) + n) % n;
  }
  if ((pressed('enter') || pressed(' ')) && n > 0) {
    audio.click();
    activate(m, items[m.choice], world);
  }
  if (m.screen === MENU.MISSION_TEXT || m.screen === MENU.MISSION_OUTRO) {
    m.textDone += dt * 40; // chars per second typewriter
  }
  if (pressed('escape')) {
    if (m.screen !== MENU.MAIN && m.screen !== MENU.MISSION_TEXT && m.screen !== MENU.MISSION_OUTRO) {
      if (m.screen === MENU.PAUSE) { m.screen = null; world.state.paused = false; }
      else if (world.gameStarted) { m.screen = MENU.PAUSE; world.state.paused = true; }
      else m.screen = MENU.MAIN;
      audio.click();
    }
  }
}

function menuItems(m, world) {
  switch (m.screen) {
    case MENU.MAIN:
      return ['NEW GAME', 'CONTINUE', 'CONTROLS', 'SETTINGS'];
    case MENU.PAUSE:
      return ['RESUME', 'SAVE GAME', 'LOAD GAME', 'CONTROLS', 'SETTINGS', 'QUIT TO MENU'];
    case MENU.SLOTS_LOAD:
    case MENU.SLOTS_SAVE:
      return ['SLOT 1', 'SLOT 2', 'SLOT 3', 'BACK'];
    case MENU.CONTROLS:
      return ['BACK'];
    case MENU.SETTINGS:
      return ['MASTER VOLUME —', 'MASTER VOLUME +', 'BACK'];
    default:
      return [];
  }
}

function activate(m, item, world) {
  switch (item) {
    case 'NEW GAME':
      world.newGame();
      m.screen = null;
      break;
    case 'CONTINUE': {
      const d = loadGame('auto') || loadGame('1');
      if (d) { world.continueGame(d); m.screen = null; }
      else { world.toast('No save data found.'); }
      break;
    }
    case 'RESUME':
      m.screen = null;
      world.state.paused = false;
      break;
    case 'SAVE GAME':
      m.screen = MENU.SLOTS_SAVE;
      break;
    case 'LOAD GAME':
      m.screen = MENU.SLOTS_LOAD;
      break;
    case 'SLOT 1': case 'SLOT 2': case 'SLOT 3': {
      const slot = item.slice(-1).toLowerCase();
      if (m.screen === MENU.SLOTS_SAVE) {
        saveGame(slot, world);
        world.toast(`Saved to slot ${slot.toUpperCase()}.`);
      } else {
        const d = loadGame(slot);
        if (d) { applySave(d, world); m.screen = null; world.toast(`Loaded slot ${slot.toUpperCase()}.`); }
        else world.toast('Empty slot.');
      }
      break;
    }
    case 'BACK':
      m.screen = world.gameStarted ? MENU.PAUSE : MENU.MAIN;
      break;
    case 'MASTER VOLUME —':
      world.setVolume(Math.max(0, world.volume - 0.1));
      break;
    case 'MASTER VOLUME +':
      world.setVolume(Math.min(1, world.volume + 0.1));
      break;
    case 'QUIT TO MENU':
      world.autosave();
      m.screen = MENU.MAIN;
      world.gameStarted = false;
      break;
  }
}

// ---------------- drawing ----------------

export function drawMenus(ctx, m, world, W, H) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const t = m.time;
  switch (m.screen) {
    case MENU.MAIN: drawTitle(ctx, W, H, t, world); drawMenuList(ctx, m, W, H, world); break;
    case MENU.PAUSE: dim(ctx, W, H); bigText(ctx, 'PAUSED', W, H, 0.32); drawMenuList(ctx, m, W, H, world, 0.45); break;
    case MENU.SLOTS_LOAD: case MENU.SLOTS_SAVE:
      dim(ctx, W, H);
      bigText(ctx, m.screen === MENU.SLOTS_SAVE ? 'SAVE GAME' : 'LOAD GAME', W, H, 0.2);
      drawMenuList(ctx, m, W, H, world, 0.34, true);
      break;
    case MENU.CONTROLS: dim(ctx, W, H); drawControls(ctx, W, H); break;
    case MENU.SETTINGS: dim(ctx, W, H); bigText(ctx, 'SETTINGS', W, H, 0.2); drawMenuList(ctx, m, W, H, world, 0.36, true); drawVolume(ctx, world, W, H); break;
    case MENU.MISSION_TEXT: drawStoryText(ctx, m, W, H, 'INCOMING CALL'); break;
    case MENU.MISSION_OUTRO: drawStoryText(ctx, m, W, H, 'MISSION PASSED'); break;
    case MENU.WASTED: redFlash(ctx, W, H, 'WASTED'); break;
    case MENU.BUSTED: blueFlash(ctx, W, H, 'BUSTED'); break;
  }
  ctx.restore();
}

function dim(ctx, W, H) {
  ctx.fillStyle = 'rgba(6,8,14,0.72)';
  ctx.fillRect(0, 0, W, H);
}

function bigText(ctx, text, W, H, yFrac) {
  ctx.font = 'bold 54px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2f2f2';
  ctx.fillText(text, W / 2, H * yFrac);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, W, H, t, world) {
  // sunset gradient backdrop
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#171130');
  g.addColorStop(0.55, '#68306b');
  g.addColorStop(0.85, '#e0765a');
  g.addColorStop(1, '#f2b45a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // sun
  const sunY = H * 0.72 + Math.sin(t * 0.4) * 4;
  const sg = ctx.createRadialGradient(W / 2, sunY, 10, W / 2, sunY, 130);
  sg.addColorStop(0, '#ffe9a8');
  sg.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(W / 2, sunY, 130, 0, Math.PI * 2); ctx.fill();

  // skyline silhouette (procedural)
  ctx.fillStyle = 'rgba(20,14,30,0.9)';
  let x = -20;
  let seed = 5;
  while (x < W + 40) {
    const w = 40 + ((seed * 7919) % 80);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const h = 60 + ((seed >> 8) % 160);
    ctx.fillRect(x, H * 0.78 - h, w, h);
    // windows
    ctx.fillStyle = 'rgba(255,210,120,0.7)';
    for (let wy = H * 0.78 - h + 10; wy < H * 0.78 - 8; wy += 16) {
      if (((seed + wy) >> 4) % 3 === 0) ctx.fillRect(x + 8, wy, 6, 8);
    }
    ctx.fillStyle = 'rgba(20,14,30,0.9)';
    x += w + 8;
  }
  // palm silhouettes
  drawPalm(ctx, W * 0.12, H * 0.79, 1.1, t, 'rgba(20,14,30,0.95)');
  drawPalm(ctx, W * 0.88, H * 0.8, 1.3, t + 2, 'rgba(20,14,30,0.95)');

  // title
  ctx.textAlign = 'center';
  ctx.font = 'bold 84px "Segoe UI Black", "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('SOLANO CITY', W / 2 + 4, H * 0.34 + 4);
  const tg = ctx.createLinearGradient(0, H * 0.22, 0, H * 0.4);
  tg.addColorStop(0, '#ffd166');
  tg.addColorStop(0.6, '#ff8a5c');
  tg.addColorStop(1, '#e84f6a');
  ctx.fillStyle = tg;
  ctx.fillText('SOLANO CITY', W / 2, H * 0.34);
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillStyle = '#f6e7c1';
  ctx.fillText('— an open-world crime story —', W / 2, H * 0.34 + 44);
  ctx.textAlign = 'left';
}

function drawPalm(ctx, x, y, s, t, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.fillRect(-3, -90, 6, 90);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38 + Math.sin(t + i) * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.quadraticCurveTo(Math.cos(a) * 40, -90 + Math.sin(a) * 40 - 14, Math.cos(a) * 62, -90 + Math.sin(a) * 55 + 16);
    ctx.lineWidth = 7;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMenuList(ctx, m, W, H, world, yFrac = 0.52, small = false) {
  const items = menuItems(m, world);
  const y0 = H * yFrac;
  ctx.textAlign = 'center';
  items.forEach((it, i) => {
    const y = y0 + i * (small ? 40 : 48);
    const selected = i === m.choice;
    ctx.font = `bold ${small ? 22 : 26}px "Segoe UI", sans-serif`;
    if (selected) {
      ctx.fillStyle = 'rgba(255,209,102,0.18)';
      const w = ctx.measureText(it).width;
      ctx.fillRect(W / 2 - w / 2 - 20, y - 26, w + 40, 34);
      ctx.fillStyle = '#ffd166';
      ctx.fillText('▶ ' + it, W / 2, y);
    } else {
      ctx.fillStyle = 'rgba(240,240,240,0.85)';
      ctx.fillText(it, W / 2, y);
    }
    // slot info
    if ((m.screen === 'slotsLoad' || m.screen === 'slotsSave') && it.startsWith('SLOT')) {
      const info = slotInfo(it.slice(-1).toLowerCase());
      if (info) {
        ctx.font = '13px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        const d = new Date(info.savedAt);
        ctx.fillText(`Mission ${info.missionIndex}/8 · $${info.money} · ${d.toLocaleDateString()}`, W / 2, y + 20);
      } else {
        ctx.font = '13px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('(empty)', W / 2, y + 20);
      }
      ctx.font = `bold ${small ? 22 : 26}px "Segoe UI", sans-serif`;
    }
  });
  ctx.textAlign = 'left';
}

function drawVolume(ctx, world, W, H) {
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`VOLUME: ${Math.round(world.volume * 100)}%  [${'█'.repeat(Math.round(world.volume * 10))}${'░'.repeat(10 - Math.round(world.volume * 10))}]`, W / 2, H * 0.36 + 130);
  ctx.textAlign = 'left';
}

function drawControls(ctx, W, H) {
  bigText(ctx, 'CONTROLS', W, H, 0.18);
  const lines = [
    'WASD — move / drive',
    'SHIFT — sprint',
    'MOUSE — aim · LEFT CLICK — shoot',
    'E — enter / exit vehicle (carjack)',
    'Q — cycle weapons',
    'F or H — horn',
    'SPACE — brake / handbrake',
    'M — answer the phone (start next mission)',
    'ESC — pause menu',
    '',
    'Crimes raise your wanted level. Lay low to lose the cops.',
    'Wasted = hospital. Busted = precinct. Both cost money.',
  ];
  ctx.font = '19px "Segoe UI", sans-serif';
  ctx.fillStyle = '#eee';
  lines.forEach((l, i) => ctx.fillText(l, W / 2 - 200, H * 0.3 + i * 30));
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('Press ENTER to go back', W / 2 - 200, H * 0.3 + lines.length * 30 + 20);
}

function drawStoryText(ctx, m, W, H, header) {
  dim(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('☎ ' + header, W / 2, H * 0.18);
  const shown = m.textLines.join('\n').slice(0, Math.floor(m.textDone));
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#f2f2f2';
  wrapText(ctx, shown, W / 2, H * 0.3, W * 0.7, 32);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('ENTER to continue', W / 2, H * 0.82);
  ctx.textAlign = 'left';
}

function redFlash(ctx, W, H, text) {
  ctx.fillStyle = 'rgba(60,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 90px "Segoe UI Black", sans-serif';
  ctx.fillStyle = '#c93131';
  ctx.fillText(text, W / 2, H / 2);
  ctx.textAlign = 'left';
}

function blueFlash(ctx, W, H, text) {
  ctx.fillStyle = 'rgba(0,10,50,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 90px "Segoe UI Black", sans-serif';
  ctx.fillStyle = '#4a7fe8';
  ctx.fillText(text, W / 2, H / 2);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const paras = text.split('\n');
  let yy = y;
  for (const para of paras) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.textAlign = 'center';
        ctx.fillText(line, cx, yy);
        line = w; yy += lh;
      } else line = test;
    }
    ctx.textAlign = 'center';
    if (line) ctx.fillText(line, cx, yy);
    yy += lh;
  }
  ctx.textAlign = 'left';
}

export const MENU_HOLDING = holding; // keep import used
