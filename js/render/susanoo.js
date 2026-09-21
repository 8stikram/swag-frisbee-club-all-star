// ---------------------------------------------------------------------------
// LE SUSANOO DE LA FRICADELLE, l'ultime du Gardien Éternel de la Fricadelle.
//
// Dessiné en COURBES, comme le diable du casino, et pas en pixels : c'est le
// seul rendu qui tient à trois fois la taille du perso. Design choisi dans
// mockups/fricadelle-susanoo.html (1D 2C 3D 4C 5A), puis réglé élément par
// élément dans mockups/fricadelle-susanoo-reglage.html. Ce module en est la
// copie fidèle : mêmes formes, mêmes réglages, même mouvement.
//
// Repère : les pieds du Susanoo en (0, 0), le haut vers les y négatifs, une
// unité = un pixel du jeu. Il est tourné vers la droite ; le camp de droite le
// retourne.
//
// Aucune dépendance au jeu en dehors des constantes de l'ultime : ce module ne
// fait que dessiner ce qu'on lui donne.
// ---------------------------------------------------------------------------
import { LD_DUREE, LD_INVOC, LAME_RECHARGE } from '../data/specials.js';
import { etatLame, versMonde } from '../game/lame-geo.js';

const TAU = Math.PI * 2;

// SUR UN SOL CLAIR, LE SUSANOO CHANGE DE PEINTURE.
//
// Il est peint en additif — comme une lumière — ce qui le rend éclatant sur les
// cartes sombres et le fait DISPARAÎTRE sur les cartes claires : ajouter de la
// lumière à du blanc ne donne rien. Or quatre cartes sur six ont un sol clair
// (Pôle Nord 89 %, dojo 81 %, Dune 70 %, stade 64 %), et l'utilisateur ne le
// voyait plus du tout au Pôle Nord.
//
// Sur ces cartes il passe donc en peinture normale, avec un contour sombre :
// même dessin, même rose, mais posé sur le fond au lieu de s'y ajouter.
let CLAIR = false;
const melangeur = () => (CLAIR ? 'source-over' : 'lighter');
// Hasard DÉTERMINISTE : une étincelle garde sa trajectoire d'une image à
// l'autre au lieu de clignoter.
const alea = i => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };

function lueur(g, x, y, r, coul, alpha) {
  if (alpha <= 0 || r <= 0) return;
  const d = g.createRadialGradient(x, y, 0, x, y, r);
  d.addColorStop(0, coul); d.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalCompositeOperation = melangeur(); g.globalAlpha *= alpha * (CLAIR ? .75 : 1);
  g.fillStyle = d; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
}
function anneau(g, x, y, rx, ry, alpha, coul, ep) {
  if (alpha <= 0 || rx <= 0) return;
  g.save(); g.globalCompositeOperation = melangeur(); g.globalAlpha *= alpha;
  g.strokeStyle = coul; g.lineWidth = ep;
  g.beginPath(); g.ellipse(x, y, rx, Math.max(1, ry), 0, 0, TAU); g.stroke(); g.restore();
}

/* ============================ LES FORMES ============================ */
const TETE_C = { x: 4, y: -222 };
const EPAULE_G = { x: -80, y: -176 }, EPAULE_D = { x: 80, y: -176 };
const BRAS_D = { x: 70, y: -150 };

const R = a => 'rgba(255,150,220,' + a + ')';
const BORD = 'rgba(255,218,246,.92)';
const CREUX = a => 'rgba(255,70,180,' + a + ')';
function forme(g, chemin, a = .5, bord = BORD, lw = 1.8) {
  // Sur sol clair : un rose plus dense et un contour SOMBRE. Le liseré rose
  // pâle d'origine, lui, ne se voit pas du tout sur de la neige.
  g.fillStyle = CLAIR ? 'rgba(206,32,140,' + Math.min(1, a * 1.9) + ')' : R(a);
  g.fill(chemin);
  g.strokeStyle = CLAIR && bord === BORD ? 'rgba(58,6,42,.95)' : bord;
  g.lineWidth = CLAIR ? lw * 1.3 : lw; g.stroke(chemin);
}
const path = f => { const p = new Path2D(); f(p); return p; };
function oeil(g, x, y, r = 5) { lueur(g, x, y, r * 1.8, 'rgba(255,250,255,1)', .95); }

