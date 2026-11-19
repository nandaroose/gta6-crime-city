// The eight-job story chain: markers, timers, objectives, fail states and payouts.

import { MISSIONS, STORY_DONE } from './story.js';
import { CAR_TYPES } from './config.js';
import { Vehicle } from './vehicles.js';
import { dist, dist2, formatMoney, formatClock } from './utils.js';

export class Missions {
  constructor() {
    this.index = 0;
    this.state = 'idle';
    this.def = null;
    this.step = null;
    this.stepIndex = 0;
    this.timer = 0;
    this.objectives = [];
    this.targets = [];
    this.missionVehicle = null;
    this.marker = null;
    this.cooldown = 0;
    this.storyDone = false;
    this.killStart = 0;
    this.collectStart = 0;
  }

  startMarker() {
    if (this.state !== 'idle' || this.index >= MISSIONS.length) return null;
    const p = this.lookup(MISSIONS[this.index].start);
    return p ? { x: p.x, y: p.y, radius: 82, kind: 'start' } : null;
  }

  lookup(name) {
    return this._city ? this._city.landmarks[name] : null;
  }

  update(dt, game) {
    this._city = game.city;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.index >= MISSIONS.length) {
      if (!this.storyDone) {
        this.storyDone = true;
        game.hud.setCall(STORY_DONE.caller, STORY_DONE.lines, 9);
        game.hud.notify('Story complete. Solano City is yours.', 'mission');
        game.audio.mission();
        game.events.emit('storyComplete');
      }
      return;
    }
    if (this.state === 'idle') {
      const m = this.startMarker();
      if (m && this.cooldown <= 0 && dist(game.player.x, game.player.y, m.x, m.y) < m.radius) {
        this.start(MISSIONS[this.index], game);
      }
      return;
    }

