// Progression du joueur dans le tutoriel, et ce qu'elle débloque.
// Tout est conservé en local : c'est un suivi personnel, pas un état de partie.
import { brancherVerrouTuto } from './skins.js';
import { brancherVerrouTutoMap } from './maps.js';
import { ajouterPieces, connecte } from '../reseau/compte.js';

export const CHAPITRES = [
  { id: 'bases', num: 1, nom: 'FONDATIONS', desc: 'Se déplacer, viser, attraper, tirer.' },
  { id: 'attaque', num: 2, nom: 'OFFENSIVE', desc: 'Tir chargé, dash, attrapé élargi, dash throw.' },
  { id: 'defense', num: 3, nom: 'DÉFENSE', desc: 'Plongeon, renvoi, et la fenêtre du Perfect Dive.' },
  { id: 'techs', num: 4, nom: 'TECHNIQUES', desc: 'Annuler son dash, feinter son tir.' },
  { id: 'maitrise', num: 5, nom: 'MAÎTRISE', desc: 'Enchaînements et jeu sur les intentions.' }
];

const CLE = 'sbcbApprentissage';
const PIECES_CHAPITRE = 10;

// `proposé` retient qu'on a déjà posé la question au premier lancement, pour ne
// jamais la reposer — même si le joueur a répondu non.
// `credites` retient les chapitres déjà payés en pièces, séparément de
// `faits` : sans cette liste, se reconnecter reposerait la même question à
// chaque chargement plutôt qu'une seule fois par chapitre.
let etat = { faits: [], propose: false, credites: [] };

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return;
    const o = JSON.parse(brut);
    if (Array.isArray(o.faits)) etat.faits = o.faits.filter(id => CHAPITRES.some(c => c.id === id));
    etat.propose = !!o.propose;
    if (Array.isArray(o.credites)) etat.credites = o.credites.filter(id => CHAPITRES.some(c => c.id === id));
  } catch (e) { }
}
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { }
}
charger();

// Le registre des skins a besoin de savoir si le tutoriel est fini, sans
// dépendre de ce module au chargement : on lui passe la question à poser.
brancherVerrouTuto(() => tutoTermine());
brancherVerrouTutoMap(() => tutoTermine());

export function chapitreFait(id) { return etat.faits.includes(id); }
export function nbChapitresFaits() { return etat.faits.length; }
export function marquerChapitreFait(id) {
  if (!CHAPITRES.some(c => c.id === id) || etat.faits.includes(id)) return;
  etat.faits.push(id);
  sauver();
  crediterEnAttente();
}

// Paye les chapitres déjà terminés mais pas encore crédités — un chapitre
// qu'on vient de finir, ou un rattrapage pour quelqu'un qui avait déjà fini
// le tutoriel avant que les pièces n'existent. Ne fait rien hors connexion :
// les pièces vivent côté serveur, on retentera à la prochaine connexion.
export function crediterEnAttente() {
  if (!connecte()) return;
  const du = etat.faits.filter(id => !etat.credites.includes(id));
  for (const id of du) {
    etat.credites.push(id);
    ajouterPieces(PIECES_CHAPITRE).catch(() => {
      // Le crédit a échoué (réseau, jeton expiré...) : on retire la marque
      // pour retenter au prochain appel plutôt que de perdre les pièces dues.
      etat.credites = etat.credites.filter(x => x !== id);
      sauver();
    });
  }
  if (du.length) sauver();
}
crediterEnAttente();

// Vrai quand les cinq chapitres sont derrière le joueur : c'est la condition de
// déblocage du disque « 20/20 » et du terrain spécial.
export function tutoTermine() { return etat.faits.length >= CHAPITRES.length; }

export function tutoDejaPropose() { return etat.propose; }
export function marquerTutoPropose() { etat.propose = true; sauver(); }

// Utilisé par les tests et par une éventuelle remise à zéro depuis les options.
export function reinitialiserApprentissage() {
  etat = { faits: [], propose: false, credites: [] };
  sauver();
}
