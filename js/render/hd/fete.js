// ---------------------------------------------------------------------------
// LA FÊTE FORAINE EN PIXEL ART HD.
//
// Une place pavée au milieu d'une fête foraine, à l'heure bleue : le ciel
// passe de l'indigo au rose, les premières étoiles, et toutes les ampoules
// sont allumées. Au fond, la grande roue qui tourne, le chapiteau, les
// montagnes russes dont le train passe de temps en temps, et un feu
// d'artifice de loin en loin. Les cages ont des montants rayés comme des sucres
// d'orge et un cadre d'ampoules qui s'allument en chenille.
//
// Sur les bords : la barbe à papa, le manège de chevaux de bois, le stand de
// tir aux canards, le vendeur de ballons ; en bas, le chariot de pop-corn, les
// réverbères et les guirlandes.
//
// Pas de règle de jeu : c'est un décor.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, bruit, hacher, lisse, balayerDisque, balayerEllipse, balayerPoly, spriteDe, spriteChiffre } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];
const ANNEAU = 62;
const ROUE = { x: 404, y: 42, r: 36 };
const CHAPITEAU = { x: 290, y: 84 };
const MANEGE = { x: 926, y: 150 };

const PAL = new Palette({
  // Ciel de l'heure bleue
  k0: '#161436', k1: '#24205a', k2: '#3e2e74', k3: '#6a3884', k4: '#a44686', k5: '#d8688a', k6: '#f0a086',
  // Ampoules et or
  y1: '#a0701a', y2: '#e8b030', y3: '#ffdc6a', y4: '#fff6c8',
  // Rouge
  o0: '#420c16', o1: '#861a26', o2: '#cc3040', o3: '#f05a5e',
  // Blanc crème
  w1: '#aca4b8', w2: '#d8d0dc', w3: '#fff6ee',
  // Rose barbe à papa
  p1: '#a8487a', p2: '#e478a6', p3: '#ffb2d0', p4: '#ffe0ee',
  // Bleu et turquoise
  u1: '#1a3470', u2: '#2a58b4', u3: '#4a86e6', u4: '#8ab8ff',
  t1: '#18625c', t2: '#28a092', t3: '#68d6c2',
  // Pavés, éclairés par les lampes
  s0: '#262030', s1: '#3a3242', s2: '#524654', s3: '#6a5c66', s4: '#827276', s5: '#9e8a86', s6: '#bca496',
  // Bois, métal, vert
  b1: '#4a2e1c', b2: '#7a4e2e', b3: '#a8784a', b4: '#d0a46e',
  m1: '#34344a', m2: '#62627a', m3: '#9a9ab0',
  g1: '#2e6a3a', g2: '#5aa44a',
  // Plancher de piste peint : rayons saumon et beige
  a0: '#7a4a40', a1: '#b07866', a2: '#d09682', a3: '#e8b69e', c0: '#7a6448', c1: '#a88a66', c2: '#c6a882', c3: '#e0c8a0',
  k: '#110d18', w: '#ffffff'
});
const C = PAL.c;
const CIEL = PAL.sous(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6']);
const PAVE = PAL.sous(['s0', 's1', 's2', 's3', 's4', 's5', 's6']);
const AMPOULES = [C.y3, C.o3, C.u4, C.p3, C.t3];

const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
const dansCage = (x, y) => y >= BUT.haut - 10 && y < BUT.bas + 10 && (x < COURT.left + 2 || x >= COURT.right - 2);

let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
const CHIFFRE = { 3: spriteChiffre(3, C.w3, C.w2, C.w1, C.k), 5: spriteChiffre(5, C.w3, C.w2, C.w1, C.k) };

// Une ampoule allumée : un point clair et un halo d'un pixel.
function ampoule(t, x, y, c, k = 1) {
  x = Math.round(x); y = Math.round(y);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) t.teinte(x + dx, y + dy, PAL, c, .45 * k);
  t.pt(x, y, k > .5 ? C.y4 : c);
}

