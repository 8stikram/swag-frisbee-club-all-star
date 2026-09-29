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
  // La même pierre, refroidie par la nuit teal loin de l'entrée
  t0: '#161c1e', t1: '#202829', t2: '#2c3638', t3: '#3c4749', t4: '#505b5c', t5: '#687271', t6: '#8a9290',
  // … et réchauffée près de la porte
  y1: '#4a3a2c', y2: '#6a5138', y3: '#8e6a44',
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
const PIERRE = PAL.sous(['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 't0', 't1', 't2', 't3', 't4', 't5', 't6', 'y1', 'y2', 'y3']);

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
const CHIFFRES = { 3: spriteChiffre(3, C.l3, C.l2, C.l1, C.f0), 5: spriteChiffre(5, C.l3, C.l2, C.l1, C.f0) };
// La façade retenue au banc (mockups/rpd-station.html, render/terrains/
// raccoon.js, station()) : ailes à deux niveaux rythmées de pilastres,
// pavillon d'entrée en saillie, tour d'horloge rentrée à gauche, drapeau et
// fourgon à droite. Toutes les mesures en découlent de la hauteur ht = 82.
const HT = 82, H_AILE = Math.round(HT * .82), Y_AILE = BANDE - H_AILE;
const PAVILLON = { x0: Math.round(CX - HT * 2.65 / 2), x1: Math.round(CX + HT * 2.65 / 2) };
const ENTREE = { l: Math.round(HT * 2.65 * .42), bas: BANDE, piedArc: BANDE - 22, sommet: BANDE - 42 };
const TOUR = { x0: Math.round(CX - W * .29), x1: Math.round(CX - W * .29 + HT * .72) };
const HORLOGE = { x: (TOUR.x0 + TOUR.x1) / 2, y: BANDE - HT * .9, r: 17 };
const MAT = Math.round(CX + HT * 2.65 * .72);
const FOURGON = { x: Math.round(CX + HT * 2.65 * .95) - 30, y: BANDE - 25 };
const PAS = HT * .5;

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
  peindreBordures(t);

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
//
// La pierre est calculée en couleur continue puis tramée : grise et chaude
// près de l'entrée, de plus en plus froide (teal) en s'en éloignant — la seule
// chose qui réchauffe, c'est la lumière qui sort de la porte.
function pierre(x, y, bloc, grand) {
  const hB = grand ? 7 : 6, lB = grand ? 16 : 14;
  const rang = Math.floor(y / hB), dec = rang % 2 ? lB / 2 : 0;
  const joint = y % hB === hB - 1 || (x + dec) % lB === lB - 1;
  const var_ = (hacher(Math.floor((x + dec) / lB), rang, bloc) - .5) * 16;
  const chaud = Math.exp(-Math.abs(x - CX) / 150) * Math.exp(-Math.max(0, BANDE - 20 - y) / 60);
  let r = 62 + var_, g = 66 + var_, b = 66 + var_;
  r = r * (1 - chaud) + (r * 1.08 + 6) * chaud; g = g * (1 - chaud) + (g * 1.02 + 3) * chaud; b = b * (1 - chaud) + (b * .92) * chaud;
  const froid = Math.min(1, Math.abs(x - CX) / 420);
  r -= 12 * froid; b += 2 * froid;
  if (joint) { r *= .55; g *= .55; b *= .55; }
  return [r, g, b];
}
function fenetrePx(t, x, y, l, h, cintree, etat) {
  // Encadrement de pierre claire, appui en saillie, linteau.
  const arc = cintree ? Math.round(l / 2) : 0;
  const dedans = (i, j) => {
    if (i < 0 || i >= l || j < 0 || j >= h) return false;
    if (!cintree || j >= arc) return true;
    const dx = i + .5 - l / 2, dy = arc - j - .5;
    return dx * dx + dy * dy <= (l / 2) * (l / 2);
  };
  for (let j = -2; j < h + 2; j++) for (let i = -2; i < l + 2; i++) {
    if (dedans(i, j)) continue;
    let pres = false;
    for (let dj = -2; dj <= 2 && !pres; dj++) for (let di = -2; di <= 2; di++) if (dedans(i + di, j + dj)) { pres = true; break; }
    if (pres) t.pt(x + i, y + j, j < h / 2 ? C.t5 : C.t4);
  }
  t.hl(x - 3, x + l + 2, y + h + 1, C.t6); t.hl(x - 3, x + l + 2, y + h + 2, C.t1);
  for (let j = 0; j < h; j++) for (let i = 0; i < l; i++) {
    if (!dedans(i, j)) continue;
    const mont = i === Math.floor(l / 2) || (!cintree && j === Math.floor(h * .45)) || (cintree && j === arc);
    let c;
    if (etat === 'allumee') c = mont ? C.a1 : (j % 4 === 3 && j > arc ? C.a3 : j < h * .3 ? C.a5 : C.a4);
    else if (etat === 'brisee') c = hacher(i, j, x + y) > .5 + j / h * .4 ? (i + j < 8 ? C.v3 : C.v2) : C.n0;
    else c = mont ? C.f0 : (i + j * .6 < l * .45 && j > 1 ? (i + j < 5 ? C.v3 : C.v2) : C.v1);
    t.pt(x + i, y + j, c);
  }
  if (etat === 'planches') {
    for (let k = 0; k < 3; k++) {
      const yy = y + Math.round(h * (.18 + k * .3));
      for (let i = -3; i < l + 3; i++) for (let dj = 0; dj < 4; dj++) {
        const yp = yy + dj + Math.round((i - l / 2) * (k === 1 ? .18 : -.12));
        t.pt(x + i, yp, dj === 0 ? C.o2 : dj === 3 ? C.o1 : (i * 7 + k) % 9 === 0 ? C.o1 : C.o2);
      }
      t.pt(x - 1, yy + 1, C.f4); t.pt(x + l, yy + 1, C.f4);
    }
  }
  if (etat === 'allumee') {
    // Le halo sur la pierre : une couronne tramée, pas un flou.
    for (let j = -6; j < h + 6; j++) for (let i = -6; i < l + 6; i++) {
      if (dedans(i, j)) continue;
      const d = Math.max(-i, i - l + 1, -j, j - h + 1, 0);
      if (d > 0 && d < 7) t.modifier(x + i, y + j, (c, xx, yy) => PAL.teinter(c, C.a3, .3 * (1 - d / 7), xx, yy));
    }
  }
}
function balustradePx(t, x0, x1, y) {
  for (let x = x0; x < x1; x++) {
    t.pt(x, y, C.t6); t.pt(x, y + 1, C.t4);
    for (let j = 2; j < 6; j++) t.pt(x, y + j, (x % 5 === 1 || x % 5 === 2) ? (j === 3 ? C.t5 : C.t4) : (x % 5 === 0 ? C.t1 : C.n2));
    t.pt(x, y + 6, C.t5); t.pt(x, y + 7, C.t2);
  }
}
function peindrePoste(t) {
  // Ciel : nuit teal, lueur de l'incendie hors champ à gauche, fumées.
  for (let y = 0; y < Y_AILE; y++) for (let x = 0; x < W; x++) {
    const feu = Math.exp(-(x * x) / (2 * 260 * 260)) * (y / Y_AILE);
    const fumee = lisse(.5, .75, fbm(x * .02, y * .08, 3, 70)) * .6;
    t.pt(x, y, NUIT.tramer(8 + feu * 22 + fumee * 10, 14 + feu * 8 + fumee * 12, 16 + fumee * 12, x, y, 2));
  }
  // Ailes.
  for (let y = Y_AILE; y < BANDE - 3; y++) for (let x = 0; x < W; x++) {
    const [r, g, b] = pierre(x, y, 101, false);
    t.pt(x, y, PIERRE.tramer(r, g, b, x, y, 2));
  }
  // Bandeau entre les niveaux, socle.
  const yB = Y_AILE + Math.round(H_AILE * .46);
  t.hl(0, W - 1, yB, C.t6); t.hl(0, W - 1, yB + 1, C.t4); t.hl(0, W - 1, yB + 2, C.t1);
  for (let y = BANDE - 5; y < BANDE; y++) t.hl(0, W - 1, y, y === BANDE - 5 ? C.t5 : C.t2);
  balustradePx(t, 0, W, Y_AILE - 8);
  // Travées : pilastre, fenêtre d'étage rectangulaire, fenêtre cintrée en bas.
  for (let x = PAS * .35; x < W; x += PAS) {
    const xi = Math.round(x);
    if (xi > PAVILLON.x0 - 22 && xi < PAVILLON.x1 + 16) continue;
    if (xi > TOUR.x0 - 22 && xi < TOUR.x1 + 6) continue;
    const i = (x * 7) | 0;
    const px = Math.round(x - PAS * .16);
    for (let y = Y_AILE; y < BANDE - 5; y++) { t.pt(px, y, C.t5); t.pt(px + 1, y, C.t4); t.pt(px + 2, y, C.t4); t.pt(px + 3, y, C.t1); }
    const l = Math.round(PAS * .42);
    const cloue = hacher(i, 11, 3) > .58, brise = !cloue && hacher(i, 17, 3) > .72;
    fenetrePx(t, xi, Y_AILE + Math.round(H_AILE * .12), l, Math.round(H_AILE * .3), false,
      hacher(i + 3, 0, 3) > .62 ? 'allumee' : hacher(i, 23, 3) > .8 ? 'brisee' : 'eteinte');
    fenetrePx(t, xi, Y_AILE + Math.round(H_AILE * .6) - 2, l, Math.round(H_AILE * .34), true,
      cloue ? 'planches' : brise ? 'brisee' : hacher(i, 0, 3) > .74 ? 'allumee' : 'eteinte');
  }
  // Tour de l'horloge, maçonnée plus gros, chaînes d'angle, bandeaux.
  for (let y = 0; y < BANDE - 3; y++) for (let x = TOUR.x0; x < TOUR.x1; x++) {
    let [r, g, b] = pierre(x, y + 3, 401, true);
    const bx = x - TOUR.x0;
    if (bx < 6 || bx >= TOUR.x1 - TOUR.x0 - 6) { const k = Math.floor(y / 7) % 2 ? 1.08 : 1.18; r *= k; g *= k; b *= k; }
    if (bx === TOUR.x1 - TOUR.x0 - 2 || bx === 4) { r *= .6; g *= .6; b *= .6; }
    t.pt(x, y, PIERRE.tramer(r, g, b, x, y, 2));
  }
  for (const yb of [Math.round(BANDE - HT * 1.55 + HT * 1.55 * .62)]) {
    t.hl(TOUR.x0 - 2, TOUR.x1 + 1, yb, C.t6); t.hl(TOUR.x0 - 2, TOUR.x1 + 1, yb + 1, C.t4); t.hl(TOUR.x0 - 2, TOUR.x1 + 1, yb + 2, C.t1);
  }
  const lt = TOUR.x1 - TOUR.x0;
  fenetrePx(t, TOUR.x0 + Math.round(lt * .3), Math.round(BANDE - HT * .62) + 8, Math.round(lt * .4), 16, true, 'allumee');
  fenetrePx(t, TOUR.x0 + Math.round(lt * .3), Math.round(BANDE - HT * .32) + 6, Math.round(lt * .4), 16, true, 'eteinte');
  // Le cadran, éclairé de l'intérieur : de nuit, c'est un disque lumineux.
  const H0 = HORLOGE;
  for (let y = Math.floor(H0.y - 40); y < H0.y + 40; y++) for (let x = Math.floor(H0.x - 40); x < H0.x + 40; x++) {
    const d = Math.hypot(x - H0.x, y - H0.y);
    if (d > H0.r + 4 && d < 38) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.a4, .32 * (1 - (d - H0.r - 4) / 16), xx, yy));
  }
  balayerDisque(Math.round(H0.x), Math.round(H0.y), H0.r + 4, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, (x - H0.x) + (y - H0.y) < -6 ? C.t6 : C.t4); });
  balayerDisque(Math.round(H0.x), Math.round(H0.y), H0.r + 1, (y, a, b) => t.hl(a, b, y, C.t2));
  balayerDisque(Math.round(H0.x), Math.round(H0.y), H0.r, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, Math.hypot(x - H0.x, y - H0.y) > H0.r - 3 ? C.a5 : C.a6); });
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const x = Math.round(H0.x + Math.cos(a) * (H0.r - 3)), y = Math.round(H0.y + Math.sin(a) * (H0.r - 3));
    t.pt(x, y, C.q1); if (k % 3 === 0) { t.pt(x + 1, y, C.q1); t.pt(x, y + 1, C.q1); }
  }
  // Les aiguilles arrêtées : la ville s'est arrêtée, l'horloge aussi.
  for (const [a, L, ep] of [[-.7, .62, 2], [2.5, .42, 2]]) for (let e = 0; e < ep; e++)
    t.ligne(H0.x + e * .5, H0.y, H0.x + Math.cos(a) * H0.r * L + e * .5, H0.y + Math.sin(a) * H0.r * L, C.q1);
  // Pavillon d'entrée en saillie, qui porte son ombre sur l'aile de droite.
  for (let y = 0; y < BANDE - 3; y++) for (let x = PAVILLON.x1; x < PAVILLON.x1 + 8; x++) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.n0, .55, xx, yy));
  for (let y = 0; y < BANDE - 3; y++) for (let x = PAVILLON.x0; x < PAVILLON.x1; x++) {
    let [r, g, b] = pierre(x, y, 211, false);
    const bx = x - PAVILLON.x0, bd = PAVILLON.x1 - 1 - x;
    if (bx < 11 || bd < 11) { r *= 1.14; g *= 1.12; b *= 1.08; if (bx === 9 || bd === 1) { r *= .6; g *= .6; b *= .6; } }
    if (y < 3) { r *= 1.2; g *= 1.2; b *= 1.15; }
    t.pt(x, y, PIERRE.tramer(r, g, b, x, y, 2));
  }
  // Halo chaud de l'entrée sur la pierre.
  const E = ENTREE, ex0 = CX - E.l / 2;
  for (let y = 0; y < BANDE; y++) for (let x = CX - 110; x < CX + 110; x++) {
    const d = Math.hypot((x - CX) / 1.3, y - (BANDE - 18));
    if (d < 85) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.a4, .3 * (1 - d / 85) ** 1.4, xx, yy));
  }
  // L'entrée cintrée : lumière chaude, portes vitrées à double battant, imposte
  // en éventail, claveaux de l'arc.
  const arcY = x => E.piedArc - (E.piedArc - E.sommet) * (1 - ((x + .5 - CX) / (E.l / 2)) ** 2);
  for (let x = Math.floor(ex0) - 4; x < ex0 + E.l + 4; x++) for (let y = E.sommet - 5; y < E.bas; y++) {
    const dedans = x >= ex0 && x < ex0 + E.l && y >= arcY(x);
    const voussoir = !dedans && x >= ex0 - 4 && x < ex0 + E.l + 4 && y >= arcY(Math.min(Math.max(x, ex0), ex0 + E.l - 1)) - 4 && y < E.piedArc + 2;
    if (voussoir) { t.pt(x, y, Math.floor(Math.atan2(y - E.piedArc, x - CX) * 9) % 2 ? C.t6 : C.t5); continue; }
    if (!dedans) continue;
    const k = (y - E.sommet) / (E.bas - E.sommet);
    let c = k > .75 ? C.a6 : k > .4 ? C.a5 : C.a4;
    if (y === E.piedArc) c = C.f1;
    if (y < E.piedArc) {
      const ang = Math.atan2(E.piedArc - y, x + .5 - CX);
      if (Math.abs(((ang / Math.PI) * 5) % 1 - .5) > .44) c = C.f2;
    } else {
      if (Math.abs(x + .5 - CX) < 1.2) c = C.f1;
      const pan = (x - ex0) % (E.l / 4);
      if (pan < 1) c = C.a2;
      if (y === Math.round(E.piedArc + (E.bas - E.piedArc) * .45)) c = C.a2;
    }
    t.pt(x, y, c);
  }
  // Les lettres : « R.P.D. », taillées à 4 px par point de la police 3×5,
  // éclairées d'un halo chaud, puis le sous-titre.
  const txt = 'R.P.D.', larg = largeur3x5(txt) * 4, tx = Math.round(CX - larg / 2), ty = 12;
  const tmp = new Toile(largeur3x5(txt) + 2, 6);
  ecrire3x5(tmp, txt, 0, 0, 1);
  for (let y = ty - 4; y < ty + 24; y++) for (let x = tx - 4; x < tx + larg + 4; x++) {
    let d = 9;
    for (let j = 0; j < 5; j++) for (let i = 0; i < tmp.l; i++) if (tmp.px[j * tmp.l + i]) {
      const dx = Math.max(tx + i * 4 - x, 0, x - (tx + i * 4 + 3)), dy = Math.max(ty + j * 4 - y, 0, y - (ty + j * 4 + 3));
      d = Math.min(d, Math.max(dx, dy));
    }
    if (d > 0 && d < 4) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.a6, .4 * (1 - d / 4), xx, yy));
  }
  for (let j = 0; j < 5; j++) for (let i = 0; i < tmp.l; i++) {
    if (!tmp.px[j * tmp.l + i]) continue;
    for (let dj = 0; dj < 4; dj++) for (let di = 0; di < 4; di++) {
      t.pt(tx + i * 4 + di + 1, ty + j * 4 + dj + 1, C.q1);
    }
  }
  for (let j = 0; j < 5; j++) for (let i = 0; i < tmp.l; i++) {
    if (!tmp.px[j * tmp.l + i]) continue;
    for (let dj = 0; dj < 4; dj++) for (let di = 0; di < 4; di++) t.pt(tx + i * 4 + di, ty + j * 4 + dj, dj === 0 && j === 0 ? C.l3 : dj === 3 && j === 4 ? C.l1 : C.l3);
  }
  const sous = 'RACCOON POLICE';
  ecrire3x5(t, sous, Math.round(CX - largeur3x5(sous) / 2) + 1, 36, C.q1);
  ecrire3x5(t, sous, Math.round(CX - largeur3x5(sous) / 2), 35, C.l1);
  // Lanternes de part et d'autre de l'entrée (allumées à chaque image).
  for (const s2 of [-1, 1]) {
    const lx = Math.round(CX + s2 * E.l * .78), ly = E.piedArc - 6;
    t.rect(lx - 1, ly - 7, 3, 4, C.f2);
  }
  // Perron à trois marches.
  for (let k = 0; k < 3; k++) {
    const el = E.l + 15 + k * 11, y = BANDE - 5 + k * 2;
    t.hl(Math.round(CX - el / 2), Math.round(CX + el / 2), y, k % 2 ? C.t6 : C.t5);
    t.hl(Math.round(CX - el / 2), Math.round(CX + el / 2), y + 1, C.t2);
  }
  // Mât du drapeau.
  for (let y = 2; y < BANDE; y++) { t.pt(MAT, y, C.f4); t.pt(MAT + 1, y, C.f2); }
  t.pt(MAT, 1, C.a5); t.pt(MAT + 1, 1, C.a5);
  // Le fourgon de police, garé de biais devant l'aile droite.
  const F = FOURGON;
  for (let j = 0; j < 22; j++) for (let i = 0; i < 64; i++) {
    const bord = i === 0 || i === 63 || j === 0 || j === 21;
    let c = j < 4 ? C.f2 : j < 11 ? (i > 6 && i < 58 && (i - 6) % 13 < 11 ? (i < 20 ? C.v3 : C.v2) : C.q1) : (j > 12 && j < 17 ? C.w2 : C.q1);
    if (j === 4) c = C.f4;
    if (bord) c = C.f0;
    t.pt(F.x + i, F.y + j, c);
  }
  ecrire3x5(t, 'POLICE', F.x + 21, F.y + 13, C.e3);
  for (const wx of [F.x + 12, F.x + 50]) balayerDisque(wx, F.y + 22, 4, (y, a, b) => t.hl(a, b, y, y > F.y + 20 ? C.f0 : C.f2));
  // Barrières de police le long du trottoir, sauf devant l'entrée et le fourgon.
  for (let x = 12; x < W; x += 51) {
    if (x > PAVILLON.x0 - 30 && x < PAVILLON.x1) continue;
    if (x > F.x - 34 && x < F.x + 66) continue;
    for (let i = 0; i < 30; i++) for (let j = 0; j < 5; j++) t.pt(x + i, BANDE - 12 + j, j === 0 || j === 4 ? C.f0 : ((i + j) >> 2) % 2 ? C.j2 : C.f1);
    for (const px of [x + 2, x + 27]) for (let j = 5; j < 12; j++) t.pt(px, BANDE - 12 + j, C.f3);
  }
}

