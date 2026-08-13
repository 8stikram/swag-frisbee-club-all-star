import { getMap } from '../data/maps.js';
import { clamp } from './utils.js';

export const DASH_SPEED = 480, DASH_DECAY = 3.1, DASH_CD = 0.9;
export const DISC_RADIUS = 14, DISC_BIG_RADIUS = 26;
export const TARGET = 35;

export const DIFFS = [
  { key: 'facile', label: 'FACILE', react: .5, err: 95, miss: .30, speed: .6, special: .45, smart: .35 },
  { key: 'normal', label: 'NORMAL', react: .35, err: 55, miss: .16, speed: .75, special: .70, smart: .65 },
  { key: 'difficile', label: 'DIFFICILE', react: .2, err: 28, miss: .07, speed: .88, special: .90, smart: .9 }
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