// ---------------------------------------------------------------------------
// Le fond fixe
// ---------------------------------------------------------------------------
function peindreCiel(t) {
  const stops = [[22, 20, 54], [36, 32, 90], [62, 46, 116], [106, 56, 132], [164, 70, 134], [216, 104, 138], [240, 160, 134]];
  for (let y = 0; y < 84; y++) for (let x = 0; x < W; x++) {
    const k = Math.min(1, y / 70) * (stops.length - 1), a = Math.min(stops.length - 2, Math.floor(k)), f = k - a;
    const [r, g, b] = stops[a].map((v, j) => v + (stops[a + 1][j] - v) * f);
    t.px[y * W + x] = CIEL.tramer(r, g, b, x, y, 1.8);
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(hacher(i, 1, 10) * W), y = Math.floor(hacher(i, 2, 10) * 30);
    t.pt(x, y, hacher(i, 3, 10) < .3 ? C.w3 : C.w1);
  }
  // Silhouettes lointaines : arbres et toits de la ville, en bas du ciel.
  for (let x = 0; x < W; x++) {
    const top = Math.round(66 + Math.sin(x * .05) * 2 + fbm(x * .08, 0, 2, 11) * 6 - (hacher(Math.floor(x / 22), 0, 12) < .3 ? 6 : 0));
    for (let y = top; y < 84; y++) t.pt(x, y, C.k1 || C.k0);
  }
}
function chapiteau(t) {
  const { x, y } = CHAPITEAU;
  // Toit conique rayé rouge et blanc, fanion au sommet.
  const haut = 44, demi = 36;
  for (let yy = y - haut; yy < y - 16; yy++) {
    const k = (yy - (y - haut)) / (haut - 16), d = 2 + k * demi;
    for (let xx = Math.round(x - d); xx <= x + d; xx++) {
      const bande = Math.floor(((xx - x) / d) * 5 + 5);
      let c = bande % 2 ? C.w2 : C.o2;
      if (xx > x + d * .5) c = bande % 2 ? C.w1 : C.o1;
      t.pt(xx, yy, c);
    }
  }
  for (let xx = x - demi - 2; xx <= x + demi + 2; xx++) { const f = Math.floor((xx - x + 40) / 6) % 2; t.pt(xx, y - 16, C.y2); t.pt(xx, y - 15, f ? C.o2 : C.w2); if (f) t.pt(xx, y - 14, C.o1); }
  // Murs de toile et l'entrée éclairée.
  for (let yy = y - 14; yy < y; yy++) for (let xx = x - demi + 2; xx <= x + demi - 2; xx++) {
    const bande = Math.floor((xx - x + 60) / 8) % 2;
    let c = bande ? C.w2 : C.o2;
    if (Math.abs(xx - x) < 6) c = yy < y - 11 ? C.o0 : C.y3;
    t.pt(xx, yy, c);
  }
  for (let yy = y - haut - 7; yy < y - haut; yy++) t.pt(x, yy, C.m2);
  balayerPoly([[x + 1, y - haut - 7], [x + 8, y - haut - 5], [x + 1, y - haut - 3]], (yy, a, b) => t.hl(a, b, yy, C.y3));
}
function supportsRoue(t) {
  const { x, y } = ROUE;
  t.ligne(x, y, x - 22, 84, C.m2); t.ligne(x + 1, y, x - 21, 84, C.m1);
  t.ligne(x, y, x + 22, 84, C.m2); t.ligne(x + 1, y, x + 23, 84, C.m1);
  t.hl(x - 14, x + 14, 68, C.m1);
  // Le guichet au pied.
  for (let yy = 72; yy < 84; yy++) for (let xx = x - 9; xx <= x + 9; xx++) t.pt(xx, yy, yy < 74 ? C.o2 : xx === x - 9 || xx === x + 9 ? C.b1 : C.b3);
}
// Le parcours des montagnes russes, et ses piliers.
function hauteurRails(x) { return 40 + Math.sin((x - 520) * .045) * 14 + Math.sin((x - 520) * .11) * 5 - lisse(520, 560, x) * 0 + (x < 560 ? (560 - x) * .3 : 0); }
function montagnesRusses(t) {
  for (let x = 520; x <= 720; x++) {
    const y = Math.round(hauteurRails(x));
    t.pt(x, y, C.o2); t.pt(x, y + 1, C.o1); t.pt(x, y + 3, C.o1);
    if (x % 3 === 0) t.pt(x, y + 2, C.o0);
    if (x % 16 === 0) for (let yy = y + 4; yy < 84; yy++) { t.pt(x, yy, C.m1); if ((yy + x) % 9 === 0) t.pt(x + 1, yy, C.m1); }
  }
}
// Des stands en rang au fond, sous le ciel, auvents rayés.
function standsFond(t) {
  for (let i = 0; i < 12; i++) {
    const x0 = 180 + i * 50 + Math.floor(hacher(i, 1, 13) * 12);
    if (Math.abs(x0 + 14 - ROUE.x) < 26 || Math.abs(x0 + 14 - CHAPITEAU.x) < 44) continue;
    const l = 26, c1 = [C.o2, C.u2, C.t2, C.p2][i % 4];
    for (let y = 70; y < 84; y++) for (let x = x0; x < x0 + l; x++) {
      let c = y < 75 ? (Math.floor((x - x0) / 4) % 2 ? C.w2 : c1) : y < 77 ? C.y3 : C.b2;
      if (y >= 77 && x > x0 + 3 && x < x0 + l - 3 && y < 82) c = C.y2;
      t.pt(x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------
// La place : des pavés tièdes sous la lumière des lampes, des confettis.
// ---------------------------------------------------------------------------
// La lumière : une place bien éclairée, un peu plus chaude devant les cages
// et les stands, qui s'assombrit doucement vers les coins.
const HALOS = [[COURT.left, CY, 150], [COURT.right, CY, 150], [36, 150, 90], [36, 480, 90], [930, 160, 90], [930, 500, 80], [300, 598, 80], [660, 598, 80]];
function lumiere(x, y) {
  let l = .55 - Math.hypot((x - CX) / 700, (y - CY) / 420) * .35;
  for (const [lx, ly, r] of HALOS) { const d = Math.hypot(x - lx, y - ly); l += .35 * Math.exp(-d * d / (2 * r * r)); }
  return Math.min(1, Math.max(0, l));
}
function peindrePlace(t) {
  for (let y = 84; y < H; y++) {
    const rang = Math.floor(y / 10), dec = rang % 2 ? 5 : 0;
    for (let x = 0; x < W; x++) {
      const px = (x + dec) % 10, py = y % 10;
      const cle = Math.floor((x + dec) / 10);
      const joint = px === 0 || py === 0;
      const bord = px === 1 || py === 1;
      const l = lumiere(x, y);
      const dedans = dansTerrain(x, y);
      // Chaque pavé d'un seul ton, pris à son centre : pas de trame dans la
      // pierre, sinon la place grésille. Coins arrondis, arête claire en haut.
      const sx = Math.floor((x + dec) / 10) * 10 - dec + 5, sy = rang * 10 + 5;
      const lc = lumiere(sx, sy);
      let v = (dansTerrain(sx, sy) ? 104 : 88) + lc * 70 + (hacher(cle, rang, 20) - .5) * 18;
      const coin = (px === 0 || px === 9) && (py === 0 || py === 9);
      if (joint || coin) v -= 26; else if (py === 1) v += 10; else if (py === 9 || px === 9) v -= 10;
      t.px[y * W + x] = PAVE.proche(v * 1.02, v * .9, v * .92);
    }
  }
  // Le terrain : un plancher de piste en lattes, peint d'un grand soleil à
  // rayons alternés saumon et beige, comme le sol d'un chapiteau.
  for (let y = COURT.top; y < COURT.bottom; y++) for (let x = COURT.left; x < COURT.right; x++) {
    const j = (y - COURT.top) % 8, latte = Math.floor((y - COURT.top) / 8);
    const bout = (x - COURT.left + latte * 37) % 96 === 0;
    const ray = Math.floor((Math.atan2(y - CY, x - CX) + Math.PI) / (Math.PI * 2) * 28) % 2;
    const R = ray ? [C.a0, C.a1, C.a2, C.a3] : [C.c0, C.c1, C.c2, C.c3];
    let c = j === 7 || bout ? R[0] : j === 0 ? R[3] : R[2];
    const loin = Math.hypot(x - CX, (y - CY) * 1.6) / 460;
    if (j > 0 && j < 7 && !bout && hacher(x >> 1, y >> 1, 25) < loin * .5) c = R[1];
    if (j > 1 && j < 6 && bruit(x * .08 + latte * 13, j * .5, 26) > .82) c = R[1];
    t.px[y * W + x] = c;
  }
  // Confettis.
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hacher(i, 1, 22) * W), y = 86 + Math.floor(hacher(i, 2, 22) * 512);
    if (dansCage(x, y)) continue;
    const c = [C.o3, C.y3, C.u4, C.p3, C.t3][i % 5];
    t.pt(x, y, c); if (i % 3 === 0) t.pt(x + 1, y, c);
  }
}
function peindreLignes(t) {
  const trait = (x, y) => { const h = hacher(x, y, 30); t.pt(x, y, h < .1 ? C.w1 : h < .3 ? C.w2 : C.w3); };
  const { left: L, right: R, top: T, bottom: B } = COURT;
  for (let x = L; x < R; x++) for (let k = 0; k < 3; k++) { trait(x, T + k); trait(x, B - 1 - k); }
  for (let y = T; y < B; y++) for (let k = 0; k < 3; k++) {
    if (y < BUT.haut || y >= BUT.bas) { trait(L + k, y); trait(R - 1 - k, y); }
    if (Math.abs(y - CY) > ANNEAU) trait(CX - 1 + k, y);
  }
  for (let a = 0; a < Math.PI * 2; a += .004) for (let k = -1; k <= 1; k++) trait(Math.round(CX + Math.cos(a) * (ANNEAU + k)), Math.round(CY + Math.sin(a) * (ANNEAU + k)));
  // L'étoile de cirque au centre, rouge bordée d'or.
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 16 : 40; pts.push([CX + Math.cos(a) * r, CY + 2 + Math.sin(a) * r]); }
  const dedans = new Set();
  balayerPoly(pts, (y, a, b) => { for (let x = a; x <= b; x++) dedans.add(y * W + x); });
  for (const i of dedans) {
    const x = i % W, y = (i / W) | 0;
    const bord = !dedans.has(i + 1) || !dedans.has(i - 1) || !dedans.has(i + W) || !dedans.has(i - W);
    const bord2 = !dedans.has(i + 2) || !dedans.has(i - 2) || !dedans.has(i + 2 * W) || !dedans.has(i - 2 * W);
    t.pt(x, y, bord ? C.y1 : bord2 ? C.y3 : (x - CX) + (y - CY) < -10 ? C.o3 : C.o2);
  }
}

// ---------------------------------------------------------------------------
// Les cages : montants en sucre d'orge, plancher de scène peint, cadre
// d'ampoules (allumées en chenille, voir plus bas).
// ---------------------------------------------------------------------------
function sucreOrge(t, x0, y0, l, h) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) {
    const bande = Math.floor((x - x0 + y - y0) / 4) % 2;
    const bordA = l > h ? y === y0 : x === x0, bordB = l > h ? y === y0 + h - 1 : x === x0 + l - 1;
    t.pt(x, y, bordA ? C.w3 : bordB ? C.o0 : bande ? C.o2 : C.w2);
  }
}
function peindreCage(t, cote) {
  const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, x1 = x0 + BUT.prof - 1;
  for (let y = BUT.haut; y < BUT.bas; y++) {
    const z = ZONES.find(zz => y < CY + zz.to), j = (y - BUT.haut) % 8;
    for (let x = x0; x <= x1; x++) {
      let c;
      if (z.points === 5) c = j === 7 ? C.y1 : j === 0 ? C.y3 : C.y2;
      else c = j === 7 ? C.u1 : j === 0 ? C.u3 : C.u2;
      // Petites étoiles peintes sur les planches bleues.
      if (z.points === 3 && hacher(Math.floor(x / 6), Math.floor(y / 6), 40 + cote) < .12 && x % 6 === 3 && y % 6 === 3) c = C.w3;
      t.pt(x, y, c);
    }
  }
  for (const yz of [CY - 26, CY + 26]) { t.hl(x0, x1, yz - 1, C.y1); t.hl(x0, x1, yz, C.k); t.hl(x0, x1, yz + 1, C.y2); }
  for (const z of ZONES) {
    const s = CHIFFRE[z.points];
    t.sprite(s, Math.round(x0 + BUT.prof / 2 - s.l / 2), Math.round(CY + (z.from + z.to) / 2 - s.h / 2), MIROIR);
  }
  const dos = cote === 1 ? x0 - 6 : x1 + 1;
  sucreOrge(t, dos, BUT.haut - 6, 6, 212);
  sucreOrge(t, Math.min(x0, dos), BUT.haut - 6, BUT.prof + 6, 6);
  sucreOrge(t, Math.min(x0, dos), BUT.bas, BUT.prof + 6, 6);
  for (let x = Math.min(x0, dos) - 1; x <= Math.max(x1, dos + 5) + 1; x++) t.teinte(x, BUT.bas + 6, PAL, C.k, .45);
  // Boules dorées aux coins.
  for (const [bx, by] of [[cote === 1 ? x1 + 1 : x0 - 1, BUT.haut - 3], [cote === 1 ? x1 + 1 : x0 - 1, BUT.bas + 3], [dos + 3, BUT.haut - 3], [dos + 3, BUT.bas + 3]])
    balayerDisque(bx, by, 4, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, (x - bx) + (y - by) < -3 ? C.y4 : (x - bx) + (y - by) > 3 ? C.y1 : C.y2); });
}

