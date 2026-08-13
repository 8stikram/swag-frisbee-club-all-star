import { G } from './state.js';

function snapFrame(p) {
  let fr = 'idle';
  if (p.holding && (p.charging || p.throwPoseT > 0)) fr = 'throw';
  else if (p.moving) fr = (Math.floor(p.walk) % 2) ? 'run1' : 'run2';
  return { x: p.x, y: p.y, face: p.face, fr };
}

export function capture() {
  if (G.demo) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  G.rec.push({
    p1: snapFrame(G.p1),
    p2: snapFrame(G.p2),
    d: { x: G.disc.x, y: G.disc.y, spin: G.disc.spin, big: G.disc.big, super: G.disc.super }
  });
  if (G.rec.length > 240) G.rec.shift();
}

export function applySnap(s) {
  if (!s) return;
  const a = G.p1, b = G.p2, d = G.disc;
  a.x = s.p1.x; a.y = s.p1.y; a.face = s.p1.face; a.forceFr = s.p1.fr; a.moving = false; a.charging = false; a.stun = 0;
  b.x = s.p2.x; b.y = s.p2.y; b.face = s.p2.face; b.forceFr = s.p2.fr; b.moving = false; b.charging = false; b.stun = 0;
  d.x = s.d.x; d.y = s.d.y; d.spin = s.d.spin; d.big = s.d.big; d.super = s.d.super;
  d.heldBy = null; d.free = true; d.kind = 'normal'; d.vx = 0; d.vy = 0;
}
