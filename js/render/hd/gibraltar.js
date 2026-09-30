// ---------------------------------------------------------------------------
// OBSERVATOIRE : GIBRALTAR EN PIXEL ART HD.
//
// La base Overwatch de Gibraltar, en plein soleil méditerranéen. Au fond, le
// rocher de Gibraltar et ses falaises ocre ; devant, la Comm Tower WP-G beige
// et ses vitres orange, la passerelle en treillis qui file jusqu'à la sphère
// sur pylône et son drapeau Overwatch, le bâtiment bleu du stock de carburant
// et son rack de réservoirs, la fusée sur son pas de tir dans sa tour de
// lancement, le grand bâtiment beige, et la station de recharge orange du
// drone satellite XR-9. Le détroit, la côte africaine au loin, un vaisseau de
// transport, des goélands.
//
// Le terrain est l'aire d'atterrissage de la base : grandes dalles de béton
// clair, lignes blanches doublées d'un filet orange, emblème Overwatch
// (anneau blanc, arc orange, pales blanches) peint sur un disque noir au centre. Les cages, propres à cette arène, sont des quais de
// chargement à la livrée Overwatch : panneaux blancs à bande orange pour les
// 3, panneau holographique bleu pour le 5, gyrophares orange, et le bouclier
// hexagonal bleu des salles de réapparition à l'embouchure.
//
// Sur les côtés, cinq héros de chaque côté, pour le décor. À gauche : Winston
// et ses écrans, Mercy qui le soigne, Genji, Tracer qui fait des blinks, Lúcio
// en rollers. À droite : Mei et son mur de glace, Reinhardt et son bouclier,
// Soldat : 76, Ana à genoux derrière son fusil, Zenyatta en lévitation. Les
// packs de soin flottent sur leur socle. En bas, le payload, le drone XR-9,
// glisse le long de la route, derrière le garde-corps et la mer.
//
// Pas de règle de jeu : c'est un décor.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, bruit, hacher, lisse, balayerDisque, balayerEllipse, balayerPoly, spriteChiffre, glyphes3x5 } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];
const ANNEAU = 62;
const HORIZON = 54;
const FUSEE = { x: 628, base: 74, haut: 70, l: 16 };
const TOUR = { x: 650 };
const SPHERE = { x: 414, y: 38, r: 11 };
const SOLEIL = { x: 898, y: 48, r: 11 };

const PAL = new Palette({
  // Ciel du couchant : indigo, violet, rose, orange, or, et le cœur du soleil
  k0: '#28265e', k1: '#563a80', k2: '#a4527c', k3: '#e8845c', k4: '#ffbe72', w: '#fff2cc',
  // Mer au couchant : bleu violet profond, reflets roses et dorés
  m0: '#1e2150', m1: '#343470', m2: '#5a4a8c', m3: '#9a6490', m4: '#e0906e', m5: '#ffd488',
  // Calcaire ocre du rocher
  r0: '#5a4632', r1: '#806848', r2: '#a88a62', r3: '#c8aa80', r4: '#e0c8a2', r5: '#f0e0c4',
  // Végétation
  v0: '#28461f', v1: '#3c662c', v2: '#588638', v3: '#7ca84c',
  // Blanc cassé, gris
  b0: '#3a3e46', b1: '#5c6068', b2: '#84888e', b3: '#a8acb0', b4: '#c6c8ca', b5: '#e0e2e2', b6: '#f6f7f6',
  // Acier bleuté (l'armure de Reinhardt, les pylônes)
  g0: '#22282f', g1: '#3a434d', g2: '#56606b', g3: '#78838e', g4: '#a2acb5',
  // Béton du terrain
  q0: '#877e76', q1: '#9e958a', q2: '#b4ab9e', q3: '#c7beb0', q4: '#d7cfc2', q5: '#e5ded2',
  // Beige des bâtiments de la base
  e0: '#4e3e30', e1: '#7a6450', e2: '#a48c72', e3: '#c8b294', e4: '#e4d4ba',
  // Bleu du bâtiment de stockage
  l0: '#1a2c4c', l1: '#284678', l2: '#3a62a6', l3: '#6890cc',
  // Coque bronze et réacteurs bleu acier du drone XR-9
  z1: '#5e4a2c', z2: '#86703e', z3: '#b09a62', a1: '#4a7090', a2: '#7aa2bc', a3: '#b2cfdf',
  // Orange Overwatch
  o0: '#62280a', o1: '#ac4c12', o2: '#ee7a1c', o3: '#ffa04c', o4: '#ffd09c',
  // Bleu holographique
  u0: '#113e68', u1: '#1c68a6', u2: '#32a0e0', u3: '#68d0ff', u4: '#c4f0ff',
  // Vert néon (Genji, Lúcio)
  n0: '#1e4a22', n1: '#2f8a2c', n2: '#6ee048', n3: '#c6ff9c',
  // Bleu canard (la cape d'Ana)
  t1: '#1c4c66', t2: '#2c7090', t3: '#58a2bc',
  // Jaune, rouge
  y1: '#aa8612', y2: '#eebe30', y3: '#ffe27a', x1: '#a01818', x2: '#e83030',
  // Peaux, cheveux
  s0: '#6a4028', s1: '#ac785a', s2: '#dea682', s3: '#f4cca8', h1: '#2e1e12', h2: '#664020', h3: '#9a6838',
  // Pelage de Winston
  f0: '#1c2030', f1: '#323a4c', f2: '#4c566c', f3: '#6e7890', f4: '#9aa0aa',
  // Parka de Mei
  p0: '#1a3c78', p1: '#2c60b2', p2: '#4888de', p3: '#88b6f2',
  k: '#131518'
});
const C = PAL.c;
const CIEL = PAL.sous(['k0', 'k1', 'k2', 'k3', 'k4', 'w']);
const MER = PAL.sous(['m0', 'm1', 'm2', 'm3', 'm4', 'm5']);
const CALCAIRE = PAL.sous(['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
const BETON = PAL.sous(['q0', 'q1', 'q2', 'q3', 'q4', 'q5']);
const BLANC = PAL.sous(['b1', 'b2', 'b3', 'b4', 'b5', 'b6']);
const EAU = new Set([C.m0, C.m1, C.m2, C.m3, C.m4, C.m5]);

const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;

let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
let CIELM = null;
let MERM = null;
const CHIFFRE = {
  3: spriteChiffre(3, C.k, C.k, C.b0, C.b6),
  5: spriteChiffre(5, C.b6, C.u4, C.u3, C.u0)
};

function ombre(t, cx, cy, rx, ry, k) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) t.teinte(x, y, PAL, C.k, k * (1 - (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) * .5)); });
}
function disque(t, cx, cy, r, f) { balayerDisque(cx, cy, r, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, f(x, y)); }); }
function ellipse(t, cx, cy, rx, ry, f) { balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, f(x, y)); }); }
function ciel(y, x) { if (y >= 0 && y < HORIZON && x >= 0 && x < W) CIELM[y * W + x] = 0; }
// Un pixel du décor du haut : posé, et retiré du masque du ciel.
function pd(t, x, y, c) { t.pt(x, y, c); ciel(y, x); }

// L'emblème Overwatch, fidèle au logo : un anneau blanc épais dont l'arc du
// haut est orange (séparé par deux fentes en diagonale), et dedans deux pales
// blanches qui montent en pointe, séparées par une fente verticale, et qui
// rejoignent l'anneau en bas en diagonale en laissant un triangle vide.
// Coordonnées réduites : rayon 1, y vers le bas.
const PALE_OW = [[.04, -.47], [.04, .2], [.5, .62], [.7, .32], [.2, -.085]];
function dansPoly(u, v, P) {
  let dedans = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}
// 0 : vide, 1 : blanc, 2 : orange.
function formeOW(u, v) {
  const d = Math.hypot(u, v);
  if (d > 1) return 0;
  if (d >= .71) {
    for (const s of [-1, 1]) {
      const a = s * Math.PI / 4;
      if (Math.abs(u * Math.cos(a) + v * Math.sin(a)) < .04 && u * Math.sin(a) - v * Math.cos(a) > 0) return 0;
    }
    return Math.abs(Math.atan2(u, -v)) < Math.PI / 4 ? 2 : 1;
  }
  return dansPoly(Math.abs(u), v, PALE_OW) ? 1 : 0;
}
// Suréchantillonné (quatre points par pixel) pour rester propre en petit.
// `cContour` : un liseré d'un pixel autour de la peinture, et la peinture un
// peu usée (pour l'emblème peint au sol).
function emblemeOW(t, cx, cy, R, cBlanc = C.b6, cOrange = C.o2, cContour = 0) {
  const x0 = Math.floor(cx - R - 2), y0 = Math.floor(cy - R - 2), n = Math.ceil(2 * R + 5);
  const m = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let nb = 0, no = 0;
    for (const [a, b] of [[.25, .25], [.75, .25], [.25, .75], [.75, .75]]) {
      const f = formeOW((x0 + i + a - cx) / R, (y0 + j + b - cy) / R);
      if (f === 1) nb++; else if (f === 2) no++;
    }
    if (nb + no >= 2) m[j * n + i] = no > nb ? 2 : 1;
  }
  const M = (i, j) => i >= 0 && j >= 0 && i < n && j < n ? m[j * n + i] : 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = x0 + i, y = y0 + j, v = m[j * n + i];
    if (v) {
      let c = v === 2 ? cOrange : cBlanc;
      if (cContour && hacher(x, y, 33) < .06) c = v === 2 ? C.o1 : C.b4;
      t.pt(x, y, c); ciel(y, x);
    } else if (cContour && (M(i - 1, j) || M(i + 1, j) || M(i, j - 1) || M(i, j + 1))) t.pt(x, y, cContour);
  }
}
// Le petit emblème des plaques et des pastilles, sur son disque noir.
function pastilleOW(t, cx, cy, R) {
  for (let y = Math.floor(cy - R - 2); y <= Math.ceil(cy + R + 1); y++) for (let x = Math.floor(cx - R - 2); x <= Math.ceil(cx + R + 1); x++)
    if (Math.hypot(x + .5 - cx, y + .5 - cy) <= R + 1.4) { t.pt(x, y, C.k); ciel(y, x); }
  emblemeOW(t, cx, cy, R);
}

