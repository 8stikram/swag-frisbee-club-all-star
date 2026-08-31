import { getMap } from '../data/maps.js';
import { clamp } from './utils.js';

export const DASH_SPEED = 480, DASH_DECAY = 3.1, DASH_CD = 0.9;
export const DISC_RADIUS = 14, DISC_BIG_RADIUS = 26;
export const TARGET = 35;

// --- Jauge spéciale : facteur appliqué à TOUS les gains, où qu'ils soient.
// Les valeurs de base gardent leurs proportions d'origine (un attrapé vaut
// toujours le même poids relatif face à un but), seul ce curseur décide de la
// fréquence des ultimes. À 1 on tournait autour de quatre ultimes par match,
// ce qui les banalisait.
export const METER_GAIN = .75;

// --- Équilibrage défense / attaque. Mesuré en match : le disque filait à
// ~710 px/s quand un joueur se replace à ~220 px/s, soit trois fois moins vite.
// Résultat, le défenseur était encore à 215 px de sa ligne au moment du but et
// il tombait un but tous les 1,4 tirs — il n'y avait pas d'échange.
// Le gros du travail est fait par la zone d'attrapé. Côté vitesse du disque,
// −15 % rendait le jeu mou manette en main : on se contente donc d'un léger
// freinage, juste de quoi laisser une chance de se replacer sans casser la
// nervosité qui fait tout l'intérêt du jeu.
export const CATCH_RADIUS = 1.7;   // multiplie le rayon d'attrapé de chaque perso
export const DISC_SPEED = .93;     // facteur global sur tout ce qui est lancé

// --- Dash : distance fixe vers la souris.
// DASH_GAP est l'anti-spam : sans lui, marteler la touche permet d'avancer plus
// vite qu'en courant et le déplacement normal ne sert plus à rien. Le dash durant
// DASH_TIME, il reste ~0,33 s de course entre deux dashs — de quoi enchaîner.
export const DASH_DIST = 155, DASH_TIME = .17, DASH_GAP = .5;
// Bonus d'attrapé pendant le dash. Il se cumule avec CATCH_RADIUS : à 1,9 le
// dash aspirait le disque de très loin, puisque la zone de base est déjà
// élargie. Réduit pour que le dash reste un placement, pas un aimant.
export const DASH_CATCH_MULT = 1.4;
// Part de vitesse conservée en fin de dash : un arrêt net paraissait mécanique.
// 12 % donne une glissade d'une trentaine de pixels, assez pour arrondir le
// mouvement sans rallonger la distance de façon sensible.
export const DASH_SLIDE = .12;
export const DASH_THROW_WINDOW = .5;  // délai pour déclencher un Dash Throw après le catch

// --- Plongeon : purement défensif, il repousse le disque mais ne l'attrape jamais.
// DIVE_RANGE élargi de 52 à 72 (+38 %) : la portée réelle jugée à l'appui —
// zone de contact ET distance maximale du Perfect Dive — était si étroite
// qu'à moins d'être déjà quasiment aligné, le plongeon ratait tout court,
// bien avant même de discuter du timing.
export const DIVE_TIME = .3, DIVE_RANGE = 72, DIVE_WHIFF_DOWN = .5;
export const DIVE_POWER = 1180;       // plus fort qu'un tir chargé à fond

// --- Cancel Dash : réappuyer sur la touche de dash stoppe net le joueur.
// La hitbox élargie persiste un court instant après le freinage, ce qui permet
// d'attraper malgré l'arrêt brutal. Aucune invincibilité : c'est du placement.
export const CANCEL_GAP = .35, CANCEL_CATCH = .2;

// --- Feinte de tir : le disque part à peine puis claque dans la main.
// Pendant FEINT_FREE il est réellement interceptable par un adversaire collé.
// Le disque part plus loin et plus longtemps : à 26 px sur 0,18 s l'aller-retour
// était trop bref pour tromper qui que ce soit. Le délai avant de pouvoir retirer
// est allongé d'autant, pour que la feinte se paie.
export const FEINT_TIME = .26, FEINT_FREE = .14, FEINT_CD = .35, FEINT_REACH = 44;

// --- Perfect Dive : plonger dans la fenêtre exacte où le disque arrive.
// 60 ms (était 45) : élargi dans la même proportion que DIVE_RANGE, pour
// garder EXACTEMENT le même écart relatif avec le CONTRE simple plutôt que
// de le resserrer par accident. La contrainte reste celle d'origine : à
// 800 px/s, un disque traverse la portée de contact (DIVE_RANGE + rayon du
// disque, donc 86 px) en 0,1075 s — la fenêtre parfaite doit rester
// nettement en dessous, sans quoi n'importe quel plongeon à portée
// passerait pour un timing parfait. 60 ms en couvre 56 %, contre 55 %
// avant : le rapport entre les deux tient.
export const PERFECT_WINDOW = .06, PERFECT_SPEED = 1520;

// dive  : à quel point l'IA tente le contre au plongeon
// parry : à quel point elle vise la fenêtre du Perfect Dive plutôt qu'un contre simple
// dash  : à quel point elle dashe pour aller chercher un disque hors de portée
export const DIFFS = [
  // parry à 0 en Facile : le Perfect Dive reste la récompense du joueur, le CPU
  // ne le sort jamais à ce niveau.
  { key: 'facile', label: 'FACILE', react: .5, err: 95, miss: .30, speed: .6, special: .45, smart: .35, dive: .15, parry: 0, dash: .18 },
  { key: 'normal', label: 'NORMAL', react: .35, err: 55, miss: .16, speed: .75, special: .70, smart: .65, dive: .42, parry: .22, dash: .5 },
  { key: 'difficile', label: 'DIFFICILE', react: .2, err: 28, miss: .07, speed: .88, special: .90, smart: .9, dive: .72, parry: .6, dash: .85 }
];

// Géométrie dérivée de la map active. Les `let` exportés sont des liaisons vivantes :
// appeler applyMap() après un changement de map met à jour tous les modules importateurs.
export const COURT = { left: 0, right: 0, top: 0, bottom: 0 };
export let CX = 0, CY = 0;
export let GOAL_HEIGHT = 0, GOAL_DEPTH = 0;
export let GOAL_TOP = 0, GOAL_BOTTOM = 0, GOAL_MID1 = 0, GOAL_MID2 = 0;

export function applyMap() {
  const m = getMap();
  COURT.left = m.court.left; COURT.right = m.court.right;
  COURT.top = m.court.top; COURT.bottom = m.court.bottom;
  CX = (COURT.left + COURT.right) / 2;
  CY = (COURT.top + COURT.bottom) / 2;
  GOAL_HEIGHT = m.goal.height; GOAL_DEPTH = m.goal.depth;
  GOAL_TOP = CY - GOAL_HEIGHT / 2; GOAL_BOTTOM = CY + GOAL_HEIGHT / 2;
  const best = m.zones.reduce((a, z) => z.points > a.points ? z : a, m.zones[0]);
  GOAL_MID1 = CY + best.from; GOAL_MID2 = CY + best.to;
}
applyMap();

export function throwSpeed(charge, power) {
  return Math.min(1280, (520 + 660 * Math.pow(clamp(charge, 0, 1), 1.15)) * power);
}
