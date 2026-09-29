// ---------------------------------------------------------------------------
// Les mesures communes à tous les terrains HD. Ce sont celles de data/maps.js
// (toutes les maps partagent le même terrain de jeu) et de core/dom.js. Elles
// sont recopiées ici plutôt qu'importées : core/dom.js va chercher le canevas
// du jeu dès son chargement, et les maquettes (mockups/*-hd.html), qui
// importent ces rendus, n'en ont pas.
// ---------------------------------------------------------------------------
export const W = 960, H = 600;
export const COURT = { left: 70, right: 890, top: 84, bottom: 560 };
export const CX = 480, CY = 322;
