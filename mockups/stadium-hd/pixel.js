// ---------------------------------------------------------------------------
// LE SWAG FRISBEE STADIUM EN PIXEL ART HD.
//
// Même technique que la Station orbitale retenue (station-hd.reglages.json) :
// un pixel de décor = un pixel du jeu, palette en rampes, trame de Bayer.
//
// Ce qui ne bouge pas d'un pixel, parce que le jeu en dépend (data/maps.js,
// game/zones.js) : cages de 210, volets 3/5/3 à ±30 et ±105, demi-cercles de
// dunk de 60 devant chaque cage, paniers de rayon 22 à 108 px du fond et
// 62 px du haut, cercles bonus de 30. Le reste est du décor : parquet en
// vraies lattes, reflets des projecteurs dans le vernis, public en pixels,
// écran géant et bandeaux à LED.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, hacher, lisse, balayerDisque, spriteDe, spriteChiffre } from '../_pixelart.js';
import { W, H, COURT, CX, CY } from '../_terrain-hd.js';

export const BUT = { haut: CY - 105, bas: CY + 105, prof: 48 };
export const ZONES = [
  { from: -105, to: -30, points: 3 },
  { from: -30, to: 30, points: 5 },
  { from: 30, to: 105, points: 3 }
];
export const DUNK = { r: 60, x: [COURT.left + 48, COURT.right - 48] };
export const PANIER = { r: 22, pts: [[COURT.left + 108, COURT.top + 62], [COURT.right - 108, COURT.top + 62]] };
export const CERCLE = { r: 30 };
// Tracé de basket, comme drawCourtStade : touche en retrait de 6, raquettes
// de 108 × 136, arcs à trois points de 168.
const T = { l: COURT.left + 6, r: COURT.right - 6, t: COURT.top + 6, b: COURT.bottom - 6 };
const RAQ = { l: 108, h: 136 };
const ECRAN = { x: CX - 118, y: 50, l: 236, h: 28 };
const HAUT_TRIB = COURT.top - 8, BAS_TRIB = COURT.bottom + 8;
const LED_HAUT = { y: 63, h: 13 }, LED_BAS = { y: 566, h: 12 };

const PAL = new Palette({
  // Parquet
  w0: '#3a200c', w1: '#5e3517', w2: '#8a5226', w3: '#b06c32', w4: '#c9843f', w5: '#d99a53', w6: '#e6ae68', w7: '#f0c585', w8: '#f8dcaa', w9: '#fff0d6',
  // Bord de terrain, bois teinté sombre
  a0: '#140c08', a1: '#22150c', a2: '#321f12', a3: '#45301c',
  // Peinture bleue des raquettes et des volets
  b0: '#0c1c4a', b1: '#14307a', b2: '#1e45a8', b3: '#2f6bff', b4: '#5a8cff', b5: '#9ab8ff',
  // Or
  o1: '#5a3a08', o2: '#94620e', o3: '#d0961a', o4: '#ffcc3a', o5: '#ffeaa0',
  // Lignes blanches
  l0: '#b8ab98', l1: '#ddd3c4', l2: '#f4efe6', l3: '#ffffff',
  // Anneau orange
  q0: '#5a2006', q1: '#a0400c', q2: '#e0661a', q3: '#ff8c1f', q4: '#ffb866',
  // Métal chromé
  m0: '#0b0d12', m1: '#151922', m2: '#20252f', m3: '#2c323e', m4: '#3b4250', m5: '#505867', m6: '#6b7483', m7: '#8b94a6', m8: '#b4bcc9', m9: '#e2e6ec',
  // Cercles bonus
  v1: '#1a5a32', v2: '#2ea85a', v3: '#5df08a', v4: '#b8ffd0',
  // Tribunes
  s0: '#07080c', s1: '#0d0f16', s2: '#141824', s3: '#1c2130', s4: '#262c3e', s5: '#333a50',
  // LED
  e0: '#1a0608', e1: '#ff5340', e2: '#ffd23e', e3: '#35e0ff', e4: '#ffffff',
  // Panneau du panier
  p1: '#c8ced8', p2: '#f2f4f8', p3: '#e5384f'
});
const C = PAL.c;
const BOIS = PAL.sous(['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9']);
const BORD = PAL.sous(['a0', 'a1', 'a2', 'a3', 'w1']);
const BLEU = PAL.sous(['b0', 'b1', 'b2', 'b3', 'b4', 'b5']);
const DORE = PAL.sous(['w3', 'w4', 'w5', 'w6', 'w7', 'o3', 'o4', 'o5']);

