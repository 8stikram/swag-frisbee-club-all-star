// ---------------------------------------------------------------------------
// DUNE DE RÂ EN PIXEL ART HD.
//
// Même technique que la Station orbitale retenue. Ce qui ne bouge pas, parce
// que le jeu en dépend (data/maps.js, game/desert.js) : les sables mouvants,
// un demi-cercle d'un cinquième de la largeur du terrain (164 px) posé sur
// chaque ligne de cage ; la tempête, qui voile tout le terrain ; les cages
// dorées de 200, décalées de 6 px dans le terrain comme aujourd'hui.
//
// Le décor garde ses pièces — ciel du crépuscule en cinq teintes, œil de Râ
// dont la pupille suit le jeu, trois pyramides, palmiers, caravane, cactus,
// paille qui roule — et en ajoute quelques-unes : rides du sable éclairées en
// lumière rasante, colonne tombée gravée de hiéroglyphes, crâne de bœuf,
// linteaux sculptés au-dessus des cages.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, hacher, lisse, balayerDisque, balayerPoly, spriteDe, spriteChiffre } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3, c: [232, 192, 90] },
  { from: -26, to: 26, points: 5, c: [217, 128, 60] },
  { from: 26, to: 100, points: 3, c: [232, 192, 90] }
];
export const SABLES = { r: (COURT.right - COURT.left) / 5 };
const HORIZON = COURT.top - 26;
const SOLEIL = { x: Math.round(W * .78), y: COURT.top - 44, r: 30 };
const PYRAMIDES = [[W * .17, 62, 74], [W * .30, 40, 46], [W * .58, 34, 40]];