// ---------------------------------------------------------------------------
// Le fond : ciel, détroit, rocher, base, fusée
// ---------------------------------------------------------------------------
function peindreCiel(t) {
  // Le dégradé du couchant, de l'indigo au zénith à l'or sur l'horizon, et le
  // halo du soleil qui se couche sur la mer, à droite.
  const STOPS = [[0, 40, 38, 96], [14, 86, 56, 128], [30, 178, 88, 122], [44, 238, 136, 90], [54, 255, 196, 120]];
  const degrade = y => {
    let i = 0; while (i < STOPS.length - 2 && y > STOPS[i + 1][0]) i++;
    const [ya, ...a] = STOPS[i], [yb, ...b] = STOPS[i + 1], k = Math.min(1, Math.max(0, (y - ya) / (yb - ya)));
    return a.map((v, n) => v + (b[n] - v) * k);
  };
  const halo = (x, y) => Math.exp(-(((x - SOLEIL.x) / 170) ** 2 + ((y - SOLEIL.y) / 46) ** 2));
  // Traînées de nuages, éclairées par en dessous.
  const BANDES = [[9, 3, 300, 720], [17, 3.5, 0, 280], [26, 2.5, 520, 960], [33, 2, 640, 900], [21, 2, 760, 960]];
  const dens = (x, y) => {
    let d = 0;
    BANDES.forEach(([yc, e, x0, x1], i) => {
      const w = Math.exp(-(((y - yc) / e) ** 2)) * lisse(x0, x0 + 60, x) * lisse(x1, x1 - 60, x);
      if (w > .01) d = Math.max(d, fbm(x * .014 + i * 7, y * .3, 3, 71 + i) * w * 1.6);
    });
    return d;
  };
  for (let y = 0; y < HORIZON; y++) for (let x = 0; x < W; x++) {
    let [r, g, b] = degrade(y);
    const h = halo(x, y);
    r += 30 * h; g += 50 * h; b += 20 * h;
    let c = CIEL.tramer(r, g, b, x, y, 1.8);
    const d = dens(x, y);
    if (d > .42) {
      const pres = halo(x, y) > .35;
      c = dens(x, y + 1) <= .42 ? (pres ? C.k4 : C.k3) : d > .6 ? (pres ? C.k2 : C.k1) : (pres ? C.k3 : C.k2);
    }
    t.px[y * W + x] = c;
    CIELM[y * W + x] = 1;
  }
  // Le soleil, posé sur l'horizon, rayé de deux bandes de brume.
  for (let y = SOLEIL.y - SOLEIL.r; y < HORIZON; y++) for (let x = SOLEIL.x - SOLEIL.r; x <= SOLEIL.x + SOLEIL.r; x++) {
    const d = Math.hypot(x + .5 - SOLEIL.x, y + .5 - SOLEIL.y);
    if (d > SOLEIL.r) continue;
    t.pt(x, y, y === 50 || y === 52 ? C.k4 : d > SOLEIL.r - 1.5 ? C.k4 : C.w);
  }
  // La mer du détroit : le ciel s'y reflète, et le chemin doré du soleil.
  for (let y = HORIZON; y < 84; y++) for (let x = 0; x < W; x++) {
    const k = (y - HORIZON) / 22, o = Math.sin((y - HORIZON) * 1.4 + fbm(x * .03, y * .2, 2, 5) * 4) * 10;
    let r = 196 - k * 130 + o, g = 110 - k * 56 + o, b = 120 + o * .6;
    const large = 5 + (y - HORIZON) * 1.4, dx = Math.abs(x - SOLEIL.x);
    if (dx < large && Math.sin(y * 2.1 + x * .5 + fbm(x * .1, y * .5, 2, 6) * 5) > .1) { const f = 1 - dx / large; r += 90 * f; g += 90 * f; b += 10 * f; }
    t.px[y * W + x] = MER.tramer(r, g, b, x, y, 1.8);
  }
  // Les côtes au loin, silhouettes violettes : l'Espagne à gauche, et le
  // djebel Musa, la montagne africaine qui fait face au rocher.
  for (let x = 0; x < W; x++) {
    let h = 2 + Math.sin(x * .02) * 1.5 + fbm(x * .04, 1, 2, 6) * 3;
    h += 9 * Math.exp(-(((x - 90) / 70) ** 2)) + 5 * Math.exp(-(((x - 180) / 40) ** 2));
    h += 16 * Math.exp(-(((x - 790) / 42) ** 2)) + 6 * Math.exp(-(((x - 730) / 30) ** 2));
    h = Math.round(h);
    for (let k = 0; k < h; k++) {
      const y = HORIZON - 1 - k;
      const lueur = halo(x, y) > .5;
      t.pt(x, y, k === h - 1 ? (lueur ? C.k3 : C.k2) : k > h - 4 && hacher(x, y, 7) < .5 ? C.k2 : C.k1);
      CIELM[y * W + x] = 0;
    }
  }
}
// Le rocher de Gibraltar vu de la baie : falaise nord à pic à gauche, crête
// qui redescend longuement vers le sud, calcaire ocre, maquis sur les pentes.
function hautRocher(x) {
  if (x < 168 || x > 596) return 99;
  if (x < 252) { const k = (x - 168) / 84; return Math.round(78 - Math.pow(k, .55) * 74 + Math.sin(x * .7) * 1.2); }
  const k = (x - 252) / 344;
  return Math.round(4 + k * k * 30 + k * 24 + Math.sin(x * .07) * 2.5 + fbm(x * .05, 0, 2, 7) * 5);
}
function rocher(t) {
  for (let x = 168; x <= 596; x++) {
    const top = hautRocher(x);
    for (let y = Math.max(0, top); y < 76; y++) {
      const falaise = x < 252, prof = y - top;
      const strie = Math.sin(x * .8 + fbm(x * .05, y * .1, 2, 8) * 4) * 10;
      const banc = Math.sin(y * .6 + fbm(x * .03, y * .05, 2, 12) * 3) * 6;
      let l = falaise ? 142 + strie + banc - (x < 200 ? 26 : 0) : 196 + strie * .6 + banc * .5 - prof * .5;
      l += (fbm(x * .06, y * .06, 2, 9) - .5) * 26;
      let c = CALCAIRE.tramer(l, l * .9, l * .74, x, y, 2);
      if (!falaise && prof > 3 && fbm(x * .09, y * .14, 3, 10) > .6 && hacher(x >> 1, y >> 1, 14) < .8) c = FEUILLAGE(x, y);
      pd(t, x, y, c);
    }
    pd(t, x, top, x < 252 ? C.r3 : C.r5);
  }
  // Les meurtrières des galeries du Grand Siège, dans la face nord.
  for (const [x, y] of [[190, 46], [198, 38], [206, 48], [214, 30], [222, 40], [230, 22]]) { pd(t, x, y, C.r0); pd(t, x + 1, y, C.r0); pd(t, x, y + 1, C.r1); }
}
function FEUILLAGE(x, y) { const h = hacher(x >> 1, y >> 1, 11); return h < .3 ? C.v1 : h < .7 ? C.v2 : C.v3; }

