// ---------------------------------------------------------------------------
// JUNKERTOWN EN PIXEL ART HD — le terrain de Chopper.
//
// L'arène de ferraille de Junkertown, en plein midi dans l'outback : un ciel
// blanc de chaleur, la terre rouge, les mesas au loin. Le terrain est un
// plancher de tôles d'acier rivetées, rouillées, tachées d'huile, lignes à la
// peinture jaune, bordé de bandes de danger. Au fond, le grand mur de tôle
// ondulée et son enseigne, une grue dont le crochet se balance, une éolienne
// de ferme, des cheminées qui fument. Les cages sont des cadres de poutrelles
// d'acier, plancher de tôle larmée peint turquoise (3) et jaune (5).
//
// Sur les bords : pneus, bidons, épave de voiture, groupe électrogène qui
// crache des étincelles, la moto de Chopper, un tas de ferraille et un feu de
// pneus ; en bas, un grillage surmonté de barbelés.
//
// Pas de règle de jeu : c'est un décor.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, bruit, hacher, lisse, balayerDisque, balayerEllipse, balayerPoly, spriteDe, spriteChiffre, glyphes3x5 } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];
const ANNEAU = 62;
const MUR = 44;                 // haut du grand mur de tôle
const EOLIENNE = { x: 292, y: 20 };
const GRUE = { x: 660, bras: 598, y: 12 };

const PAL = new Palette({
  // Ciel de chaleur, poussière à l'horizon
  k0: '#5e9ed4', k1: '#86b8dc', k2: '#aecde0', k3: '#d4d6c8', k4: '#ecd8b0', k5: '#fff6e0',
  // Terre rouge de l'outback
  e0: '#3a1a10', e1: '#6a2e18', e2: '#96441e', e3: '#bc6030', e4: '#d8844a', e5: '#eeaa6e',
  // Acier
  s0: '#1e1e22', s1: '#36373c', s2: '#505257', s3: '#6c6e72', s4: '#8e9094', s5: '#b6b8ba', s6: '#e2e2e0',
  // Rouille
  r0: '#3a1a0e', r1: '#62301a', r2: '#8e4a24', r3: '#b8683a', r4: '#d8905a',
  // Jaune danger
  y1: '#8a6a10', y2: '#d0a41e', y3: '#f0cc3c', y4: '#fff0a0',
  // Turquoise écaillé
  u1: '#1a4a4e', u2: '#2a7a7e', u3: '#48a8a6', u4: '#8ad0c8',
  // Feu et fumée
  f1: '#8a1e0e', f2: '#d84a14', f3: '#f89a2a', f4: '#ffe07a',
  m1: '#3a3634', m2: '#5e5854', m3: '#8a8480', m4: '#b2aca6',
  // Bois des caisses, rouge des bidons
  b1: '#4a2e18', b2: '#7a5030', b3: '#a8784a',
  o1: '#6a1a14', o2: '#b02c1e', o3: '#dc4a30',
  // Broussailles
  v1: '#4a4a22', v2: '#7a7a36', v3: '#a4a052',
  k: '#141416', w: '#ffffff'
});
const C = PAL.c;
const CIEL = PAL.sous(['k0', 'k1', 'k2', 'k3', 'k4', 'k5']);
const TERRE = PAL.sous(['e0', 'e1', 'e2', 'e3', 'e4', 'e5']);
const ACIER = PAL.sous(['s0', 's1', 's2', 's3', 's4', 's5', 'r1', 'r2', 'r3', 'e2', 'e3']);
const FUMEE = PAL.sous(['m1', 'm2', 'm3', 'm4']);

const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
const dansCage = (x, y) => y >= BUT.haut - 8 && y < BUT.bas + 8 && (x < COURT.left + 2 || x >= COURT.right - 2);

let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
const CHIFFRE = { 3: spriteChiffre(3, C.s6, C.s5, C.s4, C.k), 5: spriteChiffre(5, C.k, C.k, C.k, C.y4) };

