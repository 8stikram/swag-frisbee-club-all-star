import { G, Mouse } from './state.js';
import { $, cv, W, H, curScreen, showScreen, moveMenu, activateMenu, setSelIdx, menuButtons } from '../core/dom.js';
import { COURT, CX, DASH_SPEED, DASH_DECAY, DASH_CD, throwSpeed } from '../core/constants.js';
import { clamp, norm, approach } from '../core/utils.js';
import { getKey } from '../data/keymap.js';
import { initAudio, sfx, toggleMusic } from '../audio/audio.js';
import { addPopup, dust } from './fx.js';
import { doThrowHuman, throwDisc, skipReplay } from './actions.js';
import { trySpecial } from './specials.js';
import { isCapturing } from '../ui/keybind-ui.js';
import { doAct, pauseGame, selectScreenKey } from '../ui/menus.js';

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
  if (G.replay) { skipReplay(); return; }
  if (e.button === 0) {
    Mouse.down = true;
    const p = G.p1;
    if (!p || !p.human || p.stun > 0) return;
    if (G.state !== 'play' && G.state !== 'serve') return;
    if (G.cine) return;
    if (p.holding) { p.charging = true; }
    else if (p.lungeCd <= 0) { doLunge(p); G.lungeBonus = true; G.lungeBonusTimer = 1.5; }
  } else if (e.button === 2) { trySpecial(G.p1); }
});

window.addEventListener('mouseup', e => {
  if (e.button === 0) {
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
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys.add(e.code); return; }
  keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'ShiftRight'].includes(e.code)) keysP2.add(e.code);
  if (e.code === 'KeyM') { addPopup(toggleMusic() ? '♪ MUSIQUE ON' : '♪ MUSIQUE OFF', '#9fb4dd', 13); return; }
  if (G.replay && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyS')) { skipReplay(); return; }
  if (curScreen) {
    if (['title', 'options', 'pause', 'over'].includes(curScreen)) {
      const up = getKey('moveUp'), down = getKey('moveDown');
      if (e.code === up || e.code === 'ArrowUp') moveMenu(curScreen, -1);
      else if (e.code === down || e.code === 'ArrowDown') moveMenu(curScreen, 1);
      else if (e.code === 'Enter' || e.code === 'Space') { sfx('select'); activateMenu(curScreen); }
      else if (e.code === getKey('pause') && curScreen !== 'title') { if (curScreen === 'pause') doAct('resume'); else doAct('back'); }
    } else if (curScreen === 'select') { selectScreenKey(e.code); }
    return;
  }
  if (e.code === getKey('pause') || e.code === 'KeyP') { if (G.state !== 'over' && !G.demo && !G.adminMode) pauseGame(); return; }
  const p = G.p1;
  if (!p || !p.human || p.stun > 0) return;
  if (e.code === getKey('dash') || e.code === 'ShiftLeft') {
    if (p.dashCd <= 0) {
      const d = norm(Mouse.x - p.x, Mouse.y - p.y);
      p.dashV.x = d.x * DASH_SPEED; p.dashV.y = d.y * DASH_SPEED;
      p.dashCd = DASH_CD; sfx('dash'); dust(p.x, p.y + 22, 8);
    }
  }
  const dirKeys = [getKey('moveUp'), getKey('moveDown'), getKey('moveLeft'), getKey('moveRight')];
  if (dirKeys.includes(e.code)) {
    const now = performance.now();
    if (tapTimes[e.code] && now - tapTimes[e.code] < 300 && p.dashCd <= 0) {
      let dx = 0, dy = 0;
      if (e.code === getKey('moveUp')) dy = -1;
      else if (e.code === getKey('moveDown')) dy = 1;
      else if (e.code === getKey('moveLeft')) dx = -1;
      else if (e.code === getKey('moveRight')) dx = 1;
      p.dashV.x = dx * DASH_SPEED; p.dashV.y = dy * DASH_SPEED;
      p.dashCd = DASH_CD; sfx('dash'); dust(p.x, p.y + 22, 8);
    }
    tapTimes[e.code] = now;
  }
  if (e.code === getKey('charge') || e.code === 'Space') {
    if (G.cine) return;
    if (p.holding) { p.charging = true; }
    else if (p.lungeCd <= 0) { doLunge(p); G.lungeBonus = true; G.lungeBonusTimer = 1.5; }
  }
});

