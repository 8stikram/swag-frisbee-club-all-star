// ---------------------------------------------------------------------------
// Calques figés du décor.
//
// Les maps les plus travaillées repeignaient à chaque image, trait par trait,
// des milliers d'éléments qui ne bougent jamais : les murs et les fenêtres du
// R.P.D., la glace givrée du Pôle Nord. Jusqu'à cinq mille appels de dessin
// par image sur Raccoon City — et elle tourne aussi derrière les menus, si
// c'est la dernière map jouée.
//
// Ce module ne fait qu'une chose : peindre une fois, recopier ensuite. Il
// n'importe que dom.js, et c'est délibéré — raccoon.js s'en sert aussi, et
// dépendre de render.js ou de l'admin aurait refermé un cycle d'imports.
// ---------------------------------------------------------------------------
import { ctx, W, H, viserCanvas } from '../core/dom.js';

// `actifs` coupe tous les calques d'un coup : c'est ce qui permet de comparer,
// pixel par pixel, l'image recopiée à l'image peinte en direct.
export const Calques = { actifs: true, crees: 0 };

// Une recopie n'est acceptée que si elle rend EXACTEMENT les mêmes pixels que
// le dessin direct. C'est le cas sans transformation, ou sous le miroir de
// l'invité — un retournement entier — et à condition de n'être ni transparent
// ni fondu. Sous le zoom du replay ou pendant une secousse, la copie serait
// rééchantillonnée et un trait fin de givre y deviendrait flou ou crénelé : on
// repeint alors en direct, le temps de l'effet.
export function copieExacte(c = ctx) {
  if (!Calques.actifs) return false;
  const m = c.getTransform();
  return m.b === 0 && m.c === 0 && (m.a === 1 || m.a === -1) && m.d === 1
    && Number.isInteger(m.e) && Number.isInteger(m.f)
    && c.globalAlpha === 1 && c.globalCompositeOperation === 'source-over'
    && c.shadowBlur === 0;
}

// Peint `fn` dans un canevas hors écran de la taille du jeu, en y redirigeant
// le contexte global le temps du dessin — pour les peintres de render.js, qui
// dessinent tous sur `ctx` sans le recevoir en paramètre.
export function peindreHorsEcran(fn) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const avant = ctx;
  viserCanvas(g);
  try { fn(g); } finally { viserCanvas(avant); }
  Calques.crees++;
  return cv;
}

// ---------------------------------------------------------------------------
// Sprites de sous-peintres purs.
//
// Pour les décors où le figé et l'animé s'entremêlent trop pour faire des
// calques — un mur, puis une lueur qui pulse par-dessus, puis un autre mur —
// on ne déplace rien : on remplace simplement, À SA PLACE dans l'ordre du
// dessin, l'appel d'un sous-peintre pur par la recopie de ce qu'il a peint la
// première fois. L'ordre des couches est donc intact par construction.
//
// Un sous-peintre est pur s'il ne dépend que de ses arguments : pas du temps,
// pas de l'état laissé sur le contexte par l'appelant, et sans mode de fusion
// qui lirait ce qu'il y a dessous. C'est à l'appelant de n'envelopper que ceux-
// là — le banc de comparaison (Calques.actifs) est là pour le vérifier.
//
// Le sprite est peint deux fois, une seule fois dans la vie de la map : d'abord
// sur un canevas relisible pour trouver les bords réels du dessin (ombres et
// débordements compris, sans avoir à les deviner), puis sur un canevas
// ordinaire, rognés à ces bords — le même moteur de dessin que l'écran, donc
// les mêmes pixels.
// ---------------------------------------------------------------------------
const MARGE = 96;
const sprites = new Map();

export function memoiserSprite(nom, fn) {
  return function (c, ...args) {
    if (!copieExacte(c)) return fn(c, ...args);
    const cle = nom + '|' + args.join(',');
    let s = sprites.get(cle);
    if (s === undefined) { s = fabriquerSprite(fn, args); sprites.set(cle, s); }
    if (s) c.drawImage(s.cv, s.x, s.y);
  };
}

function fabriquerSprite(fn, args) {
  const L = W + 2 * MARGE, Ht = H + 2 * MARGE;
  const brouillon = document.createElement('canvas');
  brouillon.width = L; brouillon.height = Ht;
  const b = brouillon.getContext('2d', { willReadFrequently: true });
  b.translate(MARGE, MARGE);
  fn(b, ...args);
  const d = b.getImageData(0, 0, L, Ht).data;
  let x0 = L, y0 = Ht, x1 = -1, y1 = -1;
  for (let y = 0; y < Ht; y++) {
    for (let x = 0; x < L; x++) {
      if (d[(y * L + x) * 4 + 3]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  // Un pixel de marge de chaque côté : le lissage du moteur d'écran peut
  // déborder d'un pixel de plus que celui du canevas relisible.
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
  x1 = Math.min(L - 1, x1 + 1); y1 = Math.min(Ht - 1, y1 + 1);
  const cv = document.createElement('canvas');
  cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
  const g = cv.getContext('2d');
  g.translate(MARGE - x0, MARGE - y0);
  fn(g, ...args);
  Calques.crees++;
  return { cv, x: x0 - MARGE, y: y0 - MARGE };
}