    const step = this.step;
    if (!step) return;
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        if (step.type === 'survive') {
          this.completeStep(game);
          return;
        }
        this.fail('Time ran out', game);
        return;
      }
    }

    if (step.type === 'goto') {
      if (this.marker && dist(game.player.x, game.player.y, this.marker.x, this.marker.y) < this.marker.radius) this.completeStep(game);
    } else if (step.type === 'deliver') {
      if (step.requireMissionCar && this.missionVehicle && this.missionVehicle.dead) {
        this.fail('The delivery car was destroyed', game);
        return;
      }
      if (this.marker && dist(game.player.x, game.player.y, this.marker.x, this.marker.y) < this.marker.radius) {
        if (!step.requireMissionCar) this.completeStep(game);
        else if (game.player.vehicle === this.missionVehicle) this.completeStep(game);
        else game.hud.notify('You need the red Vulpa for this delivery', 'danger');
      }
    } else if (step.type === 'collect') {
      let got = 0;
      for (const o of this.objectives) {
        if (o.collected) {
          got++;
          continue;
        }
        if (!game.player.dead && dist2(game.player.x, game.player.y, o.x, o.y) < 36 * 36) {
          o.collected = true;
          got++;
          game.particles.ring(o.x, o.y, 'rgba(244,200,74,0.8)');
          game.audio.pickup();
          game.hud.notify('Duffel collected (' + got + '/' + this.objectives.length + ')', 'mission');
        }
      }
      if (got >= this.objectives.length && this.objectives.length > 0) this.completeStep(game);
    } else if (step.type === 'kill') {
      const alive = this.targets.filter((p) => !p.dead).length;
      if (this.targets.length > 0 && alive === 0) this.completeStep(game);
    } else if (step.type === 'survive') {
      game.wanted.hold = true;
      if (game.wanted.level < step.stars) game.wanted.set(step.stars);
      if (this.timer <= 0) this.completeStep(game);
    } else if (step.type === 'escape') {
      game.wanted.hold = false;
      if (game.wanted.level === 0) this.completeStep(game);
    }
  }

  start(def, game) {
    this.def = def;
    this.state = 'active';
    this.stepIndex = -1;
    this.timer = 0;
    this.objectives = [];
    this.targets = [];
    this.missionVehicle = null;
    this.marker = null;
    game.hud.setCall(def.caller, def.intro, 4 + def.intro.length * 2.6);
    game.hud.notify('New job: ' + def.title, 'mission');
    game.audio.phone();
    this.beginStep(0, game);
  }

  beginStep(index, game) {
    const step = this.def.steps[index];
    this.stepIndex = index;
    this.step = step;
    this.timer = step.timer ?? step.seconds ?? 0;
    this.objectives = [];
    this.targets = [];
    this.marker = null;
    const lm = step.to ? game.city.landmarks[step.to] : step.area ? game.city.landmarks[step.area] : null;
    if (step.to && lm) this.marker = { x: lm.x, y: lm.y, radius: step.radius || 82, kind: 'objective' };
    if (step.area && lm) this.marker = { x: lm.x, y: lm.y, radius: step.spread || 100, kind: 'area' };

    if (step.spawnMissionCar && lm) {
      const car = new Vehicle({ x: lm.x + 26, y: lm.y + 26, angle: 0, type: CAR_TYPES[0], color: '#e2604f' });
      if (game.city.collideCircle(car.x, car.y, 24)) {
        const spot = game.city.walkableNear(lm.x + 30, lm.y + 30);
        car.x = spot.x;
        car.y = spot.y;
      }
      game.vehicles.add(car);
      this.missionVehicle = car;
    }

    if (step.type === 'collect' && lm) {
      for (let i = 0; i < step.count; i++) {
        const spot = game.city.randomSidewalkNear(lm.x, lm.y, 40, step.spread || 160);
        this.objectives.push({ x: spot.x, y: spot.y, collected: false });
      }
    }

    if (step.type === 'kill' && lm) {
      for (let i = 0; i < step.count; i++) {
        const spot = game.city.randomSidewalkNear(lm.x, lm.y, 50, step.spread || 160);
        const ped = game.peds.spawnAt(spot.x, spot.y, { target: true, guard: true, health: 70 });
        if (ped) this.targets.push(ped);
      }
    }

    if (step.type === 'survive') {
      game.wanted.hold = true;
      game.wanted.set(Math.max(game.wanted.level, step.stars));
      this.marker = null;
    }
    if (step.type === 'escape') {
      game.wanted.hold = false;
      if (game.wanted.level < step.stars) game.wanted.set(step.stars);
    }
    game.hud.notify('Objective: ' + step.text, 'mission');
  }

  completeStep(game) {
    if (this.stepIndex + 1 < this.def.steps.length) {
      game.hud.notify('Objective complete', 'mission');
      game.audio.ui();
      this.beginStep(this.stepIndex + 1, game);
    } else {
      this.complete(game);
    }
  }

  complete(game) {
    const def = this.def;
    this.state = 'idle';
    this.index++;
    this.cooldown = 4;
    this.timer = 0;
    this.marker = null;
    this.objectives = [];
    this.targets = [];
    this.missionVehicle = null;
    this.step = null;
    this.def = null;
    game.wanted.hold = false;
    game.player.addMoney(def.reward);
    game.hud.notify('Mission complete: ' + def.title + '  ' + formatMoney(def.reward), 'mission');
    game.hud.setCall(def.caller, [def.outro], 6);
    game.audio.mission();
    game.events.emit('missionComplete', def);
    game.saveGame.autosave(game);
    if (this.index >= MISSIONS.length) {
      this.storyDone = true;
      game.hud.setCall(STORY_DONE.caller, STORY_DONE.lines, 9);
      game.hud.notify('Story complete. Solano City is yours.', 'mission');
      game.events.emit('storyComplete');
    }
  }

  fail(reason, game) {
    const title = this.def ? this.def.title : 'Job';
    this.state = 'idle';
    this.cooldown = 5;
    this.timer = 0;
    this.marker = null;
    this.objectives = [];
    for (const t of this.targets) if (t && !t.dead) t.target = false;
    this.targets = [];
    this.missionVehicle = null;
    this.step = null;
    this.def = null;
    game.wanted.hold = false;
    game.hud.notify('Mission failed: ' + title + ' - ' + reason, 'danger');
    game.audio.missionFail();
    game.events.emit('missionFailed', reason);
  }

  objectiveText() {
    if (this.index >= MISSIONS.length) return 'Free roam: Solano City is yours';
    if (this.state === 'active' && this.step) return this.step.text;
    return 'Next job: ' + MISSIONS[this.index].title + ' (' + MISSIONS[this.index].caller + ')';
  }

  timerText() {
    if (this.state === 'active' && this.timer > 0) return formatClock(this.timer);
    return '';
  }

  progressText() {
    if (this.state !== 'active' || !this.step) return '';
    if (this.step.type === 'collect') return this.objectives.filter((o) => o.collected).length + ' / ' + this.objectives.length;
    if (this.step.type === 'kill') return this.targets.filter((p) => p.dead).length + ' / ' + this.targets.length;
    return '';
  }

  blips() {
    const out = [];
    const start = this.startMarker();
    if (start) out.push({ x: start.x, y: start.y, kind: 'mission' });
    if (this.marker) out.push({ x: this.marker.x, y: this.marker.y, kind: 'objective' });
    if (this.missionVehicle) out.push({ x: this.missionVehicle.x, y: this.missionVehicle.y, kind: 'vehicle' });
    for (const o of this.objectives) if (!o.collected) out.push({ x: o.x, y: o.y, kind: 'package' });
    for (const t of this.targets) if (!t.dead) out.push({ x: t.x, y: t.y, kind: 'target' });
    return out;
  }

  drawMarkers(ctx, time) {
    const pulse = 1 + Math.sin(time * 3) * 0.08;
    const start = this.startMarker();
    if (start) {
      ctx.save();
      ctx.translate(start.x, start.y);
      ctx.fillStyle = 'rgba(244,200,74,0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, start.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,200,74,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, start.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f4c84a';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', 0, 2);
      ctx.restore();
    }
    if (this.marker) {
      ctx.save();
      ctx.translate(this.marker.x, this.marker.y);
      if (this.marker.kind === 'area') {
        ctx.strokeStyle = 'rgba(244,200,74,0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, this.marker.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = 'rgba(244,200,74,0.14)';
      ctx.beginPath();
      ctx.arc(0, 0, 52 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,200,74,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 40 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f4c84a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, 1);
      ctx.restore();
    }
    if (this.missionVehicle) {
      const car = this.missionVehicle;
      ctx.strokeStyle = 'rgba(120,220,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(car.x, car.y, 38 + Math.sin(time * 4) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const o of this.objectives) {
      if (o.collected) continue;
      const bob = Math.sin(time * 3 + o.x) * 3;
      ctx.save();
      ctx.translate(o.x, o.y + bob);
      ctx.fillStyle = 'rgba(10,14,20,0.25)';
      ctx.beginPath();
      ctx.ellipse(2, 10 - bob, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9a24a';
      ctx.beginPath();
      ctx.moveTo(-11, -4);
      ctx.lineTo(11, -4);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a6a2f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.quadraticCurveTo(0, -12, 4, -4);
      ctx.stroke();
      ctx.restore();
    }
    for (const t of this.targets) {
      if (t.dead) continue;
      ctx.fillStyle = 'rgba(220,70,60,0.95)';
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - 32);
      ctx.lineTo(t.x + 6, t.y - 24);
      ctx.lineTo(t.x - 6, t.y - 24);
      ctx.closePath();
      ctx.fill();
    }
  }
}
