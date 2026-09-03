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

// Terrain du désert, au crépuscule. Deux règles lui appartiennent : les sables
// mouvants en demi-cercle devant chaque cage, et la tempête qui se lève par
// intermittence. Les deux sont strictement symétriques — c'est la condition
// pour qu'un terrain à effets reste un terrain de compétition.
MAPS.push({
  id: 'dune',
  name: 'DUNE DE RÂ',
  // Second nom, basculable depuis l'écran de choix. Ce n'est pas une variante
  // du terrain : c'est le même, sous un autre titre.
  nomAlt: 'SQUEEZIE SABLE',
  ost: 'dune-de-ra',
  court: { left: 70, right: 890, top: 84, bottom: 560 },
  goal: { height: 200, depth: 48 },
  zones: [
    { from: -100, to: -26, points: 3, color: '#E8C05A' },
    { from: -26, to: 26, points: 5, color: '#D9803C' },
    { from: 26, to: 100, points: 3, color: '#E8C05A' }
  ],
  style: 'desert',
  sablesMouvants: true,
  theme: {
    // Le ciel du crépuscule, en cinq arrêts : à deux couleurs on obtient un
    // fond uni un peu sale, pas un coucher de soleil. C'est la bande rose
    // entre le violet et l'orange qui donne l'heure.
    ciel: ['#2E2A4A', '#5E3D6B', '#B85A63', '#D9884A', '#E8B96B'],
    bgInner: '#B85A63',
    bgOuter: '#2E2A4A',
    // Sable éclairé en lumière rasante : doré sur les crêtes, violacé au creux.
    floor: '#D9AE72',
    sableClair: '#E8C894',
    sableFonce: '#B88A56',
    sableOmbre: '#8A6244',
    line: 'rgba(90,60,40,.5)',
    goalFill: 'rgba(232,192,90,.16)',
    goalStroke: '#E8C05A',
    roche: '#C4763F', rocheFonce: '#8A4A28', rocheClair: '#D99A66',
    pierre: '#D9C08E', pierreOmbre: '#A8875C',
    or: '#E8C05A', orClair: '#F5DFA8',
    vert: '#5A8A56', vertFonce: '#3A5E3A', vertClair: '#7FA85E',
    paille: '#B8945A', pailleFonce: '#7A5E34',
    soleil: '#F0C85A', soleilBord: '#D9803C',
    chameau: '#C4956A', chameauFonce: '#8A6440',
    tempete: '#C9A070',
    khol: '#2A2038',
    crowdColors: ['#E8C05A', '#D9803C', '#B85A63'],
    starColor: 'rgba(0,0,0,0)'
  }
});

// Le Pôle Nord, terrain de Jingle Bells : une veillée de Noël sous l'aurore
// boréale. Il ne porte aucune règle propre, contrairement au stadium et à la
// dune — c'est un terrain de décor, et la glace n'y glisse pas. Ses huit pièces
// ont été choisies une par une dans mockups/pole-nord.html, puis accordées
// entre elles dans mockups/pole-nord-final.html.
MAPS.push({
  id: 'polenord',
  name: 'PÔLE NORD',
  // Pas d'OST à lui : il n'y a aucune piste de Noël dans data/music.js, et lui
  // en imposer une autre écraserait le choix du joueur pour rien.
  court: { left: 70, right: 890, top: 84, bottom: 560 },
  goal: { height: 200, depth: 48 },
  // Rouge et or : les deux seules couleurs vives qu'on s'autorise sur les
  // cages, justement pour qu'elles restent la cible la plus lisible du terrain.
  zones: [
    { from: -100, to: -26, points: 3, color: '#e5384f' },
    { from: -26, to: 26, points: 5, color: '#f5c542' },
    { from: 26, to: 100, points: 3, color: '#e5384f' }
  ],
  style: 'noel',
  theme: {
    // Les sept premières sont celles que lit la vignette de l'écran de choix
    // (ui/menus.js) : elle ne sait dessiner qu'un terrain générique, il faut
    // donc qu'elles suffisent à reconnaître le Pôle Nord.
    bgInner: '#12233f',
    bgOuter: '#040a16',
    floor: '#d8e3f3',            // la glace givrée sous les lampions
    line: 'rgba(74,102,146,.5)',
    goalFill: 'rgba(229,56,79,.16)',
    goalStroke: '#fdfdfd',
    crowdColors: ['#e5384f', '#1f8a4d', '#f5c542'],
    starColor: 'rgba(0,0,0,0)',
    // Propres au style « noel » (render.js).
    cielHaut: '#050b18', cielBas: '#12233f',
    dehorsHaut: '#1b2c4a', dehorsBas: '#0d1729',
    givre: '#e2ecf9',            // la glace avant réchauffement
    givreChaud: '#f2e7d2',       // la même, poussée par le réglage « chaleur »
    sapin: '#2a6b46',
    or: '#f5c542', chaud: '#ffb457', rouge: '#e5384f',
    // L'aurore se peint en dégradé : on garde ses composantes séparées pour
    // pouvoir en faire varier l'opacité à la volée.
    aurore: '93,240,138', aurore2: '53,224,255'
  }
});

