// ---------------------------------------------------------------------------
// LE PÔLE NORD EN PIXEL ART HD.
//
// Même technique que la Station orbitale retenue, et les mêmes pièces que la
// finition choisie sur mockups/pole-nord-final.html : glace givrée, marquage
// creusé, cages en sucre d'orge, sapins décorés, aurore en vague, flocons
// étoilés, lutins, lampions. Pas de règle propre : c'est un terrain de décor.
//
// Ce que la finition « nuit profonde » avait réglé est gardé : le rouge et le
// blanc rayés n'existent qu'aux cages, le pourtour est éteint et seule l'aire
// de jeu est éclairée, les halos des lampions ne débordent jamais sur la
// glace, où le disque doit rester lisible.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, hacher, lisse, balayerDisque, balayerPoly, spriteDe, spriteChiffre } from '../_pixelart.js';
import { W, H, COURT, CX, CY } from '../_terrain-hd.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3, c: [229, 56, 79] },
  { from: -26, to: 26, points: 5, c: [245, 197, 66] },
  { from: 26, to: 100, points: 3, c: [229, 56, 79] }
];
const HORIZON = COURT.top - 2;

const PAL = new Palette({
  // Ciel de nuit, étoiles
  n0: '#01030a', n1: '#050b18', n2: '#0a1428', n3: '#12233f', n4: '#1b2c4a',
  s1: '#4a5678', s2: '#a8b8d8', s3: '#ffffff',
  // Aurore
  u1: '#0c3326', u2: '#16583e', u3: '#2c9464', u4: '#5df08a', u5: '#b8ffd8', k1: '#0e2e44', k2: '#1d5a7a', k3: '#35a8d0',
  // Neige de nuit, hors terrain
  d0: '#060b14', d1: '#0c1526', d2: '#142038', d3: '#1e2e4c', d4: '#2c4064', d5: '#3e5680', d6: '#5a74a0',
  // Glace
  i0: '#5a6f92', i1: '#8aa0c0', i2: '#a6b8d4', i3: '#b8c8de', i4: '#c8d6e8', i5: '#d6e2f0', i6: '#e6eef8', i7: '#f6f9fd', i8: '#ffffff',
  w1: '#d8d2c6', w2: '#e8e0d0', w3: '#f4ecdc',
  // Sapins, troncs
  f0: '#03110b', f1: '#082419', f2: '#0f3525', f3: '#185035', f4: '#236645', f5: '#3a8a5c', t1: '#2a180c', t2: '#5e3a20',
  // Or, rouge, lumière chaude des lampions
  o2: '#9a6a14', o3: '#d0961a', o4: '#f5c542', o5: '#ffe9a8',
  r1: '#5a1420', r2: '#8f2436', r3: '#e5384f', r4: '#ff8a96',
  h1: '#4a2a12', h2: '#8a5020', h3: '#d88a38', h4: '#ffb457', h5: '#ffe0a8',
  // Lutins
  l1: '#0f3f28', l2: '#175c3a', l3: '#2a8a58', e1: '#6a2030', e2: '#8f2436', e3: '#c83a4c', p1: '#9a7c64', p2: '#d8b498',
  // Sucre d'orge, intérieur des cages
  b1: '#b8c0cc', b2: '#fdfdfd', x0: '#03070e', x1: '#050c16', x2: '#0d1a2c',
  bois: '#3a2a1c'
});
const C = PAL.c;
const CIEL = PAL.sous(['n0', 'n1', 'n2', 'n3', 'n4']);
const NEIGE = PAL.sous(['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6']);
const CAGE = PAL.sous(['x0', 'x1', 'x2', 'r1', 'r2', 'r3', 'o2', 'o3', 'o4', 'e1', 'h1', 'h2']);
const GLACE = PAL.sous(['i0', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'w1', 'w2', 'w3']);
const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;

// Marquage : touche en retrait de 6, médiane, ronds de 58 et 13.
function distMarquage(x, y) {
  const L = COURT.left + 6, R = COURT.right - 6, T = COURT.top + 6, B = COURT.bottom - 6;
  let d = Infinity;
  if (y >= T && y <= B) d = Math.min(d, Math.abs(x - L), Math.abs(x - R), Math.abs(x - CX));
  if (x >= L && x <= R) d = Math.min(d, Math.abs(y - T), Math.abs(y - B));
  const r = Math.hypot(x - CX, y - CY);
  return Math.min(d, Math.abs(r - 58), Math.abs(r - 13));
}

