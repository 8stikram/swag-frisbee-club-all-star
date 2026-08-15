import { getMap } from '../data/maps.js';
import { clamp } from './utils.js';

export const DASH_SPEED = 480, DASH_DECAY = 3.1, DASH_CD = 0.9;
export const DISC_RADIUS = 14, DISC_BIG_RADIUS = 26;
export const TARGET = 35;

// --- Dash : distance fixe vers la souris.
// DASH_GAP est l'anti-spam : sans lui, marteler la touche permet d'avancer plus
// vite qu'en courant et le déplacement normal ne sert plus à rien. Le dash durant
// DASH_TIME, il reste ~0,33 s de course entre deux dashs — de quoi enchaîner.
export const DASH_DIST = 92, DASH_TIME = .17, DASH_GAP = .5;
export const DASH_CATCH_MULT = 1.9;   // hitbox de catch élargie pendant le dash
export const DASH_THROW_WINDOW = .5;  // délai pour déclencher un Dash Throw après le catch

// --- Plongeon : purement défensif, il repousse le disque mais ne l'attrape jamais.
export const DIVE_TIME = .3, DIVE_RANGE = 52, DIVE_WHIFF_DOWN = .5;
export const DIVE_POWER = 1180;       // plus fort qu'un tir chargé à fond

// --- Cancel Dash : réappuyer sur la touche de dash stoppe net le joueur.
// La hitbox élargie persiste un court instant après le freinage, ce qui permet
// d'attraper malgré l'arrêt brutal. Aucune invincibilité : c'est du placement.
export const CANCEL_GAP = .35, CANCEL_CATCH = .2;

// --- Feinte de tir : le disque part à peine puis claque dans la main.
// Pendant FEINT_FREE il est réellement interceptable par un adversaire collé.
export const FEINT_TIME = .18, FEINT_FREE = .1, FEINT_CD = .25, FEINT_REACH = 26;

// --- Perfect Dive : plonger dans la fenêtre exacte où le disque arrive.
// 45 ms, soit moins de 3 images à 60 fps. À 0,1 s la fenêtre était illusoire :
// un disque à 800 px/s traverse toute la portée du plongeon en 0,08 s, donc
// n'importe quel plongeon à portée passait pour un timing parfait.
export const PERFECT_WINDOW = .045, PERFECT_SPEED = 1520;

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
