// ---------------------------------------------------------------------------
// LE TEMPLE DE LA FRICADELLE EN PIXEL ART HD.
//
// Même technique que la Station orbitale retenue, et la recette choisie sur
// mockups/temple-fricadelle.html : la gloire irradiante, la fricadelle d'or
// dressée, les braseros et leurs gardes, les bouches de four, le damier,
// l'escalier de la crypte. Et le modèle de lumière de render/terrains/
// temple.js : l'or de l'idole en haut, la lueur de la crypte en bas, le milieu
// du terrain le plus sombre, jamais de noir neutre — l'ombre d'une nef de
// brique est brun-rouge — et des feux qui n'éclairent que leur mètre carré.
//
// Pas de règle de jeu : c'est un décor. Cages de 200, volets 3/5/3 rose et or.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, hacher, lisse, balayerDisque, balayerPoly, spriteDe, spriteChiffre } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

const GH = 100, GOAL_D = 48, BANDE = COURT.top, SEUIL = COURT.bottom, SOL_IDOLE = BANDE - 7;
export const BUT = { haut: CY - GH, bas: CY + GH, prof: GOAL_D };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];
const NICHE = 196, BAIE = 240;
const POCHES = [{ y0: COURT.top + 4, y1: CY - GH - 10 }, { y0: CY + GH + 10, y1: COURT.bottom - 2 }];

const PAL = new Palette({
  // Ombres chaudes, brique, pierre, marbre, ardoise
  n0: '#0c0708', n1: '#140d0e', n2: '#1e1312',
  k0: '#2a1816', k1: '#3a2420', k2: '#54352d', k3: '#6d4a40', k4: '#845a4c', k5: '#9a6a58',
  q0: '#2a2420', q1: '#3a332e', q2: '#544a42', q3: '#6e6259', q4: '#87786c', q5: '#9f8f80', q6: '#b8aea0',
  m0: '#1c1718', m1: '#2a2426', m2: '#383033', m3: '#4a4040', a1: '#1e2228', a2: '#2a2f35',
  // Or, bronze
  o0: '#3a2208', o1: '#6d3f12', o2: '#a86a24', o3: '#e8a94a', o4: '#f7d488', o5: '#fff0c8',
  z1: '#5a3a1a', z2: '#7a4f26', z3: '#b8823f',
  // Feu
  f1: '#6a1a06', f2: '#c2410c', f3: '#ff9a2e', f4: '#ffd070', f5: '#fff4c0',
  // Gardes : armure blanche, combinaison noire, yeux roses
  w1: '#9aa0ac', w2: '#d0d4dc', w3: '#f2f4f8', c1: '#0f1014', c2: '#1b1d24', c3: '#2c2f3a',
  p1: '#7a2a5a', p2: '#c24f9a', p3: '#ff7fd0', p4: '#ffe4f4',
  b1: '#4a3526', i1: '#5d575b', i2: '#c8ccd4',
  e1: '#8a8078', e2: '#d8ccc0'
});
const C = PAL.c;
const DALLE = PAL.sous(['n1', 'n2', 'm0', 'm1', 'm2', 'm3', 'q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6']);
const BRIQUE = PAL.sous(['n0', 'n1', 'n2', 'k0', 'k1', 'k2', 'k3', 'k4', 'o1']);

// La lumière de la nef : la gloire de l'idole en haut (en éventail), la
// crypte en bas, la pénombre au milieu et sur les bords.
function lumiere(x, y) {
  const ox = CX, oy = SOL_IDOLE - 30;
  const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy), a = Math.atan2(dx, dy);
  let l = 0;
  // Nappe dorée radiale, écrasée.
  l += 20 * Math.exp(-((dx / 2.2) ** 2 + dy * dy) / (2 * 120 * 120));
  // Six rayons de gloire qui descendent sur le dallage.
  for (let k = -3; k <= 3; k++) {
    if (!k) continue;
    const ang = -k * .28;
    const ecart = Math.abs(a - ang) * d;
    const larg = 6 + d * .085;
    if (ecart < larg) l += 9 * (1 - ecart / larg) * Math.max(0, 1 - d / 300);
  }
  // La crypte, en bas.
  const cx = (x - CX) / 1.7, cy = y - H;
  l += 30 * Math.exp(-(cx * cx + cy * cy) / (2 * 80 * 80));
  // Pénombre : le milieu et les bords s'éteignent.
  const vx = (x - CX) / 480, vy = (y - CY) / 300;
  l -= 22 * Math.min(1, vx * vx + vy * vy);
  return l;
}

