// ---------------------------------------------------------------------------
// NAMEK EN PIXEL ART HD.
//
// Un plateau rocheux de la planète Namek, sous son ciel vert et ses trois
// soleils. En haut, au centre, le vaisseau de Freezer est posé sur ses pieds,
// hublots allumés, rampe ouverte ; autour, les pitons rocheux coiffés
// d'herbe, les arbres Ajissa en boules bleu-vert, la mer au loin. Le terrain
// est une dalle de roche claire, fendillée, marquée de quelques cratères ; au
// centre, un cratère d'impact.
//
// Les cages sont propres à Namek : trois socles de pierre portant chacun une
// boule de cristal — la boule à 3 étoiles pour les zones à 3, celle à 5
// étoiles pour la zone à 5 — dans un cadre blanc et arrondi comme les maisons
// namekiennes. Une barrière de ki crépite à l'embouchure.
//
// Sur les bords : une maison-dôme namekienne, une capsule saïyenne écrasée
// dans son cratère, une grenouille sur un rocher, un détecteur tombé ; en bas,
// la prairie bleu-vert et le radar à Dragon Balls qui clignote.
//
// Pas de règle de jeu : c'est un décor.
// ---------------------------------------------------------------------------
import { Toile, Palette, fbm, bruit, hacher, lisse, balayerDisque, balayerEllipse, balayerPoly, spriteChiffre } from '../pixelart.js';
import { W, H, COURT, CX, CY } from './commun.js';

export const BUT = { haut: CY - 100, bas: CY + 100, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];
const ANNEAU = 62;
const HORIZON = 58;
const VAISSEAU = { x: 480, y: 38, rx: 86, ry: 33 };
const SOLEILS = [[300, 14, 9], [640, 10, 6], [686, 22, 5]];

const PAL = new Palette({
  // Ciel vert de Namek
  k0: '#3f9a86', k1: '#5cb296', k2: '#7fc8a0', k3: '#a6dcae', k4: '#cfeebe', k5: '#f0f8d8',
  // Herbe bleu-vert
  g0: '#173e36', g1: '#245e4c', g2: '#34805e', g3: '#4a9e6c', g4: '#66ba7a', g5: '#92d48e',
  // Roche claire, un peu verte
  // Roche beige du plateau, un peu verte
  n0: '#7e7a5e', n1: '#a09c78', n2: '#bab690', n3: '#cecaa4', n4: '#e0dcba', n5: '#eeecd4',
  r0: '#343844', r1: '#565c66', r2: '#7c8286', r3: '#a2a8a2', r4: '#c2c6b8', r5: '#dcdecc', r6: '#eeefe2',
  // Mer
  w0: '#17525e', w1: '#26808a', w2: '#44aca8', w3: '#80d4c4', w4: '#c4eee0',
  // Arbres Ajissa, troncs
  a0: '#173e50', a1: '#26627a', a2: '#3a8a90', a3: '#5eb0a2', a4: '#96d4bc',
  t1: '#5e5040', t2: '#8e7a5e',
  // Vaisseau de Freezer
  s0: '#34344a', s1: '#62627c', s2: '#9494ac', s3: '#c2c2d4', s4: '#e4e4ee', s5: '#ffffff',
  // Hublots et lueurs
  y1: '#c0661a', y2: '#ec9c2e', y3: '#ffcc5c', y4: '#fff2ac',
  // Boules de cristal et étoiles
  d1: '#a23c0e', d2: '#dc6c16', d3: '#f69c2e', d4: '#ffd68c', x1: '#b0121c', x2: '#e42e26',
  // Maisons namekiennes
  h1: '#aebcba', h2: '#d6e0dc', h3: '#f2f8f4',
  // Ki
  e1: '#e8c83c', e2: '#fff07c', e3: '#ffffdc',
  // Violet (capsule, détecteur)
  p1: '#54267a', p2: '#8646ae', p3: '#bc8ede',
  // Grenouille
  f1: '#3a6a1e', f2: '#6aa02e', f3: '#a8d04e',
  k: '#12181c'
});
const C = PAL.c;
const CIEL = PAL.sous(['k0', 'k1', 'k2', 'k3', 'k4', 'k5']);
const HERBE = PAL.sous(['g0', 'g1', 'g2', 'g3', 'g4', 'g5']);
const ROCHE = PAL.sous(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
const PLATEAU = PAL.sous(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
const MER = PAL.sous(['w0', 'w1', 'w2', 'w3', 'w4']);
const COQUE = PAL.sous(['s0', 's1', 's2', 's3', 's4', 's5']);
const AJISSA = PAL.sous(['a0', 'a1', 'a2', 'a3', 'a4']);

const dansTerrain = (x, y) => x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
const dansCage = (x, y) => y >= BUT.haut - 10 && y < BUT.bas + 10 && (x < COURT.left + 3 || x >= COURT.right - 3);

let MIROIR = false;
const FONDS = [null, null];
let FOND = null;
let CIELM = null;
const CHIFFRE = { 3: spriteChiffre(3, C.h3, C.h2, C.h1, C.k), 5: spriteChiffre(5, C.h3, C.h2, C.h1, C.k) };

function ombre(t, cx, cy, rx, ry, k) {
  balayerEllipse(cx, cy, rx, ry, (y, a, b) => { for (let x = a; x <= b; x++) t.teinte(x, y, PAL, C.k, k * (1 - (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) * .5)); });
}
// Une étoile rouge à cinq branches, pour les Dragon Balls.
function etoile(t, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  balayerPoly(pts, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, x < cx ? C.x2 : C.x1); });
}
// Une Dragon Ball : sphère orangée, reflet, et n étoiles rouges.
function dragonBall(t, cx, cy, r, n) {
  balayerDisque(cx, cy, r, (y, a, b) => { for (let x = a; x <= b; x++) {
    const d = Math.hypot(x - cx, y - cy) / r, l = (x - cx) + (y - cy);
    let c = d > .9 ? C.d1 : l < -r * .7 ? C.d4 : l < 0 ? C.d3 : l < r * .7 ? C.d2 : C.d1;
    t.pt(x, y, c);
  } });
  const pos = n === 3 ? [[0, -.38], [-.36, .26], [.36, .26]] : [[0, -.45], [-.43, -.12], [.43, -.12], [-.27, .4], [.27, .4]];
  for (const [ux, uy] of pos) etoile(t, cx + ux * r, cy + uy * r, r * (n === 3 ? .3 : .24));
  t.pt(cx - Math.round(r * .5), cy - Math.round(r * .55), C.w || C.e3); t.pt(cx - Math.round(r * .5) + 1, cy - Math.round(r * .55), C.e3);
}

