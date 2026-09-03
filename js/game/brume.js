import { G } from './state.js';
// Semé, pas libre : la brume masque le disque, donc elle change des points.
// Deux machines qui la lèveraient à des instants différents ne joueraient plus
// le même match — l'une tirerait à l'aveugle pendant que l'autre voit.
import { randJeu } from '../core/alea.js';
import { jeSimule } from '../reseau/partie.js';
import { getMap } from '../data/maps.js';
import { sfx } from '../audio/audio.js';
import { addPopup } from './fx.js';

// ---------------------------------------------------------------------------
// La brume de Raccoon City. Même forme que la tempête de Dune de Râ, et pour
// les mêmes raisons : c'est une règle de jeu, pas un décor.
//
// Elle frappe les deux camps exactement de la même façon, au même instant —
// c'est la condition pour qu'un terrain à effet reste un terrain de
// compétition. Tout est conditionné à `brume` du terrain ; ailleurs, ce
// fichier ne fait rien du tout.
// ---------------------------------------------------------------------------

export function terrainBrumeux() { return !!getMap().brume; }

// Mesuré au banc (mockups/rpd-station.html) : à densité pleine, le contraste
// du disque descend à 92 au pire moment d'un cycle, contre 174 sans brume.
// Une règle qui coûte la moitié de la lisibilité pendant quelques secondes
// reste un choix tactique ; au-delà, elle déciderait du point à la place du
// joueur. C'est pourquoi les traînées sont blanches, nombreuses et faibles
// plutôt que peu nombreuses et opaques.
const ENTRE = [22, 34];    // secondes entre deux passages
const DUREE = [7, 11];     // combien de temps il dure
const PREAVIS = 1.8;       // la brume monte, elle n'apparaît pas
const RETRAIT = 2.2;       // et se retire de même

let prochaine = randJeu(ENTRE[0], ENTRE[1]);

export function reinitialiserBrume() {
  prochaine = randJeu(ENTRE[0], ENTRE[1]);
  G.brume = null;
}

export function updateBrume(dt) {
  if (!terrainBrumeux()) { G.brume = null; return; }
  // Le compte à rebours ne tourne que balle en jeu : sinon un but, son replay
  // et la remise en jeu feraient passer une brume que personne ne subit.
  if (G.state !== 'play' && G.state !== 'serve') return;

  // Naissance et mort décidées par l'hôte seul, et reçues par l'invité avec le
  // reste de l'état. Les tirer des deux côtés ferait non seulement passer deux
  // brumes différentes, mais surtout puiser dans le hasard semé à des rythmes
  // différents — ce qui désaccorderait tout ce qui en dépend ensuite.
  if (!jeSimule()) return;

  if (G.brume) {
    G.brume.t += dt;
    if (G.brume.t >= G.brume.dur) {
      G.brume = null;
      prochaine = randJeu(ENTRE[0], ENTRE[1]);
    }
  } else {
    prochaine -= dt;
    if (prochaine <= 0) {
      G.brume = { t: 0, dur: randJeu(DUREE[0], DUREE[1]) };
      sfx('vent');
      addPopup('LA BRUME SE LÈVE', '#c9d6da', 15, 1.4);
    }
  }
}

// Densité, de 0 à 1. Elle monte au début et redescend à la fin : une brume qui
// s'allume d'un coup passe pour un défaut d'affichage, pas pour de la météo.
export function densiteBrume() {
  const B = G.brume;
  if (!B) return 0;
  const monte = Math.min(1, B.t / PREAVIS);
  const descend = Math.min(1, (B.dur - B.t) / RETRAIT);
  return Math.max(0, Math.min(monte, descend));
}
