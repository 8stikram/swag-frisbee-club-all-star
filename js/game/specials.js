import { G, comment } from './state.js';
import { SPECIALS } from '../data/specials.js';
import { sfx } from '../audio/audio.js';
import { addPopup, burst, dust } from './fx.js';
import { dropDisc } from './actions.js';
import { gauss, rand } from '../core/utils.js';

export function trySpecial(p) {
  if (!p || G.demo || p.stun > 0 || G.cine) return;
  if (G.state !== 'play' && G.state !== 'serve') return;
  if (p.meter < 100) { addPopup('JAUGE SPÉCIAL VIDE', '#9fb4dd', 11, .7, p.y - 60); sfx('deny'); return; }
  const u = SPECIALS[p.char.ult];
  if (!u) return;
  if (u.needsDisc && !p.holding) { addPopup('IL FAUT LE DISQUE !', '#9fb4dd', 11, .7, p.y - 60); sfx('deny'); return; }
  u.cast(p);
}

export function launchCine(cine) {
  const u = SPECIALS[cine.ult];
  if (u && u.launch) u.launch(cine.p);
}

// La cloche se balance et sonne. À chaque coup, elle secoue l'écran et
// perturbe l'adversaire : sa visée part de travers un court instant. On agit
// sur son contrôle plutôt que sur le cadrage de sa moitié de terrain, qui
// aurait laissé apparaître des bords noirs en décalant l'image.
export function updateBell(dt) {
  const b = G.bell;
  if (!b) return;
  b.t += dt;
  if (b.t >= b.dur) {
    G.bell = null;
    addPopup('LA CLOCHE SE TAIT', '#f5c542', 13, .9);
    return;
  }
  // Un coup toutes les 0,9 s : secousse et désorientation de l'adversaire.
  if (b.t >= b.next) {
    b.next = b.t + .9;
    b.ring = 1;
    G.shake = Math.max(G.shake, 7);
    sfx('bigbounce');
    const foe = b.owner.foe;
    if (foe) {
      foe.dizzy = .55;                 // sa course dérive pendant ce temps
      if (foe.ai) foe.ai.hesT = .4;    // et l'IA hésite tout autant
    }
  }
  b.ring = Math.max(0, b.ring - dt * 2.2);
  // Elle repousse le disque qui approche de la cage protégée.
  const d = G.disc;
  if (d.free && Math.hypot(d.x - b.x, d.y - b.y) < 62) {
    const away = b.side === 1 ? 1 : -1;
    d.vx = Math.abs(d.vx || 400) * away * 1.15;
    d.vy += gauss() * 180;
    G.shake = Math.max(G.shake, 9);
    sfx('bigbounce');
    addPopup('REPOUSSÉ !', '#f5c542', 14, .7, b.y - 60);
  }
}

export function updateLeg(dt) {
  const L = G.leg;
  if (!L) return;
  L.t += dt;
  if (L.phase === 'shadow' && L.t > .55) { L.phase = 'fall'; L.t = 0; sfx('dash'); }
  else if (L.phase === 'fall' && L.t > .16) { L.phase = 'impact'; L.t = 0; legImpact(L); }
  else if (L.phase === 'impact' && L.t > .4) { G.leg = null; }
}

function legImpact(L) {
  G.shake = 18; sfx('splat');
  dust(L.x, L.yTarget, 22);
  burst(L.x, L.yTarget, '#c98686', 24);
  burst(L.x, L.yTarget, '#ff6a7a', 14);
  addPopup('SPLAT !', '#ff6a7a', 22, 1);
  const foe = L.caster.foe;
  if (Math.hypot(foe.x - L.x, foe.y - L.yTarget) < 88) {
    foe.stun = 2.0;
    if (foe.holding) dropDisc(foe);
    foe.charging = false; foe.wasCharging = false; foe.charge = 0;
    addPopup('ÉTOURDI !', '#ffd23e', 15, 1.1);
    sfx('stun'); comment('ÉCRASÉ !');
  }
  if (G.disc.free && Math.hypot(G.disc.x - L.x, G.disc.y - L.yTarget) < 95) {
    G.disc.vx = gauss() * 380;
    G.disc.vy = -rand(220, 400);
  }
}