// Le bâtiment bleu du stock de carburant, son treillis sur le toit et son
// rack de réservoirs.
function batimentBleu(t) {
  const x0 = 34, x1 = 166, y0 = 54;
  for (let y = y0; y < 76; y++) for (let x = x0; x <= x1; x++) {
    const i = x - x0;
    let c = i % 18 === 0 ? C.l0 : i % 18 === 1 ? C.l3 : (y - y0) % 7 === 6 ? C.l1 : C.l2;
    if (y === y0) c = C.l3;
    if (x === x1) c = C.l1;
    if (y > 72) c = y === 73 ? C.l0 : C.b1;
    pd(t, x, y, c);
  }
  // Le treillis du toit : deux membrures beiges, des diagonales en zigzag.
  const ta = x0 + 8, tb = x1 - 4;
  for (let x = ta; x <= tb; x++) {
    for (let y = 45; y < 54; y++) {
      const z = Math.abs(((x - ta) % 14) - 7) / 7 * 6;   // zigzag entre y 47 et 52
      let c = y === 45 ? C.e4 : y === 46 ? C.e3 : y === 53 ? C.e1 : y === 52 ? C.e2 : Math.abs(y - (47 + z)) < 1 ? C.e3 : C.g0;
      pd(t, x, y, c);
    }
  }
  pd(t, ta - 1, 45, C.e3); pd(t, tb + 1, 45, C.e3);
  // Inscription « WP-G », en grand.
  const larg = glyphes3x5('WP-G', () => {}) * 2;
  const tx = 92 - larg / 2;
  glyphes3x5('WP-G', (gx, gy) => { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) pd(t, tx + gx * 2 + a, 58 + gy * 2 + b, C.b6); }, MIROIR);
  // La porte ouverte : lumière chaude, liseré bleu.
  for (let y = 58; y < 74; y++) for (let x = 132; x < 146; x++) {
    let c = x === 132 ? C.l0 : x === 145 ? C.u3 : y === 58 ? C.l0 : y < 62 ? C.o1 : x > 137 && x < 141 && y > 64 ? C.e0 : y > 70 ? C.o1 : C.o3;
    if (y === 59 && (x === 133 || x === 144)) c = C.l0;
    pd(t, x, y, c);
  }
  pd(t, 148, 64, C.u3); pd(t, 148, 65, C.y2);
  // Le rack de réservoirs : deux cuves couchées dans un cadre bleu.
  for (let y = 55; y < 76; y++) for (const x of [38, 39, 60, 61]) pd(t, x, y, x & 1 ? C.l1 : C.l3);
  for (const x of [38, 61]) pd(t, x, 55, C.l3);
  for (const cy of [60, 68]) {
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = 40; x < 60; x++) {
      const bout = x < 42 || x > 57, v = y - cy;
      if (bout && Math.abs(v) === 3) continue;
      pd(t, x, y, v < -1 ? C.b6 : v < 1 ? C.b5 : v < 3 ? C.b4 : C.b2);
    }
    pd(t, 50, cy - 3, C.o2); pd(t, 51, cy - 3, C.o2);
  }
  for (let x = 40; x < 60; x++) pd(t, x, 73, x < 50 ? C.y2 : C.y1);
}
// La Comm Tower WP-G : tour beige, vitres orange en haut, ailerons, plaque à
// l'emblème, son bloc de porte au pied.
function tourComm(t) {
  const x0 = 256, x1 = 284;
  // Bloc bas, à gauche, et sa porte.
  for (let y = 44; y < 76; y++) for (let x = 238; x < x0; x++) {
    let c = y === 44 ? C.e4 : x === 238 ? C.e1 : (x - 238) < 3 ? C.e2 : (y - 44) % 10 === 9 ? C.e2 : C.e3;
    if (x > 242 && x < 250 && y > 60) c = x === 249 ? C.u3 : y === 61 ? C.e1 : C.g1;
    pd(t, x, y, c);
  }
  // Les ailerons du flanc gauche.
  for (const y0 of [22, 28]) for (let x = 236; x < x0; x++) { const y = y0 + Math.round((x0 - x) * .08); pd(t, x, y, C.e4); pd(t, x, y + 1, C.e1); }
  // Le fût.
  for (let y = 16; y < 76; y++) for (let x = x0; x <= x1; x++) {
    const i = x - x0;
    let c = i < 2 ? C.e1 : i < 4 ? C.e2 : i === 14 ? C.e2 : i > 25 ? C.e4 : C.e3;
    if ((y - 16) % 14 === 13) c = C.e2;
    if (i === 20 && y > 40 && y < 70) c = C.e2;
    pd(t, x, y, c);
  }
  // Le haut : un bloc plus large, bandeau de vitres orange éclairées.
  for (let y = 2; y < 18; y++) for (let x = x0 - 3; x <= x1 + 3; x++) {
    const i = x - x0 + 3;
    let c = y === 2 ? C.e4 : i < 2 ? C.e1 : i > 31 ? C.e4 : C.e3;
    if (y >= 8 && y <= 13) c = (i % 6 === 0) ? C.e1 : y === 8 ? C.o2 : y > 11 ? C.o2 : C.o3;
    if (y === 14) c = C.e1;
    pd(t, x, y, c);
  }
  pd(t, x0 - 3, 2, C.e3); pd(t, x1 + 3, 2, C.e3);
  // La plaque à l'emblème, en haut, et l'inscription WP-G sur le fût.
  for (let y = 3; y < 8; y++) for (let x = x0 + 9; x <= x0 + 19; x++) pd(t, x, y, C.l1);
  emblemeOW(t, x0 + 14.5, 5.5, 2.6);
  const larg = glyphes3x5('WP-G', () => {});
  glyphes3x5('WP-G', (gx, gy) => pd(t, x0 + 15 - larg / 2 + gx, 30 + gy, C.l1), MIROIR);
  glyphes3x5('COMM', (gx, gy) => { if (hacher(gx, gy, 3) < .9) pd(t, x0 + 15 - larg / 2 + gx, 23 + gy, C.l2); }, MIROIR);
  // Petits feux et antennes.
  for (const y of [40, 54]) pd(t, x1 - 2, y, C.b6);
  for (let y = 0; y < 2; y++) { pd(t, x0 + 2, y, C.b2); pd(t, x1 - 3, y, C.b2); }
  pd(t, x1 + 1, 1, C.b3); pd(t, x1 + 2, 1, C.b4);
}
// La passerelle en treillis de la tour à la sphère, fanion bleu et veilleuses.
function passerelle(t) {
  const xa = 285, xb = 452;
  for (let x = xa; x <= xb; x++) for (let y = 56; y < 65; y++) {
    const z = Math.abs(((x - xa) % 12) - 6) / 6 * 4;
    let c = y === 56 ? C.e4 : y === 57 ? C.e3 : y === 64 ? C.e1 : y === 63 ? C.e2 : Math.abs(y - (59 + z)) < 1 ? C.e3 : C.g0;
    pd(t, x, y, c);
  }
  for (let x = xa + 7; x < xb; x += 16) pd(t, x, 65, C.u4);
  // Un fanion bleu qui pend.
  balayerPoly([[330, 65], [346, 65], [338, 74]], (y, a, b) => { for (let x = a; x <= b; x++) pd(t, x, y, x < 336 ? C.l2 : C.l1); });
  balayerPoly([[346, 65], [358, 65], [352, 71]], (y, a, b) => { for (let x = a; x <= b; x++) pd(t, x, y, C.l1); });
  // Les piles de la passerelle.
  for (const x of [320, 380, 440]) for (let y = 65; y < 76; y++) { pd(t, x, y, C.e2); pd(t, x + 1, y, C.e1); }
}
// La sphère sur son pylône, et le mât du drapeau (le drapeau flotte, il est
// dessiné à chaque image).
function sphere(t) {
  const { x, y, r } = SPHERE;
  // Pylône : trois pieds et des croisillons, de la passerelle à la sphère.
  for (let yy = y + r - 2; yy < 56; yy++) {
    const k = (yy - (y + r - 2)) / (56 - (y + r - 2)), e = Math.round(3 + k * 6);
    pd(t, x - e, yy, C.g2); pd(t, x + e, yy, C.g3); pd(t, x, yy, C.g1);
  }
  t.ligne(x - 4, y + r, x + 8, 55, C.g2); t.ligne(x + 4, y + r, x - 8, 55, C.g2);
  // La sphère beige, éclairée par le soleil de droite.
  disque(t, x, y, r, (xx, yy) => {
    ciel(yy, xx);
    const l = ((xx - x) * .7 - (yy - y) * .7) / r;
    if (yy === y + 1) return C.e1;
    if (yy === y) return C.e4;
    return l > .45 ? C.e4 : l > -.1 ? C.e3 : l > -.6 ? C.e2 : C.e1;
  });
  // Mât, antennes.
  for (let yy = 3; yy < y - r + 1; yy++) pd(t, x, yy, C.b2);
  for (let xx = x - 3; xx <= x + 3; xx++) pd(t, xx, 16, C.b3);
  pd(t, x - 3, 15, C.b5); pd(t, x + 3, 15, C.b5);
  pd(t, x - 1, y - r - 1, C.b3); pd(t, x + 1, y - r - 1, C.b3);
}
// Une parabole blanche sur pylône, sur la crête du rocher.
function parabole(t, cx, cy, rx, ry, phi) {
  for (let yy = cy + 2; yy < cy + 16; yy++) { const e = Math.round((yy - cy) * .3); pd(t, cx - e, yy, C.g2); pd(t, cx + e, yy, C.g3); }
  t.ligne(cx - 3, cy + 6, cx + 4, cy + 14, C.g2);
  const co = Math.cos(phi), si = Math.sin(phi);
  for (let yy = cy - rx - 1; yy <= cy + rx + 1; yy++) for (let xx = cx - rx - 1; xx <= cx + rx + 1; xx++) {
    const dx = xx - cx, dy = yy - cy;
    const u = dx * co - dy * si, v = -dx * si - dy * co;
    const d = (u / rx) ** 2 + (v / ry) ** 2;
    if (d > 1) continue;
    pd(t, xx, yy, d > .72 ? C.b3 : v > 0 ? C.b6 : C.b5);
  }
  const fx = Math.round(cx - si * 9), fy = Math.round(cy - co * 9);
  t.ligne(cx, cy, fx, fy, C.b1); pd(t, fx, fy, C.g1); ciel(fy, fx);
}
function citerne(t, x0, y0, l, h) {
  for (let y = y0; y < 76; y++) for (let x = x0; x < x0 + l; x++) {
    const u = (x - x0) / (l - 1);
    if (y < y0 + 3 && (u < .15 || u > .85) && y === y0) continue;
    let c = u < .2 ? C.b3 : u < .55 ? C.b5 : u < .85 ? C.b6 : C.b4;
    if (y === y0) c = C.b5;
    if (y - y0 === 6 || y - y0 === 7) c = y - y0 === 6 ? C.o2 : C.o1;
    if (x === x0 + 2 && y > y0 + 2 && (y & 1)) c = C.g1;
    pd(t, x, y, c);
  }
}
// La fusée et sa tour de lancement (la fusée elle-même est dessinée à chaque
// image : elle décolle de temps en temps).
function tourLancement(t) {
  const x = TOUR.x;
  for (let y = 6; y < 78; y++) {
    pd(t, x, y, C.g1); pd(t, x + 9, y, C.g1);
    if ((y - 6) % 6 === 0) for (let k = 0; k <= 9; k++) pd(t, x + k, y, C.g3);
    else pd(t, x + ((y - 6) % 6) * 1.5, y, C.g0);
    for (let k = 1; k < 9; k++) ciel(y, x + k);
  }
  for (let x2 = x - 2; x2 <= x + 11; x2++) { pd(t, x2, 5, C.o2); pd(t, x2, 4, C.o3); }
  pd(t, x + 4, 2, C.g2); pd(t, x + 4, 3, C.g2);
  // Le pas de tir, au bord de l'eau, bandes de danger.
  for (let y = 72; y < 84; y++) for (let x2 = 596; x2 < 672; x2++) {
    const c = y === 72 ? C.e4 : y < 76 ? C.e3 : y < 78 ? ((x2 >> 2) & 1 ? C.k : C.y2) : C.e1;
    t.pt(x2, y, c);
  }
}
// Le grand bâtiment beige : un haut bloc aux vitres orange, une aile plus
// basse, une porte éclairée, la bande bleue du pied.
function batimentBeige(t) {
  for (let x = 698; x <= 842; x++) {
    const haut = x < 760 ? 26 : 44;
    let top = haut;
    if (x - 698 < 4) top += 4 - (x - 698);
    if (x >= 760 && x - 760 < 3) top += 3 - (x - 760);
    for (let y = top; y < 76; y++) {
      const i = x < 760 ? x - 698 : x - 760, bloc = x < 760 ? 62 : 83;
      let c = y === top ? C.e4 : i < 2 ? C.e1 : i > bloc - 3 ? C.e4 : i % 15 === 0 ? C.e2 : (y - haut) % 12 === 11 ? C.e2 : C.e3;
      if (x < 760 && y >= 30 && y <= 34) c = i % 5 === 0 ? C.e1 : y === 30 ? C.o2 : C.o3;
      if (x < 760 && y === 35) c = C.e1;
      // Petites fenêtres carrées.
      if (x < 760 && i > 44 && i < 56 && y > 38 && y < 62 && (i % 6 < 3) && ((y - 38) % 7 < 2)) c = (i % 6 === 0 && (y - 38) % 7 === 0) ? C.l3 : C.g0;
      if (x >= 760 && y > 49 && y < 52 && i > 4 && i < 76 && i % 9 < 3) c = i % 9 === 0 ? C.l3 : C.g0;
      // Porte éclairée.
      if (x >= 792 && x < 808 && y >= 58) c = x === 792 || x === 807 || y === 58 ? (x === 807 ? C.u3 : C.e1) : y < 62 ? C.o2 : C.o3;
      // Bande bleue du pied, veilleuses.
      if (y >= 70 && y < 73 && !(x >= 792 && x < 808)) c = y === 70 ? C.l2 : C.l1;
      if (y === 71 && x % 12 === 0 && !(x >= 792 && x < 808)) c = C.u4;
      pd(t, x, y, c);
    }
  }
  // Marquages « COMM » discrets.
  glyphes3x5('COMM', (gx, gy) => pd(t, 712 + gx, 50 + gy, C.e2), MIROIR);
  // Antennes et parabole du toit.
  for (let y = 14; y < 26; y++) pd(t, 716, y, C.b2);
  pd(t, 715, 18, C.b3); pd(t, 717, 18, C.b3);
  for (let y = 18; y < 26; y++) pd(t, 748, y, C.b2);
  parabole(t, 826, 36, 6, 2.4, .5);
}
// La station de recharge du drone, vide : le drone XR-9 est le payload qui
// roule en bas. Un disque orange au sol, un cercle bleu « caution », et la
// borne de recharge à son bord.
function stationDrone(t) {
  for (let y = 64; y < 76; y++) for (let x = 850; x < W; x++) pd(t, x, y, y === 64 ? C.e4 : y < 67 ? C.e3 : C.e2);
  const px = 902, py = 70;
  ellipse(t, px, py, 36, 5, (x, y) => {
    const d = Math.hypot((x - px) / 36, (y - py) / 5);
    return d > .92 ? C.o1 : d > .84 ? C.o3 : d > .56 && d < .62 ? C.o1 : C.o2;
  });
  // Le grand « W » bleu peint sur le disque, et la pastille « caution ».
  for (const [x, y] of [[892, 69], [893, 70], [894, 71], [895, 70], [896, 69], [897, 70], [898, 71], [899, 70], [900, 69]]) { pd(t, x, y, C.l1); pd(t, x + 1, y, C.l2); }
  ellipse(t, 926, 71, 3, 1.2, () => C.l2); pd(t, 926, 71, C.u4);
  // La borne de recharge : un pylône gris, une barre de lumière bleue.
  for (let y = 50; y < 70; y++) for (let x = 944; x < 950; x++) pd(t, x, y, y === 50 ? C.b5 : x === 944 ? C.b3 : x === 949 ? C.g1 : (x === 946 || x === 947) && y > 53 && y < 66 ? C.u3 : C.g3);
  for (let x = 942; x < 952; x++) pd(t, x, 69, C.g1);
  ombre(t, 950, 70, 6, 1.5, .4);
}
function base(t) {
  batimentBleu(t);
  tourComm(t);
  passerelle(t);
  sphere(t);
  parabole(t, 500, 30, 11, 4.5, .45);
  citerne(t, 548, 50, 16, 26); citerne(t, 568, 56, 14, 20);
  for (let x = 540; x < 598; x++) { pd(t, x, 68, C.b4); pd(t, x, 69, C.g2); }
  batimentBeige(t);
  stationDrone(t);
  // Le mur d'enceinte de la base, beige à bande orange, qui borde le terrain.
  for (let x = 0; x < W; x++) for (let y = 76; y < 84; y++) {
    let c = y === 76 ? C.e4 : y < 79 ? C.e3 : y < 81 ? C.o2 : y === 81 ? C.o1 : C.e2;
    if (x % 40 === 0 && y > 76) c = C.e1;
    t.pt(x, y, c);
  }
}
// L'enseigne de la base, sur le mur d'enceinte, au-dessus du terrain.
function enseigne(t) {
  const texte = 'WATCHPOINT : GIBRALTAR';
  const larg = glyphes3x5(texte, () => {});
  const x0 = Math.round(CX - larg / 2), y0 = 67;
  for (let y = y0 - 3; y < y0 + 8; y++) for (let x = x0 - 14; x < x0 + larg + 14; x++) {
    const bord = y === y0 - 3 || y === y0 + 7 || x === x0 - 14 || x === x0 + larg + 13;
    t.pt(x, y, bord ? C.o1 : y === y0 - 2 ? C.b1 : C.b0);
  }
  for (let x = x0 - 14; x < x0 + larg + 14; x++) t.teinte(x, y0 + 8, PAL, C.k, .4);
  glyphes3x5(texte, (gx, gy) => t.pt(x0 + gx, y0 + gy, gy === 0 ? C.o4 : C.o3), MIROIR);
  for (const x of [x0 - 8, x0 + larg + 7]) pastilleOW(t, x + .5, y0 + 2.5, 3.2);
}