// ---------------------------------------------------------------------------
// Le fond : ciel, mesas, grand mur de tôle, enseigne
// ---------------------------------------------------------------------------
function peindreCiel(t) {
  for (let y = 0; y < MUR + 10; y++) for (let x = 0; x < W; x++) {
    const k = y / (MUR + 10);
    let r = 94 + k * 150, g = 158 + k * 70, b = 212 - k * 40;
    // L'éblouissement du soleil de midi, en haut à droite.
    const d = Math.hypot(x - 840, (y + 10) * 1.6), halo = Math.exp(-d * d / (2 * 160 * 160));
    r += 60 * halo; g += 50 * halo; b += 30 * halo;
    t.px[y * W + x] = CIEL.tramer(r, g, b, x, y, 1.8);
  }
  // Mesas rouges au loin.
  for (let x = 0; x < W; x++) {
    const m = Math.max(0, Math.sin(x * .012 + 1) * 10 - 2) + Math.max(0, Math.sin(x * .031 + 4) * 6 - 2);
    const top = Math.round(38 - (m > 4 ? Math.min(m, 9) : m * .5) + fbm(x * .1, 0, 2, 3) * 1.5);
    for (let y = top; y < MUR + 10; y++) {
      const l = 150 + (y - top) * 2 + (y === top ? 20 : 0);
      t.pt(x, y, TERRE.tramer(l, l * .52, l * .35, x, y, 2));
    }
  }
}
// Éolienne de ferme : pylône en treillis ; la roue tourne (voir plus bas).
function eolienne(t) {
  const { x, y } = EOLIENNE;
  for (let yy = y + 6; yy < MUR; yy++) {
    const e = Math.round((yy - y) * .16);
    t.pt(x - e, yy, C.s2); t.pt(x + e + 1, yy, C.s2);
    if ((yy - y) % 6 === 0) t.hl(x - e, x + e + 1, yy, C.s3);
    if ((yy - y) % 6 === 3) { t.pt(x, yy, C.s3); t.pt(x + 1, yy, C.s3); }
  }
  // La queue.
  for (let k = 0; k < 12; k++) t.pt(x + 2 + k, y + 1, C.s3);
  balayerPoly([[x + 11, y - 3], [x + 16, y - 4], [x + 16, y + 5], [x + 11, y + 3]], (yy, a, b) => t.hl(a, b, yy, C.o2));
}
function mur(t) {
  // Grand mur de tôle ondulée, panneaux dépareillés rapiécés.
  let x = 0, p = 0;
  while (x < W) {
    const l = 30 + Math.floor(hacher(p, 1, 20) * 40);
    const haut = MUR + Math.floor(hacher(p, 2, 20) * 6) - 2;
    const sorte = Math.floor(hacher(p, 3, 20) * 4);
    const base = [[C.s2, C.s3, C.s4], [C.r1, C.r2, C.r3], [C.u1, C.u2, C.u3], [C.s1, C.s2, C.s3]][sorte];
    for (let yy = haut; yy < 84; yy++) for (let xx = x; xx < Math.min(W, x + l); xx++) {
      const onde = (xx - x) % 4;
      let c = onde === 0 ? base[0] : onde === 3 ? base[1] : base[2];
      const rouille = fbm(xx * .06, yy * .08, 2, 21 + p) > .62;
      if (rouille && sorte !== 1) c = onde === 0 ? C.r1 : C.r2;
      if (yy === haut) c = C.s5;
      if (xx === x) c = C.s0;
      if ((yy - haut) % 14 === 7 && (xx - x) % 8 === 2) c = C.s5;           // rivets
      t.pt(xx, yy, c);
    }
    x += l; p++;
  }
  // Le pied du mur, poussiéreux, et une bande de danger.
  for (let x2 = 0; x2 < W; x2++) for (let y = 76; y < 84; y++) {
    if (y < 78) t.teinte(x2, y, PAL, C.e3, .5);
    else t.pt(x2, y, ((x2 + y) >> 2) & 1 ? C.k : C.y3);
  }
}
// L'enseigne, en grandes lettres de tôle jaune boulonnées sur une plaque.
function enseigne(t) {
  const texte = 'JUNKERTOWN', ech = 2;
  let larg = 0;
  glyphes3x5(texte, () => {}, false);
  larg = glyphes3x5(texte, () => {}) * ech;
  const x0 = Math.round(CX - larg / 2), y0 = 50;
  for (let y = y0 - 5; y < y0 + 15; y++) for (let x = x0 - 8; x < x0 + larg + 8; x++) {
    const bord = y === y0 - 5 || y === y0 + 14 || x === x0 - 8 || x === x0 + larg + 7;
    t.pt(x, y, bord ? C.s0 : (x + y) % 9 === 0 ? C.r2 : C.s1);
  }
  for (const [bx, by] of [[x0 - 6, y0 - 3], [x0 + larg + 5, y0 - 3], [x0 - 6, y0 + 12], [x0 + larg + 5, y0 + 12]]) t.pt(bx, by, C.s5);
  glyphes3x5(texte, (gx, gy) => {
    // Chaque lettre un peu de travers, comme soudée à la main.
    const lettre = Math.floor(gx / 4), dy = Math.round(Math.sin(lettre * 2.3) * 1.2);
    for (let a = 0; a < ech; a++) for (let b = 0; b < ech; b++) {
      const x = x0 + gx * ech + a, y = y0 + gy * ech + b + dy;
      t.pt(x, y, gy === 0 && b === 0 ? C.y4 : gy === 4 && b === 1 ? C.y1 : C.y3);
      t.pt(x + 1, y + 1 + (b === 1 ? 0 : 0), t.lire(x + 1, y + 1) === C.s1 ? C.s0 : t.lire(x + 1, y + 1));
    }
  }, MIROIR);
}
function grue(t) {
  const { x, bras, y } = GRUE;
  // Mât en treillis posé sur le mur, flèche horizontale vers la gauche.
  for (let yy = y; yy < MUR + 2; yy++) {
    t.pt(x, yy, C.y2); t.pt(x + 5, yy, C.y2);
    if ((yy - y) % 5 === 0) t.hl(x, x + 5, yy, C.y1);
    else t.pt(x + ((yy - y) % 5), yy, C.y1);
  }
  for (let xx = bras; xx <= x + 18; xx++) {
    t.pt(xx, y, C.y3); t.pt(xx, y + 4, C.y2);
    if ((xx - bras) % 5 === 0) t.vl(xx, y, y + 4, C.y1);
    else if ((xx - bras) % 5 === 2) t.pt(xx, y + 2, C.y1);
  }
  t.rect(x + 10, y - 3, 8, 6, C.s2); t.hl(x + 10, x + 17, y - 3, C.s4);        // contrepoids
  t.rect(x - 2, y + 5, 10, 7, C.y2); t.rect(x - 1, y + 6, 4, 3, C.k2 || C.s0); // cabine
}
function cheminees(t) {
  for (const [x, h] of [[420, 18], [556, 22], [118, 16]]) {
    for (let y = MUR - h; y < MUR + 2; y++) for (let k = 0; k < 6; k++) t.pt(x + k, y, k === 0 ? C.s1 : k < 3 ? C.r3 : C.r2);
    t.hl(x - 1, x + 6, MUR - h, C.s0);
  }
}