window.addEventListener('keyup', e => {
  keys.delete(e.code);
  keysP2.delete(e.code);
  if (curScreen) return;
  const p = G.p1;
  if (p && p.human && e.code === getKey('charge') && p.holding && p.wasCharging) doThrowHuman(p);
});

// Survol souris des boutons de menu : synchronise la sélection clavier.
document.querySelectorAll('.mbtn').forEach(b => {
  b.addEventListener('mouseenter', () => {
    if (curScreen) { setSelIdx(curScreen, menuButtons(curScreen).indexOf(b)); }
  });
  b.addEventListener('click', () => doAct(b.dataset.act));
});

export function doLunge(p) {
  p.lunge = .18; p.lungeCd = .55;
  const d = norm(Mouse.x - p.x, Mouse.y - p.y);
  p.dashV.x += d.x * 260; p.dashV.y += d.y * 260;
  dust(p.x, p.y + 20, 4); sfx('dash');
}

export function updatePlayerHuman(p, dt) {
  if (p.stun > 0) { p.vx = approach(p.vx, 0, 20, dt); p.vy = approach(p.vy, 0, 20, dt); return; }
  const d = inputDir();
  let mx = d.x, my = d.y;
  const l = Math.hypot(mx, my);
  if (l) { mx /= l; my /= l; }
  p.face = (Mouse.x >= p.x) ? 1 : -1;
  const spd = p.speed * (p.charging ? .55 : 1);
  const tx = mx * spd, ty = my * spd;
  const rate = l ? 13 : 5;
  p.vx = approach(p.vx, tx, rate, dt);
  p.vy = approach(p.vy, ty, rate, dt);
  if (p.holding && (keys.has(getKey('charge')) || Mouse.down)) {
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
  let x = 0, y = 0;
  if (keysP2.has('ArrowUp')) y -= 1;
  if (keysP2.has('ArrowDown')) y += 1;
  if (keysP2.has('ArrowLeft')) x -= 1;
  if (keysP2.has('ArrowRight')) x += 1;
  const l = Math.hypot(x, y); if (l) { x /= l; y /= l; }
  p.face = (G.p1.x > p.x) ? 1 : -1;
  const spd = p.speed * (p.charging ? .55 : 1);
  const tx = x * spd, ty = y * spd;
  const rate = l ? 13 : 5;
  p.vx = approach(p.vx, tx, rate, dt);
  p.vy = approach(p.vy, ty, rate, dt);
  if (p.holding && keysP2.has('Enter')) {
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
  if (keysP2.has('ShiftRight') && p.dashCd <= 0) {
    const d = norm(G.p1.x - p.x, G.p1.y - p.y);
    p.dashV.x = d.x * DASH_SPEED * 0.7; p.dashV.y = d.y * DASH_SPEED * 0.7;
    p.dashCd = DASH_CD; sfx('dash'); dust(p.x, p.y + 22, 8);
  }
  if (keysP2.has('Enter') && p.holding && p.wasCharging && p.charge > 0) {
    const dir = norm(G.p1.x - p.x, G.p1.y - p.y);
    throwDisc(p, dir, throwSpeed(p.charge, p.char.power));
  }
}

export function integratePlayer(p, dt) {
  const mvx = p.vx + p.dashV.x, mvy = p.vy + p.dashV.y;
  p.x += mvx * dt; p.y += mvy * dt;
  const minX = p.side === 1 ? COURT.left + 16 : CX + 10;
  const maxX = p.side === 1 ? CX - 10 : COURT.right - 16;
  p.x = clamp(p.x, minX, maxX);
  p.y = clamp(p.y, COURT.top + 16, COURT.bottom - 16);
  p.moving = Math.hypot(mvx, mvy) > 34;
  if (p.moving) p.walk += dt * 10;
  p.throwCd -= dt; p.throwPoseT -= dt; p.lunge -= dt; p.lungeCd -= dt; p.dashCd -= dt;
  if (p.stun > 0) p.stun -= dt;
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
