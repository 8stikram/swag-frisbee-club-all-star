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
const ROCHER = { x0: 292, x1: 668 };
const VISAGES = [350, 432, 514, 596];
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

// Le haut du rocher : sa crête boisée, et le sommet des toits devant.
function haumRocher(x) {
  if (x < ROCHER.x0 || x > ROCHER.x1) return 99;
  const bord = Math.min(x - ROCHER.x0, ROCHER.x1 - x);
  return Math.round(3 + fbm(x * .05, 0, 2, 3) * 4 + lisse(18, 0, bord) * 16);
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
    const top = Math.round(36 + Math.sin(x * .011 + 1) * 5 + fbm(x * .04, 1, 3, 4) * 8);
    for (let y = top; y < 62; y++) {
      const c = y === top ? C.v3 : FEUILLAGE.tramer(70 - (y - top) * 1.2, 120 - (y - top) * 2, 80, x, y, 2);
      t.pt(x, y, c); if (y < 60) CIELM[y * W + x] = 0;
    }
  }
}

// Le rocher des Hokage : falaise striée, crête boisée, quatre visages taillés.
function peindreRocher(t) {
  for (let x = ROCHER.x0 - 4; x <= ROCHER.x1 + 4; x++) {
    const top = haumRocher(x);
    if (top > 60) continue;
    for (let y = top; y < 70; y++) {
      const strate = Math.sin(x * .35 + fbm(x * .02, y * .06, 2, 5) * 6) * 10;
      const ombre = lisse(ROCHER.x0 + 30, ROCHER.x0, x) * 20 + lisse(ROCHER.x1 - 30, ROCHER.x1, x) * 26;
      const l = 176 + strate - (y - top) * .6 - ombre;
      t.px[y * W + x] = ROCHE.tramer(l, l * .86, l * .7, x, y, 2);
      if (y < 60) CIELM[y * W + x] = 0;
    }
    // La crête boisée.
    const h = 3 + Math.round(fbm(x * .12, 2, 2, 6) * 6);
    for (let k = 0; k < h; k++) {
      const y = top - k;
      t.pt(x, y, k === h - 1 ? C.v4 : k > h - 3 ? C.v3 : C.v2);
      if (y >= 0 && y < 60) CIELM[y * W + x] = 0;
    }
  }
  for (let i = 0; i < VISAGES.length; i++) visage(t, VISAGES[i], 7, i);
}
// Un visage taillé dans la roche, éclairé par la gauche. Chaque Hokage a sa
// coiffure ; les traits sont creusés, pas dessinés.
function visage(t, cx, y0, n) {
  const rx = 17, ry = 21, cy = y0 + 22;
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    let l = 196 - dx * 34 - Math.max(0, dy) * 20;
    if (dx * dx + dy * dy > .8) l -= 26;
    t.pt(x, y, ROCHE.tramer(l, l * .87, l * .72, x, y, 2.5));
  } });
  // Coiffure.
  for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
    const u = (x - cx) / (rx + 2);
    let h;
    if (n === 0) h = 9 + Math.abs(Math.sin(u * 9)) * 7;                 // en pointes
    else if (n === 1) h = 11 - u * u * 3;                                  // plate
    else if (n === 2) h = 12 + (Math.abs(u) > .7 ? 14 : 0);               // longue, qui tombe
    else h = 8 + Math.max(0, Math.sin(u * 6 + 1)) * 9;                    // en mèches
    for (let k = 0; k < h; k++) {
      const y = cy - ry + 2 - Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * 4) + k - 5;
      const l = 150 - u * 30 - k * 2 + (hacher(x, k, 7 + n) - .5) * 20;
      t.pt(x, y, ROCHE.tramer(l, l * .86, l * .7, x, y, 2));
    }
  }
  // Sourcils, yeux creusés, nez, bouche.
  const ye = cy - 2;
  for (const s of [-1, 1]) {
    const ex = cx + s * 7;
    t.hl(ex - 4, ex + 3, ye - 4, C.r1);
    t.hl(ex - 3, ex + 2, ye, C.r0); t.hl(ex - 2, ex + 1, ye + 1, C.r1);
    t.hl(ex - 3, ex + 2, ye - 1, C.r2);
  }
  for (let y = ye; y < ye + 9; y++) { t.pt(cx + 1, y, C.r2); t.pt(cx + 2, y, C.r1); }
  t.hl(cx - 2, cx + 3, ye + 9, C.r1);
  t.hl(cx - 5, cx + 5, ye + 14, C.r0); t.hl(cx - 4, cx + 4, ye + 15, C.r2);
  // Le menton qui s'enfonce dans la falaise.
  t.hl(cx - 10, cx + 10, cy + ry, C.r1);
}