// Raccoon City, la rue devant le R.P.D., la nuit de l'épidémie — septembre
// 1998. Le terrain de Leon, dont ce fichier disait déjà l'univers.
//
// Il porte une règle, la brume : elle traverse la rue par bouffées et masse
// réellement le terrain, joueurs et disque compris. Comme la tempête de Dune
// de Râ elle est strictement symétrique et décidée par l'hôte seul — voir
// js/game/brume.js. Le décor, lui, vit dans js/render/terrains/raccoon.js.
MAPS.push({
  id: 'raccoon',
  name: 'RACCOON CITY',
  // Pas d'OST : il n'y a aucune piste qui lui aille dans data/music.js, et lui
  // en imposer une autre écraserait le choix du joueur pour rien.
  court: { left: 70, right: 890, top: 84, bottom: 560 },
  goal: { height: 200, depth: 48 },
  // Bleu et or : les deux seules couleurs saturées qu'on s'autorise sur ce
  // terrain, précisément pour que les cages restent la cible la plus lisible.
  zones: [
    { from: -100, to: -26, points: 3, color: '#2f8cff' },
    { from: -26, to: 26, points: 5, color: '#f5c542' },
    { from: 26, to: 100, points: 3, color: '#2f8cff' }
  ],
  style: 'raccoon',
  brume: true,
  theme: {
    // Ces sept-là sont celles que lit l'écran de choix pour son fond et son
    // liseré. Le nuancier complet des matières — pierre, fer, chair, tôle,
    // ambre — vit avec le dessin, dans render/terrains/raccoon.js : c'est là
    // qu'il sert, et il y en a trente.
    bgInner: '#14282b',
    bgOuter: '#050b0d',
    floor: '#1a1e24',          // le macadam mouillé
    line: 'rgba(216,222,232,.55)',
    goalFill: 'rgba(47,140,255,.16)',
    goalStroke: '#65787a',
    crowdColors: ['#7d9bb8', '#4a4438', '#cfd4d0'],   // flic, civil, blouse
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

// Certains terrains portent deux noms. Ce n'est pas une variante du terrain :
// c'est le même, sous un autre titre. Le choix est retenu d'une session à
// l'autre, comme le disque préféré.
let nomsAlt = {};
try { nomsAlt = JSON.parse(localStorage.getItem('sbcbNomsMap') || '{}'); } catch (e) { }

export function nomAffiche(m) {
  if (!m) return '';
  return (m.nomAlt && nomsAlt[m.id]) ? m.nomAlt : m.name;
}
export function aDeuxNoms(m) { return !!(m && m.nomAlt); }
export function basculerNom(m) {
  if (!aDeuxNoms(m)) return;
  nomsAlt[m.id] = !nomsAlt[m.id];
  try { localStorage.setItem('sbcbNomsMap', JSON.stringify(nomsAlt)); } catch (e) { }
}

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
