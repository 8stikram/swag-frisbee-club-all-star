// ---------------------------------------------------------------------------
// OBSERVATOIRE : GIBRALTAR EN PIXEL ART HD.
//
// La base Overwatch de Gibraltar, en plein soleil méditerranéen. Au fond, le
// rocher de Gibraltar et sa falaise de calcaire, la base blanche et orange
// accrochée à son flanc, ses paraboles, l'emblème Overwatch ; à droite la
// fusée blanche sur son pas de tir, dans sa tour de lancement, qui lâche de la
// vapeur et décolle de loin en loin. La mer, un vaisseau de transport, des
// goélands.
//
// Le terrain est l'aire d'atterrissage de la base : grandes dalles de béton
// clair, lignes blanches doublées d'un filet orange, emblème Overwatch peint
// au centre. Les cages, propres à cette arène, sont des quais de chargement à
// la livrée Overwatch : panneaux blancs à bande orange pour les 3, panneau
// holographique bleu pour le 5, gyrophares orange, et le bouclier hexagonal
// bleu des salles de réapparition à l'embouchure.
//
// Sur les côtés : Winston, son pneu, ses écrans et son pot de beurre de
// cacahuète ; Tracer qui fait des blinks ; Mei et Snowball près d'un mur de
// glace ; une parabole, des caisses, des packs de soin. En bas, le convoi
// roule le long de la route, derrière le garde-corps et la mer.
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

