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
