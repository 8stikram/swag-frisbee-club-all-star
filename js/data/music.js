// Registre des musiques réelles. Pour en ajouter une : dépose le fichier dans
// assets/audio/ et ajoute une entrée ici — l'écran de choix du terrain la
// proposera automatiquement.
//
// `gain` — chaque piste vient d'un mastering différent, donc à volume égal
// dans le curseur des options, elles ne sonnent PAS à la même intensité :
// mesuré, Dune de Râ arrivait 7,3 dB sous le Menu OST (grossièrement quatre
// fois plus discrète à l'oreille), Stellar 1,5 dB au-dessus. `gain` corrige
// ça au niveau de la piste, une fois pour toutes, pour que le curseur de
// musique des options règle une seule intensité perçue et pas le mastering
// de chaque fichier. La référence est TOUJOURS le Menu OST (`menu-ost`),
// gain 1 — c'est la première piste qu'on entend et celle à laquelle toutes
// les autres doivent se comparer.
//
// Pour en calculer un nouveau à l'ajout d'une piste : ouvrir
// tools/mesurer-musique.html en local (double-clic, ou http://localhost:8000/
// tools/mesurer-musique.html si le serveur de dev tourne), y déposer le
// nouveau fichier à côté du Menu OST, et reporter le gain suggéré ici.
export const MUSIC_TRACKS = [
  { id: 'menu-ost', name: '0 • Menu OST', src: 'assets/audio/0-menu-ost.mp3', gain: 1 },
  { id: 'stellar', name: '1 • Stellar Orbital Station', src: 'assets/audio/1-stellar-orbital-station.mp3', gain: 0.84 },
  { id: 'dune-de-ra', name: '2 • Dune de Râ', src: 'assets/audio/2-dune-de-ra.mp3', gain: 2.32 }
];

// Piste active par défaut : la première du registre. `null` = silence
// (choisi explicitement via l'entrée "Aucune" du sélecteur).
let currentTrackId = MUSIC_TRACKS[0].id;

export function getTrackId() { return currentTrackId; }
export function setTrackId(id) { currentTrackId = id; saveTrack(); }
export function getTrack(id) { return MUSIC_TRACKS.find(t => t.id === id) || null; }

function loadTrack() {
  try {
    const s = localStorage.getItem('sbcbTrack');
    if (s === '__none') currentTrackId = null;
    else if (s && MUSIC_TRACKS.some(t => t.id === s)) currentTrackId = s;
    // sinon : on garde le défaut déjà posé plus haut.
  } catch (e) { }
}
function saveTrack() {
  try { localStorage.setItem('sbcbTrack', currentTrackId || '__none'); } catch (e) { }
}
loadTrack();