const PAL = new Palette({
  // Ciel méditerranéen
  k0: '#2f7cc8', k1: '#4e98dc', k2: '#78b4e6', k3: '#a8d0ee', k4: '#d6eaf6', w: '#ffffff',
  // Mer
  m0: '#0c3664', m1: '#14508a', m2: '#206eac', m3: '#3890ca', m4: '#78bee4', m5: '#c2e4f4',
  // Calcaire du rocher
  r0: '#554e44', r1: '#7a7262', r2: '#9e9482', r3: '#beb4a0', r4: '#dad2be', r5: '#ece6d6',
  // Végétation
  v0: '#28461f', v1: '#3c662c', v2: '#588638', v3: '#7ca84c',
  // Base : blanc cassé, gris
  b0: '#3a3e46', b1: '#5c6068', b2: '#84888e', b3: '#a8acb0', b4: '#c6c8ca', b5: '#e0e2e2', b6: '#f6f7f6',
  // Béton du terrain
  q0: '#86827a', q1: '#9c988e', q2: '#b2aea4', q3: '#c4c0b6', q4: '#d4d0c6',
  // Orange Overwatch
  o0: '#62280a', o1: '#ac4c12', o2: '#ee7a1c', o3: '#ffa04c', o4: '#ffd09c',
  // Bleu holographique
  u0: '#113e68', u1: '#1c68a6', u2: '#32a0e0', u3: '#68d0ff', u4: '#c4f0ff',
  // Jaune, rouge
  y1: '#aa8612', y2: '#eebe30', y3: '#ffe27a', x1: '#a01818', x2: '#e83030',
  // Peaux, cheveux
  s1: '#ac785a', s2: '#dea682', s3: '#f4cca8', h1: '#2e1e12', h2: '#664020', h3: '#9a6838',
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
const BETON = PAL.sous(['q0', 'q1', 'q2', 'q3', 'q4', 'b5']);
const BLANC = PAL.sous(['b1', 'b2', 'b3', 'b4', 'b5', 'b6']);

const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
const dansCage = (x, y) => y >= BUT.haut - 10 && y < BUT.bas + 10 && (x < COURT.left + 3 || x >= COURT.right - 3);

let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
let CIELM = null;
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

// L'emblème Overwatch : un anneau épais ouvert en bas, et le chevron qui
// monte vers le centre depuis les deux bords de l'ouverture.
function emblemeOW(t, cx, cy, R, ep, cAnneau, cChevron, cOmbre) {
  const ouv = .42;                              // demi-ouverture, en radians, autour du bas
  for (let y = Math.floor(cy - R - 1); y <= cy + R + 1; y++) for (let x = Math.floor(cx - R - 1); x <= cx + R + 1; x++) {
    const d = Math.hypot(x + .5 - cx, y + .5 - cy);
    let a = Math.atan2(x + .5 - cx, y + .5 - cy);      // 0 = vers le bas
    if (d <= R && d >= R - ep && Math.abs(a) > ouv) t.pt(x, y, cOmbre && (x - cx) + (y - cy) > R * .9 ? cOmbre : cAnneau);
  }
  // Le chevron : deux barres qui partent des bords de l'ouverture et se
  // rejoignent un peu au-dessus du centre.
  for (const s of [-1, 1]) {
    const ax = cx + Math.sin(ouv) * (R - ep / 2) * s, ay = cy + Math.cos(ouv) * (R - ep / 2);
    const bx = cx, by = cy - R * .22;
    const L = Math.hypot(bx - ax, by - ay);
    for (let k = 0; k <= L; k += .5) {
      const px = ax + (bx - ax) * k / L, py = ay + (by - ay) * k / L;
      disque(t, Math.round(px), Math.round(py), ep * .42, () => cChevron);
    }
  }
}

// ---------------------------------------------------------------------------
// Le fond : ciel, mer, rocher, base, fusée
// ---------------------------------------------------------------------------
function peindreCiel(t) {
  for (let y = 0; y < HORIZON; y++) for (let x = 0; x < W; x++) {
    const k = y / HORIZON;
    let r = 50 + k * 170, g = 126 + k * 110, b = 204 + k * 44;
    const d = Math.hypot(x - 780, (y + 6) * 1.5), halo = Math.exp(-d * d / (2 * 120 * 120));
    r += 60 * halo; g += 50 * halo; b += 20 * halo;
    t.px[y * W + x] = CIEL.tramer(r, g, b, x, y, 1.8);
    CIELM[y * W + x] = 1;
  }
  disque(t, 780, 4, 9, (x, y) => Math.hypot(x - 780, y - 4) > 7.5 ? C.k4 : C.w);
  // La mer, et la côte espagnole au loin.
  for (let y = HORIZON; y < 84; y++) for (let x = 0; x < W; x++) {
    const k = (y - HORIZON) / 30, o = Math.sin((y - HORIZON) * 1.4 + fbm(x * .03, y * .2, 2, 5) * 4) * 8;
    t.px[y * W + x] = MER.tramer(40 + k * 10 + o, 112 + k * 20 + o, 184 + k * 10 + o, x, y, 1.8);
  }
  for (let x = 0; x < W; x++) {
    const h = Math.round(3 + Math.sin(x * .02) * 2 + fbm(x * .04, 1, 2, 6) * 4);
    for (let k = 0; k < h; k++) { const y = HORIZON - 1 - k; t.pt(x, y, k === h - 1 ? C.k3 : C.k2); CIELM[y * W + x] = 0; }
  }
}
// Le rocher de Gibraltar : falaise à pic au nord (à gauche), crête qui
// descend vers le sud, calcaire strié, végétation sur les pentes douces.
function hautRocher(x) {
  if (x < 236 || x > 520) return 99;
  if (x < 290) return Math.round(74 - (x - 236) / 54 * 66 + Math.sin(x * .6) * 1.5);
  return Math.round(8 + (x - 290) / 230 * 50 + Math.sin(x * .09) * 3 + fbm(x * .05, 0, 2, 7) * 5);
}
function rocher(t) {
  for (let x = 236; x <= 520; x++) {
    const top = hautRocher(x);
    for (let y = Math.max(0, top); y < 84; y++) {
      const falaise = x < 300;
      const strie = Math.sin(x * .8 + fbm(x * .05, y * .1, 2, 8) * 4) * 10;
      let l = falaise ? 150 + strie - (x < 262 ? 30 : 0) : 196 + strie * .6 - (y - top) * .3;
      l += (fbm(x * .06, y * .06, 2, 9) - .5) * 26;
      let c = CALCAIRE.tramer(l, l * .95, l * .84, x, y, 2);
      // La végétation s'accroche aux pentes du sud.
      if (!falaise && fbm(x * .05, y * .08, 3, 10) > .56 && y > top + 2) c = FEUILLAGE(x, y);
      t.pt(x, y, c); ciel(y, x);
    }
    t.pt(x, top, x < 300 ? C.r3 : C.r5); ciel(top, x);
  }
}
function FEUILLAGE(x, y) { const h = hacher(x >> 1, y >> 1, 11); return h < .3 ? C.v1 : h < .7 ? C.v2 : C.v3; }
// Un bâtiment de la base : murs blancs, bande orange, vitres bleues.
function batiment(t, x0, y0, l, h, logo) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) {
    let c = x < x0 + 2 ? C.b3 : x > x0 + l - 3 ? C.b3 : C.b6;
    if (y === y0) c = C.b4;
    if (y === y0 + 3 || y === y0 + 4) c = C.o2;
    if (y > y0 + 6 && y < y0 + h - 3 && (x - x0) % 7 > 1 && (x - x0) % 7 < 6 && (y - y0) % 8 < 4) c = (y - y0) % 8 === 0 ? C.u3 : C.u2;
    if (y === y0 + h - 1) c = C.b2;
    t.pt(x, y, c); ciel(y, x);
  }
  if (logo) { for (let y = y0 + 6; y < y0 + 18; y++) for (let x = x0 + l / 2 - 7; x < x0 + l / 2 + 7; x++) t.pt(Math.round(x), y, C.b6); emblemeOW(t, x0 + l / 2, y0 + 12, 6, 2.4, C.o2, C.o2); }
}
function parabole(t, x, y, r) {
  for (let yy = y; yy < y + 8; yy++) { t.pt(x, yy, C.b2); t.pt(x + 1, yy, C.b3); ciel(yy, x); ciel(yy, x + 1); }
  ellipse(t, x, y - 2, r, r * .55, (xx, yy) => { ciel(yy, xx); return (xx - x) + (yy - y) < -r * .5 ? C.b6 : (xx - x) + (yy - y) < r * .3 ? C.b5 : C.b3; });
  t.pt(x, y - 2, C.b1); t.pt(x - 1, y - 4, C.b2);
}
function base(t) {
  // La base accrochée au pied et au flanc du rocher, et le long de la côte.
  batiment(t, 300, 48, 60, 36, true);
  batiment(t, 360, 58, 44, 26, false);
  batiment(t, 404, 40, 36, 44, false);
  batiment(t, 440, 52, 50, 32, false);
  batiment(t, 700, 50, 70, 34, false);
  batiment(t, 770, 58, 56, 26, false);
  batiment(t, 150, 58, 60, 26, false);
  batiment(t, 60, 62, 70, 22, false);
  batiment(t, 870, 60, 90, 24, false);
  for (const [x, y, r] of [[420, 38, 7], [470, 50, 5], [330, 46, 5], [730, 48, 6], [180, 56, 5]]) parabole(t, x, y, r);
  // L'antenne radar sur la crête.
  for (let y = 4; y < 20; y++) { t.pt(292, y, C.b3); ciel(y, 292); }
  t.hl(288, 296, 4, C.b5); ciel(4, 288);
  // Le mur d'enceinte de la base, bande orange et feux, qui borde le terrain.
  for (let x = 0; x < W; x++) for (let y = 76; y < 84; y++) {
    let c = y === 76 ? C.b6 : y < 79 ? C.b5 : y < 81 ? C.o2 : y === 81 ? C.o1 : C.b3;
    if (x % 40 === 0 && y > 76) c = C.b2;
    t.pt(x, y, c);
  }
}
// L'enseigne de la base, sur le mur d'enceinte, au-dessus du terrain.
function enseigne(t) {
  const texte = 'WATCHPOINT : GIBRALTAR';
  const larg = glyphes3x5(texte, () => {});
  const x0 = Math.round(CX - larg / 2), y0 = 67;
  for (let y = y0 - 3; y < y0 + 8; y++) for (let x = x0 - 6; x < x0 + larg + 6; x++) {
    const bord = y === y0 - 3 || y === y0 + 7 || x === x0 - 6 || x === x0 + larg + 5;
    t.pt(x, y, bord ? C.o1 : y === y0 - 2 ? C.b1 : C.b0);
  }
  for (let x = x0 - 6; x < x0 + larg + 6; x++) t.teinte(x, y0 + 8, PAL, C.k, .4);
  glyphes3x5(texte, (gx, gy) => t.pt(x0 + gx, y0 + gy, gy === 0 ? C.o4 : C.o3), MIROIR);
  for (const x of [x0 - 10, x0 + larg + 9]) { emblemeOW(t, x, y0 + 2, 4, 1.8, C.o2, C.o2); }
}
// La fusée et sa tour de lancement (la fusée elle-même est dessinée à chaque
// image : elle décolle de temps en temps).
function tourLancement(t) {
  const x = TOUR.x;
  for (let y = 6; y < 78; y++) {
    t.pt(x, y, C.b1); t.pt(x + 9, y, C.b1);
    if ((y - 6) % 6 === 0) t.hl(x, x + 9, y, C.b2);
    else t.pt(x + ((y - 6) % 6) * 1.5, y, C.b0);
    ciel(y, x); ciel(y, x + 9); for (let k = 1; k < 9; k++) ciel(y, x + k);
  }
  for (let x2 = x - 2; x2 <= x + 11; x2++) { t.pt(x2, 5, C.o2); ciel(5, x2); }
  // Le pas de tir, sur la falaise au bord de l'eau.
  for (let y = 72; y < 84; y++) for (let x2 = 596; x2 < 672; x2++) {
    const c = y === 72 ? C.b6 : y < 76 ? C.b4 : y < 78 ? ((x2 >> 2) & 1 ? C.k : C.y2) : C.r1;
    t.pt(x2, y, c);
  }
}

