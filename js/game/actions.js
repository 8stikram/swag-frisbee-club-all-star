import { G, Mouse, resetDisc, initMatch, comment } from './state.js';
import {
  COURT, CY, TARGET, GOAL_MID1, GOAL_MID2, throwSpeed,
  DIVE_TIME, DIVE_RANGE, DIVE_WHIFF_DOWN, DIVE_POWER,
  PERFECT_WINDOW, PERFECT_SPEED, DISC_RADIUS, DASH_THROW_WINDOW
} from '../core/constants.js';
import { clamp, norm, gauss, pick, rand } from '../core/utils.js';
import { zoneByY } from '../data/maps.js';
import { CHARS } from '../data/characters.js';
import { sfx, setMuffled } from '../audio/audio.js';
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
  // Dash Throw : attraper pendant un dash puis tirer dans la foulée envoie le
  // disque à pleine puissance sans avoir eu besoin de charger.
  if (p.dashThrowT > 0) {
    p.dashThrowT = 0; p.charge = 1;
    addPopup('DASH THROW !', '#35e0ff', 15, .8, p.y - 56);
    burst(p.x + dir.x * 24, p.y + dir.y * 24, '#35e0ff', 14);
    G.shake = Math.max(G.shake, 6);
    throwDisc(p, dir, throwSpeed(1, p.char.power));
    return;
  }
  throwDisc(p, dir, throwSpeed(p.charge, p.char.power));
}

// Plongeon : purement défensif. Il ne rattrape jamais le disque, il le repousse
// très fort. Déclenché dans le vide, le joueur tombe et reste vulnérable.
export function doDive(p, aim) {
  const d = G.disc;
  p.diveT = DIVE_TIME; p.diveHit = false;
  p.diveDir = aim;
  p.face = aim.x >= 0 ? 1 : -1;
  p.charging = false; p.wasCharging = false; p.charge = 0;
  p.dashV.x += aim.x * 300; p.dashV.y += aim.y * 300;
  dust(p.x, p.y + 20, 5); sfx('dash');

  const inRange = d.free && Math.hypot(d.x - p.x, d.y - p.y) < DIVE_RANGE + DISC_RADIUS;
  if (!inRange) {
    // Whiff : plongeon dans le vide, le joueur reste au sol un instant.
    p.diveDown = DIVE_WHIFF_DOWN;
    return;
  }
  p.diveHit = true;
  // Perfect Dive : le disque doit venir vers nous ET être sur le point d'arriver.
  // On exige les deux conditions, sinon un disque lent déclencherait le parry
  // alors qu'il est encore loin.
  const closing = (d.x - p.x) * d.vx + (d.y - p.y) * d.vy < 0;
  const dist = Math.hypot(d.x - p.x, d.y - p.y);
  const tti = dist / Math.max(1, Math.hypot(d.vx, d.vy));
  if (closing && tti <= PERFECT_WINDOW && dist < DIVE_RANGE) perfectDive(p);
  else {
    throwDisc(p, aim, DIVE_POWER * p.char.power);
    burst(d.x, d.y, p.char.accent, 16);
    G.shake = Math.max(G.shake, 7);
    addPopup('CONTRE !', '#ffd23e', 13, .7, p.y - 56);
  }
}

// Renvoi parfait : visé automatiquement vers le but adverse, à vitesse fulgurante,
// avec ralenti, flash et secousse. Aucun son neuf : on réutilise ceux du jeu.
function perfectDive(p) {
  const gx = p.side === 1 ? COURT.right : COURT.left;
  const dir = norm(gx - p.x, CY - p.y);
  throwDisc(p, dir, PERFECT_SPEED * p.char.power);
  G.disc.super = true;
  p.meter = clamp(p.meter + 30, 0, 100);
  G.timescale = .3; G.tsTimer = .3;
  G.zoom = { t: 0, dur: .45, x: p.x, y: p.y };
  G.flash = .35;
  G.shake = Math.max(G.shake, 18);
  G.banner = { text: 'PERFECT DIVE !', color: '#35e0ff', t: 0, dur: 1.1 };
  burst(p.x, p.y, '#ffffff', 26); burst(p.x, p.y, '#35e0ff', 22);
  starBurst(p.x, p.y); ring(p.x, p.y, '#35e0ff');
  sfx('perfect'); comment('QUEL RENVOI !');
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
  // Mesuré avant que le recul de l'attrapé ne vienne gonfler dashV.
  const enDash = Math.hypot(p.dashV.x, p.dashV.y) > 130 || p.lunge > 0;
  const kb = clamp(sp * .22, 26, 260);
  p.dashV.x += (dirx || 0) * kb; p.dashV.y += (diry || 0) * kb * .4;
  dust(p.x, p.y + 18, Math.min(10, 2 + sp / 200));
  d.heldBy = p; d.free = false; d.vx = 0; d.vy = 0; d.kind = 'normal'; d.big = false; d.super = false;
  G.trail.length = 0;
  p.holding = true; p.charge = 0; p.stats.catches++;
  if (enDash) p.stats.dashCatches++;
  p.meter = clamp(p.meter + 12, 0, 100);
  p.holdTimer = 0;
  G.rally++; G.maxRally = Math.max(G.maxRally, G.rally); G.idleT = 0;
  G.lastCatchIdx = G.rec.length;   // point de départ du prochain replay
  // Attrapé pendant un dash (ou juste après un Cancel Dash) : le joueur a un
  // court instant pour déclencher un Dash Throw, tir instantané à pleine
  // puissance. S'il ne clique pas, il garde simplement le disque en main.
  if (p.dashT > 0 || p.cancelCatchT > 0) p.dashThrowT = DASH_THROW_WINDOW;
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
  scorer.stats.buts++;
  if (pts >= 5) scorer.stats.z5++; else scorer.stats.z3++;
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
  if (n < 12) { afterGoal(); return; }
  // Durée adaptative : on remonte jusqu'à l'instant où le buteur a pris le
  // disque, plutôt que d'utiliser un nombre d'images fixe. On borne quand même
  // pour éviter un replay interminable sur une possession très longue.
  let start = (G.lastCatchIdx >= 0 && G.lastCatchIdx < n - 8) ? G.lastCatchIdx : n - 90;
  start = Math.max(0, Math.min(start, n - 12));
  if (n - start > 200) start = n - 200;
  // Repère du tir : première image où le disque n'est plus tenu.
  let shot = start;
  for (let i = start; i < n; i++) { if (!G.rec[i].held) { shot = i; break; } }
  G.replay = { idx: start, end: n - 1, shot, speed: 1, closing: 0 };
  G.state = 'replay'; sfx('replay');
  setMuffled(true);
  G.p1.ghosts.length = 0; G.p2.ghosts.length = 0;
}

