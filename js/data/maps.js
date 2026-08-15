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
