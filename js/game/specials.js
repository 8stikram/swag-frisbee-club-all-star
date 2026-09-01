import { G, comment } from './state.js';
import { SPECIALS } from '../data/specials.js';
import { sfx } from '../audio/audio.js';
import { addPopup, burst, dust } from './fx.js';
import { dropDisc, onCatch } from './actions.js';
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
  // Le blocage lui-même — aucun tir ne doit passer, quelle que soit sa
  // hauteur — vit dans disc.js, au point exact où un but se déciderait
  // sinon (voir clocheBloque()). Un cercle de 62 px centré ici ne couvrait
  // qu'environ 60 % de la hauteur du but : on pouvait viser au-dessus ou en
  // dessous et marquer quand même, alors que la tête dessinée fait déjà
  // presque toute la hauteur de la cage. Le blocage suit maintenant ce que
  // le joueur voit à l'écran, au lieu d'un cercle invisible plus petit.
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

// ---------------------------------------------------------------------------
// Crochet de Chopper. Les cinq phases sont calquées sur le Chain Hook
// d'Overwatch, dont les proportions ont servi de repère de rythme :
// incantation 0,1 + 0,2 s, projectile à 62 m/s, latence de 0,3 s à l'accroche,
// puis la cible ramenée à 3 m devant — pas dans les mains, ce qui laisse la
// place au geste qui suit. Les durées ici sont un peu étirées : un terrain de
// disque n'a pas l'échelle d'un couloir d'Overwatch.
const GR_ARME = .3;        // armement, le bras part en arrière
const GR_ACCROCHE = .3;    // le temps d'arrêt qui donne son poids à la prise
const GR_FENETRE = .8;     // fenêtre de contrôle : le disque attend en main
const GR_V = 1150;         // vitesse du crochet, aller
const GR_RETOUR_V = 900;   // vitesse de la traction, retour
const GR_PORTEE = 900;     // portée : tout le terrain (court left 70 → right 890)
const GR_R = 30;           // rayon d'accroche sur le disque

export function updateGrappin(dt) {
  const g = G.grappin;
  if (!g) return;
  const p = g.owner;
  g.t += dt;

  // Il est planté pendant tout l'ultime, comme le Chain Hook qui est canalisé.
  // Sans ça il continuait de glisser sur le terrain, le crochet accroché au
  // disque, ce qui rendait la chaîne incompréhensible.
  p.vx = 0; p.vy = 0;

  const mainX = p.x + p.face * 14, mainY = p.y - 18;

  // Le disque reste figé pendant l'armement et le vol du crochet. C'est la
  // condition pour que l'ultime serve à quelque chose : sans ça le disque
  // franchissait la ligne avant que le crochet l'atteigne, et un ultime censé
  // annuler un but arrivait toujours trop tard.
  if (g.phase === 'arme' || g.phase === 'vol') {
    const d = G.disc;
    if (d && !d.heldBy) { d.vx = 0; d.vy = 0; }
  }

  if (g.phase === 'arme') {
    if (g.t >= GR_ARME) { g.phase = 'vol'; g.t = 0; g.hx = mainX; g.hy = mainY; sfx('dash'); }
    return;
  }

  if (g.phase === 'vol') {
    // Le crochet se guide sur le disque tant qu'il est libre : c'est un
    // ultime de sauvetage, il doit rattraper un disque qui bouge encore.
    const d = G.disc;
    if (g.verrou && d && !d.heldBy) {
      const dx = d.x - g.hx, dy = d.y - g.hy, n = Math.hypot(dx, dy) || 1;
      g.ax = dx / n; g.ay = dy / n;
    }
    g.hx += g.ax * GR_V * dt; g.hy += g.ay * GR_V * dt;
    const parcouru = Math.hypot(g.hx - mainX, g.hy - mainY);
    // L'accroche est de l'arbitrage : l'invité voit le crochet voler, mais
    // c'est l'hôte qui décide s'il mord et le lui envoie par l'état.
    if (jeSimule() && d && !d.heldBy && Math.hypot(d.x - g.hx, d.y - g.hy) < GR_R) {
      g.phase = 'accroche'; g.t = 0; g.prise = true;
      g.hx = d.x; g.hy = d.y;
      d.vx = 0; d.vy = 0; d.free = false;
      G.shake = Math.max(G.shake, 9);
      burst(d.x, d.y, '#e8c23a', 8); sfx('bigbounce');
      addPopup('HARPONNÉ !', '#e8c23a', 15, .9, d.y - 50);
    } else if (parcouru > GR_PORTEE) {
      // Rentré bredouille : la chaîne se ravale et l'ultime est perdu. Le
      // disque récupère la vitesse qu'il avait à l'activation — le laisser
      // figé aurait bloqué le point pour de bon.
      g.phase = 'vide'; g.t = 0; sfx('deny');
      if (d && !d.heldBy && g.vitesse) { d.vx = g.vitesse.x; d.vy = g.vitesse.y; }
      addPopup('DANS LE VIDE...', '#9fb4dd', 12, .8, p.y - 56);
    }
    return;
  }

  if (g.phase === 'accroche') {
    // Le disque reste collé au crochet pendant le temps d'arrêt.
    const d = G.disc;
    if (d && !d.heldBy) { d.x = g.hx; d.y = g.hy; d.vx = 0; d.vy = 0; }
    if (g.t >= GR_ACCROCHE) { g.phase = 'retour'; g.t = 0; }
    return;
  }

  if (g.phase === 'retour' || g.phase === 'vide') {
    // La chaîne se ravale vers la main. Dans les deux cas le crochet revient :
    // seule la présence du disque au bout change.
    const dx = mainX - g.hx, dy = mainY - g.hy, n = Math.hypot(dx, dy);
    const pas = GR_RETOUR_V * dt;
    if (n <= pas) {
      g.hx = mainX; g.hy = mainY;
      if (g.phase === 'vide') { G.grappin = null; return; }
      // Il récupère le disque. On passe par onCatch pour hériter de tout ce
      // qu'une réception normale déclenche (jauge, compteurs, replay), donc
      // uniquement chez celui qui simule — sans quoi l'invité jouerait une
      // prise que l'hôte n'a pas décidée.
      if (jeSimule()) {
        const d = G.disc;
        if (d && !d.heldBy) onCatch(p, 0, 0, 0);
      }
      g.phase = 'fenetre'; g.t = 0;
      G.shake = Math.max(G.shake, 6);
      return;
    }
    g.hx += dx / n * pas; g.hy += dy / n * pas;
    const d = G.disc;
    if (g.phase === 'retour' && d && !d.heldBy) { d.x = g.hx; d.y = g.hy; d.vx = 0; d.vy = 0; }
    return;
  }

  if (g.phase === 'fenetre') {
    // Fenêtre de contrôle : il garde le disque en main un instant, le temps
    // de viser sa relance. C'est l'équivalent du combo « crochet → tir » du
    // personnage d'origine, mais c'est le joueur qui choisit la direction.
    if (g.t >= GR_FENETRE || !p.holding) { G.grappin = null; }
    return;
  }
}

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
