// ---------------------------------------------------------------------------
// LE PETIT MOTEUR DE PIXEL ART des terrains HD.
//
// Pourquoi il existe. Les persos passent en 64×80 (atelier persos-hd) : un
// pixel de sprite y vaut 1,2 px du canevas de jeu. Les terrains, eux, sont
// peints au canevas en formes lisses — dégradés, bords adoucis, lueurs floues
// — et un perso net et cerné posé dessus a l'air découpé dans un autre jeu.
// Ce moteur peint un terrain comme on le ferait à la main : pixel par pixel,
// dans une palette courte rangée en rampes, sans aucun lissage.
//
// L'outil central est la trame (`Palette.tramer`). On calcule une couleur
// « idéale » continue — le ciel qui s'éclaircit vers l'horizon, un nuage qui
// s'épaissit — puis on la ramène à la palette en posant, pixel par pixel, la
// plus proche des deux couleurs qui l'encadrent selon une trame de Bayer 4×4.
// C'est ce que faisaient les jeux 16 bits pour leurs dégradés, et c'est ce
// qui garde un rendu cohérent au lieu d'un dégradé lisse collé sur des pixels.
//
// Ce qu'il ne fait pas : de l'anticrénelage. Tout ce qui sort d'ici a des
// bords francs, exprès.
// ---------------------------------------------------------------------------