// La lame : une fricadelle, dorée, striée, bordée de rose.
function fricadelle(g, x0, x1, lar, stries = 5) {
  g.save();
  g.globalCompositeOperation = 'source-over';
  const p = path(q => {
    q.moveTo(x0 + lar, -lar); q.lineTo(x1 - lar, -lar);
    q.arc(x1 - lar, 0, lar, -Math.PI / 2, Math.PI / 2);
    q.lineTo(x0 + lar, lar); q.arc(x0 + lar, 0, lar, Math.PI / 2, Math.PI * 1.5);
  });
  const lg = g.createLinearGradient(0, -lar, 0, lar);
  lg.addColorStop(0, '#f6cc7a'); lg.addColorStop(.45, '#e8a94a'); lg.addColorStop(1, '#8a4f18');
  g.globalAlpha *= .95; g.fillStyle = lg; g.fill(p);
  g.strokeStyle = 'rgba(105,55,18,.6)'; g.lineWidth = Math.max(.8, lar * .16);
  for (let i = 1; i <= stries; i++) {
    const xx = x0 + i * (x1 - x0) / (stries + 1);
    g.beginPath(); g.moveTo(xx, -lar * .78); g.quadraticCurveTo(xx + lar * .35, 0, xx, lar * .78); g.stroke();
  }
  g.globalCompositeOperation = melangeur();
  g.strokeStyle = CLAIR ? 'rgba(150,40,110,.9)' : 'rgba(255,140,215,.9)';
  g.lineWidth = Math.max(1, lar * .18); g.stroke(p);
  g.restore();
}

// Une mèche de feu dans une direction quelconque. Mouvement volontairement
// lent et réduit (balancement .10 rad, battement 4,5 %) : une chevelure de
// dieu ondule, elle ne crépite pas.
function flamme(g, t, bx, by, a, L, w, ph) {
  const bal = Math.sin(t * 1.25 + ph) * .10;
  const Lt = L * (1 + Math.sin(t * 1.8 + ph * 1.7) * .045);
  const a2 = a + bal;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const vx = Math.cos(a2), vy = Math.sin(a2);
  const tx = bx + vx * Lt, ty = by + vy * Lt;
  const langue = (larg, alpha, bord, lw) => forme(g, path(p => {
    p.moveTo(bx - nx * larg, by - ny * larg);
    p.bezierCurveTo(bx - nx * larg * 1.3 + ux * Lt * .4, by - ny * larg * 1.3 + uy * Lt * .4,
                    tx - nx * larg * .4 - vx * Lt * .25, ty - ny * larg * .4 - vy * Lt * .25, tx, ty);
    p.bezierCurveTo(tx + nx * larg * .5 - vx * Lt * .3, ty + ny * larg * .5 - vy * Lt * .3,
                    bx + nx * larg * 1.2 + ux * Lt * .35, by + ny * larg * 1.2 + uy * Lt * .35,
                    bx + nx * larg, by + ny * larg);
    p.closePath();
  }), alpha, bord, lw);
  langue(w, .55, 'rgba(255,228,250,.85)', 1.3);
  g.save(); g.translate(bx, by); g.scale(.55, .7); g.translate(-bx, -by);
  langue(w * .8, .5, 'rgba(255,245,255,.5)', 1);
  g.restore();
}
function boiteFlamme(bx, by, a, L, w) {
  const tx = bx + Math.cos(a) * L, ty = by + Math.sin(a) * L, m = w + 6 + L * .18;
  return [Math.min(bx, tx) - m, Math.min(by, ty) - m, Math.max(bx, tx) + m, Math.max(by, ty) + m];
}