// ---------------------------------------------------------------------------
// Les bords
// ---------------------------------------------------------------------------
function ombre(t, cx, cy, rx, ry, k) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) t.teinte(x, y, PAL, C.k, k * (1 - (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) * .5)); });
}
function auvent(t, x0, y0, l, c1) {
  for (let y = y0; y < y0 + 8; y++) for (let x = x0; x < x0 + l; x++) t.pt(x, y, Math.floor((x - x0) / 5) % 2 ? C.w2 : c1);
  for (let x = x0; x < x0 + l; x++) { const f = Math.floor((x - x0) / 5) % 2; if ((x - x0) % 5 !== 0) t.pt(x, y0 + 8, f ? C.w1 : c1); }
}
function stand(t, x0, y0, l, h, c1) {
  ombre(t, x0 + l / 2, y0 + h + 1, l / 2 + 2, 3, .5);
  for (let y = y0 + 8; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) {
    let c = y < y0 + h - 12 ? (y < y0 + 10 ? C.y3 : y < y0 + 14 ? C.b2 : C.b1) : (x - x0) % 6 === 0 ? C.b2 : C.b3;
    if (x === x0 || x === x0 + l - 1) c = C.b1;
    if (y === y0 + h - 12) c = C.b4;
    t.pt(x, y, c);
  }
  auvent(t, x0 - 2, y0, l + 4, c1);
}
function barbeAPapa(t) {
  stand(t, 2, 112, 64, 92, C.p2);
  // Enseigne : un nuage rose.
  for (const [dx, r] of [[16, 8], [28, 11], [42, 9], [52, 6]]) balayerDisque(dx, 106, r, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, y < 102 ? C.p4 : C.p3); });
  // La machine à barbe à papa, sa cuve argentée.
  balayerEllipse(34, 170, 14, 6, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, y < 168 ? C.m3 : C.m2); });
  balayerEllipse(34, 166, 10, 3, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.p4); });
  // Bâtons de barbe à papa derrière le comptoir.
  for (let i = 0; i < 5; i++) {
    const x = 12 + i * 11;
    t.vl(x, 142, 152, C.w2);
    balayerDisque(x, 137, 5, (y, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, y, (xx - x) + (y - 137) < -2 ? C.p4 : i % 2 ? C.p3 : C.u4); });
  }
}
function manegeFixe(t) {
  const { x, y } = MANEGE;
  ombre(t, x, y + 38, 34, 5, .55);
  // Plateau et toit rayé.
  balayerEllipse(x, y + 34, 32, 6, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy > y + 36 ? C.b1 : C.b3); });
  for (let yy = y - 20; yy < y - 4; yy++) {
    const d = 4 + (yy - y + 20) * 1.9;
    for (let xx = Math.round(x - d); xx <= x + d; xx++) t.pt(xx, yy, Math.floor((xx - x + 60) / 6) % 2 ? C.w2 : C.t2);
  }
  for (let xx = x - 35; xx <= x + 35; xx++) { t.pt(xx, y - 4, C.y2); t.pt(xx, y - 3, Math.floor((xx - x + 60) / 6) % 2 ? C.w1 : C.t1); }
  for (let yy = y - 27; yy < y - 20; yy++) t.pt(x, yy, C.y2);
  t.vl(x, y - 3, y + 30, C.y2);
}
function tirFixe(t) {
  stand(t, 2, 434, 64, 116, C.o2);
  // Peluches accrochées en haut, cibles au fond.
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 11, c = [C.p3, C.u4, C.y3, C.t3, C.o3][i];
    balayerDisque(x, 452, 3, (y, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, y, c); });
    t.pt(x - 2, 449, c); t.pt(x + 2, 449, c); t.pt(x - 1, 452, C.k); t.pt(x + 1, 452, C.k);
  }
  for (let i = 0; i < 4; i++) balayerDisque(14 + i * 14, 468, 4, (y, a, b) => { for (let x = a; x <= b; x++) { const d = Math.hypot(x - 14 - i * 14, y - 468); t.pt(x, y, d < 1.5 ? C.o2 : d < 3 ? C.w3 : C.o2); } });
  // Les deux carabines posées sur le comptoir.
  for (const x of [14, 42]) { t.hl(x, x + 14, 532, C.m3); t.hl(x, x + 14, 533, C.m1); t.hl(x, x + 5, 534, C.b2); }
  for (let i = 0; i < 3; i++) balayerDisque(18 + i * 16, 508, 5, (y, a, b) => { for (let x = a; x <= b; x++) { const d = Math.hypot(x - 18 - i * 16, y - 508); t.pt(x, y, d < 1.5 ? C.y3 : d < 3.5 ? C.w3 : C.u2); } });
}
function popcorn(t, x0, yb) {
  ombre(t, x0 + 14, yb + 1, 16, 3, .5);
  for (let y = yb - 30; y < yb - 6; y++) for (let x = x0; x < x0 + 28; x++) {
    let c = y < yb - 26 ? C.o2 : y < yb - 14 ? (x === x0 || x === x0 + 27 ? C.o1 : hacher(x, y, 50) < .5 ? C.y4 : C.y3) : Math.floor((x - x0) / 4) % 2 ? C.w2 : C.o2;
    t.pt(x, y, c);
  }
  for (const wx of [x0 + 5, x0 + 22]) balayerDisque(wx, yb - 4, 4, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, Math.hypot(x - wx, y - yb + 4) < 2 ? C.y2 : C.k); });
}
function reverbere(t, x, yb) {
  for (let y = yb - 40; y <= yb; y++) { t.pt(x, y, C.m1); t.pt(x + 1, y, C.m2); }
  t.hl(x - 3, x + 4, yb, C.m1);
  balayerDisque(x, yb - 43, 3, (y, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, y, C.y4); });
  for (let y = yb - 52; y < yb - 34; y++) for (let xx = x - 9; xx <= x + 9; xx++) { const d = Math.hypot(xx - x, y - yb + 43); if (d < 9 && d > 3) t.teinte(xx, y, PAL, C.y3, .35 * (1 - d / 9)); }
}
function peindreBords(t) {
  barbeAPapa(t);
  manegeFixe(t);
  tirFixe(t);
  // Le vendeur de ballons : son chariot ; les ballons sont animés.
  ombre(t, 930, 548, 16, 3, .5);
  for (let y = 520; y < 546; y++) for (let x = 918; x < 942; x++) t.pt(x, y, y < 524 ? C.u3 : (x - 918) % 6 === 0 ? C.u1 : C.u2);
  for (const wx of [922, 938]) balayerDisque(wx, 546, 3, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.k); });
  // En bas : pop-corn, réverbères, poubelle, tickets tombés.
  popcorn(t, 110, 598);
  popcorn(t, 820, 598);
  for (const x of [300, 660]) reverbere(t, x, 598);
  for (const [x, y] of [[392, 580], [570, 588], [150, 572], [880, 572]]) { t.rect(x, y, 5, 3, C.o3); t.pt(x + 1, y + 1, C.w3); }
  // À droite, entre le manège et la cage, et au-dessus des ballons : un
  // stand de pommes d'amour et une boîte à forces (le marteau).
  stand(t, 896, 196 - 8, 60, 22, C.t2);
  for (let i = 0; i < 6; i++) { const x = 902 + i * 9; balayerDisque(x, 206, 3, (y, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, y, (xx - x) + (y - 206) < -1 ? C.o3 : C.o1); }); t.vl(x, 201, 203, C.b4); }
  ombre(t, 930, 470, 14, 3, .5);
  for (let y = 432; y < 468; y++) { t.pt(928, y, C.b2); t.pt(929, y, C.b3); t.pt(930, y, C.b1); }
  for (let k = 0; k < 6; k++) t.rect(924, 436 + k * 5, 11, 3, [C.o2, C.o3, C.y2, C.y3, C.t2, C.u3][k]);
  balayerDisque(929, 430, 4, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.y3); });
  t.rect(920, 466, 18, 4, C.m2); t.hl(920, 937, 466, C.m3);
}

