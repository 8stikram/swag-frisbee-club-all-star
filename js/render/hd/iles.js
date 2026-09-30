// ---------------------------------------------------------------------------
// ÎLES DU DESTIN EN PIXEL ART HD — le terrain de Sora.
//
// La plage de l'île au coucher du soleil, même technique que les six autres
// terrains HD. Le terrain est un carré de sable damé bordé de cordes ; les
// cages sont des radeaux de rondins, celui que Sora, Riku et Kairi montent
// pour quitter l'île ; la cabane est à gauche, l'arbre à paopu à droite.
// Au fond l'océan et l'île principale, devant le lagon, dont les vagues
// lèchent le bas de l'écran.
//
// Pas de règle de jeu : c'est un décor. Ce qui bouge le fait lentement —
// vagues, nuages, palmes et leurs ombres, bouteille à la mer, barque, crabe.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, bruit, hacher, lisse, balayerDisque, balayerEllipse, balayerPoly, spriteDe, spriteChiffre } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];
const HORIZON = 40;
const SOLEIL = { x: 430, y: 34, r: 18 };
// La ligne d'eau au repos, en haut (l'océan) et en bas (le lagon).
const RIVE_HAUT = 71, RIVE_BAS = 588;
const ANNEAU = 62;

const PAL = new Palette({
  // Ciel du soir : bleu en haut, rose puis or à l'horizon
  k0: '#1f3163', k1: '#2c5192', k2: '#4a74b4', k3: '#7f93c8', k4: '#b49cc4', k5: '#e59c9a', k6: '#f4b886', k7: '#fbd89e', k8: '#fff1cf',
  // Nuages : dessus lavande, dessous rose et or
  n1: '#5d5f9a', n2: '#8b7fb4', n3: '#d98aa0', n4: '#f6b48c',
  // Soleil
  s1: '#ef8a3a', s2: '#f9b54a', s3: '#ffdc7a', s4: '#fff8dc',
  // Mer, du large au lagon
  m0: '#10284e', m1: '#1a4274', m2: '#22628f', m3: '#2b83a8', m4: '#38a6bb', m5: '#5fc6c6', m6: '#9fe2d8', m7: '#d8f6ee', w: '#ffffff',
  // Îles au loin, à contre-jour
  i1: '#2e2f5c', i2: '#46457a', i4: '#e39a8c',
  // Sable
  z0: '#5f4a30', z1: '#86694a', z2: '#a88a62', z3: '#c2a476', z4: '#d6bc8c', zc: '#ddc596', z5: '#e4cea0', zd: '#e9d5aa', z6: '#eedcb4', z7: '#f6eacc', z8: '#fff8e6',
  // Bois flotté, planches, rondins
  b0: '#2e1c10', b1: '#4e3220', b2: '#70492c', b3: '#946338', b4: '#b8864e', b5: '#d8b074', b6: '#ecd09a',
  // Chaume et corde
  a1: '#6e5226', a2: '#9a7838', a3: '#c4a052', a4: '#e2c47a',
  // Feuillage
  v0: '#0f3326', v1: '#1a5234', v2: '#28743c', v3: '#44994a', v4: '#79c05a', v5: '#b6e07a',
  // Roche
  p0: '#2f2a3c', p1: '#4d4658', p2: '#6f6678', p3: '#958aa0', p4: '#c0b6c4',
  // Paopu
  j1: '#c96a24', j2: '#f2b53c', j3: '#ffe27a',
  // Étoiles de mer, crabe, drapeau
  o1: '#8a2a26', o2: '#d44c36', o3: '#f2805a', o4: '#ffb896',
  // Coquillages
  h1: '#e8a8a4', h2: '#f8d8d0',
  // Verre de la bouteille
  g1: '#2a6a58', g2: '#62b894',
  k: '#1a1626'
});
const C = PAL.c;
const CIEL = PAL.sous(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8']);
const NUAGE = PAL.sous(['k2', 'k3', 'k4', 'n1', 'n2', 'n3', 'n4', 'k6', 'k7']);
const MER = PAL.sous(['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'k4', 'k5', 'k6']);
const SABLE = PAL.sous(['z0', 'z1', 'z2', 'z3', 'z4', 'zc', 'z5', 'zd', 'z6', 'z7', 'z8']);

const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
const dansCage = (x, y) => y >= BUT.haut - 7 && y < BUT.bas + 7 && (x < COURT.left + 4 || x >= COURT.right - 4);

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------
const PIQUET = spriteDe(['.aaa.', 'acbba', 'abbba', 'abbba', '.aaa.'], { a: C.b1, b: C.b3, c: C.b5 });
const COQUILLE = spriteDe(['.aaa.', 'abcba', 'abcba', '.bdb.'], { a: C.h1, b: C.h2, c: C.w, d: C.h1 });
const BIGORNEAU = spriteDe(['.ab.', 'abca', 'bcca', '.aa.'], { a: C.z3, b: C.z7, c: C.z8 });
const GALET = spriteDe(['.ab.', 'abbc', '.cc.'], { a: C.p3, b: C.p4, c: C.p2 });
const BOUTEILLE = spriteDe([
  '.aaaaaaa....',
  'abbwbbbbaa..',
  'abpppppbbbcc',
  'abpppppbbbcc',
  'abbbbbbbaa..',
  '.aaaaaaa....'
], { a: C.g1, b: C.g2, w: C.w, p: C.z7, c: C.b3 });
const CRABE = ['A', 'B'].map(f => spriteDe([
  '.a.......a.',
  'aa.b...b.aa',
  '.a.k...k.a.',
  '..abbbbba..',
  '.abcccccba.',
  f === 'A' ? 'a.abbbbba.a' : '.aabbbbbaa.',
  f === 'A' ? '.a.a...a.a.' : 'a..a...a..a'
], { a: C.o1, b: C.o2, c: C.o3, k: C.k }));
const GOELAND = [
  spriteDe(['b.......b', '.b.....b.', '..bbbbb..'], { b: C.i1 }),
  spriteDe(['.........', 'bbb...bbb', '...bbb...'], { b: C.i1 })
];

// Une étoile à cinq branches pleine, pour les fruits du paopu et les étoiles
// de mer : claire en haut à gauche, sombre en bas à droite.
function etoile(t, cx, cy, r, clair, moyen, fonce, contour, rot = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + rot + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const dedans = new Set();
  balayerPoly(pts, (y, a, b) => { for (let x = a; x <= b; x++) dedans.add(y * W + x); });
  for (const i of dedans) {
    const x = i % W, y = (i / W) | 0;
    const bord = !dedans.has(i + 1) || !dedans.has(i + W) || !dedans.has(i - 1) || !dedans.has(i - W);
    const d = (x - cx) + (y - cy);
    t.pt(x, y, bord && d > -1 ? contour : d < -r * .5 ? clair : d > r * .4 ? fonce : moyen);
  }
}

// ---------------------------------------------------------------------------
// Le fond fixe. Il existe en deux sens : normal, et miroir pour l'invité en
// ligne, où seuls les chiffres des cages changent.
// ---------------------------------------------------------------------------
let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
// Couches communes aux deux sens : l'eau sous les rives (recomposée à chaque
// image, puisque la ligne d'eau bouge), ce qui tient au-dessus du lagon (le
// ponton), et le ciel libre où passent les nuages.
let EAU = null, DESSUS = null, CIELM = null;
const CHIFFRE = { 3: spriteChiffre(3, C.z8, C.z7, C.z6, C.b0), 5: spriteChiffre(5, C.z8, C.z7, C.z6, C.b0) };

function couleurCiel(x, y) {
  const stops = [[31, 49, 99], [44, 81, 146], [74, 116, 180], [127, 147, 200], [180, 156, 196], [229, 156, 154], [244, 184, 134], [251, 216, 158]];
  const k = y / (HORIZON - 1) * (stops.length - 1), a = Math.min(stops.length - 2, Math.floor(k)), f = k - a;
  let [r, g, b] = stops[a].map((v, j) => v + (stops[a + 1][j] - v) * f);
  const d = Math.hypot(x - SOLEIL.x, (y - SOLEIL.y) * 1.8);
  const halo = Math.exp(-d * d / (2 * 90 * 90));
  r += 44 * halo; g += 30 * halo; b += 4 * halo;
  return [r, g, b];
}

// L'océan, de l'horizon à la plage : il renvoie le ciel au loin, puis devient
// turquoise dans le peu profond. La houle fait des bandes qui s'espacent en
// approchant, et le soleil y trace son chemin d'or.
function couleurOcean(x, y) {
  const u = Math.min(1, Math.max(0, (y - HORIZON) / (RIVE_HAUT - HORIZON)));
  const stops = [[176, 144, 172], [78, 100, 152], [44, 102, 150], [50, 140, 170], [84, 192, 194], [140, 222, 208]];
  const k = u * (stops.length - 1), a = Math.min(stops.length - 2, Math.floor(k)), f = k - a;
  let [r, g, b] = stops[a].map((v, j) => v + (stops[a + 1][j] - v) * f);
  const ph = Math.pow(Math.max(0, y - HORIZON + 1), .75) * 2.1 + (fbm(x * .015, y * .2, 2, 12) - .5) * 5;
  const l = Math.sin(ph) * 9 * (.4 + u * .6);
  r += l; g += l; b += l;
  const wp = 5 + (y - HORIZON) * 1.9, dx = Math.abs(x - SOLEIL.x);
  if (dx < wp) {
    const p = (1 - dx / wp) ** 1.3 * lisse(.38, .68, bruit(x * .16, y * 1.4, 14)) * (1 - u * .55);
    r += 95 * p; g += 70 * p; b -= 20 * p;
  }
  return [r, g, b];
}
// Le lagon, devant : clair sur le sable, plus profond vers le bas de l'écran,
// avec le réseau de lumière que la houle dessine au fond.
function couleurLagon(x, y) {
  const u = Math.min(1, Math.max(0, (y - (RIVE_BAS - 8)) / (H - (RIVE_BAS - 8))));
  let r = 150 - u * 86, g = 226 - u * 50, b = 208 - u * 16;
  const n = Math.abs(fbm(x * .05, y * .12, 2, 15) - .5);
  const l = lisse(.06, 0, n) * 22;
  r += l; g += l; b += l * .8;
  return [r, g, b];
}

function couleurSable(x, y) {
  const n = fbm(x * .018, y * .022, 3, 21);
  let r, g, b;
  if (dansTerrain(x, y)) {
    // Le sable damé du terrain : plus chaud et plus égal que la plage autour,
    // pour que l'aire de jeu se lise d'un coup d'œil.
    // Un relief très doux, éclairé par le soleil du fond : la pente tournée
    // vers lui s'éclaircit à peine. Pas de rides — elles sont à la Dune.
    const h = yy => fbm(x * .006 + 3, yy * .009, 3, 24);
    const pente = (h(y - 3) - h(y + 3)) * 380;
    const l = (n - .5) * 8 + pente;
    r = 226 + l; g = 204 + l * .9; b = 157 + l * .7;
  } else {
    const l = (n - .5) * 24;
    r = 238 + l; g = 222 + l * .9; b = 182 + l * .75;
  }
  // Humide près de l'eau.
  const hum = Math.max(lisse(11, 0, y - RIVE_HAUT), lisse(16, 0, RIVE_BAS - y));
  if (hum > 0) {
    r += (180 - r) * hum * .85; g += (154 - g) * hum * .85; b += (116 - b) * hum * .85;
  }
  return [r, g, b];
}

function ptIle(t, x, y, c) {
  if (x < 0 || x >= W || y < 0 || y >= HORIZON + 6) return;
  t.pt(x, y, c);
  if (y < HORIZON) CIELM[y * W + x] = 0;
}
// Palmier au loin, en silhouette.
function palmierLoin(t, x, yb, h, sens) {
  for (let k = 0; k < h; k++) ptIle(t, Math.round(x + sens * (k / h) ** 2 * 3), yb - k, C.i1);
  const hx = Math.round(x + sens * 3), hy = yb - h;
  for (const a of [-2.8, -2.2, -1.5, -.9, -.3, .3]) {
    for (let s = 1; s <= 6; s++) ptIle(t, Math.round(hx + Math.cos(a) * s), Math.round(hy + Math.sin(a) * s + s * s * .09), C.i1);
  }
}
function peindreIles(t) {
  // L'île principale, à contre-jour : collines boisées, liseré chaud sur les
  // pentes tournées vers le soleil.
  const haut = x => (7 * Math.exp(-(((x - 598) / 26) ** 2)) + 12 * Math.exp(-(((x - 660) / 32) ** 2)) +
    4 * Math.exp(-(((x - 722) / 13) ** 2)) + fbm(x * .09, 0, 2, 5) * 2.2) * lisse(546, 562, x) * (1 - lisse(728, 744, x));
  for (let x = 546; x <= 744; x++) {
    const h = Math.round(haut(x));
    if (h <= 0) continue;
    const pente = haut(x + 1) - haut(x - 1);
    for (let k = 0; k < h; k++) {
      const y = HORIZON - 1 - k;
      let c = hacher(x, y, 3) < .22 ? C.i2 : C.i1;
      if (k === h - 1) c = pente > .15 ? C.i4 : C.i2;
      ptIle(t, x, y, c);
    }
  }
  // Le grand arbre sur la colline.
  balayerEllipse(655, HORIZON - 19, 9, 5, (y, a, b) => { for (let x = a; x <= b; x++) ptIle(t, x, y, x - a < 2 && y < HORIZON - 19 ? C.i4 : hacher(x, y, 4) < .25 ? C.i2 : C.i1); });
  for (let y = HORIZON - 15; y < HORIZON - 10; y++) ptIle(t, 656, y, C.i1);
  palmierLoin(t, 584, HORIZON - 5, 11, 1);
  palmierLoin(t, 618, HORIZON - 9, 13, -1);
  palmierLoin(t, 700, HORIZON - 8, 10, 1);
  palmierLoin(t, 712, HORIZON - 6, 8, -1);
  // L'îlot, à gauche du soleil.
  for (let x = 258; x <= 296; x++) {
    const h = Math.round(4.5 * Math.exp(-(((x - 276) / 11) ** 2)));
    for (let k = 0; k < h; k++) ptIle(t, x, HORIZON - 1 - k, k === h - 1 && x > 276 ? C.i4 : C.i1);
  }
  palmierLoin(t, 274, HORIZON - 3, 10, 1);
  // Leur reflet, brisé par la houle.
  for (let y = HORIZON; y < HORIZON + 5; y++) for (let x = 546; x <= 744; x++) {
    const h = haut(x);
    if (h < 1 || y - HORIZON >= h * .45) continue;
    if (bruit(x * .3, y * 1.7, 6) > .42) t.teinte(x, y, PAL, C.i1, .75 - (y - HORIZON) * .12);
  }
}

// ---------------------------------------------------------------------------
// Le terrain : cordes, piquets, anneau de coquillages, couronne tracée au
// doigt dans le sable.
// ---------------------------------------------------------------------------
const RAMPE_CORDE = [C.b6, C.b5, C.b4, C.b3, C.b2];
function cordeH(t, x0, x1, y) {
  for (let x = x0; x <= x1; x++) {
    for (let k = -1; k <= 1; k++) {
      const s = (x - k) & 3;
      t.pt(x, y + k, RAMPE_CORDE[Math.max(0, Math.min(4, s + k))]);
    }
    t.teinte(x, y + 2, PAL, C.z1, .38);
    t.teinte(x, y + 3, PAL, C.z1, .16);
  }
}
function cordeV(t, x, y0, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let k = -1; k <= 1; k++) {
      const s = (y - k) & 3;
      t.pt(x + k, y, RAMPE_CORDE[Math.max(0, Math.min(4, s + k))]);
    }
    t.teinte(x + 2, y + 1, PAL, C.z1, .3);
  }
}
function piquet(t, x, y) {
  for (let k = -2; k <= 3; k++) t.teinte(x + k, y + 3, PAL, C.z1, .4);
  t.sprite(PIQUET, x - 2, y - 2);
}
function peindreLignes(t) {
  const { left: L, right: R, top: T, bottom: B } = COURT;
  cordeH(t, L, R, T);
  cordeH(t, L, R, B - 1);
  cordeV(t, L, T, BUT.haut - 8);
  cordeV(t, L, BUT.bas + 8, B - 1);
  cordeV(t, R - 1, T, BUT.haut - 8);
  cordeV(t, R - 1, BUT.bas + 8, B - 1);
  cordeV(t, CX, T, CY - ANNEAU - 6);
  cordeV(t, CX, CY + ANNEAU + 6, B - 1);
  for (const x of [L, 275, CX, 685, R - 1]) { piquet(t, x, T); piquet(t, x, B - 1); }
  for (const x of [L, R - 1]) { piquet(t, x, BUT.haut - 8); piquet(t, x, BUT.bas + 8); }
  piquet(t, CX, CY - ANNEAU - 6); piquet(t, CX, CY + ANNEAU + 6);
  // L'anneau central : coquillages et galets posés en rond.
  const n = 44;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const x = Math.round(CX + Math.cos(a) * ANNEAU), y = Math.round(CY + Math.sin(a) * ANNEAU);
    const f = Math.floor(hacher(i, 1, 40) * 4);
    const s = f === 0 || f === 3 ? COQUILLE : f === 1 ? BIGORNEAU : GALET;
    for (let k = -1; k <= s.l; k++) t.teinte(x - (s.l >> 1) + k, y - (s.h >> 1) + s.h, PAL, C.z1, .35);
    t.sprite(s, x - (s.l >> 1), y - (s.h >> 1));
  }
  // La couronne de Sora, tracée au doigt : un sillon, et sa lèvre claire.
  const pts = [[-15, 12], [15, 12], [19, -7], [8, 2], [0, -16], [-8, 2], [-19, -7]];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    t.ligne(CX + ax + 1, CY + ay + 1, CX + bx + 1, CY + by + 1, 0, (c, x, y) => PAL.teinter(c, C.z7, .7, x, y));
  }
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    t.ligne(CX + ax, CY + ay, CX + bx, CY + by, C.z2);
    t.ligne(CX + ax, CY + ay - 1, CX + bx, CY + by - 1, 0, (c, x, y) => PAL.teinter(c, C.z1, .5, x, y));
  }
  t.hl(CX - 12, CX + 12, CY + 7, C.z3);
  for (const dx of [-7, 0, 7]) { t.pt(CX + dx, CY + 7, C.z1); t.pt(CX + dx, CY + 6, C.z2); }
}

