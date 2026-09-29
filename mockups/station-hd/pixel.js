// ---------------------------------------------------------------------------
// A — LA STATION ORBITALE EN PIXEL ART HD.
//
// Un pixel de décor = un pixel du canevas de jeu (960×600). Yuki, lui, a des
// pixels de 1,2 : le décor est donc un poil plus fin que les persos, ce qui
// le garde derrière eux à l'œil. Le passer exactement à 1,2 obligerait à
// étirer le décor d'un facteur non entier, et les trames se mettraient à
// baver une colonne sur cinq.
//
// Le fond fixe (planète, ciel, châssis, cages) est peint une fois. Chaque
// image recopie ce fond puis pose ce qui bouge : bandes lumineuses, balises,
// drones et leurs faisceaux, ondes et balayage de l'hologramme, rideaux des
// cages, fenêtres de l'anneau, reflets des ailes solaires.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, hacher, lisse, melanger, balayerDisque, balayerEllipse, balayerPoly, spriteDe, ecrire3x5, largeur3x5 } from '../_pixelart.js';
import {
  W, H, COURT, CX, CY, BUT, ZONES, CHASSIS, MUR, FACE, horizonY, SOLEIL, projeterSol,
  BANDES_H, JOINTS_H, BANDES_V, BALISES, PROJECTEURS, PANNEAUX, ANNEAU, SATELLITE,
  DRONES, positionDrone, vaisseau, filante
} from './scene.js';

