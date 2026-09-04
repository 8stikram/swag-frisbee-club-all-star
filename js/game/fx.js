import { G } from './state.js';
import { CY, CX, COURT } from '../core/constants.js';
import { TAU, rand, gauss } from '../core/utils.js';
import { W, H } from '../core/dom.js';
import { getSkinId } from '../data/skins.js';
import { Reglages } from '../data/disc-fx.js';
// Seau sans dépendance : il ne peut fermer aucun cycle avec l'état du jeu.
import { noterPopup, popupEtouffe } from '../reseau/echo.js';

export function burst(x, y, c, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(60, 340);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .8), c, s: rand(2, 5), g: 300 });
  }
}
export function dust(x, y, n) {
  for (let i = 0; i < n; i++) G.particles.push({ x: x + gauss() * 10, y, vx: gauss() * 60, vy: -rand(20, 90), life: .4, c: '#cfe0ff', s: 2, g: 0 });
}
export function ring(x, y, c) { G.particles.push({ x, y, vx: 0, vy: 0, life: .4, c, s: 2, g: 0, type: 'ring' }); }
export function confetti(x, y) {
  const cols = ['#ff8c1a', '#35e0ff', '#ffd23e', '#ff5340', '#7bd66a'];
  for (let i = 0; i < 50; i++) G.particles.push({ x, y, vx: gauss() * 260, vy: -rand(100, 420), life: rand(.6, 1.4), c: cols[(rand(5)) | 0], s: rand(2, 5), g: 520 });
}
export function starBurst(x, y) {
  const cols = ['#ffd23e', '#ffffff', '#ff8c1a', '#35e0ff', '#ff5340'];
  for (let i = 0; i < 40; i++) {
    const a = rand(TAU), sp = rand(80, 300);
    G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(.8, 1.8), c: cols[(rand(5)) | 0], s: rand(4, 9), g: 0, type: 'star' });
  }
}
// --- Mise en scène du but ---------------------------------------------------
// Une onde en demi-cercle part de la cage et balaie le terrain. Le demi-cercle
// plutôt que le cercle entier n'est pas un détail : la cage est sur le bord, la
// moitié extérieure ne serait jamais vue, et l'onde paraîtrait décentrée.
export function ondeDeBut(x, y, c, sens) {
  G.ondesBut.push({ x, y, c, sens, t: 0, dur: .75 });
}

// Confettis « numériques » : des carrés qui tombent lentement et durent le
// temps du ralenti, à l'opposé de la gerbe existante qui claque en une seconde.
// Peu nombreux et translucides — c'est ce qui les garde discrets alors qu'ils
// restent trois secondes à l'écran.
export function confettiNumerique(x) {
  const cols = ['#35e0ff', '#ffd23e', '#ff5340', '#7bd66a', '#ffffff'];
  for (let i = 0; i < 22; i++) {
    G.particles.push({
      x: x + gauss() * 120, y: rand(-40, 40), vx: gauss() * 22, vy: rand(40, 95),
      life: rand(2.4, 3.4), c: cols[(rand(5)) | 0], s: rand(2, 4), g: 8, doux: true
    });
  }
}

// Étoiles filantes du décor : elles n'existent que pendant que le disque
// Galaxie est en jeu. Deux au maximum, parce qu'au-delà ce n'est plus un ciel,
// c'est une pluie de météores — et elles doivent rester à l'arrière-plan.
let prochaineFilante = 0;
function majFilantes(dt) {
  for (let i = G.filantes.length - 1; i >= 0; i--) {
    const f = G.filantes[i];
    f.t += dt;
    if (f.t >= f.dur) { G.filantes.splice(i, 1); continue; }
    f.x += f.vx * dt; f.y += f.vy * dt;
  }
  if (!Reglages.particules || getSkinId() !== 'galaxy' || G.demo) { prochaineFilante = 0; return; }
  prochaineFilante -= dt;
  if (prochaineFilante > 0 || G.filantes.length >= 2) return;
  prochaineFilante = rand(1.6, 4.2);
  const versLaDroite = Math.random() < .5;
  const v = rand(420, 700);
  G.filantes.push({
    x: versLaDroite ? -60 : W + 60,
    y: rand(20, H * .55),
    vx: versLaDroite ? v : -v,
    vy: rand(90, 190),
    t: 0, dur: rand(.9, 1.5)
  });
}