// Couleurs du public, reprises du thème (data/maps.js, crowdColors).
const MAILLOTS = ['#ff5340', '#35e0ff', '#ffd23e', '#5df08a', '#ff8c1f', '#d9b8f5', '#f2f4f8', '#2f6bff'];
const PEAUX = ['#f2c9a0', '#d9a070', '#a8683c', '#6a4024'];
const CHEVEUX = ['#1a1410', '#3a2616', '#7a4a22', '#d8b060', '#c8c8d0', '#1a1410'];

function hexa(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const assombrir = (hex, k) => { const [r, g, b] = hexa(hex); return PAL.proche(r * k, g * k, b * k); };
const nuance = (hex, k) => { const [r, g, b] = hexa(hex); return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join(''); };

// ---------------------------------------------------------------------------
// Le parquet
// ---------------------------------------------------------------------------
// Projecteurs de la salle, dont le vernis renvoie le reflet.
const REFLETS = [];
for (const y of [178, 466]) for (const x of [214, 382, 578, 746]) REFLETS.push([x, y]);
function lumiereSalle(x, y) {
  const dx = x - CX, dy = y - CY;
  let l = 26 * Math.exp(-(dx * dx) / (2 * 330 * 330) - (dy * dy) / (2 * 230 * 230)) - 10;
  for (const [rx, ry] of REFLETS) {
    const ex = (x - rx) / 30, ey = (y - ry) / 12;
    l += 62 * Math.exp(-(ex * ex + ey * ey) / 2);
  }
  return l;
}
// Une latte : 8 px de large, 110 à 190 de long, joints décalés d'un rang à
// l'autre. Renvoie la teinte propre de la latte et si le pixel est un joint.
function latte(x, y) {
  const rang = Math.floor((y - COURT.top) / 8);
  const long = 110 + Math.floor(hacher(rang, 0, 3) * 80);
  const dec = Math.floor(hacher(rang, 1, 3) * long);
  const seg = Math.floor((x + dec) / long);
  const joint = (x + dec) % long === 0;
  const bordRang = (y - COURT.top) % 8 === 7;
  return { teinte: (hacher(rang, seg, 4) - .5) * 22, joint, bordRang, rang };
}
function couleurBois(x, y) {
  const l = latte(x, y);
  const grain = (fbm(x * .06, y * .9 + l.rang * 17, 3, 5) - .5) * 26;
  const k = 1 + (l.teinte + grain) / 120;
  const lum = lumiereSalle(x, y);
  return [217 * k + lum, 154 * k + lum * .85, 83 * k + lum * .55, l];
}

function dansRaquette(x, y) {
  return y >= CY - RAQ.h / 2 && y < CY + RAQ.h / 2 && ((x >= T.l && x < T.l + RAQ.l) || (x >= T.r - RAQ.l && x < T.r));
}
function dansDunk(x, y) {
  for (let i = 0; i < 2; i++) {
    const dx = x + .5 - DUNK.x[i], dy = y + .5 - CY;
    if ((i === 0 ? dx >= 0 : dx <= 0) && dx * dx + dy * dy <= DUNK.r * DUNK.r) return true;
  }
  return false;
}

// Le marquage : une liste de pixels [index, rôle], rôle 0 = cœur, 1 = bord.
function marquage() {
  const m = new Map();
  const pose = (x, y, role) => {
    if (x < COURT.left || x >= COURT.right || y < COURT.top || y >= COURT.bottom) return;
    const i = y * W + x;
    if (!m.has(i) || m.get(i) > role) m.set(i, role);
  };
  const trait = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pose(x, y, 0);
  };
  // Touche (3 px) et médiane.
  trait(T.l - 1, T.t - 1, T.r + 1, T.t + 1); trait(T.l - 1, T.b - 1, T.r + 1, T.b + 1);
  trait(T.l - 1, T.t - 1, T.l + 1, T.b + 1); trait(T.r - 1, T.t - 1, T.r + 1, T.b + 1);
  trait(CX - 1, COURT.top, CX + 1, COURT.bottom - 1);
  // Raquettes.
  for (const x0 of [T.l, T.r - RAQ.l]) {
    trait(x0, CY - RAQ.h / 2 - 1, x0 + RAQ.l, CY - RAQ.h / 2 + 1);
    trait(x0, CY + RAQ.h / 2 - 1, x0 + RAQ.l, CY + RAQ.h / 2 + 1);
    const xv = x0 === T.l ? x0 + RAQ.l : x0;
    trait(xv - 1, CY - RAQ.h / 2, xv + 1, CY + RAQ.h / 2);
  }
  // Cercles : rond central, petit rond, arcs à 3 points.
  const anneau = (cx, cy, r, garder) => {
    for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      const d = Math.hypot(x + .5 - cx, y + .5 - cy);
      if (Math.abs(d - r) < 1.5 && (!garder || garder(x, y))) pose(x, y, Math.abs(d - r) < .9 ? 0 : 1);
    }
  };
  anneau(CX, CY, 62); anneau(CX, CY, 14);
  anneau(T.l, CY, 168, x => x >= T.l); anneau(T.r, CY, 168, x => x <= T.r);
  return m;
}
function marquageDunk() {
  const m = [];
  for (let i = 0; i < 2; i++) {
    const cx = DUNK.x[i];
    for (let y = CY - DUNK.r - 2; y <= CY + DUNK.r + 2; y++) for (let x = cx - DUNK.r - 2; x <= cx + DUNK.r + 2; x++) {
      const dx = x + .5 - cx, dy = y + .5 - CY;
      if (i === 0 ? dx < 0 : dx > 0) continue;
      const d = Math.hypot(dx, dy);
      if (Math.abs(d - DUNK.r) < 1.5) m.push(y * W + x, Math.abs(d - DUNK.r) < .9 ? 0 : 1);
    }
  }
  return m;
}