function silhouette(l, h, rects, contour) {
  const px = new Uint32Array(l * h);
  for (const [x, y, w, hh, c] of rects) for (let j = y; j < y + hh; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < l && j < h) px[j * l + i] = c;
  const out = px.slice();
  for (let j = 0; j < h; j++) for (let i = 0; i < l; i++) {
    if (px[j * l + i]) continue;
    const v = (a, b) => a >= 0 && b >= 0 && a < l && b < h && px[b * l + a];
    if (v(i - 1, j) || v(i + 1, j) || v(i, j - 1) || v(i, j + 1)) out[j * l + i] = contour;
  }
  return { l, h, px: out };
}
// Le garde, tourné vers la droite : casque blanc à visière noire et yeux
// roses du Susanoo, plastron, ceinture d'or, épaulières en fricadelles,
// hallebarde. Deux temps : il respire.
const GARDE = [0, 1].map(r => silhouette(20, 47, [
  [13, 2, 1, 45, C.b1], [14, 2, 1, 45, C.z2], [12, 0, 3, 3, C.i1], [15, 3, 3, 2, C.i2], [15, 5, 4, 3, C.i2], [15, 8, 2, 2, C.i2],
  [6, 6 + r, 6, 10, C.w3], [6, 6 + r, 1, 10, C.w1], [7, 10 + r, 5, 2, C.c1], [8, 10 + r, 1, 1, C.p3], [10, 10 + r, 1, 1, C.p3],
  [4, 16 + r, 10, 15, C.c2], [5, 17 + r, 8, 7, C.w3], [5, 17 + r, 1, 7, C.w2], [5, 22 + r, 8, 1, C.w1],
  [2, 16 + r, 4, 3, C.o3], [2, 16 + r, 4, 1, C.o4], [12, 16 + r, 4, 3, C.o3], [12, 16 + r, 4, 1, C.o4],
  [12, 21 + r, 2, 2, C.w3], [4, 29 + r, 10, 2, C.o3],
  [5, 31, 3, 11, C.c2], [10, 31, 3, 11, C.c2], [4, 41, 4, 4, C.w3], [10, 41, 4, 4, C.w3]
], C.n0));

const CHIFFRES = { 3: spriteChiffre(3, C.p4, C.p4, C.p3, C.n0), 5: spriteChiffre(5, C.o5, C.o4, C.o3, C.n0) };

// La fricadelle dressée : un cylindre d'or, modelé d'une bande claire au
// tiers, peau grenue, pli de cuisson, bouts plus cuits.
function fricadelle(t, x, yBas, lg, ht, contour) {
  const r = lg / 2;
  for (let y = yBas - ht; y < yBas; y++) for (let xx = Math.round(x - r); xx <= Math.round(x + r); xx++) {
    const u = (xx - (x - r)) / lg;
    // Capsule : bouts arrondis.
    const yh = yBas - ht + r, yb = yBas - r;
    const dyh = y < yh ? yh - y : y > yb ? y - yb : 0;
    if ((xx - x) ** 2 + dyh ** 2 > r * r + r * .6) continue;
    let k = u < .08 ? .1 : u < .22 ? .45 : u < .38 ? .95 : u < .55 ? .7 : u < .8 ? .45 : .2;
    if (dyh > r * .55) k *= .6;
    if (hacher(xx, y, 3) > .88) k -= .25;
    // Le pli de cuisson, une courbe douce du haut en bas.
    const v = (y - (yBas - ht)) / ht, pli = x + lg * (.12 + Math.sin(v * 3.2) * .12);
    if (Math.abs(xx - pli) < 1) k = .15;
    else if (Math.abs(xx - (pli - 1.5)) < .8) k = Math.min(1, k + .25);
    const c = k > .85 ? C.o4 : k > .6 ? C.o3 : k > .38 ? C.o2 : k > .15 ? C.o1 : C.o0;
    t.pt(xx, y, contour ? C.n0 : c);
  }
}