// Les piquets des lampions, comme lampionsEtVignetteNoel.
const PIQUETS = [];
for (let x = 46; x < W; x += 118) { PIQUETS.push([x, COURT.top - 6]); PIQUETS.push([x, H - 10]); }
PIQUETS.push([26, BUT.haut - 16], [26, BUT.bas + 58], [W - 26, BUT.haut - 16], [W - 26, BUT.bas + 58]);

// Sapins et lutins, semés comme semerNoel.
const SAPINS = [], LUTINS = [];
for (let x = 6; x < W; x += 44) SAPINS.push({ x, y: COURT.top - 2, h: 58 + hacher(x, 0, 5) * 18 });
const devantCage = y => y > BUT.haut - 12 && y < BUT.bas + 60;
for (let y = COURT.top + 34; y < COURT.bottom - 10; y += 62) {
  if (devantCage(y)) continue;
  SAPINS.push({ x: 30, y, h: 38 + hacher(y, 1, 5) * 18 });
  SAPINS.push({ x: W - 30, y, h: 38 + hacher(y, 2, 5) * 18 });
}
for (let x = 26; x < W; x += 66) SAPINS.push({ x, y: H - 4, h: 38 + hacher(x, 3, 5) * 18 });
SAPINS.sort((a, b) => a.y - b.y);
for (let x = 10; x < W; x += 17) LUTINS.push({ x, y: COURT.top - 3, i: LUTINS.length });
for (let x = 8; x < W; x += 21) LUTINS.push({ x, y: H - 5, i: LUTINS.length });
for (let y = COURT.top + 22; y < COURT.bottom; y += 27) {
  if (y > BUT.haut - 8 && y < BUT.bas + 30) continue;
  LUTINS.push({ x: 24 + Math.round(hacher(y, 4, 5) * 22), y, i: LUTINS.length });
  LUTINS.push({ x: W - 24 - Math.round(hacher(y, 5, 5) * 22), y, i: LUTINS.length });
}

const LUTIN = [0, 1].map(v => spriteDe([
  '...o....',
  '...hh...',
  '..hhh...',
  '..hhhh..',
  '.HHHHHH.',
  '..ssss..',
  '..sksk..',
  '..ssss..',
  '.bbbbbb.',
  'sbbBbbbs',
  'sbbBbbbs',
  '.bbBbbb.',
  '.cc..cc.',
  '.kk..kk.'
], v ? { o: C.o4, h: C.e3, H: C.b2, s: C.p2, k: C.x1, b: C.l2, B: C.l3, c: C.l1 }
     : { o: C.o4, h: C.l3, H: C.b2, s: C.p2, k: C.x1, b: C.e2, B: C.e3, c: C.e1 }));

const FLOCON = [
  spriteDe(['..a..', 'a.a.a', '.aaa.', 'a.a.a', '..a..'], { a: C.i8 }),
  spriteDe(['...a...', '.a.a.a.', '..aaa..', 'aaa.aaa', '..aaa..', '.a.a.a.', '...a...'], { a: C.i7 }),
  spriteDe(['a...a', '.a.a.', '..a..', '.a.a.', 'a...a'], { a: C.i6 })
];

function sapin(t, x, y, h, masque) {
  // Tronc, puis trois étages dentelés, clairs à gauche (la lune), neige en bord.
  for (let k = 0; k < Math.round(h * .16); k++) { t.pt(x - 1, y - k, C.t1); t.pt(x, y - k, C.t2); t.pt(x + 1, y - k, C.t1); }
  const l = h * .42;
  for (let e = 0; e < 3; e++) {
    const bas = Math.round(y - h * (.12 + e * .27)), haut = Math.round(y - h * (.46 + e * .27)), larg = l * (1 - e * .26);
    for (let yy = haut; yy <= bas; yy++) {
      const k = (yy - haut) / (bas - haut);
      const demi = Math.round(larg * k + (hacher(x + e, yy, 6) > .6 ? 1 : 0));
      for (let xx = x - demi; xx <= x + demi; xx++) {
        const bord = xx === x - demi || xx === x + demi;
        const gauche = xx < x - demi * .2;
        let c = bord ? C.f0 : gauche ? (k < .5 ? C.f4 : C.f3) : (k < .5 ? C.f2 : C.f1);
        if (yy === bas && !bord) c = hacher(xx, yy, 7) > .45 ? C.i5 : C.i3;
        else if (yy === bas - 1 && !bord && hacher(xx, yy, 7) > .7) c = C.i4;
        t.pt(xx, yy, c);
        if (masque) masque[yy * W + xx] = 0;
      }
    }
  }
  const top = Math.round(y - h * .94);
  t.pt(x, top - 1, C.o5); t.pt(x - 1, top, C.o4); t.pt(x, top, C.o5); t.pt(x + 1, top, C.o4); t.pt(x, top + 1, C.o3);
}

