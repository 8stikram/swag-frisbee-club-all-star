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
const VAISSEAU = { x: 480, y: 34, rx: 80, ry: 44 };
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
  // Coque du vaisseau : blanc crème, ombres lavande
  c0: '#3a3454', c1: '#615a80', c2: '#8a84a8', c3: '#b2acc8', c4: '#d6d2e2', c5: '#ece9ee', c6: '#fdf9ef',
  // Peau namekienne, ceinture bleue
  m0: '#2c5620', m1: '#46863a', m2: '#6cae4a', m3: '#9ccc66', b1: '#3858ac', b2: '#6888dc',
  k: '#12181c'
});
const C = PAL.c;
const CIEL = PAL.sous(['k0', 'k1', 'k2', 'k3', 'k4', 'k5']);
const HERBE = PAL.sous(['g0', 'g1', 'g2', 'g3', 'g4', 'g5']);
const ROCHE = PAL.sous(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
const PLATEAU = PAL.sous(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
const MER = PAL.sous(['w0', 'w1', 'w2', 'w3', 'w4']);
const COQUE = PAL.sous(['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
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
function piton(t, x, sommet, base, larg, voile = 0) {
  for (let y = sommet; y < base; y++) {
    const k = (y - sommet) / (base - sommet);
    const demi = larg * (k < .12 ? 1.15 - k : .85 + k * .45) + Math.sin(y * .7) * .6;
    for (let xx = Math.round(x - demi); xx <= x + demi; xx++) {
      const u = (xx - x) / demi;
      let c = u < -.5 ? C.r4 : u < .2 ? C.r3 : u < .7 ? C.r2 : C.r1;
      if ((y + Math.round(xx * .3)) % 7 === 0) c = u < 0 ? C.r3 : C.r1;
      t.pt(xx, y, c); if (voile) t.teinte(xx, y, PAL, C.k3, voile); if (y < HORIZON) CIELM[y * W + xx] = 0;
    }
  }
  for (let xx = Math.round(x - larg * 1.15); xx <= x + larg * 1.15; xx++) for (let k = 0; k < 3; k++) {
    const y = sommet - k + (Math.abs(xx - x) > larg ? 1 : 0);
    t.pt(xx, y, k === 2 ? C.g5 : k === 1 ? C.g4 : C.g3); if (voile) t.teinte(xx, y, PAL, C.k3, voile); if (y >= 0 && y < HORIZON) CIELM[y * W + xx] = 0;
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
  // Au loin, des pitons pâlis par l'air, et des îlots sur la mer.
  for (const [x, s2, l] of [[210, 26, 6], [372, 34, 5], [410, 40, 4], [560, 36, 5], [600, 30, 6], [760, 32, 5], [880, 28, 6]]) piton(t, x, s2, HORIZON + 2, l, .55);
  for (const [x, l] of [[240, 18], [520, 12], [860, 22]]) for (let xx = x - l; xx <= x + l; xx++) {
    const h = Math.round(3 * Math.sqrt(Math.max(0, 1 - ((xx - x) / l) ** 2)));
    for (let k = 0; k < h; k++) t.pt(xx, HORIZON + 4 - k, k === h - 1 ? C.g4 : C.g2);
  }
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
// Le vaisseau de Freezer : une grosse sphère blanc crème, ombrée de lavande
// comme dans l'anime, posée sur quatre pieds. Une ceinture de hublots ronds
// suit la courbe de la coque (on la voit d'un peu au-dessus), des lignes de
// panneaux, une rangée d'évents sous le ventre, la rampe ouverte.
const FENETRES = [];
function surSphere(u, v) {
  // Normale d'un point de la face visible, et son éclairage (soleils en haut à gauche).
  const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
  return Math.max(0, -u * .42 - v * .56 + nz * .71);
}
function couleurCoque(lum, x, y) {
  return COQUE.tramer(92 + lum * 172, 88 + lum * 168, 112 + lum * 142, x, y, 2.6);
}
// Un parallèle de la sphère, vu d'un peu au-dessus : une courbe qui plonge
// vers nous au milieu.
function parallele(v, theta) {
  const { x, y, rx, ry } = VAISSEAU, c = Math.sqrt(Math.max(0, 1 - v * v));
  return [x + rx * c * Math.sin(theta), y + ry * v + ry * .13 * c * Math.cos(theta)];
}
function vaisseau(t) {
  const { x, y, rx, ry } = VAISSEAU;
  // Son ombre sur l'herbe.
  for (let xx = x - rx - 10; xx <= x + rx + 10; xx++) for (let yy = 79; yy < 84; yy++) {
    const e = ((xx - x) / (rx + 10)) ** 2 + ((yy - 81) / 3) ** 2;
    if (e < 1) t.teinte(xx, yy, PAL, C.g0, .55 * (1 - e));
  }
  // Pieds : jambe coudée, vérin, patin.
  for (const dx of [-60, -24, 24, 60]) {
    const hx = x + dx * .78, hy = y + ry * .7, px = x + dx * (Math.abs(dx) > 30 ? 1.08 : 1.02), py = 82;
    for (let k = 0; k < 3; k++) t.ligne(hx + k - 1, hy, px + k - 1, py - 3, [C.c3, C.c2, C.c0][k]);
    t.ligne(hx, hy + 4, (hx + px) / 2, (hy + py) / 2, C.c1);
    balayerEllipse(px, py - 1, 5, 2, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy < py - 1 ? C.c4 : C.c1); });
  }
  // La coque.
  balayerEllipse(x, y, rx, ry, (yy, a, b) => { for (let xx = a; xx <= b; xx++) {
    const u = (xx - x) / rx, v = (yy - y) / ry;
    let lum = surSphere(u, v);
    const spec = Math.hypot(u + .38, v + .46);
    if (spec < .18) lum = Math.min(1, lum + (.18 - spec) * 2.2);
    t.px[yy * W + xx] = spec < .07 ? C.c6 : couleurCoque(lum, xx, yy);
    if (yy >= 0 && yy < HORIZON) CIELM[yy * W + xx] = 0;
  } });
  // Lignes de panneaux : deux parallèles en haut, un sous la ceinture.
  for (const v of [-.62, -.34, .42]) for (let th = -1.5; th <= 1.5; th += .004) {
    const [px, py] = parallele(v, th), lum = surSphere((px - x) / rx, (py - y) / ry);
    t.pt(Math.round(px), Math.round(py), lum > .55 ? C.c4 : C.c2);
  }
  for (const th of [-1.05, -.52, 0, .52, 1.05]) for (let v = -.9; v < -.36; v += .01) {
    const [px, py] = parallele(v, th);
    t.pt(Math.round(px), Math.round(py), surSphere((px - x) / rx, (py - y) / ry) > .55 ? C.c4 : C.c2);
  }
  // La ceinture : une bande plus sombre, bordée d'un filet clair au-dessus.
  for (let th = -1.52; th <= 1.52; th += .003) {
    for (let v = -.04; v <= .2; v += .012) {
      const [px, py] = parallele(v, th);
      const lum = surSphere((px - x) / rx, (py - y) / ry) * .78;
      t.pt(Math.round(px), Math.round(py), v < 0 ? C.c1 : v > .19 ? C.c0 : couleurCoque(lum, Math.round(px), Math.round(py)));
    }
    const [hx, hy] = parallele(-.07, th);
    t.pt(Math.round(hx), Math.round(hy), surSphere((hx - x) / rx, (hy - y) / ry) > .4 ? C.c6 : C.c3);
  }
  // Les hublots, qui s'aplatissent vers les bords.
  FENETRES.length = 0;
  for (let i = -6; i <= 6; i++) {
    const th = i * .205, [wx, wy] = parallele(.08, th), k = Math.cos(th);
    const rxw = 1.4 + 3.2 * k, ryw = 3.6;
    FENETRES.push([wx, wy, rxw, ryw, i]);
    balayerEllipse(wx, wy, rxw + 1, ryw + 1, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, C.c0); });
    balayerEllipse(wx, wy, rxw, ryw, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy < wy - 1 ? C.y3 : yy < wy + 2 ? C.y2 : C.y1); });
  }
  // Les évents sous le ventre.
  for (let i = -5; i <= 5; i++) {
    const [ex, ey] = parallele(.6, i * .25);
    t.rect(Math.round(ex) - 1, Math.round(ey), 3, 2, C.c0); t.pt(Math.round(ex) - 1, Math.round(ey), C.c1);
  }
  // La rampe ouverte : l'intérieur éclairé, le plan incliné jusqu'au sol.
  for (let yy = y + Math.round(ry * .74); yy < y + Math.round(ry * .9); yy++) for (let xx = x - 9; xx <= x + 9; xx++) t.pt(xx, yy, yy === y + Math.round(ry * .74) ? C.c0 : C.y3);
  balayerPoly([[x - 9, y + ry * .9], [x + 9, y + ry * .9], [x + 13, 83], [x - 13, 83]], (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, xx === a || xx === b ? C.c1 : (yy & 1) ? C.c4 : C.c3); });
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
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(hacher(i, 1, 41) * W), y = 90 + Math.floor(hacher(i, 2, 41) * 470);
    if (dansTerrain(x - 3, y) || dansTerrain(x + 3, y) || dansCage(x, y)) continue;
    t.pt(x, y, [C.e2, C.p3, C.h3][i % 3]); t.pt(x, y + 1, C.g2);
  }
  maisonDome(t, 930, 118, 14);
  peindreBas(t);
}

