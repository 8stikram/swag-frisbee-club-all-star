import { G } from './state.js';
import { COURT, GOAL_TOP, GOAL_BOTTOM } from '../core/constants.js';
import { norm, clamp } from '../core/utils.js';
import { sfx } from '../audio/audio.js';
import { addPopup, burst } from './fx.js';
import { jeSimule } from '../reseau/partie.js';
import { TRINITE_DUREE, TRINITE_DEPART, INCANTE, BRASIER_VOL, R_DINGO } from '../data/trinite-reglages.js';

// ---------------------------------------------------------------------------
// TRINITÉ, l'ultime de Sora. Donald et Dingo débarquent pendant 5 secondes.
//
// DINGO garde le but de Sora : il glisse de haut en bas sur la ligne, à une
// vitesse LIMITÉE — un tir qui part loin de lui peut encore passer, c'est le
// choix de l'utilisateur. Quand le disque franchit sa ligne à sa portée, il le
// frappe d'un coup de bouclier qui le renvoie VERS SORA.
//
// DONALD suit Sora un peu en retrait. Dès que Sora a le disque en main, il
// lance Brasier : le disque s'embrase, et le tir suivant de Sora part en tir
// PARFAIT du jeu (voir throwDisc). Un seul boost par ultime.
//
// Tout ce qui touche le match est arbitré par l'hôte ; l'invité reçoit la
// scène (voir scenesPourLeReseau) et ne fait qu'avancer les horloges entre
// deux paquets pour que l'animation reste fluide.
// ---------------------------------------------------------------------------

export const DINGO_VITESSE = 250;   // px/s le long de la ligne : assez vite pour garder, pas pour tout rattraper
export const DINGO_PORTEE = 38;     // demi-hauteur de ce que couvrent son bouclier et son corps
export const DINGO_RENVOI = 560;    // vitesse du disque renvoyé vers Sora : il doit rester attrapable
const DINGO_RECUL = 30;             // distance entre Dingo et la ligne de but
const DONALD_VITESSE = 330;

// Le côté du but de Sora, là où Dingo garde et d'où Donald le suit.
export const sensBut = p => (p.side === 1 ? -1 : 1);
export const ligneDingo = p => (p.side === 1 ? COURT.left + DINGO_RECUL : COURT.right - DINGO_RECUL);
// Même écart que dans le mockup validé : assez loin pour ne pas couvrir Sora.
function placeDonald(p) {
  return { x: clamp(p.x + sensBut(p) * 64, COURT.left + 24, COURT.right - 24),
           y: clamp(p.y + 28, COURT.top + 30, COURT.bottom - 6) };
}
// Un geste qui change garde la trace du précédent : le rendu les fond l'un
// dans l'autre au lieu de sauter d'une pose à l'autre.
function geste(o, g) {
  if (o.geste === g) return;
  o.prec = o.geste; o.precT = o.gT; o.geste = g; o.gT = 0;
}

export function lancerTrinite(p) {
  const d = placeDonald(p);
  G.trinite = {
    owner: p, t: 0,
    dingo: { x: ligneDingo(p), y: clamp(p.y, GOAL_TOP, GOAL_BOTTOM), vy: 0,
             geste: 'garde', gT: 0, prec: 'garde', precT: 0, impact: -9 },
    donald: { x: d.x, y: d.y, geste: 'garde', gT: 0, prec: 'garde', precT: 0,
              inc: -1, lancer: -9, boost: false }
  };
}

// La hauteur où le disque croisera la ligne de Dingo, rebonds sur les bords
// compris : sans eux il partait se placer hors du terrain sur un tir en biais.
function hauteurAuPassage(d, x) {
  const tt = (x - d.x) / d.vx;
  if (!(tt >= 0)) return d.y;
  let y = d.y + d.vy * tt;
  const h = COURT.bottom - COURT.top;
  y = ((y - COURT.top) % (2 * h) + 2 * h) % (2 * h);
  return COURT.top + (y > h ? 2 * h - y : y);
}

export function updateTrinite(dt) {
  const T = G.trinite;
  if (!T) return;
  T.t += dt; T.dingo.gT += dt; T.donald.gT += dt;
  if (T.t >= TRINITE_DUREE + TRINITE_DEPART) { G.trinite = null; return; }
  if (!jeSimule()) return;
  const p = T.owner, actif = T.t < TRINITE_DUREE;
  majDingo(T, p, dt, actif);
  majDonald(T, p, dt, actif);
}

// Le coup de bouclier dure l'armé, la frappe, l'arrêt sur image et le retour.
const ARME_FRAPPE = R_DINGO.armeDuree + R_DINGO.frappeDuree;
const COUP_TOTAL = ARME_FRAPPE + R_DINGO.arret + R_DINGO.retourDuree;

