// Registre des musiques réelles. Pour en ajouter une : dépose le fichier dans
// assets/audio/ et ajoute une entrée ici — l'écran de choix du terrain la
// proposera automatiquement.
export const MUSIC_TRACKS = [
  { id: 'menu-ost', name: 'Menu OST', src: 'assets/audio/menu-ost.wav' }
];

// null = musique synthétisée par défaut (celle déjà générée par audio.js).
let currentTrackId = null;

export function getTrackId() { return currentTrackId; }
export function setTrackId(id) { currentTrackId = id; saveTrack(); }
export function getTrack(id) { return MUSIC_TRACKS.find(t => t.id === id) || null; }

function loadTrack() {
  try {
    const s = localStorage.getItem('sbcbTrack');
    if (s === '__synth' || !s) currentTrackId = null;
    else if (MUSIC_TRACKS.some(t => t.id === s)) currentTrackId = s;
  } catch (e) { }
}
function saveTrack() {
  try { localStorage.setItem('sbcbTrack', currentTrackId || '__synth'); } catch (e) { }
}
loadTrack();