// Couleurs rangées comme ImageData les lit en mémoire (petit-boutiste) :
// un Uint32 vaut 0xAABBGGRR.
export function couleur(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
export const canalR = c => c & 255;
export const canalV = c => (c >>> 8) & 255;
export const canalB = c => (c >>> 16) & 255;

// Trame de Bayer 4×4, en seuils de 0 à 1.
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
export function bayer(x, y) { return B4[((y & 3) << 2) | (x & 3)]; }

// Hachage entier : le même (x, y, graine) donne toujours le même nombre. Tout
// le « hasard » du décor en sort, pour que le terrain soit identique à chaque
// chargement — un décor qui change d'une partie à l'autre, c'est un bug.
export function hacher(x, y, graine = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(graine | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Bruit de valeur lissé, puis empilé en octaves (fbm).
export function bruit(x, y, graine = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hacher(xi, yi, graine), b = hacher(xi + 1, yi, graine);
  const c = hacher(xi, yi + 1, graine), d = hacher(xi + 1, yi + 1, graine);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, octaves = 4, graine = 0) {
  let t = 0, amp = .5, f = 1, n = 0;
  for (let i = 0; i < octaves; i++) {
    t += amp * bruit(x * f, y * f, graine + i * 131);
    n += amp; amp *= .5; f *= 2.03;
  }
  return t / n;
}
export function lisse(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export const melanger = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------------------
// La palette. Les couleurs ont un nom (`p.c.m4`) pour qu'on les pose à la
// main, et la palette sait ramener n'importe quelle couleur calculée à ses
// propres teintes, tramées.
// ---------------------------------------------------------------------------
export class Palette {
  constructor(def) {
    this.def = def;
    this.c = {};
    this.rgb = [];
    for (const k in def) {
      const u = couleur(def[k]);
      this.c[k] = u;
      this.rgb.push([canalR(u), canalV(u), canalB(u), u]);
    }
    this.memo = new Map();
    this.memoTeinte = new Map();
  }

  // Une sous-palette : pour qu'un ciel ne pioche pas dans le métal, ou la
  // vitre du terrain dans l'or des cages.
  sous(noms) {
    const d = {};
    for (const n of noms) d[n] = this.def[n];
    return new Palette(d);
  }

  // Écart perçu, pondéré comme l'œil : le vert compte plus que le bleu.
  static ecart(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
    return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
  }

  // Le meilleur mélange de deux teintes pour approcher (r, g, b) : la plus
  // proche, une partenaire, et la part de la partenaire. Une pénalité écarte
  // les partenaires trop lointaines : tramer du noir avec du blanc donne le
  // bon gris en moyenne, mais il fourmille. Deux voisines de rampe, jamais.
  melange(r, g, b) {
    r = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    g = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    const cle = ((r >> 1) << 14) | ((g >> 1) << 7) | (b >> 1);
    let m = this.memo.get(cle);
    if (m) return m;
    const L = this.rgb;
    let i1 = 0, d1 = Infinity;
    for (let i = 0; i < L.length; i++) {
      const d = Palette.ecart(r, g, b, L[i][0], L[i][1], L[i][2]);
      if (d < d1) { d1 = d; i1 = i; }
    }
    const [r1, g1, b1, u1] = L[i1];
    m = { c1: u1, c2: u1, t: 0 };
    let meilleur = d1;
    for (let j = 0; j < L.length; j++) {
      if (j === i1) continue;
      const dx = L[j][0] - r1, dy = L[j][1] - g1, dz = L[j][2] - b1;
      const l2 = 2 * dx * dx + 4 * dy * dy + 3 * dz * dz;
      if (!l2) continue;
      let t = (2 * (r - r1) * dx + 4 * (g - g1) * dy + 3 * (b - b1) * dz) / l2;
      if (t <= 0) continue;
      if (t > 1) t = 1;
      const er = Palette.ecart(r1 + t * dx, g1 + t * dy, b1 + t * dz, r, g, b);
      const pen = l2 * t * (1 - t) * .09;
      if (er + pen < meilleur) { meilleur = er + pen; m = { c1: u1, c2: L[j][3], t }; }
    }
    this.memo.set(cle, m);
    return m;
  }

  // La couleur du pixel (x, y) pour la couleur idéale (r, g, b). `durete`
  // resserre les zones tramées : à 1 le dégradé est tramé d'un bout à
  // l'autre, à 2 ou 3 il se lit en aplats francs reliés par une trame courte,
  // ce qui est plus propre sur de grandes surfaces.
  tramer(r, g, b, x, y, durete = 1) {
    const m = this.melange(r, g, b);
    let t = m.t;
    if (durete !== 1) t = Math.min(1, Math.max(0, (t - .5) * durete + .5));
    return bayer(x, y) < t ? m.c2 : m.c1;
  }
  proche(r, g, b) {
    const m = this.melange(r, g, b);
    return m.t > .5 ? m.c2 : m.c1;
  }

  // Éclaire (ou assombrit) une couleur déjà posée vers une cible, par paliers
  // de quart, tramés. C'est la lueur du pixel art : un halo n'est pas un
  // flou, c'est une couronne de pixels un cran plus clairs.
  teinter(c, cible, k, x, y) {
    if (k <= 0) return c;
    if (k > 1) k = 1;
    const n = k * 4;
    let pal = Math.floor(n);
    if (bayer(x, y) < n - pal) pal++;
    if (pal <= 0) return c;
    const cle = c * 8 + pal;
    let parCible = this.memoTeinte.get(cible);
    if (!parCible) { parCible = new Map(); this.memoTeinte.set(cible, parCible); }
    let v = parCible.get(cle);
    if (v === undefined) {
      const k2 = pal / 4;
      v = this.proche(
        melanger(canalR(c), canalR(cible), k2),
        melanger(canalV(c), canalV(cible), k2),
        melanger(canalB(c), canalB(cible), k2));
      parCible.set(cle, v);
    }
    return v;
  }
}

// ---------------------------------------------------------------------------
// La toile : un tampon de pixels et les tracés de base, tous à coordonnées
// entières et sans lissage.
// ---------------------------------------------------------------------------
export class Toile {
  constructor(l, h) {
    this.l = l; this.h = h;
    this.px = new Uint32Array(l * h);
  }
  copier(depuis) { this.px.set(depuis.px); }
  pt(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.l || y >= this.h) return;
    this.px[y * this.l + x] = c;
  }
  lire(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.l || y >= this.h) return 0;
    return this.px[y * this.l + x];
  }
  // Transforme un pixel déjà posé : f(couleur, x, y) → couleur.
  modifier(x, y, f) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.l || y >= this.h) return;
    const i = y * this.l + x;
    this.px[i] = f(this.px[i], x, y);
  }
  rect(x, y, l, h, c) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.l, (x + l) | 0), y1 = Math.min(this.h, (y + h) | 0);
    for (let j = y0; j < y1; j++) this.px.fill(c, j * this.l + x0, j * this.l + x1);
  }
  hl(x0, x1, y, c) { if (x1 < x0) [x0, x1] = [x1, x0]; this.rect(x0, y, x1 - x0 + 1, 1, c); }
  vl(x, y0, y1, c) { if (y1 < y0) [y0, y1] = [y1, y0]; this.rect(x, y0, 1, y1 - y0 + 1, c); }
  // Bresenham : une ligne d'un pixel d'épaisseur, sans trou ni doublon.
  ligne(x0, y0, x1, y1, c, f) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (f) this.modifier(x0, y0, f); else this.pt(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  sprite(s, x, y, miroir = false) {
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < s.h; j++) {
      for (let i = 0; i < s.l; i++) {
        const c = s.px[j * s.l + (miroir ? s.l - 1 - i : i)];
        if (c) this.pt(x + i, y + j, c);
      }
    }
  }
  peindre(ctx, x = 0, y = 0) {
    if (!this._img) this._img = new ImageData(new Uint8ClampedArray(this.px.buffer), this.l, this.h);
    ctx.putImageData(this._img, x, y);
  }
}

