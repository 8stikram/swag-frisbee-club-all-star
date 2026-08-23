import { G } from './state.js';
import { COURT, CY } from '../core/constants.js';
import { getMap } from '../data/maps.js';
import { rand } from '../core/utils.js';
import { sfx } from '../audio/audio.js';
import { addPopup } from './fx.js';

// ---------------------------------------------------------------------------
// Règles propres à Dune de Râ : les sables mouvants devant les cages, et la
// tempête qui se lève par intermittence. Tout est conditionné à
// `sablesMouvants` du terrain — ailleurs, ce fichier ne fait rien.
//
// Les deux effets sont rigoureusement symétriques et frappent les deux camps
// de la même façon. Un terrain à effets ne reste un terrain de compétition
// qu'à cette condition.
// ---------------------------------------------------------------------------

export function terrainDesert() { return !!getMap().sablesMouvants; }

// Le demi-cercle fait un cinquième de la largeur du terrain, comme demandé.
export function rayonSables() { return (COURT.right - COURT.left) / 5; }

// Le centre est posé sur la ligne de cage elle-même : le demi-cercle s'ouvre
// donc vers le terrain, et sa moitié extérieure — qui serait hors-jeu — n'a
// jamais à être dessinée ni testée.
export function centreSables(side) {
  return { x: side === 1 ? COURT.left : COURT.right, y: CY };
}

export function dansLesSables(x, y) {
  if (!terrainDesert()) return false;
  const r = rayonSables();
  return Math.hypot(x - COURT.left, y - CY) < r
    || Math.hypot(x - COURT.right, y - CY) < r;
}

// Moitié de vitesse. Le prompt disait 30 %, mais à ce compte-là on traversait
// la zone sans vraiment la sentir et elle ne changeait aucune décision : à
// moitié vitesse, la contourner devient un vrai choix.
// Le disque, lui, n'est jamais ralenti : il ne passe pas par l'intégration des
// joueurs, donc il n'y a rien à excepter.
export const RALENTI_SABLES = .5;

// --- Tempête de sable ------------------------------------------------------
const ENTRE = [45, 60];     // secondes entre deux tempêtes
const DUREE = [10, 15];     // combien de temps elle dure
const PREAVIS = 2.2;        // le voile monte progressivement, il n'apparaît pas
const RETRAIT = 1.6;        // et redescend de même

let prochaine = rand(ENTRE[0], ENTRE[1]);

export function reinitialiserDesert() {
  prochaine = rand(ENTRE[0], ENTRE[1]);
  G.tempete = null;
  for (const p of [G.p1, G.p2]) if (p) p.dansSables = false;
}

export function updateDesert(dt) {
  if (!terrainDesert()) { G.tempete = null; return; }
  // Le compte à rebours ne tourne que balle en jeu : sinon un but, son replay
  // et la remise en jeu déclencheraient une tempête que personne ne subit.
  if (G.state !== 'play' && G.state !== 'serve') return;

  if (G.tempete) {
    G.tempete.t += dt;
    if (G.tempete.t >= G.tempete.dur) {
      G.tempete = null;
      prochaine = rand(ENTRE[0], ENTRE[1]);
    }
  } else {
    prochaine -= dt;
    if (prochaine <= 0) {
      G.tempete = { t: 0, dur: rand(DUREE[0], DUREE[1]) };
      sfx('vent');
      addPopup('TEMPÊTE DE SABLE', '#C9A070', 15, 1.4);
    }
  }

  // Bruit de glissement à l'entrée dans les sables, une seule fois par entrée.
  for (const p of [G.p1, G.p2]) {
    if (!p) continue;
    const dedans = dansLesSables(p.x, p.y);
    if (dedans && !p.dansSables) sfx('sable');
    p.dansSables = dedans;
  }
}

// Densité du voile, de 0 à 1. Elle monte au début et redescend à la fin : une
// tempête qui s'allume d'un coup passe pour un défaut d'affichage.
export function densiteTempete() {
  const T = G.tempete;
  if (!T) return 0;
  const monte = Math.min(1, T.t / PREAVIS);
  const descend = Math.min(1, (T.dur - T.t) / RETRAIT);
  return Math.max(0, Math.min(monte, descend));
}
