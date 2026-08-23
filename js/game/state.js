import { W, H } from '../core/dom.js';
import { COURT, CX, CY, DIFFS } from '../core/constants.js';
import { TAU, rand } from '../core/utils.js';
import { CHARS } from '../data/characters.js';
import { skinActif } from './../data/skins-perso.js';
import { getMap } from '../data/maps.js';
import { sfx } from '../audio/audio.js';
import { setupServe } from './actions.js';

export const Mouse = { x: COURT.left + 120, y: CY, down: false, locked: false };

// Fiche d'intentions d'un joueur : ce qu'il veut faire, sans dire d'où ça
// vient. Définie ici et pas dans commandes.js à dessein — state.js ne doit
// importer personne qui le réimporte, ce genre de boucle a déjà cassé le jeu
// en production une fois.
function nouvelleCommande(side) {
  return {
    dep: { x: 0, y: 0 },                       // déplacement voulu, normalisé
    visee: { x: side === 1 ? 1 : -1, y: 0 },   // direction de tir voulue
    viseeDash: { x: side === 1 ? 1 : -1, y: 0 },
    tir: false,        // touche de tir maintenue
    dash: false,
    // Actions ponctuelles : posées par ce qui remplit la fiche, consommées par
    // le jeu qui les remet aussitôt à faux. Une intention qui resterait collée
    // se rejouerait à l'image suivante.
    plongeon: false, feinte: false, special: false,
    angle: 0           // visée au clavier : angle courant, en radians
  };
}

export const G = {
  state: 'menu', demo: true, now: 0,
  p1: null, p2: null, disc: null,
  decoys: [], particles: [], popups: [], trail: [],
  banner: null, timescale: 1, tsTimer: 0, shake: 0,
  goalT: 0, cdT: 0, cdN: -1, serveTo: 1, winner: null, goalFlash: [0, 0],
  // Ondes de choc en demi-cercle parties d'une cage au moment du but.
  ondesBut: [],
  // Étoiles filantes du décor, propres au disque Galaxie.
  filantes: [],
  matchChar: 'naruto', matchCPU: 'leon', matchDiff: 1,
  crowd: [], stars: [], rally: 0, maxRally: 0,
  cine: null, leg: null, bell: null, rec: [], replay: null, comment: null,
  // Cercles bonus au sol du Swag Frisbee Stadium. Vide partout ailleurs.
  cercles: [], prochainCercle: 0,
  idleT: 0, waveX: -200, mem: { t: 0, m: 0, b: 0 }, startCom: false,
  lungeBonus: false, lungeBonusTimer: 0, adminMode: false, isJ2J: false,
  pendingServe: 1,
  // Mise en scène du Perfect Dive : zoom caméra transitoire et flash lumineux.
  zoom: null, flash: 0,
  // Image du dernier attrapé : sert de point de départ au replay, dont la durée
  // s'adapte ainsi à l'action plutôt que d'être fixe.
  lastCatchIdx: -1
};

(function initBackground() {
  // Drones-caméras qui gravitent autour de l'arène, à la place du public.
  // Chacun suit une petite orbite elliptique autour d'un point d'ancrage.
  const cols = getMap().theme.crowdColors;
  for (let i = 0; i < 26; i++) {
    const side = rand(4) | 0;
    let x, y;
    if (side === 0) { x = rand(W); y = rand(14, COURT.top - 26); }
    else if (side === 1) { x = rand(W); y = rand(COURT.bottom + 26, H - 14); }
    else if (side === 2) { x = rand(14, COURT.left - 26); y = rand(COURT.top - 10, COURT.bottom + 10); }
    else { x = rand(COURT.right + 26, W - 14); y = rand(COURT.top - 10, COURT.bottom + 10); }
    G.crowd.push({
      x, y,
      c: cols[(Math.random() * cols.length) | 0],
      ph: rand(TAU),                 // phase de l'orbite
      s: rand(4, 7),                 // taille du fuselage
      orbit: rand(6, 16),            // rayon de l'orbite
      speed: rand(0.4, 1.1),         // vitesse orbitale
      blink: rand(TAU)               // phase du feu de position
    });
  }
  for (let i = 0; i < 300; i++) {
    G.stars.push({ x: rand(W), y: rand(H), size: rand(1, 3), twinkle: rand(TAU), speed: rand(0.5, 2), color: getMap().theme.starColor });
  }
})();