// La tour de chute, entre la grande roue et les montagnes russes : un mât en
// treillis bardé d'ampoules ; sa nacelle monte lentement puis tombe (plus bas).
const TOUR = { x: 474, haut: 2, bas: 82 };
function tourChute(t) {
  const { x, haut, bas } = TOUR;
  for (let y = haut; y < bas; y++) {
    t.pt(x - 3, y, C.m2); t.pt(x + 3, y, C.m2);
    if ((y - haut) % 4 === 0) t.hl(x - 3, x + 3, y, C.m1);
    else t.pt(x - 3 + ((y - haut) % 4) * 2, y, C.m1);
  }
  for (let y = haut - 4; y < haut; y++) t.hl(x - 5 + (haut - y), x + 5 - (haut - y), y, C.o2);
  for (let y = 70; y < 84; y++) for (let xx = x - 10; xx <= x + 10; xx++) t.pt(xx, y, y < 72 ? C.y2 : xx % 4 === 0 ? C.b1 : C.b2);
}
// Les chaises volantes, sous la barre du HUD de droite mais visibles en bas.
const CHAISES = { x: 780, y: 36 };
function chaisesFixe(t) {
  const { x, y } = CHAISES;
  for (let yy = y; yy < 84; yy++) { t.pt(x, yy, C.m2); t.pt(x + 1, yy, C.m3); }
  for (let yy = 76; yy < 84; yy++) for (let xx = x - 16; xx <= x + 16; xx++) t.pt(xx, yy, yy < 78 ? C.p2 : C.b2);
}
// Serpentins enroulés sur les pavés, et du pop-corn tombé.
function serpentins(t) {
  for (let i = 0; i < 26; i++) {
    const x0 = 80 + hacher(i, 1, 23) * 800, y0 = 96 + hacher(i, 2, 23) * 454;
    if (dansCage(x0, y0) || Math.hypot(x0 - CX, y0 - CY) < 70) continue;
    const c = [C.o3, C.y3, C.u4, C.p3, C.t3][i % 5], a0 = hacher(i, 3, 23) * 6.3;
    for (let s = 0; s < 36; s++) {
      const a = a0 + s * .35, r = 1.5 + s * .18;
      const x = Math.round(x0 + Math.cos(a) * r + s * .45), y = Math.round(y0 + Math.sin(a) * r * .6);
      t.pt(x, y, c);
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hacher(i, 1, 24) * W), y = 90 + Math.floor(hacher(i, 2, 24) * 506);
    if (dansCage(x, y)) continue;
    t.pt(x, y, C.y4); t.pt(x + 1, y, C.w3); t.pt(x, y + 1, C.y3);
  }
}

