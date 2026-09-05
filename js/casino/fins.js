// ---------------------------------------------------------------------------
// Les quatre fins de main du blackjack.
//
// Chacune a son propre déroulé en trois temps — révélation, annonce, règlement
// — et sa propre grammaire : ce qui bouge, ce qui tremble, ce qui brûle et ce
// qu'on entend. L'enjeu n'est pas de décorer le résultat mais de le faire
// ressentir avant qu'on l'ait lu : satisfaction, punition, déception,
// soulagement.
//
// Le module ne décide de rien. Il reçoit le genre, l'écran, et de quoi régler
// la mise ; c'est `blackjack.js` qui arbitre et le serveur qui paie. C'est
// aussi ce qui permet à `mockups/blackjack-fins.html` de rejouer les quatre
// séquences à vide, sans compte ni sabot.
// ---------------------------------------------------------------------------
import { sfx } from '../audio/audio.js';
import { Temps, ralentir, vitesseNormale, enchainer, secousse,
         flash, vignetteTeintee, aberration, emettre, boiteDe, purger } from './effets.js';

// Une seule séquence à la fois : relancer une main pendant que la précédente
// se termine doit couper l'ancienne, pas l'empiler.
let annulerCourante = null;

const q = (hote, sel) => hote.querySelector(sel);

// Les classes que les séquences posent sur les mains. Elles sont toutes
// retirées d'un coup au démarrage : une main neuve qui hériterait du gris de
// la précédente arriverait déjà perdue.
const MARQUES = ['gagne', 'perd', 'egalite', 'creve', 'pulseOr', 'pulseRouge',
                 'pulseBleu', 'terne', 'envole'];

export function nettoyerFin(hote) {
  if (annulerCourante) { annulerCourante(); annulerCourante = null; }
  purger(hote);
  for (const id of ['#bjJoueur', '#bjCroupier']) {
    const z = q(hote, id);
    if (z) z.classList.remove(...MARQUES);
  }
  const a = q(hote, '#bjAnnonce');
  if (a) a.className = 'bjAnnonce hidden';
  for (const e of hote.querySelectorAll('.bjSousTexte, .bjJetonVol')) e.remove();
  const s = q(hote, '#bjSolde');
  if (s) s.classList.remove('gagne', 'perd', 'roule');
  const m = q(hote, '#bjMise');
  if (m) m.classList.remove('rendue', 'partie');
}

// Texte central. On repose la classe sur l'élément existant plutôt que d'en
// créer un : sa place au centre de la table est déjà réglée, et une annonce
// jetable réapparaîtrait à chaque fois avec un demi-cadre de décalage.
function annonce(hote, texte, classe) {
  const el = q(hote, '#bjAnnonce');
  if (!el) return;
  el.className = 'bjAnnonce ' + classe;
  el.textContent = texte;
}

// Ligne secondaire sous l'annonce — seule l'égalité s'en sert, pour dire ce que
// le compteur immobile ne dit pas.
function sousTexte(hote, texte, classe) {
  const el = document.createElement('div');
  el.className = 'bjSousTexte ' + (classe || '');
  el.textContent = texte;
  hote.appendChild(el);
  return el;
}