// ---------------------------------------------------------------------------
// Le haut : ciel vert, trois soleils, mer, pitons, arbres, vaisseau
// ---------------------------------------------------------------------------
function peindreCiel(t) {
  for (let y = 0; y < HORIZON; y++) for (let x = 0; x < W; x++) {
    const k = y / HORIZON;
    let r = 70 + k * 150, g = 158 + k * 84, b = 134 + k * 70;
    for (const [sx, sy, sr] of SOLEILS) { const d = Math.hypot(x - sx, y - sy), h = Math.exp(-d * d / (2 * (sr * 6) ** 2)); r += 50 * h; g += 44 * h; b += 20 * h; }
    t.px[y * W + x] = CIEL.tramer(r, g, b, x, y, 1.8);
    CIELM[y * W + x] = 1;
  }
  for (const [sx, sy, sr] of SOLEILS) balayerDisque(sx, sy, sr, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, Math.hypot(x - sx, y - sy) > sr - 1.2 ? C.e2 : C.e3); });
  // La mer au loin, et ses îlots.
  for (let y = HORIZON; y < 84; y++) for (let x = 0; x < W; x++) {
    const k = (y - HORIZON) / 26;
    const l = Math.sin((y - HORIZON) * 1.3 + fbm(x * .03, y * .2, 2, 5) * 4) * 8;
    t.px[y * W + x] = MER.tramer(120 + k * 20 + l, 196 + k * 16 + l, 190 + k * 10 + l, x, y, 1.8);
  }
}
// Pitons rocheux à sommet plat, coiffés d'herbe, qui s'évasent en champignon.
function piton(t, x, sommet, base, larg) {
  for (let y = sommet; y < base; y++) {
    const k = (y - sommet) / (base - sommet);
    const demi = larg * (k < .12 ? 1.15 - k : .85 + k * .45) + Math.sin(y * .7) * .6;
    for (let xx = Math.round(x - demi); xx <= x + demi; xx++) {
      const u = (xx - x) / demi;
      let c = u < -.5 ? C.r4 : u < .2 ? C.r3 : u < .7 ? C.r2 : C.r1;
      if ((y + Math.round(xx * .3)) % 7 === 0) c = u < 0 ? C.r3 : C.r1;
      t.pt(xx, y, c); if (y < HORIZON) CIELM[y * W + xx] = 0;
    }
  }
  for (let xx = Math.round(x - larg * 1.15); xx <= x + larg * 1.15; xx++) for (let k = 0; k < 3; k++) {
    const y = sommet - k + (Math.abs(xx - x) > larg ? 1 : 0);
    t.pt(xx, y, k === 2 ? C.g5 : k === 1 ? C.g4 : C.g3); if (y >= 0 && y < HORIZON) CIELM[y * W + xx] = 0;
  }
}
// Arbre Ajissa : tronc fin, boules bleu-vert empilées.
function ajissa(t, x, yb, h, r) {
  for (let y = yb - h; y <= yb; y++) { t.pt(x, y, C.t2); t.pt(x + 1, y, C.t1); if (y < HORIZON) { CIELM[y * W + x] = 0; CIELM[y * W + x + 1] = 0; } }
  for (const [dx, dy, rr] of [[0, -h, r], [-r * .7, -h + r * .5, r * .7], [r * .7, -h + r * .5, r * .7]]) {
    const cx = Math.round(x + dx), cy = Math.round(yb + dy);
    balayerDisque(cx, cy, rr, (y, a, b) => { for (let xx = a; xx <= b; xx++) {
      const l = 140 - (y - cy) / rr * 50 - (xx - cx) / rr * 20 + (hacher(xx >> 1, y >> 1, 9) - .5) * 30;
      t.px[y * W + xx] = AJISSA.tramer(l * .45, l * .95, l, xx, y, 2);
      if (y >= 0 && y < HORIZON) CIELM[y * W + xx] = 0;
    } });
  }
}
function paysage(t) {
  for (const [x, s, b, l] of [[258, 8, 80, 12], [296, 22, 80, 9], [338, 30, 80, 7], [620, 26, 80, 8], [664, 6, 80, 13], [708, 18, 80, 10], [150, 30, 80, 10], [820, 24, 80, 11]]) piton(t, x, s, b, l);
  // Rivage et herbe au pied du vaisseau.
  for (let x = 0; x < W; x++) {
    const top = Math.round(74 + Math.sin(x * .02) * 2 + fbm(x * .05, 3, 2, 7) * 3);
    for (let y = top; y < 84; y++) t.pt(x, y, y === top ? C.g4 : HERBE.tramer(90 - (y - top) * 3, 170 - (y - top) * 4, 120, x, y, 2));
  }
  for (const [x, h, r] of [[222, 20, 6], [372, 16, 5], [396, 22, 6], [582, 18, 5], [742, 20, 6], [770, 14, 4], [120, 16, 5], [860, 18, 5]]) ajissa(t, x, 80, h, r);
  // Maisons-dômes namekiennes au loin.
  for (const [x, r] of [[190, 7], [204, 5], [780, 6], [796, 8]]) {
    balayerEllipse(x, 78, r, r * .85, (y, a, b) => { for (let xx = a; xx <= b; xx++) if (y <= 78) t.pt(xx, y, xx < x - r * .3 ? C.h3 : xx < x + r * .4 ? C.h2 : C.h1); });
    t.pt(x - 2, 76, C.k); t.pt(x + 2, 76, C.k);
  }
}
function vaisseau(t) {
  const { x, y, rx, ry } = VAISSEAU;
  // Pieds, posés sur la rive.
  for (const dx of [-64, -28, 28, 64]) { t.ligne(x + dx * .7, y + 12, x + dx, 80, C.s1); t.ligne(x + dx * .7 + 1, y + 12, x + dx + 1, 80, C.s0); t.hl(x + dx - 3, x + dx + 4, 81, C.s1); }
  // Coque : une sphère aplatie, éclairée par les soleils du haut à gauche.
  balayerEllipse(x, y, rx, ry, (yy, a, b) => { for (let xx = a; xx <= b; xx++) {
    const u = (xx - x) / rx, v = (yy - y) / ry, d = u * u + v * v;
    let l = 225 - u * 40 - v * 50 - d * 30;
    if (u < -.2 && v < -.2 && u + v > -1.25) l += 18;
    t.px[yy * W + xx] = COQUE.tramer(l, l, l * 1.06, xx, yy, 2.4);
    if (yy < HORIZON) CIELM[yy * W + xx] = 0;
  } });
  // Dôme supérieur et arête de la ceinture.
  balayerEllipse(x, y - ry + 6, 26, 10, (yy, a, b) => { for (let xx = a; xx <= b; xx++) if (yy < y - ry + 8) { t.pt(xx, yy, xx < x - 6 ? C.s5 : xx < x + 8 ? C.s4 : C.s3); CIELM[yy * W + xx] = 0; } });
  for (let xx = x - rx + 2; xx <= x + rx - 2; xx++) {
    const u = (xx - x) / rx, yy = Math.round(y + 3 + Math.sqrt(1 - u * u) * 2);
    t.pt(xx, yy, C.s1); t.pt(xx, yy + 1, C.s3);
  }
  // La rampe ouverte, lumière qui en sort.
  balayerPoly([[x - 8, y + ry - 6], [x + 8, y + ry - 6], [x + 12, 80], [x - 12, 80]], (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy < y + ry - 3 ? C.y3 : xx === a || xx === b ? C.s1 : C.s3); });
  for (let yy = y + ry - 12; yy < y + ry - 6; yy++) for (let xx = x - 7; xx <= x + 7; xx++) t.pt(xx, yy, C.y2);
}

