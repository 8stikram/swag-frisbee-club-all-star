// ---------------------------------------------------------------------------
// Poker — Texas Hold'em en tête-à-tête contre la maison.
//
// Première étape : la table, la distribution, les règles d'enchères et
// l'évaluateur de mains. L'IA qui bluffe, le juice et le classement des mains
// viennent après — mais rien ici n'est provisoire : c'est cette machinerie qui
// devra tenir les paris de l'IA sans être retouchée.
//
// Le décor, les cartons et les systèmes d'effets sont ceux du blackjack. Le
// préfixe `bj` de ces classes est historique : elles décrivent la table du
// casino, pas les règles du vingt-et-un, et les recopier sous un autre nom
// aurait fait deux feutres à retoucher au lieu d'un.
//
// L'argent est arbitré par le serveur, comme au blackjack : une seule écriture
// par main, avec le solde net. Le navigateur raconte, il ne décide pas.
// ---------------------------------------------------------------------------
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { Compte, connecte, ajouterPieces } from '../reseau/compte.js';
import { sceau, message as messageCasino } from './casino.js';
import { ENSEIGNES, RANGS, carteDom } from './cartes.js';

// --- Constantes de table ----------------------------------------------------
const PETITE = 10, GROSSE = 20;
// La cave minimale : on s'assoit avec ses propres pièces ou on ne s'assoit pas.
// La maison n'avance rien — de l'argent prêté à volonté vide le poker de son
// enjeu, et rend gratuit tout ce qu'on gagne sur le terrain.
const CAVE_MIN = 100;

// ---------------------------------------------------------------------------
// Le jeu de 52
// ---------------------------------------------------------------------------
const VALEUR = { A: 14, K: 13, Q: 12, J: 11 };
const val = c => VALEUR[c.rang] || +c.rang;