const PAL = new Palette({
  // Ciel du crépuscule, avec les teintes de passage pour la trame
  c0: '#2E2A4A', c1: '#46335a', c2: '#5E3D6B', c3: '#8a4a68', c4: '#B85A63', c5: '#c87156', c6: '#D9884A', c7: '#e2a05a', c8: '#E8B96B', c9: '#f2d08a',
  // Sable
  z0: '#3a2618', z1: '#4a3226', z2: '#6a4a34', z3: '#8A6244', z4: '#a07650', z5: '#B88A56', z6: '#c99c62', z7: '#D9AE72', z8: '#E8C894', z9: '#f4dcae',
  // Roche et pierre
  r1: '#5a2e18', r2: '#8A4A28', r3: '#C4763F', r4: '#D99A66',
  p1: '#6e5534', p2: '#A8875C', p3: '#D9C08E', p4: '#efdcb0',
  // Or
  o1: '#6a4a14', o2: '#a8801e', o3: '#E8C05A', o4: '#F5DFA8', o5: '#fff4d6',
  // Végétation
  v0: '#1e3320', v1: '#3A5E3A', v2: '#5A8A56', v3: '#7FA85E', v4: '#a8c878',
  // Paille, chameau
  a1: '#4a3820', a2: '#7A5E34', a3: '#B8945A', a4: '#d8b47a',
  m1: '#5a3f26', m2: '#8A6440', m3: '#C4956A', m4: '#dcb48a',
  // Soleil et œil de Râ
  s1: '#D9803C', s2: '#F0C85A', s3: '#f8e08c', s4: '#FFFFFF', k: '#2A2038',
  // Zone à 5 points
  q1: '#8a4a20', q2: '#D9803C',
  // Os
  b1: '#8a7a64', b2: '#d8cdb8', b3: '#f4ecdc',
  // Tempête
  tp: '#C9A070',
  // Lapis de la coiffe du pharaon, reflets verts des scarabées, argile
  u1: '#1e2e5a', u2: '#34508e', u3: '#5a7cc0',
  x1: '#16302c', x2: '#2e7a68', x3: '#6ac0a8',
  g1: '#9a7658', g2: '#b89070', g3: '#d2ac88'
});
const C = PAL.c;
const CIEL = PAL.sous(['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
const SABLE = PAL.sous(['z0', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'z9']);
const SABLE_ZONES = PAL.sous(['z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'o3', 'o4', 'q2', 'c6', 'c7']);
const PIERRE = PAL.sous(['p1', 'p2', 'p3', 'p4', 'z3', 'z5']);
const ARGILE = PAL.sous(['z2', 'z3', 'z4', 'z5', 'g1', 'g2', 'g3', 'z6', 'z7']);

// ---------------------------------------------------------------------------
// Le sable : un relief de dunes éclairé par le soleil couchant, à droite, et
// des rides de vent par-dessus.
// ---------------------------------------------------------------------------
function relief(x, y) {
  const u = (x - COURT.left) / (COURT.right - COURT.left);
  let h = 0;
  for (let i = 0; i < 6; i++) h += Math.sin(u * 5 + i * 1.7 + (y - COURT.top) * .012 * (i % 3 + 1)) * (i % 2 ? .6 : 1);
  return h * 7 + fbm(x * .012, y * .02, 3, 3) * 18;
}
function couleurSable(x, y, fonce) {
  const pente = relief(x + 1, y) - relief(x - 1, y) + (relief(x, y - 1) - relief(x, y + 1)) * .4;
  // Rides : courtes, légèrement courbes, dont la crête prend la lumière.
  const ride = Math.sin((y + Math.sin(x * .035 + y * .01) * 7) * .62 + fbm(x * .02, y * .05, 2, 9) * 5);
  const crete = lisse(.72, .95, ride), creux = lisse(-.35, -.9, ride);
  // Les rides vont par plaques : partout pareilles, elles striaient tout le
  // terrain comme une tôle ondulée et le disque s'y perdait.
  const plaque = lisse(.42, .68, fbm(x * .008 + 40, y * .012, 3, 17));
  let r = 217, g = 174, b = 114;
  const l = pente * 5 + (crete * 12 - creux * 9) * (.25 + plaque * .75);
  r += l; g += l * .9; b += l * .7;
  if (fonce) { r *= .66; g *= .62; b *= .6; }
  return [r, g, b];
}
// Le désert autour du terrain : le même sable, plus sombre — c'est ce
// contraste qui dit où l'on joue —, mais avec son propre relief : de grandes
// dunes dont le versant tourné vers le soleil couchant (à droite) s'éclaire,
// et des rides en biais, par plaques, pour ne pas répéter celles du terrain.
function couleurDehors(x, y) {
  // Deux octaves seulement, à grande échelle : avec plus de détail, le relief
  // tachetait tout le pourtour comme un camouflage.
  const h = x2 => fbm(x2 * .0055 + 7, y * .009, 2, 41);
  const pente = (h(x + 3) - h(x - 3)) * 60;
  const ride = Math.sin((x * .45 + y * .8 + Math.sin(y * .04 + x * .015) * 8) * .55 + fbm(x * .03, y * .03, 2, 43) * 4);
  const plaque = lisse(.45, .7, fbm(x * .009 + 13, y * .013, 3, 45));
  const crete = lisse(.75, .95, ride), creux = lisse(-.4, -.9, ride);
  const l = pente * 9 + (h(x) - .5) * 12 + (crete * 8 - creux * 6) * (.25 + plaque * .75);
  return [146 + l, 110 + l * .85, 72 + l * .65];
}
function dansSables(x, y) {
  const r = SABLES.r;
  return Math.hypot(x + .5 - COURT.left, y + .5 - CY) < r || Math.hypot(x + .5 - COURT.right, y + .5 - CY) < r;
}
const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------
const CACTUS = spriteDe([
  '......aaa......',
  '.....ahbba.....',
  '.....ahbca.....',
  '.....ahbca.....',
  '.aaa.ahbca.....',
  'ahbba.hbca.aaa.',
  'ahbca.hbca.hbba',
  'ahbcaahbcaahbca',
  '.hbccahbcaahbca',
  '.ahbbbhbcahbbca',
  '..aahbbbbbbbca.',
  '....ahbbbccaa..',
  '.....ahbca.....',
  '.....ahbca.....',
  '.....ahbca.....',
  '.....ahbca.....',
  '.....ahbca.....',
  '.....ahbca.....',
  '....aahbcaa....'
], { a: C.v0, h: C.v3, b: C.v2, c: C.v1 });
const CRANE = spriteDe([
  'a..........a',
  'ba........ab',
  '.bba....abb.',
  '...baaaab...',
  '...bcccb....',
  '..bckcckb...',
  '..bcccccb...',
  '...bcccb....',
  '....bkb.....',
  '.....b......'
].map(l => l.padEnd(12, '.')), { a: C.b2, b: C.b1, c: C.b3, k: C.k });
// Chameau tourné vers la gauche, deux temps de marche.
const CHAMEAU = ['A', 'B'].map(f => spriteDe([
  '.aa......................',
  'abba.....................',
  'abbba....................',
  '.aabba...................',
  '...aba.....aaaa..........',
  '...abba..aabbbba..aaa....',
  '....abbaabbbbbbbaabbba...',
  '....abbbbbbbbbbbbbbbbba..',
  '.....abbbbbbbbbbbbbbbba.a',
  '......abbbbbbbbbbbbbbba.a',
  '.......abccccccccccccba..',
  ...(f === 'A' ? [
    '.......ab.ab.....ab..ab..',
    '......ab...ab....ab..ab..',
    '......ab...ab...ab....ab.',
    '.....aa.....aa..aa....aa.'
  ] : [
    '.......ab.ab.....ab.ab...',
    '.......ab.ab.....ab.ab...',
    '.......ab.ab.....ab.ab...',
    '.......aa.aa.....aa.aa...'
  ])
], { a: C.m1, b: C.m3, c: C.m2 }));

// ---------------------------------------------------------------------------
// Le fond fixe
// ---------------------------------------------------------------------------
// Le fond fixe existe en deux sens : normal, et miroir pour l'invité en ligne,
// où seules les inscriptions changent (voir ecrire3x5 dans pixelart.js).
let MIROIR = false;
const FONDS = [null, null];
let FOND = null, LIGNES = null;
const CRETE = new Int16Array(W);
const CHIFFRE = { 3: spriteChiffre(3, C.k, C.k, C.k, C.o4), 5: spriteChiffre(5, C.k, C.k, C.k, C.o4) };

function peindreFond() {
  const t = new Toile(W, H);
  const stops = [[46, 42, 74], [94, 61, 107], [184, 90, 99], [217, 136, 74], [232, 185, 107]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y < HORIZON) {
      // Le ciel en cinq arrêts ; la bande rose entre le violet et l'orange
      // donne l'heure. Un halo chaud autour de l'œil de Râ.
      const k = y / HORIZON * (stops.length - 1), a = Math.min(stops.length - 2, Math.floor(k)), f = k - a;
      let [r, g, b] = stops[a].map((v, j) => v + (stops[a + 1][j] - v) * f);
      const d = Math.hypot(x - SOLEIL.x, (y - SOLEIL.y) * 1.6);
      const halo = Math.exp(-d * d / (2 * 90 * 90));
      r += 40 * halo; g += 30 * halo; b += 10 * halo;
      t.px[i] = CIEL.tramer(r, g, b, x, y, 1.8);
    } else if (dansTerrain(x, y)) {
      const sables = dansSables(x, y);
      let [r, g, b] = couleurSable(x, y, false);
      if (sables) {
        // Les sables mouvants : plus sombres, avec un tourbillon figé.
        const cx = x < CX ? COURT.left : COURT.right, dx = x - cx, dy = y - CY;
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const tour = Math.sin(a * 3 + d * .07) * 6;
        r = r * .72 + tour; g = g * .68 + tour * .8; b = b * .64 + tour * .5;
      }
      t.px[i] = SABLE.tramer(r, g, b, x, y, 2);
    } else {
      const [r, g, b] = couleurDehors(x, y);
      t.px[i] = SABLE.tramer(r, g, b, x, y, 2);
    }
  }
  // Crête de dunes au loin, derrière les pyramides. Sa hauteur est gardée :
  // l'œil de Râ se couche derrière elle.
  for (let x = 0; x < W; x++) {
    const top = CRETE[x] = Math.round(COURT.top - 4 - 20 - Math.sin(x / W * 5) * 12 - fbm(x * .03, 0, 3, 2) * 6);
    for (let y = top; y < COURT.top; y++) {
      if (y < 0) continue;
      const k = (y - top) / (COURT.top - top);
      t.px[y * W + x] = y === top ? C.z6 : SABLE.tramer(160 - k * 20, 118 - k * 16, 78 - k * 10, x, y, 2);
    }
  }
  // Pyramides : la face tournée vers le soleil (à droite) prend la lumière,
  // assises de pierre toutes les 4 rangées.
  const base = COURT.top - 4;
  for (const [px, larg, haut] of PYRAMIDES) {
    for (let y = Math.round(base - haut); y < base; y++) {
      const k = (y - (base - haut)) / haut, demi = larg * k;
      for (let x = Math.round(px - demi); x <= Math.round(px + demi); x++) {
        const droite = x >= px;
        let c = droite ? C.p3 : C.p2;
        if ((y - Math.round(base - haut)) % 4 === 3) c = droite ? C.p2 : C.p1;
        if (x === Math.round(px + demi)) c = C.p4;
        if (x === Math.round(px - demi)) c = C.p1;
        t.pt(x, y, c);
      }
    }
    t.pt(Math.round(px), Math.round(base - haut) - 1, C.o4);
  }
  // Bourrelets de dune le long des touches : pas de mur, du sable qui monte.
  for (const [by, sens] of [[COURT.top, -1], [COURT.bottom, 1]]) {
    for (let x = COURT.left - 10; x < COURT.right + 10; x++) {
      const ond = Math.round(Math.sin((x - COURT.left) / 820 * 6) * 3);
      for (let k = 0; k < 10; k++) {
        const y = by + sens * k + ond * (sens < 0 ? 0 : 0);
        if (y < 0 || y >= H) continue;
        const c = k === 0 ? C.z8 : k < 3 ? C.z7 : k < 6 ? C.z6 : C.z5;
        if (k < 7 - Math.abs(ond)) t.teinte(x, y, PAL, c, .7);
      }
    }
  }
  // Cailloux, hors du terrain.
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(hacher(i, 1, 30) * W), y = COURT.top + Math.floor(hacher(i, 2, 30) * (H - COURT.top));
    if (x > COURT.left - 14 && x < COURT.right + 14 && y > COURT.top - 14 && y < COURT.bottom + 14) continue;
    const r = 1 + Math.floor(hacher(i, 3, 30) * 3);
    balayerDisque(x, y, r, (yy, a, b) => t.hl(a, b, yy, hacher(i, 4, 30) > .5 ? C.r2 : C.z3));
    t.pt(x - 1, y - r + 1, C.r4);
    t.hl(x - r + 1, x + r, y + r + 1, C.z2);
  }
  peindreBordsDune(t);
  // Colonne tombée de chaque côté des cages, gravée.
  for (const x0 of [6, W - 58]) {
    for (let y = CY - 12; y < CY + 12; y++) for (let x = x0; x < x0 + 52; x++) {
      const k = (y - (CY - 12)) / 24;
      let c = k < .15 ? C.p4 : k < .55 ? C.p3 : k < .85 ? C.p2 : C.p1;
      if (x === x0 || x === x0 + 51 || y === CY - 12 || y === CY + 11) c = C.p1;
      if ((x - x0) % 13 === 0) c = C.p2;
      t.pt(x, y, c);
    }
    // Hiéroglyphes : petits signes gravés.
    for (let s = 0; s < 3; s++) {
      const gx = x0 + 4 + s * 16, gy = CY - 6;
      const f = Math.floor(hacher(s, x0, 31) * 3);
      if (f === 0) { t.vl(gx + 3, gy, gy + 9, C.p1); balayerDisque(gx + 3, gy + 2, 2, (yy, a, b) => t.hl(a, b, yy, C.p1)); }
      else if (f === 1) { t.hl(gx, gx + 7, gy + 4, C.p1); t.ligne(gx, gy, gx + 4, gy + 4, C.p1); t.ligne(gx + 7, gy + 8, gx + 4, gy + 4, C.p1); }
      else { t.ligne(gx, gy + 9, gx + 4, gy, C.p1); t.ligne(gx + 4, gy, gx + 8, gy + 9, C.p1); t.hl(gx + 2, gx + 6, gy + 6, C.p1); }
    }
    t.hl(x0 + 2, x0 + 50, CY + 13, C.z2);
  }
  t.sprite(CRANE, 6, COURT.bottom - 22);
  // Cactus des coins, décalés vers le bord pour laisser la place aux obélisques.
  for (const [x, y] of CACTUS_POS) {
    for (let k = -8; k <= 8; k++) t.teinte(x + 7 + k + 4, y + 19, PAL, C.z1, .5);
    t.sprite(CACTUS, x, y);
  }

  // Zones de cage, dans le terrain, et les cages dorées posées dessus.
  for (const cote of [1, 2]) {
    const gx = cote === 1 ? COURT.left : COURT.right - BUT.prof;
    for (const z of ZONES) {
      for (let y = CY + z.from; y < CY + z.to; y++) for (let x = gx; x < gx + BUT.prof; x++) {
        t.modifier(x, y, (c, xx, yy) => {
          const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
          return SABLE_ZONES.tramer(r * .78 + z.c[0] * .22, g * .78 + z.c[1] * .22, b * .78 + z.c[2] * .22, xx, yy, 2);
        });
      }
      const s = CHIFFRE[z.points];
      t.sprite(s, Math.round(gx + BUT.prof / 2 - s.l / 2), Math.round(CY + (z.from + z.to) / 2 - s.h / 2), MIROIR);
    }
    const fx = cote === 1 ? COURT.left - 6 : COURT.right - BUT.prof + 6;
    // Montants et traverses d'or, 4 px, éclairés à droite.
    for (let k = 0; k < 4; k++) {
      const c = [C.o1, C.o3, C.o4, C.o2][k];
      t.hl(fx, fx + BUT.prof - 1, BUT.haut + k, c); t.hl(fx, fx + BUT.prof - 1, BUT.bas - 1 - k, [C.o1, C.o2, C.o3, C.o2][k]);
      t.vl(fx + k, BUT.haut, BUT.bas - 1, [C.o1, C.o2, C.o3, C.o2][k]); t.vl(fx + BUT.prof - 1 - k, BUT.haut, BUT.bas - 1, [C.o1, C.o4, C.o3, C.o2][k]);
    }
    // Linteaux de pierre au-dessus et au-dessous, avec leur cartouche d'or.
    for (const y0 of [BUT.haut - 10, BUT.bas]) {
      for (let y = y0; y < y0 + 10; y++) for (let x = fx - 4; x < fx + BUT.prof + 4; x++) {
        const k = y - y0;
        let c = k === 0 ? C.p4 : k === 9 ? C.p1 : k < 5 ? C.p3 : C.p2;
        if (x === fx - 4 || x === fx + BUT.prof + 3) c = C.p1;
        t.pt(x, y, c);
      }
      const cx = fx + BUT.prof / 2;
      t.rect(cx - 10, y0 + 2, 20, 6, C.o2); t.rect(cx - 9, y0 + 3, 18, 4, C.o3);
      t.pt(cx - 5, y0 + 4, C.k); t.pt(cx, y0 + 4, C.k); t.pt(cx + 4, y0 + 5, C.k); t.pt(cx + 5, y0 + 4, C.k);
    }
  }
  LIGNES = marquage();
  FOND = t;
}

// ---------------------------------------------------------------------------
// Le bas et les côtés : les abords d'un temple ensablé. Tout est posé hors de
// l'aire de jeu, fondu dans le sable par des congères et par les longues
// ombres du couchant — le soleil est bas, à droite, elles filent vers la
// gauche. Ce qui bouge le fait lentement : herbe sèche, flammes, scarabées,
// eau de l'oasis, voiles de sable.
// ---------------------------------------------------------------------------
const CACTUS_POS = [[2, COURT.top + 20], [4, COURT.bottom - 108], [W - 17, COURT.top + 20], [W - 18, COURT.bottom - 112]];
const OBELISQUES = [[38, COURT.top + 120], [W - 38, COURT.top + 120]];
const TORCHES = [[46, COURT.bottom - 20], [W - 46, COURT.bottom - 20]];
const FUTS = [[134, 596, 12], [300, 597, 16], [664, 596, 10], [806, 597, 14]];
const TETE = { x: 522, y: 568 };
const JARRES = [[398, 598], [410, 597]];
const OASIS = { x: 928, y: 587, rx: 30, ry: 11 };
const TOUFFES = [];
for (const [x, y] of [[112, 578], [196, 586], [352, 575], [446, 590], [612, 580], [704, 588], [760, 576], [862, 582],
  [12, 190], [54, 144], [8, 402], [52, 428], [26, 506], [W - 12, 196], [W - 52, 150], [W - 10, 410], [W - 54, 436], [W - 28, 508]])
  TOUFFES.push({ x, y, n: 4 + Math.floor(hacher(x, y, 48) * 3), ph: hacher(x, y, 49) * 6.3 });
const SCARABEES = [
  { cx: 360, cy: 592, rx: 24, ry: 4, ph: 0 },
  { cx: 30, cy: 396, rx: 9, ry: 24, ph: 2 },
  { cx: W - 30, cy: 262, rx: 9, ry: 20, ph: 4 }
];
const dehors = (x, y) => x >= 0 && x < W && y >= COURT.top && y < H && !dansTerrain(x, y);

function ombreCouchant(t, x, y, h, demi) {
  const L = h * 1.1, dy = h * .22;
  balayerPoly([[x - demi, y], [x + demi, y], [x + demi - L, y + dy], [x - demi - L, y + dy]], (yy, a, b) => {
    for (let xx = a; xx <= b; xx++) {
      if (!dehors(xx, yy)) continue;
      const u = Math.max(0, Math.min(1, (x - xx) / L));
      t.teinte(xx, yy, PAL, C.z1, .42 * (1 - u) ** .8);
    }
  });
}
// Une congère : le sable monte contre l'objet, en fondu.
function congere(t, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= cy; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (e > 1 || !dehors(x, y)) continue;
    t.teinte(x, y, PAL, e < .3 ? C.z8 : C.z7, .95 * (1 - e));
  }
}
// Plaque d'argile craquelée : des écailles de Voronoï, et un bord qui
// s'effiloche dans le sable au lieu d'y être découpé.
function argile(t, cx, cy, rx, ry, gr) {
  const CEL = 9;
  const germe = (i, j) => [(i + .2 + hacher(i, j, gr) * .6) * CEL, (j + .2 + hacher(i, j, gr + 1) * .6) * CEL];
  for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
    if (!dehors(x, y)) continue;
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fbm(x * .06, y * .06, 2, gr + 2) - .5) * .6;
    if (e > 1) continue;
    if (e > .65 && hacher(x, y, gr + 3) < (e - .65) / .35) continue;
    const ci = Math.floor(x / CEL), cj = Math.floor(y / CEL);
    let d1 = Infinity, d2 = Infinity;
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
      const [gx, gy] = germe(i, j), d = Math.hypot(x + .5 - gx, y + .5 - gy);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const fente = d2 - d1;
    let c;
    if (fente < 1) c = C.z2;
    else if (fente < 1.8) c = C.z3;
    else {
      const v = 158 + (hacher(Math.floor(x / CEL), Math.floor(y / CEL), gr + 4) - .5) * 18 - d1 * 1.4;
      c = ARGILE.tramer(v * 1.1, v * .86, v * .66, x, y, 2);
    }
    t.px[y * W + x] = c;
  }
}
function obelisque(t, x, yBase, h) {
  ombreCouchant(t, x, yBase + 2, h, 6);
  congere(t, x - 3, yBase + 4, 16, 4);
  for (let j = 0; j < 6; j++) for (let i = -10; i <= 10; i++) t.pt(x + i, yBase + j - 2, j === 0 ? C.p4 : j === 5 ? C.p1 : i > 4 ? C.p3 : C.p2);
  const yTop = yBase - 2 - h;
  for (let y = yTop; y < yBase - 2; y++) {
    const k = (yBase - 2 - y) / h, demi = Math.round(6 - k * 2.5);
    for (let xx = x - demi; xx <= x + demi; xx++) {
      let c = xx > x ? C.p3 : C.p2;
      if (xx === x + demi) c = C.p4;
      if (xx === x - demi) c = C.p1;
      if (xx === x) c = C.p2;
      t.pt(xx, y, c);
    }
    // Une colonne de hiéroglyphes gravée sur la face au soleil.
    const gy = (y - yTop) % 8, g = Math.floor((y - yTop) / 8) % 4, gx = x + 2;
    if (y > yTop + 4 && y < yBase - 8) {
      if (g === 0 && gy > 0 && gy < 5) t.pt(gx + 1, y, C.p1);
      if (g === 1 && (gy === 1 || gy === 4)) { t.pt(gx, y, C.p1); t.pt(gx + 2, y, C.p1); }
      if (g === 2 && gy > 0 && gy < 5) t.pt(gx + (gy & 1), y, C.p1);
      if (g === 3 && gy === 2) t.hl(gx, gx + 2, y, C.p1);
    }
  }
  for (let j = 0; j < 7; j++) {
    const demi = Math.round(j * .6 + .5), y = yTop - 7 + j;
    for (let xx = x - demi; xx <= x + demi; xx++) t.pt(xx, y, xx > x ? C.o4 : xx === x ? C.o3 : C.o2);
  }
  t.pt(x, yTop - 8, C.o5);
}
function futCasse(t, x, yBase, h) {
  ombreCouchant(t, x, yBase, h, 7);
  for (let y = yBase - h; y <= yBase; y++) for (let i = -7; i <= 7; i++) {
    const casse = yBase - h + Math.round((i + 7) * .35 + hacher(i, x, 47) * 2);
    if (y < casse) continue;
    let c = i > -3 ? C.p3 : C.p2;
    if ((i + 8) % 3 === 0) c = i > 0 ? C.p2 : C.p1;
    if (i === 7) c = C.p4;
    if (i === -7) c = C.p1;
    if (y === casse) c = C.p4;
    t.pt(x + i, y, c);
  }
  congere(t, x - 3, yBase + 1, 12, 4);
}
function tetePharaon(t, cx, yHaut) {
  ombreCouchant(t, cx + 8, H - 1, 26, 18);
  // Némès rayé or et lapis, les pans qui tombent de chaque côté du visage.
  for (let y = yHaut; y < H; y++) {
    const k = y - yHaut;
    const demi = Math.round(12 + Math.min(k, 14) * .55 + (k > 14 ? (k - 14) * .2 : 0));
    for (let x = cx - demi; x <= cx + demi; x++) {
      if (k >= 6 && Math.abs(x - cx) <= 8) continue;
      const raie = (k + (Math.abs(x - cx) > 10 ? 1 : 0)) % 4 < 2;
      let c = raie ? C.o3 : C.u2;
      if (x > cx + demi - 2) c = raie ? C.o4 : C.u3;
      if (x < cx - demi + 2) c = raie ? C.o2 : C.u1;
      if (x === cx - demi || x === cx + demi || k === 0) c = C.k;
      t.pt(x, y, c);
    }
  }
  // Le visage de pierre, éclairé à droite.
  for (let y = yHaut + 6; y < H; y++) for (let x = cx - 8; x <= cx + 8; x++) t.pt(x, y, x > cx + 2 ? C.p4 : x > cx - 4 ? C.p3 : C.p2);
  const ye = yHaut + 12;
  for (const s2 of [-1, 1]) {
    const ex = cx + s2 * 4;
    t.hl(ex - 2, ex + 2, ye - 2, C.p1);
    t.hl(ex - 2, ex + 1, ye, C.k); t.pt(ex + 2 * s2, ye + 1, C.k);
  }
  t.vl(cx, ye + 1, ye + 5, C.p2); t.rect(cx - 1, ye + 5, 3, 2, C.p1);
  t.hl(cx - 3, cx + 3, ye + 9, C.p1); t.hl(cx - 2, cx + 2, ye + 10, C.p2);
  t.vl(cx, yHaut + 2, yHaut + 5, C.o4); t.pt(cx - 1, yHaut + 2, C.o3); t.pt(cx + 1, yHaut + 2, C.o3);
  // Le sable l'enterre sous le menton, en congère fondue.
  for (let y = yHaut + 18; y < H; y++) for (let x = cx - 28; x <= cx + 30; x++) {
    const dx = (x - cx - 2) / 28, surf = yHaut + 24 + Math.round(dx * dx * 7);
    if (y < surf) continue;
    const e = Math.min(1, (y - surf) / 4);
    t.teinte(x, y, PAL, y - surf < 1 ? C.z8 : C.z6, .55 + e * .45);
  }
}
const JARRE = spriteDe([
  '.aaaaa.',
  '..bbc..',
  '.abbbc.',
  'abbbbcd',
  'abbbbcd',
  'abbbbcd',
  '.abbbc.',
  '..abb..',
  '...a...'
], { a: C.r1, b: C.r3, c: C.r4, d: C.r2 });
function jarres(t) {
  const [[x1, y1], [x2, y2]] = JARRES;
  ombreCouchant(t, x1 + 3, y1, 9, 4); ombreCouchant(t, x2 + 3, y2, 9, 4);
  t.sprite(JARRE, x1, y1 - 9); t.sprite(JARRE, x2, y2 - 9);
  // La troisième, brisée : des tessons épars.
  for (const [dx, dy, l] of [[20, -2, 3], [24, 0, 2], [18, 1, 2], [27, -3, 2]]) { t.hl(x2 + dx, x2 + dx + l, y2 + dy, C.r3); t.hl(x2 + dx, x2 + dx + l - 1, y2 + dy + 1, C.r2); }
  congere(t, x1 + 8, y1 + 1, 14, 3);
}
function torcheFixe(t, x, yBase) {
  ombreCouchant(t, x, yBase, 34, 1);
  congere(t, x - 2, yBase + 1, 7, 3);
  for (let y = yBase - 34; y <= yBase; y++) { t.pt(x, y, C.a2); t.pt(x + 1, y, C.a1); }
  t.hl(x - 4, x + 5, yBase - 36, C.o3); t.hl(x - 3, x + 4, yBase - 35, C.o2); t.hl(x - 2, x + 3, yBase - 34, C.o1);
}
function oasisFixe(t) {
  const { x: ox, y: oy, rx, ry } = OASIS;
  for (let y = oy - ry - 3; y < H; y++) for (let x = ox - rx - 3; x <= ox + rx + 3; x++) {
    if (!dehors(x, y) || x < COURT.right + 6) continue;
    const e = ((x - ox) / rx) ** 2 + ((y - oy) / ry) ** 2;
    if (e > 1.35) continue;
    if (e > 1) { t.px[y * W + x] = PAL.teinter(t.px[y * W + x], C.z3, .7, x, y); continue; }
    // L'eau renvoie le ciel du couchant : chaude près de la berge du fond
    // (l'horizon), violette vers nous.
    const k = (y - (oy - ry)) / (ry * 2);
    const stops = [[232, 185, 107], [217, 136, 74], [184, 90, 99], [94, 61, 107]];
    const f = Math.min(2.999, k * 3), i = Math.floor(f), u = f - i;
    let [r, g, b] = stops[i].map((v, j) => v + (stops[i + 1][j] - v) * u);
    if (e > .75) { r *= .8; g *= .8; b *= .85; }
    t.px[y * W + x] = CIEL.tramer(r, g, b, x, y, 2);
  }
}
function peindreBordsDune(t) {
  // Plaques de reg : du gravier, par endroits.
  for (let y = COURT.top; y < H; y++) for (let x = 0; x < W; x++) {
    if (!dehors(x, y)) continue;
    if (fbm(x * .02, y * .02, 3, 44) < .66 || hacher(x, y, 46) > .06) continue;
    const c = [C.z2, C.z4, C.r2, C.p2][Math.floor(hacher(x, y, 47) * 4)];
    t.pt(x, y, c);
    if (hacher(x, y, 48) > .6) t.pt(x + 1, y - 1, C.z7);
  }
  // Argile craquelée d'un ancien bras d'eau.
  argile(t, 232, 590, 64, 9, 60);
  argile(t, 28, 262, 26, 18, 61);
  argile(t, W - 30, 388, 26, 18, 62);
  // Trace de serpent dans le sable.
  for (let x = 598; x < 784; x++) {
    const y = Math.round(589 + Math.sin(x * .12) * 3 - (x - 598) * .02);
    t.teinte(x, y, PAL, C.z2, .55);
    t.teinte(x, y - 1, PAL, C.z8, .35);
  }
  oasisFixe(t);
  for (const [x, y] of OBELISQUES) obelisque(t, x, y, 90);
  for (const [x, y, h] of FUTS) futCasse(t, x, y, h);
  tetePharaon(t, TETE.x, TETE.y);
  jarres(t);
  for (const [x, y] of TORCHES) torcheFixe(t, x, y);
}

