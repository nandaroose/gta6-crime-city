export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.6;
    this.noiseBuffer = null;
    this.engineNodes = null;
    this.sirenNodes = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      this.enabled = false;
      return;
    }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.2, cutoff = 1400, type = 'lowpass') {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.3), t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  gun(kind) {
    if (kind === 'shotgun') {
      this.noise(0.3, 0.4, 900);
      this.tone(90, 0.25, 'square', 0.16, 40);
    } else if (kind === 'smg') {
      this.noise(0.06, 0.16, 2400);
      this.tone(220, 0.05, 'square', 0.07, 90);
    } else {
      this.noise(0.11, 0.24, 2000);
      this.tone(160, 0.08, 'square', 0.1, 60);
    }
  }

  dry() {
    this.tone(320, 0.04, 'square', 0.05, 200);
  }

  punch() {
    this.noise(0.09, 0.18, 500);
    this.tone(80, 0.08, 'sine', 0.12, 50);
  }

  impact() {
    this.noise(0.18, 0.25, 700);
    this.tone(70, 0.16, 'sine', 0.14, 35);
  }

  pickup() {
    this.tone(660, 0.08, 'triangle', 0.13);
    setTimeout(() => this.tone(990, 0.1, 'triangle', 0.12), 70);
  }

  hurt() {
    this.noise(0.12, 0.12, 500);
    this.tone(120, 0.12, 'sawtooth', 0.06, 70);
  }

  explosion() {
    this.noise(0.7, 0.45, 600);
    this.tone(60, 0.6, 'sine', 0.25, 24);
  }

  death() {
    this.tone(220, 0.9, 'sawtooth', 0.16, 55);
  }

  mission() {
    this.tone(440, 0.12, 'triangle', 0.1);
    setTimeout(() => this.tone(660, 0.12, 'triangle', 0.1), 120);
    setTimeout(() => this.tone(880, 0.2, 'triangle', 0.1), 240);
  }

  complete() {
    this.tone(523, 0.14, 'triangle', 0.12);
    setTimeout(() => this.tone(659, 0.14, 'triangle', 0.12), 130);
    setTimeout(() => this.tone(784, 0.26, 'triangle', 0.12), 260);
  }

  ui() {
    this.tone(520, 0.05, 'square', 0.05, 640);
  }

  sirenStart() {
    if (!this.ctx || this.sirenNodes) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 660;
    lfo.type = 'square';
    lfo.frequency.value = 1.8;
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.value = 0.0;
    gain.gain.linearRampToValueAtTime(0.022, t + 0.6);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    lfo.start(t);
    this.sirenNodes = { osc, lfo, gain };
  }

  sirenStop() {
    if (!this.sirenNodes || !this.ctx) return;
    const { osc, lfo, gain } = this.sirenNodes;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    osc.stop(t + 0.45);
    lfo.stop(t + 0.45);
    this.sirenNodes = null;
  }

  engineStart() {
    if (!this.ctx || this.engineNodes) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    osc2.type = 'square';
    osc2.frequency.value = 82;
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    gain.gain.value = 0.0;
    gain.gain.linearRampToValueAtTime(0.035, t + 0.2);
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc2.start(t);
    this.engineNodes = { osc, osc2, gain, filter };
  }

  engineStop() {
    if (!this.engineNodes || !this.ctx) return;
    const { osc, osc2, gain } = this.engineNodes;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.25);
    osc.stop(t + 0.3);
    osc2.stop(t + 0.3);
    this.engineNodes = null;
  }

  setEngine(ratio) {
    if (!this.engineNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    const freq = 48 + ratio * 140;
    this.engineNodes.osc.frequency.setTargetAtTime(freq, t, 0.1);
    this.engineNodes.osc2.frequency.setTargetAtTime(freq * 1.5, t, 0.1);
    this.engineNodes.filter.frequency.setTargetAtTime(320 + ratio * 700, t, 0.1);
  }
}