function neufPaquet() {
  const p = [];
  for (const e of ENSEIGNES) for (const r of RANGS) p.push({ rang: r, ens: e });
  // Fisher-Yates : chaque permutation a la même probabilité. Trier sur un
  // tirage au sort, la méthode courte, ne la donne pas.
  for (let i = p.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

// ---------------------------------------------------------------------------
// Évaluation des mains
//
// Une main vaut `{ rang, valeurs }` : le rang dit la catégorie (0 carte haute
// → 9 quinte flush royale), les valeurs départagent deux mains de même rang, du
// critère le plus fort au plus faible. Deux tableaux comparés terme à terme
// suffisent, et évitent d'encoder la main dans un entier — un entier se compare
// plus vite mais ne se lit plus quand un départage se discute.
// ---------------------------------------------------------------------------
export const NOMS = ['Carte haute', 'Paire', 'Deux paires', 'Brelan', 'Quinte',
                     'Couleur', 'Full', 'Carré', 'Quinte flush', 'Quinte flush royale'];

export function comparer(a, b) {
  if (a.rang !== b.rang) return a.rang - b.rang;
  for (let i = 0; i < Math.max(a.valeurs.length, b.valeurs.length); i++) {
    const x = a.valeurs[i] || 0, y = b.valeurs[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export function evaluerCinq(main) {
  const v = main.map(val).sort((a, b) => b - a);
  const couleur = main.every(c => c.ens.s === main[0].ens.s);

  // Groupes par valeur, triés par effectif puis par hauteur : c'est cet ordre
  // qui donne directement les critères de départage, du carré au kicker.
  const comptes = new Map();
  for (const x of v) comptes.set(x, (comptes.get(x) || 0) + 1);
  const groupes = [...comptes.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const hauteurs = groupes.map(g => g[0]);

  let suite = 0;
  if (comptes.size === 5) {
    if (v[0] - v[4] === 4) suite = v[0];
    // La roue A-2-3-4-5 : l'as y compte pour un, et la quinte vaut 5. Sans ce
    // cas, la plus petite quinte du jeu ne serait pas reconnue du tout.
    else if (v[0] === 14 && v[1] === 5 && v[4] === 2) suite = 5;
  }

  if (couleur && suite === 14) return { rang: 9, valeurs: [14] };
  if (couleur && suite) return { rang: 8, valeurs: [suite] };
  if (groupes[0][1] === 4) return { rang: 7, valeurs: hauteurs };
  if (groupes[0][1] === 3 && groupes[1][1] === 2) return { rang: 6, valeurs: hauteurs };
  if (couleur) return { rang: 5, valeurs: v };
  if (suite) return { rang: 4, valeurs: [suite] };
  if (groupes[0][1] === 3) return { rang: 3, valeurs: hauteurs };
  if (groupes[0][1] === 2 && groupes[1][1] === 2) return { rang: 2, valeurs: hauteurs };
  if (groupes[0][1] === 2) return { rang: 1, valeurs: hauteurs };
  return { rang: 0, valeurs: v };
}

// Meilleure main de cinq parmi sept. Les vingt-et-une combinaisons sont
// énumérées telles quelles : c'est la méthode la plus lente qui existe, et à
// vingt-et-un tirages par abattage elle coûte moins qu'une microseconde. Une
// table de hachage à sept cartes serait plus rapide et impossible à relire.
export function evaluerSept(cartes) {
  let meilleure = null, retenues = null;
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 4; b++)
      for (let c = b + 1; c < 5; c++)
        for (let d = c + 1; d < 6; d++)
          for (let e = d + 1; e < 7; e++) {
            const cinq = [cartes[a], cartes[b], cartes[c], cartes[d], cartes[e]];
            const note = evaluerCinq(cinq);
            if (!meilleure || comparer(note, meilleure) > 0) { meilleure = note; retenues = cinq; }
          }
  meilleure.cartes = retenues;
  meilleure.nom = NOMS[meilleure.rang];
  return meilleure;
}

// ---------------------------------------------------------------------------
// État d'une main
// ---------------------------------------------------------------------------
const P = {
  paquet: [],
  joueur: [], ia: [], board: [],
  stackJoueur: 0, stackIA: 0,
  // `engage` = ce que chacun a mis DANS CE TOUR d'enchères. Le pot, lui, ne
  // contient que les tours clos : garder les deux séparés est ce qui rend le
  // « combien reste-t-il à payer » calculable sans historique.
  engageJoueur: 0, engageIA: 0, pot: 0,
  bouton: 'joueur',          // le bouton est aussi la petite blinde en tête-à-tête
  phase: 'attente',          // attente | preflop | flop | turn | river | abattage
  aQui: null,
  aAgi: { joueur: false, ia: false },
  derniereRelance: GROSSE,   // taille minimale de la prochaine relance
  enCours: false,
  soldeAvant: 0              // stack du joueur au début de la main, pour le net
};

const aPayer = qui => Math.max(P.engageJoueur, P.engageIA) -
                      (qui === 'joueur' ? P.engageJoueur : P.engageIA);
const stackDe = qui => qui === 'joueur' ? P.stackJoueur : P.stackIA;
const autre = qui => qui === 'joueur' ? 'ia' : 'joueur';

// Mise effective : on ne peut jamais engager plus que son tapis, et un tapis
// plus court qu'une relance reste une action légale.
function engager(qui, montant) {
  const m = Math.min(montant, stackDe(qui));
  if (qui === 'joueur') { P.stackJoueur -= m; P.engageJoueur += m; }
  else { P.stackIA -= m; P.engageIA += m; }
  return m;
}

// Fin de tour : les deux ont parlé et les engagements sont à égalité — ou l'un
// des deux est à tapis et n'a plus rien à dire.
function tourClos() {
  if (!P.aAgi.joueur || !P.aAgi.ia) return false;
  if (P.engageJoueur === P.engageIA) return true;
  return P.stackJoueur === 0 || P.stackIA === 0;
}

// Les engagements rejoignent le pot, et l'excédent non suivi revient à celui
// qui l'a mis. En tête-à-tête c'est tout ce que remplace un pot annexe : si
// l'un suit à tapis pour moins, l'autre ne peut pas gagner ce qu'il n'a pas
// risqué contre lui.
function ramasser() {
  const suivi = Math.min(P.engageJoueur, P.engageIA);
  const rendu = Math.max(P.engageJoueur, P.engageIA) - suivi;
  if (rendu > 0) {
    if (P.engageJoueur > P.engageIA) P.stackJoueur += rendu;
    else P.stackIA += rendu;
  }
  P.pot += suivi * 2;
  P.engageJoueur = P.engageIA = 0;
  P.aAgi.joueur = P.aAgi.ia = false;
  P.derniereRelance = GROSSE;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
// Chaque action renvoie une phrase pour l'historique de table ; c'est aussi ce
// que l'IA lira plus tard pour se faire une idée du joueur.
export function agir(qui, action, montant) {
  if (!P.enCours || P.aQui !== qui) return null;
  const du = aPayer(qui);
  let phrase = '';

  switch (action) {
    case 'coucher':
      P.enCours = false;
      terminer(autre(qui), 'abandon');
      return `${nom(qui)} se couche.`;

    case 'checker':
      if (du > 0) return null;                  // on ne checke pas devant une mise
      phrase = `${nom(qui)} check.`;
      break;

    case 'suivre': {
      if (du <= 0) return null;
      const m = engager(qui, du);
      phrase = `${nom(qui)} suit ${m}.`;
      break;
    }

    case 'relancer': {
      // `montant` est le total porté sur ce tour, comme à une vraie table : on
      // relance À 60, on ne relance pas DE 60. C'est la seule convention qui
      // reste juste quand les deux joueurs ont déjà engagé des sommes
      // différentes.
      const plafond = Math.max(P.engageJoueur, P.engageIA);
      const mini = plafond + Math.max(P.derniereRelance, GROSSE);
      const total = Math.max(montant | 0, mini);
      const aMettre = total - (qui === 'joueur' ? P.engageJoueur : P.engageIA);
      if (aMettre <= du) return null;           // ce n'est pas une relance
      engager(qui, aMettre);
      const nouveau = qui === 'joueur' ? P.engageJoueur : P.engageIA;
      P.derniereRelance = Math.max(nouveau - plafond, GROSSE);
      // Une relance rouvre le tour : l'adversaire doit reparler.
      P.aAgi[autre(qui)] = false;
      phrase = `${nom(qui)} relance à ${nouveau}.`;
      break;
    }

    case 'tapis': {
      // Le plafond est lu AVANT d'engager : après, il contient déjà le tapis
      // qu'on vient de poser, et on ne saurait plus si celui-ci relance ou se
      // contente de suivre pour moins que la mise en face.
      const plafondAvant = Math.max(P.engageJoueur, P.engageIA);
      const m = engager(qui, stackDe(qui));
      const nouveau = qui === 'joueur' ? P.engageJoueur : P.engageIA;
      if (nouveau > plafondAvant) {
        P.derniereRelance = Math.max(nouveau - plafondAvant, GROSSE);
        P.aAgi[autre(qui)] = false;
      }
      phrase = `${nom(qui)} fait tapis (${m}).`;
      break;
    }

    default: return null;
  }

  P.aAgi[qui] = true;
  // La maison n'observe que ça du joueur : la part de ses actions qui sont des
  // relances. Compté ici, donc jamais oublié quand une nouvelle action arrive.
  if (qui === 'joueur') {
    Lecture.actions++;
    if (action === 'relancer' || action === 'tapis') Lecture.relances++;
  }
  // L'action est annoncée ici et non chez l'appelant : les coups de la maison
  // partent d'une minuterie, et sans ça la moitié de la table jouerait en
  // silence.
  if (phrase) message(phrase);
  if (tourClos()) { ramasser(); phaseSuivante(); }
  else { P.aQui = autre(qui); rendre(); tourDeParole(); }
  return phrase;
}

const nom = qui => qui === 'joueur' ? 'Toi' : 'La maison';

// ---------------------------------------------------------------------------
// Déroulé
// ---------------------------------------------------------------------------
export function nouvelleMain() {
  if (P.enCours) return;
  // Plus de quoi payer la grosse blinde : la partie est finie, et on le dit
  // plutôt que de distribuer une main qu'on ne peut pas jouer.
  if (P.stackJoueur < GROSSE) {
    message(`Il te faut ${GROSSE} pièces pour la grosse blinde. Retourne en gagner sur le terrain.`);
    sfx('deny');
    return;
  }
  if (P.stackIA < GROSSE) rasseoir();

  P.paquet = neufPaquet();
  P.joueur = [P.paquet.pop(), P.paquet.pop()];
  P.ia = [P.paquet.pop(), P.paquet.pop()];
  P.board = [];
  P.pot = 0; P.engageJoueur = P.engageIA = 0;
  P.aAgi.joueur = P.aAgi.ia = false;
  P.derniereRelance = GROSSE;
  P.phase = 'preflop';
  P.enCours = true;
  // Le résultat précédent doit partir AVANT la donne : sinon on distribue sous
  // un « GAGNÉ » qui parle de la main d'avant.
  $('pkAnnonce').className = 'pkAnnonce hidden';
  for (const id of ['pkJoueur', 'pkIA', 'pkBoard']) $(id).innerHTML = '';
  P.soldeAvant = P.stackJoueur;
  // Le bouton change de main à chaque coup : sinon le même joueur paierait
  // toujours la petite blinde, et l'avantage de position ne tournerait jamais.
  P.bouton = autre(P.bouton);

  // En tête-à-tête, le bouton EST la petite blinde et parle le premier avant le
  // flop, puis le dernier après. C'est la règle qui surprend le plus, et
  // l'inverser rendrait toute la stratégie fausse.
  engager(P.bouton, PETITE);
  engager(autre(P.bouton), GROSSE);
  P.aQui = P.bouton;

  rendre();
  // La parole ne part qu'une fois les cartes posées. Lancer la maison dans la
  // foulée de la donne la ferait parler par-dessus sa propre distribution.
  setTimeout(tourDeParole, 900);
}

function phaseSuivante() {
  const brulee = () => P.paquet.pop();          // une carte brûlée avant chaque tirage
  if (P.phase === 'preflop') {
    brulee(); P.board.push(P.paquet.pop(), P.paquet.pop(), P.paquet.pop());
    P.phase = 'flop';
  } else if (P.phase === 'flop') {
    brulee(); P.board.push(P.paquet.pop());
    P.phase = 'turn';
  } else if (P.phase === 'turn') {
    brulee(); P.board.push(P.paquet.pop());
    P.phase = 'river';
  } else { abattage(); return; }

  // Après le flop, c'est le hors-bouton qui parle en premier.
  P.aQui = autre(P.bouton);
  rendre();
  // Deux tapis se sont croisés : plus personne n'a de décision à prendre, on
  // déroule le board jusqu'à l'abattage.
  if (P.stackJoueur === 0 || P.stackIA === 0) { setTimeout(phaseSuivante, 600); return; }
  tourDeParole();
}

function abattage() {
  P.phase = 'abattage';
  P.enCours = false;
  const mj = evaluerSept([...P.joueur, ...P.board]);
  const mi = evaluerSept([...P.ia, ...P.board]);
  const d = comparer(mj, mi);
  terminer(d > 0 ? 'joueur' : d < 0 ? 'ia' : 'partage', 'abattage', mj, mi);
}

function terminer(gagnant, cause, mj, mi) {
  P.enCours = false;
  ramasser();
  if (gagnant === 'partage') {
    // Le jeton impair va au joueur : un demi-jeton n'existe pas, et l'écrire au
    // compte en fraction casserait le solde.
    const part = Math.floor(P.pot / 2);
    P.stackJoueur += P.pot - part; P.stackIA += part;
  } else if (gagnant === 'joueur') P.stackJoueur += P.pot;
  else P.stackIA += P.pot;
  P.pot = 0;

  // Une seule écriture serveur par main, avec le net : c'est ce qui empêche
  // qu'une main interrompue emporte la mise sans contrepartie.
  const net = P.stackJoueur - P.soldeAvant;
  if (net !== 0 && connecte()) {
    // C'est la réponse du serveur qui fait foi : le tapis affiché s'y aligne,
    // sinon deux mains perdues d'affilée pourraient laisser miser des pièces
    // que le compte n'a plus.
    ajouterPieces(net).then(s => {
      if (s !== null && s !== undefined) { P.stackJoueur = s; rendre(); }
    }).catch(() => { /* resynchronisé à la prochaine ouverture */ });
  }

  P.phase = 'attente';
  rendre();
  // La maison abat toujours, même quand elle emporte le coup sur un couchage.
  // Une vraie table ne montrerait pas — mais ici il n'y a personne à qui cacher
  // quoi que ce soit, et savoir si elle bluffait est tout le plaisir du poker
  // en solitaire. Après `rendre()`, sinon la phase « attente » les recacherait.
  devoilerMaison();
  annoncer(gagnant, cause, mj, mi);
}

// ---------------------------------------------------------------------------
// La maison
//
// Elle ne voit pas les cartes du joueur. Ce qu'elle sait, elle le calcule : à
// chaque décision, elle simule quelques centaines de mains où l'adversaire tient
// n'importe quoi et où le board se termine au hasard, et compte combien elle en
// gagne. Ce nombre — son équité — est la seule chose qui la fait parler.
//
// Une table de forces écrite à la main aurait été plus rapide, mais il aurait
// fallu la remplir pour 169 mains de départ ET pour chaque texture de flop. La
// simulation donne le tirage quinte et le tirage couleur gratuitement, alors
// qu'une table les oublie toujours.
// ---------------------------------------------------------------------------
const cle = c => c.rang + c.ens.s;

export function equite(main, board, n) {
  const connues = new Set([...main, ...board].map(cle));
  const reste = [];
  for (const e of ENSEIGNES) for (const r of RANGS) {
    const c = { rang: r, ens: e };
    if (!connues.has(cle(c))) reste.push(c);
  }
  const aTirer = 5 - board.length;
  let points = 0;
  for (let i = 0; i < n; i++) {
    // Fisher-Yates partiel : on ne mélange que les cartes dont on a besoin. Un
    // mélange complet du paquet à chaque échantillon coûterait dix fois plus
    // cher pour exactement le même tirage.
    for (let k = 0; k < aTirer + 2; k++) {
      const j = k + ((Math.random() * (reste.length - k)) | 0);
      [reste[k], reste[j]] = [reste[j], reste[k]];
    }
    const b = board.concat(reste.slice(2, 2 + aTirer));
    const d = comparer(evaluerSept([...main, ...b]), evaluerSept([reste[0], reste[1], ...b]));
    points += d > 0 ? 1 : d === 0 ? .5 : 0;
  }
  return points / n;
}

// Ce qu'elle retient du joueur : rien de plus que la part de ses actions qui
// sont des relances. Elle ne mémorise pas les mains — elle n'a pas le droit de
// les voir — et cette seule statistique suffit à se méfier de quelqu'un qui
// relance tout le temps.
const Lecture = { actions: 0, relances: 0 };

function tourDeParole() {
  if (!P.enCours || P.aQui !== 'ia') return;
  setTimeout(() => {
    if (!P.enCours || P.aQui !== 'ia') return;
    decider();
  }, 700);
}

function decider() {
  const du = aPayer('ia');
  const pot = P.pot + P.engageJoueur + P.engageIA;
  // Plus d'échantillons quand il reste des cartes à venir : c'est là que
  // l'incertitude est grande. À la river, l'équité ne dépend plus que de la
  // main de l'adversaire.
  const e = equite(P.ia, P.board, P.board.length === 5 ? 300 : 220);

  // Méfiance mesurée : un joueur qui relance sans arrêt dit moins par ses
  // relances, donc on suit un peu plus large. Le correctif est plafonné à neuf
  // points d'équité — au-delà, elle deviendrait imbattable par entêtement.
  const agressif = Lecture.actions >= 6 ? Lecture.relances / Lecture.actions : .25;
  const force = Math.min(.95, Math.max(.05, e + (agressif - .25) * .12));

  // Face à un joueur presque à sec, elle range ses bluffs : l'achever au culot
  // n'a aucun intérêt.
  const serre = P.stackJoueur < 100;
  const chanceBluff = serre ? .08 : .22;

  if (du === 0) {
    // Personne n'a misé. On mise avec un vrai jeu, ou on tente un coup. Le seuil
    // est bas exprès : checker derrière avec une main correcte laisse voir la
    // carte suivante gratuitement, et c'est le cadeau le plus cher du poker.
    if (force > .55 || (force < .40 && Math.random() < chanceBluff)) return miser(pot, force);
    return agir('ia', 'checker');
  }

  // La cote du pot : ce qu'il faut payer rapporté à ce qu'on peut gagner. Suivre
  // n'a de sens que si l'on gagne plus souvent que cette fraction — c'est la
  // seule règle du poker qui ne se discute pas, et l'ancien seuil « un tiers du
  // tapis » l'ignorait complètement. D'où les couchages à répétition.
  const cote = du / (pot + du);
  if (force > .66 && P.stackIA > du) return miser(pot, force);
  // Une marge d'un point seulement : suivre dès qu'on est favori de la cote,
  // c'est mathématiquement juste, et l'ancienne marge de trois points laissait
  // filer des mains gagnantes sur du bruit d'échantillonnage.
  if (force > cote + .01) return agir('ia', 'suivre');
  // Une main faible mais pas ridicule, devant une petite mise : de temps en
  // temps, on relance dessus plutôt que de la jeter.
  if (!serre && force > cote - .10 && Math.random() < chanceBluff) return miser(pot, force);
  return agir('ia', 'coucher');
}

function miser(pot, force) {
  const plafond = Math.max(P.engageJoueur, P.engageIA);
  const mini = plafond + Math.max(P.derniereRelance, GROSSE);
  // Sept dixièmes de pot avec un vrai jeu, quatre en bluff : un bluff qui mise
  // exactement comme une main forte se lit trop bien à la longue, et l'inverse
  // laisse partir la valeur. L'écart est volontairement étroit — deux tailles
  // trop différentes et le joueur lit la maison en trois mains.
  const vise = plafond + Math.round(pot * (force > .6 ? .7 : .45) / 10) * 10;
  const total = Math.max(mini, vise);
  if (total >= P.stackIA + P.engageIA) return agir('ia', 'tapis');
  return agir('ia', 'relancer', total);
}

// ---------------------------------------------------------------------------
// La caisse
// ---------------------------------------------------------------------------
// Le tapis du joueur EST son solde : ce qu'il pose sur la table, il l'a gagné
// sur le terrain. Rien n'est avancé, rien n'est offert.
function asseoir() {
  P.stackJoueur = (connecte() && Compte.profil) ? (Compte.profil.pieces || 0) : 0;
  // La maison s'assoit avec autant que le joueur : un tête-à-tête où l'un des
  // deux a dix fois le tapis de l'autre n'est plus du poker, c'est une attente.
  // Ce n'est pas une avance — ce tapis-là n'appartient à personne.
  P.stackIA = P.stackJoueur;
}

// La maison, elle, recave sans limite : elle ne joue pas ses pièces, elle
// représente le casino. Le joueur, non — quand il n'a plus de quoi payer la
// grosse blinde, la partie s'arrête.
function rasseoir() {
  if (P.stackIA < GROSSE) { P.stackIA = P.stackJoueur; message('La maison recave.'); }
  rendre();
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
let messageMinuterie = null;
function message(texte) {
  const el = $('pkMsg');
  if (!el) return;
  el.textContent = texte;
  el.classList.remove('hidden');
  clearTimeout(messageMinuterie);
  messageMinuterie = setTimeout(() => el.classList.add('hidden'), 3000);
}

function annoncer(gagnant, cause, mj, mi) {
  const el = $('pkAnnonce');
  if (!el) return;
  let t;
  if (cause === 'abandon') t = gagnant === 'joueur' ? 'LA MAISON SE COUCHE' : 'TU TE COUCHES';
  else if (gagnant === 'partage') t = 'PARTAGE — ' + mj.nom;
  else if (gagnant === 'joueur') t = 'GAGNÉ — ' + mj.nom;
  else t = 'PERDU — ' + mi.nom;
  el.textContent = t;
  el.className = 'pkAnnonce ' + (gagnant === 'joueur' ? 'gain' : gagnant === 'ia' ? 'perte' : 'egalite');
}

// Les cartes n'existent en DOM que quand elles sont réellement en jeu : le
// board se remplit au fil des tirages, et une carte déjà posée n'est pas
// redessinée, sinon elle rejouerait son arrivée à chaque tour d'enchères.
function poser(zone, cartes, face) {
  const el = $(zone);
  if (!el) return;
  for (let i = el.children.length; i < cartes.length; i++) {
    const d = carteDom(cartes[i], false);
    d.style.animationDelay = `${i * 160}ms, ${i * 160 + 500 + (Math.random() * 900 | 0)}ms`;
    d.style.setProperty('--retard', i * 160 + 'ms');
    el.appendChild(d);
    setTimeout(() => sfx('bjCarte'), i * 160);
    if (face) setTimeout(() => d.classList.add('face'), i * 160 + 300);
  }
}

// Les cartes de la maison se retournent une à une, avec un temps entre les
// deux : retournées ensemble, on lit le résultat sans voir la révélation.
function devoilerMaison() {
  let retard = 120;
  for (const c of $('pkIA').children) {
    if (c.classList.contains('face')) continue;
    setTimeout(() => { c.classList.add('face'); sfx('bjRevele'); }, retard);
    retard += 260;
  }
}

function rendre() {
  poser('pkJoueur', P.joueur, true);
  poser('pkIA', P.ia, P.phase === 'abattage');
  poser('pkBoard', P.board, true);
  if (P.phase === 'abattage')
    for (const c of $('pkIA').children) c.classList.add('face');

  $('pkStackJoueur').textContent = P.stackJoueur;
  $('pkStackIA').textContent = P.stackIA;
  $('pkPotVal').textContent = P.pot + P.engageJoueur + P.engageIA;
  $('pkEngageJoueur').textContent = P.engageJoueur || '';
  $('pkEngageIA').textContent = P.engageIA || '';
  $('pkSoldeVal').textContent = P.stackJoueur;
  majBoutons();
}

function majBoutons() {
  const monTour = P.enCours && P.aQui === 'joueur';
  const du = aPayer('joueur');
  const plafond = Math.max(P.engageJoueur, P.engageIA);
  const mini = plafond + Math.max(P.derniereRelance, GROSSE);

  $('pkBarre').classList.toggle('hidden', !monTour);
  $('pkNouvelle').classList.toggle('hidden', P.enCours);
  if (!monTour) return;

  $('pkCheck').classList.toggle('hidden', du > 0);
  $('pkCall').classList.toggle('hidden', du === 0);
  $('pkCall').textContent = `SUIVRE ${Math.min(du, P.stackJoueur)}`;
  // Relancer n'a de sens que si le tapis permet d'atteindre le minimum légal :
  // en dessous, il ne reste que suivre ou faire tapis.
  $('pkRaise').disabled = P.stackJoueur + P.engageJoueur < mini;
  const champ = $('pkMontant');
  champ.min = mini;
  champ.max = P.stackJoueur + P.engageJoueur;
  if (+champ.value < mini) champ.value = Math.min(mini, +champ.max);
}

// ---------------------------------------------------------------------------
// Ouverture
// ---------------------------------------------------------------------------
// Renvoie faux si la table refuse le joueur : c'est le comptoir qui l'annonce,
// puisque c'est encore lui qui est à l'écran. Ouvrir une table où l'on ne peut
// pas s'asseoir, pour y lire le refus, serait un aller-retour pour rien.
export function ouvrirPoker() {
  if (!connecte()) {
    messageCasino('Connecte-toi : les pièces vivent sur ton compte.');
    return false;
  }
  const pieces = (Compte.profil && Compte.profil.pieces) || 0;
  if (pieces < CAVE_MIN) {
    messageCasino(`Cave minimum : ${CAVE_MIN} pièces. Tu en as ${pieces} — la maison n'avance rien.`);
    return false;
  }
  P.enCours = false;
  P.phase = 'attente';
  P.joueur = []; P.ia = []; P.board = [];
  P.pot = 0; P.engageJoueur = P.engageIA = 0;
  for (const id of ['pkJoueur', 'pkIA', 'pkBoard']) $(id).innerHTML = '';
  $('pkAnnonce').className = 'pkAnnonce hidden';
  asseoir();
  rendre();
  showScreen('poker');
  return true;
}

// ---------------------------------------------------------------------------
// Câblage
// ---------------------------------------------------------------------------
(function cabler() {
  if (!$('pkNouvelle')) return;

  // Le décor de la table est celui du blackjack, sceaux compris.
  const zone = $('pkSceaux');
  if (zone) for (const [classe, branches, runes] of [['a', 5, 8], ['b', 7, 7], ['c', 5, 12]]) {
    const d = document.createElement('div');
    d.className = 'casSceau ' + classe;
    d.innerHTML = sceau(50, branches, runes);
    zone.appendChild(d);
  }
  const tapis = $('pkSceauTapis');
  if (tapis) tapis.innerHTML = sceau(50, 5, 12);

  const actions = [
    ['pkNouvelle', () => nouvelleMain()],
    ['pkFold', () => agir('joueur', 'coucher')],
    ['pkCheck', () => agir('joueur', 'checker')],
    ['pkCall', () => agir('joueur', 'suivre')],
    ['pkRaise', () => agir('joueur', 'relancer', +$('pkMontant').value)],
    ['pkAllin', () => agir('joueur', 'tapis')]
  ];
  for (const [id, fn] of actions) {
    const b = $(id);
    if (!b) continue;
    b.addEventListener('click', () => {
      if (b.disabled) return;
      sfx('select');
      fn();
      rendre();
    });
  }

  // Le classement des mains, monté ici plutôt qu'écrit en dur dans la page :
  // les exemples se colorent avec la même règle que les vraies cartes, donc un
  // pique restera noir et un cœur rouge sans qu'on ait à le répéter dix fois.
  const EXEMPLES = [
    ['A♠', 'J♦', '9♣', '6♥', '3♠'], ['K♠', 'K♦', '9♣', '6♥', '3♠'],
    ['K♠', 'K♦', '7♣', '7♥', '3♠'], ['8♠', '8♦', '8♣', 'J♥', '4♠'],
    ['9♠', '8♦', '7♣', '6♥', '5♠'], ['A♥', 'J♥', '8♥', '5♥', '2♥'],
    ['Q♠', 'Q♦', 'Q♣', '4♥', '4♠'], ['5♠', '5♦', '5♣', '5♥', 'K♠'],
    ['9♥', '8♥', '7♥', '6♥', '5♥'], ['A♠', 'K♠', 'Q♠', 'J♠', '10♠']
  ];
  const liste = $('pkReglesListe');
  if (liste) NOMS.forEach((n, i) => {
    const cartes = EXEMPLES[i].map(t => {
      const rouge = t.includes('♥') || t.includes('♦');
      return `<span class="${rouge ? 'bjRouge' : 'bjNoir'}">${t}</span>`;
    }).join('');
    liste.insertAdjacentHTML('beforeend',
      `<li><b class="nom">${n}</b><span class="exemple">${cartes}</span></li>`);
  });

  // Il se ferme au clic à côté autant qu'à la croix — chercher le bouton pour
  // sortir d'une aide est le meilleur moyen de ne plus jamais l'ouvrir.
  const popup = $('pkRegles');
  $('pkAide')?.addEventListener('click', () => { sfx('select'); popup.classList.remove('hidden'); });
  popup?.addEventListener('click', ev => {
    if (ev.target === popup || ev.target.closest('[data-fermer]')) popup.classList.add('hidden');
  });
})();
