import { G } from './state.js';

// L'ordre reproduit exactement celui du rendu : sans le dash ni le plongeon, ces
// poses disparaissaient du replay et les personnages semblaient figés alors
// qu'ils étaient en pleine action.
function snapFrame(p) {
  let fr = 'idle';
  if (p.diveT > 0 || p.diveDown > 0) fr = 'dive';
  else if (p.dashT > 0) fr = 'dash';
  else if (p.holding && (p.charging || p.throwPoseT > 0)) fr = 'throw';
  else if (p.moving) fr = (Math.floor(p.walk) % 2) ? 'run1' : 'run2';
  return { x: p.x, y: p.y, face: p.face, fr };
}

export function capture() {
  if (G.demo) return;
  // Rien à enregistrer pendant un rembobinage : ces images ont déjà été
  // filmées la première fois, on ne fait que recalculer où tout se trouvait.
  // Surtout, ce tampon GLISSE — ses images sorties par la fenêtre sont perdues
  // — donc il ne sait pas revenir en arrière. Le laisser participer au
  // rembobinage faisait repartir les rejeux d'un autre endroit et suffisait à
  // faire diverger tout le match derrière. Il avance donc, et jamais ne recule.
  if (G.rembobine) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  G.rec.push({
    p1: snapFrame(G.p1),
    p2: snapFrame(G.p2),
    d: { x: G.disc.x, y: G.disc.y, spin: G.disc.spin, big: G.disc.big, super: G.disc.super },
    held: !!G.disc.heldBy,   // sert à retrouver l'instant du tir dans le replay
    // Les leurres du Tir Matilda font partie de l'action : sans eux, le replay
    // d'un but à l'ultime ne montrerait qu'un seul disque au lieu de trois.
    dec: G.decoys.length ? G.decoys.map(o => ({ x: o.x, y: o.y })) : null
  });
  // La fenêtre glisse : on décale aussi le repère de la dernière prise de disque
  // pour qu'il continue de pointer la bonne image.
  if (G.rec.length > 240) { G.rec.shift(); if (G.lastCatchIdx > 0) G.lastCatchIdx--; }
}

export function applySnap(s) {
  if (!s) return;
  // Traînée légère derrière le disque pour lire sa trajectoire.
  if (G.disc) {
    G.trail.push({ x: G.disc.x, y: G.disc.y, life: .32, spin: G.disc.spin });
    if (G.trail.length > 14) G.trail.shift();
  }
  const a = G.p1, b = G.p2, d = G.disc;
  // On conserve les animations du jeu : `moving` est recalculé d'après le
  // déplacement réel entre deux images, ce qui fait vivre la marche, la
  // poussière et les fantômes comme en match. Les figer donnait des
  // personnages statiques qui glissaient sur le terrain.
  const anime = (p, s) => {
    const dx = s.x - p.x, dy = s.y - p.y;
    p.moving = Math.hypot(dx, dy) > .6;
    if (p.moving) p.walk += .35;
    p.x = s.x; p.y = s.y; p.face = s.face; p.forceFr = s.fr;
    p.charging = false; p.stun = 0;
  };
  anime(a, s.p1);
  anime(b, s.p2);
  d.x = s.d.x; d.y = s.d.y; d.spin = s.d.spin; d.big = s.d.big; d.super = s.d.super;
  d.heldBy = null; d.free = true; d.kind = 'normal'; d.vx = 0; d.vy = 0;
  // Rejoue les leurres tels qu'ils étaient, pour que le triple tir se voie.
  G.decoys.length = 0;
  if (s.dec) for (const o of s.dec) G.decoys.push({ x: o.x, y: o.y, vx: 0, vy: 0, life: 1, real: false, thrower: null });
}
