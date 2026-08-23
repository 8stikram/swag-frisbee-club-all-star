import { G } from './state.js';
import {
  COURT, GOAL_TOP, GOAL_BOTTOM, DISC_RADIUS, DISC_BIG_RADIUS, DASH_CATCH_MULT,
  FEINT_TIME, FEINT_FREE, FEINT_CD, FEINT_REACH, METER_GAIN, CATCH_RADIUS
} from '../core/constants.js';
import { norm, gauss, clamp, rand } from '../core/utils.js';
import { sfx } from '../audio/audio.js';
import { disqueImmobile, testerPanier } from './zones.js';
import { burst, dust, addPopup } from './fx.js';
import { onCatch, scoreGoal, ownFoul, setupServe } from './actions.js';
import { RASENGAN } from '../data/specials.js';
import { getSkinId } from '../data/skins.js';
import { couleurTrainee, semerEnVol, eclatDeRebond } from '../data/disc-fx.js';

export const DISC_R = () => G.disc.big ? DISC_BIG_RADIUS : DISC_RADIUS;

export function updateDisc(dt) {
  const d = G.disc;
  if (d.heldBy) {
    const h = d.heldBy;
    d.x = h.x + h.face * 20; d.y = h.y + Math.sin(G.now * 6) * 2; d.spin += dt * 4;
    // Feinte : le disque s'élance puis claque dans la main. La sortie est rapide
    // et le retour encore plus, pour tromper le réflexe de l'adversaire.
    if (h.feintT > 0) {
      const k = h.feintT / FEINT_TIME;             // 1 au départ -> 0 à la fin
      const out = Math.sin(k * Math.PI) * FEINT_REACH;
      d.x += h.feintDir.x * out; d.y += h.feintDir.y * out;
      d.spin += dt * 26;
      // Pendant FEINT_FREE le disque est réellement interceptable : un adversaire
      // collé au bon moment peut le voler. C'est le risque de la feinte.
      if (h.feintT > FEINT_TIME - FEINT_FREE) {
        const foe = h.foe;
        if (foe && !foe.holding && foe.throwCd <= 0 && foe.stun <= 0
          && foe.diveT <= 0 && foe.diveDown <= 0
          && Math.hypot(d.x - foe.x, d.y - foe.y) < foe.char.catchR * CATCH_RADIUS * .8) {
          h.holding = false; h.feintT = 0; h.charging = false; h.charge = 0;
          d.heldBy = null; d.free = true; d.thrower = h; d.thrownAt = G.now - 1;
          addPopup('INTERCEPTION !', '#ff5340', 15, .9, foe.y - 56);
          onCatch(foe, 0, 0, 0);
        }
      }
    } else if (h.feintCd > 0 && h.feintCd < FEINT_CD + .02 && !h.feintSwish) {
      // Le disque vient de revenir en main : petit claquement sec.
      h.feintSwish = true; sfx('swish');
    }
    if (h.feintT <= 0 && h.feintCd <= 0) h.feintSwish = false;
    return;
  }
  if (!d.free) return;
  d.age += dt;
  d.spin += Math.hypot(d.vx, d.vy) * dt * .06;
  if (d.kind === 'kurama') {
    const s = Math.hypot(d.vx, d.vy) || 1;
    d.vx *= d.kSpeed / s; d.vy *= d.kSpeed / s;
    // Étincelles semées par le tir en vol : bleu Rasengan, comme le disque.
    if (Math.random() < .7) G.particles.push({ x: d.x, y: d.y, vx: gauss() * 70, vy: gauss() * 70, life: .35, c: Math.random() < .5 ? RASENGAN : '#c8f0ff', s: 3, g: 0 });
  } else { d.vx *= Math.exp(-.08 * dt); d.vy *= Math.exp(-.08 * dt); }
  if (d.super && Math.random() < .6) G.particles.push({ x: d.x, y: d.y, vx: gauss() * 50, vy: gauss() * 50, life: .3, c: '#ff5340', s: 2.5, g: 0 });
  if (d.thrower && d.thrower.ck === 'isaac' && Math.random() < .35) G.particles.push({ x: d.x, y: d.y, vx: gauss() * 30, vy: rand(20, 90), life: .5, c: '#7fd8ff', s: 2, g: 400 });
  d.x += d.vx * dt; d.y += d.vy * dt;
  // Hors coups spéciaux, la traînée et ce que le disque sème appartiennent au
  // disque lui-même : chacun a les siens, décrits en un seul endroit.
  const ordinaire = d.kind !== 'kurama' && d.kind !== 'matilda' && !d.super;
  G.trail.push({
    x: d.x, y: d.y,
    c: d.kind === 'kurama' ? RASENGAN
      : (d.super ? '#ff5340'
        : (d.kind === 'matilda' ? '#8dff6a' : couleurTrainee(getSkinId(), d.spin)))
  });
  if (ordinaire) semerEnVol(getSkinId(), d, G.particles);
  // Tremblement laissé par un rebond de Gélatine : il s'amortit vite, sinon le
  // disque a l'air cassé plutôt qu'élastique.
  if (d.wobble > 0) d.wobble = Math.max(0, d.wobble - dt * 2.6);
  if (G.trail.length > 26) G.trail.shift();
  const sp = Math.hypot(d.vx, d.vy);
  const rest = d.kind === 'kurama' ? 1 : .99;
  const dirB = norm(d.vx, d.vy);
  const r = DISC_R();
  if (d.y < COURT.top + r) { d.y = COURT.top + r; d.vy = Math.abs(d.vy) * rest; onBounce(d); }
  if (d.y > COURT.bottom - r) { d.y = COURT.bottom - r; d.vy = -Math.abs(d.vy) * rest; onBounce(d); }
  const inGoalY = d.y > GOAL_TOP && d.y < GOAL_BOTTOM;
  // Un disque qui revient de ricochet peut parfaitement finir dans sa propre
  // cage, même si c'est soi qui l'a lancé : c'est le risque des tirs par la
  // bande. Ce qui est interdit, c'est de VISER en arrière — voir viseVersAvant().
  if (d.x < COURT.left + r) {
    if (inGoalY) { if (d.x < COURT.left - r) { scoreGoal(G.p2, d.y); return; } }
    else {
      const pre = sp;
      d.x = COURT.left + r; d.vx = Math.abs(d.vx) * rest; onBounce(d);
      if (G.state === 'play' && d.thrower === G.p1 && pre > 180) { ownFoul(G.p1); return; }
    }
  }
  if (d.x > COURT.right + r) {
    if (inGoalY) { if (d.x > COURT.right + r) { scoreGoal(G.p1, d.y); return; } }
    else {
      const pre = sp;
      d.x = COURT.right + r; d.vx = -Math.abs(d.vx) * rest; onBounce(d);
      if (G.state === 'play' && d.thrower === G.p2 && pre > 180) { ownFoul(G.p2); return; }
    }
  }
  testerPanier(d);
  if (sp < 70 && !d.big) {
    d.stall += dt;
    if (d.stall > 1.6) {
      // Au Stadium, un disque qui s'arrête dans un cercle ou dans la zone de
      // dunk rapporte des points au lieu d'être perdu : c'est tout l'intérêt
      // d'y placer son tir plutôt que de viser la cage à tout prix.
      const recompense = disqueImmobile(d);
      if (!recompense) addPopup('DISQUE MORT', '#9fb4dd', 13, 1);
      setupServe(d.thrower === G.p1 ? 2 : 1);
    }
  } else d.stall = 0;
  for (const p of [G.p1, G.p2]) {
    if (p.holding || p.throwCd > 0 || p.stun > 0) continue;
    // Le plongeon ne rattrape jamais : il ne fait que repousser (voir doDive).
    if (p.diveT > 0 || p.diveDown > 0) continue;
    if (G.now - d.thrownAt < .24 && d.thrower === p && !d.bounced) continue;
    // Dasher vers le disque élargit nettement la fenêtre d'attrapé : c'est la
    // récompense du joueur qui va le chercher.
    // La hitbox élargie vaut pendant le dash et survit brièvement à un Cancel Dash.
    const dashBonus = (p.dashT > 0 || p.cancelCatchT > 0) ? DASH_CATCH_MULT : 1;
    const r2 = p.char.catchR * CATCH_RADIUS * (d.kind === 'kurama' ? .5 : 1) * (p.lunge > 0 ? 1.45 : 1) * dashBonus + (d.big ? 8 : 0);
    if (Math.hypot(d.x - p.x, d.y - p.y) < r2) { onCatch(p, sp, dirB.x, dirB.y); break; }
  }
}

