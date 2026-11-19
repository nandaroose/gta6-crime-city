// missions.js — mission runtime: marker placement, per-mission scripted state
// machines for all 8 story missions, complete/fail flow, and rewards.

import { TILE, dist, clamp } from './utils.js';
import { makeCar, CAR_TYPES } from './vehicles.js';
import { MISSION_DEFS } from './story.js';
import { audio } from './audio.js';

const garageSpot = { x: 18.5 * TILE, y: 42.5 * TILE };
const depotSpot  = { x: 34.5 * TILE, y: 18.5 * TILE };   // cab depot = police-adjacent plaza; use marker spots
const chopSpot   = { x: 66.5 * TILE, y: 34.5 * TILE };
const harborSpot = { x: 92.5 * TILE, y: 40.5 * TILE };   // near beach
const precinct   = { x: 34.5 * TILE, y: 18.5 * TILE };

export class MissionManager {
  constructor(world) {
    this.world = world;
    this.index = 0;          // next mission (0 = none started, 1-based in defs)
    this.active = null;      // { def, phase, marker:{x,y}, timer, props:{} }
    this.cooldown = 0;
  }

  get nextDef() { return MISSION_DEFS[this.index] || null; }

  // Called on mission-text screen confirm: actually start the mission.
  start(def) {
    this.active = {
      def,
      phase: 0,
      marker: null,
      timer: 0,
      props: {},
    };
    this.setup(def.id);
    this.world.toast(`MISSION START — ${def.title}`);
  }

  setup(id) {
    const a = this.active, p = this.world.player;
    a.marker = null;
    switch (id) {
      case 1:
        a.marker = { ...garageSpot, label: "Rosa's Garage" };
        break;
      case 2: {
        const car = makeCar('sedan', 26.5 * TILE, 26.5 * TILE, 0);
        car.color = '#3a6fc8';
        car.driver = null;
        car.missionTag = 'package';
        this.world.vehicles.push(car);
        a.props.car = car;
        a.marker = { x: car.x, y: car.y, label: 'Package car' };
        a.timer = 120;
        break;
      }
      case 3: {
        const car = makeCar('sport', 10.5 * TILE, 10.5 * TILE, Math.PI / 2);
        car.color = '#f2c014';
        car.driver = null;
        car.missionTag = 'target';
        this.world.vehicles.push(car);
        a.props.car = car;
        a.marker = { x: car.x, y: car.y, label: 'Barracuda GT' };
        break;
      }
      case 4: {
        const car = makeCar('sedan', harborSpot.x, harborSpot.y - 200, 0);
        car.color = '#c0c0c8';
        car.driver = 'ai';
        car.ai = { axis: 'h', dir: 1, escort: true };
        car.missionTag = 'tail';
        this.world.vehicles.push(car);
        a.props.car = car;
        a.marker = { x: car.x, y: car.y, label: 'Silver sedan', follow: true };
        a.props.lostTimer = 0;
        break;
      }
      case 5: {
        // ambush: spawn 4 enemy shooters near harbor warehouse
        a.props.enemies = [];
        for (let i = 0; i < 4; i++) {
          a.props.enemies.push({
            x: harborSpot.x + (i - 1.5) * 40, y: harborSpot.y + (i % 2) * 50,
            hp: 35, dead: false, shootCd: 1 + Math.random(),
          });
        }
        a.marker = { ...harborSpot, label: 'Warehouse' };
        this.world.toast('Tip: bring a gun. Punches are slow.');
        break;
      }
      case 6:
        a.marker = { x: precinct.x, y: precinct.y, label: 'Precinct One' };
        break;
      case 7:
        a.marker = { x: harborSpot.x, y: harborSpot.y, label: 'Dock house' };
        break;
      case 8: {
        // Convoy: a limo with escort driving west along an avenue
        const car = makeCar('limo', 90.5 * TILE, 34.5 * TILE, Math.PI);
        car.color = '#111';
        car.driver = 'ai';
        car.ai = { axis: 'h', dir: -1, fleeing: true };
        car.hp = 300; car.missionTag = 'cacique';
        this.world.vehicles.push(car);
        a.props.car = car;
        a.marker = { x: car.x, y: car.y, label: "Cacique's limo", follow: true };
        break;
      }
    }
  }

