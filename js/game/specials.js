import { G, comment } from './state.js';
import { SPECIALS } from '../data/specials.js';
import { sfx } from '../audio/audio.js';
import { addPopup, burst, dust } from './fx.js';
import { dropDisc } from './actions.js';
import { gauss, rand } from '../core/utils.js';
import { gaussJeu, randJeu } from '../core/alea.js';
import { jeSimule } from '../reseau/partie.js';

export function trySpecial(p) {
  if (!p || G.demo || p.stun > 0 || G.cine) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  if (p.meter < 100) { addPopup('JAUGE SPÉCIAL VIDE', '#9fb4dd', 11, .7, p.y - 60); sfx('deny'); return; }
  const u = SPECIALS[p.char.ult];
  if (!u) return;
  if (u.needsDisc && !p.holding) { addPopup('IL FAUT LE DISQUE !', '#9fb4dd', 11, .7, p.y - 60); sfx('deny'); return; }
  u.cast(p);
}

export function launchCine(cine) {
  const u = SPECIALS[cine.ult];
  if (u && u.launch) u.launch(cine.p);
}

// La cloche se balance et sonne. À chaque coup, elle secoue l'écran et
// perturbe l'adversaire : sa visée part de travers un court instant. On agit
// sur son contrôle plutôt que sur le cadrage de sa moitié de terrain, qui
// aurait laissé apparaître des bords noirs en décalant l'image.
// Vitesse du balancement. La cloche sonne à chaque extrême de sa course, donc
// un coup tous les π/OSC ≈ 0,92 s — le rythme est porté par l'animation
// elle-même plutôt que par un minuteur qui vivrait à côté.
const OSC = 3.4;

export function updateBell(dt) {
  const b = G.bell;
  if (!b) return;
  b.t += dt;
  if (b.t >= b.dur) {
    G.bell = null;
    addPopup('LA CLOCHE SE TAIT', '#f5c542', 13, .9);
    return;
  }
  // L'angle est calculé ici et lu par le rendu : les deux ne peuvent donc pas
  // se désynchroniser, et le son tombe pile sur le changement de côté.
  b.bal = Math.sin(b.t * OSC);
  const sens = Math.cos(b.t * OSC) >= 0 ? 1 : -1;
  if (b.sens === undefined) b.sens = sens;
  if (sens !== b.sens) {               // elle vient de basculer : elle sonne
    b.sens = sens;
    b.ring = 1;
    G.shake = Math.max(G.shake, 7);
    sfx('bell');
    // L'étourdissement, lui, s'arbitre : il arrive à l'invité par l'état.
    const foe = jeSimule() ? b.owner.foe : null;
    if (foe) {
      foe.dizzy = .55;                 // sa course dérive pendant ce temps
      if (foe.ai) foe.ai.hesT = .4;    // et l'IA hésite tout autant
    }
  }
  b.ring = Math.max(0, b.ring - dt * 2.2);
  // Elle repousse le disque qui approche de la cage protégée.
  const d = G.disc;
  if (jeSimule() && d.free && Math.hypot(d.x - b.x, d.y - b.y) < 62) {
    const away = b.side === 1 ? 1 : -1;
    d.vx = Math.abs(d.vx || 400) * away * 1.15;
    d.vy += gaussJeu() * 180;                 // semé : trajectoire du disque
    G.shake = Math.max(G.shake, 9);
    sfx('bigbounce');
    addPopup('REPOUSSÉ !', '#f5c542', 14, .7, b.y - 60);
  }
}

// Rafale de Mamie Trayette. Deux règles portent tout l'ultime :
//
// 1. Chaque balle fige sa direction à l'instant du tir. Bouger la visée
//    ensuite réoriente le canon et les balles suivantes, jamais celles déjà
//    parties — sinon on téléguiderait la rafale après coup, et une balle
//    tirée à l'opposé reviendrait sur l'adversaire.
// 2. Mamie ne subit aucun recul : c'est l'adversaire qui recule, par à-coups,
//    une poussée par balle qui touche.
const CADENCE = .085;
const BALLE_V = 780;
const BALLE_R = 26;
// Poussée par balle. Volontairement forte : à 190 l'adversaire dérivait à
// peine plus qu'en marchant et la rafale se lisait comme un feu d'artifice
// sans effet. À cette valeur, une rafale complète le repousse d'un bon tiers
// de terrain — c'est le sens de l'ultime.
const POUSSEE = 420;

