// The five-star wanted meter and its slow cooldown.

import { CONFIG } from './config.js';
import { clamp } from './utils.js';

export class Wanted {
  constructor() {
    this.level = 0;
    this.hold = false;
    this.decayTimer = 0;
    this.decayClock = 0;
    this.onChange = null;
  }

  add(n = 1) {
    if (n <= 0) return;
    const before = this.level;
    this.level = clamp(this.level + n, 0, CONFIG.wanted.max);
    this.decayTimer = 0;
    this.decayClock = 0;
    if (this.level !== before && this.onChange) this.onChange(this.level, before);
  }

  set(level) {
    const before = this.level;
    this.level = clamp(level, 0, CONFIG.wanted.max);
    this.decayTimer = 0;
    this.decayClock = 0;
    if (this.level !== before && this.onChange) this.onChange(this.level, before);
  }

  update(dt) {
    if (this.hold || this.level <= 0) return;
    this.decayTimer += dt;
    if (this.decayTimer < CONFIG.wanted.decayDelay) return;
    this.decayClock += dt;
    if (this.decayClock >= CONFIG.wanted.decayStep) {
      this.decayClock = 0;
      this.set(this.level - 1);
    }
  }

  clear() {
    this.hold = false;
    this.set(0);
  }

  get stars() {
    return this.level;
  }
}
