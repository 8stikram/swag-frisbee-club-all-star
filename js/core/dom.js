import { sfx } from '../audio/audio.js';

export const $ = id => document.getElementById(id);
export const cv = $('game');
export const ctx = cv.getContext('2d');
export const W = 960, H = 600;

export const SCREENS = {
  title: 'scr-title', select: 'scr-select', maps: 'scr-maps', options: 'scr-options',
  pause: 'scr-pause', over: 'scr-over',
  learn: 'scr-learn', firstrun: 'scr-firstrun'
};

export let curScreen = 'title';
const selIdx = { title: 0, options: 0, pause: 0, over: 0, learn: 0, firstrun: 0 };

// Le liseré de sélection n'apparaît qu'après une vraie navigation au clavier :
// à la souris, un bouton entouré en permanence n'a aucun sens.
let kbNav = false;

export function showScreen(name) {
  for (const k in SCREENS) $(SCREENS[k]).classList.toggle('hidden', k !== name);
  curScreen = name;
  kbNav = false;
  if (name) { selIdx[name] = selIdx[name] || 0; refreshMenu(name); }
}
export function menuButtons(name) { return [...$(SCREENS[name]).querySelectorAll('.mbtn')]; }
export function refreshMenu(name) {
  menuButtons(name).forEach((b, i) => b.classList.toggle('sel', kbNav && i === selIdx[name]));
}
export function moveMenu(name, d) {
  const n = menuButtons(name).length; if (!n) return;
  kbNav = true;
  selIdx[name] = (selIdx[name] + d + n) % n;
  refreshMenu(name); sfx('move');
}
export function activateMenu(name) { const b = menuButtons(name)[selIdx[name]]; if (b) b.click(); }
export function setSelIdx(name, i) { selIdx[name] = i; }