// ---------------------------------------------------------------------------
// Le bas et les côtés : trottoirs de béton, bordures, lampadaires au sodium,
// et ce que la nuit a laissé traîner. Tout reste hors de l'aire de jeu.
// ---------------------------------------------------------------------------
const TROTTOIR_BAS = COURT.bottom + 12;          // première rangée de dalles
const TROTTOIR_G = 11, TROTTOIR_D = W - 12;      // bord intérieur des trottoirs latéraux
// Lampadaires hors champ : on ne voit que leur flaque de lumière orangée.
const LAMPES = [[190, H + 6, 70], [480, H + 8, 64], [770, H + 6, 70], [-6, 118, 58], [-6, 540, 58], [W + 6, 118, 58], [W + 6, 540, 58]];
// Où sont posés les accessoires : les silhouettes s'en écartent.
const ACCESSOIRES = [
  { k: 'poubelleCouchee', x: 92, y: 588 }, { k: 'bache', x: 236, y: 590 }, { k: 'grille', x: 330, y: COURT.bottom + 9 },
  { k: 'journaux', x: 404, y: 584 }, { k: 'borne', x: 560, y: 588 }, { k: 'plot', x: 612, y: 592 },
  { k: 'sacs', x: 690, y: 592, l: 104 }, { k: 'grille', x: 842, y: COURT.bottom + 9 },
  { k: 'poubelle', x: 50, y: 112 }, { k: 'sacsPoubelle', x: 36, y: 122 }, { k: 'plot', x: 58, y: 546 },
  { k: 'sacs', x: 898, y: 122, l: 44 }, { k: 'sacs', x: 898, y: 544, l: 44 }, { k: 'caisse', x: 906, y: 104 }
];
// Les sacs de sable et les grilles ne gênent personne : les policiers se
// tiennent justement derrière les sacs.
const libre = (x, y) => !ACCESSOIRES.some(a => a.k !== 'sacs' && a.k !== 'grille' && Math.abs(a.x + (a.l || 16) / 2 - x) < (a.l || 16) / 2 + 8 && Math.abs(a.y - y) < 14);