const PAL = new Palette({
  // Espace et nébuleuse
  e0: '#010208', e1: '#03050f', e2: '#060a1c', e3: '#0a1030', e4: '#101a48',
  n1: '#110c2a', n2: '#1b123e', n3: '#2a1a56', n4: '#3b256e',
  // Étoiles
  s1: '#2a3454', s2: '#55638c', s3: '#9aa8d0', s4: '#dfe8ff', s5: '#ffffff', sj: '#ffe6a8', sb: '#9fe2ff',
  // Atmosphère et aube
  a1: '#132a6a', a2: '#1d4a9c', a3: '#2f78cc', a4: '#5cb4ee', a5: '#a8e6ff', a6: '#e4f8ff',
  l1: '#3a1d52', l2: '#6a2c62', l3: '#a8445e', l4: '#e0704a', l5: '#ffac52', l6: '#ffd98a', l7: '#fff6d6',
  j1: '#2a3564', j2: '#4a5688', j3: '#7c84b0', j4: '#b8b8d4',
  // Planète de nuit
  p0: '#010309', p1: '#03060f', p2: '#050a17', p3: '#080e1f', p4: '#0b1428', p5: '#101b34', p6: '#162340', p7: '#1d2c4e', p8: '#26385e',
  t1: '#0d0f2a', t2: '#16163c', t3: '#221e52',
  v1: '#2b1a0e', v2: '#5c3514', v3: '#a2601c', v4: '#e9a23c', v5: '#ffe3a0',
  // Vitre du terrain
  g0: '#040b18', g1: '#061022', g2: '#08152b', g3: '#0b1b35', g4: '#0f2340', g5: '#142c4d', g6: '#1a375c', g7: '#21446c',
  gv1: '#1a2a34', gv2: '#34484a', gv3: '#66745c', gv4: '#a6a87a',
  // Hologramme, or, rouge
  h0: '#04202e', h1: '#083a52', h2: '#0e5e80', h3: '#1690b8', h4: '#2cc6ec', h5: '#7ae8ff', h6: '#d4faff',
  o0: '#2a1a04', o1: '#5a3a08', o2: '#94620e', o3: '#d0961a', o4: '#ffcc3a', o5: '#ffeaa0',
  r0: '#26050c', r1: '#560c18', r2: '#9a1826', r3: '#dc2c36', r4: '#ff6452', r5: '#ffbca8',
  // Métal du châssis : bleu acier, la même famille que le contour de Yuki
  m0: '#05070e', m1: '#0a0f1b', m2: '#101727', m3: '#172136', m4: '#1f2c46', m5: '#2a3b5a', m6: '#394f74', m7: '#4d6992', m8: '#7590ba',
  // Cellules solaires
  c0: '#050b1e', c1: '#0a1636', c2: '#10224e', c3: '#183270', c4: '#2a4f9e', c5: '#5a86d6'
});
const C = PAL.c;
const CIEL = PAL.sous(['e0', 'e1', 'e2', 'e3', 'e4', 'n1', 'n2', 'n3', 'n4', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6',
  'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'j1', 'j2', 'j3', 'j4',
  'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 't1', 't2', 't3']);
const VITRE = PAL.sous(['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7']);

// ---------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------
function sdRectArrondi(x, y, L, T, R, B, r) {
  const cx = (L + R) / 2, cy = (T + B) / 2, hx = (R - L) / 2 - r, hy = (B - T) / 2 - r;
  const qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}
const K = CHASSIS;
const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
const dansBaie = (x, y) => y >= BUT.haut && y < BUT.bas &&
  ((x >= COURT.left - BUT.prof && x < COURT.left) || (x >= COURT.right && x < COURT.right + BUT.prof));
const sdChassis = (x, y) => sdRectArrondi(x + .5, y + .5, K.L, K.T, K.R, K.B, K.rayon);
const dansChassis = (x, y) => sdChassis(x, y) < 0 && !dansTerrain(x, y) && !dansBaie(x, y);
// Face avant sous le rebord du bas : les pixels juste sous le contour.
function dansFace(x, y) {
  if (y < K.B - K.rayon || sdChassis(x, y) < 0) return false;
  return sdChassis(x, y - FACE) < 0;
}

// Cadres des cages : plaque du haut, plaque du bas, montant du fond.
function cadresBaie(cote) {
  const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right;
  const x0 = cote === 1 ? gx - 8 : gx - 6, x1 = cote === 1 ? gx + BUT.prof + 6 : gx + BUT.prof + 8;
  return { gx, x0, x1, haut: [BUT.haut - 16, BUT.haut], bas: [BUT.bas, BUT.bas + 16] };
}
const BAIES = [cadresBaie(1), cadresBaie(2)];
function dansCadre(x, y) {
  for (const b of BAIES) {
    if (x < b.x0 || x >= b.x1) continue;
    if ((y >= b.haut[0] && y < b.haut[1]) || (y >= b.bas[0] && y < b.bas[1])) return b;
  }
  return null;
}
function dansPanneau(x, y) {
  for (const p of PANNEAUX) if (x >= p.x && x < p.x + p.l && y >= p.y && y < p.y + p.h) return p;
  return null;
}

// ---------------------------------------------------------------------------
// 1. La planète et le ciel, calculés en couleur continue puis tramés.
// ---------------------------------------------------------------------------
export function couleurCiel(x, y) {
  const a = horizonY(x) - y;
  let r = 3, g = 5, b = 15;
  const k1 = Math.exp(-a / 16), k2 = Math.exp(-a / 5), k3 = Math.exp(-a / 1.5);
  r += 10 * k1 + 16 * k2 + 50 * k3; g += 20 * k1 + 52 * k2 + 120 * k3; b += 60 * k1 + 110 * k2 + 140 * k3;
  const dx = x - SOLEIL.x;
  const halo = Math.exp(-(dx * dx) / (2 * 95 * 95) - (a * a) / (2 * 11 * 11));
  const coeur = Math.exp(-(dx * dx) / (2 * 20 * 20) - (a * a) / (2 * 4.5 * 4.5));
  r += 210 * halo + 255 * coeur; g += 105 * halo + 230 * coeur; b += 30 * halo + 170 * coeur;
  const neb = lisse(.5, .78, fbm(x * .011, y * .028, 4, 7)) * (1 - k1);
  r += 34 * neb; g += 14 * neb; b += 60 * neb;
  return [r, g, b];
}
export function champPlanete(x, y) {
  const [u, v, d] = projeterSol(x, y);
  const terre = fbm(u * .0042 + 11, v * .0062, 5, 11);
  const estTerre = terre > .53;
  const nu = fbm(u * .0085 + 3, v * .013, 5, 21);
  const couv = lisse(.5, .72, nu), epais = lisse(.62, .86, nu);
  return { u, v, d, terre, estTerre, cote: Math.abs(terre - .53) < .011, couv, epais };
}
export function couleurPlanete(x, y, f) {
  const { d, estTerre, couv, epais } = f;
  let r, g, b;
  if (estTerre) {
    const tx = fbm(f.u * .03, f.v * .045, 3, 12) - .5;
    r = 9 + tx * 8; g = 11 + tx * 7; b = 18 + tx * 6;
  } else { r = 3; g = 6; b = 15; }
  r = melanger(r, 22, couv); g = melanger(g, 32, couv); b = melanger(b, 58, couv);
  r += 14 * epais; g += 20 * epais; b += 30 * epais;
  const tw = Math.exp(-d / 28) * .85;
  r = melanger(r, 30, tw); g = melanger(g, 26, tw); b = melanger(b, 80, tw);
  const dx = x - SOLEIL.x;
  const jour = Math.exp(-(dx * dx) / (2 * 140 * 140)) * Math.exp(-d / 7);
  const lum = couv * .8 + .3;
  r = melanger(r, 170 * lum + 40, jour); g = melanger(g, 160 * lum + 40, jour); b = melanger(b, 190 * lum + 60, jour);
  const br = Math.exp(-d / 2.2);
  r += 40 * br; g += 110 * br; b += 170 * br;
  const sg = Math.exp(-(dx * dx) / (2 * 60 * 60) - (d * d) / (2 * 4 * 4));
  r += 180 * sg; g += 110 * sg; b += 40 * sg;
  return [r, g, b];
}
// Densité de villes : sur les terres, plus forte le long des côtes, éteinte
// sous les nuages et dans le crépuscule.
export function lumiereVille(x, y, f) {
  if (!f.estTerre) return 0;
  let dens = lisse(.45, .82, fbm(f.u * .02 + 5, f.v * .03, 4, 31));
  if (f.cote) dens = Math.max(dens, .6);
  dens *= (1 - f.couv * .9) * (1 - Math.exp(-f.d / 28));
  if (hacher(x, y, 77) >= dens * dens * dens * .3) return 0;
  return Math.min(1, .25 + hacher(x, y, 78) * dens * 1.1);
}

// ---------------------------------------------------------------------------
// 2. Le châssis
// ---------------------------------------------------------------------------
// Lumière venue du haut, un peu de la droite (le soleil).
const LX = .3, LY = -.95;
function couleurChassis(x, y) {
  const sd = sdChassis(x, y);
  const dExt = -sd;
  // Normale du contour extérieur, pour le biseau.
  const nx = sdChassis(x + 1, y) - sdChassis(x - 1, y), ny = sdChassis(x, y + 1) - sdChassis(x, y - 1);
  const nl = Math.hypot(nx, ny) || 1;
  const lum = (nx * LX + ny * LY) / nl;
  if (dExt < 1) return C.m0;
  if (dExt < 2) return lum > .35 ? C.m8 : lum > -.2 ? C.m6 : C.m3;
  if (dExt < 3) return lum > .35 ? C.m6 : lum > -.2 ? C.m5 : C.m3;
  // Bord intérieur, côté terrain.
  const hautTerrain = y < COURT.top && x >= COURT.left && x < COURT.right;
  if (hautTerrain && y >= COURT.top - MUR) {
    // Paroi intérieure du rebord du haut : à l'ombre, nervurée.
    const k = y - (COURT.top - MUR);
    if (k === 0) return C.m6;                 // lèvre qui prend la lumière
    const nerv = (x - COURT.left) % 12;
    if (nerv === 0) return C.m3;
    if (nerv === 1) return C.m1;
    return k < 3 ? C.m3 : k < 6 ? C.m2 : C.m1;
  }
  if (y >= COURT.bottom && y < COURT.bottom + 2 && x >= COURT.left - 1 && x <= COURT.right) return y === COURT.bottom ? C.m7 : C.m5;
  if ((x === COURT.left - 1 || x === COURT.right) && y >= COURT.top && y < COURT.bottom) return C.m2;
  if ((x === COURT.left - 2 || x === COURT.right + 1) && y >= COURT.top && y < COURT.bottom) return C.m3;
  return C.m4;
}

function dessinerChassis(t) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dansChassis(x, y)) t.px[y * W + x] = couleurChassis(x, y);
      else if (dansFace(x, y)) {
        const k = y - (K.B - 1);
        const sd = sdChassis(x, y - FACE);
        t.px[y * W + x] = sd > -1 ? C.m0 : k <= 1 ? C.m6 : k < 4 ? C.m2 : C.m1;
      }
    }
  }
  // Joints des plaques et rivets, rebords du haut et du bas.
  for (const x of JOINTS_H) {
    for (const [y0, y1] of [[K.T + 3, COURT.top - MUR - 1], [COURT.bottom + 3, K.B - 3]]) {
      t.vl(x, y0, y1, C.m2); t.vl(x + 1, y0, y1, C.m5);
      for (const ry of [y0 + 2, y1 - 3]) for (const rx of [x - 5, x + 5]) rivet(t, rx, ry);
    }
  }
  // Joints des rebords latéraux.
  for (const y of [106, 176, 468, 538]) {
    for (const x0 of [K.L + 3, COURT.right + 2]) { t.hl(x0, x0 + 20, y, C.m2); t.hl(x0, x0 + 20, y + 1, C.m5); }
  }
  // Logements des bandes lumineuses (creux sombres), éclairés au prochain passage.
  for (const cx of BANDES_H) {
    for (const y of [K.T + 5, COURT.bottom + 9]) logement(t, cx - 24, y, 48, 9);
  }
  for (const cy of BANDES_V) for (const x of [K.L + 8, COURT.right + 9]) logement(t, x, cy - 22, 9, 44);
  // Grilles d'aération entre deux bandes.
  for (const cx of BANDES_H) {
    for (const y of [K.T + 7, COURT.bottom + 11]) {
      for (const dx of [-40, 34]) {
        const x0 = cx + dx;
        if (x0 < COURT.left + 6 || x0 + 6 > COURT.right - 6) continue;
        for (let i = 0; i < 3; i++) { t.hl(x0, x0 + 5, y + i * 2, C.m1); t.hl(x0, x0 + 5, y + i * 2 + 1, C.m5); }
      }
    }
  }
  // Rayures de danger au bord des cages.
  for (const [y0, y1] of [[BUT.haut - 40, BUT.haut - 18], [BUT.bas + 18, BUT.bas + 40]]) {
    for (const x0 of [K.L + 4, COURT.right + 3]) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x0 + 19; x++) {
        const bande = ((x + y) >> 2) & 1;
        const bord = y === y0 || y === y1 - 1 || x === x0 || x === x0 + 18;
        t.pt(x, y, bord ? C.m1 : bande ? C.o3 : C.m1);
      }
      t.hl(x0, x0 + 18, y0 + 1, C.o4);
    }
  }
  // Inscriptions gravées.
  const grave = (txt, x, y) => { ecrire3x5(t, txt, x, y + 1, C.m2); ecrire3x5(t, txt, x, y, C.m6); };
  grave('SFC ARENA 07', COURT.left + 14, COURT.bottom + 11);
  grave('STELLAR ORBITAL STATION', COURT.right - 14 - largeur3x5('STELLAR ORBITAL STATION'), COURT.bottom + 11);
  // Écusson du centre, sur le joint médian du rebord du haut.
  balayerDisque(CX, K.T + 10, 6, (y, a, b) => t.hl(a, b, y, C.m1));
  balayerDisque(CX, K.T + 10, 5, (y, a, b) => t.hl(a, b, y, C.o2));
  balayerDisque(CX, K.T + 10, 3, (y, a, b) => t.hl(a, b, y, C.m2));
  t.pt(CX - 1, K.T + 8, C.o4); t.pt(CX - 3, K.T + 6, C.o5); t.pt(CX, K.T + 10, C.o4);
  // Voyants de la face avant.
  for (let x = 110; x < 860; x += 64) { t.hl(x, x + 2, K.B + 5, C.o1); t.pt(x + 1, K.B + 5, C.o3); }
  for (let x = 140; x < 860; x += 64) for (let i = 0; i < 4; i++) t.pt(x + i * 3, K.B + 6, C.m0);
}
function rivet(t, x, y) { t.pt(x, y, C.m7); t.pt(x + 1, y, C.m5); t.pt(x, y + 1, C.m5); t.pt(x + 1, y + 1, C.m1); }
function logement(t, x, y, l, h) {
  t.rect(x, y, l, h, C.m1);
  t.rect(x + 1, y + 1, l - 2, h - 2, C.m0);
  t.hl(x, x + l - 1, y + h, C.m6);
}