// ---------------------------------------------------------------------------
// Le plateau : roche claire, fissures, cratères
// ---------------------------------------------------------------------------
const CRATERES = [[230, 160, 14], [700, 470, 17], [760, 150, 10], [200, 480, 11]];
function peindrePlateau(t) {
  for (let y = 84; y < H; y++) for (let x = 0; x < W; x++) {
    if (dansTerrain(x, y)) {
      const h = yy => fbm(x * .008 + 4, yy * .011, 3, 20);
      const pente = (h(y - 3) - h(y + 3)) * 140;
      const n = fbm(x * .03, y * .035, 3, 21);
      // Des strates douces, en longues bandes, plutôt que des taches.
      const strate = Math.sin(y * .045 + fbm(x * .004, y * .01, 2, 27) * 5) * 4;
      const l = 196 + pente + (n - .5) * 6 + strate;
      t.px[y * W + x] = PLATEAU.tramer(l, l * .98, l * .8, x, y, 3.2);
    } else {
      const n = fbm(x * .03, y * .03, 3, 22);
      const l = 110 + (n - .5) * 40;
      t.px[y * W + x] = HERBE.tramer(l * .6, l * 1.45, l * 1.0, x, y, 2);
    }
  }
  // Un bord de dalle : la roche affleure et se découpe sur l'herbe.
  for (let x = COURT.left - 2; x < COURT.right + 2; x++) for (const y of [COURT.top - 1, COURT.bottom]) t.pt(x, y, y < CY ? C.n4 : C.n0);
  // Fissures : un réseau clairsemé, fin.
  for (let i = 0; i < 26; i++) {
    let x = COURT.left + 20 + hacher(i, 1, 23) * 780, y = COURT.top + 20 + hacher(i, 2, 23) * 436, a = hacher(i, 3, 23) * 6.3;
    for (let s = 0; s < 30 + hacher(i, 4, 23) * 40; s++) {
      a += (hacher(i, s, 24) - .5) * .8;
      x += Math.cos(a); y += Math.sin(a);
      if (!dansTerrain(x, y)) break;
      t.pt(Math.round(x), Math.round(y), C.n0); t.teinte(Math.round(x), Math.round(y) + 1, PAL, C.n5, .5);
      if (hacher(i, s, 25) < .04) a += 1.2;
    }
  }
  for (const [cx, cy, r] of CRATERES) cratere(t, cx, cy, r);
  // Touffes d'herbe bleu-vert dans les failles, près des bords.
  for (let i = 0; i < 60; i++) {
    const x = COURT.left + hacher(i, 1, 26) * 820, y = COURT.top + hacher(i, 2, 26) * 476;
    const bord = Math.min(x - COURT.left, COURT.right - x, y - COURT.top, COURT.bottom - y);
    if (bord > 50) continue;
    for (let k = 0; k < 3; k++) t.pt(Math.round(x) + k, Math.round(y) - (k === 1 ? 1 : 0), k === 1 ? C.g4 : C.g3);
  }
}
function cratere(t, cx, cy, r) {
  const ry = r * .62;
  for (let y = Math.floor(cy - ry - 4); y <= cy + ry + 4; y++) for (let x = Math.floor(cx - r - 4); x <= cx + r + 4; x++) {
    const dx = (x - cx) / r, dy = (y - cy) / ry, d = Math.hypot(dx, dy);
    if (d > 1.3) continue;
    if (d > 1) { t.teinte(x, y, PAL, C.n5, .5 * (1.3 - d) / .3); continue; }        // bourrelet
    // Paroi intérieure : à l'ombre en haut à gauche, éclairée en bas à droite.
    const k = d * d, dir = (dx + dy) / Math.max(.001, d);
    t.teinte(x, y, PAL, dir < 0 ? C.n0 : C.n5, (.12 + Math.abs(dir) * .25) * k + .1);
  }
}
function peindreLignes(t) {
  const trait = (x, y) => { x = Math.round(x); y = Math.round(y); const h = hacher(x, y, 30); t.pt(x, y, h < .12 ? C.n4 : C.r6); t.teinte(x, y + 1, PAL, C.n0, .3); };
  const { left: L, right: R, top: T, bottom: B } = COURT;
  for (let x = L; x < R; x++) for (let k = 0; k < 3; k++) { trait(x, T + k); trait(x, B - 1 - k); }
  for (let y = T; y < B; y++) for (let k = 0; k < 3; k++) {
    if (y < BUT.haut || y >= BUT.bas) { trait(L + k, y); trait(R - 1 - k, y); }
    if (Math.abs(y - CY) > ANNEAU) trait(CX - 1 + k, y);
  }
  // Le rond central est la lèvre d'un cratère d'impact : fond creusé, bord
  // soulevé, fissures qui rayonnent.
  for (let y = CY - ANNEAU; y <= CY + ANNEAU; y++) for (let x = CX - ANNEAU; x <= CX + ANNEAU; x++) {
    const dx = (x - CX) / ANNEAU, dy = (y - CY) / ANNEAU, d = Math.hypot(dx, dy);
    if (d >= .97) continue;
    t.teinte(x, y, PAL, C.n1, .1 + lisse(.8, .97, d) * .2 * (dy < 0 ? 1 : .3));
  }
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + .3;
    for (let s = ANNEAU + 2; s < ANNEAU + 16 + (i % 3) * 8; s++) t.pt(Math.round(CX + Math.cos(a + Math.sin(s * .3) * .05) * s), Math.round(CY + Math.sin(a) * s), C.n0);
  }
  for (let a = 0; a < Math.PI * 2; a += .004) for (let k = -1; k <= 1; k++) trait(CX + Math.cos(a) * (ANNEAU + k), CY + Math.sin(a) * (ANNEAU + k));
}