// ---------------------------------------------------------------------------
// Le plancher de tôles rivetées
// ---------------------------------------------------------------------------
const PL = { l: 82, h: 68 };
function couleurTole(x, y) {
  const i = Math.floor((x - COURT.left) / PL.l), j = Math.floor((y - COURT.top) / PL.h);
  const ton = (hacher(i, j, 30) - .5) * 14;
  const n = fbm(x * .02, y * .025, 3, 31);
  let r = 116 + ton + (n - .5) * 16, g = 112 + ton + (n - .5) * 14, b = 104 + ton + (n - .5) * 10;
  // Rouille par plaques, poussière rouge vers les bords.
  const rouille = lisse(.6, .78, fbm(x * .02 + i * 7, y * .025 + j * 3, 3, 32));
  r += (150 - r) * rouille * .45; g += (92 - g) * rouille * .45; b += (58 - b) * rouille * .45;
  const bord = Math.min(x - COURT.left, COURT.right - x, y - COURT.top, COURT.bottom - y);
  const pous = lisse(40, 0, bord) * .45;
  r += (190 - r) * pous; g += (110 - g) * pous; b += (70 - b) * pous;
  return [r, g, b];
}
function peindrePlancher(t) {
  for (let y = COURT.top; y < COURT.bottom; y++) for (let x = COURT.left; x < COURT.right; x++) {
    const [r, g, b] = couleurTole(x, y);
    let c = ACIER.tramer(r, g, b, x, y, 3);
    const dx = (x - COURT.left) % PL.l, dy = (y - COURT.top) % PL.h;
    if (dx === 0 || dy === 0) c = C.s1;
    else if (dx === 1 || dy === 1) c = C.s4;
    // Rivets aux coins et le long des joints.
    if ((dx === 4 || dx === PL.l - 4) && (dy - 4) % 16 === 0) c = C.s5;
    if ((dy === 4 || dy === PL.h - 4) && (dx - 4) % 16 === 0) c = C.s5;
    t.px[y * W + x] = c;
  }
  // Taches d'huile, rayures.
  for (let i = 0; i < 9; i++) {
    const cx = COURT.left + 40 + hacher(i, 1, 33) * (COURT.right - COURT.left - 80), cy = COURT.top + 30 + hacher(i, 2, 33) * (COURT.bottom - COURT.top - 60);
    const rx = 6 + hacher(i, 3, 33) * 14, ry = rx * .6;
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fbm(x * .2, y * .2, 2, 34 + i) - .5) * .8;
      if (e < 1) t.teinte(x, y, PAL, C.s0, e < .5 ? .55 : .35);
      if (e < .25 && hacher(x, y, 35) < .06) t.pt(x, y, C.u3);              // reflet irisé
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = COURT.left + hacher(i, 1, 36) * 820, y = COURT.top + hacher(i, 2, 36) * 476, a = hacher(i, 3, 36) * Math.PI, L = 6 + hacher(i, 4, 36) * 18;
    t.ligne(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 0, (c, xx, yy) => PAL.teinter(c, C.s5, .35, xx, yy));
  }
}
// Peinture jaune, usée : des trous où la tôle réapparaît.
function peinture(t, x, y) {
  x = Math.round(x); y = Math.round(y);
  const u = fbm(x * .12, y * .12, 2, 40);
  if (u < .3) return;
  t.pt(x, y, u < .38 ? C.y2 : C.y3);
}
function peindreLignes(t) {
  const { left: L, right: R, top: T, bottom: B } = COURT;
  for (let x = L; x < R; x++) for (let k = 0; k < 3; k++) { peinture(t, x, T + k); peinture(t, x, B - 1 - k); }
  for (let y = T; y < B; y++) for (let k = 0; k < 3; k++) {
    if (y < BUT.haut || y >= BUT.bas) { peinture(t, L + k, y); peinture(t, R - 1 - k, y); }
    if (Math.abs(y - CY) > ANNEAU) peinture(t, CX - 1 + k, y);
  }
  for (let a = 0; a < Math.PI * 2; a += .004) for (let k = -1; k <= 1; k++) peinture(t, CX + Math.cos(a) * (ANNEAU + k), CY + Math.sin(a) * (ANNEAU + k));
  // Au centre, au pochoir : le crâne couronné de la reine de Junkertown.
  balayerEllipse(CX, CY - 2, 17, 15, (y, a, b) => { for (let x = a; x <= b; x++) peinture(t, x, y); });
  for (let y = CY + 10; y < CY + 22; y++) for (let x = CX - 10; x <= CX + 10; x++) peinture(t, x, y);
  for (const e of [-1, 1]) balayerEllipse(CX + e * 7, CY, 5, 5, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.s1); });
  balayerPoly([[CX, CY + 5], [CX - 3, CY + 10], [CX + 3, CY + 10]], (y, a, b) => t.hl(a, b, y, C.s1));
  for (let x = CX - 8; x <= CX + 8; x += 4) t.vl(x, CY + 15, CY + 21, C.s1);
  t.hl(CX - 9, CX + 9, CY + 15, C.s1);
  // La couronne : cinq pointes dentelées.
  for (let k = 0; k < 5; k++) {
    const px = CX - 16 + k * 8, h = k === 2 ? 14 : k % 2 ? 10 : 8;
    balayerPoly([[px - 4, CY - 16], [px + 4, CY - 16], [px, CY - 16 - h]], (y, a, b) => { for (let x = a; x <= b; x++) peinture(t, x, y); });
  }
  for (let y = CY - 20; y < CY - 14; y++) for (let x = CX - 19; x <= CX + 19; x++) peinture(t, x, y);
  for (let x = CX - 16; x <= CX + 16; x += 8) t.pt(x, CY - 17, C.o2);
}
// La bordure : bandes de danger jaunes et noires autour du terrain.
function peindreBordure(t) {
  const bande = (x, y) => t.pt(x, y, ((x + y) >> 2) & 1 ? C.k : C.y3);
  for (let x = COURT.left - 6; x < COURT.right + 6; x++) for (let k = 1; k <= 5; k++) { bande(x, COURT.bottom + k - 1); }
  for (let y = COURT.top; y < COURT.bottom + 5; y++) for (let k = 1; k <= 5; k++) {
    if (y >= BUT.haut - 6 && y < BUT.bas + 6) continue;
    bande(COURT.left - k, y); bande(COURT.right + k - 1, y);
  }
}