// Le logo peint au centre : la police 3×5, en gros.
const POLICE = {
  S: '011100010001110', W: '1000110001101011010101010', A: '010101111101101', G: '011100101101011',
  F: '111100110100100', R: '110101110101101', I: '111010010010111', B: '110101110101110',
  E: '111100110100111', C: '011100100100011', L: '100100100100111', U: '101101101101111',
  D: '110101101101110', T: '111010010010010', M: '101111111101101', Y: '101101010010010',
  K: '101101110101101', P: '110101110100100', O: '010101101101010', N: '110101101101101',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001',
  5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010', 9: '010101011001110',
  '-': '000000111000000', '·': '000000010000000', ' ': '000000000000000', 'À': '010101111101101', '!': '010010010000010'
};
function glyphes(texte, f) {
  let x = 0;
  for (const ch of texte) {
    const g = POLICE[ch] || POLICE[' '];
    // Le W a droit à cinq colonnes : sur trois, il se lit comme un H.
    const l = g.length / 5;
    for (let i = 0; i < g.length; i++) if (g[i] === '1') f(x + (i % l), (i / l) | 0);
    x += l + 1;
  }
  return x - 1;
}

// ---------------------------------------------------------------------------
// Le public
// ---------------------------------------------------------------------------
function spectateur(face, maillot, peau, cheveux, lum) {
  const m = assombrir(maillot, lum), mc = assombrir(nuance(maillot, 1.15), lum), mf = assombrir(nuance(maillot, .7), lum);
  const p = assombrir(peau, lum), pf = assombrir(nuance(peau, .78), lum), ch = assombrir(cheveux, lum);
  const yeux = PAL.proche(20, 16, 14);
  const lignes = face ? [
    '..hhhh..', '.hpppph.', '.pypyp..', '..pppq..', '.mmmmmm.', 'cmmmmmmf', 'cmmmmmmf', 'pmmmmmmq', '.mmmmmm.'
  ] : [
    '..hhhh..', '.hhhhhh.', '.hhhhhh.', '..qqqq..', '.cmmmmf.', 'cmmmmmmf', 'cmmmmmmf'
  ];
  lignes[2] = face ? '.pypyp..'.replace(/p/g, 'p') : lignes[2];
  return spriteDe(lignes, { h: ch, p, q: pf, y: yeux, m, c: mc, f: mf });
}
function semerPublic(y0, rangs, pas, face) {
  const gens = [];
  for (let r = 0; r < rangs; r++) {
    const lum = face ? .45 + r * .13 : .62 - r * .1;
    for (let x = 2 + (r % 2) * 5; x < W - 6; x += 10) {
      const hsh = hacher(x, r, 21);
      if (hsh < .07) continue;
      const s = spectateur(face,
        MAILLOTS[(hacher(x, r, 22) * MAILLOTS.length) | 0],
        PEAUX[(hacher(x, r, 23) * PEAUX.length) | 0],
        CHEVEUX[(hacher(x, r, 24) * CHEVEUX.length) | 0], lum);
      gens.push({ s, x: x + Math.round((hacher(x, r, 25) - .5) * 2), y: y0 + r * pas, r, ph: hacher(x, r, 26) * 6.3, face, lum,
        bras: assombrir(PEAUX[(hacher(x, r, 23) * PEAUX.length) | 0], lum) });
    }
  }
  return gens;
}

