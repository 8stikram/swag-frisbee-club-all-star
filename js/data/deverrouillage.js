// ---------------------------------------------------------------------------
// Forçage des déblocages, réservé au panneau admin.
//
// Rien n'est écrit dans le navigateur. La vraie sauvegarde n'est jamais
// touchée, et un simple rechargement remet tout dans son état réel. C'est ce
// qui permet d'ouvrir tout le contenu pour le tester, puis de revenir voir le
// jeu tel qu'un nouveau joueur le découvre, sans jamais sacrifier sa propre
// progression ni pouvoir « tricher » sans le vouloir.
//
// Trois états par élément : forcé ouvert, forcé fermé, ou absent — dans ce
// dernier cas c'est la sauvegarde qui décide, comme si ce fichier n'existait
// pas. Ce module n'importe rien : n'importe qui peut s'y brancher sans cycle.
// ---------------------------------------------------------------------------

const tenues = new Map();   // 'leon:re4' -> true | false
let tuto = null;            // true | false | null : le verrou des récompenses du tutoriel

// null quand rien n'est forcé : l'appelant doit alors consulter la sauvegarde.
export function forcageTenue(cle) { return tenues.has(cle) ? tenues.get(cle) : null; }
export function forcageTuto() { return tuto; }

export function forcerTenue(cle, etat) {
  if (etat === null) tenues.delete(cle); else tenues.set(cle, etat);
}
export function forcerTuto(etat) { tuto = etat; }

export function forcerTout(etat, cles) {
  for (const c of cles) tenues.set(c, etat);
  tuto = etat;
}

export function retablirEtatReel() { tenues.clear(); tuto = null; }

// Sert au panneau à signaler qu'il ment sur l'état réel du jeu.
export function forcageEnCours() { return tenues.size > 0 || tuto !== null; }
