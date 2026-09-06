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

// ---------------------------------------------------------------------------
// Animations réduites.
//
// Le casino est le seul endroit du jeu qui crache des centaines de particules,
// secoue l'écran et enchaîne des séquences d'une seconde et demie. C'est voulu,
// mais ça ne convient pas à tout le monde — machine modeste, sensibilité au
// mouvement, ou simple envie d'enchaîner les mains sans cérémonie.
//
// Le réglage coupe ce qui décore et garde ce qui informe : plus de particules,
// de secousses ni de voiles, et les séquences vont deux fois plus vite. Les
// cartes se retournent toujours, les scores changent toujours, le résultat
// s'affiche toujours. Supprimer les animations n'a jamais voulu dire supprimer
// ce qu'elles disent.
// ---------------------------------------------------------------------------
let animReduites = false;

export function getAnimReduites() { return animReduites; }
export function setAnimReduites(v) {
  animReduites = !!v;
  try { localStorage.setItem('sbcbAnimReduites', animReduites ? '1' : '0'); } catch (e) { }
  appliquerAnimReduites();
}
export function toggleAnimReduites() {
  setAnimReduites(!animReduites);
  return animReduites;
}

// La classe est posée sur <html> et non sur le plateau : les voiles de
// transition et les popups vivent en dehors de l'écran de jeu, et il faut
// pouvoir les atteindre aussi.
function appliquerAnimReduites() {
  document.documentElement.classList.toggle('animReduites', animReduites);
}

try {
  animReduites = localStorage.getItem('sbcbAnimReduites') === '1';
} catch (e) { }
appliquerAnimReduites();
