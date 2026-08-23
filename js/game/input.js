import { dansLesSables, RALENTI_SABLES } from './desert.js';
import { Partie } from '../reseau/partie.js';
import { G, Mouse } from './state.js';
import { $, cv, W, H, curScreen, showScreen, moveMenu, activateMenu, setSelIdx, menuButtons } from '../core/dom.js';
import {
  COURT, CX, DASH_SPEED, DASH_DECAY, DASH_CD, DASH_DIST, DASH_TIME, DASH_GAP,
  CANCEL_GAP, CANCEL_CATCH, FEINT_TIME, FEINT_CD, DASH_SLIDE, throwSpeed
} from '../core/constants.js';
import { clamp, norm, approach, gauss } from '../core/utils.js';
import { getKey } from '../data/keymap.js';
import { getDashAim, toggleDashAim } from '../data/settings.js';
import { initAudio, sfx, toggleMusic } from '../audio/audio.js';
import { addPopup, dust } from './fx.js';
import { doThrowHuman, throwDisc, skipReplay, doDive, viseVersAvant } from './actions.js';
import { trySpecial } from './specials.js';
import { isCapturing } from '../ui/keybind-ui.js';
import { doAct, pauseGame, selectScreenKey } from '../ui/menus.js';
import {
  enEntrainement, tenterPriseDummy, lacherDummy, dummyEnDeplacement,
  resetEntrainement, quitterEntrainement, demanderSortie, sortieOuverte, annulerSortie
} from '../ui/training.js';
import { enTutoriel, quitterTutoriel } from './../ui/tutoriel.js';
import { toucheActionJ2 } from './commandes.js';

export const keys = new Set();
export const keysP2 = new Set();
const tapTimes = {};

export function inputDir() {
  let x = 0, y = 0;
  if (keys.has(getKey('moveUp'))) y -= 1;
  if (keys.has(getKey('moveDown'))) y += 1;
  if (keys.has(getKey('moveLeft'))) x -= 1;
  if (keys.has(getKey('moveRight'))) x += 1;
  return { x, y };
}

function mScale() { const r = cv.getBoundingClientRect(); return r.width ? W / r.width : 1; }

export function requestLock() {
  try { const pr = cv.requestPointerLock && cv.requestPointerLock(); if (pr && pr.catch) pr.catch(() => { }); } catch (e) { }
}

document.addEventListener('pointerlockchange', () => {
  Mouse.locked = document.pointerLockElement === cv;
  if (!Mouse.locked && !curScreen && !G.demo && !G.adminMode && ['play', 'serve', 'countdown', 'goal', 'replay'].includes(G.state)) pauseGame();
});
document.addEventListener('pointerlockerror', () => { });

window.addEventListener('mousemove', e => {
  if (curScreen !== null) return;
  if (Mouse.locked) {
    const k = mScale();
    Mouse.x = clamp(Mouse.x + e.movementX * k, 0, W);
    Mouse.y = clamp(Mouse.y + e.movementY * k, 0, H);
  } else {
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    Mouse.x = clamp((e.clientX - r.left) * W / r.width, 0, W);
    Mouse.y = clamp((e.clientY - r.top) * H / r.height, 0, H);
  }
});

window.addEventListener('mousedown', e => {
  initAudio();
  if (curScreen !== null || G.demo) return;
  // Idem au clic : on consomme l'événement pour qu'aucun tir ne parte derrière.
  if (G.replay) { e.preventDefault(); Mouse.down = false; skipReplay(); return; }
  if (e.button === 0) {
    // À l'entraînement, cliquer sur le partenaire le saisit pour le déplacer :
    // on le place où l'on veut travailler, sans toucher au reste.
    if (enEntrainement() && tenterPriseDummy(Mouse.x, Mouse.y)) { Mouse.down = false; return; }
    Mouse.down = true;
    const p = G.p1;
    if (!p || !p.human || p.stun > 0) return;
    if (G.state !== 'play' && G.state !== 'serve') return;
    if (G.cine) return;
    if (p.diveT > 0 || p.diveDown > 0) return;
    if (p.holding) { p.charging = true; }
    else doDive(p, norm(Mouse.x - p.x, Mouse.y - p.y));
  } else if (e.button === 2) { trySpecial(G.p1); }
});

window.addEventListener('mouseup', e => {
  if (e.button === 0) {
    if (dummyEnDeplacement()) { lacherDummy(); Mouse.down = false; return; }
    Mouse.down = false;
    const p = G.p1;
    if (p && p.human && p.holding && p.wasCharging && curScreen === null) doThrowHuman(p);
  }
});