// ---------------------------------------------------------------------------
// Les cages : des radeaux de rondins liés à la corde, le plancher peint aux
// couleurs des zones — turquoise pour les 3, jaune paopu pour le 5.
// ---------------------------------------------------------------------------
function rondinH(t, xa, xb, y0) {
  const R = [C.b3, C.b5, C.b4, C.b4, C.b3, C.b1];
  for (let x = xa; x <= xb; x++) for (let k = 0; k < 6; k++) {
    let c = R[k];
    if (k > 0 && k < 5 && hacher(x, y0 + k, 51) < .1) c = C.b2;
    t.pt(x, y0 + k, c);
  }
  for (const x of [xa, xb]) {
    balayerDisque(x, y0 + 2.5, 3, (y, a, b) => { for (let xx = a; xx <= b; xx++) {
      const d = Math.hypot(xx - x, y - y0 - 2.5);
      t.pt(xx, y, d > 2.4 ? C.b1 : d > 1.4 ? C.b5 : C.b6);
    } });
    t.pt(x, Math.round(y0 + 2.5), C.b3);
  }
  for (let x = xa - 2; x <= xb + 2; x++) t.teinte(x, y0 + 6, PAL, C.z1, .4);
}
function rondinV(t, x0, ya, yb) {
  const R = [C.b1, C.b3, C.b5, C.b4, C.b3, C.b2];
  for (let y = ya; y <= yb; y++) for (let k = 0; k < 6; k++) {
    let c = R[k];
    if (k > 0 && k < 5 && hacher(x0 + k, y, 52) < .1) c = C.b2;
    t.pt(x0 + k, y, c);
  }
}
function ligature(t, x, y) {
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const s = (i + j) & 3;
    t.pt(x + i, y + j, s === 0 ? C.a4 : s === 1 ? C.a3 : s === 2 ? C.a3 : C.a2);
  }
  t.hl(x, x + 7, y + 8, C.a1);
}
// Les zones sont les voiles du radeau, tendues dans le cadre de rondins
// par-dessus un filet de pêche : deux voiles blanches à bande bleue pour les
// 3, la voile jaune paopu pour le 5. Chiffres bleu nuit, bordés de blanc.
const VOILE_CHIFFRE = { 3: spriteChiffre(3, C.m1, C.m1, C.m0, C.w), 5: spriteChiffre(5, C.o1, C.o1, C.o1, C.z8) };
function voile(t, x0, x1, y0, y1, cinq) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (let y = y0; y < y1; y++) for (let x = x0; x <= x1; x++) {
    // Le vent gonfle la toile : claire au milieu, plus sombre vers les ralingues.
    const g = 1 - Math.max(Math.abs(x - cx) / ((x1 - x0) / 2), Math.abs(y - cy) / ((y1 - y0) / 2)) ** 2;
    let c;
    if (cinq) c = g > .55 ? C.j3 : g > .2 ? C.j2 : C.j1;
    else c = g > .55 ? C.w : g > .2 ? C.z8 : C.z6;
    if (!cinq && (Math.abs(y - y0 - 6) < 2 || Math.abs(y1 - 7 - y) < 2)) c = g > .3 ? C.m3 : C.m2;
    if (cinq && (y === y0 + 3 || y === y1 - 4)) c = C.o2;
    if ((x - x0) % 12 === 11 && g < .6) c = cinq ? C.j1 : C.z5;          // coutures
    if (x === x0 || x === x1 || y === y0 || y === y1 - 1) c = C.a2;
    t.pt(x, y, c);
  }
  // Œillets et cordelettes jusqu'au cadre.
  for (const [px, py, dx, dy] of [[x0, y0, -3, -3], [x1, y0, 3, -3], [x0, y1 - 1, -3, 3], [x1, y1 - 1, 3, 3]]) {
    t.pt(px, py, C.b1); t.ligne(px, py, px + dx, py + dy, C.a3);
  }
}
function peindreCage(t, cote) {
  const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, x1 = x0 + BUT.prof - 1;
  // Le sable, sous un filet de pêche.
  for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x <= x1; x++) {
    const filet = (x + y) % 7 === 0 || (x - y + 700) % 7 === 0;
    const noeud = (x + y) % 7 === 0 && (x - y + 700) % 7 === 0;
    t.pt(x, y, noeud ? C.a1 : filet ? C.a2 : hacher(x, y, 33) < .1 ? C.z3 : C.z4);
  }
  for (const z of ZONES) {
    const y0 = CY + z.from + 5, y1 = CY + z.to - 4;
    voile(t, x0 + 5, x1 - 5, y0, y1, z.points === 5);
    const s = VOILE_CHIFFRE[z.points];
    t.sprite(s, Math.round((x0 + x1) / 2 - s.l / 2 + .5), Math.round((y0 + y1) / 2 - s.h / 2), MIROIR);
  }
  // Le cadre de rondins : dessus, dessous, et le dos.
  const dos = cote === 1 ? x0 - 6 : x1 + 1;
  rondinV(t, dos, BUT.haut - 6, BUT.bas + 5);
  rondinH(t, Math.min(x0, dos) - 1, Math.max(x1, dos + 5) + 3 * (cote === 1 ? 1 : 0), BUT.haut - 6);
  rondinH(t, Math.min(x0, dos) - 1 - 3 * (cote === 2 ? 1 : 0), Math.max(x1, dos + 5) + 1, BUT.bas);
  for (const y of [BUT.haut - 7, BUT.bas - 1]) ligature(t, dos - 1, y);
  // À l'embouchure, une corde tendue et ses flotteurs rouges et blancs.
  const mx = cote === 1 ? COURT.left : COURT.right - 1;
  for (let y = BUT.haut; y < BUT.bas; y++) { t.pt(mx, y, (y & 3) < 2 ? C.a4 : C.a2); t.pt(mx + (cote === 1 ? 1 : -1), y, C.a1); }
  for (let y = BUT.haut + 10; y < BUT.bas - 6; y += 18) {
    balayerEllipse(mx, y, 3, 4, (yy, a0, b0) => { for (let x = a0; x <= b0; x++) t.pt(x, yy, (Math.floor((yy - y + 4) / 3) % 2 ? C.w : C.o2)); });
    t.pt(mx - 1, y - 2, C.w);
  }
}

