// ---------------------------------------------------------------------------
// KONOHA EN PIXEL ART HD — le terrain de Naruto.
//
// Un terrain d'entraînement du village caché de la Feuille, en plein après-
// midi. Au fond le rocher des Hokage et ses quatre visages, les toits du
// village et leurs réservoirs d'eau ronds ; le terrain est une pelouse tondue
// en bandes, lignes à la craie, la Feuille tracée au centre. Les cages sont
// des cadres de bois laqué rouge, plancher bleu bandeau pour les 3 et orange
// Naruto pour le 5.
//
// Sur les bords : les trois poteaux de l'épreuve des clochettes, l'échoppe
// Ichiraku, l'arbre et sa balançoire, une cible criblée de kunaï, une
// lanterne de pierre ; en bas la rue et ses lanternes de papier.
//
// Pas de règle de jeu : c'est un décor. Ce qui bouge le fait lentement —
// nuages, feuilles portées par le vent, balançoire, clochettes, lanternes,
// vapeur des ramen.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, bruit, hacher, lisse, balayerDisque, balayerEllipse, balayerPoly, spriteDe, spriteChiffre } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];
const ROCHER = { x0: 262, x1: 698 };
// Hashirama, Tobirama, Hiruzen, Minato, Tsunade : les cinq visages, serrés.
const HOKAGE = [{ x: 338, y: 40 }, { x: 410, y: 46 }, { x: 480, y: 32 }, { x: 552, y: 46 }, { x: 622, y: 36 }];
const ANNEAU = 62;