let FOND = null, MASQUE_CIEL = null, CHIFFRES = null;
function peindreFond() {
  const t = new Toile(W, H);
  MASQUE_CIEL = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y < HORIZON) {
      const k = y / HORIZON;
      t.px[i] = CIEL.tramer(3 + k * 14, 7 + k * 24, 18 + k * 42, x, y, 1.8);
      MASQUE_CIEL[i] = 1;
    } else if (dansTerrain(x, y)) {
      // Glace : bleutée aux bords, réchauffée au centre par la lumière,
      // veinée d'un bruit très doux.
      const dx = (x - CX) / 430, dy = (y - CY) / 260, d = Math.sqrt(dx * dx + dy * dy);
      const n = (fbm(x * .02, y * .03, 3, 11) - .5) * 14;
      const chaud = Math.exp(-d * d * 2.2);
      let r = 196 + n - d * 26, g = 212 + n - d * 22, b = 232 + n - d * 14;
      r += chaud * 30; g += chaud * 18; b -= chaud * 4;
      const m = distMarquage(x + .5, y + .5);
      // Le marquage est dégagé du givre : la glace y est plus nette.
      if (m < 9) { r += 10 * (1 - m / 9); g += 8 * (1 - m / 9); b += 6 * (1 - m / 9); }
      t.px[i] = GLACE.tramer(r, g, b, x, y, 2);
    } else {
      // Neige de nuit : congères au clair de lune, éteintes vers le bas.
      const k = (y - HORIZON) / (H - HORIZON);
      const n = fbm(x * .015, y * .03, 4, 21);
      const crete = lisse(.55, .7, n) - lisse(.7, .9, n) * .5;
      const v = 22 + crete * 40 - k * 10;
      t.px[i] = NEIGE.tramer(v * .75, v * .95, v * 1.6, x, y, 2);
    }
  }
  // Givre en fougères, rare et grand, loin des lignes.
  for (let i = 0; i < 12; i++) {
    const x = COURT.left + 20 + hacher(i, 1, 30) * (COURT.right - COURT.left - 40);
    const y = COURT.top + 20 + hacher(i, 2, 30) * (COURT.bottom - COURT.top - 40);
    const br = 5 + Math.floor(hacher(i, 3, 30) * 3), R = 22 + hacher(i, 4, 30) * 22;
    for (let b = 0; b < br; b++) {
      const a = b / br * Math.PI * 2 + hacher(i, 5, 30) * 3;
      const f = (c, xx, yy) => distMarquage(xx, yy) < 9 ? c : PAL.teinter(c, C.i8, .75, xx, yy);
      t.ligne(x, y, x + Math.cos(a) * R, y + Math.sin(a) * R, 0, f);
      for (const k of [.35, .55, .75]) {
        const mx = x + Math.cos(a) * R * k, my = y + Math.sin(a) * R * k, rr = R * .26 * (1.1 - k);
        t.ligne(mx, my, mx + Math.cos(a + .9) * rr, my + Math.sin(a + .9) * rr, 0, f);
        t.ligne(mx, my, mx + Math.cos(a - .9) * rr, my + Math.sin(a - .9) * rr, 0, f);
      }
    }
  }
  // Rayures de patins.
  for (let i = 0; i < 16; i++) {
    let x = COURT.left + 30 + hacher(i, 1, 40) * 760, y = COURT.top + 30 + hacher(i, 2, 40) * 420;
    let a = hacher(i, 3, 40) * Math.PI * 2;
    for (let s = 0; s < 90; s++) {
      a += (hacher(i, 4, 40) - .5) * .05;
      x += Math.cos(a); y += Math.sin(a);
      if (dansTerrain(x | 0, y | 0) && s % 7 !== 6) t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.i8, .5, xx, yy));
    }
  }
  // Marquage creusé : sillon bleu sombre, lèvre blanche décalée de 2 px.
  for (let y = COURT.top; y < COURT.bottom; y++) for (let x = COURT.left; x < COURT.right; x++) {
    const m = distMarquage(x + .5, y + .5);
    if (m < 3.5) t.px[y * W + x] = m < 1.2 ? C.i0 : m < 2.4 ? C.i1 : PAL.teinter(t.px[y * W + x], C.i1, .5, x, y);
    const m2 = distMarquage(x + .5, y - 2 + .5);
    if (m2 < 1.2) t.px[y * W + x] = C.i8;
  }
  // Intérieur des cages : sombre, volets teintés, chiffres blancs.
  CHIFFRES = { 3: spriteChiffre(3, C.i8, C.i7, C.i5, C.r1), 5: spriteChiffre(5, C.i8, C.i7, C.i5, C.o2) };
  for (const cote of [1, 2]) {
    const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right;
    for (const z of ZONES) {
      for (let y = CY + z.from; y < CY + z.to; y++) for (let x = gx; x < gx + BUT.prof; x++) {
        const k = .42 + ((x - gx) % 8 === 0 ? -.1 : 0);
        t.px[y * W + x] = CAGE.tramer(5 + z.c[0] * k, 10 + z.c[1] * k, 18 + z.c[2] * k, x, y, 2);
      }
      const s = CHIFFRES[z.points];
      t.sprite(s, Math.round(gx + BUT.prof / 2 - s.l / 2), Math.round(CY + (z.from + z.to) / 2 - s.h / 2));
    }
  }
  // Sapins (le masque du ciel perd leurs pixels : l'aurore passera derrière).
  for (const s of SAPINS) sapin(t, s.x, s.y, Math.round(s.h), MASQUE_CIEL);
  // Piquets des lampions.
  for (const [x, y] of PIQUETS) {
    t.rect(x - 1, y - 26, 3, 26, C.bois); t.pt(x - 1, y - 26, C.h2);
    t.rect(x - 7, y - 42, 14, 3, C.bois);
    for (const [px, py] of [[x, y]]) for (let k = 0; k < 26; k++) if (MASQUE_CIEL[(py - k) * W + px]) { MASQUE_CIEL[(py - k) * W + px] = 0; MASQUE_CIEL[(py - k) * W + px - 1] = 0; MASQUE_CIEL[(py - k) * W + px + 1] = 0; }
  }
  FOND = t;
}

