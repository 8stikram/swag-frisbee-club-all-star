import { G, Mouse, resetDisc, initMatch, comment } from './state.js';
import { COURT, CY, TARGET, GOAL_MID1, GOAL_MID2, throwSpeed } from '../core/constants.js';
import { clamp, norm, gauss, pick, rand } from '../core/utils.js';
import { zoneByY } from '../data/maps.js';
import { portraitURL } from '../data/characters.js';
import { sfx } from '../audio/audio.js';
import { burst, dust, ring, confetti, starBurst, addPopup } from './fx.js';
import { $, cv, showScreen } from '../core/dom.js';

export function setupServe(side) {
  G.state = 'serve'; G.serveTo = side;
  G.decoys.length = 0; G.trail.length = 0; G.rally = 0; G.cine = null; G.leg = null;
  G.disc = resetDisc();
  for (const p of [G.p1, G.p2]) {
    p.x = p.home.x; p.y = CY;
    p.holding = false; p.charging = false; p.wasCharging = false; p.charge = 0;
    p.dashV = { x: 0, y: 0 }; p.vx = 0; p.vy = 0;
    p.throwCd = 0; p.stun = 0; p.ghosts.length = 0; p.forceFr = null; p.holdTimer = 0;
    if (p.ai) {
      p.ai.plan = null; p.ai.tracked = null; p.ai.miss = false; p.ai.hesT = 0;
      p.ai.state = 'READY'; p.ai.shootTimer = 0; p.ai.forceShoot = false;
    }
  }
  const server = side === 1 ? G.p1 : G.p2;
  server.holding = true; G.disc.heldBy = server;
  addPopup('SERVICE : ' + server.char.short, server.char.accent, 15, 1.4);
}

export function throwDisc(p, dir, speed, kind = 'normal') {
  const d = G.disc;
  let bonus = 1;
  if (G.lungeBonus && G.lungeBonusTimer > 0 && p.human && !p.holding) {
    bonus = 1.6; G.lungeBonus = false; G.lungeBonusTimer = 0;
    burst(p.x + dir.x * 20, p.y + dir.y * 20, '#35e0ff', 10);
  }
  const finalSpeed = speed * bonus;
  d.x = p.x + dir.x * 22; d.y = p.y + dir.y * 22;
  d.vx = dir.x * finalSpeed; d.vy = dir.y * finalSpeed;
  d.heldBy = null; d.free = true; d.thrower = p; d.thrownAt = G.now; d.bounced = false;
  d.kind = kind; d.stall = 0;
  d.big = (kind === 'kurama'); d.kSpeed = (kind === 'kurama') ? finalSpeed : 0;
  d.super = (kind === 'normal' && p.charge >= .98);
  p.holding = false; p.charging = false; p.wasCharging = false; p.charge = 0; p.fullFlash = false;
  p.throwCd = .32; p.throwPoseT = .28; p.stats.thrown++; p.holdTimer = 0;
  sfx(d.super ? 'superthrow' : 'throw');
  if (d.super) {
    burst(p.x + dir.x * 24, p.y + dir.y * 24, '#ff5340', 14);
    G.shake = Math.max(G.shake, 4);
    comment('QUELLE PUISSANCE !');
  }
  if (p.human) {
    if (Mouse.y < GOAL_MID1) G.mem.t++;
    else if (Mouse.y > GOAL_MID2) G.mem.b++;
    else G.mem.m++;
  }
  G.idleT = 0;
  onThrowEvent(p);
}

export function doThrowHuman(p) {
  if (!p.holding) return;
  const dir = norm(Mouse.x - p.x, Mouse.y - p.y);
  p.face = dir.x >= 0 ? 1 : -1;
  throwDisc(p, dir, throwSpeed(p.charge, p.char.power));
}

export function onThrowEvent(thrower) {
  const foe = thrower.foe;
  if (foe.ai) {
    const D = foe.ai.diff;
    foe.ai.reactAt = G.now + D.react * (0.8 + rand(.5));
    foe.ai.miss = Math.random() < D.miss;
    foe.ai.missOff = (rand() < .5 ? -1 : 1) * (90 + rand(80));
    foe.ai.tracked = null;
    foe.ai.plan = null;
  }
}