// ---------------------------------------------------------------------------
// Les cages : cadre blanc arrondi à la namekienne, socles de pierre, boules
// de cristal à 3 et 5 étoiles.
// ---------------------------------------------------------------------------
function peindreCage(t, cote) {
  const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, x1 = x0 + BUT.prof - 1;
  for (const z of ZONES) {
    const cinq = z.points === 5, y0 = CY + z.from, y1 = CY + z.to;
    for (let y = y0; y < y1; y++) for (let x = x0; x <= x1; x++) {
      // Fond : l'eau turquoise d'un bassin pour les 3, la lueur dorée des
      // boules pour le 5.
      let c;
      if (cinq) { const d = Math.hypot(x - (x0 + x1) / 2, (y - (y0 + y1) / 2) * 1.3) / 30; c = d < .45 ? C.d4 : d < .75 ? C.d3 : C.d2; }
      else { const o = Math.sin((y - y0) * .5 + Math.sin(x * .3) * 1.2); c = o > .7 ? C.w3 : o > -.4 ? C.w2 : C.w1; }
      t.pt(x, y, c);
    }
    const cx = Math.round((x0 + x1) / 2), hz = y1 - y0;
    const by = Math.round(y0 + hz * (cinq ? .36 : .34)), r = cinq ? 11 : 13;
    // Le socle : un disque de pierre blanche sous la boule.
    balayerEllipse(cx, by + r - 1, r + 3, 4, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, y < by + r - 1 ? C.h3 : C.h1); });
    dragonBall(t, cx, by, r, z.points);
    const s = CHIFFRE[z.points];
    t.sprite(s, Math.round(cx - s.l / 2 + .5), Math.round(y1 - s.h - (cinq ? 2 : 5)), MIROIR);
  }
  for (const yz of [CY - 26, CY + 26]) { t.hl(x0, x1, yz - 1, C.h3); t.hl(x0, x1, yz, C.h1); t.hl(x0, x1, yz + 1, C.h2); }
  // Le cadre blanc, arrondi comme les murs des maisons namekiennes.
  const dos = cote === 1 ? x0 - 7 : x1 + 1;
  const blanc = k => [C.h1, C.h2, C.h3, C.h3, C.h2, C.h1, C.r2][k];
  for (let y = BUT.haut - 7; y <= BUT.bas + 6; y++) for (let k = 0; k < 7; k++) t.pt(dos + k, y, blanc(k));
  for (const y0 of [BUT.haut - 7, BUT.bas]) {
    for (let y = y0; y < y0 + 7; y++) for (let x = Math.min(x0, dos); x <= Math.max(x1, dos + 6); x++) t.pt(x, y, blanc(y - y0));
    for (let x = Math.min(x0, dos) + 4; x < Math.max(x1, dos + 6); x += 9) { t.pt(x, y0 + 3, C.a2); t.pt(x + 1, y0 + 3, C.a1); }
  }
  for (let x = Math.min(x0, dos) - 1; x <= Math.max(x1, dos + 6) + 1; x++) t.teinte(x, BUT.bas + 7, PAL, C.k, .45);
  // Coupoles aux coins, avec leur hublot rond.
  for (const [px, py] of [[cote === 1 ? x1 + 1 : x0 - 1, BUT.haut - 4], [cote === 1 ? x1 + 1 : x0 - 1, BUT.bas + 3], [dos + 3, BUT.haut - 4], [dos + 3, BUT.bas + 3]]) {
    balayerDisque(px, py, 6, (y, a, b) => { for (let x = a; x <= b; x++) { const l = (x - px) + (y - py); t.pt(x, y, Math.hypot(x - px, y - py) > 5.3 ? C.h1 : l < -3 ? C.h3 : l < 3 ? C.h2 : C.h1); } });
    balayerDisque(px, py, 2, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.a1); });
  }
}