const PAL = new Palette({
  // Ciel d'après-midi
  c0: '#2f6fc0', c1: '#4a8ad4', c2: '#6fa6e0', c3: '#96c2ea', c4: '#bfdcf2', c5: '#e4f2fa', w: '#ffffff', n1: '#a9bfd8',
  // Roche du monument
  r0: '#3e3128', r1: '#6a5644', r2: '#8e765e', r3: '#b0987a', r4: '#cbb696', r5: '#e2d2b2',
  // Feuillage
  v0: '#123a1e', v1: '#1e5a2a', v2: '#2e7a34', v3: '#4a9a3e', v4: '#74b84c', v5: '#a6d468',
  // Pelouse du terrain
  g0: '#2a5a24', g1: '#3a7a2e', g2: '#468832', g3: '#529638', g4: '#62a642', g5: '#7cba50', g6: '#98cc62', g7: '#8a9a4a', g8: '#a8a462', g9: '#bca878',
  // Terre battue
  e0: '#4a3220', e1: '#6e4c30', e2: '#8e6a44', e3: '#ad885a', e4: '#c9a676', e5: '#dcc094',
  // Toits : tuiles rouges, ardoise
  t0: '#5a1c16', t1: '#8a2c20', t2: '#b4442c', t3: '#d2643c',
  d0: '#2a2a36', d1: '#44465a', d2: '#646a80', d3: '#8a90a4',
  // Murs
  m1: '#a8987a', m2: '#cfc2a2', m3: '#ece2c8', m4: '#fbf6e6',
  // Bois
  b0: '#2e1c10', b1: '#4e3220', b2: '#70492c', b3: '#946338', b4: '#b8864e', b5: '#d8b074',
  // Laque rouge
  l0: '#4a0e0e', l1: '#8e1c16', l2: '#c0302a', l3: '#e2553c',
  // Vert de la grande porte
  q0: '#16301c', q1: '#24502c', q2: '#34703c', q3: '#529450',
  // Bleu bandeau, orange Naruto
  u1: '#1e4e8e', u2: '#2e6cc0', u3: '#5a96e0',
  o1: '#b4501a', o2: '#f07a22', o3: '#ffab4a',
  // Métal, or des clochettes, lueur des lanternes
  s1: '#4e5664', s2: '#8a94a4', s3: '#c4ccd8', s4: '#eef2f8',
  j1: '#a8761e', j2: '#e2b23a', j3: '#fff0a0',
  y1: '#ffd87a', y2: '#fff2c4',
  // Fleurs
  f1: '#e87aa0', f2: '#fff4f8',
  k: '#1a1a22'
});
const C = PAL.c;
const CIEL = PAL.sous(['c0', 'c1', 'c2', 'c3', 'c4', 'c5']);
const NUAGE = PAL.sous(['c3', 'c4', 'c5', 'w', 'n1']);
const ROCHE = PAL.sous(['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
const HERBE = PAL.sous(['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9']);
const TERRE = PAL.sous(['e0', 'e1', 'e2', 'e3', 'e4', 'e5']);
const FEUILLAGE = PAL.sous(['v0', 'v1', 'v2', 'v3', 'v4', 'v5']);

const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
const dansCage = (x, y) => y >= BUT.haut - 8 && y < BUT.bas + 8 && (x < COURT.left + 2 || x >= COURT.right - 2);

// ---------------------------------------------------------------------------
// Le fond fixe, en deux sens (normal, et miroir pour l'invité en ligne, où
// seuls les chiffres des cages changent).
// ---------------------------------------------------------------------------
let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
let CIELM = null;           // 1 là où les nuages peuvent passer
const CHIFFRE = { 3: spriteChiffre(3, C.m4, C.m3, C.m2, C.k), 5: spriteChiffre(5, C.m4, C.m3, C.m2, C.k) };

// Le haut du rocher : des crêtes déchiquetées, en pics.
function haumRocher(x) {
  if (x < ROCHER.x0 || x > ROCHER.x1) return 99;
  const bord = Math.min(x - ROCHER.x0, ROCHER.x1 - x);
  const pic = Math.abs(((x * .029 + fbm(x * .02, 0, 2, 3) * .6) % 1) - .5) * 2;
  return Math.round(3 + pic * 12 + fbm(x * .08, 0, 2, 4) * 4 + lisse(30, 0, bord) * 30);
}

function peindreCiel(t) {
  for (let y = 0; y < 60; y++) for (let x = 0; x < W; x++) {
    const k = y / 60;
    const r = 47 + k * 150, g = 111 + k * 110, b = 192 + k * 50;
    t.px[y * W + x] = CIEL.tramer(r, g, b, x, y, 1.8);
    CIELM[y * W + x] = 1;
  }
  // Collines boisées au loin, de part et d'autre du rocher.
  for (let x = 0; x < W; x++) {
    const top = Math.round(34 + Math.sin(x * .011 + 1) * 5 + fbm(x * .04, 1, 3, 4) * 8);
    for (let y = top; y < 62; y++) {
      const c = y === top ? C.v3 : FEUILLAGE.tramer(70 - (y - top) * 1.2, 120 - (y - top) * 2, 80, x, y, 2);
      t.pt(x, y, c); if (y < 60) CIELM[y * W + x] = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Le rocher des Hokage. La falaise et les cinq visages sont un relief : une
// carte de hauteurs, éclairée par le haut à gauche, plutôt que des traits
// dessinés. Chaque Hokage a sa coiffure et ses marques, creusées dans la
// pierre : Hashirama, Tobirama, Hiruzen, Minato, Tsunade.
// ---------------------------------------------------------------------------
const TETE = { rx: 21, ry: 24 };
const gs = z => Math.exp(-z * z);
// Une mèche en lame : une arête saillante qui s'amincit jusqu'à la pointe,
// biseautée sur les deux flancs — c'est ce qui donne les coiffures en
// feuilles de la sculpture.
function lame(x, y, bx, by, a, L, lw, hb) {
  const dx = x - bx, dy = y - by, ca = Math.cos(a), sa = Math.sin(a);
  const s = dx * ca + dy * sa, d = -dx * sa + dy * ca;
  if (s < -3 || s > L) return -1;
  const w = lw * (s < 0 ? 1 : 1 - s / L) + .4;
  const q = Math.abs(d) / w;
  if (q > 1) return -1;
  return hb * (1 - .35 * Math.max(0, s) / L) - q * q * .5;
}
const deg = a => a * Math.PI / 180;
// Les mèches de chacun, en px depuis le centre du visage : [bx, by, angle, longueur, largeur].
const MECHES = [
  [],
  // Tobirama : des épis rejetés vers le haut et l'arrière.
  [-165, -140, -115, -92, -68, -44, -22].map((a, i) => [0, -8, deg(a), [14, 19, 23, 24, 22, 18, 13][i], 7.5]),
  // Hiruzen : une couronne de pointes dressées, comme un feuillage.
  [-150, -126, -106, -90, -74, -54, -30].map((a, i) => [0, -9, deg(a), [13, 21, 27, 30, 27, 21, 13][i], 8]),
  // Minato : des pointes en étoile tout autour, et deux longues mèches.
  [-178, -158, -138, -118, -100, -80, -62, -42, -22, -2].map((a, i) => [0, -6, deg(a), 21 + (i % 2) * 5, 6])
    .concat([[-16, -6, deg(96), 20, 3.5], [16, -6, deg(84), 20, 3.5], [-6, -16, deg(100), 10, 3], [6, -16, deg(80), 10, 3]]),
  // Tsunade : deux longs pans, raie au milieu.
  [[-17, -12, deg(92), 40, 7], [17, -12, deg(88), 40, 7], [-11, -18, deg(118), 14, 6], [11, -18, deg(62), 14, 6]]
];
function distSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - ax - vx * t, py - ay - vy * t);
}
function hauteurTete(n, x, y) {
  const T = HOKAGE[n], dx = x - T.x, dy = y - T.y;
  const u = dx / TETE.rx, v = dy / TETE.ry, au = Math.abs(u);
  let h = -1;
  const uj = v > 0 ? u / (1 - .26 * v) : u;
  const e = uj * uj + v * v;
  if (e < 1) {
    h = .35 + Math.sqrt(1 - e) * .75;
    h += .11 * gs((v + .3) / .07) * gs(u / .6);                           // arcades
    h -= .18 * gs((au - .36) / .14) * gs((v + .1) / .08);                 // orbites
    h -= .08 * gs((au - .36) / .12) * gs((v + .1) / .025);                // paupières
    h += .18 * gs(u / .08) * lisse(-.2, -.05, v) * lisse(.34, .22, v);    // arête du nez
    h += .05 * gs(u / .14) * gs((v - .3) / .04);                          // bout du nez
    h -= .1 * gs((v - .54) / .035) * gs(u / .28);                         // bouche
    h += .06 * gs((au - .5) / .16) * gs((v - .12) / .14);                 // pommettes
    h -= .05 * gs((au - .62) / .05) * lisse(.1, .4, v);                   // mâchoire marquée
    if (n === 1) {
      // Tobirama : ses marques, et la pierre fêlée.
      h -= .12 * gs((au - .44) / .04) * lisse(-.02, .06, v) * lisse(.42, .32, v);
      h -= .12 * gs(u / .04) * lisse(.72, .78, v) * lisse(.98, .9, v);
      const f = Math.min(distSeg(u, v, .12, -.5, .3, -.05), distSeg(u, v, .3, -.05, .18, .45), distSeg(u, v, -.3, .2, -.5, .6));
      h -= .1 * gs(f / .025);
    }
    if (n === 2) {
      h -= .06 * gs((v + .4) / .025) * gs(u / .4);
      h -= .06 * gs((au - .3 - (v - .2) * .3) / .03) * lisse(.15, .25, v) * lisse(.6, .5, v);
    }
    if (n === 4 && au / .07 + Math.abs(v + .36) / .08 < 1) h -= .08;
  }
  // Le crâne sous les cheveux, pour qu'il n'y ait jamais de trou.
  const r = Math.hypot(u / 1.06, (v + .1) / 1.1);
  const calotte = lisse(-.26 + .3 * u * u, -.42 + .3 * u * u, v) * lisse(1.04, .94, r);
  if (calotte > .03) {
    let c = .42 + .5 * Math.sqrt(Math.max(0, 1 - r * r));
    if (n === 0) {
      // Hashirama : cheveux lisses et le bandeau qui ceint le front.
      if (v > -.56 && v < -.34) c += .16;
      c -= .1 * (gs((v + .56) / .03) + gs((v + .34) / .03));
      c += Math.sin(u * 22 - v * 6) * .02 * (v < -.56 ? 1 : 0);
    }
    if (n === 4) c -= .1 * gs(u / .05);
    h = Math.max(h, c * calotte + (1 - calotte) * -.4);
  }
  if (n === 0) h = Math.max(h, (lisse(.8, .88, au) * lisse(1.12, 1.04, au) * lisse(.1, -.1, v) * lisse(-.7, -.5, v)) * .8 - .2);
  for (const [bx, by, a, L, lw] of MECHES[n]) h = Math.max(h, lame(dx, dy, bx, by, a, L, lw, 1.18));
  if (n === 2) h = Math.max(h, lame(dx, dy, 0, 22, deg(90), 13, 4, .72));   // la barbiche en pointe
  return h;
}
function peindreRocher(t) {
  const x0 = ROCHER.x0 - 4, x1 = ROCHER.x1 + 4, Y = 74;
  const Wd = x1 - x0 + 3;
  const HT = new Float32Array(Wd * Y), TETES = new Uint8Array(Wd * Y);
  for (let y = 0; y < Y; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    // La falaise : des pans de roche en biais, fissurés.
    let h = .24 + Math.abs(Math.sin(x * .09 + y * .05 + fbm(x * .02, y * .04, 2, 5) * 3)) * .08 + fbm(x * .06, y * .08, 3, 8) * .12;
    h -= .08 * gs((Math.sin(x * .045 - y * .02) * 30 + (x % 97) * .2 - 14) / 1.2) * (fbm(x * .1, y * .1, 1, 9) > .5 ? 1 : 0);
    for (let n = 0; n < HOKAGE.length; n++) if (Math.abs(x - HOKAGE[n].x) < 42) {
      const hh = hauteurTete(n, x, y);
      if (hh > h) { h = hh; TETES[y * Wd + (x - x0 + 1)] = 1; }
    }
    HT[y * Wd + (x - x0 + 1)] = h;
  }
  const lx = -.55, ly = -.62, lz = .56;
  for (let x = x0; x <= x1; x++) {
    const top = haumRocher(x);
    for (let y = 0; y < 72; y++) {
      const i = y * Wd + (x - x0 + 1);
      if (y < top && !(TETES[i] && HT[i] > .3)) continue;
      const gx = (HT[i + 1] - HT[i - 1]) * 9, gy = (HT[Math.min(Y - 1, y + 1) * Wd + (x - x0 + 1)] - HT[Math.max(0, y - 1) * Wd + (x - x0 + 1)]) * 9;
      const nz = 1 / Math.hypot(gx, gy, 1);
      const lum = Math.max(0, -gx * nz * lx - gy * nz * ly + nz * lz);
      const devant = HT[Math.max(0, y - 2) * Wd + (x - x0 - 1)] - HT[i];
      const porte = devant > .12 ? .55 : 1;
      const bords = lisse(ROCHER.x0 + 40, ROCHER.x0, x) + lisse(ROCHER.x1 - 40, ROCHER.x1, x);
      const l = (46 + lum * 205 * porte + HT[i] * 22) * (1 - bords * .18) - Math.max(0, y - 58) * 1.5;
      t.px[y * W + x] = ROCHE.tramer(l, l * .86, l * .7, x, y, 2.2);
      if (y < 60) CIELM[y * W + x] = 0;
    }
    // Des touffes d'arbres accrochées aux crêtes, par endroits.
    if (top < 60 && fbm(x * .05, 7, 2, 6) > .55 && HOKAGE.every(T => Math.abs(x - T.x) > 34)) {
      const h = 2 + Math.round(fbm(x * .15, 2, 2, 6) * 6);
      for (let k = 0; k < h; k++) {
        const y = top - k;
        if (y < 0) continue;
        t.pt(x, y, k === h - 1 ? C.v4 : k > h - 3 ? C.v3 : C.v2);
        if (y < 60) CIELM[y * W + x] = 0;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Le village, en deux rangs : maisons à colombages, toits de tuiles ou
// d'ardoise avec leur faîtage, réservoirs d'eau ronds, arbres entre les
// maisons, poteaux et fils électriques ; la tour du Hokage à gauche.
// ---------------------------------------------------------------------------
const FEU = spriteDe(['..#..', '#.#.#', '#.#.#', '..#..', '.#.#.', '#...#'], { '#': C.l1 });
function tourHokage(t, tx) {
  for (let y = 22; y < 76; y++) for (let x = tx - 20; x <= tx + 20; x++) {
    const u = (x - tx) / 20;
    let c = u < -.6 ? C.l3 : u < .2 ? C.l2 : u < .75 ? C.l1 : C.l0;
    const r = (y - 22) % 14;
    if (r === 0) c = C.l0;
    if (r >= 5 && r <= 8 && (x - tx + 40) % 6 < 3) c = r === 5 ? C.b0 : C.d0;
    t.pt(x, y, c); if (y < 60) CIELM[y * W + x] = 0;
  }
  // Toit en cône aplati, et le disque blanc marqué du feu.
  for (let y = 12; y < 22; y++) {
    const demi = 10 + (y - 12) * 1.4;
    for (let x = Math.round(tx - demi); x <= tx + demi; x++) { t.pt(x, y, y === 21 ? C.l0 : x < tx - 3 ? C.l3 : C.l2); CIELM[y * W + x] = 0; }
  }
  t.pt(tx, 11, C.l0); t.pt(tx, 10, C.l1);
  balayerDisque(tx, 30, 6, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.m4); });
  t.sprite(FEU, tx - 2, 27);
}
function maison(t, x0, base, l, hm, id, porte) {
  const ardoise = hacher(id, 1, 13) < .38;
  const T = ardoise ? [C.d0, C.d1, C.d2, C.d3] : [C.t0, C.t1, C.t2, C.t3];
  const creme = hacher(id, 4, 13) < .7;
  const yMur = base - hm;
  for (let y = yMur; y < base; y++) for (let x = x0; x < x0 + l; x++) {
    let c = creme ? C.m3 : C.m2;
    if (x === x0 || x === x0 + l - 1 || (x - x0) % 12 === 0) c = C.b2;       // colombages
    if (hm > 13 && y === yMur + (hm >> 1)) c = C.b2;
    if (x > x0 + l - 4 && c !== C.b2) c = C.m1;                              // ombre sur la droite
    if (y === base - 1) c = C.m1;
    t.pt(x, y, c);
  }
  // Fenêtres à volets, et une porte au rang de devant.
  for (let wx = x0 + 3; wx + 5 < x0 + l - 2; wx += 12) for (const wy of hm > 13 ? [yMur + 2, yMur + (hm >> 1) + 2] : [yMur + 2]) {
    for (let y = wy; y < wy + 4; y++) for (let x = wx; x < wx + 5; x++) t.pt(x, y, y === wy ? C.b3 : x === wx + 2 ? C.b2 : C.d0);
    t.pt(wx - 1, wy + 1, C.b3); t.pt(wx + 5, wy + 1, C.b3);
  }
  if (porte) { const px = x0 + l - 10; for (let y = base - 7; y < base; y++) for (let x = px; x < px + 5; x++) t.pt(x, y, y === base - 7 ? C.b2 : x === px ? C.b1 : C.b3); }
  // Toit à deux pans vu de face : rangs de tuiles, faîtage sombre, avant-toit
  // qui déborde et jette son ombre sur le mur.
  const hr = 6 + (l > 40 ? 2 : 0);
  for (let k = 0; k < hr; k++) {
    const y = yMur - k - 1;
    const a = x0 - 3 + Math.round(k * 1.3), b = x0 + l + 2 - Math.round(k * 1.3);
    for (let x = a; x <= b; x++) {
      let c = k % 2 ? T[2] : T[3];
      if ((x - a + (k & 1) * 2) % 4 === 0) c = T[1];
      if (k === 0) c = T[1];
      if (k === hr - 1) c = T[0];
      if (x === a || x === b) c = T[0];
      t.pt(x, y, c); if (y >= 0 && y < 60) CIELM[y * W + x] = 0;
    }
  }
  for (let x = x0; x < x0 + l; x++) t.teinte(x, yMur, PAL, C.b0, .5);
  // Un réservoir d'eau rond sur certains toits, sur ses pieds.
  if (hacher(id, 2, 14) < .4) {
    const rx = x0 + 5 + Math.floor(hacher(id, 3, 15) * Math.max(1, l - 16)), ry = yMur - hr - 1;
    for (let y = ry - 9; y <= ry - 2; y++) for (let x = rx; x < rx + 10; x++) {
      const u = (x - rx) / 9;
      let c = u < .25 ? C.s3 : u < .7 ? C.s2 : C.s1;
      if (y === ry - 6 || y === ry - 3) c = C.s1;
      t.pt(x, y, c); if (y >= 0 && y < 60) CIELM[y * W + x] = 0;
    }
    for (let x = rx; x < rx + 10; x++) { t.pt(x, ry - 10, x < rx + 5 ? C.s4 : C.s3); if (ry - 10 >= 0) CIELM[(ry - 10) * W + x] = 0; }
    for (const px of [rx + 1, rx + 8]) { t.pt(px, ry - 1, C.s1); t.pt(px, ry, C.s1); }
  }
}
function arbreRond(t, cx, cy, r) {
  balayerDisque(cx, cy, r, (y, a, b) => { for (let x = a; x <= b; x++) {
    const l = 130 - (y - cy) / r * 45 - (x - cx) / r * 20 + (hacher(x >> 1, y >> 1, 16) - .5) * 40;
    t.px[y * W + x] = FEUILLAGE.tramer(l * .55, l, l * .45, x, y, 2);
    if (y < 60) CIELM[y * W + x] = 0;
  } });
}
function peindreVillage(t) {
  tourHokage(t, 236);
  for (const rang of [0, 1]) {
    if (rang) {
    // Des bosquets au pied du rocher, comme sur la sculpture.
      for (let i = 0; i < 16; i++) arbreRond(t, ROCHER.x0 + 14 + i * 27 + Math.floor(hacher(i, 5, 20) * 10), 70 + Math.floor(hacher(i, 6, 20) * 3), 5 + Math.floor(hacher(i, 7, 20) * 3));
    }
    const base = rang ? 83 : 70;
    let x = rang ? -14 : -30, i = 0;
    while (x < W) {
      const l = 26 + Math.floor(hacher(i, rang, 10) * 26);
      const devantRocher = x + l > ROCHER.x0 + 10 && x < ROCHER.x1 - 10;
      const basse = rang && devantRocher;
      if (!rang && x < 262 && x + l > 212) { x = 262; continue; }
      if (!rang && devantRocher) { x += l; i++; continue; }
      const hm = basse ? 8 + Math.floor(hacher(i, rang, 11) * 3) : (rang ? 9 : 12) + Math.floor(hacher(i, rang, 11) * 8);
      maison(t, x, base, l, hm, i * 7 + rang * 131, rang === 1);
      if (hacher(i, rang, 17) < .3) arbreRond(t, x + l + 2, base - 6, 5 + Math.floor(hacher(i, rang, 18) * 3));
      x += l + Math.floor(hacher(i, rang, 12) * 6) - 1;
      i++;
    }
  }
  // Poteaux et fils électriques le long de la rue de devant.
  const poteaux = [];
  for (let x = 40; x < W; x += 96 + Math.floor(hacher(x, 0, 19) * 20)) poteaux.push(x);
  for (const px of poteaux) {
    for (let y = 62; y < 84; y++) { t.pt(px, y, C.b1); t.pt(px + 1, y, C.b2); }
    t.hl(px - 5, px + 6, 64, C.b1); t.hl(px - 4, px + 5, 67, C.b1);
  }
  for (let i = 0; i + 1 < poteaux.length; i++) for (const [dy, s] of [[64, -5], [64, 6], [67, -4]]) {
    const a = poteaux[i] + s, b = poteaux[i + 1] + s;
    for (let x = a; x <= b; x++) { const u = (x - a) / (b - a); t.pt(x, Math.round(dy + 4 * u * (1 - u) * 3), C.k); }
  }
}
// ---------------------------------------------------------------------------
// La pelouse : tondue en bandes, usée jusqu'à la terre devant les cages et au
// centre, là où l'on court le plus.
// ---------------------------------------------------------------------------
function usure(x, y) {
  const devantG = Math.hypot((x - COURT.left) / 1.4, (y - CY) / 1.6);
  const devantD = Math.hypot((COURT.right - x) / 1.4, (y - CY) / 1.6);
  const centre = Math.hypot(x - CX, y - CY);
  const d = Math.min(devantG, devantD);
  const n = fbm(x * .03, y * .03, 2, 20);
  return Math.max(lisse(70, 10, d + (n - .5) * 30) * .8, lisse(34, 8, centre + (n - .5) * 20) * .45);
}
function couleurHerbe(x, y) {
  const dansT = dansTerrain(x, y);
  const n = fbm(x * .02, y * .025, 3, 21);
  let r = 88, g = 158, b = 62;
  if (dansT) {
    // Bandes de tonte, dix sur la largeur.
    const bande = Math.floor((x - COURT.left) / 82) % 2 ? 7 : -5;
    r += bande * .6; g += bande; b += bande * .5;
  } else { r -= 8; g -= 12; b -= 6; }
  const l = (n - .5) * 22;
  r += l * .6; g += l; b += l * .5;
  const u = dansT ? usure(x, y) : 0;
  if (u > 0) { r += (168 - r) * u; g += (160 - g) * u; b += (100 - b) * u; }
  return [r, g, b];
}

// Craie : un trait de trois pixels, un peu mangé par l'herbe.
function craie(t, x, y) {
  x = Math.round(x); y = Math.round(y);
  const h = hacher(x, y, 30);
  t.pt(x, y, h < .12 ? C.g5 : h < .3 ? C.m3 : C.m4);
}
function traitCraie(t, pts, ep = 1) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const L = Math.max(1, Math.hypot(bx - ax, by - ay));
    for (let s = 0; s <= L; s += .5) {
      const x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L;
      for (let dx = -ep; dx <= ep; dx++) for (let dy = -ep; dy <= ep; dy++) if (dx * dx + dy * dy <= ep * ep + .5) craie(t, x + dx, y + dy);
    }
  }
}
function peindreLignes(t) {
  const { left: L, right: R, top: T, bottom: B } = COURT;
  for (let x = L; x < R; x++) for (let k = 0; k < 3; k++) { craie(t, x, T + k); craie(t, x, B - 1 - k); }
  for (let y = T; y < B; y++) for (let k = 0; k < 3; k++) {
    if (y < BUT.haut || y >= BUT.bas) { craie(t, L + k, y); craie(t, R - 1 - k, y); }
    if (Math.abs(y - CY) > ANNEAU) craie(t, CX - 1 + k, y);
  }
  const cercle = [];
  for (let a = 0; a <= 64; a++) cercle.push([CX + Math.cos(a / 64 * Math.PI * 2) * ANNEAU, CY + Math.sin(a / 64 * Math.PI * 2) * ANNEAU]);
  traitCraie(t, cercle);
  for (const tr of feuilleKonoha(CX + 2, CY - 2, 1)) traitCraie(t, tr);
}

// Le symbole de la Feuille, en tracés : la spirale, le contour de la feuille
// qui finit en pointe en haut à droite, et le petit triangle de la tige.
function feuilleKonoha(cx, cy, k) {
  const o = [cx - 3 * k, cy + 4 * k], R = 24 * k;
  const spirale = [];
  for (let a = 0; a <= Math.PI * 3.6; a += .06) {
    const r = (1.5 + a * 1.55) * k;
    spirale.push([o[0] + Math.cos(a - 1.2) * r, o[1] + Math.sin(a - 1.2) * r]);
  }
  const contour = [];
  for (let a = -1.3; a >= -Math.PI * 2 + .3; a -= .06) contour.push([o[0] + Math.cos(a) * R, o[1] + Math.sin(a) * R]);
  const pointe = [cx + 26 * k, cy - 30 * k];
  contour.push(pointe, contour[0]);
  const tige = [[cx - 30 * k, cy + 22 * k], [cx - 40 * k, cy + 30 * k], [cx - 26 * k, cy + 32 * k], [cx - 30 * k, cy + 22 * k]];
  return [spirale, contour, tige];
}

// ---------------------------------------------------------------------------
// Les cages, à la façon de la grande porte de Konoha : cadre de bois peint en
// vert, poteaux coiffés de petits toits de tuiles, un toit de tuiles le long
// du dos. Plancher bleu bandeau (3) et orange Naruto (5), cloutés de fer ; une
// plaque de bandeau frontal gravée de la Feuille au-dessus.
// ---------------------------------------------------------------------------
function poutreH(t, xa, xb, y0) {
  const R = [C.q3, C.q2, C.q2, C.q1, C.q0];
  for (let x = xa; x <= xb; x++) for (let k = 0; k < 5; k++) t.pt(x, y0 + k, R[k]);
  for (let x = xa - 1; x <= xb + 1; x++) { t.teinte(x, y0 + 5, PAL, C.g0, .45); t.teinte(x, y0 + 6, PAL, C.g0, .2); }
}
function poutreV(t, x0, ya, yb) {
  const R = [C.q0, C.q2, C.q3, C.q2, C.q1];
  for (let y = ya; y <= yb; y++) for (let k = 0; k < 5; k++) t.pt(x0 + k, y, R[k]);
}
// Poteau vu d'en haut, coiffé d'un petit toit de tuiles en pyramide : quatre
// pans de tuiles rondes, arêtiers clairs, épi doré au sommet. Les pans du haut
// et de gauche prennent la lumière.
function poteauCoiffe(t, cx, cy) {
  const R = 6;
  for (let k = -3; k <= R + 3; k++) t.teinte(cx - R + 2 + k, cy + R + 1, PAL, C.g0, .45);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const ax = Math.abs(x), ay = Math.abs(y);
    let c;
    if (Math.max(ax, ay) === R) c = C.d0;
    else if (ax === ay) c = (x < 0 && y < 0) || (x < 0) !== (y < 0) ? C.d3 : C.d2;
    else {
      const clair = ay > ax ? y < 0 : x < 0;
      const rang = ay > ax ? x : y;
      c = (rang + 20) % 2 ? (clair ? C.d3 : C.d2) : (clair ? C.d2 : C.d1);
    }
    t.pt(cx + x, cy + y, c);
  }
  t.pt(cx, cy, C.j2); t.pt(cx - 1, cy - 1, C.j3);
}
const FEUILLE_GRAVEE = spriteDe([
  '......##.',
  '...####.#',
  '..#.....#',
  '.#..##..#',
  '.#.#..#.#',
  '.#.#.#..#',
  '.#..#..#.',
  '#.#...##.',
  '##.###...'
], { '#': C.s1 });
function plaque(t, cx, cy) {
  t.hl(cx - 16, cx + 16, cy, C.u1);
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 12; x <= cx + 12; x++) {
    const bord = Math.abs(x - cx) === 12 || Math.abs(y - cy) === 6;
    t.pt(x, y, bord ? C.s1 : x - cx + y - cy < -8 ? C.s4 : y > cy + 3 ? C.s2 : C.s3);
  }
  t.sprite(FEUILLE_GRAVEE, cx - 4, cy - 4);
  for (const x of [cx - 10, cx + 10]) { t.pt(x, cy - 4, C.s1); t.pt(x, cy + 4, C.s1); }
}
// Les zones sont trois makimono déroulés, pendus à un mur de bois sombre :
// rouleaux de bois à embouts dorés, bordure de tissu bleu bandeau (3) ou
// orange Naruto (5), chiffre à l'encre et sceau rouge.
const ENCRE = { 3: spriteChiffre(3, C.k, C.k, C.d0, C.m3), 5: spriteChiffre(5, C.k, C.k, C.d0, C.m3) };
function makimono(t, x0, x1, y0, y1, cinq) {
  const tissu = cinq ? [C.o1, C.o2, C.o3] : [C.u1, C.u2, C.u3];
  for (let y = y0 + 4; y < y1 - 4; y++) for (let x = x0 + 1; x <= x1 - 1; x++) {
    const bx = Math.min(x - x0 - 1, x1 - 1 - x), by = Math.min(y - y0 - 4, y1 - 5 - y);
    let c;
    if (bx < 4 || by < 3) c = bx === 0 ? tissu[0] : bx === 1 || by === 0 ? tissu[2] : tissu[1];
    else c = hacher(x, y, 32) < .06 ? C.m2 : (x + y) % 17 === 0 ? C.m3 : C.m4;
    t.pt(x, y, c);
  }
  for (const [ry, haut] of [[y0, true], [y1 - 5, false]]) {
    for (let y = ry; y < ry + 5; y++) for (let x = x0 - 2; x <= x1 + 2; x++) {
      const k = y - ry, bout = x < x0 + 1 || x > x1 - 1;
      t.pt(x, y, bout ? (k === 0 ? C.j3 : k < 3 ? C.j2 : C.j1) : k === 0 ? C.b5 : k < 3 ? C.b4 : k === 4 ? C.b1 : C.b3);
    }
    if (haut) { t.ligne((x0 + x1) / 2 - 6, ry, (x0 + x1) / 2, ry - 4, C.l1); t.ligne((x0 + x1) / 2 + 6, ry, (x0 + x1) / 2, ry - 4, C.l1); t.pt((x0 + x1) / 2, ry - 5, C.j2); }
  }
  for (let x = x0 + 1; x <= x1 - 1; x++) t.teinte(x, y1, PAL, C.k, .5);
  // Le sceau rouge, en bas à droite.
  const sx = x1 - 10, sy = y1 - 13;
  for (let y = sy; y < sy + 5; y++) for (let x = sx; x < sx + 5; x++) t.pt(x, y, (x === sx + 2 && y > sy) || (y === sy + 2 && x > sx) ? C.m4 : C.l2);
}
function peindreCage(t, cote) {
  const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, x1 = x0 + BUT.prof - 1;
  // Le mur de bois sombre, planches verticales.
  for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x <= x1; x++) {
    const j = (x - x0) % 8;
    t.pt(x, y, j === 0 ? C.b0 : j === 1 ? C.b2 : bruit(x * .5, y * .06, 33) > .7 ? C.b0 : C.b1);
  }
  for (const z of ZONES) {
    const y0 = CY + z.from + 3, y1 = CY + z.to - 2;
    makimono(t, x0 + 5, x1 - 5, y0, y1, z.points === 5);
    const s = ENCRE[z.points];
    t.sprite(s, Math.round((x0 + x1) / 2 - s.l / 2 + .5), Math.round((y0 + y1) / 2 - s.h / 2), MIROIR);
  }
  // Le toit de tuiles du dos, vu d'en haut, puis le cadre vert.
  const dos = cote === 1 ? x0 - 10 : x1 + 1;
  // Tuiles rondes : des canaux qui descendent du faîtage (dehors) vers
  // l'avant-toit (côté cage), chaque tuile éclairée sur son dos.
  for (let y = BUT.haut - 5; y <= BUT.bas + 4; y++) for (let k = 0; k < 10; k++) {
    const vers = cote === 1 ? k : 9 - k;
    const r = (y + 300) % 3;
    let c = r === 0 ? C.d1 : r === 1 ? C.d3 : C.d2;
    if (vers === 0) c = C.d3;
    if (vers === 1) c = C.d2;
    if (vers === 9) c = C.d0;
    if (vers > 1 && vers < 9 && vers % 4 === 0 && r !== 0) c = C.d1;
    t.pt(dos + k, y, c);
  }
  poutreH(t, Math.min(x0, dos) - 1, Math.max(x1, dos + 9) + 1, BUT.haut - 5);
  poutreH(t, Math.min(x0, dos) - 1, Math.max(x1, dos + 9) + 1, BUT.bas);
  const avant = cote === 1 ? x1 + 1 : x0 - 1, arriere = cote === 1 ? dos + 3 : dos + 6;
  for (const y of [BUT.haut - 3, BUT.bas + 2]) { poteauCoiffe(t, avant, y); poteauCoiffe(t, arriere, y); }
  plaque(t, cote === 1 ? x0 + 10 : x1 - 10, BUT.haut - 18);
  // La shimenawa : une grosse corde de paille tressée tendue devant
  // l'embouchure, et ses zigzags de papier blanc (shide).
  const mx = cote === 1 ? COURT.left - 2 : COURT.right - 2;
  for (let y = BUT.haut - 2; y < BUT.bas + 2; y++) for (let k = 0; k < 5; k++) {
    const s2 = (y + k * 2) % 6;
    t.pt(mx + k, y, k === 0 || k === 4 ? C.e2 : s2 < 2 ? C.e5 : s2 < 4 ? C.e4 : C.e3);
  }
  for (let y = BUT.haut + 14; y < BUT.bas - 10; y += 26) {
    const sens = cote === 1 ? 1 : -1, bx = cote === 1 ? mx + 5 : mx - 1;
    for (let k = 0; k < 12; k++) { const dx = [0, 1, 2, 3, 3, 2, 1, 1, 2, 3, 4, 4][k]; t.pt(bx + sens * dx, y + k, C.m4); t.pt(bx + sens * (dx + 1), y + k, k % 4 === 3 ? C.m2 : C.m4); }
  }
}
// ---------------------------------------------------------------------------
// Les bords
// ---------------------------------------------------------------------------
function ombreSol(t, cx, cy, rx, ry, k) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) {
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    t.teinte(x, y, PAL, C.g0, k * (1 - e * .6));
  } });
}
// Les trois poteaux de l'épreuve des clochettes.
function poteaux(t) {
  for (const [x, h] of [[8, 42], [30, 52], [52, 42]]) {
    const yb = 206;
    ombreSol(t, x + 6, yb + 1, 10, 3, .5);
    for (let y = yb - h; y <= yb; y++) for (let k = 0; k < 12; k++) {
      let c = k < 2 ? C.b1 : k < 5 ? C.b3 : k < 9 ? C.b4 : k < 11 ? C.b3 : C.b2;
      if (hacher(x + k, y, 40) < .08) c = C.b2;
      if ((y - (yb - h)) % 13 === 0 && k > 1) c = C.b2;
      t.pt(x + k, y, c);
    }
    balayerEllipse(x + 5.5, yb - h, 5.5, 2, (y, a, b) => { for (let xx = a; xx <= b; xx++) {
      const d = Math.hypot((xx - x - 5.5) / 5.5, (y - yb + h) / 2);
      t.pt(xx, y, d > .8 ? C.b2 : d > .45 ? C.b5 : C.b4);
    } });
    for (let y = yb - h + 14; y < yb - h + 18; y++) for (let k = 0; k < 12; k++) t.pt(x + k, y, (k + y) % 3 ? C.m3 : C.m1);
    for (let k = -2; k < 14; k++) { t.pt(x + k, yb + 1, C.g1); if (k % 3 === 0) t.pt(x + k, yb, C.g4); }
  }
}
// L'échoppe Ichiraku : toit de tuiles, enseigne, lanternes rouges aux deux
// coins, noren, Teuchi derrière le comptoir, marmites, bols, tabourets.
function ichiraku(t) {
  const x0 = 1, x1 = 67;
  ombreSol(t, 34, 553, 36, 5, .55);
  // Montants.
  for (const px of [x0, x1 - 2]) for (let y = 444; y < 552; y++) { t.pt(px, y, C.b1); t.pt(px + 1, y, C.b2); t.pt(px + 2, y, C.b1); }
  // Intérieur : mur du fond, étagère, marmites.
  for (let y = 468; y < 502; y++) for (let x = x0 + 3; x <= x1 - 3; x++) t.pt(x, y, y < 476 ? C.b0 : (x & 7) === 0 ? C.b0 : C.b1);
  t.hl(x0 + 3, x1 - 3, 480, C.b3);
  for (const [px, c] of [[10, C.l2], [16, C.m3], [22, C.j2], [46, C.m3], [52, C.l2], [58, C.m2]]) { t.pt(px, 478, c); t.pt(px, 479, c); t.pt(px + 1, 479, c); }
  for (const mx of [8, 48]) for (let y = 488; y < 501; y++) for (let x = mx; x < mx + 12; x++) {
    const u = (x - mx) / 11;
    t.pt(x, y, y === 488 ? C.s4 : u < .3 ? C.s3 : u < .75 ? C.s2 : C.s1);
  }
  // Teuchi, bandeau et tablier blancs.
  const tx = 32;
  for (let y = 482; y < 501; y++) for (let x = tx - 5; x <= tx + 5; x++) {
    const tete = y < 490 && Math.abs(x - tx) < 4;
    if (y < 490 && !tete) continue;
    let c = tete ? (y < 484 ? C.m4 : C.o3) : Math.abs(x - tx) > 3 ? C.m2 : C.m4;
    if (tete && y === 486 && Math.abs(x - tx) === 2) c = C.k;
    t.pt(x, y, c);
  }
  // Comptoir, bols et baguettes.
  for (let y = 502; y < 540; y++) for (let x = x0; x <= x1; x++) {
    let c = y < 506 ? (y === 502 ? C.b5 : C.b4) : (x - x0) % 8 === 0 ? C.b2 : C.b3;
    if (y > 536) c = C.b1;
    t.pt(x, y, c);
  }
  for (const bx of [14, 50]) {
    balayerEllipse(bx, 500, 5, 2, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, y < 500 ? C.o3 : C.m4); });
    t.hl(bx - 4, bx + 4, 502, C.l2); t.hl(bx - 3, bx + 3, 503, C.l1);
    t.ligne(bx + 2, 497, bx + 7, 493, C.b4);
  }
  // Tabourets.
  for (const x of [9, 25, 41, 57]) {
    for (let y = 542; y < 553; y++) { t.pt(x, y, C.b1); t.pt(x + 1, y, C.b2); }
    balayerEllipse(x + .5, 541, 5, 2, (y, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, y, y < 541 ? C.l3 : C.l1); });
  }
  // Toit de tuiles, qui déborde.
  for (let y = 430; y < 446; y++) {
    const a = x0 - 1 - Math.round((y - 430) * .2), b = x1 + 1 + Math.round((y - 430) * .2);
    for (let x = a; x <= b; x++) {
      let c = (y - 430) % 3 === 2 ? C.d0 : (x + ((y - 430) / 3 | 0) * 2) % 5 === 0 ? C.d1 : C.d2;
      if (y === 430) c = C.d3;
      if (y > 443) c = y === 445 ? C.b0 : C.b2;
      t.pt(x, y, c);
    }
  }
  // L'enseigne sous l'avant-toit.
  for (let y = 446; y < 453; y++) for (let x = 14; x < 54; x++) t.pt(x, y, y === 446 || y === 452 || x === 14 || x === 53 ? C.b1 : C.b5);
  for (const sx of [20, 29, 38, 47]) { t.vl(sx, 447, 451, C.l1); t.hl(sx - 1, sx + 2, 449, C.l1); }
  // Les noren : pans clairs, bord bas rouge, signes au pinceau.
  for (let p = 0; p < 4; p++) {
    const px = x0 + 4 + p * 15;
    for (let y = 453; y < 474; y++) for (let x = px; x < px + 13; x++) {
      let c = y > 470 ? C.l2 : x === px ? C.m1 : C.m4;
      if (y > 466 && y <= 470 && (x - px) % 4 === 3) c = C.m2;
      t.pt(x, y, c);
    }
    const sx = px + 6;
    t.vl(sx, 457, 465, C.k); t.hl(sx - 3, sx + 3, 459, C.k); t.pt(sx - 3, 463, C.k); t.pt(sx + 3, 464, C.k); t.pt(sx - 2, 462, C.k);
  }
}
// Le bois de Konoha à droite : un grand arbre et sa balançoire, tout entiers
// hors du terrain.
function peindreArbre(t) {
  ombreSol(t, 930, 214, 26, 5, .5);
  for (let y = 116; y < 214; y++) {
    const w = 11 + Math.round(lisse(190, 214, y) * 6);
    const x0 = 942 - (w >> 1);
    for (let k = 0; k < w; k++) {
      let c = k < 2 ? C.b1 : k < w * .45 ? C.b3 : k < w * .8 ? C.b2 : C.b1;
      if (bruit(k * .6, y * .12, 41) > .72) c = C.b1;
      t.pt(x0 + k, y, c);
    }
  }
  for (let x = 896; x <= 938; x++) {
    const y = 132 + Math.round((938 - x) * .06);
    t.pt(x, y, C.b3); t.pt(x, y + 1, C.b2); t.pt(x, y + 2, C.b1);
  }
}
// Le râtelier d'armes d'entraînement : kunaï pendus, un shuriken, une cible de paille.
function ratelier(t) {
  ombreSol(t, 34, 150, 30, 3, .45);
  for (const px of [6, 60]) for (let y = 112; y < 150; y++) { t.pt(px, y, C.b2); t.pt(px + 1, y, C.b3); t.pt(px + 2, y, C.b1); }
  for (const by of [118, 134]) { t.hl(6, 62, by, C.b4); t.hl(6, 62, by + 1, C.b2); }
  for (let i = 0; i < 6; i++) {
    const x = 13 + i * 8, y = 120;
    t.pt(x, y, C.s3); t.pt(x + 1, y, C.s1); t.pt(x, y + 1, C.s1);
    t.vl(x, y + 2, y + 5, C.b0);
    t.pt(x - 1, y + 6, C.s2); t.pt(x, y + 6, C.s3); t.pt(x + 1, y + 6, C.s1);
    t.vl(x, y + 7, y + 11, C.s2); t.pt(x, y + 12, C.s1);
  }
  for (let i = 0; i < 3; i++) {
    const sx = 18 + i * 14, sy = 140;
    for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0], [0, -2], [2, 0], [0, 2], [-2, 0], [1, -1], [-1, 1]]) t.pt(sx + dx, sy + dy, C.s2);
    t.pt(sx, sy, C.k); t.pt(sx - 1, sy - 1, C.s4);
  }
}
// Une palissade de bambous, le long du bord de l'écran, derrière les cages.
function bambous(t, x0, ya, yb) {
  for (let y = ya; y <= yb; y++) for (let k = 0; k < 9; k++) {
    const tige = Math.floor(k / 3), j = k % 3;
    const noeud = (y + tige * 5) % 14 === 0;
    let c = j === 0 ? C.v2 : j === 1 ? C.g6 : C.v3;
    if (noeud) c = j === 1 ? C.v4 : C.v1;
    t.pt(x0 + k, y, c);
  }
  for (const y of [ya + 16, yb - 16]) for (let k = -1; k < 10; k++) { t.pt(x0 + k, y, C.b1); t.pt(x0 + k, y + 1, C.b3); }
}
// Des pas japonais dans l'herbe.
function pasJaponais(t, pts) {
  for (const [x, y, r] of pts) {
    balayerEllipse(x, y + 1, r + 1, r * .55 + 1, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.teinte(xx, yy, PAL, C.g0, .4); });
    balayerEllipse(x, y, r, r * .55, (yy, a, b) => { for (let xx = a; xx <= b; xx++) {
      const d = (xx - x) / r + (yy - y) / (r * .55);
      t.pt(xx, yy, d < -.6 ? C.s3 : d > .7 ? C.s1 : C.s2);
    } });
  }
}
function feuillage(t, cx, cy, rx, ry, gr) {
  for (let y = cy - ry - 4; y <= cy + ry + 4; y++) for (let x = cx - rx - 4; x <= cx + rx + 4; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    const e = dx * dx + dy * dy + (fbm(x * .12, y * .12, 2, gr) - .5) * .8;
    if (e > 1) continue;
    // Des touffes : chaque grappe prend la lumière par le haut à gauche.
    const touffe = fbm(x * .18, y * .18, 2, gr + 1);
    let l = 120 - dy * 50 - dx * 20 + (touffe - .5) * 70;
    if (e > .85) l -= 25;
    t.px[y * W + x] = FEUILLAGE.tramer(l * .55, l, l * .45, x, y, 2.4);
  }
}
function cible(t, cx, cy) {
  // Trépied.
  t.ligne(cx - 8, cy + 10, cx - 14, cy + 30, C.b2); t.ligne(cx + 8, cy + 10, cx + 14, cy + 30, C.b2);
  t.ligne(cx, cy + 12, cx, cy + 30, C.b1);
  ombreSol(t, cx, cy + 31, 16, 3, .5);
  balayerDisque(cx, cy, 15, (y, a, b) => { for (let x = a; x <= b; x++) {
    const d = Math.hypot(x - cx, y - cy);
    const anneau = Math.floor(d / 3.2);
    let c = d > 14 ? C.b1 : anneau === 0 ? C.l2 : anneau % 2 ? C.m4 : C.l2;
    if (d > 13) c = C.b2;
    if (x - cx + y - cy < -16 && d > 11) c = C.b4;
    t.pt(x, y, c);
  } });
  // Kunaï et shuriken plantés.
  for (const [x, y, dx, dy] of [[cx - 6, cy - 3, -7, -4], [cx + 4, cy + 5, 7, 3]]) {
    t.ligne(x, y, x + dx, y + dy, C.s1); t.ligne(x, y - 1, x + dx, y + dy - 1, C.s3);
    t.pt(x + dx + Math.sign(dx), y + dy + Math.sign(dy), C.s2);
  }
  const sx = cx + 5, sy = cy - 7;
  for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0], [0, -2], [2, 0], [0, 2], [-2, 0]]) t.pt(sx + dx, sy + dy, C.s2);
  t.pt(sx, sy, C.k); t.pt(sx - 1, sy - 1, C.s4);
}
function lanternePierre(t, cx, yb) {
  ombreSol(t, cx + 2, yb + 1, 12, 3, .5);
  const bloc = (x0, x1, y0, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t.pt(x, y, x === x0 ? C.s3 : x === x1 ? C.s1 : y === y0 ? C.s3 : C.s2); };
  bloc(cx - 9, cx + 9, yb - 5, yb);
  bloc(cx - 3, cx + 3, yb - 22, yb - 6);
  bloc(cx - 7, cx + 7, yb - 26, yb - 23);
  bloc(cx - 6, cx + 6, yb - 36, yb - 27);
  for (let y = yb - 34; y <= yb - 29; y++) for (let x = cx - 3; x <= cx + 3; x++) t.pt(x, y, C.k);
  for (let k = 0; k < 6; k++) t.hl(cx - 10 + k, cx + 10 - k, yb - 37 - k, k === 0 ? C.s1 : C.s2);
  t.pt(cx, yb - 43, C.s3);
}
const TOUFFES = [];
function peindreBords(t) {
  // Fleurs et trèfles semés dans l'herbe du pourtour.
  for (let i = 0; i < 130; i++) {
    const x = Math.floor(hacher(i, 1, 50) * W), y = 86 + Math.floor(hacher(i, 2, 50) * 480);
    if (dansTerrain(x - 4, y) || dansTerrain(x + 4, y) || dansCage(x, y)) continue;
    const f = hacher(i, 3, 50);
    if (f < .4) { t.pt(x, y, C.f2); t.pt(x + 1, y, C.f1); t.pt(x, y + 1, C.f1); t.pt(x, y - 1, C.f1); t.pt(x - 1, y, C.f1); t.pt(x, y + 2, C.g1); }
    else if (f < .7) { t.pt(x, y, C.y1); t.pt(x + 1, y, C.j2); t.pt(x, y + 1, C.g1); }
    else { t.pt(x, y, C.g5); t.pt(x + 1, y, C.g4); t.pt(x, y + 1, C.g4); t.pt(x + 1, y + 1, C.g2); }
  }
  bambous(t, 0, 232, 414);
  bambous(t, 951, 232, 414);
  pasJaponais(t, [[20, 222, 6], [44, 218, 5], [930, 492, 6], [908, 500, 5], [946, 506, 5], [34, 426, 5]]);
  ratelier(t);
  poteaux(t);
  ichiraku(t);
  peindreArbre(t);
  cible(t, 926, 452);
  lanternePierre(t, 928, 548);
  // En bas : la rue, pavée de terre et de pierres plates.
  // La rue : une bordure de pierres taillées, puis la terre battue, ses
  // ornières, ses cailloux, et une allée de dalles plates au milieu.
  for (let y = 566; y < H; y++) for (let x = 0; x < W; x++) {
    let c;
    if (y < 572) {
      const bloc = Math.floor((x + (y > 568 ? 0 : 0)) / 24), dx = (x + 300) % 24;
      const clair = hacher(bloc, 0, 55) < .4;
      c = dx === 0 ? C.e0 : y === 566 ? C.s4 : y === 571 ? C.s1 : dx === 1 ? C.s3 : dx === 23 ? C.s1 : clair ? C.s3 : C.s2;
      if (c === C.s2 && hacher(x, y, 59) < .05) c = C.s1;
    } else {
      const n = fbm(x * .03, y * .08, 3, 56);
      let l = 182 + (n - .5) * 26 - lisse(574, 572, y) * 40;
      for (const yo of [578, 596]) l -= 22 * gs((y - yo - Math.sin(x * .02) * 1.5) / 1.2);
      c = TERRE.tramer(l, l * .8, l * .55, x, y, 2.2);
      if (hacher(x, y, 57) < .012) c = hacher(x, y, 58) < .5 ? C.s2 : C.e1;
    }
    t.px[y * W + x] = c;
  }
  // L'allée de dalles, posées de biais, un peu irrégulières.
  for (let i = 0; i < 40; i++) {
    const cx = 12 + i * 24 + Math.floor(hacher(i, 1, 63) * 6), cy = 587 + Math.floor(hacher(i, 2, 63) * 3) - 1;
    const rx = 8 + Math.floor(hacher(i, 3, 63) * 3), ry = 4 + Math.floor(hacher(i, 4, 63) * 2);
    for (let y = cy - ry; y <= cy + ry + 1; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const e = Math.abs((x - cx) / rx) ** 3 + Math.abs((y - cy) / ry) ** 3;
      if (e > 1.15) continue;
      if (y === cy + ry + 1 || e > 1) { t.teinte(x, y, PAL, C.e0, .4); continue; }
      const d = (x - cx) / rx + (y - cy) / ry;
      t.pt(x, y, e > .75 ? (d < 0 ? C.s3 : C.s1) : d < -.9 ? C.s4 : hacher(x, y, 64) < .05 ? C.s1 : C.s2);
    }
  }
  for (let x = 0; x < W; x++) { t.pt(x, 565, C.g1); t.pt(x, 564, hacher(x, 0, 57) < .3 ? C.g5 : C.g3); }
  // Bancs et buissons le long de la rue.
  for (const bx of [214, 700]) {
    for (let x = bx; x < bx + 40; x++) { t.pt(x, 578, C.b5); t.pt(x, 579, C.b4); t.pt(x, 580, C.b2); }
    for (const px of [bx + 3, bx + 35]) for (let y = 581; y < 588; y++) { t.pt(px, y, C.b1); t.pt(px + 1, y, C.b2); }
    for (let x = bx - 1; x < bx + 42; x++) t.teinte(x, 589, PAL, C.e0, .4);
  }
  for (const [x, y] of [[120, 580], [380, 584], [600, 582], [860, 584]]) {
    balayerEllipse(x, y, 11, 7, (yy, a, b) => { for (let xx = a; xx <= b; xx++) {
      const l = 110 - (yy - y) * 7 + (hacher(xx, yy, 58) - .5) * 40;
      t.px[yy * W + xx] = FEUILLAGE.tramer(l * .55, l, l * .45, xx, yy, 2);
    } });
    t.pt(x - 3, y - 2, C.f1); t.pt(x + 4, y, C.f2); t.pt(x + 1, y - 4, C.f1);
  }
}
for (const [x, y] of [[64, 212], [14, 426], [892, 430], [900, 470], [956, 520], [896, 222], [18, 160], [66, 160]])
  TOUFFES.push({ x, y, n: 4 + Math.floor(hacher(x, y, 60) * 3), ph: hacher(x, y, 61) * 6.3 });