$('stage').addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('blur', () => { keys.clear(); Mouse.down = false; });

window.addEventListener('keydown', e => {
  initAudio();
  if (isCapturing()) { e.preventDefault(); e.stopPropagation(); return; }
  // On écrit dans un champ : le clavier appartient au texte, pas au jeu. Sans
  // cette sortie, la barre d'espace était avalée par la commande de plongeon et
  // il devenait impossible de mettre un espace dans son statut ou son pseudo.
  const cible = e.target;
  if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.isContentEditable)) {
    if (e.code === 'Escape') cible.blur();
    return;
  }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys.add(e.code); return; }
  keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'ShiftRight'].includes(e.code)) keysP2.add(e.code);
  // Gestes ponctuels du deuxième joueur : ils ne font que déposer une intention
  // dans sa fiche, la boucle s'occupe du reste.
  if (!curScreen && toucheActionJ2(e.code)) { e.preventDefault(); return; }
  if (e.code === 'KeyM') { addPopup(toggleMusic() ? '♪ MUSIQUE ON' : '♪ MUSIQUE OFF', '#9fb4dd', 13); return; }
  // Le skip consomme la touche : sans ça, la même pression relancerait une
  // charge ou un tir dès le retour au jeu.
  if (G.replay && ['Space', 'Enter', 'Escape'].includes(e.code)) {
    e.preventDefault(); keys.delete(e.code); keysP2.delete(e.code);
    skipReplay(); return;
  }
  if (curScreen) {
    if (['title', 'options', 'pause', 'over'].includes(curScreen)) {
      const up = getKey('moveUp'), down = getKey('moveDown');
      if (e.code === up || e.code === 'ArrowUp') moveMenu(curScreen, -1);
      else if (e.code === down || e.code === 'ArrowDown') moveMenu(curScreen, 1);
      else if (e.code === 'Enter' || e.code === 'Space') { sfx('select'); activateMenu(curScreen); }
      else if (e.code === getKey('pause') && curScreen !== 'title') { if (curScreen === 'pause') doAct('resume'); else doAct('back'); }
    } else if (curScreen === 'select') { selectScreenKey(e.code); }
    // Écrans d'apprentissage : Échap remonte d'un cran. Le sous-menu et la
    // proposition de départ ramènent au titre, la liste des chapitres au
    // sous-menu — sans quoi on s'y retrouvait coincé au clavier.
    else if (curScreen === 'chap' && e.code === getKey('pause')) doAct('learn');
    else if ((curScreen === 'learn' || curScreen === 'firstrun') && e.code === getKey('pause')) doAct('back');
    // L'écran en ligne n'était dans aucune branche : Échap n'y faisait rien et
    // on ne pouvait en sortir qu'à la souris.
    else if (curScreen === 'online' && e.code === getKey('pause')) doAct('back');
    return;
  }
  // Entraînement : R remet tout en place instantanément, Échap rend la main au
  // sous-menu plutôt que d'ouvrir la pause d'un match qui n'existe pas.
  // Une demande de sortie est ouverte : Échap la referme au lieu d'en ouvrir
  // une seconde, et plus rien d'autre ne passe.
  if (sortieOuverte()) {
    if (e.code === getKey('pause')) annulerSortie();
    return;
  }
  if (enEntrainement()) {
    if (e.code === 'KeyR') { resetEntrainement(); return; }
    if (e.code === getKey('pause')) { demanderSortie('training', quitterEntrainement); return; }
  }
  if (enTutoriel() && e.code === getKey('pause')) { demanderSortie('tuto', quitterTutoriel); return; }
  if (e.code === getKey('pause') || e.code === 'KeyP') { if (G.state !== 'over' && !G.demo && !G.adminMode) pauseGame(); return; }
  const p = G.p1;
  if (!p || !p.human || p.stun > 0) return;
  // Le dash est géré au maintien dans updatePlayerHuman. Ici on ne traite que le
  // Cancel Dash : réappuyer sur la touche pendant le dash freine net.
  if ((e.code === getKey('dash') || e.code === 'ShiftLeft') && p.dashT > 0) { cancelDash(p); return; }
  // Feinte de tir : annule la charge en cours d'un faux geste de tir.
  if (e.code === getKey('feint')) { doFeint(p); return; }
  // Le double-tap directionnel a été retiré : le dash passe désormais uniquement
  // par la touche dédiée maintenue, visée à la souris. Le garder déclenchait deux
  // dashs concurrents avec des règles différentes.
  if (e.code === getKey('charge') || e.code === 'Space') {
    if (G.cine) return;
    if (p.diveT > 0 || p.diveDown > 0) return;
    if (p.holding) { p.charging = true; }
    else doDive(p, norm(Mouse.x - p.x, Mouse.y - p.y));
  }
});