// Fin du replay : les bandes se referment sur un léger flash avant le retour au
// jeu. Le son redevient normal.
export function endReplay() {
  if (!G.replay) return;
  G.replay.closing = .001;      // amorce l'animation de fermeture
}
export function finishReplay() {
  G.replay = null;
  setMuffled(false);
  G.flash = Math.max(G.flash, .22);
  afterGoal();
}
export function skipReplay() { endReplay(); }

function drawOverSprite(canvasEl, ck, scale) {
  const src = CHARS[ck].frames.idle;
  canvasEl.width = src.width * scale;
  canvasEl.height = src.height * scale;
  const c = canvasEl.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, canvasEl.width, canvasEl.height);
}

// Titre en perspective dégressive : une lettre par span, taille décroissante.
function buildPerspectiveTitle(el, text) {
  el.innerHTML = '';
  const n = text.length, maxSize = 31, minSize = 9;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const span = document.createElement('span');
    span.textContent = text[i];
    span.style.fontSize = (maxSize - (maxSize - minSize) * t).toFixed(2) + 'cqh';
    el.appendChild(span);
  }
}

function spawnConfetti() {
  const wrap = $('confettiWrap');
  if (wrap.childElementCount) return; // déjà généré
  const cols = ['#ff8c1f', '#f5e63d', '#5df08a', '#35e0ff', '#ff3b5c', '#c86bff'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + '%';
    el.style.background = cols[(Math.random() * cols.length) | 0];
    el.style.animationDelay = (Math.random() * 3.4) + 's';
    wrap.appendChild(el);
  }
}

// Stats détaillées par joueur, ouvertes au clic sur un portrait.
let overDetail = {};
function openOverDetail(who) {
  const s = overDetail[who];
  if (!s) return;
  $('vicDetailName').textContent = CHARS[s.ck].short + ' — ' + s.tag;
  $('dButs').textContent = s.buts;
  $('dAttrapes').textContent = s.catches;
  $('d5pt').textContent = s.z5;
  $('d3pt').textContent = s.z3;
  $('dUltimes').textContent = s.specials;
  $('dDash').textContent = s.dashCatches;
  $('vicDetailScrim').classList.add('open');
}
$('vicPortrait').addEventListener('click', () => openOverDetail('winner'));
$('vicLoserCol').addEventListener('click', () => openOverDetail('loser'));
$('vicDetailClose').addEventListener('click', () => $('vicDetailScrim').classList.remove('open'));
$('vicDetailScrim').addEventListener('click', e => {
  if (e.target.id === 'vicDetailScrim') e.currentTarget.classList.remove('open');
});

export function gameOver() {
  G.state = 'over';
  if (G.demo) { initMatch(true); return; }
  if (document.pointerLockElement === cv) document.exitPointerLock();
  const win = G.winner === G.p1;
  sfx(win ? 'win' : 'lose');

  const winner = G.winner, loser = winner.foe;
  const winnerIsP1 = winner === G.p1;

  buildPerspectiveTitle($('vicName'), winner.char.short);
  $('vicOutcome').textContent = win ? 'VICTOIRE' : 'DÉFAITE';
  drawOverSprite($('vicPortrait'), winner.ck, 18);
  drawOverSprite($('vicLoserPortrait'), loser.ck, 8);

  const flag = $('vicFlag'), loserTag = $('vicLoserTag');
  flag.textContent = winnerIsP1 ? 'P1' : (G.isJ2J ? 'J2' : 'CPU');
  flag.className = 'bigFlag ' + (winnerIsP1 ? 'red' : 'gray');
  loserTag.textContent = winnerIsP1 ? (G.isJ2J ? 'J2' : 'CPU') : 'P1';
  loserTag.className = 'flag ' + (winnerIsP1 ? 'gray' : 'red');

  $('vicCatch').textContent = G.p1.stats.catches;
  $('vicSpec').textContent = G.p1.stats.specials;
  $('vicRally').textContent = G.maxRally;

  overDetail = {
    winner: { ck: winner.ck, tag: flag.textContent, ...winner.stats },
    loser: { ck: loser.ck, tag: loserTag.textContent, ...loser.stats }
  };

  spawnConfetti();
  $('confettiWrap').style.display = win ? 'block' : 'none';
  $('vicDetailScrim').classList.remove('open');
  showScreen('over');
}