// ---------------------------------------------------------------------------
// Les bords
// ---------------------------------------------------------------------------
function maisonDome(t, cx, yb, r) {
  ombre(t, cx + 3, yb + 1, r + 3, 3, .5);
  balayerEllipse(cx, yb, r, r * .9, (y, a, b) => { for (let x = a; x <= b; x++) if (y <= yb) { const l = (x - cx) / r + (y - yb) / r; t.pt(x, y, l < -.9 ? C.h3 : l < -.1 ? C.h2 : C.h1); } });
  for (const [dx, dy] of [[-r * .45, -r * .35], [r * .1, -r * .55], [r * .5, -r * .25]]) balayerDisque(Math.round(cx + dx), Math.round(yb + dy), 2.5, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.k); });
  for (let y = yb - 8; y <= yb; y++) for (let x = cx - 3; x <= cx + 3; x++) t.pt(x, y, y === yb - 8 ? C.h1 : C.k);
  // L'antenne en boule.
  for (let y = Math.round(yb - r * .9 - 8); y < yb - r * .9; y++) t.pt(cx, y, C.h1);
  balayerDisque(cx, Math.round(yb - r * .9 - 9), 2, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.h3); });
}
function capsule(t, cx, cy) {
  cratere(t, cx, cy + 6, 20);
  balayerDisque(cx, cy, 10, (y, a, b) => { for (let x = a; x <= b; x++) { const l = (x - cx) + (y - cy); t.pt(x, y, Math.hypot(x - cx, y - cy) > 9.2 ? C.s1 : l < -6 ? C.s5 : l < 4 ? C.s4 : C.s2); } });
  balayerEllipse(cx - 1, cy - 1, 6, 5, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, (x - cx) + (y - cy) < -5 ? C.p3 : C.p1); });
  // La porte ouverte, rabattue.
  balayerEllipse(cx + 12, cy + 8, 5, 3, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, y < cy + 8 ? C.s4 : C.s2); });
}
function peindreBords(t) {
  // À gauche : maison-dôme, arbres Ajissa ; en bas la capsule dans son cratère.
  maisonDome(t, 34, 170, 24);
  ajissa(t, 10, 214, 26, 8); ajissa(t, 58, 118, 22, 7);
  capsule(t, 32, 492);
  ajissa(t, 58, 552, 24, 7);
  // À droite : un grand arbre Ajissa, un piton, la grenouille sur son rocher,
  // un détecteur tombé.
  ajissa(t, 928, 208, 44, 12);
  ajissa(t, 898, 176, 24, 7);
  for (const [x, y, rx, ry] of [[924, 500, 20, 10], [944, 520, 12, 8]]) {
    ombre(t, x + 2, y + ry, rx, 3, .5);
    balayerEllipse(x, y, rx, ry, (yy, a, b) => { for (let xx = a; xx <= b; xx++) { const v = (yy - y) / ry; t.pt(xx, yy, v < -.4 ? C.r4 : v < .2 ? C.r3 : C.r2); } });
  }
  // Le détecteur : oreillette et lentille verte.
  t.rect(912, 548, 8, 4, C.s3); t.hl(912, 919, 548, C.s4);
  balayerEllipse(924, 548, 5, 3, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.g5); });
  // En bas : la prairie bleu-vert, des rochers, des fleurs.
  for (let i = 0; i < 14; i++) {
    const x = 90 + hacher(i, 1, 40) * 780, y = 572 + hacher(i, 2, 40) * 20, r = 3 + hacher(i, 3, 40) * 5;
    ombre(t, x + 1, y + r * .6, r + 1, 2, .45);
    balayerEllipse(x, y, r, r * .7, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy < y ? C.r4 : C.r2); });
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(hacher(i, 1, 41) * W), y = 90 + Math.floor(hacher(i, 2, 41) * 506);
    if (dansTerrain(x - 3, y) || dansTerrain(x + 3, y) || dansCage(x, y)) continue;
    t.pt(x, y, [C.e2, C.p3, C.h3][i % 3]); t.pt(x, y + 1, C.g2);
  }
  // Une mare en bas, qui renvoie le ciel vert, et de jeunes Ajissa.
  balayerEllipse(230, 588, 42, 8, (y, a, b) => { for (let x = a; x <= b; x++) { const k = (y - 580) / 16; t.pt(x, y, x === a || x === b ? C.g1 : k < .3 ? C.k3 : k < .6 ? C.w3 : C.w2); } });
  for (let i = 0; i < 6; i++) t.hl(200 + i * 11, 204 + i * 11, 585 + (i % 3) * 3, C.k5);
  for (const [x, h, r] of [[120, 14, 4], [330, 12, 4], [470, 16, 5], [760, 13, 4], [860, 15, 5]]) ajissa(t, x, 594, h, r);
  maisonDome(t, 930, 118, 14);
  // Le radar à Dragon Balls, posé dans l'herbe (son écran clignote).
  balayerDisque(610, 584, 7, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, Math.hypot(x - 610, y - 584) > 6 ? C.s1 : C.s4); });
  balayerDisque(610, 584, 4, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.g3); });
  t.rect(609, 575, 3, 3, C.s3);
}