// ---------------------------------------------------------------------------
// Le fond fixe
// ---------------------------------------------------------------------------
let FOND = null, LIGNES = null, LIGNES_DUNK = null, PUBLIC_HAUT = null, PUBLIC_BAS = null;
const CHIFFRE_BLANC = { 3: spriteChiffre(3, C.l3, C.l2, C.l1, C.b0), 5: spriteChiffre(5, C.l3, C.l2, C.l1, C.o1) };
const CHIFFRE_PANIER = spriteChiffre(5, C.q4, C.q3, C.q2, C.q0);

function peindreFond() {
  const t = new Toile(W, H);
  // Tribunes : marches qui s'éclaircissent vers le parquet.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y < HAUT_TRIB) {
      const r = Math.floor((y - 2) / 12), k = (y - 2) % 12;
      t.px[i] = k === 11 ? C.s5 : k === 10 ? C.s0 : k < 3 ? C.s3 : r < 2 ? C.s1 : C.s2;
    } else if (y >= BAS_TRIB) {
      const k = (y - BAS_TRIB) % 11;
      t.px[i] = k === 0 ? C.s4 : k < 3 ? C.s3 : C.s1;
    } else if (x < COURT.left || x >= COURT.right || y < COURT.top || y >= COURT.bottom) {
      // Bord de terrain : les mêmes lattes, teintées sombre.
      const l = latte(x, y);
      const g = (fbm(x * .06, y * .9 + l.rang * 17, 3, 5) - .5) * 10;
      const v = 40 + l.teinte * .6 + g;
      t.px[i] = l.joint ? C.a0 : BORD.tramer(v, v * .66, v * .4, x, y, 2);
    } else {
      const [r, g, b, l] = couleurBois(x, y);
      let c;
      if (dansRaquette(x, y)) {
        const k = (r + g + b) / 3 / 150;
        c = BLEU.tramer(47 * k * .9, 107 * k * .9, 255 * k * .9, x, y, 2);
      } else if (dansDunk(x, y)) c = DORE.tramer(r * .72 + 72, g * .72 + 60, b * .72 + 18, x, y, 2);
      else c = BOIS.tramer(r, g, b, x, y, 2.2);
      if (l.joint) c = PAL.teinter(c, C.w0, .6, x, y);
      else if (l.bordRang) c = PAL.teinter(c, C.w1, .3, x, y);
      t.px[i] = c;
    }
  }
  // Logo peint au centre, en bois foncé.
  const logo = (texte, echelle, yc) => {
    const larg = glyphes(texte, () => {}) * echelle;
    const x0 = Math.round(CX - larg / 2);
    glyphes(texte, (gx, gy) => {
      for (let j = 0; j < echelle; j++) for (let i = 0; i < echelle; i++)
        t.modifier(x0 + gx * echelle + i, yc + gy * echelle + j, (c, x, y) => PAL.teinter(c, C.w1, .5, x, y));
    });
  };
  logo('SWAG FRISBEE', 4, CY - 34);
  logo('CLUB', 4, CY + 8);

  // Bandeaux publicitaires : caissons noirs, LED posées à chaque image.
  for (const b of [LED_HAUT, LED_BAS]) {
    t.rect(0, b.y, W, b.h, C.s0);
    t.hl(0, W - 1, b.y, C.m5); t.hl(0, W - 1, b.y + b.h - 1, C.m1);
  }
  // Écran géant : cadre de métal, câbles qui le suspendent.
  const E = ECRAN;
  for (const x of [E.x + 30, E.x + E.l - 30]) for (let y = 0; y < E.y; y++) t.pt(x, y, y % 3 ? C.m4 : C.m6);
  t.rect(E.x - 3, E.y - 3, E.l + 6, E.h + 6, C.m0);
  t.rect(E.x - 2, E.y - 2, E.l + 4, E.h + 4, C.m5);
  t.hl(E.x - 2, E.x + E.l + 1, E.y - 2, C.m8);
  t.rect(E.x, E.y, E.l, E.h, C.s0);

  // Cages : cadre chromé, volets rembourrés, chiffres.
  for (const cote of [1, 2]) {
    const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right;
    for (const z of ZONES) {
      const y1 = CY + z.from, y2 = CY + z.to, or = z.points >= 5;
      for (let y = y1; y < y2; y++) for (let x = gx; x < gx + BUT.prof; x++) {
        const bord = y === y1 || y === y2 - 1;
        const cote2 = (x - gx) % 12;
        const [r, g, b] = or ? [255, 204, 58] : [47, 107, 255];
        const k = bord ? .45 : cote2 === 0 ? .6 : cote2 === 1 ? 1.05 : .85 - ((y - y1) / (y2 - y1)) * .12;
        t.px[y * W + x] = (or ? DORE : BLEU).tramer(r * k, g * k, b * k, x, y, 2);
      }
      const s = CHIFFRE_BLANC[z.points];
      t.sprite(s, Math.round(gx + BUT.prof / 2 - s.l / 2), Math.round(CY + (z.from + z.to) / 2 - s.h / 2));
    }
    // Cadre chromé, 4 px, éclairé par le haut.
    for (let k = 0; k < 4; k++) {
      const c = [C.m9, C.m7, C.m5, C.m2][k];
      t.hl(gx - 4 + k, gx + BUT.prof + 3 - k, BUT.haut - 4 + k, k === 0 ? C.m0 : c);
      t.hl(gx - 4 + k, gx + BUT.prof + 3 - k, BUT.bas + 3 - k, [C.m0, C.m4, C.m5, C.m6][k]);
      t.vl(gx - 4 + k, BUT.haut - 4 + k, BUT.bas + 3 - k, [C.m0, C.m7, C.m6, C.m4][k]);
      t.vl(gx + BUT.prof + 3 - k, BUT.haut - 4 + k, BUT.bas + 3 - k, [C.m0, C.m6, C.m5, C.m3][k]);
    }
  }
  // Paniers : ombre au sol d'abord, puis poteau, planche, anneau et filet.
  for (let i = 0; i < 2; i++) panier(t, i);
  LIGNES = marquage();
  LIGNES_DUNK = marquageDunk();
  PUBLIC_HAUT = semerPublic(2, 5, 12, true);
  PUBLIC_BAS = semerPublic(BAS_TRIB + 10, 2, 11, false);
  FOND = t;
}

