import { G, comment } from './state.js';
import { COURT, CY, GOAL_DEPTH } from '../core/constants.js';
import { getMap } from '../data/maps.js';
// Semé, pas libre : ces cercles rapportent des points, donc leur horaire et
// leur place sont un résultat de match et non un décor. Tirés au hasard libre,
// les deux machines n'en voyaient pas les mêmes — la seule fuite qu'ait laissée
// le partage jeu/cosmétique du chantier 3.
import { randJeu } from '../core/alea.js';
import { jeSimule } from '../reseau/partie.js';
import { sfx } from '../audio/audio.js';
import { addPopup, burst, ring } from './fx.js';

// ---------------------------------------------------------------------------
// Zones de score au sol, propres au Swag Frisbee Stadium. Elles offrent une
// alternative à la cage : moins de points, mais bien plus faciles à toucher.
// Tout est conditionné à `zonesSol` du terrain — ailleurs, ce fichier ne fait
// rien du tout.
// ---------------------------------------------------------------------------

const RAYON = 30;
const DUREE = 3;              // durée de vie d'un cercle
const ATTENTE = [5, 8];       // intervalle entre deux apparitions
const DUNK_RAYON = 60;
const RAYON_PANIER = 22;
const POINTS_CERCLE = 1;
const POINTS_DUNK = 2;
const POINTS_PANIER = 5;

export function terrainAZones() { return !!getMap().zonesSol; }

// À l'entraînement les cercles sont plus fréquents : on vient les travailler.
function attente() {
  const [a, b] = ATTENTE;
  return G.training ? randJeu(a * .5, b * .5) : randJeu(a, b);
}

export function updateZones(dt) {
  if (!terrainAZones() || G.state !== 'play') return;

  G.prochainCercle -= dt;
  if (G.prochainCercle <= 0) {
    G.prochainCercle = attente();
    // On évite les abords immédiats des cages : un cercle là-bas se
    // confondrait avec la zone de dunk.
    G.cercles.push({
      x: randJeu(COURT.left + 150, COURT.right - 150),
      y: randJeu(COURT.top + 60, COURT.bottom - 60),
      t: 0
    });
  }
  for (let i = G.cercles.length - 1; i >= 0; i--) {
    G.cercles[i].t += dt;
    if (G.cercles[i].t > DUREE) G.cercles.splice(i, 1);
  }
}

// Le demi-cercle de dunk, planté devant chaque cage.
export function centreDunk(side) {
  return { x: side === 1 ? COURT.left + GOAL_DEPTH : COURT.right - GOAL_DEPTH, y: CY };
}

// Le panier, avancé sur le terrain au-dessus de la cage : il faut passer par
// dessus la défense pour l'atteindre, ce qui en fait un tir de prestige.
export function centrePanier(side) {
  return {
    x: side === 1 ? COURT.left + 108 : COURT.right - 108,
    y: COURT.top + 62
  };
}

// Le disque traverse le panier adverse : cinq points, et l'échange continue.
// Un seul panier par lancer, sinon un disque qui traîne dans l'anneau les
// empilerait image après image.
export function testerPanier(d) {
  if (!jeSimule()) return;   // cinq points : à l'hôte de les accorder
  if (!terrainAZones() || !d.free || !d.thrower || d.panierMarque) return;
  const cible = centrePanier(d.thrower.side === 1 ? 2 : 1);
  if (Math.hypot(d.x - cible.x, d.y - cible.y) > RAYON_PANIER) return;
  d.panierMarque = true;
  marquer(d.thrower, POINTS_PANIER, 'PANIER +5', '#ff8c1f', cible.x, cible.y);
  G.shake = Math.max(G.shake, 8);
}

// Appelé quand le disque s'immobilise. Renvoie true si une zone l'a récompensé,
// auquel cas l'appelant n'a pas à déclarer le disque mort.
export function disqueImmobile(d) {
  // Récompenser un placement, c'est ajouter des points : une décision d'arbitre.
  // L'invité voit les cercles — ils lui arrivent par l'état — mais ne compte pas.
  if (!jeSimule()) return false;
  if (!terrainAZones() || !d.thrower) return false;
  const p = d.thrower;

  for (let i = 0; i < G.cercles.length; i++) {
    const c = G.cercles[i];
    if (Math.hypot(d.x - c.x, d.y - c.y) <= RAYON) {
      G.cercles.splice(i, 1);
      marquer(p, POINTS_CERCLE, 'CERCLE +1', '#5df08a', d.x, d.y);
      return true;
    }
  }
  // Zone de dunk : celle que l'on défend ne rapporte rien, sinon il suffirait
  // de poser le disque chez soi.
  const dk = centreDunk(p.side === 1 ? 2 : 1);
  if (Math.hypot(d.x - dk.x, d.y - dk.y) <= DUNK_RAYON) {
    marquer(p, POINTS_DUNK, 'DUNK +2', '#ffd23e', d.x, d.y);
    return true;
  }
  return false;
}

function marquer(p, pts, texte, couleur, x, y) {
  p.score += pts;
  addPopup(texte, couleur, 16, .9, y - 40);
  burst(x, y, couleur, 18);
  ring(x, y, couleur);
  sfx('perfect');
  comment(pts >= POINTS_DUNK ? 'DANS LA ZONE !' : 'JOLI PLACEMENT !', undefined, 'but');
}

export const ZONES = { RAYON, DUREE, DUNK_RAYON, RAYON_PANIER, POINTS_PANIER };
