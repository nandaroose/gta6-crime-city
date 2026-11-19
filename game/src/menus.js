import { CONTROLS } from './story.js';
import { hasSave, saveGame, loadGame, saveSettings } from './savegame.js';
import { notify } from './combat.js';
import { roundRect } from './utils.js';

export function getMenu(game) {
  const state = game.state;
  if (state === 'title') {
    return {
      title: 'SOLANO CITY',
      subtitle: 'A top-down crime saga',
      kind: 'title',
      items: [
        { label: 'New Game', action: 'new' },
        { label: 'Continue', action: 'load', disabled: !hasSave() },
        { label: 'Controls', action: 'controls' },
        { label: 'Settings', action: 'settings' }
      ]
    };
  }
  if (state === 'paused') {
    return {
      title: 'PAUSED',
      subtitle: 'The city waits.',
      kind: 'paused',
      items: [
        { label: 'Resume', action: 'resume' },
        { label: 'Save Game', action: 'save' },
        { label: 'Load Game', action: 'load', disabled: !hasSave() },
        { label: 'Controls', action: 'controls' },
        { label: 'Settings', action: 'settings' },
        { label: 'Main Menu', action: 'title' }
      ]
    };
  }
  if (state === 'controls') {
    return {
      title: 'CONTROLS',
      subtitle: '',
      kind: 'controls',
      items: [{ label: 'Back', action: 'back' }]
    };
  }
  if (state === 'settings') {
    return {
      title: 'SETTINGS',
      subtitle: '',
      kind: 'settings',
      items: [
        { label: 'Volume', action: 'volume', slider: true },
        { label: 'Minimap', action: 'minimap', toggle: game.settings.minimap },
        { label: 'Screen Shake', action: 'shake', toggle: game.settings.shake },
        { label: 'Back', action: 'back' }
      ]
    };
  }
  if (state === 'dead') {
    return {
      title: 'WASTED',
      subtitle: 'Solano City chewed you up.',
      kind: 'dead',
      items: [
        { label: 'Respawn', action: 'respawn' },
        { label: 'Load Game', action: 'load', disabled: !hasSave() },
        { label: 'Main Menu', action: 'title' }
      ]
    };
  }
  return null;
}

function buildLayout(game, menu) {
  const cw = game.canvas.width;
  const ch = game.canvas.height;
  const panelW = Math.min(500, cw - 40);
  const extra = menu.kind === 'controls' ? CONTROLS.length * 28 + 16 : 0;
  const itemH = 48;
  const gap = 10;
  const panelH = 148 + extra + menu.items.length * (itemH + gap);
  const px = (cw - panelW) / 2;
  const py = Math.max(20, (ch - panelH) / 2);
  const items = menu.items.map((it, i) => ({
    ...it,
    x: px + 34,
    y: py + 128 + extra + i * (itemH + gap),
    w: panelW - 68,
    h: itemH
  }));
  return { px, py, panelW, panelH, items, extra };
}