// ---------------------------------------------------------------------------
// 3. Les cages
// ---------------------------------------------------------------------------
const CHIFFRES = {
  3: ['.##########.', '############', '###......###', '.........###', '.........###', '.........###',
    '....#######.', '....#######.', '.........###', '.........###', '.........###', '.........###',
    '###......###', '############', '.##########.'],
  5: ['############', '############', '###.........', '###.........', '###.........', '###.........',
    '##########..', '###########.', '.........###', '.........###', '.........###', '.........###',
    '###......###', '############', '.##########.']
};
function spriteChiffre(n, clair, moyen, fonce, contour) {
  const L = CHIFFRES[n], h = L.length, l = L[0].length;
  const lignes = [];
  for (let y = -1; y <= h; y++) {
    let s = '';
    for (let x = -1; x <= l; x++) {
      const plein = (yy, xx) => yy >= 0 && yy < h && xx >= 0 && xx < l && L[yy][xx] === '#';
      if (plein(y, x)) s += y < 2 ? 'a' : y > h - 3 ? 'c' : 'b';
      else if (plein(y - 1, x) || plein(y + 1, x) || plein(y, x - 1) || plein(y, x + 1) ||
        plein(y - 1, x - 1) || plein(y + 1, x + 1) || plein(y - 1, x + 1) || plein(y + 1, x - 1)) s += 'o';
      else s += '.';
    }
    lignes.push(s);
  }
  return spriteDe(lignes, { a: clair, b: moyen, c: fonce, o: contour });
}
const CHIFFRE = {
  3: spriteChiffre(3, C.h6, C.h5, C.h4, C.h1),
  5: spriteChiffre(5, C.o5, C.o4, C.o3, C.o1)
};

