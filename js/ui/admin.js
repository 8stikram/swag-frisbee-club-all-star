import { $, curScreen } from '../core/dom.js';
import { G, initMatch } from '../game/state.js';
import { COURT, CY, DIFFS, throwSpeed } from '../core/constants.js';
import { norm } from '../core/utils.js';
import { addPopup } from '../game/fx.js';
import { throwDisc } from '../game/actions.js';
import { sfx } from '../audio/audio.js';
import { doAct, pauseGame, isAdminMode, setAdminMode } from './menus.js';

// ---------------------------------------------------------------------------
// Ouverture par 5 clics sur le titre. Plus aucune mention à l'écran : le mode
// admin ne doit être connu que de son auteur.
// ---------------------------------------------------------------------------
let titleClicks = 0;
const titleEl = $('adminTitle');
titleEl.addEventListener('click', () => {
  titleClicks++;
  if (titleClicks === 5) {
    setAdminMode(!isAdminMode());
    titleClicks = 0;
    titleEl.style.color = isAdminMode() ? '#a8c7e8' : '';
    setTimeout(() => { titleEl.style.color = ''; }, 400);
    // Rétrécit le terrain pour dégager la place des volets.
    document.body.classList.toggle('adminOn', isAdminMode());
    if (isAdminMode()) render();
  }
});

// ---------------------------------------------------------------------------
// Persistance : onglets affichés de chaque côté, valeurs réglées, raccourcis.
// ---------------------------------------------------------------------------
const LS = 'sbcbAdmin';
const store = Object.assign(
  { tabL: 'MATCH', tabR: 'DEBUG', vals: {}, keys: {} },
  (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } })()
);
const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch (e) { } };

// ---------------------------------------------------------------------------
// Actions historiques, conservées telles quelles.
// ---------------------------------------------------------------------------
function aimDirForAI() {
  const ai = G.p2.ai;
  const t = (ai.emaTarget.x && ai.emaTarget.y) ? ai.emaTarget : { x: (G.p2.side === 1 ? COURT.right : COURT.left), y: CY };
  return norm(t.x - G.p2.x, t.y - G.p2.y);
}
function giveDiscToAI() {
  if (G.disc.heldBy) G.disc.heldBy.holding = false;
  G.disc.heldBy = G.p2; G.p2.holding = true;
  G.disc.x = G.p2.x; G.disc.y = G.p2.y; G.disc.free = false;
}
function adminForceShoot() {
  if (!G.p2 || !G.p2.ai) return log('IA introuvable');
  if (!G.p2.holding) giveDiscToAI();
  const ai = G.p2.ai;
  ai.state = 'STRIKE'; ai.forceShoot = true; G.p2.holdTimer = 5;
  throwDisc(G.p2, aimDirForAI(), throwSpeed(Math.min(G.p2.charge + .5, 1), G.p2.char.power));
  ai.state = 'RECOVER'; G.p2.holdTimer = 0; ai.forceShoot = false;
  ai.emaTarget.x = 0; ai.emaTarget.y = 0;
  log('tir IA forcé');
}
function adminGiveDisc() {
  if (!G.p2) return log('IA introuvable');
  if (G.p2.holding) return log('IA a déjà le disque');
  giveDiscToAI(); log('disque donné à l\'IA');
}
function adminReset() {
  if (!G.p2) return;
  initMatch(false, G.matchChar, G.matchCPU, G.matchDiff, G.isJ2J);
  log('match réinitialisé');
}
function adminTogglePause() {
  if (G.state === 'play' || G.state === 'serve') pauseGame();
  else if (curScreen === 'pause') doAct('resume');
}

// ---------------------------------------------------------------------------
// Console intégrée : sortie + saisie de commandes.
// ---------------------------------------------------------------------------
const conLines = [];
function log(msg) {
  conLines.push(msg);
  if (conLines.length > 120) conLines.shift();
  document.querySelectorAll('.acon').forEach(c => {
    c.textContent = conLines.join('\n'); c.scrollTop = c.scrollHeight;
  });
}
function runCmd(txt) {
  log('> ' + txt);
  try {
    // eslint-disable-next-line no-new-func
    const r = Function('G', 'DIFFS', '"use strict";return (' + txt + ')')(G, DIFFS);
    log(typeof r === 'object' ? JSON.stringify(r) : String(r));
  } catch (e) { log('erreur : ' + e.message); }
}