/* =========== LES ÉLÉMENTS, du fond vers l'avant, avec leur boîte =========== */
// La boîte sert de centre de rotation et d'échelle aux réglages, exactement
// comme dans l'atelier : sans elle les réglages ne tomberaient plus au même
// endroit.
const c = TETE_C;
const FL_HAUT = [0, 1, 2, 3, 4, 5, 6].map(i => ({
  bx: c.x - 24 + i * 8, by: c.y - 14 + Math.abs(i - 3) * 3,
  a: -Math.PI / 2 + (i - 3) * .12, L: 46 + (3 - Math.abs(i - 3)) * 15, w: 7, ph: i * 1.3,
}));
const FL_BAS = [
  { bx: c.x - 22, by: c.y + 2, a: Math.PI * .62, L: 58, w: 8, ph: .4 },
  { bx: c.x + 26, by: c.y + 2, a: Math.PI * .38, L: 52, w: 8, ph: 2.1 },
  { bx: c.x - 30, by: c.y - 8, a: Math.PI * .74, L: 64, w: 7, ph: 3.3 },
];

const ELEMENTS = [
  { id: 'aura', box: [-170, -290, 170, 90],
    f(g) { lueur(g, 0, -120, 170, 'rgba(255,110,200,1)', .2); lueur(g, 0, 0, 90, 'rgba(255,90,190,1)', .28); } },

  ...FL_BAS.map((fl, i) => ({ id: 'flammeBas' + (i + 1),
    box: boiteFlamme(fl.bx, fl.by, fl.a, fl.L, fl.w), f(g, t) { flamme(g, t, fl.bx, fl.by, fl.a, fl.L, fl.w, fl.ph); } })),

  { id: 'brasG', box: [-102, -172, -64, -58],
    f(g, t) {
      // Le bras libre bouge tout seul, légèrement : il pivote à l'épaule et le
      // coude se plie un peu, sur des périodes sans rapport entre elles pour
      // que le geste ne se répète jamais à l'identique.
      const pivot = Math.sin(t * 1.1) * .045 + Math.sin(t * .53 + 1.2) * .03;
      const coude = Math.sin(t * .87 + .6) * 4;
      g.save();
      g.translate(-74, -164); g.rotate(pivot); g.translate(74, 164);
      g.strokeStyle = CLAIR ? 'rgba(232,74,176,.9)' : R(.55); g.lineWidth = 15; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-74, -164);
      g.quadraticCurveTo(-96 - coude, -120, -92 + coude * .5, -74); g.stroke();
      lueur(g, -92 + coude * .5, -70, 12, 'rgba(255,200,240,1)', .6);
      g.restore();
    } },

  { id: 'torse', box: [-86, -198, 86, -32],
    f(g) {
      forme(g, path(p => {
        p.moveTo(-34, -40);
        p.bezierCurveTo(-36, -60, -32, -70, -30, -85);
        p.bezierCurveTo(-28, -105, -50, -115, -56, -132);
        p.bezierCurveTo(-64, -150, -86, -160, -84, -182);
        p.bezierCurveTo(-60, -192, -30, -196, -22, -196);
        p.lineTo(22, -196);
        p.bezierCurveTo(30, -196, 60, -192, 84, -182);
        p.bezierCurveTo(86, -160, 64, -150, 56, -132);
        p.bezierCurveTo(50, -115, 28, -105, 30, -85);
        p.bezierCurveTo(32, -70, 36, -60, 34, -40);
        p.bezierCurveTo(12, -32, -12, -32, -34, -40);
        p.closePath();
      }), .5);
    } },
  ...[-1, 1].map(sx => ({ id: sx < 0 ? 'pecG' : 'pecD', box: sx < 0 ? [-60, -184, 0, -134] : [0, -184, 60, -134],
    f(g) {
      g.strokeStyle = BORD; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(0, -176); g.quadraticCurveTo(sx * 40, -182, sx * 58, -150);
      g.quadraticCurveTo(sx * 30, -130, 0, -140); g.stroke();
    } })),
  { id: 'abdos', box: [-23, -128, 23, -66],
    f(g) {
      g.strokeStyle = BORD; g.lineWidth = 1.6;
      for (const x0 of [-21, 3]) for (let i = 0; i < 3; i++) { g.beginPath(); g.roundRect(x0, -126 + i * 22, 18, 18, 6); g.stroke(); }
    } },
  ...[-1, 1].map(sx => ({ id: sx < 0 ? 'obliqueG' : 'obliqueD', box: sx < 0 ? [-42, -132, -26, -48] : [26, -132, 42, -48],
    f(g) {
      g.strokeStyle = BORD; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(sx * 30, -130); g.quadraticCurveTo(sx * 40, -90, sx * 30, -50); g.stroke();
    } })),

  ...FL_HAUT.map((fl, i) => ({ id: 'flamme' + (i + 1),
    box: boiteFlamme(fl.bx, fl.by, fl.a, fl.L, fl.w), f(g, t) { flamme(g, t, fl.bx, fl.by, fl.a, fl.L, fl.w, fl.ph); } })),

  ...[-1, 1].map(sx => ({ id: sx < 0 ? 'corneG' : 'corneD',
    box: sx < 0 ? [c.x - 72, c.y - 98, c.x - 12, c.y - 4] : [c.x + 12, c.y - 98, c.x + 72, c.y - 4],
    f(g) {
      forme(g, path(p => {
        p.moveTo(c.x + sx * 18, c.y - 16);
        p.bezierCurveTo(c.x + sx * 60, c.y - 30, c.x + sx * 70, c.y - 70, c.x + sx * 44, c.y - 96);
        p.bezierCurveTo(c.x + sx * 54, c.y - 64, c.x + sx * 42, c.y - 36, c.x + sx * 14, c.y - 6);
        p.closePath();
      }), .6);
    } })),
  { id: 'dome', box: [c.x - 28, c.y - 26, c.x + 28, c.y + 6],
    f(g) { forme(g, path(p => { p.moveTo(c.x - 26, c.y + 4); p.quadraticCurveTo(c.x, c.y - 52, c.x + 26, c.y + 4); p.closePath(); }), .55); } },
  { id: 'garde', box: [c.x - 32, c.y, c.x + 32, c.y + 32],
    f(g) {
      forme(g, path(p => { p.moveTo(c.x - 30, c.y + 2); p.lineTo(c.x + 30, c.y + 2); p.lineTo(c.x + 22, c.y + 30); p.lineTo(c.x - 22, c.y + 30); p.closePath(); }), .4);
      g.fillStyle = CREUX(.7); g.fillRect(c.x - 20, c.y + 8, 40, 7);
    } },
  ...[-1, 1].map(sx => {
    const x = sx < 0 ? c.x - 8 : c.x + 14, y = c.y + 11;
    return { id: sx < 0 ? 'oeilG' : 'oeilD', box: [x - 6, y - 6, x + 6, y + 6], f(g) { oeil(g, x, y, 3); } };
  }),

  ...[-1, 1].map(sx => {
    const e = sx < 0 ? EPAULE_G : EPAULE_D;
    const x0 = Math.min(e.x - sx * 14, e.x + sx * 36), x1 = Math.max(e.x - sx * 14, e.x + sx * 36);
    return { id: sx < 0 ? 'epauleG' : 'epauleD', box: [x0, e.y - 20, x1, e.y + 34],
      f(g) {
        for (let i = 2; i >= 0; i--) {
          forme(g, path(p => {
            const y0 = e.y - 10 + i * 13, xa = e.x - sx * 14;
            p.moveTo(xa, y0); p.quadraticCurveTo(e.x + sx * 18, y0 - 8, e.x + sx * 36, y0 + 4);
            p.lineTo(e.x + sx * 32, y0 + 16); p.quadraticCurveTo(e.x + sx * 12, y0 + 6, xa + sx * 2, y0 + 12);
            p.closePath();
          }), .42 + i * .06);
        }
      } };
  }),

  { id: 'brasD', special: 'bras' },
  { id: 'epee', special: 'epee' },

  { id: 'etincelles', box: [-90, -270, 90, 0],
    f(g, t) {
      for (let i = 0; i < 16; i++) {
        const cyc = (t * .35 + alea(i)) % 1;
        lueur(g, (alea(i + 40) - .5) * 170, -cyc * 260, 3.5, 'rgba(255,200,240,1)', .7 * (1 - cyc));
      }
    } },
];