// ---------------------------------------------------------------------------
// Les bords. À gauche la cabane et le tas de rondins du radeau, un cocotier et
// l'épée de bois de Sora plantée dans le sable ; à droite l'arbre à paopu et
// les rochers. En bas, le lagon : château de sable, traces de pas, ponton.
// ---------------------------------------------------------------------------
function ombreSol(t, cx, cy, rx, ry, k) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) {
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    t.teinte(x, y, PAL, C.z1, k * (1 - e * .6));
  } });
}
function cabane(t) {
  ombreSol(t, 34, 178, 34, 6, .45);
  for (const px of [9, 23, 43, 57]) for (let y = 164; y < 179; y++) { t.pt(px, y, C.b2); t.pt(px + 1, y, C.b3); t.pt(px + 2, y, C.b1); }
  for (let x = 4; x <= 64; x++) { t.pt(x, 161, C.b5); t.pt(x, 162, C.b4); t.pt(x, 163, C.b3); t.pt(x, 164, C.b1); }
  for (let y = 120; y < 161; y++) for (let x = 8; x <= 60; x++) {
    const planche = Math.floor((x - 8) / 6), j = (x - 8) % 6;
    let c = j === 0 ? C.b1 : j === 5 ? C.b2 : planche % 2 ? C.b4 : C.b3;
    if (j !== 0 && j !== 5 && bruit(planche * 9 + j * .3, y * .15, 33) > .72) c = C.b2;
    if (y > 155) c = j === 0 ? C.b0 : C.b2;
    t.pt(x, y, c);
  }
  // La porte, ouverte sur le noir, un pan de toile rouge accroché.
  for (let y = 132; y < 161; y++) for (let x = 24; x <= 37; x++) t.pt(x, y, y < 134 || x === 24 || x === 37 ? C.b1 : x < 28 ? C.k : C.b0);
  for (let y = 134; y < 150; y++) { const l = 4 - Math.floor((y - 134) / 5); for (let x = 25; x < 25 + l; x++) t.pt(x, y, x === 25 ? C.o1 : C.o2); }
  // La fenêtre.
  for (let y = 131; y < 143; y++) for (let x = 43; x <= 54; x++) {
    const bord = y === 131 || y === 142 || x === 43 || x === 54;
    t.pt(x, y, bord ? C.b1 : x === 48 || y === 136 ? C.b2 : y < 134 ? C.b0 : C.k);
  }
  t.hl(42, 55, 143, C.b5);
  // Le toit de chaume, rangée par rangée, et sa frange effilochée.
  balayerPoly([[0, 126], [69, 126], [56, 98], [12, 98]], (y, a, b) => { for (let x = a; x <= b; x++) {
    const rang = Math.floor((y - 98) / 5), j = (y - 98) % 5;
    const brin = hacher(x + (rang & 1) * 2, rang, 34);
    let c = j === 4 ? C.a1 : brin > .66 ? C.a4 : brin > .3 ? C.a3 : C.a2;
    if (y < 100) c = hacher(x, y, 36) > .5 ? C.a4 : C.a3;
    if (x === a) c = C.a1;
    t.pt(x, y, c);
  } });
  for (let x = 0; x <= 69; x++) {
    const l = 1 + Math.floor(hacher(x, 0, 35) * 3);
    for (let k = 0; k < l; k++) t.pt(x, 126 + k, k === l - 1 ? C.a1 : C.a2);
  }
  // L'échelle posée contre le plancher.
  for (let y = 146; y < 184; y++) {
    const dx = Math.round((y - 146) * .12);
    t.pt(61 + dx, y, C.b3); t.pt(66 + dx, y, C.b3); t.pt(67 + dx, y, C.b1);
    if ((y - 146) % 6 === 2) t.hl(62 + dx, 65 + dx, y, C.b5);
  }
  // Le tas de rondins du radeau, bouts coupés vers nous, et un rouleau de corde.
  for (const [x, y] of [[10, 205], [19, 205], [28, 205], [14.5, 197], [23.5, 197], [19, 189]]) {
    balayerDisque(x, y, 4, (yy, a, b) => { for (let xx = a; xx <= b; xx++) {
      const d = Math.hypot(xx - x, yy - y);
      t.pt(xx, yy, d > 3.6 ? C.b1 : d > 2.8 ? C.b2 : Math.abs(d - 1.6) < .5 ? C.b4 : d < .8 ? C.b3 : C.b6);
    } });
  }
  ombreSol(t, 20, 211, 18, 3, .4);
  ombreSol(t, 46, 208, 9, 3, .4);
  for (let r = 6; r >= 1; r -= 1.5) {
    for (let a = 0; a < Math.PI * 2; a += .08) {
      const x = Math.round(46 + Math.cos(a) * r), y = Math.round(204 + Math.sin(a) * r * .5);
      t.pt(x, y, a > Math.PI ? C.a4 : C.a2);
    }
  }
}
// L'épée de bois de Sora, plantée de travers dans le sable.
function epee(t, x, yPlante) {
  const th = .2, ax = Math.sin(th), ay = -Math.cos(th), nx = -ay, ny = ax;
  for (let k = 0; k < 18; k++) t.teinte(x + 1 + k, yPlante + 1 + (k >> 2), PAL, C.z1, .4 * (1 - k / 18));
  const pose = (s, o, c) => t.pt(Math.round(x + ax * s + nx * o), Math.round(yPlante + ay * s + ny * o), c);
  // Lame : arête claire à gauche, flanc sombre à droite, bout arrondi enterré.
  for (let s = 0; s <= 30; s += .5) for (let o = -1.5; o <= 1.5; o += .5) pose(s, o, o < -.9 ? C.b6 : o < 0 ? C.b5 : o < .9 ? C.b4 : C.b2);
  // Garde, poignée entourée de corde, pommeau.
  for (let o = -5.5; o <= 5.5; o += .5) { pose(31, o, C.b2); pose(32, o, o < 0 ? C.b5 : C.b4); pose(33, o, C.b1); }
  for (let s = 34; s <= 42; s += .5) for (let o = -1; o <= 1; o += .5) pose(s, o, (Math.floor(s) & 1) ? (o < 0 ? C.a4 : C.a3) : C.a2);
  for (let s = 43; s <= 45; s += .5) for (let o = -1.5; o <= 1.5; o += .5) pose(s, o, o < 0 ? C.b5 : C.b3);
  for (let x2 = x - 6; x2 <= x + 6; x2++) t.teinte(x2, yPlante + 1, PAL, C.z7, .6 * (1 - Math.abs(x2 - x) / 7));
}
// Tronc de palmier le long d'une courbe de Bézier, bagué. La largeur se
// prend en travers de la courbe, et la lumière vient de `lum` (vecteur).
function tronc(t, P, l0, l1, lum) {
  const R = [C.z0, C.z1, C.z2, C.z3, C.z4];
  const bez = (u, k) => { const v = 1 - u; return v * v * v * P[0][k] + 3 * v * v * u * P[1][k] + 3 * v * u * u * P[2][k] + u * u * u * P[3][k]; };
  const ll = Math.hypot(lum[0], lum[1]), lx = lum[0] / ll, ly = lum[1] / ll;
  for (let i = 0; i <= 700; i++) {
    const u = i / 700;
    const x = bez(u, 0), y = bez(u, 1);
    let dx = bez(Math.min(1, u + .002), 0) - bez(Math.max(0, u - .002), 0), dy = bez(Math.min(1, u + .002), 1) - bez(Math.max(0, u - .002), 1);
    const dn = Math.hypot(dx, dy) || 1; dx /= dn; dy /= dn;
    const nx = -dy, ny = dx, w = l0 + (l1 - l0) * u;
    const bague = (u * 34) % 1 < .16;
    for (let k = -w / 2; k <= w / 2; k += .5) {
      const q = k / (w / 2) * (nx * lx + ny * ly);
      let c = R[Math.max(0, Math.min(4, Math.round(2 + q * 2)))];
      if (Math.abs(k) > w / 2 - .6) c = C.z0;
      else if (bague) c = q > .3 ? C.z2 : C.z1;
      t.pt(Math.round(x + nx * k), Math.round(y + ny * k), c);
    }
  }
}
function coco(t, x, y) {
  balayerDisque(x, y, 2.6, (yy, a, b) => { for (let xx = a; xx <= b; xx++) {
    const d = (xx - x) + (yy - y), e = Math.hypot(xx - x, yy - y);
    t.pt(xx, yy, e > 2.3 ? C.b0 : d < -1.5 ? C.b4 : d < .5 ? C.b2 : C.b1);
  } });
}
function rocher(t, cx, cy, rx, ry) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) {
    const dy = (y - cy) / ry, dx = (x - cx) / rx, e = dx * dx + dy * dy;
    let c = dy < -.45 ? C.p4 : dy < 0 ? C.p3 : dy < .5 ? C.p2 : C.p1;
    if (e > .78) c = dy < -.2 ? C.p2 : C.p0;
    if (hacher(x, y, 57) < .07) c = C.p1;
    if (dy > .3 && hacher(x, y, 58) < .05) c = C.z8;
    t.pt(x, y, c);
  } });
}
function peindreBords(t) {
  // Petits riens sur la plage : coquillages, galets, bigorneaux, hors du terrain.
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hacher(i, 1, 60) * W), y = RIVE_HAUT + 4 + Math.floor(hacher(i, 2, 60) * (RIVE_BAS - RIVE_HAUT - 16));
    if (x > COURT.left - 8 && x < COURT.right + 8 && y > COURT.top - 8 && y < COURT.bottom + 8) continue;
    if (dansCage(x, y) || (x < 70 && y > 92 && y < 216)) continue;
    const s = [COQUILLE, BIGORNEAU, GALET][Math.floor(hacher(i, 3, 60) * 3)];
    t.teinte(x, y + s.h, PAL, C.z1, .3);
    t.sprite(s, x, y);
  }
  // Grain de la plage : du sable plus foncé et plus clair, pixel à pixel.
  for (let y = RIVE_HAUT + 2; y < RIVE_BAS - 4; y++) for (let x = 0; x < W; x++) {
    const h = hacher(x, y, 61), dedans = dansTerrain(x, y);
    if (h < (dedans ? .008 : .02)) t.pt(x, y, dedans ? C.z3 : C.z4);
    else if (h > (dedans ? .994 : .985)) t.pt(x, y, C.z8);
  }
  traces(t, [[150, 118], [220, 170], [300, 196], [390, 250]], .26, 13);
  traces(t, [[610, 530], [690, 470], [760, 430], [840, 410]], .26, 13);
  traces(t, [[560, 110], [610, 150], [640, 210]], .26, 13);
  traces(t, [[330, 520], [300, 470], [240, 440]], .26, 13);
  cabane(t);
  epee(t, 58, 498);
  tronc(t, [[40, 555], [46, 512], [20, 484], [27, 454]], 7, 4, [.6, -1]);
  for (const [x, y] of [[10, 552], [18, 556]]) {
    ombreSol(t, x + 1, y + 3, 4, 1.5, .4);
    coco(t, x, y);
  }
  // L'arbre à paopu : son tronc couché qui se redresse, sur un talus.
  ombreSol(t, 936, 212, 26, 4, .4);
  tronc(t, [[966, 206], [928, 208], [900, 188], [905, 146]], 8, 4.5, [-.5, -1]);
  for (const [x, y, rx, ry] of [[918, 505, 14, 10], [941, 494, 12, 12], [930, 520, 16, 9], [952, 522, 9, 7], [904, 526, 8, 6]]) {
    ombreSol(t, x + 2, y + ry, rx, 3, .45);
    rocher(t, x, y, rx, ry);
  }
  // La mare entre les rochers, qui renvoie le ciel.
  balayerEllipse(921, 541, 13, 4, (y, a, b) => { for (let x = a; x <= b; x++) {
    const k = (y - 537) / 8;
    t.pt(x, y, x === a || x === b ? C.p1 : k < .3 ? C.m3 : k < .55 ? C.m4 : k < .8 ? C.m5 : C.m6);
  } });
  etoile(t, 940, 484, 5, C.o4, C.o3, C.o2, C.o1, .3);
  for (const [x, y] of [[900, 532], [946, 532], [912, 512]]) { t.pt(x, y, C.v2); t.pt(x + 1, y - 1, C.v3); t.pt(x - 1, y - 1, C.v1); }

  // En haut, la bande de plage entre l'océan et le terrain.
  for (let x = 206; x < 226; x++) { t.pt(x, 78, C.b1); t.pt(x, 79, C.b4); t.pt(x, 80, C.b3); t.teinte(x, 81, PAL, C.z1, .35); }
  t.pt(205, 79, C.b2); t.pt(226, 79, C.b5);
  etoile(t, 772, 78, 3, C.o4, C.o3, C.o2, C.o1, .5);
  for (let x = 606; x < 624; x++) t.pt(x, 78 + Math.round(Math.sin(x * .7)), (x & 1) ? C.v1 : C.v2);

  // En bas : château de sable, traces de pas, étoile de mer, algues, ponton.
  chateau(t, 132, 580);
  traces(t, [[166, 576], [260, 574], [360, 578], [440, 575]], .38, 12);
  // Le crabe laisse sa trace sur le sable mouillé.
  for (let x = 806; x < 876; x += 3) { t.teinte(x, 583, PAL, C.z1, .3); t.teinte(x + 1, 585, PAL, C.z1, .3); }
  etoile(t, 548, 578, 5, C.o4, C.o3, C.o2, C.o1, -.2);
  for (const [x, y, s] of [[476, 571, COQUILLE], [590, 570, BIGORNEAU], [622, 575, COQUILLE], [506, 576, GALET]]) {
    t.teinte(x + 1, y + s.h, PAL, C.z1, .3); t.sprite(s, x, y);
  }
  for (const x0 of [380, 792]) for (let k = 0; k < 14; k++) {
    const x = x0 + k, y = 581 + Math.round(Math.sin(k * .8 + x0) * 1.2);
    t.pt(x, y, k % 3 ? C.v1 : C.v2);
  }
  coco(t, 520, 578);
  ombreSol(t, 521, 582, 4, 1.2, .35);
}
// Des traces de pas le long d'un chemin : une empreinte tous les `pas` px,
// pied gauche et pied droit, orientées dans le sens de la marche.
function traces(t, chemin, k, pas = 11) {
  let cote = 1, reste = 0;
  for (let i = 0; i + 1 < chemin.length; i++) {
    const [ax, ay] = chemin[i], [bx, by] = chemin[i + 1];
    const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L;
    for (let d = reste; d < L; d += pas) {
      const cx = ax + dx * d - dy * 2.4 * cote, cy = ay + dy * d + dx * 2.4 * cote;
      empreinte(t, cx, cy, dx, dy, k);
      cote = -cote;
      reste = d + pas - L;
    }
  }
}
function empreinte(t, cx, cy, dx, dy, k) {
  for (let y = Math.floor(cy - 5); y <= cy + 5; y++) for (let x = Math.floor(cx - 5); x <= cx + 5; x++) {
    const lx = (x + .5 - cx) * dx + (y + .5 - cy) * dy, ly = -(x + .5 - cx) * dy + (y + .5 - cy) * dx;
    const avant = ((lx - 1.2) / 2.4) ** 2 + (ly / 1.5) ** 2, talon = ((lx + 2.6) / 1.2) ** 2 + (ly / 1.2) ** 2;
    if (avant <= 1 || talon <= 1) t.teinte(x, y, PAL, C.z1, k);
    else if ((avant <= 1.9 || talon <= 2.2) && y > cy) t.teinte(x, y, PAL, C.z8, k * .8);
  }
}
function chateau(t, cx, yb) {
  ombreSol(t, cx + 3, yb + 1, 26, 3, .35);
  const tour = (x, h, l) => {
    for (let y = yb - h; y < yb; y++) {
      const e = Math.round((y - (yb - h)) / h * 1.5);
      for (let xx = x - l - e; xx <= x + l + e; xx++) {
        let c = xx === x + l + e ? C.z2 : xx === x - l - e ? C.z3 : (xx - x) % 3 === 0 ? C.z4 : C.z5;
        if (y === yb - h) c = C.z6;
        t.pt(xx, y, c);
      }
    }
    for (let xx = x - l; xx <= x + l; xx += 2) { t.pt(xx, yb - h - 1, C.z6); t.pt(xx, yb - h - 2, C.z5); }
  };
  for (let y = yb - 6; y < yb; y++) for (let x = cx - 18; x <= cx + 18; x++) t.pt(x, y, y === yb - 6 ? C.z6 : x > cx + 10 ? C.z3 : C.z4);
  for (let x = cx - 18; x <= cx + 18; x += 3) t.pt(x, yb - 7, C.z5);
  tour(cx - 14, 10, 3);
  tour(cx + 14, 10, 3);
  tour(cx, 15, 4);
  for (let y = yb - 5; y < yb; y++) for (let x = cx - 2; x <= cx + 2; x++) if (y > yb - 5 || Math.abs(x - cx) < 2) t.pt(x, y, C.z1);
  for (let y = yb - 24; y < yb - 15; y++) t.pt(cx, y, C.z0);
}
// Le ponton qui s'avance dans le lagon : il passe au-dessus de l'eau animée.
function peindrePonton() {
  const D = new Uint32Array(W * H);
  const pt = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) D[y * W + x] = c; };
  const x0 = 664, x1 = 704;
  for (let y = 572; y < H; y++) {
    const j = (y - 572) % 5;
    for (let x = x0; x <= x1; x++) {
      let c = j === 4 ? C.b1 : j === 0 ? C.b5 : C.b4;
      if (j > 0 && j < 4 && bruit(x * .2, Math.floor((y - 572) / 5) * 5, 64) > .7) c = C.b3;
      if (x === x0 || x === x1) c = C.b2;
      pt(x, y, c);
    }
    if (j === 2) { pt(x0 + 3, y, C.b1); pt(x1 - 3, y, C.b1); }
  }
  for (const [x, y] of [[x0 - 2, 580], [x1 - 1, 580], [x0 - 2, 594], [x1 - 1, 594]]) {
    for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) pt(x + i, y + j, j === 0 ? C.b4 : i === 0 ? C.b3 : C.b1);
  }
  return D;
}

