import { G } from './state.js';

// ---------------------------------------------------------------------------
// Observateur de gestes. Plutôt que d'aller poser des appels dans tout le code
// de jeu, on regarde l'état du joueur d'une image à l'autre et on en déduit ce
// qu'il vient de faire. Le gameplay reste intact, et le tutoriel comme
// l'historique de l'entraînement lisent la même source.
// ---------------------------------------------------------------------------

export const GESTES = {
  bouge: 'se déplacer',
  attrape: 'attraper le disque',
  tir: 'lancer le disque',
  tirCharge: 'lancer à pleine charge',
  dash: 'dasher',
  dashThrow: 'enchaîner un Dash Throw',
  cancelDash: 'annuler un dash',
  feinte: 'feinter un tir',
  plongeon: 'plonger',
  perfectDive: 'réussir un Perfect Dive'
};

// Mémoire de l'image précédente, par joueur.
const memo = new WeakMap();

function etatDe(p) {
  let m = memo.get(p);
  if (!m) { m = {}; memo.set(p, m); }
  return m;
}

// Renvoie la liste des gestes que `p` vient d'accomplir sur cette image.
export function gestesDe(p) {
  if (!p) return [];
  const m = etatDe(p);
  const out = [];

  const bouge = Math.hypot(p.vx, p.vy) > 40;
  if (bouge && !m.bouge) out.push('bouge');
  m.bouge = bouge;

  if (p.dashT > 0 && !m.dash) out.push('dash');
  m.dash = p.dashT > 0;

  // Le Cancel Dash se reconnaît à la fenêtre d'attrapé qu'il ouvre.
  if (p.cancelCatchT > 0 && !m.cancel) out.push('cancelDash');
  m.cancel = p.cancelCatchT > 0;

  if (p.feintT > 0 && !m.feinte) out.push('feinte');
  m.feinte = p.feintT > 0;

  if (p.diveT > 0 && !m.plongeon) out.push('plongeon');
  m.plongeon = p.diveT > 0;

  // Prise et perte du disque : c'est là qu'on distingue l'attrapé du tir, et
  // qu'on voit si le tir partait d'une charge pleine ou d'un Dash Throw.
  if (p.holding && !m.tient) {
    out.push('attrape');
    m.dashAuCatch = p.dashThrowT > 0;
  }
  if (!p.holding && m.tient) {
    out.push('tir');
    if (m.chargeMax >= .98) out.push('tirCharge');
    if (m.dashThrowArme) out.push('dashThrow');
  }
  // La charge et la fenêtre de Dash Throw sont lues pendant la tenue : au
  // moment du lancer elles sont déjà remises à zéro.
  if (p.holding) {
    m.chargeMax = Math.max(m.chargeMax || 0, p.charge || 0);
    m.dashThrowArme = p.dashThrowT > 0;
  } else {
    m.chargeMax = 0; m.dashThrowArme = false;
  }
  m.tient = p.holding;

  return out;
}

// Le Perfect Dive est signalé par le jeu lui-même (il connaît sa fenêtre) :
// actions.js pose le drapeau, on le consomme ici.
export function signalerPerfectDive(p) {
  const m = etatDe(p);
  m.perfect = true;
}
export function consommerPerfectDive(p) {
  const m = etatDe(p);
  if (!m.perfect) return false;
  m.perfect = false;
  return true;
}

export function oublierGestes(p) { if (p) memo.delete(p); }