function peindreFond() {
  const t = new Toile(W, H);
  peindreCiel(t);
  for (let i = 0; i < 90; i++) t.pt(Math.floor(hacher(i, 4, 10) * W), Math.floor(hacher(i, 5, 10) * 40), C.w1);
  standsFond(t);
  chaisesFixe(t);
  montagnesRusses(t);
  tourChute(t);
  chapiteau(t);
  supportsRoue(t);
  peindrePlace(t);
  serpentins(t);
  peindreBords(t);
  peindreLignes(t);
  peindreCage(t, 1);
  peindreCage(t, 2);
  FOND = t;
}

// ---------------------------------------------------------------------------
// La fête, en plus : projecteurs dans le ciel, feux d'artifice en rafale,
// tour de chute, chaises volantes, ampoules des montagnes russes, fanions,
// projecteurs de couleur sur la place, et les visiteurs qui se promènent.
// ---------------------------------------------------------------------------
function projecteursCiel(t, temps) {
  for (const [x0, ph, c] of [[210, 0, C.u4], [750, 2.1, C.p3], [540, 4.2, C.y3]]) {
    const a = -Math.PI / 2 + Math.sin(temps * .35 + ph) * .55;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 0; s < 90; s++) {
      const x = x0 + ca * s, y = 80 + sa * s;
      if (y < 0) break;
      const w = 2 + s * .08;
      for (let d = -w; d <= w; d += 1) t.teinte(Math.round(x - sa * d), Math.round(y + ca * d), PAL, c, .22 * (1 - s / 90) * (1 - Math.abs(d) / (w + 1)));
    }
  }
}
function feuxArtifice(t, temps) {
  for (const [per, dec, x0, x1] of [[3.1, 0, 250, 360], [3.7, 1.1, 440, 560], [4.3, 2.3, 600, 700], [4.9, 3.6, 300, 640], [5.6, .6, 150, 820]]) {
    const n = Math.floor((temps + dec) / per), q = ((temps + dec) % per) / per;
    if (q > .55) continue;
    const x = x0 + hacher(n, 1, 61) * (x1 - x0), y = 8 + hacher(n, 2, 61) * 16;
    const c = AMPOULES[(n + Math.floor(dec)) % 5], c2 = AMPOULES[(n + 2) % 5];
    if (q < .08) { const k = q / .08; for (let j = 0; j < 4; j++) t.teinte(Math.round(x), Math.round(y + (1 - k) * 40 + j), PAL, C.y4, .9 - j * .2); continue; }
    const k = (q - .08) / .47, r = 6 + k * 24;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2 + n;
      for (let tr = 0; tr < 4; tr++) {
        const rr = r - tr * 2.2;
        if (rr < 1) continue;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr + k * k * 6;
        t.teinte(Math.round(px), Math.round(py), PAL, i % 2 ? c : c2, (1 - k * .8) * (1 - tr * .25));
      }
    }
    // Crépitement : des paillettes qui scintillent en fin d'éclat.
    if (k > .6) for (let i = 0; i < 10; i++) if (hacher(i, Math.floor(temps * 12), 62) < .5) t.pt(Math.round(x + (hacher(i, n, 63) - .5) * r * 2), Math.round(y + (hacher(i, n, 64) - .5) * r * 2 + 6), C.y4);
  }
}
function tourChuteAnim(t, temps) {
  const { x, haut, bas } = TOUR;
  const q = (temps % 9) / 9;
  const y = q < .7 ? bas - 16 - (q / .7) * (bas - haut - 24) : haut + 8 + ((q - .7) / .08) ** 2 * (bas - haut - 24);
  const yy = Math.round(Math.min(bas - 16, y));
  for (let dy = 0; dy < 6; dy++) for (let dx = -8; dx <= 8; dx++) t.pt(x + dx, yy + dy, dy === 0 ? C.y3 : Math.abs(dx) < 4 ? C.m2 : (dx + 20) % 3 ? C.o2 : C.u3);
  for (let i = 0; i < 20; i++) ampoule(t, x + (i % 2 ? 3 : -3), haut + 4 + i * 4, AMPOULES[i % 5], (i + Math.floor(temps * 8)) % 5 === 0 ? 1 : .3);
}
function chaisesAnim(t, temps) {
  const { x, y } = CHAISES;
  for (let yy = y - 4; yy < y; yy++) t.hl(x - 12 + (y - yy) * 2, x + 12 - (y - yy) * 2, yy, C.p2);
  t.hl(x - 14, x + 14, y, C.y2);
  for (let i = 0; i < 10; i++) {
    const a = temps * 1.4 + i / 10 * Math.PI * 2, px = x + Math.sin(a) * 26, pz = Math.cos(a);
    const cy = y + 18 + pz * 3;
    t.ligne(x + Math.sin(a) * 12, y + 1, px, cy, C.w1);
    t.rect(Math.round(px) - 1, Math.round(cy), 3, 3, AMPOULES[i % 5]);
  }
  for (let i = 0; i < 8; i++) ampoule(t, x - 14 + i * 4, y, AMPOULES[i % 5], (i + Math.floor(temps * 5)) % 2 ? 1 : .4);
}
function amp_russes(t, temps) {
  for (let x = 524; x <= 716; x += 8) ampoule(t, x, Math.round(hauteurRails(x)) - 1, AMPOULES[(x >> 3) % 5], ((x >> 3) + Math.floor(temps * 7)) % 4 === 0 ? 1 : .35);
}
// Fanions triangulaires de toutes les couleurs, qui flottent.
function fanions(t, temps) {
  for (const [y0, sag, dx0] of [[87, 7, 0], [562, 6, 40]]) {
    const pts = [0, 120, 240, 360, 480, 600, 720, 840, 960];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i] + (i ? 0 : 0), b = pts[i + 1];
      for (let x = a; x < b; x++) {
        const u = (x - a) / (b - a), y = Math.round(y0 + 4 * u * (1 - u) * sag);
        t.pt(x, y, C.w1);
        if ((x + dx0) % 12 === 0) {
          const c = [C.o2, C.y2, C.u3, C.t2, C.p2, C.w2][((x + dx0) / 12) % 6 | 0];
          const vent = Math.round(Math.sin(temps * 2.4 + x * .05) * 1.2);
          for (let k = 0; k < 7; k++) { const l = Math.max(0, 3 - Math.floor(k / 2)); t.hl(x - l + (k > 3 ? vent : 0), x + l + (k > 3 ? vent : 0), y + 1 + k, k === 0 ? C.w3 : c); }
        }
      }
    }
  }
}
// Projecteurs de couleur qui se promènent sur la place, doucement.
function projecteursSol(t, temps) {
  for (const [ph, c, r] of [[0, C.p3, 52], [2.2, C.u4, 48], [4.1, C.y3, 46], [5.3, C.t3, 44]]) {
    const cx = CX + Math.sin(temps * .23 + ph) * 330, cy = CY + Math.sin(temps * .31 + ph * 1.7) * 170;
    for (let y = Math.max(COURT.top, Math.floor(cy - r)); y <= Math.min(COURT.bottom - 1, cy + r); y += 1) for (let x = Math.max(COURT.left, Math.floor(cx - r)); x <= Math.min(COURT.right - 1, cx + r); x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.25) / r;
      if (d < 1) t.teinte(x, y, PAL, c, .3 * (1 - d * d));
    }
  }
}
// Les visiteurs : de petits promeneurs qui passent dans la rue du bas et
// devant les stands du fond, certains avec un ballon ou une barbe à papa.
const VISITEURS = [];
for (let i = 0; i < 26; i++) VISITEURS.push({
  y: i < 18 ? 584 + (i % 3) * 6 : 82,
  v: (8 + hacher(i, 1, 70) * 10) * (hacher(i, 2, 70) < .5 ? 1 : -1),
  x0: hacher(i, 3, 70) * 1000,
  peau: [C.b4, C.b3, C.w2, C.b2][Math.floor(hacher(i, 4, 70) * 4)],
  haut: [C.o2, C.u3, C.t2, C.p2, C.y2, C.w2, C.m2][Math.floor(hacher(i, 5, 70) * 7)],
  bas: [C.u1, C.m1, C.k, C.b1][Math.floor(hacher(i, 6, 70) * 4)],
  cheveux: [C.k, C.b1, C.y2, C.o1][Math.floor(hacher(i, 7, 70) * 4)],
  objet: Math.floor(hacher(i, 8, 70) * 4),
  petit: i >= 18
});
VISITEURS.sort((a, b) => a.y - b.y);
function visiteurs(t, temps) {
  for (const p of VISITEURS) {
    const per = W + 40, x = Math.round((((p.x0 + temps * p.v) % per) + per) % per - 20);
    const pas = Math.floor(temps * 6 + p.x0) & 1, s = p.petit ? 0.7 : 1.5;
    const y0 = p.y - Math.round(14 * s);
    if (!p.petit) for (let k = -3; k <= 3; k++) t.teinte(x + k, p.y + 1, PAL, C.k, .35);
    // Tête, cheveux, torse, jambes qui marchent.
    const h = Math.round(3 * s) || 1;
    t.rect(x - 1, y0, 3, h, p.peau); t.hl(x - 1, x + 1, y0, p.cheveux);
    t.rect(x - 2, y0 + h, 5, Math.round(6 * s), p.haut);
    const yj = y0 + h + Math.round(6 * s), lj = Math.round(5 * s) || 1;
    for (let k = 0; k < lj; k++) { t.pt(x - 1 + (pas && k > lj / 2 ? -1 : 0), yj + k, p.bas); t.pt(x + 1 + (!pas && k > lj / 2 ? 1 : 0), yj + k, p.bas); }
    if (p.petit) continue;
    if (p.objet === 0) { t.ligne(x + 2, y0 + 4, x + 5, y0 - 8, C.w1); balayerEllipse(x + 5, y0 - 11, 2, 3, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, p.v > 0 ? C.o3 : C.u4); }); }
    else if (p.objet === 1) { t.pt(x + 3, y0 + 4, C.w2); balayerDisque(x + 3, y0 + 1, 2, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, C.p3); }); }
  }
}
// Les marquises d'ampoules autour des enseignes des stands.
function couronneCentre(t, temps) {
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2;
    const x = Math.round(CX + Math.cos(a) * (ANNEAU + 7)), y = Math.round(CY + Math.sin(a) * (ANNEAU + 7)), on = (i + Math.floor(temps * 8)) % 6 < 2;
    ampoule(t, x, y, AMPOULES[i % 5], on ? 1 : .6); t.pt(x + 1, y, on ? C.y4 : AMPOULES[i % 5]); t.pt(x, y + 1, C.k);
  }
}
// Des confettis qui tombent du ciel en virevoltant, lentement.
function confettisTombants(t, temps) {
  for (let i = 0; i < 46; i++) {
    const v = 16 + hacher(i, 1, 80) * 14, per = H + 20;
    const y = ((hacher(i, 2, 80) * per + temps * v) % per) - 10;
    const x = hacher(i, 3, 80) * W + Math.sin(temps * 1.4 + i) * 10;
    const c = AMPOULES[i % 5], tour = Math.floor(temps * 5 + i) % 3;
    const xr = Math.round(x), yr = Math.round(y);
    if (tour === 0) t.hl(xr, xr + 2, yr, c); else if (tour === 1) { t.pt(xr, yr, c); t.pt(xr + 1, yr + 1, c); } else t.vl(xr + 1, yr, yr + 1, c);
  }
}
function marquises(t, temps) {
  const bords = [[2, 112, 64], [2, 434, 64], [896, 188, 60]];
  let i = 0;
  for (const [x0, y0, l] of bords) for (let x = x0; x < x0 + l; x += 5, i++) ampoule(t, x, y0 - 1, AMPOULES[i % 5], (i + Math.floor(temps * 6)) % 3 === 0 ? 1 : .35);
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
function grandeRoue(t, temps) {
  const { x, y, r } = ROUE, a0 = temps * .12;
  for (let i = 0; i < 12; i++) {
    const a = a0 + i / 12 * Math.PI * 2;
    t.ligne(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, C.m2);
  }
  for (let a = 0; a < Math.PI * 2; a += .02) { t.pt(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), C.m3); t.pt(Math.round(x + Math.cos(a) * (r - 3)), Math.round(y + Math.sin(a) * (r - 3)), C.m1); }
  // Ampoules sur la jante, en chenille.
  for (let i = 0; i < 36; i++) {
    const a = a0 + i / 36 * Math.PI * 2;
    const on = (i + Math.floor(temps * 6)) % 4 === 0;
    ampoule(t, x + Math.cos(a) * r, y + Math.sin(a) * r, AMPOULES[i % 5], on ? 1 : .35);
  }
  // Nacelles, toujours à plat.
  for (let i = 0; i < 12; i++) {
    const a = a0 + i / 12 * Math.PI * 2, gx = Math.round(x + Math.cos(a) * r), gy = Math.round(y + Math.sin(a) * r);
    const c = [C.o2, C.u3, C.y2, C.t2][i % 4];
    t.pt(gx, gy + 1, C.m2);
    for (let yy = gy + 2; yy < gy + 7; yy++) for (let xx = gx - 3; xx <= gx + 3; xx++) t.pt(xx, yy, yy === gy + 2 ? C.w2 : yy === gy + 6 ? C.k : c);
  }
  balayerDisque(x, y, 3, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, C.y3); });
}
function trainRusses(t, temps) {
  const q = (temps % 14) / 14;
  if (q > .55) return;
  const tete = 520 + q / .55 * 220;
  for (let w = 0; w < 3; w++) {
    const x = Math.round(tete - w * 9);
    if (x < 520 || x > 720) continue;
    const y = Math.round(hauteurRails(x)) - 4;
    t.rect(x - 3, y, 7, 4, w === 0 ? C.y2 : C.u3); t.hl(x - 3, x + 3, y, C.w2);
    t.pt(x - 1, y - 1, C.k); t.pt(x + 1, y - 1, C.k);
  }
}
function feuArtifice(t, temps) {
  const n = Math.floor(temps / 7), q = (temps % 7) / 7;
  if (q > .35) return;
  const x = 470 + hacher(n, 1, 60) * 60, y = 10 + hacher(n, 2, 60) * 14, c = AMPOULES[n % 5];
  if (q < .08) { t.pt(Math.round(x), Math.round(y + (1 - q / .08) * 30), C.y4); return; }
  const k = (q - .08) / .27, r = 4 + k * 12;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r + k * k * 4;
    t.teinte(Math.round(px), Math.round(py), PAL, c, 1 - k * .7);
    t.teinte(Math.round(x + Math.cos(a) * r * .7), Math.round(y + Math.sin(a) * r * .7 + k * k * 3), PAL, C.y4, .6 * (1 - k));
  }
}
// Les guirlandes d'ampoules tendues au-dessus du haut du terrain et en bas.
function guirlandes(t, temps) {
  for (const [y0, sag] of [[80, 6], [566, 5]]) {
    const poteaux = [0, 160, 320, 480, 640, 800, 960];
    for (let i = 0; i + 1 < poteaux.length; i++) {
      const a = poteaux[i], b = poteaux[i + 1];
      for (let x = a; x < b; x++) {
        const u = (x - a) / (b - a), y = Math.round(y0 + 4 * u * (1 - u) * sag);
        t.pt(x, y, C.k);
        if ((x - a) % 10 === 5) {
          const on = (Math.floor(x / 10) + Math.floor(temps * 3)) % 3 !== 0;
          ampoule(t, x, y + 2, AMPOULES[Math.floor(x / 10) % 5], on ? 1 : .3);
        }
      }
    }
  }
}
function amp_cages(t, temps) {
  for (const cote of [1, 2]) {
    const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right;
    const dos = cote === 1 ? x0 - 6 : x0 + BUT.prof;
    let i = 0;
    for (let x = Math.min(x0, dos) + 3; x < Math.min(x0, dos) + BUT.prof + 4; x += 7, i++) {
      for (const y of [BUT.haut - 3, BUT.bas + 3]) ampoule(t, x, y, C.y3, (i + Math.floor(temps * 5)) % 3 === 0 ? 1 : .4);
    }
    for (let y = BUT.haut + 4; y < BUT.bas; y += 8, i++) ampoule(t, dos + 3, y, C.y3, (i + Math.floor(temps * 5)) % 3 === 0 ? 1 : .4);
  }
}
function manege(t, temps) {
  const { x, y } = MANEGE;
  // Les chevaux de bois tournent et montent et descendent.
  const chevaux = [];
  for (let i = 0; i < 6; i++) {
    const a = temps * .6 + i / 6 * Math.PI * 2;
    chevaux.push({ a, px: x + Math.sin(a) * 26, pz: Math.cos(a), i });
  }
  chevaux.sort((p, q) => p.pz - q.pz);
  for (const ch of chevaux) {
    const hx = Math.round(ch.px), hy = Math.round(y + 14 + ch.pz * 4 + Math.sin(temps * 2 + ch.i) * 3);
    const c = [C.w3, C.p3, C.y3, C.u4, C.w2, C.t3][ch.i];
    t.vl(hx, y - 3, y + 32, C.y2);
    t.rect(hx - 5, hy, 10, 5, c); t.rect(hx + 3 * Math.sign(Math.cos(ch.a) || 1), hy - 4, 3, 5, c);
    t.pt(hx - 4, hy + 5, C.k); t.pt(hx + 3, hy + 5, C.k);
    if (ch.pz < 0) for (let yy = hy - 4; yy < hy + 6; yy++) for (let xx = hx - 5; xx <= hx + 5; xx++) t.teinte(xx, yy, PAL, C.k, .3);
  }
  for (let i = 0; i < 14; i++) {
    const on = (i + Math.floor(temps * 4)) % 2 === 0;
    ampoule(t, x - 33 + i * 5, y - 2, AMPOULES[i % 5], on ? 1 : .35);
  }
}
function canards(t, temps) {
  for (let i = 0; i < 4; i++) {
    const x = 6 + ((temps * 10 + i * 16) % 58), y = 490;
    t.rect(Math.round(x), y, 6, 4, C.y3); t.rect(Math.round(x) + 4, y - 3, 3, 3, C.y3); t.pt(Math.round(x) + 7, y - 2, C.o2); t.pt(Math.round(x) + 5, y - 2, C.k);
  }
}
function ballons(t, temps) {
  const couleurs = [C.o3, C.u4, C.y3, C.p3, C.t3, C.o2, C.u3];
  for (let i = 0; i < 7; i++) {
    const bx = 930 + Math.round(Math.sin(temps * .7 + i) * 2 + (i - 3) * 5), by = 486 + (i % 3) * 7 - Math.abs(i - 3) * 2;
    t.ligne(930, 520, bx, by + 5, C.w1);
    balayerEllipse(bx, by, 4, 5, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, (x - bx) + (y - by) < -3 ? C.w3 : couleurs[i]); });
  }
  // De temps en temps, un ballon s'échappe et monte.
  const q = (temps % 11) / 11;
  if (q < .7) {
    const bx = 930 + Math.sin(temps * 1.3) * 6 - q * 30, by = 480 - q * 380;
    balayerEllipse(Math.round(bx), Math.round(by), 4, 5, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, (x - bx) + (y - by) < -3 ? C.w3 : C.o3); });
    t.ligne(bx, by + 5, bx + Math.sin(temps * 3) * 2, by + 14, C.w1);
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
    projecteursCiel(t, temps);
    feuxArtifice(t, temps);
    chaisesAnim(t, temps);
    tourChuteAnim(t, temps);
    amp_russes(t, temps);
    trainRusses(t, temps);
    grandeRoue(t, temps);
    couronneCentre(t, temps);
    visiteurs(t, temps);
    guirlandes(t, temps);
    fanions(t, temps);
    amp_cages(t, temps);
    marquises(t, temps);
    manege(t, temps);
    canards(t, temps);
    ballons(t, temps);
    confettisTombants(t, temps);
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