function peindreFond() {
  const t = new Toile(W, H);
  if (!CIELM) CIELM = new Uint8Array(W * HORIZON);
  peindreCiel(t);
  paysage(t);
  vaisseau(t);
  peindrePlateau(t);
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
for (let i = 0; i < 4; i++) {
  const l = 44 + Math.floor(hacher(i, 1, 80) * 40), h = 8 + Math.floor(hacher(i, 2, 80) * 4);
  NUAGES.push({ l, h, y: 2 + Math.floor(hacher(i, 3, 80) * 22), x0: hacher(i, 4, 80) * (W + l), v: 2 + hacher(i, 5, 80) * 2 });
}
function nuages(t, temps) {
  for (const n of NUAGES) {
    const per = W + n.l, x0 = Math.round(((n.x0 + temps * n.v) % per) - n.l);
    for (let y = 0; y < n.h; y++) for (let x = 0; x < n.l; x++) {
      const e = ((x - n.l / 2) / (n.l / 2)) ** 2 + ((y - n.h * .6) / (n.h * .6)) ** 2 + (bruit(x * .2, y * .4, 81) - .5) * .5;
      const xx = x0 + x, yy = n.y + y;
      if (e > 1 || xx < 0 || xx >= W || yy >= HORIZON || !CIELM[yy * W + xx]) continue;
      t.teinte(xx, yy, PAL, y < n.h * .5 ? C.k5 : C.k4, .65);
    }
  }
}
// Les hublots du vaisseau, qui s'allument en vague, et ses feux de position.
function hublots(t, temps) {
  const { x, y, rx } = VAISSEAU;
  for (let i = 0; i < 13; i++) {
    const u = (i - 6) / 6.6, hx = Math.round(x + u * rx * .88), hy = Math.round(y - 4 + Math.sqrt(1 - u * u) * 2);
    const on = .6 + Math.sin(temps * 2 - i * .5) * .4;
    balayerDisque(hx, hy, 2.6, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, Math.hypot(xx - hx, yy - hy) > 2 ? C.s1 : on > .8 ? C.y4 : on > .45 ? C.y3 : C.y2); });
  }
  for (const [dx, ph] of [[-rx + 4, 0], [rx - 4, 1.5]]) if (Math.sin(temps * 3 + ph) > .4) { t.pt(x + dx, y + 2, C.x2); t.teinte(x + dx - 1, y + 2, PAL, C.x2, .5); t.teinte(x + dx + 1, y + 2, PAL, C.x2, .5); }
  // La lumière de la rampe respire.
  const k = .3 + Math.sin(temps * 1.5) * .12;
  for (let yy = y + VAISSEAU.ry - 2; yy < 84; yy++) for (let xx = x - 16; xx <= x + 16; xx++) t.teinte(xx, yy, PAL, C.y3, k * (1 - Math.abs(xx - x) / 17));
}
// La nacelle volante de Freezer, qui flotte à côté du vaisseau.
function nacelle(t, temps) {
  const x = Math.round(590 + Math.sin(temps * .4) * 8), y = Math.round(24 + Math.sin(temps * 1.1) * 2);
  balayerEllipse(x, y + 2, 7, 4, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy < y + 2 ? C.s5 : C.s3); });
  balayerEllipse(x, y - 1, 4, 3, (yy, a, b) => { for (let xx = a; xx <= b; xx++) if (yy < y) t.pt(xx, yy, xx < x ? C.p3 : C.p2); });
  t.pt(x - 5, y + 5, C.y3); t.pt(x + 5, y + 5, C.y3);
}
// De loin en loin, une onde de ki traverse l'horizon et éclate.
function combatLointain(t, temps) {
  const n = Math.floor(temps / 9), q = (temps % 9) / 9;
  if (q > .22) return;
  const sens = hacher(n, 1, 90) < .5 ? 1 : -1, x0 = sens > 0 ? 150 : 810, y = 30 + hacher(n, 2, 90) * 16;
  const k = q / .22, xa = x0, xb = x0 + sens * k * 90;
  if (k < .7) for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) { t.teinte(Math.round(x), Math.round(y), PAL, C.e3, .9); t.teinte(Math.round(x), Math.round(y) - 1, PAL, C.e2, .5); t.teinte(Math.round(x), Math.round(y) + 1, PAL, C.e2, .5); }
  else { const r = (k - .7) / .3 * 10; balayerDisque(Math.round(xb), Math.round(y), r, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.teinte(xx, yy, PAL, C.e3, .8 * (1 - (k - .7) / .3)); }); }
}
// La barrière de ki à l'embouchure des cages : une aura qui crépite.
function barriereKi(t, temps) {
  for (const cote of [1, 2]) {
    const mx = cote === 1 ? COURT.left : COURT.right - 1;
    for (let y = BUT.haut; y < BUT.bas; y++) {
      const f = .55 + Math.sin(temps * 6 + y * .3) * .25 + bruit(y * .2, temps * 3, 91) * .3;
      t.teinte(mx, y, PAL, C.e3, Math.min(1, f));
      t.teinte(mx - 1, y, PAL, C.e2, f * .6); t.teinte(mx + 1, y, PAL, C.e2, f * .6);
      t.teinte(mx - 2, y, PAL, C.e1, f * .25); t.teinte(mx + 2, y, PAL, C.e1, f * .25);
    }
    for (let i = 0; i < 4; i++) {
      const n = Math.floor(temps * 8 + i * 7), yy = BUT.haut + hacher(n, i + cote, 92) * 200;
      let x = mx;
      for (let s = 0; s < 5; s++) { x += (hacher(n, s, 93) - .5) * 4; t.pt(Math.round(x), Math.round(yy + s), C.e3); }
    }
  }
}
// Les Dragon Balls scintillent : un éclat qui passe sur la sphère.
function eclatsBoules(t, temps) {
  for (const cote of [1, 2]) {
    const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right, cx = Math.round(x0 + (BUT.prof - 1) / 2);
    for (const z of ZONES) {
      const cinq = z.points === 5, y0 = CY + z.from, hz = z.to - z.from;
      const by = Math.round(y0 + hz * (cinq ? .36 : .34)), r = cinq ? 11 : 13;
      const q = ((temps * .5 + z.from * .01 + cote * .3) % 1);
      if (q < .3) { const a = q / .3; t.teinte(Math.round(cx - r * .6 + a * r * .4), Math.round(by - r * .6 + a * 3), PAL, C.e3, 1 - a); t.teinte(Math.round(cx - r * .6 + a * r * .4) + 1, Math.round(by - r * .6 + a * 3), PAL, C.e3, .6 * (1 - a)); }
    }
  }
}
function ajissaVent(t, temps) {
  for (const [x, y, r] of [[928, 164, 12], [10, 188, 8], [58, 96, 7], [58, 528, 7]]) {
    const dx = Math.round(Math.sin(temps * .8 + x) * 1.2);
    for (let i = 0; i < 4; i++) { const a = temps * .3 + i * 1.6; t.teinte(x + dx + Math.round(Math.cos(a) * r * .6), y + Math.round(Math.sin(a) * r * .5), PAL, C.a4, .45); }
  }
}
function grenouille(t, temps) {
  const saut = (temps % 7) / 7, h = saut < .08 ? Math.sin(saut / .08 * Math.PI) * 6 : 0;
  const x = 922, y = Math.round(486 - h);
  t.rect(x - 4, y, 9, 5, C.f2); t.hl(x - 4, x + 4, y, C.f3); t.rect(x - 5, y + 4, 3, 2, C.f1); t.rect(x + 3, y + 4, 3, 2, C.f1);
  const cligne = (temps % 3.3) < .15;
  for (const dx of [-3, 2]) { t.rect(x + dx, y - 2, 2, 2, C.f3); t.pt(x + dx + 1, y - 1, cligne ? C.f2 : C.k); }
}
function radar(t, temps) {
  if (Math.sin(temps * 4) > 0) { t.pt(611, 583, C.e3); t.pt(608, 586, C.e2); }
  t.pt(610, 584, C.x2);
}
function lentille(t, temps) {
  if (Math.sin(temps * 2.3) > .6) t.teinte(923, 547, PAL, C.e3, .8);
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
    combatLointain(t, temps);
    hublots(t, temps);
    nacelle(t, temps);
    ajissaVent(t, temps);
    grenouille(t, temps);
    radar(t, temps);
    lentille(t, temps);
    eclatsBoules(t, temps);
    barriereKi(t, temps);
    for (const cote of [1, 2]) {
      const fl = cote === 1 ? butG : butD;
      if (fl <= .02) continue;
      const x0 = cote === 1 ? COURT.left - BUT.prof : COURT.right;
      for (let y = BUT.haut; y < BUT.bas; y++) for (let x = x0; x < x0 + BUT.prof; x++) t.teinte(x, y, PAL, C.e3, fl * .55);
    }
    t.peindre(g);
    return cible;
  }
  return { image };
}