// Les toits du village, en deux rangs, avec leurs réservoirs d'eau ronds.
function peindreVillage(t) {
  // La tour du Hokage : un cylindre rouge et son toit.
  const tx = 262;
  for (let y = 34; y < 72; y++) for (let x = tx - 18; x <= tx + 18; x++) {
    const u = (x - tx) / 18;
    let c = u < -.5 ? C.l3 : u < .3 ? C.l2 : u < .8 ? C.l1 : C.l0;
    if (y % 12 === 6) c = C.m3;
    if (y % 12 === 7 || y % 12 === 8) c = (x - tx + 30) % 7 < 3 ? C.k : C.m2;
    t.pt(x, y, c); if (y < 60) CIELM[y * W + x] = 0;
  }
  for (let y = 26; y < 34; y++) {
    const demi = 12 + (y - 26) * 1.2;
    for (let x = Math.round(tx - demi); x <= tx + demi; x++) { t.pt(x, y, y === 33 ? C.l0 : x < tx ? C.l3 : C.l2); if (y < 60) CIELM[y * W + x] = 0; }
  }
  for (const rang of [0, 1]) {
    const base = rang ? 82 : 66;
    let x = rang ? -14 : -30;
    let i = 0;
    while (x < W) {
      const l = 26 + Math.floor(hacher(i, rang, 10) * 24);
      const devantRocher = !rang && x + l > ROCHER.x0 - 10 && x < ROCHER.x1 + 10;
      const hm = devantRocher ? 7 + Math.floor(hacher(i, rang, 11) * 3) : (rang ? 9 : 12) + Math.floor(hacher(i, rang, 11) * 7);
      maison(t, x, base, l, hm, i * 7 + rang * 131);
      x += l + Math.floor(hacher(i, rang, 12) * 5) - 2;
      i++;
    }
  }
}
function maison(t, x0, base, l, hm, id) {
  const ardoise = hacher(id, 1, 13) < .35;
  const T = ardoise ? [C.d0, C.d1, C.d2, C.d3] : [C.t0, C.t1, C.t2, C.t3];
  const yMur = base - hm;
  for (let y = yMur; y < base; y++) for (let x = x0; x < x0 + l; x++) {
    let c = x === x0 ? C.m1 : x > x0 + l - 3 ? C.m1 : C.m3;
    if (y === base - 1) c = C.m1;
    t.pt(x, y, c);
  }
  // Fenêtres.
  for (let wx = x0 + 4; wx + 4 < x0 + l - 3; wx += 9) {
    for (let y = yMur + 3; y < yMur + 7; y++) for (let x = wx; x < wx + 4; x++) t.pt(x, y, y === yMur + 3 ? C.b2 : C.d0);
  }
  // Toit en pente douce, tuiles par rangs.
  const hr = 7;
  for (let k = 0; k < hr; k++) {
    const y = yMur - k - 1;
    const a = x0 - 3 + Math.round(k * 1.2), b = x0 + l + 2 - Math.round(k * 1.2);
    for (let x = a; x <= b; x++) {
      let c = k === 0 ? T[0] : (x - a) % 4 === 0 ? T[1] : k > hr - 3 ? T[3] : T[2];
      if (x === a) c = T[0];
      t.pt(x, y, c); if (y < 60) CIELM[y * W + x] = 0;
    }
  }
  // Un réservoir d'eau rond sur un toit sur trois.
  if (hacher(id, 2, 14) < .38) {
    const rx = x0 + 6 + Math.floor(hacher(id, 3, 15) * (l - 16)), ry = yMur - hr - 1;
    for (let y = ry - 8; y <= ry; y++) for (let x = rx; x < rx + 9; x++) {
      const u = (x - rx) / 8;
      let c = u < .3 ? C.s3 : u < .7 ? C.s2 : C.s1;
      if (y === ry - 5 || y === ry - 2) c = C.s1;
      t.pt(x, y, c); if (y >= 0 && y < 60) CIELM[y * W + x] = 0;
    }
    t.hl(rx - 1, rx + 9, ry - 9, C.s4);
    t.pt(rx + 2, ry + 1, C.s1); t.pt(rx + 6, ry + 1, C.s1);
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
// Les cages : un cadre de bois laqué rouge, plancher peint bleu bandeau (3)
// et orange Naruto (5), une plaque de bandeau frontal au dos.
// ---------------------------------------------------------------------------
function poutreH(t, xa, xb, y0) {
  const R = [C.l3, C.l2, C.l2, C.l1, C.l0];
  for (let x = xa; x <= xb; x++) for (let k = 0; k < 5; k++) t.pt(x, y0 + k, (x === xa || x === xb) ? C.k : R[k]);
  for (const x of [xa, xb]) for (let k = 0; k < 5; k++) { t.pt(x + (x === xa ? 1 : -1), y0 + k, C.k); }
  for (let x = xa - 1; x <= xb + 1; x++) { t.teinte(x, y0 + 5, PAL, C.g0, .45); t.teinte(x, y0 + 6, PAL, C.g0, .2); }
}
function poutreV(t, x0, ya, yb) {
  const R = [C.l0, C.l2, C.l3, C.l2, C.l1];
  for (let y = ya; y <= yb; y++) for (let k = 0; k < 5; k++) t.pt(x0 + k, y, R[k]);
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
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 12; x <= cx + 12; x++) {
    const bord = Math.abs(x - cx) === 12 || Math.abs(y - cy) === 6;
    let c = bord ? C.s1 : x - cx + y - cy < -8 ? C.s4 : y > cy + 3 ? C.s2 : C.s3;
    t.pt(x, y, c);
  }
  // La Feuille gravée, en petit.
  t.sprite(FEUILLE_GRAVEE, cx - 4, cy - 4);
  t.pt(cx - 12, cy - 6, C.s2); t.pt(cx + 12, cy - 6, C.s2);
}
function peindreCage(t, cote) {
  const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, x1 = x0 + BUT.prof - 1;
  for (let y = BUT.haut; y < BUT.bas; y++) {
    const r = y - BUT.haut, j = r % 8;
    const z = ZONES.find(zz => y < CY + zz.to);
    for (let x = x0; x <= x1; x++) {
      if (j === 7) { t.pt(x, y, z.points === 5 ? C.o1 : C.u1); continue; }
      const ton = j === 0 ? 0 : j >= 5 ? 2 : 1;
      let c = z.points === 5 ? [C.o3, C.o2, C.o1][ton] : [C.u3, C.u2, C.u1][ton];
      if (ton === 1 && bruit(x * .2 + r, j, 31) > .8) c = z.points === 5 ? C.o1 : C.u1;
      t.pt(x, y, c);
    }
  }
  for (const yz of [CY - 26, CY + 26]) { t.hl(x0, x1, yz - 1, C.l1); t.hl(x0, x1, yz, C.l0); t.hl(x0, x1, yz + 1, C.l2); }
  for (const z of ZONES) {
    const s = CHIFFRE[z.points];
    t.sprite(s, Math.round(x0 + BUT.prof / 2 - s.l / 2), Math.round(CY + (z.from + z.to) / 2 - s.h / 2), MIROIR);
  }
  const dos = cote === 1 ? x0 - 5 : x1 + 1;
  poutreV(t, dos, BUT.haut - 5, BUT.bas + 4);
  poutreH(t, Math.min(x0, dos) - 2, Math.max(x1, dos + 4) + 2, BUT.haut - 5);
  poutreH(t, Math.min(x0, dos) - 2, Math.max(x1, dos + 4) + 2, BUT.bas);
  plaque(t, cote === 1 ? x0 + 4 : x1 - 4, BUT.haut - 14);
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
// L'échoppe Ichiraku : auvent, rideaux, comptoir, tabourets.
function ichiraku(t) {
  const x0 = 2, x1 = 66;
  ombreSol(t, 34, 548, 34, 5, .5);
  // Fond sombre de l'échoppe et comptoir.
  for (let y = 456; y < 500; y++) for (let x = x0 + 2; x <= x1 - 2; x++) t.pt(x, y, y < 470 ? C.b0 : C.b1);
  for (let x = 10; x < 58; x += 12) for (let y = 488; y < 498; y++) t.pt(x, y, y < 490 ? C.m3 : C.b2);
  for (let y = 500; y < 540; y++) for (let x = x0; x <= x1; x++) {
    let c = y < 503 ? (y === 500 ? C.b5 : C.b4) : (x - x0) % 8 === 0 ? C.b2 : C.b3;
    if (y > 536) c = C.b1;
    t.pt(x, y, c);
  }
  // Tabourets.
  for (const x of [12, 30, 48]) {
    for (let y = 540; y < 552; y++) { t.pt(x + 3, y, C.b1); t.pt(x + 4, y, C.b2); }
    balayerEllipse(x + 3.5, 539, 5, 2, (y, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, y, y < 539 ? C.l3 : C.l1); });
  }
  // Auvent de bois et toit de tuiles.
  for (let y = 436; y < 456; y++) {
    const a = x0 - 2 - Math.round((y - 436) * .15), b = x1 + 2 + Math.round((y - 436) * .15);
    for (let x = a; x <= b; x++) {
      let c = (y - 436) % 4 === 3 ? C.d0 : (x + (y >> 2)) % 5 === 0 ? C.d1 : C.d2;
      if (y > 452) c = y === 455 ? C.b0 : C.b2;
      t.pt(x, y, c);
    }
  }
  // Les noren : quatre pans de tissu clair, bord bas rouge, signes au pinceau.
  for (let p = 0; p < 4; p++) {
    const px = x0 + 3 + p * 16;
    for (let y = 456; y < 478; y++) for (let x = px; x < px + 14; x++) {
      let c = y > 473 ? C.l2 : x === px ? C.m1 : C.m4;
      t.pt(x, y, c);
    }
    const sx = px + 5;
    t.vl(sx, 460, 468, C.k); t.hl(sx - 2, sx + 3, 462, C.k); t.pt(sx - 2, 466, C.k); t.pt(sx + 3, 467, C.k);
  }
}
// Le bois de Konoha à droite : un grand arbre et sa balançoire.
function peindreArbre(t) {
  ombreSol(t, 926, 214, 30, 5, .5);
  for (let y = 116; y < 214; y++) {
    const w = 12 + Math.round(lisse(190, 214, y) * 6);
    const x0 = 936 - (w >> 1);
    for (let k = 0; k < w; k++) {
      let c = k < 2 ? C.b1 : k < w * .45 ? C.b3 : k < w * .8 ? C.b2 : C.b1;
      if (bruit(k * .6, y * .12, 41) > .72) c = C.b1;
      t.pt(x0 + k, y, c);
    }
  }
  // La branche où pend la balançoire.
  for (let x = 890; x <= 932; x++) {
    const y = 132 + Math.round((932 - x) * .08);
    t.pt(x, y, C.b3); t.pt(x, y + 1, C.b2); t.pt(x, y + 2, C.b1);
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
  poteaux(t);
  ichiraku(t);
  peindreArbre(t);
  cible(t, 926, 452);
  lanternePierre(t, 928, 548);
  // Un petit rocher et des kunaï d'entraînement oubliés.
  for (const [x, y] of [[8, 420 + 16], [58, 244 - 30]]) void x, void y;
  // En bas : la rue, pavée de terre et de pierres plates.
  // Dalles rectangulaires, joints de terre : un rang tous les 9 px, décalé.
  for (let y = 566; y < H; y++) {
    const r = Math.floor((y - 567) / 9), yr = (y - 567) % 9;
    let bord = -Math.floor(hacher(r, 0, 55) * 20), k = 0;
    const bords = [];
    while (bord < W + 30) { bords.push(bord); bord += 14 + Math.floor(hacher(r, k++, 56) * 14); }
    let j = 0;
    for (let x = 0; x < W; x++) {
      while (j + 1 < bords.length && x >= bords[j + 1]) j++;
      const dx = x - bords[j], larg = bords[j + 1] - bords[j];
      let c;
      if (y < 567 || yr >= 7 || dx < 2) c = hacher(x, y, 57) < .2 ? C.e2 : C.e1;
      else {
        const clair = hacher(r, j, 58) < .35;
        c = yr === 0 || dx === 2 ? C.s3 : yr === 6 || dx === larg - 1 ? C.s1 : C.s2;
        if (c === C.s2 && hacher(x, y, 59) < .06) c = clair ? C.s3 : C.s1;
      }
      t.px[y * W + x] = c;
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
for (const [x, y] of [[4, 214], [64, 212], [20, 430], [66, 470], [892, 430], [956, 250], [900, 470], [956, 520], [150, 83], [520, 82], [830, 82]])
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
  feuillage(t, 918, 108, 44, 32, 70);
  feuillage(t, 30, 92, 34, 14, 72);
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
  const a = Math.sin(temps * 1.05) * .14, px = 909, py = 134, L = 56;
  const ax = Math.sin(a), ay = Math.cos(a);
  const sx = px + ax * L, sy = py + ay * L;
  for (let k = 2; k < 12; k++) t.teinte(Math.round(sx - 10 + k * 2), 214, PAL, C.g0, .35);
  for (const o of [-8, 8]) t.ligne(px + o, py, sx + o, sy, C.m1);
  for (let x = -10; x <= 10; x++) { t.pt(Math.round(sx + x), Math.round(sy), C.b4); t.pt(Math.round(sx + x), Math.round(sy) + 1, C.b2); }
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
    for (let y = 566; y < 600; y++) { t.pt(lx, y, C.b1); t.pt(lx + 1, y, C.b2); }
    t.hl(lx - 6, lx + 7, 566, C.b2);
    const a = Math.sin(temps * .9 + lx) * .12;
    const cx = Math.round(lx + 6 + Math.sin(a) * 8), cy = 574;
    t.ligne(lx + 6, 567, cx, cy - 4, C.k);
    const lueur = .5 + Math.sin(temps * 1.3 + lx) * .08;
    for (let y = cy - 14; y <= cy + 14; y++) for (let x = cx - 14; x <= cx + 14; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.2);
      if (d < 14) t.teinte(x, y, PAL, C.y1, lueur * .45 * (1 - d / 14));
    }
    balayerEllipse(cx, cy + 1, 4, 5, (y, a0, b0) => { for (let x = a0; x <= b0; x++) t.pt(x, y, (y - cy) % 3 === 0 ? C.l1 : x < cx ? C.l3 : C.l2); });
    t.hl(cx - 2, cx + 2, cy - 4, C.k); t.hl(cx - 2, cx + 2, cy + 6, C.k);
  }
}
function vapeur(t, temps) {
  for (let i = 0; i < 3; i++) {
    const q = (temps * .35 + i / 3) % 1;
    const x = Math.round(22 + i * 12 + Math.sin(temps * 1.1 + i * 2) * 2 * q), y = Math.round(486 - q * 20);
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
    const x = Math.round(918 + Math.cos(a) * r * 38), y = Math.round(104 + Math.sin(a) * r * 26);
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