  // Mission logic each frame while PLAYING.
  update(dt) {
    const a = this.active;
    if (!a) return;
    const w = this.world, p = w.player;
    const def = a.def;

    // Follow-markers track their vehicle
    if (a.marker && a.marker.follow && a.props.car) {
      a.marker.x = a.props.car.x;
      a.marker.y = a.props.car.y;
    }

    switch (def.id) {
      case 1:
        if (p.car && atMarker(a, p, 40)) this.complete();
        break;
      case 2: {
        a.timer -= dt;
        w.missionTimer = Math.max(0, a.timer);
        if (a.timer <= 0) { this.fail('The buyer walked. Too slow.'); break; }
        if (a.phase === 0 && p.car === a.props.car) {
          a.phase = 1;
          a.marker = { x: 50.5 * TILE, y: 58.5 * TILE, label: 'Cab depot' };
          w.toast('Package secured — get it to the depot!');
        }
        if (a.phase === 1 && p.car === a.props.car && dist(p.x, p.y, a.marker.x, a.marker.y) < 50) this.complete();
        if (a.phase === 1 && p.car !== a.props.car && p.car === null) {
          // allowed to continue on foot? No — must deliver by car
        }
        break;
      }
      case 3: {
        if (a.phase === 0 && p.car === a.props.car) {
          a.phase = 1;
          a.marker = { ...chopSpot, label: 'Chop shop' };
          w.toast('Nice. Now bring it to Tico unharmed.');
        }
        if (a.phase === 1) {
          if (a.props.car.dead || a.props.car.hp < a.props.car.type.hp * 0.4) {
            this.fail('Too many scratches. Tico wants it pristine.');
            break;
          }
          if (p.car === a.props.car && dist(p.x, p.y, chopSpot.x, chopSpot.y) < 55) this.complete();
        }
        break;
      }
      case 4: {
        const car = a.props.car;
        if (car.dead) { this.fail('You destroyed the sedan. Nice tail work.'); break; }
        const d = dist(p.x, p.y, car.x, car.y);
        if (d > 500) { a.props.lostTimer += dt; }
        else a.props.lostTimer = 0;
        if (a.props.lostTimer > 6) { this.fail('You lost the sedan.'); break; }
        // Escort drives a long loop; after 30 seconds close, mission done
        a.timer += dt;
        if (a.timer > 35 && d < 300) this.complete();
        break;
      }
      case 5: {
        const en = a.props.enemies.filter(e => !e.dead);
        if (en.length > 0) {
          a.marker = { x: en[0].x, y: en[0].y, label: 'Smugglers', follow: false };
          // enemies shoot at player when close
          for (const e of en) {
            const dd = dist(e.x, e.y, p.x, p.y);
            if (dd < 320) {
              e.shootCd -= dt;
              if (e.shootCd <= 0) {
                e.shootCd = 1.2 + Math.random();
                const ang = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * 0.3;
                w.fireBullet(e.x, e.y, ang, 600, 8, 'cop');
                audio.gunshot(false);
              }
            }
          }
        } else this.complete();
        break;
      }
      case 6: {
        if (a.phase === 0 && dist(p.x, p.y, precinct.x, precinct.y) < 60) {
          a.phase = 1;
          w.wanted.add(2);
          w.toast('ALARM! Get the prisoner out — back to the garage!');
          a.marker = { ...garageSpot, label: 'Garage' };
          a.props.prisoner = { x: p.x + 20, y: p.y + 10 };
        }
        if (a.phase === 1) {
          // prisoner follows player
          const pr = a.props.prisoner;
          const d = dist(pr.x, pr.y, p.x, p.y);
          if (d > 40) {
            const l = d || 1;
            const sp = 160;
            const nx = pr.x + ((p.x - pr.x) / l) * sp * dt;
            const ny = pr.y + ((p.y - pr.y) / l) * sp * dt;
            if (w.city.isWalkable(Math.floor(nx / TILE), Math.floor(pr.y / TILE))) pr.x = nx;
            if (w.city.isWalkable(Math.floor(pr.x / TILE), Math.floor(ny / TILE))) pr.y = ny;
          }
          if (dist(p.x, p.y, garageSpot.x, garageSpot.y) < 60 && d < 120) this.complete();
        }
        break;
      }
      case 7: {
        if (a.phase === 0 && dist(p.x, p.y, harborSpot.x, harborSpot.y) < 50) {
          a.phase = 1;
          w.toast('Ledgers collected — lose any heat, then get to the garage.');
          w.wanted.add(2);
          a.props.heatGate = true;
          a.marker = { ...garageSpot, label: 'Garage' };
        }
        if (a.phase === 1) {
          if (w.wanted.stars === 0) a.props.heatGate = false;
          if (!a.props.heatGate && dist(p.x, p.y, garageSpot.x, garageSpot.y) < 55) this.complete();
        }
        break;
      }
      case 8: {
        const car = a.props.car;
        if (car.dead) { this.complete(); break; } // destroyed = Cacique dead
        a.timer += dt;
        if (a.timer > 90) this.fail('The convoy escaped.');
        break;
      }
    }
  }