export function makePlayer(ck, side, human, diffIdx) {
  const c = CHARS[ck];
  // Jeu de sprites effectivement porté : celui du skin choisi, ou la tenue
  // d'origine. Résolu une fois ici plutôt qu'à chaque image du rendu.
  const sk = skinActif(ck);
  const p = {
    ck, char: c, side, human,
    frames: (c.skins && c.skins[sk]) ? c.skins[sk] : c.frames,
    x: side === 1 ? COURT.left + 120 : COURT.right - 120, y: CY,
    vx: 0, vy: 0, face: side === 1 ? 1 : -1,
    holding: false, charging: false, wasCharging: false, charge: 0, fullFlash: false,
    throwCd: 0, throwPoseT: 0, lunge: 0, lungeCd: 0, dashCd: 0, dashV: { x: 0, y: 0 },
    walk: 0, moving: false, meter: 0, score: 0, speed: c.speed, stun: 0,
    ghosts: [], ghostT: 0, forceFr: null,
    // buts / z5 / z3 / dashCatches alimentent l'écran de fin de match.
    // perfects et dashThrows servent aux conditions de déblocage des skins.
    stats: { catches: 0, specials: 0, thrown: 0, buts: 0, z5: 0, z3: 0, dashCatches: 0, perfects: 0, dashThrows: 0 },
    ai: null, foe: null,
    home: { x: side === 1 ? COURT.left + 120 : COURT.right - 120, y: CY },
    holdTimer: 0,
    // --- Dash : dashT décompte le dash en cours, dashGap l'anti-spam,
    // dashThrowT la fenêtre pendant laquelle un tir part instantanément à fond.
    dashT: 0, dashGap: 0, dashDir: { x: 1, y: 0 }, dashThrowT: 0, dashEnding: false,
    // cancelCatchT : la hitbox élargie survit un instant au freinage.
    cancelCatchT: 0,
    // Feinte de tir : feintT anime le geste, feintCd empêche d'enchaîner.
    feintT: 0, feintCd: 0, feintDir: { x: 1, y: 0 },
    // --- Plongeon : diveT pendant l'action, diveDown le temps au sol après un
    // plongeon dans le vide (whiff), pendant lequel le joueur est vulnérable.
    diveT: 0, diveDown: 0, diveDir: { x: 1, y: 0 }, diveHit: false,
    // Désorienté par la cloche de Jingle : sa course dérive un court instant.
    dizzy: 0,
    // Fiche d'intentions : ce que ce joueur veut faire, quelle que soit la
    // provenance — souris, clavier du J2, ou réseau plus tard.
    cmd: nouvelleCommande(side),
    // Mode Six Paths de Naruto : temps restant, et angle de l'anneau d'orbes.
    sixT: 0, sixA: 0,
    // Bras tendu de Leon pendant le Tir Matilda : durée de la pose.
    viseT: 0,
    // Bouclier du disque Captain : bref halo autour de celui qui attrape.
    bouclierT: 0
  };
  if (!human) {
    p.ai = {
      diff: DIFFS[diffIdx], reactAt: 0, plan: null, miss: false, missOff: 0, tracked: null,
      target: { x: p.home.x, y: p.home.y }, fleeing: false, aggro: 0, hesT: 0, hes: { x: 0, y: 0 },
      state: 'READY', stateTimer: 0, aimLock: 0, aimCorner: 1, emaTarget: { x: 0, y: 0 },
      strikeDrive: false, shootTimer: 0, forceShoot: false, lastLog: 0, superCommit: false
    };
  }
  return p;
}

export function resetDisc() {
  return { x: CX, y: CY, vx: 0, vy: 0, heldBy: null, kind: 'normal', spin: 0, age: 0, thrower: null, thrownAt: -9, bounced: false, stall: 0, free: false, big: false, kSpeed: 0, super: false, wobble: 0 };
}

export function initMatch(demo, ck, cpu, diffIdx, j2j) {
  G.demo = demo; G.now = 0; G.winner = null; G.banner = null; G.cine = null; G.leg = null; G.bell = null; G.replay = null;
  G.particles.length = 0; G.popups.length = 0; G.trail.length = 0; G.decoys.length = 0; G.rec.length = 0;
  G.timescale = 1; G.shake = 0; G.rally = 0; G.maxRally = 0; G.comment = null; G.idleT = 0;
  G.mem = { t: 0, m: 0, b: 0 }; G.startCom = false; G.lungeBonus = false; G.lungeBonusTimer = 0;
  G.zoom = null; G.flash = 0; G.lastCatchIdx = -1;
  G.ondesBut.length = 0; G.filantes.length = 0;
  G.cercles.length = 0; G.prochainCercle = 0;
  // Repères pour les conditions de déblocage des skins : depuis quand le match
  // dure, et si le joueur s'est autorisé un dash.
  G.debutMatch = performance.now();
  G.aDashe = false;
  G.isJ2J = j2j || false;
  if (demo) {
    G.p1 = makePlayer('naruto', 1, false, 0);
    G.p2 = makePlayer('leon', 2, false, 1);
    G.p1.foe = G.p2; G.p2.foe = G.p1;
    G.disc = resetDisc(); G.disc.heldBy = G.p1; G.p1.holding = true;
    G.state = 'play';
  } else {
    G.p1 = makePlayer(ck, 1, true, 0);
    G.p2 = makePlayer(cpu, 2, !G.isJ2J ? false : true, diffIdx);
    G.p1.foe = G.p2; G.p2.foe = G.p1;
    G.disc = resetDisc();
    G.matchChar = ck; G.matchCPU = cpu; G.matchDiff = diffIdx;
    Mouse.x = COURT.left + 120; Mouse.y = CY;
    setupServe(1);
    G.state = 'countdown'; G.cdT = 3.7; G.cdN = 4;
  }
}

export function comment(txt, dur = 2.4) { G.comment = { text: txt, t: 0, dur }; G.idleT = 0; sfx('talk'); }
