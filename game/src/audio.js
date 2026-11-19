// audio.js — 100% synthesized WebAudio: engine pitch tracking, gunshots,
// siren wail, explosions, ambient pad + music loop, UI clicks. No assets.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = false;
    this.volume = 0.7;
    this.noiseBuf = null;
    this.engine = null;       // { osc, gain }
    this.siren = null;        // { osc, lfo }
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.master);

    // shared noise buffer
    const len = this.ctx.sampleRate * 1;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.enabled = true;
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  // ---------- one-shots ----------
  noiseBurst(dur, freq, gain, type = 'lowpass') {
    if (!this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(); src.stop(this.ctx.currentTime + dur);
  }

  blip(freq, dur, gain = 0.2, type = 'square', slideTo = null) {
    if (!this.enabled) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  gunshot(smg = false) {
    this.noiseBurst(smg ? 0.09 : 0.16, smg ? 2200 : 1200, 0.5);
    this.blip(140, 0.08, 0.25, 'sawtooth', 40);
  }
  punch() { this.noiseBurst(0.08, 500, 0.3); }
  pickup() { this.blip(660, 0.08, 0.2, 'sine', 990); this.blip(990, 0.1, 0.15, 'sine', 1320); }
  crash() { this.noiseBurst(0.25, 800, 0.45); this.blip(90, 0.2, 0.3, 'square', 30); }
  horn() { this.blip(340, 0.3, 0.25, 'sawtooth'); this.blip(425, 0.3, 0.2, 'sawtooth'); }
  explosion() {
    this.noiseBurst(0.9, 300, 0.9);
    this.blip(60, 0.8, 0.5, 'sawtooth', 25);
  }
  click() { this.blip(900, 0.04, 0.12, 'square', 700); }
  phone() {
    [0, 0.12, 0.24].forEach(t => setTimeout(() => this.blip(1200, 0.1, 0.15, 'sine'), t * 1000));
  }
  missionComplete() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.22, 0.2, 'triangle'), i * 130));
  }
  missionFail() {
    [400, 350, 280, 200].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.25, 0.2, 'sawtooth'), i * 150));
  }

  // ---------- continuous ----------
  startEngine() {
    if (!this.enabled || this.engine) return;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start();
    this.engine = { osc: o, gain: g };
  }

  updateEngine(active, speedNorm) {
    if (!this.engine) return;
    const targetGain = active ? 0.12 : 0;
    this.engine.gain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    this.engine.osc.frequency.setTargetAtTime(50 + speedNorm * 160, this.ctx.currentTime, 0.05);
  }

  startSiren() {
    if (!this.enabled || this.siren) return;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 700;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.9;
    const lg = this.ctx.createGain();
    lg.gain.value = 180;
    lfo.connect(lg); lg.connect(o.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.0;
    o.connect(g); g.connect(this.sfxGain);
    o.start(); lfo.start();
    this.siren = { osc: o, lfo, gain: g };
  }

  setSiren(on) {
    if (!this.siren) return;
    this.siren.gain.gain.setTargetAtTime(on ? 0.07 : 0, this.ctx.currentTime, 0.2);
  }

  stopAllLoops() {
    this.updateEngine(false, 0);
    this.setSiren(false);
  }

  // ---------- music: simple ambient loop, scheduled per-frame ----------
  // A laid-back synthwave-ish progression in A minor.
  updateMusic(dt) {
    if (!this.enabled) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.24;
    const scale = [220, 246.9, 261.6, 293.7, 329.6, 349.2, 440];
    const bass = [110, 110, 130.8, 98];
    const step = this.musicStep++;
    const t = this.ctx.currentTime;
    // pad chord every 8 steps
    if (step % 8 === 0) {
      const root = bass[(step / 8) % 4 | 0] * 2;
      [root, root * 1.5, root * 2].forEach((f) => {
        const o = this.ctx.createOscillator();
        o.type = 'triangle'; o.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.5);
        g.gain.linearRampToValueAtTime(0.0001, t + 1.9);
        o.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + 2);
      });
    }
    // sparse melody note
    if (Math.random() < 0.35) {
      const f = scale[Math.floor(Math.random() * scale.length)] * 2;
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + 0.55);
    }
  }
}

export const audio = new AudioEngine();