// ---------------------------------------------------------------------------
// Les cages : cadre de poutrelles, plancher de tôle larmée peint.
// ---------------------------------------------------------------------------
function larmee(x, y) { return ((x + (y >> 2) * 2) % 6 === 0 && (y & 3) === 0) || ((x + (y >> 2) * 2 + 3) % 6 === 0 && (y & 3) === 2); }
function poutrelleH(t, xa, xb, y0) {
  const R = [C.s5, C.s4, C.s2, C.s3, C.s1, C.s0];
  for (let x = xa; x <= xb; x++) for (let k = 0; k < 6; k++) t.pt(x, y0 + k, R[k]);
  for (let x = xa; x <= xb; x += 7) t.pt(x, y0 + 1, C.s6);
  for (let x = xa - 1; x <= xb + 2; x++) t.teinte(x, y0 + 6, PAL, C.s0, .45);
}
function poutrelleV(t, x0, ya, yb) {
  const R = [C.s0, C.s3, C.s5, C.s4, C.s2, C.s1];
  for (let y = ya; y <= yb; y++) for (let k = 0; k < 6; k++) t.pt(x0 + k, y, R[k]);
}
function peindreCage(t, cote) {
  const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, x1 = x0 + BUT.prof - 1;
  for (let y = BUT.haut; y < BUT.bas; y++) {
    const z = ZONES.find(zz => y < CY + zz.to);
    for (let x = x0; x <= x1; x++) {
      const use = fbm(x * .1, y * .1, 2, 50 + cote) < .3;
      let c = z.points === 5 ? (use ? C.s3 : C.y2) : (use ? C.s3 : C.u2);
      if (larmee(x, y)) c = z.points === 5 ? (use ? C.s5 : C.y4) : (use ? C.s5 : C.u4);
      else if (larmee(x - 1, y - 1)) c = z.points === 5 ? (use ? C.s1 : C.y1) : (use ? C.s1 : C.u1);
      t.pt(x, y, c);
    }
  }
  for (const yz of [CY - 26, CY + 26]) { t.hl(x0, x1, yz - 1, C.s4); t.hl(x0, x1, yz, C.s0); t.hl(x0, x1, yz + 1, C.s2); }
  for (const z of ZONES) {
    const s = CHIFFRE[z.points];
    t.sprite(s, Math.round(x0 + BUT.prof / 2 - s.l / 2), Math.round(CY + (z.from + z.to) / 2 - s.h / 2), MIROIR);
  }
  const dos = cote === 1 ? x0 - 6 : x1 + 1;
  poutrelleV(t, dos, BUT.haut - 6, BUT.bas + 5);
  poutrelleH(t, Math.min(x0, dos), Math.max(x1, dos + 5), BUT.haut - 6);
  poutrelleH(t, Math.min(x0, dos), Math.max(x1, dos + 5), BUT.bas);
  // Montants de l'embouchure, rayés jaune et noir.
  const mx = cote === 1 ? x1 - 2 : x0 - 3;
  for (const y0 of [BUT.haut - 10, BUT.bas]) for (let y = y0; y < y0 + 10; y++) for (let k = 0; k < 6; k++) t.pt(mx + k, y, ((y + k) >> 1) & 1 ? C.k : C.y3);
}

