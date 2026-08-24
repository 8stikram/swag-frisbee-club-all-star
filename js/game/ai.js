import { G } from './state.js';
import {
  COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, DASH_SPEED, throwSpeed,
  DASH_CATCH_MULT, DIVE_RANGE, PERFECT_WINDOW, CATCH_RADIUS
} from '../core/constants.js';
import { clamp, norm, gauss, rand, approach } from '../core/utils.js';
// Tout le hasard de l'IA est semé : ses erreurs de visée et ses hésitations sont
// des décisions de jeu. Deux machines qui simulent la même IA doivent la voir
// prendre les mêmes. C'est ce qui rend possible la reprise par l'IA quand un
// joueur se déconnecte, sans que les deux écrans partent chacun de leur côté.
import { gaussJeu, randJeu, aleaJeu } from '../core/alea.js';
import { dust } from './fx.js';
import { onCatch, throwDisc, doDive } from './actions.js';
import { startDash, cancelDash, doFeint } from './input.js';
import { trySpecial } from './specials.js';
import { SPECIALS } from '../data/specials.js';

export function predictArrivalAtX(disc, targetX) {
  if (!disc || !disc.free) return null;
  let x = disc.x, y = disc.y, vx = disc.vx, vy = disc.vy;
  const dt = 1 / 60, maxSteps = 600, r = 9;
  if (Math.abs(vx) < 10) return null;
  for (let i = 0; i < maxSteps; i++) {
    x += vx * dt; y += vy * dt;
    if (y < COURT.top + r) { y = COURT.top + r; vy = -vy; }
    if (y > COURT.bottom - r) { y = COURT.bottom - r; vy = -vy; }
    if ((vx > 0 && x >= targetX) || (vx < 0 && x <= targetX)) {
      return { y: clamp(y, COURT.top + 10, COURT.bottom - 10), t: i * dt };
    }
  }
  return null;
}

export function getOpenCorner(side) {
  const y = (aleaJeu() < 0.5) ? GOAL_TOP + 10 : GOAL_BOTTOM - 10;
  return { x: side === 1 ? COURT.right : COURT.left, y };
}

export function getMirrorGoal(side, corner) {
  const wallY = (corner.y < CY) ? COURT.top : COURT.bottom;
  const reflectedY = wallY + (wallY - corner.y);
  return { x: side === 1 ? COURT.right : COURT.left, y: reflectedY };
}

// Moral de l'IA : elle prend confiance quand elle mène et doute quand elle est
// menée. Le facteur module ses prises de risque (plongeon, parry, dash) sans
// jamais toucher à ses capacités brutes — elle garde exactement les mêmes règles
// que le joueur, seule son audace varie.
function morale(p) {
  return clamp(1 + (p.score - p.foe.score) * 0.045, .6, 1.5);
}

// Choisit une bonne fois la cible d'un tir : un coin, ou une bande cherchée
// par la bande. Le bruit de visée (D.err) est tiré ici aussi, donc une seule
// fois par possession — c'est ce qui rend l'intention de l'IA lisible.
function choisirVisee(p, D, d) {
  const corner = getOpenCorner(p.side);
  const parLaBande = aleaJeu() < 0.45 || d.aggro > 3;
  const point = parLaBande ? getMirrorGoal(p.side, corner) : corner;
  const bruit = gaussJeu() * D.err * 0.4;
  // `but` est l'endroit réellement visé dans la cage. Sur un tir par la bande,
  // le point de visée est volontairement hors du terrain (c'est le reflet), il
  // ne dit donc rien de l'endroit où l'adversaire doit se placer.
  return { x: point.x, y: point.y + bruit, but: corner.y + bruit };
}