function peindreFond() {
  const t = new Toile(W, H);
  if (!CIELM) CIELM = new Uint8Array(W * 60);
  for (let y = 60; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, g, b] = couleurHerbe(x, y);
    t.px[y * W + x] = HERBE.tramer(r, g, b, x, y, dansTerrain(x, y) ? 2.6 : 2);
  }
  peindreCiel(t);
  peindreRocher(t);
  peindreVillage(t);
  // Une haie entre le village et le terrain.
  for (let x = 0; x < W; x++) {
    const h = 3 + Math.round(fbm(x * .15, 3, 2, 62) * 3);
    for (let k = 0; k < h; k++) t.pt(x, 83 - k - 1, k === h - 1 ? C.v4 : k > 1 ? C.v3 : C.v1);
  }
  feuillage(t, 930, 106, 30, 30, 70);
  feuillage(t, 12, 94, 16, 12, 72);
  feuillage(t, 58, 96, 12, 10, 73);
  peindreBords(t);
  peindreLignes(t);
  peindreCage(t, 1);
  peindreCage(t, 2);
  FOND = t;
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
const NUAGES = [];
for (let i = 0; i < 5; i++) {
  const l = 50 + Math.floor(hacher(i, 1, 80) * 60), h = 12 + Math.floor(hacher(i, 2, 80) * 6);
  const px = new Uint32Array(l * h);
  const nb = 3 + Math.floor(l / 24), bulles = [];
  for (let b = 0; b < nb; b++) {
    const u = (b + .5) / nb;
    bulles.push([u * l, h * (.6 + hacher(b, i, 81) * .1), l / nb * (.8 + hacher(b, i, 82) * .4), h * (.35 + Math.sin(u * Math.PI) * .5)]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    let e = Infinity;
    for (const [bx, by, rx, ry] of bulles) e = Math.min(e, ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2);
    e += (fbm(x * .15, y * .3, 2, 83 + i) - .5) * .4;
    if (e > 1 || y > h - 2) continue;
    const v = y / h, l2 = 255 - v * 70 - e * 20;
    px[y * l + x] = NUAGE.tramer(l2 - 20, l2 - 8, l2 + 5, x, y, 1.8);
  }
  NUAGES.push({ l, h, px, y: 1 + Math.floor(hacher(i, 3, 80) * 18), x0: hacher(i, 4, 80) * (W + l), v: 2 + hacher(i, 5, 80) * 2.5 });
}
function nuages(t, temps) {
  for (const n of NUAGES) {
    const per = W + n.l, x0 = Math.round(((n.x0 + temps * n.v) % per) - n.l);
    for (let y = 0; y < n.h; y++) {
      const yy = n.y + y;
      if (yy >= 60) break;
      for (let x = 0; x < n.l; x++) {
        const c = n.px[y * n.l + x], xx = x0 + x;
        if (!c || xx < 0 || xx >= W || !CIELM[yy * W + xx]) continue;
        t.px[yy * W + xx] = c;
      }
    }
  }
}
// Les feuilles que le vent promène : peu, lentes, et qui tournent sur elles-mêmes.
const FEUILLE = [
  spriteDe(['.ab', 'abc', 'bc.'], { a: C.v5, b: C.v4, c: C.v2 }),
  spriteDe(['abb', '.bc'], { a: C.v5, b: C.v4, c: C.v2 }),
  spriteDe(['a.', 'bb', '.c'], { a: C.v5, b: C.v4, c: C.v2 })
];
function feuilles(t, temps) {
  for (let i = 0; i < 9; i++) {
    const v = 14 + hacher(i, 1, 90) * 10, per = W + 60;
    const x = ((temps * v + hacher(i, 2, 90) * per) % per) - 30;
    const y0 = 90 + hacher(i, 3, 90) * 470;
    const y = y0 + Math.sin(temps * .6 + i * 2) * 18 + Math.sin(temps * 1.7 + i) * 3;
    const f = FEUILLE[Math.floor(temps * 2.2 + i) % 3];
    t.teinte(Math.round(x + 2), Math.round(y + 6), PAL, C.g0, .3);
    t.sprite(f, x, y);
  }
}
function balancoire(t, temps) {
  const a = Math.sin(temps * 1.05) * .14, px = 910, py = 135, L = 54;
  const ax = Math.sin(a), ay = Math.cos(a);
  const sx = px + ax * L, sy = py + ay * L;
  for (let k = 2; k < 12; k++) t.teinte(Math.round(sx - 10 + k * 2), 214, PAL, C.g0, .35);
  for (const o of [-7, 7]) t.ligne(px + o, py, sx + o, sy, C.m1);
  for (let x = -9; x <= 9; x++) { t.pt(Math.round(sx + x), Math.round(sy), C.b4); t.pt(Math.round(sx + x), Math.round(sy) + 1, C.b2); }
}
function clochettes(t, temps) {
  for (const [bx, ph] of [[33, 0], [39, 1.7]]) {
    const a = Math.sin(temps * 1.6 + ph) * .25, L = 9;
    const x = Math.round(bx + Math.sin(a) * L), y = Math.round(160 + Math.cos(a) * L);
    t.ligne(bx, 160, x, y, C.l2);
    balayerDisque(x, y + 3, 2.6, (yy, a0, b0) => { for (let xx = a0; xx <= b0; xx++) t.pt(xx, yy, xx - x + yy - y - 3 < -1 ? C.j3 : yy > y + 4 ? C.j1 : C.j2); });
    t.pt(x, y + 6, C.j1);
  }
}
// Lanternes de papier le long de la rue, qui se balancent et luisent.
const LANTERNES = [160, 330, 630, 800];
function lanternes(t, temps) {
  for (const lx of LANTERNES) {
    for (let y = 560; y < 594; y++) { t.pt(lx, y, C.b1); t.pt(lx + 1, y, C.b2); }
    t.hl(lx - 6, lx + 7, 560, C.b2);
    for (let y = 592; y < 598; y++) for (let x = lx - 3; x <= lx + 4; x++) t.pt(x, y, y === 592 ? C.s3 : x === lx + 4 ? C.s1 : C.s2);
    for (let x = lx - 3; x <= lx + 5; x++) t.teinte(x, 598, PAL, C.e0, .45);
    const a = Math.sin(temps * .9 + lx) * .12;
    const cx = Math.round(lx + 6 + Math.sin(a) * 8), cy = 570;
    t.ligne(lx + 6, 561, cx, cy - 4, C.k);
    const lueur = .5 + Math.sin(temps * 1.3 + lx) * .08;
    for (let y = cy - 14; y <= cy + 14; y++) for (let x = cx - 14; x <= cx + 14; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.2);
      if (d < 14) t.teinte(x, y, PAL, C.y1, lueur * .45 * (1 - d / 14));
    }
    balayerEllipse(cx, cy + 1, 4, 5, (y, a0, b0) => { for (let x = a0; x <= b0; x++) t.pt(x, y, (y - cy) % 3 === 0 ? C.l1 : x < cx ? C.l3 : C.l2); });
    t.hl(cx - 2, cx + 2, cy - 4, C.k); t.hl(cx - 2, cx + 2, cy + 6, C.k);
  }
}
// Les deux lanternes rouges aux coins d'Ichiraku.
function lanternesIchiraku(t, temps) {
  for (const lx of [6, 62]) {
    const cx = Math.round(lx + Math.sin(temps * .9 + lx) * 1), cy = 460;
    const lueur = .45 + Math.sin(temps * 1.3 + lx) * .06;
    for (let y = cy - 12; y <= cy + 12; y++) for (let x = cx - 12; x <= cx + 12; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.2);
      if (d < 12 && x >= 0) t.teinte(x, y, PAL, C.y1, lueur * .4 * (1 - d / 12));
    }
    t.pt(lx, 453, C.k);
    balayerEllipse(cx, cy, 4, 6, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, (y - cy) % 3 === 0 ? C.l1 : x < cx ? C.l3 : C.l2); });
    t.hl(cx - 2, cx + 2, cy - 6, C.k); t.hl(cx - 2, cx + 2, cy + 6, C.k);
    t.pt(cx, cy + 7, C.y1);
  }
}
function vapeur(t, temps) {
  for (let i = 0; i < 3; i++) {
    const q = (temps * .35 + i / 3) % 1;
    const x = Math.round([13, 19, 53][i] + Math.sin(temps * 1.1 + i * 2) * 2 * q), y = Math.round(486 - q * 16);
    t.teinte(x, y, PAL, C.m4, .7 * (1 - q)); t.teinte(x + 1, y - 1, PAL, C.m4, .5 * (1 - q));
  }
}
function touffes(t, temps) {
  for (const tf of TOUFFES) for (let b = 0; b < tf.n; b++) {
    const bx = tf.x + b - (tf.n >> 1), h = 3 + ((b * 5 + tf.x) % 4);
    const dx = Math.round(Math.sin(temps * .8 + tf.ph + b * .5) * h / 6) + (b - tf.n / 2) * .4;
    for (let k = 0; k < h; k++) { const u = k / h; t.pt(Math.round(bx + dx * u), tf.y - k, u > .7 ? C.g6 : u > .3 ? C.g5 : C.g3); }
  }
}
// Le feuillage bruisse : quelques reflets clairs qui passent sur les grappes.
function bruissement(t, temps) {
  for (let i = 0; i < 24; i++) {
    const cyc = temps * .5 + hacher(i, 1, 95) * 4, n = Math.floor(cyc), ph = cyc - n;
    if (ph > .5) continue;
    const a = hacher(i, n, 96) * Math.PI * 2, r = Math.sqrt(hacher(i, n, 97));
    const x = Math.round(930 + Math.cos(a) * r * 26), y = Math.round(104 + Math.sin(a) * r * 24);
    t.teinte(x, y, PAL, C.v5, Math.sin(ph / .5 * Math.PI) * .8);
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
  const cible2 = document.createElement('canvas');
  cible2.width = W; cible2.height = H;
  const g = cible2.getContext('2d');

  function image(temps, but, extras = {}) {
    fond(!!extras.miroir);
    const butG = extras.butG ?? but, butD = extras.butD ?? but;
    t.copier(FOND);
    nuages(t, temps);
    bruissement(t, temps);
    balancoire(t, temps);
    clochettes(t, temps);
    vapeur(t, temps);
    lanternesIchiraku(t, temps);
    lanternes(t, temps);
    touffes(t, temps);
    feuilles(t, temps);
    for (const cote of [1, 2]) {
      const fl = cote === 1 ? butG : butD;
      if (fl <= .02) continue;
      const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x < x0 + BUT.prof; x++) t.teinte(x, y, PAL, C.y2, fl * .55);
    }
    t.peindre(g);
    return cible2;
  }
  return { image };
}