// --- Les jetons de mise quittent la table -----------------------------------
// Ils partent vraiment, un par un, avec une traînée d'éclats semée sur le
// trajet. Voir le compteur changer tout seul, c'est lire un bilan ; voir la
// mise traverser la table, c'est encaisser ou payer.
function volerMise(hote, cible, teinte, versLeHaut) {
  const pile = q(hote, '#bjMise');
  if (!pile || pile.classList.contains('hidden')) return;
  const depart = boiteDe(hote, pile);
  const arrivee = cible
    ? boiteDe(hote, cible)
    : { x: hote.clientWidth * .5 - 20, y: -60, l: 40, h: 40 };
  pile.classList.add('partie');

  for (let i = 0; i < 5; i++) {
    const j = document.createElement('div');
    j.className = 'bjJetonVol bjJetonMise';
    j.style.cssText =
      `left:${depart.x + depart.l * .5 - 13}px;top:${depart.y + depart.h * .5 - 13}px;` +
      `width:26px;height:26px;--rune:${teinte};`;
    hote.appendChild(j);

    const dx = (arrivee.x + arrivee.l * .5) - (depart.x + depart.l * .5);
    const dy = (arrivee.y + arrivee.h * .5) - (depart.y + depart.h * .5);
    const cambrure = versLeHaut ? -70 : -50;
    const duree = 460 + i * 60;
    const anim = j.animate([
      { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .5}px, ${dy * .5 + cambrure}px) rotate(240deg) scale(.9)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) rotate(560deg) scale(.35)`, opacity: 0 }
    ], { duration: duree, easing: 'cubic-bezier(.35,0,.3,1)', delay: i * 55 });

    // La traînée est semée depuis la position réelle du jeton, image par image.
    // Calculée à l'avance sur la courbe, elle se décale dès que l'animation
    // prend du retard, et on voit les éclats voler à côté du jeton.
    const semer = () => {
      if (anim.playState === 'finished') return;
      const b = boiteDe(hote, j);
      emettre(hote, 'trainee', { x: b.x + 8, y: b.y + 8, l: 10, h: 10 }, 1, teinte);
      requestAnimationFrame(semer);
    };
    requestAnimationFrame(semer);
    anim.onfinish = () => j.remove();
  }
}

// --- Le compteur encaisse ---------------------------------------------------
// Le défilement des chiffres appartient à la table (elle seule connaît le
// solde) ; ici on ajoute ce qui se voit et s'entend : le sens, la teinte et le
// cliquetis du rouleau.
function roulerCompteur(hote, gain) {
  const s = q(hote, '#bjSolde');
  if (!s) return;
  s.classList.add('roule', gain ? 'gagne' : 'perd');
  sfx('bjCompteur');
  setTimeout(() => s.classList.remove('roule', 'gagne', 'perd'), 1400);
}

// Retourne les cartes du croupier restées face cachée. En jeu c'est déjà fait
// avant d'arriver ici ; au banc d'essai, non — et une séquence qui commence par
// « les cartes du croupier se retournent » doit tenir dans les deux cas.
function devoilerCroupier(hote) {
  let retard = 0;
  for (const c of hote.querySelectorAll('#bjCroupier .bjCarte:not(.face)')) {
    setTimeout(() => { c.classList.add('face'); sfx('bjRevele'); }, retard);
    retard += 140;
  }
  return retard;
}

// ---------------------------------------------------------------------------
// ÉCRAN 1 — VICTOIRE. Satisfaction, récompense méritée.
// ---------------------------------------------------------------------------
function sequenceVictoire(hote, opts) {
  const joueur = q(hote, '#bjJoueur');
  const attente = devoilerCroupier(hote);

  return enchainer([
    // Phase 1 — la révélation. La main du joueur s'allume et prend un éclat
    // doré très court : c'est elle qui a gagné, elle doit le dire la première.
    [attente, () => {
      joueur.classList.add('gagne', 'pulseOr');
      flash(hote, 'or', 110);
      sfx('bjDing');
      secousse(hote, 4, 260);
      q(hote, '#bjCroupier').classList.add('perd');
    }],
    // Phase 2 — l'annonce et les confettis. Ils tombent du haut de l'écran, pas
    // des cartes : c'est la salle qui célèbre, pas la main.
    [300, () => {
      annonce(hote, opts.texte || 'GAGNÉ !', 'finGagne');
      sfx('bjCaching');
      emettre(hote, 'confetti', { x: 0, y: -30, l: hote.clientWidth, h: 20 }, opts.fort ? 30 : 15);
    }],
    [220, () => {
      emettre(hote, 'confetti', { x: 0, y: -30, l: hote.clientWidth, h: 20 }, opts.fort ? 26 : 10);
      // Le blackjack naturel n'est pas une victoire de plus : il secoue et il
      // pleut deux fois plus longtemps. Sans cet écart, la main la plus rare
      // du jeu se règle comme la plus banale.
      if (opts.fort) secousse(hote, 9, 420);
    }],
    // Phase 3 — le règlement. La mise remonte vers le compteur.
    [280, () => {
      if (opts.payer) opts.payer();
      volerMise(hote, q(hote, '#bjSolde'), '#f6e27a', false);
      roulerCompteur(hote, true);
      emettre(hote, 'confetti', boiteDe(hote, joueur), 12);
    }]
  ]);
}

// ---------------------------------------------------------------------------
// ÉCRAN 2 — BUST. Punition. Le joueur a poussé sa chance trop loin.
// ---------------------------------------------------------------------------
function sequenceBust(hote, opts) {
  const joueur = q(hote, '#bjJoueur');

  return enchainer([
    // Phase 1 — le temps se fige pendant que la carte de trop se pose. Le
    // ralenti dure 300 ms de vraie horloge : au-delà, ce n'est plus un
    // battement dramatique, c'est une attente.
    [0, () => {
      ralentir(hote, .3, 320);
      vignetteTeintee(hote, 'rouge', 1600);
      aberration(hote, 520);
      sfx('bjTension');
    }],
    // Phase 2 — la déflagration. Secousse violente, éclair rouge, et les
    // cartes du joueur prennent feu par le bas.
    [400, () => {
      vitesseNormale(hote);
      secousse(hote, 18, 320);
      flash(hote, 'rouge', 150);
      annonce(hote, 'BUST !', 'finBust');
      joueur.classList.add('creve');
      sfx('bjExplosion');
      sfx('bjBuzzer');
      const b = boiteDe(hote, joueur);
      emettre(hote, 'feu', { x: b.x, y: b.y + b.h * .55, l: b.l, h: b.h * .45 }, 46);
    }],
    [140, () => {
      const b = boiteDe(hote, joueur);
      emettre(hote, 'feu', { x: b.x, y: b.y + b.h * .4, l: b.l, h: b.h * .5 }, 30);
    }],
    // Phase 3 — la disparition. Les cartes grisent et s'envolent en laissant
    // de la fumée derrière elles.
    [300, () => {
      joueur.classList.add('envole');
      sfx('bjWhoosh');
      const b = boiteDe(hote, joueur);
      emettre(hote, 'fumee', { x: b.x, y: b.y, l: b.l, h: b.h }, 26);
      if (opts.payer) opts.payer();
      roulerCompteur(hote, false);
    }],
    [180, () => {
      const b = boiteDe(hote, joueur);
      emettre(hote, 'fumee', { x: b.x, y: b.y - b.h * .6, l: b.l, h: b.h }, 18);
    }]
  ]);
}

// ---------------------------------------------------------------------------
// ÉCRAN 3 — DÉFAITE. Déception, pas catastrophe : le joueur n'a rien fait de
// mal, la table a simplement été meilleure.
// ---------------------------------------------------------------------------
function sequenceDefaite(hote, opts) {
  const joueur = q(hote, '#bjJoueur'), croupier = q(hote, '#bjCroupier');
  const attente = devoilerCroupier(hote);

  return enchainer([
    // Phase 1 — c'est la main du CROUPIER qui s'allume. Sans ça, on voit sa
    // propre main s'éteindre sans comprendre ce qui l'a battue.
    [attente, () => {
      croupier.classList.add('gagne', 'pulseRouge');
      joueur.classList.add('perd', 'terne');
      sfx('bjDingGrave');
      secousse(hote, 6, 260);
    }],
    // Phase 2 — l'annonce arrive en fondu descendant, pas en fanfare.
    [380, () => {
      annonce(hote, 'PERDU...', 'finPerdu');
      sfx('bjBuzzer');
      sfx('bjSoupir');
      const b = boiteDe(hote, joueur);
      emettre(hote, 'fumee', { x: b.x, y: b.y + b.h * .3, l: b.l, h: b.h * .5 }, 16);
    }],
    // Phase 3 — la mise part vers le haut de l'écran, là où se tient la maison.
    [420, () => {
      if (opts.payer) opts.payer();
      volerMise(hote, null, '#ff6a6a', true);
      roulerCompteur(hote, false);
      flash(hote, 'rougeDoux', 120);
    }]
  ]);
}

// ---------------------------------------------------------------------------
// ÉCRAN 4 — ÉGALITÉ. Rien ne se gagne, rien ne se perd. La séquence doit être
// la seule des quatre à ne rien secouer : le calme EST l'information.
// ---------------------------------------------------------------------------
function sequenceEgalite(hote, opts) {
  const joueur = q(hote, '#bjJoueur'), croupier = q(hote, '#bjCroupier');
  const attente = devoilerCroupier(hote);
  let ligne = null;

  const annuler = enchainer([
    [attente, () => {
      joueur.classList.add('egalite', 'pulseBleu');
      croupier.classList.add('egalite', 'pulseBleu');
      flash(hote, 'bleu', 110);
      sfx('bjDingNeutre');
    }],
    [400, () => {
      annonce(hote, 'ÉGALITÉ', 'finEgalite');
      sfx('bjWhoosh');
      for (const z of [joueur, croupier]) {
        const b = boiteDe(hote, z);
        emettre(hote, 'bleu', { x: b.x - 10, y: b.y - 10, l: b.l + 20, h: b.h + 20 }, 14);
      }
    }],
    // Phase 3 — les jetons ne bougent pas. C'est le seul écran où la mise reste
    // sur le feutre, et c'est exactement ce qu'il faut montrer.
    [420, () => {
      const m = q(hote, '#bjMise');
      if (m) m.classList.add('rendue');
      ligne = sousTexte(hote, 'MISE RETOURNÉE', 'bleu');
      sfx('bjClic');
      if (opts.payer) opts.payer();
    }]
  ]);

  return () => { annuler(); if (ligne) ligne.remove(); };
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
const SEQUENCES = {
  win: sequenceVictoire,
  bust: sequenceBust,
  lose: sequenceDefaite,
  push: sequenceEgalite
};

// `opts.payer` est appelé au début de la phase de règlement : c'est là que le
// compteur doit bouger, pas à l'instant où la main se termine. Régler avant
// l'annonce ferait lire le résultat dans le solde avant de le voir sur la table.
export function jouerFin(genre, hote, opts = {}) {
  const seq = SEQUENCES[genre];
  if (!seq || !hote) return;
  nettoyerFin(hote);
  annulerCourante = seq(hote, opts);
  return annulerCourante;
}

export const playWinSequence = (hote, opts) => jouerFin('win', hote, opts);
export const playBustSequence = (hote, opts) => jouerFin('bust', hote, opts);
export const playLoseSequence = (hote, opts) => jouerFin('lose', hote, opts);
export const playPushSequence = (hote, opts) => jouerFin('push', hote, opts);

// Réexporté pour que la table n'ait qu'un module à connaître.
export { Temps };