// ---------------------------------------------------------------------------
// Réglages numériques. Chaque entrée pointe une VRAIE variable du jeu, lue et
// écrite en direct — on affiche le nom exact tel qu'il est dans le code.
// ---------------------------------------------------------------------------
const TUNE = [
  { k: 'p1.speed', d: 'Vitesse de déplacement du joueur', step: 5, get: () => G.p1 && G.p1.speed, set: v => G.p1 && (G.p1.speed = v) },
  { k: 'p2.speed', d: 'Vitesse de déplacement de l\'IA', step: 5, get: () => G.p2 && G.p2.speed, set: v => G.p2 && (G.p2.speed = v) },
  { k: 'G.timescale', d: 'Vitesse globale du jeu', step: .1, get: () => G.timescale, set: v => (G.timescale = v) },
  { k: 'diff.dive', d: 'Tendance de l\'IA à plonger', step: .05, get: () => DIFFS[G.matchDiff].dive, set: v => (DIFFS[G.matchDiff].dive = v) },
  { k: 'diff.parry', d: 'Tendance de l\'IA au Perfect Dive', step: .05, get: () => DIFFS[G.matchDiff].parry, set: v => (DIFFS[G.matchDiff].parry = v) },
  { k: 'diff.dash', d: 'Tendance de l\'IA à dasher', step: .05, get: () => DIFFS[G.matchDiff].dash, set: v => (DIFFS[G.matchDiff].dash = v) },
  { k: 'diff.speed', d: 'Coefficient de vitesse de l\'IA', step: .05, get: () => DIFFS[G.matchDiff].speed, set: v => (DIFFS[G.matchDiff].speed = v) },
  { k: 'diff.err', d: 'Imprécision de visée de l\'IA', step: 5, get: () => DIFFS[G.matchDiff].err, set: v => (DIFFS[G.matchDiff].err = v) },
  { k: 'diff.react', d: 'Temps de réaction de l\'IA', step: .05, get: () => DIFFS[G.matchDiff].react, set: v => (DIFFS[G.matchDiff].react = v) }
];
const initial = {};   // valeurs d'origine, pour le récapitulatif des modifications

// Affichages de debug, lus par le rendu.
export const dbg = { traj: false, ia: false, fps: false, hitbox: false };

const SONS = ['move', 'select', 'deny', 'bounce', 'catch', 'throw', 'dash', 'goal', 'count', 'go',
  'whistle', 'talk', 'win', 'lose', 'charge', 'full', 'superthrow', 'perfect', 'roar', 'special',
  'legcast', 'splat', 'stun', 'bigbounce', 'replay'];

const TABS = ['MATCH', 'IA', 'DEBUG', 'AFFICHAGE', 'JOUEURS', 'SON'];

// ---------------------------------------------------------------------------
// Construction du contenu
// ---------------------------------------------------------------------------
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
function card(name, desc) {
  const c = el('div', 'acard');
  const t = el('div', 'atxt');
  t.appendChild(el('div', 'aname', name));
  if (desc) t.appendChild(el('div', 'adesc', desc));
  c.appendChild(t);
  const ctrl = el('div', 'actrl');
  c.appendChild(ctrl);
  return { card: c, ctrl };
}
function btn(label, cls, fn) {
  const b = el('button', 'abtn' + (cls ? ' ' + cls : ''), label);
  b.addEventListener('click', e => { e.stopPropagation(); fn(b); });
  return b;
}
function toggle(label, desc, key) {
  const { card: c, ctrl } = card(label, desc);
  const b = btn(dbg[key] ? 'ACTIF' : 'INACTIF', dbg[key] ? 'on' : '', bb => {
    dbg[key] = !dbg[key];
    bb.textContent = dbg[key] ? 'ACTIF' : 'INACTIF';
    bb.classList.toggle('on', dbg[key]);
  });
  ctrl.appendChild(b);
  return c;
}
function stepper(t) {
  const cur = t.get();
  if (initial[t.k] === undefined && cur !== undefined) initial[t.k] = cur;
  const { card: c, ctrl } = card(t.k, t.d);
  c.querySelector('.aname').className = 'aname avar';
  const val = el('span', 'astep', fmt(t.get()));
  const apply = d => {
    const n = Math.round(((t.get() || 0) + d * t.step) * 1000) / 1000;
    t.set(n); store.vals[t.k] = n; save();
    val.textContent = fmt(n);
  };
  ctrl.appendChild(btn('−', 'mini', () => apply(-1)));
  ctrl.appendChild(val);
  ctrl.appendChild(btn('+', 'mini', () => apply(1)));
  return c;
}
const fmt = v => (v === undefined || v === null) ? '—' : (Math.abs(v) < 10 ? (+v).toFixed(2) : String(Math.round(v)));