// ---------------------------------------------------------------------------
// L'aire d'atterrissage
// ---------------------------------------------------------------------------
const DALLE = { l: 82, h: 68 };
function peindreAire(t) {
  const { left: L, right: R, top: T, bottom: B } = COURT;
  for (let y = 84; y < H; y++) for (let x = 0; x < W; x++) {
    if (dansTerrain(x, y)) {
      const i = Math.floor((x - L) / DALLE.l), j = Math.floor((y - T) / DALLE.h);
      const dx = (x - L) % DALLE.l, dy = (y - T) % DALLE.h;
      // Le béton : chaque dalle a son ton, un léger nuage, les coups de
      // taloche en longues traînées, et les granulats qui affleurent.
      const n = fbm(x * .03, y * .03, 2, 20), taloche = fbm(x * .008, y * .16, 2, 24);
      const l = 194 + (hacher(i, j, 21) - .5) * 12 + (n - .5) * 10 + (taloche - .5) * 8;
      let c = BETON.tramer(l, l * .97, l * .91, x, y, 3.2);
      const g = hacher(x, y, 25);
      if (g < .014) c = C.q1; else if (g < .026) c = C.q5;
      // Les joints : une rainure sombre, l'arête éclairée de la dalle
      // suivante, l'arête d'en face dans l'ombre.
      if (dx === 0 || dy === 0) c = C.q0;
      else if (dx === 1 || dy === 1) c = C.q5;
      else if (dx === DALLE.l - 1 || dy === DALLE.h - 1) c = C.q1;
      t.px[y * W + x] = c;
    } else {
      // Autour : l'asphalte sombre des allées de la base.
      const l = 96 + (fbm(x * .04, y * .04, 2, 22) - .5) * 16;
      t.px[y * W + x] = BLANC.tramer(l, l, l * 1.04, x, y, 2);
    }
  }
  // Fissures fines, qui partent en zigzag et se ramifient parfois.
  const fissure = (x, y, a, len, graine) => {
    for (let s2 = 0; s2 < len; s2++) {
      a += (hacher(graine, s2, 41) - .5) * .9;
      x += Math.cos(a); y += Math.sin(a);
      const px = Math.round(x), py = Math.round(y);
      if (!dansTerrain(px, py)) return;
      t.pt(px, py, hacher(px, py, 39) < .3 ? C.q2 : C.q1); t.teinte(px, py + 1, PAL, C.q5, .4);
      if (hacher(graine, s2, 42) < .06 && len > 10) fissure(x, y, a + (hacher(graine, s2, 43) < .5 ? 1 : -1), 5 + hacher(graine, s2, 44) * 8, graine * 7 + s2);
    }
  };
  for (let k = 0; k < 18; k++) fissure(L + 8 + hacher(k, 1, 40) * (R - L - 16), T + 8 + hacher(k, 2, 40) * (B - T - 16), hacher(k, 3, 40) * 6.28, 14 + hacher(k, 4, 40) * 34, k + 1);
  // Taches d'huile et de carburant, et des plaques plus claires, délavées.
  for (let k = 0; k < 9; k++) {
    const cx = L + 30 + hacher(k, 5, 45) * (R - L - 60), cy = T + 30 + hacher(k, 6, 45) * (B - T - 60), r = 5 + hacher(k, 7, 45) * 9;
    const huile = k < 5;
    for (let y = Math.floor(cy - r * 1.6); y <= cy + r * 1.6; y++) for (let x = Math.floor(cx - r * 1.6); x <= cx + r * 1.6; x++) {
      const d = Math.hypot((x - cx) / r, (y - cy) / (r * .7)) + (fbm(x * .15, y * .15, 2, 46 + k) - .5) * .8;
      if (d < 1) t.teinte(x, y, PAL, huile ? C.q0 : C.q5, huile ? (d < .5 ? .6 : .35) : .35);
    }
  }
  // Traces de pneus, discrètes.
  for (const [x0, y0, a] of [[180, 140, .3], [640, 470, -.25], [300, 470, .1]]) for (let s2 = 0; s2 < 120; s2++) for (const o of [-5, 5]) {
    const x = Math.round(x0 + Math.cos(a) * s2 - Math.sin(a) * o), y = Math.round(y0 + Math.sin(a) * s2 + Math.cos(a) * o + Math.sin(s2 * .04) * 3);
    if (dansTerrain(x, y)) t.teinte(x, y, PAL, C.q0, .28 * lisse(0, 30, s2) * lisse(120, 80, s2));
  }
  // Le sable que le vent pousse contre les bords de l'aire.
  for (let y = T; y < B; y++) for (let x = L; x < R; x++) {
    const bord = Math.min(x - L, R - 1 - x, y - T, B - 1 - y);
    if (bord > 14) continue;
    const k = (1 - bord / 14) * fbm(x * .06, y * .06, 2, 47);
    if (k > .3 && hacher(x, y, 48) < k * .8) t.pt(x, y, hacher(x, y, 49) < .5 ? C.e3 : C.e2);
  }
  // Les points d'arrimage, aux croisements des joints : un anneau d'acier.
  for (let x = L + DALLE.l; x < R; x += DALLE.l) for (let y = T + DALLE.h; y < B; y += DALLE.h) {
    if (Math.hypot(x - CX, y - CY) < 70) continue;
    disque(t, x, y, 2.6, (xx, yy) => { const d = Math.hypot(xx - x, yy - y); return d < 1 ? C.b0 : (xx - x) + (yy - y) < -1 ? C.b4 : d > 2 ? C.b1 : C.b2; });
    t.teinte(x + 2, y + 3, PAL, C.o0, .4); t.teinte(x + 2, y + 4, PAL, C.o0, .25);
  }
  // Grilles d'évacuation le long des bords.
  for (let x = L + 41; x < R; x += 164) for (const y of [T + 8, B - 12]) {
    for (let yy = y - 1; yy < y + 5; yy++) for (let xx = x - 9; xx < x + 9; xx++) t.pt(xx, yy, yy === y - 1 || yy === y + 4 || xx === x - 9 || xx === x + 8 ? C.b2 : (xx & 1) ? C.b0 : C.b2);
  }
}
function peindreLignes(t) {
  const trait = (x, y, c) => { x = Math.round(x); y = Math.round(y); t.pt(x, y, hacher(x, y, 30) < .08 ? C.q4 : c); };
  const { left: L, right: R, top: T, bottom: B } = COURT;
  for (let x = L; x < R; x++) { for (let k = 0; k < 3; k++) { trait(x, T + k, C.b6); trait(x, B - 1 - k, C.b6); } trait(x, T + 5, C.o2); trait(x, B - 6, C.o2); }
  for (let y = T; y < B; y++) {
    for (let k = 0; k < 3; k++) {
      if (y < BUT.haut || y >= BUT.bas) { trait(L + k, y, C.b6); trait(R - 1 - k, y, C.b6); }
      if (Math.abs(y - CY) > ANNEAU) trait(CX - 1 + k, y, C.b6);
    }
    if ((y < BUT.haut - 4 || y >= BUT.bas + 4) && y > T + 5 && y < B - 6) { trait(L + 5, y, C.o2); trait(R - 6, y, C.o2); }
  }
  for (let a = 0; a < Math.PI * 2; a += .004) for (let k = -1; k <= 1; k++) trait(CX + Math.cos(a) * (ANNEAU + k), CY + Math.sin(a) * (ANNEAU + k), C.b6);
  // Équerres orange aux quatre coins.
  for (const [cx, cy, sx, sy] of [[L + 10, T + 10, 1, 1], [R - 11, T + 10, -1, 1], [L + 10, B - 11, 1, -1], [R - 11, B - 11, -1, -1]])
    for (let k = 0; k < 18; k++) for (let e = 0; e < 3; e++) { trait(cx + k * sx, cy + e * sy, C.o2); trait(cx + e * sx, cy + k * sy, C.o2); }
  // Les aires de chargement devant les cages : un cadre jaune en tirets.
  for (const x0 of [L + 12, R - 76]) {
    for (let x = x0; x < x0 + 64; x++) for (const y of [BUT.haut - 14, BUT.bas + 13]) if ((x >> 3) & 1) { trait(x, y, C.y2); trait(x, y + 1, C.y1); }
    for (let y = BUT.haut - 14; y <= BUT.bas + 14; y++) for (const x of [x0, x0 + 63]) if ((y >> 3) & 1) { trait(x, y, C.y2); trait(x + 1, y, C.y1); }
  }
  // Pochoirs « PAD-01 » et « PAD-02 », délavés, dans les coins.
  for (const [texte, x0, y0] of [['PAD-01', L + 34, B - 34], ['PAD-02', R - 84, T + 22]]) {
    glyphes3x5(texte, (gx, gy) => { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const x = x0 + gx * 2 + a, y = y0 + gy * 2 + b; t.teinte(x, y, PAL, C.b6, hacher(x, y, 31) < .25 ? .3 : .7); } }, MIROIR);
  }
  // L'emblème Overwatch peint au centre, à même le béton.
  emblemeOW(t, CX, CY, 46, C.b6, C.o2, C.q1);
}

// ---------------------------------------------------------------------------
// Les cages : quais de chargement Overwatch
// ---------------------------------------------------------------------------
function peindreCage(t, cote) {
  const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, x1 = x0 + BUT.prof - 1;
  // Le sol du quai : caillebotis sombre.
  for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x <= x1; x++) t.pt(x, y, (x + y) % 4 === 0 || (x - y + 400) % 4 === 0 ? C.b0 : C.b1);
  for (const z of ZONES) {
    const cinq = z.points === 5, y0 = CY + z.from + 3, y1 = CY + z.to - 3;
    const px0 = x0 + 5, px1 = x1 - 5;
    for (let y = y0; y < y1; y++) for (let x = px0; x <= px1; x++) {
      const bord = x === px0 || x === px1 || y === y0 || y === y1 - 1;
      let c;
      if (cinq) {
        // Panneau holographique : bleu lumineux, lignes de balayage.
        const d = Math.hypot((x - (px0 + px1) / 2) / 20, (y - (y0 + y1) / 2) / 22);
        c = bord ? C.u3 : (y & 1) ? (d < .6 ? C.u2 : C.u1) : (d < .6 ? C.u3 : C.u2);
      } else {
        c = bord ? C.b2 : y < y0 + 5 || y > y1 - 6 ? (y === y0 + 4 || y === y1 - 6 ? C.o1 : C.o2) : (x - px0) + (y - y0) < 8 ? C.b6 : C.b5;
        if (!bord && (x === px0 + 2 || x === px1 - 2) && (y - y0) % 6 === 3) c = C.b2;
      }
      t.pt(x, y, c);
    }
    for (let x = px0; x <= px1 + 1; x++) t.teinte(x, y1, PAL, C.k, .5);
    const s = CHIFFRE[z.points];
    t.sprite(s, Math.round((x0 + x1) / 2 - s.l / 2 + .5), Math.round((y0 + y1) / 2 - s.h / 2), MIROIR);
  }
  // Le cadre : piliers blindés blancs à bande orange.
  const dos = cote === 1 ? x0 - 8 : x1 + 1;
  const blanc = k => [C.b3, C.b5, C.b6, C.b6, C.b5, C.b4, C.b3, C.b1][k];
  for (let y = BUT.haut - 8; y <= BUT.bas + 7; y++) for (let k = 0; k < 8; k++) t.pt(dos + k, y, (y - BUT.haut) % 40 < 4 && k > 1 && k < 6 ? C.o2 : blanc(k));
  for (const y0 of [BUT.haut - 8, BUT.bas]) for (let y = y0; y < y0 + 8; y++) for (let x = Math.min(x0, dos); x <= Math.max(x1, dos + 7); x++) {
    const k = y - y0;
    t.pt(x, y, k === 3 || k === 4 ? C.o2 : blanc(k));
  }
  for (let x = Math.min(x0, dos) - 1; x <= Math.max(x1, dos + 7) + 1; x++) t.teinte(x, BUT.bas + 8, PAL, C.k, .5);
  // L'emblème sur le mur du fond.
  const ex = dos + 4;
  for (let y = CY - 9; y <= CY + 9; y++) for (let x = ex - 4; x <= ex + 3; x++) t.pt(x, y, C.b6);
  pastilleOW(t, ex, CY + .5, 3);
  // Socles des gyrophares, aux coins côté terrain.
  for (const y of [BUT.haut - 4, BUT.bas + 3]) { const gx = cote === 1 ? x1 + 1 : x0 - 1; disque(t, gx, y, 4, (x, yy) => (x - gx) + (yy - y) < -2 ? C.b6 : C.b3); }
}

// ---------------------------------------------------------------------------
// Les bords
// ---------------------------------------------------------------------------
// Les packs de soin : le socle bleu lumineux au sol (le pack flotte au-dessus,
// dessiné à chaque image).
const SOINS = [[38, 454], [920, 454]];
function socleSoin(t, x, y) {
  ombre(t, x + 1, y + 1, 10, 3, .4);
  ellipse(t, x, y, 9, 3.5, (xx, yy) => {
    const d = Math.hypot((xx - x) / 9, (yy - y) / 3.5);
    return d > .84 ? (yy < y ? C.b3 : C.b1) : d > .66 ? C.u3 : C.u1;
  });
  t.hl(x - 2, x + 2, y, C.u3); t.pt(x, y - 1, C.u3); t.pt(x, y + 1, C.u3);
  t.pt(x - 8, y, C.u4); t.pt(x + 8, y, C.u4);
}
function ecranHolo(t, x0, y0, l, h) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) {
    let c = x === x0 || x === x0 + l - 1 || y === y0 || y === y0 + h - 1 ? C.u3 : (y & 1) ? C.u1 : C.u2;
    t.teinte(x, y, PAL, c, .85);
  }
  for (let k = 0; k < 3; k++) t.hl(x0 + 2, x0 + 2 + Math.round(hacher(k, x0, 12) * (l - 5)), y0 + 2 + k * 2, C.u4);
}
const ECRANS = [[4, 88, 18], [24, 86, 20]];
function peindreBords(t) {
  // À gauche en haut : le labo de Winston — console, écrans, pneu.
  ombre(t, 24, 124, 22, 3, .5);
  for (let y = 108; y < 124; y++) for (let x = 3; x < 45; x++) t.pt(x, y, y === 108 ? C.b6 : y < 111 ? C.b5 : x % 12 === 0 ? C.b2 : C.b4);
  t.hl(3, 44, 112, C.o2);
  for (const [x, y, l] of ECRANS) ecranHolo(t, x, y, l, 14 + (y === 86 ? 2 : 0));
  for (const x of [13, 34]) t.vl(x, 102, 107, C.b2);
  // Le pneu de Winston, couché.
  ombre(t, 59, 208, 11, 3, .5);
  ellipse(t, 58, 205, 10, 4.5, (x, y) => { const d = Math.hypot((x - 58) / 10, (y - 205) / 4.5); return d < .5 ? C.b1 : d > .88 ? C.k : ((Math.atan2(y - 205, x - 58) * 6) | 0) & 1 ? C.f0 : C.b0; });
  // À droite en haut : le mur de glace de Mei.
  for (let y = 98; y < 132; y++) for (let x = 920; x < 956; x++) {
    const bloc = Math.floor((x - 920) / 12), hb = 100 + (bloc === 1 ? -4 : bloc * 3);
    if (y < hb) continue;
    let c = (x - 920) % 12 === 0 ? C.p2 : y < hb + 3 ? C.w : (x + y) % 9 === 0 ? C.u4 : y > 126 ? C.p3 : C.u4;
    if ((x - 920) % 12 === 1) c = C.w;
    t.pt(x, y, c);
  }
  ombre(t, 938, 133, 20, 3, .4);
  // Givre au sol autour.
  for (let i = 0; i < 36; i++) { const x = 894 + hacher(i, 1, 13) * 64, y = 128 + hacher(i, 2, 13) * 30; t.pt(Math.round(x), Math.round(y), hacher(i, 3, 13) < .5 ? C.u4 : C.w); }
  // Les socles des packs de soin.
  for (const [x, y] of SOINS) socleSoin(t, x, y);
  // En bas : la route, le garde-corps, la mer.
  for (let y = 563; y < H; y++) for (let x = 0; x < W; x++) {
    let c;
    if (y < 580) c = y === 563 ? C.b3 : (x % 24 < 12 && y === 571) ? C.b5 : BLANC.tramer(92, 92, 96, x, y, 2);
    else if (y < 585) c = y === 580 ? C.b6 : y === 581 ? C.b4 : y === 584 ? C.b2 : C.b5;
    else { const o = Math.sin((y - 585) * 1.6 + fbm(x * .03, y * .3, 2, 23) * 4) * 12; const f = Math.exp(-(((x - SOLEIL.x) / 140) ** 2)); c = MER.tramer(70 + o + 90 * f, 58 + o + 50 * f, 128 + o * .6, x, y, 1.8); }
    t.px[y * W + x] = c;
  }
  for (let x = 12; x < W; x += 36) for (let y = 578; y < 586; y++) { t.pt(x, y, C.o1); t.pt(x + 1, y, C.o2); }
}