function dessinerCadres(t) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = dansCadre(x, y);
      if (!b) continue;
      const [y0, y1] = y < CY ? b.haut : b.bas;
      const k = y - y0, bord = x === b.x0 || x === b.x1 - 1;
      let c = C.m4;
      if (k === 0 || bord) c = C.m0;
      else if (k === 1) c = C.m7;
      else if (k === y1 - y0 - 1) c = C.m1;
      else if (k === y1 - y0 - 2) c = C.m3;
      else if ((x - b.x0) % 16 === 8) c = C.m2;
      t.px[y * W + x] = c;
    }
    // Face avant sous la plaque du bas.
  }
  for (const b of BAIES) {
    for (let x = b.x0; x < b.x1; x++) for (let k = 0; k < 5; k++) t.pt(x, b.bas[1] + k, k === 4 ? C.m0 : k < 1 ? C.m5 : C.m1);
    // Témoins d'alerte sur les plaques.
    for (const y of [b.haut[0] + 6, b.bas[0] + 6]) for (let i = 0; i < 3; i++) {
      const x = b.x0 + 10 + i * 18;
      t.rect(x, y, 4, 3, C.m1); t.hl(x + 1, x + 2, y + 1, C.r2);
    }
  }
}

// Le fond fixe des cages : séparateurs entre volets, chiffres, rails.
function dessinerBaies(t) {
  for (const [cote, b] of [[1, BAIES[0]], [2, BAIES[1]]]) {
    const gx = b.gx;
    // L'intérieur s'assombrit vers le fond : on regarde dans un puits.
    for (let y = BUT.haut; y < BUT.bas; y++) for (let x = gx; x < gx + BUT.prof; x++) {
      const fond = cote === 1 ? (gx + BUT.prof - x) / BUT.prof : (x - gx) / BUT.prof;
      t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.p0, fond * .7, xx, yy));
    }
    for (const z of ZONES) {
      for (const yy of [CY + z.from, CY + z.to]) {
        if (yy === BUT.haut || yy === BUT.bas) continue;
        t.hl(gx, gx + BUT.prof - 1, yy - 2, C.m7);
        t.hl(gx, gx + BUT.prof - 1, yy - 1, C.m5);
        t.hl(gx, gx + BUT.prof - 1, yy, C.m3);
        t.hl(gx, gx + BUT.prof - 1, yy + 1, C.m0);
      }
      const s = CHIFFRE[z.points];
      const cx = gx + BUT.prof / 2 - (cote === 1 ? 3 : -3), cy = CY + (z.from + z.to) / 2;
      const x0 = Math.round(cx - s.l / 2), y0 = Math.round(cy - s.h / 2);
      // Halo tramé autour du chiffre.
      const cible = z.points === 5 ? C.o3 : C.h3;
      for (let y = y0 - 5; y < y0 + s.h + 5; y++) for (let x = x0 - 5; x < x0 + s.l + 5; x++) {
        const dx = Math.max(x0 - x, 0, x - (x0 + s.l - 1)), dy = Math.max(y0 - y, 0, y - (y0 + s.h - 1));
        const dd = Math.hypot(dx, dy);
        if (dd > 0 && dd < 5) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, cible, .42 * (1 - dd / 5), xx, yy));
      }
      t.sprite(s, x0, y0);
    }
    // Montant du fond, côté espace.
    const xm = cote === 1 ? b.x0 : b.x1 - 6;
    for (let y = BUT.haut; y < BUT.bas; y++) {
      t.pt(xm, y, C.m0); t.pt(xm + 1, y, C.m6); t.pt(xm + 2, y, C.m4); t.pt(xm + 3, y, C.m4); t.pt(xm + 4, y, C.m2); t.pt(xm + 5, y, C.m0);
      if (y % 20 === 10) { t.pt(xm + 2, y, C.o3); t.pt(xm + 3, y, C.o2); }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Les ailes solaires, l'anneau, le satellite
// ---------------------------------------------------------------------------
function dessinerPanneaux(t) {
  for (const p of PANNEAUX) {
    const gauche = p.x < CX;
    // Bras qui relie l'aile au châssis.
    const bx0 = gauche ? p.x + p.l : K.R, bx1 = gauche ? K.L : p.x;
    for (const by of [p.y + 20, p.y + p.h - 24]) {
      for (let x = bx0; x < bx1; x++) {
        t.pt(x, by, C.m0); t.pt(x, by + 1, C.m6); t.pt(x, by + 2, C.m4); t.pt(x, by + 3, C.m1);
      }
    }
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.l; x++) {
      const bx = x - p.x, by = y - p.y;
      let c;
      if (bx === 0 || by === 0 || bx === p.l - 1 || by === p.h - 1) c = C.m0;
      else if (bx === 1 || by === 1) c = C.m6;
      else if (bx === p.l - 2 || by === p.h - 2) c = C.m3;
      else {
        const cx = (bx - 2) % 10, cy = (by - 2) % 12;
        if (cx === 9 || cy === 11) c = C.c0;
        else if (cy === 0) c = C.c3;
        else c = PAL.tramer(10 + (1 - by / p.h) * 8, 22 + (1 - by / p.h) * 14, 54 + (1 - by / p.h) * 30, x, y, 2);
      }
      t.px[y * W + x] = c;
    }
  }
}