// ---------------------------------------------------------------------------
// Les bords
// ---------------------------------------------------------------------------
function ombre(t, cx, cy, rx, ry, k) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) t.teinte(x, y, PAL, C.e0, k * (1 - (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) * .5)); });
}
function pneu(t, cx, cy, rx, ry) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) {
    const e = Math.hypot((x - cx) / rx, (y - cy) / ry);
    let c = e > .9 ? C.k : e > .5 ? ((Math.atan2(y - cy, x - cx) * 5 | 0) & 1 ? C.s1 : C.s0) : e > .42 ? C.s1 : C.e1;
    if (e > .5 && e < .9 && y < cy && x < cx) c = C.s2;
    t.pt(x, y, c);
  } });
}
function bidon(t, x, yb, rouge) {
  ombre(t, x + 7, yb + 1, 9, 2.5, .5);
  for (let y = yb - 20; y <= yb; y++) for (let k = 0; k < 14; k++) {
    const u = k / 13;
    let c = rouge ? (u < .25 ? C.o3 : u < .7 ? C.o2 : C.o1) : (u < .25 ? C.s4 : u < .7 ? C.s3 : C.s2);
    if ((y - yb + 20) % 7 === 0) c = rouge ? C.o1 : C.s1;
    if (fbm((x + k) * .3, y * .3, 2, 60) > .66) c = C.r2;
    t.pt(x + k, y, c);
  }
  for (let k = 1; k < 13; k++) t.pt(x + k, yb - 21, k < 6 ? C.s5 : C.s3);
  if (rouge) for (let y = yb - 14; y < yb - 8; y++) for (let k = 3; k < 11; k++) t.pt(x + k, y, ((k + y) >> 1) & 1 ? C.k : C.y3);
}
function epave(t, x0, y0) {
  // Une voiture rouillée vue de trois quarts, sans roues, calée sur des parpaings.
  ombre(t, x0 + 32, y0 + 30, 34, 4, .55);
  for (const bx of [x0 + 8, x0 + 50]) t.rect(bx, y0 + 24, 8, 6, C.s3);
  balayerPoly([[x0, y0 + 12], [x0 + 12, y0 + 10], [x0 + 20, y0], [x0 + 46, y0], [x0 + 54, y0 + 10], [x0 + 66, y0 + 12], [x0 + 66, y0 + 25], [x0, y0 + 25]], (y, a, b) => {
    for (let x = a; x <= b; x++) {
      let c = y < y0 + 10 ? C.u2 : y < y0 + 13 ? C.u3 : C.u1;
      if (fbm(x * .12, y * .12, 2, 61) > .5) c = y < y0 + 13 ? C.r3 : C.r2;
      if (y === y0 + 25) c = C.s0;
      t.pt(x, y, c);
    }
  });
  for (const [a, b] of [[x0 + 22, x0 + 32], [x0 + 35, x0 + 44]]) for (let y = y0 + 2; y < y0 + 9; y++) for (let x = a; x <= b; x++) t.pt(x, y, y === y0 + 2 ? C.s1 : C.s0);
  t.hl(x0 + 2, x0 + 64, y0 + 18, C.s0);
  for (const wx of [x0 + 12, x0 + 54]) balayerDisque(wx, y0 + 25, 5, (y, a, b) => { for (let x = a; x <= b; x++) if (y <= y0 + 25) t.pt(x, y, C.s0); });
}
function moto(t, x0, yb) {
  // La moto de Chopper : gros pneus, pots d'échappement, guidon relevé.
  ombre(t, x0 + 30, yb + 1, 32, 3, .55);
  for (const wx of [x0 + 10, x0 + 52]) {
    balayerDisque(wx, yb - 10, 10, (y, a, b) => { for (let x = a; x <= b; x++) {
      const d = Math.hypot(x - wx, y - yb + 10);
      t.pt(x, y, d > 8.5 ? C.k : d > 6 ? ((Math.atan2(y - yb + 10, x - wx) * 4 | 0) & 1 ? C.s1 : C.s0) : d > 3 ? C.s3 : C.s5);
    } });
  }
  balayerPoly([[x0 + 10, yb - 12], [x0 + 22, yb - 22], [x0 + 44, yb - 24], [x0 + 52, yb - 12], [x0 + 38, yb - 10]], (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, y < yb - 20 ? C.o3 : y < yb - 16 ? C.o2 : C.s1); });
  t.rect(x0 + 22, yb - 27, 16, 4, C.k); t.hl(x0 + 22, x0 + 37, yb - 27, C.s2);           // selle
  t.rect(x0 + 28, yb - 16, 12, 6, C.s3); t.hl(x0 + 28, x0 + 39, yb - 16, C.s5);          // moteur
  for (let k = 0; k < 3; k++) t.hl(x0 + 4, x0 + 30, yb - 6 + k * 2, k === 0 ? C.s5 : C.s4);   // échappements
  t.ligne(x0 + 50, yb - 12, x0 + 48, yb - 34, C.s4); t.ligne(x0 + 48, yb - 34, x0 + 42, yb - 38, C.s4); // fourche, guidon
  t.hl(x0 + 50, x0 + 56, yb - 30, C.y3);                                                  // phare
}
function ferraille(t, cx, yb) {
  ombre(t, cx, yb + 1, 34, 5, .55);
  // Un tas dense : des pièces de 3×2 px serrées dans un monticule, plus
  // sombres vers le bas, arête claire en haut.
  const rx = 30, ry = 22;
  for (let y = yb - ry - 2; y <= yb; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
    const u = (x - cx) / rx, h = ry * (1 - u * u) * (.85 + fbm(x * .15, 0, 2, 69) * .3);
    if (Math.abs(u) > 1 || yb - y > h) continue;
    const cel = hacher(Math.floor(x / 3), Math.floor(y / 2), 62);
    let c = [C.s2, C.s3, C.s4, C.r2, C.r3, C.u2, C.s3, C.r1][Math.floor(cel * 8)];
    const prof = (yb - y) / Math.max(1, h);
    if (prof < .25 && cel < .5) c = C.s1;
    if (yb - y > h - 1.2) c = cel < .5 ? C.s5 : C.s4;
    if (x % 3 === 0 && hacher(x, y, 63) < .3) c = C.s0;
    t.pt(x, y, c);
  }
  // Quelques pièces qui dépassent : un tuyau, une tôle, une jante.
  t.ligne(cx - 20, yb - 14, cx - 32, yb - 24, C.s4); t.ligne(cx - 20, yb - 13, cx - 32, yb - 23, C.s2);
  for (let y = yb - 20; y < yb - 12; y++) for (let x = cx + 8; x < cx + 20; x++) t.pt(x, y, (x - cx) % 3 === 0 ? C.u1 : C.u3);
  balayerDisque(cx + 18, yb - 6, 5, (y, a, b) => { for (let x = a; x <= b; x++) { const d = Math.hypot(x - cx - 18, y - yb + 6); t.pt(x, y, d > 4 ? C.s0 : d > 2 ? C.s4 : C.s1); } });
  // Un engrenage en haut du tas.
  balayerDisque(cx - 4, yb - 26, 6, (y, a, b) => { for (let x = a; x <= b; x++) {
    const d = Math.hypot(x - cx + 4, y - yb + 26), ang = Math.atan2(y - yb + 26, x - cx + 4);
    if (d > 4.6 && Math.sin(ang * 8) < 0) return;
    t.pt(x, y, d < 2 ? C.s0 : x < cx - 4 ? C.s5 : C.s3);
  } });
}
// Caisses de bois empilées, marquées au pochoir.
function caisses(t, x0, y0) {
  ombre(t, x0 + 30, y0 + 36, 32, 4, .5);
  for (const [dx, dy, l] of [[0, 14, 24], [26, 14, 24], [12, -8, 24]]) {
    const x1 = x0 + dx, y1 = y0 + dy;
    for (let y = y1; y < y1 + 22; y++) for (let x = x1; x < x1 + l; x++) {
      let c = (y - y1) % 7 === 6 ? C.b1 : x === x1 || x === x1 + l - 1 || y === y1 || y === y1 + 21 ? C.b1 : (x + y) % 11 === 0 ? C.b2 : C.b3;
      if (y === y1 + 1) c = C.b3;
      t.pt(x, y, c);
    }
    t.ligne(x1 + 1, y1 + 1, x1 + l - 2, y1 + 20, C.b2);
    for (let k = 0; k < 3; k++) t.pt(x1 + l / 2 - 1 + k, y1 + 10, C.k);
  }
}
function groupe(t, x0, y0) {
  ombre(t, x0 + 16, y0 + 22, 18, 3, .5);
  for (let y = y0; y < y0 + 22; y++) for (let x = x0; x < x0 + 32; x++) {
    let c = y === y0 ? C.y4 : x === x0 ? C.y1 : (y - y0) % 5 === 0 && x > x0 + 16 ? C.y1 : C.y2;
    if (fbm(x * .2, y * .2, 2, 63) > .65) c = C.r2;
    t.pt(x, y, c);
  }
  t.rect(x0 + 3, y0 + 4, 10, 8, C.s1); t.rect(x0 + 5, y0 + 6, 6, 4, C.s3);
  for (let k = 0; k < 12; k++) t.pt(x0 + 32 + k, y0 + 18 + Math.round(Math.sin(k * .6) * 2), C.k);   // câble
}
const TOUFFES = [];
function peindreBords(t) {
  // La terre rouge autour du terrain, sèche, craquelée par endroits.
  for (let y = 78; y < H; y++) for (let x = 0; x < W; x++) {
    if (dansTerrain(x, y)) continue;
    const n = fbm(x * .03, y * .04, 3, 64);
    const l = 190 + (n - .5) * 40;
    let c = TERRE.tramer(l, l * .56, l * .36, x, y, 2);
    if (hacher(x, y, 65) < .02) c = C.e5; else if (hacher(x, y, 66) < .02) c = C.e2;
    if (y >= 78) t.px[y * W + x] = c;
  }
  // Boulons et bouts de ferraille semés dans la terre.
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hacher(i, 1, 67) * W), y = 90 + Math.floor(hacher(i, 2, 67) * 470);
    if (dansTerrain(x - 8, y) || dansTerrain(x + 8, y) || dansCage(x, y)) continue;
    t.pt(x, y, C.s4); t.pt(x + 1, y, C.s2); if (i % 3 === 0) t.hl(x - 2, x + 2, y + 1, C.r2);
  }
  // À gauche : pneus empilés, bidons, épave, groupe électrogène.
  caisses(t, 4, 124);
  ombre(t, 24, 176, 22, 4, .5);
  for (let k = 0; k < 5; k++) pneu(t, 24, 172 - k * 9, 19, 8);
  bidon(t, 46, 208, true); bidon(t, 30, 213, false);
  pneu(t, 12, 206, 10, 5);
  caisses(t, 6, 452);
  epave(t, 1, 486);
  groupe(t, 20, 528);
  // À droite : la moto de Chopper, un tas de ferraille, un feu de pneus.
  ferraille(t, 930, 124);
  moto(t, 894, 172);
  bidon(t, 902, 210, true); bidon(t, 922, 212, false);
  ferraille(t, 928, 500);
  bidon(t, 940, 460, true);
  pneu(t, 922, 546, 18, 7); pneu(t, 924, 540, 15, 6);
  // Derrière le grillage : pneus et carcasses.
  for (const [x, y] of [[90, 590], [340, 594], [560, 588], [700, 596], [840, 590]]) pneu(t, x, y, 12, 5);
  // Broussailles sèches.
  for (const [x, y] of [[60, 100], [8, 230], [60, 440], [900, 96], [952, 230], [890, 432], [956, 560], [4, 560], [200, 572], [760, 574]]) TOUFFES.push({ x, y, ph: hacher(x, y, 68) * 6 });
}