function peindreFond() {
  const t = new Toile(W, H);
  if (!CIELM) CIELM = new Uint8Array(W * HORIZON);
  peindreCiel(t);
  rocher(t);
  tourLancement(t);
  base(t);
  enseigne(t);
  peindreAire(t);
  peindreBords(t);
  peindreLignes(t);
  peindreCage(t, 1);
  peindreCage(t, 2);
  // Où l'eau se voit encore, pour les reflets qui scintillent.
  MERM = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) MERM[i] = EAU.has(t.px[i]) ? 1 : 0;
  FOND = t;
}

// ---------------------------------------------------------------------------
// Les héros des bords
// ---------------------------------------------------------------------------
// Un pinceau posé aux pieds d'un héros : dx vers l'avant (s = 1 regarde à
// droite, -1 à gauche), h vers le haut depuis le sol. Une couleur nulle
// laisse le pixel tel quel.
function pinceau(t, x, yb, s) {
  const P = (dx, h, c) => { if (c) t.pt(x + dx * s, yb - h, c); };
  const R = (dx, h, l, ht, c) => { for (let j = 0; j < ht; j++) for (let i = 0; i < l; i++) P(dx + i, h + j, typeof c === 'function' ? c(i, j) : c); };
  const L = (dx0, h0, dx1, h1, c) => t.ligne(x + dx0 * s, yb - h0, x + dx1 * s, yb - h1, c);
  const T = (dx, h, c, k) => t.teinte(x + dx * s, yb - h, PAL, c, k);
  return { P, R, L, T };
}

