import { G, makePlayer, comment } from '../game/state.js';
import { Reseau, envoyer, connecte, surMessage, mesurerPing, fermer } from './connexion.js';
import { Compte, monId } from './compte.js';
import { setMapId, getMapId } from '../data/maps.js';
import { activerEcho, viderEcho, marquerInvite, viderPopups } from './echo.js';
import { construireTerminal } from '../data/hack-terminal.js';
import { sfx, setMuffled } from '../audio/audio.js';
import { effetDeBut, popupDistant } from '../game/fx.js';
import { COURT, CX, DISC_RADIUS } from '../core/constants.js';
import { clamp } from '../core/utils.js';
import { semerAlea, graineNeuve } from '../core/alea.js';
import { getSkinId } from '../data/skins.js';

// ---------------------------------------------------------------------------
// Circulation d'un match sur la liaison directe.
//
// L'un des deux fait foi : celui qui héberge. Lui seul simule le jeu ; l'autre
// lui envoie ce qu'il veut faire et affiche ce qu'on lui répond. Sans cette
// règle, les deux écrans finiraient par ne plus être d'accord sur qui a
// attrapé le disque — le pire désaccord possible dans ce jeu.
//
// Conséquence assumée : l'hôte joue sans délai, l'invité avec le sien. C'est
// le prix à payer pour n'avoir aucun serveur à faire tourner.
// ---------------------------------------------------------------------------

export const Partie = {
  active: false, role: null, dernierEtat: 0, adversaire: null, monTerrain: null, monPerso: null,
  // Santé de la prédiction de l'invité, lisible au panneau admin. Un écart qui
  // monte ou des sauts qui s'accumulent se voient ici avant de se voir à l'œil.
  diag: { na: -1, motif: '', histo: 0, ecart: 0, ecartMax: 0, sauts: 0, perdus: 0 },
  // Comptes des paquets, visibles depuis le panneau admin. Sans eux, une
  // liaison qui ne transporte plus rien ressemble exactement à une liaison
  // qui va bien : le canal reste ouvert, le ping répond, et le jeu se fige.
  envoyes: 0, recus: 0, jetes: 0,
  // Vrai quand l'adversaire est prédit plutôt qu'interpolé. Bascule seule
  // selon le ping mesuré — utile pour voir, depuis le panneau admin, laquelle
  // des deux liaisons on regarde réellement.
  predictionAdversaire: false,
  // Ce que l'adversaire survole en ce moment sur l'écran des terrains — pas
  // encore arrêté, juste de quoi afficher son avatar sur la bonne vignette.
  voteAdversaire: null,
  // L'invité a cliqué pour passer le rejeu. Seul l'hôte le déroule, donc seule
  // sa boucle peut donner suite ; elle consomme le drapeau et le rabaisse.
  skipDemande: false,
  // L'hôte a annoncé la fin du match : la boucle doit monter l'écran final.
  finDeMatch: false
};

// Le canal est volontairement non ordonné et sans retransmission : une
// intention périmée n'a aucune valeur, la renvoyer indéfiniment en aurait
// encore moins. Mais sans numéro d'ordre, un paquet en retard écrase un plus
// récent — et l'image saute en arrière. Chaque envoi est donc numéroté, et ce
// qui arrive en retard est jeté.
let numeroEnvoi = 0;
let dernierEtatRecu = -1, dernierEtatFiche = -1;

// Un paquet est bon s'il est plus récent que le dernier retenu. Mais un grand
// bond en arrière n'est pas un retard : c'est que l'autre a recommencé à
// compter — revanche, reconnexion, nouveau match. Sans cette tolérance, tous
// les paquets suivants étaient jetés pour toujours et la partie se figeait sur
// une liaison pourtant ouverte, ce qui est le pire des symptômes à diagnostiquer.
const BOND_EN_ARRIERE = 120;   // deux secondes à soixante envois par seconde
function aJour(n, dernier) {
  if (n === undefined) return true;
  if (n > dernier) return true;
  return (dernier - n) > BOND_EN_ARRIERE;
}

// Compteurs des gestes ponctuels. Un booléen dans un seul paquet disparaît
// avec lui quand il se perd : un compteur, lui, se rattrape au paquet suivant.
// Incrémentés à l'appui (commandes.js, demanderGeste), pas à l'envoi comme
// avant le chantier 10 : l'invité exécute désormais aussi ces gestes en local,
// tout de suite, et c'est appliquerActions qui efface le drapeau au moment de
// les jouer. Compter ici, au moment de l'envoi, l'aurait trouvé déjà effacé
// une fois sur deux — les deux lecteurs se seraient disputé le même drapeau.
const gestes = { pl: 0, fe: 0, sp: 0, ad: 0 };
let gestesVus = null;

// ---------------------------------------------------------------------------
// Fenêtre d'arbitrage d'un geste prédit (chantier 10).
//
// L'invité joue désormais ses gestes à l'image de l'appui, sans attendre. Mais
// l'hôte, lui, ne le sait pas encore : pendant un demi-aller-retour, il
// continue d'envoyer un état où le geste n'a PAS eu lieu — disque encore en
// main, plongeon pas commencé. Adopter cet état écraserait la prédiction à
// l'image suivante, puis la rétablirait au paquet d'après : le geste
// clignoterait, ce qui est très exactement pire que de l'avoir attendu.
//
// On retient donc le numéro de la première fiche partie APRÈS le geste. Tant
// que l'hôte n'accuse pas réception d'au moins ce numéro (`na`), on garde sa
// propre version de ce que le geste a changé. Dès qu'il l'accuse, sa réponse
// tient compte du geste : on redevient obéissant, d'un coup, sans transition.
//
// La comparaison est un `>=` et non un `===`, délibérément : si cette fiche
// précise se perd, la suivante porte la même intention et l'hôte tranche sur
// elle. Un seul paquet reçu après le geste suffit donc toujours à refermer la
// fenêtre — il n'y a pas de blocage possible tant que la liaison vit, et
// quand elle meurt c'est le chantier 13 qui s'en occupe.
// ---------------------------------------------------------------------------
let gestePose = false;     // un geste vient d'être joué, la fiche n'est pas encore partie
let gesteEnAttente = -1;   // numéro de la fiche qui le porte, une fois partie

// Appelée à l'appui, avant toute exécution locale : le compteur part vers
// l'hôte même si le geste se révèle sans effet de ce côté-ci.
export function compterGeste(cle) {
  if (gestes[cle] !== undefined) gestes[cle]++;
  gestePose = true;
}

// Le tir n'est pas un compteur : l'hôte le déduit du relâchement de `tir` dans
// la fiche. Il ouvre la même fenêtre pour autant — c'est même le geste pour
// lequel elle compte le plus, puisqu'il change qui tient le disque.
export function signalerTirLocal() {
  gestePose = true;
  // Le disque vient de quitter la main ici. La dernière position faisant
  // autorité le montre encore dedans : s'en servir pour recaler le disque le
  // ramènerait dans la main pendant toute la fenêtre.
  discAutorite.valide = false;
}

// L'invité n'envoie que sa fiche d'intentions : cinq nombres et quatre
// compteurs, déjà à jour — voir compterGeste ci-dessus.
function fichePourLeReseau(c) {
  return {
    t: 'c', n: ++numeroEnvoi,
    dx: +c.dep.x.toFixed(2), dy: +c.dep.y.toFixed(2),
    vx: +c.visee.x.toFixed(3), vy: +c.visee.y.toFixed(3),
    tir: c.tir ? 1 : 0, dash: c.dash ? 1 : 0,
    pl: gestes.pl, fe: gestes.fe, sp: gestes.sp, ad: gestes.ad
  };
}