  complete() {
    const a = this.active;
    if (!a) return;
    const w = this.world;
    w.player.money += a.def.reward;
    w.toast(`MISSION PASSED — ${a.def.reward} earned`);
    audio.missionComplete();
    // cleanup mission props
    this.cleanup();
    this.active = null;
    this.index++;
    w.missionTimer = -1;
    w.state.pendingOutro = a.def;
    w.autosave();
  }

  fail(reason) {
    const a = this.active;
    if (!a) return;
    this.world.toast(`MISSION FAILED — ${reason}`);
    audio.missionFail();
    this.cleanup();
    this.active = null;
    this.world.missionTimer = -1;
  }

  cleanup() {
    const a = this.active;
    if (!a) return;
    const w = this.world;
    // remove mission-tagged vehicles the player isn't driving
    if (a.props.car) {
      const i = w.vehicles.indexOf(a.props.car);
      if (i >= 0 && w.player.car !== a.props.car) w.vehicles.splice(i, 1);
    }
  }

  drawMissionActors(ctx) {
    const a = this.active;
    if (!a) return;
    // ambush enemies
    if (a.props.enemies) {
      for (const e of a.props.enemies) {
        if (e.dead) continue;
        ctx.fillStyle = '#6a2a3a';
        ctx.fillRect(e.x - 5, e.y - 5, 10, 10);
        ctx.fillStyle = '#d9a184';
        ctx.beginPath(); ctx.arc(e.x, e.y - 7, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // prisoner
    if (a.props.prisoner) {
      const pr = a.props.prisoner;
      ctx.fillStyle = '#ee7733'; // prison jumpsuit
      ctx.fillRect(pr.x - 5, pr.y - 5, 10, 9);
      ctx.fillStyle = '#d9a184';
      ctx.beginPath(); ctx.arc(pr.x, pr.y - 7, 3.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function atMarker(a, p, r) {
  return a.marker && dist(p.x, p.y, a.marker.x, a.marker.y) < r;
}

// Marker rendering helper (used by render.js)
export function drawMarker(ctx, m, time) {
  if (!m) return;
  const pulse = 0.75 + 0.25 * Math.sin(time * 5);
  ctx.save();
  ctx.globalAlpha = 0.85;
  const grd = ctx.createRadialGradient(m.x, m.y, 4, m.x, m.y, 26);
  grd.addColorStop(0, `rgba(255, 209, 102, ${0.55 * pulse})`);
  grd.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(m.x, m.y, 26 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // chevron
  ctx.strokeStyle = `rgba(255,209,102,${pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(m.x, m.y, 18 + 4 * Math.sin(time * 5), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