export function onBounce(d) {
  d.bounced = true;
  if (d.kind === 'kurama') { sfx('bigbounce'); G.shake = Math.max(G.shake, 8); burst(d.x, d.y, RASENGAN, 16); }
  else {
    sfx('bounce'); dust(d.x, d.y, 6); G.shake = Math.max(G.shake, 3);
    // Chaque disque a son éclat de rebond : la rosace, la pyramide, l'éruption.
    eclatDeRebond(getSkinId(), d, G.particles);
  }
  if (d.thrower) {
    const ownSideWall = (d.x <= COURT.left + DISC_R() && d.thrower.side === 1) || (d.x >= COURT.right - DISC_R() && d.thrower.side === 2);
    if (!ownSideWall) { d.thrower.meter = clamp(d.thrower.meter + 5 * METER_GAIN, 0, 100); }
  }
}

export function updateDecoys(dt) {
  for (let i = G.decoys.length - 1; i >= 0; i--) {
    const o = G.decoys[i];
    o.x += o.vx * dt; o.y += o.vy * dt; o.life -= dt;
    if (o.y < COURT.top + 9 || o.y > COURT.bottom - 9) o.vy *= -1;
    const inGoalY = o.y > GOAL_TOP && o.y < GOAL_BOTTOM;
    if (o.x < COURT.left - DISC_R() && inGoalY) { scoreGoal(G.p2, o.y); G.decoys.splice(i, 1); continue; }
    if (o.x > COURT.right + DISC_R() && inGoalY) { scoreGoal(G.p1, o.y); G.decoys.splice(i, 1); continue; }
    const foe = o.thrower.foe;
    if (foe && !foe.holding && Math.hypot(o.x - foe.x, o.y - foe.y) < foe.char.catchR * CATCH_RADIUS) {
      sfx('catch');
      addPopup('DÉCOY DÉTRUIT !', '#9fe8ff', 12, .6, foe.y - 40);
      G.decoys.splice(i, 1); continue;
    }
    if (o.life <= 0 || o.x < COURT.left - 30 || o.x > COURT.right + 30) G.decoys.splice(i, 1);
  }
}
