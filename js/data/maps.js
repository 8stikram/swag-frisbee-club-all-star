// Registre des terrains. Pour ajouter une map : ajouter une entrée dans MAPS.
// `zones` décrit les tranches de but en offset vertical depuis le centre du terrain,
// ce qui permet à une map d'avoir des buts plus grands ou un découpage de points différent.
export const MAPS = [
  {
    id: 'arena',
    name: 'DISC ARENA',
    court: { left: 70, right: 890, top: 84, bottom: 560 },
    goal: { height: 170, depth: 44 },
    zones: [
      { from: -85, to: -34, points: 3, color: '#35e0ff' },
      { from: -34, to: 34, points: 5, color: '#ffd23e' },
      { from: 34, to: 85, points: 3, color: '#35e0ff' }
    ],
    theme: {
      bgInner: '#0a1220',
      bgOuter: '#020408',
      floor: 'rgba(15,26,46,0.7)',
      line: 'rgba(255,255,255,.6)',
      goalFill: 'rgba(53,224,255,0.15)',
      goalStroke: '#35e0ff',
      crowdColors: ['#ff8c1a', '#35e0ff', '#ffd23e', '#ff5340', '#7bd66a', '#e86ad0', '#cfe0ff', '#f2a2c0'],
      starColor: '#ffffff'
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
