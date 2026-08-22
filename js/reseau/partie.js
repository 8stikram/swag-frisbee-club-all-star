import { G } from '../game/state.js';
import { Reseau, envoyer, connecte, surMessage } from './connexion.js';
import { Compte, monId } from './compte.js';

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

export const Partie = { active: false, role: null, dernierEtat: 0, adversaire: null };

// L'invité n'envoie que sa fiche d'intentions : cinq nombres et deux
// booléens. C'est tout ce dont l'hôte a besoin pour le faire jouer.
function fichePourLeReseau(c) {
  return {
    t: 'c',
    dx: +c.dep.x.toFixed(2), dy: +c.dep.y.toFixed(2),
    vx: +c.visee.x.toFixed(3), vy: +c.visee.y.toFixed(3),
    tir: c.tir ? 1 : 0, dash: c.dash ? 1 : 0,
    // Les gestes ponctuels partent une seule fois, comme en local.
    pl: c.plongeon ? 1 : 0, fe: c.feinte ? 1 : 0, sp: c.special ? 1 : 0
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
    t: 'e',
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
  // On pose l'intention ; la boucle l'exécutera et l'effacera, exactement
  // comme pour un joueur assis devant cette machine.
  if (m.pl) c.plongeon = true;
  if (m.fe) c.feinte = true;
  if (m.sp) c.special = true;
}

export function demarrerPartieReseau(role) {
  Partie.active = true; Partie.role = role;
  surMessage(m => {
    if (!Partie.active) return;
    if (m.t === 'moi') { recevoirIdentite(m); return; }
    if (role === 'hote' && m.t === 'c' && G.p2) appliquerFiche(G.p2, m);
    else if (role === 'invite' && m.t === 'e') appliquerEtat(m);
  });
}

export function arreterPartieReseau() { Partie.active = false; Partie.role = null; Partie.adversaire = null; }

// Appelé à chaque image, une fois le reste du jeu à jour.
export function majReseau() {
  if (!Partie.active || !connecte()) return;
  if (Partie.role === 'hote') {
    envoyer(etatPourLeReseau());
  } else if (G.p2 && G.p2.cmd) {
    const f = fichePourLeReseau(G.p2.cmd);
    envoyer(f);
    // Les gestes ponctuels sont partis : on les efface ici, sinon l'invité les
    // rejouerait aussi chez lui alors que seul l'hôte doit les arbitrer.
    G.p2.cmd.plongeon = false; G.p2.cmd.feinte = false; G.p2.cmd.special = false;
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
  envoyer({
    t: 'moi',
    id: monId() || null,
    pseudo: (Compte.profil && Compte.profil.pseudo) || null,
    perso: perso || null
  });
}

function recevoirIdentite(m) {
  Partie.adversaire = { id: m.id || null, pseudo: m.pseudo || null, perso: m.perso || null };
}