// L'hôte renvoie ce qu'il faut pour dessiner la scène, rien de plus : pas de
// particules, pas de traînée — l'invité les recrée lui-même à l'affichage.
function etatPourLeReseau() {
  const j = p => [Math.round(p.x), Math.round(p.y), p.face, Math.round(p.meter),
    p.score, p.holding ? 1 : 0, +p.charge.toFixed(2),
    +p.diveT.toFixed(2), +p.dashT.toFixed(2), +(p.sixT || 0).toFixed(1),
    // Vitesse du joueur : utile surtout pour p1, que l'invité prédit désormais
    // au lieu de l'interpoler — voir extrapolerJoueur(). Envoyée pour les deux
    // par souci de forme unique, le coût est de deux nombres.
    Math.round(p.vx), Math.round(p.vy),
    // Tout ce qui modifie un déplacement doit voyager, sinon les deux machines
    // ne font pas bouger le même personnage. Sans ces sept champs, un
    // étourdissement ne figeait pas l'invité et l'ulti de Cyberleek ne lui
    // inversait rien : il continuait de courir normalement chez lui pendant
    // qu'on le tenait immobile en face. Sept nombres de plus, deux joueurs,
    // trente fois par seconde — le coût est négligeable, l'écart ne l'était pas.
    +(p.stun || 0).toFixed(2), +(p.diveDown || 0).toFixed(2), +(p.dizzy || 0).toFixed(2),
    +(p.piratage || 0).toFixed(2), +(p.bouclierT || 0).toFixed(2),
    +(p.feintT || 0).toFixed(2), +(p.lunge || 0).toFixed(2)];
  const d = G.disc;
  return {
    t: 'e', n: ++numeroEnvoi,
    // Numéro de la dernière fiche de l'invité prise en compte. C'est la clé de
    // sa prédiction : sans lui, il ne saurait pas à quel instant de SON passé
    // comparer la position qu'on lui renvoie, et ne pourrait rien corriger.
    na: refInvite.n,
    // Position de l'invité telle qu'elle était juste après la prise en compte
    // de la fiche `na`, et non telle qu'elle est maintenant. La nuance fait
    // tout : entre les deux, l'hôte a continué de simuler, et comparer sa
    // position actuelle à une prédiction datée de la fiche `na` ajoutait un
    // aller-retour de course à chaque mesure — un écart permanent d'environ
    // quatre-vingts pixels que la correction s'épuisait à poursuivre.
    ra: [Math.round(refInvite.x), Math.round(refInvite.y)],
    p1: j(G.p1), p2: j(G.p2),
    // La vitesse du disque voyage avec sa position, et c'est ce qui permet à
    // l'invité de le faire voler chez lui. Sans elle, il ne pourrait que le
    // recaler sur une position déjà vieille de quelques dizaines de
    // millisecondes — soit, à neuf cents pixels par seconde, quarante pixels en
    // arrière à chaque paquet.
    d: [Math.round(d.x), Math.round(d.y), +d.spin.toFixed(2), d.kind, d.heldBy ? (d.heldBy === G.p1 ? 1 : 2) : 0,
      Math.round(d.vx), Math.round(d.vy)],
    st: G.state,
    // Le vainqueur. Il ne se devine pas : l'invité ne compte pas les points,
    // donc son `G.winner` reste vide et sa fin de match n'arrivait jamais — il
    // voyait la partie s'interrompre puis la liaison se fermer, sans écran de
    // victoire ni de défaite.
    w: G.winner ? (G.winner === G.p1 ? 1 : 2) : 0,
    // Le ralenti. Il ne se devine pas : un but, une réception parfaite ou un
    // ulti le font tomber à 0,15 chez l'hôte, et l'invité qui l'ignorait
    // prédisait son joueur six fois trop vite pendant toute la mise en scène,
    // avant de se faire rappeler d'un coup. C'est exactement aux moments les
    // plus intenses du match que son déplacement n'avait plus rien à voir.
    ts: +G.timescale.toFixed(3),
    // Les bruitages produits depuis le paquet précédent. L'invité s'arrête
    // avant toute la physique du match, donc aucun rebond, aucune réception,
    // aucun but ne faisait le moindre bruit chez lui : il jouait en silence.
    ev: viderEcho(),
    // Les leurres du Tir Matilda. Trois disques de plus à l'écran, et c'est
    // tout l'intérêt de l'ultime de Leon : l'invité n'en voyait aucun, donc
    // il voyait un seul disque là où il fallait deviner lequel était vrai.
    // Envoyés en positions plutôt que simulés : ils vivent deux secondes, et
    // les recevoir soixante fois par seconde coûte moins qu'un désaccord.
    dc: G.decoys.length ? G.decoys.map(o => [Math.round(o.x), Math.round(o.y)]) : 0,
    // Cercles bonus du Stadium. L'invité ne simule pas les zones du tout : il
    // n'en voyait aucun, sur un terrain dont c'est la mécanique principale.
    ce: G.cercles.length ? G.cercles.map(c => [Math.round(c.x), Math.round(c.y), +c.t.toFixed(2)]) : 0,
    // Secousse et flash. Cosmétiques, oui, mais ce sont eux qui font sentir un
    // but ou un contre — sans eux les temps forts du match sont plats.
    fx: [Math.round(G.shake), +G.flash.toFixed(2)],
    // Le commentateur, seulement quand il vient de dire quelque chose de neuf.
    // Ses phrases naissent des buts et des réceptions, que l'invité n'arbitre
    // pas : il jouait donc un match quasi muet.
    cm: commentaireNeuf(),
    // Les messages à l'écran. Même seau que les sons, même raison : presque
    // tous naissent d'une décision d'arbitre que l'invité ne prend pas.
    po: viderPopups(),
    // Les mises en scène des ultimes. Elles ne voyageaient pas du tout :
    // l'invité voyait la jauge de l'adversaire se vider et son personnage
    // subir des effets, sans jamais voir ce qui les provoquait — ni la jambe
    // qui s'écrase, ni la cloche, ni le terminal du piratage, ni la tempête.
    sc: scenesPourLeReseau()
  };
}

// Les scènes en cours, sous forme compacte. Zéro quand il n'y en a aucune,
// ce qui est le cas la plupart du temps : le paquet ne grossit que pendant
// les quelques secondes où il se passe quelque chose.
// Les joueurs y deviennent un numéro de côté — une référence ne traverse pas
// un fil — et le texte du terminal de piratage n'est pas transmis : il est
// décoratif et l'invité en fabrique un de son côté.
// Le commentateur ne se renvoie pas soixante fois par seconde : on ne transmet
// une phrase qu'une fois, à sa sortie. Sans ce garde-fou, chaque paquet
// aurait porté le même texte pendant les deux secondes et demie de son
// affichage — et l'aurait rejoué à l'infini chez l'invité.
let dernierCommentaire = null;
function commentaireNeuf() {
  const c = G.comment;
  if (!c || c.text === dernierCommentaire) return 0;
  dernierCommentaire = c.text;
  return c.text;
}

function scenesPourLeReseau() {
  const c = G.cine, b = G.bell, h = G.hack, l = G.leg, t = G.tempete;
  const ba = G.banner, zo = G.zoom;
  if (!c && !b && !h && !l && !t && !ba && !zo) return 0;
  const q = p => (p === G.p1 ? 1 : (p === G.p2 ? 2 : 0));
  return {
    // Le bandeau qui annonce l'ultime, et le zoom du Perfect Dive. Ils vivent
    // une seconde à peine et n'existent que pendant une scène : ils voyagent
    // donc avec elle, pas dans le paquet ordinaire.
    ba: ba ? [ba.text, ba.color, +ba.t.toFixed(2), ba.dur] : 0,
    zo: zo ? [+zo.t.toFixed(2), zo.dur, Math.round(zo.x), Math.round(zo.y)] : 0,
    c: c ? [+c.t.toFixed(2), q(c.p), c.launched ? 1 : 0, c.ult] : 0,
    b: b ? [q(b.owner), b.side, +b.t.toFixed(2), b.dur, Math.round(b.x), Math.round(b.y)] : 0,
    h: h ? [+h.t.toFixed(2), h.dur, q(h.source), q(h.cible)] : 0,
    l: l ? [Math.round(l.x), Math.round(l.yTarget), l.phase, +l.t.toFixed(2), q(l.caster), l.side] : 0,
    t: t ? [+t.t.toFixed(2), +t.dur.toFixed(2)] : 0
  };
}

// Pose chez l'invité les scènes décrites par l'hôte. On met à jour en place
// quand la scène existe déjà, au lieu de la recréer : la recréer à chaque
// paquet rembobinerait son animation soixante fois par seconde, et la cloche
// resonnerait à chaque fois.
function appliquerScenes(sc) {
  const j = n => (n === 1 ? G.p1 : (n === 2 ? G.p2 : null));
  if (!sc) { G.cine = null; G.bell = null; G.hack = null; G.leg = null; G.tempete = null; G.banner = null; G.zoom = null; return; }
  const ba = sc.ba;
  if (ba) { if (!G.banner || G.banner.text !== ba[0]) G.banner = { text: ba[0], color: ba[1], t: ba[2], dur: ba[3] };
    else G.banner.t = ba[2]; }
  else G.banner = null;
  const zo = sc.zo;
  if (zo) { if (!G.zoom) G.zoom = { t: zo[0], dur: zo[1], x: zo[2], y: zo[3] };
    else { G.zoom.t = zo[0]; G.zoom.dur = zo[1]; G.zoom.x = zo[2]; G.zoom.y = zo[3]; } }
  else G.zoom = null;
  const c = sc.c;
  if (c) { if (!G.cine) G.cine = { t: 0, p: j(c[1]), launched: !!c[2], ult: c[3] };
    G.cine.t = c[0]; G.cine.p = j(c[1]); G.cine.launched = !!c[2]; G.cine.ult = c[3]; }
  else G.cine = null;
  const b = sc.b;
  if (b) { if (!G.bell) G.bell = { owner: j(b[0]), side: b[1], t: 0, dur: b[3], x: b[4], y: b[5], ring: 0, bal: 0, sens: undefined };
    G.bell.owner = j(b[0]); G.bell.side = b[1]; G.bell.t = b[2]; G.bell.dur = b[3]; G.bell.x = b[4]; G.bell.y = b[5]; }
  else G.bell = null;
  const h = sc.h;
  if (h) { if (!G.hack) G.hack = { t: 0, dur: h[1], source: j(h[2]), cible: j(h[3]), lignes: construireTerminal() };
    G.hack.t = h[0]; G.hack.dur = h[1]; G.hack.source = j(h[2]); G.hack.cible = j(h[3]); }
  else G.hack = null;
  const l = sc.l;
  if (l) { if (!G.leg) G.leg = { x: l[0], yTarget: l[1], phase: l[2], t: 0, caster: j(l[4]), side: l[5], aiDodges: false };
    G.leg.x = l[0]; G.leg.yTarget = l[1]; G.leg.phase = l[2]; G.leg.t = l[3]; G.leg.caster = j(l[4]); G.leg.side = l[5]; }
  else G.leg = null;
  const t = sc.t;
  if (t) { if (!G.tempete) G.tempete = { t: 0, dur: t[1] }; G.tempete.t = t[0]; G.tempete.dur = t[1]; }
  else G.tempete = null;
}

// ---------------------------------------------------------------------------
// Tampon d'interpolation.
//
// L'invité n'affiche pas le dernier état reçu : il affiche un instant
// légèrement passé, encadré par deux états réels, et interpole entre les deux.
//
// C'est ce qui remplace l'ancienne « poursuite », qui courait après la dernière
// position connue : quand les paquets arrivaient irrégulièrement — et ils
// arrivent toujours irrégulièrement — la vitesse à l'écran devenait
// irrégulière elle aussi. C'était le saccadé permanent, indépendamment du ping.
//
// Le prix est un retard fixe et assumé. Un retard fixe se compense en jouant ;
// un retard qui varie, non.
// ---------------------------------------------------------------------------
// Retard d'affichage de l'adversaire. Il était figé à 100 ms, un réglage
// dimensionné pour un réseau bien pire que celui qu'on vise : entre joueurs
// d'un même pays, c'est du délai offert. Il se mesure donc, au lieu d'être
// supposé — la seule chose qu'il doit couvrir, c'est l'irrégularité d'arrivée
// des paquets, et rien d'autre.
const RETARD_MIN = 25, RETARD_PLAFOND = 120;
let retardAffichage = 60;
const ecarts = [];
let derniereArrivee = 0;

