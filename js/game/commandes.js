import { Mouse, G } from './state.js';
import { keys, keysP2, inputDir } from './input.js';
import { getKey } from '../data/keymap.js';
import { getDashAim } from '../data/settings.js';
import { norm, clamp } from '../core/utils.js';

// ---------------------------------------------------------------------------
// La fiche d'intentions d'un joueur.
//
// Le jeu ne lit plus la souris ni le clavier : il lit cette fiche. Ce qui la
// remplit ne le regarde pas — la souris aujourd'hui, le clavier du deuxième
// joueur, et demain le réseau. C'est la seule chose qui manquait pour qu'un
// deuxième joueur puisse exister : jusqu'ici « ce que veut le joueur » et
// « où est la souris » étaient la même phrase dans le code, donc il ne pouvait
// y en avoir qu'un.
//
// Tout est en coordonnées de terrain, jamais en pixels d'écran : une visée
// reste valable quelle que soit la taille de la fenêtre d'en face.
// ---------------------------------------------------------------------------

// --- Joueur à la souris ----------------------------------------------------
export function commandeSouris(p) {
  const c = p.cmd, d = inputDir();
  c.dep.x = d.x; c.dep.y = d.y;
  const v = norm(Mouse.x - p.x, Mouse.y - p.y);
  c.visee.x = v.x; c.visee.y = v.y;
  // Le dash vise le curseur, ou le sens du déplacement selon le réglage.
  const dashVersDep = getDashAim() === 'move' && (d.x || d.y);
  const vd = dashVersDep ? norm(d.x, d.y) : v;
  c.viseeDash.x = vd.x; c.viseeDash.y = vd.y;
  c.tir = keys.has(getKey('charge')) || Mouse.down;
  c.dash = keys.has(getKey('dash'));
}

// --- Joueur au clavier -----------------------------------------------------
// Sans souris, on ne peut pas désigner un point : on oriente un viseur. Haut et
// bas le font pivoter tant qu'ils sont tenus, et il reste où on l'a laissé —
// sinon il faudrait tenir la direction ET appuyer sur tir en même temps, ce qui
// est impossible à doser. Le viseur ne peut jamais passer derrière soi : c'est
// déjà la règle du jeu pour la souris.
const ANGLE_MAX = 1.02;        // ~58° de part et d'autre de l'horizontale
const VITESSE_VISEE = 1.5;     // radians par seconde : ~0,7 s du centre à la butée

export function commandeClavier2(p, dt) {
  const c = p.cmd;
  let x = 0, y = 0;
  if (keysP2.has('ArrowUp')) y -= 1;
  if (keysP2.has('ArrowDown')) y += 1;
  if (keysP2.has('ArrowLeft')) x -= 1;
  if (keysP2.has('ArrowRight')) x += 1;
  c.dep.x = x; c.dep.y = y;
  // Le viseur pivote tant que haut ou bas est tenu.
  if (y) c.angle = clamp(c.angle + y * VITESSE_VISEE * dt, -ANGLE_MAX, ANGLE_MAX);
  const avant = p.side === 1 ? 1 : -1;
  c.visee.x = Math.cos(c.angle) * avant;
  c.visee.y = Math.sin(c.angle);
  c.viseeDash.x = c.visee.x; c.viseeDash.y = c.visee.y;
  c.tir = keysP2.has('Enter');
  c.dash = keysP2.has('ShiftRight');
}

// --- Joueur piloté par l'ordinateur ---------------------------------------
// L'IA agit encore directement sur le personnage ; on tient quand même sa fiche
// à jour pour que l'affichage de la visée soit le même pour tout le monde.
export function commandeIA(p) {
  const c = p.cmd, t = p.ai && p.ai.emaTarget;
  if (t && (t.x || t.y)) {
    const v = norm(t.x - p.x, t.y - p.y);
    c.visee.x = v.x; c.visee.y = v.y;
  }
}

// Remplit la fiche de chaque joueur, avant que le jeu ne la consulte.
export function majCommandes(dt) {
  for (const p of [G.p1, G.p2]) {
    if (!p || !p.cmd) continue;
    if (p.ai) commandeIA(p);
    else if (G.isJ2J && p.side === 2) commandeClavier2(p, dt);
    else commandeSouris(p);
  }
}