function peindreBordures(t) {
  const beton = (x, y, fonce) => {
    const dx = Math.floor(x / 24), dy = Math.floor((y - 2) / 10);
    const joint = x % 24 === 0 || (y - 2) % 10 === 0;
    const v = 44 + (hacher(dx, dy, 31) - .5) * 12 + (fbm(x * .08, y * .08, 3, 32) - .5) * 14 - fonce;
    let r = v * .9, g = v * 1.02, b = v * 1.04;
    if (joint) { r *= .62; g *= .62; b *= .62; }
    // Fissures : de fines lignes qui courent d'une dalle à l'autre.
    if (Math.abs(fbm(x * .05, y * .05, 3, 33) - .5) < .012) { r *= .55; g *= .55; b *= .55; }
    return [r, g, b];
  };
  // Trottoir du bas, sa bordure et la crasse qui s'accumule contre elle.
  for (let y = COURT.bottom + 9; y < H; y++) for (let x = 0; x < W; x++) {
    let c;
    if (y === COURT.bottom + 9) c = C.t6;
    else if (y === COURT.bottom + 10) c = C.t4;
    else if (y === COURT.bottom + 11) c = C.t1;
    else { const [r, g, b] = beton(x, y, Math.max(0, 6 - (y - TROTTOIR_BAS)) * 2); c = PIERRE.tramer(r, g, b, x, y, 2); }
    t.px[y * W + x] = c;
  }
  // Trottoirs latéraux.
  for (let y = COURT.top - 4; y < COURT.bottom + 9; y++) {
    for (let x = 0; x < W; x++) {
      if (x > TROTTOIR_G + 2 && x < TROTTOIR_D - 2) continue;
      let c;
      if (x === TROTTOIR_G + 1 || x === TROTTOIR_D - 1) c = C.t6;
      else if (x === TROTTOIR_G + 2 || x === TROTTOIR_D - 2) c = C.t1;
      else { const [r, g, b] = beton(x, y, 0); c = PIERRE.tramer(r, g, b, x, y, 2); }
      t.px[y * W + x] = c;
    }
  }
  // Ligne de rive usée et traces de freinage sur les chaussées latérales.
  for (const x of [58, W - 60]) for (let y = COURT.top + 6; y < COURT.bottom - 4; y++) {
    if (y > BUT.haut - 20 && y < BUT.bas + 20) continue;
    if (fbm(x * .1, y * .09, 2, 34) < .38) continue;
    t.pt(x, y, C.w1); t.pt(x + 1, y, (y & 3) ? C.w1 : C.b5);
  }
  for (const [x0, y0, sens] of [[40, 240, 1], [48, 250, 1], [918, 430, -1], [910, 442, -1]]) {
    for (let k = 0; k < 70; k++) {
      const x = Math.round(x0 + Math.sin(k * .05) * 10 * sens), y = y0 + k * sens * -1 + (sens < 0 ? 0 : 0);
      if (y > BUT.haut - 14 && y < BUT.bas + 14) continue;
      t.modifier(x, y, (c, a, b) => PAL.teinter(c, C.b0, .6, a, b));
      t.modifier(x + 1, y, (c, a, b) => PAL.teinter(c, C.b0, .35, a, b));
    }
  }
  // Flaques de lumière orangée des lampadaires au sodium.
  for (const [lx, ly, r] of LAMPES) {
    for (let y = Math.max(0, ly - r); y < Math.min(H, ly + r); y++) for (let x = Math.max(0, lx - r * 1.4); x < Math.min(W, lx + r * 1.4); x++) {
      if (dansTerrain(x, y) || y < BANDE) continue;
      const d = Math.hypot((x - lx) / 1.4, y - ly) / r;
      if (d < 1) t.modifier(x, y, (c, a, b) => PAL.teinter(c, C.a3, .3 * (1 - d) ** 1.5, a, b));
    }
  }
  // Traînée de sang vers la cage de gauche : quelqu'un a été tiré par là.
  for (let k = 0; k < 90; k++) {
    const x = Math.round(26 + k * .35 + Math.sin(k * .2) * 3), y = COURT.bottom - 12 - k;
    if (hacher(k, 0, 35) > .35) t.pt(x, y, k % 5 ? C.s1 : C.s2);
    if (hacher(k, 1, 35) > .6) t.pt(x + 1, y, C.s1);
  }
  for (const a of ACCESSOIRES) accessoire(t, a);
}

