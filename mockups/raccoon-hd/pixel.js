// ---------------------------------------------------------------------------
// RACCOON CITY EN PIXEL ART HD — la rue devant le R.P.D., septembre 1998.
//
// Même technique que la Station orbitale retenue, et le modèle de lumière de
// render/terrains/raccoon.js : trois sources basses et latérales (gyrophares,
// fenêtres du poste, incendie), un macadam mouillé qui est la seule surface à
// refléter, des silhouettes éclairées sur un seul flanc. Le sol n'est jamais
// clair : c'est la lumière qui détache l'aire de jeu.
//
// Ce qui ne bouge pas : cages de 200 en grilles d'égout, volets 3/5/3 bleu et
// or, marquage (touche en retrait de 6, médiane, ronds de 58 et 13), et la
// brume, règle de jeu de game/brume.js : des traînées blanches, faibles et
// nombreuses, par-dessus tout.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, hacher, lisse, balayerDisque, balayerPoly, spriteDe, spriteChiffre, ecrire3x5, largeur3x5 } from '../_pixelart.js';
import { W, H, COURT, CX, CY } from '../_terrain-hd.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3, c: [47, 140, 255] },
  { from: -26, to: 26, points: 5, c: [245, 197, 66] },
  { from: 26, to: 100, points: 3, c: [47, 140, 255] }
];
const BANDE = COURT.top - 2;
const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;

const PAL = new Palette({
  // Nuit et brume
  n0: '#04080a', n1: '#080e10', n2: '#0e1c1f', n3: '#14282b', n4: '#1d3a3e', n5: '#2d5a5e',
  // Pierre du poste, briques
  q0: '#161412', q1: '#23211d', q2: '#34312c', q3: '#494540', q4: '#5c5850', q5: '#6e6a60', q6: '#8a8578',
  k1: '#2a1a14', k2: '#3e2820', k3: '#553628', k4: '#6e4634',
  // Fer, vitres
  f0: '#070b0c', f1: '#0c1113', f2: '#171f21', f3: '#2a3638', f4: '#65787a', v1: '#101a1c', v2: '#22383a', v3: '#3c5a5e',
  // Ambre des fenêtres et des lampes
  a1: '#3a2010', a2: '#7a4418', a3: '#c86a24', a4: '#ff9a3c', a5: '#ffc478', a6: '#ffe0b0',
  // Lettres
  l1: '#a8b0b4', l2: '#e8eef0', l3: '#ffffff',
  // Drapeau, gyrophares
  d1: '#8a1620', d2: '#c8202e', d3: '#eef0f2', d4: '#1e2f6b', d5: '#3a52a8',
  g1: '#0c2a5a', g2: '#1a58b8', g3: '#2f8cff', g4: '#9ccaff', x1: '#5a0c16', x2: '#b81e30', x3: '#ff3a4e', x4: '#ffa8b0',
  // Bitume mouillé
  b0: '#05090a', b1: '#070c0d', b2: '#0b1214', b3: '#10181a', b4: '#162226', b5: '#1e2e32', b6: '#2a4a4e', b7: '#3e6a6e',
  // Sang, papier, douilles
  s1: '#3d0d14', s2: '#7a1520', p1: '#8a867c', p2: '#c6c2b6', u1: '#8a6a2a', u2: '#c69e48',
  // Chair, tissus
  c1: '#5a6a5a', c2: '#7c8c78', c3: '#a0ac98', e1: '#6f8fb0', e2: '#9ab8d4', e3: '#1c2438', e4: '#2c3650',
  w1: '#8a8c8e', w2: '#d8dadc', o1: '#4a3a2c', o2: '#6e5a44', o3: '#3a4a30',
  // Feu
  h1: '#5a1a08', h2: '#b83c10', h3: '#ff6a1a', h4: '#ffb040', h5: '#fff0a0',
  // Barrières
  j1: '#6a5010', j2: '#e8c020', j3: '#fff080'
});
const C = PAL.c;
const NUIT = PAL.sous(['n0', 'n1', 'n2', 'n3', 'n4']);
const BITUME = PAL.sous(['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6']);
const PIERRE = PAL.sous(['q0', 'q1', 'q2', 'q3', 'q4', 'q5']);

// ---------------------------------------------------------------------------
// Petits outils : une silhouette faite de rectangles, cernée automatiquement.
// ---------------------------------------------------------------------------
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