function dessinerAnneau(t) {
  const A = ANNEAU;
  // Moyeu : un cylindre court, éclairé par la droite.
  for (let y = A.cy - 10; y <= A.cy + 8; y++) for (let x = A.cx - 5; x <= A.cx + 5; x++) {
    const k = (x - (A.cx - 5)) / 10;
    let c = k < .15 ? C.m0 : k < .5 ? C.m2 : k < .8 ? C.m4 : C.l3;
    if (y === A.cy - 10 || y === A.cy + 8) c = C.m0;
    if (x === A.cx + 5) c = C.l5;
    t.pt(x, y, c);
  }
  // Bras vers l'anneau.
  t.hl(A.cx - A.rx + 3, A.cx - 6, A.cy, C.m2); t.hl(A.cx + 6, A.cx + A.rx - 3, A.cy, C.m3);
  t.hl(A.cx + 6, A.cx + A.rx - 3, A.cy - 1, C.m5);
  // L'anneau : une ellipse épaisse, le bord droit dans la lumière du soleil.
  for (let a = 0; a < Math.PI * 2; a += .004) {
    for (let e = 0; e < 3; e++) {
      const x = Math.round(A.cx + Math.cos(a) * (A.rx - e)), y = Math.round(A.cy + Math.sin(a) * (A.ry - e * .6));
      const devant = Math.sin(a) > 0;
      const lum = Math.cos(a);
      let c = devant ? (e === 0 ? C.m1 : C.m4) : (e === 0 ? C.m0 : C.m2);
      if (lum > .75 && e === 0) c = C.l5;
      else if (lum > .55 && e < 2) c = C.l3;
      t.pt(x, y, c);
    }
  }
  // Panneaux du moyeu.
  t.rect(A.cx - 2, A.cy - 17, 5, 6, C.c2); t.hl(A.cx - 2, A.cx + 2, A.cy - 17, C.c4); t.vl(A.cx, A.cy - 17, A.cy - 12, C.c0);
}
function dessinerFenetresAnneau(t, temps) {
  const A = ANNEAU;
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + temps * .12;
    if (Math.sin(a) < .05) continue;
    const x = Math.round(A.cx + Math.cos(a) * (A.rx - 1.5)), y = Math.round(A.cy + Math.sin(a) * (A.ry - 1));
    t.pt(x, y, i % 5 === 0 ? C.o4 : C.h5);
  }
}

const SAT = spriteDe([
  'cccc.......cccc',
  'cCcC.mMMm.CcCc.',
  'cccc=mWMm=cccc.',
  'cCcC.mMMm.CcCc.',
  'cccc..mm...cccc'
], { c: C.c2, C: C.c4, m: C.m3, M: C.m6, W: C.m8, '=': C.m5 });