// Appelée à chaque état reçu. On garde les quarante derniers intervalles et on
// se cale sur le 95e centile : couvrir le pire écart observé rendrait le tampon
// otage d'un unique hoquet, couvrir la moyenne le ferait manquer une fois sur
// deux.
function mesurerGigue(t) {
  if (derniereArrivee) {
    ecarts.push(t - derniereArrivee);
    if (ecarts.length > 40) ecarts.shift();
  }
  derniereArrivee = t;
  if (ecarts.length < 8) return;
  const tri = ecarts.slice().sort((a, b) => a - b);
  const p95 = tri[Math.min(tri.length - 1, Math.floor(tri.length * .95))];
  const vise = clamp(p95 + PERIODE_ETAT, RETARD_MIN, RETARD_PLAFOND);
  // On y va doucement : un tampon qui change d'un coup fait accélérer ou
  // reculer l'adversaire à l'écran, ce qui se voit bien plus qu'un retard.
  retardAffichage += (vise - retardAffichage) * .05;
}

export function retardCourant() { return Math.round(retardAffichage); }

const TAMPON_MAX = 24;
const tampon = [];

// Dernière position et vitesse du disque venues de l'hôte, avec l'instant de
// leur arrivée. L'invité simule le disque entre deux paquets et se recale
// dessus, au lieu de l'afficher avec le retard du tampon.
const discAutorite = { x: 0, y: 0, vx: 0, vy: 0, t: 0, valide: false };

// Réflexion analytique contre les murs, pour la brève fenêtre d'extrapolation.
// Sans elle, un disque qui venait de rebondir chez l'hôte, mais dont le paquet
// ne le disait pas encore, continuait sa route À TRAVERS le mur pendant toute
// l'extrapolation — visible comme une pointe de plusieurs dizaines de pixels
// juste avant que le paquet suivant ne remette tout en place. Une seule
// réflexion par appel suffit : la fenêtre est trop courte pour en subir deux.
function extrapolerDisque(x, y, vx, vy, dt) {
  const r = DISC_RADIUS;
  let nx = x + vx * dt, ny = y + vy * dt;
  if (ny < COURT.top + r) { ny = COURT.top + r; vy = Math.abs(vy); }
  else if (ny > COURT.bottom - r) { ny = COURT.bottom - r; vy = -Math.abs(vy); }
  if (nx < COURT.left + r) { nx = COURT.left + r; vx = Math.abs(vx); }
  else if (nx > COURT.right + r) { nx = COURT.right + r; vx = -Math.abs(vx); }
  return [nx, ny];
}
// Au-delà, ce n'est plus un rebond décalé d'une image : c'est un vrai
// désaccord (perte de paquets, but, remise en jeu) et la douceur ferait
// traîner le retard au lieu de le corriger.
const ECART_SAUT_DISQUE = 130;

// ---------------------------------------------------------------------------
// Prédiction de l'adversaire (P1, côté invité).
//
// Il était jusqu'ici toujours interpolé : affiché avec le retard du tampon,
// fluide mais en retard. On lui applique maintenant le même principe qu'au
// disque — extrapoler sa dernière position et vitesse connues, corriger en
// douceur — mais seulement quand la liaison le permet. Sur une mauvaise
// connexion, prédire un adversaire ferait de l'élastique, ce qui se voit
// bien plus qu'un retard : on retombe alors sur l'interpolation, qui reste
// fluide même en retard.
//
// On ne prédit QUE son déplacement, jamais ses gestes : ses tirs, plongeons et
// ultimes continuent d'arriver par l'état, jamais devinés localement. Une
// prédiction de déplacement fausse ne coûte que quelques pixels ; une
// prédiction de tir fausse ferait apparaître un disque qu'il faudrait ensuite
// reprendre — précisément la correction qui se voit le plus.
// ---------------------------------------------------------------------------
const p1Autorite = { x: 0, y: 0, vx: 0, vy: 0, t: 0, valide: false };

// Au-delà, la liaison est trop capricieuse pour que prédire vaille mieux
// qu'afficher un retard fixe et fluide. En dessous, sur votre cible réelle
// (20-60 ms entre potes), la prédiction gagne largement.
const PING_LIMITE_PREDICTION = 80;
const ECART_SAUT_ADVERSAIRE = 140;

// Bornée au terrain, pas réfléchie : un joueur ne rebondit pas sur les murs
// comme le disque, il s'y arrête. Une extrapolation qui l'y collerait quand il
// fonce dessus est le comportement correct, pas un défaut à corriger.
function extrapolerJoueur(x, y, vx, vy, dt, side) {
  const minX = side === 1 ? COURT.left + 16 : CX + 10;
  const maxX = side === 1 ? CX - 10 : COURT.right - 16;
  return [
    clamp(x + vx * dt, minX, maxX),
    clamp(y + vy * dt, COURT.top + 16, COURT.bottom - 16)
  ];
}

// ---------------------------------------------------------------------------
// Compensation de latence sur la réception (chantier 11).
//
// L'hôte fait bouger l'invité avec des intentions vieilles d'un aller simple :
// son personnage rejoue donc exactement la même trajectoire, mais décalée dans
// le temps. Mesuré plutôt que supposé — à 63 ms de ping, le personnage de
// l'invité vu par l'hôte est en retard de 28 ms sur celui que l'invité voit,
// et une fois ce décalage compensé les deux courbes se superposent à
// 0,0 px près. Ce n'est pas une dérive, c'est un décalage pur.
//
// Le disque, lui, n'a aucun retard : l'hôte le simule en direct. L'arbitrage
// de la réception compare donc un joueur d'il y a un aller simple à un disque
// de maintenant — et refuse des réceptions que l'invité a vues réussir. Sept
// pixels d'erreur moyenne à 63 ms, dix au pire, contre un rayon d'attrapé de
// cinquante-deux : un cinquième de la fenêtre, et la moitié à 160 ms.
//
// La correction est d'un seul côté, et c'est ce qui la rend juste : tout
// l'état de l'invité chez l'hôte (position, vitesse, dash en cours) est
// décalé du MÊME aller simple, puisque tout découle du même flux d'intentions
// retardé. Il suffit donc de reculer le disque d'autant pour que les deux
// choses comparées datent du même instant — celui que l'invité a réellement
// vu. Si tu as vu le disque dans ta main, tu l'as attrapé.
//
// Contrepartie assumée : l'adversaire peut voir le disque lui échapper d'un
// cheveu. C'est le compromis standard, et le bon — rater une réception qu'on
// a vue réussie est bien plus frustrant que se faire souffler un disque de
// justesse.
// ---------------------------------------------------------------------------
const HISTO_DISQUE_MS = 500;
// Au-delà, on ne compense plus. Un recul plus grand que ça ne rattraperait pas
// une mauvaise liaison, il réécrirait le match : le disque a le temps d'entrer
// dans une cage en cent cinquante millisecondes.
const RECUL_MAX_MS = 150;
const histoDisque = [];

function noterDisque(t) {
  const d = G.disc;
  histoDisque.push({ t, x: d.x, y: d.y });
  while (histoDisque.length && t - histoDisque[0].t > HISTO_DISQUE_MS) histoDisque.shift();
}