// Ce qui bouge sur les bords, lentement.
function animerBordsDune(t, temps) {
  // Reflet d'or qui glisse le long des pyramidions.
  for (const [x, y] of OBELISQUES) {
    const q = (temps / 7) % 1;
    if (q < .25) {
      const j = Math.floor(q / .25 * 7), yTop = y - 2 - 90;
      t.pt(x + Math.round(j * .6 + .5), yTop - 7 + j, C.o5);
    }
  }
  // Touffes d'herbe sèche : chaque brin ploie d'un pixel, sans hâte.
  for (const tf of TOUFFES) {
    for (let b = 0; b < tf.n; b++) {
      const bx = tf.x + b - (tf.n >> 1), h = 3 + ((b * 5 + tf.x) % 5);
      const dx = Math.round(Math.sin(temps * .8 + tf.ph + b * .5) * h / 6) + (b - tf.n / 2) * .4;
      for (let k = 0; k < h; k++) {
        const u = k / h;
        t.pt(Math.round(bx + dx * u), tf.y - k, u > .7 ? C.a4 : u > .3 ? C.a3 : C.a2);
      }
    }
  }
  // Torchères : des flammes qui respirent, pas qui clignotent.
  for (const [x, yBase] of TORCHES) {
    const r = 30 + Math.sin(temps * 1.1) * 2;
    for (let y = Math.floor(yBase - 36 - r); y < yBase - 36 + r; y++) for (let xx = Math.floor(x - r); xx < x + r; xx++) {
      const d = Math.hypot(xx - x, (y - (yBase - 20)) * 1.2);
      if (d < r && dehors(xx, y)) t.teinte(xx, y, PAL, C.s2, .2 * (1 - d / r) ** 1.5);
    }
    for (let k = 0; k < 3; k++) {
      const fx = x - 2 + k * 2, fh = Math.round(5 + Math.sin(temps * 2.1 + k * 1.3) * 1.5 + Math.sin(temps * 3.3 + k) * .8 + (k === 1 ? 2 : 0));
      for (let j = 0; j < fh; j++) {
        const u = j / fh, ox = Math.round(Math.sin(temps * 1.7 + k + j * .3) * u);
        t.pt(fx + ox, yBase - 37 - j, u < .3 ? C.s3 : u < .6 ? C.s2 : u < .85 ? C.s1 : C.q1);
        if (u < .5) t.pt(fx + ox + 1, yBase - 37 - j, C.s2);
      }
    }
    for (let k = 0; k < 2; k++) {
      const q = (temps * .35 + k * .5) % 1;
      t.pt(Math.round(x + Math.sin(temps * .9 + k * 3) * 3), Math.round(yBase - 44 - q * 22), q < .5 ? C.s3 : C.s1);
    }
  }
  // L'oasis : roseaux et papyrus qui ondulent, reflets qui glissent, un rond
  // dans l'eau de temps en temps.
  const { x: ox, y: oy, rx, ry } = OASIS;
  for (let i = 0; i < 12; i++) {
    const xr = Math.round(ox - rx + 4 + i * 5 + Math.sin(i * 2.1) * 2);
    if (xr < COURT.right + 8) continue;
    const yr = Math.round(oy - ry * Math.sqrt(Math.max(0, 1 - ((xr - ox) / rx) ** 2)) - 1);
    const h = 6 + (i * 7) % 5, dx = Math.sin(temps * .7 + i) * .8;
    for (let k = 0; k < h; k++) t.pt(Math.round(xr + dx * k / h), yr - k, k > h - 2 ? C.v3 : C.v1);
    if (i % 3 === 0) { const tx = Math.round(xr + dx); t.hl(tx - 1, tx + 1, yr - h, C.v2); t.pt(tx, yr - h - 1, C.v3); }
  }
  for (let i = 0; i < 9; i++) {
    const y = oy - ry + 3 + i * 2 + (i % 2);
    const x = Math.round(ox - 12 + ((i * 11 + temps * 3) % 26) + Math.sin(temps * .6 + i) * 2);
    if (((x - ox) / rx) ** 2 + ((y - oy) / ry) ** 2 < .8 && x > COURT.right + 8) { t.pt(x, y, C.s3); t.pt(x + 1, y, C.c9); }
  }
  const q = (temps / 4.2) % 1;
  if (q < .6) {
    const n = Math.floor(temps / 4.2), cx = ox - 8 + hacher(n, 1, 55) * 16, cy = oy - 2 + hacher(n, 2, 55) * 5, r = 1 + q * 9;
    for (let a = 0; a < Math.PI * 2; a += .15) {
      const x = Math.round(cx + Math.cos(a) * r * 1.8), y = Math.round(cy + Math.sin(a) * r * .5);
      if (((x - ox) / rx) ** 2 + ((y - oy) / ry) ** 2 < .9) t.teinte(x, y, PAL, C.s3, .5 * (1 - q / .6));
    }
  }
  palmier(t, 950, 582, .55, temps, 4.2);
  // Scarabées qui font leur ronde, lentement, et la trace qu'ils laissent.
  for (const sc of SCARABEES) {
    const w = 5 / ((sc.rx + sc.ry) / 2);
    for (let k = 8; k >= 1; k--) {
      const a = (temps - k * .45) * w + sc.ph;
      t.modifier(Math.round(sc.cx + Math.cos(a) * sc.rx), Math.round(sc.cy + Math.sin(a) * sc.ry), (c, a0, b0) => PAL.teinter(c, C.z3, .5 * (1 - k / 9), a0, b0));
    }
    const a = temps * w + sc.ph;
    const x = Math.round(sc.cx + Math.cos(a) * sc.rx), y = Math.round(sc.cy + Math.sin(a) * sc.ry);
    const pas = Math.floor(temps * 3 + sc.ph) & 1;
    t.hl(x - 1, x + 1, y - 1, C.x1); t.hl(x - 2, x + 2, y, C.x1); t.hl(x - 1, x + 1, y + 1, C.x1);
    t.pt(x, y, C.x2); t.pt(x + 1, y - 1, C.x3);
    t.pt(x - 2 - pas, y - 1, C.z1); t.pt(x + 2 + pas, y + 1, C.z1);
  }
  // Voiles de sable que le vent pousse doucement vers la gauche, hors du terrain.
  for (let i = 0; i < 7; i++) {
    const y = [576, 585, 594, 150, 470, 120, 520][i];
    const L = 40 + (i * 13) % 30, per = W + 220;
    const x0 = ((per - (temps * (11 + i % 3 * 2) + i * 173) % per) % per) - 110;
    for (let k = 0; k < L; k++) {
      const x = Math.round(x0 + k), yy = y + Math.round(Math.sin((x + i * 40) * .05) * 1.5);
      if (!dehors(x, yy)) continue;
      const env = Math.sin(k / L * Math.PI);
      t.teinte(x, yy, PAL, C.z9, .28 * env);
    }
  }
}