window.addEventListener('keyup', e => {
  keys.delete(e.code);
  // Le joueur 2 tire au relâchement d'Enter (comme P1 avec sa touche de
  // charge), pas tant qu'elle reste enfoncée — sinon impossible de charger.
  // En ligne, le joueur de droite est a l'autre bout de la liaison : son tir
  // arrive par sa fiche d'intentions. Sans cette garde, l'hote tirait a sa
  // place avec sa propre touche Entree.
  if (e.code === 'Enter' && G.isJ2J && !Partie.active && G.p2 && G.p2.human && G.p2.holding && G.p2.wasCharging && G.p2.charge > 0) {
    const p = G.p2;
    // Le tir partait droit sur le joueur 1, faute de visée : impossible de
    // marquer autrement que par accident. Il suit maintenant son viseur.
    const dir = { x: p.cmd.visee.x, y: p.cmd.visee.y };
    throwDisc(p, dir, throwSpeed(p.charge, p.char.power));
  }
  keysP2.delete(e.code);
  if (curScreen) return;
  const p = G.p1;
  if (p && p.human && e.code === getKey('charge') && p.holding && p.wasCharging) doThrowHuman(p);
});

// Bascule de la visée du dash dans l'onglet JEU des options.
(function () {
  const b = $('dashAim');
  if (!b) return;
  const refresh = () => { b.textContent = getDashAim() === 'move' ? 'SENS DU DÉPLACEMENT' : 'VERS LA SOURIS'; };
  b.addEventListener('click', e => { e.stopPropagation(); toggleDashAim(); refresh(); sfx('move'); });
  refresh();
})();

// Survol souris des boutons de menu : synchronise la sélection clavier.
// Tout élément porteur d'un data-act déclenche l'action correspondante : les
// boutons de menu, mais aussi les grandes cartes de l'écran d'apprentissage,
// qui ne sont pas des .mbtn.
document.querySelectorAll('[data-act]').forEach(b => {
  b.addEventListener('mouseenter', () => {
    if (curScreen && b.classList.contains('mbtn')) {
      setSelIdx(curScreen, menuButtons(curScreen).indexOf(b));
    }
  });
  b.addEventListener('click', () => doAct(b.dataset.act));
});

// Cancel Dash : arrêt net en pleine course. Pas d'invincibilité — si un disque
// arrive, le joueur se le prend. La hitbox élargie du dash survit brièvement
// pour pouvoir attraper malgré le freinage.
export function cancelDash(p) {
  if (p.dashT <= 0) return;
  p.dashT = 0; p.dashEnding = false;
  p.dashV.x = 0; p.dashV.y = 0;
  p.vx = 0; p.vy = 0;
  p.dashGap = CANCEL_GAP;
  p.cancelCatchT = CANCEL_CATCH;
  dust(p.x, p.y + 20, 9);
  // Crissement de freinage, distinct du souffle du dash.
  sfx('skid');
}

// Feinte de tir : le geste part, le disque avance à peine puis claque dans la
// main. Impossible d'annuler un Dash Throw ainsi — c'est le prix de sa puissance.
export function doFeint(p, dirVoulue) {
  if (!p.holding || p.feintT > 0 || p.feintCd > 0) return;
  if (p.dashThrowT > 0) return;
  // Le joueur feinte vers son curseur ; l'IA fournit sa propre direction.
  const dir = dirVoulue || norm(Mouse.x - p.x, Mouse.y - p.y);
  // Même règle que le tir : on ne feinte pas vers son propre camp, sinon la
  // feinte deviendrait un moyen détourné d'armer un geste vers l'arrière.
  if (!viseVersAvant(p, dir)) return;
  p.feintT = FEINT_TIME; p.feintCd = FEINT_TIME + FEINT_CD;
  p.feintDir = dir;
  p.face = dir.x >= 0 ? 1 : -1;
  p.charging = false; p.wasCharging = false; p.charge = 0; p.fullFlash = false;
  p.throwPoseT = FEINT_TIME;
}

