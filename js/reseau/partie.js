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
// Compte un geste au moment où le joueur le demande, et non au moment de
// l'envoi. Lu à l'envoi, il fallait que le drapeau soit encore levé à l'instant
// précis où la boucle passait par là : selon l'ordre des images, le geste
// partait ou se perdait sans laisser de trace. C'était toute l'irrégularité du
// plongeon, de la feinte et de l'ultime en ligne.
export function noterGeste(nom) {
  if (nom === 'plongeon') gestes.pl++;
  else if (nom === 'feinte') gestes.fe++;
  else if (nom === 'special') gestes.sp++;
  else if (nom === 'annuleDash') gestes.ad++;
}

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
    +p.diveT.toFixed(2), +p.dashT.toFixed(2), +(p.sixT || 0).toFixed(1)];
  const d = G.disc;
  return {
    t: 'e', n: ++numeroEnvoi,
    p1: j(G.p1), p2: j(G.p2),
    d: [Math.round(d.x), Math.round(d.y), +d.spin.toFixed(2), d.kind, d.heldBy ? (d.heldBy === G.p1 ? 1 : 2) : 0],
    st: G.state
  };
}

function appliquerEtat(m) {
  const pose = (p, a) => {
    if (!p || !a) return;
    // On ne pose pas la position : on pose une destination. Se téléporter à
    // chaque nouvelle du réseau donnait une image qui sautait soixante fois
    // par seconde ; on s'y rend en glissant, ce qui rend le mouvement continu
    // même quand une nouvelle se perd en route.
    p.cible = { x: a[0], y: a[1] };
    if (p._neuf === undefined) { p.x = a[0]; p.y = a[1]; p._neuf = 1; }
    p.face = a[2]; p.meter = a[3];
    p.score = a[4]; p.holding = !!a[5]; p.charge = a[6];
    p.diveT = a[7]; p.dashT = a[8]; p.sixT = a[9];
  };
  pose(G.p1, m.p1); pose(G.p2, m.p2);
  const d = G.disc;
  d.cible = { x: m.d[0], y: m.d[1] };
  if (d._neuf === undefined) { d.x = m.d[0]; d.y = m.d[1]; d._neuf = 1; }
  d.spin = m.d[2]; d.kind = m.d[3];
  d.heldBy = m.d[4] === 1 ? G.p1 : (m.d[4] === 2 ? G.p2 : null);
  d.free = !d.heldBy;
  d.big = d.kind === 'kurama';
  G.state = m.st;
}

// Rapproche l'image de sa destination. Un disque lancé traverse le terrain :
// on le rattrape plus vite qu'un personnage, sinon il traînerait derrière sa
// vraie position au moment précis où on essaie de l'attraper.
function glisser(o, dt, vitesse) {
  if (!o || !o.cible) return;
  const k = 1 - Math.exp(-vitesse * dt);
  o.x += (o.cible.x - o.x) * k;
  o.y += (o.cible.y - o.y) * k;
}

export function lisserAffichage(dt) {
  if (!Partie.active || Partie.role !== 'invite') return;
  for (const p of [G.p1, G.p2]) {
    if (!p) continue;
    const ax = p.x, ay = p.y;
    glisser(p, dt, 18);
    // L'animation de course se déduit du déplacement réel à l'écran : sans
    // elle, les deux personnages glisseraient sur le terrain, raides.
    p.moving = Math.hypot(p.x - ax, p.y - ay) > .35;
    p.walk += p.moving ? dt * 9 : 0;
  }
  glisser(G.disc, dt, 26);
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
  surMessage(m => {
    if (!Partie.active) return;
    if (m.t === 'moi') { recevoirIdentite(m); return; }
    // L'hote a tranche : l'invite se range a son terrain, sans discuter.
    if (m.t === 'terrain') { setMapId(m.terrain); return; }
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

// Appelé à chaque image, une fois le reste du jeu à jour.
export function majReseau() {
  if (!Partie.active || !connecte()) return;
  if (Partie.role === 'hote') {
    if (envoyer(etatPourLeReseau())) Partie.envoyes++;
  } else if (G.p2 && G.p2.cmd) {
    const f = fichePourLeReseau(G.p2.cmd);
    if (envoyer(f)) Partie.envoyes++;
    // Les gestes ponctuels sont partis : on les efface ici, sinon l'invité les
    // rejouerait aussi chez lui alors que seul l'hôte doit les arbitrer.
    G.p2.cmd.plongeon = false; G.p2.cmd.feinte = false; G.p2.cmd.special = false; G.p2.cmd.annuleDash = false;
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
  // L'hôte seul tranche, puis donne le coup d'envoi avec les deux personnages
  // et le terrain retenu. Deux décisions indépendantes donneraient deux matchs
  // différents, et les joueurs ne verraient pas la même chose.
  if (Partie.role === 'hote' && Partie.monPerso) {
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