// Zombie (trois tenues) et policier, deux temps chacun. Ils regardent à
// droite ; la lumière vient du terrain, donc de leur flanc droit ou gauche
// selon le côté — on éclaire une colonne.
function zombie(tenue, f) {
  const [haut, hautC, bas] = tenue === 0 ? [C.e1, C.e2, C.e3] : tenue === 1 ? [C.o2, C.o1, C.q2] : [C.w2, C.w1, C.q1];
  const jambe = f ? [[3, 22, 2, 9, bas], [7, 22, 2, 8, bas], [8, 29, 2, 2, bas]] : [[4, 22, 2, 9, bas], [6, 22, 2, 9, bas]];
  return silhouette(16, 32, [
    [4, 1, 5, 2, C.q1], [4, 3, 5, 5, C.c2], [8, 4, 1, 2, C.c3], [6, 6, 3, 1, C.s2],
    [3, 9, 7, 12, haut], [9, 10, 1, 10, hautC], [5, 13, 2, 3, C.s2],
    [8, 10, 6, 2, haut], [13, 11, 2, 2, C.c2], [8, 13, 5, 2, haut], [12, 14, 2, 2, C.c2],
    [3, 20, 7, 2, bas], ...jambe, [2, 30, 3, 2, C.f0], [7, 30, 3, 2, C.f0]
  ], C.f0);
}
function policier(f) {
  return silhouette(18, 32, [
    [4, 0, 6, 2, C.e3], [3, 2, 8, 1, C.e3], [4, 3, 5, 5, C.c3], [9, 4, 1, 2, C.c3],
    [3, 9, 8, 11, C.e1], [4, 9, 6, 8, C.f2], [10, 10, 1, 9, C.e2],
    [9, 11, 6, 2, C.e1], [14, 11, 3, 2, C.f3], [16, 11, 1, 1, C.a5],
    [3, 20, 8, 2, C.f1], [4, 22, 2, 9, C.e3], [f ? 8 : 7, 22, 2, 9, C.e3], [3, 30, 3, 2, C.f0], [f ? 8 : 7, 30, 3, 2, C.f0]
  ], C.f0);
}
const ZOMBIES = [0, 1, 2].map(k => [zombie(k, 0), zombie(k, 1)]);
const FLICS = [policier(0), policier(1)];

// Voiture vue de dessus, dans le sens de la longueur (verticale) : capot,
// pare-brise, toit, lunette, coffre. Le toit est blanc sur les voitures de
// patrouille — c'est ce qui les fait lire comme telles vues d'en haut.
function voiture(t, x, y, corps, toitBlanc, brulee) {
  const L = 32, H2 = 58, x0 = Math.round(x - L / 2), y0 = Math.round(y - H2 / 2);
  for (let j = 0; j < H2 + 4; j++) for (let i = -3; i < L + 3; i++) t.modifier(x0 + i, y0 + j + 3, (c, xx, yy) => PAL.teinter(c, C.b0, .55, xx, yy));
  const teinte = (k) => brulee ? (hacher(k, y0, 3) > .6 ? C.q2 : C.q1) : PAL.proche(corps[0] * k, corps[1] * k, corps[2] * k);
  for (let j = 0; j < H2; j++) for (let i = 0; i < L; i++) {
    const bord = i === 0 || i === L - 1 || j === 0 || j === H2 - 1;
    const cote = i < 3 ? 1.5 : i > L - 4 ? .7 : 1;
    let c;
    if (j < 3 || j > H2 - 4) c = C.f2;
    else if (j < 16) c = j === 4 ? teinte(1.8) : teinte(cote);
    else if (j < 22) c = brulee ? C.f0 : (i > 3 && i < L - 4 ? (i < 9 ? C.v3 : C.v2) : teinte(cote));
    else if (j < 38) c = toitBlanc && !brulee ? (i < 4 ? C.d3 : i > L - 5 ? C.w1 : C.w2) : teinte(cote * 1.1);
    else if (j < 44) c = brulee ? C.f0 : (i > 3 && i < L - 4 ? C.v1 : teinte(cote));
    else c = teinte(cote * .95);
    if (brulee && hacher(i, j, x0) > .82) c = C.q0;
    if (bord) c = C.f0;
    t.pt(x0 + i, y0 + j, c);
  }
  for (const [dx, dy] of [[-2, 7], [L - 1, 7], [-2, H2 - 16], [L - 1, H2 - 16]]) t.rect(x0 + dx, y0 + dy, 3, 9, C.f0);
  t.pt(x0 - 1, y0 + 19, C.f3); t.pt(x0 + L, y0 + 19, C.f3);
  return { x0, y0, L, H2 };
}