// ---------------------------------------------------------------------------
// 5. Le terrain : vitre, grille, lignes
// ---------------------------------------------------------------------------
let lignesPx = null;
function tracerLignes() {
  const px = [];
  const pose = (x, y, c) => px.push(y * W + x, c);
  for (let x = COURT.left; x < COURT.right; x++) {
    pose(x, COURT.top, C.h5); pose(x, COURT.top + 1, C.h4);
    pose(x, COURT.bottom - 2, C.h4); pose(x, COURT.bottom - 1, C.h5);
  }
  for (let y = COURT.top; y < COURT.bottom; y++) {
    if (y >= BUT.haut && y < BUT.bas) continue;
    pose(COURT.left, y, C.h5); pose(COURT.left + 1, y, C.h4);
    pose(COURT.right - 2, y, C.h4); pose(COURT.right - 1, y, C.h5);
  }
  for (let y = COURT.top + 2; y < COURT.bottom - 2; y++) {
    if ((y - COURT.top) % 16 < 9) { pose(CX - 1, y, C.h4); pose(CX, y, C.h5); }
  }
  const cercle = (r, c1, c2) => {
    const R2o = (r + .5) * (r + .5) + r * .3, R2i = (r - 1.5) * (r - 1.5) + r * .3, R2m = (r - .5) * (r - .5) + r * .3;
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d2 = x * x + y * y;
      if (d2 <= R2o && d2 > R2i) pose(CX + x, CY + y, d2 > R2m ? c1 : c2);
    }
  };
  cercle(58, C.h5, C.h4);
  cercle(10, C.h5, C.h4);
  return px;
}
function dessinerVitre(t) {
  // Halo intérieur du bord de l'hologramme, puis grille de points.
  for (let y = COURT.top; y < COURT.bottom; y++) for (let x = COURT.left; x < COURT.right; x++) {
    const d = Math.min(x - COURT.left, COURT.right - 1 - x, y - COURT.top, COURT.bottom - 1 - y);
    if (d < 7) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.h2, .34 * (1 - d / 7), xx, yy));
    const gx = (x - CX + 1000) % 20, gy = (y - CY + 1000) % 20;
    if (gx === 0 && gy === 0) t.px[y * W + x] = C.g6;
    const cx = (x - CX + 1000) % 80, cy = (y - CY + 1000) % 80;
    if ((cx === 0 && (cy === 79 || cy === 1)) || (cy === 0 && (cx === 79 || cx === 1))) t.px[y * W + x] = C.g5;
  }
  // Emblème dans le rond central : une planète et son anneau, à peine visibles.
  for (let a = 0; a < Math.PI * 2; a += .01) {
    t.pt(Math.round(CX + Math.cos(a) * 18), Math.round(CY + Math.sin(a) * 18), C.g5);
    const x = Math.round(CX + Math.cos(a) * 32), y = Math.round(CY + Math.sin(a) * 7 - Math.cos(a) * 3);
    if (!(Math.sin(a) < 0 && Math.abs(x - CX) < 18)) t.pt(x, y, C.g6);
  }
  // Lueur des projecteurs sur la vitre, sous chaque lentille.
  for (const px of PROJECTEURS) {
    for (let y = COURT.top; y < COURT.top + 14; y++) {
      const k = 1 - (y - COURT.top) / 14, w = 2 + (y - COURT.top) * .5;
      for (let x = Math.round(px - w); x <= Math.round(px + w); x++) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.h3, .3 * k, xx, yy));
    }
  }
}

// ---------------------------------------------------------------------------
// Le fond fixe, peint une fois.
// ---------------------------------------------------------------------------
let FOND = null, ETOILES = [];
function peindreFond() {
  const t = new Toile(W, H);
  // Ciel, planète et villes.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (dansChassis(x, y) || dansCadre(x, y) || dansPanneau(x, y)) continue;
      if (y < horizonY(x) - .5) {
        const [r, g, b] = couleurCiel(x, y);
        t.px[i] = CIEL.tramer(r, g, b, x, y, 1.6);
        continue;
      }
      const f = champPlanete(x, y);
      const sousVitre = dansTerrain(x, y);
      let [r, g, b] = couleurPlanete(x, y, f);
      if (sousVitre) {
        r = r * .55 + 5; g = g * .62 + 16; b = b * .68 + 34;
        t.px[i] = VITRE.tramer(r, g, b, x, y, 1.4);
      } else t.px[i] = CIEL.tramer(r, g, b, x, y, 1.4);
      const lv = lumiereVille(x, y, f);
      if (lv > 0) {
        if (sousVitre) { if (lv > .45) t.px[i] = lv > .85 ? C.gv4 : lv > .7 ? C.gv3 : C.gv2; }
        else t.px[i] = lv > .85 ? C.v5 : lv > .65 ? C.v4 : lv > .45 ? C.v3 : lv > .3 ? C.v2 : C.v1;
      }
    }
  }
  // Étoiles, dans le ciel seulement.
  ETOILES = [];
  for (let i = 0; i < 900; i++) {
    const x = (hacher(i, 1, 5) * W) | 0, y = (hacher(i, 2, 5) * 60) | 0;
    if (y > horizonY(x) - 4) continue;
    const eclat = horizonY(x) - y;
    const k = hacher(i, 3, 5);
    if (k < .2 * Math.exp(-eclat / 12) + .15) continue;
    const type = hacher(i, 4, 5);
    const e = { x, y, type: type < .62 ? 0 : type < .9 ? 1 : type < .97 ? 2 : 3, ph: hacher(i, 6, 5) * 6.3, scint: hacher(i, 7, 5) < .35 };
    e.teinte = hacher(i, 8, 5) < .15 ? C.sj : hacher(i, 8, 5) > .88 ? C.sb : C.s4;
    ETOILES.push(e);
    poserEtoile(t, e, 1);
  }
  dessinerAnneau(t);
  dessinerChassis(t);
  dessinerCadres(t);
  dessinerPanneaux(t);
  dessinerBaies(t);
  dessinerVitre(t);
  lignesPx = tracerLignes();
  FOND = t;
}
function poserEtoile(t, e, lum) {
  const { x, y } = e;
  if (e.type === 0) t.pt(x, y, lum > .6 ? C.s2 : C.s1);
  else if (e.type === 1) t.pt(x, y, lum > .6 ? C.s4 : C.s3);
  else if (e.type === 2) {
    t.pt(x, y, e.teinte);
    if (lum > .4) { t.pt(x - 1, y, C.s2); t.pt(x + 1, y, C.s2); t.pt(x, y - 1, C.s2); t.pt(x, y + 1, C.s2); }
  } else {
    t.pt(x, y, C.s5);
    const n = lum > .6 ? 3 : 2;
    for (let k = 1; k <= n; k++) {
      const c = k === 1 ? C.s4 : k === 2 ? C.s3 : C.s2;
      t.pt(x - k, y, c); t.pt(x + k, y, c); t.pt(x, y - k, c); t.pt(x, y + k, c);
    }
  }
}