export function updateAI(p, dt) {
  const d = p.ai, D = d.diff, foe = p.foe, disc = G.disc;
  const mor = morale(p);
  if (p.stun > 0) { d.target = { x: p.x, y: p.y }; return; }
  // Ultime : jauge pleine -> tente de le lancer, avec une eagerness qui
  // dépend de la difficulté (D.special). Coupé pendant la démo en fond de
  // menu par trySpecial() lui-même.
  if (p.meter >= 100 && !G.cine && (G.state === 'play' || G.state === 'serve')) {
    const u = SPECIALS[p.char.ult];
    if (u && (!u.needsDisc || p.holding) && aleaJeu() < D.special * dt) trySpecial(p);
  }
  const attackSign = p.side === 2 ? -1 : 1;
  const hasDisc = p.holding;
  if (hasDisc) {
    // Le plan se rejoue à la prise du disque, pas à l'entrée en STRIKE : l'anti-
    // plantage repasse l'IA en RECOVER en pleine possession, et elle rechoisissait
    // alors une deuxième visée au milieu de son propre tir.
    if (!d.avaitDisque) {
      // Certaines possessions, l'IA vise volontairement une charge quasi
      // complète pour sortir un vrai super-lancer, comme le ferait un joueur.
      d.superCommit = aleaJeu() < D.smart * 0.35;
      d.aim = null;
      d.veutFeinter = aleaJeu() < D.smart * 0.5;
    }
    if (d.state !== 'STRIKE') { d.state = 'STRIKE'; d.stateTimer = 0; }
  } else {
    const puckInOwn = (attackSign * disc.x) < 0;
    const puckIncoming = (attackSign * disc.vx) < -15;
    const puckOutgoing = (attackSign * disc.vx) > 15;
    const distToPuck = Math.hypot(disc.x - p.x, disc.y - p.y);
    let newState = d.state;
    // `reactAt` matérialise le temps de réaction : en dessous, l'IA n'a pas
    // encore "vu" le disque partir et ne bascule pas en défense.
    if (puckIncoming && !hasDisc && distToPuck < 350 && G.now >= d.reactAt) newState = 'DEFEND';
    else if (puckOutgoing && !hasDisc && puckInOwn) newState = 'RECOVER';
    else if (!hasDisc && !puckInOwn) newState = 'READY';
    else if (d.aggro > 0 && puckInOwn && distToPuck < 350) newState = 'STRIKE';
    else newState = 'READY';
    if (newState !== d.state) { if (d.stateTimer < 0.15) newState = d.state; else d.stateTimer = 0; }
    else d.stateTimer += dt;
    d.state = newState;
  }
  // Anti-plantage : si l'IA stagne près de la ligne médiane, elle s'en détache
  // au bout de 1,5 s. La voir coller au centre sans rien faire cassait le rythme.
  const presDuCentre = Math.abs(p.x - CX) < 90;
  d.centerT = presDuCentre ? (d.centerT || 0) + dt : 0;
  if (d.centerT > 1.5) {
    d.state = 'RECOVER';
    d.centerT = 0;
    if (p.dashT <= 0 && p.dashGap <= 0) startDash(p, norm(p.home.x - p.x, p.home.y - p.y));
  }
  d.avaitDisque = hasDisc;
  if (d.hesT > 0) d.hesT -= dt;
  // L'errance est bien plus marquée en Facile qu'en Difficile : c'est ce qui
  // fait la différence entre un CPU qui flotte et un CPU qui tient sa ligne.
  if (d.hesT <= 0 && aleaJeu() < 0.005) {
    const flou = 1.4 - D.smart;
    d.hesT = 0.2 + randJeu(0.3);
    d.hes = { x: gaussJeu() * 26 * flou, y: gaussJeu() * 32 * flou };
  }

  // Feinte adverse : le geste part, le disque avance — l'IA peut y croire et
  // se jeter dans le vide. Plus elle est faible, plus elle mord ; à Difficile
  // elle ne bronche presque jamais. On ne décide qu'une fois par feinte.
  if (foe.feintT > 0 && !d.feinteVue) {
    d.feinteVue = true;
    if (aleaJeu() < (1 - D.smart) * 0.85) {
      d.aMordu = true;                 // repère de mise au point, lu par le debug
      d.hesT = 0; d.aggro = 0;
      // Elle part défendre la trajectoire annoncée, et reste en retard sur le
      // vrai tir le temps de se replacer.
      d.reactAt = G.now + 0.22 + randJeu(0.2);
      const vise = foe.feintDir || { x: p.side === 1 ? -1 : 1, y: 0 };
      if (p.dashT <= 0 && p.dashGap <= 0) startDash(p, norm(vise.x, vise.y));
      else { d.hesT = .45; d.hes = { x: vise.x * 120, y: vise.y * 140 }; }
    }
  }
  if (foe.feintT <= 0) { d.feinteVue = false; d.aMordu = false; }
  let target = { x: p.x, y: p.y };
  switch (d.state) {
    case 'DEFEND': {
      const pred = predictArrivalAtX(disc, p.side === 1 ? COURT.left + 80 : COURT.right - 80);
      if (pred) {
        let err = gaussJeu() * D.err * 0.4;
        if (d.miss) err += d.missOff * 0.4;
        let ty = pred.y + err;
        const m = G.mem, tot = m.t + m.m + m.b;
        if (tot >= 4) {
          const fav = (m.t * (GOAL_TOP + 34) + m.m * CY + m.b * (GOAL_BOTTOM - 34)) / tot;
          ty += (fav - ty) * Math.min(0.25, tot * 0.02);
        }
        target.y = clamp(ty, COURT.top + 20, COURT.bottom - 20);
        target.x = p.side === 1 ? COURT.left + 60 : COURT.right - 60;
        if (d.aggro > 0) target.x += p.side === 1 ? 30 : -30;
      } else { target = { x: p.home.x, y: CY + Math.sin(G.now * 1.2 + p.side) * 20 }; }
      break;
    }
    case 'STRIKE': {
      // La visée est arrêtée une fois pour toutes en entrant en STRIKE. Avant,
      // le coin et le bruit de visée étaient retirés au sort à chaque image :
      // la cible sautait d'un poteau à l'autre soixante fois par seconde et le
      // viseur tremblait sans arrêt, illisible pour l'adversaire.
      if (!d.aim) d.aim = choisirVisee(p, D, d);
      const alpha = 0.3;
      d.emaTarget.x = d.emaTarget.x || d.aim.x;
      d.emaTarget.y = d.emaTarget.y || d.aim.y;
      d.emaTarget.x = alpha * d.aim.x + (1 - alpha) * d.emaTarget.x;
      d.emaTarget.y = alpha * d.aim.y + (1 - alpha) * d.emaTarget.y;
      target = { x: d.emaTarget.x, y: d.emaTarget.y };
      if (d.aggro < 4) d.aggro += dt * 0.3;
      break;
    }
    case 'RECOVER': {
      target = { x: p.home.x, y: CY + Math.sin(G.now * 1.0 + p.side) * 15 };
      if (Math.hypot(p.x - target.x, p.y - target.y) < 30) d.state = 'READY';
      break;
    }
    case 'READY':
    default: { target = { x: p.home.x, y: CY + Math.sin(G.now * 1.5 + p.side) * 30 }; break; }
  }
  target.x = clamp(target.x, COURT.left + 30, COURT.right - 30);
  target.y = clamp(target.y, COURT.top + 20, COURT.bottom - 20);
  d.target = target;
  const dx = d.target.x - p.x, dy = d.target.y - p.y, dist = Math.hypot(dx, dy);
  const speedFactor = D.speed * 0.85;
  const spd = p.speed * speedFactor * (d.aggro > 0 ? 1.08 : 1);
  if (d.state === 'STRIKE' && dist > 160 && p.dashCd <= 0 && aleaJeu() < D.smart * 0.25 + 0.05) {
    const dd = norm(dx, dy);
    p.dashV.x = dd.x * DASH_SPEED * 0.8; p.dashV.y = dd.y * DASH_SPEED * 0.8;
    p.dashCd = 0.9; dust(p.x, p.y + 20, 5);
  }
  let tx = 0, ty = 0;
  if (dist > 6) { tx = dx / dist * spd; ty = dy / dist * spd; }
  if (d.hesT > 0) { tx += d.hes.x * 0.15; ty += d.hes.y * 0.15; }
  p.vx = approach(p.vx, tx, 9, dt);
  p.vy = approach(p.vy, ty, 9, dt);
  p.face = (foe.x > p.x) ? 1 : -1;
  if (disc.free && !p.holding && p.throwCd <= 0 && p.stun <= 0 && p.diveT <= 0 && p.diveDown <= 0) {
    const dd = Math.hypot(disc.x - p.x, disc.y - p.y);
    const sp = Math.hypot(disc.vx, disc.vy);
    const closing = (disc.x - p.x) * disc.vx + (disc.y - p.y) * disc.vy < 0;
    const tti = dd / Math.max(1, sp);

    // Dash défensif : le disque file hors de portée, elle va le chercher.
    // La probabilité est ramenée par seconde pour ne pas dépendre du framerate.
    if (dd > 70 && dd < 260 && closing && p.dashT <= 0 && p.dashGap <= 0
      && aleaJeu() < D.dash * mor * 3 * dt) {
      startDash(p, norm(disc.x - p.x, disc.y - p.y));
    }

    // Cancel Dash : elle dashe, le disque part ailleurs — plutôt que de finir
    // sa course dans le vide, elle plante les freins pour se replacer aussitôt.
    // La fenêtre d'attrapé qu'ouvre l'annulation lui sert exactement comme au
    // joueur. Réservé aux difficultés qui maîtrisent la mécanique.
    if (p.dashT > 0 && !closing && dd > p.char.catchR * CATCH_RADIUS * 1.6
      && aleaJeu() < D.smart * 2.2 * dt) {
      cancelDash(p);
    }

    if (dd < p.char.catchR * CATCH_RADIUS * (p.dashT > 0 ? DASH_CATCH_MULT : 1.05)) {
      onCatch(p, sp, 0, 0);
    } else if (closing && dd < DIVE_RANGE + 26) {
      // Contre au plongeon. Un CPU qui « vise le parry » attend la fenêtre
      // exacte du Perfect Dive ; les autres plongent plus tôt et se contentent
      // d'un renvoi normal. C'est ce qui creuse l'écart entre les difficultés.
      const viseParry = D.parry > 0 && aleaJeu() < D.parry * mor;
      const doitPlonger = viseParry ? (tti <= PERFECT_WINDOW && dd < DIVE_RANGE)
        : (aleaJeu() < D.dive * mor * 3 * dt);
      if (doitPlonger) {
        const corner = getOpenCorner(p.side);
        doDive(p, norm(corner.x - p.x, corner.y + gaussJeu() * D.err * .4 - p.y));
      }
    }
  }
  if (d.state === 'STRIKE' && p.holding) {
    p.holdTimer += dt;
    const aimTarget = (d.emaTarget.x && d.emaTarget.y) ? d.emaTarget : { x: (p.side === 1 ? COURT.right : COURT.left), y: CY };
    // Feinte de tir : elle ne la sort que si l'adversaire est déjà en position
    // d'intercepter — feinter dans le vide n'aurait trompé personne.
    if (d.veutFeinter && p.feintT <= 0 && p.feintCd <= 0 && p.holdTimer > .25) {
      // Il suffit que l'adversaire couvre la hauteur réellement visée dans la
      // cage : c'est lui qui partira intercepter, donc c'est lui qu'il y a à
      // tromper. On se garde bien de comparer au point de visée d'un tir par
      // la bande, qui se trouve hors du terrain.
      const hauteurVisee = d.aim ? d.aim.but : CY;
      const foeEnGarde = Math.abs(foe.y - hauteurVisee) < 190;
      if (foeEnGarde) {
        d.veutFeinter = false;
        doFeint(p, norm(aimTarget.x - p.x, aimTarget.y - p.y));
        p.holdTimer = 0;
      }
    }
    const threshold = (G.p1.score + G.p2.score > 5) ? 0.4 : 0.8;
    if (p.feintT <= 0 && (p.holdTimer > threshold || d.forceShoot)) {
      p.charging = true;
      p.charge += dt / p.char.chargeT * (d.aggro > 3 ? 1.1 : 0.9);
      const releaseAt = d.superCommit ? 0.96 : Math.max(0.1, D.smart * 0.25);
      const maxHold = d.superCommit ? 1.6 : 1.2;
      if (p.charge >= releaseAt || p.holdTimer > maxHold) {
        const aimDir = norm(aimTarget.x - p.x, aimTarget.y - p.y);
        throwDisc(p, aimDir, throwSpeed(p.charge, p.char.power));
        d.state = 'RECOVER';
        p.holdTimer = 0;
        d.forceShoot = false;
        d.emaTarget.x = 0; d.emaTarget.y = 0;
      }
    }
    if (p.feintT <= 0 && p.holdTimer > 1.8) {
      const aimDir = norm(aimTarget.x - p.x, aimTarget.y - p.y);
      throwDisc(p, aimDir, throwSpeed(Math.min(p.charge + 0.3, 1), p.char.power));
      d.state = 'RECOVER';
      p.holdTimer = 0;
      d.forceShoot = false;
      d.emaTarget.x = 0; d.emaTarget.y = 0;
    }
  }
}
