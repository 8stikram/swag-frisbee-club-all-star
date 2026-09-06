// ---------------------------------------------------------------------------
// Blackjack.
//
// Les règles sont celles d'une vraie table, sans arrangement en faveur du
// joueur : six jeux mélangés, le croupier tire jusqu'à 17 et reste dessus,
// blackjack naturel payé 3:2. C'est ce qui donne son avantage à la maison, et
// c'est ce qui rend les pièces gagnées sur le terrain réellement risquées ici.
//
// L'argent est arbitré par le serveur (voir reseau/compte.js) : on ne débite et
// on ne crédite qu'une fois par main, avec le solde net. Le navigateur ne fait
// que raconter le résultat, il ne le décide pas.
// ---------------------------------------------------------------------------
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { Compte, connecte, ajouterPieces } from '../reseau/compte.js';
import { sceau, paillettes } from './casino.js';
import { jouerFin, nettoyerFin } from './fins.js';
import { ralentir, flash, emettre, boiteDe } from './effets.js';
import { ENSEIGNES, RANGS, carteDom } from './cartes.js';

const NB_JEUX = 6;
const MISE_MIN = 10;
// On remélange sous 20 % du sabot. Le faire à sabot vide laisserait compter les
// cartes jusqu'à la dernière, ce qu'aucune table réelle n'autorise.
const SEUIL_MELANGE = .2;

// --- Le sabot ---------------------------------------------------------------
let sabot = [];