// Où était le disque quand ce joueur-là l'a vu. Renvoie null quand il n'y a
// rien à compenser — hors ligne, chez l'invité, ou pour le joueur de l'hôte,
// dont les intentions n'ont traversé aucun réseau.
export function disqueVuPar(p) {
  if (!Partie.active || Partie.role !== 'hote' || p !== G.p2) return null;
  const recul = Math.min(RECUL_MAX_MS, (Reseau.ping || 0) / 2);
  if (recul < 1 || histoDisque.length < 2) return null;
  const vise = performance.now() - recul;
  // Historique trop court pour couvrir ce recul : on juge en direct plutôt que
  // sur la plus vieille position connue, qui serait fausse d'un temps inconnu.
  if (vise <= histoDisque[0].t) return null;
  for (let i = histoDisque.length - 1; i > 0; i--) {
    const a = histoDisque[i - 1], b = histoDisque[i];
    if (a.t <= vise && vise <= b.t) {
      const k = b.t > a.t ? (vise - a.t) / (b.t - a.t) : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Prédiction locale du joueur invité, par rembobinage et rejeu.
//
// L'invité ne peut pas attendre la réponse de l'hôte pour se voir bouger : ce
// serait un aller-retour complet sur chacun de ses gestes. Il simule donc son
// propre personnage tout de suite, avec le même code que l'hôte, et garde un
// journal de ce qu'il a joué : à chaque tick, l'intention utilisée ET l'état
// physique qui en résulte.
//
// Quand l'état de l'hôte revient, il porte le numéro de la dernière fiche
// traitée. L'invité retrouve dans son journal l'endroit exact où il en était
// à ce numéro, s'y replace avec la position que l'hôte fait autorité, puis
// REJOUE d'un coup toutes les intentions qui ont suivi jusqu'à maintenant.
// Le résultat est exact quelle que soit la taille de l'écart : contrairement
// à une résorption progressive, il n'y a rien à choisir entre « vite mais ça
// se voit » et « doux mais en retard ». C'est ce qui remplace l'ancien
// système à cinq réglages (correction, RESORPTION, PART_CORRECTION,
// ECART_SAUT, ECART_IGNORE) — plus rien de tout ça n'existe : soit l'écart
// est nul et il n'y a rien à faire, soit il ne l'est pas et le rejeu le
// referme exactement, dans les deux cas en une seule image.
//
// Seule la position (et ce qui la produit : vitesse, dash) est rejouée.
// Qui attrape, qui marque, qui est étourdi restent des décisions de l'hôte,
// déjà appliquées ailleurs : les rejouer ferait diverger les deux écrans sur
// ce qui compte vraiment.
//
// Le tir, le plongeon, la feinte et l'ultime (chantier 10) restent d'ailleurs
// délibérément EN DEHORS de ce rejeu, alors qu'ils sont eux aussi prédits en
// local : ils touchent le disque et la mise en scène — partagés entre les deux
// joueurs — quand ce système ne rejoue que SON personnage. Les rejouer aurait
// pu relancer le disque une seconde fois pour un seul geste. Ils s'exécutent
// donc une fois, pour de vrai, au moment réel de l'appui — jamais pendant un
// rembobinage — et se resynchronisent par le même paquet d'état que le reste.
// ---------------------------------------------------------------------------
const JOURNAL_MAX = 180;
const journalP2 = [];

// Le pas de simulation est fixe depuis le chantier 1.5 (js/game/loop.js) : le
// rejeu doit avancer exactement du même pas que l'original, sinon il ne
// reproduit pas la même trajectoire. Dupliquée plutôt qu'importée : les deux
// fichiers ont chacun leur raison d'avoir cette constante, et les coupler par
// un import pour un seul flottant n'en vaut pas la peine.
const PAS_REJEU = 1 / 60;

// Rejouer une intention doit produire exactement les mêmes effets de bord que
// la première fois — ou plutôt aucun : le dash a déjà fait son bruit, sa
// poussière et son image fantôme au moment où il a réellement eu lieu. Les
// rejouer une seconde fois ferait entendre deux dashs pour un seul geste. Lu
// par js/game/input.js à chaque site qui déclenche un son ou une particule
// depuis le déplacement du joueur.
Partie.rejeuEnCours = false;

// Le simulateur (updatePlayerHuman + integratePlayer) vit dans game/input.js,
// qui importe déjà Partie — l'importer ici en retour fermerait un cycle. On
// reprend donc le patron déjà en place dans ce fichier pour ce genre de
// liaison (surCoupDEnvoi, surMessage) : loop.js, qui a les deux bouts,
// l'enregistre une fois au chargement.
let simulerUnPas = null;
export function surSimulationJoueur(fn) { simulerUnPas = fn; }

// Appelé une fois par tick simulé, juste après avoir construit la fiche qui
// part vers l'hôte : c'est le même numéro qui servira à retrouver ce tick le
// jour où il faudra rembobiner jusqu'à lui.
function noterTick(n) {
  const p = G.p2;
  if (!p) return;
  const c = p.cmd;
  journalP2.push({
    n,
    intent: {
      depX: c.dep.x, depY: c.dep.y,
      viseeX: c.visee.x, viseeY: c.visee.y,
      viseeDashX: c.viseeDash.x, viseeDashY: c.viseeDash.y,
      tir: c.tir, dash: c.dash
    },
    x: p.x, y: p.y, vx: p.vx, vy: p.vy,
    dashVx: p.dashV.x, dashVy: p.dashV.y,
    dashT: p.dashT, dashGap: p.dashGap,
    dashDirX: p.dashDir.x, dashDirY: p.dashDir.y,
    dashEnding: p.dashEnding, dashTenu: p.dashTenu,
    charging: p.charging, charge: p.charge,
    fullFlash: p.fullFlash, wasCharging: p.wasCharging, face: p.face
  });
  if (journalP2.length > JOURNAL_MAX) journalP2.shift();
}

// Pose sur G.p2 exactement l'état enregistré dans une entrée du journal — le
// point de départ commun aux deux usages : reprendre après un rembobinage, et
// avancer d'un cran pendant le rejeu qui suit.
function poserEtat(e) {
  const p = G.p2;
  p.x = e.x; p.y = e.y; p.vx = e.vx; p.vy = e.vy;
  p.dashV.x = e.dashVx; p.dashV.y = e.dashVy;
  p.dashT = e.dashT; p.dashGap = e.dashGap;
  p.dashDir.x = e.dashDirX; p.dashDir.y = e.dashDirY;
  p.dashEnding = e.dashEnding; p.dashTenu = e.dashTenu;
  p.charging = e.charging; p.charge = e.charge;
  p.fullFlash = e.fullFlash; p.wasCharging = e.wasCharging; p.face = e.face;
}

function rembobiner(na, a) {
  const D = Partie.diag;
  D.na = na; D.histo = journalP2.length;
  if (na === undefined || na < 0 || !G.p2 || !simulerUnPas) { D.motif = 'pas de numero'; return; }
  const idx = journalP2.findIndex(e => e.n === na);
  if (idx < 0) { D.motif = 'introuvable'; D.perdus++; return; }
  D.motif = 'ok';
  const h = journalP2[idx];
  const dx = a[0] - h.x, dy = a[1] - h.y;
  const ecart = Math.hypot(dx, dy);
  D.ecart = +ecart.toFixed(1);
  D.ecartMax = Math.max(D.ecartMax, D.ecart);
  D.dx = +dx.toFixed(1); D.dy = +dy.toFixed(1);
  D.predit = [Math.round(h.x), Math.round(h.y)];
  D.recu = [a[0], a[1]];
  // Tout ce qui précède est confirmé : on n'en a plus besoin.
  journalP2.splice(0, idx);
  if (ecart < 1) return;   // arrondi, rien à rejouer pour ça
  D.sauts++;
  // On se replace exactement où l'hôte dit qu'on était à ce numéro — le reste
  // de l'état (vitesse, dash en cours) vient du journal, l'hôte ne l'envoie
  // pas et n'a pas besoin de le connaître.
  poserEtat(h);
  G.p2.x = a[0]; G.p2.y = a[1];
  // Puis on rejoue, dans l'ordre, chaque tick réellement vécu depuis. Le
  // drapeau coupe les sons et particules : ce dash a déjà claqué une fois,
  // à l'instant où il a réellement eu lieu.
  Partie.rejeuEnCours = true;
  const cSauve = { depX: G.p2.cmd.dep.x, depY: G.p2.cmd.dep.y,
    viseeX: G.p2.cmd.visee.x, viseeY: G.p2.cmd.visee.y,
    viseeDashX: G.p2.cmd.viseeDash.x, viseeDashY: G.p2.cmd.viseeDash.y,
    tir: G.p2.cmd.tir, dash: G.p2.cmd.dash };
  for (let i = 1; i < journalP2.length; i++) {
    const e = journalP2[i];
    const c = G.p2.cmd;
    c.dep.x = e.intent.depX; c.dep.y = e.intent.depY;
    c.visee.x = e.intent.viseeX; c.visee.y = e.intent.viseeY;
    c.viseeDash.x = e.intent.viseeDashX; c.viseeDash.y = e.intent.viseeDashY;
    c.tir = e.intent.tir; c.dash = e.intent.dash;
    simulerUnPas(G.p2, PAS_REJEU);
    // Le journal note la trajectoire rejouée, pas seulement la première
    // passe : un rembobinage arrivant PENDANT ce rejeu doit retrouver ce
    // qui vient d'être recalculé, pas l'ancienne version périmée.
    journalP2[i] = {
      n: e.n, intent: e.intent,
      x: G.p2.x, y: G.p2.y, vx: G.p2.vx, vy: G.p2.vy,
      dashVx: G.p2.dashV.x, dashVy: G.p2.dashV.y,
      dashT: G.p2.dashT, dashGap: G.p2.dashGap,
      dashDirX: G.p2.dashDir.x, dashDirY: G.p2.dashDir.y,
      dashEnding: G.p2.dashEnding, dashTenu: G.p2.dashTenu,
      charging: G.p2.charging, charge: G.p2.charge,
      fullFlash: G.p2.fullFlash, wasCharging: G.p2.wasCharging, face: G.p2.face
    };
  }
  Partie.rejeuEnCours = false;
  // La fiche courante (celle de CE tick, pas encore envoyée) doit retrouver
  // l'intention réelle du joueur, pas la dernière valeur empruntée au rejeu.
  const c = G.p2.cmd;
  c.dep.x = cSauve.depX; c.dep.y = cSauve.depY;
  c.visee.x = cSauve.viseeX; c.visee.y = cSauve.viseeY;
  c.viseeDash.x = cSauve.viseeDashX; c.viseeDash.y = cSauve.viseeDashY;
  c.tir = cSauve.tir; c.dash = cSauve.dash;
}

function appliquerEtat(m) {
  // Ce qui ne s'interpole pas est posé tout de suite : un score, un état de
  // jeu ou un drapeau n'a pas d'états intermédiaires, et les retarder ferait
  // sonner le but avant qu'il ne s'affiche.
  // `mien` : le personnage que cette machine prédit. Pour lui, on ne reprend
  // que ce qu'il ne peut pas savoir seul — la jauge, le score, qui tient le
  // disque. Sa charge, son orientation et son dash sont déjà calculés ici, et
  // plus récents que ce qui revient : les écraser ferait bégayer la jauge de
  // charge à chaque paquet.
  // `enAttente` : l'hôte n'a pas encore vu le geste que cette machine vient de
  // jouer. Tout ce que ce geste a changé chez MOI reste alors à moi le temps
  // d'un demi-aller-retour ; tout le reste s'applique comme d'habitude.
  //
  // Les deux moitiés comptent. `gestePose` couvre le tout début — entre le
  // geste et le départ de la fiche qui le porte, une fraction d'image mais
  // pendant laquelle des états arrivent bel et bien : sans elle, le disque
  // à peine lâché revenait deux fois en main avant de repartir pour de bon,
  // mesuré à dix-neuf millisecondes de clignotement. `gesteEnAttente` prend
  // le relais dès que la fiche est numérotée, jusqu'à ce que l'hôte l'accuse.
  const enAttente = gestePose
    || (gesteEnAttente >= 0 && !(m.na !== undefined && m.na >= gesteEnAttente));
  const poseInstant = (p, a, mien) => {
    if (!p || !a) return;
    p.meter = a[3]; p.score = a[4]; p.sixT = a[9];
    // Qui tient le disque est une décision de l'hôte — sauf pendant la fenêtre,
    // où l'hôte croit encore que je l'ai en main alors que je viens de tirer.
    if (!(mien && enAttente)) p.holding = !!a[5];
    p.diveT = a[7];              // le plongeon est arbitré par l'hôte
    // Effets subis et gestes arbitrés. Ils s'appliquent aussi à SON joueur :
    // c'est l'adversaire qui les inflige, et cette machine n'a aucun moyen de
    // les deviner. Le test de longueur laisse la liaison tenir si le pair
    // tourne encore une version qui ne les envoie pas.
    // Décalés de deux crans depuis l'ajout de vx/vy juste après sixT : a[10] et
    // a[11] sont désormais la vitesse, pas le premier des effets subis.
    if (a.length > 12) {
      p.stun = a[12]; p.diveDown = a[13]; p.dizzy = a[14];
      p.piratage = a[15]; p.bouclierT = a[16];
      p.feintT = a[17]; p.lunge = a[18];
    }
    // Le plongeon et la feinte que JE viens de déclencher n'existent pas encore
    // dans ce paquet : les reprendre remettrait leur compteur à zéro et
    // l'animation repartirait de zéro au paquet suivant. On garde la version
    // locale jusqu'à ce que l'hôte confirme, puis on lui rend la main.
    if (mien && enAttente) { p.diveT = avantMoi.diveT; p.diveDown = avantMoi.diveDown; p.feintT = avantMoi.feintT; }
    if (mien) return;
    p.face = a[2]; p.charge = a[6]; p.dashT = a[8];
  };
  // Score d'avant : c'est lui qui nous dira qu'un but vient d'être marqué, et
  // par qui. Rien d'autre dans le paquet ne le dit, et le déduire évite d'y
  // ajouter un champ pour un événement qui arrive trois fois par match.
  const avant1 = G.p1 ? G.p1.score : 0, avant2 = G.p2 ? G.p2.score : 0;
  const etatAvant = G.state;

  // Ce que mon geste prédit vient de poser, relevé avant que le paquet ne
  // passe dessus. Trois compteurs, lus par poseInstant juste au-dessus.
  const avantMoi = G.p2 ? { diveT: G.p2.diveT, diveDown: G.p2.diveDown, feintT: G.p2.feintT } : null;
  poseInstant(G.p1, m.p1, false); poseInstant(G.p2, m.p2, true);
  const d = G.disc;
  d.spin = m.d[2]; d.kind = m.d[3];
  // Même règle que pour `holding` : pendant la fenêtre, l'hôte croit encore
  // que le disque est dans ma main. Le lui reprendre le ferait revenir en
  // arrière, puis repartir — un tir qui se joue deux fois.
  if (!enAttente) {
    d.heldBy = m.d[4] === 1 ? G.p1 : (m.d[4] === 2 ? G.p2 : null);
    d.free = !d.heldBy;
  }
  d.big = d.kind === 'kurama';
  G.state = m.st;
  // Rejeu : l'invité n'en monte plus aucun de son côté (voir startReplay). Il
  // ne tient qu'un drapeau d'affichage, mis et retiré PAR L'ÉTAT DE L'HÔTE.
  // C'est ce qui garantit qu'il ne peut pas lui survivre : dès que l'hôte
  // repasse à autre chose, le drapeau tombe dans la même image. Un G.replay
  // orphelin collait les bandes noires à l'écran et faisait avaler tous les
  // clics et la barre d'espace par input.js — le joueur ne contrôlait plus rien.
  if (m.st === 'replay') {
    if (!G.replay) { G.replay = { distant: true, closing: 0 }; setMuffled(true); }
  } else if (G.replay) {
    G.replay = null; setMuffled(false);
  }
  // Fin de match. Le vainqueur vient de l'hôte, qui seul compte les points ;
  // l'écran, lui, se monte en local, comme la mise en scène d'un but. La
  // boucle s'en charge — gameOver vit dans actions.js, qui importe déjà ce
  // fichier, donc on pose un drapeau plutôt que de fermer un cycle d'import.
  if (m.st === 'over' && etatAvant !== 'over' && m.w) {
    G.winner = m.w === 1 ? G.p1 : G.p2;
    Partie.finDeMatch = true;
  }
  // On adopte le ralenti de l'hôte. Le tsTimer empêche la décroissance locale
  // de le ramener vers 1 entre deux paquets : c'est l'hôte qui décide quand la
  // scène reprend sa vitesse, et il le redit trente fois par seconde.
  if (m.ts !== undefined) { G.timescale = m.ts; G.tsTimer = .12; }

  // Les mises en scène des ultimes, telles que l'hôte les déroule. L'invité
  // les fait vivre ensuite avec le même code que lui — updateLeg, updateBell,
  // updateHack et updateDesert tournent des deux côtés — mais c'est l'hôte qui
  // décide de leur existence et de leur avancement.
  if (m.sc !== undefined) appliquerScenes(m.sc);

  // Leurres et cercles : reçus en positions, pas simulés. L'invité ne fait
  // tourner ni updateDecoys ni updateZones — les deux décident de points, donc
  // ils appartiennent à l'arbitre — et il n'en voyait par conséquent aucun.
  if (m.dc !== undefined) {
    G.decoys.length = 0;
    if (m.dc) for (const o of m.dc) G.decoys.push({ x: o[0], y: o[1], vx: 0, vy: 0, life: 1, real: false, thrower: null });
  }
  if (m.ce !== undefined) {
    G.cercles.length = 0;
    if (m.ce) for (const c of m.ce) G.cercles.push({ x: c[0], y: c[1], t: c[2] });
  }
  // Secousse et flash : on prend le plus fort des deux, jamais l'un à la place
  // de l'autre. L'invité en produit aussi de son côté — un rebond, un dash — et
  // les écraser au rythme des paquets les hacherait.
  if (m.fx) { G.shake = Math.max(G.shake, m.fx[0]); G.flash = Math.max(G.flash, m.fx[1]); }
  // Une phrase du commentateur n'arrive qu'une fois : elle est déjà filtrée au
  // départ, on peut la rejouer telle quelle.
  if (m.cm) comment(m.cm);
  // Les messages de l'hôte, affichés tels quels : c'est la seule source de
  // l'invité, puisqu'il étouffe les siens.
  if (m.po) for (const p of m.po) popupDistant(p[0], p[1], p[2], p[3], p[4]);

  // Les bruitages du match, produits par une simulation qui n'a pas lieu ici.
  // Marqués comme venant du réseau : sans quoi l'étouffement qui empêche
  // l'invité de doubler ses propres sons étoufferait aussi l'écho lui-même,
  // et il n'entendrait plus rien du tout.
  if (m.ev) for (const n of m.ev) sfx(n, true);

  // But : le score a bougé et l'état vient de basculer. On rejoue exactement la
  // même mise en scène que l'hôte — sans elle, l'invité voyait le score changer
  // dans un silence complet, sans une étincelle.
  if (G.state === 'goal' && etatAvant !== 'goal') {
    const p = (G.p1 && G.p1.score > avant1) ? G.p1 : ((G.p2 && G.p2.score > avant2) ? G.p2 : null);
    if (p) {
      const pts = p === G.p1 ? p.score - avant1 : p.score - avant2;
      effetDeBut(p.side, m.d[1], p.char.color, p.char.accent || p.char.color, pts, p.char.short);
    }
  }

  const arrivee = performance.now();
  mesurerGigue(arrivee);
  // Dernière vérité connue sur le disque, horodatée. L'invité s'en sert pour
  // extrapoler où il devrait être MAINTENANT, au lieu de l'afficher tel qu'il
  // était à l'émission du paquet.
  // Pendant la fenêtre d'arbitrage, ce que porte le paquet est un disque encore
  // en main : s'y recaler tirerait en arrière celui qui vient de partir. On
  // laisse la simulation locale le porter seule le temps du demi-aller-retour.
  if (m.d.length > 5 && !enAttente) {
    discAutorite.x = m.d[0]; discAutorite.y = m.d[1];
    discAutorite.vx = m.d[5]; discAutorite.vy = m.d[6];
    discAutorite.t = arrivee; discAutorite.valide = true;
  }
  // L'hôte a vu le geste : sa réponse en tient compte, on redevient obéissant.
  if (!enAttente) gesteEnAttente = -1;
  // Même chose pour l'adversaire : sa vitesse est aux index 10 et 11 de sa
  // fiche, juste après sixT.
  if (m.p1 && m.p1.length > 11) {
    p1Autorite.x = m.p1[0]; p1Autorite.y = m.p1[1];
    p1Autorite.vx = m.p1[10]; p1Autorite.vy = m.p1[11];
    p1Autorite.t = arrivee; p1Autorite.valide = true;
  }
  tampon.push({ t: arrivee, p1: m.p1, p2: m.p2, d: m.d });
  if (tampon.length > TAMPON_MAX) tampon.shift();
  // Premier état reçu : on se pose dessus sans interpoler, sinon l'image part
  // du coin de l'écran et glisse jusqu'au terrain.
  if (tampon.length === 1) {
    if (G.p1) { G.p1.x = m.p1[0]; G.p1.y = m.p1[1]; }
    if (G.p2) { G.p2.x = m.p2[0]; G.p2.y = m.p2[1]; }
    d.x = m.d[0]; d.y = m.d[1];
  } else {
    // On rembobine sur le repère daté, pas sur la position courante de l'hôte.
    rembobiner(m.na, m.ra || m.p2);
  }
}

// Les deux états qui encadrent l'instant demandé, ou null si le tampon est à
// sec — auquel cas on garde la dernière image plutôt que d'inventer.
function encadrer(instant) {
  for (let i = tampon.length - 1; i > 0; i--) {
    if (tampon[i - 1].t <= instant && instant <= tampon[i].t) {
      return [tampon[i - 1], tampon[i]];
    }
  }
  return null;
}

export function lisserAffichage(dt) {
  if (!Partie.active || Partie.role !== 'invite') return;
  // Plus rien à résorber ici : le rembobinage replace G.p2 exactement où il
  // doit être dès qu'un écart est détecté, dans la même image. Il n'y a plus
  // de reste à faire fondre au fil du temps.
  if (tampon.length < 2) return;
  const instant = performance.now() - retardAffichage;
  const paire = encadrer(instant);
  if (!paire) return;
  const [a, b] = paire;
  const ecart = b.t - a.t;
  const k = ecart > 0 ? (instant - a.t) / ecart : 1;
  const entre = (ka, kb) => ka + (kb - ka) * k;

  // Le joueur de cette machine garde la position qu'il a prédite : la
  // remplacer par un passé de cent millisecondes rendrait la prédiction
  // parfaitement inutile.
  //
  // L'adversaire, lui, a deux chemins possibles. Sur une bonne liaison, on le
  // prédit comme le disque : extrapolation de sa dernière vitesse connue,
  // corrigée en douceur. Sur une mauvaise, on retombe sur l'interpolation
  // d'origine — en retard mais fluide, plutôt qu'un adversaire qui fait
  // l'élastique. Le seuil se lit sur le ping mesuré, pas sur une supposition.
  Partie.predictionAdversaire = p1Autorite.valide && (Reseau.ping || 999) < PING_LIMITE_PREDICTION;
  if (G.p1) {
    const ax = G.p1.x, ay = G.p1.y;
    if (Partie.predictionAdversaire) {
      const transit = Math.min(.06, (Reseau.ping || 0) / 2000);
      const age = Math.min(.09, (performance.now() - p1Autorite.t) / 1000 + transit);
      const [cx, cy] = extrapolerJoueur(p1Autorite.x, p1Autorite.y, p1Autorite.vx, p1Autorite.vy, age, G.p1.side);
      const ecart = Math.hypot(cx - G.p1.x, cy - G.p1.y);
      if (ecart > ECART_SAUT_ADVERSAIRE) {
        G.p1.x = cx; G.p1.y = cy;
      } else {
        const k = 1 - Math.exp(-18 * dt);
        G.p1.x += (cx - G.p1.x) * k;
        G.p1.y += (cy - G.p1.y) * k;
      }
    } else {
      G.p1.x = entre(a.p1[0], b.p1[0]);
      G.p1.y = entre(a.p1[1], b.p1[1]);
    }
    // L'animation de course se déduit du déplacement réel à l'écran, quel que
    // soit le chemin emprunté : sans elle, l'adversaire glisserait sur le
    // terrain, raide.
    G.p1.moving = Math.hypot(G.p1.x - ax, G.p1.y - ay) > .35;
    G.p1.walk += G.p1.moving ? dt * 9 : 0;
  }
  // Le disque n'est PLUS interpolé : l'invité le simule lui-même, image par
  // image, comme l'hôte. Il n'est donc plus affiché dans le passé — et dans un
  // jeu de disque, c'est le retard qui comptait le plus.
  // Ce qui arrive du réseau sert à le recaler, pas à le remplacer : on vise la
  // dernière position connue, avancée de sa vitesse pendant le temps écoulé
  // depuis son arrivée. Viser la position brute reviendrait à le tirer en
  // arrière à chaque paquet.
  const d = G.disc;
  // Hors du jeu — rejeu, but, décompte — l'invité ne simule pas le disque :
  // l'hôte le déplace image par image et l'extrapoler le ferait dériver sur une
  // vitesse qui n'a plus cours. On se pose alors dessus, sans discuter.
  const enJeu = G.state === 'play' || G.state === 'serve';
  if (discAutorite.valide && !enJeu) {
    d.x = discAutorite.x; d.y = discAutorite.y;
  } else if (discAutorite.valide && d.free) {
    // On compte le temps depuis l'arrivée du paquet, PLUS son temps de transit :
    // la position qu'il porte datait déjà d'un demi-aller-retour quand elle est
    // arrivée. Sans ce terme, le disque de l'invité traînait en permanence d'un
    // demi-ping derrière celui de l'hôte.
    //
    // La fenêtre est courte, et volontairement : au-delà, ce n'est plus une
    // extrapolation entre deux paquets, c'est une invention. Avec l'état à
    // 60 Hz, l'écart réel entre deux paquets ne dépasse quasiment jamais 90 ms.
    const transit = Math.min(.06, (Reseau.ping || 0) / 2000);
    const age = Math.min(.09, (performance.now() - discAutorite.t) / 1000 + transit);
    const [cx, cy] = extrapolerDisque(discAutorite.x, discAutorite.y, discAutorite.vx, discAutorite.vy, age);
    const ecart = Math.hypot(cx - d.x, cy - d.y);
    if (ecart > ECART_SAUT_DISQUE) {
      // Vrai désaccord — pas un rebond décalé d'une image, un vrai autre
      // endroit. On obéit sans discuter, comme pour le joueur.
      d.x = cx; d.y = cy; d.vx = discAutorite.vx; d.vy = discAutorite.vy;
    } else {
      // Résorption douce, position ET vitesse. La vitesse ne se prenait
      // auparavant jamais autrement que telle quelle, écrasée à chaque image —
      // et c'est exactement ce qui cassait les rebonds : le disque rebondissait
      // correctement en local, puis se faisait aussitôt réécraser par la
      // vitesse D'AVANT le rebond, reçue quelques images plus tôt, le temps que
      // le paquet qui confirme le rebond arrive. Vue à l'écran, la trajectoire
      // faisait un aller-retour à travers le mur avant de se stabiliser.
      const k = 1 - Math.exp(-18 * dt);
      d.x += (cx - d.x) * k;
      d.y += (cy - d.y) * k;
      d.vx += (discAutorite.vx - d.vx) * k;
      d.vy += (discAutorite.vy - d.vy) * k;
    }
  }
  // Le disque en main suit celui qui le porte, sans passer par le réseau : à
  // cent millisecondes de retard il flotterait à côté de la main de l'invité.
  if (d.heldBy === G.p2 && G.p2) {
    d.x = G.p2.x + G.p2.face * 20;
    d.y = G.p2.y + Math.sin(G.now * 6) * 2;
  }
}

function appliquerFiche(p, m) {
  const c = p.cmd;
  c.dep.x = m.dx; c.dep.y = m.dy;
  c.visee.x = m.vx; c.visee.y = m.vy;
  c.viseeDash.x = m.vx; c.viseeDash.y = m.vy;
  c.tir = !!m.tir; c.dash = !!m.dash;
  // Gestes ponctuels : on ne regarde pas un drapeau, on regarde si le compteur
  // d'en face a avancé. Le premier paquet ne fait que caler les compteurs —
  // sans ça, la remise à zéro passerait pour trois gestes déclenchés d'un coup.
  if (!gestesVus) { gestesVus = { pl: m.pl | 0, fe: m.fe | 0, sp: m.sp | 0, ad: m.ad | 0 }; return; }
  if ((m.pl | 0) > gestesVus.pl) { gestesVus.pl = m.pl | 0; c.plongeon = true; }
  if ((m.fe | 0) > gestesVus.fe) { gestesVus.fe = m.fe | 0; c.feinte = true; }
  if ((m.sp | 0) > gestesVus.sp) { gestesVus.sp = m.sp | 0; c.special = true; }
  if ((m.ad | 0) > gestesVus.ad) { gestesVus.ad = m.ad | 0; c.annuleDash = true; }
}

export function demarrerPartieReseau(role) {
  Partie.active = true; Partie.role = role;
  // Compteurs remis à neuf : une partie précédente laisserait des numéros
  // hauts qui feraient jeter tous les paquets de celle-ci.
  numeroEnvoi = 0; dernierEtatRecu = -1; dernierEtatFiche = -1;
  refInvite.n = -1; refInvite.x = 0; refInvite.y = 0;
  gestes.pl = gestes.fe = gestes.sp = gestes.ad = 0; gestesVus = null;
  Partie.envoyes = 0; Partie.recus = 0; Partie.jetes = 0;
  Partie.diag = { na: -1, motif: '', histo: 0, ecart: 0, ecartMax: 0, sauts: 0, perdus: 0 };
  tampon.length = 0; dernierEnvoi = 0;
  p1Autorite.valide = false; Partie.predictionAdversaire = false;
  Partie.voteAdversaire = null;
  oublierPrets();
  Partie.skipDemande = false; Partie.finDeMatch = false; dernierCommentaire = null;
  // Personne n'a encore choisi : l'hote doit attendre les deux presentations
  // avant de donner le coup d'envoi.
  attenteNouveauxChoix();
  journalP2.length = 0; Partie.rejeuEnCours = false;
  gestePose = false; gesteEnAttente = -1;
  discAutorite.valide = false;
  histoDisque.length = 0;
  // Seul l'hôte collecte : c'est lui qui simule, donc lui seul produit les sons
  // du match. L'invité, s'il collectait, se renverrait les siens en boucle.
  activerEcho(role === 'hote');
  // Et seul l'invité étouffe : les sons que l'hôte lui relaie, il ne doit pas
  // les produire une seconde fois de son côté.
  marquerInvite(role === 'invite');
  surMessage(m => {
    if (!Partie.active) return;
    if (m.t === 'moi') { recevoirIdentite(m); return; }
    // Vote en direct : ce que l'autre survole en ce moment, pas encore un
    // choix arrêté. On le garde pour l'afficher (son avatar sur la vignette)
    // et pour savoir, le moment venu, s'il y a eu vrai désaccord à montrer.
    if (m.t === 'vote') {
      Partie.voteAdversaire = { terrain: m.terrain, pseudo: m.pseudo, avatar: m.avatar };
      if (surVoteTerrain) surVoteTerrain(m);
      return;
    }
    // L'hote a tranche : l'invite se range a son terrain, sans discuter.
    if (m.t === 'terrain') { setMapId(m.terrain); return; }
    // La pause d'en face est la nôtre. On ne la renvoie pas : deux écrans qui
    // se répercutent la pause l'un à l'autre ne s'arrêteraient jamais.
    if (m.t === 'pause') { if (surPause) surPause(!!m.on); return; }
    if (m.t === 'abandon') { if (surAbandon) surAbandon(); return; }
    // L'invité demande à couper le rejeu. Seul l'hôte peut le faire — il le
    // déroule — donc on ne fait que poser la demande, que sa boucle consomme.
    if (m.t === 'skip') { if (Partie.role === 'hote') Partie.skipDemande = true; return; }
    if (m.t === 'pret') { recevoirPret(m); return; }
    // L'invité demande la revanche : seul l'hôte peut la donner.
    if (m.t === 'revanche') { if (Partie.role === 'hote') relancerMemeMatch(); return; }
    if (m.t === 'changeperso') {
      attenteNouveauxChoix();
      if (surChangementPerso) surChangementPerso();
      return;
    }
    if (m.t === 'go') {
      setMapId(m.terrain);
      if (auCoupDEnvoi) auCoupDEnvoi(m.p1, m.p2, m.terrain, m.graine);
      return;
    }
    if (role === 'hote' && m.t === 'c' && G.p2) {
      if (!aJour(m.n, dernierEtatFiche)) { Partie.jetes++; return; }
      dernierEtatFiche = m.n === undefined ? dernierEtatFiche : m.n;
      Partie.recus++;
      Partie.derniereFiche = m;   // visible au panneau admin, pour diagnostic
      appliquerFiche(G.p2, m);
    } else if (role === 'invite' && m.t === 'e') {
      if (!aJour(m.n, dernierEtatRecu)) { Partie.jetes++; return; }
      dernierEtatRecu = m.n === undefined ? dernierEtatRecu : m.n;
      Partie.recus++;
      appliquerEtat(m);
    }
  });
}

// Le joueur que commande CETTE machine. En ligne, l'invité tient celui de
// droite : tout ce qui visait « G.p1 » en dur ne le concernait donc jamais.
export function monJoueur() {
  if (Partie.active) return Partie.role === 'hote' ? G.p1 : G.p2;
  return G.p1;
}

// Vrai partout sauf chez l'invité. Il prédit son personnage et le vol du
// disque, mais il n'ARBITRE rien : le score, les buts, les contres son camp et
// la remise en jeu restent des décisions de l'hôte. Un but qui se dé-produit
// serait le pire défaut possible, quel qu'en soit le gain de réactivité.
export function jeSimule() {
  return !(Partie.active && Partie.role === 'invite');
}

// Celui d'en face, quel que soit le côté qu'on tient.
export function sonJoueur() {
  if (Partie.active) return Partie.role === 'hote' ? G.p2 : G.p1;
  return G.p2;
}

// Vue miroir : en solo comme chez l'hôte, le joueur humain est toujours à
// gauche. Faire jouer l'invité à droite lui imposerait une position qu'il n'a
// jamais entraînée — lecture du terrain inversée, sens de visée inversé,
// mémoire musculaire inutilisable. Elle se résout sans toucher à la
// simulation : chaque machine dessine et lit sa souris dans SON propre repère
// écran, mais le monde simulé (x, y, vitesses) reste identique des deux côtés.
// Lue à chaque appel plutôt que figée : le rôle peut changer en cours de
// session (retour au menu, nouvelle partie).
export function enMiroir() { return Partie.active && Partie.role === 'invite'; }

// ---------------------------------------------------------------------------
// À qui appartient le disque qu'on regarde.
//
// Le skin de disque est un choix personnel, gardé en local : chacun voyait donc
// le sien, et les deux écrans ne montraient pas le même objet. Il fallait
// trancher lequel l'emporte, et c'est celui du LANCEUR — de cette façon les
// deux disques apparaissent tour à tour au lieu qu'un seul écrase l'autre, et
// les deux machines s'accordent puisque le lanceur est le même pour tout le
// monde.
//
// Hors ligne, ou tant qu'on ne connaît pas le skin d'en face, on retombe sur
// le sien : le jeu reste exactement ce qu'il était.
// ---------------------------------------------------------------------------
export function skinDuJoueur(p) {
  if (!Partie.active || !p || p === monJoueur()) return getSkinId();
  return (Partie.adversaire && Partie.adversaire.skin) || getSkinId();
}

export function skinDuDisque() {
  const d = G.disc;
  return skinDuJoueur(d.heldBy || d.thrower);
}

// Comment nommer un joueur à l'écran. En ligne on dispose des deux pseudos, et
// un match contre quelqu'un doit nommer ce quelqu'un — « J2 » ou « CPU » ne
// veulent rien dire quand on affronte une personne. Hors ligne, on garde les
// étiquettes historiques.
export function etiquetteJoueur(p) {
  if (!p) return '';
  if (!Partie.active) return G.isJ2J && p.side === 2 ? 'J2' : (p.side === 1 ? 'P1' : 'CPU');
  const mien = p === monJoueur();
  const nom = mien
    ? (Compte.profil && Compte.profil.pseudo)
    : (Partie.adversaire && Partie.adversaire.pseudo);
  // Un pseudo vide ou démesuré casserait la mise en page du terrain : on
  // retombe alors sur une étiquette courte plutôt que sur rien.
  if (!nom) return mien ? 'TOI' : 'ADVERSAIRE';
  return nom.length > 12 ? nom.slice(0, 12) : nom;
}

export function arreterPartieReseau() {
  // Une coupure en plein rejeu laisserait le drapeau d'affichage sans personne
  // pour le retirer — plus aucun état ne vient — et on retomberait sur les
  // bandes noires collées à l'écran, par l'autre bout cette fois.
  if (G.replay && G.replay.distant) { G.replay = null; setMuffled(false); }
  Partie.active = false; Partie.role = null; Partie.adversaire = null;
  Partie.skipDemande = false; Partie.finDeMatch = false; dernierCommentaire = null;
  activerEcho(false);
  // Sans quoi le solo qui suit se jouerait en sourdine : l'étouffement ne vaut
  // que pour un invité en train de recevoir l'écho de quelqu'un.
  marquerInvite(false);
}

// ---------------------------------------------------------------------------
// Reprise par l'IA. Ne peut se produire que chez l'hôte : lui seul simule le
// match, donc lui seul peut continuer à le faire quand l'invité disparaît.
// Rien ne se réinitialise — score, position, terrain restent ceux du match en
// cours — seul le PILOTE de G.p2 change, exactement comme au chantier 1.1,
// qui avait déjà mis l'adversaire à la place de l'IA. On l'y remet.
//
// `G.p2.ai` reprend la forme exacte que construit makePlayer plutôt que d'en
// recopier les champs à la main : la dupliquer ici aurait pu se désaccorder
// de la vraie forme le jour où l'un des deux change sans l'autre.
// ---------------------------------------------------------------------------
export function remplacerInviteParIA() {
  if (Partie.role !== 'hote' || !G.p2) return;
  // Même difficulté que celle donnée par défaut à tout match en ligne — voir
  // lancerMatch() dans online-ui.js, qui passe 1 sans jamais varier : elle
  // n'a jamais compté tant que p2 restait humain.
  G.p2.ai = makePlayer(G.p2.ck, 2, false, 1).ai;
  G.p2.human = false;
  arreterPartieReseau();
  fermer();
}

// Cadence d'envoi, découplée de la cadence d'affichage. L'état complet part
// trente fois par seconde : avec un vrai tampon d'interpolation en face, on ne
// voit aucune différence avec soixante, et on divise par deux la gigue de mise
// en file. La fiche de l'invité, elle, reste à soixante — elle est minuscule et
// c'est elle qui porte le délai ressenti sur ses propres gestes.
// Soixante états par seconde plutôt que trente. Les paquets sont minuscules et
// il n'y a que deux joueurs : le débit reste dérisoire, et chaque état de plus
// est un intervalle de moins à couvrir par le tampon d'interpolation.
const PERIODE_ETAT = 1000 / 60;
const PERIODE_FICHE = 1000 / 60;
let dernierEnvoi = 0, dernierPing = 0;

// Repère de réconciliation, tenu par l'hôte : où était l'invité juste après la
// première image simulée avec sa fiche `n`. Il se prend à chaque image, pas au
// rythme des paquets — sinon on y remettrait la simulation faite entre-temps,
// qui est précisément ce qu'on cherche à en retirer.
const refInvite = { n: -1, x: 0, y: 0 };

// Appelé à chaque image, une fois le reste du jeu à jour.
export function majReseau() {
  if (!Partie.active || !connecte()) return;
  if (Partie.role === 'hote' && G.p2 && dernierEtatFiche !== refInvite.n) {
    refInvite.n = dernierEtatFiche; refInvite.x = G.p2.x; refInvite.y = G.p2.y;
  }
  const maintenant = performance.now();
  // Relevé à chaque image, avant le garde-fou de cadence d'envoi : c'est la
  // trace dont l'arbitrage de la réception a besoin pour reculer le disque
  // jusqu'à l'instant que l'invité a réellement vu.
  if (Partie.role === 'hote') noterDisque(maintenant);
  // Le ping était mesurable depuis le début mais personne ne le demandait :
  // `mesurerPing` n'avait aucun appelant, donc `Reseau.ping` valait zéro en
  // permanence. C'est l'invité qui en a besoin — il s'en sert pour savoir de
  // combien son disque est en retard sur celui de l'hôte.
  // Les deux côtés mesurent : l'invité en a besoin pour son disque, et les deux
  // joueurs ont le droit de savoir dans quelles conditions ils jouent.
  if (maintenant - dernierPing > 1000) {
    dernierPing = maintenant;
    mesurerPing();
  }
  const periode = Partie.role === 'hote' ? PERIODE_ETAT : PERIODE_FICHE;
  // Deux millisecondes de tolérance, et elles ne sont pas cosmétiques. La
  // période d'envoi vaut exactement la période d'image : sans marge, une image
  // arrivée à 16,3 ms rate le seuil de 16,67 ms, saute son tour, et la suivante
  // passe à 32,6 ms. On mesurait alors 33 envois par seconde pour un pouls qui
  // en battait 61 — soixante hertz retombaient mécaniquement à trente.
  if (maintenant - dernierEnvoi < periode - 2) return;
  dernierEnvoi = maintenant;
  if (Partie.role === 'hote') {
    if (envoyer(etatPourLeReseau())) Partie.envoyes++;
  } else if (G.p2 && G.p2.cmd) {
    const f = fichePourLeReseau(G.p2.cmd);
    // Cette fiche est la première à partir depuis le geste : c'est elle que
    // l'hôte devra accuser pour que sa réponse en tienne compte.
    if (gestePose) { gesteEnAttente = f.n; gestePose = false; }
    if (envoyer(f)) Partie.envoyes++;
    // On journalise ce tick sous ce numéro. C'est ce repère que l'hôte nous
    // renverra, et sans lui il n'y aurait rien à retrouver pour rembobiner.
    noterTick(f.n);
  }
  Partie.dernierEtat = Reseau.ping;
}

// ---------------------------------------------------------------------------
// Presentations. Chacun annonce qui il est des l'ouverture de la liaison :
// sans ca, l'historique ne saurait pas contre qui on a joue, et le face-a-face
// entre amis n'aurait aucun sens.
//
// On envoie l'identifiant du compte, pas seulement le pseudo : deux joueurs
// peuvent porter le meme nom affiche, et c'est l'identifiant qui relie un match
// a un profil.
// ---------------------------------------------------------------------------
export function annoncerIdentite(perso) {
  Partie.monTerrain = getMapId();
  Partie.monPerso = perso;
  choixFrais.moi = true;
  envoyer({
    t: 'moi',
    id: monId() || null,
    pseudo: (Compte.profil && Compte.profil.pseudo) || null,
    perso: perso || null,
    terrain: Partie.monTerrain,
    // Le disque qu'on a choisi. C'est celui du lanceur qui s'affiche, donc
    // chacun a besoin de connaître celui d'en face pour dessiner le même objet.
    skin: getSkinId()
  });
}

function recevoirIdentite(m) {
  Partie.adversaire = {
    id: m.id || null, pseudo: m.pseudo || null,
    perso: m.perso || null, terrain: m.terrain || null,
    skin: m.skin || null
  };
  choixFrais.lui = true;
  // L'hôte seul tranche, puis donne le coup d'envoi avec les deux personnages
  // et le terrain retenu. Deux décisions indépendantes donneraient deux matchs
  // différents, et les joueurs ne verraient pas la même chose.
  // Il attend d'avoir les deux choix : après un changement de personnage, il
  // relancerait sinon avec l'ancien personnage d'en face.
  if (Partie.role === 'hote' && Partie.monPerso && peutRelancer()) {
    const terrain = terrainDuMatch(Partie.monTerrain || getMapId(), m.terrain);
    setMapId(terrain);
    annoncerCoupDEnvoi(Partie.monPerso, m.perso || 'leon', terrain);
  }
}

// ---------------------------------------------------------------------------
// Choix du terrain.
//
// Chacun annonce le sien avec son identite. S'ils tombent d'accord, c'est
// celui-la ; sinon on tire au sort entre les deux — jamais un troisieme, que
// personne n'aurait choisi.
//
// Le tirage est fait par l'hote seul, puis annonce : deux tirages independants
// donneraient deux terrains differents, et les deux joueurs ne verraient pas
// le meme match.
// ---------------------------------------------------------------------------
export function terrainDuMatch(mien, sien) {
  if (!sien || sien === mien) return mien;
  return Math.random() < .5 ? mien : sien;
}

export function annoncerTerrain(terrain) { envoyer({ t: 'terrain', terrain }); }

// ---------------------------------------------------------------------------
// Votes de terrain.
//
// Chacun annonce le sien pendant qu'il le survole, avec son avatar : on voit
// donc en direct qui penche pour quoi, au lieu de découvrir le verdict après
// coup. C'est ce qui rend le désaccord lisible — et le tirage au sort qui le
// tranche compréhensible plutôt qu'arbitraire.
// ---------------------------------------------------------------------------
let surVoteTerrain = null;
export function quandVoteTerrain(fn) { surVoteTerrain = fn; }
// Résultat final, une fois les deux terrains connus. Sert à l'animation de
// tirage au sort quand les deux joueurs n'ont pas choisi le même — même
// patron que les autres hooks de ce fichier, pour la même raison : l'écran
// qui sait la dessiner (menus.js) importe déjà online-ui.js, qui doit
// pourtant être celui qui la déclenche au coup d'envoi.
let surResultatVote = null;
export function quandResultatVote(fn) { surResultatVote = fn; }
export function signalerResultatVote(mien, son, resultat) {
  if (surResultatVote) surResultatVote(mien, son, resultat);
}

// ---------------------------------------------------------------------------
// Validations avant le match : « je suis prêt ».
//
// Chacun verrouille d'abord son personnage, puis son terrain, et l'écran
// n'avance que lorsque les DEUX ont verrouillé. C'est une couche d'interface
// posée par-dessus le coup d'envoi, pas dedans : la présentation et l'accord
// sur le terrain continuent de passer exactement par le même chemin qu'avant,
// une fois les deux prêts. Rien du démarrage n'est touché.
//
// Un « prêt » peut se retirer tant que l'autre n'a pas verrouillé : d'où le
// drapeau, plutôt qu'un simple message d'annonce.
// ---------------------------------------------------------------------------
export const Pret = { adversairePerso: null, adversaireTerrain: null };

let surPretAdversaire = null;
export function quandPretAdversaire(fn) { surPretAdversaire = fn; }

export function annoncerPret(etape, valeur, pret) {
  if (!Partie.active) return;
  envoyer({ t: 'pret', etape, valeur: valeur || null, pret: pret ? 1 : 0 }, true);
}

function recevoirPret(m) {
  const cle = m.etape === 'terrain' ? 'adversaireTerrain' : 'adversairePerso';
  Pret[cle] = m.pret ? (m.valeur || true) : null;
  if (surPretAdversaire) surPretAdversaire(m.etape, Pret[cle]);
}

export function oublierPrets() { Pret.adversairePerso = null; Pret.adversaireTerrain = null; }

export function annoncerVoteTerrain(terrain) {
  if (!Partie.active) return;
  envoyer({
    t: 'vote',
    terrain,
    pseudo: (Compte.profil && Compte.profil.pseudo) || null,
    avatar: (Compte.profil && Compte.profil.avatar) || null
  }, true);
}

// ---------------------------------------------------------------------------
// Pause et abandon.
//
// Une pause ne peut pas être unilatérale : l'un s'arrête, l'autre continue de
// jouer contre un adversaire figé. Elle vaut donc pour les deux, quel que soit
// celui qui la demande. L'abandon, lui, met fin au match des deux côtés — le
// laisser à un seul rendrait l'autre spectateur d'un match sans adversaire.
//
// Ces deux messages partent en urgent : ils échappent au garde-fou de la file
// d'envoi, car un état de plus ou de moins n'a aucune importance alors qu'une
// pause perdue laisse les deux écrans en désaccord.
// ---------------------------------------------------------------------------
let surPause = null, surAbandon = null, surRevanche = null, surChangementPerso = null;
export function quandPause(fn) { surPause = fn; }
export function quandAbandon(fn) { surAbandon = fn; }
// Même patron que les deux ci-dessus, mais pour un événement qu'on constate
// soi-même (la liaison tombe) plutôt qu'un message reçu de l'autre bout —
// il n'y a justement plus personne pour nous prévenir.
let surDeconnexion = null;
export function quandDeconnexionEnMatch(fn) { surDeconnexion = fn; }
export function signalerDeconnexionEnMatch() { if (surDeconnexion) surDeconnexion(); }
export function quandRevanche(fn) { surRevanche = fn; }
export function quandChangementPerso(fn) { surChangementPerso = fn; }

// Revanche : c'est l'hôte qui relance, avec les mêmes personnages et le même
// terrain. Si c'est l'invité qui la demande, il ne fait que la demander —
// deux relances indépendantes donneraient deux matchs différents.
export function demanderRevanche() {
  if (!Partie.active) return false;
  if (Partie.role === 'hote') { relancerMemeMatch(); return true; }
  envoyer({ t: 'revanche' }, true);
  return true;
}

export function relancerMemeMatch() {
  if (Partie.role !== 'hote' || !Partie.monPerso) return;
  const adv = (Partie.adversaire && Partie.adversaire.perso) || 'leon';
  annoncerCoupDEnvoi(Partie.monPerso, adv, getMapId());
}

// Changement de personnage : les deux retournent à l'écran de choix, la
// liaison restant ouverte. Chacun renverra sa présentation en validant, et
// l'hôte redonnera le coup d'envoi quand il aura les deux.
export function demanderChangementPerso() {
  if (!Partie.active) return false;
  envoyer({ t: 'changeperso' }, true);
  attenteNouveauxChoix();
  return true;
}

// Tant que les deux n'ont pas re-choisi, l'hôte ne donne pas le coup d'envoi :
// sans cette attente il relancerait avec l'ancien personnage d'en face.
let choixFrais = { moi: false, lui: false };
function attenteNouveauxChoix() { choixFrais = { moi: false, lui: false }; }
function peutRelancer() { return choixFrais.moi && choixFrais.lui; }

// Passer le rejeu. Message urgent, comme la pause et l'abandon : un état de
// plus ou de moins n'a aucune importance, une demande perdue laisserait
// l'invité à regarder un rejeu qu'il a explicitement voulu couper.
export function demanderSkipRejeu() {
  if (Partie.active) envoyer({ t: 'skip' }, true);
}

export function annoncerPause(enPause) {
  if (Partie.active) envoyer({ t: 'pause', on: enPause ? 1 : 0 }, true);
}
export function annoncerAbandon() {
  if (Partie.active) envoyer({ t: 'abandon' }, true);
}

// ---------------------------------------------------------------------------
// Coup d'envoi. L'hote attend de connaitre le choix d'en face, puis annonce
// d'un coup les deux personnages et le terrain. Les deux cotes demarrent alors
// sur exactement la meme base — sans cette annonce commune, chacun lancerait
// son match avec ses propres suppositions.
// ---------------------------------------------------------------------------
let auCoupDEnvoi = null;
export function surCoupDEnvoi(fn) { auCoupDEnvoi = fn; }

export function annoncerCoupDEnvoi(persoHote, persoInvite, terrain) {
  // La graine du hasard part avec le reste. C'est elle qui garantit que les
  // deux machines verront la même tempête de sable au même instant, la même
  // dispersion du disque lâché et le même tremblement de cloche — tout ce que
  // le jeu tire au sort mais qui décide du match.
  // Elle est semée APRÈS le lancement, pas ici : initMatch en tire une neuve
  // pour que le solo ne rejoue jamais deux fois la même partie, et il
  // écraserait celle-ci. On la transporte donc jusqu'au bout de la chaîne.
  const graine = graineNeuve();
  envoyer({ t: 'go', p1: persoHote, p2: persoInvite, terrain, graine });
  if (auCoupDEnvoi) auCoupDEnvoi(persoHote, persoInvite, terrain, graine);
}
