// ---------------------------------------------------------------------------
// Écho des événements sonores vers l'invité.
//
// À l'origine l'invité ne simulait rien du tout : il s'arrêtait avant la
// physique du disque, et l'écho était la SEULE façon qu'un rebond ou une
// réception se fasse entendre chez lui. Depuis, l'invité simule son propre
// disque (chantier 8a) : rebonds et feintes se produisent maintenant
// réellement des deux côtés, et les relayer EN PLUS les ferait entendre deux
// fois — une fois par sa propre physique, une fois par l'écho de l'hôte.
//
// Ce module est un simple seau. Il n'importe rien, et c'est délibéré : c'est
// `audio.js` qui le remplit, et `audio.js` ne doit jamais se retrouver à
// dépendre de l'état du jeu, même indirectement. Un seau sans dépendance ne
// peut fermer aucun cycle.
// ---------------------------------------------------------------------------

// Sons purement locaux : navigation dans les menus, retours d'interface. Les
// renvoyer ferait cliqueter l'écran de l'invité au rythme des menus de l'hôte.
const LOCAUX = new Set(['move', 'select', 'deny', 'charge', 'full']);

// Sons de physique que l'invité produit maintenant lui-même, exactement à
// l'instant où ils se produisent réellement chez lui — pas approximativement,
// puisque son disque suit celui de l'hôte à quelques pixels près. Les
// relayer aussi les ferait entendre en double.
const PRODUITS_LOCALEMENT = new Set(['bounce', 'bigbounce', 'swish']);

// Douze par paquet suffit largement : au-delà, c'est que quelque chose s'est
// emballé, et mieux vaut perdre des sons que gonfler l'état.
const MAX = 12;

export const Echo = { collecte: false, file: [], popups: [], invite: false };

export function activerEcho(oui) {
  Echo.collecte = !!oui;
  Echo.file.length = 0;
  Echo.popups.length = 0;
}

// L'invité se signale pour que `sonEtouffe` puisse répondre. Un simple booléen
// posé de l'extérieur : ce module ne doit dépendre de rien, sans quoi audio.js
// se retrouverait à dépendre de l'état du jeu par ricochet.
export function marquerInvite(oui) { Echo.invite = !!oui; }

// ---------------------------------------------------------------------------
// La règle du double son, énoncée une fois pour toutes.
//
// Deux familles de sons, et une seule question à trancher pour chacune : qui
// le produit ? Les sons de la liste PRODUITS_LOCALEMENT naissent de la
// physique que l'invité fait tourner lui-même : l'hôte ne les relaie donc pas.
// Tous les autres naissent d'une décision de l'hôte, qui les relaie : l'invité
// ne doit alors pas les jouer une seconde fois de son côté.
//
// Sans ce second versant, chaque geste que l'invité se met à prédire ajoutait
// silencieusement un doublon — le dash s'entendait déjà deux fois chez lui
// depuis qu'il simule son personnage, et le tir allait s'y ajouter.
//
// Le décalage assumé : ces sons-là arrivent avec un demi-aller-retour de
// retard, quelques dizaines de millisecondes. C'est en dessous du seuil où
// l'oreille décroche un son de son image, alors qu'un même son joué deux fois
// s'entend immédiatement. Le geste, lui, reste instantané à l'écran.
// ---------------------------------------------------------------------------
export function sonEtouffe(nom) {
  return Echo.invite && !LOCAUX.has(nom) && !PRODUITS_LOCALEMENT.has(nom);
}

// ---------------------------------------------------------------------------
// Même seau, pour les messages qui s'affichent à l'écran.
//
// Presque tous naissent dans du code réservé à l'arbitre — « SERVICE : X »,
// « FAUTE ! −1 POINT », « PERFECT CATCH ! », « CERCLE +1 » — donc l'invité
// n'en voyait aucun. Et ceux qu'il produisait lui-même pouvaient contredire
// l'hôte : depuis que les points de zone sont réservés à l'arbitre, il
// affichait « DISQUE MORT » là où l'hôte affichait « CERCLE +1 ».
//
// La règle est celle des sons, et pour la même raison : l'hôte les produit
// tous, puisqu'il simule tout. L'invité n'affiche donc que ce qu'on lui
// relaie, et se tait sur les siens — sans quoi les deux se cumuleraient.
// ---------------------------------------------------------------------------
const MAX_POPUPS = 6;

export function noterPopup(p) {
  if (!Echo.collecte) return;
  if (Echo.popups.length < MAX_POPUPS) Echo.popups.push(p);
}

export function viderPopups() {
  if (!Echo.popups.length) return null;
  const f = Echo.popups.slice();
  Echo.popups.length = 0;
  return f;
}

// Vrai quand ce message va nous revenir par l'écho : l'afficher ici aussi le
// montrerait deux fois, ou pire, en contradiction avec celui d'en face.
export function popupEtouffe() { return Echo.invite; }

export function noterSon(nom) {
  if (!Echo.collecte || LOCAUX.has(nom) || PRODUITS_LOCALEMENT.has(nom)) return;
  if (Echo.file.length < MAX) Echo.file.push(nom);
}

// Vide le seau et rend son contenu. Appelé une fois par paquet d'état.
export function viderEcho() {
  if (!Echo.file.length) return null;
  const f = Echo.file.slice();
  Echo.file.length = 0;
  return f;
}