function peindreFond() {
  const t = new Toile(W, H);
  peindreCiel(t);
  eolienne(t);
  cheminees(t);
  mur(t);
  grue(t);
  enseigne(t);
  peindreBords(t);
  peindrePlancher(t);
  peindreLignes(t);
  peindreBordure(t);
  peindreCage(t, 1);
  peindreCage(t, 2);
  FOND = t;
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
function roue(t, temps) {
  const { x, y } = EOLIENNE;
  const a0 = temps * 1.4;
  for (let i = 0; i < 12; i++) {
    const a = a0 + i / 12 * Math.PI * 2;
    for (let r = 2; r <= 11; r++) t.pt(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), r > 7 ? C.s5 : C.s4);
  }
  t.pt(x, y, C.s0); t.pt(x + 1, y, C.s1);
}
function crochet(t, temps) {
  const a = Math.sin(temps * .9) * .18, px = GRUE.bras + 6, py = GRUE.y + 5, L = 30;
  const hx = px + Math.sin(a) * L, hy = py + Math.cos(a) * L;
  t.ligne(px, py, hx, hy, C.s1);
  const x = Math.round(hx), y = Math.round(hy);
  t.rect(x - 2, y, 5, 3, C.s2); t.hl(x - 2, x + 2, y, C.s4);
  // Le crochet de Chopper.
  for (const [dx, dy] of [[0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [2, 7], [3, 6], [3, 5], [-1, 7]]) t.pt(x + dx, y + dy, C.s4);
  t.pt(x + 3, y + 4, C.s5);
}
function fumees(t, temps) {
  for (const [x0, h] of [[423, 18], [559, 22], [121, 16]]) {
    for (let i = 0; i < 6; i++) {
      const q = (temps * .12 + i / 6) % 1;
      const x = x0 + q * 26 + Math.sin(temps * .6 + i) * 3, y = MUR - h - q * 30;
      const r = 2 + q * 7;
      balayerDisque(Math.round(x), Math.round(y), r, (yy, a, b) => { for (let xx = a; xx <= b; xx++) if (yy >= 0) t.teinte(xx, yy, PAL, q < .4 ? C.m2 : C.m3, .55 * (1 - q)); });
    }
  }
}
function feuPneus(t, temps) {
  const cx = 923, cy = 541;
  for (let y = cy - 36; y < cy + 8; y++) for (let x = cx - 28; x <= cx + 28; x++) {
    const d = Math.hypot(x - cx, (y - cy + 6) * 1.2);
    if (d < 28) t.teinte(x, y, PAL, C.f3, (.28 + Math.sin(temps * 5) * .03) * (1 - d / 28));
  }
  for (let k = 0; k < 9; k++) {
    const fx = cx - 13 + k * 3, fh = Math.round(10 + Math.sin(temps * 2.3 + k * 1.3) * 3 + Math.sin(temps * 3.7 + k) * 1.5 + (k > 2 && k < 6 ? 6 : 0));
    for (let j = 0; j < fh; j++) {
      const u = j / fh, ox = Math.round(Math.sin(temps * 1.9 + k + j * .3) * u * 1.5);
      t.pt(fx + ox, cy - 2 - j, u < .25 ? C.f4 : u < .55 ? C.f3 : u < .85 ? C.f2 : C.f1);
      if (u < .5) t.pt(fx + ox + 1, cy - 2 - j, C.f3);
    }
  }
  for (let i = 0; i < 4; i++) {
    const q = (temps * .25 + i / 4) % 1;
    balayerDisque(Math.round(cx + Math.sin(temps * .5 + i) * 3 - q * 8), Math.round(cy - 14 - q * 34), 2 + q * 6, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.teinte(xx, yy, PAL, C.m1, .5 * (1 - q)); });
  }
}
function etincelles(t, temps) {
  const n = Math.floor(temps * 1.3), ph = temps * 1.3 - n;
  if (ph > .35) return;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (hacher(n, i, 70) - .5) * 2.2, v = 8 + hacher(n, i, 71) * 14;
    const x = 30 + Math.cos(a) * v * ph * 3, y = 522 + Math.sin(a) * v * ph * 3 + ph * ph * 30;
    t.pt(Math.round(x), Math.round(y), ph < .15 ? C.y4 : C.f3);
  }
}
function voyants(t, temps) {
  // Gyrophares orange au sommet du mur, qui tournent chacun à leur rythme.
  for (const [x, ph] of [[180, 0], [380, 1.3], [590, 2.2], [760, .7]]) {
    const on = Math.sin(temps * 3 + ph) > .3;
    t.rect(x, MUR - 4, 3, 3, on ? C.f4 : C.f1);
    if (on) for (let dy = -5; dy <= 4; dy++) for (let dx = -5; dx <= 7; dx++) {
      const d = Math.hypot(dx - 1, dy + 3);
      if (d < 6 && d > 1.5) t.teinte(x + dx, MUR - 4 + dy, PAL, C.f3, .4 * (1 - d / 6));
    }
  }
}
function touffes(t, temps) {
  for (const tf of TOUFFES) for (let b = 0; b < 5; b++) {
    const bx = tf.x + b - 2, h = 3 + ((b * 5 + tf.x) % 4);
    const dx = Math.round(Math.sin(temps * .9 + tf.ph + b * .5) * h / 6) + (b - 2) * .5;
    for (let k = 0; k < h; k++) { const u = k / h; t.pt(Math.round(bx + dx * u), tf.y - k, u > .6 ? C.v3 : u > .3 ? C.v2 : C.v1); }
  }
}
// Le grillage du bas, avec ses barbelés, par-dessus la terre.
function grillage(t) {
  const y0 = 568, y1 = H - 1;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) {
    const a = (x + y) % 8 === 0, b = (x - y + 800) % 8 === 0;
    if (a || b) t.px[y * W + x] = PAL.teinter(t.px[y * W + x], C.s5, .6, x, y);
  }
  for (let x = 20; x < W; x += 110) for (let y = y0 - 6; y <= y1; y++) { t.pt(x, y, C.s2); t.pt(x + 1, y, C.s4); t.pt(x + 2, y, C.s1); }
  for (let x = 0; x < W; x++) {
    t.pt(x, y0, C.s3);
    const y = y0 - 4 + Math.round(Math.sin(x * .5) * 2);
    t.pt(x, y, C.s4);
    if (x % 6 === 0) { t.pt(x, y - 1, C.s5); t.pt(x + 1, y + 1, C.s2); }
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
    roue(t, temps);
    fumees(t, temps);
    crochet(t, temps);
    voyants(t, temps);
    feuPneus(t, temps);
    etincelles(t, temps);
    touffes(t, temps);
    grillage(t);
    for (const cote of [1, 2]) {
      const fl = cote === 1 ? butG : butD;
      if (fl <= .02) continue;
      const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x < x0 + BUT.prof; x++) t.teinte(x, y, PAL, C.y4, fl * .55);
    }
    t.peindre(g);
    return cible;
  }
  return { image };
}