// Marquage creusé dans le sable : un sillon sombre bordé d'une lèvre claire.
function marquage() {
  const px = [];
  const sillon = (x, y, role) => { if (dansTerrain(x, y)) px.push(y * W + x, role); };
  for (let x = COURT.left; x < COURT.right; x++) {
    for (let k = 0; k < 3; k++) { sillon(x, COURT.top + k, k); sillon(x, COURT.bottom - 1 - k, k === 0 ? 0 : k); }
  }
  for (let y = COURT.top; y < COURT.bottom; y++) {
    for (let k = 0; k < 3; k++) { sillon(COURT.left + k, y, k); sillon(COURT.right - 1 - k, y, k); }
    if ((y - COURT.top) % 22 < 12) for (let k = -1; k <= 1; k++) sillon(CX + k, y, k + 1);
  }
  for (let y = CY - 64; y <= CY + 64; y++) for (let x = CX - 64; x <= CX + 64; x++) {
    const d = Math.hypot(x + .5 - CX, y + .5 - CY);
    if (Math.abs(d - 62) < 1.5) sillon(x, y, d < 61.5 ? 2 : d < 62.5 ? 1 : 0);
  }
  return px;
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
function palmier(t, x, y, ech, temps, ph) {
  const bal = Math.sin(temps * 1.2 + ph) * 2.5;
  const haut = Math.round(34 * ech);
  // Tronc bagué, légèrement courbé.
  for (let k = 0; k < haut; k++) {
    const u = k / haut, tx = Math.round(x + Math.sin(u * 1.4) * 4 * ech + bal * u), ty = y - k;
    t.pt(tx - 1, ty, C.a1); t.pt(tx, ty, k % 3 === 0 ? C.a2 : C.a3); t.pt(tx + 1, ty, k % 3 === 0 ? C.a3 : C.a4); t.pt(tx + 2, ty, C.a1);
  }
  const hx = Math.round(x + Math.sin(1.4) * 4 * ech + bal), hy = y - haut;
  // Palmes : des arcs épais, avec leurs folioles.
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * .62 + Math.sin(temps * 1.8 + i + ph) * .08;
    const L = (13 + (i % 2) * 4) * ech;
    for (let s = 0; s <= L; s++) {
      const u = s / L;
      const px = hx + Math.cos(a) * s, py = hy + Math.sin(a) * s + u * u * 9 * ech;
      t.pt(Math.round(px), Math.round(py), C.v0);
      t.pt(Math.round(px), Math.round(py) - 1, u < .5 ? C.v3 : C.v2);
      if (s % 2 === 0 && u > .15) {
        const fx = -Math.sin(a) * 3, fy = Math.cos(a) * 3;
        t.pt(Math.round(px + fx), Math.round(py + fy + 1), C.v1);
        t.pt(Math.round(px - fx), Math.round(py - fy + 1), C.v1);
      }
    }
  }
  t.pt(hx, hy + 1, C.m1); t.pt(hx + 1, hy + 2, C.m1);
}
const PALMIERS = [];
for (let i = 0; i < 7; i++) PALMIERS.push({ x: 90 + hacher(i, 1, 50) * (W - 180), y: COURT.top - 8 - Math.floor(hacher(i, 2, 50) * 20), ech: .8 + hacher(i, 3, 50) * .45, ph: hacher(i, 4, 50) * 6.3 });
PALMIERS.sort((a, b) => a.y - b.y);