function accessoire(t, a) {
  const { x, y } = a;
  const ombre = (l, h2) => { for (let j = 0; j < h2; j++) for (let i = -1; i <= l; i++) t.modifier(x + i + 2, y + j - 1, (c, xx, yy) => PAL.teinter(c, C.b0, .5, xx, yy)); };
  if (a.k === 'poubelle' || a.k === 'poubelleCouchee') {
    const couchee = a.k === 'poubelleCouchee';
    if (couchee) {
      ombre(16, 4);
      for (let j = 0; j < 9; j++) for (let i = 0; i < 15; i++) t.pt(x + i, y - 9 + j, i === 0 || j === 0 || j === 8 ? C.f0 : i % 4 === 0 ? C.f3 : j < 3 ? C.t5 : C.t3);
      balayerDisque(x + 16, y - 5, 4, (yy, a0, b0) => t.hl(a0, b0, yy, C.f0));
      balayerDisque(x + 16, y - 5, 3, (yy, a0, b0) => t.hl(a0, b0, yy, C.t1));
      // Les ordures répandues : sacs noirs, papiers, une canette.
      for (const [dx, dy, r] of [[22, -3, 4], [28, 1, 3], [20, 3, 3]]) {
        balayerDisque(x + dx, y + dy, r, (yy, a0, b0) => t.hl(a0, b0, yy, C.f0));
        balayerDisque(x + dx - 1, y + dy - 1, r - 1, (yy, a0, b0) => t.hl(a0, b0, yy, C.f1));
        t.pt(x + dx - 1, y + dy - r + 1, C.f3);
      }
      for (let k = 0; k < 7; k++) t.rect(x + 18 + Math.round(hacher(k, 1, 40) * 22), y - 4 + Math.round(hacher(k, 2, 40) * 10), 3, 2, k % 2 ? C.p2 : C.p1);
      t.pt(x + 34, y + 2, C.x2); t.pt(x + 35, y + 2, C.w2);
    } else {
      ombre(10, 3);
      for (let j = 0; j < 15; j++) for (let i = 0; i < 10; i++) t.pt(x + i, y - 15 + j, i === 0 || i === 9 || j === 14 ? C.f0 : j < 2 ? C.t6 : j % 5 === 2 ? C.t2 : i < 3 ? C.t5 : C.t3);
      t.hl(x - 1, x + 10, y - 16, C.f0); t.hl(x, x + 9, y - 16, C.t4);
    }
  } else if (a.k === 'sacsPoubelle') {
    for (const [dx, dy, r] of [[0, 0, 4], [7, 2, 3], [3, 5, 3]]) {
      balayerDisque(x + dx, y + dy, r, (yy, a0, b0) => t.hl(a0, b0, yy, C.f0));
      balayerDisque(x + dx - 1, y + dy - 1, r - 1, (yy, a0, b0) => t.hl(a0, b0, yy, C.f1));
      t.pt(x + dx - 1, y + dy - r + 1, C.f3);
    }
  } else if (a.k === 'bache') {
    // Le corps sous la bâche, et le sang qui a traversé.
    for (let k = 0; k < 30; k++) balayerDisque(x + 4 + Math.round(hacher(k, 1, 41) * 26), y + 2 + Math.round(hacher(k, 2, 41) * 5), 2, (yy, a0, b0) => t.hl(a0, b0, yy, C.s1));
    for (let j = 0; j < 10; j++) for (let i = 0; i < 30; i++) {
      const dx = (i - 15) / 15, dy = (j - 5) / 5;
      if (dx * dx + dy * dy * .7 > 1.05) continue;
      const bosse = Math.sin(i * .35) * .5 + .5;
      t.pt(x + i, y - 8 + j, dx * dx + dy * dy * .7 > .8 ? C.w1 : j < 3 + bosse * 2 ? C.w2 : C.w1);
    }
    t.rect(x + 8, y - 5, 4, 2, C.s2); t.pt(x + 9, y - 3, C.s1);
  } else if (a.k === 'grille') {
    t.rect(x, y, 16, 4, C.f0);
    for (let i = 1; i < 16; i += 2) t.vl(x + i, y + 1, y + 2, C.f3);
  } else if (a.k === 'journaux') {
    ombre(11, 3);
    for (let j = 0; j < 14; j++) for (let i = 0; i < 11; i++) {
      let c = i === 0 || i === 10 || j === 0 || j === 13 ? C.f0 : C.d5;
      if (j > 2 && j < 7 && i > 1 && i < 9) c = (i + j) % 3 ? C.p2 : C.p1;
      if (i === 1 || j === 1) c = c === C.d5 ? C.g4 : c;
      t.pt(x + i, y - 14 + j, c);
    }
    t.hl(x + 2, x + 8, y - 5, C.d4); t.vl(x + 3, y - 1, y, C.f2); t.vl(x + 8, y - 1, y, C.f2);
  } else if (a.k === 'borne') {
    ombre(8, 3);
    // Flaque d'eau qui fuit de la borne.
    for (let j = 0; j < 7; j++) for (let i = -8; i < 18; i++) if (((i - 5) / 13) ** 2 + ((j - 3) / 3.5) ** 2 < 1) t.pt(x + i, y + j - 1, j === 0 ? C.b6 : C.b4);
    const L = ['..rrr..', '.rRRrr.', 'rRRrrrr', '.rRrrr.', 'grRrrrg', '.rRrrr.', '.rRrrr.', '.rRrrr.', 'rrrrrrr'];
    t.sprite(spriteDe(L, { r: C.x2, R: C.x4, g: C.f3 }), x, y - 10);
  } else if (a.k === 'plot') {
    // Plot de chantier renversé.
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) {
      const w = 2 + i * .3;
      if (Math.abs(j - 2) > w) continue;
      t.pt(x + i, y - 5 + j, i === 3 || i === 6 ? C.w2 : C.a3);
    }
    t.rect(x + 9, y - 6, 2, 7, C.f1);
  } else if (a.k === 'sacs') {
    // Muret de sacs de sable, deux rangs décalés.
    for (let rang = 0; rang < 2; rang++) for (let i = 0; i * 9 < a.l - (rang ? 9 : 0); i++) {
      const sx = x + i * 9 + (rang ? 4 : 0), sy = y - 4 - rang * 4;
      for (let j = 0; j < 5; j++) for (let k = 0; k < 9; k++) {
        if ((k === 0 || k === 8) && (j === 0 || j === 4)) continue;
        t.pt(sx + k, sy + j, k === 0 || k === 8 || j === 4 ? C.o1 : j === 0 ? C.p2 : (k + j) % 5 === 0 ? C.o1 : C.p1);
      }
    }
  } else if (a.k === 'caisse') {
    ombre(12, 3);
    for (let j = 0; j < 10; j++) for (let i = 0; i < 12; i++) t.pt(x + i, y - 10 + j, i === 0 || i === 11 || j === 0 || j === 9 ? C.f0 : j === 1 ? C.o3 : (i === 5 || i === 6) ? C.o1 : C.o3);
    ecrire3x5(t, 'RPD', x + 1, y - 8, C.f0);
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
for (let x = 16; x < W; x += 34) POURTOUR.push({ x: x + Math.round((hacher(x, 3, 88) - .5) * 10), y: 598 - Math.round(hacher(x, 4, 88) * 7), k: 'bas' });
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
    // Entrée et lanternes : la seule source saturée, elle respire.
    const vE = .74 + Math.sin(temps * 1.6) * .09, gres = Math.sin(temps * 23) > .93 ? .5 : 1;
    for (const s2 of [-1, 1]) {
      const lx = Math.round(CX + s2 * ENTREE.l * .78), ly = ENTREE.piedArc - 6;
      for (let y = ly - 14; y < ly + 14; y++) for (let x = lx - 14; x <= lx + 14; x++) {
        const d = Math.hypot(x - lx, y - ly);
        if (d > 4 && d < 14) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.a5, .4 * vE * gres * (1 - d / 14), xx, yy));
      }
      balayerPoly([[lx - 3, ly - 3], [lx + 3, ly - 3], [lx + 4, ly + 4], [lx - 4, ly + 4]], (y, a0, b0) => {
        for (let x = a0; x <= b0; x++) t.pt(x, y, x === a0 || x === b0 ? C.f1 : gres > .6 ? C.a6 : C.a4);
      });
      t.hl(lx - 3, lx + 3, ly - 4, C.f1);
    }
    // Drapeau : treize bandes qui ondulent, la face au vent plus claire.
    for (let i = 0; i < 33; i++) for (let j = 0; j < 19; j++) {
      const ond = Math.round(Math.sin(temps * 2.2 + i * .19) * 2.2 * (i / 33));
      const ombre = Math.sin(temps * 2.2 + i * .19 + 1) > .4;
      let c = Math.floor(j / 19 * 13) % 2 ? (ombre ? C.w1 : C.d3) : (ombre ? C.d1 : C.d2);
      if (i < 14 && j < 10) c = (i % 3 === 1 && j % 3 === 1) ? C.d3 : (ombre ? C.e3 : C.d4);
      t.pt(MAT + 2 + i, 3 + j + ond, c);
    }
    // Gyrophares du fourgon.
    {
      const vB = Math.max(0, Math.cos(temps * 2.4)), vR = Math.max(0, -Math.cos(temps * 2.4));
      t.rect(FOURGON.x + 24, FOURGON.y - 3, 16, 3, C.f1);
      t.rect(FOURGON.x + 25, FOURGON.y - 2, 7, 2, vB > .1 ? C.g4 : C.g1);
      t.rect(FOURGON.x + 33, FOURGON.y - 2, 6, 2, vR > .1 ? C.x4 : C.x1);
      for (const [col, val, dx] of [[C.g3, vB, 28], [C.x3, vR, 36]]) {
        if (val < .1) continue;
        for (let y = FOURGON.y - 26; y < FOURGON.y + 30; y++) for (let x = FOURGON.x + dx - 40; x < FOURGON.x + dx + 40; x++) {
          const d = Math.hypot(x - FOURGON.x - dx, (y - FOURGON.y) * 1.3);
          if (d < 40 && d > 3) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, col, .22 * val * (1 - d / 40), xx, yy));
        }
      }
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

    // Flaques de sodium qui respirent doucement (une lampe fatigue).
    {
      const [lx, ly, r] = LAMPES[1];
      const f = .5 + .5 * Math.sin(temps * .7);
      for (let y = Math.max(BANDE, ly - r); y < Math.min(H, ly + r); y++) for (let x = lx - r; x < lx + r; x++) {
        const d = Math.hypot((x - lx) / 1.4, y - ly) / r;
        if (d < 1 && !dansTerrain(x, y)) t.modifier(x, y, (c, a, b) => PAL.teinter(c, C.b0, .25 * f * (1 - d), a, b));
      }
    }
    // Gouttes qui tombent dans la flaque de la borne, en ronds qui s'élargissent.
    {
      const b0 = ACCESSOIRES.find(a => a.k === 'borne');
      const q = (temps * .6) % 1, r = 1 + q * 7;
      for (let a = 0; a < Math.PI * 2; a += .2) {
        const x = Math.round(b0.x + 5 + Math.cos(a) * r * 1.6), y = Math.round(b0.y + 2 + Math.sin(a) * r * .6);
        if (q < .8) t.modifier(x, y, (c, aa, bb) => PAL.teinter(c, C.b7, .6 * (1 - q), aa, bb));
      }
    }
    // Zombies à gauche, ceux qui tiennent la ligne à droite. Tout va lentement :
    // un pas toutes les secondes, un balancement qui prend son temps.
    POURTOUR.forEach((p, i) => {
      // Personne ne se tient debout sur une voiture ni sur un accessoire.
      if (VOITURES.some(v => Math.abs(v.x - p.x) < 26 && p.y > v.y - 30 && p.y < v.y + 62)) return;
      const gauche = p.k === 'gauche' || (p.k === 'bas' && p.x < CX);
      if (p.k === 'bas' && !libre(p.x, p.y)) return;
      if (gauche) {
        if (hacher(i, 5, 90) < .24) return;
        const f = Math.floor(temps * 1.1 + i * .37) & 1;
        const s = ZOMBIES[i % 3][f];
        const traine = Math.round(Math.sin(temps * .45 + i) * 3);
        const tangue = Math.sin(temps * 1.1 * Math.PI + i) > .5 ? 1 : 0;
        t.sprite(s, p.x - 8 + traine, p.y - 32 + tangue);
      } else {
        if (hacher(i, 9, 90) < .45) return;
        const f = Math.floor(temps * .6 + i * .5) & 1;
        t.sprite(FLICS[f], p.x - 9, p.y - 32, true);
        // Lampe torche : un cône qui balaie lentement vers le terrain.
        const ang = Math.PI + Math.sin(temps * .35 + i) * .3 + (p.k === 'bas' ? Math.PI / 2 * .8 : 0);
        const lx = p.x - 8, ly = p.y - 20;
        balayerPoly([[lx, ly], [lx + Math.cos(ang - .22) * 60, ly + Math.sin(ang - .22) * 60], [lx + Math.cos(ang + .22) * 60, ly + Math.sin(ang + .22) * 60]], (yy, a, b) => {
          for (let xx = a; xx <= b; xx++) {
            const d = Math.hypot(xx - lx, yy - ly) / 60;
            t.modifier(xx, yy, (c, x2, y2) => PAL.teinter(c, C.a6, .2 * (1 - d), x2, y2));
          }
        });
      }
    });
    // Les sacs de sable passent devant les jambes des policiers.
    for (const a of ACCESSOIRES) if (a.k === 'sacs') accessoire(t, a);
    // Rubalise jaune tendue devant la ligne, qui ondule à peine.
    for (let x = 640; x < W; x++) {
      const u = (x - 640) / 60;
      const y = Math.round(575 + Math.abs(Math.sin(u * Math.PI)) * 5 + Math.sin(temps * .8 + x * .05) * .8);
      t.pt(x, y, (x >> 3) % 3 === 0 ? C.f0 : C.j2); t.pt(x, y + 1, C.j1);
    }
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