// En bas : la rive d'une rivière turquoise, galets, roseaux, pas japonais de
// pierre, maisons-dômes, jeunes Ajissa, et le radar posé dans l'herbe. Les
// Namekiens, le soldat de Freezer assommé et les poissons sont animés.
function rive(x) { return Math.round(584 + Math.sin(x * .025) * 2 + fbm(x * .04, 0, 2, 44) * 3); }
function peindreBas(t) {
  for (let x = 0; x < W; x++) {
    const r = rive(x);
    for (let y = r; y < H; y++) {
      const k = (y - r) / (H - r + 1);
      const o = Math.sin((y - r) * 1.1 + fbm(x * .02, y * .3, 2, 45) * 5);
      let c = y === r ? C.w4 : y === r + 1 ? C.w3 : MER.tramer(110 - k * 60 + o * 8, 200 - k * 50 + o * 8, 196 - k * 30 + o * 6, x, y, 2);
      t.pt(x, y, c);
    }
    t.pt(x, r - 1, C.g1);
    if (hacher(x, 0, 46) < .25) t.pt(x, r - 2, C.r3);
  }
  // Pas japonais pour traverser.
  for (const [x, y] of [[520, 590], [538, 595], [556, 590], [574, 596]]) {
    balayerEllipse(x, y, 6, 2.5, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy < y ? C.r5 : C.r3); });
    t.hl(x - 5, x + 5, y + 3, C.w1);
  }
  // Roseaux.
  for (const x0 of [140, 360, 640, 790]) for (let k = 0; k < 6; k++) {
    const x = x0 + k * 2, h = 5 + (k * 3) % 5, r = rive(x);
    for (let j = 0; j < h; j++) t.pt(x + (j > h - 2 ? 1 : 0), r - 1 - j, j > h - 2 ? C.t2 : C.g3);
  }
  maisonDome(t, 64, 580, 15);
  maisonDome(t, 896, 580, 13);
  for (const [x, h, r] of [[300, 14, 4], [470, 16, 5], [838, 13, 4], [214, 12, 4]]) ajissa(t, x, 578, h, r);
  // Le radar à Dragon Balls, dans l'herbe (son écran clignote, voir radar).
  balayerDisque(420, 572, 7, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, Math.hypot(x - 420, y - 572) > 6 ? C.s1 : C.s4); });
  balayerDisque(420, 572, 4, (y, a, b) => { for (let x = a; x <= b; x++) t.pt(x, y, C.g3); });
  t.rect(419, 563, 3, 3, C.s3);
  ombre(t, 421, 579, 8, 1.5, .4);
}
// Un Namekien : peau verte, antennes, robe blanche à ceinture bleue.
function namekien(t, x, yb, petit, bras) {
  const s = petit ? 1 : 1.4, hRobe = Math.round(9 * s), hTete = Math.round(6 * s), lr = Math.round(3 * s), lt = Math.round(2 * s);
  for (let k = -lr; k <= lr; k++) t.teinte(x + k, yb + 1, PAL, C.k, .35);
  t.hl(x - lr + 1, x - 1, yb, C.t1); t.hl(x + 1, x + lr - 1, yb, C.t1);
  for (let y = yb - hRobe; y < yb; y++) for (let dx = -lr; dx <= lr; dx++) {
    const bord = Math.abs(dx) === lr;
    const ceinture = y >= yb - hRobe + Math.round(3 * s) && y < yb - hRobe + Math.round(3 * s) + (petit ? 1 : 2);
    t.pt(x + dx, y, ceinture ? (dx < 0 ? C.b2 : C.b1) : bord ? C.h1 : dx < 0 ? C.h3 : C.h2);
  }
  const yt = yb - hRobe - hTete;
  for (let y = yt; y < yb - hRobe; y++) for (let dx = -lt; dx <= lt; dx++) {
    const coin = Math.abs(dx) === lt && (y === yt || y === yb - hRobe - 1);
    if (!coin) t.pt(x + dx, y, dx === lt ? C.m0 : dx < 0 ? C.m2 : C.m1);
  }
  const ye = yt + Math.round(hTete * .45);
  t.pt(x - lt - 1, ye - 1, C.m1); t.pt(x - lt - 2, ye - 2, C.m2); t.pt(x + lt + 1, ye - 1, C.m0); t.pt(x + lt + 2, ye - 2, C.m1);   // oreilles pointues
  t.pt(x - 1, ye, C.k); t.pt(x + 1, ye, C.k);
  for (const e of [-1, 1]) { t.pt(x + e, yt - 1, C.m1); t.pt(x + e * 2, yt - 2, C.m1); t.pt(x + e * 2, yt - 3, C.m2); }        // antennes
  const yb2 = yb - hRobe + 2;
  t.vl(x - lr - 1, yb2, yb2 + Math.round(3 * s), C.m1);
  if (bras) { t.pt(x + lr + 1, yb2 - 1, C.m1); t.pt(x + lr + 2, yb2 - 2 + (bras > 0 ? 0 : 1), C.m1); t.pt(x + lr + 2 + (bras > 0 ? 1 : 0), yb2 - 4, C.m2); t.pt(x + lr + 2 + (bras > 0 ? 1 : 0), yb2 - 3, C.m1); }
  else t.vl(x + lr + 1, yb2, yb2 + Math.round(3 * s), C.m0);
}
function villageois(t, temps) {
  namekien(t, 170, 578, false, 0);
  namekien(t, 190, 580, true, Math.sin(temps * 6) > 0 ? 1 : -1);            // Dende, qui salue
  namekien(t, 780, 578, false, 0);
  // Un troisième fait les cent pas au bord de l'eau.
  const q = (temps * .06) % 2, x = Math.round(640 + (q < 1 ? q : 2 - q) * 90);
  namekien(t, x, 579, false, 0);
}
// Un soldat de Freezer, assommé dans l'herbe, qui voit des étoiles.
function soldat(t, temps) {
  const x = 700, y = 572;
  ombre(t, x + 6, y + 4, 12, 2, .4);
  t.rect(x - 4, y, 9, 4, C.h3); t.hl(x - 4, x + 4, y, C.h2);                 // cuirasse
  t.rect(x - 6, y - 1, 3, 3, C.y2); t.rect(x + 5, y - 1, 3, 3, C.y2);        // épaulettes
  t.rect(x + 5, y + 1, 10, 3, C.p1); t.hl(x + 5, x + 14, y + 1, C.p2);       // jambes
  t.rect(x + 14, y + 1, 3, 3, C.h3);                                          // bottes
  balayerDisque(x - 8, y + 2, 3, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, C.t2); });
  t.pt(x - 10, y + 1, C.g5); t.pt(x - 11, y + 1, C.g4);                     // détecteur
  for (let i = 0; i < 3; i++) {
    const a = temps * 3 + i * 2.1;
    t.pt(Math.round(x - 8 + Math.cos(a) * 6), Math.round(y - 5 + Math.sin(a) * 2), C.e2);
  }
}
function riviere(t, temps) {
  // Des reflets qui filent avec le courant.
  for (let i = 0; i < 26; i++) {
    const x = Math.round(((hacher(i, 1, 94) * W + temps * (10 + hacher(i, 2, 94) * 8)) % W));
    const y = rive(x) + 3 + Math.floor(hacher(i, 3, 94) * (H - rive(x) - 4));
    t.hl(x, x + 3, y, C.w4);
  }
  // Un poisson saute de temps en temps.
  const n = Math.floor(temps / 5), q = (temps % 5) / 5;
  if (q < .16) {
    const k = q / .16, x0 = 200 + hacher(n, 1, 95) * 600, x = Math.round(x0 + k * 16), y = Math.round(592 - Math.sin(k * Math.PI) * 12);
    t.rect(x - 2, y, 5, 2, C.p2); t.pt(x + 3, y, C.p3); t.pt(x - 3, y - 1, C.p1); t.pt(x - 3, y + 2, C.p1);
    if (k < .15 || k > .85) for (const dx of [-3, 3]) t.pt(Math.round(x0 + (k > .5 ? 16 : 0)) + dx, 594, C.w4);
  }
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
  const { x, y, ry } = VAISSEAU;
  for (const [wx, wy, rxw, ryw, i] of FENETRES) {
    const on = .55 + Math.sin(temps * 1.8 - i * .45) * .45;
    balayerEllipse(wx, wy, rxw, ryw, (yy, a, b) => { for (let xx = a; xx <= b; xx++) t.pt(xx, yy, yy < wy - 1 ? (on > .7 ? C.y4 : C.y3) : yy < wy + 2 ? (on > .5 ? C.y3 : C.y2) : C.y1); });
    if (on > .85) t.teinte(Math.round(wx), Math.round(wy - ryw - 1), PAL, C.y4, .4);
  }
  // Feux de position rouges au bout de la ceinture.
  for (const [th, ph] of [[-1.42, 0], [1.42, 1.5]]) if (Math.sin(temps * 3 + ph) > .3) {
    const [fx, fy] = parallele(.08, th);
    t.pt(Math.round(fx), Math.round(fy), C.x2); t.teinte(Math.round(fx) - 1, Math.round(fy), PAL, C.x2, .5); t.teinte(Math.round(fx) + 1, Math.round(fy), PAL, C.x2, .5);
  }
  // La lumière de la rampe respire.
  const k = .3 + Math.sin(temps * 1.5) * .12;
  for (let yy = Math.round(y + ry * .9); yy < 84; yy++) for (let xx = x - 18; xx <= x + 18; xx++) t.teinte(xx, yy, PAL, C.y3, k * (1 - Math.abs(xx - x) / 19));
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
  if (Math.sin(temps * 4) > 0) { t.pt(421, 571, C.e3); t.pt(418, 574, C.e2); }
  t.pt(420, 572, C.x2);
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
    riviere(t, temps);
    villageois(t, temps);
    soldat(t, temps);
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