// Le fond fixe existe en deux sens : normal, et miroir pour l'invité en ligne,
// où seules les inscriptions changent (voir ecrire3x5 dans pixelart.js).
let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
function peindreFond() {
  const t = new Toile(W, H);
  const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
  // Damier de marbre, 14 × 8 cases, avec la lumière de la nef.
  const nx = 14, ny = 8, dw = (COURT.right - COURT.left) / nx, dh = (COURT.bottom - COURT.top) / ny;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, l = lumiere(x, y);
    if (dansTerrain(x, y)) {
      const ci = Math.floor((x - COURT.left) / dw), cj = Math.floor((y - COURT.top) / dh);
      const bx = x - COURT.left - Math.round(ci * dw), by = y - COURT.top - Math.round(cj * dh);
      const fx = Math.round((ci + 1) * dw) - Math.round(ci * dw), fy = Math.round((cj + 1) * dh) - Math.round(cj * dh);
      const noir = (ci + cj) % 2, s = ci * 17 + cj * 5;
      let r, g, b;
      if (noir) { r = 44 + hacher(s, 0, 7) * 10; g = 37 + hacher(s, 0, 7) * 8; b = 38 + hacher(s, 0, 7) * 6; }
      else { r = 100 + hacher(s, 1, 7) * 14; g = 88 + hacher(s, 1, 7) * 12; b = 80 + hacher(s, 1, 7) * 10; }
      // Veines : deux courbes lâches par case.
      for (let k = 0; k < 2; k++) {
        const a0 = hacher(s * 3 + k, 2, 7) * fy, a1 = (1 - hacher(s * 3 + k, 2, 7)) * fy;
        const vy = a0 + (a1 - a0) * (bx / fx) + Math.sin(bx * .12 + s + k) * 5;
        if (Math.abs(by - vy) < .7) { const v = noir ? 10 : -10; r += v; g += v; b += v; }
      }
      // La lumière dorée réchauffe le marbre sans le rougir.
      r += l; g += l * .88; b += l * .7;
      let c = DALLE.tramer(r, g, b, x, y, 2);
      if (bx === 0 || by === 0) c = C.n1;
      else if (by === 1) c = PAL.teinter(c, C.q5, noir ? .1 : .25, x, y);
      else if (by === fy - 1) c = PAL.teinter(c, C.n1, .45, x, y);
      t.px[i] = c;
    } else {
      // Murs de brique des bas-côtés, de l'abside et de l'entrée.
      const rang = Math.floor(y / 5), dec = rang % 2 ? 6 : 0;
      const joint = y % 5 === 4 || (x + dec) % 12 === 11;
      const v = joint ? 18 : 64 + (hacher(Math.floor((x + dec) / 12), rang, 9) - .5) * 22;
      t.px[i] = BRIQUE.tramer(v * 1.05 + l * .9, v * .68 + l * .65, v * .56 + l * .35, x, y, 2);
    }
  }
  // Marquage : filets d'or cernés de sombre.
  const filet = (x0, y0, w, h) => {
    t.rect(x0 - 1, y0 - 1, w + 2, h + 2, C.n1);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) t.pt(x, y, (x + y) % 3 ? C.o2 : C.o3);
  };
  filet(COURT.left + 3, COURT.top + 3, COURT.right - COURT.left - 6, 2);
  filet(COURT.left + 3, COURT.bottom - 5, COURT.right - COURT.left - 6, 2);
  filet(CX - 1, COURT.top, 3, COURT.bottom - COURT.top);
  for (let y = CY - 66; y <= CY + 66; y++) for (let x = CX - 66; x <= CX + 66; x++) {
    const d = Math.hypot(x + .5 - CX, y + .5 - CY) - 62;
    if (Math.abs(d) < 2.4) t.pt(x, y, Math.abs(d) < 1.1 ? C.o3 : C.n1);
  }
  // Bordures de pierre le long des touches.
  for (const x of [COURT.left - 5, COURT.right]) for (let y = COURT.top; y < COURT.bottom; y++) for (let k = 0; k < 5; k++)
    t.pt(x + k, y, k === (x < CX ? 4 : 0) ? C.q5 : y % 24 === 0 ? C.q1 : C.q3);

  peindreAbside(t);
  peindreCrypte(t);
  peindreFours(t);
  // Trépieds de bronze des braseros.
  chaquePoche((xb, dir, p) => {
    const x = xb + dir * 24, y = p.y0 + 58;
    for (let k = 0; k <= 30; k++) { t.pt(Math.round(x - k / 3), y + k, C.z2); t.pt(Math.round(x + k / 3), y + k, C.z2); t.pt(x, y + k, k % 6 ? C.z2 : C.z3); }
    for (let k = -13; k <= 13; k++) t.teinte(x + k, y + 32, PAL, C.n0, .5);
    balayerPoly([[x - 15, y - 6], [x + 15, y - 6], [x + 8, y + 5], [x - 8, y + 5]], (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, xx < x - 6 ? C.z3 : C.z2); });
    t.rect(x - 16, y - 8, 33, 3, C.z3); t.hl(x - 16, x + 16, y - 8, C.o3); t.hl(x - 16, x + 16, y - 5, C.n1);
  });
  FOND = t;
}

