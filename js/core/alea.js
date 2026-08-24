// ---------------------------------------------------------------------------
// Hasard reproductible du match.
//
// Deux machines qui simulent le même match doivent tirer les mêmes nombres,
// sinon elles divergent quoi qu'on fasse ensuite pour les recoller. Or il y a
// du hasard DANS la physique, pas seulement dans les effets : le tremblement de
// la cloche s'ajoute à la vitesse du joueur, les ultimes lancent le disque avec
// une composante tirée au sort, et les tempêtes du désert choisissent leurs
// horaires. Tout cela doit partir d'une graine commune.
//
// Le décoratif, lui, reste volontairement sur `Math.random()` et ne passe PAS
// par ici. La raison est fondamentale : les options graphiques se règlent par
// joueur. Quelqu'un qui coupe les particules consomme moins de nombres que son
// adversaire, et s'ils partageaient le même flux, ce simple réglage décalerait
// tout le reste de la partie. Deux générateurs séparés rendent l'interférence
// impossible plutôt qu'improbable.
//
// Aucun import ici, et c'est délibéré : ce module est appelé depuis la physique
// comme depuis les données, et il ne doit pouvoir fermer aucun cycle.
// ---------------------------------------------------------------------------

// mulberry32 : court, rapide, et de qualité largement suffisante pour du jeu.
// Surtout, il tient dans un entier 32 bits — donc il donne exactement la même
// suite sur deux navigateurs, ce qu'un générateur à virgule flottante ne
// garantit pas.
// L'état tient dans UN entier 32 bits, et c'est ce qui rend le rembobinage
// possible : figer le hasard, c'est copier ce nombre. Il est donc gardé ici en
// clair plutôt qu'enfermé dans une fermeture — un générateur qu'on ne peut pas
// remettre où il était rendrait toute simulation rejouable impossible.
let etat = 1;
let graineCourante = 1;

function suite() {
  etat = (etat + 0x6D2B79F5) >>> 0;
  let t = etat;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Appelée au coup d'envoi, avec la même graine des deux côtés. En solo, la
// graine vient de l'horloge : le jeu reste imprévisible d'une partie à l'autre.
export function semerAlea(graine) {
  graineCourante = (graine >>> 0) || 1;
  etat = graineCourante;
}

// Photographier et replacer le hasard. Sans ces deux-là, rejouer une image
// consommerait des nombres différents de la première fois et la simulation
// divergerait à chaque rembobinage.
export function etatAlea() { return etat; }
export function poserEtatAlea(a) { etat = a >>> 0; }

export function graineCourante_() { return graineCourante; }

// Une graine neuve, à annoncer au coup d'envoi.
export function graineNeuve() {
  return (Math.random() * 0xFFFFFFFF) >>> 0;
}

export const aleaJeu = () => suite();

export const randJeu = (a = 1, b) =>
  b === undefined ? suite() * a : a + suite() * (b - a);

// Même forme que le `gauss` décoratif : somme de trois tirages, ramenée autour
// de zéro. Garder la formule identique évite de reprendre tous les réglages de
// visée de l'IA, qui ont été équilibrés sur cette distribution-là.
export const gaussJeu = () => (suite() + suite() + suite() - 1.5) * 0.8;

export const pickJeu = a => a[(suite() * a.length) | 0];
