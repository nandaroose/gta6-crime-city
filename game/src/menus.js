// Title screen, pause menu, controls, settings and the save/load slots.

import { GAME_TITLE, GAME_SUBTITLE } from './config.js';
import { formatMoney } from './utils.js';

export class Menus {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('overlay');
    this.mode = null;
    this.backMode = 'title';
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('input', (e) => this.onInput(e));
  }

  show(html, mode) {
    this.el.innerHTML = html;
    this.el.classList.add('visible');
    this.el.classList.remove('hidden');
    this.mode = mode;
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
    this.el.innerHTML = '';
    this.mode = null;
  }

  showTitle() {
    this.backMode = 'title';
    const saves = this.game.saveGame.list();
    const canContinue = saves.some((s) => s.data);
    this.show(
      `<div class="menu-card title-card">
        <div class="sun-disc"></div>
        <div class="eyebrow">A SOLANO CITY STORY</div>
        <h1>${GAME_TITLE}</h1>
        <p class="subtitle">${GAME_SUBTITLE}</p>
        <p class="blurb">Rico Vale came home for the weather. The weather is fine.<br>The rest of the city is not.</p>
        <div class="menu-buttons">
          <button class="btn primary" data-action="new">New Game</button>
          <button class="btn" data-action="continue" ${canContinue ? '' : 'disabled'}>Continue</button>
          <button class="btn" data-action="controls">Controls</button>
          <button class="btn" data-action="settings">Settings</button>
        </div>
        <div class="footnote">Keyboard + mouse · Desktop Chrome · Your city, your mess</div>
      </div>`,
      'title',
    );
  }

  showPause() {
    this.backMode = 'pause';
    this.show(
      `<div class="menu-card">
        <div class="eyebrow">PAUSED</div>
        <h2>${GAME_TITLE}</h2>
        <p class="subtitle small">The sun keeps shining while you think.</p>
        <div class="menu-buttons">
          <button class="btn primary" data-action="resume">Resume</button>
          <button class="btn" data-action="save">Save Game</button>
          <button class="btn" data-action="load">Load Game</button>
          <button class="btn" data-action="controls">Controls</button>
          <button class="btn" data-action="settings">Settings</button>
          <button class="btn ghost" data-action="quit">Quit to Title</button>
        </div>
      </div>`,
      'pause',
    );
  }

  showControls() {
    this.show(
      `<div class="menu-card wide">
        <div class="eyebrow">CONTROLS</div>
        <h2>How to run Solano</h2>
        <div class="control-grid">
          <div><kbd>W A S D</kbd><span>Walk / drive</span></div>
          <div><kbd>Shift</kbd><span>Run</span></div>
          <div><kbd>Mouse</kbd><span>Aim</span></div>
          <div><kbd>Left click</kbd><span>Shoot / punch</span></div>
          <div><kbd>F</kbd><span>Enter / exit car (hold-up a driver to carjack)</span></div>
          <div><kbd>Space</kbd><span>Handbrake / drift</span></div>
          <div><kbd>1 2 3</kbd><span>Fists / pistol / SMG / shotgun</span></div>
          <div><kbd>H</kbd><span>Horn (peds panic, traffic honks back)</span></div>
          <div><kbd>Esc</kbd><span>Pause</span></div>
          <div><kbd>M</kbd><span>Toggle rotating minimap</span></div>
        </div>
        <p class="hint">Drive on the right. The police prefer it when you do not.</p>
        <div class="menu-buttons row"><button class="btn primary" data-action="back">Back</button></div>
      </div>`,
      'controls',
    );
  }

  showSettings() {
    const s = this.game.settings;
    this.show(
      `<div class="menu-card">
        <div class="eyebrow">SETTINGS</div>
        <h2>Sun, sound and map</h2>
        <label class="setting">
          <span>Master volume <b id="vol-label">${Math.round(s.volume * 100)}%</b></span>
          <input id="vol" type="range" min="0" max="100" value="${Math.round(s.volume * 100)}">
        </label>
        <label class="setting">
          <span>Music volume <b id="music-label">${Math.round(s.music * 100)}%</b></span>
          <input id="music" type="range" min="0" max="100" value="${Math.round(s.music * 100)}">
        </label>
        <label class="setting check">
          <span>Rotating minimap</span>
          <input id="rotate" type="checkbox" ${s.rotateMinimap !== false ? 'checked' : ''}>
        </label>
        <div class="menu-buttons row"><button class="btn primary" data-action="back">Back</button></div>
      </div>`,
      'settings',
    );
  }

  showSlots(mode) {
    const saves = this.game.saveGame.list();
    const rows = saves
      .map((s) => {
        const d = s.data;
        const title = d ? d.missionTitle || 'Free roam' : 'Empty slot';
        const money = d ? formatMoney(d.money) : '—';
        const when = d ? new Date(d.savedAt).toLocaleString() : 'No save';
        const action = mode === 'save' ? 'write' : 'read';
        const disabled = mode === 'load' && !d ? 'disabled' : '';
        return `<div class="slot">
          <div class="slot-name">${s.label}</div>
          <div class="slot-info"><b>${title}</b><span>${money} · ${when}</span></div>
          <button class="btn small" data-action="slot" data-slot="${s.slot}" data-mode="${action}" ${disabled}>${mode === 'save' ? 'Save' : 'Load'}</button>
        </div>`;
      })
      .join('');
    this.show(
      `<div class="menu-card wide">
        <div class="eyebrow">${mode === 'save' ? 'SAVE GAME' : 'LOAD GAME'}</div>
        <h2>${mode === 'save' ? 'Pick a slot' : 'Back to the streets'}</h2>
        <div class="slots">${rows}</div>
        <div class="menu-buttons row"><button class="btn primary" data-action="back">Back</button></div>
      </div>`,
      'slots',
    );
  }

  onClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;
    this.game.audio.ui();
    if (action === 'new') this.game.startNew();
    else if (action === 'continue') this.game.continueGame();
    else if (action === 'resume') this.game.resume();
    else if (action === 'controls') this.showControls();
    else if (action === 'settings') this.showSettings();
    else if (action === 'save') this.showSlots('save');
    else if (action === 'load') this.showSlots('load');
    else if (action === 'quit') this.game.quitToTitle();
    else if (action === 'back') {
      if (this.backMode === 'title') this.showTitle();
      else this.showPause();
    } else if (action === 'slot') {
      const slot = btn.dataset.slot;
      if (btn.dataset.mode === 'write') {
        this.game.saveSlot(slot);
        this.showPause();
      } else {
        this.game.loadSlot(slot);
      }
    }
  }

  onInput(e) {
    const t = e.target;
    if (t.id === 'vol' || t.id === 'music') {
      const v = Number(t.value) / 100;
      if (t.id === 'vol') {
        this.game.settings.volume = v;
        document.getElementById('vol-label').textContent = Math.round(v * 100) + '%';
      } else {
        this.game.settings.music = v;
        document.getElementById('music-label').textContent = Math.round(v * 100) + '%';
      }
      this.game.audio.setVolumes(this.game.settings.volume, this.game.settings.music);
      this.game.saveSettings();
    } else if (t.id === 'rotate') {
      this.game.settings.rotateMinimap = t.checked;
      this.game.saveSettings();
    }
  }
}