// Dash : propulsion sur une distance fixe, sans invincibilité. La vitesse est
// calculée pour couvrir DASH_DIST en DASH_TIME quelle que soit la direction.
export function startDash(p, dir) {
  // Un seul dash du joueur suffit à disqualifier la condition « gagner sans
  // jamais dasher » du skin Ninja.
  if (p === G.p1 && p.human) G.aDashe = true;
  if (!dir || (!dir.x && !dir.y)) dir = { x: p.face, y: 0 };
  p.dashT = DASH_TIME; p.dashGap = DASH_GAP; p.dashDir = dir;
  p.face = dir.x >= 0 ? 1 : -1;
  const v = DASH_DIST / DASH_TIME;
  p.dashV.x = dir.x * v; p.dashV.y = dir.y * v;
  dust(p.x, p.y + 20, 6); sfx('dash');
}

export function doLunge(p) {
  p.lunge = .18; p.lungeCd = .55;
  const d = norm(Mouse.x - p.x, Mouse.y - p.y);
  p.dashV.x += d.x * 260; p.dashV.y += d.y * 260;
  dust(p.x, p.y + 20, 4); sfx('dash');
}

export function updatePlayerHuman(p, dt) {
  if (p.stun > 0) { p.vx = approach(p.vx, 0, 20, dt); p.vy = approach(p.vy, 0, 20, dt); return; }
  // Au sol après un plongeon dans le vide : le joueur ne contrôle plus rien.
  if (p.diveDown > 0) { p.vx = approach(p.vx, 0, 12, dt); p.vy = approach(p.vy, 0, 12, dt); return; }
  // Le jeu ne lit plus la souris : il lit la fiche d'intentions du joueur.
  // C'est ce qui permet qu'un deuxième joueur existe — sa fiche est remplie
  // par son clavier, et cette fonction ne fait pas la différence.
  const c = p.cmd, d = c.dep;
  // Touche de dash maintenue : distance fixe, soumise à l'anti-spam. La visée
  // du dash est déjà arbitrée dans la fiche, selon le réglage du joueur.
  if (c.dash && p.dashT <= 0 && p.dashGap <= 0 && p.diveT <= 0 && p.diveDown <= 0) {
    startDash(p, { x: c.viseeDash.x, y: c.viseeDash.y });
  }
  let mx = d.x, my = d.y;
  const l = Math.hypot(mx, my);
  if (l) { mx /= l; my /= l; }
  p.face = (c.visee.x >= 0) ? 1 : -1;
  const spd = p.speed * (p.charging ? .55 : 1);
  const tx = mx * spd, ty = my * spd;
  const rate = l ? 13 : 5;
  p.vx = approach(p.vx, tx, rate, dt);
  p.vy = approach(p.vy, ty, rate, dt);
  if (p.holding && c.tir) {
    p.charging = true;
    const prev = p.charge;
    p.charge = clamp(p.charge + dt / p.char.chargeT, 0, 1);
    if (Math.floor(prev * 4) !== Math.floor(p.charge * 4) && p.charge < 1) sfx('charge');
    if (p.charge >= 1 && !p.fullFlash) {
      p.fullFlash = true; sfx('full');
      addPopup('CHARGE MAX !', p.char.accent, 11, .6, p.y - 56);
    }
    p.wasCharging = true;
  } else p.charging = false;
}

export function updatePlayer2(dt) {
  if (!G.isJ2J || !G.p2 || !G.p2.human) return;
  const p = G.p2;
  if (p.stun > 0) { p.vx = approach(p.vx, 0, 20, dt); p.vy = approach(p.vy, 0, 20, dt); return; }
  // Même fiche, même logique que le joueur 1 : seul ce qui la remplit change.
  const c = p.cmd;
  let x = c.dep.x, y = c.dep.y;
  const l = Math.hypot(x, y); if (l) { x /= l; y /= l; }
  p.face = (c.visee.x >= 0) ? 1 : -1;
  const spd = p.speed * (p.charging ? .55 : 1);
  const tx = x * spd, ty = y * spd;
  const rate = l ? 13 : 5;
  p.vx = approach(p.vx, tx, rate, dt);
  p.vy = approach(p.vy, ty, rate, dt);
  if (p.holding && c.tir) {
    p.charging = true;
    const prev = p.charge;
    p.charge = clamp(p.charge + dt / p.char.chargeT, 0, 1);
    if (Math.floor(prev * 4) !== Math.floor(p.charge * 4) && p.charge < 1) sfx('charge');
    if (p.charge >= 1 && !p.fullFlash) {
      p.fullFlash = true; sfx('full');
      addPopup('CHARGE MAX ! (J2)', p.char.accent, 11, .6, p.y - 56);
    }
    p.wasCharging = true;
  } else p.charging = false;
  // Le dash suivait le viseur… qui n'existait pas : il fonçait donc toujours
  // droit sur l'adversaire. Il suit maintenant la visée du joueur.
  if (c.dash && p.dashCd <= 0) {
    p.dashV.x = c.viseeDash.x * DASH_SPEED * 0.7; p.dashV.y = c.viseeDash.y * DASH_SPEED * 0.7;
    p.dashCd = DASH_CD; sfx('dash'); dust(p.x, p.y + 22, 8);
  }
  // Le tir part au relâchement de la touche (keyup), pas ici : voir plus bas.
  // Le laisser ici tirait dès que charge>0, donc quasi immédiatement après
  // avoir pris le disque — impossible de charger.
}