export function drawMenu(game) {
  const menu = getMenu(game);
  if (!menu) return;
  const ctx = game.ctx;
  const w = game.canvas.width;
  const h = game.canvas.height;
  const layout = buildLayout(game, menu);

  ctx.save();
  ctx.fillStyle = menu.kind === 'title' ? 'rgba(6,8,12,0.78)' : 'rgba(6,8,12,0.7)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(14,17,22,0.94)';
  roundRect(ctx, layout.px, layout.py, layout.panelW, layout.panelH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  const titleColor = menu.kind === 'dead' ? '#e05050' : '#ffd75a';
  ctx.fillStyle = titleColor;
  ctx.font = menu.kind === 'title' ? 'bold 46px system-ui, sans-serif' : 'bold 34px system-ui, sans-serif';
  ctx.fillText(menu.title, w / 2, layout.py + 62);
  if (menu.subtitle) {
    ctx.fillStyle = '#9aa3b0';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(menu.subtitle, w / 2, layout.py + 90);
  }

  if (menu.kind === 'controls') {
    ctx.font = 'bold 14px system-ui, sans-serif';
    for (let i = 0; i < CONTROLS.length; i++) {
      const rowY = layout.py + 122 + i * 28;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd75a';
      ctx.fillText(CONTROLS[i][0], layout.px + 44, rowY);
      ctx.fillStyle = '#c8ced8';
      ctx.textAlign = 'right';
      ctx.fillText(CONTROLS[i][1], layout.px + layout.panelW - 44, rowY);
    }
  }

  for (let i = 0; i < layout.items.length; i++) {
    const it = layout.items[i];
    const selected = i === game.menuIndex;
    ctx.textAlign = 'left';
    if (selected) {
      ctx.fillStyle = it.disabled ? 'rgba(120,120,120,0.2)' : 'rgba(255,215,90,0.92)';
      roundRect(ctx, it.x, it.y, it.w, it.h, 8);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRect(ctx, it.x, it.y, it.w, it.h, 8);
      ctx.fill();
    }
    ctx.fillStyle = it.disabled ? '#5c626b' : selected ? '#161a20' : '#e2e6ee';
    ctx.font = 'bold 16px system-ui, sans-serif';
    let label = it.label;
    if (it.toggle !== undefined) label += '   ' + (it.toggle ? 'ON' : 'OFF');
    if (it.slider) label += '   ' + Math.round(game.settings.volume * 100) + '%';
    ctx.fillText(label, it.x + 18, it.y + it.h / 2 + 6);

    if (it.slider) {
      const bx = it.x + it.w - 150;
      const by = it.y + it.h / 2 - 4;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, bx, by, 110, 8, 4);
      ctx.fill();
      ctx.fillStyle = selected ? '#161a20' : '#ffd75a';
      roundRect(ctx, bx, by, 110 * game.settings.volume, 8, 4);
      ctx.fill();
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6f7783';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('↑ ↓ select     ENTER confirm     ESC back', w / 2, layout.py + layout.panelH - 18);
  ctx.restore();
}

export function activateMenu(game, action) {
  if (game.audio) game.audio.ui();
  if (action === 'new') {
    game.newGame();
    return;
  }
  if (action === 'load') {
    if (loadGame(game)) {
      notify(game, 'Game loaded', '#8ce09a');
      game.state = 'playing';
      game.menuIndex = 0;
    } else {
      notify(game, 'No save found', '#e86a6a');
    }
    return;
  }
  if (action === 'save') {
    if (saveGame(game)) notify(game, 'Game saved', '#8ce09a');
    else notify(game, 'Save failed', '#e86a6a');
    return;
  }
  if (action === 'controls' || action === 'settings') {
    game.menuReturn = game.state;
    game.state = action;
    game.menuIndex = 0;
    return;
  }
  if (action === 'back') {
    game.state = game.menuReturn || 'paused';
    game.menuIndex = 0;
    return;
  }
  if (action === 'resume') {
    game.state = 'playing';
    if (game.player.inVehicle) game.audio.engineStart();
    return;
  }
  if (action === 'respawn') {
    game.respawn();
    return;
  }
  if (action === 'title') {
    game.state = 'title';
    game.menuIndex = 0;
    if (game.audio) {
      game.audio.engineStop();
      game.audio.sirenStop();
    }
    return;
  }
  if (action === 'minimap') {
    game.settings.minimap = !game.settings.minimap;
    saveSettings(game.settings);
    return;
  }
  if (action === 'shake') {
    game.settings.shake = !game.settings.shake;
    saveSettings(game.settings);
  }
}

export function handleMenuKey(game, code) {
  const menu = getMenu(game);
  if (!menu) return;
  const count = menu.items.length;
  if (code === 'ArrowUp' || code === 'KeyW') {
    game.menuIndex = (game.menuIndex - 1 + count) % count;
    if (game.audio) game.audio.ui();
    return;
  }
  if (code === 'ArrowDown' || code === 'KeyS') {
    game.menuIndex = (game.menuIndex + 1) % count;
    if (game.audio) game.audio.ui();
    return;
  }
  if (code === 'ArrowLeft' || code === 'ArrowRight') {
    const item = menu.items[game.menuIndex];
    if (item && item.slider) {
      const delta = code === 'ArrowLeft' ? -0.1 : 0.1;
      game.settings.volume = Math.max(0, Math.min(1, Math.round((game.settings.volume + delta) * 10) / 10));
      if (game.audio) game.audio.setVolume(game.settings.volume);
      saveSettings(game.settings);
    }
    return;
  }
  if (code === 'Enter' || code === 'Space') {
    const item = menu.items[game.menuIndex];
    if (item && !item.disabled) activateMenu(game, item.action);
    return;
  }
  if (code === 'Escape') {
    if (game.state === 'controls' || game.state === 'settings') {
      game.state = game.menuReturn || 'paused';
      game.menuIndex = 0;
    } else if (game.state === 'paused') {
      game.state = 'playing';
    }
  }
}

export function menuClick(game, mx, my) {
  const menu = getMenu(game);
  if (!menu) return false;
  const layout = buildLayout(game, menu);
  for (let i = 0; i < layout.items.length; i++) {
    const it = layout.items[i];
    if (mx < it.x || mx > it.x + it.w || my < it.y || my > it.y + it.h) continue;
    if (it.disabled) return true;
    game.menuIndex = i;
    if (it.slider) {
      const bx = it.x + it.w - 150;
      const ratio = Math.max(0, Math.min(1, (mx - bx) / 110));
      game.settings.volume = Math.round(ratio * 10) / 10;
      if (game.audio) {
        game.audio.setVolume(game.settings.volume);
        game.audio.ui();
      }
      saveSettings(game.settings);
      return true;
    }
    activateMenu(game, it.action);
    return true;
  }
  return false;
}