export function onCatch(p, sp, dirx, diry) {
  const d = G.disc;
  const kb = clamp(sp * .22, 26, 260);
  p.dashV.x += (dirx || 0) * kb; p.dashV.y += (diry || 0) * kb * .4;
  dust(p.x, p.y + 18, Math.min(10, 2 + sp / 200));
  d.heldBy = p; d.free = false; d.vx = 0; d.vy = 0; d.kind = 'normal'; d.big = false; d.super = false;
  p.holding = true; p.charge = 0; p.stats.catches++;
  p.meter = clamp(p.meter + 12, 0, 100);
  p.holdTimer = 0;
  G.rally++; G.maxRally = Math.max(G.maxRally, G.rally); G.idleT = 0;
  sfx('catch'); ring(p.x, p.y, p.char.accent);
  if (sp > 780) {
    p.meter = clamp(p.meter + 20, 0, 100);
    addPopup('PERFECT CATCH !', '#ffffff', 14, .9, p.y - 56);
    G.timescale = .3; G.tsTimer = .18; sfx('perfect');
    G.shake = Math.max(G.shake, 7);
    comment('INCROYABLE ARRÊT !');
  } else if (sp > 420) { G.shake = Math.max(G.shake, 3); }
  if (G.rally === 6) comment('QUEL ÉCHANGE !');
  if (p.ai) p.ai.plan = null;
}

export function dropDisc(p) {
  const d = G.disc;
  d.heldBy = null; d.free = true; d.x = p.x; d.y = p.y;
  d.vx = gauss() * 140; d.vy = gauss() * 140;
  d.thrownAt = G.now - 1; d.thrower = null; d.kind = 'normal'; d.big = false; d.super = false;
  p.holding = false; p.charging = false; p.wasCharging = false; p.charge = 0; p.throwCd = .7; p.holdTimer = 0;
}

export function ownFoul(p) {
  p.score = Math.max(0, p.score - 1);
  G.shake = 10; sfx('whistle');
  addPopup('FAUTE ! −1 POINT', '#ff5340', 20, 1.5);
  comment('OH LA FAUTE !');
  burst(p.side === 1 ? COURT.left : COURT.right, p.y, '#ff5340', 18);
  setupServe(p.foe.side);
}

export function scoreGoal(scorer, y) {
  const pts = zoneByY(y);
  scorer.score += pts;
  scorer.meter = clamp(scorer.meter + 25, 0, 100);
  scorer.foe.meter = clamp(scorer.foe.meter + 15, 0, 100);
  G.state = 'goal'; G.goalT = 1.1; G.timescale = .28; G.tsTimer = .5; G.shake = 14;
  G.goalFlash[scorer.side === 1 ? 1 : 0] = 1;
  const gx = scorer.side === 1 ? COURT.right : COURT.left;
  burst(gx, y, '#ffd23e', 40); burst(gx, y, scorer.char.color, 30);
  confetti(gx, y); starBurst(gx, y);
  addPopup('+' + pts + '  ' + scorer.char.short + ' !', '#ffffff', 26, 1.6);
  sfx('goal');
  if (scorer.ai) { comment(pick(["L'IA EST EN FEU !", "L'IA FRAPPE FORT !", "LE CPU PUNIT !"])); }
  else if (pts === 5) { comment(pick(['ZONE 5 ! QUEL SNIPER !', 'EN PLEINE LUCARNE !', 'MAGNIFIQUE !'])); }
  else { comment(pick(['QUEL TIR !', 'BEAU LANCER !', 'DIRECT AU BUT !'])); }
  if (scorer.foe.ai) { scorer.foe.ai.aggro = 9; }
  if (scorer.score >= TARGET) G.winner = scorer;
  G.pendingServe = scorer.foe.side;
}

export function afterGoal() { if (G.winner) gameOver(); else setupServe(G.pendingServe); }

export function startReplay() {
  const n = G.rec.length;
  if (n < 45) { afterGoal(); return; }
  G.replay = { idx: Math.max(0, n - 95), end: n - 1, speed: .5 };
  G.state = 'replay'; sfx('replay');
  G.p1.ghosts.length = 0; G.p2.ghosts.length = 0;
}

export function skipReplay() { if (!G.replay) return; G.replay = null; afterGoal(); }

export function gameOver() {
  G.state = 'over';
  if (G.demo) { initMatch(true); return; }
  if (document.pointerLockElement === cv) document.exitPointerLock();
  const win = G.winner === G.p1;
  sfx(win ? 'win' : 'lose');
  const t = $('overTitle');
  t.textContent = win ? 'VICTOIRE !' : 'DÉFAITE...';
  t.className = win ? 'win' : 'lose';
  $('overImg').src = portraitURL(G.winner.ck);
  $('overScore').textContent = G.p1.score + ' — ' + G.p2.score;
  $('overStats').innerHTML = `Disques attrapés : <b>${G.p1.stats.catches}</b> (IA : ${G.p2.stats.catches})<br>Spéciales utilisées : <b>${G.p1.stats.specials}</b> (IA : ${G.p2.stats.specials})<br>Plus long échange : <b>${G.maxRally}</b> lancers`;
  showScreen('over');
}