// ---------------------------------------------------------------------------
// L'aire d'atterrissage
// ---------------------------------------------------------------------------
const DALLE = { l: 82, h: 68 };
function peindreAire(t) {
  for (let y = 84; y < H; y++) for (let x = 0; x < W; x++) {
    if (dansTerrain(x, y)) {
      const i = Math.floor((x - COURT.left) / DALLE.l), j = Math.floor((y - COURT.top) / DALLE.h);
      const dx = (x - COURT.left) % DALLE.l, dy = (y - COURT.top) % DALLE.h;
      const n = fbm(x * .03, y * .03, 2, 20);
      let l = 196 + (hacher(i, j, 21) - .5) * 10 + (n - .5) * 8;
      let c = BETON.tramer(l, l * .98, l * .93, x, y, 3.2);
      if (dx === 0 || dy === 0) c = C.q1; else if (dx === 1 || dy === 1) c = C.q4;
      t.px[y * W + x] = c;
    } else {
      // Autour : l'asphalte sombre des allées de la base.
      const l = 96 + (fbm(x * .04, y * .04, 2, 22) - .5) * 16;
      t.px[y * W + x] = BLANC.tramer(l, l, l * 1.04, x, y, 2);
    }
  }
  // Traces de pneus et une tache d'huile, discrètes.
  for (const [x0, y0, a] of [[180, 140, .3], [640, 470, -.25], [300, 470, .1]]) for (let s = 0; s < 120; s++) for (const o of [-5, 5]) {
    const x = Math.round(x0 + Math.cos(a) * s - Math.sin(a) * o), y = Math.round(y0 + Math.sin(a) * s + Math.cos(a) * o + Math.sin(s * .04) * 3);
    if (dansTerrain(x, y)) t.teinte(x, y, PAL, C.q0, .28 * lisse(0, 30, s) * lisse(120, 80, s));
  }
  // Grilles d'évacuation le long des bords.
  for (let x = COURT.left + 41; x < COURT.right; x += 164) for (const y of [COURT.top + 8, COURT.bottom - 12]) {
    for (let yy = y; yy < y + 4; yy++) for (let xx = x - 8; xx < x + 8; xx++) t.pt(xx, yy, (xx & 1) ? C.b1 : C.b3);
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
  // L'emblème Overwatch peint au centre, orange cerné de blanc.
  emblemeOW(t, CX, CY, 44, 13, C.b6, C.b6);
  emblemeOW(t, CX, CY, 42, 9, C.o2, C.o2, C.o1);
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
  emblemeOW(t, ex, CY, 4, 1.6, C.o2, C.o2);
  // Socles des gyrophares, aux coins côté terrain.
  for (const y of [BUT.haut - 4, BUT.bas + 3]) { const gx = cote === 1 ? x1 + 1 : x0 - 1; disque(t, gx, y, 4, (x, yy) => (x - gx) + (yy - y) < -2 ? C.b6 : C.b3); }
}

// ---------------------------------------------------------------------------
// Les bords
// ---------------------------------------------------------------------------
function caisse(t, x0, y0, l, h, bleu) {
  ombre(t, x0 + l / 2 + 2, y0 + h + 1, l / 2 + 2, 2, .45);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) {
    let c = y === y0 ? C.b6 : x === x0 || x === x0 + l - 1 || y === y0 + h - 1 ? C.b2 : y < y0 + 4 ? C.b5 : C.b4;
    if (y > y0 + 4 && y < y0 + 8 && x > x0 + 1 && x < x0 + l - 2) c = bleu ? C.u2 : C.o2;
    t.pt(x, y, c);
  }
}
function packSoin(t, x, y) {
  ellipse(t, x, y, 9, 3.5, (xx, yy) => Math.hypot((xx - x) / 9, (yy - y) / 3.5) > .75 ? C.b2 : C.b4);
  ellipse(t, x, y, 5, 2, () => C.y3);
}
function ecranHolo(t, x0, y0, l, h) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) {
    let c = x === x0 || x === x0 + l - 1 || y === y0 || y === y0 + h - 1 ? C.u3 : (y & 1) ? C.u1 : C.u2;
    t.teinte(x, y, PAL, c, .85);
  }
  for (let k = 0; k < 3; k++) t.hl(x0 + 2, x0 + 2 + Math.round(hacher(k, x0, 12) * (l - 5)), y0 + 2 + k * 2, C.u4);
}
function peindreBords(t) {
  // À gauche en haut : le coin de Winston — console, écrans, pneu.
  ombre(t, 30, 124, 26, 3, .5);
  for (let y = 108; y < 124; y++) for (let x = 6; x < 56; x++) t.pt(x, y, y === 108 ? C.b6 : y < 111 ? C.b5 : x % 12 === 0 ? C.b2 : C.b4);
  t.hl(6, 55, 112, C.o2);
  ecranHolo(t, 8, 88, 20, 14); ecranHolo(t, 32, 86, 22, 16);
  for (const x of [18, 43]) t.vl(x, 102, 107, C.b2);
  // Le pneu de Winston, couché, et quelques bananes.
  ombre(t, 48, 208, 18, 4, .5);
  ellipse(t, 46, 204, 16, 7, (x, y) => { const d = Math.hypot((x - 46) / 16, (y - 204) / 7); return d < .55 ? C.b1 : d > .9 ? C.k : ((Math.atan2(y - 204, x - 46) * 6) | 0) & 1 ? C.f0 : C.b0; });
  ellipse(t, 46, 204, 9, 3.5, () => C.b1);
  for (const [x, y] of [[10, 206], [15, 208]]) { t.hl(x, x + 4, y, C.y2); t.pt(x + 5, y - 1, C.y1); t.pt(x - 1, y - 1, C.h1); }
  // À gauche en bas : caisses et un pack de soin (Tracer est animée).
  caisse(t, 4, 534, 20, 14, false); caisse(t, 24, 540, 14, 10, true); caisse(t, 9, 520, 14, 12, true);
  packSoin(t, 20, 458);
  // À droite en haut : le mur de glace de Mei (Mei et Snowball sont animées).
  for (let y = 120; y < 150; y++) for (let x = 920; x < 956; x++) {
    const bloc = Math.floor((x - 920) / 12), hb = 120 + (bloc === 1 ? -6 : bloc * 3);
    if (y < hb) continue;
    let c = (x - 920) % 12 === 0 ? C.p2 : y < hb + 3 ? C.w : (x + y) % 9 === 0 ? C.u4 : y > 144 ? C.p3 : C.u4;
    if ((x - 920) % 12 === 1) c = C.w;
    t.pt(x, y, c);
  }
  ombre(t, 938, 151, 20, 3, .4);
  // Givre au sol autour.
  for (let i = 0; i < 40; i++) { const x = 896 + hacher(i, 1, 13) * 62, y = 150 + hacher(i, 2, 13) * 62; t.pt(Math.round(x), Math.round(y), hacher(i, 3, 13) < .5 ? C.u4 : C.w); }
  // À droite en bas : une grande parabole (elle tourne), caisses, pack de soin.
  for (let y = 478; y < 500; y++) for (let x = 916; x < 944; x++) t.pt(x, y, y === 478 ? C.b6 : x === 916 || x === 943 ? C.b2 : y > 496 ? C.b2 : C.b4);
  t.hl(916, 943, 484, C.o2);
  ombre(t, 930, 501, 16, 3, .45);
  caisse(t, 900, 520, 20, 14, false); caisse(t, 924, 526, 22, 16, true);
  packSoin(t, 918, 552);
  // En bas : la route, le garde-corps, la mer.
  for (let y = 563; y < H; y++) for (let x = 0; x < W; x++) {
    let c;
    if (y < 580) c = y === 563 ? C.b3 : (x % 24 < 12 && y === 571) ? C.b5 : BLANC.tramer(92, 92, 96, x, y, 2);
    else if (y < 585) c = y === 580 ? C.b6 : y === 581 ? C.b4 : y === 584 ? C.b2 : C.b5;
    else { const o = Math.sin((y - 585) * 1.6 + fbm(x * .03, y * .3, 2, 23) * 4) * 10; c = MER.tramer(40 + o, 110 + o, 180 + o, x, y, 1.8); }
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
  FOND = t;
}

// ---------------------------------------------------------------------------
// Les personnages des bords
// ---------------------------------------------------------------------------
// Winston : gorille en armure blanche, lunettes, pot de beurre de cacahuète.
function winston(t, x, yb, temps) {
  const souffle = Math.round(Math.sin(temps * 1.6) * .6);
  const mange = (temps % 7) < 1.4;
  ombre(t, x, yb + 1, 18, 3, .5);
  // Jambes courtes.
  for (const dx of [-6, 3]) for (let y = yb - 9; y <= yb; y++) for (let k = 0; k < 5; k++) t.pt(x + dx + k, y, y === yb ? C.f0 : k === 0 ? C.f0 : k < 3 ? C.f2 : C.f1);
  // Torse massif.
  const ty = yb - 21 + souffle;
  ellipse(t, x, ty, 13, 12, (xx, yy) => { const l = (xx - x) / 13 + (yy - ty) / 12; return l < -.7 ? C.f3 : l < .2 ? C.f2 : l < .9 ? C.f1 : C.f0; });
  // Plastron blanc et sa lumière orange.
  ellipse(t, x, ty - 1, 8, 7, (xx, yy) => { const l = (xx - x) / 8 + (yy - ty) / 7; return l < -.6 ? C.b6 : l < .5 ? C.b5 : C.b3; });
  disque(t, x, ty, 1.6, () => C.o3);
  // Épaulettes.
  for (const s of [-1, 1]) disque(t, x + s * 12, ty - 8, 5, (xx, yy) => (xx - x - s * 12) + (yy - ty + 8) < -3 ? C.b6 : C.b4);
  // Bras : longs, jusqu'au sol ; le droit remonte le pot à la bouche.
  for (let y = ty - 4; y <= yb - 2; y++) for (let k = 0; k < 5; k++) t.pt(x - 18 + k + Math.round((y - ty) * .1), y, k === 0 ? C.f0 : k < 3 ? C.f2 : C.f1);
  disque(t, x - 15, yb - 2, 3, () => C.f0);
  if (mange) {
    for (let k = 0; k < 14; k++) disque(t, Math.round(x + 15 - k * .5), Math.round(ty - 2 - k * .9), 2.4, () => C.f1);
    t.rect(x + 7, ty - 18, 6, 7, C.h3); t.hl(x + 7, x + 12, ty - 18, C.b5); t.hl(x + 7, x + 12, ty - 15, C.o2);
  } else {
    for (let y = ty - 4; y <= yb - 2; y++) for (let k = 0; k < 5; k++) t.pt(x + 14 + k - Math.round((y - ty) * .1), y, k === 4 ? C.f0 : k < 2 ? C.f2 : C.f1);
    t.rect(x + 13, yb - 9, 6, 7, C.h3); t.hl(x + 13, x + 18, yb - 9, C.b5); t.hl(x + 13, x + 18, yb - 6, C.o2);
  }
  // Tête : pelage, museau gris, arcade, lunettes rondes.
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
// Tracer : cheveux en épis, lunettes orange, blouson, accélérateur
// chronal bleu sur la poitrine, jambières orange. Elle fait des blinks.
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
  const PTS = [[22, 500], [50, 486], [52, 548]];
  const cyc = temps / 2.6, n = Math.floor(cyc), q = cyc - n;
  const a = PTS[n % 3], b = PTS[(n + 1) % 3];
  if (q < .88) tracerSprite(t, a[0], a[1], 0);
  else {
    const k = (q - .88) / .12;
    for (let i = 0; i < 4; i++) { const u = Math.min(1, k + i * .08); tracerSprite(t, Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), .5 - i * .1); }
    tracerSprite(t, b[0], b[1], 0);
  }
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
  // Snowball, le drone, qui tourne autour d'elle.
  const a = temps * 1.2, sx = Math.round(x + Math.cos(a) * 12), sy = Math.round(yb - 30 + Math.sin(a * 2) * 3);
  disque(t, sx, sy, 3.2, (xx, yy) => (xx - sx) + (yy - sy) < -2 ? C.w : C.b5);
  t.pt(sx + (Math.cos(a) > 0 ? 1 : -1), sy, C.u3); t.pt(sx, sy + 3, C.u2);
  if ((temps * 3 | 0) % 2) t.teinte(sx, sy + 5, PAL, C.u4, .6);
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
  if (ly < 84) { for (let yy = ly - 3; yy <= ly + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) t.pt(xx, yy, C.b6); emblemeOW(t, x, ly, 3, 1.3, C.o2, C.o2); }
  // Au repos : bras de la tour accrochés, vapeur qui s'échappe.
  if (vol === 0) {
    for (const yy of [yb - 50, yb - 30]) { t.hl(x + l / 2 + 1, TOUR.x, yy, C.o1); t.hl(x + l / 2 + 1, TOUR.x, yy + 1, C.o2); }
    const v = (temps % 6) / 6;
    if (v < .5) for (let i = 0; i < 4; i++) { const k = v / .5, r = 2 + k * 6 + i; const xx = Math.round(x + (i - 1.5) * 9 * k), yy = Math.round(yb - 2 - k * 6); disque(t, xx, yy, r, (a, b) => b < 84 ? PAL.teinter(t.lire(a, b), C.w, .6 * (1 - k), a, b) : t.lire(a, b)); }
  }
}
function paraboles(t, temps) {
  // La grande parabole de droite, qui balaie lentement.
  const a = Math.sin(temps * .3) * .9, x = 930, y = 466;
  const rx = Math.max(3, Math.abs(Math.cos(a)) * 14);
  ellipse(t, x, y, rx, 12, (xx, yy) => (xx - x) * Math.sign(Math.cos(a) || 1) + (yy - y) < -8 ? C.b6 : (xx - x) * Math.sign(Math.cos(a) || 1) + (yy - y) < 6 ? C.b5 : C.b3);
  t.ligne(x, y, x + Math.round(Math.sin(a) * 10), y - 4, C.b2);
  t.pt(x + Math.round(Math.sin(a) * 10), y - 5, C.x2);
  t.vl(x, y + 8, 478, C.b2);
}
function vaisseauTransport(t, temps) {
  const q = (temps % 24) / 24;
  if (q > .45) return;
  const x = Math.round(-60 + q / .45 * (W + 120)), y = Math.round(20 + Math.sin(q * 20) * 2);
  // Un vaisseau de transport Overwatch : carlingue blanche, ailes, réacteurs bleus.
  t.rect(x - 12, y, 24, 5, C.b5); t.hl(x - 12, x + 11, y, C.b6); t.hl(x - 12, x + 11, y + 4, C.b2);
  t.rect(x + 8, y + 1, 6, 3, C.u1); t.pt(x + 13, y + 1, C.u3);
  balayerPoly([[x - 6, y + 2], [x + 4, y + 2], [x - 2, y + 9], [x - 10, y + 9]], (yy, a, b) => t.hl(a, b, yy, C.b3));
  t.hl(x - 12, x - 10, y + 2, C.o2);
  for (const dx of [-14, -16]) t.teinte(x + dx, y + 2, PAL, C.u3, .7);
}
function goelands(t, temps) {
  for (let i = 0; i < 3; i++) {
    const per = W + 80, x = Math.round(((temps * (12 + i * 4) + i * 330) % per) - 40), y = Math.round(10 + i * 11 + Math.sin(temps * .5 + i) * 3);
    const b = (temps * 1.2 + i) % 2.4 < .4;
    t.pt(x - 3, y - (b ? 2 : 0), C.b1); t.pt(x - 2, y - (b ? 1 : 0), C.b1); t.pt(x - 1, y, C.w); t.pt(x, y, C.w); t.pt(x + 1, y, C.w); t.pt(x + 2, y - (b ? 1 : 0), C.b1); t.pt(x + 3, y - (b ? 2 : 0), C.b1);
  }
  // Deux goélands posés sur le garde-corps.
  for (const x of [250, 740]) { t.rect(x, 576, 4, 3, C.w); t.pt(x + 4, 576, C.y2); t.pt(x - 1, 577, C.b2); t.pt(x + 1, 579, C.y1); t.pt(x + 2, 579, C.y1); }
}
function mer(t, temps) {
  for (let i = 0; i < 40; i++) {
    const cyc = temps * .5 + hacher(i, 1, 60) * 5, n = Math.floor(cyc), ph = cyc - n;
    if (ph > .5) continue;
    const bas = i < 24;
    const x = Math.floor(hacher(i, n, 61) * W), y = bas ? 587 + Math.floor(hacher(i, n, 62) * 12) : HORIZON + 2 + Math.floor(hacher(i, n, 63) * 20);
    if (!bas && CIELM && y < 84 && t.lire(x, y) !== t.lire(x, y)) continue;
    const k = Math.sin(ph / .5 * Math.PI);
    t.teinte(x, y, PAL, C.m5, .8 * k); t.teinte(x + 1, y, PAL, C.m5, .5 * k);
  }
}
// Le convoi : il roule lentement sur la route du bas, dans son halo bleu.
function convoi(t, temps) {
  const q = (temps / 60) % 2, u = q < 1 ? q : 2 - q;
  const x = Math.round(140 + u * 680), y = 571;
  ellipse(t, x, y + 5, 34, 6, (xx, yy) => PAL.teinter(t.lire(xx, yy), C.u3, .25, xx, yy));
  ombre(t, x, y + 6, 17, 2, .5);
  for (let yy = y - 6; yy < y + 5; yy++) for (let xx = x - 15; xx <= x + 15; xx++) {
    const u2 = (xx - x) / 15, v = (yy - y + 6) / 11;
    if (Math.abs(u2) > .92 && v < .3) continue;
    let c = v < .15 ? C.b6 : v < .55 ? C.b5 : C.b3;
    if (v > .45 && v < .6) c = C.o2;
    t.pt(xx, yy, c);
  }
  ellipse(t, x, y - 8, 8, 4, (xx, yy) => yy < y - 8 ? C.u3 : C.u2);
  t.pt(x - 3, y - 10, C.u4);
  for (const dx of [-11, 11]) disque(t, x + dx, y + 5, 2.5, () => C.b0);
  const clig = (temps * 2 | 0) % 2;
  t.pt(x - 15, y - 1, clig ? C.u4 : C.u2); t.pt(x + 15, y - 1, clig ? C.u2 : C.u4);
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
function soins(t, temps) {
  // Le pack de soin tourne et luit au-dessus de son socle.
  for (const [x, y] of [[20, 458], [918, 552]]) {
    const b = Math.round(Math.sin(temps * 2 + x) * 1.2), l = Math.abs(Math.cos(temps * 1.5 + x)) * 3 + 1;
    t.rect(Math.round(x - l), y - 9 + b, Math.round(l * 2) + 1, 5, C.b6);
    t.vl(x, y - 9 + b, y - 5 + b, C.x2); t.hl(Math.round(x - Math.min(2, l)), Math.round(x + Math.min(2, l)), y - 7 + b, C.x2);
    for (let yy = y - 12; yy < y - 2; yy++) t.teinte(x, yy, PAL, C.y3, .15);
  }
}
function ecransWinston(t, temps) {
  for (const [x0, y0, l] of [[8, 88, 20], [32, 86, 22]]) {
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
    paraboles(t, temps);
    ecransWinston(t, temps);
    winston(t, 30, 196, temps);
    tracer(t, temps);
    mei(t, 906, 186, temps);
    soins(t, temps);
    convoi(t, temps);
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