// Winston : gorille en armure blanche, lunettes, pot de beurre de cacahuète.
function winston(t, x, yb, temps) {
  const souffle = Math.round(Math.sin(temps * 1.6) * .6);
  const mange = (temps % 7) < 1.4;
  ombre(t, x, yb + 1, 18, 3, .5);
  for (const dx of [-6, 3]) for (let y = yb - 9; y <= yb; y++) for (let k = 0; k < 5; k++) t.pt(x + dx + k, y, y === yb ? C.f0 : k === 0 ? C.f0 : k < 3 ? C.f2 : C.f1);
  const ty = yb - 21 + souffle;
  ellipse(t, x, ty, 13, 12, (xx, yy) => { const l = (xx - x) / 13 + (yy - ty) / 12; return l < -.7 ? C.f3 : l < .2 ? C.f2 : l < .9 ? C.f1 : C.f0; });
  ellipse(t, x, ty - 1, 8, 7, (xx, yy) => { const l = (xx - x) / 8 + (yy - ty) / 7; return l < -.6 ? C.b6 : l < .5 ? C.b5 : C.b3; });
  disque(t, x, ty, 1.6, () => C.o3);
  for (const s of [-1, 1]) disque(t, x + s * 12, ty - 8, 5, (xx, yy) => (xx - x - s * 12) + (yy - ty + 8) < -3 ? C.b6 : C.b4);
  for (let y = ty - 4; y <= yb - 2; y++) for (let k = 0; k < 5; k++) t.pt(x - 18 + k + Math.round((y - ty) * .1), y, k === 0 ? C.f0 : k < 3 ? C.f2 : C.f1);
  disque(t, x - 15, yb - 2, 3, () => C.f0);
  if (mange) {
    for (let k = 0; k < 14; k++) disque(t, Math.round(x + 15 - k * .5), Math.round(ty - 2 - k * .9), 2.4, () => C.f1);
    t.rect(x + 7, ty - 18, 6, 7, C.h3); t.hl(x + 7, x + 12, ty - 18, C.b5); t.hl(x + 7, x + 12, ty - 15, C.o2);
  } else {
    for (let y = ty - 4; y <= yb - 2; y++) for (let k = 0; k < 5; k++) t.pt(x + 14 + k - Math.round((y - ty) * .1), y, k === 4 ? C.f0 : k < 2 ? C.f2 : C.f1);
    t.rect(x + 13, yb - 9, 6, 7, C.h3); t.hl(x + 13, x + 18, yb - 9, C.b5); t.hl(x + 13, x + 18, yb - 6, C.o2);
  }
  const hy = ty - 16;
  disque(t, x, hy, 8, (xx, yy) => (xx - x) + (yy - hy) < -5 ? C.f3 : (xx - x) + (yy - hy) < 3 ? C.f2 : C.f1);
  ellipse(t, x, hy + 3, 6, 4, (xx, yy) => (yy - hy) < 3 ? C.f4 : C.f3);
  t.hl(x - 5, x + 5, hy - 2, C.f0);
  for (const s of [-1, 1]) {
    disque(t, x + s * 3, hy - 1, 2, () => C.b6);
    t.pt(x + s * 3, hy - 1, (temps % 5) < .3 ? C.w : C.u3);
  }
  t.pt(x, hy - 1, C.b6);
  t.hl(x - 2, x + 2, hy + 5, C.f0);
}
// Tracer : cheveux en épis, lunettes orange, blouson, accélérateur chronal
// bleu sur la poitrine, jambières orange. Elle fait des blinks.
function tracerSprite(t, x, yb, fantome) {
  const P = (xx, yy, c) => fantome ? t.teinte(xx, yy, PAL, C.u3, fantome) : t.pt(xx, yy, c);
  if (!fantome) ombre(t, x, yb + 1, 6, 1.5, .45);
  for (const dx of [-3, 1]) for (let y = yb - 11; y <= yb; y++) for (let k = 0; k < 3; k++) P(x + dx + k, y, y > yb - 2 ? C.b6 : k === 2 ? C.o1 : C.o2);
  for (let y = yb - 23; y < yb - 11; y++) for (let dx = -5; dx <= 5; dx++) P(x + dx, y, Math.abs(dx) === 5 ? C.h1 : dx < 0 ? C.h3 : C.h2);
  for (let y = yb - 22; y < yb - 11; y++) { P(x - 6, y, C.h2); P(x + 6, y, C.h1); }
  P(x - 6, yb - 11, C.s2); P(x + 6, yb - 11, C.s2);
  P(x + 7, yb - 12, C.b1); P(x + 8, yb - 12, C.b1);
  if (!fantome) disque(t, x, yb - 18, 3, (xx, yy) => Math.hypot(xx - x, yy - yb + 18) < 1.5 ? C.u4 : C.u3);
  for (let y = yb - 29; y < yb - 23; y++) for (let dx = -3; dx <= 3; dx++) P(x + dx, y, dx === 3 ? C.s1 : C.s3);
  for (let dx = -4; dx <= 4; dx++) P(x + dx, yb - 27, Math.abs(dx) < 3 ? C.o3 : C.o1);
  for (let dx = -4; dx <= 4; dx++) for (let k = 0; k < 3; k++) P(x + dx, yb - 30 - k - ((dx + 10 + k) % 3 === 0 ? 1 : 0), k === 2 ? C.h3 : C.h2);
  P(x - 5, yb - 29, C.h2); P(x + 5, yb - 30, C.h2); P(x - 2, yb - 34, C.h3); P(x + 2, yb - 34, C.h3);
}
function tracer(t, temps) {
  // Trois points où elle se pose ; entre deux, un blink : une traînée bleue.
  const PTS = [[54, 496], [58, 540], [36, 524]];
  const cyc = temps / 2.6, n = Math.floor(cyc), q = cyc - n;
  const a = PTS[n % 3], b = PTS[(n + 1) % 3];
  if (q < .88) tracerSprite(t, a[0], a[1], 0);
  else {
    const k = (q - .88) / .12;
    for (let i = 0; i < 4; i++) { const u = Math.min(1, k + i * .08); tracerSprite(t, Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), .5 - i * .1); }
    tracerSprite(t, b[0], b[1], 0);
  }
}
// Mercy : combinaison blanche et or, ailes dorées déployées, halo, bâton ;
// elle flotte et soigne Winston d'un rayon jaune.
function mercy(t, x, yb0, temps) {
  const yb = yb0 + Math.round(Math.sin(temps * 2) * 1.5);
  const soigne = (temps % 6) < 4.2;
  ombre(t, x, yb0 + 14, 7, 1.5, .3);
  const { P, R, L, T } = pinceau(t, x, yb, 1);
  // Les ailes : quatre lames dorées de chaque côté, en éventail.
  for (const s of [-1, 1]) for (let k = 3; k >= 0; k--) {
    const ex = s * (7 + k * 2), eh = 36 - k * 5;
    // Chaque lame : un fuseau plein, liseré clair dessus, sombre dessous.
    const pts = [[s * 2, 23 - k], [ex, eh + 1], [ex - s * 2, eh - 2], [s * 2, 18 - k]].map(([dx, h]) => [x + dx, yb - h]);
    balayerPoly(pts, (yy, a, b2) => { for (let xx = a; xx <= b2; xx++) t.pt(xx, yy, C.y2); });
    L(s * 2, 23 - k, ex, eh + 1, C.y3); L(s * 2, 18 - k, ex - s * 2, eh - 2, C.y1);
    P(ex, eh + 1, C.w);
    if (soigne) { T(ex, eh + 2, C.y3, .6); T(ex + s, eh + 1, C.y3, .4); }
  }
  // Jambes blanches à liseré noir, bottes.
  for (const dx of [-2, 1]) R(dx, 0, 2, 10, (i, j) => j < 2 ? (j === 1 ? C.y2 : C.b1) : i === (dx < 0 ? 1 : 0) ? C.b0 : C.b6);
  // Jupe de la tunique, torse, col doré.
  R(-3, 9, 7, 5, (i, j) => j === 0 ? C.y2 : i === 0 ? C.b4 : C.b6);
  R(-3, 14, 7, 7, (i, j) => j > 4 ? C.y2 : i === 3 ? C.b0 : i === 0 ? C.b4 : C.b6);
  P(-4, 19, C.y2); P(4, 19, C.y2);
  R(-4, 13, 1, 6, C.b5);
  // Le bras avant tient le bâton de Caducée.
  R(4, 14, 1, 5, C.b6); P(4, 13, C.s3);
  for (let h = 4; h <= 26; h++) P(5, h, h % 5 === 0 ? C.y2 : C.b6);
  R(4, 26, 3, 2, C.y3); P(3, 27, C.y2); P(7, 27, C.y2); P(5, 28, C.y3);
  // Tête : visage, cheveux blonds, queue de cheval, halo doré.
  R(-2, 21, 5, 5, (i, j) => i === 0 ? C.s2 : C.s3);
  P(1, 23, C.p0); P(2, 22, C.s2);
  R(-3, 25, 7, 2, (i, j) => j === 1 ? C.y3 : C.y2);
  P(-3, 24, C.y2); P(-3, 23, C.y2); P(-4, 22, C.y2); P(-4, 21, C.y1); P(-5, 20, C.y1);
  R(-2, 28, 5, 1, C.y3); P(-3, 27, C.y2); P(3, 27, C.y2);
  // Le rayon de soin vers Winston.
  if (soigne) {
    const x0 = x + 5, y0 = yb - 28, x1 = 30, y1 = 172;
    const vib = (temps * 10 | 0) & 1;
    t.ligne(x0, y0, x1, y1, null, (c, xx, yy) => ((xx + yy + (vib ? 1 : 0)) % 3) ? C.y3 : C.w);
    t.ligne(x0 + 1, y0, x1 + 1, y1, null, (c, xx, yy) => PAL.teinter(c, C.y2, .7, xx, yy));
    t.ligne(x0 - 1, y0, x1 - 1, y1, null, (c, xx, yy) => PAL.teinter(c, C.y2, .4, xx, yy));
    for (let a = 0; a < 6.3; a += .6) t.teinte(Math.round(x1 + Math.cos(a) * 4), Math.round(y1 + Math.sin(a) * 4), PAL, C.y3, .45);
  }
}
// Genji : armure argent et combinaison sombre, lignes vert néon, visière
// verte ; il lance des shurikens, et sort parfois la Lame du dragon.
function genji(t, x, yb, temps) {
  const { P, R, L, T } = pinceau(t, x, yb, 1);
  const dragon = (temps % 12) > 9;
  const lancer = temps % 3.4;
  ombre(t, x, yb + 1, 7, 1.6, .45);
  // Jambes : armure argent, genoux verts, pieds sombres.
  for (const dx of [-4, 1]) R(dx, 0, 3, 12, (i, j) => j === 0 ? C.b0 : j === 6 && i === 1 ? C.n2 : i === 0 ? C.b3 : j < 6 ? C.b4 : C.b5);
  R(-4, 12, 8, 2, (i, j) => j === 0 && i === 4 ? C.n2 : C.b0);
  // Torse : combinaison sombre, plastron argent, filets verts.
  R(-4, 14, 9, 9, (i, j) => j > 3 && i > 0 && i < 8 ? (i === 1 ? C.b4 : C.b5) : i === 0 ? C.b0 : C.b1);
  P(0, 16, C.n2); P(0, 17, C.n2); P(-2, 20, C.n2); P(2, 20, C.n2); P(0, 21, C.n2);
  R(-6, 20, 2, 3, C.b5); R(5, 20, 2, 3, C.b6); P(-6, 22, C.n2);
  // Le wakizashi dans le dos, et le bras arrière.
  L(-4, 18, -6, 27, C.b0); P(-6, 27, C.n2);
  R(-6, 13, 2, 7, (i, j) => i === 0 ? C.b1 : C.b3);
  // Bras avant tendu, et le katana levé.
  R(5, 15, 2, 5, C.b4); P(6, 14, C.b1); P(7, 15, C.b1);
  L(6, 14, 8, 16, C.b0);
  L(8, 17, 14, 29, dragon ? C.n3 : C.b6); L(9, 17, 15, 29, dragon ? C.n2 : C.b3);
  if (dragon) for (let k = 0; k < 14; k++) { const u = k / 13; for (const o of [-1, 2]) T(Math.round(8 + u * 6) + o, Math.round(17 + u * 12), C.n2, .6); }
  // Tête : casque argent, visière sombre et filet vert.
  R(-3, 23, 7, 8, (i, j) => (j === 7 && (i === 0 || i === 6)) ? 0 : j === 3 && i > 1 ? C.k : j === 4 && i > 2 ? C.n2 : i === 0 ? C.b3 : j > 5 ? C.b6 : C.b5);
  P(-4, 27, C.n2); P(-4, 28, C.n2); P(-1, 31, C.b4);
  // Trois shurikens qui filent vers le terrain.
  if (lancer < .7) for (let k = 0; k < 3; k++) {
    const dx = Math.round(10 + lancer * 60 - k * 5), h = 20 + (k - 1) * 3;
    if (dx < 10) continue;
    P(dx, h, C.b6); P(dx - 1, h, C.b3); P(dx + 1, h, C.b3); P(dx, h - 1, C.b3); P(dx, h + 1, C.b3);
  }
}
// Lúcio : rollers aux roues vertes, pantalon vert, maillot vert et jaune,
// dreadlocks, lunettes ; il fait des allers-retours, son aura de vitesse
// (verte) ou de soin (jaune) pulse autour de lui.
function lucio(t, temps) {
  const q = (temps / 4.4) % 2, u = q < 1 ? q : 2 - q, v = u * u * (3 - 2 * u);
  const x = Math.round(12 + v * 30), yb = 556, s = q < 1 ? 1 : -1;
  const vite = (temps % 9) < 4.5, ph = (temps * 1.2) % 1;
  for (let a = 0; a < 6.3; a += .08) {
    const r = 8 + ph * 12;
    t.teinte(Math.round(x + Math.cos(a) * r), Math.round(yb - 4 + Math.sin(a) * r * .35), PAL, vite ? C.n2 : C.y3, .6 * (1 - ph));
  }
  ombre(t, x, yb + 1, 7, 1.6, .45);
  const { P, R, L } = pinceau(t, x, yb, s);
  const pas = Math.round(Math.sin(temps * 5));
  // Rollers.
  for (const dx of [-4 + pas, 1 - pas]) { R(dx, 1, 4, 2, (i, j) => j === 1 ? C.n1 : C.b0); P(dx, 0, C.n2); P(dx + 3, 0, C.n2); P(dx + 1, 0, C.b0); P(dx + 2, 0, C.b0); }
  // Jambes, genouillères jaunes.
  R(-3 + pas, 3, 2, 9, (i, j) => j === 4 ? C.y2 : i === 0 ? C.n0 : C.n1);
  R(1 - pas, 3, 2, 9, (i, j) => j === 4 ? C.y2 : i === 0 ? C.n0 : C.n1);
  R(-3, 11, 6, 2, C.b0);
  // Maillot vert et jaune, bras.
  R(-4, 13, 8, 8, (i, j) => j === 7 ? C.y2 : i === 0 ? C.n0 : i === 7 ? C.y2 : i < 4 ? C.n1 : C.n2);
  R(-5, 14, 1, 6, C.s0);
  R(4, 17, 3, 2, C.s0);
  // L'amplificateur sonique, tenu devant.
  R(5, 15, 5, 3, (i, j) => j === 1 && i > 2 ? C.y2 : C.n1); P(10, 16, C.n2); P(5, 14, C.b0);
  // Tête : peau foncée, lunettes vertes sur le front, dreadlocks.
  R(-2, 21, 5, 6, (i, j) => i === 4 ? C.s1 : C.s0);
  P(2, 23, C.k);
  R(-2, 26, 5, 1, (i) => i > 2 ? C.n2 : C.y2);
  R(-3, 27, 6, 3, (i, j) => (i + j) & 1 ? C.h1 : C.h2);
  P(-2, 30, C.n2); P(0, 30, C.h1); P(2, 30, C.n2);
  L(-3, 26, -5, 19, C.h1); L(-2, 26, -4, 18, C.h1); P(-5, 19, C.n2); P(-4, 18, C.n2);
}
// Mei : parka bleue à col de fourrure, chignon et crayon, lunettes rondes ;
// Snowball tourne autour d'elle.
function mei(t, x, yb, temps) {
  ombre(t, x, yb + 1, 8, 2, .45);
  const salue = (temps % 6) < 1;
  for (const dx of [-4, 1]) for (let y = yb - 3; y <= yb; y++) for (let k = 0; k < 4; k++) t.pt(x + dx + k, y, C.f0);
  for (let y = yb - 20; y < yb - 3; y++) {
    const demi = 5 + Math.round((y - yb + 20) * .15);
    for (let dx = -demi; dx <= demi; dx++) t.pt(x + dx, y, y > yb - 6 ? C.b6 : Math.abs(dx) === demi ? C.p0 : dx < 0 ? C.p2 : C.p1);
  }
  t.vl(x, yb - 17, yb - 6, C.p0);
  for (let dx = -6; dx <= 6; dx++) t.pt(x + dx, yb - 21, C.b6);
  if (salue) { for (let k = 0; k < 7; k++) t.pt(x + 7 + (k > 3 ? 1 : 0), yb - 18 - k, C.p2); disque(t, x + 8, yb - 26, 1.5, () => C.s3); }
  else for (let k = 0; k < 8; k++) t.pt(x + 7, yb - 18 + k, C.p1);
  disque(t, x, yb - 25, 4, (xx, yy) => (xx - x) > 2 ? C.s2 : C.s3);
  for (let dx = -4; dx <= 4; dx++) { t.pt(x + dx, yb - 29, C.h1); t.pt(x + dx, yb - 28, C.h1); }
  t.pt(x - 4, yb - 27, C.h1); t.pt(x + 4, yb - 27, C.h1);
  disque(t, x, yb - 32, 2.4, () => C.h1);
  t.ligne(x - 3, yb - 35, x + 3, yb - 31, C.y2);
  for (const s of [-1, 1]) { t.pt(x + s * 2, yb - 25, C.k); t.pt(x + s * 2 - s, yb - 26, C.k); t.pt(x + s * 2 + s, yb - 26, C.k); }
  t.pt(x - 3, yb - 23, C.o4); t.pt(x + 3, yb - 23, C.o4);
  const a = temps * 1.2, sx = Math.round(x + Math.cos(a) * 12), sy = Math.round(yb - 30 + Math.sin(a * 2) * 3);
  disque(t, sx, sy, 3.2, (xx, yy) => (xx - sx) + (yy - sy) < -2 ? C.w : C.b5);
  t.pt(sx + (Math.cos(a) > 0 ? 1 : -1), sy, C.u3); t.pt(sx, sy + 3, C.u2);
  if ((temps * 3 | 0) % 2) t.teinte(sx, sy + 5, PAL, C.u4, .6);
}
// Reinhardt : grande armure d'acier, heaume à visière, crête dorée, marteau
// à réaction posé devant lui ; de temps en temps il lève son bouclier.
function reinhardt(t, x, yb, temps) {
  const { P, R, L, T } = pinceau(t, x, yb, -1);
  const bouclier = (temps % 9) > 5.2;
  ombre(t, x - 2, yb + 1, 17, 3, .5);
  // Jambes.
  for (const dx of [-7, 2]) R(dx, 0, 6, 15, (i, j) => j < 2 ? C.g0 : j === 7 || j === 8 ? (i > 0 && i < 5 ? C.g4 : C.g2) : i === 0 ? C.g1 : i < 3 ? C.g2 : C.g3);
  // Taille, ceinture dorée.
  R(-8, 15, 17, 3, (i, j) => j === 1 ? (i === 8 ? C.y3 : C.y1) : C.g1);
  // Torse : cuirasse, lion doré sur la poitrine.
  R(-9, 18, 19, 13, (i, j) => {
    if (i === 0 || i === 18) return C.g1;
    if (j === 12) return C.g4;
    if (Math.abs(i - 9) < 3 && j > 4 && j < 9) return (i + j) & 1 ? C.y2 : C.y1;
    return i < 6 ? C.g2 : i < 13 ? C.g3 : C.g4;
  });
  // Épaulières rondes.
  for (const dx of [-14, 9]) R(dx, 26, 6, 8, (i, j) => (j === 7 || j === 0) && (i === 0 || i === 5) ? 0 : j > 5 ? C.g4 : i === 0 || j === 0 ? C.g1 : C.g3);
  // Heaume, visière en fente, crête.
  R(-5, 31, 11, 10, (i, j) => (j === 9 && (i < 2 || i > 8)) ? 0 : j === 4 && i > 4 ? C.k : j === 5 && i > 5 ? C.g1 : i < 3 ? C.g2 : j > 7 ? C.g4 : C.g3);
  for (let h = 40; h < 44; h++) P(0, h, h === 43 ? C.y3 : C.y2);
  P(-1, 42, C.y1); P(1, 41, C.y2);
  // Bras avant et gantelet sur le manche du marteau.
  R(9, 18, 3, 8, (i) => i === 0 ? C.g1 : C.g3);
  R(10, 14, 4, 4, C.g1);
  // Le marteau à réaction, posé tête en bas.
  R(11, 7, 2, 8, C.b0);
  R(8, 0, 9, 8, (i, j) => j === 7 ? C.g4 : j === 3 ? C.y1 : i === 0 ? C.g0 : i < 3 ? C.g1 : C.g2);
  P(17, 2, C.o2); P(17, 4, C.o2);
  // Le bouclier : un grand panneau bleu translucide, maillé d'hexagones.
  if (bouclier) for (let h = 0; h < 52; h++) {
    const cour = Math.round(((h - 26) / 26) ** 2 * 3);
    for (let k = 0; k < 4; k++) {
      const dx = 20 + k + cour, bord = h === 0 || h === 51 || k === 0;
      const hex = ((h + (k & 1) * 3) % 6) === 0;
      T(dx, h, bord || hex ? C.u4 : C.u3, bord ? .8 : hex ? .6 : .4);
    }
  }
}
// Soldat : 76 : veste bleu marine à rayure blanche et rouge, masque gris à
// visière rouge, cheveux blancs, fusil à impulsions ; parfois il pose son
// champ biotique.
function soldat(t, x, yb, temps) {
  const { P, R, L, T } = pinceau(t, x, yb, -1);
  const champ = (temps % 10) > 6.5;
  if (champ) {
    const ph = (temps * 2) % 1;
    for (let yy = -6; yy <= 6; yy++) for (let xx = -18; xx <= 18; xx++) {
      const d = Math.hypot(xx / 18, yy / 6);
      if (d > 1) continue;
      t.teinte(x + xx, yb + yy, PAL, C.n2, d > .86 ? .7 : Math.abs(d - ph) < .1 ? .45 : .15);
    }
    t.rect(x + 12, yb - 3, 3, 4, C.b3); t.pt(x + 13, yb - 4, C.n3);
  }
  ombre(t, x, yb + 1, 7, 1.6, .45);
  for (const dx of [-4, 1]) { R(dx, 0, 3, 3, C.b0); R(dx, 3, 3, 10, (i, j) => j === 4 ? C.b2 : i === 0 ? C.b0 : C.b1); }
  R(-4, 13, 8, 1, C.b0);
  // Veste.
  R(-5, 14, 10, 10, (i, j) => j === 7 ? C.b6 : j === 6 ? C.x2 : i === 0 ? C.p0 : i < 4 ? C.p0 : C.p1);
  R(-3, 24, 6, 1, C.p0);
  R(-6, 15, 1, 7, C.p0); P(-6, 14, C.b0);
  // Le fusil à impulsions, tenu à l'horizontale.
  R(0, 16, 12, 3, (i, j) => j === 2 ? C.b3 : j === 0 ? C.b0 : (i === 4 || i === 7) ? C.u3 : C.b1);
  R(12, 17, 3, 1, C.b2); R(-2, 17, 2, 3, C.b1);
  R(5, 15, 2, 2, C.b0); R(1, 14, 2, 2, C.b0);
  // Tête : masque, visière rouge, cheveux blancs.
  R(-3, 24, 6, 6, (i, j) => j === 3 && i > 1 ? C.x2 : j > 3 ? C.b3 : i === 0 ? C.b1 : C.b2);
  T(4, 27, C.x2, .5);
  R(-3, 30, 5, 2, (i, j) => j === 1 && i & 1 ? C.b5 : C.b6); P(-2, 32, C.b6); P(0, 32, C.b5);
}
// Ana : à genoux, cape bleu canard et capuche, tunique beige, tatouage doré
// sous l'œil, long fusil biotique ; elle tire une fléchette de temps en
// temps.
function ana(t, x, yb, temps) {
  const { P, R, L, T } = pinceau(t, x, yb, -1);
  ombre(t, x - 2, yb + 1, 10, 1.8, .45);
  // Jambe arrière repliée au sol, jambe avant genou levé.
  R(-7, 0, 7, 3, (i, j) => i < 2 ? C.b0 : j === 2 ? C.b2 : C.b1);
  R(2, 0, 3, 7, (i, j) => j === 0 ? C.b0 : i === 0 ? C.b0 : C.b1);
  R(-1, 4, 5, 3, (i, j) => j === 2 ? C.b2 : C.b1);
  // La cape dans le dos, la tunique, les épaules.
  R(-7, 3, 3, 14, (i, j) => i === 0 ? C.t1 : j < 2 ? C.t1 : C.t2);
  R(-4, 7, 7, 10, (i, j) => i < 2 ? C.e2 : j === 3 ? C.e1 : C.e3);
  R(-5, 15, 9, 3, (i, j) => j === 2 ? C.t3 : C.t2);
  // Le fusil biotique, épaulé.
  R(-2, 14, 22, 2, (i, j) => j === 0 ? C.b0 : (i === 9 || i === 15) ? C.y2 : C.b1);
  R(4, 16, 5, 2, (i, j) => j === 1 ? C.b0 : C.b1); P(9, 17, C.u3);
  P(21, 15, C.b2);
  R(6, 12, 2, 2, C.s1); R(1, 13, 2, 2, C.s1);
  // Tête sous la capuche : visage, voile, œil d'Horus doré.
  R(-3, 18, 6, 7, (i, j) => (j === 6 && (i === 0 || i === 5)) ? 0 : i < 2 ? C.t2 : j > 4 ? C.t3 : i === 5 ? C.t1 : 0);
  R(1, 18, 3, 5, (i, j) => j < 2 ? C.b5 : C.s1);
  P(3, 21, C.k); P(2, 20, C.y2);
  // La fléchette.
  const q = temps % 4;
  if (q < .5) { const dx = Math.round(22 + q * 50); P(dx, 15, C.y3); P(dx - 1, 15, C.y2); T(dx - 2, 15, C.y3, .5); }
  if (q > 3.8) T(21, 15, C.y3, .8);
}
// Zenyatta : moine omniaque en lévitation, en tailleur, robe jaune d'or,
// chapelet, tête d'argent aux perles bleues ; ses huit orbes tournent
// derrière lui.
function zenyatta(t, x, yb0, temps) {
  const yb = yb0 + Math.round(Math.sin(temps * 1.5) * 1.5);
  ombre(t, x, yb0 + 8, 9, 2, .35);
  const cx = x, cy = yb - 17;
  const orbes = [];
  for (let k = 0; k < 8; k++) { const a = temps * .6 + k * Math.PI / 4; orbes.push([Math.round(cx + Math.cos(a) * 12), Math.round(cy + Math.sin(a) * 10), Math.sin(a)]); }
  const orbe = ([ox, oy]) => disque(t, ox, oy, 1.8, (xx, yy) => (xx - ox) + (yy - oy) < -1 ? C.y3 : (xx - ox) + (yy - oy) < 1 ? C.y2 : C.y1);
  for (const o of orbes) if (o[2] < 0) orbe(o);
  const { P, R, L } = pinceau(t, x, yb, -1);
  // Jambes croisées en métal, la robe drapée par-dessus.
  R(-7, 0, 15, 3, (i, j) => j === 2 ? C.b4 : i === 0 || i === 14 ? C.b2 : C.b3);
  R(-6, 2, 13, 5, (i, j) => j === 4 ? C.y3 : i % 4 === 0 ? C.y1 : C.y2);
  R(-2, 0, 5, 2, C.y1);
  // Torse d'argent, écharpe dorée en travers, chapelet.
  R(-4, 7, 9, 9, (i, j) => i < 2 ? C.b3 : j > 6 ? C.b6 : C.b5);
  for (let j = 0; j < 8; j++) { P(-4 + j, 8 + j, C.y2); P(-3 + j, 8 + j, C.y1); }
  for (const [dx, h] of [[-3, 15], [-2, 13], [-1, 12], [0, 11], [1, 12], [2, 13], [3, 15]]) P(dx, h, C.h1);
  // Bras sur les genoux.
  R(-7, 6, 2, 6, (i) => i === 0 ? C.b2 : C.b4); R(6, 6, 2, 6, (i) => i === 1 ? C.b2 : C.b4);
  P(-7, 5, C.b3); P(7, 5, C.b3);
  // Tête ronde, face sombre, perles bleues au front.
  R(-1, 16, 3, 1, C.b2);
  disque(t, x, yb - 21, 4, (xx, yy) => { const v = yy - (yb - 21); return v >= 0 && v <= 2 && Math.abs(xx - x) < 4 ? C.b0 : (xx - x) + v < -2 ? C.b5 : (xx - x) + v < 2 ? C.b4 : C.b2; });
  t.pt(x - 2, yb - 20, C.u4); t.pt(x + 2, yb - 20, C.u4);
  for (const dx of [-2, 0, 2]) t.pt(x + dx, yb - 24, C.u3);
  t.pt(x, yb - 17, C.b3);
  for (const o of orbes) if (o[2] >= 0) orbe(o);
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
function fusee(t, temps) {
  const { x, base: yb, haut, l } = FUSEE;
  // Décollage toutes les 45 s : elle monte lentement, sa flamme, sa fumée.
  const q = (temps % 45) / 45, vol = q > .82 ? (q - .82) / .18 : 0;
  const dy = Math.round(vol * vol * 140);
  const y0 = yb - haut - dy;
  if (vol > 0) {
    for (let i = 0; i < 16; i++) {
      const k = i / 16, r = 3 + k * 10 + vol * 6;
      const yy = Math.round(yb - 4 + k * 10 - dy * (1 - k) * .2), xx = Math.round(x + Math.sin(i * 1.7 + temps) * k * 6);
      disque(t, xx, Math.min(83, yy), r, (a, b) => b < 84 ? PAL.teinter(t.lire(a, b), C.b6, .7 * (1 - k * .5), a, b) : t.lire(a, b));
    }
    for (let j = 0; j < 10; j++) { const w = Math.max(1, 4 - j / 3); t.hl(Math.round(x - w), Math.round(x + w), y0 + haut + j, j < 3 ? C.w : j < 6 ? C.y3 : C.o2); }
  }
  // Le corps : blanc, bandes orange et noire, coiffe, ailerons.
  for (let y = y0; y < y0 + haut; y++) {
    if (y >= 84 || y < -2) continue;
    const k = (y - y0) / haut;
    let demi = k < .12 ? Math.round(k / .12 * (l / 2)) : l / 2;
    for (let xx = Math.round(x - demi); xx <= x + demi; xx++) {
      const u = (xx - x) / (l / 2 + .01);
      let c = u < -.6 ? C.b4 : u < .2 ? C.b6 : u < .7 ? C.b5 : C.b3;
      if (k > .2 && k < .23) c = C.o2;
      if (k > .5 && k < .53) c = C.k;
      if (k > .7 && k < .74) c = C.o2;
      if (k < .12) c = u < 0 ? C.o3 : C.o2;
      t.pt(xx, y, c); ciel(y, xx);
    }
  }
  for (const s of [-1, 1]) balayerPoly([[x + s * l / 2, y0 + haut - 14], [x + s * (l / 2 + 7), y0 + haut], [x + s * l / 2, y0 + haut]], (y, a, b) => { for (let xx = a; xx <= b; xx++) if (y < 84) { t.pt(xx, y, s < 0 ? C.b4 : C.b2); ciel(y, xx); } });
  const ly = y0 + Math.round(haut * .36);
  if (ly < 84) pastilleOW(t, x + .5, ly + .5, 3.4);
  // Au repos : bras de la tour accrochés, vapeur qui s'échappe.
  if (vol === 0) {
    for (const yy of [yb - 50, yb - 30]) { t.hl(x + l / 2 + 1, TOUR.x, yy, C.o1); t.hl(x + l / 2 + 1, TOUR.x, yy + 1, C.o2); }
    const v = (temps % 6) / 6;
    if (v < .5) for (let i = 0; i < 4; i++) { const k = v / .5, r = 2 + k * 6 + i; const xx = Math.round(x + (i - 1.5) * 9 * k), yy = Math.round(yb - 2 - k * 6); disque(t, xx, yy, r, (a, b) => b < 84 ? PAL.teinter(t.lire(a, b), C.w, .6 * (1 - k), a, b) : t.lire(a, b)); }
  }
}
// Le drapeau Overwatch en haut du mât de la sphère : noir, l'emblème orange,
// il ondule au vent.
function drapeau(t, temps) {
  const x0 = SPHERE.x + 1, y0 = 3, l = 20, h = 12;
  for (let i = 0; i < l; i++) {
    const o = Math.round(Math.sin(temps * 4 - i * .45) * 1.2 * (i / l));
    for (let j = 0; j < h; j++) {
      const pli = Math.sin(temps * 4 - i * .45) > .5 ? C.b0 : C.k;
      t.pt(x0 + i, y0 + j + o, j === 0 && i > 0 ? C.b0 : pli);
    }
  }
  const ex = x0 + 10, ey = y0 + 6 + Math.round(Math.sin(temps * 4 - 10 * .45) * .6);
  emblemeOW(t, ex, ey + .5, 4.4);
}
function feux(t, temps) {
  // Le feu rouge en haut de la tour de lancement et de la Comm Tower.
  if ((temps * 1.3 | 0) % 2) { t.pt(TOUR.x + 4, 1, C.x2); t.teinte(TOUR.x + 4, 0, PAL, C.x2, .5); t.pt(261, 0, C.x2); }
  // Les veilleuses de la passerelle qui pulsent.
  const k = .3 + Math.sin(temps * 2) * .2;
  for (let x = 292; x < 452; x += 16) { t.teinte(x - 1, 65, PAL, C.u3, k); t.teinte(x + 1, 65, PAL, C.u3, k); t.teinte(x, 66, PAL, C.u3, k); }
}
// Remet le décor du fond là où ce qui vole est passé devant un bâtiment : le
// vaisseau et les goélands restent dans le ciel, derrière la base.
function derriere(t, x0, y0, x1, y1) {
  for (let y = Math.max(0, y0); y <= Math.min(HORIZON - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++)
    if (!CIELM[y * W + x]) t.px[y * W + x] = FOND.px[y * W + x];
}
function vaisseauTransport(t, temps) {
  const q = (temps % 24) / 24;
  if (q > .5) return;
  const x = Math.round(-80 + q / .5 * (W + 160)), y = Math.round(16 + Math.sin(q * 20) * 2);
  // Un vaisseau de transport Overwatch : carlingue blanche à bande orange,
  // verrière bleue, grande aile, dérive, réacteurs bleus.
  balayerPoly([[x - 24, y + 1], [x + 16, y + 1], [x + 24, y + 5], [x + 16, y + 9], [x - 24, y + 9]], (yy, a, b) => {
    for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy <= y + 1 ? C.b6 : yy < y + 5 ? C.b5 : yy < y + 8 ? C.b4 : C.b2);
  });
  for (let xx = x - 24; xx < x + 14; xx++) t.pt(xx, y + 5, xx < x - 14 ? C.o2 : C.b3);
  balayerPoly([[x + 12, y + 2], [x + 17, y + 2], [x + 22, y + 5], [x + 12, y + 5]], (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy === y + 2 ? C.u3 : C.u1); });
  balayerPoly([[x - 24, y + 1], [x - 17, y + 1], [x - 21, y - 7], [x - 25, y - 7]], (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, xx < a + 2 ? C.b6 : C.b4); });
  balayerPoly([[x - 10, y + 6], [x + 8, y + 6], [x - 4, y + 16], [x - 20, y + 16]], (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy === y + 6 ? C.b5 : yy > y + 14 ? C.b2 : C.b3); });
  for (let yy = y + 2; yy <= y + 8; yy++) { t.pt(x - 25, yy, C.g1); t.teinte(x - 27, yy, PAL, C.u3, .8); t.teinte(x - 29, yy, PAL, C.u3, .5); t.teinte(x - 31, yy, PAL, C.u3, .25); }
  const clig = (temps * 2 | 0) % 2;
  t.pt(x - 23, y - 7, clig ? C.x2 : C.x1);
  derriere(t, x - 32, y - 8, x + 25, y + 17);
}
function goelands(t, temps) {
  for (let i = 0; i < 3; i++) {
    const per = W + 80, x = Math.round(((temps * (12 + i * 4) + i * 330) % per) - 40), y = Math.round(10 + i * 11 + Math.sin(temps * .5 + i) * 3);
    const b = (temps * 1.2 + i) % 2.4 < .4;
    t.pt(x - 3, y - (b ? 2 : 0), C.k0); t.pt(x - 2, y - (b ? 1 : 0), C.k0); t.pt(x - 1, y, C.b0); t.pt(x, y, C.b0); t.pt(x + 1, y, C.b0); t.pt(x + 2, y - (b ? 1 : 0), C.k0); t.pt(x + 3, y - (b ? 2 : 0), C.k0);
    derriere(t, x - 3, y - 2, x + 3, y);
  }
  // Deux goélands posés sur le garde-corps.
  for (const x of [250, 740]) { t.rect(x, 576, 4, 3, C.w); t.pt(x + 4, 576, C.y2); t.pt(x - 1, 577, C.b2); t.pt(x + 1, 579, C.y1); t.pt(x + 2, 579, C.y1); }
}
function mer(t, temps) {
  for (let i = 0; i < 48; i++) {
    const cyc = temps * .5 + hacher(i, 1, 60) * 5, n = Math.floor(cyc), ph = cyc - n;
    if (ph > .5) continue;
    const bas = i < 24;
    const x = Math.floor(hacher(i, n, 61) * W), y = bas ? 587 + Math.floor(hacher(i, n, 62) * 12) : HORIZON + 2 + Math.floor(hacher(i, n, 63) * 20);
    if (!MERM[y * W + x]) continue;
    const k = Math.sin(ph / .5 * Math.PI);
    t.teinte(x, y, PAL, C.m5, .8 * k); if (MERM[y * W + x + 1]) t.teinte(x + 1, y, PAL, C.m5, .5 * k);
  }
}
// Le payload : le drone satellite XR-9, en lévitation au-dessus de son halo
// bleu, qui glisse le long de la route du bas. Nez pointu, dessus blanc,
// coque bronze marquée « XR-9 », verrière, dérive, aile basse, et les deux
// gros réacteurs bleu acier à l'arrière, panneaux dorés et tuyères orange.
function payload(t, temps) {
  const q = (temps / 60) % 2, u = q < 1 ? q : 2 - q, v = u * u * (3 - 2 * u);
  const x = Math.round(170 + v * 620), y = 578, s = q < 1 ? 1 : -1;
  const y0 = y + Math.round(Math.sin(temps * 2.4));
  ellipse(t, x, y + 12, 54, 4, (xx, yy) => PAL.teinter(t.lire(xx, yy), C.u3, .45, xx, yy));
  ombre(t, x, y + 12, 38, 2.5, .45);
  const X = lx => x + lx * s;
  const P = (lx, ly, c) => t.pt(X(lx), y0 + ly, c);
  const poly = (pts, f) => balayerPoly(pts.map(([lx, ly]) => [X(lx), y0 + ly]), (yy, a, b) => {
    for (let xx = a; xx <= b; xx++) { const c = f((xx - x) * s, yy - y0); if (c) t.pt(xx, yy, c); }
  });
  // Le réacteur du fond, qui dépasse au-dessus.
  poly([[-42, -26], [-12, -26], [-12, -19], [-42, -19]], (lx, ly) => {
    if (ly === -26) return lx > -35 && lx < -17 ? C.y2 : C.a2;
    return lx > -15 ? C.g1 : ly === -25 ? C.a2 : C.a1;
  });
  // La coque.
  const dessus = lx => lx < 16 ? -11 : -11 + (lx - 16) * 12 / 34;
  poly([[-19, -11], [16, -11], [50, 1], [40, 8], [-13, 10], [-19, 5]], (lx, ly) => {
    if (lx >= 47) return C.b0;
    if (lx >= 44) return C.b1;
    if (ly <= Math.floor(dessus(lx))) return C.b6;
    if (ly < -3) {
      if (lx % 14 === 0 && ly > -10) return C.b3;
      if (ly === -10 && lx > -10 && lx < 14) return C.b6;
      return ly >= -5 ? C.b4 : C.b5;
    }
    if (ly === -3) return C.b3;
    if (ly === -2) return C.b2;
    if (ly < 7) {
      if (ly === -1) return C.z3;
      if (ly === 6 || (lx % 12 === 0 && lx < 40)) return C.z1;
      const h = hacher(lx + 60, ly + 20, 50);
      return h < .1 ? C.z1 : h < .18 ? C.z3 : C.z2;
    }
    return ly < 9 ? C.b1 : C.b0;
  });
  // La trappe ouverte sur le dessus, à l'avant, et son bloc gris.
  for (let lx = 20; lx <= 33; lx++) {
    const h0 = Math.floor(dessus(lx)) + 2;
    for (let k = 0; k < 3; k++) P(lx, h0 + k, lx === 20 || lx === 33 ? C.b3 : k === 0 ? C.b2 : lx > 23 && lx < 30 && k === 1 ? C.b2 : C.b0);
  }
  // Les chevrons gris peints sur le dessus.
  for (const l0 of [2, 7]) for (let k = 0; k < 3; k++) { P(l0 + k, -9 + k, C.b3); P(l0 + k, -5 - k, C.b3); }
  // La dérive, juste devant les réacteurs.
  poly([[-7, -11], [-1, -27], [4, -27], [8, -11]], (lx, ly) => {
    const av = -1 - (ly + 27) * 6 / 16, ar = 4 + (ly + 27) * 4 / 16;
    return lx >= ar - 1 ? C.b3 : lx <= av + 1 ? C.b6 : ly < -24 ? C.b6 : C.b5;
  });
  // Le réacteur du premier plan : blanc à l'avant, bleu acier à l'arrière,
  // panneau doré dessus, entrée d'air sombre, tuyère orange.
  poly([[-45, -18], [-44, -19], [-9, -19], [-8, -18], [-8, -5], [-9, -4], [-44, -4], [-45, -5]], (lx, ly) => {
    const panneau = lx > -36 && lx < -15;
    if (ly <= -19) return panneau ? C.y3 : lx > -24 ? C.b6 : C.a3;
    if (panneau && ly <= -17) return ly === -18 ? C.y2 : C.y1;
    if (lx > -12) return (ly & 1) ? C.g1 : C.g0;
    if (lx === -24) return C.g2;
    if (ly === -4) return C.g1;
    if (lx > -24) return ly < -14 ? C.b6 : ly < -8 ? C.b5 : ly < -5 ? C.b4 : C.b3;
    return ly < -14 ? C.a3 : ly < -8 ? C.a2 : C.a1;
  });
  for (let ly = -18; ly <= -5; ly++) { P(-47, ly, ly === -18 || ly === -5 ? C.o1 : C.o2); P(-46, ly, ly === -18 || ly === -5 ? C.o1 : C.o3); }
  const feu = .45 + Math.sin(temps * 13) * .2;
  for (let ly = -16; ly <= -7; ly++) for (let k = 0; k < 5; k++) t.teinte(X(-48 - k), y0 + ly, PAL, C.o3, (feu + .2) * (1 - k / 5));
  // L'aile basse, bout bronze.
  poly([[-32, 0], [6, 0], [12, 5], [-36, 5]], (lx, ly) => lx < -30 ? C.z1 : ly === 0 ? C.b6 : ly < 3 ? C.b5 : ly === 3 ? C.b4 : C.b2);
  // L'inscription sur la coque bronze, toujours à l'endroit.
  const larg = glyphes3x5('XR-9', () => {});
  const tx = Math.min(X(18), X(18 + larg - 1));
  glyphes3x5('XR-9', (gx, gy) => t.pt(tx + gx, y0 + gy, C.b5), MIROIR);
  // Feux de position et patins de lévitation.
  const clig = (temps * 2 | 0) % 2;
  P(49, 1, clig ? C.u4 : C.u2); P(1, -27, clig ? C.x2 : C.x1);
  for (const lx of [-6, 28]) { P(lx, 10, C.u3); P(lx + 1, 10, C.u4); P(lx + 2, 10, C.u3); t.teinte(X(lx + 1), y0 + 11, PAL, C.u4, .7); }
}
// Le bouclier des salles de réapparition, à l'embouchure : un rideau
// d'hexagones bleus qui ondule.
function bouclier(t, temps) {
  for (const cote of [1, 2]) {
    const mx = cote === 1 ? COURT.left - 3 : COURT.right - 2;
    for (let y = BUT.haut; y < BUT.bas; y++) for (let k = 0; k < 5; k++) {
      const x = mx + k;
      const hx = (y + (k & 1) * 3) % 6;
      const bordHex = hx === 0 || (k === 0 || k === 4);
      const onde = .3 + Math.sin(temps * 3 + y * .08) * .15;
      t.teinte(x, y, PAL, bordHex ? C.u4 : C.u3, bordHex ? onde + .25 : onde);
    }
  }
  // Gyrophares orange aux coins.
  for (const cote of [1, 2]) {
    const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, gx = cote === 1 ? x0 + BUT.prof : x0 - 1;
    for (const [y, ph] of [[BUT.haut - 4, 0], [BUT.bas + 3, 1.6]]) {
      const on = Math.sin(temps * 4 + ph + cote) > 0;
      disque(t, gx, y, 2.2, () => on ? C.o3 : C.o1);
      if (on) for (let a = 0; a < 6.3; a += .5) t.teinte(Math.round(gx + Math.cos(a) * 5), Math.round(y + Math.sin(a) * 5), PAL, C.o3, .4);
    }
  }
}
// Les packs de soin : boîtier beige, cœur bleu lumineux, croix rouge ; ils
// flottent et tournent au-dessus de leur socle.
function soins(t, temps) {
  for (const [x, y] of SOINS) {
    const b = Math.round(Math.sin(temps * 2 + x) * 1.2);
    const l = Math.max(1, Math.round(Math.abs(Math.cos(temps * 1.2 + x)) * 4));
    for (let yy = y - 9; yy < y - 1; yy++) for (let xx = x - 2; xx <= x + 2; xx++) t.teinte(xx, yy, PAL, C.u3, (.1 + (yy - y + 9) * .04) * (Math.abs(xx - x) < 2 ? 1 : .5));
    const y0 = y - 21 + b;
    for (let yy = y0; yy < y0 + 12; yy++) for (let xx = x - l; xx <= x + l; xx++) {
      const bord = xx === x - l || xx === x + l, cap = yy < y0 + 2 || yy > y0 + 9;
      let c = cap ? (yy === y0 || yy === y0 + 11 ? C.b1 : C.e3) : bord ? C.e4 : (yy & 1) ? C.u2 : C.u3;
      t.pt(xx, yy, c);
    }
    if (l >= 2) { t.vl(x, y0 + 3, y0 + 8, C.x2); t.hl(x - Math.min(2, l - 1), x + Math.min(2, l - 1), y0 + 5, C.x2); t.hl(x - Math.min(2, l - 1), x + Math.min(2, l - 1), y0 + 6, C.x2); }
    else t.vl(x, y0 + 3, y0 + 8, C.x2);
  }
}
function ecransWinston(t, temps) {
  for (const [x0, y0, l] of ECRANS) {
    const k = Math.floor(temps * 2 + x0) % 4;
    t.hl(x0 + 2, x0 + 2 + ((k + 1) * 3) % (l - 4), y0 + 9, C.u4);
  }
}