function oeilDeRa(t0, temps) {
  const { x, y, r } = SOLEIL;
  // Tout ce qui tombe sous la crête des dunes est caché.
  const t = {
    pt: (px, py, c) => { if (py < CRETE[Math.round(px)]) t0.pt(px, py, c); },
    hl(a, b, py, c) { for (let px = a; px <= b; px++) this.pt(px, py, c); },
    ligne: (a, b, c2, d, c) => t0.ligne(a, b, c2, d, 0, (cc, px, py) => py < CRETE[px] ? c : cc)
  };
  // Rayons qui tournent.
  for (let i = 0; i < 20; i++) {
    const a = temps * .3 + i / 20 * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    balayerPoly([[x + (-sa * 2.2 + ca * r), y + (ca * 2.2 + sa * r)], [x + ca * r * 1.34, y + sa * r * 1.34], [x + (sa * 2.2 + ca * r), y + (-ca * 2.2 + sa * r)]],
      (yy, a0, b0) => t.hl(a0, b0, yy, C.s1));
  }
  balayerDisque(x, y, r, (yy, a, b) => { for (let xx = a; xx <= b; xx++) {
    const d = Math.hypot(xx - x, yy - y);
    t.pt(xx, yy, d > r - 1.5 ? C.s1 : (xx - x) + (yy - y) < -r * .9 ? C.s3 : C.s2);
  } });
  // L'œil : blanc, pupille qui balaie, sourcil, trait de fard et volute.
  for (let yy = -10; yy <= 10; yy++) for (let xx = -16; xx <= 16; xx++) {
    if ((xx / 15) ** 2 + ((yy + 1.5) / 9) ** 2 <= 1) t.pt(x + xx, y + yy, C.s4);
  }
  const pu = Math.round(x + Math.sin(temps * .9) * 5);
  balayerDisque(pu, y - 1, 4, (yy, a, b) => t.hl(a, b, yy, C.k));
  t.pt(pu - 1, y - 3, C.s4);
  for (let xx = -16; xx <= 16; xx++) {
    const yy = Math.round(y - 1.5 - Math.sqrt(Math.max(0, 1 - (xx / 16) ** 2)) * 13);
    t.pt(x + xx, yy, C.k); t.pt(x + xx, yy + 1, C.k);
  }
  t.ligne(x + 15, y, x + 22, y + 12, C.k); t.ligne(x + 16, y, x + 23, y + 12, C.k);
  t.ligne(x - 5, y + 4, x - 4, y + 14, C.k); t.ligne(x - 4, y + 14, x - 13, y + 13, C.k);
}

