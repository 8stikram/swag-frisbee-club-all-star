// Registre des musiques réelles. Pour en ajouter une : dépose le fichier dans
// assets/audio/ et ajoute une entrée ici — l'écran de choix du terrain la
// proposera automatiquement.
export const MUSIC_TRACKS = [
  { id: 'menu-ost', name: '0 • Menu OST', src: 'assets/audio/0-menu-ost.mp3' }
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