// ---------------------------------------------------------------------------
// Le fond fixe
// ---------------------------------------------------------------------------
let FOND = null, LIGNES = null;
const FENETRES = [];
const CHIFFRES = { 3: spriteChiffre(3, C.l3, C.l2, C.l1, C.f0), 5: spriteChiffre(5, C.l3, C.l2, C.l1, C.f0) };
const PAVILLON = { x0: 382, x1: 578, haut: 4 };
const TOUR = { x0: 300, x1: 336 };
const MAT = 652;

function peindreFond() {
  const t = new Toile(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y < BANDE) {
      const k = y / BANDE;
      t.px[i] = NUIT.tramer(8 + k * 8, 14 + k * 16, 16 + k * 16, x, y, 2);
    } else if (dansTerrain(x, y)) {
      // Macadam : granulat à trois grosseurs, bandes polies par les pneus,
      // nappe de lumière au centre qui détache l'aire de jeu.
      const g1 = hacher(x, y, 1), g2 = fbm(x * .3, y * .3, 2, 2), g3 = fbm(x * .04, y * .05, 3, 3);
      const bande = Math.exp(-((y - (CY - 90)) ** 2) / 800) + Math.exp(-((y - (CY + 90)) ** 2) / 800);
      const dx = (x - CX) / 420, dy = (y - CY) / 250, nap = Math.exp(-(dx * dx + dy * dy) * 1.6);
      let v = 17 + (g1 > .93 ? 7 : g1 < .06 ? -5 : 0) + (g2 - .5) * 8 + (g3 - .5) * 10 + bande * 5 + nap * 14;
      t.px[i] = BITUME.tramer(v * .85, v * 1.2, v * 1.3, x, y, 2);
    } else {
      const g = fbm(x * .05, y * .06, 3, 4);
      const v = 11 + (g - .5) * 10 + (hacher(x, y, 5) > .95 ? 5 : 0);
      t.px[i] = BITUME.tramer(v * .8, v * 1.15, v * 1.25, x, y, 2);
    }
  }
  // Flaques : plus sombres et lisses, les reflets y viendront à chaque image.
  for (let i = 0; i < 9; i++) {
    const cx = COURT.left + 60 + hacher(i, 1, 9) * 700, cy = COURT.top + 40 + hacher(i, 2, 9) * 400;
    const rx = 24 + hacher(i, 3, 9) * 40, ry = 8 + hacher(i, 4, 9) * 10;
    for (let y = Math.floor(cy - ry - 4); y < cy + ry + 4; y++) for (let x = Math.floor(cx - rx - 6); x < cx + rx + 6; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fbm(x * .08, y * .08, 2, 60 + i) - .5) * .9;
      if (d < 1 && dansTerrain(x, y)) {
        // Une flaque renvoie le ciel : un voile teal, une lèvre claire en
        // haut, quelques éclats. Noire, elle se lisait comme un trou.
        const reflet = hacher(x, y, 70 + i) > .93 ? C.b6 : ((y - (cy - ry)) < 2 && d > .6) ? C.b6 : C.b4;
        t.px[y * W + x] = d > .82 ? C.b5 : reflet;
      }
    }
  }
  // Sang, papiers, plaques d'égout.
  for (let i = 0; i < 7; i++) {
    const cx = COURT.left + 40 + hacher(i, 1, 12) * 740, cy = COURT.top + 30 + hacher(i, 2, 12) * 420;
    for (let k = 0; k < 26; k++) {
      const a = hacher(k, i, 13) * 6.3, d = hacher(k, i, 14) * (6 + i % 3 * 4);
      balayerDisque(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * .6), k < 6 ? 3 : 1, (yy, a0, b0) => t.hl(a0, b0, yy, k % 4 ? C.s1 : C.s2));
    }
  }
  for (let i = 0; i < 24; i++) {
    const x = Math.round(20 + hacher(i, 1, 15) * 920), y = Math.round(COURT.top + 10 + hacher(i, 2, 15) * 500);
    t.rect(x, y, 4, 3, C.p2); t.pt(x + 3, y + 2, C.p1); t.pt(x, y, C.p1);
  }
  for (const [cx, cy] of [[290, 470], [690, 170]]) {
    balayerDisque(cx, cy, 11, (yy, a, b) => t.hl(a, b, yy, C.f0));
    balayerDisque(cx, cy, 10, (yy, a, b) => { for (let x = a; x <= b; x++) t.pt(x, yy, (x + yy) % 4 === 0 ? C.f0 : (x - cx) + (yy - cy) < -4 ? C.f3 : C.f2); });
  }
  // Caniveaux le long du parvis.
  t.rect(0, COURT.top - 9, W, 5, C.b0); t.hl(0, W - 1, COURT.top - 9, C.b4);
  t.rect(0, COURT.bottom + 4, W, 5, C.b0); t.hl(0, W - 1, COURT.bottom + 4, C.b4);

  peindrePoste(t);

  // Cages : caniveau de pierre, vide noir, fers plats rouillés, volets.
  for (const cote of [1, 2]) {
    const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right;
    const x0 = cote === 1 ? gx - 14 : gx - 2, x1 = cote === 1 ? gx + 2 : gx + BUT.prof + 14;
    for (let y = BUT.haut - 12; y < BUT.bas + 12; y++) for (let x = x0; x < x1; x++) {
      const k = y - (BUT.haut - 12);
      t.pt(x, y, k < 3 ? C.q5 : y >= BUT.bas + 9 ? C.q1 : ((x + (y >> 2) * 3) % 9 === 0 || y % 4 === 0) ? C.q2 : C.q3);
    }
    for (let y = BUT.haut; y < BUT.bas; y++) for (let x = gx; x < gx + BUT.prof; x++) t.pt(x, y, C.n0);
    for (const z of ZONES) {
      for (let y = CY + z.from; y < CY + z.to; y++) for (let x = gx; x < gx + BUT.prof; x++)
        t.modifier(x, y, (c, xx, yy) => PAL.tramer(4 + z.c[0] * .24, 7 + z.c[1] * .24, 8 + z.c[2] * .24, xx, yy, 2));
    }
    for (let y = BUT.haut + 4; y < BUT.bas - 6; y += 17) for (let k = 0; k < 9; k++) {
      const c = k === 0 ? C.f0 : k === 1 ? C.f4 : k < 5 ? C.f3 : k < 7 ? C.f2 : k === 7 ? C.k3 : C.f0;
      t.hl(gx - 4, gx + BUT.prof + 1, y + k, c);
    }
    for (const xb of [gx + 4, gx + BUT.prof - 10]) for (let y = BUT.haut; y < BUT.bas; y++) {
      t.pt(xb, y, C.f0); t.pt(xb + 1, y, C.f4); t.rect(xb + 2, y, 3, 1, C.f2); t.pt(xb + 5, y, C.f0);
    }
    for (const z of ZONES) {
      const s = CHIFFRES[z.points];
      const yc = Math.round(CY + (z.from + z.to) / 2 - s.h / 2), xc = Math.round(gx + BUT.prof / 2 - s.l / 2);
      t.rect(xc - 2, yc - 2, s.l + 4, s.h + 4, C.n0);
      t.sprite(s, xc, yc);
    }
  }
  LIGNES = marquage();
  FOND = t;
}

