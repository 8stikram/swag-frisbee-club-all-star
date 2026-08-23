import { G } from '../game/state.js';
import { Reseau, envoyer, connecte, surMessage } from './connexion.js';
import { Compte, monId } from './compte.js';
import { setMapId, getMapId } from '../data/maps.js';

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
  // Comptes des paquets, visibles depuis le panneau admin. Sans eux, une
  // liaison qui ne transporte plus rien ressemble exactement à une liaison
  // qui va bien : le canal reste ouvert, le ping répond, et le jeu se fige.
  envoyes: 0, recus: 0, jetes: 0
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
const gestes = { pl: 0, fe: 0, sp: 0, ad: 0 };
let gestesVus = null;

// L'invité n'envoie que sa fiche d'intentions : cinq nombres et trois
// compteurs. C'est tout ce dont l'hôte a besoin pour le faire jouer.
// On compte le geste ET on efface le drapeau ici, dans le même geste. Compter
// à un endroit et effacer à un autre laissait une fenêtre — d'une image, mais
// bien réelle — où l'intention était effacée sans avoir été comptée : le
// plongeon, la feinte et l'ultime partaient une fois sur deux. Un seul endroit
// consomme le drapeau, donc plus aucune fenêtre.
function fichePourLeReseau(c) {
  if (c.plongeon) { gestes.pl++; c.plongeon = false; }
  if (c.feinte) { gestes.fe++; c.feinte = false; }
  if (c.special) { gestes.sp++; c.special = false; }
  if (c.annuleDash) { gestes.ad++; c.annuleDash = false; }
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
    +p.diveT.toFixed(2), +p.dashT.toFixed(2), +(p.sixT || 0).toFixed(1)];
  const d = G.disc;
  return {
    t: 'e', n: ++numeroEnvoi,
    // Numéro de la dernière fiche de l'invité prise en compte. C'est la clé de
    // sa prédiction : sans lui, il ne saurait pas à quel instant de SON passé
    // comparer la position qu'on lui renvoie, et ne pourrait rien corriger.
    na: dernierEtatFiche,
    p1: j(G.p1), p2: j(G.p2),
    d: [Math.round(d.x), Math.round(d.y), +d.spin.toFixed(2), d.kind, d.heldBy ? (d.heldBy === G.p1 ? 1 : 2) : 0],
    st: G.state
  };
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
const RETARD_AFFICHAGE = 100;   // millisecondes
const TAMPON_MAX = 24;
const tampon = [];

// ---------------------------------------------------------------------------
// Prédiction locale du joueur invité.
//
// L'invité ne peut pas attendre la réponse de l'hôte pour se voir bouger : ce
// serait un aller-retour complet — cinquante millisecondes environ — sur chacun
// de ses gestes. Il simule donc son propre personnage tout de suite, avec le
// même code que l'hôte, et garde la trace de ce qu'il a prédit.
//
// Quand l'état revient, il porte le numéro de la dernière fiche traitée.
// L'invité retrouve ce qu'il avait prédit à cet instant-là, mesure l'écart, et
// le résorbe en douceur. Se replacer d'un coup ferait sauter l'image à chaque
// désaccord, ce qui serait pire que le délai qu'on cherche à supprimer.
//
// Seule sa position est prédite. Qui attrape, qui marque, qui est étourdi
// restent des décisions de l'hôte : les prédire ferait diverger les deux
// écrans sur ce qui compte vraiment.
// ---------------------------------------------------------------------------
const HISTO_MAX = 180;
const histo = [];                 // { n, x, y } de ce qu'on a prédit
const correction = { x: 0, y: 0 };
const RESORPTION = 9;             // par seconde
const ECART_IGNORE = 1.5;         // px : en dessous, ce n'est que de l'arrondi
const ECART_SAUT = 90;            // px : au-delà, c'est un replacement légitime

// Appelé après chaque envoi de fiche : on note où l'on se croit à ce numéro.
export function noterPrediction(x, y) {
  histo.push({ n: numeroEnvoi, x, y });
  if (histo.length > HISTO_MAX) histo.shift();
}

