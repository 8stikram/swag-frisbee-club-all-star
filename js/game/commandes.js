import { Mouse, G } from './state.js';
import { keys, keysP2, inputDir } from './input.js';
import { getKey } from '../data/keymap.js';
import { getDashAim } from '../data/settings.js';
import { norm, clamp } from '../core/utils.js';
import { doDive } from './actions.js';
import { doFeint, cancelDash } from './input.js';
import { trySpecial } from './specials.js';
import { Partie } from '../reseau/partie.js';

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

// Le joueur que commande CETTE machine. En ligne, l'invité tient celui de
// droite : tout ce qui visait « G.p1 » en dur ne le concernait donc jamais, et
// il ne pouvait ni plonger, ni feinter, ni lancer son ultime.
export function monJoueur() {
  if (Partie.active) return Partie.role === 'hote' ? G.p1 : G.p2;
  return G.p1;
}

// Vrai partout sauf chez l'invité, qui n'a rien à simuler : c'est l'hôte qui
// fait foi, et calculer en double ferait diverger les deux écrans.
export function jeSimule() {
  return !(Partie.active && Partie.role === 'invite');
}

// Dépose un geste ponctuel — plongeon, feinte, ultime, annulation de dash.
// Passer par ici plutôt que d'écrire le drapeau à la main est ce qui garantit
// qu'un geste demandé en ligne finit toujours par arriver : il est compté tout
// de suite, et non au moment où l'envoi se trouve passer par là.
export function demanderGeste(p, nom) {
  if (!p || !p.cmd) return;
  p.cmd[nom] = true;
}

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

// Touches d'action du deuxième joueur, à droite du clavier pour ne jamais
// croiser celles du premier. Appelé sur l'appui, pas à chaque image : ce sont
// des gestes ponctuels, pas des états maintenus.
export function toucheActionJ2(code) {
  const p = G.p2;
  // En ligne, ces gestes appartiennent au joueur distant : ils arrivent par sa
  // fiche. L'hote ne doit pas pouvoir plonger ni lancer l'ultime a sa place.
  if (!p || !p.cmd || !G.isJ2J || !p.human || Partie.active) return false;
  if (code === 'ControlRight') { p.cmd.plongeon = true; return true; }
  if (code === 'Delete') { p.cmd.feinte = true; return true; }
  if (code === 'PageDown') { p.cmd.special = true; return true; }
  return false;
}

// Exécute les gestes ponctuels déposés dans la fiche, puis les efface.
// C'est par ici que passeront les actions d'un joueur distant : lui n'aura pas
// d'événement clavier sur cette machine, seulement une fiche qui arrive.
export function appliquerActions(p) {
  const c = p.cmd;
  if (c.plongeon) {
    c.plongeon = false;
    if (!G.cine && p.stun <= 0 && p.diveT <= 0 && p.diveDown <= 0) {
      if (p.holding) p.charging = true;
      else doDive(p, { x: c.visee.x, y: c.visee.y });
    }
  }
  if (c.feinte) { c.feinte = false; doFeint(p, { x: c.visee.x, y: c.visee.y }); }
  if (c.special) { c.special = false; trySpecial(p); }
  // Cancel Dash : freiner net en pleine course. C'était le dernier geste qui
  // passait encore par un appel direct, donc le seul que l'invité n'avait pas.
  if (c.annuleDash) { c.annuleDash = false; if (p.dashT > 0) cancelDash(p); }
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
    // En ligne, chacun ne remplit que sa propre fiche. Celle d'en face arrive
    // par la liaison : la remplir ici l'écraserait avec les commandes de la
    // mauvaise personne — l'adversaire se mettrait à jouer avec ta souris.
    if (Partie.active) {
      if (p === (Partie.role === 'hote' ? G.p1 : G.p2)) commandeSouris(p);
      continue;
    }
    if (p.ai) commandeIA(p);
    else if (G.isJ2J && p.side === 2) commandeClavier2(p, dt);
    else commandeSouris(p);
  }
}