export function integratePlayer(p, dt) {
  // Piratage de Cyberleek : le déplacement part à l'envers. On retourne le
  // mouvement ici et pas dans les fiches d'intentions, parce que quatre sources
  // les remplissent — souris, clavier du J2, IA, réseau — et qu'une seule
  // oubliée aurait laissé un adversaire immunisé. Tout le monde passe par
  // cette intégration, personne n'y échappe.
  // Le dash n'est pas inversé : c'est un élan déjà lancé, pas une commande
  // qu'on tient. Le retourner ferait reculer le joueur à chaque échappée.
  const inv = p.piratage > 0 ? -1 : 1;
  // Sables mouvants : 30 % de vitesse en moins, dash et plongeon compris. On
  // peut s'y élancer, on n'en sort pas plus vite pour autant — c'est ce qui
  // fait qu'ils se contournent au lieu de se traverser.
  const boue = dansLesSables(p.x, p.y) ? RALENTI_SABLES : 1;
  const mvx = (p.vx * inv + p.dashV.x) * boue, mvy = (p.vy * inv + p.dashV.y) * boue;
  p.x += mvx * dt; p.y += mvy * dt;
  const minX = p.side === 1 ? COURT.left + 16 : CX + 10;
  const maxX = p.side === 1 ? CX - 10 : COURT.right - 16;
  p.x = clamp(p.x, minX, maxX);
  p.y = clamp(p.y, COURT.top + 16, COURT.bottom - 16);
  p.moving = Math.hypot(mvx, mvy) > 34;
  if (p.moving) p.walk += dt * 10;
  p.throwCd -= dt; p.throwPoseT -= dt; p.lunge -= dt; p.lungeCd -= dt; p.dashCd -= dt;
  p.dashT -= dt; p.dashGap -= dt; p.dashThrowT -= dt; p.diveT -= dt; p.diveDown -= dt;
  p.cancelCatchT -= dt; p.feintT -= dt; p.feintCd -= dt; p.dizzy -= dt;
  // La cloche fait vaciller sa course sans jamais le bloquer.
  if (p.dizzy > 0) { p.vx += gauss() * 90 * dt * 60 * .016; p.vy += gauss() * 90 * dt * 60 * .016; }
  if (p.stun > 0) p.stun -= dt;
  // Pendant le dash la vitesse est maintenue constante, ce qui garantit la
  // distance fixe. À la fin on la coupe net : sans ça elle décroît en douceur et
  // ajoute plus de 200 px de glissade, soit près du double de la distance voulue.
  if (p.dashT > 0) {
    const v = DASH_DIST / DASH_TIME;
    p.dashV.x = p.dashDir.x * v; p.dashV.y = p.dashDir.y * v;
    p.dashEnding = true;
  } else if (p.dashEnding) {
    // Fin de dash : on garde une fraction de l'élan qui s'amortit tout seul,
    // pour une décélération naturelle plutôt qu'un arrêt net.
    p.dashEnding = false;
    p.dashV.x *= DASH_SLIDE; p.dashV.y *= DASH_SLIDE;
  }
  p.dashV.x *= Math.exp(-DASH_DECAY * dt);
  p.dashV.y *= Math.exp(-DASH_DECAY * dt);
  p.ghostT -= dt;
  if (Math.hypot(p.dashV.x, p.dashV.y) > 130 && p.ghostT <= 0) {
    p.ghosts.push({ x: p.x, y: p.y, face: p.face, life: .55, fr: p.moving ? ((Math.floor(p.walk) % 2) ? 'run1' : 'run2') : 'idle' });
    p.ghostT = .025;
  }
  for (let i = p.ghosts.length - 1; i >= 0; i--) {
    p.ghosts[i].life -= dt;
    if (p.ghosts[i].life <= 0) p.ghosts.splice(i, 1);
  }
}