/* ============================ LES RÉGLAGES ============================ */
// Envoyés par l'utilisateur depuis l'atelier et validés tels quels (copie dans
// mockups/fricadelle-susanoo-reglage.reglages.json) : [dx, dy, ex, ey, rot°].
// Un élément absent reste à sa place d'origine.
const VALIDES = {
  aura: [2, -21, 1.32, 1.02, 0],
  flammeBas1: [17, -24, .66, .66, -20],
  flammeBas2: [-12, -19, .72, .72, -10],
  flammeBas3: [52, -14, .54, .54, -51],
  brasG: [21, 7, 1, 1.22, -13],
  torse: [2, 4, 1, 1, 0],
  pecG: [-2, -3, 1, 1, 0],
  pecD: [5, -3, 1, 1, 0],
  abdos: [2, 0, 1, 1, 0],
  obliqueG: [5, 0, 1, 1, 0],
  obliqueD: [-1, 0, 1, 1, 0],
  flamme1: [0, 3, 1, 1, 0],
  flamme6: [1, 0, 1, 1, 0],
  flamme7: [0, 5, 1, 1, 0],
  corneG: [-5, 25, .84, .7, -13],
  corneD: [5, 25, .84, .7, 13],
  dome: [-1, 5, 1.08, .52, 0],
  garde: [0, 1, 1, 1, 0],
  oeilG: [2, 1, 1, 1, 0],
  oeilD: [1, 1, 1, 1, 0],
  epauleG: [10, -3, 1, 1, 0],
  epauleD: [-8, -2, 1, 1, 0],
  brasD: [4, -11, 1, 1, 0],
  epee: [1, 0, 1.08, 1.08, 0],
};
const reglage = id => {
  const v = VALIDES[id];
  return v ? { dx: v[0], dy: v[1], ex: v[2], ey: v[3], rot: v[4] * Math.PI / 180 }
           : { dx: 0, dy: 0, ex: 1, ey: 1, rot: 0 };
};
const REG = Object.fromEntries(ELEMENTS.map(e => [e.id, reglage(e.id)]));