function chaquePoche(fn) {
  let n = 0;
  for (const cote of [0, 1]) for (const p of POCHES) fn(cote ? W : 0, cote ? -1 : 1, p, n++);
}

function peindreAbside(t) {
  // Voûte d'ardoise, frise de glyphes, pilastres, niche, portes basses.
  for (let y = 0; y < 14; y++) for (let x = 0; x < W; x++) t.pt(x, y, PAL.tramer(16 + y * 1.2, 16 + y * 1.3, 20 + y * 1.6, x, y, 2));
  for (let x = 0; x < W; x++) { t.pt(x, 14, C.q5); for (let y = 15; y < 23; y++) t.pt(x, y, y === 22 ? C.n1 : C.q2); }
  for (let x = 10; x < W; x += 20) {
    t.rect(x - 1, 16, 3, 6, C.n1); t.pt(x, 16, C.q1); t.pt(x + 5, 18, C.n1); t.pt(x - 5, 18, C.n1);
  }
  for (const dx of [-168, 168, -440, 440]) for (let y = 23; y < BANDE - 7; y++) for (let k = -7; k < 7; k++)
    t.pt(CX + dx + k, y, k < -5 ? C.k4 : k > 4 ? C.k0 : (y % 10 === 9 ? C.k1 : C.k2));
  // Portes basses du chœur.
  for (const dx of [-306, 306]) {
    const x0 = CX + dx - 29;
    for (let y = 42; y < BANDE - 6; y++) for (let x = x0; x < x0 + 58; x++) {
      const ddx = x - (x0 + 29), dy = y - 71;
      if (dy < 0 && ddx * ddx + dy * dy * 3 > 29 * 29) continue;
      const bord = Math.abs(ddx) > 25 || (dy < 0 && ddx * ddx + dy * dy * 3 > 25 * 25);
      t.pt(x, y, bord ? C.k4 : C.n0);
    }
  }
  // La niche : noire au pied, un peu plus claire en haut, double rouleau de brique.
  for (let y = 0; y < BANDE - 6; y++) for (let x = CX - NICHE / 2 - 12; x < CX + NICHE / 2 + 12; x++) {
    const dx = x - CX, dy = y - 34;
    const r = dy < 0 ? Math.hypot(dx, dy * 1.2) : Math.abs(dx);
    if (r > NICHE / 2 + 11) continue;
    if (r > NICHE / 2 + 2) t.pt(x, y, r > NICHE / 2 + 9 ? C.n1 : (Math.floor(Math.atan2(dy, dx) * 30) % 2 ? C.k3 : C.k4));
    else t.pt(x, y, PAL.tramer(20 + (1 - y / 80) * 30, 13 + (1 - y / 80) * 18, 13 + (1 - y / 80) * 12, x, y, 2));
  }
  // Gloire : rayons pointus derrière la statue.
  const ox = CX, oy = SOL_IDOLE - 30;
  for (let k = 0; k < 22; k++) {
    const a = Math.PI + k / 21 * Math.PI, L = k % 2 ? 46 : 72;
    balayerPoly([[ox + Math.cos(a - .05) * 12, oy + Math.sin(a - .05) * 12], [ox + Math.cos(a) * L, oy + Math.sin(a) * L], [ox + Math.cos(a + .05) * 12, oy + Math.sin(a + .05) * 12]], (yy, a0, b0) => {
      for (let x = a0; x <= b0; x++) if (yy >= 0) t.teinte(x, yy, PAL, C.o4, k % 2 ? .16 : .28);
    });
  }
  // Le halo reste discret : trop fort, il noyait l'idole dans sa propre lumière.
  for (let y = 0; y < BANDE; y++) for (let x = CX - 70; x < CX + 70; x++) {
    const d = Math.hypot(x - ox, y - oy);
    if (d > 18 && d < 60) t.teinte(x, y, PAL, C.o3, .2 * (1 - (d - 18) / 42));
  }
  // Socle à trois degrés, idole, ruban rose noué d'or.
  for (let k = 0; k < 3; k++) {
    const w = 46 + (2 - k) * 22, y = SOL_IDOLE - (k + 1) * 7;
    for (let j = 0; j < 7; j++) t.hl(Math.round(CX - w / 2), Math.round(CX + w / 2), y + j, j === 0 ? C.q6 : j === 6 ? C.n1 : j < 3 ? C.q4 : C.q3);
  }
  // Un liseré sombre autour de l'idole la découpe sur sa gloire.
  fricadelle(t, CX, SOL_IDOLE - 21, 34, 58, true);
  fricadelle(t, CX, SOL_IDOLE - 21, 30, 56);
  t.rect(CX - 15, SOL_IDOLE - 50, 31, 5, C.p2); t.hl(CX - 15, CX + 15, SOL_IDOLE - 50, C.p3); t.hl(CX - 15, CX + 15, SOL_IDOLE - 46, C.p1);
  balayerDisque(CX + 7, SOL_IDOLE - 48, 3, (y, a, b) => t.hl(a, b, y, C.o4));
  t.rect(CX + 6, SOL_IDOLE - 46, 2, 8, C.o3); t.rect(CX + 9, SOL_IDOLE - 46, 2, 6, C.o2);
  // Torchères de pierre.
  for (const dx of [-66, 66]) {
    for (let y = SOL_IDOLE - 28; y < SOL_IDOLE; y++) for (let k = -5; k < 5; k++) t.pt(CX + dx + k, y, k < -3 ? C.q5 : k > 2 ? C.q1 : C.q3);
    t.rect(CX + dx - 8, SOL_IDOLE - 32, 16, 5, C.z2); t.hl(CX + dx - 8, CX + dx + 7, SOL_IDOLE - 32, C.z3);
  }
  // Bandeau de pierre qui ferme la bande.
  for (let x = 0; x < W; x++) for (let k = 0; k < 7; k++) t.pt(x, BANDE - 7 + k, k === 0 ? C.q5 : k === 6 ? C.n1 : C.q3);
}