function fond(miroir) {
  MIROIR = miroir;
  const i = miroir ? 1 : 0;
  if (!FONDS[i]) { FOND = null; peindreFond(); FONDS[i] = FOND; }
  FOND = FONDS[i];
  return FOND;
}

// extras (tous facultatifs) : miroir — le monde est retourné (invité en
// ligne) ; butG / butD — flash de chaque cage, de 1 à 0 après un but ;
// tempete — le voile de la maquette (en jeu, render.js garde drawTempete).
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
    oeilDeRa(t, temps);
    for (const p of PALMIERS) palmier(t, Math.round(p.x), p.y, p.ech, temps, p.ph);

    // La caravane, toutes les 23 secondes.
    const phase = temps % 23;
    if (phase < 9) for (let i = 0; i < 3; i++) {
      const k = phase / 9 - i * .07;
      if (k < 0 || k > 1) continue;
      const x = Math.round(-50 + k * (W + 100)), pas = Math.floor(temps * 5 + i) & 1;
      t.sprite(CHAMEAU[pas], x - 12, COURT.top - 30 + (pas ? -1 : 0), true);
      for (let s = -9; s <= 9; s++) t.teinte(x + s, COURT.top - 14, PAL, C.z2, .45);
    }

    // Sables mouvants : des anneaux qui se resserrent vers la cage, et des bulles.
    const R = SABLES.r;
    for (const cxs of [COURT.left, COURT.right]) {
      for (let i = 0; i < 4; i++) {
        const k = 1 - ((i / 4 + temps * .3) % 1);
        const force = Math.sin(k * Math.PI) * .5;
        const rr = R * k, coul = i % 2 ? C.o3 : C.z8;
        for (let a = 0; a < Math.PI * 2; a += 1 / Math.max(rr, 1)) {
          const x = Math.round(cxs + Math.cos(a) * rr), y = Math.round(CY + Math.sin(a) * rr);
          if (!dansTerrain(x, y) || Math.hypot(x + .5 - cxs, y + .5 - CY) >= R) continue;
          if (((x * 5 + y * 3) & 7) / 8 < force) t.pt(x, y, coul);
        }
      }
      for (let b = 0; b < 5; b++) {
        const n = Math.floor(temps * 1.5 + b * .37);
        const a = hacher(n, b, 70) * Math.PI - Math.PI / 2, d = 20 + hacher(n, b, 71) * (R - 30);
        const x = Math.round(cxs + (cxs < CX ? 1 : -1) * Math.cos(a) * d), y = Math.round(CY + Math.sin(a) * d);
        const vie = (temps * 1.5 + b * .37) % 1;
        if (vie < .6) { t.pt(x, y, C.z9); t.pt(x + 1, y, C.z7); t.pt(x, y + 1, C.z3); }
        else if (vie < .8) { t.pt(x - 1, y, C.z8); t.pt(x + 1, y, C.z8); t.pt(x, y - 1, C.z8); t.pt(x, y + 1, C.z8); }
      }
      // Liseré pointillé d'or.
      for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 1 / R) {
        const s = cxs < CX ? 1 : -1;
        const x = Math.round(cxs + s * Math.cos(a) * R), y = Math.round(CY + Math.sin(a) * R);
        if (Math.floor((a + Math.PI / 2) * R / 6.5) % 2 === 0) { t.pt(x, y, C.o3); t.pt(x - s, y, C.o2); }
      }
    }

    // Marquage creusé.
    for (let i = 0; i < LIGNES.length; i += 2) t.px[LIGNES[i]] = [C.z3, C.z4, C.z8][LIGNES[i + 1]];

    // La paille qui roule et rebondit.
    for (let i = 0; i < 3; i++) {
      const v = 74 + hacher(i, 1, 80) * 60, ph = hacher(i, 2, 80) * 900, yy = COURT.top + (COURT.bottom - COURT.top) * (.2 + hacher(i, 3, 80) * .6);
      const r = 8 + hacher(i, 4, 80) * 6;
      const x = ((temps * v + ph) % (820 + 90)) - 45 + COURT.left;
      const saut = Math.abs(Math.sin(temps * 4.4 + ph)) * 18;
      for (let s = -r + saut * .28; s <= r - saut * .28; s++) t.teinte(x + s, yy, PAL, C.z2, .5);
      const rot = temps * 6;
      for (let k = 0; k < 16; k++) {
        const a = hacher(k, i, 81) * Math.PI * 2 + rot, l = r * (.55 + hacher(k, i, 82) * .5);
        t.ligne(x + Math.cos(a) * l, yy - r - saut + Math.sin(a) * l, x + Math.cos(a + 2.2) * l * .8, yy - r - saut + Math.sin(a + 2.2) * l * .8, k % 3 ? C.a3 : C.a2);
      }
    }

    animerBordsDune(t, temps);

    for (const cote of [1, 2]) {
      const fl = cote === 1 ? butG : butD;
      if (fl <= .02) continue;
      const fx = cote === 1 ? COURT.left - 6 : COURT.right - BUT.prof + 6;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = fx; x < fx + BUT.prof; x++)
        t.teinte(x, y, PAL, C.o5, fl * .55);
    }

    // La tempête : un voile tramé de sable, et des grains qui filent.
    if (extras.tempete) {
      const k = .55 + Math.sin(temps * .7) * .1;
      const voile = C.tp;
      // Le bruit du voile est calculé par carrés de 4 px : par pixel, il
      // coûtait plus que tout le reste de l'image.
      for (let by = 0; by < H; by += 4) for (let bx = 0; bx < W; bx += 4) {
        const f = k * (.55 + fbm(bx * .01 - temps * .9, by * .02, 2, 90) * .6);
        for (let y = by; y < by + 4; y++) for (let x = bx; x < bx + 4; x++) t.px[y * W + x] = PAL.teinter(t.px[y * W + x], voile, f, x, y);
      }
      for (let i = 0; i < 220; i++) {
        const x = Math.floor((hacher(i, 1, 91) * W + temps * 220 * (.6 + hacher(i, 2, 91))) % W), y = Math.floor(hacher(i, 3, 91) * H);
        t.hl(x, x + 3, y, C.z9); t.pt(x + 4, y, C.z8);
      }
    }

    t.peindre(g);
    return cible;
  }
  return { image };
}