export function updateRafale(dt) {
  const r = G.rafale;
  if (r) {
    r.t += dt;
    if (r.t >= r.dur) {
      G.rafale = null;
      addPopup('PLUS DE MUNITIONS', '#c9b380', 13, .9);
    } else {
      const p = r.owner;
      // La visée vient de la fiche d'intentions, jamais de la souris : un
      // joueur distant n'a pas de curseur sur cette machine, et sa rafale
      // partirait vers le curseur de l'hôte.
      const c = p.cmd;
      const vx = (c && (c.visee.x || c.visee.y)) ? c.visee.x : (p.side === 1 ? 1 : -1);
      const vy = (c && (c.visee.x || c.visee.y)) ? c.visee.y : 0;
      const a0 = Math.atan2(vy, vx);
      p.face = vx >= 0 ? 1 : -1;
      r.prochainTir -= dt;
      if (r.prochainTir <= 0) {
        r.prochainTir = CADENCE;
        // Gerbe conique : la dispersion est tirée à la naissance de la balle,
        // elle fait donc partie de sa trajectoire figée.
        //
        // Tirage DÉCORATIF, pas semé, et c'est délibéré : les deux machines
        // font naître leurs propres balles, à des instants qui diffèrent de
        // quelques millisecondes puisque le minuteur de l'invité arrive par le
        // réseau. Puiser ici dans la suite semée aurait donc consommé un nombre
        // de tirages différent de chaque côté et décalé tout le hasard partagé
        // — trajectoires du disque et décisions d'IA comprises. Ce que la
        // dispersion décide vraiment (qui est touché) reste arbitré par l'hôte
        // plus bas, sous `jeSimule()`.
        const a = a0 + gauss() * .06;
        G.balles.push({
          x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22,
          vx: Math.cos(a) * BALLE_V, vy: Math.sin(a) * BALLE_V,
          a, vie: .9, owner: p
        });
        G.shake = Math.max(G.shake, 3);
        sfx('charge');
      }
    }
  }

  // Les balles vivent au-delà de la fin de la rafale : celles déjà en l'air
  // finissent leur course au lieu de disparaître d'un coup.
  for (let i = G.balles.length - 1; i >= 0; i--) {
    const b = G.balles[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.vie -= dt;
    let fini = b.vie <= 0;
    // Le knockback est de l'arbitrage : l'invité voit les balles voler, mais
    // c'est l'hôte qui décide qui est touché et le lui envoie par l'état.
    if (!fini && jeSimule()) {
      const foe = b.owner.foe;
      if (foe && Math.hypot(foe.x - b.x, foe.y - b.y) < BALLE_R) {
        foe.vx += Math.cos(b.a) * POUSSEE;
        foe.vy += Math.sin(b.a) * POUSSEE;
        if (foe.ai) foe.ai.hesT = Math.max(foe.ai.hesT || 0, .12);
        G.shake = Math.max(G.shake, 5);
        burst(b.x, b.y, '#ffb020', 5);
        fini = true;
      }
    }
    if (fini) G.balles.splice(i, 1);
  }
}

// Le terminal du Piratage : il défile, puis s'efface. L'inversion, elle, a déjà
// commencé au lancement — cette fonction ne fait que la mise en scène, et la
// fin de l'animation ne doit surtout pas y toucher.
export function updateHack(dt) {
  const h = G.hack;
  if (!h) return;
  h.t += dt;
  if (h.t >= h.dur) {
    G.hack = null;
    addPopup('COMMANDES INVERSÉES !', '#4fe8ff', 15, 1.2, (h.cible ? h.cible.y : 0) - 60);
    sfx('inverse');
  }
}

export function updateLeg(dt) {
  const L = G.leg;
  if (!L) return;
  L.t += dt;
  if (L.phase === 'shadow' && L.t > .55) { L.phase = 'fall'; L.t = 0; sfx('dash'); }
  else if (L.phase === 'fall' && L.t > .16) { L.phase = 'impact'; L.t = 0; legImpact(L); }
  else if (L.phase === 'impact' && L.t > .4) { G.leg = null; }
}

function legImpact(L) {
  G.shake = 18; sfx('splat');
  dust(L.x, L.yTarget, 22);
  burst(L.x, L.yTarget, '#c98686', 24);
  burst(L.x, L.yTarget, '#ff6a7a', 14);
  addPopup('SPLAT !', '#ff6a7a', 22, 1);
  // Ce qui suit est de l'arbitrage : étourdir quelqu'un, lui faire lâcher le
  // disque, envoyer celui-ci ailleurs. L'invité joue la scène — l'ombre, la
  // chute, l'impact, la poussière — mais ses conséquences lui arrivent par
  // l'état, comme les réceptions et les buts. Sans cette garde, il les
  // appliquerait une seconde fois, avec ses propres tirages au sort.
  if (!jeSimule()) return;
  const foe = L.caster.foe;
  if (Math.hypot(foe.x - L.x, foe.y - L.yTarget) < 88) {
    foe.stun = 2.0;
    if (foe.holding) dropDisc(foe);
    foe.charging = false; foe.wasCharging = false; foe.charge = 0;
    addPopup('ÉTOURDI !', '#ffd23e', 15, 1.1);
    sfx('stun'); comment('ÉCRASÉ !');
  }
  if (G.disc.free && Math.hypot(G.disc.x - L.x, G.disc.y - L.yTarget) < 95) {
    G.disc.vx = gaussJeu() * 380;           // semé : trajectoire du disque
    G.disc.vy = -randJeu(220, 400);
  }
}