function peindreCrypte(t) {
  for (let x = 0; x < W; x++) for (let k = 0; k < 4; k++) t.pt(x, SEUIL + k, k === 0 ? C.q5 : C.q3);
  const x0 = CX - BAIE / 2;
  for (const s of [-1, 1]) {
    const x = CX + s * (BAIE / 2 + 7);
    for (let y = SEUIL; y < H; y++) for (let k = -7; k < 7; k++) t.pt(x + k, y, k < -5 ? C.q5 : k > 4 ? C.q1 : C.q3);
  }
  for (let k = 0; k < 6; k++) {
    const y = SEUIL + 4 + k * 6;
    for (let j = 0; j < 6; j++) for (let x = x0; x < x0 + BAIE; x++) {
      const v = 110 - k * 16;
      let c = PAL.tramer(v * .95, v * .85, v * .75, x, y + j, 2);
      if (j === 0) c = PAL.teinter(c, C.q6, .4, x, y);
      if (j === 5) c = C.n1;
      t.pt(x, y + j, c);
    }
  }
  for (const s of [-1, 1]) {
    const x = CX + s * (BAIE / 2 - 5);
    for (let y = SEUIL + 2; y < H; y++) { t.pt(x - 1, y, C.o2); t.pt(x, y, C.o3); t.pt(x + 1, y, C.o1); }
    for (let y = SEUIL + 6; y < H; y += 8) { t.hl(x - 3, x + 3, y, C.o4); t.hl(x - 3, x + 3, y + 1, C.o3); t.hl(x - 3, x + 3, y + 2, C.o1); }
  }
}