// Balayage d'un disque plein, ligne par ligne : f(y, x0, x1) bornes incluses.
// Le « + r × 0,8 » arrondit les disques : sans lui, un rayon entier donne des
// pointes d'un pixel aux quatre points cardinaux.
export function balayerDisque(cx, cy, r, f) {
  const r2 = r * r + r * .8;
  const n = Math.ceil(r);
  for (let dy = -n; dy <= n; dy++) {
    const q = r2 - dy * dy;
    if (q < 0) continue;
    const w = Math.floor(Math.sqrt(q));
    f(cy + dy, cx - w, cx + w);
  }
}
export function balayerEllipse(cx, cy, rx, ry, f) {
  const n = Math.ceil(ry);
  for (let dy = -n; dy <= n; dy++) {
    const k = 1 - (dy * dy) / (ry * ry + ry * .8);
    if (k < 0) continue;
    const w = Math.round(rx * Math.sqrt(k));
    f(Math.round(cy + dy), Math.round(cx - w), Math.round(cx + w));
  }
}
// Polygone plein par balayage (pair-impair), pixels dont le centre est dedans.
export function balayerPoly(pts, f) {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) * (bx - ax) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.ceil(xs[i] - .5), b = Math.floor(xs[i + 1] - .5);
      if (b >= a) f(y, a, b);
    }
  }
}

// Sprite à partir de lignes de texte, comme les persos : un caractère par
// pixel, « . » pour le vide.
export function spriteDe(lignes, couleurs) {
  const h = lignes.length, l = Math.max(...lignes.map(s => s.length));
  const px = new Uint32Array(l * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < lignes[y].length; x++) {
      const ch = lignes[y][x];
      if (ch !== '.' && ch !== ' ') {
        const c = couleurs[ch];
        if (c === undefined) throw new Error('Couleur inconnue « ' + ch + ' »');
        px[y * l + x] = typeof c === 'string' ? couleur(c) : c;
      }
    }
  }
  return { l, h, px };
}

// Police 3×5 pour les inscriptions gravées : chaque glyphe tient en quinze
// bits, trois par rangée, de haut en bas.
const P35 = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111',
  2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110',
  6: '011100110101010', 7: '111001010010010', 8: '010101010101010', 9: '010101011001110',
  '-': '000000111000000', '.': '000000000000010', '/': '001001010100100', '·': '000000010000000',
  ' ': '000000000000000'
};
export function ecrire3x5(toile, texte, x, y, c) {
  for (const ch of texte.toUpperCase()) {
    const g = P35[ch] || P35[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') toile.pt(x + (i % 3), y + ((i / 3) | 0), c);
    x += 4;
  }
}
export function largeur3x5(texte) { return texte.length * 4 - 1; }