export function creerPixel() {
  if (!FOND) peindreFond();
  const t = new Toile(W, H);
  const cible = document.createElement('canvas');
  cible.width = W; cible.height = H;
  const g = cible.getContext('2d');

  function image(temps, but) {
    t.copier(FOND);
    // Étoiles et aurore, sur le ciel resté visible entre les sapins.
    for (let i = 0; i < 110; i++) {
      const x = Math.floor(hacher(i, 1, 60) * W), y = Math.floor(hacher(i, 2, 60) * (HORIZON - 6));
      if (!MASQUE_CIEL[y * W + x]) continue;
      const v = Math.abs(Math.sin(temps * (.6 + hacher(i, 3, 60)) + i));
      t.pt(x, y, v > .75 ? C.s3 : v > .35 ? C.s2 : C.s1);
    }
    const nappe = (y0, haut, amp, vit, ramp, fort) => {
      for (let x = 0; x < W; x++) {
        const bord = y0 + Math.sin(x / 150 + temps * vit) * amp + Math.sin(x / 47 - temps * vit * 1.7) * 3;
        // Rayons verticaux : le grain de l'aurore.
        const rayon = .65 + .35 * Math.sin(x * .9 + Math.sin(x * .13 + temps) * 3);
        for (let y = Math.max(0, Math.floor(bord - haut)); y < Math.min(HORIZON, bord + haut * .4); y++) {
          const i = y * W + x;
          if (!MASQUE_CIEL[i]) continue;
          const u = y < bord ? 1 - (bord - y) / haut : 1 - (y - bord) / (haut * .4);
          const k = u * u * fort * rayon;
          if (k <= .04) continue;
          const c = k > .75 ? ramp[3] : k > .5 ? ramp[2] : k > .25 ? ramp[1] : ramp[0];
          t.px[i] = PAL.teinter(t.px[i], c, Math.min(1, k * 1.4), x, y);
        }
      }
    };
    nappe(HORIZON * .62, 40, 11, .35, [C.u1, C.u2, C.u3, C.u4], .95);
    nappe(HORIZON * .42, 30, 14, .5, [C.k1, C.k2, C.k3, C.k3], .45);

    // Guirlandes des sapins.
    const boules = [C.o4, C.r3, C.o5];
    SAPINS.forEach((s, i) => {
      for (let b = 0; b < 5; b++) {
        const x = Math.round(s.x + Math.sin(b * 2.1 + i) * s.h * .16), y = Math.round(s.y - s.h * .18 - b * s.h * .15);
        const v = .55 + Math.sin(temps * 3 + i + b) * .4;
        const c = boules[(b + i) % 3];
        t.pt(x, y, v > .5 ? c : C.f1);
        if (v > .8) { t.pt(x - 1, y, c); t.pt(x + 1, y, c); t.pt(x, y - 1, c); t.pt(x, y + 1, c); }
      }
    });

    // Lampions : lumière qui vacille, halo chaud sur la neige, jamais sur la glace.
    PIQUETS.forEach(([x, y], i) => {
      const v = .62 + Math.sin(temps * 2.2 + i) * .3;
      // Le halo n'éclaire que la neige au pied du piquet : posé sur les
      // sapins, il les piquetait de brun.
      for (let yy = y - 30; yy < y + 8; yy++) for (let xx = x - 30; xx <= x + 30; xx++) {
        if (dansTerrain(xx, yy) || yy < HORIZON || yy >= H || xx < 0 || xx >= W) continue;
        const d = Math.hypot(xx - x, (yy - y + 4) * 1.6);
        if (d < 28) t.px[yy * W + xx] = PAL.teinter(t.px[yy * W + xx], C.h4, .2 * v * (1 - d / 28), xx, yy);
      }
      balayerPoly([[x - 6, y - 39], [x + 6, y - 39], [x + 4, y - 26], [x - 4, y - 26]], (yy, a, b) => {
        for (let xx = a; xx <= b; xx++) t.pt(xx, yy, xx === a || xx === b ? C.bois : v > .7 ? C.h5 : v > .45 ? C.h4 : C.h3);
      });
      t.hl(x - 4, x + 4, y - 26, C.bois);
    });

    // Lutins qui sautillent, plus fort au but.
    for (const l of LUTINS) {
      const saut = Math.round(Math.abs(Math.sin(temps * 4 + l.i * 1.7)) * 3 * (1 + but * 1.8));
      t.sprite(LUTIN[l.i % 2], l.x - 4, l.y - 14 - saut);
    }

    // Cages en sucre d'orge : barres rayées qui défilent.
    for (const cote of [1, 2]) {
      const s = cote === 1 ? 1 : -1, x0 = cote === 1 ? COURT.left : COURT.right;
      const barre = (xa, ya, xb, yb, ep, sens) => {
        for (let y = Math.min(ya, yb) - ep / 2; y < Math.max(ya, yb) + ep / 2; y++) for (let x = Math.min(xa, xb); x <= Math.max(xa, xb) + (xa === xb ? ep - 1 : 0); x++) {
          const xx = xa === xb ? Math.round(xa - ep / 2 + (x - Math.min(xa, xb))) : x, yy = Math.round(y);
          const rel = xa === xb ? (xx - (xa - ep / 2)) / ep : (yy - (Math.min(ya, yb) - ep / 2)) / ep;
          const raie = Math.floor((xx + yy + sens * temps * 18) / 12) % 2 === 0;
          let c = raie ? C.r3 : C.b2;
          if (rel < .18) c = raie ? C.r4 : C.b2;
          else if (rel > .78) c = raie ? C.r2 : C.b1;
          if (rel < .07 || rel > .93) c = C.x0;
          t.pt(xx, yy, c);
        }
      };
      const xFond = x0 - s * (BUT.prof + 10);
      barre(Math.min(x0 + 2 * s, xFond), BUT.haut, Math.max(x0 + 2 * s, xFond), BUT.haut, 16, -s);
      barre(Math.min(x0 + 2 * s, xFond), BUT.bas, Math.max(x0 + 2 * s, xFond), BUT.bas, 16, -s);
      barre(xFond, BUT.haut, xFond, BUT.bas, 14, s);
      if (but > .02) for (let y = BUT.haut + 8; y < BUT.bas - 8; y++) for (let x = Math.min(x0, xFond + 7 * s); x < Math.max(x0, xFond + 7 * s); x++)
        t.modifier(x, y, (c, xx, yy) => PAL.teinter(c, C.o5, but * .55, xx, yy));
    }

    // Flocons étoilés qui tombent.
    for (let i = 0; i < 26; i++) {
      const v = 20 + hacher(i, 1, 70) * 18;
      const x = Math.round((hacher(i, 2, 70) * W + Math.sin(temps * .6 + i) * 14 + W) % W);
      const y = Math.round((hacher(i, 3, 70) * H + temps * v) % H);
      const f = FLOCON[(i + Math.floor(temps * 2 + i)) % 3];
      t.sprite(f, x - (f.l >> 1), y - (f.h >> 1));
    }

    t.peindre(g);
    return cible;
  }
  return { image };
}