/* ============================ L'ÉPÉE ============================ */
// Son angle vient de game/lame-geo.js, le même calcul que la zone de touche :
// l'épée qu'on voit s'abattre est exactement celle qui touche. Ici on ne fait
// que le ramener dans le repère du dessin, tourné vers la droite.

function pose(sabre) {
  const b = REG.brasD, ep = REG.epee;
  const epaule = { x: BRAS_D.x + b.dx, y: BRAS_D.y + b.dy };
  const main = { x: epaule.x + Math.cos(sabre) * 58 * b.ex + ep.dx, y: epaule.y + Math.sin(sabre) * 58 * b.ex + ep.dy };
  return { epaule, main, angle: sabre + ep.rot };
}

// Le Susanoo seul, pieds en (0, 0), déjà placé et orienté par l'appelant.
function peindre(g, t, sabre, trace, force) {
  g.save();
  g.globalCompositeOperation = melangeur();
  g.globalAlpha *= Math.min(1, force);
  const p = pose(sabre);
  for (const el of ELEMENTS) {
    const v = REG[el.id];
    if (el.special === 'bras') {
      g.strokeStyle = CLAIR ? 'rgba(232,74,176,.95)' : R(.7); g.lineWidth = 15 * v.ey; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.epaule.x, p.epaule.y); g.lineTo(p.main.x, p.main.y); g.stroke();
      continue;
    }
    if (el.special === 'epee') {
      if (trace > 0) for (let i = 0; i < 14; i++) {
        const aa = p.angle - (i / 14) * 1.5;
        lueur(g, p.main.x + Math.cos(aa) * 145 * v.ex, p.main.y + Math.sin(aa) * 145 * v.ex, 26,
              'rgba(255,120,210,1)', .35 * (1 - i / 14) * trace);
      }
      g.save(); g.translate(p.main.x, p.main.y); g.rotate(p.angle); g.scale(v.ex, v.ey);
      forme(g, path(q => q.ellipse(6, 0, 5, 20, 0, 0, TAU)), .8);
      fricadelle(g, 10, 170, 13, 6);
      lueur(g, 95, 0, 42, 'rgba(255,110,200,1)', .22);
      g.restore();
      continue;
    }
    const bc = { x: (el.box[0] + el.box[2]) / 2, y: (el.box[1] + el.box[3]) / 2 };
    g.save();
    g.translate(bc.x + v.dx, bc.y + v.dy); g.rotate(v.rot); g.scale(v.ex, v.ey); g.translate(-bc.x, -bc.y);
    el.f(g, t);
    g.restore();
  }
  g.restore();
}

