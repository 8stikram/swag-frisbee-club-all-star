// Réglages de jeu, séparés des touches et de l'audio.
// 'mouse' : le dash part vers le curseur. 'move' : il part dans le sens du
// déplacement, pour ceux qui préfèrent dissocier la visée et le mouvement.
let dashAim = 'mouse';

export function getDashAim() { return dashAim; }
export function setDashAim(v) {
  dashAim = (v === 'move') ? 'move' : 'mouse';
  try { localStorage.setItem('sbcbDashAim', dashAim); } catch (e) { }
}
export function toggleDashAim() {
  setDashAim(dashAim === 'mouse' ? 'move' : 'mouse');
  return dashAim;
}

try {
  const s = localStorage.getItem('sbcbDashAim');
  if (s === 'move' || s === 'mouse') dashAim = s;
} catch (e) { }
