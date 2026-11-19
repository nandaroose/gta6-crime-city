// Synthesized WebAudio: engine, guns, sirens, horns, footsteps and a lazy ambient score.

import { clamp, rand, pick } from './utils.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.music = null;
    this.noise = null;
    this.engine = null;
    this.siren = null;
    this.pad = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.listener = { x: 0, y: 0 };
    this.settings = { volume: 0.7, music: 0.5 };
    this.started = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.settings.volume;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.music = this.ctx.createGain();
    this.music.gain.value = this.settings.music * 0.5;
    this.music.connect(this.master);
    const len = this.ctx.sampleRate * 1.2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.startEngine();
    this.startPad();
    this.started = true;
  }

  setVolumes(volume, music) {
    this.settings.volume = volume;
    this.settings.music = music;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    this.music.gain.setTargetAtTime(music * 0.5, this.ctx.currentTime, 0.05);
  }

  noiseBurst(duration, filterFreq, volume, type = 'lowpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(gain).connect(this.sfx);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  tone(freq, duration, volume, type = 'sine', slide = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(dest || this.sfx);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  gunshot(kind = 'pistol', volume = 1) {
    if (!this.ctx) return;
    if (kind === 'shotgun') {
      this.noiseBurst(0.22, 900, 0.75 * volume);
      this.tone(90, 0.16, 0.3 * volume, 'sine', -55);
    } else if (kind === 'smg') {
      this.noiseBurst(0.07, 2100, 0.34 * volume);
      this.tone(180, 0.05, 0.12 * volume, 'square', -90);
    } else {
      this.noiseBurst(0.12, 1600, 0.45 * volume);
      this.tone(140, 0.09, 0.2 * volume, 'sine', -80);
    }
  }

  explosion() {
    if (!this.ctx) return;
    this.noiseBurst(0.75, 500, 0.9);
    this.tone(70, 0.5, 0.5, 'sine', -40);
    this.noiseBurst(0.4, 240, 0.5);
  }

  horn(x, y) {
    if (!this.ctx) return;
    const d = Math.hypot(x - this.listener.x, y - this.listener.y);
    const v = clamp(1 - d / 1000, 0, 1) * 0.28;
    if (v <= 0.01) return;
    const t = this.ctx.currentTime;
    for (const f of [330, 415]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.02);
      g.gain.setValueAtTime(v, t + 0.28);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      osc.connect(g).connect(this.sfx);
      osc.start(t);
      osc.stop(t + 0.38);
    }
  }

  footstep(run) {
    this.noiseBurst(0.06, run ? 700 : 420, run ? 0.1 : 0.06);
  }

  punch() {
    this.tone(85, 0.11, 0.32, 'sine', -35);
    this.noiseBurst(0.08, 600, 0.18);
  }

  whoosh() {
    this.noiseBurst(0.12, 1200, 0.08, 'bandpass');
  }

  metalHit() {
    this.tone(rand(900, 1500), 0.09, 0.08, 'triangle', -300);
  }

  hurt() {
    this.tone(120, 0.16, 0.28, 'sawtooth', -70);
  }

  dryFire() {
    this.tone(220, 0.04, 0.08, 'square');
  }

  pickup() {
    this.tone(620, 0.09, 0.14, 'triangle');
    setTimeout(() => this.tone(930, 0.12, 0.12, 'triangle'), 70);
  }

  ui() {
    this.tone(520, 0.06, 0.1, 'sine');
  }

  mission() {
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.22, 0.16, 'triangle'), i * 110));
  }

  missionFail() {
    const notes = [392, 329.63, 261.63, 196];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.28, 0.14, 'sine'), i * 140));
  }

  phone() {
    this.tone(760, 0.12, 0.12, 'sine');
    setTimeout(() => this.tone(760, 0.12, 0.12, 'sine'), 160);
  }

  startEngine() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 31;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(this.sfx);
    osc.start();
    osc2.start();
    this.engine = { osc, osc2, gain, filter };
  }

  startPad() {
    if (!this.ctx) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.018;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const a = this.ctx.createOscillator();
    a.type = 'triangle';
    a.frequency.value = 110;
    const b = this.ctx.createOscillator();
    b.type = 'triangle';
    b.frequency.value = 164.81;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.006;
    lfo.connect(lfoGain).connect(gain.gain);
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain).connect(this.music);
    a.start();
    b.start();
    lfo.start();
    this.pad = { gain };
  }

  updateSiren(active, distance) {
    if (!this.ctx) return;
    if (active && !this.siren) {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 700;
      const lfo = this.ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 0.9;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 190;
      lfo.connect(lfoGain).connect(osc.frequency);
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(this.sfx);
      osc.start(t);
      lfo.start(t);
      this.siren = { osc, lfo, gain };
    }
    if (this.siren) {
      const v = active ? clamp(1 - distance / 1400, 0, 1) * 0.1 : 0;
      this.siren.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.12);
      if (!active && v === 0 && this.siren.gain.gain.value < 0.001) {
        this.siren.osc.stop();
        this.siren.lfo.stop();
        this.siren = null;
      }
    }
  }

  update(dt, game) {
    if (!this.ctx) return;
    this.listener.x = game.player.x;
    this.listener.y = game.player.y;
    const v = game.player.vehicle;
    if (this.engine) {
      const speed = v && !v.dead ? Math.abs(v.speed) : 0;
      const target = v && !v.dead ? 0.05 + Math.min(0.05, speed / 9000) : 0;
      this.engine.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
      this.engine.osc.frequency.setTargetAtTime(52 + speed * 0.22, this.ctx.currentTime, 0.05);
      this.engine.osc2.frequency.setTargetAtTime(27 + speed * 0.11, this.ctx.currentTime, 0.05);
      this.engine.filter.frequency.setTargetAtTime(360 + speed * 0.7, this.ctx.currentTime, 0.08);
    }
    let nearest = 9999;
    for (const c of game.police.cruisers) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - game.player.x, c.y - game.player.y);
      if (d < nearest) nearest = d;
    }
    this.updateSiren(game.wanted.level > 0 && game.police.cruisers.length > 0, nearest);
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = 0.52;
      this.playMusicStep();
    }
  }

  playMusicStep() {
    if (!this.ctx) return;
    const scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    const step = this.musicStep++;
    if (step % 4 === 0) {
      this.tone(scale[0] / 2, 0.5, 0.05, 'sine', 0, this.music);
    }
    if (step % 2 === 0 || Math.random() < 0.4) {
      const n = pick(scale);
      this.tone(n, 0.34, 0.035, 'triangle', 0, this.music);
    }
    if (step % 8 === 3) {
      this.tone(scale[3], 0.3, 0.03, 'sine', 0, this.music);
    }
  }
}
