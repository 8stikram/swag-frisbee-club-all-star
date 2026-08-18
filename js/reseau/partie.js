import { G } from '../game/state.js';
import { Reseau, envoyer, connecte, surMessage } from './connexion.js';

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

export const Partie = { active: false, role: null, dernierEtat: 0 };

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
    p.x = a[0]; p.y = a[1]; p.face = a[2]; p.meter = a[3];
    p.score = a[4]; p.holding = !!a[5]; p.charge = a[6];
    p.diveT = a[7]; p.dashT = a[8]; p.sixT = a[9];
    // Le personnage doit continuer à s'animer entre deux nouvelles : sans ça
    // il glisse sur le terrain, raide, au lieu de courir.
    p.moving = Math.abs(p.x - (p._rx ?? p.x)) + Math.abs(p.y - (p._ry ?? p.y)) > 1;
    p._rx = p.x; p._ry = p.y;
  };
  pose(G.p1, m.p1); pose(G.p2, m.p2);
  const d = G.disc;
  d.x = m.d[0]; d.y = m.d[1]; d.spin = m.d[2]; d.kind = m.d[3];
  d.heldBy = m.d[4] === 1 ? G.p1 : (m.d[4] === 2 ? G.p2 : null);
  d.free = !d.heldBy;
  d.big = d.kind === 'kurama';
  G.state = m.st;
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
    if (role === 'hote' && m.t === 'c' && G.p2) appliquerFiche(G.p2, m);
    else if (role === 'invite' && m.t === 'e') appliquerEtat(m);
  });
}

export function arreterPartieReseau() { Partie.active = false; Partie.role = null; }

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
