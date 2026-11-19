// wanted.js — the 1–5 star wanted system: crime reporting, heat decay when
// out of police sight, and spawn budget scaling for police response.

export const CRIMES = {
  CARJACK: 1,
  HIT_PED: 1,
  KILL_PED: 2,
  KILL_COP: 2,
  SHOOT: 1, // firing near cops / repeated gunfire bumps a fraction
};

export class Wanted {
  constructor() {
    this.stars = 0;       // 0..5
    this.heat = 0;         // fractional progress toward next star
    this.sightTimer = 0;  // seconds since cops last saw the player
  }

  add(stars) {
    const before = this.stars;
    this.heat += stars;
    while (this.heat >= 1 && this.stars < 5) {
      this.stars++;
      this.heat -= 1;
    }
    if (this.stars >= 5) this.heat = 0;
    if (this.stars > before) return true; // star gained
    return false;
  }

  // Called when a cop unit sees the player (foot or car).
  seen() { this.sightTimer = 0; }

  update(dt, world) {
    if (this.stars === 0) return;
    this.sightTimer += dt;
    // Decay: after 8s out of sight, stars fade.
    if (this.sightTimer > 8) {
      this.heat -= dt * 0.5;
      if (this.heat < 0) {
        this.stars--;
        this.heat = 0.7;
        if (this.stars <= 0) { this.stars = 0; this.heat = 0; world.toast('You lost the cops.'); }
      }
    }
  }

  clear() { this.stars = 0; this.heat = 0; this.sightTimer = 0; }

  // Desired number of active police units for current stars.
  unitBudget() {
    return this.stars === 0 ? 0 : this.stars * 2 - 1;
  }
}