function reconcilier(na, a) {
  if (na === undefined || na < 0 || !G.p2) return;
  const h = histo.find(e => e.n === na);
  if (!h) return;
  // Tout ce qui précède est confirmé : on n'en a plus besoin.
  while (histo.length && histo[0].n < na) histo.shift();
  const dx = a[0] - h.x, dy = a[1] - h.y;
  const ecart = Math.hypot(dx, dy);
  if (ecart < ECART_IGNORE) return;
  if (ecart > ECART_SAUT) {
    // Remise en jeu, but, téléportation : il n'y a rien à lisser, on obéit.
    G.p2.x = a[0]; G.p2.y = a[1];
    correction.x = 0; correction.y = 0;
    histo.length = 0;
    return;
  }
  correction.x += dx; correction.y += dy;
}

// Résorbe l'écart accumulé, un peu à chaque image.
function appliquerCorrection(dt) {
  if (!G.p2) return;
  const k = 1 - Math.exp(-RESORPTION * dt);
  const cx = correction.x * k, cy = correction.y * k;
  G.p2.x += cx; G.p2.y += cy;
  correction.x -= cx; correction.y -= cy;
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
  const poseInstant = (p, a, mien) => {
    if (!p || !a) return;
    p.meter = a[3]; p.score = a[4]; p.holding = !!a[5]; p.sixT = a[9];
    p.diveT = a[7];              // le plongeon est arbitré par l'hôte
    if (mien) return;
    p.face = a[2]; p.charge = a[6]; p.dashT = a[8];
  };
  poseInstant(G.p1, m.p1, false); poseInstant(G.p2, m.p2, true);
  const d = G.disc;
  d.spin = m.d[2]; d.kind = m.d[3];
  d.heldBy = m.d[4] === 1 ? G.p1 : (m.d[4] === 2 ? G.p2 : null);
  d.free = !d.heldBy;
  d.big = d.kind === 'kurama';
  G.state = m.st;

  tampon.push({ t: performance.now(), p1: m.p1, p2: m.p2, d: m.d });
  if (tampon.length > TAMPON_MAX) tampon.shift();
  // Premier état reçu : on se pose dessus sans interpoler, sinon l'image part
  // du coin de l'écran et glisse jusqu'au terrain.
  if (tampon.length === 1) {
    if (G.p1) { G.p1.x = m.p1[0]; G.p1.y = m.p1[1]; }
    if (G.p2) { G.p2.x = m.p2[0]; G.p2.y = m.p2[1]; }
    d.x = m.d[0]; d.y = m.d[1];
  } else {
    reconcilier(m.na, m.p2);
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
  // La correction de la prédiction se résorbe même quand le tampon est à sec :
  // c'est ce qui évite qu'un écart reste figé le temps d'un trou de réseau.
  appliquerCorrection(dt);
  if (tampon.length < 2) return;
  const instant = performance.now() - RETARD_AFFICHAGE;
  const paire = encadrer(instant);
  if (!paire) return;
  const [a, b] = paire;
  const ecart = b.t - a.t;
  const k = ecart > 0 ? (instant - a.t) / ecart : 1;
  const entre = (ka, kb) => ka + (kb - ka) * k;

  // Seul l'adversaire est interpolé. Le joueur de cette machine garde la
  // position qu'il a prédite : la remplacer par un passé de cent millisecondes
  // rendrait la prédiction parfaitement inutile.
  if (G.p1) {
    const ax = G.p1.x, ay = G.p1.y;
    G.p1.x = entre(a.p1[0], b.p1[0]);
    G.p1.y = entre(a.p1[1], b.p1[1]);
    // L'animation de course se déduit du déplacement réel à l'écran : sans
    // elle, l'adversaire glisserait sur le terrain, raide.
    G.p1.moving = Math.hypot(G.p1.x - ax, G.p1.y - ay) > .35;
    G.p1.walk += G.p1.moving ? dt * 9 : 0;
  }
  G.disc.x = entre(a.d[0], b.d[0]);
  G.disc.y = entre(a.d[1], b.d[1]);
  // Le disque en main suit celui qui le porte, sans passer par le réseau : à
  // cent millisecondes de retard il flotterait à côté de la main de l'invité.
  const d = G.disc;
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
  gestes.pl = gestes.fe = gestes.sp = gestes.ad = 0; gestesVus = null;
  Partie.envoyes = 0; Partie.recus = 0; Partie.jetes = 0;
  tampon.length = 0; dernierEnvoi = 0;
  // Personne n'a encore choisi : l'hote doit attendre les deux presentations
  // avant de donner le coup d'envoi.
  attenteNouveauxChoix();
  histo.length = 0; correction.x = 0; correction.y = 0;
  surMessage(m => {
    if (!Partie.active) return;
    if (m.t === 'moi') { recevoirIdentite(m); return; }
    // L'hote a tranche : l'invite se range a son terrain, sans discuter.
    if (m.t === 'terrain') { setMapId(m.terrain); return; }
    // La pause d'en face est la nôtre. On ne la renvoie pas : deux écrans qui
    // se répercutent la pause l'un à l'autre ne s'arrêteraient jamais.
    if (m.t === 'pause') { if (surPause) surPause(!!m.on); return; }
    if (m.t === 'abandon') { if (surAbandon) surAbandon(); return; }
    // L'invité demande la revanche : seul l'hôte peut la donner.
    if (m.t === 'revanche') { if (Partie.role === 'hote') relancerMemeMatch(); return; }
    if (m.t === 'changeperso') {
      attenteNouveauxChoix();
      if (surChangementPerso) surChangementPerso();
      return;
    }
    if (m.t === 'go') {
      setMapId(m.terrain);
      if (auCoupDEnvoi) auCoupDEnvoi(m.p1, m.p2, m.terrain);
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

export function arreterPartieReseau() { Partie.active = false; Partie.role = null; Partie.adversaire = null; }

// Cadence d'envoi, découplée de la cadence d'affichage. L'état complet part
// trente fois par seconde : avec un vrai tampon d'interpolation en face, on ne
// voit aucune différence avec soixante, et on divise par deux la gigue de mise
// en file. La fiche de l'invité, elle, reste à soixante — elle est minuscule et
// c'est elle qui porte le délai ressenti sur ses propres gestes.
const PERIODE_ETAT = 1000 / 30;
const PERIODE_FICHE = 1000 / 60;
let dernierEnvoi = 0;

// Appelé à chaque image, une fois le reste du jeu à jour.
export function majReseau() {
  if (!Partie.active || !connecte()) return;
  const maintenant = performance.now();
  const periode = Partie.role === 'hote' ? PERIODE_ETAT : PERIODE_FICHE;
  if (maintenant - dernierEnvoi < periode) return;
  dernierEnvoi = maintenant;
  if (Partie.role === 'hote') {
    if (envoyer(etatPourLeReseau())) Partie.envoyes++;
  } else if (G.p2 && G.p2.cmd) {
    const f = fichePourLeReseau(G.p2.cmd);
    // Les drapeaux ont deja ete consommes par fichePourLeReseau : les effacer
    // une seconde fois ici est exactement ce qui creait la fenetre de perte.
    if (envoyer(f)) Partie.envoyes++;
    // On note où l'on se croit à ce numéro. C'est ce repère que l'hôte nous
    // renverra, et sans lui il n'y a rien à comparer donc rien à corriger.
    noterPrediction(G.p2.x, G.p2.y);
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
    terrain: Partie.monTerrain
  });
}

function recevoirIdentite(m) {
  Partie.adversaire = {
    id: m.id || null, pseudo: m.pseudo || null,
    perso: m.perso || null, terrain: m.terrain || null
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
  envoyer({ t: 'go', p1: persoHote, p2: persoInvite, terrain });
  if (auCoupDEnvoi) auCoupDEnvoi(persoHote, persoInvite, terrain);
}