function peindreFond() {
  const t = new Toile(W, H);
  const couches = !EAU;
  if (couches) { EAU = new Uint32Array(W * H); CIELM = new Uint8Array(W * HORIZON); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y < HORIZON) {
      const [r, g, b] = couleurCiel(x, y);
      t.px[i] = CIEL.tramer(r, g, b, x, y, 1.8);
      CIELM[i] = 1;
      continue;
    }
    if (y < RIVE_HAUT + 8) {
      const [r, g, b] = couleurOcean(x, y);
      EAU[i] = MER.tramer(r, g, b, x, y, 1.6);
      if (y < RIVE_HAUT - 4) { t.px[i] = EAU[i]; continue; }
    }
    if (y >= RIVE_BAS - 8) {
      const [r, g, b] = couleurLagon(x, y);
      EAU[i] = MER.tramer(r, g, b, x, y, 1.6);
      if (y > RIVE_BAS + 7) { t.px[i] = EAU[i]; continue; }
    }
    const [r, g, b] = couleurSable(x, y);
    const hum = y < RIVE_HAUT + 12 || y > RIVE_BAS - 17;
    t.px[i] = SABLE.tramer(r, g, b, x, y, hum ? 1.4 : dansTerrain(x, y) ? 2.8 : 2.2);
  }
  // Le soleil, posé sur l'horizon, et le liseré d'or où il touche l'eau.
  balayerDisque(SOLEIL.x, SOLEIL.y, SOLEIL.r, (y, a, b) => {
    if (y >= HORIZON) return;
    for (let x = a; x <= b; x++) {
      const d = Math.hypot(x - SOLEIL.x, y - SOLEIL.y) / SOLEIL.r;
      const v = (y - (SOLEIL.y - SOLEIL.r)) / (2 * SOLEIL.r);
      let c = v < .3 ? C.s4 : v < .56 ? C.s3 : C.s2;
      if (d > .9) c = v < .45 ? C.s3 : C.s1;
      t.pt(x, y, c);
    }
  });
  for (let x = SOLEIL.x - 34; x <= SOLEIL.x + 34; x++) {
    const k = 1 - Math.abs(x - SOLEIL.x) / 34;
    t.teinte(x, HORIZON - 1, PAL, C.s4, k);
    t.teinte(x, HORIZON, PAL, C.s3, k * .9);
    if (couches) EAU[HORIZON * W + x] = t.px[HORIZON * W + x];
  }
  peindreIles(t);
  peindreBords(t);
  peindreLignes(t);
  peindreCage(t, 1);
  peindreCage(t, 2);
  if (couches) DESSUS = peindrePonton();
  FOND = t;
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
// Les nuages : des sprites calculés une fois, qui glissent lentement et
// passent derrière les îles.
const NUAGES = [];
for (let i = 0; i < 6; i++) {
  const l = 64 + Math.floor(hacher(i, 1, 70) * 70), h = 10 + Math.floor(hacher(i, 2, 70) * 6);
  const px = new Uint32Array(l * h);
  const bulles = [];
  const nb = 3 + Math.floor(l / 26);
  for (let b = 0; b < nb; b++) {
    const u = (b + .5) / nb;
    bulles.push([u * l, h * (.55 + hacher(b, i, 71) * .15), l / nb * (.75 + hacher(b, i, 72) * .5), h * (.35 + Math.sin(u * Math.PI) * .45)]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    let e = Infinity;
    for (const [bx, by, rx, ry] of bulles) e = Math.min(e, ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2);
    e += (fbm(x * .15, y * .3, 2, 73 + i) - .5) * .5;
    if (e > 1 || y > h - 2) continue;
    const v = y / h;
    let r = 96 + v * 150, g = 96 + v * 70, b = 160 - v * 10;
    if (v > .7) { r = 246; g = 180 - (1 - v) * 60; b = 140; }
    px[y * l + x] = NUAGE.tramer(r, g, b, x, y, 1.6);
  }
  NUAGES.push({ l, h, px, y: 2 + Math.floor(hacher(i, 3, 70) * 16), x0: hacher(i, 4, 70) * (W + l), v: 1.6 + hacher(i, 5, 70) * 1.8 });
}
function nuages(t, temps) {
  for (const n of NUAGES) {
    const per = W + n.l;
    const x0 = Math.round(((n.x0 + temps * n.v) % per) - n.l);
    for (let y = 0; y < n.h; y++) {
      const yy = n.y + y;
      if (yy >= HORIZON) break;
      for (let x = 0; x < n.l; x++) {
        const c = n.px[y * n.l + x], xx = x0 + x;
        if (!c || xx < 0 || xx >= W || !CIELM[yy * W + xx]) continue;
        t.px[yy * W + xx] = c;
      }
    }
  }
}
function goelands(t, temps) {
  for (let i = 0; i < 2; i++) {
    const per = W + 80, v = 12 + i * 5;
    const x = Math.round(((temps * v + i * 430) % per) - 40);
    const y = Math.round(9 + i * 9 + Math.sin(temps * .4 + i * 2) * 3);
    const battement = (temps * (1.1 + i * .2) + i) % 3 < .5;
    t.sprite(GOELAND[battement ? 0 : 1], x, y);
  }
}
// Les éclats de lumière sur l'océan : dans le chemin du soleil surtout, chacun
// s'allume et s'éteint en douceur, puis renaît ailleurs.
function eclats(t, temps) {
  for (let i = 0; i < 46; i++) {
    const cyc = temps * .45 + hacher(i, 1, 75) * 7, n = Math.floor(cyc), ph = cyc - n;
    if (ph > .5) continue;
    const y = HORIZON + 2 + Math.floor(hacher(i, n, 76) ** 1.3 * (RIVE_HAUT - HORIZON - 7));
    const chemin = i < 30;
    const wp = 5 + (y - HORIZON) * 1.9;
    const x = Math.round(chemin ? SOLEIL.x + (hacher(i, n, 77) * 2 - 1) * wp : hacher(i, n, 78) * W);
    const k = Math.sin(ph / .5 * Math.PI);
    const l = Math.round(1 + k * (1 + (y - HORIZON) * .08));
    for (let d = -l; d <= l; d++) t.teinte(x + d, y, PAL, chemin ? C.s4 : C.m7, (d === 0 ? .95 : .6) * k);
  }
}
// La ligne d'eau, en haut et en bas : l'eau qui monte et redescend, la dentelle
// d'écume, le sable mouillé qui brille juste derrière.
function rivageHaut(t, temps) {
  for (let x = 0; x < W; x++) {
    const yw = RIVE_HAUT + Math.sin(temps * .9 + x * .012) * 1.4 + Math.sin(temps * .55 - x * .019 + 1.3) * .9;
    const yi = Math.floor(yw);
    const ecume = bruit(x * .22, temps * .7, 80);
    for (let y = RIVE_HAUT - 4; y <= RIVE_HAUT + 6; y++) {
      const i = y * W + x;
      if (y < yi - 1) {
        t.px[i] = EAU[i];
        if (y >= yi - 3) t.px[i] = PAL.teinter(t.px[i], C.m7, .45, x, y);
      } else if (y === yi - 1) t.px[i] = ecume > .55 ? C.m7 : PAL.teinter(EAU[i], C.m7, .6, x, y);
      else if (y === yi) t.px[i] = ecume > .25 ? C.w : C.m7;
      else {
        const k = 1 - (y - yw) / 4;
        if (k > 0) t.px[i] = PAL.teinter(t.px[i], C.k4, .3 * k, x, y);
      }
    }
  }
}
function rivageBas(t, temps) {
  for (let x = 0; x < W; x++) {
    const yw = RIVE_BAS + Math.sin(temps * .8 + x * .011) * 2.6 + Math.sin(temps * .5 - x * .019 + 2) * 1.4;
    const yi = Math.ceil(yw);
    const ecume = bruit(x * .2, temps * .6, 81);
    for (let y = RIVE_BAS - 8; y <= RIVE_BAS + 7; y++) {
      const i = y * W + x;
      if (y > yi + 1) {
        t.px[i] = EAU[i];
        if (y <= yi + 3) t.px[i] = PAL.teinter(t.px[i], C.m7, .45, x, y);
      } else if (y === yi + 1) t.px[i] = ecume > .5 ? C.m7 : PAL.teinter(EAU[i], C.m7, .6, x, y);
      else if (y === yi) t.px[i] = ecume > .22 ? C.w : C.m7;
      else {
        const k = 1 - (yw - y) / 4;
        if (k > 0) t.px[i] = PAL.teinter(t.px[i], C.k4, .3 * k, x, y);
      }
    }
    // Une vaguelette plus loin, qui se forme et se défait.
    const yv = Math.round(yw + 6 + Math.sin(temps * .7 + x * .02) * 1.2);
    const f = lisse(.45, .75, bruit(x * .08, temps * .35, 82));
    if (f > 0 && yv < H) t.teinte(x, yv, PAL, C.m7, .7 * f);
  }
  // Scintillements du lagon.
  for (let i = 0; i < 18; i++) {
    const cyc = temps * .6 + hacher(i, 1, 83) * 5, n = Math.floor(cyc), ph = cyc - n;
    if (ph > .4) continue;
    const x = Math.floor(hacher(i, n, 84) * W), y = RIVE_BAS + 5 + Math.floor(hacher(i, n, 85) * (H - RIVE_BAS - 5));
    t.teinte(x, y, PAL, C.w, Math.sin(ph / .4 * Math.PI) * .9);
  }
}
function ronds(t, cx, cy, rx, ry, temps, ph) {
  const q = (temps * .5 + ph) % 1;
  const r = 1 + q;
  for (let a = 0; a < Math.PI * 2; a += .12) {
    const x = Math.round(cx + Math.cos(a) * rx * r), y = Math.round(cy + Math.sin(a) * ry * r);
    if (y > RIVE_BAS + 2) t.teinte(x, y, PAL, C.m7, .55 * (1 - q));
  }
}
function lagon(t, temps) {
  // La bouteille à la mer, qui dérive lentement et danse sur l'eau.
  const bx = Math.round(300 + Math.sin(temps * .21) * 10), by = Math.round(592 + Math.sin(temps * 1.1) * 1.1);
  ronds(t, bx + 5, by + 3, 8, 2.5, temps, 0);
  t.sprite(BOUTEILLE, bx, by);
  for (let x = bx; x < bx + 12; x++) for (const y of [by + 4, by + 5]) t.teinte(x, y, PAL, C.m4, .5);
  // Le ponton, puis la barque amarrée qui tangue.
  for (let i = 0; i < DESSUS.length; i++) if (DESSUS[i]) t.px[i] = DESSUS[i];
  for (const x of [662, 703]) ronds(t, x + 2, 598, 4, 1.5, temps, x * .01);
  const oy = Math.round(Math.sin(temps * 1.25) * .9);
  barque(t, 712, 592 + oy, temps);
}
function barque(t, x0, cy, temps) {
  const L = 52;
  ronds(t, x0 + L / 2, cy, L * .55, 7.5, temps, .5);
  for (let x = 0; x <= L; x++) {
    const w = 6.4 * Math.pow(Math.sin(Math.PI * x / L), .55);
    const n = Math.round(w);
    for (let dy = -n; dy <= n; dy++) {
      let c = C.b3;
      if (Math.abs(dy) === n) c = C.b1;
      else if (Math.abs(dy) === n - 1) c = dy < 0 ? C.b5 : C.b4;
      else if (x % 7 === 0) c = C.b2;
      if ((x >= 16 && x <= 19) || (x >= 33 && x <= 36)) c = Math.abs(dy) >= n - 1 ? c : x === 19 || x === 36 ? C.b2 : C.b5;
      t.pt(x0 + x, cy + dy, c);
    }
  }
  // La rame, posée en travers.
  t.ligne(x0 + 20, cy - 2, x0 + 42, cy + 2, C.b6);
  t.ligne(x0 + 20, cy - 1, x0 + 42, cy + 3, C.b4);
  for (let k = 0; k < 5; k++) { t.pt(x0 + 42 + k, cy + 2, C.b5); t.pt(x0 + 42 + k, cy + 3, C.b4); }
  // L'amarre jusqu'au poteau du ponton.
  t.ligne(x0 + 1, cy, x0 - 7, cy + 2, C.a3);
}
function crabe(t, temps) {
  const cyc = temps % 18;
  let x, marche;
  if (cyc < 6) { x = 806 + cyc * 10; marche = true; }
  else if (cyc < 9) { x = 866; marche = false; }
  else if (cyc < 15) { x = 866 - (cyc - 9) * 10; marche = true; }
  else { x = 806; marche = false; }
  const y = 574;
  for (let k = -1; k <= 11; k++) t.teinte(Math.round(x) + k, y + 7, PAL, C.z1, .35);
  const f = marche ? Math.floor(temps * 5) & 1 : 0;
  t.sprite(CRABE[f], Math.round(x), y);
}
// Palmes, avec leur ombre sur le sable : l'ombre suit le balancement.
const OMBRE = new Uint8Array(W * H);
const OMBRE_LISTE = [];
function marquerOmbre(x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < RIVE_HAUT + 4 || y >= RIVE_BAS - 4 || dansCage(x, y)) return;
  const i = y * W + x;
  if (!OMBRE[i]) { OMBRE[i] = 1; OMBRE_LISTE.push(i); }
}
function couronne(t, hx, hy, def, temps, ph, ombre) {
  for (let i = 0; i < def.length; i++) {
    const [a0, L, tombe] = def[i];
    const a = a0 + Math.sin(temps * .75 + ph + i * .7) * .05;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 1; s <= L; s++) {
      const u = s / L;
      const x = hx + ca * s, y = hy + sa * s + tombe * u * u * L;
      // Folioles : longues au milieu de la palme, courtes au bout, et qui
      // pendent — des deux côtés quand la palme monte, dessous quand elle
      // retombe.
      const f = Math.max(1, Math.round(Math.sin(Math.min(1, u * 1.1) * Math.PI) * 6 * (.7 + hacher(i, s, 92) * .5)));
      for (const sg of [1, -1]) {
        let dx = -sa * sg, dy = ca * sg + .8;
        const n = Math.hypot(dx, dy); dx /= n; dy /= n;
        if (dy < -.25) continue;
        const len = Math.max(1, Math.round(f * (dy > .45 ? 1 : .6)));
        for (let k = 1; k <= len; k++) {
          const px = x + dx * k, py = y + dy * k;
          if (ombre) { if (k % 2 === 0 || k === len) marquerOmbre(px + ombre[0], hy + (py - hy) * .5 + ombre[1]); }
          else t.pt(Math.round(px), Math.round(py), k === len ? C.v1 : k > len * .55 ? C.v2 : C.v3);
        }
      }
      if (ombre) for (let k = -1; k <= 1; k++) marquerOmbre(x + ombre[0], hy + (y - hy) * .5 + ombre[1] + k);
      else { t.pt(Math.round(x), Math.round(y), u < .65 ? C.v5 : C.v4); t.pt(Math.round(x), Math.round(y) + 1, C.v3); }
    }
  }
}
const PALMES_COCO = [[-1.95, 20, .45], [-1.35, 17, .3], [-.95, 22, .5], [-2.45, 25, .7], [-.4, 27, .8], [-2.95, 24, .75], [.15, 22, .85], [2.75, 20, .95], [1.1, 13, .5]];
const PALMES_PAOPU = [[-1.85, 19, .45], [-1.3, 16, .3], [-2.4, 23, .7], [-.8, 21, .55], [-3.0, 22, .8], [-.25, 24, .8], [.35, 18, .85], [2.6, 18, .9]];
function palmiers(t, temps) {
  // Les ombres d'abord, d'un seul voile, puis les palmes.
  const bal = Math.sin(temps * .75) * 1.5;
  couronne(t, 27, 454, PALMES_COCO, temps, 0, [30 + bal, 62]);
  couronne(t, 905, 146, PALMES_PAOPU, temps, 2, [-26 - bal, 70]);
  for (const i of OMBRE_LISTE) { t.px[i] = PAL.teinter(t.px[i], C.z2, .55, i % W, (i / W) | 0); OMBRE[i] = 0; }
  OMBRE_LISTE.length = 0;
  // Noix de coco sous la couronne.
  for (const [x, y] of [[23, 457], [29, 458], [26, 461]]) coco(t, x, y);
  couronne(t, 27, 454, PALMES_COCO, temps, 0, null);
  couronne(t, 905, 146, PALMES_PAOPU, temps, 2, null);
  // Les fruits du paopu, en étoile, qui se balancent avec l'arbre.
  const d = Math.round(Math.sin(temps * .75 + 2) * .8);
  for (const [x, y, r] of [[897, 154, 4.5], [911, 153, 4], [904, 160, 4.5]]) {
    t.pt(x + d, y - r - 1, C.v2);
    etoile(t, x + d, y, r, C.j3, C.j2, C.j1, C.j1, (x % 3) * .15);
  }
}
// Les oyats de la plage : chaque brin ploie d'un pixel, sans hâte.
const TOUFFES = [];
for (const [x, y] of [[4, 186], [60, 214], [12, 432], [64, 530], [48, 552], [896, 432], [956, 468], [894, 470], [948, 552], [890, 214],
  [150, 82], [332, 81], [642, 82], [812, 81], [98, 571], [458, 570], [604, 571], [760, 572]])
  TOUFFES.push({ x, y, n: 4 + Math.floor(hacher(x, y, 90) * 3), ph: hacher(x, y, 91) * 6.3 });