// La façade du poste, sur les 82 px du haut.
function peindrePoste(t) {
  const SOL = BANDE;
  // Ailes en briques, deux étages de fenêtres, balustrade sur le toit.
  for (let y = 14; y < SOL - 6; y++) for (let x = 0; x < W; x++) {
    if (x >= PAVILLON.x0 && x < PAVILLON.x1) continue;
    const rang = Math.floor((y - 14) / 4), dec = rang % 2 ? 4 : 0;
    const joint = (y - 14) % 4 === 3 || (x + dec) % 8 === 7;
    const lum = x < CX ? .9 : 1;
    t.px[y * W + x] = joint ? C.q1 : hacher(Math.floor((x + dec) / 8), rang, 3) > .7 ? C.k2 : (lum < 1 ? C.k3 : C.k3);
  }
  for (let x = 0; x < W; x++) {
    if (x >= PAVILLON.x0 && x < PAVILLON.x1) continue;
    t.pt(x, 10, C.q5); t.pt(x, 11, C.q4); t.pt(x, 12, C.q3); t.pt(x, 13, C.q1);
    if (x % 6 < 2) for (let y = 5; y < 10; y++) t.pt(x, y, x % 6 === 0 ? C.q4 : C.q2);
    t.pt(x, 4, C.q5); t.pt(x, 5, C.q3);
    for (let y = SOL - 6; y < SOL; y++) t.pt(x, y, y === SOL - 6 ? C.q5 : C.q2);
  }
  // Fenêtres : allumées, éteintes, condamnées, brisées.
  FENETRES.length = 0;
  for (let x = 14; x < W - 20; x += 40) {
    if (x + 18 > PAVILLON.x0 - 6 && x < PAVILLON.x1 + 6) continue;
    if (x + 18 > TOUR.x0 - 4 && x < TOUR.x1 + 4) continue;
    for (const y of [20, 46]) {
      const f = hacher(x, y, 20);
      const type = f < .3 ? 'allumee' : f < .55 ? 'eteinte' : f < .8 ? 'planches' : 'brisee';
      FENETRES.push({ x, y, type });
      t.rect(x - 1, y - 1, 20, 22, C.q1); t.rect(x - 2, y + 20, 22, 2, C.q5);
      for (let j = 0; j < 20; j++) for (let i = 0; i < 18; i++) {
        let c;
        if (type === 'allumee') c = (i === 8 || j === 9) ? C.a1 : j < 3 ? C.a5 : C.a4;
        else if (type === 'eteinte') c = (i === 8 || j === 9) ? C.f1 : i + j < 12 ? C.v3 : C.v1;
        else if (type === 'planches') c = (j % 6 < 5) ? ((i + j * 3) % 11 === 0 ? C.o1 : C.o2) : C.f1;
        else c = hacher(i, j, x) > .55 + j * .02 ? C.v2 : C.f0;
        t.pt(x + i, y + j, c);
      }
    }
  }
  // Tour de l'horloge.
  for (let y = 0; y < SOL - 6; y++) for (let x = TOUR.x0; x < TOUR.x1; x++) {
    const bord = x === TOUR.x0 || x === TOUR.x1 - 1;
    t.pt(x, y, bord ? C.q1 : x - TOUR.x0 < 5 ? C.q2 : (y % 6 === 5 ? C.q2 : C.q4));
  }
  const hc = { x: (TOUR.x0 + TOUR.x1) / 2, y: 20 };
  balayerDisque(hc.x, hc.y, 12, (yy, a, b) => t.hl(a, b, yy, C.q1));
  balayerDisque(hc.x, hc.y, 11, (yy, a, b) => t.hl(a, b, yy, C.a6));
  for (let k = 0; k < 12; k++) t.pt(Math.round(hc.x + Math.cos(k / 12 * 6.28) * 9), Math.round(hc.y + Math.sin(k / 12 * 6.28) * 9), C.q2);
  t.rect(TOUR.x0 + 8, 40, 20, 24, C.f1); t.rect(TOUR.x0 + 10, 42, 16, 20, C.a3);
  // Pavillon d'entrée : pierre claire, fronton, « R.P.D. », porte cintrée.
  for (let y = PAVILLON.haut; y < SOL - 6; y++) for (let x = PAVILLON.x0; x < PAVILLON.x1; x++) {
    const bx = x - PAVILLON.x0, by = y - PAVILLON.haut;
    let c = by % 8 === 7 || (bx + (Math.floor(by / 8) % 2) * 12) % 24 === 23 ? C.q3 : C.q4;
    if (by < 6) c = by === 0 ? C.q6 : by < 3 ? C.q5 : C.q3;
    if (bx < 8 || bx > PAVILLON.x1 - PAVILLON.x0 - 9) c = bx % 8 === 0 || bx % 8 === 7 ? C.q2 : C.q5;
    t.pt(x, y, c);
  }
  // Lettres R.P.D. en police 3×5 grossie trois fois, gravées et éclairées.
  const txt = 'R.P.D.', larg = largeur3x5(txt) * 3;
  const tx = Math.round(CX - larg / 2);
  const tmp = new Toile(larg + 2, 17);
  ecrire3x5(tmp, txt, 0, 0, 1);
  for (let j = 0; j < 5; j++) for (let i = 0; i < larg / 3 + 1; i++) {
    if (!tmp.px[j * tmp.l + i]) continue;
    for (let dj = 0; dj < 3; dj++) for (let di = 0; di < 3; di++) {
      t.pt(tx + i * 3 + di + 1, 15 + j * 3 + dj + 1, C.q1);
      t.pt(tx + i * 3 + di, 15 + j * 3 + dj, dj === 0 ? C.l3 : C.l2);
    }
  }
  const sous = 'RACCOON POLICE';
  ecrire3x5(t, sous, Math.round(CX - largeur3x5(sous) / 2), 35, C.l1);
  const porte = { x0: CX - 20, x1: CX + 20, y0: 46 };
  for (let y = porte.y0; y < SOL - 6; y++) for (let x = porte.x0; x < porte.x1; x++) {
    const dy = y - (porte.y0 + 20), dx = x - CX;
    if (dy < 0 && dx * dx + dy * dy * 1.6 > 400) continue;
    const bord = Math.abs(dx) > 18 || (dy < 0 && dx * dx + dy * dy * 1.6 > 330);
    t.pt(x, y, bord ? C.q1 : x === CX || x === CX - 1 ? C.a2 : y > SOL - 12 ? C.a3 : C.a4);
  }
  // Mât et drapeau (le drapeau ondule à chaque image).
  for (let y = 2; y < SOL - 6; y++) { t.pt(MAT, y, C.f4); t.pt(MAT + 1, y, C.f2); }
  // Barrières de police le long du trottoir.
  for (let x = 30; x < W; x += 120) {
    if (x > PAVILLON.x0 - 30 && x < PAVILLON.x1) continue;
    for (let i = 0; i < 30; i++) for (let j = 0; j < 5; j++) t.pt(x + i, SOL - 4 + j, j === 0 || j === 4 ? C.f0 : ((i + j) >> 2) % 2 ? C.j2 : C.f1);
    for (const px of [x + 2, x + 27]) for (let j = 1; j < 9; j++) t.pt(px, SOL + j, C.f3);
  }
}

