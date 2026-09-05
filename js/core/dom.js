import { sfx } from '../audio/audio.js';

export const $ = id => document.getElementById(id);
export const cv = $('game');
// `let` et non `const` : l'écran de choix du terrain a besoin de faire peindre
// le vrai terrain dans un canvas hors écran, et render.js dessine toujours dans
// ce `ctx`. C'est une liaison vivante, donc le basculer ici le bascule là-bas.
// Personne d'autre que render.js ne l'importe — voir viserCanvas().
export let ctx = cv.getContext('2d');
const ctxJeu = ctx;
// Détourne le dessin vers un autre canvas. Appeler sans argument pour revenir
// à celui du jeu ; toujours dans un `finally`, sinon le jeu peint dans le vide.
export function viserCanvas(autre) {
  ctx = autre || ctxJeu;
  ctx.imageSmoothingEnabled = false;
}
export const W = 960, H = 600;

export const SCREENS = {
  title: 'scr-title', select: 'scr-select', maps: 'scr-maps', options: 'scr-options',
  pause: 'scr-pause', over: 'scr-over',
  learn: 'scr-learn', firstrun: 'scr-firstrun', chap: 'scr-chap', online: 'scr-online',
  casino: 'scr-casino', blackjack: 'scr-blackjack'
};

export let curScreen = 'title';
const selIdx = { title: 0, options: 0, pause: 0, over: 0, learn: 0, firstrun: 0, chap: 0, online: 0 };

// Le liseré de sélection n'apparaît qu'après une vraie navigation au clavier :
// à la souris, un bouton entouré en permanence n'a aucun sens.
let kbNav = false;

export function showScreen(name) {
  for (const k in SCREENS) $(SCREENS[k]).classList.toggle('hidden', k !== name);
  curScreen = name;
  // La barre du haut n'appartient à aucun écran : elle suit simplement le fait
  // qu'on soit dans un menu ou en plein match.
  for (const id of ['topBar', 'topBarG']) {
    const tb = document.getElementById(id);
    if (tb) tb.classList.toggle('hidden', name === null);
  }
  // Pas de retour sur l'ecran titre : il n'y a rien au-dessus.
  const g = document.getElementById('topBarG');
  if (g && name !== null) g.classList.toggle('hidden', name === 'title');
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