export function addPopup(text, color, size = 18, dur = 1, y) {
  const py = y === undefined ? CY - 90 : y;
  // L'hôte note ce qu'il affiche pour le relayer ; l'invité se tait et attend
  // le relais. Presque tous ces messages naissent d'une décision d'arbitre —
  // le service, la faute, la réception parfaite, les points de zone — donc
  // l'invité n'en voyait aucun, et ceux qu'il produisait seul pouvaient
  // contredire l'hôte. Même règle que pour les sons, pour la même raison.
  noterPopup([text, color, size, dur, Math.round(py)]);
  if (popupEtouffe()) return;
  G.popups.push({ text, color, size, dur, t: 0, y: py });
}

// Un message venu de l'hôte : il s'affiche sans repasser par le filtre, sinon
// l'invité étoufferait justement ce qu'on lui relaie.
export function popupDistant(text, color, size, dur, y) {
  G.popups.push({ text, color, size, dur, t: 0, y });
}

export function updateFX(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    if (p.type === 'star') { p.x += p.vx * dt; p.y += p.vy * dt; }
    else { p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  if (G.particles.length > 450) G.particles.splice(0, G.particles.length - 450);
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const p = G.popups[i];
    p.t += dt;
    if (p.t > p.dur) G.popups.splice(i, 1);
  }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  for (let i = G.comments.length - 1; i >= 0; i--) {
    const c = G.comments[i];
    c.t += dt;
    if (c.t > c.dur) G.comments.splice(i, 1);
  }
  majFilantes(dt);
  for (let i = G.ondesBut.length - 1; i >= 0; i--) {
    const o = G.ondesBut[i];
    o.t += dt;
    if (o.t >= o.dur) G.ondesBut.splice(i, 1);
  }
  G.shake *= Math.exp(-6 * dt);
  G.goalFlash[0] = Math.max(0, G.goalFlash[0] - dt * 2);
  G.goalFlash[1] = Math.max(0, G.goalFlash[1] - dt * 2);
  if (G.lungeBonusTimer > 0) G.lungeBonusTimer -= dt; else G.lungeBonus = false;
}

// ---------------------------------------------------------------------------
// Mise en scène d'un but.
//
// Elle vit ici, et pas dans le code qui compte les points, parce que deux
// machines doivent la jouer : celle qui arbitre le match, et celle de l'invité
// en ligne — qui ne simule rien et ne passe donc jamais par le décompte. Sans
// ce point commun, l'invité voyait le score changer sans la moindre étincelle.
// ---------------------------------------------------------------------------
export function effetDeBut(side, y, couleur, accent, pts, nomCourt) {
  G.shake = 14;
  G.goalFlash[side === 1 ? 1 : 0] = 1;
  const gx = side === 1 ? COURT.right : COURT.left;
  burst(gx, y, '#ffd23e', 40); burst(gx, y, couleur, 30);
  confetti(gx, y); starBurst(gx, y);
  // L'onde part de la cage encaissée et balaie le terrain vers l'autre camp,
  // aux couleurs du buteur. Le flash reste court : il ponctue, il n'aveugle pas.
  ondeDeBut(gx, y, accent || couleur, side === 1 ? -1 : 1);
  confettiNumerique(CX);
  G.flash = Math.max(G.flash, .2);
  if (pts !== undefined) addPopup('+' + pts + '  ' + nomCourt + ' !', '#ffffff', 26, 1.6);
}