// Marquage peint, usé : touche en retrait de 6, médiane, ronds de 58 et 13.
function marquage() {
  const px = [];
  const L = COURT.left + 6, R = COURT.right - 6, T = COURT.top + 6, B = COURT.bottom - 6;
  for (let y = COURT.top; y < COURT.bottom; y++) for (let x = COURT.left; x < COURT.right; x++) {
    let d = Infinity;
    if (y >= T - 3 && y <= B + 3) d = Math.min(d, Math.abs(x - L), Math.abs(x - R), Math.abs(x - CX));
    if (x >= L - 3 && x <= R + 3) d = Math.min(d, Math.abs(y - T), Math.abs(y - B));
    const r = Math.hypot(x + .5 - CX, y + .5 - CY);
    d = Math.min(d, Math.abs(r - 58), Math.abs(r - 13));
    if (d >= 3) continue;
    // Usure : la peinture manque par plaques.
    const use = fbm(x * .09, y * .09, 2, 44);
    if (use < .36) continue;
    px.push(y * W + x, d < 1.6 && use > .45 ? 0 : 1);
  }
  return px;
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
const POURTOUR = [];
for (let x = 16; x < W; x += 34) POURTOUR.push({ x, y: 599, k: 'bas' });
for (let y = COURT.top + 34; y < COURT.bottom - 6; y += 42) {
  if (y > BUT.haut - 30 && y < BUT.bas + 34) continue;
  POURTOUR.push({ x: 20 + Math.round(hacher(y, 1, 88) * 14), y, k: 'gauche' });
  POURTOUR.push({ x: 926 - Math.round(hacher(y, 2, 88) * 14), y, k: 'droite' });
}
const VOITURES = [
  { x: 30, y: 158, corps: [40, 46, 56], gyro: true, i: 1 },
  { x: 30, y: 484, corps: [74, 90, 47], brulee: true, i: 2 },
  { x: 930, y: 170, corps: [40, 46, 56], gyro: true, i: 3 },
  { x: 930, y: 488, corps: [55, 65, 79], i: 4 }
];

export function creerPixel() {
  if (!FOND) peindreFond();
  const t = new Toile(W, H);
  const cible = document.createElement('canvas');
  cible.width = W; cible.height = H;
  const g = cible.getContext('2d');

  function image(temps, but, extras = {}) {
    t.copier(FOND);
    // Lampes de part et d'autre de la porte, qui grésillent.
    const gres = Math.sin(temps * 23) > .92 ? .4 : 1;
    for (const lx of [CX - 30, CX + 30]) {
      for (let y = 30; y < 80; y++) for (let x = lx - 18; x <= lx + 18; x++) {
        const d = Math.hypot(x - lx, (y - 50) * .8);
        if (d < 18 && y < BANDE) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.a4, .3 * gres * (1 - d / 18), xx, yy));
      }
      t.rect(lx - 1, 46, 3, 5, gres > .5 ? C.a6 : C.a3); t.hl(lx - 2, lx + 2, 45, C.f1);
    }
    // Horloge : ses aiguilles tournent (lentement, elle retarde).
    const hc = { x: (TOUR.x0 + TOUR.x1) / 2, y: 20 };
    const ah = temps * .02 - 1.2, am = temps * .24;
    t.ligne(hc.x, hc.y, hc.x + Math.cos(ah) * 5, hc.y + Math.sin(ah) * 5, C.f0);
    t.ligne(hc.x, hc.y, hc.x + Math.cos(am) * 8, hc.y + Math.sin(am) * 8, C.f0);
    // Drapeau qui ondule.
    for (let i = 0; i < 24; i++) for (let j = 0; j < 14; j++) {
      const ond = Math.round(Math.sin(i * .35 - temps * 4) * 1.5 * (i / 24));
      let c = Math.floor(j / 2) % 2 ? C.d3 : C.d2;
      if (i < 10 && j < 8) c = (i + j) % 3 === 0 ? C.d3 : C.d4;
      if (Math.sin(i * .35 - temps * 4) > .6) c = PAL.teinter(c, C.q1, .4, i, j);
      t.pt(MAT + 2 + i, 4 + j + ond, c);
    }

    // Voitures, gyrophares et feu : les trois sources de lumière du bas.
    for (const v of VOITURES) {
      voiture(t, v.x, v.y, v.corps, v.gyro, v.brulee);
      if (v.gyro) {
        const vB = Math.max(0, Math.cos(temps * 2.4 + v.i)), vR = Math.max(0, -Math.cos(temps * 2.4 + v.i));
        for (const [col, val, dy] of [[C.g3, vB, -6], [C.x3, vR, 6]]) {
          if (val < .05) continue;
          const cx = v.x, cy = v.y + dy;
          for (let y = cy - 72; y < cy + 72; y++) for (let x = cx - 72; x < cx + 72; x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d > 14 && d < 72 && y >= BANDE) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, col, .28 * val * (1 - d / 72) ** 1.6, xx, yy));
          }
        }
        // La barre lumineuse, en travers du toit : bleu d'un côté, rouge de l'autre.
        t.rect(v.x - 12, v.y - 4, 24, 5, C.f1);
        t.rect(v.x - 11, v.y - 3, 11, 3, vB > .1 ? C.g4 : C.g1);
        t.rect(v.x + 1, v.y - 3, 10, 3, vR > .1 ? C.x4 : C.x1);
      }
      if (v.brulee) {
        const vf = .6 + Math.sin(temps * 6 + v.i) * .4;
        for (let y = v.y - 80; y < v.y + 80; y++) for (let x = v.x - 80; x < v.x + 80; x++) {
          const d = Math.hypot(x - v.x, y - v.y);
          if (d < 80) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.h3, .3 * vf * (1 - d / 80) ** 1.5, xx, yy));
        }
        for (let k = 0; k < 7; k++) {
          const fx = v.x - 12 + k * 4, fh = Math.round(6 + Math.abs(Math.sin(temps * 8 + k * 1.3 + v.i)) * 9);
          for (let j = 0; j < fh; j++) {
            const u = j / fh;
            t.pt(fx, v.y - j, u < .3 ? C.h5 : u < .6 ? C.h4 : C.h3);
            if (u < .7) t.pt(fx + 1, v.y - j, u < .4 ? C.h4 : C.h2);
          }
        }
        for (let k = 0; k < 10; k++) {
          const p = (temps * .5 + k * .1) % 1;
          const sx = Math.round(v.x - 8 + Math.sin(k * 2.3 + temps) * 6 + p * 14), sy = Math.round(v.y - 14 - p * 50);
          if (((sx + sy) & 1) === 0) t.modifier(sx, sy, (c, xx, yy) => PAL.teinter(c, C.q3, .6 * (1 - p), xx, yy));
          t.modifier(sx + 1, sy, (c, xx, yy) => PAL.teinter(c, C.q2, .5 * (1 - p), xx, yy));
        }
      }
    }

    // Marquage.
    for (let i = 0; i < LIGNES.length; i += 2) {
      const p = LIGNES[i];
      t.px[p] = LIGNES[i + 1] ? PAL.teinter(t.px[p], C.w2, .45, p % W, (p / W) | 0) : C.w2;
    }

    // Vapeur qui sort des grilles des cages.
    for (const cote of [1, 2]) {
      const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right, s = cote === 1 ? -1 : 1;
      for (let i = 0; i < 7; i++) {
        const p = (temps * .4 + i * .15) % 1, y = BUT.haut + 16 + i * 26;
        const cx = gx + BUT.prof / 2 + s * p * 22, R = 8 + p * 20;
        for (let yy = y - R; yy < y + R; yy++) for (let xx = cx - R; xx < cx + R; xx++) {
          const d = Math.hypot(xx - cx, yy - y);
          if (d < R) t.modifier(xx, yy, (c, x2, y2) => PAL.teinter(c, C.v3, .4 * (1 - p) * (1 - d / R), x2, y2));
        }
      }
      if (but > .02) for (let y = BUT.haut; y < BUT.bas; y++) for (let x = gx; x < gx + BUT.prof; x++)
        t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.l3, but * .5, xx, yy));
    }

    // Zombies à gauche, ceux qui tiennent la ligne à droite.
    POURTOUR.forEach((p, i) => {
      // Personne ne se tient debout sur une voiture.
      if (VOITURES.some(v => Math.abs(v.x - p.x) < 26 && p.y > v.y - 30 && p.y < v.y + 62)) return;
      const gauche = p.k === 'gauche' || (p.k === 'bas' && p.x < CX);
      const f = Math.floor(temps * (gauche ? 2 : 3) + i) & 1;
      if (gauche) {
        if (hacher(i, 5, 90) < .18) return;
        const s = ZOMBIES[i % 3][f];
        const traine = Math.round(Math.sin(temps * 1.3 + i) * 2);
        t.sprite(s, p.x - 8 + traine, p.y - 32);
      } else {
        if (hacher(i, 9, 90) < .5) return;
        t.sprite(FLICS[f], p.x - 9, p.y - 32, true);
        // Lampe torche : un cône qui balaie vers le terrain.
        const ang = Math.PI + Math.sin(temps * .8 + i) * .35;
        const lx = p.x - 8, ly = p.y - 20;
        balayerPoly([[lx, ly], [lx + Math.cos(ang - .22) * 60, ly + Math.sin(ang - .22) * 60], [lx + Math.cos(ang + .22) * 60, ly + Math.sin(ang + .22) * 60]], (yy, a, b) => {
          for (let xx = a; xx <= b; xx++) {
            const d = Math.hypot(xx - lx, yy - ly) / 60;
            t.modifier(xx, yy, (c, x2, y2) => PAL.teinter(c, C.a6, .22 * (1 - d), x2, y2));
          }
        });
      }
    });
    // Douilles au pied de la ligne.
    for (let i = 0; i < 50; i++) {
      const x = Math.round(CX + hacher(i, 1, 95) * 470), y = Math.round(COURT.top + 20 + hacher(i, 2, 95) * 500);
      if (dansTerrain(x, y)) continue;
      t.pt(x, y, C.u2); t.pt(x + 1, y, C.u1);
    }

    // La brume : des fibres horizontales blanches, faibles et nombreuses,
    // par-dessus tout. Pas un halo rond : c'est ce grain déchiré qui la fait.
    if (extras.brume) {
      for (let i = 0; i < 13; i++) {
        const per = 3.2 + hacher(i, 1, 99) * 2.6, k = ((temps / per) + hacher(i, 2, 99)) % 1;
        const xc = -520 + k * 2000, yc = COURT.top + 20 + hacher(i, 3, 99) * 436;
        const L = 700 + hacher(i, 4, 99) * 360, E = 46 + hacher(i, 5, 99) * 40;
        const a = .5 * Math.sin(k * Math.PI);
        for (let f = 0; f < 15; f++) {
          const u = f / 14 * 2 - 1, chute = Math.exp(-u * u * 2.4);
          const l = L * (.55 + hacher(i, f, 100) * .55), ox = (hacher(i, f, 101) - .5) * L * .28;
          const y = Math.round(yc + u * E * .5);
          for (let x = Math.max(0, Math.round(xc + ox - l / 2)); x < Math.min(W, xc + ox + l / 2); x++) {
            const v = (x - (xc + ox - l / 2)) / l;
            const env = v < .22 ? v / .22 : v > .7 ? (1 - v) / .3 : 1;
            for (let dy = 0; dy < 3; dy++) t.modifier(x, y + dy, (c, xx, yy) => PAL.teinter(c, C.w2, a * chute * env, xx, yy));
          }
        }
      }
    }

    t.peindre(g);
    return cible;
  }
  return { image };
}
