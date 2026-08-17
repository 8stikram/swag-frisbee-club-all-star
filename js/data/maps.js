import { forcageTuto } from './deverrouillage.js';

// Registre des terrains. Pour ajouter une map : ajouter une entrée dans MAPS.
// `zones` décrit les tranches de but en offset vertical depuis le centre du terrain,
// ce qui permet à une map d'avoir des buts plus grands ou un découpage de points différent.
export const MAPS = [
  {
    id: 'arena',
    name: 'STELLAR ORBITAL STATION',
    // OST propre au terrain : sélectionnée d'office quand on choisit cette map,
    // le joueur restant libre d'en changer via le sélecteur de musique.
    ost: 'stellar',
    court: { left: 70, right: 890, top: 84, bottom: 560 },
    goal: { height: 200, depth: 48 },
    // La zone à 5 points est volontairement plus étroite que celles à 3 :
    // viser le centre doit être le tir difficile.
    zones: [
      { from: -100, to: -26, points: 3, color: '#35e0ff' },
      { from: -26, to: 26, points: 5, color: '#ffd23e' },
      { from: 26, to: 100, points: 3, color: '#35e0ff' }
    ],
    theme: {
      bgInner: '#0a1220',
      bgOuter: '#020408',
      floor: 'rgba(15,26,46,0.7)',
      line: 'rgba(255,255,255,.6)',
      goalFill: 'rgba(53,224,255,0.15)',
      goalStroke: '#35e0ff',
      crowdColors: ['#35e0ff', '#7fe9ff', '#ffd23e', '#ff5340'],
      starColor: '#ffffff',
      // Station spatiale : le terrain est une projection posée sur le pont métallique.
      holo: '#35e0ff',        // teinte de la projection
      holo2: '#7fe9ff',       // reflets clairs
      deck: '#0c1424',        // tôle du pont
      deckLine: '#1b2c48',    // joints entre les plaques
      deckLight: '#16233c',   // plaques éclairées
      hull: '#101a2e',        // coque autour de l'arène
      hullEdge: '#243b63'
    }
  }
];

// Terrain de l'entraînement : volontairement nu. Il n'a aucune ambiance, aucun
// décor et aucune animation, pour que rien ne détourne l'œil du disque et des
// personnages pendant qu'on apprend. `horsSelection` le tient à l'écart de
// l'écran de choix du terrain — on n'y joue pas de match.
MAPS.push({
  id: 'dojo',
  name: 'SALLE D\'ENTRAÎNEMENT',
  horsSelection: true,
  style: 'nu',
  court: { left: 70, right: 890, top: 84, bottom: 560 },
  goal: { height: 200, depth: 48 },
  zones: [
    { from: -100, to: -26, points: 3, color: '#9fb6d6' },
    { from: -26, to: 26, points: 5, color: '#d9b26a' },
    { from: 26, to: 100, points: 3, color: '#9fb6d6' }
  ],
  theme: {
    bgInner: '#2b2f36',      // anthracite, neutre
    bgOuter: '#1e2126',
    floor: '#c9ced6',        // sol gris clair, doux pour l'œil
    line: 'rgba(60,70,86,.55)',
    goalFill: 'rgba(90,110,140,.16)',
    goalStroke: '#6b7d99',
    crowdColors: ['#9fb6d6'],
    starColor: 'rgba(0,0,0,0)'
  }
});

// Terrain de prestige, récompense du tutoriel : une salle de basket de gala.
// `zonesSol` active ses règles propres — cercles bonus au sol et zone de dunk
// devant les cages — que les autres terrains ignorent.
MAPS.push({
  id: 'stadium',
  name: 'SWAG FRISBEE STADIUM',
  verrou: 'tuto',
  aide: 'Termine les 5 chapitres du tutoriel pour le débloquer.',
  ost: 'menu-ost',
  court: { left: 70, right: 890, top: 84, bottom: 560 },
  goal: { height: 210, depth: 48 },
  zones: [
    { from: -105, to: -30, points: 3, color: '#2f6bff' },
    { from: -30, to: 30, points: 5, color: '#ffd23e' },
    { from: 30, to: 105, points: 3, color: '#2f6bff' }
  ],
  style: 'stade',
  zonesSol: true,
  theme: {
    bgInner: '#241a12',
    bgOuter: '#120c08',
    floor: '#d99a53',        // parquet verni, chaud
    floorClair: '#e8b471',   // lattes éclairées par les projecteurs
    line: 'rgba(255,255,255,.85)',
    goalFill: 'rgba(47,107,255,.16)',
    goalStroke: '#cfd6e2',   // chrome
    gradins: '#1b1f2b',
    crowdColors: ['#ff5340', '#35e0ff', '#ffd23e', '#5df08a', '#ff8c1f', '#d9b8f5'],
    starColor: 'rgba(0,0,0,0)'
  }
});

// Vrai quand le terrain est jouable. Même principe que pour les skins.
export function mapDebloquee(m) {
  if (!m || !m.verrou) return true;
  if (m.verrou === 'tuto') {
    // Forçage du panneau admin : session seulement, jamais sauvegardé.
    const f = forcageTuto();
    if (f !== null) return f;
    return _tutoFini ? _tutoFini() : false;
  }
  return true;
}
let _tutoFini = null;
export function brancherVerrouTutoMap(fn) { _tutoFini = fn; }

let currentMapId = MAPS[0].id;

export function getMap() { return MAPS.find(m => m.id === currentMapId) || MAPS[0]; }
export function getMapId() { return currentMapId; }
export function setMapId(id) { if (MAPS.some(m => m.id === id)) currentMapId = id; }

export function zoneByY(y) {
  const m = getMap();
  const cy = (m.court.top + m.court.bottom) / 2;
  let best = null;
  for (const z of m.zones) {
    if (y >= cy + z.from && y <= cy + z.to && (!best || z.points > best.points)) best = z;
  }
  return best ? best.points : m.zones[0].points;
}