// Le Susanoo d'un joueur, en coordonnées de TERRAIN. Il se tient dans son
// dos, pieds un peu sous les siens, et le suit avec un temps de retard
// (susX/susY, lissés dans la boucle). Il regarde toujours le camp adverse,
// quelle que soit la visée : c'est une présence, pas un deuxième joueur.
export function dessinerSusanoo(g, p, t, solClair = false) {
  CLAIR = solClair;
  const dir = p.side === 1 ? 1 : -1;
  const x = (p.susX ?? p.x) - 18 * dir, y = (p.susY ?? p.y) + 44;
  // Il monte pendant l'invocation, tient, puis se dissout sur la dernière
  // demi-seconde.
  const force = Math.max(0, Math.min(1, (LD_DUREE - p.lameT) / LD_INVOC, p.lameT / .5));
  const ecoule = LD_DUREE - p.lameT;
  // L'appel : un anneau rose qui s'ouvre sous ses pieds.
  if (ecoule < LD_INVOC + .3) {
    const k = ecoule / (LD_INVOC + .3), r = 30 + k * 150;
    anneau(g, p.x, p.y + 44, r, r * .4, (1 - k) * .9, 'rgb(255,120,210)', 3);
  }
  const { ang, trace } = etatLame(p);
  g.save();
  g.translate(x, y);
  if (dir < 0) g.scale(-1, 1);
  peindre(g, t, versMonde(p, ang), trace, force);
  g.restore();
  barreRecharge(g, p, force);
}

// La recharge de la lame, au-dessus de sa tête. Elle est petite et posée sur
// le PERSONNAGE, pas dans le HUD : c'est lui qu'on regarde quand on clique, et
// un indicateur à l'autre bout de l'écran ne serait jamais lu au bon moment.
//
// Elle ne s'affiche que pendant la recharge, et un éclair blanc marque
// l'instant où la lame redevient prête : une barre pleine en permanence
// deviendrait un décor qu'on ne voit plus.
export function barreRecharge(g, p, force = 1) {
  const t = p.lameCoupT ?? 9;
  const k = Math.min(1, t / LAME_RECHARGE);
  const fini = 1 - Math.min(1, Math.max(0, (t - LAME_RECHARGE) / .35));
  if (k >= 1 && fini <= 0) return;
  const L = 26, H = 4, x = p.x - L / 2, y = p.y - 62;
  g.save();
  g.globalAlpha = Math.min(1, force) * (k < 1 ? 1 : fini);
  g.fillStyle = '#ffffff'; g.fillRect(x, y, L, H);
  g.fillStyle = k < 1 ? '#ff7fd0' : '#ffffff';
  g.fillRect(x, y, L * k, H);
  g.strokeStyle = '#111318'; g.lineWidth = 1.5;
  g.strokeRect(x - .75, y - .75, L + 1.5, H + 1.5);
  g.restore();
}
