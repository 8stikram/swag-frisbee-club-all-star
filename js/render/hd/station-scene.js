// ---------------------------------------------------------------------------
// LA GÉOMÉTRIE de la Station orbitale HD, partagée par son rendu en jeu
// (render/hd/station.js) et par la maquette vectorielle (mockups/station-hd).
//
// A (pixel art) et B (vectoriel) lisent les mêmes mesures et placent chaque
// élément au même endroit : on compare une technique de dessin, pas deux
// compositions. Les mesures du terrain sont celles du jeu (data/maps.js,
// core/constants.js) : un rendu retenu ici se branche sans rien décaler.
//
// Ce qui change par rapport à la station actuelle, en une phrase : l'arène
// flotte en orbite au-dessus de la face nocturne d'une planète. On la voit à
// travers la vitre du terrain, villes allumées comprises, et le soleil se
// lève sur l'horizon, en haut, entre les deux portraits du HUD.
// ---------------------------------------------------------------------------

import { W, H, COURT, CX, CY } from './commun.js';
export { W, H, COURT, CX, CY };
export const BUT = { haut: 222, bas: 422, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];

// Le châssis garde l'emprise de l'actuel (render.js, drawRig) : 26 px autour
// du terrain, coins arrondis de 26. Le relief est nouveau : le rebord du haut
// montre sa paroi intérieure (MUR), le rebord du bas sa face avant (FACE).
export const CHASSIS = { L: 44, T: 58, R: 916, B: 586, rayon: 26 };
export const MUR = 8, FACE = 10;

// L'horizon est un très grand cercle : 40 px du haut au centre, et il plonge
// derrière le châssis vers les bords, là où les portraits du HUD le cachent.
export const PLANETE = { cx: 480, cy: 2440, r: 2400 };
export function horizonY(x) {
  const dx = x - PLANETE.cx;
  return PLANETE.cy - Math.sqrt(PLANETE.r * PLANETE.r - dx * dx);
}
// Le lever de soleil, à droite du centre : le coin haut-droit est pris par le
// portrait du joueur 2 à partir de x = 710.
export const SOLEIL = { x: 600 };
SOLEIL.y = horizonY(SOLEIL.x);

// Coordonnées « au sol » de la planète sous un pixel de l'écran. La
// compression n'agit que près de l'horizon : sous le terrain, la planète reste
// presque à plat, sinon la vitre paraîtrait penchée sous les joueurs.
export function projeterSol(x, y) {
  const d = Math.max(0, y - horizonY(x));
  const v = d + 1400 * (1 / (d + 3) - 1 / 600);
  const s = 1 + 60 / (d + 3);
  return [(x - CX) * s, v, d];
}

// Rythme du châssis : des plaques de 96 px, symétriques autour du centre,
// chacune portant sa bande lumineuse. L'actuel les décalait de 24 px vers la
// gauche ; ici le joint central tombe sur la ligne médiane.
export const BANDES_H = [144, 240, 336, 432, 528, 624, 720, 816];   // centres, 44 px de long
export const JOINTS_H = [96, 192, 288, 384, 480, 576, 672, 768, 864];
export const BANDES_V = [144, 500];                                  // centres, 40 px de haut
export const BALISES = [[57, 71], [903, 71], [57, 573], [903, 573]];
// Projecteurs de l'hologramme, sous la paroi intérieure du haut.
export const PROJECTEURS = [];
for (let x = 118; x <= 842; x += 48) PROJECTEURS.push(x);

// Ailes solaires dans les marges, au-dessus et au-dessous des cages.
export const PANNEAUX = [
  { x: 5, y: 98, l: 32, h: 98 }, { x: 5, y: 448, l: 32, h: 98 },
  { x: 923, y: 98, l: 32, h: 98 }, { x: 923, y: 448, l: 32, h: 98 }
];
// La station mère, au loin : un anneau qui tourne, posé sur l'horizon.
export const ANNEAU = { cx: 338, cy: 40, rx: 58, ry: 9 };
export const SATELLITE = { x: 668, y: 15 };

// Les drones-caméras remplacent toujours le public. Moins nombreux que les
// 26 de l'actuel : à cette finesse chacun se voit, et vingt-six faisaient
// un essaim qui brouillait les marges.
export const DRONES = [
  { x: 432, y: 15, orbite: 6, vit: .7, ph: 0, feu: 'r' },
  { x: 528, y: 22, orbite: 5, vit: .9, ph: 1.7, feu: 'o' },
  { x: 704, y: 27, orbite: 6, vit: .6, ph: 3.1, feu: 'r' },
  { x: 24, y: 150, orbite: 5, vit: .8, ph: .6, feu: 'o' },
  { x: 936, y: 150, orbite: 5, vit: .75, ph: 2.2, feu: 'r' },
  { x: 24, y: 496, orbite: 5, vit: .85, ph: 4.4, feu: 'r' },
  { x: 936, y: 496, orbite: 5, vit: .65, ph: 5.1, feu: 'o' },
  { x: 300, y: 593, orbite: 4, vit: .7, ph: 2.9, feu: 'o' },
  { x: 660, y: 593, orbite: 4, vit: .8, ph: .3, feu: 'r' }
];
export function positionDrone(d, t) {
  const a = t * d.vit + d.ph;
  return [d.x + Math.cos(a) * d.orbite, d.y + Math.sin(a * 1.3) * d.orbite * .5];
}

// Le vaisseau qui passe au loin, et l'étoile filante : des évènements rares,
// pour que le décor vive sans jamais appeler l'œil pendant un échange.
export function vaisseau(t) {
  const P = 19, k = (t % P) / 9;
  if (k > 1) return null;
  return { x: 760 - k * 520, y: 11 + k * 5, k };
}
export function filante(t) {
  const P = 7.3, k = (t % P) / .7;
  if (k > 1) return null;
  const n = Math.floor(t / P);
  const x0 = 280 + ((n * 173) % 380), y0 = 4 + ((n * 37) % 14);
  return { x: x0 + k * 70, y: y0 + k * 16, k };
}

// Effet de but : 1 au moment du but, retombe en une seconde.
export function effetBut(t, tBut) {
  if (tBut === null) return 0;
  const k = (t - tBut);
  return k < 0 || k > 1.1 ? 0 : Math.max(0, 1 - k / 1.1);
}