// ---------------------------------------------------------------------------
// Ce qui bouge, image par image.
// ---------------------------------------------------------------------------
const DRONE = [
  spriteDe([
    '.aa.......aa.',
    'abba.....abba',
    '.aa.ooooo.aa.',
    '...oMMMMMo...',
    '..oMWWWWWMo..',
    '..oMMlLlMMo..',
    '..ossssssso..',
    '...ooooooo...'
  ], { a: C.m3, b: C.m6, o: C.m0, M: C.m5, W: C.m7, l: C.h3, L: C.h6, s: C.m2 }),
  spriteDe([
    '.............',
    'aaaa.....aaaa',
    '.bb.ooooo.bb.',
    '...oMMMMMo...',
    '..oMWWWWWMo..',
    '..oMMlLlMMo..',
    '..ossssssso..',
    '...ooooooo...'
  ], { a: C.m3, b: C.m6, o: C.m0, M: C.m5, W: C.m7, l: C.h3, L: C.h6, s: C.m2 })
];
const NAVETTE = spriteDe(['..mMM', 'mMWMMm', '.mmmm.'], { m: C.m3, M: C.m6, W: C.h5 });

export function creerPixel() {
  if (!FOND) peindreFond();
  const t = new Toile(W, H);
  const cible = document.createElement('canvas');
  cible.width = W; cible.height = H;
  const g = cible.getContext('2d');

  function image(temps, but) {
    t.copier(FOND);
    const I = but > .02 ? (Math.sin(temps * 47) > .3 ? 1 : .55) : 1;

    // Étoiles qui scintillent.
    for (const e of ETOILES) if (e.scint) poserEtoile(t, e, .5 + .5 * Math.sin(temps * 1.7 + e.ph));
    const fil = filante(temps);
    if (fil) for (let k = 0; k < 12; k++) {
      const c = k === 0 ? C.s5 : k < 4 ? C.s4 : k < 8 ? C.s3 : C.s2;
      if (fil.y - k * .23 < horizonY(fil.x) - 3) t.pt(fil.x - k, fil.y - k * .23, c);
    }
    const nav = vaisseau(temps);
    if (nav) {
      t.sprite(NAVETTE, nav.x, nav.y);
      for (let k = 1; k < 9; k++) t.pt(nav.x + 6 + k, nav.y + 1, k < 3 ? C.l6 : k < 6 ? C.l4 : C.l2);
    }
    dessinerFenetresAnneau(t, temps);
    const sx = SATELLITE.x + Math.sin(temps * .2) * 3;
    t.sprite(SAT, sx, SATELLITE.y);
    if (Math.sin(temps * 3) > .6) t.pt(sx + 7, SATELLITE.y - 1, C.r4);

    // Rayons du soleil qui respirent.
    const ray = 7 + Math.round(Math.sin(temps * 1.3) * 2);
    for (let k = 1; k <= ray; k++) {
      const c = k < 3 ? C.l7 : k < 5 ? C.l6 : C.l5;
      t.pt(SOLEIL.x, Math.round(SOLEIL.y) - 1 - k, c);
    }

    // Hologramme : ondes et balayage, seulement sur la vitre.
    for (let i = 0; i < 5; i++) {
      const phase = temps * (.5 + i * .07) + i * 1.3;
      const baseY = COURT.top + (COURT.bottom - COURT.top) * ((i + .5) / 5);
      const amp = 14 + (i % 2) * 6;
      const cOnde = (.16 + .1 * Math.sin(temps * 1.1 + i)) > .2 ? C.g7 : C.g6;
      for (let x = COURT.left + 3; x < COURT.right - 3; x++) {
        const u = (x - COURT.left) / (COURT.right - COURT.left);
        t.pt(x, Math.round(baseY + Math.sin(u * Math.PI * 2.4 + phase) * amp), cOnde);
      }
    }
    const bal = COURT.top + ((temps * 60) % ((COURT.bottom - COURT.top) + 240)) - 120;
    for (let y = Math.max(COURT.top + 2, Math.round(bal - 10)); y < Math.min(COURT.bottom - 2, bal + 2); y++) {
      const k = y >= bal ? .45 : .22 * (1 - (bal - y) / 10);
      for (let x = COURT.left + 2; x < COURT.right - 2; x++) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.h2, k, xx, yy));
    }

    // Lignes du terrain.
    for (let i = 0; i < lignesPx.length; i += 2) t.px[lignesPx[i]] = I < 1 ? C.h3 : lignesPx[i + 1];
    if (but > .02) {
      const off = Math.round(5 * but);
      for (let i = 0; i < lignesPx.length; i += 2) {
        const p = lignesPx[i], x = p % W, y = (p / W) | 0;
        if (((x + y) & 1) === 0) { t.pt(x + off, y, C.r3); t.pt(x - off, y, C.h5); }
      }
    }

    // Bandes lumineuses qui respirent, avec leur halo sur le métal.
    const pulse = .55 + .45 * Math.sin(temps * 1.5);
    const halo = (x0, y0, l, h, k) => {
      for (let y = y0 - 3; y < y0 + h + 3; y++) for (let x = x0 - 3; x < x0 + l + 3; x++) {
        if (x >= x0 && x < x0 + l && y >= y0 && y < y0 + h) continue;
        const d = Math.max(x0 - x, x - (x0 + l - 1), y0 - y, y - (y0 + h - 1));
        t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.h4, k * (1 - d / 4), xx, yy));
      }
    };
    const tube = (x0, y0, l, h, horiz) => {
      halo(x0, y0, l, h, .22 + pulse * .2);
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) {
        const k = horiz ? Math.abs(y - (y0 + (h - 1) / 2)) : Math.abs(x - (x0 + (l - 1) / 2));
        t.pt(x, y, k < .6 ? (pulse > .6 ? C.h6 : C.h5) : k < 1.6 ? C.h5 : C.h4);
      }
    };
    for (const cx of BANDES_H) for (const y of [K.T + 7, COURT.bottom + 11]) tube(cx - 22, y, 44, 5, true);
    for (const cy of BANDES_V) for (const x of [K.L + 10, COURT.right + 11]) tube(x, cy - 20, 5, 40, false);

    // Lentilles des projecteurs, sous la paroi du haut.
    for (const px of PROJECTEURS) {
      const y = COURT.top - 3;
      t.hl(px - 3, px + 3, y - 1, C.m0);
      t.hl(px - 2, px + 2, y, C.h4); t.hl(px - 1, px + 1, y, pulse > .5 ? C.h6 : C.h5);
      t.hl(px - 2, px + 2, y + 1, C.h3);
    }

    // Balises des coins.
    const blink = .5 + .5 * Math.sin(temps * 2.2);
    for (const [bx, by] of BALISES) {
      balayerDisque(bx, by, 6, (y, a, b) => t.hl(a, b, y, C.m0));
      balayerDisque(bx, by, 5, (y, a, b) => t.hl(a, b, y, C.m5));
      balayerDisque(bx, by, 3, (y, a, b) => t.hl(a, b, y, blink > .5 ? C.o4 : C.o1));
      if (blink > .5) {
        t.pt(bx - 1, by - 1, C.o5);
        for (let y = by - 10; y <= by + 10; y++) for (let x = bx - 10; x <= bx + 10; x++) {
          const d = Math.hypot(x - bx, y - by);
          if (d > 6 && d < 10) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.o4, .3 * (1 - (d - 6) / 4) * blink, xx, yy));
        }
      }
    }

    // Rideaux des cages et rails des volets.
    for (const [cote, b] of [[1, BAIES[0]], [2, BAIES[1]]]) {
      const xl = cote === 1 ? COURT.left : COURT.right - 1;
      for (let y = BUT.haut; y < BUT.bas; y++) {
        const ond = .5 + .5 * Math.sin(y * .31 + temps * 7) * Math.sin(y * .07 - temps * 2.3);
        for (let dx = -10; dx <= 10; dx++) {
          const k = (1 - Math.abs(dx) / 11) * (.3 + .35 * ond) * I;
          t.modifier(xl + dx, y, (c, xx, yy) => PAL.teinter(c, C.h5, k, xx, yy));
        }
        t.pt(xl, y, ond > .5 ? C.h6 : C.h5);
        t.pt(xl + (cote === 1 ? -1 : 1), y, C.h4);
      }
      for (const z of ZONES) {
        const or = z.points >= 5;
        const y1 = CY + z.from + 3, y2 = CY + z.to - 3;
        const xr = cote === 1 ? COURT.left - 6 : COURT.right + 2;
        for (let y = y1; y < y2; y++) {
          t.pt(xr, y, C.m0); t.pt(xr + 4, y, C.m0);
          t.pt(xr + 1, y, or ? C.o5 : C.h6); t.pt(xr + 2, y, or ? C.o4 : C.h5); t.pt(xr + 3, y, or ? C.o3 : C.h4);
        }
      }
      if (but > .02) {
        for (let y = BUT.haut; y < BUT.bas; y++) for (let x = b.gx; x < b.gx + BUT.prof; x++)
          t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.h6, but * .6, xx, yy));
      }
    }

    // Reflet qui glisse sur les ailes solaires.
    for (const p of PANNEAUX) {
      const pos = ((temps * 22) % 260) - 60;
      for (let y = p.y + 2; y < p.y + p.h - 2; y++) for (let x = p.x + 2; x < p.x + p.l - 2; x++) {
        const d = Math.abs((x - p.x) + (y - p.y) * .55 - pos);
        if (d < 8) t.modifier(x, y, (c, xx, yy) => c === C.c0 ? c : PAL.teinter(c, C.c5, .5 * (1 - d / 8), xx, yy));
      }
    }

    // Drones et faisceaux.
    for (const d of DRONES) {
      const [x, y] = positionDrone(d, temps);
      const ang = Math.atan2(CY - y, CX - x), long = 46, larg = 11;
      const ax = Math.cos(ang), ay = Math.sin(ang);
      const pts = [[x + ax * 3, y + ay * 3], [x + ax * long - ay * larg, y + ay * long + ax * larg], [x + ax * long + ay * larg, y + ay * long - ax * larg]];
      balayerPoly(pts, (yy, a, b) => {
        for (let xx = a; xx <= b; xx++) {
          const k = ((xx - x) * ax + (yy - y) * ay) / long;
          t.modifier(xx, yy, (c, px, py) => PAL.teinter(c, C.h4, .32 * (1 - k), px, py));
        }
      });
      const fr = DRONE[Math.floor(temps * 20 + d.ph * 3) & 1];
      t.sprite(fr, x - 6, y - 4);
      const allume = Math.sin(temps * 3 + d.ph) > 0;
      t.pt(Math.round(x), Math.round(y) - 3, allume ? (d.feu === 'r' ? C.r4 : C.o4) : C.m2);
    }

    t.peindre(g);
    return cible;
  }
  return { image, palette: PAL };
}