function panier(t, i) {
  const [cx, cy] = PANIER.pts[i], s = i === 0 ? 1 : -1;
  const bordX = i === 0 ? COURT.left : COURT.right - 1;
  // Ombre portée : décalée vers le bas, la salle est éclairée d'en haut.
  const ombre = (x, y) => t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.w0, .32, xx, yy));
  for (let y = cy - 14; y < cy + 26; y++) for (let x = cx - 26; x <= cx + 26; x++) {
    const d = Math.hypot((x - cx - 8 * s) / 1, (y - cy - 34) / .55);
    if (d > PANIER.r - 3 && d < PANIER.r + 1) ombre(x, y);
  }
  for (let y = cy - 44 + 40; y < cy - 10 + 40; y++) for (let x = Math.min(cx - 28 * s, cx + 24 * s); x <= Math.max(cx - 28 * s, cx + 24 * s); x++) {
    if ((x + y) & 1) ombre(x + 10 * s, y);
  }
  // Poteau : il part du bord du terrain le plus proche, sur son socle rembourré.
  const socle = [bordX - 8 * s, cy + 22];
  for (let y = socle[1]; y < socle[1] + 16; y++) for (let x = Math.min(socle[0], socle[0] + 16 * s); x <= Math.max(socle[0], socle[0] + 16 * s); x++) {
    const k = y - socle[1];
    t.pt(x, y, k === 0 ? C.b5 : k === 15 ? C.b0 : k < 4 ? C.b4 : C.b2);
  }
  for (let y = cy - 34; y < cy + 26; y++) {
    t.pt(bordX - 1 * s, y, C.m0); t.pt(bordX, y, C.m8); t.pt(bordX + s, y, C.m6); t.pt(bordX + 2 * s, y, C.m4); t.pt(bordX + 3 * s, y, C.m0);
  }
  for (let x = Math.min(bordX, cx - 26 * s); x <= Math.max(bordX, cx - 26 * s); x++) {
    t.pt(x, cy - 36, C.m0); t.pt(x, cy - 35, C.m8); t.pt(x, cy - 34, C.m6); t.pt(x, cy - 33, C.m4); t.pt(x, cy - 32, C.m0);
  }
  t.ligne(bordX + 2 * s, cy - 12, cx - 28 * s, cy - 30, C.m6);
  t.ligne(bordX + 2 * s, cy - 11, cx - 28 * s, cy - 29, C.m3);
  // Planche.
  const px0 = Math.min(cx - 28 * s, cx + 24 * s);
  for (let y = cy - 44; y < cy - 10; y++) for (let x = px0; x < px0 + 52; x++) {
    const bx = x - px0, by = y - (cy - 44);
    let c = C.p2;
    if (bx === 0 || by === 0 || bx === 51 || by === 33) c = C.m1;
    else if (bx < 3 || by < 3 || bx > 48 || by > 30) c = by > 30 || bx > 48 ? C.p1 : C.l3;
    else if (by > 22) c = (x + y) & 1 ? C.p2 : C.p1;
    t.pt(x, y, c);
  }
  const rx0 = px0 + 14 + (i === 0 ? 0 : 0), ry0 = cy - 32;
  for (let k = 0; k < 2; k++) {
    t.hl(rx0 + k, rx0 + 23 - k, ry0 + k, C.p3); t.hl(rx0 + k, rx0 + 23 - k, ry0 + 15 - k, C.p3);
    t.vl(rx0 + k, ry0 + k, ry0 + 15 - k, C.p3); t.vl(rx0 + 23 - k, ry0 + k, ry0 + 15 - k, C.p3);
  }
  // Filet : mailles en losange sous l'anneau.
  for (let y = cy + 6; y < cy + PANIER.r + 16; y++) {
    const k = (y - cy - 6) / (PANIER.r + 10), larg = PANIER.r * (1 - k * .45);
    for (let x = Math.round(cx - larg); x <= Math.round(cx + larg); x++) {
      if (((x - cx + y) & 3) === 0 || ((x - cx - y) & 3) === 0) t.pt(x, y, k > .7 ? C.l1 : C.l2);
    }
  }
  // Fond de l'anneau, un voile orange.
  balayerDisque(cx, cy, PANIER.r - 2, (y, a, b) => { for (let x = a; x <= b; x++) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.q3, .22, xx, yy)); });
  t.sprite(CHIFFRE_PANIER, cx - 6, cy - 8);
}