function fond(miroir) {
  MIROIR = miroir;
  const i = miroir ? 1 : 0;
  if (!FONDS[i]) { FOND = null; peindreFond(); FONDS[i] = FOND; }
  FOND = FONDS[i];
  return FOND;
}

// extras (tous facultatifs) : miroir — le monde est retourné (invité en
// ligne) ; butG / butD — flash de chaque cage, de 1 à 0 après un but.
export function creerPixel() {
  fond(false);
  const t = new Toile(W, H);
  const cible = document.createElement('canvas');
  cible.width = W; cible.height = H;
  const g = cible.getContext('2d');

  function image(temps, but, extras = {}) {
    fond(!!extras.miroir);
    const butG = extras.butG ?? but, butD = extras.butD ?? but;
    t.copier(FOND);
    vaisseauTransport(t, temps);
    goelands(t, temps);
    mer(t, temps);
    fusee(t, temps);
    drapeau(t, temps);
    feux(t, temps);
    ecransWinston(t, temps);
    // L'équipe de gauche.
    winston(t, 26, 200, temps);
    mercy(t, 55, 146, temps);
    genji(t, 16, 494, temps);
    tracer(t, temps);
    lucio(t, temps);
    // L'équipe de droite.
    mei(t, 904, 152, temps);
    reinhardt(t, 932, 210, temps);
    soldat(t, 906, 498, temps);
    ana(t, 946, 486, temps);
    zenyatta(t, 922, 546, temps);
    soins(t, temps);
    payload(t, temps);
    bouclier(t, temps);
    for (const cote of [1, 2]) {
      const fl = cote === 1 ? butG : butD;
      if (fl <= .02) continue;
      const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x < x0 + BUT.prof; x++) t.teinte(x, y, PAL, C.u4, fl * .55);
    }
    t.peindre(g);
    return cible;
  }
  return { image };
}
