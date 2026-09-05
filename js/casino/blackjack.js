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

// --- Le dos des cartes ------------------------------------------------------
// Trame géométrique, médaillon à pentagramme, couronne de runes et fleurons
// d'angle, en or sur bordeaux. Des rayures en diagonale — ce qu'il y avait
// avant — donnaient un dos de bloc-notes : c'est le motif construit, avec son
// centre et ses angles, qui fait la carte de jeu.
//
// Tout est calculé ici plutôt que déclaré en CSS parce que le pentagramme et
// la couronne demandent de la trigonométrie. Et pas de <pattern> ni de
// clipPath : leur id serait répété par les soixante cartes du sabot, et toutes
// pointeraient vers celui de la première — qui disparaît à chaque donne. Le
// débordement est déjà coupé par overflow:hidden sur .bjDos.
const RUNES_DOS = ['ᚦ', 'ᚱ', 'ᛉ', 'ᛟ', 'ᛃ', 'ᚨ', 'ᛗ', 'ᛖ'];

const dosSvg = (() => {
  const L = 100, H = 150;                 // ratio 2:3, comme le carton
  const pt = (cx, cy, r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
  };

  // Trame : deux familles de diagonales croisées, plus un point d'or à chaque
  // nœud. Sans les nœuds, les diagonales seules redeviennent des rayures.
  let trame = '', noeuds = '';
  for (let d = -H; d < L + H; d += 9) {
    trame += `M${d} 0 L${d + H} ${H} M${d} ${H} L${d + H} 0 `;
  }
  for (let y = 9; y < H; y += 9)
    for (let x = ((y / 9) % 2 ? 4.5 : 9); x < L; x += 9)
      noeuds += `<circle cx="${x}" cy="${y}" r=".7"/>`;

  // Pentagramme du médaillon : un sommet sur deux, d'un seul trait.
  const cx = L / 2, cy = H / 2;
  const sommets = [];
  for (let i = 0; i < 5; i++) sommets.push(pt(cx, cy, 14, i * 72));
  const ordre = [];
  for (let i = 0, j = 0; i < 5; i++, j = (j + 2) % 5) ordre.push(sommets[j]);
  const etoile = 'M' + ordre.map(p => p.join(' ')).join(' L') + ' Z';

  let couronne = '';
  RUNES_DOS.forEach((g, i) => {
    const [x, y] = pt(cx, cy, 25.5, i * 360 / RUNES_DOS.length);
    couronne += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
                 font-size="5.4" fill="#e8c565" opacity=".72">${g}</text>`;
  });

  // Fleurons d'angle : une petite étoile à quatre branches, dessinée en losange
  // creusé pour rester lisible à la taille d'une carte.
  const fleuron = (x, y) => {
    const b = 4.6, t = 1.3;
    return `<path d="M${x} ${y - b} Q${x + t} ${y - t} ${x + b} ${y}` +
           ` Q${x + t} ${y + t} ${x} ${y + b} Q${x - t} ${y + t} ${x - b} ${y}` +
           ` Q${x - t} ${y - t} ${x} ${y - b} Z" fill="#d4af37" opacity=".5"/>`;
  };

  return `<svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none">
    <path d="${trame}" fill="none" stroke="#d4af37" stroke-width=".55" opacity=".26"/>
    <g fill="#f6e27a" opacity=".3">${noeuds}</g>
    <rect x="4" y="4" width="${L - 8}" height="${H - 8}" rx="4"
          fill="none" stroke="#d4af37" stroke-width="1.6" opacity=".9"/>
    <rect x="8.5" y="8.5" width="${L - 17}" height="${H - 17}" rx="2.5"
          fill="none" stroke="#d4af37" stroke-width=".6" opacity=".55"/>
    ${fleuron(16, 22)}${fleuron(L - 16, 22)}${fleuron(16, H - 22)}${fleuron(L - 16, H - 22)}
    <circle cx="${cx}" cy="${cy}" r="30" fill="#3a0707" opacity=".82"/>
    <circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="#d4af37" stroke-width=".9" opacity=".75"/>
    <circle cx="${cx}" cy="${cy}" r="20" fill="none" stroke="#d4af37" stroke-width=".5"
            stroke-dasharray="2 2.4" opacity=".6"/>
    ${couronne}
    <path d="${etoile}" fill="none" stroke="#f6e27a" stroke-width="1.1" opacity=".85"/>
    <circle cx="${cx}" cy="${cy}" r="2.2" fill="#f6e27a" opacity=".9"/>
  </svg>`;
})();

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
      <div class="bjDos">${dosSvg}</div>
    </div>`;
  return d;
}

function poserCarte(zone, carte, face, retard) {
  const d = carteDom(carte, false);
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
  const joueurCreve = force === 'creve' || vj > 21;
  const croupierCreve = !joueurCreve && vc > 21;
  $('bjJoueur').classList.add(
    joueurCreve ? 'creve' : genre === 'gain' ? 'gagne' : genre === 'egalite' ? 'egalite' : 'perd');
  // Le croupier qui crève brûle comme le joueur : c'est le même événement, et
  // le grisage d'une défaite ordinaire le rendait invisible — on gagnait sans
  // comprendre pourquoi.
  if (croupierCreve) $('bjCroupier').classList.add('creve');
  else if (genre === 'gain') $('bjCroupier').classList.add('perd');
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
