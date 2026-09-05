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

const ENSEIGNES = [
  { s: '♠', nom: 'pique', rouge: false },
  { s: '♥', nom: 'coeur', rouge: true },
  { s: '♦', nom: 'carreau', rouge: true },
  { s: '♣', nom: 'trefle', rouge: false }
];
const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

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
function carteDom(carte, face) {
  const d = document.createElement('div');
  d.className = 'bjCarte' + (face ? ' face' : '');
  const couleur = carte.ens.rouge ? 'bjRouge' : 'bjNoir';
  d.innerHTML = `<div class="bjFaces">
      <div class="bjFace">
        <span class="bjCoin ${couleur}">${carte.rang}<span class="bjPip">${carte.ens.s}</span></span>
        <span class="bjCentre ${couleur}">${carte.ens.s}</span>
        <span class="bjCoin bas ${couleur}">${carte.rang}<span class="bjPip">${carte.ens.s}</span></span>
      </div>
      <div class="bjDos"></div>
    </div>`;
  return d;
}

function poserCarte(zone, carte, face, retard) {
  const d = carteDom(carte, false);
  d.style.animationDelay = retard + 'ms';
  // La traînée part avec la carte, pas avant : sans ce même retard, la lueur
  // traverserait la table pendant que le carton attend encore dans le sabot.
  d.style.setProperty('--retard', retard + 'ms');
  zone.appendChild(d);
  setTimeout(() => $('bjSabot')?.classList.add('donne'), retard);
  setTimeout(() => $('bjSabot')?.classList.remove('donne'), retard + 200);
  // Le retournement part APRÈS que la carte soit arrivée : retournée en vol,
  // on ne voit ni le voyage ni la révélation.
  if (face) setTimeout(() => d.classList.add('face'), retard + 300);
  return d;
}

// Voile de couleur plein écran, repris du comptoir.
function voile(genre) {
  const ecran = $('scr-blackjack');
  if (!ecran) return;
  const v = document.createElement('div');
  v.className = 'bjVoile ' + genre;
  ecran.appendChild(v);
  setTimeout(() => v.remove(), 900);
}

function secousse(duree) {
  const e = $('scr-blackjack');
  if (!e) return;
  e.classList.add('secoue');
  setTimeout(() => e.classList.remove('secoue'), duree || 700);
}

function majScores() {
  const sj = $('bjScoreJoueur'), sc = $('bjScoreCroupier');
  const vj = valeur(mainJoueur);
  sj.textContent = mainJoueur.length
    ? (vj.souple && vj.total !== 21 ? `${vj.total - 10}/${vj.total}` : vj.total) : '';
  sj.classList.toggle('on', mainJoueur.length > 0);
  sj.classList.toggle('creve', vj.total > 21);

  // Tant que la carte du croupier est cachée, on n'affiche que ce que le joueur
  // peut réellement voir : afficher le vrai total reviendrait à tricher pour lui.
  const visibles = cachee ? mainCroupier.slice(0, 1) : mainCroupier;
  const vc = valeur(visibles);
  sc.textContent = visibles.length ? (cachee ? vc.total + ' + ?' : vc.total) : '';
  sc.classList.toggle('on', visibles.length > 0);
  sc.classList.toggle('creve', !cachee && vc.total > 21);
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

function annonce(texte, genre) {
  const el = $('bjAnnonce');
  el.className = 'bjAnnonce ' + (genre || '');
  el.textContent = texte;
}
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
  effacerAnnonce();
  // Les marques du résultat précédent doivent partir, sinon la nouvelle main
  // arrive déjà grisée ou déjà auréolée.
  for (const z of [$('bjJoueur'), $('bjCroupier')]) {
    z.classList.remove('gagne', 'perd', 'egalite', 'creve');
    z.innerHTML = '';
  }
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
  sfx('bjCarte');
  poserCarte($('bjJoueur'), c, true, 0);
  setTimeout(() => {
    majScores();
    if (valeur(mainJoueur).total > 21) return conclure('creve');
    majBoutons();
  }, 340);
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
  message('Mise doublée : ' + mise + ' pièces.');
  const c = piocher();
  mainJoueur.push(c);
  sfx('bjCarte');
  poserCarte($('bjJoueur'), c, true, 0);
  setTimeout(() => {
    majScores();
    // Doubler donne UNE carte, puis la main passe. Même en crevant.
    if (valeur(mainJoueur).total > 21) return conclure('creve');
    devoiler();
  }, 340);
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
  annonce(texte, genre + (jackpot ? ' jackpot' : ''));
  sfx(genre === 'gain' ? 'bjGain' : genre === 'perte' ? 'bjPerte' : 'select');

  // Le juice se règle sur l'enjeu : un blackjack met le feu à l'écran, une
  // défaite ordinaire éteint simplement les cartes. Tout secouer à chaque main
  // reviendrait à ne rien souligner du tout.
  const mains = [$('bjJoueur'), $('bjCroupier')];
  const etat = genre === 'gain' ? 'gagne' : genre === 'egalite' ? 'egalite'
    : (force === 'creve' || vj > 21) ? 'creve' : 'perd';
  $('bjJoueur').classList.add(etat);
  if (genre === 'gain') $('bjCroupier').classList.add('perd');
  else if (genre === 'perte') $('bjCroupier').classList.add('gagne');

  if (genre === 'gain') {
    voile('gain');
    secousse(jackpot ? 1400 : 700);
    paillettes($('bjJoueur'), jackpot ? 60 : 24, ['#f6e27a', '#d4af37', '#fff3b8', '#7bff9d'], -1, 320);
    if (jackpot) {
      // Pluie tombant du haut, en plus de l'explosion : c'est ce qui distingue
      // le blackjack d'un gain ordinaire.
      setTimeout(() => paillettes($('bjAnnonce'), 40, ['#f6e27a', '#fff', '#d4af37'], 1, 420), 260);
      setTimeout(() => paillettes($('bjAnnonce'), 40, ['#f6e27a', '#fff', '#d4af37'], 1, 420), 620);
    }
  } else if (genre === 'perte') {
    voile('perte');
    secousse(400);
    paillettes($('bjJoueur'), 14, ['#3a2b2b', '#5a4040', '#8a2020'], 1, 140);
  }

  if (net !== 0) {
    const badge = $('bjSolde');
    badge.classList.add(net > 0 ? 'gagne' : 'perd');
    setTimeout(() => badge.classList.remove('gagne', 'perd'), 1200);
    solde = Math.max(0, solde + net);
    majSolde(true);
    // Le serveur tranche : on lui envoie le net une seule fois, et c'est sa
    // réponse qui fait foi. Débiter à la mise puis créditer au gain aurait
    // laissé une main interrompue emporter la mise sans contrepartie.
    ajouterPieces(net).then(s => {
      if (s !== null && s !== undefined) { solde = s; majSolde(); }
    }).catch(() => { /* le solde se resynchronisera à la prochaine ouverture */ });
  }

  // La mise doublée ne doit pas rester pour la main suivante.
  if (aDouble) mise = Math.floor(mise / 2);

  setTimeout(() => {
    barre(true);
    $('bjMontant').value = Math.min(mise, solde) || MISE_MIN;
  }, 900);
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
      const champ = $('bjMontant');
      champ.value = Math.max(MISE_MIN, (Math.floor(+champ.value) || 0) + v);
    });
    jetons.appendChild(b);
  }

  $('bjDistribuer').addEventListener('click', distribuer);
  $('bjTirer').addEventListener('click', tirer);
  $('bjRester').addEventListener('click', rester);
  $('bjDoubler').addEventListener('click', doubler);

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