function buildTab(name) {
  const f = document.createDocumentFragment();
  const add = e => f.appendChild(e);

  if (name === 'MATCH') {
    let c = card('Réinitialiser le match', 'Relance la partie en cours');
    c.ctrl.appendChild(btn('RESET', 'danger', adminReset)); add(c.card);
    c = card('Pause', 'Bascule pause / reprise');
    c.ctrl.appendChild(btn('PAUSE', '', adminTogglePause)); add(c.card);
    c = card('Ralenti', 'Passe le jeu à 30 % de vitesse');
    c.ctrl.appendChild(btn('SLOWMO', '', () => { G.timescale = .3; log('timescale = 0.3'); })); add(c.card);
    c = card('Vitesse normale', 'Rétablit la vitesse du jeu');
    c.ctrl.appendChild(btn('NORMAL', 'success', () => { G.timescale = 1; log('timescale = 1'); })); add(c.card);
    add(stepper(TUNE[2]));
  }

  if (name === 'IA') {
    let c = card('Forcer le tir', 'L\'IA tire immédiatement');
    c.ctrl.appendChild(btn('TIRER', 'success', adminForceShoot)); add(c.card);
    c = card('Donner le disque', 'Place le disque dans les mains de l\'IA');
    c.ctrl.appendChild(btn('DONNER', '', adminGiveDisc)); add(c.card);
    add(el('div', 'asec', 'RÉGLAGES DU NIVEAU EN COURS'));
    TUNE.slice(3).forEach(t => add(stepper(t)));
  }

  if (name === 'DEBUG') {
    add(toggle('Trajectoire du disque', 'Affiche la trajectoire prédite', 'traj'));
    add(toggle('Intentions de l\'IA', 'Affiche sa cible et son état', 'ia'));
    add(toggle('FPS et performances', 'Compteur en temps réel', 'fps'));
    let c = card('Relevé d\'état', 'Écrit un instantané dans la console');
    c.ctrl.appendChild(btn('LOGS', '', () => {
      log(`score ${G.p1.score}-${G.p2.score} · rally ${G.rally} · state ${G.state}`);
      if (G.p2 && G.p2.ai) log(`IA ${G.p2.ai.state} · charge ${G.p2.charge.toFixed(2)}`);
      log(`disque ${G.disc.free ? 'libre' : 'tenu'} · dashT ${G.p1 ? G.p1.dashT.toFixed(2) : '—'}`);
    })); add(c.card);
    add(el('div', 'asec', 'CONSOLE'));
    const con = el('div', 'acon'); con.textContent = conLines.join('\n'); add(con);
    const cli = el('input', 'acli'); cli.placeholder = 'commande… ex : G.p1.score';
    cli.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && cli.value.trim()) { runCmd(cli.value.trim()); cli.value = ''; }
    });
    add(cli);
  }

  if (name === 'AFFICHAGE') {
    add(toggle('Hitboxes', 'Cercles de collision des personnages', 'hitbox'));
    let c = card('Plein écran', 'Bascule l\'affichage');
    c.ctrl.appendChild(btn('BASCULER', '', () => {
      document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    })); add(c.card);
  }

  if (name === 'JOUEURS') {
    TUNE.slice(0, 2).forEach(t => add(stepper(t)));
    add(toggle('Hitboxes', 'Affiche les zones d\'attrapé', 'hitbox'));
    const c = card('Copier les valeurs modifiées', 'Récapitulatif prêt à coller');
    c.ctrl.appendChild(btn('COPIER', 'success', b => {
      const out = TUNE.filter(t => initial[t.k] !== undefined && t.get() !== initial[t.k])
        .map(t => `${t.k}: ${fmt(initial[t.k])} → ${fmt(t.get())}`).join(' · ');
      const txt = out || 'aucune valeur modifiée';
      navigator.clipboard?.writeText(txt).catch(() => { });
      log(txt); b.textContent = 'COPIÉ';
      setTimeout(() => { b.textContent = 'COPIER'; }, 900);
    }));
    add(c.card);
  }

  if (name === 'SON') {
    SONS.forEach(s => {
      const c = card(s, 'Écouter ce son');
      c.card.querySelector('.aname').className = 'aname avar';
      c.ctrl.appendChild(btn('▶', 'mini', () => sfx(s)));
      add(c.card);
    });
  }
  return f;
}

// ---------------------------------------------------------------------------
// Raccourcis clavier, actifs uniquement panneau ouvert pour ne jamais entrer en
// conflit avec les commandes du jeu. Aucune配置 pré-remplie : à toi de la définir.
// ---------------------------------------------------------------------------
const ACTIONS = {
  reset: adminReset, pause: adminTogglePause, forceShoot: adminForceShoot,
  giveDisc: adminGiveDisc, slowmo: () => { G.timescale = .3; }, normal: () => { G.timescale = 1; }
};
window.addEventListener('keydown', e => {
  if (!isAdminMode()) return;
  const act = store.keys[e.code];
  if (act && ACTIONS[act]) { e.preventDefault(); ACTIONS[act](); }
}, true);
export function bindAdminKey(code, action) { store.keys[code] = action; save(); }

// ---------------------------------------------------------------------------
function renderSide(side) {
  const tabsEl = $('atabs-' + side), bodyEl = $('abody-' + side);
  const cur = side === 'L' ? store.tabL : store.tabR;
  tabsEl.innerHTML = '';
  TABS.forEach(t => {
    const b = el('button', 'atab' + (t === cur ? ' on' : ''), t);
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      if (side === 'L') store.tabL = t; else store.tabR = t;
      save(); renderSide(side);
    });
    tabsEl.appendChild(b);
  });
  bodyEl.innerHTML = '';
  bodyEl.appendChild(buildTab(cur));
}
export function render() { renderSide('L'); renderSide('R'); }

// Restaure les valeurs réglées lors des sessions précédentes.
setTimeout(() => {
  for (const t of TUNE) {
    if (store.vals[t.k] !== undefined && t.get() !== undefined) {
      if (initial[t.k] === undefined) initial[t.k] = t.get();
      t.set(store.vals[t.k]);
    }
  }
  render();
}, 0);