function majDingo(T, p, dt, actif) {
  const D = T.dingo, d = G.disc, sens = sensBut(p);
  const vers = d && !d.heldBy && d.vx * sens > 20;      // le disque file vers le but de Sora
  const enCoup = D.geste === 'coup' && D.gT < COUP_TOTAL;
  // Où se placer : sur la trajectoire si le disque arrive, sinon à sa hauteur.
  let cible = (GOAL_TOP + GOAL_BOTTOM) / 2;
  if (d) cible = vers ? hauteurAuPassage(d, D.x) : (d.heldBy ? d.heldBy.y : d.y);
  cible = clamp(cible, GOAL_TOP + 6, GOAL_BOTTOM - 6);
  if (actif && !enCoup) {
    const dy = cible - D.y, pas = DINGO_VITESSE * dt;
    D.vy = Math.abs(dy) <= pas ? dy / Math.max(dt, 1e-3) : Math.sign(dy) * DINGO_VITESSE;
    D.y += D.vy * dt;
    geste(D, Math.abs(D.vy) > 60 ? 'course' : 'garde');
  } else {
    D.vy = 0;
    if (!enCoup) geste(D, 'garde');
  }
  if (!actif || !vers) return;
  // Il arme un peu avant que le disque arrive, pour que le bouclier frappe
  // au bon moment au lieu de partir après coup.
  const tt = (D.x - d.x) / d.vx;
  if (!enCoup && tt > 0 && tt < ARME_FRAPPE && Math.abs(hauteurAuPassage(d, D.x) - D.y) < DINGO_PORTEE) geste(D, 'coup');
  // Le disque franchit sa ligne pendant cette image, ou vient de la franchir.
  const avant = d.x, apres = d.x + d.vx * dt;
  if ((avant - D.x) * (apres - D.x) > 0 && Math.abs(d.x - D.x) > 16) return;
  const k = Math.abs(d.vx * dt) > 1 ? clamp((D.x - avant) / (d.vx * dt), 0, 1) : 0;
  const yc = d.y + d.vy * dt * k;
  if (Math.abs(yc - D.y) >= DINGO_PORTEE) return;
  renvoiDeDingo(T, p, d, yc);
}

// Le coup de bouclier : le disque repart vers Sora, à une vitesse qu'il peut attraper.
function renvoiDeDingo(T, p, d, yc) {
  const D = T.dingo, sens = sensBut(p);
  const x0 = D.x - sens * 18;
  const v = norm(p.x - x0, p.y - yc);
  d.x = x0; d.y = yc; d.vx = v.x * DINGO_RENVOI; d.vy = v.y * DINGO_RENVOI;
  d.heldBy = null; d.free = true; d.thrower = null; d.thrownAt = G.now; d.bounced = false;
  d.kind = 'normal'; d.super = false; d.big = false; d.stall = 0;
  if (D.geste !== 'coup' || D.gT > ARME_FRAPPE + .05) { D.prec = D.geste; D.precT = D.gT; D.geste = 'coup'; D.gT = ARME_FRAPPE - .02; }
  D.impact = T.t;
  G.shake = Math.max(G.shake, 6);
  burst(x0, yc, '#86cdf0', 14);
  sfx('trinite-bouclier');
  addPopup('DINGO !', '#9ad12e', 13, .6, D.y - 90);
}

function majDonald(T, p, dt, actif) {
  const O = T.donald;
  if (O.geste !== 'incante') {
    const c = placeDonald(p), dx = c.x - O.x, dy = c.y - O.y, dist = Math.hypot(dx, dy);
    if (dist > 3) { const k = Math.min(1, DONALD_VITESSE * dt / dist); O.x += dx * k; O.y += dy * k; }
    geste(O, dist > 14 ? 'trotte' : 'garde');
  }
  // Brasier : dès que Sora a le disque, une seule fois par ultime — c'est le
  // LANCER qui fait foi, pas l'incantation : la boule de feu arrive après que
  // Donald a déjà baissé son bâton.
  if (actif && O.lancer < 0 && O.inc < 0 && p.holding && T.t > .5) { O.inc = 0; geste(O, 'incante'); }
  if (O.lancer >= 0 && !O.boost && T.t - O.lancer >= BRASIER_VOL) {
    O.boost = true;
    p.triniteFeu = true;
    G.shake = Math.max(G.shake, 5);
    sfx('trinite-feu');
    addPopup('BRASIER !', '#ff7a2a', 15, .8, p.y - 70);
  }
  if (O.inc < 0) return;
  O.inc += dt;
  if (O.lancer < 0 && O.inc >= INCANTE.lancer) { O.lancer = T.t; sfx('trinite-sort'); }
  if (O.inc >= INCANTE.fin) { O.inc = -1; geste(O, 'garde'); }
}
