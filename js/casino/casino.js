// ---------------------------------------------------------------------------
// Le casino. Un écran d'accueil tenu par un croupier diable, et quatre jeux
// qui se paient en pièces — celles gagnées sur le terrain, pas d'autres.
//
// Chaque jeu vit dans son propre fichier de ce dossier et n'est chargé qu'au
// moment où on l'ouvre : le casino ne doit rien coûter à quelqu'un qui ne
// vient jamais y jouer.
//
// Règle du lieu, valable pour tous les jeux à venir : aucun filet. À court de
// pièces, on retourne jouer des matchs. La maison ne fait pas crédit.
// ---------------------------------------------------------------------------
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { Compte, connecte } from '../reseau/compte.js';

// Une couleur de néon par jeu : sur un comptoir, on vise la pastille avant de
// lire son étiquette, et quatre pastilles identiques ne se visent pas.
const JEUX = [
  { id: 'blackjack', nom: 'BLACKJACK', ico: '♠', neon: '#c07bff',
    desc: 'Six jeux mélangés. Le croupier tire jusqu\'à 17.' },
  { id: 'roulette', nom: 'ROULETTE', ico: '◉', neon: '#5df08a',
    desc: 'Européenne, un seul zéro. Tapis complet.' },
  { id: 'poker', nom: 'POKER', ico: '♦', neon: '#ff6a3d',
    desc: 'Texas Hold\'em en tête-à-tête contre la maison.' },
  { id: 'caisses', nom: 'OUVERTURE', ico: '✦', neon: '#ffd23e',
    desc: 'Tenues et dos de cartes, tirés au sort.' }
];

export function ouvrirCasino() {
  rafraichirSolde();
  showScreen('casino');
}

// Le solde est affiché en permanence : dans un endroit où l'on dépense, ne pas
// savoir ce qu'on a est une faute de conception, pas du suspense.
export function rafraichirSolde() {
  const el = $('casinoSolde');
  if (!el) return;
  const dedans = connecte() && Compte.profil;
  el.classList.toggle('bad', !dedans);
  el.textContent = dedans ? ('🪙 ' + (Compte.profil.pieces || 0)) : 'CONNECTE-TOI POUR JOUER';
}

let effacer = null;
function message(texte) {
  const el = $('casinoMsg');
  if (!el) return;
  el.textContent = texte;
  el.classList.remove('hidden', 'pop');
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout(effacer);
  effacer = setTimeout(() => el.classList.add('hidden'), 2600);
}

// Le bloc prend feu avant d'ouvrir son jeu. Ce n'est pas qu'un effet : ça
// occupe l'attente pendant que le module du jeu se charge, et ça laisse le
// bruitage aller au bout plutôt que d'être coupé par le changement d'écran.
const DUREE_FEU = 650;

function allumer(carte, jeu) {
  if (carte.classList.contains('onFire')) return;
  if (!connecte()) { sfx('deny'); message('Connecte-toi : les pièces vivent sur ton compte.'); return; }
  sfx('casinoFeu');
  carte.classList.add('onFire');
  const contenu = document.querySelector('.casinoWrap');
  contenu.classList.add('shake');
  setTimeout(() => contenu.classList.remove('shake'), 350);
  setTimeout(() => {
    carte.classList.remove('onFire');
    // Les jeux arrivent un par un. Tant qu'un module n'existe pas, on le dit
    // au lieu d'ouvrir un écran vide.
    message(jeu.nom + ' — pas encore ouvert. Le diable finit d\'installer la table.');
  }, DUREE_FEU);
}

(function construire() {
  const grille = $('casinoJeux');
  if (!grille) return;
  for (const jeu of JEUX) {
    const carte = document.createElement('button');
    carte.className = 'casinoCard';
    carte.dataset.jeu = jeu.id;
    carte.style.setProperty('--neon', jeu.neon);
    const ico = document.createElement('span');
    ico.className = 'casinoIco'; ico.textContent = jeu.ico;
    const nom = document.createElement('b'); nom.textContent = jeu.nom;
    const desc = document.createElement('em'); desc.textContent = jeu.desc;
    carte.append(ico, nom, desc);
    carte.addEventListener('click', () => allumer(carte, jeu));
    grille.appendChild(carte);
  }
})();