function peindreFours(t) {
  for (const cote of [1, 2]) {
    const s = cote === 1 ? 1 : -1, xb = cote === 1 ? COURT.left : COURT.right;
    const gx = cote === 1 ? COURT.left - GOAL_D : COURT.right;
    const x0 = cote === 1 ? xb - GOAL_D - 14 : xb - 2, x1 = cote === 1 ? xb + 2 : xb + GOAL_D + 14;
    // Maçonnerie de brique du four.
    for (let y = BUT.haut - 12; y < BUT.bas + 12; y++) for (let x = x0; x < x1; x++) {
      const joint = y % 5 === 4 || (x + (Math.floor(y / 5) % 2) * 6) % 12 === 11;
      t.pt(x, y, joint ? C.n1 : hacher(x >> 3, y >> 2, 11) > .6 ? C.k3 : C.k2);
    }
    // Sole de briques de chant, noircies, et suie vers l'ouverture.
    for (let y = BUT.haut; y < BUT.bas; y++) for (let x = gx; x < gx + GOAL_D; x++) {
      const joint = y % 12 === 11 || x % 8 === 7;
      const suie = cote === 1 ? (x - gx) / GOAL_D : 1 - (x - gx) / GOAL_D;
      const v = joint ? 10 : 30 - suie * 18;
      t.pt(x, y, PAL.tramer(v * 1.2, v * .8, v * .7, x, y, 2));
    }
    // Jambages de pierre.
    for (const y0 of [BUT.haut - 12, BUT.bas + 2]) for (let y = y0; y < y0 + 10; y++) for (let x = x0; x < x1; x++)
      t.pt(x, y, y === y0 ? C.q5 : y === y0 + 9 ? C.n1 : C.q3);
    // Séparateurs des volets et rails de couleur au bord du terrain.
    for (const z of ZONES) {
      for (const yy of [CY + z.from, CY + z.to]) t.hl(gx, gx + GOAL_D - 1, yy, C.n0);
      const lx = cote === 1 ? COURT.left - 4 : COURT.right;
      const or = z.points === 5;
      for (let y = CY + z.from + 2; y < CY + z.to - 2; y++) {
        t.pt(lx, y, C.n0); t.pt(lx + 1, y, or ? C.o4 : C.p3); t.pt(lx + 2, y, or ? C.o3 : C.p2); t.pt(lx + 3, y, C.n0);
      }
    }
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

  const flamme = (x, y, temps, s, taille) => {
    const h = Math.round((5 + Math.abs(Math.sin(temps * 9 + s)) * 4) * taille);
    for (let j = 0; j < h; j++) {
      const u = j / h, w = Math.max(0, Math.round((1 - u) * 1.6 * taille));
      const ox = Math.round(Math.sin(temps * 7 + s + j * .4) * u * 1.5);
      for (let k = -w; k <= w; k++) t.pt(x + k + ox, y - j, u < .3 && Math.abs(k) < w ? C.f5 : u < .55 ? C.f4 : u < .8 ? C.f3 : C.f2);
    }
  };
  const lueur = (x, y, r, k) => {
    for (let yy = y - r; yy < y + r; yy++) for (let xx = x - r; xx < x + r; xx++) {
      const d = Math.hypot(xx - x, yy - y);
      if (d < r) t.teinte(xx, yy, PAL, C.f3, k * (1 - d / r) ** 1.4);
    }
  };

  function image(temps, but, extras = {}) {
    fond(!!extras.miroir);
    const butG = extras.butG ?? but, butD = extras.butD ?? but;
    t.copier(FOND);
    // Torchères de l'idole.
    for (const dx of [-66, 66]) {
      lueur(CX + dx, SOL_IDOLE - 36, 30, .3);
      flamme(CX + dx - 2, SOL_IDOLE - 33, temps, dx, 1.2); flamme(CX + dx + 3, SOL_IDOLE - 33, temps, dx + 5, 1);
    }
    // Braseros, escarbilles, gardes.
    chaquePoche((xb, dir, p, n) => {
      const x = xb + dir * 24, y = p.y0 + 58;
      const v = .85 + Math.sin(temps * 5 + n) * .08 + Math.sin(temps * 11.3 + n * 2) * .07;
      lueur(x, y - 10, 70, .3 * v);
      for (let k = 0; k < 6; k++) t.rect(x - 12 + k * 4, y - 9 - Math.round(hacher(n, k, 3) * 3), 4, 3, k % 2 ? C.f2 : C.f1);
      for (let k = 0; k < 5; k++) flamme(x - 10 + k * 5, y - 8 - (k % 2) * 2, temps, n * 9 + k, 1.4 + (k === 2) * .6);
      for (let k = 0; k < 7; k++) {
        const q = (temps * .5 + hacher(n, k, 4)) % 1;
        t.pt(Math.round(x + Math.sin(temps * 2 + k * 3) * 6 + (hacher(n, k, 5) - .5) * 16), Math.round(y - 14 - q * 46), q < .5 ? C.f4 : C.f3);
      }
      const gs = GARDE[Math.floor(temps * .8 + n) & 1];
      t.sprite(gs, xb + dir * 52 - 10, p.y1 - 8 - 46, dir < 0);
    });
    // Braises des fours, qui respirent, et leur lueur vers le terrain.
    for (const cote of [1, 2]) {
      const gx = cote === 1 ? COURT.left - GOAL_D : COURT.right, s = cote === 1 ? 1 : -1;
      const fond = cote === 1 ? gx : gx + GOAL_D - 1;
      for (let i = 0; i < 56; i++) {
        const v = .55 + Math.sin(temps * 2.2 + i * 1.7) * .25 + Math.sin(temps * 5.1 + i) * .2;
        const x = fond + s * Math.round(1 + hacher(i, 1, 21) * hacher(i, 9, 21) * 20), y = BUT.haut + 4 + Math.round(hacher(i, 3, 21) * (GH * 2 - 8));
        const c = v > .8 ? C.f4 : v > .6 ? C.f3 : v > .4 ? C.f2 : C.f1;
        t.rect(Math.min(x, x + s * 2), y, 3, 2, c);
      }
      // La lueur du four et sa pulsation, comme avant ; elle ne déborde plus
      // que de 12 px sur le dallage (40 avant), là où elle brouillait le but.
      const vv = .85 + Math.sin(temps * 2.2) * .1;
      const PORTEE = 12;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = gx - PORTEE; x < gx + GOAL_D + PORTEE; x++) {
        const u = cote === 1 ? (x - gx) / (GOAL_D + PORTEE) : (gx + GOAL_D - 1 - x) / (GOAL_D + PORTEE);
        if (u < 0 || u > 1) continue;
        t.teinte(x, y, PAL, C.f3, .34 * vv * (1 - u) ** 1.3);
      }
      for (let k = 0; k < 12; k++) {
        const q = (temps * .45 + hacher(k, cote, 22)) % 1;
        t.pt(Math.round(fond + s * (8 + q * 54)), Math.round(BUT.haut + 10 + hacher(k, cote, 23) * 180 + Math.sin(temps * 3 + k) * 6), q < .5 ? C.f4 : C.f3);
      }
      for (const z of ZONES) {
        const sp = CHIFFRES[z.points];
        t.sprite(sp, Math.round(gx + GOAL_D / 2 - sp.l / 2), Math.round(CY + (z.from + z.to) / 2 - sp.h / 2), MIROIR);
      }
      const fl = cote === 1 ? butG : butD;
      if (fl > .02) for (let y = BUT.haut; y < BUT.bas; y++) for (let x = gx; x < gx + GOAL_D; x++)
        t.teinte(x, y, PAL, C.f5, fl * .6);
    }
    // L'encens qui monte de la crypte, en fibres lentes.
    for (let k = 0; k < 9; k++) {
      const q = (temps * .06 + hacher(k, 1, 30)) % 1;
      const y = Math.round(H - q * 200), x = Math.round(CX + (hacher(k, 2, 30) - .5) * 180 + Math.sin(temps * .4 + k * 2) * 20 * q);
      const a = Math.sin(q * Math.PI) * .18;
      for (let i = -20; i < 20 + hacher(k, 3, 30) * 20; i++) t.teinte(x + i, y, PAL, C.e2, a);
      for (let i = -10; i < 14; i++) t.teinte(x + i, y + 4, PAL, C.e2, a * .8);
    }
    // La gloire qui bat doucement : ses pointes s'allument tour à tour.
    const bat = Math.floor(temps * 3) % 22;
    for (const k of [bat, (bat + 11) % 22]) {
      const a = Math.PI + k / 21 * Math.PI, L = k % 2 ? 46 : 72;
      t.pt(Math.round(CX + Math.cos(a) * (L - 1)), Math.round(SOL_IDOLE - 30 + Math.sin(a) * (L - 1)), C.o5);
    }

    t.peindre(g);
    return cible;
  }
  return { image };
}