function neufSabot() {
  const s = [];
  for (let j = 0; j < NB_JEUX; j++)
    for (const e of ENSEIGNES)
      for (const r of RANGS) s.push({ rang: r, ens: e });
  // Mélange de Fisher-Yates : chaque permutation a la même probabilité. Trier
  // sur un tirage au sort, la méthode courte, ne la donne pas.
  for (let i = s.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

function piocher() {
  if (sabot.length < NB_JEUX * 52 * SEUIL_MELANGE) sabot = neufSabot();
  return sabot.pop();
}

// --- Valeur d'une main ------------------------------------------------------
// Renvoie le meilleur total qui ne crève pas, et dit si un As y compte encore
// pour 11 — c'est cette souplesse qui distingue « 17 » de « 7 ou 17 ».
export function valeur(main) {
  let total = 0, as = 0;
  for (const c of main) {
    if (c.rang === 'A') { as++; total += 11; }
    else if (c.rang === 'J' || c.rang === 'Q' || c.rang === 'K') total += 10;
    else total += +c.rang;
  }
  // Chaque As ramené de 11 à 1 retire dix points, tant qu'on dépasse.
  while (total > 21 && as > 0) { total -= 10; as--; }
  return { total, souple: as > 0 };
}

const estBlackjack = main => main.length === 2 && valeur(main).total === 21;

// --- État de la partie ------------------------------------------------------
let mise = MISE_MIN;
let mainJoueur = [], mainCroupier = [];
let enCours = false, cachee = true, aDouble = false;
let solde = 0;

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------
// `vitesse` règle l'arrivée : `lent` pour la carte qui fait crever, `rapide`
// pour un tirage en cours de main. La donne initiale garde la vitesse normale —
// c'est le seul moment où l'on distribue quatre cartes de suite, et les presser
// ferait un paquet qui se déverse au lieu d'une donne.
//
// La durée est posée ICI, en ligne, plutôt que par une classe ajoutée après
// coup : changer une durée d'animation en vol recalcule la progression, et la
// carte repartirait en arrière au moment précis où on la regarde tomber.
const DUREES = { lent: '1.1s, 4.6s', rapide: '.24s, 4.6s' };

function poserCarte(zone, carte, face, retard, vitesse) {
  const d = carteDom(carte, false);
  if (DUREES[vitesse]) d.style.animationDuration = DUREES[vitesse];
  // Deux valeurs : l'arrivée attend son tour dans la donne, le flottement ne
  // démarre qu'une fois la carte posée — et avec un décalage propre à chacune,
  // sinon toute la main respire au même rythme et l'image paraît vibrer.
  d.style.animationDelay = `${retard}ms, ${retard + 480 + (Math.random() * 900 | 0)}ms`;
  // La traînée part avec la carte, pas avant : sans ce même retard, la lueur
  // traverserait la table pendant que le carton attend encore dans le sabot.
  d.style.setProperty('--retard', retard + 'ms');
  zone.appendChild(d);
  setTimeout(() => $('bjSabot')?.classList.add('donne'), retard);
  setTimeout(() => $('bjSabot')?.classList.remove('donne'), retard + 200);
  // La main encaisse l'arrivée : sans ce contrecoup, la carte se pose sans
  // peser sur celles qui l'attendaient.
  setTimeout(() => {
    zone.classList.remove('impact');
    void zone.offsetWidth;
    zone.classList.add('impact');
    setTimeout(() => zone.classList.remove('impact'), 220);
  }, retard + 260);
  // Le retournement part APRÈS que la carte soit arrivée : retournée en vol,
  // on ne voit ni le voyage ni la révélation.
  if (face) setTimeout(() => d.classList.add('face'), retard + 300);
  // Une poignée d'éclats d'or à l'atterrissage d'un tirage. Sur la donne
  // initiale on s'en passe : quatre cartes qui étincellent d'affilée, ce n'est
  // plus un accent, c'est un fond.
  if (vitesse === 'rapide') setTimeout(() => {
    const ecran = $('scr-blackjack');
    if (ecran) emettre(ecran, 'trainee', boiteDe(ecran, d), 12, '#f6e27a');
  }, retard + 240);
  return d;
}

// Des jetons poussés vers la mise, depuis le bas de l'écran. Sert au doublement :
// voir le compteur passer de 100 à 200 ne dit rien ; voir les jetons partir de
// devant soi et rejoindre la pile, si.
function pousserJetons(vers, n) {
  const ecran = $('scr-blackjack');
  const cible = $(vers);
  if (!ecran || !cible || cible.classList.contains('hidden')) return;
  const c = boiteDe(ecran, cible);
  const depart = { x: ecran.clientWidth * .5, y: ecran.clientHeight * .93 };

  for (let i = 0; i < n; i++) {
    const j = document.createElement('div');
    j.className = 'bjJetonVol bjJetonMise';
    j.style.cssText = `left:${depart.x - 13}px;top:${depart.y - 13}px;` +
                      'width:26px;height:26px;--rune:#f6e27a;';
    ecran.appendChild(j);
    const dx = (c.x + c.l * .5) - depart.x, dy = (c.y + c.h * .5) - depart.y;
    const anim = j.animate([
      { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .55}px, ${dy * .55 - 40}px) rotate(200deg) scale(1.05)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) rotate(430deg) scale(.6)`, opacity: 0 }
    ], { duration: 380 + i * 70, easing: 'cubic-bezier(.35,0,.3,1)', delay: i * 60 });
    // La traînée est semée depuis la position réelle du jeton, image par image :
    // calculée à l'avance sur la courbe, elle se décale dès que l'animation
    // prend du retard, et les éclats volent à côté du jeton.
    const semer = () => {
      if (anim.playState === 'finished') return;
      const b = boiteDe(ecran, j);
      emettre(ecran, 'trainee', { x: b.x + 8, y: b.y + 8, l: 10, h: 10 }, 1, '#f6e27a');
      requestAnimationFrame(semer);
    };
    requestAnimationFrame(semer);
    anim.onfinish = () => {
      j.remove();
      if (i === n - 1) { flash(ecran, 'or', 100); sfx('bjClic'); }
    };
  }
}

// La mise posée sur le feutre. Elle existe pour que les fins de main aient
// quelque chose à faire voler : voir le compteur changer tout seul, c'est lire
// un bilan ; voir les jetons traverser la table, c'est encaisser ou payer.
function poserMise(montant) {
  const el = $('bjMise');
  if (!el) return;
  el.classList.remove('hidden', 'partie', 'rendue');
  el.querySelector('b').textContent = montant;
  // La pile monte avec la mise, jusqu'à quatre jetons : une hauteur fixe ne
  // dirait pas si on joue le minimum ou tout ce qu'on a.
  const n = montant >= 500 ? 4 : montant >= 100 ? 3 : montant >= 50 ? 2 : 1;
  el.querySelector('.pile').innerHTML = '<i></i>'.repeat(n);
}

// Le jeton part vraiment vers la mise. Cliquer pour voir un nombre changer dans
// un champ, c'est remplir un formulaire ; voir le jeton traverser la table,
// c'est miser.
function envoyerJeton(source, valeurJeton) {
  const ecran = $('scr-blackjack'), cible = $('bjMontant');
  if (!ecran || !cible) return;
  const s = source.getBoundingClientRect(), c = cible.getBoundingClientRect();
  const e = ecran.getBoundingClientRect();
  const vol = document.createElement('div');
  vol.className = 'bjJetonVol';
  vol.style.cssText =
    `left:${s.left - e.left}px;top:${s.top - e.top}px;width:${s.width}px;height:${s.height}px;` +
    `font-size:${getComputedStyle(source).fontSize};`;
  vol.style.setProperty('--rune', getComputedStyle(source).getPropertyValue('--rune'));
  vol.textContent = valeurJeton;
  ecran.appendChild(vol);
  vol.animate([
    { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
    { transform: `translate(${(c.left + c.width / 2) - (s.left + s.width / 2)}px,` +
                 `${(c.top + c.height / 2) - (s.top + s.height / 2)}px) scale(.25) rotate(420deg)`,
      opacity: 0 }
  ], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => {
    vol.remove();
    cible.classList.remove('bond');
    void cible.offsetWidth;
    cible.classList.add('bond');
    setTimeout(() => cible.classList.remove('bond'), 320);
  };
}

// Onde partant du point cliqué : le bouton doit rendre la pression, pas
// seulement changer d'état.
function onde(bouton, ev) {
  const r = bouton.getBoundingClientRect();
  const o = document.createElement('span');
  o.className = 'onde';
  const d = Math.max(r.width, r.height);
  o.style.cssText = `width:${d}px;height:${d}px;` +
    `left:${(ev.clientX || r.left + r.width / 2) - r.left}px;` +
    `top:${(ev.clientY || r.top + r.height / 2) - r.top}px;`;
  bouton.appendChild(o);
  setTimeout(() => o.remove(), 460);
}

// Le score chauffe en approchant de 21 : c'est le chiffre que le joueur fixe,
// il doit porter la tension avant que la musique ou le texte s'en chargent.
function chaleur(badge, total, creve) {
  badge.classList.remove('chaud', 'brulant', 'parfait', 'creve');
  if (creve) badge.classList.add('creve');
  else if (total === 21) badge.classList.add('parfait');
  else if (total >= 19) badge.classList.add('brulant');
  else if (total >= 17) badge.classList.add('chaud');
}

// Un bond à chaque changement de valeur, pas à chaque appel : sinon le badge
// tressaute quand on ne fait que le redessiner.
function bondir(badge, avant) {
  if (badge.textContent === avant) return;
  badge.classList.remove('bond');
  void badge.offsetWidth;
  badge.classList.add('bond');
}

function majScores() {
  const sj = $('bjScoreJoueur'), sc = $('bjScoreCroupier');
  const avantJ = sj.textContent, avantC = sc.textContent;
  const vj = valeur(mainJoueur);
  sj.textContent = mainJoueur.length
    ? (vj.souple && vj.total !== 21 ? `${vj.total - 10}/${vj.total}` : vj.total) : '';
  sj.classList.toggle('on', mainJoueur.length > 0);
  chaleur(sj, vj.total, vj.total > 21);
  bondir(sj, avantJ);

  // Tant que la carte du croupier est cachée, on n'affiche que ce que le joueur
  // peut réellement voir : afficher le vrai total reviendrait à tricher pour lui.
  const visibles = cachee ? mainCroupier.slice(0, 1) : mainCroupier;
  const vc = valeur(visibles);
  sc.textContent = visibles.length ? (cachee ? vc.total + ' + ?' : vc.total) : '';
  sc.classList.toggle('on', visibles.length > 0);
  chaleur(sc, cachee ? 0 : vc.total, !cachee && vc.total > 21);
  bondir(sc, avantC);
}

// Le solde monte ou descend en défilant, jamais d'un coup. Un chiffre qui
// saute se lit comme un rafraîchissement ; un chiffre qui court se lit comme
// de l'argent qui bouge — et c'est ce qu'on veut faire ressentir.
let defilement = null;
function majSolde(anime) {
  const el = $('bjSoldeVal');
  if (!el) return;
  clearInterval(defilement);
  const depart = +el.textContent || 0;
  if (!anime || depart === solde) { el.textContent = solde; return; }
  const pas = Math.max(1, Math.ceil(Math.abs(solde - depart) / 18));
  const sens = solde > depart ? 1 : -1;
  let v = depart;
  defilement = setInterval(() => {
    v += pas * sens;
    if ((sens > 0 && v >= solde) || (sens < 0 && v <= solde)) {
      v = solde; clearInterval(defilement); defilement = null;
    }
    el.textContent = v;
  }, 28);
}

let effacerMsg = null;
function message(texte) {
  const el = $('bjMsg');
  if (!el) return;
  el.textContent = texte;
  el.classList.remove('hidden');
  clearTimeout(effacerMsg);
  effacerMsg = setTimeout(() => el.classList.add('hidden'), 2600);
}

// Le texte des fins est posé par casino/fins.js ; il ne reste ici que de quoi
// l'effacer entre deux mains.
function effacerAnnonce() { $('bjAnnonce').className = 'bjAnnonce hidden'; }

function barre(miser) {
  $('bjBarreMise').classList.toggle('hidden', !miser);
  $('bjBarreActions').classList.toggle('hidden', miser);
}

// ---------------------------------------------------------------------------
// Déroulé d'une main
// ---------------------------------------------------------------------------
function distribuer() {
  if (enCours) return;
  if (!connecte()) { sfx('deny'); message('Connecte-toi : les pièces vivent sur ton compte.'); return; }

  const saisie = Math.floor(+$('bjMontant').value || 0);
  if (saisie < MISE_MIN) { sfx('deny'); message(`Mise minimum : ${MISE_MIN} pièces.`); return; }
  if (saisie > solde) { sfx('deny'); message('Pas assez de pièces pour cette mise.'); return; }

  mise = saisie;
  mainJoueur = []; mainCroupier = [];
  enCours = true; cachee = true; aDouble = false;
  // Coupe net la fin précédente et efface ses marques : sans ça la nouvelle
  // main arrive déjà grisée, et une séquence encore en vol continue d'écrire
  // par-dessus celle qui commence.
  nettoyerFin($('scr-blackjack'));
  effacerAnnonce();
  for (const z of [$('bjJoueur'), $('bjCroupier')]) z.innerHTML = '';
  poserMise(mise);
  barre(false);

  // L'ordre d'une vraie table : joueur, croupier, joueur, croupier — et la
  // seconde du croupier reste face cachée.
  const donne = [
    { zone: 'bjJoueur', main: mainJoueur, face: true },
    { zone: 'bjCroupier', main: mainCroupier, face: true },
    { zone: 'bjJoueur', main: mainJoueur, face: true },
    { zone: 'bjCroupier', main: mainCroupier, face: false }
  ];
  donne.forEach((d, i) => {
    const c = piocher();
    d.main.push(c);
    setTimeout(() => sfx('bjCarte'), i * 260);
    poserCarte($(d.zone), c, d.face, i * 260);
  });

  setTimeout(() => {
    majScores();
    // Blackjack servi : la main est jouée, il n'y a rien à décider.
    if (estBlackjack(mainJoueur) || estBlackjack(mainCroupier)) { devoiler(); return; }
    majBoutons();
  }, 4 * 260 + 320);
}

function majBoutons() {
  // Doubler ne se propose que sur les deux premières cartes, et seulement si le
  // solde peut encaisser la seconde mise.
  const peutDoubler = mainJoueur.length === 2 && solde >= mise * 2;
  $('bjDoubler').disabled = !peutDoubler;
  $('bjTirer').disabled = false;
  $('bjRester').disabled = false;
}

function tirer() {
  if (!enCours) return;
  const c = piocher();
  mainJoueur.push(c);
  // On sait AVANT de la poser que cette carte fait crever : c'est ce qui permet
  // de la faire arriver au ralenti, et de laisser le joueur la voir tomber au
  // lieu de découvrir le résultat une fois qu'elle est déjà à plat.
  const creve = valeur(mainJoueur).total > 21;
  if (creve) ralentir($('scr-blackjack'), .3, 900);
  sfx('bjCarte');
  poserCarte($('bjJoueur'), c, true, 0, creve ? 'lent' : 'rapide');
  setTimeout(() => {
    majScores();
    if (creve) return conclure('creve');
    majBoutons();
  }, creve ? 1000 : 340);
}

function rester() {
  if (!enCours) return;
  devoiler();
}

function doubler() {
  if (!enCours || mainJoueur.length !== 2) return;
  if (solde < mise * 2) { sfx('deny'); message('Pas assez de pièces pour doubler.'); return; }
  aDouble = true;
  mise *= 2;
  poserMise(mise);
  // Les jetons partent de devant soi et rejoignent la pile. Voir le compteur
  // passer de cent à deux cents ne dit rien ; voir la mise doubler sur le
  // feutre, si — et c'est le geste le plus engageant de la table.
  pousserJetons('bjMise', 3);
  message('Mise doublée : ' + mise + ' pièces.');
  const c = piocher();
  mainJoueur.push(c);
  // Même traitement qu'au tirage : si la carte fait crever, elle arrive au
  // ralenti. Doubler et crever est le moment le plus dur de la table, il ne
  // doit pas défiler plus vite qu'un tirage ordinaire.
  const creve = valeur(mainJoueur).total > 21;
  if (creve) ralentir($('scr-blackjack'), .3, 900);
  sfx('bjCarte');
  poserCarte($('bjJoueur'), c, true, 0, creve ? 'lent' : 'rapide');
  setTimeout(() => {
    majScores();
    // Doubler donne UNE carte, puis la main passe. Même en crevant.
    if (creve) return conclure('creve');
    devoiler();
  }, creve ? 1000 : 340);
}

// Le croupier retourne sa carte, puis tire jusqu'à 17. Il reste sur 17, souple
// ou dur — c'est la règle demandée, et elle est plus favorable au joueur que le
// tirage sur 17 souple.
function devoiler() {
  $('bjTirer').disabled = true;
  $('bjRester').disabled = true;
  $('bjDoubler').disabled = true;
  cachee = false;
  const dos = $('bjCroupier').children[1];
  // Un temps de suspense avant le retournement : révélée dans la foulée du
  // clic, la carte cachée n'est plus une révélation, c'est un affichage.
  setTimeout(() => {
    sfx('bjRevele');
    if (dos) {
      dos.classList.add('face', 'revele');
      paillettes(dos, 10, ['#f6e27a', '#d4af37', '#c99cf0'], -1, 120);
      // L'éclair part à MI-RETOURNEMENT, pas au clic : la carte met une demi-
      // seconde à pivoter, et un flash au départ éclaire un dos qu'on connaît
      // déjà au lieu de la face qu'on attend.
      setTimeout(() => {
        flash($('scr-blackjack'), 'or', 110);
        emettre($('scr-blackjack'), 'trainee', boiteDe($('scr-blackjack'), dos), 14, '#f6e27a');
      }, 250);
      setTimeout(() => dos.classList.remove('revele'), 600);
    }
    majScores();
    setTimeout(tourCroupier, 620);
  }, 320);
}

function tourCroupier() {
  // Si le joueur a crevé, le croupier n'a plus rien à jouer : la main est finie.
  if (valeur(mainJoueur).total > 21) return conclure('creve');
  const v = valeur(mainCroupier);
  if (v.total < 17) {
    const c = piocher();
    mainCroupier.push(c);
    sfx('bjCarte');
    poserCarte($('bjCroupier'), c, true, 0);
    setTimeout(() => { majScores(); setTimeout(tourCroupier, 420); }, 340);
    return;
  }
  conclure(null);
}

// ---------------------------------------------------------------------------
// Résultat et paiement
// ---------------------------------------------------------------------------
function conclure(force) {
  enCours = false;
  cachee = false;
  majScores();

  const vj = valeur(mainJoueur).total, vc = valeur(mainCroupier).total;
  const bjJoueur = estBlackjack(mainJoueur), bjCroupier = estBlackjack(mainCroupier);

  // `net` est ce qui s'ajoute au solde, mise comprise. Perdre, c'est -mise ;
  // gagner 1:1, c'est +mise ; un blackjack naturel rapporte une fois et demie.
  let net = 0, texte = '', genre = '';

  if (force === 'creve' || vj > 21) {
    net = -mise; texte = 'BUST !'; genre = 'perte';
  } else if (bjJoueur && !bjCroupier) {
    net = Math.floor(mise * 1.5); texte = 'BLACKJACK !'; genre = 'gain';
  } else if (bjCroupier && !bjJoueur) {
    net = -mise; texte = 'BLACKJACK CROUPIER'; genre = 'perte';
  } else if (bjJoueur && bjCroupier) {
    net = 0; texte = 'ÉGALITÉ'; genre = 'egalite';
  } else if (vc > 21) {
    net = mise; texte = 'LE CROUPIER CRÈVE'; genre = 'gain';
  } else if (vj > vc) {
    net = mise; texte = 'GAGNÉ !'; genre = 'gain';
  } else if (vj < vc) {
    net = -mise; texte = 'PERDU'; genre = 'perte';
  } else {
    net = 0; texte = 'ÉGALITÉ'; genre = 'egalite';
  }

  const jackpot = bjJoueur && !bjCroupier;
  const joueurCreve = force === 'creve' || vj > 21;

  // Quatre issues, quatre séquences : voir casino/fins.js. Tout le visuel de la
  // fin de main vit là-bas — ici on ne fait qu'arbitrer et payer. Les avoir
  // gardés ensemble aurait rendu impossible de rejouer une fin au banc d'essai
  // sans sabot ni compte.
  const type = joueurCreve ? 'bust'
    : genre === 'gain' ? 'win'
    : genre === 'perte' ? 'lose' : 'push';

  // Le règlement est passé en rappel : la séquence le déclenche à sa phase de
  // paiement, pas à l'instant du résultat. Payer d'abord ferait lire l'issue
  // dans le compteur avant de la voir sur la table.
  const payer = () => {
    if (net === 0) return;
    solde = Math.max(0, solde + net);
    majSolde(true);
    // Le serveur tranche : on lui envoie le net une seule fois, et c'est sa
    // réponse qui fait foi. Débiter à la mise puis créditer au gain aurait
    // laissé une main interrompue emporter la mise sans contrepartie.
    ajouterPieces(net).then(s => {
      if (s !== null && s !== undefined) { solde = s; majSolde(); }
    }).catch(() => { /* le solde se resynchronisera à la prochaine ouverture */ });
  };

  jouerFin(type, $('scr-blackjack'), { payer, texte, fort: jackpot, mise, net });

  // La mise doublée ne doit pas rester pour la main suivante.
  if (aDouble) mise = Math.floor(mise / 2);

  // On laisse les trois phases se dérouler avant de rendre la main. Rouvrir la
  // barre de mise pendant que les cartes brûlent invite à relancer par-dessus
  // sa propre défaite.
  setTimeout(() => {
    barre(true);
    $('bjMise')?.classList.add('hidden');
    $('bjMontant').value = Math.min(mise, solde) || MISE_MIN;
  }, 2200);
}

// ---------------------------------------------------------------------------
// Ouverture
// ---------------------------------------------------------------------------
export function ouvrirBlackjack() {
  if (!sabot.length) sabot = neufSabot();
  solde = (connecte() && Compte.profil) ? (Compte.profil.pieces || 0) : 0;
  mainJoueur = []; mainCroupier = [];
  enCours = false; cachee = true;
  $('bjJoueur').innerHTML = ''; $('bjCroupier').innerHTML = '';
  // Une séquence de fin peut encore tourner si on a quitté la table au milieu
  // d'une main : on la coupe avant de rouvrir, sinon elle reprend la parole
  // sur un tapis vide.
  nettoyerFin($('scr-blackjack'));
  $('bjMise')?.classList.add('hidden');
  effacerAnnonce();
  majScores(); majSolde();
  barre(true);
  $('bjMontant').value = Math.max(MISE_MIN, Math.min(mise, solde || MISE_MIN));
  showScreen('blackjack');
}

// ---------------------------------------------------------------------------
// Câblage
// ---------------------------------------------------------------------------
(function cabler() {
  if (!$('bjDistribuer')) return;

  // Les sceaux du comptoir, repris à l'identique : la table appartient au
  // casino, elle ne doit pas avoir sa propre magie.
  const zoneSceaux = $('bjSceaux');
  if (zoneSceaux) for (const [classe, branches, runes] of [['a', 5, 8], ['b', 7, 7], ['c', 5, 12]]) {
    const d = document.createElement('div');
    d.className = 'casSceau ' + classe;
    d.innerHTML = sceau(50, branches, runes);
    zoneSceaux.appendChild(d);
  }

  // Sceau gravé dans le feutre, sous les cartes. Douze runes plutôt que huit :
  // à cette taille, une couronne clairsemée se lit comme des accidents.
  const sceauTapis = $('bjSceauTapis');
  if (sceauTapis) sceauTapis.innerHTML = sceau(50, 5, 12);

  // Jetons d'obsidienne cerclés d'or, chacun marqué d'une rune : les jetons
  // rayés d'un casino de bord de route juraient avec les sceaux du fond.
  const RUNES_JETON = { 10: 'ᚦ', 50: 'ᚱ', 100: 'ᛉ', 500: 'ᛟ' };
  const jetons = $('bjJetons');
  for (const v of [10, 50, 100, 500]) {
    const b = document.createElement('button');
    b.className = 'bjJeton j' + v;
    b.innerHTML = `<span><b>${v}</b><em>${RUNES_JETON[v]}</em></span>`;
    b.title = v + ' pièces';
    // Un jeton AJOUTE à la mise plutôt qu'il ne la remplace : c'est le geste
    // d'une vraie table, où l'on empile.
    b.addEventListener('click', () => {
      if (enCours) return;
      sfx('select');
      envoyerJeton(b, v);
      const champ = $('bjMontant');
      champ.value = Math.max(MISE_MIN, (Math.floor(+champ.value) || 0) + v);
    });
    jetons.appendChild(b);
  }

  for (const [id, fn] of [['bjDistribuer', distribuer], ['bjTirer', tirer],
                          ['bjRester', rester], ['bjDoubler', doubler]]) {
    const b = $(id);
    b.addEventListener('click', ev => {
      if (b.disabled) return;
      onde(b, ev);
      paillettes(b, 5, ['#f6e27a', '#fff3b8'], -1, 100);
      fn();
    });
  }

  // Espace coupe court à ce qui est en train de jouer. Sur une table où l'on
  // enchaîne les mains, subir chaque fois la même distribution use vite ; la
  // durée d'une animation ne doit jamais être le prix d'une décision.
  window.addEventListener('keydown', ev => {
    if (ev.code !== 'Space') return;
    if ($('scr-blackjack').classList.contains('hidden')) return;
    ev.preventDefault();
    for (const el of document.querySelectorAll('.scr-blackjack .bjCarte')) {
      el.style.animation = 'none';
      el.classList.add('face');
    }
    // Le solde saute directement à sa valeur : on saute l'animation, pas le
    // résultat.
    clearInterval(defilement);
    majSolde(false);
  }, true);
})();