// ---------------------------------------------------------------------------
// Ce qui bouge
// ---------------------------------------------------------------------------
const TEXTE_BAS = 'SWAG FRISBEE CLUB · PREMIER À 35 · YUKI · STADIUM · ';
const TEXTE_HAUT = 'SWAG FRISBEE STADIUM · ALL STAR · ';
function bandeau(t, b, texte, temps, vitesse, couleurs) {
  const larg = (glyphes(texte, () => {}) + 1) * 2;
  const dec = Math.floor(temps * vitesse) % larg;
  const y0 = b.y + Math.floor((b.h - 10) / 2);
  for (let rep = -1; rep * larg < W + larg; rep++) {
    const x0 = rep * larg - dec;
    let n = 0;
    glyphes(texte, (gx, gy) => {
      const x = x0 + gx * 2, y = y0 + gy * 2;
      if (x < -2 || x > W) return;
      const c = couleurs[Math.floor((x0 + gx * 2 + dec) / 64) % couleurs.length];
      t.pt(x, y, c); t.pt(x + 1, y, c); t.pt(x, y + 1, c); t.pt(x + 1, y + 1, C.e0);
      n++;
    });
  }
}

export function creerPixel() {
  if (!FOND) peindreFond();
  const t = new Toile(W, H);
  const cible = document.createElement('canvas');
  cible.width = W; cible.height = H;
  const g = cible.getContext('2d');

  function image(temps, but) {
    t.copier(FOND);
    const leve = Math.min(1, but * 1.5);

    // Public : il sautille, se lève et lève les bras au but.
    for (const p of [...PUBLIC_HAUT, ...PUBLIC_BAS]) {
      const saut = Math.sin(temps * 3 + p.ph) > .55 ? 1 : 0;
      const dy = -saut - Math.round(leve * 3);
      t.sprite(p.s, p.x, p.y + dy);
      if (p.face && (leve > .25 || Math.sin(temps * .9 + p.ph * 3) > .97)) {
        t.vl(p.x, p.y + dy - 3, p.y + dy + 4, p.bras); t.vl(p.x + 7, p.y + dy - 3, p.y + dy + 4, p.bras);
      }
    }
    // Flashs d'appareils photo dans la foule.
    const nf = but > .02 ? 9 : 2;
    for (let i = 0; i < nf; i++) {
      const n = Math.floor(temps * 4) * 13 + i * 7;
      if (hacher(n, i, 40) > .5) continue;
      const x = Math.floor(hacher(n, i, 41) * W), y = 6 + Math.floor(hacher(n, i, 42) * 52);
      t.pt(x, y, C.l3); t.pt(x - 1, y, C.l1); t.pt(x + 1, y, C.l1); t.pt(x, y - 1, C.l1); t.pt(x, y + 1, C.l1);
    }

    // Bandeaux à LED et écran géant.
    bandeau(t, LED_HAUT, TEXTE_HAUT, temps, 38, [C.e2, C.e3, C.e1]);
    bandeau(t, LED_BAS, TEXTE_BAS, temps, 52, [C.e1, C.e2, C.e3, C.e4]);
    const E = ECRAN;
    t.rect(E.x, E.y, E.l, E.h, C.s0);
    const score = Math.floor(temps / 4) % 2 === 1;
    const msg = but > .02 ? 'BUT !' : score ? 'YUKI 12 - 9 YUKI' : 'SWAG FRISBEE STADIUM';
    const lm = glyphes(msg, () => {}) * 2;
    const coulMsg = but > .02 ? (Math.sin(temps * 30) > 0 ? C.e2 : C.e1) : Math.sin(temps * 2.4) > -.3 ? C.e3 : C.b2;
    glyphes(msg, (gx, gy) => {
      const x = Math.round(CX - lm / 2) + gx * 2, y = E.y + 9 + gy * 2;
      t.pt(x, y, coulMsg); t.pt(x + 1, y, coulMsg); t.pt(x, y + 1, coulMsg);
    });
    for (let i = 0; i < 7; i++) {
      const x = E.x + 6 + Math.floor((temps * 60 + i * 34) % (E.l - 12));
      t.hl(x, x + 2, E.y + 2, C.e2); t.hl(x, x + 2, E.y + E.h - 3, C.e2);
    }
    const cad = .5 + Math.sin(temps * 3) * .5;
    for (let x = E.x - 1; x <= E.x + E.l; x++) { t.pt(x, E.y - 1, cad > .5 ? C.e3 : C.b2); t.pt(x, E.y + E.h, cad > .5 ? C.e3 : C.b2); }

    // Marquage, avec le reflet des projecteurs qui le fait briller.
    for (const [i, role] of LIGNES) {
      const x = i % W, y = (i / W) | 0;
      const l = lumiereSalle(x, y);
      t.px[i] = role ? (l > 20 ? C.l2 : C.l1) : (l > 30 ? C.l3 : C.l2);
    }
    for (let k = 0; k < LIGNES_DUNK.length; k += 2) t.px[LIGNES_DUNK[k]] = LIGNES_DUNK[k + 1] ? C.o3 : C.o4;

    // Anneaux des paniers, qui respirent.
    const pulse = .55 + Math.sin(temps * 3) * .2;
    for (const [cx, cy] of PANIER.pts) {
      for (let y = cy - PANIER.r - 3; y <= cy + PANIER.r + 3; y++) for (let x = cx - PANIER.r - 3; x <= cx + PANIER.r + 3; x++) {
        const d = Math.hypot(x + .5 - cx, y + .5 - cy);
        if (d < PANIER.r - 2 || d > PANIER.r + 2) continue;
        const haut = y < cy - 4 && x < cx + 6;
        let c = d > PANIER.r + 1 ? C.q0 : d < PANIER.r - 1 ? C.q1 : haut ? (pulse > .6 ? C.q4 : C.q3) : C.q2;
        t.pt(x, y, c);
      }
    }

    // Un cercle bonus qui apparaît, dure trois secondes, disparaît.
    const cyc = 5.5, n = Math.floor(temps / cyc), ct = temps % cyc;
    if (ct < 3) {
      const cx = COURT.left + 150 + Math.floor(hacher(n, 1, 60) * (COURT.right - COURT.left - 300));
      const cy = COURT.top + 60 + Math.floor(hacher(n, 2, 60) * (COURT.bottom - COURT.top - 120));
      const k = Math.min(1, ct / .25) * Math.min(1, (3 - ct) / .5);
      const r = CERCLE.r * (1 + Math.sin(temps * 6) * .06);
      for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
        const d = Math.hypot(x + .5 - cx, y + .5 - cy);
        if (d < r - 1.5) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.v3, .26 * k, xx, yy));
        else if (d < r + 1.5 && ((x * 7 + y * 3) % 16) / 16 < k * 1.1) t.pt(x, y, d < r - .3 ? C.v4 : d < r + .6 ? C.v3 : C.v2);
      }
      if (k > .5) glyphes('+1', (gx, gy) => {
        const x = cx - 7 + gx * 2, y = cy - 5 + gy * 2;
        t.pt(x, y, C.v4); t.pt(x + 1, y, C.v3); t.pt(x, y + 1, C.v3); t.pt(x + 1, y + 1, C.v2);
      });
    }

    // Flash de but sur les cages.
    if (but > .02) for (const cote of [1, 2]) {
      const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = gx; x < gx + BUT.prof; x++)
        t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.l3, but * .55, xx, yy));
    }

    t.peindre(g);
    return cible;
  }
  return { image };
}