function touffes(t, temps) {
  for (const tf of TOUFFES) {
    for (let b = 0; b < tf.n; b++) {
      const bx = tf.x + b - (tf.n >> 1), h = 4 + ((b * 5 + tf.x) % 5);
      const dx = Math.round(Math.sin(temps * .8 + tf.ph + b * .5) * h / 6) + (b - tf.n / 2) * .4;
      for (let k = 0; k < h; k++) {
        const u = k / h;
        t.pt(Math.round(bx + dx * u), tf.y - k, u > .7 ? C.v5 : u > .3 ? C.v4 : C.v3);
      }
    }
  }
}
// Le petit drapeau rouge du château de sable.
function drapeau(t, temps) {
  for (let k = 0; k < 7; k++) {
    const oy = Math.round(Math.sin(temps * 2.6 - k * .6) * (k / 7) * 1.4);
    const h = 4 - Math.floor(k / 2);
    for (let j = 0; j < h; j++) t.pt(133 + k, 556 + j + oy + Math.floor((4 - h) / 2), j === 0 ? C.o3 : C.o2);
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
    nuages(t, temps);
    goelands(t, temps);
    eclats(t, temps);
    rivageHaut(t, temps);
    rivageBas(t, temps);
    lagon(t, temps);
    crabe(t, temps);
    palmiers(t, temps);
    touffes(t, temps);
    drapeau(t, temps);
    for (const cote of [1, 2]) {
      const fl = cote === 1 ? butG : butD;
      if (fl <= .02) continue;
      const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x < x0 + BUT.prof; x++)
        t.teinte(x, y, PAL, C.s4, fl * .55);
    }
    t.peindre(g);
    return cible;
  }
  return { image };
}
